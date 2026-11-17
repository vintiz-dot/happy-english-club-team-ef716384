import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  checkReason,
  cleanReason,
  isSessionRelatedQuery,
  requirementsFor,
  stalePreviewDiff,
  UNKNOWN_OUTCOME_CODES,
  type Consequences,
  type GuardErrorBody,
  type GuardForm,
  type GuardOp,
  type GuardPreview,
} from "@/lib/sessionGuard";
import { payDialogFrom, payPreviewRequest, payRequest, type PayForm, type PayOp, type PayPlan } from "@/lib/lessonPayGuard";
import { manageSession, payPreview } from "./api";
import { approvalErrorText, canRequestSessionApproval, moneyApprovalParams, sessionApprovalRequest } from "@/lib/approvals";
import { requestApproval as requestApprovalRpc } from "@/components/admin/approvals/api";

export interface MoveChange {
  date: string;
  start_time: string;
  end_time: string;
}

export type GuardPhase = "idle" | "loading" | "ready" | "submitting" | "done" | "failed";

export interface GuardSuccess {
  result?: any;
  tuition?: any;
  kind?: string | null;
  applied?: string;
  unchanged?: boolean;
}

interface Options {
  open: boolean;
  sessionId: string;
  op: GuardOp;
  change?: MoveChange;
  /** Skip the (slow) figures fetch. */
  figures?: boolean;
  /**
   * D4 step 3A (review S-1): the change was refused for lesson pay (a 409
   * requires_checked_path with a pay kind and the money preview, e.g. the
   * time of a lesson more than a week old). Given, the dialog hands the
   * change over to the lesson-pay check instead of showing an error.
   */
  onPayCheck?: (d: { op: PayOp; plan: PayPlan }) => void;
}

/**
 * Runs preview -> confirm for one lesson.
 *
 * - Fetches a FRESH preview every time the dialog opens; nothing is cached.
 * - A stale token (409 token_stale) never retries on its own: the fresh
 *   preview from the error replaces the old one and the confirmation fields
 *   must be given again (`staleNonce` changes so the form clears them).
 * - Every other error stays on screen with its code; nothing is assumed done.
 */
