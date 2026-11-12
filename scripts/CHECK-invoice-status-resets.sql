-- READ-ONLY. Nothing here writes; every statement is a SELECT.
--
-- Which bills did calculate-tuition reset before the T1 fix
-- (docs/evidence/T1-invoice-status.md)? Until that fix every calculation -
-- any tuition screen, a payment, an attendance change - saved the bill with
-- confirmation_status = auto_approved | needs_review and status = 'issued',
-- so a bill an admin had confirmed stopped being confirmed, and a paid or
-- part-paid bill went back to 'issued'.
--
-- This LISTS them. It repairs nothing: whether a bill should be confirmed
-- again is an admin's decision (the figures may have changed since), and
-- the payment screens set paid / partial by their own rules.
--
-- No amounts were changed by that defect - totals, recorded payments and
-- carry balances are untouched in every row queries 1 to 5 return. Query 6
-- is about a different, rarer fault and is the only one about money.
--
-- Run each numbered statement on its own in the Supabase SQL editor (the
-- editor shows only the last result of a batch). No names are selected:
-- bills are identified by invoice id, student id and month.
--
-- Queries 1 to 3 read only the invoices table and work on any database.
-- Queries 4 to 6 read audit_log.operation / changed_fields, which exist
-- only once 20261009130000_audit_every_admin_action.sql has been applied,
-- and can only see changes made after it was. Query 0 says whether they can
-- run.

-- 0) Can queries 4-6 run, and how far back does the trail go?
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log'
      AND column_name IN ('operation', 'changed_fields'))            AS audit_columns_present_of_2,
  (SELECT count(*) FROM pg_trigger
    WHERE tgrelid = 'public.invoices'::regclass AND tgname = 'audit_invoices' AND NOT tgisinternal) AS invoices_audit_trigger,
  (SELECT min(occurred_at) FROM public.audit_log WHERE entity = 'invoices') AS invoice_trail_starts;

-- 1) COUNTS, from the bills themselves.
--    confirmed_then_reset: confirmed_at is written only by confirm-tuition
--      and never cleared, so a bill that has it but is no longer confirmed /
--      adjusted was confirmed by an admin and then reset.
--    payment_but_issued: every payment path sets paid or partial when it
--      records money, so a bill with a recorded payment that says issued or
--      draft was reset after the payment. (A payment later edited down in
--      Recorded Payment Manager can also look like this.)
SELECT
  count(*) FILTER (WHERE confirmed_at IS NOT NULL
                     AND confirmation_status IS DISTINCT FROM 'confirmed'
                     AND confirmation_status IS DISTINCT FROM 'adjusted')        AS confirmed_then_reset,
  count(*) FILTER (WHERE COALESCE(recorded_payment, 0) > 0
                     AND status::text IN ('issued', 'draft'))                    AS payment_but_issued,
  count(*) FILTER (WHERE confirmed_at IS NOT NULL
                     AND confirmation_status IS DISTINCT FROM 'confirmed'
                     AND confirmation_status IS DISTINCT FROM 'adjusted'
                     AND COALESCE(recorded_payment, 0) > 0
                     AND status::text IN ('issued', 'draft'))                    AS both,
  count(*)                                                                       AS all_bills
FROM public.invoices;

-- 1b) The same two counts per month.
SELECT
  month,
  count(*) FILTER (WHERE confirmed_at IS NOT NULL
                     AND confirmation_status IS DISTINCT FROM 'confirmed'
                     AND confirmation_status IS DISTINCT FROM 'adjusted')        AS confirmed_then_reset,
  count(*) FILTER (WHERE COALESCE(recorded_payment, 0) > 0
                     AND status::text IN ('issued', 'draft'))                    AS payment_but_issued,
  count(*)                                                                       AS bills
FROM public.invoices
GROUP BY month
ORDER BY month DESC;

-- 2) ROWS: bills an admin confirmed that are no longer confirmed.
SELECT
  i.id AS invoice_id, i.student_id, i.month,
  i.confirmation_status AS confirmation_now, i.status AS status_now,
  i.confirmed_at, i.confirmed_by, i.updated_at,
  i.total_amount, i.recorded_payment, i.tuition_frozen
