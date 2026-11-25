import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
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
import { isMissingTrialTable, trialRows, trialValue, type TrialRow, type TuitionLesson } from "@/lib/freeTrialLessons";

/**
 * Free trial lessons for one child and month (owner, 24 Nov 2026).
 *
 * The lessons and their states are calculate-tuition's (`lessons`). An admin
 * ticks a lesson as a free trial, with a reason; the row goes into
 * free_trial_lessons and the month is priced again without it. Nothing is
 * priced here. A closed month keeps its bill until the change is approved in
 * Reports > Checks, like every other change to a closed month.
 */

const monthName = (m: string) =>
  new Date(`${m.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const dayLabel = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function FreeTrialPanel({
  studentId, month, lessons, canEdit,
}: { studentId: string; month: string; lessons: TuitionLesson[] | undefined; canEdit: boolean }) {
  const rows = trialRows(lessons);
  const given = trialValue(lessons);
  const [target, setTarget] = useState<TrialRow | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["student-month-finance", studentId] });
    qc.invalidateQueries({ queryKey: ["admin-tuition-list"] });
  };
  const failed = (error: { code?: string; message?: string }) =>
    toast({
      title: "The lesson was not changed",
      description: isMissingTrialTable(error)
        ? "Free trial lessons are not installed in the database yet (migration 20261124090000_free_trial_lessons.sql)."
        : error.message ?? "Only an admin can give a free trial lesson.",
      variant: "destructive",
    });

  const give = async () => {
    if (!target || !reason.trim()) return;
    setSaving(true);
    const { error } = await (supabase.from as any)("free_trial_lessons")
      .insert({ student_id: studentId, session_id: target.lesson.session_id, reason: reason.trim() });
    setSaving(false);
    if (error) return failed(error);
    toast({ title: `${dayLabel(target.lesson.date)} is now a free trial lesson` });
    setTarget(null);
    setReason("");
    refresh();
  };
  const takeBack = async (row: TrialRow) => {
    setSaving(true);
    const { error } = await (supabase.from as any)("free_trial_lessons")
      .delete().eq("student_id", studentId).eq("session_id", row.lesson.session_id);
    setSaving(false);
    if (error) return failed(error);
    toast({ title: `${dayLabel(row.lesson.date)} is charged again` });
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-4 w-4 shrink-0 text-hec-ink-soft" /> Free trial lessons
        </CardTitle>
        <p className="text-hec-small text-hec-ink-soft">
          A lesson given as a free trial is not charged, whatever its attendance mark. Choose the lessons here; the
          month's bill is worked out again without them. For a month that is already closed the bill stays as charged
          until you approve the change in Finance &gt; Tuition.
          {given.lessons > 0 && (
            <> This month: {given.lessons} free trial lesson{given.lessons === 1 ? "" : "s"}, worth{" "}
              <span className="whitespace-nowrap tabular-nums text-hec-ink">{formatVND(given.amount)}</span>.</>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-hec-small text-hec-ink-soft">No lessons for this child in this month.</p>
        ) : (
          <ul className="divide-y divide-hec-line">
            {rows.map((r) => (
              <li key={r.lesson.session_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-hec-ink">
                    {dayLabel(r.lesson.date)}
                    {r.lesson.class_name ? <span className="font-normal text-hec-ink-soft"> · {r.lesson.class_name}</span> : null}
                  </div>
                  <div className="text-hec-caption text-hec-ink-soft">
                    <span className="whitespace-nowrap tabular-nums">{formatVND(Number(r.lesson.price_vnd ?? 0))}</span>
                    {" · "}{r.label}
                    {r.lesson.mark ? ` · marked ${r.lesson.mark}` : r.lesson.held ? " · no mark" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.lesson.state === "trial" && <Badge className="gap-1"><Gift className="h-3 w-3" /> Free trial</Badge>}
                  {canEdit && r.action === "give" && (
                    <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setTarget(r); setReason(""); }}>
                      Make free trial
                    </Button>
                  )}
                  {canEdit && r.action === "take_back" && (
                    <Button size="sm" variant="ghost" disabled={saving} onClick={() => void takeBack(r)}>
                      Charge again
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
              Make {target ? dayLabel(target.lesson.date) : ""} a free trial lesson?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The lesson ({formatVND(Number(target?.lesson.price_vnd ?? 0))}) comes off this child's {monthName(month)} bill. You can
              charge it again from this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason, for example: first lesson, trial before enrolling"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !reason.trim()}
              onClick={(e) => { e.preventDefault(); void give(); }}
            >
              {saving ? "Saving..." : "Make free trial"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
