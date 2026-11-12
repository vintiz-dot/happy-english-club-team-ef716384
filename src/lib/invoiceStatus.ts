/*
 * BROWSER copy. Mirrors supabase/functions/_lib/invoice-status.ts byte for
 * byte below this comment (Deno cannot import from src/); change one, copy it
 * to the other - scripts/pgtest/mirrors.test.mjs fails when they differ.
 * The admin payment screens take the invoices.status label from here, never
 * from a rule of their own.
 */
// Which label columns calculate-tuition may write on a bill it is saving.
//
// calculate-tuition saves the bill every time anybody looks at it. It used
// to write confirmation_status = auto_approved | needs_review and
// status = 'issued' on each of those saves, so a bill an admin had
// confirmed, or a family had paid, lost that on the next page view - and
// the lesson-cancellation guard, which reads both columns to decide whether
// a bill is settled, was told it was not.
//
// This decides the labels only. It never touches a figure: the amounts in
// `figures` are the ones calculate-tuition already worked out, and they are
// saved as they are whatever this returns.
//
//   - no bill yet: issued, auto_approved | needs_review - as always;
//   - `status` is derived from the MONTH's own money by `paidLabel` below,
//     the one rule every writer of that column uses. It is written only
//     when it differs from what is stored, and an admin's 'credit' is
//     never replaced;
//   - a confirmed / adjusted bill whose charged figures are the same stays
//     as it is: confirmation_status is left out of the save;
//   - a confirmed / adjusted bill whose charged figures CHANGED goes to
//     needs_review with a flag holding what was confirmed and what it is
//     now. It is not left "confirmed" for figures nobody confirmed, and it
//     does not quietly become an ordinary unreviewed bill either;
//   - that flag stays until an admin confirms again (confirm-tuition).
//
// A key missing from the result is a column the save must not mention: the
// upsert only sets the columns it is given.

export const CHANGED_AFTER_CONFIRMATION = "changed_after_confirmation";

export interface ChargedFigures {
  base_amount: number;
  discount_amount: number;
  total_amount: number;
}

// ---------------------------------------------------------------- paid label
//
// ONE rule for invoices.status, for every writer of it: the edge functions
// (calculate-tuition, family-payment, smart-family-payment, settle-bill,
// delete-payment) through this file; the admin screens (RecordPaymentDialog,
// QuickPayPanel, BatchPaymentDialog, RecordedPaymentManager,
// PaymentIntegrityRepair, InvoiceStatusManager) through its mirror
// src/lib/invoiceStatus.ts; ai_action_apply / ai_action_undo through
// public.invoice_paid_label (migration 20261113090000), which states the
// same thing in SQL and is compared with this one by the test suite.
//
//   payable = this month's charge + debt carried in - credit carried in
//   paid     when recorded_payment >= payable, and the month charged
//            something (base or total > 0) or money was recorded in it
//   partial  when recorded_payment > 0 otherwise
//   issued   otherwise
//
// That is: nothing left to pay reads "paid". The one exception is a month
// that neither charged nor received anything (no lessons, nothing paid),
// which stays "issued" - there is nothing to call paid.
//
// `recorded_payment` is the money recorded IN that month. `paid_amount` is
// cumulative across months and must never be compared with one month's
// charge: for a family with history it is already larger than any single
// bill, so every part payment read as "paid".
//
// What follows from the rule, on purpose:
//   - debt carried in: the month is paid only when the payment covers the
//     debt as well as the month;
//   - credit carried in that covers the month: paid, with or without money
//     recorded in the month (before T4: issued / partial, which read to a
//     person as "still owes");
//   - a charge written off in full by Settle Bill, or discounted to 0: paid;
//   - a frozen bill: the same rule on its saved figures.
// The label is a label. Never branch on it for money.

export type PaidLabel = "paid" | "partial" | "issued";

const amount = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** What the month asks for: its own charge plus debt carried in, less credit carried in. */
export function monthPayable(row: {
  total_amount?: unknown;
  carry_in_debt?: unknown;
  carry_in_credit?: unknown;
}): number {
  return amount(row?.total_amount) + amount(row?.carry_in_debt) - amount(row?.carry_in_credit);
}

/**
 * @param recordedPayment the money recorded in the month
 * @param payable         monthPayable of the bill
 * @param charged         the month's charge before discounts (base_amount), or
 *                        its total - anything above 0 means "the month charged something"
 */
export function paidLabel(recordedPayment: unknown, payable: unknown, charged: unknown): PaidLabel {
  const recorded = amount(recordedPayment);
  const due = amount(payable);
  if (recorded >= due && (recorded > 0 || amount(charged) > 0)) return "paid";
  if (recorded > 0) return "partial";
  return "issued";
}

/** What a bill row charged, for paidLabel: base before discounts, or the total if that is larger. */
export function monthCharged(row: { base_amount?: unknown; total_amount?: unknown }): number {
  return Math.max(amount(row?.base_amount), amount(row?.total_amount));
}

type BillRow = {
  base_amount?: unknown;
  total_amount?: unknown;
  carry_in_debt?: unknown;
  carry_in_credit?: unknown;
  recorded_payment?: unknown;
  status?: unknown;
};

/** The label of a stored bill row, optionally with a different recorded payment (the one about to be saved). */
export function invoicePaidLabel(row: BillRow, recordedPayment: unknown = row?.recorded_payment): PaidLabel {
  return paidLabel(recordedPayment, monthPayable(row), monthCharged(row));
}

/**
 * The `status` a writer saves with a changed payment, or undefined when it
 * must leave the column alone: an admin's 'credit' is never replaced by a
 * payment path (calculate-tuition keeps it too, below).
 */
