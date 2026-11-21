-- D5 G-7: re-closing a payroll month removes the line and the booked cost of
-- anyone who no longer earns in it, in one database step with the rest of
-- the close.
--
-- WHAT WAS WRONG. close-payroll-month wrote the month as five PostgREST
-- requests (period upsert, two line upserts, the cost upsert, the lock),
-- each its own transaction, and it only ever upserted. Close a month,
-- reopen it, correct it so that somebody earns nothing there any more, close
-- it again: their payroll_lines row and their source_kind = 'payroll'
-- expenditure from the first close stayed, so the closed month paid and
-- booked a person it no longer owed (overpay; D5-audit.md G-7, M33). And
-- because the writes were separate requests, a failure part-way (say the
-- cost upsert) left the lines updated and the costs not, in an open month.
--
-- WHAT THIS ADDS. public.close_payroll_month_apply: the whole close in one
-- transaction (an RPC call is one), in today's order, plus the removal:
--   1. the period row exists (INSERT .. ON CONFLICT DO NOTHING) and is taken
--      FOR UPDATE; a month already closed is refused (HC147) - two closes at
--      once take turns, and the second finds the month closed;
--   2. the period is set open with the note, as today's upsert did;
--   3. REMOVES this month's payroll_lines whose person is not in the new
--      lines, and this month's payroll expenditures (source_kind 'payroll',
--      key '<month>:teacher|assistant:<uuid>') whose key is not in the new
--      costs - while the month is still open, so the closed-payroll triggers
--      allow it, and they still run on every row;
--   4. upserts the lines and the costs exactly as the PostgREST upserts did
--      (same conflict targets, same columns, same values);
--   5. locks the period, last (locked_at = now(), the transaction's own time,
--      so no line or audit row is later than the lock: M31 holds);
--   6. when anything was removed, one audit_log entry naming the closing
--      admin, the people and amounts removed and why (the row triggers also
--      record each DELETE, with no actor because the function runs on the
--      service role).
-- Anything refused - a guard trigger, a bad plan, the month already closed -
-- rolls the whole call back: nothing removed, nothing written, still open.
--
-- WHAT IT REFUSES TO TAKE. The lines and the costs must describe the same
-- people with the same amounts (one cost per line, key and amount matching),
-- every line of this month and one subject, and the actor an admin. A plan
-- that disagrees with itself is refused (HC148) rather than half-written.
--
-- WHAT IT REFUSES TO REMOVE (fix round, review M-1). The line of a person
-- with a correction already CARRIED out of this month (payroll_adjustments
-- with origin_month = this month): removing the line would make the month
-- pay them 0 while the later month still deducts (or adds) the carried
-- difference - the same correction taken twice, silently. Refused with
-- HC149, naming each person and what was carried where; nothing changed.
-- The admin resolves it deliberately (undo the carry if it has not been
-- paid, or leave this month closed).
--
-- TAKING TURNS (review N-1). The close holds an exclusive transaction
-- advisory lock on the month (1902, hashtext(month)) from its first step to
-- its commit. The closed-payroll expenditure guard is replaced by the same
-- body plus a SHARED lock on the month(s) of the payroll row it is checking,
-- taken before it checks. So a Payroll-tab booking that arrives while a
-- close of that month is running waits for the close to commit, then finds
-- the month closed and is refused; one already in flight makes the close
-- wait, and the close's removal then sees it. Unlike FOR SHARE on the
-- period row, this also holds on a first close, when that row is not yet
-- visible to anyone else. Bookings do not wait for each other (shared).
--
-- WHAT IT DOES NOT TOUCH. A closed month (refused before anything). Another
-- month's rows. Payroll expenditures with a key of another shape, and
-- hand-entered payroll costs (source_kind NULL) - neither is the close's to
-- remove. payroll_adjustments (read, never written), payroll_summaries,
-- class overhead (the freeze trigger on payroll_periods runs on the lock as
-- before).
--
-- SECURITY INVOKER, executable by service_role only: it runs with the
-- caller's own rights, so it can do nothing the service role could not
-- already do through PostgREST; close-payroll-month gates the caller as a
-- named admin first, and this re-checks has_role for the actor it records.
--
-- Preflight fails closed: nothing is created unless the tables, the unique
-- conflict targets and both closed-payroll guard triggers are in place, and
-- the expenditure guard's body is the one 20261022091000 installed (or this
-- file's, on a second paste) - an unknown version is not overwritten.
-- Safe to paste twice. Updates no row.
-- Rollback: DROP FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text);
-- re-run the CREATE OR REPLACE of refuse_payroll_expenditure_write_to_locked_month
-- from 20261022091000 (it drops only the shared lock); and redeploy the
-- previous close-payroll-month, which writes on its own.

