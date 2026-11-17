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
