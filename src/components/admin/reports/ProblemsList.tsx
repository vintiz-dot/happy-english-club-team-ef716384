import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { formatVND } from "@/lib/money";
import { functionErrorMessage } from "@/lib/functionError";
import { functionRefusalText } from "@/lib/moneyGuard";
import { manageSession } from "@/components/admin/session-guard/api";
import { approveClosedBill } from "@/components/admin/reports/approveClosedBill";
import { keepAsCharged, type CheckProblems } from "@/hooks/useCheckProblems";
import { monthName, type Problem, type ProblemAction } from "@/lib/checkProblems";

/**
 * The top of Reports > Checks: every problem the red badge counts, each with what is wrong,
 * why it matters, the figures that show it and the buttons that fix it. The badge is the
 * length of this list (useCheckProblems), so a number in the menu always has its rows here.
 * The cards under it stay as the full detail of each check.
 */
const AREA: Record<Problem["area"], string> = { bill: "Bill", change: "Change not finished", attendance: "Attendance" };

function ProblemCard({ p, busy, run }: { p: Problem; busy: string | null; run: (p: Problem, a: ProblemAction, reason?: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const mine = busy?.startsWith(p.key + "#");
  const approve = p.actions.find((a) => a.kind === "approve_closed");

  const label = (a: ProblemAction): string => {
    switch (a.kind) {
      case "save_bill": return `Save the ${monthName(a.month)} bill`;
      case "approve_closed": return `Approve today's figure (${formatVND(a.row.newTotal)})`;
      case "keep_closed": return "Keep as charged";
      case "finish_change": return "Finish the change";
      case "mark_present": return `Mark ${a.studentName} present`;
      case "open": return a.label;
    }
  };

  return (
    <li className="space-y-3 rounded-hec-md border border-hec-line bg-hec-surface p-4">
      <div className="space-y-1">
        <div className="text-hec-caption font-semibold uppercase tracking-wide text-hec-ink-soft">{AREA[p.area]}</div>
        <div className="font-semibold">{p.title}</div>
      </div>

      <div className="text-hec-small">
        <span className="font-medium">Why it matters: </span>
        {p.why}
      </div>

      <dl className="grid gap-x-4 gap-y-1 rounded-hec-md bg-hec-sunken p-3 text-hec-small sm:grid-cols-[max-content_1fr]">
        {p.evidence.map((e) => (
          <div key={e.label} className="contents">
            <dt className="text-hec-ink-soft">{e.label}</dt>
            <dd className="tabular-nums">{e.value}</dd>
          </div>
        ))}
      </dl>

      {p.reasons.length > 0 && (
        <div className="text-hec-small">
          <div className="font-medium">What changed since it was charged</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {p.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="text-hec-small">
        <span className="font-medium">What to do: </span>
        {p.fix}
      </div>

      {approving && approve && (
        <div className="space-y-2">
          <label htmlFor={`reason-${p.key}`} className="text-hec-small font-medium">Why should the bill change? (recorded on the bill)</label>
          <Textarea id={`reason-${p.key}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!!busy || reason.trim().length < 3} onClick={() => run(p, approve, reason.trim())}>
              {mine ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Approve with this reason
            </Button>
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setApproving(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {!approving && (
        <div className="flex flex-wrap gap-2">
          {p.actions.map((a, i) =>
            a.kind === "open" ? (
              <Button key={i} size="sm" variant="ghost" asChild>
                <Link to={a.href}>{a.label}</Link>
              </Button>
            ) : (
              <Button
                key={i}
                size="sm"
                variant={i === 0 ? "default" : "outline"}
                disabled={!!busy}
                onClick={() => (a.kind === "approve_closed" ? setApproving(true) : run(p, a))}
                className="gap-2"
              >
                {busy === `${p.key}#${a.kind}` && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {label(a)}
              </Button>
            ),
          )}
        </div>
      )}
    </li>
  );
}

export function ProblemsList({ checks }: { checks: CheckProblems }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState(20);

  const refresh = () =>
    Promise.all(
      [["tuition-bill-gaps"], ["tuition-bill-check-run"], ["pending-change-bills"], ["attendance-evidence-gaps"], ["closed-bill-verdicts"], ["admin-tuition-list"]].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const run = async (p: Problem, a: ProblemAction, reason?: string) => {
    setBusy(`${p.key}#${a.kind}`);
    try {
      if (a.kind === "save_bill") {
        const { data, error } = await supabase.functions.invoke("calculate-tuition", { body: { studentId: a.studentId, month: a.month } });
        if (error) throw new Error(await functionErrorMessage(error, "The bill was not saved"));
        if (data?.error) throw new Error(data.error);
        if (data?.held) toast.info(data.held.message ?? "The bill is held as charged; it was not changed.");
        else toast.success(`Saved: ${formatVND(Number(data?.totalAmount ?? 0))} to pay for ${monthName(a.month)}.`);
      } else if (a.kind === "approve_closed") {
        const r = await approveClosedBill(a.row, reason ?? "");
        if (r.changed) toast.success(`${a.row.name}, ${monthName(a.row.month)}: now ${formatVND(r.total)}`);
        else toast.info(r.message);
      } else if (a.kind === "keep_closed") {
        keepAsCharged(a.keepKey);
        toast.success("Kept as charged. It comes back here only if the figures change again.");
      } else if (a.kind === "finish_change") {
        let status: string | undefined;
        if (a.changeKind === "money") {
          const { data, error } = await supabase.functions.invoke("guarded-change-refresh", { body: { action: "refresh", override_id: a.overrideId } });
          if (error) throw new Error(await functionErrorMessage(error, "refused"));
          status = data?.tuition?.status;
        } else {
          const res = await manageSession<{ tuition?: { status?: string } }>("refresh-tuition", { override_id: a.overrideId });
          if (!res.ok) throw new Error(res.error.message);
          status = res.data.tuition?.status;
        }
        if (status === "refreshed" || status === "none") toast.success("Finished: every bill it touches is worked out again.");
        else toast.warning(`Not finished: ${status ?? "no answer"}`);
      } else if (a.kind === "mark_present") {
        const { data, error } = await supabase.functions.invoke("mark-attendance", {
          body: { sessionId: a.sessionId, studentId: a.studentId, status: "Present" },
        });
        if (error) throw new Error(await functionRefusalText(error, "The mark could not be saved"));
        if (data?.error) throw new Error(data.error);
        if (a.currentStatus === "Excused") {
          // Excused was not billed; Present is. Work the bill out again, as this admin.
          const { data: bill, error: billError } = await supabase.functions.invoke("calculate-tuition", { body: { studentId: a.studentId, month: a.month } });
          if (billError || bill?.error) toast.warning(`${a.studentName} marked present; the ${monthName(a.month)} bill could not be refreshed. Use "Save the bill" when it shows here.`);
          else if (bill?.held || bill?.tuitionFrozen) toast.info(`${a.studentName} marked present. The ${monthName(a.month)} bill is closed or frozen, so it stays as charged.`);
          else toast.success(`${a.studentName} marked present, and the ${monthName(a.month)} bill worked out again.`);
        } else {
          toast.success(`${a.studentName} marked present.`);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "That did not work");
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  if (checks.isLoading && checks.total === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-hec-small text-hec-ink-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Checking {checks.scope}...
        </CardContent>
      </Card>
    );
  }

  const notes = checks.notes.length > 0 && (
    <ul className="space-y-1 text-hec-small text-hec-ink-soft">
      {checks.notes.map((n) => (
        <li key={n} className="flex items-start gap-2">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );

  if (checks.total === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4 text-hec-small">
          <div className="flex items-start gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hec-leaf" />
            <span>
              <span className="font-semibold">Nothing needs you.</span> Checked {checks.scope}.
            </span>
          </div>
          {notes}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="alert" className="border-hec-danger/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-hec-danger" />
          {checks.total === 1 ? "1 problem needs you" : `${checks.total} problems need you`}
        </CardTitle>
        <CardDescription>
          This is everything the red count in the menu stands for. Each problem says why it matters, shows the figures,
          and has the button that fixes it. Checked {checks.scope}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-3">
          {checks.problems.slice(0, shown).map((p) => (
            <ProblemCard key={p.key} p={p} busy={busy} run={run} />
          ))}
        </ol>
        {checks.problems.length > shown && (
          <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 20)}>
            Show more ({checks.problems.length - shown} left)
          </Button>
        )}
        {notes}
      </CardContent>
    </Card>
  );
}
