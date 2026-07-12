/**
 * StudentActionPopover — the live-teaching command center.
 *
 * Opens on any student element mid-class: an aurora identity band with the
 * student's live stats, followed by zero-reload micro-actions —
 * attendance (Present / Late / Absent), Quick Award +5, the full
 * skill/behavior grid, and Flag-for-Review (error log + auto flashcard).
 */
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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

/** Tone gradients for the skill/behavior tiles, keyed by skill id. */
const SKILL_TONES: Record<string, string> = {
  speaking: "from-blue-500/15 to-sky-500/5 hover:ring-blue-500/40 text-blue-600 dark:text-blue-300",
  listening: "from-violet-500/15 to-purple-500/5 hover:ring-violet-500/40 text-violet-600 dark:text-violet-300",
  reading: "from-emerald-500/15 to-teal-500/5 hover:ring-emerald-500/40 text-emerald-600 dark:text-emerald-300",
  writing: "from-amber-500/15 to-orange-500/5 hover:ring-amber-500/40 text-amber-600 dark:text-amber-300",
  focus: "from-cyan-500/15 to-sky-500/5 hover:ring-cyan-500/40 text-cyan-600 dark:text-cyan-300",
  teamwork: "from-pink-500/15 to-rose-500/5 hover:ring-pink-500/40 text-pink-600 dark:text-pink-300",
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

  const attendanceChip = () => {
    const s = (live?.attendanceStatus || "").toLowerCase();
    const base = "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm";
    if (s === "present")
      return <span className={`${base} bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/40`}><CheckCircle2 className="h-3 w-3" />Present</span>;
    if (s === "late")
      return <span className={`${base} bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/40`}><Clock className="h-3 w-3" />Late</span>;
    if (s === "absent")
      return <span className={`${base} bg-rose-400/25 text-rose-100 ring-1 ring-rose-300/40`}><XCircle className="h-3 w-3" />Absent</span>;
    if (live?.sessionId)
      return <span className={`${base} bg-white/15 text-white/80 ring-1 ring-white/25`}>Unmarked</span>;
    return null;
  };

  const isBusy = awardPointsMutation.isPending || attendanceMutation.isPending || flagMutation.isPending;
  const initials = studentName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[21rem] p-0 overflow-hidden" align="center" sideOffset={6}>
        {/* Aurora identity band */}
        <div className="relative overflow-hidden bg-aurora hero-sheen px-3.5 pt-3 pb-2.5 text-white">
          <div className="nova-grid-light absolute inset-0 pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-sm font-black ring-1 ring-white/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold drop-shadow-sm">{studentName}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/80">
                {live && (
                  <>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-300" />
                      <span className="font-bold text-white">{live.pointsToday}</span> today
                    </span>
                    <span>
                      <span className="font-bold text-white">{live.pointsMonth}</span> this month
                    </span>
                  </>
                )}
              </div>
            </div>
            {liveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/80 shrink-0" />
            ) : (
              attendanceChip()
            )}
          </div>
          <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {panel === "main" && (
            <motion.div key="main" {...panelMotion} className="p-2.5 space-y-2">
              {/* Attendance micro-actions */}
              {canManagePoints && live?.sessionId && (
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Present")}
                    className="flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.6)] transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />Present
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Late")}
                    className="flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_4px_12px_-4px_rgba(245,158,11,0.6)] transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-50"
                  >
                    <Clock className="h-3.5 w-3.5" />Late
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Absent")}
                    className="flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_4px_12px_-4px_rgba(244,63,94,0.6)] transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />Absent
                  </button>
                </div>
              )}

              {/* Action tiles */}
              {canManagePoints && (
                <div className="grid grid-cols-2 gap-1.5">
                  <ActionTile
                    icon={<Zap className="h-4 w-4" />}
                    label="Quick +5"
                    sub="Instant award"
                    tone="from-amber-500/15 to-yellow-500/5 text-amber-600 dark:text-amber-300 hover:ring-amber-500/40"
                    disabled={isBusy}
                    onClick={() =>
                      awardPointsMutation.mutate({ skill: "participation", points: 5, notes: "Quick award +5" })
                    }
                  />
                  <ActionTile
                    icon={<Trophy className="h-4 w-4" />}
                    label="Skills"
                    sub="+1 per skill"
                    tone="from-blue-500/15 to-sky-500/5 text-blue-600 dark:text-blue-300 hover:ring-blue-500/40"
                    disabled={isBusy}
                    onClick={() => setPanel("skills")}
                  />
                  <ActionTile
                    icon={<Flag className="h-4 w-4" />}
                    label="Flag error"
                    sub="Log + flashcard"
                    tone="from-orange-500/15 to-rose-500/5 text-orange-600 dark:text-orange-300 hover:ring-orange-500/40"
                    disabled={isBusy}
                    onClick={() => setPanel("flag")}
                  />
                  <ActionTile
                    icon={<History className="h-4 w-4" />}
                    label="History"
                    sub="Point timeline"
                    tone="from-slate-500/15 to-slate-400/5 text-slate-600 dark:text-slate-300 hover:ring-slate-500/40"
                    onClick={() => {
                      setOpen(false);
                      onViewHistory();
                    }}
                  />
                </div>
              )}
              {!canManagePoints && (
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
              )}

              {/* Recent errors preview — instant teaching context */}
              {live && live.recentErrors.length > 0 && (
                <div className="rounded-xl bg-muted/40 px-2.5 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    Recent errors
                  </p>
                  {live.recentErrors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate" title={e.error_text}>
                      <span className="text-orange-500 font-semibold">{e.error_type}:</span> {e.error_text}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {panel === "skills" && (
            <motion.div key="skills" {...panelMotion} className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2 h-7" onClick={() => setPanel("main")}>
                  <ChevronLeft className="h-4 w-4" />Back
                </Button>
                {awardPointsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Skills (+1)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(SKILL_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SkillTile
                        key={key}
                        icon={<Icon className="h-4 w-4" />}
                        label={config.label}
                        tone={SKILL_TONES[key] ?? SKILL_TONES.speaking}
                        disabled={isBusy}
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Behaviors (+1)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(BEHAVIOR_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SkillTile
                        key={key}
                        icon={<Icon className="h-4 w-4" />}
                        label={config.label}
                        tone={SKILL_TONES[key] ?? SKILL_TONES.focus}
                        disabled={isBusy}
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Corrections (-1)</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {CORRECTION_CONFIG.subTags.slice(0, 3).map((tag) => (
                    <button
                      key={tag.value}
                      disabled={isBusy}
                      onClick={() => awardPointsMutation.mutate({ skill: "correction", subTag: tag.value })}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-red-500/5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300 ring-1 ring-transparent hover:ring-rose-500/40 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      <CORRECTION_CONFIG.icon className="h-3.5 w-3.5" />
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {panel === "flag" && (
            <motion.div key="flag" {...panelMotion} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2 h-7" onClick={() => setPanel("main")}>
                  <ChevronLeft className="h-4 w-4" />Back
                </Button>
                <p className="text-xs font-medium text-muted-foreground">Flag for review</p>
              </div>
              <Textarea
                placeholder={`What did ${studentName} say/write? e.g. "He go to school yesterday"`}
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
                className="min-h-[64px] text-sm rounded-xl"
              />
              <div className="flex flex-wrap gap-1">
                {["grammar", "vocabulary", "pronunciation", "spelling"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFlagType(t)}
                    className={cn(
                      "h-7 rounded-full px-3 text-xs font-semibold capitalize transition-all",
                      flagType === t
                        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6)]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                className="w-full gap-2 rounded-xl text-white bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-[0_6px_18px_-6px_rgba(249,115,22,0.6)]"
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

function ActionTile({
  icon, label, sub, tone, onClick, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl bg-gradient-to-br px-3 py-2.5 text-left ring-1 ring-transparent",
        "transition-all duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-50",
        tone,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-white/10 shadow-q1">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight text-foreground">{label}</span>
        <span className="block text-[10px] text-muted-foreground leading-tight">{sub}</span>
      </span>
    </button>
  );
}

function SkillTile({
  icon, label, tone, onClick, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl bg-gradient-to-br px-3 py-2 text-xs font-semibold ring-1 ring-transparent",
        "transition-all duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-50",
        tone,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
