REVOKE EXECUTE ON FUNCTION public.can_view_enrollment(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_classmate(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_view_enrollment(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_classmate(uuid, uuid) TO authenticated;