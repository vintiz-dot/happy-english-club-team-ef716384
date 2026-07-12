import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fields that mirror monthly_finance_snapshots columns 1:1.
export interface MonthlyFinanceSnapshot {
  id: string;
  student_id: string;
  month: string;
  version: number;
  final_payable: number;
  base_amount: number;
  total_discount: number;
  total_amount: number;
  recorded_payment: number;
  carry_in_credit: number;
  carry_in_debt: number;
  carry_out_credit: number;
  carry_out_debt: number;
  session_count: number;
  closed_at: string;
  closed_by: string | null;
  close_reason: string | null;
  superseded_at: string | null;
  superseded_by: string | null;
  supersede_reason: string | null;
}

const SELECT_COLS =
  "id, student_id, month, version, final_payable, base_amount, total_discount, total_amount, recorded_payment, carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt, session_count, closed_at, closed_by, close_reason, superseded_at, superseded_by, supersede_reason";

/**
 * Fetch the active (non-superseded) snapshot row for a single
 * (student, month). Returns null when the month has not yet been closed.
 */
export function useStudentMonthlySnapshot(studentId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["monthly-snapshot", studentId, month],
    queryFn: async (): Promise<MonthlyFinanceSnapshot | null> => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("monthly_finance_snapshots" as any)
        .select(SELECT_COLS)
        .eq("student_id", studentId)
        .eq("month", month)
        .is("superseded_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data as MonthlyFinanceSnapshot) ?? null;
    },
    enabled: !!studentId,
  });
}

/**
 * Fetch the entire active snapshot timeline for one student, oldest first.
 * Drives the audit-trail history view on the student card.
 */
export function useStudentSnapshotTimeline(studentId: string | undefined) {
  return useQuery({
    queryKey: ["monthly-snapshot-timeline", studentId],
    queryFn: async (): Promise<MonthlyFinanceSnapshot[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("monthly_finance_snapshots" as any)
        .select(SELECT_COLS)
        .eq("student_id", studentId)
        .is("superseded_at", null)
        .order("month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MonthlyFinanceSnapshot[];
    },
    enabled: !!studentId,
  });
}

/**
 * Fetch all active snapshots for a single month — used by Finance Summary
 * once a month is closed. Returns an empty array if the month has not
 * been closed yet.
 */
export function useMonthSnapshots(month: string) {
  return useQuery({
    queryKey: ["monthly-snapshots", month],
    queryFn: async (): Promise<MonthlyFinanceSnapshot[]> => {
      const { data, error } = await supabase
        .from("monthly_finance_snapshots" as any)
        .select(SELECT_COLS)
        .eq("month", month)
        .is("superseded_at", null);
      if (error) throw error;
      return (data ?? []) as MonthlyFinanceSnapshot[];
    },
  });
}

/**
 * Full version history (active + superseded) for one (student, month) —
 * used by the audit drawer when an admin clicks "view versions".
 */
export function useSnapshotVersionHistory(studentId: string | undefined, month: string) {
  return useQuery({
    queryKey: ["monthly-snapshot-versions", studentId, month],
    queryFn: async (): Promise<MonthlyFinanceSnapshot[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("monthly_finance_snapshots" as any)
        .select(SELECT_COLS)
        .eq("student_id", studentId)
        .eq("month", month)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MonthlyFinanceSnapshot[];
    },
    enabled: !!studentId,
  });
}
