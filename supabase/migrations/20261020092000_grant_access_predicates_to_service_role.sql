-- Let edge functions call the access predicates they now depend on.
--
-- Three functions that run on the service role were given per-resource
-- authorization: generate-work-feedback and analyze-transcript check
-- is_teacher_of_class, refresh-student-profile checks
-- can_view_student_in_class. Each mirrors the predicate in the matching
-- RLS policy, so a function holding the service role grants no more than
-- the same person would get reading the row directly.
--
-- WHY THIS GRANT IS WORTH WRITING DOWN. Both predicates already work for
-- service_role through Supabase's default privileges on the public schema
-- — the REVOKEs around them strip only anon and PUBLIC. So in all
-- likelihood this changes nothing.
--
-- It is here because of the direction those checks fail. They fail
-- CLOSED: callerHoldsClass returns false when the rpc errors, which is
-- the right choice for an authorization check and the wrong one to leave
-- resting on an implicit grant. If the default privileges were ever
-- tightened, or the project were restored somewhere they do not apply,
-- the symptom would not be an error anyone could read — it would be every
-- teacher in the school getting "you do not hold this class" on three
-- features at once, with the real reason two layers down in a log line.
--
-- An explicit grant costs nothing and turns that into a non-event.

GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) TO service_role;

-- Restated for the same reason: these are the roles that should hold it,
-- and anon should not. Idempotent, and harmless if already true.
REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_student_in_class(uuid, uuid) TO authenticated;
