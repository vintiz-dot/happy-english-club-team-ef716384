CREATE OR REPLACE FUNCTION public.is_staff_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
      OR public.has_role(_uid, 'teacher'::app_role)
      OR EXISTS (SELECT 1 FROM public.teaching_assistants ta WHERE ta.user_id = _uid)
      OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.can_view_teacher(_teacher_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_staff_member(_uid)
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.default_teacher_id = _teacher_id AND c.is_active)
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.enrollments e ON e.class_id = s.class_id
      WHERE s.teacher_id = _teacher_id AND public.can_view_student(e.student_id, _uid)
    )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
CREATE POLICY "Teachers visible to staff and their classes" ON public.teachers
  FOR SELECT TO authenticated USING (public.can_view_teacher(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view TAs" ON public.teaching_assistants;
CREATE POLICY "TAs visible to staff" ON public.teaching_assistants
  FOR SELECT TO authenticated USING (public.is_staff_member(auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can read custom_quests" ON public.custom_quests;
DROP POLICY IF EXISTS "Signed-in users can read xp_settings" ON public.xp_settings;

DROP POLICY IF EXISTS "Students read homework materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view homework files" ON storage.objects;