/**
 * What happens after a register is marked, besides the register.
 *
 * Moved here, unchanged in behaviour, from mark-attendance - which still
 * calls afterAttendanceMarked - so that the Stars sync runs the same code.
 * A Pixel Pal mark has to do exactly what a mark made in HEC does, and two
 * copies of "what a mark does" is how this codebase drifted on payroll
 * three times.
 *
 *   Absent or Excused  -> recalculate that child's tuition for the month
 *   any mark           -> re-read their attendance streak in that class
 *                         from the register, and award the streak bonus
 *                         when the lesson makes the run a multiple of five
 *
 * The two halves are exported separately because the sync does not run
 * them inline: it queues them in the same transaction as the mark
 * (stars_sync_effects) and drains the queue, and to drain it has to know
 * whether each one worked. afterAttendanceMarked ignores those answers, as
 * mark-attendance always has: neither may fail a mark that is already
 * saved, so errors are logged and swallowed.
 *
 * THE STREAK (owner's ruling, 16 Nov 2026, docs/evidence/FIX-streaks-bank-uploads.md).
 * A streak is the run of consecutive ATTENDED lessons of one child in one
 * class, read from the register: Present and Late count, Absent breaks it,
 * Excused, unmarked and cancelled lessons neither count nor break it. It
 * is worked out from `attendance` + `sessions` every time, never stepped
 * up from the stored row: the stored row used to be incremented on every
 * call, so a retried or late-processed lesson counted again and 18
 * children reached runs above 500. `streakRun` is the rule;
 * scripts/REPAIR-attendance-streaks.sql is the same rule in SQL, and
 * scripts/pgtest/attendance-streaks.test.mjs holds the two together.
 *
 * THE BONUS. 50 points when the lesson being processed is attended and
 * makes the run up to and including it a multiple of five. It is dated by
 * that lesson (`date`, `month`) and linked to it (`session_id`), and it is
 * paid once per child per lesson: an existing bonus for the same child
 * and lesson is looked for first, and the partial unique index
 * point_transactions_one_streak_bonus (20261116091000) turns a race into
 * a refused second row. A retry after success pays nothing.
 *
 * Imports nothing at runtime; the client is passed in.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

export interface MarkedEntry {
  studentId: string;
  status: string;
}

export interface AttendanceEffectsInput {
  /** The lesson's class. Streaks are per class; without one they are skipped. */
  classId: string | null | undefined;
  /** The lesson's date, YYYY-MM-DD. Tuition is per month; without it, skipped. */
  date: string | null | undefined;
  entries: MarkedEntry[];
  /**
   * The lesson the streak step is for. The streak is read from the
   * register up to and including this lesson, and the bonus is linked to
   * it, so without it no streak is touched (and the step reports failure,
   * so the drain keeps the job).
   */
  sessionId?: string | null;
  /**
   * Kept for callers that send it (the sync's drain does). The lesson's
   * date is read from the register with the lesson itself, so this is no
   * longer what a streak step is dated by.
   */
  lessonDate?: string | null;
}

/** Recalculates tuition for each Absent or Excused child. Returns how many calls failed. */
export async function recalcTuition(
  supabase: SupabaseClient,
  { date, entries }: Pick<AttendanceEffectsInput, "date" | "entries">,
): Promise<number> {
  const needsRecalc = entries.filter(e => e.status === 'Absent' || e.status === 'Excused');
  if (needsRecalc.length === 0 || !date) return 0;
  const month = date.substring(0, 7);
  let failures = 0;
  await Promise.all(needsRecalc.map(entry =>
    supabase.functions.invoke('calculate-tuition', { body: { studentId: entry.studentId, month } })
      .then(({ error }) => {
        if (error) {
          failures += 1;
          console.error('Tuition recalc error:', error);
        }
      })
  ));
  return failures;
}

/** Statuses that extend a streak. Absent breaks it; anything else is passed over. */
export const STREAK_ATTENDED: ReadonlySet<string> = new Set(['Present', 'Late']);
export const STREAK_BREAKS: ReadonlySet<string> = new Set(['Absent']);
/** A bonus at every this-many attended lessons in a row. */
export const STREAK_BONUS_EVERY = 5;
export const STREAK_BONUS_POINTS = 50;
/**
 * The marker every streak bonus's notes start with - the ones paid here
 * ("Attendance streak bonus: 5 consecutive ...") and the ones the repair
 * script paid late ("Attendance streak bonus (paid late): ..."). One key,
 * student + lesson + this marker, so this code and the back-pay can never
 * both pay one lesson; the unique index (20261116091000) matches on it too.
 */
