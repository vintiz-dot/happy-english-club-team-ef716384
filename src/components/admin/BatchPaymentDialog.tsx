import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { CreditCard, Loader2, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPaymentStatus, getIvoryTuitionStatusBadge } from "@/lib/tuitionStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { useOwingMonths } from "@/hooks/useOwingMonths";
import { earlierOwing, owingRowNote } from "@/lib/owingMonth";
import { labelForPayment, monthCharged } from "@/lib/invoiceStatus";
import { CHANGED_SINCE_LOADED } from "@/lib/recordedPaymentWrite";
import { DIFFERENT_PAYMENT_LABEL, paymentKeys, receiptDateToday, recordPayment, waitingDuplicateMessage, type PaymentAttempt } from "@/lib/recordPayment";
import { cashWarning, parseCash } from "@/lib/cashEntry";
import { formatVND } from "@/lib/money";

interface BatchPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  items: any[];
  month: string;
  onSuccess?: () => void;
}

interface StudentPaymentEntry {
  studentId: string;
  amount: string;
}

export const BatchPaymentDialog = ({ open, onClose, items, month, onSuccess }: BatchPaymentDialogProps) => {
  const tuitionMonth = useTuitionMonthConfirmation(month, open);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => receiptDateToday());
  const [method, setMethod] = useState("Cash");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  // One key per student per attempt, kept outside this dialog (paymentKeys in
  // src/lib/recordPayment.ts, review R-N2): a second click, or a retry after
  // no reply - even after the dialog was closed and opened again - records
  // nothing more.
  const queryClient = useQueryClient();

  const getOutstanding = (item: any) => Math.max(0, (item.finalPayable ?? 0) - (item.recorded_payment ?? 0));

  // A child who still owes an EARLIER month is marked on their row (pattern D).
  // This dialog records one month, so the note says to switch; nothing is moved.
  const owingByChild = useOwingMonths(useMemo(() => items.map((i) => i.student_id), [items]), open);

  // No buttons that fill in the balance: the amount is the cash handed over, typed
  // (src/lib/cashEntry.ts, the Nov 2026 tuition audit).

  const handleAmountChange = (studentId: string, value: string) => {
    setEntries((prev) => ({ ...prev, [studentId]: value }));
  };

  const totalPayment = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseCash(entries[item.student_id])), 0);
  }, [entries, items]);

  const validEntries = useMemo(() => {
    return items.filter((item) => (parseCash(entries[item.student_id])) > 0);
  }, [entries, items]);

  const handleSave = async () => {
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording payments"); return; }
    if (validEntries.length === 0) {
      toast.error("Enter at least one payment amount");
      return;
    }

    setSaving(true);
    setCompleted([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let successCount = 0;
      let failCount = 0;
      const savedIds = new Set<string>();
      const conflicts: string[] = [];
      const refusals: string[] = [];
      const waitingDuplicates: Array<{ attempt: PaymentAttempt; name: string }> = [];
      const recordedAfter = new Map<string, number>();

      for (const item of validEntries) {
        const enteredAmount = parseCash(entries[item.student_id]);
        if (enteredAmount <= 0) continue;

        const alreadyPaid = item.recorded_payment ?? 0;
        const isPlaceholder = !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(item.id ?? ""));
        const name = item.students?.full_name || "a student";

        const attempt = { studentId: item.student_id, month, kind: "payment" as const, amount: enteredAmount };
        const waiting = paymentKeys.pending(attempt);  // an earlier try of exactly this got no answer (review N-2)
        try {
          // record-payment (D5 G-1): payment row, both ledger legs and the
          // bill together, against the figure this screen showed. It writes
          // the audit row and creates a missing bill through calculate-tuition.
          const saved = await recordPayment(supabase, {
            studentId: item.student_id,
            month,
            kind: "payment",
            amount: enteredAmount,
            method,
            occurredAt: date,
            memo: memo || "Batch payment",
            idempotencyKey: paymentKeys.keyFor(attempt),
            ...(isPlaceholder ? {} : { expectedRecorded: alreadyPaid }),
          });
          paymentKeys.settle(attempt, saved);
          if (!saved.ok) {
            if (saved.conflict) conflicts.push(name);
            else if (saved.duplicate && waiting) waitingDuplicates.push({ attempt, name });
            else refusals.push(`${name}: ${saved.message}`);
            failCount++;
            continue;
          }
          recordedAfter.set(item.student_id, saved.data!.recordedAfter);

          successCount++;
          savedIds.add(item.student_id);
          setCompleted((prev) => [...prev, item.student_id]);
        } catch (err) {
          console.error(`Failed for ${item.students?.full_name}:`, err);
          failCount++;
        }
      }

      // Optimistic cache update — patch all affected students instantly
      queryClient.setQueryData(["admin-tuition-live", month], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((row: any) => {
          if (!savedIds.has(row.student_id)) return row; // only what was really saved
          // What the function says the bill now records.
          const newRecorded = recordedAfter.get(row.student_id);
          if (newRecorded === undefined) return row;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - newRecorded);
          const credit = Math.max(0, newRecorded - fp);
          const status = labelForPayment(row.status, newRecorded, fp, monthCharged(row)) ?? row.status;
          return { ...row, recorded_payment: newRecorded, balance: debt > 0 ? debt : -credit, carry_out_debt: debt, carry_out_credit: credit, status };
        });
      });
      // Background refresh for eventual consistency
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-live", month] });

      if (failCount === 0) {
        toast.success(`Recorded payments for ${successCount} student${successCount > 1 ? 's' : ''}`);
      } else {
        toast.warning(`${successCount} succeeded, ${failCount} failed`);
      }
      if (conflicts.length > 0) {
        // conflict: those bills changed since the list was loaded; nothing was written to them
        toast.error(`${conflicts.join(", ")}: ${CHANGED_SINCE_LOADED}`);
      }
      // Each refusal in the function's own words: nothing was recorded for them.
      for (const r of refusals) toast.error(r);
      // Identical to an earlier try that got no answer and was in fact recorded (review N-2):
      // say so plainly, and let the admin deliberately record genuinely different ones.
      for (const w of waitingDuplicates) {
        toast.error(waitingDuplicateMessage(w.attempt, w.name), {
          duration: 30_000,
          action: { label: DIFFERENT_PAYMENT_LABEL, onClick: () => paymentKeys.forget(w.attempt) },
        });
      }

      onSuccess?.();
      setTimeout(() => handleClose(), 600);
    } catch (error: any) {
      console.error("Batch payment error:", error);
      toast.error(error.message || "Failed to process batch payments");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEntries({});
    setDate(receiptDateToday());
    setMethod("Cash");
    setMemo("");
    setCompleted([]);
    onClose();
  };


  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Record Payment
            <Badge variant="secondary" className="font-sans tabular-nums">{items.length} students</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 -mx-2 px-2">
          {tuitionMonth.field}
          {/* Global controls - collapsible row */}
          <div className="shrink-0 grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="batch-payment-date" className="text-hec-small font-medium text-hec-ink">Date</Label>
              <Input id="batch-payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="" />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className="text-hec-small font-medium text-hec-ink" htmlFor="batch-payment-method">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="batch-payment-method" className=""><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="shrink-0 space-y-2">
            <Label className="text-hec-small font-medium text-hec-ink">Shared Note (optional)</Label>
            <Textarea
              placeholder="E.g. Monthly batch collection..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={1}
              className="min-h-hec-target"
            />
          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
            <span className="text-hec-small font-medium text-hec-ink">Cash received from each family</span>
            <span className="text-hec-caption text-hec-ink-soft">Rows left empty are not recorded.</span>
          </div>

          <Separator className="shrink-0" />

          {/* Student list - takes remaining space */}
          <div className="shrink-0 pb-1">
            <div className="space-y-2">
              {items.map((item) => {
                const studentName = item.students?.full_name || "Student";
                const outstanding = getOutstanding(item);
                const enteredAmount = parseCash(entries[item.student_id]);
                const isCompleted = completed.includes(item.student_id);
                const earlier = earlierOwing(owingByChild.get(item.student_id), month);
                const status = getPaymentStatus({
                  carryOutDebt: item.carry_out_debt ?? 0,
                  carryOutCredit: item.carry_out_credit ?? 0,
                  totalAmount: item.total_amount ?? 0,
                  monthPayments: item.recorded_payment ?? 0,
                  settledInMonth: item.settled_in_month,
                });

                return (
                  <div
                    key={item.student_id}
                    className={`rounded-hec-md border p-3 space-y-2 transition-colors duration-hec-1 ease-hec ${
                      isCompleted ? "bg-hec-leaf-tint border-hec-leaf/30" : "bg-hec-surface border-hec-line"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage
                          src={getAvatarUrl(item.students?.avatar_url) || undefined}
                          alt={studentName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-hec-sunken text-hec-caption text-hec-ink-soft">
                          {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{studentName}</span>
                          {isCompleted && <CheckCircle2 className="h-4 w-4 text-hec-leaf shrink-0" aria-label="Recorded" />}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-hec-caption text-hec-ink-soft">
                          <span>Payable: <span className="whitespace-nowrap text-hec-ink tabular-nums">{formatVND(item.finalPayable ?? 0)}</span></span>
                          <span>Outstanding: <span className="whitespace-nowrap text-hec-ink tabular-nums">{formatVND(outstanding)}</span></span>
                        </div>
                        {earlier && !isCompleted && (
                          <p className="text-hec-caption text-hec-warn" role="status" data-owing-month={earlier.month}>{owingRowNote(earlier)}</p>
                        )}
                      </div>
                      <span className="shrink-0">{getIvoryTuitionStatusBadge(status, item.settled_in_month)}</span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Cash received"
                        value={entries[item.student_id] || ""}
                        onChange={(e) => handleAmountChange(item.student_id, e.target.value)}
                        className="min-w-0 flex-1 tabular-nums"
                        disabled={saving}
                        aria-label={`Cash received from ${studentName}`}
                      />
                    </div>

                    {cashWarning(enteredAmount, outstanding) && !isCompleted && (
                      <p className="text-hec-caption text-hec-warn" role="status">{cashWarning(enteredAmount, outstanding)}</p>
                    )}

                    {enteredAmount > 0 && (
                      <p className="text-hec-caption font-medium text-hec-ink tabular-nums">
                        → New balance: {formatVND((item.finalPayable ?? 0) - (item.recorded_payment ?? 0) - enteredAmount)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary bar */}
          {totalPayment > 0 && (
            <div className="sticky bottom-0 z-10 shrink-0 bg-hec-raised border-t-2 border-hec-ink pt-3 pb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-hec-body font-medium text-hec-ink">
                Total: <span className="whitespace-nowrap font-sans text-hec-h3 font-semibold text-hec-ink tabular-nums">{formatVND(totalPayment)}</span>
              </span>
              <span className="text-hec-caption text-hec-ink-soft tabular-nums">
                {validEntries.length} of {items.length} students
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || validEntries.length === 0} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <CreditCard className="h-4 w-4" />
            Record {validEntries.length} Payment{validEntries.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
