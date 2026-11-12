-- F-21: "I created this row" is not a licence to write about any child.
--
-- THE DEFECT. Four tables carry one FOR ALL policy of the same shape
--     <creator column> = auth.uid()  OR  (class_id IS NOT NULL AND is_teacher_of_class(...))
-- and nothing else for non-admins:
--   student_work        uploaded_by    "approved work" a child sees in My Work,
--                                      with teacher_notes and a link (external_url)
--   student_reports     generated_by   a report the child reads once `published`
--   cefr_assessments    created_by     the level a family sees on the growth chart
--   student_error_log   created_by     the child's error log (and SRS deck source)
-- The first half has no role test and no class test. Any signed-in account -
-- a parent, a child, one registered a minute ago - could insert a row naming
-- itself as creator, for ANY student_id, already `approved` / `published`,
-- and it then appeared on that child's pages as the school's own record.
-- public.resources had the same shape ("Teachers can insert own resources":
-- uploaded_by = auth.uid(), for anyone).
-- And nothing checked what kind of link sat in external_url: the app puts it
-- in an <a href> / window.open, where `javascript:` is not refused.
--
-- WHAT REPLACES IT, per table (admins keep their own FOR ALL policy):
--   SELECT  class staff as before; the creator only while holding role
--           teacher (a creator's own rows stay visible to a working teacher,
--           not to an account that has lost or never had the role);
--   INSERT  role teacher AND staff of the row's class (is_teacher_of_class)
--           AND the creator column is the caller AND the child belongs with
--           that class or with the caller's own classes (staff_may_write_for);
--   UPDATE  staff of the row's class, before and after; the same child test
--           on the new row. Being the creator is no longer enough;
--   DELETE  staff of the row's class.
-- student_work also checks every id in member_student_ids (team work is
-- shown to each member). No feature here is self-service for a child: the
-- child's own account only ever reads these tables.
--   resources: insert / update / delete own rows only while holding role
--   teacher or admin, and an update cannot hand the row to someone else.
--
-- AND THE LINKS. external_url on student_work and resources (and
-- resources.thumbnail_url) must be http:// or https:// with no whitespace or
-- control characters. NOT VALID: no existing row is re-checked at paste time
-- - all 41 live links already pass (counted 13 Nov) - but every new or
-- changed row is. The browser applies the same rule where it renders a link
-- (src/lib/safeUrl.ts).
--
-- WHO WRITES THESE TABLES TODAY, all unaffected:
--   the browser, as a teacher of the class: TeacherSmartUpload (student_work),
--     BulkReportExport from a class page (student_reports), TeacherTranscripts
--     and the live "flag" button (student_error_log, cefr_assessments) - each
--     sets the creator column to the caller and the class to the class open;
--   the browser, as an admin: AIReportDialog / BulkReportExport (admin policy);
--   edge functions on the service role: ocr-student-work, ocr-vocab-scan,
--     generate-work-feedback, generate-student-report, analyze-transcript,
--     cefr-defense; and approve_video_feedback (SECURITY DEFINER).
--
-- NOT TOUCHED: any row; the admin and student/family read policies;
-- resource_class_access (any teacher may still share a resource with any
-- class - that belongs with F-18). Idempotent.
-- Rollback: docs/evidence/S1-F21-rollback.sql.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.can_view_student_in_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / can_view_student_in_class / has_role missing';
  END IF;
  FOREACH t IN ARRAY ARRAY['student_work', 'student_reports', 'cefr_assessments', 'student_error_log', 'resources'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to install: public.% is missing or has row level security off', t;
    END IF;
  END LOOP;
END
$preflight$;

-- ------------------------------------------------------------------ helpers
-- May the signed-in caller write a row for this class about this child?
-- Role teacher, staff of the class, and the child (when there is one) has an
-- enrollment in that class - at any date, so work can be filed for a child
-- who has since moved on - or is currently in one of the caller's classes.
CREATE OR REPLACE FUNCTION public.staff_may_write_for(_class_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND _class_id IS NOT NULL
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
     AND coalesce(public.is_teacher_of_class(auth.uid(), _class_id), false)
     AND (   _student_id IS NULL
          OR EXISTS (SELECT 1 FROM public.enrollments e
                      WHERE e.student_id = _student_id AND e.class_id = _class_id)
          OR coalesce(public.can_view_student_in_class(_student_id, auth.uid()), false))
$function$;

-- The same child test for every member of a piece of team work.
CREATE OR REPLACE FUNCTION public.staff_may_write_for_members(_class_id uuid, _members uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(coalesce(_members, '{}'::uuid[])) AS m(student_id)
     WHERE m.student_id IS NULL
        OR NOT (   EXISTS (SELECT 1 FROM public.enrollments e
                            WHERE e.student_id = m.student_id AND e.class_id = _class_id)
                OR coalesce(public.can_view_student_in_class(m.student_id, auth.uid()), false)))
$function$;

-- "I made this, and I am (still) a teacher": the creator's read of own rows.
CREATE OR REPLACE FUNCTION public.staff_created_this(_creator uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND _creator = auth.uid()
     AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
$function$;

REVOKE EXECUTE ON FUNCTION public.staff_may_write_for(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_may_write_for_members(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_created_this(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_may_write_for(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_may_write_for_members(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_created_this(uuid) TO authenticated;

-- ------------------------------------------------------------------ student_work
DROP POLICY IF EXISTS teachers_manage_class_student_work ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_select ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_insert ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_update ON public.student_work;
DROP POLICY IF EXISTS student_work_staff_delete ON public.student_work;

CREATE POLICY student_work_staff_select ON public.student_work
  FOR SELECT TO authenticated
  USING (public.staff_created_this(uploaded_by)
         OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));

CREATE POLICY student_work_staff_insert ON public.student_work
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
              AND public.staff_may_write_for(class_id, student_id)
              AND public.staff_may_write_for_members(class_id, member_student_ids));

CREATE POLICY student_work_staff_update ON public.student_work
  FOR UPDATE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL))
  WITH CHECK (public.staff_may_write_for(class_id, student_id)
              AND public.staff_may_write_for_members(class_id, member_student_ids));

CREATE POLICY student_work_staff_delete ON public.student_work
  FOR DELETE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL));

-- ------------------------------------------------------------------ student_reports
DROP POLICY IF EXISTS teachers_manage_reports ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_select ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_insert ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_update ON public.student_reports;
DROP POLICY IF EXISTS student_reports_staff_delete ON public.student_reports;

CREATE POLICY student_reports_staff_select ON public.student_reports
  FOR SELECT TO authenticated
  USING (public.staff_created_this(generated_by)
         OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));

CREATE POLICY student_reports_staff_insert ON public.student_reports
  FOR INSERT TO authenticated
  WITH CHECK (generated_by = auth.uid() AND public.staff_may_write_for(class_id, student_id));

CREATE POLICY student_reports_staff_update ON public.student_reports
  FOR UPDATE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL))
  WITH CHECK (public.staff_may_write_for(class_id, student_id));

