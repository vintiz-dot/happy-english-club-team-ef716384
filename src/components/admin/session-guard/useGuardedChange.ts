import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  checkReason,
  cleanReason,
  isSessionRelatedQuery,
  requirementsFor,
  stalePreviewDiff,
  type Consequences,
  type GuardErrorBody,
  type GuardForm,
  type GuardOp,
  type GuardPreview,
} from "@/lib/sessionGuard";
import { manageSession } from "./api";

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
export function useGuardedChange({ open, sessionId, op, change, figures }: Options) {
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
        const res = await manageSession<GuardSuccess>(op, data);
        if (!res.ok) {
          const err = res.error;
          if (err.code === "token_stale") {
            // Never retried silently: show the fresh preview and ask again.
            const fresh = err.preview && typeof err.preview === "object" ? (err.preview as GuardPreview) : null;
            setStaleNonce((n) => n + 1);
            setError(null);
            if (fresh) {
              setStale(stalePreviewDiff(p, fresh));
              setPreview(fresh);
              setPhase("ready");
            } else {
              await load();
              setStale(["Something recorded against this lesson changed."]);
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
    [op, sessionId, change, load, invalidate],
  );

  const retryRefresh = useCallback(async () => {
    const overrideId = success?.result?.override_id;
    if (!overrideId) return;
    setRetry({ busy: true });
    const res = await manageSession<{ tuition: any }>("refresh-tuition", { override_id: overrideId });
    if (!res.ok) {
      setRetry({ busy: false, error: res.error });
      return;
    }
    setRetry({ busy: false, tuition: res.data.tuition });
    setSuccess((s) => (s ? { ...s, tuition: res.data.tuition } : s));
    invalidate();
  }, [success, invalidate]);

  return { phase, preview, consequences, error, stale, staleNonce, success, retry, reload: load, submit, retryRefresh, invalidate };
}
