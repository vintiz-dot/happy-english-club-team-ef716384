CREATE OR REPLACE FUNCTION public.end_enrollment(p_student_id uuid, p_class_id uuid, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id UUID;
  v_deleted_count INT := 0;
  v_actor_id UUID := auth.uid();
  v_effective_month TEXT;
BEGIN
  IF NOT public.has_role(v_actor_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can end enrollments';
  END IF;

  v_effective_month := to_char(p_end_date, 'YYYY-MM');

  SELECT id INTO v_enrollment_id
  FROM enrollments
  WHERE student_id = p_student_id 
    AND class_id = p_class_id
    AND (end_date IS NULL OR end_date > p_end_date);

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Active enrollment not found for student % in class %', p_student_id, p_class_id;
  END IF;

  UPDATE enrollments
  SET 
    end_date = p_end_date,
    updated_at = now(),
    updated_by = v_actor_id
  WHERE id = v_enrollment_id;

  WITH deleted AS (
    DELETE FROM attendance
    WHERE student_id = p_student_id
      AND session_id IN (
        SELECT id FROM sessions 
        WHERE class_id = p_class_id 
          AND date > p_end_date
      )
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (
    v_actor_id,
    'end',
    'enrollment',
    v_enrollment_id::text,
    jsonb_build_object('end_date', p_end_date, 'deleted_attendance', v_deleted_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'deleted_future_attendance', v_deleted_count,
    'effective_month', v_effective_month
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.end_enrollment(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_enrollment(uuid, uuid, date) TO authenticated;