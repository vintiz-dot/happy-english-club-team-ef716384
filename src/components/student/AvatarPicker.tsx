import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { getAvatarUrl } from "@/lib/avatars";

interface AvatarPickerProps {
  studentId: string;
  currentAvatarUrl: string | null;
  onSelect: (avatarUrl: string) => void;
}

export const AvatarPicker = ({ studentId, currentAvatarUrl, onSelect }: AvatarPickerProps) => {
  const { toast } = useToast();

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

  // Premium avatars: a top-three place last month in every class
  const { data: premiumEligibility } = useQuery({
    queryKey: ["premium-eligibility", studentId],
    queryFn: async () => {
      if (!enrollments || enrollments.length === 0) {
        return { unlocked: false, reason: "not_enrolled" };
      }

      // Get last month in Asia/Bangkok timezone
      const lastMonth = dayjs().subtract(1, "month").format("YYYY-MM");


      // Last month's place in each class, from the class board itself
      // (class-leaderboard -> leaderboard_json). This read archived_leaderboards,
      // which nothing filled, so no child could ever unlock these.
      const leaderboards = (
        await Promise.all(
          enrollments.map(async (e: any) => {
            const res = await supabase.functions.invoke("class-leaderboard", {
              body: { classId: e.class_id, period: "month", anchor: `${lastMonth}-01`, month: lastMonth },
            });
            if (res.error || !res.data) return null;
            const d = res.data as any;
            // This child's own row (a sibling in the class is also is_self).
            const mine = d.board
              ? (d.board.rows ?? []).find((r: any) => r.student_id === studentId)
              : (d.leaderboard ?? []).find((r: any) => r.student_id === studentId);
            if (!mine) return null;
            return { class_id: e.class_id, rank: mine.rank as number, classes: e.classes };
          }),
        )
      ).filter(Boolean) as Array<{ class_id: string; rank: number; classes: { name: string } | null }>;

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
        <h3 className="mb-3 text-hec-small font-semibold text-hec-ink">
          Standard Avatars
        </h3>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {standardAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar)}
              className={cn(
                "relative group rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                currentAvatarUrl === avatar.image_url && "ring-2 ring-hec-brass ring-offset-2 ring-offset-hec-raised"
              )}
            >
              <Avatar className="h-16 w-16 border border-hec-line-strong">
                <AvatarImage src={getAvatarUrl(avatar.image_url)} alt={avatar.name} />
                <AvatarFallback>{avatar.name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-hec-raised/90 opacity-0 group-hover:opacity-100 transition-opacity duration-hec-1 rounded-full flex items-center justify-center">
                <span className="text-hec-caption font-medium text-hec-ink">{avatar.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Premium Avatars */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-hec-brass" />
          <h3 className="text-hec-small font-semibold text-hec-ink">
            Premium Avatars
          </h3>
          {isPremiumUnlocked && (
            <span className="rounded-full bg-hec-leaf-tint px-2 py-0.5 text-hec-caption font-medium text-hec-leaf">
              Unlocked!
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {premiumAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar)}
              disabled={!isPremiumUnlocked}
              className={cn(
                "relative group rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                null,
                !isPremiumUnlocked && "opacity-50 cursor-not-allowed",
                currentAvatarUrl === avatar.image_url && "ring-2 ring-hec-brass ring-offset-2 ring-offset-hec-raised"
              )}
            >
              <Avatar className="h-16 w-16 border border-hec-brass/40">
                <AvatarImage src={getAvatarUrl(avatar.image_url)} alt={avatar.name} />
                <AvatarFallback>{avatar.name[0]}</AvatarFallback>
              </Avatar>
              {!isPremiumUnlocked && (
                <div className="absolute inset-0 bg-hec-raised/90 rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6 text-hec-ink-soft" />
                </div>
              )}
              <div className={cn(
                "absolute inset-0 bg-hec-raised/90 opacity-0 transition-opacity duration-hec-1 rounded-full flex items-center justify-center",
                isPremiumUnlocked && "group-hover:opacity-100"
              )}>
                <span className="text-hec-caption font-medium text-hec-ink">{avatar.name}</span>
              </div>
            </button>
          ))}
        </div>
        {!isPremiumUnlocked && (
          <p className="mt-2 text-hec-caption text-hec-ink-soft">
            Place top-3 in all your classes last month to unlock premium avatars.
          </p>
        )}
      </div>
    </div>
  );
};
