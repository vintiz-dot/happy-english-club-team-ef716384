
-- 1. class_monitors: replace broad SELECT policy with scoped access
DROP POLICY IF EXISTS "Authenticated users can view class monitors" ON public.class_monitors;

CREATE POLICY "Scoped class monitor visibility"
ON public.class_monitors
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_teacher_of_class(auth.uid(), class_id)
  OR is_student_enrolled_in_class(auth.uid(), class_id)
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = class_monitors.student_id AND s.linked_user_id = auth.uid()
  )
);

-- 2. students: scope teacher/TA SELECT to classes they actually teach
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;

CREATE POLICY "Teachers can view students in their classes"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = students.id
      AND e.end_date IS NULL
      AND is_teacher_of_class(auth.uid(), e.class_id)
  )
);

-- 3. Storage: remove broad listing policies on public buckets
--    (files remain reachable through their public URLs served by the CDN)
DROP POLICY IF EXISTS "QR codes are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read teacher avatars" ON storage.objects;

-- 4. Lock down SECURITY DEFINER function EXECUTE permissions.
--    Trigger functions and admin/service helpers should not be directly callable
--    by anon/authenticated clients. RLS helper functions remain callable so
--    policies keep working.
DO $$
DECLARE
  fn text;
  trigger_fns text[] := ARRAY[
    'audit_journal_changes()',
    'notify_teacher_homework_submission()',
    'prevent_direct_payment_deletion()',
    'create_journal_owner_membership()',
    'recalculate_student_points_on_delete()',
    'validate_homework_point_transaction()',
    'set_attendance_excused_on_cancel()',
    'notify_homework_graded()',
    'validate_session_status_on_change()',
    'notify_admin_enrollment_request()',
    '_attendance_after_session_ins()',
    'auto_end_enrollments_on_deactivation()',
    '_attendance_after_enrollment_ins()',
    'notify_journal_post()',
    'update_student_points_from_transaction()',
    'handle_new_user()',
    'update_updated_at_column()',
    'notify_journal_collaboration()',
    'notify_homework_assigned()'
  ];
  admin_fns text[] := ARRAY[
    'assert_job_lock(text, text)',
    'modify_enrollment_transfer(uuid, uuid, uuid, date)',
    'archive_and_reset_monthly_leaderboard(text)',
    'normalize_session_statuses(text)',
    'revert_invalid_held_sessions(text, date, time without time zone)',
    'pause_enrollment(uuid, uuid, date, date, text)',
    'end_enrollment(uuid, uuid, date)',
    'post_sibling_retro_credit(uuid, text, integer, text)',
    'get_student_homeworks(uuid)',
    'get_student_weekly_stats(uuid, date, date)',
    '_attendance_seed_for_class_dates(uuid, date, date)',
    'check_teacher_availability(uuid, date, time without time zone, time without time zone, uuid)',
    'count_vocab_saves_today(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_fns || admin_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;
END $$;
