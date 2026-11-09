-- Video homework: record in the app, AI drafts the report, a teacher approves.
--
-- WHAT THIS ADDS
--   homeworks.submission_type    'standard' (as before) or 'video'.
--   video_homework_rubrics       what a video is judged against, one per
--                                homework. The AI drafts it from the prompt;
--                                a teacher approves it.
--   video_submissions            one per child per homework. A re-record
--                                replaces the file and starts again.
--   video_analyses               the AI's draft (scores with evidence,
--                                feedback, gaps) and the teacher's final
--                                version. Staff only: families read the
--                                approved report through an RPC.
--   video_reactions              hearts on the class video wall.
--   homework-videos (bucket)     private. Path: {student}/{homework}/{stamp}/file
--
-- RULES IT HOLDS
--   1. Nothing reaches a child or parent until a teacher approves it.
--      video_analyses has no family policy at all; the approved report is
--      read through get_video_homework_for_student, which returns only the
--      teacher's final words.
--   2. Classmates see the VIDEO, never a score. The wall is an RPC that
--      returns names, titles and file paths, and the storage policy lets a
--      classmate read only an approved, shared video's files.
--   3. A family can submit, re-record and add pronunciation results, but
--      cannot move a submission's status: a trigger keeps it, so a child
--      cannot mark their own homework approved.
--   4. approve_video_feedback does the grade, the points, the error log,
--      the SRS cards, the speaking score and the CEFR point in one
--      transaction, and replaces rather than adds when a teacher
--      re-approves.
--
-- Safe to run twice.

BEGIN;

-- ---------------------------------------------------------------- 1
-- Which homeworks are videos.

ALTER TABLE public.homeworks
  ADD COLUMN IF NOT EXISTS submission_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS video_max_seconds integer NOT NULL DEFAULT 300;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homeworks_submission_type_check') THEN
    ALTER TABLE public.homeworks
      ADD CONSTRAINT homeworks_submission_type_check
      CHECK (submission_type IN ('standard', 'video'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homeworks_video_max_seconds_check') THEN
    ALTER TABLE public.homeworks
      ADD CONSTRAINT homeworks_video_max_seconds_check
      CHECK (video_max_seconds BETWEEN 30 AND 600);
  END IF;
END $$;

-- ---------------------------------------------------------------- 2
-- The rubric.

CREATE TABLE IF NOT EXISTS public.video_homework_rubrics (
  homework_id       uuid PRIMARY KEY REFERENCES public.homeworks(id) ON DELETE CASCADE,
  -- [{key, label, description, weight}] - weights are relative, any scale
  criteria          jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_vocabulary text[] NOT NULL DEFAULT '{}',
  target_grammar    text[] NOT NULL DEFAULT '{}',
  grade_band        text,
  kid_summary       text,          -- "What your teacher is looking for", in a child's words
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  generated_by_ai   boolean NOT NULL DEFAULT false,
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_homework_rubrics_criteria_is_array CHECK (jsonb_typeof(criteria) = 'array')
);

-- ---------------------------------------------------------------- 3
-- Submissions.

CREATE TABLE IF NOT EXISTS public.video_submissions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id            uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id             uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Copied from the homework by the trigger; the row policies need it.
  class_id               uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  homework_submission_id uuid REFERENCES public.homework_submissions(id) ON DELETE SET NULL,
  video_path             text NOT NULL,
  audio_path             text,
  frame_paths            text[] NOT NULL DEFAULT '{}',
  video_mime             text,
  audio_mime             text,
  duration_seconds       numeric,
  size_bytes             bigint,
  -- Browser-side Azure pronunciation summary (see src/lib/videoHomework.ts).
  pronunciation          jsonb,
  status                 text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'ready_for_review', 'failed', 'approved', 'returned')),
  processing_stage       text,
  error                  text,
  attempt                integer NOT NULL DEFAULT 1,
  share_with_class       boolean NOT NULL DEFAULT true,
  teacher_note           text,
  submitted_by           uuid,
  submitted_at           timestamptz NOT NULL DEFAULT now(),
  processed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  -- Plain, not partial: it is the ON CONFLICT target of the client's upsert.
  CONSTRAINT video_submissions_one_per_child UNIQUE (homework_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_video_submissions_class_status
  ON public.video_submissions (class_id, status);
CREATE INDEX IF NOT EXISTS idx_video_submissions_student
  ON public.video_submissions (student_id, submitted_at DESC);

-- ---------------------------------------------------------------- 4
-- Analyses.

CREATE TABLE IF NOT EXISTS public.video_analyses (
  video_submission_id   uuid PRIMARY KEY REFERENCES public.video_submissions(id) ON DELETE CASCADE,
  -- Evidence
  transcript            text,
  transcript_segments   jsonb,     -- [{start, end, text}]
  visual_notes          jsonb,     -- what was on screen, from the video model
  -- The AI's draft
  criteria_scores       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{key,label,score,max,evidence:[{t,quote}],comment}]
  overall_score         integer CHECK (overall_score BETWEEN 0 AND 100),
  suggested_grade       text,
  feedback_student      text,
  feedback_parent       text,      -- Vietnamese
  strengths             jsonb NOT NULL DEFAULT '[]'::jsonb,
  focus_points          jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps                  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{error_type,error_text,corrected_text,cefr_topic,severity}]
  cefr_estimate         text,
  confidence            numeric,
  teacher_attention     text,      -- anything the model wants a human to look at
  models                jsonb,     -- which models produced it
  -- The teacher's final version
  final_score           integer CHECK (final_score BETWEEN 0 AND 100),
  final_grade           text,
  final_feedback_student text,
  final_feedback_parent text,
  final_gaps            jsonb,
  approved_by           uuid,
  approved_at           timestamptz,
  -- What approval wrote, so a re-approval replaces it
  skill_assessment_id   uuid,
  cefr_assessment_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- 5
