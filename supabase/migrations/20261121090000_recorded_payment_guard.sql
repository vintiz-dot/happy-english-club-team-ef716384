-- Tuition audit phase 1 (docs/TUITION_AUDIT_ROLLOUT.md): a bill's paid figure
-- moves only with a payment behind it.
--
-- WHY. The audit of Oct 2025 - May 2026 found 21.1M of "payments" on bills
-- with no cash in the school's records. Payments had been typed straight onto
-- invoices.recorded_payment, with no payments row, no receipt date and no
-- method, so nobody can tell a real payment from a click. Since 17 Nov every
-- admin screen records through public.record_admin_payment (20261117121000):
-- the payments row, both ledger legs and the bill in one transaction. This
-- makes that the ONLY way a signed-in person changes the figure.
--
-- THE RULE (trigger a_invoice_recorded_payment_guard, BEFORE INSERT OR UPDATE
-- on invoices). A change to recorded_payment - an UPDATE that changes it, or
-- an INSERT of a bill with a non-zero figure - is refused with RP451 when the
-- statement runs as `authenticated` or `anon` (a browser, or an edge function
-- using the caller's token), UNLESS a payment writer has said so for this
-- transaction with set_config('hec.payment_writer', <its name>, true).
-- record_admin_payment says so for its one bill update and clears it after.
--
-- Not refused, on purpose:
--   - service_role: the payment edge functions (family-payment,
--     smart-family-payment, delete-payment) run with the service key and write
--     their own payments rows and ledger legs; a browser never holds that key.
--   - a SECURITY DEFINER function (current_user is its owner): ai_action_undo,
--     which reverses its own action's payment with reversal legs.
--   - the SQL editor (the owner).
--   - writes that leave the figure as it was (labels, carry, upserts of the
--     same value), and new bills with nothing paid (calculate-tuition).
--
-- The trigger function is SECURITY INVOKER so current_user is the caller.
-- PostgREST cannot set the flag: it only exposes functions in public, and
-- set_config is not one.
--
-- Fails closed: refuses to install (nothing changed) if record_admin_payment
-- is not the 20261117121000 signature, or if any other function in public
-- writes recorded_payment (it would start failing, or would need adding here).
-- Idempotent.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS a_invoice_recorded_payment_guard ON public.invoices;
--   DROP FUNCTION IF EXISTS public._invoice_recorded_payment_guard();
-- record_admin_payment can stay as replaced: without the trigger, the flag
-- it sets does nothing.

DO $preflight$
DECLARE
  v_other text;
BEGIN
  IF to_regprocedure('public.record_admin_payment(uuid,uuid,text,text,integer,text,timestamptz,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Audit phase 1: public.record_admin_payment (20261117121000) is not installed. Nothing was changed.';
  END IF;
  IF to_regclass('public.invoices') IS NULL THEN
    RAISE EXCEPTION 'Audit phase 1: public.invoices is missing. Nothing was changed.';
  END IF;
  SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' ORDER BY p.proname)
    INTO v_other
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosrc ~* 'update\s+(public\.)?invoices'
     AND p.prosrc ~* 'recorded_payment\s*='
     AND p.proname NOT IN ('record_admin_payment', 'record_family_payment', 'ai_action_undo', '_invoice_recorded_payment_guard');
  IF v_other IS NOT NULL THEN
    RAISE EXCEPTION 'Audit phase 1: these functions write invoices.recorded_payment and are not known payment writers: %. Read each, then add it to this migration. Nothing was changed.', v_other;
  END IF;
END
$preflight$;

-- record_admin_payment exactly as 20261117121000 installed it, with the flag
-- set around its one bill update.

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
  -- Tuition audit phase 1 (20261121090000): the one write the guard lets through.
  PERFORM set_config('hec.payment_writer', 'record_admin_payment', true);
  UPDATE public.invoices i
     SET recorded_payment = v_after,
         paid_amount = greatest(0, coalesce(i.paid_amount, 0) + v_delta),
         status = coalesce(v_label, i.status),
         updated_at = now(),
         updated_by = v_actor
   WHERE i.id = v_bill.id AND coalesce(i.recorded_payment, 0) = v_before;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  PERFORM set_config('hec.payment_writer', '', true);
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
  'D5 G-1 (20261117121000): an admin records a payment or correction on one child''s bill of one month - the payments row (id = idempotency key), both ledger legs keyed record-payment-<payment>-<student>, and recorded_payment by compare-and-set under FOR UPDATE with the invoice_paid_label label (credit kept) - in ONE transaction. SECURITY INVOKER (the admin''s RLS); explicit admin check; EXECUTE for authenticated only. Called by the record-payment edge function. Since 20261121090000 it sets hec.payment_writer around its bill update: the one way a signed-in person changes recorded_payment.';

CREATE OR REPLACE FUNCTION public._invoice_recorded_payment_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF coalesce(NEW.recorded_payment, 0) = coalesce(OLD.recorded_payment, 0) THEN
      RETURN NEW;
    END IF;
  ELSIF coalesce(NEW.recorded_payment, 0) = 0 THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('hec.payment_writer', true), '') <> '' THEN
    RETURN NEW;
  END IF;
  IF current_user::text NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A bill''s paid amount changes only by recording a payment (Record Payment, Quick Pay or a correction), so that every amount has a receipt behind it. Nothing was saved.'
    USING ERRCODE = 'RP451',
          DETAIL = format('invoice %s (%s): recorded_payment %s -> %s refused for %s',
                          coalesce(NEW.id::text, 'new'), NEW.month,
                          CASE WHEN TG_OP = 'UPDATE' THEN coalesce(OLD.recorded_payment, 0)::text ELSE '-' END,
                          coalesce(NEW.recorded_payment, 0), current_user);
END
$function$;

REVOKE ALL ON FUNCTION public._invoice_recorded_payment_guard() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public._invoice_recorded_payment_guard() IS
  'Tuition audit phase 1 (20261121090000): refuses a change to invoices.recorded_payment by authenticated / anon unless a payment writer set hec.payment_writer for the transaction (record_admin_payment does). service_role, SECURITY DEFINER functions and the owner pass. See docs/TUITION_AUDIT_ROLLOUT.md.';

DROP TRIGGER IF EXISTS a_invoice_recorded_payment_guard ON public.invoices;
CREATE TRIGGER a_invoice_recorded_payment_guard
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public._invoice_recorded_payment_guard();
