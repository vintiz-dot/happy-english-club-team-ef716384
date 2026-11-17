-- payments-followups item 4 (docs/evidence/PAYMENTS-followups.md): the
-- assistant's tuition-payment step records the payment the way every admin
-- payment screen does - through public.record_admin_payment (20261117121000) -
-- and its undo takes it back the way Delete payment does.
--
-- WHAT WAS WRONG (D5 G-1). ai_action_apply's payment step added to
-- invoices.recorded_payment and wrote an audit row, nothing else: no payments
-- row, no ledger legs. CHECK-money-invariants M03 counted every one, and
-- Delete payment could not take one back (nothing to delete).
--
-- APPLY. The payment step calls public.record_admin_payment in the same
-- transaction (apply is already all of it or none): the payments row, both
-- ledger legs keyed record-payment-<payment>-<child>, the bill by
-- compare-and-set under its row lock with the one label rule, and the audit
-- row (via 'record-payment'). A month with no bill gets a bill with no charge
-- first (as before; calculate-tuition prices it on its next read), because
-- record_admin_payment records only on a bill that exists. The action's own
-- audit row for the payment is no longer written: record_admin_payment's is
-- the one, and two would print the payment twice on the statement. More than
-- 500,000,000 in one payment (record_admin_payment's bound; the plan check
-- allows up to 1,000,000,000) is refused before anything is written.
--   WHO, inside: ai_action_apply is SECURITY DEFINER (owner postgres), and
--   record_admin_payment is SECURITY INVOKER, so it runs as the owner - who
--   may EXECUTE it (the owner always may; it is revoked from PUBLIC / anon /
--   service_role only) and whose row security is apply's, as for every other
--   write apply makes. Its admin check reads auth.uid(), the JWT's subject,
--   which a definer function does not change: it still sees the admin who
--   pressed Confirm (apply checked the same thing first). The D4 triggers
--   decide the lane from auth.uid() too (_caller_lane: 'person').
--
-- UNDO of a payment recorded this way (effects.payment.payment_id), as
-- delete-payment deletes a payment: two reversal legs keyed
-- payment-reversal-<payment>-<leg> (the ledger is append-only, G-11: nothing
-- there is updated or deleted), the amount taken off the bill by
-- compare-and-set under the row lock (label by invoice_paid_label, an admin's
-- 'credit' kept, paid_amount floored at 0), a payment_deletions snapshot, the
-- payments row deleted, an audit row ('payment', 'delete'). Refused, with
-- reasons, when the payment was deleted or changed since, was already
-- reversed, or its bill now holds less than it put there - as before.
-- An action applied before this migration (bill only, no payment_id) is
-- undone exactly as before.
--   The payments row is deleted by the trigger's rules: payments has
--   prevent_client_payment_deletion (20251024152825), which lets only the
--   service role delete. This migration lets ONE more caller through:
--   ai_action_undo(uuid), recognised from the server's own call stack (the
--   outermost frame, the only function of that name, public, plpgsql,
--   SECURITY DEFINER - the test D4's register guard uses for the same RPCs).
--   A client cannot fake the stack. And the row deleted must be the payment
--   an assistant action recorded (effects.payment.payment_id), of that
--   action's child, while that action is not undone (review B-1): any other
--   payments delete under undo's frame - a cascade, a trigger on a table undo
--   writes - is refused as before (ai_actions is not writable by clients).
--   Everything else the trigger did is kept as it was, including its answer
--   to a caller with no JWT role (the SQL editor): allowed, as before.
--
-- UNDO of an action that CREATED the child and recorded a payment: the child
-- is no longer deleted - it is DEACTIVATED (students.is_active = false). Its
-- ledger accounts and legs stay (append-only; a cascade from deleting the
-- child would meet G-11's trigger), and D4 G-21 refuses to delete a child
-- with money history anyway. Everything else the assistant made for the
-- child is removed as before (enrolment and its placeholder marks, discount,
-- family, hold, bills with no money on them, points rows). The answer says so
-- in `notices` and sets `student_deactivated`.
--
-- ai_student_activity(student, own payments) counts as before, except the
-- action's own money: its payments rows, the ledger transactions of those
-- payments and of their reversals (counted as ledger entries now, not
-- accounts: an account is a container every payment path creates), and the
-- invoice_state_floor rows (D4) of their months. A bill a person confirmed
-- or froze counts too (review M-1: a new child's bill confirmed in between
-- would otherwise be deleted by the undo); calculate-tuition's own
-- 'auto_approved' / 'needs_review' do not. The one-argument form is the same
-- rule with no own payments.
--
-- A refusal by a D4 money guard during undo (SQLSTATE class HC: HC120 a
-- checked path is needed, HC121 refused, ...) is returned as a reason in the
-- guard's own words, with everything rolled back - never a raw error (review
-- N-1). Any other error still propagates.
--
-- Fails closed: refuses to install (nothing changed) unless ai_action_apply,
-- ai_action_undo, ai_student_activity(uuid) and
-- prevent_direct_payment_deletion() are exactly the installed versions this
-- replaces (or already this migration's - safe to paste twice), and
-- record_admin_payment, invoice_paid_label, auth.uid(), auth.role() and every
-- table and column used here exist.
-- Rollback: paste docs/sql/ai_action_apply_undo.installed.sql as it was
-- before this change (git history) for apply / undo, the trigger function
-- from 20251024152825, and DROP FUNCTION public.ai_student_activity(uuid,
-- uuid[]) after restoring the one-argument body from 20261107090000.

DO $preflight$
DECLARE
  missing text[] := '{}';
  r record;
  v_md5 text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('payments', 'id'), ('payments', 'student_id'), ('payments', 'amount'),
      ('payment_deletions', 'payment_id'), ('payment_deletions', 'snapshot'), ('payment_deletions', 'deleted_by'),
      ('payment_deletions', 'deletion_reason'),
      ('ledger_accounts', 'id'), ('ledger_accounts', 'student_id'),
      ('ledger_entries', 'tx_id'), ('ledger_entries', 'tx_key'), ('ledger_entries', 'account_id'), ('ledger_entries', 'debit'),
      ('ledger_entries', 'credit'), ('ledger_entries', 'occurred_at'), ('ledger_entries', 'memo'), ('ledger_entries', 'month'),
      ('ledger_entries', 'created_by'),
      ('invoices', 'id'), ('invoices', 'recorded_payment'), ('invoices', 'paid_amount'), ('invoices', 'status'),
      ('invoices', 'confirmation_status'), ('invoices', 'confirmed_by'), ('invoices', 'tuition_frozen'),
      ('ai_actions', 'status'), ('ai_actions', 'student_id'), ('ai_actions', 'effects'),
      ('students', 'is_active'), ('students', 'updated_by'),
      ('audit_log', 'entity'), ('audit_log', 'entity_id'), ('audit_log', 'action'), ('audit_log', 'actor_user_id'), ('audit_log', 'diff')
    ) AS v(t, c)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || r.t) AND a.attname = r.c AND a.attnum > 0 AND NOT a.attisdropped) THEN
      missing := missing || (r.t || '.' || r.c);
    END IF;
  END LOOP;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'ai payment on ledger: missing column(s) %. Nothing was changed.', array_to_string(missing, ', ');
  END IF;

  IF to_regprocedure('public.record_admin_payment(uuid,uuid,text,text,integer,text,timestamptz,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'ai payment on ledger: public.record_admin_payment is not installed (20261117121000). Nothing was changed.';
  END IF;
  IF to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'ai payment on ledger: public.invoice_paid_label is not installed (20261113090000). Nothing was changed.';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('auth.role()') IS NULL THEN
    RAISE EXCEPTION 'ai payment on ledger: auth.uid() / auth.role() missing. Nothing was changed.';
  END IF;
  IF to_regprocedure('public.ai_student_activity(uuid,uuid[])') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.ai_student_activity(uuid,uuid[])')
                      AND md5(replace(pg_get_functiondef(oid), E'\r', '')) = 'e7f2db8d3265662456b3b462ee6b1c72') THEN
    RAISE EXCEPTION 'ai payment on ledger: another public.ai_student_activity(uuid, uuid[]) exists. Nothing was changed.';
  END IF;

  -- The installed versions this replaces (CR-stripped md5 of
  -- pg_get_functiondef, read on live 17 Nov), or this migration's own.
  FOR r IN SELECT * FROM (VALUES
      ('public.ai_action_apply(uuid,text,jsonb)', '8477e385f87db926fb9b579f3bc59f3d', '7f5b1484fb593b4e351fb473f0e800a4'),
      ('public.ai_action_undo(uuid)', '1bc731cc701c7f5169bb08f64e48c3d9', 'ef4e1709cd1330753879fd186273c158'),
      ('public.ai_student_activity(uuid)', '81a2e0978c4c08580db4951d3c7edde7', 'ed908438003457e75bb6c9dc7a74c7fe'),
      ('public.prevent_direct_payment_deletion()', '386cdfe287e67f8146615f871e3dbe96', 'ef7ae4794e85e4a52d59604719994050')
    ) AS v(sig, was, now_)
  LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      RAISE EXCEPTION 'ai payment on ledger: % is not installed. Nothing was changed.', r.sig;
    END IF;
    SELECT md5(replace(pg_get_functiondef(to_regprocedure(r.sig)), E'\r', '')) INTO v_md5;
    IF v_md5 NOT IN (r.was, r.now_) THEN
      RAISE EXCEPTION 'ai payment on ledger: % is not the version this replaces (md5 %, expected %). Nothing was changed: start from what is installed.', r.sig, v_md5, r.was;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.payments'::regclass
                  AND t.tgname = 'prevent_client_payment_deletion' AND NOT t.tgisinternal
                  AND t.tgfoid = 'public.prevent_direct_payment_deletion()'::regprocedure) THEN
    RAISE EXCEPTION 'ai payment on ledger: payments has no prevent_client_payment_deletion trigger. Nothing was changed.';
  END IF;
