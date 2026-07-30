-- EMERGENCY: revoke the privileged demo accounts RIGHT NOW.
-- =========================================================
-- Paste into Supabase → SQL Editor and run. Use this if
-- CHECK-demo-accounts.sql showed has_role = true for admin@demo.com,
-- teacher@demo.com or family@demo.com — i.e. migration 20260730110000
-- has not applied and those logins can still reach your live data.
--
-- Safe to run more than once. It does NOT touch student@demo.com's data,
-- and it does not touch any real user.

BEGIN;

-- 1. Remove privileges. This alone stops all data access: every RLS policy
--    resolves through public.user_roles.
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

DELETE FROM public.users
WHERE id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

-- 2. Kill live sessions and refresh tokens so nobody stays signed in.
DELETE FROM auth.refresh_tokens
WHERE user_id IN (
  SELECT id::text FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

-- 3. Make the published passwords worthless and ban the accounts.
UPDATE auth.users
SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    banned_until = 'infinity'::timestamptz
WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com');

COMMIT;

-- 4. Verify: expect has_role = false and banned = true for all three.
SELECT
  u.email,
  u.banned_until IS NOT NULL AND u.banned_until > now() AS banned,
  EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id) AS has_role
FROM auth.users u
WHERE lower(u.email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
ORDER BY u.email;

-- Optional, once the above is confirmed: delete the accounts outright.
-- Run separately; if a foreign key complains, the revocation above still
-- stands and the accounts are already harmless.
--
-- DELETE FROM public.teachers WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'teacher@demo.com');
-- UPDATE public.families SET primary_user_id = NULL WHERE primary_user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'family@demo.com');
-- DELETE FROM auth.users WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com');
