-- CHECK-prior-balance-differences.sql
--
-- READ-ONLY. One SELECT, no writes, no functions called. Safe to paste into
-- the Supabase SQL editor as it is. It lists no names - student ids only.
--
-- WHAT IT ANSWERS. Until the T3 fix the admin tuition list (/tuition) worked
-- out each student's prior balance in the browser: payments minus charges
-- over every EARLIER bill. The database keeps the same quantity on each bill
-- (invoices.carry_in_credit / carry_in_debt, maintained by the
-- invoices_carry_sync trigger of migration 20261009120000). For this month
-- and the two before it, this compares the two:
--
--   summed_carry_in  = sum(recorded_payment - total_amount) over earlier bills
--   stored_carry_in  = carry_in_credit - carry_in_debt on the bill itself
--   (positive = the family is in credit, negative = the family owes)
--
-- If the trigger is applied and has never been bypassed, every 'carry-in'
-- count below is 0. A non-zero count means stored carry on those bills is
-- out of step with the bills before them - which is the calculator's source
-- data, so it is worth a look whatever screen is in use.
--
-- It also counts, per month, enrolled students who have NO bill row at all.
-- Those are the rows on /tuition that change most with the fix: the old page
-- showed them a charge of 0 for the month; the new page shows the
-- calculator's charge, as the Finance tab always has.
--
-- WHAT IT DOES NOT SHOW. Figures on /tuition also move for a bill whose saved
-- total is out of date (a lesson marked since the bill was last worked out);
-- that needs the calculator, not SQL, and is not listed here. Nor can this
-- query see a row cap: it runs inside the database, where there is none.
-- If the editor shows only the first 100 rows, the count rows are among them.
--
-- HOW TO READ THE RESULT. Rows come in this order:
--   1. kind = 'count: carry-in'    one per month: bills checked, bills differing
--   2. kind = 'count: no bill row' one per month: enrolled students without a bill
--   3. kind = 'carry-in differs'   one per differing bill, largest difference first
--   4. kind = 'no bill row'        one per enrolled student without a bill

WITH months AS (
  SELECT to_char(
           date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - make_interval(months => n),
           'YYYY-MM') AS month
  FROM generate_series(0, 2) AS n
),
bills AS (
  SELECT i.id, i.student_id, i.month,
         COALESCE(i.carry_in_credit, 0) - COALESCE(i.carry_in_debt, 0) AS stored_carry_in
  FROM public.invoices i
  JOIN months m ON m.month = i.month
),
summed AS (
  SELECT b.id,
         COALESCE(SUM(COALESCE(p.recorded_payment, 0) - COALESCE(p.total_amount, 0)), 0) AS summed_carry_in,
         COUNT(p.id) AS earlier_bills
  FROM bills b
  LEFT JOIN public.invoices p
         ON p.student_id = b.student_id
        AND p.month < b.month
  GROUP BY b.id
),
compared AS (
  SELECT b.month, b.student_id, b.stored_carry_in, s.summed_carry_in, s.earlier_bills,
         s.summed_carry_in - b.stored_carry_in AS difference
  FROM bills b
  JOIN summed s ON s.id = b.id
),
no_bill AS (
  -- Enrolled at some point in the month, and no invoice row for it.
  SELECT DISTINCT m.month, e.student_id
  FROM months m
  JOIN public.enrollments e
    ON e.start_date <= (to_date(m.month || '-01', 'YYYY-MM-DD') + interval '1 month' - interval '1 day')::date
   AND (e.end_date IS NULL OR e.end_date >= to_date(m.month || '-01', 'YYYY-MM-DD'))
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.student_id = e.student_id AND i.month = m.month
  )
),
report AS (
  SELECT 1 AS section, 'count: carry-in' AS kind, m.month, NULL::uuid AS student_id,
         (SELECT COUNT(*) FROM compared c WHERE c.month = m.month) AS bills_checked,
         (SELECT COUNT(*) FROM compared c WHERE c.month = m.month AND c.difference <> 0) AS how_many,
         NULL::numeric AS stored_carry_in, NULL::numeric AS summed_carry_in,
         NULL::numeric AS difference, NULL::bigint AS earlier_bills
  FROM months m
  UNION ALL
  SELECT 2, 'count: no bill row', m.month, NULL::uuid,
         NULL::bigint,
         (SELECT COUNT(*) FROM no_bill n WHERE n.month = m.month),
         NULL::numeric, NULL::numeric, NULL::numeric, NULL::bigint
  FROM months m
  UNION ALL
  SELECT 3, 'carry-in differs', c.month, c.student_id,
         NULL::bigint, NULL::bigint,
         c.stored_carry_in, c.summed_carry_in, c.difference, c.earlier_bills
  FROM compared c
  WHERE c.difference <> 0
  UNION ALL
  SELECT 4, 'no bill row', n.month, n.student_id,
         NULL::bigint, NULL::bigint, NULL::numeric, NULL::numeric, NULL::numeric, NULL::bigint
  FROM no_bill n
)
SELECT kind, month, student_id, bills_checked, how_many,
       stored_carry_in, summed_carry_in, difference, earlier_bills
FROM report
ORDER BY section, month DESC, ABS(COALESCE(difference, 0)) DESC, student_id;
