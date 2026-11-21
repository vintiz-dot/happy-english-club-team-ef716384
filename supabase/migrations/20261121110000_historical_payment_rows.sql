-- Tuition audit, phase 3 (docs/TUITION_AUDIT_ROLLOUT.md): put a payments row
-- behind every recorded dong from before the 17 Nov 2026 payment path,
-- WITHOUT CHANGING ANY MONEY.
--
-- From Oct 2025 to 16 Nov 2026 most payments were typed straight onto
-- invoices.recorded_payment with no payments row behind them (14 rows ever).
-- Since 17 Nov every payment goes through public.record_admin_payment
-- (20261117121000), which writes the row, both ledger legs and the bill
-- together. This migration covers the gap left by the old path.
--
-- WHAT IT ADDS
--   payments.source  text NOT NULL DEFAULT 'receipt', 'receipt' | 'historical'.
--       'receipt'    money received, as every row so far (the default, so every
--                    existing writer is unchanged).
--       'historical' an OPENING BALANCE: an amount that was already on the bill
--                    when the backfill ran, with no receipt behind it. It is
--                    not a receipt and must never be counted as cash received
--                    on top of the bill: the bill already holds it.
--   payments.month   text, YYYY-MM. Set for historical rows only (the bill
--       they stand behind) and NULL on receipts. A receipt's bill is found
--       from its ledger legs, as delete-payment does.
--   A historical row is shaped by CHECK: method 'historical' (and only a
--   historical row may carry that method), amount > 0, no family or parent
--   payment, occurred_at = the 1st of its month, 00:00 Hanoi time.
--   ONE historical row per child-month (a unique index used only as a guard,
--   never as an ON CONFLICT target).
--
--   public.payment_bill_amounts (view, security_invoker): what each payments
--       row put on each bill - (payment_id, source, student_id, month, amount).
--       A historical row: its own student, month and amount. A receipt: the AR
--       legs of its allocation ledger transactions, credit - debit, per child
--       and month - exactly the rule delete-payment's keyKind uses to find the
--       bills a payment is on (record-payment-, smart-family-, family-payment-,
--       payment-, past-leftover-credit-<id>; leftover/credit keys are not on a
--       bill). Phase 2 nets its corrections against this view.
--
--   public.admin_backfill_historical_payments(p_dry_run boolean DEFAULT true)
--       For every bill whose recorded_payment is above what its payment rows
--       explain (sum of payment_bill_amounts for that child and month), it
--       inserts ONE historical row for the difference, dated the bill's month,
--       memo naming the audit. It writes NO ledger legs and does not touch
--       invoices (a SHARE lock while it reads, so no bill moves under it;
--       no row is updated). Bills it does NOT write, and lists:
--         refused      payment rows already explain MORE than the bill
--                      records (needs a person: phase 2);
--         still_short  a historical row exists but the bill has grown past
--                      what is explained (cannot happen once phase 1's guard
--                      is on; never a second historical row).
--       Re-running inserts nothing. The dry run (the default) inserts nothing
--       and returns the per-month totals it would insert.
--       Admin-only: a signed-in admin, or a session with no JWT at all (the
--       owner in the SQL editor). EXECUTE for authenticated only.
--
--   A guard trigger on payments: a historical row is inserted only by the
--   backfill (a transaction-local flag only that function sets), can never
--   become a receipt or the other way round, and cannot be updated or
--   deleted through the API - service_role included, so delete-payment
--   cannot take one. Only the owner's SQL editor (no JWT) can remove them.
--
-- WHAT IT DOES NOT TOUCH: invoices, ledger_entries, ledger_accounts, carry
-- balances. The only triggers an insert into payments fires on live (read 21
-- Nov 2026) are audit_payments (audit_row_change: one audit_log row) and this
-- guard; prevent_client_payment_deletion is BEFORE DELETE only.
--
-- HOW READERS TREAT HISTORICAL ROWS (each reader of payments, 21 Nov 2026):
--   delete-payment       refuses one (409) before reading anything else; the
--                        guard trigger refuses it as well.
--   student-audit        lists one as an "adjustment" (opening balance), not as
--                        a payment, so the Account Statement's "Payments
--                        received" never prints it, and the audit_log bump it
--                        stands behind is not counted twice; its scalarPayments
--                        caveat counts receipts only. Paid figures come from
--                        the bills, unchanged.
--   record_admin_payment, ai_action_apply/undo, ai_student_activity, the
--   student-delete guard, family-payment, smart-family-payment, FamilyPayment
--   EditModal, PaymentIntegrityRepair, CHECK-money-invariants.sql: look a row
--   up by id, by family or by key, or only ask whether one exists; a
--   historical row has no family, no key and no legs, and counting it as
--   "this child has money history" is right. useEarliestFinanceMonth: its
--   month is a real bill month. The chat assistant, the finance dashboard,
--   statements and calculate-tuition read bills and the ledger, not payments.
--
-- Rollback (owner, SQL editor; changes no money):
--   DELETE FROM public.payments WHERE source = 'historical';
--   DROP FUNCTION public.admin_backfill_historical_payments(boolean);
--   DROP VIEW public.payment_bill_amounts;
--   DROP TRIGGER payments_historical_guard ON public.payments;
--   DROP FUNCTION public.payments_historical_guard();
--   ALTER TABLE public.payments DROP COLUMN month, DROP COLUMN source;
--
-- Fails closed: refuses to install (nothing changed) if a table, column or
-- function it needs is missing, or if a payments row already carries the
-- method 'historical'.