BEGIN;

DO $pre$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('payroll_periods', ARRAY['month','status','locked_at','locked_by','note']),
      ('payroll_lines',   ARRAY['month','teacher_id','assistant_id','staff_name','pay_rate_type','hourly_rate_vnd',
                                'per_session_rate_vnd','sessions_count','total_minutes','total_amount_vnd','created_by']),
      ('expenditures',    ARRAY['amount','category','memo','date','source_kind','source_key']),
      ('payroll_adjustments', ARRAY['month','origin_month','teacher_id','assistant_id','amount_vnd']),
      ('audit_log',       ARRAY['entity','entity_id','action','diff','actor_user_id'])
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

  -- The conflict targets, plain (a partial index cannot arbitrate ON CONFLICT).
  FOR r IN
    SELECT * FROM (VALUES
      ('payroll_lines', ARRAY['month','teacher_id']),
      ('payroll_lines', ARRAY['month','assistant_id']),
      ('expenditures',  ARRAY['source_kind','source_key'])
    ) AS t(tbl, cols)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_index i
       WHERE i.indrelid = to_regclass('public.' || r.tbl) AND i.indisunique AND i.indpred IS NULL
         AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum) = r.cols) THEN
      v_missing := v_missing || ('plain unique index on public.' || r.tbl || ' (' || array_to_string(r.cols, ', ') || ')');
    END IF;
  END LOOP;

  -- The guards this relies on still being there underneath it.
  FOR r IN
    SELECT * FROM (VALUES
      ('payroll_lines', 'refuse_locked_payroll_lines', 'refuse_write_to_locked_payroll'),
      ('expenditures',  'refuse_payroll_expenditure_in_locked_month', 'refuse_payroll_expenditure_write_to_locked_month')
    ) AS t(tbl, trg, fn)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
       WHERE t.tgrelid = to_regclass('public.' || r.tbl) AND t.tgname = r.trg AND p.proname = r.fn
         AND t.tgenabled IN ('O', 'A') AND NOT t.tgisinternal) THEN
      v_missing := v_missing || ('enabled trigger ' || r.trg || ' (' || r.fn || ') on public.' || r.tbl);
    END IF;
  END LOOP;

  IF to_regprocedure('public.payroll_month_is_locked(text)') IS NULL THEN
    v_missing := v_missing || 'function public.payroll_month_is_locked(text)'::text;
  END IF;
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    v_missing := v_missing || 'function public.has_role(uuid, app_role)'::text;
  END IF;
  IF to_regprocedure('public.is_payroll_expenditure(text, text)') IS NULL THEN
    v_missing := v_missing || 'function public.is_payroll_expenditure(text, text)'::text;
  END IF;
  -- The guard replaced below must be a body this file knows: 20261022091000's
  -- (live on 17 Nov) or this file's own (a second paste).
  IF to_regprocedure('public.refuse_payroll_expenditure_write_to_locked_month()') IS NOT NULL
     AND (SELECT md5(replace(p.prosrc, E'\r', '')) FROM pg_proc p
           WHERE p.oid = to_regprocedure('public.refuse_payroll_expenditure_write_to_locked_month()'))
         NOT IN ('32dc7c68d9eabb459bbdd60a54463bce', '8d4df0f0084a2a3325a730906db9d9bd') THEN
    v_missing := v_missing || 'refuse_payroll_expenditure_write_to_locked_month() as 20261022091000 installed it (its body has been changed since)'::text;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'G-7 payroll re-close cannot be installed; missing: %', array_to_string(v_missing, ', ')
      USING HINT = 'Paste 20261021092000, 20261021093000, 20261021096000 and 20261022091000 first. Nothing was changed.';
  END IF;
END
$pre$;

