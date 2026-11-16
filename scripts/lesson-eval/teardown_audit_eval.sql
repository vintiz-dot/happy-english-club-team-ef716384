-- TEARDOWN of the TEMPORARY vendor evaluation proxy (audit-eval-proxy).
-- Run the steps in scripts/lesson-eval/teardown_audit_eval.md IN ORDER;
-- this file is step 4. It undoes supabase/migrations/20261112110000_audit_eval_bucket.sql.
--
-- Idempotent: safe to paste again, and safe on a database where the
-- migration was never applied.
--
-- It does NOT delete the audio. Supabase refuses direct deletes from
-- storage.objects; delete the pieces with the Storage API first
-- (`vendor_run.py --delete-remote`, or Dashboard > Storage > audit-eval >
-- select all > Delete). The bucket row is removed here only when it is
-- already empty, and a NOTICE says so otherwise.

BEGIN;

-- 1. The kill switch, first, in case the function is still deployed.
DO $$
BEGIN
  IF to_regclass('public.audit_eval_settings') IS NOT NULL THEN
    UPDATE public.audit_eval_settings SET enabled = false, updated_at = now();
  END IF;
END $$;

-- 2. Storage policies.
DROP POLICY IF EXISTS audit_eval_storage_insert ON storage.objects;
DROP POLICY IF EXISTS audit_eval_storage_select ON storage.objects;
DROP POLICY IF EXISTS audit_eval_storage_delete ON storage.objects;

-- 3. The bucket, only when empty.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'audit-eval') THEN
    RAISE NOTICE 'audit-eval still holds % object(s): delete them through the Storage API, then paste this file again',
      (SELECT count(*) FROM storage.objects WHERE bucket_id = 'audit-eval');
  ELSE
    DELETE FROM storage.buckets WHERE id = 'audit-eval';
  END IF;
END $$;

-- 4. Functions, triggers, tables.
DROP FUNCTION IF EXISTS public.audit_eval_reserve(text, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.audit_eval_finish(uuid, text, integer, numeric);
DROP TABLE IF EXISTS public.audit_eval_runs;      -- drops its triggers and policies
DROP TABLE IF EXISTS public.audit_eval_settings;
DROP FUNCTION IF EXISTS public.audit_eval_runs_guard();
DROP FUNCTION IF EXISTS public.audit_eval_runs_freeze();

COMMIT;

-- Verify (expect: no rows, then 0, then 0):
--   SELECT to_regclass('public.audit_eval_runs'), to_regclass('public.audit_eval_settings');
--   SELECT count(*) FROM pg_proc WHERE proname LIKE 'audit_eval%';
--   SELECT count(*) FROM pg_policies WHERE policyname LIKE 'audit_eval%';
--   SELECT count(*) FROM storage.buckets WHERE id = 'audit-eval';
