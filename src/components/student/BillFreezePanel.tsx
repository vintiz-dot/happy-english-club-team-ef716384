import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatVND } from "@/hooks/useStudentMonthFinance";
import { cn } from "@/lib/utils";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

type Bill = { id: string; month: string; total_amount: number | null; tuition_frozen: boolean; frozen_reason: string | null };

export const billFreezeKey = (studentId: string) => ["bill-freeze", studentId];

export function useBillFreeze(studentId: string) {
  return useQuery({
    queryKey: billFreezeKey(studentId),
    queryFn: async (): Promise<Bill[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, month, total_amount, tuition_frozen, frozen_reason")
        .eq("student_id", studentId)
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
  });
}

const monthLabel = (m: string) =>
  new Date(`${m.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export function BillFreezePanel({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const { data: bills = [], isLoading } = useBillFreeze(studentId);
  const [target, setTarget] = useState<Bill | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  // D4 step 3B (G-18): UNLOCKING goes through the checked path as the
  // signed-in admin - always with a reason (it is never tier 0), a second one
  // when the bill is paid or confirmed, and one row that records it. The
  // database refuses a raw unlock. Locking is unchanged.
  const refresh = () => {
    qc.invalidateQueries({ queryKey: billFreezeKey(studentId) });
    qc.invalidateQueries({ queryKey: ["student-month-finance"] });
  };
  const money = useMoneyInput((_result, request) => {
    const bill = bills.find((b) => b.id === request.args.invoice_id);
    toast({ title: bill ? `${monthLabel(bill.month)} unlocked` : "Bill unlocked" });
    refresh();
  });
  const unlock = async (bill: Bill) => {
    setSaving(true);
    const r = await money.run({ entity: "invoice_freeze", op: "unfreeze", args: { invoice_id: bill.id } });
    setSaving(false);
    if (r.status === "refused") {
      toast({ title: "Couldn't change the lock", description: r.message, variant: "destructive" });
      refresh();
    } else if (r.status === "done") {
      refresh();
    }
  };

  const apply = async () => {
    if (!target) return;
    const freeze = !target.tuition_frozen;
    if (!freeze) {
      const bill = target;
      setTarget(null);
      await unlock(bill);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("invoices")
      .update({ tuition_frozen: true, frozen_reason: reason.trim() || null })
      .eq("id", target.id)
      .select("tuition_frozen")
      .single();
    setSaving(false);
    if (error || data?.tuition_frozen !== freeze) {
      toast({ title: "Couldn't change the lock", description: error?.message ?? "Only an admin can unlock a bill.", variant: "destructive" });
      return;
    }
    toast({ title: freeze ? `${monthLabel(target.month)} locked` : `${monthLabel(target.month)} unlocked` });
    setTarget(null);
    setReason("");
    qc.invalidateQueries({ queryKey: billFreezeKey(studentId) });
    qc.invalidateQueries({ queryKey: ["student-month-finance"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2")}>
          <Lock className={cn("h-4 w-4", "shrink-0 text-hec-ink-soft")} /> Locked bills
        </CardTitle>
        <p className={cn("text-hec-small text-hec-ink-soft")}>
          A locked bill keeps its charged amount even if enrollment or attendance is corrected later. Payments still count.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className={cn("text-hec-small text-hec-ink-soft")}>Loading…</p>
        ) : bills.length === 0 ? (
          <p className={cn("text-hec-small text-hec-ink-soft")}>No bills yet.</p>
        ) : (
          <ul className={cn("divide-y divide-hec-line")}>
            {bills.map((b) => (
              <li key={b.id} className={cn("flex flex-wrap items-start justify-between gap-3 py-3")}>
                <div className="min-w-0">
                  <div className={cn("font-medium", "text-hec-ink")}>{monthLabel(b.month)}</div>
                  <div className={cn("break-words text-hec-caption text-hec-ink-soft")}>
                    <span className={cn("whitespace-nowrap tabular-nums text-hec-ink")}>{formatVND(Number(b.total_amount ?? 0))}</span>
                    {b.tuition_frozen && b.frozen_reason ? ` · ${b.frozen_reason}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.tuition_frozen ? (
                    <Badge className="gap-1"><Lock className="h-3 w-3" /> Locked</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1"><LockOpen className="h-3 w-3" /> Open</Badge>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      // Unlock lets the next recalculation change a charged bill and opens the
                      // confirm: destructive-quiet look (DS s.14). Lock stays quiet.
                      className={cn(b.tuition_frozen && "border border-hec-danger bg-transparent text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger")}
                      onClick={() => {
                        if (b.tuition_frozen) void unlock(b);     // the reason dialog is the confirmation
                        else { setTarget(b); setReason(""); }
                      }}
                    >
                      {b.tuition_frozen ? "Unlock" : "Lock"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.tuition_frozen ? "Unlock" : "Lock"} {target ? monthLabel(target.month) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.tuition_frozen
                ? "The next recalculation may change this bill's amount to match current enrollment and attendance."
                : `The bill stays at ${formatVND(Number(target?.total_amount ?? 0))} no matter what is recalculated.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!target?.tuition_frozen && (
            <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className={cn(target?.tuition_frozen && "bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90")}
              onClick={(e) => { e.preventDefault(); apply(); }}
            >
              {target?.tuition_frozen ? "Unlock bill" : "Lock bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MoneyInputDialog guard={money.guard} />
    </Card>
  );
}
