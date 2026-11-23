import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/lib/soundManager";

interface LoginStreakData {
  currentStreak: number;
  longestStreak: number;
  weekActivity: boolean[];
  hasCheckedHomeworkToday: boolean;
  canClaimReward: boolean;
}

export function useLoginChallenge(studentId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = dayjs().format("YYYY-MM-DD");

  // Fetch streak data
  const { data: streakData, isLoading } = useQuery({
    queryKey: ["login-streak", studentId],
    queryFn: async (): Promise<LoginStreakData> => {
      if (!studentId) {
        return { 
          currentStreak: 0, 
          longestStreak: 0, 
          weekActivity: [false, false, false, false, false, false, false],
          hasCheckedHomeworkToday: false,
          canClaimReward: false
        };
      }

      // Get streak record
      const { data: streak } = await supabase
        .from("student_login_streaks")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      // Check if reward already claimed today
      const { data: todayReward } = await supabase
        .from("daily_login_rewards")
        .select("id")
        .eq("student_id", studentId)
        .eq("reward_date", today)
        .maybeSingle();

      // Get week activity (last 7 days of rewards)
      const weekStart = dayjs().startOf("week").add(1, "day"); // Monday
      const weekDates = Array.from({ length: 7 }, (_, i) => 
        weekStart.add(i, "day").format("YYYY-MM-DD")
      );

      const { data: weekRewards } = await supabase
        .from("daily_login_rewards")
        .select("reward_date")
        .eq("student_id", studentId)
        .in("reward_date", weekDates);

      const rewardDatesSet = new Set(weekRewards?.map(r => r.reward_date) || []);
      const weekActivity = weekDates.map(date => rewardDatesSet.has(date));

      const hasCheckedHomeworkToday = streak?.last_homework_check === today;
      const hasClaimedToday = !!todayReward;

      return {
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.longest_streak || 0,
        weekActivity,
        hasCheckedHomeworkToday,
        canClaimReward: !hasClaimedToday && hasCheckedHomeworkToday
      };
    },
    enabled: !!studentId,
    staleTime: 30000, // 30 seconds
  });

  // Record homework page visit AND auto-award daily XP
  const recordHomeworkVisit = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("No student ID");

      // Check if already claimed today
      const { data: todayReward } = await supabase
        .from("daily_login_rewards")
        .select("id")
        .eq("student_id", studentId)
        .eq("reward_date", today)
        .maybeSingle();

      if (todayReward) {
        // Already claimed, just update homework check timestamp
        await supabase
          .from("student_login_streaks")
          .upsert({
            student_id: studentId,
            last_homework_check: today,
            updated_at: new Date().toISOString()
          }, { onConflict: "student_id" });
        return { alreadyClaimed: true };
      }

      // Award reward automatically
      await supabase
        .from("daily_login_rewards")
        .insert({
          student_id: studentId,
          reward_date: today,
          xp_awarded: 1
        });

      // Get student's enrolled classes for point transaction
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .is("end_date", null)
        .limit(1);

      const classId = enrollments?.[0]?.class_id;

      if (classId) {
        const currentMonth = dayjs().format("YYYY-MM");
        await supabase
          .from("point_transactions")
          .insert({
            student_id: studentId,
            class_id: classId,
            points: 1,
            type: "engagement",
            reason: "Daily check-in: Logged in and checked homework",
            date: today,
            month: currentMonth
          });
      }

      // Update streak
      const { data: streak } = await supabase
        .from("student_login_streaks")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      let newStreak = 1;
      
      if (streak?.last_login_date === yesterday) {
        newStreak = (streak.current_streak || 0) + 1;
      }

      const newLongest = Math.max(newStreak, streak?.longest_streak || 0);

      await supabase
        .from("student_login_streaks")
        .upsert({
          student_id: studentId,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_login_date: today,
          last_homework_check: today,
          updated_at: new Date().toISOString()
        }, { onConflict: "student_id" });

      return { xpAwarded: 1, newStreak, alreadyClaimed: false };
    },
    onSuccess: (data) => {
      if (data && !data.alreadyClaimed) {
        soundManager.play("checkin", { classroom: true });
        toast({
          title: "🎉 Daily Check-In Complete!",
          description: `+1 XP earned! Streak: ${data.newStreak} days`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["login-streak", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-total-points", studentId] });
    }
  });


  return {
    streakData: streakData || {
      currentStreak: 0,
      longestStreak: 0,
      weekActivity: [false, false, false, false, false, false, false],
      hasCheckedHomeworkToday: false,
      canClaimReward: false
    },
    isLoading,
    recordHomeworkVisit: recordHomeworkVisit.mutate,
    isRecordingVisit: recordHomeworkVisit.isPending
  };
}
