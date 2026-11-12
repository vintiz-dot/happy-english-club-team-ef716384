-- The cancellation guard: a lesson that may have been taught is cancelled,
-- deleted, moved or brought back only through a checked path that leaves
-- a reason, the evidence the admin was shown, and the person's id.
--
-- Spec: docs/evidence/D2-guard-design.md + D2-threat-model.md AS AMENDED
-- by docs/evidence/D-review-1.md Part B ("required changes before build")
-- and the conductor rulings (docs/MASTER_PLAN.md section 10). Build notes,
-- deviations and the contract for the edge functions and UI:
-- docs/evidence/D2-build.md.
--
-- WHAT THIS ADDS
--   tables   session_cancel_overrides         one append-only row per checked change
--            session_cancel_override_events   what happened afterwards (tuition refresh, review)
--   views    session_cancel_review_queue, session_cancel_tuition_pending
--   triggers on sessions: zz_session_change_guard_upd (BEFORE UPDATE),
--            zz_session_change_guard_del (BEFORE DELETE),
--            zz_session_no_truncate (BEFORE TRUNCATE)
--   RPCs     session_change_preview, cancel_session_checked,
--            move_session_checked, uncancel_session_checked,
--            cancel_sessions_checked_bulk (50 per call),
--            record_session_override_event, session_cancel_guard_status
--            (admin JWT only), log_session_automation_refused (service_role only)
--
-- THE RULE THE TRIGGER ENFORCES. A write to sessions is classified by ONE
-- function, session_change_kind (review change 1): cancel, uncancel,
-- reclass, move, delete, or nothing guarded. A guarded write is accepted
-- only when (a) the transaction-local flag hec.session_change_ack names a
-- session_cancel_overrides row for THIS session, THIS kind, written in
-- THIS transaction - only the checked RPCs can write one - or (b) it is
-- automation (no auth.uid(): service role, cron, SQL editor) deleting,
-- moving or re-classing a lesson that has not started, has NONE evidence
-- and touches no settled month (review change 2, ruling: fail closed - a
-- signed-in person never gets this lane). A cancel or un-cancel has no
-- lane (b) at all.
--
-- NO KILL SWITCH. No role is exempted, there is no setting that turns the
-- trigger off. Rollback is an owner-pasted DROP TRIGGER; the RPCs then
-- refuse to work (HC050) and session_cancel_guard_status() reports it.
--
-- MONEY. Nothing here prices anything. Invoice rows are COPIED into the
-- audit row as they stand; figures from calculate-tuition are stored only
-- as attachments. Tuition is refreshed by the edge functions through
-- calculate-tuition, after the commit, and recorded as an event.
--
-- Changes no existing object except adding the three triggers on
-- sessions. Changes no existing row. Safe to paste twice.

