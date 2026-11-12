interface DiscountEnrollment {
  class_id: string;
  discount_type: "percent" | "amount" | null;
  discount_value: number | null;
  discount_cadence: string | null;
}

// WHICH enrollment a lesson belongs to, when two rows of the same class cover
// the same date. Both tuition calculators took "the first row that matches",
// in whatever order the database handed the rows over: calculate-tuition reads
// them with no ORDER BY, calculate-tuition-bulk pages them by id. The row
// picked decides the lesson's allowed days, override rate and discount terms,
// so the order must be stated, and be the same in both.
//
// The rule: the enrollment CREATED FIRST wins (created_at, then id). That is
// what an unordered read returns for rows still lying in the order they were
// inserted, so it is what both calculators have been doing. A row without a
// created_at sorts last, as Postgres sorts a NULL.
interface OrderedRow { id?: string | null; created_at?: string | null }

function compareCreation(a: OrderedRow, b: OrderedRow): number {
  const ta = a.created_at ? Date.parse(a.created_at) : NaN;
  const tb = b.created_at ? Date.parse(b.created_at) : NaN;
  const ha = Number.isFinite(ta), hb = Number.isFinite(tb);
  if (ha !== hb) return ha ? -1 : 1;
  if (ha && ta !== tb) return ta < tb ? -1 : 1;
  // Same millisecond: Postgres keeps microseconds, the text still tells them apart.
  const sa = String(a.created_at ?? ""), sb = String(b.created_at ?? "");
  if (sa !== sb) return sa < sb ? -1 : 1;
  const ia = String(a.id ?? ""), ib = String(b.id ?? "");
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

// A sorted copy; the select that feeds it must include `id` and `created_at`.
export function inCreationOrder<T extends OrderedRow>(rows: T[] | null | undefined): T[] {
  return [...(rows ?? [])].sort(compareCreation);
}

// The enrollment a lesson of `classId` on `date` is billed under. `ordered`
// must come from inCreationOrder.
export function enrollmentOn<T extends { class_id: string; start_date: string; end_date?: string | null }>(
  ordered: T[], classId: string, date: string,
): T | undefined {
  return ordered.find((e) => e.class_id === classId && e.start_date <= date && (!e.end_date || e.end_date >= date));
}

// Only enrollments that actually supplied billable sessions participate.
// Weekday changes copy the terms into a new dated row, not a new discount.
export function enrollmentDiscounts<T extends DiscountEnrollment>(bases: Map<T, number>) {
  const groups = new Map<string, { enrollment: T; base: number }>();
  for (const [enrollment, base] of bases) {
    if (base <= 0 || !enrollment.discount_type || !enrollment.discount_value) continue;
    if (enrollment.discount_cadence !== "monthly" && enrollment.discount_cadence !== "once") continue;
    const key = JSON.stringify([enrollment.class_id, enrollment.discount_type,
      enrollment.discount_value, enrollment.discount_cadence]);
    const group = groups.get(key);
    if (group) group.base += base;
    else groups.set(key, { enrollment, base });
  }
  return [...groups.values()].map(({ enrollment, base }) => ({
    name: "Enrollment Discount",
    type: enrollment.discount_type as "percent" | "amount",
    value: Number(enrollment.discount_value),
    amount: enrollment.discount_type === "percent"
      ? Math.round(base * (Number(enrollment.discount_value) / 100))
      : Math.round(Number(enrollment.discount_value)),
    class_id: enrollment.class_id,
  })).filter(discount => discount.amount > 0);
}