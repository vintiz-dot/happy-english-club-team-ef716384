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
 *   Present            -> advance their attendance streak, and award the
 *                         streak bonus at every fifth consecutive lesson
 *
 * The two halves are exported separately because the sync does not run
 * them inline: it queues them in the same transaction as the mark
 * (stars_sync_effects) and drains the queue, and to drain it has to know
 * whether each one worked. afterAttendanceMarked ignores those answers, as
 * mark-attendance always has: neither may fail a mark that is already
 * saved, so errors are logged and swallowed.
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
   * The lesson a streak step is for, YYYY-MM-DD. mark-attendance leaves it
   * out and the step is dated today, as it always was: a teacher marks the
   * register on the day. The sync passes it, because it drains marks for
   * past lessons - a backlog of five lessons is five steps, not one, and
   * working the same lesson twice is one.
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

/** Advances streaks for each Present child. Returns false if any write failed. */
export async function advanceStreaks(
  supabase: SupabaseClient,
  { classId, entries, lessonDate }: Pick<AttendanceEffectsInput, "classId" | "entries" | "lessonDate">,
): Promise<boolean> {
  const presentEntries = entries.filter(e => e.status === 'Present');
  if (presentEntries.length === 0 || !classId) return true;

  const now = new Date().toISOString();
  const today = lessonDate && /^\d{4}-\d{2}-\d{2}$/.test(lessonDate) ? lessonDate : now.split('T')[0];

  try {
    const { data: streaks, error: readError } = await supabase
      .from('student_attendance_streaks')
      .select('*')
      .eq('class_id', classId)
      .in('student_id', presentEntries.map(e => e.studentId));
    if (readError) {
      console.error('Streak tracking error:', readError);
      return false;
    }

    // Shape named here rather than left as `any`: the three fields below
    // drive a points award, so a typo in one of them would silently hand
    // out the wrong bonus rather than failing.
    type StreakRow = {
      student_id: string;
      consecutive_days: number | null;
      last_attendance_date: string | null;
      bonuses_awarded: number | null;
    };
    const streakMap = new Map<string, StreakRow>(
      ((streaks || []) as StreakRow[]).map(s => [s.student_id, s]),
    );
    const upserts: {
      student_id: string;
      class_id: string;
      consecutive_days: number;
      last_attendance_date: string;
      bonuses_awarded: number;
      updated_at: string;
    }[] = [];
    // What bonuses_awarded was before this call, for a child given a
    // bonus here: if the bonus cannot be written, the streak keeps the old
    // count, so the next call awards it rather than skipping it for good.
    const awardedBefore = new Map<string, number>();
    const pointInserts: {
      student_id: string;
      class_id: string;
      points: number;
      type: string;
      notes: string;
    }[] = [];

    for (const entry of presentEntries) {
      const existing = streakMap.get(entry.studentId);
      let newConsecutive = 1;
      let bonusesAwarded = existing?.bonuses_awarded || 0;

      if (existing) {
        if (existing.last_attendance_date !== today) {
          newConsecutive = (existing.consecutive_days || 0) + 1;
        } else {
          newConsecutive = existing.consecutive_days || 1;
        }
      }
      // A past lesson worked after a later one still counts, but does not
      // move the latest attendance date backwards.
      const lastDate = existing?.last_attendance_date && existing.last_attendance_date > today
        ? existing.last_attendance_date
        : today;

      const currentMilestones = Math.floor(newConsecutive / 5);
      if (currentMilestones > bonusesAwarded) {
        // point_transactions has no `reason` column and its type CHECK
        // rejects 'focus'; use the valid 'participation' type + `notes`
        // (date/month fall back to their column defaults). The previous
        // shape failed silently and never awarded streak bonuses.
        pointInserts.push({
          student_id: entry.studentId,
          class_id: classId,
          points: 50,
          type: 'participation',
          notes: `Attendance streak bonus: ${newConsecutive} consecutive classes attended!`,
        });
        awardedBefore.set(entry.studentId, bonusesAwarded);
        bonusesAwarded = currentMilestones;
      }

      upserts.push({
        student_id: entry.studentId,
        class_id: classId,
        consecutive_days: newConsecutive,
        last_attendance_date: lastDate,
        bonuses_awarded: bonusesAwarded,
        updated_at: now,
      });
    }

    // The bonus first, then the streak that records it as given. The other
    // way round, a refused bonus was marked as awarded and never paid.
    let ok = true;
    if (pointInserts.length > 0) {
      const { error } = await supabase.from('point_transactions').insert(pointInserts);
      if (error) {
        ok = false;
        console.error('Streak bonus error:', error);
        for (const u of upserts) {
          const before = awardedBefore.get(u.student_id);
          if (before !== undefined) u.bonuses_awarded = before;
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
