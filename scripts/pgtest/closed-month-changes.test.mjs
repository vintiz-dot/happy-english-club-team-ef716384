// src/lib/closedMonthChanges.ts: the rows of Finance > Tuition's "Closed months
// that price differently now". It arranges what calculate-tuition-bulk answers
// (the hold itself is held by register-holes.test.mjs); no pricing in it.
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`);
  value ? pass++ : fail++;
};
const dir = mkdtempSync(join(tmpdir(), 'closed-month-changes-'));
const file = join(dir, 'lib.mjs');
writeFileSync(file, (await build({ entryPoints: [join(repo, 'src', 'lib', 'closedMonthChanges.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
const m = await import(pathToFileURL(file).href);

ok('months before: from the first bill to last month, oldest first, across a year end',
  m.monthsBefore('2025-11', '2026-02').join() === '2025-11,2025-12,2026-01');
ok('months before: nothing when the first month is the current one or later, or malformed',
  m.monthsBefore('2026-02', '2026-02').length === 0 && m.monthsBefore('2026-03', '2026-02').length === 0 && m.monthsBefore('x', '2026-02').length === 0);

const names = new Map([['a', 'An'], ['b', 'Binh']]);
const held = (saved, next) => ({ reason: 'past_month_changed', priced_as_charged: false, message: 'Held: ...',
  lessons: [], saved_base: saved[0], saved_discount: saved[1], saved_total: saved[2], register_base: next[0], register_discount: next[1], register_total: next[2] });
const results = [
  { studentId: 'a', baseAmount: 630000, totalDiscount: 0, totalAmount: 630000, payments: { monthPayments: 630000 }, held: held([630000, 0, 630000], [420000, 0, 420000]) },
  { studentId: 'b', baseAmount: 420000, totalDiscount: 0, totalAmount: 420000, payments: { monthPayments: 0 } },                       // not held
  { studentId: 'c', baseAmount: 100, totalDiscount: 0, totalAmount: 100, held: held([100, 0, 100], [300, 0, 300]) },                    // no name known
  { studentId: 'd', baseAmount: 420000, totalDiscount: 120000, totalAmount: 300000, keptAsCharged: true },                            // kept silently
  { studentId: 'e', error: true },
  { studentId: 'f', baseAmount: 1, totalAmount: 1, held: { reason: 'register_missing_marks', priced_as_charged: true, lessons: [] } }, // the old function's "saved, with a note"
];
const rows = m.heldRows(results, '2026-08', names);
ok('only the held bills become rows: not a plain, a kept, an errored or a priced-as-charged answer', rows.map((r) => r.studentId).join() === 'a,c', rows);
ok('a row carries the function\'s figures untouched, the payment and the difference',
  rows[0].savedTotal === 630000 && rows[0].newTotal === 420000 && rows[0].difference === -210000 && rows[0].paid === 630000 && rows[0].name === 'An' && rows[0].month === '2026-08', rows[0]);
ok('an unknown child is named as such, and a bill that would go up has a positive difference', rows[1].name === 'Unknown student' && rows[1].difference === 200, rows[1]);
ok('no answer at all gives no rows', m.heldRows(null, '2026-08', names).length === 0);

const sorted = m.sortHeldRows([
  { ...rows[0], month: '2026-08', difference: -10, name: 'B' },
  { ...rows[0], month: '2026-10', difference: 5, name: 'C' },
  { ...rows[0], month: '2026-08', difference: 300, name: 'A' },
  { ...rows[0], month: '2026-08', difference: -10, name: 'A' },
]);
ok('sorted: newest month first, then the largest difference either way, then the name',
  sorted.map((r) => `${r.month}:${r.difference}:${r.name}`).join() === '2026-10:5:C,2026-08:300:A,2026-08:-10:A,2026-08:-10:B', sorted.map((r) => `${r.month}:${r.difference}:${r.name}`));
const t = m.heldTotals(rows);
ok('totals: how much more and how much less approving everything would charge', t.bills === 2 && t.up === 200 && t.down === 210000, t);

const src = readFileSync(join(repo, 'src', 'components', 'admin', 'ClosedMonthChanges.tsx'), 'utf8');
// Since 0824f804 the approve call lives in reports/approveClosedBill.ts, shared with the problems list.
const approveSrc = readFileSync(join(repo, 'src', 'components', 'admin', 'reports', 'approveClosedBill.ts'), 'utf8');
ok('the panel finds held bills through calculate-tuition-bulk (which never saves) and changes one only with force + reason',
  /invoke\("calculate-tuition-bulk"/.test(src) && /approveClosedBill\(row, why\)/.test(src)
    && /invoke\("calculate-tuition",[\s\S]*?force: true, reason\b/.test(approveSrc)
    && ![src, approveSrc].some((t) => /\.from\("invoices"\)\s*\.(update|upsert|insert|delete)/.test(t)));
ok('it prices nothing itself', ![src, approveSrc].some((t) => /\* ?\(?[\w.]+ ?\/ ?100|session_rate_vnd/.test(t)));

// ---- held.changes: what changed on a held bill (owner, 24 Nov 2026) ----
// supabase/functions/_lib/held-bill-changes.ts sets the saved bill beside what
// _lib/tuition-pricing.ts gives today. The real pricing module prices "today".
console.log('\nwhat changed on a held bill');
{
  const lib = join(repo, 'supabase', 'functions', '_lib');
  const load = async (name) => {
    const f = join(dir, `${name}.mjs`);
    writeFileSync(f, (await build({ entryPoints: [join(lib, `${name}.ts`)], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
    return import(pathToFileURL(f).href);
  };
  const { heldBillChanges } = await load('held-bill-changes');
  const { priceStudentMonth } = await load('tuition-pricing');
  const CA = 'class-a', CB = 'class-b', CC = 'class-c';
  const classNames = { [CA]: 'Mars', [CB]: 'Venus', [CC]: 'Pluto' };
  const className = (id) => classNames[id];
  const sess = (cls, d, status = 'Held') => ({ id: `${cls}-${d}`, date: `2026-03-${String(d).padStart(2, '0')}`, status, class_id: cls });
  const price = ({ enrollments, sessions, marks = {}, fees = { [CA]: 210000, [CB]: 250000, [CC]: 200000 }, monthDiscounts = [], sibling = null }) =>
    priceStudentMonth({ enrollments, sessions, markOf: (id) => marks[id], classFeeOn: (c) => fees[c], monthDiscounts, sibling });
  const line = (cls, lessons, rate, net) => ({ class_id: cls, class_name: classNames[cls], amount_vnd: lessons * rate, net_amount_vnd: net ?? lessons * rate, sessions_count: lessons, session_rate_vnd: rate });

  // A. Two held lessons nobody marked: not billed then, billed today.
  {
    const days = [3, 5, 10, 12, 17, 19, 24, 26];
    const marks = Object.fromEntries(days.slice(0, 6).map((d) => [`${CA}-${d}`, 'Present']));
    const priced = price({ enrollments: [{ class_id: CA, start_date: '2026-01-01' }], sessions: days.map((d) => sess(CA, d)), marks });
    const c = heldBillChanges({ saved: { base_amount: 1260000, discount_amount: 0, total_amount: 1260000, class_breakdown: [line(CA, 6, 210000)], review_flags: [] }, priced, className });
    const cl = c.classes[0];
    ok('A: the class line sets 6 lessons charged beside 8 billed today, at the same price',
      c.classes.length === 1 && cl.class_name === 'Mars' && cl.charged.lessons === 6 && cl.charged.rate_vnd === 210000 && cl.charged.amount_vnd === 1260000
        && cl.today.lessons === 8 && cl.today.amount_vnd === 1680000 && cl.today.prices.length === 1 && cl.today.prices[0].price_vnd === 210000 && cl.today.prices[0].custom_rate === false, cl);
    ok('A: every lesson billed today is listed with its mark; the two unmarked ones have none',
      cl.today.billed.length === 8 && cl.today.billed.filter((l) => l.mark === null && l.held).map((l) => l.date).join() === '2026-03-24,2026-03-26', cl.today.billed);
    ok('A: the figures are the saved bill\'s and the pricing module\'s, untouched',
      c.charged.total_vnd === 1260000 && c.today.base_vnd === priced.projected.baseAmount && c.today.total_vnd === priced.projected.totalAmount && c.today.total_vnd === 1680000, c);
    ok('A: the sentences say 2 more lessons and that they have no mark, with the dates',
      c.reasons.some((r) => /Mars: charged for 6 lessons; 8 are billed today \(2 more\)/.test(r))
        && c.reasons.some((r) => /2 lessons billed today have no mark in the register \(24 Mar, 26 Mar\)/.test(r) && /was not billed/.test(r)), c.reasons);
    ok('A: no discount either side, so no discount sentence', !c.reasons.some((r) => /^Discounts:/.test(r)) && c.discounts.today.length === 0);
  }

  // B. A custom rate saved the old way (class fee + "Rate Adjustment"), and a
  //    student discount that is in force today.
  {
    const days = [4, 6, 11, 13, 18, 20];
    const marks = Object.fromEntries(days.map((d) => [`${CB}-${d}`, 'Present']));
    const priced = price({
      enrollments: [{ class_id: CB, start_date: '2026-01-01', rate_override_vnd: 200000 }], sessions: days.map((d) => sess(CB, d)), marks,
      monthDiscounts: [{ name: 'Teacher Discount', type: 'percent', value: 10 }],
    });
    const c = heldBillChanges({
      saved: { base_amount: 1500000, discount_amount: 300000, total_amount: 1200000, class_breakdown: [line(CB, 6, 250000)],
        review_flags: [{ type: 'tuition_adjustment', details: { reasons: ['Custom rate', 'Rate Adjustment'] } }, { type: 'past_month_differs', details: {} }] },
      priced, className,
    });
    const p = c.classes[0].today.prices[0];
    ok('B: today\'s price is named as a custom rate, beside the class fee',
      c.classes[0].today.prices.length === 1 && p.price_vnd === 200000 && p.class_fee_vnd === 250000 && p.custom_rate === true && p.lessons === 6 && c.classes[0].charged.rate_vnd === 250000, c.classes[0]);
    ok('B: the sentence says charged at the class fee, today at the custom rate',
      c.reasons.some((r) => /Venus: charged at 250,000 ₫ a lesson; today each lesson is 200,000 ₫, the enrolment's custom rate \(the class fee is 250,000 ₫\)/.test(r)), c.reasons);
    ok('B: discounts then (names from the saved bill, not "Custom rate") and today (each line, from the pricing module)',
      c.discounts.charged_total_vnd === 300000 && c.discounts.charged_names.join() === 'Rate Adjustment'
        && c.discounts.today.length === 1 && c.discounts.today[0].name === 'Teacher Discount' && c.discounts.today[0].amount_vnd === 120000
        && c.discounts.today_total_vnd === priced.projected.totalDiscount && c.today.total_vnd === 1080000, c.discounts);
    ok('B: the discount sentence gives both totals and names, and "Rate Adjustment" is explained',
      c.reasons.some((r) => /^Discounts: 300,000 ₫ was taken off the bill \(Rate Adjustment\); today 120,000 ₫ is taken off \(Teacher Discount 10%: 120,000 ₫\)\./.test(r))
        && c.reasons.some((r) => /"Rate Adjustment" is how a custom rate was saved/.test(r)), c.reasons);
  }

  // C. Fewer lessons today (excused, cancelled), a class that is not on the saved
  //    bill, a class charged that has no lesson today, an enrolment discount and
  //    the sibling discount on its class.
  {
    const marks = { [`${CA}-3`]: 'Present', [`${CA}-5`]: 'Excused', [`${CA}-10`]: 'Absent', [`${CB}-4`]: 'Late' };
    const priced = price({
      enrollments: [
        { class_id: CA, start_date: '2026-01-01', discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' },
        { class_id: CB, start_date: '2026-03-01' },
      ],
      sessions: [sess(CA, 3), sess(CA, 5), sess(CA, 10), sess(CA, 12, 'Canceled'), sess(CB, 4), sess(CB, 25, 'Scheduled')],
      marks, sibling: { percent: 5, classId: CB },
    });
    const c = heldBillChanges({
      saved: { base_amount: 1240000, discount_amount: 0, total_amount: 1240000, class_breakdown: [line(CA, 4, 210000), line(CC, 2, 200000)], review_flags: null },
      priced, className,
    });
    const by = Object.fromEntries(c.classes.map((x) => [x.class_name, x]));
    ok('C: Mars: 4 charged, 2 billed today; the excused and the cancelled lesson are listed as not billed',
      by.Mars.charged.lessons === 4 && by.Mars.today.lessons === 2
        && by.Mars.today.not_billed.map((l) => `${l.date}:${l.state}`).join() === '2026-03-05:excused,2026-03-12:cancelled', by.Mars);
    ok('C: Mars: its enrolment discount shows as the net figure, from the pricing module',
      by.Mars.today.amount_vnd === 420000 && by.Mars.today.net_amount_vnd === 378000, by.Mars.today);
    ok('C: Venus is not on the saved bill; today it has a marked lesson and one still to come',
      by.Venus.charged === null && by.Venus.today.lessons === 2 && by.Venus.today.billed.map((l) => `${l.mark}:${l.held}`).join() === 'Late:true,null:false', by.Venus);
    ok('C: Pluto was charged and has no lesson today', by.Pluto.charged.lessons === 2 && by.Pluto.today === null, by.Pluto);
    ok('C: today\'s discounts name their class: the enrolment discount on Mars, the sibling discount on Venus',
      c.discounts.today.map((d) => `${d.name}@${d.class_name}`).join() === 'Enrollment Discount@Mars,Sibling Discount@Venus'
        && c.discounts.today.reduce((n, d) => n + d.amount_vnd, 0) === c.discounts.today_total_vnd, c.discounts);
    ok('C: the sentences cover each class and the discounts',
      c.reasons.some((r) => /Mars: charged for 4 lessons; 2 are billed today \(2 fewer\)/.test(r))
        && c.reasons.some((r) => /Mars: not billed today: 1 excused \(5 Mar\); 1 cancelled \(12 Mar\)/.test(r))
        && c.reasons.some((r) => /Venus is not on the saved bill; today 2 lessons are billed there \(500,000 ₫\)/.test(r))
        && c.reasons.some((r) => /Pluto: charged for 2 lessons \(400,000 ₫\); today no lesson of this class falls inside/.test(r))
        && c.reasons.some((r) => /^Discounts: 0 ₫ was taken off the bill; today/.test(r)), c.reasons);
  }

  // D. An older bill saved with no class lines: totals only, nothing guessed.
  {
    const priced = price({ enrollments: [{ class_id: CA, start_date: '2026-01-01' }], sessions: [sess(CA, 3), sess(CA, 5)], marks: { [`${CA}-3`]: 'Present', [`${CA}-5`]: 'Present' } });
    const c = heldBillChanges({ saved: { base_amount: 630000, discount_amount: 0, total_amount: 630000, class_breakdown: [], review_flags: [] }, priced, className });
    ok('D: no saved lines: said so, the class shows today\'s side only, and only the totals are compared',
      c.has_saved_lines === false && c.classes.length === 1 && c.classes[0].charged === null && c.classes[0].today.lessons === 2
        && c.reasons.length === 1 && /lists no classes/.test(c.reasons[0]) && /630,000 ₫ of lessons was charged; today's lessons come to 420,000 ₫/.test(c.reasons[0]), c);
    const odd = heldBillChanges({ saved: { base_amount: null, class_breakdown: 'x', review_flags: 'y' }, priced, className });
    ok('D: a malformed saved bill does not throw', odd.has_saved_lines === false && odd.charged.base_vnd === 0);
  }

  // The browser passes it through and renders it; the calculators send it.
  const withChanges = { has_saved_lines: true, charged: { base_vnd: 1, discount_vnd: 0, total_vnd: 1 }, today: { base_vnd: 2, discount_vnd: 0, total_vnd: 2 }, classes: [], discounts: { charged_total_vnd: 0, charged_names: [], today_total_vnd: 0, today: [] }, reasons: ['x'] };
  const r2 = m.heldRows([{ studentId: 'a', held: { ...held([1, 0, 1], [2, 0, 2]), changes: withChanges } }, { studentId: 'c', held: held([1, 0, 1], [2, 0, 2]) },
    { studentId: 'b', held: { ...held([1, 0, 1], [2, 0, 2]), changes: { classes: 'no' } } }], '2026-08', names);
  ok('a row carries the breakdown as sent; a function that predates it, or a malformed one, gives none',
    r2[0].changes === withChanges && r2[1].changes === null && r2[2].changes === null, r2.map((r) => r.changes));
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const single = strip(readFileSync(join(lib, '..', 'calculate-tuition', 'index.ts'), 'utf8'));
  const bulk = strip(readFileSync(join(lib, '..', 'calculate-tuition-bulk', 'index.ts'), 'utf8'));
  ok('both calculators answer the breakdown inside held, from the saved bill and the priced month',
    /changes: heldBillChanges\(\{\s*saved: savedInvoice,\s*priced: pricedMonth,/.test(single) && /changes: heldBillChanges\(\{\s*saved: frozenInv,\s*priced: pricedMonth,/.test(bulk));
  ok('the bulk read of the month\'s bills takes the review flags (the saved discount names)', /class_breakdown, review_flags"/.test(bulk));
  const mod = strip(readFileSync(join(lib, 'held-bill-changes.ts'), 'utf8'));
  ok('the breakdown module prices nothing: its one import is a type, and it takes no percentage', /^import type /m.test(mod) && !/^import (?!type)/m.test(mod) && !/\/ ?100/.test(mod));
  ok('the panel shows the breakdown under a line', /<WhatChanged row=\{r\} \/>/.test(src) && /custom rate; class fee/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