END
$preflight$;

-- ------------------------------------------------- the payments delete rule
CREATE OR REPLACE FUNCTION public.prevent_direct_payment_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ctx text;
  v_lines text[];
BEGIN
  -- Allow deletion only from service role (edge functions) - and, as before,
  -- from a caller with no JWT role at all (the SQL editor).
  IF (auth.role() != 'service_role') IS NOT TRUE THEN
    RETURN OLD;
  END IF;
  -- And from ai_action_undo, which takes back a payment its own assistant
  -- action recorded the way delete-payment does (reversal legs, off the bill,
  -- a payment_deletions snapshot) - 20261117150000. Read from the SERVER's
  -- call stack: the outermost frame must be exactly that function, the only
  -- one of its name, public, plpgsql, SECURITY DEFINER.
  GET DIAGNOSTICS v_ctx = PG_CONTEXT;
  v_lines := string_to_array(coalesce(v_ctx, ''), E'\n');
  IF v_lines[array_length(v_lines, 1)] ~ '^PL/pgSQL function (public\.)?ai_action_undo\(uuid\) line [0-9]+ at SQL statement$'
     AND (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.proname = 'ai_action_undo') = 1
     AND EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
                  WHERE p.proname = 'ai_action_undo' AND p.pronamespace = 'public'::regnamespace
                    AND p.prosecdef AND l.lanname = 'plpgsql')
     -- ... and only for THE payment an assistant action recorded, of that
     -- action's child, while the action is not yet undone (review B-1: the
     -- frame alone let any payments delete under undo through - a cascade,
     -- or a trigger on a table undo writes). The status turns 'undone' only
     -- after undo's DELETE; clients cannot write ai_actions; only apply
     -- writes payment_id, from record_admin_payment's key.
     AND EXISTS (SELECT 1 FROM public.ai_actions x
                  WHERE x.status IS DISTINCT FROM 'undone'
                    AND x.student_id = OLD.student_id
                    AND x.effects -> 'payment' ->> 'payment_id' = OLD.id::text) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Direct payment deletion is not allowed. Use the delete-payment edge function instead.';
