-- F-18 (S2): "any teacher" storage rules become "staff of that class".
--
-- THE DEFECT (audit F-18, live storage policies 13 Nov 2026).
--   student-work      "staff_manage_student_work_files"  FOR ALL, admin OR
--                     has_role(teacher): every teacher and TA reads,
--                     overwrites, deletes and lists every child's work photo
--                     (217 live), whatever they teach.
--   lesson-resources  "staff_manage_lesson_resource_files"  the same shape.
--   exam-reports      "Teachers and admins upload exam-reports files"
--                     INSERT for any teacher, into any child's folder.
--   (homework         the two any-teacher UPDATE policies the audit names
--                     were dropped by 20261113110000, F-14: not touched here.)
--
-- WHERE THE FILES LIVE, and so how a file maps to a class
--   student-work      incoming/<uuid>.<ext> and teams/<uuid>.<ext>, uploaded
--                     by TeacherSmartUpload just BEFORE its student_work row
--                     is inserted; students/<student>/... after
--                     ocr-student-work (service role) routes it. The class is
--                     the student_work row whose storage_path is the name.
--   lesson-resources  <class_id>/<uuid>.<ext> (TeacherTranscripts).
--   exam-reports      <student_id>/<ts>-<name> (ExamReportEditor), uploaded
--                     before the exam_reports row, whose own INSERT policy
--                     already asks is_teacher_of_class.
--
-- WHAT REPLACES THEM
--   student-work      admin: everything. Staff (role teacher) of the class of
--                     the student_work row naming the file: read, replace,
--                     delete. The uploader, while holding role teacher: their
--                     own incoming/ or teams/ file (it has no row for a
--                     moment, and Storage reads back what it inserts). Upload:
--                     role teacher with a teacher or TA record, into
--                     incoming/ or teams/ only. The child's two read policies
--                     (students_read_own_work_files,
--                     students_read_approved_work_files) are kept.
--   lesson-resources  admin; staff (role teacher, is_teacher_of_class) of the
--                     class in the first folder: read, upload, replace,
--                     delete. students_read_lesson_resource_files is kept.
--   exam-reports      upload: admin, or role teacher for a child with an
--                     enrollment in a class the caller teaches now. The read
--                     and delete policies are unchanged.
--
-- PREFLIGHT / POSTFLIGHT. After the drops, any policy on student-work or
-- lesson-resources that this file does not know, or any other INSERT on
-- exam-reports, stops the paste: storage policies are OR-ed, so one loose one
-- left beside these would keep the door open behind a "success".
-- Rows / files: none changed. Idempotent. Rollback: <!-- rollback F-18 --> in
-- docs/evidence/S2-audit-medium-low.md.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regclass('public.student_work') IS NULL
     OR to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / has_role / student_work / enrollments missing';
  END IF;
END
$preflight$;

