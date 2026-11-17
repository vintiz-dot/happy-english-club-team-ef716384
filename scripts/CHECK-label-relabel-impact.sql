-- D5 G-4 - what 20261117110000_carry_refresh_relabels would relabel.
--
-- READ-ONLY. ONE statement, SELECT only. Run it BEFORE pasting the
-- migration (or after: it reads the same either way). It changes nothing.
-- Aggregates only: labels, counts, months bucketed. No names, no ids.
--
-- WHAT IT COUNTS. For every bill that is not 'credit' or 'draft', the label
-- public.invoice_paid_label gives it over the carry worked out again exactly
-- as refresh_invoice_carry does (the label the new carry refresh writes), and
-- how that compares with the stored label. Rows:
--   from_label -> to_label   bills that change, per transition
--   bills / children         how many, and of how many children
--   (the total of bills is also what a one-off relabel would change; NO such
--    write is part of the fix)
-- The migration itself relabels NOTHING. A child's stale bills are relabelled
-- the next time ANY bill of that child is written (a payment, a calculation,
-- a freeze, the carry refresh of an earlier month). So the 449 of 17 Nov go
-- down as families are paid and bills recalculated; a child nobody touches
-- keeps the old label. Whether a one-off is wanted is the owner's call:
-- labels are labels, every amount owed reads recorded_payment and the carry.
WITH chain AS (
  SELECT i.id, i.student_id, i.month, i.status::text AS stored,
         coalesce(i.total_amount, 0)::bigint AS ta, coalesce(i.recorded_payment, 0)::bigint AS rp,
         coalesce(i.base_amount, 0)::bigint AS base,
         coalesce(sum(coalesce(i.recorded_payment, 0) - coalesce(i.total_amount, 0))
                  OVER (PARTITION BY i.student_id ORDER BY i.month
                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::bigint AS carry_in
    FROM public.invoices i
),
judged AS (
  SELECT c.*,
         public.invoice_paid_label(c.rp, (c.ta + greatest(-c.carry_in, 0) - greatest(c.carry_in, 0))::bigint, c.base, c.ta)::text AS by_rule
    FROM chain c
   WHERE c.stored NOT IN ('credit', 'draft')
)
SELECT stored   AS from_label,
       by_rule  AS to_label,
       count(*)                                              AS bills,
       count(DISTINCT student_id)                            AS children,
       count(*) FILTER (WHERE month <  to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')) AS in_past_months,
       count(*) FILTER (WHERE month >= to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')) AS in_this_month_or_later
  FROM judged
 WHERE stored <> by_rule
 GROUP BY stored, by_rule
 ORDER BY stored, by_rule;
