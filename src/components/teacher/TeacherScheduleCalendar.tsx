import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import CalendarMonth from "@/components/calendar/CalendarMonth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TeacherScheduleCalendar() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const { user } = useAuth();

  const { data: sessions } = useQuery({
    queryKey: ["teacher-schedule-calendar", month, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const [year, monthNum] = month.split("-");
      const startDate = `${year}-${monthNum}-01`;
      const endDate = dayjs(startDate).add(1, "month").format("YYYY-MM-DD");

      // Try teacher first
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let rawSessions: any[] = [];

      if (teacher) {
        const { data } = await supabase
          .from("sessions")
          .select(`id, date, start_time, end_time, status, classes!inner(name)`)
          .eq("teacher_id", teacher.id)
          .gte("date", startDate)
          .lt("date", endDate);
        rawSessions = data || [];
      } else {
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!ta) return [];

        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(id, date, start_time, end_time, status, classes!inner(name))`)
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .gte("sessions.date", startDate)
          .lt("sessions.date", endDate);

        rawSessions = (data || []).map((sp: any) => sp.sessions);
      }

      return rawSessions.map((s: any) => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        class_name: s.classes.name,
        status: s.status,
      }));
    },
  });

  const prevMonth = () => {
    setMonth(dayjs(month).subtract(1, "month").format("YYYY-MM"));
  };

  const nextMonth = () => {
    setMonth(dayjs(month).add(1, "month").format("YYYY-MM"));
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {dayjs(month).format("MMMM YYYY")}
        </h3>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <CalendarMonth month={month} events={sessions || []} />
    </Card>
  );
}
