import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hanoiToday } from "@/lib/leaderboard/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIvory } from "@/hooks/useIvory";

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
  const ivory = useIvory();

  const processMutation = useMutation({
    mutationFn: async ({ txId, status }: { txId: string; status: "approved" | "rejected" }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // The points move first. If the ledger refuses it, nothing else
      // happens: the request stays pending, the cash does not move, and
      // the child does not end up holding both.
      if (status === "approved") {
        const tx = pendingTransactions.find(t => t.id === txId);
        if (tx) {
          // The points side, as a ledger row. This used to edit
          // student_points directly, and the next award to the child
          // recalculated the month from the ledger and gave the spent
          // points back (docs/evidence/LEADERBOARD-audit.md, M10).
          const moved =
            (tx.type === "convert_to_cash" && tx.points_impact < 0) ||
            (tx.type === "deposit_cash" && tx.points_impact > 0);
          if (moved) {
            const today = hanoiToday();
            const { error: pointsError } = await supabase.from("point_transactions").insert({
              student_id: tx.student_id,
              class_id: classId,
              type: "adjustment",
              points: tx.points_impact,
              date: today,
              month: today.slice(0, 7),
              notes: tx.type === "convert_to_cash" ? "Points changed into class cash" : "Class cash changed back into points",
              created_by: user?.id ?? null,
            });
            if (pointsError) throw pointsError;
          }
        }
      }

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

        }
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Transaction ${status}`);
      queryClient.invalidateQueries({ queryKey: ["economy-pending", classId] });
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
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
        <div key={tx.id} className={ivory
          ? "flex items-start gap-2 p-3 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint text-hec-small text-hec-ink"
          : "flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-xs"}>
          <div className={ivory ? "flex-1 min-w-0 self-center" : "flex-1 min-w-0"}>
            <span className={ivory ? "font-medium whitespace-normal break-words hyphens-none" : "font-medium"}>{tx.student_name}</span>
            <span className={ivory ? "text-hec-ink-soft ml-1" : "text-muted-foreground ml-1"}>
              {tx.type === "convert_to_cash" ? `withdraw ${tx.cash_impact} cash` :
               tx.type === "deposit_cash" ? `deposit ${Math.abs(tx.cash_impact)} cash` :
               `spend ${Math.abs(tx.cash_impact)} cash`}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={ivory ? "shrink-0 text-hec-leaf hover:bg-hec-leaf-tint hover:text-hec-leaf" : "h-6 w-6 text-green-600 hover:bg-green-100"}
            onClick={() => processMutation.mutate({ txId: tx.id, status: "approved" })}
            disabled={processMutation.isPending}
            aria-label={ivory ? `Approve ${tx.student_name}'s request` : undefined}
          >
            <Check className={ivory ? "h-5 w-5" : "h-3.5 w-3.5"} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={ivory ? "shrink-0 text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger" : "h-6 w-6 text-red-500 hover:bg-red-100"}
            onClick={() => processMutation.mutate({ txId: tx.id, status: "rejected" })}
            disabled={processMutation.isPending}
            aria-label={ivory ? `Reject ${tx.student_name}'s request` : undefined}
          >
            <X className={ivory ? "h-5 w-5" : "h-3.5 w-3.5"} />
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
  const ivory = useIvory();

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
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
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
        className={ivory ? "text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger" : "h-6 w-6 text-red-500 hover:bg-red-100"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Log Spend"
        aria-label={ivory ? `Log spend for ${studentName}` : undefined}
      >
        <Minus className={ivory ? "h-5 w-5" : "h-3.5 w-3.5"} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className={ivory ? "break-words" : undefined}>Log Spend — {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground"}>Cash on hand: <strong className={ivory ? "tabular-nums text-hec-ink" : undefined}>{cashOnHand}</strong></p>
            <Input
              aria-label={ivory ? "Amount to deduct" : undefined}
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
