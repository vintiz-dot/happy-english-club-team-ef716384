import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import AttendanceDrawer from "@/components/admin/class/AttendanceDrawer";

/**
 * Compact attendance view for the Classroom Tools Sheet.
 * Shows today's sessions for the logged-in teacher, with quick attendance access.
 */
export function AttendanceTool() {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const viewDate = useMemo(() => dayjs().add(dateOffset, "day").format("YYYY-MM-DD"), [dateOffset]);
  const isToday = dateOffset === 0;

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["attendance-tool-sessions", viewDate, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Get teacher ID
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacher) {
        // Try TA
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!ta) return [];

        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(id, date, start_time, end_time, status, notes, classes!inner(id, name))`)
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .eq("sessions.date", viewDate);

        return (data || []).map((sp: any) => ({
          id: sp.sessions.id,
          date: sp.sessions.date,
          start_time: sp.sessions.start_time,
          end_time: sp.sessions.end_time,
          status: sp.sessions.status,
          notes: sp.sessions.notes,
          class_name: sp.sessions.classes.name,
          class_id: sp.sessions.classes.id,
        }));
      }

      const { data } = await supabase
        .from("sessions")
        .select(`id, date, start_time, end_time, status, notes, classes!inner(id, name)`)
        .eq("teacher_id", teacher.id)
        .eq("date", viewDate)
        .order("start_time", { ascending: true });

      return (data || []).map((s: any) => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        notes: s.notes,
        class_name: s.classes.name,
        class_id: s.classes.id,
      }));
    },
  });

  // Get attendance counts for each session
  const { data: attendanceCounts = {} } = useQuery({
    queryKey: ["attendance-tool-counts", sessions.map((s: any) => s.id).join(",")],
    enabled: sessions.length > 0,
    queryFn: async () => {
      const counts: Record<string, { present: number; absent: number; total: number }> = {};
      for (const session of sessions) {
        const { data: att } = await supabase
          .from("attendance")
          .select("status")
          .eq("session_id", session.id);

        const present = (att || []).filter((a: any) => a.status === "present").length;
        const absent = (att || []).filter((a: any) => a.status === "absent").length;
        counts[session.id] = { present, absent, total: (att || []).length };
      }
      return counts;
    },
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Held":
        return "border-emerald-500/30 bg-emerald-500/5";
      case "Canceled":
        return "border-rose-500/30 bg-rose-500/5 opacity-60";
      case "Holiday":
        return "border-amber-500/30 bg-amber-500/5 opacity-60";
      default:
        return "border-primary/20 bg-primary/5";
    }
  };

  const isSessionActive = (session: any) => {
    if (session.date !== dayjs().format("YYYY-MM-DD")) return false;
    const now = new Date().toTimeString().slice(0, 8);
    return now >= session.start_time && now <= session.end_time;
  };

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateOffset((d) => d - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-semibold">{dayjs(viewDate).format("ddd, MMM D")}</div>
          {isToday && (
            <span className="text-[10px] text-primary font-medium uppercase tracking-wider">Today</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDateOffset((d) => d + 1)}
          disabled={dateOffset >= 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isToday && dateOffset !== 0 && (
        <Button variant="link" size="sm" className="w-full text-xs" onClick={() => setDateOffset(0)}>
          Back to today
        </Button>
      )}

      {/* Sessions list */}
      <ScrollArea className="max-h-[380px]">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No sessions on this day
            </div>
          ) : (
            sessions.map((session: any) => {
              const counts = attendanceCounts[session.id];
              const active = isSessionActive(session);
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                    getStatusStyle(session.status),
                    active && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{session.class_name}</span>
                    <div className="flex items-center gap-1.5">
                      {active && (
                        <span className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                          LIVE
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                    </span>
                    {counts && counts.total > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <Check className="h-3 w-3" />
                          {counts.present}
                        </span>
                        <span className="flex items-center gap-0.5 text-rose-500">
                          <X className="h-3 w-3" />
                          {counts.absent}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {selectedSession && (
        <AttendanceDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
