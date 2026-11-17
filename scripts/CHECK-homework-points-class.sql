-- CHECK: homework points filed under a class other than the homework's own
-- (docs/evidence/LEADERBOARD-audit.md, M19 (d)). Read only. Run this first;
-- on 17 Nov 2026 it listed 2 rows, 183 points, both children enrolled in
-- the homework's class. Then run REPAIR-homework-points-class.sql.
SELECT t.id, t.points, t.date, t.class_id AS filed_under, h.class_id AS belongs_to,
       EXISTS (SELECT 1 FROM public.enrollments e
                WHERE e.student_id = t.student_id AND e.class_id = h.class_id) AS child_in_that_class
  FROM public.point_transactions t
  JOIN public.homeworks h ON h.id = t.homework_id
 WHERE t.type = 'homework' AND t.class_id <> h.class_id;
