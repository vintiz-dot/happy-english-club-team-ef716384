import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { GuardDialog, PayGuardDialog } from "@/components/admin/session-guard/GuardDialog";
import type { PayOp } from "@/lib/lessonPayGuard";
import type { MoveChange } from "@/components/admin/session-guard/useGuardedChange";

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
  /**
   * Open the register for this session once, e.g. from a "Mark attendance"
   * link. It is fetched as the signed-in user, so RLS decides what is found.
   */
  initialSessionId?: string;
}

const SESSION_SELECT = `
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
`;

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

const GlobalCalendar = ({
  role,
  classId,
  teacherId,
  onAddSession,
  onEditSession,
  onSelectSession,
  initialSessionId,
}: GlobalCalendarProps) => {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFor = useRef<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
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
        .select(SESSION_SELECT)
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

  // Deep link: open the register for one session, once.
  const wantsDeepLink = !!initialSessionId && role !== "student" && !onSelectSession;
  const { data: linked, isFetched: linkFetched } = useQuery({
    queryKey: ["calendar-session-link", initialSessionId, user?.id],
    enabled: wantsDeepLink && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(SESSION_SELECT)
        .eq("id", initialSessionId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (!wantsDeepLink || !linkFetched || openedFor.current === initialSessionId) return;
    openedFor.current = initialSessionId!;
    if (linked && linked.status !== "Canceled") setSelectedSession(linked);
    else setOpenFailed(true);
  }, [wantsDeepLink, linkFetched, linked, initialSessionId]);

  const dropSessionParam = useCallback(() => {
    if (!searchParams.has("session")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("session");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeDrawer = useCallback(() => {
    setSelectedSession(null);
    dropSessionParam();
    void refetch();
  }, [dropSessionParam, refetch]);

  /* ------------------------------------------------- reschedule, checked */

  // A drag never writes by itself. It opens the "Check before moving" dialog,
  // which asks the server what the evidence says and needs a reason. The undo
  // offered afterwards is another move and goes through the same check.
  const [moveDialog, setMoveDialog] = useState<{
    session: any;
    change: MoveChange;
    previous: MoveChange | null;
  } | null>(null);
  // D4 step 3A (review S-1): a same-day time change of a held lesson, or of one
  // that ended more than a week ago, is lesson pay: the move is refused with the
  // money preview and the lesson-pay check takes over.
  const [payDialog, setPayDialog] = useState<{ session: any; op: PayOp; args: Record<string, unknown> } | null>(null);

  const hm = (t?: string | null) => (t ? t.slice(0, 5) : "");

  const handleReschedule = useCallback(
    (request: RescheduleRequest) => {
      if (role !== "admin") return;
      const session = rawSessions.find((s: any) => s.id === request.eventId);
      if (!session) return;
      const change: MoveChange = {
        date: request.date,
        start_time: hm(request.startTime) || hm(session.start_time),
        end_time: hm(request.endTime) || hm(session.end_time),
      };
      setMoveDialog({
        session,
        change,
        previous: {
          date: session.date,
          start_time: hm(session.start_time),
          end_time: hm(session.end_time),
        },
      });
    },
    [role, rawSessions],
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
      {openFailed && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-body text-hec-ink"
        >
          <p>We couldn't open that class register. Pick the class from the calendar.</p>
          <button
            type="button"
            className="min-h-hec-target min-w-hec-target shrink-0 rounded-hec-md px-3 text-hec-small font-medium text-hec-ink-soft hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
            onClick={() => {
              setOpenFailed(false);
              dropSessionParam();
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <PremiumCalendar
        events={calendarEvents}
        isLoading={isLoading}
        onSelectEvent={handleSelectEvent}
        onAddSession={onAddSession}
        onReschedule={role === "admin" ? handleReschedule : undefined}
        onRangeChange={handleRangeChange}
        isAdmin={role === "admin"}
        initialDate={wantsDeepLink && linked?.date ? linked.date : undefined}
      />

      {moveDialog && (
        <GuardDialog
          open
          session={{
            id: moveDialog.session.id,
            date: moveDialog.session.date,
            start_time: moveDialog.session.start_time,
            end_time: moveDialog.session.end_time,
            class_name: moveDialog.session.classes?.name,
            teacher_name: moveDialog.session.teachers?.full_name,
          }}
          op="move"
          change={moveDialog.change}
          onClose={() => setMoveDialog(null)}
          onPayCheck={(d) => {
            const { session, change } = moveDialog;
            setMoveDialog(null);
            setPayDialog({ session, op: d.op, args: d.plan.args ?? { session_id: session.id, start_time: change.start_time, end_time: change.end_time } });
          }}
          onDone={() => {
            const { session, change, previous } = moveDialog;
            const when = dayjs(change.date).format("ddd D MMM");
            toast.success(`Moved to ${when} at ${change.start_time}`, {
              action: previous
                ? {
                    label: "Undo",
                    // Undoing is another checked move, not a silent write.
                    onClick: () => setMoveDialog({ session, change: previous, previous: null }),
                  }
                : undefined,
            });
            void refetch();
          }}
        />
      )}

      {payDialog && (
        <PayGuardDialog
          open
          session={{
            id: payDialog.session.id,
            date: payDialog.session.date,
            start_time: payDialog.session.start_time,
            end_time: payDialog.session.end_time,
            class_name: payDialog.session.classes?.name,
            teacher_name: payDialog.session.teachers?.full_name,
          }}
          op={payDialog.op}
          args={payDialog.args}
          onClose={() => setPayDialog(null)}
          onDone={() => void refetch()}
        />
      )}

      {selectedSession && !onSelectSession && role !== "student" && (
        <AttendanceDrawer
          session={selectedSession}
          onClose={closeDrawer}
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
