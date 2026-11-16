-- D4 step 2: dated class fees (G-16, review R-9).
--
-- Spec: docs/evidence/D4-design.md revision 2, sections b.4 G-16, c.0, c.3,
-- (d) "Step 2", f.7 rollback 3. Build notes and the decisions the design left
-- open: docs/evidence/D4-build-2.md.
--
-- WHY. Until now every lesson of every month was priced at the class's
-- CURRENT fee (classes.session_rate_vnd), so an honest fee rise re-priced
-- every unfrozen past bill of the class the next time it was opened. From
-- this file on a class has a fee HISTORY: one row per month the fee changed
-- (effective_from is the first day of a month), plus a baseline row dated
-- 1900-01-01 with the fee the class has today, so no figure moves when this
-- is pasted. calculate-tuition, calculate-tuition-bulk and
-- _lib/projected-per-class.ts price each lesson at the fee in force on its
-- date (_lib/class-fee.ts, classFeeOn).
--
-- WHAT THIS ADDS
--   table     class_fee_history (class_id, effective_from, session_rate_vnd,
--             note, created_at, created_by); plain UNIQUE (class_id,
--             effective_from); RLS: staff read, NO write policy, SELECT only
--             for authenticated
--   rows      ONLY in the new table: a 1900-01-01 row per class, with the
--             class's fee today. No class, lesson, mark or bill is touched.
--   function  class_fee_on(class, date)   the fee in force that day
--   triggers  classes.class_fee_baseline            AFTER INSERT: a new
--                                                   class's 1900 row
--             classes.zz_class_fee_mirror_guard     the mirror column
--             class_fee_history.zz_class_fee_money_guard
--             class_fee_history.class_fee_history_no_truncate
--             class_fee_history.audit_class_fee_history  (the generic
--                                                   audit_row_change)
--   entity    'class_fee' of the step 1b dispatcher: ops 'set' (a fee from
--             the first of a month; a same-month row is updated) and
--             'remove' (never the 1900 row). The dispatcher is NOT
--             re-created: it already names _money_plan__class_fee /
--             _money_exec__class_fee, which this file adds.
--
-- WHAT IT REFUSES
--   * any write to class_fee_history that is not acknowledged by
--     money_change_checked('class_fee', ...) in the same transaction, on
--     every lane but the owner's (SQL editor) - HC120. Trigger-made writes
--     pass only for what the two triggers make: a new class's 1900 row, and
--     the rows of a deleted class (FK cascade).
--   * a fee row changing class or month (HC121 fee_row_identity), deleting
--     the 1900 row (HC121 baseline_row), TRUNCATE (HC121) - on every lane.
--   * classes.session_rate_vnd ("the fee now", a mirror) set to anything
--     but the history's fee for today, except by the owner - HC120.
-- The tier of a fee change is the tier of the bills it reaches: children with
-- a billable mark on a lesson of the class from the row's month up to the
-- next row (widened to their families), through tuition_month_state. A fee
-- from next month reaches nothing: T0. A row dated in a past month is a
-- correction: T1-T3. refresh_pairs never holds a month before the row's.
--
-- REPLACES NOTHING of D1, D2, D4 file 1 or D4 file 2. No existing row is
-- changed. Safe to paste twice.
--
-- Rollback: scripts/ROLLBACK-d4-3-class-fee.sql.

BEGIN;

