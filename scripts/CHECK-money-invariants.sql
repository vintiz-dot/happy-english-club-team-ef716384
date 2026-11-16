-- D5 - the money invariants that can be checked on the data.
--
-- READ-ONLY. ONE statement, SELECT only: no INSERT / UPDATE / DELETE, no
-- DDL, no function that writes. Paste it into the Supabase SQL editor and
-- run it; it changes nothing. It is safe to run at any time and as often as
-- wanted (scripts/pgtest/money-invariants-check.test.mjs runs it inside a
-- READ ONLY transaction, so a write would fail there).
--
-- OUTPUT: one row per check - an id, a name, the kind, a count of
-- violations and, where it means something, a total in VND. No names, no
-- ids, no dates of a person. docs/evidence/D5-audit.md explains every check
-- and the guard behind it.
--
--   kind = 'must be 0'  a guard (trigger, function or rule) says this cannot
--                       happen. Anything above 0 is a finding: stop and look.
--   kind = 'report'     a known gap or known history: the number is how big
--                       it is today. Compare it with the previous run; a
--                       number that GROWS is a finding.
--
-- Needs what is live on 17 Nov 2026: invoice_paid_label (20261113090000),
-- the D2 guard tables (20261112091000), the D4 floors and register
-- (20261114090000 / 091000) and class_fee_history (20261114092000). It does
-- NOT read anything from D4 steps 3A / 3B (not live).
--
-- Times written into it (Asia/Ho_Chi_Minh):
--   2026-11-13 08:00  payments release (T4): every payment path labels with
--                     paidLabel from here on
--   2026-11-16 00:00  Settle Bill / voluntary contributions removed that day
--   2026-11-17 00:00  overpayment-as-credit: a family payment's allocations
--                     add up to the whole payment from that day
--   2026-10-28 00:00  the bulk-cancel wipe repriced some bills to 0 that day;
--                     a bill's total BEFORE it is the one a restore may bring back
--   2026-11-09 00:00 - 2026-11-10 00:00  the owner's July restore in the SQL
--                     editor (no actor): the one window M13 / M14 exempt
--
-- History explained on live (fix round 1, 17 Nov), reported, never hidden:
--   M41  ledger transactions unbalanced from BEFORE the first keyed ledger
--        write (3 single-leg AR credits of Oct 2025). M01 counts every other one.
--   M13 / M14 exempt exactly one pattern: a frozen bill's figures put back,
--        with no actor, inside the restore window, to the total an audit row
--        showed BEFORE the 28 Oct wipe. Any other day, any actor, any other
--        total still counts.
WITH
params AS (
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date        AS today,
         timestamptz '2026-11-13 08:00:00+07'                  AS t4_live,
         timestamptz '2026-11-16 00:00:00+07'                  AS settle_removed,
         timestamptz '2026-11-17 00:00:00+07'                  AS overpay_live,
         timestamptz '2026-10-28 00:00:00+07'                  AS wipe_day,
         timestamptz '2026-11-09 00:00:00+07'                  AS restore_from,
         timestamptz '2026-11-10 00:00:00+07'                  AS restore_to,
         (SELECT min(e.created_at) FROM public.session_cancel_override_events e
           WHERE e.kind = 'guard_installed')                   AS guard_on,
         -- The first keyed ledger write (tx_key arrived with 20251024050029).
         -- No keyed row at all: -infinity, so every transaction counts in M01.
         coalesce((SELECT min(e.created_at) FROM public.ledger_entries e WHERE e.tx_key IS NOT NULL),
                  timestamptz '-infinity')                    AS first_keyed
),
-- Unbalanced transactions, split: "before keys" = every leg unkeyed AND every
-- leg created before the first keyed write. Every writer since keys at least
-- one leg of each transaction, but the split does not rely on that: an
-- unkeyed transaction written today is after first_keyed, so it is in M01.
unbalanced AS (
  SELECT e.tx_id, sum(e.debit - e.credit) AS d,
         bool_and(e.tx_key IS NULL) AND max(e.created_at) < (SELECT first_keyed FROM params) AS before_keys
    FROM public.ledger_entries e
   GROUP BY e.tx_id
  HAVING sum(e.debit) <> sum(e.credit)
),
-- The total each bill had before the 28 Oct wipe: its last audit image before that day.
pre_wipe AS (
  SELECT DISTINCT ON (a.entity_id) a.entity_id,
         coalesce(a.diff -> 'new' ->> 'total_amount', a.diff -> 'old' ->> 'total_amount') AS total
    FROM public.audit_log a, params
   WHERE a.entity = 'invoices' AND a.occurred_at < params.wipe_day
   ORDER BY a.entity_id, a.occurred_at DESC, a.id DESC
),
-- Audit rows where a bill stayed frozen and a charged figure moved.
frozen_moves AS (
  SELECT a.id, a.entity_id, a.occurred_at, a.diff -> 'new' AS n,
         (a.actor_user_id IS NULL
          AND a.occurred_at >= params.restore_from AND a.occurred_at < params.restore_to
          AND EXISTS (SELECT 1 FROM pre_wipe w
                       WHERE w.entity_id = a.entity_id AND w.total IS NOT NULL
                         AND (a.diff -> 'new' ->> 'total_amount')::numeric = w.total::numeric)) AS is_restore
    FROM public.audit_log a, params
   WHERE a.entity = 'invoices' AND a.operation = 'UPDATE'
     AND coalesce((a.diff -> 'old' ->> 'tuition_frozen')::boolean, false)
     AND coalesce((a.diff -> 'new' ->> 'tuition_frozen')::boolean, false)
     AND a.changed_fields && ARRAY['base_amount', 'discount_amount', 'total_amount', 'class_breakdown']
),
-- Ledger money received per child and month: CASH and BANK, debit - credit.
cash AS (
  SELECT a.student_id, e.month, sum(e.debit - e.credit)::bigint AS net
    FROM public.ledger_entries e
    JOIN public.ledger_accounts a ON a.id = e.account_id
   WHERE a.code IN ('CASH', 'BANK')
   GROUP BY a.student_id, e.month
),
bill_cash AS (
  SELECT coalesce(i.student_id, c.student_id) AS student_id,
         coalesce(i.month, c.month)           AS month,
         i.id IS NOT NULL                     AS has_bill,
         coalesce(i.recorded_payment, 0)::bigint AS recorded,
         coalesce(c.net, 0)                   AS ledger
    FROM public.invoices i
    FULL JOIN cash c ON c.student_id = i.student_id AND c.month = i.month
),
-- The carry chain worked out again, exactly as refresh_invoice_carry does.
chain AS (
  SELECT i.id, i.student_id, i.month,
         coalesce(i.total_amount, 0)::bigint     AS ta,
         coalesce(i.recorded_payment, 0)::bigint AS rp,
         i.carry_in_credit, i.carry_in_debt, i.carry_out_credit, i.carry_out_debt,
         coalesce(sum(coalesce(i.recorded_payment, 0) - coalesce(i.total_amount, 0))
                  OVER (PARTITION BY i.student_id ORDER BY i.month
                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::bigint AS carry_in
    FROM public.invoices i
),
chain_diff AS (
  SELECT c.*,
         greatest(c.carry_in, 0)                   AS want_ci_credit,
         greatest(-c.carry_in, 0)                  AS want_ci_debt,
         greatest(-(c.ta - c.carry_in - c.rp), 0)  AS want_co_credit,
         greatest(c.ta - c.carry_in - c.rp, 0)     AS want_co_debt,
         lead(coalesce(c.carry_in_credit, 0) - coalesce(c.carry_in_debt, 0))
           OVER (PARTITION BY c.student_id ORDER BY c.month) AS next_carry_in
    FROM chain c
),
labels AS (
  SELECT i.status::text AS stored, i.updated_at,
         public.invoice_paid_label(
           coalesce(i.recorded_payment, 0)::bigint,
           (coalesce(i.total_amount, 0) + coalesce(i.carry_in_debt, 0) - coalesce(i.carry_in_credit, 0))::bigint,
           coalesce(i.base_amount, 0)::bigint,
           coalesce(i.total_amount, 0)::bigint)::text AS by_rule
    FROM public.invoices i
   WHERE i.status::text NOT IN ('credit', 'draft')
),
-- The audit row that last froze each bill (an INSERT born frozen, or an
-- UPDATE false -> true).
freeze_rec AS (
  SELECT DISTINCT ON (a.entity_id) a.entity_id, a.occurred_at, a.id, a.diff -> 'new' AS at_freeze
    FROM public.audit_log a
   WHERE a.entity = 'invoices'
     AND coalesce((a.diff -> 'new' ->> 'tuition_frozen')::boolean, false)
     AND (a.operation = 'INSERT'
          OR (a.operation = 'UPDATE' AND NOT coalesce((a.diff -> 'old' ->> 'tuition_frozen')::boolean, false)))
   ORDER BY a.entity_id, a.occurred_at DESC, a.id DESC
),
-- What a frozen bill must still show: the freeze, or an exempt restore made after it.
freeze_ref AS (
  SELECT DISTINCT ON (r.entity_id) r.entity_id, r.figures
    FROM (SELECT f.entity_id, f.occurred_at, f.id, f.at_freeze AS figures FROM freeze_rec f
          UNION ALL
          SELECT m.entity_id, m.occurred_at, m.id, m.n FROM frozen_moves m
            JOIN freeze_rec f ON f.entity_id = m.entity_id AND m.occurred_at >= f.occurred_at
           WHERE m.is_restore) r
   ORDER BY r.entity_id, r.occurred_at DESC, r.id DESC
),
fam_pay AS (
  SELECT p.id, p.amount::bigint AS amount, p.created_at,
         (SELECT coalesce(sum(pa.allocated_amount), 0)::bigint FROM public.payment_allocations pa
           WHERE pa.parent_payment_id = p.id) AS allocated
    FROM public.payments p
   WHERE p.family_id IS NOT NULL AND p.parent_payment_id IS NULL
     AND EXISTS (SELECT 1 FROM public.payment_allocations pa WHERE pa.parent_payment_id = p.id)
),
sess_audit AS (
  SELECT a.id, a.entity_id, a.operation, a.occurred_at,
         a.diff -> 'old' AS o, a.diff -> 'new' AS n,
         (a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS on_day
    FROM public.audit_log a, params
   WHERE a.entity = 'sessions' AND params.guard_on IS NOT NULL AND a.occurred_at >= params.guard_on
),
locked AS (
  SELECT pp.month, pp.locked_at FROM public.payroll_periods pp WHERE pp.status = 'locked'
),
leftover AS (
  SELECT k.tx_key, substring(k.tx_key FROM '^(?:smart-)?family-credit-([0-9a-fA-F-]{36})-') AS payment_id, k.debit::bigint AS amount
    FROM public.ledger_entries k
   WHERE k.tx_key LIKE 'family-credit-%' OR k.tx_key LIKE 'smart-family-credit-%'
),
fee_now AS (
  SELECT c.id, c.session_rate_vnd,
         (SELECT h.session_rate_vnd FROM public.class_fee_history h, params
           WHERE h.class_id = c.id AND h.effective_from <= params.today
           ORDER BY h.effective_from DESC LIMIT 1) AS in_force,
         EXISTS (SELECT 1 FROM public.class_fee_history h
                  WHERE h.class_id = c.id AND h.effective_from = DATE '1900-01-01') AS has_baseline
    FROM public.classes c
)
SELECT check_id, check_name, kind, violations, total_vnd, meaning FROM (

-- ------------------------------------------------------------ the ledger
SELECT 'M01' AS check_id, 'ledger_transactions_unbalanced' AS check_name, 'must be 0' AS kind,
       count(*)::bigint AS violations, coalesce(sum(abs(d)), 0)::bigint AS total_vnd,
       'ledger transactions (tx_id) whose debits and credits differ, apart from the pre-key history in M41; every writer posts both legs in one insert' AS meaning
  FROM unbalanced WHERE NOT before_keys
UNION ALL
SELECT 'M02', 'ledger_entries_malformed', 'must be 0', count(*)::bigint, NULL,
       'ledger rows with a negative side, both sides, or neither side'
  FROM public.ledger_entries e
 WHERE e.debit < 0 OR e.credit < 0 OR (e.debit <> 0 AND e.credit <> 0) OR (e.debit = 0 AND e.credit = 0)

-- ------------------------------------------- the bill against the ledger
UNION ALL
SELECT 'M03', 'bill_shows_more_than_ledger_cash', 'report', count(*)::bigint, coalesce(sum(recorded - ledger), 0)::bigint,
       'bills whose recorded_payment is above the CASH/BANK the ledger holds for that child and month: money recorded from the admin payment screens, the AI action or before the ledger existed (gap G-1)'
  FROM bill_cash WHERE has_bill AND recorded > ledger
UNION ALL
SELECT 'M04', 'ledger_cash_not_on_bill', 'report', count(*)::bigint, coalesce(sum(ledger - recorded), 0)::bigint,
       'child-months where the ledger received more CASH/BANK than the bill records (no bill counts as 0): a payment that never reached the bill, modify-payment (gap G-2), or a recorded_payment lowered by hand'
  FROM bill_cash WHERE ledger > recorded
UNION ALL
SELECT 'M05', 'family_payment_allocations_differ_before_17_nov', 'report', count(*)::bigint, coalesce(sum(amount - allocated), 0)::bigint,
       'family payments made before overpayment-as-credit whose allocations do not add up to the payment (the old unapplied cash; 3 expected, credited on 17 Nov by CREDIT-past-unapplied-cash.sql)'
  FROM fam_pay, params WHERE fam_pay.created_at < params.overpay_live AND allocated <> amount
UNION ALL
SELECT 'M06', 'family_payment_allocations_differ_since_17_nov', 'must be 0', count(*)::bigint, coalesce(sum(amount - allocated), 0)::bigint,
       'family payments since overpayment-as-credit whose allocations do not add up to the payment'
  FROM fam_pay, params WHERE fam_pay.created_at >= params.overpay_live AND allocated <> amount
UNION ALL
SELECT 'M07', 'allocation_without_ledger_leg', 'report', count(*)::bigint, coalesce(sum(pa.allocated_amount), 0)::bigint,
       'family payment allocations with no keyed ledger leg (smart-family-/family-payment-<payment>-<child>-) for that child'
  FROM public.payment_allocations pa
 WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries e
                    WHERE (e.tx_key LIKE 'smart-family-%' OR e.tx_key LIKE 'family-payment-%')
                      AND e.tx_key LIKE '%-' || pa.parent_payment_id::text || '-' || pa.student_id::text || '-%')
UNION ALL
SELECT 'M08', 'recorded_payment_negative', 'must be 0', count(*)::bigint, coalesce(sum(i.recorded_payment), 0)::bigint,
       'bills with a negative recorded payment (delete-payment and undo refuse to take off more than the bill holds)'
  FROM public.invoices i WHERE i.recorded_payment < 0

-- ------------------------------------------------------ the carry chain
UNION ALL
SELECT 'M09', 'carry_differs_from_chain', 'must be 0', count(*)::bigint,
       coalesce(sum(abs(coalesce(carry_out_debt, 0) - want_co_debt) + abs(coalesce(carry_out_credit, 0) - want_co_credit)), 0)::bigint,
       'bills whose stored carry_in / carry_out differ from the chain worked out again from total_amount and recorded_payment (invoices_carry_sync)'
  FROM chain_diff
 WHERE carry_in_credit IS DISTINCT FROM want_ci_credit OR carry_in_debt IS DISTINCT FROM want_ci_debt
    OR carry_out_credit IS DISTINCT FROM want_co_credit OR carry_out_debt IS DISTINCT FROM want_co_debt
UNION ALL
SELECT 'M10', 'carry_out_is_not_next_carry_in', 'must be 0', count(*)::bigint,
       coalesce(sum(abs((coalesce(carry_out_credit, 0) - coalesce(carry_out_debt, 0)) - next_carry_in)), 0)::bigint,
       'a bill whose closing balance is not the opening balance of the same child''s next bill'
  FROM chain_diff
 WHERE next_carry_in IS NOT NULL
   AND (coalesce(carry_out_credit, 0) - coalesce(carry_out_debt, 0)) <> next_carry_in

-- ------------------------------------------------------------- the label
UNION ALL
SELECT 'M11', 'label_disagrees_with_rule', 'report', count(*)::bigint, NULL,
       'bills (not credit / draft) whose status is not invoice_paid_label of their own money; a label is re-derived only when the bill is next written (gap G-4: the carry trigger moves a later month''s payable without relabelling it)'
  FROM labels WHERE stored <> by_rule
UNION ALL
SELECT 'M12', 'label_disagrees_written_since_t4', 'report', count(*)::bigint, NULL,
       'of M11, bills last written after the payments release (13 Nov 08:00): a carry change moved the payable (G-4); a writer with a rule of its own would also show here'
  FROM labels, params WHERE stored <> by_rule AND labels.updated_at >= params.t4_live

-- --------------------------------------------------------- frozen bills
UNION ALL
SELECT 'M13', 'frozen_figures_changed_while_frozen', 'must be 0', count(*)::bigint, NULL,
       'audit rows where a bill stayed frozen and its base, discount, total or class breakdown changed (keep_frozen_invoice_amounts); the 9 Nov restore to the pre-wipe total is exempt (M42)'
  FROM frozen_moves WHERE NOT is_restore
UNION ALL
SELECT 'M14', 'frozen_bill_differs_from_when_frozen', 'must be 0', count(*)::bigint,
       coalesce(sum(abs(coalesce(i.total_amount, 0) - coalesce((f.figures ->> 'total_amount')::numeric, 0))), 0)::bigint,
       'frozen bills whose charged figures now differ from the audit row that froze them (or from the exempt 9 Nov restore made after it)'
  FROM public.invoices i
  JOIN freeze_ref f ON f.entity_id = i.id::text
 WHERE i.tuition_frozen
   AND (coalesce(i.base_amount, 0)     <> coalesce((f.figures ->> 'base_amount')::numeric, 0)
     OR coalesce(i.discount_amount, 0) <> coalesce((f.figures ->> 'discount_amount')::numeric, 0)
     OR coalesce(i.total_amount, 0)    <> coalesce((f.figures ->> 'total_amount')::numeric, 0)
     OR jsonb_strip_nulls(i.class_breakdown) IS DISTINCT FROM (f.figures -> 'class_breakdown'))
UNION ALL
SELECT 'M15', 'frozen_bill_without_freeze_record', 'report', count(*)::bigint, NULL,
       'frozen bills with no audit row of the freeze (frozen by a trigger-made write, or before the audit trigger): M14 cannot check them'
  FROM public.invoices i
 WHERE i.tuition_frozen AND NOT EXISTS (SELECT 1 FROM freeze_rec f WHERE f.entity_id = i.id::text)
UNION ALL
SELECT 'M16', 'bill_unfrozen_not_by_admin', 'must be 0', count(*)::bigint, NULL,
       'audit rows where a bill went frozen -> not frozen and the actor holds no admin role (the SQL editor has no actor and counts here)'
  FROM public.audit_log a
 WHERE a.entity = 'invoices' AND a.operation = 'UPDATE'
   AND coalesce((a.diff -> 'old' ->> 'tuition_frozen')::boolean, false)
   AND NOT coalesce((a.diff -> 'new' ->> 'tuition_frozen')::boolean, true)
   AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = a.actor_user_id AND r.role = 'admin')

-- ------------------------------------------------------ the register
UNION ALL
SELECT 'M17', 'billable_mark_on_cancelled_lesson', 'must be 0', count(*)::bigint, NULL,
       'register rows not Excused on a Canceled lesson (guard_cancelled_session_attendance, trg_cancel_session_excused)'
  FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id
 WHERE s.status = 'Canceled' AND a.status IS DISTINCT FROM 'Excused'
UNION ALL
SELECT 'M18', 'billable_mark_outside_enrolment', 'report', count(*)::bigint, NULL,
       'register rows not Excused on a lesson the child was not enrolled for (class, dates, weekday); the guard refuses new ones, an enrolment edited afterwards leaves old ones'
  FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id
 WHERE s.status <> 'Canceled' AND a.status IS DISTINCT FROM 'Excused'
   AND NOT EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = a.student_id AND e.class_id = s.class_id
                      AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date)
                      AND (e.allowed_days IS NULL OR cardinality(e.allowed_days) = 0
                           OR EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days)))
