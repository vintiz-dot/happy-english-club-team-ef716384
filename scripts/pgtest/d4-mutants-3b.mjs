// D4 step 3B mutation runner (docs/evidence/D4-design.md f.6). Not part of
// run.mjs: it takes minutes. Same shape as d4-mutants.mjs (steps 1a / 1b),
// in a file of its own so the two steps built side by side do not collide.
//
// Each mutant is ONE textual change (the pattern must occur exactly once) to
// the step 3B migration or to one of its edge functions. A migration mutant
// is written to a scratch copy and the named suites run with that copy in
// place of the real file; a function mutant is applied in place for the run
// and the original bytes put back. The verdict is CAUGHT (some suite failed,
// with its first failing line) or SURVIVED. Survivors are reported, not hidden.
//
//   node scripts/pgtest/d4-mutants-3b.mjs            every mutant
//   node scripts/pgtest/d4-mutants-3b.mjs S04 F02    only these
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { migPath, repo, AUDIT, CANCEL, D1, D2, FLOORS } from './d4-prelude.mjs';
import { ENROL_NO_AUTO, ENROL_RPCS, PAUSE, DEACTIVATE, INPUTS } from './d4-inputs-prelude.mjs';

const BASE = [AUDIT, CANCEL, '20261106090000_attendance_enrollment_guard.sql', D1, D2, '20261106120000_invoice_tuition_freeze.sql',
  FLOORS, '20261114091000_d4_core_register.sql', ENROL_NO_AUTO, ENROL_RPCS, PAUSE, DEACTIVATE];
const ROLLBACK5 = join(repo, 'scripts', 'ROLLBACK-d4-5-money-inputs.sql');
const SUITES = {
  inputs: { file: 'd4-money-inputs.test.mjs', args: [ROLLBACK5] },
  fn: { file: 'd4-functions-inputs.test.mjs' },
  oracle: { file: 'd4-reach-oracle.test.mjs' },
  lib: { file: 'money-inputs-lib.test.mjs', noMigrations: true },
};
const RATE = 'supabase/functions/update-enrollment-rate/index.ts';
const FAMILY = 'supabase/functions/create-family/index.ts';
const DEMO = 'supabase/functions/manage-demo-student/index.ts';
const IMPORT = 'supabase/functions/admin-data-import/index.ts';

