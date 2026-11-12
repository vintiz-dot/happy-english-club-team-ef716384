import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMonthSnapshots } from "@/hooks/useMonthlyFinanceSnapshots";
import { fetchBilledStudentIds } from "@/lib/finance/studentsInMonth";
import { useIvory } from "@/hooks/useIvory";

interface CloseMonthDialogProps {
  open: boolean;
  month: string;
  onClose: () => void;
}

const BULK_CHUNK_SIZE = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function CloseMonthDialog({ open, month, onClose }: CloseMonthDialogProps) {
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const [closeReason, setCloseReason] = useState("");
  const [allowSupersede, setAllowSupersede] = useState(false);
  const [supersedeReason, setSupersedeReason] = useState("");

  const { data: existingSnapshots = [] } = useMonthSnapshots(month);

  const { data: targetStudentIds, isLoading: loadingTargets } = useQuery({
    queryKey: ["close-month-targets", month],
    enabled: open,
    // Month-aware roster: a student deactivated after this month was still
    // here during it, so they must be snapshotted too. Missing them here is
    // permanent — the frozen record is what audits read years later.
    queryFn: () => fetchBilledStudentIds(month),
  });

  const totalTargets = targetStudentIds?.length ?? 0;
  const alreadyClosedIds = new Set(existingSnapshots.map((s) => s.student_id));
  const newCloseCount = (targetStudentIds ?? []).filter((id) => !alreadyClosedIds.has(id)).length;
  const alreadyClosedCount = (targetStudentIds ?? []).filter((id) => alreadyClosedIds.has(id)).length;

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!targetStudentIds || targetStudentIds.length === 0) {
        throw new Error("No students with active enrollments for this month.");
      }
      if (allowSupersede && !supersedeReason.trim()) {
        throw new Error("A supersede reason is required when re-closing already-snapshotted months.");
      }

      // 1) Pull live tuition for every target student via the existing
      //    bulk edge function. Chunk to respect its 200-id input limit.
      const chunks = chunk(targetStudentIds, BULK_CHUNK_SIZE);
      const allResults: any[] = [];
      for (const ids of chunks) {
        const { data, error } = await supabase.functions.invoke("calculate-tuition-bulk", {
          body: { studentIds: ids, month },
        });
        if (error) throw error;
        if (data?.results) allResults.push(...data.results);
      }

      // 2) Persist via the snapshot edge function. Tuition logic is not
      //    re-touched here — we hand calculate-tuition-bulk's output through
      //    verbatim.
      const { data: snapResp, error: snapErr } = await supabase.functions.invoke(
        "snapshot-monthly-finance",
        {
          body: {
            month,
            results: allResults,
            closeReason: closeReason.trim() || undefined,
            supersedeReason: allowSupersede ? supersedeReason.trim() : undefined,
          },
        },
      );
      if (snapErr) throw snapErr;
      return snapResp as {
        insertedCount: number;
        supersededCount: number;
        skippedCount: number;
        failedCount: number;
      };
    },
    onSuccess: (res) => {
      toast.success(
        `Closed ${month}: ${res.insertedCount} new, ${res.supersededCount} superseded, ${res.skippedCount} skipped, ${res.failedCount} failed.`,
      );
      queryClient.invalidateQueries({ queryKey: ["monthly-snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-snapshot-timeline"] });
      onClose();
      setCloseReason("");
      setAllowSupersede(false);
      setSupersedeReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to close month");
    },
  });

  const willActuallyWrite = allowSupersede ? totalTargets : newCloseCount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Close {formatMonthLabel(month)}
          </DialogTitle>
          <DialogDescription>
            Freeze every active student's finance for {formatMonthLabel(month)} into an immutable snapshot.
            Live tuition values are read from the existing edge function — no recompute, no overwrite.
          </DialogDescription>
        </DialogHeader>

        <div className={iv("space-y-4 text-hec-small text-hec-ink", "space-y-3 text-sm")}>
          {loadingTargets ? (
            <div className={iv("flex items-center gap-2 text-hec-ink-soft", "flex items-center gap-2 text-muted-foreground")}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Counting targets…
            </div>
          ) : (
            <div className={iv("space-y-2 rounded-hec-md border border-hec-line bg-hec-sunken p-4", "rounded-md border bg-muted/30 p-3 space-y-1")}>
              <Row label="Active students with enrollments" value={totalTargets} ivory={ivory} />
              <Row label="Already closed" value={alreadyClosedCount} hint="Skipped unless re-close is enabled" ivory={ivory} />
              <Row label="To be snapshotted" value={willActuallyWrite} bold ivory={ivory} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="close-reason" className={iv("text-hec-small font-medium text-hec-ink", "text-xs")}>
              Close reason (optional)
            </Label>
            <Input
              id="close-reason"
              placeholder="e.g. Month-end audit close"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              maxLength={500}
            />
          </div>

          {alreadyClosedCount > 0 && (
            <div className={iv("space-y-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4", "rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2")}>
              <div className={iv("flex items-center gap-2 text-hec-small font-medium text-hec-warn", "flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-medium")}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {alreadyClosedCount} student{alreadyClosedCount === 1 ? "" : "s"} already snapshotted
              </div>
              <label className={iv("flex min-h-hec-target cursor-pointer items-start gap-3 text-hec-small text-hec-ink", "flex items-start gap-2 text-xs cursor-pointer")}>
                <Checkbox
                  checked={allowSupersede}
                  onCheckedChange={(v) => setAllowSupersede(!!v)}
                  className={iv("mt-1", "mt-0.5")}
                />
                <span>
                  Re-close anyway. Existing snapshots will be marked superseded (kept for audit) and a new
                  version written.
                </span>
              </label>
              {allowSupersede && (
                <div className="space-y-1">
                  <Label htmlFor="supersede-reason" className={iv("text-hec-small font-medium text-hec-ink", "text-xs")}>
                    Supersede reason (required)
                  </Label>
                  <Input
                    id="supersede-reason"
                    placeholder="e.g. Late attendance correction for 3 students"
                    value={supersedeReason}
                    onChange={(e) => setSupersedeReason(e.target.value)}
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Ivory: the safe way out is the secondary (outline) button; closing the
              month writes immutable snapshots, so it is the one red fill. */}
          <Button variant={ivory ? "outline" : "ghost"} onClick={onClose} disabled={closeMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant={ivory ? "destructive" : "default"}
            onClick={() => closeMutation.mutate()}
            disabled={
              closeMutation.isPending ||
              loadingTargets ||
              willActuallyWrite === 0 ||
              (allowSupersede && !supersedeReason.trim())
            }
            className="gap-2"
          >
            {closeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {ivory && closeMutation.isPending ? "Closing month..." : "Close Month"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, hint, bold, ivory }: { label: string; value: number; hint?: string; bold?: boolean; ivory?: boolean }) {
  if (ivory) {
    // The one total of the panel sits under the 2 px ink rule (DESIGN_SYSTEM s.14).
    return (
      <div className={`flex items-baseline justify-between gap-4 ${bold ? "border-t-2 border-hec-ink pt-3" : ""}`}>
        <div className="min-w-0">
          <div className={bold ? "font-semibold text-hec-ink" : "text-hec-ink-soft"}>{label}</div>
          {hint && <div className="text-hec-caption text-hec-ink-soft">{hint}</div>}
        </div>
        <div className={`shrink-0 whitespace-nowrap font-sans tabular-nums text-hec-ink ${bold ? "text-hec-h3 font-semibold" : ""}`}>{value}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className={bold ? "font-semibold" : ""}>{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</div>
    </div>
  );
}

function formatMonthLabel(month: string): string {
  const d = new Date(`${month}-01`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
