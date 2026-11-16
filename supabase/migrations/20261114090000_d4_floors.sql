-- D4 step 1a: the two floors. Removing evidence or lowering a bill's label
-- stays possible (honest corrections need it), but no longer lowers the
-- check the next change meets.
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.2 (G-8, G-9,
-- G-10), c.0 and c.1. Build notes, the diff of the two replaced bodies and
-- the design questions: docs/evidence/D4-build-1a.md.
--
-- WHAT THIS ADDS
--   tables    session_evidence_floor   strongest evidence a started lesson showed
--                                      just before someone lowered it
--             invoice_state_floor      strongest state a bill had just before a
--                                      write lowered it, per (child, month)
--   triggers  attendance       zz_attendance_evidence_guard  (G-10 + keep)
--             point_transactions zz_point_evidence_keep, audit_point_transactions
--             class_transcripts  zz_transcript_evidence_keep
--             homeworks          zz_homework_evidence_keep
--             homework_submissions zz_homework_evidence_keep
--             sessions         zz0_session_evidence_keep  (records only; D2's
--                                                          trigger still decides)
--             invoices         zz_invoice_state_floor     (records only)
--   helpers   _caller_lane, _session_evidence_keep, session_effective_level,
--             invoice_floor_state, and the trigger / table-guard functions
--
-- WHAT THIS REPLACES (the whole list, design c.0): the BODIES of
--   _session_change_assess(public.sessions, text, jsonb, uuid) and
--   _session_erased_recently(uuid). Same signatures, same grants (none).
-- Nothing else of D1 or D2 is replaced, altered, dropped or re-granted.
--
-- REFUSES: only G-10 (a register row keeps its lesson, its child and, on
-- the person lane, its signature): HC024 / HC025. The floors refuse
-- nothing; every tier reads max(now, floor).
--
-- NO ROW IS REWRITTEN. No session, attendance row, bill, payment or
-- payroll line is changed by this file. The floor tables start empty;
-- facts are added only when a later write lowers something.
--
-- Safe to paste twice: CREATE OR REPLACE / IF NOT EXISTS / DROP TRIGGER IF
-- EXISTS throughout; the preflight accepts the two replaced functions in
-- either their D2 form or this file's form.
--
-- Rollback: scripts/ROLLBACK-d4-1-floors.sql, then paste
-- 20261112091000_session_cancel_guard.sql again (it restores the two
-- D2 bodies; this file changed no signature).

BEGIN;

