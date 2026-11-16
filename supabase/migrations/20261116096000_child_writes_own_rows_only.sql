-- F-19 (S2): a child's login writes word-list rows about its own child only,
-- and the two buckets a family uploads into have a size limit.
--
-- THE DEFECT (audit F-19).
--   1. student_vocabulary_entries "vocab_insert_own" (20260801090000) is
--      WITH CHECK (user_id = auth.uid()) and nothing about student_id, and
--      "vocab_update_own_or_linked" lets the owner re-point a row at any
--      student_id. The row is then shown to THAT child (is_linked_student)
--      and to their teachers: any signed-in account can put a word, a
--      definition and an image_url into another child's word list.
--   2. The homework and submissions buckets have no file_size_limit: the
--      browser's 5 MB cap (HomeworkSubmission.tsx) is the only one.
--
-- WHAT THIS DOES
--   1. INSERT and the new row of an UPDATE must name no child, or a child
--      the caller can view (can_view_student: the child's login, second
--      login, family primary login). Reads, deletes and the claim on link
--      are unchanged. The browser never inserts here (save-word does, on
--      the service role, from the JWT's own child), so no screen changes.
--   2. file_size_limit 50 MB on `homework` and `submissions`, only where no
--      limit is set. PREFLIGHT: refuses if any stored object in either is
--      already larger, so no existing file is put out of reach of updates.
--
-- NOT CHANGED (argued in the evidence): daily_login_rewards,
-- student_login_streaks and early_submission_rewards - a child can inflate
-- its own streak or bonus counter, which feeds no point_transactions row, no
-- leaderboard and no bill. The homework bucket's "any student, anywhere under
-- submissions/" upload was closed by F-14 (20261113110000).
-- Rows / files: none changed. Idempotent. Rollback: <!-- rollback F-19 -->.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE v_big bigint;
BEGIN
  IF to_regclass('public.student_vocabulary_entries') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_vocabulary_entries / can_view_student missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_vocabulary_entries'
                  AND policyname = 'vocab_insert_own') THEN
    RAISE EXCEPTION 'Refusing to install: vocab_insert_own is not there - production is not in the state this file was written for';
  END IF;
  SELECT count(*) INTO v_big FROM storage.objects
   WHERE bucket_id IN ('homework', 'submissions')
     AND coalesce((metadata ->> 'size')::bigint, 0) > 52428800;
  IF v_big > 0 THEN
    RAISE EXCEPTION 'Refusing to install: % stored file(s) in homework / submissions are over 50 MB', v_big;
  END IF;
END
$preflight$;

DROP POLICY IF EXISTS "vocab_insert_own" ON public.student_vocabulary_entries;
CREATE POLICY "vocab_insert_own" ON public.student_vocabulary_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
              AND (student_id IS NULL OR public.can_view_student(student_id, auth.uid())));

DROP POLICY IF EXISTS "vocab_update_own_or_linked" ON public.student_vocabulary_entries;
CREATE POLICY "vocab_update_own_or_linked" ON public.student_vocabulary_entries
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id))
  )
  WITH CHECK (
    (user_id = auth.uid()
     OR (user_id IS NULL AND student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id)))
    AND (student_id IS NULL OR public.can_view_student(student_id, auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_vocabulary_entries TO authenticated;
GRANT ALL ON public.student_vocabulary_entries TO service_role;

UPDATE storage.buckets SET file_size_limit = 52428800
 WHERE id IN ('homework', 'submissions') AND file_size_limit IS NULL;

COMMIT;
