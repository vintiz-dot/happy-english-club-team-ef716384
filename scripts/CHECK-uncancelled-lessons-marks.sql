-- READ-ONLY. Paste into the Supabase SQL editor BEFORE installing
-- 20261123120000_uncancel_restores_marks.sql. It changes nothing and calls no
-- function of ours.
--
-- WHAT IT SHOWS. Cancelling a lesson sets every child's mark to Excused.
-- Un-cancelling brings the lesson back but left the marks Excused, and tuition
-- bills only Present, Absent and Late. This lists, per child and month, the marks
-- that are still Excused on a lesson that was cancelled and then un-cancelled
-- (the lesson is before today, the child was enrolled that day; an empty list of
-- allowed days means no day, as billing reads it, NULL = every day), and compares
-- the saved bill with a simple sum:
--
--   (marks that count now + these marks) x the class's session fee   against   the saved bill
--
-- first_guess is a first guess from that sum only (the real check is the dry run
-- of the migration, which uses the database's own pricing, fee history included):
--   likely restore  the sum equals the saved bill: the bill counted these lessons.
--   decide          the sum differs.
--   no bill         there is no bill for that month.
-- A mark is counted here when the cancellation changed it (updated_at within a
-- minute of the cancel and later than its creation) or when nobody ever made or touched it. Marks a person
-- changed after the cancel, and marks a person had already made Excused before the
-- cancel, are not counted; the TOTAL row says how many there are.
-- by_a_person = marks with marked_by set (a teacher or admin made them).
-- The last row ("TOTAL") adds everything up.
-- Expected on production (read 23 Nov 2026): 27 candidate marks across 26 children, all "decide".
--
-- Lessons still Scheduled although their date has passed (lessons_not_held) are left
-- out of the rows and the guesses, as the migration does: it reports them separately and
-- restores nothing there unless you choose the child and month. The TOTAL text counts them.

WITH today AS (
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d
),
marks AS (
  SELECT a.id AS attendance_id, a.student_id, s.id AS session_id, s.class_id, s.date, s.status::text AS session_status,
         to_char(s.date, 'YYYY-MM') AS month, a.marked_by,
         coalesce(c.session_rate_vnd, 0)::bigint AS fee,
         CASE
           WHEN a.updated_at BETWEEN s.canceled_at - interval '1 minute' AND s.canceled_at + interval '1 minute'
                AND (a.created_at IS NULL OR a.updated_at > a.created_at + interval '1 second') THEN 'candidate'
           WHEN a.marked_by IS NULL AND a.updated_at <= coalesce(a.created_at, a.updated_at) + interval '1 second' THEN 'candidate'
           WHEN a.updated_at > s.canceled_at + interval '1 minute' THEN 'remarked_since'
           ELSE 'excused_before_cancel'
         END AS kind
    FROM attendance a
    JOIN sessions s ON s.id = a.session_id
    JOIN classes c ON c.id = s.class_id
   WHERE a.status = 'Excused'
     AND s.canceled_at IS NOT NULL
     AND s.status::text <> 'Canceled'
     AND s.date < (SELECT d FROM today)
     AND EXISTS (
       SELECT 1 FROM enrollments e
        WHERE e.student_id = a.student_id AND e.class_id = s.class_id
          AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date)
          AND (e.allowed_days IS NULL OR extract(dow FROM s.date)::integer = ANY (e.allowed_days)))
),
cand_months AS (
  SELECT m.student_id, m.month,
         string_agg(DISTINCT c.name::text, ', ') AS class_name,
         count(*) AS candidates,
         count(*) FILTER (WHERE m.marked_by IS NOT NULL) AS by_a_person,
         sum(m.fee) AS candidates_worth
    FROM marks m LEFT JOIN classes c ON c.id = m.class_id
   WHERE m.kind = 'candidate' AND m.session_status = 'Held'   -- as the function does: lessons not Held are only counted in the TOTAL text
   GROUP BY m.student_id, m.month
),
counted AS (
  -- Marks that count today in the same child-months, at the class fee.
  SELECT a.student_id, to_char(s.date, 'YYYY-MM') AS month,
         sum(coalesce(c.session_rate_vnd, 0))::bigint AS counted_worth
    FROM attendance a
    JOIN sessions s ON s.id = a.session_id AND s.status::text IN ('Scheduled', 'Held')
    JOIN classes c ON c.id = s.class_id
   WHERE a.status::text IN ('Present', 'Absent', 'Late')
     AND (a.student_id, to_char(s.date, 'YYYY-MM')) IN (SELECT student_id, month FROM cand_months)
   GROUP BY a.student_id, to_char(s.date, 'YYYY-MM')
),
result_rows AS (
  SELECT 1 AS part, st.full_name::text AS student, cm.class_name, cm.month, cm.candidates, cm.by_a_person,
         i.base_amount::bigint AS saved_base, i.recorded_payment::bigint AS recorded_payment,
         i.tuition_frozen AS frozen,
         coalesce(k.counted_worth, 0) + cm.candidates_worth AS sum_if_restored,
         CASE WHEN i.id IS NULL THEN 'no bill'
              WHEN coalesce(k.counted_worth, 0) + cm.candidates_worth = i.base_amount THEN 'likely restore'
              ELSE 'decide' END AS first_guess
    FROM cand_months cm
    JOIN students st ON st.id = cm.student_id
    LEFT JOIN counted k ON k.student_id = cm.student_id AND k.month = cm.month
    LEFT JOIN invoices i ON i.student_id = cm.student_id AND i.month = cm.month
)
SELECT student, class_name, month, candidates, by_a_person, saved_base, recorded_payment, frozen,
       sum_if_restored, first_guess
  FROM (
    SELECT part, student, class_name, month, candidates, by_a_person, saved_base, recorded_payment, frozen, sum_if_restored, first_guess
      FROM result_rows
    UNION ALL
    SELECT 2, 'TOTAL (' || count(DISTINCT student) || ' children, ' || count(*) || ' child-months)', NULL, NULL,
           sum(candidates), sum(by_a_person), sum(saved_base), sum(recorded_payment), NULL, sum(sum_if_restored),
           count(*) FILTER (WHERE first_guess = 'likely restore') || ' likely restore, '
           || count(*) FILTER (WHERE first_guess = 'decide') || ' decide, '
           || count(*) FILTER (WHERE first_guess = 'no bill') || ' no bill; '
           || (SELECT count(*) FROM marks WHERE kind = 'remarked_since') || ' changed by a person after the cancel (left alone); '
           || (SELECT count(*) FROM marks WHERE kind = 'excused_before_cancel') || ' already Excused before the cancel (left alone); '
           || (SELECT count(*) FROM marks WHERE kind = 'candidate' AND session_status <> 'Held') || ' more candidate marks on '
           || (SELECT count(DISTINCT session_id) FROM marks WHERE kind = 'candidate' AND session_status <> 'Held') || ' lessons_not_held (not in the rows or the guesses above)'
      FROM result_rows
  ) u
 ORDER BY part, student, month;
