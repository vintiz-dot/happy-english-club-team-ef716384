import { Flame, Snowflake } from "lucide-react";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import { BADGE_SUCCESS, CARD, CARD_TITLE } from "@/components/student/nova/ivory";

interface DailyStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  weekActivity: boolean[]; // 7 days, true = active
  streakFreezeAvailable?: boolean;
}

const streakMessages = [
  { min: 0, max: 0, message: "Start your streak today! 🚀", color: "muted" },
  { min: 1, max: 2, message: "Great start! Keep going! 💪", color: "warning" },
  { min: 3, max: 6, message: "You're on fire! 🔥", color: "warning" },
  { min: 7, max: 13, message: "One week strong! Amazing! 🌟", color: "primary" },
  { min: 14, max: 29, message: "Two weeks! You're unstoppable! 🚀", color: "primary" },
  { min: 30, max: Infinity, message: "LEGENDARY! A whole month! 👑", color: "accent" },
];

export function DailyStreakCard({
  currentStreak,
  longestStreak,
  weekActivity,
  streakFreezeAvailable = false
}: DailyStreakCardProps) {
  const streakInfo = streakMessages.find(s => currentStreak >= s.min && currentStreak <= s.max) || streakMessages[0];

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = dayjs().day(); // 0 = Sunday, 1 = Monday
  const mondayOffset = today === 0 ? 6 : today - 1; // Convert to Monday = 0

  return (
    <section className={cn(CARD, "h-full min-w-0")}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hec-sunken">
              <Flame className="h-5 w-5 text-hec-ink-soft" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className={CARD_TITLE}>Daily Streak</h2>
              <p className="text-hec-small text-hec-ink-soft">{streakInfo.message}</p>
            </div>
          </div>

          {streakFreezeAvailable && (
            <span className="shrink-0 rounded-full bg-hec-sunken p-2" title="Streak freeze available">
              <Snowflake className="h-5 w-5 text-hec-ink-soft" aria-hidden />
            </span>
          )}
        </div>

        {/* Streak Number */}
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-5xl font-semibold tabular-nums leading-tight text-hec-ink">
            {currentStreak}
          </span>
          <span className="text-hec-body text-hec-ink-soft">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Week Calendar: an active day is leaf with a flame, today has the brass line under its letter */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const isToday = index === mondayOffset;
            const isActive = weekActivity[index];

            return (
              <div
                key={index}
                className="flex min-w-0 flex-col items-center gap-1 py-1"
              >
                <span
                  className={cn(
                    "border-b-2 pb-0.5 text-hec-caption",
                    isToday ? "border-hec-brass font-semibold text-hec-ink" : "border-transparent text-hec-ink-soft",
                  )}
                >
                  {day}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isActive ? "border border-hec-leaf/30 bg-hec-leaf-tint" : "bg-hec-sunken",
                  )}
                >
                  {isActive ? (
                    <span className="text-sm">🔥</span>
                  ) : (
                    <span className="text-hec-caption text-hec-ink-faint">•</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Best Streak */}
        <div className="flex items-center justify-between gap-3 border-t border-hec-line pt-3">
          <span className="text-hec-small text-hec-ink-soft">Best streak</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums text-hec-ink">{longestStreak}</span>
            <span className="text-hec-small text-hec-ink-soft">days</span>
            {currentStreak >= longestStreak && currentStreak > 0 && (
              <span className={BADGE_SUCCESS}>NEW!</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
