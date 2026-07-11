
-- Revoke EXECUTE on all remaining SECURITY DEFINER functions in public schema from anon/PUBLIC
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM anon, PUBLIC';
  END LOOP;
END $$;

-- Also revoke EXECUTE from authenticated for functions that should only run internally (trigger/util helpers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_homework_graded() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_journal_collaboration() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_teacher_homework_submission() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_homework_assigned() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_invalid_held_sessions(text, date, time) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.post_sibling_retro_credit(uuid, text, integer, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_session_statuses(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.end_enrollment(uuid, uuid, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.modify_enrollment_transfer(uuid, uuid, uuid, date) FROM authenticated;

-- Storage: remove overly permissive listing SELECT policies on public buckets
-- (Files remain reachable through direct public URLs; only the list API is affected.)
DROP POLICY IF EXISTS "Public read access for student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for teacher avatars" ON storage.objects;
DROP POLICY IF EXISTS "Students can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;

-- Replace with authenticated, scoped SELECT policies for the storage list/read API
CREATE POLICY "Authenticated read student avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-avatars');

CREATE POLICY "Authenticated read teacher avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'teacher-avatars');

CREATE POLICY "Authenticated read resources own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  )
);
