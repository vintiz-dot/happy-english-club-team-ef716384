import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { AttendanceHeatmap } from "./AttendanceHeatmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getAttendanceColor = (sessionDate: string, sessionStatus: string, attendanceStatus?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessDate = new Date(sessionDate);
  sessDate.setHours(0, 0, 0, 0);
  
  // Future dates always show as Scheduled (muted)
  if (sessDate > today) {
    return 'bg-muted';
  }
  
  // Past/today dates: check status
  if (sessionStatus === 'Canceled') return 'bg-amber-500';
  if (sessionStatus === 'Holiday') return 'bg-slate-500';
  
  // For Held or Scheduled sessions in the past, show attendance colors
  if (attendanceStatus === 'Present') return 'bg-green-500';
  if (attendanceStatus === 'Absent') return 'bg-red-500';
  if (attendanceStatus === 'Excused') return 'bg-gray-500';
  
  return 'bg-muted';
};

export function StudentAttendanceTab({ studentId }: { studentId: string }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["student-attendance", studentId, selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(selectedMonth + "-01");
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      // Get sessions with LEFT JOIN to attendance so future sessions show up
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          class_id,
          class:classes(name),
          attendance!left(status, student_id)
        `)
        .gte("date", monthStart)
        .lte("date", monthEnd.toISOString().split('T')[0])
        .order("date");

      if (error) throw error;

      // Filter to only sessions where student is enrolled
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id, start_date, end_date")
        .eq("student_id", studentId);

      if (!enrollments) return [];

      // Filter sessions based on enrollment dates
      return data?.filter(session => {
        const enrollment = enrollments.find(e => e.class_id === session.class_id);
        if (!enrollment) return false;
        
        const sessionDate = new Date(session.date);
        const startDate = new Date(enrollment.start_date);
        const endDate = enrollment.end_date ? new Date(enrollment.end_date) : null;
        
        return sessionDate >= startDate && (!endDate || sessionDate <= endDate);
      }).map(session => ({
        ...session,
        attendance: Array.isArray(session.attendance) 
          ? session.attendance.find((a: any) => a.student_id === studentId) 
          : session.attendance
      })) || [];
    },
  });

  const days = eachDayOfInterval({
    start: startOfMonth(new Date(selectedMonth + "-01")),
    end: endOfMonth(new Date(selectedMonth + "-01")),
  });

  const sessionsByDate = sessions?.reduce((acc: any, session: any) => {
    if (!acc[session.date]) acc[session.date] = [];
    acc[session.date].push(session);
    return acc;
  }, {});

  if (isLoading) {
    return <div>Loading attendance...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="heatmap">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceHeatmap studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <Label>Month</Label>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-48"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500"></div>
              <span>Excused</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span>Canceled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-500"></div>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-muted"></div>
              <span>Scheduled (future)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startOfMonth(new Date(selectedMonth + "-01")).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDate?.[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  className="min-h-[80px] p-2 border rounded-lg"
                >
                  <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {daySessions.map((session: any) => (
                      <Badge
                        key={session.id}
                        variant="outline"
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white",
                          getAttendanceColor(
                            session.date,
                            session.status,
                            session.attendance?.status
                          )
                        )}
                        title={`${session.class?.name} - ${session.attendance?.status || 'Scheduled'}`}
                      >
                        {format(new Date(`2000-01-01T${session.start_time}`), "HH")}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
