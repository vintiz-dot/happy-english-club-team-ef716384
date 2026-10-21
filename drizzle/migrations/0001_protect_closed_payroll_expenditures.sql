CREATE OR REPLACE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  blocked text;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.source_kind IS NOT DISTINCT FROM 'payroll' THEN
    IF public.payroll_month_is_locked(split_part(NEW.source_key, ':', 1)) THEN
      blocked := split_part(NEW.source_key, ':', 1);
    ELSIF public.payroll_month_is_locked(to_char(NEW.date, 'YYYY-MM')) THEN
      blocked := to_char(NEW.date, 'YYYY-MM');
    END IF;
  END IF;
  IF blocked IS NULL AND TG_OP <> 'INSERT' AND OLD.source_kind IS NOT DISTINCT FROM 'payroll' THEN
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
CREATE TRIGGER refuse_payroll_expenditure_in_locked_month
BEFORE INSERT OR UPDATE OR DELETE ON public.expenditures
FOR EACH ROW EXECUTE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month();