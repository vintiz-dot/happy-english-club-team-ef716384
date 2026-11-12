import { Lock, Trophy, Star, Zap, Crown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CARD_TITLE } from "@/components/student/nova/ivory";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  category: "homework" | "xp" | "attendance" | "streak" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface AchievementBadgesProps {
  totalXp: number;
  homeworkCompleted: number;
  perfectAttendanceWeeks: number;
  currentStreak: number;
  longestStreak: number;
  classesAttended: number;
  featuredBadgeId?: string;
  onFeatureBadge?: (badgeId: string | null) => void;
}

const badgeDefinitions: Omit<Badge, "earned" | "earnedAt">[] = [
  // Homework badges
  { id: "first_homework", name: "First Steps", description: "Complete your first homework", icon: "📝", category: "homework", rarity: "common" },
  { id: "homework_5", name: "Homework Hero", description: "Complete 5 homework assignments", icon: "📚", category: "homework", rarity: "common" },
  { id: "homework_25", name: "Scholar", description: "Complete 25 homework assignments", icon: "🎓", category: "homework", rarity: "rare" },
  { id: "homework_100", name: "Academic Master", description: "Complete 100 homework assignments", icon: "🏆", category: "homework", rarity: "epic" },

  // XP badges
  { id: "xp_100", name: "Rising Star", description: "Earn 100 XP", icon: "⭐", category: "xp", rarity: "common" },
  { id: "xp_500", name: "XP Hunter", description: "Earn 500 XP", icon: "🌟", category: "xp", rarity: "rare" },
  { id: "xp_1000", name: "XP Master", description: "Earn 1,000 XP", icon: "💫", category: "xp", rarity: "epic" },
  { id: "xp_5000", name: "XP Legend", description: "Earn 5,000 XP", icon: "👑", category: "xp", rarity: "legendary" },

  // Attendance badges
  { id: "perfect_week", name: "Perfect Week", description: "Attend all classes in a week", icon: "🔥", category: "attendance", rarity: "common" },
  { id: "perfect_month", name: "Perfect Month", description: "Perfect attendance for 4 weeks", icon: "🏅", category: "attendance", rarity: "rare" },
  { id: "class_10", name: "Regular", description: "Attend 10 classes", icon: "✅", category: "attendance", rarity: "common" },
  { id: "class_50", name: "Dedicated", description: "Attend 50 classes", icon: "🎯", category: "attendance", rarity: "rare" },

  // Streak badges
  { id: "streak_3", name: "Getting Started", description: "3-day login streak", icon: "🔥", category: "streak", rarity: "common" },
  { id: "streak_7", name: "Week Warrior", description: "7-day login streak", icon: "⚡", category: "streak", rarity: "rare" },
  { id: "streak_30", name: "Consistency King", description: "30-day login streak", icon: "👑", category: "streak", rarity: "epic" },

  // Special badges
  { id: "early_bird", name: "Early Bird", description: "Submit homework before due date", icon: "🌅", category: "special", rarity: "common" },
  { id: "level_5", name: "Level 5", description: "Reach Level 5", icon: "🚀", category: "special", rarity: "rare" },
  { id: "level_10", name: "Level 10", description: "Reach Level 10", icon: "💎", category: "special", rarity: "legendary" },
];

export function AchievementBadges({
  totalXp,
  homeworkCompleted,
  perfectAttendanceWeeks,
  currentStreak,
  longestStreak,
  classesAttended,
  featuredBadgeId,
  onFeatureBadge,
}: AchievementBadgesProps) {
  // Calculate which badges are earned
  const badges: Badge[] = badgeDefinitions.map((def) => {
    let earned = false;

    switch (def.id) {
      // Homework
      case "first_homework": earned = homeworkCompleted >= 1; break;
      case "homework_5": earned = homeworkCompleted >= 5; break;
      case "homework_25": earned = homeworkCompleted >= 25; break;
      case "homework_100": earned = homeworkCompleted >= 100; break;

      // XP
      case "xp_100": earned = totalXp >= 100; break;
      case "xp_500": earned = totalXp >= 500; break;
      case "xp_1000": earned = totalXp >= 1000; break;
      case "xp_5000": earned = totalXp >= 5000; break;

      // Attendance
      case "perfect_week": earned = perfectAttendanceWeeks >= 1; break;
      case "perfect_month": earned = perfectAttendanceWeeks >= 4; break;
      case "class_10": earned = classesAttended >= 10; break;
      case "class_50": earned = classesAttended >= 50; break;

      // Streak
      case "streak_3": earned = longestStreak >= 3; break;
      case "streak_7": earned = longestStreak >= 7; break;
      case "streak_30": earned = longestStreak >= 30; break;

      // Special
      case "early_bird": earned = homeworkCompleted >= 1; break; // Simplified
      case "level_5": earned = totalXp >= 1000; break; // Level 5 threshold
      case "level_10": earned = totalXp >= 4500; break; // Level 10 threshold
    }

    return { ...def, earned };
  });

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-hec-ink-soft" aria-hidden />
          <h2 className={CARD_TITLE}>Achievements</h2>
        </div>
        <span className="text-hec-small tabular-nums text-hec-ink-soft">
          {earnedCount}/{badges.length} earned
        </span>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-3 pt-1">
          <TooltipProvider>
            {badges.map((badge) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-hec-md border",
                      badge.earned ? "border-hec-brass/40 bg-hec-surface" : "border-hec-line bg-hec-sunken",
                      featuredBadgeId === badge.id && "outline outline-2 outline-offset-2 outline-hec-brass",
                    )}
                    onClick={() => {
                      if (badge.earned && onFeatureBadge) {
                        onFeatureBadge(featuredBadgeId === badge.id ? null : badge.id);
                      }
                    }}
                  >
                    {badge.earned ? (
                      <span className="text-2xl">{badge.icon}</span>
                    ) : (
                      <Lock className="h-5 w-5 text-hec-ink-faint" aria-label={`${badge.name}, locked`} />
                    )}

                    {/* Rarity indicator */}
                    {badge.earned && badge.rarity !== "common" && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-hec-line bg-hec-surface">
                        {badge.rarity === "rare" && <Star className="h-3 w-3 text-hec-brass" />}
                        {badge.rarity === "epic" && <Zap className="h-3 w-3 text-hec-brass" />}
                        {badge.rarity === "legendary" && <Crown className="h-3 w-3 text-hec-brass" />}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  data-hec-theme="ivory"
                  side="bottom"
                  className="max-w-[200px] rounded-hec-sm bg-hec-action px-3 py-2 text-hec-caption text-hec-on-action shadow-hec-2 ring-0 backdrop-blur-none"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-hec-on-action/80">{badge.description}</p>
                    <p className="capitalize text-hec-on-action/80">
                      {badge.rarity}
                    </p>
                    {badge.earned && (
                      <p className="font-medium">✓ Earned!</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
