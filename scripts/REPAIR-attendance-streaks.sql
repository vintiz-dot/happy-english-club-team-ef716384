-- REPAIR: attendance streaks rebuilt from the register, and every streak
-- bonus a child earned and never got paid (owner, 16 Nov 2026: "pay the
-- missed streak bonus"). docs/evidence/FIX-streaks-bank-uploads.md, item 1.
--
-- RUN IT TWICE, by hand, in the Supabase SQL editor:
--   1. as it is (DRY RUN): changes nothing, prints what it would do;
--   2. with `true` on the marked line below changed to `false`: does it.
-- Run the real run after pasting 20261116091000 and immediately BEFORE
-- redeploying mark-attendance and stars-sync.
--
-- The rule is the one in supabase/functions/_lib/attendance-effects.ts
-- (streakRun): a child's marks in one class in lesson order (date,
-- start_time, id), over HELD lessons up to today only; Present and Late
-- count, Absent breaks the run, Excused / unmarked lessons are passed over.
-- Scheduled lessons (future placeholders, past lessons never turned to Held)
-- and Canceled ones neither count nor break it.
--
-- What the real run does, in one transaction:
--   1. BACK-PAY. For every attended lesson at which a child's run reached a
--      multiple of 5, and for which that child has no streak bonus yet
--      (student + session_id + notes starting 'Attendance streak bonus' -
--      the same key the live code checks, and the unique index
--      point_transactions_one_streak_bonus enforces, so the two can never
--      both pay one lesson): one 50-point 'participation' row, session_id =
--      that lesson, DATED TODAY (date = the day it runs, month = its
--      YYYY-MM, Hanoi time) so past months' leaderboards are not rewritten,
--      notes "Attendance streak bonus (paid late): <N> classes in a row,
--      lesson of <YYYY-MM-DD>". created_by is NULL, as for the live bonus.
--   2. Every row of student_attendance_streaks is set from the register:
--        consecutive_days     = the current run (at the latest lesson);
--        last_attendance_date = the latest Present / Late lesson, or NULL;
--        bonuses_awarded      = floor(consecutive_days / 5).
--      Only rows whose values differ; no streak row added or removed.
--   3. Streak jobs the old code kept refusing (stars_sync_effects, kind
--      'streak', attempts > 0) are deleted. With the bonuses paid by step 1
--      and the rows rebuilt by step 2, the new code would find nothing to do
--      for them. Jobs never tried and tuition jobs are left.
-- Nothing else is written: no attendance, session, invoice, payment or
-- payroll row; point_transactions only gains the back-pay rows.
--
-- It prints ONE row: the mode, the bonuses and points (to be) paid, their
-- spread per class and per child as counts only (no names, no ids), the
-- largest single-child total, and the streak counters before / after.
-- Running the real run again pays 0 and changes 0 rows.
-- Tested by scripts/pgtest/attendance-streaks.test.mjs.

DROP TABLE IF EXISTS pg_temp._streak_repair_mode;
CREATE TEMP TABLE _streak_repair_mode AS
SELECT true AS dry_run;          -- <- DRY RUN. Change true to false for the real run.

DROP TABLE IF EXISTS pg_temp._streak_backpay;
DROP TABLE IF EXISTS pg_temp._streak_rebuilt;
DROP TABLE IF EXISTS pg_temp._streak_repair_counts;

BEGIN;

LOCK TABLE public.student_attendance_streaks IN SHARE ROW EXCLUSIVE MODE;

-- The register, walked once: each lesson's run, and each Absent's group.
CREATE TEMP TABLE _streak_backpay AS
WITH reg AS (
  SELECT a.student_id, s.class_id, s.id AS session_id, s.date, a.status::text AS status,
         row_number() OVER (PARTITION BY a.student_id, s.class_id
                            ORDER BY s.date, s.start_time::text, s.id::text) AS ord
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
   -- Only Held lessons up to today take part (attendance-effects.ts
   -- takesPartInStreak): Scheduled lessons - the placeholder 'Present' on
   -- future lessons, past lessons never turned to Held - and Canceled
   -- ones neither count nor break. Held placeholders count.
   WHERE s.status::text = 'Held'
     AND s.date <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
), grouped AS (
  SELECT r.*,
         count(*) FILTER (WHERE r.status = 'Absent')
           OVER (PARTITION BY r.student_id, r.class_id ORDER BY r.ord ROWS UNBOUNDED PRECEDING) AS grp
    FROM reg r
), runs AS (
  SELECT g.*,
         count(*) FILTER (WHERE g.status IN ('Present', 'Late'))
           OVER (PARTITION BY g.student_id, g.class_id, g.grp ORDER BY g.ord ROWS UNBOUNDED PRECEDING) AS run
    FROM grouped g
)
SELECT r.student_id, r.class_id, r.session_id, r.date AS lesson_date, r.run::int AS run
  FROM runs r
 WHERE r.status IN ('Present', 'Late') AND r.run > 0 AND r.run % 5 = 0
   AND NOT EXISTS (SELECT 1 FROM public.point_transactions pt
                    WHERE pt.student_id = r.student_id AND pt.session_id = r.session_id
                      AND pt.type = 'participation' AND pt.notes LIKE 'Attendance streak bonus%');