-- Fail fast instead of queueing behind a busy table (review N-4): CREATE
-- TRIGGER takes a lock on attendance, sessions, invoices and the other
-- evidence tables. If one is busy for 5 seconds the paste stops, installs
-- nothing, and is simply repeated a moment later.
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
  v_md5 text;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'public.session_held_evidence(uuid)',
    'public.session_recording_evidence(uuid)',
    'public.session_has_started(date, time without time zone)',
    'public.session_change_tier(boolean, text, boolean)',
    'public.session_month_tuition_settled(uuid, text)',
    'public._session_change_assess(public.sessions, text, jsonb, uuid)',
    'public._session_erased_recently(uuid)',
    'public._session_change_apply(uuid, text, jsonb, text, text, boolean, text, jsonb, text, uuid, boolean)',
    'public.session_day_evidence(uuid, uuid, date)',
    'public.has_role(uuid, public.app_role)',
    'public.is_teacher_of_class(uuid, uuid)',
    'public.payroll_month_is_locked(text)',
    'public.audit_row_change()',
    'auth.uid()',
    'auth.role()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;

  IF to_regclass('public.session_cancel_overrides') IS NULL THEN
    v_missing := v_missing || 'table public.session_cancel_overrides (paste 20261112091000 first)'::text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'zz_session_change_guard_upd'
                    AND tgrelid = to_regclass('public.sessions')) THEN
    v_missing := v_missing || 'trigger zz_session_change_guard_upd on sessions (paste 20261112091000 first)'::text;
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      ('sessions',             ARRAY['id','class_id','date','start_time','end_time','status','teacher_id','updated_at']),
      ('attendance',           ARRAY['id','session_id','student_id','status','marked_by']),
      ('point_transactions',   ARRAY['id','student_id','class_id','session_id','points','type','date','created_by','created_at']),
      ('class_transcripts',    ARRAY['id','class_id','session_id','uploaded_by','transcript_date','status','audio_storage_path','created_at']),
      ('homeworks',            ARRAY['id','class_id','created_by','created_at']),
      ('homework_submissions', ARRAY['id','homework_id','student_id','graded_at']),
      ('stars_homework_map',   ARRAY['homework_id']),
      ('stars_sync_grade_state', ARRAY['homework_id','student_id']),
      ('invoices',             ARRAY['id','student_id','month','status','recorded_payment','confirmation_status','tuition_frozen']),
      ('students',             ARRAY['id','family_id']),
      ('audit_log',            ARRAY['entity','entity_id','operation','diff','occurred_at','actor_user_id','changed_fields'])
    ) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      v_missing := v_missing || ('table public.' || r.tbl);
    ELSE
      v_missing := v_missing || ARRAY(
        SELECT 'column public.' || r.tbl || '.' || c FROM unnest(r.cols) AS c
         WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                            WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = c));
    END IF;
  END LOOP;

  -- R-10: the two live functions this file replaces must be the ones D4 was
  -- designed against - D2 as released (docs/evidence/D-release-fingerprint
  -- .expected.json) - or this file's own (a second paste). md5 over the
  -- body with CR removed: the released fingerprint is of the LF text.
  IF to_regprocedure('public._session_change_assess(public.sessions, text, jsonb, uuid)') IS NOT NULL THEN
    SELECT md5(replace(prosrc, E'\r', '')) INTO v_md5 FROM pg_proc
     WHERE oid = 'public._session_change_assess(public.sessions, text, jsonb, uuid)'::regprocedure;
    IF v_md5 NOT IN ('e0acbcc9a958a789aa437a6c8c4a84ec',   -- D2, 20261112091000 (D release)
                     '6c1b8c86c47d3193d42f13adf56dcdc2') THEN                 -- this file
      v_missing := v_missing || ('_session_change_assess is not the D2 or D4 body (md5 ' || v_md5 || ')');
    END IF;
  END IF;
  IF to_regprocedure('public._session_erased_recently(uuid)') IS NOT NULL THEN
    SELECT md5(replace(prosrc, E'\r', '')) INTO v_md5 FROM pg_proc
     WHERE oid = 'public._session_erased_recently(uuid)'::regprocedure;
    IF v_md5 NOT IN ('32c7fac7d6336c6ac48ba15bfe891630',   -- D2, 20261112091000 (D release)
                     '5f58916650251e14a89a45455746fd6f') THEN                 -- this file
      v_missing := v_missing || ('_session_erased_recently is not the D2 or D4 body (md5 ' || v_md5 || ')');
    END IF;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_floors cannot be installed; %', array_to_string(v_missing, ', ')
      USING HINT = 'The live function is not the one D4 was designed against, or a migration it needs is missing. Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- Who is asking. D1's own positive test (20261112090000, "WHO IS
-- INTERNAL"), split in two. 'unknown' = an API role with no user: a
-- person with no rights.

CREATE OR REPLACE FUNCTION public._caller_lane()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL THEN 'person'
    WHEN NULLIF(auth.role(), '') = 'service_role' THEN 'service'
    WHEN NULLIF(auth.role(), '') IS NULL
     AND session_user::text NOT IN ('authenticator', 'authenticated', 'anon')
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none') NOT IN ('authenticator', 'authenticated', 'anon')
      THEN 'owner'
    ELSE 'unknown'
  END
$fn$;

-- ---------------------------------------------------------------- 2
-- The two floor tables.
--
-- GRANTS - as D2's audit tables: authenticated SELECT (RLS: admins only),
-- service_role ALL (house rule, 20260712023825). The guard trigger below
-- still refuses every DELETE and TRUNCATE, every UPDATE that lowers a
-- floor, and any INSERT / UPDATE not made by the table owner (whom the
-- definer functions of this file run as).

CREATE TABLE IF NOT EXISTS public.session_evidence_floor (
  session_id uuid PRIMARY KEY,                       -- no FK: must never block a lesson delete
  level      text NOT NULL CHECK (level IN ('SOFT', 'STRONG')),
  families   jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  causes     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- newest 20
  CONSTRAINT session_evidence_floor_causes_size CHECK (pg_column_size(causes) < 32768)
);

CREATE TABLE IF NOT EXISTS public.invoice_state_floor (
  student_id uuid NOT NULL,
  month      text NOT NULL,
  ever_paid    boolean NOT NULL DEFAULT false,
  ever_signed  boolean NOT NULL DEFAULT false,
  ever_frozen  boolean NOT NULL DEFAULT false,
  max_recorded_payment numeric NOT NULL DEFAULT 0,
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  causes     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- newest 20
  PRIMARY KEY (student_id, month),                   -- no FK: outlives a deleted bill
  CONSTRAINT invoice_state_floor_causes_size CHECK (pg_column_size(causes) < 32768)
);

-- One guard for both tables. SECURITY INVOKER on purpose (as D2's insert
-- guard): current_user is whoever runs the statement.
CREATE OR REPLACE FUNCTION public._floor_table_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  o jsonb;
  n jsonb;
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION '% keeps history: rows are never removed', TG_TABLE_NAME USING ERRCODE = 'HC040';
  END IF;
  IF current_user::text IN ('anon', 'authenticated', 'service_role', 'authenticator')
     OR current_user <> (SELECT c.relowner::regrole::name FROM pg_class c WHERE c.oid = TG_RELID) THEN
    RAISE EXCEPTION '% rows are written only by the floor functions', TG_TABLE_NAME USING ERRCODE = 'HC041';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD);
    n := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'session_evidence_floor' THEN
      IF OLD.session_id IS DISTINCT FROM NEW.session_id
         OR (OLD.level = 'STRONG' AND NEW.level IS DISTINCT FROM 'STRONG')
         OR OLD.first_at IS DISTINCT FROM NEW.first_at
         OR EXISTS (SELECT 1 FROM jsonb_each(COALESCE(o -> 'families', '{}'::jsonb)) e
                     WHERE e.value = 'true'::jsonb
                       AND (n -> 'families' -> e.key) IS DISTINCT FROM 'true'::jsonb) THEN
        RAISE EXCEPTION 'session_evidence_floor only rises' USING ERRCODE = 'HC040';
      END IF;
    ELSE
      IF (o ->> 'student_id') IS DISTINCT FROM (n ->> 'student_id')
         OR (o ->> 'month') IS DISTINCT FROM (n ->> 'month')
         OR ((o ->> 'ever_paid')::boolean   AND NOT (n ->> 'ever_paid')::boolean)
         OR ((o ->> 'ever_signed')::boolean AND NOT (n ->> 'ever_signed')::boolean)
         OR ((o ->> 'ever_frozen')::boolean AND NOT (n ->> 'ever_frozen')::boolean)
         OR (n ->> 'max_recorded_payment')::numeric < (o ->> 'max_recorded_payment')::numeric
         OR (o ->> 'first_at') IS DISTINCT FROM (n ->> 'first_at') THEN
        RAISE EXCEPTION 'invoice_state_floor only rises' USING ERRCODE = 'HC040';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DO $trg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['session_evidence_floor', 'invoice_state_floor'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_guard', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW
                      EXECUTE FUNCTION public._floor_table_guard()', t || '_guard', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_no_truncate', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT
                      EXECUTE FUNCTION public._floor_table_guard()', t || '_no_truncate', t);
  END LOOP;
END $trg$;

ALTER TABLE public.session_evidence_floor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_state_floor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_evidence_floor_admin_read ON public.session_evidence_floor;
CREATE POLICY session_evidence_floor_admin_read ON public.session_evidence_floor
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS invoice_state_floor_admin_read ON public.invoice_state_floor;
CREATE POLICY invoice_state_floor_admin_read ON public.invoice_state_floor
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.session_evidence_floor, public.invoice_state_floor
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.session_evidence_floor, public.invoice_state_floor TO authenticated;
GRANT ALL ON public.session_evidence_floor, public.invoice_state_floor TO service_role;

-- ---------------------------------------------------------------- 3
-- Small pure helpers.

-- Union of two family maps; a family once true stays true.
CREATE OR REPLACE FUNCTION public._floor_families_or(a jsonb, b jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) FROM (
    SELECT e.key AS k, bool_or(COALESCE(e.value = 'true'::jsonb, false)) AS v
      FROM (SELECT * FROM jsonb_each(CASE WHEN jsonb_typeof(a) = 'object' THEN a ELSE '{}'::jsonb END)
            UNION ALL
            SELECT * FROM jsonb_each(CASE WHEN jsonb_typeof(b) = 'object' THEN b ELSE '{}'::jsonb END)) e
     GROUP BY e.key) q
$fn$;

-- Append one cause, keep the newest 20, oldest first.
CREATE OR REPLACE FUNCTION public._floor_causes_push(a jsonb, c jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(e ORDER BY n), '[]'::jsonb) FROM (
    SELECT e, n FROM jsonb_array_elements(
             (CASE WHEN jsonb_typeof(a) = 'array' THEN a ELSE '[]'::jsonb END) || jsonb_build_array(c))
           WITH ORDINALITY AS t(e, n)
     ORDER BY n DESC LIMIT 20) q
$fn$;

-- ---------------------------------------------------------------- 4
-- G-8: the evidence keep. Called from the BEFORE triggers below WHILE THE
-- ROW IS STILL THERE. Refuses nothing. Rules (design b.2, R-6):
--   * only a lesson that has started;
--   * the cancel's excuse-all (a trigger-made attendance write) keeps nothing;
--   * who is asking is decided BEFORE D1 is called: a person who is neither
--     an admin nor a teacher of the lesson's class - the callers D1 refuses -
--     writes NO floor, ever (a child's own homework row cannot lock lessons);
--   * a floor already STRONG only gains the cause;
--   * if D1 still raises, the floor is what the removed row proves on its
--     own (p_own_level / p_own_family): true by construction, never more.
CREATE OR REPLACE FUNCTION public._session_evidence_keep(
  p_session_id uuid, p_cause jsonb, p_own_level text, p_own_family text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  s record;
  v_uid uuid := auth.uid();
  v_lane text;
  v_cur text;
  v_ev jsonb;
  v_level text;
  v_fam jsonb;
  v_source text;
  v_cause jsonb;
BEGIN
  IF p_session_id IS NULL THEN
    RETURN;
  END IF;
  SELECT ss.id, ss.class_id, ss.date, ss.start_time INTO s FROM public.sessions ss WHERE ss.id = p_session_id;
  IF NOT FOUND OR NOT COALESCE(public.session_has_started(s.date, s.start_time), false) THEN
    RETURN;
  END IF;
  IF pg_trigger_depth() > 1 AND COALESCE(p_cause ->> 'table', '') = 'attendance' THEN
    RETURN;   -- the cancel's excuse-all; the cancel's own override row holds the evidence
  END IF;

  v_lane := public._caller_lane();
  IF v_lane IN ('person', 'unknown')
     AND NOT COALESCE(v_uid IS NOT NULL
                      AND (public.has_role(v_uid, 'admin'::public.app_role)
                           OR public.is_teacher_of_class(v_uid, s.class_id)), false) THEN
    RETURN;   -- R-6: a caller D1 refuses writes no floor
  END IF;

  v_cause := COALESCE(CASE WHEN jsonb_typeof(p_cause) = 'object' THEN p_cause END, '{}'::jsonb)
             || jsonb_build_object('at', now(), 'actor_user_id', v_uid, 'lane', v_lane);

  SELECT f.level INTO v_cur FROM public.session_evidence_floor f WHERE f.session_id = p_session_id;
  IF v_cur = 'STRONG' THEN
    UPDATE public.session_evidence_floor
       SET causes = public._floor_causes_push(causes, v_cause || jsonb_build_object('source', 'floor', 'level', 'STRONG')),
           last_at = now()
     WHERE session_id = p_session_id;
    RETURN;
  END IF;

  BEGIN
    v_ev := public.session_held_evidence(p_session_id);
    v_level := v_ev ->> 'level';
    IF v_level IS NULL OR v_level NOT IN ('NONE', 'SOFT', 'STRONG') THEN
      RAISE EXCEPTION 'unexpected level %', v_level USING ERRCODE = '55000';
    END IF;
    v_fam := COALESCE(v_ev -> 'families', '{}'::jsonb);
    v_source := 'd1';
  EXCEPTION WHEN OTHERS THEN
    v_level := CASE WHEN p_own_level IN ('SOFT', 'STRONG') THEN p_own_level ELSE 'NONE' END;
    v_fam := CASE WHEN p_own_family IS NOT NULL THEN jsonb_build_object(p_own_family, true) ELSE '{}'::jsonb END;
    v_source := 'row';
  END;

  IF v_level = 'NONE' THEN
    RETURN;
  END IF;

  v_cause := v_cause || jsonb_build_object('source', v_source, 'level', v_level);
  INSERT INTO public.session_evidence_floor AS f (session_id, level, families, causes)
  VALUES (p_session_id, v_level, public._floor_families_or('{}'::jsonb, v_fam), jsonb_build_array(v_cause))
  ON CONFLICT (session_id) DO UPDATE
     SET level    = CASE WHEN f.level = 'STRONG' OR EXCLUDED.level = 'STRONG' THEN 'STRONG' ELSE 'SOFT' END,
         families = public._floor_families_or(f.families, EXCLUDED.families),
         causes   = public._floor_causes_push(f.causes, v_cause),
         last_at  = now();
END $fn$;

-- max(D1 now, floor). ONE function (design A-2): D1 answers "what is there
-- now", this answers "what has been there". Fails closed on an unknown level.
CREATE OR REPLACE FUNCTION public.session_effective_level(p_session_id uuid, p_d1 jsonb)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_now text := p_d1 ->> 'level';
  v_floor text;
BEGIN
  IF v_now IS NULL OR v_now NOT IN ('NONE', 'SOFT', 'STRONG') THEN
    RAISE EXCEPTION 'unknown evidence level %', v_now USING ERRCODE = '55000';
  END IF;
  SELECT f.level INTO v_floor FROM public.session_evidence_floor f WHERE f.session_id = p_session_id;
  RETURN CASE
    WHEN v_now = 'STRONG' OR v_floor = 'STRONG' THEN 'STRONG'
    WHEN v_now = 'SOFT' OR v_floor = 'SOFT' THEN 'SOFT'
    ELSE 'NONE' END;
END $fn$;

-- The bill floor of one (child, month), or all-false.
CREATE OR REPLACE FUNCTION public.invoice_floor_state(p_student uuid, p_month text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(
    (SELECT jsonb_build_object('student_id', f.student_id, 'month', f.month, 'ever_paid', f.ever_paid,
              'ever_signed', f.ever_signed, 'ever_frozen', f.ever_frozen,
              'max_recorded_payment', f.max_recorded_payment, 'first_at', f.first_at, 'last_at', f.last_at,
              'floor', true)
       FROM public.invoice_state_floor f WHERE f.student_id = p_student AND f.month = p_month),
    jsonb_build_object('student_id', p_student, 'month', p_month, 'ever_paid', false, 'ever_signed', false,
                       'ever_frozen', false, 'max_recorded_payment', 0, 'floor', false))
$fn$;

-- ---------------------------------------------------------------- 5
-- The keep triggers. Every one RETURNS the row it was given, unchanged.
--
-- A floor is kept only on a REAL lowering (review C-2): each trigger works
-- out what the row proves for each lesson it can touch, BEFORE and AFTER
-- the write (D1's own rules, item by item), and calls the keep only for a
-- lesson where that goes down. A pipeline status update, a re-signed mark
-- or a mark that rose is not a removal and writes nothing.

-- What one register row proves on its own (D1 items 1 and 4).
CREATE OR REPLACE FUNCTION public._floor_mark_level(p_status text, p_marked_by uuid)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE WHEN p_marked_by IS NULL THEN 0
              WHEN p_status IN ('Present', 'Late') THEN 2
              WHEN p_status = 'Absent' THEN 1
              ELSE 0 END
$fn$;

-- G-10 + keep for the register. HC024 on every lane; HC025 on the person
-- lane for a direct statement on a started lesson.
CREATE OR REPLACE FUNCTION public._attendance_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_lane text;
  s record;
  v_old int;
  v_new int;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.session_id IS DISTINCT FROM NEW.session_id
                           OR OLD.student_id IS DISTINCT FROM NEW.student_id) THEN
    RAISE EXCEPTION 'attendance_identity' USING ERRCODE = 'HC024',
      DETAIL = 'A register mark cannot be moved to another lesson or child. Change the mark instead.';
  END IF;

  IF OLD.marked_by IS NULL THEN
    -- A seeded / automatic row: not a person's evidence (D1 does not count it).
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() = 1 THEN
    v_lane := public._caller_lane();
    IF v_lane IN ('person', 'unknown')
       AND (TG_OP = 'DELETE' OR NEW.marked_by IS NULL) THEN
      SELECT ss.date, ss.start_time INTO s FROM public.sessions ss WHERE ss.id = OLD.session_id;
      IF FOUND AND COALESCE(public.session_has_started(s.date, s.start_time), true) THEN
        RAISE EXCEPTION 'attendance_requires_checked_path' USING ERRCODE = 'HC025',
          DETAIL = 'kind=' || CASE WHEN TG_OP = 'DELETE' THEN 'delete_mark' ELSE 'unmark' END
                   || '; A mark made by a person is changed, not removed.';
      END IF;
    END IF;
  END IF;

  v_old := public._floor_mark_level(OLD.status::text, OLD.marked_by);
  v_new := CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE public._floor_mark_level(NEW.status::text, NEW.marked_by) END;
  IF v_new < v_old THEN
    PERFORM public._session_evidence_keep(OLD.session_id,
      jsonb_build_object('table', 'attendance', 'what', 'attendance', 'op', TG_OP, 'row_id', OLD.id,
                         'student_id', OLD.student_id, 'old_status', OLD.status,
                         'new_status', CASE WHEN TG_OP = 'UPDATE' THEN NEW.status END,
                         'old_marked_by', OLD.marked_by,
                         'new_marked_by', CASE WHEN TG_OP = 'UPDATE' THEN NEW.marked_by END),
      CASE v_old WHEN 2 THEN 'STRONG' WHEN 1 THEN 'SOFT' ELSE 'NONE' END,
      CASE v_old WHEN 2 THEN 'D' WHEN 1 THEN 'R' END);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

-- What one point row proves for one lesson (D1 item 7): 1 = SOFT P, 0 = nothing.
CREATE OR REPLACE FUNCTION public._floor_point_level(
  p_lesson uuid, p_class uuid, p_date date,
  r_class uuid, r_date date, r_session uuid, r_type text, r_points integer, r_created_by uuid)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE WHEN r_class = p_class AND r_date = p_date
                   AND r_type IN ('participation', 'correction') AND COALESCE(r_points, 0) > 0
                   AND (r_session = p_lesson OR (r_session IS NULL AND r_created_by IS NOT NULL))
              THEN 1 ELSE 0 END
$fn$;

CREATE OR REPLACE FUNCTION public._point_evidence_keep()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  l record;
  v_old int;
  v_new int;
BEGIN
  -- Ascending id (A-12): two removals on one class-day lock floors in one order.
  FOR l IN
    SELECT ss.id, ss.class_id, ss.date FROM public.sessions ss
     WHERE ss.id = OLD.session_id OR (ss.class_id = OLD.class_id AND ss.date = OLD.date)
     ORDER BY ss.id
  LOOP
    v_old := public._floor_point_level(l.id, l.class_id, l.date,
               OLD.class_id, OLD.date, OLD.session_id, OLD.type::text, OLD.points::integer, OLD.created_by);
    v_new := CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE public._floor_point_level(l.id, l.class_id, l.date,
               NEW.class_id, NEW.date, NEW.session_id, NEW.type::text, NEW.points::integer, NEW.created_by) END;
    IF v_new < v_old THEN
      PERFORM public._session_evidence_keep(l.id,
        jsonb_build_object('table', 'point_transactions', 'what', 'points', 'op', TG_OP, 'row_id', OLD.id,
                           'student_id', OLD.student_id),
        'SOFT', 'P');
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

-- What one transcript row proves for one lesson (D1 items 3 and 8):
-- 2 = STRONG D (linked), 1 = SOFT T (unlinked, same day), 0 = nothing.
CREATE OR REPLACE FUNCTION public._floor_transcript_level(
  p_lesson uuid, p_class uuid, p_date date,
  r_class uuid, r_session uuid, r_tdate date, r_created timestamptz, r_status text, r_audio text)
RETURNS int LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT CASE WHEN r_class IS DISTINCT FROM p_class
                   OR NOT (r_status IS DISTINCT FROM 'failed' OR r_audio IS NOT NULL) THEN 0
              WHEN r_session = p_lesson THEN 2
              WHEN r_session IS NULL
                   AND (r_tdate = p_date OR (r_created AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = p_date) THEN 1
              ELSE 0 END
$fn$;

CREATE OR REPLACE FUNCTION public._transcript_evidence_keep()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  l record;
  v_day date := (OLD.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_old int;
  v_new int;
BEGIN
  FOR l IN
    SELECT ss.id, ss.class_id, ss.date FROM public.sessions ss
     WHERE ss.id = OLD.session_id
        OR (ss.class_id = OLD.class_id AND (ss.date = OLD.transcript_date OR ss.date = v_day))
     ORDER BY ss.id
  LOOP
    v_old := public._floor_transcript_level(l.id, l.class_id, l.date,
               OLD.class_id, OLD.session_id, OLD.transcript_date, OLD.created_at, OLD.status::text, OLD.audio_storage_path::text);
    v_new := CASE WHEN TG_OP = 'DELETE' THEN 0 ELSE public._floor_transcript_level(l.id, l.class_id, l.date,
               NEW.class_id, NEW.session_id, NEW.transcript_date, NEW.created_at, NEW.status::text, NEW.audio_storage_path::text) END;
    IF v_new < v_old THEN
      PERFORM public._session_evidence_keep(l.id,
        jsonb_build_object('table', 'class_transcripts', 'what', 'transcript', 'op', TG_OP, 'row_id', OLD.id,
                           'linked', OLD.session_id IS NOT NULL),
        CASE v_old WHEN 2 THEN 'STRONG' ELSE 'SOFT' END,
        CASE v_old WHEN 2 THEN 'D' ELSE 'T' END);
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

-- homeworks (D1 item 9) and homework_submissions (D1 item 10).
CREATE OR REPLACE FUNCTION public._homework_evidence_keep()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  l record;
  v_class uuid;
  v_day date;
  v_new_class uuid;
  v_new_day date;
  v_old_counts boolean := false;
  v_new_counts boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'homeworks' THEN
    -- Counts for the class on the Hanoi day it was set, unless it came from the Stars sync.
    IF OLD.created_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.stars_homework_map m WHERE m.homework_id = OLD.id) THEN
      v_class := OLD.class_id;
      v_day := (OLD.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      v_old_counts := true;
      IF TG_OP = 'UPDATE' AND NEW.created_at IS NOT NULL THEN
        v_new_class := NEW.class_id;
        v_new_day := (NEW.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
        v_new_counts := true;
      END IF;
    END IF;
  ELSE
    -- Counts for the homework's class on the Hanoi day it was graded, unless the sync graded it.
    IF OLD.graded_at IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.stars_sync_grade_state g
                        WHERE g.homework_id = OLD.homework_id AND g.student_id = OLD.student_id) THEN
      SELECT h.class_id INTO v_class FROM public.homeworks h WHERE h.id = OLD.homework_id;
      v_day := (OLD.graded_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      v_old_counts := v_class IS NOT NULL;
      IF TG_OP = 'UPDATE' AND NEW.graded_at IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.stars_sync_grade_state g
                          WHERE g.homework_id = NEW.homework_id AND g.student_id = NEW.student_id) THEN
        SELECT h.class_id INTO v_new_class FROM public.homeworks h WHERE h.id = NEW.homework_id;
        v_new_day := (NEW.graded_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
        v_new_counts := v_new_class IS NOT NULL;
      END IF;
    END IF;
  END IF;

  -- Lowered for the old day unless the row still counts for the same class and day.
  IF v_old_counts AND NOT (v_new_counts AND v_new_class = v_class AND v_new_day = v_day) THEN
    FOR l IN
      SELECT ss.id FROM public.sessions ss WHERE ss.class_id = v_class AND ss.date = v_day ORDER BY ss.id
    LOOP
      PERFORM public._session_evidence_keep(l.id,
        jsonb_build_object('table', TG_TABLE_NAME, 'what', 'homework', 'op', TG_OP, 'row_id', OLD.id),
        'SOFT', 'H');
    END LOOP;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

-- The lesson's own row. Records only: D2's trigger decides whether the
-- write is allowed (a refused write rolls the floor back too). Three real
-- lowerings: Held undone; the date changed (points, transcripts and
-- homework are matched to a lesson by its day); and the lesson made "not
-- started" by a later start time the same day (review C-1: after that every
-- keep, and G-10, would treat it as a lesson that has not happened).
CREATE OR REPLACE FUNCTION public._session_evidence_keep_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_unhold boolean := OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled';
  v_moved boolean := OLD.date IS DISTINCT FROM NEW.date;
  v_unstart boolean := COALESCE(public.session_has_started(OLD.date, OLD.start_time), false)
                       AND NOT COALESCE(public.session_has_started(NEW.date, NEW.start_time), false);
BEGIN
  IF v_unhold OR v_moved OR v_unstart THEN
    PERFORM public._session_evidence_keep(OLD.id,
      jsonb_build_object('table', 'sessions', 'what', 'session_status', 'op', TG_OP, 'row_id', OLD.id,
                         'old_status', OLD.status, 'new_status', NEW.status,
                         'old_date', OLD.date, 'new_date', NEW.date,
                         'old_start_time', OLD.start_time, 'new_start_time', NEW.start_time,
                         'unstarted', v_unstart),
      CASE WHEN OLD.status = 'Held' THEN 'SOFT' ELSE 'NONE' END, 'R');
  END IF;
  RETURN NEW;
END $fn$;

-- G-9: the bill-state floor. Every lane. Never changes NEW; refuses nothing.
CREATE OR REPLACE FUNCTION public._invoice_state_floor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_paid boolean := COALESCE(OLD.recorded_payment, 0) > 0 OR COALESCE(OLD.status::text IN ('paid', 'partial'), false);
  v_signed boolean := COALESCE(OLD.confirmation_status IN ('confirmed', 'adjusted'), false);
  v_frozen boolean := COALESCE(OLD.tuition_frozen, false);
  v_rec numeric := GREATEST(COALESCE(OLD.recorded_payment, 0), 0);
  v_what text[] := ARRAY[]::text[];
  v_cause jsonb;
BEGIN
  IF v_paid OR v_signed OR v_frozen THEN
    IF TG_OP = 'DELETE' THEN
      v_what := ARRAY['deleted'];
    ELSIF OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.month IS DISTINCT FROM NEW.month THEN
      v_what := ARRAY['moved'];          -- the old (child, month) loses its bill: as a delete
    ELSE
      IF v_signed AND NOT COALESCE(NEW.confirmation_status IN ('confirmed', 'adjusted'), false) THEN
        v_what := v_what || 'confirmation_status'::text;
      END IF;
      IF v_rec > 0 AND COALESCE(NEW.recorded_payment, 0) < v_rec THEN
        v_what := v_what || 'recorded_payment'::text;
      END IF;
      IF COALESCE(OLD.status::text IN ('paid', 'partial'), false)
         AND NOT COALESCE(NEW.status::text IN ('paid', 'partial'), false) THEN
        v_what := v_what || 'status'::text;
      END IF;
      IF v_frozen AND NOT COALESCE(NEW.tuition_frozen, false) THEN
        v_what := v_what || 'tuition_frozen'::text;
      END IF;
    END IF;

    IF cardinality(v_what) > 0 THEN
      v_cause := jsonb_build_object(
        'at', now(), 'what', to_jsonb(v_what), 'op', TG_OP, 'invoice_id', OLD.id,
        'old', jsonb_build_object('status', OLD.status, 'recorded_payment', OLD.recorded_payment,
                                  'confirmation_status', OLD.confirmation_status, 'tuition_frozen', OLD.tuition_frozen),
        'new', CASE WHEN TG_OP = 'UPDATE' THEN
                 jsonb_build_object('status', NEW.status, 'recorded_payment', NEW.recorded_payment,
                                    'confirmation_status', NEW.confirmation_status, 'tuition_frozen', NEW.tuition_frozen,
                                    'student_id', NEW.student_id, 'month', NEW.month) END,
        'actor_user_id', auth.uid(), 'lane', public._caller_lane());
      INSERT INTO public.invoice_state_floor AS f
        (student_id, month, ever_paid, ever_signed, ever_frozen, max_recorded_payment, causes)
      VALUES (OLD.student_id, OLD.month, v_paid, v_signed, v_frozen, v_rec, jsonb_build_array(v_cause))
      ON CONFLICT (student_id, month) DO UPDATE
         SET ever_paid   = f.ever_paid   OR EXCLUDED.ever_paid,
             ever_signed = f.ever_signed OR EXCLUDED.ever_signed,
             ever_frozen = f.ever_frozen OR EXCLUDED.ever_frozen,
             max_recorded_payment = GREATEST(f.max_recorded_payment, EXCLUDED.max_recorded_payment),
             causes  = public._floor_causes_push(f.causes, v_cause),
             last_at = now();
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS zz_attendance_evidence_guard ON public.attendance;
CREATE TRIGGER zz_attendance_evidence_guard BEFORE UPDATE OR DELETE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public._attendance_evidence_guard();

DROP TRIGGER IF EXISTS zz_point_evidence_keep ON public.point_transactions;
CREATE TRIGGER zz_point_evidence_keep BEFORE UPDATE OR DELETE ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public._point_evidence_keep();

DROP TRIGGER IF EXISTS zz_transcript_evidence_keep ON public.class_transcripts;
CREATE TRIGGER zz_transcript_evidence_keep BEFORE UPDATE OR DELETE ON public.class_transcripts
  FOR EACH ROW EXECUTE FUNCTION public._transcript_evidence_keep();

DROP TRIGGER IF EXISTS zz_homework_evidence_keep ON public.homeworks;
CREATE TRIGGER zz_homework_evidence_keep BEFORE UPDATE OR DELETE ON public.homeworks
  FOR EACH ROW EXECUTE FUNCTION public._homework_evidence_keep();

DROP TRIGGER IF EXISTS zz_homework_evidence_keep ON public.homework_submissions;
CREATE TRIGGER zz_homework_evidence_keep BEFORE UPDATE OR DELETE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public._homework_evidence_keep();

-- zz0_ sorts before D2's zz_session_change_guard_upd, so the level is read
-- before D2 judges the write; a write D2 refuses rolls this back with it.
DROP TRIGGER IF EXISTS zz0_session_evidence_keep ON public.sessions;
CREATE TRIGGER zz0_session_evidence_keep BEFORE UPDATE ON public.sessions FOR EACH ROW
  WHEN ((OLD.status = 'Held' AND NEW.status IS DISTINCT FROM 'Held' AND NEW.status IS DISTINCT FROM 'Canceled')
     OR OLD.date IS DISTINCT FROM NEW.date
     OR OLD.start_time IS DISTINCT FROM NEW.start_time)
  EXECUTE FUNCTION public._session_evidence_keep_trg();

-- zz_ sorts after keep_frozen_invoice_amounts: the floor sees the final NEW.
DROP TRIGGER IF EXISTS zz_invoice_state_floor ON public.invoices;
CREATE TRIGGER zz_invoice_state_floor BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public._invoice_state_floor();

-- Points had no audit (20261009130000 lists no point table): now they do.
DROP TRIGGER IF EXISTS audit_point_transactions ON public.point_transactions;
CREATE TRIGGER audit_point_transactions AFTER UPDATE OR DELETE ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ---------------------------------------------------------------- 6
-- The two replaced D2 bodies. Same signatures; D2's text with additions
-- only (docs/evidence/D4-build-1a.md has the diff).

CREATE OR REPLACE FUNCTION public._session_change_assess(s public.sessions, p_action text, p_change jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_ev jsonb;
  v_hash text;
  v_level text;
  v_settled_src boolean;
  v_started_src boolean;
  v_started boolean;
  v_settled boolean;
  v_refuse text;
  v_kind text;
  n public.sessions;
  v_change jsonb;
  v_src_month text := to_char(s.date, 'YYYY-MM');
  v_months text[];
  v_dest jsonb := NULL;
  v_dest_started boolean := false;
  v_dest_locked boolean := false;
  v_dest_tuition boolean := false;
  v_dest_day jsonb := NULL;
  v_tier int;
  v_affected jsonb;
  v_aff_fp text;
  v_invoices jsonb;
  v_inv_fp text;
  v_pairs jsonb;
  v_token text;
  v_marks int;
  -- D4 (floors)
  v_level_now text;
  v_floor jsonb;
  v_reg uuid[];
  v_res uuid[];
  v_kids uuid[];
  v_fp text;
  v_impact jsonb;
BEGIN
  v_ev := public.session_held_evidence(s.id);
  v_hash := v_ev ->> 'snapshot_hash';
  IF v_hash IS NULL OR v_ev -> 'settled' IS NULL OR jsonb_typeof(v_ev -> 'settled') <> 'object' THEN
    RAISE EXCEPTION 'evidence without its full view' USING ERRCODE = '55000';
  END IF;
  v_level_now := v_ev ->> 'level';
  v_level := public.session_effective_level(s.id, v_ev);
  SELECT to_jsonb(f) INTO v_floor FROM public.session_evidence_floor f WHERE f.session_id = s.id;

  -- Who has been on this register: today's rows, the children named by
  -- the floor's removals, and rows re-pointed away before D4 (audit_log).
  SELECT COALESCE(array_agg(DISTINCT a.student_id ORDER BY a.student_id), ARRAY[]::uuid[]) INTO v_reg
    FROM public.attendance a WHERE a.session_id = s.id;
  SELECT COALESCE(array_agg(DISTINCT (l.diff -> 'old' ->> 'student_id')::uuid ORDER BY (l.diff -> 'old' ->> 'student_id')::uuid), ARRAY[]::uuid[])
    INTO v_res
    FROM public.audit_log l
   WHERE l.entity = 'attendance'
     AND l.operation = 'UPDATE'
     AND l.changed_fields && ARRAY['session_id', 'student_id']
     AND l.diff -> 'old' ->> 'session_id' = s.id::text
     AND (l.diff -> 'old' ->> 'student_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND ((l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')
          OR (l.diff -> 'new' ->> 'student_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'student_id'));
  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), ARRAY[]::uuid[]) INTO v_kids FROM (
    SELECT a.student_id AS k FROM public.attendance a
     WHERE a.session_id = s.id AND (v_floor IS NOT NULL OR a.status IN ('Present', 'Absent', 'Late'))
    UNION
    SELECT (c ->> 'student_id')::uuid FROM jsonb_array_elements(COALESCE(v_floor -> 'causes', '[]'::jsonb)) c
     WHERE (c ->> 'student_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION
    SELECT unnest(v_res)
  ) q;

  v_settled_src := COALESCE((v_ev -> 'settled' ->> 'any')::boolean, true);
  -- D4 (G-9, R-1): a bill that was ever paid, signed or frozen still counts,
  -- and so does the settled state of every child who has been on the register.
  v_settled_src := v_settled_src OR EXISTS (
    SELECT 1 FROM unnest(v_kids) AS k(id)
      LEFT JOIN public.invoices i ON i.student_id = k.id AND i.month = v_src_month
      LEFT JOIN public.invoice_state_floor f ON f.student_id = k.id AND f.month = v_src_month
     WHERE COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)
        OR (i.id IS NOT NULL
            AND (COALESCE(i.recorded_payment, 0) > 0
                 OR i.status::text IN ('paid', 'partial')
                 OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
                 OR COALESCE(i.tuition_frozen, false))));
  v_started_src := public.session_has_started(s.date, s.start_time);
  v_started := v_started_src;
  v_settled := v_settled_src;
  v_months := ARRAY[v_src_month];

  IF p_action = 'cancel' THEN
    IF s.status = 'Canceled' THEN v_refuse := 'already_canceled'; END IF;
  ELSIF p_action = 'delete' THEN
    -- D4 (R-6): a lesson not cancelled is judged by what it has had; a lesson
    -- already cancelled by what it has NOW (D2 5.3 step 9, ruling OQ-1):
    -- cancel, then delete, still works in two calls.
    IF (s.status <> 'Canceled' AND v_level <> 'NONE')
       OR (s.status = 'Canceled' AND v_level_now <> 'NONE') THEN
      v_refuse := 'use_cancel';
    END IF;
  ELSIF p_action = 'uncancel' THEN
    IF s.status <> 'Canceled' THEN v_refuse := 'not_canceled'; END IF;
  ELSIF p_action = 'move' THEN
    IF s.status = 'Canceled' THEN
      v_refuse := 'already_canceled';
    ELSE
      BEGIN
        n := s;
        n.date       := (p_change ->> 'date')::date;
        n.start_time := (p_change ->> 'start_time')::time;
        n.end_time   := (p_change ->> 'end_time')::time;
      EXCEPTION WHEN OTHERS THEN
        n.date := NULL;
      END;
      IF n.date IS NULL OR n.start_time IS NULL OR n.end_time IS NULL OR n.end_time <= n.start_time THEN
        v_refuse := 'bad_change';
      ELSE
        v_kind := public.session_change_kind(s, n);
        IF v_kind IS DISTINCT FROM 'move' THEN
          v_refuse := 'bad_change';   -- B-1: an unguarded edit is not a move
        END IF;
        v_change := jsonb_build_object(
          'new_date', to_char(n.date, 'YYYY-MM-DD'),
          'new_start_time', to_char(n.start_time, 'HH24:MI:SS'),
          'new_end_time', to_char(n.end_time, 'HH24:MI:SS'));
        -- Review change 3: judge where it goes, not only where it comes from.
        v_dest_started := public.session_has_started(n.date, n.start_time);
        v_dest_locked  := public.payroll_month_is_locked(to_char(n.date, 'YYYY-MM'));
        v_dest_tuition := public.session_month_tuition_settled(s.id, to_char(n.date, 'YYYY-MM'))
                          -- D4 (G-9): the bill floor of the destination month too
                          OR EXISTS (SELECT 1 FROM unnest(v_kids) AS k(id)
                                       JOIN public.invoice_state_floor f
                                         ON f.student_id = k.id AND f.month = to_char(n.date, 'YYYY-MM')
                                      WHERE f.ever_paid OR f.ever_signed OR f.ever_frozen);
        v_dest_day := public.session_day_evidence(s.id, s.class_id, n.date);   -- revision 1, F-5
        v_dest := jsonb_build_object('month', to_char(n.date, 'YYYY-MM'), 'started', v_dest_started,
                                     'payroll_month_locked', v_dest_locked, 'tuition', v_dest_tuition,
                                     'any', v_dest_locked OR v_dest_tuition,
                                     'day_evidence', v_dest_day);
        v_change := v_change || jsonb_build_object('destination', v_dest);
        v_started := v_started_src OR v_dest_started;
        v_settled := v_settled_src OR v_dest_locked OR v_dest_tuition;
        IF to_char(n.date, 'YYYY-MM') <> v_src_month THEN
          v_months := v_months || to_char(n.date, 'YYYY-MM');
        END IF;
      END IF;
    END IF;
  ELSE
    v_refuse := 'bad_action';
  END IF;

  v_tier := public.session_change_tier(v_started, v_level, v_settled);
  -- Revision 1: landing on a day that already carries evidence is never
  -- a no-question move - at least a reason AND a confirmation (and review).
  IF COALESCE((v_dest_day ->> 'any')::boolean, false) AND v_tier < 1 THEN
    v_tier := 1;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'student_id', a.student_id, 'month', v_src_month, 'status', a.status,
           'marked_by_person', a.marked_by IS NOT NULL) ORDER BY a.student_id::text COLLATE "C"), '[]'::jsonb),
         md5(COALESCE(string_agg(a.student_id::text || ':' || a.status, ','
                                 ORDER BY a.student_id::text COLLATE "C"), '')),
         count(*) FILTER (WHERE (p_action = 'uncancel' AND a.status = 'Excused')
                              OR (p_action <> 'uncancel' AND a.status IS DISTINCT FROM 'Excused'))::int
    INTO v_affected, v_aff_fp, v_marks
    FROM public.attendance a
   WHERE a.session_id = s.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', i.id, 'student_id', i.student_id, 'month', i.month,
           'base_amount', i.base_amount, 'discount_amount', i.discount_amount, 'total_amount', i.total_amount,
           'recorded_payment', i.recorded_payment, 'status', i.status, 'confirmation_status', i.confirmation_status,
           'tuition_frozen', i.tuition_frozen, 'carry_in_credit', i.carry_in_credit, 'carry_in_debt', i.carry_in_debt,
           'carry_out_credit', i.carry_out_credit, 'carry_out_debt', i.carry_out_debt,
           'class_breakdown', i.class_breakdown) ORDER BY i.id::text COLLATE "C"), '[]'::jsonb),
         -- Review change 6: the token covers the bill fields the admin is shown
         -- (D-review-3 F-1: the preview now shows these stored figures, so the
         -- discount and base are covered as well).
         md5(COALESCE(jsonb_agg(jsonb_build_array(i.id, i.total_amount, i.recorded_payment, i.status,
                                                  i.confirmation_status, i.tuition_frozen,
                                                  i.discount_amount, i.base_amount)
                                ORDER BY i.id::text COLLATE "C")::text, ''))
    INTO v_invoices, v_inv_fp
    FROM public.invoices i
   WHERE i.month = ANY (v_months)
     AND (i.student_id IN (SELECT a.student_id FROM public.attendance a WHERE a.session_id = s.id)
          OR i.student_id = ANY (v_res));                     -- D4: G-10 residue

  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', st.student_id, 'month', m.month)
                            ORDER BY st.student_id::text COLLATE "C", m.month), '[]'::jsonb)
    INTO v_pairs
    FROM (SELECT DISTINCT a.student_id FROM public.attendance a WHERE a.session_id = s.id
          UNION
          SELECT unnest(v_res)) st                            -- D4: G-10 residue
    CROSS JOIN unnest(v_months) AS m(month);

  -- D4: version 3 = version 2's inputs + the level now, the floor's level and
  -- its causes (count and digest), so a removal between preview and confirm
  -- stales the token. The fingerprint is the same hash without the caller.
  v_token := encode(sha256(convert_to(jsonb_build_array(
      3, p_action, s.id, p_uid, v_tier, v_hash,
      s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
      to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
      v_change, v_aff_fp, v_inv_fp,
      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),
      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)
  )::text, 'UTF8')), 'hex');
  v_fp := encode(sha256(convert_to(jsonb_build_array(
      3, p_action, s.id, v_tier, v_hash,
      s.status, s.date, s.start_time, s.end_time, s.class_id, s.teacher_id,
      to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
      v_change, v_aff_fp, v_inv_fp,
      v_level_now, v_floor ->> 'level', jsonb_array_length(COALESCE(v_floor -> 'causes', '[]'::jsonb)),
      md5(COALESCE(v_floor -> 'causes', '[]'::jsonb)::text)
  )::text, 'UTF8')), 'hex');

  -- D4: impact, for the approval rules of step 4. Counts and stored figures
  -- only (bills now or their floor); nothing priced.
  SELECT jsonb_build_object(
           'tier', v_tier,
           'closed_payroll', COALESCE((v_ev -> 'settled' ->> 'payroll_month_locked')::boolean, true) OR v_dest_locked,
           'families', COALESCE(count(DISTINCT COALESCE(st.family_id::text, 'student:' || x.k::text))
                                  FILTER (WHERE x.settled), 0),
           'paid_vnd', COALESCE(sum(x.paid), 0))
    INTO v_impact
    FROM (SELECT k.id AS k, m.month,
                 GREATEST(COALESCE(i.recorded_payment, 0), COALESCE(f.max_recorded_payment, 0)) AS paid,
                 (COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)
                  OR COALESCE(i.recorded_payment, 0) > 0 OR COALESCE(i.status::text IN ('paid', 'partial'), false)
                  OR COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false)
                  OR COALESCE(i.tuition_frozen, false)) AS settled
            FROM (SELECT DISTINCT unnest(v_kids || v_reg) AS id) k
            CROSS JOIN unnest(v_months) AS m(month)
            LEFT JOIN public.invoices i ON i.student_id = k.id AND i.month = m.month
            LEFT JOIN public.invoice_state_floor f ON f.student_id = k.id AND f.month = m.month) x
    LEFT JOIN public.students st ON st.id = x.k;

  RETURN jsonb_build_object(
    'action', p_action,
    'session', jsonb_build_object('id', s.id, 'class_id', s.class_id, 'date', to_char(s.date, 'YYYY-MM-DD'),
                                  'start_time', s.start_time, 'end_time', s.end_time, 'status', s.status,
                                  'teacher_id', s.teacher_id, 'updated_at', s.updated_at),
    'started', v_started,
    'tier', v_tier,
    'level', v_level,
    'settled', v_ev -> 'settled',
    'settled_any', v_settled,
    'destination', v_dest,
    'change', v_change,
    'evidence', v_ev,
    'requires', jsonb_build_object('reason_min', 15,
                                   'confirm', v_tier >= 1 AND p_action <> 'uncancel',
                                   'correction_reason', v_tier = 3),
    'allowed', v_refuse IS NULL,
    'refuse_code', v_refuse,
    'affected', v_affected,
    'invoices_before', v_invoices,
    'refresh_pairs', v_pairs,
    'after_cancel', jsonb_build_object('marks_excused', CASE WHEN p_action = 'cancel' THEN v_marks END,
                                       'marks_excused_now', CASE WHEN p_action = 'uncancel' THEN v_marks END),
    'token', v_token,
    -- D4 (floors)
    'level_now', v_level_now,
    'floor', v_floor,
    'fingerprint', v_fp,
    'impact', v_impact);
