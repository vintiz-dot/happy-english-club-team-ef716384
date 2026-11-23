-- The recorder's phone link (23 Nov 2026): the class laptop (room track) and
-- the teacher's phone (teacher track) start and stop together over a PRIVATE
-- Supabase Realtime broadcast channel, `recorder-link:<user id>`.
--
-- Who may use it: only the signed-in staff member whose id is in the topic,
-- on any of their own devices. The phone joins only recordings that same
-- account started (class_recordings: started_by = auth.uid()), so a channel
-- per account is the narrowest scope there is: no other teacher, TA, family
-- or child can listen to it or send on it, and nothing in it is trusted by
-- the server (the recording row and the chunk RPCs decide everything; the
-- channel only says "start", "stop" and how each device is doing).
--
-- Realtime authorisation runs these policies on realtime.messages as the
-- caller: SELECT to join and receive, INSERT to send. Before this migration
-- realtime.messages had RLS on and no policy, so every private channel was
-- refused; this opens exactly one topic shape and nothing else.
--
-- Idempotent: the policies are dropped and created again.

DO $mig$
BEGIN
  IF to_regclass('realtime.messages') IS NULL THEN
    RAISE NOTICE 'realtime.messages does not exist here: recorder link policies skipped';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS recorder_link_receive ON realtime.messages';
  EXECUTE 'DROP POLICY IF EXISTS recorder_link_send ON realtime.messages';

  EXECUTE $p$
    CREATE POLICY recorder_link_receive ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        realtime.messages.extension = 'broadcast'
        AND (SELECT auth.uid()) IS NOT NULL
        AND (SELECT realtime.topic()) = 'recorder-link:' || (SELECT auth.uid())::text
        AND (public.has_role((SELECT auth.uid()), 'teacher'::public.app_role)
             OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
      )
  $p$;

  EXECUTE $p$
    CREATE POLICY recorder_link_send ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        realtime.messages.extension = 'broadcast'
        AND (SELECT auth.uid()) IS NOT NULL
        AND (SELECT realtime.topic()) = 'recorder-link:' || (SELECT auth.uid())::text
        AND (public.has_role((SELECT auth.uid()), 'teacher'::public.app_role)
             OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
      )
  $p$;
END
$mig$;
