-- EMERGENCY: revoke the privileged demo accounts RIGHT NOW.
-- =========================================================
-- Paste into Supabase → SQL Editor and run the whole thing.
--
-- Safe to run repeatedly. Touches ONLY admin@demo.com, teacher@demo.com and
-- family@demo.com. No real user and no real record is modified or deleted.
--
-- DESIGN NOTES (learned from a failed first attempt):
--  * There is deliberately NO BEGIN/COMMIT wrapper. Each statement commits
--    on its own, so if a later one fails the revocation already achieved is
--    NOT rolled back. Wrapping the previous version in one transaction meant
--    a foreign-key error at the end undid the security fix at the start.
--  * We do NOT delete from public.users. That table is referenced by
--    families/students/teachers via primary_user_id, linked_user_id, user_id
--    AND created_by / updated_by — and the demo admin may have created real
--    records, so deleting it is either blocked (the error you saw) or would
--    reach into real data. Downgrading the role removes the privilege
--    without touching a single foreign key.
--  * Step 1 is the one that actually stops data access: every RLS policy in
--    this app resolves through public.user_roles.

-- ── 1. Remove privileges (THE security-critical step) ────────────────────
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

-- ── 2. Make the published passwords worthless and ban the accounts ───────
UPDATE auth.users
SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    banned_until = 'infinity'::timestamptz
WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com');

-- ── 3. Kill anyone currently signed in on those accounts ─────────────────
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

-- ── 4. Downgrade the mirror role row (UPDATE, not DELETE — no FK risk) ───
UPDATE public.users
SET role = 'student'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE lower(email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
);

-- ── 5. VERIFY — this is the result that matters ──────────────────────────
-- Expect for all three: has_role = false, banned = true, sessions = 0.
SELECT
  u.email,
  EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id) AS has_role,
  u.banned_until IS NOT NULL AND u.banned_until > now()            AS banned,
  (SELECT count(*) FROM auth.sessions s WHERE s.user_id = u.id)    AS sessions,
  u.last_sign_in_at
FROM auth.users u
WHERE lower(u.email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com')
ORDER BY u.email;

-- ── 6. Did the demo admin create or modify any REAL records? ─────────────
-- Worth knowing. Non-zero counts are not necessarily sinister (the account
-- may have been used during setup), but they tell you where to look.
SELECT 'families'  AS table_name,
       count(*) FILTER (WHERE created_by = u.id) AS created,
       count(*) FILTER (WHERE updated_by = u.id) AS updated
FROM public.families f
CROSS JOIN (SELECT id FROM auth.users WHERE lower(email) = 'admin@demo.com') u
UNION ALL
SELECT 'students',
       count(*) FILTER (WHERE created_by = u.id),
       count(*) FILTER (WHERE updated_by = u.id)
FROM public.students s
CROSS JOIN (SELECT id FROM auth.users WHERE lower(email) = 'admin@demo.com') u
UNION ALL
SELECT 'teachers',
       count(*) FILTER (WHERE created_by = u.id),
       count(*) FILTER (WHERE updated_by = u.id)
FROM public.teachers t
CROSS JOIN (SELECT id FROM auth.users WHERE lower(email) = 'admin@demo.com') u;
