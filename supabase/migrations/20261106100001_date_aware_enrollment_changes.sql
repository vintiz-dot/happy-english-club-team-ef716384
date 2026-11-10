CREATE OR REPLACE FUNCTION public.modify_enrollment_transfer(p_student_id uuid, p_old_class_id uuid, p_new_class_id uuid, p_effective_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_enrollment_id UUID;
  v_new_enrollment_id UUID;
  v_deleted_count INT := 0;
  v_seeded_count INT := 0;
  v_points_transferred INT := 0;
  v_actor_id UUID := auth.uid();
  v_effective_month TEXT;
  v_next_month TEXT;
BEGIN
  IF NOT public.has_role(v_actor_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can transfer enrollments';
  END IF;
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'An effective date is required';
  END IF;
  v_effective_month := to_char(p_effective_date, 'YYYY-MM');
  v_next_month := to_char(p_effective_date + INTERVAL '1 month', 'YYYY-MM');

  SELECT id INTO v_old_enrollment_id
  FROM enrollments
  WHERE student_id = p_student_id
    AND class_id = p_old_class_id
    AND (end_date IS NULL OR end_date >= p_effective_date);

  IF v_old_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Active enrollment not found for student % in class %', p_student_id, p_old_class_id;
  END IF;

  UPDATE enrollments
  SET end_date = p_effective_date - INTERVAL '1 day', updated_at = now(), updated_by = v_actor_id
  WHERE id = v_old_enrollment_id;

  -- Only automatic placeholder marks from the effective date on are removed; past and teacher-made marks stay
  WITH deleted AS (
    DELETE FROM attendance
    WHERE student_id = p_student_id
      AND session_id IN (SELECT id FROM sessions WHERE class_id = p_old_class_id AND date >= p_effective_date)
      AND marked_by IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  WITH transferred AS (
    UPDATE point_transactions
    SET class_id = p_new_class_id,
        notes = COALESCE(notes, '') || ' [Transferred from previous class]'
    WHERE student_id = p_student_id AND class_id = p_old_class_id AND month >= v_effective_month
    RETURNING id
  )
  SELECT count(*) INTO v_points_transferred FROM transferred;

  DELETE FROM student_points
  WHERE student_id = p_student_id
    AND class_id IN (p_old_class_id, p_new_class_id)
    AND month >= v_effective_month;

  INSERT INTO student_points (student_id, class_id, month, homework_points, participation_points)
  SELECT student_id, class_id, month,
    COALESCE(SUM(CASE WHEN type = 'homework' THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('participation', 'adjustment') THEN points ELSE 0 END), 0)
  FROM point_transactions
  WHERE student_id = p_student_id
    AND class_id IN (p_old_class_id, p_new_class_id)
    AND month >= v_effective_month
  GROUP BY student_id, class_id, month
  ON CONFLICT (student_id, class_id, month)
  DO UPDATE SET homework_points = EXCLUDED.homework_points,
    participation_points = EXCLUDED.participation_points, updated_at = now();

  INSERT INTO enrollments (student_id, class_id, start_date, created_by, updated_by)
  VALUES (p_student_id, p_new_class_id, p_effective_date, v_actor_id, v_actor_id)
  RETURNING id INTO v_new_enrollment_id;

  WITH seeded AS (
    INSERT INTO attendance (session_id, student_id, status, marked_by)
    SELECT s.id, p_student_id, 'Present', NULL
    FROM sessions s
    WHERE s.class_id = p_new_class_id AND s.date >= p_effective_date AND s.status != 'Canceled'
    ON CONFLICT (session_id, student_id) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_seeded_count FROM seeded;

  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (v_actor_id, 'transfer', 'enrollment', v_old_enrollment_id::text,
    jsonb_build_object('old_class_id', p_old_class_id, 'new_class_id', p_new_class_id,
      'effective_date', p_effective_date, 'deleted_attendance', v_deleted_count,
      'seeded_attendance', v_seeded_count, 'points_transferred', v_points_transferred));

  RETURN jsonb_build_object('success', true, 'old_enrollment_id', v_old_enrollment_id,
    'new_enrollment_id', v_new_enrollment_id, 'deleted_future_attendance', v_deleted_count,
    'seeded_attendance', v_seeded_count, 'points_transferred', v_points_transferred,
    'effective_month', v_effective_month, 'next_month', v_next_month);
END;
$function$;
REVOKE ALL ON FUNCTION public.modify_enrollment_transfer(uuid, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modify_enrollment_transfer(uuid, uuid, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_enrollment(p_student_id uuid, p_class_id uuid, p_end_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id UUID;
  v_start date;
  v_deleted_count INT := 0;
  v_actor_id UUID := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can end enrollments';
  END IF;
  IF p_end_date IS NULL THEN
    RAISE EXCEPTION 'An end date is required';
  END IF;

  SELECT id, start_date INTO v_enrollment_id, v_start
  FROM enrollments
  WHERE student_id = p_student_id AND class_id = p_class_id
    AND (end_date IS NULL OR end_date > p_end_date)
  ORDER BY start_date DESC LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Active enrollment not found for student % in class %', p_student_id, p_class_id;
  END IF;
  IF p_end_date < v_start THEN
    RAISE EXCEPTION 'The last day (%) is before the enrollment started (%)', p_end_date, v_start;
  END IF;

  UPDATE enrollments SET end_date = p_end_date, updated_at = now(), updated_by = v_actor_id
  WHERE id = v_enrollment_id;

  -- Only automatic placeholders after the last day go; marks a person made are kept.
  WITH deleted AS (
    DELETE FROM attendance
    WHERE student_id = p_student_id AND marked_by IS NULL
      AND session_id IN (SELECT id FROM sessions WHERE class_id = p_class_id AND date > p_end_date)
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (v_actor_id, 'end', 'enrollment', v_enrollment_id::text,
    jsonb_build_object('end_date', p_end_date, 'deleted_attendance', v_deleted_count));

  RETURN jsonb_build_object('success', true, 'enrollment_id', v_enrollment_id,
    'deleted_future_attendance', v_deleted_count, 'effective_month', to_char(p_end_date, 'YYYY-MM'));
END;
$function$;
REVOKE ALL ON FUNCTION public.end_enrollment(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_enrollment(uuid, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_enrollment_days(p_enrollment_id uuid, p_allowed_days integer[], p_effective_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  e public.enrollments%ROWTYPE;
  v_actor uuid := auth.uid();
  v_new uuid;
  v_days integer[] := CASE WHEN p_allowed_days IS NULL OR cardinality(p_allowed_days) = 0 THEN NULL ELSE p_allowed_days END;
BEGIN
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can change enrollment days';
  END IF;
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'An effective date is required';
  END IF;
  SELECT * INTO e FROM enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment not found'; END IF;
  IF e.end_date IS NOT NULL AND p_effective_date > e.end_date THEN
    RAISE EXCEPTION 'The date (%) is after this enrollment ended (%)', p_effective_date, e.end_date;
  END IF;

  IF p_effective_date <= e.start_date THEN
    UPDATE enrollments SET allowed_days = v_days, updated_by = v_actor WHERE id = e.id;
    RETURN jsonb_build_object('success', true, 'split', false, 'enrollment_id', e.id);
  END IF;

  UPDATE enrollments SET end_date = p_effective_date - 1, updated_by = v_actor WHERE id = e.id;
  INSERT INTO enrollments (student_id, class_id, start_date, end_date, allowed_days, rate_override_vnd,
                           discount_type, discount_value, discount_cadence, created_by, updated_by)
  VALUES (e.student_id, e.class_id, p_effective_date, e.end_date, v_days, e.rate_override_vnd,
          e.discount_type, e.discount_value, e.discount_cadence, v_actor, v_actor)
  RETURNING id INTO v_new;

  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (v_actor, 'change_days', 'enrollment', e.id::text,
    jsonb_build_object('from', p_effective_date, 'old_days', e.allowed_days, 'new_days', v_days, 'new_enrollment_id', v_new));

  RETURN jsonb_build_object('success', true, 'split', true, 'enrollment_id', v_new);
END;
$function$;
REVOKE ALL ON FUNCTION public.change_enrollment_days(uuid, integer[], date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_enrollment_days(uuid, integer[], date) TO authenticated;