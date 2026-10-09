/**
 * Today's sessions, with a tap straight into attendance.
 *
 * Two things were quietly wrong here before and are fixed below:
 *
 *  - the present/absent tallies compared against lowercase "present",
 *    while the column stores "Present", so every session reported 0/0 and
 *    the counts were never shown;
 *  - the counts were fetched one query per session, so a teacher with six
 *    sessions paid six round trips to draw six small numbers.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import AttendanceDrawer from "@/components/admin/class/AttendanceDrawer";
import { one } from "@/lib/pgrst";
import {
  QuietButton,
  Stage,
  ToolCard,
} from "./studio/StudioKit";

interface SessionRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  class_name: string;
  class_id: string;
}

export function AttendanceTool() {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const viewDate = useMemo(
    () => dayjs().add(dateOffset, "day").format("YYYY-MM-DD"),
    [dateOffset],
  );
  const isToday = dateOffset === 0;

  const { data: sessions = [], isLoading } = useQuery<SessionRow[]>({
    queryKey: ["attendance-tool-sessions", viewDate, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacher) {
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!ta) return [];

        const { data } = await supabase
          .from("session_participants")
          .select(
            `sessions!inner(id, date, start_time, end_time, status, notes, classes!inner(id, name))`,
          )
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .eq("sessions.date", viewDate);

        return (data || []).flatMap((sp) => {
          const session = one(sp.sessions);
          const cls = one(session?.classes);
          if (!session || !cls) return [];
          return [
            {
              id: session.id,
              date: session.date,
              start_time: session.start_time,
              end_time: session.end_time,
              status: session.status,
              notes: session.notes,
              class_name: cls.name,
              class_id: cls.id,
            },
          ];
        });
      }

      const { data } = await supabase
        .from("sessions")
        .select(`id, date, start_time, end_time, status, notes, classes!inner(id, name)`)
        .eq("teacher_id", teacher.id)
        .eq("date", viewDate)
        .order("start_time", { ascending: true });

      return (data || []).flatMap((s) => {
        const cls = one(s.classes);
        if (!cls) return [];
        return [
          {
            id: s.id,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            status: s.status,
            notes: s.notes,
            class_name: cls.name,
            class_id: cls.id,
          },
        ];
      });
    },
  });

  const sessionIds = sessions.map((s) => s.id);

  const { data: counts = {} } = useQuery<
    Record<string, { present: number; absent: number }>
  >({
    queryKey: ["attendance-tool-counts", sessionIds.join(",")],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("session_id, status")
        .in("session_id", sessionIds);

      const out: Record<string, { present: number; absent: number }> = {};
      for (const row of data || []) {
        const bucket = (out[row.session_id] ??= { present: 0, absent: 0 });
        const status = String(row.status).toLowerCase();
        if (status === "present" || status === "late") bucket.present += 1;
        else if (status === "absent" || status === "excused") bucket.absent += 1;
      }
      return out;
    },
  });

  const isLive = (session: SessionRow) => {
    if (session.date !== dayjs().format("YYYY-MM-DD")) return false;
    const now = new Date().toTimeString().slice(0, 8);
    return now >= session.start_time && now <= session.end_time;
  };

  return (
    <>
      <ToolCard
        icon={ClipboardCheck}
        tone="sky"
        title="Attendance"
        description="Your sessions for the day — tap one to mark it."
        wide
        action={
          <div className="flex items-center gap-1">
            <QuietButton
              onClick={() => setDateOffset((d) => d - 1)}
              aria-label="Previous day"
              className="aspect-square px-0"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </QuietButton>
            <span className="min-w-[7.5rem] text-center text-xs font-bold text-ink">
              {isToday ? "Today" : dayjs(viewDate).format("ddd D MMM")}
            </span>
            <QuietButton
              onClick={() => setDateOffset((d) => d + 1)}
              aria-label="Next day"
              className="aspect-square px-0"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </QuietButton>
          </div>
        }
      >
        {isLoading || sessions.length === 0 ? (
          <Stage className="min-h-[120px] p-6 text-center">
            <p className="text-sm text-ink-faint">
              {isLoading ? "Loading your day…" : "Nothing scheduled on this day."}
            </p>
          </Stage>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => {
              const tally = counts[session.id];
              const live = isLive(session);
              const cancelled = session.status === "Canceled";
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    className={cn(
                      "studio-focus w-full rounded-2xl border border-studio bg-studio-stage p-3 text-left transition-all",
                      "hover:-translate-y-0.5 hover:shadow-studio",
                      cancelled && "opacity-55",
                      live && "border-transparent ring-2 ring-[hsl(var(--studio-ink))]",
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="truncate font-bold text-ink">{session.class_name}</span>
                      {live && (
                        <span className="shrink-0 rounded-full bg-[hsl(var(--studio-ink))] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--studio-card))]">
                          Now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" aria-hidden />
                        {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}
                      </span>
                      {tally && tally.present + tally.absent > 0 ? (
                        <span className="tabular-nums">
                          <span className="font-bold text-[hsl(var(--studio-sage-ink))]">
                            {tally.present}
                          </span>
                          {" in · "}
                          <span className="font-bold text-[hsl(var(--studio-clay-ink))]">
                            {tally.absent}
                          </span>
                          {" out"}
                        </span>
                      ) : (
                        <span className="text-ink-faint">Not marked</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ToolCard>

      {selectedSession && (
        <AttendanceDrawer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  );
}
