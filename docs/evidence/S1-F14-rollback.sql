-- ROLLBACK for supabase/migrations/20261113110000_homework_bucket_scope.sql (F-14).
--
-- Recreates, verbatim, the 36 policies that named bucket `homework` on
-- storage.objects in the live catalog on 13 Nov 2026 (pg_policies: name,
-- command, roles, USING, WITH CHECK), and removes the policies and the helper
-- functions the fix added. RUNNING THIS REOPENS F-14: every account holding
-- role student, family or teacher can again read every homework file.
-- Use it only if the fix breaks a screen and cannot be repaired forward.
--
-- scripts/pgtest/homework-bucket-scope.test.mjs executes this file after the
-- fix and asserts the old behaviour is back, so it is known to run.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS homework_admin_all ON storage.objects;
DROP POLICY IF EXISTS homework_read ON storage.objects;
DROP POLICY IF EXISTS homework_staff_insert ON storage.objects;
DROP POLICY IF EXISTS homework_staff_update ON storage.objects;
DROP POLICY IF EXISTS homework_staff_delete ON storage.objects;
DROP POLICY IF EXISTS homework_family_insert ON storage.objects;

-- ALL
CREATE POLICY "Admins manage all homework files" ON storage.objects FOR ALL TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));

-- DELETE
CREATE POLICY "Admins can delete any homework files" ON storage.objects FOR DELETE TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "hw_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));

-- INSERT
CREATE POLICY "Admins can upload any homework files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can upload homework files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework-submissions'::text) AND ((storage.foldername(name))[2] IN ( SELECT (students.id)::text AS id FROM students WHERE (students.linked_user_id = auth.uid()))));
CREATE POLICY "Students can upload homework submissions" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'student'::app_role) AND ((storage.foldername(name))[1] = 'submissions'::text));
CREATE POLICY "Students upload own homework submissions" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework-submissions'::text) AND (EXISTS ( SELECT 1 FROM students s WHERE (((s.id)::text = (storage.foldername(objects.name))[2]) AND ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT f.id FROM families f WHERE (f.primary_user_id = auth.uid()))))))));
CREATE POLICY "Teachers and admins can upload homework files" ON storage.objects FOR INSERT TO public
  WITH CHECK ((bucket_id = 'homework'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() IN ( SELECT teachers.user_id FROM teachers))));
CREATE POLICY "Teachers can upload homework assignments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'teacher'::app_role) AND ((storage.foldername(name))[1] = 'assignments'::text));
CREATE POLICY "Teachers can upload homework files" ON storage.objects FOR INSERT TO public
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (EXISTS ( SELECT 1 FROM teachers t WHERE (t.user_id = auth.uid()))));
CREATE POLICY "Teachers upload homework materials" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework'::text) AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teaching assistants upload homework files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM teaching_assistants ta WHERE ((ta.user_id = auth.uid()) AND ta.is_active))) AND (EXISTS ( SELECT 1 FROM homeworks h WHERE (((h.id)::text = ANY (ARRAY[(storage.foldername(objects.name))[1], (storage.foldername(objects.name))[2]])) AND is_teacher_of_class(auth.uid(), h.class_id)))));
CREATE POLICY "hw_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "hw_student_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'submissions'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'student'::app_role) AND (((storage.foldername(name))[3])::uuid IN ( SELECT students.id FROM students WHERE (students.linked_user_id = auth.uid())))) OR (has_role(auth.uid(), 'family'::app_role) AND (((storage.foldername(name))[3])::uuid IN ( SELECT s.id FROM (students s JOIN families f ON ((f.id = s.family_id))) WHERE (f.primary_user_id = auth.uid()))))));
CREATE POLICY "hw_teacher_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'teacher'::app_role) AND (EXISTS ( SELECT 1 FROM homeworks h WHERE (((h.id)::text = (storage.foldername(objects.name))[2]) AND is_teacher_of_class(auth.uid(), h.class_id)))))));

