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

    if (isToday(sessionDate)) return { color: "bg-amber-100 border-amber-300", label: "Today" };
    if (session.status === "Canceled") return { color: "bg-red-100 border-red-300", label: "Canceled" };
    if (session.status === "Holiday") return { color: "bg-slate-100 border-slate-300", label: "Holiday" };
    if (session.status === "Held") return { color: "bg-gray-100 border-gray-300", label: "Held" };
    if (sessionDate > today) return { color: "bg-green-100 border-green-300", label: "Scheduled" };
    return { color: "bg-muted border-muted", label: "Scheduled" };
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
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {format(month, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode("month")}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Month
            </Button>
          </div>

          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{monthStats.total} sessions</span>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{monthStats.enrolled} students</span>
            </div>
          </Card>
          {monthStats.cost > 0 && (
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
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
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
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
                      className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all ${status.color}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-semibold">
                          {format(new Date(session.date), "EEE, MMM d")}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {status.label}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground mb-1">
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{enrolledCount} students</span>
                        </div>
                        <span className="text-muted-foreground truncate ml-2">
                          👤 {(session.teachers as any)?.full_name || "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredSessions?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
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
                  <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 border-t border-l">
                {calendarDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const daySessions = sessionsByDate[dateStr] || [];
                  const inMonth = isSameMonth(day, month);
                  const today = isToday(day);

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[80px] border-r border-b p-1 transition-colors ${
                        !inMonth ? "bg-muted/30" : today ? "bg-amber-50 dark:bg-amber-950/30" : "bg-background"
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        today ? "text-primary font-bold" : !inMonth ? "text-muted-foreground/50" : "text-foreground"
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
                              className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border ${status.color} hover:shadow-sm transition-shadow`}
                            >
                              <span className="font-medium">{s.start_time?.slice(0, 5)}</span>
                              {" "}
                              <span className="text-muted-foreground">
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
                          className="w-full h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-6 text-xs">
            <span className="px-3 py-1 rounded bg-green-100 border border-green-300">Scheduled</span>
            <span className="px-3 py-1 rounded bg-amber-100 border border-amber-300">Today</span>
            <span className="px-3 py-1 rounded bg-gray-100 border border-gray-300">Held</span>
            <span className="px-3 py-1 rounded bg-red-100 border border-red-300">Canceled</span>
            <span className="px-3 py-1 rounded bg-slate-100 border border-slate-300">Holiday</span>
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
