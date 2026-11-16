-- F-05 (S2): only staff of the class (or an admin, or the service role) set a
-- homework grade or the teacher's feedback.
--
-- THE DEFECT (audit F-05, live catalog 13 Nov 2026). homework_submissions'
-- student policies ("Students can insert / update own submissions",
-- 20260508153000) test only that the row is the caller's own child or a
-- child of the caller's family, with no WITH CHECK on UPDATE; every column is
-- granted to authenticated; the table has no column guard. So a child's or a
-- parent's login can write its own `grade`, `teacher_feedback`, `graded_at`
-- and `status = 'graded'` straight through the API - and
-- notify_homework_graded then tells the family a teacher graded it.
--
-- WHAT THIS DOES. A BEFORE INSERT OR UPDATE trigger. For a signed-in caller
-- who is neither an admin nor staff of the homework's class
-- (is_teacher_of_class: class teacher, standing TA, cover teacher):
--   INSERT  grade, teacher_feedback and graded_at must be empty and status
--           not 'graded';
--   UPDATE  grade, teacher_feedback, graded_at, homework_id and student_id
--           stay as they were, and status cannot move into or out of
--           'graded'.
-- Anything else is refused with 42501, nothing written. No uid (the service
-- role: stars-sync, edge functions; SQL run by the owner) passes, as do
-- SECURITY DEFINER functions acting for staff (approve_video_feedback,
-- return_video_for_rerecord: the uid is the teacher's).
--
-- WHAT A FAMILY STILL DOES, unchanged (HomeworkSubmission,
-- VideoHomeworkSubmission): insert or upsert its own submission with text,
-- file, status 'submitted', submitted_at, assignment_instructions; re-submit
-- while not yet graded; mark a celebration seen. None of those columns is
-- touched by the guard.
--
-- Trigger order: this runs before D4's zz_homework_evidence_keep (names sort
-- "homework_..." < "zz_..."); a refused write never reaches it.
-- Rows: none changed. Idempotent. Rollback: <!-- rollback F-05 --> in
-- docs/evidence/S2-audit-medium-low.md.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regclass('public.homework_submissions') IS NULL OR to_regclass('public.homeworks') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: homework_submissions / homeworks / is_teacher_of_class / has_role missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homework_submissions'
                  AND column_name IN ('grade', 'teacher_feedback', 'graded_at', 'status') HAVING count(*) = 4) THEN
    RAISE EXCEPTION 'Refusing to install: homework_submissions does not have grade / teacher_feedback / graded_at / status';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.homework_submissions_grade_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_class uuid;
BEGIN
  IF v_uid IS NULL OR coalesce(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RETURN NEW;
  END IF;
  SELECT h.class_id INTO v_class FROM public.homeworks h WHERE h.id = NEW.homework_id;
  IF v_class IS NOT NULL AND coalesce(public.is_teacher_of_class(v_uid, v_class), false) THEN
    -- staff of the class the row is moving TO; on a move, also of the one it leaves
    IF TG_OP = 'INSERT' OR NEW.homework_id = OLD.homework_id THEN RETURN NEW; END IF;
    SELECT h.class_id INTO v_class FROM public.homeworks h WHERE h.id = OLD.homework_id;
    IF v_class IS NOT NULL AND coalesce(public.is_teacher_of_class(v_uid, v_class), false) THEN RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.grade IS NOT NULL OR NEW.teacher_feedback IS NOT NULL OR NEW.graded_at IS NOT NULL
       OR NEW.status = 'graded' THEN
      RAISE EXCEPTION 'Only the class''s teacher can grade homework' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.grade IS DISTINCT FROM OLD.grade
     OR NEW.teacher_feedback IS DISTINCT FROM OLD.teacher_feedback
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     OR NEW.homework_id IS DISTINCT FROM OLD.homework_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR ((NEW.status = 'graded') IS DISTINCT FROM (OLD.status = 'graded')) THEN
    RAISE EXCEPTION 'Only the class''s teacher can grade homework' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$fn$;
REVOKE EXECUTE ON FUNCTION public.homework_submissions_grade_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS homework_submissions_grade_guard ON public.homework_submissions;
CREATE TRIGGER homework_submissions_grade_guard
  BEFORE INSERT OR UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.homework_submissions_grade_guard();

COMMIT;
