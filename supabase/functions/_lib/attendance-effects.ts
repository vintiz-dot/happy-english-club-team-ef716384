/**
 * What happens after a register is marked, besides the register.
 *
 * Moved here, unchanged in behaviour, from mark-attendance - which still
 * calls it - so that the Stars sync can call it too. A Pixel Pal mark has
 * to do exactly what a mark made in HEC does, and two copies of "what a
 * mark does" is how this codebase drifted on payroll three times.
 *
 *   Absent or Excused  -> recalculate that child's tuition for the month
 *   Present            -> advance their attendance streak, and award the
 *                         streak bonus at every fifth consecutive lesson
 *
 * Neither of these may fail the mark that triggered it: the register is
 * already saved. Errors are logged and swallowed, exactly as before.
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
}

export async function afterAttendanceMarked(
  supabase: SupabaseClient,
  { classId, date, entries }: AttendanceEffectsInput,
): Promise<void> {
  const now = new Date().toISOString();
  const postOps: Promise<void>[] = [];

  const needsRecalc = entries.filter(e => e.status === 'Absent' || e.status === 'Excused');
  if (needsRecalc.length > 0 && date) {
    const month = date.substring(0, 7);
    for (const entry of needsRecalc) {
      postOps.push(
        supabase.functions.invoke('calculate-tuition', { body: { studentId: entry.studentId, month } })
          .then(({ error }) => { if (error) console.error('Tuition recalc error:', error); })
      );
    }
  }

  const presentEntries = entries.filter(e => e.status === 'Present');
  if (presentEntries.length > 0 && classId) {
    const today = new Date().toISOString().split('T')[0];

    postOps.push((async () => {
      try {
        const { data: streaks } = await supabase
          .from('student_attendance_streaks')
          .select('*')
          .eq('class_id', classId)
          .in('student_id', presentEntries.map(e => e.studentId));

        // Shape named here rather than left as `any`: the three fields
        // below drive a points award, so a typo in one of them would
        // silently hand out the wrong bonus rather than failing.
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
            bonusesAwarded = currentMilestones;
          }

          upserts.push({
            student_id: entry.studentId,
            class_id: classId,
            consecutive_days: newConsecutive,
            last_attendance_date: today,
            bonuses_awarded: bonusesAwarded,
            updated_at: now,
          });
        }

        if (upserts.length > 0) {
          await supabase.from('student_attendance_streaks').upsert(upserts, { onConflict: 'student_id,class_id' });
        }
        if (pointInserts.length > 0) {
          await supabase.from('point_transactions').insert(pointInserts);
        }
      } catch (err) {
        console.error('Streak tracking error:', err);
      }
    })());
  }

  await Promise.all(postOps);
}