UNION ALL
SELECT 'M19', 'held_lesson_without_register', 'report', count(*)::bigint, NULL,
       'past Held lessons (the teacher is paid) with no mark made by a person'
  FROM public.sessions s, params
 WHERE s.status = 'Held' AND s.date < params.today
   AND NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = s.id AND a.marked_by IS NOT NULL)

-- ---------------------------------------------- the cancellation guard (D2)
UNION ALL
SELECT 'M20', 'cancel_without_checked_row', 'must be 0', count(*)::bigint, NULL,
       'lessons that became Canceled after the guard went on with no session_cancel_overrides row of that transaction (a bypass, or the owner in the SQL editor)'
  FROM sess_audit a
 WHERE a.operation = 'UPDATE' AND a.n ->> 'status' = 'Canceled' AND a.o ->> 'status' IS DISTINCT FROM 'Canceled'
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_overrides o
                    WHERE o.session_id::text = a.entity_id AND o.action = 'cancel'
                      AND o.created_at BETWEEN a.occurred_at - interval '2 seconds' AND a.occurred_at + interval '2 seconds')
UNION ALL
SELECT 'M21', 'uncancel_without_checked_row', 'must be 0', count(*)::bigint, NULL,
       'lessons taken out of Canceled after the guard went on with no checked un-cancel'
  FROM sess_audit a
 WHERE a.operation = 'UPDATE' AND a.o ->> 'status' = 'Canceled' AND a.n ->> 'status' IS DISTINCT FROM 'Canceled'
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_overrides o
                    WHERE o.session_id::text = a.entity_id AND o.action = 'uncancel'
                      AND o.created_at BETWEEN a.occurred_at - interval '2 seconds' AND a.occurred_at + interval '2 seconds')