export const STREAK_BONUS_NOTE_PREFIX = 'Attendance streak bonus';
export const streakBonusNote = (run: number) =>
  `${STREAK_BONUS_NOTE_PREFIX}: ${run} consecutive classes attended!`;

/** One of a child's marks in one class, with its lesson. */
export interface RegisterMark {
  sessionId: string;
  /** The lesson's date, YYYY-MM-DD. */
  date: string;
  /** The lesson's start time; orders two lessons on one day. */
  startTime?: string | null;
  /** The lesson's status; a 'Canceled' lesson is passed over. */
  sessionStatus?: string | null;
  /** The child's mark on it. */
  status: string | null;
}

export interface StreakReading {
  /** Attended lessons in a row, ending at the bound (inclusive). */
  run: number;
  /** The latest attended lesson's date up to the bound, or null. */
  lastAttended: string | null;
  /** With a bound: whether that lesson is in the register at all. */
  found: boolean;
  /** With a bound: whether the bound lesson itself counts (attended, not cancelled). */
  boundAttended: boolean;
  /** With a bound: that lesson's date. */
  boundDate: string | null;
}

// Plain code-unit comparison, not localeCompare: it is the order Postgres
// gives `date`, `time::text` and `uuid::text`, so the repair script sorts
// the register exactly as this does.
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const lessonOrder = (a: RegisterMark, b: RegisterMark) =>
  cmp(a.date, b.date) || cmp(a.startTime ?? '', b.startTime ?? '') || cmp(a.sessionId, b.sessionId);

/**
 * The rule. Reads a child's register in one class in lesson order and
 * returns the run of attended lessons ending at `uptoSessionId` (or at the
 * latest lesson when none is given): Present and Late count, Absent ends
 * the run, Excused / unmarked / cancelled lessons are passed over. Pure.
 */
export function streakRun(marks: readonly RegisterMark[], uptoSessionId?: string | null): StreakReading {
  const sorted = [...marks].filter((m) => m && typeof m.date === 'string' && typeof m.sessionId === 'string')
    .sort(lessonOrder);
  let end = sorted.length - 1;
  let found = false;
  let boundAttended = false;
  let boundDate: string | null = null;
  if (uptoSessionId) {
    end = sorted.findIndex((m) => m.sessionId === uptoSessionId);
    found = end >= 0;
    if (!found) return { run: 0, lastAttended: null, found, boundAttended, boundDate };
    const b = sorted[end];
    boundDate = b.date;
    boundAttended = b.sessionStatus !== 'Canceled' && STREAK_ATTENDED.has(b.status ?? '');
  }
  let run = 0;
  let broken = false;
  let lastAttended: string | null = null;
  for (let i = end; i >= 0; i--) {
    const m = sorted[i];
    if (m.sessionStatus === 'Canceled') continue;
    const s = m.status ?? '';
    if (STREAK_ATTENDED.has(s)) {
      if (lastAttended === null) lastAttended = m.date;
      if (!broken) run += 1;
    } else if (STREAK_BREAKS.has(s)) {
      broken = true;
    }
    if (broken && lastAttended !== null) break;
  }
  return { run, lastAttended, found, boundAttended, boundDate };
}

/** Whether processing the bound lesson owes a bonus. */
export const streakBonusDue = (r: StreakReading) =>
  r.found && r.boundAttended && r.run > 0 && r.run % STREAK_BONUS_EVERY === 0 && !!r.boundDate;

/**
 * Re-reads the streak of each marked child in the lesson's class from the
 * register, writes it, and pays the bonus the lesson owes. Returns false
 * if any read or write failed, so the drain keeps the job; doing it again
 * is always safe, because nothing here is a step up from what was stored.
 */
