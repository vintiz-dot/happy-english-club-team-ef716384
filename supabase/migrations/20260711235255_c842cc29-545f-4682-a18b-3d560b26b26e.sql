
-- 1. discount_definitions: remove broad SELECT
DROP POLICY IF EXISTS "All authenticated users can view active discounts" ON public.discount_definitions;

-- 2. monthly_leaders: scope
DROP POLICY IF EXISTS "Everyone can view monthly leaders" ON public.monthly_leaders;
CREATE POLICY "Admins and teachers view monthly leaders"
ON public.monthly_leaders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

-- 3. sessions: scope to enrolled/teaching/admin
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.sessions;
CREATE POLICY "Enrolled or teaching users view sessions"
ON public.sessions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_teacher_of_class(auth.uid(), class_id)
  OR public.is_student_enrolled_in_class(auth.uid(), class_id)
);

-- 4. teachers PII: revoke email/phone from authenticated (self policy still returns full row for own record)
REVOKE SELECT (email, phone) ON public.teachers FROM authenticated, anon;
GRANT SELECT (email, phone) ON public.teachers TO service_role;

-- 5. teaching_assistants PII
REVOKE SELECT (email, phone) ON public.teaching_assistants FROM authenticated, anon;
GRANT SELECT (email, phone) ON public.teaching_assistants TO service_role;

-- 6. exam-reports storage: restrict upload
DROP POLICY IF EXISTS "Teachers upload exam-reports files" ON storage.objects;
CREATE POLICY "Teachers and admins upload exam-reports files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-reports'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- 7. resources storage: bind upload to own folder
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
CREATE POLICY "Users upload resources to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 8. homework submissions storage: bind to caller's student id (submissions bucket)
DROP POLICY IF EXISTS "Students can upload submission files" ON storage.objects;
CREATE POLICY "Students upload submissions to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] IN (
    SELECT (s.id)::text FROM public.students s
    WHERE s.linked_user_id = auth.uid()
       OR s.secondary_user_id = auth.uid()
       OR s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = auth.uid())
  )
);

-- 9. SECURITY DEFINER functions: revoke default public EXECUTE, grant only where needed
REVOKE EXECUTE ON FUNCTION public.assert_job_lock(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_and_reset_monthly_leaderboard(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_journal_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_direct_payment_deletion() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_journal_owner_membership() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_student_points_on_delete() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_homework_point_transaction() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_attendance_excused_on_cancel() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.count_vocab_saves_today(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._attendance_seed_for_class_dates(uuid, date, date) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._attendance_after_session_ins() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._attendance_after_enrollment_ins() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_session_status_on_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_end_enrollments_on_deactivation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_journal_post() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admin_enrollment_request() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_student_points_from_transaction() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_student_points_timestamp() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_student_vocab_entry() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_vocab_cache() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_status_message() FROM anon, authenticated, PUBLIC;

-- Keep client-callable helpers accessible to authenticated only:
-- has_role, is_teacher_of_class, is_student_enrolled_in_class, is_journal_member,
-- is_journal_owner, can_view_student, get_user_role, check_teacher_availability,
-- get_student_homeworks
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_student_enrolled_in_class(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_journal_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_journal_owner(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_student(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_teacher_availability(uuid, date, time, time, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_homeworks(uuid) FROM anon, PUBLIC;
