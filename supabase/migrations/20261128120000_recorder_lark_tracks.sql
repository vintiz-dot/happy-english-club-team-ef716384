-- Lark transmitters as extra tracks of a lesson's recording (owner, 28 Nov 2026: a Hollyland LARK MAX 2
-- kit, four transmitters worn among the children, each recording internally to its own WAV files).
--
-- After class the lesson's teacher (or an admin) adds each transmitter's recording to the lesson's
-- class_recordings row from the Lessons page ("Add the Lark microphones", src/components/recorder/LarkImport.tsx).
-- The browser decodes the WAV files, resamples to 16 kHz mono, encodes FLAC chunks and uploads them through the
-- one file store, exactly like the room track. Nothing here aligns anything: the lesson monitor's voice engine
-- lines the transmitters up with the room/teacher timeline itself (clap anchors, cross-correlation).
--
-- THE CONTRACT (scripts/lesson-monitor, the voice engine, reads exactly this)
--   class_recording_tracks.track   'mic1' | 'mic2' | 'mic3' | 'mic4' (the sticker number on the transmitter),
--                                   beside 'teacher' and 'room' on the SAME recording row.
--   class_recording_chunks         the same table, same bucket (class-recorder-audio, in R2) and path scheme:
--                                   {class}/{recording}/mic<N>/{000000}.flac, FLAC, 16 kHz, mono, 16-bit,
--                                   chunks of at most 4 minutes (240 000 ms: a worst-case 4-minute FLAC chunk,
--                                   7.7 MB, still fits the Supabase bucket's 8 MB limit if a file ever falls back
--                                   there). Each chunk is a complete FLAC file; consecutive chunks join
--                                   sample-exactly. t_start_ms / t_end_ms are relative to the START OF THAT
--                                   TRANSMITTER'S OWN RECORDING (its first file's first sample), NOT to the
--                                   recording's t = 0. Split files are joined in order; a gap between two files
--                                   whose recorded start times say so is filled with digital silence (so the
--                                   timeline stays the transmitter's clock) and listed in `source.files[].offset_ms`.
--   class_recording_tracks.source  jsonb, NULL for teacher/room. For a mic track:
--                                   { "kind": "lark", "transmitter": 1-4,
--                                     "files": [ { "name", "bytes", "last_modified", "offset_ms", "duration_ms",
--                                                  "sample_rate", "bit_depth", "float", "channels",
--                                                  "recorded_start", "time_reference_samples", "timecode", "device" } ],
--                                     "sample_rate": original Hz, "bit_depth": 16|24|32, "float": bool,
--                                     "recorded_start": the first file's start as the device wrote it
--                                                       (BWF bext OriginationDate + TimeReference, else iXML,
--                                                       else NULL): "YYYY-MM-DDTHH:MM:SS.mmm", device clock,
--                                                       no time zone,
--                                     "duration_ms": the joined timeline's length,
--                                     "device": what identifies the transmitter itself (iXML serial/device tags, BWF
--                                               OriginatorReference / Originator / Description, a serial in the file
--                                               name), also per file; NULL when nothing does. The page remembers which
--                                               device was which sticker number and warns when the teacher's choice
--                                               contradicts it; the voice engine checks the audio for swapped mics. }
--                                   sample_rate on the track row itself is the STORED rate (16000).
--   class_recording_tracks.import_state  NULL for teacher/room; 'importing' while the upload runs, 'complete'
--                                   once every chunk is confirmed in storage at its byte count.
--   import_by / import_started_at / import_updated_at / import_completed_at / expected_ms: who, when, how long.
--
-- THE "IMPORT IN PROGRESS" SIGNAL: public.recorder_mic_import_in_progress(recording uuid) -> boolean.
--   True while a mic track of the recording is 'importing', was touched in the last 6 hours, the class is still
--   switched on and nobody asked for the recording's deletion. The monitor must not start a recording while it is
--   true. A recording is ready for the monitor when its teacher/room tracks are complete, as before; mic tracks are
--   optional (0-4) and may arrive hours later (import_completed_at says when).
--
-- WHO AND WHEN (checked here, whatever the page sends)
--   * the recording is 'complete' (teacher/room done), its audio not deleted, no deletion asked for;
--   * the caller may record that lesson (recorder__may_record: an admin, a standing teacher of the class, the
--     teacher of that session); never the service role;
--   * the class is still switched on, consent confirmed under the current wording, every child enrolled that
--     day has consent (a consent withdrawal switches the class off, which stops every mic import at once);
--   * the transmitter's recording is 1 minute to the lesson's length + 90 minutes, and at least a quarter of it;
--   * one person imports a transmitter; the same files again resume (a dropped connection), other files are refused.
--   A mic chunk counts for nothing as evidence that a lesson ran: it is registered late by construction
--   (recorder_lark_chunk refuses one that would not be), so the evidence view never counts it.
--
-- RETENTION: the mic chunks sit under the recording's own prefix, so recorder-retention removes them with the
--   recording (from R2 and Supabase), and the deleted / before-delete triggers already refuse while any file is
--   left under the prefix. A deletion request deletes them with the rest. recorder_transcribed_audio_deletable
--   (installed by 20261127140000) gets one more condition: never while a mic import is in progress.
--
-- What changes:
--   1. class_recording_tracks: the track CHECK takes mic1..mic4; the columns above; mic tracks only with import_state.
--   2. Its insert/update policies stay the page's own for teacher/room only (a mic track is written only here).
--   3. recorder_path_parts takes mic1..mic4; recorder_can_upload lets the importer upload a registered,
--      unconfirmed mic chunk (teacher/room unchanged, copied from 20261112100000).
--   4. recorder_lark_begin / recorder_lark_chunk / recorder_lark_confirm / recorder_lark_finish,
--      recorder_mic_import_in_progress; audit actions 'mic_import_started', 'mic_imported'.
--   5. recorder_transcribed_audio_deletable: also NOT recorder_mic_import_in_progress.
--
-- PASTE: after 20261127140000 AND after mic-map's lesson_mic_seats migration, in the Supabase SQL editor.
-- Idempotent. It refuses to install (nothing changed) when the recorder, the R2 helpers (20261127090000) or the
-- voice-group deletion rule (20261127140000) are missing. No edge function to deploy.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.class_recording_tracks') IS NULL
     OR to_regprocedure('public.recorder__may_record(uuid,uuid,uuid)') IS NULL
     OR to_regprocedure('public.recorder_can_upload(text)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the class recorder (20261112100000) is not installed';
  END IF;
  IF to_regprocedure('public.recorder__object_size(text)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the recorder audio in R2 (20261127090000) is not installed';
  END IF;
  IF to_regprocedure('public.recorder__voice_groups_waiting(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the voice-group deletion rule (20261127140000) is not installed';
  END IF;
END
$pre$;

-- ================================================================ 1. the tracks
ALTER TABLE public.class_recording_tracks DROP CONSTRAINT IF EXISTS class_recording_tracks_track_check;
ALTER TABLE public.class_recording_tracks ADD CONSTRAINT class_recording_tracks_track_check
  CHECK (track IN ('teacher', 'room', 'mic1', 'mic2', 'mic3', 'mic4'));

ALTER TABLE public.class_recording_tracks
  ADD COLUMN IF NOT EXISTS source jsonb,
  ADD COLUMN IF NOT EXISTS import_state text,
  ADD COLUMN IF NOT EXISTS import_by uuid,
  ADD COLUMN IF NOT EXISTS import_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_ms bigint;

ALTER TABLE public.class_recording_tracks DROP CONSTRAINT IF EXISTS class_recording_tracks_import_state;
ALTER TABLE public.class_recording_tracks ADD CONSTRAINT class_recording_tracks_import_state
  CHECK (import_state IS NULL OR import_state IN ('importing', 'complete'));
-- A mic track exists only as an import; teacher/room never carry one.
ALTER TABLE public.class_recording_tracks DROP CONSTRAINT IF EXISTS class_recording_tracks_mic_is_import;
ALTER TABLE public.class_recording_tracks ADD CONSTRAINT class_recording_tracks_mic_is_import
  CHECK ((track IN ('teacher', 'room')) = (import_state IS NULL AND source IS NULL));

-- ================================================================ 2. the page writes teacher/room only
DROP POLICY IF EXISTS class_recording_tracks_insert ON public.class_recording_tracks;
CREATE POLICY class_recording_tracks_insert ON public.class_recording_tracks
  FOR INSERT TO authenticated
  WITH CHECK (public.recorder_owns_open(recording_id) AND track IN ('teacher', 'room'));

DROP POLICY IF EXISTS class_recording_tracks_update ON public.class_recording_tracks;
CREATE POLICY class_recording_tracks_update ON public.class_recording_tracks
  FOR UPDATE TO authenticated
  USING (public.recorder_owns_open(recording_id) AND track IN ('teacher', 'room'))
  WITH CHECK (public.recorder_owns_open(recording_id) AND track IN ('teacher', 'room'));

-- ================================================================ 3. paths and uploads
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
  ELSIF p_name ~ ('^' || u || '/' || u || '/(teacher|room|mic[1-4])/[0-9]{6}\.(webm|flac|wav)$') THEN
    is_manifest := false;
  ELSE
    RETURN;
  END IF;
  class_id := split_part(p_name, '/', 1)::uuid;
  recording_id := split_part(p_name, '/', 2)::uuid;
END;
$$;

-- A mic import may still take audio from this person: the one rule for begin, chunk, confirm, finish and the
-- upload policy. Internal.
CREATE OR REPLACE FUNCTION public.recorder__mic_import_open(p_recording uuid, p_track text, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  SELECT p_user IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.class_recordings r
    JOIN public.class_recording_tracks t ON t.recording_id = r.id AND t.track = p_track
    JOIN public.class_recording_settings s ON s.class_id = r.class_id
    JOIN public.recorder_settings rs ON rs.id = 1
    WHERE r.id = p_recording
      AND r.status = 'complete' AND r.audio_deleted_at IS NULL AND r.deletion_requested_at IS NULL
      AND t.import_state = 'importing' AND t.import_by = p_user
      AND s.recording_enabled AND s.consent_wording_version IS NOT DISTINCT FROM rs.consent_wording_version
      AND public.recorder__may_record(p_user, r.armed_session_id, r.class_id));
$function$;
REVOKE ALL ON FUNCTION public.recorder__mic_import_open(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- Teacher/room exactly as 20261112100000 wrote it; a mic chunk: the importer's own registered, unconfirmed chunk.
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
  v_track text := split_part(p_name, '/', 3);
BEGIN
  SELECT * INTO p FROM public.recorder_path_parts(p_name);
  IF p.recording_id IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT p.is_manifest AND v_track IN ('mic1', 'mic2', 'mic3', 'mic4') THEN
    RETURN EXISTS (SELECT 1 FROM public.class_recordings r WHERE r.id = p.recording_id AND r.class_id = p.class_id)
       AND public.recorder__mic_import_open(p.recording_id, v_track, auth.uid())
       AND EXISTS (
         SELECT 1 FROM public.class_recording_chunks c
         WHERE c.recording_id = p.recording_id AND c.track = v_track AND c.storage_path = p_name
           AND c.confirmed_at IS NULL AND c.registered_by = auth.uid());
  END IF;
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
REVOKE ALL ON FUNCTION public.recorder_can_upload(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_can_upload(text) TO authenticated, service_role;

-- ================================================================ 4. audit actions
ALTER TABLE public.recorder_audit_log DROP CONSTRAINT IF EXISTS recorder_audit_log_action_check;
ALTER TABLE public.recorder_audit_log ADD CONSTRAINT recorder_audit_log_action_check CHECK (action IN (
  'switch_on', 'switch_off', 'switch_off_auto',
  'child_consent_granted', 'child_consent_withdrawn',
  'armed', 'started', 'stopped', 'completed', 'abandoned',
  'stop_requested', 'deletion_requested', 'retention_changed',
  'audio_deleted', 'settings_changed', 'imported',
  'mic_import_started', 'mic_imported'));

-- ================================================================ 4. the import
-- p_source: the page's description (see the header). Kept as sent, after the checks below; the server adds nothing.
CREATE OR REPLACE FUNCTION public.recorder_lark_begin(
  p_recording uuid, p_transmitter integer, p_duration_ms bigint, p_source jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_rec public.class_recordings%ROWTYPE;
  v_set public.recorder_settings%ROWTYPE;
  v_switch public.class_recording_settings%ROWTYPE;
  v_track text;
  v_old public.class_recording_tracks%ROWTYPE;
  v_lesson_ms bigint;
  v_missing integer;
  v_done jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'A transmitter is added by a signed-in teacher or admin' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_transmitter IS NULL OR p_transmitter NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'The transmitter is number 1, 2, 3 or 4 (the sticker on it)';
  END IF;
  v_track := 'mic' || p_transmitter::text;
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR SHARE;
  IF NOT FOUND OR NOT public.recorder__may_record(v_uid, v_rec.armed_session_id, v_rec.class_id) THEN
    RAISE EXCEPTION 'Only a teacher of this lesson or an admin can add its microphones' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_rec.status <> 'complete' OR v_rec.audio_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'The lesson''s recording is % : microphones are added to a complete recording whose audio is still kept', v_rec.status;
  END IF;
  IF v_rec.deletion_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'Someone asked for this recording to be deleted: nothing more is added to it';
  END IF;

  SELECT * INTO v_set FROM public.recorder_settings WHERE id = 1;
  SELECT * INTO v_switch FROM public.class_recording_settings WHERE class_id = v_rec.class_id FOR SHARE;
  IF NOT FOUND OR v_switch.recording_enabled IS NOT TRUE
     OR v_switch.consent_wording_version IS DISTINCT FROM v_set.consent_wording_version THEN
    RAISE EXCEPTION 'Recording is switched off for this class (or its consent is not current): nothing is added'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_missing := public.recorder__children_without_consent(v_rec.class_id, v_rec.session_date);
  IF v_missing IS NULL OR v_missing > 0 THEN
    RAISE EXCEPTION '% child(ren) enrolled that day have no recording consent on record', COALESCE(v_missing, -1)
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_lesson_ms := floor(extract(epoch FROM (v_rec.scheduled_end - v_rec.scheduled_start)) * 1000)::bigint;
  IF p_duration_ms IS NULL OR p_duration_ms < 60000 OR p_duration_ms > v_lesson_ms + 90 * 60000 THEN
    RAISE EXCEPTION 'Transmitter % holds % min of audio; this lesson is % min: these files are not this lesson',
      p_transmitter, COALESCE(p_duration_ms / 60000, 0), v_lesson_ms / 60000;
  END IF;
  IF p_duration_ms * 4 < v_lesson_ms THEN
    RAISE EXCEPTION 'Transmitter % holds only % min of a % min lesson: these files are not the whole lesson',
      p_transmitter, p_duration_ms / 60000, v_lesson_ms / 60000;
  END IF;
  IF p_source IS NULL OR jsonb_typeof(p_source) <> 'object' OR jsonb_typeof(p_source -> 'files') <> 'array'
     OR jsonb_array_length(p_source -> 'files') NOT BETWEEN 1 AND 50 OR pg_column_size(p_source) > 65536 THEN
    RAISE EXCEPTION 'Describe the transmitter''s files (1 to 50 of them)';
  END IF;

  SELECT * INTO v_old FROM public.class_recording_tracks WHERE recording_id = p_recording AND track = v_track FOR UPDATE;
  IF FOUND THEN
    IF v_old.import_state = 'complete' THEN
      RAISE EXCEPTION 'Transmitter % is already added to this lesson', p_transmitter;
    END IF;
    IF v_old.import_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Someone else is adding transmitter % to this lesson', p_transmitter;
    END IF;
    IF v_old.expected_ms IS DISTINCT FROM p_duration_ms
       OR (SELECT array_agg(f ->> 'name' || '|' || (f ->> 'bytes') ORDER BY o) FROM jsonb_array_elements(v_old.source -> 'files') WITH ORDINALITY AS x(f, o))
          IS DISTINCT FROM
          (SELECT array_agg(f ->> 'name' || '|' || (f ->> 'bytes') ORDER BY o) FROM jsonb_array_elements(p_source -> 'files') WITH ORDINALITY AS x(f, o)) THEN
      RAISE EXCEPTION 'Transmitter % is being added from other files: carry on with those, or ask an admin', p_transmitter;
    END IF;
    UPDATE public.class_recording_tracks SET import_updated_at = v_now WHERE recording_id = p_recording AND track = v_track;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('seq', c.seq, 'sha256', c.sha256, 'byte_size', c.byte_size,
                                                 'confirmed', c.confirmed_at IS NOT NULL) ORDER BY c.seq), '[]'::jsonb)
      INTO v_done FROM public.class_recording_chunks c WHERE c.recording_id = p_recording AND c.track = v_track;
    RETURN jsonb_build_object('recording_id', p_recording, 'track', v_track, 'resumed', true, 'chunk_ms', 240000,
                              'chunks', v_done);
  END IF;

  INSERT INTO public.class_recording_tracks (recording_id, track, sample_rate, channel_count, codec, applied_settings,
                                             source, import_state, import_by, import_started_at, import_updated_at, expected_ms)
  VALUES (p_recording, v_track, 16000, 1, 'flac', jsonb_build_object('lark', true),
          p_source, 'importing', v_uid, v_now, v_now, p_duration_ms);
  PERFORM public.recorder__audit('mic_import_started', v_rec.class_id, v_rec.session_id, p_recording, NULL,
    jsonb_build_object('track', v_track, 'duration_ms', p_duration_ms,
                       'files', (SELECT jsonb_agg(f ->> 'name') FROM jsonb_array_elements(p_source -> 'files') f)));
  RETURN jsonb_build_object('recording_id', p_recording, 'track', v_track, 'resumed', false, 'chunk_ms', 240000,
                            'chunks', '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.recorder_lark_chunk(
  p_recording uuid, p_transmitter integer, p_seq integer, p_byte_size bigint, p_sha256 text,
  p_t_start_ms bigint, p_t_end_ms bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track text := 'mic' || COALESCE(p_transmitter, 0)::text;
  v_rec public.class_recordings%ROWTYPE;
  v_trk public.class_recording_tracks%ROWTYPE;
  v_path text;
  v_new uuid;
  v_row public.class_recording_chunks%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR SHARE;
  IF NOT FOUND OR NOT public.recorder__mic_import_open(p_recording, v_track, v_uid) THEN
    RAISE EXCEPTION 'Not a microphone import of yours that is still open' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_trk FROM public.class_recording_tracks WHERE recording_id = p_recording AND track = v_track;
  IF p_seq IS NULL OR p_seq < 0 OR p_seq > 99999 OR p_byte_size IS NULL OR p_byte_size < 40
     OR p_byte_size > 8388608
     OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
     OR p_t_start_ms IS NULL OR p_t_end_ms IS NULL OR p_t_start_ms < 0 OR p_t_end_ms <= p_t_start_ms THEN
    RAISE EXCEPTION 'A chunk needs a number, a size (at most 8 MB), a SHA-256 and a time span';
  END IF;
  IF p_t_end_ms - p_t_start_ms > 240000 THEN
    RAISE EXCEPTION 'A microphone chunk is at most 4 minutes of audio';
  END IF;
  IF p_t_start_ms <> p_seq::bigint * 240000 THEN
    RAISE EXCEPTION 'Chunk % starts at % ms, not where its number says', p_seq, p_t_start_ms;
  END IF;
  IF p_t_end_ms > v_trk.expected_ms + 1000 THEN
    RAISE EXCEPTION 'This chunk ends after the transmitter''s recording does (% ms)', v_trk.expected_ms;
  END IF;
  -- Never evidence: a mic chunk must be "late" in the evidence view's own terms.
  IF clock_timestamp() <= v_rec.started_at - (v_rec.pre_start_ms * INTERVAL '1 millisecond')
                         + ((p_t_end_ms + v_rec.late_after_ms) * INTERVAL '1 millisecond') THEN
    RAISE EXCEPTION 'Too soon after the lesson to add this part: try again in a few minutes';
  END IF;
  v_path := v_rec.class_id::text || '/' || v_rec.id::text || '/' || v_track || '/' || lpad(p_seq::text, 6, '0') || '.flac';
  INSERT INTO public.class_recording_chunks
    (recording_id, track, seq, storage_path, byte_size, sha256, t_start_ms, t_end_ms, registered_by, registered_at, below_floor)
  VALUES (p_recording, v_track, p_seq, v_path, p_byte_size, lower(p_sha256), p_t_start_ms, p_t_end_ms, v_uid,
          clock_timestamp(), p_byte_size * 1000 < v_rec.min_bytes_per_sec::bigint * (p_t_end_ms - p_t_start_ms))
  ON CONFLICT (recording_id, track, seq) DO NOTHING
  RETURNING id INTO v_new;
  SELECT * INTO v_row FROM public.class_recording_chunks WHERE recording_id = p_recording AND track = v_track AND seq = p_seq;
  IF v_new IS NULL AND (v_row.sha256 <> lower(p_sha256) OR v_row.byte_size <> p_byte_size
                        OR v_row.t_start_ms <> p_t_start_ms OR v_row.t_end_ms <> p_t_end_ms) THEN
    RAISE EXCEPTION 'Chunk % of transmitter % is already registered with different audio', p_seq, p_transmitter;
  END IF;
  UPDATE public.class_recording_tracks SET import_updated_at = now() WHERE recording_id = p_recording AND track = v_track;
  RETURN jsonb_build_object('chunk_id', v_row.id, 'storage_path', v_row.storage_path,
                            'already_registered', v_new IS NULL, 'confirmed', v_row.confirmed_at IS NOT NULL);
END;
$$;

-- "The server has it": in R2 or Supabase at the registered size (recorder__object_size), and the page's read-back
-- hash matches. Same rule as recorder_confirm_chunk, for the importer instead of the recording's owner.
CREATE OR REPLACE FUNCTION public.recorder_lark_confirm(p_chunk uuid, p_readback_sha256 text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.class_recording_chunks%ROWTYPE;
  v_size bigint;
BEGIN
  SELECT * INTO v_row FROM public.class_recording_chunks WHERE id = p_chunk FOR UPDATE;
  IF NOT FOUND OR v_row.track NOT IN ('mic1', 'mic2', 'mic3', 'mic4') THEN RAISE EXCEPTION 'No such microphone chunk'; END IF;
  IF v_row.confirmed_at IS NOT NULL AND v_row.registered_by = v_uid THEN RETURN true; END IF;
  IF NOT public.recorder__mic_import_open(v_row.recording_id, v_row.track, v_uid) OR v_row.registered_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not a microphone import of yours that is still open' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_readback_sha256 IS NULL OR lower(p_readback_sha256) <> v_row.sha256 THEN
    RAISE EXCEPTION 'What storage returned does not match the audio that was made: it is sent again';
  END IF;
  IF NOT public.recorder__object_present(v_row.storage_path) THEN
    RAISE EXCEPTION 'The file is not in storage: it is sent again';
  END IF;
  v_size := public.recorder__object_size(v_row.storage_path);
  IF v_size IS NULL OR v_size <> v_row.byte_size THEN
    RAISE EXCEPTION 'Storage holds % bytes, the page made %', COALESCE(v_size::text, 'an unknown number of'), v_row.byte_size;
  END IF;
  UPDATE public.class_recording_chunks SET stored_size = v_size, confirmed_at = now() WHERE id = p_chunk;
  UPDATE public.class_recording_tracks SET import_updated_at = now()
   WHERE recording_id = v_row.recording_id AND track = v_row.track;
  RETURN true;
END;
$$;

-- Every chunk registered, numbered without a gap, confirmed, still in storage at its byte count, and together
-- they cover the transmitter's whole recording. Only then is the track complete, and only then does the page say
-- the transmitter may be wiped.
CREATE OR REPLACE FUNCTION public.recorder_lark_finish(p_recording uuid, p_transmitter integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track text := 'mic' || COALESCE(p_transmitter, 0)::text;
  v_rec public.class_recordings%ROWTYPE;
  v_trk public.class_recording_tracks%ROWTYPE;
  v_n integer;
  v_unconfirmed integer;
  v_max_seq integer;
  v_bytes bigint;
  v_ms bigint;
  v_last bigint;
  v_gap boolean;
  v_missing_files integer;
BEGIN
  SELECT * INTO v_rec FROM public.class_recordings WHERE id = p_recording FOR SHARE;
  SELECT * INTO v_trk FROM public.class_recording_tracks WHERE recording_id = p_recording AND track = v_track FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transmitter % was never started for this lesson', p_transmitter; END IF;
  IF v_trk.import_state = 'complete' AND v_trk.import_by = v_uid THEN
    RETURN jsonb_build_object('recording_id', p_recording, 'track', v_track, 'already_complete', true,
                              'chunks', v_trk.chunk_count, 'bytes', v_trk.total_bytes, 'audio_ms', v_trk.total_ms);
  END IF;
  IF NOT public.recorder__mic_import_open(p_recording, v_track, v_uid) THEN
    RAISE EXCEPTION 'Not a microphone import of yours that is still open' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE confirmed_at IS NULL OR stored_size IS DISTINCT FROM byte_size),
         max(seq), sum(byte_size), sum(t_end_ms - t_start_ms), max(t_end_ms)
    INTO v_n, v_unconfirmed, v_max_seq, v_bytes, v_ms, v_last
    FROM public.class_recording_chunks WHERE recording_id = p_recording AND track = v_track;
  IF v_n = 0 THEN RAISE EXCEPTION 'Transmitter % has no audio yet', p_transmitter; END IF;
  IF v_unconfirmed > 0 THEN RAISE EXCEPTION '% chunk(s) of transmitter % are not confirmed in storage', v_unconfirmed, p_transmitter; END IF;
  IF v_max_seq <> v_n - 1 THEN RAISE EXCEPTION 'Chunks are missing: % registered, the last is number %', v_n, v_max_seq; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.class_recording_chunks a JOIN public.class_recording_chunks b
      ON a.recording_id = b.recording_id AND a.track = b.track AND b.seq = a.seq + 1
     WHERE a.recording_id = p_recording AND a.track = v_track AND b.t_start_ms <> a.t_end_ms) INTO v_gap;
  IF v_gap THEN RAISE EXCEPTION 'Two chunks do not join: the timeline would be broken'; END IF;
  IF abs(v_last - v_trk.expected_ms) > 1000 THEN
    RAISE EXCEPTION 'The chunks cover % ms, the transmitter recorded % ms', v_last, v_trk.expected_ms;
  END IF;
  SELECT count(*) INTO v_missing_files FROM public.class_recording_chunks c
   WHERE c.recording_id = p_recording AND c.track = v_track
     AND NOT COALESCE(public.recorder__object_size(c.storage_path) = c.byte_size, false);
  IF v_missing_files > 0 THEN RAISE EXCEPTION '% chunk file(s) are not in storage at their size', v_missing_files; END IF;

  UPDATE public.class_recording_tracks
     SET chunk_count = v_n, total_bytes = v_bytes, total_ms = v_ms,
         import_state = 'complete', import_completed_at = now(), import_updated_at = now()
   WHERE recording_id = p_recording AND track = v_track;
  PERFORM public.recorder__audit('mic_imported', v_rec.class_id, v_rec.session_id, p_recording, NULL,
    jsonb_build_object('track', v_track, 'chunks', v_n, 'bytes', v_bytes, 'audio_ms', v_ms));
  RETURN jsonb_build_object('recording_id', p_recording, 'track', v_track, 'already_complete', false,
                            'chunks', v_n, 'bytes', v_bytes, 'audio_ms', v_ms);
END;
$$;

-- THE signal for the lesson monitor. SECURITY DEFINER so its answer does not depend on who asks (a teacher's
-- RLS view of the tracks is narrower than the monitor's).
CREATE OR REPLACE FUNCTION public.recorder_mic_import_in_progress(p_recording uuid, p_now timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_recording_tracks t
    JOIN public.class_recordings r ON r.id = t.recording_id
    JOIN public.class_recording_settings s ON s.class_id = r.class_id
    WHERE t.recording_id = p_recording
      AND t.import_state = 'importing'
      AND t.import_updated_at > p_now - interval '6 hours'
      AND r.deletion_requested_at IS NULL AND r.audio_deleted_at IS NULL
      AND s.recording_enabled);
$function$;

REVOKE ALL ON FUNCTION public.recorder_lark_begin(uuid, integer, bigint, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_lark_chunk(uuid, integer, integer, bigint, text, bigint, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_lark_confirm(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_lark_finish(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recorder_mic_import_in_progress(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_lark_begin(uuid, integer, bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_lark_chunk(uuid, integer, integer, bigint, text, bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_lark_confirm(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_lark_finish(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recorder_mic_import_in_progress(uuid, timestamptz) TO authenticated, service_role;

-- ================================================================ 5. never deleted mid-import
-- 20261127140000's rule, plus the last line.
CREATE OR REPLACE FUNCTION public.recorder_transcribed_audio_deletable(p_recording uuid, p_now timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_recordings r
    JOIN public.lesson_monitor_reports rep ON rep.recording_id = r.id
    JOIN public.lesson_monitor_runs u ON u.recording_id = r.id AND u.outcome = 'report_made'
    WHERE r.id = p_recording
      AND r.status = 'complete'
      AND r.audio_deleted_at IS NULL
      AND rep.made_at <= p_now - interval '3 hours'
      AND (rep.made_at <= p_now - interval '7 days' OR NOT public.recorder__voice_groups_waiting(rep.id))
      AND NOT public.recorder_mic_import_in_progress(r.id, p_now)
  );
$function$;

COMMIT;
