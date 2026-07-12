-- Per-student vocabulary entries — the database-backed personal word bank.
-- Each row represents one word saved by one student, with the student's own
-- example sentences (anti-cheat validated server-side), Leitner-system
-- spaced-repetition fields, and a snapshot of the AI enrichment payload.
--
-- This table doubles as a shared cache: when another student looks up the
-- same word, the word-enrichment edge function can surface community-
-- validated examples instead of round-tripping to OpenAI/image APIs.
--
-- RLS:
--   - Students see + manage only their own rows.
--   - Teachers can read rows whose class_id maps to a class they teach
--     (uses the existing is_teacher_of_class RPC).
-- A separate edge-function-mediated read path exposes anonymized community
-- examples across users via service-role and is NOT subject to RLS.

CREATE TABLE IF NOT EXISTS public.student_vocabulary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  word TEXT NOT NULL,
  root_word TEXT NOT NULL,
  cefr TEXT,
  definition_en TEXT,
  definition_vi TEXT,
  user_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  enrichment JSONB,
  image_url TEXT,
  mastery_level SMALLINT NOT NULL DEFAULT 0,
  times_reviewed INT NOT NULL DEFAULT 0,
  times_correct INT NOT NULL DEFAULT 0,
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_sve_word ON public.student_vocabulary_entries(word);
CREATE INDEX IF NOT EXISTS idx_sve_user ON public.student_vocabulary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_sve_class_created
  ON public.student_vocabulary_entries(class_id, created_at DESC)
  WHERE class_id IS NOT NULL;

ALTER TABLE public.student_vocabulary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_manage_own_vocab" ON public.student_vocabulary_entries;
CREATE POLICY "students_manage_own_vocab"
  ON public.student_vocabulary_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "teachers_read_class_vocab" ON public.student_vocabulary_entries;
CREATE POLICY "teachers_read_class_vocab"
  ON public.student_vocabulary_entries
  FOR SELECT TO authenticated
  USING (
    class_id IS NOT NULL
    AND public.is_teacher_of_class(auth.uid(), class_id)
  );

-- Keep updated_at fresh on any UPDATE.
CREATE OR REPLACE FUNCTION public.touch_student_vocab_entry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sve_updated_at ON public.student_vocabulary_entries;
CREATE TRIGGER trg_sve_updated_at
  BEFORE UPDATE ON public.student_vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_student_vocab_entry();

-- ──────────────────────────────────────────────────────────────────────
-- Vocab activity events — append-only audit trail used by the teacher
-- dashboard for monthly drill-down. Every save / practice answer writes
-- one row here, even if the underlying entry already existed.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vocab_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  word TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('save', 'practice_correct', 'practice_incorrect', 'edit', 'delete')),
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_val_class_month
  ON public.vocab_activity_log(class_id, created_at DESC)
  WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_val_user_month
  ON public.vocab_activity_log(user_id, created_at DESC);

ALTER TABLE public.vocab_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_activity" ON public.vocab_activity_log;
CREATE POLICY "users_insert_own_activity"
  ON public.vocab_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_own_activity" ON public.vocab_activity_log;
CREATE POLICY "users_read_own_activity"
  ON public.vocab_activity_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "teachers_read_class_activity" ON public.vocab_activity_log;
CREATE POLICY "teachers_read_class_activity"
  ON public.vocab_activity_log
  FOR SELECT TO authenticated
  USING (
    class_id IS NOT NULL
    AND public.is_teacher_of_class(auth.uid(), class_id)
  );