// [id, what it breaks, find (exactly once), replace, suites, file (default: the migration)]
export const MUTANTS = [
  ['S01', 'the gate lets everything through (every money-input guard dead)',
    "  IF v_tier = 0 OR COALESCE(p_acked, false) THEN\n    RETURN;", "  IF true THEN\n    RETURN;", ['inputs']],
  ['S02', 'the service lane passes like the owner (one mutant for every trigger: they share the gate)',
    "  IF v_lane = 'owner' THEN\n    INSERT INTO public.money_change_events (kind, payload)\n    VALUES ('owner_lane', jsonb_build_object('table', p_table",
    "  IF v_lane IN ('owner', 'service') THEN\n    INSERT INTO public.money_change_events (kind, payload)\n    VALUES ('owner_lane', jsonb_build_object('table', p_table", ['inputs']],
  ['S03', 'the owner lane leaves no event',
    "    VALUES ('owner_lane', jsonb_build_object('table', p_table, 'op', p_tg_op, 'row_id', p_row_id, 'entity', p_entity, 'tier', v_tier));\n    RETURN;",
    "    SELECT 'owner_lane', '{}'::jsonb WHERE false;\n    RETURN;", ['inputs']],
  ['S04', 'enrollment_identity dropped (an enrolment may change child or class)',
    "  IF TG_OP = 'UPDATE' AND (NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.class_id IS DISTINCT FROM OLD.class_id) THEN",
    "  IF false THEN", ['inputs']],
  ['S05', 'discount_identity dropped (R-5: a discount may be re-pointed at another child)',
    "  IF TG_OP = 'UPDATE' AND (o -> 'student_id') IS DISTINCT FROM (n -> 'student_id') THEN", "  IF false THEN", ['inputs']],
  ['S06', 'the family reach leaves out the children of the NEW family (R-14)',
    "      OR (p_new_family IS NOT NULL AND s.family_id = p_new_family);", "      ;", ['inputs']],
  ['S07', 'days entering an enrolment of a class taught in a past month are tier 0 (backdated enrol of a new child)',
    "  IF v_tier < 1 AND p_class IS NOT NULL AND EXISTS (", "  IF false AND p_class IS NOT NULL AND EXISTS (", ['inputs', 'fn']],
  ['S08', 'a discount dated the 1st does not reach the month before (the calculator reads it there)',
    "CASE WHEN v_entity = 'referral_bonus' THEN ARRAY['type', 'value', 'cadence'] ELSE ARRAY['discount_def_id'] END, 1);",
    "CASE WHEN v_entity = 'referral_bonus' THEN ARRAY['type', 'value', 'cadence'] ELSE ARRAY['discount_def_id'] END, 0);", ['inputs']],
  ['S09', 'a rate / discount / weekday change is judged like a date-only change (reaches no day)',
    "  IF v_cols <@ ARRAY[p_start, p_end] THEN", "  IF true THEN", ['inputs']],
  ['S10', 'the acknowledgement ignores the class (a transfer covers the child\'s third enrolment)',
    "      v_ok := COALESCE((a -> 'change' -> 'class_ids') ? v_class::text, false) AND CASE", "      v_ok := true AND CASE", ['inputs']],
  ['S11', 'the acknowledgement ignores the kind of change (a set_rate covers a start date)',
    "          WHEN v_op = 'set_rate' THEN v_cols <@ ARRAY['rate_override_vnd'] AND a ->> 'target_id' = v_id::text",
    "          WHEN v_op = 'set_rate' THEN true", ['inputs']],
  ['S12', 'the acknowledgement skips step 1b\'s _money_ack (child, window, tier: A-8)',
    "  IF NOT public._money_ack(ARRAY[p_entity], o.target_id, p_student, p_from, p_to, p_tier) THEN", "  IF false THEN", ['inputs']],
  ['S13', 'a definition may be switched off while in use (is_active not a pricing column)',
    "     AND NEW.end_month IS NOT DISTINCT FROM OLD.end_month AND NEW.amortize_yearly IS NOT DISTINCT FROM OLD.amortize_yearly\n     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN",
    "     AND NEW.end_month IS NOT DISTINCT FROM OLD.end_month AND NEW.amortize_yearly IS NOT DISTINCT FROM OLD.amortize_yearly THEN", ['inputs']],
  ['S14', 'a definition in use may be deleted (definition guard on UPDATE only)',
    "CREATE TRIGGER zz_discount_definition_guard BEFORE UPDATE OR DELETE ON public.discount_definitions",
    "CREATE TRIGGER zz_discount_definition_guard BEFORE UPDATE ON public.discount_definitions", ['inputs']],
  ['S15', 'definition_in_use ignores the reach (never refuses)',
    "    IF COALESCE((r ->> 'tier')::int, 3) > 0 THEN\n      RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',\n        DETAIL = 'code=definition_in_use;",
    "    IF false THEN\n      RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121',\n        DETAIL = 'code=definition_in_use;", ['inputs']],
  ['S16', 'the mirror columns pay nobody whatever the history (mirror guard always tier 0)',
    "                                 CASE WHEN p_first IS NULL THEN NULL ELSE p_first - 1 END)", "                                 DATE '1899-12-31')", ['inputs', 'oracle']],
  ['S17', 'a pay-rate acknowledgement for one person covers another\'s row',
    "    v_ok := a IS NOT NULL AND v_subject IS NOT NULL AND a ->> 'target_id' = v_subject::text\n",
    "    v_ok := a IS NOT NULL\n", ['inputs']],
  ['S18', 'the pay plan ignores what moving "the rate now" reaches (first dated rate of someone with no history)',
    "  IF v_mirror_next IS NOT NULL AND v_mirror_next IS DISTINCT FROM v_mirror_now THEN", "  IF false THEN", ['inputs']],
  ['S19', 'an UPDATE of a pay rate is always "only the note"',
    "    IF NEW.teacher_id IS NOT DISTINCT FROM OLD.teacher_id AND NEW.assistant_id IS NOT DISTINCT FROM OLD.assistant_id\n       AND NEW.effective_from",
    "    IF true OR NEW.teacher_id IS NOT DISTINCT FROM OLD.teacher_id AND NEW.assistant_id IS NOT DISTINCT FROM OLD.assistant_id\n       AND NEW.effective_from", ['inputs', 'oracle']],
  ['S20', 'unfreezing a paid or confirmed bill is T2, not T3',
    "OR COALESCE(f.ever_paid, false) OR COALESCE(f.ever_signed, false) THEN 3 ELSE 2 END", "OR COALESCE(f.ever_paid, false) OR COALESCE(f.ever_signed, false) THEN 2 ELSE 2 END", ['inputs']],
  ['S21', 'the unfreeze tier ignores the bill floor (reset the payment, then unfreeze at T2)',
    "                  OR COALESCE(f.ever_paid, false) OR COALESCE(f.ever_signed, false) THEN 3 ELSE 2 END", "                  THEN 3 ELSE 2 END", ['inputs']],
  ['S22', 'any acknowledged unfreeze unfreezes any bill',
    "    a IS NOT NULL AND a ->> 'op' = 'unfreeze' AND a ->> 'target_id' = OLD.id::text,", "    a IS NOT NULL,", ['inputs']],
  ['S23', 'families.sibling_percent_override is not guarded',
    "  FOR EACH ROW WHEN (OLD.sibling_percent_override IS DISTINCT FROM NEW.sibling_percent_override)", "  FOR EACH ROW WHEN (false)", ['inputs', 'oracle']],
  ['S24', 'students.sibling_discount_from is not guarded',
    "  WHEN (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.sibling_discount_from IS DISTINCT FROM NEW.sibling_discount_from)",
    "  WHEN (OLD.family_id IS DISTINCT FROM NEW.family_id)", ['inputs', 'oracle']],
  ['S25', 'a student whose only history is a person\'s mark may be deleted',
    "     OR EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = OLD.id AND a.marked_by IS NOT NULL) THEN", "     THEN", ['inputs']],
  ['S26', 'the student delete guard ignores the bill floor',
    "     OR EXISTS (SELECT 1 FROM public.invoice_state_floor f WHERE f.student_id = OLD.id\n                 AND (f.ever_paid OR COALESCE(f.max_recorded_payment, 0) > 0))\n", "", ['inputs']],
  ['S27', 'class_has_history dropped',
    "  IF EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = OLD.id) THEN", "  IF false THEN", ['inputs']],
  ['S28', 'a direct pause_enrollment over billed months is still let through (not judged once its checked path exists)',
    "  IF v_name = 'pause_enrollment' AND EXISTS (", "  IF false AND EXISTS (", ['inputs']],
  ['S29', 'ANY enrolment acknowledgement opens the register (not only end / transfer / pause)',
    "     WHERE o.id::text = v_ack AND o.txid = txid_current() AND o.entity = 'enrollment'\n       AND o.op IN ('end', 'transfer', 'pause');",
    "     WHERE o.id::text = v_ack AND o.txid = txid_current() AND o.entity = 'enrollment';", ['inputs']],
  ['S30', 'the checked end / transfer / pause cannot write their register rows (the helper does not answer for them)',
    "    IF FOUND THEN\n      RETURN 'checked_' || v_op;", "    IF false THEN\n      RETURN 'checked_' || v_op;", ['inputs']],
  ['S31', 'change_enrollment_terms open to any signed-in user',
    "  IF v_actor IS NULL OR NOT COALESCE(public.has_role(v_actor, 'admin'::public.app_role), false) THEN\n    RAISE EXCEPTION 'Only administrators can change enrollment terms'",
    "  IF false THEN\n    RAISE EXCEPTION 'Only administrators can change enrollment terms'", ['inputs']],
  ['S32', 'change_enrollment_terms granted to the service role',
    "GRANT EXECUTE ON FUNCTION public.change_enrollment_terms(uuid, jsonb, date) TO authenticated;",
    "GRANT EXECUTE ON FUNCTION public.change_enrollment_terms(uuid, jsonb, date) TO authenticated, service_role;", ['inputs']],
  ['S33', 'change_enrollment_terms accepts any column (a start date as a "term")',
    "    IF k NOT IN ('rate_override_vnd', 'discount_type', 'discount_value', 'discount_cadence') THEN", "    IF false THEN", ['inputs']],
  ['S34', 'A-6 dropped from the pause plan (a person\'s Present un-billed at tier 0)',
    "      v_floor := 1;", "      v_floor := 0;", ['inputs']],
  ['S35', 'the exec does not check the enrolment is still the one previewed',
    "    IF v_cur IS DISTINCT FROM (p_plan -> 'row_before' -> 0) THEN\n      RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The enrolment changed since the preview.';",
    "    IF false THEN\n      RAISE EXCEPTION 'token_stale' USING ERRCODE = 'HC011', DETAIL = 'The enrolment changed since the preview.';", ['inputs']],
  ['S36', 'enroll_new can be applied with no child',
    "    IF ch -> 'row' ->> 'student_id' IS NULL THEN", "    IF false THEN", ['inputs']],
  ['S37', 'an open-ended reach stops at today (a bill already signed off for NEXT month is not reached)',
    "    SELECT GREATEST(v_today, p_from, COALESCE(max((to_date(i.month, 'YYYY-MM') + interval '1 month' - interval '1 day')::date), v_today))\n      INTO v_to FROM public.invoices i",
    "    SELECT GREATEST(v_today, p_from, COALESCE(max(v_today), v_today))\n      INTO v_to FROM public.invoices i", ['inputs']],
  ['S38', 'the preflight no longer checks the step 1a / 1b bodies',
    "= ANY (r.want)) THEN", "= ANY (r.want)) AND false THEN", ['inputs']],
  ['S39', 'deleting an enrolment is not guarded',
    "CREATE TRIGGER zz_enrollment_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.enrollments",
    "CREATE TRIGGER zz_enrollment_money_guard BEFORE INSERT OR UPDATE ON public.enrollments", ['inputs', 'oracle']],
  ['S40', 'referral bonuses are not guarded',
    "CREATE TRIGGER zz_discount_money_guard BEFORE INSERT OR UPDATE OR DELETE ON public.referral_bonuses\n  FOR EACH ROW EXECUTE FUNCTION public._discount_money_guard();",
    "", ['inputs', 'oracle']],
  ['S41', 'the reach skips the first month that has a bill (narrowing off by a month)',
    "  r := public.tuition_reach(v_kids, p_class, GREATEST(p_from, v_first), v_to);", "  r := public.tuition_reach(v_kids, p_class, GREATEST(p_from, v_first + 31), v_to);", ['oracle', 'inputs']],
  ['S42', 'a family change reaches only from today, not from the child\'s first enrolment',
    "  RETURN public._money_tuition_reach(v_kids, NULL, v_from, NULL);", "  RETURN public._money_tuition_reach(v_kids, NULL, GREATEST(v_from, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), NULL);", ['oracle', 'inputs']],
  ['S43', 'a new enrolment row reaches only its first day (INSERT span collapsed)',
    "                              'from', COALESCE(os, ns) - p_lead, 'to', COALESCE(oe, ne),\n                              'open', COALESCE(oe, ne) IS NULL);",
    "                              'from', COALESCE(os, ns) - p_lead, 'to', COALESCE(os, ns),\n                              'open', false);", ['oracle', 'inputs']],
  ['S44', 'the first pay rate of a person can be removed (earlier dates fall to the mirror)',
    "  IF p_op = 'remove' AND v_first = x.effective_from THEN", "  IF false THEN", ['inputs']],
  ['S45', 'the family guard accepts an acknowledgement of the other kind (a hold covers a move)',
    "              AND ((a ->> 'op' = 'set_family' AND NEW.sibling_discount_from IS NOT DISTINCT FROM OLD.sibling_discount_from)\n                OR (a ->> 'op' = 'set_sibling_from' AND NEW.family_id IS NOT DISTINCT FROM OLD.family_id));",
    "              ;", ['inputs']],
  // the four functions
  ['F01', 'update-enrollment-rate goes on to the write at tier 1+ without an ack',
    "    if (plan.tier >= 1 && !ack) {", "    if (false) {", ['fn'], RATE],
  ['F02', 'update-enrollment-rate writes the rate with the service key (the old way)',
    "    const r = await moneyConfirm(asCaller, \"enrollment\", op, args, ack ?? { token: plan.token },",
    "    await service.from(\"enrollments\").update({ rate_override_vnd: rateOverrideVnd }).eq(\"id\", enrollmentId);\n    const r = await moneyConfirm(asCaller, \"enrollment\", op, args, ack ?? { token: plan.token },", ['fn'], RATE],
  ['F03', 'update-enrollment-rate does not check the enrolment is that child\'s',
    "    if (!Array.isArray(plan.row_before) || plan.row_before[0]?.student_id !== studentId) {", "    if (false) {", ['fn'], RATE],
  ['F04', 'create-family creates the family before asking for the reason',
    "      if (!ack) {\n        return json({", "      if (false) {\n        return json({", ['fn'], FAMILY],
  ['F05', 'create-family does not compare the token',
    "      if (ack.token !== token) {", "      if (false) {", ['fn'], FAMILY],
  ['F06', 'create-family writes the family with the service key',
    "    const { data: family, error: familyError } = await asCaller\n      .from('families')", "    const { data: family, error: familyError } = await service\n      .from('families')", ['fn'], FAMILY],
  ['F07', 'create-family inserts the enrolment raw with the service key (the old way)',
    "        const r = 'error' in p ? p : await moneyConfirm(asCaller, 'enrollment', 'enroll_new', args, {",
    "        await service.from('enrollments').insert([{ student_id: newStudent.id, class_id: item.args.class_id, start_date: item.args.start_date }]);\n        const r = 'error' in p ? p : await moneyConfirm(asCaller, 'enrollment', 'enroll_new', args, {", ['fn'], FAMILY],
  ['F08', 'manage-demo-student ignores the guard\'s refusal and enables the demo',
    "        if (guardRefused(clearErr)) return await needsOwner(uid, \"clearing the demo child's other enrolments\", clearErr);\n        if (clearErr) throw new Error(`could not clear the demo child's other enrolments: ${clearErr.message}`);\n",
    "", ['fn'], DEMO],
  ['F09', 'admin-data-import imports enrolments again',
    "const IMPORTABLE = ['families', 'students', 'teachers', 'classes', 'bank_info'];", "const IMPORTABLE = ['families', 'students', 'teachers', 'classes', 'bank_info', 'enrollments'];", ['lib', 'fn'], IMPORT],
  ['F10', 'admin-data-import imports the register again',
    "const NOT_IMPORTABLE = ['enrollments', 'sessions', 'attendance', 'discount_definitions', 'discount_assignments'];",
    "const NOT_IMPORTABLE = ['enrollments', 'sessions', 'discount_definitions', 'discount_assignments'];\nIMPORTABLE.push('attendance');", ['fn'], IMPORT],
  ['F11', 'admin-data-import keeps the class fee in imported rows',
    "const STRIPPED: Record<string, string[]> = { classes: ['session_rate_vnd'] };", "const STRIPPED: Record<string, string[]> = { classes: [] };", ['fn'], IMPORT],
  ['F12', 'admin-data-import: the screen\'s dry-run box is ignored (a ticked dry run imports)',
    "    const dryRun = dryRunParam || requestBody?.dryRun === true;", "    const dryRun = dryRunParam;", ['fn'], IMPORT],
];

