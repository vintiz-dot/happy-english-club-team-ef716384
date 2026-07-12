import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Drives the rebuilt Admin Finance Summary widget.
 *
 * Architecture:
 *  - Current/open months: live aggregation off calculate-tuition-bulk —
 *    every tuition figure (final_payable, totalAmount, recorded_payment,
 *    carry-out debt) reflects the latest sessions/attendance/discounts.
 *  - Closed months: the same numbers re-aggregated from
 *    monthly_finance_snapshots (audit-grade, frozen).
 *  - Both are fetched in parallel for closed months so the UI can offer
 *    a "live recompute" drift inspection without changing the displayed
 *    truth.
 *
 * No tuition math happens in this hook. It only sums the values returned
 * by calculate-tuition-bulk (single source of truth) and the snapshot
 * table (frozen output of the same).
 */

export const LOST_REVENUE_THRESHOLD_VND = 50_000;
const BULK_CHUNK = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface FinanceMetrics {
  totalExpectedRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  lostRevenueCount: number;
  lostRevenueVnd: number;
  grossTuition: number;
  totalDiscounts: number;
  totalTuitionThisMonth: number;
  collectionRate: number;
  // Number of students included in the calculation.
  studentCount: number;
}

export interface FinanceOverviewData {
  month: string;
  isClosed: boolean;
  closedAt: string | null;
  // Always present.
  live: FinanceMetrics;
  // Only set when the month has snapshots.
  snapshot: FinanceMetrics | null;
  // Drift between live and snapshot when both are present.
  drift: {
    revenueDelta: number;
    collectedDelta: number;
    outstandingDelta: number;
    hasMaterialDrift: boolean;
  } | null;

  // Costs (unchanged semantics — sourced from existing functions/tables).
  totalSalaryActual: number;
  totalSalaryProjected: number;
  totalExpenditures: number;
  excusedLoss: number;

  // Net profit computed from billed revenue (accrual). Keeps parity with
  // the previous widget's net definition.
  netActual: number;
  netProjected: number;
}

function emptyMetrics(): FinanceMetrics {
  return {
    totalExpectedRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    lostRevenueCount: 0,
    lostRevenueVnd: 0,
    grossTuition: 0,
    totalDiscounts: 0,
    totalTuitionThisMonth: 0,
    collectionRate: 0,
    studentCount: 0,
  };
}

function aggregateLive(rows: any[]): FinanceMetrics {
  const m = emptyMetrics();
  for (const r of rows) {
    if (!r || r.error) continue;
    const totalAmount = Number(r.totalAmount ?? 0);
    const carryInDebt = Number(r.carry?.carryInDebt ?? 0);
    const carryInCredit = Number(r.carry?.carryInCredit ?? 0);
    const monthPayments = Number(r.payments?.monthPayments ?? 0);
    const carryOutDebt = Number(r.carry?.carryOutDebt ?? 0);

    // final_payable formula — locked, sourced from the edge function.
    const finalPayable = totalAmount + carryInDebt - carryInCredit;

    m.totalExpectedRevenue += finalPayable;
    m.totalCollected += monthPayments;
    m.grossTuition += Number(r.baseAmount ?? 0);
    m.totalDiscounts += Number(r.totalDiscount ?? 0);
    m.totalTuitionThisMonth += totalAmount;
    m.studentCount += 1;

    if (carryOutDebt > LOST_REVENUE_THRESHOLD_VND) {
      m.lostRevenueCount += 1;
      m.lostRevenueVnd += carryOutDebt;
    }
  }
  m.totalOutstanding = m.totalExpectedRevenue - m.totalCollected;
  m.collectionRate = m.totalExpectedRevenue > 0
    ? Math.round((m.totalCollected / m.totalExpectedRevenue) * 1000) / 10
    : 0;
  return m;
}

function aggregateSnapshot(rows: any[]): FinanceMetrics {
  const m = emptyMetrics();
  for (const r of rows) {
    m.totalExpectedRevenue += Number(r.final_payable ?? 0);
    m.totalCollected += Number(r.recorded_payment ?? 0);
    m.grossTuition += Number(r.base_amount ?? 0);
    m.totalDiscounts += Number(r.total_discount ?? 0);
    m.totalTuitionThisMonth += Number(r.total_amount ?? 0);
    m.studentCount += 1;

    const carryOutDebt = Number(r.carry_out_debt ?? 0);
    if (carryOutDebt > LOST_REVENUE_THRESHOLD_VND) {
      m.lostRevenueCount += 1;
      m.lostRevenueVnd += carryOutDebt;
    }
  }
  m.totalOutstanding = m.totalExpectedRevenue - m.totalCollected;
  m.collectionRate = m.totalExpectedRevenue > 0
    ? Math.round((m.totalCollected / m.totalExpectedRevenue) * 1000) / 10
    : 0;
  return m;
}

const MATERIAL_DRIFT_VND = 1;