export function labelAfterPayment(row: BillRow, recordedPayment: unknown = row?.recorded_payment): PaidLabel | undefined {
  return labelForPayment(row?.status, recordedPayment, monthPayable(row), monthCharged(row));
}

/** The same, from figures a screen already holds (its payable is the calculator's carry.payable). */
export function labelForPayment(
  storedStatus: unknown,
  recordedPayment: unknown,
  payable: unknown,
  charged: unknown,
): PaidLabel | undefined {
  if (storedStatus === "credit") return undefined;
  return paidLabel(recordedPayment, payable, charged);
}

// ---------------------------------------------------------- settle bill
//
// A Settle Bill write-off (settlement_type 'discount') lowers what the month
// charges: both calculators add it as one more discount line, after every
// other discount, never below 0.
//
// Only write-offs posted by the T4 settle-bill count, and they are known by
// what that function writes, not by a date: their ledger transaction's key
// starts WRITE_OFF_KEY_PREFIX. The settle-bill before T4 keyed its write-offs
// 'settlement-discount-...', sized them from cumulative paid_amount and never
// put them on a bill; those stay ledger-only whenever they were made (owner's
// default: counting the four old ones would create credit on bills that
// show no debt). A date cutoff would also count any write-off the OLD
// function makes between the cutoff and the deploy.
export const WRITE_OFF_KEY_PREFIX = "settlement-writeoff-";
export const WRITE_OFF_NAME = "Settle Bill write-off";

/**
 * The month's write-off: the sum of its 'discount' settlements whose ledger
 * transaction carries the T4 key. This is the ONLY place that filter is
 * applied - the calculators read settlements and their ledger legs unfiltered.
 */
export function settledWriteOff(
  settlements: Array<{ settlement_type?: unknown; amount?: unknown; tx_id?: unknown }> | null | undefined,
  ledgerLegs: Array<{ tx_id?: unknown; tx_key?: unknown }> | null | undefined,
): number {
  const marked = new Set<string>();
  for (const leg of ledgerLegs ?? []) {
    if (String(leg?.tx_key ?? "").startsWith(WRITE_OFF_KEY_PREFIX)) marked.add(String(leg?.tx_id));
  }
  let sum = 0;
  for (const s of settlements ?? []) {
    if (s?.settlement_type !== "discount") continue;
    if (!marked.has(String(s?.tx_id))) continue;
    const a = amount(s?.amount);
    if (a > 0) sum += a;
  }
  return sum;
}

export interface InvoiceLabelFields {
  status?: PaidLabel;
  confirmation_status?: "auto_approved" | "needs_review";
  review_flags: any[];
}

const ADMIN_CONFIRMED = new Set(["confirmed", "adjusted"]);

function chargedOf(row: any): ChargedFigures {
  return {
    base_amount: Number(row?.base_amount ?? 0),
    discount_amount: Number(row?.discount_amount ?? 0),
    total_amount: Number(row?.total_amount ?? 0),
  };
}

function sameCharge(a: ChargedFigures, b: ChargedFigures): boolean {
  return a.base_amount === b.base_amount && a.discount_amount === b.discount_amount && a.total_amount === b.total_amount;
}

/**
 * @param existing      the stored bill for this student and month, or null when there is none
 * @param figures       the charged figures about to be saved
 * @param computedFlags the review flags calculate-tuition worked out for those figures
 * @param nowIso        when this calculation ran
 * @param paid          `paidLabel` for the month's recorded payment and payable, as this calculation read them
 */
export function invoiceLabelFields(
  existing: any | null,
  figures: ChargedFigures,
  computedFlags: any[],
  nowIso: string,
  paid: PaidLabel,
): InvoiceLabelFields {
  const fresh = computedFlags.length === 0 ? "auto_approved" : "needs_review";
  if (!existing) return { status: paid, confirmation_status: fresh, review_flags: computedFlags };

  const out: InvoiceLabelFields = { review_flags: computedFlags };
  // Written only when it would change the row: a calculation that agrees
  // with what is stored says nothing about `status`, so it cannot overwrite
  // a label a payment saved while this calculation was running. 'credit' is
  // set by an admin only and is not one of the three derived values.
  if (existing.status !== "credit" && existing.status !== paid) out.status = paid;

  const current = chargedOf(figures);
  const previous = existing.confirmation_status;
  if (ADMIN_CONFIRMED.has(previous)) {
    const confirmed = chargedOf(existing);
    if (sameCharge(confirmed, current)) return out; // stays confirmed / adjusted
    out.confirmation_status = "needs_review";
    out.review_flags = [
      ...computedFlags,
      {
        type: CHANGED_AFTER_CONFIRMATION,
        label: "Changed after confirmation",
        details: {
          previousStatus: previous,
          confirmedAt: existing.confirmed_at ?? null,
          confirmedBy: existing.confirmed_by ?? null,
          confirmed,
          current,
          difference: current.total_amount - confirmed.total_amount,
          changedAt: nowIso,
        },
      },
    ];
    return out;
  }

  const storedFlags: any[] = Array.isArray(existing.review_flags) ? existing.review_flags : [];
  const waiting = storedFlags.find((f) => f?.type === CHANGED_AFTER_CONFIRMATION);
  if (previous === "needs_review" && waiting) {
    // Still waiting for the admin: keep what was confirmed, follow the bill.
    const confirmedTotal = Number(waiting.details?.confirmed?.total_amount ?? 0);
    out.confirmation_status = "needs_review";
    out.review_flags = [
      ...computedFlags,
      { ...waiting, details: { ...waiting.details, current, difference: current.total_amount - confirmedTotal } },
    ];
    return out;
  }

  out.confirmation_status = fresh;
  return out;
}
