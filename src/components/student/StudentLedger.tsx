import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownToLine, ArrowUpFromLine, ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Loading } from "@/components/ui/loading";

interface StudentLedgerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  classId: string;
}

const typeConfig = {
  convert_to_cash: { icon: ArrowDownToLine, label: "Withdrawal", color: "text-hec-ink-soft" },
  spend_cash: { icon: ShoppingBag, label: "Spend", color: "text-hec-ink-soft" },
  deposit_cash: { icon: ArrowUpFromLine, label: "Deposit", color: "text-hec-ink-soft" },
};

const statusConfig = {
  pending: { icon: Clock, label: "Pending", variant: "secondary" as const },
  approved: { icon: CheckCircle, label: "Approved", variant: "default" as const },
  rejected: { icon: XCircle, label: "Rejected", variant: "destructive" as const },
};

export function StudentLedger({ open, onOpenChange, studentId, classId }: StudentLedgerProps) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["student-ledger", studentId, classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economy_transactions")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
        </DialogHeader>

        {/* Radix's viewport wraps content in a display:table div that grows with the row,
            which pushed the amounts past the dialog edge at 375 (R08): make it a block. */}
        <ScrollArea className="max-h-[60vh] [&>[data-radix-scroll-area-viewport]>div]:!block">
          {isLoading ? (
            <Loading size="sm" />
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-hec-body text-hec-ink-soft">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => {
                const typeInfo = typeConfig[tx.type as keyof typeof typeConfig] || typeConfig.convert_to_cash;
                const statusInfo = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-start gap-3 rounded-hec-md border border-hec-line bg-hec-surface p-3"
                  >
                    <div className={`shrink-0 rounded-full bg-hec-sunken p-2 ${typeInfo.color}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-hec-small font-medium text-hec-ink">{typeInfo.label}</p>
                      <p className="truncate text-hec-caption text-hec-ink-soft">
                        {tx.note || format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {tx.points_impact !== 0 && (
                          <span className="whitespace-nowrap text-hec-caption font-semibold tabular-nums text-hec-ink">
                            {tx.points_impact > 0 ? "+" : ""}{tx.points_impact} pts
                          </span>
                        )}
                        {tx.cash_impact !== 0 && (
                          <span className="whitespace-nowrap text-hec-caption font-semibold tabular-nums text-hec-ink">
                            {tx.cash_impact > 0 ? "+" : ""}{tx.cash_impact} 💵
                          </span>
                        )}
                      </div>
                      <Badge variant={statusInfo.variant} className="whitespace-nowrap">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
