import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Save, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PastAttendanceEditorProps {
  classId: string;
}

export function PastAttendanceEditor({ classId }: PastAttendanceEditorProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<Record<string, Record<string, string>>>({});
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["past-attendance-sessions", classId, selectedMonth],
    queryFn: async () => {
      const startDate = `${selectedMonth}-01`;
      const monthEnd = new Date(Date.UTC(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          id,
          date,
          start_time,
          end_time,
          status,
          attendance (
            id,
            student_id,
            status,
            students (id, full_name)
          )
        `,
        )
        .eq("class_id", classId)
        .gte("date", startDate)
        .lte("date", monthEnd)
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async ({ sessionId, studentId, status }: { sessionId: string; studentId: string; status: string }) => {
      const { error } = await supabase.functions.invoke("mark-attendance", {
        body: {
          sessionId,
          studentId,
          status,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["past-attendance-sessions", classId, selectedMonth] });
      toast.success("Attendance updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update attendance");
    },
  });

  const handleSaveAll = async () => {
    try {
      const updates = [];
      for (const [sessionId, studentStatuses] of Object.entries(attendance)) {
        for (const [studentId, status] of Object.entries(studentStatuses)) {
          updates.push(saveAttendanceMutation.mutateAsync({ sessionId, studentId, status }));
        }
      }
      await Promise.all(updates);
      setAttendance({});
      toast.success("All attendance saved");
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  const toggleAttendance = (sessionId: string, studentId: string, currentStatus: string) => {
    const statuses = ["Present", "Absent", "Excused"];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    setAttendance((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        [studentId]: nextStatus,
      },
    }));
  };

  // DESIGN_SYSTEM s.14: present is leaf, absent is red, excused is neutral.
  const attendanceColor = (status: string) => {
    const colors: Record<string, string> = {
      Present: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf hover:bg-hec-leaf-tint/70",
      Absent: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger hover:bg-hec-danger-tint/70",
      Excused: "border-hec-line bg-hec-sunken text-hec-ink-soft hover:bg-hec-line",
    };
    return colors[status] || "border-hec-line bg-hec-sunken text-hec-ink-soft";
  };

  const hasChanges = Object.keys(attendance).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Past Attendance Editor
        </CardTitle>
        <CardDescription>View and edit past attendance records for this class</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="month-select">Select Month</Label>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-select" className="min-w-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const monthValue = format(date, "yyyy-MM");
                  return (
                    <SelectItem key={monthValue} value={monthValue}>
                      {format(date, "MMMM yyyy")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {hasChanges && (
              <Button onClick={handleSaveAll}>
                <Save className="h-4 w-4 mr-2" />
                Save All
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-hec-body text-hec-ink-soft">Loading sessions...</div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session: any) => (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                        <p className="text-hec-body font-medium text-hec-ink">{format(new Date(session.date), "EEEE, MMM d, yyyy")}</p>
                      </div>
                      <p className="text-hec-small tabular-nums text-hec-ink-soft">
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant={session.status === "Held" ? "success" : "secondary"} className="shrink-0">{session.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {session.attendance && session.attendance.length > 0 ? (
                    <div className="space-y-2">
                      {session.attendance.map((att: any) => {
                        const currentStatus = attendance[session.id]?.[att.student_id] || att.status;
                        return (
                          <div
                            key={att.id}
                            className="flex min-h-hec-target items-start justify-between gap-3 rounded-hec-md border border-hec-line bg-hec-surface px-4 py-2"
                          >
                            <span className="min-w-0 flex-1 self-center whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{att.students?.full_name}</span>
                            {/* Was a clickable badge (not reachable by keyboard); same handler. */}
                            <button
                              type="button"
                              className={cn(
                                "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-full border px-4 text-hec-caption font-medium transition-colors duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                                attendanceColor(currentStatus),
                              )}
                              onClick={() => toggleAttendance(session.id, att.student_id, currentStatus)}
                            >
                              {currentStatus}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-hec-small text-hec-ink-soft">No attendance records</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-hec-body text-hec-ink-soft">No sessions found for this month</div>
        )}
      </CardContent>
    </Card>
  );
}
