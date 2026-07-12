import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Zap, BarChart3, Clock } from "lucide-react";
import { ClassLeaderboardShared } from "@/components/shared/ClassLeaderboardShared";
import { ManualPointsDialog } from "@/components/shared/ManualPointsDialog";
import { LiveAssessmentGrid } from "@/components/teacher/LiveAssessmentGrid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Compact leaderboard + live assessment tool for the Classroom Tools Sheet.
 * Auto-detects active sessions and offers a live / standard toggle.
 */
export function LeaderboardTool() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"standard" | "live">("standard");
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const today = dayjs().format("YYYY-MM-DD");

  const { data: activeClasses = [], isLoading } = useQuery({
    queryKey: ["leaderboard-tool-classes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let sessionData: any[] = [];

      if (teacher) {
        const { data } = await supabase
          .from("sessions")
          .select(`class_id, classes!inner(id, name)`)
          .eq("teacher_id", teacher.id)
          .gte("date", dayjs().subtract(3, "month").format("YYYY-MM-DD"));
        sessionData = data || [];
      } else {
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!ta) return [];

        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(class_id, date, classes!inner(id, name))`)
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .gte("sessions.date", dayjs().subtract(3, "month").format("YYYY-MM-DD"));

        sessionData = (data || []).map((sp: any) => ({
          class_id: sp.sessions?.class_id,
          classes: sp.sessions?.classes,
        }));
      }

      const classMap = new Map();
      sessionData.forEach((s: any) => {
        const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
        if (classData && !classMap.has(classData.id)) {
          classMap.set(classData.id, classData);
        }
      });

      return Array.from(classMap.values());
    },
  });

  // Active sessions query
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
    if (!activeClasses.length) return null;
    return activeSessions.find((s: any) => activeClasses.some((c: any) => c.id === s.class_id));
  }, [activeSessions, activeClasses]);

  const displayClassId = selectedClassId || activeSessionClass?.class_id || activeClasses[0]?.id;

  useEffect(() => {
    if (activeSessionClass && !selectedClassId) {
      setViewMode("live");
    }
  }, [activeSessionClass, selectedClassId]);

  const activeSessionForClass = useMemo(
    () => activeSessions.find((s: any) => s.class_id === displayClassId),
    [activeSessions, displayClassId]
  );

  const canUseLiveMode = !!activeSessionForClass;

  const calculateRemainingTime = useCallback(() => {
    if (!activeSessionForClass?.end_time) {
      setRemainingTime(null);
      return;
    }
    const now = new Date();
    const [endH, endM, endS] = activeSessionForClass.end_time.split(":").map(Number);
    const endDate = new Date();
    endDate.setHours(endH, endM, endS || 0, 0);
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      setRemainingTime(null);
      return;
    }
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins >= 60) {
      setRemainingTime(`${Math.floor(diffMins / 60)}h ${diffMins % 60}m`);
    } else {
      setRemainingTime(`${diffMins} min`);
    }
  }, [activeSessionForClass?.end_time]);

  useEffect(() => {
    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000);
    return () => clearInterval(interval);
  }, [calculateRemainingTime]);

  useEffect(() => {
    if (viewMode === "live" && !canUseLiveMode) {
      toast.info("Session ended", {
        description: "Switching to Standard view.",
      });
      setViewMode("standard");
    }
  }, [viewMode, canUseLiveMode]);

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading classes...</div>;
  }

  if (activeClasses.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No classes found. Leaderboards will appear once you teach classes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        {activeClasses.length > 1 && (
          <Select value={displayClassId || ""} onValueChange={setSelectedClassId}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {activeClasses.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <Button
            variant={viewMode === "standard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("standard")}
            className="rounded-none gap-1 h-8 px-2 text-xs"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Board
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "live" ? "default" : "ghost"}
                size="sm"
                onClick={() => canUseLiveMode && setViewMode("live")}
                className="rounded-none gap-1 h-8 px-2 text-xs"
                disabled={!canUseLiveMode}
              >
                <Zap className="h-3.5 w-3.5" />
                Live
                {canUseLiveMode && remainingTime && (
                  <span className="flex items-center gap-0.5 text-[9px] bg-primary/20 text-primary-foreground px-1 py-0.5 rounded-full">
                    <Clock className="h-2 w-2" />
                    {remainingTime}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {!canUseLiveMode && (
              <TooltipContent>
                <p>No session in progress</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[400px]">
        {displayClassId && viewMode === "standard" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                {activeClasses.find((c: any) => c.id === displayClassId)?.name}
              </div>
              <ManualPointsDialog classId={displayClassId} />
            </div>
            <ClassLeaderboardShared classId={displayClassId} />
          </div>
        )}

        {displayClassId && viewMode === "live" && activeSessionForClass && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-500" />
              Live — {activeClasses.find((c: any) => c.id === displayClassId)?.name}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tap a student to quickly award skills.
            </p>
            <LiveAssessmentGrid classId={displayClassId} sessionId={activeSessionForClass.id} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
