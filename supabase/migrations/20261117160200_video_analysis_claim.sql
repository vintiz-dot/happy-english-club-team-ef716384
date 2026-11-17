-- N-5 (privacy review, 17 Nov 2026): analyze-video-submission spends
-- OpenAI, Gemini and a high-effort Claude call per run. A family could start
-- it with no role check and no limit, and again whenever the status was
-- 'failed' - a failing video was a loop. The edge function now stands
-- behind requireSpender; this is the per-submission half, which has to be
-- durable to mean anything (the in-memory limiter resets on a cold start).
--
-- video_analysis_claim(submission, by_staff) - called by the function on
-- the service role, nowhere else - takes the row lock, decides, counts and
-- stamps 'processing' in one step, so two calls at once cannot both spend:
--   a family (the child, a parent, the shared login):
--     only a NEW ('uploaded') or 'failed' take; at most 3 runs a take and
--     10 a submission across re-records;
--   staff of the class (and admins): any status but 'approved', but not
--     while a run is under way (processing, touched in the last 15 min); at
--     most 6 runs a take and 20 a submission.
-- It answers 'claimed' or why not: not_found, approved, with_teacher, busy,
-- take_limit, total_limit.
--
-- video_submissions.analysis_runs (whole submission) and
-- analysis_take_runs (this take) are counted here and nowhere else. The
-- guard (video_submissions_guard, otherwise exactly as 20261109090000)
-- keeps anyone signed in - a family, and a teacher through the staff
-- policy - from writing them: 0 on an insert, the take count reset by a
-- re-record, the total never.
--
-- Fails closed: refuses to replace the guard unless it is the version
-- 20261109090000 installed (or this one). Safe to run twice.

BEGIN;

DO $pre$
DECLARE
  v_guard text;
BEGIN
  IF to_regclass('public.video_submissions') IS NULL
     OR to_regprocedure('public.video_staff_for_class(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: video homework (20261109090000) is missing';
  END IF;
  SELECT md5(replace(p.prosrc, chr(13), '')) INTO v_guard FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.video_submissions_guard()');
  IF v_guard IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: video_submissions_guard is missing';
  END IF;
  IF v_guard <> '31307188e0c4012400c5e40227302db0'
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.video_submissions_guard()')
                       AND prosrc LIKE '%N-5: the analysis counters%') THEN
    RAISE EXCEPTION 'Refusing to install: video_submissions_guard is not the version this migration replaces (md5 %)', v_guard;
  END IF;
END
$pre$;

ALTER TABLE public.video_submissions
  ADD COLUMN IF NOT EXISTS analysis_runs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_take_runs integer NOT NULL DEFAULT 0;

-- The guard of 20261109090000, plus the counters.
CREATE OR REPLACE FUNCTION public.video_submissions_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
  v_type  text;
  v_staff boolean;
BEGIN
  -- N-5: the analysis counters belong to video_analysis_claim alone.
  SELECT class_id, submission_type INTO v_class, v_type
  FROM public.homeworks WHERE id = NEW.homework_id;
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'homework % does not exist', NEW.homework_id;
  END IF;
  IF v_type IS DISTINCT FROM 'video' THEN
    RAISE EXCEPTION 'homework % is not a video homework', NEW.homework_id;
  END IF;

  NEW.class_id := v_class;
  NEW.updated_at := now();
  v_staff := public.video_staff_for_class(v_class);

  IF TG_OP = 'INSERT' THEN
    NEW.submitted_by := COALESCE(NEW.submitted_by, auth.uid());
    IF NOT v_staff THEN
      NEW.status := 'uploaded';
      NEW.attempt := 1;
      NEW.error := NULL;
      NEW.processing_stage := NULL;
      NEW.teacher_note := NULL;
    END IF;
    -- Nobody signed in sets a counter, staff included.
    IF auth.uid() IS NOT NULL THEN
      NEW.analysis_runs := 0;
      NEW.analysis_take_runs := 0;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.homework_id <> OLD.homework_id OR NEW.student_id <> OLD.student_id THEN
    RAISE EXCEPTION 'a video submission cannot be moved to another homework or child';
  END IF;

  IF NEW.video_path IS DISTINCT FROM OLD.video_path THEN
    -- A re-record. Allowed until a teacher has approved it.
    IF OLD.status = 'approved' AND NOT v_staff THEN
      RAISE EXCEPTION 'this video has already been approved by the teacher';
    END IF;
    NEW.attempt := OLD.attempt + 1;
    NEW.status := 'uploaded';
    NEW.error := NULL;
    NEW.processing_stage := NULL;
    NEW.processed_at := NULL;
    NEW.submitted_at := now();
    NEW.submitted_by := COALESCE(auth.uid(), OLD.submitted_by);
    -- A new take may be analysed again; the submission's total stands.
    NEW.analysis_take_runs := 0;
    NEW.analysis_runs := OLD.analysis_runs;
    RETURN NEW;
  END IF;

  IF NOT v_staff THEN
    NEW.status := OLD.status;
    NEW.error := OLD.error;
    NEW.processing_stage := OLD.processing_stage;
    NEW.teacher_note := OLD.teacher_note;
    NEW.attempt := OLD.attempt;
    NEW.processed_at := OLD.processed_at;
    -- Pronunciation can be added only while the AI has not yet run on it.
    IF OLD.status NOT IN ('uploaded', 'failed') THEN
      NEW.pronunciation := OLD.pronunciation;
    END IF;
  END IF;
  -- Only the claim (service role, no auth.uid()) moves the counters: not a
  -- family, and not a teacher through the staff policy either.
  IF auth.uid() IS NOT NULL THEN
    NEW.analysis_runs := OLD.analysis_runs;
    NEW.analysis_take_runs := OLD.analysis_take_runs;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.video_analysis_claim(p_submission uuid, p_by_staff boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  c_family_take  constant integer := 3;
  c_family_total constant integer := 10;
  c_staff_take   constant integer := 6;
  c_staff_total  constant integer := 20;
BEGIN
  SELECT id, status, updated_at, analysis_runs, analysis_take_runs INTO v
    FROM public.video_submissions WHERE id = p_submission FOR UPDATE;
  IF v.id IS NULL THEN RETURN 'not_found'; END IF;
  IF v.status = 'approved' THEN RETURN 'approved'; END IF;

  IF p_by_staff IS TRUE THEN
    IF v.status = 'processing' AND v.updated_at > now() - interval '15 minutes' THEN RETURN 'busy'; END IF;
    IF v.analysis_take_runs >= c_staff_take THEN RETURN 'take_limit'; END IF;
    IF v.analysis_runs >= c_staff_total THEN RETURN 'total_limit'; END IF;
  ELSE
    IF v.status NOT IN ('uploaded', 'failed') THEN RETURN 'with_teacher'; END IF;
    IF v.analysis_take_runs >= c_family_take THEN RETURN 'take_limit'; END IF;
    IF v.analysis_runs >= c_family_total THEN RETURN 'total_limit'; END IF;
  END IF;

  UPDATE public.video_submissions
     SET status = 'processing',
         processing_stage = 'queued',
         error = NULL,
         analysis_runs = analysis_runs + 1,
         analysis_take_runs = analysis_take_runs + 1
   WHERE id = p_submission;
  RETURN 'claimed';
END;
$$;

-- The edge function's service role only. A browser cannot claim, and so
-- cannot move a status or a counter through it.
REVOKE ALL ON FUNCTION public.video_analysis_claim(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.video_analysis_claim(uuid, boolean) TO service_role;

COMMIT;
