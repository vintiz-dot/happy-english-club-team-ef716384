-- Tuition audit, phase 2: the reconciliation register
-- (docs/TUITION_AUDIT_ROLLOUT.md, "Phase 2").
--
-- The audit of 16 Nov 2026 compared the fee spreadsheet with the app's
-- invoices.recorded_payment for Oct 2025 - May 2026 and found families paid
-- 14,174,001 less than the app records. This register holds one row per
-- disputed FAMILY-month (families pay once for siblings), loaded by
-- scripts/load-reconciliation-items.mjs, and lets an admin settle each row
-- exactly once. Every decision that moves money is a payments row made by
-- public.record_admin_payment (20261117121000) - payment row, both ledger
-- legs and the bill in its one transaction - never an edit of a bill.
--
-- Decision kinds (public.decide_tuition_reconciliation_item):
--   sheet_missed       the app is right, the sheet missed it. No money moves.
--   not_received       the money never came: one negative correction per
--                      child bill, memo 'audit: not received'. At most what
--                      each bill holds, and at most the gap the audit found
--                      (app recorded - sheet).
--   wrong_month        booked on the wrong month: corrections on one month
--                      and payments of the same total on the other, all on
--                      one receipt date. One of the two months is the item's.
--   rounding_accepted  a difference of at most 10,000 dong is accepted.
--   refer_phase4       pattern A with no bill in the app (a child who paid
--                      and is not billed): referred to phase 4 (data hygiene).
--
-- What protects it:
--   * Admin-only RLS. The loaded facts (who, month, sheet / recorded / billed
--     amounts, pattern, evidence) never change after insert, and a decision
--     is written only by the RPC: a trigger refuses any UPDATE unless the RPC
--     set the transaction-local flag hec.tuition_reconciliation_item to that
--     row's id. PostgREST does not expose set_config, and each request is its
--     own transaction, so a client cannot set the flag and then update.
--   * A decided row cannot be decided again, nor deleted. An open row can be
--     deleted (by an admin or in the SQL editor) to reload it.
--   * The RPC is SECURITY INVOKER, like record_admin_payment: it runs as the
--     admin, so every write passes the admin's own row security and the money
--     triggers see a person. All of a decision happens or none of it: any
--     refusal - here or inside record_admin_payment - rolls back the payments
--     already made for the same decision.
--
-- Refusals (SQLSTATE):
--   RC403 not a signed-in admin           RC404 no such item
--   RC409 the item is already decided     RC422 a correction larger than the
--                                               bill holds, or than the gap
--   22023 anything else malformed (decision kind, legs, months, note)
--   and whatever record_admin_payment raises (RP4xx), unchanged.
--
-- Rollback (nothing else depends on it):
--   DROP FUNCTION public.decide_tuition_reconciliation_item(uuid, text, text, jsonb, text, timestamptz);
--   DROP TABLE public.tuition_reconciliation_items;
--   DROP FUNCTION public.tuition_reconciliation_items_guard();
-- Payments it made stay, as payments do; reverse one with a correction.

DO $preflight$
BEGIN
  IF to_regprocedure('public.record_admin_payment(uuid,uuid,text,text,integer,text,timestamptz,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Reconciliation register: public.record_admin_payment (20261117121000) is not installed. Nothing was changed.';
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Reconciliation register: public.has_role(uuid, app_role) is missing. Nothing was changed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.students')
                  AND a.attname = 'family_id' AND NOT a.attisdropped) THEN
    RAISE EXCEPTION 'Reconciliation register: students.family_id is missing. Nothing was changed.';
  END IF;
  IF to_regclass('public.families') IS NULL OR to_regclass('public.invoices') IS NULL OR to_regclass('public.audit_log') IS NULL THEN
    RAISE EXCEPTION 'Reconciliation register: families, invoices or audit_log is missing. Nothing was changed.';
  END IF;
  IF to_regclass('public.tuition_reconciliation_items') IS NOT NULL THEN
    RAISE EXCEPTION 'Reconciliation register: public.tuition_reconciliation_items already exists. Nothing was changed.';
  END IF;
END
$preflight$;

