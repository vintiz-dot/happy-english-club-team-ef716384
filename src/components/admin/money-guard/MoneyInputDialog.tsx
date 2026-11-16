import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmTick, ReasonField } from "@/components/admin/session-guard/Fields";
import { moneyRequirements, type MoneyForm, type MoneyPlan } from "@/lib/moneyGuard";
import { INPUT_TEXT, inputChangeLines, inputCopy, inputIntro, payReachLines } from "@/lib/moneyInputs";
import { reasonSentence } from "@/lib/approvals";
import { ReachTable } from "./ReachTable";
import type { useMoneyChange } from "./useMoneyChange";

type Guard = ReturnType<typeof useMoneyChange>;

interface ViewProps {
  open: boolean;
  plan: MoneyPlan | null;
  form: MoneyForm;
  setForm: (f: MoneyForm) => void;
  busy: boolean;
  error: string | null;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  /** Children's names by id, for the bills list. */
  names?: Record<string, string>;
  /** Who or what the change is about ("An - Starters A"), shown above the lines. */
  subject?: string;
  /** Extra lines the screen adds under the change (a list of enrolments, say). */
  extraLines?: string[];
  /** D4 step 4: when the preview says a second administrator must approve, the button sends the request instead. */
  onRequestApproval?: () => void;
  canRequestApproval?: boolean;
}

/**
 * The reason dialog of the money-input screens: what changes (in the plan's
 * own values), the stored bills it reaches, then exactly what the server's
 * preview asks for - a reason, a tick, and a correction reason when a bill
 * in reach was confirmed or frozen. Presentation only; MoneyInputDialog
 * below binds it to useMoneyChange, and a screen whose change is made by an
 * edge function (Create Family) feeds it directly.
 */
export function MoneyInputDialogView({ open, plan, form, setForm, busy, error, canSubmit, onClose, onSubmit, names, subject, extraLines,
  onRequestApproval, canRequestApproval }: ViewProps) {
  const needsApproval = !!plan?.approval?.required && !!onRequestApproval;
  const copy = inputCopy(plan?.entity, plan?.op);
  const req = moneyRequirements(plan);
  const lines = [...inputChangeLines(plan), ...(extraLines ?? [])];
  const pay = payReachLines(plan);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{inputIntro(plan)}</DialogDescription>
        </DialogHeader>

        {!plan && !error && <p className="text-sm text-muted-foreground">Checking...</p>}

        {plan && (
          <div className="space-y-4">
            {subject && <p className="break-words text-sm font-medium">{subject}</p>}
            {lines.length > 0 && (
              <ul className="space-y-1 text-sm" aria-label="What changes">
                {lines.map((l, i) => (
                  <li key={i} className="break-words">{l}</li>
                ))}
              </ul>
            )}
            {pay.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground" aria-label="What this rate reaches">
                {pay.map((l, i) => (
                  <li key={i} className="break-words">{l}</li>
                ))}
              </ul>
            )}
            <ReachTable plan={plan} names={names} />
            {req.reason && (
              <ReasonField label={INPUT_TEXT.reasonLabel} value={form.reason} min={req.reasonMin} disabled={busy}
                onChange={(v) => setForm({ ...form, reason: v })} />
            )}
            {req.correctionReason && (
              <ReasonField label={INPUT_TEXT.correctionLabel} value={form.correctionReason} min={req.reasonMin} disabled={busy}
                onChange={(v) => setForm({ ...form, correctionReason: v })} />
            )}
            {req.confirm && (
              <ConfirmTick checked={form.confirm} disabled={busy} onChange={(v) => setForm({ ...form, confirm: v })}>
                {plan.entity === "pay_rate" ? INPUT_TEXT.confirmPay : INPUT_TEXT.confirmText}
              </ConfirmTick>
            )}
            {plan.review_required && <p className="text-sm text-muted-foreground">{INPUT_TEXT.review}</p>}
            {plan.approval?.required && <p className="text-sm font-medium">{reasonSentence(plan.approval.reasons)} It waits, unchanged, until another administrator approves it.</p>}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm break-words">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{INPUT_TEXT.keep}</Button>
          {needsApproval
            ? <Button onClick={onRequestApproval} disabled={!canRequestApproval || busy}>Send for approval</Button>
            : <Button onClick={onSubmit} disabled={!canSubmit || busy}>{copy.submit}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The dialog bound to useMoneyChange (through useMoneyInput().guard). */
export function MoneyInputDialog({ guard, names, subject }: { guard: Guard; names?: Record<string, string>; subject?: string }) {
  return (
    <MoneyInputDialogView
      open={!!guard.request}
      plan={guard.plan}
      form={guard.form}
      setForm={guard.setForm}
      busy={guard.busy}
      error={guard.error}
      canSubmit={guard.canSubmit}
      onClose={guard.close}
      onSubmit={guard.submit}
      onRequestApproval={() => void guard.requestApproval()}
      canRequestApproval={guard.canRequestApproval}
      names={names}
      subject={subject}
    />
  );
}
