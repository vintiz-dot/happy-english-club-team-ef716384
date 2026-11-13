// D4 step 1b, money-guard-lib (first part): the pure helpers of
// src/lib/moneyGuard.ts (the dialog's wording and what it asks for) and of
// supabase/functions/_lib/money-guard.ts (the teacher rule's clock, the
// refresh resume), bundled with esbuild and run in node. No database.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, repo } from './d4-prelude.mjs';

const { ok, counts } = harness(() => null);
async function load(entry, name) {
  const out = await build({
    entryPoints: [resolve(repo, entry)], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    alias: { '@': resolve(repo, 'src') },
  });
  const p = resolve(tmpdir(), `mgl.${name}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  return import(pathToFileURL(p).href);
}
const lib = await load('src/lib/moneyGuard.ts', 'src');
const edge = await load('supabase/functions/_lib/money-guard.ts', 'edge');

const plan = (o = {}) => ({ entity: 'attendance', op: 'set_marks', tier: 2, allowed: true, token: 't',
  requires: { reason_min: 15, reason: true, confirm: true, correction_reason: false }, ...o });
const good = { reason: 'This child was ill all week long', confirm: true, correctionReason: '' };

// requirements and the button
ok('requirements: read from the server preview', JSON.stringify(lib.moneyRequirements(plan())) ===
   JSON.stringify({ reasonMin: 15, reason: true, confirm: true, correctionReason: false }));
ok('requirements: a T1+ plan without "reason" still asks for one (fail closed)', lib.moneyRequirements(plan({ tier: 1, requires: {} })).reason === true);
ok('requirements: T0 asks for nothing', JSON.stringify(lib.moneyRequirements(plan({ tier: 0, requires: { reason: false, confirm: false } }))) ===
   JSON.stringify({ reasonMin: 15, reason: false, confirm: false, correctionReason: false }));
ok('canSubmit: a complete form', lib.canSubmitMoney(plan(), good) === true);
ok('canSubmit: no tick -> no', lib.canSubmitMoney(plan(), { ...good, confirm: false }) === false);
ok('canSubmit: a short reason -> no', lib.canSubmitMoney(plan(), { ...good, reason: 'ill' }) === false);
ok('canSubmit: a canned reason -> no', lib.canSubmitMoney(plan(), { ...good, reason: 'No reason provided' }) === false);
ok('canSubmit: T3 needs the correction reason', lib.canSubmitMoney(plan({ tier: 3, requires: { reason: true, confirm: true, correction_reason: true } }), good) === false &&
   lib.canSubmitMoney(plan({ tier: 3, requires: { reason: true, confirm: true, correction_reason: true } }), { ...good, correctionReason: 'The bill was confirmed by mistake' }) === true);
ok('canSubmit: a refused plan, a plan without a token, a plan needing approval -> no',
   !lib.canSubmitMoney(plan({ allowed: false }), good) && !lib.canSubmitMoney(plan({ token: undefined }), good) &&
   !lib.canSubmitMoney(plan({ approval: { required: true } }), good));
ok('canSubmit: no plan -> no', lib.canSubmitMoney(null, good) === false);
const ack = lib.moneyAck(plan(), { reason: '  This child   was ill all week  ', confirm: true, correctionReason: 'x' });
ok('moneyAck: whitespace collapsed, token passed, a correction reason only when asked',
   ack.reason === 'This child was ill all week' && ack.token === 't' && ack.confirm === true && ack.correction_reason === null, ack);
ok('moneyAck: blank reason -> null (T0)', lib.moneyAck(plan({ requires: {} , tier: 0 }), { reason: ' ', confirm: false, correctionReason: '' }).reason === null);

// display
const p = plan({ reach: { pairs: [{ student_id: 'a', month: '2026-09', state: 'paid', tier: 2 }, { student_id: 'b', month: '2026-09', state: 'none', tier: 1 }] },
  invoices_before: [{ student_id: 'a', month: '2026-09', total_amount: 540000, recorded_payment: 540000 }],
  change: { items: [{ student_id: 'a', old_status: 'Present', new_status: 'Excused' }, { student_id: 'b', old_status: null, new_status: 'Present' }] } });
const rows = lib.reachRows(p);
ok('reachRows: one row per child and month, the stored bill, the state in words, no bill = null (never 0)',
   rows.length === 2 && rows[0].stateText === 'paid or part-paid' && rows[0].total === 540000 && rows[1].total === null &&
   rows[1].stateText === 'no bill yet', rows);
ok('markLines: "Present -> Excused", a missing mark said in words', JSON.stringify(lib.markLines(p).map((x) => x.text)) ===
   JSON.stringify(['Present -> Excused', 'no mark -> Present']));
ok('markLines: repair lists the lessons', lib.markLines({ op: 'repair', change: { student_id: 's', lessons: [{ date: '2026-09-01', status: 'Present' }] } })[0].text === '2026-09-01: Present');

// the 409 the screens hand to the dialog
ok('needsMoneyDialog: an admin\'s 409 with a preview -> the dialog', lib.needsMoneyDialog({ code: 'attendance_requires_checked_path', kind: 'retro_mark', preview: { allowed: true } }));
ok('needsMoneyDialog: a teacher\'s refusal or a cover refusal -> not the dialog (they ask an admin)',
   !lib.needsMoneyDialog({ code: 'attendance_requires_checked_path', kind: 'retro_mark_staff', preview: null }) &&
   !lib.needsMoneyDialog({ code: 'attendance_requires_checked_path', kind: 'cover_staff', preview: { allowed: true } }));
ok('needsMoneyDialog: any other error -> no', !lib.needsMoneyDialog({ code: 'token_stale', preview: {} }) && !lib.needsMoneyDialog(null));
for (const [code, kind, re] of [['attendance_requires_checked_path', 'retro_mark_staff', /ask an administrator/], ['x', 'cover_staff', /ask an administrator/],
  ['attendance_identity', null, /Change the mark instead/], ['not_installed', null, /Nothing was changed/], ['lesson_canceled', null, /Restore the lesson/],
  ['guard_broken', null, /Tell the owner/]]) {
  ok(`moneyErrorText ${kind ?? code}: says what to do next`, re.test(lib.moneyErrorText(code, kind)));
}
ok('moneyErrorText: an unknown code never claims success', /Nothing was assumed done/.test(lib.moneyErrorText('weird', null, 'Server said no.')));

// the function side: the teacher rule's clock (Hanoi), the past month, the refresh resume
const at = (iso) => new Date(iso);
ok('lessonEnded...: ended 8 days ago -> true', edge.lessonEndedMoreThanAWeekAgo('2026-11-05', '17:30:00', '19:00:00', at('2026-11-13T12:30:00Z')) === true);
ok('lessonEnded...: ended 6 days ago -> false', edge.lessonEndedMoreThanAWeekAgo('2026-11-07', '17:30', '19:00', at('2026-11-13T12:30:00Z')) === false);
ok('lessonEnded...: the 7-day line is Hanoi time (19:00 +07 = 12:00Z): just inside / just outside',
   edge.lessonEndedMoreThanAWeekAgo('2026-11-06', '17:30', '19:00', at('2026-11-13T11:59:00Z')) === false &&
   edge.lessonEndedMoreThanAWeekAgo('2026-11-06', '17:30', '19:00', at('2026-11-13T12:01:00Z')) === true);
ok('lessonEnded...: an overnight lesson ends the next day', edge.lessonEndedMoreThanAWeekAgo('2026-11-05', '22:00', '01:00', at('2026-11-12T17:30:00Z')) === false);
ok('lessonEnded...: an unreadable time counts as old (closed)', edge.lessonEndedMoreThanAWeekAgo('2026-11-12', 'x', 'y', at('2026-11-13T00:00:00Z')) === true);
ok('monthIsPast: the first week of a month keeps the month before current',
   edge.monthIsPast('2026-10', at('2026-11-05T00:00:00Z')) === false && edge.monthIsPast('2026-10', at('2026-11-09T00:00:00Z')) === true &&
   edge.monthIsPast('2026-11', at('2026-11-30T00:00:00Z')) === false);
const done = edge.pairsDone([{ payload: { attached: { results: [{ student_id: 'a', month: 'm', ok: true }, { student_id: 'b', month: 'm', ok: false }] } } }]);
ok('pairsDone: only pairs that refreshed ok count as done', done.has('a:m') && !done.has('b:m') && done.size === 1);
ok('readAck: strings and a true boolean only', JSON.stringify(edge.readAck({ reason: 'r', token: 7, confirm: 'yes' })) ===
   JSON.stringify({ reason: 'r', token: null, confirm: false, correction_reason: null }) && edge.readAck(null) === null);

const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
