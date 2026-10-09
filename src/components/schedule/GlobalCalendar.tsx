import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs, nowBangkok } from "@/lib/date";
import PremiumCalendar, {
  type CalendarEvent,
  type RescheduleRequest,
  type VisibleRange,
} from "@/components/calendar/PremiumCalendar";
import { getVisibleRange } from "@/components/calendar/lib/useCalendarView";
import {
  configuredLengths,
  expectedLengthFor,
  parseWeeklySlots,
  type WeeklySlot,
} from "@/lib/classSchedule";
import SessionDrawer from "@/components/admin/class/SessionDrawer";
import AttendanceDrawer from "@/components/admin/class/AttendanceDrawer";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { toast } from "sonner";

interface GlobalCalendarProps {
  role: "admin" | "teacher" | "student";
  classId?: string;
  /**
   * Show one specific teacher's sessions rather than the signed-in user's.
   * For an admin looking at someone else's profile; ignored for other roles,
   * since a teacher must not be able to ask for a colleague's schedule.
   */
  teacherId?: string;
  onAddSession?: (date: Date) => void;
  onEditSession?: (session: any) => void;
  /**
   * Take over what happens when a session is clicked. Without this the
   * calendar opens its own attendance drawer, which is right nearly
   * everywhere; a caller with its own drawer passes this instead.
   */
  onSelectSession?: (session: CalendarSessionRow) => void;
}

/** The joined session row this calendar selects, for callers that take it. */
export interface CalendarSessionRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  rate_override_vnd: number | null;
  class_id: string;
  teacher_id: string | null;
  classes?: {
    id: string;
    name: string;
    default_session_length_minutes: number | null;
    schedule_template: unknown;
  } | null;
  teachers?: { id: string; full_name: string } | null;
  attendance?: Array<{ student_id: string; status: string }> | null;
}

interface SessionSnapshot {
  date: string;
  start_time: string;
  end_time: string;
}

