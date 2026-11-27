-- Lesson audio stays while its voice groups wait for a teacher (owner, 27 Nov 2026: "yes keep it").
--
-- Why: a teacher names a voice group by listening to its lines (the play buttons on the lesson monitor
-- report). Since 20261125120000 the audio went 3 hours after the report was saved, so every voice group
-- had to be named from the text alone, and those answers are what score the voice models (Admin > Voices).
--
-- The rule now (recorder_transcribed_audio_deletable, the one function the retention run and the
-- recording trigger both ask): everything 20261125120000 required, AND either
--   * no voice group of the report is still unanswered, or
--   * the report was saved 7 days ago or more (a lesson nobody answers does not keep its audio for ever).
-- A report with no voice groups is due 3 hours after it was saved, as before. delete_after (30 days),
-- a person's deletion request and a consent withdrawal are unchanged and still delete at once.
--
-- The voice-group check is a SECURITY DEFINER helper because the groups are readable only by the lesson's
-- own teacher (RLS): asked as anyone else, an unanswered group would look absent and the audio due.
--
-- PASTE: after 20261125120000 (and 20261124120000), in the Supabase SQL editor. Idempotent.

BEGIN;

DO $pre$
BEGIN
  IF to_regprocedure('public.recorder_transcribed_audio_deletable(uuid,timestamptz)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: 20261124140000 (recorder_delete_after_transcribed) is not installed';
  END IF;
  IF to_regclass('public.lesson_monitor_voice_groups') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the voice step (20261124120000) is not installed';
  END IF;
END
$pre$;

CREATE OR REPLACE FUNCTION public.recorder__voice_groups_waiting(p_report uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.lesson_monitor_voice_groups g WHERE g.report_id = p_report AND g.answered_at IS NULL);
$function$;
REVOKE ALL ON FUNCTION public.recorder__voice_groups_waiting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recorder__voice_groups_waiting(uuid) TO authenticated, service_role;

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
  );
$function$;

COMMIT;
