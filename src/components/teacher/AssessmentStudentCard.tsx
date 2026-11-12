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

  const PointIcon =
    todayPoints > 0 ? TrendingUp : todayPoints < 0 ? TrendingDown : Minus;

  const card = (
    <div
      data-student-card={studentId}
      className={cn(
        /* ── Layout ── */
        "relative flex h-full flex-col items-center gap-2 p-4 rounded-hec-lg",
        "touch-manipulation select-none",
        /* ── Card surface (DESIGN_SYSTEM s.15) ── */
        "border border-hec-line",
        /* ── Transitions ── */
        "transition-shadow duration-hec-1 ease-hec",
        /* ── Interactive states ── */
        unavailable
          ? "bg-hec-sunken cursor-not-allowed"
          : [
              "bg-hec-surface shadow-hec-1",
              "cursor-pointer",
              "hover:shadow-hec-2",
            ],
        /* ── Selection (with the ticked checkbox) ── */
        bulkMode &&
          isSelected &&
          !unavailable &&
          "border-hec-brass bg-hec-sunken"
      )}
      onClick={(e) => {
        if (unavailable) return;
        if (bulkMode) {
          e.preventDefault();
          onToggle(studentId);
        }
      }}
    >
      {/* ── Bulk checkbox ── */}
      {bulkMode && !unavailable && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(studentId)}
            aria-label={`Select ${fullName}`}
          />
        </div>
      )}

      {/* ── Avatar ── */}
      <div className={cn("relative", unavailable && "mb-2")}>
        <Avatar className={cn("relative h-14 w-14 border border-hec-line", unavailable && "grayscale")}>
          <AvatarImage
            src={avatarUrl || undefined}
            className="object-cover"
          />
          <AvatarFallback className="bg-hec-sunken text-hec-ink-soft font-semibold text-hec-body">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Active "present" dot */}
        {attendanceStatus === "Present" && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-hec-leaf border-2 border-hec-surface" />
        )}

        {/* ── Absence badge (the word, on the avatar's lower edge) ── */}
        {unavailable && (
          <span
            className={cn(
              "absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 text-hec-caption font-medium",
              attendanceStatus === "Absent"
                ? "border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
                : "border-hec-line bg-hec-raised text-hec-ink-soft"
            )}
          >
            {attendanceStatus}
          </span>
        )}
      </div>

      {/* ── Name: never cut (DESIGN_SYSTEM s.13) ── */}
      <span
        className={cn(
          "w-full whitespace-normal break-words hyphens-none text-balance text-center text-hec-small font-medium",
          unavailable ? "text-hec-ink-soft" : "text-hec-ink"
        )}
      >
        {fullName}
      </span>

      {/* ── Points badge ── */}
      <div
        className={cn(
          "mt-auto flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 font-sans text-hec-caption font-semibold tabular-nums",
          todayPoints > 0
            ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf"
            : todayPoints < 0
              ? "border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
              : "border-hec-line bg-hec-sunken text-hec-ink-soft"
        )}
      >
        <PointIcon className="h-3 w-3" aria-hidden />
        <span>
          {todayPoints > 0 ? "+" : ""}
          {todayPoints}
        </span>
        <span className="font-normal">today</span>
      </div>

      <PointFeedbackAnimation
        feedbacks={feedbacks}
        onComplete={(id) => onFeedbackComplete(studentId, id)}
      />
    </div>
  );

  if (unavailable) return <div className="h-full">{card}</div>;

  return (
    <div
      className="h-full"
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