-- CREATE TRIGGER locks classes; fail fast instead of queueing behind it.
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
-- Preflight. Refuse loudly, install nothing.

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_neg text;
  r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'public._caller_lane()',
    'public._session_require_admin()',
    'public.has_role(uuid, public.app_role)',
    'public.tuition_month_state(uuid, text)',
    'public.tuition_reach(uuid[], uuid, date, date)',
    'public._money_ack(text[], uuid, uuid, date, date, integer)',
    'public._money_change_plan(text, text, jsonb, uuid)',
    'public._money_change_exec(text, jsonb, uuid)',
    'public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid)',
    'public.money_change_checked(text, text, jsonb, text, text, boolean, text, jsonb)',
    'public.audit_row_change()',
    'auth.uid()',
    'txid_current()'
  ]) AS sig LOOP
    IF to_regprocedure(r.sig) IS NULL THEN
      v_missing := v_missing || ('function ' || r.sig);
    END IF;
  END LOOP;
  -- The step 1a / 1b bodies this file relies on, as reviewed and live (md5 of
  -- the LF text: live 1a was pasted with CRLF, so CR is stripped first).
  FOR r IN SELECT * FROM (VALUES
      ('public._caller_lane()', '66001c3b6eb716a6380e4155fba75409'),
      ('public.tuition_month_state(uuid, text)', '733840210ed1f3360fb9c3122d5466b9'),
      ('public.tuition_reach(uuid[], uuid, date, date)', 'd48607bb917eb05de1acd586e0c83b4f'),
      ('public._money_ack(text[], uuid, uuid, date, date, integer)', '471a55638387068f1279a2d7c669c4c4'),
      ('public._money_change_plan(text, text, jsonb, uuid)', '3efa9ebcb79c47c65947f2636e07edd0'),
      ('public._money_change_exec(text, jsonb, uuid)', 'b5efef0f546d40e397daa3fd0648db06'),
      ('public._money_change_apply(text, text, jsonb, text, text, boolean, text, jsonb, text, uuid)', '7f03dfffb2532174d6d8ed9733f5fd7f')) AS t(sig, want)
  LOOP
    IF to_regprocedure(r.sig) IS NOT NULL
       AND (SELECT md5(replace(p.prosrc, E'\r', '')) FROM pg_proc p WHERE p.oid = to_regprocedure(r.sig)) IS DISTINCT FROM r.want THEN
      v_missing := v_missing || ('function ' || r.sig || ' is not the reviewed step 1a/1b body (expected md5 ' || r.want || ')');
    END IF;
  END LOOP;
  FOR r IN
    SELECT * FROM (VALUES
      ('classes',                ARRAY['id','session_rate_vnd']),
      ('sessions',               ARRAY['id','class_id','date','status']),
      ('attendance',             ARRAY['session_id','student_id','status']),
      ('money_change_overrides', ARRAY['id','txid','entity','op','target_id','change','reach_from','reach_to','tier']),
      ('money_change_events',    ARRAY['kind','payload','actor_user_id']),
      ('audit_log',              ARRAY['entity','action'])
    ) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NULL THEN
      v_missing := v_missing || ('table public.' || r.tbl || CASE WHEN r.tbl LIKE 'money_change%'
                                 THEN ' (paste 20261114091000_d4_core_register first)' ELSE '' END);
    ELSE
      v_missing := v_missing || ARRAY(
        SELECT 'column public.' || r.tbl || '.' || c FROM unnest(r.cols) AS c
         WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                            WHERE ic.table_schema = 'public' AND ic.table_name = r.tbl AND ic.column_name = c));
    END IF;
  END LOOP;
  IF to_regclass('public.money_change_overrides') IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM pg_constraint k WHERE k.conrelid = 'public.money_change_overrides'::regclass
          AND k.contype = 'c' AND pg_get_constraintdef(k.oid) LIKE '%''class_fee''%') THEN
    v_missing := v_missing || 'money_change_overrides.entity accepting class_fee'::text;
  END IF;
  IF to_regclass('public.money_change_events') IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM pg_constraint k WHERE k.conrelid = 'public.money_change_events'::regclass
          AND k.contype = 'c' AND pg_get_constraintdef(k.oid) LIKE '%''owner_lane''%') THEN
    v_missing := v_missing || 'money_change_events.kind accepting owner_lane'::text;
  END IF;
  -- A negative fee cannot be carried into the history (its CHECK) without
  -- changing what is billed; stop and say so rather than round it.
  IF to_regclass('public.classes') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns ic
                  WHERE ic.table_schema = 'public' AND ic.table_name = 'classes' AND ic.column_name = 'session_rate_vnd') THEN
    SELECT string_agg(c.id::text, ', ' ORDER BY c.id) INTO v_neg FROM public.classes c WHERE c.session_rate_vnd < 0;
    IF v_neg IS NOT NULL THEN
      v_missing := v_missing || ('a fee of 0 or more for the classes ' || v_neg);
    END IF;
  END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'd4_class_fee_history cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste the D4 steps 1a and 1b first (20261114090000, 20261114091000). Nothing was changed.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------- 1
-- The table. First-of-month rows (plus the 1900 baseline), so a class has
-- ONE fee per month and class_breakdown[].session_rate_vnd keeps its meaning.

