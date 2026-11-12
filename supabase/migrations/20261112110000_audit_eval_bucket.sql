-- ============================================================================
-- TEMPORARY - vendor evaluation proxy (audit-eval-proxy). DELETE WITH THE
-- TEARDOWN: scripts/lesson-eval/teardown_audit_eval.md (steps in order) and
-- scripts/lesson-eval/teardown_audit_eval.sql (drops everything below).
-- ============================================================================
--
-- WHAT THIS ADDS
--   audit-eval (bucket)     private. Pieces of lesson audio, named by codes
--                           only: lessons/L1/p0007.flac, clips/S07/held_03.wav,
--                           synth/M02/p0001.wav. Admin-only policies; the
--                           insert policy refuses any other name.
--   audit_eval_settings     one row: the kill switch (`enabled`) and the caps
--                           (per-run calls, per-run minutes, global minutes).
--   audit_eval_runs         one row per vendor call: ids, vendor, mode, object
--                           path, audio seconds, times, status, HTTP status,
--                           cost estimate. NO transcript, NO audio - there is
--                           no column that could hold either.
--   audit_eval_reserve()    reserves a call's minutes BEFORE the vendor is
--                           called. The caps are checked by a BEFORE INSERT
--                           trigger under a transaction-scoped advisory lock,
--                           so two reservations at once cannot both squeeze
--                           under a cap, and no insert path (RPC, service
--                           role, SQL) skips the check.
--   audit_eval_finish()     stamps the outcome of a reserved call, once.
--
-- RULES IT HOLDS
--   1. Admin only, everywhere. Teachers, families, students and anon read and
--      write nothing: not the tables, not the bucket.
--   2. A refused cap raises SQLSTATE PT429 (PostgREST answers HTTP 429);
--      the kill switch off raises PT503 (HTTP 503).
--   3. Minutes reserved stay counted even when the call fails: the caps
--      bound what could have been sent, not what succeeded.
--   4. Nothing an authenticated user does can raise a cap or reset the
--      count: no INSERT/UPDATE/DELETE grant on either table; changes go
--      through the SQL editor.
--
-- Safe to run twice: a second paste keeps the settings the owner changed.

BEGIN;

-- ------------------------------------------------------------- settings
CREATE TABLE IF NOT EXISTS public.audit_eval_settings (
  id                   boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled              boolean NOT NULL DEFAULT true,
  per_run_max_calls    integer NOT NULL DEFAULT 400  CHECK (per_run_max_calls >= 0),
  per_run_max_minutes  numeric NOT NULL DEFAULT 600  CHECK (per_run_max_minutes >= 0),
  global_max_minutes   numeric NOT NULL DEFAULT 2000 CHECK (global_max_minutes >= 0),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.audit_eval_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------- runs
CREATE TABLE IF NOT EXISTS public.audit_eval_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             text NOT NULL CHECK (run_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$'),
  vendor             text NOT NULL CHECK (vendor IN ('azure', 'openai', 'gemini', 'google')),
  mode               text NOT NULL CHECK (mode ~ '^[a-z0-9][a-z0-9_.-]{0,47}$'),
  object_path        text NOT NULL CHECK (object_path ~
    '^(lessons/L[0-9]{1,3}|clips/S[0-9]{2,3}|synth/M[0-9]{2,3})/[a-z0-9_]{1,32}\.(flac|wav|mp3|ogg)$'),
  audio_seconds      numeric NOT NULL CHECK (audio_seconds > 0 AND audio_seconds <= 1200),
  reserved_minutes   numeric NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'reserved'
                       CHECK (status IN ('reserved', 'ok', 'vendor_error', 'timeout', 'failed')),
  http_status        integer,
  cost_estimate_usd  numeric,
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  created_by         uuid
);

CREATE INDEX IF NOT EXISTS idx_audit_eval_runs_run ON public.audit_eval_runs (run_id);

-- Caps, checked on every insert whoever inserts. The advisory lock makes
-- every reservation wait for the one before it to commit, so the sums it
-- reads are the sums that stand.
CREATE OR REPLACE FUNCTION public.audit_eval_runs_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.audit_eval_settings%ROWTYPE;
  v_calls integer;
  v_run_minutes numeric;
  v_all_minutes numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('audit_eval_runs'));
  SELECT * INTO s FROM public.audit_eval_settings WHERE id FOR UPDATE;
  IF NOT FOUND OR NOT s.enabled THEN
    RAISE EXCEPTION 'The vendor evaluation is switched off' USING ERRCODE = 'PT503';
  END IF;

  -- Whatever the caller sent, the row starts reserved and counts its minutes.
  NEW.status := 'reserved';
  NEW.http_status := NULL;
  NEW.finished_at := NULL;
  NEW.cost_estimate_usd := NULL;
  NEW.started_at := now();
  NEW.reserved_minutes := NEW.audio_seconds / 60.0;

  SELECT count(*), COALESCE(sum(reserved_minutes), 0)
    INTO v_calls, v_run_minutes
    FROM public.audit_eval_runs WHERE run_id = NEW.run_id;
  SELECT COALESCE(sum(reserved_minutes), 0) INTO v_all_minutes FROM public.audit_eval_runs;

  IF v_calls + 1 > s.per_run_max_calls THEN
    RAISE EXCEPTION 'Run % has used its % calls', NEW.run_id, s.per_run_max_calls USING ERRCODE = 'PT429';
  END IF;
  IF v_run_minutes + NEW.reserved_minutes > s.per_run_max_minutes THEN
    RAISE EXCEPTION 'Run % would pass its % audio minutes', NEW.run_id, s.per_run_max_minutes USING ERRCODE = 'PT429';
  END IF;
  IF v_all_minutes + NEW.reserved_minutes > s.global_max_minutes THEN
    RAISE EXCEPTION 'The evaluation would pass its global % audio minutes', s.global_max_minutes USING ERRCODE = 'PT429';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_eval_runs_guard ON public.audit_eval_runs;
