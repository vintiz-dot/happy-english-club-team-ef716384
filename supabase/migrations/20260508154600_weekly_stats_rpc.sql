-- =====================================================================
-- RPC: get_student_weekly_stats
-- Returns weekly progress stats without hitting RLS on homeworks/submissions.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_student_weekly_stats(
  p_student_id uuid,
  p_week_start date,
  p_week_end date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_caller_id uuid := auth.uid();
  v_authorized boolean := false;
  v_class_ids uuid[];
BEGIN
  -- Access check (same as get_student_homeworks)
  IF public.has_role(v_caller_id, 'admin'::app_role) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students WHERE id = p_student_id AND linked_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students s
      JOIN families f ON f.id = s.family_id
      WHERE s.id = p_student_id AND f.primary_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get enrolled class IDs
  SELECT array_agg(e.class_id) INTO v_class_ids
  FROM enrollments e
  WHERE e.student_id = p_student_id AND e.end_date IS NULL;

  IF v_class_ids IS NULL THEN
    v_class_ids := '{}';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions', (
      SELECT count(*) FROM sessions
      WHERE class_id = ANY(v_class_ids)
        AND date >= p_week_start AND date <= p_week_end
        AND status IN ('Scheduled', 'Held')
    ),
    'attended_sessions', (
      SELECT count(*) FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE a.student_id = p_student_id
        AND a.status = 'Present'
        AND s.date >= p_week_start AND s.date <= p_week_end
    ),
    'total_homeworks', (
      SELECT count(*) FROM homeworks
      WHERE class_id = ANY(v_class_ids)
        AND created_at >= p_week_start::timestamptz
    ),
    'submitted_homeworks', (
      SELECT count(*) FROM homework_submissions
      WHERE student_id = p_student_id
        AND status IN ('submitted', 'graded')
        AND submitted_at >= p_week_start::timestamptz
    ),
    'xp_earned', COALESCE((
      SELECT sum(points) FROM point_transactions
      WHERE student_id = p_student_id
        AND date >= p_week_start AND date <= p_week_end
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_weekly_stats(uuid, date, date) TO authenticated;
