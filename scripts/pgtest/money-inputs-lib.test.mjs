// D4 step 3B: the pure helpers of src/lib/moneyInputs.ts (wording only) and
// the static checks of design f.5 for the money inputs. No database.
//   - every op the SQL plans accept has a title and a button; every refusal
//     has a sentence with the next step, never a raw code;
//   - no screen writes a guarded money input raw any more (every writer the
//     design's list (a) names is gone, and the two it missed);
//   - no edge function writes one with the service key, except the one on the
//     allow-list, with its reason;
//   - the MCP tools write none.
// (A file of its own, not a section of money-guard-lib.test.mjs: that file is
// step 1b's and step 3A adds to it too.)
import { build } from 'esbuild';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, repo, migPath } from './d4-prelude.mjs';

const { ok, counts } = harness(() => null);
async function load(entry, name) {
  const out = await build({
    entryPoints: [resolve(repo, entry)], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    alias: { '@': resolve(repo, 'src') },
    plugins: [{ name: 'no-client', setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ loader: 'js', contents: 'export const supabase = { rpc: (...a) => globalThis.__rpc(...a) };' }));
    } }],
  });
  const p = resolve(tmpdir(), `mil.${name}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  return import(pathToFileURL(p).href);
}
const lib = await load('src/lib/moneyInputs.ts', 'inputs');
const ai = await load('src/lib/aiActions.ts', 'ai');
const read = (p) => readFileSync(resolve(repo, p), 'utf8').replace(/\r\n/g, '\n');
const sql = read(migPath('20261114094000_d4_money_inputs_guard.sql').replace(repo, '.'));

// ---------------------------------------------------------------- wording
const OPS = {
  enrollment: ['enroll', 'enroll_new', 'set_start_date', 'end', 'end_all', 'set_days', 'transfer', 'pause', 'set_rate', 'set_discount', 'delete', 'set_terms_from'],
  discount_assignment: ['assign', 'set_end', 'edit', 'remove'],
  referral_bonus: ['assign', 'set_end', 'edit', 'remove'],
  pay_rate: ['set', 'remove'],
  invoice_freeze: ['unfreeze'],
  family_link: ['set_family', 'set_sibling_from', 'set_sibling_percent'],
};
ok('every entity and op of design b.4 has a dialog title and a button of its own',
   Object.entries(OPS).every(([e, ops]) => ops.every((o) => lib.INPUT_COPY[e]?.[o]?.title && lib.INPUT_COPY[e][o].submit)) &&
   JSON.stringify(Object.keys(lib.INPUT_COPY).sort()) === JSON.stringify(Object.keys(OPS).sort()));
ok('  and each of those ops is one the SQL plan accepts (named in the migration)',
   Object.values(OPS).flat().every((o) => new RegExp(`'${o}'`).test(sql)));
ok('an unknown op still gets a neutral title, never an empty dialog', lib.inputCopy('enrollment', 'nope').title === 'Check this change');
const plan = (o) => ({ tier: 2, allowed: true, token: 't', requires: { reason: true, confirm: true }, ...o });
const line = (o) => lib.inputChangeLines(plan(o)).join(' ');
ok('change lines say what changes in the plan\'s own values: a start date',
   /2025-01-01 -> 2026-10-28/.test(line({ entity: 'enrollment', op: 'set_start_date', change: { start_date: '2026-10-28', old_start_date: '2025-01-01' } })));
ok('  a whole-enrolment rate ("for every month of this enrolment")',
   /none -> 120,000 VND, for every month/.test(line({ entity: 'enrollment', op: 'set_rate', change: { terms: { rate_override_vnd: 120000 }, old: { rate_override_vnd: null } } })));
ok('  a rate from a date ("before that date nothing changes")',
   /From 2026-11-01\. Before that date nothing changes/.test(line({ entity: 'enrollment', op: 'set_terms_from',
     change: { terms: { rate_override_vnd: 1 }, old: {}, effective_date: '2026-11-01', split: true } })));
ok('  a per-lesson discount is called per lesson, not "once"',
   /10% \(per lesson\)/.test(line({ entity: 'enrollment', op: 'set_discount',
     change: { terms: { discount_type: 'percent', discount_value: 10, discount_cadence: 'once' }, old: { discount_type: null } } })));
ok('  a pause counts the lessons that become Excused', /3 lesson\(s\) become Excused/.test(line({ entity: 'enrollment', op: 'pause', change: { from: 'a', to: 'b', lessons: 3 } })));
ok('  a pay rate says the amount and the date', /250,000 VND per hour, from 2026-09-01/.test(line({ entity: 'pay_rate', op: 'set',
     change: { row: { pay_rate_type: 'hourly', hourly_rate_vnd: 250000, effective_from: '2026-09-01' } } })));
ok('  the sibling percentage, old and new', /the default -> 20%/.test(line({ entity: 'family_link', op: 'set_sibling_percent', change: { percent: 20, old_percent: null } })));
ok('  Create Family (several enrolments): no made-up line; the screen lists them', lib.inputChangeLines(plan({ entity: 'enrollment', op: 'enroll_new' })).length === 0);
ok('a pay-rate plan shows what it reaches (lessons taught, closed months)',
   lib.payReachLines(plan({ reach: { payroll: { held_lessons: 4, locked_months: ['2026-09'] } } })).join(' ').includes('4 lesson(s) already taught') &&
   lib.payReachLines(plan({ reach: { payroll: { held_lessons: 4, locked_months: ['2026-09'] } } })).join(' ').includes('2026-09'));
ok('the intro names payroll for a pay rate and the frozen figures for an unfreeze',
   /payroll/.test(lib.inputIntro(plan({ entity: 'pay_rate' }))) && /frozen bill/.test(lib.inputIntro(plan({ entity: 'invoice_freeze' })))
   && /already billed/.test(lib.inputIntro(plan({ entity: 'enrollment' }))));
ok('needsInputDialog: tier 0 with nothing required -> no dialog; tier 1 -> yes; an unreadable plan -> yes (fail closed)',
   lib.needsInputDialog({ tier: 0, requires: { reason: false, confirm: false } }) === false && lib.needsInputDialog({ tier: 1 }) === true
   && lib.needsInputDialog(null) === true && lib.needsInputDialog({ requires: {} }) === true);
ok('  approval required -> the dialog, never a silent confirm', lib.needsInputDialog({ tier: 0, approval: { required: true } }) === true);

// ---------------------------------------------------------------- refusals
const CODES = ['enrollment_identity', 'discount_identity', 'definition_in_use', 'student_has_history', 'class_has_history'];
ok('every HC121 code the migration raises has its own sentence with the next step',
   CODES.every((c) => new RegExp(`code=${c};`).test(sql) && lib.INPUT_ERROR_TEXT[c] && !/^[a-z_]+$/.test(lib.INPUT_ERROR_TEXT[c])) &&
   /End it and start a new one/.test(lib.INPUT_ERROR_TEXT.enrollment_identity) && /assign it to the other child/.test(lib.INPUT_ERROR_TEXT.discount_identity) &&
   /Create a new discount/.test(lib.INPUT_ERROR_TEXT.definition_in_use) && /Deactivate instead/.test(lib.INPUT_ERROR_TEXT.student_has_history) &&
   /Archive it instead/.test(lib.INPUT_ERROR_TEXT.class_has_history));
const REFUSE = ['no_enrollment', 'nothing_to_change', 'not_frozen', 'first_rate', 'student_required', 'bad_args'];
ok('every refuse code the plans return has a sentence', REFUSE.every((c) => new RegExp(`'${c}'`).test(sql) && lib.INPUT_ERROR_TEXT[c]));
ok('a raw HC120 from the database is worded with the next step, never as money_change_requires_checked_path',
   /with a reason/.test(lib.inputDbErrorText({ code: 'HC120', message: 'money_change_requires_checked_path', details: 'entity=enrollment; tier=2; x' }, 'f')) &&
   !/money_change/.test(lib.inputDbErrorText({ code: 'HC120', message: 'money_change_requires_checked_path' }, 'f')));
ok('a raw HC121 reads its code from the DETAIL',
   lib.inputDbErrorText({ code: 'HC121', message: 'money_change_refused', details: 'code=class_has_history; This class has enrolments.' }, 'f') === lib.INPUT_ERROR_TEXT.class_has_history);
ok('refusalDetail: entity, tier and code', JSON.stringify(lib.refusalDetail({ details: 'entity=pay_rate; tier=3; x' })) === JSON.stringify({ entity: 'pay_rate', tier: 3, code: null }));
ok('an HC015 refuse code is worded; an unknown database error keeps its own message; a bare code falls back',
   lib.inputDbErrorText({ code: 'HC015', message: 'first_rate' }, 'f') === lib.INPUT_ERROR_TEXT.first_rate &&
   lib.inputDbErrorText({ code: '23505', message: 'duplicate key value' }, 'f') === 'duplicate key value' && lib.inputDbErrorText({ code: 'P0001', message: 'some_code' }, 'fallback') === 'fallback');
ok('a register refusal reached through an enrolment RPC keeps step 1b\'s wording',
   /more than a week old/.test(lib.inputDbErrorText({ code: 'HC025', details: 'kind=retro_mark; tier=2' }, 'f')));
ok('which 409 body opens the dialog: preview_required and money_requires_checked_path with a preview; nothing else',
   lib.needsInputDialogBody({ code: 'preview_required', preview: { allowed: true } }) && lib.needsInputDialogBody({ code: 'money_requires_checked_path', preview: {} }) &&
   !lib.needsInputDialogBody({ code: 'token_stale', preview: {} }) && !lib.needsInputDialogBody({ code: 'preview_required' }) && !lib.needsInputDialogBody(null));
ok('a function\'s refusal body is worded: its code, else its own sentence, else the fallback',
   lib.functionErrorText({ code: 'demo_reset_needs_owner', error: 'x' }, 'f') === lib.INPUT_ERROR_TEXT.demo_reset_needs_owner &&
   lib.functionErrorText({ error: 'Admins only' }, 'f') === 'Admins only' && lib.functionErrorText(null, 'f') === 'f');
ok('the assistant\'s card words HC120 as b.5 says ("from the enrolment screen, with a reason"), and HC121 / HC025; other errors keep their message',
   /Do it from the enrolment screen, with a reason/.test(ai.aiActionErrorText({ code: 'HC120', message: 'money_change_requires_checked_path' })) &&
   /Nothing was changed/.test(ai.aiActionErrorText({ code: 'HC121', message: 'money_change_refused' })) &&
   /register marks/.test(ai.aiActionErrorText({ code: 'HC025', message: 'x' })) && ai.aiActionErrorText({ code: 'P0001', message: 'plain' }) === 'plain');
{
  const seen = [];
  globalThis.__rpc = async (name) => { seen.push(name); return { data: null, error: { code: 'HC120', message: 'money_change_requires_checked_path' } }; };
  let msg = null;
  try { await ai.applyProposal({ proposal_id: 'p', instruction: 'i', plan: {}, summary: [], warnings: [] }); } catch (e) { msg = e.message; }
  let msg2 = null;
  try { await ai.undoAiAction('a'); } catch (e) { msg2 = e.message; }
  ok('applyProposal and undoAiAction throw that sentence (and still call only ai_action_apply / ai_action_undo)',
     /enrolment screen/.test(msg ?? '') && /enrolment screen/.test(msg2 ?? '') && JSON.stringify(seen) === JSON.stringify(['ai_action_apply', 'ai_action_undo']), { msg, msg2, seen });
}

// ---------------------------------------------------------------- static: src
const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
};
const srcFiles = walk(resolve(repo, 'src')).filter((p) => !/integrations[\\/]supabase[\\/]types\.ts$/.test(p));
const rel = (p) => relative(repo, p).replace(/\\/g, '/');
const WRITE = String.raw`\.(insert|update|delete|upsert)\(`;
const rawWriters = (tables) => srcFiles.filter((p) => {
  const s = readFileSync(p, 'utf8');
  return new RegExp(String.raw`\.from\(\s*["'](${tables})["']( as any)?\s*\)[\s\S]{0,160}?${WRITE}`).test(s);
}).map(rel);
ok('no screen writes enrolments, discount assignments, referral bonuses or pay rates raw (design (a) P13-P16, P18: every writer gone)',
   rawWriters('enrollments|discount_assignments|referral_bonuses|staff_pay_rates').length === 0,
   rawWriters('enrollments|discount_assignments|referral_bonuses|staff_pay_rates'));
const grepSrc = (re) => srcFiles.filter((p) => re.test(readFileSync(p, 'utf8'))).map(rel);
ok('no screen writes families.sibling_percent_override, students.family_id in an UPDATE, or unfreezes a bill raw (P19, P20)',
   grepSrc(/\.update\(\s*\{[^}]*sibling_percent_override/).length === 0 && grepSrc(/\.update\(\s*\{[^}]*\bfamily_id\b/).length === 0 &&
   grepSrc(/tuition_frozen:\s*false/).length === 0 && grepSrc(/sibling_discount_from:\s*[^,}]*\}\s*\)\s*\.eq/).length === 0,
   [grepSrc(/\.update\(\s*\{[^}]*sibling_percent_override/), grepSrc(/\.update\(\s*\{[^}]*\bfamily_id\b/), grepSrc(/tuition_frozen:\s*false/)]);
ok('the one upsert on a pay-rate conflict target is gone (owner question 5)', grepSrc(/onConflict:\s*`\$\{subject\},effective_from`/).length === 0);
const SCREENS = ['components/admin/BulkEnrollmentDateSetter.tsx', 'components/admin/class/ClassEnrollments.tsx', 'components/admin/ModifyEnrollmentModal.tsx',
  'components/admin/discount/EditEnrollmentDiscountModal.tsx', 'components/admin/EnrollmentRateEditor.tsx', 'components/admin/EnrollStudentDialog.tsx',
  'components/admin/StudentForm.tsx', 'components/admin/EnrollmentRequestsManager.tsx', 'components/admin/StudentsList.tsx',
  'components/admin/discount/AssignDiscountModal.tsx', 'components/admin/discount/StudentDiscountsTab.tsx', 'components/admin/discount/EditDiscountModal.tsx',
  'components/admin/DiscountManager.tsx', 'components/admin/staff/PayRateHistory.tsx', 'components/student/BillFreezePanel.tsx',
  'components/admin/SiblingDiscountCompute.tsx', 'pages/FamilyDetail.tsx', 'components/admin/FamilyMembersManager.tsx',
  'components/admin/EnrollmentManager.tsx', 'components/admin/StudentEditDrawer.tsx'];
const notMoved = SCREENS.filter((f) => !/useMoneyInput\(/.test(read(`src/${f}`)) || !/<MoneyInputDialog\b/.test(read(`src/${f}`)));
ok(`the ${SCREENS.length} screens that change a money input all go through useMoneyInput (useMoneyChange under it) and mount the reason dialog`, notMoved.length === 0, notMoved);
ok('useMoneyInput is built on useMoneyChange and the two checked RPC wrappers; it holds no write of its own',
   /useMoneyChange\(/.test(read('src/components/admin/money-guard/useMoneyInput.ts')) &&
   !new RegExp(String.raw`\.from\(`).test(read('src/components/admin/money-guard/useMoneyInput.ts')) &&
   (read('src/components/admin/money-guard/useMoneyInput.ts').match(/\.rpc\("([a-z_]+)"/g) ?? []).join() === '.rpc("money_changes_checked_bulk"');
ok('Create Family shows the function\'s preview in the same dialog and resends with the ack; it makes no enrolment write itself',
   /MoneyInputDialogView/.test(read('src/components/admin/FamilyForm.tsx')) && /needsInputDialogBody\(body\)/.test(read('src/components/admin/FamilyForm.tsx')) &&
   !/from\("enrollments"\)/.test(read('src/components/admin/FamilyForm.tsx')));
ok('the rate / discount screens offer "from a date" by default and the whole-enrolment correction second (A-14)',
   ['components/admin/ModifyEnrollmentModal.tsx', 'components/admin/discount/EditEnrollmentDiscountModal.tsx', 'components/admin/EnrollmentRateEditor.tsx']
     .every((f) => /set_terms_from/.test(read(`src/${f}`)) && /INPUT_TEXT\.wholeEnrollment/.test(read(`src/${f}`))) &&
   /useState\(false\)/.test(read('src/components/admin/EnrollmentRateEditor.tsx').match(/const \[whole, setWhole\][^\n]*/)?.[0] ?? ''));
ok('EnrollmentRateEditor no longer writes weekdays in place (it sends a dated set_days)',
   !/allowed_days: allowedDays \|\| null \}\)/.test(read('src/components/admin/EnrollmentRateEditor.tsx')) && /op: "set_days"/.test(read('src/components/admin/EnrollmentRateEditor.tsx')));
ok('the import screen sends its dry-run box with the request and says what is not imported',
   /body: \{ \.\.\.data, dryRun \}/.test(read('src/components/admin/tabs/DataTab.tsx')) && /are not: they decide bills and pay/.test(read('src/components/admin/tabs/DataTab.tsx')));

// ---------------------------------------------------------------- static: functions, MCP
const fnFiles = walk(resolve(repo, 'supabase', 'functions'));
const GUARDED = 'enrollments|discount_assignments|discount_definitions|referral_bonuses|staff_pay_rates';
const fnWriters = fnFiles.filter((p) => new RegExp(String.raw`\.from\(\s*["'](${GUARDED})["']\s*\)[\s\S]{0,200}?${WRITE}`).test(readFileSync(p, 'utf8'))).map(rel);
// The allow-list, with the reason each is there.
const ALLOW = {
  'supabase/functions/manage-demo-student/index.ts':
    'service lane on purpose: it resets the public demo sandbox. NOT exempt - the enrolment guard judges its writes and it reports demo_reset_needs_owner when refused.',
};
ok('service-key writers of the guarded money tables: exactly the allow-list (create-family and update-enrollment-rate are no longer on it)',
   JSON.stringify(fnWriters.sort()) === JSON.stringify(Object.keys(ALLOW).sort()), fnWriters);
ok('  update-enrollment-rate and create-family reach the guarded tables only through money_change_checked on the caller\'s client',
   ['update-enrollment-rate', 'create-family'].every((f) => {
     const s = read(`supabase/functions/${f}/index.ts`);
     return /callerClient\(/.test(s) && /moneyConfirm\(asCaller/.test(s) && /allowServiceRole: false/.test(s) && !/service\s*\.from\(\s*['"](enrollments|families|students)/.test(s);
   }));
const imp = read('supabase/functions/admin-data-import/index.ts');
const importable = /const IMPORTABLE = \[([^\]]*)\]/.exec(imp)?.[1] ?? '';
ok('admin-data-import: none of the five money tables is importable, and the fee is stripped from class rows',
   ['enrollments', 'sessions', 'attendance', 'discount_definitions', 'discount_assignments'].every((t) => !importable.includes(`'${t}'`)) &&
   importable.includes("'families'") && /classes: \['session_rate_vnd'\]/.test(imp), importable);
const mcp = walk(resolve(repo, 'src', 'lib', 'mcp'));
ok(`the MCP tools (${mcp.length} files) write nothing: no insert / update / delete / upsert / rpc`,
   mcp.length > 0 && mcp.every((p) => !new RegExp(String.raw`${WRITE}|\.rpc\(`).test(readFileSync(p, 'utf8'))), mcp.map(rel));
ok('the chat function was given no write path by this step (it names none of the checked RPCs)',
   walk(resolve(repo, 'supabase', 'functions', 'chat')).every((p) => !/money_change_checked|money_changes_checked_bulk|change_enrollment_terms/.test(readFileSync(p, 'utf8'))));

const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
