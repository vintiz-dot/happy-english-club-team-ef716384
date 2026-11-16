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
--    NAMED ESCAPE: none in the trigger - no live path needs one (D5 grep, fix
--    round 1). The only way past it is the table owner disabling it in the
--    SQL editor (ALTER TABLE public.ledger_entries DISABLE TRIGGER
--    ledger_entries_append_only), which is an act in plain sight and shows in
--    the catalog; re-enable it straight after.
--
-- 2. AUDIT. The generic audit_row_change trigger (20261009130000) on
--    ledger_accounts, expenditures, settlements, sibling_discount_state,
--    discount_definitions and monthly_finance_snapshots. It skips writes made
--    by other triggers and updates that change nothing, so the frequent
--    sibling_discount_state upserts write a row only when a value moves.
--    ledger_entries itself is not given it: append-only rows carry created_by
--    and created_at, and the trigger above means there is nothing else to record.
--
-- Updates no row. Fails closed: refuses to install (nothing changed) if
-- audit_row_change or any of the seven tables is missing, or if any function
-- in the database updates or deletes ledger_entries (it would break).
-- Rollback: DROP TRIGGER ledger_entries_append_only, ledger_entries_no_truncate
-- ON public.ledger_entries; DROP FUNCTION public.ledger_entries_refuse_change();
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
