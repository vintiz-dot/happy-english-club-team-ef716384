-- Closed months stop moving, including their wage bill.
--
-- WHY THIS FILE EXISTS. The logic below was written by the Lovable agent
-- and landed only in drizzle/migrations/0001. That tree is not the one
-- the owner applies - they paste from supabase/migrations/ - so the
-- protection existed in the repository and, as far as anything here can
-- tell, not necessarily in the database, while AGENTS.md stated it as
-- fact. This brings it into the authoritative tree. Same function and
-- trigger names, so a database where drizzle already applied it gets a
-- harmless redefinition rather than a second trigger.
--
-- WHAT IT GUARDS. 20261021093000 froze payroll_lines and
-- payroll_summaries when a month is closed, and 20261021098000 froze
-- standing costs. Neither covered the payroll rows in expenditures - the
-- wage bill that close-payroll-month books - so a stale browser tab, or
-- an admin on the Expenditures page, could still rewrite what a closed
-- month paid out. Everything else about that month is immovable; this
-- was the hole.
--
-- BOTH THE MONTH IN THE KEY AND THE MONTH IN THE DATE. source_key is
-- '<YYYY-MM>:<teacher|assistant>:<id>', and the row's date is that
-- month's last day, so normally the two agree. Checking both is what
-- stops a row being dragged OUT of a closed month: an update that blanks
-- source_kind and moves the date into an open month is refused because
-- the OLD row still belongs to a closed one.
--
-- WHAT IT DELIBERATELY DOES NOT BLOCK. close-payroll-month books the
-- wage bill while the period is still OPEN and sets the lock last, so
-- closing a month is unaffected. Ordinary hand-entered costs - rent,
-- taxis, anything not categorised as payroll - stay editable in a closed
-- month, which is an existing freedom. Correcting a month that has
-- genuinely been paid wrong is done by reopening it, or by carrying an
-- adjustment into the next open month; both are offered by the Payroll
-- tab.

-- Is this expenditure row the wage bill?
--
-- source_kind says so for anything booked since 20261021092000; before
-- that the only evidence is the category the payroll button wrote.
CREATE OR REPLACE FUNCTION public.is_payroll_expenditure(p_source_kind text, p_category text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT p_source_kind IS NOT DISTINCT FROM 'payroll'
      OR (p_source_kind IS NULL AND p_category IN ('Teacher Payroll', 'TA Payroll'));
$fn$;

REVOKE EXECUTE ON FUNCTION public.is_payroll_expenditure(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_payroll_expenditure(text, text) TO authenticated, service_role;

-- ONE CHANGE FROM THE ORIGINAL. Both arms of Lovable's version are gated
-- on source_kind = 'payroll', and the wage-bill rows already in this
-- database predate source_kind: 20261021092000 added that column and its
-- own header says "Rows already booked carry no source", with a WARNING
-- counting exactly those rows. For them the guard never fires, so the
-- months the owner is most likely to close first - the ones already on
-- the books - would be the ones left unprotected.
--
-- So a row is payroll if it says so, OR if it carries one of the two
-- categories the payroll button has always written. That is the same
-- two-way recognition src/lib/finance/expenditureSplit.ts uses to keep
-- wages out of operating spend, for the same reason.
CREATE OR REPLACE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  blocked text;
BEGIN
  IF TG_OP <> 'DELETE' AND public.is_payroll_expenditure(NEW.source_kind, NEW.category) THEN
    IF public.payroll_month_is_locked(split_part(NEW.source_key, ':', 1)) THEN
      blocked := split_part(NEW.source_key, ':', 1);
    ELSIF public.payroll_month_is_locked(to_char(NEW.date, 'YYYY-MM')) THEN
      blocked := to_char(NEW.date, 'YYYY-MM');
    END IF;
  END IF;

  IF blocked IS NULL AND TG_OP <> 'INSERT' AND public.is_payroll_expenditure(OLD.source_kind, OLD.category) THEN
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

DROP TRIGGER IF EXISTS refuse_payroll_expenditure_in_locked_month ON public.expenditures;
CREATE TRIGGER refuse_payroll_expenditure_in_locked_month
  BEFORE INSERT OR UPDATE OR DELETE ON public.expenditures
  FOR EACH ROW EXECUTE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month();

COMMENT ON FUNCTION public.refuse_payroll_expenditure_write_to_locked_month() IS
  'Refuses writes to payroll-sourced expenditure rows belonging to a closed month, in either direction. Sits beside refuse_recurring_write_to_locked_month (20261021098000), which does the same for standing costs; the two are scoped to different source_kind values and do not overlap.';