-- Reactions on the class wall.

CREATE TABLE IF NOT EXISTS public.video_reactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_submission_id uuid NOT NULL REFERENCES public.video_submissions(id) ON DELETE CASCADE,
  reactor_student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  emoji               text NOT NULL DEFAULT '❤️',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_reactions_one_per_child UNIQUE (video_submission_id, reactor_student_id)
);

-- ---------------------------------------------------------------- 6
-- Who is staff for a class. auth.uid() is NULL for the service role and
-- the SQL editor, which are trusted.

CREATE OR REPLACE FUNCTION public.video_staff_for_class(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_teacher_of_class(auth.uid(), p_class);
$$;

-- ---------------------------------------------------------------- 7
-- The guard. Families may submit, re-record, add pronunciation and choose
-- whether to share. Only staff and the service role move the status.

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS video_submissions_guard ON public.video_submissions;
CREATE TRIGGER video_submissions_guard
  BEFORE INSERT OR UPDATE ON public.video_submissions
  FOR EACH ROW EXECUTE FUNCTION public.video_submissions_guard();

-- A re-record throws away the analysis of the old video.
CREATE OR REPLACE FUNCTION public.video_submissions_rerecorded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.video_path IS DISTINCT FROM OLD.video_path THEN
    DELETE FROM public.video_analyses WHERE video_submission_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS video_submissions_rerecorded ON public.video_submissions;
CREATE TRIGGER video_submissions_rerecorded
  AFTER UPDATE ON public.video_submissions
  FOR EACH ROW EXECUTE FUNCTION public.video_submissions_rerecorded();

-- ---------------------------------------------------------------- 8
-- Row policies.

ALTER TABLE public.video_homework_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reactions        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_rubrics_staff ON public.video_homework_rubrics;
CREATE POLICY video_rubrics_staff ON public.video_homework_rubrics
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homeworks h
                 WHERE h.id = homework_id AND public.video_staff_for_class(h.class_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.homeworks h
                      WHERE h.id = homework_id AND public.video_staff_for_class(h.class_id)));