-- SELECT
CREATE POLICY "Admins can select homework files" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can view all homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view all homework" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Families read student homework submissions" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework-submissions'::text) AND (EXISTS ( SELECT 1 FROM (students s JOIN families f ON ((s.family_id = f.id))) WHERE (((s.id)::text = (storage.foldername(f.name))[2]) AND (f.primary_user_id = auth.uid())))));
CREATE POLICY "Family can view all homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'family'::app_role));
CREATE POLICY "Students can read their homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (((storage.foldername(name))[2] IN ( SELECT (students.id)::text AS id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers t WHERE (t.user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));
CREATE POLICY "Students can view all homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'student'::app_role));
CREATE POLICY "Students can view homework files" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'homework'::text) AND ((((storage.foldername(name))[1] = 'assignments'::text) AND (((storage.foldername(name))[2])::uuid IN ( SELECT h.id FROM ((homeworks h JOIN enrollments e ON ((e.class_id = h.class_id))) JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT f.id FROM families f WHERE (f.primary_user_id = auth.uid()))))))) OR (((storage.foldername(name))[1] = 'submissions'::text) AND (((storage.foldername(name))[2])::uuid IN ( SELECT s.id FROM students s WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT f.id FROM families f WHERE (f.primary_user_id = auth.uid())))))))));
CREATE POLICY "Students read own homework submissions" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework-submissions'::text) AND (EXISTS ( SELECT 1 FROM students WHERE (((students.id)::text = (storage.foldername(objects.name))[2]) AND (students.linked_user_id = auth.uid())))));
CREATE POLICY "Students view enrolled class assignments" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (name ~~ 'assignments/%'::text) AND (EXISTS ( SELECT 1 FROM ((students s JOIN enrollments e ON ((e.student_id = s.id))) JOIN homeworks h ON ((h.class_id = e.class_id))) WHERE ((s.linked_user_id = auth.uid()) AND (objects.name ~~ (('assignments/'::text || (h.id)::text) || '/%'::text))))));
CREATE POLICY "Students view own submissions" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (name ~~ 'submissions/%'::text) AND (EXISTS ( SELECT 1 FROM students s WHERE ((s.linked_user_id = auth.uid()) AND (objects.name ~~ (('submissions/%/'::text || (s.id)::text) || '/%'::text))))));
CREATE POLICY "Teachers and students can read homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (((storage.foldername(name))[1] IN ( SELECT (c.id)::text AS id FROM ((classes c JOIN sessions s ON ((s.class_id = c.id))) JOIN teachers t ON ((t.id = s.teacher_id))) WHERE (t.user_id = auth.uid()))) OR ((storage.foldername(name))[1] IN ( SELECT (e.class_id)::text AS class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()) UNION SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Teachers can view all homework files" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers read homework materials" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework'::text) AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers read homework submissions" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND ((storage.foldername(name))[1] = 'homework-submissions'::text) AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers view all homework" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM teachers WHERE (teachers.user_id = auth.uid()))));

-- UPDATE
CREATE POLICY "Admins can update any homework files" ON storage.objects FOR UPDATE TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers and admins can update homework files" ON storage.objects FOR UPDATE TO public
  USING ((bucket_id = 'homework'::text) AND (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() IN ( SELECT teachers.user_id FROM teachers))));
CREATE POLICY "Teachers can update homework files" ON storage.objects FOR UPDATE TO authenticated
  USING ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Teaching assistants update homework files" ON storage.objects FOR UPDATE TO authenticated
  USING ((bucket_id = 'homework'::text) AND (EXISTS ( SELECT 1 FROM homeworks h WHERE (((h.id)::text = ANY (ARRAY[(storage.foldername(objects.name))[1], (storage.foldername(objects.name))[2]])) AND is_teacher_of_class(auth.uid(), h.class_id)))) AND (EXISTS ( SELECT 1 FROM teaching_assistants ta WHERE ((ta.user_id = auth.uid()) AND ta.is_active))));
CREATE POLICY "hw_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role));

DROP FUNCTION IF EXISTS public.homework_object_can_read(text);
DROP FUNCTION IF EXISTS public.homework_object_staff_can(text);
DROP FUNCTION IF EXISTS public.homework_object_family_can_upload(text);
DROP FUNCTION IF EXISTS public.homework_object_scope(text);

COMMIT;
