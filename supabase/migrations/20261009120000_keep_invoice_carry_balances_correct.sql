-- Make invoices.carry_in_* / carry_out_* maintain themselves.
--
-- These four columns were written once, by calculate-tuition, at whatever
-- moment it last ran for a given student and month - and then never again.
-- Nothing refreshed them. Recording a payment against March did not touch
-- April's row; the payment dialogs read April's stale carry_in_credit out of
-- the row and wrote the same stale number straight back. Recalculating an
-- earlier month left every later month untouched. So on a live finance table
-- the columns drifted from the truth the moment anything upstream changed,
-- and the only way to notice was to recompute by hand.
--
-- The carry is not independent data. It is a running total, fully determined
-- by the invoice rows that already exist:
--
--     carry_in(M) = sum over months < M of (recorded_payment - total_amount)
--     closing(M)  = total_amount(M) - carry_in(M) - recorded_payment(M)
--
-- which is exactly what calculate-tuition computes in memory on every call.
-- So the columns are a cache, and a cache with no invalidation is a bug with
-- a schedule. This replaces the invalidation with arithmetic: one function
-- that recomputes a student's whole chain from the rows themselves, a
-- trigger that runs it whenever any invoice for that student changes, and a
-- one-off backfill for the rows that are wrong today.
--
-- Positive carry_in is credit (the family is ahead), negative is debt. Same
-- convention as calculate-tuition and calculate-tuition-bulk, and the four
-- columns stay non-negative, as they always were.
--
-- Not touched: monthly_finance_snapshots keeps its own copies of these
-- figures, and those are MEANT to be frozen - they are the audit record of a
-- closed month, and re-closing supersedes rather than overwrites.

-- ---------------------------------------------------------------- function

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
      -- Everything strictly before this row's month. `month` is TEXT in
      -- 'YYYY-MM', so lexical order is chronological, and the existing
      -- UNIQUE (student_id, month) means ROWS framing has no ties to break.
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
  )
  UPDATE public.invoices i
  SET carry_in_credit  = c.ci_credit,
      carry_in_debt    = c.ci_debt,
      carry_out_credit = c.co_credit,
      carry_out_debt   = c.co_debt
  FROM computed c
  WHERE i.id = c.id
    -- Writing only genuine changes is what stops the trigger below from
    -- recursing: when the values already agree this updates zero rows, so
    -- nothing re-fires. It also keeps churn off rows that did not move.
    AND (i.carry_in_credit  IS DISTINCT FROM c.ci_credit
      OR i.carry_in_debt    IS DISTINCT FROM c.ci_debt
      OR i.carry_out_credit IS DISTINCT FROM c.co_credit
      OR i.carry_out_debt   IS DISTINCT FROM c.co_debt);
$function$;

COMMENT ON FUNCTION public.refresh_invoice_carry(uuid) IS
  'Recomputes carry_in_credit/debt and carry_out_credit/debt for every invoice of one student, from the invoice rows themselves. Idempotent, and a no-op when the stored values already agree. Called by the invoices_carry_sync trigger; not meant to be called from the client.';

-- Nothing client-side should call this. Supabase grants EXECUTE on public
-- functions to anon/authenticated/service_role explicitly via the schema's
-- default privileges, and CREATE OR REPLACE preserves the existing ACL, so
-- this revoke removes anonymous access without affecting the trigger (which
-- runs as the function owner) or signed-in users doing ordinary writes.
REVOKE EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) FROM anon, PUBLIC;

-- ---------------------------------------------------------------- backfill
-- Runs before the trigger exists, so it does not fire row by row. Every
-- student is recomputed; rows already correct are skipped by the guard.

DO $$
DECLARE
  s uuid;
  n integer := 0;
BEGIN
  FOR s IN SELECT DISTINCT student_id FROM public.invoices LOOP
    PERFORM public.refresh_invoice_carry(s);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'refresh_invoice_carry: backfilled % students', n;
END $$;

-- ----------------------------------------------------------------- trigger

CREATE OR REPLACE FUNCTION public.invoices_carry_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Depth 1 is the caller's own write. Anything deeper is the UPDATE this
  -- trigger just issued, and that update already holds the correct value.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  PERFORM public.refresh_invoice_carry(COALESCE(NEW.student_id, OLD.student_id));
  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.invoices_carry_sync() IS
  'AFTER trigger on invoices. Recomputes the whole carry chain for the affected student. Guarded by pg_trigger_depth so its own writes do not re-enter.';

DROP TRIGGER IF EXISTS invoices_carry_sync ON public.invoices;

-- Fires on any change, not only to total_amount/recorded_payment: a caller
-- that writes the carry columns directly (the payment dialogs do exactly
-- that) must not be able to leave a wrong value behind.
CREATE TRIGGER invoices_carry_sync
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.invoices_carry_sync();

-- ---------------------------------------------------------------- comments

COMMENT ON COLUMN public.invoices.carry_in_credit IS
  'Credit carried in from earlier months (family is ahead). Maintained by the invoices_carry_sync trigger; do not write it directly - anything written is recomputed.';
COMMENT ON COLUMN public.invoices.carry_in_debt IS
  'Debt carried in from earlier months (family owes). Maintained by the invoices_carry_sync trigger; do not write it directly.';
COMMENT ON COLUMN public.invoices.carry_out_credit IS
  'Closing credit for this month, after this month''s charges and payments. Maintained by the invoices_carry_sync trigger; do not write it directly.';
COMMENT ON COLUMN public.invoices.carry_out_debt IS
  'Closing debt for this month, after this month''s charges and payments. Maintained by the invoices_carry_sync trigger; do not write it directly.';
