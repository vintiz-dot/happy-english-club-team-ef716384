import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionError";
import type { HeldBillRow } from "@/lib/closedMonthChanges";
import type { Json } from "@/integrations/supabase/types";

/**
 * Approve a closed month's held bill: calculate-tuition with force + reason (it records who and
 * why on the bill) and an audit_log row with both sets of figures. Used by the closed-months card
 * and the problems list, so the two approve the same way.
 *
 * Returns the new total when the bill changed, or null when nothing was held any more.
 */
export async function approveClosedBill(row: HeldBillRow, reason: string): Promise<{ changed: boolean; total: number; message: string }> {
  const { data, error } = await supabase.functions.invoke("calculate-tuition", {
    body: { studentId: row.studentId, month: row.month, force: true, reason },
  });
  if (error) throw new Error(await functionErrorMessage(error, "The bill was not changed"));
  if (data?.error) throw new Error(data.error);
  if (!data?.approvedChange) {
    // Nothing was held any more (somebody approved it, or the register moved back).
    return {
      changed: false,
      total: Number(data?.totalAmount ?? row.savedTotal),
      message: data?.held ? "Still held: the bill was not changed." : "This bill no longer differs. Nothing was changed.",
    };
  }
  const { data: userData } = await supabase.auth.getUser();
  const actor = userData?.user?.id ?? null;
  const figures = (base: number, discount: number, total: number): { [key: string]: Json } => ({
    base_amount: base, total_discount: discount, total_amount: total,
  });
  const total = Number(data.totalAmount ?? 0);
  await supabase.from("audit_log").insert({
    action: "manual_tuition_recalc_approved_change",
    entity: "invoice",
    entity_id: `${row.studentId}-${row.month}`,
    actor_user_id: actor,
    diff: {
      student_id: row.studentId,
      month: row.month,
      actor_user_id: actor,
      reason,
      old: figures(row.savedBase, row.savedDiscount, row.savedTotal),
      new: figures(Number(data.baseAmount ?? 0), Number(data.totalDiscount ?? 0), total),
    },
  });
  return { changed: true, total, message: "" };
}
