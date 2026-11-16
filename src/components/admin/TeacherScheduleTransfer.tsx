import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, AlertTriangle, CheckCircle2, Calendar, Clock, Users, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";

interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  class_id: string;
  teacher_id: string;
  classes: { id: string; name: string };
}

interface Conflict {
  sourceSession: Session;
  targetSession: Session;
}

type ConflictResolution = {
  sessionId: string;
  action: "reschedule" | "reassign";
  newDate?: string;
  newTeacherId?: string;
};

export function TeacherScheduleTransfer() {
  const queryClient = useQueryClient();
  const [sourceTeacherId, setSourceTeacherId] = useState<string>("");
  const [targetTeacherId, setTargetTeacherId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(dayjs().format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().add(3, "month").format("YYYY-MM-DD"));
  const [step, setStep] = useState<"select" | "review" | "conflicts" | "done">("select");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [transferableSessions, setTransferableSessions] = useState<Session[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [reassignTeacherPick, setReassignTeacherPick] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sourceSessions, isFetching: loadingSource } = useQuery({
    queryKey: ["transfer-source-sessions", sourceTeacherId, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, teacher_id, classes!inner(id, name)")
        .eq("teacher_id", sourceTeacherId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .in("status", ["Scheduled"])
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!sourceTeacherId && !!dateFrom && !!dateTo,
  });

  const { data: targetSessions, isFetching: loadingTarget } = useQuery({
    queryKey: ["transfer-target-sessions", targetTeacherId, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, teacher_id, classes!inner(id, name)")
        .eq("teacher_id", targetTeacherId)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .in("status", ["Scheduled"])
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!targetTeacherId && !!dateFrom && !!dateTo,
  });

  const sourceTeacher = teachers.find((t) => t.id === sourceTeacherId);
  const targetTeacher = teachers.find((t) => t.id === targetTeacherId);
  const otherTeachers = teachers.filter((t) => t.id !== sourceTeacherId && t.id !== targetTeacherId);

  const checkCompatibility = () => {
    if (!sourceSessions || !targetSessions) return;

    const foundConflicts: Conflict[] = [];
    const safe: Session[] = [];

    for (const src of sourceSessions) {
      const overlap = targetSessions.find(
        (tgt) =>
          tgt.date === src.date &&
          src.start_time < tgt.end_time &&
          src.end_time > tgt.start_time
      );
      if (overlap) {
        foundConflicts.push({ sourceSession: src, targetSession: overlap });
      } else {
        safe.push(src);
      }
    }

    setTransferableSessions(safe);
    setConflicts(foundConflicts);
    setResolutions({});
    setReassignTeacherPick({});
    setStep(foundConflicts.length > 0 ? "conflicts" : "review");
  };

  const allConflictsResolved = conflicts.every((c) => {
    const res = resolutions[c.sourceSession.id];
    if (!res) return false;
    if (res.action === "reassign" && !res.newTeacherId) return false;
    return true;
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      // 1. Transfer non-conflicting sessions
      if (transferableSessions.length > 0) {
        const ids = transferableSessions.map((s) => s.id);
        const { error } = await supabase
          .from("sessions")
          .update({ teacher_id: targetTeacherId })
          .in("id", ids);
        if (error) throw error;
      }

      // 2. Handle conflict resolutions
      for (const conflict of conflicts) {
        const res = resolutions[conflict.sourceSession.id];
        if (!res) continue;

        if (res.action === "reassign" && res.newTeacherId) {
          const { error } = await supabase
            .from("sessions")
            .update({ teacher_id: res.newTeacherId })
            .eq("id", conflict.sourceSession.id);
          if (error) throw error;
        }
        // "reschedule" leaves session with source teacher for now — admin can reschedule manually
      }
    },
    onSuccess: () => {
      toast.success("Schedule transfer completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["transfer-source-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-target-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setShowConfirmDialog(false);
      setStep("done");
    },
    onError: (err: any) => {
      toast.error(`Transfer failed: ${err.message}`);
    },
  });

  const resolveConflict = (sessionId: string, action: "reschedule" | "reassign", newTeacherId?: string) => {
    setResolutions((prev) => ({
      ...prev,
      [sessionId]: { sessionId, action, newTeacherId },
    }));
  };

  const reset = () => {
    setSourceTeacherId("");
    setTargetTeacherId("");
    setStep("select");
    setConflicts([]);
    setTransferableSessions([]);
    setResolutions({});
    setReassignTeacherPick({});
  };

  const totalToTransfer = transferableSessions.length + conflicts.filter((c) => resolutions[c.sourceSession.id]?.action === "reassign").length;
  const skipped = conflicts.filter((c) => resolutions[c.sourceSession.id]?.action === "reschedule").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Schedule Transfer
        </CardTitle>
        <CardDescription>Transfer a teacher's future sessions to another teacher</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step indicator */}
        <div className="flex flex-wrap items-center gap-2 text-hec-small">
          {["select", "review", "done"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 bg-hec-line" />}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-hec-caption font-semibold tabular-nums transition-colors duration-hec-1 ease-hec ${
                  step === s || (step === "conflicts" && s === "review")
                    ? "bg-hec-action text-hec-on-action"
                    : "bg-hec-sunken text-hec-ink-soft"
                }`}
              >
                {i + 1}
              </div>
              <span className="capitalize text-hec-ink-soft">{s === "review" ? "Review" : s}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Select teachers & date range */}
        {step === "select" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="transfer-from-teacher">From Teacher</Label>
                <Select value={sourceTeacherId} onValueChange={(v) => { setSourceTeacherId(v); setTargetTeacherId(""); }}>
                  <SelectTrigger id="transfer-from-teacher">
                    <SelectValue placeholder="Select source teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-to-teacher">To Teacher</Label>
                <Select value={targetTeacherId} onValueChange={setTargetTeacherId} disabled={!sourceTeacherId}>
                  <SelectTrigger id="transfer-to-teacher">
                    <SelectValue placeholder="Select target teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.filter((t) => t.id !== sourceTeacherId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="transfer-date-from">From Date</Label>
                <input
                  id="transfer-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="min-h-hec-target w-full rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 text-hec-body text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-date-to">To Date</Label>
                <input
                  id="transfer-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="min-h-hec-target w-full rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 text-hec-body text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                />
              </div>
            </div>

            {sourceTeacherId && targetTeacherId && (
              <div className="flex items-center gap-3 rounded-hec-md border border-hec-line bg-hec-sunken p-4">
                <div className="min-w-0 flex-1 text-center">
                  <p className="whitespace-normal break-words text-hec-body font-semibold text-hec-ink">{sourceTeacher?.full_name}</p>
                  <p className="text-hec-small tabular-nums text-hec-ink-soft">{sourceSessions?.length ?? "..."} sessions</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                <div className="min-w-0 flex-1 text-center">
                  <p className="whitespace-normal break-words text-hec-body font-semibold text-hec-ink">{targetTeacher?.full_name}</p>
                  <p className="text-hec-small tabular-nums text-hec-ink-soft">{targetSessions?.length ?? "..."} existing sessions</p>
                </div>
              </div>
            )}

            <Button
              onClick={checkCompatibility}
              disabled={!sourceTeacherId || !targetTeacherId || loadingSource || loadingTarget || !sourceSessions?.length}
              className="w-full"
            >
              {loadingSource || loadingTarget ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading sessions...</>
              ) : (
                <>Check Compatibility</>
              )}
            </Button>

            {sourceSessions && sourceSessions.length === 0 && sourceTeacherId && (
              <p className="text-center text-hec-small text-hec-ink-soft">No future sessions found for this teacher in the selected date range.</p>
            )}
          </div>
        )}

        {/* STEP 2: Review (no conflicts) */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-hec-leaf" />
              <div className="min-w-0">
                <p className="font-semibold text-hec-leaf">No Conflicts Detected!</p>
                <p className="text-hec-small text-hec-ink-soft">
                  All {transferableSessions.length} sessions can be safely transferred.
                </p>
              </div>
            </div>

            <SessionList sessions={transferableSessions} label="Sessions to transfer" />

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button className="flex-1" onClick={() => setShowConfirmDialog(true)}>
                Transfer {transferableSessions.length} Sessions
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2b: Conflicts */}
        {step === "conflicts" && (
          <div className="space-y-5">
            {transferableSessions.length > 0 && (
              <div className="flex items-start gap-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hec-leaf" />
                <p className="text-hec-small text-hec-ink">
                  <span className="font-semibold">{transferableSessions.length}</span> sessions can transfer without issues.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" />
              <p className="text-hec-small text-hec-ink">
                <span className="font-semibold">{conflicts.length}</span> session(s) have time conflicts. Resolve each below:
              </p>
            </div>

            <div className="space-y-3">
              {conflicts.map((conflict) => {
                const res = resolutions[conflict.sourceSession.id];
                return (
                  <div
                    key={conflict.sourceSession.id}
                    className={`rounded-hec-md border p-4 transition-colors duration-hec-1 ease-hec ${
                      res ? "border-hec-brass bg-hec-surface" : "border-hec-warn/30 bg-hec-warn-tint"
                    }`}
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="whitespace-normal break-words text-hec-small font-semibold text-hec-ink">{conflict.sourceSession.classes.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-hec-caption tabular-nums text-hec-ink-soft">
                          <Calendar className="h-4 w-4" />
                          {dayjs(conflict.sourceSession.date).format("ddd, MMM D")}
                          <Clock className="ml-1 h-4 w-4" />
                          {conflict.sourceSession.start_time.slice(0, 5)}–{conflict.sourceSession.end_time.slice(0, 5)}
                        </div>
                      </div>
                      <div className="self-start whitespace-normal break-words rounded-hec-sm border border-hec-danger/30 bg-hec-danger-tint px-2 py-1 text-hec-caption text-hec-danger sm:max-w-[50%]">
                        Overlaps with: <strong>{conflict.targetSession.classes.name}</strong>{" "}
                        ({conflict.targetSession.start_time.slice(0, 5)}–{conflict.targetSession.end_time.slice(0, 5)})
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={res?.action === "reschedule" ? "default" : "outline"}
                        onClick={() => resolveConflict(conflict.sourceSession.id, "reschedule")}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Keep with {sourceTeacher?.full_name?.split(" ")[0]}
                      </Button>
                      <Button
                        size="sm"
                        variant={res?.action === "reassign" ? "default" : "outline"}
                        onClick={() => resolveConflict(conflict.sourceSession.id, "reassign")}
                      >
                        <Users className="h-4 w-4 mr-1" /> Assign to another teacher
                      </Button>
                    </div>

                    {res?.action === "reassign" && (
                      <div className="mt-3">
                        <Select
                          value={reassignTeacherPick[conflict.sourceSession.id] || ""}
                          onValueChange={(v) => {
                            setReassignTeacherPick((prev) => ({ ...prev, [conflict.sourceSession.id]: v }));
                            resolveConflict(conflict.sourceSession.id, "reassign", v);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-64">
                            <SelectValue placeholder="Pick a teacher..." />
                          </SelectTrigger>
                          <SelectContent>
                            {otherTeachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button
                className="flex-1 whitespace-normal"
                disabled={!allConflictsResolved}
                onClick={() => setShowConfirmDialog(true)}
              >
                {allConflictsResolved
                  ? `Transfer ${totalToTransfer} Sessions${skipped > 0 ? ` (${skipped} kept)` : ""}`
                  : `Resolve all conflicts first`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && (
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-hec-leaf" />
            <div>
              <p className="text-hec-h3 text-hec-ink">Transfer Complete</p>
              <p className="text-hec-small text-hec-ink-soft">
                Sessions have been reassigned successfully.
              </p>
            </div>
            <Button variant="outline" onClick={reset}>Start New Transfer</Button>
          </div>
        )}

        {/* Confirm dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Schedule Transfer</DialogTitle>
              <DialogDescription>
                This will reassign <strong>{totalToTransfer}</strong> session(s) from{" "}
                <strong>{sourceTeacher?.full_name}</strong> to <strong>{targetTeacher?.full_name}</strong>.
                {skipped > 0 && (
                  <> {skipped} conflicting session(s) will remain with the original teacher.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
              <Button onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending}>
                {transferMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Transferring...</>
                ) : (
                  "Confirm Transfer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SessionList({ sessions, label }: { sessions: Session[]; label: string }) {
  const grouped = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      const key = s.date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-hec-small font-medium text-hec-ink-soft">{label} ({sessions.length})</p>
      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {grouped.map(([date, items]) => (
          <div key={date} className="flex items-start gap-3 border-b border-hec-line py-2 last:border-0">
            <span className="w-20 shrink-0 pt-1 text-hec-caption tabular-nums text-hec-ink-soft">
              {dayjs(date).format("ddd M/D")}
            </span>
            <div className="flex min-w-0 flex-wrap gap-2">
              {items.map((s) => (
                <Badge key={s.id} variant="secondary" className="whitespace-normal break-words">
                  {s.classes.name} {s.start_time.slice(0, 5)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
