import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";
import { formatVND } from "@/lib/money";
import { SIBLING_SWAP_ACTION, swapLine, swapsToShow, type SwapResult } from "@/lib/siblingSwaps";

/**
 * Reports > Checks: sibling discounts the app moved to fit what a family paid
 * (owner, 24 Nov 2026).
 *
 * A family sometimes puts the sibling discount on another child than the one
 * the school's rule chose, and pays that way. When every child's payment for
 * the month is, to the dong, their bill with the discount on that other child,
 * compute-sibling-discounts moves it there and saves the bills. It does that
 * every hour for the month that is open (refresh-month-bills); an older month
 * is checked from here. This screen decides nothing: it shows what the
 * function did (audit_log) and asks it to check a month.
 */

const monthLabel = (m?: string) => (m ? dayjs(`${m}-01`).format("MMMM YYYY") : "");

function Line({ r, when }: { r: SwapResult; when?: string }) {
  const line = swapLine(r);
  return (
    <li className="space-y-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{r.family_name ?? "Family"}</span>
        <span className="text-sm text-muted-foreground">{monthLabel(r.month)}</span>
        {line.tone === "done" && <Badge>Moved</Badge>}
        {line.tone === "would" && <Badge variant="outline">Would move</Badge>}
        {line.tone === "problem" && <Badge variant="destructive">Needs you</Badge>}
        {when && <span className="text-xs text-muted-foreground">{dayjs(when).format("D MMM YYYY, HH:mm")}</span>}
      </div>
      <div className="text-sm">{line.headline}{r.percent ? `, ${r.percent}%` : ""}</div>
      {line.bills.map((b, i) => (
        <div key={i} className="text-sm text-muted-foreground">
          {b.student_name ?? "Child"}: bill <span className="whitespace-nowrap tabular-nums">{formatVND(b.was)}</span> to{" "}
          <span className="whitespace-nowrap tabular-nums text-foreground">{formatVND(b.now)}</span>, paid{" "}
          <span className="whitespace-nowrap tabular-nums">{formatVND(b.paid)}</span>
        </div>
      ))}
      {line.problems.map((p, i) => (
        <div key={i} className="text-sm text-destructive">{p}</div>
      ))}
    </li>
  );
}

export function SiblingSwaps() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(dayjs().subtract(1, "month").format("YYYY-MM"));
  const [busy, setBusy] = useState<"check" | "move" | null>(null);
  const [checked, setChecked] = useState<{ month: string; dryRun: boolean; results: SwapResult[] } | null>(null);

  const log = useQuery({
    queryKey: ["sibling-swaps-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, occurred_at, diff")
        .eq("action", SIBLING_SWAP_ACTION)
        .order("occurred_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; occurred_at: string; diff: SwapResult | null }>;
    },
  });

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? "check" : "move");
    try {
      const { data, error } = await supabase.functions.invoke("compute-sibling-discounts", {
        body: { month, swapByPayments: true, dryRun },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.reason || data?.error || "The check did not run");
      if (data.swapByPayments !== true) {
        throw new Error("The sibling function on the server is older than this screen: it has not been deployed yet.");
      }
      const results = swapsToShow(data.results as SwapResult[]);
      setChecked({ month, dryRun, results });
      if (!dryRun) {
        await queryClient.invalidateQueries({ queryKey: ["sibling-swaps-log"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] });
        toast.success(`${monthLabel(month)}: ${results.filter((r) => r.status === "swapped").length} sibling discount(s) moved`);
      }
    } catch (e: any) {
      toast.error(e?.message || "The check did not run");
    } finally {
      setBusy(null);
    }
  };

  const wouldMove = checked?.dryRun ? checked.results.filter((r) => r.status === "would_swap").length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight aria-hidden className="h-5 w-5" />
          Sibling discounts moved to fit the payments
        </CardTitle>
        <CardDescription>
          A family sometimes puts the sibling discount on the other child and pays that way. When every child's payment
          for a month is exactly their bill with the discount on that other child, the app moves the discount there for
          that month and saves the bills, so each bill equals what was paid. It does this by itself every hour for the
          open month. Check an older month here: you see what would move before anything changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={month} onChange={(m) => { setMonth(m); setChecked(null); }} maxMonth={dayjs().format("YYYY-MM")} minMonth="2025-08" />
          <Button onClick={() => run(true)} disabled={busy !== null} variant="outline" className="gap-2">
            {busy === "check" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Check {monthLabel(month)}
          </Button>
          {wouldMove > 0 && checked?.month === month && (
            <Button onClick={() => run(false)} disabled={busy !== null} className="gap-2">
              {busy === "move" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              Move {wouldMove} and save the bills
            </Button>
          )}
        </div>

        {checked && (
          <div>
            <div className="text-sm text-muted-foreground">
              {checked.results.length === 0
                ? `${monthLabel(checked.month)}: no family paid as if the discount were on another child.`
                : checked.dryRun
                  ? `${monthLabel(checked.month)}: nothing has been changed yet.`
                  : `${monthLabel(checked.month)}: done.`}
            </div>
            {checked.results.length > 0 && (
              <ul className="divide-y">{checked.results.map((r, i) => <Line key={i} r={r} />)}</ul>
            )}
          </div>
        )}

        <div>
          <div className="text-sm font-medium">Moved so far</div>
          {log.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : log.isError ? (
            <div className="text-sm text-destructive">The list could not be read.</div>
          ) : (log.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing has been moved yet.</div>
          ) : (
            <ul className="divide-y">
              {(log.data ?? []).map((row) => <Line key={row.id} r={row.diff ?? {}} when={row.occurred_at} />)}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
