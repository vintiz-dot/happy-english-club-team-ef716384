/**
 * Read-outs of calculate-tuition's answer for the student's Tuition tab.
 * Nothing is priced here (BROWSER-PRICING): the tab used to re-price the
 * sibling discount as the class amount x the family percent, and to add up
 * Final Payable from the carry fields, when the function returns both.
 */

export interface TuitionDiscountLine {
  amount?: number | null;
  isSiblingWinner?: boolean;
  appliedToClass?: string | null;
}

/**
 * The sibling discount calculate-tuition applied to `classId`: its
 * `discounts` line marked isSiblingWinner for that class. 0 when it applied
 * none there (the function adds no line for a 0 discount).
 */
export function siblingDiscountFor(
  discounts: TuitionDiscountLine[] | null | undefined,
  classId: string,
): number {
  let total = 0;
  for (const d of discounts ?? []) {
    if (d?.isSiblingWinner && d.appliedToClass === classId && typeof d.amount === "number" && Number.isFinite(d.amount)) {
      total += d.amount;
    }
  }
  return total;
}

/**
 * The month's payable (charge + debt carried in - credit carried in, before
 * this month's payment) as the function returns it in `carry.payable`. Null
 * - "figure unavailable" - from a function too old to send it.
 */
export function payableFrom(carry: { payable?: unknown } | null | undefined): number | null {
  const v = carry?.payable;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
