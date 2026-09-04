-- READ-ONLY. Run this BEFORE applying 20260904090000_student_deactivated_at.sql.
--
-- Shows exactly which money the month-aware student filter brings back into
-- the finance views, so the totals moving is expected rather than alarming.
-- Nothing here writes; every statement is a SELECT.
--
-- Usage: paste into the Supabase SQL editor and run.

-- ---------------------------------------------------------------------------
-- 1) What deactivated_at will be set to for each currently-inactive student,
--    and the earliest month they will start counting toward again.
-- ---------------------------------------------------------------------------
WITH last_billed AS (
  SELECT
    i.student_id,
    MAX(i.month) AS last_month,
    ((MAX(i.month) || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamptz AS month_end
  FROM public.invoices i
  GROUP BY i.student_id
)
SELECT
  s.full_name,
  s.updated_at::date                                  AS row_last_touched,
  lb.last_month                                       AS last_invoiced_month,
  GREATEST(s.updated_at, COALESCE(lb.month_end, s.updated_at))::date
                                                      AS backfilled_deactivated_at,
  to_char(GREATEST(s.updated_at, COALESCE(lb.month_end, s.updated_at)), 'YYYY-MM')
                                                      AS counts_through_month
FROM public.students s
LEFT JOIN last_billed lb ON lb.student_id = s.id
WHERE s.is_active = false
ORDER BY 4 DESC;

-- ---------------------------------------------------------------------------
-- 2) Per-month finance that is CURRENTLY HIDDEN because the student has since
--    been deactivated. These are the figures that reappear.
--
--    Read `hidden_outstanding` as money owed that no report is showing you.
-- ---------------------------------------------------------------------------
SELECT
  i.month,
  COUNT(DISTINCT i.student_id)                        AS hidden_students,
  SUM(i.total_amount)                                 AS hidden_billed,
  SUM(i.recorded_payment)                             AS hidden_collected,
  SUM(i.total_amount - i.recorded_payment)            AS hidden_outstanding
FROM public.invoices i
JOIN public.students s ON s.id = i.student_id
WHERE s.is_active = false
GROUP BY i.month
ORDER BY i.month DESC;

-- ---------------------------------------------------------------------------
-- 3) Months already closed whose snapshots OMIT a student who was billed that
--    month. Those frozen records are incomplete: the student was deactivated
--    before the close, so CloseMonthDialog never included them.
--
--    After the fix these months report as not-closed with drift, which is the
--    check working correctly. Re-close them with a supersede reason to write a
--    complete snapshot.
-- ---------------------------------------------------------------------------
SELECT
  i.month,
  s.full_name,
  i.total_amount,
  i.recorded_payment
FROM public.invoices i
JOIN public.students s ON s.id = i.student_id
WHERE EXISTS (
    SELECT 1 FROM public.monthly_finance_snapshots m
    WHERE m.month = i.month AND m.superseded_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.monthly_finance_snapshots m
    WHERE m.month = i.month AND m.student_id = i.student_id AND m.superseded_at IS NULL
  )
ORDER BY i.month DESC, s.full_name;
