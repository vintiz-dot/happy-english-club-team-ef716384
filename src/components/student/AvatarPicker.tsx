import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { getAvatarUrl } from "@/lib/avatars";
import { useIvory } from "@/hooks/useIvory";

interface AvatarPickerProps {
  studentId: string;
  currentAvatarUrl: string | null;
  onSelect: (avatarUrl: string) => void;
}

export const AvatarPicker = ({ studentId, currentAvatarUrl, onSelect }: AvatarPickerProps) => {
  const { toast } = useToast();
  // Also opened from the staff student page (not migrated yet): old classes there.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  // Fetch all avatars
  const { data: avatars } = useQuery({
    queryKey: ["avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch student's enrollments
  const { data: enrollments } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id, classes(name)")
        .eq("student_id", studentId)
        .is("end_date", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch last month's archived leaderboard data
  const { data: premiumEligibility } = useQuery({
    queryKey: ["premium-eligibility", studentId],
    queryFn: async () => {
      if (!enrollments || enrollments.length === 0) {
        return { unlocked: false, reason: "not_enrolled" };
      }

      // Get last month in Asia/Bangkok timezone
      const lastMonth = dayjs().subtract(1, "month").format("YYYY-MM");

      const classIds = enrollments.map(e => e.class_id);

      // Fetch archived leaderboard data for all enrolled classes
      const { data: leaderboards, error } = await supabase
        .from("archived_leaderboards")
        .select("class_id, rank, classes(name)")
        .eq("student_id", studentId)
        .eq("month", lastMonth)
        .in("class_id", classIds);

      if (error) throw error;

      // Check if we have data for all enrolled classes
      const classesWithData = new Set(leaderboards?.map(l => l.class_id) || []);
      const missingClasses = enrollments.filter(e => !classesWithData.has(e.class_id));

      if (missingClasses.length > 0) {
        return {
          unlocked: false,
          reason: "missing_data",
          missingClasses: missingClasses.map(e => e.classes?.name || "Unknown"),
        };
      }

      if (!leaderboards || leaderboards.length === 0) {
        return {
          unlocked: false,
          reason: "missing_data",
          missingClasses: enrollments.map(e => e.classes?.name || "Unknown"),
        };
      }

      // Find worst (highest) rank across all classes
      const worstRank = Math.max(...leaderboards.map(l => l.rank || 999));
      const bestRank = Math.min(...leaderboards.map(l => l.rank || 999));

      // Premium unlocks if worst rank is 1-3
      const unlocked = worstRank >= 1 && worstRank <= 3;

      if (!unlocked) {
        const lowRankClasses = leaderboards
          .filter(l => l.rank && l.rank > 3)
          .map(l => `${l.classes?.name || "Unknown"} (${l.rank}${getRankSuffix(l.rank)})`);

        return {
          unlocked: false,
          reason: "low_ranks",
          lowRankClasses,
          bestRank,
          worstRank,
        };
      }

      return { unlocked: true };
    },
    enabled: !!enrollments,
  });

  const handleAvatarClick = (avatar: any) => {
    if (avatar.is_premium && !premiumEligibility?.unlocked) {
      showPremiumLockedToast();
      return;
    }
    onSelect(avatar.image_url);
  };

  const showPremiumLockedToast = () => {
    if (!premiumEligibility) return;

    const { reason, missingClasses, lowRankClasses, bestRank, worstRank } = premiumEligibility;

    if (reason === "not_enrolled") {
      toast({
        title: "Premium locked",
        description: "Enroll in a class and place top-3 to unlock Premium avatars.",
        variant: "destructive",
      });
    } else if (reason === "missing_data") {
      toast({
        title: "Premium locked",
        description: `We're missing last month's results for: ${missingClasses?.join(", ")}. Premium unlocks when all classes have a top-3 rank.`,
        variant: "destructive",
      });
    } else if (reason === "low_ranks") {
      toast({
        title: "Premium locked",
        description: `Keep a top-3 rank in all your classes to use Premium avatars. You're below top-3 in: ${lowRankClasses?.join(", ")}. Last month's best overall rank: ${bestRank}${getRankSuffix(bestRank)}; lowest: ${worstRank}${getRankSuffix(worstRank)}.`,
        variant: "destructive",
      });
    }
  };

  const getRankSuffix = (rank: number) => {
    if (rank % 10 === 1 && rank % 100 !== 11) return "st";
    if (rank % 10 === 2 && rank % 100 !== 12) return "nd";
    if (rank % 10 === 3 && rank % 100 !== 13) return "rd";
    return "th";
  };

  const standardAvatars = avatars?.filter(a => !a.is_premium) || [];
  const premiumAvatars = avatars?.filter(a => a.is_premium) || [];
  const isPremiumUnlocked = premiumEligibility?.unlocked || false;

  return (
    <div className="space-y-6">
      {/* Standard Avatars */}
      <div>
        <h3 className={iv("mb-3 text-hec-small font-semibold text-hec-ink", "text-sm font-semibold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent")}>
          Standard Avatars
        </h3>
        <div className={iv("grid grid-cols-4 gap-3 sm:grid-cols-5", "grid grid-cols-5 gap-3")}>
          {standardAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar)}
              className={cn(
                iv("relative group rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "relative group transition-all duration-200 hover:scale-110"),
                currentAvatarUrl === avatar.image_url && iv("ring-2 ring-hec-brass ring-offset-2 ring-offset-hec-raised", "ring-2 ring-primary ring-offset-2")
              )}
            >
              <Avatar className={iv("h-16 w-16 border border-hec-line-strong", "h-16 w-16 border-2 border-border")}>
                <AvatarImage src={getAvatarUrl(avatar.image_url)} alt={avatar.name} />
                <AvatarFallback>{avatar.name[0]}</AvatarFallback>
              </Avatar>
              <div className={iv("absolute inset-0 bg-hec-raised/90 opacity-0 group-hover:opacity-100 transition-opacity duration-hec-1 rounded-full flex items-center justify-center", "absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center")}>
                <span className={iv("text-hec-caption font-medium text-hec-ink", "text-xs font-semibold")}>{avatar.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Premium Avatars */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-yellow-500")} />
          <h3 className={iv("text-hec-small font-semibold text-hec-ink", "text-sm font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent")}>
            Premium Avatars
          </h3>
          {isPremiumUnlocked && (
            <span className={iv("rounded-full bg-hec-leaf-tint px-2 py-0.5 text-hec-caption font-medium text-hec-leaf", "text-xs text-green-600 dark:text-green-400 font-semibold px-2 py-0.5 bg-green-500/10 rounded-full")}>
              Unlocked!
            </span>
          )}
        </div>
        <div className={iv("grid grid-cols-4 gap-3 sm:grid-cols-5", "grid grid-cols-5 gap-3")}>
          {premiumAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar)}
              disabled={!isPremiumUnlocked}
              className={cn(
                iv("relative group rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "relative group transition-all duration-200"),
                ivory ? null : isPremiumUnlocked && "hover:scale-110",
                !isPremiumUnlocked && "opacity-50 cursor-not-allowed",
                currentAvatarUrl === avatar.image_url && iv("ring-2 ring-hec-brass ring-offset-2 ring-offset-hec-raised", "ring-2 ring-yellow-500 ring-offset-2")
              )}
            >
              <Avatar className={iv("h-16 w-16 border border-hec-brass/40", "h-16 w-16 border-2 border-yellow-500/30")}>
                <AvatarImage src={getAvatarUrl(avatar.image_url)} alt={avatar.name} />
                <AvatarFallback>{avatar.name[0]}</AvatarFallback>
              </Avatar>
              {!isPremiumUnlocked && (
                <div className={iv("absolute inset-0 bg-hec-raised/90 rounded-full flex items-center justify-center", "absolute inset-0 bg-background/90 rounded-full flex items-center justify-center")}>
                  <Lock className={iv("h-6 w-6 text-hec-ink-soft", "h-6 w-6 text-muted-foreground")} />
                </div>
              )}
              <div className={cn(
                iv("absolute inset-0 bg-hec-raised/90 opacity-0 transition-opacity duration-hec-1 rounded-full flex items-center justify-center", "absolute inset-0 bg-background/90 opacity-0 transition-opacity rounded-full flex items-center justify-center"),
                isPremiumUnlocked && "group-hover:opacity-100"
              )}>
                <span className={iv("text-hec-caption font-medium text-hec-ink", "text-xs font-semibold")}>{avatar.name}</span>
              </div>
            </button>
          ))}
        </div>
        {!isPremiumUnlocked && (
          <p className={iv("mt-2 text-hec-caption text-hec-ink-soft", "text-xs text-muted-foreground mt-2")}>
            Place top-3 in all your classes last month to unlock premium avatars.
          </p>
        )}
      </div>
    </div>
  );
};
