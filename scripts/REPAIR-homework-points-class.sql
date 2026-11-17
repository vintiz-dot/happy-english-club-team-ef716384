-- REPAIR: homework points filed under a class other than the homework's own
-- (docs/evidence/LEADERBOARD-audit.md, M19 (d)).
--
-- On 17 Nov 2026 two homework payments (183 points in all) sat on a class
-- the homework does not belong to, so they showed on the wrong board. Both
-- children are enrolled in the homework's class. award_homework_points has
-- set the homework's class on every write since 23 Oct, so this cannot
-- happen again; these rows are older.
--
-- 1. Run CHECK-homework-points-class.sql (read only) and look at the rows.
-- 2. Paste this whole file and run it. It moves only rows whose child is
--    enrolled in the homework's class, and lists what it moved. Moving a
--    row is an UPDATE: the points trigger recalculates both classes'
--    monthly totals, and the audit trigger records it.
-- 3. Run the CHECK again: no rows (or only children not in that class).

WITH moved AS (
  UPDATE public.point_transactions t
     SET class_id = h.class_id
    FROM public.homeworks h
   WHERE h.id = t.homework_id
     AND t.type = 'homework'
     AND t.class_id <> h.class_id
     AND EXISTS (SELECT 1 FROM public.enrollments e
                  WHERE e.student_id = t.student_id AND e.class_id = h.class_id)
  RETURNING t.id, t.points, t.date, t.class_id AS now_under
)
SELECT count(*) AS rows_moved, COALESCE(sum(points), 0) AS points_moved FROM moved;
