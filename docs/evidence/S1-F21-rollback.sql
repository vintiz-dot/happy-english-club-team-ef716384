-- ROLLBACK for supabase/migrations/20261113140000_creator_rows_need_class_staff.sql (F-21).
--
-- Recreates, verbatim from pg_policies on 13 Nov 2026, the four creator-owned
-- FOR ALL policies and the three policies on public.resources, and removes
-- what the fix added (policies, helper functions, the http(s) constraints).
-- RUNNING THIS REOPENS F-21. No row is changed by it.
--
-- scripts/pgtest/creator-rows.test.mjs runs this file first (it is the
-- "before") and again after the fix, so it is known to execute.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS student_work_staff_select ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_insert ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_update ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_delete ON public.student_work;
DROP POLICY IF EXISTS student_reports_staff_select ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_insert ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_update ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_delete ON public.student_reports;
DROP POLICY IF EXISTS cefr_assessments_staff_select ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_insert ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_update ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_delete ON public.cefr_assessments;
DROP POLICY IF EXISTS student_error_log_staff_select ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_insert ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_update ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_delete ON public.student_error_log;
DROP POLICY IF EXISTS resources_staff_insert_own ON public.resources;
DROP POLICY IF EXISTS resources_staff_update_own ON public.resources;
DROP POLICY IF EXISTS resources_staff_delete_own ON public.resources;

DROP POLICY IF EXISTS teachers_manage_class_student_work ON public.student_work;
CREATE POLICY teachers_manage_class_student_work ON public.student_work FOR ALL TO authenticated
  USING (((uploaded_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))))
  WITH CHECK (((uploaded_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))));

DROP POLICY IF EXISTS teachers_manage_reports ON public.student_reports;
CREATE POLICY teachers_manage_reports ON public.student_reports FOR ALL TO authenticated
  USING (((generated_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))))
  WITH CHECK (((generated_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))));

DROP POLICY IF EXISTS teachers_manage_class_cefr ON public.cefr_assessments;
CREATE POLICY teachers_manage_class_cefr ON public.cefr_assessments FOR ALL TO authenticated
  USING (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))))
  WITH CHECK (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))));

DROP POLICY IF EXISTS teachers_manage_class_error_log ON public.student_error_log;
CREATE POLICY teachers_manage_class_error_log ON public.student_error_log FOR ALL TO authenticated
  USING (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))))
  WITH CHECK (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND is_teacher_of_class(auth.uid(), class_id))));

DROP POLICY IF EXISTS "Teachers can insert own resources" ON public.resources;
CREATE POLICY "Teachers can insert own resources" ON public.resources FOR INSERT TO public
  WITH CHECK ((uploaded_by = auth.uid()));
DROP POLICY IF EXISTS "Teachers can update own resources" ON public.resources;
CREATE POLICY "Teachers can update own resources" ON public.resources FOR UPDATE TO public
  USING ((uploaded_by = auth.uid()));
DROP POLICY IF EXISTS "Teachers can delete own resources" ON public.resources;
CREATE POLICY "Teachers can delete own resources" ON public.resources FOR DELETE TO public
  USING ((uploaded_by = auth.uid()));

ALTER TABLE public.student_work DROP CONSTRAINT IF EXISTS student_work_external_url_http;
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_external_url_http;
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_thumbnail_url_http;

DROP FUNCTION IF EXISTS public.staff_may_write_for(uuid, uuid);
DROP FUNCTION IF EXISTS public.staff_may_write_for_members(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.staff_created_this(uuid);

COMMIT;
