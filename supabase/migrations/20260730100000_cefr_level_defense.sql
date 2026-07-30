-- CEFR Level Defense
-- ===================
-- The teacher declares a student's working CEFR level; the AI then either
-- (a) mines the platform's existing evidence (transcript speech, error log,
-- vocabulary, work samples) to support or challenge the claim, or (b)
-- generates an adaptive, CEFR-descriptor-aligned multistage test the student
-- takes to DEFEND the level. Results feed cefr_assessments so the growth
-- chart shows the whole story.

-- One active claim per student.
CREATE TABLE IF NOT EXISTS public.cefr_level_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  claimed_level TEXT NOT NULL CHECK (claimed_level IN ('Pre-A1','A1','A2','B1','B2','C1')),
  set_by UUID NOT NULL,
  -- unverified | supported | partially_supported | not_supported
  -- | test_assigned | defended | not_defended
  status TEXT NOT NULL DEFAULT 'unverified',
  evidence JSONB,
  evidence_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multistage-adaptive defense tests. `stages` holds generated items WITH
-- answer keys, so students get NO direct read access — the cefr-defense
-- edge function serves sanitized items and grades submissions server-side.
CREATE TABLE IF NOT EXISTS public.cefr_defense_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.cefr_level_claims(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  target_level TEXT NOT NULL,
  -- assigned | in_progress | graded
  status TEXT NOT NULL DEFAULT 'assigned',
  current_stage INT NOT NULL DEFAULT 1,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cefr_defense_tests_student
  ON public.cefr_defense_tests(student_id, created_at DESC);

ALTER TABLE public.cefr_level_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cefr_defense_tests ENABLE ROW LEVEL SECURITY;

-- Claims: admins everything; teachers manage their classes' claims;
-- students may READ their own claim (level + status, no secrets in it).
CREATE POLICY "admins_all_cefr_claims" ON public.cefr_level_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_cefr_claims" ON public.cefr_level_claims
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

CREATE POLICY "students_read_own_cefr_claim" ON public.cefr_level_claims
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = cefr_level_claims.student_id AND s.linked_user_id = auth.uid()
  ));

-- Tests: admins + class teachers read/manage. Students get NO direct select
-- (stages carry answer keys); they interact through the edge function.
CREATE POLICY "admins_all_cefr_tests" ON public.cefr_defense_tests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_cefr_tests" ON public.cefr_defense_tests
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
