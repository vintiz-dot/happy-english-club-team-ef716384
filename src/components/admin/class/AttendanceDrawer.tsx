import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Save, Award, Settings, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import { useAuth } from "@/hooks/useAuth";
import { ParticipationPoints } from "@/components/admin/ParticipationPoints";
import { SessionActionsModal } from "../SessionActionsModal";

interface AttendanceDrawerProps {
  session: any;
  onClose: () => void;
}

const AttendanceDrawer = ({ session, onClose }: AttendanceDrawerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [showParticipationPoints, setShowParticipationPoints] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [swappingTeacher, setSwappingTeacher] = useState(false);
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: students } = useQuery({
    queryKey: ["session-students", session?.id],
    queryFn: async () => {
      if (!session?.class_id) return [];

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          start_date,
          end_date,
          students!inner(id, full_name)
        `)
        .eq("class_id", session.class_id)
        .lte("start_date", session.date) // enrolled on or before session
        .or(`end_date.is.null,end_date.gte.${session.date}`); // still enrolled on session

      // Filter again to ensure enrollment dates are valid
      const validEnrollments = (enrollments || []).filter((e: any) => 
        e.start_date <= session.date && (!e.end_date || e.end_date >= session.date)
      );

      const studentsWithAttendance = await Promise.all(
        validEnrollments.map(async (enrollment: any) => {
          const { data: attendanceRecord } = await supabase
            .from("attendance")
            .select("status")
            .eq("session_id", session.id)
            .eq("student_id", enrollment.student_id)
            .maybeSingle();

          return {
            id: enrollment.student_id,
            full_name: enrollment.students.full_name,
            status: attendanceRecord?.status || "Present",
          };
        })
      );

      return studentsWithAttendance;
    },
    enabled: !!session?.id,
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (students) {
      const attendanceMap: Record<string, string> = {};
      students.forEach((student: any) => {
        attendanceMap[student.id] = student.status;
      });
      setAttendance(attendanceMap);
    }
  }, [students]);

  const saveAllMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      const batch = Object.entries(entries).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      const { error } = await supabase.functions.invoke("mark-attendance", {
        body: { sessionId: session.id, batch },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-students", session?.id] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
      toast.success("Attendance saved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save attendance");
    },
  });

  const swapTeacherMutation = useMutation({
    mutationFn: async (newTeacherId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("sessions")
        .update({
          teacher_id: newTeacherId,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", session.id);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        entity: "sessions",
        action: "swap_teacher",
        entity_id: session.id,
        actor_user_id: user?.id,
        diff: { old_teacher_id: session.teacher_id, new_teacher_id: newTeacherId },
      });
    },
    onSuccess: () => {
      toast.success("Teacher swapped");
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["enhanced-class-sessions"] });
      setSwappingTeacher(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to swap teacher");
    },
  });

  const saveAllAttendance = async () => {
    await saveAllMutation.mutateAsync(attendance);
    onClose();
  };

  const toggleAttendance = (studentId: string) => {
    const statuses = ["Present", "Absent", "Excused"];
    const currentIndex = statuses.indexOf(attendance[studentId] || "Present");
    const nextIndex = (currentIndex + 1) % statuses.length;
    setAttendance((prev) => ({
      ...prev,
      [studentId]: statuses[nextIndex],
    }));
  };

  const filteredStudents = students?.filter((s: any) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const attendanceColor = (status: string) => {
    const colors: Record<string, string> = {
      Present: "bg-green-100 text-green-800 hover:bg-green-200",
      Absent: "bg-red-100 text-red-800 hover:bg-red-200",
      Excused: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    };
    return colors[status] || "bg-gray-100";
  };

  // Check if session can be edited based on time (using Bangkok timezone)
  const sessionStart = dayjs.tz(`${session.date} ${session.start_time}`, 'Asia/Bangkok');
  const sessionEnd = dayjs.tz(`${session.date} ${session.end_time}`, 'Asia/Bangkok');
  const now = dayjs.tz(undefined, 'Asia/Bangkok');
  
  // Can only mark attendance 5 minutes after session starts and within 24 hours after it ends
  const fiveMinutesAfterStart = sessionStart.add(5, 'minute');
  const twentyFourHoursAfterEnd = sessionEnd.add(24, 'hour');
  const canMarkAttendance = now.isAfter(fiveMinutesAfterStart) && now.isBefore(twentyFourHoursAfterEnd);
  
  // Prevent marking future sessions as Held
  const isFutureSession = now.isBefore(fiveMinutesAfterStart);
  
  const canEdit = role === "admin" || (role === "teacher" && canMarkAttendance);

  const currentTeacherName = session.teachers?.full_name || session.teacher?.full_name || 
    teachers?.find(t => t.id === session.teacher_id)?.full_name || "No teacher";

  // Load session TAs
  const { data: sessionTAs } = useQuery({
    queryKey: ["session-tas", session?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_participants")
        .select("id, teaching_assistant_id, attended, teaching_assistants(full_name)")
        .eq("session_id", session.id)
        .eq("participant_type", "teaching_assistant");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.id,
  });

  // Was the assistant actually here?
  //
  // The roster row stays either way - removing them from the session
  // instead would erase the fact that they were meant to be here, and
  // re-saving the session's assistants would put them back. Marking the
  // absence is what stops calculate-payroll paying for the lesson, so
  // this is a change to somebody's wages and is audited as one.
  const taPresenceMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const { error } = await supabase
        .from("session_participants")
        .update({ attended })
        .eq("id", id);
      if (error) throw error;
      return attended;
    },
    onSuccess: (attended) => {
      toast.success(attended ? "Marked present — this lesson is paid" : "Marked absent — this lesson is not paid");
      queryClient.invalidateQueries({ queryKey: ["session-tas", session?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-payroll"] });
      queryClient.invalidateQueries({ queryKey: ["class-finance"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not change that"),
  });

  return (
    <Sheet open={!!session} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mark Attendance</SheetTitle>
          <SheetDescription>
            {session.class_name || session.classes?.name || "Session"} • {dayjs(session.date).format("MMM D, YYYY")} • {session.start_time?.slice(0, 5)}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Swap Teacher — admin only */}
        {role === "admin" && (
          <div className="mt-4 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Teacher:</span>
                <span className="font-medium">{currentTeacherName}</span>
              </div>
              {!swappingTeacher && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSwappingTeacher(true)}
                  className="h-7 text-xs gap-1"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Swap
                </Button>
              )}
            </div>
            {swappingTeacher && (
              <div className="mt-2 flex gap-2">
                <Select
                  value=""
                  onValueChange={(val) => swapTeacherMutation.mutate(val)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Select new teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.filter(t => t.id !== session.teacher_id).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSwappingTeacher(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Who assisted this lesson, and whether they were here.
            Its own panel rather than a few lines inside the Swap Teacher
            box, where it was invisible: this is the only control in the
            app that stops an assistant being paid for a lesson, and
            nobody could find it. */}
        {role === "admin" && sessionTAs && sessionTAs.length > 0 && (
          <div className="mt-4 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Teaching assistants</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {sessionTAs.map((p: any) => {
                const here = p.attended !== false;
                return (
                  <div key={p.id ?? p.teaching_assistant_id} className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${here ? "" : "text-muted-foreground line-through"}`}>
                      {p.teaching_assistants?.full_name || "Unknown"}
                    </span>
                    <Button
                      variant={here ? "outline" : "secondary"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={taPresenceMutation.isPending}
                      onClick={() => taPresenceMutation.mutate({ id: p.id, attended: !here })}
                    >
                      {here ? "Present · mark absent" : "Absent · not paid"}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              An absent assistant stays on the lesson — the record of who was meant
              to be here survives — but is not paid for it.
            </p>
          </div>
        )}

        {role === "admin" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActions(true)}
            className="mt-3 w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Session Actions
          </Button>
        )}

        {!canEdit && (
          <div className="my-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            {role === "teacher" 
              ? isFutureSession
                ? "⚠️ Attendance can be marked 5 minutes after session starts (prevents invalid 'Held' status)"
                : "Editing window closed (24 hours after session end)"
              : "You don't have permission to edit attendance"}
          </div>
        )}
        
        {isFutureSession && role === "admin" && (
          <div className="my-4 p-3 bg-orange-100 dark:bg-orange-900 rounded-lg text-sm">
            ⚠️ This session hasn't started yet. Marking attendance will NOT set status to "Held" until 5 minutes after start time.
          </div>
        )}

        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-2">
            {filteredStudents?.map((student: any) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <span className="font-medium">{student.full_name}</span>
                <Badge
                  className={`cursor-pointer ${attendanceColor(attendance[student.id])} ${!canEdit && "cursor-not-allowed opacity-70"}`}
                  onClick={() => canEdit && toggleAttendance(student.id)}
                >
                  {attendance[student.id]}
                </Badge>
              </div>
            ))}
          </div>

          {canEdit && (
            <>
              <Button
                onClick={saveAllAttendance}
                disabled={saveAllMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Attendance
              </Button>
              
              {role === "admin" || role === "teacher" && (
                <Button
                  onClick={() => setShowParticipationPoints(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Add Participation Points
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
      
      {showParticipationPoints && (
        <ParticipationPoints
          session={session}
          students={filteredStudents || []}
          onClose={() => setShowParticipationPoints(false)}
        />
      )}
      
      {showActions && (
        <SessionActionsModal
          session={session}
          onClose={() => setShowActions(false)}
          onSuccess={() => {
            setShowActions(false);
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
            onClose();
          }}
        />
      )}
    </Sheet>
  );
};

export default AttendanceDrawer;
