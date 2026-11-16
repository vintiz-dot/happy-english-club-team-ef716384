-- OPT-IN ONLY: back-pay the attendance streak bonuses that were never paid.
-- The owner's default is NOT to run this (docs/evidence/FIX-streaks-bank-uploads.md,
-- item 1). Run it only on the owner's say-so, after REPAIR-attendance-streaks.sql,
-- the 20261116091000 migration and the redeploy.
--
-- Before running, set pay_from below to the first lesson date to back-pay.
-- Every bonus ever due is since the streak feature (8 Jan 2026); a later
-- date pays less.
--
-- It pays the bonus the new code would have paid at every lesson where the
-- run of attended lessons (Present / Late count, Absent breaks it, Excused
-- and cancelled lessons are passed over) reaches a multiple of five: 50
-- points, dated by that lesson, linked to it, type 'participation', the same
-- notes text - and only where that child has no streak bonus for that lesson
-- yet, so running it twice pays once (and the unique index refuses a
-- duplicate in any case). It writes point_transactions only; the
-- student_points trigger updates the totals. It prints how many bonuses and
-- points it added. No child is named.
-- Tested by scripts/pgtest/attendance-streaks.test.mjs.

WITH params AS (
  SELECT DATE '2026-01-08' AS pay_from      -- <- the owner's chosen first date
), reg AS (
  SELECT a.student_id, s.class_id, s.id AS session_id, s.date, a.status::text AS status,
         row_number() OVER (PARTITION BY a.student_id, s.class_id
                            ORDER BY s.date, s.start_time::text, s.id::text) AS ord
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
   WHERE s.status::text <> 'Canceled'
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
), due AS (
  SELECT r.* FROM runs r, params p
   WHERE r.status IN ('Present', 'Late') AND r.run > 0 AND r.run % 5 = 0 AND r.date >= p.pay_from
     AND NOT EXISTS (SELECT 1 FROM public.point_transactions pt
                      WHERE pt.student_id = r.student_id AND pt.session_id = r.session_id
                        AND pt.type = 'participation' AND pt.notes LIKE 'Attendance streak bonus:%')
), paid AS (
  INSERT INTO public.point_transactions (student_id, class_id, session_id, points, type, date, month, notes)
  SELECT d.student_id, d.class_id, d.session_id, 50, 'participation', d.date, to_char(d.date, 'YYYY-MM'),
         'Attendance streak bonus: ' || d.run || ' consecutive classes attended!'
    FROM due d
  RETURNING points
)
SELECT count(*) AS bonuses_paid, COALESCE(sum(points), 0) AS points_paid FROM paid;
