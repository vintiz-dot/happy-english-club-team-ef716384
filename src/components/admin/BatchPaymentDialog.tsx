import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { CreditCard, Loader2, Zap, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";

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
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("Cash");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const getOutstanding = (item: any) => Math.max(0, (item.finalPayable ?? 0) - (item.recorded_payment ?? 0));

  const handlePayFullAll = () => {
    const newEntries: Record<string, string> = {};
    items.forEach((item) => {
      const outstanding = getOutstanding(item);
      if (outstanding > 0) {
        newEntries[item.student_id] = String(outstanding);
      }
    });
    setEntries(newEntries);
  };

  const handlePayFull = (studentId: string, outstanding: number) => {
    setEntries((prev) => ({ ...prev, [studentId]: String(outstanding) }));
  };

  const handleAmountChange = (studentId: string, value: string) => {
    setEntries((prev) => ({ ...prev, [studentId]: value }));
  };

  const totalPayment = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseInt(entries[item.student_id] || "0") || 0), 0);
  }, [entries, items]);

  const validEntries = useMemo(() => {
    return items.filter((item) => (parseInt(entries[item.student_id] || "0") || 0) > 0);
  }, [entries, items]);

  const handleSave = async () => {
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

      for (const item of validEntries) {
        const enteredAmount = parseInt(entries[item.student_id] || "0") || 0;
        if (enteredAmount <= 0) continue;

        const alreadyPaid = item.recorded_payment ?? 0;
        const newTotalPaid = alreadyPaid + enteredAmount;
        const payable = item.finalPayable ?? 0;
        const isPlaceholder = item.id?.startsWith("placeholder-");

        let newStatus: string;
        if (newTotalPaid >= payable && payable > 0) newStatus = "paid";
        else if (newTotalPaid > 0) newStatus = "partial";
        else newStatus = "open";

        try {
          if (isPlaceholder) {
            const { error } = await supabase.from("invoices").insert([{
              student_id: item.student_id,
              month,
              base_amount: item.base_amount || 0,
              discount_amount: item.discount_amount || 0,
              total_amount: item.total_amount || 0,
              recorded_payment: enteredAmount,
              paid_amount: 0,
              status: newStatus as any,
              carry_in_credit: item.carry_in_credit || 0,
              carry_in_debt: item.carry_in_debt || 0,
              created_by: user?.id,
            }]);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("invoices")
              .update({
                recorded_payment: newTotalPaid,
                status: newStatus as any,
                updated_at: new Date().toISOString(),
                updated_by: user?.id,
              })
              .eq("id", item.id);
            if (error) throw error;
          }

          await supabase.from("audit_log").insert({
            entity: "invoice",
            entity_id: isPlaceholder ? item.student_id : item.id,
            action: "batch_record_payment",
            actor_user_id: user?.id,
            diff: {
              student_id: item.student_id,
              month,
              previous_recorded_payment: alreadyPaid,
              payment_amount: enteredAmount,
              new_recorded_payment: newTotalPaid,
              payment_date: date,
              payment_method: method,
              memo: memo || null,
              invoice_created: isPlaceholder,
              batch: true,
            },
          });

          successCount++;
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
          const amt = parseInt(entries[row.student_id] || "0") || 0;
          if (amt <= 0) return row;
          const newRecorded = (row.recorded_payment ?? 0) + amt;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - newRecorded);
          const credit = Math.max(0, newRecorded - fp);
          let status = row.status;
          if (newRecorded >= fp && fp > 0) status = "paid";
          else if (newRecorded > 0) status = "partial";
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
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("Cash");
    setMemo("");
    setCompleted([]);
    onClose();
  };

  const fmt = (v: number) => v.toLocaleString() + " ₫";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Record Payment
            <Badge variant="secondary">{items.length} students</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Global controls - collapsible row */}
          <div className="shrink-0 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="shrink-0 space-y-1">
            <Label className="text-xs">Shared Note (optional)</Label>
            <Textarea
              placeholder="E.g. Monthly batch collection..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={1}
              className="min-h-[36px]"
            />
          </div>

          <div className="shrink-0 flex items-center justify-between">
            <span className="text-sm font-medium">Student Amounts</span>
            <Button variant="outline" size="sm" onClick={handlePayFullAll} className="gap-1 h-7 text-xs">
              <Zap className="h-3 w-3" />
              Pay Full All
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* Student list - takes remaining space */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2 pb-1">
            <div className="space-y-2">
              {items.map((item) => {
                const studentName = item.students?.full_name || "Student";
                const outstanding = getOutstanding(item);
                const enteredAmount = parseInt(entries[item.student_id] || "0") || 0;
                const isCompleted = completed.includes(item.student_id);
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
                    className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
                      isCompleted ? "bg-green-50 dark:bg-green-950/20 border-green-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage
                          src={getAvatarUrl(item.students?.avatar_url) || undefined}
                          alt={studentName}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{studentName}</span>
                          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Payable: {fmt(item.finalPayable ?? 0)}</span>
                          <span>Outstanding: <span className={outstanding > 0 ? "text-destructive" : "text-green-600"}>{fmt(outstanding)}</span></span>
                        </div>
                      </div>
                      {getTuitionStatusBadge(status, item.settled_in_month)}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={entries[item.student_id] || ""}
                        onChange={(e) => handleAmountChange(item.student_id, e.target.value)}
                        className="flex-1 h-7 text-sm"
                        disabled={saving}
                      />
                      {outstanding > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => handlePayFull(item.student_id, outstanding)}
                          disabled={saving}
                        >
                          <Zap className="h-3 w-3" />
                          Full
                        </Button>
                      )}
                    </div>

                    {enteredAmount > 0 && (
                      <p className={`text-xs font-medium ${
                        (item.finalPayable ?? 0) - (item.recorded_payment ?? 0) - enteredAmount <= 0
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}>
                        → New balance: {fmt((item.finalPayable ?? 0) - (item.recorded_payment ?? 0) - enteredAmount)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary bar */}
          {totalPayment > 0 && (
            <div className="shrink-0 rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex items-center justify-between">
              <span className="text-sm font-medium">
                Total: <span className="text-primary font-bold">{fmt(totalPayment)}</span>
              </span>
              <span className="text-xs text-muted-foreground">
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