BEGIN;

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  IF to_regprocedure('public.session_held_evidence(uuid)') IS NULL THEN
    RAISE EXCEPTION 'session_cancel_guard cannot be installed: public.session_held_evidence(uuid) is missing'
      USING HINT = 'Paste 20261112090000_session_held_evidence.sql first. Nothing was changed.';
  END IF;
  IF (SELECT provolatile FROM pg_proc WHERE oid = 'public.session_held_evidence(uuid)'::regprocedure) <> 's' THEN
    v_missing := v_missing || 'session_held_evidence must be STABLE'::text;
  END IF;
  IF to_regprocedure('public.session_recording_evidence(uuid)') IS NULL THEN
    v_missing := v_missing || 'function public.session_recording_evidence(uuid)'::text;
  ELSIF (SELECT provolatile FROM pg_proc WHERE oid = 'public.session_recording_evidence(uuid)'::regprocedure) NOT IN ('s', 'i') THEN
    v_missing := v_missing || 'session_recording_evidence must be STABLE (D-review-1 A-2)'::text;
  END IF;

  FOR r IN SELECT unnest(ARRAY[
    'public.has_role(uuid, public.app_role)',
    'public.payroll_month_is_locked(text)',
    'auth.uid()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;

  FOR r IN
    SELECT * FROM (VALUES
      ('sessions',             ARRAY['id','class_id','date','start_time','end_time','status','teacher_id','updated_at',
                                     'updated_by','canceled_reason','canceled_by','canceled_at','is_manual','manual_reason']),
      ('attendance',           ARRAY['id','session_id','student_id','status','marked_by']),
      ('session_participants', ARRAY['session_id']),
      ('invoices',             ARRAY['id','student_id','month','base_amount','discount_amount','total_amount','recorded_payment',
                                     'status','confirmation_status','tuition_frozen','carry_in_credit','carry_in_debt',
                                     'carry_out_credit','carry_out_debt','class_breakdown']),
      ('audit_log',            ARRAY['entity','entity_id','operation','diff','occurred_at','actor_user_id'])
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

  -- 20261027090000 must be live: the lock order below relies on it.
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cancel_session_excused'
                    AND tgrelid = to_regclass('public.sessions')) THEN
    v_missing := v_missing || 'trigger trg_cancel_session_excused on sessions'::text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_cancelled_session_attendance'
                    AND tgrelid = to_regclass('public.attendance')) THEN
    v_missing := v_missing || 'trigger guard_cancelled_session_attendance on attendance'::text;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'session_cancel_guard cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the migrations that create these first. Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- The audit tables.
--
-- GRANTS - read before "fixing". authenticated gets SELECT only (RLS
-- narrows it to admins): append-only by grants as well as by trigger.
-- service_role gets ALL because the house rule asks for it (root
-- AGENTS.md, 20260712023825); the triggers below still refuse every
-- UPDATE, DELETE and TRUNCATE for every role, and refuse an INSERT that
-- does not come from the definer functions in this file.

CREATE TABLE IF NOT EXISTS public.session_cancel_overrides (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  txid                 bigint NOT NULL DEFAULT txid_current(),
  actor_user_id        uuid NOT NULL,
  session_id           uuid NOT NULL,          -- no FK: the row outlives a deleted session
  class_id             uuid NOT NULL,
  teacher_id           uuid NOT NULL,
  session_date         date NOT NULL,
  action               text NOT NULL CHECK (action IN ('cancel', 'delete', 'move', 'uncancel')),
  via                  text NOT NULL CHECK (via IN ('single', 'bulk')),
  batch_id             uuid,
  tier                 int  NOT NULL CHECK (tier BETWEEN 0 AND 3),
  level                text NOT NULL CHECK (level IN ('NONE', 'SOFT', 'STRONG')),
  settled              boolean NOT NULL,
  correction_mode      boolean NOT NULL,
  reason               text NOT NULL,
  correction_reason    text,
  confirmed            boolean NOT NULL,
  token                text NOT NULL,
  evidence             jsonb NOT NULL,
  session_before       jsonb NOT NULL,
  change               jsonb,
  affected             jsonb NOT NULL,
  invoices_before      jsonb NOT NULL,
  refresh_pairs        jsonb NOT NULL,
  deleted_rows         jsonb,
  payroll_month_locked boolean NOT NULL,
  erased_recently      jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_required      boolean NOT NULL,
  attached             jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT session_cancel_overrides_correction CHECK (correction_mode = (tier = 3)
                                                        AND (NOT correction_mode OR correction_reason IS NOT NULL)),
  CONSTRAINT session_cancel_overrides_attached_size CHECK (pg_column_size(attached) < 131072)
);
CREATE INDEX IF NOT EXISTS session_cancel_overrides_session_idx ON public.session_cancel_overrides (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_cancel_overrides_created_idx ON public.session_cancel_overrides (created_at DESC);
CREATE INDEX IF NOT EXISTS session_cancel_overrides_batch_idx   ON public.session_cancel_overrides (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS session_cancel_overrides_review_idx  ON public.session_cancel_overrides (review_required, created_at DESC);

CREATE TABLE IF NOT EXISTS public.session_cancel_override_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  override_id   uuid REFERENCES public.session_cancel_overrides(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  kind          text NOT NULL CHECK (kind IN ('guard_installed', 'tuition_refreshed', 'tuition_refresh_failed',
                                              'reviewed', 'automation_refused')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT session_cancel_override_events_payload_size CHECK (pg_column_size(payload) < 262144)
);
CREATE INDEX IF NOT EXISTS session_cancel_override_events_override_idx
  ON public.session_cancel_override_events (override_id, created_at);

-- Append-only, for everyone.
CREATE OR REPLACE FUNCTION public.session_cancel_audit_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'HC040';
END $fn$;

-- Inserts only from the definer functions of this file (they run as the
-- table owner). SECURITY INVOKER on purpose: current_user is whoever runs
-- the INSERT, so a direct insert by an API role - service_role included,
-- despite its GRANT ALL - is refused.
CREATE OR REPLACE FUNCTION public.session_cancel_audit_insert_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  -- Revision 1 (D-review-2 F-9): fail-closed form - only the table's
  -- owner (whom the definer functions run as) may insert; a role added
  -- later is refused by default, not let in.
  IF current_user::text IN ('anon', 'authenticated', 'service_role', 'authenticator')
     OR current_user <> (SELECT c.relowner::regrole::name FROM pg_class c WHERE c.oid = TG_RELID) THEN
    RAISE EXCEPTION '% rows are written only by the checked session functions', TG_TABLE_NAME
      USING ERRCODE = 'HC041';
  END IF;
  RETURN NEW;
END $fn$;

DO $trg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['session_cancel_overrides', 'session_cancel_override_events'] LOOP
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

ALTER TABLE public.session_cancel_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_cancel_override_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_cancel_overrides_admin_read ON public.session_cancel_overrides;
CREATE POLICY session_cancel_overrides_admin_read ON public.session_cancel_overrides
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS session_cancel_override_events_admin_read ON public.session_cancel_override_events;
CREATE POLICY session_cancel_override_events_admin_read ON public.session_cancel_override_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.session_cancel_overrides, public.session_cancel_override_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.session_cancel_overrides, public.session_cancel_override_events TO authenticated;
GRANT ALL ON public.session_cancel_overrides, public.session_cancel_override_events TO service_role;

-- ---------------------------------------------------------------- 2
-- Small shared rules.

-- "Started" in Hanoi wall-clock time (the zone D1 uses; same offset as
-- the Asia/Bangkok elsewhere in the database - D-review-1 B-12).
CREATE OR REPLACE FUNCTION public.session_has_started(p_date date, p_start time)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT now() >= ((p_date + p_start) AT TIME ZONE 'Asia/Ho_Chi_Minh')
$fn$;

-- The one classifier (review change 1). Used by the trigger, the preview
-- and the RPCs. NULL = nothing guarded (Scheduled <-> Held, a time edit
-- that leaves a started lesson started, teacher, notes, rate...).
CREATE OR REPLACE FUNCTION public.session_change_kind(o public.sessions, n public.sessions)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $fn$
DECLARE
  v_kinds text[] := ARRAY[]::text[];
BEGIN
  IF n.id IS NULL THEN
    RETURN 'delete';
  END IF;
  IF n.status = 'Canceled' AND o.status IS DISTINCT FROM 'Canceled' THEN v_kinds := v_kinds || 'cancel'::text; END IF;
  IF o.status = 'Canceled' AND n.status IS DISTINCT FROM 'Canceled' THEN v_kinds := v_kinds || 'uncancel'::text; END IF;
  IF o.class_id IS DISTINCT FROM n.class_id THEN v_kinds := v_kinds || 'reclass'::text; END IF;
  IF o.date IS DISTINCT FROM n.date
     OR (public.session_has_started(o.date, o.start_time) AND NOT public.session_has_started(n.date, n.start_time)) THEN
    v_kinds := v_kinds || 'move'::text;
  END IF;
  IF cardinality(v_kinds) > 1 THEN
    RAISE EXCEPTION 'one change at a time' USING ERRCODE = 'HC022',
      DETAIL = 'kinds=' || array_to_string(v_kinds, ',');
  END IF;
  RETURN v_kinds[1];
END $fn$;

-- Tier (design section 2). Fails closed on an unknown level.
CREATE OR REPLACE FUNCTION public.session_change_tier(p_started boolean, p_level text, p_settled boolean)
RETURNS int LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
BEGIN
  IF p_level IS NULL OR p_level NOT IN ('NONE', 'SOFT', 'STRONG') THEN
    RAISE EXCEPTION 'unknown evidence level %', p_level USING ERRCODE = '55000';
  END IF;
  IF p_level = 'STRONG' AND COALESCE(p_settled, true) THEN RETURN 3; END IF;
  IF p_level IN ('SOFT', 'STRONG') THEN RETURN 2; END IF;
  IF COALESCE(p_started, true) THEN RETURN 1; END IF;
  RETURN 0;
END $fn$;

-- Reason rule (design section 2). Returns the cleaned text or raises HC010.
CREATE OR REPLACE FUNCTION public.session_change_reason_ok(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  v text := btrim(regexp_replace(COALESCE(p, ''), '\s+', ' ', 'g'));
BEGIN
  IF char_length(v) < 15 OR char_length(v) > 1000
     OR (SELECT count(DISTINCT c) FROM regexp_split_to_table(replace(v, ' ', ''), '') AS c) < 5
     OR lower(v) IN ('no reason provided', 'bulk cancellation', 'admin status change',
                     'admin force-canceled (correction)', 'deleted via admin interface') THEN
    RAISE EXCEPTION 'reason_too_short' USING ERRCODE = 'HC010',
      DETAIL = 'A reason of 15-1000 characters with at least 5 different characters is required; canned reasons are refused.';
  END IF;
  RETURN v;
END $fn$;

-- Has a child with a billable row on this lesson a settled bill in this
-- month? The same test as D1 item 12 (20261112090000, "invoice_settled"),
-- restated here because D1 answers it only for the lesson's OWN month and
-- a move needs the destination (review change 3). The suite asserts the
-- two agree on the source month.
CREATE OR REPLACE FUNCTION public.session_month_tuition_settled(p_session_id uuid, p_month text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM public.attendance a
      JOIN public.invoices i ON i.student_id = a.student_id AND i.month = p_month
     WHERE a.session_id = p_session_id
       AND a.status IN ('Present', 'Absent', 'Late')
       AND (COALESCE(i.recorded_payment, 0) > 0
            OR i.status::text IN ('paid', 'partial')
            OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
            OR COALESCE(i.tuition_frozen, false)))
$fn$;

-- Revision 1 (review-1 B-3(c), D-review-2 F-5): what a move LANDS on.
-- Points, transcripts and homework are matched to a lesson by class +
-- date (D1 items 7-9), so moving a lesson onto a day that already has
-- them attaches them to it. Read over-inclusively (fail closed): any
-- positive participation/correction point row of the class that day not
-- linked to this lesson, any unlinked transcript of that day, any
-- homework set that Hanoi day outside the Pixel Pal sync, and any OTHER
-- lesson of the class that day that is Held or carries a person's mark.
-- It decides only "review this move" and "not on the automation lane".
CREATE OR REPLACE FUNCTION public.session_day_evidence(p_session_id uuid, p_class_id uuid, p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_day_start timestamptz := (p_date::timestamp) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_day_end   timestamptz := ((p_date + 1)::timestamp) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_points int; v_tr int; v_hw int; v_other int;
BEGIN
  SELECT count(*)::int INTO v_points FROM public.point_transactions pt
   WHERE pt.class_id = p_class_id AND pt.date = p_date
     AND pt.type IN ('participation', 'correction') AND pt.points > 0
     AND pt.session_id IS DISTINCT FROM p_session_id;
  SELECT count(*)::int INTO v_tr FROM public.class_transcripts ct
   WHERE ct.class_id = p_class_id AND ct.session_id IS DISTINCT FROM p_session_id
     AND (ct.transcript_date = p_date OR (ct.created_at >= v_day_start AND ct.created_at < v_day_end));
  SELECT count(*)::int INTO v_hw FROM public.homeworks h
   WHERE h.class_id = p_class_id AND h.created_at >= v_day_start AND h.created_at < v_day_end
     AND NOT EXISTS (SELECT 1 FROM public.stars_homework_map m WHERE m.homework_id = h.id);
  SELECT count(*)::int INTO v_other FROM public.sessions o
   WHERE o.class_id = p_class_id AND o.date = p_date AND o.id <> p_session_id
     AND (o.status = 'Held'
          OR EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = o.id AND a.marked_by IS NOT NULL));
  RETURN jsonb_build_object('points', v_points, 'transcripts', v_tr, 'homeworks', v_hw, 'other_lessons', v_other,
                            'any', (v_points + v_tr + v_hw + v_other) > 0);
END $fn$;

-- ---------------------------------------------------------------- 3
-- Assessment: everything the admin is shown and the token covers. Used
-- by the preview (no lock) and by the RPCs (after the row lock, so its
-- reads see every mark committed before the lock and no later one).

CREATE OR REPLACE FUNCTION public._session_change_assess(s public.sessions, p_action text, p_change jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ev jsonb;
  v_hash text;
  v_level text;
  v_settled_src boolean;
  v_started_src boolean;
  v_started boolean;
  v_settled boolean;
  v_refuse text;
  v_kind text;
  n public.sessions;
  v_change jsonb;
  v_src_month text := to_char(s.date, 'YYYY-MM');
  v_months text[];
  v_dest jsonb := NULL;
  v_dest_started boolean := false;
  v_dest_locked boolean := false;
  v_dest_tuition boolean := false;
  v_dest_day jsonb := NULL;
  v_tier int;
  v_affected jsonb;
  v_aff_fp text;
  v_invoices jsonb;
  v_inv_fp text;
  v_pairs jsonb;
  v_token text;
  v_marks int;
BEGIN
  v_ev := public.session_held_evidence(s.id);
  v_hash := v_ev ->> 'snapshot_hash';
  IF v_hash IS NULL OR v_ev -> 'settled' IS NULL OR jsonb_typeof(v_ev -> 'settled') <> 'object' THEN
    RAISE EXCEPTION 'evidence without its full view' USING ERRCODE = '55000';
  END IF;
  v_level := v_ev ->> 'level';
  v_settled_src := COALESCE((v_ev -> 'settled' ->> 'any')::boolean, true);
  v_started_src := public.session_has_started(s.date, s.start_time);
  v_started := v_started_src;
  v_settled := v_settled_src;
  v_months := ARRAY[v_src_month];

  IF p_action = 'cancel' THEN
    IF s.status = 'Canceled' THEN v_refuse := 'already_canceled'; END IF;
  ELSIF p_action = 'delete' THEN
    IF v_level <> 'NONE' THEN v_refuse := 'use_cancel'; END IF;
  ELSIF p_action = 'uncancel' THEN
    IF s.status <> 'Canceled' THEN v_refuse := 'not_canceled'; END IF;
  ELSIF p_action = 'move' THEN
    IF s.status = 'Canceled' THEN
      v_refuse := 'already_canceled';
    ELSE
      BEGIN
        n := s;
        n.date       := (p_change ->> 'date')::date;
        n.start_time := (p_change ->> 'start_time')::time;
        n.end_time   := (p_change ->> 'end_time')::time;
      EXCEPTION WHEN OTHERS THEN
        n.date := NULL;
      END;
      IF n.date IS NULL OR n.start_time IS NULL OR n.end_time IS NULL OR n.end_time <= n.start_time THEN
        v_refuse := 'bad_change';
      ELSE
        v_kind := public.session_change_kind(s, n);
        IF v_kind IS DISTINCT FROM 'move' THEN
          v_refuse := 'bad_change';   -- B-1: an unguarded edit is not a move
        END IF;
        v_change := jsonb_build_object(
          'new_date', to_char(n.date, 'YYYY-MM-DD'),
          'new_start_time', to_char(n.start_time, 'HH24:MI:SS'),
          'new_end_time', to_char(n.end_time, 'HH24:MI:SS'));
        -- Review change 3: judge where it goes, not only where it comes from.
        v_dest_started := public.session_has_started(n.date, n.start_time);
        v_dest_locked  := public.payroll_month_is_locked(to_char(n.date, 'YYYY-MM'));
        v_dest_tuition := public.session_month_tuition_settled(s.id, to_char(n.date, 'YYYY-MM'));
        v_dest_day := public.session_day_evidence(s.id, s.class_id, n.date);   -- revision 1, F-5
        v_dest := jsonb_build_object('month', to_char(n.date, 'YYYY-MM'), 'started', v_dest_started,
                                     'payroll_month_locked', v_dest_locked, 'tuition', v_dest_tuition,
                                     'any', v_dest_locked OR v_dest_tuition,
                                     'day_evidence', v_dest_day);
        v_change := v_change || jsonb_build_object('destination', v_dest);
        v_started := v_started_src OR v_dest_started;
        v_settled := v_settled_src OR v_dest_locked OR v_dest_tuition;
        IF to_char(n.date, 'YYYY-MM') <> v_src_month THEN
          v_months := v_months || to_char(n.date, 'YYYY-MM');
        END IF;
      END IF;
    END IF;
  ELSE
    v_refuse := 'bad_action';
  END IF;

  v_tier := public.session_change_tier(v_started, v_level, v_settled);
  -- Revision 1: landing on a day that already carries evidence is never
  -- a no-question move - at least a reason AND a confirmation (and review).
  IF COALESCE((v_dest_day ->> 'any')::boolean, false) AND v_tier < 1 THEN
    v_tier := 1;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'student_id', a.student_id, 'month', v_src_month, 'status', a.status,
           'marked_by_person', a.marked_by IS NOT NULL) ORDER BY a.student_id::text COLLATE "C"), '[]'::jsonb),
         md5(COALESCE(string_agg(a.student_id::text || ':' || a.status, ','
                                 ORDER BY a.student_id::text COLLATE "C"), '')),
         count(*) FILTER (WHERE (p_action = 'uncancel' AND a.status = 'Excused')
                              OR (p_action <> 'uncancel' AND a.status IS DISTINCT FROM 'Excused'))::int
    INTO v_affected, v_aff_fp, v_marks
    FROM public.attendance a
   WHERE a.session_id = s.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', i.id, 'student_id', i.student_id, 'month', i.month,
           'base_amount', i.base_amount, 'discount_amount', i.discount_amount, 'total_amount', i.total_amount,
           'recorded_payment', i.recorded_payment, 'status', i.status, 'confirmation_status', i.confirmation_status,
           'tuition_frozen', i.tuition_frozen, 'carry_in_credit', i.carry_in_credit, 'carry_in_debt', i.carry_in_debt,
           'carry_out_credit', i.carry_out_credit, 'carry_out_debt', i.carry_out_debt,
           'class_breakdown', i.class_breakdown) ORDER BY i.id::text COLLATE "C"), '[]'::jsonb),
         -- Review change 6: the token covers the bill fields the admin is shown.
         md5(COALESCE(jsonb_agg(jsonb_build_array(i.id, i.total_amount, i.recorded_payment, i.status,
                                                  i.confirmation_status, i.tuition_frozen)
                                ORDER BY i.id::text COLLATE "C")::text, ''))
    INTO v_invoices, v_inv_fp
    FROM public.invoices i
   WHERE i.month = ANY (v_months)
     AND i.student_id IN (SELECT a.student_id FROM public.attendance a WHERE a.session_id = s.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', st.student_id, 'month', m.month)
                            ORDER BY st.student_id::text COLLATE "C", m.month), '[]'::jsonb)
    INTO v_pairs
    FROM (SELECT DISTINCT a.student_id FROM public.attendance a WHERE a.session_id = s.id) st
    CROSS JOIN unnest(v_months) AS m(month);

  v_token := encode(sha256(convert_to(jsonb_build_array(
      2, p_action, s.id, p_uid, v_tier, v_hash,
      s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
      to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
      v_change, v_aff_fp, v_inv_fp
  )::text, 'UTF8')), 'hex');

  RETURN jsonb_build_object(
    'action', p_action,
    'session', jsonb_build_object('id', s.id, 'class_id', s.class_id, 'date', to_char(s.date, 'YYYY-MM-DD'),
                                  'start_time', s.start_time, 'end_time', s.end_time, 'status', s.status,
                                  'teacher_id', s.teacher_id, 'updated_at', s.updated_at),
    'started', v_started,
    'tier', v_tier,
    'level', v_level,
    'settled', v_ev -> 'settled',
    'settled_any', v_settled,
    'destination', v_dest,
    'change', v_change,
    'evidence', v_ev,
    'requires', jsonb_build_object('reason_min', 15,
                                   'confirm', v_tier >= 1 AND p_action <> 'uncancel',
                                   'correction_reason', v_tier = 3),
    'allowed', v_refuse IS NULL,
    'refuse_code', v_refuse,
    'affected', v_affected,
    'invoices_before', v_invoices,
    'refresh_pairs', v_pairs,
    'after_cancel', jsonb_build_object('marks_excused', CASE WHEN p_action = 'cancel' THEN v_marks END,
                                       'marks_excused_now', CASE WHEN p_action = 'uncancel' THEN v_marks END),
    'token', v_token);
