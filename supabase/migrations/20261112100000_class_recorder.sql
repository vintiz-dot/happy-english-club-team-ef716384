-- Class recorder: capture only. Two mono tracks of a lesson (the teacher's
-- lapel microphone and the room speakerphone), uploaded in small chunks to a
-- private bucket. Nothing here analyses audio, and nothing here is readable by
-- a family, a student, a teaching assistant or a teacher of another class.
--
-- Design and the reasons: docs/evidence/C1-architecture.md (Revision 1).
--
-- WHAT THIS ADDS
--   recorder_settings            one row: retention, pre-roll, grace, tolerances,
--                                plausibility floors, wording version.
--   class_recording_settings     the per-class switch. No row = OFF. It can only
--                                be ON together with who confirmed that parental
--                                consent is on file, when, and under which wording.
--   recorder_child_consents      one row per child: granted or withdrawn, and
--                                under which wording.
--   recorder_device_profiles     which two microphones a teacher's browser uses.
--   class_recordings             one row per recording of one session.
--   class_recording_tracks       'teacher' and 'room'.
--   class_recording_chunks       one row per uploaded piece.
--   class_recording_markers      roll call, activities, tap-a-name chips.
--   recorder_audit_log           append-only: who switched, armed, started, stopped.
--   recorder_session_evidence    view: the contract workstream D reads.
--   class-recordings (bucket)    private. {class}/{recording}/{track}/{seq}.{ext}
--
-- RULES IT HOLDS (each one is tested in scripts/pgtest/recorder.test.mjs)
--   1. A recording cannot be created unless the class switch is on, the consent
--      confirmation is on the row under the CURRENT wording, and every child
--      enrolled that day has consent 'granted' under the CURRENT wording.
--      Checked in a trigger, so it holds whatever the client sends and whoever
--      sends it. Every doubt is a refusal. A wording change, a child joining
--      without consent, or a withdrawal switches the class off at once.
--   2. A recording belongs to a session that is not cancelled. Capture runs only
--      from pre-roll (5 min) before the scheduled start to grace (10 min) after
--      the scheduled end, on the server's clock, Hanoi time. The class and the
--      session come from the server and can never be changed or removed.
--   3. Recording: an admin, a standing teacher of the class (default teacher or
--      named in its timetable), or the teacher of THAT session (a cover).
--      Listening: an admin, a standing teacher, or the teacher of that
--      recording's own session - never the class's other recordings, never from
--      a future assignment. `is_teacher_of_class` also says yes to teaching
--      assistants (20261111110000), so it is NOT used here. Archived teachers
--      are nobody.
--   4. A chunk is registered before it is uploaded, the file can only be
--      written to the path the database chose, and registering the same chunk
--      twice is a no-op while registering different bytes under the same number
--      is refused. A chunk's claimed span must fit the server's clock, the
--      lesson window and a minimum plausible size for its format.
--   5. The evidence (`recorder_session_evidence`) rests on what the server saw:
--      server timestamps, confirmed stored objects and their sizes. The laptop's
--      times are kept, as claims. `counts_as_held_evidence` is the strict flag.
--   6. The audit log cannot be updated, deleted or truncated by anyone.
--   7. A recording row is never deleted while its audio is still in storage,
--      and the functions that look at storage refuse when they cannot see it.
--
-- NOT IN THIS FILE: the nightly job. SQL cannot remove storage objects, so the
-- deleting is done by an edge function (`recorder-retention`, task C2) which
-- asks `recorder_retention_due()` what to remove and then marks each recording
-- 'deleted' - which this file refuses while a single object is left.
--
-- Safe to run twice.

BEGIN;

