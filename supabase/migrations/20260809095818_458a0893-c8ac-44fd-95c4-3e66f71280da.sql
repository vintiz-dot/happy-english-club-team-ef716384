CREATE OR REPLACE FUNCTION public.can_read_student_work_file(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_work w
    JOIN public.students s ON s.linked_user_id = auth.uid()
    WHERE w.storage_path = _path
      AND w.status = 'approved'
      AND (w.student_id = s.id OR s.id = ANY (COALESCE(w.member_student_ids, '{}'::uuid[])))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_student_work_file(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_student_work_file(text) TO authenticated;

DROP POLICY IF EXISTS students_read_approved_work_files ON storage.objects;
CREATE POLICY students_read_approved_work_files
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-work' AND public.can_read_student_work_file(name));