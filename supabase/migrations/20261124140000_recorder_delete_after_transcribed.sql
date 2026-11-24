-- Lesson audio is deleted soon after it has been transcribed (owner, 24 Nov 2026:
-- the private bucket `class-recorder-audio` is full, and once the lesson monitor
-- has made its report from a recording the raw audio has done its job).
--
-- Until now a recording became due for deletion (public.recorder_retention_due,
-- called by the nightly recorder-retention function) only when its delete_after
-- had passed (lesson end + 30 days), a person asked for its deletion (which
-- brings delete_after forward), or it was abandoned and then aged out. Now a
-- recording is ALSO due when ALL of these hold:
--   * it is `complete` (never while armed / recording / uploading, never abandoned
--     here: those keep their own rules);
--   * its audio is still there (audio_deleted_at IS NULL);
--   * the lesson monitor made a report from it: a lesson_monitor_reports row AND
--     a lesson_monitor_runs row with outcome 'report_made' (the PC job saves both
--     in one call, lesson_monitor_save_report);
--   * that report was saved MORE THAN 24 HOURS ago - a grace day, so a failed voice
--     pass (the report is saved first, the voice step follows) can be redone from
--     the audio. Nothing is deleted the moment a report appears.
-- Nothing else is shortened: delete_after, a person's deletion request, consent
-- withdrawal (the reports and requests go through their own functions) are as
-- they were. A recording with no report, or whose report row is gone, is not due
-- by this rule.
--
-- What changes, and nothing else:
--   1. public.recorder_transcribed_audio_deletable(uuid, timestamptz): the ONE rule
--      above, as a function (SECURITY INVOKER: it reads what the caller may read;
--      the retention job is the service role, which reads everything; for anyone
--      else it answers false when it cannot see the report, i.e. it fails closed).
--   2. public.recorder_retention_due(timestamptz): same signature, columns, SECURITY
--      INVOKER, STABLE and grants; the WHERE adds the rule beside the old one. The
--      returned delete_after is still the row's own date (it may be in the future).
--   3. public.recorder__recording_before_update(): the trigger that marks a recording
--      'deleted' refuses to do it before delete_after ("an early deletion goes
--      through a request, so a 'deleted' row without a request is retention's").
--      Without a change, the retention job could empty the folder and then be told
--      "not due" - the audio would be gone and the row stuck at 'complete'. The
--      change is one condition: before delete_after is also fine when the helper in
--      (1) says so. It is made by editing the INSTALLED function text (one line,
--      found exactly once), not by pasting the whole function again, so nothing else
--      in it can drift. recorder_mark_audio_deleted itself is unchanged: it still
--      cannot mark a recording deleted while any object is left under its prefix
--      (the trigger checks storage), and only an admin or the retention job can.
--      No deletion request is written, so the evidence tombstone is the same as for
--      a 30-day deletion (deleted_by_retention = true).
--
-- PASTE: after 20261124120000 (the lesson monitor's voice step), in the Supabase SQL
-- editor. Idempotent: it can be pasted again. It REFUSES to install (nothing
-- changed) when the lesson monitor pilot or the class recorder is missing, or when
-- recorder_retention_due or the trigger is not the function this file was written
-- against. Then deploy nothing: the recorder-retention edge function already calls
-- these two functions and is unchanged.

BEGIN;

DO $pre$
DECLARE
  v_due text;
  v_trg text;
  v_marker constant text := 'IF OLD.delete_after > v_now THEN';
  v_patched constant text := 'recorder_transcribed_audio_deletable';
BEGIN
  IF to_regclass('public.class_recordings') IS NULL
     OR to_regprocedure('public.recorder_retention_due(timestamptz)') IS NULL
     OR to_regprocedure('public.recorder_mark_audio_deleted(uuid)') IS NULL
     OR to_regprocedure('public.recorder__recording_before_update()') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the class recorder (20261112100000) is not installed';
  END IF;
  IF to_regclass('public.lesson_monitor_reports') IS NULL OR to_regclass('public.lesson_monitor_runs') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the lesson monitor pilot (20261117090000) is not installed';
  END IF;

  v_due := pg_get_functiondef('public.recorder_retention_due(timestamptz)'::regprocedure);
  IF v_due NOT LIKE '%' || v_patched || '%' THEN
    -- Not ours yet: it must be exactly the function 20261112100000 installed.
    IF v_due NOT LIKE '%r.audio_deleted_at IS NULL%'
       OR v_due NOT LIKE '%r.status IN (''complete'', ''abandoned'')%'
       OR v_due NOT LIKE '%r.delete_after <= p_now%'
       OR v_due LIKE '%lesson_monitor%' THEN
      RAISE EXCEPTION 'Refusing to install: recorder_retention_due is not the function this file replaces';
    END IF;
  END IF;

  v_trg := pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure);
  IF v_trg NOT LIKE '%' || v_patched || '%' THEN
    IF (length(v_trg) - length(replace(v_trg, v_marker, ''))) / length(v_marker) <> 1 THEN
      RAISE EXCEPTION 'Refusing to install: the recording update trigger does not have its delete_after check exactly once';
    END IF;
  END IF;
END
$pre$;

-- ================================================================ 1. the rule
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
      AND rep.made_at <= p_now - interval '24 hours'
  );
$function$;

REVOKE ALL ON FUNCTION public.recorder_transcribed_audio_deletable(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_transcribed_audio_deletable(uuid, timestamptz) TO authenticated, service_role;

-- ================================================================ 2. the list
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
    AND (
      (r.status IN ('complete', 'abandoned') AND r.delete_after <= p_now)
      OR public.recorder_transcribed_audio_deletable(r.id, p_now)
    )
  ORDER BY r.delete_after, r.id;
$function$;

REVOKE ALL ON FUNCTION public.recorder_retention_due(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder_retention_due(timestamptz) TO authenticated, service_role;

-- ================================================================ 3. the trigger
DO $patch$
DECLARE
  v_def text := pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure);
  v_marker constant text := 'IF OLD.delete_after > v_now THEN';
BEGIN
  IF v_def LIKE '%recorder_transcribed_audio_deletable%' THEN
    RETURN;  -- already patched
  END IF;
  -- The same function, SECURITY DEFINER, search_path and row_security as installed
  -- (pg_get_functiondef writes them out), with the one condition widened.
  EXECUTE replace(v_def, v_marker,
    'IF OLD.delete_after > v_now AND NOT COALESCE(public.recorder_transcribed_audio_deletable(OLD.id, v_now), false) THEN');
END
$patch$;

-- Check the result before it is committed.
DO $post$
DECLARE
  v_trg text := pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure);
BEGIN
  IF v_trg NOT LIKE '%recorder_transcribed_audio_deletable(OLD.id, v_now)%'
     OR v_trg NOT LIKE '%SECURITY DEFINER%' OR v_trg NOT LIKE '%row_security%' THEN
    RAISE EXCEPTION 'The recording update trigger was not patched as expected: nothing installed';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.recorder_retention_due(timestamptz)'::regprocedure) THEN
    RAISE EXCEPTION 'recorder_retention_due must stay SECURITY INVOKER: nothing installed';
  END IF;
END
$post$;

COMMIT;
