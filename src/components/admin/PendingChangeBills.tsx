import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { manageSession } from "@/components/admin/session-guard/api";
import { functionErrorMessage } from "@/lib/functionError";

/**
 * Checked changes whose bills were never worked out again. A discount, fee or
 * enrolment change (D4) and a lesson cancelled or moved (D2) each ask
 * calculate-tuition to reprice the bills they touch; when that call fails, the
 * change waits in money_change_tuition_pending / session_cancel_tuition_pending.
 * Before 23 Nov 2026 the money ones were shown nowhere. The hourly
 * refresh-month-bills saves this month's and last month's affected bills; this
 * card lists what is still waiting and finishes it the recorded way (the same
 * calls as the change dialogs' own retry), which also covers earlier months.
 */
type Pending = { override_id: string; created_at: string; refresh_pairs: Array<{ student_id: string; month: string }> };
type Row = Pending & { kind: "money" | "lesson"; label: string };

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

export function PendingChangeBills() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const pending = useQuery({
    queryKey: ["pending-change-bills"],
    queryFn: async () => {
      const read = async (view: string) => {
        const { data, error } = await (supabase.from as any)(view)
          .select("override_id, created_at, refresh_pairs")
          .order("created_at", { ascending: true })
          .limit(200);
        if (error) throw error;
        return (data ?? []) as Pending[];
      };
      const [money, lessons] = await Promise.all([read("money_change_tuition_pending"), read("session_cancel_tuition_pending")]);
      const { data: entities } = money.length
        ? await (supabase.from as any)("money_change_overrides").select("id, entity, op").in("id", money.map((m) => m.override_id))
        : { data: [] };
      const what = new Map<string, string>((entities ?? []).map((e: any) => [e.id, `${ENTITY[e.entity] ?? "A money setting"} changed (${String(e.op).replace(/_/g, " ")})`]));
      const rows: Row[] = [
        ...money.map((m) => ({ ...m, kind: "money" as const, label: what.get(m.override_id) ?? "A money setting changed" })),
        ...lessons.map((l) => ({ ...l, kind: "lesson" as const, label: "A lesson cancelled or moved" })),
      ];
      return rows;
    },
  });

  const finish = async () => {
    const rows = pending.data ?? [];
    setRunning(true);
    let done = 0;
    const problems: string[] = [];
    try {
      for (const r of rows) {
        if (r.kind === "money") {
          const { data, error } = await supabase.functions.invoke("guarded-change-refresh", {
            body: { action: "refresh", override_id: r.override_id },
          });
          const status = data?.tuition?.status;
          if (error) problems.push(`${r.label}: ${await functionErrorMessage(error, "refused")}`);
          else if (status === "refreshed" || status === "none") done++;
          else problems.push(`${r.label}: ${status ?? "not finished"}`);
        } else {
          const res = await manageSession<{ tuition?: { status?: string } }>("refresh-tuition", { override_id: r.override_id });
          if (!res.ok) problems.push(`${r.label}: ${res.error.message}`);
          else if (res.data.tuition?.status === "refreshed" || res.data.tuition?.status === "none") done++;
          else problems.push(`${r.label}: ${res.data.tuition?.status ?? "not finished"}`);
        }
      }
      if (problems.length === 0) toast.success(`Finished ${done} change(s): every bill they touch is worked out again.`);
      else toast.warning(`Finished ${done}; ${problems.length} still waiting. ${problems.slice(0, 3).join("; ")}`);
    } finally {
      setRunning(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-change-bills"] }),
        queryClient.invalidateQueries({ queryKey: ["tuition-bill-gaps"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] }),
      ]);
    }
  };

  // Not installed, not an admin, or nothing waiting: say nothing.
  if (pending.isError || pending.isLoading || (pending.data ?? []).length === 0) return null;
  const rows = pending.data!;
  const bills = rows.reduce((n, r) => n + (r.refresh_pairs?.length ?? 0), 0);

  return (
    <Card role="alert" className="border-hec-warn/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-hec-warn" />
          {rows.length} {rows.length === 1 ? "change has" : "changes have"} bills that were not worked out again
        </CardTitle>
        <CardDescription>
          A discount, fee, enrolment or lesson change was saved, but repricing the {bills} bill(s) it touches failed. Until
          it is finished those bills may still show the old figures. This month's and last month's are saved every hour;
          finishing the change here works out every one of them and records it on the change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-hec-small">
          {rows.slice(0, 10).map((r) => (
            <li key={`${r.kind}-${r.override_id}`} className="flex flex-wrap gap-x-2">
              <span>{r.label}</span>
              <span className="text-hec-ink-soft">
                {dayjs(r.created_at).tz().format("D MMM HH:mm")} · {[...new Set((r.refresh_pairs ?? []).map((p) => p.month))].sort().join(", ")}
              </span>
            </li>
          ))}
          {rows.length > 10 && <li className="text-hec-ink-soft">and {rows.length - 10} more</li>}
        </ul>
        <Button onClick={finish} disabled={running} variant="outline" className="gap-2">
          {running ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden className="h-4 w-4" />}
          {running ? "Working the bills out again..." : rows.length === 1 ? "Finish this change" : `Finish these ${rows.length} changes`}
        </Button>
      </CardContent>
    </Card>
  );
}
