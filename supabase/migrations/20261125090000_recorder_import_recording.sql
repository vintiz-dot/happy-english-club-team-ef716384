-- Importing a lesson recorded outside the app (owner, 25 Nov 2026: lessons recorded with the
-- laptop's own Sound Recorder while the app's recorder had crashed, to be transcribed and
-- reviewed like any other lesson).
--
-- The recorder refuses a recording after its lesson, on purpose: the server's own clock is what
-- makes a recording evidence. An import keeps that: it is a normal class_recordings row the
-- lesson monitor and the teacher's review read as they read every other, and it is NEVER
-- evidence that a lesson ran (every chunk reaches the server days after the moment it claims,
-- so the evidence view counts it as late audio, which never counts).
--
-- Who and when, exactly as for recording in the app, checked here:
--   * an admin person (never the service role, never a teacher);
--   * the lesson is a real, not cancelled session with a time;
--   * recording is switched on for the class, confirmed under the current wording, and every
--     child enrolled on the lesson day has recording consent on record;
--   * a lesson from before the class's consent confirmation needs the admin's own statement
--     of how the parents had agreed by then (kept on the row and in the audit log);
--   * the file overlaps the lesson, is 1 minute to 4 hours long, ended before now, and the
--     lesson is not past its retention date (it would be deleted at once).
-- The audio is the room track only, 16 kHz mono FLAC in chunks of at most 60 s, uploaded to the
-- recorder's own bucket under the recorder's own storage policy (the admin who began the import
-- is its started_by; a chunk is uploadable only while registered and unconfirmed) and
-- confirmed with the existing recorder_confirm_chunk. Retention, deletion requests, consent
-- withdrawal and the 24-hour deletion after a report all apply to it unchanged.
--
-- What changes:
--   1. class_recordings: imported_at, import_note, import_consent_note (NULL for every
--      recording made in the app).
--   2. recorder_audit_log: the action 'imported'.
--   3. The two recording triggers let ONLY these functions' own write through, flagged
--      transaction-locally as recorder.server_write = 'import:<that recording>' (the same flag
--      the recorder's own server paths use; an API caller cannot set it). Patched in the
--      INSTALLED function text at one marker each, found exactly once, as 20261124140000 did.
--   4. recorder_import_begin / recorder_import_chunk / recorder_import_finish.
--
-- PASTE: after 20261124150000, in the Supabase SQL editor. Idempotent. It refuses to install
-- (nothing changed) when the class recorder is missing or a marker is not found exactly once.
-- No edge function to deploy: scripts/lesson-monitor/import_recording.py calls these.

BEGIN;

DO $pre$
DECLARE
  v_ins text;
  v_upd text;
BEGIN
  IF to_regclass('public.class_recordings') IS NULL
     OR to_regprocedure('public.recorder__recording_before_insert()') IS NULL
     OR to_regprocedure('public.recorder__recording_before_update()') IS NULL
     OR to_regprocedure('public.recorder_confirm_chunk(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the class recorder (20261112100000) is not installed';
  END IF;
  v_ins := pg_get_functiondef('public.recorder__recording_before_insert()'::regprocedure);
  v_upd := pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure);
  IF v_ins NOT LIKE '%''import:''%'
     AND (length(v_ins) - length(replace(v_ins, 'IF v_uid IS NULL THEN', ''))) / length('IF v_uid IS NULL THEN') <> 1 THEN
    RAISE EXCEPTION 'Refusing to install: the recording insert trigger is not the one this file was written against';
  END IF;
  IF v_upd NOT LIKE '%''import:''%'
     AND (length(v_upd) - length(replace(v_upd, 'IF NEW.id IS DISTINCT FROM OLD.id', ''))) / length('IF NEW.id IS DISTINCT FROM OLD.id') <> 1 THEN
    RAISE EXCEPTION 'Refusing to install: the recording update trigger is not the one this file was written against';
  END IF;
END
$pre$;

-- ================================================================ 1. columns
ALTER TABLE public.class_recordings
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_note text,
  ADD COLUMN IF NOT EXISTS import_consent_note text;

-- ================================================================ 2. audit action
ALTER TABLE public.recorder_audit_log DROP CONSTRAINT IF EXISTS recorder_audit_log_action_check;
ALTER TABLE public.recorder_audit_log ADD CONSTRAINT recorder_audit_log_action_check CHECK (action IN (
  'switch_on', 'switch_off', 'switch_off_auto',
  'child_consent_granted', 'child_consent_withdrawn',
  'armed', 'started', 'stopped', 'completed', 'abandoned',
  'stop_requested', 'deletion_requested', 'retention_changed',
  'audio_deleted', 'settings_changed', 'imported'));

-- ================================================================ 3. the triggers
DO $patch$
DECLARE
  v_ins text := pg_get_functiondef('public.recorder__recording_before_insert()'::regprocedure);
  v_upd text := pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure);
