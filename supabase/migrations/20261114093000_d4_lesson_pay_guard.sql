-- D4 step 3A: who is paid for a lesson (G-1 to G-7, paths P1-P7).
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.0, b.1, b.8, c.0,
-- c.4, (d) "Step 3A", f.3 "G-1 to G-7", f.7 rollback 4. Build notes and the
-- decisions the design left open: docs/evidence/D4-build-3a.md.
--
-- WHAT THIS ADDS
--   triggers  sessions.zz2_session_pay_guard   BEFORE UPDATE  G-1 un-hold, G-2 hold
--                                              without a register, G-4 teacher, G-5 time
--             sessions.zz_session_insert_guard BEFORE INSERT  G-3 born Scheduled,
--                                              G-7 backdated lesson
--             session_participants.zz_session_staff_guard
--                                              BEFORE INSERT/UPDATE/DELETE  G-6 assistants
--   helpers   session_pay_change_kind (the one classifier of these kinds),
--             _session_pay_tier, _session_ta_rows, the three trigger functions
--   entity    'session' of the 1b dispatcher: _money_plan__session /
--             _money_exec__session, ops unhold, hold, reteach, retime,
--             restaff, create. The dispatcher itself (1b) is NOT re-created:
--             its 'session' branch binds to these on first use.
--
-- WHAT IT REFUSES (person lane, i.e. a signed-in caller writing directly):
--   * Held -> Scheduled, always (HC020 kind=unhold);
--   * Scheduled -> Held when nobody took the register, after an earlier
--     un-hold, or in a locked payroll month (HC020 kind=hold);
--   * the teacher, the times or the assistants of a Held lesson, and the
--     teacher of a lesson that ended more than 7 days ago - except during
--     the free week (lesson ended 7 days ago or less AND its payroll month
--     open) (HC020 kind=reteach | retime | restaff);
--   * a lesson inserted with a status other than Scheduled (HC023), or
--     inserted after it has started (HC020 kind=create_past).
-- Each has its checked op through money_change_preview / money_change_checked
-- (1b), which writes one append-only money_change_overrides row.
--
-- THE SERVICE LANE (automation): un-hold is allowed only while the payroll
-- month is open AND (the lesson has not started, OR the Stars sync flipped it
-- (stars_sync_held_flips) and no Present / Late mark by a person remains);
-- otherwise the lesson is KEPT Held (NEW.status := OLD.status), one
-- automation_refused event is written, and nothing is raised (a raise inside
-- stars_sync__apply_event would abort the sync page for ever). Hold is
-- allowed. Teacher / time / assistant changes of a guarded lesson: HC020.
-- A lesson may be inserted on the service lane only if dated today or later.
-- THE OWNER LANE (SQL editor, cron SQL): passes; every pass a person would
-- have needed the checked path for writes one owner_lane event.
--
-- NOTHING IS PRICED. The pay tier is payroll_reach (1b: a locked month in
-- reach is T3); calculate-payroll stays the only place pay is worked out.
--
-- REPLACES NOTHING of D1, D2, D4 file 1 or file 2. No row is changed.
-- Safe to paste twice.
--
-- Rollback: scripts/ROLLBACK-d4-4-lesson-pay.sql (drops the three triggers),
-- then redeploy manage-session of before 3A.

BEGIN;

