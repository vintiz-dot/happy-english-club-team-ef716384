import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { parseGapRows } from "@/lib/attendanceProof";
import { heldRows } from "@/lib/closedMonthChanges";
import {
  PREVIOUS_MONTH_GRACE_DAYS, buildProblems, wrongBills,
  type BillGap, type BillRun, type ClosedVerdict, type PendingChange, type ProblemReport,
} from "@/lib/checkProblems";

/**
 * The problems an admin should deal with now: the list on Reports > Checks AND the red badge
 * in the menu, from one set of queries (the badge is `problems.length`). The cards on the page
 * read through these same functions under the same query keys, so one refresh moves all of
 * them. Nothing here prices or decides: the database and the functions answer, and
 * `buildProblems` words their rows.
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

/** What a money change (money_change_overrides.entity) was about, in a few words. */
const ENTITY: Record<string, string> = {
  attendance: "An attendance mark",
  session: "A lesson",
  class_fee: "A class fee",
  enrollment: "An enrolment",
  discount_assignment: "A discount",
  referral_bonus: "A referral bonus",
  pay_rate: "A pay rate",
  invoice_freeze: "A bill freeze",
  family_link: "A family link",
};

/** Checked changes waiting for their bills to be worked out again, both kinds, with what they were. */
export const fetchPendingChanges = async (): Promise<PendingChange[]> => {
  const read = async (view: string) => {
    const { data, error } = await (supabase.from as any)(view)
      .select("override_id, created_at, refresh_pairs")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as Array<{ override_id: string; created_at: string; refresh_pairs: PendingChange["refresh_pairs"] | null }>;
  };
  const [money, lessons] = await Promise.all([read("money_change_tuition_pending"), read("session_cancel_tuition_pending")]);
  const { data: entities } = money.length
    ? await (supabase.from as any)("money_change_overrides").select("id, entity, op").in("id", money.map((m) => m.override_id))
    : { data: [] };
  const what = new Map<string, string>(
    (entities ?? []).map((e: any) => [e.id, `${ENTITY[e.entity] ?? "A money setting"} changed (${String(e.op).replace(/_/g, " ")})`]),
  );
  return [
    ...money.map((m) => ({ ...m, refresh_pairs: m.refresh_pairs ?? [], kind: "money" as const, label: what.get(m.override_id) ?? "A money setting changed" })),
    ...lessons.map((l) => ({ ...l, refresh_pairs: l.refresh_pairs ?? [], kind: "lesson" as const, label: "A lesson cancelled or moved" })),
  ];
};

/**
 * A closed month's listed bills, asked of calculate-tuition-bulk (it never saves): is the
 * total charged still today's total (only the split differs), or does it really differ?
 */
const fetchClosedVerdicts = async (month: string, gaps: BillGap[]): Promise<Map<string, ClosedVerdict>> => {
  const out = new Map<string, ClosedVerdict>();
  if (gaps.length === 0) return out;
  const names = new Map(gaps.map((g) => [g.student_id, g.full_name]));
  const { data, error } = await supabase.functions.invoke("calculate-tuition-bulk", {
    body: { studentIds: gaps.map((g) => g.student_id), month },
  });
  if (error || !Array.isArray(data?.results)) {
    const why = String(error?.message ?? data?.error ?? "no answer");
    for (const g of gaps) out.set(`${g.student_id}|${month}`, { state: "unknown", error: why });
    return out;
  }
  const held = new Map(heldRows(data.results, month, names).map((r) => [r.studentId, r]));
  for (const g of gaps) {
    const r = (data.results as any[]).find((x) => String(x?.studentId) === g.student_id);
    const row = held.get(g.student_id);
    if (row) out.set(`${g.student_id}|${month}`, { state: "held", row });
    else if (!r || r.error) out.set(`${g.student_id}|${month}`, { state: "unknown", error: String(r?.error ?? "not in the answer") });
    else out.set(`${g.student_id}|${month}`, { state: "same" });
  }
  return out;
};

