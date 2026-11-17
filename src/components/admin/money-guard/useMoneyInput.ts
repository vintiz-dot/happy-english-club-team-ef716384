import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MoneyPlan } from "@/lib/moneyGuard";
import { inputErrorText, needsInputDialog } from "@/lib/moneyInputs";
import { confirmMoneyChange, previewMoneyChange, refreshMoneyChange } from "./api";
import { useMoneyChange, type MoneyRequest } from "./useMoneyChange";
import { toast } from "@/hooks/use-toast";
import { parseReasons, reasonSentence } from "@/lib/approvals";

/**
 * The money guard for the money-input screens (D4 step 3B), on top of
 * useMoneyChange. A screen describes ONE change (entity, op, args) and calls
 * run():
 *   - the server previews it (money_change_preview, as the signed-in admin);
 *   - tier 0: it is confirmed straight away through money_change_checked -
 *     no dialog, and one row is still written;
 *   - tier 1+: the dialog opens with the server's preview; the admin's
 *     reason and confirmation go through the same RPC.
 * Nothing is decided here: no tier, no figure, no fallback write.
 */
export type RunResult =
  | { status: "done"; result: any; unchanged?: boolean }
  | { status: "dialog" }
  | { status: "refused"; code: string; message: string };

export function useMoneyInput(onDone?: (result: any, request: MoneyRequest) => void) {
  const last = useRef<MoneyRequest | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  // changes still waiting for their own dialog (runMany): one at a time
  const pending = useRef<MoneyRequest[]>([]);
  const drain = useRef<() => Promise<void>>(async () => {});
  const guard = useMoneyChange((result) => {
    if (last.current) done.current?.(result, last.current);
    void drain.current();
  }, () => {
    // review N-6: a change sent for approval stops the queue; say what was not made
    const left = pending.current.length;
    pending.current = [];
    if (left > 0) {
      toast({ title: `${left} more ${left === 1 ? "change was" : "changes were"} not made`,
              description: "The list stopped at the change sent for approval. Nothing else in it was changed: make the rest again." });
    }
  });
  const [running, setRunning] = useState(false);
  const { open } = guard;

  const run = useCallback(async (request: MoneyRequest): Promise<RunResult> => {
    setRunning(true);
    try {
      const p = await previewMoneyChange(request.entity, request.op, request.args);
      if ("error" in p) {
        return { status: "refused", code: p.error.code, message: inputErrorText(p.error.code, p.error.message) };
      }
      const plan: MoneyPlan = p.plan;
      if (plan.refuse_code === "nothing_to_change") return { status: "done", result: null, unchanged: true };
      if (!plan.allowed) {
        const code = String(plan.refuse_code ?? "refused");
        return { status: "refused", code, message: inputErrorText(code) };
      }
      if (needsInputDialog(plan)) {
        last.current = request;
        open(request, plan);
        return { status: "dialog" };
      }
      const r = await confirmMoneyChange(request.entity, request.op, request.args,
        { reason: null, token: plan.token ?? null, confirm: false, correction_reason: null });
      if ("error" in r) {
        return { status: "refused", code: r.error.code, message: inputErrorText(r.error.code, r.error.message) };
      }
      if (r.result?.override_id && Array.isArray(r.result?.refresh_pairs) && r.result.refresh_pairs.length > 0) {
        await refreshMoneyChange(r.result.override_id);
      }
      return { status: "done", result: r.result };
    } finally {
      setRunning(false);
    }
  }, [open]);

  drain.current = async () => {
    while (pending.current.length > 0) {
      const next = pending.current.shift()!;
      const r = await run(next);
      if (r.status === "dialog") return;          // the dialog's own confirmation continues the queue
      if (r.status === "done" && !r.unchanged) done.current?.(r.result, next);
    }
  };

  /**
   * Several changes: the tier-0 ones in one call, then a dialog for each one
   * that needs a reason, one after another. Closing a dialog without
   * confirming stops the queue; nothing in it was changed.
   */
  const runMany = useCallback(async (items: BulkItem[]): Promise<BulkOutcome> => {
    setRunning(true);
    let out: BulkOutcome;
    try {
      out = await runMoneyBulk(items);
    } finally {
      setRunning(false);
    }
    if (!out.error && out.needReason.length > 0) {
      pending.current = [...out.needReason];
      await drain.current();
    }
    return out;
  }, []);

  /** Open the dialog with a preview an edge function already returned (its 409 body). */
  const openDialog = useCallback((request: MoneyRequest, plan: MoneyPlan) => {
    last.current = request;
    open(request, plan);
  }, [open]);

  return { guard, run, runMany, openDialog, running };
}

