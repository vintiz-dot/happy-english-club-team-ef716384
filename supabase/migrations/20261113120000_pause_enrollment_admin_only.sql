-- F-15: pause_enrollment is for admins, like the functions beside it.
--
-- THE DEFECT. public.pause_enrollment(student, class, from, to, memo) is
-- SECURITY DEFINER and executable by every signed-in account (20251023112730,
-- re-granted by 20260722020830), and it never asked who was calling. It
-- inserts a pause_windows row and then writes attendance 'Excused' for every
-- non-cancelled lesson of the class in the range - ON CONFLICT DO UPDATE, so
-- it overwrites marks a teacher made. Excused lessons are not charged. A
-- parent could excuse their own child for any range and lower the bill; any
-- account holding another child's ids could wipe that child's register.
-- end_enrollment, change_enrollment_days and modify_enrollment_transfer each
-- begin with an admin check; this one was missed.
--
-- THE FIX. The same check, first statement, fail closed (no uid -> refused):
-- 42501 "Only administrators can pause enrollments". Nothing else in the
-- function changes - the body below is the live one, word for word.
--
-- WHO CALLS IT. One place: src/components/admin/ModifyEnrollmentModal.tsx
-- (the Pause tab), which only admins can open (ClassEnrollments under the
-- admin area; StudentEnrollmentsTab shows the button when role = admin). No
-- teacher screen, no edge function, no trigger, no cron job.
--
-- NOT TOUCHED: any pause_windows or attendance row, the grant to
-- `authenticated` (an admin's browser needs it). Idempotent.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.pause_enrollment(uuid, uuid, date, date, text)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: public.pause_enrollment(uuid, uuid, date, date, text) does not exist';
  END IF;
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: public.has_role missing';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.pause_enrollment(
  p_student_id uuid,
  p_class_id uuid,
  p_from_date date,
  p_to_date date,
  p_memo text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pause_window_id UUID;
  v_excused_count INT := 0;
  v_actor_id UUID := auth.uid();
  v_effective_month TEXT;
BEGIN
  -- Admins only, as end_enrollment / change_enrollment_days /
  -- modify_enrollment_transfer. coalesce: no uid, or no answer, is a no.
  IF v_actor_id IS NULL OR NOT coalesce(public.has_role(v_actor_id, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only administrators can pause enrollments' USING ERRCODE = '42501';
  END IF;

  -- Validate dates
  IF p_to_date < p_from_date THEN
    RAISE EXCEPTION 'to_date must be >= from_date';
  END IF;

  v_effective_month := to_char(p_from_date, 'YYYY-MM');

  -- 1. Create pause window record
  INSERT INTO pause_windows (
    student_id,
    class_id,
    from_date,
    to_date,
    memo,
    created_by
  ) VALUES (
    p_student_id,
    p_class_id,
    p_from_date,
    p_to_date,
    p_memo,
    v_actor_id
  )
  RETURNING id INTO v_pause_window_id;

  -- 2. Mark attendance as Excused for sessions in pause window
  WITH excused AS (
    INSERT INTO attendance (session_id, student_id, status, marked_by, notes)
    SELECT
      s.id,
      p_student_id,
      'Excused',
      v_actor_id,
      'Pause: ' || COALESCE(p_memo, 'Student paused')
    FROM sessions s
    WHERE s.class_id = p_class_id
      AND s.date BETWEEN p_from_date AND p_to_date
      AND s.status != 'Canceled'
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET
      status = 'Excused',
      marked_by = v_actor_id,
      notes = 'Pause: ' || COALESCE(p_memo, 'Student paused'),
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_excused_count FROM excused;

  -- 3. Audit log
  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (
    v_actor_id,
    'pause',
    'enrollment',
    v_pause_window_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'class_id', p_class_id,
      'from_date', p_from_date,
      'to_date', p_to_date,
      'excused_count', v_excused_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'pause_window_id', v_pause_window_id,
    'excused_attendance', v_excused_count,
    'effective_month', v_effective_month
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) TO authenticated;

COMMIT;
