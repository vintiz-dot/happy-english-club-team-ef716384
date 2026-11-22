import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { dayjs } from "@/lib/date";
import Layout from "@/components/Layout";
import { Calendar, FileText, Edit, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, lazy, useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StudentProfileEdit } from "@/components/student/StudentProfileEdit";
import { motion, useReducedMotion } from "framer-motion";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";

// New kid-friendly components
import HomeworkDetailDialog from "@/components/student/HomeworkDetailDialog";
import { CelebrationOverlay } from "@/components/student/CelebrationOverlay";
import { HowToEarnXP } from "@/components/student/HowToEarnXP";
import { AchievementBadges } from "@/components/student/AchievementBadges";
import { StudentScheduleCalendar } from "@/components/student/StudentScheduleCalendar";
import { ProfileShareCard } from "@/components/student/ProfileShareCard";
import { InactiveStudentLanding } from "@/components/student/InactiveStudentLanding";
import { DemoDashboard } from "@/components/student/DemoDashboard";
import { MonitorStatusCard } from "@/components/student/MonitorStatusCard";
import { useStudentMonitorClasses } from "@/hooks/useClassMonitor";
import { StudentExamReportsTab } from "@/components/exam-reports/StudentExamReportsTab";
import { fetchStudentHomework, groupHomework, nextAction, studentHomeworkKey, todoCount } from "@/lib/studentHomework";
import { BUTTON_QUIET, CARD, CARD_TITLE, reducedMotion } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import { LookChoice } from "@/components/student/band/LookChoice";
import { GrownUps } from "@/components/student/home/GrownUps";
import { BandHome, MeLinksGate, MovingUpGate } from "@/components/student/home/BandHome";
import type { HomeData } from "@/components/student/home/types";
import { givenName } from "@/lib/givenName";

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

import { getLevelTitle } from "@/lib/levelUtils";
import { useStudentPointsSummary } from "@/hooks/useClassBoard";
import { useAuth } from "@/hooks/useAuth";

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
  const reduceMotion = reducedMotion(useReducedMotion());

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "achievements" || tab === "schedule" || tab === "reports" || tab === "grownups")) {
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

  // Every point ever earned, the level and the per-class totals: the
  // server's (student_points_summary), so this card, the boards and the
  // analytics pop-up show one level. They used three formulas.
  const { data: pointsSummary } = useStudentPointsSummary(studentId);
  const totalPoints = pointsSummary?.all_time ?? 0;

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

  // The same query the homework page runs, so the two share one cache entry.
  const {
    data: homeworkList,
    isLoading: homeworkLoading,
    isError: homeworkError,
    refetch: refetchHomework,
    isFetching: homeworkFetching,
  } = useQuery({
    queryKey: studentHomeworkKey(studentId),
    queryFn: () => fetchStudentHomework(supabase, studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
  const homeworkGroups = useMemo(() => groupHomework(homeworkList ?? []), [homeworkList]);
  const homeworkReady = !!homeworkList && !homeworkError;
  const homeworkTodo = homeworkReady ? todoCount(homeworkGroups) : 0;
  const nextHomework = useMemo(() => nextAction(homeworkGroups), [homeworkGroups]);
  /** Things to do now, in the same order as the homework page. */
  const pendingHomework = useMemo(() => [...homeworkGroups.late, ...homeworkGroups.next], [homeworkGroups]);

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

  const levelInfo = pointsSummary?.hero ?? { level: 1, currentXp: 0, nextLevelXp: 100, progress: 0 };

  // Build dynamic challenges based on real data
  const dynamicChallenges = useMemo(() => {
    const hasCompletedHomework = homeworkReady && homeworkTodo === 0;
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
  }, [homeworkReady, homeworkTodo, upcomingSessions, streakData]);

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
            className="text-center rounded-hec-lg border border-hec-line bg-hec-surface p-12 shadow-hec-1"
          >
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-hec-brass" aria-hidden />
            <p className="text-hec-h2 text-hec-ink-soft">
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

  const home: HomeData = {
    studentId,
    fullName: studentProfile.full_name,
    firstName: givenName(studentProfile.full_name),
    avatarUrl: studentProfile.avatar_url,
    statusMessage: (studentProfile as any).status_message,
    level: levelInfo.level,
    levelTitle: getLevelTitle(levelInfo.level),
    currentXp: levelInfo.currentXp,
    nextLevelXp: levelInfo.nextLevelXp,
    progress: levelInfo.progress,
    totalXp: totalPoints || 0,
    streak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    weekActivity: streakData.weekActivity,
    homework: {
      loading: homeworkLoading,
      error: homeworkError,
      fetching: homeworkFetching,
      ready: homeworkReady,
      todo: homeworkTodo,
      next: nextHomework,
      pending: pendingHomework,
      groups: homeworkGroups,
      all: homeworkList ?? [],
    },
    sessions: upcomingSessions ?? [],
    enrolledClasses: (enrolledClasses as any[]) ?? [],
    isMonitor,
    challenges: dynamicChallenges,
    achievement: {
      homeworkCompleted: achievementData?.homeworkCompleted || 0,
      perfectWeeks: achievementData?.perfectWeeks || 0,
      classesAttended: achievementData?.classesAttended || 0,
    },
    featuredBadgeId,
    onFeatureBadge: (id) => {
      setFeaturedBadgeId(id);
      if (id) localStorage.setItem("featured_badge_id", id);
      else localStorage.removeItem("featured_badge_id");
    },
    onOpenHomework: (hw) => setOpenHomework(hw),
    onRetryHomework: () => refetchHomework(),
    onEditProfile: () => setShowEditProfile(true),
    classPoints: (classId) => Number(pointsSummary?.classes?.find((c) => c.class_id === classId)?.all_time ?? 0),
  };

  return (
    <Layout title="Dashboard">
      {/* "Ivory" design system scope (docs/DESIGN_SYSTEM.md): only this screen carries it at the checkpoint. */}
      <div
        data-hec-theme="ivory"
        className="relative"
      >
      <MovingUpGate />
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
        <MeLinksGate tab={activeTab} />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-2 space-y-6 sm:mt-6">
            <BandHome data={home} monitorClassNames={(monitorClasses ?? []).map((c) => c.className)} />
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

          {/* For grown-ups: tuition, the wallet and every other destination (the three younger bands keep money here) */}
          <TabsContent value="grownups" className="mt-6">
            <GrownUps
              studentId={studentId}
              enrolledClasses={(enrolledClasses as any[]) ?? []}
              classPoints={(classId) => Number(pointsSummary?.classes?.find((c) => c.class_id === classId)?.all_time ?? 0)}
            />
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
          <LookChoice />
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
