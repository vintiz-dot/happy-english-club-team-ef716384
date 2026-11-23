/**
 * Early-warning checks on a month's money. Pure: the screens fetch the rows
 * (src/hooks/usePaymentChecks.ts) and render what this returns; nothing here
 * prices anything or writes anything.
 *
 * What each check compares, and why it is the right comparison:
 *
 *   bill_unexplained   invoices.recorded_payment against the sum of what the
 *                      payments rows put on that bill (public.payment_bill_amounts:
 *                      a receipt's AR legs, or a historical opening balance).
 *                      Every write of recorded_payment goes through
 *                      record_admin_payment or the family paths, which write
 *                      both, so any gap is money nobody can trace.
 *   label_wrong        the stored invoices.status against the ONE rule
 *                      (invoicePaidLabel, src/lib/invoiceStatus.ts). An admin's
 *                      'credit' is never listed. It used to be compared with
 *                      cumulative paid_amount, which flagged most families.
 *   paid_no_charge     money recorded on a month that charged nothing.
 *   overpaid           the month received more than its payable. Often a
 *                      family paying ahead - a note, not an error.
 *   register_gap       public.tuition_bill_gaps: no bill, a bill of 0, or a
 *                      base that disagrees with the register.
 *   receipt_no_legs    a receipt with no cash / bank ledger leg keyed to it.
 *   receipt_cash_off   a receipt whose cash + bank legs net to something other
 *                      than its amount (all 30 receipts matched on 23 Nov 2026).
 *   orphan_legs        cash / bank legs keyed to a payment that no longer
 *                      exists and were never reversed (net not 0): money in
 *                      the ledger with no payment behind it.
 *   possible_duplicate two receipts for one child, same amount and method,
 *                      within 30 minutes.
 *   future_dated       a receipt dated after today.
 *
 * Never compare paid_amount with one month's charge (AGENTS.md "Bill status
 * labels"); it is cumulative. This file does not read it.
 */
import { invoicePaidLabel, monthCharged, monthPayable } from "../invoiceStatus";
import { formatVND } from "../money";

export type Severity = "error" | "warning" | "note";

export type CheckKind =
  | "bill_unexplained"
  | "label_wrong"
  | "paid_no_charge"
  | "overpaid"
  | "register_gap"
  | "receipt_no_legs"
  | "receipt_cash_off"
  | "orphan_legs"
  | "possible_duplicate"
  | "future_dated";

export const CHECK_INFO: Record<CheckKind, { severity: Severity; title: string }> = {
  bill_unexplained: { severity: "error", title: "Bill and payments disagree" },
  orphan_legs: { severity: "error", title: "Ledger money with no payment" },
  receipt_no_legs: { severity: "error", title: "Payment missing from the ledger" },
  receipt_cash_off: { severity: "error", title: "Payment and ledger amounts differ" },
  register_gap: { severity: "warning", title: "Bill does not match the register" },
  possible_duplicate: { severity: "warning", title: "Possible double entry" },
  future_dated: { severity: "warning", title: "Payment dated in the future" },
  label_wrong: { severity: "warning", title: "Status label is out of date" },
  paid_no_charge: { severity: "warning", title: "Paid on a month with no charge" },
  overpaid: { severity: "note", title: "Paid more than owed" },
};

export const SEVERITY_ORDER: Severity[] = ["error", "warning", "note"];

export interface CheckBill {
  id: string;
  student_id: string;
  month: string;
  base_amount?: number | null;
  total_amount?: number | null;
  carry_in_debt?: number | null;
  carry_in_credit?: number | null;
  recorded_payment?: number | null;
  status?: string | null;
}

/** One row of public.payment_bill_amounts. */
export interface BillAmountRow {
  payment_id: string;
  source: string;
  student_id: string;
  month: string;
  amount: number;
}

export interface CheckPayment {
  id: string;
  student_id: string;
  amount: number;
  method: string;
  occurred_at: string;
  source: string;
  /** Set on historical rows only: the bill month the opening balance belongs to. */
  month?: string | null;
}

/** A cash or bank ledger leg that carries a key. */
export interface CashLeg {
  tx_key: string;
  month: string;
  debit: number;
  credit: number;
}

export interface RegisterGap {
  student_id: string;
  problem: "missing" | "zero" | "differs";
  expected_base: number;
  saved_base: number | null;
}

export interface Finding {
  kind: CheckKind;
  severity: Severity;
  studentId: string | null;
  billId: string | null;
  paymentId: string | null;
  /** The money the finding is about, in dong (the gap, the extra, the leg). */
  amount: number;
  detail: string;
}

export interface CheckInput {
  month: string;
  bills: CheckBill[];
  billAmounts: BillAmountRow[] | null;
  /** Every receipt and historical row that touches this month (by date or by bill). */
  payments: CheckPayment[] | null;
  /** Every keyed cash / bank leg (the whole ledger: it is small). */
  cashLegs: CashLeg[] | null;
  /** Payment ids that exist, for the legs' keys (may be wider than `payments`). */
  knownPaymentIds: Set<string> | null;
  gaps: RegisterGap[] | null;
  /** Now, as an ISO instant (passed in so the result is reproducible). */
  now: string;
}