CREATE POLICY student_reports_staff_delete ON public.student_reports
  FOR DELETE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL));

-- ------------------------------------------------------------------ cefr_assessments
DROP POLICY IF EXISTS teachers_manage_class_cefr ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_select ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_insert ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_update ON public.cefr_assessments;
DROP POLICY IF EXISTS cefr_assessments_staff_delete ON public.cefr_assessments;

CREATE POLICY cefr_assessments_staff_select ON public.cefr_assessments
  FOR SELECT TO authenticated
  USING (public.staff_created_this(created_by)
         OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));

CREATE POLICY cefr_assessments_staff_insert ON public.cefr_assessments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.staff_may_write_for(class_id, student_id));

CREATE POLICY cefr_assessments_staff_update ON public.cefr_assessments
  FOR UPDATE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL))
  WITH CHECK (public.staff_may_write_for(class_id, student_id));

CREATE POLICY cefr_assessments_staff_delete ON public.cefr_assessments
  FOR DELETE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL));

-- ------------------------------------------------------------------ student_error_log
DROP POLICY IF EXISTS teachers_manage_class_error_log ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_select ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_insert ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_update ON public.student_error_log;
DROP POLICY IF EXISTS student_error_log_staff_delete ON public.student_error_log;

CREATE POLICY student_error_log_staff_select ON public.student_error_log
  FOR SELECT TO authenticated
  USING (public.staff_created_this(created_by)
         OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));

CREATE POLICY student_error_log_staff_insert ON public.student_error_log
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.staff_may_write_for(class_id, student_id));

CREATE POLICY student_error_log_staff_update ON public.student_error_log
  FOR UPDATE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL))
  WITH CHECK (public.staff_may_write_for(class_id, student_id));

CREATE POLICY student_error_log_staff_delete ON public.student_error_log
  FOR DELETE TO authenticated
  USING (public.staff_may_write_for(class_id, NULL));

-- ------------------------------------------------------------------ resources
DROP POLICY IF EXISTS "Teachers can insert own resources" ON public.resources;
DROP POLICY IF EXISTS "Teachers can update own resources" ON public.resources;
DROP POLICY IF EXISTS "Teachers can delete own resources" ON public.resources;
DROP POLICY IF EXISTS resources_staff_insert_own ON public.resources;
DROP POLICY IF EXISTS resources_staff_update_own ON public.resources;
DROP POLICY IF EXISTS resources_staff_delete_own ON public.resources;

CREATE POLICY resources_staff_insert_own ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
              AND (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY resources_staff_update_own ON public.resources
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid()
         AND (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK (uploaded_by = auth.uid()
              AND (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY resources_staff_delete_own ON public.resources
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid()
         AND (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- A creator-owned policy this file does not know would keep the door open.
DO $guard$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(tablename || '.' || quote_ident(policyname), ', ' ORDER BY tablename, policyname) INTO v_left
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('student_work', 'student_reports', 'cefr_assessments', 'student_error_log', 'resources')
     AND cmd IN ('ALL', 'INSERT', 'UPDATE')
     AND concat_ws(' ', qual, with_check) ~ '(uploaded_by|generated_by|created_by) = auth\.uid\(\)'
     AND concat_ws(' ', qual, with_check) !~ 'staff_may_write_for|has_role';
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to install: creator-owned write policies still present: %', v_left;
  END IF;
END
$guard$;

-- ------------------------------------------------------------------ links
ALTER TABLE public.student_work DROP CONSTRAINT IF EXISTS student_work_external_url_http;
ALTER TABLE public.student_work ADD CONSTRAINT student_work_external_url_http
  CHECK (external_url IS NULL OR external_url ~* '^https?://[^[:space:][:cntrl:]]+$') NOT VALID;

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_external_url_http;
ALTER TABLE public.resources ADD CONSTRAINT resources_external_url_http
  CHECK (external_url IS NULL OR external_url ~* '^https?://[^[:space:][:cntrl:]]+$') NOT VALID;

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_thumbnail_url_http;
ALTER TABLE public.resources ADD CONSTRAINT resources_thumbnail_url_http
  CHECK (thumbnail_url IS NULL OR thumbnail_url ~* '^https?://[^[:space:][:cntrl:]]+$') NOT VALID;

COMMIT;
