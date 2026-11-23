import { memo, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Tick } from "@/components/fx/Tick";
import { dur, ease, useMotionLevel } from "@/components/fx/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";
import { PointFeedbackAnimation } from "./PointFeedbackAnimation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AttendanceStatus = "Present" | "Absent" | "Excused" | null;

export interface FeedbackItem {
  id: string;
  points: number;
  icon: LucideIcon;
  color: string;
  count?: number;
  studentId: string;
  /** where the teacher tapped (set by the grid); a token with one takes dur.page to land */
  origin?: { x: number; y: number } | null;
}

interface AssessmentStudentCardProps {
  studentId: string;
  fullName: string;
  avatarUrl: string | null;
  todayPoints: number;
  attendanceStatus: AttendanceStatus;
  bulkMode: boolean;
  isSelected: boolean;
  feedbacks: FeedbackItem[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onFeedbackComplete: (studentId: string, feedbackId: string) => void;
}

function isUnavailable(status: AttendanceStatus) {
  return status === "Absent" || status === "Excused";
}

/* Deterministic gradient palette per student so each card feels unique */
const AVATAR_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-sky-600",
  "from-indigo-500 to-indigo-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-emerald-600",
];

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_GRADIENTS.length;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AssessmentStudentCardImpl({
  studentId,
  fullName,
  avatarUrl,
  todayPoints,
  attendanceStatus,
  bulkMode,
  isSelected,
  feedbacks,
  onSelect,
  onToggle,
  onFeedbackComplete,
}: AssessmentStudentCardProps) {
  const unavailable = isUnavailable(attendanceStatus);
  const gradientClass = AVATAR_GRADIENTS[hashIndex(studentId)];
  const ivory = useIvory();

  // The avatar's one press-pulse when a positive token lands (full motion only), then it is still again.
  const level = useMotionLevel();
  const pulse = useAnimationControls();
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const timers: number[] = [];
    for (const f of feedbacks) {
      if (seen.current.has(f.id)) continue;
      seen.current.add(f.id);
      if (f.points > 0 && level === "full") {
        timers.push(window.setTimeout(() => pulse.start({ scale: [1, 1.08, 1], transition: { duration: dur.reveal, ease } }), f.origin ? dur.page * 1000 : 0));
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [feedbacks, level, pulse]);

  const PointIcon =
    todayPoints > 0 ? TrendingUp : todayPoints < 0 ? TrendingDown : Minus;

  if (ivory) {
    // Ivory: a plain surface card, the whole name (it wraps), the state in words.
    const ivoryCard = (
      <div
        data-student-card={studentId}
        className={cn(
          "relative flex h-full min-h-hec-target flex-col items-center gap-2 rounded-hec-lg border bg-hec-surface p-4 text-hec-ink shadow-hec-1",
          "touch-manipulation select-none transition-shadow duration-hec-1 ease-hec",
          unavailable
            ? "cursor-not-allowed border-hec-line bg-hec-sunken text-hec-ink-faint"
            : "cursor-pointer border-hec-line hover:shadow-hec-2",
          bulkMode && isSelected && !unavailable && "border-hec-brass bg-hec-sunken"
        )}
        onClick={(e) => {
          if (unavailable) return;
          if (bulkMode) {
            e.preventDefault();
            onToggle(studentId);
          }
        }}
      >
        {bulkMode && !unavailable && (
          <div className="absolute left-2 top-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(studentId)}
              aria-label={`Select ${fullName}`}
            />
          </div>
        )}

        {unavailable && (
          <div className="absolute right-2 top-2 z-10">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-hec-caption font-medium",
                attendanceStatus === "Absent"
                  ? "border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
                  : "border-hec-line bg-hec-sunken text-hec-ink-soft"
              )}
            >
              {attendanceStatus}
            </span>
          </div>
        )}

        <div className="relative">
          <motion.div animate={pulse}>
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-hec-sunken text-hec-body font-semibold text-hec-ink-soft">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          {attendanceStatus === "Present" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-hec-surface bg-hec-leaf" />
          )}
        </div>

        <span className="w-full whitespace-normal break-words hyphens-none text-balance text-center text-hec-small font-semibold">
          {fullName}
        </span>

        <div
          className={cn(
            "mt-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-hec-caption font-semibold tabular-nums",
            todayPoints > 0
              ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf"
              : todayPoints < 0
                ? "border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
                : "border-hec-line bg-hec-sunken text-hec-ink-soft"
          )}
        >
          <PointIcon className="h-3.5 w-3.5" />
          <Tick value={todayPoints} format={(n) => `${Math.round(n) > 0 ? "+" : ""}${Math.round(n)}`} />
          <span className="font-medium">today</span>
        </div>

        <PointFeedbackAnimation
          feedbacks={feedbacks}
          onComplete={(id) => onFeedbackComplete(studentId, id)}
        />
      </div>
    );

    if (unavailable) return <div className="h-full">{ivoryCard}</div>;

    return (
      <div
        className="h-full"
        onClick={() => {
          if (!bulkMode) onSelect(studentId);
        }}
      >
        {ivoryCard}
      </div>
    );
  }

  const card = (
    <div
      data-student-card={studentId}
      className={cn(
        /* ── Layout ── */
        "relative flex flex-col items-center gap-2 p-4 pb-3.5 rounded-2xl",
        "touch-manipulation select-none",
        /* ── Glass card surface ── */
        "bg-gradient-to-b from-card/80 to-card/60",
        "backdrop-blur-sm",
        "border border-white/[0.12] dark:border-white/[0.08]",
        "shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]",
        /* ── Transitions ── */
        "transition-all duration-300 ease-out",
        /* ── Interactive states ── */
        unavailable
          ? "opacity-40 grayscale cursor-not-allowed"
          : [
              "cursor-pointer",
              "hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)]",
              "hover:border-primary/20",
              "active:scale-[0.97] active:shadow-sm",
            ],
        /* ── Selection ring ── */
        bulkMode &&
          isSelected &&
          !unavailable &&
          "ring-2 ring-primary/80 ring-offset-2 ring-offset-background bg-primary/[0.06] border-primary/30"
      )}
      onClick={(e) => {
        if (unavailable) return;
        if (bulkMode) {
          e.preventDefault();
          onToggle(studentId);
        }
      }}
    >
      {/* ── Subtle top-edge shine ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-2xl" />

      {/* ── Bulk checkbox ── */}
      {bulkMode && !unavailable && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(studentId)}
            className="h-[18px] w-[18px] rounded-md border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
          />
        </div>
      )}

      {/* ── Absence badge ── */}
      {unavailable && (
        <div className="absolute top-2 right-2 z-10">
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
              attendanceStatus === "Absent"
                ? "bg-destructive/15 text-destructive border border-destructive/20"
                : "bg-muted/80 text-muted-foreground border border-border/50"
            )}
          >
            {attendanceStatus}
          </span>
        </div>
      )}

      {/* ── Avatar with gradient ring ── */}
      <div className="relative group/avatar">
        {/* Gradient ring behind avatar */}
        <div
          className={cn(
            "absolute -inset-[3px] rounded-full bg-gradient-to-br opacity-60 blur-[1px]",
            "transition-opacity duration-300",
            unavailable ? "opacity-20" : "group-hover/avatar:opacity-100",
            gradientClass
          )}
        />
        <Avatar className="relative h-14 w-14 ring-2 ring-card shadow-lg">
          <AvatarImage
            src={avatarUrl || undefined}
            className="object-cover"
          />
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-white font-bold text-base tracking-tight",
              gradientClass
            )}
          >
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Active "present" dot */}
        {attendanceStatus === "Present" && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm shadow-emerald-500/30" />
        )}
      </div>

      {/* ── Name ── */}
      <span className="text-[13px] font-semibold text-center leading-tight line-clamp-1 w-full px-1 text-foreground/90">
        {fullName}
      </span>

      {/* ── Points badge ── */}
      <div
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums",
          "transition-colors duration-200",
          todayPoints > 0
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : todayPoints < 0
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-muted/60 text-muted-foreground"
        )}
      >
        <PointIcon className="h-3 w-3" />
        <span>
          {todayPoints > 0 ? "+" : ""}
          {todayPoints}
        </span>
        <span className="text-[9px] font-medium opacity-60 ml-0.5">today</span>
      </div>

      <PointFeedbackAnimation
        feedbacks={feedbacks}
        onComplete={(id) => onFeedbackComplete(studentId, id)}
      />
    </div>
  );

  if (unavailable) return <div>{card}</div>;

  return (
    <div
      onClick={() => {
        if (!bulkMode) onSelect(studentId);
      }}
    >
      {card}
    </div>
  );
}

export const AssessmentStudentCard = memo(AssessmentStudentCardImpl, (prev, next) => {
  return (
    prev.studentId === next.studentId &&
    prev.fullName === next.fullName &&
    prev.avatarUrl === next.avatarUrl &&
    prev.todayPoints === next.todayPoints &&
    prev.attendanceStatus === next.attendanceStatus &&
    prev.bulkMode === next.bulkMode &&
    prev.isSelected === next.isSelected &&
    prev.feedbacks === next.feedbacks
  );
});