export function useGuardedChange({ open, sessionId, op, change, figures, onPayCheck }: Options) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<GuardPhase>("idle");
  const [preview, setPreview] = useState<GuardPreview | null>(null);
  const [consequences, setConsequences] = useState<Consequences | null>(null);
  const [error, setError] = useState<GuardErrorBody | null>(null);
  const [stale, setStale] = useState<string[] | null>(null);
  const [staleNonce, setStaleNonce] = useState(0);
  const [success, setSuccess] = useState<GuardSuccess | null>(null);
  const [retry, setRetry] = useState<{ busy: boolean; tuition?: any; error?: GuardErrorBody | null }>({ busy: false });
  const seq = useRef(0);
  const previewRef = useRef<GuardPreview | null>(null);
  previewRef.current = preview;
  const submitting = useRef(false);
  const retrying = useRef(false);
  const payCheckRef = useRef(onPayCheck);
  payCheckRef.current = onPayCheck;

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ predicate: (q) => isSessionRelatedQuery(q.queryKey) });
  }, [qc]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setPhase("loading");
    setError(null);
    setStale(null);
    setPreview(null);
    setConsequences(null);
    setSuccess(null);
    const data: Record<string, unknown> = { id: sessionId, op };
    if (op === "move" && change) data.change = change;
    if (figures === false) data.figures = false;
    const res = await manageSession<{ preview: GuardPreview; consequences: Consequences }>("preview", data);
    if (mine !== seq.current) return;
    if (!res.ok) {
      setError(res.error);
      setPhase("failed");
      return;
    }
    if (!res.data.preview || typeof res.data.preview !== "object") {
      setError({ ok: false, code: "unexpected", message: "The check returned nothing readable." });
      setPhase("failed");
      return;
    }
    setPreview(res.data.preview);
    setConsequences(res.data.consequences ?? null);
    setPhase("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, op, change?.date, change?.start_time, change?.end_time, figures]);

  useEffect(() => {
    if (!open) {
      seq.current++;
      setPhase("idle");
      setPreview(null);
      setConsequences(null);
      setError(null);
      setStale(null);
      setSuccess(null);
      setRetry({ busy: false });
      return;
    }
    void load();
    return () => {
      seq.current++;
    };
  }, [open, load]);

  const submit = useCallback(
    async (form: GuardForm) => {
      const p = previewRef.current;
      if (!p || submitting.current) return;
      submitting.current = true;
      setPhase("submitting");
      setError(null);
      try {
        const req = requirementsFor(p);
        const unguarded = op === "move" && p.kind === null;
        const data: Record<string, unknown> = { id: sessionId };
        if (op === "move" && change) Object.assign(data, change);
        if (!unguarded) {
          data.token = p.token;
          data.reason = cleanReason(form.reason);
          if (req.confirm && form.confirm) data.confirm = true;
          if (req.correctionReason && checkReason(form.correctionReason, req.reasonMin).ok) data.correction_reason = cleanReason(form.correctionReason);
        }
        const opened = seq.current;
        const res = await manageSession<GuardSuccess>(op, data);
        if (opened !== seq.current) {
          // The dialog was closed (or re-opened) while the request ran. Claim
          // nothing on a screen that is gone; the lists behind it are refreshed
          // so they show whatever really happened.
          invalidate();
          return;
        }
        if (!res.ok) {
          const err = res.error;
          if (UNKNOWN_OUTCOME_CODES.has(err.code)) {
            // The change may have reached the database before the answer was lost.
            setError({ ...err, outcome_unknown: true });
            setPhase("failed");
            invalidate();
            return;
          }
          if (err.code === "token_stale") {
            // Never retried silently: show the fresh preview and ask again.
            const fresh = err.preview && typeof err.preview === "object" ? (err.preview as GuardPreview) : null;
            setStaleNonce((n) => n + 1);
            setError(null);
            if (fresh) {
              setStale(stalePreviewDiff(p, fresh));
              setPreview(fresh);
              // The body carries fresh consequences beside the fresh preview (a bill
              // that changed is exactly why the token went stale). Without them the
              // old bills must not stay on screen: show "not available" instead.
              setConsequences(err.consequences && typeof err.consequences === "object" ? (err.consequences as Consequences) : null);
              setPhase("ready");
            } else {
              await load();
              setStale(["Something recorded against this lesson changed."]);
            }
            return;
          }
          // Refused for lesson pay: nothing was written; the lesson-pay check takes over.
          const pay = payCheckRef.current ? payDialogFrom(err) : null;
          if (pay) {
            setPhase("ready");
            payCheckRef.current?.(pay);
            return;
          }
          setError(err);
          setPhase("ready");
          return;
        }
        setSuccess(res.data);
        setPhase("done");
        invalidate();
      } finally {
        submitting.current = false;
      }
    },
    [op, sessionId, change, load, invalidate],
  );

  const retryRefresh = useCallback(async () => {
    const overrideId = success?.result?.override_id;
    if (!overrideId || retrying.current) return;
    retrying.current = true;
    setRetry({ busy: true });
    const opened = seq.current;
    const res = await manageSession<{ tuition: any }>("refresh-tuition", { override_id: overrideId });
    retrying.current = false;
    if (opened !== seq.current) {
      invalidate();
      return;
    }
    if (!res.ok) {
      setRetry({ busy: false, error: res.error });
      return;
    }
    setRetry({ busy: false, tuition: res.data.tuition });
    setSuccess((s) => (s ? { ...s, tuition: res.data.tuition } : s));
    invalidate();
  }, [success, invalidate]);

  /**
   * D4 step 4: the change was refused with approval_required (HC060: a second
   * administrator must approve it). Sends D2's own checked function with the
   * arguments as typed and this preview's token to request_change_approval;
   * the lesson is not touched until the other administrator approves.
   */
  const [approval, setApproval] = useState<{ busy: boolean; sent?: string; error?: string } | null>(null);
  const requestApproval = useCallback(async (form: GuardForm) => {
    const p = previewRef.current;
    const built = p ? sessionApprovalRequest(op, sessionId, form, op === "move" ? change ?? null : null) : null;
    if (!p || !built || !canRequestSessionApproval(form)) return;
    setApproval({ busy: true });
    const r = await requestApprovalRpc("session", built.rpc, built.params, p.token ?? null);
    if ("error" in r) setApproval({ busy: false, error: approvalErrorText(r.error.code, r.error.detail) });
    else setApproval({ busy: false, sent: r.data.request_id });
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, sessionId, change?.date, change?.start_time, change?.end_time, invalidate]);
  useEffect(() => { if (!open) setApproval(null); }, [open]);

  return { phase, preview, consequences, error, stale, staleNonce, success, retry, reload: load, submit, retryRefresh, invalidate,
           requestApproval, approval };
}

