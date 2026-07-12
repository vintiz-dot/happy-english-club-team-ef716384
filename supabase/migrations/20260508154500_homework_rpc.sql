-- =====================================================================
-- RPC: get_student_homeworks
-- Bypasses RLS completely — access control is done inside the function.
-- Returns all homeworks + submissions for a given student, ready for
-- the frontend to render.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_student_homeworks(p_student_id uuid)
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
BEGIN
  -- ---- Access check ----
  -- 1. Admin → always allowed
  IF public.has_role(v_caller_id, 'admin'::app_role) THEN
    v_authorized := true;
  END IF;

  -- 2. Teacher of one of the student's classes → allowed
  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM enrollments e
      JOIN sessions s ON s.class_id = e.class_id
      JOIN teachers t ON t.id = s.teacher_id
      WHERE e.student_id = p_student_id
        AND t.user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  -- 3. Direct student login
  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students
      WHERE id = p_student_id AND linked_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  -- 4. Family login
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

  -- ---- Fetch data ----
  SELECT jsonb_build_object(
    'homeworks', COALESCE((
      SELECT jsonb_agg(hw_row ORDER BY hw_row->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', h.id,
          'class_id', h.class_id,
          'title', h.title,
          'body', h.body,
          'due_date', h.due_date,
          'created_by', h.created_by,
          'created_at', h.created_at,
          'classes', jsonb_build_object('name', c.name),
          'homework_files', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', hf.id,
              'file_name', hf.file_name,
              'storage_key', hf.storage_key,
              'size_bytes', hf.size_bytes
            ))
            FROM homework_files hf WHERE hf.homework_id = h.id
          ), '[]'::jsonb)
        ) AS hw_row
        FROM homeworks h
        JOIN classes c ON c.id = h.class_id
        WHERE h.class_id IN (
          SELECT e.class_id FROM enrollments e
          WHERE e.student_id = p_student_id AND e.end_date IS NULL
        )
      ) sub
    ), '[]'::jsonb),
    'submissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', hs.id,
        'homework_id', hs.homework_id,
        'student_id', hs.student_id,
        'status', hs.status,
        'grade', hs.grade,
        'teacher_feedback', hs.teacher_feedback,
        'submission_text', hs.submission_text,
        'file_name', hs.file_name,
        'storage_key', hs.storage_key,
        'submitted_at', hs.submitted_at,
        'graded_at', hs.graded_at
      ))
      FROM homework_submissions hs
      WHERE hs.student_id = p_student_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (the function does its own auth check)
GRANT EXECUTE ON FUNCTION public.get_student_homeworks(uuid) TO authenticated;
