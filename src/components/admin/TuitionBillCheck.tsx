import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { formatVND } from "@/lib/money";

/**
 * Does every child with lessons this month have a bill, and does it match the
 * register? Reads public.tuition_bill_gaps (20261123090000) - the database lists,
 * this screen only shows - and the last run of refresh-month-bills, which saves
 * the bills every hour. November 2026 had seven children with no bill or a bill
 * of 0 and nothing said so; this card is that something.
 */
type Gap = {
  student_id: string;
  full_name: string;
  is_active: boolean;
  problem: "missing" | "zero" | "differs";
  billable_lessons: number;
  expected_base: number;
  saved_base: number | null;
  saved_total: number | null;
  confirmation_status: string | null;
  /** Set by refresh-month-bills when calculate-tuition kept or priced the bill as charged because lessons have no mark. */
  held?: { lessons: number; message: string };
  /** The bill was saved with the unmarked lessons priced as charged. */
  note?: { lessons: number; message: string };
};

type Run = {
  ran_at: string;
  started_by: "timer" | "admin";
  found: number;
  recalculated: number;
  failed: Array<{ student_id: string; name: string; error: string }>;
  still_open: Gap[];
};

const vnd = (n: number | null | undefined) => (n == null ? "-" : formatVND(n));
const PROBLEM: Record<Gap["problem"], string> = {
  missing: "No bill",
  zero: "Bill is 0",
  differs: "Bill does not match the register",
};

