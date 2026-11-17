-- D5 gap G-11: the ledger is append-only, and the money tables that had no
-- audit trail get the one every other money table has.
--
-- WHAT WAS WRONG. public.ledger_entries has an admin FOR ALL policy
-- (20251012023454) and no other guard: an admin token could UPDATE or DELETE a
-- leg through PostgREST and nothing recorded it (the table is not audited).
-- CHECK-money-invariants M01 / M02 catch an UNBALANCED edit, not a balanced one.
--
-- 1. LEDGER APPEND-ONLY. A BEFORE UPDATE / DELETE row trigger and a BEFORE
--    TRUNCATE trigger on ledger_entries refuse, for every role and every lane
--    (person, service key, the SQL editor), with SQLSTATE HC130. A correction
--    is a new reversing transaction - which is what every writer already does:
--      smart-family-payment, family-payment, modify-payment   INSERT only
--      delete-payment   reverses by INSERTING 'payment-reversal-' legs, and
--                       deletes the payments row (no FK reaches the ledger)
--      scripts/CREDIT-past-unapplied-cash.sql   INSERT only
--    (scripts/pgtest/money-write-paths.test.mjs holds that no TypeScript or SQL
--    in the repo updates or deletes ledger_entries; the preflight below holds
--    it for every function installed in the database.)
--    What this also refuses, on purpose: deleting a student or a ledger
--    account that HAS ledger rows (ON DELETE CASCADE reaches the ledger and
--    meets this trigger). A child with money history is deactivated, not
--    deleted (D4 G-21 says the same). A student or account with no ledger row
--    deletes as before.
--    What the preflight below does NOT see: a path that reaches the ledger by
--    cascade (a DELETE of students / ledger_accounts) or by dynamic SQL. On
--    live (17 Nov) there is none that would break: 0 dynamic-delete
--    candidates, and the one function that deletes students, ai_action_undo,
--    counts ledger_accounts (it has a student_id column) and refuses with
--    reasons before the cascade.
--    NAMED ESCAPE: none in the trigger - no live path needs one (D5 grep, fix
--    round 1). The only way past it is the table owner disabling it in the
--    SQL editor (ALTER TABLE public.ledger_entries DISABLE TRIGGER
--    ledger_entries_append_only), which is an act in plain sight and shows in
--    the catalog; re-enable it straight after.
--
-- 2. CREATED_AT IS THE DATABASE'S (fix round 2, M-3). A BEFORE INSERT row
--    trigger sets created_at := now() on every new ledger leg, for every role.
--    CHECK-money-invariants M01 / M41 tell the pre-key history of Oct 2025
--    from a new unbalanced transaction partly by created_at; a client could
--    set it (admins have FOR ALL through PostgREST, the service key and the
--    SQL editor can too), so an INSERT with a backdated created_at could pass
--    as history. No writer sets it - checked 17 Nov: family-payment,
--    smart-family-payment, modify-payment and delete-payment (fresh reversal
--    rows, no created_at), post_sibling_retro_credit (the only database
--    function on live that inserts a leg), scripts/CREDIT-past-unapplied-cash.sql
--    - they all leave it to the column default, which is now(). occurred_at
--    (when the money moved) stays the writer's: a payment may be dated.
--
-- 3. AUDIT. The generic audit_row_change trigger (20261009130000) on
--    ledger_accounts, expenditures, settlements, sibling_discount_state,
--    discount_definitions and monthly_finance_snapshots. It skips writes made
--    by other triggers and updates where only updated_at / updated_by moved.
--    That does NOT keep the sibling_discount_state upserts quiet:
--    compute-sibling-discounts and watch-sibling-threshold send
--    computed_at = now() on every upsert, so each recompute writes one row
--    even when nothing else moved (fix round 2, N-1: the earlier "only when a
--    value moves" was wrong). Kept on purpose: a recompute is something that
--    happened (when, and as whom), the volume is small (7 states recomputed
--    in the 7 days to 17 Nov, against 3,789 audit rows), and quieting it
--    would mean a second trigger shape or a per-table noise list in the
--    shared audit_row_change, which every audited table runs.
--    ledger_entries itself is not given it: append-only rows carry created_by
--    and created_at, and the triggers above mean there is nothing else to record.
--
-- Updates no row. Fails closed: refuses to install (nothing changed) if
-- audit_row_change or any of the seven tables is missing, or if any function
-- in the database updates or deletes ledger_entries (it would break).
-- Rollback: DROP TRIGGER ledger_entries_append_only, ledger_entries_no_truncate,
-- ledger_entries_stamp_created_at ON public.ledger_entries; DROP FUNCTION
-- public.ledger_entries_refuse_change(), public.ledger_entries_stamp_created_at();
-- DROP TRIGGER audit_<table> ON public.<table> for the six tables.

DO $preflight$
DECLARE
  t text;
  v_writers text;
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE EXCEPTION 'G-11: public.audit_row_change() is not installed (20261009130000). Nothing was changed.';
  END IF;
  FOREACH t IN ARRAY ARRAY['ledger_entries', 'ledger_accounts', 'expenditures', 'settlements',
                           'sibling_discount_state', 'discount_definitions', 'monthly_finance_snapshots'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'G-11: table public.% is missing. Nothing was changed.', t;
    END IF;
  END LOOP;
  -- A function that rewrites the ledger would break the moment this is on.
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.oid::regprocedure::text)
    INTO v_writers
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
     AND p.proname <> 'ledger_entries_refuse_change'
     AND p.prosrc ~* '(update\s+(only\s+)?(public\.)?ledger_entries\M|delete\s+from\s+(only\s+)?(public\.)?ledger_entries\M|truncate\s+(table\s+)?(only\s+)?(public\.)?ledger_entries\M)';
  IF v_writers IS NOT NULL THEN
    RAISE EXCEPTION 'G-11: these functions update or delete ledger_entries and would break: %. Nothing was changed.', v_writers;
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.ledger_entries_refuse_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'The ledger is append-only: % of a ledger entry is refused. Post a reversing transaction instead.', lower(TG_OP)
    USING ERRCODE = 'HC130';
END
$function$;

REVOKE ALL ON FUNCTION public.ledger_entries_refuse_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ledger_entries_append_only ON public.ledger_entries;
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.ledger_entries_refuse_change();

DROP TRIGGER IF EXISTS ledger_entries_no_truncate ON public.ledger_entries;
CREATE TRIGGER ledger_entries_no_truncate
  BEFORE TRUNCATE ON public.ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION public.ledger_entries_refuse_change();

-- 2. created_at is the database's.
CREATE OR REPLACE FUNCTION public.ledger_entries_stamp_created_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.ledger_entries_stamp_created_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ledger_entries_stamp_created_at ON public.ledger_entries;
CREATE TRIGGER ledger_entries_stamp_created_at
  BEFORE INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.ledger_entries_stamp_created_at();

DO $audit$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_accounts', 'expenditures', 'settlements',
                           'sibling_discount_state', 'discount_definitions', 'monthly_finance_snapshots'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END
$audit$;

COMMENT ON FUNCTION public.ledger_entries_refuse_change() IS
  'D5 G-11 (20261117111000): ledger_entries is append-only - UPDATE, DELETE and TRUNCATE are refused for every role (HC130). Correct with a reversing transaction.';

COMMENT ON FUNCTION public.ledger_entries_stamp_created_at() IS
  'D5 G-11 fix round 2 (20261117111000): every new ledger_entries row gets created_at = now(), whatever the writer sent, so a backdated INSERT cannot pass as pre-key history in CHECK-money-invariants M01 / M41. occurred_at stays the writer''s.';
