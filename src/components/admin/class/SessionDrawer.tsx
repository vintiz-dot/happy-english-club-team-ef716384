import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Users, FileText, Download, Settings } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SessionActionsModal } from "@/components/admin/SessionActionsModal";
import { useIvory } from "@/hooks/useIvory";

// Ivory chips (DESIGN_SYSTEM s.14). Same statuses; the word says which.
const IVORY_STATUS: Record<string, string> = {
  Scheduled: "border-hec-line bg-hec-sunken text-hec-ink-soft",
  Held: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
  Canceled: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
  Holiday: "border-hec-line bg-hec-sunken text-hec-ink-soft",
};
const IVORY_ATTENDANCE: Record<string, string> = {
  Present: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
  Absent: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
  Excused: "border-hec-line bg-hec-sunken text-hec-ink-soft",
};
const IVORY_NEUTRAL = "border-hec-line bg-hec-sunken text-hec-ink-soft";

interface SessionDrawerProps {
  session: any;
  onClose: () => void;
  onEdit?: (session: any) => void;
  onRefresh?: () => void;
}

const SessionDrawer = ({ session, onClose, onEdit, onRefresh }: SessionDrawerProps) => {
  const { role } = useAuth();
  const [showActions, setShowActions] = useState(false);
  // Opened from GlobalCalendar, which also renders on "/" (not listed yet):
  // old look there.
  const ivory = useIvory();
  const { data: studentAttendance } = useQuery({
    queryKey: ["session-student-attendance", session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get student ID for this user
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("linked_user_id", user.id)
        .maybeSingle();
      
      if (!student) return null;

      // Get attendance for this student and session
      const { data: attendance } = await supabase
        .from("attendance")
        .select("status")
        .eq("session_id", session.id)
        .eq("student_id", student.id)
        .maybeSingle();

      return attendance;
    },
    enabled: !!session?.id,
  });

  const { data: homework } = useQuery({
    queryKey: ["session-homework", session?.class_id],
    queryFn: async () => {
      if (!session?.class_id) return [];

      const { data } = await supabase
        .from("homeworks")
        .select(`
          id,
          title,
          body,
          due_date,
          created_at,
          homework_files(id, file_name, storage_key, size_bytes)
        `)
        .eq("class_id", session.class_id)
        .order("created_at", { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!session?.class_id,
  });


  const statusColor = (status: string) => {
    if (ivory) return IVORY_STATUS[status] || IVORY_NEUTRAL;
    switch (status) {
      case 'Scheduled': return 'bg-green-100 text-green-800';
      case 'Held': return 'bg-gray-100 text-gray-800';
      case 'Canceled': return 'bg-red-100 text-red-800';
      case 'Holiday': return 'bg-slate-100 text-slate-800';
      default: return 'bg-muted';
    }
  };

  const attendanceColor = (status: string) => {
    if (ivory) return IVORY_ATTENDANCE[status] || IVORY_NEUTRAL;
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'Absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'Excused': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
      default: return 'bg-muted';
    }
  };

  const downloadFile = async (storageKey: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("homework")
      .download(storageKey);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className={ivory ? "flex flex-wrap items-center justify-between gap-2" : "flex items-center justify-between"}>
              <SheetTitle>Session Details</SheetTitle>
              <div className="flex gap-2">
                {role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActions(true)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Actions
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(session)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className={ivory ? "flex items-center gap-2 text-hec-small text-hec-ink" : "flex items-center gap-2 text-sm"}>
              <Calendar className={ivory ? "h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
              <span className="font-medium">
                {format(new Date(session.date), "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            <div className={ivory ? "flex items-center gap-2 text-hec-small text-hec-ink" : "flex items-center gap-2 text-sm"}>
              <Clock className={ivory ? "h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
              <span className={ivory ? "tabular-nums" : undefined}>
                {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
              </span>
            </div>

            {session.teacher && (
              <div className={ivory ? "flex items-start gap-2 text-hec-small text-hec-ink" : "flex items-center gap-2 text-sm"}>
                <User className={ivory ? "mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
                <span className={ivory ? "min-w-0 whitespace-normal break-words" : undefined}>{session.teacher.full_name}</span>
              </div>
            )}

            <div className={ivory ? "flex flex-wrap items-center gap-2" : "flex items-center gap-2"}>
              <Badge className={statusColor(session.status)}>
                {session.status}
              </Badge>
              {studentAttendance && (
                <Badge className={attendanceColor(studentAttendance.status)}>
                  {studentAttendance.status}
                </Badge>
              )}
            </div>
          </div>

          {homework && homework.length > 0 && (
            <div className={ivory ? "border-t border-hec-line pt-4" : "border-t pt-4"}>
              <h3 className={ivory ? "mb-3 flex items-center gap-2 text-hec-h3 text-hec-ink" : "font-semibold flex items-center gap-2 mb-3"}>
                <FileText className={ivory ? "h-4 w-4 text-hec-ink-soft" : "h-4 w-4"} />
                Recent Homework ({homework.length})
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {homework.map((hw: any) => (
                  <div key={hw.id} className={ivory ? "rounded-hec-md border border-hec-line bg-hec-surface p-4" : "p-3 border rounded-lg"}>
                    <div className={ivory ? "whitespace-normal break-words text-hec-body font-medium text-hec-ink" : "font-medium"}>{hw.title}</div>
                    {hw.due_date && (
                      <div className={ivory ? "mt-1 text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground mt-1"}>
                        Due: {format(new Date(hw.due_date), "MMM d, yyyy")}
                      </div>
                    )}
                    {hw.homework_files && hw.homework_files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hw.homework_files.map((file: any) => (
                          <Button
                            key={file.id}
                            variant="outline"
                            size="sm"
                            className={ivory ? "h-auto max-w-full whitespace-normal break-all py-2 text-left" : undefined}
                            onClick={() => downloadFile(file.storage_key, file.file_name)}
                          >
                            <Download className={ivory ? "h-4 w-4 mr-1" : "h-3 w-3 mr-1"} />
                            {file.file_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {showActions && (
      <SessionActionsModal
        session={session}
        onClose={() => setShowActions(false)}
        onSuccess={() => {
          onRefresh?.();
          onClose();
        }}
      />
    )}
  </>
  );
};

export default SessionDrawer;
