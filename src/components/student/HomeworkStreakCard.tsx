import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Zap, Trophy } from "lucide-react";

interface HomeworkStreakCardProps {
  studentId: string;
  assignments: any[];
}

function calculateStreak(assignments: any[]): { current: number; best: number; total: number } {
  // Sort by due_date descending, only consider assignments with due dates
  const withDue = assignments
    .filter((a) => a.due_date)
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  let current = 0;
  let best = 0;
  let total = 0;
  let streakBroken = false;

  for (const a of withDue) {
    const sub = a.submission;
    if (!sub?.submitted_at) {
      // Not submitted — check if past due
      const isPast = new Date(a.due_date) < new Date();
      if (isPast) {
        streakBroken = true;
      }
      continue;
    }

    const submittedAt = new Date(sub.submitted_at);
    const dueAt = new Date(a.due_date + "T23:59:59");
    const onTime = submittedAt <= dueAt;

    if (onTime) {
      total++;
      if (!streakBroken) {
        current++;
      }
    } else {
      streakBroken = true;
    }
  }

  // Calculate best streak
  let tempStreak = 0;
  for (const a of [...withDue].reverse()) {
    const sub = a.submission;
    if (!sub?.submitted_at) {
      const isPast = new Date(a.due_date) < new Date();
      if (isPast) {
        best = Math.max(best, tempStreak);
        tempStreak = 0;
      }
      continue;
    }
    const submittedAt = new Date(sub.submitted_at);
    const dueAt = new Date(a.due_date + "T23:59:59");
    if (submittedAt <= dueAt) {
      tempStreak++;
    } else {
      best = Math.max(best, tempStreak);
      tempStreak = 0;
    }
  }
  best = Math.max(best, tempStreak, current);

  return { current, best, total };
}

function getStreakXPBonus(streak: number): number {
  if (streak >= 10) return 15;
  if (streak >= 7) return 10;
  if (streak >= 5) return 7;
  if (streak >= 3) return 5;
  return 0;
}

function getStreakEmoji(streak: number): string {
  if (streak >= 10) return "🏆";
  if (streak >= 7) return "💎";
  if (streak >= 5) return "🔥";
  if (streak >= 3) return "⚡";
  if (streak >= 1) return "✨";
  return "💤";
}

function getStreakMessage(streak: number): string {
  if (streak >= 10) return "Legendary streak! You're unstoppable!";
  if (streak >= 7) return "Diamond streak! Keep crushing it!";
  if (streak >= 5) return "On fire! Amazing consistency!";
  if (streak >= 3) return "Great streak! Keep it going!";
  if (streak >= 1) return "Good start! Build your streak!";
  return "Submit on time to start a streak!";
}

export default function HomeworkStreakCard({ studentId, assignments }: HomeworkStreakCardProps) {
  const { current, best, total } = calculateStreak(assignments);
  const bonus = getStreakXPBonus(current);
  const emoji = getStreakEmoji(current);
  const message = getStreakMessage(current);

  return (
    <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
      <div className="flex items-center gap-3">
        {/* Streak mark */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
          <span className="text-2xl" aria-hidden>{emoji}</span>
          {current > 0 && (
            <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-hec-action px-1 text-hec-caption font-medium tabular-nums text-hec-on-action">
              {current}
            </div>
          )}
        </div>

        {/* Streak info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
            <h3 className="font-display text-hec-h3 font-medium text-hec-ink">Homework Streak</h3>
          </div>
          <p className="mt-0.5 text-hec-small text-hec-ink-soft">{message}</p>

          {/* Streak stats */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1 text-hec-caption text-hec-ink-soft">
              <Trophy className="h-4 w-4" aria-hidden />
              <span>Best: {best}</span>
            </div>
            <div className="flex items-center gap-1 text-hec-caption text-hec-ink-soft">
              <Zap className="h-4 w-4" aria-hidden />
              <span>Total on-time: {total}</span>
            </div>
            {bonus > 0 && (
              <div className="flex items-center gap-1 text-hec-caption font-medium text-hec-brass">
                <span>+{bonus} XP bonus</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next milestone */}
      {current > 0 && current < 10 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-hec-caption text-hec-ink-soft">
            <span>Next milestone</span>
            <span>
              {current < 3 ? "3 🔓" : current < 5 ? "5 🔓" : current < 7 ? "7 🔓" : "10 🔓"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-hec-sunken">
            <div
              className="h-2 rounded-full bg-hec-brass"
              style={{
                width: `${
                  current < 3
                    ? (current / 3) * 100
                    : current < 5
                    ? ((current - 3) / 2) * 100
                    : current < 7
                    ? ((current - 5) / 2) * 100
                    : ((current - 7) / 3) * 100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { calculateStreak, getStreakXPBonus };
