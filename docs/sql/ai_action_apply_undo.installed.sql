-- REFERENCE ONLY - do not paste. The source of public.ai_action_apply and
-- public.ai_action_undo as installed after migrations 20261107090000,
-- 20261113090000 (the label patch) and 20261117150000 (the payment step
-- through record_admin_payment; its undo as delete-payment). Start any
-- change to either function from here, and keep public.invoice_paid_label
-- as its label. scripts/pgtest/ai-actions.test.mjs fails when the
-- installed functions differ from the text below.

CREATE OR REPLACE FUNCTION public.ai_action_apply(p_proposal_id uuid, p_instruction text, p_plan jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_prior public.ai_actions%ROWTYPE;
  chk jsonb;
  n jsonb;
  inv record;
  v_student uuid;
  v_enrol uuid;
  v_def uuid;
  v_assign uuid;
  v_invoice uuid;
  v_amount bigint;
  v_month text;
  v_created boolean := false;
  v_bill_created boolean := false;
  v_payment uuid;
  v_paid jsonb;
  effects jsonb := '{}';
  v_action uuid;
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  IF p_proposal_id IS NULL THEN RAISE EXCEPTION 'A proposal id is required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_proposal_id::text, 0));
  SELECT * INTO v_prior FROM public.ai_actions WHERE proposal_id = p_proposal_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true, 'action_id', v_prior.id,
      'student_id', v_prior.student_id, 'summary', v_prior.summary,
      'nudges', coalesce(v_prior.effects -> 'nudges', '[]'),
      'open_path', '/students/' || v_prior.student_id);
  END IF;

  -- Lock the student before checking, so the check holds until commit.
  PERFORM 1 FROM public.students WHERE id = public.ai_try_uuid(p_plan -> 'student' ->> 'id') FOR UPDATE;

  chk := public.ai_plan_check(p_plan);
  IF NOT (chk ->> 'ok')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'problems', chk -> 'problems');
  END IF;
  n := chk -> 'normal';

  -- A payment is recorded by public.record_admin_payment, which takes at
  -- most 500,000,000 in one payment (the payment screens' bound). Refused
  -- here, before anything is written.
  IF n ? 'payment' AND (n -> 'payment' ->> 'amount')::bigint > 500000000 THEN
    RETURN jsonb_build_object('ok', false, 'problems', jsonb_build_array(format(
      'A payment of more than %s cannot be recorded in one go. Record it as two payments.', public.ai_vnd(500000000))));
  END IF;

  IF (n -> 'student' ->> 'new')::boolean THEN
    INSERT INTO public.students (full_name, date_of_birth, created_by)
    VALUES (n -> 'student' ->> 'full_name', (n -> 'student' ->> 'date_of_birth')::date, v_actor)
    RETURNING id INTO v_student;
    v_created := true;
  ELSE
    v_student := (n -> 'student' ->> 'id')::uuid;
  END IF;
  effects := jsonb_build_object('student_id', v_student, 'student_created', v_created, 'nudges', chk -> 'nudges');

  IF n ? 'family' THEN
    UPDATE public.students SET family_id = (n -> 'family' ->> 'family_id')::uuid, updated_by = v_actor
    WHERE id = v_student;
    effects := effects || jsonb_build_object('family', jsonb_build_object(
      'before', n -> 'family' -> 'before_id', 'after', n -> 'family' -> 'family_id'));
  END IF;

  IF n ? 'sibling_hold' THEN
    UPDATE public.students SET sibling_discount_from = (n -> 'sibling_hold' ->> 'from')::date, updated_by = v_actor
    WHERE id = v_student;
    effects := effects || jsonb_build_object('sibling_hold', jsonb_build_object(
      'before', n -> 'sibling_hold' -> 'before', 'after', n -> 'sibling_hold' -> 'from'));
  END IF;

  IF n ? 'enrol' THEN
    INSERT INTO public.enrollments (student_id, class_id, start_date, created_by)
    VALUES (v_student, (n -> 'enrol' ->> 'class_id')::uuid, (n -> 'enrol' ->> 'start_date')::date, v_actor)
    RETURNING id INTO v_enrol;
    effects := effects || jsonb_build_object('enrollment_id', v_enrol);
  END IF;

  IF n ? 'discount' THEN
    INSERT INTO public.discount_definitions (name, type, value, cadence, start_month, end_month, is_active, created_by)
    VALUES (
      format('%s%% for %s months - %s', n -> 'discount' ->> 'percent',
        jsonb_array_length(n -> 'discount' -> 'months'), n -> 'student' ->> 'full_name'),
      'percent', (n -> 'discount' ->> 'percent')::numeric, 'monthly',
      n -> 'discount' -> 'months' ->> 0,
      n -> 'discount' -> 'months' ->> (jsonb_array_length(n -> 'discount' -> 'months') - 1),
      true, v_actor)
    RETURNING id INTO v_def;
    INSERT INTO public.discount_assignments (student_id, discount_def_id, effective_from, effective_to, note, created_by)
    VALUES (v_student, v_def, (n -> 'discount' ->> 'effective_from')::date,
      (n -> 'discount' ->> 'effective_to')::date, 'Set up by the assistant', v_actor)
    RETURNING id INTO v_assign;
    effects := effects || jsonb_build_object('discount', jsonb_build_object(
      'definition_id', v_def, 'assignment_id', v_assign, 'months', n -> 'discount' -> 'months'));
  END IF;

  IF n ? 'payment' THEN
    v_amount := (n -> 'payment' ->> 'amount')::bigint;
    v_month := n -> 'payment' ->> 'month';
    -- record_admin_payment records only on a bill that exists. None yet: a
    -- bill with no charge on it, as before (calculate-tuition prices it on
    -- its next read), so the payment shows as credit until then.
    SELECT id INTO inv FROM public.invoices WHERE student_id = v_student AND month = v_month;
    IF NOT FOUND THEN
      INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount,
        recorded_payment, paid_amount, status, created_by)
      VALUES (v_student, v_month, 0, 0, 0, 0, 0, 'issued', v_actor)
      RETURNING id INTO v_invoice;
      v_bill_created := true;
    ELSE
      v_invoice := inv.id;
    END IF;
    -- The payments row, both ledger legs, the bill and its audit row, as
    -- every admin payment screen records a payment (D5 G-1). Same
    -- transaction: a refusal or a failure in it undoes all of this action.
    v_payment := gen_random_uuid();
    v_paid := public.record_admin_payment(
      v_payment, v_student, v_month, 'payment', v_amount::integer,
      n -> 'payment' ->> 'method',
      ((n -> 'payment' ->> 'paid_on') || 'T12:00:00+07:00')::timestamptz,
      coalesce(n -> 'payment' ->> 'note', 'Recorded by the assistant'),
      NULL);
    effects := effects || jsonb_build_object('payment', jsonb_build_object(
      'invoice_id', v_invoice, 'month', v_month, 'amount', v_amount, 'invoice_created', v_bill_created,
      'payment_id', v_payment, 'ledger_tx_id', v_paid ->> 'ledgerTxId', 'ledger_account', v_paid ->> 'ledgerAccount',
      'recorded_before', (v_paid ->> 'recordedBefore')::bigint, 'recorded_after', (v_paid ->> 'recordedAfter')::bigint));
  END IF;

  INSERT INTO public.ai_actions (proposal_id, instruction, plan, summary, effects, student_id, created_by)
  VALUES (p_proposal_id, left(coalesce(btrim(p_instruction), ''), 4000), p_plan, chk -> 'summary', effects, v_student, v_actor)
  RETURNING id INTO v_action;

  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('ai_action', v_action::text, 'ai_action_apply', v_actor,
    jsonb_build_object('student_id', v_student, 'summary', chk -> 'summary'));

  RETURN jsonb_build_object('ok', true, 'action_id', v_action, 'student_id', v_student,
    'summary', chk -> 'summary', 'warnings', chk -> 'warnings', 'nudges', chk -> 'nudges',
    'open_path', '/students/' || v_student);
