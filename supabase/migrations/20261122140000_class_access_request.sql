-- "Contact Admin" on a teacher's "No Access to This Class" screen (owner, 22 Nov 2026).
--
-- The button did nothing: teachers cannot write notifications (the open INSERT
-- policy was dropped in 20260109160952, rightly), and there was no other way
-- from a teacher to an admin. request_class_access puts one notification in
-- every admin's bell: "<teacher> asked for access to <class>". Clicking it opens
-- the class in the admin area.
--
-- Who: only an account holding the teacher role (TAs hold it too). The name is
-- the server's (their teachers / teaching_assistants row), never the caller's
-- words, and the message carries nothing but that name and the class name.
-- Asking again for the same class within 12 hours sends nothing more, so a
-- double click or an impatient teacher does not flood the bell.

CREATE OR REPLACE FUNCTION public.request_class_access(p_class_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_class text;
  v_sent int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_uid, 'teacher') THEN
    RAISE EXCEPTION 'Only teaching staff can ask for access to a class' USING ERRCODE = '42501';
  END IF;

  SELECT c.name INTO v_class FROM public.classes c WHERE c.id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'class_access_request'
      AND n.metadata->>'requester_user_id' = v_uid::text
      AND n.metadata->>'class_id' = p_class_id::text
      AND n.created_at > now() - interval '12 hours'
  ) THEN
    RETURN jsonb_build_object('status', 'already_sent');
  END IF;

  SELECT COALESCE(
    (SELECT t.full_name FROM public.teachers t WHERE t.user_id = v_uid LIMIT 1),
    (SELECT ta.full_name FROM public.teaching_assistants ta WHERE ta.user_id = v_uid LIMIT 1),
    'A teacher'
  ) INTO v_name;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  SELECT DISTINCT ur.user_id,
         'class_access_request',
         'Class access request',
         v_name || ' asked for access to ' || COALESCE(v_class, 'a class') || '.',
         jsonb_build_object(
           'class_id', p_class_id,
           'class_name', v_class,
           'requester_user_id', v_uid,
           'requester_name', v_name
         )
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  GET DIAGNOSTICS v_sent = ROW_COUNT;

  RETURN jsonb_build_object('status', 'sent', 'admins', v_sent);
END;
$$;

REVOKE ALL ON FUNCTION public.request_class_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_class_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_class_access(uuid) TO authenticated;
