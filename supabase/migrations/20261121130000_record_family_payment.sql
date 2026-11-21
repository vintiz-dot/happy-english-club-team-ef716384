-- Tuition audit phase 1b (docs/TUITION_AUDIT_ROLLOUT.md): a family payment is
-- recorded in ONE transaction.
--
-- WHY. family-payment and smart-family-payment saved a family payment as a
-- string of separate PostgREST calls: the payments row, then per child an
-- allocation row, ledger accounts, two ledger legs and the child's bill. A
-- failure part-way (a dropped connection, a bill that changed, a missing
-- account) left the record half-written - a payment row with no bill, or one
-- sibling's bill paid and the other's not - and nothing undid the half that
-- was saved. A single child's payment has been one transaction since
-- 17 Nov (record_admin_payment, 20261117121000); this does the same for a
-- family.
--
-- WHAT. public.record_family_payment writes, all or nothing:
--   1. the payments row (id = the function's key; family_id set; month NULL,
--      source 'receipt' - a receipt, 20261121110000);
--   2. per child, in the order given: the payment_allocations row, the child's
--      five ledger accounts if missing, and one ledger pair on one tx_id -
--      DR CASH|BANK keyed '<prefix>-<payment>-<child>' (the key delete-payment
--      and payment_bill_amounts read), CR AR unkeyed - on p_month;
--   3. per child, the month's bill: read FOR UPDATE (children in id order, so
--      two family payments never deadlock), recorded_payment and paid_amount
--      raised by the child's amount, the label by invoice_paid_label over the
--      month's payable, an admin's 'credit' kept. A child with no bill gets one
--      only when the caller sends its figures (smart-family-payment, when the
--      calculator could not save the bill); otherwise RP424 and nothing is
--      written;
--   4. the audit rows the caller sends, as they are.
-- It decides nothing about HOW the money is split: the edge functions keep
-- their allocation rules (oldest-first / pro-rata / manual; the smart
-- waterfall) and send the result. It refuses a split that does not add up
-- to the payment.
--
-- WHO. SECURITY INVOKER, EXECUTE for service_role only: the two edge functions
-- authenticate the admin and pass p_actor, which is checked again here
-- (has_role admin). The phase 1 guard (20261121090000) lets service_role
-- write recorded_payment; the flag hec.payment_writer is set as well, around
-- the bill updates, so the writes read the same whoever runs them.
--
-- REFUSALS (SQLSTATE):
--   FP403 the actor is not an admin        FP409 this payment id exists
--   FP422 the split is not the payment     FP424 a child has no bill and no figures
--   22023 a value out of range
--
-- Fails closed: refuses to install if a table, column, function or enum label
-- it needs is missing. Idempotent.
-- Rollback: DROP FUNCTION public.record_family_payment(uuid, uuid, uuid, uuid,
-- integer, text, timestamptz, text, text, text, jsonb, jsonb); the two edge
-- functions then answer 500 "nothing was recorded" until they are redeployed
-- from before this change.

