// The owner's tuition rules (23 Nov 2026) as worked examples, against the real
// supabase/functions/_lib/tuition-pricing.ts. No database, no network.
import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const src = readFileSync(resolve('supabase/functions/_lib/tuition-pricing.ts'), 'utf8');
assert.ok(!/^\s*import\s/m.test(src), 'tuition-pricing.ts imports nothing');
const { code } = await transform(src, { loader: 'ts', format: 'esm' });
const dir = mkdtempSync(join(tmpdir(), 'tuition-pricing-'));
writeFileSync(join(dir, 'pricing.mjs'), code);
const { priceStudentMonth, chooseSiblingClass, weekdayOf, explainPayment, siblingFitByPayments } = await import(pathToFileURL(join(dir, 'pricing.mjs')).href);

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

// November 2026: Tuesdays and Thursdays, eight lessons.
const DATES = ['2026-11-03', '2026-11-05', '2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19', '2026-11-24', '2026-11-26'];
const sessions = (classId, statuses = {}, dates = DATES) =>
  dates.map((date, i) => ({ id: `${classId}-${i}`, date, class_id: classId, status: statuses[i] ?? 'Scheduled' }));
const enrol = (classId, extra = {}) => ({ class_id: classId, start_date: '2026-01-01', end_date: null, ...extra });
const price = ({ enrollments, sess, marks = {}, fees = { A: 200000, B: 260000 }, monthDiscounts = [], sibling = null }) =>
  priceStudentMonth({
    enrollments, sessions: sess, markOf: (id) => marks[id], classFeeOn: (c) => fees[c] ?? 0, monthDiscounts, sibling,
  });

test('weekday comes from the date alone', () => {
  assert.equal(weekdayOf('2026-11-03'), 2); // Tuesday
  assert.equal(weekdayOf('2026-11-01'), 0); // Sunday
});

test('held or scheduled lessons are billed; cancelled and excused are not', () => {
  const r = price({
    enrollments: [enrol('A')],
    sess: sessions('A', { 0: 'Held', 1: 'Held', 6: 'Canceled' }),
    marks: { 'A-0': 'Present', 'A-1': 'Excused', 'A-2': 'Absent', 'A-3': 'Late' },
  });
  // 8 on the timetable, 1 cancelled, 1 excused -> 6 billed.
  assert.equal(r.projected.lessons, 6);
  assert.equal(r.projected.baseAmount, 6 * 200000);
  assert.equal(r.projected.totalAmount, 1200000);
  assert.deepEqual(r.lessons.filter((l) => l.state !== 'billed').map((l) => [l.session_id, l.state]), [['A-1', 'excused'], ['A-6', 'cancelled']]);
});

test('a lesson with no register mark is billed', () => {
  const r = price({ enrollments: [enrol('A')], sess: sessions('A'), marks: {} });
  assert.equal(r.projected.lessons, 8);
  assert.equal(r.projected.totalAmount, 1600000);
});

test('actual counts only lessons already held; projected the whole month', () => {
  const r = price({ enrollments: [enrol('A')], sess: sessions('A', { 0: 'Held', 1: 'Held', 2: 'Held' }) });
  assert.equal(r.actual.totalAmount, 600000);
  assert.equal(r.projected.totalAmount, 1600000);
});

test('lessons outside the enrollment dates or weekdays are not billed', () => {
  const r = price({
    enrollments: [enrol('A', { start_date: '2026-11-10', end_date: '2026-11-20', allowed_days: [2] })], // Tuesdays only
    sess: sessions('A'),
  });
  assert.deepEqual(r.lessons.map((l) => l.date), ['2026-11-10', '2026-11-17']);
  assert.equal(r.projected.totalAmount, 400000);
});

