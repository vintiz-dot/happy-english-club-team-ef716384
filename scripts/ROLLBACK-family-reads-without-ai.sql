-- ROLLBACK of supabase/migrations/20261117152000_family_reads_without_ai.sql
-- (privacy follow-ups; docs/evidence/PRIVACY-followups.md).
--
-- Puts back the four policies the migration dropped, exactly as production had
-- them (read live, 17 Nov 2026: pg_policies, roles {authenticated}, PERMISSIVE),
-- and removes the child's report RPC. After this, families and children read
-- the AI learning profile again, the child reads the AI evidence audit on their
-- claim and the whole published report (with the model's CEFR estimate) -
-- i.e. the state the owner's rule says must not be live. Run it only to undo a
-- broken paste; then fix and paste the migration again.
--
-- Changes no row. Safe to run twice. cefr_assessments and the drafts
-- (20261117151000) are untouched; roll that back separately, AFTER this file.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS family_read_children_learning_profiles ON public.student_learning_profiles;
CREATE POLICY family_read_children_learning_profiles ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS students_read_own_learning_profile ON public.student_learning_profiles;
CREATE POLICY students_read_own_learning_profile ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id));

DROP POLICY IF EXISTS students_read_own_cefr_claim ON public.cefr_level_claims;
CREATE POLICY students_read_own_cefr_claim ON public.cefr_level_claims
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s
                  WHERE s.id = cefr_level_claims.student_id AND s.linked_user_id = auth.uid()));

DROP POLICY IF EXISTS students_read_published_reports ON public.student_reports;
CREATE POLICY students_read_published_reports ON public.student_reports
  FOR SELECT TO authenticated
  USING (published AND public.is_linked_student(auth.uid(), student_id));

DROP FUNCTION IF EXISTS public.get_my_published_reports(uuid);

COMMIT;
