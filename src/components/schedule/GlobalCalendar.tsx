import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import PremiumCalendar, { type CalendarEvent } from "@/components/calendar/PremiumCalendar";
import SessionDrawer from "@/components/admin/class/SessionDrawer";
import AttendanceDrawer from "@/components/admin/class/AttendanceDrawer";
import ClassSelector from "./ClassSelector";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { toast } from "sonner";

interface GlobalCalendarProps {
  role: "admin" | "teacher" | "student";
  classId?: string;
  onAddSession?: (date: Date) => void;
  onEditSession?: (session: any) => void;
}

const GlobalCalendar = ({ role, classId, onAddSession, onEditSession }: GlobalCalendarProps) => {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(dayjs());
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [multipleSessions, setMultipleSessions] = useState<{ date: Date; sessions: any[] } | null>(null);
  const { studentId } = useStudentProfile();
  const { user } = useAuth();

  const { data: rawSessions = [], refetch } = useQuery({
    queryKey: ["calendar-sessions", role, classId, studentId, month.format("YYYY-MM"), user?.id],
    queryFn: async () => {
      const startDate = month.startOf("month").format("YYYY-MM-DD");
      const endDate = month.endOf("month").format("YYYY-MM-DD");

      let query = supabase
        .from("sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          notes,
          rate_override_vnd,
          class_id,
          teacher_id,
          classes!inner (id, name),
          teachers (id, full_name),
          attendance (student_id, status)
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (classId) {
        query = query.eq("class_id", classId);
      } else if (role === "teacher") {
        // Try teacher first
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        if (teacher) {
          query = query.eq("teacher_id", teacher.id);
        } else {
          // Try TA - get session IDs from session_participants
          const { data: ta } = await supabase
            .from("teaching_assistants")
            .select("id")
            .eq("user_id", user?.id)
            .maybeSingle();
          
          if (ta) {
            const { data: spData } = await supabase
              .from("session_participants")
              .select("session_id")
              .eq("teaching_assistant_id", ta.id)
              .eq("participant_type", "teaching_assistant");
            
            const sessionIds = spData?.map(sp => sp.session_id) || [];
            if (sessionIds.length > 0) {
              query = query.in("id", sessionIds);
            } else {
              return [];
            }
          } else {
            return [];
          }
        }
      } else if (role === "student") {
        let activeStudentId = studentId;

        if (!activeStudentId) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("linked_user_id", user?.id)
            .maybeSingle();
          
          if (student) {
            activeStudentId = student.id;
          }
        }
        
        if (activeStudentId) {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", activeStudentId)
            .lte("start_date", endDate)
            .or(`end_date.is.null,end_date.gte.${startDate}`);
          
          const classIds = enrollments?.map(e => e.class_id) || [];
          if (classIds.length > 0) {
            query = query.in("class_id", classIds);
          } else {
            return [];
          }
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation for rescheduling sessions (admin only)
  const rescheduleMutation = useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string; newDate: string }) => {
      const { error } = await supabase
        .from("sessions")
        .update({ date: newDate })
        .eq("id", sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session rescheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to reschedule: ${error.message}`);
    },
  });

  // Transform raw sessions to CalendarEvent format
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return rawSessions.map((session: any) => ({
      id: session.id,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      class_name: session.classes?.name || "Unknown",
      status: session.status,
      enrolled_count: session.attendance?.length || 0,
      notes: session.notes,
      teacher_name: session.teachers?.full_name,
    }));
  }, [rawSessions]);

  // Find raw session by id
  const findRawSession = (eventId: string) => {
    return rawSessions.find((s: any) => s.id === eventId);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const rawSession = findRawSession(event.id);
    if (rawSession) {
      setSelectedSession(rawSession);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    const daySessions = rawSessions.filter((s: any) => s.date === dateStr);
    
    if (daySessions.length === 1) {
      setSelectedSession(daySessions[0]);
    } else if (daySessions.length === 0 && role === "admin" && onAddSession) {
      onAddSession(dayjs(dateStr).toDate());
    } else if (daySessions.length > 1) {
      setMultipleSessions({ date: dayjs(dateStr).toDate(), sessions: daySessions });
      setShowClassSelector(true);
    }
  };

  const handleRescheduleEvent = (eventId: string, newDate: string) => {
    if (role !== "admin") return;
    
    const session = findRawSession(eventId);
    if (!session) return;
    
    // Confirm reschedule
    const sessionName = session.classes?.name || "Session";
    const fromDate = dayjs(session.date).format("MMM D");
    const toDate = dayjs(newDate).format("MMM D");
    
    if (window.confirm(`Move "${sessionName}" from ${fromDate} to ${toDate}?`)) {
      rescheduleMutation.mutate({ sessionId: eventId, newDate });
    }
  };

  return (
    <div className="space-y-4">
      <PremiumCalendar
        events={calendarEvents}
        onSelectDay={handleSelectDay}
        onSelectEvent={handleSelectEvent}
        onRescheduleEvent={role === "admin" ? handleRescheduleEvent : undefined}
        onMonthChange={(m) => setMonth(dayjs(m))}
        isAdmin={role === "admin"}
      />

      {showClassSelector && multipleSessions && (
        <ClassSelector
          date={multipleSessions.date}
          sessions={multipleSessions.sessions}
          onSelectSession={(session) => {
            setSelectedSession(session);
            setShowClassSelector(false);
          }}
          onClose={() => {
            setShowClassSelector(false);
            setMultipleSessions(null);
          }}
        />
      )}

      {selectedSession && role !== "student" && (
        <AttendanceDrawer
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            refetch();
          }}
        />
      )}

      {selectedSession && role === "student" && (
        <SessionDrawer
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            refetch();
          }}
          onEdit={onEditSession}
        />
      )}
    </div>
  );
};

export default GlobalCalendar;