UNION ALL
SELECT 'M22', 'started_lesson_deleted_or_moved_unchecked', 'must be 0', count(*)::bigint, NULL,
       'after the guard: a lesson that was not a future Scheduled one deleted, or a started lesson moved to another date, with no checked row'
  FROM sess_audit a
 WHERE ((a.operation = 'DELETE'
         AND (a.o ->> 'status' IS DISTINCT FROM 'Scheduled' OR (a.o ->> 'date')::date <= a.on_day))
     OR (a.operation = 'UPDATE' AND (a.o ->> 'date') IS DISTINCT FROM (a.n ->> 'date')
         AND (a.o ->> 'date')::date <= a.on_day))
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_overrides o
                    WHERE o.session_id::text = a.entity_id
                      AND o.action = CASE WHEN a.operation = 'DELETE' THEN 'delete' ELSE 'move' END
                      AND o.created_at BETWEEN a.occurred_at - interval '2 seconds' AND a.occurred_at + interval '2 seconds')
UNION ALL
SELECT 'M23', 'cancel_bills_not_refreshed', 'must be 0', count(*)::bigint, NULL,
       'checked cancels / deletes / moves / un-cancels older than 10 minutes whose bills were never refreshed (session_cancel_tuition_pending)'
  FROM public.session_cancel_overrides o
 WHERE o.action IN ('cancel', 'delete', 'uncancel', 'move')
   AND o.created_at < now() - interval '10 minutes'
   AND jsonb_array_length(o.refresh_pairs) > 0
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_override_events e
                    WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed')
