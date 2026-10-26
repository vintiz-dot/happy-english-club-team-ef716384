export interface SiblingClass {
  classId: string;
  className: string;
  sessionsCount: number;
  totalAmount: number;
}

// Display the server's chosen class and amount, not a second pricing rule.
export function siblingDiscountView(tuition: any) {
  const state = tuition?.siblingState ?? null;
  const discount = (tuition?.discounts ?? []).find((d: any) => d.isSiblingWinner);
  return {
    state,
    discountAmount: Number(discount?.amount ?? 0),
    classes: (tuition?.breakdown?.classes ?? []).map((cls: any): SiblingClass => ({
      classId: cls.class_id,
      className: cls.class_name,
      sessionsCount: cls.sessions_count,
      totalAmount: cls.amount_vnd,
    })),
  };
}