import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  item: any;
  month: string;
  onSuccess?: () => void;
}

export const RecordPaymentDialog = ({ open, onClose, item, month, onSuccess }: RecordPaymentDialogProps) => {
  const [mode, setMode] = useState<"payment" | "correction">("payment");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
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
    return getTuitionStatusBadge(status, item.settled_in_month);
  }, [item]);

  const isPlaceholder = item?.id?.startsWith("placeholder-");

  const handleActionFill = () => {
    if (mode === "payment") {
      setAmount(String(outstanding));
    } else {
      setAmount(String(alreadyPaid));
    }
  };

  const handleSave = async () => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Determine new status
      let newStatus: string;
      if (newTotalPaid >= payable && payable > 0) {
        newStatus = "paid";
      } else if (newTotalPaid > 0) {
        newStatus = "partial";
      } else {
        newStatus = "open";
      }

      if (isPlaceholder) {
        // Create invoice since none exists
        const { error } = await supabase.from("invoices").insert([{
          student_id: item.student_id,
          month,
          base_amount: item.base_amount || 0,
          discount_amount: item.discount_amount || 0,
          total_amount: item.total_amount || 0,
          recorded_payment: newTotalPaid,
          paid_amount: 0,
          status: newStatus as "draft" | "issued" | "paid" | "partial" | "credit",
          carry_in_credit: item.carry_in_credit || 0,
          carry_in_debt: item.carry_in_debt || 0,
          created_by: user?.id,
        }]);
        if (error) throw error;
      } else {
        // Update existing recorded_payment
        const { error } = await supabase
          .from("invoices")
          .update({
            recorded_payment: newTotalPaid,
            status: newStatus as "draft" | "issued" | "paid" | "partial" | "credit",
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", item.id);
        if (error) throw error;
      }

      // Audit log
      await supabase.from("audit_log").insert({
        entity: "invoice",
        entity_id: isPlaceholder ? item.student_id : item.id,
        action: mode === "correction" ? "payment_correction" : "record_payment",
        actor_user_id: user?.id,
        diff: {
          student_id: item.student_id,
          month,
          previous_recorded_payment: alreadyPaid,
          payment_amount: actualAmount,
          new_recorded_payment: newTotalPaid,
          payment_date: date,
          payment_method: method,
          memo: memo || null,
          invoice_created: isPlaceholder,
          type: mode,
        },
      });

      // Optimistic cache update — patch just this student instantly
      queryClient.setQueryData(["admin-tuition-live", month], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((row: any) => {
          if (row.student_id !== item.student_id) return row;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - newTotalPaid);
          const credit = Math.max(0, newTotalPaid - fp);
          let status = row.status;
          if (newTotalPaid >= fp && fp > 0) status = "paid";
          else if (newTotalPaid > 0) status = "partial";
          return { 
            ...row, 
            recorded_payment: newTotalPaid, 
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
          ? `Corrected payment by -${enteredAmount.toLocaleString()} ₫ for ${studentName}`
          : `Recorded ${enteredAmount.toLocaleString()} ₫ for ${studentName}`
      );
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
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("Cash");
    setMemo("");
    setMode("payment");
    onClose();
  };

  const fmt = (v: number) => v.toLocaleString() + " ₫";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Payment
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payment">Record Payment</TabsTrigger>
                <TabsTrigger value="correction">Correction / Refund</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Student header */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">{studentName}</span>
              {statusBadge}
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Payable</p>
                <p className="font-semibold text-sm">{fmt(payable)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-semibold text-sm text-green-600">{fmt(alreadyPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={`font-semibold text-sm ${outstanding > 0 ? "text-destructive" : "text-green-600"}`}>
                  {fmt(outstanding)}
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
                  className="flex-1"
                  autoFocus
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
            </div>

            {/* Date & Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
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
              <Label>Note {mode === "correction" ? <span className="text-destructive">*</span> : "(optional)"}</Label>
              <Textarea
                placeholder={mode === "correction" ? "E.g. Parent mistakenly paid twice, refunding..." : "E.g. Paid via Momo..."}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
              />
            </div>

            {/* Live preview */}
            {enteredAmount > 0 && (
              <div className={`rounded-lg p-3 text-sm font-medium ${
                newBalance <= 0
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }`}>
                After this {mode}: Balance will be{" "}
                <span className="font-bold">{fmt(newBalance)}</span>
                {newBalance < 0 && " (overpaid)"}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || enteredAmount <= 0 || isNaN(enteredAmount) || (mode === "correction" && enteredAmount > alreadyPaid)}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "payment" ? "Record Payment" : "Apply Correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