DROP POLICY IF EXISTS video_submissions_staff ON public.video_submissions;
CREATE POLICY video_submissions_staff ON public.video_submissions
  FOR ALL TO authenticated
  USING (public.video_staff_for_class(class_id))
  WITH CHECK (public.video_staff_for_class(class_id));

-- The child, a parent, or the family's shared login.
DROP POLICY IF EXISTS video_submissions_family_read ON public.video_submissions;
CREATE POLICY video_submissions_family_read ON public.video_submissions
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS video_submissions_family_insert ON public.video_submissions;
CREATE POLICY video_submissions_family_insert ON public.video_submissions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS video_submissions_family_update ON public.video_submissions;
CREATE POLICY video_submissions_family_update ON public.video_submissions
  FOR UPDATE TO authenticated
  USING (public.can_view_student(student_id, auth.uid()))
  WITH CHECK (public.can_view_student(student_id, auth.uid()));

-- Staff only. Families get the approved report through the RPC below.
DROP POLICY IF EXISTS video_analyses_staff ON public.video_analyses;
CREATE POLICY video_analyses_staff ON public.video_analyses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.video_submissions v
                 WHERE v.id = video_submission_id AND public.video_staff_for_class(v.class_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.video_submissions v
                      WHERE v.id = video_submission_id AND public.video_staff_for_class(v.class_id)));