/** The preflight's "this file" literal for the helper body, recomputed for the mutated text. */
function patchOwnMd5(text) {
  const m = /CREATE OR REPLACE FUNCTION public\._money_enrollment_rpc_call\(\)[\s\S]*?AS \$fn\$([\s\S]*?)\$fn\$;/.exec(text);
  if (!m) return text;
  const md5 = createHash('md5').update(m[1]).digest('hex');
  return text.replace(/'[0-9a-f]{32}'\]\)   -- this file/, `'${md5}'])   -- this file`);
}

const runSuite = (suite, inputsPath) => new Promise((done) => {
  const migs = suite.noMigrations ? [] : [...BASE.map((f) => migPath(f)), inputsPath];
  const child = spawn(process.execPath, [join(repo, 'scripts', 'pgtest', suite.file), ...migs, ...(suite.args ?? [])], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('close', (code) => done({ code, out }));
});
const firstFail = (out) => (out.split('\n').find((l) => l.includes('FAIL')) ?? out.split('\n').filter(Boolean).slice(-2).join(' ')).trim().slice(0, 170);

const only = process.argv.slice(2);
const original = readFileSync(migPath(INPUTS), 'utf8').replace(/\r\n/g, '\n');
const results = [];
for (const [id, what, find, repl, suites, file] of MUTANTS) {
  if (only.length && !only.includes(id)) continue;
  let verdict;
  if (file) {
    const fp = join(repo, file);
    const before = readFileSync(fp);
    const src = before.toString('utf8').replace(/\r\n/g, '\n');
    const n = src.split(find).length - 1;
    if (n !== 1) verdict = `BAD MUTANT (pattern found ${n} times)`;
    else {
      const by = [];
      try {
        writeFileSync(fp, src.replace(find, () => repl));
        for (const s of suites) {
          const r = await runSuite(SUITES[s], migPath(INPUTS));
          if (r.code !== 0) { by.push(`${s}: ${firstFail(r.out)}`); break; }
        }
      } finally { writeFileSync(fp, before); }
      verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
    }
  } else {
    const n = original.split(find).length - 1;
    if (n !== 1) verdict = `BAD MUTANT (pattern found ${n} times)`;
    else {
      const p = resolve(tmpdir(), `d4-3b-mutant-${id}-${process.pid}.sql`);
      writeFileSync(p, patchOwnMd5(original.replace(find, () => repl)));
      const by = [];
      for (const s of suites) {
        const r = await runSuite(SUITES[s], p);
        if (r.code !== 0) { by.push(`${s}: ${firstFail(r.out)}`); break; }
      }
      verdict = by.length ? `CAUGHT by ${by[0]}` : `SURVIVED (${suites.join(', ')})`;
    }
  }
  results.push({ id, what, verdict });
  console.log(`${id} ${verdict}`);
}
console.log('\n| Mutant | Breaks | Verdict |\n|---|---|---|');
for (const r of results) console.log(`| ${r.id} | ${r.what} | ${r.verdict.replace(/\|/g, '/')} |`);
const survivors = results.filter((r) => !r.verdict.startsWith('CAUGHT'));
console.log(`\n${results.length - survivors.length} caught, ${survivors.length} survived or bad`);
process.exit(survivors.length ? 1 : 0);
