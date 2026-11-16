import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

export function ScheduleCalendar({ role }: { role: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { user } = useAuth();
  // Renders on "/" for families (parent area, not flipped yet): the old look
  // stays there until that area flips.
  const ivory = useIvory();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", year, month, role, user?.id],
    enabled: role !== "teacher" || !!user,
    queryFn: async () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      let query = supabase
        .from("sessions")
        .select(`
          *,
          classes:class_id(name, session_rate_vnd),
          teachers:teacher_id(full_name)
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")
        .order("start_time");

      // Filter for teachers/TAs
      if (role === "teacher") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        if (teacher) {
          query = query.eq("teacher_id", teacher.id);
        } else {
          // Try TA
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
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const monthName = currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  // Group sessions by date
  const sessionsByDate = sessions?.reduce((acc: any, session: any) => {
    const date = session.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {}) || {};

  const getStatusColor = (status: string) => {
    if (ivory) {
      switch (status) {
        case "Held":
          return "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf";
        case "Canceled":
          return "border-hec-danger/30 bg-hec-danger-tint text-hec-danger";
        default:
          return "border-hec-line bg-hec-sunken text-hec-ink-soft";
      }
    }
    switch (status) {
      case "Held":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "Canceled":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    }
  };

  if (isLoading) {
    return <div className={ivory ? "text-hec-body text-hec-ink-soft" : undefined}>Loading schedule...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center justify-between", ivory && "flex-wrap gap-2")}>
          <CardTitle className={ivory ? "min-w-0" : undefined}>Schedule for {monthName}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={goToPreviousMonth} variant="outline" size="icon" aria-label={ivory ? "Previous month" : undefined}>
              <ChevronLeft className={ivory ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
            <Button onClick={goToNextMonth} variant="outline" size="icon" aria-label={ivory ? "Next month" : undefined}>
              <ChevronRight className={ivory ? "h-5 w-5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.keys(sessionsByDate).length === 0 ? (
            <p className={ivory ? "py-8 text-center text-hec-body text-hec-ink-soft" : "text-center text-muted-foreground py-8"}>
              No sessions this month
            </p>
          ) : (
            Object.entries(sessionsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateSessions]: [string, any]) => (
                <div key={date} className="space-y-2">
                  <h3 className={ivory ? "text-hec-small font-semibold text-hec-ink" : "font-semibold text-sm"}>
                    {new Date(date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <div className={ivory ? "space-y-2" : "space-y-2 pl-4"}>
                    {dateSessions.map((session: any) => (
                      <div
                        key={session.id}
                        className={ivory
                          ? "flex items-start justify-between gap-3 rounded-hec-md border border-hec-line bg-hec-surface p-4"
                          : "flex items-center justify-between p-3 rounded-lg border bg-card"}
                      >
                        <div className={ivory ? "min-w-0 flex-1 space-y-1" : "space-y-1"}>
                          <p className={ivory ? "whitespace-normal break-words text-hec-body font-medium text-hec-ink" : "font-medium"}>{session.classes?.name}</p>
                          <p className={ivory ? "text-hec-small tabular-nums text-hec-ink-soft" : "text-sm text-muted-foreground"}>
                            {session.start_time} - {session.end_time}
                          </p>
                          <p className={ivory ? "whitespace-normal break-words text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground"}>
                            Teacher: {session.teachers?.full_name}
                          </p>
                        </div>
                        <Badge className={cn(getStatusColor(session.status), ivory && "shrink-0")}>
                          {session.status === "Scheduled" && "Scheduled"}
                          {session.status === "Held" && "Held"}
                          {session.status === "Canceled" && "Canceled"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