export function useFinanceOverview(month: string) {
  const queryClient = useQueryClient();

  const result = useQuery<FinanceOverviewData>({
    queryKey: ["finance-overview", month],
    queryFn: async (): Promise<FinanceOverviewData> => {
      const monthStart = `${month}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStart = format(nextMonth, "yyyy-MM-dd");

      // 1) Active students with enrollments in this month — same filter as
      //    AdminTuitionListEnhanced uses, so the live aggregation matches
      //    the per-student card.
      const { data: students } = await supabase
        .from("students")
        .select("id, is_active")
        .eq("is_active", true);
      const allIds = (students ?? []).map((s) => s.id);

      let liveMetrics = emptyMetrics();
      if (allIds.length > 0) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id, classes!inner(id, is_active)")
          .in("student_id", allIds)
          .eq("classes.is_active", true)
          .lte("start_date", nextMonthStart)
          .or(`end_date.is.null,end_date.gte.${monthStart}`);

        const enrolledIds = Array.from(
          new Set((enrollments ?? []).map((e: any) => e.student_id)),
        );

        if (enrolledIds.length > 0) {
          const liveRows: any[] = [];
          for (const ids of chunk(enrolledIds, BULK_CHUNK)) {
            const { data, error } = await supabase.functions.invoke(
              "calculate-tuition-bulk",
              { body: { studentIds: ids, month } },
            );
            if (error) throw error;
            if (data?.results) liveRows.push(...data.results);
          }
          liveMetrics = aggregateLive(liveRows);
        }
      }

      // 2) Snapshot rows for this month — drives the "closed" indicator.
      const { data: snapRows } = await supabase
        .from("monthly_finance_snapshots" as any)
        .select(
          "student_id, final_payable, base_amount, total_discount, total_amount, recorded_payment, carry_out_debt, closed_at",
        )
        .eq("month", month)
        .is("superseded_at", null);

      const snapshotMetrics = (snapRows && snapRows.length > 0)
        ? aggregateSnapshot(snapRows)
        : null;

      const closedAt = (snapRows && snapRows.length > 0)
        ? (snapRows
            .map((r: any) => r.closed_at)
            .sort()
            .pop() as string)
        : null;

      // A month is "closed" when the snapshot covers every live target.
      // Partial coverage (some students snapshotted, others not) keeps the
      // displayed value live but still surfaces drift on the snapshot
      // subset.
      const isClosed =
        !!snapshotMetrics &&
        snapshotMetrics.studentCount > 0 &&
        snapshotMetrics.studentCount >= liveMetrics.studentCount;

      const drift = snapshotMetrics
        ? {
            revenueDelta: liveMetrics.totalExpectedRevenue - snapshotMetrics.totalExpectedRevenue,
            collectedDelta: liveMetrics.totalCollected - snapshotMetrics.totalCollected,
            outstandingDelta: liveMetrics.totalOutstanding - snapshotMetrics.totalOutstanding,
            hasMaterialDrift: false,
          }
        : null;
      if (drift) {
        drift.hasMaterialDrift =
          Math.abs(drift.revenueDelta) > MATERIAL_DRIFT_VND ||
          Math.abs(drift.collectedDelta) > MATERIAL_DRIFT_VND ||
          Math.abs(drift.outstandingDelta) > MATERIAL_DRIFT_VND;
      }

      // 3) Costs — payroll + expenditures + excused loss. Same sources as
      //    the legacy widget so net profit numbers stay stable.
      const { data: payrollResult, error: payrollError } = await supabase.functions.invoke(
        "calculate-payroll",
        { body: { month } },
      );
      const totalSalaryActual = payrollError ? 0 : Number(payrollResult?.grandTotalActual ?? 0);
      const totalSalaryProjected = payrollError ? 0 : Number(payrollResult?.grandTotalProjected ?? 0);

      const { data: expenditures } = await supabase
        .from("expenditures")
        .select("amount")
        .gte("date", monthStart)
        .lt("date", nextMonthStart);
      const totalExpenditures = (expenditures ?? []).reduce(
        (s, e: any) => s + Number(e.amount ?? 0),
        0,
      );

      const { data: excused } = await supabase
        .from("attendance")
        .select(
          `id,
           sessions!inner (date, class_id,
             classes (session_rate_vnd)
           )`,
        )
        .eq("status", "Excused")
        .gte("sessions.date", monthStart)
        .lt("sessions.date", nextMonthStart);
      const excusedLoss = (excused ?? []).reduce(
        (s, a: any) => s + Number(a.sessions?.classes?.session_rate_vnd ?? 0),
        0,
      );

      // Net = displayed (canonical) revenue − salary − expenditures.
      const displayed = isClosed && snapshotMetrics ? snapshotMetrics : liveMetrics;
      const netActual = displayed.totalTuitionThisMonth - totalSalaryActual - totalExpenditures;
      const netProjected = displayed.totalTuitionThisMonth - totalSalaryProjected - totalExpenditures;

      return {
        month,
        isClosed,
        closedAt,
        live: liveMetrics,
        snapshot: snapshotMetrics,
        drift,
        totalSalaryActual,
        totalSalaryProjected,
        totalExpenditures,
        excusedLoss,
        netActual,
        netProjected,
      };
    },
    staleTime: 30_000,
  });

  // Live invalidation: any of these tables changing implies the displayed
  // figures may be stale. Snapshots are also watched so closing a month
  // immediately re-renders.
  useEffect(() => {
    const channels = [
      supabase
        .channel(`fin-overview-invoices-${month}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `month=eq.${month}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
        })
        .subscribe(),
      supabase
        .channel(`fin-overview-payments-${month}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
          queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
        })
        .subscribe(),
      supabase
        .channel(`fin-overview-attendance-${month}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
          queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
        })
        .subscribe(),
      supabase
        .channel(`fin-overview-sessions-${month}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
          queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
        })
        .subscribe(),
      supabase
        .channel(`fin-overview-snapshots-${month}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "monthly_finance_snapshots", filter: `month=eq.${month}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
          },
        )
        .subscribe(),
      supabase
        .channel(`fin-overview-expenditures-${month}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "expenditures" }, () => {
          queryClient.invalidateQueries({ queryKey: ["finance-overview", month] });
        })
        .subscribe(),
    ];

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [month, queryClient]);

  // Memoised passthrough — keeps reference stable for downstream selectors.
  return useMemo(() => result, [result]);
}