test('the custom rate is the price, lower or higher than the class fee', () => {
  const lower = price({ enrollments: [enrol('A', { rate_override_vnd: 150000 })], sess: sessions('A') });
  assert.equal(lower.projected.baseAmount, 1200000);
  assert.equal(lower.projected.totalDiscount, 0);
  assert.equal(lower.projected.totalAmount, 1200000);
  assert.equal(lower.projected.expectedClassTuition, 1600000);
  const higher = price({ enrollments: [enrol('A', { rate_override_vnd: 250000 })], sess: sessions('A') });
  assert.equal(higher.projected.totalAmount, 2000000);
});

test('a custom rate of 0 is a free place: nothing billed', () => {
  const r = price({ enrollments: [enrol('A', { rate_override_vnd: 0 })], sess: sessions('A') });
  assert.equal(r.projected.lessons, 0);
  assert.equal(r.projected.totalAmount, 0);
  assert.ok(r.lessons.every((l) => l.state === 'free'));
});

test('a percentage discount comes off the custom rate (owner example: 1,080,000)', () => {
  const r = price({
    enrollments: [enrol('A', { rate_override_vnd: 150000, discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' })],
    sess: sessions('A'),
  });
  assert.equal(r.projected.baseAmount, 1200000);
  assert.equal(r.projected.totalAmount, 1080000);
});

test('two percentages: the second is taken from what is left (owner example: 1,368,000)', () => {
  const r = price({
    enrollments: [enrol('A', { discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' })],
    sess: sessions('A'),
    sibling: { percent: 5, classId: 'A' },
  });
  assert.equal(r.projected.baseAmount, 1600000);
  assert.deepEqual(r.projected.discounts.map((d) => [d.name, d.amount]), [['Enrollment Discount', 160000], ['Sibling Discount', 72000]]);
  assert.equal(r.projected.totalAmount, 1368000);
  assert.equal(r.projected.totalDiscount, 232000);
});

test('fixed amounts go first, percentages after: the school gives away the least', () => {
  const r = price({
    enrollments: [enrol('A')],
    sess: sessions('A'),
    monthDiscounts: [{ name: 'Scholarship', type: 'percent', value: 10 }, { name: 'Voucher', type: 'amount', value: 100000 }],
  });
  // (1,600,000 - 100,000) x 0.9 = 1,350,000, not 1,600,000 x 0.9 - 100,000 = 1,340,000.
  assert.deepEqual(r.projected.discounts.map((d) => [d.name, d.amount]), [['Voucher', 100000], ['Scholarship', 150000]]);
  assert.equal(r.projected.totalAmount, 1350000);
});

test('a discount never takes more than the amount it applies to', () => {
  const r = price({
    enrollments: [enrol('A')],
    sess: sessions('A', {}, DATES.slice(0, 2)),
    monthDiscounts: [{ name: 'Voucher', type: 'amount', value: 1000000 }],
  });
  assert.equal(r.projected.totalAmount, 0);
  assert.equal(r.projected.totalDiscount, 400000);
});

test('identical terms on a weekday split are one discount', () => {
  const terms = { discount_type: 'amount', discount_value: 100000, discount_cadence: 'monthly' };
  const r = price({
    enrollments: [enrol('A', { end_date: '2026-11-11', ...terms }), enrol('A', { start_date: '2026-11-12', ...terms })],
    sess: sessions('A'),
  });
  assert.equal(r.projected.discounts.length, 1);
  assert.equal(r.projected.totalAmount, 1500000);
});

test('the sibling percentage applies to the winner class only', () => {
  const r = price({
    enrollments: [enrol('A'), enrol('B')],
    sess: [...sessions('A'), ...sessions('B', {}, DATES.slice(0, 4))],
    sibling: { percent: 5, classId: 'B' },
  });
  // A 1,600,000 + B 1,040,000; 5% of B = 52,000.
  assert.equal(r.projected.totalAmount, 1600000 + 1040000 - 52000);
  assert.equal(r.projected.classes.find((c) => c.class_id === 'B').sibling_discount_vnd, 52000);
  assert.equal(r.projected.classes.find((c) => c.class_id === 'A').sibling_discount_vnd, 0);
});

test('totals always add up: base - discounts = total', () => {
  const r = price({
    enrollments: [enrol('A', { discount_type: 'percent', discount_value: 7, discount_cadence: 'monthly' }), enrol('B', { rate_override_vnd: 233333 })],
    sess: [...sessions('A'), ...sessions('B')],
    monthDiscounts: [{ name: 'x', type: 'percent', value: 3 }, { name: 'y', type: 'amount', value: 12345 }],
    sibling: { percent: 5, classId: 'A' },
  });
  const p = r.projected;
  assert.equal(p.baseAmount - p.discounts.reduce((n, d) => n + d.amount, 0), p.totalAmount);
  assert.equal(p.baseAmount - p.totalDiscount, p.totalAmount);
  assert.ok(Number.isInteger(p.totalAmount));
});

// ---- who gets the sibling discount
const child = (studentId, spec) => ({ studentId, month: price({ ...spec, sibling: null }).projected });

test('sibling: percent 0 means off', () => {
  const kids = [child('s1', { enrollments: [enrol('A')], sess: sessions('A') }), child('s2', { enrollments: [enrol('A')], sess: sessions('A') })];
  assert.equal(chooseSiblingClass(kids, 0).status, 'off');
});

test('sibling: needs two children with billable lessons', () => {
  const kids = [
    child('s1', { enrollments: [enrol('A')], sess: sessions('A') }),
    child('s2', { enrollments: [enrol('A')], sess: sessions('A', Object.fromEntries(DATES.map((_, i) => [i, 'Canceled']))) }),
  ];
  const c = chooseSiblingClass(kids, 5);
  assert.equal(c.status, 'pending');
  assert.equal(c.billableChildren, 1);
});

test('sibling: goes to the class where it costs the school least, across all the children', () => {
  const kids = [
    // s1: one big class.
    child('s1', { enrollments: [enrol('A')], sess: sessions('A') }),                       // A 1,600,000
    // s2: a big class and a small one. The small one is the cheapest in the family.
    child('s2', { enrollments: [enrol('A'), enrol('B')], sess: [...sessions('A'), ...sessions('B', {}, DATES.slice(0, 2))] }), // B 520,000
  ];
  const c = chooseSiblingClass(kids, 5);
  assert.equal(c.status, 'assigned');
  assert.deepEqual([c.studentId, c.classId, c.amount], ['s2', 'B', 26000]);
});

test('sibling: the comparison is after the class own discounts', () => {
  const kids = [
    child('s1', { enrollments: [enrol('A', { discount_type: 'percent', discount_value: 50, discount_cadence: 'monthly' })], sess: sessions('A') }), // 800,000 left
    child('s2', { enrollments: [enrol('B')], sess: sessions('B', {}, DATES.slice(0, 4)) }),                                                         // 1,040,000
  ];
  const c = chooseSiblingClass(kids, 5);
  assert.deepEqual([c.studentId, c.classId, c.amount], ['s1', 'A', 40000]);
});

test('sibling: a free place does not count as a billable child', () => {
  const kids = [
    child('s1', { enrollments: [enrol('A')], sess: sessions('A') }),
    child('s2', { enrollments: [enrol('A', { rate_override_vnd: 0 })], sess: sessions('A') }),
  ];
  assert.equal(chooseSiblingClass(kids, 5).status, 'pending');
});

test('sibling: equal cost is settled by the tie order, the same way every time', () => {
  const kids = [child('s1', { enrollments: [enrol('A')], sess: sessions('A') }), child('s2', { enrollments: [enrol('A')], sess: sessions('A') })];
  const first = chooseSiblingClass(kids, 5, (s) => (s === 's2' ? 0 : 1));
  assert.equal(first.studentId, 's2');
  assert.equal(chooseSiblingClass([...kids].reverse(), 5, (s) => (s === 's2' ? 0 : 1)).studentId, 's2');
});

// ---------------------------------------------------- what a payment paid for
// The owner's complaint: "the records on the app do not match what parents paid".
const explain = ({ enrollments, sess, marks = {}, fees = { A: 210000, B: 260000 }, monthDiscounts = [], sibling = null }, paid, carryIn = 0) =>
  explainPayment({ enrollments, sessions: sess, markOf: (id) => marks[id], classFeeOn: (c) => fees[c] ?? 0, monthDiscounts, sibling }, paid, carryIn);
const seven = DATES.slice(0, 7); // 3..24 Nov at 210,000 = 1,470,000

test('paid: the November case - seven lessons paid, the lesson of the 24th cancelled afterwards', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', { 6: 'Canceled' }, seven) }, 1470000);
  assert.equal(e.kind, 'explained');
  assert.deepEqual([e.paid, e.payable, e.difference], [1470000, 1260000, 210000]);
  assert.deepEqual(e.lessons.map((l) => [l.date, l.state, l.price_vnd]), [['2026-11-24', 'cancelled', 210000]]);
});

test('paid: exactly what the month asks for', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', {}, seven) }, 1470000);
  assert.deepEqual([e.kind, e.difference, e.lessons.length], ['exact', 0, 0]);
});

test('paid: nothing recorded', () => {
  assert.equal(explain({ enrollments: [enrol('A')], sess: sessions('A', {}, seven) }, 0).kind, 'none');
});

test('paid: two lessons gone, one of them excused; the latest lessons are named', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', { 5: 'Canceled', 6: 'Canceled' }, seven), marks: { 'A-1': 'Excused' } }, 1470000 - 210000);
  // Three lessons are not billed (1,470,000 - 630,000 = 840,000 asked); the family paid for six: two explain it.
  assert.equal(e.kind, 'explained');
  assert.equal(e.payable, 840000);
  assert.deepEqual(e.lessons.map((l) => l.date), ['2026-11-19', '2026-11-24']);
});

test('paid: a discount is priced into the explanation (10% off: a lesson is worth 189,000)', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', { 6: 'Canceled' }, seven), monthDiscounts: [{ name: 'Staff child', type: 'percent', value: 10 }] }, 1323000);
  assert.deepEqual([e.kind, e.payable, e.difference], ['explained', 1134000, 189000]);
});

test('paid: more than asked and no lesson explains it', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', { 6: 'Canceled' }, seven) }, 1500000);
  assert.deepEqual([e.kind, e.difference, e.lessons.length], ['over', 240000, 0]);
  const none = explain({ enrollments: [enrol('A')], sess: sessions('A', {}, seven) }, 1500000);
  assert.deepEqual([none.kind, none.difference], ['over', 30000]);
});

test('paid: less than asked', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', {}, seven) }, 1000000);
  assert.deepEqual([e.kind, e.difference], ['under', -470000]);
});