CREATE TABLE IF NOT EXISTS public.class_fee_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  effective_from   date NOT NULL
                   CONSTRAINT class_fee_history_first_of_month
                   CHECK (effective_from = DATE '1900-01-01' OR EXTRACT(DAY FROM effective_from) = 1),
  session_rate_vnd integer NOT NULL CONSTRAINT class_fee_history_fee_not_negative CHECK (session_rate_vnd >= 0),
  note             text CONSTRAINT class_fee_history_note_size CHECK (note IS NULL OR length(note) <= 500),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  CONSTRAINT class_fee_history_class_month_key UNIQUE (class_id, effective_from)   -- plain, not partial
);

ALTER TABLE public.class_fee_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_fee_history_staff_read ON public.class_fee_history;
CREATE POLICY class_fee_history_staff_read ON public.class_fee_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role));
-- No INSERT / UPDATE / DELETE policy and no such grant for authenticated: the
-- rows are written by the checked op and the baseline trigger only. GRANTs
-- are explicit (20260712023825 revoked the defaults on public).
REVOKE ALL ON public.class_fee_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.class_fee_history TO authenticated;
GRANT ALL ON public.class_fee_history TO service_role;   -- house rule; zz_class_fee_money_guard refuses its writes

-- The baseline, idempotent: one 1900-01-01 row per class that has none, at
-- the fee it has today. Rows in the NEW table only. Runs before the guard
-- exists on a first paste; on a re-paste no class lacks its row.
INSERT INTO public.class_fee_history (class_id, effective_from, session_rate_vnd, note)
SELECT c.id, DATE '1900-01-01', COALESCE(c.session_rate_vnd, 0), 'Baseline: the fee when dated fees were installed'
  FROM public.classes c
 WHERE NOT EXISTS (SELECT 1 FROM public.class_fee_history h WHERE h.class_id = c.id AND h.effective_from = DATE '1900-01-01')
ON CONFLICT (class_id, effective_from) DO NOTHING;

-- ---------------------------------------------------------------- 2
-- The resolver: the row with the greatest effective_from <= the date. NULL
-- when the class has no row (the readers then use the mirror, as before).

CREATE OR REPLACE FUNCTION public.class_fee_on(p_class uuid, p_date date)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT h.session_rate_vnd FROM public.class_fee_history h
   WHERE h.class_id = p_class AND h.effective_from <= p_date
   ORDER BY h.effective_from DESC LIMIT 1
$fn$;

