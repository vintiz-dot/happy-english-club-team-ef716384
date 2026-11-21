-- N-6 (privacy review, 17 Nov 2026): AI feedback on student work is a
-- STAFF-ONLY DRAFT until a teacher approves it.
--
-- THE GAP. student_work.ai_feedback held the model's note on a child's
-- scanned page. "students_read_approved_work" lets a child read their
-- approved rows - every column, so the raw AI text too (64 rows live), and
-- the table is in the realtime publication, which sends whole rows. And
-- generate-work-feedback overwrote that column on any row, approved or
-- not, with no status check.
--
-- WHAT A CHILD SEES IS UNCHANGED. The child's screens (MyWorkGallery,
-- StudentLessonDetail) show teacher_notes, never ai_feedback. teacher_notes
-- is what the teacher approved: Smart Upload's "Approve & publish" writes
-- the review box - pre-filled with the AI draft, edited or not - into
-- teacher_notes in the same update that sets status 'approved' and
-- approved_by. Live, all 64 approved rows with an AI text carry
-- teacher_notes (56 equal to the AI text as approved, 8 edited), and no
-- approved row has an AI text without one. So nothing a child sees today is
-- taken away, and nothing new appears.
--
-- WHAT THIS DOES
--   1. student_work_ai_drafts: one draft per work row. Staff read it
--      (admin, the uploader if a teacher, a teacher of the work's class: the
--      student_work_staff_select rule plus admins); nobody writes it from a
--      browser - only the service role (generate-work-feedback). No family or
--      student policy: none, ever.
--   2. The 65 existing AI texts are MOVED there (not deleted), checked, and
--      then cleared from student_work.
--   3. A draft cannot be written for work that has been reviewed (approved,
--      rejected): the teacher's decision stands. The check takes the work
--      row's lock, so it cannot interleave with an approval.
--   4. student_work.ai_feedback stays as a column (old code reading it gets
--      NULL) but can no longer hold text: an UPDATE that sets it is diverted
--      into the draft table (refused for reviewed work), an INSERT that sets
--      it is refused, and a CHECK keeps it NULL even if the trigger were
--      dropped.
--
-- Fails closed: refuses to install if what it builds on is missing, and
-- refuses to clear a single AI text it has not first copied verbatim.
-- Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.student_work') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: public.student_work is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'student_work' AND column_name = 'ai_feedback') THEN
    RAISE EXCEPTION 'Refusing to install: student_work.ai_feedback is missing';
  END IF;
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.staff_created_this(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: has_role / is_teacher_of_class / staff_created_this missing';
  END IF;
  -- Run twice: the draft table may hold only this migration's policy.
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'student_work_ai_drafts'
                AND policyname <> 'student_work_ai_drafts_staff_read') THEN
    RAISE EXCEPTION 'Refusing to install: student_work_ai_drafts has a policy this migration does not know';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------- 1
-- Who is staff for a piece of work: the rule of student_work_staff_select,
-- plus admins. SECURITY DEFINER so the answer does not depend on
-- student_work's own policies (a wider one could never widen this).

CREATE OR REPLACE FUNCTION public.student_work_draft_staff_can(_work uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (   coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)
          OR EXISTS (SELECT 1 FROM public.student_work w
                      WHERE w.id = _work
                        AND (   coalesce(public.staff_created_this(w.uploaded_by), false)
                             OR (w.class_id IS NOT NULL
                                 AND coalesce(public.is_teacher_of_class(auth.uid(), w.class_id), false)))));
$$;

CREATE TABLE IF NOT EXISTS public.student_work_ai_drafts (
  work_id      uuid PRIMARY KEY REFERENCES public.student_work(id) ON DELETE CASCADE,
  feedback     text NOT NULL,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL DEFAULT 'generate-work-feedback'
    CONSTRAINT student_work_ai_drafts_source_check
    CHECK (source IN ('generate-work-feedback', 'moved_from_student_work', 'service_role_write', 'staff_write'))
);

ALTER TABLE public.student_work_ai_drafts ENABLE ROW LEVEL SECURITY;

-- Read-only to signed-in staff (the policy decides who); written by the
-- service role alone. 20260712023825 revoked the defaults on public, so the
-- grants are explicit; SELECT is enough for PostgREST to serve the table.
REVOKE ALL ON public.student_work_ai_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_work_ai_drafts TO authenticated;
GRANT ALL ON public.student_work_ai_drafts TO service_role;

DROP POLICY IF EXISTS student_work_ai_drafts_staff_read ON public.student_work_ai_drafts;
CREATE POLICY student_work_ai_drafts_staff_read ON public.student_work_ai_drafts
  FOR SELECT TO authenticated
  USING (public.student_work_draft_staff_can(work_id));

