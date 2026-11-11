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

interface TAClassAssignmentProps {
  taId: string;
}

type AssignMode = "once" | "recurring" | "month" | "permanent";

export function TAClassAssignment({ taId }: TAClassAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignMode, setAssignMode] = useState<AssignMode>("recurring");
  const [effectiveFrom, setEffectiveFrom] = useState<Date | undefined>(new Date());
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

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
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
      setSelectedSessionIds([]);
      toast.success("Teaching assistant assigned to sessions");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from("session_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ta-assignments", taId] });
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

  return (
    <div className="space-y-4">
      {/* Assign to Class */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Assign to Class
          </CardTitle>
          <CardDescription>Map this assistant to class sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Class Picker */}
          <div>
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSessionIds([]); }}>
              <SelectTrigger>
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
          <div>
            <Label>Assignment Type</Label>
            <Select value={assignMode} onValueChange={(v) => { setAssignMode(v as AssignMode); setSelectedSessionIds([]); }}>
              <SelectTrigger>
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
          <div>
            <Label>Effective From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !effectiveFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="flex items-center justify-between mb-2">
                <Label>Sessions ({availableSessions.length})</Label>
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                  Select All Unassigned
                </Button>
              </div>
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {availableSessions.map(session => {
                  const isAssigned = alreadyAssignedIds.has(session.id);
                  return (
                    <label
                      key={session.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
                        isAssigned && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        checked={selectedSessionIds.includes(session.id) || isAssigned}
                        disabled={isAssigned}
                        onCheckedChange={() => toggleSession(session.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{new Date(session.date + 'T00:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                        <p className="text-xs text-muted-foreground">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
                      </div>
                      {isAssigned && <Badge variant="secondary" className="text-xs shrink-0">Assigned</Badge>}
                      <Badge variant="outline" className="text-xs shrink-0">{session.status}</Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {assignMode !== "permanent" && selectedClassId && availableSessions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions found for this class from the selected date</p>
          )}

          {assignMode === "permanent" ? (
            <Button
              onClick={() => permanentMutation.mutate(selectedClassId)}
              disabled={!selectedClassId || permanentMutation.isPending || !!standing?.some(s => s.class_id === selectedClassId)}
              className="w-full"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {standing?.some(s => s.class_id === selectedClassId) ? "Already permanent on this class" : "Assign permanently"}
            </Button>
          ) : (
          <Button
            onClick={handleAssign}
            disabled={selectedSessionIds.length === 0 || assignMutation.isPending}
            className="w-full"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Assign to {selectedSessionIds.length} Session{selectedSessionIds.length !== 1 ? "s" : ""}
          </Button>
          )}
        </CardContent>
      </Card>

      {standing && standing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Permanent classes</CardTitle>
            <CardDescription>On every session of these classes until you remove them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {standing.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                <p className="text-sm font-medium">{s.classes?.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeStandingMutation.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Assignments</CardTitle>
          <CardDescription>{currentAssignments?.length || 0} session(s) assigned</CardDescription>
        </CardHeader>
        <CardContent>
          {currentAssignments && currentAssignments.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentAssignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{a.sessions?.classes?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.sessions?.date + 'T00:00:00').toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" • "}
                      {a.sessions?.start_time?.slice(0, 5)} – {a.sessions?.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.sessions?.status === "Held" ? "default" : "secondary"} className={cn("text-xs", a.sessions?.status === "Held" && "bg-emerald-500")}>
                      {a.sessions?.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions assigned yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
