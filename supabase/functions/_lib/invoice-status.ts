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
// ONE rule for invoices.status, for every function that writes it
// (calculate-tuition, family-payment, smart-family-payment, settle-bill,
// delete-payment). It is the rule the admin payment dialogs
// (RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog) and
// ai_action_apply already used:
//
//   payable = this month's charge + debt carried in - credit carried in
//   paid     when recorded_payment >= payable and payable > 0
//   partial  when recorded_payment > 0 otherwise
//   issued   when nothing is recorded for the month
//
// `recorded_payment` is the money recorded IN that month. `paid_amount` is
// cumulative across months and must never be compared with one month's
// charge: for a family with history it is already larger than any single
// bill, so every part payment read as "paid".
//
// What follows from the rule, on purpose:
//   - debt carried in: the month is paid only when the payment covers the
//     debt as well as the month;
//   - credit carried in that covers the whole month, nothing recorded:
//     issued. Nothing was paid IN this month; that nothing is owed is read
//     from the carry balances, not from this label;
//   - a month with no charge: issued, or partial if money was recorded;
//   - a frozen bill: the same rule on its saved total.
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

export function paidLabel(recordedPayment: unknown, payable: unknown): PaidLabel {
  const recorded = amount(recordedPayment);
  const due = amount(payable);
  if (recorded >= due && due > 0) return "paid";
  if (recorded > 0) return "partial";
  return "issued";
}

/** The label of a stored bill row, optionally with a different recorded payment (the one about to be saved). */
export function invoicePaidLabel(
  row: { total_amount?: unknown; carry_in_debt?: unknown; carry_in_credit?: unknown; recorded_payment?: unknown },
  recordedPayment: unknown = row?.recorded_payment,
): PaidLabel {
  return paidLabel(recordedPayment, monthPayable(row));
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