-- The reach of a fee change at p_from: the lessons of the class from p_from
-- up to the next row (exclusive), when the fee they are priced at moves.
-- Children = those with a billable mark (Present / Absent / Late) on such a
-- lesson that is not cancelled - the calculators bill nothing else - widened
-- to their families and turned into a tier by tuition_reach (step 1b), over
-- the months of those lessons only: never a month before p_from.
CREATE OR REPLACE FUNCTION public._class_fee_reach(p_class uuid, p_from date, p_fee_before integer, p_fee_after integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_next date;
  v_to date;
  v_kids uuid[];
  v_min date;
  v_max date;
  v_n int := 0;
  v_moves boolean := p_fee_before IS DISTINCT FROM p_fee_after;
  v jsonb;
BEGIN
  SELECT min(h.effective_from) INTO v_next FROM public.class_fee_history h
   WHERE h.class_id = p_class AND h.effective_from > p_from;
  v_to := v_next - 1;
  IF v_moves THEN
    SELECT array_agg(DISTINCT a.student_id ORDER BY a.student_id), min(s.date), max(s.date), count(DISTINCT s.id)::int
      INTO v_kids, v_min, v_max, v_n
      FROM public.sessions s JOIN public.attendance a ON a.session_id = s.id
     WHERE s.class_id = p_class AND s.date >= p_from AND (v_next IS NULL OR s.date < v_next)
       AND s.status::text <> 'Canceled' AND a.status::text IN ('Present', 'Absent', 'Late');
  END IF;
  IF v_kids IS NULL OR cardinality(v_kids) = 0 THEN
    v := jsonb_build_object('tier', 0, 'students', '[]'::jsonb, 'months', '[]'::jsonb, 'pairs', '[]'::jsonb,
                            'invoices_before', '[]'::jsonb, 'refresh_pairs', '[]'::jsonb, 'fp', md5('none'),
                            'impact', jsonb_build_object('families', 0, 'paid_vnd', 0, 'closed_payroll', false));
  ELSE
    v := public.tuition_reach(v_kids, p_class, v_min, v_max);
  END IF;
  RETURN v || jsonb_build_object(
    'window_from', p_from, 'window_to', v_to, 'moves', v_moves, 'lessons', COALESCE(v_n, 0),
    'fee_before', p_fee_before, 'fee_after', p_fee_after,
    'fp', md5(COALESCE(v ->> 'fp', '') || '|' || p_from::text || '|' || COALESCE(v_to::text, 'open') || '|'
              || COALESCE(p_fee_before::text, 'null') || '|' || COALESCE(p_fee_after::text, 'null') || '|' || COALESCE(v_n, 0)));
END $fn$;

-- ---------------------------------------------------------------- 3
-- The guard on the history (G-16). In order:
--   identity  a row keeps its class and month (HC121, every lane)
--   depth     trigger-made writes pass only as what our triggers make: a new
--             class's first (1900) row, the rows of a class being deleted
--   baseline  the 1900 row is never deleted (HC121, every lane)
--   ack       money_change_checked('class_fee', ...) of THIS transaction for
--             this class and month, op and fee as written, stored at a tier
--             not lower than this write's (else HC011, A-8) -> pass
--   owner     the SQL editor passes, and leaves an owner_lane event when the
--             write reaches a billed month (A-1)
--   else      HC120: the service role, a person, an API role with no user -
--             whatever the tier, so every fee row has its override row.
CREATE OR REPLACE FUNCTION public._class_fee_money_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_class uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.class_id ELSE NEW.class_id END;
  v_from date := CASE WHEN TG_OP = 'DELETE' THEN OLD.effective_from ELSE NEW.effective_from END;
  v_before integer;
  v_after integer;
  v_reach jsonb;
  v_tier int;
  v_ok boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.class_id IS DISTINCT FROM NEW.class_id OR OLD.effective_from IS DISTINCT FROM NEW.effective_from) THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=fee_row_identity; A fee row keeps its class and its month. Remove it and add a new fee from the right month.';
  END IF;
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'INSERT' AND NEW.effective_from = DATE '1900-01-01'
       AND NOT EXISTS (SELECT 1 FROM public.class_fee_history h WHERE h.class_id = NEW.class_id) THEN
      RETURN NEW;     -- class_fee_baseline: a new class's first row
    END IF;
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = OLD.class_id) THEN
      RETURN OLD;     -- the FK cascade of a class being deleted
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.effective_from = DATE '1900-01-01' THEN
    RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
      DETAIL = 'code=baseline_row; The first fee of a class is never removed. Add a new fee from a month instead.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_before := public.class_fee_on(v_class, v_from);
    v_after := NEW.session_rate_vnd;
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := OLD.session_rate_vnd;
    v_after := NEW.session_rate_vnd;
  ELSE
    v_before := OLD.session_rate_vnd;
    v_after := public.class_fee_on(v_class, v_from - 1);
  END IF;
  v_reach := public._class_fee_reach(v_class, v_from, v_before, v_after);
  v_tier := COALESCE((v_reach ->> 'tier')::int, 3);

  IF public._money_ack(ARRAY['class_fee'], v_class, NULL, v_from, NULL, v_tier) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.money_change_overrides o
       WHERE o.id::text = current_setting('hec.money_change_ack', true) AND o.txid = txid_current()
         AND o.entity = 'class_fee' AND o.target_id = v_class
         AND o.change ->> 'class_id' = v_class::text AND (o.change ->> 'effective_from')::date = v_from
         AND ((TG_OP <> 'DELETE' AND o.op = 'set' AND (o.change ->> 'session_rate_vnd')::int = NEW.session_rate_vnd)
           OR (TG_OP = 'DELETE' AND o.op = 'remove')))
      INTO v_ok;
    IF v_ok THEN
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
  END IF;

  IF public._caller_lane() = 'owner' THEN
    IF v_tier > 0 THEN
      INSERT INTO public.money_change_events (kind, payload)
      VALUES ('owner_lane', jsonb_build_object('table', 'class_fee_history', 'op', TG_OP, 'class_id', v_class,
                                               'effective_from', v_from, 'fee_before', v_before, 'fee_after', v_after,
                                               'tier', v_tier, 'refresh_pairs', v_reach -> 'refresh_pairs'));
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION 'money_change_requires_checked_path' USING ERRCODE = 'HC120',
    DETAIL = 'entity=class_fee; tier=' || v_tier || '; Change the fee from the class''s fee history, from a month, with a reason.';
END $fn$;

