-- D4 step 1b: the money guard's core, and the register (G-11, G-12).
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.0, b.3, b.8, c.0,
-- c.2; the conductor's rulings on D4-1a (DQ-1: a one-off cover teacher or
-- assistant may not lower a mark more than a week old). Build notes and the
-- design questions: docs/evidence/D4-build-1b.md.
--
-- WHAT THIS ADDS
--   tables    money_change_overrides  one append-only row per checked money change
--             money_change_events     what happened afterwards, and what the
--                                     triggers recorded instead of refusing
--   views     money_change_review_queue, money_change_tuition_pending
--   trigger   attendance.zz_attendance_money_guard  (G-11's seven rules + DQ-1)
--   helpers   tuition_month_state, tuition_reach, payroll_reach, _money_ack,
--             the plan / exec dispatcher and the 'attendance' entity
--             (ops set_marks, repair)
--   RPCs      money_change_preview, money_change_checked,
--             money_changes_checked_bulk (50 per call),
--             record_money_change_event, d4_guard_status (admin JWT only);
--             log_money_automation_refused (service_role only)
--   stubs     change_approval_needed, _change_request_claim - created only if
--             missing; step 4 replaces them
--
-- WHAT IT REFUSES. A register change that crosses the billable line (Present
-- / Absent / Late against Excused or no row) on a lesson that ended more than
-- 7 days ago: an admin then needs the checked path when the month's bill
-- makes it T1+; a teacher is refused when the lesson's month is past or a
-- person's Present / Late is being un-billed; the service lane is never
-- refused (recorded instead, R-7). And DQ-1: a person who is neither an admin
-- nor a teacher of the class (a one-off cover) may not lower a person's mark
-- on a lesson that ended more than 7 days ago. Today's register always saves.
--
-- REPLACES NOTHING of D1, D2 or D4 file 1. No row is changed.
-- Safe to paste twice.
--
-- Rollback: scripts/ROLLBACK-d4-2-register.sql (drops the one trigger).

BEGIN;

-- Fail fast instead of queueing behind a busy register (CREATE TRIGGER locks
-- attendance): the paste stops within 5 seconds and installs nothing.
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'public.session_effective_level(uuid, jsonb)',
    'public.invoice_floor_state(uuid, text)',
    'public._floor_mark_level(text, uuid)',
    'public._caller_lane()',
    'public.session_change_reason_ok(text)',
    'public.session_cancel_audit_append_only()',
    'public.session_cancel_audit_insert_guard()',
    'public._session_require_admin()',
    'public.session_has_started(date, time without time zone)',
    'public.payroll_month_is_locked(text)',
    'public.student_enrolled_on(uuid, uuid, date)',
    'public.has_role(uuid, public.app_role)',
    'public.is_teacher_of_class(uuid, uuid)',
    'auth.uid()',
    'auth.role()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;
  IF to_regclass('public.invoice_state_floor') IS NULL THEN
    v_missing := v_missing || 'table public.invoice_state_floor (paste 20261114090000_d4_floors first)'::text;
  END IF;
  FOR r IN
    SELECT * FROM (VALUES
      ('sessions',             ARRAY['id','class_id','date','start_time','end_time','status','teacher_id']),
      ('attendance',           ARRAY['id','session_id','student_id','status','marked_by','marked_at','notes']),
      ('invoices',             ARRAY['id','student_id','month','status','recorded_payment','confirmation_status','tuition_frozen',
                                     'base_amount','discount_amount','total_amount']),
      ('enrollments',          ARRAY['class_id','student_id','start_date','end_date']),
      ('students',             ARRAY['id','family_id']),
      ('session_participants', ARRAY['session_id','teaching_assistant_id','participant_type']),
      ('payroll_periods',      ARRAY['month','status'])
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
     WHERE c.conrelid = to_regclass('public.attendance') AND c.contype IN ('p', 'u')
       AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text) FROM unnest(c.conkey) k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k) = ARRAY['session_id', 'student_id']) THEN
    v_missing := v_missing || 'unique (session_id, student_id) on attendance'::text;
  END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_core_register cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the migrations that create these first (D1, D2, D4 file 1). Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- The audit tables. GRANTS as D2's (20261112091000:233-236): authenticated
-- SELECT (RLS: admins), service_role ALL (house rule); D2's own triggers
-- refuse every UPDATE, DELETE, TRUNCATE, and any INSERT not made by the table
-- owner (whom the definer functions of this file run as).

