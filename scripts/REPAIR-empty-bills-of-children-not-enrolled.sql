-- REPAIR-empty-bills-of-children-not-enrolled.sql
-- Owner, 24 Nov 2026. Paste into the Supabase SQL editor. Not a migration.
--
-- WHY. calculate-tuition used to save a bill every time anybody opened a
-- child's tuition for a month, enrolled then or not. A child who had left
-- got an empty bill (0 charged, 0 paid) in every month somebody looked at:
-- 24 of November 2026's 81 bills. Since 24 Nov 2026 the calculator makes no
-- such bill (supabase/functions/_lib/month-enrolment.ts) and the month lists
-- hide the old ones. This removes the old ones.
--
-- WHAT IS REMOVED. A bill only when ALL of these hold:
--   * nothing charged: base, discount and total are 0;
--   * nothing paid on it: recorded_payment is 0, and no payment row names
--     that child and month;
--   * the child has no enrolment covering any day of that month;
--   * it is not frozen, nobody confirmed it, it carries no review flag, and
--     it was never paid, signed or frozen (invoice_state_floor).
-- On 24 Nov 2026 that was 49 bills of 27 children, out of 758:
--   2025-08:1 2025-10:2 2025-12:1 2026-01:1 2026-02:3 2026-03:1 2026-04:2
--   2026-05:1 2026-08:1 2026-09:1 2026-10:11 2026-11:24
-- Nine other empty bills of children not enrolled are LEFT (confirmed,
-- flagged, frozen or once paid); the lists hide them anyway.
--
-- WHAT DOES NOT CHANGE. No money: none of these bills holds a charge or a
-- payment. A departed child's credit stays on their last real bill, where it
-- already is (the empty bills only repeated it); the carry trigger
-- (invoices_carry_sync) recalculates each child's remaining bills by itself.
--
-- UNDO. Step 2 copies every removed bill into
-- public.invoices_removed_empty_20261124 first. To put them all back:
--   INSERT INTO public.invoices SELECT * FROM public.invoices_removed_empty_20261124
--   ON CONFLICT (student_id, month) DO NOTHING;
-- The audit log also keeps each removed row (audit_invoices).

-- ---------------------------------------------------------------- STEP 1
-- Look first. Changes nothing. One row per bill that step 2 would remove.
SELECT i.month, st.full_name, i.status, i.confirmation_status,
       i.carry_in_credit, i.carry_out_credit, i.created_at::date AS created, i.updated_at::date AS updated
  FROM public.invoices i
  JOIN public.students st ON st.id = i.student_id
 WHERE coalesce(i.base_amount, 0) = 0 AND coalesce(i.total_amount, 0) = 0 AND coalesce(i.discount_amount, 0) = 0
   AND coalesce(i.recorded_payment, 0) = 0
   AND NOT coalesce(i.tuition_frozen, false)
   AND i.status::text IN ('issued', 'draft')
   AND coalesce(i.confirmation_status::text, '') NOT IN ('confirmed', 'adjusted', 'needs_review')
   AND i.confirmed_at IS NULL
   AND jsonb_array_length(coalesce(i.review_flags::jsonb, '[]'::jsonb)) = 0
   AND NOT EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = i.student_id
                      AND e.start_date < (to_date(i.month || '-01', 'YYYY-MM-DD') + interval '1 month')::date
                      AND (e.end_date IS NULL OR e.end_date >= to_date(i.month || '-01', 'YYYY-MM-DD')))
   AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.student_id = i.student_id AND p.month = i.month)
   AND NOT EXISTS (SELECT 1 FROM public.invoice_state_floor f WHERE f.student_id = i.student_id AND f.month = i.month)
 ORDER BY i.month, st.full_name;

-- ---------------------------------------------------------------- STEP 2
-- The removal. Run it only after step 1's list looks right. It is one
-- transaction: a copy of the bills, then the delete, then two counts that
-- must be equal. It CANNOT be undone by itself; the undo is the INSERT above.
-- It refuses to run twice (the copy table already exists).
/*
BEGIN;

CREATE TABLE public.invoices_removed_empty_20261124 AS
SELECT i.*
  FROM public.invoices i
 WHERE coalesce(i.base_amount, 0) = 0 AND coalesce(i.total_amount, 0) = 0 AND coalesce(i.discount_amount, 0) = 0
   AND coalesce(i.recorded_payment, 0) = 0
   AND NOT coalesce(i.tuition_frozen, false)
   AND i.status::text IN ('issued', 'draft')
   AND coalesce(i.confirmation_status::text, '') NOT IN ('confirmed', 'adjusted', 'needs_review')
   AND i.confirmed_at IS NULL
   AND jsonb_array_length(coalesce(i.review_flags::jsonb, '[]'::jsonb)) = 0
   AND NOT EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = i.student_id
                      AND e.start_date < (to_date(i.month || '-01', 'YYYY-MM-DD') + interval '1 month')::date
                      AND (e.end_date IS NULL OR e.end_date >= to_date(i.month || '-01', 'YYYY-MM-DD')))
   AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.student_id = i.student_id AND p.month = i.month)
   AND NOT EXISTS (SELECT 1 FROM public.invoice_state_floor f WHERE f.student_id = i.student_id AND f.month = i.month);

-- The copy is for the owner only: nobody reads it through the app.
ALTER TABLE public.invoices_removed_empty_20261124 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoices_removed_empty_20261124 FROM PUBLIC, anon, authenticated;

-- Only the copied bills, and only while each is still empty.
DELETE FROM public.invoices i
 USING public.invoices_removed_empty_20261124 r
 WHERE i.id = r.id
   AND coalesce(i.base_amount, 0) = 0 AND coalesce(i.total_amount, 0) = 0
   AND coalesce(i.recorded_payment, 0) = 0
   AND NOT coalesce(i.tuition_frozen, false);

SELECT (SELECT count(*) FROM public.invoices_removed_empty_20261124) AS copied,
       (SELECT count(*) FROM public.invoices_removed_empty_20261124 r
         WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = r.id)) AS removed,
       (SELECT count(*) FROM public.invoices) AS bills_left;

COMMIT;
*/
