-- SECURITY RETRY: revoke the privileged demo accounts. THIRD attempt.
-- ═══════════════════════════════════════════════════════════════════════
-- THIS IS A LIVE APP WITH REAL STUDENT AND FAMILY DATA.
--
-- WHY THIS FILE EXISTS AT ALL — the failure mode is the lesson:
--
--   Attempt 1 (20260730110000, original) ran `DELETE FROM public.users`
--   before the revocation steps. That raised
--   families_primary_user_id_fkey, which rolled back the whole DO block
--   including the role revocation. The hole stayed open while looking fixed.
--
--   Attempt 2 REWROTE THE SAME FILE (20260730110000) security-first. That
--   was the mistake: Supabase records a migration VERSION as handled, so
--   editing an already-attempted file means it is silently SKIPPED forever.
--   The proof: 20260730110000 creates public.demo_access unconditionally
--   with CREATE TABLE IF NOT EXISTS, yet demo_access never appeared in the
--   regenerated types.ts — while chat_conversations, chat_messages,
--   cefr_level_claims and cefr_defense_tests from neighbouring migrations
--   all did. The revocation has therefore NEVER RUN in production.
--
-- So: a NEW version number, never an edit of the old one. If a migration
-- has already been attempted, fixing it requires a new file.
--
-- demo_access is created FIRST, before the revocation, precisely so that its
-- appearance in the regenerated types.ts is proof this migration executed.
--
-- Fully idempotent: safe to re-run.

-- ── 0. The tell. If this table exists, this migration ran. ─────────────
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

-- Admins only. The login page does NOT read this table (that would leak
-- whether a demo exists); it just attempts a normal password sign-in.
DROP POLICY IF EXISTS "admins_manage_demo_access" ON public.demo_access;
CREATE POLICY "admins_manage_demo_access" ON public.demo_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 1. Revoke the privileged demo accounts ─────────────────────────────
-- admin@demo.com / teacher@demo.com / family@demo.com were seeded with
-- PUBLISHED passwords. An admin-role demo account sees the entire database:
-- every real child, family and financial record.
--
-- Ordering rules, learned from attempt 1:
--   * Security-critical work FIRST and touching no foreign key: delete
--     user_roles (every RLS policy resolves through it), scramble the
--     password, ban the account, drop sessions and refresh tokens.
--   * public.users is DOWNGRADED with an UPDATE, never DELETEd — the row is
--     referenced by real families/students/teachers including
--     created_by/updated_by, and the privilege lives in the role, not in
--     the row's existence.
--   * Every risky-but-optional step sits in its own BEGIN/EXCEPTION block
--     so nothing optional can abort the revocation.
DO $$
DECLARE
  v_uid UUID;
  demo_email TEXT;
  v_demo_class_id UUID;
  v_still_privileged INT;
BEGIN
  FOR demo_email IN
    SELECT unnest(ARRAY['admin@demo.com', 'teacher@demo.com', 'family@demo.com'])
  LOOP
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = demo_email;
    CONTINUE WHEN v_uid IS NULL;

    -- 1a. Privileges. THE step that stops data access. No FK involved.
    DELETE FROM public.user_roles WHERE user_id = v_uid;

    -- 1b. Password + ban, so the published credential is worthless and no
    --     refresh token can be exchanged for a new session.
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
        banned_until = 'infinity'::timestamptz,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                             || '{"disabled_reason":"demo account revoked - live data"}'::jsonb
    WHERE id = v_uid;

    -- 1c. Terminate anything already signed in.
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

    -- 1d. Downgrade the public.users mirror row. UPDATE, never DELETE.
    BEGIN
      UPDATE public.users SET role = 'student' WHERE id = v_uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not downgrade public.users for %: %', demo_email, SQLERRM;
    END;

    RAISE NOTICE 'REVOKED %: roles removed, password scrambled, banned, sessions cleared', demo_email;
  END LOOP;

  -- ── 2. The one surviving demo account: student@demo.com ──────────────
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
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'student')
      ON CONFLICT (user_id, role) DO NOTHING;

    BEGIN
      INSERT INTO public.users (id, role) VALUES (v_uid, 'student')
        ON CONFLICT (id) DO UPDATE SET role = 'student';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not upsert public.users for demo student: %', SQLERRM;
    END;

    -- 2a. Detach the demo student from every REAL class: a student in a real
    --     class can read that class's leaderboard, i.e. real classmates'
    --     names.
    BEGIN
      SELECT id INTO v_demo_class_id FROM public.classes WHERE name = 'Demo Class' LIMIT 1;
      DELETE FROM public.enrollments
      WHERE student_id IN (SELECT id FROM public.students WHERE linked_user_id = v_uid)
        AND (v_demo_class_id IS NULL OR class_id <> v_demo_class_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not detach demo student from real classes: %', SQLERRM;
    END;
  END IF;

  -- ── 3. Verify, and say so loudly in the migration output ─────────────
  -- Deliberately a NOTICE and not an exception: raising here would roll back
  -- the very revocation we just performed. This is a report, not a gate.
  SELECT count(*) INTO v_still_privileged
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE lower(au.email) IN ('admin@demo.com', 'teacher@demo.com', 'family@demo.com');

  IF v_still_privileged > 0 THEN
    RAISE WARNING 'DEMO REVOCATION INCOMPLETE: % privileged role row(s) remain. Run scripts/CHECK-demo-accounts.sql', v_still_privileged;
  ELSE
    RAISE NOTICE 'DEMO REVOCATION VERIFIED: no roles remain on any privileged demo account.';
  END IF;
END $$;