FROM public.invoices i
WHERE i.confirmed_at IS NOT NULL
  AND i.confirmation_status IS DISTINCT FROM 'confirmed'
  AND i.confirmation_status IS DISTINCT FROM 'adjusted'
ORDER BY i.month DESC, i.id;

-- 3) ROWS: bills with a recorded payment whose status says issued / draft.
--    EXPECT A LONG LIST: before the fix every bill was reset to 'issued' at
--    its next calculation, so nearly every bill that has a payment is
--    here. That is the old behaviour showing, not new damage, and nothing
--    needs doing by hand: after the fix the next ordinary calculation of a
--    bill (opening its tuition screen) writes the label below.
--    would_be_by_month_rule is the one label rule (_lib/invoice-status.ts):
--    recorded payment against the month's charge plus debt carried in less
--    credit carried in.
SELECT
  i.id AS invoice_id, i.student_id, i.month, i.status AS status_now,
  i.total_amount, i.recorded_payment, i.carry_in_debt, i.carry_in_credit,
  CASE WHEN COALESCE(i.recorded_payment, 0) >= i.total_amount + COALESCE(i.carry_in_debt, 0) - COALESCE(i.carry_in_credit, 0)
            AND i.total_amount + COALESCE(i.carry_in_debt, 0) - COALESCE(i.carry_in_credit, 0) > 0
       THEN 'paid' ELSE 'partial' END AS would_be_by_month_rule,
  i.updated_at
FROM public.invoices i
WHERE COALESCE(i.recorded_payment, 0) > 0
  AND i.status::text IN ('issued', 'draft')
ORDER BY i.month DESC, i.id;

