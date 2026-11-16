import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PayGuardDialog, type GuardSessionInfo } from "@/components/admin/session-guard/GuardDialog";
import { payOpFromDbError } from "@/lib/lessonPayGuard";

interface TAClassAssignmentProps {
  taId: string;
}

type AssignMode = "once" | "recurring" | "month" | "permanent";

/** One lesson whose assistants are pay (D4 step 3A, G-6): the lesson-pay check, with the whole list after the change. */
interface PayStep { session: GuardSessionInfo; args: Record<string, unknown> }

/** The lesson's assistant list as the check sends it, with this assistant added or removed (each one's absence kept). */
async function staffAfter(sessionId: string, taId: string, add: boolean) {
  const { data, error } = await supabase
    .from("session_participants")
    .select("teaching_assistant_id, attended")
    .eq("session_id", sessionId)
    .eq("participant_type", "teaching_assistant");
  if (error) throw error;
  const list = (data ?? [])
    .filter((r: any) => r.teaching_assistant_id && r.teaching_assistant_id !== taId)
    .map((r: any) => ({ teaching_assistant_id: r.teaching_assistant_id as string, attended: r.attended !== false }));
  if (add) list.push({ teaching_assistant_id: taId, attended: true });
  return { session_id: sessionId, participants: list };
}

