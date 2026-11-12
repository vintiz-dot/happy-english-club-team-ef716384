// The admin tuition list used to work out the carried balance, the payable
// and the balance in the browser, from raw invoice rows. This runs the REAL
// calculate-tuition-bulk and calculate-tuition handlers over one made-up
// school and sets their answer beside what that browser arithmetic gave, case
// by case: where the two agree, and where (and why) they do not.
//
// The browser arithmetic is kept here, in `legacyBrowserRow`, only as the
// record of what the screen used to do. Nothing in src/ does it any more.
//
//   T3_DUMP=<file.json>  also writes the fixture and every answer, for the
//                        preview harness that renders the screens.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MONTH = '2026-11';
const RATE = 180000;
const FULL = 8 * RATE; // 1,440,000: eight attended lessons
const CLASS = '00000000-0000-0000-0000-0000000000c1';
const FAMILY = '00000000-0000-0000-0000-0000000000f1';
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

// ---------------------------------------------------------------- fixture
const classes = [{ id: CLASS, name: 'Starters 1 (Mon-Wed)', session_rate_vnd: RATE, is_active: true }];
const sessionDates = ['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11', '2026-11-16', '2026-11-18', '2026-11-23', '2026-11-25'];
const sessions = sessionDates.map((date, i) => ({ id: `ses-${i + 1}`, date, class_id: CLASS, status: date <= '2026-11-12' ? 'Held' : 'Scheduled', classes: classes[0] }));

const CASES = [
  { n: 1, key: 'in-step', name: 'Case 01 Bill in step', what: 'November bill saved and current, no history, nothing paid',
    invoices: [{ month: MONTH, total_amount: FULL }] },
  { n: 2, key: 'arrears', name: 'Case 02 Arrears', what: 'October short by 1,000,000; November bill current',
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: 440000 }, { month: MONTH, total_amount: FULL }] },
  { n: 3, key: 'credit', name: 'Case 03 Credit', what: 'October overpaid by 560,000; November bill current',
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: 2000000 }, { month: MONTH, total_amount: FULL }] },
  { n: 4, key: 'no-row-arrears', name: 'Case 04 No bill yet, arrears', what: 'NO November invoice row yet; October short by 1,000,000',
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: 440000 }] },
  { n: 5, key: 'no-row', name: 'Case 05 No bill yet', what: 'NO November invoice row yet; no history',
    invoices: [] },
  { n: 6, key: 'stale-total', name: 'Case 06 Bill out of date', what: 'November row saved at 7 lessons (1,260,000) and paid in full; an 8th lesson has been marked since',
    invoices: [{ month: MONTH, total_amount: 7 * RATE, base_amount: 7 * RATE, recorded_payment: 7 * RATE }] },
  { n: 7, key: 'frozen', name: 'Case 07 Frozen bill', what: 'November bill frozen at 810,000 (900,000 less 90,000); the register now says 1,440,000',
    invoices: [{ month: MONTH, tuition_frozen: true, base_amount: 900000, discount_amount: 90000, total_amount: 810000 }] },
  { n: 8, key: 'paid-on-earlier-month', name: 'Case 08 Paid on October', what: "November's money was recorded on the October bill",
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: FULL + FULL }, { month: MONTH, total_amount: FULL }] },
  { n: 9, key: 'paid-on-later-month', name: 'Case 09 Paid on December', what: "November's money was recorded on a December bill",
    invoices: [{ month: MONTH, total_amount: FULL }, { month: '2026-12', total_amount: 0, recorded_payment: FULL }] },
  { n: 10, key: 'refund', name: 'Case 10 Payment corrected', what: 'October paid in full, then corrected down by 500,000 (a refund, an edit or a deleted payment all end as a lower recorded_payment)',
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: FULL - 500000 }, { month: MONTH, total_amount: FULL }] },
  { n: 11, key: 'zero-month', name: 'Case 11 Zero-charge month', what: 'September paid, October a zero-charge bill, November current',
    invoices: [{ month: '2026-09', total_amount: FULL, recorded_payment: FULL }, { month: '2026-10', total_amount: 0 }, { month: MONTH, total_amount: FULL }] },
  { n: 12, key: 'left-owing', name: 'Case 12 Left owing', what: 'left on 31 October owing 700,000; not enrolled in November, no November row', enrolledTo: '2026-10-31',
    invoices: [{ month: '2026-10', total_amount: FULL, recorded_payment: FULL - 700000 }] },
  { n: 13, key: 'earlier-total-changed', name: 'Case 13 October re-billed', what: 'October was 1,440,000 and paid; it was later re-billed to 1,260,000. The November row still STORES carry-in credit 0',
    invoices: [{ month: '2026-10', total_amount: 7 * RATE, recorded_payment: FULL }, { month: MONTH, total_amount: FULL, carry_in_credit: 0, carry_out_debt: FULL }] },
  { n: 14, key: 'sibling-winner', name: 'Case 14 Sibling (discounted)', what: 'family discount of 10% saved on the November bill; the discount is being re-decided right now (unresolved)', family: FAMILY,
    invoices: [{ month: MONTH, base_amount: FULL, discount_amount: FULL / 10, total_amount: FULL - FULL / 10 }] },
  { n: 15, key: 'sibling-other', name: 'Case 15 Sibling (full price)', what: 'the other child of that family', family: FAMILY,
    invoices: [{ month: MONTH, total_amount: FULL }] },
];