-- Fail fast instead of queueing behind a busy register: CREATE TRIGGER locks
-- sessions and session_participants. The paste stops within 5 seconds and
-- installs nothing.
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
    'public._lesson_in_free_week(date, time without time zone, time without time zone)',
    'public._money_ack(text[], uuid, uuid, date, date, integer)',
    'public._money_change_plan(text, text, jsonb, uuid)',
    'public._money_change_exec(text, jsonb, uuid)',
    'public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb)',
    'public.payroll_reach(uuid, uuid, date, date)',
    'public.tuition_reach(uuid[], uuid, date, date)',
    'public._session_change_assess(public.sessions, text, jsonb, uuid)',
    'public.session_change_kind(public.sessions, public.sessions)',
    'public.session_has_started(date, time without time zone)',
    'public.payroll_month_is_locked(text)',
    'public.student_enrolled_on(uuid, uuid, date)',
    'public.session_held_evidence(uuid)',
    'auth.uid()',
    'auth.role()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;
  IF to_regclass('public.money_change_overrides') IS NULL OR to_regclass('public.money_change_events') IS NULL THEN
    v_missing := v_missing || 'tables money_change_overrides / money_change_events (paste 20261114091000_d4_core_register first)'::text;
  END IF;
  -- The step 1a / 1b bodies this file relies on, as reviewed and as live
  -- (md5 of the text with CR removed: a paste may carry CRLF).
  FOR r IN SELECT * FROM (VALUES
      ('public._caller_lane()', '66001c3b6eb716a6380e4155fba75409'),
      ('public._lesson_in_free_week(date, time without time zone, time without time zone)', '4e8eac6021039710f90d12805c2c041d'),
      ('public._money_ack(text[], uuid, uuid, date, date, integer)', '471a55638387068f1279a2d7c669c4c4'),
      ('public._money_change_plan(text, text, jsonb, uuid)', '3efa9ebcb79c47c65947f2636e07edd0'),
      ('public._money_change_exec(text, jsonb, uuid)', 'b5efef0f546d40e397daa3fd0648db06'),
      ('public.payroll_reach(uuid, uuid, date, date)', '5ccecd82b3d859cb5ec37f4b0ac7973f')) AS t(sig, want)
  LOOP
    IF to_regprocedure(r.sig) IS NOT NULL
       AND (SELECT md5(replace(p.prosrc, E'\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig)) IS DISTINCT FROM r.want THEN
      v_missing := v_missing || ('function ' || r.sig || ' is not the reviewed step 1a/1b body (expected md5 ' || r.want || ')');
    END IF;
  END LOOP;
  FOR r IN
    SELECT * FROM (VALUES
      ('sessions',             ARRAY['id','class_id','date','start_time','end_time','status','teacher_id','updated_at',
                                     'updated_by','is_manual','manual_reason','notes','rate_override_vnd','created_by']),
      ('attendance',           ARRAY['session_id','student_id','status','marked_by']),
      ('session_participants', ARRAY['id','session_id','participant_type','teaching_assistant_id','teacher_id','attended','created_by']),
      ('enrollments',          ARRAY['class_id','student_id','start_date','end_date']),
      ('stars_sync_held_flips', ARRAY['session_id']),
      ('money_change_overrides', ARRAY['id','txid','entity','op','target_id','change','reason','tier']),
      ('money_change_events',  ARRAY['kind','payload'])
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'zz_session_change_guard_upd'
                    AND tgrelid = to_regclass('public.sessions')) THEN
    v_missing := v_missing || 'trigger zz_session_change_guard_upd on sessions (D2)'::text;
  END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_lesson_pay_guard cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the migrations that create these first (D1, D2, D4 files 1 and 2). Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- The one classifier of the pay-side kinds (design c.4). NULL = nothing of
-- ours. Raises HC022 for two of ours, or one of ours with a D2 kind.
--
-- The free week (design b.0, A-19): the lesson ended 7 days ago or less AND
-- its payroll month is open -> the teacher and the times are corrected with
-- no question. It does not apply to un-hold or hold.

CREATE OR REPLACE FUNCTION public.session_pay_change_kind(o public.sessions, n public.sessions)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kinds text[] := ARRAY[]::text[];
  v_locked boolean;
  v_free boolean;
  v_d2 text;
BEGIN
  IF o.id IS NULL OR n.id IS NULL THEN
    RETURN NULL;
  END IF;
  v_locked := COALESCE(public.payroll_month_is_locked(to_char(o.date, 'YYYY-MM')), true);
  v_free := NOT v_locked AND COALESCE(public._lesson_in_free_week(o.date, o.start_time, o.end_time), false);

  IF o.status = 'Held' AND n.status = 'Scheduled' THEN
    v_kinds := v_kinds || 'unhold'::text;
  END IF;
  IF o.status = 'Scheduled' AND n.status = 'Held'
     AND (NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = o.id AND a.marked_by IS NOT NULL)
          OR EXISTS (SELECT 1 FROM public.money_change_overrides mo
                      WHERE mo.entity = 'session' AND mo.op = 'unhold' AND mo.target_id = o.id)
          OR v_locked) THEN
    v_kinds := v_kinds || 'hold'::text;
  END IF;
  IF o.teacher_id IS DISTINCT FROM n.teacher_id AND NOT v_free
     AND (o.status = 'Held' OR NOT COALESCE(public._lesson_in_free_week(o.date, o.start_time, o.end_time), false)) THEN
    v_kinds := v_kinds || 'reteach'::text;
  END IF;
  IF o.status = 'Held' AND NOT v_free
     AND (o.start_time IS DISTINCT FROM n.start_time OR o.end_time IS DISTINCT FROM n.end_time)
     AND public.session_change_kind(o, n) IS NULL THEN
    v_kinds := v_kinds || 'retime'::text;
  END IF;

  IF cardinality(v_kinds) = 0 THEN
    RETURN NULL;
  END IF;
  v_d2 := public.session_change_kind(o, n);
  IF cardinality(v_kinds) > 1 OR v_d2 IS NOT NULL THEN
    RAISE EXCEPTION 'one change at a time' USING ERRCODE = 'HC022',
      DETAIL = 'kinds=' || array_to_string(v_kinds || CASE WHEN v_d2 IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_d2] END, ',');
  END IF;
  RETURN v_kinds[1];
END $fn$;

-- The assistants on a lesson (pay-relevant fields only), in one order.
CREATE OR REPLACE FUNCTION public._session_ta_rows(p_session_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('teaching_assistant_id', sp.teaching_assistant_id,
                                               'attended', COALESCE(sp.attended, true))
                            ORDER BY sp.teaching_assistant_id::text COLLATE "C"), '[]'::jsonb)
    FROM public.session_participants sp
   WHERE sp.session_id = p_session_id AND sp.participant_type = 'teaching_assistant'
     AND sp.teaching_assistant_id IS NOT NULL
$fn$;

-- The tier of one of our kinds (design c.4), from stored facts only.
--   unhold : D2's rule over the effective level (1a), settled including the
--            bill floor: _session_change_assess as for a cancel of the lesson.
--   hold   : T1; T3 in a locked payroll month.
--   reteach, retime, restaff : the pay tier (payroll_reach of everyone whose
--            pay the change moves), at least T1.
--   create : the tuition tier of the children enrolled that day (family-wide,
--            tuition_reach), at least T1.
-- Any error is T3.
CREATE OR REPLACE FUNCTION public._session_pay_tier(p_kind text, o public.sessions, n public.sessions)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_tier int := 3;
  v_kids uuid[];
  r record;
