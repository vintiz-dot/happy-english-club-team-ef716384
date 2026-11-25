import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { GAP_NEEDS_PERSON, groupGaps, parseGapRows } from "@/lib/attendanceProof";
import { checkTotal, wrongBills, type BillGap, type BillRun, type CheckCounts } from "@/lib/checkProblems";

/**
 * The readers of the Checks page's cards, and the count behind the badge in the menu.
 *
 * The cards (TuitionBillCheck, AttendanceEvidenceCheck) read through these same functions
 * under the same query keys, so the badge and the card share one answer and one refresh:
 * when a card saves bills and invalidates its key, the badge follows. Nothing here prices or
 * decides anything; it asks the database and counts the rows its checks listed.
 */

export const fetchBillGaps = async (month: string): Promise<BillGap[]> => {
  const { data, error } = await (supabase.rpc as any)("tuition_bill_gaps", { p_month: month });
  if (error) throw error;
  return (data ?? []) as BillGap[];
};

export const fetchBillRun = async (month: string): Promise<BillRun | null> => {
  const { data, error } = await (supabase.from as any)("tuition_bill_check_runs")
    .select("ran_at, started_by, found, recalculated, failed, still_open")
    .eq("month", month)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BillRun | null;
};

export const fetchAttendanceGaps = async (from: string, to: string) => {
  const { data, error } = await (supabase as any).rpc("attendance_evidence_gaps", { p_from: from, p_to: to });
  if (error) throw error;
  return parseGapRows(data);
};

/** Checked changes waiting for their bills to be worked out again, both kinds. */
const fetchPendingCount = async (): Promise<number> => {
  const count = async (view: string) => {
    const { count: n, error } = await (supabase.from as any)(view).select("override_id", { count: "exact", head: true });
    if (error) throw error;
    return (n ?? 0) as number;
  };
  const [money, lessons] = await Promise.all([count("money_change_tuition_pending"), count("session_cancel_tuition_pending")]);
  return money + lessons;
};

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Problems an admin should look at now. A check that cannot run (not installed, no access)
 * counts as none here: its own card says so, and a badge must not cry wolf.
 */
export function useCheckProblems(enabled: boolean): { counts: CheckCounts; total: number; isLoading: boolean } {
  const current = dayjs().tz().format("YYYY-MM");
  const previous = dayjs().tz().subtract(1, "month").format("YYYY-MM");
  const to = dayjs().tz().format("YYYY-MM-DD");
  const from = dayjs().tz().subtract(60, "day").format("YYYY-MM-DD");
  const quiet = { enabled, retry: false, staleTime: FIVE_MINUTES, refetchInterval: 2 * FIVE_MINUTES, refetchOnWindowFocus: false } as const;

  const gapsNow = useQuery({ queryKey: ["tuition-bill-gaps", current], queryFn: () => fetchBillGaps(current), ...quiet });
  const runNow = useQuery({ queryKey: ["tuition-bill-check-run", current], queryFn: () => fetchBillRun(current), ...quiet });
  const gapsPrev = useQuery({ queryKey: ["tuition-bill-gaps", previous], queryFn: () => fetchBillGaps(previous), ...quiet });
  const runPrev = useQuery({ queryKey: ["tuition-bill-check-run", previous], queryFn: () => fetchBillRun(previous), ...quiet });
  // Under the cards' own prefix so that finishing a change there refreshes the badge too.
  const pending = useQuery({ queryKey: ["pending-change-bills", "count"], queryFn: fetchPendingCount, ...quiet });
  const attendance = useQuery({ queryKey: ["attendance-evidence-gaps", from, to], queryFn: () => fetchAttendanceGaps(from, to), ...quiet });

  const grouped = groupGaps(attendance.data ?? []);
  const counts: CheckCounts = {
    wrongBills: wrongBills(gapsNow.data ?? [], runNow.data).length + wrongBills(gapsPrev.data ?? [], runPrev.data).length,
    pendingChanges: pending.data ?? 0,
    needsPerson: GAP_NEEDS_PERSON.flatMap((k) => grouped[k]).length,
  };
  const isLoading = [gapsNow, runNow, gapsPrev, runPrev, pending, attendance].some((q) => q.isLoading);
  return { counts, total: checkTotal(counts), isLoading };
}
