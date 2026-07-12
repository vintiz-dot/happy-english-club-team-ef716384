-- Track when a student has seen the grade celebration overlay,
-- so we can stop replaying it on every page load / device.
ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS celebration_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_homework_submissions_celebration_pending
  ON public.homework_submissions (student_id, graded_at DESC)
  WHERE status = 'graded' AND celebration_seen_at IS NULL;
