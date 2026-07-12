CREATE OR REPLACE FUNCTION public.can_view_enrollment(_student_id uuid, _class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.is_teacher_of_class(_user_id, _class_id)
    OR EXISTS (
      SELECT 1
      FROM public.students s
      LEFT JOIN public.families f ON f.id = s.family_id
      WHERE s.id = _student_id
        AND (
          s.linked_user_id = _user_id
          OR s.secondary_user_id = _user_id
          OR f.primary_user_id = _user_id
          OR EXISTS (
            SELECT 1
            FROM public.students sibling
            WHERE sibling.family_id = s.family_id
              AND (
                sibling.linked_user_id = _user_id
                OR sibling.secondary_user_id = _user_id
              )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_student_in_class(_student_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = _student_id
      AND e.end_date IS NULL
      AND public.is_teacher_of_class(_user_id, e.class_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_classmate(student_id_to_view uuid, viewer_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students viewer_student
    JOIN public.enrollments viewer_enrollment ON viewer_enrollment.student_id = viewer_student.id
    JOIN public.enrollments viewed_enrollment ON viewed_enrollment.class_id = viewer_enrollment.class_id
    WHERE (
      viewer_student.linked_user_id = viewer_user_id
      OR viewer_student.secondary_user_id = viewer_user_id
      OR viewer_student.family_id IN (SELECT id FROM public.families WHERE primary_user_id = viewer_user_id)
      OR viewer_student.family_id IN (
        SELECT family_id
        FROM public.students
        WHERE linked_user_id = viewer_user_id OR secondary_user_id = viewer_user_id
      )
    )
    AND viewed_enrollment.student_id = student_id_to_view
    AND viewer_enrollment.end_date IS NULL
    AND viewed_enrollment.end_date IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_enrollment(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_classmate(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Family users can view family enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their classes" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view permitted enrollments" ON public.enrollments;

CREATE POLICY "Users can view permitted enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (public.can_view_enrollment(student_id, class_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
DROP POLICY IF EXISTS "Students can view classmates for leaderboard" ON public.students;

CREATE POLICY "Teachers can view students in their classes"
ON public.students
FOR SELECT
TO authenticated
USING (public.can_view_student_in_class(id, auth.uid()));

CREATE POLICY "Students can view classmates for leaderboard"
ON public.students
FOR SELECT
TO authenticated
USING (public.can_view_classmate(id, auth.uid()));