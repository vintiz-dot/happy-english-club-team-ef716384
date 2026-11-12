-- T4 - how many LIVE bills each payment-path fault touches.
--
-- READ-ONLY and AGGREGATES ONLY: every statement is a SELECT of counts and
-- sums. No names, no ids, no rows. Paste into the Supabase SQL editor; it
-- changes nothing. Safe to run before or after the T4 deploy (it does not
-- need migration 20261113090000: the label rule is written out inline).
-- docs/evidence/T4-payment-paths.md explains each fault.
--
-- The rule (T4), used in 3-5 below:
--   payable = total_amount + carry_in_debt - carry_in_credit
--   paid     when recorded_payment >= payable and (recorded_payment > 0 or base/total > 0)
--   partial  when recorded_payment > 0 otherwise
--   issued   otherwise          ('credit' set by an admin is kept as it is)

-- 1) delete-payment: payments deleted so far, and what the old function left behind.
--    family_payments_deleted: their bills were never lowered (keys never matched).
--    unbalanced_reversals: reversal transactions that reversed one leg only.
SELECT
  (SELECT count(*) FROM public.payment_deletions)                                         AS payments_deleted,
  (SELECT count(*) FROM public.payment_deletions
    WHERE snapshot -> 'payment_data' ->> 'family_id' IS NOT NULL)                           AS family_payments_deleted,
  (SELECT coalesce(sum((snapshot -> 'payment_data' ->> 'amount')::bigint), 0) FROM public.payment_deletions
    WHERE snapshot -> 'payment_data' ->> 'family_id' IS NOT NULL)                           AS family_payments_deleted_vnd,
  (SELECT count(*) FROM (
     SELECT e.tx_id FROM public.ledger_entries e
     WHERE e.tx_id IN (SELECT tx_id FROM public.ledger_entries WHERE tx_key LIKE 'payment-reversal-%')
     GROUP BY e.tx_id HAVING sum(e.debit) <> sum(e.credit)) x)                              AS unbalanced_reversals,
  (SELECT count(*) FROM public.payments WHERE family_id IS NOT NULL AND parent_payment_id IS NULL) AS family_payments_on_record;

-- 2) settle-bill.
--    real_debt_refused: bills owing money (carry-out debt) where the old balance
--      formula (cumulative paid_amount) says nothing is owed - a write-off is refused.
--    phantom_credit: bills with no carry-out credit where the old formula shows a
--      credit - a "voluntary contribution" of money that is not there is accepted.
WITH b AS (
  SELECT (i.total_amount - i.paid_amount) + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0) AS old_balance,
         coalesce(i.carry_out_debt, 0) - coalesce(i.carry_out_credit, 0) AS bill_balance
  FROM public.invoices i
)
SELECT
  count(*) FILTER (WHERE bill_balance > 0 AND old_balance <= 0) AS real_debt_refused,
  count(*) FILTER (WHERE bill_balance >= 0 AND old_balance < 0) AS phantom_credit,
  count(*) FILTER (WHERE bill_balance <> old_balance)           AS balance_differs,
  count(*)                                                      AS bills
FROM b;

-- 2b) settlements made so far, by type. counts_on_bill_after_t4: those whose
--     ledger transaction is keyed 'settlement-writeoff-' - only the T4
--     settle-bill writes that key, and only those are added to a bill by the
--     calculators. Must be 0 before the deploy (the old function cannot make one).
--     on_frozen_bill: a write-off there could never count (T4 refuses it).
SELECT
  s.settlement_type,
  count(*)                                                                   AS settlements,
  coalesce(sum(s.amount), 0)                                                 AS amount_vnd,
  count(*) FILTER (WHERE s.settlement_type = 'discount' AND EXISTS (
    SELECT 1 FROM public.ledger_entries e WHERE e.tx_id = s.tx_id AND e.tx_key LIKE 'settlement-writeoff-%')) AS counts_on_bill_after_t4,
  count(*) FILTER (WHERE i.tuition_frozen)                                   AS on_frozen_bill,
  count(*) FILTER (WHERE coalesce(i.carry_out_debt, 0) > 0)                  AS bill_still_shows_debt,
  max(s.created_at)::date                                                    AS last_made
