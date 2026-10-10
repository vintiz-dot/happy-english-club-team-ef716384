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
  convert_to_cash: { icon: ArrowDownToLine, label: "Withdrawal", color: "text-blue-500" },
  spend_cash: { icon: ShoppingBag, label: "Spend", color: "text-red-500" },
  deposit_cash: { icon: ArrowUpFromLine, label: "Deposit", color: "text-green-500" },
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

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <Loading size="sm" />
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => {
                const typeInfo = typeConfig[tx.type as keyof typeof typeConfig] || typeConfig.convert_to_cash;
                const statusInfo = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.pending;
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{typeInfo.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.note || format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        {tx.points_impact !== 0 && (
                          <span className={`text-xs font-bold ${tx.points_impact > 0 ? "text-green-600" : "text-red-500"}`}>
                            {tx.points_impact > 0 ? "+" : ""}{tx.points_impact} pts
                          </span>
                        )}
                        {tx.cash_impact !== 0 && (
                          <span className={`text-xs font-bold ${tx.cash_impact > 0 ? "text-green-600" : "text-red-500"}`}>
                            {tx.cash_impact > 0 ? "+" : ""}{tx.cash_impact} 💵
                          </span>
                        )}
                      </div>
                      <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0">
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
