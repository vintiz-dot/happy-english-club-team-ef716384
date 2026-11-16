-- D4 step 4: two-administrator approval of money changes. BUILT SWITCHED OFF.
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.8, c.6, (e); the
-- review's R-12, A-4, A-15, A-16, A-17, A-18; the owner's ruling D-22
-- (approval built off; 5,000,000 VND). Build notes: docs/evidence/D4-build-4.md.
--
-- WHAT THIS ADDS
--   tables    change_approval_settings  ONE row; ships enabled = false
--             change_approval_requests  what was asked, append-only
--             change_approval_events    what happened to it, append-only
--   view      change_approval_queue
--   triggers  session_cancel_overrides.zz_session_override_approval  (D2's own changes)
--             user_roles.zz_admin_grant_guard                       (giving the admin role, A-18)
--             payroll_adjustments.zz_pay_adjustment_approval        (carrying pay forward, A-4)
--   RPCs      request_change_approval, approval_request_preview,
--             approve_change_request, reject_change_request,
--             withdraw_change_request, release_own_request,
--             acknowledge_released_request, set_change_approval_settings,
--             change_approval_status (admin JWT only)
--
-- WHAT IT REPLACES (preflight pins each one; a second paste finds its own body)
--   change_approval_needed, _change_request_claim   the two stubs of 1b
--   _money_change_full_plan                         1b's body with ONE change: the
--                                                   impact handed to the approval
--                                                   hook carries the plan's tier
--
-- WHILE enabled = false (as shipped) nothing waits: change_approval_needed
-- answers "not required", every trigger returns at once, and a request is
-- refused as "approval_not_needed". Behaviour is today's.
--
-- WHEN SWITCHED ON a change waits for a second administrator if it is T3, reaches
-- a closed payroll month, unfreezes a bill, carries pay forward, loosens the
-- setting or gives the admin role; or, being itself T2+, reaches settled bills of
-- 3+ families or 5,000,000 VND+ recorded - counted over the whole batch plus the
-- same person's applied T2+ changes of the last 24 hours. The requester can never
-- approve their own request; an approval recomputes the change under the locks
-- and refuses a stale one; approving IS applying, in one transaction.
--
-- No existing row is changed. Safe to paste twice.
-- Rollback: scripts/ROLLBACK-d4-6-approvals.sql (drops the three triggers;
-- approvals then read as off).

BEGIN;

SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'public._caller_lane()',
    'public._session_require_admin()',
    'public.session_change_reason_ok(text)',
    'public.session_cancel_audit_append_only()',
    'public.session_cancel_audit_insert_guard()',
    'public._session_change_assess(public.sessions, text, jsonb, uuid)',
    'public._money_change_full_plan(text, text, jsonb, uuid, text)',
    'public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid)',
    'public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb)',
    'public.money_changes_checked_bulk(jsonb, text, uuid, jsonb)',
    'public.cancel_session_checked(uuid, text, text, text, boolean, text, jsonb)',
    'public.move_session_checked(uuid, date, time without time zone, time without time zone, text, text, boolean, text, jsonb)',
    'public.uncancel_session_checked(uuid, text, text, jsonb, text)',
    'public.cancel_sessions_checked_bulk(jsonb, text, uuid, jsonb)',
    'public.change_approval_needed(jsonb, uuid)',
    'public._change_request_claim(text, text)',
    'public._money_plan__class_fee(text, jsonb, uuid)',
    'public._money_plan__session(text, jsonb, uuid)',
    'public._money_plan__enrollment(text, jsonb, uuid)',
    'public.has_role(uuid, public.app_role)',
    'auth.uid()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;
  FOR r IN SELECT unnest(ARRAY['sessions', 'students', 'invoices', 'user_roles', 'payroll_adjustments',
                               'session_cancel_overrides', 'money_change_overrides', 'class_fee_history']) AS t LOOP
    IF to_regclass('public.' || r.t) IS NULL THEN
      v_missing := v_missing || ('table public.' || r.t);
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM (VALUES
      ('payroll_adjustments', ARRAY['month','origin_month','teacher_id','assistant_id','amount_vnd','reason','created_by']),
      ('user_roles',          ARRAY['user_id','role']),
      ('students',            ARRAY['id','family_id'])) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      v_missing := v_missing || ARRAY(
        SELECT 'column public.' || r.tbl || '.' || c FROM unnest(r.cols) AS c
         WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                            WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = c));
    END IF;
  END LOOP;
  -- The guards of every earlier D4 step (and D2's) are in place: approval is
  -- step 4, after 3A and 3B.
  FOR r IN SELECT * FROM (VALUES
      ('sessions', 'zz_session_change_guard_upd'), ('attendance', 'zz_attendance_money_guard'),
      ('class_fee_history', 'zz_class_fee_money_guard'), ('sessions', 'zz2_session_pay_guard'),
      ('enrollments', 'zz_enrollment_money_guard'), ('invoices', 'zz_invoice_unfreeze_guard')) AS t(tbl, trg)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                    WHERE c.relnamespace = 'public'::regnamespace AND c.relname = r.tbl AND t.tgname = r.trg) THEN
      v_missing := v_missing || ('trigger ' || r.tbl || '.' || r.trg);
    END IF;
  END LOOP;
  -- The bodies this file relies on, as reviewed (md5 of the CR-stripped text).
  -- The hook's place in the apply and in D2's apply, the bulk RPCs that do NOT
  -- catch HC060 (so a batch is refused whole), the plans whose impact the rule
  -- reads, and the three bodies this file replaces (1b's or this file's own).
  FOR r IN SELECT * FROM (VALUES
      ('public._caller_lane()', ARRAY['66001c3b6eb716a6380e4155fba75409']),
      ('public._session_require_admin()', ARRAY['a2fbfe6ba15ca47d240940c2eb77cc50']),
      ('public.session_change_reason_ok(text)', ARRAY['fe7fce7a133605f45d93559c8ebbc10d']),
      ('public.session_cancel_audit_append_only()', ARRAY['863a2f0da9cf0a6235fb63ceae39b26a']),
      ('public.session_cancel_audit_insert_guard()', ARRAY['a9975e21bda621f8aca242afbb8929d1']),
      ('public._session_change_assess(public.sessions, text, jsonb, uuid)', ARRAY['6c1b8c86c47d3193d42f13adf56dcdc2']),
      ('public._session_change_apply(uuid, text, jsonb, text, text, boolean, text, jsonb, text, uuid, boolean)', ARRAY['c4de046f974934d555ac7e827b185b7a']),
      ('public.cancel_session_checked(uuid, text, text, text, boolean, text, jsonb)', ARRAY['79be46ef623216409422d99a17f64fce']),
      ('public.move_session_checked(uuid, date, time without time zone, time without time zone, text, text, boolean, text, jsonb)', ARRAY['5b4713755bca4d5c56996b456b45a9f9']),
      ('public.uncancel_session_checked(uuid, text, text, jsonb, text)', ARRAY['4bd1dcab7a2f2064651faa0b1f8181bf']),
      ('public.cancel_sessions_checked_bulk(jsonb, text, uuid, jsonb)', ARRAY['9ddc8f4fca50a4e4f312235d28c1fb9d']),
      ('public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid)', ARRAY['7f03dfffb2532174d6d8ed9733f5fd7f']),
      ('public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb)', ARRAY['fcf5a03f8f07a6a2ab40080737aec3ab']),
      ('public.money_change_preview(text, text, jsonb)', ARRAY['d19e2ff603ab7cf7f02c2b5b3c918df0']),
      ('public.money_changes_checked_bulk(jsonb, text, uuid, jsonb)', ARRAY['96596fa8e6df104c9a587f84aadaa620']),
      ('public._money_change_plan(text, text, jsonb, uuid)', ARRAY['3efa9ebcb79c47c65947f2636e07edd0']),
      ('public._money_plan__attendance(text, jsonb, uuid)', ARRAY['2a0bbcd0f17ba5a75dcda1baa3947021']),
      ('public._money_plan__class_fee(text, jsonb, uuid)', ARRAY['e15ee2320eddaf4736c6e360f3f534fb']),
      ('public._money_plan__session(text, jsonb, uuid)', ARRAY['e21f34e1392c0dd6f34f21b133271b87']),
      ('public._money_plan__enrollment(text, jsonb, uuid)', ARRAY['cb9e129ee5485021c3137d3aee2e5fe9']),
      ('public._money_plan__discount_assignment(text, jsonb, uuid)', ARRAY['1aed03a81e566fa6a756ee2fbf436d3c']),
      ('public._money_plan__referral_bonus(text, jsonb, uuid)', ARRAY['0156ce9527177b37aab481f4e0869440']),
      ('public._money_plan__pay_rate(text, jsonb, uuid)', ARRAY['aa28af8b81495574af464d95444978a3']),
      ('public._money_plan__invoice_freeze(text, jsonb, uuid)', ARRAY['9c4f583e0d0f729689c08bce2ea62a5e']),
      ('public._money_plan__family_link(text, jsonb, uuid)', ARRAY['8bdd8a7a760b08ed65fd6beb69097dfd']),
      ('public._money_change_full_plan(text, text, jsonb, uuid, text)', ARRAY['8f8b9abdec600f4365979c8798ec801c', '5bcb5952f4f8f2e7fbe3d7747846e2dd']),
      ('public.change_approval_needed(jsonb, uuid)', ARRAY['4b477e5155181f35119d0f7a225ec7ce', '9f646e810e4b375f62a37b3d9ced96dc']),
      ('public._change_request_claim(text, text)', ARRAY['7c84af305cfb366c6a8bb20e6f1bc6d8', '356d74c36029a948ee60c12ceb2a6d7d'])) AS t(sig, want)
  LOOP
    IF to_regprocedure(r.sig) IS NOT NULL
       AND (SELECT md5(replace(p.prosrc, E'\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig)) <> ALL (r.want) THEN
      v_missing := v_missing || ('function ' || r.sig || ' is not the reviewed body (expected md5 ' || array_to_string(r.want, ' or ') || ')');
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_change_approvals cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste D4 steps 1a, 1b, 2, 3A and 3B first, unchanged. Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- Tables. GRANTS as the house rule: authenticated SELECT (RLS: admins),
-- service_role ALL; the triggers refuse every write that is not made by the
-- definer functions of this file (they run as the table owner).

CREATE TABLE IF NOT EXISTS public.change_approval_settings (
  id                       boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled                  boolean NOT NULL DEFAULT false,
  on_tier3                 boolean NOT NULL DEFAULT true,
  on_closed_payroll        boolean NOT NULL DEFAULT true,
  on_unfreeze              boolean NOT NULL DEFAULT true,
  on_pay_adjustment        boolean NOT NULL DEFAULT true,
  min_families             integer NOT NULL DEFAULT 3 CHECK (min_families BETWEEN 1 AND 1000),
  min_paid_vnd             bigint  NOT NULL DEFAULT 5000000 CHECK (min_paid_vnd BETWEEN 0 AND 1000000000000),
  expiry_hours             integer NOT NULL DEFAULT 168 CHECK (expiry_hours BETWEEN 1 AND 720),
  solo_release_after_hours integer CHECK (solo_release_after_hours IS NULL OR solo_release_after_hours BETWEEN 1 AND 720),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid
);

CREATE TABLE IF NOT EXISTS public.change_approval_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  txid          bigint NOT NULL DEFAULT txid_current(),
  requested_by  uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('session', 'money', 'settings')),
  rpc           text NOT NULL CHECK (rpc IN ('money_change_checked', 'money_changes_checked_bulk', 'carry_payroll_adjustments',
                                             'cancel_session_checked', 'move_session_checked', 'uncancel_session_checked',
                                             'cancel_sessions_checked_bulk', 'set_change_approval_settings', 'grant_admin_role')),
  params        jsonb NOT NULL,
  target_keys   text[] NOT NULL,
  batch         boolean NOT NULL,
  impact        jsonb NOT NULL,
  reasons       text[] NOT NULL,
  preview       jsonb NOT NULL,
  fingerprints  text[] NOT NULL CHECK (cardinality(fingerprints) >= 1),
  expires_at    timestamptz NOT NULL,
  CONSTRAINT change_approval_requests_size CHECK (pg_column_size(params) + pg_column_size(preview) < 1048576)
);
CREATE INDEX IF NOT EXISTS change_approval_requests_created_idx ON public.change_approval_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS change_approval_requests_targets_idx ON public.change_approval_requests USING gin (target_keys);

CREATE TABLE IF NOT EXISTS public.change_approval_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  request_id    uuid REFERENCES public.change_approval_requests(id) ON DELETE RESTRICT,
  txid          bigint NOT NULL DEFAULT txid_current(),
  actor_user_id uuid,
  kind          text NOT NULL CHECK (kind IN ('requested', 'approved', 'rejected', 'withdrawn', 'stale', 'applied',
                                              'released_alone', 'acknowledged', 'settings_changed')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT change_approval_events_request CHECK (kind = 'settings_changed' OR request_id IS NOT NULL),
  CONSTRAINT change_approval_events_payload_size CHECK (pg_column_size(payload) < 262144)
);
CREATE INDEX IF NOT EXISTS change_approval_events_request_idx ON public.change_approval_events (request_id, created_at);
CREATE INDEX IF NOT EXISTS change_approval_events_txid_idx    ON public.change_approval_events (txid);

-- The settings row: written only by the table owner (the definer functions).
CREATE OR REPLACE FUNCTION public._change_approval_settings_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF current_user::text IN ('anon', 'authenticated', 'service_role', 'authenticator')
     OR current_user <> (SELECT c.relowner::regrole::name FROM pg_class c WHERE c.oid = TG_RELID) THEN
    RAISE EXCEPTION 'the approval setting is changed only through set_change_approval_settings'
      USING ERRCODE = 'HC041';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

DO $trg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['change_approval_requests', 'change_approval_events'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_append_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW
                      EXECUTE FUNCTION public.session_cancel_audit_append_only()', t || '_append_only', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_no_truncate', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT
                      EXECUTE FUNCTION public.session_cancel_audit_append_only()', t || '_no_truncate', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_insert_guard', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW
                      EXECUTE FUNCTION public.session_cancel_audit_insert_guard()', t || '_insert_guard', t);
  END LOOP;
END $trg$;
DROP TRIGGER IF EXISTS change_approval_settings_write_guard ON public.change_approval_settings;
CREATE TRIGGER change_approval_settings_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.change_approval_settings
  FOR EACH ROW EXECUTE FUNCTION public._change_approval_settings_guard();
DROP TRIGGER IF EXISTS change_approval_settings_no_truncate ON public.change_approval_settings;
CREATE TRIGGER change_approval_settings_no_truncate BEFORE TRUNCATE ON public.change_approval_settings
  FOR EACH STATEMENT EXECUTE FUNCTION public.session_cancel_audit_append_only();

-- The one row, OFF. A row that is already there is left as it is.
INSERT INTO public.change_approval_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.change_approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_approval_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS change_approval_settings_admin_read ON public.change_approval_settings;
CREATE POLICY change_approval_settings_admin_read ON public.change_approval_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS change_approval_requests_admin_read ON public.change_approval_requests;
CREATE POLICY change_approval_requests_admin_read ON public.change_approval_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS change_approval_events_admin_read ON public.change_approval_events;
CREATE POLICY change_approval_events_admin_read ON public.change_approval_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.change_approval_settings, public.change_approval_requests, public.change_approval_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.change_approval_settings, public.change_approval_requests, public.change_approval_events TO authenticated;
GRANT ALL ON public.change_approval_settings, public.change_approval_requests, public.change_approval_events TO service_role;

-- ---------------------------------------------------------------- 2
-- Is approval on? Read in one place.

CREATE OR REPLACE FUNCTION public._change_approval_settings_row()
RETURNS public.change_approval_settings LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE st public.change_approval_settings;
BEGIN
  SELECT * INTO st FROM public.change_approval_settings WHERE id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'The approval settings row is missing. Nothing was changed. Repair in the SQL editor: '
            || 'INSERT INTO public.change_approval_settings (id) VALUES (true);  (it comes back switched off)';
  END IF;
  RETURN st;
END $fn$;

-- Installed = this file's trigger on D2's override table exists (rollback 6
-- drops it: approvals then read as off).
CREATE OR REPLACE FUNCTION public._change_approval_installed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM pg_trigger t
                  WHERE t.tgrelid = to_regclass('public.session_cancel_overrides')
                    AND t.tgname = 'zz_session_override_approval')
$fn$;

CREATE OR REPLACE FUNCTION public._change_approval_on()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  st public.change_approval_settings;
  v_bad text;
BEGIN
  IF NOT public._change_approval_installed() THEN
    RETURN false;
  END IF;
  st := public._change_approval_settings_row();
  IF NOT st.enabled THEN
    RETURN false;
  END IF;
  -- switched on: every approval trigger must be there and enabled
  SELECT string_agg(x.tbl || '.' || x.trg, ', ') INTO v_bad
    FROM (VALUES ('session_cancel_overrides', 'zz_session_override_approval'), ('user_roles', 'zz_admin_grant_guard'),
                 ('payroll_adjustments', 'zz_pay_adjustment_approval')) AS x(tbl, trg)
   WHERE NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = to_regclass('public.' || x.tbl)
                        AND t.tgname = x.trg AND t.tgenabled = 'O');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'Approval is switched on but these triggers are missing or disabled: ' || v_bad || '. Nothing was changed.';
  END IF;
  RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION public._approval_admins()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(array_agg(DISTINCT ur.user_id ORDER BY ur.user_id), ARRAY[]::uuid[])
    FROM public.user_roles ur WHERE ur.role = 'admin'::public.app_role
