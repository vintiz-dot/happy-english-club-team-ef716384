/**
 * _lib/past-month-hold.ts - a closed month's saved bill never changes on its
 * own. Pure; imports nothing.
 *
 * calculate-tuition saves the bill on every call, and anybody opening a month
 * (a family's Tuition page, an admin list, a payment form) is a call. So a
 * month a family paid long ago was repriced whenever the register, a discount
 * or the pricing rules had moved since, and the app stopped matching what the
 * family paid (the owner's complaint, 23 Nov 2026).
 *
 * The rule: once a month is CLOSED (older than the months the hourly refresh
 * may reprice: this month, and last month in its first days) its saved bill
 * stands. When today's pricing gives other figures, the bill is HELD: the saved
 * figures are answered and stay saved, the difference is flagged on the bill,
 * and only an admin who asks for it with a reason saves the new figures. A
 * month with no saved bill, a frozen bill (it has its own lock) and an open
 * month are priced and saved as always.
 *
 * calculate-tuition and calculate-tuition-bulk both use this.
 */

export interface BillFigures {
  base: number;
  discount: number;
  total: number;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** The three charged figures of an invoices row. */
export function figuresOf(row: { base_amount?: unknown; discount_amount?: unknown; total_amount?: unknown }): BillFigures {
  return { base: num(row.base_amount), discount: num(row.discount_amount), total: num(row.total_amount) };
}

export function sameFigures(a: BillFigures, b: BillFigures): boolean {
  return a.base === b.base && a.discount === b.discount && a.total === b.total;
}

/**
 * Is `month` (YYYY-MM) closed? `openMonths` are the months the refresh may
 * reprice now (bill-refresh.ts refreshableMonths). A month that is not open and
 * lies before the latest open month is closed; a future month is not.
 */
export function isClosedMonth(month: string, openMonths: string[]): boolean {
  if (openMonths.includes(month)) return false;
  const latest = [...openMonths].sort().pop();
  return !!latest && month < latest;
}

export type PastMonthMode = "normal" | "held" | "approved";

/**
 *   normal    nothing to protect: the month is open, there is no saved bill, the
 *             bill is frozen, or today's pricing gives the saved figures;
 *   held      a closed month whose pricing differs: the saved figures stand;
 *   approved  the same, and an admin asked for the new figures: save them.
 */
export function decidePastMonth(opts: {
  closed: boolean;
  saved: BillFigures | null; // null when there is no saved bill
  frozen: boolean;
  next: BillFigures; // what today's pricing gives
  approved: boolean; // an admin (never the service role) sent force
}): PastMonthMode {
  if (!opts.closed || opts.saved === null || opts.frozen || sameFigures(opts.saved, opts.next)) return "normal";
  return opts.approved ? "approved" : "held";
}

export const PAST_MONTH_DIFFERS = "past_month_differs";
export const PAST_MONTH_REPRICED = "past_month_repriced";

/** The flag on a held bill. No date or actor in it: an identical call rewrites nothing. */
export function pastMonthDiffersFlag(saved: BillFigures, next: BillFigures) {
  return {
    type: PAST_MONTH_DIFFERS,
    label: "This closed month now prices differently. The bill stays as charged until an admin approves the change",
    details: {
      savedBase: saved.base,
      savedDiscount: saved.discount,
      savedTotal: saved.total,
      newBase: next.base,
      newDiscount: next.discount,
      newTotal: next.total,
    },
  };
}

/** The flag left behind when an admin approves the new figures. Kept by later saves. */
export function pastMonthRepricedFlag(opts: {
  saved: BillFigures;
  next: BillFigures;
  actorUserId: string | null;
  actorEmail: string | null;
  reason: string;
  at: string;
}) {
  return {
    type: PAST_MONTH_REPRICED,
    label: "A closed month's bill was changed by an admin",
    details: {
      savedBase: opts.saved.base,
      savedDiscount: opts.saved.discount,
      savedTotal: opts.saved.total,
      newBase: opts.next.base,
      newDiscount: opts.next.discount,
      newTotal: opts.next.total,
      actor: opts.actorUserId,
      actorEmail: opts.actorEmail,
      reason: opts.reason,
      at: opts.at,
    },
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const vnd = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ₫`;

/** The sentence a person reads when a closed month is held. */
export function pastMonthSentence(month: string, saved: BillFigures, next: BillFigures): string {
  const label = `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`;
  return `Held: ${label} is closed. The bill stays at ${vnd(saved.total)}; today's pricing gives ${vnd(next.total)}. An admin can approve the change with a reason.`;
}

/** The `held` block both calculators answer for a held closed month. */
export function pastMonthHeld(month: string, saved: BillFigures, next: BillFigures) {
  return {
    reason: "past_month_changed",
    priced_as_charged: false,
    message: pastMonthSentence(month, saved, next),
    lessons: [] as Array<{ date: string; class_name: string }>,
    register_base: next.base,
    saved_base: saved.base,
    register_discount: next.discount,
    saved_discount: saved.discount,
    register_total: next.total,
    saved_total: saved.total,
  };
}
