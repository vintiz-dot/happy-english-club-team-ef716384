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
//   - `status` on an existing bill belongs to the payment paths and the
//     admin, so it is left out of the save. Only a draft is still issued;
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

export interface InvoiceLabelFields {
  status?: "issued";
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
 */
export function invoiceLabelFields(
  existing: any | null,
  figures: ChargedFigures,
  computedFlags: any[],
  nowIso: string,
): InvoiceLabelFields {
  const fresh = computedFlags.length === 0 ? "auto_approved" : "needs_review";
  if (!existing) return { status: "issued", confirmation_status: fresh, review_flags: computedFlags };

  const out: InvoiceLabelFields = { review_flags: computedFlags };
  if (existing.status == null || existing.status === "draft") out.status = "issued";

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
