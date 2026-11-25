-- Lesson audio goes as soon as it is safe (owner, 25 Nov 2026: "delete the recorded files asap to
-- save space, only when it's safe").
--
-- 20261124140000 made a recording due for deletion once the lesson monitor's report from it was
-- saved MORE THAN 24 HOURS ago, and recorder-retention ran once a night. Now:
--   1. The grace is 3 HOURS. "Safe" is unchanged and still all of: the recording is complete, its
--      audio is still there, a lesson_monitor_reports row AND a lesson_monitor_runs row with outcome
--      'report_made' exist (the report is the transcript: it is saved in one call, after the audio
--      has been read to the end). The 3 hours are only the time the voice step needs after the
--      report is saved; a recording whose report is missing, or whose run failed or was refused,
--      is never due by this rule, so a failed transcription keeps its audio.
--   2. recorder-retention runs every hour (at minute 17) instead of once a night, so the audio goes
--      within about 4 hours of the report instead of the next night after 24 hours.
-- Nothing else changes: delete_after, a person's deletion request and consent withdrawal are as
-- they were, and the trigger that marks a recording deleted already asks this same function.
--
-- PASTE: after 20261125090000, in the Supabase SQL editor. Idempotent. Refuses to install (nothing
-- changed) without 20261124140000.

DO $pre$
BEGIN
  IF to_regprocedure('public.recorder_transcribed_audio_deletable(uuid,timestamptz)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: 20261124140000 (recorder_delete_after_transcribed) is not installed';
  END IF;
END
$pre$;

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
  );
$function$;

-- The deletion run, hourly, keeping its command and keys as installed (only the schedule moves).
DO $cron$
DECLARE v_job bigint;
BEGIN
  IF to_regprocedure('cron.alter_job(bigint,text,text,text,text,boolean)') IS NULL THEN
    RAISE NOTICE 'recorder retention: pg_cron is not installed here - run recorder-retention by hand (an admin POST).';
    RETURN;
  END IF;
  SELECT jobid INTO v_job FROM cron.job WHERE jobname = 'recorder-retention';
  IF v_job IS NULL THEN
    RAISE NOTICE 'recorder retention: no job called recorder-retention is scheduled (20261112101000 not pasted?)';
    RETURN;
  END IF;
  PERFORM cron.alter_job(v_job, schedule => '17 * * * *');
END
$cron$;
