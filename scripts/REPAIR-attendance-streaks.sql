-- REPAIR: attendance streaks recomputed from the register. Run ONCE, by hand,
-- in the Supabase SQL editor, immediately BEFORE redeploying mark-attendance
-- and stars-sync (docs/evidence/FIX-streaks-bank-uploads.md, item 1).
--
-- What it does, in one transaction:
--   1. Every row of student_attendance_streaks is set from the register by
--      the rule in supabase/functions/_lib/attendance-effects.ts (streakRun):
--        consecutive_days     = attended lessons in a row at the latest lesson
--                               (Present and Late count, Absent breaks it,
--                               Excused / unmarked / cancelled lessons are
--                               passed over), in lesson order
--                               (date, start_time, id);
--        last_attendance_date = the latest Present / Late lesson, or NULL;
--        bonuses_awarded      = floor(consecutive_days / 5).
--      Rows are updated only where a value differs. No row is added or
--      removed.
--   2. Streak jobs the old code kept refusing are deleted from
--      stars_sync_effects (kind = 'streak' AND attempts > 0). Under the old
--      code every streak job failed - it inserted the bonus without `date` -
--      so every stale job has attempts >= 1. Their streak part is what step 1
--      just did; their bonus part would be back-pay, which the owner's
--      default is NOT to pay. Jobs never tried (attempts = 0) and tuition
--      jobs are left alone.
--
-- It pays no bonus and touches no other table: no point_transactions,
-- attendance, sessions, invoices, payments or payroll rows. To back-pay,
-- see scripts/OPTIN-attendance-streak-backpay.sql (owner's decision only).
--
-- It prints one row of counts, before and after. No child is named.
-- Running it again changes nothing (rows_changed 0) unless marks changed in
-- between; it would then also drop any streak job refused since, which costs
-- at most that lesson's bonus check, never a streak.
-- Tested by scripts/pgtest/attendance-streaks.test.mjs against the TS rule.

DROP TABLE IF EXISTS pg_temp._streak_repair_counts;
CREATE TEMP TABLE _streak_repair_counts (
  rows_total            bigint,
  rows_over_500_before  bigint,
  max_run_before        bigint,
  bonuses_awarded_before bigint,
  streak_jobs_before    bigint,
  rows_changed          bigint,
  rows_over_500_after   bigint,
  max_run_after         bigint,
  bonuses_awarded_after bigint,
  streak_jobs_deleted   bigint,
  streak_jobs_left      bigint
);

BEGIN;

LOCK TABLE public.student_attendance_streaks IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO _streak_repair_counts (rows_total, rows_over_500_before, max_run_before, bonuses_awarded_before, streak_jobs_before)
SELECT (SELECT count(*) FROM public.student_attendance_streaks),
       (SELECT count(*) FROM public.student_attendance_streaks WHERE consecutive_days > 500),
       (SELECT COALESCE(max(consecutive_days), 0) FROM public.student_attendance_streaks),
       (SELECT COALESCE(sum(bonuses_awarded), 0) FROM public.student_attendance_streaks),
       (SELECT count(*) FROM public.stars_sync_effects WHERE kind = 'streak');

WITH reg AS (
  -- A child's marks in a class, cancelled lessons left out, in lesson order.
  SELECT a.student_id, s.class_id, s.date, a.status::text AS status,
         row_number() OVER (PARTITION BY a.student_id, s.class_id
                            ORDER BY s.date, s.start_time::text, s.id::text) AS ord
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
   WHERE s.status::text <> 'Canceled'
), grouped AS (
  -- Each Absent starts a new group; the current run is the attended
  -- lessons of the last group.
  SELECT r.*,
         count(*) FILTER (WHERE r.status = 'Absent')
           OVER (PARTITION BY r.student_id, r.class_id ORDER BY r.ord ROWS UNBOUNDED PRECEDING) AS grp
    FROM reg r
), per AS (
  SELECT g.student_id, g.class_id,
         count(*) FILTER (WHERE g.status IN ('Present', 'Late') AND g.grp = g.last_grp) AS run,
         max(g.date) FILTER (WHERE g.status IN ('Present', 'Late')) AS last_attended
    FROM (SELECT x.*, max(x.grp) OVER (PARTITION BY x.student_id, x.class_id) AS last_grp FROM grouped x) g
   GROUP BY g.student_id, g.class_id
), target AS (
  SELECT t.id,
         COALESCE(p.run, 0)::int AS run,
         p.last_attended
    FROM public.student_attendance_streaks t
    LEFT JOIN per p ON p.student_id = t.student_id AND p.class_id = t.class_id
), changed AS (
  UPDATE public.student_attendance_streaks t
     SET consecutive_days     = x.run,
         last_attendance_date = x.last_attended,
         bonuses_awarded      = x.run / 5
    FROM target x
   WHERE x.id = t.id
     AND (t.consecutive_days     IS DISTINCT FROM x.run
       OR t.last_attendance_date IS DISTINCT FROM x.last_attended
       OR t.bonuses_awarded      IS DISTINCT FROM x.run / 5)
  RETURNING t.id
)
UPDATE _streak_repair_counts SET rows_changed = (SELECT count(*) FROM changed);

WITH gone AS (
  DELETE FROM public.stars_sync_effects
   WHERE kind = 'streak' AND attempts > 0
  RETURNING id
)
UPDATE _streak_repair_counts SET streak_jobs_deleted = (SELECT count(*) FROM gone);

UPDATE _streak_repair_counts SET
  rows_over_500_after   = (SELECT count(*) FROM public.student_attendance_streaks WHERE consecutive_days > 500),
  max_run_after         = (SELECT COALESCE(max(consecutive_days), 0) FROM public.student_attendance_streaks),
  bonuses_awarded_after = (SELECT COALESCE(sum(bonuses_awarded), 0) FROM public.student_attendance_streaks),
  streak_jobs_left      = (SELECT count(*) FROM public.stars_sync_effects WHERE kind = 'streak');

COMMIT;

SELECT * FROM _streak_repair_counts;
