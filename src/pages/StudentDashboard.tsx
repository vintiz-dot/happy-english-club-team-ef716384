import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { dayjs } from "@/lib/date";
import Layout from "@/components/Layout";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, DollarSign, Clock, Phone, Trophy, BookOpen, Edit, Mail, Sparkles, Star, Zap, Rocket, Target, ChevronRight, HelpCircle, Wallet } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StudentClassLeaderboard } from "@/components/student/StudentClassLeaderboard";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentProfileEdit } from "@/components/student/StudentProfileEdit";
import { useStudentMonthFinance, formatVND } from "@/hooks/useStudentMonthFinance";
import { motion, AnimatePresence } from "framer-motion";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";

// New kid-friendly components
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { DailyStreakCard } from "@/components/student/DailyStreakCard";
import { DailyChallengesCard } from "@/components/student/DailyChallengesCard";
import { LevelProgressRing } from "@/components/student/LevelProgressRing";
import { QuestCard } from "@/components/student/QuestCard";
import { CelebrationOverlay } from "@/components/student/CelebrationOverlay";
import { HowToEarnXP } from "@/components/student/HowToEarnXP";
import { AchievementBadges } from "@/components/student/AchievementBadges";
import { WeeklyProgressCard } from "@/components/student/WeeklyProgressCard";
import { StudentScheduleCalendar } from "@/components/student/StudentScheduleCalendar";
import { ProfileShareCard } from "@/components/student/ProfileShareCard";
import { InactiveStudentLanding } from "@/components/student/InactiveStudentLanding";
import { StudentWallet } from "@/components/student/StudentWallet";
import { DemoDashboard } from "@/components/student/DemoDashboard";
import { MonitorStatusCard } from "@/components/student/MonitorStatusCard";
import { useStudentMonitorClasses } from "@/hooks/useClassMonitor";
import { StudentExamReportsTab } from "@/components/exam-reports/StudentExamReportsTab";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

import { calculateLevel, getLevelTitle } from "@/lib/levelUtils";
import { useAuth } from "@/hooks/useAuth";

// Time-based greeting with kid-friendly messages
function getGreeting(): { text: string; emoji: string; subtext: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", emoji: "🌅", subtext: "A brand new day of adventure awaits!" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "☀️", subtext: "You're doing amazing today!" };
  if (hour < 21) return { text: "Good Evening", emoji: "🌆", subtext: "Time for some evening learning!" };
  return { text: "Good Night", emoji: "🌙", subtext: "Rest up for tomorrow's quests!" };
}

