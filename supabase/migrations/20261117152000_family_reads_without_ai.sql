-- Families and children stop reading what a model wrote about them before a
-- teacher has approved it (privacy follow-ups, round 2;
-- docs/evidence/PRIVACY-followups.md). Paste AFTER 20261117151000.
--
-- OWNER'S RULE: nothing derived from a lesson or an AI reaches a family or a
-- child before a teacher approves.
--
-- 1. student_learning_profiles. refresh-student-profile has a model write
--    each child's summary, strengths, struggles and a CEFR estimate; no
--    teacher approves it. Families read it (family_read_children_learning_profiles,
--    FamilyDashboard showed the summary and the estimate on every child's card)
--    and so did the child (students_read_own_learning_profile). Live, 17 Nov:
--    42 profiles carry a model CEFR estimate. Both policies go. Staff keep
--    reading (admins_all_learning_profiles, teachers_read_class_learning_profiles)
--    and the edge functions keep using it as context for the drafts teachers
--    review. The family's card now shows the latest APPROVED level from
--    cefr_assessments (everything there is published: 20261117151000) and no
--    model text.
--
-- 2. cefr_level_claims. The child's own SELECT (students_read_own_cefr_claim)
--    exposed the whole evidence JSON the AI's evidence audit wrote - verdict,
--    rationale, recommended level - and the AI-driven status
--    (supported / not_supported / defended / not_defended). It goes. The child's
--    page reads the claim through cefr-defense get_state, which returns a
--    child only the teacher's level and progress, and the approved level once
--    a teacher has approved one. No screen read the table directly as a child.
--    cefr_defense_tests already had no child policy.
--
-- NOT TOUCHED: any row; every staff policy; cefr_assessments (published only).
-- Preflight fails closed: an RLS switch off, or any policy this file does not
-- know on the three tables, refuses the paste. Idempotent.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE
  t text;
  p record;
BEGIN
  IF to_regclass('public.cefr_assessment_drafts') IS NULL
     OR to_regprocedure('public.approve_cefr_draft(uuid, text)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: paste 20261117151000_cefr_model_drafts.sql first (the family card reads approved levels only once model levels are drafts)';
  END IF;
  FOREACH t IN ARRAY ARRAY['student_learning_profiles', 'cefr_level_claims', 'cefr_defense_tests', 'cefr_assessments'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to install: public.% is missing or has row level security off', t;
    END IF;
  END LOOP;
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename IN ('student_learning_profiles', 'cefr_level_claims', 'cefr_defense_tests')
  LOOP
    IF (p.tablename, p.policyname) NOT IN (
         ('student_learning_profiles', 'admins_all_learning_profiles'),
         ('student_learning_profiles', 'teachers_read_class_learning_profiles'),
         ('student_learning_profiles', 'family_read_children_learning_profiles'),
         ('student_learning_profiles', 'students_read_own_learning_profile'),
         ('cefr_level_claims', 'admins_all_cefr_claims'),
         ('cefr_level_claims', 'teachers_manage_class_cefr_claims'),
         ('cefr_level_claims', 'students_read_own_cefr_claim'),
         ('cefr_defense_tests', 'admins_all_cefr_tests'),
         ('cefr_defense_tests', 'teachers_manage_class_cefr_tests')) THEN
      RAISE EXCEPTION 'Refusing to install: unknown policy % on public.% - it may open these rows to a family or a child', p.policyname, p.tablename;
    END IF;
  END LOOP;
END
$preflight$;

DROP POLICY IF EXISTS family_read_children_learning_profiles ON public.student_learning_profiles;
DROP POLICY IF EXISTS students_read_own_learning_profile ON public.student_learning_profiles;
DROP POLICY IF EXISTS students_read_own_cefr_claim ON public.cefr_level_claims;

DO $after$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_left FROM pg_policies
   WHERE schemaname = 'public'
     AND (tablename, policyname) IN (('student_learning_profiles', 'family_read_children_learning_profiles'),
                                     ('student_learning_profiles', 'students_read_own_learning_profile'),
                                     ('cefr_level_claims', 'students_read_own_cefr_claim'));
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to commit: still present: %', v_left;
  END IF;
  RAISE NOTICE 'family reads without AI: learning profiles and level claims are staff-only now';
END
$after$;

COMMIT;