CREATE TEMP TABLE _streak_rebuilt AS
WITH reg AS (
  SELECT a.student_id, s.class_id, s.date, a.status::text AS status,
         row_number() OVER (PARTITION BY a.student_id, s.class_id
                            ORDER BY s.date, s.start_time::text, s.id::text) AS ord
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
   -- Only Held lessons up to today take part (attendance-effects.ts
   -- takesPartInStreak): Scheduled lessons - the placeholder 'Present' on
   -- future lessons, past lessons never turned to Held - and Canceled
   -- ones neither count nor break. Held placeholders count.
   WHERE s.status::text = 'Held'
     AND s.date <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
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
)
SELECT t.id, COALESCE(p.run, 0)::int AS run, p.last_attended
  FROM public.student_attendance_streaks t
  LEFT JOIN per p ON p.student_id = t.student_id AND p.class_id = t.class_id;

CREATE TEMP TABLE _streak_repair_counts AS
SELECT (SELECT CASE WHEN dry_run THEN 'DRY RUN - nothing changed' ELSE 'REAL RUN' END FROM _streak_repair_mode) AS mode,
       (SELECT count(*) FROM _streak_backpay) AS bonuses_to_pay,
       (SELECT 50 * count(*) FROM _streak_backpay) AS points_to_pay,
       -- Bonuses per class, largest first: one number per class, no ids.
       (SELECT COALESCE(jsonb_agg(n ORDER BY n DESC), '[]'::jsonb)
          FROM (SELECT count(*) n FROM _streak_backpay GROUP BY class_id) c) AS bonuses_per_class,
       -- How many children get 1, 2, 3 ... bonuses: {"bonuses": children}.
       (SELECT COALESCE(jsonb_object_agg(k, children ORDER BY k), '{}'::jsonb)
          FROM (SELECT n AS k, count(*) children
                  FROM (SELECT count(*) n FROM _streak_backpay GROUP BY student_id) s GROUP BY n) h) AS children_by_bonus_count,
       (SELECT count(DISTINCT student_id) FROM _streak_backpay) AS children_paid,
       (SELECT COALESCE(max(n) * 50, 0) FROM (SELECT count(*) n FROM _streak_backpay GROUP BY student_id) s) AS largest_child_points,
       (SELECT count(*) FROM public.student_attendance_streaks) AS streak_rows,
       (SELECT count(*) FROM public.student_attendance_streaks WHERE consecutive_days > 500) AS rows_over_500_before,
       (SELECT COALESCE(max(consecutive_days), 0) FROM public.student_attendance_streaks) AS max_run_before,
       (SELECT COALESCE(max(run), 0) FROM _streak_rebuilt) AS max_run_after,
       (SELECT count(*) FROM public.student_attendance_streaks t JOIN _streak_rebuilt x ON x.id = t.id
         WHERE t.consecutive_days IS DISTINCT FROM x.run
            OR t.last_attendance_date IS DISTINCT FROM x.last_attended
            OR t.bonuses_awarded IS DISTINCT FROM x.run / 5) AS streak_rows_to_change,
       (SELECT count(*) FROM public.stars_sync_effects WHERE kind = 'streak' AND attempts > 0) AS stale_streak_jobs_to_delete;

-- ------------------------------------------------ writes (real run only)
INSERT INTO public.point_transactions (student_id, class_id, session_id, points, type, date, month, notes)
SELECT b.student_id, b.class_id, b.session_id, 50, 'participation',
       (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
       to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM'),
       'Attendance streak bonus (paid late): ' || b.run || ' classes in a row, lesson of ' || to_char(b.lesson_date, 'YYYY-MM-DD')
  FROM _streak_backpay b
 WHERE NOT (SELECT dry_run FROM _streak_repair_mode);

UPDATE public.student_attendance_streaks t
   SET consecutive_days     = x.run,
       last_attendance_date = x.last_attended,
       bonuses_awarded      = x.run / 5
  FROM _streak_rebuilt x
 WHERE x.id = t.id
   AND NOT (SELECT dry_run FROM _streak_repair_mode)
   AND (t.consecutive_days     IS DISTINCT FROM x.run
     OR t.last_attendance_date IS DISTINCT FROM x.last_attended
     OR t.bonuses_awarded      IS DISTINCT FROM x.run / 5);

DELETE FROM public.stars_sync_effects
 WHERE kind = 'streak' AND attempts > 0
   AND NOT (SELECT dry_run FROM _streak_repair_mode);

COMMIT;

SELECT * FROM _streak_repair_counts;
