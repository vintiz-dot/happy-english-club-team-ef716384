/**
 * StudentActionPopover — the live-teaching command center.
 *
 * Opens on any student element mid-class and shows live contextual data
 * (today's points, attendance status, recent flagged errors) with
 * zero-reload micro-actions:
 *   • attendance marking (Present / Late / Absent) via mark-attendance
 *   • Quick Award +5 points
 *   • the full skill/behavior grid (+1 each)
 *   • Flag for Review → student_error_log (+ auto SRS card for the student)
 */
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy,
  History,
  Loader2,
  Zap,
  Flag,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { awardPoints, getTodaySession } from "@/lib/pointsHelper";
import { SKILL_CONFIG, BEHAVIOR_CONFIG, CORRECTION_CONFIG } from "@/lib/skillConfig";
import { soundManager } from "@/lib/soundManager";

interface StudentActionPopoverProps {
  studentId: string;
  studentName: string;
  classId: string;
  children: React.ReactNode;
  onViewHistory: () => void;
  canManagePoints?: boolean;
}

type Panel = "main" | "skills" | "flag";

interface LiveContext {
  sessionId: string | null;
  attendanceStatus: string | null;
  pointsToday: number;
  pointsMonth: number;
  recentErrors: Array<{ error_text: string; error_type: string; created_at: string }>;
}

const panelMotion = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.15 },
};

