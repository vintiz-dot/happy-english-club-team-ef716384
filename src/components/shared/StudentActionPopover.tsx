/**
 * StudentActionPopover — the live-teaching command center.
 *
 * Opens on any student element mid-class: an identity band with the
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

/** DESIGN_SYSTEM s.10: the one focus ring. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

/** The three attendance buttons: a state panel colour, an icon and the word (s.14). */
const ATTENDANCE_BUTTON = cn(
  "flex min-h-hec-target items-center justify-center gap-1 rounded-hec-md border px-2 text-hec-small font-medium",
  "transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken disabled:opacity-50",
  FOCUS,
);

const SECTION_LABEL = "text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft";

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
    const base = "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-hec-caption font-medium";
    if (s === "present")
      return <span className={`${base} border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf`}><CheckCircle2 className="h-3 w-3" aria-hidden />Present</span>;
    if (s === "late")
      return <span className={`${base} border-hec-warn/30 bg-hec-warn-tint text-hec-warn`}><Clock className="h-3 w-3" aria-hidden />Late</span>;
    if (s === "absent")
      return <span className={`${base} border-hec-danger/30 bg-hec-danger-tint text-hec-danger`}><XCircle className="h-3 w-3" aria-hidden />Absent</span>;
    if (live?.sessionId)
      return <span className={`${base} border-hec-line bg-hec-raised text-hec-ink-soft`}>Unmarked</span>;
    return null;
  };

  const isBusy = awardPointsMutation.isPending || attendanceMutation.isPending || flagMutation.isPending;
  const initials = studentName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[21rem] p-0 overflow-x-hidden overflow-y-auto max-h-[var(--radix-popover-content-available-height)]" align="center" sideOffset={6}>
        {/* Identity band: who this is, today's numbers, attendance state */}
        <div className="border-b border-hec-line bg-hec-sunken px-4 py-3 text-hec-ink">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hec-line bg-hec-raised text-hec-small font-semibold text-hec-ink-soft"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{studentName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-hec-caption text-hec-ink-soft">
                {live && (
                  <>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Zap className="h-3.5 w-3.5 text-hec-brass" aria-hidden />
                      <span className="font-sans font-semibold tabular-nums text-hec-ink">{live.pointsToday}</span> today
                    </span>
                    <span className="whitespace-nowrap">
                      <span className="font-sans font-semibold tabular-nums text-hec-ink">{live.pointsMonth}</span> this month
                    </span>
                  </>
                )}
              </div>
            </div>
            {liveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-hec-ink-soft shrink-0" />
            ) : (
              attendanceChip()
            )}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {panel === "main" && (
            <motion.div key="main" {...panelMotion} className="p-3 space-y-3">
              {/* Attendance micro-actions */}
              {canManagePoints && live?.sessionId && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Present")}
                    className={cn(ATTENDANCE_BUTTON, "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf")}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />Present
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Late")}
                    className={cn(ATTENDANCE_BUTTON, "border-hec-warn/30 bg-hec-warn-tint text-hec-warn")}
                  >
                    <Clock className="h-4 w-4" aria-hidden />Late
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => attendanceMutation.mutate("Absent")}
                    className={cn(ATTENDANCE_BUTTON, "border-hec-danger/30 bg-hec-danger-tint text-hec-danger")}
                  >
                    <XCircle className="h-4 w-4" aria-hidden />Absent
                  </button>
                </div>
              )}

              {/* Action tiles */}
              {canManagePoints && (
                <div className="grid grid-cols-2 gap-2">
                  <ActionTile
                    icon={<Zap className="h-5 w-5" aria-hidden />}
                    label="Quick +5"
                    sub="Instant award"
                    tone="text-hec-brass"
                    disabled={isBusy}
                    onClick={() =>
                      awardPointsMutation.mutate({ skill: "participation", points: 5, notes: "Quick award +5" })
                    }
                  />
                  <ActionTile
                    icon={<Trophy className="h-5 w-5" aria-hidden />}
                    label="Skills"
                    sub="+1 per skill"
                    tone="text-hec-ink-soft"
                    disabled={isBusy}
                    onClick={() => setPanel("skills")}
                  />
                  <ActionTile
                    icon={<Flag className="h-5 w-5" aria-hidden />}
                    label="Flag error"
                    sub="Log + flashcard"
                    tone="text-hec-warn"
                    disabled={isBusy}
                    onClick={() => setPanel("flag")}
                  />
                  <ActionTile
                    icon={<History className="h-5 w-5" aria-hidden />}
                    label="History"
                    sub="Point timeline"
                    tone="text-hec-ink-soft"
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
                  <History className="h-4 w-4 text-hec-ink-soft" aria-hidden />
                  View History
                </Button>
              )}

              {/* Recent errors preview — instant teaching context */}
              {live && live.recentErrors.length > 0 && (
                <div className="rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-2 space-y-1">
                  <p className={cn(SECTION_LABEL, "flex items-center gap-1")}>
                    <AlertTriangle className="h-3.5 w-3.5 text-hec-warn" aria-hidden />
                    Recent errors
                  </p>
                  {live.recentErrors.map((e, i) => (
                    <p key={i} className="text-hec-small text-hec-ink-soft truncate" title={e.error_text}>
                      <span className="text-hec-warn font-medium">{e.error_type}:</span> {e.error_text}
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
                  <ChevronLeft className="h-4 w-4" aria-hidden />Back
                </Button>
                {awardPointsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-hec-ink-soft" />}
              </div>

              <div className="space-y-2">
                <p className={SECTION_LABEL}>Skills (+1)</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SKILL_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SkillTile
                        key={key}
                        icon={<Icon className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />}
                        label={config.label}
                        disabled={isBusy}
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className={SECTION_LABEL}>Behaviors (+1)</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(BEHAVIOR_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SkillTile
                        key={key}
                        icon={<Icon className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />}
                        label={config.label}
                        disabled={isBusy}
                        onClick={() => awardPointsMutation.mutate({ skill: key })}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className={SECTION_LABEL}>Corrections (-1)</p>
                <div className="grid grid-cols-1 gap-2">
                  {CORRECTION_CONFIG.subTags.slice(0, 3).map((tag) => (
                    <button
                      key={tag.value}
                      disabled={isBusy}
                      onClick={() => awardPointsMutation.mutate({ skill: "correction", subTag: tag.value })}
                      className={cn(
                        "flex min-h-hec-target items-center gap-2 rounded-hec-md border border-hec-danger bg-transparent px-3 text-left text-hec-small font-medium text-hec-danger",
                        "transition-colors duration-hec-1 ease-hec hover:bg-hec-danger-tint disabled:opacity-50",
                        FOCUS,
                      )}
                    >
                      <CORRECTION_CONFIG.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {panel === "flag" && (
            <motion.div key="flag" {...panelMotion} className="p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2 h-7" onClick={() => setPanel("main")}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />Back
                </Button>
                <p className="text-hec-small font-medium text-hec-ink-soft">Flag for review</p>
              </div>
              <Textarea
                placeholder={`What did ${studentName} say/write? e.g. "He go to school yesterday"`}
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
                className="min-h-[96px]"
              />
              <div className="flex flex-wrap gap-2">
                {["grammar", "vocabulary", "pronunciation", "spelling"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFlagType(t)}
                    aria-pressed={flagType === t}
                    className={cn(
                      "min-h-hec-target rounded-full border px-4 text-hec-small font-medium capitalize transition-colors duration-hec-1 ease-hec",
                      FOCUS,
                      flagType === t
                        ? "border-hec-action bg-hec-action text-hec-on-action"
                        : "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                className="w-full gap-2 h-auto whitespace-normal py-2"
                disabled={!flagText.trim() || flagMutation.isPending}
                onClick={() => flagMutation.mutate()}
              >
                {flagMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" aria-hidden />
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
        "flex min-h-hec-target items-start gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 py-2 text-left",
        "transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken disabled:opacity-50",
        FOCUS,
      )}
    >
      <span className={cn("mt-0.5 flex shrink-0 items-center justify-center", tone)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-hec-small font-medium text-hec-ink">{label}</span>
        <span className="block text-hec-caption text-hec-ink-soft">{sub}</span>
      </span>
    </button>
  );
}

function SkillTile({
  icon, label, onClick, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-hec-target items-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 text-left text-hec-small font-medium text-hec-ink",
        "transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken disabled:opacity-50",
        FOCUS,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
