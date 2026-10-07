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

-- 6. THE REAL PROOF, and the only part that exercises the trigger rather than
--    reading the catalog. Everything above describes what is installed; only
--    this says what it DOES.
--
--    Safe on live data: both updates run inside a block that always raises at
--    the end, so the subtransaction rolls back whichever way the test goes.
--    Nothing is written even if the guard turns out to be missing.
--
--    It picks its own subject. Leave the two ids NULL and it finds a teacher
--    who actually teaches a class, deliberately skipping anyone who also holds
--    admin -- an admin-teacher is waved through by design and would look like
--    a failure. Fill them in to test a specific pair instead.
DO $$
DECLARE
  v_teacher_user_id uuid    := NULL;  -- optional: a specific teacher's auth.users.id
  v_class_id        uuid    := NULL;  -- optional: a class that teacher teaches
  v_old_name        text;
  v_blocked         boolean := false;
  v_economy_ok      boolean := false;
  v_rows            integer;
BEGIN
  IF v_teacher_user_id IS NULL OR v_class_id IS NULL THEN
    SELECT t.user_id, c.id
      INTO v_teacher_user_id, v_class_id
    FROM public.teachers t
    JOIN public.classes c ON public.is_teacher_of_class(t.user_id, c.id)
    WHERE t.user_id IS NOT NULL
      AND NOT public.has_role(t.user_id, 'admin')
    LIMIT 1;
  END IF;

  IF v_teacher_user_id IS NULL OR v_class_id IS NULL THEN
    RAISE NOTICE 'SKIPPED: found no non-admin teacher linked to a class. Fill in the two ids by hand.';
    RETURN;
  END IF;

  SELECT name INTO v_old_name FROM public.classes WHERE id = v_class_id;
  RAISE NOTICE 'Testing as teacher % against class % (%).', v_teacher_user_id, v_class_id, v_old_name;

  -- Become that teacher. Both settings are transaction-local and die with the
  -- rollback below.
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_teacher_user_id, 'role', 'authenticated')::text,
                     true);
  PERFORM set_config('role', 'authenticated', true);

  -- 6a. The thing that must be refused.
  BEGIN
    UPDATE public.classes SET name = v_old_name || ' (tampered)' WHERE id = v_class_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  END;

  IF v_blocked THEN
    RAISE NOTICE 'PASS: renaming their own class was rejected.';
  ELSIF v_rows = 0 THEN
    -- No exception AND no rows: RLS filtered the row out before the trigger
    -- ever ran, so this proves nothing about the trigger either way.
    RAISE WARNING 'INCONCLUSIVE: the UPDATE matched 0 rows, so RLS blocked it before the trigger. Pick a pair the teacher policy admits.';
  ELSE
    RAISE WARNING 'FAIL: a teacher RENAMED their own class. The guard is not in force.';
  END IF;

  -- 6b. The thing that must still be allowed. A guard that refuses everything
  --     passes 6a and quietly breaks the teachers' economy switch, which is
  --     the whole reason the policy exists.
  BEGIN
    UPDATE public.classes
       SET economy_mode = NOT COALESCE(economy_mode, false)
     WHERE id = v_class_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_economy_ok := v_rows > 0;
  EXCEPTION WHEN insufficient_privilege THEN
    v_economy_ok := false;
  END;

  IF v_economy_ok THEN
    RAISE NOTICE 'PASS: the same teacher can still toggle economy_mode.';
  ELSE
    RAISE WARNING 'FAIL: the teacher can no longer change economy_mode. The guard is too tight.';
  END IF;

  -- Never commit either outcome.
  RAISE EXCEPTION 'rollback: verification only, no changes kept';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'rollback: verification only, no changes kept' THEN
    RAISE;
  END IF;
  RAISE NOTICE 'Rolled back. Nothing was written.';
END $$;
