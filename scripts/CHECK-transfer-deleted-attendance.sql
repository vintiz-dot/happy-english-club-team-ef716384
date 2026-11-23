-- READ-ONLY. Paste into the Supabase SQL editor BEFORE installing
-- 20261123110000_restore_transfer_deleted_marks.sql. It changes nothing.
--
-- WHAT IT SHOWS. Until 6 Nov 2026 a class transfer deleted the child's attendance
-- marks in the class they left, past lessons included. A lesson with no mark is
-- not billed. This lists, for every child and month, the lessons that were Held,
-- are before today, sit inside an enrolment the child had in the class they left,
-- and have no mark ("holes"), and compares the bill saved with a simple sum:
--
--   (marks that count now + holes) x the class's session fee   against   the saved bill
--
-- The verdict is a first guess from that sum only (the real check is the dry run
-- of the migration, which uses the database's own pricing, fee history included):
--   likely restore  the sum equals the saved bill: the bill counted the holes.
--   decide          the sum differs: a lesson may have been Excused, a fee may
--                   have changed, or the bill was changed since.
--   no bill         there is no bill for that month.
-- The last row ("TOTAL") adds the holes, their worth, bills and payments up and
-- counts the children. Expected on production: 123 holes, 6 children, 17 child-months.
--
-- An empty list of allowed days means no day, as billing reads it (NULL = every day).
-- The cutoff (6 Nov 2026 12:00 UTC) is when the fixed transfer function was written;
-- if the fix was pasted later, change it in the two places that say 2026-11-06 12:00.
-- The TOTAL row also says how many logged transfers could not be followed
-- (their old enrolment is gone), which this list cannot show.
--
-- The week of a lesson is not looked at; the month is the month of the lesson.

WITH today AS (
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d
),
transfers AS (
  SELECT CASE WHEN l.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN l.entity_id::uuid END AS old_enrollment_id,
         CASE WHEN l.diff ->> 'old_class_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN (l.diff ->> 'old_class_id')::uuid END AS class_id,
         CASE WHEN l.diff ->> 'effective_date' ~ '^\d{4}-\d{2}-\d{2}'
              THEN left(l.diff ->> 'effective_date', 10)::date END AS eff
    FROM audit_log l
   WHERE l.entity = 'enrollment' AND l.action = 'transfer'
     AND l.occurred_at < timestamptz '2026-11-06 12:00+00'
     AND CASE WHEN l.diff ->> 'deleted_attendance' ~ '^\d{1,9}$' THEN (l.diff ->> 'deleted_attendance')::integer ELSE 0 END > 0
),
tr AS (
  SELECT en.student_id, t.class_id, t.eff
    FROM transfers t JOIN enrollments en ON en.id = t.old_enrollment_id
   WHERE t.class_id IS NOT NULL AND t.eff IS NOT NULL
),
skipped AS (
  SELECT count(*) AS n
    FROM audit_log l
    LEFT JOIN enrollments en
      ON l.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND en.id::text = l.entity_id
   WHERE l.entity = 'enrollment' AND l.action = 'transfer'
     AND l.occurred_at < timestamptz '2026-11-06 12:00+00'
     AND CASE WHEN l.diff ->> 'deleted_attendance' ~ '^\d{1,9}$' THEN (l.diff ->> 'deleted_attendance')::integer ELSE 0 END > 0
     AND (en.id IS NULL
          OR NOT (l.diff ->> 'old_class_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  AND l.diff ->> 'effective_date' ~ '^\d{4}-\d{2}-\d{2}'))
),
holes AS (
  SELECT DISTINCT ON (tr.student_id, s.id)
         tr.student_id, s.id AS session_id, s.class_id, s.date,
         to_char(s.date, 'YYYY-MM') AS month,
         coalesce(c.session_rate_vnd, 0)::bigint AS fee
    FROM tr
    JOIN sessions s ON s.class_id = tr.class_id AND s.status::text = 'Held'
                   AND s.date < (SELECT d FROM today) AND s.date < tr.eff
    JOIN classes c ON c.id = s.class_id
   WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.id AND a.student_id = tr.student_id)
     AND EXISTS (
       SELECT 1 FROM enrollments e
        WHERE e.student_id = tr.student_id AND e.class_id = s.class_id
          AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date)
          AND (e.allowed_days IS NULL OR extract(dow FROM s.date)::integer = ANY (e.allowed_days)))
   ORDER BY tr.student_id, s.id, tr.eff
),
hole_months AS (
  SELECT student_id, month,
         string_agg(DISTINCT c.name::text, ', ') AS class_name,
         count(*) AS holes, sum(fee) AS holes_worth
    FROM holes h LEFT JOIN classes c ON c.id = h.class_id
   GROUP BY student_id, month
),
counted AS (
  -- Marks that count today in the same child-months, at the class fee.
  SELECT a.student_id, to_char(s.date, 'YYYY-MM') AS month,
         sum(coalesce(c.session_rate_vnd, 0))::bigint AS counted_worth
    FROM attendance a
    JOIN sessions s ON s.id = a.session_id AND s.status::text IN ('Scheduled', 'Held')
    JOIN classes c ON c.id = s.class_id
   WHERE a.status::text IN ('Present', 'Absent', 'Late')
     AND (a.student_id, to_char(s.date, 'YYYY-MM')) IN (SELECT student_id, month FROM hole_months)
   GROUP BY a.student_id, to_char(s.date, 'YYYY-MM')
),
result_rows AS (
  SELECT 1 AS part, st.full_name::text AS student, hm.class_name, hm.month, hm.holes, hm.holes_worth,
         i.base_amount::bigint AS saved_base, i.recorded_payment::bigint AS recorded_payment,
         i.tuition_frozen AS frozen,
         coalesce(k.counted_worth, 0) + hm.holes_worth AS sum_if_restored,
         CASE WHEN i.id IS NULL THEN 'no bill'
              WHEN coalesce(k.counted_worth, 0) + hm.holes_worth = i.base_amount THEN 'likely restore'
              ELSE 'decide' END AS first_guess
    FROM hole_months hm
    JOIN students st ON st.id = hm.student_id
    LEFT JOIN counted k ON k.student_id = hm.student_id AND k.month = hm.month
    LEFT JOIN invoices i ON i.student_id = hm.student_id AND i.month = hm.month
)
SELECT student, class_name, month, holes, holes_worth, saved_base, recorded_payment, frozen,
       sum_if_restored, first_guess
  FROM (
    SELECT part, student, class_name, month, holes, holes_worth, saved_base, recorded_payment, frozen, sum_if_restored, first_guess
      FROM result_rows
    UNION ALL
    SELECT 2, 'TOTAL (' || count(DISTINCT student) || ' children, ' || count(*) || ' child-months)', NULL, NULL,
           sum(holes), sum(holes_worth), sum(saved_base), sum(recorded_payment), NULL, sum(sum_if_restored),
           count(*) FILTER (WHERE first_guess = 'likely restore') || ' likely restore, '
           || count(*) FILTER (WHERE first_guess = 'decide') || ' decide, '
           || count(*) FILTER (WHERE first_guess = 'no bill') || ' no bill; '
           || (SELECT n FROM skipped) || ' transfers skipped (old enrolment gone)'
      FROM result_rows
  ) u
 ORDER BY part, student, month;