test('paid: the October case - the month paid in full while credit was carried in', () => {
  // 210,000 credit brought in: the app asks 1,260,000, the family paid the month's 1,470,000.
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', {}, seven) }, 1470000, -210000);
  assert.deepEqual([e.kind, e.carryCounted, e.payable, e.difference], ['exact', false, 1260000, 210000]);
});

test('paid: debt carried in is part of what was paid against', () => {
  const e = explain({ enrollments: [enrol('A')], sess: sessions('A', { 6: 'Canceled' }, seven) }, 1470000 + 300000, 300000);
  assert.deepEqual([e.kind, e.carryCounted, e.payable, e.difference], ['explained', true, 1560000, 210000]);
  assert.equal(e.lessons.length, 1);
});

// ---------------------------------------------------------- free trial lessons
// Owner, 24 Nov 2026: a lesson given to a child as a free trial is not billed.

test('free trial: the lessons ticked are not billed, whatever their mark', () => {
  const trial = new Set(['A-0', 'A-1']);
  const r = priceStudentMonth({
    enrollments: [enrol('A')], sessions: sessions('A', { 0: 'Held', 1: 'Held', 2: 'Held' }),
    markOf: (id) => ({ 'A-0': 'Present', 'A-2': 'Present' })[id], classFeeOn: () => 200000, monthDiscounts: [], sibling: null,
    isFreeTrial: (id) => trial.has(id),
  });
  assert.equal(r.projected.lessons, 6);
  assert.equal(r.projected.totalAmount, 6 * 200000);
  // Held and already past: the two trial lessons are not in "actual" either.
  assert.equal(r.actual.totalAmount, 200000);
  assert.deepEqual(r.lessons.filter((l) => l.state === 'trial').map((l) => [l.session_id, l.mark, l.price_vnd]), [['A-0', 'Present', 200000], ['A-1', null, 200000]]);
});