END $fn$;

-- Review change 4: evidence erased in the 30 days before, from audit_log.
-- Only read inside the RPCs and the preview (one call per change), never
-- in the trigger.
--
-- Revision 1 (D-review-2 F-1): a register row RE-PARENTED away from this
-- lesson (`UPDATE attendance SET session_id = <another lesson>`) is erased
-- evidence too, whatever its status or who marked it: it takes the mark
-- AND the child's bill line with it, and nothing in the app needs that
-- write. Counted fail-closed (any status, seeded or not), so a lesson
-- stripped that way is always reviewed. Refusing the write itself is D4.
CREATE OR REPLACE FUNCTION public._session_erased_recently(p_session_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(x ORDER BY x ->> 'occurred_at', x::text), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('what', 'attendance', 'operation', l.operation,
             'student_id', l.diff -> 'old' ->> 'student_id',
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'new_marked_by_null', (l.diff -> 'new') IS NOT NULL AND (l.diff -> 'new' ->> 'marked_by') IS NULL,
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at) AS x
      FROM public.audit_log l
     WHERE l.entity = 'attendance'
       AND l.operation IN ('UPDATE', 'DELETE')
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'session_id' = p_session_id::text
       AND l.diff -> 'old' ->> 'status' IN ('Present', 'Late')
       AND (l.diff -> 'old' ->> 'marked_by') IS NOT NULL
       AND (l.operation = 'DELETE'      -- a re-parent is reported by the next branch instead
            OR (l.diff -> 'new' ->> 'session_id') IS NOT DISTINCT FROM (l.diff -> 'old' ->> 'session_id'))
       AND (l.operation = 'DELETE'
            OR (l.diff -> 'new' ->> 'status') IS DISTINCT FROM (l.diff -> 'old' ->> 'status')
               AND (l.diff -> 'new' ->> 'status') NOT IN ('Present', 'Late')
            OR (l.diff -> 'new' ->> 'marked_by') IS NULL)
    UNION ALL
    SELECT jsonb_build_object('what', 'attendance_reparented', 'operation', l.operation,
             'student_id', l.diff -> 'old' ->> 'student_id',
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'old_marked_by_person', (l.diff -> 'old' ->> 'marked_by') IS NOT NULL,
             'new_session_id', l.diff -> 'new' ->> 'session_id',
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at)
      FROM public.audit_log l
     WHERE l.entity = 'attendance'
       AND l.operation = 'UPDATE'
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'session_id' = p_session_id::text
       AND (l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')
    UNION ALL
    SELECT jsonb_build_object('what', 'session_status', 'operation', l.operation,
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at)
      FROM public.audit_log l
     WHERE l.entity = 'sessions'
       AND l.entity_id = p_session_id::text
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'status' = 'Held'
       AND (l.diff -> 'new' ->> 'status') IS DISTINCT FROM 'Held'
  ) q
$fn$;

-- Who goes to the review queue. ONE rule, used by the preview (so the
-- dialog can say so before Confirm - D-review-2 F-8.2) and by the apply.
-- Revision 1 (F-5): a move that starts at, lands in a settled month of,
-- or lands on a day with evidence of its DESTINATION is reviewed too, and
-- so is an un-cancel inside a settled month.
CREATE OR REPLACE FUNCTION public._session_review_required(a jsonb, p_action text, p_erased jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT COALESCE(
       (a ->> 'tier')::int = 3
    OR ((a ->> 'tier')::int = 2 AND a ->> 'level' = 'STRONG')
    OR (p_action = 'delete' AND (a ->> 'tier')::int >= 1)
    OR (p_action = 'move' AND (a ->> 'tier')::int >= 2)
    OR (p_action = 'move' AND (COALESCE((a -> 'destination' ->> 'started')::boolean, true)
                               OR COALESCE((a -> 'destination' ->> 'any')::boolean, true)
                               OR COALESCE((a -> 'destination' -> 'day_evidence' ->> 'any')::boolean, true)))
    OR (p_action = 'uncancel' AND COALESCE((a ->> 'settled_any')::boolean, true))
    OR jsonb_array_length(COALESCE(p_erased, '[]'::jsonb)) > 0,
    true)
$fn$;

-- ---------------------------------------------------------------- 4
-- The trigger on sessions.

CREATE OR REPLACE FUNCTION public.session_change_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kind text;
  v_ack text;
  o public.session_cancel_overrides;
  v_ev jsonb;
  v_level text;
  v_settled boolean;
  v_ok boolean;
  v_new_month text;
BEGIN
  -- Revision 1 (D-review-2 F-4): a lesson's id is its identity in the
  -- audit trail (overrides, audit_log history). Nobody changes it, on any
  -- lane, with or without an acknowledgement.
  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
      DETAIL = 'kind=id_change; a lesson''s id cannot be changed';
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_kind := 'delete';
  ELSE
    v_kind := public.session_change_kind(OLD, NEW);
    IF v_kind IS NULL THEN
      RETURN NEW;            -- not guarded; the flag, if any, is left alone (the RPC then raises HC050)
    END IF;
  END IF;

  -- ---- acknowledged lane
  v_ack := NULLIF(current_setting('hec.session_change_ack', true), '');
  IF v_ack IS NOT NULL THEN
    SELECT * INTO o FROM public.session_cancel_overrides ov
     WHERE ov.id::text = v_ack            -- never cast the setting: a malformed value just matches nothing
       AND ov.session_id = OLD.id
       AND ov.action = v_kind
       AND ov.txid = txid_current();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
        DETAIL = 'kind=' || v_kind || '; acknowledgement does not match this session, change and transaction';
    END IF;
    IF v_kind = 'move' AND (NEW.date       IS DISTINCT FROM (o.change ->> 'new_date')::date
                         OR NEW.start_time IS DISTINCT FROM (o.change ->> 'new_start_time')::time
                         OR NEW.end_time   IS DISTINCT FROM (o.change ->> 'new_end_time')::time) THEN
      RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
        DETAIL = 'kind=move; the write differs from the acknowledged move';
    END IF;
    IF v_kind = 'uncancel' AND NEW.status IS DISTINCT FROM 'Scheduled' THEN
      RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
        DETAIL = 'kind=uncancel; only back to Scheduled';
    END IF;
    PERFORM set_config('hec.session_change_ack', '', true);   -- consumed: one row, one write
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- ---- unacknowledged lane
  IF v_kind IN ('cancel', 'uncancel') THEN
    RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
      DETAIL = 'kind=' || v_kind || '; never without the checked path';
  END IF;
  -- Review change 2, ruling fail-closed: the raw lane is automation only.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'session_change_requires_checked_path'
      USING ERRCODE = CASE WHEN v_kind = 'reclass' THEN 'HC021' ELSE 'HC020' END,
            DETAIL = 'kind=' || v_kind || '; a signed-in person uses the checked path';
  END IF;

  v_ev := public.session_held_evidence(OLD.id);     -- errors propagate: refused
  v_level := v_ev ->> 'level';
  v_settled := COALESCE((v_ev -> 'settled' ->> 'any')::boolean, true);

  IF v_kind = 'delete' THEN
    v_ok := NOT public.session_has_started(OLD.date, OLD.start_time)
            AND OLD.status = 'Scheduled' AND v_level = 'NONE';
  ELSIF v_kind = 'reclass' THEN
    v_ok := NOT public.session_has_started(OLD.date, OLD.start_time)
            AND OLD.status = 'Scheduled' AND v_level = 'NONE';
  ELSE -- move
    v_new_month := to_char(NEW.date, 'YYYY-MM');
    v_ok := NOT public.session_has_started(OLD.date, OLD.start_time)
            AND NOT public.session_has_started(NEW.date, NEW.start_time)      -- change 3: not into the past
            AND v_level = 'NONE'
            AND NOT (v_new_month <> to_char(OLD.date, 'YYYY-MM') AND v_settled)
            AND NOT public.payroll_month_is_locked(v_new_month)               -- change 3: destination
            AND NOT public.session_month_tuition_settled(OLD.id, v_new_month)
            -- revision 1 (F-5): not onto a day that already has evidence
            AND NOT COALESCE((public.session_day_evidence(OLD.id, OLD.class_id, NEW.date) ->> 'any')::boolean, true);
  END IF;

  IF NOT COALESCE(v_ok, false) THEN
    RAISE EXCEPTION 'session_change_requires_checked_path'
      USING ERRCODE = CASE WHEN v_kind = 'reclass' THEN 'HC021' ELSE 'HC020' END,
            DETAIL = 'kind=' || v_kind || '; started=' || public.session_has_started(OLD.date, OLD.start_time)::text
                     || '; level=' || COALESCE(v_level, 'null');
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION public.session_refuse_truncate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  RAISE EXCEPTION 'sessions cannot be truncated' USING ERRCODE = 'HC030';
END $fn$;

DROP TRIGGER IF EXISTS zz_session_change_guard_upd ON public.sessions;
CREATE TRIGGER zz_session_change_guard_upd BEFORE UPDATE ON public.sessions FOR EACH ROW
  WHEN (OLD.id         IS DISTINCT FROM NEW.id
     OR OLD.status     IS DISTINCT FROM NEW.status
     OR OLD.date       IS DISTINCT FROM NEW.date
     OR OLD.start_time IS DISTINCT FROM NEW.start_time
     OR OLD.class_id   IS DISTINCT FROM NEW.class_id)
  EXECUTE FUNCTION public.session_change_guard();
DROP TRIGGER IF EXISTS zz_session_change_guard_del ON public.sessions;
CREATE TRIGGER zz_session_change_guard_del BEFORE DELETE ON public.sessions FOR EACH ROW
  EXECUTE FUNCTION public.session_change_guard();
DROP TRIGGER IF EXISTS zz_session_no_truncate ON public.sessions;
CREATE TRIGGER zz_session_no_truncate BEFORE TRUNCATE ON public.sessions FOR EACH STATEMENT
  EXECUTE FUNCTION public.session_refuse_truncate();

-- ---------------------------------------------------------------- 5
-- The checked path.

CREATE OR REPLACE FUNCTION public._session_require_admin()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END $fn$;

CREATE OR REPLACE FUNCTION public.session_change_preview(p_session_id uuid, p_action text, p_change jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  s public.sessions;
  v jsonb;
  v_erased jsonb := '[]'::jsonb;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'a session id is required' USING ERRCODE = '22004';
  END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002';
  END IF;
  v := public._session_change_assess(s, p_action, p_change, v_uid);
  -- Revision 1 (F-8.2): say before Confirm whether this goes to review.
  -- Informational: NOT covered by the token (the 30-day window moves);
  -- the RPC result's review_required is the authority.
  IF p_action IN ('cancel', 'delete', 'move') THEN
    v_erased := public._session_erased_recently(s.id);
  END IF;
  -- What the trigger would do with a plain edit of this shape (B-1): the
  -- UI sends an unguarded edit (kind null) as a normal update.
  RETURN v || jsonb_build_object('kind', CASE WHEN p_action = 'move' AND v ->> 'refuse_code' = 'bad_change'
                                               THEN NULL ELSE p_action END,
                                 'erased_recently', v_erased,
                                 'review_required', public._session_review_required(v, p_action, v_erased));
END $fn$;

CREATE OR REPLACE FUNCTION public._session_change_apply(
  p_session_id uuid, p_action text, p_change jsonb, p_reason text, p_token text, p_confirm boolean,
  p_correction_reason text, p_context jsonb, p_via text, p_batch_id uuid, p_own_reason boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_reason text;
  v_corr text;
  s public.sessions;
  a jsonb;
  v_tier int;
  v_erased jsonb := '[]'::jsonb;
  v_review boolean;
  v_deleted jsonb;
  v_id uuid;
  v_ctx jsonb := COALESCE(p_context, '{}'::jsonb);
  v_batch uuid := p_batch_id;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('cancel', 'delete', 'move', 'uncancel') THEN
    RAISE EXCEPTION 'bad_action' USING ERRCODE = 'HC015';
  END IF;
  IF jsonb_typeof(v_ctx) <> 'object' THEN
    v_ctx := '{}'::jsonb;
  END IF;
  v_reason := public.session_change_reason_ok(p_reason);
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'a session id is required' USING ERRCODE = '22004';
  END IF;

  -- First lock, always: session row, then (via the AFTER trigger) attendance -
  -- the order 20261027090000's attendance guard uses.
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002';
  END IF;

  -- Evidence, affected children and bills, read in later statements than
  -- the lock: everything committed before it, nothing after.
  a := public._session_change_assess(s, p_action, p_change, v_uid);
  v_tier := (a ->> 'tier')::int;

  IF a ->> 'refuse_code' IN ('already_canceled', 'not_canceled', 'bad_change', 'bad_action') THEN
    RAISE EXCEPTION '%', a ->> 'refuse_code' USING ERRCODE = 'HC015';
  END IF;
  IF p_token IS DISTINCT FROM a ->> 'token' THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011',
      DETAIL = 'The lesson, its evidence, its bills, the tier or the caller changed since the preview.';
  END IF;
  IF v_tier >= 1 AND p_action <> 'uncancel' AND NOT COALESCE(p_confirm, false) THEN
    RAISE EXCEPTION 'confirm_required' USING ERRCODE = 'HC012';
  END IF;
  IF v_tier = 3 THEN
    BEGIN
      v_corr := public.session_change_reason_ok(p_correction_reason);
    EXCEPTION WHEN SQLSTATE 'HC010' THEN
      RAISE EXCEPTION 'correction_reason_required' USING ERRCODE = 'HC013';
    END;
  END IF;
  IF a ->> 'refuse_code' = 'use_cancel' THEN
    RAISE EXCEPTION 'use_cancel' USING ERRCODE = 'HC014',
      DETAIL = 'A lesson with evidence is cancelled, not deleted.';
  END IF;
  -- Bulk: a lesson with evidence needs its own reason, not the batch's.
  IF p_via = 'bulk' AND v_tier >= 2 AND NOT p_own_reason THEN
    RAISE EXCEPTION 'own_reason_required' USING ERRCODE = 'HC017';
  END IF;

  IF p_action IN ('cancel', 'delete', 'move') THEN
    v_erased := public._session_erased_recently(s.id);
  END IF;
  v_review := public._session_review_required(a, p_action, v_erased);

  IF p_action = 'delete' THEN
    v_deleted := jsonb_build_object(
      'attendance', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.student_id::text COLLATE "C"), '[]'::jsonb)
                       FROM public.attendance x WHERE x.session_id = s.id),
      'session_participants', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text COLLATE "C"), '[]'::jsonb)
                                 FROM public.session_participants x WHERE x.session_id = s.id));
  END IF;
  IF v_batch IS NULL AND (v_ctx ->> 'batch_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_batch := (v_ctx ->> 'batch_id')::uuid;
  END IF;

  INSERT INTO public.session_cancel_overrides (
    txid, actor_user_id, session_id, class_id, teacher_id, session_date, action, via, batch_id,
    tier, level, settled, correction_mode, reason, correction_reason, confirmed, token,
    evidence, session_before, change, affected, invoices_before, refresh_pairs, deleted_rows,
    payroll_month_locked, erased_recently, review_required, attached)
  VALUES (
    txid_current(), v_uid, s.id, s.class_id, s.teacher_id, s.date, p_action,
    CASE WHEN p_via = 'bulk' THEN 'bulk' ELSE 'single' END, v_batch,
    v_tier, a ->> 'level', (a ->> 'settled_any')::boolean, v_tier = 3, v_reason, v_corr,
    COALESCE(p_confirm, false), a ->> 'token',
    a -> 'evidence', to_jsonb(s), a -> 'change', a -> 'affected', a -> 'invoices_before', a -> 'refresh_pairs',
    v_deleted,
    COALESCE((a -> 'settled' ->> 'payroll_month_locked')::boolean, true)
      OR COALESCE((a -> 'destination' ->> 'payroll_month_locked')::boolean, false),
    v_erased, v_review, COALESCE(v_ctx -> 'attached', '{}'::jsonb))
  RETURNING id INTO v_id;

  PERFORM set_config('hec.session_change_ack', v_id::text, true);

  IF p_action = 'cancel' THEN
    UPDATE public.sessions
       SET status = 'Canceled', canceled_reason = v_reason, canceled_by = v_uid, canceled_at = now(),
           updated_by = v_uid,
           is_manual = CASE WHEN v_ctx ->> 'set_manual' = 'true' THEN true ELSE is_manual END,
           manual_reason = CASE WHEN v_ctx ->> 'set_manual' = 'true' THEN v_reason ELSE manual_reason END
     WHERE id = s.id;
  ELSIF p_action = 'delete' THEN
    DELETE FROM public.sessions WHERE id = s.id;
  ELSIF p_action = 'move' THEN
    UPDATE public.sessions
       SET date = (a -> 'change' ->> 'new_date')::date,
           start_time = (a -> 'change' ->> 'new_start_time')::time,
           end_time = (a -> 'change' ->> 'new_end_time')::time,
           updated_by = v_uid
     WHERE id = s.id;
  ELSE -- uncancel: canceled_* are history and stay; attendance is not touched (OQ-2)
    UPDATE public.sessions SET status = 'Scheduled', updated_by = v_uid WHERE id = s.id;
  END IF;

  IF COALESCE(current_setting('hec.session_change_ack', true), '') <> '' THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'The guard trigger on sessions did not run (missing or disabled). Nothing was changed.';
  END IF;

  RETURN jsonb_build_object(
    'override_id', v_id, 'action', p_action, 'session_id', s.id, 'tier', v_tier, 'level', a ->> 'level',
    'review_required', v_review, 'erased_recently', jsonb_array_length(v_erased) > 0,
    'affected', (SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', e ->> 'student_id', 'month', e ->> 'month')), '[]'::jsonb)
                   FROM jsonb_array_elements(a -> 'affected') e),
    'refresh_pairs', a -> 'refresh_pairs',
    'session_before', to_jsonb(s));
END $fn$;

CREATE OR REPLACE FUNCTION public.cancel_session_checked(
  p_session_id uuid, p_action text, p_reason text, p_token text,
  p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('cancel', 'delete') THEN
    PERFORM public._session_require_admin();
    RAISE EXCEPTION 'bad_action' USING ERRCODE = 'HC015';
  END IF;
  RETURN public._session_change_apply(p_session_id, p_action, NULL, p_reason, p_token, p_confirm,
                                      p_correction_reason, p_context, 'single', NULL, true);
END $fn$;

CREATE OR REPLACE FUNCTION public.move_session_checked(
  p_session_id uuid, p_new_date date, p_new_start time, p_new_end time, p_reason text, p_token text,
  p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN public._session_change_apply(p_session_id, 'move',
    jsonb_build_object('date', p_new_date, 'start_time', p_new_start, 'end_time', p_new_end),
    p_reason, p_token, p_confirm, p_correction_reason, p_context, 'single', NULL, true);
END $fn$;

CREATE OR REPLACE FUNCTION public.uncancel_session_checked(
  p_session_id uuid, p_reason text, p_token text,
  p_context jsonb DEFAULT '{}'::jsonb, p_correction_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN public._session_change_apply(p_session_id, 'uncancel', NULL, p_reason, p_token, false,
                                      p_correction_reason, p_context, 'single', NULL, true);
END $fn$;

-- Review change 5: at most 50 per call; the edge function loops over
-- chunks with one batch_id, each chunk its own transaction.
CREATE OR REPLACE FUNCTION public.cancel_sessions_checked_bulk(
  p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  it record;
  v_done jsonb := '[]'::jsonb;
  v_refused jsonb := '[]'::jsonb;
  r jsonb;
  v_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'bad_items' USING ERRCODE = 'HC015';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'too_many' USING ERRCODE = 'HC016', DETAIL = 'At most 50 lessons per call.';
  END IF;
  IF p_batch_id IS NULL THEN
    RAISE EXCEPTION 'a batch id is required' USING ERRCODE = '22004';
  END IF;

  FOR it IN
    SELECT e AS item, e ->> 'id' AS id_text
      FROM jsonb_array_elements(p_items) AS e
     ORDER BY e ->> 'id' COLLATE "C"           -- ascending id: overlapping batches lock in one order
  LOOP
    v_id := NULL;
    IF it.id_text IS NULL OR it.id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('id', it.id_text, 'code', 'HC015', 'message', 'bad_item'));
      CONTINUE;
    END IF;
    v_id := it.id_text::uuid;
    BEGIN
      r := public._session_change_apply(
             v_id, 'cancel', NULL,
             COALESCE(NULLIF(it.item ->> 'reason', ''), p_reason), it.item ->> 'token',
             COALESCE((it.item ->> 'confirm')::boolean, false), it.item ->> 'correction_reason',
             p_context, 'bulk', p_batch_id, NULLIF(it.item ->> 'reason', '') IS NOT NULL);
      v_done := v_done || jsonb_build_array(jsonb_build_object(
                  'id', v_id, 'override_id', r -> 'override_id', 'tier', r -> 'tier',
                  'review_required', r -> 'review_required', 'refresh_pairs', r -> 'refresh_pairs'));
    EXCEPTION WHEN SQLSTATE 'HC010' OR SQLSTATE 'HC011' OR SQLSTATE 'HC012' OR SQLSTATE 'HC013'
                 OR SQLSTATE 'HC014' OR SQLSTATE 'HC015' OR SQLSTATE 'HC017' OR SQLSTATE 'P0002' THEN
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('id', v_id, 'code', SQLSTATE, 'message', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object('batch_id', p_batch_id, 'done', v_done, 'refused', v_refused);
END $fn$;

-- ---------------------------------------------------------------- 6
-- Afterwards: tuition refresh results, review sign-off, automation notes.

CREATE OR REPLACE FUNCTION public.record_session_override_event(p_override_id uuid, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  o public.session_cancel_overrides;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_id uuid;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('tuition_refreshed', 'tuition_refresh_failed', 'reviewed') THEN
    RAISE EXCEPTION 'bad_kind' USING ERRCODE = 'HC015';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION 'bad_payload' USING ERRCODE = 'HC015';
  END IF;
  SELECT * INTO o FROM public.session_cancel_overrides WHERE id = p_override_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'override not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_kind = 'reviewed' THEN
    v_payload := v_payload || jsonb_build_object('note', public.session_change_reason_ok(v_payload ->> 'note'));
  ELSE
    -- The database's own copy of the bills now, beside whatever the edge
    -- function attached (calculator responses: attachments, never truth).
    v_payload := jsonb_build_object('attached', v_payload) || jsonb_build_object('invoices_after', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', i.id, 'student_id', i.student_id, 'month', i.month,
               'base_amount', i.base_amount, 'discount_amount', i.discount_amount, 'total_amount', i.total_amount,
               'recorded_payment', i.recorded_payment, 'status', i.status, 'confirmation_status', i.confirmation_status,
               'tuition_frozen', i.tuition_frozen, 'carry_in_credit', i.carry_in_credit, 'carry_in_debt', i.carry_in_debt,
               'carry_out_credit', i.carry_out_credit, 'carry_out_debt', i.carry_out_debt,
               'class_breakdown', i.class_breakdown) ORDER BY i.id::text COLLATE "C"), '[]'::jsonb)
        FROM public.invoices i
        JOIN jsonb_array_elements(o.refresh_pairs) p
          ON i.student_id::text = p ->> 'student_id' AND i.month = p ->> 'month'));
  END IF;
  INSERT INTO public.session_cancel_override_events (override_id, actor_user_id, kind, payload)
  VALUES (o.id, v_uid, p_kind, v_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;

-- For the rebuild (schedule-sessions) only: "I wanted to remove this
-- lesson and the guard kept it". Insert-only, decides nothing.
CREATE OR REPLACE FUNCTION public.log_session_automation_refused(p_session_id uuid, p_source text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.session_cancel_override_events (override_id, actor_user_id, kind, payload)
  VALUES (NULL, NULL, 'automation_refused', jsonb_build_object(
    'session_id', p_session_id, 'source', left(COALESCE(p_source, ''), 100),
    'session', (SELECT to_jsonb(s) FROM public.sessions s WHERE s.id = p_session_id)))
  RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.session_cancel_guard_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_upd "char"; v_del "char"; v_trunc "char";
  v_ev boolean; v_rec boolean;
BEGIN
  SELECT tgenabled INTO v_upd   FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND tgname = 'zz_session_change_guard_upd';
  SELECT tgenabled INTO v_del   FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND tgname = 'zz_session_change_guard_del';
  SELECT tgenabled INTO v_trunc FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND tgname = 'zz_session_no_truncate';
  v_ev  := EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.session_held_evidence(uuid)') AND provolatile = 's');
  v_rec := EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.session_recording_evidence(uuid)') AND provolatile IN ('s', 'i'));
  RETURN jsonb_build_object(
    'installed_at', (SELECT min(created_at) FROM public.session_cancel_override_events WHERE kind = 'guard_installed'),
    'update_trigger', v_upd::text, 'delete_trigger', v_del::text, 'truncate_trigger', v_trunc::text,
    'evidence_function', v_ev, 'recording_helper_stable', v_rec,
    'ok', COALESCE(v_upd = 'O' AND v_del = 'O' AND v_trunc = 'O' AND v_ev AND v_rec, false));
END $fn$;

-- ---------------------------------------------------------------- 7
-- Views for the review screen. security_invoker: the admin-only policies
-- of the tables apply to whoever reads them.

CREATE OR REPLACE VIEW public.session_cancel_review_queue WITH (security_invoker = true) AS
SELECT o.id AS override_id, o.created_at, o.actor_user_id, o.session_id, o.class_id, o.teacher_id, o.session_date,
       o.action, o.via, o.batch_id, o.tier, o.level, o.settled, o.correction_mode, o.reason, o.correction_reason,
       o.confirmed, o.change, o.affected, o.invoices_before, o.refresh_pairs, o.payroll_month_locked,
       o.erased_recently, o.attached,
       COALESCE((SELECT CASE e.kind WHEN 'tuition_refreshed' THEN 'refreshed' ELSE 'failed' END
                   FROM public.session_cancel_override_events e
                  WHERE e.override_id = o.id AND e.kind IN ('tuition_refreshed', 'tuition_refresh_failed')
                  ORDER BY e.created_at DESC, e.id DESC LIMIT 1), 'pending') AS tuition_state,
       now() - o.created_at AS age
  FROM public.session_cancel_overrides o
 WHERE o.review_required
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_override_events e
                    WHERE e.override_id = o.id AND e.kind = 'reviewed');

CREATE OR REPLACE VIEW public.session_cancel_tuition_pending WITH (security_invoker = true) AS
SELECT o.id AS override_id, o.created_at, o.actor_user_id, o.session_id, o.action, o.refresh_pairs,
       (SELECT e.kind FROM public.session_cancel_override_events e
         WHERE e.override_id = o.id AND e.kind IN ('tuition_refreshed', 'tuition_refresh_failed')
         ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS last_tuition_event,
       now() - o.created_at AS age
  FROM public.session_cancel_overrides o
 WHERE o.action IN ('cancel', 'delete', 'uncancel', 'move')   -- B-7: every checked move too
   AND o.created_at < now() - interval '10 minutes'
   AND jsonb_array_length(o.refresh_pairs) > 0
   AND NOT EXISTS (SELECT 1 FROM public.session_cancel_override_events e
                    WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed');

REVOKE ALL ON public.session_cancel_review_queue, public.session_cancel_tuition_pending FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.session_cancel_review_queue, public.session_cancel_tuition_pending TO authenticated, service_role;

-- ---------------------------------------------------------------- 8
-- Function grants. RPCs: the admin's own JWT only, NOT service_role (with
-- no auth.uid() they refuse anyway; leaving the grant out makes "no
-- service-role path" visible in the catalogue). Internal helpers: nobody.

REVOKE ALL ON FUNCTION
  public.session_has_started(date, time),
  public.session_change_kind(public.sessions, public.sessions),
  public.session_change_tier(boolean, text, boolean),
  public.session_change_reason_ok(text),
  public.session_month_tuition_settled(uuid, text),
  public.session_day_evidence(uuid, uuid, date),
  public._session_review_required(jsonb, text, jsonb),
  public._session_change_assess(public.sessions, text, jsonb, uuid),
  public._session_erased_recently(uuid),
  public.session_change_guard(),
  public.session_refuse_truncate(),
  public.session_cancel_audit_append_only(),
  public.session_cancel_audit_insert_guard(),
  public._session_require_admin(),
  public._session_change_apply(uuid, text, jsonb, text, text, boolean, text, jsonb, text, uuid, boolean),
  public.session_change_preview(uuid, text, jsonb),
  public.cancel_session_checked(uuid, text, text, text, boolean, text, jsonb),
  public.move_session_checked(uuid, date, time, time, text, text, boolean, text, jsonb),
  public.uncancel_session_checked(uuid, text, text, jsonb, text),
  public.cancel_sessions_checked_bulk(jsonb, text, uuid, jsonb),
  public.record_session_override_event(uuid, text, jsonb),
  public.log_session_automation_refused(uuid, text),
  public.session_cancel_guard_status()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.session_change_preview(uuid, text, jsonb),
  public.cancel_session_checked(uuid, text, text, text, boolean, text, jsonb),
  public.move_session_checked(uuid, date, time, time, text, text, boolean, text, jsonb),
  public.uncancel_session_checked(uuid, text, text, jsonb, text),
  public.cancel_sessions_checked_bulk(jsonb, text, uuid, jsonb),
  public.record_session_override_event(uuid, text, jsonb),
  public.session_cancel_guard_status()
TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_session_automation_refused(uuid, text) TO service_role;

-- "Guard on since": the earliest of these (threat model, detection).
INSERT INTO public.session_cancel_override_events (kind, payload)
VALUES ('guard_installed', jsonb_build_object('migration', '20261112091000_session_cancel_guard'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(tgname::text || '=' || tgenabled::text, ', ' ORDER BY tgname) FROM pg_trigger
    WHERE tgrelid = 'public.sessions'::regclass AND tgname LIKE 'zz_session%')          AS session_guard_triggers,
  (SELECT count(*) FROM public.session_cancel_overrides)                                 AS override_rows,
  (SELECT count(*) FROM public.session_cancel_override_events WHERE kind = 'guard_installed') AS installs;