-- ------------------------------------------------------------------ helpers
CREATE OR REPLACE FUNCTION public.student_work_file_staff_can(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
     AND EXISTS (SELECT 1 FROM public.student_work w
                  WHERE w.storage_path = _name AND w.class_id IS NOT NULL
                    AND public.is_teacher_of_class(auth.uid(), w.class_id))
$$;

CREATE OR REPLACE FUNCTION public.student_work_file_may_upload(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND _name ~ '^(incoming|teams)/[^/]+$'
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
     AND (EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.teaching_assistants a WHERE a.user_id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.lesson_resource_file_staff_can(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
     AND split_part(_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND public.is_teacher_of_class(auth.uid(), split_part(_name, '/', 1)::uuid)
$$;

CREATE OR REPLACE FUNCTION public.exam_report_file_staff_may_upload(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
     AND split_part(_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND EXISTS (SELECT 1 FROM public.enrollments e
                  WHERE e.student_id = split_part(_name, '/', 1)::uuid
                    AND public.is_teacher_of_class(auth.uid(), e.class_id))
$$;

REVOKE EXECUTE ON FUNCTION public.student_work_file_staff_can(text), public.student_work_file_may_upload(text),
  public.lesson_resource_file_staff_can(text), public.exam_report_file_staff_may_upload(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_work_file_staff_can(text), public.student_work_file_may_upload(text),
  public.lesson_resource_file_staff_can(text), public.exam_report_file_staff_may_upload(text) TO authenticated, service_role;

-- ------------------------------------------------------------------ student-work
DROP POLICY IF EXISTS "staff_manage_student_work_files" ON storage.objects;
DROP POLICY IF EXISTS student_work_files_admin_all ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_select ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_insert ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_update ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_delete ON storage.objects;

CREATE POLICY student_work_files_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'student-work' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'student-work' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY student_work_files_staff_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-work' AND (public.student_work_file_staff_can(name)
         OR (owner = auth.uid() AND public.student_work_file_may_upload(name))));
CREATE POLICY student_work_files_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-work' AND public.student_work_file_may_upload(name));
CREATE POLICY student_work_files_staff_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'student-work' AND (public.student_work_file_staff_can(name)
         OR (owner = auth.uid() AND public.student_work_file_may_upload(name))))
  WITH CHECK (bucket_id = 'student-work' AND (public.student_work_file_staff_can(name)
         OR (owner = auth.uid() AND public.student_work_file_may_upload(name))));
CREATE POLICY student_work_files_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-work' AND (public.student_work_file_staff_can(name)
         OR (owner = auth.uid() AND public.student_work_file_may_upload(name))));

-- ------------------------------------------------------------------ lesson-resources
DROP POLICY IF EXISTS "staff_manage_lesson_resource_files" ON storage.objects;
DROP POLICY IF EXISTS lesson_resource_files_admin_all ON storage.objects;
DROP POLICY IF EXISTS lesson_resource_files_staff_all ON storage.objects;

CREATE POLICY lesson_resource_files_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lesson-resources' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'lesson-resources' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY lesson_resource_files_staff_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lesson-resources' AND public.lesson_resource_file_staff_can(name))
  WITH CHECK (bucket_id = 'lesson-resources' AND public.lesson_resource_file_staff_can(name));

-- ------------------------------------------------------------------ exam-reports
DROP POLICY IF EXISTS "Teachers and admins upload exam-reports files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers upload exam-reports files" ON storage.objects;
DROP POLICY IF EXISTS exam_report_files_staff_insert ON storage.objects;
CREATE POLICY exam_report_files_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exam-reports' AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.exam_report_file_staff_may_upload(name)));

-- ------------------------------------------------------------------ postflight
DO $postflight$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, cmd FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND concat_ws(' ', qual, with_check) ~ 'bucket_id = ''(student-work|lesson-resources)''(::text)?[ )]'
       AND policyname NOT IN ('student_work_files_admin_all', 'student_work_files_staff_select', 'student_work_files_staff_insert',
                              'student_work_files_staff_update', 'student_work_files_staff_delete',
                              'students_read_own_work_files', 'students_read_approved_work_files',
                              'lesson_resource_files_admin_all', 'lesson_resource_files_staff_all',
                              'students_read_lesson_resource_files')
  LOOP
    RAISE EXCEPTION 'Refusing to install: storage policy "%" (%) still reaches student-work / lesson-resources and this file does not know it', r.policyname, r.cmd;
  END LOOP;
  FOR r IN
    SELECT policyname, cmd FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('INSERT', 'ALL')
       AND concat_ws(' ', qual, with_check) ~ 'bucket_id = ''exam-reports''(::text)?[ )]'
       AND policyname NOT IN ('exam_report_files_staff_insert', 'Admins manage exam-reports storage')
  LOOP
    RAISE EXCEPTION 'Refusing to install: storage policy "%" (%) still lets an upload into exam-reports and this file does not know it', r.policyname, r.cmd;
  END LOOP;
END
$postflight$;

COMMIT;