DO $preflight$
DECLARE
  missing text[] := '{}';
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('payments', 'id'), ('payments', 'student_id'), ('payments', 'amount'), ('payments', 'method'),
      ('payments', 'occurred_at'), ('payments', 'memo'), ('payments', 'created_by'),
      ('payments', 'family_id'), ('payments', 'parent_payment_id'),
      ('ledger_accounts', 'id'), ('ledger_accounts', 'student_id'), ('ledger_accounts', 'code'),
      ('ledger_entries', 'tx_id'), ('ledger_entries', 'tx_key'), ('ledger_entries', 'account_id'),
      ('ledger_entries', 'debit'), ('ledger_entries', 'credit'), ('ledger_entries', 'month'),
      ('invoices', 'id'), ('invoices', 'student_id'), ('invoices', 'month'), ('invoices', 'recorded_payment'),
      ('audit_log', 'entity'), ('audit_log', 'entity_id'), ('audit_log', 'action'), ('audit_log', 'actor_user_id'), ('audit_log', 'diff')
    ) AS v(t, c)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || r.t) AND a.attname = r.c AND a.attnum > 0 AND NOT a.attisdropped) THEN
      missing := missing || (r.t || '.' || r.c);
    END IF;
  END LOOP;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'historical payments: missing column(s) %. Nothing was changed.', array_to_string(missing, ', ');
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.role()') IS NULL THEN
    RAISE EXCEPTION 'historical payments: has_role, auth.uid or auth.role is missing. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = 'public.payments'::regclass
              AND a.attname IN ('source', 'month') AND NOT a.attisdropped) THEN
    RAISE EXCEPTION 'historical payments: payments already has a source or month column. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments p WHERE lower(btrim(p.method)) = 'historical') THEN
    RAISE EXCEPTION 'historical payments: a payment already uses the method "historical". Nothing was changed.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.payments', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.invoices', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'public.ledger_entries', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.audit_log', 'INSERT') THEN
    RAISE EXCEPTION 'historical payments: authenticated lacks a table right the backfill runs with. Nothing was changed.';
  END IF;
END
$preflight$;

