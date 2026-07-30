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
-- FIRST ATTEMPT AT THIS MIGRATION FAILED, and the failure is instructive:
-- it ran `DELETE FROM public.users` before the revocation steps. That table
-- is referenced by families.primary_user_id, students.linked_user_id,
-- teachers.user_id AND created_by / updated_by on all three — and the demo
-- admin had created real records. The delete raised
-- families_primary_user_id_fkey, which rolled back the ENTIRE DO block,
-- including the role revocation. The hole stayed open while appearing fixed.
--
-- Rewritten so that cannot happen:
--   * The security-critical work comes FIRST and touches no foreign key:
--     delete user_roles (every RLS policy resolves through it), scramble the
--     password, ban the account, drop sessions and refresh tokens.
--   * public.users is DOWNGRADED with an UPDATE, never deleted. Removing the
--     privilege does not require removing the row, and deleting the row
--     would reach into real records via created_by/updated_by.
--   * Each risky-but-optional step sits in its own nested BEGIN/EXCEPTION
--     block, so nothing optional can abort the revocation.
--
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_uid UUID;
  demo_email TEXT;
  v_demo_class_id UUID;
BEGIN
  FOR demo_email IN
    SELECT unnest(ARRAY['admin@demo.com', 'teacher@demo.com', 'family@demo.com'])
  LOOP
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = demo_email;
    CONTINUE WHEN v_uid IS NULL;

    -- ── 1. Privileges. THE step that stops data access. No FK involved. ──
    DELETE FROM public.user_roles WHERE user_id = v_uid;

    -- ── 2. Password + ban, so the published credential is worthless and
    --       no refresh token can be exchanged. ─────────────────────────────
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        banned_until = 'infinity'::timestamptz,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                             || '{"disabled_reason":"demo account revoked - live data"}'::jsonb
    WHERE id = v_uid;

    -- ── 3. Terminate live sessions. ──────────────────────────────────────
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

    -- ── 4. Downgrade the public.users mirror row. UPDATE, not DELETE:
    --       the row is referenced by real families/students/teachers
    --       (including created_by/updated_by), and the privilege lives in
    --       the role column, not in the row's existence. ─────────────────
    BEGIN
      UPDATE public.users SET role = 'student' WHERE id = v_uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not downgrade public.users for %: %', demo_email, SQLERRM;
    END;

    RAISE NOTICE 'demo account % revoked: roles removed, password scrambled, banned', demo_email;
  END LOOP;

  -- ── 5. The one surviving demo account: student@demo.com ──────────────
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

    BEGIN
      INSERT INTO public.users (id, role) VALUES (v_uid, 'student')
        ON CONFLICT (id) DO UPDATE SET role = 'student';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not upsert public.users for demo student: %', SQLERRM;
    END;

    -- ── 6. Detach the demo student from every REAL class: a student in a
    --       real class can see that class's leaderboard, i.e. real
    --       classmates' names. ────────────────────────────────────────────
    BEGIN
      SELECT id INTO v_demo_class_id FROM public.classes WHERE name = 'Demo Class' LIMIT 1;
      DELETE FROM public.enrollments
      WHERE student_id IN (SELECT id FROM public.students WHERE linked_user_id = v_uid)
        AND (v_demo_class_id IS NULL OR class_id <> v_demo_class_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not detach demo student from real classes: %', SQLERRM;
    END;
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
DROP POLICY IF EXISTS "admins_manage_demo_access" ON public.demo_access;
CREATE POLICY "admins_manage_demo_access" ON public.demo_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
