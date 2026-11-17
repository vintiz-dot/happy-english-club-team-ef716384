-- Lesson monitor PILOT, Option A (docs/LESSON_MONITOR_DESIGN.md, owner's
-- decision D-28: one class, one teacher, four weeks, teacher only, nothing to
-- families). Runbook: docs/LESSON_MONITOR_PILOT_RUNBOOK.md.
--
-- The report is made OVERNIGHT ON THE SCHOOL LAPTOP (scripts/lesson-monitor/):
-- a signed-in person (an admin, or the class's teacher) downloads the class
-- recorder's audio under the recorder's own RLS, transcribes it locally, and
-- saves the finished report here. Nothing in this file processes audio, calls
-- a vendor or runs as the service role.
--
-- WHAT THIS ADDS
--   lesson_monitor_settings        one row: the monitor's consent wording version.
--   lesson_monitor_child_consents  one row per child: the monitor's OWN consent
--                                  lines (transcription, where it runs, who reads
--                                  it), separate from the recorder's. Admin only.
--   lesson_monitor_classes         the pilot switch, per class. ON: an admin, the
--                                  current wording, where the forms are, every
--                                  enrolled child granted, an end date (four
--                                  weeks). OFF (the kill switch): an admin or a
--                                  teacher of the class; stopping needs no permission.
--   lesson_monitor_reports         one report per recording, readable ONLY by the
--                                  teacher of that lesson, for 30 days after it.
--                                  No admin, family, student or TA policy.
--   lesson_monitor_targets         a lesson's target words, typed by its teacher.
--   lesson_monitor_runs            what the job did with each recording (codes
--                                  only, no content), so nothing is done twice.
--   lesson_monitor_audit           append-only: who did what, ids and counts.
--
-- RULES IT HOLDS
--   1. A report is read only by `teacher_user_id`, which the SERVER sets from the
--      lesson's teacher; the caller cannot choose it. The reader must also still
--      be allowed to listen to that recording (recorder_can_listen), and the
--      lesson must be at most 30 days old. An admin who is not that teacher
--      reads none of it (the design leaves admins at "report made / read").
--   2. No write grant on any table: every write is a function that checks the
--      caller, the class switch and consent again. No family, student or TA
--      path exists to any of it.
--   3. A class is processed only while every child ENROLLED ON THE LESSON'S DATE
--      or MARKED PRESENT/LATE at that lesson (a visitor, a trial child) holds the
--      monitor consent under the current wording; a child with no consent row
--      counts as NOT consented. A withdrawal switches off the classes the child
--      is in today and deletes the child's reports in EVERY lesson they were
--      enrolled in or marked present at, even after they left the class (the
--      report holds no child ids, so the lesson's roster is how they are found).
--   3b. Expiry happens on the server: a pg_cron job (where pg_cron exists) and,
--      as a fallback, every write function purges expired reports first.
--      Local copies on the laptop are checked against the server by
--      lesson_monitor_keep_check / lesson_monitor_may_continue.
--   4. Nothing names a child: the report body may not carry a student id or
--      name field; the screen shows a transcript, never a per-child figure.
--
-- Depends on 20261112100000_class_recorder.sql (recorder_can_listen,
-- recorder_is_class_teacher, recorder_can_read_class, class_recordings).
-- Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.class_recordings') IS NULL
     OR to_regprocedure('public.recorder_can_listen(uuid,uuid)') IS NULL
     OR to_regprocedure('public.recorder_is_class_teacher(uuid,uuid)') IS NULL
     OR to_regprocedure('public.recorder_can_read_class(uuid)') IS NULL
     OR to_regclass('public.attendance') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install the lesson monitor pilot: the class recorder (20261112100000) is not installed';
  END IF;
END
$pre$;

-- ================================================================ tables
CREATE TABLE IF NOT EXISTS public.lesson_monitor_settings (
  id                      smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  consent_wording_version text NOT NULL DEFAULT 'monitor-v1-2026-11'
                          CHECK (consent_wording_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  report_days             integer NOT NULL DEFAULT 30 CHECK (report_days BETWEEN 1 AND 30),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by              uuid
);
INSERT INTO public.lesson_monitor_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lesson_monitor_child_consents (
  student_id      uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  status          text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  wording_version text NOT NULL,
  note            text NOT NULL CHECK (btrim(note) <> '' AND char_length(note) <= 300),
  recorded_by     uuid NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_classes (
  class_id                uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  enabled                 boolean NOT NULL DEFAULT false,
  -- The ONE teacher of the pilot (teachers.id). Only lessons this teacher
  -- taught are processed: a cover teacher was not asked (design s.6).
  teacher_id              uuid,
  consent_wording_version text,
  consent_note            text,
  enabled_by              uuid,
  enabled_at              timestamptz,
  starts_on               date,
  ends_on                 date,
  stopped_by              uuid,
  stopped_at              timestamptz,
  stop_reason             text CHECK (stop_reason IS NULL OR char_length(stop_reason) <= 200),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_monitor_on_needs_consent CHECK (
    NOT enabled OR (
      teacher_id IS NOT NULL AND consent_wording_version IS NOT NULL AND enabled_by IS NOT NULL AND enabled_at IS NOT NULL
      AND btrim(COALESCE(consent_note, '')) <> ''
      AND starts_on IS NOT NULL AND ends_on IS NOT NULL
      AND ends_on >= starts_on AND ends_on <= starts_on + 42))
);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Plain UNIQUE: one report per recording, ever (a second save is refused).
  recording_id     uuid NOT NULL UNIQUE REFERENCES public.class_recordings(id) ON DELETE CASCADE,
  class_id         uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id       uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  session_date     date NOT NULL,
  -- Whose report it is. Set by lesson_monitor_save_report from the lesson's
  -- teacher, never by the caller.
  teacher_user_id  uuid NOT NULL,
  made_by          uuid NOT NULL,
  made_at          timestamptz NOT NULL DEFAULT now(),
  job_version      text NOT NULL CHECK (job_version ~ '^[A-Za-z0-9._+-]{1,40}$'),
  body             jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object'),
  -- The teacher's own feedback, for the pilot's stop rules (design s.8, s.12).
  first_opened_at  timestamptz,
  reading_minutes  integer CHECK (reading_minutes IS NULL OR reading_minutes BETWEEN 0 AND 240),
  used_something   text CHECK (used_something IS NULL OR used_something IN ('yes', 'no', 'not_sure')),
  feedback_at      timestamptz
);
CREATE INDEX IF NOT EXISTS lesson_monitor_reports_teacher_idx ON public.lesson_monitor_reports (teacher_user_id, session_date);
CREATE INDEX IF NOT EXISTS lesson_monitor_reports_class_idx ON public.lesson_monitor_reports (class_id, session_date);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_targets (
  session_id  uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  words       text[] NOT NULL DEFAULT '{}' CHECK (cardinality(words) <= 40),
  structures  text[] NOT NULL DEFAULT '{}' CHECK (cardinality(structures) <= 10),
  set_by      uuid NOT NULL,
  set_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_runs (
  recording_id        uuid PRIMARY KEY REFERENCES public.class_recordings(id) ON DELETE CASCADE,
  class_id            uuid NOT NULL,
  outcome             text NOT NULL CHECK (outcome IN ('report_made', 'refused', 'failed')),
  reason              text CHECK (reason IS NULL OR reason ~ '^[a-z0-9_]{1,40}$'),
  by_user             uuid NOT NULL,
  at                  timestamptz NOT NULL DEFAULT now(),
  audio_seconds       integer CHECK (audio_seconds IS NULL OR audio_seconds BETWEEN 0 AND 30000),
  processing_seconds  integer CHECK (processing_seconds IS NULL OR processing_seconds BETWEEN 0 AND 200000)
);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_audit (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  actor        uuid,
  action       text NOT NULL CHECK (action IN (
                 'switch_on', 'switch_off', 'switch_off_auto', 'consent_granted', 'consent_withdrawn',
                 'audio_download', 'report_saved', 'run_recorded', 'report_opened', 'report_feedback',
                 'report_deleted', 'reports_expired', 'targets_set', 'delete_everything', 'settings_changed')),
  -- No foreign keys: the log outlives what it describes. Ids and counts only.
  class_id     uuid,
  recording_id uuid,
  report_id    uuid,
  student_id   uuid,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.lesson_monitor__audit_is_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- The one exception: delete_everything clears WHO (student_id) from old rows, keeping counts and dates.
  IF TG_OP = 'UPDATE' AND current_setting('lesson_monitor.scrub', true) = 'on'
     AND NEW.student_id IS NULL AND (to_jsonb(NEW) - 'student_id') = (to_jsonb(OLD) - 'student_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'lesson_monitor_audit is append-only: % is refused', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor__audit_is_append_only() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lesson_monitor_audit_no_change ON public.lesson_monitor_audit;
CREATE TRIGGER lesson_monitor_audit_no_change BEFORE UPDATE OR DELETE ON public.lesson_monitor_audit
  FOR EACH ROW EXECUTE FUNCTION public.lesson_monitor__audit_is_append_only();
DROP TRIGGER IF EXISTS lesson_monitor_audit_no_truncate ON public.lesson_monitor_audit;
CREATE TRIGGER lesson_monitor_audit_no_truncate BEFORE TRUNCATE ON public.lesson_monitor_audit
  FOR EACH STATEMENT EXECUTE FUNCTION public.lesson_monitor__audit_is_append_only();

-- ================================================================ internal helpers
CREATE OR REPLACE FUNCTION public.lesson_monitor__audit(
  p_action text, p_class uuid, p_recording uuid, p_report uuid, p_student uuid, p_detail jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $function$
  INSERT INTO public.lesson_monitor_audit (actor, action, class_id, recording_id, report_id, student_id, detail)
  VALUES (auth.uid(), p_action, p_class, p_recording, p_report, p_student, COALESCE(p_detail, '{}'::jsonb));
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__audit(text, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lesson_monitor__today()
RETURNS date LANGUAGE sql STABLE AS $function$ SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; $function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__today() FROM PUBLIC, anon, authenticated;

-- Children in the lesson that day WITHOUT the monitor's consent 'granted' under
-- the CURRENT wording: those enrolled in the class that day, and those marked
-- Present/Late at a session of the class that day (a visitor, a trial child).
-- A child with no consent row is NOT consented. NULL (= refuse) when it cannot tell.
CREATE OR REPLACE FUNCTION public.lesson_monitor__children_without_consent(p_class uuid, p_on date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT CASE WHEN v.current_version IS NULL OR p_class IS NULL OR p_on IS NULL THEN NULL ELSE (
    SELECT count(DISTINCT p.student_id)::integer
    FROM (
      SELECT e.student_id FROM public.enrollments e
       WHERE e.class_id = p_class AND e.start_date <= p_on AND (e.end_date IS NULL OR e.end_date >= p_on)
      UNION
      SELECT a.student_id FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id
       WHERE s.class_id = p_class AND s.date = p_on AND a.status IN ('Present', 'Late')
    ) p
    WHERE NOT EXISTS (
        SELECT 1 FROM public.lesson_monitor_child_consents cc
        WHERE cc.student_id = p.student_id AND cc.status = 'granted'
          AND cc.wording_version = v.current_version)
  ) END
  FROM (SELECT (SELECT s.consent_wording_version FROM public.lesson_monitor_settings s WHERE s.id = 1) AS current_version) v;
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__children_without_consent(uuid, date) FROM PUBLIC, anon, authenticated;

-- Is the class switched on for a lesson on that date (inside its pilot dates)?
CREATE OR REPLACE FUNCTION public.lesson_monitor__class_on(p_class uuid, p_on date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT EXISTS (SELECT 1 FROM public.lesson_monitor_classes m
                 WHERE m.class_id = p_class AND m.enabled
                   AND p_on BETWEEN m.starts_on AND m.ends_on);
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__class_on(uuid, date) FROM PUBLIC, anon, authenticated;

-- The lesson's teacher: the session's teacher, else the class's default
-- teacher; active only. NULL when nobody can be named (then no report).
CREATE OR REPLACE FUNCTION public.lesson_monitor__lesson_teacher(p_class uuid, p_session uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT COALESCE(
    (SELECT t.user_id FROM public.sessions s JOIN public.teachers t ON t.id = s.teacher_id
      WHERE s.id = p_session AND s.class_id = p_class AND t.is_active IS NOT FALSE AND t.user_id IS NOT NULL),
    (SELECT t.user_id FROM public.classes c JOIN public.teachers t ON t.id = c.default_teacher_id
      WHERE c.id = p_class AND t.is_active IS NOT FALSE AND t.user_id IS NOT NULL));
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__lesson_teacher(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Did the pilot's own teacher teach this lesson? Only then is it processed.
CREATE OR REPLACE FUNCTION public.lesson_monitor__pilot_teacher_taught(p_class uuid, p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT COALESCE((
    SELECT t.user_id = public.lesson_monitor__lesson_teacher(p_class, p_session)
      FROM public.lesson_monitor_classes m JOIN public.teachers t ON t.id = m.teacher_id
     WHERE m.class_id = p_class AND m.enabled AND t.is_active IS NOT FALSE AND t.user_id IS NOT NULL), false);
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__pilot_teacher_taught(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Switch a class off and record why. Internal; callers decide who may.
CREATE OR REPLACE FUNCTION public.lesson_monitor__switch_off(p_class uuid, p_action text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.lesson_monitor_classes
     SET enabled = false, consent_wording_version = NULL, consent_note = NULL,
         enabled_by = NULL, enabled_at = NULL,
         stopped_by = auth.uid(), stopped_at = now(), stop_reason = left(p_reason, 200), updated_at = now()
   WHERE class_id = p_class AND enabled;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM public.lesson_monitor__audit(p_action, p_class, NULL, NULL, NULL, jsonb_build_object('reason', left(p_reason, 200)));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor__switch_off(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- A wording change switches every pilot class off (parents must see the new lines).
CREATE OR REPLACE FUNCTION public.lesson_monitor__settings_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class uuid;
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF NEW.consent_wording_version IS DISTINCT FROM OLD.consent_wording_version THEN
    FOR v_class IN SELECT class_id FROM public.lesson_monitor_classes WHERE enabled LOOP
      PERFORM public.lesson_monitor__switch_off(v_class, 'switch_off_auto', 'the monitor consent wording changed');
    END LOOP;
  END IF;
  PERFORM public.lesson_monitor__audit('settings_changed', NULL, NULL, NULL, NULL,
    jsonb_build_object('wording_version', NEW.consent_wording_version, 'report_days', NEW.report_days));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor__settings_changed() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lesson_monitor_settings_changed ON public.lesson_monitor_settings;
CREATE TRIGGER lesson_monitor_settings_changed BEFORE UPDATE ON public.lesson_monitor_settings
  FOR EACH ROW EXECUTE FUNCTION public.lesson_monitor__settings_changed();

-- Delete what is past the report window. No caller check: it only removes what is
-- overdue, and it is run by the cron job (no signed-in person) and by every write
-- function below, so expiry never depends on the laptop.
CREATE OR REPLACE FUNCTION public.lesson_monitor__purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.lesson_monitor_reports
   WHERE session_date < public.lesson_monitor__today()
                        - COALESCE((SELECT report_days FROM public.lesson_monitor_settings WHERE id = 1), 30);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  DELETE FROM public.lesson_monitor_targets t
   USING public.sessions s WHERE s.id = t.session_id AND s.date < public.lesson_monitor__today() - 60;
  IF v_n > 0 THEN
    PERFORM public.lesson_monitor__audit('reports_expired', NULL, NULL, NULL, NULL, jsonb_build_object('reports', v_n));
  END IF;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor__purge_expired() FROM PUBLIC, anon, authenticated;

-- May the signed-in person read this report? Only its teacher, while they may
-- still listen to that lesson, and only within the report window.
CREATE OR REPLACE FUNCTION public.lesson_monitor_can_read_report(p_teacher uuid, p_class uuid, p_session uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT auth.uid() IS NOT NULL
     AND p_teacher = auth.uid()
     AND public.recorder_can_listen(p_class, p_session)
     AND p_date >= public.lesson_monitor__today()
                   - COALESCE((SELECT report_days FROM public.lesson_monitor_settings WHERE id = 1), 30);
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor_can_read_report(uuid, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_can_read_report(uuid, uuid, uuid, date) TO authenticated, service_role;

-- ================================================================ the switch
CREATE OR REPLACE FUNCTION public.lesson_monitor_set_class(
  p_class uuid, p_enabled boolean, p_wording_version text DEFAULT NULL,
  p_consent_note text DEFAULT NULL, p_days integer DEFAULT 28, p_teacher uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
  v_missing integer;
  v_today date := public.lesson_monitor__today();
  v_teacher_user uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  IF p_class IS NULL OR p_enabled IS NULL THEN RAISE EXCEPTION 'Say which class and whether the monitor is on or off'; END IF;
  PERFORM public.lesson_monitor__purge_expired();

  IF NOT p_enabled THEN
    -- The kill switch: an admin or a teacher of the class. Never refused for a reason other than who.
    IF NOT (COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false)
            OR public.recorder_can_read_class(p_class)
            OR EXISTS (SELECT 1 FROM public.lesson_monitor_reports r WHERE r.class_id = p_class AND r.teacher_user_id = v_uid)) THEN
      RAISE EXCEPTION 'Only an admin or a teacher of the class can stop the lesson monitor' USING ERRCODE = 'insufficient_privilege';
    END IF;
    PERFORM public.lesson_monitor__switch_off(p_class, 'switch_off', COALESCE(NULLIF(btrim(p_consent_note), ''), 'stopped'));
    RETURN;
  END IF;

  IF NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can switch the lesson monitor on' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class) THEN RAISE EXCEPTION 'No such class'; END IF;
  SELECT consent_wording_version INTO v_current FROM public.lesson_monitor_settings WHERE id = 1;
  IF v_current IS NULL OR p_wording_version IS DISTINCT FROM v_current THEN
    RAISE EXCEPTION 'Confirm against the current monitor consent wording (%)', COALESCE(v_current, 'not set');
  END IF;
  IF btrim(COALESCE(p_consent_note, '')) = '' THEN
    RAISE EXCEPTION 'Say where the signed monitor consent lines are held';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 42 THEN
    RAISE EXCEPTION 'A pilot runs for 1 to 42 days (the plan is 28)';
  END IF;
  SELECT t.user_id INTO v_teacher_user FROM public.teachers t
   WHERE t.id = p_teacher AND t.is_active IS NOT FALSE AND t.user_id IS NOT NULL;
  IF v_teacher_user IS NULL OR NOT public.recorder_is_class_teacher(v_teacher_user, p_class) THEN
    RAISE EXCEPTION 'Name the pilot''s teacher: an active teacher who teaches this class';
  END IF;
  v_missing := public.lesson_monitor__children_without_consent(p_class, v_today);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION 'The monitor stays off: % enrolled child(ren) have no monitor consent under wording %',
      COALESCE(v_missing, -1), v_current;
  END IF;

  INSERT INTO public.lesson_monitor_classes AS m
    (class_id, enabled, teacher_id, consent_wording_version, consent_note, enabled_by, enabled_at, starts_on, ends_on,
     stopped_by, stopped_at, stop_reason, updated_at)
  VALUES (p_class, true, p_teacher, v_current, btrim(p_consent_note), v_uid, now(), v_today, v_today + (p_days - 1),
          NULL, NULL, NULL, now())
  ON CONFLICT (class_id) DO UPDATE
    SET enabled = true, teacher_id = EXCLUDED.teacher_id, consent_wording_version = EXCLUDED.consent_wording_version,
        consent_note = EXCLUDED.consent_note, enabled_by = EXCLUDED.enabled_by, enabled_at = EXCLUDED.enabled_at,
        starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on,
        stopped_by = NULL, stopped_at = NULL, stop_reason = NULL, updated_at = now();

  PERFORM public.lesson_monitor__audit('switch_on', p_class, NULL, NULL, NULL,
    jsonb_build_object('wording_version', v_current, 'days', p_days));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_set_class(uuid, boolean, text, text, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_set_class(uuid, boolean, text, text, integer, uuid) TO authenticated;

-- One child's monitor consent (admin). A withdrawal switches off every pilot
-- class the child is in today AND deletes the child's reports at once: every
-- report of a lesson the child was enrolled in on its date or marked present at,
-- including lessons of classes the child has since left. (A report names no
-- child, so the lesson's roster is the only way to know who is in it.) The
-- laptop learns of it through lesson_monitor_keep_check and deletes its drafts.
CREATE OR REPLACE FUNCTION public.lesson_monitor_record_child_consent(p_student uuid, p_status text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := public.lesson_monitor__today();
  v_current text;
  v_class uuid;
  v_classes integer := 0;
  v_reports integer := 0;
  v_n integer;
BEGIN
  IF v_uid IS NULL OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can record a child''s monitor consent' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('granted', 'withdrawn') THEN RAISE EXCEPTION 'Consent is either granted or withdrawn'; END IF;
  IF btrim(COALESCE(p_note, '')) = '' THEN RAISE EXCEPTION 'Say how the parents answered (for example "signed form, 20 Nov")'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student) THEN RAISE EXCEPTION 'No such student'; END IF;
  SELECT consent_wording_version INTO v_current FROM public.lesson_monitor_settings WHERE id = 1;

  INSERT INTO public.lesson_monitor_child_consents (student_id, status, wording_version, note, recorded_by, recorded_at)
  VALUES (p_student, p_status, v_current, left(btrim(p_note), 300), v_uid, now())
  ON CONFLICT (student_id) DO UPDATE
    SET status = EXCLUDED.status, wording_version = EXCLUDED.wording_version, note = EXCLUDED.note,
        recorded_by = EXCLUDED.recorded_by, recorded_at = EXCLUDED.recorded_at;

  PERFORM public.lesson_monitor__audit(CASE p_status WHEN 'granted' THEN 'consent_granted' ELSE 'consent_withdrawn' END,
    NULL, NULL, NULL, p_student, jsonb_build_object('wording_version', v_current));

  IF p_status = 'withdrawn' THEN
    FOR v_class IN
      SELECT DISTINCT e.class_id FROM public.enrollments e
       WHERE e.student_id = p_student AND e.start_date <= v_today AND (e.end_date IS NULL OR e.end_date >= v_today)
    LOOP
      IF public.lesson_monitor__switch_off(v_class, 'switch_off_auto', 'a child''s monitor consent was withdrawn') THEN
        v_classes := v_classes + 1;
      END IF;
      DELETE FROM public.lesson_monitor_reports WHERE class_id = v_class;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_reports := v_reports + v_n;
      IF v_n > 0 THEN
        PERFORM public.lesson_monitor__audit('report_deleted', v_class, NULL, NULL, NULL,
          jsonb_build_object('reports', v_n, 'reason', 'consent_withdrawn'));
      END IF;
    END LOOP;
    -- Every other lesson the child was in, even in a class they have left.
    WITH gone AS (
      DELETE FROM public.lesson_monitor_reports r
       WHERE EXISTS (SELECT 1 FROM public.enrollments e
                      WHERE e.student_id = p_student AND e.class_id = r.class_id
                        AND e.start_date <= r.session_date AND (e.end_date IS NULL OR e.end_date >= r.session_date))
          OR EXISTS (SELECT 1 FROM public.attendance a
                      WHERE a.student_id = p_student AND a.session_id = r.session_id AND a.status IN ('Present', 'Late'))
      RETURNING r.class_id)
    SELECT count(*)::integer INTO v_n FROM gone;
    v_reports := v_reports + v_n;
    IF v_n > 0 THEN
      PERFORM public.lesson_monitor__audit('report_deleted', NULL, NULL, NULL, NULL,
        jsonb_build_object('reports', v_n, 'reason', 'consent_withdrawn_earlier_lessons'));
    END IF;
  END IF;
  RETURN jsonb_build_object('classes_switched_off', v_classes, 'reports_deleted', v_reports);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_record_child_consent(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_record_child_consent(uuid, text, text) TO authenticated;

-- How many children of the class lack the monitor consent (a number, never names).
CREATE OR REPLACE FUNCTION public.lesson_monitor_class_missing_consent(p_class uuid, p_on date DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.recorder_can_read_class(p_class) THEN
    RAISE EXCEPTION 'Not your class' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.lesson_monitor__children_without_consent(p_class, COALESCE(p_on, public.lesson_monitor__today()));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_class_missing_consent(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_class_missing_consent(uuid, date) TO authenticated;

-- ================================================================ the overnight job
-- What is waiting: complete lesson recordings of switched-on classes inside
-- their pilot dates, not yet handled, that the CALLER may listen to.
CREATE OR REPLACE FUNCTION public.lesson_monitor_pending(p_limit integer DEFAULT 20)
RETURNS TABLE (
  recording_id uuid, class_id uuid, session_id uuid, session_date date,
  scheduled_start timestamptz, scheduled_end timestamptz, started_at timestamptz, pre_start_ms bigint,
  ended_at timestamptz, format text, chunk_ms integer, delete_after timestamptz,
  consent_ok boolean, pilot_teacher_taught boolean, last_outcome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT r.id, r.class_id, r.session_id, r.session_date, r.scheduled_start, r.scheduled_end, r.started_at,
         r.pre_start_ms, r.ended_at, r.format, r.chunk_ms, r.delete_after,
         COALESCE(public.lesson_monitor__children_without_consent(r.class_id, r.session_date) = 0, false),
         public.lesson_monitor__pilot_teacher_taught(r.class_id, r.session_id),
         run.outcome
    FROM public.class_recordings r
    LEFT JOIN public.lesson_monitor_runs run ON run.recording_id = r.id
   WHERE auth.uid() IS NOT NULL
     AND r.status = 'complete' AND r.purpose = 'lesson'
     AND r.audio_deleted_at IS NULL AND r.deletion_requested_at IS NULL
     AND r.started_at IS NOT NULL
     AND public.lesson_monitor__class_on(r.class_id, r.session_date)
     AND (run.recording_id IS NULL OR run.outcome = 'failed')
     AND NOT EXISTS (SELECT 1 FROM public.lesson_monitor_reports rep WHERE rep.recording_id = r.id)
     AND public.recorder_can_listen(r.class_id, r.session_id)
   ORDER BY r.delete_after, r.scheduled_start
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor_pending(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_pending(integer) TO authenticated;

-- The gate before any audio is downloaded for the monitor; logs who took it.
CREATE OR REPLACE FUNCTION public.lesson_monitor_begin(p_recording uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.class_recordings%ROWTYPE;
  v_missing integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  PERFORM public.lesson_monitor__purge_expired();
  SELECT * INTO r FROM public.class_recordings WHERE id = p_recording;
  IF NOT FOUND OR NOT public.recorder_can_listen(r.class_id, r.session_id) THEN
    RAISE EXCEPTION 'Not a recording you may listen to' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF r.status <> 'complete' OR r.purpose <> 'lesson' OR r.audio_deleted_at IS NOT NULL OR r.deletion_requested_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_complete');
  END IF;
  IF NOT public.lesson_monitor__class_on(r.class_id, r.session_date) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'class_off');
  END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_monitor_runs WHERE recording_id = r.id AND outcome <> 'failed')
     OR EXISTS (SELECT 1 FROM public.lesson_monitor_reports WHERE recording_id = r.id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_done');
  END IF;
  v_missing := public.lesson_monitor__children_without_consent(r.class_id, r.session_date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consent_missing');
  END IF;
  IF NOT public.lesson_monitor__pilot_teacher_taught(r.class_id, r.session_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'other_teacher');
  END IF;
  PERFORM public.lesson_monitor__audit('audio_download', r.class_id, r.id, NULL, NULL, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_begin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_begin(uuid) TO authenticated;

-- The laptop asks this BETWEEN chunks and before it keeps or saves anything:
-- may the work on this recording go on? One word: ok, or why not. It changes and
-- logs nothing. 'gone' covers a recording the caller may not listen to.
CREATE OR REPLACE FUNCTION public.lesson_monitor_may_continue(p_recording uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.class_recordings%ROWTYPE; v_missing integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO r FROM public.class_recordings WHERE id = p_recording;
  IF NOT FOUND OR NOT public.recorder_can_listen(r.class_id, r.session_id) THEN RETURN 'gone'; END IF;
  IF NOT public.lesson_monitor__class_on(r.class_id, r.session_date) THEN RETURN 'class_off'; END IF;
  v_missing := public.lesson_monitor__children_without_consent(r.class_id, r.session_date);
  IF v_missing IS NULL OR v_missing > 0 THEN RETURN 'consent_missing'; END IF;
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_may_continue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_may_continue(uuid) TO authenticated;

-- Local drafts: which of these recordings may a copy still be kept for? Anything
-- not ok (class off, consent withdrawn or missing, recording gone) is deleted by the laptop.
CREATE OR REPLACE FUNCTION public.lesson_monitor_keep_check(p_recordings uuid[])
RETURNS TABLE (recording_id uuid, keep boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT x, public.lesson_monitor_may_continue(x) = 'ok'
    FROM unnest(COALESCE(p_recordings, '{}'::uuid[])) AS x
   WHERE auth.uid() IS NOT NULL;
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor_keep_check(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_keep_check(uuid[]) TO authenticated;

-- Save a finished report. Every check of begin() again (consent may have been
-- withdrawn while the laptop worked), plus the body's shape. Returns the id only.
CREATE OR REPLACE FUNCTION public.lesson_monitor_save_report(
  p_recording uuid, p_job_version text, p_body jsonb,
  p_audio_seconds integer DEFAULT NULL, p_processing_seconds integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.class_recordings%ROWTYPE;
  v_uid uuid := auth.uid();
  v_teacher uuid;
  v_missing integer;
  v_id uuid;
  v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  PERFORM public.lesson_monitor__purge_expired();
  SELECT * INTO r FROM public.class_recordings WHERE id = p_recording;
  IF NOT FOUND OR NOT public.recorder_can_listen(r.class_id, r.session_id) THEN
    RAISE EXCEPTION 'Not a recording you may listen to' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF r.status <> 'complete' OR r.purpose <> 'lesson' OR r.audio_deleted_at IS NOT NULL OR r.deletion_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'The recording is not a complete lesson recording any more';
  END IF;
  IF NOT public.lesson_monitor__class_on(r.class_id, r.session_date) THEN
    RAISE EXCEPTION 'The lesson monitor is off for this class';
  END IF;
  v_missing := public.lesson_monitor__children_without_consent(r.class_id, r.session_date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION 'Not saved: % child(ren) of the class have no monitor consent', COALESCE(v_missing, -1);
  END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_monitor_reports WHERE recording_id = r.id)
     OR EXISTS (SELECT 1 FROM public.lesson_monitor_runs WHERE recording_id = r.id AND outcome <> 'failed') THEN
    RAISE EXCEPTION 'This lesson has already been handled';
  END IF;
  v_teacher := public.lesson_monitor__lesson_teacher(r.class_id, r.session_id);
  IF v_teacher IS NULL OR NOT public.lesson_monitor__pilot_teacher_taught(r.class_id, r.session_id) THEN
    RAISE EXCEPTION 'Not saved: the pilot''s own teacher did not teach this lesson';
  END IF;

  IF p_body IS NULL OR jsonb_typeof(p_body) <> 'object' OR p_body ->> 'schema' IS DISTINCT FROM 'hec-lesson-monitor/1' THEN
    RAISE EXCEPTION 'The report is not in the hec-lesson-monitor/1 shape';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_body) LOOP
    IF v_key NOT IN ('schema', 'lesson', 'notes', 'lines', 'unwritten', 'targets', 'patterns', 'flags', 'talk_time', 'coverage', 'settings') THEN
      RAISE EXCEPTION 'The report carries an unknown part: %', left(v_key, 40);
    END IF;
  END LOOP;
  IF jsonb_typeof(p_body -> 'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(p_body -> 'lines') > 6000 THEN
    RAISE EXCEPTION 'The report needs its transcript lines (at most 6000)';
  END IF;
  IF octet_length(p_body::text) > 3000000 THEN RAISE EXCEPTION 'The report is too large'; END IF;
  -- Option A names nobody: no child field may ride along in the body.
  IF p_body::text ~* '"(student_id|student_name|child_id|child_name|speaker_name|full_name)"' THEN
    RAISE EXCEPTION 'A lesson report may not name or point at a child';
  END IF;

  INSERT INTO public.lesson_monitor_reports
    (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, made_at, job_version, body)
  VALUES (r.id, r.class_id, r.session_id, r.session_date, v_teacher, v_uid, now(), p_job_version, p_body)
  RETURNING id INTO v_id;

  INSERT INTO public.lesson_monitor_runs (recording_id, class_id, outcome, reason, by_user, at, audio_seconds, processing_seconds)
  VALUES (r.id, r.class_id, 'report_made', NULL, v_uid, now(), p_audio_seconds, p_processing_seconds)
  ON CONFLICT (recording_id) DO UPDATE
    SET outcome = 'report_made', reason = NULL, by_user = EXCLUDED.by_user, at = EXCLUDED.at,
        audio_seconds = EXCLUDED.audio_seconds, processing_seconds = EXCLUDED.processing_seconds;

  PERFORM public.lesson_monitor__audit('report_saved', r.class_id, r.id, v_id, NULL,
    jsonb_build_object('lines', jsonb_array_length(p_body -> 'lines'), 'bytes', octet_length(p_body::text)));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_save_report(uuid, text, jsonb, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_save_report(uuid, text, jsonb, integer, integer) TO authenticated;

-- The job says it refused or failed a recording (a code, never content).
-- 'refused' is final (consent missing, no teacher); 'failed' is retried.
CREATE OR REPLACE FUNCTION public.lesson_monitor_record_run(p_recording uuid, p_outcome text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.class_recordings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  PERFORM public.lesson_monitor__purge_expired();
  IF p_outcome IS NULL OR p_outcome NOT IN ('refused', 'failed') THEN
    RAISE EXCEPTION 'A run is recorded here as refused or failed; a report is saved with lesson_monitor_save_report';
  END IF;
  IF p_reason IS NULL OR p_reason !~ '^[a-z0-9_]{1,40}$' THEN RAISE EXCEPTION 'The reason is a short code'; END IF;
  SELECT * INTO r FROM public.class_recordings WHERE id = p_recording;
  IF NOT FOUND OR NOT public.recorder_can_listen(r.class_id, r.session_id) THEN
    RAISE EXCEPTION 'Not a recording you may listen to' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_monitor_runs WHERE recording_id = r.id AND outcome = 'report_made') THEN
    RAISE EXCEPTION 'This lesson already has its report';
  END IF;
  INSERT INTO public.lesson_monitor_runs (recording_id, class_id, outcome, reason, by_user, at)
  VALUES (r.id, r.class_id, p_outcome, p_reason, auth.uid(), now())
  ON CONFLICT (recording_id) DO UPDATE
    SET outcome = EXCLUDED.outcome, reason = EXCLUDED.reason, by_user = EXCLUDED.by_user, at = EXCLUDED.at;
  PERFORM public.lesson_monitor__audit('run_recorded', r.class_id, r.id, NULL, NULL,
    jsonb_build_object('outcome', p_outcome, 'reason', p_reason));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_record_run(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_record_run(uuid, text, text) TO authenticated;

-- Reports past the window are deleted (the read policy hides them already).
-- Any signed-in staff member may run it: it only removes what is overdue.
CREATE OR REPLACE FUNCTION public.lesson_monitor_expire()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
                                OR COALESCE(public.has_role(auth.uid(), 'teacher'::public.app_role), false)) THEN
    RAISE EXCEPTION 'Staff only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.lesson_monitor__purge_expired();
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_expire() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_expire() TO authenticated;

-- ================================================================ the teacher
-- The pilot classes the signed-in teacher teaches (for the menu and the screen).
CREATE OR REPLACE FUNCTION public.lesson_monitor_my_classes()
RETURNS TABLE (class_id uuid, class_name text, enabled boolean, starts_on date, ends_on date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT m.class_id, c.name, m.enabled, m.starts_on, m.ends_on
    FROM public.lesson_monitor_classes m JOIN public.classes c ON c.id = m.class_id
   WHERE auth.uid() IS NOT NULL
     AND (public.recorder_is_class_teacher(auth.uid(), m.class_id)
          OR EXISTS (SELECT 1 FROM public.lesson_monitor_reports r
                      WHERE r.class_id = m.class_id AND r.teacher_user_id = auth.uid()))
   ORDER BY c.name;
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor_my_classes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_my_classes() TO authenticated;

-- The lessons of switched-on classes the caller teaches, for typing target words.
CREATE OR REPLACE FUNCTION public.lesson_monitor_my_lessons(p_from date, p_to date)
RETURNS TABLE (session_id uuid, class_id uuid, class_name text, lesson_date date, start_time time, words text[], structures text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT s.id, s.class_id, c.name, s.date, s.start_time, COALESCE(t.words, '{}'), COALESCE(t.structures, '{}')
    FROM public.sessions s
    JOIN public.classes c ON c.id = s.class_id
    JOIN public.lesson_monitor_classes m ON m.class_id = s.class_id AND m.enabled
    LEFT JOIN public.lesson_monitor_targets t ON t.session_id = s.id
   WHERE auth.uid() IS NOT NULL
     AND p_from IS NOT NULL AND p_to IS NOT NULL AND p_to >= p_from AND p_to - p_from <= 31
     AND s.date BETWEEN GREATEST(p_from, m.starts_on) AND LEAST(p_to, m.ends_on)
     AND s.status <> 'Canceled'::public.session_status
     AND (public.recorder_is_class_teacher(auth.uid(), s.class_id)
          OR EXISTS (SELECT 1 FROM public.teachers te WHERE te.id = s.teacher_id AND te.user_id = auth.uid() AND te.is_active IS NOT FALSE))
   ORDER BY s.date, s.start_time;
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor_my_lessons(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_my_lessons(date, date) TO authenticated;

-- The teacher types a lesson's target words (optional; design feature C).
CREATE OR REPLACE FUNCTION public.lesson_monitor_set_targets(p_session uuid, p_words text[], p_structures text[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.sessions%ROWTYPE;
  v_words text[];
  v_structs text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session;
  IF NOT FOUND OR NOT public.recorder_can_listen(s.class_id, s.id) THEN
    RAISE EXCEPTION 'Not a lesson you teach' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lesson_monitor_classes WHERE class_id = s.class_id AND enabled) THEN
    RAISE EXCEPTION 'The lesson monitor is not on for this class';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT w ORDER BY w), '{}') INTO v_words
    FROM (SELECT lower(btrim(x)) w FROM unnest(COALESCE(p_words, '{}')) x) q WHERE w <> '';
  SELECT COALESCE(array_agg(DISTINCT w ORDER BY w), '{}') INTO v_structs
    FROM (SELECT btrim(x) w FROM unnest(COALESCE(p_structures, '{}')) x) q WHERE w <> '';
  IF cardinality(v_words) > 40 OR cardinality(v_structs) > 10 THEN
    RAISE EXCEPTION 'At most 40 words and 10 structures for one lesson';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_words) w WHERE w !~ '^[a-z][a-z'' -]{0,39}$')
     OR EXISTS (SELECT 1 FROM unnest(v_structs) w WHERE char_length(w) > 60) THEN
    RAISE EXCEPTION 'A target word is English letters, spaces, hyphens or apostrophes (at most 40 characters)';
  END IF;
  INSERT INTO public.lesson_monitor_targets (session_id, class_id, words, structures, set_by, set_at)
  VALUES (s.id, s.class_id, v_words, v_structs, auth.uid(), now())
  ON CONFLICT (session_id) DO UPDATE
    SET words = EXCLUDED.words, structures = EXCLUDED.structures, set_by = EXCLUDED.set_by, set_at = EXCLUDED.set_at;
  PERFORM public.lesson_monitor__audit('targets_set', s.class_id, NULL, NULL, NULL,
    jsonb_build_object('words', cardinality(v_words), 'structures', cardinality(v_structs)));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_set_targets(uuid, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_set_targets(uuid, text[], text[]) TO authenticated;

-- The teacher opened a report / says how long it took and whether it helped.
CREATE OR REPLACE FUNCTION public.lesson_monitor_report_feedback(
  p_report uuid, p_minutes integer DEFAULT NULL, p_used text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep public.lesson_monitor_reports%ROWTYPE;
BEGIN
  PERFORM public.lesson_monitor__purge_expired();
  SELECT * INTO rep FROM public.lesson_monitor_reports WHERE id = p_report;
  IF NOT FOUND OR NOT public.lesson_monitor_can_read_report(rep.teacher_user_id, rep.class_id, rep.session_id, rep.session_date) THEN
    RAISE EXCEPTION 'Not your report' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_minutes IS NULL AND p_used IS NULL THEN
    IF rep.first_opened_at IS NULL THEN
      UPDATE public.lesson_monitor_reports SET first_opened_at = now() WHERE id = rep.id;
      PERFORM public.lesson_monitor__audit('report_opened', rep.class_id, rep.recording_id, rep.id, NULL, '{}'::jsonb);
    END IF;
    RETURN;
  END IF;
  IF p_minutes IS NOT NULL AND (p_minutes < 0 OR p_minutes > 240) THEN RAISE EXCEPTION 'Minutes are 0 to 240'; END IF;
  IF p_used IS NOT NULL AND p_used NOT IN ('yes', 'no', 'not_sure') THEN RAISE EXCEPTION 'Used: yes, no or not_sure'; END IF;
  UPDATE public.lesson_monitor_reports
     SET reading_minutes = COALESCE(p_minutes, reading_minutes), used_something = COALESCE(p_used, used_something),
         first_opened_at = COALESCE(first_opened_at, now()), feedback_at = now()
   WHERE id = rep.id;
  PERFORM public.lesson_monitor__audit('report_feedback', rep.class_id, rep.recording_id, rep.id, NULL,
    jsonb_build_object('minutes', p_minutes, 'used', p_used));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_report_feedback(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_report_feedback(uuid, integer, text) TO authenticated;

-- "Delete now": the report's teacher, or an admin. The run row stays, so the
-- job does not make it again.
CREATE OR REPLACE FUNCTION public.lesson_monitor_delete_report(p_report uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep public.lesson_monitor_reports%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO rep FROM public.lesson_monitor_reports WHERE id = p_report;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT (rep.teacher_user_id = auth.uid() OR COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)) THEN
    RAISE EXCEPTION 'Only the lesson''s teacher or an admin can delete this report' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM public.lesson_monitor_reports WHERE id = rep.id;
  PERFORM public.lesson_monitor__audit('report_deleted', rep.class_id, rep.recording_id, rep.id, NULL,
    jsonb_build_object('reports', 1, 'reason', 'delete_now'));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_delete_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_delete_report(uuid) TO authenticated;

-- ================================================================ the owner
-- For the stop rules: per report, dates and the teacher's feedback. NO content.
CREATE OR REPLACE FUNCTION public.lesson_monitor_admin_status()
RETURNS TABLE (report_id uuid, class_id uuid, session_date date, made_at timestamptz,
               first_opened_at timestamptz, reading_minutes integer, used_something text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT r.id, r.class_id, r.session_date, r.made_at, r.first_opened_at, r.reading_minutes, r.used_something
                 FROM public.lesson_monitor_reports r ORDER BY r.session_date;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_admin_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_admin_status() TO authenticated;

-- One command deletes everything the pilot put in the database: reports,
-- target words, run records, the class switches (and, if asked, the monitor
-- consent records). The audit log stays, as counts and dates: WHO (student_id) is
-- cleared from every row, by the one exception the append-only trigger allows.
CREATE OR REPLACE FUNCTION public.lesson_monitor_delete_everything(p_confirm text, p_consents boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reports integer; v_targets integer; v_runs integer; v_classes integer; v_consents integer := 0; v_scrubbed integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_confirm IS DISTINCT FROM 'DELETE ALL PILOT DATA' THEN
    RAISE EXCEPTION 'Type DELETE ALL PILOT DATA to confirm';
  END IF;
  DELETE FROM public.lesson_monitor_reports; GET DIAGNOSTICS v_reports = ROW_COUNT;
  DELETE FROM public.lesson_monitor_targets; GET DIAGNOSTICS v_targets = ROW_COUNT;
  DELETE FROM public.lesson_monitor_runs;    GET DIAGNOSTICS v_runs = ROW_COUNT;
  DELETE FROM public.lesson_monitor_classes; GET DIAGNOSTICS v_classes = ROW_COUNT;
  IF COALESCE(p_consents, false) THEN
    DELETE FROM public.lesson_monitor_child_consents; GET DIAGNOSTICS v_consents = ROW_COUNT;
  END IF;
  PERFORM set_config('lesson_monitor.scrub', 'on', true);
  UPDATE public.lesson_monitor_audit SET student_id = NULL WHERE student_id IS NOT NULL;
  GET DIAGNOSTICS v_scrubbed = ROW_COUNT;
  PERFORM set_config('lesson_monitor.scrub', 'off', true);
  PERFORM public.lesson_monitor__audit('delete_everything', NULL, NULL, NULL, NULL,
    jsonb_build_object('reports', v_reports, 'targets', v_targets, 'runs', v_runs, 'classes', v_classes, 'consents', v_consents,
                       'student_ids_cleared', v_scrubbed));
  RETURN jsonb_build_object('reports', v_reports, 'targets', v_targets, 'runs', v_runs, 'classes', v_classes, 'consents', v_consents,
    'left', (SELECT count(*) FROM public.lesson_monitor_reports) + (SELECT count(*) FROM public.lesson_monitor_targets)
          + (SELECT count(*) FROM public.lesson_monitor_runs) + (SELECT count(*) FROM public.lesson_monitor_classes));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_delete_everything(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_delete_everything(text, boolean) TO authenticated;

-- ================================================================ policies
ALTER TABLE public.lesson_monitor_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_child_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_targets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_audit          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_monitor_settings_read ON public.lesson_monitor_settings;
CREATE POLICY lesson_monitor_settings_read ON public.lesson_monitor_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role));
DROP POLICY IF EXISTS lesson_monitor_settings_admin_update ON public.lesson_monitor_settings;
CREATE POLICY lesson_monitor_settings_admin_update ON public.lesson_monitor_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS lesson_monitor_child_consents_admin_read ON public.lesson_monitor_child_consents;
CREATE POLICY lesson_monitor_child_consents_admin_read ON public.lesson_monitor_child_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS lesson_monitor_classes_read ON public.lesson_monitor_classes;
CREATE POLICY lesson_monitor_classes_read ON public.lesson_monitor_classes FOR SELECT TO authenticated
  USING (public.recorder_can_read_class(class_id));

-- THE rule: the lesson's own teacher, nobody else.
DROP POLICY IF EXISTS lesson_monitor_reports_teacher_read ON public.lesson_monitor_reports;
CREATE POLICY lesson_monitor_reports_teacher_read ON public.lesson_monitor_reports FOR SELECT TO authenticated
  USING (public.lesson_monitor_can_read_report(teacher_user_id, class_id, session_id, session_date));

DROP POLICY IF EXISTS lesson_monitor_targets_read ON public.lesson_monitor_targets;
CREATE POLICY lesson_monitor_targets_read ON public.lesson_monitor_targets FOR SELECT TO authenticated
  USING (public.recorder_can_listen(class_id, session_id));

DROP POLICY IF EXISTS lesson_monitor_runs_admin_read ON public.lesson_monitor_runs;
CREATE POLICY lesson_monitor_runs_admin_read ON public.lesson_monitor_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS lesson_monitor_audit_read ON public.lesson_monitor_audit;
CREATE POLICY lesson_monitor_audit_read ON public.lesson_monitor_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR actor = auth.uid());

-- ================================================================ grants
-- 20260712023825 revoked the defaults on public: without a grant PostgREST
-- reports a table as missing from the schema cache. Signed-in users get
-- SELECT only (and UPDATE on the settings row, admin by policy): every other
-- write is a function above, so a missing grant fails closed. Nothing to anon.
REVOKE ALL ON public.lesson_monitor_settings, public.lesson_monitor_child_consents, public.lesson_monitor_classes,
  public.lesson_monitor_reports, public.lesson_monitor_targets, public.lesson_monitor_runs, public.lesson_monitor_audit
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.lesson_monitor_settings TO authenticated;
GRANT SELECT ON public.lesson_monitor_child_consents, public.lesson_monitor_classes, public.lesson_monitor_reports,
  public.lesson_monitor_targets, public.lesson_monitor_runs, public.lesson_monitor_audit TO authenticated;
GRANT ALL ON public.lesson_monitor_settings, public.lesson_monitor_child_consents, public.lesson_monitor_classes,
  public.lesson_monitor_reports, public.lesson_monitor_targets, public.lesson_monitor_runs, public.lesson_monitor_audit
  TO service_role;

-- Expiry without the laptop (review M-1): hourly at :23 where pg_cron exists.
-- Tolerant like the recorder's 20261112101000: without pg_cron it only says so,
-- and every write function purges expired reports first anyway.
DO $cron$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE NOTICE 'lesson monitor: pg_cron is not installed here - no expiry job scheduled; write functions purge expired reports';
    RETURN;
  END IF;
  BEGIN PERFORM cron.unschedule('lesson-monitor-expire'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('lesson-monitor-expire', '23 * * * *', $cmd$ select public.lesson_monitor__purge_expired(); $cmd$);
END
$cron$;

COMMIT;
