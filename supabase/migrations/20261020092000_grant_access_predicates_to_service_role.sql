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

-- Guarded per function rather than written as eight bare statements. A
-- GRANT on a function that does not exist is a hard error, which would
-- abort the whole run partway and leave the migrations before this one
-- applied and this one not. Both predicates exist in this database
-- (20260712024156 and 20261007120000 create them), so the guard should
-- never fire - it is here so that pasting this file somewhere it does not
-- hold produces a NOTICE instead of a half-applied schema.
DO $do$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.is_teacher_of_class(uuid, uuid)',
    'public.can_view_student_in_class(uuid, uuid)'
  ] LOOP
    IF to_regprocedure(fn) IS NULL THEN
      RAISE NOTICE 'skipping %, function not present', fn;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END
$do$;
