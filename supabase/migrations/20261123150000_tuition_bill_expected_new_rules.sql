-- The hourly bill check follows the owner's tuition rules of 23 Nov 2026.
--
-- public.tuition_bill_expected (20261123090000) restates calculate-tuition's
-- LESSON rule in SQL, so that public.tuition_bill_gaps can list every child
-- whose saved bill does not match the register. calculate-tuition now prices
-- with supabase/functions/_lib/tuition-pricing.ts, and two things in that rule
-- changed, so this function changes with it:
--
--   1. A lesson is billed unless it is cancelled or the child is Excused.
--      Before: only when the register held Present, Absent or Late for the
--      child, so a lesson with NO mark at all was not billed and a missing
--      mark could shrink a bill. Now a child enrolled for the lesson's date
--      (and weekday) is billed for it, mark or no mark.
--   2. The enrollment's custom rate IS the price, higher or lower than the
--      class fee. Before: base_amount summed the class fee and the custom
--      rate came off as a "Rate Adjustment" discount. Now base_amount is
--      lessons x the custom rate, which is what this function sums.
--
-- Unchanged: the month's sessions with status Scheduled or Held; the
-- enrollment of that class covering the date, the one created first; its
-- allowed_days; the class fee from class_fee_history on the lesson's date,
-- else classes.session_rate_vnd; a lesson priced at 0 is not billed.
-- Same name, arguments and columns, so tuition_bill_gaps is not touched.
--
-- ORDER: paste this in the same sitting as the calculate-tuition deploy that
-- carries the new rules. Either one without the other and the check lists
-- every child with an unmarked lesson or a custom rate as "differs" (it
-- recalculates this month's, to the same figure, every hour: noisy, not
-- wrong). Safe to paste twice.
--
-- Rollback: paste the tuition_bill_expected block of
-- 20261123090000_tuition_bill_check.sql again.

CREATE OR REPLACE FUNCTION public.tuition_bill_expected(p_month text)
RETURNS TABLE (student_id uuid, billable_lessons integer, expected_base bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH m AS (
    SELECT to_date(p_month || '-01', 'YYYY-MM-DD') AS d0,
           (to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date AS d1
  ),
  -- Every child with an enrollment of the class that touches the month.
  pupil AS (
    SELECT DISTINCT en.student_id, en.class_id
      FROM m
      JOIN public.enrollments en
        ON en.start_date < m.d1 AND (en.end_date IS NULL OR en.end_date >= m.d0)
  ),
  lesson AS (
    SELECT p.student_id, s.date,
           coalesce((SELECT h.session_rate_vnd FROM public.class_fee_history h
                      WHERE h.class_id = s.class_id AND h.effective_from <= s.date
                      ORDER BY h.effective_from DESC LIMIT 1),
                    c.session_rate_vnd, 0)::bigint AS fee,
           e.rate_override_vnd, e.allowed_days,
           EXISTS (SELECT 1 FROM public.attendance a
                    WHERE a.session_id = s.id AND a.student_id = p.student_id
                      AND a.status::text = 'Excused') AS excused
      FROM m
      JOIN public.sessions s ON s.date >= m.d0 AND s.date < m.d1 AND s.status::text IN ('Scheduled', 'Held')
      JOIN public.classes c ON c.id = s.class_id
      JOIN pupil p ON p.class_id = s.class_id
      -- The enrollment the lesson is billed under: of this class, covering the
      -- date, created first (enrollment-discounts.ts inCreationOrder).
      CROSS JOIN LATERAL (
        SELECT en.rate_override_vnd, en.allowed_days
          FROM public.enrollments en
         WHERE en.student_id = p.student_id AND en.class_id = s.class_id
           AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date)
         ORDER BY en.created_at ASC NULLS LAST, en.created_at::text ASC, en.id::text ASC
         LIMIT 1
      ) e
  )
  SELECT l.student_id, count(*)::integer, sum(coalesce(l.rate_override_vnd, l.fee))::bigint
    FROM lesson l
   WHERE NOT l.excused
     AND (l.allowed_days IS NULL OR extract(dow FROM l.date)::integer = ANY (l.allowed_days))
     AND coalesce(l.rate_override_vnd, l.fee) > 0
   GROUP BY l.student_id
$fn$;
REVOKE ALL ON FUNCTION public.tuition_bill_expected(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tuition_bill_expected(text) TO service_role;