UNION ALL
SELECT 'M24', 'cancel_corrections_unreviewed', 'report', count(*)::bigint, NULL,
       'checked lesson changes that need a review and have none yet (session_cancel_review_queue)'
  FROM public.session_cancel_overrides o
 WHERE o.review_required
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_override_events e WHERE e.override_id = o.id AND e.kind = 'reviewed')

-- ------------------------------------------------- the money guard (D4)
UNION ALL
SELECT 'M25', 'money_changes_unreviewed', 'report', count(*)::bigint, NULL,
       'checked money changes that need a review and have none yet'
  FROM public.money_change_overrides o
 WHERE o.review_required
   AND NOT EXISTS (SELECT 1 FROM public.money_change_events e WHERE e.override_id = o.id AND e.kind = 'reviewed')
UNION ALL
SELECT 'M26', 'money_change_bills_not_refreshed', 'must be 0', count(*)::bigint, NULL,
       'checked money changes older than 10 minutes that reach bills and were never refreshed'
  FROM public.money_change_overrides o
 WHERE o.created_at < now() - interval '10 minutes'
   AND jsonb_array_length(o.refresh_pairs) > 0
   AND NOT EXISTS (SELECT 1 FROM public.money_change_events e WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed')
UNION ALL
SELECT 'M27', 'service_retro_marks', 'report', count(*)::bigint, NULL,
       'old billed marks changed by a service-key writer since D4 1b (recorded, not refused; tens means something changes old marks)'
  FROM public.money_change_events e WHERE e.kind = 'service_retro_mark'
UNION ALL
SELECT 'M28', 'automation_refused', 'report',
       ((SELECT count(*) FROM public.money_change_events e WHERE e.kind = 'automation_refused')
      + (SELECT count(*) FROM public.session_cancel_override_events e WHERE e.kind = 'automation_refused'))::bigint, NULL,
       'times the rebuild or a sync wanted to change a started or billed lesson and the guard kept it'

-- --------------------------------------------------------- class fees (D4 step 2)
UNION ALL
SELECT 'M29', 'class_without_fee_baseline', 'must be 0', count(*)::bigint, NULL,
       'classes with no 1900-01-01 baseline row in class_fee_history (the AFTER INSERT trigger writes one)'
  FROM fee_now WHERE NOT has_baseline
UNION ALL
SELECT 'M30', 'class_fee_differs_from_history', 'must be 0', count(*)::bigint,
       coalesce(sum(abs(session_rate_vnd - coalesce(in_force, 0))), 0)::bigint,
       'classes whose session_rate_vnd ("the fee now") is not the class_fee_history row in force today'
  FROM fee_now WHERE in_force IS DISTINCT FROM session_rate_vnd

-- ---------------------------------------------------------- payroll
UNION ALL
SELECT 'M31', 'payroll_written_after_lock', 'must be 0',
       ((SELECT count(*) FROM public.payroll_lines l JOIN locked k ON k.month = l.month WHERE l.created_at > k.locked_at)
      + (SELECT count(*) FROM public.audit_log a JOIN locked k
           ON k.month = substring(coalesce(a.diff -> 'new' ->> 'month', a.diff -> 'old' ->> 'month') FROM 1 FOR 7)
          WHERE a.entity IN ('payroll_lines', 'payroll_summaries') AND a.occurred_at > k.locked_at))::bigint, NULL,
       'payroll lines or summaries of a CLOSED month created or changed after it was closed (refuse_write_to_locked_payroll)'
UNION ALL
SELECT 'M32', 'payroll_line_differs_from_booked_cost', 'must be 0', count(*)::bigint,
       coalesce(sum(abs(l.total_amount_vnd - coalesce(x.amount, 0))), 0)::bigint,
       'lines of a closed month whose booked expenditure (source_key month:teacher|assistant:id) is missing or a different amount'
  FROM public.payroll_lines l JOIN locked k ON k.month = l.month
  LEFT JOIN public.expenditures x
    ON x.source_kind = 'payroll'
   AND x.source_key = l.month || ':' || CASE WHEN l.teacher_id IS NOT NULL THEN 'teacher:' || l.teacher_id::text
                                              ELSE 'assistant:' || l.assistant_id::text END
 WHERE x.id IS NULL OR x.amount <> l.total_amount_vnd
UNION ALL
SELECT 'M33', 'payroll_cost_without_line', 'report', count(*)::bigint, coalesce(sum(x.amount), 0)::bigint,
       'payroll expenditures of a closed month with no payroll line (a person dropped out between two closes keeps a stale line and cost: gap G-7)'
  FROM public.expenditures x JOIN locked k ON x.source_key LIKE k.month || ':%'
 WHERE x.source_kind = 'payroll'
   AND NOT EXISTS (SELECT 1 FROM public.payroll_lines l
                    WHERE l.month = k.month
                      AND x.source_key = l.month || ':' || CASE WHEN l.teacher_id IS NOT NULL THEN 'teacher:' || l.teacher_id::text
                                                                 ELSE 'assistant:' || l.assistant_id::text END)

-- ------------------------------------- overpayment, Settle Bill, past credit
UNION ALL
SELECT 'M34', 'leftover_cash_not_credited', 'must be 0', count(*)::bigint, coalesce(sum(amount), 0)::bigint,
       'old unapplied-cash leftovers with neither a past-leftover-credit marker nor a reversal'
  FROM leftover l
 WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries m WHERE m.tx_key = 'past-leftover-credit-' || l.payment_id)
   AND NOT EXISTS (SELECT 1 FROM public.ledger_entries r WHERE r.tx_key LIKE 'payment-reversal-' || l.payment_id || '-%')
