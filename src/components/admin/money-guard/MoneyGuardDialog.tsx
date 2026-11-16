import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmTick, ReasonField } from "@/components/admin/session-guard/Fields";
import { markLines, MONEY_COPY, moneyRequirements } from "@/lib/moneyGuard";
import { ReachTable } from "./ReachTable";
import type { useMoneyChange } from "./useMoneyChange";

type Guard = ReturnType<typeof useMoneyChange>;

/**
 * The money guard's dialog: what changes, the bills it reaches as stored,
 * then a reason, a tick and (for a confirmed or frozen month) a correction
 * reason - exactly what the server's preview asks for. Reuses the session
 * guard's fields unchanged.
 *
 * `title`, `intro` and `submitLabel` let a screen of another entity (step 2's
 * class fee history) word the same dialog; left out, it reads as before.
 */
export function MoneyGuardDialog({ guard, names, title, intro, submitLabel }: {
  guard: Guard; names?: Record<string, string>; title?: string; intro?: string; submitLabel?: string;
}) {
  const { request, plan, form, setForm, busy, error, close, submit, canSubmit } = guard;
  const op = request?.op ?? "set_marks";
  const req = moneyRequirements(plan);
  const lines = markLines(plan);
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? MONEY_COPY.title[op] ?? "Check this change"}</DialogTitle>
          <DialogDescription>{intro ?? MONEY_COPY.intro}</DialogDescription>
        </DialogHeader>

        {!plan && !error && <p className="text-sm text-muted-foreground">Checking...</p>}

        {plan && (
          <div className="space-y-4">
            {lines.length > 0 && (
              <ul className="space-y-1 text-sm" aria-label="What changes">
                {lines.map((l, i) => (
                  <li key={`${l.studentId}-${i}`} className="break-words">
                    <span className="font-medium">{names?.[l.studentId] ?? "A child"}</span>: {l.text}
                  </li>
                ))}
              </ul>
            )}
            {op === "set_marks" && <p className="text-xs text-muted-foreground">{MONEY_COPY.yourMark}</p>}
            <ReachTable plan={plan} names={names} />
            {req.reason && (
              <ReasonField label={MONEY_COPY.reasonLabel} value={form.reason} min={req.reasonMin} disabled={busy}
                onChange={(v) => setForm({ ...form, reason: v })} />
            )}
            {req.correctionReason && (
              <ReasonField label={MONEY_COPY.correctionLabel} value={form.correctionReason} min={req.reasonMin} disabled={busy}
                onChange={(v) => setForm({ ...form, correctionReason: v })} />
            )}
            {req.confirm && (
              <ConfirmTick checked={form.confirm} disabled={busy} onChange={(v) => setForm({ ...form, confirm: v })}>
                {MONEY_COPY.confirmText}
              </ConfirmTick>
            )}
            {plan.review_required && <p className="text-sm text-muted-foreground">{MONEY_COPY.review}</p>}
            {plan.approval?.required && <p className="text-sm font-medium">{MONEY_COPY.approval}</p>}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm break-words">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close} disabled={busy}>Keep as it was</Button>
          <Button onClick={submit} disabled={!canSubmit || busy}>{submitLabel ?? MONEY_COPY.submit[op] ?? "Confirm"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