$fn$;

-- ---------------------------------------------------------------- 3
-- The rule (replaces 1b's stub). Reads only the impact (counts and stored
-- figures from the preview), the setting and the override tables; prices
-- nothing.

CREATE OR REPLACE FUNCTION public.change_approval_needed(p_impact jsonb, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  st public.change_approval_settings;
  v_imp jsonb := CASE WHEN jsonb_typeof(p_impact) = 'object' THEN p_impact ELSE '{}'::jsonb END;
  v_tier int;
  v_fam numeric;
  v_paid numeric;
  v_wfam numeric := 0;
  v_wpaid numeric := 0;
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  IF NOT public._change_approval_on() THEN
    RETURN '{"required": false, "reasons": []}'::jsonb;
  END IF;
  st := public._change_approval_settings_row();
  BEGIN
    v_tier := COALESCE((v_imp ->> 'tier')::int, 3);              -- an impact without a tier is judged as T3
    v_fam  := COALESCE((v_imp ->> 'families')::numeric, 0);
    v_paid := COALESCE((v_imp ->> 'paid_vnd')::numeric, 0);
  EXCEPTION WHEN OTHERS THEN
    RETURN '{"required": true, "reasons": ["unknown"]}'::jsonb;
  END;
  IF v_tier NOT BETWEEN 0 AND 3 THEN v_tier := 3; END IF;

  -- R-12: the same person's applied T2+ changes of the last 24 hours (this
  -- transaction's included: the batch), from both override tables. A change
  -- applied under an approval is not counted again (known by the approval
  -- event's txid, never by anything the caller wrote).
  IF p_actor IS NOT NULL THEN
    SELECT COALESCE(sum(fam), 0), COALESCE(sum(paid), 0) INTO v_wfam, v_wpaid FROM (
      SELECT COALESCE((o.impact ->> 'families')::numeric, 0) AS fam, COALESCE((o.impact ->> 'paid_vnd')::numeric, 0) AS paid
        FROM public.money_change_overrides o
       WHERE o.actor_user_id = p_actor AND o.tier >= 2 AND o.created_at >= now() - interval '24 hours'
         AND NOT EXISTS (SELECT 1 FROM public.change_approval_events e
                          WHERE e.txid = o.txid AND e.kind IN ('approved', 'released_alone'))
      UNION ALL
      SELECT (SELECT count(DISTINCT COALESCE(st2.family_id::text, 'student:' || (i ->> 'student_id')))
                FROM jsonb_array_elements(COALESCE(o.invoices_before, '[]'::jsonb)) i
                LEFT JOIN public.students st2 ON st2.id::text = i ->> 'student_id'
               WHERE COALESCE((i ->> 'recorded_payment')::numeric, 0) > 0
                  OR i ->> 'status' IN ('paid', 'partial')
                  OR i ->> 'confirmation_status' IN ('confirmed', 'adjusted')
                  OR COALESCE((i ->> 'tuition_frozen')::boolean, false)),
             (SELECT COALESCE(sum(COALESCE((i ->> 'recorded_payment')::numeric, 0)), 0)
                FROM jsonb_array_elements(COALESCE(o.invoices_before, '[]'::jsonb)) i)
        FROM public.session_cancel_overrides o
       WHERE o.actor_user_id = p_actor AND o.tier >= 2 AND o.created_at >= now() - interval '24 hours'
         AND NOT EXISTS (SELECT 1 FROM public.change_approval_events e
                          WHERE e.txid = o.txid AND e.kind IN ('approved', 'released_alone'))) w;
  END IF;

  IF st.on_tier3 AND v_tier = 3 THEN v_reasons := v_reasons || 'tier3'::text; END IF;
  IF st.on_closed_payroll AND COALESCE((v_imp ->> 'closed_payroll')::boolean, false) THEN
    v_reasons := v_reasons || 'closed_payroll'::text;
  END IF;
  IF v_tier >= 2 AND v_fam + v_wfam >= st.min_families THEN v_reasons := v_reasons || 'families'::text; END IF;
  IF v_tier >= 2 AND v_paid + v_wpaid >= st.min_paid_vnd THEN v_reasons := v_reasons || 'paid'::text; END IF;
  IF st.on_unfreeze AND COALESCE((v_imp ->> 'unfreeze')::boolean, false) THEN v_reasons := v_reasons || 'unfreeze'::text; END IF;
  IF st.on_pay_adjustment AND COALESCE((v_imp ->> 'pay_adjustment')::boolean, false) THEN
    v_reasons := v_reasons || 'pay_adjustment'::text;
  END IF;
  IF COALESCE((v_imp ->> 'settings')::boolean, false) THEN v_reasons := v_reasons || 'settings'::text; END IF;

  RETURN jsonb_build_object(
    'required', cardinality(v_reasons) > 0,
    'reasons', to_jsonb(v_reasons),
    'totals', jsonb_build_object('families', v_fam + v_wfam, 'paid_vnd', v_paid + v_wpaid,
                                 'window_families', v_wfam, 'window_paid_vnd', v_wpaid),
    'thresholds', jsonb_build_object('families', st.min_families, 'paid_vnd', st.min_paid_vnd));
END $fn$;

-- The claim (replaces 1b's stub): the request named by hec.change_request_ok,
-- approved (or released by its requester) IN THIS TRANSACTION by the caller,
-- of this kind, whose stored fingerprints include this one. Anything else: NULL.
CREATE OR REPLACE FUNCTION public._change_request_claim(p_kind text, p_fingerprint text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v text := NULLIF(current_setting('hec.change_request_ok', true), '');
  v_id uuid;
BEGIN
  IF v IS NULL OR p_fingerprint IS NULL OR auth.uid() IS NULL
     OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  SELECT r.id INTO v_id FROM public.change_approval_requests r
   WHERE r.id = v::uuid AND r.kind = p_kind AND p_fingerprint = ANY (r.fingerprints)
     AND EXISTS (SELECT 1 FROM public.change_approval_events e
                  WHERE e.request_id = r.id AND e.txid = txid_current() AND e.actor_user_id = auth.uid()
                    AND e.kind IN ('approved', 'released_alone'));
  RETURN v_id;
END $fn$;

-- 1b's full plan with ONE change: the impact handed to the approval rule
-- carries the plan's own tier (step 2's and some 3B plans' impact has none,
-- and the tier3 line needs it). Token, fingerprint and everything else are 1b's.
CREATE OR REPLACE FUNCTION public._money_change_full_plan(p_entity text, p_op text, p_args jsonb, p_uid uuid, p_via text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v jsonb;
  v_tier int;
  v_args jsonb := COALESCE(p_args, '{}'::jsonb);
  v_approval jsonb;
BEGIN
  v := public._money_change_plan(p_entity, p_op, v_args, p_uid);
  IF v ->> 'refuse_code' IN ('bad_args', 'bad_op', 'bad_entity') AND v ->> 'entity' IS NULL THEN
    RETURN jsonb_build_object('entity', p_entity, 'op', p_op, 'allowed', false, 'refuse_code', v ->> 'refuse_code');
  END IF;
  v_tier := (v ->> 'tier')::int;
  IF v_tier IS NULL OR v_tier NOT BETWEEN 0 AND 3 THEN v_tier := 3; END IF;
  v_approval := COALESCE(public.change_approval_needed(
                  CASE WHEN jsonb_typeof(v -> 'impact') = 'object' THEN v -> 'impact' ELSE '{}'::jsonb END
                    || jsonb_build_object('tier', v_tier), p_uid),
                '{"required": true, "reasons": ["unknown"]}'::jsonb);
  RETURN v || jsonb_build_object(
    'tier', v_tier,
    'allowed', v ->> 'refuse_code' IS NULL,
    'requires', jsonb_build_object('reason_min', 15, 'reason', v_tier >= 1, 'confirm', v_tier >= 1,
                                   'correction_reason', v_tier = 3),
    'approval', v_approval,
    'review_required', v_tier = 3 OR (v_tier = 2 AND p_via = 'bulk')
                       OR COALESCE((v -> 'impact' ->> 'closed_payroll')::boolean, false),
    'token', encode(sha256(convert_to(jsonb_build_array(1, p_entity, p_op, v_args, p_uid, v_tier,
                                                        md5(COALESCE(v -> 'row_before', 'null'::jsonb)::text),
                                                        v -> 'reach' ->> 'fp')::text, 'UTF8')), 'hex'),
    'fingerprint', encode(sha256(convert_to(jsonb_build_array(1, p_entity, p_op, v_args, v_tier,
                                                              md5(COALESCE(v -> 'row_before', 'null'::jsonb)::text),
                                                              v -> 'reach' ->> 'fp')::text, 'UTF8')), 'hex'));
END $fn$;

-- ---------------------------------------------------------------- 4
-- Fingerprints of the three kinds that are not plans.

CREATE OR REPLACE FUNCTION public._approval_grant_fp(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT encode(sha256(convert_to(jsonb_build_array('grant_admin', p_user,
           EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_user AND ur.role = 'admin'::public.app_role))::text,
         'UTF8')), 'hex')
$fn$;

-- A carried pay correction, with what was already carried for the same person
-- and month (so a carry made meanwhile makes the request stale).
CREATE OR REPLACE FUNCTION public._approval_pay_fp(p_month text, p_origin text, p_teacher uuid, p_assistant uuid,
                                                   p_amount integer, p_reason text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT encode(sha256(convert_to(jsonb_build_array('pay_adjustment', p_month, p_origin, p_teacher, p_assistant, p_amount, p_reason,
           (SELECT jsonb_build_array(count(*), COALESCE(sum(a.amount_vnd), 0)) FROM public.payroll_adjustments a
             WHERE a.origin_month = p_origin
               AND ((p_teacher IS NOT NULL AND a.teacher_id = p_teacher) OR (p_assistant IS NOT NULL AND a.assistant_id = p_assistant))))::text,
         'UTF8')), 'hex')
$fn$;

CREATE OR REPLACE FUNCTION public._approval_settings_fp(p_cur jsonb, p_new jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT encode(sha256(convert_to(jsonb_build_array('settings', p_cur, p_new)::text, 'UTF8')), 'hex')
$fn$;

-- The setting after a patch, validated (HC015 bad_setting otherwise).
CREATE OR REPLACE FUNCTION public._approval_settings_patched(p_cur jsonb, p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  k text;
  v jsonb;
  v_new jsonb := p_cur - 'updated_at' - 'updated_by' - 'id';
BEGIN
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'bad_setting' USING ERRCODE = 'HC015', DETAIL = 'Nothing to change.';
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p_patch) LOOP
    IF k IN ('enabled', 'on_tier3', 'on_closed_payroll', 'on_unfreeze', 'on_pay_adjustment') THEN
      IF jsonb_typeof(v) <> 'boolean' THEN RAISE EXCEPTION 'bad_setting' USING ERRCODE = 'HC015', DETAIL = k; END IF;
    ELSIF k IN ('min_families', 'min_paid_vnd', 'expiry_hours') THEN
      IF jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
         OR (k = 'min_families' AND (v #>> '{}')::numeric NOT BETWEEN 1 AND 1000)
         OR (k = 'min_paid_vnd' AND (v #>> '{}')::numeric NOT BETWEEN 0 AND 1000000000000)
         OR (k = 'expiry_hours' AND (v #>> '{}')::numeric NOT BETWEEN 1 AND 720) THEN
        RAISE EXCEPTION 'bad_setting' USING ERRCODE = 'HC015', DETAIL = k;
      END IF;
    ELSIF k = 'solo_release_after_hours' THEN
      IF NOT (jsonb_typeof(v) = 'null' OR (jsonb_typeof(v) = 'number' AND (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
                                           AND (v #>> '{}')::numeric BETWEEN 1 AND 720)) THEN
        RAISE EXCEPTION 'bad_setting' USING ERRCODE = 'HC015', DETAIL = k;
      END IF;
    ELSE
      RAISE EXCEPTION 'bad_setting' USING ERRCODE = 'HC015', DETAIL = 'unknown: ' || k;
    END IF;
    v_new := v_new || jsonb_build_object(k, v);
  END LOOP;
  RETURN v_new;
END $fn$;

-- Does the new setting ask a second administrator less often than the old?
CREATE OR REPLACE FUNCTION public._approval_settings_loosens(p_cur jsonb, p_new jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT (p_cur ->> 'enabled')::boolean AND NOT (p_new ->> 'enabled')::boolean
      OR (p_cur ->> 'on_tier3')::boolean AND NOT (p_new ->> 'on_tier3')::boolean
      OR (p_cur ->> 'on_closed_payroll')::boolean AND NOT (p_new ->> 'on_closed_payroll')::boolean
      OR (p_cur ->> 'on_unfreeze')::boolean AND NOT (p_new ->> 'on_unfreeze')::boolean
      OR (p_cur ->> 'on_pay_adjustment')::boolean AND NOT (p_new ->> 'on_pay_adjustment')::boolean
      OR (p_new ->> 'min_families')::numeric > (p_cur ->> 'min_families')::numeric
      OR (p_new ->> 'min_paid_vnd')::numeric > (p_cur ->> 'min_paid_vnd')::numeric
      OR (p_new ->> 'expiry_hours')::numeric > (p_cur ->> 'expiry_hours')::numeric
      OR (p_new ->> 'solo_release_after_hours' IS NOT NULL
          AND (p_cur ->> 'solo_release_after_hours' IS NULL
               OR (p_new ->> 'solo_release_after_hours')::numeric < (p_cur ->> 'solo_release_after_hours')::numeric))
$fn$;

-- ---------------------------------------------------------------- 5
-- The plan of a request: what the checked function would do, recomputed as
-- p_uid, item by item, with each item's target, fingerprint, token, tier and
-- impact; the impact of the whole (R-12: one impact for a batch) and whether
-- it needs approval. p_lock takes the locks the checked function takes;
-- p_strict (asking) checks the requester's reason, token, confirmation and
-- correction reason exactly as the checked function would.

-- The checked money apply's locks (1b _money_change_apply), in its order.
CREATE OR REPLACE FUNCTION public._approval_lock_money(p_entity text, p_op text, p_args jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_args jsonb := COALESCE(p_args, '{}'::jsonb);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('money:' || COALESCE(p_entity, '') || ':' ||
            COALESCE(v_args ->> 'session_id', v_args ->> 'student_id', v_args ->> 'target_id', ''), 0));
  IF p_entity = 'attendance' THEN
    IF p_op = 'set_marks' AND (v_args ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      PERFORM 1 FROM public.sessions WHERE id = (v_args ->> 'session_id')::uuid FOR UPDATE;
    ELSIF p_op = 'repair' AND (v_args ->> 'class_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      PERFORM 1 FROM public.sessions
       WHERE class_id = (v_args ->> 'class_id')::uuid
         AND date BETWEEN COALESCE(NULLIF(v_args ->> 'from', '')::date, '-infinity'::date)
                      AND COALESCE(NULLIF(v_args ->> 'to', '')::date, 'infinity'::date)
       ORDER BY id FOR UPDATE;
    END IF;
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public._approval_plan(p_kind text, p_rpc text, p_params jsonb, p_uid uuid,
                                                 p_lock boolean, p_strict boolean, p_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_p jsonb := CASE WHEN jsonb_typeof(p_params) = 'object' THEN p_params ELSE NULL END;
  v_ctx jsonb;
  v_norm jsonb;
  v_items jsonb := '[]'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_batch boolean := false;
  it jsonb;
  v jsonb;
  s public.sessions;
  v_tier int;
  v_fp text;
  v_chg jsonb;
  v_action text;
  v_via text;
  v_reason text;
  v_imp jsonb;
  v_approval jsonb;
  st public.change_approval_settings;
  v_new jsonb;
  v_loose boolean;
  v_user uuid;
  v_seen text[] := ARRAY[]::text[];
  v_subject text;
BEGIN
  IF v_p IS NULL THEN
    RAISE EXCEPTION 'bad_params' USING ERRCODE = 'HC015';
  END IF;
  IF NOT ((p_kind = 'money' AND p_rpc IN ('money_change_checked', 'money_changes_checked_bulk', 'carry_payroll_adjustments'))
       OR (p_kind = 'session' AND p_rpc IN ('cancel_session_checked', 'move_session_checked', 'uncancel_session_checked',
                                            'cancel_sessions_checked_bulk'))
       OR (p_kind = 'settings' AND p_rpc IN ('set_change_approval_settings', 'grant_admin_role'))) THEN
    RAISE EXCEPTION 'bad_rpc' USING ERRCODE = 'HC015';
  END IF;
  v_ctx := CASE WHEN jsonb_typeof(v_p -> 'context') = 'object' THEN v_p -> 'context' ELSE '{}'::jsonb END;

  -- ---- normalise: only the arguments the checked function takes are kept
  IF p_rpc = 'money_change_checked' THEN
    v_norm := jsonb_build_object('entity', v_p ->> 'entity', 'op', v_p ->> 'op',
                'args', CASE WHEN jsonb_typeof(v_p -> 'args') = 'object' THEN v_p -> 'args' ELSE '{}'::jsonb END,
                'reason', v_p ->> 'reason', 'confirm', COALESCE((v_p ->> 'confirm')::boolean, false),
                'correction_reason', v_p ->> 'correction_reason', 'context', v_ctx);
    v_items := jsonb_build_array(v_norm || jsonb_build_object('token', p_token, 'own_reason', true));
  ELSIF p_rpc = 'money_changes_checked_bulk' THEN
    v_batch := true;
    IF jsonb_typeof(v_p -> 'items') IS DISTINCT FROM 'array' OR jsonb_array_length(v_p -> 'items') NOT BETWEEN 1 AND 200
       OR COALESCE(v_p ->> 'batch_id', '') !~* c_uuid THEN
      RAISE EXCEPTION 'bad_items' USING ERRCODE = 'HC015';
    END IF;
    SELECT jsonb_agg(jsonb_build_object('entity', x ->> 'entity', 'op', x ->> 'op',
             'args', CASE WHEN jsonb_typeof(x -> 'args') = 'object' THEN x -> 'args' ELSE '{}'::jsonb END,
             'reason', NULLIF(x ->> 'reason', ''), 'token', x ->> 'token', 'confirm', COALESCE((x ->> 'confirm')::boolean, false),
             'correction_reason', x ->> 'correction_reason') ORDER BY n)
      INTO v_items FROM jsonb_array_elements(v_p -> 'items') WITH ORDINALITY AS e(x, n);
    v_norm := jsonb_build_object('items', v_items, 'reason', v_p ->> 'reason', 'batch_id', v_p ->> 'batch_id', 'context', v_ctx);
    SELECT jsonb_agg(x || jsonb_build_object('reason', COALESCE(x ->> 'reason', v_p ->> 'reason'),
                                             'own_reason', x ->> 'reason' IS NOT NULL) ORDER BY n)
      INTO v_items FROM jsonb_array_elements(v_items) WITH ORDINALITY AS e(x, n);
  ELSIF p_rpc IN ('cancel_session_checked', 'move_session_checked', 'uncancel_session_checked') THEN
    IF COALESCE(v_p ->> 'session_id', '') !~* c_uuid THEN
      RAISE EXCEPTION 'a session id is required' USING ERRCODE = '22004';
    END IF;
    v_action := CASE p_rpc WHEN 'move_session_checked' THEN 'move' WHEN 'uncancel_session_checked' THEN 'uncancel'
                           ELSE v_p ->> 'action' END;
    IF p_rpc = 'cancel_session_checked' AND v_action IS DISTINCT FROM 'cancel' AND v_action IS DISTINCT FROM 'delete' THEN
      RAISE EXCEPTION 'bad_action' USING ERRCODE = 'HC015';
    END IF;
    v_norm := jsonb_build_object('session_id', v_p ->> 'session_id', 'action', v_action,
                'reason', v_p ->> 'reason', 'confirm', COALESCE((v_p ->> 'confirm')::boolean, false),
                'correction_reason', v_p ->> 'correction_reason', 'context', v_ctx);
    IF v_action = 'move' THEN
      v_norm := v_norm || jsonb_build_object('new_date', v_p ->> 'new_date', 'new_start', v_p ->> 'new_start', 'new_end', v_p ->> 'new_end');
    END IF;
    v_items := jsonb_build_array(jsonb_build_object('id', v_p ->> 'session_id', 'action', v_action, 'token', p_token,
                 'reason', v_p ->> 'reason', 'confirm', COALESCE((v_p ->> 'confirm')::boolean, false),
                 'correction_reason', v_p ->> 'correction_reason', 'own_reason', true,
                 'change', CASE WHEN v_action = 'move' THEN jsonb_build_object('date', v_p ->> 'new_date',
                                  'start_time', v_p ->> 'new_start', 'end_time', v_p ->> 'new_end') END));
  ELSIF p_rpc = 'cancel_sessions_checked_bulk' THEN
    v_batch := true;
    IF jsonb_typeof(v_p -> 'items') IS DISTINCT FROM 'array' OR jsonb_array_length(v_p -> 'items') NOT BETWEEN 1 AND 200
       OR COALESCE(v_p ->> 'batch_id', '') !~* c_uuid
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_p -> 'items') x WHERE COALESCE(x ->> 'id', '') !~* c_uuid) THEN
      RAISE EXCEPTION 'bad_items' USING ERRCODE = 'HC015';
    END IF;
    -- ascending id, the bulk RPC's own lock order
    SELECT jsonb_agg(jsonb_build_object('id', x ->> 'id', 'token', x ->> 'token', 'reason', NULLIF(x ->> 'reason', ''),
             'confirm', COALESCE((x ->> 'confirm')::boolean, false), 'correction_reason', x ->> 'correction_reason')
             ORDER BY x ->> 'id' COLLATE "C")
      INTO v_items FROM jsonb_array_elements(v_p -> 'items') x;
    v_norm := jsonb_build_object('items', v_items, 'reason', v_p ->> 'reason', 'batch_id', v_p ->> 'batch_id', 'context', v_ctx);
    SELECT jsonb_agg(x || jsonb_build_object('action', 'cancel', 'reason', COALESCE(x ->> 'reason', v_p ->> 'reason'),
                                             'own_reason', x ->> 'reason' IS NOT NULL) ORDER BY n)
      INTO v_items FROM jsonb_array_elements(v_items) WITH ORDINALITY AS e(x, n);
  ELSIF p_rpc = 'set_change_approval_settings' THEN
    v_norm := jsonb_build_object('patch', v_p -> 'patch', 'reason', v_p ->> 'reason');
  ELSIF p_rpc = 'grant_admin_role' THEN
    IF COALESCE(v_p ->> 'user_id', '') !~* c_uuid THEN
      RAISE EXCEPTION 'bad_user' USING ERRCODE = 'HC015';
    END IF;
    v_norm := jsonb_build_object('user_id', v_p ->> 'user_id', 'reason', v_p ->> 'reason');
  ELSIF p_rpc = 'carry_payroll_adjustments' THEN
    IF jsonb_typeof(v_p -> 'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(v_p -> 'rows') NOT BETWEEN 1 AND 200 THEN
      RAISE EXCEPTION 'bad_rows' USING ERRCODE = 'HC015';
    END IF;
    v_items := '[]'::jsonb;
    FOR it IN SELECT x FROM jsonb_array_elements(v_p -> 'rows') x LOOP
      IF COALESCE(it ->> 'month', '') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR COALESCE(it ->> 'origin_month', '') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
         OR it ->> 'month' = it ->> 'origin_month'
         OR ((it ->> 'teacher_id') IS NOT NULL) = ((it ->> 'assistant_id') IS NOT NULL)
         OR COALESCE(it ->> 'teacher_id', it ->> 'assistant_id') !~* c_uuid
         OR jsonb_typeof(it -> 'amount_vnd') IS DISTINCT FROM 'number'
         OR (it ->> 'amount_vnd')::numeric <> trunc((it ->> 'amount_vnd')::numeric) OR (it ->> 'amount_vnd')::numeric = 0
         OR abs((it ->> 'amount_vnd')::numeric) > 2000000000
         OR length(btrim(COALESCE(it ->> 'reason', ''))) NOT BETWEEN 3 AND 1000 THEN
        RAISE EXCEPTION 'bad_rows' USING ERRCODE = 'HC015';
      END IF;
      v_subject := (it ->> 'origin_month') || ':' || COALESCE('t:' || (it ->> 'teacher_id'), 'a:' || (it ->> 'assistant_id'));
      IF v_subject = ANY (v_seen) THEN
        RAISE EXCEPTION 'duplicate_row' USING ERRCODE = 'HC015', DETAIL = 'One correction per person and month.';
      END IF;
      v_seen := v_seen || v_subject;
      v_items := v_items || jsonb_build_array(jsonb_build_object('month', it ->> 'month', 'origin_month', it ->> 'origin_month',
                   'teacher_id', it ->> 'teacher_id', 'assistant_id', it ->> 'assistant_id',
                   'amount_vnd', (it ->> 'amount_vnd')::integer, 'reason', btrim(it ->> 'reason')));
    END LOOP;
    v_norm := jsonb_build_object('rows', v_items);
  END IF;

  -- ---- per item
  IF p_kind = 'money' AND p_rpc <> 'carry_payroll_adjustments' THEN
    v_via := CASE WHEN v_batch THEN 'bulk' ELSE 'single' END;
    FOR it IN SELECT x FROM jsonb_array_elements(v_items) x LOOP
      IF p_lock THEN
        PERFORM public._approval_lock_money(it ->> 'entity', it ->> 'op', it -> 'args');
      END IF;
      v := public._money_change_full_plan(it ->> 'entity', it ->> 'op', it -> 'args', p_uid, v_via);
      v_tier := COALESCE((v ->> 'tier')::int, 3);
      IF p_strict THEN
        IF v ->> 'refuse_code' IS NOT NULL THEN
          RAISE EXCEPTION '%', v ->> 'refuse_code' USING ERRCODE = 'HC015';
        END IF;
        v_reason := NULL;
        IF it ->> 'reason' IS NOT NULL THEN v_reason := public.session_change_reason_ok(it ->> 'reason'); END IF;
        IF v_tier >= 1 AND v_reason IS NULL THEN
          RAISE EXCEPTION 'reason_too_short' USING ERRCODE = 'HC010';
        END IF;
        IF (v_tier >= 1 OR it ->> 'token' IS NOT NULL) AND (it ->> 'token') IS DISTINCT FROM v ->> 'token' THEN
          RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011';
        END IF;
        IF v_tier >= 1 AND NOT COALESCE((it ->> 'confirm')::boolean, false) THEN
          RAISE EXCEPTION 'confirm_required' USING ERRCODE = 'HC012';
        END IF;
        IF v_tier = 3 THEN
          BEGIN
            PERFORM public.session_change_reason_ok(it ->> 'correction_reason');
          EXCEPTION WHEN SQLSTATE 'HC010' THEN
            RAISE EXCEPTION 'correction_reason_required' USING ERRCODE = 'HC013';
          END;
        END IF;
        IF v_batch AND v_tier >= 2 AND NOT COALESCE((it ->> 'own_reason')::boolean, false) THEN
          RAISE EXCEPTION 'own_reason_required' USING ERRCODE = 'HC017';
        END IF;
      END IF;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'target_key', COALESCE(it ->> 'entity', '?') || ':' || COALESCE(v ->> 'target_id', md5((it -> 'args')::text)),
        'fingerprint', CASE WHEN v ->> 'refuse_code' IS NULL THEN v ->> 'fingerprint' ELSE 'refused:' || (v ->> 'refuse_code') END,
        'token', v ->> 'token', 'tier', v_tier,
        'impact', CASE WHEN jsonb_typeof(v -> 'impact') = 'object' THEN v -> 'impact' ELSE '{}'::jsonb END
                  || jsonb_build_object('tier', v_tier),
        'plan', jsonb_build_object('entity', v ->> 'entity', 'op', v ->> 'op', 'target_id', v ->> 'target_id', 'tier', v_tier,
                  'refuse_code', v ->> 'refuse_code', 'student_ids', v -> 'student_ids', 'change', v -> 'change',
                  'reach_from', v ->> 'reach_from', 'reach_to', v ->> 'reach_to', 'refresh_pairs', v -> 'refresh_pairs',
                  'impact', v -> 'impact', 'review_required', v -> 'review_required')));
    END LOOP;
  ELSIF p_kind = 'session' THEN
    FOR it IN SELECT x FROM jsonb_array_elements(v_items) x LOOP
      IF p_lock THEN
        SELECT * INTO s FROM public.sessions WHERE id = (it ->> 'id')::uuid FOR UPDATE;
      ELSE
        SELECT * INTO s FROM public.sessions WHERE id = (it ->> 'id')::uuid;
      END IF;
      IF NOT FOUND THEN
        IF p_strict THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
        v_out := v_out || jsonb_build_array(jsonb_build_object('target_key', 'session:' || (it ->> 'id'),
                   'fingerprint', 'refused:not_found', 'token', NULL, 'tier', 3, 'impact', '{"tier": 3}'::jsonb, 'plan', NULL));
        CONTINUE;
      END IF;
      v := public._session_change_assess(s, it ->> 'action',
             CASE WHEN jsonb_typeof(it -> 'change') = 'object' THEN it -> 'change' END, p_uid);
      v_tier := COALESCE((v ->> 'tier')::int, 3);
      IF p_strict THEN
        PERFORM public.session_change_reason_ok(it ->> 'reason');
        IF v ->> 'refuse_code' IN ('already_canceled', 'not_canceled', 'bad_change', 'bad_action') THEN
          RAISE EXCEPTION '%', v ->> 'refuse_code' USING ERRCODE = 'HC015';
        END IF;
        IF (it ->> 'token') IS DISTINCT FROM v ->> 'token' THEN
          RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011';
        END IF;
        IF v_tier >= 1 AND it ->> 'action' <> 'uncancel' AND NOT COALESCE((it ->> 'confirm')::boolean, false) THEN
          RAISE EXCEPTION 'confirm_required' USING ERRCODE = 'HC012';
        END IF;
        IF v_tier = 3 THEN
          BEGIN
            PERFORM public.session_change_reason_ok(it ->> 'correction_reason');
          EXCEPTION WHEN SQLSTATE 'HC010' THEN
            RAISE EXCEPTION 'correction_reason_required' USING ERRCODE = 'HC013';
          END;
        END IF;
        IF v ->> 'refuse_code' = 'use_cancel' THEN
          RAISE EXCEPTION 'use_cancel' USING ERRCODE = 'HC014';
        END IF;
        IF v_batch AND v_tier >= 2 AND NOT COALESCE((it ->> 'own_reason')::boolean, false) THEN
          RAISE EXCEPTION 'own_reason_required' USING ERRCODE = 'HC017';
        END IF;
      END IF;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'target_key', 'session:' || s.id::text,
        'fingerprint', CASE WHEN v ->> 'refuse_code' IS NULL THEN v ->> 'fingerprint' ELSE 'refused:' || (v ->> 'refuse_code') END,
        'token', v ->> 'token', 'tier', v_tier,
        'impact', CASE WHEN jsonb_typeof(v -> 'impact') = 'object' THEN v -> 'impact' ELSE '{}'::jsonb END
                  || jsonb_build_object('tier', v_tier),
        'plan', jsonb_build_object('session_id', s.id, 'action', it ->> 'action', 'session', v -> 'session', 'tier', v_tier,
                  'level', v ->> 'level', 'refuse_code', v ->> 'refuse_code', 'change', v -> 'change',
                  'affected', v -> 'affected', 'refresh_pairs', v -> 'refresh_pairs', 'impact', v -> 'impact')));
    END LOOP;
  ELSIF p_rpc = 'set_change_approval_settings' THEN
    st := public._change_approval_settings_row();
    v_new := public._approval_settings_patched(to_jsonb(st), v_norm -> 'patch');
    v_loose := public._approval_settings_loosens(to_jsonb(st), v_new);
    IF p_strict THEN PERFORM public.session_change_reason_ok(v_norm ->> 'reason'); END IF;
    v_fp := public._approval_settings_fp(to_jsonb(st), v_new);
    v_out := jsonb_build_array(jsonb_build_object('target_key', 'settings:approval', 'fingerprint', v_fp, 'token', v_fp,
               'tier', 0, 'impact', jsonb_build_object('settings', v_loose, 'tier', 0),
               'plan', jsonb_build_object('before', to_jsonb(st) - 'id', 'after', v_new, 'loosens', v_loose)));
  ELSIF p_rpc = 'grant_admin_role' THEN
    v_user := (v_norm ->> 'user_id')::uuid;
    IF p_strict THEN
      PERFORM public.session_change_reason_ok(v_norm ->> 'reason');
      IF public.has_role(v_user, 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'already_admin' USING ERRCODE = 'HC015';
      END IF;
    END IF;
    v_fp := public._approval_grant_fp(v_user);
    v_out := jsonb_build_array(jsonb_build_object('target_key', 'settings:grant_admin:' || v_user::text, 'fingerprint', v_fp,
               'token', v_fp, 'tier', 0, 'impact', jsonb_build_object('settings', true, 'tier', 0),
               'plan', jsonb_build_object('user_id', v_user)));
  ELSE  -- carry_payroll_adjustments
    FOR it IN SELECT x FROM jsonb_array_elements(v_items) x LOOP
      v_fp := public._approval_pay_fp(it ->> 'month', it ->> 'origin_month', (it ->> 'teacher_id')::uuid,
                                      (it ->> 'assistant_id')::uuid, (it ->> 'amount_vnd')::integer, it ->> 'reason');
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'target_key', 'pay_adjustment:' || (it ->> 'origin_month') || ':' || COALESCE(it ->> 'teacher_id', it ->> 'assistant_id'),
        'fingerprint', v_fp, 'token', v_fp, 'tier', 0,
        'impact', jsonb_build_object('pay_adjustment', true, 'tier', 0), 'plan', it));
    END LOOP;
  END IF;

  -- ---- the whole (R-12), and the rule
  SELECT jsonb_build_object(
           'tier', COALESCE(max((x -> 'impact' ->> 'tier')::int), 0),
           'closed_payroll', COALESCE(bool_or(COALESCE((x -> 'impact' ->> 'closed_payroll')::boolean, false)), false),
           'families', COALESCE(sum(COALESCE((x -> 'impact' ->> 'families')::numeric, 0)), 0),
           'paid_vnd', COALESCE(sum(COALESCE((x -> 'impact' ->> 'paid_vnd')::numeric, 0)), 0),
           'unfreeze', COALESCE(bool_or(COALESCE((x -> 'impact' ->> 'unfreeze')::boolean, false)), false),
           'pay_adjustment', COALESCE(bool_or(COALESCE((x -> 'impact' ->> 'pay_adjustment')::boolean, false)), false),
           'settings', COALESCE(bool_or(COALESCE((x -> 'impact' ->> 'settings')::boolean, false)), false),
           'items', count(*))
    INTO v_imp FROM jsonb_array_elements(v_out) x;
  v_approval := COALESCE(public.change_approval_needed(v_imp, p_uid), '{"required": true, "reasons": ["unknown"]}'::jsonb);

  RETURN jsonb_build_object(
    'kind', p_kind, 'rpc', p_rpc, 'params', v_norm, 'batch', v_batch, 'items', v_out,
    'fingerprints', (SELECT jsonb_agg(x -> 'fingerprint' ORDER BY n) FROM jsonb_array_elements(v_out) WITH ORDINALITY AS e(x, n)),
    'tokens', (SELECT jsonb_agg(x -> 'token' ORDER BY n) FROM jsonb_array_elements(v_out) WITH ORDINALITY AS e(x, n)),
    'target_keys', (SELECT jsonb_agg(DISTINCT x ->> 'target_key') FROM jsonb_array_elements(v_out) x),
    'impact', v_imp, 'approval', v_approval);
END $fn$;

-- The approver's (or releaser's) token for a request: bound to the request,
-- the caller and the plan recomputed as them.
CREATE OR REPLACE FUNCTION public._approval_token(p_request uuid, p_uid uuid, p_plan jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT encode(sha256(convert_to(jsonb_build_array(1, p_request, p_uid, p_plan -> 'tokens', p_plan -> 'fingerprints')::text,
                                  'UTF8')), 'hex')
$fn$;

CREATE OR REPLACE FUNCTION public._approval_request_status(p_id uuid, p_expires timestamptz)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(
    (SELECT CASE WHEN e.kind IN ('approved', 'released_alone') THEN 'applied' ELSE e.kind END
       FROM public.change_approval_events e
      WHERE e.request_id = p_id AND e.kind IN ('applied', 'rejected', 'withdrawn', 'stale', 'approved', 'released_alone')
      ORDER BY CASE e.kind WHEN 'applied' THEN 0 ELSE 1 END, e.created_at DESC, e.id DESC LIMIT 1),
    CASE WHEN now() >= p_expires THEN 'expired' ELSE 'pending' END)
$fn$;

-- ---------------------------------------------------------------- 6
-- Writers that exist only to be run by an approval.

-- Giving someone the admin role while approval is on (A-18).
CREATE OR REPLACE FUNCTION public.grant_admin_role(p_user_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_req uuid;
BEGIN
  PERFORM public.session_change_reason_ok(p_reason);
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'bad_user' USING ERRCODE = 'HC015';
  END IF;
  IF NOT public._change_approval_on() THEN
    RAISE EXCEPTION 'approval_not_needed' USING ERRCODE = 'HC015',
      DETAIL = 'Approval is switched off: add the administrator from the staff screen.';
  END IF;
  v_req := public._change_request_claim('settings', public._approval_grant_fp(p_user_id));
  IF v_req IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=["settings"]';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  SELECT p_user_id, 'admin'::public.app_role
   WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'::public.app_role);
  RETURN jsonb_build_object('user_id', p_user_id, 'granted', true, 'request_id', v_req);
END $fn$;

-- Carrying a payroll correction forward under an approval (A-4). One INSERT
-- per row: the trigger judges each against its own fingerprint.
CREATE OR REPLACE FUNCTION public.carry_payroll_adjustments(p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  it jsonb;
  v_id uuid;
  v_ids jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'bad_rows' USING ERRCODE = 'HC015';
  END IF;
  FOR it IN SELECT x FROM jsonb_array_elements(p_rows) x LOOP
    INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, assistant_id, amount_vnd, reason, created_by)
    VALUES (it ->> 'month', it ->> 'origin_month', (it ->> 'teacher_id')::uuid, (it ->> 'assistant_id')::uuid,
            (it ->> 'amount_vnd')::integer, it ->> 'reason', v_uid)
    RETURNING id INTO v_id;
    v_ids := v_ids || to_jsonb(v_id);
  END LOOP;
  RETURN jsonb_build_object('adjustment_ids', v_ids);
END $fn$;

-- The setting. Tightening and switching on: at once (switching on needs two
-- administrators). Loosening or switching off while on: a second administrator.
CREATE OR REPLACE FUNCTION public.set_change_approval_settings(p_patch jsonb, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v_reason text := public.session_change_reason_ok(p_reason);
  st public.change_approval_settings;
  v_cur jsonb;
  v_new jsonb;
  v_loose boolean;
  v_req uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('approval-settings', 0));
  st := public._change_approval_settings_row();
  v_cur := to_jsonb(st);
  v_new := public._approval_settings_patched(v_cur, p_patch);
  v_loose := public._approval_settings_loosens(v_cur, v_new);
  IF (v_new ->> 'enabled')::boolean AND NOT st.enabled THEN
    IF NOT public._change_approval_installed() THEN
      RAISE EXCEPTION 'approval_setting_locked' USING ERRCODE = 'HC065', DETAIL = 'not_installed';
    END IF;
    IF cardinality(public._approval_admins()) < 2 THEN
      RAISE EXCEPTION 'approval_setting_locked' USING ERRCODE = 'HC065', DETAIL = 'two_admins';
    END IF;
  END IF;
  IF st.enabled AND public._change_approval_installed() AND v_loose THEN
    v_req := public._change_request_claim('settings', public._approval_settings_fp(v_cur, v_new));
    IF v_req IS NULL THEN
      RAISE EXCEPTION 'approval_setting_locked' USING ERRCODE = 'HC065', DETAIL = 'loosen';
    END IF;
  END IF;
  UPDATE public.change_approval_settings SET
    enabled = (v_new ->> 'enabled')::boolean,
    on_tier3 = (v_new ->> 'on_tier3')::boolean,
    on_closed_payroll = (v_new ->> 'on_closed_payroll')::boolean,
    on_unfreeze = (v_new ->> 'on_unfreeze')::boolean,
    on_pay_adjustment = (v_new ->> 'on_pay_adjustment')::boolean,
    min_families = (v_new ->> 'min_families')::integer,
    min_paid_vnd = (v_new ->> 'min_paid_vnd')::bigint,
    expiry_hours = (v_new ->> 'expiry_hours')::integer,
    solo_release_after_hours = (v_new ->> 'solo_release_after_hours')::integer,
    updated_at = now(), updated_by = v_uid
   WHERE id;
  INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
  VALUES (NULL, v_uid, 'settings_changed',
          jsonb_build_object('before', v_cur - 'id', 'after', v_new, 'loosens', v_loose, 'reason', v_reason, 'request_id', v_req));
  RETURN jsonb_build_object('settings', v_new, 'loosens', v_loose, 'request_id', v_req);
END $fn$;

-- ---------------------------------------------------------------- 7
-- Asking, deciding, withdrawing.

CREATE OR REPLACE FUNCTION public.request_change_approval(p_kind text, p_rpc text, p_params jsonb, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  v jsonb;
  st public.change_approval_settings;
  v_keys text[];
  k text;
  o public.change_approval_requests;
  v_id uuid;
  v_exp timestamptz;
BEGIN
  IF NOT public._change_approval_on() THEN
    RAISE EXCEPTION 'approval_not_needed' USING ERRCODE = 'HC015',
      DETAIL = 'Approval is switched off: make the change directly.';
  END IF;
  st := public._change_approval_settings_row();
  v := public._approval_plan(p_kind, p_rpc, p_params, v_uid, true, true, p_token);
  IF NOT COALESCE((v -> 'approval' ->> 'required')::boolean, true) THEN
    RAISE EXCEPTION 'approval_not_needed' USING ERRCODE = 'HC015',
      DETAIL = 'This change does not need a second administrator: make it directly.';
  END IF;
  SELECT array_agg(x ORDER BY x COLLATE "C") INTO v_keys FROM jsonb_array_elements_text(v -> 'target_keys') x;
  FOREACH k IN ARRAY v_keys LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('approval-target:' || k, 0));
  END LOOP;
  SELECT * INTO o FROM public.change_approval_requests r
   WHERE r.target_keys && v_keys AND public._approval_request_status(r.id, r.expires_at) = 'pending'
   ORDER BY r.created_at LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'approval_already_pending' USING ERRCODE = 'HC063',
      DETAIL = 'request_id=' || o.id::text || ';requested_by=' || o.requested_by::text;
  END IF;
  v_exp := now() + make_interval(hours => st.expiry_hours);
  INSERT INTO public.change_approval_requests (requested_by, kind, rpc, params, target_keys, batch, impact, reasons,
                                               preview, fingerprints, expires_at)
  VALUES (v_uid, p_kind, p_rpc, v -> 'params', v_keys, (v ->> 'batch')::boolean, v -> 'impact',
          ARRAY(SELECT jsonb_array_elements_text(v -> 'approval' -> 'reasons')),
          jsonb_build_object('items', (SELECT jsonb_agg((x - 'token') ORDER BY n) FROM jsonb_array_elements(v -> 'items') WITH ORDINALITY AS e(x, n)),
                             'approval', v -> 'approval'),
          ARRAY(SELECT jsonb_array_elements_text(v -> 'fingerprints')), v_exp)
  RETURNING id INTO v_id;
  INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
  VALUES (v_id, v_uid, 'requested', jsonb_build_object('reasons', v -> 'approval' -> 'reasons', 'totals', v -> 'approval' -> 'totals'));
  RETURN jsonb_build_object('request_id', v_id, 'status', 'pending', 'reasons', v -> 'approval' -> 'reasons',
                            'expires_at', v_exp, 'target_keys', to_jsonb(v_keys));
END $fn$;

-- Runs the stored change with the caller's fresh tokens. The flag
-- hec.change_request_ok is set by the caller (_approval_decide) around it.
CREATE OR REPLACE FUNCTION public._approval_execute(p_request public.change_approval_requests, p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  p jsonb := p_request.params;
  v_ctx jsonb;
  v_res jsonb;
  v_all jsonb := '[]'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_items jsonb;
  v_chunk jsonb;
  i int;
  n int;
BEGIN
  v_ctx := CASE WHEN jsonb_typeof(p -> 'context') = 'object' THEN p -> 'context' ELSE '{}'::jsonb END;
  v_ctx := v_ctx || jsonb_build_object('attached',
             CASE WHEN jsonb_typeof(v_ctx -> 'attached') = 'object' THEN v_ctx -> 'attached' ELSE '{}'::jsonb END
             || jsonb_build_object('approval_request_id', p_request.id, 'requested_by', p_request.requested_by));
  CASE p_request.rpc
    WHEN 'money_change_checked' THEN
      v_res := public.money_change_checked(p ->> 'entity', p ->> 'op', p -> 'args', p ->> 'reason', p_plan -> 'tokens' ->> 0,
                                           COALESCE((p ->> 'confirm')::boolean, false), p ->> 'correction_reason', v_ctx);
      v_ids := jsonb_build_array(v_res -> 'override_id');
    WHEN 'cancel_session_checked' THEN
      v_res := public.cancel_session_checked((p ->> 'session_id')::uuid, p ->> 'action', p ->> 'reason', p_plan -> 'tokens' ->> 0,
                                             COALESCE((p ->> 'confirm')::boolean, false), p ->> 'correction_reason', v_ctx);
      v_ids := jsonb_build_array(v_res -> 'override_id');
    WHEN 'move_session_checked' THEN
      v_res := public.move_session_checked((p ->> 'session_id')::uuid, (p ->> 'new_date')::date, (p ->> 'new_start')::time,
                                           (p ->> 'new_end')::time, p ->> 'reason', p_plan -> 'tokens' ->> 0,
                                           COALESCE((p ->> 'confirm')::boolean, false), p ->> 'correction_reason', v_ctx);
      v_ids := jsonb_build_array(v_res -> 'override_id');
    WHEN 'uncancel_session_checked' THEN
      v_res := public.uncancel_session_checked((p ->> 'session_id')::uuid, p ->> 'reason', p_plan -> 'tokens' ->> 0,
                                               v_ctx, p ->> 'correction_reason');
      v_ids := jsonb_build_array(v_res -> 'override_id');
    WHEN 'money_changes_checked_bulk', 'cancel_sessions_checked_bulk' THEN
      -- the stored items with the caller's tokens, 50 per call (the RPC's cap);
      -- every item must be done: an approved batch is applied whole or not at all
      SELECT jsonb_agg(x || jsonb_build_object('token', p_plan -> 'tokens' -> (ord - 1)::int) ORDER BY ord)
        INTO v_items FROM jsonb_array_elements(p -> 'items') WITH ORDINALITY AS e(x, ord);
      n := jsonb_array_length(v_items);
      i := 0;
      WHILE i < n LOOP
        SELECT jsonb_agg(x ORDER BY ord) INTO v_chunk
          FROM jsonb_array_elements(v_items) WITH ORDINALITY AS e(x, ord) WHERE ord > i AND ord <= i + 50;
        IF p_request.rpc = 'money_changes_checked_bulk' THEN
          v_res := public.money_changes_checked_bulk(v_chunk, p ->> 'reason', (p ->> 'batch_id')::uuid, v_ctx);
        ELSE
          v_res := public.cancel_sessions_checked_bulk(v_chunk, p ->> 'reason', (p ->> 'batch_id')::uuid, v_ctx);
        END IF;
        IF jsonb_array_length(COALESCE(v_res -> 'refused', '[]'::jsonb)) > 0 THEN
          RAISE EXCEPTION 'approval_partial' USING ERRCODE = 'HC011', DETAIL = (v_res -> 'refused')::text;
        END IF;
        v_all := v_all || COALESCE(v_res -> 'done', '[]'::jsonb);
        i := i + 50;
      END LOOP;
      v_ids := (SELECT COALESCE(jsonb_agg(d -> 'override_id'), '[]'::jsonb) FROM jsonb_array_elements(v_all) d);
      v_res := jsonb_build_object('batch_id', p ->> 'batch_id', 'done', v_all, 'refused', '[]'::jsonb);
    WHEN 'set_change_approval_settings' THEN
      v_res := public.set_change_approval_settings(p -> 'patch', p ->> 'reason');
    WHEN 'grant_admin_role' THEN
      v_res := public.grant_admin_role((p ->> 'user_id')::uuid, p ->> 'reason');
    WHEN 'carry_payroll_adjustments' THEN
      v_res := public.carry_payroll_adjustments(p -> 'rows');
    ELSE
      RAISE EXCEPTION 'bad_rpc' USING ERRCODE = 'HC015';
  END CASE;
  RETURN jsonb_build_object('result', v_res, 'override_ids', v_ids);
END $fn$;

-- Approve (another administrator) or release alone (the requester, after the
-- owner's delay): recompute under the locks; a different fingerprint is
-- stale (recorded, nothing applied); the caller's token must match; then the
-- decision and the change in ONE transaction. A change the checked function
-- refuses now is recorded as stale and applies nothing.
CREATE OR REPLACE FUNCTION public._approval_decide(p_request_id uuid, p_token text, p_note text, p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  r public.change_approval_requests;
  st public.change_approval_settings;
  v_status text;
  v_plan jsonb;
  v_exec jsonb;
  v_note text := NULLIF(left(btrim(COALESCE(p_note, '')), 1000), '');
  v_code text;
  v_msg text;
  v_det text;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'a request id is required' USING ERRCODE = '22004';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('approval:' || p_request_id::text, 0));
  SELECT * INTO r FROM public.change_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public._change_approval_installed() THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'The approval step is rolled back (its triggers are missing). Nothing was changed.';
  END IF;
  IF p_mode = 'approved' THEN
    IF r.requested_by = v_uid THEN
      RAISE EXCEPTION 'self_approval' USING ERRCODE = 'HC061',
        DETAIL = 'approvers=' || (SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) FROM unnest(public._approval_admins()) a WHERE a <> v_uid)::text;
    END IF;
  ELSE
    IF r.requested_by <> v_uid THEN
      RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501', DETAIL = 'Only the person who asked can release it.';
    END IF;
    st := public._change_approval_settings_row();
    IF st.solo_release_after_hours IS NULL THEN
      RAISE EXCEPTION 'approval_setting_locked' USING ERRCODE = 'HC065', DETAIL = 'solo_release_off';
    END IF;
    IF now() < r.created_at + make_interval(hours => st.solo_release_after_hours) THEN
      RAISE EXCEPTION 'approval_setting_locked' USING ERRCODE = 'HC065',
        DETAIL = 'solo_release_not_yet;at=' || to_char((r.created_at + make_interval(hours => st.solo_release_after_hours))
                                                          AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD"T"HH24:MI');
    END IF;
  END IF;
  v_status := public._approval_request_status(r.id, r.expires_at);
  IF v_status = 'expired' THEN
    RAISE EXCEPTION 'request_expired' USING ERRCODE = 'HC064', DETAIL = 'expired_at=' || r.expires_at::text;
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending' USING ERRCODE = 'HC062', DETAIL = 'status=' || v_status;
  END IF;

  v_plan := public._approval_plan(r.kind, r.rpc, r.params, v_uid, true, false);
  IF v_plan -> 'fingerprints' IS DISTINCT FROM to_jsonb(r.fingerprints) THEN
    INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
    VALUES (r.id, v_uid, 'stale', jsonb_build_object('why', 'changed', 'fingerprints_now', v_plan -> 'fingerprints'));
    RETURN jsonb_build_object('status', 'stale', 'request_id', r.id, 'why', 'changed');
  END IF;
  IF p_token IS DISTINCT FROM public._approval_token(r.id, v_uid, v_plan) THEN
    RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'Open the request again: it was recomputed.';
  END IF;

  BEGIN
    INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
    VALUES (r.id, v_uid, p_mode, jsonb_build_object('note', v_note, 'approval_now', v_plan -> 'approval'));
    PERFORM set_config('hec.change_request_ok', r.id::text, true);
    v_exec := public._approval_execute(r, v_plan);
    PERFORM set_config('hec.change_request_ok', '', true);
    INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
    VALUES (r.id, v_uid, 'applied', jsonb_build_object('override_ids', v_exec -> 'override_ids', 'released_alone', p_mode = 'released_alone',
                                                       'result', v_exec -> 'result'));
  EXCEPTION WHEN SQLSTATE 'HC010' OR SQLSTATE 'HC011' OR SQLSTATE 'HC012' OR SQLSTATE 'HC013' OR SQLSTATE 'HC014'
               OR SQLSTATE 'HC015' OR SQLSTATE 'HC016' OR SQLSTATE 'HC017' OR SQLSTATE 'HC060' OR SQLSTATE 'P0002' THEN
    GET STACKED DIAGNOSTICS v_code = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT, v_det = PG_EXCEPTION_DETAIL;
    INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
    VALUES (r.id, v_uid, 'stale', jsonb_build_object('why', 'refused_now', 'code', v_code, 'message', v_msg,
                                                     'detail', left(COALESCE(v_det, ''), 2000)));
    RETURN jsonb_build_object('status', 'stale', 'request_id', r.id, 'why', 'refused_now', 'code', v_code, 'message', v_msg);
  END;
  RETURN jsonb_build_object('status', 'applied', 'request_id', r.id, 'released_alone', p_mode = 'released_alone',
                            'override_ids', v_exec -> 'override_ids', 'result', v_exec -> 'result');
END $fn$;

CREATE OR REPLACE FUNCTION public.approve_change_request(p_request_id uuid, p_token text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN public._approval_decide(p_request_id, p_token, p_note, 'approved');
END $fn$;

CREATE OR REPLACE FUNCTION public.release_own_request(p_request_id uuid, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN public._approval_decide(p_request_id, p_token, NULL, 'released_alone');
END $fn$;

CREATE OR REPLACE FUNCTION public.reject_change_request(p_request_id uuid, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  r public.change_approval_requests;
  v_note text;
  v_status text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('approval:' || COALESCE(p_request_id::text, ''), 0));
  SELECT * INTO r FROM public.change_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;
  IF r.requested_by = v_uid THEN
    RAISE EXCEPTION 'self_approval' USING ERRCODE = 'HC061', DETAIL = 'withdraw';
  END IF;
  v_note := public.session_change_reason_ok(p_note);
  v_status := public._approval_request_status(r.id, r.expires_at);
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending' USING ERRCODE = 'HC062', DETAIL = 'status=' || v_status;
  END IF;
  INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
  VALUES (r.id, v_uid, 'rejected', jsonb_build_object('note', v_note));
  RETURN jsonb_build_object('status', 'rejected', 'request_id', r.id);
END $fn$;

CREATE OR REPLACE FUNCTION public.withdraw_change_request(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  r public.change_approval_requests;
  v_status text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('approval:' || COALESCE(p_request_id::text, ''), 0));
  SELECT * INTO r FROM public.change_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;
  IF r.requested_by <> v_uid THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501', DETAIL = 'Only the person who asked can withdraw it.';
  END IF;
  v_status := public._approval_request_status(r.id, r.expires_at);
  IF v_status NOT IN ('pending', 'expired') THEN
    RAISE EXCEPTION 'request_not_pending' USING ERRCODE = 'HC062', DETAIL = 'status=' || v_status;
  END IF;
  INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
  VALUES (r.id, v_uid, 'withdrawn', '{}'::jsonb);
  RETURN jsonb_build_object('status', 'withdrawn', 'request_id', r.id);
END $fn$;

-- A request released alone stays in front of the other administrator until
-- they have read it (A-17: "shown first on return").
CREATE OR REPLACE FUNCTION public.acknowledge_released_request(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  r public.change_approval_requests;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('approval:' || COALESCE(p_request_id::text, ''), 0));
  SELECT * INTO r FROM public.change_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;
  IF r.requested_by = v_uid THEN
    RAISE EXCEPTION 'self_approval' USING ERRCODE = 'HC061', DETAIL = 'acknowledge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.change_approval_events WHERE request_id = r.id AND kind = 'released_alone')
     OR EXISTS (SELECT 1 FROM public.change_approval_events WHERE request_id = r.id AND kind = 'acknowledged') THEN
    RAISE EXCEPTION 'request_not_pending' USING ERRCODE = 'HC062', DETAIL = 'nothing to acknowledge';
  END IF;
  INSERT INTO public.change_approval_events (request_id, actor_user_id, kind, payload)
  VALUES (r.id, v_uid, 'acknowledged', jsonb_build_object('note', NULLIF(left(btrim(COALESCE(p_note, '')), 1000), '')));
  RETURN jsonb_build_object('status', 'acknowledged', 'request_id', r.id);
END $fn$;

-- What the other administrator sees: the request beside the change
-- recomputed now, as them, with their token.
CREATE OR REPLACE FUNCTION public.approval_request_preview(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  r public.change_approval_requests;
  st public.change_approval_settings;
  v_status text;
  v_plan jsonb;
  v_err jsonb := NULL;
  v_stale boolean;
  v_released boolean;
BEGIN
  SELECT * INTO r FROM public.change_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found' USING ERRCODE = 'P0002';
  END IF;
  st := public._change_approval_settings_row();
  v_status := public._approval_request_status(r.id, r.expires_at);
  BEGIN
    v_plan := public._approval_plan(r.kind, r.rpc, r.params, v_uid, false, false);
  EXCEPTION WHEN OTHERS THEN
    v_plan := NULL;
    v_err := jsonb_build_object('code', SQLSTATE, 'message', SQLERRM);
  END;
  v_stale := v_plan IS NULL OR v_plan -> 'fingerprints' IS DISTINCT FROM to_jsonb(r.fingerprints);
  v_released := EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'released_alone');
  RETURN jsonb_build_object(
    'request', to_jsonb(r) - 'txid',
    'status', v_status,
    'events', (SELECT COALESCE(jsonb_agg(jsonb_build_object('kind', e.kind, 'at', e.created_at, 'actor_user_id', e.actor_user_id,
                                                            'payload', e.payload) ORDER BY e.created_at, e.id), '[]'::jsonb)
                 FROM public.change_approval_events e WHERE e.request_id = r.id),
    'now', CASE WHEN v_plan IS NULL THEN NULL ELSE jsonb_build_object(
             'items', (SELECT jsonb_agg((x - 'token') ORDER BY n) FROM jsonb_array_elements(v_plan -> 'items') WITH ORDINALITY AS e(x, n)),
             'impact', v_plan -> 'impact', 'approval', v_plan -> 'approval') END,
    'error', v_err,
    'stale', v_stale,
    'token', CASE WHEN v_plan IS NULL THEN NULL ELSE public._approval_token(r.id, v_uid, v_plan) END,
    'can_approve', v_status = 'pending' AND NOT v_stale AND r.requested_by <> v_uid,
    'can_reject', v_status = 'pending' AND r.requested_by <> v_uid,
    'can_withdraw', v_status IN ('pending', 'expired') AND r.requested_by = v_uid,
    'can_release', v_status = 'pending' AND NOT v_stale AND r.requested_by = v_uid AND st.solo_release_after_hours IS NOT NULL
                   AND now() >= r.created_at + make_interval(hours => st.solo_release_after_hours),
    'release_after', CASE WHEN st.solo_release_after_hours IS NULL THEN NULL
                          ELSE r.created_at + make_interval(hours => st.solo_release_after_hours) END,
    'needs_acknowledgement', v_released AND r.requested_by <> v_uid
                             AND NOT EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'acknowledged'));
END $fn$;

-- The settings card.
CREATE OR REPLACE FUNCTION public.change_approval_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := public._session_require_admin();
  st public.change_approval_settings;
  v_admins uuid[] := public._approval_admins();
  v_installed boolean := public._change_approval_installed();
BEGIN
  st := public._change_approval_settings_row();
  RETURN jsonb_build_object(
    'installed', v_installed,
    'rolled_back', NOT v_installed,
    'enabled', st.enabled AND v_installed,
    'settings', to_jsonb(st) - 'id',
    'admins', to_jsonb(v_admins),
    'admin_count', cardinality(v_admins),
    'can_switch_on', v_installed AND cardinality(v_admins) >= 2,
    'pending', (SELECT count(*)::int FROM public.change_approval_requests r
                 WHERE public._approval_request_status(r.id, r.expires_at) = 'pending'),
    'pending_for_me', (SELECT count(*)::int FROM public.change_approval_requests r
                        WHERE r.requested_by <> v_uid AND public._approval_request_status(r.id, r.expires_at) = 'pending'),
    'released_unread', (SELECT count(*)::int FROM public.change_approval_requests r
                         WHERE r.requested_by <> v_uid
                           AND EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'released_alone')
                           AND NOT EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'acknowledged')),
    -- for a school that falls to one administrator (design (e), "few admins")
    'off_statement', 'UPDATE public.change_approval_settings SET enabled = false, updated_at = now() WHERE id;');
END $fn$;

-- ---------------------------------------------------------------- 8
-- The three hooks.

-- D2's own changes (cancel, delete, move, uncancel; single and bulk), with no
-- change to _session_change_apply: the change is assessed again as its actor
-- (same lock, same transaction: the same answer), and its fingerprint claimed.
CREATE OR REPLACE FUNCTION public._session_override_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s public.sessions;
  a jsonb;
  v_imp jsonb;
  v_need jsonb;
BEGIN
  IF public._caller_lane() = 'owner' OR NOT public._change_approval_on() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO s FROM public.sessions WHERE id = NEW.session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050', DETAIL = 'The lesson of this change is not there to assess.';
  END IF;
  a := public._session_change_assess(s, NEW.action,
         CASE WHEN NEW.action = 'move' THEN jsonb_build_object('date', NEW.change ->> 'new_date',
                'start_time', NEW.change ->> 'new_start_time', 'end_time', NEW.change ->> 'new_end_time') END,
         NEW.actor_user_id);
  v_imp := CASE WHEN jsonb_typeof(a -> 'impact') = 'object' THEN a -> 'impact' ELSE '{}'::jsonb END;
  v_imp := v_imp || jsonb_build_object(
             'tier', GREATEST(NEW.tier, COALESCE((v_imp ->> 'tier')::int, 3)),
             'closed_payroll', NEW.payroll_month_locked OR COALESCE((v_imp ->> 'closed_payroll')::boolean, false));
  v_need := COALESCE(public.change_approval_needed(v_imp, NEW.actor_user_id), '{"required": true, "reasons": ["unknown"]}'::jsonb);
  IF COALESCE((v_need ->> 'required')::boolean, true)
     AND public._change_request_claim('session', a ->> 'fingerprint') IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=' || COALESCE(v_need ->> 'reasons', '[]');
  END IF;
  RETURN NEW;
END $fn$;

-- Giving the admin role (A-18), on every lane but the owner's.
CREATE OR REPLACE FUNCTION public._admin_grant_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.role IS DISTINCT FROM 'admin'::public.app_role
     OR (TG_OP = 'UPDATE' AND OLD.role = 'admin'::public.app_role AND OLD.user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF public._caller_lane() = 'owner' OR NOT public._change_approval_on() THEN
    RETURN NEW;
  END IF;
  IF public._change_request_claim('settings', public._approval_grant_fp(NEW.user_id)) IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=["settings"]';
  END IF;
  RETURN NEW;
END $fn$;

-- Carrying pay forward (A-4), on every lane but the owner's.
CREATE OR REPLACE FUNCTION public._pay_adjustment_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF public._caller_lane() = 'owner' OR NOT public._change_approval_on()
     OR NOT (public._change_approval_settings_row()).on_pay_adjustment THEN
    RETURN NEW;
  END IF;
  IF public._change_request_claim('money', public._approval_pay_fp(NEW.month, NEW.origin_month, NEW.teacher_id, NEW.assistant_id,
                                                                   NEW.amount_vnd, NEW.reason)) IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=["pay_adjustment"]';
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS zz_session_override_approval ON public.session_cancel_overrides;
CREATE TRIGGER zz_session_override_approval BEFORE INSERT ON public.session_cancel_overrides
  FOR EACH ROW EXECUTE FUNCTION public._session_override_approval();
DROP TRIGGER IF EXISTS zz_admin_grant_guard ON public.user_roles;
CREATE TRIGGER zz_admin_grant_guard BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public._admin_grant_guard();
DROP TRIGGER IF EXISTS zz_pay_adjustment_approval ON public.payroll_adjustments;
CREATE TRIGGER zz_pay_adjustment_approval BEFORE INSERT ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION public._pay_adjustment_approval();

-- ---------------------------------------------------------------- 9
-- The queue (admin-only through the tables' RLS: security_invoker).

CREATE OR REPLACE VIEW public.change_approval_queue WITH (security_invoker = true) AS
SELECT r.id AS request_id, r.created_at, r.requested_by, r.kind, r.rpc, r.target_keys, r.batch, r.impact, r.reasons,
       r.preview, r.expires_at,
       public._approval_request_status(r.id, r.expires_at) AS status,
       d.actor_user_id AS decided_by, d.created_at AS decided_at, d.kind AS decision, d.payload ->> 'note' AS decision_note,
       EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'released_alone') AS released_alone,
       EXISTS (SELECT 1 FROM public.change_approval_events e WHERE e.request_id = r.id AND e.kind = 'acknowledged') AS acknowledged,
       (SELECT e.payload -> 'override_ids' FROM public.change_approval_events e
         WHERE e.request_id = r.id AND e.kind = 'applied' ORDER BY e.created_at DESC LIMIT 1) AS override_ids
  FROM public.change_approval_requests r
  LEFT JOIN LATERAL (SELECT e.* FROM public.change_approval_events e
                      WHERE e.request_id = r.id AND e.kind IN ('approved', 'released_alone', 'rejected', 'withdrawn', 'stale')
                      ORDER BY e.created_at DESC, e.id DESC LIMIT 1) d ON true;

REVOKE ALL ON public.change_approval_queue FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.change_approval_queue TO authenticated, service_role;

-- ---------------------------------------------------------------- 10
-- Function grants: the public RPCs for authenticated only (each checks admin
-- inside); everything else nobody.

REVOKE ALL ON FUNCTION
  public._change_approval_settings_guard(),
  public._change_approval_settings_row(),
  public._change_approval_installed(),
  public._change_approval_on(),
  public._approval_admins(),
  public.change_approval_needed(jsonb, uuid),
  public._change_request_claim(text, text),
  public._money_change_full_plan(text, text, jsonb, uuid, text),
  public._approval_grant_fp(uuid),
  public._approval_pay_fp(text, text, uuid, uuid, integer, text),
  public._approval_settings_fp(jsonb, jsonb),
  public._approval_settings_patched(jsonb, jsonb),
  public._approval_settings_loosens(jsonb, jsonb),
  public._approval_lock_money(text, text, jsonb),
  public._approval_plan(text, text, jsonb, uuid, boolean, boolean, text),
  public._approval_token(uuid, uuid, jsonb),
  public._approval_request_status(uuid, timestamptz),
  public.grant_admin_role(uuid, text),
  public.carry_payroll_adjustments(jsonb),
  public.set_change_approval_settings(jsonb, text),
  public.request_change_approval(text, text, jsonb, text),
  public._approval_execute(public.change_approval_requests, jsonb),
  public._approval_decide(uuid, text, text, text),
  public.approve_change_request(uuid, text, text),
  public.release_own_request(uuid, text),
  public.reject_change_request(uuid, text),
  public.withdraw_change_request(uuid),
  public.acknowledge_released_request(uuid, text),
  public.approval_request_preview(uuid),
  public.change_approval_status(),
  public._session_override_approval(),
  public._admin_grant_guard(),
  public._pay_adjustment_approval()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.set_change_approval_settings(jsonb, text),
  public.request_change_approval(text, text, jsonb, text),
  public.approve_change_request(uuid, text, text),
  public.release_own_request(uuid, text),
  public.reject_change_request(uuid, text),
  public.withdraw_change_request(uuid),
  public.acknowledge_released_request(uuid, text),
  public.approval_request_preview(uuid),
  public.change_approval_status()
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(c.relname || '.' || t.tgname || '=' || t.tgenabled::text, ', ' ORDER BY c.relname, t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname IN ('zz_session_override_approval', 'zz_admin_grant_guard', 'zz_pay_adjustment_approval')) AS approval_triggers,
  (SELECT enabled FROM public.change_approval_settings WHERE id)                                            AS approval_enabled,
  (SELECT count(*) FROM public.change_approval_requests)                                                    AS requests;
