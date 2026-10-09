-- Record who did what, in the database, where it cannot be forgotten.
--
-- Today the audit trail is twenty-four hand-written inserts scattered
-- through the admin screens. Ten of them do not record who acted at all,
-- every one is fire-and-forget (an await with no error handling), and
-- anything nobody remembered to instrument leaves no trace whatsoever. A
-- trail you have to remember to write is not a trail.
--
-- So it moves into the database. A trigger sees every write to the tables
-- that matter, whatever made it - an admin screen, an edge function, or
-- somebody in the SQL editor - and takes the actor from auth.uid(), which
-- comes out of the verified JWT and cannot be set by the caller. That is the
-- rule this codebase already learned the hard way in _lib/auth.ts: never
-- trust identity from the body.
--
-- Scope is the money, safety and access surface rather than every table:
-- invoices, payments, payment_allocations, student_points,
-- economy_transactions, attendance, enrollments, classes, students,
-- user_roles, discount_assignments, plus updates and deletes on sessions.
-- Adding another table later is one entry in the array near the bottom.
--
-- Three things keep the log honest rather than merely large:
--
--   * Writes made by other triggers are skipped. The carry refresh added in
--     20261009120000 rewrites four columns on every invoice in a student
--     history; none of that is an action a person took.
--   * An update whose only changed columns are updated_at / updated_by is
--     not logged. That is churn, not a decision.
--   * Columns whose names look like secrets are stripped from the snapshot
--     before it is stored, on every table, with no per-table list to keep.
--
-- The trigger can never abort the write it is observing: the one part that
-- could realistically fail - parsing request headers - is wrapped, so a
-- malformed header costs the IP address, not the transaction.

-- ------------------------------------------------------------ log columns

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

-- --------------------------------------------------------------- function

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

  -- Never copied into the log, on any table. A name-based rule survives
  -- tables that do not exist yet; a per-table allow-list would not.
  c_secret_cols constant text[] := ARRAY[
    'password', 'password_hash', 'passcode', 'passcode_hash', 'pin', 'pin_hash',
    'token', 'refresh_token', 'access_token', 'secret', 'api_key', 'otp',
    'access_code', 'credential_public_key'
  ];
  -- A change to these alone is not a decision anyone made.
  c_noise_cols constant text[] := ARRAY['updated_at', 'updated_by'];
BEGIN
  -- Depth greater than 1 means another trigger made this write: derived
  -- data, not a human action.
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

  -- Observability must never cost a write. Anything unexpected in the
  -- request headers simply means no IP and no user agent on this row.
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
    -- From the verified JWT. Null means service_role: an edge function or a
    -- scheduled job, which write their own named entries where they can.
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

-- --------------------------------------------------------------- triggers

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

  -- Sessions, but not inserts: schedule-sessions and generate-sessions
  -- create them in bulk, which would bury the log. Moving, rescheduling or
  -- cancelling one is a decision, and it moves payroll and tuition, so
  -- updates and deletes are recorded.
  IF to_regclass('public.sessions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_sessions ON public.sessions';
    EXECUTE 'CREATE TRIGGER audit_sessions AFTER UPDATE OR DELETE ON public.sessions
               FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()';
  END IF;
END $$;

-- ------------------------------------------------------------ append-only

-- The screens and edge functions still add their own named entries, so
-- INSERT stays. Nobody signed in may rewrite history. service_role keeps
-- full access so a retention job remains possible.
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon;

COMMENT ON TABLE public.audit_log IS
  'Append-only record of who changed what. Written by the audit_row_change trigger on the money, safety and access tables, and by named entries from the admin screens and edge functions. authenticated may insert and select; only service_role may modify or prune.';
