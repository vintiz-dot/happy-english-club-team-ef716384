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
  )
  UPDATE public.invoices i
  SET carry_in_credit  = c.ci_credit,
      carry_in_debt    = c.ci_debt,
      carry_out_credit = c.co_credit,
      carry_out_debt   = c.co_debt
  FROM computed c
  WHERE i.id = c.id
    AND (i.carry_in_credit  IS DISTINCT FROM c.ci_credit
      OR i.carry_in_debt    IS DISTINCT FROM c.ci_debt
      OR i.carry_out_credit IS DISTINCT FROM c.co_credit
      OR i.carry_out_debt   IS DISTINCT FROM c.co_debt);
$function$;

COMMENT ON FUNCTION public.refresh_invoice_carry(uuid) IS
  'Recomputes carry_in_credit/debt and carry_out_credit/debt for every invoice of one student, from the invoice rows themselves. Idempotent, and a no-op when the stored values already agree. Called by the invoices_carry_sync trigger; not meant to be called from the client.';

REVOKE EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) FROM anon, PUBLIC;

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

CREATE OR REPLACE FUNCTION public.invoices_carry_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
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

CREATE TRIGGER invoices_carry_sync
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.invoices_carry_sync();

COMMENT ON COLUMN public.invoices.carry_in_credit IS
  'Credit carried in from earlier months (family is ahead). Maintained by the invoices_carry_sync trigger; do not write it directly - anything written is recomputed.';
COMMENT ON COLUMN public.invoices.carry_in_debt IS
  'Debt carried in from earlier months (family owes). Maintained by the invoices_carry_sync trigger; do not write it directly.';
COMMENT ON COLUMN public.invoices.carry_out_credit IS
  'Closing credit for this month, after this month''s charges and payments. Maintained by the invoices_carry_sync trigger; do not write it directly.';
COMMENT ON COLUMN public.invoices.carry_out_debt IS
  'Closing debt for this month, after this month''s charges and payments. Maintained by the invoices_carry_sync trigger; do not write it directly.';