-- ---------------------------------------------------------------- 2
-- Move the existing AI texts, verbatim, then clear them from the row a
-- child can read. The review guard (3) is put back after the move: the
-- texts being moved belong to work that has already been reviewed.

DROP TRIGGER IF EXISTS student_work_ai_drafts_guard ON public.student_work_ai_drafts;
-- The diversion (4), on a second run, would try to move what is moved.
DROP TRIGGER IF EXISTS student_work_ai_feedback_divert ON public.student_work;

INSERT INTO public.student_work_ai_drafts (work_id, feedback, generated_by, generated_at, source)
SELECT w.id, w.ai_feedback, NULL, w.updated_at, 'moved_from_student_work'
  FROM public.student_work w
 WHERE w.ai_feedback IS NOT NULL
ON CONFLICT (work_id) DO NOTHING;

DO $move$
DECLARE
  v_missing integer;
BEGIN
  SELECT count(*) INTO v_missing
    FROM public.student_work w
   WHERE w.ai_feedback IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.student_work_ai_drafts d
                      WHERE d.work_id = w.id AND d.feedback = w.ai_feedback);
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Refusing to clear student_work.ai_feedback: % row(s) were not copied verbatim', v_missing;
  END IF;
END
$move$;

UPDATE public.student_work SET ai_feedback = NULL WHERE ai_feedback IS NOT NULL;

-- ---------------------------------------------------------------- 3
-- No draft for reviewed work. FOR UPDATE takes the work row's lock: a draft
-- arriving while a teacher approves waits for the approval, then sees it.

CREATE OR REPLACE FUNCTION public.student_work_ai_drafts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.student_work WHERE id = NEW.work_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'student work % does not exist', NEW.work_id;
  END IF;
  IF v_status NOT IN ('processing', 'needs_review') THEN
    RAISE EXCEPTION 'student work % has been reviewed (%): its feedback is the teacher''s', NEW.work_id, v_status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_work_ai_drafts_guard
  BEFORE INSERT OR UPDATE ON public.student_work_ai_drafts
  FOR EACH ROW EXECUTE FUNCTION public.student_work_ai_drafts_guard();

-- ---------------------------------------------------------------- 4
-- student_work.ai_feedback can no longer hold text. An UPDATE that sets it
-- (generate-work-feedback as deployed before this change) becomes a draft -
-- refused, by 3, for reviewed work - and the column stays NULL.

CREATE OR REPLACE FUNCTION public.student_work_ai_feedback_divert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ai_feedback IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'student_work.ai_feedback is retired: AI drafts go to student_work_ai_drafts';
  END IF;
  -- An update that reviews the work AND sets a text (review N-3): the guard
  -- in 3 reads the row before this update, so it would let a draft onto
  -- reviewed work. Refused here instead.
  IF NEW.status NOT IN ('processing', 'needs_review') THEN
    RAISE EXCEPTION 'student work % is being reviewed (%): an AI draft cannot be written with it', NEW.id, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  -- Labelled by who actually wrote it (review N-3): the service role (the
  -- generate-work-feedback deployed before this change) or a signed-in
  -- member of staff through student_work's own update policy.
  INSERT INTO public.student_work_ai_drafts (work_id, feedback, generated_by, generated_at, source)
  VALUES (NEW.id, NEW.ai_feedback, auth.uid(), now(),
          CASE WHEN auth.uid() IS NULL THEN 'service_role_write' ELSE 'staff_write' END)
  ON CONFLICT (work_id) DO UPDATE
    SET feedback = EXCLUDED.feedback,
        generated_by = EXCLUDED.generated_by,
        generated_at = EXCLUDED.generated_at,
        source = EXCLUDED.source;
  NEW.ai_feedback := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_work_ai_feedback_divert
  BEFORE INSERT OR UPDATE OF ai_feedback ON public.student_work
  FOR EACH ROW EXECUTE FUNCTION public.student_work_ai_feedback_divert();

ALTER TABLE public.student_work DROP CONSTRAINT IF EXISTS student_work_ai_feedback_is_retired;
ALTER TABLE public.student_work
  ADD CONSTRAINT student_work_ai_feedback_is_retired CHECK (ai_feedback IS NULL);

