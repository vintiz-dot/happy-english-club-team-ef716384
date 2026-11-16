// D4 step 3B review: the reviewer's own mutants, run through the builder's
// runner (d4-mutants-3b.mjs) unchanged except for the list. Generated at run
// time so the engine cannot drift.   node scripts/pgtest/review3b-mutants.mjs [ids]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(here, 'd4-mutants-3b.mjs'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('export const MUTANTS = [');
const b = src.indexOf('\n];\n', a);
const MINE = String.raw`export const MUTANTS = [
  ['R01', 'an unknown lane (anon, a role with no user) passes like the owner',
    "  IF v_lane = 'owner' THEN", "  IF v_lane IN ('owner', 'unknown') THEN", ['inputs']],
  ['R02', 'the reach shortcut ignores the bill floor (a deleted bill no longer marks the first reachable month)',
    "      (SELECT min(to_date(f.month, 'YYYY-MM')) FROM public.invoice_state_floor f WHERE f.student_id = ANY (v_kids) AND f.month ~ '^\d{4}-\d{2}$'),",
    "      (SELECT NULL::date),", ['inputs', 'oracle']],
  ['R03', 'the pay reach shortcut ignores lessons (only locked months mark the first reachable day)',
    "  SELECT LEAST((SELECT min(s.date) FROM public.sessions s),", "  SELECT LEAST((SELECT NULL::date),", ['inputs', 'oracle']],
  ['R04', 'the reach shortcut is off by one day (a reach ending on the first reachable day is T0)',
    "  IF v_first IS NULL OR v_to < GREATEST(p_from, v_first) THEN", "  IF v_first IS NULL OR v_to <= GREATEST(p_from, v_first) THEN", ['inputs', 'oracle']],
  ['R05', 'a discount assignment re-pointed at another definition is "nothing priced" (trigger)',
    "ELSE ARRAY['discount_def_id'] END, 1);", "ELSE ARRAY[]::text[] END, 1);", ['inputs', 'oracle']],
  ['R06', 'a referral bonus value change is "nothing priced" (trigger)',
    "CASE WHEN v_entity = 'referral_bonus' THEN ARRAY['type', 'value', 'cadence']", "CASE WHEN v_entity = 'referral_bonus' THEN ARRAY['type', 'cadence']", ['inputs', 'oracle']],
  ['R07', 'a definition\'s cadence may change while in use',
    "     AND NEW.cadence IS NOT DISTINCT FROM OLD.cadence AND NEW.start_month", "     AND NEW.start_month", ['inputs']],
  ['R08', 'a pay-rate row\'s hourly rate change is "only the note"',
    "       AND NEW.hourly_rate_vnd IS NOT DISTINCT FROM OLD.hourly_rate_vnd\n", "\n", ['inputs', 'oracle']],
  ['R09', 'the teachers mirror guard ignores per_session_rate_vnd',
    "ON public.teachers\n  FOR EACH ROW\n  WHEN (OLD.pay_rate_type IS DISTINCT FROM NEW.pay_rate_type OR OLD.hourly_rate_vnd IS DISTINCT FROM NEW.hourly_rate_vnd\n     OR OLD.per_session_rate_vnd IS DISTINCT FROM NEW.per_session_rate_vnd)",
    "ON public.teachers\n  FOR EACH ROW\n  WHEN (OLD.pay_rate_type IS DISTINCT FROM NEW.pay_rate_type OR OLD.hourly_rate_vnd IS DISTINCT FROM NEW.hourly_rate_vnd)", ['inputs']],
  ['R10', 'a student with a payment (and nothing else) may be deleted',
    "  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.student_id = OLD.id)", "  IF false", ['inputs']],
  ['R11', 'the register exemption takes an enrolment override of ANOTHER transaction',
    "     WHERE o.id::text = v_ack AND o.txid = txid_current() AND o.entity = 'enrollment'", "     WHERE o.id::text = v_ack AND o.entity = 'enrollment'", ['inputs']],
  ['R12', 'an acknowledgement of any discount op covers an INSERT',
    "        WHEN TG_OP = 'INSERT' THEN v_op = 'assign'", "        WHEN TG_OP = 'INSERT' THEN true", ['inputs']],
  ['R13', 'definition_in_use loses the lead day (an assignment from the 1st, read for the month before)',
    "    r := public._money_tuition_reach(ARRAY[x.student_id], NULL, x.effective_from - 1, x.effective_to);",
    "    r := public._money_tuition_reach(ARRAY[x.student_id], NULL, x.effective_from, x.effective_to);", ['inputs']],
];
`;
src = src.slice(0, a) + MINE + src.slice(b + 4);
const out = join(here, '.review3b-mutants.gen.mjs');
writeFileSync(out, src);
await import(pathToFileURL(out).href);
