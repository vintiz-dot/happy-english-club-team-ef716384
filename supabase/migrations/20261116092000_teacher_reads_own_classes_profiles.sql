-- F-06 (S2): a teacher reads the learning profiles of children in THEIR
-- classes, and no teacher reads a family's bill snapshot.
--
-- THE DEFECT (audit F-06, live catalog 13 Nov 2026). Three SELECT policies
-- test the role and nothing else:
--   student_learning_profiles  "teachers_read_learning_profiles"
--       has_role(auth.uid(), 'teacher')  -> every child's AI-written profile
--       (summary, strengths, struggles, CEFR estimate) to every teacher and
--       TA, whatever they teach;
--   monthly_finance_snapshots  "Teachers can read all monthly snapshots"
--       has_role(auth.uid(), 'teacher')  -> every family's closed-month bill,
--       discount, payments and carry;
--   monthly_leaders            "Admins and teachers view monthly leaders"
--       admin OR any teacher            -> every class's leader list.
--
-- WHAT REPLACES THEM
--   profiles   role teacher AND can_view_student_in_class(student_id, caller):
--              the same test the students row policy uses for staff (class
--              teacher, standing TA, cover teacher this week).
--   snapshots  no teacher policy at all. Admins keep "Admins can read all
--              monthly snapshots"; a child and the family keep their own.
--   leaders    admin, or staff of that class (is_teacher_of_class).
--
-- WHO READS THESE TODAY, all unaffected
--   profiles   LearningJourneyCard (a teacher on a child of their class, the
--              child, the family), FamilyDashboard (own children), the
--              edge functions on the service role (refresh-student-profile,
--              generate-*, cefr-defense, analyze-video-submission), and the
--              chat assistant as the caller - whose studentFor already holds
--              a teacher to their own classes' children.
--   snapshots  admin finance screens (useFinanceOverview,
--              useMonthlyFinanceSnapshots, CloseMonthDialog), the family's
--              PriorBalanceBreakdown (own child), snapshot-monthly-finance and
--              student-audit (service role). No teacher screen reads it.
--   leaders    nothing in src/ or supabase/functions reads it.
--
-- PREFLIGHT: the helpers exist and RLS is on. POSTFLIGHT: no SELECT / ALL
-- policy left on the three tables lets a bare teacher role through without a
-- class test - an OR-ed policy this file does not know would leave the door
-- open behind a "success", so the paste refuses instead.
-- Rows: none changed. Idempotent. Rollback: <!-- rollback F-06 --> in
-- docs/evidence/S2-audit-medium-low.md.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE t text;
BEGIN
  IF to_regprocedure('public.can_view_student_in_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: can_view_student_in_class / is_teacher_of_class / has_role missing';
  END IF;
  FOREACH t IN ARRAY ARRAY['student_learning_profiles', 'monthly_finance_snapshots', 'monthly_leaders'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to install: public.% is missing or has row level security off', t;
    END IF;
  END LOOP;
END
$preflight$;

DROP POLICY IF EXISTS "teachers_read_learning_profiles" ON public.student_learning_profiles;
DROP POLICY IF EXISTS "teachers_read_class_learning_profiles" ON public.student_learning_profiles;
CREATE POLICY "teachers_read_class_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'::public.app_role)
         AND public.can_view_student_in_class(student_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can read all monthly snapshots" ON public.monthly_finance_snapshots;

DROP POLICY IF EXISTS "Admins and teachers view monthly leaders" ON public.monthly_leaders;
DROP POLICY IF EXISTS "Admins and class staff view monthly leaders" ON public.monthly_leaders;
CREATE POLICY "Admins and class staff view monthly leaders" ON public.monthly_leaders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.is_teacher_of_class(auth.uid(), class_id));

-- Grants as they should be (20260712023825 revoked the defaults on public).
GRANT SELECT ON public.student_learning_profiles, public.monthly_finance_snapshots, public.monthly_leaders TO authenticated;
GRANT ALL ON public.student_learning_profiles, public.monthly_finance_snapshots, public.monthly_leaders TO service_role;

DO $postflight$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('student_learning_profiles', 'monthly_finance_snapshots', 'monthly_leaders')
       AND cmd IN ('SELECT', 'ALL')
       AND coalesce(qual, '') ~ 'teacher''::(public\.)?app_role'
       AND coalesce(qual, '') !~ '(can_view_student_in_class|is_teacher_of_class)'
  LOOP
    RAISE EXCEPTION 'Refusing to install: policy "%" on public.% still lets any teacher read every row', r.policyname, r.tablename;
  END LOOP;
END
$postflight$;

COMMIT;