UNION ALL
SELECT 'M35', 'past_credit_half_done', 'must be 0', count(*)::bigint, NULL,
       'past-leftover-credit markers without their reclass, or reclass rows without their marker'
  FROM (SELECT substring(e.tx_key FROM '^past-leftover-credit-([0-9a-fA-F-]{36})') AS pid,
               bool_or(e.tx_key LIKE '%-reclass') AS has_reclass,
               bool_or(e.tx_key NOT LIKE '%-reclass') AS has_marker
          FROM public.ledger_entries e
         WHERE e.tx_key LIKE 'past-leftover-credit-%'
         GROUP BY 1) p
 WHERE NOT (has_reclass AND has_marker)
UNION ALL
SELECT 'M36', 'settlements_after_removal', 'must be 0', count(*)::bigint, coalesce(sum(s.amount), 0)::bigint,
       'settlements (write-offs, voluntary contributions) made on or after 16 Nov, when both were removed'
  FROM public.settlements s, params WHERE s.created_at >= params.settle_removed
UNION ALL
SELECT 'M37', 'counted_writeoffs', 'must be 0', count(*)::bigint, coalesce(sum(e.debit), 0)::bigint,
       'ledger legs keyed settlement-writeoff- (the only write-off a calculator counts as a discount; none was ever made)'
  FROM public.ledger_entries e WHERE e.tx_key LIKE 'settlement-writeoff-%'