-- 20261022091000's guard, unchanged, with one step in front: a SHARED
-- advisory lock on each month the payroll row names (its key month and its
-- date month, before and after), in order, so it waits for a close of that
-- month that is in flight (which holds the lock exclusively) and then checks
-- what that close committed.
CREATE OR REPLACE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  blocked text;
  v_months text[] := ARRAY[]::text[];
  v_m text;
BEGIN
  IF TG_OP <> 'DELETE' AND public.is_payroll_expenditure(NEW.source_kind, NEW.category) THEN
    v_months := v_months || split_part(NEW.source_key, ':', 1) || to_char(NEW.date, 'YYYY-MM');
  END IF;
  IF TG_OP <> 'INSERT' AND public.is_payroll_expenditure(OLD.source_kind, OLD.category) THEN
    v_months := v_months || split_part(OLD.source_key, ':', 1) || to_char(OLD.date, 'YYYY-MM');
  END IF;
  FOR v_m IN
    SELECT DISTINCT x FROM unnest(v_months) AS x WHERE x ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' ORDER BY x
  LOOP
    PERFORM pg_advisory_xact_lock_shared(1902, hashtext(v_m));
  END LOOP;

  IF TG_OP <> 'DELETE' AND public.is_payroll_expenditure(NEW.source_kind, NEW.category) THEN
    IF public.payroll_month_is_locked(split_part(NEW.source_key, ':', 1)) THEN
      blocked := split_part(NEW.source_key, ':', 1);
    ELSIF public.payroll_month_is_locked(to_char(NEW.date, 'YYYY-MM')) THEN
      blocked := to_char(NEW.date, 'YYYY-MM');
    END IF;
  END IF;

  IF blocked IS NULL AND TG_OP <> 'INSERT' AND public.is_payroll_expenditure(OLD.source_kind, OLD.category) THEN
    IF public.payroll_month_is_locked(split_part(OLD.source_key, ':', 1)) THEN
      blocked := split_part(OLD.source_key, ':', 1);
    ELSIF public.payroll_month_is_locked(to_char(OLD.date, 'YYYY-MM')) THEN
      blocked := to_char(OLD.date, 'YYYY-MM');
    END IF;
  END IF;

  IF blocked IS NOT NULL THEN
    RAISE EXCEPTION 'Payroll for % is closed. Reopen the month before changing its expenditures.', blocked
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.refuse_payroll_expenditure_write_to_locked_month() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refuse_payroll_expenditure_write_to_locked_month() TO service_role;

COMMENT ON FUNCTION public.refuse_payroll_expenditure_write_to_locked_month() IS
  'Refuses writes to payroll-sourced expenditure rows belonging to a closed month, in either direction. Since 20261117153000 it first takes a shared advisory lock (1902, hashtext(month)) on each month the row names, so it waits for a payroll close of that month in flight and then sees what it committed. Sits beside refuse_recurring_write_to_locked_month (20261021098000), scoped to different source_kind values.';

