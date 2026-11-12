-- ROLLBACK for supabase/migrations/20261113130000_classmate_rows_private.sql (F-16).
--
-- Recreates, verbatim from pg_policies on 13 Nov 2026, the four policies that
-- let a family's login read classmates' whole rows, and removes what the fix
-- added. RUNNING THIS REOPENS F-16. No row is changed by it.
--
-- scripts/pgtest/classmate-rows.test.mjs runs this file first (it is the
-- "before") and again after the fix, so it is known to execute.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Family logins can view siblings in their classes" ON public.students;
DROP POLICY IF EXISTS "Family logins can view siblings attendance" ON public.attendance;
DROP POLICY IF EXISTS "Family logins can view own children skill assessments" ON public.skill_assessments;
DROP POLICY IF EXISTS "Family logins can view own children class transactions" ON public.point_transactions;

DROP POLICY IF EXISTS "Students can view classmates for leaderboard" ON public.students;
CREATE POLICY "Students can view classmates for leaderboard" ON public.students FOR SELECT TO authenticated
  USING (can_view_classmate(id, auth.uid()));

DROP POLICY IF EXISTS "Classmates can view attendance" ON public.attendance;
CREATE POLICY "Classmates can view attendance" ON public.attendance FOR SELECT TO public
  USING ((EXISTS ( SELECT 1 FROM ((sessions sess JOIN enrollments viewer_enroll ON ((viewer_enroll.class_id = sess.class_id))) JOIN students viewer ON ((viewer.id = viewer_enroll.student_id))) WHERE ((sess.id = attendance.session_id) AND ((viewer_enroll.end_date IS NULL) OR (viewer_enroll.end_date > CURRENT_DATE)) AND ((viewer.linked_user_id = auth.uid()) OR (viewer.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid()))) OR (viewer.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))))))));

DROP POLICY IF EXISTS "Students can view class skill assessments" ON public.skill_assessments;
CREATE POLICY "Students can view class skill assessments" ON public.skill_assessments FOR SELECT TO authenticated
  USING ((class_id IN ( SELECT DISTINCT e.class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (s.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));

DROP POLICY IF EXISTS "Students can view class transactions" ON public.point_transactions;
CREATE POLICY "Students can view class transactions" ON public.point_transactions FOR SELECT TO authenticated
  USING ((class_id IN ( SELECT DISTINCT e.class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (s.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));

DROP FUNCTION IF EXISTS public.get_class_skill_points(uuid, date, date);
DROP FUNCTION IF EXISTS public.is_family_student(uuid, uuid);

COMMIT;
