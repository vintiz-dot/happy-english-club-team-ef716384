-- The lesson monitor report may carry its "voice" part (27 Nov 2026).
--
-- Why: since 85074066 (24 Nov 2026, voiceprints) the laptop job adds body.voice - the voice groups the teacher
-- names on the review page (src/lib/lessonMonitorVoices.ts reads body.voice.groups) - but
-- lesson_monitor_save_report (20261117090000) still allowed only the original eleven parts, so EVERY report
-- with a voice step was refused: "The report carries an unknown part: voice". Jupiter's lesson of 26 Nov was
-- transcribed twice and refused twice; no saved report has ever had a voice part.
--
-- What changes: 'voice' joins the allowed parts, and only in the shape scripts/lesson-monitor/voice.py
-- body_part() writes: an object with model, settings, groups (a list) and samples_seconds (child id ->
-- seconds). Nothing that could carry an embedding or another model's guess may ride along in it
-- (vec, vecs, embedding, alt, guesses, blind, models). Every other check is exactly as before; the
-- "names nobody" rule still applies to the whole body.
--
-- PASTE: after 20261117090000 (and 20261120090000, 20261124120000, which do not touch this function), in the
-- Supabase SQL editor. Safe to paste twice.

DO $guard$
BEGIN
  IF to_regprocedure('public.lesson_monitor_save_report(uuid,text,jsonb,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'The lesson monitor pilot (20261117090000) is not installed';
  END IF;
END
$guard$;

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
    IF v_key NOT IN ('schema', 'lesson', 'notes', 'lines', 'unwritten', 'targets', 'patterns', 'flags', 'talk_time', 'coverage', 'settings', 'voice') THEN
      RAISE EXCEPTION 'The report carries an unknown part: %', left(v_key, 40);
    END IF;
  END LOOP;
  IF p_body ? 'voice' THEN
    IF jsonb_typeof(p_body -> 'voice') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'The report''s voice part is not in the expected shape';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(p_body -> 'voice') LOOP
      IF v_key NOT IN ('model', 'settings', 'groups', 'samples_seconds') THEN
        RAISE EXCEPTION 'The report''s voice part carries an unknown part: %', left(v_key, 40);
      END IF;
    END LOOP;
    IF (p_body -> 'voice') ? 'groups' AND jsonb_typeof(p_body -> 'voice' -> 'groups') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'The report''s voice part is not in the expected shape';
    END IF;
    IF (p_body -> 'voice')::text ~* '"(vec|vecs|embedding|embeddings|alt|guesses|blind|models)"' THEN
      RAISE EXCEPTION 'The report''s voice part may not carry voice embeddings or other models'' guesses';
    END IF;
  END IF;
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
