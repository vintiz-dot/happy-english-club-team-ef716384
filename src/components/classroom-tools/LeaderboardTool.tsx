/**
 * The board, inside the tools panel.
 *
 * Two views over the same class: the monthly leaderboard, and — only
 * while a session is actually running — the live grid for awarding
 * skills as they happen. The live view switches itself on when it finds
 * an in-progress session, because that is the moment it is useful and
 * nobody is going to go looking for a toggle mid-lesson.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { fetchAccessibleClasses } from "@/lib/teacherAccess";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassLeaderboardShared } from "@/components/shared/ClassLeaderboardShared";
import { ManualPointsDialog } from "@/components/shared/ManualPointsDialog";
import { LiveAssessmentGrid } from "@/components/teacher/LiveAssessmentGrid";
import { toast } from "sonner";
import {
  Segmented,
  Stage,
  ToolCard,
} from "./studio/StudioKit";

export function LeaderboardTool() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "live">("board");
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const today = dayjs().format("YYYY-MM-DD");

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["leaderboard-tool-classes", user?.id],
    enabled: !!user,
    queryFn: async () => (user ? fetchAccessibleClasses(user.id) : []),
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["leaderboard-tool-active-sessions", today],
    queryFn: async () => {
      const now = new Date().toTimeString().slice(0, 8);
      const { data } = await supabase
        .from("sessions")
        .select("id, class_id, start_time, end_time")
        .eq("date", today)
        .in("status", ["Scheduled", "Held"])
        .lte("start_time", now)
        .gte("end_time", now);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const activeSessionClass = useMemo(() => {
    if (!classes.length) return null;
    return activeSessions.find((s) => classes.some((c) => c.id === s.class_id));
  }, [activeSessions, classes]);

  const displayClassId = selectedClassId || activeSessionClass?.class_id || classes[0]?.id;

  useEffect(() => {
    if (activeSessionClass && !selectedClassId) setViewMode("live");
  }, [activeSessionClass, selectedClassId]);

  const activeSessionForClass = useMemo(
    () => activeSessions.find((s) => s.class_id === displayClassId),
    [activeSessions, displayClassId],
  );

  const canUseLiveMode = !!activeSessionForClass;

  const calculateRemainingTime = useCallback(() => {
    if (!activeSessionForClass?.end_time) {
      setRemainingTime(null);
      return;
    }
    const [endH, endM, endS] = activeSessionForClass.end_time.split(":").map(Number);
    const endDate = new Date();
    endDate.setHours(endH, endM, endS || 0, 0);
    const diffMs = endDate.getTime() - Date.now();
    if (diffMs <= 0) {
      setRemainingTime(null);
      return;
    }
    const mins = Math.ceil(diffMs / 60000);
    setRemainingTime(mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`);
  }, [activeSessionForClass?.end_time]);

  useEffect(() => {
    calculateRemainingTime();
    const id = window.setInterval(calculateRemainingTime, 60000);
    return () => window.clearInterval(id);
  }, [calculateRemainingTime]);

  useEffect(() => {
    if (viewMode === "live" && !canUseLiveMode) {
      toast.info("Session ended", { description: "Back to the monthly board." });
      setViewMode("board");
    }
  }, [viewMode, canUseLiveMode]);

  const className = classes.find((c) => c.id === displayClassId)?.name;

  return (
    <ToolCard
      icon={Trophy}
      tone="butter"
      title="Leaderboard"
      description="This month's points, and live awards while a lesson is running."
      wide
      action={displayClassId ? <ManualPointsDialog classId={displayClassId} /> : undefined}
    >
      {isLoading || classes.length === 0 ? (
        <Stage className="min-h-[140px] p-6 text-center">
          <p className="text-sm text-ink-faint">
            {isLoading
              ? "Loading your classes…"
              : "No classes yet — boards appear once you teach one."}
          </p>
        </Stage>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select
              value={displayClassId || ""}
              onValueChange={(v) => setSelectedClassId(v)}
            >
              <SelectTrigger className="h-10 w-auto min-w-[180px] flex-1 rounded-2xl border-studio bg-studio-stage text-sm font-semibold text-ink focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Pick a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[230px] shrink-0">
              <Segmented
                ariaLabel="Board view"
                size="sm"
                value={viewMode}
                onChange={(v) => {
                  if (v === "live" && !canUseLiveMode) return;
                  setViewMode(v as "board" | "live");
                }}
                options={[
                  { value: "board", label: "Month" },
                  {
                    value: "live",
                    label: canUseLiveMode ? (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" aria-hidden />
                        Live{remainingTime ? ` · ${remainingTime}` : ""}
                      </span>
                    ) : (
                      "Live"
                    ),
                    srLabel: canUseLiveMode
                      ? "Live assessment"
                      : "Live assessment (no session running)",
                  },
                ]}
              />
            </div>
          </div>

          {displayClassId && viewMode === "board" && (
            <ClassLeaderboardShared classId={displayClassId} canManagePoints />
          )}

          {displayClassId && viewMode === "live" && activeSessionForClass && (
            <div className="space-y-2">
              <p className="text-xs text-ink-soft">
                {className} — tap a student to award a skill.
              </p>
              <LiveAssessmentGrid
                classId={displayClassId}
                sessionId={activeSessionForClass.id}
              />
            </div>
          )}
        </>
      )}
    </ToolCard>
  );
}
