-- Tuition audit, phase 4 (docs/TUITION_AUDIT_ROLLOUT.md): merge a duplicate
-- student record into the one that stays.
--
--   SELECT public.admin_merge_students('<keep id>', '<drop id>');         -- dry run (the default)
--   SELECT public.admin_merge_students('<keep id>', '<drop id>', false);  -- does it
--
-- WHAT IT DOES. Every row that names the dropped child moves to the kept
-- one, in every public table with a uuid `student_id` column and every
-- column with a foreign key to students(id). The list is read from the
-- catalog each time it runs, so a table added later is covered without
-- anyone remembering it (the rule ai_action_undo follows). Then the dropped
-- child is DEACTIVATED, never deleted, with a note saying where it went, and
-- one audit_log row records the whole merge.
--
-- THE DRY RUN performs every write, reads the result, and then rolls all of
-- it back inside the function (a block ended by its own exception). So what
-- it reports is exactly what the real run would do, triggers included, and
-- it leaves nothing behind - not even the money guards' event rows. A guard
-- that would refuse a write shows up in the dry run as the same error.
--
-- REFUSES (nothing changed, the dry run returns the list instead of raising):
--   * both children have a bill for the same month and BOTH bills hold money
--     (a charge, a recorded payment, a freeze, a person's confirmation, or a
--     paid / partial / credit label). A bill holding none of those gives
--     way: it is deleted and the other one stands. Carry balances are not
--     money of the month; the carry trigger works them out again.
--   * both children have a mark by a person for the same lesson and the
--     marks differ;
--   * any other unique clash (two Pixel Pal links, two consents, two
--     enrolments of one class open on the same terms, ...), except in the
--     tables whose rows are caches or counters (KEEP_WINS below), where the
--     kept child's row stands;
--   * a register row of the dropped child on a cancelled lesson that is not
--     Excused (the database no longer accepts one, so it could not be copied);
--   * the same child twice, a missing child, or a caller who is not the
--     owner or an admin.
--
-- HOW EACH TABLE IS HANDLED
--   attendance, enrollments  copied and removed, not updated: their guards
--                            refuse a row changing child (HC024 / HC121).
--                            Enrolments go first (keeping their id and
--                            created_at, which decide pricing order), so the
--                            marks land on an enrolled child; the marks are
--                            written with hec.attendance_restore on, the
--                            enrolment guard's own switch for restoring rows
--                            verbatim. A placeholder of the kept child (also
--                            ones the enrolment insert seeds) gives way to a
--                            person's mark of the dropped one.
--   invoices                 moved, after the empty same-month bills go.
--   ledger_accounts          moved; where both children hold one code, the
--                            dropped child's account is deleted if it has no
--                            entries and otherwise LEFT on the dropped child
--                            (ledger_entries are append-only, so they cannot
--                            change account). Reported as ledger_left.
--   student_points           not moved: point_transactions' trigger rebuilds
--                            both children's totals as those rows move.
--   ai_actions, invoice_state_floor, lesson_monitor_audit, recorder_audit_log
--                            stay with the dropped child: they record what
--                            happened to THAT record (an undo must act on the
--                            child its action made; the floor and the two
--                            audits refuse any change). Reported as stayed.
--   everything else          UPDATE ... SET student_id = keep.
--   the students row         the kept child takes the dropped one's family,
--                            login, second login, phone, email, birthday and
--                            photo where it has none, and becomes active if
--                            the dropped one was.
--
-- WHO. It is meant for the SQL editor (the owner lane of _caller_lane):
-- EXECUTE is revoked from PUBLIC, anon, authenticated and service_role.
-- Through PostgREST an admin would meet the D4 guards on every billed month
-- anyway; the owner lane passes them and each guard records an owner_lane
-- event, which is the audit trail those guards ask for. If a JWT is present
-- the caller must hold the admin role.
--
-- Rollback: DROP FUNCTION public.admin_merge_students(uuid, uuid, boolean);
-- DROP FUNCTION public._merge_student_tables(); DROP FUNCTION
-- public._merge_unique_clash(text, text, text, text); DROP FUNCTION
-- public._merge_bill_holds_money(public.invoices). A merge already done is
-- not undone by that: its audit row lists what moved.