-- ================================================================ settings
-- Plausibility floors (bytes per second of audio, per track). A chunk smaller
-- than this for its claimed span is refused. The floors are well below what
-- a working microphone produces, so they refuse only fabrications and broken
-- encoders; C2 measures the real figures [C2-measure]:
--   opus-webm  Opus 128 kbit/s = 16 000 B/s nominal. VBR on a quiet room can
--              fall to a fraction of that; floor 2 000 B/s (1/8 of nominal).
--   flac       48 kHz 16-bit mono raw PCM = 96 000 B/s; FLAC on speech and room
--              noise is typically 45-60 kB/s; floor 4 000 B/s (about 4 % of raw,
--              which only near-digital silence goes below).
--   pcm-wav    exactly sample_rate x 2 B/s: 16 000 at 8 kHz, 96 000 at 48 kHz;
--              floor 15 000 B/s.
CREATE TABLE IF NOT EXISTS public.recorder_settings (
  id                         integer PRIMARY KEY CHECK (id = 1),
  retention_days             integer NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 180),
  -- The capture window, enforced by the server: from pre_roll before the
  -- scheduled start to grace after the scheduled end.
  pre_roll_minutes           integer NOT NULL DEFAULT 5  CHECK (pre_roll_minutes BETWEEN 0 AND 15),
  grace_minutes              integer NOT NULL DEFAULT 10 CHECK (grace_minutes BETWEEN 0 AND 30),
  -- Arming is only a row: it may happen this early, but capture still waits
  -- for the window above.
  arm_window_minutes         integer NOT NULL DEFAULT 20 CHECK (arm_window_minutes BETWEEN 5 AND 30),
  stale_upload_days          integer NOT NULL DEFAULT 14 CHECK (stale_upload_days BETWEEN 1 AND 60),
  -- How far a chunk's claimed position may run ahead of the server's clock
  -- (network latency between the page starting capture and the server
  -- stamping started_at).
  clock_tolerance_seconds    integer NOT NULL DEFAULT 15 CHECK (clock_tolerance_seconds BETWEEN 1 AND 60),
  -- A completed recording counts as evidence that the lesson was held only
  -- when the audio the server can vouch for covers at least this fraction of
  -- the scheduled lesson.
  held_evidence_min_fraction numeric(3,2) NOT NULL DEFAULT 0.50
                               CHECK (held_evidence_min_fraction BETWEEN 0.10 AND 1.00),
  min_bytes_per_sec_opus     integer NOT NULL DEFAULT 2000  CHECK (min_bytes_per_sec_opus BETWEEN 500 AND 16000),
  min_bytes_per_sec_flac     integer NOT NULL DEFAULT 4000  CHECK (min_bytes_per_sec_flac BETWEEN 1000 AND 96000),
  min_bytes_per_sec_wav      integer NOT NULL DEFAULT 15000 CHECK (min_bytes_per_sec_wav BETWEEN 8000 AND 96000),
  consent_wording_version    text NOT NULL DEFAULT 'v1-2026-11',
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  updated_by                 uuid,
  CONSTRAINT recorder_settings_limits CHECK (pre_roll_minutes <= arm_window_minutes)
);
INSERT INTO public.recorder_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ================================================================ who
-- A STANDING teacher of the class: its default teacher, or a teacher named in
-- its weekly timetable. Active only. Internal: a signed-in user cannot ask it
-- about somebody else (it would map who teaches which class).
CREATE OR REPLACE FUNCTION public.recorder_is_class_teacher(p_user uuid, p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p_user IS NOT NULL AND p_class IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.teachers t ON t.id = c.default_teacher_id
      WHERE c.id = p_class AND t.user_id = p_user AND t.is_active IS NOT FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM public.classes c
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
             THEN c.schedule_template -> 'weeklySlots' ELSE '[]'::jsonb END
      ) AS slot
      JOIN public.teachers t ON t.id::text = lower(slot ->> 'teacherId')
      WHERE c.id = p_class AND t.user_id = p_user AND t.is_active IS NOT FALSE
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.recorder_is_class_teacher(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_is_class_teacher(uuid, uuid) TO service_role;

-- The teacher of ONE session of the class (a cover). Active only. Internal.
CREATE OR REPLACE FUNCTION public.recorder__teaches_session(p_user uuid, p_session uuid, p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p_user IS NOT NULL AND p_session IS NOT NULL AND p_class IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.teachers t ON t.id = s.teacher_id
    WHERE s.id = p_session AND s.class_id = p_class
      AND t.user_id = p_user AND t.is_active IS NOT FALSE
  );
$function$;

REVOKE ALL ON FUNCTION public.recorder__teaches_session(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The class as a whole (its switch, its missing-consent count, switching it
-- off): an admin, a standing teacher, or the teacher of one of its lessons
-- TODAY (Hanoi). A cover booked for another day sees nothing.
CREATE OR REPLACE FUNCTION public.recorder_can_read_class(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL AND p_class IS NOT NULL AND (
    COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
    OR public.recorder_is_class_teacher(auth.uid(), p_class)
    OR EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.teachers t ON t.id = s.teacher_id
      WHERE s.class_id = p_class AND t.user_id = auth.uid() AND t.is_active IS NOT FALSE
        AND s.status <> 'Canceled'::public.session_status
        AND s.date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.recorder_can_read_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_can_read_class(uuid) TO authenticated, service_role;

-- Who may LISTEN to one recording (its row, parts and files): an admin, a
-- standing teacher of its class, or the teacher of that recording's own
-- session. Nothing else - in particular not a cover teacher of some other
-- session of the class, past or future.
CREATE OR REPLACE FUNCTION public.recorder_can_listen(p_class uuid, p_session uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL AND p_class IS NOT NULL AND (
    COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
    OR public.recorder_is_class_teacher(auth.uid(), p_class)
    OR public.recorder__teaches_session(auth.uid(), p_session, p_class)
  );
$function$;

REVOKE ALL ON FUNCTION public.recorder_can_listen(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_can_listen(uuid, uuid) TO authenticated, service_role;

-- The server's clock, so the page can measure how wrong the laptop's is.
CREATE OR REPLACE FUNCTION public.recorder_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $function$ SELECT clock_timestamp(); $function$;

REVOKE ALL ON FUNCTION public.recorder_server_time() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_server_time() TO authenticated, service_role;

-- ================================================================ audit log
CREATE TABLE IF NOT EXISTS public.recorder_audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at           timestamptz NOT NULL DEFAULT now(),
  actor        uuid,                 -- NULL = the system (retention job)
  action       text NOT NULL CHECK (action IN (
                 'switch_on', 'switch_off', 'switch_off_auto',
                 'child_consent_granted', 'child_consent_withdrawn',
                 'armed', 'started', 'stopped', 'completed', 'abandoned',
                 'stop_requested', 'deletion_requested', 'retention_changed',
                 'audio_deleted', 'settings_changed')),
  -- No foreign keys on purpose: the log outlives what it describes.
  class_id     uuid,
  session_id   uuid,
  recording_id uuid,
  student_id   uuid,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_recorder_audit_class ON public.recorder_audit_log (class_id, at);
CREATE INDEX IF NOT EXISTS idx_recorder_audit_recording ON public.recorder_audit_log (recording_id, at);

CREATE OR REPLACE FUNCTION public.recorder__audit_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'recorder_audit_log is append-only: % is refused', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS recorder_audit_no_change ON public.recorder_audit_log;
CREATE TRIGGER recorder_audit_no_change
  BEFORE UPDATE OR DELETE ON public.recorder_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.recorder__audit_is_append_only();

DROP TRIGGER IF EXISTS recorder_audit_no_truncate ON public.recorder_audit_log;
CREATE TRIGGER recorder_audit_no_truncate
  BEFORE TRUNCATE ON public.recorder_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.recorder__audit_is_append_only();

-- The only writer. Not callable by any API role.
CREATE OR REPLACE FUNCTION public.recorder__audit(
  p_action text, p_class uuid, p_session uuid, p_recording uuid, p_student uuid, p_detail jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  INSERT INTO public.recorder_audit_log (actor, action, class_id, session_id, recording_id, student_id, detail)
  VALUES (auth.uid(), p_action, p_class, p_session, p_recording, p_student, COALESCE(p_detail, '{}'::jsonb));
$function$;

REVOKE ALL ON FUNCTION public.recorder__audit(text, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- ================================================================ consent
CREATE TABLE IF NOT EXISTS public.class_recording_settings (
  class_id                uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  recording_enabled       boolean NOT NULL DEFAULT false,
  consent_confirmed_by    uuid,
  consent_confirmed_at    timestamptz,
  consent_wording_version text,
  consent_note            text,
  disabled_by             uuid,
  disabled_at             timestamptz,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- ON is impossible without the confirmation, whoever writes the row.
  CONSTRAINT class_recording_on_needs_consent CHECK (
    NOT recording_enabled OR (
      consent_confirmed_by IS NOT NULL
      AND consent_confirmed_at IS NOT NULL
      AND consent_wording_version IS NOT NULL
      AND btrim(COALESCE(consent_note, '')) <> ''))
);

CREATE TABLE IF NOT EXISTS public.recorder_child_consents (
  student_id      uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  status          text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  wording_version text NOT NULL,
  note            text NOT NULL CHECK (btrim(note) <> ''),
  recorded_by     uuid NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

-- The ONE count: children enrolled in the class on that day without consent
-- 'granted' under the CURRENT wording. NULL when the wording cannot be read,
-- and every caller treats NULL as a refusal. Internal.
CREATE OR REPLACE FUNCTION public.recorder__children_without_consent(p_class uuid, p_on date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE WHEN v.current_version IS NULL OR p_class IS NULL OR p_on IS NULL THEN NULL ELSE (
    SELECT count(DISTINCT e.student_id)::integer
    FROM public.enrollments e
    WHERE e.class_id = p_class
      AND e.start_date <= p_on
      AND (e.end_date IS NULL OR e.end_date >= p_on)
      AND NOT EXISTS (
        SELECT 1 FROM public.recorder_child_consents cc
        WHERE cc.student_id = e.student_id
          AND cc.status = 'granted'
          AND cc.wording_version = v.current_version)
  ) END
  FROM (SELECT (SELECT s.consent_wording_version FROM public.recorder_settings s WHERE s.id = 1) AS current_version) v;
$function$;

REVOKE ALL ON FUNCTION public.recorder__children_without_consent(uuid, date) FROM PUBLIC, anon, authenticated;

-- How many children enrolled in the class on that day have no consent on
-- record under the current wording. A number, never names: a teacher may call this.
CREATE OR REPLACE FUNCTION public.recorder_class_missing_consent(p_class uuid, p_on date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.recorder_can_read_class(p_class) THEN
    RAISE EXCEPTION 'Not your class' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.recorder__children_without_consent(
    p_class, COALESCE(p_on, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_class_missing_consent(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_class_missing_consent(uuid, date) TO authenticated, service_role;

-- Switch a class off: nothing armed survives, and anything capturing is told
-- to stop. Internal; the callers below decide who may.
CREATE OR REPLACE FUNCTION public.recorder__switch_off(p_class uuid, p_action text, p_detail jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.class_recording_settings
     SET recording_enabled = false,
         consent_confirmed_by = NULL, consent_confirmed_at = NULL,
         consent_wording_version = NULL, consent_note = NULL,
         disabled_by = auth.uid(), disabled_at = now(), updated_at = now()
   WHERE class_id = p_class AND recording_enabled;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.class_recordings
     SET status = 'abandoned', abandon_reason = 'switch_off'
   WHERE class_id = p_class AND status = 'armed';
  UPDATE public.class_recordings
     SET stop_requested_at = now()
   WHERE class_id = p_class AND status = 'recording' AND stop_requested_at IS NULL;

  PERFORM public.recorder__audit(p_action, p_class, NULL, NULL, NULL, p_detail);
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__switch_off(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- The switch. ON: an admin, the current wording, a note saying where the
-- consent is held, and no enrolled child without consent under that wording.
-- OFF: an admin or a teacher of the class today - stopping never needs permission.
CREATE OR REPLACE FUNCTION public.recorder_set_class_recording(
  p_class uuid, p_enabled boolean, p_wording_version text DEFAULT NULL, p_consent_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
  v_missing integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_enabled IS NULL OR p_class IS NULL THEN
    RAISE EXCEPTION 'Say which class and whether recording is on or off';
  END IF;

  IF NOT p_enabled THEN
    IF NOT public.recorder_can_read_class(p_class) THEN
      RAISE EXCEPTION 'Only an admin or a teacher of the class can switch recording off'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    PERFORM public.recorder__switch_off(p_class, 'switch_off', jsonb_build_object('note', p_consent_note));
    RETURN;
  END IF;

  IF NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can switch recording on for a class'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class) THEN
    RAISE EXCEPTION 'No such class';
  END IF;
  SELECT consent_wording_version INTO v_current FROM public.recorder_settings WHERE id = 1;
  IF v_current IS NULL OR p_wording_version IS DISTINCT FROM v_current THEN
    RAISE EXCEPTION 'Confirm against the current consent wording (%)', COALESCE(v_current, 'not set');
  END IF;
  IF btrim(COALESCE(p_consent_note, '')) = '' THEN
    RAISE EXCEPTION 'Say where the signed parental consent is held (for example "paper forms, office folder B")';
  END IF;
  v_missing := public.recorder__children_without_consent(p_class, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION 'Recording stays off: % enrolled child(ren) have no consent on record under wording %',
      COALESCE(v_missing, -1), v_current;
  END IF;

  INSERT INTO public.class_recording_settings AS s
    (class_id, recording_enabled, consent_confirmed_by, consent_confirmed_at,
     consent_wording_version, consent_note, disabled_by, disabled_at, updated_at)
  VALUES (p_class, true, v_uid, now(), v_current, btrim(p_consent_note), NULL, NULL, now())
  ON CONFLICT (class_id) DO UPDATE
    SET recording_enabled = true,
        consent_confirmed_by = EXCLUDED.consent_confirmed_by,
        consent_confirmed_at = EXCLUDED.consent_confirmed_at,
        consent_wording_version = EXCLUDED.consent_wording_version,
        consent_note = EXCLUDED.consent_note,
        disabled_by = NULL, disabled_at = NULL, updated_at = now();

  PERFORM public.recorder__audit('switch_on', p_class, NULL, NULL, NULL,
    jsonb_build_object('wording_version', v_current, 'note', btrim(p_consent_note)));
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_set_class_recording(uuid, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_set_class_recording(uuid, boolean, text, text) TO authenticated;

-- One child's consent, always under the current wording. Withdrawing switches
-- off every class the child is in today, at once: a room recording cannot
-- leave one voice out.
CREATE OR REPLACE FUNCTION public.recorder_record_child_consent(p_student uuid, p_status text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_current text;
  v_class uuid;
BEGIN
  IF v_uid IS NULL OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can record a child''s recording consent'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('granted', 'withdrawn') THEN
    RAISE EXCEPTION 'Consent is either granted or withdrawn';
  END IF;
  IF btrim(COALESCE(p_note, '')) = '' THEN
    RAISE EXCEPTION 'Say how the parents answered (for example "signed form, 3 Nov")';
  END IF;
  SELECT consent_wording_version INTO v_current FROM public.recorder_settings WHERE id = 1;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'The consent wording version is not set';
  END IF;

  INSERT INTO public.recorder_child_consents (student_id, status, wording_version, note, recorded_by, recorded_at)
  VALUES (p_student, p_status, v_current, btrim(p_note), v_uid, now())
  ON CONFLICT (student_id) DO UPDATE
    SET status = EXCLUDED.status, wording_version = EXCLUDED.wording_version,
        note = EXCLUDED.note, recorded_by = EXCLUDED.recorded_by, recorded_at = EXCLUDED.recorded_at;

  PERFORM public.recorder__audit(
    CASE p_status WHEN 'granted' THEN 'child_consent_granted' ELSE 'child_consent_withdrawn' END,
    NULL, NULL, NULL, p_student, jsonb_build_object('wording_version', v_current, 'note', btrim(p_note)));

  IF p_status = 'withdrawn' THEN
    FOR v_class IN
      SELECT DISTINCT e.class_id FROM public.enrollments e
      WHERE e.student_id = p_student AND e.start_date <= v_today
        AND (e.end_date IS NULL OR e.end_date >= v_today)
    LOOP
      PERFORM public.recorder__switch_off(v_class, 'switch_off_auto',
        jsonb_build_object('reason', 'a child''s consent was withdrawn'));
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_record_child_consent(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_record_child_consent(uuid, text, text) TO authenticated;

-- A child who joins a class that is being recorded, without consent under the
-- current wording, switches it off at once (the next arm would be refused
-- anyway; this also stops what is running). Never raises: an enrolment is
-- never refused because of the recorder.
CREATE OR REPLACE FUNCTION public.recorder__enrollment_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_recording_settings
             WHERE class_id = NEW.class_id AND recording_enabled)
     AND NOT EXISTS (
       SELECT 1 FROM public.recorder_child_consents cc
       JOIN public.recorder_settings s ON s.id = 1
       WHERE cc.student_id = NEW.student_id AND cc.status = 'granted'
         AND cc.wording_version = s.consent_wording_version) THEN
    PERFORM public.recorder__switch_off(NEW.class_id, 'switch_off_auto',
      jsonb_build_object('reason', 'a child without recording consent joined the class',
                         'student_id', NEW.student_id));
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__enrollment_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS recorder_enrollment_consent ON public.enrollments;
CREATE TRIGGER recorder_enrollment_consent
  AFTER INSERT OR UPDATE OF student_id, class_id, start_date, end_date ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.recorder__enrollment_changed();

-- ================================================================ devices
CREATE TABLE IF NOT EXISTS public.recorder_device_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  install_id          uuid NOT NULL,          -- made once per browser, kept in localStorage
  teacher_label       text,
  teacher_device_hash text,                   -- SHA-256 of the browser's deviceId
  teacher_group_hash  text,
  room_label          text,
  room_device_hash    text,
  room_group_hash     text,
  user_agent          text,
  checks              jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- A plain UNIQUE, so the page can upsert against it.
  CONSTRAINT recorder_device_profile_per_browser UNIQUE (user_id, install_id),
  CONSTRAINT recorder_device_profile_two_devices CHECK (
    teacher_device_hash IS NULL OR room_device_hash IS NULL OR teacher_device_hash <> room_device_hash)
);

-- ================================================================ recordings
CREATE TABLE IF NOT EXISTS public.class_recordings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id              uuid NOT NULL REFERENCES public.classes(id),
  -- A session can be deleted (a rebuilt timetable); then, and only then, this
  -- goes NULL. armed_session_id keeps which lesson it was, for good.
  session_id            uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  armed_session_id      uuid NOT NULL,
  session_date          date NOT NULL,
  scheduled_start       timestamptz NOT NULL,
  scheduled_end         timestamptz NOT NULL,
  -- The server-enforced capture window (pre-roll / grace snapshot at arming).
  capture_opens_at      timestamptz NOT NULL,
  capture_closes_at     timestamptz NOT NULL,
  purpose               text NOT NULL DEFAULT 'lesson' CHECK (purpose IN ('lesson', 'evaluation')),
  status                text NOT NULL DEFAULT 'armed' CHECK (status IN (
                          'armed', 'recording', 'uploading', 'complete', 'abandoned', 'deleted')),
  format                text NOT NULL CHECK (format IN ('opus-webm', 'flac', 'pcm-wav')),
  chunk_ms              integer NOT NULL DEFAULT 30000 CHECK (chunk_ms BETWEEN 10000 AND 60000),
  -- capture_closes_at - capture_opens_at: no position in the audio can be later.
  max_duration_ms       bigint NOT NULL CHECK (max_duration_ms > 0),
  -- Snapshots of the settings at arming, so a later settings change cannot
  -- reinterpret an old recording.
  min_bytes_per_sec     integer NOT NULL CHECK (min_bytes_per_sec > 0),
  clock_tolerance_ms    integer NOT NULL CHECK (clock_tolerance_ms > 0),
  held_min_fraction     numeric(3,2) NOT NULL CHECK (held_min_fraction > 0 AND held_min_fraction <= 1),
  started_by            uuid NOT NULL,
  device_profile_id     uuid REFERENCES public.recorder_device_profiles(id) ON DELETE SET NULL,
  client_info           jsonb NOT NULL DEFAULT '{}'::jsonb,
  armed_at              timestamptz NOT NULL DEFAULT now(),
  -- The laptop's claims, kept for information. Never evidence.
  client_started_at     timestamptz,
  client_ended_at       timestamptz,
  -- The server's clock at the start and stop transitions.
  started_at            timestamptz,
  ended_at              timestamptz,
  stopped_by            uuid,
  stop_reason           text CHECK (stop_reason IS NULL OR stop_reason IN (
                          'manual', 'scheduled_end', 'session_canceled', 'switch_off',
                          'device_lost', 'crash_recovered', 'admin')),
  stop_requested_at     timestamptz,
  manifest_path         text,
  manifest_sha256       text CHECK (manifest_sha256 IS NULL OR manifest_sha256 ~ '^[0-9a-f]{64}$'),
  completed_at          timestamptz,
  abandoned_at          timestamptz,
  abandon_reason        text,
  delete_after          timestamptz NOT NULL,
  deletion_requested_at timestamptz,
  deletion_requested_by uuid,
  deletion_reason       text,
  audio_deleted_at      timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_recordings_window CHECK (scheduled_end > scheduled_start),
  CONSTRAINT class_recordings_capture_window CHECK (
    capture_opens_at <= scheduled_start AND capture_closes_at >= scheduled_end),
  CONSTRAINT class_recordings_retention_cap CHECK (delete_after <= scheduled_end + INTERVAL '180 days')
);

CREATE INDEX IF NOT EXISTS idx_class_recordings_class ON public.class_recordings (class_id, session_date);
CREATE INDEX IF NOT EXISTS idx_class_recordings_session ON public.class_recordings (session_id);
CREATE INDEX IF NOT EXISTS idx_class_recordings_armed_session ON public.class_recordings (armed_session_id);
CREATE INDEX IF NOT EXISTS idx_class_recordings_expiry ON public.class_recordings (delete_after)
  WHERE audio_deleted_at IS NULL;
-- One live recording per session. Partial, so NOT an upsert target - nothing
-- upserts against it (no ON CONFLICT names it); a second arm is meant to fail.
-- It keys on armed_session_id, which nobody can change or null.
CREATE UNIQUE INDEX IF NOT EXISTS class_recordings_one_live_per_session
  ON public.class_recordings (armed_session_id) WHERE status IN ('armed', 'recording');

CREATE TABLE IF NOT EXISTS public.class_recording_tracks (
  recording_id     uuid NOT NULL REFERENCES public.class_recordings(id) ON DELETE CASCADE,
  track            text NOT NULL CHECK (track IN ('teacher', 'room')),
  device_label     text,
  device_hash      text,
  -- 48 kHz at most: a 60 s pcm-wav chunk is then 5.76 MB, inside the bucket's 8 MB.
  sample_rate      integer CHECK (sample_rate IS NULL OR sample_rate BETWEEN 8000 AND 48000),
  channel_count    integer NOT NULL DEFAULT 1 CHECK (channel_count = 1),
  codec            text,
  bitrate          integer,
  applied_settings jsonb NOT NULL DEFAULT '{}'::jsonb,   -- MediaStreamTrack.getSettings()
  chunk_count      integer CHECK (chunk_count IS NULL OR chunk_count >= 0),
  total_bytes      bigint,
  total_ms         bigint,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recording_id, track)
);

CREATE TABLE IF NOT EXISTS public.class_recording_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id  uuid NOT NULL,
  track         text NOT NULL,
  seq           integer NOT NULL CHECK (seq >= 0),
  storage_path  text NOT NULL UNIQUE,
  byte_size     bigint NOT NULL CHECK (byte_size > 0),
  sha256        text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  -- The laptop's claim of where this audio sits, bounded at registration by
  -- the server's clock, the window, the chunk length and the byte floor.
  t_start_ms    bigint NOT NULL CHECK (t_start_ms >= 0),
  t_end_ms      bigint NOT NULL,
  registered_by uuid,
  registered_at timestamptz NOT NULL DEFAULT now(),
  -- What storage reported, read by the server at confirmation.
  stored_size   bigint,
  confirmed_at  timestamptz,
  CONSTRAINT class_recording_chunks_span CHECK (t_end_ms > t_start_ms),
  -- Plain UNIQUE: this is the ON CONFLICT target of recorder_register_chunk.
  CONSTRAINT class_recording_chunks_once UNIQUE (recording_id, track, seq),
  CONSTRAINT class_recording_chunks_track FOREIGN KEY (recording_id, track)
    REFERENCES public.class_recording_tracks(recording_id, track) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.class_recording_markers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id     uuid NOT NULL REFERENCES public.class_recordings(id) ON DELETE CASCADE,
  client_marker_id uuid NOT NULL,
  kind             text NOT NULL CHECK (kind IN (
                     'roll_call_start', 'roll_call_end', 'activity', 'student_name',
                     'note', 'gap', 'device_change')),
  t_ms             bigint NOT NULL CHECK (t_ms >= 0),
  label            text CHECK (label IS NULL OR char_length(label) <= 200),
  -- The teacher tapped this child's name: ground truth a person gave.
  student_id       uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_by       uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_recording_markers_once UNIQUE (recording_id, client_marker_id)
);

CREATE INDEX IF NOT EXISTS idx_class_recording_markers ON public.class_recording_markers (recording_id, t_ms);

-- ---------------------------------------------------------------- arming
-- Every check that decides whether children may be recorded is here, in the
-- database, and every one refuses when it cannot be sure.
CREATE OR REPLACE FUNCTION public.recorder__recording_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_set public.recorder_settings%ROWTYPE;
  v_sess record;
  v_switch public.class_recording_settings%ROWTYPE;
  v_missing integer;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'A recording is started by a signed-in teacher, never by the system'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_set FROM public.recorder_settings WHERE id = 1;
  IF NOT FOUND OR v_set.consent_wording_version IS NULL THEN
    RAISE EXCEPTION 'Recorder settings are missing: recording is refused';
  END IF;
  IF NEW.session_id IS NULL THEN
    RAISE EXCEPTION 'A recording belongs to a lesson: choose the session';
  END IF;

  SELECT s.id, s.class_id, s.date, s.start_time, s.end_time, s.status
    INTO v_sess FROM public.sessions s WHERE s.id = NEW.session_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such session';
  END IF;
  IF v_sess.status = 'Canceled'::public.session_status THEN
    RAISE EXCEPTION 'This lesson is cancelled: it cannot be recorded';
  END IF;
  IF v_sess.date IS NULL OR v_sess.start_time IS NULL OR v_sess.end_time IS NULL THEN
    RAISE EXCEPTION 'This lesson has no time: it cannot be recorded';
  END IF;

  -- Lesson times are Hanoi wall-clock.
  v_start := (v_sess.date + v_sess.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_end := (v_sess.date + v_sess.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  IF v_end <= v_start THEN v_end := v_end + INTERVAL '1 day'; END IF;

  -- The class is the session's, whatever the client sent.
  NEW.class_id := v_sess.class_id;

  -- May record THIS lesson: an admin, a standing teacher of the class, or the
  -- teacher of this very session.
  IF NOT (COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false)
          OR public.recorder_is_class_teacher(v_uid, v_sess.class_id)
          OR public.recorder__teaches_session(v_uid, v_sess.id, v_sess.class_id)) THEN
    RAISE EXCEPTION 'Only a teacher of this class can record it'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_switch FROM public.class_recording_settings
   WHERE class_id = v_sess.class_id FOR SHARE;
  IF NOT FOUND OR v_switch.recording_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'Recording is switched off for this class'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_switch.consent_confirmed_by IS NULL OR v_switch.consent_confirmed_at IS NULL
     OR v_switch.consent_wording_version IS NULL THEN
    RAISE EXCEPTION 'Recording is refused: no parental consent confirmation is on record for this class'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_switch.consent_wording_version IS DISTINCT FROM v_set.consent_wording_version THEN
    RAISE EXCEPTION 'Recording is refused: consent was confirmed under an older wording (%)',
      v_switch.consent_wording_version USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_missing := public.recorder__children_without_consent(v_sess.class_id, v_sess.date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION 'Recording is refused: % child(ren) in this class have no consent on record under wording %',
      COALESCE(v_missing, -1), v_set.consent_wording_version USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_now < v_start - make_interval(mins => v_set.arm_window_minutes) THEN
    RAISE EXCEPTION 'Too early: this lesson can be armed from % minutes before it starts', v_set.arm_window_minutes;
  END IF;
  IF v_now >= v_end THEN
    RAISE EXCEPTION 'Too late: this lesson has ended';
  END IF;

  IF NEW.device_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.recorder_device_profiles d WHERE d.id = NEW.device_profile_id AND d.user_id = v_uid) THEN
    RAISE EXCEPTION 'That device profile is not yours';
  END IF;

  -- Everything below is decided here, not by the client.
  NEW.started_by := v_uid;
  NEW.status := 'armed';
  NEW.armed_at := v_now;
  NEW.armed_session_id := v_sess.id;
  NEW.session_date := v_sess.date;
  NEW.scheduled_start := v_start;
  NEW.scheduled_end := v_end;
  NEW.capture_opens_at := v_start - make_interval(mins => v_set.pre_roll_minutes);
  NEW.capture_closes_at := v_end + make_interval(mins => v_set.grace_minutes);
  NEW.max_duration_ms := floor(extract(epoch FROM (NEW.capture_closes_at - NEW.capture_opens_at)) * 1000)::bigint;
  NEW.min_bytes_per_sec := CASE NEW.format
    WHEN 'opus-webm' THEN v_set.min_bytes_per_sec_opus
    WHEN 'flac' THEN v_set.min_bytes_per_sec_flac
    ELSE v_set.min_bytes_per_sec_wav END;
  NEW.clock_tolerance_ms := v_set.clock_tolerance_seconds * 1000;
  NEW.held_min_fraction := v_set.held_evidence_min_fraction;
  NEW.delete_after := v_end + make_interval(days => v_set.retention_days);
  NEW.started_at := NULL; NEW.ended_at := NULL; NEW.stopped_by := NULL; NEW.stop_reason := NULL;
  NEW.stop_requested_at := NULL; NEW.manifest_path := NULL; NEW.manifest_sha256 := NULL;
  NEW.completed_at := NULL; NEW.abandoned_at := NULL; NEW.abandon_reason := NULL;
  NEW.deletion_requested_at := NULL; NEW.deletion_requested_by := NULL; NEW.deletion_reason := NULL;
  NEW.audio_deleted_at := NULL;
  NEW.created_at := v_now; NEW.updated_at := v_now;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__recording_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS class_recordings_before_insert ON public.class_recordings;
CREATE TRIGGER class_recordings_before_insert
  BEFORE INSERT ON public.class_recordings
  FOR EACH ROW EXECUTE FUNCTION public.recorder__recording_before_insert();

-- ---------------------------------------------------------------- state machine
--   armed -> recording -> uploading -> complete -> deleted
--   armed | recording | uploading -> abandoned -> deleted
--
-- row_security = off: this function reads storage.objects, which its owner
-- does not own. If the owner is subject to RLS there, Postgres raises instead
-- of quietly returning no rows - so the "no file left" check can only fail
-- closed, never open.
CREATE OR REPLACE FUNCTION public.recorder__recording_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  -- No user at all is the retention job (service role); it may do what an admin may.
  v_admin boolean := v_uid IS NULL OR COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false);
  v_now timestamptz := now();
  v_asked_stop_reason text := NEW.stop_reason;
  v_span_ms bigint;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.class_id IS DISTINCT FROM OLD.class_id
     OR NEW.armed_session_id IS DISTINCT FROM OLD.armed_session_id
     OR NEW.started_by IS DISTINCT FROM OLD.started_by
     OR NEW.armed_at IS DISTINCT FROM OLD.armed_at
     OR NEW.session_date IS DISTINCT FROM OLD.session_date
     OR NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start
     OR NEW.scheduled_end IS DISTINCT FROM OLD.scheduled_end
     OR NEW.capture_opens_at IS DISTINCT FROM OLD.capture_opens_at
     OR NEW.capture_closes_at IS DISTINCT FROM OLD.capture_closes_at
     OR NEW.max_duration_ms IS DISTINCT FROM OLD.max_duration_ms
     OR NEW.min_bytes_per_sec IS DISTINCT FROM OLD.min_bytes_per_sec
     OR NEW.clock_tolerance_ms IS DISTINCT FROM OLD.clock_tolerance_ms
     OR NEW.held_min_fraction IS DISTINCT FROM OLD.held_min_fraction
     OR NEW.purpose IS DISTINCT FROM OLD.purpose
     OR NEW.format IS DISTINCT FROM OLD.format
     OR NEW.chunk_ms IS DISTINCT FROM OLD.chunk_ms
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'A recording''s class, session, owner, window and format cannot be changed';
  END IF;
  -- The session goes NULL only through the foreign key, once the session row
  -- itself is gone (ON DELETE SET NULL runs after the delete). Nobody swaps
  -- it or detaches it.
  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    IF NEW.session_id IS NOT NULL
       OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = OLD.session_id) THEN
      RAISE EXCEPTION 'A recording stays with its lesson: its session cannot be changed or removed';
    END IF;
  END IF;
  IF NEW.device_profile_id IS DISTINCT FROM OLD.device_profile_id AND NEW.device_profile_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.recorder_device_profiles d
                     WHERE d.id = NEW.device_profile_id AND d.user_id = OLD.started_by) THEN
    RAISE EXCEPTION 'That device profile is not the recorder''s';
  END IF;

  -- Server-owned fields: whatever the client sent, keep ours.
  NEW.started_at := OLD.started_at;
  NEW.ended_at := OLD.ended_at;
  NEW.stopped_by := OLD.stopped_by;
  NEW.stop_reason := OLD.stop_reason;
  NEW.completed_at := OLD.completed_at;
  NEW.abandoned_at := OLD.abandoned_at;
  NEW.audio_deleted_at := OLD.audio_deleted_at;
  NEW.updated_at := v_now;
  -- A stop request is never taken back, and it is stamped by the server.
  IF OLD.stop_requested_at IS NOT NULL THEN
    NEW.stop_requested_at := OLD.stop_requested_at;
  ELSIF NEW.stop_requested_at IS NOT NULL THEN
    NEW.stop_requested_at := v_now;
  END IF;
  -- A deletion request is stamped with who really made it and when; once made
  -- it stands.
  IF OLD.deletion_requested_at IS NOT NULL THEN
    NEW.deletion_requested_at := OLD.deletion_requested_at;
    NEW.deletion_requested_by := OLD.deletion_requested_by;
    NEW.deletion_reason := OLD.deletion_reason;
  ELSIF NEW.deletion_requested_at IS NOT NULL THEN
    IF btrim(COALESCE(NEW.deletion_reason, '')) = '' THEN
      RAISE EXCEPTION 'Say why this recording should be deleted';
    END IF;
    NEW.deletion_requested_at := v_now;
    NEW.deletion_requested_by := v_uid;
    NEW.deletion_reason := btrim(NEW.deletion_reason);
  ELSE
    NEW.deletion_requested_by := NULL;
    NEW.deletion_reason := NULL;
  END IF;
  -- Anyone who can touch the row may shorten its life; only an admin extends it.
  IF NEW.delete_after IS NULL OR (NEW.delete_after > OLD.delete_after AND NOT v_admin) THEN
    NEW.delete_after := OLD.delete_after;
  END IF;
  IF OLD.status IN ('complete', 'abandoned', 'deleted') THEN
    NEW.manifest_path := OLD.manifest_path;
    NEW.manifest_sha256 := OLD.manifest_sha256;
    NEW.abandon_reason := OLD.abandon_reason;
    NEW.client_started_at := OLD.client_started_at;
    NEW.client_ended_at := OLD.client_ended_at;
    NEW.client_info := OLD.client_info;
    NEW.device_profile_id := OLD.device_profile_id;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
         (OLD.status = 'armed'     AND NEW.status IN ('recording', 'abandoned'))
      OR (OLD.status = 'recording' AND NEW.status IN ('uploading', 'abandoned'))
      OR (OLD.status = 'uploading' AND NEW.status IN ('complete', 'abandoned'))
      OR (OLD.status = 'complete'  AND NEW.status = 'deleted')
      OR (OLD.status = 'abandoned' AND NEW.status = 'deleted')
    ) THEN
      RAISE EXCEPTION 'A recording cannot go from % to %', OLD.status, COALESCE(NEW.status, 'nothing');
    END IF;

    IF NEW.status = 'recording' THEN
      -- The server's clock, inside the window. The laptop's claim stays in
      -- client_started_at.
      IF v_now < OLD.capture_opens_at THEN
        RAISE EXCEPTION 'Too early: capture opens at % (the pre-roll before the lesson)', OLD.capture_opens_at;
      END IF;
      IF v_now >= OLD.capture_closes_at THEN
        RAISE EXCEPTION 'The lesson window is over: this recording can no longer start';
      END IF;
      NEW.started_at := v_now;

    ELSIF NEW.status = 'uploading' THEN
      NEW.ended_at := LEAST(v_now, OLD.capture_closes_at);
      NEW.stopped_by := v_uid;
      -- What the page may say about why it stopped; the server-side reasons
      -- only when the server asked it to stop, 'admin' only from an admin.
      NEW.stop_reason := CASE
        WHEN v_asked_stop_reason IN ('manual', 'scheduled_end', 'device_lost', 'crash_recovered')
          THEN v_asked_stop_reason
        WHEN v_asked_stop_reason IN ('switch_off', 'session_canceled') AND OLD.stop_requested_at IS NOT NULL
          THEN v_asked_stop_reason
        WHEN v_asked_stop_reason = 'admin' AND v_uid IS NOT NULL AND v_admin
          THEN 'admin'
        ELSE 'manual' END;

    ELSIF NEW.status = 'complete' THEN
      IF NEW.manifest_path IS DISTINCT FROM (OLD.class_id::text || '/' || OLD.id::text || '/manifest.json')
         OR NEW.manifest_sha256 IS NULL THEN
        RAISE EXCEPTION 'A recording is complete only with its manifest and the manifest''s checksum';
      END IF;
      IF OLD.started_at IS NULL OR OLD.ended_at IS NULL THEN
        RAISE EXCEPTION 'A recording the server did not see start and stop cannot be complete';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM storage.objects o
                     WHERE o.bucket_id = 'class-recordings' AND o.name = NEW.manifest_path) THEN
        RAISE EXCEPTION 'The manifest is not in storage yet';
      END IF;
      IF EXISTS (SELECT 1 FROM public.class_recording_chunks c
                 WHERE c.recording_id = OLD.id AND c.confirmed_at IS NULL) THEN
        RAISE EXCEPTION 'Some chunks are registered but not confirmed in storage';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.class_recording_tracks t
                     WHERE t.recording_id = OLD.id AND t.chunk_count > 0) THEN
        RAISE EXCEPTION 'A recording with no audio cannot be complete';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.class_recording_tracks t
        WHERE t.recording_id = OLD.id
          AND (t.chunk_count IS NULL
               OR t.chunk_count <> (SELECT count(*) FROM public.class_recording_chunks c
                                    WHERE c.recording_id = t.recording_id AND c.track = t.track)
               OR t.chunk_count <> COALESCE((SELECT max(c.seq) + 1 FROM public.class_recording_chunks c
                                             WHERE c.recording_id = t.recording_id AND c.track = t.track), 0))
      ) THEN
        RAISE EXCEPTION 'The chunks in storage are not the ones the manifest counts';
      END IF;
      -- Every confirmed chunk is still there, at the size storage reported.
      IF EXISTS (
        SELECT 1 FROM public.class_recording_chunks c
        WHERE c.recording_id = OLD.id
          AND NOT EXISTS (SELECT 1 FROM storage.objects o
                          WHERE o.bucket_id = 'class-recordings' AND o.name = c.storage_path
                            AND NULLIF(o.metadata ->> 'size', '')::bigint = c.stored_size)) THEN
        RAISE EXCEPTION 'A confirmed chunk is no longer in storage at the size it was confirmed with';
      END IF;
      -- One timeline per track: chunk n+1 does not start before chunk n ends
      -- (100 ms of encoder slack).
      IF EXISTS (
        SELECT 1 FROM public.class_recording_chunks a
        JOIN public.class_recording_chunks b
          ON b.recording_id = a.recording_id AND b.track = a.track AND b.seq = a.seq + 1
        WHERE a.recording_id = OLD.id AND b.t_start_ms < a.t_end_ms - 100) THEN
        RAISE EXCEPTION 'Two chunks of one track overlap: the audio would be counted twice';
      END IF;
      -- No track holds more audio than the server saw being captured.
      v_span_ms := floor(extract(epoch FROM (OLD.ended_at - OLD.started_at)) * 1000)::bigint;
      IF EXISTS (
        SELECT 1 FROM public.class_recording_chunks c
        WHERE c.recording_id = OLD.id AND c.t_end_ms > v_span_ms + OLD.clock_tolerance_ms) THEN
        RAISE EXCEPTION 'The audio claims to be longer than the server saw the recording run (% ms)', v_span_ms;
      END IF;
      NEW.completed_at := v_now;

    ELSIF NEW.status = 'abandoned' THEN
      NEW.abandoned_at := v_now;
      NEW.abandon_reason := COALESCE(NULLIF(btrim(NEW.abandon_reason), ''), 'unspecified');
      IF OLD.started_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.ended_at := LEAST(v_now, OLD.capture_closes_at);
      END IF;

    ELSIF NEW.status = 'deleted' THEN
      IF NOT v_admin THEN
        RAISE EXCEPTION 'Only an admin or the retention job marks audio deleted'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF EXISTS (SELECT 1 FROM storage.objects o
                 WHERE o.bucket_id = 'class-recordings'
                   AND o.name LIKE OLD.class_id::text || '/' || OLD.id::text || '/%') THEN
        RAISE EXCEPTION 'Audio is still in storage: remove the files first';
      END IF;
      NEW.audio_deleted_at := v_now;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__recording_before_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS class_recordings_before_update ON public.class_recordings;
CREATE TRIGGER class_recordings_before_update
  BEFORE UPDATE ON public.class_recordings
  FOR EACH ROW EXECUTE FUNCTION public.recorder__recording_before_update();

-- A row goes only after its audio has gone - checked again here, against
-- storage itself, whatever path brought the row to 'deleted'. Same
-- row_security = off rule: if storage cannot be seen, this raises.
CREATE OR REPLACE FUNCTION public.recorder__recording_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF OLD.status <> 'deleted' THEN
    RAISE EXCEPTION 'A recording row is kept until its audio has been removed (status is %)', OLD.status;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o
             WHERE o.bucket_id = 'class-recordings'
               AND o.name LIKE OLD.class_id::text || '/' || OLD.id::text || '/%') THEN
    RAISE EXCEPTION 'Audio is still in storage: the recording row is kept';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__recording_before_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS class_recordings_before_delete ON public.class_recordings;
CREATE TRIGGER class_recordings_before_delete
  BEFORE DELETE ON public.class_recordings
  FOR EACH ROW EXECUTE FUNCTION public.recorder__recording_before_delete();

-- Who armed, started, stopped: written by the database, not by the page.
CREATE OR REPLACE FUNCTION public.recorder__recording_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recorder__audit('armed', NEW.class_id, NEW.session_id, NEW.id, NULL,
      jsonb_build_object('scheduled_start', NEW.scheduled_start, 'scheduled_end', NEW.scheduled_end,
                         'capture_opens_at', NEW.capture_opens_at, 'capture_closes_at', NEW.capture_closes_at,
                         'purpose', NEW.purpose, 'format', NEW.format));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.recorder__audit(
      CASE NEW.status WHEN 'recording' THEN 'started' WHEN 'uploading' THEN 'stopped'
                      WHEN 'complete' THEN 'completed' WHEN 'abandoned' THEN 'abandoned'
                      ELSE 'audio_deleted' END,
      NEW.class_id, NEW.armed_session_id, NEW.id, NULL,
      jsonb_build_object('from', OLD.status, 'started_at', NEW.started_at, 'ended_at', NEW.ended_at,
                         'client_started_at', NEW.client_started_at, 'client_ended_at', NEW.client_ended_at,
                         'stop_reason', NEW.stop_reason, 'abandon_reason', NEW.abandon_reason));
  END IF;
  IF OLD.stop_requested_at IS NULL AND NEW.stop_requested_at IS NOT NULL THEN
    PERFORM public.recorder__audit('stop_requested', NEW.class_id, NEW.armed_session_id, NEW.id, NULL, '{}'::jsonb);
  END IF;
  IF OLD.deletion_requested_at IS NULL AND NEW.deletion_requested_at IS NOT NULL THEN
    PERFORM public.recorder__audit('deletion_requested', NEW.class_id, NEW.armed_session_id, NEW.id, NULL,
      jsonb_build_object('reason', NEW.deletion_reason, 'delete_after', NEW.delete_after));
  ELSIF NEW.delete_after IS DISTINCT FROM OLD.delete_after THEN
    PERFORM public.recorder__audit('retention_changed', NEW.class_id, NEW.armed_session_id, NEW.id, NULL,
      jsonb_build_object('from', OLD.delete_after, 'to', NEW.delete_after));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__recording_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS class_recordings_audit ON public.class_recordings;
CREATE TRIGGER class_recordings_audit
  AFTER INSERT OR UPDATE ON public.class_recordings
  FOR EACH ROW EXECUTE FUNCTION public.recorder__recording_audit();

-- Settings changes are logged. A new consent wording switches every class
-- off: what parents agreed to has changed, so nothing records until an admin
-- confirms again, child by child.
CREATE OR REPLACE FUNCTION public.recorder__settings_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  PERFORM public.recorder__audit('settings_changed', NULL, NULL, NULL, NULL,
    jsonb_build_object('from', to_jsonb(OLD), 'to', to_jsonb(NEW)));
  IF NEW.consent_wording_version IS DISTINCT FROM OLD.consent_wording_version THEN
    FOR v_class IN SELECT class_id FROM public.class_recording_settings WHERE recording_enabled LOOP
      PERFORM public.recorder__switch_off(v_class, 'switch_off_auto',
        jsonb_build_object('reason', 'the consent wording changed',
                           'from', OLD.consent_wording_version, 'to', NEW.consent_wording_version));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__settings_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS recorder_settings_audit ON public.recorder_settings;
CREATE TRIGGER recorder_settings_audit
  BEFORE UPDATE ON public.recorder_settings
  FOR EACH ROW EXECUTE FUNCTION public.recorder__settings_audit();

-- A lesson cancelled after arming: what is armed is abandoned, what is
-- capturing is told to stop. What was captured stays - it is the evidence
-- workstream D needs about a cancelled lesson.
CREATE OR REPLACE FUNCTION public.recorder__session_canceled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.class_recordings
     SET status = 'abandoned', abandon_reason = 'session_canceled'
   WHERE armed_session_id = NEW.id AND status = 'armed';
  UPDATE public.class_recordings
     SET stop_requested_at = now()
   WHERE armed_session_id = NEW.id AND status = 'recording' AND stop_requested_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__session_canceled() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS recorder_session_canceled ON public.sessions;
CREATE TRIGGER recorder_session_canceled
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status = 'Canceled'::public.session_status AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.recorder__session_canceled();

-- The recording is the caller's and still open. SECURITY DEFINER so a policy
-- on a child table does not depend on the parent's own policy.
CREATE OR REPLACE FUNCTION public.recorder_owns_open(p_recording uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.class_recordings r
    WHERE r.id = p_recording AND r.started_by = auth.uid()
      AND r.status IN ('armed', 'recording', 'uploading'));
$function$;

REVOKE ALL ON FUNCTION public.recorder_owns_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_owns_open(uuid) TO authenticated, service_role;

-- A recording's rows (tracks, chunks, markers): whoever may listen to it, and
-- the person recording it while it is still open (so an interrupted upload
-- can finish). Once it is closed, only the listeners.
CREATE OR REPLACE FUNCTION public.recorder_can_read_recording(p_recording uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.class_recordings r
    WHERE r.id = p_recording
      AND (public.recorder_can_listen(r.class_id, r.session_id)
           OR (r.started_by = auth.uid() AND r.status IN ('armed', 'recording', 'uploading'))));
$function$;

REVOKE ALL ON FUNCTION public.recorder_can_read_recording(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_can_read_recording(uuid) TO authenticated, service_role;

-- A name chip must be a child of this class.
CREATE OR REPLACE FUNCTION public.recorder__marker_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.class_recordings%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = NEW.recording_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such recording'; END IF;
  NEW.created_by := auth.uid();
  NEW.created_at := now();
  IF NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'A marker is made by a signed-in teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.t_ms > v_rec.max_duration_ms THEN
    RAISE EXCEPTION 'This marker is after the end of the recording window';
  END IF;
  IF (NEW.kind = 'student_name') <> (NEW.student_id IS NOT NULL) THEN
    RAISE EXCEPTION 'A name chip names a child, and only a name chip does';
  END IF;
  IF NEW.student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = NEW.student_id AND e.class_id = v_rec.class_id
      AND e.start_date <= v_rec.session_date
      AND (e.end_date IS NULL OR e.end_date >= v_rec.session_date)) THEN
    RAISE EXCEPTION 'That child is not in this class';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder__marker_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS class_recording_markers_before_insert ON public.class_recording_markers;
CREATE TRIGGER class_recording_markers_before_insert
  BEFORE INSERT ON public.class_recording_markers
  FOR EACH ROW EXECUTE FUNCTION public.recorder__marker_before_insert();

-- ---------------------------------------------------------------- chunks
-- Register first, upload second, confirm third.
--
-- Registering is idempotent: the same (recording, track, seq) with the same
-- bytes returns the row that is already there. Different bytes under the same
-- number are refused - nothing is ever overwritten.
--
-- The span the page claims must be possible on the server's evidence:
--   * no longer than one chunk (chunk_ms + tolerance);
--   * at least min_bytes_per_sec for the format (a 1-byte "90 minutes" is refused);
--   * not ending later than the server's clock says capture could have got to
--     (clock_timestamp() - started_at, + tolerance);
--   * not after Stop (ended_at - started_at, + tolerance), once stopped;
--   * not after the capture window closes (scheduled end + grace, + tolerance);
--   * not after a stop request + 60 s.
CREATE OR REPLACE FUNCTION public.recorder_register_chunk(
  p_recording uuid, p_track text, p_seq integer, p_byte_size bigint, p_sha256 text,
  p_t_start_ms bigint, p_t_end_ms bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rec public.class_recordings%ROWTYPE;
  v_path text;
  v_new uuid;
  v_row public.class_recording_chunks%ROWTYPE;
  v_stop_ms bigint;
  v_elapsed_ms bigint;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR SHARE;
  IF NOT FOUND OR v_uid IS NULL OR v_rec.started_by <> v_uid THEN
    RAISE EXCEPTION 'Not your recording' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_rec.status NOT IN ('recording', 'uploading') THEN
    RAISE EXCEPTION 'This recording is % and takes no more audio', v_rec.status;
  END IF;
  IF v_rec.started_at IS NULL THEN
    RAISE EXCEPTION 'The server did not see this recording start: no audio is accepted';
  END IF;
  IF p_track IS NULL OR p_track NOT IN ('teacher', 'room') THEN
    RAISE EXCEPTION 'The track is teacher or room';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.class_recording_tracks
                 WHERE recording_id = p_recording AND track = p_track) THEN
    RAISE EXCEPTION 'Describe the % track before sending its audio', p_track;
  END IF;
  IF p_seq IS NULL OR p_seq < 0 OR p_seq > 99999 OR p_byte_size IS NULL OR p_byte_size <= 0
     OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
     OR p_t_start_ms IS NULL OR p_t_end_ms IS NULL OR p_t_start_ms < 0 OR p_t_end_ms <= p_t_start_ms THEN
    RAISE EXCEPTION 'A chunk needs a number, a size, a SHA-256 and a time span';
  END IF;
  IF v_rec.stop_requested_at IS NOT NULL THEN
    v_stop_ms := floor(extract(epoch FROM (v_rec.stop_requested_at - v_rec.started_at)) * 1000)::bigint + 60000;
    IF p_t_start_ms > v_stop_ms THEN
      RAISE EXCEPTION 'Recording was asked to stop: audio captured after that is refused';
    END IF;
  END IF;
  IF p_t_end_ms - p_t_start_ms > v_rec.chunk_ms + v_rec.clock_tolerance_ms THEN
    RAISE EXCEPTION 'A chunk is at most % ms of audio: refused', v_rec.chunk_ms;
  END IF;
  IF p_byte_size * 1000 < v_rec.min_bytes_per_sec::bigint * (p_t_end_ms - p_t_start_ms) THEN
    RAISE EXCEPTION 'This chunk is too small to hold % ms of % audio (at least % bytes a second): refused',
      p_t_end_ms - p_t_start_ms, v_rec.format, v_rec.min_bytes_per_sec;
  END IF;
  v_elapsed_ms := floor(extract(epoch FROM (clock_timestamp() - v_rec.started_at)) * 1000)::bigint;
  IF p_t_end_ms > v_elapsed_ms + v_rec.clock_tolerance_ms THEN
    RAISE EXCEPTION 'This audio ends later than the server''s clock says capture has run (% ms): refused', v_elapsed_ms;
  END IF;
  IF v_rec.ended_at IS NOT NULL AND p_t_end_ms >
     floor(extract(epoch FROM (v_rec.ended_at - v_rec.started_at)) * 1000)::bigint + v_rec.clock_tolerance_ms THEN
    RAISE EXCEPTION 'This audio is from after Stop: refused';
  END IF;
  IF v_rec.started_at + (p_t_end_ms * INTERVAL '1 millisecond')
     > v_rec.capture_closes_at + (v_rec.clock_tolerance_ms * INTERVAL '1 millisecond') THEN
    RAISE EXCEPTION 'This audio is from after the lesson window: it is refused';
  END IF;

  v_path := v_rec.class_id::text || '/' || v_rec.id::text || '/' || p_track || '/'
         || lpad(p_seq::text, 6, '0') || '.'
         || CASE v_rec.format WHEN 'opus-webm' THEN 'webm' WHEN 'flac' THEN 'flac' ELSE 'wav' END;

  INSERT INTO public.class_recording_chunks
    (recording_id, track, seq, storage_path, byte_size, sha256, t_start_ms, t_end_ms, registered_by)
  VALUES (p_recording, p_track, p_seq, v_path, p_byte_size, lower(p_sha256), p_t_start_ms, p_t_end_ms, v_uid)
  ON CONFLICT (recording_id, track, seq) DO NOTHING
  RETURNING id INTO v_new;

  SELECT * INTO v_row FROM public.class_recording_chunks
   WHERE recording_id = p_recording AND track = p_track AND seq = p_seq;
  IF v_new IS NULL AND (v_row.sha256 <> lower(p_sha256) OR v_row.byte_size <> p_byte_size
                        OR v_row.t_start_ms <> p_t_start_ms OR v_row.t_end_ms <> p_t_end_ms) THEN
    RAISE EXCEPTION 'Chunk % of the % track is already registered with different audio', p_seq, p_track;
  END IF;

  RETURN jsonb_build_object(
    'chunk_id', v_row.id, 'storage_path', v_row.storage_path,
    'already_registered', v_new IS NULL, 'confirmed', v_row.confirmed_at IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_register_chunk(uuid, text, integer, bigint, text, bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_register_chunk(uuid, text, integer, bigint, text, bigint, bigint) TO authenticated;

-- "The server has it": the object is in the bucket at the registered path and
-- storage reports the registered size - both read by the server. The page
-- also sends the SHA-256 of what it read BACK from storage; that check is for
-- the page's own safety (never drop local audio that did not round-trip) and
-- proves only that the page is honest. It is not evidence: Storage keeps no
-- hash, so the server cannot compute one here (C2's edge function may).
-- Only after this returns true may the page drop its local copy.
CREATE OR REPLACE FUNCTION public.recorder_confirm_chunk(p_chunk uuid, p_readback_sha256 text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.class_recording_chunks%ROWTYPE;
  v_owner uuid;
  v_size bigint;
BEGIN
  SELECT * INTO v_row FROM public.class_recording_chunks WHERE id = p_chunk FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such chunk'; END IF;
  SELECT started_by INTO v_owner FROM public.class_recordings WHERE id = v_row.recording_id;
  IF v_uid IS NULL OR v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not your recording' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_row.confirmed_at IS NOT NULL THEN RETURN true; END IF;

  IF p_readback_sha256 IS NULL OR lower(p_readback_sha256) <> v_row.sha256 THEN
    RAISE EXCEPTION 'What storage returned does not match the audio that was recorded: keep the local copy';
  END IF;
  SELECT NULLIF(o.metadata ->> 'size', '')::bigint INTO v_size
  FROM storage.objects o
  WHERE o.bucket_id = 'class-recordings' AND o.name = v_row.storage_path;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The file is not in storage: keep the local copy';
  END IF;
  IF v_size IS NULL OR v_size <> v_row.byte_size THEN
    RAISE EXCEPTION 'Storage holds % bytes, the recorder made %: keep the local copy',
      COALESCE(v_size::text, 'an unknown number of'), v_row.byte_size;
  END IF;

  UPDATE public.class_recording_chunks
     SET stored_size = v_size, confirmed_at = now()
   WHERE id = p_chunk;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_confirm_chunk(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_confirm_chunk(uuid, text) TO authenticated;

-- ---------------------------------------------------------------- deletion
-- Someone who may listen to the recording asks for it to go. It is removed by
-- the next retention run (or the admin's "delete now" in that function).
CREATE OR REPLACE FUNCTION public.recorder_request_deletion(p_recording uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.class_recordings%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.recorder_can_listen(v_rec.class_id, v_rec.session_id) THEN
    RAISE EXCEPTION 'Not your class' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Say why this recording should be deleted';
  END IF;
  IF v_rec.status = 'deleted' THEN RETURN; END IF;
  IF v_rec.status IN ('armed', 'recording', 'uploading') THEN
    UPDATE public.class_recordings
       SET status = 'abandoned', abandon_reason = 'deletion requested'
     WHERE id = p_recording;
  END IF;
  -- The update trigger stamps who asked and when.
  UPDATE public.class_recordings
     SET deletion_requested_at = now(),
         deletion_reason = btrim(p_reason),
         delete_after = LEAST(delete_after, now())
   WHERE id = p_recording;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_request_deletion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_request_deletion(uuid, text) TO authenticated;

-- What the retention job must remove now. SECURITY INVOKER: the service role
-- sees everything, an admin sees everything, anyone else what they may hear.
CREATE OR REPLACE FUNCTION public.recorder_retention_due(p_now timestamptz DEFAULT now())
RETURNS TABLE (recording_id uuid, class_id uuid, storage_prefix text, status text,
               delete_after timestamptz, deletion_requested boolean)
LANGUAGE sql
STABLE
AS $function$
  SELECT r.id, r.class_id, r.class_id::text || '/' || r.id::text || '/', r.status,
         r.delete_after, r.deletion_requested_at IS NOT NULL
  FROM public.class_recordings r
  WHERE r.audio_deleted_at IS NULL
    AND r.status IN ('complete', 'abandoned')
    AND r.delete_after <= p_now
  ORDER BY r.delete_after, r.id;
$function$;

REVOKE ALL ON FUNCTION public.recorder_retention_due(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_retention_due(timestamptz) TO authenticated, service_role;

-- Recordings that never finished: abandoned, so the row above picks them up.
CREATE OR REPLACE FUNCTION public.recorder_expire_stale(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_days integer;
  v_n integer;
BEGIN
  SELECT stale_upload_days INTO v_days FROM public.recorder_settings WHERE id = 1;
  IF v_days IS NULL THEN RETURN 0; END IF;
  UPDATE public.class_recordings
     SET status = 'abandoned', abandon_reason = 'never finished'
   WHERE status IN ('armed', 'recording', 'uploading')
     AND scheduled_end + make_interval(days => v_days) < p_now;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_expire_stale(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_expire_stale(timestamptz) TO service_role;

-- After the files are gone. Refused (by the trigger) while one is left.
CREATE OR REPLACE FUNCTION public.recorder_mark_audio_deleted(p_recording uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.class_recordings SET status = 'deleted'
   WHERE id = p_recording AND status IN ('complete', 'abandoned');
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_mark_audio_deleted(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_mark_audio_deleted(uuid) TO authenticated, service_role;

-- ================================================================ contract for D1
-- One row per recording. Every figure here is either the server's own
-- (timestamps it stamped, sizes storage reported at confirmation) or a
-- laptop claim BOUNDED by those, and named so:
--
--   was_completed            technical: it reached 'complete' (all chunks
--                            confirmed, manifest stored, spans consistent).
--                            Stays true after retention deletes the audio.
--   counts_as_held_evidence  STRICT - what D reads. Completed, AND the audio the
--                            server can vouch for, inside the scheduled lesson,
--                            covers at least held_min_fraction of it.
--   claimed_audio_ms         the laptop's chunk spans (longest track). A claim.
--   server_capture_ms        ended_at - started_at, both server-stamped.
--   verified_audio_ms        per track LEAST(claimed, server_capture_ms,
--                            stored bytes / format floor), longest track.
--   verified_lesson_ms       LEAST(verified_audio_ms, server-seen overlap with
--                            the scheduled lesson).
CREATE OR REPLACE VIEW public.recorder_session_evidence
WITH (security_invoker = true) AS
SELECT
  r.session_id,
  r.armed_session_id,
  r.id AS recording_id,
  r.class_id,
  r.status,
  r.purpose,
  r.completed_at IS NOT NULL AS was_completed,
  COALESCE(r.completed_at IS NOT NULL AND m.tracks_with_audio > 0
           AND LEAST(m.verified_audio_ms, w.lesson_overlap_ms) >= w.held_threshold_ms, false)
    AS counts_as_held_evidence,
  NOT COALESCE(LEAST(m.verified_audio_ms, w.lesson_overlap_ms) >= w.held_threshold_ms, false) AS too_short,
  r.started_by,
  r.armed_at,
  r.started_at,
  r.ended_at,
  r.completed_at,
  r.client_started_at,
  r.client_ended_at,
  r.scheduled_start,
  r.scheduled_end,
  w.server_capture_ms,
  w.lesson_overlap_ms,
  w.held_threshold_ms,
  COALESCE(m.claimed_audio_ms, 0)::bigint AS claimed_audio_ms,
  COALESCE(m.stored_bytes, 0)::bigint AS stored_bytes,
  COALESCE(m.verified_audio_ms, 0)::bigint AS verified_audio_ms,
  LEAST(COALESCE(m.verified_audio_ms, 0), w.lesson_overlap_ms)::bigint AS verified_lesson_ms,
  COALESCE(m.tracks_with_audio, 0)::integer AS tracks_with_audio,
  c.first_chunk_registered_at,
  c.last_chunk_registered_at,
  c.first_chunk_confirmed_at,
  c.last_chunk_confirmed_at
FROM public.class_recordings r
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN r.started_at IS NOT NULL AND r.ended_at IS NOT NULL
         THEN GREATEST(0, floor(extract(epoch FROM (r.ended_at - r.started_at)) * 1000))::bigint
         ELSE 0::bigint END AS server_capture_ms,
    CASE WHEN r.started_at IS NOT NULL AND r.ended_at IS NOT NULL
         THEN GREATEST(0, floor(extract(epoch FROM (LEAST(r.ended_at, r.scheduled_end)
                                                    - GREATEST(r.started_at, r.scheduled_start))) * 1000))::bigint
         ELSE 0::bigint END AS lesson_overlap_ms,
    ceil(r.held_min_fraction * extract(epoch FROM (r.scheduled_end - r.scheduled_start)) * 1000)::bigint
      AS held_threshold_ms
) w
LEFT JOIN LATERAL (
  SELECT max(t.claimed_ms) AS claimed_audio_ms,
         sum(t.stored_bytes) AS stored_bytes,
         max(LEAST(t.claimed_ms, w.server_capture_ms,
                   floor(t.stored_bytes * 1000 / r.min_bytes_per_sec)::bigint)) AS verified_audio_ms,
         count(*) AS tracks_with_audio
  FROM (
    SELECT k.track, sum(k.t_end_ms - k.t_start_ms)::bigint AS claimed_ms, sum(k.stored_size)::bigint AS stored_bytes
    FROM public.class_recording_chunks k
    WHERE k.recording_id = r.id AND k.confirmed_at IS NOT NULL AND k.stored_size IS NOT NULL
    GROUP BY k.track
  ) t
) m ON true
LEFT JOIN LATERAL (
  SELECT min(k.registered_at) AS first_chunk_registered_at,
         max(k.registered_at) AS last_chunk_registered_at,
         min(k.confirmed_at) AS first_chunk_confirmed_at,
         max(k.confirmed_at) AS last_chunk_confirmed_at
  FROM public.class_recording_chunks k
  WHERE k.recording_id = r.id
) c ON true;

-- ================================================================ RLS
ALTER TABLE public.recorder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recording_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorder_child_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorder_device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recording_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recording_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recording_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorder_audit_log ENABLE ROW LEVEL SECURITY;

-- Settings: staff read, an admin changes.
DROP POLICY IF EXISTS recorder_settings_read ON public.recorder_settings;
CREATE POLICY recorder_settings_read ON public.recorder_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'teacher'::public.app_role));

DROP POLICY IF EXISTS recorder_settings_admin_update ON public.recorder_settings;
CREATE POLICY recorder_settings_admin_update ON public.recorder_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- The switch: read by the class's teachers (today) and admins; written only
-- through recorder_set_class_recording (no INSERT/UPDATE grant, no write policy).
DROP POLICY IF EXISTS class_recording_settings_read ON public.class_recording_settings;
CREATE POLICY class_recording_settings_read ON public.class_recording_settings
  FOR SELECT TO authenticated
  USING (public.recorder_can_read_class(class_id));

-- Per-child consent: admins only. A teacher learns a count, not who.
DROP POLICY IF EXISTS recorder_child_consents_admin_read ON public.recorder_child_consents;
CREATE POLICY recorder_child_consents_admin_read ON public.recorder_child_consents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Device profiles: your own; admins read all.
DROP POLICY IF EXISTS recorder_device_profiles_own ON public.recorder_device_profiles;
CREATE POLICY recorder_device_profiles_own ON public.recorder_device_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid()
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'teacher'::public.app_role)))
  WITH CHECK (user_id = auth.uid()
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'teacher'::public.app_role)));

DROP POLICY IF EXISTS recorder_device_profiles_admin_read ON public.recorder_device_profiles;
CREATE POLICY recorder_device_profiles_admin_read ON public.recorder_device_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Recordings: whoever may listen to that recording; the person recording it
-- while it is open.
DROP POLICY IF EXISTS class_recordings_read ON public.class_recordings;
CREATE POLICY class_recordings_read ON public.class_recordings
  FOR SELECT TO authenticated
  USING (public.recorder_can_listen(class_id, session_id)
         OR (started_by = auth.uid() AND status IN ('armed', 'recording', 'uploading')));

DROP POLICY IF EXISTS class_recordings_insert ON public.class_recordings;
CREATE POLICY class_recordings_insert ON public.class_recordings
  FOR INSERT TO authenticated
  WITH CHECK (started_by = auth.uid() AND public.recorder_can_read_class(class_id));

DROP POLICY IF EXISTS class_recordings_update ON public.class_recordings;
CREATE POLICY class_recordings_update ON public.class_recordings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR (started_by = auth.uid() AND status IN ('armed', 'recording', 'uploading')))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR (started_by = auth.uid() AND status IN ('armed', 'recording', 'uploading', 'complete', 'abandoned')));

-- Tracks: described by the person recording, while it is open.
DROP POLICY IF EXISTS class_recording_tracks_read ON public.class_recording_tracks;
CREATE POLICY class_recording_tracks_read ON public.class_recording_tracks
  FOR SELECT TO authenticated
  USING (public.recorder_can_read_recording(recording_id));

DROP POLICY IF EXISTS class_recording_tracks_insert ON public.class_recording_tracks;
CREATE POLICY class_recording_tracks_insert ON public.class_recording_tracks
  FOR INSERT TO authenticated
  WITH CHECK (public.recorder_owns_open(recording_id));

DROP POLICY IF EXISTS class_recording_tracks_update ON public.class_recording_tracks;
CREATE POLICY class_recording_tracks_update ON public.class_recording_tracks
  FOR UPDATE TO authenticated
  USING (public.recorder_owns_open(recording_id))
  WITH CHECK (public.recorder_owns_open(recording_id));

-- Chunks: read only. Written through recorder_register_chunk / _confirm_chunk.
DROP POLICY IF EXISTS class_recording_chunks_read ON public.class_recording_chunks;
CREATE POLICY class_recording_chunks_read ON public.class_recording_chunks
  FOR SELECT TO authenticated
  USING (public.recorder_can_read_recording(recording_id));

-- Markers.
DROP POLICY IF EXISTS class_recording_markers_read ON public.class_recording_markers;
CREATE POLICY class_recording_markers_read ON public.class_recording_markers
  FOR SELECT TO authenticated
  USING (public.recorder_can_read_recording(recording_id));

DROP POLICY IF EXISTS class_recording_markers_insert ON public.class_recording_markers;
CREATE POLICY class_recording_markers_insert ON public.class_recording_markers
  FOR INSERT TO authenticated
  WITH CHECK (public.recorder_owns_open(recording_id));

DROP POLICY IF EXISTS class_recording_markers_delete ON public.class_recording_markers;
CREATE POLICY class_recording_markers_delete ON public.class_recording_markers
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND public.recorder_owns_open(recording_id));

-- Audit log: admins read everything; a person reads what they did themselves.
DROP POLICY IF EXISTS recorder_audit_log_read ON public.recorder_audit_log;
CREATE POLICY recorder_audit_log_read ON public.recorder_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR actor = auth.uid());

-- ================================================================ grants
-- 20260712023825 revoked the public defaults, so every grant is spelled out,
-- and only the ones a signed-in person needs: what is written through a
-- function is not writable directly.
REVOKE ALL ON public.recorder_settings, public.class_recording_settings, public.recorder_child_consents,
  public.recorder_device_profiles, public.class_recordings, public.class_recording_tracks,
  public.class_recording_chunks, public.class_recording_markers, public.recorder_audit_log,
  public.recorder_session_evidence FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE                 ON public.recorder_settings        TO authenticated;
GRANT SELECT                         ON public.class_recording_settings TO authenticated;
GRANT SELECT                         ON public.recorder_child_consents  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorder_device_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.class_recordings         TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.class_recording_tracks   TO authenticated;
GRANT SELECT                         ON public.class_recording_chunks   TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.class_recording_markers  TO authenticated;
GRANT SELECT                         ON public.recorder_audit_log       TO authenticated;
GRANT SELECT                         ON public.recorder_session_evidence TO authenticated;

GRANT ALL ON public.recorder_settings        TO service_role;
GRANT ALL ON public.class_recording_settings TO service_role;
GRANT ALL ON public.recorder_child_consents  TO service_role;
GRANT ALL ON public.recorder_device_profiles TO service_role;
GRANT ALL ON public.class_recordings         TO service_role;
GRANT ALL ON public.class_recording_tracks   TO service_role;
GRANT ALL ON public.class_recording_chunks   TO service_role;
GRANT ALL ON public.class_recording_markers  TO service_role;
GRANT ALL ON public.recorder_audit_log       TO service_role;
GRANT SELECT ON public.recorder_session_evidence TO service_role;

-- ================================================================ storage
-- 8 MB a file: a 60-second chunk of 48 kHz 16-bit mono PCM is 5.8 MB (and
-- tracks are capped at 48 kHz).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-recordings', 'class-recordings', false, 8388608,
        ARRAY['audio/webm', 'audio/flac', 'audio/x-flac', 'audio/wav', 'audio/x-wav', 'application/json'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- {class}/{recording}/manifest.json or {class}/{recording}/{track}/{000000}.{ext}.
-- A path that is anything else is a "no", never an error inside a policy.
CREATE OR REPLACE FUNCTION public.recorder_path_parts(
  p_name text, OUT class_id uuid, OUT recording_id uuid, OUT is_manifest boolean)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
BEGIN
  IF p_name ~ ('^' || u || '/' || u || '/manifest\.json$') THEN
    is_manifest := true;
  ELSIF p_name ~ ('^' || u || '/' || u || '/(teacher|room)/[0-9]{6}\.(webm|flac|wav)$') THEN
    is_manifest := false;
  ELSE
    RETURN;
  END IF;
  class_id := split_part(p_name, '/', 1)::uuid;
  recording_id := split_part(p_name, '/', 2)::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_path_parts(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_path_parts(text) TO authenticated, service_role;

-- Upload: the caller's own open recording, and for audio only the exact path
-- of a chunk that is registered and not yet confirmed. So a file cannot land
-- anywhere the database did not choose, and a confirmed chunk cannot be replaced.
CREATE OR REPLACE FUNCTION public.recorder_can_upload(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  v_status text;
BEGIN
  SELECT * INTO p FROM public.recorder_path_parts(p_name);
  IF p.recording_id IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT r.status INTO v_status FROM public.class_recordings r
   WHERE r.id = p.recording_id AND r.class_id = p.class_id AND r.started_by = auth.uid();
  IF v_status IS NULL THEN RETURN false; END IF;
  IF p.is_manifest THEN
    RETURN v_status = 'uploading';
  END IF;
  RETURN v_status IN ('recording', 'uploading') AND EXISTS (
    SELECT 1 FROM public.class_recording_chunks c
    WHERE c.recording_id = p.recording_id AND c.storage_path = p_name AND c.confirmed_at IS NULL);
END;
$$;

-- Read: whoever may listen to THAT recording (an admin, a standing teacher of
-- the class, the teacher of its own session). Not the person who recorded it
-- once they are none of those, never a teaching assistant, a family or a
-- student, and nothing once the recording is marked deleted.
CREATE OR REPLACE FUNCTION public.recorder_can_read_object(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM public.recorder_path_parts(p_name);
  IF p.recording_id IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.class_recordings r
    WHERE r.id = p.recording_id AND r.class_id = p.class_id AND r.status <> 'deleted'
      AND public.recorder_can_listen(r.class_id, r.session_id));
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_can_upload(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_can_read_object(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_can_upload(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recorder_can_read_object(text) TO authenticated, service_role;

DROP POLICY IF EXISTS class_recordings_storage_insert ON storage.objects;
CREATE POLICY class_recordings_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-recordings' AND public.recorder_can_upload(name));

DROP POLICY IF EXISTS class_recordings_storage_select ON storage.objects;
CREATE POLICY class_recordings_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'class-recordings' AND public.recorder_can_read_object(name));

-- No UPDATE policy: a stored file is never overwritten. No DELETE policy
-- either: files are removed only by the retention edge function (service
-- role, at 03:00 or on an admin's "delete now"), which lists, removes, checks
-- and then marks the recording deleted - so a removal is always logged and a
-- 'complete' row never points at files someone removed by hand.
DROP POLICY IF EXISTS class_recordings_storage_delete ON storage.objects;

COMMIT;
