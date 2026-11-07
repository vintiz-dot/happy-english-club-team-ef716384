interface DiscountEnrollment {
  class_id: string;
  discount_type: "percent" | "amount" | null;
  discount_value: number | null;
  discount_cadence: string | null;
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