-- N-7 (privacy review, 17 Nov 2026): a family reads only what the teacher
-- approved - the final_* fields - from a video homework report.
--
-- THE GAP. get_video_progress built each approved video's per-criterion
-- list from video_analyses.criteria_scores: the column the model writes
-- (analyze-video-submission upserts it on every run). get_video_homework_
-- for_student did the same and also returned the model's strengths and
-- focus points (which no teacher screen shows, so no teacher ever saw them)
-- and each criterion's model comment. AGENTS.md: families get the final_*
-- fields only.
--
-- WHAT THE TEACHER'S PER-CRITERION SCORES ARE. VideoReviewPanel saves the
-- teacher's 0-4 per criterion into criteria_scores and then calls
-- approve_video_feedback, which stamps approved_at. Nothing kept that
-- moment's scores apart from a later model run. Now:
--   video_analyses.final_criteria  [{key,label,score,max}] - the scores as
--     they stood when the teacher approved (no comment, no evidence: those
--     are the model's words). Set by a trigger whenever approved_at is
--     stamped, so approve_video_feedback is unchanged.
--   Backfill: an approved analysis untouched since its approval
--     (updated_at = approved_at, which approve_video_feedback writes in the
--     same statement) gets its criteria as they are. One touched afterwards
--     gets none until a teacher approves again. Live: 1 approved, untouched.
--
-- WHAT A FAMILY GETS NOW
--   get_video_progress: score = final_score, criteria = final_criteria,
--     gaps = final_gaps, pronunciation (the browser's own measurement).
--   get_video_homework_for_student report: score, grade, feedback,
--     parent_note (all final_*), criteria = final_criteria (label, score,
--     max), approved_at. strengths and focus_points are kept as keys and
--     are empty: no teacher approved them.
-- STAFF: an admin, or a teacher of the video's class (of the homework's
-- class for the single report), gets exactly what they got before - they
-- read video_analyses directly anyway. Review N-10 (fix round): in
-- get_video_progress that is now per video - a teacher of another class
-- the child is or was enrolled in no longer sees this class's videos.
--
-- Fails closed: refuses to replace either function unless it is the
-- version 20261109090000 installed (or this one). Safe to run twice.

BEGIN;

DO $pre$
DECLARE
  v_progress text;
  v_report   text;
BEGIN
  IF to_regclass('public.video_analyses') IS NULL OR to_regclass('public.video_submissions') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: video homework tables missing (20261109090000)';
  END IF;
  SELECT md5(replace(p.prosrc, chr(13), '')) INTO v_progress FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.get_video_progress(uuid)');
  SELECT md5(replace(p.prosrc, chr(13), '')) INTO v_report FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.get_video_homework_for_student(uuid, uuid)');
  IF v_progress IS NULL OR v_report IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: get_video_progress / get_video_homework_for_student missing';
  END IF;
  IF v_progress <> '293e4ee84850881050057629b67e8e54'
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.get_video_progress(uuid)')
                       AND prosrc LIKE '%N-7: families read final only%') THEN
    RAISE EXCEPTION 'Refusing to install: get_video_progress is not the version this migration replaces (md5 %)', v_progress;
  END IF;
  IF v_report <> 'd1ab0a9fb81dd8d371f2fcb99ec3352b'
     AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.get_video_homework_for_student(uuid, uuid)')
                       AND prosrc LIKE '%N-7: families read final only%') THEN
    RAISE EXCEPTION 'Refusing to install: get_video_homework_for_student is not the version this migration replaces (md5 %)', v_report;
  END IF;
END
$pre$;

-- ---------------------------------------------------------------- 1
ALTER TABLE public.video_analyses ADD COLUMN IF NOT EXISTS final_criteria jsonb;

-- The teacher's per-criterion scores, without the model's words.
CREATE OR REPLACE FUNCTION public.video_criteria_scores_only(p jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'key', c->>'key', 'label', c->>'label', 'score', c->'score', 'max', c->'max')), '[]'::jsonb)
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p) = 'array' THEN p ELSE '[]'::jsonb END) c;
$$;

CREATE OR REPLACE FUNCTION public.video_analyses_keep_final_criteria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.approved_at IS DISTINCT FROM OLD.approved_at) THEN
    NEW.final_criteria := public.video_criteria_scores_only(NEW.criteria_scores);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS video_analyses_keep_final_criteria ON public.video_analyses;
