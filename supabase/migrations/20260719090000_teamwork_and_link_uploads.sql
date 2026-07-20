-- Teamwork + link uploads for student work.
--
-- Teamwork: one submission attributed to a whole team of students (each
-- member sees it on their profile). Link upload: the work lives at an
-- external URL (Google Doc/Slides, Canva, a photo link) instead of an
-- uploaded file — so storage_path becomes optional.

ALTER TABLE public.student_work
  ADD COLUMN IF NOT EXISTS is_teamwork BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_student_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Link uploads carry no file, so storage_path can be null — but every row
-- must have SOMETHING to show: a stored file OR an external link.
ALTER TABLE public.student_work
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.student_work
  DROP CONSTRAINT IF EXISTS student_work_has_content;
ALTER TABLE public.student_work
  ADD CONSTRAINT student_work_has_content
  CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL);

-- 'teamwork' joins the workflow set (still an OCR-optional general-style
-- submission, just attributed to a team).
ALTER TABLE public.student_work
  DROP CONSTRAINT IF EXISTS student_work_workflow_check;
ALTER TABLE public.student_work
  ADD CONSTRAINT student_work_workflow_check
  CHECK (workflow IN ('general', 'vocab', 'teamwork'));

CREATE INDEX IF NOT EXISTS idx_student_work_members
  ON public.student_work USING GIN (member_student_ids);

-- Students see approved work assigned to them individually OR as a team
-- member. Replaces the individual-only read policy.
DROP POLICY IF EXISTS "students_read_approved_work" ON public.student_work;
CREATE POLICY "students_read_approved_work" ON public.student_work
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.linked_user_id = auth.uid()
        AND (s.id = student_work.student_id OR s.id = ANY(student_work.member_student_ids))
    )
  );
