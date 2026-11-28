-- Defend My Level: the whole case (owner, 28 Nov 2026)
-- =====================================================
-- A child defends their level with EVERYTHING the school knows about their
-- English - the lessons, homework, skill scores, approved videos, words,
-- teacher-approved levels, the adaptive defence test - and with STANDARDIZED
-- test results (Cambridge YLE / KET / PET / FCE, IELTS, TOEFL Primary /
-- Junior, Oxford Placement Test ...), which staff record here.
--
-- 1. student_standardized_tests: one row per sitting, entered by staff from
--    the score report. cefr_level is the level the report states (or the
--    published score-to-CEFR mapping, which the admin screen suggests and a
--    person confirms). A person-made record, not a model's: cefr-defense
--    shows it to the child on Defend My Level. No family / student policy:
--    they read it through cefr-defense get_state, like the claim.
--
-- 2. cefr_level_claims.defense_open: an admin (or the child's teacher) opens
--    the defence for a child; while it is open the child may START the
--    adaptive test themselves from Defend My Level (cefr-defense start_test)
--    instead of waiting for staff to assign one. defense_note is the line
--    the child sees ("Defend A2 before the end of term"). `portfolio` is the
--    facts the last audit read (counts and dates, no model output) and
--    `case_summary` the combined case (staff only, via get_state).
--
-- Policies: admins all; a teacher of a class the child is enrolled in now
-- (can_view_student_in_class) reads and records. Grants are explicit because
-- 20260712023825 revoked the defaults on public.

CREATE TABLE IF NOT EXISTS public.student_standardized_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  test_name       text NOT NULL CHECK (length(btrim(test_name)) BETWEEN 1 AND 120),
  test_date       date NOT NULL,
  overall_score   numeric,
  score_label     text CHECK (score_label IS NULL OR length(score_label) <= 80),
  skill_scores    jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(skill_scores) = 'object'),
  cefr_level      text NOT NULL CHECK (cefr_level IN ('Pre-A1','A1','A1+','A2','A2+','B1','B1+','B2','B2+','C1','C2')),
  certificate_ref text CHECK (certificate_ref IS NULL OR length(certificate_ref) <= 120),
  notes           text CHECK (notes IS NULL OR length(notes) <= 2000),
  recorded_by     uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_standardized_tests_student
  ON public.student_standardized_tests(student_id, test_date DESC);

ALTER TABLE public.student_standardized_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sst_admin_all ON public.student_standardized_tests;
CREATE POLICY sst_admin_all ON public.student_standardized_tests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sst_teacher_read ON public.student_standardized_tests;
CREATE POLICY sst_teacher_read ON public.student_standardized_tests
  FOR SELECT TO authenticated
  USING (public.can_view_student_in_class(student_id, auth.uid()));

DROP POLICY IF EXISTS sst_teacher_insert ON public.student_standardized_tests;
CREATE POLICY sst_teacher_insert ON public.student_standardized_tests
  FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND public.can_view_student_in_class(student_id, auth.uid()));

-- A teacher corrects or removes only a result they recorded; admins any.
DROP POLICY IF EXISTS sst_teacher_update ON public.student_standardized_tests;
CREATE POLICY sst_teacher_update ON public.student_standardized_tests
  FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid() AND public.can_view_student_in_class(student_id, auth.uid()))
  WITH CHECK (recorded_by = auth.uid() AND public.can_view_student_in_class(student_id, auth.uid()));

DROP POLICY IF EXISTS sst_teacher_delete ON public.student_standardized_tests;
CREATE POLICY sst_teacher_delete ON public.student_standardized_tests
  FOR DELETE TO authenticated
  USING (recorded_by = auth.uid() AND public.can_view_student_in_class(student_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_standardized_tests TO authenticated;
GRANT ALL ON public.student_standardized_tests TO service_role;

ALTER TABLE public.cefr_level_claims
  ADD COLUMN IF NOT EXISTS defense_open      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS defense_opened_by uuid,
  ADD COLUMN IF NOT EXISTS defense_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS defense_note      text CHECK (defense_note IS NULL OR length(defense_note) <= 300),
  ADD COLUMN IF NOT EXISTS portfolio         jsonb,
  ADD COLUMN IF NOT EXISTS case_summary      jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cefr_level_claims TO authenticated;
GRANT ALL ON public.cefr_level_claims TO service_role;