BEGIN
  BEGIN
    IF p_kind = 'unhold' THEN
      v_tier := (public._session_change_assess(o, 'cancel', NULL, NULL) ->> 'tier')::int;
    ELSIF p_kind = 'hold' THEN
      v_tier := CASE WHEN public.payroll_month_is_locked(to_char(o.date, 'YYYY-MM')) THEN 3 ELSE 1 END;
    ELSIF p_kind IN ('reteach', 'retime', 'restaff') THEN
      v_tier := GREATEST(1,
        COALESCE((public.payroll_reach(o.teacher_id, NULL, o.date, o.date) ->> 'tier')::int, 3),
        COALESCE((public.payroll_reach(n.teacher_id, NULL, o.date, o.date) ->> 'tier')::int, 3));
      FOR r IN SELECT (x ->> 'teaching_assistant_id')::uuid AS ta FROM jsonb_array_elements(public._session_ta_rows(o.id)) x LOOP
        v_tier := GREATEST(v_tier, COALESCE((public.payroll_reach(NULL, r.ta, o.date, o.date) ->> 'tier')::int, 3));
      END LOOP;
    ELSIF p_kind = 'create' THEN
      SELECT COALESCE(array_agg(DISTINCT e.student_id), ARRAY[]::uuid[]) INTO v_kids
        FROM public.enrollments e
       WHERE e.class_id = n.class_id AND public.student_enrolled_on(e.student_id, n.class_id, n.date);
      v_tier := GREATEST(1, COALESCE((public.tuition_reach(v_kids, n.class_id, n.date, n.date) ->> 'tier')::int, 3));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_tier := 3;
  END;
  IF v_tier IS NULL OR v_tier NOT BETWEEN 0 AND 3 THEN v_tier := 3; END IF;
  RETURN v_tier;
END $fn$;

-- The sentence each refusal carries (b.8: always with the next step).
CREATE OR REPLACE FUNCTION public._session_pay_sentence(p_kind text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE p_kind
    WHEN 'unhold'  THEN 'Change the status of a held lesson from the lesson''s Actions menu, with a reason. If the lesson did not happen, cancel it instead.'
    WHEN 'hold'    THEN 'Nobody has taken the register (or the payroll month is closed). Mark it Held from the lesson''s Actions menu, with a reason.'
    WHEN 'reteach' THEN 'Change the teacher of a held lesson from the lesson''s Actions menu, with a reason.'
    WHEN 'retime'  THEN 'Change the time of a held lesson from the lesson''s Actions menu, with a reason.'
    WHEN 'restaff' THEN 'Change the assistants of a held lesson from the lesson''s Actions menu, with a reason.'
    WHEN 'create_past' THEN 'This lesson has already started: add it from Add lesson, with a reason, then take the register.'
    ELSE 'Make this change from the lesson''s Actions menu, with a reason.' END
$fn$;

-- ---------------------------------------------------------------- 2
-- G-1, G-2, G-4, G-5: the trigger on sessions. It sorts after
-- update_sessions_updated_at, validate_session_status_trigger and 1a's
-- zz0_session_evidence_keep, and before D2's zz_session_change_guard_upd,
-- which never rewrites NEW: D2 judges the row this trigger leaves.

CREATE OR REPLACE FUNCTION public.session_pay_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_kind text;
  v_lane text;
  o public.money_change_overrides;
  v_locked boolean;
  v_started boolean;
  v_flips boolean;
  v_person_mark boolean;
BEGIN
  v_kind := public.session_pay_change_kind(OLD, NEW);
  IF v_kind IS NULL THEN
    RETURN NEW;
  END IF;

  -- Acknowledged by money_change_checked in this transaction: the op is this
  -- kind, for this lesson, and the write is exactly the one acknowledged.
  -- (The tier was re-checked by _money_exec__session under the row lock.)
  IF public._money_ack(ARRAY['session'], OLD.id, NULL, OLD.date, OLD.date, 0) THEN
    SELECT * INTO o FROM public.money_change_overrides ov
     WHERE ov.id::text = current_setting('hec.money_change_ack', true) AND ov.txid = txid_current();
    IF o.op = v_kind AND (
         (v_kind IN ('unhold', 'hold') AND NEW.status::text = o.change ->> 'new_status')
      OR (v_kind = 'reteach' AND NEW.teacher_id::text = o.change ->> 'new_teacher_id')
      OR (v_kind = 'retime' AND NEW.start_time = (o.change ->> 'new_start_time')::time
                            AND NEW.end_time = (o.change ->> 'new_end_time')::time)) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_lane := public._caller_lane();
  IF v_lane = 'owner' THEN
    INSERT INTO public.money_change_events (kind, payload)
    VALUES ('owner_lane', jsonb_build_object('table', 'sessions', 'kind', v_kind, 'session_id', OLD.id,
              'old', jsonb_build_object('status', OLD.status, 'teacher_id', OLD.teacher_id,
                                        'start_time', OLD.start_time, 'end_time', OLD.end_time),
              'new', jsonb_build_object('status', NEW.status, 'teacher_id', NEW.teacher_id,
                                        'start_time', NEW.start_time, 'end_time', NEW.end_time)));
    RETURN NEW;
  END IF;

  IF v_lane = 'service' THEN
    IF v_kind = 'hold' THEN
      RETURN NEW;                   -- both automatic flippers write the register first
    END IF;
    IF v_kind = 'unhold' THEN
      v_locked := COALESCE(public.payroll_month_is_locked(to_char(OLD.date, 'YYYY-MM')), true);
      v_started := COALESCE(public.session_has_started(OLD.date, OLD.start_time), true);
      v_flips := EXISTS (SELECT 1 FROM public.stars_sync_held_flips f WHERE f.session_id = OLD.id);
      v_person_mark := EXISTS (SELECT 1 FROM public.attendance a
                                WHERE a.session_id = OLD.id AND a.marked_by IS NOT NULL
                                  AND a.status IN ('Present', 'Late'));
      IF NOT v_locked AND (NOT v_started OR (v_flips AND NOT v_person_mark)) THEN
        RETURN NEW;
      END IF;
      -- Kept Held, recorded, not raised (a raise would abort a sync page).
      NEW.status := OLD.status;
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('automation_refused', jsonb_build_object('entity', 'session', 'kind', 'unhold', 'target_id', OLD.id,
                'source', 'zz2_session_pay_guard', 'kept', 'Held', 'payroll_month_locked', v_locked,
                'started', v_started, 'sync_flipped', v_flips, 'person_mark_remains', v_person_mark));
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
    DETAIL = 'kind=' || v_kind || '; ' || public._session_pay_sentence(v_kind);
END $fn$;

DROP TRIGGER IF EXISTS zz2_session_pay_guard ON public.sessions;
CREATE TRIGGER zz2_session_pay_guard BEFORE UPDATE ON public.sessions FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
     OR OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time)
  EXECUTE FUNCTION public.session_pay_guard();