export interface CheckResult {
  findings: Finding[];
  /** Checks that could not run because their rows did not load. */
  unavailable: CheckKind[];
  /** Of `unavailable`, the checks whose database function is not installed yet (set by the loader). */
  notInstalled?: CheckKind[];
  counts: Record<Severity, number>;
}

const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Every uuid in a ledger key (family-payment keys carry two). */
export function keyIds(txKey: string): string[] {
  return (txKey.match(UUID) ?? []).map((s) => s.toLowerCase());
}

const vnd = (x: number) => formatVND(x);

/** The Hanoi calendar month of an instant (UTC+7 all year, no daylight saving). */
export const monthOf = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 7 * 3600 * 1000).toISOString().slice(0, 7) : iso.slice(0, 7);
};

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

/**
 * The cash / bank legs, netted per payment that exists, and per key of a
 * payment that does not. Keys of a missing payment are grouped by their FIRST
 * id, which is the payment in every writer's key (record-payment-<p>-<s>,
 * family-payment-<p>-<s>-<ts>, smart-family-<p>-..., and delete-payment's
 * reversal payment-reversal-<p>-<entry>), so a reversal cancels the original.
 */
export function ledgerByPayment(cashLegs: CashLeg[], knownPaymentIds: Set<string>) {
  const legsByPayment = new Map<string, { net: number; count: number }>();
  const orphan = new Map<string, { net: number; month: string; key: string }>();
  for (const leg of cashLegs) {
    const ids = keyIds(leg.tx_key);
    const net = n(leg.debit) - n(leg.credit);
    const hit = ids.find((id) => knownPaymentIds.has(id));
    if (hit) {
      const cur = legsByPayment.get(hit) ?? { net: 0, count: 0 };
      legsByPayment.set(hit, { net: cur.net + net, count: cur.count + 1 });
    } else if (ids.length) {
      const k = ids[0];
      const cur = orphan.get(k) ?? { net: 0, month: leg.month, key: leg.tx_key };
      orphan.set(k, { ...cur, net: cur.net + net });
    }
  }
  return { legsByPayment, orphan };
}