CREATE TRIGGER audit_eval_runs_guard
  BEFORE INSERT ON public.audit_eval_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_eval_runs_guard();

-- A reservation is finished once, and only its outcome can change: the
-- minutes, path and run it was charged to stand.
CREATE OR REPLACE FUNCTION public.audit_eval_runs_freeze()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'reserved' THEN
    RAISE EXCEPTION 'This call is already finished';
  END IF;
  IF NEW.run_id IS DISTINCT FROM OLD.run_id OR NEW.vendor IS DISTINCT FROM OLD.vendor
     OR NEW.mode IS DISTINCT FROM OLD.mode OR NEW.object_path IS DISTINCT FROM OLD.object_path
     OR NEW.audio_seconds IS DISTINCT FROM OLD.audio_seconds
     OR NEW.reserved_minutes IS DISTINCT FROM OLD.reserved_minutes
     OR NEW.started_at IS DISTINCT FROM OLD.started_at OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Only the outcome of a call can be recorded';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_eval_runs_freeze ON public.audit_eval_runs;
CREATE TRIGGER audit_eval_runs_freeze
  BEFORE UPDATE ON public.audit_eval_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_eval_runs_freeze();

-- --------------------------------------------------------------- RPCs
CREATE OR REPLACE FUNCTION public.audit_eval_reserve(
  p_run_id text, p_vendor text, p_mode text, p_object_path text, p_audio_seconds numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only an admin can run the vendor evaluation' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.audit_eval_runs (run_id, vendor, mode, object_path, audio_seconds, created_by)
  VALUES (p_run_id, p_vendor, p_mode, p_object_path, p_audio_seconds, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_eval_finish(
  p_id uuid, p_status text, p_http_status integer, p_cost_estimate_usd numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only an admin can run the vendor evaluation' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('ok', 'vendor_error', 'timeout', 'failed') THEN
    RAISE EXCEPTION 'Unknown outcome %', p_status;
  END IF;
  UPDATE public.audit_eval_runs
     SET status = p_status, http_status = p_http_status,
         cost_estimate_usd = p_cost_estimate_usd, finished_at = now()
   WHERE id = p_id AND status = 'reserved';
END;
$$;

REVOKE ALL ON FUNCTION public.audit_eval_reserve(text, text, text, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_eval_finish(uuid, text, integer, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_eval_runs_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_eval_reserve(text, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_eval_finish(uuid, text, integer, numeric) TO authenticated;

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.audit_eval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_eval_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_eval_settings_admin_read ON public.audit_eval_settings;
CREATE POLICY audit_eval_settings_admin_read ON public.audit_eval_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS audit_eval_runs_admin_read ON public.audit_eval_runs;
CREATE POLICY audit_eval_runs_admin_read ON public.audit_eval_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 20260712023825 revoked the public defaults, so grant explicitly. Read
-- only for signed-in users: writes go through the two functions above.
REVOKE ALL ON public.audit_eval_settings FROM anon, authenticated;
REVOKE ALL ON public.audit_eval_runs FROM anon, authenticated;
GRANT SELECT ON public.audit_eval_settings TO authenticated;
GRANT SELECT ON public.audit_eval_runs TO authenticated;
GRANT ALL ON public.audit_eval_settings TO service_role;
GRANT ALL ON public.audit_eval_runs TO service_role;

-- ---------------------------------------------------------------- storage
-- 25 MB per piece: a 10-minute 16 kHz mono FLAC is about 10 MB and a WAV
-- about 19 MB; 25 MB is also OpenAI's per-request limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audit-eval', 'audit-eval', false, 26214400,
        ARRAY['audio/flac', 'audio/x-flac', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS audit_eval_storage_insert ON storage.objects;
CREATE POLICY audit_eval_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-eval'
    AND public.has_role(auth.uid(), 'admin'::app_role)
    AND name ~ '^(lessons/L[0-9]{1,3}|clips/S[0-9]{2,3}|synth/M[0-9]{2,3})/[a-z0-9_]{1,32}\.(flac|wav|mp3|ogg)$'
  );

DROP POLICY IF EXISTS audit_eval_storage_select ON storage.objects;
CREATE POLICY audit_eval_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audit-eval' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS audit_eval_storage_delete ON storage.objects;
CREATE POLICY audit_eval_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audit-eval' AND public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