DROP POLICY IF EXISTS video_reactions_staff ON public.video_reactions;
CREATE POLICY video_reactions_staff ON public.video_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.video_submissions v
                 WHERE v.id = video_submission_id AND public.video_staff_for_class(v.class_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_homework_rubrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_submissions      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_analyses         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_reactions        TO authenticated;
GRANT ALL ON public.video_homework_rubrics TO service_role;
GRANT ALL ON public.video_submissions      TO service_role;
GRANT ALL ON public.video_analyses         TO service_role;
GRANT ALL ON public.video_reactions        TO service_role;

-- ---------------------------------------------------------------- 9
-- Can this person see a class's wall? They are, or look after, a child
-- currently enrolled in it - or they teach it.

CREATE OR REPLACE FUNCTION public.can_view_class_video_wall(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.video_staff_for_class(p_class)
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.class_id = p_class
          AND e.end_date IS NULL
          AND public.can_view_student(e.student_id, auth.uid())
      );
$$;

-- ---------------------------------------------------------------- 10
-- Storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('homework-videos', 'homework-videos', false, 104857600,
        ARRAY['video/webm', 'video/mp4', 'video/quicktime',
              'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- First two path segments as uuids, or NULL. A bad path is a "no", never
-- an error: a cast failure inside a policy would surface as a 500.
CREATE OR REPLACE FUNCTION public.homework_video_path_ids(p_name text, OUT student_id uuid, OUT homework_id uuid)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  a text := split_part(p_name, '/', 1);
  b text := split_part(p_name, '/', 2);
BEGIN
  IF a ~ re AND b ~ re THEN
    student_id := a::uuid;
    homework_id := b::uuid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_upload_homework_video(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids record;
  v_class uuid;
BEGIN
  SELECT * INTO ids FROM public.homework_video_path_ids(p_name);
  IF ids.student_id IS NULL THEN RETURN false; END IF;
  SELECT class_id INTO v_class FROM public.homeworks
   WHERE id = ids.homework_id AND submission_type = 'video';
  IF v_class IS NULL THEN RETURN false; END IF;
  RETURN public.can_view_student(ids.student_id, auth.uid())
      OR public.video_staff_for_class(v_class);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_homework_video(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids record;
  v_class uuid;
BEGIN
  SELECT * INTO ids FROM public.homework_video_path_ids(p_name);
  IF ids.student_id IS NULL THEN RETURN false; END IF;
  SELECT class_id INTO v_class FROM public.homeworks WHERE id = ids.homework_id;
  IF v_class IS NULL THEN RETURN false; END IF;

  IF public.can_view_student(ids.student_id, auth.uid()) OR public.video_staff_for_class(v_class) THEN
    RETURN true;
  END IF;

  -- A classmate: only the current, approved, shared video and its frames.
  -- Never the separate audio track - nothing on the wall plays it.
  RETURN EXISTS (
    SELECT 1 FROM public.video_submissions v
    WHERE v.student_id = ids.student_id
      AND v.homework_id = ids.homework_id
      AND v.status = 'approved'
      AND v.share_with_class
      AND (v.video_path = p_name OR p_name = ANY (v.frame_paths))
  ) AND public.can_view_class_video_wall(v_class);
END;
$$;

DROP POLICY IF EXISTS homework_videos_insert ON storage.objects;
CREATE POLICY homework_videos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework-videos' AND public.can_upload_homework_video(name));

DROP POLICY IF EXISTS homework_videos_select ON storage.objects;
CREATE POLICY homework_videos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'homework-videos' AND public.can_view_homework_video(name));

-- A family may clear away an earlier take, never the approved one.
DROP POLICY IF EXISTS homework_videos_delete ON storage.objects;
CREATE POLICY homework_videos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'homework-videos'
    AND public.can_upload_homework_video(name)
    AND NOT EXISTS (
      SELECT 1 FROM public.video_submissions v
      WHERE v.status = 'approved'
        AND (v.video_path = name OR v.audio_path = name OR name = ANY (v.frame_paths))
    )
  );

-- ---------------------------------------------------------------- 11
-- What a child or parent sees for one video homework.

CREATE OR REPLACE FUNCTION public.get_video_homework_for_student(p_homework uuid, p_student uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h  record;
  r  record;
  v  record;
  a  record;
BEGIN
  SELECT * INTO h FROM public.homeworks WHERE id = p_homework;
  IF h.id IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.can_view_student(p_student, auth.uid()) OR public.video_staff_for_class(h.class_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO r FROM public.video_homework_rubrics WHERE homework_id = p_homework;
  SELECT * INTO v FROM public.video_submissions WHERE homework_id = p_homework AND student_id = p_student;
  -- Always assigned, so a missing row reads as NULLs rather than an error.
  SELECT * INTO a FROM public.video_analyses
   WHERE video_submission_id = v.id AND v.status = 'approved';

  RETURN jsonb_build_object(
    'submission_type', h.submission_type,
    'max_seconds', h.video_max_seconds,
    'title', h.title,
    'prompt', h.body,
    'looking_for', CASE WHEN r.status = 'approved' THEN
        jsonb_build_object(
          'summary', r.kid_summary,
          'criteria', (SELECT COALESCE(jsonb_agg(c->>'label'), '[]'::jsonb) FROM jsonb_array_elements(r.criteria) c),
          'vocabulary', to_jsonb(r.target_vocabulary))
      END,
    'submission', CASE WHEN v.id IS NOT NULL THEN jsonb_build_object(
        'id', v.id,
        'status', CASE WHEN v.status IN ('processing', 'ready_for_review', 'failed') THEN 'with_teacher' ELSE v.status END,
        'video_path', v.video_path,
        'frame_paths', to_jsonb(v.frame_paths),
        'attempt', v.attempt,
        'share_with_class', v.share_with_class,
        'teacher_note', CASE WHEN v.status = 'returned' THEN v.teacher_note END,
        'submitted_at', v.submitted_at)
      END,
    -- Only ever the teacher's final words.
    'report', CASE WHEN a.video_submission_id IS NOT NULL THEN jsonb_build_object(
        'score', a.final_score,
        'grade', a.final_grade,
        'feedback', a.final_feedback_student,
        'parent_note', a.final_feedback_parent,
        'strengths', a.strengths,
        'focus_points', a.focus_points,
        'criteria', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'label', c->>'label', 'score', c->'score', 'max', c->'max', 'comment', c->>'comment')), '[]'::jsonb)
                     FROM jsonb_array_elements(a.criteria_scores) c),
        'approved_at', a.approved_at)
      END
  );
END;
$$;

-- ---------------------------------------------------------------- 12
-- Progress across every approved video, for the child's progress card.

CREATE OR REPLACE FUNCTION public.get_video_progress(p_student uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.can_view_student(p_student, auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (SELECT 1 FROM public.enrollments e
                     WHERE e.student_id = p_student AND public.is_teacher_of_class(auth.uid(), e.class_id))) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN jsonb_build_object(
    'videos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'video_submission_id', v.id,
        'homework_title', h.title,
        'date', COALESCE(h.due_date, v.submitted_at::date),
        'score', a.final_score,
        'criteria', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'key', c->>'key', 'label', c->>'label', 'score', c->'score', 'max', c->'max')), '[]'::jsonb)
                     FROM jsonb_array_elements(a.criteria_scores) c),
        'pronunciation', CASE WHEN v.pronunciation IS NOT NULL THEN jsonb_build_object(
            'accuracy', v.pronunciation->'accuracy',
            'fluency', v.pronunciation->'fluency',
            'prosody', v.pronunciation->'prosody') END,
        'gaps', COALESCE(a.final_gaps, '[]'::jsonb)
      ) ORDER BY COALESCE(h.due_date, v.submitted_at::date))
      FROM public.video_submissions v
      JOIN public.homeworks h ON h.id = v.homework_id
      JOIN public.video_analyses a ON a.video_submission_id = v.id
      WHERE v.student_id = p_student AND v.status = 'approved'
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------- 13
-- The class wall. Names and videos only - never a score.

