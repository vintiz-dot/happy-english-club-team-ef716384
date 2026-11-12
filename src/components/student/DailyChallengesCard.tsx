import { CheckCircle2, Sparkles, Target, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BADGE_BRASS, CARD, CARD_TITLE } from "@/components/student/nova/ivory";

interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: string;
}

interface DailyChallengesCardProps {
  challenges: Challenge[];
  onChallengeClick?: (challengeId: string) => void;
}

const defaultChallenges: Challenge[] = [
  { id: '1', title: 'Daily Check-In', description: 'Visit homework page (automatic)', xpReward: 1, progress: 0, target: 1, completed: false, icon: '✅' },
  { id: '2', title: 'Homework Hero', description: 'Complete 1 homework', xpReward: 20, progress: 0, target: 1, completed: false, icon: '📚' },
  { id: '3', title: 'Class Champion', description: 'Attend a class session', xpReward: 15, progress: 0, target: 1, completed: false, icon: '🎓' },
];

export function DailyChallengesCard({
  challenges = defaultChallenges,
  onChallengeClick
}: DailyChallengesCardProps) {
  const completedCount = challenges.filter(c => c.completed).length;
  const allCompleted = completedCount === challenges.length;
  const totalXp = challenges.reduce((sum, c) => sum + (c.completed ? c.xpReward : 0), 0);
  const maxXp = challenges.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <section className={cn(CARD, "h-full")}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                allCompleted ? "bg-hec-leaf-tint" : "bg-hec-sunken",
              )}
            >
              {allCompleted ? (
                <Sparkles className="h-5 w-5 text-hec-leaf" aria-hidden />
              ) : (
                <Target className="h-5 w-5 text-hec-ink-soft" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <h2 className={CARD_TITLE}>Daily Challenges</h2>
              <p className="text-hec-small tabular-nums text-hec-ink-soft">
                {allCompleted ? 'All done! Come back tomorrow!' : `${completedCount}/${challenges.length} completed`}
              </p>
            </div>
          </div>

          {/* XP: a reward, so brass */}
          <span className={cn(BADGE_BRASS, "shrink-0 whitespace-nowrap tabular-nums")}>
            {totalXp}/{maxXp} XP
          </span>
        </div>

        {/* Overall Progress */}
        <Progress
          value={(completedCount / challenges.length) * 100}
          aria-label="Challenges completed today"
          className="h-2 bg-hec-sunken"
        />

        {/* Challenge List */}
        <ul className="divide-y divide-hec-line">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="flex items-center gap-3 py-3"
              onClick={() => onChallengeClick?.(challenge.id)}
            >
              {/* Icon */}
              <span
                aria-hidden
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl",
                  challenge.completed ? "bg-hec-leaf-tint" : "bg-hec-sunken",
                )}
              >
                {challenge.icon}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("break-words font-medium", challenge.completed ? "text-hec-leaf" : "text-hec-ink")}>
                    {challenge.title}
                  </p>
                  {challenge.completed && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-hec-leaf" aria-label="Done" />
                  )}
                </div>
                <p className="break-words text-hec-small text-hec-ink-soft">{challenge.description}</p>

                {/* Progress bar for incomplete challenges */}
                {!challenge.completed && challenge.target > 1 && (
                  <div className="mt-2">
                    <Progress
                      value={(challenge.progress / challenge.target) * 100}
                      aria-label={`${challenge.title} progress`}
                      className="h-1.5 bg-hec-sunken"
                    />
                    <p className="mt-1 text-hec-caption tabular-nums text-hec-ink-soft">
                      {challenge.progress}/{challenge.target}
                    </p>
                  </div>
                )}
              </div>

              {/* XP Reward */}
              <span className={cn(
                "shrink-0 whitespace-nowrap text-hec-small tabular-nums",
                challenge.completed ? "font-medium text-hec-leaf" : "text-hec-ink-soft",
              )}>
                <span className="font-semibold">+{challenge.xpReward}</span> XP
              </span>
            </li>
          ))}
        </ul>

        {/* Bonus Reward */}
        {allCompleted && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-4 text-center">
            <Gift className="h-5 w-5 text-hec-leaf" aria-hidden />
            <span className="font-medium text-hec-ink">Bonus Reward Unlocked!</span>
            <span className={BADGE_BRASS}>+10 XP</span>
          </div>
        )}
      </div>
    </section>
  );
}