export function TuitionBillCheck({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const current = dayjs().tz().format("YYYY-MM");
  const previous = dayjs().tz().subtract(1, "month").format("YYYY-MM");
  const canRecalculate = month === current || month === previous;
  const future = month > current;

  const gaps = useQuery({
    queryKey: ["tuition-bill-gaps", month],
    enabled: !future,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("tuition_bill_gaps", { p_month: month });
      if (error) throw error;
      return (data ?? []) as Gap[];
    },
  });

  const lastRun = useQuery({
    queryKey: ["tuition-bill-check-run", month],
    enabled: !future,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("tuition_bill_check_runs")
        .select("ran_at, started_by, found, recalculated, failed, still_open")
        .eq("month", month)
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Run | null;
    },
  });

  const recalculate = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-month-bills", { body: { month } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = data?.months?.[0];
      const failed = r?.failed?.length ?? 0;
      const held = r?.held?.length ?? 0;
      const priced = r?.priced?.length ?? 0;
      const open = (r?.still_open?.length ?? 0) - held - priced;
      if (!failed && open <= 0 && !held && priced) toast.success(`Saved ${r?.recalculated ?? 0} bill(s). ${priced} had lessons with no mark, charged as before.`);
      else if (!failed && open <= 0 && !held) toast.success(`Saved ${r?.recalculated ?? 0} bill(s). Every bill now matches the register.`);
      else if (!failed && open <= 0) toast.info(`Saved ${r?.recalculated ?? 0} bill(s). ${held} ${held === 1 ? "bill is" : "bills are"} held: lessons have no mark in the register.`);
      else toast.warning(`Saved ${r?.recalculated ?? 0} bill(s); ${Math.max(open, 0)} still need attention${held ? `, ${held} held` : ""}${failed ? `, ${failed} failed` : ""}.`);
    } catch (e: any) {
      toast.error(e?.message || "The bills could not be recalculated");
    } finally {
      setRunning(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tuition-bill-gaps", month] }),
        queryClient.invalidateQueries({ queryKey: ["tuition-bill-check-run", month] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] }),
      ]);
    }
  };

  if (future) return null;

  if (gaps.isError) {
    const msg = String((gaps.error as any)?.message ?? "");
    const notInstalled = /tuition_bill_gaps|PGRST202|schema cache/i.test(msg) || (gaps.error as any)?.code === "PGRST202";
    return (
      <Card role="alert" className="border-hec-warn/40">
        <CardContent className="flex items-start gap-3 py-4 text-hec-small">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" />
          <span>
            {notInstalled
              ? "The bill check is not installed yet: migration 20261123090000_tuition_bill_check.sql still has to be pasted into the Supabase SQL editor."
              : `The bill check could not run: ${msg}`}
          </span>
        </CardContent>
      </Card>
    );
  }

  const rows = gaps.data ?? [];
  const run = lastRun.data;
  const runLine = run
    ? `Last automatic check ${dayjs(run.ran_at).tz().format("D MMM HH:mm")}${run.started_by === "admin" ? " (by an admin)" : ""}: ${run.found} found, ${run.recalculated} saved${run.failed?.length ? `, ${run.failed.length} failed` : ""}.`
    : "No automatic check has run for this month yet.";

  if (gaps.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-hec-small text-hec-ink-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Checking every bill for {month} against the register...
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-hec-small">
          <CheckCircle2 aria-hidden className="h-4 w-4 text-hec-leaf" />
          <span>Every child with lessons in {month} has a bill that matches the register.</span>
          <span className="text-hec-ink-soft">{runLine}</span>
        </CardContent>
      </Card>
    );
  }

  const failedById = new Map((run?.failed ?? []).map((f) => [f.student_id, f.error]));
  const heldById = new Map((run?.still_open ?? []).filter((g) => g.held || g.note).map((g) => [g.student_id, (g.held ?? g.note)!.message]));
  const wrong = rows.filter((g) => !heldById.has(g.student_id));
  if (wrong.length === 0) {
    // Every listed child is held: the bill stays as charged until the register is fixed.
    return (
      <Card>
        <CardContent className="space-y-2 py-4 text-hec-small">
          <div className="flex items-center gap-2">
            <AlertTriangle aria-hidden className="h-4 w-4 text-hec-warn" />
            <span>
              {rows.length} {rows.length === 1 ? "bill has" : "bills have"} lessons with no mark in the register for {month}.
            </span>
          </div>
          <ul className="list-disc pl-6 text-hec-ink-soft">
            {rows.map((g) => (
              <li key={g.student_id}>
                {g.full_name}: {heldById.get(g.student_id)}
              </li>
            ))}
          </ul>
          <span className="text-hec-ink-soft">{runLine}</span>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card role="alert" className="border-hec-danger/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-hec-danger" />
          {wrong.length} {wrong.length === 1 ? "bill is" : "bills are"} missing or wrong for {month}
        </CardTitle>
        <CardDescription>
          These children have lessons the register says are owed for, and their saved bill is missing or does not
          match. Families see and pay the saved bill, so until it is saved they are not charged and any credit they
          paid ahead is not used. {runLine}
          {!canRecalculate && " This is an earlier month: it is never recalculated automatically. Check each child and recalculate them one by one (Automation > Manual Tuition Recalculation) if the register is right."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-hec-small">
            <thead>
              <tr className="border-b border-hec-line text-left text-hec-ink-soft">
                <th className="py-2 pr-3 font-medium">Child</th>
                <th className="py-2 pr-3 font-medium">Problem</th>
                <th className="py-2 pr-3 text-right font-medium">Lessons</th>
                <th className="py-2 pr-3 text-right font-medium">Register says</th>
                <th className="py-2 text-right font-medium">Saved bill</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.student_id} className="border-b border-hec-line/60 align-top">
                  <td className="py-2 pr-3">
                    {g.full_name}
                    {!g.is_active && <span className="text-hec-ink-soft"> (inactive)</span>}
                  </td>
                  <td className="py-2 pr-3">
                    {PROBLEM[g.problem]}
                    {g.confirmation_status === "confirmed" && <span className="text-hec-ink-soft"> - confirmed</span>}
                    {heldById.has(g.student_id) && (
                      <div className="text-hec-warn">{heldById.get(g.student_id)}</div>
                    )}
                    {failedById.has(g.student_id) && (
                      <div className="text-hec-danger">Last try: {failedById.get(g.student_id)}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{g.billable_lessons}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{vnd(g.expected_base)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{g.saved_base == null ? "none" : vnd(g.saved_base)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-hec-caption text-hec-ink-soft">
          Amounts are before discounts (the lessons at the class fee). Recalculating applies every discount, keeps
          payments, and leaves frozen bills as they are; a confirmed bill whose figures change goes back to review.
        </p>
        {canRecalculate && (
          <Button onClick={recalculate} disabled={running} className="gap-2">
            {running ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden className="h-4 w-4" />}
            {running ? "Recalculating (about 2 seconds a child)..." : `Recalculate ${wrong.length === 1 ? "this bill" : `these ${wrong.length} bills`}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