END;
$function$;

-- ---------------------------------------------- what people did since
CREATE OR REPLACE FUNCTION public.ai_student_activity(p_student uuid, p_own_payments uuid[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_n bigint;
  v_extra text;
  found text[] := '{}';
  v_own uuid[] := coalesce(p_own_payments, '{}');
  v_own_tx uuid[];
  v_own_months text[];
BEGIN
  -- The action's own money: the ledger transactions of its payments (keyed
  -- record-payment-<payment>-<child>) and of their reversals (keyed
  -- payment-reversal-<payment>-<leg>), each read whole by tx_id, and their months.
  SELECT coalesce(array_agg(DISTINCT x.tx_id), '{}'), coalesce(array_agg(DISTINCT x.month) FILTER (WHERE x.month IS NOT NULL), '{}')
    INTO v_own_tx, v_own_months
  FROM public.ledger_entries x
  WHERE x.tx_id IN (
    SELECT e.tx_id FROM public.ledger_entries e
    JOIN public.ledger_accounts a ON a.id = e.account_id AND a.student_id = p_student
    WHERE EXISTS (SELECT 1 FROM unnest(v_own) o
                   WHERE e.tx_key = 'record-payment-' || o::text || '-' || p_student::text
                      OR e.tx_key LIKE 'payment-reversal-' || o::text || '-%'));

  FOR r IN
    SELECT DISTINCT tbl, col FROM (
      SELECT c.table_name::text AS tbl, c.column_name::text AS col
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.data_type = 'uuid' AND c.column_name LIKE '%student_id'
      UNION
      SELECT cl.relname::text, a.attname::text
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace AND ns.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
      WHERE con.contype = 'f' AND con.confrelid = 'public.students'::regclass AND cardinality(con.conkey) = 1
    ) refs
    WHERE tbl NOT IN ('students', 'ai_actions', 'sibling_discount_state')
    ORDER BY tbl
  LOOP
    IF r.tbl = 'ledger_accounts' THEN
      -- Entries on the child's accounts that are not the action's own.
      EXECUTE format('SELECT count(*) FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
                       WHERE a.%I = $1 AND NOT (e.tx_id = ANY ($2))', r.col)
        INTO v_n USING p_student, v_own_tx;
    ELSE
      v_extra := CASE r.tbl
        WHEN 'attendance' THEN ' AND (marked_by IS NOT NULL OR status IS DISTINCT FROM ''Present'')'
        -- money on it, or a person's act on it: confirmed (confirm-tuition: confirmed / adjusted,
        -- confirmed_by) or frozen. calculate-tuition's auto_approved / needs_review are not a person's.
        WHEN 'invoices' THEN ' AND (coalesce(recorded_payment, 0) <> 0 OR coalesce(paid_amount, 0) <> 0'
                          || ' OR confirmed_by IS NOT NULL OR confirmation_status IN (''confirmed'', ''adjusted'') OR coalesce(tuition_frozen, false))'
        WHEN 'student_points' THEN ' AND coalesce(total_points, 0) <> 0'
        WHEN 'payments' THEN ' AND NOT (id = ANY ($2))'
        WHEN 'invoice_state_floor' THEN ' AND NOT (month = ANY ($3))'
        ELSE ''
      END;
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1%s', r.tbl, r.col, v_extra)
        INTO v_n USING p_student, v_own, v_own_months;
    END IF;
    IF v_n > 0 THEN
      found := found || format('%s %s', v_n, CASE r.tbl
        WHEN 'attendance' THEN 'lesson mark(s) made by a person'
        WHEN 'invoices' THEN 'bill(s) with money on them or confirmed or frozen by a person'
        WHEN 'payments' THEN 'payment(s)'
        WHEN 'ledger_accounts' THEN 'ledger entry(ies)'
        WHEN 'point_transactions' THEN 'points award(s)'
        WHEN 'homework_submissions' THEN 'homework submission(s)'
        WHEN 'enrollments' THEN 'enrolment(s) added since'
        WHEN 'discount_assignments' THEN 'discount(s) added since'
        WHEN 'monthly_finance_snapshots' THEN 'closed month record(s)'
        ELSE replace(r.tbl, '_', ' ') || ' row(s)'
      END);
    END IF;
  END LOOP;
  RETURN found;
END $function$
;

CREATE OR REPLACE FUNCTION public.ai_student_activity(p_student uuid)
 RETURNS text[]
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.ai_student_activity(p_student, '{}'::uuid[])
$function$
;

-- ------------------------------------------------------------ apply
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

-- ------------------------------------------------------------- undo
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
  v_err_detail text;
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
    WHEN OTHERS THEN
      -- A D4 money guard (SQLSTATE class HC) refused a write: everything
      -- above is rolled back; say why in the guard's words (its DETAIL ends
      -- with the sentence for a person). Any other error propagates.
      IF SQLSTATE LIKE 'HC%' THEN
        GET STACKED DIAGNOSTICS v_err_detail = PG_EXCEPTION_DETAIL;
        RETURN jsonb_build_object('ok', false, 'reasons', jsonb_build_array(format(
          'The money guard refused part of this undo (%s), so nothing was changed: %s', SQLSTATE,
          coalesce(nullif(btrim(regexp_replace(coalesce(v_err_detail, ''), '^.*;\s*', '')), ''), SQLERRM))));
      END IF;
      RAISE;
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

REVOKE ALL ON FUNCTION public.ai_student_activity(uuid, uuid[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ai_student_activity(uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ai_action_apply(uuid, text, jsonb) IS
  'Assistant set-up actions, applied on the admin''s Confirm (20261107090000). Since 20261117150000 its payment step records through public.record_admin_payment: payments row, both ledger legs, the bill and the audit row, in this transaction.';
COMMENT ON FUNCTION public.ai_action_undo(uuid) IS
  'Undo of one assistant action (20261107090000). Since 20261117150000 a payment recorded on the ledger is taken back as delete-payment does (reversal legs, off the bill, payment_deletions, the row deleted), and a child the action created is deactivated rather than deleted once such a payment exists.';
