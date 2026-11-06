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

  const apply = async () => {
    if (!target) return;
    const freeze = !target.tuition_frozen;
    setSaving(true);
    const { data, error } = await supabase
      .from("invoices")
      .update(freeze ? { tuition_frozen: true, frozen_reason: reason.trim() || null } : { tuition_frozen: false })
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-4 w-4" /> Locked bills
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A locked bill keeps its charged amount even if enrollment or attendance is corrected later. Payments still count.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills yet.</p>
        ) : (
          <ul className="divide-y">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium">{monthLabel(b.month)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {formatVND(Number(b.total_amount ?? 0))}
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
                    <Button size="sm" variant="ghost" onClick={() => { setTarget(b); setReason(""); }}>
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
            <AlertDialogAction disabled={saving} onClick={(e) => { e.preventDefault(); apply(); }}>
              {target?.tuition_frozen ? "Unlock bill" : "Lock bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
