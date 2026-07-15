-- ═══════════════════════════════════════════════════════════════════════
-- AI Learning Profiles — the student's living language journey
-- ═══════════════════════════════════════════════════════════════════════
-- One row per student, continuously re-synthesized by the
-- refresh-student-profile edge function whenever new evidence lands
-- (approved work, vocab scans, analyzed transcripts). Every AI touchpoint
-- (work feedback, transcript coaching, report generation) reads this as
-- the student's educational context, so feedback is personalized from the
-- first upload onward.

CREATE TABLE IF NOT EXISTS public.student_learning_profiles (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  -- Compact narrative (~400 words max) of the whole journey so far.
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{area, evidence}]
  struggles JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{area, evidence, focus}]
  cefr_estimate TEXT,
  -- Evidence counters — cheap progress signal + guards the LLM re-summarize
  works_analyzed INT NOT NULL DEFAULT 0,
  vocab_words INT NOT NULL DEFAULT 0,
  transcripts_analyzed INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 0,                    -- bump per re-synthesis
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_learning_profiles" ON public.student_learning_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_read_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "students_read_own_learning_profile" ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id));

-- ── AI feedback on uploaded work ─────────────────────────────────────
-- Generated from the actual image + the student's profile; the teacher
-- reviews/edits it in the notes box before approving.
ALTER TABLE public.student_work
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- ── Deep transcript coaching columns ─────────────────────────────────
-- Per student per lesson: what they contributed, AI teacher-voice
-- feedback, and a concrete next-step recommendation.
ALTER TABLE public.transcript_speaker_metrics
  ADD COLUMN IF NOT EXISTS contribution TEXT,
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT;
