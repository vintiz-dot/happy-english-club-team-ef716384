-- F-01: a sign-up never receives a role because the browser asked for it.
--
-- THE DEFECT. auth.users has the trigger on_auth_user_created ->
-- public.handle_new_user(). As 20260312152157 left it, the function read
-- raw_user_meta_data->>'role' - a value the PUBLIC sign-up form sends
-- (src/pages/Auth.tsx, "I am a: Student / Teacher / Family / Admin") and that
-- anyone can send to /auth/v1/signup directly - and inserted it into
-- public.user_roles, downgrading only 'admin'. So a stranger with an email
-- address became a `teacher`: every child's learning profile, monthly finance
-- snapshots, every homework file, the student-work and lesson-resources
-- buckets, and the staff-only edge functions.
--
-- THE RULE NOW. Client metadata is never an authority.
--   * requested 'teacher' (any case, any padding): the account is created
--     with NO row in user_roles. It can sign in and read nothing; an admin
--     grants the role (Users screen), or the admin function that created the
--     account inserts it explicitly a moment later.
--   * anything else - 'student', 'family', 'admin', absent, or a value that
--     is not a role at all: exactly one row, `student`. 'admin' was already
--     answered with `student` before this file, and it must stay so: parents
--     really do pick "Admin" on the form (17 live non-admin accounts carry
--     that metadata, 14 of them linked to a family or child), and an account
--     with no role sees a blank page - which linking it to a family does not
--     cure. `admin` itself is still never granted here.
--     `family` is not granted from
--     the form: no live account holds it (every family login in production
--     holds `student` and reaches its children through families.primary_user_id
--     / students.linked_user_id), so `student` is the tested path. An unlinked
--     `student` reads no child's rows: every child-data policy asks for a link.
--   * public.users.role (a legacy column; NOT NULL) is always 'student' for a
--     new account. It used to copy the requested value, which is how 17 live
--     accounts came to carry users.role = 'admin' without being admins.
--
-- WHY "NO ROW" FOR TEACHER RATHER THAN `student`. The admin functions that
-- create teaching staff call auth.admin.createUser({ user_metadata: { role:
-- "teacher" } }) and then insert the role themselves with the service key
-- (create-teacher, create-teaching-assistant). With no row from the trigger
-- they end with exactly `teacher`, which is what they produce today (the
-- trigger used to insert 'teacher' and the function's own insert then hit the
-- unique key and was ignored); `student` here would leave every new teacher
-- and TA holding {student, teacher}, a state no live staff account has.
-- manage-admin-users (create) sends 'admin' and inserts `admin` itself: it
-- ends {admin, student}, exactly as on live today. No edge function has to be
-- redeployed for this migration, in either order.
--
-- ALSO HERE, SAME ROOT CAUSE. Policy "Only admins can manage custom_quests"
-- (20260109111521) is FOR ALL TO public USING (users.role = 'admin') - the
-- legacy column. 20260312152157 meant to replace it but dropped a policy named
-- "...modify..." instead, so it survived beside the correct one. The 17
-- accounts above can write custom_quests through it. It is dropped; the
-- has_role policy "Only admins can modify custom_quests" stays.
--
-- NOT TOUCHED: any existing account, any existing row of user_roles or users
-- (scripts/CHECK-unlinked-accounts.sql lists the accounts the owner should
-- look at), the trigger itself, Supabase Auth settings. Idempotent.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regclass('public.user_roles') IS NULL OR to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: public.user_roles / public.users missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.user_roles'::regclass AND contype IN ('u', 'p')
                    AND pg_get_constraintdef(oid) ~ '\(user_id, role\)') THEN
    RAISE EXCEPTION 'Refusing to install: user_roles has no UNIQUE (user_id, role)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t
                  WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal
                    AND t.tgfoid = 'public.handle_new_user()'::regprocedure) THEN
    RAISE EXCEPTION 'Refusing to install: auth.users has no trigger calling public.handle_new_user()';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  -- What the client asked for. Read as TEXT and only ever compared: it is
  -- never cast to app_role and never written anywhere.
  v_requested text := lower(regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'role', ''), '\s', '', 'g'));
BEGIN
  INSERT INTO public.users (id, role)
  VALUES (NEW.id, 'student'::public.app_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_requested = 'teacher' THEN
    -- The teacher role is granted by an admin, never by a sign-up. No row:
    -- create-teacher / create-teaching-assistant insert it a moment later.
    RAISE WARNING 'handle_new_user: account % asked for role "teacher"; no role granted', NEW.id;
  ELSE
    -- Everything else, a request for admin included, is a student - as the
    -- function before this one already answered a request for admin.
    IF v_requested = 'admin' THEN
      RAISE WARNING 'handle_new_user: account % asked for role "admin"; given student', NEW.id;
    END IF;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 20260711235319 already revoked these; restated so this file stands alone.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Only admins can manage custom_quests" ON public.custom_quests;

COMMIT;
