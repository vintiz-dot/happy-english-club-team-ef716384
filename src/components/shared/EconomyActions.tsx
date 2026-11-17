import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      // One transaction on the server, keyed by the request
      // (economy_process, 20261117130000): the request is claimed, the
      // points move as a ledger row, the cash moves, or none of it does. A
      // request already handled (two teachers, a double click, a retry) is
      // refused, and spending may not take a month below zero.
      const { error } = await supabase.rpc("economy_process" as never, { p_tx: txId, p_status: status } as never);
      if (error) throw error;
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
