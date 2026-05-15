-- Add columns to support student "new account" migration
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS secondary_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS migration_completed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS students_secondary_user_id_idx
  ON public.students(secondary_user_id);

-- Update access helpers so the secondary auth user resolves to the same student.

CREATE OR REPLACE FUNCTION public.can_view_student(student_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id
      AND (
        s.linked_user_id = user_id
        OR s.secondary_user_id = user_id
        OR EXISTS (
          SELECT 1 FROM public.families f
          WHERE f.id = s.family_id
            AND f.primary_user_id = user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_class(user_id uuid, class_id_check uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.enrollments e ON e.student_id = s.id
    WHERE (
      s.linked_user_id = user_id
      OR s.secondary_user_id = user_id
      OR s.family_id IN (SELECT id FROM public.families WHERE primary_user_id = user_id)
      OR s.family_id IN (SELECT family_id FROM public.students WHERE linked_user_id = user_id OR secondary_user_id = user_id)
    )
    AND e.class_id = class_id_check
    AND e.end_date IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_classmate(student_id_to_view uuid, viewer_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
      OR viewer_student.family_id IN (SELECT family_id FROM public.students WHERE linked_user_id = viewer_user_id OR secondary_user_id = viewer_user_id)
    )
    AND viewed_enrollment.student_id = student_id_to_view
    AND viewer_enrollment.end_date IS NULL
    AND viewed_enrollment.end_date IS NULL
  );
$$;