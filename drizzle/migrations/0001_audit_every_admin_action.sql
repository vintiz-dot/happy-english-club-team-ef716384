ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS operation      text,
  ADD COLUMN IF NOT EXISTS changed_fields text[],
  ADD COLUMN IF NOT EXISTS client_ip      text,
  ADD COLUMN IF NOT EXISTS user_agent     text;

COMMENT ON COLUMN public.audit_log.operation IS
  'INSERT / UPDATE / DELETE for trigger-written rows; null for the named entries the edge functions and screens still add.';
COMMENT ON COLUMN public.audit_log.changed_fields IS
  'Columns that actually moved on an UPDATE, so "who touched the rate?" is a query rather than a dig through JSON.';
COMMENT ON COLUMN public.audit_log.client_ip IS
  'First hop of x-forwarded-for. Text rather than inet: an audit trigger must not be able to fail a cast and take the real write down with it.';

CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_desc
  ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_occurred
  ON public.audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_fields
  ON public.audit_log USING gin (changed_fields);

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old       jsonb;
  v_new       jsonb;
  v_changed   text[];
  v_entity_id text;
  v_headers   jsonb;
  v_ip        text;
  v_ua        text;
  c_secret_cols constant text[] := ARRAY[
    'password', 'password_hash', 'passcode', 'passcode_hash', 'pin', 'pin_hash',
    'token', 'refresh_token', 'access_token', 'secret', 'api_key', 'otp',
    'access_code', 'credential_public_key'
  ];
  c_noise_cols constant text[] := ARRAY['updated_at', 'updated_by'];
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - c_secret_cols; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - c_secret_cols; END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k ORDER BY k)
      INTO v_changed
      FROM jsonb_object_keys(v_new) AS k
     WHERE (v_new -> k) IS DISTINCT FROM (v_old -> k)
       AND NOT (k = ANY (c_noise_cols));

    IF v_changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  v_entity_id := COALESCE(v_new ->> 'id', v_old ->> 'id');

  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    v_ip := NULLIF(btrim(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
    v_ua := v_headers ->> 'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
    v_ua := NULL;
  END;

  INSERT INTO public.audit_log (
    entity, entity_id, action, operation, changed_fields, diff,
    actor_user_id, client_ip, user_agent
  )
  VALUES (
    TG_TABLE_NAME,
    v_entity_id,
    lower(TG_OP),
    TG_OP,
    v_changed,
    jsonb_strip_nulls(jsonb_build_object('old', v_old, 'new', v_new)),
    auth.uid(),
    v_ip,
    v_ua
  );

  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.audit_row_change() IS
  'Generic AFTER trigger. Writes one audit_log row per meaningful change, with the actor taken from auth.uid(). Skips writes made by other triggers, updates that only touched updated_at/updated_by, and any column whose name looks like a secret.';

REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM anon, PUBLIC;

DO $$
DECLARE
  t    text;
  tabs text[] := ARRAY[
    'invoices', 'payments', 'payment_allocations', 'student_points',
    'economy_transactions', 'attendance', 'enrollments', 'classes',
    'students', 'user_roles', 'discount_assignments'
  ];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NULL THEN
      RAISE NOTICE 'audit: skipping %, table not present', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;

  IF to_regclass('public.sessions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_sessions ON public.sessions';
    EXECUTE 'CREATE TRIGGER audit_sessions AFTER UPDATE OR DELETE ON public.sessions
               FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()';
  END IF;
END $$;

REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon;

COMMENT ON TABLE public.audit_log IS
  'Append-only record of who changed what. Written by the audit_row_change trigger on the money, safety and access tables, and by named entries from the admin screens and edge functions. authenticated may insert and select; only service_role may modify or prune.';