# S1 security fixes (F-01, F-14, F-15, F-16, F-21, F-02)

**Where I am / next step:** just started; reading AGENTS.md, supabase/AGENTS.md and docs/AUDIT_FINDINGS.md. Next: F-01 (sign-up role).

Build and test only. Nothing here has been applied to live, deployed or pushed.

## F-01 rollback

<!-- rollback F-01 -->
```sql
-- Puts handle_new_user back exactly as 20260312152157 left it (the live
-- function on 13 Nov 2026) and recreates the dropped custom_quests policy.
-- THIS REOPENS F-01. No account is changed by it.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.app_role,
    'student'::public.app_role
  );

  -- Block admin role from self-service signup in BOTH tables
  IF v_role = 'admin'::public.app_role THEN
    RAISE WARNING 'Blocked attempt to create admin account via signup for user %', NEW.id;
    v_role := 'student'::public.app_role;
  END IF;

  INSERT INTO public.users (id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;
DROP POLICY IF EXISTS "Only admins can manage custom_quests" ON public.custom_quests;
CREATE POLICY "Only admins can manage custom_quests" ON public.custom_quests FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::app_role))));
COMMIT;
```
