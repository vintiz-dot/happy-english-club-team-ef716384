/**
 * What a student's month charge comes to in each class they take.
 *
 * The bill is priced per student: class bases, then discounts, some of
 * which belong to one class (a rate override, an enrollment's own terms,
 * the sibling discount on the winner class) and some to the whole month
 * (a student discount, a referral bonus). The per-class report needs the
 * charge split by class, and the stored `class_breakdown.net_amount_vnd`
 * is not that: it takes off the class's own discounts only, so the
 * report's Net Tuition ran above what families were charged by the whole
 * of every sibling and student discount (9.5M in October 2026).
 *
 * So the split is made here, beside the figures it splits, and it always
 * adds up to the charge exactly:
 *
 *   - each class weighs its base less the discounts that belong to it;
 *   - the charge is divided along those weights, which spreads the
 *     month-wide discounts in proportion to what each class still costs;
 *   - whole dong, the leftovers going to the largest remainders, so the
 *     classes sum to the charge rather than to within a dong of it.
 *
 * Imports nothing, like the other shared modules.
 */

export interface ClassNet {
  class_id: string;
  /** The class's base for the month, before any discount. */
  gross_vnd: number;
  /** Its share of what the student is charged, after every discount. */
  net_vnd: number;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * `bases`: class -> base. `classDiscounts`: class -> discounts that belong
 * to that class. `charge`: the student's total for the month. Classes with
 * no base get no share; a charge with no class to carry it (a frozen bill
 * saved without a breakdown) is left out, and the caller sees the classes
 * sum to less than the charge.
 */
export function classNetAmounts(
  bases: Map<string, number>,
  classDiscounts: Map<string, number>,
  charge: number,
): ClassNet[] {
  const entries = [...bases.entries()].map(([classId, base]) => ({ classId, base: Math.max(0, num(base)) }));
  let weights = entries.map((e) => Math.max(0, e.base - Math.max(0, num(classDiscounts.get(e.classId)))));
  // Every class discounted to nothing but something is still charged
  // (a month-wide figure the class discounts do not explain): split by base.
  if (weights.reduce((n, w) => n + w, 0) <= 0) weights = entries.map((e) => e.base);
  const weightSum = weights.reduce((n, w) => n + w, 0);
  const target = Math.max(0, Math.round(num(charge)));

  if (weightSum <= 0) {
    return entries.map((e) => ({ class_id: e.classId, gross_vnd: Math.round(e.base), net_vnd: 0 }));
  }

  const parts = entries.map((e, i) => {
    const exact = (weights[i] / weightSum) * target;
    const floor = Math.floor(exact);
    return { i, floor, frac: exact - floor };
  });
  let left = target - parts.reduce((n, p) => n + p.floor, 0);
  const order = [...parts].sort(
    (a, b) => b.frac - a.frac || weights[b.i] - weights[a.i] || entries[a.i].classId.localeCompare(entries[b.i].classId),
  );
  const net = parts.map((p) => p.floor);
  for (const p of order) {
    if (left <= 0) break;
    net[p.i] += 1;
    left -= 1;
  }

  return entries.map((e, i) => ({ class_id: e.classId, gross_vnd: Math.round(e.base), net_vnd: net[i] }));
}