CREATE TABLE IF NOT EXISTS public.money_change_overrides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  txid             bigint NOT NULL DEFAULT txid_current(),
  actor_user_id    uuid NOT NULL,
  entity           text NOT NULL CHECK (entity IN ('attendance','session','class_fee','enrollment','discount_assignment',
                                                   'referral_bonus','pay_rate','invoice_freeze','family_link')),
  op               text NOT NULL,
  target_id        uuid NOT NULL,
  student_ids      uuid[] NOT NULL DEFAULT '{}',
  reach_from       date,
  reach_to         date,
  via              text NOT NULL CHECK (via IN ('single','bulk')),
  batch_id         uuid,
  tier             int NOT NULL CHECK (tier BETWEEN 0 AND 3),
  correction_mode  boolean NOT NULL,
  reason           text,
  correction_reason text,
  confirmed        boolean NOT NULL,
  token            text NOT NULL,
  row_before       jsonb NOT NULL,
  change           jsonb NOT NULL,
  reach            jsonb NOT NULL,
  evidence         jsonb,
  invoices_before  jsonb NOT NULL,
  refresh_pairs    jsonb NOT NULL,
  impact           jsonb NOT NULL,
  review_required  boolean NOT NULL,
  attached         jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT money_change_overrides_reason CHECK (tier = 0 OR reason IS NOT NULL),
  CONSTRAINT money_change_overrides_correction CHECK (correction_mode = (tier = 3)
                                                      AND (NOT correction_mode OR correction_reason IS NOT NULL)),
  CONSTRAINT money_change_overrides_attached_size CHECK (pg_column_size(attached) < 131072)
);
CREATE INDEX IF NOT EXISTS money_change_overrides_target_idx  ON public.money_change_overrides (entity, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS money_change_overrides_created_idx ON public.money_change_overrides (created_at DESC);
CREATE INDEX IF NOT EXISTS money_change_overrides_batch_idx   ON public.money_change_overrides (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS money_change_overrides_review_idx  ON public.money_change_overrides (review_required, created_at DESC);
CREATE INDEX IF NOT EXISTS money_change_overrides_txid_idx    ON public.money_change_overrides (txid);

CREATE TABLE IF NOT EXISTS public.money_change_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  override_id   uuid REFERENCES public.money_change_overrides(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  kind          text NOT NULL CHECK (kind IN ('guard_installed','tuition_refreshed','tuition_refresh_failed','reviewed',
                                              'automation_refused','service_retro_mark','owner_lane')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT money_change_events_payload_size CHECK (pg_column_size(payload) < 262144)
);
CREATE INDEX IF NOT EXISTS money_change_events_override_idx ON public.money_change_events (override_id, created_at);
CREATE INDEX IF NOT EXISTS money_change_events_kind_idx     ON public.money_change_events (kind, created_at DESC);

DO $trg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['money_change_overrides', 'money_change_events'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_append_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW
                      EXECUTE FUNCTION public.session_cancel_audit_append_only()', t || '_append_only', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_no_truncate', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT
                      EXECUTE FUNCTION public.session_cancel_audit_append_only()', t || '_no_truncate', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_insert_guard', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW
                      EXECUTE FUNCTION public.session_cancel_audit_insert_guard()', t || '_insert_guard', t);
  END LOOP;
END $trg$;

ALTER TABLE public.money_change_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_change_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS money_change_overrides_admin_read ON public.money_change_overrides;
CREATE POLICY money_change_overrides_admin_read ON public.money_change_overrides
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS money_change_events_admin_read ON public.money_change_events;
CREATE POLICY money_change_events_admin_read ON public.money_change_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.money_change_overrides, public.money_change_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.money_change_overrides, public.money_change_events TO authenticated;
GRANT ALL ON public.money_change_overrides, public.money_change_events TO service_role;

-- ---------------------------------------------------------------- 2
-- Clock rules (Hanoi), stated once.

-- "Past" month: before the month of (now in Hanoi - 7 days). The first week of
-- a month still counts the month before as current (design b.0).
CREATE OR REPLACE FUNCTION public._money_month_is_past(p_month text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT p_month < to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '7 days', 'YYYY-MM')
$fn$;

-- The register's free week: a lesson that has not ended, or ended 7 days ago
-- or less (R-8). An overnight lesson ends the next day.
CREATE OR REPLACE FUNCTION public._lesson_in_free_week(p_date date, p_start time, p_end time)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT ((p_date + p_end) + CASE WHEN p_end <= p_start THEN interval '1 day' ELSE interval '0' END)
           AT TIME ZONE 'Asia/Ho_Chi_Minh' >= now() - interval '7 days'
$fn$;

CREATE OR REPLACE FUNCTION public._attendance_billable(p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT COALESCE(p_status IN ('Present', 'Absent', 'Late'), false)
$fn$;

-- ---------------------------------------------------------------- 3
-- Tuition and pay tiers (design b.0), from stored facts. Read over
-- max(bill now, bill floor). Any error or NULL is tier 3.

CREATE OR REPLACE FUNCTION public.tuition_month_state(p_student uuid, p_month text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  i record;
  f record;
  v_past boolean;
  v_state text;
  v_tier int;
  v_has_bill boolean := false;
BEGIN
  BEGIN
    IF p_student IS NULL OR p_month IS NULL OR p_month !~ '^\d{4}-\d{2}$' THEN
      RAISE EXCEPTION 'bad month' USING ERRCODE = '22023';
    END IF;
    v_past := public._money_month_is_past(p_month);
    SELECT inv.id, inv.tuition_frozen, inv.confirmation_status, inv.recorded_payment, inv.status::text AS status
      INTO i FROM public.invoices inv WHERE inv.student_id = p_student AND inv.month = p_month;
    v_has_bill := FOUND;
    SELECT fl.ever_paid, fl.ever_signed, fl.ever_frozen INTO f
      FROM public.invoice_state_floor fl WHERE fl.student_id = p_student AND fl.month = p_month;
    v_state := CASE
      WHEN COALESCE(i.tuition_frozen, false) OR COALESCE(f.ever_frozen, false) THEN 'frozen'
      WHEN COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false) OR COALESCE(f.ever_signed, false) THEN 'signed'
      WHEN COALESCE(i.recorded_payment, 0) > 0 OR COALESCE(i.status IN ('paid', 'partial'), false)
           OR COALESCE(f.ever_paid, false) THEN 'paid'
      WHEN v_has_bill THEN 'issued'
      ELSE 'none' END;
    IF NOT v_past THEN
      v_tier := CASE WHEN v_state IN ('frozen', 'signed') THEN 2 ELSE 0 END;
    ELSE
      v_tier := CASE v_state
        WHEN 'frozen' THEN 3 WHEN 'signed' THEN 3 WHEN 'paid' THEN 2 WHEN 'issued' THEN 1
        ELSE CASE WHEN EXISTS (
               SELECT 1 FROM public.sessions s
                WHERE to_char(s.date, 'YYYY-MM') = p_month AND s.status <> 'Canceled'
                  AND s.class_id IN (SELECT e.class_id FROM public.enrollments e WHERE e.student_id = p_student))
             THEN 1 ELSE 0 END
        END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('student_id', p_student, 'month', p_month, 'past', NULL, 'state', 'unknown', 'tier', 3,
                              'error', SQLSTATE);
  END;
  RETURN jsonb_build_object('student_id', p_student, 'month', p_month, 'past', v_past, 'state', v_state,
                            'tier', COALESCE(v_tier, 3));
END $fn$;

-- The tuition reach of a change to these children (widened to every child of
-- their families, R-8a), class and dates. Months = every month from p_from to
-- p_to that is past or has a bill row.
CREATE OR REPLACE FUNCTION public.tuition_reach(p_students uuid[], p_class uuid, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kids uuid[];
  v_pairs jsonb;
  v_tier int;
  v_inv jsonb;
  v_fp text;
  v_impact jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'bad_range' USING ERRCODE = 'HC015';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), ARRAY[]::uuid[]) INTO v_kids FROM (
    SELECT unnest(COALESCE(p_students, ARRAY[]::uuid[])) AS k
    UNION
    SELECT st2.id FROM public.students st JOIN public.students st2 ON st2.family_id = st.family_id
     WHERE st.id = ANY (COALESCE(p_students, ARRAY[]::uuid[])) AND st.family_id IS NOT NULL) q;
  WITH months AS (
    SELECT to_char(m, 'YYYY-MM') AS month
      FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month') m
  ), pairs AS (
    SELECT k AS student_id, months.month, public.tuition_month_state(k, months.month) AS st
      FROM unnest(v_kids) k CROSS JOIN months
     WHERE public._money_month_is_past(months.month)
        OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.student_id = k AND i.month = months.month)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', student_id, 'month', month, 'state', st ->> 'state',
                                               'tier', (st ->> 'tier')::int)
                            ORDER BY student_id::text COLLATE "C", month), '[]'::jsonb),
         COALESCE(max((st ->> 'tier')::int), 0)
    INTO v_pairs, v_tier
    FROM pairs;
  SELECT COALESCE(jsonb_agg(to_jsonb(i) - 'class_breakdown' ORDER BY i.id::text COLLATE "C"), '[]'::jsonb) INTO v_inv
    FROM public.invoices i
   WHERE i.student_id = ANY (v_kids)
     AND i.month IN (SELECT p ->> 'month' FROM jsonb_array_elements(v_pairs) p WHERE (p ->> 'student_id')::uuid = i.student_id);
  v_fp := md5(v_pairs::text || md5(v_inv::text));
  SELECT jsonb_build_object(
           'families', count(DISTINCT COALESCE(st.family_id::text, 'student:' || (p ->> 'student_id')))
                         FILTER (WHERE p ->> 'state' IN ('paid', 'signed', 'frozen')),
           'paid_vnd', COALESCE(sum(GREATEST(COALESCE(i.recorded_payment, 0), COALESCE(fl.max_recorded_payment, 0))), 0),
           'closed_payroll', false)
    INTO v_impact
    FROM jsonb_array_elements(v_pairs) p
    LEFT JOIN public.students st ON st.id = (p ->> 'student_id')::uuid
    LEFT JOIN public.invoices i ON i.student_id = (p ->> 'student_id')::uuid AND i.month = p ->> 'month'
    LEFT JOIN public.invoice_state_floor fl ON fl.student_id = (p ->> 'student_id')::uuid AND fl.month = p ->> 'month';
  RETURN jsonb_build_object('tier', v_tier, 'students', to_jsonb(v_kids), 'class_id', p_class,
                            'months', (SELECT COALESCE(jsonb_agg(DISTINCT p ->> 'month'), '[]'::jsonb) FROM jsonb_array_elements(v_pairs) p),
                            'pairs', v_pairs, 'invoices_before', v_inv,
                            'refresh_pairs', (SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', p -> 'student_id', 'month', p -> 'month')), '[]'::jsonb)
                                                FROM jsonb_array_elements(v_pairs) p),
                            'fp', v_fp, 'impact', v_impact);
END $fn$;

-- Pay tier: T3 if a month in reach is locked; T1 if the person has a Held
-- lesson in reach dated before today (Hanoi); else T0.
CREATE OR REPLACE FUNCTION public.payroll_reach(p_teacher uuid, p_assistant uuid, p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_locked text[];
  v_held int;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'bad_range' USING ERRCODE = 'HC015';
  END IF;
  SELECT COALESCE(array_agg(to_char(m, 'YYYY-MM') ORDER BY m), ARRAY[]::text[]) INTO v_locked
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month') m
   WHERE public.payroll_month_is_locked(to_char(m, 'YYYY-MM'));
  SELECT count(*)::int INTO v_held FROM public.sessions s
   WHERE s.status = 'Held' AND s.date BETWEEN p_from AND LEAST(p_to, v_today - 1)
     AND ((p_teacher IS NOT NULL AND s.teacher_id = p_teacher)
          OR (p_assistant IS NOT NULL AND EXISTS (SELECT 1 FROM public.session_participants sp
                WHERE sp.session_id = s.id AND sp.teaching_assistant_id = p_assistant
                  AND sp.participant_type = 'teaching_assistant')));
  RETURN jsonb_build_object('tier', CASE WHEN cardinality(v_locked) > 0 THEN 3 WHEN v_held > 0 THEN 1 ELSE 0 END,
                            'locked_months', to_jsonb(v_locked), 'held_lessons', v_held,
                            'closed_payroll', cardinality(v_locked) > 0);
END $fn$;

-- ---------------------------------------------------------------- 4
-- The acknowledgement: the flag hec.money_change_ack names a row of THIS
-- transaction, written by money_change_checked, for one of these entities,
-- covering the target, the child and the window. Its stored tier must not be
-- lower than the trigger's own (A-8: a payment landed in between) -> HC011.
CREATE OR REPLACE FUNCTION public._money_ack(p_entities text[], p_target uuid, p_student uuid,
                                             p_from date, p_to date, p_tier int)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ack text := NULLIF(current_setting('hec.money_change_ack', true), '');
  o public.money_change_overrides;
BEGIN
  IF v_ack IS NULL THEN RETURN false; END IF;
  SELECT * INTO o FROM public.money_change_overrides ov
   WHERE ov.id::text = v_ack AND ov.txid = txid_current() AND ov.entity = ANY (p_entities);
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.target_id IS DISTINCT FROM p_target
     OR (p_student IS NOT NULL AND NOT (p_student = ANY (o.student_ids)))
     OR (p_from IS NOT NULL AND (o.reach_from IS NULL OR p_from < o.reach_from))
     OR (p_to IS NOT NULL AND (o.reach_to IS NULL OR p_to > o.reach_to)) THEN
    RETURN false;
  END IF;
  IF o.tier < COALESCE(p_tier, 3) THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011',
      DETAIL = 'The bill moved to a higher tier after the preview. Preview again.';
  END IF;
  RETURN true;
END $fn$;

-- ---------------------------------------------------------------- 5
-- G-11: the register and the bill. Direct statements only (trigger-made
-- writes - the seeds, the cancel's excuse-all - are not judged). In order:
--   1 INSERT while the (lesson, child) row exists -> pass (an upsert's
--     BEFORE INSERT fires before ON CONFLICT; its UPDATE is judged, R-4)
--   DQ-1 a person who is neither an admin nor a teacher of the class lowering
--     a person's mark of a lesson that ended more than 7 days ago -> HC025
--   2 no crossing of the billable line, or a cancelled lesson -> pass
--   3 the lesson ended 7 days ago or less -> pass, every lane (R-8)
--   4 an acknowledgement covering the change -> pass; owner lane -> pass + event
--   5 an admin: the bill's tier (at least T1 when a person's Present / Late is
--     un-billed, A-6); T0 -> pass, else HC025 retro_mark
--   6 anyone else signed in: refused when the lesson's month is past or a
--     person's Present / Late is un-billed - from the lesson and the mark only,
--     never the bill (A-3)
--   7 service lane: through, and one service_retro_mark event when 5 or 6
--     would have asked (R-7)
CREATE OR REPLACE FUNCTION public._attendance_money_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_sid uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.session_id ELSE NEW.session_id END;
  v_kid uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.student_id ELSE NEW.student_id END;
  v_old_status text := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status::text END;
  v_new_status text := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status::text END;
  v_old_by uuid := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.marked_by END;
  v_uid uuid := auth.uid();
  v_lane text;
  s record;
  v_month text;
  v_unbill_person boolean;
  v_admin boolean;
  v_tier int;
  v_teacher_refuse boolean;
  v_ok boolean;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  -- 1
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.attendance a
                                   WHERE a.session_id = NEW.session_id AND a.student_id = NEW.student_id) THEN
    RETURN NEW;
  END IF;

  SELECT ss.id, ss.class_id, ss.date, ss.start_time, ss.end_time, ss.status INTO s
    FROM public.sessions ss WHERE ss.id = v_sid;
  IF NOT FOUND THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;   -- FK refuses a missing lesson; a cascade is depth 2
  END IF;
  v_lane := public._caller_lane();

  -- DQ-1 (conductor's ruling on D4-1a): one-off cover staff, old lesson, a mark lowered.
  IF TG_OP <> 'INSERT' AND v_lane IN ('person', 'unknown')
     AND NOT COALESCE(v_uid IS NOT NULL AND (public.has_role(v_uid, 'admin'::public.app_role)
                                             OR public.is_teacher_of_class(v_uid, s.class_id)), false)
     AND NOT public._lesson_in_free_week(s.date, s.start_time, s.end_time)
     AND public._floor_mark_level(v_new_status, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.marked_by END)
         < public._floor_mark_level(v_old_status, v_old_by) THEN
    RAISE EXCEPTION 'attendance_requires_checked_path' USING ERRCODE = 'HC025',
      DETAIL = 'kind=cover_staff; This lesson is more than a week old. Please ask an administrator to change it.';
  END IF;

  -- 2
  IF public._attendance_billable(v_old_status) = public._attendance_billable(v_new_status) OR s.status = 'Canceled' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  -- 3
  IF public._lesson_in_free_week(s.date, s.start_time, s.end_time) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_month := to_char(s.date, 'YYYY-MM');
  v_unbill_person := v_old_by IS NOT NULL AND v_old_status IN ('Present', 'Late')
                     AND NOT public._attendance_billable(v_new_status);

  -- the tier an admin would meet (5), used by 4 and 7 as well
  v_tier := COALESCE((public.tuition_month_state(v_kid, v_month) ->> 'tier')::int, 3);
  IF v_unbill_person AND v_tier < 1 THEN v_tier := 1; END IF;

  -- 4: acknowledged by money_change_checked in this transaction
  IF public._money_ack(ARRAY['attendance'], s.id, v_kid, s.date, s.date, v_tier)
     OR public._money_ack(ARRAY['attendance'], s.class_id, v_kid, s.date, s.date, v_tier) THEN
    -- the write must be the one acknowledged: the status (and, for repair, an unsigned row)
    SELECT EXISTS (
      SELECT 1 FROM public.money_change_overrides o
       WHERE o.id::text = current_setting('hec.money_change_ack', true) AND o.txid = txid_current()
         AND TG_OP <> 'DELETE'
         AND ((o.op = 'set_marks' AND o.target_id = s.id AND NEW.marked_by IS NOT NULL
               AND EXISTS (SELECT 1 FROM jsonb_array_elements(o.change -> 'marks') m
                            WHERE m ->> 'student_id' = v_kid::text AND m ->> 'status' = v_new_status))
           OR (o.op = 'repair' AND o.target_id = s.class_id AND TG_OP = 'INSERT' AND NEW.marked_by IS NULL
               AND EXISTS (SELECT 1 FROM jsonb_array_elements(o.change -> 'lessons') l
                            WHERE l ->> 'session_id' = s.id::text AND l ->> 'status' = v_new_status))))
      INTO v_ok;
    IF v_ok THEN
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
  END IF;

  IF v_lane = 'owner' THEN
    IF v_tier > 0 THEN
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('owner_lane', jsonb_build_object('table', 'attendance', 'op', TG_OP, 'session_id', s.id, 'student_id', v_kid,
                                               'old_status', v_old_status, 'new_status', v_new_status, 'tier', v_tier));
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_teacher_refuse := public._money_month_is_past(v_month) OR v_unbill_person;

  IF v_lane = 'service' THEN
    -- 7: never refused (a raise would abort a sync page); recorded instead
    IF v_tier > 0 OR v_teacher_refuse THEN
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('service_retro_mark', jsonb_build_object('session_id', s.id, 'student_id', v_kid, 'lesson_date', s.date,
                                                       'old_status', v_old_status, 'new_status', v_new_status,
                                                       'old_marked_by', v_old_by,
                                                       'new_marked_by', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.marked_by END,
                                                       'op', TG_OP, 'tier', v_tier));
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_admin := COALESCE(v_uid IS NOT NULL AND public.has_role(v_uid, 'admin'::public.app_role), false);
  IF v_admin THEN
    -- 5
    IF v_tier = 0 THEN
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    RAISE EXCEPTION 'attendance_requires_checked_path' USING ERRCODE = 'HC025',
      DETAIL = 'kind=retro_mark; tier=' || v_tier
               || '; This lesson is more than a week old and its month is billed. Change the mark with a reason.';
  END IF;

  -- 6 (teachers, assistants, anyone else signed in, or an API role with no user)
  IF v_teacher_refuse THEN
    RAISE EXCEPTION 'attendance_requires_checked_path' USING ERRCODE = 'HC025',
      DETAIL = 'kind=retro_mark_staff; This lesson is more than a week old. Please ask an administrator to change it.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_attendance_money_guard ON public.attendance;
CREATE TRIGGER zz_attendance_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public._attendance_money_guard();

-- ---------------------------------------------------------------- 6
-- The 'attendance' entity: plan (what the admin is shown) and exec.

CREATE OR REPLACE FUNCTION public._money_plan__attendance(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s record;
  v_sid uuid;
  v_kid uuid;
  v_class uuid;
  v_from date;
  v_to date;
  v_status text;
  v_marks jsonb;
  v_lessons jsonb;
  v_items jsonb;
  v_tier int := 0;
  v_refuse text;
  v_month text;
  v_kids uuid[];
  v_before jsonb := '[]'::jsonb;
  v_pairs jsonb := '[]'::jsonb;
  v_inv jsonb;
  v_states jsonb;
  v_fp text;
  v_impact jsonb;
  v_target uuid;
  v_change jsonb;
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN
    RETURN jsonb_build_object('refuse_code', 'bad_args');
  END IF;

  IF p_op = 'set_marks' THEN
    BEGIN
      v_sid := (p_args ->> 'session_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_sid := NULL; END;
    IF v_sid IS NULL THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
    SELECT ss.id, ss.class_id, ss.date, ss.start_time, ss.end_time, ss.status INTO s FROM public.sessions ss WHERE ss.id = v_sid;
    IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
    v_marks := p_args -> 'marks';
    IF v_marks IS NULL OR jsonb_typeof(v_marks) <> 'array' OR jsonb_array_length(v_marks) = 0 THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    IF jsonb_array_length(v_marks) > 60 THEN RETURN jsonb_build_object('refuse_code', 'too_many_marks'); END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_marks) m
                WHERE jsonb_typeof(m) <> 'object'
                   OR COALESCE(m ->> 'student_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   OR COALESCE(m ->> 'status', '') NOT IN ('Present', 'Absent', 'Late', 'Excused'))
       OR (SELECT count(DISTINCT lower(m ->> 'student_id')) FROM jsonb_array_elements(v_marks) m) <> jsonb_array_length(v_marks) THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    IF s.status = 'Canceled' THEN v_refuse := 'lesson_canceled'; END IF;
    v_month := to_char(s.date, 'YYYY-MM');
    v_target := s.id;

    -- one item per mark: before, after, would the trigger ask, at what tier
    WITH m AS (
      SELECT (x ->> 'student_id')::uuid AS student_id, x ->> 'status' AS status FROM jsonb_array_elements(v_marks) x
    ), j AS (
      SELECT m.student_id, m.status AS new_status, a.status::text AS old_status, a.marked_by AS old_by,
             public._attendance_billable(a.status::text) <> public._attendance_billable(m.status) AS crossing,
             (a.marked_by IS NOT NULL AND a.status::text IN ('Present', 'Late') AND NOT public._attendance_billable(m.status)) AS unbill_person
        FROM m LEFT JOIN public.attendance a ON a.session_id = s.id AND a.student_id = m.student_id
    ), t AS (
      SELECT j.*, CASE WHEN j.crossing AND NOT public._lesson_in_free_week(s.date, s.start_time, s.end_time)
                       THEN GREATEST(COALESCE((public.tuition_month_state(j.student_id, v_month) ->> 'tier')::int, 3),
                                     CASE WHEN j.unbill_person THEN 1 ELSE 0 END)
                       ELSE 0 END AS tier
        FROM j
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', student_id, 'old_status', old_status, 'new_status', new_status,
                                                 'old_marked_by_person', old_by IS NOT NULL, 'crossing', crossing,
                                                 'unbill_person', unbill_person, 'tier', tier)
                              ORDER BY student_id::text COLLATE "C"), '[]'::jsonb),
           COALESCE(max(tier), 0),
           COALESCE(array_agg(student_id ORDER BY student_id), ARRAY[]::uuid[]),
           COALESCE(jsonb_agg(jsonb_build_object('student_id', student_id, 'month', v_month)
                              ORDER BY student_id::text COLLATE "C") FILTER (WHERE crossing), '[]'::jsonb)
      INTO v_items, v_tier, v_kids, v_pairs
      FROM t;
    SELECT COALESCE(jsonb_agg(to_jsonb(a) - 'updated_at' - 'created_at' ORDER BY a.student_id::text COLLATE "C"), '[]'::jsonb)
      INTO v_before FROM public.attendance a WHERE a.session_id = s.id AND a.student_id = ANY (v_kids);
    v_change := jsonb_build_object('session_id', s.id,
                  'marks', (SELECT jsonb_agg(jsonb_build_object('student_id', lower(x ->> 'student_id'), 'status', x ->> 'status')
                                             ORDER BY lower(x ->> 'student_id')) FROM jsonb_array_elements(v_marks) x),
                  'items', v_items,
                  'lesson', jsonb_build_object('date', s.date, 'start_time', s.start_time, 'end_time', s.end_time, 'status', s.status,
                                               'free_week', public._lesson_in_free_week(s.date, s.start_time, s.end_time)));
    v_from := s.date; v_to := s.date;

  ELSIF p_op = 'repair' THEN
    BEGIN
      v_kid := (p_args ->> 'student_id')::uuid;
      v_class := (p_args ->> 'class_id')::uuid;
      v_from := (p_args ->> 'from')::date;
      v_to := (p_args ->> 'to')::date;
      v_status := p_args ->> 'status';
    EXCEPTION WHEN OTHERS THEN v_kid := NULL; END;
    IF v_kid IS NULL OR v_class IS NULL OR v_from IS NULL OR v_to IS NULL OR v_to < v_from
       OR v_to - v_from > 400 OR COALESCE(v_status, '') NOT IN ('Present', 'Absent', 'Excused') THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = v_kid AND e.class_id = v_class) THEN
      RETURN jsonb_build_object('refuse_code', 'no_enrollment');
    END IF;
    v_target := v_class;
    v_kids := ARRAY[v_kid];
    -- the lessons with no row for the child, the status each would get (the
    -- function's rule: outside the enrollment -> Excused), and the tier
    WITH l AS (
      SELECT ss.id, ss.date, ss.start_time, ss.end_time,
             CASE WHEN public.student_enrolled_on(v_kid, v_class, ss.date) THEN v_status ELSE 'Excused' END AS status
        FROM public.sessions ss
       WHERE ss.class_id = v_class AND ss.date BETWEEN v_from AND v_to AND ss.status <> 'Canceled'
         AND NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = ss.id AND a.student_id = v_kid)
    ), t AS (
      SELECT l.*, CASE WHEN public._attendance_billable(l.status) AND NOT public._lesson_in_free_week(l.date, l.start_time, l.end_time)
                       THEN COALESCE((public.tuition_month_state(v_kid, to_char(l.date, 'YYYY-MM')) ->> 'tier')::int, 3)
                       ELSE 0 END AS tier
        FROM l
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('session_id', id, 'date', date, 'status', status, 'tier', tier,
                                                 'month', to_char(date, 'YYYY-MM'),
                                                 'free_week', public._lesson_in_free_week(date, start_time, end_time))
                              ORDER BY date, id::text COLLATE "C"), '[]'::jsonb),
           COALESCE(max(tier), 0),
           COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object('student_id', v_kid, 'month', to_char(t2.date, 'YYYY-MM')))
                       FROM t t2 WHERE public._attendance_billable(t2.status)), '[]'::jsonb)
      INTO v_lessons, v_tier, v_pairs
      FROM t;
    IF jsonb_array_length(v_lessons) = 0 THEN v_refuse := 'nothing_to_change'; END IF;
    IF jsonb_array_length(v_lessons) > 200 THEN v_refuse := 'too_many'; END IF;
    v_change := jsonb_build_object('student_id', v_kid, 'class_id', v_class, 'from', v_from, 'to', v_to,
                                   'status', v_status, 'lessons', v_lessons);
  ELSE
    RETURN jsonb_build_object('refuse_code', 'bad_op');
  END IF;

  -- what the admin is shown, and what the token covers: the stored bills
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', i.id, 'student_id', i.student_id, 'month', i.month,
           'base_amount', i.base_amount, 'discount_amount', i.discount_amount, 'total_amount', i.total_amount,
           'recorded_payment', i.recorded_payment, 'status', i.status, 'confirmation_status', i.confirmation_status,
           'tuition_frozen', i.tuition_frozen) ORDER BY i.id::text COLLATE "C"), '[]'::jsonb)
    INTO v_inv
    FROM public.invoices i
   WHERE i.student_id = ANY (v_kids)
     AND i.month IN (SELECT p ->> 'month' FROM jsonb_array_elements(v_pairs) p);
  SELECT COALESCE(jsonb_agg(public.tuition_month_state((p ->> 'student_id')::uuid, p ->> 'month')
                            ORDER BY p ->> 'student_id', p ->> 'month'), '[]'::jsonb)
    INTO v_states FROM jsonb_array_elements(v_pairs) p;
  v_fp := md5(v_change::text || v_inv::text || v_states::text);
  SELECT jsonb_build_object(
           'tier', v_tier, 'closed_payroll', false,
           'families', count(DISTINCT COALESCE(st.family_id::text, 'student:' || (x ->> 'student_id')))
                         FILTER (WHERE x ->> 'state' IN ('paid', 'signed', 'frozen')),
           'paid_vnd', COALESCE(sum(GREATEST(COALESCE(i.recorded_payment, 0), COALESCE(fl.max_recorded_payment, 0))), 0))
    INTO v_impact
    FROM jsonb_array_elements(v_states) x
    LEFT JOIN public.students st ON st.id = (x ->> 'student_id')::uuid
    LEFT JOIN public.invoices i ON i.student_id = (x ->> 'student_id')::uuid AND i.month = x ->> 'month'
    LEFT JOIN public.invoice_state_floor fl ON fl.student_id = (x ->> 'student_id')::uuid AND fl.month = x ->> 'month';

  RETURN jsonb_build_object(
    'entity', 'attendance', 'op', p_op, 'target_id', v_target, 'student_ids', to_jsonb(v_kids),
    'row_before', v_before, 'change', v_change, 'reach_from', v_from, 'reach_to', v_to,
    'reach', jsonb_build_object('pairs', v_states, 'fp', v_fp),
    'tier', v_tier, 'refuse_code', v_refuse,
    'invoices_before', v_inv, 'refresh_pairs', v_pairs, 'impact', v_impact,
    'lock_session_ids', CASE WHEN p_op = 'set_marks' THEN jsonb_build_array(v_target)
                             ELSE (SELECT COALESCE(jsonb_agg(l -> 'session_id'), '[]'::jsonb) FROM jsonb_array_elements(v_lessons) l) END);
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__attendance(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  m jsonb;
  n int := 0;
  c int;
BEGIN
  IF p_plan ->> 'op' = 'set_marks' THEN
    FOR m IN SELECT x FROM jsonb_array_elements(p_plan -> 'change' -> 'marks') x LOOP
      INSERT INTO public.attendance AS a (session_id, student_id, status, marked_by, marked_at)
      VALUES ((p_plan ->> 'target_id')::uuid, (m ->> 'student_id')::uuid, m ->> 'status', p_uid, now())
      ON CONFLICT (session_id, student_id) DO UPDATE
         SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, marked_at = EXCLUDED.marked_at;
      GET DIAGNOSTICS c = ROW_COUNT; n := n + c;
    END LOOP;
  ELSIF p_plan ->> 'op' = 'repair' THEN
    FOR m IN SELECT x FROM jsonb_array_elements(p_plan -> 'change' -> 'lessons') x LOOP
      INSERT INTO public.attendance (session_id, student_id, status, marked_by, notes)
      VALUES ((m ->> 'session_id')::uuid, (p_plan -> 'change' ->> 'student_id')::uuid, m ->> 'status', NULL,
              'Auto-repaired on ' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') || ' (checked)')
      ON CONFLICT (session_id, student_id) DO NOTHING;
      GET DIAGNOSTICS c = ROW_COUNT; n := n + c;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  RETURN jsonb_build_object('written', n, 'guard_trigger', 'attendance.zz_attendance_money_guard');
END $fn$;

-- ---------------------------------------------------------------- 7
-- The dispatcher, written once. A plpgsql CASE STATEMENT, so each branch's
-- call is bound only when that branch first runs: an entity whose step is
-- not installed yet raises 42883 there, caught as HC015 not_installed.
-- Later files add only their own _money_plan__* / _money_exec__* pair.

CREATE OR REPLACE FUNCTION public._money_change_plan(p_entity text, p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v jsonb;
BEGIN
  BEGIN
    CASE p_entity
      WHEN 'attendance'          THEN v := public._money_plan__attendance(p_op, p_args, p_uid);
      WHEN 'session'             THEN v := public._money_plan__session(p_op, p_args, p_uid);
      WHEN 'class_fee'           THEN v := public._money_plan__class_fee(p_op, p_args, p_uid);
      WHEN 'enrollment'          THEN v := public._money_plan__enrollment(p_op, p_args, p_uid);
      WHEN 'discount_assignment' THEN v := public._money_plan__discount_assignment(p_op, p_args, p_uid);
      WHEN 'referral_bonus'      THEN v := public._money_plan__referral_bonus(p_op, p_args, p_uid);
      WHEN 'pay_rate'            THEN v := public._money_plan__pay_rate(p_op, p_args, p_uid);
      WHEN 'invoice_freeze'      THEN v := public._money_plan__invoice_freeze(p_op, p_args, p_uid);
      WHEN 'family_link'         THEN v := public._money_plan__family_link(p_op, p_args, p_uid);
      ELSE v := jsonb_build_object('refuse_code', 'bad_entity');
    END CASE;
  EXCEPTION WHEN undefined_function THEN
    RAISE EXCEPTION 'not_installed' USING ERRCODE = 'HC015',
      DETAIL = 'The database step for ' || COALESCE(p_entity, '?') || ' changes is not installed yet.';
  END;
  RETURN v;
END $fn$;

CREATE OR REPLACE FUNCTION public._money_change_exec(p_entity text, p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v jsonb;
BEGIN
  BEGIN
    CASE p_entity
      WHEN 'attendance'          THEN v := public._money_exec__attendance(p_plan, p_uid);
      WHEN 'session'             THEN v := public._money_exec__session(p_plan, p_uid);
      WHEN 'class_fee'           THEN v := public._money_exec__class_fee(p_plan, p_uid);
      WHEN 'enrollment'          THEN v := public._money_exec__enrollment(p_plan, p_uid);
      WHEN 'discount_assignment' THEN v := public._money_exec__discount_assignment(p_plan, p_uid);
      WHEN 'referral_bonus'      THEN v := public._money_exec__referral_bonus(p_plan, p_uid);
      WHEN 'pay_rate'            THEN v := public._money_exec__pay_rate(p_plan, p_uid);
      WHEN 'invoice_freeze'      THEN v := public._money_exec__invoice_freeze(p_plan, p_uid);
      WHEN 'family_link'         THEN v := public._money_exec__family_link(p_plan, p_uid);
      ELSE RAISE EXCEPTION 'bad_entity' USING ERRCODE = 'HC015';
    END CASE;
  EXCEPTION WHEN undefined_function THEN
    RAISE EXCEPTION 'not_installed' USING ERRCODE = 'HC015';
  END;
  RETURN v;
END $fn$;

-- Extension points for step 4 (approvals), created ONLY IF MISSING so a
-- re-paste of this file never puts the stub back over step 4's function.
DO $stub$
BEGIN
  IF to_regprocedure('public.change_approval_needed(jsonb, uuid)') IS NULL THEN
    EXECUTE $f$CREATE FUNCTION public.change_approval_needed(p_impact jsonb, p_actor uuid)
      RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $b$ SELECT '{"required": false, "reasons": []}'::jsonb $b$$f$;
  END IF;
  IF to_regprocedure('public._change_request_claim(text, text)') IS NULL THEN
    EXECUTE $f$CREATE FUNCTION public._change_request_claim(p_kind text, p_fingerprint text)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $b$ SELECT NULL::uuid $b$$f$;
  END IF;
END $stub$;

-- A full plan: the entity's own, plus the token, the fingerprint, what is
-- required, the approval answer and the review rule.
CREATE OR REPLACE FUNCTION public._money_change_full_plan(p_entity text, p_op text, p_args jsonb, p_uid uuid, p_via text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v jsonb;
  v_tier int;
  v_args jsonb := COALESCE(p_args, '{}'::jsonb);
  v_approval jsonb;
BEGIN
  v := public._money_change_plan(p_entity, p_op, v_args, p_uid);
  IF v ->> 'refuse_code' IN ('bad_args', 'bad_op', 'bad_entity') AND v ->> 'entity' IS NULL THEN
    RETURN jsonb_build_object('entity', p_entity, 'op', p_op, 'allowed', false, 'refuse_code', v ->> 'refuse_code');
  END IF;
  v_tier := (v ->> 'tier')::int;
  IF v_tier IS NULL OR v_tier NOT BETWEEN 0 AND 3 THEN v_tier := 3; END IF;
  v_approval := COALESCE(public.change_approval_needed(v -> 'impact', p_uid), '{"required": true, "reasons": ["unknown"]}'::jsonb);
  RETURN v || jsonb_build_object(
    'tier', v_tier,
    'allowed', v ->> 'refuse_code' IS NULL,
    'requires', jsonb_build_object('reason_min', 15, 'reason', v_tier >= 1, 'confirm', v_tier >= 1,
                                   'correction_reason', v_tier = 3),
    'approval', v_approval,
    'review_required', v_tier = 3 OR (v_tier = 2 AND p_via = 'bulk')
                       OR COALESCE((v -> 'impact' ->> 'closed_payroll')::boolean, false),
    'token', encode(sha256(convert_to(jsonb_build_array(1, p_entity, p_op, v_args, p_uid, v_tier,
                                                        md5(COALESCE(v -> 'row_before', 'null'::jsonb)::text),
                                                        v -> 'reach' ->> 'fp')::text, 'UTF8')), 'hex'),
    'fingerprint', encode(sha256(convert_to(jsonb_build_array(1, p_entity, p_op, v_args, v_tier,
                                                              md5(COALESCE(v -> 'row_before', 'null'::jsonb)::text),
                                                              v -> 'reach' ->> 'fp')::text, 'UTF8')), 'hex'));
END $fn$;

-- ---------------------------------------------------------------- 8
-- The checked path.

CREATE OR REPLACE FUNCTION public.money_change_preview(p_entity text, p_op text, p_args jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
BEGIN
  RETURN public._money_change_full_plan(p_entity, p_op, p_args, v_uid, 'single');
END $fn$;

CREATE OR REPLACE FUNCTION public._money_change_apply(
  p_entity text, p_op text, p_args jsonb, p_reason text, p_token text, p_confirm boolean,
  p_correction_reason text, p_context jsonb, p_via text, p_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_reason text;
  v_corr text;
  v_args jsonb := COALESCE(p_args, '{}'::jsonb);
  v_ctx jsonb := CASE WHEN jsonb_typeof(p_context) = 'object' THEN p_context ELSE '{}'::jsonb END;
  v_key text;
  v jsonb;
  v_tier int;
  v_id uuid;
  v_exec jsonb;
  v_trg text;
  v_enabled "char";
  v_batch uuid := p_batch_id;
BEGIN
  -- reason: cleaned now if given; required from T1 (checked after the plan)
  IF p_reason IS NOT NULL THEN
    v_reason := public.session_change_reason_ok(p_reason);
  END IF;

  -- one change of a target at a time
  v_key := 'money:' || COALESCE(p_entity, '') || ':' ||
           COALESCE(v_args ->> 'session_id', v_args ->> 'student_id', v_args ->> 'target_id', '');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  -- row locks first, in D2's order (the lesson rows), then the plan reads
  -- everything committed before them
  IF p_entity = 'attendance' THEN
    IF p_op = 'set_marks' AND (v_args ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      PERFORM 1 FROM public.sessions WHERE id = (v_args ->> 'session_id')::uuid FOR UPDATE;
    ELSIF p_op = 'repair' AND (v_args ->> 'class_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      PERFORM 1 FROM public.sessions
       WHERE class_id = (v_args ->> 'class_id')::uuid
         AND date BETWEEN COALESCE(NULLIF(v_args ->> 'from', '')::date, '-infinity'::date)
                      AND COALESCE(NULLIF(v_args ->> 'to', '')::date, 'infinity'::date)
       ORDER BY id FOR UPDATE;
    END IF;
  END IF;

  v := public._money_change_full_plan(p_entity, p_op, v_args, v_uid, CASE WHEN p_via = 'bulk' THEN 'bulk' ELSE 'single' END);
  v_tier := (v ->> 'tier')::int;
  IF v ->> 'refuse_code' IS NOT NULL THEN
    RAISE EXCEPTION '%', v ->> 'refuse_code' USING ERRCODE = 'HC015';
  END IF;
  IF v_tier >= 1 AND v_reason IS NULL THEN
    RAISE EXCEPTION 'reason_too_short' USING ERRCODE = 'HC010',
      DETAIL = 'A reason of 15-1000 characters with at least 5 different characters is required.';
  END IF;
  IF (v_tier >= 1 OR p_token IS NOT NULL) AND p_token IS DISTINCT FROM v ->> 'token' THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011',
      DETAIL = 'The marks, the bills, the tier or the caller changed since the preview.';
  END IF;
  IF v_tier >= 1 AND NOT COALESCE(p_confirm, false) THEN
    RAISE EXCEPTION 'confirm_required' USING ERRCODE = 'HC012';
  END IF;
  IF v_tier = 3 THEN
    BEGIN
      v_corr := public.session_change_reason_ok(p_correction_reason);
    EXCEPTION WHEN SQLSTATE 'HC010' THEN
      RAISE EXCEPTION 'correction_reason_required' USING ERRCODE = 'HC013';
    END;
  END IF;
  IF p_via = 'bulk' AND v_tier >= 2 AND NOT COALESCE((v_ctx ->> 'own_reason')::boolean, false) THEN
    RAISE EXCEPTION 'own_reason_required' USING ERRCODE = 'HC017';
  END IF;
  -- the approval hook (step 4); the stub answers "not required"
  IF COALESCE((v -> 'approval' ->> 'required')::boolean, true)
     AND public._change_request_claim('money', v ->> 'fingerprint') IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060',
      DETAIL = 'reasons=' || COALESCE(v -> 'approval' ->> 'reasons', '[]');
  END IF;
  IF v_batch IS NULL AND (v_ctx ->> 'batch_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_batch := (v_ctx ->> 'batch_id')::uuid;
  END IF;

  INSERT INTO public.money_change_overrides (
    txid, actor_user_id, entity, op, target_id, student_ids, reach_from, reach_to, via, batch_id,
    tier, correction_mode, reason, correction_reason, confirmed, token, row_before, change, reach, evidence,
    invoices_before, refresh_pairs, impact, review_required, attached)
  VALUES (
    txid_current(), v_uid, p_entity, p_op, (v ->> 'target_id')::uuid,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v -> 'student_ids', '[]'::jsonb))::uuid),
    (v ->> 'reach_from')::date, (v ->> 'reach_to')::date,
    CASE WHEN p_via = 'bulk' THEN 'bulk' ELSE 'single' END, v_batch,
    v_tier, v_tier = 3, v_reason, v_corr, COALESCE(p_confirm, false), v ->> 'token',
    COALESCE(v -> 'row_before', '[]'::jsonb), COALESCE(v -> 'change', '{}'::jsonb), COALESCE(v -> 'reach', '{}'::jsonb), v -> 'evidence',
    COALESCE(v -> 'invoices_before', '[]'::jsonb), COALESCE(v -> 'refresh_pairs', '[]'::jsonb), COALESCE(v -> 'impact', '{}'::jsonb),
    COALESCE((v ->> 'review_required')::boolean, true), COALESCE(v_ctx -> 'attached', '{}'::jsonb))
  RETURNING id INTO v_id;

  PERFORM set_config('hec.money_change_ack', v_id::text, true);
  v_exec := public._money_change_exec(p_entity, v, v_uid);
  PERFORM set_config('hec.money_change_ack', '', true);

  -- the entity's guard trigger must be there and enabled, or nothing stands
  v_trg := v_exec ->> 'guard_trigger';
  SELECT t.tgenabled INTO v_enabled FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
   WHERE c.relnamespace = 'public'::regnamespace AND c.relname = split_part(v_trg, '.', 1)
     AND t.tgname = split_part(v_trg, '.', 2);
  IF v_enabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'The money guard trigger ' || COALESCE(v_trg, '?') || ' is missing or disabled. Nothing was changed.';
  END IF;

  RETURN jsonb_build_object('override_id', v_id, 'entity', p_entity, 'op', p_op, 'target_id', v ->> 'target_id',
                            'tier', v_tier, 'review_required', (v ->> 'review_required')::boolean,
                            'written', (v_exec ->> 'written')::int, 'refresh_pairs', v -> 'refresh_pairs');
END $fn$;

CREATE OR REPLACE FUNCTION public.money_change_checked(
  p_entity text, p_op text, p_args jsonb, p_reason text DEFAULT NULL, p_token text DEFAULT NULL,
  p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN public._money_change_apply(p_entity, p_op, p_args, p_reason, p_token, p_confirm, p_correction_reason,
                                    p_context, 'single', NULL);
END $fn$;

-- At most 50 per call; one transaction per call; a refused item is reported,
-- the others go on (as D2's bulk).
CREATE OR REPLACE FUNCTION public.money_changes_checked_bulk(
  p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  it jsonb;
  v_done jsonb := '[]'::jsonb;
  v_refused jsonb := '[]'::jsonb;
  r jsonb;
  n int := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'bad_items' USING ERRCODE = 'HC015';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'too_many' USING ERRCODE = 'HC016', DETAIL = 'At most 50 changes per call.';
  END IF;
  IF p_batch_id IS NULL THEN
    RAISE EXCEPTION 'a batch id is required' USING ERRCODE = '22004';
  END IF;
  FOR it IN SELECT x FROM jsonb_array_elements(p_items) x LOOP
    n := n + 1;
    BEGIN
      r := public._money_change_apply(it ->> 'entity', it ->> 'op', it -> 'args',
             COALESCE(NULLIF(it ->> 'reason', ''), p_reason), it ->> 'token',
             COALESCE((it ->> 'confirm')::boolean, false), it ->> 'correction_reason',
             COALESCE(p_context, '{}'::jsonb) || jsonb_build_object('own_reason', NULLIF(it ->> 'reason', '') IS NOT NULL),
             'bulk', p_batch_id);
      v_done := v_done || jsonb_build_array(jsonb_build_object('index', n, 'override_id', r -> 'override_id', 'tier', r -> 'tier',
                                                               'review_required', r -> 'review_required', 'refresh_pairs', r -> 'refresh_pairs'));
    EXCEPTION WHEN SQLSTATE 'HC010' OR SQLSTATE 'HC011' OR SQLSTATE 'HC012' OR SQLSTATE 'HC013'
                 OR SQLSTATE 'HC015' OR SQLSTATE 'HC017' OR SQLSTATE 'P0002' THEN
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('index', n, 'code', SQLSTATE, 'message', SQLERRM));
    END;
  END LOOP;
  RETURN jsonb_build_object('batch_id', p_batch_id, 'done', v_done, 'refused', v_refused);
END $fn$;

-- ---------------------------------------------------------------- 9
-- Afterwards: refresh results and review sign-off (admin), automation notes
-- (service role), and the status card.

CREATE OR REPLACE FUNCTION public.record_money_change_event(p_override_id uuid, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  o public.money_change_overrides;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_id uuid;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('tuition_refreshed', 'tuition_refresh_failed', 'reviewed') THEN
    RAISE EXCEPTION 'bad_kind' USING ERRCODE = 'HC015';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION 'bad_payload' USING ERRCODE = 'HC015';
  END IF;
  SELECT * INTO o FROM public.money_change_overrides WHERE id = p_override_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'override not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_kind = 'reviewed' THEN
    v_payload := v_payload || jsonb_build_object('note', public.session_change_reason_ok(v_payload ->> 'note'));
  ELSE
    v_payload := jsonb_build_object('attached', v_payload) || jsonb_build_object('invoices_after', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', i.id, 'student_id', i.student_id, 'month', i.month, 'base_amount', i.base_amount,
               'discount_amount', i.discount_amount, 'total_amount', i.total_amount, 'recorded_payment', i.recorded_payment,
               'status', i.status, 'confirmation_status', i.confirmation_status, 'tuition_frozen', i.tuition_frozen)
               ORDER BY i.id::text COLLATE "C"), '[]'::jsonb)
        FROM public.invoices i
        JOIN jsonb_array_elements(o.refresh_pairs) p ON i.student_id::text = p ->> 'student_id' AND i.month = p ->> 'month'));
  END IF;
  INSERT INTO public.money_change_events (override_id, actor_user_id, kind, payload)
  VALUES (o.id, v_uid, p_kind, v_payload) RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.log_money_automation_refused(p_entity text, p_target uuid, p_source text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.money_change_events (kind, payload)
  VALUES ('automation_refused', jsonb_build_object('entity', left(COALESCE(p_entity, ''), 40), 'target_id', p_target,
                                                   'source', left(COALESCE(p_source, ''), 100)))
  RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.d4_guard_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_trg jsonb;
BEGIN
  SELECT COALESCE(jsonb_object_agg(c.relname || '.' || t.tgname, t.tgenabled::text), '{}'::jsonb) INTO v_trg
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
   WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
     AND t.tgname IN ('zz_attendance_evidence_guard', 'zz_point_evidence_keep', 'zz_transcript_evidence_keep',
                      'zz_homework_evidence_keep', 'zz0_session_evidence_keep', 'zz_invoice_state_floor',
                      'zz_attendance_money_guard');
  RETURN jsonb_build_object(
    'triggers', v_trg,
    'ok', COALESCE((SELECT bool_and(value = '"O"'::jsonb) FROM jsonb_each(v_trg)), false)
          AND v_trg ? 'attendance.zz_attendance_money_guard' AND v_trg ? 'attendance.zz_attendance_evidence_guard',
    'evidence_floors', (SELECT count(*)::int FROM public.session_evidence_floor),
    'invoice_floors', (SELECT count(*)::int FROM public.invoice_state_floor),
    'events_30d', (SELECT COALESCE(jsonb_object_agg(kind, n), '{}'::jsonb) FROM (
        SELECT kind, count(*)::int n FROM public.money_change_events
         WHERE kind IN ('automation_refused', 'service_retro_mark', 'owner_lane') AND created_at >= now() - interval '30 days'
         GROUP BY kind) q),
    'installed_at', (SELECT min(created_at) FROM public.money_change_events WHERE kind = 'guard_installed'));
END $fn$;

-- ---------------------------------------------------------------- 10
-- Views (admin-only through the tables' RLS: security_invoker).

CREATE OR REPLACE VIEW public.money_change_review_queue WITH (security_invoker = true) AS
SELECT o.id AS override_id, o.created_at, o.actor_user_id, o.entity, o.op, o.target_id, o.student_ids,
       o.reach_from, o.reach_to, o.via, o.batch_id, o.tier, o.correction_mode, o.reason, o.correction_reason,
       o.change, o.invoices_before, o.refresh_pairs, o.impact, o.attached,
       COALESCE((SELECT CASE e.kind WHEN 'tuition_refreshed' THEN 'refreshed' ELSE 'failed' END
                   FROM public.money_change_events e
                  WHERE e.override_id = o.id AND e.kind IN ('tuition_refreshed', 'tuition_refresh_failed')
                  ORDER BY e.created_at DESC, e.id DESC LIMIT 1), 'pending') AS tuition_state,
       now() - o.created_at AS age
  FROM public.money_change_overrides o
 WHERE o.review_required
   AND NOT EXISTS (SELECT 1 FROM public.money_change_events e WHERE e.override_id = o.id AND e.kind = 'reviewed');

CREATE OR REPLACE VIEW public.money_change_tuition_pending WITH (security_invoker = true) AS
SELECT o.id AS override_id, o.created_at, o.actor_user_id, o.entity, o.op, o.refresh_pairs,
       (SELECT e.kind FROM public.money_change_events e
         WHERE e.override_id = o.id AND e.kind IN ('tuition_refreshed', 'tuition_refresh_failed')
         ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS last_tuition_event,
       now() - o.created_at AS age
  FROM public.money_change_overrides o
 WHERE o.created_at < now() - interval '10 minutes'
   AND jsonb_array_length(o.refresh_pairs) > 0
   AND NOT EXISTS (SELECT 1 FROM public.money_change_events e WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed');

REVOKE ALL ON public.money_change_review_queue, public.money_change_tuition_pending FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.money_change_review_queue, public.money_change_tuition_pending TO authenticated, service_role;

-- ---------------------------------------------------------------- 11
-- Function grants: the public RPCs for authenticated only (they check admin
-- inside; service_role has no grant, so "no service-role path" is visible in
-- the catalogue); the automation log for service_role only; the rest nobody.

REVOKE ALL ON FUNCTION
  public._money_month_is_past(text),
  public._lesson_in_free_week(date, time, time),
  public._attendance_billable(text),
  public.tuition_month_state(uuid, text),
  public.tuition_reach(uuid[], uuid, date, date),
  public.payroll_reach(uuid, uuid, date, date),
  public._money_ack(text[], uuid, uuid, date, date, int),
  public._attendance_money_guard(),
  public._money_plan__attendance(text, jsonb, uuid),
  public._money_exec__attendance(jsonb, uuid),
  public._money_change_plan(text, text, jsonb, uuid),
  public._money_change_exec(text, jsonb, uuid),
  public._money_change_full_plan(text, text, jsonb, uuid, text),
  public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid),
  public.money_change_preview(text, text, jsonb),
  public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb),
  public.money_changes_checked_bulk(jsonb, text, uuid, jsonb),
  public.record_money_change_event(uuid, text, jsonb),
  public.log_money_automation_refused(text, uuid, text),
  public.d4_guard_status(),
  public.change_approval_needed(jsonb, uuid),
  public._change_request_claim(text, text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.money_change_preview(text, text, jsonb),
  public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb),
  public.money_changes_checked_bulk(jsonb, text, uuid, jsonb),
  public.record_money_change_event(uuid, text, jsonb),
  public.d4_guard_status()
TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_money_automation_refused(text, uuid, text) TO service_role;

-- "Guard on since": the earliest of these.
INSERT INTO public.money_change_events (kind, payload)
VALUES ('guard_installed', jsonb_build_object('migration', '20261114091000_d4_core_register'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(tgname::text || '=' || tgenabled::text, ', ' ORDER BY tgname) FROM pg_trigger
    WHERE tgrelid = 'public.attendance'::regclass AND tgname LIKE 'zz_attendance%')        AS attendance_guard_triggers,
  (SELECT count(*) FROM public.money_change_overrides)                                   AS override_rows,
  (SELECT count(*) FROM public.money_change_events WHERE kind = 'guard_installed')        AS installs;
