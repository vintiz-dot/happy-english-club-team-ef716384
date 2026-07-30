-- SECURITY: revoke the privileged demo accounts.
-- ==============================================
-- THIS IS A LIVE APP WITH REAL STUDENT AND FAMILY DATA.
--
-- admin@demo.com / teacher@demo.com / family@demo.com were seeded with
-- PUBLISHED passwords (migration 20260712120000, later re-provisioned by a
-- public edge function). An admin-role demo account sees the entire
-- database: every real student, family, and financial record. Anyone who
-- read the login page could sign in as an administrator.
--
-- This migration:
--   1. Strips all roles from the privileged demo accounts, so even a
--      surviving session has no privileges (RLS keys off user_roles).
--   2. Makes their passwords unguessable and bans the accounts.
--   3. Attempts to delete them outright — defensively, inside an exception
--      block, so a foreign-key surprise CANNOT abort steps 1-2.
--   4. Locks student@demo.com too: it stays as the ONLY demo account, but
--      unusable until an admin sets a password from the admin dashboard.
--   5. Detaches the demo student from any real class (a student in a real
--      class can see that class's leaderboard = real classmates' names).
--
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_uid UUID;
  demo_email TEXT;
  v_demo_class_id UUID;
BEGIN
  -- ── 1-3. Privileged demo accounts: revoke, lock, then try to remove ──
  FOR demo_email IN
    SELECT unnest(ARRAY['admin@demo.com', 'teacher@demo.com', 'family@demo.com'])
  LOOP
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = demo_email;
    CONTINUE WHEN v_uid IS NULL;

    -- Privileges first: this is what actually stops data access, because
    -- every RLS policy resolves through user_roles / public.users.
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    DELETE FROM public.users WHERE id = v_uid;

    -- Make the published password worthless and ban the account, so any
    -- still-valid refresh token cannot be exchanged.
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        banned_until = 'infinity'::timestamptz,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                             || '{"disabled_reason":"demo account revoked - live data"}'::jsonb
    WHERE id = v_uid;

    -- Kill existing sessions/tokens outright.
    BEGIN
      DELETE FROM auth.refresh_tokens WHERE user_id = v_uid::text;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not clear refresh tokens for %: %', demo_email, SQLERRM;
    END;
    BEGIN
      DELETE FROM auth.sessions WHERE user_id = v_uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not clear sessions for %: %', demo_email, SQLERRM;
    END;

    -- Now try to delete the account entirely. Wrapped: the account is
    -- ALREADY neutralised above, so a FK problem here must not abort.
    BEGIN
      DELETE FROM public.teachers WHERE user_id = v_uid;
      UPDATE public.families SET primary_user_id = NULL WHERE primary_user_id = v_uid;
      DELETE FROM public.families
        WHERE primary_user_id IS NULL AND lower(email) = demo_email;
      DELETE FROM auth.identities WHERE user_id = v_uid;
      DELETE FROM auth.users WHERE id = v_uid;
      RAISE NOTICE 'demo account % fully deleted', demo_email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'demo account % neutralised but not deleted (%): roles revoked, password scrambled, banned',
        demo_email, SQLERRM;
    END;
  END LOOP;

  -- ── 4. The one surviving demo account: student@demo.com ──────────────
  -- Kept as a sandbox for prospective families, but LOCKED: an admin must
  -- set its password from the admin dashboard before it can be used.
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'student@demo.com';
  IF v_uid IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        banned_until = NULL,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                             || '{"demo":true,"locked_until_admin_sets_password":true}'::jsonb
    WHERE id = v_uid;

    BEGIN
      DELETE FROM auth.refresh_tokens WHERE user_id = v_uid::text;
      DELETE FROM auth.sessions WHERE user_id = v_uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not clear demo student sessions: %', SQLERRM;
    END;

    -- Student role only. Never anything else.
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'student');
    INSERT INTO public.users (id, role) VALUES (v_uid, 'student')
      ON CONFLICT (id) DO UPDATE SET role = 'student';

    -- ── 5. Detach the demo student from every REAL class ──────────────
    SELECT id INTO v_demo_class_id FROM public.classes WHERE name = 'Demo Class' LIMIT 1;
    DELETE FROM public.enrollments
    WHERE student_id IN (SELECT id FROM public.students WHERE linked_user_id = v_uid)
      AND (v_demo_class_id IS NULL OR class_id <> v_demo_class_id);
  END IF;
END $$;

-- Where the admin-set demo password state lives. The password itself is
-- NEVER stored here — it is set directly on the auth user through the
-- admin-only manage-demo-student function. This only records that a
-- password has been set, by whom, and whether the demo is enabled.
CREATE TABLE IF NOT EXISTS public.demo_access (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),   -- single-row table
  enabled BOOLEAN NOT NULL DEFAULT false,
  password_set_at TIMESTAMPTZ,
  password_set_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.demo_access (id, enabled) VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.demo_access ENABLE ROW LEVEL SECURITY;

-- Admins only. The login page does NOT read this table (it would leak
-- whether a demo exists); it just attempts a normal password sign-in.
CREATE POLICY "admins_manage_demo_access" ON public.demo_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