CREATE OR REPLACE FUNCTION public.close_payroll_month_apply(
  p_month text,
  p_lines jsonb,
  p_costs jsonb,
  p_actor uuid,
  p_note  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_status        text;
  v_bad           text;
  v_locked_at     timestamptz;
  v_lines         int;
  v_total         bigint;
  v_removed_lines jsonb;
  v_removed_costs jsonb;
  v_key_re        text;
  v_why           text;
BEGIN
  -- ------------------------------------------------------------ the plan
  IF p_month IS NULL OR p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Month must be YYYY-MM.' USING ERRCODE = 'HC148';
  END IF;
  IF p_actor IS NULL OR NOT public.has_role(p_actor, 'admin') THEN
    RAISE EXCEPTION 'Only a named admin can close a payroll month.' USING ERRCODE = '42501';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0
     OR p_costs IS NULL OR jsonb_typeof(p_costs) <> 'array' THEN
    RAISE EXCEPTION 'No earned payroll in %; nothing to close.', p_month USING ERRCODE = 'HC148';
  END IF;

  -- Every line of this month, one subject each, no person twice.
  SELECT string_agg(DISTINCT reason, '; ') INTO v_bad FROM (
    SELECT 'a line of another month' AS reason
      FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l WHERE l.month IS DISTINCT FROM p_month
    UNION ALL
    SELECT 'a line with no person, or two'
      FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
     WHERE (l.teacher_id IS NOT NULL) = (l.assistant_id IS NOT NULL)
    UNION ALL
    SELECT 'a person with two lines'
      FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
     GROUP BY l.teacher_id, l.assistant_id HAVING count(*) > 1
    UNION ALL
    SELECT 'a line with no amount'
      FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l WHERE l.total_amount_vnd IS NULL
  ) b;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Payroll close for % refused: %.', p_month, v_bad USING ERRCODE = 'HC148';
  END IF;

  -- The costs are the lines' costs: one per line, same key, same amount.
  SELECT string_agg(DISTINCT reason, '; ') INTO v_bad FROM (
    WITH want AS (
      SELECT l.month || ':' || CASE WHEN l.teacher_id IS NOT NULL THEN 'teacher:' || l.teacher_id::text
                                    ELSE 'assistant:' || l.assistant_id::text END AS key,
             l.total_amount_vnd AS amount
        FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
    ), got AS (
      SELECT x.source_kind, x.source_key AS key, x.amount
        FROM jsonb_populate_recordset(NULL::public.expenditures, p_costs) x
    )
    SELECT 'a cost that is not payroll' AS reason FROM got WHERE source_kind IS DISTINCT FROM 'payroll'
    UNION ALL
    SELECT 'a line with no cost, or a different amount' FROM want w
     WHERE NOT EXISTS (SELECT 1 FROM got g WHERE g.key = w.key AND g.amount = w.amount)
    UNION ALL
    SELECT 'a cost with no line' FROM got g WHERE NOT EXISTS (SELECT 1 FROM want w WHERE w.key = g.key)
    UNION ALL
    SELECT 'a person booked twice' FROM got GROUP BY key HAVING count(*) > 1
  ) b;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Payroll close for % refused: %.', p_month, v_bad USING ERRCODE = 'HC148';
  END IF;

  -- ---------------------------------------------------------- the period
  -- The month's close lock, held to commit: a payroll booking of this month
  -- (the expenditure guard takes it shared) waits for this close, and one in
  -- flight is waited for here.
  PERFORM pg_advisory_xact_lock(1902, hashtext(p_month));

  -- Take the month, then look. A close running at the same time waits here
  -- and then finds it closed.
  INSERT INTO public.payroll_periods (month, status, note)
  VALUES (p_month, 'open', p_note)
  ON CONFLICT (month) DO NOTHING;

  SELECT status INTO v_status FROM public.payroll_periods WHERE month = p_month FOR UPDATE;
  IF v_status = 'locked' THEN
    RAISE EXCEPTION 'Payroll for % is already closed.', p_month USING ERRCODE = 'HC147';
  END IF;

  -- A line this close would remove, of a person with a correction already
  -- carried out of this month, is refused: the month would pay 0 while the
  -- later month still applies the carried difference (review M-1).
  SELECT string_agg(format('%s (line %s; %s carried from %s into %s)',
                           x.staff_name,
                           to_char(x.total_amount_vnd, 'FM999,999,999,990'),
                           to_char(x.carried, 'FMS999,999,999,990'),
                           p_month, x.into_months), '; ' ORDER BY x.staff_name)
    INTO v_bad
    FROM (
      SELECT pl.staff_name, pl.total_amount_vnd,
             sum(a.amount_vnd) AS carried,
             string_agg(DISTINCT a.month, ', ') AS into_months
        FROM public.payroll_lines pl
        JOIN public.payroll_adjustments a
          ON a.origin_month = p_month
         AND ((pl.teacher_id IS NOT NULL AND a.teacher_id = pl.teacher_id)
              OR (pl.assistant_id IS NOT NULL AND a.assistant_id = pl.assistant_id))
       WHERE pl.month = p_month
         AND NOT EXISTS (SELECT 1 FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) k
                          WHERE (pl.teacher_id IS NOT NULL AND k.teacher_id = pl.teacher_id)
                             OR (pl.assistant_id IS NOT NULL AND k.assistant_id = pl.assistant_id))
       GROUP BY pl.id, pl.staff_name, pl.total_amount_vnd
    ) x;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Payroll for % not closed: this close would remove the line of staff with a correction already carried out of the month - %. Removing the line would apply that correction twice. Undo the carried correction first (if it has not been paid), or leave the month as it was. Nothing was changed.', p_month, v_bad
      USING ERRCODE = 'HC149';
  END IF;

  -- What today's upsert did to an existing open row (a no-op on the row
  -- just inserted: the audit trigger skips an update that changed nothing).
  UPDATE public.payroll_periods SET status = 'open', note = p_note WHERE month = p_month;

  -- --------------------------------------- remove who no longer earns here
  WITH keep AS (
    SELECT l.teacher_id, l.assistant_id FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
  ), gone AS (
    DELETE FROM public.payroll_lines pl
     WHERE pl.month = p_month
       AND NOT EXISTS (SELECT 1 FROM keep k
                        WHERE (pl.teacher_id IS NOT NULL AND k.teacher_id = pl.teacher_id)
                           OR (pl.assistant_id IS NOT NULL AND k.assistant_id = pl.assistant_id))
    RETURNING pl.teacher_id, pl.assistant_id, pl.staff_name, pl.total_amount_vnd
  )
  SELECT jsonb_agg(jsonb_build_object('teacherId', teacher_id, 'assistantId', assistant_id,
                                      'staffName', staff_name, 'totalAmountVnd', total_amount_vnd)
                   ORDER BY staff_name, teacher_id, assistant_id)
    INTO v_removed_lines FROM gone;

  v_key_re := '^' || p_month || ':(teacher|assistant):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  WITH keep AS (
    SELECT x.source_key FROM jsonb_populate_recordset(NULL::public.expenditures, p_costs) x
  ), gone AS (
    DELETE FROM public.expenditures e
     WHERE e.source_kind = 'payroll'
       AND e.source_key ~ v_key_re
       AND NOT EXISTS (SELECT 1 FROM keep k WHERE k.source_key = e.source_key)
    RETURNING e.source_key, e.memo, e.amount
  )
  SELECT jsonb_agg(jsonb_build_object('sourceKey', source_key, 'memo', memo, 'amount', amount) ORDER BY source_key)
    INTO v_removed_costs FROM gone;

  -- ------------------------------------- write the month, as PostgREST did
  INSERT INTO public.payroll_lines (month, teacher_id, assistant_id, staff_name, pay_rate_type, hourly_rate_vnd,
                                    per_session_rate_vnd, sessions_count, total_minutes, total_amount_vnd, created_by)
  SELECT l.month, l.teacher_id, l.assistant_id, l.staff_name, l.pay_rate_type, l.hourly_rate_vnd,
         l.per_session_rate_vnd, l.sessions_count, l.total_minutes, l.total_amount_vnd, l.created_by
    FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
   WHERE l.teacher_id IS NOT NULL
  ON CONFLICT (month, teacher_id) DO UPDATE SET
    month = EXCLUDED.month, teacher_id = EXCLUDED.teacher_id, assistant_id = EXCLUDED.assistant_id,
    staff_name = EXCLUDED.staff_name, pay_rate_type = EXCLUDED.pay_rate_type,
    hourly_rate_vnd = EXCLUDED.hourly_rate_vnd, per_session_rate_vnd = EXCLUDED.per_session_rate_vnd,
    sessions_count = EXCLUDED.sessions_count, total_minutes = EXCLUDED.total_minutes,
    total_amount_vnd = EXCLUDED.total_amount_vnd, created_by = EXCLUDED.created_by;

  INSERT INTO public.payroll_lines (month, teacher_id, assistant_id, staff_name, pay_rate_type, hourly_rate_vnd,
                                    per_session_rate_vnd, sessions_count, total_minutes, total_amount_vnd, created_by)
  SELECT l.month, l.teacher_id, l.assistant_id, l.staff_name, l.pay_rate_type, l.hourly_rate_vnd,
         l.per_session_rate_vnd, l.sessions_count, l.total_minutes, l.total_amount_vnd, l.created_by
    FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines) l
   WHERE l.assistant_id IS NOT NULL
  ON CONFLICT (month, assistant_id) DO UPDATE SET
    month = EXCLUDED.month, teacher_id = EXCLUDED.teacher_id, assistant_id = EXCLUDED.assistant_id,
    staff_name = EXCLUDED.staff_name, pay_rate_type = EXCLUDED.pay_rate_type,
    hourly_rate_vnd = EXCLUDED.hourly_rate_vnd, per_session_rate_vnd = EXCLUDED.per_session_rate_vnd,
    sessions_count = EXCLUDED.sessions_count, total_minutes = EXCLUDED.total_minutes,
    total_amount_vnd = EXCLUDED.total_amount_vnd, created_by = EXCLUDED.created_by;

  INSERT INTO public.expenditures (amount, category, memo, date, source_kind, source_key)
  SELECT x.amount, x.category, x.memo, x.date, x.source_kind, x.source_key
    FROM jsonb_populate_recordset(NULL::public.expenditures, p_costs) x
  ON CONFLICT (source_kind, source_key) DO UPDATE SET
    amount = EXCLUDED.amount, category = EXCLUDED.category, memo = EXCLUDED.memo, date = EXCLUDED.date,
    source_kind = EXCLUDED.source_kind, source_key = EXCLUDED.source_key;

  -- ------------------------------------------------------------ the lock
  v_locked_at := now();
  UPDATE public.payroll_periods
     SET status = 'locked', locked_at = v_locked_at, locked_by = p_actor, note = p_note
   WHERE month = p_month;

  IF v_removed_lines IS NOT NULL OR v_removed_costs IS NOT NULL THEN
    -- Exactly what went, per person: line and cost, line only, or cost only
    -- (a first close removes only costs: Payroll-tab bookings).
    SELECT string_agg(item, '; ' ORDER BY item) INTO v_why FROM (
      SELECT CASE
               WHEN l.k IS NOT NULL AND c.k IS NOT NULL THEN format('%s: line (%s) and booked cost (%s)', l.name, l.amt, c.amt)
               WHEN l.k IS NOT NULL THEN format('%s: line (%s) only, no booked cost', l.name, l.amt)
               ELSE format('%s: booked cost (%s) only, no line', c.memo, c.amt)
             END AS item
        FROM (SELECT p_month || ':' || CASE WHEN e ->> 'teacherId' IS NOT NULL THEN 'teacher:' || (e ->> 'teacherId')
                                            ELSE 'assistant:' || (e ->> 'assistantId') END AS k,
                     e ->> 'staffName' AS name,
                     to_char((e ->> 'totalAmountVnd')::bigint, 'FM999,999,999,990') AS amt
                FROM jsonb_array_elements(COALESCE(v_removed_lines, '[]'::jsonb)) e) l
        FULL JOIN (SELECT e ->> 'sourceKey' AS k, e ->> 'memo' AS memo,
                          to_char((e ->> 'amount')::bigint, 'FM999,999,999,990') AS amt
                     FROM jsonb_array_elements(COALESCE(v_removed_costs, '[]'::jsonb)) e) c
          ON c.k = l.k
    ) s;
    INSERT INTO public.audit_log (entity, entity_id, action, diff, actor_user_id)
    VALUES ('payroll_periods', p_month, 'payroll_close_removed_not_owed',
            jsonb_build_object(
              'month', p_month,
              'why', 'Not in the month''s payroll at this close (earns nothing in it now), so removed before the lock - ' || v_why || '.',
              'removed_lines', COALESCE(v_removed_lines, '[]'::jsonb),
              'removed_costs', COALESCE(v_removed_costs, '[]'::jsonb)),
            p_actor);
  END IF;

  SELECT count(*), COALESCE(sum(total_amount_vnd), 0) INTO v_lines, v_total
    FROM jsonb_populate_recordset(NULL::public.payroll_lines, p_lines);

  RETURN jsonb_build_object(
    'month', p_month,
    'status', 'locked',
    'lockedAt', v_locked_at,
    'lines', v_lines,
    'totalAmountVnd', v_total,
    'removedLines', COALESCE(v_removed_lines, '[]'::jsonb),
    'removedCosts', COALESCE(v_removed_costs, '[]'::jsonb));
END
$function$;

COMMENT ON FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text) IS
  'D5 G-7 (20261117153000): close-payroll-month''s writes in one transaction - the month''s close lock (advisory 1902) and the period taken FOR UPDATE (a closed month refused, HC147), the lines and booked payroll costs of anyone not in the new close removed while the month is open (refused, HC149, for anyone with a correction already carried out of the month), lines and costs upserted as before, locked last; one audit_log entry says exactly what was removed. service_role only; the plan must agree with itself (HC148).';

REVOKE ALL ON FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text) TO service_role;

COMMIT;