DROP TRIGGER IF EXISTS zz_class_fee_money_guard ON public.class_fee_history;
CREATE TRIGGER zz_class_fee_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.class_fee_history
  FOR EACH ROW EXECUTE FUNCTION public._class_fee_money_guard();

CREATE OR REPLACE FUNCTION public._class_fee_no_truncate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',
    DETAIL = 'code=fee_history_truncate; The fee history is never emptied.';
END $fn$;

DROP TRIGGER IF EXISTS class_fee_history_no_truncate ON public.class_fee_history;
CREATE TRIGGER class_fee_history_no_truncate BEFORE TRUNCATE ON public.class_fee_history
  FOR EACH STATEMENT EXECUTE FUNCTION public._class_fee_no_truncate();

-- Every row change in audit_log too (the generic trigger of 20261009130000):
-- the owner lane's writes included, which have no override row.
DROP TRIGGER IF EXISTS audit_class_fee_history ON public.class_fee_history;
CREATE TRIGGER audit_class_fee_history AFTER INSERT OR UPDATE OR DELETE ON public.class_fee_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ---------------------------------------------------------------- 4
-- classes: a new class gets its 1900 row; the mirror column is "the fee now".

CREATE OR REPLACE FUNCTION public._class_fee_baseline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.class_fee_history (class_id, effective_from, session_rate_vnd, note, created_by)
  VALUES (NEW.id, DATE '1900-01-01', COALESCE(NEW.session_rate_vnd, 0), 'The fee the class was created with', auth.uid())
  ON CONFLICT (class_id, effective_from) DO NOTHING;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS class_fee_baseline ON public.classes;
CREATE TRIGGER class_fee_baseline AFTER INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public._class_fee_baseline();