export function runPaymentChecks(input: CheckInput): CheckResult {
  const findings: Finding[] = [];
  const unavailable: CheckKind[] = [];
  const push = (f: Omit<Finding, "severity">) => findings.push({ ...f, severity: CHECK_INFO[f.kind].severity });

  // ---- per bill -----------------------------------------------------------
  const explained = new Map<string, number>();
  if (input.billAmounts) {
    for (const r of input.billAmounts) {
      if (r.month !== input.month) continue;
      explained.set(r.student_id, (explained.get(r.student_id) ?? 0) + n(r.amount));
    }
  } else {
    unavailable.push("bill_unexplained");
  }

  for (const b of input.bills) {
    const recorded = n(b.recorded_payment);
    const payable = monthPayable(b);
    const charged = monthCharged(b);

    if (input.billAmounts) {
      const ex = explained.get(b.student_id) ?? 0;
      if (ex !== recorded) {
        push({
          kind: "bill_unexplained", studentId: b.student_id, billId: b.id, paymentId: null,
          amount: recorded - ex,
          detail: `The bill records ${vnd(recorded)}; its payments add up to ${vnd(ex)} (${recorded > ex ? "unexplained" : "missing"} ${vnd(Math.abs(recorded - ex))}).`,
        });
      }
    }

    const stored = String(b.status ?? "");
    if (stored !== "credit") {
      const rule = invoicePaidLabel(b);
      if (stored !== rule) {
        push({
          kind: "label_wrong", studentId: b.student_id, billId: b.id, paymentId: null, amount: 0,
          detail: `Saved as "${stored || "none"}"; by the month's money it is "${rule}".`,
        });
      }
    }

    if (recorded > 0 && charged === 0) {
      push({
        kind: "paid_no_charge", studentId: b.student_id, billId: b.id, paymentId: null, amount: recorded,
        detail: `${vnd(recorded)} recorded on a month that charged nothing.`,
      });
    } else if (recorded > 0 && payable >= 0 && recorded > payable) {
      push({
        kind: "overpaid", studentId: b.student_id, billId: b.id, paymentId: null, amount: recorded - payable,
        detail: `Received ${vnd(recorded)} against ${vnd(payable)} payable: ${vnd(recorded - payable)} carries forward as credit.`,
      });
    }
  }

  // ---- the register ---------------------------------------------------------
  if (input.gaps) {
    for (const g of input.gaps) {
      const label = g.problem === "missing" ? "No bill" : g.problem === "zero" ? "Bill is 0" : "Base differs";
      push({
        kind: "register_gap", studentId: g.student_id, billId: null, paymentId: null,
        amount: n(g.expected_base) - n(g.saved_base),
        detail: `${label}: the register expects ${vnd(n(g.expected_base))}${g.saved_base == null ? "" : `, the bill has ${vnd(n(g.saved_base))}`}.`,
      });
    }
  } else {
    unavailable.push("register_gap");
  }

  // ---- payments against the ledger -----------------------------------------
  if (input.payments && input.cashLegs && input.knownPaymentIds) {
    const { legsByPayment, orphan } = ledgerByPayment(input.cashLegs, input.knownPaymentIds);

    for (const [, o] of orphan) {
      if (o.net === 0 || o.month !== input.month) continue;
      // Which id in the key is the payment depends on the path that wrote
      // it, so the key itself is quoted for the person looking it up.
      push({
        kind: "orphan_legs", studentId: null, billId: null, paymentId: null, amount: o.net,
        detail: `${vnd(o.net)} sits in cash / bank for a payment that was deleted without a reversal (ledger key ${o.key}).`,
      });
    }

    const receipts = input.payments.filter((p) => p.source !== "historical");
    for (const p of receipts) {
      if (monthOf(p.occurred_at) !== input.month) continue;
      const legs = legsByPayment.get(p.id.toLowerCase());
      if (!legs) {
        push({
          kind: "receipt_no_legs", studentId: p.student_id, billId: null, paymentId: p.id, amount: n(p.amount),
          detail: `${vnd(n(p.amount))} by ${p.method} on ${p.occurred_at.slice(0, 10)} has no cash or bank ledger leg.`,
        });
      } else if (legs.net !== n(p.amount)) {
        push({
          kind: "receipt_cash_off", studentId: p.student_id, billId: null, paymentId: p.id, amount: n(p.amount) - legs.net,
          detail: `The payment is ${vnd(n(p.amount))}; its cash / bank legs net ${vnd(legs.net)}.`,
        });
      }
    }

    // Two of the same receipt, close together.
    const positive = receipts
      .filter((p) => n(p.amount) > 0 && monthOf(p.occurred_at) === input.month)
      .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    for (let i = 0; i < positive.length; i++) {
      for (let j = i + 1; j < positive.length; j++) {
        const a = positive[i], b = positive[j];
        const gap = Date.parse(b.occurred_at) - Date.parse(a.occurred_at);
        if (gap > DUPLICATE_WINDOW_MS) break;
        if (a.student_id === b.student_id && n(a.amount) === n(b.amount) && a.method.toLowerCase() === b.method.toLowerCase()) {
          push({
            kind: "possible_duplicate", studentId: b.student_id, billId: null, paymentId: b.id, amount: n(b.amount),
            detail: `${vnd(n(b.amount))} by ${b.method} was recorded twice within ${Math.max(1, Math.round(gap / 60000))} min.`,
          });
        }
      }
    }

    const nowMs = Date.parse(input.now);
    for (const p of receipts) {
      if (Date.parse(p.occurred_at) - nowMs > 24 * 3600 * 1000 && monthOf(p.occurred_at) === input.month) {
        push({
          kind: "future_dated", studentId: p.student_id, billId: null, paymentId: p.id, amount: n(p.amount),
          detail: `${vnd(n(p.amount))} is dated ${p.occurred_at.slice(0, 10)}, after today.`,
        });
      }
    }
  } else {
    unavailable.push("receipt_no_legs", "receipt_cash_off", "orphan_legs", "possible_duplicate", "future_dated");
  }

  const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
  findings.sort((a, b) => rank(a.severity) - rank(b.severity) || Math.abs(b.amount) - Math.abs(a.amount));
  const counts: Record<Severity, number> = { error: 0, warning: 0, note: 0 };
  for (const f of findings) counts[f.severity]++;
  return { findings, unavailable, counts };
}

/** A month's money in one line each: what the Recorded screen totals. */
export interface MonthTotals {
  bills: number;
  charged: number;
  payable: number;
  recorded: number;
  outstanding: number;
  creditAhead: number;
  byLabel: Record<"paid" | "partial" | "issued" | "credit", number>;
  /** Receipts dated in the month, split by the ledger account their method books to. */
  cash: number;
  bank: number;
  openingBalances: number;
}

export function monthTotals(bills: CheckBill[], payments: CheckPayment[] | null, month: string): MonthTotals {
  const t: MonthTotals = {
    bills: bills.length, charged: 0, payable: 0, recorded: 0, outstanding: 0, creditAhead: 0,
    byLabel: { paid: 0, partial: 0, issued: 0, credit: 0 }, cash: 0, bank: 0, openingBalances: 0,
  };
  for (const b of bills) {
    const payable = monthPayable(b);
    const recorded = n(b.recorded_payment);
    t.charged += n(b.total_amount);
    t.payable += payable;
    t.recorded += recorded;
    const left = payable - recorded;
    if (left > 0) t.outstanding += left;
    else t.creditAhead += -left;
    const label = String(b.status ?? "") === "credit" ? "credit" : invoicePaidLabel(b);
    t.byLabel[label]++;
  }
  for (const p of payments ?? []) {
    if (p.source === "historical") {
      if (p.month === month) t.openingBalances += n(p.amount);
      continue;
    }
    if (monthOf(p.occurred_at) !== month) continue;
    if (p.method.trim().toLowerCase() === "cash") t.cash += n(p.amount);
    else t.bank += n(p.amount);
  }
  return t;
}
