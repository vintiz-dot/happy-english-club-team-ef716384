/**
 * One student's calculate-tuition-bulk answer as the row the tuition lists
 * and the payment dialogs pass around.
 *
 * It lives here, away from the hook that fetches it, so that it can be
 * tested without a Supabase client (scripts/tuitionRows.test.ts): the payment
 * dialogs decide the invoice status they WRITE from `finalPayable`.
 *
 * `finalPayable` is the function's own `carry.payable`. A deployed function
 * older than 12 Nov 2026 does not send it; for that answer only, the figure
 * is still the function's charge plus its carry-in debt less its carry-in
 * credit, added here - the same three numbers the function adds. That
 * fallback is the one piece of money arithmetic left on this path and it
 * exists so that a browser ahead of the function deploy shows the same
 * number as before instead of a gap. `balance` and `priorBalance` are the
 * Finance tab's older signed forms of the carry; the admin tuition list
 * does not read them.
 */
import { payableFromFunction, type TuitionFunctionResult } from "./tuitionRows";

export interface LiveTuitionItem {
  id: string;
  student_id: string;
  month: string;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  recorded_payment: number;
  finalPayable: number;
  balance: number;
  carry_out_credit: number;
  carry_out_debt: number;
  carry_in_credit: number;
  carry_in_debt: number;
  priorBalance: number;
  settled_in_month: string | null;
  status: string;
  confirmation_status: string;
  students: {
    id: string;
    full_name: string;
    family_id: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
  classes: Array<{ id: string; name: string }>;
  hasDiscount: boolean;
  hasSiblings: boolean;
  discounts: any[];
}

/** `data` must be a real answer (not missing, not an error row). */
export function liveTuitionItem(
  student: LiveTuitionItem["students"],
  data: any,
  month: string,
  badges: { classes: Array<{ id: string; name: string }>; hasDiscount: boolean; hasSiblings: boolean },
): LiveTuitionItem {
  return {
    id: data.invoiceId || `placeholder-${student.id}`,
    student_id: student.id,
    month,
    base_amount: data.baseAmount ?? 0,
    discount_amount: data.totalDiscount ?? 0,
    total_amount: data.totalAmount ?? 0,
    recorded_payment: data.payments?.monthPayments ?? 0,
    finalPayable:
      payableFromFunction(data as TuitionFunctionResult) ??
      // Function older than carry.payable: see the note at the top.
      data.totalAmount + (data.carry?.carryInDebt ?? 0) - (data.carry?.carryInCredit ?? 0),
    balance: (data.carry?.carryOutDebt || 0) - (data.carry?.carryOutCredit || 0),
    carry_out_credit: data.carry?.carryOutCredit ?? 0,
    carry_out_debt: data.carry?.carryOutDebt ?? 0,
    carry_in_credit: data.carry?.carryInCredit ?? 0,
    carry_in_debt: data.carry?.carryInDebt ?? 0,
    priorBalance: (data.carry?.carryInCredit ?? 0) - (data.carry?.carryInDebt ?? 0),
    settled_in_month: data.carry?.settledInMonth ?? null,
    status: data.invoiceStatus || data.carry?.status || "open",
    confirmation_status: data.confirmationStatus || "needs_review",
    students: student,
    classes: badges.classes,
    hasDiscount: badges.hasDiscount,
    hasSiblings: badges.hasSiblings,
    discounts: [],
  };
}