test('free trial: no list given means none; cancelled stays cancelled and a free place stays free', () => {
  const none = price({ enrollments: [enrol('A')], sess: sessions('A') });
  assert.equal(none.lessons.filter((l) => l.state === 'trial').length, 0);
  const r = priceStudentMonth({
    enrollments: [enrol('A'), enrol('B', { rate_override_vnd: 0 })],
    sessions: [...sessions('A', { 0: 'Canceled' }), ...sessions('B')],
    markOf: () => undefined, classFeeOn: (c) => ({ A: 200000, B: 260000 })[c], monthDiscounts: [], sibling: null,
    isFreeTrial: () => true,
  });
  assert.equal(r.projected.totalAmount, 0);
  assert.equal(r.lessons.find((l) => l.session_id === 'A-0').state, 'cancelled');
  assert.equal(r.lessons.filter((l) => l.class_id === 'B').every((l) => l.state === 'free'), true);
  assert.equal(r.lessons.filter((l) => l.class_id === 'A' && l.state === 'trial').length, 7);
});

test('free trial: an excused lesson that is also a trial is a trial, and discounts are taken from what is left', () => {
  const r = priceStudentMonth({
    enrollments: [enrol('A', { discount_type: 'percent', discount_value: 10, discount_cadence: 'monthly' })],
    sessions: sessions('A'), markOf: (id) => (id === 'A-0' ? 'Excused' : undefined), classFeeOn: () => 200000,
    monthDiscounts: [], sibling: null, isFreeTrial: (id) => id === 'A-0' || id === 'A-1',
  });
  assert.equal(r.lessons.find((l) => l.session_id === 'A-0').state, 'trial');
  assert.equal(r.projected.baseAmount, 6 * 200000);
  assert.equal(r.projected.totalAmount, 1080000); // 1,200,000 less 10%
});

