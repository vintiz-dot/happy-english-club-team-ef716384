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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";

// New kid-friendly components
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { DailyStreakCard } from "@/components/student/DailyStreakCard";
import { DailyChallengesCard } from "@/components/student/DailyChallengesCard";
import { LevelProgressRing } from "@/components/student/LevelProgressRing";
import { HomeworkCard } from "@/components/student/homework/HomeworkCard";
import HomeworkDetailDialog from "@/components/student/HomeworkDetailDialog";
import { CelebrationOverlay } from "@/components/student/CelebrationOverlay";
import { HowToEarnXP } from "@/components/student/HowToEarnXP";
import { AchievementBadges } from "@/components/student/AchievementBadges";
import { WeeklyProgressCard } from "@/components/student/WeeklyProgressCard";
import { LessonOverviewsCard } from "@/components/student/LessonOverviewsCard";
import { StudentScheduleCalendar } from "@/components/student/StudentScheduleCalendar";
import { ProfileShareCard } from "@/components/student/ProfileShareCard";
import { InactiveStudentLanding } from "@/components/student/InactiveStudentLanding";
import { StudentWallet } from "@/components/student/StudentWallet";
import { DemoDashboard } from "@/components/student/DemoDashboard";
import { MonitorStatusCard } from "@/components/student/MonitorStatusCard";
import { useStudentMonitorClasses } from "@/hooks/useClassMonitor";
import { StudentExamReportsTab } from "@/components/exam-reports/StudentExamReportsTab";
import { HeroCommandDeck } from "@/components/student/nova/HeroCommandDeck";
import { NovaStatCard } from "@/components/student/nova/NovaStatCard";
import { QuickActionDock, type DockAction } from "@/components/student/nova/QuickActionDock";
import { SectionHeading } from "@/components/student/nova/SectionHeading";
import { BUTTON_QUIET, CARD, CARD_TITLE } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";

// Animation variants. "Ivory" design system: the page arrives once, as one
// slow fade with an 8 px rise; the cards do not each fly in (DESIGN_SYSTEM section 9).
const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
  }
} as const;

const itemVariants = {
  hidden: {},
  visible: {}
};

/**
 * Grades 1-3 get the design system's young scale (bigger type, 56 px targets,
 * the warm honey surface). Read from date_of_birth, which this screen already
 * loads: a Vietnamese child starts Grade 1 in the September of the year they
 * turn 6, so in school year Y (Sept Y - Aug Y+1) the grade is Y - birth year - 5.
 * Younger children count as young too. No date of birth: the standard scale.
 */
function isYoungLearner(dateOfBirth?: string | null): boolean {
  const born = Number((dateOfBirth || "").slice(0, 4));
  if (!born) return false;
  const now = dayjs();
  const schoolYear = now.month() >= 8 ? now.year() : now.year() - 1;
  return schoolYear - born - 5 <= 3;
}

import { calculateLevel, getLevelTitle } from "@/lib/levelUtils";
import { useAuth } from "@/hooks/useAuth";