export function TAClassAssignment({ taId }: TAClassAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignMode, setAssignMode] = useState<AssignMode>("recurring");
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(new Date());
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  // D4 step 3A (review N-3): held lessons more than a week old (or in a closed
  // payroll month) whose assistants the database refused; checked one by one.
  const [payQueue, setPayQueue] = useState<PayStep[]>([]);

  // Fetch active classes
  const { data: classes } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sessions for selected class based on mode
  const { data: availableSessions } = useQuery({
    queryKey: ["class-sessions-for-ta", selectedClassId, assignMode, effectiveFrom],
    enabled: !!selectedClassId && !!effectiveFrom && assignMode !== "permanent",
    queryFn: async () => {
      const fromDate = effectiveFrom ? format(effectiveFrom, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

      let query = supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, classes!inner(name)")
        .eq("class_id", selectedClassId)
        .neq("status", "Canceled")
        .gte("date", fromDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (assignMode === "once") {
        query = query.limit(20);
      } else if (assignMode === "month") {
        const monthEnd = new Date(effectiveFrom!.getFullYear(), effectiveFrom!.getMonth() + 1, 0);
        query = query.lte("date", format(monthEnd, "yyyy-MM-dd"));
      } else {
        // recurring - show next 3 months
        const threeMonths = new Date(effectiveFrom!);
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        query = query.lte("date", format(threeMonths, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current TA assignments
  const { data: currentAssignments } = useQuery({
    queryKey: ["ta-assignments", taId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_participants")
        .select("id, session_id, sessions!inner(date, start_time, end_time, status, classes!inner(name))")
        .eq("teaching_assistant_id", taId)
        .eq("participant_type", "teaching_assistant")
        .order("sessions(date)", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Standing assignments: on the class until an admin removes them.
  const { data: standing } = useQuery({
    queryKey: ["ta-standing", taId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("class_teaching_assistants")
        .select("id, class_id, classes(name)")
        .eq("teaching_assistant_id", taId);
      if (error) throw error;
      return (data || []) as { id: string; class_id: string; classes: { name: string } | null }[];
    },
  });

  const permanentMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await (supabase as any)
        .from("class_teaching_assistants")
        .upsert({ class_id: classId, teaching_assistant_id: taId }, { onConflict: "class_id,teaching_assistant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ta-standing", taId] });
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
      toast.success("Assigned permanently - stays until you remove them from the class");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeStandingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("class_teaching_assistants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ta-standing", taId] });
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
      toast.success("Removed from the class (future sessions cleared; past ones kept)");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const participants = sessionIds.map(sessionId => ({
        session_id: sessionId,
        participant_type: "teaching_assistant" as const,
        teaching_assistant_id: taId,
      }));
      const { error } = await supabase
        .from("session_participants")
        .upsert(participants, { onConflict: "session_id,teaching_assistant_id" });
      if (!error) return { refused: [] as PayStep[] };
      // One held lesson in the list refuses the whole statement (nothing was
      // written). Assign lesson by lesson; the held ones go to the check.
      if (payOpFromDbError(error) !== "restaff") throw error;
      const refused: PayStep[] = [];
      for (const row of participants) {
        const { error: one } = await supabase
          .from("session_participants")
          .upsert([row], { onConflict: "session_id,teaching_assistant_id" });
        if (!one) continue;
        if (payOpFromDbError(one) !== "restaff") throw one;
        const s: any = availableSessions?.find((x: any) => x.id === row.session_id) ?? { id: row.session_id };
        refused.push({
          session: { id: s.id, date: s.date, start_time: s.start_time, end_time: s.end_time, class_name: s.classes?.name },
          args: await staffAfter(row.session_id, taId, true),
        });
      }
      return { refused };
    },
    onSuccess: ({ refused }) => {
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
      setSelectedSessionIds([]);
      if (refused.length > 0) {
        const n = refused.length === 1 ? "One lesson is" : `${refused.length} lessons are`;
        toast.warning(`${n} already held and more than a week old (or in a closed payroll month). `
          + "Each needs a reason: check them one by one. The other sessions are assigned.");
        setPayQueue(refused);
        return;
      }
      toast.success("Teaching assistant assigned to sessions");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await supabase
        .from("session_participants")
        .delete()
        .eq("id", a.id);
      if (!error) return { refused: null as PayStep | null };
      // A held lesson more than a week old: nothing was removed; the check opens.
      if (payOpFromDbError(error) !== "restaff") throw error;
      const s = a.sessions ?? {};
      const step: PayStep = {
        session: { id: a.session_id, date: s.date, start_time: s.start_time, end_time: s.end_time, class_name: s.classes?.name },
        args: await staffAfter(a.session_id, taId, false),
      };
      return { refused: step };
    },
    onSuccess: ({ refused }) => {
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
      if (refused) {
        setPayQueue([refused]);
        return;
      }
      toast.success("Assignment removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleSession = (id: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (!availableSessions) return;
    const alreadyAssignedIds = new Set(currentAssignments?.map(a => a.session_id) || []);
    const unassigned = availableSessions.filter(s => !alreadyAssignedIds.has(s.id)).map(s => s.id);
    setSelectedSessionIds(unassigned);
  };

  const handleAssign = () => {
    if (selectedSessionIds.length === 0) {
      toast.error("Select at least one session");
      return;
    }
    assignMutation.mutate(selectedSessionIds);
  };

  const alreadyAssignedIds = new Set(currentAssignments?.map(a => a.session_id) || []);

  // The lesson-pay check for the first refused lesson; the next opens when it closes.
  if (payQueue.length > 0) {
    const step = payQueue[0];
    return (
      <PayGuardDialog
        open
        session={step.session}
        op="restaff"
        args={step.args}
        onClose={() => setPayQueue((q) => q.slice(1))}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Assign to Class */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 shrink-0" aria-hidden />
            Assign to Class
          </CardTitle>
          <CardDescription>Map this assistant to class sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Class Picker */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ta-class">Class</Label>
            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSessionIds([]); }}>
              <SelectTrigger id="ta-class">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Mode */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ta-mode">Assignment Type</Label>
            <Select value={assignMode} onValueChange={(v) => { setAssignMode(v as AssignMode); setSelectedSessionIds([]); }}>
              <SelectTrigger id="ta-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once (pick specific sessions)</SelectItem>
                <SelectItem value="month">For the Month</SelectItem>
                <SelectItem value="recurring">Recurring (3 months)</SelectItem>
                <SelectItem value="permanent">Permanent (until I remove them)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Effective From */}
          {assignMode !== "permanent" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="ta-from">Effective From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="ta-from" variant="outline" className={cn("w-full justify-start text-left font-normal", !effectiveFrom && "text-hec-ink-faint")}>
                  <CalendarIcon className="h-4 w-4" aria-hidden />
                  {effectiveFrom ? format(effectiveFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveFrom}
                  onSelect={setEffectiveFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          )}

          {/* Sessions List */}
          {assignMode !== "permanent" && selectedClassId && availableSessions && availableSessions.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label>Sessions ({availableSessions.length})</Label>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All Unassigned
                </Button>
              </div>
              <div className="max-h-48 divide-y divide-hec-line overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-surface">
                {availableSessions.map(session => {
                  const isAssigned = alreadyAssignedIds.has(session.id);
                  return (
                    <label
                      key={session.id}
                      className={cn(
                        "flex min-h-hec-target cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60",
                        isAssigned && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        checked={selectedSessionIds.includes(session.id) || isAssigned}
                        disabled={isAssigned}
                        onCheckedChange={() => toggleSession(session.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-hec-small font-medium text-hec-ink">{new Date(session.date + 'T00:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                        <p className="text-hec-caption tabular-nums text-hec-ink-soft">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
                      </div>
                      {isAssigned && <Badge variant="secondary" className="shrink-0">Assigned</Badge>}
                      <Badge variant="outline" className="shrink-0">{session.status}</Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {assignMode !== "permanent" && selectedClassId && availableSessions?.length === 0 && (
            <p className="py-4 text-center text-hec-small text-hec-ink-soft">No sessions found for this class from the selected date</p>
          )}

          {assignMode === "permanent" ? (
            <Button
              onClick={() => permanentMutation.mutate(selectedClassId)}
              disabled={!selectedClassId || permanentMutation.isPending || !!standing?.some(s => s.class_id === selectedClassId)}
              className="w-full"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {standing?.some(s => s.class_id === selectedClassId) ? "Already permanent on this class" : "Assign permanently"}
            </Button>
          ) : (
          <Button
            onClick={handleAssign}
            disabled={selectedSessionIds.length === 0 || assignMutation.isPending}
            className="w-full"
          >
            <GraduationCap className="h-4 w-4" aria-hidden />
            Assign to {selectedSessionIds.length} Session{selectedSessionIds.length !== 1 ? "s" : ""}
          </Button>
          )}
        </CardContent>
      </Card>

      {standing && standing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Permanent classes</CardTitle>
            <CardDescription>On every session of these classes until you remove them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {standing.map(s => (
              <div key={s.id} className="flex min-h-hec-target items-center gap-3 rounded-hec-md border border-hec-line px-3 py-2">
                <p className="min-w-0 flex-1 break-words text-hec-small font-medium text-hec-ink">{s.classes?.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger"
                  aria-label={`Remove from ${s.classes?.name ?? "this class"}`}
                  onClick={() => removeStandingMutation.mutate(s.id)}
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Current Assignments</CardTitle>
          <CardDescription>{currentAssignments?.length || 0} session(s) assigned</CardDescription>
        </CardHeader>
        <CardContent>
          {currentAssignments && currentAssignments.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {currentAssignments.map((a: any) => (
                <div key={a.id} className="flex min-h-hec-target items-start gap-3 rounded-hec-md border border-hec-line px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-hec-small font-medium text-hec-ink">{a.sessions?.classes?.name}</p>
                    <p className="text-hec-caption tabular-nums text-hec-ink-soft">
                      {new Date(a.sessions?.date + 'T00:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" • "}
                      {a.sessions?.start_time?.slice(0, 5)} – {a.sessions?.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={a.sessions?.status === "Held" ? "success" : "secondary"}>
                      {a.sessions?.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger"
                      aria-label={`Remove from ${a.sessions?.classes?.name ?? "this session"}`}
                      onClick={() => removeMutation.mutate(a)}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-hec-small text-hec-ink-soft">No sessions assigned yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