CREATE TRIGGER video_analyses_keep_final_criteria
  BEFORE INSERT OR UPDATE ON public.video_analyses
  FOR EACH ROW EXECUTE FUNCTION public.video_analyses_keep_final_criteria();

-- Backfill only what is provably the approved version.
UPDATE public.video_analyses
   SET final_criteria = public.video_criteria_scores_only(criteria_scores)
 WHERE approved_at IS NOT NULL
   AND final_criteria IS NULL
   AND updated_at = approved_at;

-- ---------------------------------------------------------------- 2
CREATE OR REPLACE FUNCTION public.get_video_progress(p_student uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin  boolean;
  v_family boolean;
BEGIN
  -- N-7: families read final only. Staff see what they saw before - but
  -- (review N-10) staff of the VIDEO's class: a teacher of some other class
  -- the child is or was in no longer gets the model's scores for it.
  v_admin  := COALESCE(public.has_role(auth.uid(), 'admin'::app_role), false);
  v_family := COALESCE(public.can_view_student(p_student, auth.uid()), false);
  IF NOT (v_admin OR v_family
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
        'criteria', CASE WHEN v.staff
          THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'key', c->>'key', 'label', c->>'label', 'score', c->'score', 'max', c->'max')), '[]'::jsonb)
                FROM jsonb_array_elements(a.criteria_scores) c)
          ELSE COALESCE(a.final_criteria, '[]'::jsonb) END,
        'pronunciation', CASE WHEN v.pronunciation IS NOT NULL THEN jsonb_build_object(
            'accuracy', v.pronunciation->'accuracy',
            'fluency', v.pronunciation->'fluency',
            'prosody', v.pronunciation->'prosody') END,
        'gaps', COALESCE(a.final_gaps, '[]'::jsonb)
      ) ORDER BY COALESCE(h.due_date, v.submitted_at::date))
      FROM (SELECT vs.*, (v_admin OR COALESCE(public.is_teacher_of_class(auth.uid(), vs.class_id), false)) AS staff
              FROM public.video_submissions vs) v
      JOIN public.homeworks h ON h.id = v.homework_id
      JOIN public.video_analyses a ON a.video_submission_id = v.id
      WHERE v.student_id = p_student AND v.status = 'approved'
        -- Staff of the video's class see it as before; the child and their
        -- family once a teacher has approved it; anyone else not at all.
        AND (v.staff OR (v_family AND a.approved_at IS NOT NULL))
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------- 3
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
  v_staff boolean;
BEGIN
  -- N-7: families read final only. Staff see what they saw before.
  SELECT * INTO h FROM public.homeworks WHERE id = p_homework;
  IF h.id IS NULL THEN RETURN NULL; END IF;
  v_staff := public.video_staff_for_class(h.class_id);
  IF NOT (v_staff OR public.can_view_student(p_student, auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO r FROM public.video_homework_rubrics WHERE homework_id = p_homework;
  SELECT * INTO v FROM public.video_submissions WHERE homework_id = p_homework AND student_id = p_student;
  -- Always assigned, so a missing row reads as NULLs rather than an error.
  SELECT * INTO a FROM public.video_analyses
   WHERE video_submission_id = v.id AND v.status = 'approved'
     AND (v_staff OR approved_at IS NOT NULL);

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
    -- Only ever the teacher's final words (and, for a family, the teacher's
    -- final scores per criterion - never the model's strengths, focus
    -- points or comments, which no teacher approved).
    'report', CASE
      WHEN a.video_submission_id IS NULL THEN NULL
      WHEN v_staff THEN jsonb_build_object(
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
      ELSE jsonb_build_object(
        'score', a.final_score,
        'grade', a.final_grade,
        'feedback', a.final_feedback_student,
        'parent_note', a.final_feedback_parent,
        'strengths', '[]'::jsonb,
        'focus_points', '[]'::jsonb,
        'criteria', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'label', c->>'label', 'score', c->'score', 'max', c->'max')), '[]'::jsonb)
                     FROM jsonb_array_elements(COALESCE(a.final_criteria, '[]'::jsonb)) c),
        'approved_at', a.approved_at)
      END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.video_criteria_scores_only(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.video_criteria_scores_only(jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.video_analyses_keep_final_criteria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_video_progress(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_video_homework_for_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_video_progress(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_video_homework_for_student(uuid, uuid) TO authenticated, service_role;

COMMIT;