BEGIN;

DO $pre$
DECLARE
  missing text[] := '{}';
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('students', 'id'), ('students', 'is_active'), ('students', 'family_id'), ('students', 'notes'),
      ('students', 'linked_user_id'), ('students', 'secondary_user_id'),
      ('invoices', 'student_id'), ('invoices', 'month'), ('invoices', 'base_amount'), ('invoices', 'discount_amount'),
      ('invoices', 'total_amount'), ('invoices', 'recorded_payment'), ('invoices', 'status'),
      ('invoices', 'confirmation_status'), ('invoices', 'tuition_frozen'),
      ('attendance', 'id'), ('attendance', 'session_id'), ('attendance', 'student_id'), ('attendance', 'status'),
      ('attendance', 'marked_by'), ('enrollments', 'id'), ('enrollments', 'student_id'),
      ('ledger_accounts', 'id'), ('ledger_accounts', 'student_id'), ('ledger_accounts', 'code'),
      ('ledger_entries', 'account_id'), ('sessions', 'id'), ('sessions', 'status'),
      ('audit_log', 'entity'), ('audit_log', 'entity_id'), ('audit_log', 'action'), ('audit_log', 'actor_user_id'), ('audit_log', 'diff')
    ) AS v(t, c)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || r.t) AND a.attname = r.c AND a.attnum > 0 AND NOT a.attisdropped) THEN
      missing := missing || (r.t || '.' || r.c);
    END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'merge: missing column(s) %. Nothing was changed.', array_to_string(missing, ', ');
  END IF;
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('public._caller_lane()') IS NULL THEN
    RAISE EXCEPTION 'merge: has_role(uuid, app_role), auth.uid() or _caller_lane() is missing. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'admin_merge_students'
              AND pg_get_function_identity_arguments(p.oid) <> 'p_keep uuid, p_drop uuid, p_dry_run boolean') THEN
    RAISE EXCEPTION 'merge: another admin_merge_students signature exists. Nothing was changed.';
  END IF;
END
$pre$;

-- Every column that names a child: uuid student_id columns, and any
-- single-column foreign key to students(id). How each one is treated.
CREATE OR REPLACE FUNCTION public._merge_student_tables()
RETURNS TABLE (table_name text, column_name text, mode text)
LANGUAGE sql STABLE SET search_path = public, pg_catalog AS $fn$
  WITH cols AS (
    SELECT c.relname::text AS t, a.attname::text AS col
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
       AND a.attname = 'student_id' AND a.atttypid = 'uuid'::regtype AND a.attnum > 0 AND NOT a.attisdropped
       AND c.relname <> 'students'
    UNION
    SELECT c.relname::text, a.attname::text
      FROM pg_constraint k
      JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
     WHERE k.contype = 'f' AND k.confrelid = 'public.students'::regclass AND n.nspname = 'public'
       AND cardinality(k.conkey) = 1 AND c.relname <> 'students' AND NOT c.relispartition
  )
  SELECT t, col,
         CASE
           WHEN t IN ('ai_actions', 'invoice_state_floor', 'lesson_monitor_audit', 'recorder_audit_log') THEN 'stay'
           WHEN t = 'student_points' THEN 'derived'
           WHEN t = 'invoices' AND col = 'student_id' THEN 'bills'
           WHEN t = 'attendance' AND col = 'student_id' THEN 'marks'
           WHEN t = 'enrollments' AND col = 'student_id' THEN 'copy'
           WHEN t = 'ledger_accounts' AND col = 'student_id' THEN 'ledger'
           -- KEEP_WINS: caches and counters; on a clash the kept child's row stands.
           WHEN t IN ('student_attendance_streaks', 'student_login_streaks', 'daily_login_rewards',
                      'stars_sync_attendance_state', 'student_learning_profiles') THEN 'keep_wins'
           ELSE 'move'
         END
    FROM cols