-- ---------------------------------------------------------------- 3
-- G-3 and G-7: a lesson is born Scheduled, and a lesson that has already
-- started is created only through the checked op ('session','create').

CREATE OR REPLACE FUNCTION public._session_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_lane text;
  o public.money_change_overrides;
BEGIN
  -- An upsert's BEFORE INSERT fires before ON CONFLICT is resolved: when the
  -- row already exists (by id, or the class's slot), the UPDATE branch - and
  -- its guards - judge the real change (R-4's rule for lessons).
  PERFORM 1 FROM public.sessions s
   WHERE s.id = NEW.id
      OR (s.class_id = NEW.class_id AND s.date = NEW.date AND s.start_time = NEW.start_time AND s.status <> 'Canceled')
   FOR UPDATE;
  IF FOUND THEN
    RETURN NEW;
  END IF;

  v_lane := public._caller_lane();
  IF NEW.status IS DISTINCT FROM 'Scheduled' THEN
    IF v_lane = 'owner' THEN
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('owner_lane', jsonb_build_object('table', 'sessions', 'kind', 'born_status', 'class_id', NEW.class_id,
                                               'date', NEW.date, 'start_time', NEW.start_time, 'status', NEW.status));
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'session_born_status' USING ERRCODE = 'HC023',
      DETAIL = 'kind=born_status; A lesson is created as Scheduled. Create it, then take the register.';
  END IF;

  IF NOT COALESCE(public.session_has_started(NEW.date, NEW.start_time), true) THEN
    RETURN NEW;
  END IF;

  -- started: G-7
  IF public._money_ack(ARRAY['session'], NEW.class_id, NULL, NEW.date, NEW.date, 0) THEN
    SELECT * INTO o FROM public.money_change_overrides ov
     WHERE ov.id::text = current_setting('hec.money_change_ack', true) AND ov.txid = txid_current();
    IF o.op = 'create' AND o.change ->> 'date' = NEW.date::text
       AND (o.change ->> 'start_time')::time = NEW.start_time AND (o.change ->> 'end_time')::time = NEW.end_time
       AND o.change ->> 'teacher_id' = NEW.teacher_id::text THEN
      RETURN NEW;
    END IF;
  END IF;
  IF v_lane = 'owner' THEN
    INSERT INTO public.money_change_events (kind, payload)
    VALUES ('owner_lane', jsonb_build_object('table', 'sessions', 'kind', 'create_past', 'class_id', NEW.class_id,
                                             'date', NEW.date, 'start_time', NEW.start_time));
    RETURN NEW;
  END IF;
  IF v_lane = 'service' AND NEW.date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
    DETAIL = 'kind=create_past; ' || public._session_pay_sentence('create_past');
END $fn$;

DROP TRIGGER IF EXISTS zz_session_insert_guard ON public.sessions;
CREATE TRIGGER zz_session_insert_guard BEFORE INSERT ON public.sessions FOR EACH ROW
  EXECUTE FUNCTION public._session_insert_guard();

-- ---------------------------------------------------------------- 4
-- G-6: the assistants of a Held lesson. Pay-relevant: a teaching-assistant
-- row added or removed, or its lesson, type, person or `attended` changed.
-- Trigger-made writes (standing assistants on a new lesson, cascades) are
-- not judged. Free week as G-4.

CREATE OR REPLACE FUNCTION public._session_staff_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ta boolean;
  v_lane text;
  s record;
  o public.money_change_overrides;
  v_ok boolean;
  v_ids uuid[];
  v_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  v_ta := (TG_OP <> 'INSERT' AND (OLD.participant_type = 'teaching_assistant' OR OLD.teaching_assistant_id IS NOT NULL))
       OR (TG_OP <> 'DELETE' AND (NEW.participant_type = 'teaching_assistant' OR NEW.teaching_assistant_id IS NOT NULL));
  IF NOT v_ta THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.session_id IS NOT DISTINCT FROM NEW.session_id
     AND OLD.participant_type IS NOT DISTINCT FROM NEW.participant_type
     AND OLD.teaching_assistant_id IS NOT DISTINCT FROM NEW.teaching_assistant_id
     AND OLD.teacher_id IS NOT DISTINCT FROM NEW.teacher_id
     AND OLD.attended IS NOT DISTINCT FROM NEW.attended THEN
    RETURN NEW;                                   -- the absence note, the creator: not pay
  END IF;

  v_ids := ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[CASE WHEN TG_OP <> 'INSERT' THEN OLD.session_id END,
                                                     CASE WHEN TG_OP <> 'DELETE' THEN NEW.session_id END]) x
                  WHERE x IS NOT NULL ORDER BY x);
  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT ss.id, ss.date, ss.start_time, ss.end_time, ss.status INTO s FROM public.sessions ss WHERE ss.id = v_id;
    IF NOT FOUND OR s.status <> 'Held' THEN
      CONTINUE;
    END IF;
    IF NOT COALESCE(public.payroll_month_is_locked(to_char(s.date, 'YYYY-MM')), true)
       AND COALESCE(public._lesson_in_free_week(s.date, s.start_time, s.end_time), false) THEN
      CONTINUE;
    END IF;
    -- acknowledged restaff of this lesson, and this row is one the change writes
    v_ok := false;
    IF public._money_ack(ARRAY['session'], s.id, NULL, s.date, s.date, 0) THEN
      SELECT * INTO o FROM public.money_change_overrides ov
       WHERE ov.id::text = current_setting('hec.money_change_ack', true) AND ov.txid = txid_current();
      IF o.op = 'restaff' THEN
        IF TG_OP = 'DELETE' THEN
          v_ok := OLD.session_id = s.id AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(o.change -> 'after') a
             WHERE a ->> 'teaching_assistant_id' = OLD.teaching_assistant_id::text);
        ELSE
          v_ok := NEW.session_id = s.id AND NEW.participant_type = 'teaching_assistant'
            AND (TG_OP = 'INSERT' OR (OLD.session_id = NEW.session_id
                                      AND OLD.participant_type IS NOT DISTINCT FROM NEW.participant_type
                                      AND OLD.teaching_assistant_id IS NOT DISTINCT FROM NEW.teaching_assistant_id
                                      AND OLD.teacher_id IS NOT DISTINCT FROM NEW.teacher_id))
            AND EXISTS (SELECT 1 FROM jsonb_array_elements(o.change -> 'after') a
                         WHERE a ->> 'teaching_assistant_id' = NEW.teaching_assistant_id::text
                           AND (a ->> 'attended')::boolean IS NOT DISTINCT FROM COALESCE(NEW.attended, true));
        END IF;
      END IF;
    END IF;
    IF v_ok THEN
      CONTINUE;
    END IF;
    v_lane := public._caller_lane();
    IF v_lane = 'owner' THEN
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('owner_lane', jsonb_build_object('table', 'session_participants', 'kind', 'restaff', 'session_id', s.id,
                'op', TG_OP,
                'old', CASE WHEN TG_OP <> 'INSERT' THEN jsonb_build_object('teaching_assistant_id', OLD.teaching_assistant_id, 'attended', OLD.attended) END,
                'new', CASE WHEN TG_OP <> 'DELETE' THEN jsonb_build_object('teaching_assistant_id', NEW.teaching_assistant_id, 'attended', NEW.attended) END));
      CONTINUE;
    END IF;
    RAISE EXCEPTION 'session_change_requires_checked_path' USING ERRCODE = 'HC020',
      DETAIL = 'kind=restaff; ' || public._session_pay_sentence('restaff');
  END LOOP;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $fn$;

