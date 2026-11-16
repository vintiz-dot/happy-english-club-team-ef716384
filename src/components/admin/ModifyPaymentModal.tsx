import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { FamilyPaymentEditModal } from "./FamilyPaymentEditModal";
import { useIvory } from "@/hooks/useIvory";

interface ModifyPaymentModalProps {
  payment: {
    id: string;
    student_id: string;
    amount: number;
    method: string;
    occurred_at: string;
    memo: string | null;
  } | null;
  onClose: () => void;
  students?: Array<{ id: string; full_name: string }>;
}

export function ModifyPaymentModal({ payment, onClose, students = [] }: ModifyPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [isFamilyPayment, setIsFamilyPayment] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  // Safe date formatting helper
  const formatPaymentDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };
  
  const [formData, setFormData] = useState({
    studentId: payment?.student_id || "",
    amount: payment?.amount?.toString() || "",
    method: payment?.method || "Cash",
    occurredAt: formatPaymentDate(payment?.occurred_at),
    memo: payment?.memo || "",
    reason: "",
  });
  
  useEffect(() => {
    const checkFamilyPayment = async () => {
      if (!payment) return;
      
      const { data } = await supabase
        .from("payment_allocations")
        .select("id")
        .eq("parent_payment_id", payment.id)
        .limit(1);
      
      setIsFamilyPayment(!!data && data.length > 0);
    };
    
    if (payment) checkFamilyPayment();
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payment || !formData.reason.trim()) {
      toast.error("Please provide a reason for modification");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("modify-payment", {
        body: {
          paymentId: payment.id,
          studentId: formData.studentId,
          amount: parseInt(formData.amount),
          method: formData.method,
          occurredAt: new Date(formData.occurredAt).toISOString(),
          memo: formData.memo,
          reason: formData.reason,
        },
      });

      if (error) throw error;

      toast.success("Payment modified successfully");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      
      onClose();
    } catch (error: any) {
      console.error("Error modifying payment:", error);
      toast.error(error.message || "Failed to modify payment");
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;
  
  if (isFamilyPayment) {
    return (
      <>
        <Dialog open={!!payment} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Family Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className={iv("text-hec-body text-hec-ink", "")}>This is a family payment with multiple allocations.</p>
              <Button 
                onClick={() => {
                  setShowFamilyModal(true);
                  onClose();
                }}
                className="w-full"
              >
                View Family Payment Details
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <FamilyPaymentEditModal 
          paymentId={showFamilyModal ? payment.id : null}
          onClose={() => setShowFamilyModal(false)}
        />
      </>
    );
  }

  const hasChanges = 
    formData.studentId !== payment.student_id ||
    parseInt(formData.amount) !== payment.amount ||
    formData.method !== payment.method ||
    formData.occurredAt !== formatPaymentDate(payment.occurred_at) ||
    formData.memo !== (payment.memo || "");

  return (
    <Dialog open={!!payment} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modify Payment</DialogTitle>
          <DialogDescription>
            This will create a reversal entry and post a corrected payment. Both entries will be logged for audit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={iv("grid grid-cols-1 sm:grid-cols-2 gap-4", "grid grid-cols-2 gap-4")}>
            <div className={iv("min-w-0 space-y-2", "space-y-2")}>
              <Label htmlFor="student">Student</Label>
              <Input
                id="student"
                value={students.find(s => s.id === formData.studentId)?.full_name || "Unknown Student"}
                disabled
                className={iv("", "bg-muted")}
              />
            </div>

            <div className={iv("min-w-0 space-y-2", "space-y-2")}>
              <Label htmlFor="amount">Amount (VND)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className={ivory ? "tabular-nums" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select
                value={formData.method}
                onValueChange={(v) => setFormData({ ...formData, method: v })}
              >
                <SelectTrigger id="method">
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

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Memo</Label>
            <Input
              id="memo"
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="Optional note"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className={iv("text-hec-ink", "text-destructive")}>Reason for Modification *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why this payment needs to be modified..."
              required
              rows={3}
            />
          </div>

          {hasChanges && (
            <div className={iv("rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4 space-y-2", "rounded-lg border border-amber-500 bg-amber-50 p-4 space-y-2")}>
              <div className={iv("flex items-center gap-2 text-hec-warn font-medium", "flex items-center gap-2 text-amber-800 font-medium")}>
                <AlertTriangle className="h-4 w-4" />
                Changes Summary
              </div>
              <div className={iv("text-hec-small text-hec-ink tabular-nums space-y-1", "text-sm text-amber-700 space-y-1")}>
                {parseInt(formData.amount) !== payment.amount && (
                  <p>• Amount: {payment.amount.toLocaleString()} → {parseInt(formData.amount).toLocaleString()} VND</p>
                )}
                {formData.method !== payment.method && (
                  <p>• Method: {payment.method} → {formData.method}</p>
                )}
                {formData.occurredAt !== formatPaymentDate(payment.occurred_at) && formData.occurredAt && (
                  <p>• Date: {payment.occurred_at ? format(new Date(payment.occurred_at), "MMM d, yyyy") : "N/A"} → {format(new Date(formData.occurredAt), "MMM d, yyyy")}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.reason.trim() || !hasChanges}>
              {loading ? "Processing..." : "Modify Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
