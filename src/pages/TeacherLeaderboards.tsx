import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { useState, useMemo, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Zap, BarChart3, Clock } from "lucide-react";
import { ClassLeaderboardShared } from "@/components/shared/ClassLeaderboardShared";
import { ManualPointsDialog } from "@/components/shared/ManualPointsDialog";
import { LiveAssessmentGrid } from "@/components/teacher/LiveAssessmentGrid";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fetchAccessibleClasses } from "@/lib/teacherAccess";

export default function TeacherLeaderboards() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"standard" | "live">("standard");
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const today = dayjs().format("YYYY-MM-DD");
  const { user } = useAuth();

  const { data: activeClasses, isLoading } = useQuery({
    queryKey: ["teacher-leaderboard-classes", user?.id],
    enabled: !!user,
    queryFn: async () => (user ? fetchAccessibleClasses(user.id) : []),
  });

  // Query for active sessions (currently running)
  const { data: activeSessions = [] } = useQuery({
    // Scoped to the classes this user may actually open. It used to ask for
    // every session running anywhere in the school, so Live Assessment lit up
    // for a colleague's class the moment they started teaching it.
    queryKey: ["active-sessions-today", today, (activeClasses || []).map((c: any) => c.id).join(",")],
    enabled: (activeClasses || []).length > 0,
    queryFn: async () => {
      const classIds = (activeClasses || []).map((c: any) => c.id);
      if (classIds.length === 0) return [];
      const now = new Date().toTimeString().slice(0, 8);
      const { data } = await supabase
        .from("sessions")
        .select("id, class_id, start_time, end_time")
        .eq("date", today)
        .in("class_id", classIds)
        .in("status", ["Scheduled", "Held"])
        .lte("start_time", now)
        .gte("end_time", now);
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Auto-select class with active session, or first class
  const activeSessionClass = useMemo(() => {
    if (!activeClasses?.length) return null;
    return activeSessions.find(s => activeClasses.some((c: any) => c.id === s.class_id));
  }, [activeSessions, activeClasses]);

  const displayClassId = selectedClassId || activeSessionClass?.class_id || activeClasses?.[0]?.id;

  // Auto-switch to live mode on initial load if there's an active session
  useEffect(() => {
    if (activeSessionClass && !selectedClassId) {
      setViewMode("live");
    }
  }, [activeSessionClass, selectedClassId]);
  
  // Check if selected class has an active session
  const activeSessionForClass = useMemo(() => 
    activeSessions.find(s => s.class_id === displayClassId),
    [activeSessions, displayClassId]
  );
  
  const canUseLiveMode = !!activeSessionForClass;

  // Calculate remaining time for active session
  const calculateRemainingTime = useCallback(() => {
    if (!activeSessionForClass?.end_time) {
      setRemainingTime(null);
      return;
    }
    
    const now = new Date();
    const [endH, endM, endS] = activeSessionForClass.end_time.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(endH, endM, endS || 0, 0);
    
    const diffMs = endDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setRemainingTime(null);
      return;
    }
    
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      setRemainingTime(`${hours}h ${mins}m`);
    } else {
      setRemainingTime(`${diffMins} min`);
    }
  }, [activeSessionForClass?.end_time]);

  // Update remaining time every minute
  useEffect(() => {
    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000);
    return () => clearInterval(interval);
  }, [calculateRemainingTime]);

  // Detect when session ends and notify user
  useEffect(() => {
    if (viewMode === "live" && !canUseLiveMode) {
      toast.info("Session ended", {
        description: "The class session has ended. Switching to Standard view.",
        action: {
          label: "Got it",
          onClick: () => {},
        },
      });
      setViewMode("standard");
    }
  }, [viewMode, canUseLiveMode]);

  return (
    <Layout title="Class Leaderboards">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Class Leaderboards</h1>
              <p className="text-muted-foreground">Track student progress and achievements</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeClasses && activeClasses.length > 1 && (
              <Select
                value={displayClassId || ""}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger className="w-[180px]">
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

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === "standard" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("standard")}
                className="rounded-none gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Standard</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "live" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => canUseLiveMode && setViewMode("live")}
                    className="rounded-none gap-1.5"
                    disabled={!canUseLiveMode}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">Live</span>
                    {canUseLiveMode && remainingTime && (
                      <span className="flex items-center gap-1 text-[10px] bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded-full ml-1">
                        <Clock className="h-2.5 w-2.5" />
                        {remainingTime}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                {!canUseLiveMode && (
                  <TooltipContent>
                    <p>No session in progress for this class</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading classes...
            </CardContent>
          </Card>
        ) : activeClasses && activeClasses.length > 0 ? (
          <div className="space-y-6">
            {displayClassId && viewMode === "standard" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      {activeClasses.find((c: any) => c.id === displayClassId)?.name}
                    </CardTitle>
                    <ManualPointsDialog classId={displayClassId} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ClassLeaderboardShared classId={displayClassId} canManagePoints />
                </CardContent>
              </Card>
            )}

            {displayClassId && viewMode === "live" && activeSessionForClass && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Live Assessment — {activeClasses.find((c: any) => c.id === displayClassId)?.name}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap a student to quickly award skills. Absent students are grayed out.
                  </p>
                </CardHeader>
                <CardContent>
                  <LiveAssessmentGrid 
                    classId={displayClassId} 
                    sessionId={activeSessionForClass.id}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No classes found. You will see leaderboards here once you are assigned to teach classes.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}