export default function StudentDashboard() {
  const { studentId, isHydrated } = useStudentProfile();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentMonth = dayjs().format("YYYY-MM");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [featuredBadgeId, setFeaturedBadgeId] = useState<string | null>(() => {
    try { return localStorage.getItem("featured_badge_id"); } catch { return null; }
  });
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "dashboard");
  const greeting = useMemo(() => getGreeting(), []);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "achievements" || tab === "schedule" || tab === "reports")) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("dashboard");
    }
  }, [searchParams]);

  // Login challenge hook for real streak data
  const { streakData } = useLoginChallenge(studentId);

  const { data: monitorClasses } = useStudentMonitorClasses(studentId);
  const isMonitor = (monitorClasses?.length || 0) > 0;

  const { data: studentProfile } = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data } = await supabase
        .from("students")
        .select(`
          id, 
          full_name, 
          email, 
          phone, 
          date_of_birth,
          avatar_url,
          is_active,
          status_message,
          family:families(name),
          updated_at
        `)
        .eq("id", studentId)
        .single();
      return data;
    },
    enabled: !!studentId,
  });

  // Fetch total XP for level calculation
  const { data: totalPoints } = useQuery({
    queryKey: ["student-total-points", studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      const { data } = await supabase
        .from("student_points")
        .select("total_points")
        .eq("student_id", studentId);
      return data?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;
    },
    enabled: !!studentId,
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ["student-upcoming-sessions", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .is("end_date", null);

      const classIds = enrollments?.map(e => e.class_id) || [];

      const { data } = await supabase
        .from("sessions")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          classes!inner(name)
        `)
        .in("class_id", classIds)
        .gte("date", dayjs().format("YYYY-MM-DD"))
        .lte("date", dayjs().add(7, "days").format("YYYY-MM-DD"))
        .in("status", ["Scheduled", "Held"])
        .order("date", { ascending: true })
        .limit(5);

      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: pendingHomework } = useQuery({
    queryKey: ["student-pending-homework", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Use RPC to bypass RLS
      const { data, error } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });

      if (error) {
        console.error("get_student_homeworks RPC error:", error);
        return [];
      }

      const result = data as any;
      const homeworks: any[] = result?.homeworks || [];
      const submissions: any[] = result?.submissions || [];
      const submissionMap = new Map(submissions.map((s: any) => [s.homework_id, s]));

      // Filter to pending (no submission or status is "pending")
      const pending = homeworks.filter((hw: any) => {
        const submission = submissionMap.get(hw.id);
        return !submission || submission.status === "pending";
      });

      return pending.slice(0, 5);
    },
    enabled: !!studentId,
  });

  const { data: tuitionData } = useStudentMonthFinance(studentId, currentMonth);

  // Check enrollment status for inactive landing
  const { data: enrollmentStatus } = useQuery({
    queryKey: ["student-enrollment-status", studentId],
    queryFn: async () => {
      if (!studentId) return { hasActive: false, hasAny: false };
      const { data: allEnrollments } = await supabase
        .from("enrollments")
        .select("id, end_date")
        .eq("student_id", studentId);
      const rows = allEnrollments || [];
      return {
        hasActive: rows.some(e => e.end_date === null),
        hasAny: rows.length > 0,
      };
    },
    enabled: !!studentId,
  });

  const { data: enrolledClasses } = useQuery({
    queryKey: ["student-enrolled-classes", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          id,
          class_id,
          classes(id, name, economy_mode, points_to_cash_rate)
        `)
        .eq("student_id", studentId)
        .is("end_date", null);

      return enrollments || [];
    },
    enabled: !!studentId,
  });

  // Fetch achievement data
  const { data: achievementData } = useQuery({
    queryKey: ["student-achievement-data", studentId],
    queryFn: async () => {
      if (!studentId) return { homeworkCompleted: 0, classesAttended: 0, perfectWeeks: 0 };

      // Count completed homework submissions using RPC
      const { data } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });
      const submissions = (data as any)?.submissions || [];
      const homeworkCount = submissions.filter((s: any) => s.status === "graded").length;

      // Count attended classes
      const { count: attendanceCount } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "Present");

      return {
        homeworkCompleted: homeworkCount || 0,
        classesAttended: attendanceCount || 0,
        perfectWeeks: Math.floor((attendanceCount || 0) / 5), // Simplified calculation
      };
    },
    enabled: !!studentId,
  });

  const levelInfo = calculateLevel(totalPoints || 0);

  // Build dynamic challenges based on real data
  const dynamicChallenges = useMemo(() => {
    const hasCompletedHomework = (pendingHomework?.length || 0) === 0;
    const hasAttendedToday = upcomingSessions?.some((s: any) => 
      dayjs(s.date).isSame(dayjs(), 'day') && s.status === 'Held'
    ) || false;

    return [
      { 
        id: '1', 
        title: 'Daily Check-In', 
        description: 'Log in and check your homework page', 
        xpReward: 1, 
        progress: streakData.hasCheckedHomeworkToday ? 1 : 0, 
        target: 1, 
        completed: !streakData.canClaimReward && streakData.hasCheckedHomeworkToday, 
        icon: '✅' 
      },
      { 
        id: '2', 
        title: 'Homework Hero', 
        description: 'Complete 1 homework', 
        xpReward: 20, 
        progress: hasCompletedHomework ? 1 : 0, 
        target: 1, 
        completed: hasCompletedHomework, 
        icon: '📚' 
      },
      { 
        id: '3', 
        title: 'Class Champion', 
        description: 'Attend a class session', 
        xpReward: 15, 
        progress: hasAttendedToday ? 1 : 0, 
        target: 1, 
        completed: hasAttendedToday, 
        icon: '🎓' 
      },
    ];
  }, [pendingHomework, upcomingSessions, streakData]);

  // New student-role user with no student record at all → show DemoDashboard
  if (!studentId && isHydrated && role === "student") {
    const fallbackName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
    return (
      <Layout title="Dashboard">
        <DemoDashboard
          student={{ id: "", full_name: fallbackName, avatar_url: null }}
          studentId=""
        />
      </Layout>
    );
  }

  if (!studentId || !studentProfile) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center min-h-[50vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center glass-lg rounded-3xl p-12"
          >
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-xl text-muted-foreground">
              {studentId ? "Loading your profile…" : "Please select a student profile."}
            </p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Show inactive/unenrolled landing page
  if (enrollmentStatus && !enrollmentStatus.hasActive) {
    // New students get a premium demo dashboard; returning students see the re-enrollment landing
    if (!enrollmentStatus.hasAny) {
      return (
        <Layout title="Dashboard">
          <DemoDashboard student={studentProfile} studentId={studentId} />
        </Layout>
      );
    }
    return (
      <Layout title="Dashboard">
        <InactiveStudentLanding
          student={studentProfile}
          isReturning={enrollmentStatus.hasAny}
          studentId={studentId}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Celebration Overlay */}
      <CelebrationOverlay 
        show={showCelebration} 
        type="level_up"
        title="Level Up!"
        subtitle="You've reached a new level!"
        onComplete={() => setShowCelebration(false)}
      />

      {/* Premium Immersive Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute inset-0 ${isMonitor ? 'bg-gradient-to-br from-background via-warning/5 to-background' : 'bg-gradient-to-br from-background via-primary/5 to-accent/5'}`} />
        
        {/* Animated nebula effects */}
        <motion.div 
          className={`absolute top-20 left-20 w-[40rem] h-[40rem] ${isMonitor ? 'bg-warning/12' : 'bg-primary/10'} rounded-full blur-[120px]`}
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={`absolute bottom-20 right-20 w-[35rem] h-[35rem] ${isMonitor ? 'bg-warning/8' : 'bg-accent/10'} rounded-full blur-[120px]`}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.12, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {isMonitor && (
          <motion.div 
            className="absolute top-1/3 right-1/4 w-[25rem] h-[25rem] rounded-full blur-[100px]"
            style={{ background: "hsl(var(--monitor-gold) / 0.08)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Starfield */}
        <div className="starfield">
          {Array.from({ length: isMonitor ? 50 : 40 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${isMonitor ? 'bg-warning/30' : 'bg-foreground/20'}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.2, 1] }}
              transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
      </div>

      <motion.div 
        className="space-y-6 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6 space-y-8">
        {/* Hero Section with Mascot */}
        <motion.div 
          variants={itemVariants}
          className={`glass-lg shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl ${isMonitor ? 'border-2 ring-1 ring-offset-0' : 'border-0'}`}
          style={isMonitor ? {
            borderColor: 'hsl(var(--monitor-border) / 0.6)',
            boxShadow: '0 0 40px hsl(var(--monitor-glow)), 0 20px 50px rgba(0,0,0,0.1)',
          } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          
          <div className="p-6 md:p-8 relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Mascot + Greeting */}
              <div className="flex items-center gap-4 md:gap-6">
                {/* Mascot */}
                <MascotCompanion 
                  studentName={studentProfile.full_name}
                  streak={streakData.currentStreak}
                  pendingHomework={pendingHomework?.length || 0}
                  level={levelInfo.level}
                />

                {/* Greeting & Name */}
                <div className="space-y-1">
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-2xl">{greeting.emoji}</span>
                    <span className="text-lg text-muted-foreground">{greeting.text},</span>
                  </motion.div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    {studentProfile.full_name.split(' ')[0]}!
                  </h1>

                  {/* Status Message */}
                  {(studentProfile as any).status_message && (
                    <p className="text-sm italic text-muted-foreground/80">
                      "{(studentProfile as any).status_message}"
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">{greeting.subtext}</p>
                </div>
              </div>

              {/* Center: Level Ring */}
              <div className="flex justify-center lg:justify-end">
                <LevelProgressRing
                  avatarUrl={studentProfile.avatar_url}
                  name={studentProfile.full_name}
                  level={levelInfo.level}
                  currentXp={levelInfo.currentXp}
                  nextLevelXp={levelInfo.nextLevelXp}
                  progress={levelInfo.progress}
                  totalXp={totalPoints || 0}
                  size="lg"
                />
              </div>

              {/* Right: Edit Button */}
              <Button 
                onClick={() => setShowEditProfile(true)} 
                className="glass border-primary/20 hover:border-primary hover:bg-primary/10 transition-all duration-300 shadow-lg hover:shadow-xl self-center lg:self-start"
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            {/* XP Progress Bar */}
            <motion.div 
              className="mt-6 space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="font-medium">{getLevelTitle(levelInfo.level)} — Level {levelInfo.level}</span>
                </div>
                <span className="text-muted-foreground">
                  {levelInfo.currentXp}/{levelInfo.nextLevelXp} XP to Level {levelInfo.level + 1}
                </span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
                  style={{ backgroundSize: '200% 100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Monitor Status Card */}
        {isMonitor && (
          <motion.div variants={itemVariants}>
            <MonitorStatusCard classNames={monitorClasses!.map(c => c.className)} />
          </motion.div>
        )}

        {/* Weekly Progress Summary */}
        <motion.div variants={itemVariants}>
          <WeeklyProgressCard studentId={studentId} currentStreak={streakData.currentStreak} />
        </motion.div>

        {/* Stats Row - Streak & Challenges */}
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div variants={itemVariants}>
            <DailyStreakCard
              currentStreak={streakData.currentStreak}
              longestStreak={streakData.longestStreak}
              weekActivity={streakData.weekActivity}
              streakFreezeAvailable={false}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <DailyChallengesCard challenges={dynamicChallenges} />
          </motion.div>
        </div>

        {/* Achievement Badges */}
        <motion.div variants={itemVariants} className="glass-lg border-0 shadow-xl rounded-2xl p-6">
          <AchievementBadges
            totalXp={totalPoints || 0}
            homeworkCompleted={achievementData?.homeworkCompleted || 0}
            perfectAttendanceWeeks={achievementData?.perfectWeeks || 0}
            currentStreak={streakData.currentStreak}
            longestStreak={streakData.longestStreak}
            classesAttended={achievementData?.classesAttended || 0}
            featuredBadgeId={featuredBadgeId ?? undefined}
            onFeatureBadge={(id) => {
              setFeaturedBadgeId(id);
              if (id) localStorage.setItem("featured_badge_id", id);
              else localStorage.removeItem("featured_badge_id");
            }}
          />
        </motion.div>

        {/* Quick Stats Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            className="glass-lg border-0 shadow-xl rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  className="p-3 rounded-xl bg-gradient-to-br from-secondary/30 to-muted/30"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Rocket className="h-6 w-6 text-secondary-foreground" />
                </motion.div>
                <CardDescription className="text-base font-medium">Upcoming Adventures</CardDescription>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                <CardTitle className="text-5xl font-black bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  {upcomingSessions?.length || 0}
                </CardTitle>
              </motion.div>
              <p className="text-sm text-muted-foreground">Classes this week</p>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            className="glass-lg border-0 shadow-xl rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  className="p-3 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/30"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                >
                  <Target className="h-6 w-6 text-accent-foreground" />
                </motion.div>
                <CardDescription className="text-base font-medium">Active Quests</CardDescription>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <CardTitle className="text-5xl font-black bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                  {pendingHomework?.length || 0}
                </CardTitle>
              </motion.div>
              <p className="text-sm text-muted-foreground">Homework to complete</p>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            onClick={() => navigate('/tuition')} 
            className="glass-lg border-0 shadow-xl rounded-2xl p-6 backdrop-blur-xl cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-muted/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <motion.div 
                  className="p-3 rounded-xl bg-gradient-to-br from-warning/30 to-accent/30"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <DollarSign className="h-6 w-6 text-warning" />
                </motion.div>
                <CardDescription className="text-base font-medium">Balance</CardDescription>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                <CardTitle className={`text-3xl sm:text-4xl font-black mb-2 ${tuitionData?.carryOutDebt ? 'text-destructive' : tuitionData?.carryOutCredit ? 'text-success' : 'bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent'}`}>
                  {tuitionData?.carryOutDebt 
                    ? formatVND(tuitionData.carryOutDebt)
                    : tuitionData?.carryOutCredit
                      ? `-${formatVND(tuitionData.carryOutCredit)}`
                      : formatVND(0)}
                </CardTitle>
              </motion.div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {dayjs().format("MMMM")} 
                <span className="text-xs glass-sm px-2 py-0.5 rounded-full">View →</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Quest Board & Sessions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quest Board (Homework) */}
          <motion.div 
            variants={itemVariants}
            className="glass-lg border-0 shadow-xl rounded-2xl overflow-hidden"
          >
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-2xl">📋</span>
                  </motion.div>
                  <CardTitle className="text-xl font-bold">Quest Board</CardTitle>
                </div>
                <Link to="/student/assignments">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              
              {pendingHomework && pendingHomework.length > 0 ? (
                <div className="space-y-3">
                  {pendingHomework.slice(0, 3).map((hw: any, index: number) => (
                    <QuestCard
                      key={hw.id}
                      id={hw.id}
                      title={hw.title}
                      className={hw.classes?.name || 'Class'}
                      dueDate={hw.due_date}
                      xpReward={20}
                      type="homework"
                      status={hw.due_date && dayjs(hw.due_date).isBefore(dayjs()) ? "overdue" : "pending"}
                      onClick={() => navigate('/student/assignments')}
                    />
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="glass-muted rounded-xl p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-5xl mb-4 block">🎉</span>
                  <p className="text-lg font-medium text-foreground mb-1">All Quests Complete!</p>
                  <p className="text-muted-foreground text-sm">You're all caught up. Great job!</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div 
            variants={itemVariants}
            className="glass-lg border-0 shadow-xl rounded-2xl overflow-hidden"
          >
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-2xl">🚀</span>
                  </motion.div>
                  <CardTitle className="text-xl font-bold">Upcoming Adventures</CardTitle>
                </div>
                <Link to="/student/dashboard?tab=schedule">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Schedule <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              
              {upcomingSessions && upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map((session: any, index: number) => (
                    <motion.div 
                      key={session.id} 
                      className="glass p-4 rounded-xl flex justify-between items-center hover:shadow-lg transition-all duration-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <span className="text-xl">🎓</span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{session.classes?.name || "Class"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {dayjs(session.date).format("MMM D")} • {session.start_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayjs(session.date).isSame(dayjs(), 'day') && (
                          <Badge className="bg-success text-success-foreground">Today!</Badge>
                        )}
                        <span className="text-xs text-warning font-bold">+15 XP</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="glass-muted rounded-xl p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-5xl mb-4 block">📅</span>
                  <p className="text-lg font-medium text-foreground mb-1">No upcoming sessions</p>
                  <p className="text-muted-foreground text-sm">Enjoy your free time!</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Class Rankings */}
        {enrolledClasses && enrolledClasses.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10"
                whileHover={{ scale: 1.1, rotate: 10 }}
              >
                <Trophy className="h-8 w-8 text-warning" />
              </motion.div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Class Champions
                </h2>
                <p className="text-sm text-muted-foreground">Climb the leaderboard and earn XP!</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {enrolledClasses.map((enrollment: any, index: number) => {
                const classData = enrollment.classes;
                
                if (!classData?.id) return null;
                
                const classEconomy = (classData as any);
                
                return (
                  <motion.div 
                    key={enrollment.id} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {classEconomy?.economy_mode && (
                      <StudentWallet
                        studentId={studentId}
                        classId={classData.id}
                        className={classData.name}
                        totalPoints={totalPoints || 0}
                        economyMode={classEconomy.economy_mode}
                        pointsToCashRate={classEconomy.points_to_cash_rate || 50}
                      />
                    )}
                    <div className="glass-lg border-0 shadow-xl rounded-2xl overflow-hidden">
                      <StudentClassLeaderboard 
                        classId={classData.id} 
                        className={classData.name}
                        currentStudentId={studentId}
                      />
                    </div>
                  </motion.div>
                );
              }).filter(Boolean)}
            </div>
          </motion.div>
        )}

        {/* Quick Access Cards */}
        <motion.div 
          variants={itemVariants}
          className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4"
        >
          {[
            { to: "/student/dashboard?tab=schedule", icon: "📅", title: "My Classes", desc: "View your classes", gradient: "from-primary/20 to-primary/5" },
            { to: "/student/assignments", icon: "📚", title: "Quests", desc: "Complete homework", gradient: "from-accent/20 to-accent/5" },
            { to: "/student/journal", icon: "📓", title: "Journal", desc: "Write entries", gradient: "from-success/20 to-success/5" },
            { to: "/tuition", icon: "💰", title: "Tuition", desc: "View payments", gradient: "from-warning/20 to-warning/5" },
          ].map((item, index) => (
            <Link key={item.to} to={item.to}>
              <motion.div 
                className={`glass-lg border-0 shadow-xl rounded-2xl p-6 cursor-pointer group relative overflow-hidden h-full bg-gradient-to-br ${item.gradient}`}
                whileHover={{ scale: 1.05, y: -4 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="relative">
                  <motion.div 
                    className="text-4xl mb-4"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {item.icon}
                  </motion.div>
                  <CardTitle className="text-lg sm:text-xl font-bold mb-1">{item.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{item.desc}</CardDescription>
                </div>
                <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </Link>
          ))}
        </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-6">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="glass-lg border-0 shadow-xl rounded-2xl p-6">
                <AchievementBadges
                  totalXp={totalPoints || 0}
                  homeworkCompleted={achievementData?.homeworkCompleted || 0}
                  perfectAttendanceWeeks={achievementData?.perfectWeeks || 0}
                  currentStreak={streakData.currentStreak}
                  longestStreak={streakData.longestStreak}
                  classesAttended={achievementData?.classesAttended || 0}
                  featuredBadgeId={featuredBadgeId ?? undefined}
                  onFeatureBadge={(id) => {
                    setFeaturedBadgeId(id);
                    if (id) localStorage.setItem("featured_badge_id", id);
                    else localStorage.removeItem("featured_badge_id");
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">Tap an earned badge to feature it! ⭐</p>
              </div>
              
              {/* Shareable Profile Card */}
              <div className="glass-lg border-0 shadow-xl rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>📸</span> Your Profile Card
                </h3>
                <ProfileShareCard
                  name={studentProfile.full_name}
                  avatarUrl={studentProfile.avatar_url}
                  level={levelInfo.level}
                  totalXp={totalPoints || 0}
                  currentStreak={streakData.currentStreak}
                  statusMessage={(studentProfile as any).status_message}
                />
              </div>

              <div className="glass-lg border-0 shadow-xl rounded-2xl p-6">
                <HowToEarnXP />
              </div>
            </motion.div>
          </TabsContent>

          {/* Exam Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <motion.div
              className="glass-lg border-0 shadow-xl rounded-2xl p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                  <span className="text-2xl">📄</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">My Exam Reports</h2>
                  <p className="text-sm text-muted-foreground">Reports posted by your teachers — read online or download as PDF.</p>
                </div>
              </div>
              <StudentExamReportsTab studentId={studentId} />
            </motion.div>
          </TabsContent>

          {/* My Classes / Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <motion.div
              className="glass-lg border-0 shadow-xl rounded-2xl p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">My Classes</h2>
                  <p className="text-sm text-muted-foreground">Your schedule, attendance & homework all in one place!</p>
                </div>
              </div>
              <StudentScheduleCalendar studentId={studentId} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="glass-lg border-0 shadow-2xl max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Edit Your Profile
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <StudentProfileEdit studentId={studentId} />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
