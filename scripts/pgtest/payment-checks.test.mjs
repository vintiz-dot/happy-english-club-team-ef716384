// The early-warning checks behind Finance > Recorded and Reports > Executive
// (src/lib/finance/paymentChecks.ts).
//
// What this guards: the Recorded screen used to flag "Mismatch" whenever a
// bill's recorded_payment differed from cumulative paid_amount, so nearly
// every family with history was red, and showed the stored status instead of
// the one rule. A clean month must report nothing; each real fault exactly once.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'payment-checks-'));
const out = join(dir, 'payment-checks.mjs');
await build({ entryPoints: [resolve('src/lib/finance/paymentChecks.ts')], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent' });
const { runPaymentChecks, monthTotals, keyIds, monthOf } = await import(pathToFileURL(out).href);

let passed = 0;
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); passed++; };

const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const P2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GONE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = '2026-11-23T05:00:00Z';

const bill = (o) => ({ id: `b-${o.student_id}`, month: '2026-11', base_amount: 1000000, total_amount: 1000000, carry_in_debt: 0, carry_in_credit: 0, recorded_payment: 0, status: 'issued', ...o });
const clean = () => ({
  month: '2026-11',
  bills: [
    // paid_amount is cumulative and far above the month: must not matter.
    bill({ student_id: S1, recorded_payment: 1000000, status: 'paid', paid_amount: 9000000 }),
    bill({ student_id: S2, recorded_payment: 0, status: 'issued' }),
  ],
  billAmounts: [{ payment_id: P1, source: 'receipt', student_id: S1, month: '2026-11', amount: 1000000 }],
  payments: [{ id: P1, student_id: S1, amount: 1000000, method: 'Cash', occurred_at: '2026-11-05T03:00:00Z', source: 'receipt' }],
  cashLegs: [{ tx_key: `record-payment-${P1}-${S1}`, month: '2026-11', debit: 1000000, credit: 0 }],
  knownPaymentIds: new Set([P1]),
  gaps: [],
  now: NOW,
});
const kinds = (r) => r.findings.map((f) => f.kind).sort();

{
  const r = runPaymentChecks(clean());
  eq(r.findings, [], 'a clean month reports nothing, whatever paid_amount says');
  eq(r.unavailable, [], 'every check ran');
}
{
  const i = clean();
  i.bills[0].recorded_payment = 1200000;
  i.bills[0].status = 'paid';
  const r = runPaymentChecks(i);
  eq(kinds(r), ['bill_unexplained', 'overpaid'], 'a bill above its payments is unexplained (and over payable)');
  eq(r.findings.find((f) => f.kind === 'bill_unexplained').amount, 200000, 'the gap is the unexplained part');
  eq(r.findings[0].kind, 'bill_unexplained', 'errors sort first');
}
{
  const i = clean();
  i.bills[1].status = 'paid';
  eq(kinds(runPaymentChecks(i)), ['label_wrong'], 'a stored label that disagrees with the rule is listed');
  i.bills[1].status = 'credit';
  eq(kinds(runPaymentChecks(i)), [], "an admin's credit label is never listed");
}
{
  const i = clean();
  i.bills[0].carry_in_credit = 1000000; // credit covers the month; money paid as well
  i.bills[0].status = 'paid';
  const r = runPaymentChecks(i);
  eq(kinds(r), ['overpaid'], 'money on top of a covering credit is a note');
  eq(r.findings[0].severity, 'note', 'overpaid is a note, not an error');
}
{
  const i = clean();
  i.bills[0].base_amount = 0; i.bills[0].total_amount = 0;
  eq(kinds(runPaymentChecks(i)), ['paid_no_charge'], 'money on a month with no charge');
}
{
  const i = clean();
  i.cashLegs = [];
  eq(kinds(runPaymentChecks(i)), ['receipt_no_legs'], 'a receipt with no cash leg');
  i.cashLegs = [{ tx_key: `record-payment-${P1}-${S1}`, month: '2026-11', debit: 900000, credit: 0 }];
  eq(kinds(runPaymentChecks(i)), ['receipt_cash_off'], 'a receipt whose cash leg differs');
}
{
  const i = clean();
  i.cashLegs.push({ tx_key: `family-payment-${S2}-${GONE}-1761320568230`, month: '2026-11', debit: 1323000, credit: 0 });
  let r = runPaymentChecks(i);
  eq(kinds(r), ['orphan_legs'], 'a cash leg of a deleted payment, never reversed');
  eq(r.findings[0].amount, 1323000, 'with its amount');
  i.cashLegs.push({ tx_key: `reversal-family-payment-${S2}-${GONE}-1761320568230`, month: '2026-11', debit: 0, credit: 1323000 });
  eq(kinds(runPaymentChecks(i)), [], 'a reversed deletion nets to 0 and is not listed');
}
{
  const i = clean();
  i.payments.push({ id: P2, student_id: S1, amount: 1000000, method: 'cash', occurred_at: '2026-11-05T03:10:00Z', source: 'receipt' });
  i.cashLegs.push({ tx_key: `record-payment-${P2}-${S1}`, month: '2026-11', debit: 1000000, credit: 0 });
  i.knownPaymentIds.add(P2);
  eq(kinds(runPaymentChecks(i)), ['possible_duplicate'], 'two equal receipts ten minutes apart');
  i.payments[1].occurred_at = '2026-11-05T05:00:00Z';
  eq(kinds(runPaymentChecks(i)), [], 'two hours apart is not a duplicate');
}
{
  const i = clean();
  i.payments[0].occurred_at = '2026-11-28T03:00:00Z';
  eq(kinds(runPaymentChecks(i)), ['future_dated'], 'a receipt dated after today');
}
{
  const i = clean();
  i.gaps = [{ student_id: S2, problem: 'differs', expected_base: 1200000, saved_base: 1000000 }];
  eq(kinds(runPaymentChecks(i)), ['register_gap'], 'a register gap');
}
{
  const i = clean();
  i.billAmounts = null; i.gaps = null; i.cashLegs = null;
  const r = runPaymentChecks(i);
  eq(r.findings.filter((f) => f.severity === 'error'), [], 'missing sources raise nothing...');
  eq(r.unavailable.includes('bill_unexplained') && r.unavailable.includes('register_gap') && r.unavailable.includes('orphan_legs'), true, '...and say which checks did not run');
}
{
  const i = clean();
  i.payments.push({ id: P2, student_id: S2, amount: 500000, method: 'historical', occurred_at: '2026-10-31T00:00:00Z', source: 'historical', month: '2026-11' });
  i.bills[1].carry_in_debt = 200000;
  const t = monthTotals(i.bills, i.payments, '2026-11');
  eq([t.recorded, t.charged, t.payable, t.outstanding, t.cash, t.bank, t.openingBalances], [1000000, 2000000, 2200000, 1200000, 1000000, 0, 500000], 'month totals');
  eq(t.byLabel, { paid: 1, partial: 0, issued: 1, credit: 0 }, 'labels by the rule');
}
eq(keyIds(`family-payment-${S2.toUpperCase()}-${GONE}-1`), [S2, GONE], 'every id in a key, lower-cased');
eq(monthOf('2026-10-31T18:30:00Z'), '2026-11', 'a payment at 01:30 Hanoi on the 1st is in the new month');

console.log(`payment-checks: ${passed} assertions passed`);