-- 4) FROM THE AUDIT TRAIL: every time a confirmed / adjusted bill was set
--    back to auto_approved / needs_review. No screen and no other function
--    makes that change; only calculate-tuition does. Counts first.
--    figures_changed_in_that_save = false is the pure defect (nothing about
--    the bill changed) and cannot happen once the fix is deployed.
--    true means the bill really had new figures: before the fix it was
--    reset silently, after the fix this is the designed move to
--    needs_review with a "Changed after confirmation" flag - so rows dated
--    after the deploy with true are expected, not damage.
SELECT
  count(*)                                                        AS resets,
  count(DISTINCT l.entity_id)                                     AS bills,
  count(*) FILTER (WHERE (l.diff -> 'old' ->> 'total_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'total_amount')
                     AND (l.diff -> 'old' ->> 'base_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'base_amount')
                     AND (l.diff -> 'old' ->> 'discount_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'discount_amount'))
                                                                  AS resets_with_no_figure_change,
  min(l.occurred_at) AS first_seen, max(l.occurred_at) AS last_seen
FROM public.audit_log l
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND 'confirmation_status' = ANY (l.changed_fields)
  AND l.diff -> 'old' ->> 'confirmation_status' IN ('confirmed', 'adjusted')
  AND l.diff -> 'new' ->> 'confirmation_status' IN ('auto_approved', 'needs_review');

-- 4b) ROWS for query 4, newest first, with what the bill says today.
SELECT
  l.entity_id AS invoice_id,
  l.diff -> 'new' ->> 'student_id' AS student_id,
  l.diff -> 'new' ->> 'month'      AS month,
  l.occurred_at                    AS reset_at,
  l.diff -> 'old' ->> 'confirmation_status' AS was,
  l.diff -> 'new' ->> 'confirmation_status' AS became,
  l.diff -> 'old' ->> 'total_amount'        AS total_before,
  l.diff -> 'new' ->> 'total_amount'        AS total_after,
  NOT ((l.diff -> 'old' ->> 'total_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'total_amount')
   AND (l.diff -> 'old' ->> 'base_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'base_amount')
   AND (l.diff -> 'old' ->> 'discount_amount') IS NOT DISTINCT FROM (l.diff -> 'new' ->> 'discount_amount'))
                                   AS figures_changed_in_that_save,
  i.confirmation_status            AS confirmation_today,
  i.confirmed_at                   AS last_confirmed_at
FROM public.audit_log l
LEFT JOIN public.invoices i ON i.id::text = l.entity_id
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND 'confirmation_status' = ANY (l.changed_fields)
  AND l.diff -> 'old' ->> 'confirmation_status' IN ('confirmed', 'adjusted')
  AND l.diff -> 'new' ->> 'confirmation_status' IN ('auto_approved', 'needs_review')
ORDER BY l.occurred_at DESC;

-- 5) FROM THE AUDIT TRAIL: a paid / partial / credit bill set back to
--    'issued' by the service role (actor_user_id IS NULL: an edge function,
--    not a signed-in admin - the payment dialogs and the status override
--    screen write as the admin). Counts, then rows. Dated before the fix
--    these are the defect. Dated after it, a row here is the label being
--    corrected because the month's money changed (a payment edited down or
--    moved away, a wrong "paid" from the old cumulative rule): expected.
SELECT
  count(*) AS resets, count(DISTINCT l.entity_id) AS bills,
  min(l.occurred_at) AS first_seen, max(l.occurred_at) AS last_seen
FROM public.audit_log l
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND l.actor_user_id IS NULL
  AND 'status' = ANY (l.changed_fields)
  AND l.diff -> 'old' ->> 'status' IN ('paid', 'partial', 'credit')
  AND l.diff -> 'new' ->> 'status' = 'issued';

-- 5b)
SELECT
  l.entity_id AS invoice_id,
  l.diff -> 'new' ->> 'student_id' AS student_id,
  l.diff -> 'new' ->> 'month'      AS month,
  l.occurred_at                    AS reset_at,
  l.diff -> 'old' ->> 'status'     AS was,
  l.diff -> 'new' ->> 'recorded_payment' AS recorded_payment_then,
  l.diff -> 'new' ->> 'total_amount'     AS total_then,
  i.status                         AS status_today,
  i.recorded_payment               AS recorded_payment_today
FROM public.audit_log l
LEFT JOIN public.invoices i ON i.id::text = l.entity_id
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND l.actor_user_id IS NULL
  AND 'status' = ANY (l.changed_fields)
  AND l.diff -> 'old' ->> 'status' IN ('paid', 'partial', 'credit')
  AND l.diff -> 'new' ->> 'status' = 'issued'
ORDER BY l.occurred_at DESC;

-- 6) A DIFFERENT FAULT, about money: a recorded payment LOWERED by the
--    service role. Before T1 calculate-tuition wrote back the payment it
--    had read at the start, which lowered one in two situations: (a) its
--    read of the bill failed and it carried on, saving recorded_payment 0;
--    (b) a payment was recorded while it was calculating, and its save put
--    the older figure back. Both are closed now (the read fails the call;
--    the function no longer writes the column). No other edge function
--    lowers recorded_payment (corrections and reversals are made by a
--    signed-in admin and carry that admin's id). Expect zero or very few
--    rows; each is a payment to look at by hand. Counts, then rows.
SELECT
  count(*) AS times, count(DISTINCT l.entity_id) AS bills,
  sum((l.diff -> 'old' ->> 'recorded_payment')::bigint
      - COALESCE((l.diff -> 'new' ->> 'recorded_payment')::bigint, 0)) AS total_lowered_vnd
FROM public.audit_log l
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND l.actor_user_id IS NULL
  AND 'recorded_payment' = ANY (l.changed_fields)
  AND (l.diff -> 'old' ->> 'recorded_payment')::bigint
      > COALESCE((l.diff -> 'new' ->> 'recorded_payment')::bigint, 0);

-- 6b)
SELECT
  l.entity_id AS invoice_id,
  l.diff -> 'new' ->> 'student_id' AS student_id,
  l.diff -> 'new' ->> 'month'      AS month,
  l.occurred_at                    AS lowered_at,
  (l.diff -> 'old' ->> 'recorded_payment')::bigint AS recorded_before,
  COALESCE((l.diff -> 'new' ->> 'recorded_payment')::bigint, 0) AS recorded_after,
  i.recorded_payment               AS recorded_today
FROM public.audit_log l
LEFT JOIN public.invoices i ON i.id::text = l.entity_id
WHERE l.entity = 'invoices' AND l.operation = 'UPDATE'
  AND l.actor_user_id IS NULL
  AND 'recorded_payment' = ANY (l.changed_fields)
  AND (l.diff -> 'old' ->> 'recorded_payment')::bigint
      > COALESCE((l.diff -> 'new' ->> 'recorded_payment')::bigint, 0)
ORDER BY l.occurred_at DESC;