-- ------------------------------------------------------------ the marker
ALTER TABLE public.payments
  ADD COLUMN source text NOT NULL DEFAULT 'receipt',
  ADD COLUMN month text;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_source_known CHECK (source IN ('receipt', 'historical')),
  ADD CONSTRAINT payments_historical_shape CHECK (
    CASE WHEN source = 'historical' THEN
           month IS NOT NULL AND month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
       AND method = 'historical'
       AND amount > 0
       AND family_id IS NULL AND parent_payment_id IS NULL
       AND occurred_at = ((month || '-01')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
    ELSE month IS NULL AND lower(btrim(method)) <> 'historical'
    END);

CREATE UNIQUE INDEX payments_historical_one_per_bill
  ON public.payments (student_id, month) WHERE source = 'historical';

COMMENT ON COLUMN public.payments.source IS
  'receipt (money received; the default) or historical (an opening balance: an amount already on the bill before 17 Nov 2026 with no receipt behind it, written once by admin_backfill_historical_payments - never cash received on top of the bill). 20261121110000.';
COMMENT ON COLUMN public.payments.month IS
  'YYYY-MM of the bill a historical row stands behind; NULL on receipts (their bill is in their ledger legs - see payment_bill_amounts). 20261121110000.';

-- ------------------------------------------------------------- the guard
CREATE OR REPLACE FUNCTION public.payments_historical_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_no_jwt boolean := coalesce(auth.role(), '') = '';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.source = 'historical' AND coalesce(current_setting('hec.historical_backfill', true), '') <> 'on' THEN
      RAISE EXCEPTION 'A historical payment row is written only by admin_backfill_historical_payments. Nothing was recorded.'
        USING ERRCODE = 'HP403';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.source IS DISTINCT FROM OLD.source THEN
      RAISE EXCEPTION 'A payment cannot change between receipt and historical. Nothing was changed.' USING ERRCODE = 'HP403';
    END IF;
    IF OLD.source = 'historical' AND NOT v_no_jwt THEN
      RAISE EXCEPTION 'A historical payment row (an opening balance from the tuition audit) cannot be edited. Nothing was changed.'
        USING ERRCODE = 'HP403';
    END IF;
    RETURN NEW;
  END IF;
  -- DELETE
  IF OLD.source = 'historical' AND NOT v_no_jwt THEN
    RAISE EXCEPTION 'A historical payment row (an opening balance from the tuition audit) cannot be deleted: it is not a receipt, and the money on its bill stays. Nothing was changed.'
      USING ERRCODE = 'HP403';
  END IF;
  RETURN OLD;
END
$function$;

CREATE TRIGGER payments_historical_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_historical_guard();

-- ---------------------------------------- what each row put on each bill
CREATE OR REPLACE VIEW public.payment_bill_amounts
WITH (security_invoker = true) AS
SELECT p.id AS payment_id, p.source, p.student_id, p.month, p.amount::bigint AS amount
  FROM public.payments p
 WHERE p.source = 'historical'
UNION ALL
SELECT t.payment_id, 'receipt'::text, a.student_id, e.month, sum(e.credit - e.debit)::bigint
  FROM (SELECT DISTINCT p.id AS payment_id, k.tx_id
          FROM public.payments p
          JOIN public.ledger_entries k ON k.tx_key IS NOT NULL AND (
                k.tx_key = 'past-leftover-credit-' || p.id::text
             OR k.tx_key IN ('payment-' || p.id::text, 'family-payment-' || p.id::text,
                             'smart-family-' || p.id::text, 'record-payment-' || p.id::text)
             OR starts_with(k.tx_key, 'payment-' || p.id::text || '-')
             OR starts_with(k.tx_key, 'family-payment-' || p.id::text || '-')
             OR starts_with(k.tx_key, 'smart-family-' || p.id::text || '-')
             OR starts_with(k.tx_key, 'record-payment-' || p.id::text || '-'))
         WHERE p.source = 'receipt') t
  JOIN public.ledger_entries e ON e.tx_id = t.tx_id
  JOIN public.ledger_accounts a ON a.id = e.account_id AND a.code::text = 'AR'
 WHERE e.month IS NOT NULL
 GROUP BY t.payment_id, a.student_id, e.month;

COMMENT ON VIEW public.payment_bill_amounts IS
  'What each payments row put on each bill (student, month): a historical row its own amount; a receipt the AR legs (credit - debit) of its allocation ledger transactions, by delete-payment''s keyKind rule. Sum it per child-month to compare with invoices.recorded_payment. 20261121110000.';

REVOKE ALL ON public.payment_bill_amounts FROM PUBLIC, anon;
GRANT SELECT ON public.payment_bill_amounts TO authenticated;
GRANT ALL ON public.payment_bill_amounts TO service_role;

-- --------------------------------------------------------- the backfill
CREATE OR REPLACE FUNCTION public.admin_backfill_historical_payments(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor  uuid := auth.uid();
  v_dry    boolean := coalesce(p_dry_run, true);
  v_memo   constant text := 'Opening balance (tuition audit 16 Nov 2026, phase 3): already recorded on this bill before the 17 Nov 2026 payment path, with no payment row behind it. Not a receipt; no ledger legs.';
  v_months jsonb;
  v_refused jsonb;
  v_short  jsonb;
  v_count  integer;
  v_total  bigint;
  v_recorded bigint;
  v_explained bigint;
  v_inserted integer := 0;
  v_bills  jsonb;
BEGIN
  IF NOT (coalesce(auth.role(), '') = '' OR (v_actor IS NOT NULL AND public.has_role(v_actor, 'admin'))) THEN
    RAISE EXCEPTION 'Only a signed-in admin (or the owner in the SQL editor) can run the historical payments backfill. Nothing was changed.'
      USING ERRCODE = 'HP403';
  END IF;

  -- No bill moves while this reads and writes (record_admin_payment and every
  -- other writer wait at their UPDATE of invoices). Nothing in invoices is
  -- written: SHARE mode takes no row and fires no trigger.
  LOCK TABLE public.invoices IN SHARE MODE;

  -- Every bill, with what its payment rows explain, read once.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'invoice_id', i.id, 'student_id', i.student_id, 'month', i.month,
           'recorded', coalesce(i.recorded_payment, 0)::bigint,
           'explained', coalesce((SELECT sum(b.amount) FROM public.payment_bill_amounts b
                                   WHERE b.student_id = i.student_id AND b.month = i.month), 0)::bigint,
           'has_historical', EXISTS (SELECT 1 FROM public.payments p
                                      WHERE p.source = 'historical' AND p.student_id = i.student_id AND p.month = i.month))), '[]'::jsonb)
    INTO v_bills
    FROM public.invoices i;

  SELECT coalesce(sum(recorded), 0), coalesce(sum(explained), 0) INTO v_recorded, v_explained FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean);

  SELECT count(*), coalesce(sum(recorded - explained), 0) INTO v_count, v_total
    FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE recorded > explained AND NOT has_historical;

  SELECT coalesce(jsonb_agg(jsonb_build_object('month', month, 'bills', n, 'amount', amt) ORDER BY month), '[]'::jsonb)
    INTO v_months
    FROM (SELECT month, count(*) AS n, sum(recorded - explained) AS amt
            FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE recorded > explained AND NOT has_historical GROUP BY month) m;

  SELECT coalesce(jsonb_agg(jsonb_build_object('invoice_id', invoice_id, 'student_id', student_id, 'month', month,
                                               'recorded', recorded, 'explained', explained, 'over_by', explained - recorded)
                            ORDER BY month, invoice_id), '[]'::jsonb)
    INTO v_refused FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE explained > recorded;

  SELECT coalesce(jsonb_agg(jsonb_build_object('invoice_id', invoice_id, 'student_id', student_id, 'month', month,
                                               'recorded', recorded, 'explained', explained, 'short_by', recorded - explained)
                            ORDER BY month, invoice_id), '[]'::jsonb)
    INTO v_short FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE recorded > explained AND has_historical;

  IF NOT v_dry AND v_count > 0 THEN
    PERFORM set_config('hec.historical_backfill', 'on', true);
    INSERT INTO public.payments (student_id, amount, method, occurred_at, memo, created_by, source, month)
    SELECT b.student_id, (b.recorded - b.explained)::integer, 'historical',
           ((b.month || '-01')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'), v_memo, v_actor, 'historical', b.month
      FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean)
     WHERE b.recorded > b.explained AND NOT b.has_historical
     ORDER BY b.month, b.student_id;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    PERFORM set_config('hec.historical_backfill', 'off', true);

    INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
    VALUES ('payments', 'historical-backfill', 'historical_payment_backfill', v_actor,
            jsonb_build_object('rows', v_inserted, 'amount', v_total, 'months', v_months,
                               'refused', jsonb_array_length(v_refused), 'still_short', jsonb_array_length(v_short),
                               'via', 'admin_backfill_historical_payments'));
  END IF;

  RETURN jsonb_build_object(
    'dry_run', v_dry,
    'would_insert', jsonb_build_object('rows', v_count, 'amount', v_total),
    'inserted', jsonb_build_object('rows', v_inserted, 'amount', CASE WHEN v_inserted > 0 THEN v_total ELSE 0 END),
    'months', v_months,
    'refused', v_refused,
    'still_short', v_short,
    'tie', jsonb_build_object('recorded_total', v_recorded, 'explained_before', v_explained,
                              'refused_over_by', (SELECT coalesce(sum(explained - recorded), 0) FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE explained > recorded),
                              'still_short_by', (SELECT coalesce(sum(recorded - explained), 0) FROM jsonb_to_recordset(v_bills) AS b(invoice_id uuid, student_id uuid, month text, recorded bigint, explained bigint, has_historical boolean) WHERE recorded > explained AND has_historical)));
END
$function$;

REVOKE ALL ON FUNCTION public.admin_backfill_historical_payments(boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_backfill_historical_payments(boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_backfill_historical_payments(boolean) IS
  'Tuition audit phase 3 (20261121110000): one historical payments row per bill for the part of recorded_payment no payment row explains (payment_bill_amounts). No ledger legs, no invoice write. Dry run by default; idempotent; bills already over-explained are refused and listed. Admin or SQL editor only.';