END $fn$;

-- Review change 4: evidence erased in the 30 days before, from audit_log.
-- Only read inside the RPCs and the preview (one call per change), never
-- in the trigger.
--
-- Revision 1 (D-review-2 F-1): a register row RE-PARENTED away from this
-- lesson (`UPDATE attendance SET session_id = <another lesson>`) is erased
-- evidence too, whatever its status or who marked it: it takes the mark
-- AND the child's bill line with it, and nothing in the app needs that
-- write. Counted fail-closed (any status, seeded or not), so a lesson
-- stripped that way is always reviewed. Refusing the write itself is D4.
--
-- D4: plus the evidence floor's causes of the last 30 days (points,
-- transcripts, homework, register marks and the Held status removed while
-- the lesson had started), so such a change is always reviewed.
CREATE OR REPLACE FUNCTION public._session_erased_recently(p_session_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(jsonb_agg(x ORDER BY x ->> 'occurred_at', x::text), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('what', 'attendance', 'operation', l.operation,
             'student_id', l.diff -> 'old' ->> 'student_id',
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'new_marked_by_null', (l.diff -> 'new') IS NOT NULL AND (l.diff -> 'new' ->> 'marked_by') IS NULL,
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at) AS x
      FROM public.audit_log l
     WHERE l.entity = 'attendance'
       AND l.operation IN ('UPDATE', 'DELETE')
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'session_id' = p_session_id::text
       AND l.diff -> 'old' ->> 'status' IN ('Present', 'Late')
       AND (l.diff -> 'old' ->> 'marked_by') IS NOT NULL
       AND (l.operation = 'DELETE'      -- a re-parent is reported by the next branch instead
            OR (l.diff -> 'new' ->> 'session_id') IS NOT DISTINCT FROM (l.diff -> 'old' ->> 'session_id')
               AND (l.diff -> 'new' ->> 'student_id') IS NOT DISTINCT FROM (l.diff -> 'old' ->> 'student_id'))
       AND (l.operation = 'DELETE'
            OR (l.diff -> 'new' ->> 'status') IS DISTINCT FROM (l.diff -> 'old' ->> 'status')
               AND (l.diff -> 'new' ->> 'status') NOT IN ('Present', 'Late')
            OR (l.diff -> 'new' ->> 'marked_by') IS NULL)
    UNION ALL
    SELECT jsonb_build_object('what', 'attendance_reparented', 'operation', l.operation,
             'student_id', l.diff -> 'old' ->> 'student_id',
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'old_marked_by_person', (l.diff -> 'old' ->> 'marked_by') IS NOT NULL,
             'new_session_id', l.diff -> 'new' ->> 'session_id',
             'new_student_id', l.diff -> 'new' ->> 'student_id',
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at)
      FROM public.audit_log l
     WHERE l.entity = 'attendance'
       AND l.operation = 'UPDATE'
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'session_id' = p_session_id::text
       -- D-review-3 F-10: a mark re-pointed at another CHILD is erased too.
       AND ((l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')
            OR (l.diff -> 'new' ->> 'student_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'student_id'))
    UNION ALL
    SELECT jsonb_build_object('what', 'session_status', 'operation', l.operation,
             'old_status', l.diff -> 'old' ->> 'status', 'new_status', l.diff -> 'new' ->> 'status',
             'actor_user_id', l.actor_user_id, 'occurred_at', l.occurred_at)
      FROM public.audit_log l
     WHERE l.entity = 'sessions'
       AND l.entity_id = p_session_id::text
       AND l.occurred_at >= now() - interval '30 days'
       AND l.diff -> 'old' ->> 'status' = 'Held'
       AND (l.diff -> 'new' ->> 'status') IS DISTINCT FROM 'Held'
    UNION ALL
    -- D4 (G-8): what the evidence floor recorded as removed.
    SELECT jsonb_build_object('what', COALESCE(c ->> 'what', c ->> 'table'), 'source', 'floor',
             'operation', c ->> 'op', 'table', c ->> 'table', 'row_id', c ->> 'row_id',
             'student_id', c ->> 'student_id', 'old_status', c ->> 'old_status', 'new_status', c ->> 'new_status',
             'level', c ->> 'level', 'lane', c ->> 'lane',
             'actor_user_id', c ->> 'actor_user_id', 'occurred_at', c -> 'at')
      FROM public.session_evidence_floor f
      CROSS JOIN LATERAL jsonb_array_elements(f.causes) AS c
     WHERE f.session_id = p_session_id
       AND (c ->> 'at') IS NOT NULL
       AND (c ->> 'at')::timestamptz >= now() - interval '30 days'
  ) q
$fn$;

-- ---------------------------------------------------------------- 7
-- Function grants. Nothing in this file is an RPC: every function is
-- called only by the triggers and definer functions above. The two
-- replaced D2 functions keep their grants (none): re-stated, unchanged.

REVOKE ALL ON FUNCTION
  public._caller_lane(),
  public._floor_table_guard(),
  public._floor_families_or(jsonb, jsonb),
  public._floor_causes_push(jsonb, jsonb),
  public._session_evidence_keep(uuid, jsonb, text, text),
  public._floor_mark_level(text, uuid),
  public._floor_point_level(uuid, uuid, date, uuid, date, uuid, text, integer, uuid),
  public._floor_transcript_level(uuid, uuid, date, uuid, uuid, date, timestamptz, text, text),
  public.session_effective_level(uuid, jsonb),
  public.invoice_floor_state(uuid, text),
  public._attendance_evidence_guard(),
  public._point_evidence_keep(),
  public._transcript_evidence_keep(),
  public._homework_evidence_keep(),
  public._session_evidence_keep_trg(),
  public._invoice_state_floor(),
  public._session_change_assess(public.sessions, text, jsonb, uuid),
  public._session_erased_recently(uuid)
FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(c.relname || '.' || t.tgname || '=' || t.tgenabled::text, ', ' ORDER BY c.relname, t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal
      AND t.tgname IN ('zz_attendance_evidence_guard', 'zz_point_evidence_keep', 'zz_transcript_evidence_keep',
                       'zz_homework_evidence_keep', 'zz0_session_evidence_keep', 'zz_invoice_state_floor',
                       'audit_point_transactions'))                                AS d4_floor_triggers,
  (SELECT count(*) FROM public.session_evidence_floor)                            AS evidence_floor_rows,
  (SELECT count(*) FROM public.invoice_state_floor)                               AS invoice_floor_rows;
