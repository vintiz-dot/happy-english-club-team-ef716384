// Which month a payment is probably FOR: the oldest month a child (or a
// family) still owes. The payment screens SUGGEST it; the admin still
// confirms the month by hand (useTuitionMonthConfirmation never confirms on
// its own).
//
// Why (docs/TUITION_AUDIT_ROLLOUT.md, pattern D): a family pays February's
// debt in March, the screen is showing March, and the cash goes on the March
// bill. The year adds up, every month is wrong. Defaulting to the receipt
// date makes that worse, so the screen points at the month still owing.
//
// Money rules, the same as everywhere else:
//   - what a month still owes after its own payment is the calculator's
//     payable minus that month's `recorded_payment`; the trigger keeps
//     exactly that as `carry_out_debt` (refresh_invoice_carry), so a bill
//     without a `payable` reads `carry_out_debt`;
//   - `paid_amount` is cumulative across months and is never read here;
//   - nothing is priced: this only compares figures already saved.
//
// How a debt is placed on a month: a month's recorded payment pays that
// month first, and only what it pays beyond the month's own charge reduces
// what older months owe (that is what "recorded_payment is the month's
// payment" means). So what is still owed for months up to M is the LOWEST
// balance at any month from M on: if the balance ever came down to X after
// M, no more than X of the older debt can still be there. The month a debt
// belongs to is where that running lowest balance rises.
//
// Pure, no imports: tested by scripts/pgtest/owing-month.test.mjs.

export interface OwingBill {
  /** YYYY-MM */
  month: string;
  /** The month's own payment. */
  recorded_payment?: number | null;
  /** Trigger-maintained balance after the month (payable - recorded_payment, never < 0). */
  carry_out_debt?: number | null;
  /** The calculator's carry.payable, when the screen has it. Wins over carry_out_debt. */
  payable?: number | null;
}

export interface OwingMonth {
  month: string;
  /** Still owed for that month, whole dong, > 0. */
  amount: number;
}

export interface FamilyOwingMonth extends OwingMonth {
  /** Each child who owes for that month, and how much. */
  children: { studentId: string; amount: number }[];
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** What is left owing after this bill's month, never below 0. */
export function balanceAfter(bill: OwingBill): number {
  if (typeof bill.payable === "number" && Number.isFinite(bill.payable)) {
    return Math.max(0, bill.payable - num(bill.recorded_payment));
  }
  return Math.max(0, num(bill.carry_out_debt));
}

/** Every month that still owes something, oldest first. */
export function owingMonths(bills: readonly OwingBill[] | null | undefined): OwingMonth[] {
  const byMonth = new Map<string, OwingBill>();
  for (const b of bills ?? []) if (b && MONTH_RE.test(b.month)) byMonth.set(b.month, b);
  const sorted = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  // lowest balance from each month to the latest bill
  const lowest: number[] = new Array(sorted.length);
  let low = Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    low = Math.min(low, balanceAfter(sorted[i]));
    lowest[i] = low;
  }
  const out: OwingMonth[] = [];
  let before = 0;
  for (let i = 0; i < sorted.length; i++) {
    const amount = Math.round(lowest[i] - before);
    if (amount > 0) out.push({ month: sorted[i].month, amount });
    before = lowest[i];
  }
  return out;
}

/** The oldest month a child still owes, or null when nothing is owed. */
export function oldestOwingMonth(bills: readonly OwingBill[] | null | undefined): OwingMonth | null {
  return owingMonths(bills)[0] ?? null;
}

/** The oldest month any child of the family still owes, summed over the children who owe it. */
export function familyOldestOwingMonth(
  billsByChild: Record<string, readonly OwingBill[] | null | undefined>,
): FamilyOwingMonth | null {
  const perChild = Object.entries(billsByChild).map(([studentId, bills]) => ({ studentId, months: owingMonths(bills) }));
  const months = perChild.flatMap((c) => c.months.map((m) => m.month)).sort();
  const oldest = months[0];
  if (!oldest) return null;
  const children = perChild
    .map((c) => ({ studentId: c.studentId, amount: c.months.find((m) => m.month === oldest)?.amount ?? 0 }))
    .filter((c) => c.amount > 0);
  return { month: oldest, amount: children.reduce((s, c) => s + c.amount, 0), children };
}

/** The suggestion only when it is a month BEFORE the one on the screen. */
export function earlierOwing<T extends OwingMonth>(owing: T | null | undefined, month: string): T | null {
  if (!owing || !MONTH_RE.test(month)) return null;
  return owing.month < month ? owing : null;
}

/** "1.260.000 ₫" */
export function formatOwed(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")} ₫`;
}

/** The one line the payment screens show. */
export function owingMonthLine(owing: OwingMonth): string {
  return `Still owes ${formatOwed(owing.amount)} for ${owing.month}. Is this payment for that month?`;
}

/** The row note on one-month lists (QuickPay, Batch) where the month cannot be changed per row. */
export function owingRowNote(owing: OwingMonth): string {
  return `Still owes ${formatOwed(owing.amount)} for ${owing.month}. Cash for that month: switch the tuition month to ${owing.month} and record it there.`;
}
