import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpFromLine, Banknote, Coins, ArrowRight, Loader2, AlertTriangle } from "lucide-react";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  classId: string;
  cashOnHand: number;
  pointsToCashRate: number;
  onSuccess: () => void;
}

export function DepositModal({ open, onOpenChange, studentId, classId, cashOnHand, pointsToCashRate, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Validate: deposit ≤ total_withdrawn - total_spent (i.e. actual physical cash they should have)
  const { data: maxDepositable = 0 } = useQuery({
    queryKey: ["max-depositable", studentId],
    queryFn: async () => {
      // Get lifetime approved withdrawals
      const { data: withdrawals } = await supabase
        .from("economy_transactions")
        .select("cash_impact")
        .eq("student_id", studentId)
        .eq("type", "convert_to_cash" as any)
        .eq("status", "approved" as any);

      const totalWithdrawn = (withdrawals || []).reduce((sum, t) => sum + (t.cash_impact || 0), 0);

      // Get lifetime approved spends
      const { data: spends } = await supabase
        .from("economy_transactions")
        .select("cash_impact")
        .eq("student_id", studentId)
        .eq("type", "spend_cash" as any)
        .eq("status", "approved" as any);

      const totalSpent = (spends || []).reduce((sum, t) => sum + Math.abs(t.cash_impact || 0), 0);

      // Get lifetime approved deposits
      const { data: deposits } = await supabase
        .from("economy_transactions")
        .select("cash_impact")
        .eq("student_id", studentId)
        .eq("type", "deposit_cash" as any)
        .eq("status", "approved" as any);

      const totalDeposited = (deposits || []).reduce((sum, t) => sum + (t.cash_impact || 0), 0);

      // Max depositable = withdrawn - spent - already deposited back
      return Math.max(0, totalWithdrawn - totalSpent - totalDeposited);
    },
    enabled: open,
  });

  const pointsGain = amount * pointsToCashRate;
  const isValid = amount >= 1 && amount <= maxDepositable;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("economy_transactions")
        .insert({
          student_id: studentId,
          class_id: classId,
          type: "deposit_cash" as any,
          points_impact: pointsGain,
          cash_impact: -amount,
          status: "pending" as any,
          note: `Deposit ${amount} cash to get ${pointsGain} points back`,
        });

      if (error) throw error;

      // Notify teachers of this class
      const { data: classInfo } = await supabase.from("classes").select("name, default_teacher_id").eq("id", classId).single();
      const { data: studentInfo } = await supabase.from("students").select("full_name").eq("id", studentId).single();

      const { data: teacherSessions } = await supabase
        .from("sessions")
        .select("teacher_id, teachers!inner(user_id)")
        .eq("class_id", classId);

      const teacherUserIds = new Set<string>();
      (teacherSessions || []).forEach((s: any) => {
        const t = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers;
        if (t?.user_id) teacherUserIds.add(t.user_id);
      });

      if (classInfo?.default_teacher_id) {
        const { data: dt } = await supabase.from("teachers").select("user_id").eq("id", classInfo.default_teacher_id).single();
        if (dt?.user_id) teacherUserIds.add(dt.user_id);
      }

      const notifications = Array.from(teacherUserIds).map(userId => ({
        user_id: userId,
        title: `💰 Deposit Request`,
        message: `${studentInfo?.full_name || "A student"} wants to deposit ${amount} cash for ${pointsGain} pts in ${classInfo?.name || "class"}`,
        type: "economy_request",
        metadata: { class_id: classId, student_id: studentId, student_name: studentInfo?.full_name, class_name: classInfo?.name },
      }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      toast.success("Deposit request sent!", {
        description: "Your teacher will verify and add the points back.",
      });
      onSuccess();
      onOpenChange(false);
      setAmount(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
            Deposit Cash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center space-y-1">
            <p className="text-hec-small text-hec-ink-soft">Cash on Hand</p>
            <p className="whitespace-nowrap text-hec-h1 font-semibold tabular-nums text-hec-ink">{cashOnHand}</p>
          </div>

          {maxDepositable === 0 ? (
            <div className="flex items-start gap-2 rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3 text-hec-small text-hec-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-hec-danger" aria-hidden />
              <p>You don't have any physical cash available to deposit. You can only deposit cash you've previously withdrawn and haven't spent.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Cash to deposit</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxDepositable}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Math.min(maxDepositable, parseInt(e.target.value) || 1)))}
                />
                <p className="text-hec-caption tabular-nums text-hec-ink-soft">Max depositable: {maxDepositable}</p>
              </div>

              <div className="flex items-center justify-center gap-3 rounded-hec-md bg-hec-sunken p-3">
                <div className="text-center">
                  <Banknote className="mx-auto mb-1 h-5 w-5 text-hec-ink-soft" aria-hidden />
                  <p className="whitespace-nowrap font-semibold tabular-nums text-hec-ink">-{amount}</p>
                  <p className="text-hec-caption text-hec-ink-soft">Cash</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                <div className="text-center">
                  <Coins className="mx-auto mb-1 h-5 w-5 text-hec-brass" aria-hidden />
                  <p className="whitespace-nowrap font-semibold tabular-nums text-hec-ink">+{pointsGain}</p>
                  <p className="text-hec-caption text-hec-ink-soft">Points</p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request Deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
