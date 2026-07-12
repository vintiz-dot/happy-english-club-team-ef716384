import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
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

  // Flame intensity based on streak
  const flameColors = current >= 5
    ? "from-orange-500 via-red-500 to-yellow-500"
    : current >= 3
    ? "from-amber-500 via-orange-500 to-yellow-500"
    : "from-amber-400 to-yellow-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-red-500/15">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            {/* Streak flame */}
            <motion.div
              className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${flameColors} flex items-center justify-center shadow-lg`}
              animate={current >= 3 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <span className="text-2xl">{emoji}</span>
              {current > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shadow-md"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
                >
                  {current}
                </motion.div>
              )}
            </motion.div>

            {/* Streak info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="font-bold text-sm">Homework Streak</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{message}</p>

              {/* Streak stats */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  <span>Best: {best}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>Total on-time: {total}</span>
                </div>
                {bonus > 0 && (
                  <motion.div
                    className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <span>+{bonus} XP bonus</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Next milestone */}
          {current > 0 && current < 10 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground mb-1">
                <span>Next milestone</span>
                <span>
                  {current < 3 ? "3 🔓" : current < 5 ? "5 🔓" : current < 7 ? "7 🔓" : "10 🔓"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${flameColors}`}
                  initial={{ width: 0 }}
                  animate={{
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
                  transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export { calculateStreak, getStreakXPBonus };