/* "Keep as charged" answers, per browser, keyed by the bill and both figures. Numbers and ids only. */
const KEPT_KEY = "hec.checks.keptAsCharged";
const KEPT_EVENT = "hec-checks-kept";
const readKept = (): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEPT_KEY) ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
};
export const keepAsCharged = (key: string) => {
  const next = readKept();
  next.add(key);
  localStorage.setItem(KEPT_KEY, JSON.stringify([...next]));
  window.dispatchEvent(new Event(KEPT_EVENT));
};
function useKept(): Set<string> {
  const [kept, setKept] = useState(readKept);
  useEffect(() => {
    const on = () => setKept(readKept());
    window.addEventListener(KEPT_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(KEPT_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return kept;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export interface CheckProblems extends ProblemReport {
  total: number;
  isLoading: boolean;
  /** What was checked, in a sentence, for the "nothing needs you" line. */
  scope: string;
}

/**
 * A check that cannot run (not installed, no access) is a note, not a number: its own card
 * says why, and a badge must not cry wolf.
 */
export function useCheckProblems(enabled: boolean): CheckProblems {
  const now = dayjs().tz();
  const current = now.format("YYYY-MM");
  const previous = now.subtract(1, "month").format("YYYY-MM");
  const previousOpen = now.date() <= PREVIOUS_MONTH_GRACE_DAYS;
  const to = now.format("YYYY-MM-DD");
  const from = now.subtract(60, "day").format("YYYY-MM-DD");
  const quiet = { enabled, retry: false, staleTime: FIVE_MINUTES, refetchInterval: 2 * FIVE_MINUTES, refetchOnWindowFocus: false } as const;

  const gapsNow = useQuery({ queryKey: ["tuition-bill-gaps", current], queryFn: () => fetchBillGaps(current), ...quiet });
  const runNow = useQuery({ queryKey: ["tuition-bill-check-run", current], queryFn: () => fetchBillRun(current), ...quiet });
  const gapsPrev = useQuery({ queryKey: ["tuition-bill-gaps", previous], queryFn: () => fetchBillGaps(previous), ...quiet });
  const runPrev = useQuery({ queryKey: ["tuition-bill-check-run", previous], queryFn: () => fetchBillRun(previous), ...quiet });
  // Under the pending card's prefix so that finishing a change there refreshes this too.
  const pending = useQuery({ queryKey: ["pending-change-bills", "problems"], queryFn: fetchPendingChanges, ...quiet });
  const attendance = useQuery({ queryKey: ["attendance-evidence-gaps", from, to], queryFn: () => fetchAttendanceGaps(from, to), ...quiet });

  const closedGaps = previousOpen ? [] : wrongBills(gapsPrev.data ?? [], runPrev.data);
  const closedIds = closedGaps.map((g) => g.student_id).sort();
  const closed = useQuery({
    queryKey: ["closed-bill-verdicts", previous, closedIds.join(",")],
    queryFn: () => fetchClosedVerdicts(previous, closedGaps),
    ...quiet,
    enabled: enabled && !previousOpen && closedIds.length > 0,
  });
  const kept = useKept();

  const report = buildProblems({
    current,
    previous,
    previousOpen,
    bills: [
      { month: current, rows: gapsNow.data ?? [], run: runNow.data ?? null },
      { month: previous, rows: gapsPrev.data ?? [], run: runPrev.data ?? null },
    ],
    closed: closed.data ?? new Map(),
    pending: pending.data ?? [],
    attendance: attendance.data ?? [],
    kept,
  });
  const notes = [...report.notes];
  if (gapsNow.isError || gapsPrev.isError) notes.push("The bill check could not run; its card below says why.");
  if (pending.isError) notes.push("Changes waiting to be repriced could not be read.");
  if (attendance.isError) notes.push("The attendance check could not run; its card below says why.");

  const isLoading = [gapsNow, runNow, gapsPrev, runPrev, pending, attendance].some((q) => q.isLoading) || (closed.isLoading && closed.fetchStatus !== "idle");
  const monthWord = (m: string) => dayjs(`${m}-01`).format("MMMM");
  return {
    problems: report.problems,
    notes,
    total: report.problems.length,
    isLoading,
    scope: `bills for ${monthWord(current)} and ${monthWord(previous)}, changes waiting to be repriced, and attendance in the last 60 days`,
  };
}
