-- D5 G-1 fix round 1 (review B-1 + M-3): an admin's payment or correction is
-- ONE transaction - docs/evidence/G1-record-payment.md, "Fix round 1".
--
-- public.record_admin_payment does the three writes record-payment used to
-- make as three PostgREST calls:
--
--   1. the payments row (id = the screen's idempotency key; a correction is a
--      negative amount);
--   2. both ledger legs in one INSERT on one tx_id, the cash leg keyed
--      record-payment-<payment_id>-<student_id> (delete-payment's keyKind
--      knows it), the AR leg unkeyed - payment: DR CASH|BANK / CR AR,
--      correction: DR AR / CR CASH|BANK - both on the CONFIRMED month and
--      dated by the receipt;
--   3. invoices.recorded_payment on the bill, which is read FOR UPDATE first
--      and written only WHERE it still holds the value read (compare-and-set
--      under the row lock), never below 0; paid_amount moved with it; the
--      label by public.invoice_paid_label over the month's payable (charge +
--      carry-in debt - carry-in credit), an admin's 'credit' kept - the rule of
--      labelAfterPayment in _lib/invoice-status.ts;
--
-- plus the audit row (record_payment / payment_correction). Any failure
-- anywhere - a refusal below, a trigger, a constraint, a timeout - rolls back
-- ALL of it. There is no undo path and nothing is deleted: the old function's
-- undo had to DELETE the payments row through the admin's client, which live's
-- prevent_client_payment_deletion trigger (20251024152825) refuses, leaving a
-- payment on no bill (review B-1); and a reply lost between two of the three
-- calls left money on one record and not the others (review M-3).
--
-- WHO. SECURITY INVOKER: it runs as the caller, so row security stays the
-- caller's and the D4 money triggers see a person. It checks
-- has_role(auth.uid(), 'admin') itself first (a non-admin is refused before
-- anything is read), and the admin's FOR ALL policies on payments,
-- ledger_accounts, ledger_entries, invoices and students and the INSERT
-- policy on audit_log are what let the writes through (checked on live,
-- read-only, 17 Nov). DEFINER was not needed, so it is not used: invoker
-- cannot write anything the admin could not already write through PostgREST.
-- EXECUTE: authenticated only (revoked from PUBLIC, anon and service_role -
-- the service key has no admin behind it, and auth.uid() would be null).
--
-- REFUSALS (SQLSTATE -> what record-payment answers):
--   RP403 not a signed-in admin                     -> 403
--   RP404 no such student                           -> 404
--   RP409 the key already has a payments row        -> 409 duplicate
--   RP410 the key's ledger leg exists (deleted since) -> 409
--   RP412 the bill no longer holds p_expected_recorded -> 409 conflict
--   RP422 a correction would take the bill below 0  -> 409
--   RP424 no bill for that child and month          -> 409
--   22023 a value out of range                      -> 400
--
-- Two requests with one key: the second finds the payments row (after the
-- bill's lock, so even one that waited behind the first sees it) or meets the
-- primary key (23505, reported as RP409). Two keys on one bill at once: the
-- second waits on the bill's row lock and then reads what the first wrote.
--
-- Fails closed: refuses to install (nothing changed) if a table, column,
-- function, enum label, unique index or table grant it needs is missing, or
-- if another record_admin_payment signature exists.
-- Rollback: DROP FUNCTION public.record_admin_payment(uuid, uuid, text, text,
-- integer, text, timestamptz, text, integer); record-payment then answers
-- 500 "nothing was recorded" (PostgREST: function not found) until redeployed.

DO $preflight$
DECLARE
  missing text[] := '{}';
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('students', 'id'), ('students', 'full_name'),
      ('payments', 'id'), ('payments', 'student_id'), ('payments', 'amount'), ('payments', 'method'),
      ('payments', 'occurred_at'), ('payments', 'memo'), ('payments', 'created_by'),
      ('ledger_accounts', 'id'), ('ledger_accounts', 'student_id'), ('ledger_accounts', 'code'),
      ('ledger_entries', 'id'), ('ledger_entries', 'tx_id'), ('ledger_entries', 'tx_key'), ('ledger_entries', 'account_id'),
      ('ledger_entries', 'debit'), ('ledger_entries', 'credit'), ('ledger_entries', 'occurred_at'), ('ledger_entries', 'memo'),
      ('ledger_entries', 'month'), ('ledger_entries', 'created_by'),
      ('invoices', 'id'), ('invoices', 'student_id'), ('invoices', 'month'), ('invoices', 'recorded_payment'),
      ('invoices', 'paid_amount'), ('invoices', 'base_amount'), ('invoices', 'total_amount'), ('invoices', 'carry_in_debt'),
      ('invoices', 'carry_in_credit'), ('invoices', 'status'), ('invoices', 'updated_at'), ('invoices', 'updated_by'),
      ('audit_log', 'entity'), ('audit_log', 'entity_id'), ('audit_log', 'action'), ('audit_log', 'actor_user_id'), ('audit_log', 'diff')
    ) AS v(t, c)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || r.t) AND a.attname = r.c AND a.attnum > 0 AND NOT a.attisdropped) THEN
      missing := missing || (r.t || '.' || r.c);
    END IF;
  END LOOP;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'G-1: missing column(s) %. Nothing was changed.', array_to_string(missing, ', ');
  END IF;

  IF to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'G-1: public.invoice_paid_label is not installed (20261113090000). Nothing was changed.';
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'G-1: public.has_role(uuid, app_role) is missing. Nothing was changed.';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'G-1: auth.uid() is missing. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = 'record_admin_payment'
                AND pg_get_function_identity_arguments(p.oid) <>
                    'p_payment_id uuid, p_student_id uuid, p_month text, p_kind text, p_amount integer, p_method text, p_occurred_at timestamp with time zone, p_memo text, p_expected_recorded integer') THEN
    RAISE EXCEPTION 'G-1: another public.record_admin_payment signature exists (PostgREST would not know which to call). Nothing was changed.';
  END IF;

  IF (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
       WHERE a.attrelid = 'public.invoices'::regclass AND a.attname = 'status' AND NOT a.attisdropped) IS DISTINCT FROM 'invoice_status' THEN
    RAISE EXCEPTION 'G-1: invoices.status is not the invoice_status enum. Nothing was changed.';
  END IF;
  IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'invoice_status' AND e.enumlabel IN ('issued', 'partial', 'paid', 'credit')) <> 4 THEN
    RAISE EXCEPTION 'G-1: invoice_status lacks issued / partial / paid / credit. Nothing was changed.';
  END IF;
  IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'account_code' AND e.enumlabel IN ('AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT')) <> 5 THEN
    RAISE EXCEPTION 'G-1: account_code lacks AR / CASH / BANK / REVENUE / CREDIT. Nothing was changed.';
  END IF;

  -- The conflict targets and keys it relies on: plain (not partial) unique indexes.
  FOR r IN SELECT * FROM (VALUES
      ('ledger_accounts', ARRAY['code', 'student_id']),
      ('ledger_entries', ARRAY['tx_key']),
      ('invoices', ARRAY['month', 'student_id']),
      ('payments', ARRAY['id'])
    ) AS v(t, cols)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
       WHERE i.indrelid = ('public.' || r.t)::regclass AND i.indisunique AND i.indpred IS NULL
         AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text) FROM pg_attribute a
               WHERE a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)) = r.cols) THEN
      RAISE EXCEPTION 'G-1: no plain unique index on %(%). Nothing was changed.', r.t, array_to_string(r.cols, ', ');
    END IF;
  END LOOP;

  -- Invoker: the caller's role must hold the table rights (20260712023825 revoked the defaults).
  FOR r IN SELECT * FROM (VALUES
      ('students', 'SELECT'), ('payments', 'SELECT'), ('payments', 'INSERT'),
      ('ledger_accounts', 'SELECT'), ('ledger_accounts', 'INSERT'), ('ledger_entries', 'SELECT'), ('ledger_entries', 'INSERT'),
      ('invoices', 'SELECT'), ('invoices', 'UPDATE'), ('audit_log', 'INSERT')
    ) AS v(t, priv)
  LOOP
    IF NOT has_table_privilege('authenticated', 'public.' || r.t, r.priv) THEN
      RAISE EXCEPTION 'G-1: authenticated lacks % on public.%. Nothing was changed.', r.priv, r.t;
    END IF;
  END LOOP;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.record_admin_payment(
  p_payment_id uuid,
  p_student_id uuid,
  p_month text,
  p_kind text,
  p_amount integer,
  p_method text,
  p_occurred_at timestamptz,
  p_memo text DEFAULT NULL,
  p_expected_recorded integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor   uuid := auth.uid();
  v_method  text := btrim(coalesce(p_method, ''));
  v_memo    text := nullif(btrim(coalesce(p_memo, '')), '');
  v_student record;
  v_bill    record;
  v_delta   integer;
  v_before  bigint;
  v_after   bigint;
  v_code    text;
  v_cash    uuid;
  v_ar      uuid;
  v_tx      uuid := gen_random_uuid();
  v_label   public.invoice_status;
  v_leg_memo text;
  v_rows    integer;
BEGIN
  -- Who: a signed-in admin, before anything is read.
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only a signed-in admin can record a payment. Nothing was recorded.' USING ERRCODE = 'RP403';
  END IF;

  -- What: the same bounds record-payment's input check states.
  IF p_payment_id IS NULL OR p_student_id IS NULL OR p_occurred_at IS NULL THEN
    RAISE EXCEPTION 'The payment key, the student and the receipt date are required. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_month IS NULL OR p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'The month must be YYYY-MM. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('payment', 'correction') THEN
    RAISE EXCEPTION 'The kind must be payment or correction. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 500000000 THEN
    RAISE EXCEPTION 'The amount must be a whole number of dong from 1 to 500,000,000. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF v_method = '' OR length(v_method) > 50 THEN
    RAISE EXCEPTION 'The method is required (at most 50 characters). Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_memo, '')) > 500 THEN
    RAISE EXCEPTION 'The note is at most 500 characters. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'correction' AND v_memo IS NULL THEN
    RAISE EXCEPTION 'A correction needs a note saying why. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_expected_recorded IS NOT NULL AND p_expected_recorded < 0 THEN
    RAISE EXCEPTION 'The expected recorded payment cannot be below 0. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  v_delta := CASE WHEN p_kind = 'correction' THEN -p_amount ELSE p_amount END;

  SELECT s.id, s.full_name INTO v_student FROM public.students s WHERE s.id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found. Nothing was recorded.' USING ERRCODE = 'RP404';
  END IF;

  -- Not twice (first look, before waiting on the bill).
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.id = p_payment_id) THEN
    RAISE EXCEPTION 'This payment was already submitted (a second click or a retry). Nothing more was recorded: reload to see it.' USING ERRCODE = 'RP409';
  END IF;

  -- The bill, locked: one writer of this bill at a time, until this commits.
  SELECT i.* INTO v_bill FROM public.invoices i
   WHERE i.student_id = p_student_id AND i.month = p_month
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'There is no % bill for %, so nothing can be recorded on it. Nothing was recorded.', p_month, v_student.full_name USING ERRCODE = 'RP424';
  END IF;

  -- Not twice (again, after the lock: a request with this key that was
  -- ahead of this one has committed by now and is visible).
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.id = p_payment_id) THEN
    RAISE EXCEPTION 'This payment was already submitted (a second click or a retry). Nothing more was recorded: reload to see it.' USING ERRCODE = 'RP409';
  END IF;
  -- A key whose payment was recorded and has since been deleted (delete-payment
  -- removes the row; its ledger leg stays, append-only): never pay it again.
  IF EXISTS (SELECT 1 FROM public.ledger_entries e WHERE e.tx_key LIKE 'record-payment-' || p_payment_id::text || '-%') THEN
    RAISE EXCEPTION 'This request was recorded before and has since been deleted or reversed. Nothing was recorded: reload and enter the payment again.' USING ERRCODE = 'RP410';
  END IF;

  v_before := coalesce(v_bill.recorded_payment, 0);
  IF p_expected_recorded IS NOT NULL AND v_before <> p_expected_recorded THEN
    RAISE EXCEPTION 'This bill changed since the screen was loaded (another payment or correction was saved). Nothing was recorded: reload, check the bill and enter it again.' USING ERRCODE = 'RP412';
  END IF;
  IF v_before + v_delta < 0 THEN
    RAISE EXCEPTION 'The % bill records %; a correction of % would take it below 0. Nothing was recorded.', p_month, v_before, p_amount USING ERRCODE = 'RP422';
  END IF;
  v_after := v_before + v_delta;

  -- The child's ledger accounts (the five the family paths create).
  INSERT INTO public.ledger_accounts (student_id, code)
  SELECT p_student_id, c::public.account_code FROM unnest(ARRAY['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT']) AS c
  ON CONFLICT (student_id, code) DO NOTHING;
  -- 'Cash' / 'cash' / ' CASH ' -> CASH; every other method -> BANK (cashAccountCode).
  v_code := CASE WHEN lower(v_method) = 'cash' THEN 'CASH' ELSE 'BANK' END;
  SELECT a.id INTO v_cash FROM public.ledger_accounts a WHERE a.student_id = p_student_id AND a.code::text = v_code;
  SELECT a.id INTO v_ar   FROM public.ledger_accounts a WHERE a.student_id = p_student_id AND a.code::text = 'AR';
  IF v_cash IS NULL OR v_ar IS NULL THEN
    RAISE EXCEPTION '%''s ledger accounts could not be read. Nothing was recorded.', v_student.full_name;
  END IF;

  -- 1. The payments row.
  BEGIN
    INSERT INTO public.payments (id, student_id, amount, method, occurred_at, memo, created_by)
    VALUES (p_payment_id, p_student_id, v_delta, v_method, p_occurred_at,
            coalesce(v_memo, CASE WHEN p_kind = 'correction' THEN 'Correction' ELSE 'Payment for ' || p_month END),
            v_actor);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This payment was already submitted (a second click or a retry). Nothing more was recorded: reload to see it.' USING ERRCODE = 'RP409';
  END;

  -- 2. Both legs, one insert, one transaction id.
  v_leg_memo := CASE WHEN p_kind = 'correction' THEN 'Payment correction' ELSE 'Payment' END
                || ' (record-payment)' || coalesce(': ' || v_memo, '');
  INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month, created_by)
  VALUES
    (v_tx, 'record-payment-' || p_payment_id::text || '-' || p_student_id::text, v_cash,
     CASE WHEN p_kind = 'payment' THEN p_amount ELSE 0 END, CASE WHEN p_kind = 'payment' THEN 0 ELSE p_amount END,
     p_occurred_at, v_leg_memo, p_month, v_actor),
    (v_tx, NULL, v_ar,
     CASE WHEN p_kind = 'payment' THEN 0 ELSE p_amount END, CASE WHEN p_kind = 'payment' THEN p_amount ELSE 0 END,
     p_occurred_at, v_leg_memo, p_month, v_actor);

  -- 3. The bill: compare-and-set under the row lock. The label is the one
  -- rule (invoice_paid_label over the month's payable); 'credit' is kept.
  v_label := CASE WHEN v_bill.status::text = 'credit' THEN NULL
                  ELSE public.invoice_paid_label(
                         v_after,
                         coalesce(v_bill.total_amount, 0)::bigint + coalesce(v_bill.carry_in_debt, 0) - coalesce(v_bill.carry_in_credit, 0),
                         coalesce(v_bill.base_amount, 0)::bigint,
                         coalesce(v_bill.total_amount, 0)::bigint) END;
  UPDATE public.invoices i
     SET recorded_payment = v_after,
         paid_amount = greatest(0, coalesce(i.paid_amount, 0) + v_delta),
         status = coalesce(v_label, i.status),
         updated_at = now(),
         updated_by = v_actor
   WHERE i.id = v_bill.id AND coalesce(i.recorded_payment, 0) = v_before;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'This bill changed while the payment was being recorded. Nothing was recorded: reload and enter it again.' USING ERRCODE = 'RP412';
  END IF;

  -- The audit row, in the same transaction.
  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('invoice', v_bill.id::text, CASE WHEN p_kind = 'correction' THEN 'payment_correction' ELSE 'record_payment' END, v_actor,
          jsonb_build_object(
            'student_id', p_student_id, 'month', p_month, 'payment_id', p_payment_id, 'ledger_tx_id', v_tx,
            'method', v_method, 'ledger_account', v_code, 'previous_recorded_payment', v_before,
            'payment_amount', v_delta, 'new_recorded_payment', v_after, 'payment_date', p_occurred_at,
            'memo', v_memo, 'type', p_kind, 'via', 'record-payment'));

  RETURN jsonb_build_object(
    'success', true, 'paymentId', p_payment_id, 'ledgerTxId', v_tx, 'invoiceId', v_bill.id,
    'studentId', p_student_id, 'month', p_month, 'kind', p_kind, 'amount', v_delta,
    'ledgerAccount', v_code, 'recordedBefore', v_before, 'recordedAfter', v_after,
    'status', coalesce(v_label::text, v_bill.status::text));
END
$function$;

REVOKE ALL ON FUNCTION public.record_admin_payment(uuid, uuid, text, text, integer, text, timestamptz, text, integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.record_admin_payment(uuid, uuid, text, text, integer, text, timestamptz, text, integer) TO authenticated;

COMMENT ON FUNCTION public.record_admin_payment(uuid, uuid, text, text, integer, text, timestamptz, text, integer) IS
  'D5 G-1 (20261117120000): an admin records a payment or correction on one child''s bill of one month - the payments row (id = idempotency key), both ledger legs keyed record-payment-<payment>-<student>, and recorded_payment by compare-and-set under FOR UPDATE with the invoice_paid_label label (credit kept) - in ONE transaction. SECURITY INVOKER (the admin''s RLS); explicit admin check; EXECUTE for authenticated only. Called by the record-payment edge function.';
