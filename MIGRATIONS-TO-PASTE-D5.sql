-- D5 gap G-4: when the carry moves, the label follows.
--
-- WHAT WAS WRONG. invoices_carry_sync (20261009120000) recomputes every
-- carry_in / carry_out of a child whenever any of the child's bills is
-- written. That changes the PAYABLE of every later month (charge + debt
-- carried in - credit carried in), but invoices.status - the label, ONE rule:
-- public.invoice_paid_label (20261113090000) = paidLabel in
-- _lib/invoice-status.ts - was re-derived only when that later bill was
-- itself written. So November overpaid by 700,000 left December reading
-- "partial" with nothing left to pay (scripts/pgtest/money-invariants-check
-- section 6). On live, 17 Nov: CHECK-money-invariants M11 = 449 bills whose
-- stored label is not the rule's.
--
-- WHAT THIS DOES. refresh_invoice_carry is replaced by the same function plus
-- the label: in the same UPDATE, a bill whose label is not
-- invoice_paid_label(recorded, payable with the NEW carry, base, total)
-- gets that label.
--   - 'credit' (an admin's label, kept by every writer) and 'draft' are never
--     touched, exactly as every other writer leaves them.
--   - A row is written only when its carry OR its label differs; a bill
--     already right is not written at all (no updated_at bump, no audit row).
--   - NO money figure changes: the carry arithmetic is character for
--     character the 20261009120000 one, and base / discount / total /
--     recorded_payment / paid_amount are not in the SET list. Proven against
--     fixtures/tuition-figures.golden.json by invoice-status.test.mjs, which
--     loads this file after the carry migration.
--
-- WHICH BILLS IT RELABELS, AND WHEN. Only the bills of a child whose bill is
-- written next (the trigger runs for that child's whole chain). Nothing is
-- relabelled by this migration itself: it UPDATES NO ROW. Bills of a child
-- nobody touches keep their old label until then; the count of those, and of
-- what a one-off relabel would change, is the READ-ONLY
-- scripts/CHECK-label-relabel-impact.sql (no one-off write is part of this).
--
-- No audit row for the relabel itself: it runs at trigger depth 2, and
-- audit_row_change skips depth > 1, as it does for the carry columns (derived
-- data). The person's own write that set it off is audited; the D4 bill floor
-- (zz_invoice_state_floor) still records a paid/partial -> issued lowering.
--
-- WHO CAN CALL IT (fix round 2, M-2). Until now: any signed-in account.
-- 20261009120000 revoked EXECUTE from anon and PUBLIC only, and live grants
-- it to authenticated (has_function_privilege = true, 17 Nov). As SECURITY
-- DEFINER, and with this change also rewriting invoices.status, that made
-- `SELECT public.refresh_invoice_carry(<any child>)` a definer write path
-- open to parents and students (it writes only the rule's label and moves no
-- figure, but it is not theirs to call). So EXECUTE is revoked from PUBLIC,
-- anon and authenticated below; service_role and the owner keep it.
-- Nothing else calls it, proven 17 Nov: in the repo only the trigger
-- function invoices_carry_sync (20261009120000) and the one-off backfill in
-- that file name it (supabase/functions, src - types.ts lists it, nothing
-- calls it -, docs/sql, scripts, drizzle, every migration); on live the only
-- function whose body mentions it is invoices_carry_sync(), SECURITY DEFINER
-- owned by postgres, so the trigger calls it as postgres and keeps working
-- for every writer (a person's write, an edge function, the SQL editor).
--
-- Fails closed: refuses to install unless invoice_paid_label, the carry
-- function and the trigger exist and invoices.status is the invoice_status
-- enum. Rollback: re-run the function body of
-- 20261009120000_keep_invoice_carry_balances_correct.sql (lines from
-- CREATE OR REPLACE FUNCTION public.refresh_invoice_carry to its $function$;).

DO $preflight$
BEGIN
  IF to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'G-4: public.invoice_paid_label is not installed (20261113090000). Nothing was changed.';
  END IF;
  IF to_regprocedure('public.refresh_invoice_carry(uuid)') IS NULL THEN
    RAISE EXCEPTION 'G-4: public.refresh_invoice_carry is not installed (20261009120000). Nothing was changed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.invoices'::regclass AND tgname = 'invoices_carry_sync' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'G-4: the invoices_carry_sync trigger is missing. Nothing was changed.';
  END IF;
  IF (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
       WHERE a.attrelid = 'public.invoices'::regclass AND a.attname = 'status' AND NOT a.attisdropped)
     IS DISTINCT FROM 'invoice_status' THEN
    RAISE EXCEPTION 'G-4: invoices.status is not the invoice_status enum. Nothing was changed.';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.refresh_invoice_carry(p_student_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH running AS (
    SELECT
      i.id,
      COALESCE(i.total_amount, 0)     AS ta,
      COALESCE(i.recorded_payment, 0) AS rp,
      COALESCE(
        SUM(COALESCE(i.recorded_payment, 0) - COALESCE(i.total_amount, 0))
          OVER (PARTITION BY i.student_id
                ORDER BY i.month
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
        0
      ) AS carry_in
    FROM public.invoices i
    WHERE i.student_id = p_student_id
  ),
  computed AS (
    SELECT
      r.id,
      GREATEST(r.carry_in, 0)::integer                  AS ci_credit,
      GREATEST(-r.carry_in, 0)::integer                 AS ci_debt,
      GREATEST(-(r.ta - r.carry_in - r.rp), 0)::integer AS co_credit,
      GREATEST( (r.ta - r.carry_in - r.rp), 0)::integer AS co_debt
    FROM running r
  ),
  labelled AS (
    -- The one label rule over the NEW carry: payable = charge + debt in - credit in.
    SELECT c.*,
           public.invoice_paid_label(
             COALESCE(i.recorded_payment, 0)::bigint,
             (COALESCE(i.total_amount, 0) + c.ci_debt - c.ci_credit)::bigint,
             COALESCE(i.base_amount, 0)::bigint,
             COALESCE(i.total_amount, 0)::bigint) AS by_rule,
           (i.status::text IN ('credit', 'draft')) AS keep_label
    FROM computed c
    JOIN public.invoices i ON i.id = c.id
  )
  UPDATE public.invoices i
  SET carry_in_credit  = l.ci_credit,
      carry_in_debt    = l.ci_debt,
      carry_out_credit = l.co_credit,
      carry_out_debt   = l.co_debt,
      status           = CASE WHEN l.keep_label THEN i.status ELSE l.by_rule END
  FROM labelled l
  WHERE i.id = l.id
    AND (i.carry_in_credit  IS DISTINCT FROM l.ci_credit
      OR i.carry_in_debt    IS DISTINCT FROM l.ci_debt
      OR i.carry_out_credit IS DISTINCT FROM l.co_credit
      OR i.carry_out_debt   IS DISTINCT FROM l.co_debt
      OR (NOT l.keep_label AND i.status IS DISTINCT FROM l.by_rule));
$function$;

-- Fix round 2, M-2: the trigger (SECURITY DEFINER, owner) is the only caller.
REVOKE EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) TO service_role;

COMMENT ON FUNCTION public.refresh_invoice_carry(uuid) IS
  'Recomputes carry_in_credit/debt and carry_out_credit/debt for every invoice of one student, from the invoice rows themselves, and re-derives status with invoice_paid_label over the new carry (credit and draft kept). Writes only rows that differ; never a money figure. Called by the invoices_carry_sync trigger only; EXECUTE revoked from PUBLIC, anon and authenticated (D5 G-4, 20261117110000).';

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