const students = CASES.map((c) => ({ id: id(c.n), full_name: c.name, family_id: c.family ?? null, is_active: true, deactivated_at: null, avatar_url: null,
  families: c.family ? { id: c.family, sibling_percent_override: null } : null }));
const enrollments = CASES.map((c) => ({ id: `enr-${c.n}`, student_id: id(c.n), class_id: CLASS, start_date: '2026-01-01', end_date: c.enrolledTo ?? null,
  allowed_days: null, discount_type: null, discount_value: null, discount_cadence: null, rate_override_vnd: null }));
const attendance = CASES.flatMap((c) => sessions.map((s) => ({ session_id: s.id, student_id: id(c.n), status: 'Present' })));
let invN = 0;
const invoices = CASES.flatMap((c) => c.invoices.map((inv) => {
  invN += 1;
  const total = inv.total_amount ?? 0;
  return { id: `00000000-0000-0000-00aa-${String(invN).padStart(12, '0')}`, student_id: id(c.n), month: inv.month,
    base_amount: inv.base_amount ?? total, discount_amount: inv.discount_amount ?? 0, total_amount: total,
    recorded_payment: inv.recorded_payment ?? 0, paid_amount: 0, tuition_frozen: inv.tuition_frozen ?? false,
    status: 'issued', confirmation_status: 'auto_approved',
    carry_in_credit: inv.carry_in_credit ?? null, carry_in_debt: inv.carry_in_debt ?? null,
    carry_out_credit: inv.carry_out_credit ?? null, carry_out_debt: inv.carry_out_debt ?? null };
}));
const fixture = { students, classes, enrollments, sessions, attendance, invoices, discount_assignments: [], referral_bonuses: [] };

