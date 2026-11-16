import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, BookOpen, Users, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface PointHistoryDialogProps {
  studentId: string;
  classId: string;
  month: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete?: boolean;
}

export function PointHistoryDialog({
  studentId,
  classId,
  month,
  studentName,
  open,
  onOpenChange,
  canDelete = false,
}: PointHistoryDialogProps) {
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; points: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["point-transactions", studentId, classId, month],
    queryFn: async () => {
      const [year, monthNum] = month.split('-').map(Number);
      const nextMonth = monthNum === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`;
      
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .gte("date", `${month}-01`)
        .lt("date", nextMonth)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "homework":
        return <BookOpen className="h-4 w-4" />;
      case "participation":
        return <Users className="h-4 w-4" />;
      case "adjustment":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Every type gets the same quiet tile: the icon and the badge's word tell
  // the types apart, so no colour has to (DS s.14).
  const getTypeColor = (_type: string) => "bg-hec-sunken text-hec-ink-soft";

  const totalPoints = transactions?.reduce((sum, t) => sum + t.points, 0) || 0;
  const selectedPoints = transactions?.filter(t => selectedIds.has(t.id)).reduce((sum, t) => sum + t.points, 0) || 0;

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["point-transactions", studentId, classId, month] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["student-points"] });
    queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("point_transactions")
        .delete()
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Point entry deleted", description: "The leaderboard has been updated." });
      setTransactionToDelete(null);
    },
    onError: (error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("point_transactions")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ 
        title: `${selectedIds.size} point entries deleted`, 
        description: "The leaderboard has been updated." 
      });
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (!transactions) return;
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedIds(new Set());
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2">
            <Calendar className="mt-1 h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0 whitespace-normal break-words hyphens-none text-balance">Point History - {studentName}</span>
          </DialogTitle>
          <p className="text-hec-small tabular-nums text-hec-ink-soft">
            {format(new Date(`${month}-01`), "MMMM yyyy")} • Total: {totalPoints} points
          </p>
        </DialogHeader>

        {canDelete && transactions && transactions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hec-line pb-3">
            <div className="flex min-h-hec-target items-center gap-3">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === transactions.length && transactions.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="cursor-pointer py-2 text-hec-small text-hec-ink">
                Select all ({transactions.length})
              </label>
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive-quiet"
                size="sm"
                className="tabular-nums"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete {selectedIds.size} selected ({selectedPoints > 0 ? '+' : ''}{selectedPoints} pts)
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[500px] pr-4">
          {isLoading ? (
            <p className="py-8 text-center text-hec-body text-hec-ink-soft">Loading history...</p>
          ) : transactions?.length === 0 ? (
            <p className="py-8 text-center text-hec-body text-hec-ink-soft">No point history for this month</p>
          ) : (
            <div className="space-y-2">
              {transactions?.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`rounded-hec-md border p-4 transition-colors duration-hec-1 ease-hec ${
                    selectedIds.has(transaction.id) ? 'border-hec-brass bg-hec-sunken' : 'border-hec-line bg-hec-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {canDelete && (
                        <Checkbox
                          checked={selectedIds.has(transaction.id)}
                          onCheckedChange={() => toggleSelect(transaction.id)}
                          aria-label={`Select ${transaction.type} entry, ${format(new Date(transaction.date), "MMM dd, yyyy")}`}
                          className="mt-1"
                        />
                      )}
                      <div className={`shrink-0 rounded-hec-sm p-2 ${getTypeColor(transaction.type)}`} aria-hidden>
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="capitalize"
                          >
                            {transaction.type}
                          </Badge>
                          <span className="text-hec-caption tabular-nums text-hec-ink-soft">
                            {format(new Date(transaction.date), "MMM dd, yyyy")}
                          </span>
                        </div>

                        {transaction.type === "homework" && transaction.homework_title && (
                          <p className="mb-1 break-words text-hec-small font-medium text-hec-ink">
                            {transaction.homework_title}
                          </p>
                        )}

                        {transaction.type === "participation" && (
                          <p className="mb-1 text-hec-small font-medium text-hec-ink">
                            Class Participation
                          </p>
                        )}

                        {transaction.type === "adjustment" && (
                          <p className="mb-1 text-hec-small font-medium text-hec-ink">
                            Point Adjustment
                          </p>
                        )}

                        {transaction.notes && (
                          <p className="break-words text-hec-caption text-hec-ink-soft">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center gap-1">
                        {transaction.points > 0 ? (
                          <TrendingUp className="h-4 w-4 text-hec-leaf" aria-hidden />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-hec-danger" aria-hidden />
                        )}
                        <span
                          className={`whitespace-nowrap text-hec-h3 font-semibold tabular-nums ${
                            transaction.points > 0 ? "text-hec-leaf" : "text-hec-danger"
                          }`}
                        >
                          {transaction.points > 0 ? "+" : ""}
                          {transaction.points}
                        </span>
                      </div>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-hec-ink-soft hover:bg-hec-danger-tint hover:text-hec-danger"
                          aria-label={`Delete this ${transaction.type} entry`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransactionToDelete({ id: transaction.id, points: transaction.points });
                          }}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Single delete confirmation */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Point Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {transactionToDelete?.points} point{Math.abs(transactionToDelete?.points || 0) !== 1 ? 's' : ''} from {studentName}'s total. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the entry</AlertDialogCancel>
            <AlertDialogAction
              className="bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90"
              onClick={() => transactionToDelete && deleteMutation.mutate(transactionToDelete.id)}
            >
              Delete the entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Point Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedPoints} point{Math.abs(selectedPoints) !== 1 ? 's' : ''} from {studentName}'s total. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the entries</AlertDialogCancel>
            <AlertDialogAction
              className="bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedIds.size} entries`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