/**
 * D4 step 3A: preview -> confirm for one lesson-pay op (un-hold, hold, the
 * teacher, the times, the assistants, a lesson created after it started).
 * Same rules as useGuardedChange: a FRESH preview each time the dialog
 * opens; a stale token shows the fresh preview and asks again, never
 * retried silently; every other error stays on screen with its code.
 */
export function useGuardedPayChange({ open, op, args }: { open: boolean; op: PayOp; args: Record<string, unknown> }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<GuardPhase>("idle");
  const [plan, setPlan] = useState<PayPlan | null>(null);
  const [error, setError] = useState<GuardErrorBody | null>(null);
  const [stale, setStale] = useState(false);
  const [staleNonce, setStaleNonce] = useState(0);
  const [success, setSuccess] = useState<GuardSuccess | null>(null);
  const seq = useRef(0);
  const planRef = useRef<PayPlan | null>(null);
  planRef.current = plan;
  const submitting = useRef(false);
  const argsKey = JSON.stringify(args ?? {});

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ predicate: (q) => isSessionRelatedQuery(q.queryKey) });
  }, [qc]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setPhase("loading");
    setError(null);
    setStale(false);
    setPlan(null);
    setSuccess(null);
    const res = await payPreview(payPreviewRequest(op, JSON.parse(argsKey)));
    if (mine !== seq.current) return;
    if (!res.ok) {
      setError(res.error);
      setPhase("failed");
      return;
    }
    if (!res.data.preview || typeof res.data.preview !== "object") {
      setError({ ok: false, code: "unexpected", message: "The check returned nothing readable." });
      setPhase("failed");
      return;
    }
    setPlan(res.data.preview as PayPlan);
    setPhase("ready");
  }, [op, argsKey]);

  useEffect(() => {
    if (!open) {
      seq.current++;
      setPhase("idle");
      setPlan(null);
      setError(null);
      setStale(false);
      setSuccess(null);
      return;
    }
    void load();
    return () => {
      seq.current++;
    };
  }, [open, load]);

  const submit = useCallback(
    async (form: PayForm) => {
      const p = planRef.current;
      if (!p || submitting.current) return;
      submitting.current = true;
      setPhase("submitting");
      setError(null);
      try {
        const { action, data } = payRequest(p, form);
        const opened = seq.current;
        const res = await manageSession<GuardSuccess>(action, data);
        if (opened !== seq.current) {
          invalidate();
          return;
        }
        if (!res.ok) {
          const err = res.error;
          if (UNKNOWN_OUTCOME_CODES.has(err.code)) {
            setError({ ...err, outcome_unknown: true });
            setPhase("failed");
            invalidate();
            return;
          }
          if (err.code === "token_stale") {
            setStaleNonce((n) => n + 1);
            setError(null);
            setStale(true);
            if (err.preview && typeof err.preview === "object") {
              setPlan(err.preview as unknown as PayPlan);
              setPhase("ready");
            } else {
              await load();
              setStale(true);
            }
            return;
          }
          setError(err);
          setPhase("ready");
          return;
        }
        setSuccess(res.data);
        setPhase("done");
        invalidate();
      } finally {
        submitting.current = false;
      }
    },
    [load, invalidate],
  );

  /**
   * D4 step 4 (review M-3): the pay change was refused with approval_required.
   * Sends the checked money op ('session', op) with the arguments as previewed,
   * the form as typed and the preview's token to request_change_approval;
   * nothing changes until another administrator approves it (and the approval
   * then works out its bills, as this dialog's own confirm does).
   */
  const [approval, setApproval] = useState<{ busy: boolean; sent?: string; error?: string } | null>(null);
  useEffect(() => { if (!open) setApproval(null); }, [open]);
  const requestApproval = useCallback(async (form: PayForm) => {
    const p = planRef.current;
    if (!p) return;
    setApproval({ busy: true });
    const params = moneyApprovalParams("session", String(p.op ?? op), (p.args ?? {}) as Record<string, unknown>, p as any,
      { reason: form.reason, confirm: form.confirm, correctionReason: form.correctionReason });
    const r = await requestApprovalRpc("money", "money_change_checked", params, p.token ?? null);
    if ("error" in r) setApproval({ busy: false, error: approvalErrorText(r.error.code, r.error.detail) });
    else setApproval({ busy: false, sent: r.data.request_id });
  }, [op]);

  return { phase, plan, error, stale, staleNonce, success, reload: load, submit, invalidate, requestApproval, approval };
}
