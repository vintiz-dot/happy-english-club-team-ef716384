-- D4 step 3B: the money inputs (G-13 to G-19, G-21).
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.0, b.4, b.5, b.8,
-- c.0, c.5. Build notes, every decision the design left open, and the tests
-- that prove each guard: docs/evidence/D4-build-3b.md.
--
-- WHAT THIS ADDS
--   triggers  enrollments.zz_enrollment_money_guard            (G-13)
--             discount_assignments / referral_bonuses.zz_discount_money_guard (G-15)
--             discount_definitions.zz_discount_definition_guard (G-15)
--             staff_pay_rates.zz_pay_rate_money_guard           (G-17)
--             teachers / teaching_assistants.zz_staff_pay_mirror_guard (G-17)
--             invoices.zz_invoice_unfreeze_guard                (G-18)
--             students / families.zz_family_link_guard          (G-19)
--             students.zz_student_delete_guard, classes.zz_class_delete_guard (G-21)
--             families.audit_families (the table was not in the audit list)
--   RPC       change_enrollment_terms(enrollment, terms, effective_date)  (G-14,
--             "from this date" for a rate or a discount; admin JWT only)
--   entities  the plan / exec pairs of enrollment, discount_assignment,
--             referral_bonus, pay_rate, invoice_freeze, family_link, reached
--             through step 1b's money_change_preview / money_change_checked.
--             The dispatcher is NOT re-created.
--
-- THE RULE OF EVERY TRIGGER HERE. Work out what the write reaches (which
-- children - the whole family, R-8a - or which member of staff, which
-- dates), turn that into a tier from stored facts, and then:
--   tier 0                          -> the write passes, as it does today
--   an acknowledgement of THIS transaction (money_change_checked) for the
--   same entity, child, window and at least that tier -> passes
--   the owner lane (SQL editor)     -> passes, and one owner_lane event
--   anyone else, the service role included -> HC120
-- A row that would change child (an enrolment's child or class, a discount's
-- child) is HC121 on every lane; so is deleting a student who has payments,
-- paid bills or marks made by a person, and a class that has enrolments.
--
-- REPLACES ONE BODY of step 1b: _money_enrollment_rpc_call() (same
-- signature, same attributes, no grants). Step 1b's register guard lets the
-- live enrolment RPCs' own register writes through, recorded, "until step 3B
-- gives enrolments their own checked path". This is that step: the helper
-- now also answers while an 'enrollment' change of money_change_checked is
-- running (its end / transfer / pause call those same RPCs), and a DIRECT
-- pause_enrollment is no longer taken for one while the enrolment guard is
-- installed (the checked 'pause' is its path). Nothing else of D1, D2, step
-- 1a or step 1b is replaced. No row is changed. Safe to paste twice.
--
-- Rollback: scripts/ROLLBACK-d4-5-money-inputs.sql.

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'public._caller_lane()',
    'public._money_ack(text[], uuid, uuid, date, date, integer)',
    'public.tuition_reach(uuid[], uuid, date, date)',
    'public.tuition_month_state(uuid, text)',
    'public.payroll_reach(uuid, uuid, date, date)',
    'public._money_month_is_past(text)',
    'public._lesson_in_free_week(date, time without time zone, time without time zone)',
    'public._money_enrollment_rpc_call()',
    'public._money_change_plan(text, text, jsonb, uuid)',
    'public._money_change_exec(text, jsonb, uuid)',
    'public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb)',
    'public.has_role(uuid, public.app_role)',
    'public.audit_row_change()',
    'public.end_enrollment(uuid, uuid, date)',
    'public.change_enrollment_days(uuid, integer[], date)',
    'public.modify_enrollment_transfer(uuid, uuid, uuid, date)',
    'public.pause_enrollment(uuid, uuid, date, date, text)',
    'auth.uid()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;
  -- The step 1a / 1b bodies this file relies on or replaces, as reviewed
  -- (md5 of the LF text: a paste with CRLF is the same body).
  FOR r IN SELECT * FROM (VALUES
      ('public._caller_lane()', ARRAY['66001c3b6eb716a6380e4155fba75409']),
      ('public._money_ack(text[], uuid, uuid, date, date, integer)', ARRAY['471a55638387068f1279a2d7c669c4c4']),
      ('public.tuition_reach(uuid[], uuid, date, date)', ARRAY['d48607bb917eb05de1acd586e0c83b4f']),
      ('public.tuition_month_state(uuid, text)', ARRAY['733840210ed1f3360fb9c3122d5466b9']),
      ('public.payroll_reach(uuid, uuid, date, date)', ARRAY['5ccecd82b3d859cb5ec37f4b0ac7973f']),
      ('public._money_enrollment_rpc_call()', ARRAY['8796eb026e4187149b639f7efa82e81d',     -- step 1b
                                                    'b63e90a3ef684c6e32c800401194e809'])   -- this file
    ) AS t(sig, want)
  LOOP
    IF to_regprocedure(r.sig) IS NOT NULL
       AND NOT ((SELECT md5(replace(p.prosrc, E'\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig)) = ANY (r.want)) THEN
      v_missing := v_missing || ('function ' || r.sig || ' is not the reviewed step 1a / 1b body (expected md5 '
                                 || array_to_string(r.want, ' or ') || ')');
    END IF;
  END LOOP;
  FOR r IN
    SELECT * FROM (VALUES
      ('money_change_overrides', ARRAY['id','txid','entity','op','target_id','student_ids','reach_from','reach_to','tier','change']),
      ('money_change_events',  ARRAY['kind','payload','actor_user_id']),
      ('enrollments',          ARRAY['id','student_id','class_id','start_date','end_date','allowed_days','rate_override_vnd',
                                     'discount_type','discount_value','discount_cadence','created_by','updated_by','updated_at',
                                     'created_at']),
      ('discount_assignments', ARRAY['id','student_id','discount_def_id','effective_from','effective_to','note']),
      ('referral_bonuses',     ARRAY['id','student_id','type','value','cadence','effective_from','effective_to','note']),
      ('discount_definitions', ARRAY['id','type','value','cadence','start_month','end_month','amortize_yearly','is_active']),
      ('staff_pay_rates',      ARRAY['id','teacher_id','assistant_id','effective_from','pay_rate_type','hourly_rate_vnd',
                                     'per_session_rate_vnd','note','created_by']),
      ('teachers',             ARRAY['id','pay_rate_type','hourly_rate_vnd','per_session_rate_vnd']),
      ('teaching_assistants',  ARRAY['id','pay_rate_type','hourly_rate_vnd','per_session_rate_vnd']),
      ('invoices',             ARRAY['id','student_id','month','status','recorded_payment','confirmation_status','tuition_frozen']),
      ('invoice_state_floor',  ARRAY['student_id','month','ever_paid','ever_signed','ever_frozen','max_recorded_payment']),
      ('students',             ARRAY['id','family_id','sibling_discount_from']),
      ('families',             ARRAY['id','sibling_percent_override']),
      ('classes',              ARRAY['id']),
      ('payments',             ARRAY['id','student_id']),
      ('attendance',           ARRAY['session_id','student_id','status','marked_by']),
      ('sessions',             ARRAY['id','class_id','date','start_time','end_time','status','teacher_id']),
      ('payroll_periods',      ARRAY['month','status']),
      ('audit_log',            ARRAY['actor_user_id','action','entity','entity_id','diff'])
    ) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      v_missing := v_missing || ('table public.' || r.tbl);
    ELSE
      v_missing := v_missing || ARRAY(
        SELECT 'column public.' || r.tbl || '.' || c FROM unnest(r.cols) AS c
         WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                            WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = c));
    END IF;
  END LOOP;
  IF to_regclass('public.attendance') IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'public.attendance'::regclass AND t.tgname = 'zz_attendance_money_guard') THEN
    v_missing := v_missing || 'trigger attendance.zz_attendance_money_guard (paste 20261114091000_d4_core_register first)'::text;
  END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_money_inputs_guard cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the migrations that create these first (D1, D2, D4 files 1 and 2). Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- Small readers shared by the triggers and the plans, so the two can never
-- disagree about what a write reaches.

CREATE OR REPLACE FUNCTION public._money_uuid(p text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
BEGIN
  IF p IS NULL OR p !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NULL; END IF;
  RETURN p::uuid;
END $fn$;

CREATE OR REPLACE FUNCTION public._money_date(p text)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
BEGIN
  IF p IS NULL OR p !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
  RETURN p::date;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $fn$;

-- Every child of the families of these children (R-8a: a sibling's bill can
-- move with an enrolment, a discount or a family change).
CREATE OR REPLACE FUNCTION public._money_family_kids(p_students uuid[])
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(array_agg(DISTINCT q.k ORDER BY q.k), ARRAY[]::uuid[]) FROM (
    SELECT unnest(COALESCE(p_students, ARRAY[]::uuid[])) AS k
    UNION
    SELECT st2.id FROM public.students st JOIN public.students st2 ON st2.family_id = st.family_id
     WHERE st.id = ANY (COALESCE(p_students, ARRAY[]::uuid[])) AND st.family_id IS NOT NULL) q
   WHERE q.k IS NOT NULL
$fn$;

-- What a row change reaches in days: {cols, from, to, open, none}.
--   INSERT / DELETE (o or n NULL): the row's span.
--   only the start or end date changed: the days entering or leaving.
--   any other pricing column changed: the whole span of both versions.
-- p_lead days are taken off the start (a discount dated the 1st is read by
-- the calculator for the month before as well).
CREATE OR REPLACE FUNCTION public._money_span(o jsonb, n jsonb, p_start text, p_end text, p_other text[], p_lead int)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  os date := (o ->> p_start)::date;
  oe date := (o ->> p_end)::date;
  ns date := (n ->> p_start)::date;
  ne date := (n ->> p_end)::date;
  v_cols text[] := ARRAY[]::text[];
  c text;
  v_from date;
  v_to date;
  v_open boolean := false;
BEGIN
  IF o IS NULL OR n IS NULL THEN
    RETURN jsonb_build_object('cols', jsonb_build_array('*'), 'none', false,
                              'from', COALESCE(os, ns) - p_lead, 'to', COALESCE(oe, ne),
                              'open', COALESCE(oe, ne) IS NULL);
  END IF;
  FOREACH c IN ARRAY (ARRAY[p_start, p_end] || p_other) LOOP
    IF (o -> c) IS DISTINCT FROM (n -> c) THEN v_cols := v_cols || c; END IF;
  END LOOP;
  IF cardinality(v_cols) = 0 THEN
    RETURN jsonb_build_object('cols', '[]'::jsonb, 'none', true, 'from', NULL, 'to', NULL, 'open', false);
  END IF;
  IF v_cols <@ ARRAY[p_start, p_end] THEN
    IF os IS DISTINCT FROM ns THEN
      v_from := LEAST(os, ns) - p_lead;
      v_to := GREATEST(os, ns) - 1;
    END IF;
    IF oe IS DISTINCT FROM ne THEN
      v_from := LEAST(v_from, LEAST(oe, ne) + 1);
      IF oe IS NULL OR ne IS NULL THEN v_open := true; ELSE v_to := GREATEST(v_to, GREATEST(oe, ne)); END IF;
    END IF;
  ELSE
    v_from := LEAST(os, ns) - p_lead;
    IF oe IS NULL OR ne IS NULL THEN v_open := true; ELSE v_to := GREATEST(oe, ne); END IF;
  END IF;
  RETURN jsonb_build_object('cols', to_jsonb(v_cols), 'none', false, 'from', v_from,
                            'to', CASE WHEN v_open THEN NULL ELSE v_to END, 'open', v_open);
END $fn$;

-- The tuition reach of a change to these children from p_from to p_to
-- (p_to NULL = open-ended: to today or the last month any of them has a bill
-- for, whichever is later). Step 1b's tuition_reach decides the tier; this
-- only gives it the dates, and adds the one case it cannot see: days ENTERING
-- an enrolment of p_class in a past month in which that class was taught
-- (the child is not enrolled yet, so tuition_month_state finds no lesson).
-- 'from' / 'to' are what an acknowledgement must cover (open = 9999-12-31).
CREATE OR REPLACE FUNCTION public._money_tuition_reach(p_students uuid[], p_class uuid, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kids uuid[] := public._money_family_kids(p_students);
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_open boolean := p_to IS NULL;
  v_to date;
  v_first date;
  v_ack_to date;
  r jsonb;
  v_tier int;
BEGIN
  IF p_from IS NULL THEN
    RAISE EXCEPTION 'bad_range' USING ERRCODE = 'HC015';
  END IF;
  IF v_open THEN
    SELECT GREATEST(v_today, p_from, COALESCE(max((to_date(i.month, 'YYYY-MM') + interval '1 month' - interval '1 day')::date), v_today))
      INTO v_to FROM public.invoices i WHERE i.student_id = ANY (v_kids) AND i.month ~ '^\d{4}-\d{2}$';
  ELSE
    v_to := p_to;
  END IF;
  v_ack_to := CASE WHEN v_open THEN DATE '9999-12-31' ELSE p_to END;
  -- Nothing before the first bill, bill floor or lesson of these children
  -- can be reached: every such month is "no bill, no lesson" (T0).
  SELECT LEAST(
      (SELECT min(to_date(i.month, 'YYYY-MM')) FROM public.invoices i WHERE i.student_id = ANY (v_kids) AND i.month ~ '^\d{4}-\d{2}$'),
      (SELECT min(to_date(f.month, 'YYYY-MM')) FROM public.invoice_state_floor f WHERE f.student_id = ANY (v_kids) AND f.month ~ '^\d{4}-\d{2}$'),
      (SELECT min(s.date) FROM public.sessions s
        WHERE s.status <> 'Canceled'
          AND (s.class_id = p_class
               OR s.class_id IN (SELECT e.class_id FROM public.enrollments e WHERE e.student_id = ANY (v_kids)))))
    INTO v_first;
  IF v_first IS NULL OR v_to < GREATEST(p_from, v_first) THEN
    RETURN jsonb_build_object('tier', 0, 'empty', true, 'from', p_from, 'to', v_ack_to, 'calc_to', v_to,
      'students', to_jsonb(v_kids), 'class_id', p_class, 'months', '[]'::jsonb, 'pairs', '[]'::jsonb,
      'invoices_before', '[]'::jsonb, 'refresh_pairs', '[]'::jsonb, 'fp', md5('empty'),
      'impact', jsonb_build_object('families', 0, 'paid_vnd', 0, 'closed_payroll', false));
  END IF;
  r := public.tuition_reach(v_kids, p_class, GREATEST(p_from, v_first), v_to);
  v_tier := COALESCE((r ->> 'tier')::int, 3);
  IF v_tier < 1 AND p_class IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.sessions s
        WHERE s.class_id = p_class AND s.status <> 'Canceled' AND s.date BETWEEN p_from AND v_to
          AND public._money_month_is_past(to_char(s.date, 'YYYY-MM'))) THEN
    v_tier := 1;
  END IF;
  RETURN r || jsonb_build_object('tier', v_tier, 'empty', false, 'from', p_from, 'to', v_ack_to, 'calc_to', v_to);
END $fn$;

-- The pay reach of a rate that applies to this member of staff from p_from
-- to p_to (NULL = open: to today or the last locked month). payroll_reach
-- decides the tier.
CREATE OR REPLACE FUNCTION public._money_pay_reach(p_teacher uuid, p_assistant uuid, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_open boolean := p_to IS NULL;
  v_to date;
  v_low date;
  p jsonb;
  v_base jsonb;
BEGIN
  IF p_from IS NULL OR (p_teacher IS NULL) = (p_assistant IS NULL) THEN
    RAISE EXCEPTION 'bad_range' USING ERRCODE = 'HC015';
  END IF;
  IF v_open THEN
    SELECT GREATEST(v_today, p_from, COALESCE(max((to_date(pp.month, 'YYYY-MM') + interval '1 month' - interval '1 day')::date), v_today))
      INTO v_to FROM public.payroll_periods pp WHERE pp.status = 'locked' AND pp.month ~ '^\d{4}-\d{2}$';
  ELSE
    v_to := p_to;
  END IF;
  -- nothing before the first lesson or the first locked month can be reached
  SELECT LEAST((SELECT min(s.date) FROM public.sessions s),
               (SELECT min(to_date(pp.month, 'YYYY-MM')) FROM public.payroll_periods pp
                 WHERE pp.status = 'locked' AND pp.month ~ '^\d{4}-\d{2}$'))
    INTO v_low;
  v_base := jsonb_build_object('from', p_from, 'to', CASE WHEN v_open THEN DATE '9999-12-31' ELSE p_to END,
    'students', '[]'::jsonb, 'pairs', '[]'::jsonb, 'invoices_before', '[]'::jsonb, 'refresh_pairs', '[]'::jsonb);
  IF v_low IS NULL OR v_to < GREATEST(p_from, v_low) THEN
    p := jsonb_build_object('tier', 0, 'locked_months', '[]'::jsonb, 'held_lessons', 0, 'closed_payroll', false);
  ELSE
    p := public.payroll_reach(p_teacher, p_assistant, GREATEST(p_from, v_low), v_to);
  END IF;
  RETURN v_base || jsonb_build_object('tier', COALESCE((p ->> 'tier')::int, 3), 'payroll', p, 'fp', md5(p::text),
    'impact', jsonb_build_object('families', 0, 'paid_vnd', 0,
                                 'closed_payroll', COALESCE((p ->> 'closed_payroll')::boolean, true)));
END $fn$;

-- Two pay reaches as one (the wider window, the higher tier).
CREATE OR REPLACE FUNCTION public._money_pay_combine(a jsonb, b jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE WHEN a IS NULL THEN b WHEN b IS NULL THEN a ELSE
    a || jsonb_build_object(
      'from', LEAST((a ->> 'from')::date, (b ->> 'from')::date),
      'to', GREATEST((a ->> 'to')::date, (b ->> 'to')::date),
      'tier', GREATEST((a ->> 'tier')::int, (b ->> 'tier')::int),
      'fp', md5((a ->> 'fp') || (b ->> 'fp')),
      'payroll', jsonb_build_object(
        'tier', GREATEST((a ->> 'tier')::int, (b ->> 'tier')::int),
        'locked_months', (SELECT COALESCE(jsonb_agg(DISTINCT m ORDER BY m), '[]'::jsonb)
                            FROM (SELECT jsonb_array_elements_text(a -> 'payroll' -> 'locked_months') AS m
                                  UNION SELECT jsonb_array_elements_text(b -> 'payroll' -> 'locked_months')) q),
        'held_lessons', GREATEST((a -> 'payroll' ->> 'held_lessons')::int, (b -> 'payroll' ->> 'held_lessons')::int),
        'closed_payroll', (a -> 'payroll' ->> 'closed_payroll')::boolean OR (b -> 'payroll' ->> 'closed_payroll')::boolean),
      'impact', jsonb_build_object('families', 0, 'paid_vnd', 0,
        'closed_payroll', (a -> 'impact' ->> 'closed_payroll')::boolean OR (b -> 'impact' ->> 'closed_payroll')::boolean))
  END
$fn$;

-- One rate row pays from its date to the day before the person's next row.
CREATE OR REPLACE FUNCTION public._money_pay_row_reach(p_teacher uuid, p_assistant uuid, p_from date, p_exclude uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_next date;
BEGIN
  SELECT min(r.effective_from) INTO v_next FROM public.staff_pay_rates r
   WHERE r.effective_from > p_from AND (p_exclude IS NULL OR r.id <> p_exclude)
     AND ((p_teacher IS NOT NULL AND r.teacher_id = p_teacher) OR (p_assistant IS NOT NULL AND r.assistant_id = p_assistant));
  RETURN public._money_pay_reach(p_teacher, p_assistant, p_from, v_next - 1);
END $fn$;

-- The mirror columns on teachers / teaching_assistants pay only the dates no
-- history row covers: everything before the person's earliest row (p_first;
-- NULL = no row at all, so every date).
CREATE OR REPLACE FUNCTION public._money_pay_mirror_reach(p_teacher uuid, p_assistant uuid, p_first date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public._money_pay_reach(p_teacher, p_assistant, DATE '1900-01-01',
                                 CASE WHEN p_first IS NULL THEN NULL ELSE p_first - 1 END)
$fn$;

-- The reach of a family change: the moved child, every child of the old and
-- of the new family, from the moved child's earliest enrolment (R-14).
CREATE OR REPLACE FUNCTION public._money_family_reach(p_child uuid, p_old_family uuid, p_new_family uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kids uuid[];
  v_from date;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT s.id), ARRAY[]::uuid[]) INTO v_kids FROM public.students s
   WHERE s.id = p_child OR (p_old_family IS NOT NULL AND s.family_id = p_old_family)
      OR (p_new_family IS NOT NULL AND s.family_id = p_new_family);
  IF p_child IS NOT NULL THEN
    SELECT min(e.start_date) INTO v_from FROM public.enrollments e WHERE e.student_id = p_child;
  ELSE
    SELECT min(e.start_date) INTO v_from FROM public.enrollments e WHERE e.student_id = ANY (v_kids);
  END IF;
  IF v_from IS NULL THEN
    -- no enrolment: nothing is billed, nothing moves
    RETURN public._money_tuition_reach(v_kids, NULL, DATE '9999-12-31', DATE '9999-12-30');
  END IF;
  RETURN public._money_tuition_reach(v_kids, NULL, v_from, NULL);
END $fn$;

-- The acknowledgement, for this file's triggers: the override row of THIS
-- transaction that the flag names, for this entity, covering the child, the
-- window and (through step 1b's _money_ack, which raises HC011 when the bill
-- has moved to a higher tier since the preview) the tier. NULL when there is
-- none. Each trigger then checks that the write is the one acknowledged.
CREATE OR REPLACE FUNCTION public._money_input_ack(p_entity text, p_student uuid, p_from date, p_to date, p_tier int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ack text := NULLIF(current_setting('hec.money_change_ack', true), '');
  o public.money_change_overrides;
BEGIN
  IF v_ack IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO o FROM public.money_change_overrides ov
   WHERE ov.id::text = v_ack AND ov.txid = txid_current() AND ov.entity = p_entity;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT public._money_ack(ARRAY[p_entity], o.target_id, p_student, p_from, p_to, p_tier) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('op', o.op, 'target_id', o.target_id, 'change', o.change);
END $fn$;

-- The last step of every trigger here. Tier 0 and an acknowledged write
-- pass; the owner lane passes and is recorded; everyone else is refused.
-- An unknown tier is tier 3.
CREATE OR REPLACE FUNCTION public._money_input_gate(p_entity text, p_table text, p_tg_op text, p_row_id uuid,
                                                    p_tier int, p_acked boolean, p_next_step text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_tier int := COALESCE(p_tier, 3);
  v_lane text;
BEGIN
  IF v_tier = 0 OR COALESCE(p_acked, false) THEN
    RETURN;
  END IF;
  v_lane := public._caller_lane();
  IF v_lane = 'owner' THEN
    INSERT INTO public.money_change_events (kind, payload)
    VALUES ('owner_lane', jsonb_build_object('table', p_table, 'op', p_tg_op, 'row_id', p_row_id, 'entity', p_entity, 'tier', v_tier));
    RETURN;
  END IF;
  RAISE EXCEPTION 'money_change_requires_checked_path' USING ERRCODE = 'HC120',
    DETAIL = 'entity=' || p_entity || '; tier=' || v_tier || '; ' || p_next_step;
END $fn$;

-- ---------------------------------------------------------------- 2
-- Step 1b's helper, one body replaced (see the header). Same signature,
-- attributes and (no) grants.
--
-- Which admin RPC that writes the register as a side effect is running this
-- write, or NULL?
--   * 'checked_<op>' while money_change_checked is applying an 'enrollment'
--     end / transfer / pause: the flag names that override row of THIS
--     transaction. Only _money_change_apply sets the flag, and it clears it
--     when the change is done.
--   * otherwise, as in step 1b, the live RPC whose frame is the OUTERMOST one
--     of the server's call stack (never the client's text), unique by name,
--     public, plpgsql, SECURITY DEFINER. A DIRECT pause_enrollment is no
--     longer taken for one while the enrolment guard is installed and
--     enabled: the checked 'pause' is its path (with the guard rolled back,
--     step 1b's answer returns).
CREATE OR REPLACE FUNCTION public._money_enrollment_rpc_call()
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $fn$
DECLARE
  v_ctx text;
  v_lines text[];
  v_name text;
  v_ack text := NULLIF(current_setting('hec.money_change_ack', true), '');
  v_op text;
BEGIN
  IF v_ack IS NOT NULL THEN
    SELECT o.op INTO v_op FROM public.money_change_overrides o
     WHERE o.id::text = v_ack AND o.txid = txid_current() AND o.entity = 'enrollment'
       AND o.op IN ('end', 'transfer', 'pause');
    IF FOUND THEN
      RETURN 'checked_' || v_op;
    END IF;
  END IF;
  GET DIAGNOSTICS v_ctx = PG_CONTEXT;
  v_lines := string_to_array(COALESCE(v_ctx, ''), E'\n');
  v_name := substring(v_lines[array_length(v_lines, 1)] from
    '^PL/pgSQL function (?:public\.)?(end_enrollment\(uuid,uuid,date\)|pause_enrollment\(uuid,uuid,date,date,text\)|modify_enrollment_transfer\(uuid,uuid,uuid,date\)|ai_action_undo\(uuid\)|ai_action_apply\(uuid,text,jsonb\)|stars_sync_resolve_conflict\(uuid,text\)) line [0-9]+ at SQL statement$');
  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;
  v_name := split_part(v_name, '(', 1);
  IF (SELECT count(*) FROM pg_catalog.pg_proc p WHERE p.proname = v_name) <> 1
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
                     WHERE p.proname = v_name AND p.pronamespace = 'public'::regnamespace
                       AND p.prosecdef AND l.lanname = 'plpgsql') THEN
    RETURN NULL;
  END IF;
  IF v_name = 'pause_enrollment' AND EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger t
        WHERE t.tgrelid = 'public.enrollments'::regclass AND t.tgname = 'zz_enrollment_money_guard' AND t.tgenabled = 'O') THEN
    RETURN NULL;   -- step 3B: a direct pause is judged like any other write; use the checked 'pause'
  END IF;
  RETURN v_name;
END $fn$;

-- ---------------------------------------------------------------- 3
-- G-13: enrolments.

CREATE OR REPLACE FUNCTION public._enrollment_money_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kid uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.student_id ELSE NEW.student_id END;
  v_class uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.class_id ELSE NEW.class_id END;
  v_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  sp jsonb;
  r jsonb;
  a jsonb;
  v_tier int;
  v_cols text[];
  v_op text;
  v_ok boolean := false;
BEGIN
  -- created_at (then id) decides which of two overlapping rows of one class
  -- prices a lesson (_lib/enrollment-discounts.ts, calculate-tuition and
  -- -bulk order a child's enrolments by them): identity, not a note. No
  -- writer changes either.
  IF TG_OP = 'UPDATE' AND (NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.class_id IS DISTINCT FROM OLD.class_id
                            OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=enrollment_identity; An enrolment keeps its child, its class, its id and when it was created. End it and start a new one.';
  END IF;
  sp := public._money_span(CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
                           CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
                           'start_date', 'end_date',
                           ARRAY['allowed_days', 'rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence'], 0);
  IF (sp ->> 'none')::boolean THEN
    RETURN NEW;                                   -- nothing that prices a lesson changed
  END IF;
  v_cols := ARRAY(SELECT jsonb_array_elements_text(sp -> 'cols'));
  r := public._money_tuition_reach(ARRAY[v_kid], v_class, (sp ->> 'from')::date, (sp ->> 'to')::date);
  v_tier := COALESCE((r ->> 'tier')::int, 3);
  IF v_tier > 0 THEN
    a := public._money_input_ack('enrollment', v_kid, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
    IF a IS NOT NULL THEN
      v_op := a ->> 'op';
      -- the write must be the one acknowledged: this class, this kind of row change
      v_ok := COALESCE((a -> 'change' -> 'class_ids') ? v_class::text, false) AND CASE
        WHEN TG_OP = 'INSERT' THEN v_op IN ('enroll', 'enroll_new', 'set_days', 'set_terms_from', 'transfer')
        WHEN TG_OP = 'DELETE' THEN v_op = 'delete' AND a ->> 'target_id' = v_id::text
        ELSE CASE
          WHEN v_op = 'set_start_date' THEN v_cols <@ ARRAY['start_date'] AND a ->> 'target_id' = v_id::text
          WHEN v_op IN ('end', 'end_all', 'transfer') THEN v_cols <@ ARRAY['end_date']
          WHEN v_op = 'set_days' THEN v_cols <@ ARRAY['end_date', 'allowed_days']
          WHEN v_op = 'set_terms_from' THEN v_cols <@ ARRAY['end_date', 'rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence']
          WHEN v_op = 'set_rate' THEN v_cols <@ ARRAY['rate_override_vnd'] AND a ->> 'target_id' = v_id::text
          WHEN v_op = 'set_discount' THEN v_cols <@ ARRAY['discount_type', 'discount_value', 'discount_cadence']
                                          AND a ->> 'target_id' = v_id::text
          ELSE false END
        END;
    END IF;
  END IF;
  PERFORM public._money_input_gate('enrollment', 'enrollments', TG_OP, v_id, v_tier, v_ok,
    'This reaches months already billed. Change it from the enrolment screen, with a reason.');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_enrollment_money_guard ON public.enrollments;
CREATE TRIGGER zz_enrollment_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public._enrollment_money_guard();

-- The terms of an enrolment that may be set, cleaned: only these four keys,
-- a positive whole rate or NULL, a positive discount value or NULL.
CREATE OR REPLACE FUNCTION public._money_enrollment_terms(p_terms jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  k text;
  v jsonb;
  out jsonb := '{}'::jsonb;
BEGIN
  IF p_terms IS NULL OR jsonb_typeof(p_terms) <> 'object' THEN
    RAISE EXCEPTION 'bad_terms' USING ERRCODE = '22023';
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p_terms) LOOP
    IF k NOT IN ('rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence') THEN
      RAISE EXCEPTION 'bad_terms' USING ERRCODE = '22023', DETAIL = 'Unknown term ' || k;
    END IF;
    IF k IN ('rate_override_vnd', 'discount_value') AND jsonb_typeof(v) <> 'null'
       AND (jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric <= 0 OR (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
            OR (v #>> '{}')::numeric > 2000000000) THEN
      RAISE EXCEPTION 'bad_terms' USING ERRCODE = '22023', DETAIL = k || ' must be a positive whole number or empty';
    END IF;
    IF k IN ('discount_type', 'discount_cadence') AND jsonb_typeof(v) NOT IN ('null', 'string') THEN
      RAISE EXCEPTION 'bad_terms' USING ERRCODE = '22023';
    END IF;
    out := out || jsonb_build_object(k, v);
  END LOOP;
  IF out = '{}'::jsonb THEN
    RAISE EXCEPTION 'bad_terms' USING ERRCODE = '22023', DETAIL = 'No term to change';
  END IF;
  RETURN out;
END $fn$;

-- G-14: "from this date" for a rate or a discount, modelled on
-- change_enrollment_days: the enrolment ends the day before and a new one
-- starts on the date with the new terms. The past keeps its terms.
CREATE OR REPLACE FUNCTION public.change_enrollment_terms(p_enrollment_id uuid, p_terms jsonb, p_effective_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  e public.enrollments%ROWTYPE;
  n public.enrollments%ROWTYPE;
  v_actor uuid := auth.uid();
  v_patch jsonb;
  v_new uuid;
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only administrators can change enrollment terms' USING ERRCODE = '42501';
  END IF;
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'An effective date is required' USING ERRCODE = '22004';
  END IF;
  v_patch := public._money_enrollment_terms(p_terms);
  SELECT * INTO e FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found' USING ERRCODE = 'P0002';
  END IF;
  IF e.end_date IS NOT NULL AND p_effective_date > e.end_date THEN
    RAISE EXCEPTION 'The date (%) is after this enrollment ended (%)', p_effective_date, e.end_date USING ERRCODE = '22023';
  END IF;
  n := jsonb_populate_record(e, v_patch);
  IF NOT ((n.discount_type IS NULL) = (n.discount_value IS NULL) AND (n.discount_type IS NULL) = (n.discount_cadence IS NULL)) THEN
    RAISE EXCEPTION 'A discount needs its type, its value and its cadence together' USING ERRCODE = '22023';
  END IF;

  IF p_effective_date <= e.start_date THEN
    UPDATE public.enrollments
       SET rate_override_vnd = n.rate_override_vnd, discount_type = n.discount_type, discount_value = n.discount_value,
           discount_cadence = n.discount_cadence, updated_at = now(), updated_by = v_actor
     WHERE id = e.id;
    INSERT INTO public.audit_log (actor_user_id, action, entity, entity_id, diff)
    VALUES (v_actor, 'change_terms', 'enrollment', e.id::text,
      jsonb_build_object('from', p_effective_date, 'split', false, 'terms', v_patch,
        'old', jsonb_build_object('rate_override_vnd', e.rate_override_vnd, 'discount_type', e.discount_type,
                                  'discount_value', e.discount_value, 'discount_cadence', e.discount_cadence)));
    RETURN jsonb_build_object('success', true, 'split', false, 'enrollment_id', e.id);
  END IF;

  UPDATE public.enrollments SET end_date = p_effective_date - 1, updated_at = now(), updated_by = v_actor WHERE id = e.id;
  INSERT INTO public.enrollments (student_id, class_id, start_date, end_date, allowed_days, rate_override_vnd,
                                  discount_type, discount_value, discount_cadence, created_by, updated_by)
  VALUES (e.student_id, e.class_id, p_effective_date, e.end_date, e.allowed_days, n.rate_override_vnd,
          n.discount_type, n.discount_value, n.discount_cadence, v_actor, v_actor)
  RETURNING id INTO v_new;

  INSERT INTO public.audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (v_actor, 'change_terms', 'enrollment', e.id::text,
    jsonb_build_object('from', p_effective_date, 'split', true, 'terms', v_patch, 'new_enrollment_id', v_new,
      'old', jsonb_build_object('rate_override_vnd', e.rate_override_vnd, 'discount_type', e.discount_type,
                                'discount_value', e.discount_value, 'discount_cadence', e.discount_cadence)));
  RETURN jsonb_build_object('success', true, 'split', true, 'enrollment_id', v_new);
END $fn$;

-- What every plan of this file returns (design c.2 "Plan output").
CREATE OR REPLACE FUNCTION public._money_input_plan(p_entity text, p_op text, p_target uuid, p_before jsonb, p_change jsonb,
                                                    p_reach jsonb, p_tier_floor int, p_refuse text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'entity', p_entity, 'op', p_op, 'target_id', p_target,
    'student_ids', COALESCE(p_reach -> 'students', '[]'::jsonb),
    'row_before', COALESCE(p_before, '[]'::jsonb), 'change', COALESCE(p_change, '{}'::jsonb),
    'reach_from', p_reach -> 'from', 'reach_to', p_reach -> 'to',
    'reach', jsonb_build_object('pairs', COALESCE(p_reach -> 'pairs', '[]'::jsonb),
                                'payroll', p_reach -> 'payroll',
                                'fp', md5(COALESCE(p_change, '{}'::jsonb)::text || COALESCE(p_reach ->> 'fp', '') || t.tier::text)),
    'tier', t.tier, 'refuse_code', p_refuse,
    'invoices_before', COALESCE(p_reach -> 'invoices_before', '[]'::jsonb),
    'refresh_pairs', COALESCE(p_reach -> 'refresh_pairs', '[]'::jsonb),
    'impact', COALESCE(p_reach -> 'impact', '{}'::jsonb) || jsonb_build_object('tier', t.tier))
  FROM (SELECT GREATEST(COALESCE((p_reach ->> 'tier')::int, 3), COALESCE(p_tier_floor, 0)) AS tier) t
$fn$;

CREATE OR REPLACE FUNCTION public._money_plan__enrollment(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  e public.enrollments%ROWTYPE;
  v_id uuid;
  v_kid uuid;
  v_class uuid;
  v_class2 uuid;
  v_date date;
  v_date2 date;
  v_from date;
  v_to date;
  v_classes uuid[];
  v_before jsonb := '[]'::jsonb;
  v_change jsonb;
  v_target uuid;
  v_floor int := 0;
  v_patch jsonb;
  v_new jsonb;
  v_row jsonb;
  sp jsonb;
  r jsonb;
  r2 jsonb;
  c uuid;
  v_days int[];
  v_bad constant jsonb := jsonb_build_object('refuse_code', 'bad_args');
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN RETURN v_bad; END IF;
  v_id := public._money_uuid(p_args ->> 'enrollment_id');
  v_kid := public._money_uuid(p_args ->> 'student_id');
  v_class := public._money_uuid(p_args ->> 'class_id');

  IF p_op IN ('set_start_date', 'set_days', 'set_rate', 'set_discount', 'delete', 'set_terms_from') THEN
    IF v_id IS NULL THEN RETURN v_bad; END IF;
    SELECT * INTO e FROM public.enrollments WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'enrollment not found' USING ERRCODE = 'P0002'; END IF;
    v_kid := e.student_id;
    v_class := e.class_id;
    v_target := e.id;
    v_classes := ARRAY[e.class_id];
    v_before := jsonb_build_array(to_jsonb(e));
  END IF;

  IF p_op IN ('enroll', 'enroll_new') THEN
    v_date := public._money_date(p_args ->> 'start_date');
    v_date2 := public._money_date(p_args ->> 'end_date');
    IF v_class IS NULL OR v_date IS NULL OR (p_op = 'enroll' AND v_kid IS NULL)
       OR (p_args ->> 'end_date' IS NOT NULL AND v_date2 IS NULL) OR v_date2 < v_date
       OR NOT EXISTS (SELECT 1 FROM public.classes c0 WHERE c0.id = v_class)
       OR (v_kid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.students s0 WHERE s0.id = v_kid)) THEN
      RETURN v_bad;
    END IF;
    BEGIN
      v_patch := CASE WHEN p_args ?| ARRAY['rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence']
                      THEN public._money_enrollment_terms(jsonb_strip_nulls(jsonb_build_object(
                             'rate_override_vnd', p_args -> 'rate_override_vnd', 'discount_type', p_args -> 'discount_type',
                             'discount_value', p_args -> 'discount_value', 'discount_cadence', p_args -> 'discount_cadence')))
                      ELSE '{}'::jsonb END;
      v_row := jsonb_strip_nulls(jsonb_build_object('student_id', v_kid, 'class_id', v_class, 'start_date', v_date,
                 'end_date', v_date2, 'allowed_days', CASE WHEN jsonb_typeof(p_args -> 'allowed_days') = 'array'
                                                            AND jsonb_array_length(p_args -> 'allowed_days') > 0
                                                           THEN p_args -> 'allowed_days' END)) || v_patch;
      e := jsonb_populate_record(NULL::public.enrollments, v_row);
    EXCEPTION WHEN OTHERS THEN
      RETURN v_bad;
    END;
    IF NOT ((e.discount_type IS NULL) = (e.discount_value IS NULL) AND (e.discount_type IS NULL) = (e.discount_cadence IS NULL)) THEN
      RETURN v_bad;
    END IF;
    v_target := COALESCE(v_kid, v_class);
    v_classes := ARRAY[v_class];
    v_from := v_date;
    v_to := v_date2;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(v_class), 'row', v_row, 'new_child', v_kid IS NULL);

  ELSIF p_op = 'set_start_date' THEN
    v_date := public._money_date(p_args ->> 'start_date');
    IF v_date IS NULL OR (e.end_date IS NOT NULL AND v_date > e.end_date) THEN RETURN v_bad; END IF;
    IF v_date = e.start_date THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
    END IF;
    v_new := to_jsonb(e) || jsonb_build_object('start_date', v_date);
    sp := public._money_span(to_jsonb(e), v_new, 'start_date', 'end_date', ARRAY[]::text[], 0);
    v_from := (sp ->> 'from')::date;
    v_to := (sp ->> 'to')::date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(e.class_id), 'enrollment_id', e.id,
                                   'start_date', v_date, 'old_start_date', e.start_date);

  ELSIF p_op = 'end' THEN
    v_date := public._money_date(p_args ->> 'end_date');
    IF v_kid IS NULL OR v_class IS NULL OR v_date IS NULL THEN RETURN v_bad; END IF;
    -- the row end_enrollment will pick
    SELECT * INTO e FROM public.enrollments
     WHERE student_id = v_kid AND class_id = v_class AND (end_date IS NULL OR end_date > v_date)
     ORDER BY start_date DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'no_enrollment', 'tier', 0);
    END IF;
    IF v_date < e.start_date THEN RETURN v_bad; END IF;
    v_target := e.id;
    v_classes := ARRAY[v_class];
    v_before := jsonb_build_array(to_jsonb(e));
    v_from := v_date + 1;
    v_to := e.end_date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(v_class), 'student_id', v_kid, 'class_id', v_class,
                                   'end_date', v_date, 'old_end_date', e.end_date);

  ELSIF p_op = 'end_all' THEN
    v_date := COALESCE(public._money_date(p_args ->> 'date'), (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
    IF v_kid IS NULL OR (p_args ->> 'date' IS NOT NULL AND public._money_date(p_args ->> 'date') IS NULL) THEN RETURN v_bad; END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id::text COLLATE "C"), '[]'::jsonb),
           COALESCE(array_agg(DISTINCT x.class_id), ARRAY[]::uuid[])
      INTO v_before, v_classes
      FROM public.enrollments x WHERE x.student_id = v_kid AND x.end_date IS NULL;
    IF cardinality(v_classes) = 0 THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
    END IF;
    v_target := v_kid;
    v_from := v_date + 1;
    v_to := NULL;
    v_change := jsonb_build_object('class_ids', to_jsonb(v_classes), 'student_id', v_kid, 'end_date', v_date);

  ELSIF p_op = 'set_days' THEN
    v_date := public._money_date(p_args ->> 'effective_date');
    IF v_date IS NULL OR (e.end_date IS NOT NULL AND v_date > e.end_date)
       OR jsonb_typeof(COALESCE(p_args -> 'allowed_days', 'null'::jsonb)) NOT IN ('null', 'array') THEN
      RETURN v_bad;
    END IF;
    BEGIN
      v_days := ARRAY(SELECT (x #>> '{}')::int FROM jsonb_array_elements(COALESCE(NULLIF(p_args -> 'allowed_days', 'null'::jsonb), '[]'::jsonb)) x);
    EXCEPTION WHEN OTHERS THEN
      RETURN v_bad;
    END;
    IF EXISTS (SELECT 1 FROM unnest(v_days) d WHERE d NOT BETWEEN 0 AND 6) THEN RETURN v_bad; END IF;
    v_from := GREATEST(v_date, e.start_date);
    v_to := e.end_date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(e.class_id), 'enrollment_id', e.id,
                                   'allowed_days', to_jsonb(v_days), 'old_allowed_days', to_jsonb(e.allowed_days),
                                   'effective_date', v_date, 'split', v_date > e.start_date);

  ELSIF p_op = 'transfer' THEN
    v_class := public._money_uuid(p_args ->> 'old_class_id');
    v_class2 := public._money_uuid(p_args ->> 'new_class_id');
    v_date := public._money_date(p_args ->> 'effective_date');
    IF v_kid IS NULL OR v_class IS NULL OR v_class2 IS NULL OR v_class = v_class2 OR v_date IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.classes c0 WHERE c0.id = v_class2) THEN
      RETURN v_bad;
    END IF;
    SELECT * INTO e FROM public.enrollments
     WHERE student_id = v_kid AND class_id = v_class AND (end_date IS NULL OR end_date >= v_date) LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'no_enrollment', 'tier', 0);
    END IF;
    v_target := v_kid;
    v_classes := ARRAY[v_class, v_class2];
    v_before := jsonb_build_array(to_jsonb(e));
    v_from := v_date;
    v_to := NULL;
    v_change := jsonb_build_object('class_ids', to_jsonb(v_classes), 'student_id', v_kid, 'old_class_id', v_class,
                                   'new_class_id', v_class2, 'effective_date', v_date);

  ELSIF p_op = 'pause' THEN
    v_date := public._money_date(p_args ->> 'from');
    v_date2 := public._money_date(p_args ->> 'to');
    IF v_kid IS NULL OR v_class IS NULL OR v_date IS NULL OR v_date2 IS NULL OR v_date2 < v_date OR v_date2 - v_date > 366 THEN
      RETURN v_bad;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.enrollments x WHERE x.student_id = v_kid AND x.class_id = v_class) THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'no_enrollment', 'tier', 0);
    END IF;
    v_target := v_kid;
    v_classes := ARRAY[v_class];
    v_from := v_date;
    v_to := v_date2;
    -- A-6: a mark a person made as Present / Late, on a lesson older than the
    -- free week, is un-billed by the pause: at least T1 whatever the bill.
    IF EXISTS (SELECT 1 FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id
                WHERE a.student_id = v_kid AND s.class_id = v_class AND s.date BETWEEN v_date AND v_date2
                  AND s.status <> 'Canceled' AND a.marked_by IS NOT NULL AND a.status::text IN ('Present', 'Late')
                  AND NOT public._lesson_in_free_week(s.date, s.start_time, s.end_time)) THEN
      v_floor := 1;
    END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', s.id, 'date', s.date, 'status', a.status,
                                                 'marked_by_person', a.marked_by IS NOT NULL)
                              ORDER BY s.date, s.id::text COLLATE "C"), '[]'::jsonb) INTO v_before
      FROM public.sessions s LEFT JOIN public.attendance a ON a.session_id = s.id AND a.student_id = v_kid
     WHERE s.class_id = v_class AND s.date BETWEEN v_date AND v_date2 AND s.status <> 'Canceled';
    v_change := jsonb_build_object('class_ids', jsonb_build_array(v_class), 'student_id', v_kid, 'class_id', v_class,
                                   'from', v_date, 'to', v_date2, 'memo', left(COALESCE(p_args ->> 'memo', ''), 500),
                                   'lessons', jsonb_array_length(v_before));

  ELSIF p_op IN ('set_rate', 'set_discount') THEN
    BEGIN
      v_patch := CASE WHEN p_op = 'set_rate'
        THEN public._money_enrollment_terms(jsonb_build_object('rate_override_vnd', COALESCE(p_args -> 'rate_override_vnd', 'null'::jsonb)))
        ELSE public._money_enrollment_terms(jsonb_build_object(
               'discount_type', COALESCE(p_args -> 'discount_type', 'null'::jsonb),
               'discount_value', COALESCE(p_args -> 'discount_value', 'null'::jsonb),
               'discount_cadence', COALESCE(p_args -> 'discount_cadence', 'null'::jsonb))) END;
      v_new := to_jsonb(jsonb_populate_record(e, v_patch));
    EXCEPTION WHEN OTHERS THEN
      RETURN v_bad;
    END;
    IF NOT (((v_new -> 'discount_type') = 'null'::jsonb) = ((v_new -> 'discount_value') = 'null'::jsonb)
            AND ((v_new -> 'discount_type') = 'null'::jsonb) = ((v_new -> 'discount_cadence') = 'null'::jsonb)) THEN
      RETURN v_bad;
    END IF;
    sp := public._money_span(to_jsonb(e), v_new, 'start_date', 'end_date',
                             ARRAY['allowed_days', 'rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence'], 0);
    IF (sp ->> 'none')::boolean THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
    END IF;
    v_from := (sp ->> 'from')::date;
    v_to := (sp ->> 'to')::date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(e.class_id), 'enrollment_id', e.id, 'terms', v_patch,
      'old', jsonb_build_object('rate_override_vnd', e.rate_override_vnd, 'discount_type', e.discount_type,
                                'discount_value', e.discount_value, 'discount_cadence', e.discount_cadence));

  ELSIF p_op = 'delete' THEN
    v_from := e.start_date;
    v_to := e.end_date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(e.class_id), 'enrollment_id', e.id, 'deleted', true);

  ELSIF p_op = 'set_terms_from' THEN
    v_date := public._money_date(p_args ->> 'effective_date');
    IF v_date IS NULL OR (e.end_date IS NOT NULL AND v_date > e.end_date) THEN RETURN v_bad; END IF;
    BEGIN
      v_patch := public._money_enrollment_terms(p_args -> 'terms');
      v_new := to_jsonb(jsonb_populate_record(e, v_patch));
    EXCEPTION WHEN OTHERS THEN
      RETURN v_bad;
    END;
    IF NOT (((v_new -> 'discount_type') = 'null'::jsonb) = ((v_new -> 'discount_value') = 'null'::jsonb)
            AND ((v_new -> 'discount_type') = 'null'::jsonb) = ((v_new -> 'discount_cadence') = 'null'::jsonb)) THEN
      RETURN v_bad;
    END IF;
    IF (public._money_span(to_jsonb(e), v_new, 'start_date', 'end_date',
          ARRAY['rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence'], 0) ->> 'none')::boolean THEN
      RETURN jsonb_build_object('entity', 'enrollment', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
    END IF;
    v_from := GREATEST(v_date, e.start_date);
    v_to := e.end_date;
    v_change := jsonb_build_object('class_ids', jsonb_build_array(e.class_id), 'enrollment_id', e.id, 'terms', v_patch,
      'effective_date', v_date, 'split', v_date > e.start_date,
      'old', jsonb_build_object('rate_override_vnd', e.rate_override_vnd, 'discount_type', e.discount_type,
                                'discount_value', e.discount_value, 'discount_cadence', e.discount_cadence));
  ELSE
    RETURN jsonb_build_object('refuse_code', 'bad_op');
  END IF;

  r := public._money_tuition_reach(CASE WHEN v_kid IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[v_kid] END, v_classes[1], v_from, v_to);
  FOREACH c IN ARRAY v_classes[2:] LOOP
    r2 := public._money_tuition_reach(ARRAY[v_kid], c, v_from, v_to);
    IF (r2 ->> 'tier')::int > (r ->> 'tier')::int THEN
      r := r || jsonb_build_object('tier', (r2 ->> 'tier')::int);
    END IF;
  END LOOP;
  RETURN public._money_input_plan('enrollment', p_op, v_target, v_before, v_change, r, v_floor, NULL);
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__enrollment(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_op text := p_plan ->> 'op';
  ch jsonb := p_plan -> 'change';
  v_id uuid := public._money_uuid(ch ->> 'enrollment_id');
  v_cur jsonb;
  n int := 0;
  res jsonb := '{}'::jsonb;
  x public.enrollments%ROWTYPE;
BEGIN
  IF v_op IN ('set_start_date', 'set_rate', 'set_discount', 'delete') THEN
    -- the row as the admin was shown it, locked
    SELECT to_jsonb(e0) INTO v_cur FROM public.enrollments e0 WHERE e0.id = v_id FOR UPDATE;
    IF v_cur IS DISTINCT FROM (p_plan -> 'row_before' -> 0) THEN
      RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The enrolment changed since the preview.';
    END IF;
  END IF;

  IF v_op IN ('enroll', 'enroll_new') THEN
    IF ch -> 'row' ->> 'student_id' IS NULL THEN
      RAISE EXCEPTION 'student_required' USING ERRCODE = 'HC015';
    END IF;
    x := jsonb_populate_record(NULL::public.enrollments, ch -> 'row');
    INSERT INTO public.enrollments (student_id, class_id, start_date, end_date, allowed_days, rate_override_vnd,
                                    discount_type, discount_value, discount_cadence, created_by, updated_by)
    VALUES (x.student_id, x.class_id, x.start_date, x.end_date, x.allowed_days, x.rate_override_vnd,
            x.discount_type, x.discount_value, x.discount_cadence, p_uid, p_uid)
    RETURNING id INTO v_id;
    n := 1;
    res := jsonb_build_object('enrollment_id', v_id);
  ELSIF v_op = 'set_start_date' THEN
    UPDATE public.enrollments SET start_date = (ch ->> 'start_date')::date, updated_at = now(), updated_by = p_uid WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'end' THEN
    res := public.end_enrollment((ch ->> 'student_id')::uuid, (ch ->> 'class_id')::uuid, (ch ->> 'end_date')::date);
    n := 1;
  ELSIF v_op = 'end_all' THEN
    UPDATE public.enrollments SET end_date = (ch ->> 'end_date')::date, updated_at = now(), updated_by = p_uid
     WHERE student_id = (ch ->> 'student_id')::uuid AND end_date IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'set_days' THEN
    res := public.change_enrollment_days(v_id, ARRAY(SELECT (d #>> '{}')::int FROM jsonb_array_elements(ch -> 'allowed_days') d),
                                         (ch ->> 'effective_date')::date);
    n := 1;
  ELSIF v_op = 'transfer' THEN
    res := public.modify_enrollment_transfer((ch ->> 'student_id')::uuid, (ch ->> 'old_class_id')::uuid,
                                             (ch ->> 'new_class_id')::uuid, (ch ->> 'effective_date')::date);
    n := 1;
  ELSIF v_op = 'pause' THEN
    res := public.pause_enrollment((ch ->> 'student_id')::uuid, (ch ->> 'class_id')::uuid, (ch ->> 'from')::date,
                                   (ch ->> 'to')::date, NULLIF(ch ->> 'memo', ''));
    n := 1;
  ELSIF v_op IN ('set_rate', 'set_discount') THEN
    x := jsonb_populate_record(jsonb_populate_record(NULL::public.enrollments, v_cur), ch -> 'terms');
    UPDATE public.enrollments
       SET rate_override_vnd = x.rate_override_vnd, discount_type = x.discount_type, discount_value = x.discount_value,
           discount_cadence = x.discount_cadence, updated_at = now(), updated_by = p_uid
     WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'delete' THEN
    DELETE FROM public.enrollments WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'set_terms_from' THEN
    res := public.change_enrollment_terms(v_id, ch -> 'terms', (ch ->> 'effective_date')::date);
    n := 1;
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  RETURN jsonb_build_object('written', n, 'guard_trigger', 'enrollments.zz_enrollment_money_guard', 'result', res);
END $fn$;

-- ---------------------------------------------------------------- 4
-- G-15: discount assignments and referral bonuses (one trigger function for
-- both tables), and the definitions they point at.

CREATE OR REPLACE FUNCTION public._discount_money_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_entity text := CASE WHEN TG_TABLE_NAME = 'referral_bonuses' THEN 'referral_bonus' ELSE 'discount_assignment' END;
  o jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  n jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_kid uuid;
  v_id uuid;
  sp jsonb;
  r jsonb;
  a jsonb;
  v_tier int;
  v_cols text[];
  v_op text;
  v_ok boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND (o -> 'student_id') IS DISTINCT FROM (n -> 'student_id') THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=discount_identity; A discount keeps its child. Remove it and assign it to the other child.';
  END IF;
  v_kid := (COALESCE(n, o) ->> 'student_id')::uuid;
  v_id := (COALESCE(n, o) ->> 'id')::uuid;
  sp := public._money_span(o, n, 'effective_from', 'effective_to',
          CASE WHEN v_entity = 'referral_bonus' THEN ARRAY['type', 'value', 'cadence'] ELSE ARRAY['discount_def_id'] END, 1);
  IF (sp ->> 'none')::boolean THEN
    RETURN NEW;                                   -- a note, nothing priced
  END IF;
  v_cols := ARRAY(SELECT jsonb_array_elements_text(sp -> 'cols'));
  r := public._money_tuition_reach(ARRAY[v_kid], NULL, (sp ->> 'from')::date, (sp ->> 'to')::date);
  v_tier := COALESCE((r ->> 'tier')::int, 3);
  IF v_tier > 0 THEN
    a := public._money_input_ack(v_entity, v_kid, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
    IF a IS NOT NULL THEN
      v_op := a ->> 'op';
      v_ok := CASE
        WHEN TG_OP = 'INSERT' THEN v_op = 'assign'
        WHEN TG_OP = 'DELETE' THEN v_op = 'remove' AND a ->> 'target_id' = v_id::text
        ELSE a ->> 'target_id' = v_id::text
             AND (v_op = 'edit' OR (v_op = 'set_end' AND v_cols <@ ARRAY['effective_to'])) END;
    END IF;
  END IF;
  PERFORM public._money_input_gate(v_entity, TG_TABLE_NAME, TG_OP, v_id, v_tier, v_ok,
    'This reaches months already billed. Change it from the discount screen, with a reason.');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_discount_money_guard ON public.discount_assignments;
CREATE TRIGGER zz_discount_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.discount_assignments
  FOR EACH ROW EXECUTE FUNCTION public._discount_money_guard();
DROP TRIGGER IF EXISTS zz_discount_money_guard ON public.referral_bonuses;
CREATE TRIGGER zz_discount_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.referral_bonuses
  FOR EACH ROW EXECUTE FUNCTION public._discount_money_guard();

-- A definition's pricing columns cannot change, nor can it be deleted, while
-- an assignment of it reaches T1+ (every lane: there is no checked path -
-- "create a new discount and assign it from a date"). is_active is a pricing
-- column: the calculator skips an inactive definition for every month.
CREATE OR REPLACE FUNCTION public._discount_definition_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  x record;
  r jsonb;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.type IS NOT DISTINCT FROM OLD.type AND NEW.value IS NOT DISTINCT FROM OLD.value
     AND NEW.cadence IS NOT DISTINCT FROM OLD.cadence AND NEW.start_month IS NOT DISTINCT FROM OLD.start_month
     AND NEW.end_month IS NOT DISTINCT FROM OLD.end_month AND NEW.amortize_yearly IS NOT DISTINCT FROM OLD.amortize_yearly
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;                                   -- the name, nothing priced
  END IF;
  FOR x IN SELECT da.student_id, da.effective_from, da.effective_to
             FROM public.discount_assignments da WHERE da.discount_def_id = OLD.id
            ORDER BY da.effective_from LOOP
    r := public._money_tuition_reach(ARRAY[x.student_id], NULL, x.effective_from - 1, x.effective_to);
    IF COALESCE((r ->> 'tier')::int, 3) > 0 THEN
      RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
        DETAIL = 'code=definition_in_use; This discount is used on months already billed. Create a new discount and assign it from a date.';
    END IF;
  END LOOP;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_discount_definition_guard ON public.discount_definitions;
CREATE TRIGGER zz_discount_definition_guard BEFORE UPDATE OR DELETE ON public.discount_definitions
  FOR EACH ROW EXECUTE FUNCTION public._discount_definition_guard();

-- Plan and exec for both entities.
CREATE OR REPLACE FUNCTION public._money_plan__discount(p_entity text, p_op text, p_args jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_bonus boolean := p_entity = 'referral_bonus';
  v_other text[] := CASE WHEN p_entity = 'referral_bonus' THEN ARRAY['type', 'value', 'cadence'] ELSE ARRAY['discount_def_id'] END;
  v_id uuid;
  v_kid uuid;
  o jsonb;
  n jsonb;
  v_patch jsonb := '{}'::jsonb;
  v_keys text[];
  k text;
  sp jsonb;
  r jsonb;
  v_target uuid;
  v_change jsonb;
  v_bad constant jsonb := jsonb_build_object('refuse_code', 'bad_args');
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN RETURN v_bad; END IF;
  IF p_op NOT IN ('assign', 'set_end', 'edit', 'remove') THEN RETURN jsonb_build_object('refuse_code', 'bad_op'); END IF;

  IF p_op = 'assign' THEN
    v_kid := public._money_uuid(p_args ->> 'student_id');
    IF v_kid IS NULL OR NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = v_kid)
       OR public._money_date(p_args ->> 'effective_from') IS NULL
       OR (p_args ->> 'effective_to' IS NOT NULL AND (public._money_date(p_args ->> 'effective_to') IS NULL
            OR public._money_date(p_args ->> 'effective_to') < public._money_date(p_args ->> 'effective_from'))) THEN
      RETURN v_bad;
    END IF;
    n := jsonb_strip_nulls(jsonb_build_object('student_id', v_kid, 'effective_from', p_args ->> 'effective_from',
           'effective_to', p_args ->> 'effective_to', 'note', NULLIF(left(COALESCE(p_args ->> 'note', ''), 1000), '')));
    IF v_bonus THEN
      IF COALESCE(p_args ->> 'type', '') NOT IN ('percent', 'amount') OR jsonb_typeof(p_args -> 'value') IS DISTINCT FROM 'number'
         OR (p_args ->> 'value')::numeric <= 0 OR (p_args ->> 'value')::numeric <> trunc((p_args ->> 'value')::numeric)
         OR COALESCE(p_args ->> 'cadence', '') = '' THEN
        RETURN v_bad;
      END IF;
      n := n || jsonb_build_object('type', p_args ->> 'type', 'value', p_args -> 'value', 'cadence', p_args ->> 'cadence');
      BEGIN
        PERFORM (jsonb_populate_record(NULL::public.referral_bonuses, n)).id;
      EXCEPTION WHEN OTHERS THEN
        RETURN v_bad;
      END;
    ELSE
      IF public._money_uuid(p_args ->> 'discount_def_id') IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.discount_definitions d WHERE d.id = public._money_uuid(p_args ->> 'discount_def_id')) THEN
        RETURN v_bad;
      END IF;
      n := n || jsonb_build_object('discount_def_id', public._money_uuid(p_args ->> 'discount_def_id'));
    END IF;
    o := NULL;
    v_target := v_kid;
    v_change := jsonb_build_object('row', n);
  ELSE
    v_id := public._money_uuid(COALESCE(p_args ->> 'id', p_args ->> 'assignment_id', p_args ->> 'bonus_id'));
    IF v_id IS NULL THEN RETURN v_bad; END IF;
    IF v_bonus THEN
      SELECT to_jsonb(b) INTO o FROM public.referral_bonuses b WHERE b.id = v_id;
    ELSE
      SELECT to_jsonb(d) INTO o FROM public.discount_assignments d WHERE d.id = v_id;
    END IF;
    IF o IS NULL THEN RAISE EXCEPTION 'discount not found' USING ERRCODE = 'P0002'; END IF;
    v_kid := (o ->> 'student_id')::uuid;
    v_target := v_id;
    IF p_op = 'remove' THEN
      n := NULL;
      v_change := jsonb_build_object('id', v_id, 'deleted', true);
    ELSE
      v_keys := CASE WHEN p_op = 'set_end' THEN ARRAY['effective_to']
                     ELSE ARRAY['effective_from', 'effective_to', 'note'] || v_other END;
      FOREACH k IN ARRAY v_keys LOOP
        IF p_args ? k THEN v_patch := v_patch || jsonb_build_object(k, p_args -> k); END IF;
      END LOOP;
      IF p_op = 'set_end' AND NOT (p_args ? 'effective_to') THEN RETURN v_bad; END IF;
      IF (v_patch ? 'effective_from' AND public._money_date(v_patch ->> 'effective_from') IS NULL)
         OR (v_patch ->> 'effective_to' IS NOT NULL AND public._money_date(v_patch ->> 'effective_to') IS NULL)
         OR (v_patch ? 'value' AND (jsonb_typeof(v_patch -> 'value') <> 'number' OR (v_patch ->> 'value')::numeric <= 0
                                    OR (v_patch ->> 'value')::numeric <> trunc((v_patch ->> 'value')::numeric)))
         OR (v_patch ? 'type' AND COALESCE(v_patch ->> 'type', '') NOT IN ('percent', 'amount'))
         OR (v_patch ? 'discount_def_id' AND NOT EXISTS (SELECT 1 FROM public.discount_definitions d
                                                         WHERE d.id = public._money_uuid(v_patch ->> 'discount_def_id'))) THEN
        RETURN v_bad;
      END IF;
      BEGIN
        IF v_bonus THEN
          n := to_jsonb(jsonb_populate_record(jsonb_populate_record(NULL::public.referral_bonuses, o), v_patch));
        ELSE
          n := to_jsonb(jsonb_populate_record(jsonb_populate_record(NULL::public.discount_assignments, o), v_patch));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RETURN v_bad;
      END;
      IF (n ->> 'effective_to')::date < (n ->> 'effective_from')::date THEN RETURN v_bad; END IF;
      IF n = o THEN
        RETURN jsonb_build_object('entity', p_entity, 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
      END IF;
      v_change := jsonb_build_object('id', v_id, 'patch', v_patch,
        'old', (SELECT COALESCE(jsonb_object_agg(kk, o -> kk), '{}'::jsonb) FROM jsonb_object_keys(v_patch) kk));
    END IF;
  END IF;

  sp := public._money_span(o, n, 'effective_from', 'effective_to', v_other, 1);
  IF (sp ->> 'none')::boolean THEN
    -- only the note: reaches nothing
    r := public._money_tuition_reach(ARRAY[v_kid], NULL, DATE '9999-12-31', DATE '9999-12-30');
  ELSE
    r := public._money_tuition_reach(ARRAY[v_kid], NULL, (sp ->> 'from')::date, (sp ->> 'to')::date);
  END IF;
  RETURN public._money_input_plan(p_entity, p_op, v_target, CASE WHEN o IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(o) END,
                                  v_change, r, 0, NULL);
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__discount(p_entity text, p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_bonus boolean := p_entity = 'referral_bonus';
  v_op text := p_plan ->> 'op';
  ch jsonb := p_plan -> 'change';
  v_id uuid := public._money_uuid(ch ->> 'id');
  v_cur jsonb;
  n int := 0;
  a public.discount_assignments%ROWTYPE;
  b public.referral_bonuses%ROWTYPE;
BEGIN
  IF v_op IN ('set_end', 'edit', 'remove') THEN
    IF v_bonus THEN
      SELECT to_jsonb(x) INTO v_cur FROM public.referral_bonuses x WHERE x.id = v_id FOR UPDATE;
    ELSE
      SELECT to_jsonb(x) INTO v_cur FROM public.discount_assignments x WHERE x.id = v_id FOR UPDATE;
    END IF;
    IF v_cur IS DISTINCT FROM (p_plan -> 'row_before' -> 0) THEN
      RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The discount changed since the preview.';
    END IF;
  END IF;

  IF v_op = 'assign' AND v_bonus THEN
    b := jsonb_populate_record(NULL::public.referral_bonuses, ch -> 'row');
    INSERT INTO public.referral_bonuses (student_id, type, cadence, value, effective_from, effective_to, note, created_by, updated_by)
    VALUES (b.student_id, b.type, b.cadence, b.value, b.effective_from, b.effective_to, b.note, p_uid, p_uid)
    RETURNING id INTO v_id;
    n := 1;
  ELSIF v_op = 'assign' THEN
    a := jsonb_populate_record(NULL::public.discount_assignments, ch -> 'row');
    INSERT INTO public.discount_assignments (student_id, discount_def_id, effective_from, effective_to, note, created_by, updated_by)
    VALUES (a.student_id, a.discount_def_id, a.effective_from, a.effective_to, a.note, p_uid, p_uid)
    RETURNING id INTO v_id;
    n := 1;
  ELSIF v_op IN ('set_end', 'edit') AND v_bonus THEN
    b := jsonb_populate_record(jsonb_populate_record(NULL::public.referral_bonuses, v_cur), ch -> 'patch');
    UPDATE public.referral_bonuses
       SET type = b.type, cadence = b.cadence, value = b.value, effective_from = b.effective_from,
           effective_to = b.effective_to, note = b.note, updated_at = now(), updated_by = p_uid
     WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op IN ('set_end', 'edit') THEN
    a := jsonb_populate_record(jsonb_populate_record(NULL::public.discount_assignments, v_cur), ch -> 'patch');
    UPDATE public.discount_assignments
       SET discount_def_id = a.discount_def_id, effective_from = a.effective_from, effective_to = a.effective_to,
           note = a.note, updated_at = now(), updated_by = p_uid
     WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'remove' AND v_bonus THEN
    DELETE FROM public.referral_bonuses WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'remove' THEN
    DELETE FROM public.discount_assignments WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  RETURN jsonb_build_object('written', n, 'result', jsonb_build_object('id', v_id),
    'guard_trigger', CASE WHEN v_bonus THEN 'referral_bonuses' ELSE 'discount_assignments' END || '.zz_discount_money_guard');
END $fn$;

CREATE OR REPLACE FUNCTION public._money_plan__discount_assignment(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public._money_plan__discount('discount_assignment', p_op, p_args)
$fn$;
CREATE OR REPLACE FUNCTION public._money_exec__discount_assignment(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public._money_exec__discount('discount_assignment', p_plan, p_uid)
$fn$;
CREATE OR REPLACE FUNCTION public._money_plan__referral_bonus(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public._money_plan__discount('referral_bonus', p_op, p_args)
$fn$;
CREATE OR REPLACE FUNCTION public._money_exec__referral_bonus(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public._money_exec__discount('referral_bonus', p_plan, p_uid)
$fn$;

-- ---------------------------------------------------------------- 5
-- G-17: pay rates and their mirror columns.

CREATE OR REPLACE FUNCTION public._pay_rate_money_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r jsonb;
  a jsonb;
  v_tier int;
  v_subject uuid;
  v_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  v_ok boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    r := public._money_pay_row_reach(NEW.teacher_id, NEW.assistant_id, NEW.effective_from, NULL);
    v_subject := COALESCE(NEW.teacher_id, NEW.assistant_id);
  ELSIF TG_OP = 'DELETE' THEN
    r := public._money_pay_row_reach(OLD.teacher_id, OLD.assistant_id, OLD.effective_from, OLD.id);
    v_subject := COALESCE(OLD.teacher_id, OLD.assistant_id);
  ELSE
    IF NEW.teacher_id IS NOT DISTINCT FROM OLD.teacher_id AND NEW.assistant_id IS NOT DISTINCT FROM OLD.assistant_id
       AND NEW.effective_from IS NOT DISTINCT FROM OLD.effective_from AND NEW.pay_rate_type IS NOT DISTINCT FROM OLD.pay_rate_type
       AND NEW.hourly_rate_vnd IS NOT DISTINCT FROM OLD.hourly_rate_vnd
       AND NEW.per_session_rate_vnd IS NOT DISTINCT FROM OLD.per_session_rate_vnd THEN
      RETURN NEW;                                 -- the note
    END IF;
    r := public._money_pay_combine(
           public._money_pay_row_reach(OLD.teacher_id, OLD.assistant_id, OLD.effective_from, OLD.id),
           public._money_pay_row_reach(NEW.teacher_id, NEW.assistant_id, NEW.effective_from, NEW.id));
    v_subject := CASE WHEN COALESCE(NEW.teacher_id, NEW.assistant_id) = COALESCE(OLD.teacher_id, OLD.assistant_id)
                      THEN COALESCE(NEW.teacher_id, NEW.assistant_id) END;   -- a row that changes person is never acknowledged
  END IF;
  v_tier := COALESCE((r ->> 'tier')::int, 3);
  IF v_tier > 0 THEN
    a := public._money_input_ack('pay_rate', NULL, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
    v_ok := a IS NOT NULL AND v_subject IS NOT NULL AND a ->> 'target_id' = v_subject::text
            AND CASE WHEN TG_OP = 'DELETE' THEN a ->> 'op' = 'remove' ELSE a ->> 'op' = 'set' END;
  END IF;
  PERFORM public._money_input_gate('pay_rate', 'staff_pay_rates', TG_OP, v_id, v_tier, v_ok,
    'This reaches lessons already taught or a closed payroll month. Change it from the pay-rate history, with a reason.');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_pay_rate_money_guard ON public.staff_pay_rates;
CREATE TRIGGER zz_pay_rate_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.staff_pay_rates
  FOR EACH ROW EXECUTE FUNCTION public._pay_rate_money_guard();

CREATE OR REPLACE FUNCTION public._staff_pay_mirror_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_teacher uuid := CASE WHEN TG_TABLE_NAME = 'teachers' THEN NEW.id END;
  v_assistant uuid := CASE WHEN TG_TABLE_NAME = 'teaching_assistants' THEN NEW.id END;
  v_first date;
  r jsonb;
  a jsonb;
  v_tier int;
  v_ok boolean := false;
BEGIN
  SELECT min(x.effective_from) INTO v_first FROM public.staff_pay_rates x
   WHERE (v_teacher IS NOT NULL AND x.teacher_id = v_teacher) OR (v_assistant IS NOT NULL AND x.assistant_id = v_assistant);
  r := public._money_pay_mirror_reach(v_teacher, v_assistant, v_first);
  v_tier := COALESCE((r ->> 'tier')::int, 3);
  IF v_tier > 0 THEN
    a := public._money_input_ack('pay_rate', NULL, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
    v_ok := a IS NOT NULL AND a ->> 'target_id' = NEW.id::text AND a ->> 'op' IN ('set', 'remove');
  END IF;
  PERFORM public._money_input_gate('pay_rate', TG_TABLE_NAME, TG_OP, NEW.id, v_tier, v_ok,
    'This person has lessons no dated rate covers. Change the rate from the pay-rate history, from a date, with a reason.');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS zz_staff_pay_mirror_guard ON public.teachers;
CREATE TRIGGER zz_staff_pay_mirror_guard BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  WHEN (OLD.pay_rate_type IS DISTINCT FROM NEW.pay_rate_type OR OLD.hourly_rate_vnd IS DISTINCT FROM NEW.hourly_rate_vnd
     OR OLD.per_session_rate_vnd IS DISTINCT FROM NEW.per_session_rate_vnd)
  EXECUTE FUNCTION public._staff_pay_mirror_guard();
DROP TRIGGER IF EXISTS zz_staff_pay_mirror_guard ON public.teaching_assistants;
CREATE TRIGGER zz_staff_pay_mirror_guard BEFORE UPDATE ON public.teaching_assistants
  FOR EACH ROW
  WHEN (OLD.pay_rate_type IS DISTINCT FROM NEW.pay_rate_type OR OLD.hourly_rate_vnd IS DISTINCT FROM NEW.hourly_rate_vnd
     OR OLD.per_session_rate_vnd IS DISTINCT FROM NEW.per_session_rate_vnd)
  EXECUTE FUNCTION public._staff_pay_mirror_guard();

-- The rate in force for a person on a date, from the history alone, with
-- p_skip left out and p_add (a row not yet written) taken in.
CREATE OR REPLACE FUNCTION public._money_pay_rate_on(p_teacher uuid, p_assistant uuid, p_date date, p_skip uuid, p_add jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT jsonb_build_object('pay_rate_type', q.pay_rate_type, 'hourly_rate_vnd', q.hourly_rate_vnd,
                            'per_session_rate_vnd', q.per_session_rate_vnd)
    FROM (SELECT x.effective_from, x.pay_rate_type, x.hourly_rate_vnd, x.per_session_rate_vnd
            FROM public.staff_pay_rates x
           WHERE ((p_teacher IS NOT NULL AND x.teacher_id = p_teacher) OR (p_assistant IS NOT NULL AND x.assistant_id = p_assistant))
             AND (p_skip IS NULL OR x.id <> p_skip)
          UNION ALL
          SELECT (p_add ->> 'effective_from')::date, p_add ->> 'pay_rate_type', (p_add ->> 'hourly_rate_vnd')::int,
                 (p_add ->> 'per_session_rate_vnd')::int
           WHERE p_add IS NOT NULL) q
   WHERE q.effective_from <= p_date
   ORDER BY q.effective_from DESC LIMIT 1
$fn$;

CREATE OR REPLACE FUNCTION public._money_plan__pay_rate(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_teacher uuid;
  v_assistant uuid;
  v_from date;
  v_type text;
  v_hourly numeric;
  v_per numeric;
  v_note text;
  x public.staff_pay_rates%ROWTYPE;
  v_found boolean := false;
  v_first date;
  v_row jsonb;
  v_mirror_now jsonb;
  v_mirror_next jsonb;
  r jsonb;
  v_change jsonb;
  v_bad constant jsonb := jsonb_build_object('refuse_code', 'bad_args');
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN RETURN v_bad; END IF;

  IF p_op = 'set' THEN
    v_teacher := public._money_uuid(p_args ->> 'teacher_id');
    v_assistant := public._money_uuid(p_args ->> 'assistant_id');
    v_from := public._money_date(p_args ->> 'effective_from');
    v_type := p_args ->> 'pay_rate_type';
    IF (v_teacher IS NULL) = (v_assistant IS NULL) OR v_from IS NULL OR COALESCE(v_type, '') NOT IN ('hourly', 'per_session')
       OR jsonb_typeof(COALESCE(p_args -> 'hourly_rate_vnd', '0'::jsonb)) <> 'number'
       OR jsonb_typeof(COALESCE(p_args -> 'per_session_rate_vnd', '0'::jsonb)) <> 'number' THEN
      RETURN v_bad;
    END IF;
    v_hourly := COALESCE((p_args ->> 'hourly_rate_vnd')::numeric, 0);
    v_per := COALESCE((p_args ->> 'per_session_rate_vnd')::numeric, 0);
    -- the table's own rule: the rate in use is a real number, the other is 0
    IF v_hourly <> trunc(v_hourly) OR v_per <> trunc(v_per) OR v_hourly > 2000000000 OR v_per > 2000000000
       OR NOT ((v_type = 'hourly' AND v_hourly > 0 AND v_per = 0) OR (v_type = 'per_session' AND v_per > 0 AND v_hourly = 0)) THEN
      RETURN v_bad;
    END IF;
    IF (v_teacher IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = v_teacher))
       OR (v_assistant IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teaching_assistants t WHERE t.id = v_assistant)) THEN
      RETURN v_bad;
    END IF;
    v_note := NULLIF(left(COALESCE(p_args ->> 'note', ''), 1000), '');
    SELECT * INTO x FROM public.staff_pay_rates y
     WHERE y.effective_from = v_from
       AND ((v_teacher IS NOT NULL AND y.teacher_id = v_teacher) OR (v_assistant IS NOT NULL AND y.assistant_id = v_assistant));
    v_found := FOUND;
    v_row := jsonb_build_object('teacher_id', v_teacher, 'assistant_id', v_assistant, 'effective_from', v_from,
                                'pay_rate_type', v_type, 'hourly_rate_vnd', v_hourly::int, 'per_session_rate_vnd', v_per::int,
                                'note', v_note);
    IF v_found AND x.pay_rate_type = v_type AND x.hourly_rate_vnd = v_hourly AND x.per_session_rate_vnd = v_per
       AND x.note IS NOT DISTINCT FROM v_note THEN
      RETURN jsonb_build_object('entity', 'pay_rate', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
    END IF;
    r := public._money_pay_row_reach(v_teacher, v_assistant, v_from, CASE WHEN v_found THEN x.id END);
    v_mirror_next := public._money_pay_rate_on(v_teacher, v_assistant, v_today, CASE WHEN v_found THEN x.id END, v_row);
    v_change := jsonb_build_object('row', v_row, 'rate_id', CASE WHEN v_found THEN x.id END);
  ELSIF p_op = 'remove' THEN
    SELECT * INTO x FROM public.staff_pay_rates y WHERE y.id = public._money_uuid(p_args ->> 'rate_id');
    IF NOT FOUND THEN
      IF public._money_uuid(p_args ->> 'rate_id') IS NULL THEN RETURN v_bad; END IF;
      RAISE EXCEPTION 'pay rate not found' USING ERRCODE = 'P0002';
    END IF;
    v_found := true;
    v_teacher := x.teacher_id;
    v_assistant := x.assistant_id;
    v_from := x.effective_from;
    r := public._money_pay_row_reach(v_teacher, v_assistant, v_from, x.id);
    v_mirror_next := public._money_pay_rate_on(v_teacher, v_assistant, v_today, x.id, NULL);
    v_change := jsonb_build_object('rate_id', x.id, 'deleted', true);
  ELSE
    RETURN jsonb_build_object('refuse_code', 'bad_op');
  END IF;

  SELECT min(y.effective_from) INTO v_first FROM public.staff_pay_rates y
   WHERE (v_teacher IS NOT NULL AND y.teacher_id = v_teacher) OR (v_assistant IS NOT NULL AND y.assistant_id = v_assistant);
  IF p_op = 'remove' AND v_first = x.effective_from THEN
    -- the person's first rate: without it the earlier dates fall back to the mirror
    RETURN jsonb_build_object('entity', 'pay_rate', 'op', p_op, 'refuse_code', 'first_rate', 'tier', 0);
  END IF;

  -- the mirror ("the rate now") follows the history; where it changes, the
  -- dates no history row covers move with it
  IF v_teacher IS NOT NULL THEN
    SELECT jsonb_build_object('pay_rate_type', t.pay_rate_type, 'hourly_rate_vnd', t.hourly_rate_vnd,
                              'per_session_rate_vnd', t.per_session_rate_vnd) INTO v_mirror_now
      FROM public.teachers t WHERE t.id = v_teacher;
  ELSE
    SELECT jsonb_build_object('pay_rate_type', t.pay_rate_type, 'hourly_rate_vnd', t.hourly_rate_vnd,
                              'per_session_rate_vnd', t.per_session_rate_vnd) INTO v_mirror_now
      FROM public.teaching_assistants t WHERE t.id = v_assistant;
  END IF;
  IF v_mirror_next IS NOT NULL AND v_mirror_next IS DISTINCT FROM v_mirror_now THEN
    r := public._money_pay_combine(r, public._money_pay_mirror_reach(v_teacher, v_assistant,
           CASE WHEN p_op = 'set' THEN LEAST(v_first, v_from) ELSE v_first END));
    v_change := v_change || jsonb_build_object('mirror', v_mirror_next, 'old_mirror', v_mirror_now);
  END IF;
  RETURN public._money_input_plan('pay_rate', p_op, COALESCE(v_teacher, v_assistant),
           CASE WHEN v_found THEN jsonb_build_array(to_jsonb(x)) ELSE '[]'::jsonb END, v_change, r, 0, NULL);
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__pay_rate(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_op text := p_plan ->> 'op';
  ch jsonb := p_plan -> 'change';
  v_id uuid := public._money_uuid(ch ->> 'rate_id');
  v_subject uuid := (p_plan ->> 'target_id')::uuid;
  v_cur jsonb;
  m jsonb := ch -> 'mirror';
  w jsonb := ch -> 'row';
  n int := 0;
  c int;
  v_is_teacher boolean;
BEGIN
  IF v_id IS NOT NULL THEN
    SELECT to_jsonb(x) INTO v_cur FROM public.staff_pay_rates x WHERE x.id = v_id FOR UPDATE;
  END IF;
  IF v_cur IS DISTINCT FROM (p_plan -> 'row_before' -> 0) THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The pay rate changed since the preview.';
  END IF;
  IF v_op = 'set' AND v_id IS NULL THEN
    -- a plain INSERT: no ON CONFLICT (design G-17)
    INSERT INTO public.staff_pay_rates (teacher_id, assistant_id, effective_from, pay_rate_type, hourly_rate_vnd,
                                        per_session_rate_vnd, note, created_by)
    VALUES (public._money_uuid(w ->> 'teacher_id'), public._money_uuid(w ->> 'assistant_id'), (w ->> 'effective_from')::date,
            w ->> 'pay_rate_type', (w ->> 'hourly_rate_vnd')::int, (w ->> 'per_session_rate_vnd')::int, w ->> 'note', p_uid)
    RETURNING id INTO v_id;
    n := 1;
  ELSIF v_op = 'set' THEN
    UPDATE public.staff_pay_rates
       SET pay_rate_type = w ->> 'pay_rate_type', hourly_rate_vnd = (w ->> 'hourly_rate_vnd')::int,
           per_session_rate_vnd = (w ->> 'per_session_rate_vnd')::int, note = w ->> 'note'
     WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSIF v_op = 'remove' THEN
    DELETE FROM public.staff_pay_rates WHERE id = v_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  IF m IS NOT NULL AND jsonb_typeof(m) = 'object' THEN
    v_is_teacher := (v_op = 'set' AND w ->> 'teacher_id' IS NOT NULL)
                    OR (v_op = 'remove' AND v_cur ->> 'teacher_id' IS NOT NULL);
    IF v_is_teacher THEN
      UPDATE public.teachers SET pay_rate_type = m ->> 'pay_rate_type', hourly_rate_vnd = (m ->> 'hourly_rate_vnd')::int,
             per_session_rate_vnd = (m ->> 'per_session_rate_vnd')::int WHERE id = v_subject;
    ELSE
      UPDATE public.teaching_assistants SET pay_rate_type = m ->> 'pay_rate_type', hourly_rate_vnd = (m ->> 'hourly_rate_vnd')::int,
             per_session_rate_vnd = (m ->> 'per_session_rate_vnd')::int WHERE id = v_subject;
    END IF;
    GET DIAGNOSTICS c = ROW_COUNT;
    n := n + c;
  END IF;
  RETURN jsonb_build_object('written', n, 'guard_trigger', 'staff_pay_rates.zz_pay_rate_money_guard',
                            'result', jsonb_build_object('rate_id', v_id));
END $fn$;

-- ---------------------------------------------------------------- 6
-- G-18: unfreezing a bill. Never tier 0: T2, and T3 when the bill is paid or
-- confirmed (now, or ever - the bill floor).

CREATE OR REPLACE FUNCTION public._money_unfreeze_tier(p_invoice_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE((
    SELECT CASE WHEN COALESCE(i.recorded_payment, 0) > 0 OR i.status::text IN ('paid', 'partial')
                  OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
                  OR COALESCE(f.ever_paid, false) OR COALESCE(f.ever_signed, false) THEN 3 ELSE 2 END
      FROM public.invoices i
      LEFT JOIN public.invoice_state_floor f ON f.student_id = i.student_id AND f.month = i.month
     WHERE i.id = p_invoice_id), 3)
$fn$;

CREATE OR REPLACE FUNCTION public._invoice_unfreeze_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_tier int := public._money_unfreeze_tier(OLD.id);
  a jsonb;
  v_day date := COALESCE(public._money_date(OLD.month || '-01'), DATE '1900-01-01');
BEGIN
  a := public._money_input_ack('invoice_freeze', OLD.student_id, v_day, v_day, v_tier);
  PERFORM public._money_input_gate('invoice_freeze', 'invoices', TG_OP, OLD.id, v_tier,
    a IS NOT NULL AND a ->> 'op' = 'unfreeze' AND a ->> 'target_id' = OLD.id::text,
    'A frozen bill is unfrozen from the child''s bill, with a reason.');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS zz_invoice_unfreeze_guard ON public.invoices;
CREATE TRIGGER zz_invoice_unfreeze_guard BEFORE UPDATE ON public.invoices
  FOR EACH ROW WHEN (OLD.tuition_frozen AND NOT NEW.tuition_frozen)
  EXECUTE FUNCTION public._invoice_unfreeze_guard();

CREATE OR REPLACE FUNCTION public._money_plan__invoice_freeze(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  i public.invoices%ROWTYPE;
  v_id uuid;
  v_day date;
  v_state jsonb;
  v_inv jsonb;
  v_tier int;
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
  IF p_op <> 'unfreeze' THEN RETURN jsonb_build_object('refuse_code', 'bad_op'); END IF;
  v_id := public._money_uuid(p_args ->> 'invoice_id');
  IF v_id IS NOT NULL THEN
    SELECT * INTO i FROM public.invoices x WHERE x.id = v_id;
  ELSIF public._money_uuid(p_args ->> 'student_id') IS NOT NULL AND COALESCE(p_args ->> 'month', '') ~ '^\d{4}-\d{2}$' THEN
    SELECT * INTO i FROM public.invoices x WHERE x.student_id = public._money_uuid(p_args ->> 'student_id') AND x.month = p_args ->> 'month';
  ELSE
    RETURN jsonb_build_object('refuse_code', 'bad_args');
  END IF;
  IF i.id IS NULL THEN RAISE EXCEPTION 'bill not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT COALESCE(i.tuition_frozen, false) THEN
    RETURN jsonb_build_object('entity', 'invoice_freeze', 'op', p_op, 'refuse_code', 'not_frozen', 'tier', 0);
  END IF;
  v_day := COALESCE(public._money_date(i.month || '-01'), DATE '1900-01-01');
  v_tier := public._money_unfreeze_tier(i.id);
  v_state := public.tuition_month_state(i.student_id, i.month);
  v_inv := jsonb_build_array(to_jsonb(i) - 'class_breakdown');
  RETURN public._money_input_plan('invoice_freeze', p_op, i.id, v_inv,
    jsonb_build_object('invoice_id', i.id, 'student_id', i.student_id, 'month', i.month, 'tuition_frozen', false),
    jsonb_build_object('tier', v_tier, 'from', v_day, 'to', v_day, 'students', jsonb_build_array(i.student_id),
      'pairs', jsonb_build_array(v_state), 'invoices_before', v_inv,
      'refresh_pairs', jsonb_build_array(jsonb_build_object('student_id', i.student_id, 'month', i.month)),
      'fp', md5(v_inv::text || v_state::text),
      'impact', jsonb_build_object('families', 1, 'closed_payroll', false, 'unfreeze', true,
        'paid_vnd', GREATEST(COALESCE(i.recorded_payment, 0), COALESCE((SELECT f.max_recorded_payment FROM public.invoice_state_floor f
                                                                         WHERE f.student_id = i.student_id AND f.month = i.month), 0)))),
    2, NULL);
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__invoice_freeze(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  n int;
BEGIN
  IF p_plan ->> 'op' <> 'unfreeze' THEN RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015'; END IF;
  UPDATE public.invoices SET tuition_frozen = false WHERE id = (p_plan ->> 'target_id')::uuid AND tuition_frozen;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 OR (SELECT x.tuition_frozen FROM public.invoices x WHERE x.id = (p_plan ->> 'target_id')::uuid) THEN
    -- the freeze guard put it back (not an admin), or it was unfrozen meanwhile
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The bill is no longer frozen, or could not be unfrozen.';
  END IF;
  RETURN jsonb_build_object('written', n, 'guard_trigger', 'invoices.zz_invoice_unfreeze_guard');
END $fn$;

-- ---------------------------------------------------------------- 7
-- G-19: family and sibling fields (R-14).

CREATE OR REPLACE FUNCTION public._family_link_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r jsonb;
  a jsonb;
  v_tier int;
  v_ok boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'families' THEN
    r := public._money_family_reach(NULL, OLD.id, NULL);
    v_tier := COALESCE((r ->> 'tier')::int, 3);
    IF v_tier > 0 THEN
      a := public._money_input_ack('family_link', NULL, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
      v_ok := a IS NOT NULL AND a ->> 'op' = 'set_sibling_percent' AND a ->> 'target_id' = OLD.id::text;
    END IF;
  ELSE
    r := public._money_family_reach(OLD.id, OLD.family_id, NEW.family_id);
    v_tier := COALESCE((r ->> 'tier')::int, 3);
    IF v_tier > 0 THEN
      a := public._money_input_ack('family_link', OLD.id, (r ->> 'from')::date, (r ->> 'to')::date, v_tier);
      v_ok := a IS NOT NULL AND a ->> 'target_id' = OLD.id::text
              AND ((a ->> 'op' = 'set_family' AND NEW.sibling_discount_from IS NOT DISTINCT FROM OLD.sibling_discount_from)
                OR (a ->> 'op' = 'set_sibling_from' AND NEW.family_id IS NOT DISTINCT FROM OLD.family_id));
    END IF;
  END IF;
  PERFORM public._money_input_gate('family_link', TG_TABLE_NAME, TG_OP, OLD.id, v_tier, v_ok,
    'This reaches months already billed for this family. Change it from the family screen, with a reason.');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS zz_family_link_guard ON public.students;
CREATE TRIGGER zz_family_link_guard BEFORE UPDATE ON public.students
  FOR EACH ROW
  WHEN (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.sibling_discount_from IS DISTINCT FROM NEW.sibling_discount_from)
  EXECUTE FUNCTION public._family_link_guard();
DROP TRIGGER IF EXISTS zz_family_link_guard ON public.families;
CREATE TRIGGER zz_family_link_guard BEFORE UPDATE ON public.families
  FOR EACH ROW WHEN (OLD.sibling_percent_override IS DISTINCT FROM NEW.sibling_percent_override)
  EXECUTE FUNCTION public._family_link_guard();

CREATE OR REPLACE FUNCTION public._money_plan__family_link(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s public.students%ROWTYPE;
  f public.families%ROWTYPE;
  v_kid uuid;
  v_fam uuid;
  v_date date;
  v_pct numeric;
  r jsonb;
  v_bad constant jsonb := jsonb_build_object('refuse_code', 'bad_args');
  v_same constant jsonb := jsonb_build_object('entity', 'family_link', 'op', p_op, 'refuse_code', 'nothing_to_change', 'tier', 0);
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN RETURN v_bad; END IF;
  IF p_op IN ('set_family', 'set_sibling_from') THEN
    v_kid := public._money_uuid(p_args ->> 'student_id');
    IF v_kid IS NULL THEN RETURN v_bad; END IF;
    SELECT * INTO s FROM public.students x WHERE x.id = v_kid;
    IF NOT FOUND THEN RAISE EXCEPTION 'child not found' USING ERRCODE = 'P0002'; END IF;
  END IF;

  IF p_op = 'set_family' THEN
    IF NOT (p_args ? 'family_id') OR (p_args ->> 'family_id' IS NOT NULL AND public._money_uuid(p_args ->> 'family_id') IS NULL) THEN
      RETURN v_bad;
    END IF;
    v_fam := public._money_uuid(p_args ->> 'family_id');
    IF v_fam IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.families x WHERE x.id = v_fam) THEN RETURN v_bad; END IF;
    IF v_fam IS NOT DISTINCT FROM s.family_id THEN RETURN v_same; END IF;
    r := public._money_family_reach(s.id, s.family_id, v_fam);
    RETURN public._money_input_plan('family_link', p_op, s.id,
      jsonb_build_array(jsonb_build_object('id', s.id, 'family_id', s.family_id, 'sibling_discount_from', s.sibling_discount_from)),
      jsonb_build_object('student_id', s.id, 'family_id', v_fam, 'old_family_id', s.family_id), r, 0, NULL);

  ELSIF p_op = 'set_sibling_from' THEN
    IF NOT (p_args ? 'date') OR (p_args ->> 'date' IS NOT NULL AND public._money_date(p_args ->> 'date') IS NULL) THEN
      RETURN v_bad;
    END IF;
    v_date := public._money_date(p_args ->> 'date');
    IF v_date IS NOT DISTINCT FROM s.sibling_discount_from THEN RETURN v_same; END IF;
    r := public._money_family_reach(s.id, s.family_id, s.family_id);
    RETURN public._money_input_plan('family_link', p_op, s.id,
      jsonb_build_array(jsonb_build_object('id', s.id, 'family_id', s.family_id, 'sibling_discount_from', s.sibling_discount_from)),
      jsonb_build_object('student_id', s.id, 'sibling_discount_from', v_date, 'old_sibling_discount_from', s.sibling_discount_from),
      r, 0, NULL);

  ELSIF p_op = 'set_sibling_percent' THEN
    v_fam := public._money_uuid(p_args ->> 'family_id');
    IF v_fam IS NULL OR NOT (p_args ? 'percent')
       OR jsonb_typeof(p_args -> 'percent') NOT IN ('null', 'number') THEN
      RETURN v_bad;
    END IF;
    v_pct := (p_args ->> 'percent')::numeric;
    IF v_pct < 0 OR v_pct > 100 THEN RETURN v_bad; END IF;
    SELECT * INTO f FROM public.families x WHERE x.id = v_fam;
    IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE = 'P0002'; END IF;
    IF v_pct IS NOT DISTINCT FROM f.sibling_percent_override THEN RETURN v_same; END IF;
    r := public._money_family_reach(NULL, f.id, NULL);
    RETURN public._money_input_plan('family_link', p_op, f.id,
      jsonb_build_array(jsonb_build_object('id', f.id, 'sibling_percent_override', f.sibling_percent_override)),
      jsonb_build_object('family_id', f.id, 'percent', v_pct, 'old_percent', f.sibling_percent_override), r, 0, NULL);
  END IF;
  RETURN jsonb_build_object('refuse_code', 'bad_op');
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__family_link(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_op text := p_plan ->> 'op';
  ch jsonb := p_plan -> 'change';
  b jsonb := p_plan -> 'row_before' -> 0;
  n int := 0;
  v_trg text := 'students.zz_family_link_guard';
BEGIN
  -- each write names the row as the admin was shown it: nothing is changed
  -- when it moved since the preview
  IF v_op = 'set_family' THEN
    UPDATE public.students SET family_id = public._money_uuid(ch ->> 'family_id')
     WHERE id = (ch ->> 'student_id')::uuid AND family_id IS NOT DISTINCT FROM public._money_uuid(b ->> 'family_id');
  ELSIF v_op = 'set_sibling_from' THEN
    UPDATE public.students SET sibling_discount_from = (ch ->> 'sibling_discount_from')::date
     WHERE id = (ch ->> 'student_id')::uuid
       AND sibling_discount_from IS NOT DISTINCT FROM (b ->> 'sibling_discount_from')::date;
  ELSIF v_op = 'set_sibling_percent' THEN
    UPDATE public.families SET sibling_percent_override = (ch ->> 'percent')::numeric
     WHERE id = (ch ->> 'family_id')::uuid
       AND sibling_percent_override IS NOT DISTINCT FROM (b ->> 'sibling_percent_override')::numeric;
    v_trg := 'families.zz_family_link_guard';
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The family link changed since the preview.';
  END IF;
  RETURN jsonb_build_object('written', n, 'guard_trigger', v_trg);
END $fn$;

-- ---------------------------------------------------------------- 8
-- G-21: hard deletes (every lane; "deactivate" / "archive" is the way).

CREATE OR REPLACE FUNCTION public._student_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.student_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.student_id = OLD.id
                 AND (COALESCE(i.recorded_payment, 0) > 0 OR i.status::text IN ('paid', 'partial')))
     OR EXISTS (SELECT 1 FROM public.invoice_state_floor f WHERE f.student_id = OLD.id
                 AND (f.ever_paid OR COALESCE(f.max_recorded_payment, 0) > 0))
     OR EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = OLD.id AND a.marked_by IS NOT NULL) THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=student_has_history; This child has payments, a paid bill or marks made by a person. Deactivate instead.';
  END IF;
  RETURN OLD;
END $fn$;

DROP TRIGGER IF EXISTS zz_student_delete_guard ON public.students;
CREATE TRIGGER zz_student_delete_guard BEFORE DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public._student_delete_guard();

CREATE OR REPLACE FUNCTION public._class_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = OLD.id) THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=class_has_history; This class has enrolments. Archive it instead.';
  END IF;
  RETURN OLD;
END $fn$;

DROP TRIGGER IF EXISTS zz_class_delete_guard ON public.classes;
CREATE TRIGGER zz_class_delete_guard BEFORE DELETE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public._class_delete_guard();

-- families was not in the audit list (20261009130000).
DROP TRIGGER IF EXISTS audit_families ON public.families;
CREATE TRIGGER audit_families AFTER INSERT OR UPDATE OR DELETE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ---------------------------------------------------------------- 9
-- Grants: nobody, except the one new public RPC (it checks admin inside;
-- service_role has no grant).

REVOKE ALL ON FUNCTION
  public._money_uuid(text),
  public._money_date(text),
  public._money_family_kids(uuid[]),
  public._money_span(jsonb, jsonb, text, text, text[], int),
  public._money_tuition_reach(uuid[], uuid, date, date),
  public._money_pay_reach(uuid, uuid, date, date),
  public._money_pay_combine(jsonb, jsonb),
  public._money_pay_row_reach(uuid, uuid, date, uuid),
  public._money_pay_mirror_reach(uuid, uuid, date),
  public._money_family_reach(uuid, uuid, uuid),
  public._money_input_ack(text, uuid, date, date, int),
  public._money_input_gate(text, text, text, uuid, int, boolean, text),
  public._money_enrollment_rpc_call(),
  public._enrollment_money_guard(),
  public._money_enrollment_terms(jsonb),
  public.change_enrollment_terms(uuid, jsonb, date),
  public._money_input_plan(text, text, uuid, jsonb, jsonb, jsonb, int, text),
  public._money_plan__enrollment(text, jsonb, uuid),
  public._money_exec__enrollment(jsonb, uuid),
  public._discount_money_guard(),
  public._discount_definition_guard(),
  public._money_plan__discount(text, text, jsonb),
  public._money_exec__discount(text, jsonb, uuid),
  public._money_plan__discount_assignment(text, jsonb, uuid),
  public._money_exec__discount_assignment(jsonb, uuid),
  public._money_plan__referral_bonus(text, jsonb, uuid),
  public._money_exec__referral_bonus(jsonb, uuid),
  public._pay_rate_money_guard(),
  public._staff_pay_mirror_guard(),
  public._money_pay_rate_on(uuid, uuid, date, uuid, jsonb),
  public._money_plan__pay_rate(text, jsonb, uuid),
  public._money_exec__pay_rate(jsonb, uuid),
  public._money_unfreeze_tier(uuid),
  public._invoice_unfreeze_guard(),
  public._money_plan__invoice_freeze(text, jsonb, uuid),
  public._money_exec__invoice_freeze(jsonb, uuid),
  public._family_link_guard(),
  public._money_plan__family_link(text, jsonb, uuid),
  public._money_exec__family_link(jsonb, uuid),
  public._student_delete_guard(),
  public._class_delete_guard()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.change_enrollment_terms(uuid, jsonb, date) TO authenticated;

INSERT INTO public.money_change_events (kind, payload)
VALUES ('guard_installed', jsonb_build_object('migration', '20261114094000_d4_money_inputs_guard'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT string_agg(c.relname || '.' || t.tgname || '=' || t.tgenabled::text, ', ' ORDER BY c.relname, t.tgname) AS d4_money_input_triggers,
       count(*) AS n
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
   AND t.tgname IN ('zz_enrollment_money_guard', 'zz_discount_money_guard', 'zz_discount_definition_guard',
                    'zz_pay_rate_money_guard', 'zz_staff_pay_mirror_guard', 'zz_invoice_unfreeze_guard',
                    'zz_family_link_guard', 'zz_student_delete_guard', 'zz_class_delete_guard');
