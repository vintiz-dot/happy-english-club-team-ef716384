ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tuition_frozen boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS frozen_reason text;

CREATE OR REPLACE FUNCTION public.keep_frozen_invoice_amounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.tuition_frozen THEN
    IF NEW.tuition_frozen IS DISTINCT FROM false OR NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.tuition_frozen := true;
      NEW.frozen_reason := OLD.frozen_reason;
      NEW.base_amount := OLD.base_amount;
      NEW.discount_amount := OLD.discount_amount;
      NEW.total_amount := OLD.total_amount;
      NEW.class_breakdown := OLD.class_breakdown;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_frozen_invoice_amounts ON public.invoices;
CREATE TRIGGER keep_frozen_invoice_amounts
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.keep_frozen_invoice_amounts();