// Launcher tiles for the quick-action dock (presentational config).
const QUICK_ACTIONS: DockAction[] = [
  { to: "/student/dashboard?tab=schedule", emoji: "📅", title: "My Classes", desc: "Timetable", gradient: "from-blue-500 to-cyan-500" },
  { to: "/student/assignments", emoji: "📚", title: "Quests", desc: "Homework", gradient: "from-violet-500 to-fuchsia-600" },
  { to: "/student/lessons", emoji: "✨", title: "Lessons", desc: "What we did", gradient: "from-emerald-500 to-teal-600" },
  { to: "/student/vocabulary", emoji: "🧠", title: "Vocabulary", desc: "Word bank", gradient: "from-pink-500 to-rose-600" },
  { to: "/student/defend-level", emoji: "🛡️", title: "My Level", desc: "Defend it", gradient: "from-indigo-500 to-violet-600" },
  { to: "/tuition", emoji: "💰", title: "Tuition", desc: "Payments", gradient: "from-amber-500 to-orange-600" },
];

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
  const [openHomework, setOpenHomework] = useState<any>(null);
  const [featuredBadgeId, setFeaturedBadgeId] = useState<string | null>(() => {
    try { return localStorage.getItem("featured_badge_id"); } catch { return null; }
  });
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "dashboard");
  const greeting = useMemo(() => getGreeting(), []);
  const reduceMotion = useReducedMotion();

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
      {/* "Ivory" design system scope (docs/DESIGN_SYSTEM.md): only this screen carries it at the checkpoint. */}
      <div
        data-hec-theme="ivory"
        data-hec-scale={isYoungLearner((studentProfile as any).date_of_birth) ? "young" : undefined}
        className="relative"
      >
      {/* Celebration Overlay */}
      <CelebrationOverlay
        show={showCelebration}
        type="level_up"
        title="Level Up!"
        subtitle="You've reached a new level!"
        onComplete={() => setShowCelebration(false)}
      />

      {/* The paper: one calm, solid page colour behind the whole screen (no glow, no starfield). */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-hec-paper" aria-hidden />

      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-2 space-y-8 sm:mt-6 lg:space-y-12">
        {/* Hero */}
        <HeroCommandDeck
          firstName={studentProfile.full_name.split(' ')[0]}
          fullName={studentProfile.full_name}
          avatarUrl={studentProfile.avatar_url}
          statusMessage={(studentProfile as any).status_message}
          greeting={greeting}
          levelTitle={getLevelTitle(levelInfo.level)}
          level={levelInfo.level}
          currentXp={levelInfo.currentXp}
          nextLevelXp={levelInfo.nextLevelXp}
          progress={levelInfo.progress}
          totalXp={totalPoints || 0}
          streak={streakData.currentStreak}
          pendingHomework={pendingHomework?.length || 0}
          classesThisWeek={upcomingSessions?.length || 0}
          isMonitor={isMonitor}
          onEditProfile={() => setShowEditProfile(true)}
        />

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

        {/* Recent lessons — summary, materials, homework from class transcripts */}
        <motion.div variants={itemVariants}>
          <LessonOverviewsCard studentId={studentId} />
        </motion.div>

        {/* Stats Row - Streak & Challenges */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <motion.div variants={itemVariants} className={CARD}>
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

        {/* Quick Stats -- Nova tiles. On a phone the hero already shows classes and open quests, so only Balance is new. */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="hidden sm:block [&>*]:h-full">
          <NovaStatCard
            icon={Rocket}
            label="Upcoming Adventures"
            value={upcomingSessions?.length || 0}
            caption="Classes this week"
            gradient="from-blue-500 to-cyan-500"
            delay={0.05}
          />
          </div>
          <div className="hidden sm:block [&>*]:h-full">
          <NovaStatCard
            icon={Target}
            label="Active Quests"
            value={pendingHomework?.length || 0}
            caption="Homework to complete"
            gradient="from-violet-500 to-fuchsia-600"
            delay={0.12}
          />
          </div>
          <NovaStatCard
            icon={Wallet}
            label="Balance"
            value={
              tuitionData?.carryOutDebt
                ? formatVND(tuitionData.carryOutDebt)
                : tuitionData?.carryOutCredit
                  ? `-${formatVND(tuitionData.carryOutCredit)}`
                  : formatVND(0)
            }
            caption={`${dayjs().format("MMMM")} - tap to view`}
            gradient="from-amber-500 to-orange-600"
            valueClassName={
              tuitionData?.carryOutDebt
                ? "text-hec-danger"
                : tuitionData?.carryOutCredit
                  ? "text-hec-ink"
                  : "text-hec-ink"
            }
            onClick={() => navigate('/tuition')}
            delay={0.19}
          />
        </div>

        {/* Quest Board & Sessions */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Quest Board (Homework) */}
          <motion.section
            variants={itemVariants}
            className={CARD}
          >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                  <h2 className={CARD_TITLE}>My Homework</h2>
                </div>
                <Link to="/student/assignments" className={cn(BUTTON_QUIET, "shrink-0 px-3 text-hec-small text-hec-ink-soft hover:text-hec-ink")}>
                  See all <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              {pendingHomework && pendingHomework.length > 0 ? (
                <div className="space-y-3">
                  {pendingHomework.slice(0, 3).map((hw: any, index: number) => (
                    <HomeworkCard key={hw.id} homework={hw} index={index} compact ivory onOpen={() => setOpenHomework(hw)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-hec-md bg-hec-sunken/60 px-6 py-8 text-center">
                  <span className="mb-3 block text-3xl" aria-hidden>🎉</span>
                  <p className="mb-1 text-hec-h3 font-semibold text-hec-ink">All Quests Complete!</p>
                  <p className="text-hec-small text-hec-ink-soft">You're all caught up. Great job!</p>
                </div>
              )}
          </motion.section>

          {/* Upcoming Sessions */}
          <motion.section
            variants={itemVariants}
            className={CARD}
          >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Calendar className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                  <h2 className={CARD_TITLE}>Next classes</h2>
                </div>
                <Link to="/student/dashboard?tab=schedule" className={cn(BUTTON_QUIET, "shrink-0 px-3 text-hec-small text-hec-ink-soft hover:text-hec-ink")}>
                  Schedule <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              {upcomingSessions && upcomingSessions.length > 0 ? (
                <ul className="divide-y divide-hec-line">
                  {upcomingSessions.map((session: any) => (
                    <li
                      key={session.id}
                      className="flex min-h-hec-target items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hec-sunken" aria-hidden>
                          <BookOpen className="h-5 w-5 text-hec-ink-soft" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="whitespace-normal break-words font-medium text-hec-ink">{session.classes?.name || "Class"}</p>
                          <p className="flex items-center gap-2 text-hec-small tabular-nums text-hec-ink-soft">
                            <Clock className="h-4 w-4 shrink-0" aria-hidden />
                            {dayjs(session.date).format("MMM D")} • {session.start_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        {dayjs(session.date).isSame(dayjs(), 'day') && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-hec-leaf/30 bg-hec-leaf-tint px-3 py-1 text-hec-caption font-medium text-hec-leaf">Today!</span>
                        )}
                        <span className="whitespace-nowrap text-hec-caption tabular-nums text-hec-ink-soft">+15 XP</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-hec-md bg-hec-sunken/60 px-6 py-8 text-center">
                  <span className="mb-3 block text-3xl" aria-hidden>📅</span>
                  <p className="mb-1 text-hec-h3 font-semibold text-hec-ink">No upcoming sessions</p>
                  <p className="text-hec-small text-hec-ink-soft">Enjoy your free time!</p>
                </div>
              )}
          </motion.section>
        </div>

        {/* Class Rankings */}
        {enrolledClasses && enrolledClasses.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4">
            <SectionHeading
              icon={Trophy}
              title="Class Champions"
              subtitle="Climb the leaderboard and earn XP!"
              gradient="from-amber-400 to-orange-600"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {enrolledClasses.map((enrollment: any, index: number) => {
                const classData = enrollment.classes;

                if (!classData?.id) return null;

                const classEconomy = (classData as any);

                return (
                  <div
                    key={enrollment.id}
                    className="space-y-4"
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
                    <StudentClassLeaderboard
                      ivory
                      classId={classData.id}
                      className={classData.name}
                      currentStudentId={studentId}
                    />
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </motion.div>
        )}

        {/* Quick action dock */}
        <motion.div variants={itemVariants}>
          <QuickActionDock actions={QUICK_ACTIONS} />
        </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-6">
            <div className="space-y-8">
              <section className={CARD}>
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
                <p className="mt-2 text-center text-hec-caption text-hec-ink-soft">Tap an earned badge to feature it! ⭐</p>
              </section>

              {/* Shareable Profile Card */}
              <section className={CARD}>
                <h2 className={cn(CARD_TITLE, "mb-4")}>
                  Your Profile Card
                </h2>
                <ProfileShareCard
                  name={studentProfile.full_name}
                  avatarUrl={studentProfile.avatar_url}
                  level={levelInfo.level}
                  totalXp={totalPoints || 0}
                  currentStreak={streakData.currentStreak}
                  statusMessage={(studentProfile as any).status_message}
                />
              </section>

              <section className={CARD}>
                <HowToEarnXP />
              </section>
            </div>
          </TabsContent>

          {/* Exam Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <section className={cn(CARD, "space-y-4")}>
              <div className="mb-2 flex items-start gap-3">
                <FileText className="mt-1.5 h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                <div className="min-w-0">
                  <h2 className={CARD_TITLE}>My Exam Reports</h2>
                  <p className="text-hec-small text-hec-ink-soft">Reports posted by your teachers — read online or download as PDF.</p>
                </div>
              </div>
              <StudentExamReportsTab studentId={studentId} />
            </section>
          </TabsContent>

          {/* My Classes / Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <section className={cn(CARD, "space-y-4")}>
              <div className="mb-2 flex items-start gap-3">
                <Calendar className="mt-1.5 h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                <div className="min-w-0">
                  <h2 className={CARD_TITLE}>My Classes</h2>
                  <p className="text-hec-small text-hec-ink-soft">Your schedule, attendance & homework all in one place!</p>
                </div>
              </div>
              <StudentScheduleCalendar studentId={studentId} />
            </section>
          </TabsContent>
        </Tabs>
      </motion.div>

      {openHomework && studentId && (
        <HomeworkDetailDialog homework={openHomework} studentId={studentId} onClose={() => setOpenHomework(null)} />
      )}

      {/* Edit Profile Dialog: portalled under <body>, so it carries the scope itself. */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent
          data-hec-theme="ivory"
          className="max-h-[85dvh] max-w-4xl overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised text-hec-ink shadow-hec-3"
        >
          <DialogHeader>
            <DialogTitle className={CARD_TITLE}>
              Edit Your Profile
            </DialogTitle>
          </DialogHeader>
          <div>
            <StudentProfileEdit studentId={studentId} />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