// ------------------------------------------------- stand-in for PostgREST
let rowCap = Infinity; // PostgREST returns at most `max-rows` (1000 by default) rows per request
let source = fixture;
const client = () => ({ from(table) {
  let rows = source[table] || [];
  const q = {
    select() { return q; }, order() { return q; },
    eq(k, v) { rows = rows.filter((r) => r[k] === v); return q; },
    neq(k, v) { rows = rows.filter((r) => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter((r) => vs.includes(r[k])); return q; },
    gte(k, v) { rows = rows.filter((r) => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter((r) => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter((r) => r[k] <= v); return q; },
    or() { return q; },
    single() { return Promise.resolve({ data: rows[0], error: null }); },
    maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
    upsert(row) { writes.push(row); return Promise.resolve({ error: null }); },
    then(done) { return Promise.resolve({ data: rows.slice(0, rowCap), error: null }).then(done); },
  };
  return q;
} });
let writes = [];
globalThis.__tuitionClient = client;
// The family discount for FAMILY is "unresolved": compute-sibling-discounts is busy.
globalThis.__siblingStates = (familyIds) => familyIds.map((family_id) => ({ family_id, status: 'unresolved', winner_student_id: null, winner_class_id: null,
  sibling_percent: 0, reason: 'Family discount is still being calculated. Refresh in a moment.' }));

const dir = mkdtempSync(join(tmpdir(), 'tuition-prior-'));
const handlers = {};
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
  const bundle = await build({
    entryPoints: [resolve(`supabase/functions/${name}/index.ts`)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
    plugins: [{ name: 'test-boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ }, (args) => ({ path: args.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__tuitionClient;' :
        args.path.includes('zod') ? 'const chain = new Proxy({}, {get: (_, key) => key === "parse" ? v => v : () => chain}); export const z = chain;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => ({isServiceRole: false, roles: new Set(["admin"])}); export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async (_sb, ids, month) => globalThis.__siblingStates(ids, month);' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};'
      }));
    } }],
  });
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}
const call = async (name, body) => {
  const res = await handlers[name](new Request('http://localhost/tuition', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' }, body: JSON.stringify(body) }));
  const json = await res.json();
  assert.equal(res.status, 200, JSON.stringify(json));
  return json;
};

// ------------------- what AdminTuitionList.tsx did until this fix (93-155)
async function legacyBrowserRows(studentIds, month) {
  const sb = client();
  const { data: current } = await sb.from('invoices').select('*').eq('month', month).in('student_id', studentIds);
  const { data: prior } = await sb.from('invoices').select('student_id, total_amount, recorded_payment').lt('month', month).in('student_id', studentIds);
  const priorBalanceMap = new Map();
  prior.forEach((inv) => priorBalanceMap.set(inv.student_id, (priorBalanceMap.get(inv.student_id) || 0) + (inv.recorded_payment || 0) - (inv.total_amount || 0)));
  const invoiceMap = new Map(current.map((inv) => [inv.student_id, inv]));
  return new Map(studentIds.map((sid) => {
    const invoice = invoiceMap.get(sid);
    const currentCharges = invoice?.total_amount || 0;
    const recordedPayment = invoice?.recorded_payment || 0;
    const priorBalance = priorBalanceMap.get(sid) || 0;
    const carryInCredit = priorBalance > 0 ? priorBalance : 0;
    const carryInDebt = priorBalance < 0 ? -priorBalance : 0;
    const finalPayable = currentCharges + carryInDebt - carryInCredit;
    return [sid, { totalAmount: currentCharges, monthPayments: recordedPayment, carryInCredit, carryInDebt, payable: finalPayable,
      carryOutCredit: Math.max(0, recordedPayment - finalPayable), carryOutDebt: Math.max(0, finalPayable - recordedPayment), settledInMonth: null }];
  }));
}
// src/lib/tuitionStatus.tsx getPaymentStatus, as both lists call it.
const statusOf = (r) => r.carryOutCredit > 0 ? 'overpaid' : r.carryOutDebt === 0 && r.totalAmount > 0 ? 'settled'
  : r.carryOutDebt > 0 && r.settledInMonth ? `settled in ${r.settledInMonth}` : r.monthPayments > 0 && r.carryOutDebt > 0 ? 'underpaid' : r.carryOutDebt > 0 ? 'unpaid' : 'open';
const flat = (r) => ({ totalAmount: r.totalAmount, monthPayments: r.payments.monthPayments, carryInCredit: r.carry.carryInCredit, carryInDebt: r.carry.carryInDebt,
  carryOutCredit: r.carry.carryOutCredit, carryOutDebt: r.carry.carryOutDebt, settledInMonth: r.carry.settledInMonth ?? null });
const FIGURES = ['totalAmount', 'monthPayments', 'carryInCredit', 'carryInDebt', 'carryOutCredit', 'carryOutDebt'];

// ------------------------------------------------------------------- run
const ids = CASES.map((c) => id(c.n));
const bulk = (await call('calculate-tuition-bulk', { studentIds: ids, month: MONTH })).results;
assert.equal(writes.length, 0, 'calculate-tuition-bulk never writes an invoice');
const single = [];
for (const sid of ids) single.push(await call('calculate-tuition', { studentId: sid, month: MONTH }));
const legacy = await legacyBrowserRows(ids, MONTH);

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed += 1; };
const table = [];
for (const c of CASES) {
  const b = bulk.find((r) => r.studentId === id(c.n));
  const s = single.find((r) => r.studentId === id(c.n));
  const l = legacy.get(id(c.n));
  ok(b && !b.error, `${c.key}: bulk answered`);
  // The two calculators agree with each other on every figure.
  for (const f of FIGURES) ok(flat(b)[f] === flat(s)[f], `${c.key}: bulk and single agree on ${f} (${flat(b)[f]} vs ${flat(s)[f]})`);
  const differs = FIGURES.filter((f) => flat(b)[f] !== l[f]);
  table.push({ n: c.n, key: c.key, name: c.name, what: c.what, browser: { ...l, status: statusOf(l) }, calculator: { ...flat(b), status: statusOf(flat(b)) },
    differs, statusDiffers: statusOf(l) !== statusOf(flat(b)) });
}
const row = (key) => table.find((t) => t.key === key);
const same = (key) => ok(row(key).differs.length === 0 && !row(key).statusDiffers, `${key}: browser sum and calculator agree`);

// Where every earlier month has a row and this month's saved total is current, the two agree.
for (const key of ['in-step', 'arrears', 'credit', 'frozen', 'paid-on-earlier-month', 'refund', 'zero-month', 'left-owing', 'earlier-total-changed']) same(key);
ok(row('arrears').calculator.carryInDebt === 1000000 && row('arrears').calculator.carryOutDebt === 1000000 + FULL, 'arrears: 1,000,000 carried in, 2,440,000 owed');
ok(row('credit').calculator.carryInCredit === 560000 && row('credit').calculator.carryOutDebt === FULL - 560000, 'credit: 560,000 carried in, 880,000 owed');
ok(row('frozen').calculator.totalAmount === 810000, 'frozen: the saved 810,000 stands in both');
ok(row('paid-on-earlier-month').calculator.status === 'settled', 'paid on October: settled in both');
ok(row('left-owing').calculator.totalAmount === 0 && row('left-owing').calculator.carryOutDebt === 700000, 'left owing: no November charge, 700,000 still owed');
// The stored column is a third answer when the trigger has not run: neither reader uses it.
ok(row('earlier-total-changed').calculator.carryInCredit === 180000, 'October re-billed: 180,000 credit in both, whatever the November row stores');

// No invoice row for the month: the browser charged nothing.
ok(row('no-row-arrears').browser.totalAmount === 0 && row('no-row-arrears').calculator.totalAmount === FULL, 'no row: browser 0, calculator 1,440,000');
ok(row('no-row-arrears').browser.carryOutDebt === 1000000 && row('no-row-arrears').calculator.carryOutDebt === 1000000 + FULL, 'no row + arrears: browser owes 1,000,000, calculator 2,440,000');
ok(row('no-row').browser.status === 'open' && row('no-row').calculator.status === 'unpaid', 'no row: browser "open", calculator "unpaid"');
// A saved total that is out of date: the browser showed it as settled.
ok(row('stale-total').browser.status === 'settled' && row('stale-total').calculator.status === 'underpaid' && row('stale-total').calculator.carryOutDebt === RATE, 'stale total: browser settled, calculator 180,000 short');
// Money recorded on a later month: same figures, but only the calculator knows the debt was settled later.
ok(row('paid-on-later-month').differs.length === 0 && row('paid-on-later-month').browser.status === 'unpaid' && row('paid-on-later-month').calculator.status === 'settled in 2026-12', 'paid on December: browser "unpaid", calculator "settled in 2026-12"');
// Family discount unresolved: the bulk answer is priced WITHOUT the discount - and, since T1 round 2, says so.
const bw = bulk.find((r) => r.studentId === id(14)); const sw = single.find((r) => r.studentId === id(14));
ok(bw.totalAmount === FULL && row('sibling-winner').browser.totalAmount === FULL - FULL / 10, 'unresolved family discount: bulk 1,440,000, saved bill 1,296,000');
ok(bw.siblingUnresolved === true && bulk.find((r) => r.studentId === id(15)).siblingUnresolved === true, 'the bulk answer marks both children of the family siblingUnresolved: true');
ok(bulk.filter((r) => r.siblingUnresolved).length === 2 && bulk.every((r) => typeof r.siblingUnresolved === 'boolean'), 'and nobody else: every other answer says siblingUnresolved: false');
ok(sw.siblingUnresolved === true && sw.invoiceSaved === false, 'the single calculator says so and does not save');
ok(writes.every((w) => w.student_id !== id(14) && w.student_id !== id(15)), 'no invoice written for the unresolved family');
ok(row('sibling-other').differs.length === 0, 'the other child is unaffected');
// Both calculators return the payable (T1 round 2), and it is the same figure in both.
for (const c of CASES) {
  const b = bulk.find((r) => r.studentId === id(c.n)); const s = single.find((r) => r.studentId === id(c.n));
  ok(Number.isFinite(b.carry.payable) && b.carry.payable === s.carry.payable, `${c.key}: bulk and single agree on carry.payable (${b.carry.payable} vs ${s.carry.payable})`);
  // What is still owed after this month's payment is the carry-out: the payable is tied to the figures beside it.
  ok(b.carry.payable - b.payments.monthPayments === b.carry.carryOutDebt - b.carry.carryOutCredit, `${c.key}: payable less paid is the carry-out`);
}
ok(row('arrears').calculator.carryInDebt === 1000000 && bulk.find((r) => r.studentId === id(2)).carry.payable === 2440000, 'arrears: payable 2,440,000');
ok(bulk.find((r) => r.studentId === id(3)).carry.payable === 880000, 'credit: payable 880,000');
ok(bulk.find((r) => r.studentId === id(8)).carry.payable === 0, 'paid on October: payable 0');

// --- what the admin tuition list now shows: src/lib/tuitionRows.ts over the REAL answers.
{
  const out = await build({ entryPoints: [resolve('src/lib/tuitionRows.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  const file = join(dir, 'tuitionRows.mjs');
  writeFileSync(file, out.outputFiles[0].text);
  const rows = await import(pathToFileURL(file).href);
  for (const c of CASES) {
    const b = bulk.find((r) => r.studentId === id(c.n));
    const f = rows.tuitionFigures(b);
    if (c.family) {
      // The function says the family discount is unresolved: the list shows no figure of that bill.
      ok(f.state === 'pending' && f.charge === null && f.payable === null && rows.carriedOut(f).kind === 'pending' && rows.tuitionStatusInput(f) === null, `${c.key}: unresolved - no figure is shown`);
      continue;
    }
    ok(f.state === 'ready', `${c.key}: the list has figures`);
    ok(f.payable === b.carry.payable, `${c.key}: Payable is the function's carry.payable`);
    // Each figure on the row is the function's own number, untouched.
    ok(f.charge === b.totalAmount && f.paid === b.payments.monthPayments && f.base === b.baseAmount && f.discount === b.totalDiscount, `${c.key}: charge, paid, base, discount are the function's`);
    const cin = rows.carriedIn(f), cout = rows.carriedOut(f);
    ok((cin.kind === 'owed' && cin.amount > 0 && cin.amount === b.carry.carryInDebt) || (cin.kind === 'credit' && cin.amount > 0 && cin.amount === b.carry.carryInCredit) || (cin.kind === 'none' && b.carry.carryInDebt === 0 && b.carry.carryInCredit === 0), `${c.key}: Prior Bal. is the function's carry-in`);
    ok((cout.kind === 'owed' && cout.amount > 0 && cout.amount === b.carry.carryOutDebt) || (cout.kind === 'credit' && cout.amount > 0 && cout.amount === b.carry.carryOutCredit) || (cout.kind === 'none' && b.carry.carryOutDebt === 0 && b.carry.carryOutCredit === 0), `${c.key}: Balance is the function's carry-out`);
    ok(statusOf(rows.tuitionStatusInput(f)) === row(c.key).calculator.status, `${c.key}: the status is judged on the function's figures`);
  }
  // The single calculator says the same: nothing of that bill is shown.
  const pending = rows.tuitionFigures(sw);
  ok(pending.state === 'pending' && pending.charge === null && rows.carriedOut(pending).kind === 'pending', 'an answer marked unresolved shows no figure');
  ok(rows.tuitionFigures({ studentId: id(1), error: true }).state === 'unavailable' && rows.tuitionFigures(undefined).state === 'unavailable', 'an error row or no answer shows no figure');
}

// --- the whole-school history in one request: past the row cap, the browser's sum is short.
{
  const many = Array.from({ length: 60 }, (_, i) => id(1000 + i));
  const months = Array.from({ length: 20 }, (_, i) => `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`).filter((m) => m < MONTH);
  source = { ...fixture, students: many.map((sid) => ({ id: sid, family_id: null, families: null })),
    enrollments: many.map((sid) => ({ student_id: sid, class_id: CLASS, start_date: '2025-01-01', end_date: null, allowed_days: null })),
    attendance: [], invoices: many.flatMap((sid) => months.map((month) => ({ student_id: sid, month, total_amount: 100000, recorded_payment: 0 }))) };
  ok(source.invoices.length === 1200, '60 students x 20 months = 1,200 invoice rows');
  const uncapped = await legacyBrowserRows(many, MONTH);
  ok([...uncapped.values()].every((r) => r.carryInDebt === 2000000), 'every row read: each student owes 2,000,000');
  rowCap = 1000;
  const capped = await legacyBrowserRows(many, MONTH);
  const short = [...capped.values()].filter((r) => r.carryInDebt !== 2000000).length;
  ok(short === 10, `at 1,000 rows per request the browser's sum is wrong for ${short} of 60 students (they read as owing nothing)`);
  const perStudent = await call('calculate-tuition', { studentId: many[59], month: MONTH });
  ok(perStudent.carry.carryInDebt === 2000000, 'calculate-tuition reads one student at a time and is not short');
  rowCap = Infinity; source = fixture;
}

if (process.env.T3_DUMP) {
  writeFileSync(process.env.T3_DUMP, JSON.stringify({ month: MONTH, fixture: { ...fixture, students: students.map(({ families, ...s }) => s), families: [{ id: FAMILY, name: 'Case family' }] }, bulk, table }, null, 1));
}
if (process.env.T3_TABLE) for (const t of table) console.log(JSON.stringify(t));
console.log(`${passed} passed, 0 failed`);
