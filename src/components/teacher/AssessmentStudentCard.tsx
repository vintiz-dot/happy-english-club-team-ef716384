import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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

  const PointIcon =
    todayPoints > 0 ? TrendingUp : todayPoints < 0 ? TrendingDown : Minus;

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