DO $preflight$
DECLARE
  missing text[] := '{}';
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('payments', 'id'), ('payments', 'student_id'), ('payments', 'amount'), ('payments', 'method'),
      ('payments', 'occurred_at'), ('payments', 'memo'), ('payments', 'created_by'), ('payments', 'family_id'),
      ('payments', 'source'), ('payments', 'month'),
      ('payment_allocations', 'parent_payment_id'), ('payment_allocations', 'student_id'),
      ('payment_allocations', 'allocated_amount'), ('payment_allocations', 'allocation_order'), ('payment_allocations', 'created_by'),
      ('ledger_accounts', 'id'), ('ledger_accounts', 'student_id'), ('ledger_accounts', 'code'),
      ('ledger_entries', 'tx_id'), ('ledger_entries', 'tx_key'), ('ledger_entries', 'account_id'), ('ledger_entries', 'debit'),
      ('ledger_entries', 'credit'), ('ledger_entries', 'occurred_at'), ('ledger_entries', 'memo'), ('ledger_entries', 'month'),
      ('ledger_entries', 'created_by'),
      ('invoices', 'id'), ('invoices', 'student_id'), ('invoices', 'month'), ('invoices', 'recorded_payment'),
      ('invoices', 'paid_amount'), ('invoices', 'base_amount'), ('invoices', 'discount_amount'), ('invoices', 'total_amount'),
      ('invoices', 'carry_in_debt'), ('invoices', 'carry_in_credit'), ('invoices', 'status'), ('invoices', 'updated_at'),
      ('invoices', 'updated_by'),
      ('audit_log', 'entity'), ('audit_log', 'entity_id'), ('audit_log', 'action'), ('audit_log', 'actor_user_id'), ('audit_log', 'diff')
    ) AS v(t, c)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || r.t) AND a.attname = r.c AND a.attnum > 0 AND NOT a.attisdropped) THEN
      missing := missing || (r.t || '.' || r.c);
    END IF;
  END LOOP;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Phase 1b: missing column(s) %. Nothing was changed.', array_to_string(missing, ', ');
  END IF;
  IF to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'Phase 1b: public.invoice_paid_label is not installed (20261113090000). Nothing was changed.';
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Phase 1b: public.has_role(uuid, app_role) is missing. Nothing was changed.';
  END IF;
  IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'account_code' AND e.enumlabel IN ('AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT')) <> 5 THEN
    RAISE EXCEPTION 'Phase 1b: account_code lacks AR / CASH / BANK / REVENUE / CREDIT. Nothing was changed.';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.record_family_payment(
  p_payment_id uuid,
  p_actor uuid,
  p_family_id uuid,
  p_primary_student_id uuid,
  p_amount integer,
  p_method text,
  p_occurred_at timestamptz,
  p_memo text,
  p_month text,
  p_key_prefix text,
  p_allocations jsonb,
  p_audit jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_method text := btrim(coalesce(p_method, ''));
  v_code   text;
  v_sum    bigint;
  v_n      integer;
  a        record;
  v_bill   record;
  v_cash   uuid;
  v_ar     uuid;
  v_tx     uuid;
  v_after  bigint;
  v_label  public.invoice_status;
  v_bills  jsonb := '[]'::jsonb;
  au       jsonb;
BEGIN
  -- Who.
  IF p_actor IS NULL OR NOT public.has_role(p_actor, 'admin') THEN
    RAISE EXCEPTION 'Only an admin can record a family payment. Nothing was recorded.' USING ERRCODE = 'FP403';
  END IF;

  -- What.
  IF p_payment_id IS NULL OR p_primary_student_id IS NULL OR p_occurred_at IS NULL THEN
    RAISE EXCEPTION 'The payment key, the first student and the receipt date are required. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_month IS NULL OR p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'The month must be YYYY-MM. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 500000000 THEN
    RAISE EXCEPTION 'The amount must be a whole number of dong from 1 to 500,000,000. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF v_method = '' OR length(v_method) > 50 THEN
    RAISE EXCEPTION 'The method is required (at most 50 characters). Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF p_key_prefix IS NULL OR p_key_prefix NOT IN ('family-payment', 'smart-family') THEN
    RAISE EXCEPTION 'Unknown family payment kind %. Nothing was recorded.', p_key_prefix USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_allocations) IS DISTINCT FROM 'array' OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'A family payment needs at least one child to put it on. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) e
              WHERE (e ->> 'student_id') IS NULL OR (e ->> 'amount') IS NULL
                 OR (e ->> 'amount') !~ '^[0-9]+$' OR (e ->> 'amount')::bigint < 1) THEN
    RAISE EXCEPTION 'Every child''s share must be a whole number of dong above 0. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  SELECT sum((e ->> 'amount')::bigint) INTO v_sum FROM jsonb_array_elements(p_allocations) e;
  IF (SELECT count(DISTINCT e ->> 'student_id') FROM jsonb_array_elements(p_allocations) e) <> jsonb_array_length(p_allocations) THEN
    RAISE EXCEPTION 'A child appears twice in the split. Nothing was recorded.' USING ERRCODE = '22023';
  END IF;
  IF v_sum <> p_amount THEN
    RAISE EXCEPTION 'The children''s shares add up to %, not the payment of %. Nothing was recorded.', v_sum, p_amount USING ERRCODE = 'FP422';
  END IF;
  v_code := CASE WHEN lower(v_method) = 'cash' THEN 'CASH' ELSE 'BANK' END;

  -- Not twice.
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.id = p_payment_id) THEN
    RAISE EXCEPTION 'This payment was already recorded. Nothing more was recorded: reload to see it.' USING ERRCODE = 'FP409';
  END IF;

  -- The bills, locked, children in id order: one writer of a bill at a time,
  -- and two family payments lock in the same order. A missing bill is made
  -- only from figures the caller sends.
  FOR a IN SELECT (e ->> 'student_id')::uuid AS student_id, e -> 'new_bill' AS new_bill
             FROM jsonb_array_elements(p_allocations) e ORDER BY (e ->> 'student_id')
  LOOP
    PERFORM 1 FROM public.invoices i WHERE i.student_id = a.student_id AND i.month = p_month FOR UPDATE;
    IF NOT FOUND THEN
      IF a.new_bill IS NULL OR jsonb_typeof(a.new_bill) <> 'object' THEN
        RAISE EXCEPTION 'A child in this payment has no % bill to put it on. Nothing was recorded: open their tuition for that month first.', p_month
          USING ERRCODE = 'FP424';
      END IF;
      INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount)
      VALUES (a.student_id, p_month,
              coalesce((a.new_bill ->> 'base_amount')::numeric, 0)::integer,
              coalesce((a.new_bill ->> 'discount_amount')::numeric, 0)::integer,
              coalesce((a.new_bill ->> 'total_amount')::numeric, 0)::integer);
      PERFORM 1 FROM public.invoices i WHERE i.student_id = a.student_id AND i.month = p_month FOR UPDATE;
    END IF;
  END LOOP;

  -- 1. The payments row: a receipt, the whole amount, on the first child.
  BEGIN
    INSERT INTO public.payments (id, student_id, amount, method, occurred_at, memo, created_by, family_id)
    VALUES (p_payment_id, p_primary_student_id, p_amount, v_method, p_occurred_at,
            nullif(btrim(coalesce(p_memo, '')), ''), p_actor, p_family_id);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This payment was already recorded. Nothing more was recorded: reload to see it.' USING ERRCODE = 'FP409';
  END;

  PERFORM set_config('hec.payment_writer', 'record_family_payment', true);

  FOR a IN SELECT (e ->> 'student_id')::uuid AS student_id, (e ->> 'amount')::bigint AS amount,
                  coalesce((e ->> 'order')::integer, ord::integer) AS alloc_order,
                  nullif(e ->> 'leg_memo', '') AS leg_memo, nullif(e ->> 'ar_memo', '') AS ar_memo
             FROM jsonb_array_elements(p_allocations) WITH ORDINALITY AS x(e, ord) ORDER BY ord
  LOOP
    -- 2. The allocation, the accounts, the ledger pair.
    INSERT INTO public.payment_allocations (parent_payment_id, student_id, allocated_amount, allocation_order, created_by)
    VALUES (p_payment_id, a.student_id, a.amount::integer, a.alloc_order, p_actor);

    INSERT INTO public.ledger_accounts (student_id, code)
    SELECT a.student_id, c::public.account_code FROM unnest(ARRAY['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT']) AS c
    ON CONFLICT (student_id, code) DO NOTHING;
    SELECT la.id INTO v_cash FROM public.ledger_accounts la WHERE la.student_id = a.student_id AND la.code::text = v_code;
    SELECT la.id INTO v_ar   FROM public.ledger_accounts la WHERE la.student_id = a.student_id AND la.code::text = 'AR';
    IF v_cash IS NULL OR v_ar IS NULL THEN
      RAISE EXCEPTION 'A child''s ledger accounts could not be read. Nothing was recorded.';
    END IF;
    v_tx := gen_random_uuid();
    INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month, created_by)
    VALUES
      (v_tx, p_key_prefix || '-' || p_payment_id::text || '-' || a.student_id::text, v_cash, a.amount::integer, 0,
       p_occurred_at, coalesce(a.leg_memo, 'Family payment allocation'), p_month, p_actor),
      (v_tx, NULL, v_ar, 0, a.amount::integer,
       p_occurred_at, coalesce(a.ar_memo, 'Family payment allocation'), p_month, p_actor);

    -- 3. The bill (locked above).
    SELECT i.* INTO v_bill FROM public.invoices i WHERE i.student_id = a.student_id AND i.month = p_month;
    v_after := coalesce(v_bill.recorded_payment, 0)::bigint + a.amount;
    v_label := CASE WHEN v_bill.status::text = 'credit' THEN NULL
                    ELSE public.invoice_paid_label(
                           v_after,
                           coalesce(v_bill.total_amount, 0)::bigint + coalesce(v_bill.carry_in_debt, 0) - coalesce(v_bill.carry_in_credit, 0),
                           coalesce(v_bill.base_amount, 0)::bigint,
                           coalesce(v_bill.total_amount, 0)::bigint) END;
    UPDATE public.invoices i
       SET recorded_payment = v_after,
           paid_amount = coalesce(i.paid_amount, 0) + a.amount,
           status = coalesce(v_label, i.status),
           updated_at = now(),
           updated_by = p_actor
     WHERE i.id = v_bill.id;
    v_bills := v_bills || jsonb_build_object('studentId', a.student_id, 'invoiceId', v_bill.id, 'amount', a.amount,
                                             'recordedBefore', coalesce(v_bill.recorded_payment, 0), 'recordedAfter', v_after,
                                             'status', coalesce(v_label::text, v_bill.status::text));
  END LOOP;

  PERFORM set_config('hec.payment_writer', '', true);

  -- 4. The caller's audit rows.
  IF jsonb_typeof(p_audit) = 'array' THEN
    FOR au IN SELECT * FROM jsonb_array_elements(p_audit) LOOP
      INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
      VALUES (coalesce(au ->> 'entity', 'family_payment'), coalesce(au ->> 'entity_id', p_payment_id::text),
              coalesce(au ->> 'action', 'family_payment'), p_actor, coalesce(au -> 'diff', '{}'::jsonb));
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'paymentId', p_payment_id, 'month', p_month, 'amount', p_amount, 'bills', v_bills);
END
$function$;

REVOKE ALL ON FUNCTION public.record_family_payment(uuid, uuid, uuid, uuid, integer, text, timestamptz, text, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_family_payment(uuid, uuid, uuid, uuid, integer, text, timestamptz, text, text, text, jsonb, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.record_family_payment(uuid, uuid, uuid, uuid, integer, text, timestamptz, text, text, text, jsonb, jsonb) IS
  'Tuition audit phase 1b (20261121130000): a family payment in ONE transaction - the payments row, per child the allocation, ledger accounts and one keyed ledger pair, and the month''s bill (FOR UPDATE, children in id order; recorded_payment and paid_amount raised, invoice_paid_label, credit kept), plus the caller''s audit rows. The split is the caller''s; it must add up to the payment. EXECUTE for service_role only (family-payment, smart-family-payment), actor checked as admin.';