-- ---------------------------------------------------------------- execute rights
REVOKE ALL ON FUNCTION public.student_work_draft_staff_can(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_work_draft_staff_can(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.student_work_ai_drafts_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_work_ai_feedback_divert() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Review N-8 (owner rule): words a model reads off a child's vocabulary
-- page reach the child's word bank only after a teacher approves them.
--
-- THE GAP. ocr-vocab-scan ran Vision + an LLM over a photographed page and
-- put every word it extracted straight into student_vocabulary_entries (the
-- child's word bank), awarded +10 points a word, logged grammar slips into
-- the error log and SRS deck, and marked the page 'approved' itself. Live:
-- 302 words for 3 children from 32 pages. Those stay as they are (history;
-- a teacher did upload each page) - this migration changes no existing row.
--
-- NOW
--   student_work_vocab_drafts: one pending set per page - the words the
--     model proposed (with meaning, example, grammar note and the images
--     already found), staff-only exactly like student_work_ai_drafts
--     (student_work_draft_staff_can, 20261117160000), written by the service
--     role alone. No student or family policy.
--   ocr-vocab-scan (scan) writes the pending set and leaves the page in
--     needs_review; (approve, a teacher's click in Smart Upload) takes the
--     set - deleting it is the claim, so two approvals cannot both commit -
--     and only then writes the words, points, activity, error log and cards
--     for the words the teacher kept.
--   A word the scan writes into the bank carries enrichment.approved_by.
--     An ocr_scan word without it is refused, so the function as deployed
--     before this change cannot keep writing unreviewed words in the window
--     before it is redeployed (its words come back "rejected", no points).
--
-- Fails closed: refuses to install without 20261117160000 and the word
-- bank. Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.student_work') IS NULL OR to_regclass('public.student_vocabulary_entries') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_work / student_vocabulary_entries missing';
  END IF;
  IF to_regprocedure('public.student_work_draft_staff_can(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_work_draft_staff_can missing (paste 20261117160000 first)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'student_vocabulary_entries' AND column_name = 'enrichment') THEN
    RAISE EXCEPTION 'Refusing to install: student_vocabulary_entries.enrichment missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'student_work_vocab_drafts'
                AND policyname <> 'student_work_vocab_drafts_staff_read') THEN
    RAISE EXCEPTION 'Refusing to install: student_work_vocab_drafts has a policy this migration does not know';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.student_work_vocab_drafts (
  work_id      uuid PRIMARY KEY REFERENCES public.student_work(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL,
  class_id     uuid,
  -- [{word, meaning, example, is_grammatical, corrected_example, images, status: 'new'|'duplicate'}]
  entries      jsonb NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT student_work_vocab_drafts_entries_array CHECK (jsonb_typeof(entries) = 'array'),
  ocr_text     text,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_work_vocab_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_work_vocab_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_work_vocab_drafts TO authenticated;
GRANT ALL ON public.student_work_vocab_drafts TO service_role;

DROP POLICY IF EXISTS student_work_vocab_drafts_staff_read ON public.student_work_vocab_drafts;
CREATE POLICY student_work_vocab_drafts_staff_read ON public.student_work_vocab_drafts
  FOR SELECT TO authenticated
  USING (public.student_work_draft_staff_can(work_id));

-- An OCR word enters a word bank only with a teacher's approval on it.
CREATE OR REPLACE FUNCTION public.vocab_ocr_words_need_a_teacher()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.enrichment->>'source' = 'ocr_scan'
     AND COALESCE(NEW.enrichment->>'approved_by', '') = '' THEN
    RAISE EXCEPTION 'A scanned word goes into a word bank only after a teacher approves it (Smart Upload review)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vocab_ocr_words_need_a_teacher ON public.student_vocabulary_entries;
CREATE TRIGGER vocab_ocr_words_need_a_teacher
  BEFORE INSERT ON public.student_vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION public.vocab_ocr_words_need_a_teacher();

REVOKE ALL ON FUNCTION public.vocab_ocr_words_need_a_teacher() FROM PUBLIC, anon, authenticated;

COMMIT;

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
-- Review M-1 (fix round): the guard also refuses to approve a video while
-- a run is under way (processing, touched in the last 15 minutes), so
-- approve_video_feedback rolls back whole; and analyze-video-submission
-- writes the run's outcome only while the row is still that run's
-- (status 'processing' and the analysis_runs the claim counted). Together:
-- an approved video is never moved back, and a family can never claim a
-- run on it.
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

  -- Review M-1: no approval while a new AI draft is being made (the run
  -- would otherwise land on top of it). approve_video_feedback's last step
  -- is this update, so the whole approval - grade, points, gaps, scores -
  -- rolls back. A run stuck for 15 minutes no longer holds it up.
  IF OLD.status = 'processing' AND NEW.status = 'approved'
     AND OLD.updated_at > now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'A new AI draft is being made for this video. Approve it once the draft is ready, or restart the draft if it has been stuck for 15 minutes.';
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

