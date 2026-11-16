import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatVnd } from "@/lib/sessionGuard";
import { moneyErrorText } from "@/lib/moneyGuard";
import {
  CLASS_FEE_COPY,
  CLASS_FEE_REFUSALS,
  feeChangeSummary,
  feeRowsForList,
  firstOfMonth,
  isPastMonth,
  nextMonth,
  parseFee,
  type FeeRow,
} from "@/lib/classFee";
import { confirmMoneyChange, previewMoneyChange, refreshMoneyChange } from "@/components/admin/money-guard/api";
import { useMoneyChange, type MoneyRequest } from "@/components/admin/money-guard/useMoneyChange";
import { MoneyGuardDialog } from "@/components/admin/money-guard/MoneyGuardDialog";

/**
 * A class's fee as a HISTORY (D4 step 2): one fee per month it changed, plus
 * the fee the class started with. Every change goes through the money guard
 * as ('class_fee', 'set' | 'remove'): a fee from a later month reaches no bill
 * and is saved at once (still one recorded change); one dated in a month
 * already billed opens the guard's dialog with the bills it reaches, a reason
 * and a tick. No figure is worked out here: the tier and the reached bills
 * come from money_change_preview; the bills are worked out again on the server.
 */
const feeTable = () => (supabase as any).from("class_fee_history");
const todayHanoi = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export default function ClassFeeHistory({ classId }: { classId: string }) {
  const queryClient = useQueryClient();
  const today = todayHanoi();
  const [month, setMonth] = useState(nextMonth(today));
  const [feeText, setFeeText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [dialogText, setDialogText] = useState<{ title: string; intro: string; submit: string; done: string } | null>(null);

  const history = useQuery({
    queryKey: ["class-fee-history", classId],
    queryFn: async () => {
      const { data, error } = await feeTable()
        .select("effective_from, session_rate_vnd, note, created_at")
        .eq("class_id", classId)
        .order("effective_from", { ascending: true });
      if (error) {
        const missing = error.code === "42P01" || error.code === "PGRST205";
        return { rows: [] as FeeRow[], missing, failed: !missing };
      }
      return { rows: (data ?? []) as FeeRow[], missing: false, failed: false };
    },
  });

  const afterChange = (text: string) => {
    setMessage(text);
    queryClient.invalidateQueries({ queryKey: ["class-fee-history", classId] });
    queryClient.invalidateQueries({ queryKey: ["class", classId] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
  };

  const guard = useMoneyChange(() => {
    if (dialogText) {
      afterChange(dialogText.done);
      toast.success(dialogText.done);
    }
    setFeeText("");
    setNote("");
  });

  const refusal = (code: string | null | undefined, kind?: string | null, fallback?: string) =>
    (code && CLASS_FEE_REFUSALS[code]) || (kind && CLASS_FEE_REFUSALS[kind]) || moneyErrorText(code, kind, fallback);

  const loadNames = async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from("students").select("id, full_name").in("id", ids);
    setNames(Object.fromEntries((data ?? []).map((s: any) => [s.id, s.full_name])));
  };

  /** Preview; at tier 0 confirm at once (one recorded change, no dialog); above it, the dialog. */
  const run = async (req: MoneyRequest, text: { title: string; submit: string; done: string }) => {
    setBusy(true);
    setMessage(null);
    try {
      const p = await previewMoneyChange(req.entity, req.op, req.args);
      if ("error" in p) {
        setMessage(refusal(p.error.code, p.error.kind, p.error.message));
        return;
      }
      const plan: any = p.plan;
      if (!plan.allowed) {
        setMessage(refusal(plan.refuse_code));
        return;
      }
      if (plan.tier === 0 && !plan.approval?.required) {
        const r = await confirmMoneyChange(req.entity, req.op, req.args, { reason: null, token: plan.token, confirm: false, correction_reason: null });
        if ("error" in r) {
          setMessage(refusal(r.error.code, r.error.kind, r.error.message));
          return;
        }
        let done = text.done;
        if (r.result?.override_id && Array.isArray(r.result?.refresh_pairs) && r.result.refresh_pairs.length > 0) {
          const t = await refreshMoneyChange(r.result.override_id);
          done += ` ${"tuition" in t && t.tuition?.status === "refreshed" ? CLASS_FEE_COPY.refreshed : CLASS_FEE_COPY.refreshPartial}`;
        }
        afterChange(done);
        toast.success(done);
        setFeeText("");
        setNote("");
        return;
      }
      await loadNames(Array.isArray(plan.student_ids) ? plan.student_ids : []);
      setDialogText({ ...text, intro: CLASS_FEE_COPY.intro(feeChangeSummary(plan, formatVnd)) });
      guard.open(req, plan);
    } finally {
      setBusy(false);
    }
  };

  const fee = parseFee(feeText);
  const canSave = !busy && !!month && fee !== null && !history.data?.missing;

  const save = () => {
    if (fee === null) return;
    const from = firstOfMonth(month);
    run(
      { entity: "class_fee", op: "set", args: { class_id: classId, effective_from: from, session_rate_vnd: fee, note: note.trim() || null } },
      { title: CLASS_FEE_COPY.setTitle, submit: CLASS_FEE_COPY.submitSet, done: CLASS_FEE_COPY.saved(from) },
    );
  };
  const remove = (effectiveFrom: string) => {
    const from = effectiveFrom.slice(0, 10);
    run(
      { entity: "class_fee", op: "remove", args: { class_id: classId, effective_from: from } },
      { title: CLASS_FEE_COPY.removeTitle, submit: CLASS_FEE_COPY.submitRemove, done: CLASS_FEE_COPY.removed(from) },
    );
  };

  const rows = feeRowsForList(history.data?.rows ?? [], today);

  return (
    <div className="space-y-3">
      <div>
        <Label>{CLASS_FEE_COPY.heading}</Label>
        <p className="text-xs text-muted-foreground">{CLASS_FEE_COPY.explain}</p>
      </div>

      {history.data?.missing && <p className="text-sm text-muted-foreground">{CLASS_FEE_COPY.notInstalled}</p>}
      {history.data?.failed && <p role="alert" className="text-sm text-destructive">{CLASS_FEE_COPY.loadFailed}</p>}

      {rows.length > 0 && (
        <ul className="space-y-1.5" aria-label="Fee history">
          {rows.map((r) => (
            <li key={r.effective_from} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <span className="min-w-0 break-words">
                <span className="font-medium">From {r.from}</span>
                {r.untilNext ? <span className="text-muted-foreground"> (until {r.untilNext})</span> : null}
                {": "}
                <span className="tabular-nums">{formatVnd(r.session_rate_vnd)}</span> a lesson
                {r.now ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">now</span> : null}
                {r.upcoming ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">not in force yet</span> : null}
                {r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}
              </span>
              {!r.baseline && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => remove(r.effective_from)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!history.data?.missing && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`fee-month-${classId}`}>From the month</Label>
              <Input id={`fee-month-${classId}`} type="month" value={month} onChange={(e) => setMonth(e.target.value || nextMonth(today))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`fee-amount-${classId}`}>Fee per lesson (VND)</Label>
              <Input id={`fee-amount-${classId}`} inputMode="numeric" value={feeText} onChange={(e) => setFeeText(e.target.value)} placeholder="e.g. 220000" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`fee-note-${classId}`}>Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id={`fee-note-${classId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="New term" maxLength={500} />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPastMonth(month, today) ? CLASS_FEE_COPY.pastWarning(firstOfMonth(month))
              : month === today.slice(0, 7) ? CLASS_FEE_COPY.thisMonthNote(firstOfMonth(month))
              : CLASS_FEE_COPY.futureNote(firstOfMonth(month))}
          </p>
          <Button onClick={save} disabled={!canSave} className="w-full">
            {busy ? "Checking..." : CLASS_FEE_COPY.newFee(firstOfMonth(month))}
          </Button>
        </div>
      )}

      {message && <p role="status" className="rounded-xl border border-border p-3 text-sm break-words">{message}</p>}

      <MoneyGuardDialog
        guard={guard}
        names={names}
        title={dialogText?.title}
        intro={dialogText?.intro}
        submitLabel={dialogText?.submit}
      />
    </div>
  );
}