CREATE TABLE public.tuition_reconciliation_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which audit the row came from, and a stable key within it (the family,
  -- or the single child, or an unmatched sheet row, plus the month), so a
  -- reload skips what is already there.
  audit_ref       text NOT NULL DEFAULT 'tuition-audit-2026-11-16',
  item_key        text NOT NULL,
  family_id       uuid REFERENCES public.families(id),
  student_ids     uuid[] NOT NULL DEFAULT '{}',
  month           text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  -- The facts as the audit found them (the app's figures as read at load).
  sheet_amount    bigint NOT NULL CHECK (sheet_amount >= 0),
  app_recorded    bigint NOT NULL CHECK (app_recorded >= 0),
  app_billed      bigint CHECK (app_billed >= 0),           -- NULL: no bill in the app
  difference      bigint GENERATED ALWAYS AS (sheet_amount - app_recorded) STORED,
  pattern         text NOT NULL CHECK (pattern IN ('A', 'B', 'C', 'D', 'E', 'F')),
  evidence        text,
  -- The decision.
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'decided')),
  decision        text CHECK (decision IN ('sheet_missed', 'not_received', 'wrong_month', 'rounding_accepted', 'refer_phase4')),
  decision_note   text,
  decision_detail jsonb,
  payment_ids     uuid[] NOT NULL DEFAULT '{}',
  decided_by      uuid,
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid DEFAULT auth.uid(),
  CONSTRAINT tuition_reconciliation_items_key UNIQUE (audit_ref, item_key),
  CONSTRAINT tuition_reconciliation_items_children CHECK (pattern = 'A' OR cardinality(student_ids) > 0),
  CONSTRAINT tuition_reconciliation_items_decided CHECK (
    (status = 'open' AND decision IS NULL AND decided_by IS NULL AND decided_at IS NULL AND cardinality(payment_ids) = 0)
    OR (status = 'decided' AND decision IS NOT NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);

CREATE INDEX tuition_reconciliation_items_month ON public.tuition_reconciliation_items (month, pattern);

COMMENT ON TABLE public.tuition_reconciliation_items IS
  'Tuition audit phase 2 (20261121100000): one disputed family-month from the 16 Nov 2026 audit - sheet cash vs the app''s recorded_payment - and the one decision an admin made on it. Decisions are made only by decide_tuition_reconciliation_item, and money moves only through record_admin_payment.';

-- The loaded facts are fixed; a decision only through the RPC; decided is final.
CREATE FUNCTION public.tuition_reconciliation_items_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'decided' THEN
      RAISE EXCEPTION 'A decided reconciliation item cannot be deleted: its decision and the payments it made are the record.' USING ERRCODE = 'RC409';
    END IF;
    RETURN OLD;
  END IF;

  IF coalesce(current_setting('hec.tuition_reconciliation_item', true), '') <> OLD.id::text THEN
    RAISE EXCEPTION 'A reconciliation item is decided only through decide_tuition_reconciliation_item. Nothing was changed.' USING ERRCODE = 'RC403';
  END IF;
  IF OLD.status = 'decided' THEN
    RAISE EXCEPTION 'This reconciliation item was already decided. Nothing was changed.' USING ERRCODE = 'RC409';
  END IF;
  IF (NEW.id, NEW.audit_ref, NEW.item_key, NEW.family_id, NEW.student_ids, NEW.month, NEW.sheet_amount,
      NEW.app_recorded, NEW.app_billed, NEW.pattern, NEW.evidence, NEW.created_at, NEW.created_by)
     IS DISTINCT FROM
     (OLD.id, OLD.audit_ref, OLD.item_key, OLD.family_id, OLD.student_ids, OLD.month, OLD.sheet_amount,
      OLD.app_recorded, OLD.app_billed, OLD.pattern, OLD.evidence, OLD.created_at, OLD.created_by) THEN
    RAISE EXCEPTION 'The audit''s facts on a reconciliation item cannot be changed. Nothing was changed.' USING ERRCODE = 'RC403';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER tuition_reconciliation_items_guard
  BEFORE UPDATE OR DELETE ON public.tuition_reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION public.tuition_reconciliation_items_guard();

ALTER TABLE public.tuition_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tuition_reconciliation_items_admin_read ON public.tuition_reconciliation_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY tuition_reconciliation_items_admin_insert ON public.tuition_reconciliation_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND status = 'open');
CREATE POLICY tuition_reconciliation_items_admin_update ON public.tuition_reconciliation_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY tuition_reconciliation_items_admin_delete ON public.tuition_reconciliation_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND status = 'open');

