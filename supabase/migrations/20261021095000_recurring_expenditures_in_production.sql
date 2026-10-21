-- "Could not find the table 'public.recurring_expenditures' in the schema
-- cache."
--
-- The Recurring Expenditures panel has been shipped and unusable: the
-- table it writes to was defined in 20260418100000 and that migration
-- never reached production. The same migration adds
-- expenditures.source_template_id, which is how the panel knows a
-- template has already been applied to a month, so "Apply recurring" was
-- broken too.
--
-- WHY A SECOND FILE RATHER THAN RE-RUNNING THE FIRST. 20260418100000 is
-- dated before 20260712023825, the migration that revoked the default
-- privileges on public and re-granted every table that existed at that
-- moment. A fresh database replays them in that order and the table is
-- granted on the way past. This database did not: the grant pass ran
-- while the table did not exist, so creating it now with nothing else
-- would leave it with no privileges for authenticated - and PostgREST
-- reports a table it cannot reach with exactly the message above, which
-- is why "create the table" alone would have looked like it had not
-- worked.
--
-- Everything here is guarded, so a database that did apply 20260418100000
-- gets only the grants, and a fresh one that replays both files in order
-- gets nothing from this one.

CREATE TABLE IF NOT EXISTS public.recurring_expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  memo TEXT,
  -- Day of month the recurring expense lands on. A 31st is clamped to the
  -- last day of a shorter month at apply time.
  day_of_month SMALLINT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
  -- First month this template is active (YYYY-MM-01).
  start_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  -- Optional last month - null is open-ended.
  end_month DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.recurring_expenditures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage recurring expenditures" ON public.recurring_expenditures;
CREATE POLICY "Admins can manage recurring expenditures"
ON public.recurring_expenditures
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_recurring_expenditures_updated_at ON public.recurring_expenditures;
CREATE TRIGGER update_recurring_expenditures_updated_at
  BEFORE UPDATE ON public.recurring_expenditures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Which template a generated expenditure came from, so applying twice
-- cannot book the rent twice.
ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS source_template_id UUID
    REFERENCES public.recurring_expenditures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenditures_template_month
  ON public.expenditures (source_template_id, date)
  WHERE source_template_id IS NOT NULL;

-- The part 20260418100000 could not know it would need. This database has
-- explicit grants, not inherited ones: 20260712023825 revoked the
-- defaults, so a new table arrives with no privileges at all and is
-- invisible to PostgREST until it is granted.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenditures TO authenticated;
GRANT ALL ON public.recurring_expenditures TO service_role;

COMMENT ON TABLE public.recurring_expenditures IS
  'Templates for costs that repeat every month - rent, internet, utilities. An admin defines one, and the Expenditures page offers to apply it to a month; expenditures.source_template_id records that it has been, so applying again is a no-op rather than a second charge.';

-- PostgREST caches the schema and will keep returning "could not find the
-- table" against a table that now exists until it is told otherwise.
NOTIFY pgrst, 'reload schema';
