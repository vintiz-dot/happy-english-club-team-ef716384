import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { oldestOwingMonth, type OwingBill, type OwingMonth } from "@/lib/owingMonth";

// Each child's saved bills, read for src/lib/owingMonth.ts: the month, the
// month's own recorded_payment and the trigger-kept carry_out_debt. Nothing
// else - never paid_amount (cumulative), and nothing is priced here.
// A read failure shows no suggestion; it never blocks a payment.

const CHUNK = 100;

export const OWING_MONTHS_KEY = "owing-months";

export function useOwingBills(studentIds: readonly string[], enabled = true) {
  const ids = useMemo(() => [...new Set(studentIds.filter(Boolean))].sort(), [studentIds]);
  return useQuery({
    queryKey: [OWING_MONTHS_KEY, ids],
    enabled: enabled && ids.length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const byChild: Record<string, OwingBill[]> = {};
      for (const id of ids) byChild[id] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { data, error } = await supabase
          .from("invoices")
          .select("student_id, month, recorded_payment, carry_out_debt")
          .in("student_id", ids.slice(i, i + CHUNK));
        if (error) throw error;
        for (const row of (data ?? []) as any[]) {
          (byChild[row.student_id] ??= []).push({
            month: row.month,
            recorded_payment: row.recorded_payment,
            carry_out_debt: row.carry_out_debt,
          });
        }
      }
      return byChild;
    },
  });
}

/** The oldest month each child still owes (children who owe nothing are left out). */
export function useOwingMonths(studentIds: readonly string[], enabled = true): Map<string, OwingMonth> {
  const { data } = useOwingBills(studentIds, enabled);
  return useMemo(() => {
    const out = new Map<string, OwingMonth>();
    for (const [id, bills] of Object.entries(data ?? {})) {
      const owing = oldestOwingMonth(bills);
      if (owing) out.set(id, owing);
    }
    return out;
  }, [data]);
}
