import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Save, Award, FileText, User, Clock, Edit2, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import { useAuth } from "@/hooks/useAuth";
import { ParticipationPoints } from "@/components/admin/ParticipationPoints";
import { CancelSessionDialog } from "@/components/admin/CancelSessionDialog";
import { DeleteSessionDialog } from "@/components/admin/DeleteSessionDialog";
import { cn } from "@/lib/utils";

interface SessionDetailDrawerProps {
  session: any;
  onClose: () => void;
}

export default function SessionDetailDrawer({ session, onClose }: SessionDetailDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [showParticipationPoints, setShowParticipationPoints] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notes, setNotes] = useState(session?.notes || "");
  const [selectedTeacher, setSelectedTeacher] = useState(session?.teacher_id || "");
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
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
          students!inner(id, full_name)
        `)
        .eq("class_id", session.class_id)
        .is("end_date", null);

      const studentsWithAttendance = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
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

  const { data: homework } = useQuery({
    queryKey: ["session-homework", session?.class_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homeworks")
        .select("*")
        .eq("class_id", session.class_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.class_id,
  });

  const { data: teachers } = useQuery({
    queryKey: ["active-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ notes, teacherId }: { notes?: string; teacherId?: string }) => {
      const updates: any = {};
      if (notes !== undefined) updates.notes = notes;
      if (teacherId !== undefined) updates.teacher_id = teacherId;

      const { error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", session.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session updated");
      queryClient.invalidateQueries({ queryKey: ["enhanced-class-sessions"] });
      setIsEditingTeacher(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update session");
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: string }) => {
      const { error } = await supabase.functions.invoke("mark-attendance", {
        body: {
          sessionId: session.id,
          studentId,
          status,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-students", session?.id] });
      toast.success("Attendance saved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save attendance");
    },
  });

  const saveAllAttendance = async () => {
    try {
      for (const [studentId, status] of Object.entries(attendance)) {
        await markAttendanceMutation.mutateAsync({ studentId, status });
      }
      // Also save notes
      await updateSessionMutation.mutateAsync({ notes });
      toast.success("All changes saved");
    } catch (error) {
      console.error("Error saving:", error);
    }
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

  // DESIGN_SYSTEM s.14: present is leaf, absent is red, excused is neutral.
  const attendanceColor = (status: string) => {
    const colors: Record<string, string> = {
      Present: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf hover:bg-hec-leaf-tint/70",
      Absent: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger hover:bg-hec-danger-tint/70",
      Excused: "border-hec-line bg-hec-sunken text-hec-ink-soft hover:bg-hec-line",
    };
    return colors[status] || "border-hec-line bg-hec-sunken text-hec-ink-soft";
  };

  const sessionEnd = dayjs(`${session.date} ${session.end_time}`);
  const canTeacherEdit = dayjs().diff(sessionEnd, "hour") <= 24;
  const canEdit = role === "admin" || (role === "teacher" && canTeacherEdit);
  const isPastHeld = session.status === "Held" && new Date(session.date) < new Date();

  return (
    <>
      <Sheet open={!!session} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>Session Details</span>
              <Badge variant={session.status === "Canceled" ? "destructive" : "secondary"} className="font-sans">
                {session.status}
              </Badge>
            </SheetTitle>
            <SheetDescription className="tabular-nums">
              {dayjs(session.date).format("MMM D, YYYY")} • {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
            </SheetDescription>
          </SheetHeader>

          {!canEdit && (
            <div className="my-4 rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink-soft">
              {role === "teacher" 
                ? "Editing window closed (24 hours after session end)"
                : "You don't have permission to edit this session"}
            </div>
          )}

          {isPastHeld && role === "admin" && (
            <div className="my-4 rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink">
              This is a past Held session. Attendance can be edited, but the session cannot be canceled or deleted.
            </div>
          )}

          <div className="space-y-6 mt-6">
            {/* Teacher Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-hec-ink-soft" />
                    Teacher
                  </div>
                  {canEdit && !isEditingTeacher && (
                    <Button variant="ghost" size="sm" aria-label="Change teacher" onClick={() => setIsEditingTeacher(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingTeacher ? (
                  <div className="space-y-3">
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => updateSessionMutation.mutate({ teacherId: selectedTeacher })}
                        size="sm"
                      >
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedTeacher(session.teacher_id);
                          setIsEditingTeacher(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-normal break-words text-hec-body font-medium text-hec-ink">{session.teacher?.full_name || session.teachers?.full_name || "Not assigned"}</p>
                )}
              </CardContent>
            </Card>

            {/* Homework */}
            {homework && homework.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-hec-ink-soft" />
                    Class Homework
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {homework.map((hw: any) => (
                      <div key={hw.id} className="rounded-hec-md border border-hec-line p-4">
                        <p className="whitespace-normal break-words text-hec-body font-medium text-hec-ink">{hw.title}</p>
                        {hw.due_date && (
                          <p className="text-hec-small text-hec-ink-soft">
                            Due: {dayjs(hw.due_date).format("MMM D, YYYY")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-hec-ink-soft" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students?.map((student: any) => (
                    <div
                      key={student.id}
                      className="flex min-h-hec-target items-start justify-between gap-3 rounded-hec-md border border-hec-line px-4 py-2"
                    >
                      <span className="min-w-0 flex-1 self-center whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{student.full_name}</span>
                      {/* Was a clickable badge (not reachable by keyboard); same handler. */}
                      <button
                        type="button"
                        aria-disabled={!canEdit}
                        className={cn(
                          "inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-full border px-4 text-hec-caption font-medium transition-colors duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                          attendanceColor(attendance[student.id] || student.status),
                          !canEdit && "cursor-not-allowed opacity-70",
                        )}
                        onClick={() => canEdit && toggleAttendance(student.id)}
                      >
                        {attendance[student.id] || student.status}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-hec-ink-soft" />
                  Session Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this session..."
                  aria-label="Session notes"
                  rows={4}
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>

            {canEdit && (
              <div className="space-y-2">
                <Button onClick={saveAllAttendance} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save All Changes
                </Button>
                <Button
                  onClick={() => setShowParticipationPoints(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Add Points
                </Button>
                
                {role === "admin" && session.status !== "Canceled" && !isPastHeld && (
                  <div className="flex flex-col gap-2 border-t border-hec-line pt-4 sm:flex-row">
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      variant="destructive-quiet"
                      className="flex-1"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Session
                    </Button>
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="destructive-quiet"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showParticipationPoints && (
        <ParticipationPoints
          session={session}
          students={students || []}
          onClose={() => setShowParticipationPoints(false)}
        />
      )}

      {showCancelDialog && (
        <CancelSessionDialog
          session={session}
          open={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onSuccess={() => {
            setShowCancelDialog(false);
            onClose();
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteSessionDialog
          session={session}
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={() => {
            setShowDeleteDialog(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
