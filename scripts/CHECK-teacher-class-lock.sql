-- Is 20261005090000_restrict_teacher_class_updates.sql actually installed?
--
-- Run in the Supabase SQL editor. Read-only: it inspects the catalog and
-- changes nothing. Four questions, in the order that matters.
--
-- Why this exists: a tool reporting "deployed" tells you a job finished, not
-- that THIS trigger is on the table. It is also possible for an equivalent-
-- looking guard to be installed that denies a FIXED LIST of columns rather
-- than allowing only two -- that version silently stops protecting any column
-- added to public.classes afterwards. Question 3 tells the two apart.

-- 1. Is the trigger on the table, and is it enabled?
--    tgenabled: 'O' = enabled, 'D' = DISABLED (installed but doing nothing).
SELECT
  t.tgname                                    AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'DISABLED - not protecting anything'
    ELSE 'enabled (' || t.tgenabled || ')'
  END                                         AS state,
  pg_get_triggerdef(t.oid)                    AS definition
FROM pg_trigger t
WHERE t.tgrelid = 'public.classes'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;
-- EXPECT: a row named enforce_class_update_column_scope, state 'enabled',
-- defined BEFORE UPDATE ... FOR EACH ROW.
-- Note the alphabetical ordering against update_classes_updated_at.

-- 2. Does the function exist, and is it SECURITY DEFINER with a pinned
--    search_path? Without both it can be defeated or will fail to see
--    public.has_role.
SELECT
  p.proname                                   AS function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER - WRONG' END AS security,
  COALESCE(array_to_string(p.proconfig, ', '), 'NO search_path SET - WRONG')        AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'enforce_class_update_column_scope';
-- EXPECT: one row, SECURITY DEFINER, search_path=public.

-- 3. Allowlist or denylist? Read the installed body, not the repo's copy.
SELECT pg_get_functiondef(p.oid) AS installed_source
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'enforce_class_update_column_scope';
-- EXPECT: it builds a `remainder` record, resets economy_mode and
-- points_to_cash_rate (plus updated_at/updated_by) to their OLD values, then
-- raises unless `remainder IS DISTINCT FROM OLD` is false.
--
-- If instead you see a list of named columns being rejected (name,
-- session_rate_vnd, is_active, ...), a DIFFERENT guard is installed. It will
-- work today and quietly stop covering every column added to public.classes
-- from then on. Worth replacing with the allowlist version.

-- 4. Can anon execute it directly? It should not be callable outside the
--    trigger.
SELECT
  has_function_privilege('anon',   'public.enforce_class_update_column_scope()', 'EXECUTE') AS anon_can_execute,
  has_function_privilege('public', 'public.enforce_class_update_column_scope()', 'EXECUTE') AS public_can_execute;
-- EXPECT: both false.

-- 5. Context: the policy this trigger exists to narrow. It should still be
--    present and still grant the whole row - the trigger is what confines it,
--    and removing the policy would take teachers' economy switch with it.
SELECT polname, cmd, qual, with_check
FROM (
  SELECT
    pol.polname,
    CASE pol.polcmd WHEN 'w' THEN 'UPDATE' WHEN '*' THEN 'ALL' ELSE pol.polcmd::text END AS cmd,
    pg_get_expr(pol.polqual,      pol.polrelid) AS qual,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
  FROM pg_policy pol
  WHERE pol.polrelid = 'public.classes'::regclass
) s
WHERE cmd IN ('UPDATE', 'ALL')
ORDER BY polname;
-- EXPECT: the teacher economy UPDATE policy, using is_teacher_of_class(...).

-- 6. THE REAL PROOF, and the only one that exercises the trigger rather than
--    reading the catalog. Safe: it rolls back, so nothing is written even if
--    the guard is missing.
--
--    Set a real teacher's auth user id and one of THEIR class ids below. Leave
--    them NULL to skip this block.
DO $$
DECLARE
  v_teacher_user_id uuid := NULL;  -- <- a teacher's auth.users.id
  v_class_id        uuid := NULL;  -- <- a class that teacher teaches
  v_old_name        text;
  v_blocked         boolean := false;
BEGIN
  IF v_teacher_user_id IS NULL OR v_class_id IS NULL THEN
    RAISE NOTICE 'SKIPPED: fill in v_teacher_user_id and v_class_id to test the trigger for real.';
    RETURN;
  END IF;

  SELECT name INTO v_old_name FROM public.classes WHERE id = v_class_id;

  -- Impersonate that teacher for the rest of this block.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_teacher_user_id, 'role', 'authenticated')::text,
                     true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    UPDATE public.classes SET name = v_old_name || ' (tampered)' WHERE id = v_class_id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;

  IF v_blocked THEN
    RAISE NOTICE 'PASS: a teacher renaming their own class was rejected.';
  ELSE
    RAISE WARNING 'FAIL: a teacher RENAMED their own class. The guard is not in force.';
  END IF;

  -- Never commit either outcome.
  RAISE EXCEPTION 'rollback: verification only, no changes kept';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'rollback: verification only, no changes kept' THEN
    RAISE;
  END IF;
END $$;
