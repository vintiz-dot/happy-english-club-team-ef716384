-- Recurring expenditure templates: rent, internet, salaries, etc.
-- Admin defines a template once; the UI auto-applies it to any month
-- that hasn't been generated yet (idempotent via source_template_id +
-- expenditures.date being inside the target month).
CREATE TABLE IF NOT EXISTS public.recurring_expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  memo TEXT,
  -- Day of month the recurring expense lands on (1..28). 31-day months
  -- are clamped to the last day at apply-time.
  day_of_month SMALLINT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
  -- First month this template is active (YYYY-MM-01).
  start_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  -- Optional last month — null = open-ended.
  end_month DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.recurring_expenditures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurring expenditures"
ON public.recurring_expenditures
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recurring_expenditures_updated_at
  BEFORE UPDATE ON public.recurring_expenditures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Track which template a generated expenditure came from so we can avoid
-- double-applying when the admin hits "Apply recurring" again.
ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS source_template_id UUID
    REFERENCES public.recurring_expenditures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenditures_template_month
  ON public.expenditures (source_template_id, date)
  WHERE source_template_id IS NOT NULL;