BEGIN
  IF v_ins NOT LIKE '%''import:''%' THEN
    EXECUTE replace(v_ins, 'IF v_uid IS NULL THEN',
      'IF COALESCE(current_setting(''recorder.server_write'', true), '''') = ''import:'' || NEW.id::text THEN RETURN NEW; END IF;'
      || E'\n  IF v_uid IS NULL THEN');
  END IF;
  IF v_upd NOT LIKE '%''import:''%' THEN
    EXECUTE replace(v_upd, 'IF NEW.id IS DISTINCT FROM OLD.id',
      'IF v_flag = ''import:'' || OLD.id::text AND OLD.imported_at IS NOT NULL AND NEW.id = OLD.id THEN NEW.updated_at := v_now; RETURN NEW; END IF;'
      || E'\n  IF NEW.id IS DISTINCT FROM OLD.id');
  END IF;
END
$patch$;

-- ================================================================ 4. the import
CREATE OR REPLACE FUNCTION public.recorder_import_begin(
  p_session uuid, p_started_at timestamptz, p_duration_ms bigint, p_note text, p_consent_note text DEFAULT NULL)
RETURNS jsonb
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
  v_file_end timestamptz;
  v_id uuid;
  v_old public.class_recordings%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can import a lesson recording' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_session IS NULL OR p_started_at IS NULL OR p_duration_ms IS NULL THEN
    RAISE EXCEPTION 'Say which lesson, when the file started and how long it is';
  END IF;
  IF btrim(COALESCE(p_note, '')) = '' THEN
    RAISE EXCEPTION 'Say where the file came from (for example "laptop Sound Recorder, app recorder crashed")';
  END IF;
  IF p_duration_ms < 60000 OR p_duration_ms > 4 * 3600000 THEN
    RAISE EXCEPTION 'A lesson recording is 1 minute to 4 hours long (this one is % s)', p_duration_ms / 1000;
  END IF;
  v_file_end := p_started_at + p_duration_ms * INTERVAL '1 millisecond';
  IF v_file_end > v_now THEN
    RAISE EXCEPTION 'The file cannot end in the future';
  END IF;

  SELECT * INTO v_set FROM public.recorder_settings WHERE id = 1;
  IF NOT FOUND OR v_set.consent_wording_version IS NULL THEN
    RAISE EXCEPTION 'Recorder settings are missing: the import is refused';
  END IF;
  SELECT s.id, s.class_id, s.date, s.start_time, s.end_time, s.status
    INTO v_sess FROM public.sessions s WHERE s.id = p_session FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such session'; END IF;
  IF v_sess.status = 'Canceled'::public.session_status THEN
    RAISE EXCEPTION 'This lesson is cancelled: it cannot have a recording';
  END IF;
  IF v_sess.date IS NULL OR v_sess.start_time IS NULL OR v_sess.end_time IS NULL THEN
    RAISE EXCEPTION 'This lesson has no time';
  END IF;
  v_start := (v_sess.date + v_sess.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_end := (v_sess.date + v_sess.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  IF v_end <= v_start THEN v_end := v_end + INTERVAL '1 day'; END IF;
  IF p_started_at >= v_end OR v_file_end <= v_start THEN
    RAISE EXCEPTION 'The file (% to %) does not overlap the lesson (% to %)', p_started_at, v_file_end, v_start, v_end;
  END IF;
  IF v_end + make_interval(days => v_set.retention_days) <= v_now THEN
    RAISE EXCEPTION 'This lesson is past its % days of keeping: it would be deleted at once', v_set.retention_days;
  END IF;

  SELECT * INTO v_switch FROM public.class_recording_settings WHERE class_id = v_sess.class_id FOR SHARE;
  IF NOT FOUND OR v_switch.recording_enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'Recording is switched off for this class' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_switch.consent_confirmed_at IS NULL OR v_switch.consent_wording_version IS DISTINCT FROM v_set.consent_wording_version THEN
    RAISE EXCEPTION 'No parental consent confirmation under the current wording is on record for this class'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_missing := public.recorder__children_without_consent(v_sess.class_id, v_sess.date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION '% child(ren) enrolled that day have no recording consent on record', COALESCE(v_missing, -1)
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_start < v_switch.consent_confirmed_at AND btrim(COALESCE(p_consent_note, '')) = '' THEN
    RAISE EXCEPTION 'This lesson was before the class''s recording consent was confirmed (%): say how the parents had agreed by then',
      v_switch.consent_confirmed_at USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The same file again: carry on with it (an upload that broke off), or say it is done.
  SELECT * INTO v_old FROM public.class_recordings
   WHERE armed_session_id = v_sess.id AND imported_at IS NOT NULL AND started_at = p_started_at
     AND status IN ('uploading', 'complete')
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    IF v_old.status = 'complete' THEN
      RAISE EXCEPTION 'This file is already imported for this lesson (recording %)', v_old.id;
    END IF;
    IF v_old.started_by <> v_uid THEN
      RAISE EXCEPTION 'Another admin began importing this file (recording %)', v_old.id;
    END IF;
    RETURN jsonb_build_object('recording_id', v_old.id, 'class_id', v_old.class_id, 'resumed', true,
                              'chunk_ms', v_old.chunk_ms);
  END IF;

  v_id := gen_random_uuid();
  PERFORM set_config('recorder.server_write', 'import:' || v_id::text, true);
  INSERT INTO public.class_recordings (
    id, class_id, session_id, armed_session_id, session_date, scheduled_start, scheduled_end,
    capture_opens_at, capture_closes_at, purpose, status, format, chunk_ms, max_duration_ms,
    min_bytes_per_sec, clock_tolerance_ms, late_after_ms, evidence_min_fraction, started_by,
    client_info, armed_at, started_at, ended_at, stopped_by, stop_reason, pre_start_ms, delete_after,
    created_at, updated_at, imported_at, import_note, import_consent_note)
  VALUES (
    v_id, v_sess.class_id, v_sess.id, v_sess.id, v_sess.date, v_start, v_end,
    LEAST(v_start, p_started_at), GREATEST(v_end, v_file_end), 'lesson', 'uploading', 'flac', 60000,
    floor(extract(epoch FROM (GREATEST(v_end, v_file_end) - LEAST(v_start, p_started_at))) * 1000)::bigint,
    v_set.min_bytes_per_sec_flac, v_set.clock_tolerance_seconds * 1000, v_set.late_after_minutes * 60000,
    v_set.evidence_min_fraction, v_uid,
    jsonb_build_object('imported', true), v_now, p_started_at, v_file_end, v_uid, 'admin', 0,
    v_end + make_interval(days => v_set.retention_days),
    v_now, v_now, v_now, btrim(p_note), NULLIF(btrim(COALESCE(p_consent_note, '')), ''));
  INSERT INTO public.class_recording_tracks (recording_id, track, sample_rate, channel_count, codec, applied_settings)
  VALUES (v_id, 'room', 16000, 1, 'flac', jsonb_build_object('imported', true));
  PERFORM set_config('recorder.server_write', '', true);

  PERFORM public.recorder__audit('imported', v_sess.class_id, v_sess.id, v_id, NULL,
    jsonb_build_object('file_started_at', p_started_at, 'file_ended_at', v_file_end, 'note', btrim(p_note),
                       'consent_note', NULLIF(btrim(COALESCE(p_consent_note, '')), ''),
                       'consent_confirmed_at', v_switch.consent_confirmed_at));
  RETURN jsonb_build_object('recording_id', v_id, 'class_id', v_sess.class_id, 'resumed', false, 'chunk_ms', 60000);
END;
$$;

CREATE OR REPLACE FUNCTION public.recorder_import_chunk(
  p_recording uuid, p_seq integer, p_byte_size bigint, p_sha256 text, p_t_start_ms bigint, p_t_end_ms bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rec public.class_recordings%ROWTYPE;
  v_span_ms bigint;
  v_path text;
  v_new uuid;
  v_row public.class_recording_chunks%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR SHARE;
  IF NOT FOUND OR v_uid IS NULL OR v_rec.started_by <> v_uid OR v_rec.imported_at IS NULL
     OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Not an import of yours' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_rec.status <> 'uploading' THEN
    RAISE EXCEPTION 'This import is % and takes no more audio', v_rec.status;
  END IF;
  IF p_seq IS NULL OR p_seq < 0 OR p_seq > 99999 OR p_byte_size IS NULL OR p_byte_size < 40
     OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
     OR p_t_start_ms IS NULL OR p_t_end_ms IS NULL OR p_t_start_ms < 0 OR p_t_end_ms <= p_t_start_ms THEN
    RAISE EXCEPTION 'A chunk needs a number, a size, a SHA-256 and a time span';
  END IF;
  IF p_t_end_ms - p_t_start_ms > v_rec.chunk_ms + v_rec.clock_tolerance_ms THEN
    RAISE EXCEPTION 'A chunk is at most % ms of audio', v_rec.chunk_ms;
  END IF;
  v_span_ms := floor(extract(epoch FROM (v_rec.ended_at - v_rec.started_at)) * 1000)::bigint;
  IF p_t_end_ms > v_span_ms + v_rec.clock_tolerance_ms THEN
    RAISE EXCEPTION 'This chunk ends after the file does (% ms)', v_span_ms;
  END IF;
  v_path := v_rec.class_id::text || '/' || v_rec.id::text || '/room/' || lpad(p_seq::text, 6, '0') || '.flac';
  INSERT INTO public.class_recording_chunks
    (recording_id, track, seq, storage_path, byte_size, sha256, t_start_ms, t_end_ms, registered_by, registered_at, below_floor)
  VALUES (p_recording, 'room', p_seq, v_path, p_byte_size, lower(p_sha256), p_t_start_ms, p_t_end_ms, v_uid,
          clock_timestamp(), p_byte_size * 1000 < v_rec.min_bytes_per_sec::bigint * (p_t_end_ms - p_t_start_ms))
  ON CONFLICT (recording_id, track, seq) DO NOTHING
  RETURNING id INTO v_new;
  SELECT * INTO v_row FROM public.class_recording_chunks WHERE recording_id = p_recording AND track = 'room' AND seq = p_seq;
  IF v_new IS NULL AND (v_row.sha256 <> lower(p_sha256) OR v_row.byte_size <> p_byte_size
                        OR v_row.t_start_ms <> p_t_start_ms OR v_row.t_end_ms <> p_t_end_ms) THEN
    RAISE EXCEPTION 'Chunk % is already registered with different audio', p_seq;
  END IF;
  RETURN jsonb_build_object('chunk_id', v_row.id, 'storage_path', v_row.storage_path,
                            'already_registered', v_new IS NULL, 'confirmed', v_row.confirmed_at IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.recorder_import_finish(p_recording uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rec public.class_recordings%ROWTYPE;
  v_n integer;
  v_unconfirmed integer;
  v_max_seq integer;
  v_bytes bigint;
  v_ms bigint;
  v_overlap boolean;
  v_missing_files integer;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR UPDATE;
  IF NOT FOUND OR v_uid IS NULL OR v_rec.started_by <> v_uid OR v_rec.imported_at IS NULL
     OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Not an import of yours' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_rec.status = 'complete' THEN
    RETURN jsonb_build_object('recording_id', v_rec.id, 'already_complete', true);
  END IF;
  IF v_rec.status <> 'uploading' THEN
    RAISE EXCEPTION 'This import is % and cannot be finished', v_rec.status;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE confirmed_at IS NULL OR stored_size IS DISTINCT FROM byte_size),
         max(seq), sum(byte_size), sum(t_end_ms - t_start_ms)
    INTO v_n, v_unconfirmed, v_max_seq, v_bytes, v_ms
    FROM public.class_recording_chunks WHERE recording_id = p_recording AND track = 'room';
  IF v_n = 0 THEN RAISE EXCEPTION 'An import with no audio cannot be finished'; END IF;
  IF v_unconfirmed > 0 THEN RAISE EXCEPTION '% chunk(s) are not confirmed in storage', v_unconfirmed; END IF;
  IF v_max_seq <> v_n - 1 THEN RAISE EXCEPTION 'Chunks are missing: % registered, the last is number %', v_n, v_max_seq; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.class_recording_chunks a JOIN public.class_recording_chunks b
      ON a.recording_id = b.recording_id AND a.track = b.track AND b.seq = a.seq + 1
     WHERE a.recording_id = p_recording AND b.t_start_ms < a.t_end_ms) INTO v_overlap;
  IF v_overlap THEN RAISE EXCEPTION 'Two chunks overlap: the audio would be counted twice'; END IF;
  SELECT count(*) INTO v_missing_files FROM public.class_recording_chunks c
   WHERE c.recording_id = p_recording AND NOT EXISTS (
     SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'class-recorder-audio' AND o.name = c.storage_path
       AND NULLIF(o.metadata ->> 'size', '')::bigint = c.byte_size);
  IF v_missing_files > 0 THEN RAISE EXCEPTION '% chunk file(s) are not in storage at their size', v_missing_files; END IF;

  UPDATE public.class_recording_tracks SET chunk_count = v_n, total_bytes = v_bytes, total_ms = v_ms
   WHERE recording_id = p_recording AND track = 'room';
  PERFORM set_config('recorder.server_write', 'import:' || p_recording::text, true);
  UPDATE public.class_recordings SET status = 'complete', completed_at = now() WHERE id = p_recording;
  PERFORM set_config('recorder.server_write', '', true);
  RETURN jsonb_build_object('recording_id', p_recording, 'chunks', v_n, 'bytes', v_bytes, 'audio_ms', v_ms);
END;
$$;

REVOKE ALL ON FUNCTION public.recorder_import_begin(uuid, timestamptz, bigint, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_import_chunk(uuid, integer, bigint, text, bigint, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_import_finish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_import_begin(uuid, timestamptz, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_import_chunk(uuid, integer, bigint, text, bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_import_finish(uuid) TO authenticated;

DO $post$
BEGIN
  IF pg_get_functiondef('public.recorder__recording_before_insert()'::regprocedure) NOT LIKE '%''import:'' || NEW.id::text%'
     OR pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) NOT LIKE '%''import:'' || OLD.id::text%' THEN
    RAISE EXCEPTION 'The recording triggers were not patched as expected: nothing installed';
  END IF;
END
$post$;

COMMIT;
