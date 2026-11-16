// OVERPAYMENT independent review: executable probes. Not a suite in run.mjs;
// run by hand from the repo root:
//
//   node docs/evidence/OVERPAYMENT-review-probes.mjs
//
// It reuses the invoice-status harness AS IT IS (the real family-payment,
// smart-family-payment, delete-payment, calculate-tuition and confirm-tuition
// bundled; invoices a real pglite table carrying the real freeze, carry,
// audit and confirmation migrations): the harness part of
// scripts/pgtest/invoice-status.test.mjs - everything before its
// "T4 fault 1" section - is copied into a generated file next to this one,
// the probes below are appended, and the generated file is run and removed.
// The harness's own earlier sections run too; only the PROBE lines and the
// probe count at the end are this review's.
//
// Each probe prints PASS/FAIL and a PROBE line. pglite only; no live
// database, no network.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const suite = join(repo, 'scripts', 'pgtest', 'invoice-status.test.mjs');
const src = readFileSync(suite, 'utf8').replace(/\r\n/g, '\n');
const CUT = "console.log('\\nT4 fault 1 - deleting a payment takes it off the bill');";
const at = src.indexOf(CUT);
if (at < 0) { console.error('harness cut point not found'); process.exit(2); }
const harnessPart = src.slice(0, at)
  .replace("const here = dirname(fileURLToPath(import.meta.url));",
    `const here = ${JSON.stringify(join(repo, 'scripts', 'pgtest'))};`);