export async function advanceStreaks(
  supabase: SupabaseClient,
  { classId, entries, sessionId }: Pick<AttendanceEffectsInput, "classId" | "entries" | "sessionId" | "lessonDate">,
): Promise<boolean> {
  const studentIds = [...new Set((entries ?? []).map((e) => e?.studentId).filter((s): s is string => typeof s === 'string'))];
  if (studentIds.length === 0 || !classId) return true;
  if (!sessionId) {
    // Nothing to read the streak up to, and nothing to link a bonus to.
    console.error('Streak tracking error: no lesson given');
    return false;
  }
  const now = new Date().toISOString();

  try {
    const { data: streaks, error: readError } = await supabase
      .from('student_attendance_streaks')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds);
    if (readError) {
      console.error('Streak tracking error:', readError);
      return false;
    }
    const hasRow = new Set(((streaks || []) as { student_id: string }[]).map((s) => s.student_id));

    // One read per child: a class's whole register for 20 children can pass
    // PostgREST's row cap, one child's in one class cannot.
    type Read = { studentId: string; marks: RegisterMark[] | null };
    const reads: Read[] = await Promise.all(studentIds.map(async (studentId) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('session_id, status, sessions!inner(id, class_id, date, start_time, status)')
        .eq('student_id', studentId)
        .eq('sessions.class_id', classId);
      if (error || !Array.isArray(data)) {
        console.error('Streak tracking error:', error ?? 'register unreadable');
        return { studentId, marks: null };
      }
      const marks: RegisterMark[] = [];
      for (const row of data as any[]) {
        const s = Array.isArray(row?.sessions) ? row.sessions[0] : row?.sessions;
        if (!s || s.class_id !== classId || typeof s.date !== 'string') continue;
        marks.push({
          sessionId: String(row.session_id ?? s.id),
          date: String(s.date).slice(0, 10),
          startTime: s.start_time == null ? null : String(s.start_time),
          sessionStatus: s.status == null ? null : String(s.status),
          status: row.status == null ? null : String(row.status),
        });
      }
      return { studentId, marks };
    }));

    let ok = true;
    const upserts: {
      student_id: string;
      class_id: string;
      consecutive_days: number;
      last_attendance_date: string | null;
      bonuses_awarded: number;
      updated_at: string;
    }[] = [];
    const due: { studentId: string; run: number; date: string }[] = [];

    for (const r of reads) {
      if (!r.marks) { ok = false; continue; }
      const current = streakRun(r.marks);
      const atLesson = streakRun(r.marks, sessionId);
      if (streakBonusDue(atLesson)) due.push({ studentId: r.studentId, run: atLesson.run, date: atLesson.boundDate! });
      if (hasRow.has(r.studentId) || current.run > 0) {
        upserts.push({
          student_id: r.studentId,
          class_id: classId,
          consecutive_days: current.run,
          last_attendance_date: current.lastAttended,
          // Milestones in the current run, as the repair script sets it.
          // It decides nothing: the bonus is "once per child per lesson".
          bonuses_awarded: Math.floor(current.run / STREAK_BONUS_EVERY),
          updated_at: now,
        });
      }
    }

    if (due.length > 0) {
      const { data: paid, error: paidError } = await supabase
        .from('point_transactions')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('type', 'participation')
        .like('notes', `${STREAK_BONUS_NOTE_PREFIX}%`)
        .in('student_id', due.map((d) => d.studentId));
      if (paidError || !Array.isArray(paid)) {
        // Not knowing what was paid, pay nothing; the job is kept.
        ok = false;
        console.error('Streak bonus error:', paidError ?? 'bonuses unreadable');
      } else {
        const already = new Set((paid as { student_id: string }[]).map((p) => p.student_id));
        for (const d of due) {
          if (already.has(d.studentId)) continue;
          const { error } = await supabase.from('point_transactions').insert({
            student_id: d.studentId,
            class_id: classId,
            session_id: sessionId,
            points: STREAK_BONUS_POINTS,
            // point_transactions has no `reason` column and its type CHECK
            // rejects 'focus'. `date` is NOT NULL with no default on live,
            // which is why every bonus before 16 Nov 2026 was refused.
            type: 'participation',
            date: d.date,
            month: d.date.slice(0, 7),
            notes: streakBonusNote(d.run),
          });
          // 23505: another call paid this child for this lesson first.
          if (error && (error as { code?: string }).code !== '23505') {
            ok = false;
            console.error('Streak bonus error:', error);
          }
        }
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from('student_attendance_streaks').upsert(upserts, { onConflict: 'student_id,class_id' });
      if (error) { ok = false; console.error('Streak tracking error:', error); }
    }
    return ok;
  } catch (err) {
    console.error('Streak tracking error:', err);
    return false;
  }
}

/** Both, in parallel, as mark-attendance has always run them. */
export async function afterAttendanceMarked(
  supabase: SupabaseClient,
  input: AttendanceEffectsInput,
): Promise<void> {
  await Promise.all([recalcTuition(supabase, input), advanceStreaks(supabase, input)]);
}