-- 20260712023825 revoked the defaults on public: say them explicitly.
REVOKE ALL ON public.tuition_reconciliation_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuition_reconciliation_items TO authenticated;
GRANT ALL ON public.tuition_reconciliation_items TO service_role;

CREATE FUNCTION public.decide_tuition_reconciliation_item(
  p_item_id     uuid,
  p_decision    text,
  p_note        text,
  p_legs        jsonb DEFAULT '[]'::jsonb,   -- [{student_id, month, kind: payment|correction, amount}]
  p_method      text DEFAULT NULL,           -- for the money legs: Cash -> CASH, else BANK
  p_occurred_at timestamptz DEFAULT NULL     -- the receipt date, one for every leg
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor   uuid := auth.uid();
  v_item    public.tuition_reconciliation_items%ROWTYPE;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_legs    jsonb := coalesce(p_legs, '[]'::jsonb);
  v_leg     jsonb;
  v_student uuid;
  v_month   text;
  v_kind    text;
  v_amount  integer;
  v_recorded bigint;
  v_corr_months text[] := '{}';
  v_pay_months  text[] := '{}';
  v_corr_total bigint := 0;
  v_pay_total  bigint := 0;
  v_family_recorded bigint;
  v_memo    text;
  v_pid     uuid;
  v_result  jsonb;
  v_results jsonb := '[]'::jsonb;
  v_pids    uuid[] := '{}';
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only a signed-in admin can settle a reconciliation item. Nothing was changed.' USING ERRCODE = 'RC403';
  END IF;

  SELECT * INTO v_item FROM public.tuition_reconciliation_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such reconciliation item. Nothing was changed.' USING ERRCODE = 'RC404';
  END IF;
  IF v_item.status <> 'open' THEN
    RAISE EXCEPTION 'This item was already decided (%). Nothing was changed.', v_item.decision USING ERRCODE = 'RC409';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('sheet_missed', 'not_received', 'wrong_month', 'rounding_accepted', 'refer_phase4') THEN
    RAISE EXCEPTION 'Unknown decision %. Nothing was changed.', coalesce(p_decision, '(none)') USING ERRCODE = '22023';
  END IF;
  IF v_note IS NULL AND p_decision <> 'rounding_accepted' THEN
    RAISE EXCEPTION 'A decision needs a note saying what it rests on (bank statement, receipt book, the family). Nothing was changed.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(v_note, '')) > 1000 THEN
    RAISE EXCEPTION 'The note is at most 1000 characters. Nothing was changed.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_legs) <> 'array' THEN
    RAISE EXCEPTION 'The money legs must be a list. Nothing was changed.' USING ERRCODE = '22023';
  END IF;

  -- Decisions that move no money.
  IF p_decision IN ('sheet_missed', 'rounding_accepted', 'refer_phase4') THEN
    IF jsonb_array_length(v_legs) > 0 THEN
      RAISE EXCEPTION 'A % decision moves no money; it takes no payments or corrections. Nothing was changed.', p_decision USING ERRCODE = '22023';
    END IF;
    IF p_decision = 'rounding_accepted' AND abs(v_item.difference) > 10000 THEN
      RAISE EXCEPTION 'A difference of % dong is more than rounding (at most 10,000). Nothing was changed.', v_item.difference USING ERRCODE = '22023';
    END IF;
    IF p_decision = 'refer_phase4' AND v_item.pattern <> 'A' THEN
      RAISE EXCEPTION 'Only a pattern A item (paid, no bill in the app) is referred to phase 4. Nothing was changed.' USING ERRCODE = '22023';
    END IF;
  ELSE
    -- Money: check every leg before writing anything.
    IF jsonb_array_length(v_legs) = 0 THEN
      RAISE EXCEPTION 'A % decision needs at least one payment or correction. Nothing was changed.', p_decision USING ERRCODE = '22023';
    END IF;
    IF p_occurred_at IS NULL OR p_occurred_at > now() + interval '1 day' THEN
      RAISE EXCEPTION 'The receipt date is required and cannot be in the future. Nothing was changed.' USING ERRCODE = '22023';
    END IF;
    IF nullif(btrim(coalesce(p_method, '')), '') IS NULL THEN
      RAISE EXCEPTION 'The method (Cash or Bank Transfer) is required. Nothing was changed.' USING ERRCODE = '22023';
    END IF;

    FOR v_leg IN SELECT value FROM jsonb_array_elements(v_legs) LOOP
      BEGIN
        v_student := (v_leg->>'student_id')::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'A leg names a student that is not an id. Nothing was changed.' USING ERRCODE = '22023';
      END;
      v_month := v_leg->>'month';
      v_kind := v_leg->>'kind';
      IF coalesce(jsonb_typeof(v_leg->'amount'), '') <> 'number' THEN
        RAISE EXCEPTION 'Each amount is a whole number of dong from 1 to 500,000,000. Nothing was changed.' USING ERRCODE = '22023';
      END IF;
      IF (v_leg->>'amount')::numeric <> trunc((v_leg->>'amount')::numeric)
         OR (v_leg->>'amount')::numeric < 1 OR (v_leg->>'amount')::numeric > 500000000 THEN
        RAISE EXCEPTION 'Each amount is a whole number of dong from 1 to 500,000,000. Nothing was changed.' USING ERRCODE = '22023';
      END IF;
      v_amount := (v_leg->>'amount')::integer;
      IF v_student IS NULL OR v_month IS NULL OR v_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR coalesce(v_kind, '') NOT IN ('payment', 'correction') THEN
        RAISE EXCEPTION 'Each leg needs a student, a month (YYYY-MM) and a kind (payment or correction). Nothing was changed.' USING ERRCODE = '22023';
      END IF;
      -- Only this family's children.
      IF NOT (v_student = ANY (v_item.student_ids)
              OR (v_item.family_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.students s WHERE s.id = v_student AND s.family_id = v_item.family_id))) THEN
        RAISE EXCEPTION 'A leg names a child who is not in this family. Nothing was changed.' USING ERRCODE = '22023';
      END IF;

      IF p_decision = 'not_received' THEN
        IF v_kind <> 'correction' OR v_month <> v_item.month THEN
          RAISE EXCEPTION 'Not received takes corrections on % only. Nothing was changed.', v_item.month USING ERRCODE = '22023';
        END IF;
      END IF;
      IF v_kind = 'correction' THEN
        v_corr_total := v_corr_total + v_amount;
        IF NOT v_month = ANY (v_corr_months) THEN v_corr_months := v_corr_months || v_month; END IF;
      ELSE
        v_pay_total := v_pay_total + v_amount;
        IF NOT v_month = ANY (v_pay_months) THEN v_pay_months := v_pay_months || v_month; END IF;
      END IF;
    END LOOP;

    IF p_decision = 'not_received' THEN
      IF v_corr_total > v_item.app_recorded - v_item.sheet_amount THEN
        RAISE EXCEPTION 'A correction of % is more than the % the app holds over the sheet for this family-month. Nothing was changed.',
          v_corr_total, greatest(v_item.app_recorded - v_item.sheet_amount, 0) USING ERRCODE = 'RC422';
      END IF;
    ELSE -- wrong_month
      IF cardinality(v_corr_months) <> 1 OR cardinality(v_pay_months) <> 1 OR v_corr_months[1] = v_pay_months[1] THEN
        RAISE EXCEPTION 'Wrong month takes corrections on one month and payments on one other month. Nothing was changed.' USING ERRCODE = '22023';
      END IF;
      IF v_item.month NOT IN (v_corr_months[1], v_pay_months[1]) THEN
        RAISE EXCEPTION 'One of the two months must be this item''s month, %. Nothing was changed.', v_item.month USING ERRCODE = '22023';
      END IF;
      IF v_corr_total <> v_pay_total THEN
        RAISE EXCEPTION 'Wrong month moves money: the corrections (%) and the payments (%) must be equal. Nothing was changed.', v_corr_total, v_pay_total USING ERRCODE = '22023';
      END IF;
    END IF;

    -- What the bills hold now, for the whole correction month (locked by
    -- record_admin_payment's FOR UPDATE as each leg is written).
    SELECT coalesce(sum(i.recorded_payment), 0) INTO v_family_recorded
      FROM public.invoices i
     WHERE i.month = v_corr_months[1]
       AND i.student_id IN (SELECT (l->>'student_id')::uuid FROM jsonb_array_elements(v_legs) l WHERE l->>'kind' = 'correction');
    IF v_corr_total > v_family_recorded THEN
      RAISE EXCEPTION 'A correction of % is more than the % these bills hold for %. Nothing was changed.', v_corr_total, v_family_recorded, v_corr_months[1] USING ERRCODE = 'RC422';
    END IF;

    v_memo := CASE WHEN p_decision = 'not_received' THEN 'audit: not received'
                   ELSE format('audit: wrong month, %s to %s', v_corr_months[1], v_pay_months[1]) END;

    -- Corrections first, so a bill is never briefly over-recorded.
    FOR v_leg IN SELECT value FROM jsonb_array_elements(v_legs) ORDER BY (value->>'kind') = 'payment' LOOP
      v_student := (v_leg->>'student_id')::uuid;
      v_month := v_leg->>'month';
      v_kind := v_leg->>'kind';
      v_amount := (v_leg->>'amount')::integer;

      SELECT i.recorded_payment INTO v_recorded FROM public.invoices i
       WHERE i.student_id = v_student AND i.month = v_month FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'There is no % bill for one of the children, so nothing can be recorded on it. Nothing was changed.', v_month USING ERRCODE = 'RP424';
      END IF;
      v_recorded := coalesce(v_recorded, 0);
      IF v_kind = 'correction' AND v_amount > v_recorded THEN
        RAISE EXCEPTION 'The % bill holds %; a correction of % is larger than that. Nothing was changed.', v_month, v_recorded, v_amount USING ERRCODE = 'RC422';
      END IF;

      v_pid := gen_random_uuid();
      v_result := public.record_admin_payment(v_pid, v_student, v_month, v_kind, v_amount, p_method, p_occurred_at, v_memo, v_recorded::integer);
      v_pids := v_pids || v_pid;
      v_results := v_results || jsonb_build_array(v_result);
    END LOOP;
  END IF;

  PERFORM set_config('hec.tuition_reconciliation_item', v_item.id::text, true);
  UPDATE public.tuition_reconciliation_items
     SET status = 'decided',
         decision = p_decision,
         decision_note = v_note,
         decision_detail = jsonb_build_object('legs', v_legs, 'method', p_method, 'occurred_at', p_occurred_at, 'results', v_results),
         payment_ids = v_pids,
         decided_by = v_actor,
         decided_at = now()
   WHERE id = v_item.id;
  PERFORM set_config('hec.tuition_reconciliation_item', '', true);

  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('tuition_reconciliation_item', v_item.id::text, 'reconciliation_decision', v_actor,
          jsonb_build_object('decision', p_decision, 'month', v_item.month, 'family_id', v_item.family_id,
                             'pattern', v_item.pattern, 'sheet_amount', v_item.sheet_amount,
                             'app_recorded', v_item.app_recorded, 'payment_ids', to_jsonb(v_pids), 'note', v_note));

  RETURN jsonb_build_object('ok', true, 'itemId', v_item.id, 'decision', p_decision,
                            'paymentIds', to_jsonb(v_pids), 'payments', v_results);
END
$function$;

REVOKE ALL ON FUNCTION public.decide_tuition_reconciliation_item(uuid, text, text, jsonb, text, timestamptz) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.decide_tuition_reconciliation_item(uuid, text, text, jsonb, text, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.decide_tuition_reconciliation_item(uuid, text, text, jsonb, text, timestamptz) IS
  'Tuition audit phase 2 (20261121100000): an admin settles one reconciliation item once - sheet_missed / rounding_accepted / refer_phase4 move no money; not_received and wrong_month write payments and corrections through record_admin_payment - all in one transaction. SECURITY INVOKER; EXECUTE for authenticated only.';