END $function$
;

CREATE OR REPLACE FUNCTION public.ai_action_undo(p_action_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  a public.ai_actions%ROWTYPE;
  e jsonb;
  v_student uuid;
  reasons text[] := '{}';
  notices text[] := '{}';
  inv record;
  en record;
  pay record;
  v_class_name text;
  v_amount bigint;
  v_month text;
  v_left bigint;
  v_payable bigint;
  v_n bigint;
  v_now_family uuid;
  v_now_hold date;
  v_login boolean;
  v_since text;
  v_activity text[];
  v_pid uuid;
  v_own uuid[] := '{}';
  v_rtx uuid;
  v_legs bigint;
  v_rows bigint;
  v_kept boolean := false;
  v_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can do this' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO a FROM public.ai_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array('That action does not exist.'));
  END IF;
  IF a.status = 'undone' THEN
    RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array('This was already undone.'));
  END IF;
  e := a.effects;
  v_student := (e ->> 'student_id')::uuid;
  v_since := to_char(a.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM');

  -- All of it or none of it. Each step adds to `reasons` instead of
  -- stopping, so the admin hears every blocker at once; the RAISE at the
  -- end then rolls back whatever the steps before had already reversed.
  BEGIN
    PERFORM 1 FROM public.students WHERE id = v_student FOR UPDATE;

    IF e ? 'payment' THEN
      v_amount := (e -> 'payment' ->> 'amount')::bigint;
      v_month := e -> 'payment' ->> 'month';
      SELECT * INTO inv FROM public.invoices WHERE id = (e -> 'payment' ->> 'invoice_id')::uuid FOR UPDATE;
      IF public.ai_month_closed(v_month) THEN
        reasons := reasons || format('%s has been closed, so its payment cannot be taken back.', public.ai_month_label(v_month));
      ELSIF NOT FOUND THEN
        reasons := reasons || format('The %s bill this payment was on no longer exists.', public.ai_month_label(v_month));
      ELSIF coalesce(inv.recorded_payment, 0) < v_amount THEN
        reasons := reasons || format('Only %s is recorded for %s now, less than the %s this added.',
          public.ai_vnd(coalesce(inv.recorded_payment, 0)), public.ai_month_label(v_month), public.ai_vnd(v_amount));
      ELSIF e -> 'payment' ? 'payment_id' THEN
        -- Recorded on the ledger (20261117150000): taken back the way
        -- delete-payment deletes a payment.
        v_pid := (e -> 'payment' ->> 'payment_id')::uuid;
        v_own := v_own || v_pid;
        SELECT * INTO pay FROM public.payments WHERE id = v_pid FOR UPDATE;
        IF NOT FOUND THEN
          reasons := reasons || format('The %s payment this recorded for %s has been deleted since (Delete payment), so there is nothing to take back.',
            public.ai_vnd(v_amount), public.ai_month_label(v_month));
        ELSIF pay.student_id IS DISTINCT FROM v_student OR pay.amount::bigint IS DISTINCT FROM v_amount THEN
          reasons := reasons || 'The payment this recorded has been changed since.'::text;
        ELSIF EXISTS (SELECT 1 FROM public.ledger_entries x WHERE x.tx_key LIKE 'payment-reversal-' || v_pid::text || '-%') THEN
          reasons := reasons || 'The payment this recorded has already been reversed in the ledger.'::text;
        ELSE
          -- 1. Reverse both legs (new legs; the ledger is append-only).
          v_rtx := gen_random_uuid();
          INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month, created_by)
          SELECT v_rtx, 'payment-reversal-' || v_pid::text || '-' || l.id::text, l.account_id, l.credit, l.debit, now(),
                 'Reversal of deleted payment: undo of an assistant action', l.month, v_actor
          FROM public.ledger_entries l
          WHERE l.tx_id IN (SELECT k.tx_id FROM public.ledger_entries k
                             WHERE k.tx_key = 'record-payment-' || v_pid::text || '-' || v_student::text);
          GET DIAGNOSTICS v_legs = ROW_COUNT;
          IF v_legs <> 2 THEN
            reasons := reasons || 'The ledger entries of the payment this recorded could not be found whole, so it was not taken back. Use Delete payment.'::text;
          ELSE
            -- 2. Off the bill (row locked above; compare-and-set on the value read).
            v_left := inv.recorded_payment - v_amount;
            IF (e -> 'payment' ->> 'invoice_created')::boolean AND v_left = 0
               AND coalesce(inv.total_amount, 0) = 0 AND coalesce(inv.base_amount, 0) = 0 THEN
              DELETE FROM public.invoices WHERE id = inv.id;
            ELSE
              v_payable := coalesce(inv.total_amount, 0) + coalesce(inv.carry_in_debt, 0) - coalesce(inv.carry_in_credit, 0);
              UPDATE public.invoices
              SET recorded_payment = v_left,
                  paid_amount = greatest(0, coalesce(invoices.paid_amount, 0) - v_amount),
                  status = (CASE WHEN invoices.status = 'credit' THEN invoices.status ELSE public.invoice_paid_label(v_left, v_payable, invoices.base_amount, invoices.total_amount) END),
                  updated_at = now(), updated_by = v_actor
              WHERE id = inv.id AND coalesce(invoices.recorded_payment, 0) = inv.recorded_payment;
              GET DIAGNOSTICS v_rows = ROW_COUNT;
              IF v_rows <> 1 THEN
                reasons := reasons || format('The %s bill changed while this was being undone. Try again.', public.ai_month_label(v_month));
              END IF;
            END IF;
            -- 3. The deletion record, then the payment row (as delete-payment).
            INSERT INTO public.payment_deletions (payment_id, snapshot, deleted_by, deletion_reason)
            VALUES (v_pid, jsonb_build_object(
                'payment_data', to_jsonb(pay), 'reversal_tx_ids', jsonb_build_array(v_rtx),
                'affected_students', jsonb_build_array(v_student), 'affected_months', jsonb_build_array(v_month),
                'bill_changes', jsonb_build_array(jsonb_build_object('studentId', v_student, 'month', v_month,
                  'taken', v_amount, 'recordedBefore', inv.recorded_payment, 'recordedAfter', v_left)),
                'deleted_by', v_actor, 'deleted_at', now(), 'deletion_reason', 'Undo of an assistant action',
                'ai_action_id', a.id),
              v_actor, 'Undo of an assistant action');
            DELETE FROM public.payments WHERE id = v_pid AND student_id = v_student;
            INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
            VALUES ('payment', v_pid::text, 'delete', v_actor, jsonb_build_object(
              'reason', 'Undo of an assistant action', 'student_id', v_student, 'month', v_month,
              'affected_students', jsonb_build_array(v_student), 'affected_months', jsonb_build_array(v_month),
              'reversal_tx_ids', jsonb_build_array(v_rtx), 'ai_action_id', a.id, 'via', 'assistant-undo',
              'bill_changes', jsonb_build_array(jsonb_build_object('studentId', v_student, 'month', v_month,
                'taken', v_amount, 'recordedBefore', inv.recorded_payment, 'recordedAfter', v_left))));
            notices := notices || format('The %s payment for %s was taken back as Delete payment does: two reversing entries were added to the ledger (it keeps every entry), it came off the %s bill, and the payment record was deleted.',
              public.ai_vnd(v_amount), public.ai_month_label(v_month), public.ai_month_label(v_month));
          END IF;
        END IF;
      ELSE
        -- Recorded before 20261117150000 (on the bill only): as before.
        v_left := inv.recorded_payment - v_amount;
        IF (e -> 'payment' ->> 'invoice_created')::boolean AND v_left = 0
           AND coalesce(inv.total_amount, 0) = 0 AND coalesce(inv.base_amount, 0) = 0 THEN
          DELETE FROM public.invoices WHERE id = inv.id;
        ELSE
          v_payable := coalesce(inv.total_amount, 0) + coalesce(inv.carry_in_debt, 0) - coalesce(inv.carry_in_credit, 0);
          UPDATE public.invoices
          SET recorded_payment = v_left,
              status = (CASE WHEN invoices.status = 'credit' THEN invoices.status ELSE public.invoice_paid_label(v_left, v_payable, invoices.base_amount, invoices.total_amount) END),
              updated_at = now(), updated_by = v_actor
          WHERE id = inv.id;
        END IF;
        INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
        VALUES ('invoice', inv.id::text, 'payment_correction', v_actor, jsonb_build_object(
          'student_id', v_student, 'month', v_month, 'previous_recorded_payment', inv.recorded_payment,
          'payment_amount', -v_amount, 'new_recorded_payment', v_left,
          'memo', 'Undo of an assistant action', 'type', 'correction', 'via', 'assistant'));
      END IF;
    END IF;

    IF e ? 'sibling_hold' THEN
      SELECT sibling_discount_from INTO v_now_hold FROM public.students WHERE id = v_student;
      IF v_now_hold IS DISTINCT FROM (e -> 'sibling_hold' ->> 'after')::date THEN
        reasons := reasons || 'Someone has changed the sibling discount hold since.'::text;
      ELSE
        UPDATE public.students SET sibling_discount_from = (e -> 'sibling_hold' ->> 'before')::date, updated_by = v_actor
        WHERE id = v_student;
      END IF;
    END IF;

    IF e ? 'family' THEN
      SELECT family_id INTO v_now_family FROM public.students WHERE id = v_student;
      IF v_now_family IS DISTINCT FROM (e -> 'family' ->> 'after')::uuid THEN
        reasons := reasons || 'Someone has moved this student to another family since.'::text;
      ELSE
        UPDATE public.students SET family_id = (e -> 'family' ->> 'before')::uuid, updated_by = v_actor
        WHERE id = v_student;
        -- Any family discount worked out while the student counted is
        -- wrong now. Clear the open months so the next tuition read works
        -- it out again; closed months keep what was billed.
        DELETE FROM public.sibling_discount_state s
        WHERE s.family_id IN ((e -> 'family' ->> 'after')::uuid, (e -> 'family' ->> 'before')::uuid)
          AND s.month >= greatest(v_since, coalesce(left(e -> 'sibling_hold' ->> 'after', 7), v_since))
          AND NOT public.ai_month_closed(s.month);
      END IF;
    END IF;

    IF e ? 'discount' THEN
      IF EXISTS (SELECT 1 FROM public.discount_assignments WHERE id = (e -> 'discount' ->> 'assignment_id')::uuid) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(e -> 'discount' -> 'months') m WHERE public.ai_month_closed(m)) THEN
          reasons := reasons || 'A month the discount covers has been closed.'::text;
        ELSIF EXISTS (
          SELECT 1 FROM public.invoices i
          WHERE i.student_id = v_student AND coalesce(i.recorded_payment, 0) > 0
            AND i.month IN (SELECT jsonb_array_elements_text(e -> 'discount' -> 'months'))
        ) THEN
          reasons := reasons || 'A payment has been recorded on a month the discount covers, so removing it would change a bill that has been paid.'::text;
        ELSE
          DELETE FROM public.discount_assignments WHERE id = (e -> 'discount' ->> 'assignment_id')::uuid;
          DELETE FROM public.discount_definitions d
          WHERE d.id = (e -> 'discount' ->> 'definition_id')::uuid
            AND NOT EXISTS (SELECT 1 FROM public.discount_assignments x WHERE x.discount_def_id = d.id);
        END IF;
      END IF;
    END IF;

    IF e ? 'enrollment_id' THEN
      SELECT * INTO en FROM public.enrollments WHERE id = (e ->> 'enrollment_id')::uuid FOR UPDATE;
      IF FOUND THEN
        SELECT name INTO v_class_name FROM public.classes WHERE id = en.class_id;
        IF en.end_date IS NOT NULL THEN
          reasons := reasons || format('The %s enrolment has been changed since.', coalesce(v_class_name, 'class'));
        ELSE
          SELECT count(*) INTO v_n
          FROM public.attendance at JOIN public.sessions se ON se.id = at.session_id
          WHERE at.student_id = v_student AND se.class_id = en.class_id
            AND (at.marked_by IS NOT NULL OR at.status IS DISTINCT FROM 'Present');
          IF v_n > 0 THEN
            reasons := reasons || format('%s %s lesson(s) have been marked by a person since.', v_n, coalesce(v_class_name, ''));
          ELSIF EXISTS (
            SELECT 1 FROM public.monthly_finance_snapshots
            WHERE student_id = v_student AND month >= to_char(en.start_date, 'YYYY-MM') AND superseded_at IS NULL
          ) THEN
            reasons := reasons || 'A month this enrolment was billed in has been closed.'::text;
          ELSE
            DELETE FROM public.attendance at USING public.sessions se
            WHERE se.id = at.session_id AND at.student_id = v_student AND se.class_id = en.class_id
              AND at.marked_by IS NULL AND at.status = 'Present';
            DELETE FROM public.enrollments WHERE id = en.id;
          END IF;
        END IF;
      END IF;
    END IF;

    IF (e ->> 'student_created')::boolean AND cardinality(reasons) = 0 THEN
      SELECT (linked_user_id IS NOT NULL OR secondary_user_id IS NOT NULL), full_name INTO v_login, v_name
      FROM public.students WHERE id = v_student;
      IF v_login THEN reasons := reasons || 'A login has been set up for this student since.'::text; END IF;
      -- The action's own payment (taken back above) is not "added by people since".
      v_activity := public.ai_student_activity(v_student, v_own);
      IF cardinality(v_activity) > 0 THEN
        reasons := reasons || format('People have added records for this student since: %s.', array_to_string(v_activity, ', '));
      END IF;
      IF cardinality(reasons) = 0 THEN
        DELETE FROM public.attendance WHERE student_id = v_student AND marked_by IS NULL AND status = 'Present';
        DELETE FROM public.invoices WHERE student_id = v_student;
        DELETE FROM public.student_points WHERE student_id = v_student;
        DELETE FROM public.sibling_discount_state WHERE winner_student_id = v_student AND NOT public.ai_month_closed(month);
        IF cardinality(v_own) > 0 OR EXISTS (SELECT 1 FROM public.ledger_accounts la WHERE la.student_id = v_student) THEN
          -- A payment was on the ledger: its entries stay (append-only), so
          -- the child is kept, switched off, instead of deleted.
          UPDATE public.students SET is_active = false, updated_by = v_actor WHERE id = v_student;
          v_kept := true;
          notices := notices || format('%s was not deleted but made inactive: the payment this recorded stays in the ledger''s history (reversed), and a child with ledger history keeps their record. Everything else the assistant set up for them was removed.',
            coalesce(v_name, 'The student'));
        ELSE
          DELETE FROM public.students WHERE id = v_student;
        END IF;
      END IF;
    END IF;

    IF cardinality(reasons) > 0 THEN
      RAISE EXCEPTION 'ai_undo_blocked';
    END IF;
  EXCEPTION
    WHEN raise_exception THEN
      IF cardinality(reasons) = 0 THEN reasons := ARRAY[SQLERRM]; END IF;
      RETURN jsonb_build_object('ok', false, 'reasons', to_jsonb(reasons));
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array(
        'Something else in the app still points at this, so nothing was changed.'));
  END;

  UPDATE public.ai_actions SET status = 'undone', undone_by = v_actor, undone_at = now() WHERE id = a.id;
  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('ai_action', a.id::text, 'ai_action_undo', v_actor,
    jsonb_build_object('student_id', v_student, 'summary', a.summary, 'notices', to_jsonb(notices)));

  RETURN jsonb_build_object('ok', true,
    'student_removed', (e ->> 'student_created')::boolean AND NOT v_kept,
    'student_deactivated', v_kept,
    'payment_reversed', v_pid IS NOT NULL,
    'notices', to_jsonb(notices),
    'open_path', CASE WHEN (e ->> 'student_created')::boolean AND NOT v_kept THEN '/students' ELSE '/students/' || v_student END);
END $function$
;
