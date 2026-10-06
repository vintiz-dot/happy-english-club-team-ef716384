import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useEffect } from "react";

export interface FinanceSummaryData {
  grossTuition: number;
  totalDiscounts: number;
  totalTuition: number;
  totalCollected: number;
  collectionRate: number;
  totalSalaryActual: number;
  totalSalaryProjected: number;
  totalExpenditures: number;
  excusedLoss: number;
  netActual: number;
  netProjected: number;
}

export function useFinanceSummary(month: string) {
  const queryClient = useQueryClient();

  const result = useQuery<FinanceSummaryData>({
    queryKey: ["finance-summary", month],
    queryFn: async () => {
      const startDate = `${month}-01`;
      const nextMonth = new Date(startDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDate = format(nextMonth, "yyyy-MM-dd");

      const { data: invoices } = await supabase
        .from("invoices")
        .select("base_amount, discount_amount, total_amount, recorded_payment")
        .eq("month", month);

      const grossTuition = (invoices || []).reduce((sum, inv) => sum + (inv.base_amount || 0), 0);
      const totalDiscounts = (invoices || []).reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);
      const totalTuition = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalCollected = (invoices || []).reduce((sum, inv) => sum + (inv.recorded_payment || 0), 0);
      const collectionRate = totalTuition > 0 ? Math.round((totalCollected / totalTuition) * 100) : 0;

      const { data: payrollResult, error: payrollError } = await supabase.functions.invoke("calculate-payroll", {
        body: { month },
      });

      const totalSalaryActual = payrollError ? 0 : (payrollResult?.grandTotalActual || 0);
      const totalSalaryProjected = payrollError ? 0 : (payrollResult?.grandTotalProjected || 0);

      // Salary feeds net profit below, and salary is hours x rate. If any
      // session's length disagrees with its class setting, every figure
      // downstream of this one inherits that error - so carry the flag along
      // rather than presenting a net number as if it were settled.
      const payrollDiscrepancies = payrollError ? 0 : (payrollResult?.totalDiscrepancies || 0);
      const payrollVariance = payrollError ? 0 : (payrollResult?.grandTotalVariance || 0);

      const { data: expenditures } = await supabase
        .from("expenditures")
        .select("amount")
        .gte("date", startDate)
        .lt("date", endDate);

      const totalExpenditures = (expenditures || []).reduce((sum, e) => sum + (e.amount || 0), 0);

      const { data: excused } = await supabase
        .from("attendance")
        .select(`
          id,
          sessions!inner (date, class_id,
            classes (session_rate_vnd)
          )
        `)
        .eq("status", "Excused")
        .gte("sessions.date", startDate)
        .lt("sessions.date", endDate);

      const excusedLoss = (excused || []).reduce((sum, a: any) => {
        return sum + (a.sessions?.classes?.session_rate_vnd || 0);
      }, 0);

      const netActual = totalTuition - totalSalaryActual - totalExpenditures;
      const netProjected = totalTuition - totalSalaryProjected - totalExpenditures;

      return {
        grossTuition,
        totalDiscounts,
        totalTuition,
        totalCollected,
        collectionRate,
        totalSalaryActual,
        totalSalaryProjected,
        totalExpenditures,
        excusedLoss,
        netActual,
        netProjected,
        payrollDiscrepancies,
        payrollVariance,
      };
    },
    staleTime: 60000,
  });

  // Real-time listeners
  useEffect(() => {
    const invoicesChannel = supabase
      .channel(`invoices-changes-${month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `month=eq.${month}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["finance-summary", month] });
      })
      .subscribe();

    const payrollChannel = supabase
      .channel(`payroll-changes-${month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payroll_summaries", filter: `month=eq.${month}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["finance-summary", month] });
      })
      .subscribe();

    const expendituresChannel = supabase
      .channel(`expenditures-changes-${month}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenditures" }, () => {
        queryClient.invalidateQueries({ queryKey: ["finance-summary", month] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(payrollChannel);
      supabase.removeChannel(expendituresChannel);
    };
  }, [month, queryClient]);

  return result;
}
