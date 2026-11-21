import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  actionLabel,
  BLOCKING_CODES,
  canSubmit,
  checkReason,
  COPY,
  errorText,
  longDate,
  OUTCOME_UNKNOWN_TEXT,
  refreshSummary,
  requirementsFor,
  typedDateMatches,
  type GuardOp,
  type GuardPreview,
} from "@/lib/sessionGuard";
import {
  canSubmitPay,
  PAY_COPY,
  payChangeLines,
  payErrorText,
  payEvidencePreview,
  payMeaning,
  payNotes,
  oneChangeText,
  payRequirements,
  type PayOp,
  type PayPlan,
} from "@/lib/lessonPayGuard";
import { EvidenceCards } from "./EvidenceCards";
import { ConsequenceTable, useStudentNames } from "./ConsequenceTable";
import { ConfirmTick, ReasonField, TypedDateField } from "./Fields";
import { useGuardedChange, useGuardedPayChange, type GuardSuccess, type MoveChange } from "./useGuardedChange";
import { approvalErrorText } from "@/lib/approvals";

export interface GuardSessionInfo {
  id: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  classes?: { name?: string } | null;
  class_name?: string;
  teachers?: { full_name?: string } | null;
  teacher_name?: string;
}

interface Props {
  open: boolean;
  session: GuardSessionInfo;
  op: GuardOp;
  change?: MoveChange;
  /** Called when the dialog is dismissed by any route (after success the caller gets `onDone` first). */
  onClose: () => void;
  /** Called once, when the admin leaves the result screen after a change that really happened. */
  onDone?: (s: GuardSuccess) => void;
  /** Delete refused because the lesson has evidence: lets the admin switch to Cancel rather than hit a dead end. */
  onCancelInstead?: () => void;
  figures?: boolean;
  /** D4 step 3A: the change was refused for lesson pay; the caller opens the lesson-pay check (PayGuardDialog). */
  onPayCheck?: (d: { op: PayOp; plan: PayPlan }) => void;
}

const hm = (t?: string) => (t ? t.slice(0, 5) : "");
const ICON = { cancel: Ban, delete: Trash2, move: CalendarClock, uncancel: RotateCcw } as const;
const DONE_TITLE: Record<GuardOp, string> = { cancel: "Lesson cancelled", delete: "Lesson deleted", move: "Lesson moved", uncancel: "Lesson restored" };

/**
 * "Check before cancelling": the one dialog behind cancel, force-cancel,
 * status-to-Canceled, delete, move and un-cancel. It opens by asking the
 * server what the evidence says; nothing is changed until the admin has read
 * it, written a reason and (for strong evidence) typed the lesson's date.
 */
