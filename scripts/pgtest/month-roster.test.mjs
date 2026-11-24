// src/lib/finance/monthRoster.ts: who belongs to a month (owner, 24 Nov 2026).
// A child is in a month when an enrolment of theirs covers a day of it; a
// child who left stays in their last month and is dropped from the next.
// The "active" switch and the Deactivate date decide nothing.
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const dir = mkdtempSync(join(tmpdir(), 'month-roster-'));
const file = join(dir, 'lib.mjs');
writeFileSync(file, (await build({ entryPoints: [join(repo, 'src', 'lib', 'finance', 'monthRoster.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
const { monthBounds, enrollmentCoversMonth, studentsEnrolledIn, lastEnrollmentDay, billShownInMonth } = await import(pathToFileURL(file).href);

const e = (student_id, start_date, end_date = null) => ({ student_id, start_date, end_date });
const inMonth = (rows, month) => [...studentsEnrolledIn(rows, month)].sort();

ok('month bounds: February in a leap year and December', JSON.stringify([monthBounds('2028-02'), monthBounds('2026-12')])
  === JSON.stringify([{ monthStart: '2028-02-01', monthEnd: '2028-02-29' }, { monthStart: '2026-12-01', monthEnd: '2026-12-31' }]));

// The owner's example: a child who goes inactive in January stays in January
// and is dropped from February.
const left = [e('A', '2026-09-01', '2027-01-20')];
ok('left in January: in January', inMonth(left, '2027-01').join() === 'A');
ok('left in January: in every month they were enrolled', ['2026-09', '2026-10', '2026-11', '2026-12'].every((m) => inMonth(left, m).join() === 'A'));
ok('left in January: dropped from February and after', inMonth(left, '2027-02').length === 0 && inMonth(left, '2027-06').length === 0);
ok('not in a month before they started', inMonth(left, '2026-08').length === 0);

ok('last day of enrolment is the last day of a month: in that month, not the next',
  inMonth([e('A', '2026-01-05', '2026-10-31')], '2026-10').length === 1 && inMonth([e('A', '2026-01-05', '2026-10-31')], '2026-11').length === 0);
ok('last day is the 1st: that month still counts', inMonth([e('A', '2026-01-05', '2026-11-01')], '2026-11').length === 1);
ok('starts on the last day of a month: in that month', inMonth([e('A', '2026-11-30')], '2026-11').length === 1);
ok('starts on the 1st of next month: not in this one', inMonth([e('A', '2026-12-01')], '2026-11').length === 0);
ok('still enrolled (no end date): in every month from the start on', inMonth([e('A', '2026-03-10')], '2026-03').length === 1 && inMonth([e('A', '2026-03-10')], '2030-01').length === 1);

// Left, then came back: listed in the months of each enrolment, not between.
const back = [e('A', '2026-01-05', '2026-03-20'), e('A', '2026-11-10')];
ok('came back: in March, out April to October, in again from November',
  inMonth(back, '2026-03').length === 1 && ['2026-04', '2026-07', '2026-10'].every((m) => inMonth(back, m).length === 0) && inMonth(back, '2026-11').length === 1);

// The live case that showed the bug: last enrolment ended 12 Oct, Deactivate clicked 11 Nov.
const rows = [e('anna', '2025-10-01', '2026-10-12'), e('still', '2025-10-04'), e('new', '2026-11-14'), e('old', '2025-10-01', '2026-02-01')];
ok('deactivated in November but last enrolled in October: October yes, November no',
  inMonth(rows, '2026-10').join() === 'anna,still' && inMonth(rows, '2026-11').join() === 'new,still');
ok('a child with two classes is listed once', inMonth([e('A', '2026-01-01'), e('A', '2026-02-01')], '2026-11').length === 1);
ok('timestamps are read by their day', enrollmentCoversMonth({ start_date: '2026-11-30T00:00:00+00:00', end_date: '2026-11-30T00:00:00+00:00' }, '2026-11'));

ok('last enrolment day: the latest end date', lastEnrollmentDay([{ end_date: '2026-02-01' }, { end_date: '2026-10-12' }]) === '2026-10-12');
ok('last enrolment day: null while one is still open, undefined when never enrolled',
  lastEnrollmentDay([{ end_date: '2026-02-01' }, { end_date: null }]) === null && lastEnrollmentDay([]) === undefined);

// Saved bills in a month's lists.
const enrolled = new Set(['still']);
ok('a bill of a child in the month is shown, empty or not', billShownInMonth({ student_id: 'still', recorded_payment: 0, total_amount: 0, base_amount: 0 }, enrolled));
ok('an empty bill of a child who was not enrolled that month is left out',
  !billShownInMonth({ student_id: 'anna', recorded_payment: 0, total_amount: 0, base_amount: 0 }, enrolled) && !billShownInMonth({ student_id: 'anna', recorded_payment: null }, enrolled));
ok('a bill with a payment is never hidden', billShownInMonth({ student_id: 'anna', recorded_payment: 440000, total_amount: 0, base_amount: 0 }, enrolled));
ok('a bill with a charge is never hidden', billShownInMonth({ student_id: 'anna', recorded_payment: 0, total_amount: 210000, base_amount: 210000 }, enrolled)
  && billShownInMonth({ student_id: 'anna', recorded_payment: 0, total_amount: 0, base_amount: 210000 }, enrolled));
ok('a reversed payment (negative) is money too', billShownInMonth({ student_id: 'anna', recorded_payment: -100000, total_amount: 0 }, enrolled));

// The screens use the rule and nothing else.
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const lib = code(read('src', 'lib', 'finance', 'monthRoster.ts'));
ok('the rule imports nothing', !/^\s*import\s/m.test(lib));
const helper = code(read('src', 'lib', 'finance', 'studentsInMonth.ts'));
ok('the roster helper picks children by enrolment, never by the active switch or the Deactivate date',
  /studentsEnrolledIn\(/.test(helper) && !/is_active\.eq|deactivated_at\.(gte|gt|lte|lt)|\.eq\("is_active"/.test(helper) && !/studentsInMonthOrClause/.test(helper));
const srcFiles = ['src/components/admin/StudentTuitionOverview.tsx', 'src/components/admin/AdminTuitionList.tsx', 'src/hooks/useLiveTuitionData.ts', 'src/hooks/useFinanceOverview.ts', 'src/components/admin/CloseMonthDialog.tsx'];
for (const f of srcFiles) {
  const s = code(read(...f.split('/')));
  ok(`${f.split('/').pop()}: the month's children come from the roster helper`,
    /fetchEnrolledStudentIds|fetchStudentsInMonth|fetchBilledStudentIds/.test(s) && !/studentsInMonthOrClause|deactivated_at\.gte/.test(s));
}
ok('RecordedPaymentManager leaves out empty bills of children not in the month', /billShownInMonth\(/.test(code(read('src', 'components', 'admin', 'RecordedPaymentManager.tsx'))));

// The Deno side (supabase/functions/_lib/month-enrolment.ts): the same answer
// as the browser rule on every case, and when calculate-tuition makes no bill.
{
  const f2 = join(dir, 'deno.mjs');
  writeFileSync(f2, (await build({ entryPoints: [join(repo, 'supabase', 'functions', '_lib', 'month-enrolment.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const { enrolledInMonth, withoutBill, noBillAnswer } = await import(pathToFileURL(f2).href);
  const days = ['2025-12-31', '2026-01-01', '2026-01-15', '2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01', '2026-11-30', '2026-12-01', '2026-12-31', '2027-01-01'];
  const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-11', '2026-12', '2027-01'];
  let cases = 0; const differ = [];
  for (const start of days) for (const end of [null, ...days]) for (const m of months) {
    if (end !== null && end < start) continue;
    cases++;
    const row = { student_id: 'A', start_date: start, end_date: end };
    if (enrolledInMonth([row], m) !== enrollmentCoversMonth(row, m)) differ.push([start, end, m]);
  }
  ok(`calculate-tuition's test of "in the month" agrees with the lists' on ${cases} cases`, cases > 300 && differ.length === 0, differ.slice(0, 5));
  ok('no enrolments, or none given: not in the month', !enrolledInMonth([], '2026-11') && !enrolledInMonth(null, '2026-11'));
  ok('one of several enrolments covering the month is enough', enrolledInMonth([e('A', '2025-01-01', '2025-06-30'), e('A', '2026-11-20')], '2026-11'));
  const base = { hasSavedBill: false, enrolled: false, base: 0, total: 0, asked: false };
  ok('no bill is made: none saved, not enrolled, nothing charged, nobody asked', withoutBill(base) === true);
  ok('a saved bill is always refreshed', withoutBill({ ...base, hasSavedBill: true }) === false);
  ok('an enrolled child always gets a bill, even at nothing charged', withoutBill({ ...base, enrolled: true }) === false);
  ok('a charge always gets its bill', withoutBill({ ...base, base: 210000, total: 210000 }) === false && withoutBill({ ...base, base: 210000 }) === false);
  ok('a payment path that asks gets one', withoutBill({ ...base, asked: true }) === false);
  ok('the answer says why', noBillAnswer('2026-11').reason === 'not_enrolled' && /2026-11/.test(noBillAnswer('2026-11').message));
  const calc = code(read('supabase', 'functions', 'calculate-tuition', 'index.ts'));
  ok('calculate-tuition uses that rule before it saves', /withoutBill\(/.test(calc) && /!siblingPreview && !siblingUnresolved && !noBill/.test(calc));
  ok('only the service role or an admin may ask for a bill', /createBill === true && \(gate\.isServiceRole \|\| gate\.roles\.has\("admin"\)\)/.test(calc));
}

// A class archived since still ran in its months: the Finance tab's roster
// does not look at the class's "active" switch either.
ok('the month\'s enrolments are read for every class, archived since or not', !/classes\.is_active"?\s*,\s*true/.test(helper));
{
  const g = code(read('src', 'components', 'admin', 'GenerateTuition.tsx'));
  ok('Generate Tuition picks children by enrolment, not by the active switch', !/is_active|deactivated_at/.test(g) && /\.lte\("start_date"/.test(g));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