CREATE OR REPLACE FUNCTION public.get_class_video_wall(p_class uuid, p_viewer_student uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_class_video_wall(p_class) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF p_viewer_student IS NOT NULL AND NOT public.can_view_student(p_viewer_student, auth.uid()) THEN
    p_viewer_student := NULL;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', v.id,
      -- Vietnamese order: the given name is the last word. First names only on the wall.
      'student_name', split_part(btrim(s.full_name), ' ', array_length(string_to_array(btrim(s.full_name), ' '), 1)),
      'homework_title', h.title,
      'video_path', v.video_path,
      'poster_path', v.frame_paths[1],
      'submitted_at', v.submitted_at,
      'hearts', (SELECT count(*) FROM public.video_reactions r WHERE r.video_submission_id = v.id),
      'hearted', p_viewer_student IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.video_reactions r
          WHERE r.video_submission_id = v.id AND r.reactor_student_id = p_viewer_student),
      'mine', p_viewer_student IS NOT NULL AND v.student_id = p_viewer_student
    ) ORDER BY v.submitted_at DESC)
    FROM public.video_submissions v
    JOIN public.homeworks h ON h.id = v.homework_id
    JOIN public.students s ON s.id = v.student_id
    WHERE v.class_id = p_class
      AND v.status = 'approved'
      AND v.share_with_class
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_video_heart(p_video uuid, p_student uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
BEGIN
  IF NOT public.can_view_student(p_student, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT class_id INTO v_class FROM public.video_submissions
   WHERE id = p_video AND status = 'approved' AND share_with_class;
  IF v_class IS NULL OR NOT public.can_view_class_video_wall(v_class) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.video_reactions WHERE video_submission_id = p_video AND reactor_student_id = p_student;
  IF FOUND THEN RETURN false; END IF;
  INSERT INTO public.video_reactions (video_submission_id, reactor_student_id) VALUES (p_video, p_student);
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------- 14
-- Approval. Everything a teacher's "Approve" means, in one transaction.

CREATE OR REPLACE FUNCTION public.approve_video_feedback(
  p_video_submission uuid,
  p_score            integer,
  p_grade            text,
  p_feedback_student text,
  p_feedback_parent  text DEFAULT NULL,
  p_gaps             jsonb DEFAULT '[]'::jsonb,
  p_award_points     boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v    record;
  h    record;
  a    record;
  g    jsonb;
  v_sub      uuid;
  v_date     date;
  v_err      uuid;
  v_skill    uuid;
  v_cefr     uuid;
  v_errors   integer := 0;
  v_type     text;
  v_cefr_score numeric;
BEGIN
  SELECT * INTO v FROM public.video_submissions WHERE id = p_video_submission FOR UPDATE;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'video submission % does not exist', p_video_submission;
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_teacher_of_class(auth.uid(), v.class_id)) THEN
    RAISE EXCEPTION 'Only a teacher of this class can approve this video';
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'score must be between 0 and 100';
  END IF;
  IF COALESCE(btrim(p_grade), '') = '' THEN
    RAISE EXCEPTION 'a grade is required';
  END IF;
  IF p_gaps IS NULL OR jsonb_typeof(p_gaps) <> 'array' THEN
    p_gaps := '[]'::jsonb;
  END IF;

  SELECT * INTO h FROM public.homeworks WHERE id = v.homework_id;
  v_date := COALESCE(h.due_date, CURRENT_DATE);

  -- The homework_submissions row the rest of the app reads.
  v_sub := v.homework_submission_id;
  IF v_sub IS NULL THEN
    SELECT id INTO v_sub FROM public.homework_submissions
     WHERE homework_id = v.homework_id AND student_id = v.student_id
     ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_sub IS NULL THEN
    INSERT INTO public.homework_submissions (homework_id, student_id, status, submitted_at)
    VALUES (v.homework_id, v.student_id, 'submitted', v.submitted_at)
    RETURNING id INTO v_sub;
  END IF;
  UPDATE public.homework_submissions
     SET grade = p_grade,
         teacher_feedback = p_feedback_student,
         status = 'graded',
         graded_at = now()
   WHERE id = v_sub;

  IF p_award_points THEN
    PERFORM public.award_homework_points(v.student_id, v.homework_id, p_score, p_grade);
  END IF;

  -- Replace what an earlier approval of this video wrote.
  SELECT * INTO a FROM public.video_analyses WHERE video_submission_id = v.id FOR UPDATE;
  IF a.video_submission_id IS NULL THEN
    INSERT INTO public.video_analyses (video_submission_id) VALUES (v.id);
    SELECT * INTO a FROM public.video_analyses WHERE video_submission_id = v.id;
  END IF;
  DELETE FROM public.student_error_log WHERE source = 'homework' AND source_id = v.id;
  IF a.skill_assessment_id IS NOT NULL THEN
    DELETE FROM public.skill_assessments WHERE id = a.skill_assessment_id;
  END IF;
  IF a.cefr_assessment_id IS NOT NULL THEN
    DELETE FROM public.cefr_assessments WHERE id = a.cefr_assessment_id;
  END IF;

  -- Knowledge gaps the teacher kept, with a practice card each.
  FOR g IN SELECT * FROM jsonb_array_elements(p_gaps) LOOP
    CONTINUE WHEN COALESCE(btrim(g->>'error_text'), '') = '';
    v_type := CASE WHEN g->>'error_type' IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')
                   THEN g->>'error_type' ELSE 'other' END;
    INSERT INTO public.student_error_log
      (student_id, class_id, source, source_id, error_text, corrected_text,
       error_type, cefr_topic, severity, notes, created_by)
    VALUES
      (v.student_id, v.class_id, 'homework', v.id,
       left(g->>'error_text', 500), left(NULLIF(g->>'corrected_text', ''), 500),
       v_type, left(NULLIF(g->>'cefr_topic', ''), 80),
       LEAST(3, GREATEST(1, COALESCE((g->>'severity')::int, 1))),
       left('Video homework: ' || h.title, 200), auth.uid())
    RETURNING id INTO v_err;
    v_errors := v_errors + 1;

    IF NULLIF(g->>'corrected_text', '') IS NOT NULL THEN
      INSERT INTO public.srs_cards (student_id, source, error_log_id, front, back, hint)
      VALUES (
        v.student_id, 'error', v_err,
        CASE WHEN v_type = 'pronunciation'
             THEN 'Say this clearly: “' || left(g->>'error_text', 200) || '”'
             ELSE 'Fix this sentence:' || chr(10) || '“' || left(g->>'error_text', 300) || '”' END,
        left(g->>'corrected_text', 300),
        CASE WHEN NULLIF(g->>'cefr_topic', '') IS NOT NULL THEN 'Topic: ' || left(g->>'cefr_topic', 80) END);
    END IF;
  END LOOP;

  -- A speaking score for the skills chart.
  INSERT INTO public.skill_assessments (student_id, class_id, skill, score, teacher_comment, date, created_by)
  VALUES (v.student_id, v.class_id, 'speaking', p_score, left('Video homework: ' || h.title, 200), v_date, auth.uid())
  RETURNING id INTO v_skill;

  -- A CEFR point, if the analysis gave a level the table accepts.
  v_cefr := NULL;
  v_cefr_score := CASE a.cefr_estimate
    WHEN 'Pre-A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A1+' THEN 1.5 WHEN 'A2' THEN 2 WHEN 'A2+' THEN 2.5
    WHEN 'B1' THEN 3 WHEN 'B1+' THEN 3.5 WHEN 'B2' THEN 4 WHEN 'B2+' THEN 4.5 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END;
  IF v_cefr_score IS NOT NULL THEN
    INSERT INTO public.cefr_assessments
      (student_id, class_id, source, level, level_score, confidence, evidence, assessed_at, source_id, created_by)
    VALUES
      (v.student_id, v.class_id, 'ai_report', a.cefr_estimate, v_cefr_score, a.confidence,
       left('Video homework: ' || h.title, 500), v_date, v.id, auth.uid())
    RETURNING id INTO v_cefr;
  END IF;

  UPDATE public.video_analyses
     SET final_score = p_score,
         final_grade = p_grade,
         final_feedback_student = p_feedback_student,
         final_feedback_parent = p_feedback_parent,
         final_gaps = p_gaps,
         approved_by = auth.uid(),
         approved_at = now(),
         skill_assessment_id = v_skill,
         cefr_assessment_id = v_cefr,
         updated_at = now()
   WHERE video_submission_id = v.id;

  UPDATE public.video_submissions
     SET status = 'approved',
         homework_submission_id = v_sub,
         teacher_note = NULL
   WHERE id = v.id;

  RETURN jsonb_build_object(
    'homework_submission_id', v_sub,
    'errors_logged', v_errors,
    'student_id', v.student_id);
END;
$$;

-- Send it back for a new take, with a kind note.
CREATE OR REPLACE FUNCTION public.return_video_for_rerecord(p_video_submission uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT * INTO v FROM public.video_submissions WHERE id = p_video_submission FOR UPDATE;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'video submission % does not exist', p_video_submission;
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_teacher_of_class(auth.uid(), v.class_id)) THEN
    RAISE EXCEPTION 'Only a teacher of this class can return this video';
  END IF;
  IF v.status = 'approved' THEN
    RAISE EXCEPTION 'this video is already approved';
  END IF;
  UPDATE public.video_submissions
     SET status = 'returned', teacher_note = left(COALESCE(p_note, ''), 500)
   WHERE id = v.id;
END;
$$;

-- ---------------------------------------------------------------- 15
-- Execute rights.

REVOKE ALL ON FUNCTION public.video_staff_for_class(uuid)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_class_video_wall(uuid)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_upload_homework_video(text)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_homework_video(text)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_video_homework_for_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_video_progress(uuid)                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_class_video_wall(uuid, uuid)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_video_heart(uuid, uuid)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_video_feedback(uuid, integer, text, text, text, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_video_for_rerecord(uuid, text)      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.video_staff_for_class(uuid)                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_class_video_wall(uuid)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_homework_video(text)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_homework_video(text)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_video_homework_for_student(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_video_progress(uuid)                   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_class_video_wall(uuid, uuid)           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_video_heart(uuid, uuid)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_video_feedback(uuid, integer, text, text, text, jsonb, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_video_for_rerecord(uuid, text)      TO authenticated, service_role;

COMMIT;
