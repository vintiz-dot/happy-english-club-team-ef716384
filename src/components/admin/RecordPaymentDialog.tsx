import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Loader2, Zap, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPaymentStatus, getIvoryTuitionStatusBadge } from "@/lib/tuitionStatus";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { labelForPayment, monthCharged } from "@/lib/invoiceStatus";
import { DIFFERENT_PAYMENT_LABEL, paymentKeys, receiptDateToday, recordPayment, waitingDuplicateMessage, waitingNotice } from "@/lib/recordPayment";
import { formatVND } from "@/lib/money";
import { showSeal } from "@/components/fx/showSeal";

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  item: any;
  month: string;
  onSuccess?: () => void;
}

export const RecordPaymentDialog = ({ open, onClose, item, month, onSuccess }: RecordPaymentDialogProps) => {
  const tuitionMonth = useTuitionMonthConfirmation(month, open, {
    // Suggests the oldest month this child still owes (pattern D); the admin still confirms.
    studentIds: item?.student_id ? [item.student_id] : [],
  });
  const [mode, setMode] = useState<"payment" | "correction">("payment");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => receiptDateToday());
  const [method, setMethod] = useState("Cash");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const studentName = item?.students?.full_name || "Student";
  const payable = item?.finalPayable ?? 0;
  const alreadyPaid = item?.recorded_payment ?? 0;
  const outstanding = Math.max(0, payable - alreadyPaid);

  const enteredAmount = parseInt(amount) || 0;
  const actualAmount = mode === "correction" ? -enteredAmount : enteredAmount;
  const newTotalPaid = alreadyPaid + actualAmount;
  const newBalance = payable - newTotalPaid;

  const statusBadge = useMemo(() => {
    if (!item) return null;
    const status = getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
      settledInMonth: item.settled_in_month,
    });
    return getIvoryTuitionStatusBadge(status, item.settled_in_month);
  }, [item]);

  const UUID_RE = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const isPlaceholder = !UUID_RE.test(String(item?.id ?? ""));

  const handleActionFill = () => {
    if (mode === "payment") {
      setAmount(String(outstanding));
    } else {
      setAmount(String(alreadyPaid));
    }
  };

  const handleSave = async () => {
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording a payment"); return; }
    if (enteredAmount <= 0 || isNaN(enteredAmount)) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (mode === "correction" && enteredAmount > alreadyPaid) {
      toast.error("Cannot refund or correct more than what was already paid");
      return;
    }

    if (mode === "correction" && !memo.trim()) {
      toast.error("A note is required for corrections to maintain a valid audit trail");
      return;
    }

    setSaving(true);
    // One key per attempt, kept OUTSIDE this dialog (paymentKeys in
    // src/lib/recordPayment.ts, review R-N2): closing the dialog after "no
    // answer" and entering the same payment again reuses it, so a payment
    // that was in fact recorded is refused as a duplicate, never paid twice.
    const attempt = { studentId: item.student_id, month, kind: mode, amount: enteredAmount };
    // An earlier try of exactly this entry got no answer (review N-2).
    const waiting = paymentKeys.pending(attempt);
    try {
      // record-payment writes the payment, its two ledger legs and the bill
      // together (D5 G-1), against the figure this screen showed: a payment
      // saved meanwhile from another screen is never overwritten. It also
      // writes the audit row and creates a missing bill through calculate-tuition.
      const saved = await recordPayment(supabase, {
        studentId: item.student_id,
        month,
        kind: mode,
        amount: enteredAmount,
        method,
        occurredAt: date,
        memo: memo || null,
        idempotencyKey: paymentKeys.keyFor(attempt),
        ...(isPlaceholder ? {} : { expectedRecorded: alreadyPaid }),
      });
      // A reply ends the attempt: the next one is a new payment. No reply
      // (network): the key stays kept for this attempt, so it cannot pay twice.
      paymentKeys.settle(attempt, saved);
      if (!saved.ok) {
        // Nothing was recorded (the function says why); reload so the admin sees the bill as it is.
        // A duplicate of an unanswered earlier try: say so plainly, and let the admin
        // deliberately record a genuinely different payment of the same amount (review N-2).
        if (saved.duplicate && waiting) {
          toast.error(waitingDuplicateMessage(attempt, studentName), {
            duration: 30_000,
            action: { label: DIFFERENT_PAYMENT_LABEL, onClick: () => paymentKeys.forget(attempt) },
          });
        } else {
          toast.error(saved.message);
        }
        queryClient.invalidateQueries({ queryKey: ["admin-tuition-live", month] });
        queryClient.invalidateQueries({ queryKey: ["student-tuition", item.student_id, month] });
        return;
      }
      const recordedAfter = saved.data!.recordedAfter;

      // Optimistic cache update — patch just this student instantly
      queryClient.setQueryData(["admin-tuition-live", month], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((row: any) => {
          if (row.student_id !== item.student_id) return row;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - recordedAfter);
          const credit = Math.max(0, recordedAfter - fp);
          const status = labelForPayment(row.status, recordedAfter, fp, monthCharged(row)) ?? row.status;
          return {
            ...row,
            recorded_payment: recordedAfter,
            balance: debt > 0 ? debt : -credit, 
            carry_out_debt: debt, 
            carry_out_credit: credit, 
            status 
          };
        });
      });
      // Background refresh for eventual consistency
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-live", month] });
      queryClient.invalidateQueries({ queryKey: ["student-tuition", item.student_id, month] });

      toast.success(
        mode === "correction" 
          ? `Corrected payment by -${formatVND(enteredAmount)} for ${studentName}`
          : `Recorded ${formatVND(enteredAmount)} for ${studentName}`
      );
      // the server has answered yes: only money coming in is "Recorded"; a correction gets no seal
      if (mode !== "correction") showSeal("Recorded");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error(`Error processing ${mode}:`, error);
      toast.error(error.message || `Failed to process ${mode}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setDate(receiptDateToday());
    setMethod("Cash");
    setMemo("");
    setMode("payment");
    onClose();
  };


  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Payment
          </DialogTitle>
          {item && (
            <DialogDescription className="break-words">
              {mode === "correction" ? "Deduct" : "Record"}{" "}
              <span className="tabular-nums">{enteredAmount > 0 && !isNaN(enteredAmount) ? formatVND(enteredAmount) : "an amount"}</span>{" "}
              {mode === "correction" ? "from" : "for"} {studentName}, {month} tuition. It is saved as soon as you confirm.
            </DialogDescription>
          )}
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            {tuitionMonth.field}
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="payment" className="whitespace-normal text-center">Record Payment</TabsTrigger>
                <TabsTrigger value="correction" className="whitespace-normal text-center">Correction / Refund</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Student header */}
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-h3 font-semibold text-hec-ink">{studentName}</span>
              <span className="shrink-0">{statusBadge}</span>
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
              <div className="flex items-baseline justify-between gap-4 min-[400px]:block min-[400px]:text-center">
                <p className="text-hec-caption text-hec-ink-soft">Payable</p>
                <p className="whitespace-nowrap font-semibold text-hec-small text-hec-ink tabular-nums">{formatVND(payable)}</p>
              </div>
              <div className="flex items-baseline justify-between gap-4 min-[400px]:block min-[400px]:text-center">
                <p className="text-hec-caption text-hec-ink-soft">Paid</p>
                <p className="whitespace-nowrap font-semibold text-hec-small text-hec-ink tabular-nums">{formatVND(alreadyPaid)}</p>
              </div>
              <div className="flex items-baseline justify-between gap-4 min-[400px]:block min-[400px]:text-center">
                <p className={`text-hec-caption font-medium ${outstanding > 0 ? "text-hec-danger" : "text-hec-leaf"}`}>Outstanding</p>
                <p className="whitespace-nowrap font-semibold text-hec-small text-hec-ink tabular-nums">
                  {formatVND(outstanding)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Amount input */}
            <div className="space-y-2">
              <Label>{mode === "correction" ? "Amount to Deduct / Refund" : "Payment Amount"}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-w-0 flex-1 tabular-nums"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleActionFill} 
                  className="shrink-0 gap-1"
                  disabled={mode === "correction" && alreadyPaid === 0}
                >
                  {mode === "payment" ? (
                    <><Zap className="h-3 w-3" /> Pay Full</>
                  ) : (
                    <><RotateCcw className="h-3 w-3" /> Refund All</>
                  )}
                </Button>
              </div>
              {/* An identical entry got no answer earlier (review N-2): say so before Save. */}
              {item && enteredAmount > 0 && paymentKeys.pending({ studentId: item.student_id, month, kind: mode, amount: enteredAmount }) && (
                <p role="status" className="text-hec-small text-hec-warn">
                  {waitingNotice({ studentId: item.student_id, month, kind: mode, amount: enteredAmount })}
                </p>
              )}
            </div>

            {/* Date & Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="record-payment-date">Date</Label>
                <Input id="record-payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="record-payment-method">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="record-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Memo */}
            <div className="space-y-2">
              <Label>Note {mode === "correction" ? <span className="text-hec-danger">*</span> : "(optional)"}</Label>
              <Textarea
                placeholder={mode === "correction" ? "E.g. Parent mistakenly paid twice, refunding..." : "E.g. Paid via Momo..."}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
              />
            </div>

            {/* Live preview */}
            {enteredAmount > 0 && (
              <div className={`rounded-hec-md border p-3 text-hec-small font-medium text-hec-ink ${
                newBalance <= 0
                  ? "border-hec-leaf/30 bg-hec-leaf-tint"
                  : "border-hec-warn/30 bg-hec-warn-tint"
              }`}>
                After this {mode}: Balance will be{" "}
                <span className="whitespace-nowrap font-semibold tabular-nums">{formatVND(newBalance)}</span>
                {newBalance < 0 && " (overpaid)"}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" autoFocus onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || enteredAmount <= 0 || isNaN(enteredAmount) || (mode === "correction" && enteredAmount > alreadyPaid)}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving ? "Working…" : mode === "payment" ? "Record payment" : "Apply correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