const GlobalCalendar = ({
  role,
  classId,
  teacherId,
  onAddSession,
  onEditSession,
  onSelectSession,
}: GlobalCalendarProps) => {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const { studentId } = useStudentProfile();
  const { user } = useAuth();

  // Fetch by the dates that are ACTUALLY ON SCREEN, not by calendar month.
  //
  // The old version always fetched a month while the week and day views moved
  // their own cursor without telling anyone, so paging the week view past a
  // month boundary rendered an empty calendar. The initial value matches what
  // PremiumCalendar will ask for on mount, so there is no wasted first fetch.
  const [range, setRange] = useState<VisibleRange>(() => getVisibleRange("week", nowBangkok()));

  const handleRangeChange = useCallback((next: VisibleRange) => {
    setRange((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  const { data: rawSessions = [], isLoading, refetch } = useQuery({
    queryKey: ["calendar-sessions", role, classId, teacherId, studentId, range.start, range.end, user?.id],
    queryFn: async () => {
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
          classes!inner (id, name, default_session_length_minutes, schedule_template),
          teachers (id, full_name),
          attendance (student_id, status)
        `)
        .gte("date", range.start)
        .lte("date", range.end)
        .order("date");

      if (classId) {
        query = query.eq("class_id", classId);
      }

      // An admin inspecting one teacher's schedule. Deliberately admin-only:
      // honouring it for a teacher would let them read a colleague's diary.
      if (teacherId && role === "admin") {
        query = query.eq("teacher_id", teacherId);
      } else if (!classId && role === "teacher") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (teacher) {
          query = query.eq("teacher_id", teacher.id);
        } else {
          const { data: ta } = await supabase
            .from("teaching_assistants")
            .select("id")
            .eq("user_id", user?.id)
            .maybeSingle();

          if (!ta) return [];

          const { data: spData } = await supabase
            .from("session_participants")
            .select("session_id")
            .eq("teaching_assistant_id", ta.id)
            .eq("participant_type", "teaching_assistant");

          const sessionIds = spData?.map((sp) => sp.session_id) || [];
          if (sessionIds.length === 0) return [];
          query = query.in("id", sessionIds);
        }
      } else if (role === "student") {
        let activeStudentId = studentId;

        if (!activeStudentId) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("linked_user_id", user?.id)
            .maybeSingle();
          if (student) activeStudentId = student.id;
        }

        if (!activeStudentId) return [];

        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("class_id")
          .eq("student_id", activeStudentId)
          .lte("start_date", range.end)
          .or(`end_date.is.null,end_date.gte.${range.start}`);

        const classIds = enrollments?.map((e) => e.class_id) || [];
        if (classIds.length === 0) return [];
        query = query.in("class_id", classIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  /* ------------------------------------------------- reschedule with undo */

  const applyMove = useCallback(
    async (sessionId: string, next: Partial<SessionSnapshot>) => {
      const { error } = await supabase.from("sessions").update(next).eq("id", sessionId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
    },
    [queryClient],
  );

  const rescheduleMutation = useMutation({
    mutationFn: async ({
      request,
      previous,
    }: {
      request: RescheduleRequest;
      previous: SessionSnapshot;
    }) => {
      const next: Partial<SessionSnapshot> = { date: request.date };
      if (request.startTime) next.start_time = request.startTime;
      if (request.endTime) next.end_time = request.endTime;
      await applyMove(request.eventId, next);
      return { request, previous };
    },
    onSuccess: ({ request, previous }) => {
      // Replaces a native window.confirm() that used to interrupt the drag
      // before it happened. Moving is cheap and reversible, so the move lands
      // immediately and the safety net is an undo rather than a prompt.
      const when = dayjs(request.date).format("ddd D MMM");
      toast.success(`Moved to ${when}${request.startTime ? ` at ${request.startTime.slice(0, 5)}` : ""}`, {
        action: {
          label: "Undo",
          onClick: () => {
            applyMove(request.eventId, previous)
              .then(() => toast.success("Move undone"))
              .catch((e: Error) => toast.error(`Could not undo: ${e.message}`));
          },
        },
      });
    },
    onError: (error: Error) => toast.error(`Could not reschedule: ${error.message}`),
  });

  const handleReschedule = useCallback(
    (request: RescheduleRequest) => {
      if (role !== "admin") return;
      const session = rawSessions.find((s: any) => s.id === request.eventId);
      if (!session) return;
      rescheduleMutation.mutate({
        request,
        previous: {
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
        },
      });
    },
    [role, rawSessions, rescheduleMutation],
  );

  /* ---------------------------------------------------------------- view */

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    // Parse each class's weekly pattern once, not once per session.
    const patterns = new Map<string, WeeklySlot[]>();
    const slotsFor = (session: any): WeeklySlot[] => {
      const key = session.class_id;
      if (!key) return [];
      let slots = patterns.get(key);
      if (!slots) {
        slots = parseWeeklySlots(session.classes?.schedule_template);
        patterns.set(key, slots);
      }
      return slots;
    };

    return rawSessions.map((session: any) => {
      const slots = slotsFor(session);
      const classDefaultMinutes = session.classes?.default_session_length_minutes ?? null;
      // Expected length comes from the slot for THIS day of week. A class
      // running 2h on Wednesday and 90m on Saturday is correct on both days,
      // which a single per-class number could never express.
      const expected = expectedLengthFor({
        date: session.date,
        startTime: session.start_time,
        slots,
        classDefaultMinutes,
      });

      return {
        id: session.id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        class_name: session.classes?.name || "Unknown",
        status: session.status,
        enrolled_count: session.attendance?.length || 0,
        notes: session.notes,
        teacher_name: session.teachers?.full_name,
        // Colour is keyed on the id so a rename keeps the class's colour.
        class_id: session.class_id,
        expected_duration_minutes: expected.minutes,
        accepted_lengths: configuredLengths(slots, classDefaultMinutes),
      };
    });
  }, [rawSessions]);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      const raw = rawSessions.find((s: any) => s.id === event.id);
      if (!raw) return;
      // A caller with its own drawer takes the raw row and renders it itself;
      // otherwise the calendar opens the one that suits the role.
      if (onSelectSession) onSelectSession(raw);
      else setSelectedSession(raw);
    },
    [rawSessions, onSelectSession],
  );

  return (
    <div className="space-y-4">
      <PremiumCalendar
        events={calendarEvents}
        isLoading={isLoading}
        onSelectEvent={handleSelectEvent}
        onAddSession={onAddSession}
        onReschedule={role === "admin" ? handleReschedule : undefined}
        onRangeChange={handleRangeChange}
        isAdmin={role === "admin"}
      />

      {selectedSession && !onSelectSession && role !== "student" && (
        <AttendanceDrawer
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            refetch();
          }}
        />
      )}

      {selectedSession && !onSelectSession && role === "student" && (
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
