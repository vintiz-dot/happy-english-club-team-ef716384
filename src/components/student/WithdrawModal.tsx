import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownToLine, Coins, Banknote, ArrowRight, Loader2 } from "lucide-react";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  classId: string;
  totalPoints: number;
  pointsToCashRate: number;
  onSuccess: () => void;
}

export function WithdrawModal({ open, onOpenChange, studentId, classId, totalPoints, pointsToCashRate, onSuccess }: WithdrawModalProps) {
  const [cashAmount, setCashAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const maxCash = Math.floor(totalPoints / pointsToCashRate);
  const pointsCost = cashAmount * pointsToCashRate;
  const isValid = cashAmount >= 1 && cashAmount <= maxCash;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      // Deduct points immediately from student_points
      // Create pending transaction for teacher approval
      const { error } = await supabase
        .from("economy_transactions")
        .insert({
          student_id: studentId,
          class_id: classId,
          type: "convert_to_cash" as any,
          points_impact: -pointsCost,
          cash_impact: cashAmount,
          status: "pending" as any,
          note: `Withdraw ${cashAmount} cash for ${pointsCost} points`,
        });

      if (error) throw error;

      // Notify teachers of this class
      const { data: classInfo } = await supabase.from("classes").select("name, default_teacher_id").eq("id", classId).single();
      const { data: studentInfo } = await supabase.from("students").select("full_name").eq("id", studentId).single();

      // Find all teachers for this class via sessions
      const { data: teacherSessions } = await supabase
        .from("sessions")
        .select("teacher_id, teachers!inner(user_id)")
        .eq("class_id", classId);

      const teacherUserIds = new Set<string>();
      (teacherSessions || []).forEach((s: any) => {
        const t = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers;
        if (t?.user_id) teacherUserIds.add(t.user_id);
      });

      // Also add default teacher
      if (classInfo?.default_teacher_id) {
        const { data: dt } = await supabase.from("teachers").select("user_id").eq("id", classInfo.default_teacher_id).single();
        if (dt?.user_id) teacherUserIds.add(dt.user_id);
      }

      // Create notifications for each teacher
      const notifications = Array.from(teacherUserIds).map(userId => ({
        user_id: userId,
        title: `💰 Withdrawal Request`,
        message: `${studentInfo?.full_name || "A student"} wants to withdraw ${cashAmount} cash (${pointsCost} pts) in ${classInfo?.name || "class"}`,
        type: "economy_request",
        metadata: { class_id: classId, student_id: studentId, student_name: studentInfo?.full_name, class_name: classInfo?.name },
      }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      toast.success("Withdrawal request sent!", {
        description: "Your teacher will review and hand you the cash.",
      });
      onSuccess();
      onOpenChange(false);
      setCashAmount(1);
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
            <ArrowDownToLine className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
            Withdraw to Cash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center space-y-1">
            <p className="text-hec-small text-hec-ink-soft">Your Points Balance</p>
            <p className="whitespace-nowrap text-hec-h1 font-semibold tabular-nums text-hec-ink">{totalPoints}</p>
            <p className="text-hec-caption tabular-nums text-hec-ink-soft">{pointsToCashRate} pts = 1 cash unit</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-cash-amount">Cash to withdraw</Label>
            <Input
              id="withdraw-cash-amount"
              type="number"
              min={1}
              max={maxCash}
              value={cashAmount}
              onChange={(e) => setCashAmount(Math.max(1, Math.min(maxCash, parseInt(e.target.value) || 1)))}
            />
            <p className="text-hec-caption tabular-nums text-hec-ink-soft">Max: {maxCash} cash units</p>
          </div>

          {/* Visual conversion */}
          <div className="flex items-center justify-center gap-3 rounded-hec-md bg-hec-sunken p-3">
            <div className="text-center">
              <Coins className="mx-auto mb-1 h-5 w-5 text-hec-brass" aria-hidden />
              <p className="whitespace-nowrap font-semibold tabular-nums text-hec-ink">-{pointsCost}</p>
              <p className="text-hec-caption text-hec-ink-soft">Points</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
            <div className="text-center">
              <Banknote className="mx-auto mb-1 h-5 w-5 text-hec-ink-soft" aria-hidden />
              <p className="whitespace-nowrap font-semibold tabular-nums text-hec-ink">+{cashAmount}</p>
              <p className="text-hec-caption text-hec-ink-soft">Cash</p>
            </div>
          </div>

          <p className="text-center text-hec-caption text-hec-ink-soft">
            Your teacher will approve this and hand you the cash in class.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