DROP TRIGGER IF EXISTS zz_session_staff_guard ON public.session_participants;
CREATE TRIGGER zz_session_staff_guard BEFORE INSERT OR UPDATE OR DELETE ON public.session_participants
  FOR EACH ROW EXECUTE FUNCTION public._session_staff_guard();

-- ---------------------------------------------------------------- 5
-- The 'session' entity: plan (what the admin is shown, what the token covers)
-- and exec (the write, under the lesson's row lock, re-planned there).

CREATE OR REPLACE FUNCTION public._money_plan__session(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s public.sessions;
  n public.sessions;
  v_sid uuid;
  v_kind text;
  v_tier int := 0;
  v_refuse text;
  v_change jsonb;
  v_before jsonb;
  v_evidence jsonb := NULL;
  v_inv jsonb := '[]'::jsonb;
  v_pairs jsonb := '[]'::jsonb;
  v_kids uuid[] := ARRAY[]::uuid[];
  v_locked boolean;
  v_fp text;
  v_impact jsonb;
  v_a jsonb;
  v_r jsonb;
  v_t uuid;
  v_start time;
  v_end time;
  v_date date;
  v_class uuid;
  v_after jsonb;
  v_target uuid;
  v_month text;
BEGIN
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' THEN
    RETURN jsonb_build_object('refuse_code', 'bad_args');
  END IF;
  IF p_op IS NULL OR p_op NOT IN ('unhold', 'hold', 'reteach', 'retime', 'restaff', 'create') THEN
    RETURN jsonb_build_object('refuse_code', 'bad_op');
  END IF;

  IF p_op = 'create' THEN
    BEGIN
      v_class := (p_args ->> 'class_id')::uuid;
      v_date := (p_args ->> 'date')::date;
      v_start := (p_args ->> 'start_time')::time;
      v_end := (p_args ->> 'end_time')::time;
      v_t := (p_args ->> 'teacher_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_class := NULL; END;
    IF v_class IS NULL OR v_date IS NULL OR v_start IS NULL OR v_end IS NULL OR v_t IS NULL OR v_end <= v_start THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    n.id := '00000000-0000-0000-0000-000000000000'::uuid;
    n.class_id := v_class; n.date := v_date; n.start_time := v_start; n.end_time := v_end; n.teacher_id := v_t;
    n.status := 'Scheduled';
    v_target := v_class;
    v_month := to_char(v_date, 'YYYY-MM');
    v_locked := COALESCE(public.payroll_month_is_locked(v_month), true);
    SELECT COALESCE(array_agg(DISTINCT e.student_id ORDER BY e.student_id), ARRAY[]::uuid[]) INTO v_kids
      FROM public.enrollments e
     WHERE e.class_id = v_class AND public.student_enrolled_on(e.student_id, v_class, v_date);
    v_r := public.tuition_reach(v_kids, v_class, v_date, v_date);
    IF COALESCE(public.session_has_started(v_date, v_start), true) THEN
      v_kind := 'create';
      v_tier := public._session_pay_tier('create', n, n);
    END IF;
    v_inv := COALESCE(v_r -> 'invoices_before', '[]'::jsonb);
    -- the children who will be marked Present (the seed) and billed
    v_pairs := (SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', k, 'month', v_month) ORDER BY k::text COLLATE "C"), '[]'::jsonb)
                  FROM unnest(v_kids) k);
    v_before := jsonb_build_object('lessons_that_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', x.id, 'start_time', x.start_time, 'end_time', x.end_time,
                                                   'status', x.status, 'teacher_id', x.teacher_id)
                                ORDER BY x.start_time, x.id::text COLLATE "C"), '[]'::jsonb)
        FROM public.sessions x WHERE x.class_id = v_class AND x.date = v_date));
    v_change := jsonb_build_object('class_id', v_class, 'date', v_date, 'start_time', to_char(v_start, 'HH24:MI:SS'),
                  'end_time', to_char(v_end, 'HH24:MI:SS'), 'teacher_id', v_t,
                  'notes', NULLIF(p_args ->> 'notes', ''),
                  'rate_override_vnd', CASE WHEN (p_args ->> 'rate_override_vnd') ~ '^[0-9]{1,9}$' THEN (p_args ->> 'rate_override_vnd')::int END,
                  'started', v_kind IS NOT NULL,
                  'children_marked_present', to_jsonb(v_kids));
    v_fp := md5(COALESCE(v_r ->> 'fp', '') || v_change::text || v_before::text);
    v_impact := COALESCE(v_r -> 'impact', '{}'::jsonb) || jsonb_build_object('tier', v_tier, 'closed_payroll', v_locked);
    RETURN jsonb_build_object(
      'entity', 'session', 'op', p_op, 'kind', v_kind, 'args', p_args, 'target_id', v_target,
      'student_ids', to_jsonb(v_kids), 'row_before', v_before, 'change', v_change,
      'reach_from', v_date, 'reach_to', v_date,
      'reach', jsonb_build_object('tuition', v_r -> 'pairs', 'fp', v_fp),
      'tier', v_tier, 'refuse_code', v_refuse, 'evidence', NULL,
      'invoices_before', v_inv, 'refresh_pairs', v_pairs,
      'impact', v_impact);
  END IF;

  -- every other op names one lesson
  BEGIN
    v_sid := (p_args ->> 'session_id')::uuid;
  EXCEPTION WHEN OTHERS THEN v_sid := NULL; END;
  IF v_sid IS NULL THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
  SELECT * INTO s FROM public.sessions WHERE id = v_sid;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
  n := s;
  v_target := s.id;
  v_locked := COALESCE(public.payroll_month_is_locked(to_char(s.date, 'YYYY-MM')), true);
  v_before := jsonb_build_object('session', to_jsonb(s), 'participants', public._session_ta_rows(s.id));
  IF s.status = 'Canceled' THEN v_refuse := 'lesson_canceled'; END IF;

  IF p_op = 'unhold' THEN
    IF v_refuse IS NULL AND s.status <> 'Held' THEN v_refuse := 'bad_change'; END IF;
    n.status := 'Scheduled';
    v_change := jsonb_build_object('session_id', s.id, 'old_status', s.status, 'new_status', 'Scheduled');
  ELSIF p_op = 'hold' THEN
    IF v_refuse IS NULL AND (s.status <> 'Scheduled' OR NOT COALESCE(public.session_has_started(s.date, s.start_time), false)) THEN
      v_refuse := 'bad_change';
    END IF;
    n.status := 'Held';
    v_change := jsonb_build_object('session_id', s.id, 'old_status', s.status, 'new_status', 'Held');
  ELSIF p_op = 'reteach' THEN
    BEGIN
      v_t := (p_args ->> 'teacher_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_t := NULL; END;
    IF v_t IS NULL THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
    IF v_refuse IS NULL AND v_t = s.teacher_id THEN v_refuse := 'nothing_to_change'; END IF;
    n.teacher_id := v_t;
    v_change := jsonb_build_object('session_id', s.id, 'old_teacher_id', s.teacher_id, 'new_teacher_id', v_t,
                  'minutes', (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 60)::int);
  ELSIF p_op = 'retime' THEN
    BEGIN
      v_start := (p_args ->> 'start_time')::time;
      v_end := (p_args ->> 'end_time')::time;
    EXCEPTION WHEN OTHERS THEN v_start := NULL; END;
    IF v_start IS NULL OR v_end IS NULL THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
    IF v_refuse IS NULL AND v_end <= v_start THEN v_refuse := 'bad_change'; END IF;
    IF v_refuse IS NULL AND v_start = s.start_time AND v_end = s.end_time THEN v_refuse := 'nothing_to_change'; END IF;
    n.start_time := v_start; n.end_time := v_end;
    -- a change D2 calls a move (a lesson made "not started") goes through Move
    IF v_refuse IS NULL AND public.session_change_kind(s, n) IS NOT NULL THEN v_refuse := 'bad_change'; END IF;
    v_change := jsonb_build_object('session_id', s.id,
                  'old_start_time', to_char(s.start_time, 'HH24:MI:SS'), 'old_end_time', to_char(s.end_time, 'HH24:MI:SS'),
                  'new_start_time', to_char(v_start, 'HH24:MI:SS'), 'new_end_time', to_char(v_end, 'HH24:MI:SS'),
                  'old_minutes', (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 60)::int,
                  'new_minutes', (EXTRACT(EPOCH FROM (v_end - v_start)) / 60)::int);
  ELSIF p_op = 'restaff' THEN
    IF p_args -> 'participants' IS NULL OR jsonb_typeof(p_args -> 'participants') <> 'array'
       OR jsonb_array_length(p_args -> 'participants') > 20
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_args -> 'participants') x
                   WHERE jsonb_typeof(x) <> 'object'
                      OR COALESCE(x ->> 'teaching_assistant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      OR (x ? 'attended' AND jsonb_typeof(x -> 'attended') <> 'boolean'))
       OR (SELECT count(DISTINCT lower(x ->> 'teaching_assistant_id')) FROM jsonb_array_elements(p_args -> 'participants') x)
          <> jsonb_array_length(p_args -> 'participants') THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    v_after := (SELECT COALESCE(jsonb_agg(jsonb_build_object('teaching_assistant_id', lower(x ->> 'teaching_assistant_id')::uuid,
                                                             'attended', COALESCE((x ->> 'attended')::boolean, true))
                                          ORDER BY lower(x ->> 'teaching_assistant_id')), '[]'::jsonb)
                  FROM jsonb_array_elements(p_args -> 'participants') x);
    IF v_refuse IS NULL AND v_after = v_before -> 'participants' THEN v_refuse := 'nothing_to_change'; END IF;
    v_change := jsonb_build_object('session_id', s.id, 'before', v_before -> 'participants', 'after', v_after);
  END IF;

  -- the kind as the trigger will see it (NULL = free: the week, an open month)
  IF v_refuse IS NULL THEN
    IF p_op = 'restaff' THEN
      v_kind := CASE WHEN s.status = 'Held'
                      AND NOT (NOT v_locked AND COALESCE(public._lesson_in_free_week(s.date, s.start_time, s.end_time), false))
                     THEN 'restaff' END;
    ELSE
      v_kind := public.session_pay_change_kind(s, n);
    END IF;
    IF v_kind IS NOT NULL THEN
      v_tier := public._session_pay_tier(v_kind, s, n);
      IF p_op = 'restaff' THEN
        SELECT GREATEST(v_tier, COALESCE(max((public.payroll_reach(NULL, (x ->> 'teaching_assistant_id')::uuid, s.date, s.date) ->> 'tier')::int), 0))
          INTO v_tier FROM jsonb_array_elements(v_after) x;
      END IF;
    END IF;
  END IF;

  -- what the admin is shown: for un-hold the lesson's evidence (D1, the
  -- floor, the bills D2's assessment reads); for the others who is paid
  IF p_op = 'unhold' AND v_refuse IS NULL THEN
    v_a := public._session_change_assess(s, 'cancel', NULL, p_uid);
    v_evidence := jsonb_build_object('d1', v_a -> 'evidence', 'level', v_a ->> 'level', 'level_now', v_a ->> 'level_now',
                                     'floor', v_a -> 'floor', 'settled_any', v_a -> 'settled_any', 'started', v_a -> 'started',
                                     'affected', v_a -> 'affected');
    v_inv := COALESCE(v_a -> 'invoices_before', '[]'::jsonb);
    v_kids := ARRAY(SELECT DISTINCT (x ->> 'student_id')::uuid FROM jsonb_array_elements(COALESCE(v_a -> 'affected', '[]'::jsonb)) x);
    v_fp := md5(COALESCE(v_a ->> 'fingerprint', '') || v_before::text);
    v_impact := jsonb_build_object('tier', v_tier, 'closed_payroll', v_locked,
                                   'families', COALESCE((v_a -> 'impact' ->> 'families')::int, 0),
                                   'paid_vnd', COALESCE((v_a -> 'impact' ->> 'paid_vnd')::numeric, 0));
  ELSE
    v_evidence := jsonb_build_object(
      'person_marks', (SELECT count(*)::int FROM public.attendance a WHERE a.session_id = s.id AND a.marked_by IS NOT NULL),
      'unheld_before', EXISTS (SELECT 1 FROM public.money_change_overrides mo
                                WHERE mo.entity = 'session' AND mo.op = 'unhold' AND mo.target_id = s.id),
      'payroll_month_locked', v_locked,
      'free_week', NOT v_locked AND COALESCE(public._lesson_in_free_week(s.date, s.start_time, s.end_time), false),
      'teacher_id', s.teacher_id);
    v_fp := md5(v_before::text || v_evidence::text);
    v_impact := jsonb_build_object('tier', v_tier, 'closed_payroll', v_locked, 'families', 0, 'paid_vnd', 0);
  END IF;

  RETURN jsonb_build_object(
    'entity', 'session', 'op', p_op, 'kind', v_kind, 'args', p_args, 'target_id', v_target,
    'student_ids', to_jsonb(v_kids), 'row_before', v_before, 'change', v_change,
    'reach_from', s.date, 'reach_to', s.date,
    'reach', jsonb_build_object('payroll_month', to_char(s.date, 'YYYY-MM'), 'payroll_month_locked', v_locked, 'fp', v_fp),
    'tier', v_tier, 'refuse_code', v_refuse, 'evidence', v_evidence,
    -- a lesson's status, teacher, times and assistants do not change a bill
    -- (calculate-tuition counts Scheduled and Held alike): nothing to refresh
    'invoices_before', v_inv, 'refresh_pairs', '[]'::jsonb,
    'impact', v_impact,
    'lock_session_ids', jsonb_build_array(s.id));
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__session(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_op text := p_plan ->> 'op';
  v_change jsonb := p_plan -> 'change';
  s public.sessions;
  v_now jsonb;
  v_reason text;
  v_n int := 0;
  c int;
  x jsonb;
  v_id uuid;
BEGIN
  -- the lesson's row first (D2's lock order), then the plan again under it:
  -- the row must be the one previewed, and the tier no higher (A-8)
  IF v_op <> 'create' THEN
    SELECT * INTO s FROM public.sessions WHERE id = (p_plan ->> 'target_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
    IF v_op = 'restaff' THEN
      PERFORM 1 FROM public.session_participants WHERE session_id = s.id ORDER BY id FOR UPDATE;
    END IF;
  END IF;
  v_now := public._money_plan__session(v_op, p_plan -> 'args', p_uid);
  IF v_now ->> 'refuse_code' IS NOT NULL THEN
    RAISE EXCEPTION '%', v_now ->> 'refuse_code' USING ERRCODE = 'HC015';
  END IF;
  IF v_now -> 'row_before' IS DISTINCT FROM p_plan -> 'row_before'
     OR COALESCE((v_now ->> 'tier')::int, 3) > COALESCE((p_plan ->> 'tier')::int, 0) THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011',
      DETAIL = 'The lesson, its assistants or the tier changed after the preview. Preview again.';
  END IF;
  SELECT o.reason INTO v_reason FROM public.money_change_overrides o
   WHERE o.id::text = current_setting('hec.money_change_ack', true) AND o.txid = txid_current();

  IF v_op = 'unhold' OR v_op = 'hold' THEN
    UPDATE public.sessions SET status = (v_change ->> 'new_status')::public.session_status, updated_by = p_uid WHERE id = s.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  ELSIF v_op = 'reteach' THEN
    -- is_manual: a Held lesson is never rebuilt; this keeps the rebuild off a
    -- re-taught future one too. No schedule meaning beyond that.
    UPDATE public.sessions
       SET teacher_id = (v_change ->> 'new_teacher_id')::uuid, updated_by = p_uid,
           is_manual = true, manual_reason = COALESCE(v_reason, 'Teacher changed (checked)')
     WHERE id = s.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  ELSIF v_op = 'retime' THEN
    UPDATE public.sessions
       SET start_time = (v_change ->> 'new_start_time')::time, end_time = (v_change ->> 'new_end_time')::time,
           updated_by = p_uid
     WHERE id = s.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  ELSIF v_op = 'restaff' THEN
    DELETE FROM public.session_participants sp
     WHERE sp.session_id = s.id AND sp.participant_type = 'teaching_assistant'
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_change -> 'after') a
                        WHERE a ->> 'teaching_assistant_id' = sp.teaching_assistant_id::text);
    GET DIAGNOSTICS c = ROW_COUNT; v_n := v_n + c;
    FOR x IN SELECT a FROM jsonb_array_elements(v_change -> 'after') a LOOP
      UPDATE public.session_participants
         SET attended = (x ->> 'attended')::boolean
       WHERE session_id = s.id AND participant_type = 'teaching_assistant'
         AND teaching_assistant_id = (x ->> 'teaching_assistant_id')::uuid
         AND attended IS DISTINCT FROM (x ->> 'attended')::boolean;
      GET DIAGNOSTICS c = ROW_COUNT; v_n := v_n + c;
      IF NOT EXISTS (SELECT 1 FROM public.session_participants
                      WHERE session_id = s.id AND teaching_assistant_id = (x ->> 'teaching_assistant_id')::uuid) THEN
        INSERT INTO public.session_participants (session_id, participant_type, teaching_assistant_id, attended, created_by)
        VALUES (s.id, 'teaching_assistant', (x ->> 'teaching_assistant_id')::uuid, (x ->> 'attended')::boolean, p_uid);
        v_n := v_n + 1;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('written', v_n, 'session_id', s.id, 'guard_trigger', 'session_participants.zz_session_staff_guard');
  ELSIF v_op = 'create' THEN
    INSERT INTO public.sessions (class_id, date, start_time, end_time, teacher_id, status, notes, rate_override_vnd,
                                 is_manual, manual_reason, created_by)
    VALUES ((v_change ->> 'class_id')::uuid, (v_change ->> 'date')::date, (v_change ->> 'start_time')::time,
            (v_change ->> 'end_time')::time, (v_change ->> 'teacher_id')::uuid, 'Scheduled', v_change ->> 'notes',
            (v_change ->> 'rate_override_vnd')::int, true, COALESCE(v_reason, 'Admin ad-hoc creation'), p_uid)
    RETURNING id INTO v_id;
    RETURN jsonb_build_object('written', 1, 'session_id', v_id, 'guard_trigger', 'sessions.zz_session_insert_guard');
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  RETURN jsonb_build_object('written', v_n, 'session_id', s.id, 'guard_trigger', 'sessions.zz2_session_pay_guard');
END $fn$;

-- ---------------------------------------------------------------- 6
-- Grants: none of these is an RPC (the checked path is 1b's
-- money_change_preview / money_change_checked). Nobody may call them.

REVOKE ALL ON FUNCTION
  public.session_pay_change_kind(public.sessions, public.sessions),
  public._session_ta_rows(uuid),
  public._session_pay_tier(text, public.sessions, public.sessions),
  public._session_pay_sentence(text),
  public.session_pay_guard(),
  public._session_insert_guard(),
  public._session_staff_guard(),
  public._money_plan__session(text, jsonb, uuid),
  public._money_exec__session(jsonb, uuid)
FROM PUBLIC, anon, authenticated, service_role;

-- "Guard on since".
INSERT INTO public.money_change_events (kind, payload)
VALUES ('guard_installed', jsonb_build_object('migration', '20261114093000_d4_lesson_pay_guard'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(c.relname || '.' || t.tgname || '=' || t.tgenabled::text, ', ' ORDER BY c.relname, t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname IN ('zz2_session_pay_guard', 'zz_session_insert_guard', 'zz_session_staff_guard')) AS lesson_pay_guard_triggers,
  (SELECT count(*) FROM public.money_change_events WHERE kind = 'guard_installed')               AS installs;