const probes = String.raw`
// ===================================================== review probes
pass = 0; fail = 0;
console.log('\n================ OVERPAYMENT review probes ================');
const S3 = '33333333-3333-4333-8333-333333333333';
const PAYX = { method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z' };
const CREDITX = { leftoverHandling: 'credit_next_bill' };
const probe = (id, value, what, extra) => { ok('PROBE ' + id + ' ' + what, value, extra); };
const txsOf = (pid) => {
  const ids = new Set((fixture.ledger_entries || []).filter((e) => String(e.tx_key || '').includes(pid) && !String(e.tx_key).startsWith('payment-reversal-')).map((e) => e.tx_id));
  return [...ids].map((id) => (fixture.ledger_entries || []).filter((e) => e.tx_id === id));
};
const sumDebit = (legs, acc) => legs.flat().filter((e) => acc.includes(e.account_id)).reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0);
const allocSum = (pid) => (fixture.payment_allocations || []).filter((a) => a.parent_payment_id === pid).reduce((s, a) => s + a.allocated_amount, 0);
const MONEY_T = ['payments', 'ledger_entries', 'payment_allocations', 'audit_log'];
const moneyW = () => memoryWrites.filter((w) => MONEY_T.includes(w.table));
let onceS3 = false;

/** A family of two (or three) children in Class A, each with four Present lessons in October (400,000 each). */
async function family2(opts = {}) {
  await withHistory();
  const kids = [[S2, 'Child Two', 'b']];
  if (opts.three) {
    if (!onceS3) { await db.query('INSERT INTO public.students VALUES ($1) ON CONFLICT DO NOTHING', [S3]); onceS3 = true; }
    kids.push([S3, 'Child Three', 'c']);
  }
  for (const [id, name, tag] of kids) {
    fixture.students.push({ id, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null }, full_name: name, is_active: true });
    fixture.enrollments.push({ ...fixture.enrollments[0], student_id: id });
    for (const s of fixture.sessions) fixture.attendance.push({ session_id: s.id, student_id: id, status: 'Present' });
    for (const code of ['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT', 'DISCOUNT']) fixture.ledger_accounts.push({ id: 'acc' + tag + '-' + code, student_id: id, code });
    await calc(id);
  }
}

// ---- P1 frozen bill: charged figures kept, payment and credit recorded as on any bill
for (const fn of ['family-payment', 'smart-family-payment']) {
  await withHistory();
  await db.query("UPDATE public.invoices SET base_amount = 400000, discount_amount = 50000, total_amount = 350000, tuition_frozen = true, frozen_reason = 'history corrected' WHERE student_id = $1 AND month = $2", [S1, MONTH]);
  await calc();
  const before = await bill();
  const body = fn === 'family-payment'
    ? { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, allocationMode: 'oldest-first', ...PAYX, ...CREDITX }
    : { familyId: FAMILY, amount: 500000, month: MONTH, ...PAYX, ...CREDITX };
  const r = await call(fn, body); await calc();
  const b = await bill();
  probe('P1 ' + fn, r.status === 200 && before.total_amount === 350000 && b.tuition_frozen === true
      && b.base_amount === 400000 && b.discount_amount === 50000 && b.total_amount === 350000
      && b.recorded_payment === 500000 && b.carry_out_credit === 150000 && b.status === 'paid' && T4.invoicePaidLabel(b) === 'paid',
    'frozen bill (saved total 350,000), 500,000 paid: charged figures unchanged, 500,000 recorded, 150,000 carry credit, paid', { r: r.body, b: money(b) });
  await seedBill(NOV, 400000, 0);
  const nov = await bill(S1, NOV);
  probe('P1b ' + fn, nov.carry_in_credit === 150000 && T4.monthPayable(nov) === 250000, '  next month payable falls by the extra (400,000 -> 250,000)', money(nov));
}

// ---- P2 confirmed bill: overpayment leaves it confirmed and its charged figures alone
for (const fn of ['family-payment', 'smart-family-payment']) {
  await withHistory();
  const c = await confirm([(await bill()).id]);
  const before = await bill();
  const body = fn === 'family-payment'
    ? { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, allocationMode: 'oldest-first', ...PAYX, ...CREDITX }
    : { familyId: FAMILY, amount: 500000, month: MONTH, ...PAYX, ...CREDITX };
  const r = await call(fn, body); await calc(); await calc();
  const b = await bill();
  probe('P2 ' + fn, c.status === 200 && before.confirmation_status === 'confirmed' && r.status === 200
      && b.confirmation_status === 'confirmed' && !changedFlag(b)
      && b.base_amount === before.base_amount && b.discount_amount === before.discount_amount && b.total_amount === before.total_amount
      && b.recorded_payment === 500000 && b.carry_out_credit === 100000 && b.status === 'paid',
    'confirmed bill, 500,000 against 400,000: stays confirmed, no changed_after_confirmation flag, charged figures unchanged, 100,000 credit', { before: brief(before), after: brief(b), m: money(b) });
}
// next month's bill already confirmed: only its carry moves
{
  await withHistory();
  await seedBill(NOV, 400000, 0);
  await db.query("UPDATE public.invoices SET confirmation_status = 'confirmed' WHERE student_id = $1 AND month = $2", [S1, NOV]);
  const before = await bill(S1, NOV);
  const r = await call('smart-family-payment', { familyId: FAMILY, amount: 500000, month: MONTH, ...PAYX, ...CREDITX });
  const nov = await bill(S1, NOV);
  probe('P2c', r.status === 200 && nov.confirmation_status === 'confirmed' && nov.total_amount === before.total_amount
      && nov.base_amount === before.base_amount && nov.carry_in_credit === 100000 && T4.monthPayable(nov) === 300000,
    "a CONFIRMED next-month bill: still confirmed, its charge unchanged, carry-in credit 100,000, payable 300,000", { before: money(before), nov: money(nov), cs: nov.confirmation_status });
}

// ---- P3 two children, pro-rata, with an extra; and the same as oldest-first; and manual
for (const mode of ['pro-rata', 'oldest-first']) {
  await family2();
  const r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S2, S1], amount: 1000000, allocationMode: mode, ...PAYX, ...CREDITX });
  await calc(S1); await calc(S2);
  const b1 = await bill(S1), b2 = await bill(S2);
  const [p] = familyPayments();
  const legs = txsOf(p?.id);
  probe('P3 ' + mode, r.status === 200 && b2.recorded_payment === 600000 && b2.carry_out_credit === 200000 && b2.status === 'paid'
      && b1.recorded_payment === 400000 && b1.carry_out_credit === 0 && b1.status === 'paid'
      && p.amount === 1000000 && allocSum(p.id) === 1000000 && legs.length === 2
      && sumDebit(legs, ['acc-CASH', 'accb-CASH', 'acc-BANK', 'accb-BANK']) === 1000000 && legs.every((l) => l.reduce((s, e) => s + e.debit - e.credit, 0) === 0)
      && same(r.body.creditOnBill, { studentId: S2, month: MONTH, amount: 200000 }),
    'two children owing 400,000 each, 1,000,000 ' + mode + ': first selected (Child Two) 600,000 / credit 200,000, Child One 400,000; payment = allocations = cash/bank debits = 1,000,000; each pair balanced',
    { r: r.body, b1: money(b1), b2: money(b2), alloc: allocSum(p?.id), legs: legs.length });
  // delete it: both bills back, credit gone, all four legs reversed
  const d = await delPay(p?.id);
  const a1 = await bill(S1), a2 = await bill(S2);
  const rev = reversalOf(p?.id);
  probe('P3d ' + mode, d.status === 200 && a1.recorded_payment === 0 && a2.recorded_payment === 0 && a2.carry_out_credit === 0
      && rev.length === 4 && balances(rev),
    '  deleted: both bills back to 0 recorded, the credit gone, 4 legs reversed, balanced', { d: d.body, a1: money(a1), a2: money(a2), rev: rev.length });
}
{
  await family2();
  const r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2], amount: 900000, allocationMode: 'manual',
    manualAllocations: [{ studentId: S1, amount: 0 }, { studentId: S2, amount: 450000 }], ...PAYX, ...CREDITX });
  await calc(S1); await calc(S2);
  const b1 = await bill(S1), b2 = await bill(S2);
  const [p] = familyPayments();
  probe('P3m manual', r.status === 200 && b2.recorded_payment === 450000 && b2.carry_out_credit === 50000
      && b1.recorded_payment === 450000 && b1.carry_out_credit === 50000 && allocSum(p.id) === 900000,
    'manual 0 / 450,000 of 900,000: the 450,000 not split out goes on the first selected (Child One): both 450,000, 50,000 credit each', { r: r.body, b1: money(b1), b2: money(b2) });
  probe('P3m-wording', r.body.creditOnBill?.amount === 50000 && r.body.leftoverAmount === 450000,
    '  (FIXED N2) the response reports 450,000 not split out and only 50,000 of it as credit', r.body);
}

// ---- P4 smart, two children: the extra goes to the highest-debt child, as the screen says
{
  await family2();
  await editRecorded(MONTH, 300000);      // Child One now owes 100,000; Child Two 400,000 -> Child Two listed first
  await calc(S1);
  const r = await call('smart-family-payment', { familyId: FAMILY, amount: 700000, month: MONTH, ...PAYX, ...CREDITX });
  await calc(S1); await calc(S2);
  const b1 = await bill(S1), b2 = await bill(S2);
  const [p] = familyPayments();
  probe('P4', r.status === 200 && r.body.leftover?.studentId === S2 && r.body.leftover?.amount === 200000
      && b2.recorded_payment === 600000 && b2.carry_out_credit === 200000 && b1.recorded_payment === 400000 && b1.carry_out_credit === 0
      && allocSum(p.id) === 700000,
    'smart, owes 100,000 + 400,000, pays 700,000: Child Two (highest debt, listed first) gets the 200,000 extra as credit', { r: r.body.leftover, b1: money(b1), b2: money(b2) });
}

// ---- P5 pro-rata rounding remainder (three children) - 1 VND "left over" while the bills still owe
{
  await family2({ three: true });
  const r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2, S3], amount: 1000000, allocationMode: 'pro-rata', ...PAYX, ...CREDITX });
  const b1 = await bill(S1), b2 = await bill(S2), b3 = await bill(S3);
  probe('P5a', r.status === 200 && b1.recorded_payment + b2.recorded_payment + b3.recorded_payment === 1000000 && b1.carry_out_credit === 0,
    'pro-rata 1,000,000 over three children owing 400,000 each: all 1,000,000 on bills, no credit (money right)', { r: r.body, b: [money(b1), money(b2), money(b3)] });
  probe('P5b', r.body.leftoverAmount === 0 && r.body.creditOnBill === null,
    '  (FIXED N1) nothing reported as left over or as credit: the rounding remainder went to a bill that still owes', r.body);
  await family2({ three: true });
  memoryWrites = [];
  const r2 = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2, S3], amount: 1000000, allocationMode: 'pro-rata', ...PAYX, leftoverHandling: 'unapplied_cash' });
  probe('P5c', r2.status === 200,
    '  (FIXED N1) an old tab (unapplied_cash) paying 1,000,000 pro-rata, LESS than owed, pays', r2.body);
}

// ---- P6 deleting a payment made BEFORE the change (allocation + unapplied-cash pair)
for (const [alloc, credit] of [['smart-family', 'smart-family-credit'], ['family-payment', 'family-credit']]) {
  await withHistory();
  const OLDP = '77777777-7777-4777-8777-777777777777';
  fixture.payments.push({ id: OLDP, student_id: S1, amount: 500000, method: 'Cash', family_id: FAMILY, parent_payment_id: null });
  fixture.payment_allocations = [{ parent_payment_id: OLDP, student_id: S1, allocated_amount: 400000, allocation_order: 1 }];
  fixture.ledger_entries.push(
    { id: 'o1', tx_id: 'tx-oa', tx_key: alloc + '-' + OLDP + '-' + S1 + '-1', account_id: 'acc-CASH', debit: 400000, credit: 0, month: MONTH },
    { id: 'o2', tx_id: 'tx-oa', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 400000, month: MONTH },
    { id: 'o3', tx_id: 'tx-ol', tx_key: credit + '-' + OLDP + '-1', account_id: 'acc-AR', debit: 100000, credit: 0, month: MONTH },
    { id: 'o4', tx_id: 'tx-ol', tx_key: null, account_id: 'acc-CREDIT', debit: 0, credit: 100000, month: MONTH });
  await editRecorded(MONTH, 400000); await calc();
  const d = await delPay(OLDP);
  const b = await bill();
  const rev = reversalOf(OLDP);
  probe('P6 ' + credit, d.status === 200 && b.recorded_payment === 0 && rev.length === 4 && balances(rev)
      && rev.some((e) => e.account_id === 'acc-CREDIT' && e.debit === 100000) && rev.some((e) => e.account_id === 'acc-CASH' && e.credit === 400000),
    'an OLD payment (400,000 allocation + 100,000 ' + credit + ' pair) deleted: 400,000 off the bill, all 4 legs reversed incl. the CREDIT leg, balanced', { d: d.body, b: money(b), rev });
}

// ---- P7 refusals before any write; the old value with no extra (smart); month required
{
  await withHistory();
  memoryWrites = []; invoiceWrites = [];
  const r = await call('smart-family-payment', { familyId: FAMILY, amount: 400000, month: MONTH, ...PAYX, leftoverHandling: 'unapplied_cash' });
  probe('P7a', r.status === 200 && (await bill()).recorded_payment === 400000 && !(fixture.ledger_entries || []).some((e) => /credit-/.test(String(e.tx_key || ''))),
    'smart, old tab value unapplied_cash with NO extra: pays as before', r.body);
  await withHistory(); memoryWrites = []; invoiceWrites = [];
  const r2 = await call('family-payment', { familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, allocationMode: 'oldest-first', ...PAYX, ...CREDITX });
  const r3 = await call('smart-family-payment', { familyId: FAMILY, amount: 500000, ...PAYX, ...CREDITX });
  probe('P7b', r2.status === 400 && r3.status === 400 && moneyW().length === 0 && invoiceWrites.length === 0,
    'no payment month: both functions refuse, nothing written', { r2: r2.body, r3: r3.body });
  await withHistory(); memoryWrites = []; invoiceWrites = [];
  const r4 = await call('smart-family-payment', { familyId: FAMILY, amount: 500000, month: MONTH, ...PAYX, leftoverHandling: 'voluntary_contribution' });
  probe('P7c', r4.status === 400 && /Voluntary contributions have been removed/.test(r4.body.error) && moneyW().length === 0 && invoiceWrites.length === 0,
    'voluntary_contribution: 400 before any read or write (audit row included)', r4.body);
}

// ---- P8 an extra on a month whose bill is paid already, then deleted: the next month's carry returns
{
  await withHistory();
  await seedBill(NOV, 400000, 0);
  const r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, allocationMode: 'oldest-first', ...PAYX, ...CREDITX });
  const [p] = familyPayments();
  const mid = await bill(S1, NOV);
  const d = await delPay(p?.id);
  const nov = await bill(S1, NOV);
  probe('P8', r.status === 200 && mid.carry_in_credit === 100000 && d.status === 200 && nov.carry_in_credit === 0 && nov.carry_in_debt === 400000 && T4.monthPayable(nov) === 800000,
    'delete a payment with an extra: November carry-in credit 100,000 -> 0 (October is owed again: carry-in debt 400,000)', { mid: money(mid), nov: money(nov), d: d.body });
}

// ---- P9 (pre-existing, not this change) family-payment compares method === 'cash'; the screen sends 'Cash'
{
  await withHistory();
  const r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, allocationMode: 'oldest-first', ...PAYX, ...CREDITX });
  const [p] = familyPayments();
  const legs = txsOf(p?.id).flat();
  probe('P9', r.status === 200 && legs.some((e) => e.account_id === 'acc-CASH' && e.debit === 500000) && !legs.some((e) => e.account_id === 'acc-BANK'),
    "(FIXED N5) family-payment with method 'Cash' (what FamilyPaymentModal sends) debits CASH", legs.map((e) => e.account_id));
}

await db.close();
console.log('\nPROBES: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
`;

const gen = join(here, `.overpay-probes-gen-${process.pid}.mjs`);
writeFileSync(gen, harnessPart + probes);
const migs = ['20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql', '20261009120000_keep_invoice_carry_balances_correct.sql',
  '20261009130000_audit_every_admin_action.sql', '20261106120000_invoice_tuition_freeze.sql']
  .map((f) => join(repo, 'supabase', 'migrations', f));
let res;
try {
  res = spawnSync(process.execPath, [gen, ...migs], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  unlinkSync(gen);
}
// stdout only: the functions' console.error noise goes to stderr.
const text = res.stdout || '';
const at2 = text.indexOf('================ OVERPAYMENT review probes');
console.log(at2 >= 0 ? text.slice(at2) : text.slice(-6000));
process.exit(res.status ?? 1);
