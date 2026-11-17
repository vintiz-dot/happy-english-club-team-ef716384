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