export function StudentActionPopover({
  studentId,
  studentName,
  classId,
  children,
  onViewHistory,
  canManagePoints = false,
}: StudentActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [flagText, setFlagText] = useState("");
  const [flagType, setFlagType] = useState<string>("grammar");
  const queryClient = useQueryClient();

  // Live contextual data — fetched only while the popover is open.
  const { data: live, isLoading: liveLoading } = useQuery<LiveContext>({
    queryKey: ["student-live-context", studentId, classId],
    enabled: open,
    staleTime: 15_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const month = today.slice(0, 7);
      const sessionId = await getTodaySession(classId).catch(() => null);

      const [attendanceRes, pointsRes, errorsRes] = await Promise.all([
        sessionId
          ? supabase
              .from("attendance")
              .select("status")
              .eq("session_id", sessionId)
              .eq("student_id", studentId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("point_transactions")
          .select("points, date")
          .eq("student_id", studentId)
          .eq("month", month),
        (supabase as any)
          .from("student_error_log")
          .select("error_text, error_type, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const txns = pointsRes.data || [];
      return {
        sessionId,
        attendanceStatus: attendanceRes.data?.status ?? null,
        pointsToday: txns
          .filter((t: any) => t.date === today)
          .reduce((s: number, t: any) => s + (t.points || 0), 0),
        pointsMonth: txns.reduce((s: number, t: any) => s + (t.points || 0), 0),
        recentErrors: (errorsRes.data as any) || [],
      };
    },
  });

  const invalidateLive = () => {
    queryClient.invalidateQueries({ queryKey: ["student-live-context", studentId, classId] });
    queryClient.invalidateQueries({ queryKey: ["class-leaderboard", classId] });
    queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
    queryClient.invalidateQueries({ queryKey: ["student-points"] });
    queryClient.invalidateQueries({ queryKey: ["point-history"] });
    queryClient.invalidateQueries({ queryKey: ["live-assessment-students"] });
  };

  const awardPointsMutation = useMutation({
    mutationFn: async ({ skill, subTag, points, notes }: { skill: string; subTag?: string; points?: number; notes?: string }) => {
      const isCorrection = skill === "correction";
      const value = points ?? (isCorrection ? -1 : 1);
      await awardPoints({
        studentIds: [studentId],
        classId,
        skill,
        points: value,
        subTag,
        notes,
        sessionId: live?.sessionId || undefined,
      });
      return value;
    },
    onSuccess: (pointsValue) => {
      invalidateLive();
      soundManager.play(pointsValue > 0 ? "success" : "error");
      toast.success(
        `${pointsValue > 0 ? `+${pointsValue}` : pointsValue} point${Math.abs(pointsValue) === 1 ? "" : "s"} for ${studentName}`,
        { description: "Leaderboard updated" },
      );
      setPanel("main");
    },
    onError: (error: any) => {
      toast.error("Failed to add points", { description: error.message });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async (status: "Present" | "Late" | "Absent") => {
      if (!live?.sessionId) throw new Error("No session scheduled today for this class");
      const { data, error } = await supabase.functions.invoke("mark-attendance", {
        body: { sessionId: live.sessionId, studentId, status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return status;
    },
    onSuccess: (status) => {
      invalidateLive();
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      soundManager.play("success");
      toast.success(`${studentName} marked ${status}`);
    },
    onError: (error: any) => {
      toast.error("Attendance failed", { description: error.message });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: errRow, error } = await (supabase as any)
        .from("student_error_log")
        .insert({
          student_id: studentId,
          class_id: classId,
          source: "live_flag",
          error_text: flagText.trim(),
          error_type: flagType,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Feed the student's spaced-repetition deck (best effort).
      await (supabase as any).from("srs_cards").insert({
        student_id: studentId,
        source: "error",
        error_log_id: errRow.id,
        front: `Fix this:\n“${flagText.trim()}”`,
        back: "Ask your teacher for the correction, then edit this card.",
        hint: `Flagged in class (${flagType})`,
      });
    },
    onSuccess: () => {
      invalidateLive();
      toast.success(`Flagged for review`, {
        description: `Added to ${studentName}'s error log & flashcards`,
      });
      setFlagText("");
      setPanel("main");
    },
    onError: (error: any) => {
      toast.error("Failed to flag", { description: error.message });
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPanel("main");
      setFlagText("");
    }
  };

  const attendanceBadge = () => {
    const s = (live?.attendanceStatus || "").toLowerCase();
    if (s === "present")
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Present</Badge>;
    if (s === "late")
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"><Clock className="h-3 w-3" />Late</Badge>;
    if (s === "absent")
      return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1"><XCircle className="h-3 w-3" />Absent</Badge>;
    if (live?.sessionId)
      return <Badge variant="outline" className="text-muted-foreground">Unmarked</Badge>;
    return null;
  };

  const isBusy = awardPointsMutation.isPending || attendanceMutation.isPending || flagMutation.isPending;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="center" sideOffset={5}>
        {/* Live header */}
        <div className="px-3 pt-3 pb-2 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate">{studentName}</p>
            {liveLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
            ) : (
              attendanceBadge()
            )}
          </div>
          {live && (
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="font-semibold text-foreground">{live.pointsToday}</span> today
              </span>
              <span>
                <span className="font-semibold text-foreground">{live.pointsMonth}</span> this month
              </span>
              {live.recentErrors.length > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertTriangle className="h-3 w-3" />
                  {live.recentErrors.length} recent error{live.recentErrors.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {panel === "main" && (
            <motion.div key="main" {...panelMotion} className="p-2 space-y-1">
              {/* Attendance micro-actions */}
              {canManagePoints && live?.sessionId && (
                <div className="grid grid-cols-3 gap-1 pb-1.5 border-b mb-1">
                  <Button
                    variant="outline" size="sm" disabled={isBusy}
                    className="h-8 gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                    onClick={() => attendanceMutation.mutate("Present")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />Present
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={isBusy}
                    className="h-8 gap-1 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                    onClick={() => attendanceMutation.mutate("Late")}
                  >
                    <Clock className="h-3.5 w-3.5" />Late
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={isBusy}
                    className="h-8 gap-1 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                    onClick={() => attendanceMutation.mutate("Absent")}
                  >
                    <XCircle className="h-3.5 w-3.5" />Absent
                  </Button>
                </div>
              )}

              {canManagePoints && (
                <>
                  <Button
                    variant="ghost" disabled={isBusy}
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      awardPointsMutation.mutate({ skill: "participation", points: 5, notes: "Quick award +5" })
                    }
                  >
                    <Zap className="h-4 w-4 text-amber-500" />
                    Quick Award <span className="font-bold text-amber-600">+5</span>
                  </Button>
                  <Button
                    variant="ghost" disabled={isBusy}
                    className="w-full justify-start gap-2"
                    onClick={() => setPanel("skills")}
                  >
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Skills & Behaviors (+1)
                  </Button>
                  <Button
                    variant="ghost" disabled={isBusy}
                    className="w-full justify-start gap-2"
                    onClick={() => setPanel("flag")}
                  >
                    <Flag className="h-4 w-4 text-orange-500" />
                    Flag for Review
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setOpen(false);
                  onViewHistory();
                }}
              >
                <History className="h-4 w-4 text-muted-foreground" />
                View History
              </Button>

              {/* Recent errors preview — instant teaching context */}
              {live && live.recentErrors.length > 0 && (
                <div className="pt-1.5 mt-1 border-t space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-1">
                    Recent errors
                  </p>
                  {live.recentErrors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground px-1 truncate" title={e.error_text}>
                      <span className="text-orange-500 font-medium">{e.error_type}:</span> {e.error_text}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {panel === "skills" && (
            <motion.div key="skills" {...panelMotion} className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setPanel("main")}>
                  <ChevronLeft className="h-4 w-4" />Back
                </Button>
                {awardPointsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Skills (+1)</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(SKILL_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key} variant="outline" size="sm" disabled={isBusy}
                        className="justify-start gap-2 h-9"
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Behaviors (+1)</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(BEHAVIOR_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={key} variant="outline" size="sm" disabled={isBusy}
                        className="justify-start gap-2 h-9"
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Corrections (-1)</p>
                <div className="grid grid-cols-1 gap-1">
                  {CORRECTION_CONFIG.subTags.slice(0, 3).map((tag) => (
                    <Button
                      key={tag.value} variant="outline" size="sm" disabled={isBusy}
                      className="justify-start gap-2 h-8 text-destructive hover:text-destructive"
                      onClick={() => awardPointsMutation.mutate({ skill: "correction", subTag: tag.value })}
                    >
                      <CORRECTION_CONFIG.icon className="h-3 w-3" />
                      {tag.label}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {panel === "flag" && (
            <motion.div key="flag" {...panelMotion} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setPanel("main")}>
                  <ChevronLeft className="h-4 w-4" />Back
                </Button>
                <p className="text-xs font-medium text-muted-foreground">Flag for review</p>
              </div>
              <Textarea
                placeholder={`What did ${studentName} say/write? e.g. "He go to school yesterday"`}
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
                className="min-h-[64px] text-sm"
              />
              <div className="flex flex-wrap gap-1">
                {["grammar", "vocabulary", "pronunciation", "spelling"].map((t) => (
                  <Button
                    key={t}
                    variant={flagType === t ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    onClick={() => setFlagType(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full gap-2"
                disabled={!flagText.trim() || flagMutation.isPending}
                onClick={() => flagMutation.mutate()}
              >
                {flagMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                Log error & create flashcard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
