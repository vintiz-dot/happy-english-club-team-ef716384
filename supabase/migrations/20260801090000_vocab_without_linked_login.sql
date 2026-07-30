-- ═══════════════════════════════════════════════════════════════════════
-- Vocabulary entries must survive for students who have no login yet.
-- ═══════════════════════════════════════════════════════════════════════
--
-- THE BUG THIS FIXES
--
-- A teacher photographs a handwritten vocabulary page, picks the student in
-- Smart Upload, and every single word comes back "skipped — student not
-- linked". The scan ran, Vision read the page, OpenAI structured the words,
-- and then ocr-vocab-scan threw them all away.
--
-- It had to, as written: `user_id` was NOT NULL and referenced auth.users,
-- and the only student-facing policy was `user_id = auth.uid()`. The word
-- bank was keyed to LOGIN ACCOUNTS, not to students. So a child who does not
-- yet have an app account could not own a word — even though the teacher had
-- correctly identified them.
--
-- Two different meanings of "linked" collided: picking a student in the
-- uploader (attribution) versus that student having an auth account attached
-- (students.linked_user_id). The teacher did the first and the error message
-- complained about the second.
--
-- THE FIX
--
-- `student_id` becomes the durable owner. `user_id` becomes an optional
-- fast path that gets stamped in later, when and if the child gets a login
-- (see public.claim_vocab_for_student, called by link-student-user).
-- Nothing is lost in the meantime, and nothing about who may READ a row
-- gets loosened: a student still only ever sees rows that are theirs.

-- ── 1. user_id becomes optional ────────────────────────────────────────
ALTER TABLE public.student_vocabulary_entries
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.vocab_activity_log
  ALTER COLUMN user_id DROP NOT NULL;

-- ── 2. Keep de-duplication working for unlinked students ───────────────
-- UNIQUE(user_id, word) stops enforcing anything once user_id is NULL,
-- because NULLs are never equal to each other in a unique index. Without
-- this partial index a rescan of the same page would duplicate every word.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sve_unique_student_word_unowned
  ON public.student_vocabulary_entries (student_id, word)
  WHERE user_id IS NULL AND student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sve_student_created
  ON public.student_vocabulary_entries (student_id, created_at DESC)
  WHERE student_id IS NOT NULL;

-- ── 3. RLS: ownership follows the student, not just the account ─────────
-- The old single FOR ALL policy is replaced by explicit per-command
-- policies so that "may read" and "may create" can differ:
--   READ   — rows I own, or rows belonging to the student I am linked to.
--   INSERT — only rows I own outright. A student can never conjure a row
--            for somebody else, and never one with a NULL owner.
--   UPDATE — I may review/practise a row a teacher scanned for me, but I
--            may not re-assign it to another account.
DROP POLICY IF EXISTS "students_manage_own_vocab" ON public.student_vocabulary_entries;

CREATE POLICY "vocab_select_own_or_linked"
  ON public.student_vocabulary_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id))
  );

CREATE POLICY "vocab_insert_own"
  ON public.student_vocabulary_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vocab_update_own_or_linked"
  ON public.student_vocabulary_entries
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND student_id IS NOT NULL
        AND public.is_linked_student(auth.uid(), student_id))
  );

CREATE POLICY "vocab_delete_own"
  ON public.student_vocabulary_entries
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id))
  );

-- Staff read path. The existing policy only matched on class_id, which is
-- NULL for a scan uploaded without a class selected — so a teacher could not
-- see words they had just scanned themselves.
DROP POLICY IF EXISTS "teachers_read_class_vocab" ON public.student_vocabulary_entries;
CREATE POLICY "staff_read_class_vocab"
  ON public.student_vocabulary_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
    OR (
      student_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.student_id = student_vocabulary_entries.student_id
          AND public.is_teacher_of_class(auth.uid(), e.class_id)
      )
    )
  );

-- ── 4. Claim the word bank when a login finally arrives ────────────────
-- Called by link-student-user (service role) after students.linked_user_id
-- is set, so a child who joins the app later inherits every word a teacher
-- ever scanned for them instead of starting empty.
--
-- Words the account already holds are left alone: stamping them would
-- violate UNIQUE(user_id, word), and the account's own copy is the one with
-- their real review history.
CREATE OR REPLACE FUNCTION public.claim_vocab_for_student(
  p_student_id UUID,
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed INT;
BEGIN
  IF p_student_id IS NULL OR p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH moved AS (
    UPDATE public.student_vocabulary_entries sve
       SET user_id = p_user_id
     WHERE sve.student_id = p_student_id
       AND sve.user_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.student_vocabulary_entries other
         WHERE other.user_id = p_user_id
           AND other.word = sve.word
       )
    RETURNING 1
  )
  SELECT count(*) INTO claimed FROM moved;

  UPDATE public.vocab_activity_log
     SET user_id = p_user_id
   WHERE student_id = p_student_id
     AND user_id IS NULL;

  RETURN COALESCE(claimed, 0);
END;
$$;

-- Backfill is an administrative act. Only the service role may run it —
-- never a logged-in client, which could otherwise point somebody else's
-- word bank at its own account.
REVOKE ALL ON FUNCTION public.claim_vocab_for_student(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_vocab_for_student(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.claim_vocab_for_student(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vocab_for_student(UUID, UUID) TO service_role;

-- ── 5. Adopt words already stranded by the old behaviour ───────────────
-- Any student who DOES have a login gets their existing rows confirmed;
-- this is a no-op on a healthy database and repairs one where words were
-- written before the column was nullable.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, linked_user_id FROM public.students
     WHERE linked_user_id IS NOT NULL
  LOOP
    PERFORM public.claim_vocab_for_student(r.id, r.linked_user_id);
  END LOOP;
END $$;

COMMENT ON COLUMN public.student_vocabulary_entries.user_id IS
  'Optional auth account. NULL means the student has no login yet — the row '
  'is owned via student_id and is claimed by claim_vocab_for_student() when '
  'an account is linked. Never require this to be set before saving a word.';
