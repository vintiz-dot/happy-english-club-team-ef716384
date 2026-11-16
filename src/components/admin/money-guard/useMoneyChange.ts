import { useCallback, useState } from "react";
import { canSubmitMoney, moneyAck, moneyErrorText, type MoneyForm, type MoneyPlan } from "@/lib/moneyGuard";
import { confirmMoneyChange, previewMoneyChange, refreshMoneyChange, type MoneyError } from "./api";
import { approvalErrorText, canRequestMoneyApproval, moneyApprovalParams } from "@/lib/approvals";
import { requestApproval as requestApprovalRpc } from "@/components/admin/approvals/api";

export interface MoneyRequest {
  entity: string;
  op: string;
  args: Record<string, unknown>;
}

const EMPTY: MoneyForm = { reason: "", confirm: false, correctionReason: "" };

/**
 * The money guard's two steps for one change: a preview (from a screen's 409
 * or asked for directly), then the admin's confirmation through
 * money_change_checked, then the bill refresh. Holds no rule of its own.
 */
export function useMoneyChange(onDone?: (result: any) => void) {
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [plan, setPlan] = useState<MoneyPlan | null>(null);
  const [form, setForm] = useState<MoneyForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const open = useCallback((req: MoneyRequest, preview?: MoneyPlan | null) => {
    setRequest(req);
    setForm(EMPTY);
    setError(null);
    setNotice(null);
    if (preview) {
      setPlan(preview);
      return;
    }
    setBusy(true);
    previewMoneyChange(req.entity, req.op, req.args).then((r) => {
      setBusy(false);
      if ("error" in r) setError(moneyErrorText(r.error.code, r.error.kind, r.error.message));
      else setPlan(r.plan);
    });
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    setPlan(null);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    if (!request || !plan || !canSubmitMoney(plan, form)) return;
    setBusy(true);
    setError(null);
    const r = await confirmMoneyChange(request.entity, request.op, request.args, moneyAck(plan, form));
    if ("error" in r) {
      const e: MoneyError = r.error;
      setError(moneyErrorText(e.code, e.kind, e.message));
      if (e.code === "token_stale") {
        const fresh = await previewMoneyChange(request.entity, request.op, request.args);
        if ("plan" in fresh) setPlan(fresh.plan);
      }
      setBusy(false);
      return;
    }
    const overrideId = r.result?.override_id;
    if (overrideId && Array.isArray(r.result?.refresh_pairs) && r.result.refresh_pairs.length > 0) {
      const t = await refreshMoneyChange(overrideId);
      setNotice("tuition" in t && t.tuition?.status === "refreshed" ? "refreshed" : "partial");
    }
    setBusy(false);
    onDone?.(r.result);
    close();
  }, [request, plan, form, onDone, close]);

  /**
   * D4 step 4: the preview says a second administrator must approve. Sends
   * the change as typed (reason, tick, correction reason, the preview's
   * token) to request_change_approval; nothing is changed until the other
   * administrator approves it. Only offered while approval is switched on.
   */
  const requestApproval = useCallback(async () => {
    if (!request || !plan || !canRequestMoneyApproval(plan, form)) return;
    setBusy(true);
    setError(null);
    const r = await requestApprovalRpc("money", "money_change_checked",
      moneyApprovalParams(request.entity, request.op, request.args, plan, form), plan.token ?? null);
    setBusy(false);
    if ("error" in r) {
      setError(approvalErrorText(r.error.code, r.error.detail));
      return;
    }
    // Not onDone: nothing was changed, so the screen must not report a save.
    setNotice("approval_sent");
    close();
  }, [request, plan, form, close]);

  return { request, plan, form, setForm, busy, error, notice, open, close, submit, canSubmit: canSubmitMoney(plan, form),
           requestApproval, canRequestApproval: canRequestMoneyApproval(plan, form) };
}
