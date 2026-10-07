import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PendingTransaction {
  id: string;
  student_id: string;
  type: string;
  points_impact: number;
  cash_impact: number;
  note: string | null;
  student_name?: string;
}

interface EconomyActionsProps {
  classId: string;
  pendingTransactions: PendingTransaction[];
}

export function EconomyActions({ classId, pendingTransactions }: EconomyActionsProps) {
  const queryClient = useQueryClient();

  const processMutation = useMutation({
    mutationFn: async ({ txId, status }: { txId: string; status: "approved" | "rejected" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("economy_transactions")
        .update({ 
          status: status as any, 
          processed_by: user?.id 
        })
        .eq("id", txId);

      if (error) throw error;

      // If approved, update cash_on_hand
      if (status === "approved") {
        const tx = pendingTransactions.find(t => t.id === txId);
        if (tx) {
          // Fetch current cash
          const { data: student } = await supabase
            .from("students")
            .select("cash_on_hand")
            .eq("id", tx.student_id)
            .single();

          const currentCash = student?.cash_on_hand || 0;
          const newCash = currentCash + tx.cash_impact;

          // The result was discarded here. If row-level security refused the
          // write, the transaction was still marked approved and the UI still
          // reported success - so the student was told their cash had moved
          // when it had not. Approving money must fail loudly.
          const { error: cashError } = await supabase
            .from("students")
            .update({ cash_on_hand: Math.max(0, newCash) })
            .eq("id", tx.student_id);
          if (cashError) throw cashError;

          // For withdrawals, also deduct points from student_points
          if (tx.type === "convert_to_cash" && tx.points_impact < 0) {
            // Deduct from the latest month's participation_points
            const currentMonth = new Date().toISOString().slice(0, 7);
            const { data: sp } = await supabase
              .from("student_points")
              .select("participation_points")
              .eq("student_id", tx.student_id)
              .eq("class_id", classId)
              .eq("month", currentMonth)
              .single();

            if (sp) {
              // Same again: a silently refused deduction leaves the student
              // holding both the cash and the points they spent on it.
              const { error: pointsError } = await supabase
                .from("student_points")
                .update({
                  participation_points: Math.max(0, (sp.participation_points || 0) + tx.points_impact),
                })
                .eq("student_id", tx.student_id)
                .eq("class_id", classId)
                .eq("month", currentMonth);
              if (pointsError) throw pointsError;
            }
          }

          // For deposits, add points back
          if (tx.type === "deposit_cash" && tx.points_impact > 0) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const { data: sp } = await supabase
              .from("student_points")
              .select("participation_points")
              .eq("student_id", tx.student_id)
              .eq("class_id", classId)
              .eq("month", currentMonth)
              .single();

            if (sp) {
              await supabase
                .from("student_points")
                .update({
                  participation_points: (sp.participation_points || 0) + tx.points_impact,
                })
                .eq("student_id", tx.student_id)
                .eq("class_id", classId)
                .eq("month", currentMonth);
            }
          }
        }
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Transaction ${status}`);
      queryClient.invalidateQueries({ queryKey: ["economy-pending", classId] });
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["economy-cash-data"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process transaction");
    },
  });

  if (pendingTransactions.length === 0) return null;

  return (
    <div className="space-y-2">
      {pendingTransactions.map((tx) => (
        <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-medium">{tx.student_name}</span>
            <span className="text-muted-foreground ml-1">
              {tx.type === "convert_to_cash" ? `withdraw ${tx.cash_impact} cash` : 
               tx.type === "deposit_cash" ? `deposit ${Math.abs(tx.cash_impact)} cash` :
               `spend ${Math.abs(tx.cash_impact)} cash`}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-green-600 hover:bg-green-100"
            onClick={() => processMutation.mutate({ txId: tx.id, status: "approved" })}
            disabled={processMutation.isPending}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-500 hover:bg-red-100"
            onClick={() => processMutation.mutate({ txId: tx.id, status: "rejected" })}
            disabled={processMutation.isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// Quick Log Spend component for teacher to deduct cash inline
interface LogSpendProps {
  studentId: string;
  classId: string;
  studentName: string;
  cashOnHand: number;
}

export function LogSpendButton({ studentId, classId, studentName, cashOnHand }: LogSpendProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSpend = async () => {
    if (amount < 1 || amount > cashOnHand) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create approved spend transaction immediately
      const { error: txError } = await supabase
        .from("economy_transactions")
        .insert({
          student_id: studentId,
          class_id: classId,
          type: "spend_cash" as any,
          points_impact: 0,
          cash_impact: -amount,
          status: "approved" as any,
          processed_by: user?.id,
          note: `Teacher logged spend of ${amount} cash`,
        });

      if (txError) throw txError;

      // Update cash_on_hand
      await supabase
        .from("students")
        .update({ cash_on_hand: Math.max(0, cashOnHand - amount) })
        .eq("id", studentId);

      toast.success(`Deducted ${amount} cash from ${studentName}`);
      queryClient.invalidateQueries({ queryKey: ["economy-cash-data"] });
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
      setOpen(false);
      setAmount(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to log spend");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-red-500 hover:bg-red-100"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Log Spend"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Log Spend — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Cash on hand: <strong>{cashOnHand}</strong></p>
            <Input
              type="number"
              min={1}
              max={cashOnHand}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
              onKeyDown={(e) => e.key === "Enter" && handleSpend()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSpend} disabled={submitting || amount < 1 || amount > cashOnHand} variant="destructive" size="sm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
              Deduct {amount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