export interface BulkItem {
  entity: string;
  op: string;
  args: Record<string, unknown>;
}

export interface BulkOutcome {
  done: number;
  unchanged: number;
  /** Items the server will only make with their own reason: open them one at a time. */
  needReason: BulkItem[];
  refused: Array<{ item: BulkItem; message: string }>;
  error?: string;
}

/**
 * Many tier-0 changes at once (money_changes_checked_bulk, 50 a call, one
 * batch id). Every item is previewed first; an item that needs a reason is
 * NOT sent - it is returned in needReason for the screen to open singly.
 */
export async function runMoneyBulk(items: BulkItem[]): Promise<BulkOutcome> {
  const out: BulkOutcome = { done: 0, unchanged: 0, needReason: [], refused: [] };
  const ready: Array<BulkItem & { token: string | null }> = [];
  for (const item of items) {
    const p = await previewMoneyChange(item.entity, item.op, item.args);
    if ("error" in p) {
      if (p.error.code === "guard_not_installed" || p.error.code === "forbidden") {
        out.error = inputErrorText(p.error.code, p.error.message);
        return out;
      }
      out.refused.push({ item, message: inputErrorText(p.error.code, p.error.message) });
    } else if (p.plan.refuse_code === "nothing_to_change") out.unchanged += 1;
    else if (!p.plan.allowed) out.refused.push({ item, message: inputErrorText(String(p.plan.refuse_code ?? "refused")) });
    else if (needsInputDialog(p.plan)) out.needReason.push(item);
    else ready.push({ ...item, token: p.plan.token ?? null });
  }
  const batchId = crypto.randomUUID();
  for (let i = 0; i < ready.length; i += 50) {
    const chunk = ready.slice(i, i + 50);
    const { data, error } = await (supabase as any).rpc("money_changes_checked_bulk", {
      p_items: chunk, p_reason: null, p_batch_id: batchId, p_context: { source: "screen" },
    });
    if (error) {
      // HC060: the preview said no approval, the database (a moment later) said yes - review M-3
      out.error = String(error.code ?? "") === "HC060"
        ? `${reasonSentence(parseReasons(String(error.details ?? "")))} The rest of the list was not made${out.done ? `; the ${out.done} made before it stay made` : ""}. Make the remaining changes one at a time to send them for approval.`
        : inputErrorText(null, String(error.message ?? ""));
      return out;
    }
    out.done += Array.isArray(data?.done) ? data.done.length : 0;
    for (const d of data?.done ?? []) {
      if (d?.override_id && Array.isArray(d?.refresh_pairs) && d.refresh_pairs.length > 0) await refreshMoneyChange(d.override_id);
    }
    for (const r of data?.refused ?? []) {
      const item = chunk[Number(r.index) - 1];
      // the bill moved between the preview and now: it needs a reason after all
      if (item && (r.code === "HC010" || r.code === "HC012" || r.code === "HC017")) out.needReason.push(item);
      else if (item) out.refused.push({ item, message: inputErrorText(r.code === "HC015" ? String(r.message) : null, String(r.message ?? "")) });
    }
  }
  return out;
}