-- classes.session_rate_vnd may only be set to the history's fee for today
-- (Hanoi) - which is all the checked op writes - or by the owner (recorded).
-- Anyone else: HC120. A save that sends the column unchanged never fires.
CREATE OR REPLACE FUNCTION public._class_fee_mirror_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_fee integer := public.class_fee_on(NEW.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
BEGIN
  IF v_fee IS NOT NULL AND NEW.session_rate_vnd = v_fee THEN
    RETURN NEW;
  END IF;
  IF public._caller_lane() = 'owner' THEN
    INSERT INTO public.money_change_events (kind, payload)
    VALUES ('owner_lane', jsonb_build_object('table', 'classes', 'column', 'session_rate_vnd', 'class_id', NEW.id,
                                             'old', OLD.session_rate_vnd, 'new', NEW.session_rate_vnd, 'history_fee_today', v_fee));
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'money_change_requires_checked_path' USING ERRCODE = 'HC120',
    DETAIL = 'entity=class_fee; Change the fee from the class''s fee history, from a month, with a reason.';
END $fn$;

DROP TRIGGER IF EXISTS zz_class_fee_mirror_guard ON public.classes;
CREATE TRIGGER zz_class_fee_mirror_guard BEFORE UPDATE OF session_rate_vnd ON public.classes
  FOR EACH ROW WHEN (OLD.session_rate_vnd IS DISTINCT FROM NEW.session_rate_vnd)
  EXECUTE FUNCTION public._class_fee_mirror_guard();

-- ---------------------------------------------------------------- 5
-- The 'class_fee' entity of the step 1b dispatcher.
--   set    {class_id, effective_from: 'YYYY-MM-01', session_rate_vnd, note?}
--          inserts the month's row, or updates it when the month has one
--   remove {class_id, effective_from}      never the 1900 row
-- Then the mirror is brought to class_fee_on(class, today).

CREATE OR REPLACE FUNCTION public._money_plan__class_fee(p_op text, p_args jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_class uuid;
  v_from date;
  v_fee integer;
  v_note text;
  v_refuse text;
  v_row public.class_fee_history;
  v_has_row boolean;
  v_hist jsonb;
  v_mirror integer;
  v_before integer;
  v_after integer;
  v_reach jsonb;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_now_after integer;
  v_change jsonb;
BEGIN
  IF p_op IS NULL OR p_op NOT IN ('set', 'remove') THEN
    RETURN jsonb_build_object('refuse_code', 'bad_op');
  END IF;
  IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object'
     OR COALESCE(p_args ->> 'class_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR COALESCE(p_args ->> 'effective_from', '') !~ '^\d{4}-(0[1-9]|1[0-2])-01$' THEN
    RETURN jsonb_build_object('refuse_code', 'bad_args');
  END IF;
  v_class := (p_args ->> 'class_id')::uuid;
  v_from := (p_args ->> 'effective_from')::date;
  IF p_op = 'set' THEN
    IF COALESCE(jsonb_typeof(p_args -> 'session_rate_vnd'), 'missing') NOT IN ('number', 'string')
       OR COALESCE(p_args ->> 'session_rate_vnd', '') !~ '^\d{1,9}$'
       OR (p_args ? 'note' AND jsonb_typeof(p_args -> 'note') NOT IN ('string', 'null')) THEN
      RETURN jsonb_build_object('refuse_code', 'bad_args');
    END IF;
    v_fee := (p_args ->> 'session_rate_vnd')::integer;
    v_note := NULLIF(btrim(COALESCE(p_args ->> 'note', '')), '');
    IF length(v_note) > 500 THEN RETURN jsonb_build_object('refuse_code', 'bad_args'); END IF;
  END IF;

  SELECT c.session_rate_vnd INTO v_mirror FROM public.classes c WHERE c.id = v_class;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('entity', 'class_fee', 'op', p_op, 'target_id', v_class, 'tier', 0, 'refuse_code', 'not_found',
                              'row_before', '{}'::jsonb, 'change', '{}'::jsonb, 'reach', '{}'::jsonb,
                              'invoices_before', '[]'::jsonb, 'refresh_pairs', '[]'::jsonb, 'impact', '{}'::jsonb);
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('effective_from', h.effective_from, 'session_rate_vnd', h.session_rate_vnd,
                                               'note', h.note, 'created_at', h.created_at, 'created_by', h.created_by)
                            ORDER BY h.effective_from), '[]'::jsonb)
    INTO v_hist FROM public.class_fee_history h WHERE h.class_id = v_class;
  SELECT * INTO v_row FROM public.class_fee_history h WHERE h.class_id = v_class AND h.effective_from = v_from;
  v_has_row := FOUND;

  IF NOT EXISTS (SELECT 1 FROM public.class_fee_history h WHERE h.class_id = v_class AND h.effective_from = DATE '1900-01-01') THEN
    v_refuse := 'no_baseline';
  END IF;
  IF p_op = 'set' THEN
    v_before := public.class_fee_on(v_class, v_from);
    v_after := v_fee;
    IF v_refuse IS NULL AND v_before IS NOT DISTINCT FROM v_fee
       AND (NOT v_has_row OR v_row.note IS NOT DISTINCT FROM v_note) THEN
      v_refuse := 'nothing_to_change';
    END IF;
  ELSE
    IF v_from = DATE '1900-01-01' THEN
      v_refuse := COALESCE(v_refuse, 'baseline_row');
    ELSIF NOT v_has_row THEN
      v_refuse := COALESCE(v_refuse, 'not_found');
    END IF;
    v_before := v_row.session_rate_vnd;
    v_after := public.class_fee_on(v_class, v_from - 1);
  END IF;
  IF v_refuse IS NOT NULL THEN
    v_before := v_after;     -- a refused change reaches nothing
  END IF;

  v_reach := public._class_fee_reach(v_class, v_from, v_before, v_after);
  -- what the mirror ("the fee now") will read afterwards
  v_now_after := CASE WHEN v_today >= v_from AND (v_reach ->> 'window_to' IS NULL OR v_today <= (v_reach ->> 'window_to')::date)
                      THEN v_after ELSE public.class_fee_on(v_class, v_today) END;
  v_change := jsonb_build_object(
    'class_id', v_class, 'effective_from', v_from, 'session_rate_vnd', v_fee, 'note', v_note,
    'fee_before', v_before, 'fee_after', v_after,
    'window_from', v_reach -> 'window_from', 'window_to', v_reach -> 'window_to',
    'lessons', v_reach -> 'lessons', 'moves', v_reach -> 'moves',
    'fee_now', public.class_fee_on(v_class, v_today), 'fee_now_after', v_now_after);

  RETURN jsonb_build_object(
    'entity', 'class_fee', 'op', p_op, 'target_id', v_class,
    'student_ids', COALESCE(v_reach -> 'students', '[]'::jsonb),
    'row_before', jsonb_build_object('row', CASE WHEN v_has_row THEN to_jsonb(v_row) ELSE NULL END,
                                     'history', v_hist, 'mirror', v_mirror),
    'change', v_change,
    'reach_from', v_from, 'reach_to', v_reach -> 'window_to',
    'reach', jsonb_build_object('pairs', COALESCE(v_reach -> 'pairs', '[]'::jsonb), 'months', v_reach -> 'months',
                                'fp', v_reach ->> 'fp'),
    'tier', COALESCE((v_reach ->> 'tier')::int, 3), 'refuse_code', v_refuse,
    'invoices_before', COALESCE(v_reach -> 'invoices_before', '[]'::jsonb),
    'refresh_pairs', COALESCE(v_reach -> 'refresh_pairs', '[]'::jsonb),
    'impact', COALESCE(v_reach -> 'impact', '{}'::jsonb));
END $fn$;

CREATE OR REPLACE FUNCTION public._money_exec__class_fee(p_plan jsonb, p_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_class uuid := (p_plan ->> 'target_id')::uuid;
  v_from date := (p_plan -> 'change' ->> 'effective_from')::date;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_enabled "char";
  n int := 0;
BEGIN
  -- the mirror's guard must stand too, or nothing is written (the history's
  -- own trigger is checked by _money_change_apply after this returns)
  SELECT t.tgenabled INTO v_enabled FROM pg_trigger t
   WHERE t.tgrelid = 'public.classes'::regclass AND t.tgname = 'zz_class_fee_mirror_guard';
  IF v_enabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION 'guard_broken' USING ERRCODE = 'HC050',
      DETAIL = 'The money guard trigger classes.zz_class_fee_mirror_guard is missing or disabled. Nothing was changed.';
  END IF;
  IF p_plan ->> 'op' = 'set' THEN
    UPDATE public.class_fee_history
       SET session_rate_vnd = (p_plan -> 'change' ->> 'session_rate_vnd')::integer,
           note = p_plan -> 'change' ->> 'note'
     WHERE class_id = v_class AND effective_from = v_from;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
      INSERT INTO public.class_fee_history (class_id, effective_from, session_rate_vnd, note, created_by)
      VALUES (v_class, v_from, (p_plan -> 'change' ->> 'session_rate_vnd')::integer, p_plan -> 'change' ->> 'note', p_uid);
      n := 1;
    END IF;
  ELSIF p_plan ->> 'op' = 'remove' THEN
    DELETE FROM public.class_fee_history
     WHERE class_id = v_class AND effective_from = v_from AND effective_from <> DATE '1900-01-01';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'HC015'; END IF;
  ELSE
    RAISE EXCEPTION 'bad_op' USING ERRCODE = 'HC015';
  END IF;
  UPDATE public.classes c SET session_rate_vnd = public.class_fee_on(c.id, v_today)
   WHERE c.id = v_class AND public.class_fee_on(c.id, v_today) IS NOT NULL
     AND c.session_rate_vnd IS DISTINCT FROM public.class_fee_on(c.id, v_today);
  RETURN jsonb_build_object('written', n, 'fee_now', public.class_fee_on(v_class, v_today),
                            'guard_trigger', 'class_fee_history.zz_class_fee_money_guard');
END $fn$;

-- ---------------------------------------------------------------- 6
-- Grants: nobody calls these directly. The fee is changed through the step
-- 1b RPCs (money_change_preview / money_change_checked, admin JWT only).

REVOKE ALL ON FUNCTION
  public.class_fee_on(uuid, date),
  public._class_fee_reach(uuid, date, integer, integer),
  public._class_fee_money_guard(),
  public._class_fee_no_truncate(),
  public._class_fee_baseline(),
  public._class_fee_mirror_guard(),
  public._money_plan__class_fee(text, jsonb, uuid),
  public._money_exec__class_fee(jsonb, uuid)
FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT string_agg(c.relname || '.' || t.tgname || '=' || t.tgenabled::text, ', ' ORDER BY c.relname, t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal AND t.tgname IN ('class_fee_baseline', 'zz_class_fee_mirror_guard', 'zz_class_fee_money_guard',
                                               'class_fee_history_no_truncate', 'audit_class_fee_history')) AS class_fee_triggers,
  (SELECT count(*) FROM public.classes)                                                                 AS classes,
  (SELECT count(*) FROM public.class_fee_history WHERE effective_from = DATE '1900-01-01')               AS baseline_rows,
  (SELECT count(*) FROM public.classes c
    WHERE c.session_rate_vnd IS DISTINCT FROM public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) AS mirror_differs;
