-- T4: ONE label rule for invoices.status, in SQL too.
--
-- The rule lives in supabase/functions/_lib/invoice-status.ts (paidLabel),
-- mirrored for the browser by src/lib/invoiceStatus.ts. ai_action_apply and
-- ai_action_undo (20261107090000) wrote the label with their own CASE, which
-- said `partial` for a month already covered (credit carried in, or paid
-- over) and `issued` for a month covered by credit with nothing recorded.
-- This adds the rule as a function and points those two CASE expressions at
-- it:
--
--   paid     when recorded >= payable, and the month charged something
--            (base or total > 0) or money was recorded in it
--   partial  when recorded > 0 otherwise
--   issued   otherwise
--   (payable = total + carry-in debt - carry-in credit, as before)
--
-- scripts/pgtest/invoice-status.test.mjs compares this function with the
-- TypeScript one on a grid; scripts/pgtest/ai-actions.test.mjs runs the
-- assistant's payment and undo through it.
--
-- HOW the two functions are changed: by editing the definition that is
-- INSTALLED, not by pasting a copy of 20261107090000. Those functions may
-- carry a later fix applied from another branch; a full CREATE OR REPLACE
-- from this repo would silently take it out. So the block below reads each
-- live definition, replaces exactly the one label expression (whitespace
-- may differ), and re-creates it. Nothing else in either function changes,
-- and CREATE OR REPLACE keeps their grants.
--
-- Safe to run twice: a definition that already calls invoice_paid_label is
-- left alone. If a function exists but holds neither the old expression nor
-- the new call, the migration STOPS with an error and changes nothing - a
-- person must look, rather than this guess.
--
-- An admin's 'credit' label is kept by both, as by every other writer.
--
-- AFTER THIS, the installed source of the two functions is in NO migration:
-- it is kept in docs/sql/ai_action_apply_undo.installed.sql, and
-- scripts/pgtest/ai-actions.test.mjs fails if the patched functions differ
-- from it. A later change to either function starts from THAT file, not from
-- 20261107090000 (which still holds the old label CASE); the same suite fails
-- if a later migration re-creates either without invoice_paid_label.
--
-- Updates no row. A bill's stored label changes only when something writes
-- it next (a payment, or calculate-tuition), exactly as before.

CREATE OR REPLACE FUNCTION public.invoice_paid_label(
  p_recorded bigint,
  p_payable bigint,
  p_base bigint,
  p_total bigint
)
RETURNS public.invoice_status
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT (CASE
    WHEN coalesce(p_recorded, 0) >= coalesce(p_payable, 0)
         AND (coalesce(p_recorded, 0) > 0 OR greatest(coalesce(p_base, 0), coalesce(p_total, 0)) > 0)
      THEN 'paid'
    WHEN coalesce(p_recorded, 0) > 0 THEN 'partial'
    ELSE 'issued'
  END)::public.invoice_status
$function$;

COMMENT ON FUNCTION public.invoice_paid_label(bigint, bigint, bigint, bigint) IS
  'The invoices.status rule (paid / partial / issued) from the month''s own money: recorded payment, payable (total + carry-in debt - carry-in credit), base and total. Same rule as paidLabel in supabase/functions/_lib/invoice-status.ts.';

DO $migration$
DECLARE
  -- function, the variable holding the month's recorded payment in it
  targets text[][] := ARRAY[
    ARRAY['public.ai_action_apply(uuid, text, jsonb)', 'v_total'],
    ARRAY['public.ai_action_undo(uuid)', 'v_left']
  ];
  t text[];
  fn regprocedure;
  def text;
  pattern text;
  replacement text;
  n integer;
BEGIN
  FOREACH t SLICE 1 IN ARRAY targets LOOP
    fn := to_regprocedure(t[1]);
    IF fn IS NULL THEN
      RAISE NOTICE 'invoice_paid_label: % is not installed here, nothing to change', t[1];
      CONTINUE;
    END IF;
    def := pg_get_functiondef(fn);
    -- An admin's 'credit' is kept, as every other writer keeps it.
    replacement := format(
      '(CASE WHEN invoices.status = ''credit'' THEN invoices.status ELSE public.invoice_paid_label(%s, v_payable, invoices.base_amount, invoices.total_amount) END)',
      t[2]);
    IF position(replacement IN def) > 0 THEN
      RAISE NOTICE 'invoice_paid_label: % already uses the rule', t[1];
      CONTINUE;
    END IF;
    -- (CASE WHEN v_x >= v_payable AND v_payable > 0 THEN 'paid'
    --       WHEN v_x > 0 THEN 'partial' ELSE 'issued' END)::invoice_status
    pattern := format(
      '\(CASE\s+WHEN\s+%1$s\s*>=\s*v_payable\s+AND\s+v_payable\s*>\s*0\s+THEN\s+''paid''\s+WHEN\s+%1$s\s*>\s*0\s+THEN\s+''partial''\s+ELSE\s+''issued''\s+END\)::(public\.)?invoice_status',
      t[2]);
    SELECT count(*) INTO n FROM regexp_matches(def, pattern, 'g');
    IF n <> 1 THEN
      RAISE EXCEPTION 'invoice_paid_label: expected exactly one label expression in %, found %; nothing was changed', t[1], n;
    END IF;
    EXECUTE regexp_replace(def, pattern, replacement);
    RAISE NOTICE 'invoice_paid_label: % now uses the rule', t[1];
  END LOOP;
END
$migration$;
