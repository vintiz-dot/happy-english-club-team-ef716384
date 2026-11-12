import { motion } from "framer-motion";
import { Clock, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { dayjs } from "@/lib/date";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface QuestCardProps {
  id: string;
  title: string;
  className: string;
  dueDate?: string;
  progress?: number;
  xpReward?: number;
  type: "homework" | "session" | "challenge";
  status: "pending" | "in_progress" | "completed" | "overdue";
  onClick?: () => void;
}

const typeConfig = {
  homework: { icon: "📚", label: "Homework", color: "accent" },
  session: { icon: "🎓", label: "Class", color: "primary" },
  challenge: { icon: "🎯", label: "Challenge", color: "warning" },
};

const statusConfig = {
  pending: { badge: "Pending", variant: "secondary" as const },
  in_progress: { badge: "In Progress", variant: "default" as const },
  completed: { badge: "Done!", variant: "default" as const },
  overdue: { badge: "Overdue", variant: "destructive" as const },
};

function useCountdown(dueDate?: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!dueDate) return;

    const update = () => {
      const due = dayjs(dueDate + "T23:59:59");
      const now = dayjs();
      const diff = due.diff(now);

      if (diff <= 0) {
        setTimeLeft("");
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 24) {
        setIsUrgent(true);
        setTimeLeft(hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`);
      } else {
        setIsUrgent(false);
        setTimeLeft("");
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [dueDate]);

  return { timeLeft, isCountdownUrgent: isUrgent };
}

export function QuestCard({
  id,
  title,
  className,
  dueDate,
  progress = 0,
  xpReward = 20,
  type,
  status,
  onClick
}: QuestCardProps) {
  const { icon, label, color } = typeConfig[type];
  const { badge, variant } = statusConfig[status];
  const { timeLeft, isCountdownUrgent } = useCountdown(status !== "completed" && status !== "overdue" ? dueDate : undefined);
  
  const isOverdue = status === "overdue";
  const isCompleted = status === "completed";
  const daysUntilDue = dueDate ? dayjs(dueDate).diff(dayjs(), 'day') : null;
  const isUrgent = isCountdownUrgent || (daysUntilDue !== null && daysUntilDue <= 1 && !isCompleted);

  return (
    <motion.div
      className={`relative cursor-pointer overflow-hidden rounded-hec-lg border shadow-hec-1 transition-colors duration-hec-1 ease-hec ${
        isCompleted
          ? 'border-hec-leaf/30 bg-hec-leaf-tint'
          : isOverdue
            ? 'border-hec-danger/30 bg-hec-danger-tint'
            : 'border-hec-line bg-hec-surface hover:bg-hec-sunken'
      }`}
      onClick={onClick}
    >
      <div className="relative flex items-center gap-4 p-4">
        {/* Quest Icon */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-hec-md border text-hec-h2 ${
            isCompleted
              ? 'border-hec-leaf/30 bg-hec-leaf-tint'
              : isOverdue
                ? 'border-hec-danger/30 bg-hec-danger-tint'
                : 'border-hec-line bg-hec-sunken'
          }`}
          aria-hidden
        >
          {isCompleted ? '✅' : icon}
        </div>

        {/* Quest Content */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className={`truncate text-hec-body font-medium ${isCompleted ? 'text-hec-ink-soft line-through' : 'text-hec-ink'}`}>
              {title}
            </h4>
            {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-hec-leaf" aria-hidden />}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-hec-small text-hec-ink-soft">
            <span className="rounded-full border border-hec-line bg-hec-sunken px-3 py-0.5 text-hec-caption font-medium text-hec-ink-soft">
              {className}
            </span>
            {dueDate && (
              <div className={`flex items-center gap-1 ${isUrgent ? 'font-medium text-hec-warn' : ''}`}>
                {isUrgent && <AlertCircle className="h-4 w-4" aria-hidden />}
                <Clock className="h-4 w-4" aria-hidden />
                <span>
                  {dayjs(dueDate).format("MMM D")}
                  {isUrgent && daysUntilDue === 0 && ' (Today!)'}
                  {isUrgent && daysUntilDue === 1 && ' (Tomorrow)'}
                </span>
              </div>
            )}
          </div>

          {/* Live countdown timer */}
          {timeLeft && !isCompleted && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-full border border-hec-warn/30 bg-hec-warn-tint px-3 py-0.5 text-hec-caption font-medium text-hec-warn">
                <Clock className="h-4 w-4" aria-hidden />
                ⏰ {timeLeft}
              </div>
            </div>
          )}

          {/* Progress bar for in-progress quests */}
          {status === "in_progress" && progress > 0 && (
            <div className="pt-1">
              <Progress value={progress} className="h-2" />
              <p className="mt-0.5 text-hec-caption text-hec-ink-soft">{progress}% complete</p>
            </div>
          )}
        </div>

        {/* Right side: XP + Status */}
        <div className="flex flex-col items-end gap-2">
          <Badge variant={variant} className="text-hec-caption">
            {badge}
          </Badge>
          <div className={`flex items-center gap-1 text-hec-caption font-medium tabular-nums ${isCompleted ? 'text-hec-leaf' : 'text-hec-brass'}`}>
            <span>+{xpReward}</span>
            <span>XP</span>
          </div>
        </div>

        {/* Arrow indicator */}
        {!isCompleted && <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />}
      </div>
    </motion.div>
  );
}