test('free trial: a payment made before the lesson was made free is explained by it', () => {
  // Paid for 8 lessons; the first was made a free trial afterwards.
  const input = {
    enrollments: [enrol('A')], sessions: sessions('A'), markOf: () => undefined, classFeeOn: () => 200000,
    monthDiscounts: [], sibling: null, isFreeTrial: (id) => id === 'A-0',
  };
  const e = explainPayment(input, 1600000, 0);
  assert.deepEqual([e.kind, e.payable, e.difference, e.lessons.map((l) => l.session_id)], ['explained', 1400000, 200000, ['A-0']]);
});

// ------------------------------------------ the sibling discount, as the family paid
// Owner, 24 Nov 2026: when every child's payment is, to the dong, their bill
// with the discount on another child, the discount goes there.

const noSibling = (classId, fee, extra = {}) =>
  priceStudentMonth({ enrollments: [enrol(classId)], sessions: sessions(classId), markOf: () => undefined, classFeeOn: () => fee, monthDiscounts: [], sibling: null, ...extra }).projected;

test('sibling fit: the family paid with the 5% on the other child', () => {
  // The rule gives it to An (80,000 costs the school least). The family paid Binh's 104,000 instead.
  const children = [
    { studentId: 'an', month: noSibling('A', 200000), paid: 1600000 },
    { studentId: 'binh', month: noSibling('B', 260000), paid: 2080000 - 104000 },
  ];
  const fit = siblingFitByPayments(children, 5, { studentId: 'an', classId: 'A' });
  assert.deepEqual([fit.studentId, fit.classId, fit.amount], ['binh', 'B', 104000]);
  assert.deepEqual(fit.totals, [{ studentId: 'an', total: 1600000 }, { studentId: 'binh', total: 1976000 }]);
});

