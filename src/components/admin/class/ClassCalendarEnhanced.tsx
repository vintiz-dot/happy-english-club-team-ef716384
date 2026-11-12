import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, DollarSign, Calendar as CalendarIcon, Plus, LayoutGrid, CalendarDays } from "lucide-react";
import AttendanceDrawer from "./AttendanceDrawer";
import AddSessionModal from "@/components/admin/AddSessionModal";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";

interface EnhancedClassCalendarProps {
  classId: string;
}

type ViewMode = "cards" | "month";

const ClassCalendarEnhanced = ({ classId }: EnhancedClassCalendarProps) => {
  const [month, setMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [addSessionDate, setAddSessionDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const { data: sessions, refetch } = useQuery({
    queryKey: ["enhanced-class-sessions", classId, format(month, "yyyy-MM")],
    queryFn: async () => {
      const startDate = format(startOfMonth(month), "yyyy-MM-dd");
      const endDate = format(endOfMonth(month), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          teacher_id,
          rate_override_vnd,
          notes,
          class_id,
          classes (name),
          teachers (id, full_name),
          attendance (student_id, status)
        `)
        .eq("class_id", classId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrolledStudents } = useQuery({
    queryKey: ["class-enrolled-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          start_date,
          students (id, full_name)
        `)
        .eq("class_id", classId)
        .is("end_date", null);

      if (error) throw error;
      return data?.map(e => ({
        id: e.students?.id,
        full_name: e.students?.full_name,
        enrolled_since: e.start_date
      })) || [];
    },
  });

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    let filtered = sessions;

    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (studentSearch && enrolledStudents) {
      const matchingStudentIds = enrolledStudents
        .filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()))
        .map(s => s.id);

      filtered = filtered.filter(s =>
        s.attendance?.some((a: any) => matchingStudentIds.includes(a.student_id))
      );
    }

    return filtered;
  }, [sessions, statusFilter, studentSearch, enrolledStudents]);

  const monthStats = useMemo(() => {
    if (!sessions) return { total: 0, enrolled: 0, cost: 0 };
    return {
      total: sessions.length,
      enrolled: enrolledStudents?.length || 0,
      cost: sessions.reduce((sum, s) => sum + (s.rate_override_vnd || 0), 0)
    };
  }, [sessions, enrolledStudents]);

  const getSessionStatus = (session: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);

    // Colours per DESIGN_SYSTEM s.14 (labels and order unchanged): today has
    // the brass mark, cancelled is red, the rest are quiet and told apart by
    // their words.
    if (isToday(sessionDate)) return { color: "bg-hec-surface border-hec-brass", label: "Today" };
    if (session.status === "Canceled") return { color: "bg-hec-danger-tint border-hec-danger/30", label: "Canceled" };
    if (session.status === "Holiday") return { color: "bg-hec-sunken border-hec-line", label: "Holiday" };
    if (session.status === "Held") return { color: "bg-hec-sunken border-hec-line", label: "Held" };
    if (sessionDate > today) return { color: "bg-hec-surface border-hec-line", label: "Scheduled" };
    return { color: "bg-hec-surface border-hec-line", label: "Scheduled" };
  };

  // Month grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredSessions.forEach(s => {
      const key = s.date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredSessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
          <h2 className="min-w-0 text-center font-display text-hec-h2 font-medium text-hec-ink sm:min-w-52">
            {format(month, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-hec-md border border-hec-line-strong">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              aria-pressed={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              aria-pressed={viewMode === "month"}
              onClick={() => setViewMode("month")}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Month
            </Button>
          </div>

          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-hec-ink-soft" />
              <span className="text-hec-small font-medium tabular-nums text-hec-ink">{monthStats.total} sessions</span>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-hec-ink-soft" />
              <span className="text-hec-small font-medium tabular-nums text-hec-ink">{monthStats.enrolled} students</span>
            </div>
          </Card>
          {monthStats.cost > 0 && (
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-hec-ink-soft" />
                <span className="whitespace-nowrap text-hec-small font-medium tabular-nums text-hec-ink">
                  {monthStats.cost.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Held">Held</SelectItem>
            <SelectItem value="Canceled">Canceled</SelectItem>
            <SelectItem value="Holiday">Holiday</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by student name..."
          aria-label="Search by student name"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{viewMode === "cards" ? "Monthly Sessions" : format(month, "MMMM yyyy")}</CardTitle>
            <Button onClick={() => setAddSessionDate(new Date())} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "cards" ? (
            /* ── Cards View ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSessions?.map((session) => {
                  const status = getSessionStatus(session);
                  const enrolledCount = enrolledStudents?.length || 0;

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`rounded-hec-lg border p-4 text-left text-hec-ink shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring ${status.color}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="text-hec-small font-semibold">
                          {format(new Date(session.date), "EEE, MMM d")}
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mb-1 text-hec-caption tabular-nums text-hec-ink-soft">
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </div>

                      <div className="flex items-start justify-between gap-2 text-hec-caption">
                        <div className="flex shrink-0 items-center gap-1">
                          <Users className="h-4 w-4 text-hec-ink-soft" />
                          <span className="tabular-nums">{enrolledCount} students</span>
                        </div>
                        <span className="min-w-0 whitespace-normal break-words text-right text-hec-ink-soft">
                          👤 {(session.teachers as any)?.full_name || "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredSessions?.length === 0 && (
                <div className="py-12 text-center text-hec-body text-hec-ink-soft">
                  No sessions found for this month
                </div>
              )}
            </>
          ) : (
            /* ── Month Grid View ── */
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="py-2 text-center text-hec-caption font-medium text-hec-ink-soft">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 border-l border-t border-hec-line">
                {calendarDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const daySessions = sessionsByDate[dateStr] || [];
                  const inMonth = isSameMonth(day, month);
                  const today = isToday(day);

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-20 min-w-0 border-b border-r border-hec-line p-1 ${
                        !inMonth ? "bg-hec-sunken/60" : today ? "bg-hec-raised ring-1 ring-inset ring-hec-brass/40" : "bg-hec-surface"
                      }`}
                    >
                      <div className={`mb-1 text-hec-caption font-medium tabular-nums ${
                        today ? "font-semibold text-hec-brass" : !inMonth ? "text-hec-ink-faint" : "text-hec-ink"
                      }`}>
                        {format(day, "d")}
                      </div>

                      <div className="space-y-0.5">
                        {daySessions.map((s: any) => {
                          const status = getSessionStatus(s);
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSession(s)}
                              className={`min-h-hec-target w-full whitespace-normal break-words rounded-hec-sm border px-1 py-1 text-left text-hec-caption text-hec-ink transition-shadow duration-hec-1 ease-hec hover:shadow-hec-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring ${status.color}`}
                            >
                              <span className="font-medium tabular-nums">{s.start_time?.slice(0, 5)}</span>
                              {" "}
                              <span className="text-hec-ink-soft">
                                {(s.teachers as any)?.full_name?.split(" ")[0] || "—"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Click empty day to add session */}
                      {inMonth && daySessions.length === 0 && (
                        <button
                          onClick={() => setAddSessionDate(day)}
                          aria-label={`Add a session on ${format(day, "d MMMM")}`}
                          className="flex min-h-hec-target w-full items-center justify-center rounded-hec-sm opacity-0 transition-opacity duration-hec-1 ease-hec hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                        >
                          <Plus className="h-4 w-4 text-hec-ink-soft" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-2 text-hec-caption text-hec-ink">
            <span className="rounded-hec-sm border border-hec-line bg-hec-surface px-3 py-1">Scheduled</span>
            <span className="rounded-hec-sm border border-hec-brass bg-hec-surface px-3 py-1">Today</span>
            <span className="rounded-hec-sm border border-hec-line bg-hec-sunken px-3 py-1">Held</span>
            <span className="rounded-hec-sm border border-hec-danger/30 bg-hec-danger-tint px-3 py-1">Canceled</span>
            <span className="rounded-hec-sm border border-hec-line bg-hec-sunken px-3 py-1">Holiday</span>
          </div>
        </CardContent>
      </Card>

      {selectedSession && (
        <AttendanceDrawer
          session={{
            ...selectedSession,
            class_id: classId,
            class_name: (selectedSession as any).classes?.name || "Session",
          }}
          onClose={() => {
            setSelectedSession(null);
            refetch();
          }}
        />
      )}

      {addSessionDate && (
        <AddSessionModal
          classId={classId}
          date={addSessionDate}
          open={!!addSessionDate}
          onClose={() => setAddSessionDate(null)}
          onSuccess={() => {
            refetch();
            setAddSessionDate(null);
          }}
        />
      )}
    </div>
  );
};

export default ClassCalendarEnhanced;
