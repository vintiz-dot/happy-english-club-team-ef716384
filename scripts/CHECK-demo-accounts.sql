-- Paste into Supabase → SQL Editor. Read-only: tells you whether the
-- privileged demo accounts are still able to sign in to your live database.
--
-- WHAT YOU WANT TO SEE: zero rows, or rows where has_role = false AND
-- banned = true. Anything showing has_role = true is a LIVE HOLE.

SELECT
  u.email,
  u.banned_until IS NOT NULL AND u.banned_until > now() AS banned,
  EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id) AS has_role,
  COALESCE(
    (SELECT string_agg(r.role::text, ',') FROM public.user_roles r WHERE r.user_id = u.id),
    '(none)'
  ) AS roles,
  u.last_sign_in_at,
  (SELECT count(*) FROM auth.sessions s WHERE s.user_id = u.id) AS active_sessions
FROM auth.users u
WHERE lower(u.email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com', 'student@demo.com')
ORDER BY u.email;

-- Did the revocation migration land?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'demo_access'
) AS revocation_migration_applied;
