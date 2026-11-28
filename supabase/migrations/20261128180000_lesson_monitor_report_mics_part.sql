-- The lesson monitor report may carry its "mics" part (28 Nov 2026, the four Lark mics among the children).
--
-- Why: the teacher now wears the GCK lapel and four Hollyland LARK MAX 2 transmitters sit among the children. For
-- such a lesson the server's speaker engine (scripts/lesson-monitor/multimic.py) writes body.mics:
--   { teacher_worn: true, engine, tracks: ["mic1", ...], alignment: {...}, speaking: {...}, map_suggestions: [...],
--     settings: {...} }
-- The review page shows talk time and the teacher's lines again only when mics.teacher_worn is true
-- (src/lib/lessonMonitor.ts micRolesKnown, 1491c3d5). Until now lesson_monitor_save_report refused any report
-- carrying it ("unknown part: mics"); the engine then saves the report without it, so talk time stays hidden.
--
-- What changes: 'mics' joins the allowed parts, an object with only the keys above, teacher_worn a boolean, and
-- nothing that could carry an embedding (vec, vecs, embedding, guesses, ...). Child ids appear only as values
-- (speaking.children_s keys, map_suggestions[].suggested), like voice.samples_seconds; the "names nobody" rule
-- (no student_id / student_name / ... key anywhere) still applies to the whole body. Every other check is exactly
-- as in 20261127110000.
--
-- PASTE: after 20261127110000_lesson_monitor_report_voice_part.sql, in the Supabase SQL editor. Safe to paste twice.

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
    IF v_key NOT IN ('schema', 'lesson', 'notes', 'lines', 'unwritten', 'targets', 'patterns', 'flags', 'talk_time', 'coverage', 'settings', 'voice', 'mics') THEN
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
  IF p_body ? 'mics' THEN
    IF jsonb_typeof(p_body -> 'mics') IS DISTINCT FROM 'object'
       OR jsonb_typeof(p_body -> 'mics' -> 'teacher_worn') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'The report''s mics part is not in the expected shape';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(p_body -> 'mics') LOOP
      IF v_key NOT IN ('teacher_worn', 'engine', 'tracks', 'alignment', 'speaking', 'map_suggestions', 'settings') THEN
        RAISE EXCEPTION 'The report''s mics part carries an unknown part: %', left(v_key, 40);
      END IF;
    END LOOP;
    IF (p_body -> 'mics')::text ~* '"(vec|vecs|embedding|embeddings|alt|guesses|blind|models)"' THEN
      RAISE EXCEPTION 'The report''s mics part may not carry voice embeddings or other models'' guesses';
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