test('sibling fit: paid as billed, nothing moves', () => {
  const children = [
    { studentId: 'an', month: noSibling('A', 200000), paid: 1520000 },
    { studentId: 'binh', month: noSibling('B', 260000), paid: 2080000 },
  ];
  assert.equal(siblingFitByPayments(children, 5, { studentId: 'an', classId: 'A' }), null);
});

test('sibling fit: one dong off, a child who paid nothing, or a family with the discount off: nothing moves', () => {
  const an = noSibling('A', 200000), binh = noSibling('B', 260000);
  const cur = { studentId: 'an', classId: 'A' };
  assert.equal(siblingFitByPayments([{ studentId: 'an', month: an, paid: 1600000 }, { studentId: 'binh', month: binh, paid: 1976001 }], 5, cur), null);
  assert.equal(siblingFitByPayments([{ studentId: 'an', month: an, paid: 0 }, { studentId: 'binh', month: binh, paid: 1976000 }], 5, cur), null);
  assert.equal(siblingFitByPayments([{ studentId: 'an', month: an, paid: 1600000 }, { studentId: 'binh', month: binh, paid: 1976000 }], 0, cur), null);
  // Both paid in full: no placing of the discount fits that.
  assert.equal(siblingFitByPayments([{ studentId: 'an', month: an, paid: 1600000 }, { studentId: 'binh', month: binh, paid: 2080000 }], 5, cur), null);
  // One child alone has no sibling discount to move.
  assert.equal(siblingFitByPayments([{ studentId: 'binh', month: binh, paid: 1976000 }], 5, null), null);
});

test('sibling fit: nobody holds it yet and the payments say who should', () => {
  const children = [
    { studentId: 'an', month: noSibling('A', 200000), paid: 1520000 },
    { studentId: 'binh', month: noSibling('B', 260000), paid: 2080000 },
  ];
  const fit = siblingFitByPayments(children, 5, null);
  assert.deepEqual([fit.studentId, fit.classId, fit.amount], ['an', 'A', 80000]);
});

test('sibling fit: the percentage is taken after the child\'s own discounts, as on the bill', () => {
  // Binh has a 10% student discount: 2,080,000 -> 1,872,000, and 5% of that is 93,600.
  const binh = noSibling('B', 260000, { monthDiscounts: [{ name: 'Staff child', type: 'percent', value: 10 }] });
  assert.equal(binh.totalAmount, 1872000);
  const children = [
    { studentId: 'an', month: noSibling('A', 200000), paid: 1600000 },
    { studentId: 'binh', month: binh, paid: 1872000 - 93600 },
  ];
  const fit = siblingFitByPayments(children, 5, { studentId: 'an', classId: 'A' });
  assert.deepEqual([fit.studentId, fit.amount, fit.totals[1].total], ['binh', 93600, 1778400]);
  // And it is what the pricing itself gives Binh with the discount there.
  const priced = priceStudentMonth({
    enrollments: [enrol('B')], sessions: sessions('B'), markOf: () => undefined, classFeeOn: () => 260000,
    monthDiscounts: [{ name: 'Staff child', type: 'percent', value: 10 }], sibling: { percent: 5, classId: 'B' },
  }).projected.totalAmount;
  assert.equal(priced, 1778400);
});

test('sibling fit: three children, every payment must fit', () => {
  const an = noSibling('A', 200000), binh = noSibling('B', 260000), chi = noSibling('A', 200000);
  const cur = { studentId: 'an', classId: 'A' };
  const paid = (c) => [{ studentId: 'an', month: an, paid: 1600000 }, { studentId: 'binh', month: binh, paid: 1976000 }, { studentId: 'chi', month: chi, paid: c }];
  assert.equal(siblingFitByPayments(paid(1600000), 5, cur).studentId, 'binh');
  assert.equal(siblingFitByPayments(paid(1500000), 5, cur), null);
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