-- -------------------------------------------- history the guards remember
UNION ALL
SELECT 'M38', 'bills_lowered_from_floor', 'report', count(*)::bigint,
       coalesce(sum(f.max_recorded_payment - coalesce(i.recorded_payment, 0)), 0)::bigint,
       'bills whose recorded payment is now below the highest ever recorded on them (invoice_state_floor), or that are gone'
  FROM public.invoice_state_floor f
  LEFT JOIN public.invoices i ON i.student_id = f.student_id AND i.month = f.month
 WHERE f.max_recorded_payment > coalesce(i.recorded_payment, 0)
UNION ALL
SELECT 'M39', 'finance_snapshot_differs_from_bill', 'report', count(*)::bigint,
       coalesce(sum(abs(coalesce(i.total_amount, 0) - m.total_amount) + abs(coalesce(i.recorded_payment, 0) - m.recorded_payment)), 0)::bigint,
       'current closed-month finance snapshots whose total or recorded payment differ from the bill now (the month moved after it was closed)'
  FROM public.monthly_finance_snapshots m
  LEFT JOIN public.invoices i ON i.student_id = m.student_id AND i.month = m.month
 WHERE m.superseded_at IS NULL
   AND (coalesce(i.total_amount, 0) <> m.total_amount OR coalesce(i.recorded_payment, 0) <> m.recorded_payment)
UNION ALL
SELECT 'M40', 'guard_installed', 'report', (SELECT count(*) FROM params WHERE guard_on IS NOT NULL)::bigint, NULL,
       '1 when the D2 guard_installed event exists (M20-M22 read nothing before it; 0 means they checked nothing)'

-- -------------------------- history explained on live (fix round 1), reported
UNION ALL
SELECT 'M41', 'ledger_unbalanced_before_keys', 'report', count(*)::bigint, coalesce(sum(abs(d)), 0)::bigint,
       'unbalanced ledger transactions wholly from before the first keyed ledger write (3 / 920,000 on live: single-leg AR credits of Oct 2025); M01 counts every other one'
  FROM unbalanced WHERE before_keys
UNION ALL
SELECT 'M42', 'frozen_bill_restored_to_pre_wipe_total', 'report', count(*)::bigint,
       coalesce(sum((n ->> 'total_amount')::numeric), 0)::bigint,
       'frozen bills put back to the total they had before the 28 Oct wipe, with no actor, on 9 Nov (Hanoi): the owner''s July restore (1 / 1,620,000 on live); exempt from M13 / M14'
  FROM frozen_moves WHERE is_restore

) checks
ORDER BY check_id;