export function GuardDialog({ open, session, op, change, onClose, onDone, onCancelInstead, figures, onPayCheck }: Props) {
  const g = useGuardedChange({ open, sessionId: session.id, op, change, figures, onPayCheck });
  const { phase, preview, consequences, error, stale, staleNonce, success, retry } = g;

  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [typedDate, setTypedDate] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setConfirm(false);
      setCorrectionReason("");
      setTypedDate("");
    }
  }, [open]);

  // A stale screen asks again: the tick and the typed date are cleared (reasons are kept).
  useEffect(() => {
    if (staleNonce > 0) {
      setConfirm(false);
      setTypedDate("");
      // The "changed while you were looking" notice is at the top: bring it into view.
      bodyRef.current?.scrollTo({ top: 0 });
    }
  }, [staleNonce]);

  // Focus never falls to the page when the footer changes: the result screen
  // focuses Done; an error or a stale screen puts it back on Keep lesson.
  useEffect(() => {
    if (!open) return;
    if (phase === "done") doneRef.current?.focus();
    else if (phase === "failed") keepRef.current?.focus();
  }, [open, phase]);
  useEffect(() => {
    if (staleNonce > 0) keepRef.current?.focus();
  }, [staleNonce]);

  const req = requirementsFor(preview);
  const form = { reason, confirm, correctionReason, typedDate };
  const unguarded = op === "move" && preview?.kind === null;
  const busy = phase === "submitting";
  const ready = (phase === "ready" || phase === "submitting") && !!preview;
  const blocked = ready && preview ? !preview.allowed : false;
  const canGo = ready && preview ? (unguarded ? preview.allowed : canSubmit(preview, form)) : false;
  const label = actionLabel(op, preview, change);
  const Icon = ICON[op];
  const header = preview?.session ?? session;
  const className = session.classes?.name ?? session.class_name;
  const teacherName = session.teachers?.full_name ?? session.teacher_name;

  const close = () => {
    if (busy) return;
    if (phase === "done" && success) onDone?.(success);
    onClose();
  };

  // What is still missing, spoken to the screen reader beside the disabled button.
  const missing: string[] = [];
  if (ready && preview && !unguarded && !blocked) {
    if (!checkReason(reason, req.reasonMin).ok) missing.push("write a reason");
    if (req.correctionReason && !checkReason(correctionReason, req.reasonMin).ok) missing.push("write the correction reason");
    if (req.confirm && !confirm) missing.push("tick the confirmation");
    if (req.typedDate && !typedDateMatches(typedDate, preview.session.date)) missing.push("type the lesson date");
  }

  const refusal = preview && !preview.allowed ? preview.refuse_code ?? "bad_change" : null;
  const useCancel = refusal === "use_cancel" || error?.code === "use_cancel";
  const blockingError = error && BLOCKING_CODES.has(error.code);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        // Centred by inset-0 + m-auto + h-fit, NOT by translate(-50%,-50%): the shared
        // spring-in keyframes set `transform: scale()`, which replaces the centring
        // translate for the 0.4 s of the animation and throws the dialog to the
        // bottom-right (top-left at 50%/50%). With no translate to lose, the scale
        // animates around the centre. Body scrolls; header and footer stay put.
        className="inset-0 m-auto flex h-fit max-h-[92dvh] w-[calc(100vw-1rem)] max-w-xl translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden !bg-background p-0 sm:max-h-[90dvh]"
        onOpenAutoFocus={(e) => {
          // Keep lesson is the default: it, not the first form field, takes focus.
          e.preventDefault();
          (phase === "done" ? doneRef.current : keepRef.current)?.focus();
        }}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        aria-busy={phase === "loading" || busy}
      >
        <DialogHeader className="space-y-1 border-b border-border p-4 pr-12 text-left sm:p-5 sm:pr-12">
          <DialogTitle className="text-lg leading-snug">{phase === "done" ? DONE_TITLE[op] : COPY.titles[op]}</DialogTitle>
          <DialogDescription className="break-words">
            {className ? <span className="font-medium text-foreground">{className}</span> : null}
            {className ? " - " : ""}
            {header.date ? longDate(header.date) : ""}
            {header.start_time ? `, ${hm(header.start_time)}${header.end_time ? `-${hm(header.end_time)}` : ""}` : ""}
            {teacherName ? ` - ${teacherName}` : ""}
            {preview ? ` - ${preview.session.status}` : ""}
            {op === "move" && change ? ` - to ${longDate(change.date)}, ${hm(change.start_time)}-${hm(change.end_time)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div ref={bodyRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {phase === "loading" && <LoadingBody />}

          {phase === "failed" && error && (
            <ErrorBanner
              id="sg-error"
              title={error.outcome_unknown ? "Not confirmed" : "The check could not be completed"}
              text={error.outcome_unknown ? OUTCOME_UNKNOWN_TEXT : (oneChangeText(error) ?? errorText(error.code, error.message))}
              code={error.code}
            />
          )}

          {phase === "done" && success && (
            <DoneBody op={op} success={success} retrying={retry.busy} retryError={retry.error?.code ?? null} onRetry={g.retryRefresh} />
          )}

          {ready && preview && (
            <>
              {stale && (
                <div role="alert" className="space-y-2 rounded-xl border border-warning/60 bg-warning/10 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {COPY.stale}
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    {stale.map((s) => (
                      <li key={s} className="break-words">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{COPY.stalePrompt}</p>
                </div>
              )}

              {refusal && (
                <ErrorBanner
                  id="sg-refusal"
                  title={useCancel ? "This lesson cannot be deleted" : "This change is not allowed"}
                  text={errorText(refusal)}
                  code={refusal}
                  quiet={useCancel}
                />
              )}

              <EvidenceCards preview={preview} />
              <ConsequenceTable preview={preview} consequences={consequences} />

              {(preview.settled_any || req.reviewRequired) && !blocked && (
                <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  {preview.settled_any && <p>{COPY.settled}</p>}
                  {req.reviewRequired && <p className="font-medium">{COPY.reviewNote}</p>}
                </div>
              )}

              {!blocked && unguarded && (
                <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  This is a time change on the same day. Nothing recorded for the lesson depends on the time, so no reason is needed.
                </p>
              )}

              {!blocked && !unguarded && (
                <div className="space-y-4">
                  <ReasonField
                    label={op === "uncancel" ? "Why is this lesson being restored? (required)" : "Reason (required)"}
                    value={reason}
                    onChange={setReason}
                    min={req.reasonMin}
                    disabled={busy}
                  />
                  {req.correctionReason && (
                    <ReasonField
                      label="Correction reason (required)"
                      help="This lesson is already billed, paid or in a closed payroll month. Explain what is being corrected and why."
                      value={correctionReason}
                      onChange={setCorrectionReason}
                      min={req.reasonMin}
                      disabled={busy}
                    />
                  )}
                  {req.confirm && (
                    <ConfirmTick checked={confirm} onChange={setConfirm} disabled={busy}>
                      {op === "delete"
                        ? "I have looked at the evidence and this lesson did not take place."
                        : op === "move"
                          ? "I have looked at the evidence and still want to move this lesson."
                          : "I have looked at the evidence and I am sure this lesson did not take place."}
                    </ConfirmTick>
                  )}
                  {req.typedDate && <TypedDateField lessonDate={preview.session.date} value={typedDate} onChange={setTypedDate} disabled={busy} />}
                </div>
              )}

              {error && error.code !== "approval_required" && <ErrorBanner id="sg-error" title="Nothing was changed" text={oneChangeText(error) ?? errorText(error.code, error.message)} code={error.code} />}
              {error?.code === "approval_required" && (
                <div id="sg-error" role="status" className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{approvalErrorText("approval_required", error.detail ?? (error as any).details)}</p>
                  {g.approval?.sent ? (
                    <p>Sent. The lesson stays as it is until another administrator approves it in Automation, Approvals.</p>
                  ) : (
                    <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={!!g.approval?.busy}
                      onClick={() => g.requestApproval(form)}>
                      {g.approval?.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Send for approval
                    </Button>
                  )}
                  {g.approval?.error && <p role="alert" className="break-words">{g.approval.error}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border bg-background p-4 sm:p-5">
          {phase === "done" ? (
            <Button ref={doneRef} size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-32" onClick={close}>
              Done
            </Button>
          ) : (
            <>
              {missing.length > 0 && !busy && (
                <p id="sg-missing" className="mb-3 text-xs text-muted-foreground">
                  To enable the button: {missing.join(", ")}.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button ref={keepRef} size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-40" onClick={close} disabled={busy}>
                  {phase === "failed" ? "Close" : COPY.keep[op]}
                </Button>
                {phase === "failed" && !blockingError && (
                  <Button variant="outline" size="lg" className="min-h-12 w-full sm:w-auto" onClick={() => g.reload()}>
                    Check again
                  </Button>
                )}
                {useCancel && onCancelInstead && (
                  <Button variant="outline" size="lg" className="min-h-12 w-full border-border sm:w-auto" onClick={onCancelInstead} disabled={busy}>
                    <Ban aria-hidden="true" /> Cancel instead
                  </Button>
                )}
                {!useCancel && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-12 w-full border-destructive text-foreground hover:bg-destructive/10 hover:text-foreground [&_svg]:text-destructive sm:w-auto"
                    disabled={!canGo || busy || phase === "loading" || phase === "failed" || !!blockingError}
                    aria-describedby={[missing.length && !busy ? "sg-missing" : "", error ? "sg-error" : ""].filter(Boolean).join(" ") || undefined}
                    onClick={() => void g.submit(form)}
                  >
                    {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
                    {busy ? "Working..." : label}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * D4 step 3A: "Check before ..." for who is paid for a lesson - taking a lesson
 * off Held, marking it Held without a register, changing the teacher, the
 * times or the assistants of a held lesson, or adding a lesson after it
 * started. It opens by asking the server (money_change_preview through
 * manage-session) what the change reaches; nothing is changed until the admin
 * has read it and given what the server asks for. No pay figure is shown:
 * pay is worked out by Payroll after the change.
 */
export function PayGuardDialog({ open, session, op, args, names, onClose, onDone }: {
  open: boolean;
  session: GuardSessionInfo;
  op: PayOp;
  args: Record<string, unknown>;
  names?: Record<string, string>;
  onClose: () => void;
  onDone?: (s: GuardSuccess) => void;
}) {
  const g = useGuardedPayChange({ open, op, args });
  const { phase, plan, error, stale, staleNonce, success } = g;
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setConfirm(false);
      setCorrectionReason("");
    }
  }, [open]);
  useEffect(() => {
    if (staleNonce > 0) {
      setConfirm(false);
      keepRef.current?.focus();
    }
  }, [staleNonce]);
  useEffect(() => {
    if (!open) return;
    if (phase === "done") doneRef.current?.focus();
    else if (phase === "failed") keepRef.current?.focus();
  }, [open, phase]);

  const req = payRequirements(plan);
  const form = { reason, confirm, correctionReason };
  const busy = phase === "submitting";
  const ready = (phase === "ready" || phase === "submitting") && !!plan;
  const blocked = ready && plan ? !plan.allowed : false;
  const canGo = ready && plan ? canSubmitPay(plan, form) : false;
  const evidence = payEvidencePreview(plan);
  const className = session.classes?.name ?? session.class_name;
  const teacherName = session.teachers?.full_name ?? session.teacher_name;
  const blockingError = error && BLOCKING_CODES.has(error.code);

  const close = () => {
    if (busy) return;
    if (phase === "done" && success) onDone?.(success);
    onClose();
  };

  const missing: string[] = [];
  if (ready && plan && !blocked) {
    if (req.reason && !checkReason(reason, req.reasonMin).ok) missing.push("write a reason");
    if (req.correctionReason && !checkReason(correctionReason, req.reasonMin).ok) missing.push("write the correction reason");
    if (req.confirm && !confirm) missing.push("tick the confirmation");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="inset-0 m-auto flex h-fit max-h-[92dvh] w-[calc(100vw-1rem)] max-w-xl translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden !bg-background p-0 sm:max-h-[90dvh]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (phase === "done" ? doneRef.current : keepRef.current)?.focus();
        }}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        aria-busy={phase === "loading" || busy}
      >
        <DialogHeader className="space-y-1 border-b border-border p-4 pr-12 text-left sm:p-5 sm:pr-12">
          <DialogTitle className="text-lg leading-snug">{phase === "done" ? PAY_COPY.done[op] : PAY_COPY.titles[op]}</DialogTitle>
          <DialogDescription className="break-words">
            {className ? <span className="font-medium text-foreground">{className}</span> : null}
            {className ? " - " : ""}
            {session.date ? longDate(session.date) : ""}
            {session.start_time ? `, ${hm(session.start_time)}${session.end_time ? `-${hm(session.end_time)}` : ""}` : ""}
            {teacherName ? ` - ${teacherName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {phase === "loading" && <LoadingBody />}

          {phase === "failed" && error && (
            <ErrorBanner
              id="pg-error"
              title={error.outcome_unknown ? "Not confirmed" : "The check could not be completed"}
              text={error.outcome_unknown ? OUTCOME_UNKNOWN_TEXT : payErrorText(error.code, errorText(error.code, error.message))}
              code={error.code}
            />
          )}

          {phase === "done" && success && (
            <p className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                Done: {PAY_COPY.done[op].toLowerCase()}. It is recorded with your name{success.result?.tier ? " and your reason" : ""}.
                {success.result?.review_required ? ` ${PAY_COPY.reviewNote}` : ""} {PAY_COPY.payNote}
              </span>
            </p>
          )}

          {ready && plan && (
            <>
              {stale && (
                <div role="alert" className="space-y-2 rounded-xl border border-warning/60 bg-warning/10 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {COPY.stale}
                  </p>
                  <p className="text-muted-foreground">{COPY.stalePrompt}</p>
                </div>
              )}

              {blocked && (
                <ErrorBanner id="pg-refusal" title="This change is not allowed" text={payErrorText(plan.refuse_code ?? "bad_change")} code={plan.refuse_code ?? "bad_change"} />
              )}

              <section aria-labelledby="pg-change-h" className="space-y-2 rounded-xl border border-border p-3 text-sm">
                <h3 id="pg-change-h" className="font-semibold">
                  What changes
                </h3>
                <ul className="list-disc space-y-1 pl-5">
                  {payChangeLines(plan, names).map((l) => (
                    <li key={l} className="break-words">
                      {l}
                    </li>
                  ))}
                </ul>
                <p>{payMeaning(op, plan)}</p>
              </section>

              {evidence && <EvidenceCards preview={evidence} />}

              {payNotes(plan).length > 0 && (
                <div className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  {payNotes(plan).map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              )}

              {!blocked && req.reason && (
                <div className="space-y-4">
                  <ReasonField label="Reason (required)" value={reason} onChange={setReason} min={req.reasonMin} disabled={busy} />
                  {req.correctionReason && (
                    <ReasonField
                      label="Correction reason (required)"
                      help="This lesson is in a closed payroll month, or already billed and paid. Explain what is being corrected and why."
                      value={correctionReason}
                      onChange={setCorrectionReason}
                      min={req.reasonMin}
                      disabled={busy}
                    />
                  )}
                  {req.confirm && (
                    <ConfirmTick checked={confirm} onChange={setConfirm} disabled={busy}>
                      {PAY_COPY.confirm[op]}
                    </ConfirmTick>
                  )}
                </div>
              )}

              {error && error.code !== "approval_required" && <ErrorBanner id="pg-error" title="Nothing was changed" text={payErrorText(error.code, errorText(error.code, error.message))} code={error.code} />}
              {error?.code === "approval_required" && (
                <div id="pg-error" role="status" className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{approvalErrorText("approval_required", error.detail ?? (error as any).details)}</p>
                  {g.approval?.sent ? (
                    <p>Sent. Nothing changes until another administrator approves it in Automation, Approvals.</p>
                  ) : (
                    <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={!!g.approval?.busy || !canGo}
                      onClick={() => g.requestApproval(form)}>
                      {g.approval?.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Send for approval
                    </Button>
                  )}
                  {g.approval?.error && <p role="alert" className="break-words">{g.approval.error}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border bg-background p-4 sm:p-5">
          {phase === "done" ? (
            <Button ref={doneRef} size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-32" onClick={close}>
              Done
            </Button>
          ) : (
            <>
              {missing.length > 0 && !busy && (
                <p id="pg-missing" className="mb-3 text-xs text-muted-foreground">
                  To enable the button: {missing.join(", ")}.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button ref={keepRef} size="lg" className="min-h-12 w-full sm:w-auto sm:min-w-40" onClick={close} disabled={busy}>
                  {phase === "failed" ? "Close" : PAY_COPY.keep[op]}
                </Button>
                {phase === "failed" && !blockingError && (
                  <Button variant="outline" size="lg" className="min-h-12 w-full sm:w-auto" onClick={() => g.reload()}>
                    Check again
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-12 w-full border-destructive text-foreground hover:bg-destructive/10 hover:text-foreground [&_svg]:text-destructive sm:w-auto"
                  disabled={!canGo || busy || phase === "loading" || phase === "failed" || !!blockingError}
                  aria-describedby={[missing.length && !busy ? "pg-missing" : "", error ? "pg-error" : ""].filter(Boolean).join(" ") || undefined}
                  onClick={() => void g.submit(form)}
                >
                  {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {busy ? "Working..." : PAY_COPY.action[op]}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingBody() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Checking whether this lesson took place...</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ErrorBanner({ id, title, text, code, quiet }: { id: string; title: string; text: string; code?: string; quiet?: boolean }) {
  return (
    <div id={id} role={quiet ? "status" : "alert"} className="space-y-1 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <p className="break-words">{text}</p>
      {code && <p className="text-xs text-muted-foreground">Code: {code}</p>}
    </div>
  );
}

function DoneBody({ op, success, retrying, retryError, onRetry }: { op: GuardOp; success: GuardSuccess; retrying: boolean; retryError: string | null; onRetry: () => void }) {
  const sum = refreshSummary(success.tuition);
  const results: any[] = Array.isArray(success.tuition?.results) ? success.tuition.results : [];
  const names = useStudentNames(results.map((r) => r.student_id));
  const noPairs = success.tuition?.status === "none";
  const plain = success.applied === "plain_update" || success.unchanged;
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          {plain ? "The change was saved." : `Done: ${DONE_TITLE[op].toLowerCase()}.`} It is recorded with your name and your reason.
          {success.result?.review_required ? " " + COPY.reviewNote : ""}
        </span>
      </p>

      {!plain && !noPairs && (
        <section aria-labelledby="sg-refresh-h" className="space-y-2">
          <h3 id="sg-refresh-h" className="text-sm font-semibold">
            Family bills
          </h3>
          {results.length > 0 ? (
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={`${r.student_id}-${r.month}-${i}`} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span className="min-w-0 break-words">
                    {names?.[r.student_id] ?? "Child"} <span className="text-muted-foreground">({r.month})</span>
                  </span>
                  <span className={r.ok ? "shrink-0 text-muted-foreground" : "shrink-0 font-semibold"}>{r.ok ? "Bill refreshed" : "Not refreshed"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">The server did not say whether the bills were refreshed.</p>
          )}
          {sum.needsRetry && (
            <div role="alert" className="space-y-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold">
                {sum.failed.length > 0
                  ? `The lesson was changed, but ${sum.failed.length} ${sum.failed.length === 1 ? "bill was" : "bills were"} not recalculated.`
                  : "The lesson was changed, but the server did not confirm that the bills were recalculated."}
              </p>
              <p>Until they are, those families may be shown a bill that still includes this lesson.</p>
              {retryError && <p className="font-medium">Retry failed: {errorText(retryError)}</p>}
              <Button variant="outline" className="min-h-11 border-destructive text-foreground hover:bg-destructive/10 hover:text-foreground [&_svg]:text-destructive" onClick={onRetry} disabled={retrying || !success.result?.override_id}>
                {retrying ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                Retry the bill refresh
              </Button>
            </div>
          )}
        </section>
      )}
      {noPairs && <p className="text-sm text-muted-foreground">No family bill depended on this lesson.</p>}
    </div>
  );
}