FROM public.settlements s
LEFT JOIN public.invoices i ON i.student_id = s.student_id AND i.month = s.month
GROUP BY s.settlement_type
ORDER BY s.settlement_type;

-- 3) Stored label -> label by the T4 rule (what the next payment or calculation
--    writes). 'credit' rows are counted but never change.
WITH r AS (
  SELECT i.status::text AS stored,
         coalesce(i.recorded_payment, 0) AS rp,
         i.total_amount + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0) AS payable,
         greatest(coalesce(i.base_amount, 0), coalesce(i.total_amount, 0)) AS charged
  FROM public.invoices i
)
SELECT stored,
       CASE WHEN stored = 'credit' THEN 'credit'
            WHEN rp >= payable AND (rp > 0 OR charged > 0) THEN 'paid'
            WHEN rp > 0 THEN 'partial' ELSE 'issued' END AS by_t4_rule,
       count(*) AS bills
FROM r
GROUP BY 1, 2
ORDER BY 1, 2;

-- 4) Fault 5, the corners where T4 changes the rule (T1 rule -> T4 rule).
--    covered_with_money_partial_to_paid: nothing left to pay, money recorded (was partial).
--    covered_by_credit_issued_to_paid:   credit carried in covers the charge, nothing recorded (was issued).
--    zero_charge_nothing_stays_issued:   no charge, nothing recorded - unchanged.
WITH r AS (
  SELECT coalesce(i.recorded_payment, 0) AS rp,
         i.total_amount + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0) AS payable,
         greatest(coalesce(i.base_amount, 0), coalesce(i.total_amount, 0)) AS charged,
         i.status::text AS stored
  FROM public.invoices i
)
SELECT
  count(*) FILTER (WHERE payable <= 0 AND rp > 0)                  AS covered_with_money_partial_to_paid,
  count(*) FILTER (WHERE payable <= 0 AND rp = 0 AND charged > 0)  AS covered_by_credit_issued_to_paid,
  count(*) FILTER (WHERE payable <= 0 AND rp = 0 AND charged = 0)  AS zero_charge_nothing_stays_issued,
  count(*) FILTER (WHERE payable <= 0 AND rp > 0 AND stored = 'partial') AS of_which_stored_partial_now,
  count(*) FILTER (WHERE payable <= 0 AND rp = 0 AND charged > 0 AND stored = 'issued') AS of_which_stored_issued_now
FROM r;

-- 5) Fault 4: bills the OLD Payment Integrity Repair would flag (cumulative
--    paid_amount; 'draft' at zero) - pressing Repair before T4 rewrote these.
SELECT count(*) AS old_repair_would_rewrite
FROM public.invoices i
WHERE i.status::text IS DISTINCT FROM
      (CASE WHEN i.paid_amount = 0 THEN 'draft'
            WHEN i.total_amount - i.paid_amount <= 0 THEN 'paid'
            ELSE 'partial' END);

-- 6) Fault 6 (family-payment, not mounted): bills where its old "owed"
--    (total - recorded) differs from what the month really asks for.
SELECT
  count(*) FILTER (WHERE greatest(0, i.total_amount - coalesce(i.recorded_payment, 0))
                       > greatest(0, i.total_amount + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0) - coalesce(i.recorded_payment, 0)))
    AS old_owed_too_high_credit_ignored,
  count(*) FILTER (WHERE greatest(0, i.total_amount - coalesce(i.recorded_payment, 0))
                       < greatest(0, i.total_amount + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0) - coalesce(i.recorded_payment, 0)))
    AS old_owed_too_low_debt_ignored
FROM public.invoices i;

-- 7) Fault 7: referral bonuses that a swallowed read error would have left out.
SELECT
  count(*)                                AS referral_bonuses,
  count(DISTINCT student_id)              AS students_with_one,
  count(*) FILTER (WHERE effective_to IS NULL OR effective_to >= current_date) AS still_running
FROM public.referral_bonuses;