$fn$;

-- A WHERE clause (over aliases d = the dropped child's row, k = the kept
-- child's row, both already restricted to their child) that is true when
-- moving d would break one of the table's unique indexes on that column.
-- NULL when the table has no such index. Raises when an index is an
-- expression index (it cannot be checked, so the merge fails closed).
CREATE OR REPLACE FUNCTION public._merge_unique_clash(p_table text, p_col text, d text, k text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public, pg_catalog AS $fn$
DECLARE
  i record;
  v_parts text[] := '{}';
  v_one text;
  v_cmp text;
  v_attnum int2;
BEGIN
  SELECT a.attnum INTO v_attnum FROM pg_attribute a
   WHERE a.attrelid = ('public.' || quote_ident(p_table))::regclass AND a.attname = p_col;
  FOR i IN
    SELECT x.indexrelid, x.indkey::int2[] AS keys, pg_get_expr(x.indpred, x.indrelid) AS pred,
           COALESCE((to_jsonb(x) ->> 'indnullsnotdistinct')::boolean, false) AS nnd,
           x.indexprs IS NOT NULL AS has_expr
      FROM pg_index x
     WHERE x.indrelid = ('public.' || quote_ident(p_table))::regclass AND x.indisunique
       AND v_attnum = ANY (x.indkey::int2[])
  LOOP
    IF i.has_expr OR 0 = ANY (i.keys) THEN
      RAISE EXCEPTION 'merge: the unique index % on % uses an expression; it cannot be checked. Nothing was changed.',
        i.indexrelid::regclass, p_table USING ERRCODE = 'HCM02';
    END IF;
    v_cmp := CASE WHEN i.nnd THEN ' IS NOT DISTINCT FROM ' ELSE ' = ' END;
    SELECT COALESCE(string_agg(format('%s.%I%s%s.%I', k, a.attname, v_cmp, d, a.attname), ' AND '), 'true')
      INTO v_one
      FROM unnest(i.keys) AS kk(n)
      JOIN pg_attribute a ON a.attrelid = ('public.' || quote_ident(p_table))::regclass AND a.attnum = kk.n
     WHERE kk.n <> v_attnum;
    IF i.pred IS NOT NULL THEN
      -- The predicate names columns bare; evaluated over a one-row copy of
      -- each side, they resolve to that row.
      v_one := v_one || format(' AND (SELECT (%s) FROM (SELECT %s.*) z) AND (SELECT (%s) FROM (SELECT %s.*) z)',
                               i.pred, d, i.pred, k);
    END IF;
    v_parts := v_parts || ('(' || v_one || ')');
  END LOOP;
  IF cardinality(v_parts) = 0 THEN RETURN NULL; END IF;
  RETURN array_to_string(v_parts, ' OR ');
END $fn$;

-- Does this bill hold money of its month? (See REFUSES above.)
CREATE OR REPLACE FUNCTION public._merge_bill_holds_money(b public.invoices)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT COALESCE(b.base_amount, 0) <> 0 OR COALESCE(b.discount_amount, 0) <> 0 OR COALESCE(b.total_amount, 0) <> 0
      OR COALESCE(b.recorded_payment, 0) <> 0 OR COALESCE(b.tuition_frozen, false)
      OR COALESCE(b.confirmation_status, '') IN ('confirmed', 'adjusted')
      OR COALESCE(b.status::text, '') IN ('paid', 'partial', 'credit')
$fn$;

CREATE OR REPLACE FUNCTION public.admin_merge_students(p_keep uuid, p_drop uuid, p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_keep public.students%ROWTYPE;
  v_drop public.students%ROWTYPE;
  t record;
  r record;
  b record;
  v_clash text;
  v_n bigint;
  v_m bigint;
  v_refusals jsonb := '[]'::jsonb;
  v_tables jsonb := '{}'::jsonb;
  v_stayed jsonb := '{}'::jsonb;
  v_bills_deleted jsonb := '[]'::jsonb;
  v_ledger_left jsonb := '[]'::jsonb;
  v_marks jsonb := jsonb_build_object('copied', 0, 'replaced_placeholder', 0, 'dropped_placeholder', 0, 'same_mark', 0);
  v_fields jsonb := '{}'::jsonb;
  v_result jsonb;
  v_restore text;
  j jsonb;
BEGIN
  -- Who.
  IF v_uid IS NOT NULL THEN
    IF NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
      RAISE EXCEPTION 'Only an admin can merge students. Nothing was changed.' USING ERRCODE = 'HCM03';
    END IF;
  ELSIF public._caller_lane() <> 'owner' THEN
    RAISE EXCEPTION 'Merging students is run from the SQL editor (or by a signed-in admin). Nothing was changed.' USING ERRCODE = 'HCM03';
  END IF;

  IF p_keep IS NULL OR p_drop IS NULL OR p_keep = p_drop THEN
    RAISE EXCEPTION 'Give two different students: the one to keep and the one to merge into it. Nothing was changed.' USING ERRCODE = '22023';
  END IF;
  -- Both rows locked, in one order, so two merges of one child queue.
  PERFORM 1 FROM public.students s WHERE s.id IN (p_keep, p_drop) ORDER BY s.id FOR UPDATE;
  SELECT * INTO v_keep FROM public.students WHERE id = p_keep;
  IF NOT FOUND THEN RAISE EXCEPTION 'The student to keep (%) does not exist. Nothing was changed.', p_keep USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_drop FROM public.students WHERE id = p_drop;
  IF NOT FOUND THEN RAISE EXCEPTION 'The student to merge (%) does not exist. Nothing was changed.', p_drop USING ERRCODE = 'P0002'; END IF;

  -- The three tables handled by hand must have exactly the unique keys this
  -- function knows; anything else fails closed.
  IF EXISTS (SELECT 1 FROM pg_index x JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])
              WHERE x.indrelid = 'public.invoices'::regclass AND x.indisunique AND a.attname = 'student_id'
                AND (x.indpred IS NOT NULL OR (SELECT array_agg(a2.attname::text ORDER BY a2.attname::text) FROM pg_attribute a2
                      WHERE a2.attrelid = x.indrelid AND a2.attnum = ANY (x.indkey::int2[])) <> ARRAY['month', 'student_id']))
     OR EXISTS (SELECT 1 FROM pg_index x JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])
              WHERE x.indrelid = 'public.attendance'::regclass AND x.indisunique AND a.attname = 'student_id'
                AND (x.indpred IS NOT NULL OR (SELECT array_agg(a2.attname::text ORDER BY a2.attname::text) FROM pg_attribute a2
                      WHERE a2.attrelid = x.indrelid AND a2.attnum = ANY (x.indkey::int2[])) <> ARRAY['session_id', 'student_id']))
     OR EXISTS (SELECT 1 FROM pg_index x JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])
              WHERE x.indrelid = 'public.ledger_accounts'::regclass AND x.indisunique AND a.attname = 'student_id'
                AND (x.indpred IS NOT NULL OR (SELECT array_agg(a2.attname::text ORDER BY a2.attname::text) FROM pg_attribute a2
                      WHERE a2.attrelid = x.indrelid AND a2.attnum = ANY (x.indkey::int2[])) <> ARRAY['code', 'student_id'])) THEN
    RAISE EXCEPTION 'merge: invoices, attendance or ledger_accounts has a unique key this function does not know. Nothing was changed.' USING ERRCODE = 'HCM02';
  END IF;

  -- ============================================================ the plan
  -- Same-month bills.
  FOR b IN
    SELECT d.month, public._merge_bill_holds_money(d) AS d_money, public._merge_bill_holds_money(k) AS k_money,
           d.total_amount AS d_total, d.recorded_payment AS d_paid, k.total_amount AS k_total, k.recorded_payment AS k_paid
      FROM public.invoices d JOIN public.invoices k ON k.month = d.month AND k.student_id = p_keep
     WHERE d.student_id = p_drop ORDER BY d.month
  LOOP
    IF b.d_money AND b.k_money THEN
      v_refusals := v_refusals || jsonb_build_object('table', 'invoices', 'reason', 'same_month_money', 'month', b.month,
        'keep', jsonb_build_object('total', b.k_total, 'recorded_payment', b.k_paid),
        'drop', jsonb_build_object('total', b.d_total, 'recorded_payment', b.d_paid));
    END IF;
  END LOOP;

  -- Same-lesson marks by people that differ; the dropped child's marks on
  -- cancelled lessons that are not Excused.
  FOR r IN
    SELECT d.session_id, d.status AS d_status, k.status AS k_status
      FROM public.attendance d JOIN public.attendance k ON k.session_id = d.session_id AND k.student_id = p_keep
     WHERE d.student_id = p_drop AND d.marked_by IS NOT NULL AND k.marked_by IS NOT NULL
       AND d.status IS DISTINCT FROM k.status
  LOOP
    v_refusals := v_refusals || jsonb_build_object('table', 'attendance', 'reason', 'different_marks',
      'session_id', r.session_id, 'keep', r.k_status, 'drop', r.d_status);
  END LOOP;
  SELECT count(*) INTO v_n FROM public.attendance d JOIN public.sessions ss ON ss.id = d.session_id
   WHERE d.student_id = p_drop AND ss.status::text = 'Canceled' AND d.status IS DISTINCT FROM 'Excused';
  IF v_n > 0 THEN
    v_refusals := v_refusals || jsonb_build_object('table', 'attendance', 'reason', 'cancelled_lesson_not_excused', 'rows', v_n);
  END IF;

  -- Every other unique clash, except where the kept row stands.
  FOR t IN SELECT * FROM public._merge_student_tables() m WHERE m.mode IN ('move', 'copy') ORDER BY 1, 2 LOOP
    v_clash := public._merge_unique_clash(t.table_name, t.column_name, 'd', 'k');
    CONTINUE WHEN v_clash IS NULL;
    EXECUTE format('SELECT count(*) FROM public.%1$I d WHERE d.%2$I = $1 AND EXISTS (SELECT 1 FROM public.%1$I k WHERE k.%2$I = $2 AND (%3$s))',
                   t.table_name, t.column_name, v_clash)
      INTO v_n USING p_drop, p_keep;
    IF v_n > 0 THEN
      v_refusals := v_refusals || jsonb_build_object('table', t.table_name, 'column', t.column_name, 'reason', 'unique_clash', 'rows', v_n);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_refusals) > 0 THEN
    IF p_dry_run THEN
      RETURN jsonb_build_object('ok', false, 'dry_run', true, 'keep', p_keep, 'drop', p_drop, 'refusals', v_refusals);
    END IF;
    RAISE EXCEPTION 'merge_refused' USING ERRCODE = 'HCM01',
      DETAIL = v_refusals::text, HINT = 'Run the dry run to see the list. Nothing was changed.';
  END IF;

  -- ============================================================ the writes
  BEGIN
    -- 1. The kept child takes what it lacks. Unique logins move off the
    --    dropped row first.
    IF v_keep.linked_user_id IS NULL AND v_drop.linked_user_id IS NOT NULL THEN
      UPDATE public.students SET linked_user_id = NULL WHERE id = p_drop;
      UPDATE public.students SET linked_user_id = v_drop.linked_user_id WHERE id = p_keep;
      v_fields := v_fields || jsonb_build_object('linked_user_id', v_drop.linked_user_id);
    END IF;
    IF v_keep.secondary_user_id IS NULL AND v_drop.secondary_user_id IS NOT NULL THEN
      UPDATE public.students SET secondary_user_id = NULL WHERE id = p_drop;
      UPDATE public.students SET secondary_user_id = v_drop.secondary_user_id WHERE id = p_keep;
      v_fields := v_fields || jsonb_build_object('secondary_user_id', v_drop.secondary_user_id);
    END IF;
    IF v_keep.family_id IS NULL AND v_drop.family_id IS NOT NULL THEN
      UPDATE public.students SET family_id = v_drop.family_id WHERE id = p_keep;
      v_fields := v_fields || jsonb_build_object('family_id', v_drop.family_id);
    END IF;
    UPDATE public.students s
       SET phone = COALESCE(NULLIF(s.phone, ''), NULLIF(v_drop.phone, '')),
           email = COALESCE(NULLIF(s.email, ''), NULLIF(v_drop.email, '')),
           date_of_birth = COALESCE(s.date_of_birth, v_drop.date_of_birth),
           avatar_url = COALESCE(s.avatar_url, v_drop.avatar_url)
     WHERE s.id = p_keep
       AND (s.phone IS DISTINCT FROM COALESCE(NULLIF(s.phone, ''), NULLIF(v_drop.phone, ''))
            OR s.email IS DISTINCT FROM COALESCE(NULLIF(s.email, ''), NULLIF(v_drop.email, ''))
            OR s.date_of_birth IS DISTINCT FROM COALESCE(s.date_of_birth, v_drop.date_of_birth)
            OR s.avatar_url IS DISTINCT FROM COALESCE(s.avatar_url, v_drop.avatar_url));
    IF NOT v_keep.is_active AND v_drop.is_active THEN
      UPDATE public.students SET is_active = true WHERE id = p_keep;
      v_fields := v_fields || jsonb_build_object('is_active', true);
    END IF;

    -- 2. Enrolments: copied (same id, same created_at) and removed.
    FOR t IN SELECT * FROM public._merge_student_tables() m WHERE m.mode = 'copy' ORDER BY 1, 2 LOOP
      v_n := 0;
      FOR j IN EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE x.%I = $1', t.table_name, t.column_name) USING p_drop LOOP
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', t.table_name) USING (j ->> 'id')::uuid;
        EXECUTE format('INSERT INTO public.%1$I SELECT * FROM jsonb_populate_record(NULL::public.%1$I, $1)', t.table_name)
          USING j || jsonb_build_object(t.column_name, p_keep);
        v_n := v_n + 1;
      END LOOP;
      v_tables := v_tables || jsonb_build_object(t.table_name, jsonb_build_object('mode', 'copy', 'moved', v_n));
    END LOOP;

    -- 3. Marks, after the enrolments (whose insert may seed placeholders).
    v_restore := current_setting('hec.attendance_restore', true);
    PERFORM set_config('hec.attendance_restore', 'on', true);
    FOR j IN SELECT to_jsonb(a) FROM public.attendance a WHERE a.student_id = p_drop ORDER BY a.session_id LOOP
      SELECT a.marked_by, a.status, a.id INTO r FROM public.attendance a
       WHERE a.session_id = (j ->> 'session_id')::uuid AND a.student_id = p_keep;
      IF FOUND THEN
        IF j ->> 'marked_by' IS NULL THEN
          DELETE FROM public.attendance WHERE id = (j ->> 'id')::uuid;
          v_marks := jsonb_set(v_marks, '{dropped_placeholder}', to_jsonb((v_marks ->> 'dropped_placeholder')::int + 1));
          CONTINUE;
        ELSIF r.marked_by IS NULL THEN
          DELETE FROM public.attendance WHERE id = r.id;
          v_marks := jsonb_set(v_marks, '{replaced_placeholder}', to_jsonb((v_marks ->> 'replaced_placeholder')::int + 1));
        ELSIF r.status IS NOT DISTINCT FROM j ->> 'status' THEN
          DELETE FROM public.attendance WHERE id = (j ->> 'id')::uuid;
          v_marks := jsonb_set(v_marks, '{same_mark}', to_jsonb((v_marks ->> 'same_mark')::int + 1));
          CONTINUE;
        ELSE
          RAISE EXCEPTION 'merge_refused' USING ERRCODE = 'HCM01',
            DETAIL = jsonb_build_object('table', 'attendance', 'reason', 'different_marks', 'session_id', j ->> 'session_id')::text;
        END IF;
      END IF;
      DELETE FROM public.attendance WHERE id = (j ->> 'id')::uuid;
      INSERT INTO public.attendance SELECT * FROM jsonb_populate_record(NULL::public.attendance, j || jsonb_build_object('student_id', p_keep));
      v_marks := jsonb_set(v_marks, '{copied}', to_jsonb((v_marks ->> 'copied')::int + 1));
    END LOOP;
    PERFORM set_config('hec.attendance_restore', COALESCE(v_restore, ''), true);
    v_tables := v_tables || jsonb_build_object('attendance', v_marks || jsonb_build_object('mode', 'marks'));

    -- 4. Bills: the empty one of each same-month pair goes, then the rest move.
    FOR b IN
      SELECT d.id AS d_id, k.id AS k_id, d.month, public._merge_bill_holds_money(d) AS d_money
        FROM public.invoices d JOIN public.invoices k ON k.month = d.month AND k.student_id = p_keep
       WHERE d.student_id = p_drop ORDER BY d.month
    LOOP
      IF NOT b.d_money THEN
        DELETE FROM public.invoices WHERE id = b.d_id;
        v_bills_deleted := v_bills_deleted || jsonb_build_object('month', b.month, 'of', 'drop', 'invoice_id', b.d_id);
      ELSE
        DELETE FROM public.invoices WHERE id = b.k_id;
        v_bills_deleted := v_bills_deleted || jsonb_build_object('month', b.month, 'of', 'keep', 'invoice_id', b.k_id);
      END IF;
    END LOOP;
    UPDATE public.invoices SET student_id = p_keep WHERE student_id = p_drop;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_tables := v_tables || jsonb_build_object('invoices', jsonb_build_object('mode', 'bills', 'moved', v_n,
                                                                              'deleted_empty', jsonb_array_length(v_bills_deleted)));

    -- 5. Ledger accounts.
    v_m := 0;
    FOR r IN
      SELECT d.id, d.code::text AS code, EXISTS (SELECT 1 FROM public.ledger_entries e WHERE e.account_id = d.id) AS has_entries
        FROM public.ledger_accounts d
       WHERE d.student_id = p_drop
         AND EXISTS (SELECT 1 FROM public.ledger_accounts k WHERE k.student_id = p_keep AND k.code = d.code)
    LOOP
      IF r.has_entries THEN
        v_ledger_left := v_ledger_left || jsonb_build_object('code', r.code, 'account_id', r.id);
      ELSE
        DELETE FROM public.ledger_accounts WHERE id = r.id;
        v_m := v_m + 1;
      END IF;
    END LOOP;
    UPDATE public.ledger_accounts d SET student_id = p_keep
     WHERE d.student_id = p_drop
       AND NOT EXISTS (SELECT 1 FROM public.ledger_accounts k WHERE k.student_id = p_keep AND k.code = d.code);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_tables := v_tables || jsonb_build_object('ledger_accounts', jsonb_build_object('mode', 'ledger', 'moved', v_n,
                                                                                     'deleted_empty', v_m, 'left', jsonb_array_length(v_ledger_left)));

    -- 6. Everything else.
    FOR t IN SELECT * FROM public._merge_student_tables() m WHERE m.mode IN ('move', 'keep_wins') ORDER BY 1, 2 LOOP
      v_m := 0;
      IF t.mode = 'keep_wins' THEN
        v_clash := public._merge_unique_clash(t.table_name, t.column_name, 'd', 'k');
        IF v_clash IS NOT NULL THEN
          EXECUTE format('DELETE FROM public.%1$I d WHERE d.%2$I = $1 AND EXISTS (SELECT 1 FROM public.%1$I k WHERE k.%2$I = $2 AND (%3$s))',
                         t.table_name, t.column_name, v_clash) USING p_drop, p_keep;
          GET DIAGNOSTICS v_m = ROW_COUNT;
        END IF;
      END IF;
      EXECUTE format('UPDATE public.%1$I SET %2$I = $2 WHERE %2$I = $1', t.table_name, t.column_name) USING p_drop, p_keep;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 OR v_m > 0 THEN
        v_tables := v_tables || jsonb_build_object(
          CASE WHEN t.column_name = 'student_id' THEN t.table_name ELSE t.table_name || '.' || t.column_name END,
          jsonb_build_object('mode', t.mode, 'moved', v_n) || CASE WHEN v_m > 0 THEN jsonb_build_object('kept_rows_won', v_m) ELSE '{}'::jsonb END);
      END IF;
    END LOOP;

    -- What stays with the dropped child (reported, not moved).
    FOR t IN SELECT * FROM public._merge_student_tables() m WHERE m.mode IN ('stay', 'derived') ORDER BY 1, 2 LOOP
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', t.table_name, t.column_name) INTO v_n USING p_drop;
      IF v_n > 0 THEN
        v_stayed := v_stayed || jsonb_build_object(t.table_name, jsonb_build_object('mode', t.mode, 'rows', v_n));
      END IF;
    END LOOP;

    -- 7. The dropped child: inactive, with a note. Never deleted.
    UPDATE public.students
       SET is_active = false,
           notes = 'Merged into ' || p_keep::text || ' on ' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
                   || ' (admin_merge_students).' || COALESCE(' ' || NULLIF(notes, ''), '')
     WHERE id = p_drop;

    v_result := jsonb_build_object(
      'ok', true, 'dry_run', p_dry_run, 'keep', p_keep, 'drop', p_drop,
      'tables', v_tables, 'stayed_with_dropped', v_stayed, 'bills_deleted', v_bills_deleted,
      'ledger_left_on_dropped', v_ledger_left, 'keep_took', v_fields,
      'keep_after', (SELECT jsonb_build_object('bills', count(*), 'charged', COALESCE(sum(i.total_amount), 0),
                                               'recorded_payment', COALESCE(sum(i.recorded_payment), 0))
                       FROM public.invoices i WHERE i.student_id = p_keep),
      'drop_after', (SELECT jsonb_build_object('bills', count(*)) FROM public.invoices i WHERE i.student_id = p_drop));

    -- 8. One audit row for the whole merge.
    INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
    VALUES ('student', p_keep::text, 'merge_students', v_uid, v_result);

    IF p_dry_run THEN
      RAISE EXCEPTION 'merge dry run' USING ERRCODE = 'HCM00';
    END IF;
  EXCEPTION WHEN SQLSTATE 'HCM00' THEN
    RETURN v_result;   -- every write above has been rolled back
  END;
  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.admin_merge_students(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._merge_student_tables() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._merge_unique_clash(text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._merge_bill_holds_money(public.invoices) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.admin_merge_students(uuid, uuid, boolean) IS
  'Tuition audit phase 4 (20261121120000): merge a duplicate student into the one kept. Moves every row of every student_id / students-FK column (read from the catalog at run time), copies attendance and enrollments, deletes only an empty same-month bill, refuses same-month bills that both hold money, deactivates (never deletes) the dropped child and writes one audit_log row. Dry run by default: performs every write and rolls it back. SQL editor (owner lane) only.';

COMMIT;
