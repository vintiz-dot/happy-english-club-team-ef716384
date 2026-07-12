-- Seed the demo accounts advertised on the Auth page so the demo login
-- buttons actually authenticate:
--
--   admin@demo.com   / admin123
--   teacher@demo.com / teacher123
--   student@demo.com / student123
--   family@demo.com  / family123
--
-- Idempotent: creates missing users, resets passwords for existing ones
-- (so the documented credentials always work), and corrects role rows —
-- the signup trigger deliberately downgrades 'admin' to 'student', so the
-- admin demo role must be set explicitly here (migrations run privileged).
--
-- pgcrypto lives in the `extensions` schema on Supabase, hence the
-- qualified extensions.crypt / extensions.gen_salt calls.

DO $$
DECLARE
  demo RECORD;
  v_uid UUID;
BEGIN
  FOR demo IN
    SELECT * FROM (VALUES
      ('admin@demo.com',   'admin123',   'admin',   'Demo Admin'),
      ('teacher@demo.com', 'teacher123', 'teacher', 'Demo Teacher'),
      ('student@demo.com', 'student123', 'student', 'Demo Student'),
      ('family@demo.com',  'family123',  'family',  'Demo Family')
    ) AS t(email, pass, role, display_name)
  LOOP
    SELECT id INTO v_uid FROM auth.users WHERE email = demo.email;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_uid, 'authenticated', 'authenticated',
        demo.email,
        extensions.crypt(demo.pass, extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('role', demo.role, 'full_name', demo.display_name),
        now(), now(),
        '', '', '', ''
      );
      -- GoTrue requires an email identity row for password sign-in.
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_uid, v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', demo.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(demo.pass, extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = v_uid;
    END IF;

    -- Correct role rows regardless of what the signup trigger wrote.
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, demo.role::public.app_role);

    INSERT INTO public.users (id, role)
    VALUES (v_uid, demo.role::public.app_role)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    -- Linked entity rows so each dashboard has an identity to render.
    IF demo.role = 'teacher' THEN
      INSERT INTO public.teachers (user_id, full_name, email)
      SELECT v_uid, demo.display_name, demo.email
      WHERE NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = v_uid);
    ELSIF demo.role = 'student' THEN
      INSERT INTO public.students (full_name, email, linked_user_id, is_active)
      SELECT demo.display_name, demo.email, v_uid, true
      WHERE NOT EXISTS (SELECT 1 FROM public.students WHERE linked_user_id = v_uid);
    ELSIF demo.role = 'family' THEN
      INSERT INTO public.families (name, email, primary_user_id, is_active)
      SELECT demo.display_name, demo.email, v_uid, true
      WHERE NOT EXISTS (SELECT 1 FROM public.families WHERE primary_user_id = v_uid);
    END IF;
  END LOOP;
END $$;
