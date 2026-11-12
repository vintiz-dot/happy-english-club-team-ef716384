import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DurationVarianceNotice } from "@/components/shared/DurationVarianceNotice";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  BookOpen, 
  Edit, 
  FileText, 
  Trophy, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Users,
  Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import TeacherScheduleCalendar from "@/components/teacher/TeacherScheduleCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeacherProfileEdit } from "@/components/teacher/TeacherProfileEdit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvatarUrl } from "@/lib/avatars";
import { ClassLeaderboardShared } from "@/components/shared/ClassLeaderboardShared";
import { ManualPointsDialog } from "@/components/shared/ManualPointsDialog";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { effectiveRateVnd, rateUnit } from "@/lib/payRate";
import { VideoReviewQueue } from "@/components/video-homework/VideoReviewQueue";
import { cn } from "@/lib/utils";

// Class strings (DESIGN_SYSTEM s.13-15). Numbers are sans and tabular; names wrap, never cut.
const STAT_TILE = "rounded-hec-md bg-hec-sunken p-2";
const STAT_NUMBER = "font-sans text-hec-h1 font-semibold tabular-nums whitespace-nowrap text-hec-ink";
const STAT_LABEL = "text-hec-small text-hec-ink-soft";
const SECTION_TITLE = "flex items-center gap-2 font-display text-hec-h2 font-medium text-hec-ink";
const LINK_CARD =
  "block rounded-hec-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
const NAME = "min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink";

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentMonth = dayjs().format("YYYY-MM");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user } = useAuth();

  // Single auth + teacher lookup, shared by all queries
  const { data: teacherProfile } = useQuery({
    queryKey: ["teacher-dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      // Try teacher first
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teacher) return { ...teacher, staffType: "teacher" as const };

      // Try teaching assistant
      const { data: ta } = await supabase
        .from("teaching_assistants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ta) return { ...ta, staffType: "teaching_assistant" as const };

      return null;
    },
  });

  const teacherId = teacherProfile?.id;

  const isTA = teacherProfile?.staffType === "teaching_assistant";

  const { data: todaySessions } = useQuery({
    queryKey: ["teacher-today-sessions", teacherId, isTA],
    enabled: !!teacherId,
    queryFn: async () => {
      const today = dayjs().format("YYYY-MM-DD");

      if (isTA) {
        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(id, date, start_time, end_time, status, classes!inner(name, id))`)
          .eq("teaching_assistant_id", teacherId!)
          .eq("participant_type", "teaching_assistant")
          .eq("sessions.date", today);

        return (data || []).map((sp: any) => sp.sessions);
      }

      const { data } = await supabase
        .from("sessions")
        .select(`id, date, start_time, end_time, status, classes!inner(name, id)`)
        .eq("teacher_id", teacherId!)
        .eq("date", today)
        .order("start_time", { ascending: true });

      return data || [];
    },
  });

  const { data: activeClasses } = useQuery({
    queryKey: ["teacher-active-classes", teacherId, isTA],
    enabled: !!teacherId,
    queryFn: async () => {
      if (isTA) {
        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(class_id, date, classes!inner(id, name))`)
          .eq("teaching_assistant_id", teacherId!)
          .eq("participant_type", "teaching_assistant")
          .gte("sessions.date", dayjs().format("YYYY-MM-DD"));

        const classMap = new Map();
        data?.forEach((sp: any) => {
          const classData = sp.sessions?.classes;
          if (classData && !classMap.has(classData.id)) {
            classMap.set(classData.id, classData);
          }
        });
        return Array.from(classMap.values());
      }

      const { data } = await supabase
        .from("sessions")
        .select(`class_id, classes!inner(id, name)`)
        .eq("teacher_id", teacherId!)
        .gte("date", dayjs().format("YYYY-MM-DD"));

      const classMap = new Map();
      data?.forEach(s => {
        const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
        if (classData && !classMap.has(classData.id)) {
          classMap.set(classData.id, classData);
        }
      });

      return Array.from(classMap.values());
    },
  });

  const { data: pendingGrading } = useQuery({
    queryKey: ["teacher-pending-grading", teacherId, isTA],
    enabled: !!teacherId,
    queryFn: async () => {
      let classIds: string[] = [];
      if (isTA) {
        const { data: spData } = await supabase
          .from("session_participants")
          .select("sessions!inner(class_id)")
          .eq("teaching_assistant_id", teacherId!)
          .eq("participant_type", "teaching_assistant");
        classIds = [...new Set((spData || []).map((sp: any) => sp.sessions?.class_id).filter(Boolean))];
      } else {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("class_id")
          .eq("teacher_id", teacherId!);
        classIds = [...new Set(sessions?.map(s => s.class_id))];
      }
      if (classIds.length === 0) return 0;

      const { data: homeworks } = await supabase
        .from("homeworks")
        .select("id")
        .in("class_id", classIds);

      const homeworkIds = homeworks?.map(h => h.id) || [];
      if (homeworkIds.length === 0) return 0;

      const { count } = await supabase
        .from("homework_submissions")
        .select("*", { count: "exact", head: true })
        .in("homework_id", homeworkIds)
        .eq("status", "submitted");

      return count || 0;
    },
  });

  const { data: payrollData } = useQuery({
    queryKey: ["teacher-payroll", currentMonth, teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: currentMonth, teacherId: teacherId! },
      });

      if (error) throw error;
      return { ...data?.payrollData?.[0], teacherId };
    },
  });

  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel('teacher-dashboard-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teacher-payroll", currentMonth, teacherId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, currentMonth]);

  const getTimeStatus = (startTime: string, endTime: string) => {
    const now = dayjs();
    const start = dayjs(`${dayjs().format("YYYY-MM-DD")} ${startTime}`);
    const end = dayjs(`${dayjs().format("YYYY-MM-DD")} ${endTime}`);
    
    if (now.isBefore(start)) return "upcoming";
    if (now.isAfter(end)) return "completed";
    return "ongoing";
  };

  const progressPercent = payrollData?.sessionsCountProjected 
    ? Math.round((payrollData?.sessionsCountActual || 0) / payrollData.sessionsCountProjected * 100)
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }
  };

  const quickActions = [
    {
      to: "/teacher/attendance",
      icon: CheckCircle2,
      title: "Attendance",
      description: "Mark student attendance",
    },
    {
      to: "/teacher/assignments",
      icon: FileText,
      title: "Assignments",
      description: "Manage homework & grading",
    },
    {
      to: "/teacher/journal",
      icon: BookOpen,
      title: "Journal",
      description: "Student progress notes",
    },
    {
      to: "/teacher/payroll",
      icon: DollarSign,
      title: "Payroll",
      description: "View earnings & sessions",
    },
  ];

  return (
    <Layout title="Dashboard">
      <motion.div
        className="space-y-8 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Section */}
        {teacherProfile && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
                  <Avatar className="h-20 w-20 shrink-0 border border-hec-line sm:h-24 sm:w-24">
                    <AvatarImage src={getAvatarUrl(teacherProfile.avatar_url) || undefined} alt={teacherProfile.full_name} className="object-cover" />
                    <AvatarFallback className="bg-hec-sunken text-hec-h1 font-semibold text-hec-ink-soft">
                      {teacherProfile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Profile Info */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="min-w-0 whitespace-normal break-words hyphens-none text-balance font-display text-hec-display font-medium text-hec-ink">
                        {teacherProfile.full_name}
                      </h1>
                      <Badge
                        variant={teacherProfile.is_active ? "success" : "secondary"}
                        className="shrink-0"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {teacherProfile.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-hec-small text-hec-ink-soft">
                      {teacherProfile.email && (
                        <span className="flex min-w-0 items-center gap-2 break-all">
                          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-hec-line-strong" aria-hidden />
                          {teacherProfile.email}
                        </span>
                      )}
                      {teacherProfile.phone && (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-hec-line-strong" aria-hidden />
                          {teacherProfile.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">
                      <DollarSign className="h-4 w-4 text-hec-ink-soft" aria-hidden />
                      <span className="whitespace-nowrap">{effectiveRateVnd(teacherProfile).toLocaleString()} ₫</span>
                      <span className="text-hec-small font-normal text-hec-ink-soft">
                        /{rateUnit(teacherProfile)}
                      </span>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <Button
                    onClick={() => setShowEditProfile(true)}
                    variant="outline"
                    size="lg"
                    className="w-full shrink-0 gap-2 md:w-auto"
                  >
                    <Edit className="h-4 w-4" aria-hidden />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Video homework waiting for review (renders nothing when empty) */}
        <motion.div variants={itemVariants}>
          <VideoReviewQueue />
          <div className="mt-2 flex justify-end">
            <Button asChild variant="ghost" size="sm"><Link to="/teacher/videos">Video homework progress →</Link></Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {/* Today's Sessions */}
          <Card>
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={STAT_TILE}>
                  <Calendar className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                </div>
                <Badge variant="secondary">Today</Badge>
              </div>
              <div className="space-y-1">
                <p className={STAT_NUMBER}>{todaySessions?.length || 0}</p>
                <p className={STAT_LABEL}>Sessions</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Classes */}
          <Card>
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={STAT_TILE}>
                  <GraduationCap className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                </div>
              </div>
              <div className="space-y-1">
                <p className={STAT_NUMBER}>{activeClasses?.length || 0}</p>
                <p className={STAT_LABEL}>Active Classes</p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Grading */}
          <Card>
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={STAT_TILE}>
                  <AlertCircle className="h-5 w-5 text-hec-warn" aria-hidden />
                </div>
                {(pendingGrading || 0) > 0 && (
                  <span className="inline-flex rounded-full h-2.5 w-2.5 bg-hec-warn" aria-hidden />
                )}
              </div>
              <div className="space-y-1">
                <p className={STAT_NUMBER}>{pendingGrading || 0}</p>
                <p className={STAT_LABEL}>Pending Grading</p>
              </div>
            </CardContent>
          </Card>

          {/* Earned Amount */}
          <Card>
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={STAT_TILE}>
                  <TrendingUp className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                </div>
              </div>
              <div className="space-y-1">
                <p className={STAT_NUMBER}>{((payrollData?.totalAmountActual || 0) / 1000).toFixed(0)}K</p>
                <p className={STAT_LABEL}>Earned (VND)</p>
              </div>
            </CardContent>
          </Card>

          {/* Projected Total */}
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={STAT_TILE}>
                  <Zap className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                </div>
                <span className="font-sans text-hec-caption tabular-nums text-hec-ink-soft">{progressPercent}%</span>
              </div>
              <div className="space-y-2">
                <p className={STAT_NUMBER}>{((payrollData?.totalAmountProjected || 0) / 1000).toFixed(0)}K</p>
                <DurationVarianceNotice
                  className="mt-1"
                  count={payrollData?.discrepancyCount || 0}
                  varianceAmount={payrollData?.varianceAmountProjected}
                />
                <p className={cn(STAT_LABEL, "mb-2")}>Projected (VND)</p>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Classes Grid */}
        {activeClasses && activeClasses.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={SECTION_TITLE}>
                <GraduationCap className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                My Classes
              </h3>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeClasses.map((classData: any, index: number) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/teacher/classes/${classData.id}`} className={LINK_CARD}>
                    <Card className="h-full transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 cursor-pointer">
                      <CardContent className="p-4 sm:p-4 flex items-start gap-3">
                        <div className={cn(STAT_TILE, "p-3 shrink-0")}>
                          <BookOpen className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={NAME}>{classData.name}</h4>
                          <p className={STAT_LABEL}>Calendar · Roster · Leaderboard</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-hec-ink-faint shrink-0 self-center" aria-hidden />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Agenda */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn(STAT_TILE, "shrink-0")}>
                      <Clock className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <CardTitle>Today's Agenda</CardTitle>
                      <CardDescription>{dayjs().format("dddd, MMMM D, YYYY")}</CardDescription>
                    </div>
                  </div>
                  <Button asChild size="sm" className="gap-1">
                    <Link to="/teacher/attendance">
                      Mark All <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todaySessions && todaySessions.length > 0 ? (
                  <div className="space-y-3">
                    {todaySessions.map((session: any, index: number) => {
                      const timeStatus = getTimeStatus(session.start_time, session.end_time);
                      const classId = Array.isArray(session.classes) ? session.classes[0]?.id : session.classes?.id;
                      return (
                         <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => classId && navigate(`/teacher/classes/${classId}`)}
                          className={`group relative flex flex-wrap items-center gap-3 p-4 rounded-hec-md border transition-colors duration-hec-1 ease-hec cursor-pointer ${
                            timeStatus === "ongoing"
                              ? "bg-hec-surface border-hec-brass"
                              : timeStatus === "completed"
                              ? "bg-hec-sunken border-hec-line"
                              : "bg-hec-surface border-hec-line hover:bg-hec-sunken/60"
                          }`}
                        >
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center gap-1" aria-hidden>
                            <div className={`w-3 h-3 rounded-full ${
                              timeStatus === "ongoing" ? "bg-hec-brass" :
                              timeStatus === "completed" ? "bg-hec-ink-faint" : "bg-hec-line-strong"
                            }`} />
                            {index < todaySessions.length - 1 && (
                              <div className="w-px h-8 bg-hec-line" />
                            )}
                          </div>

                          {/* Session Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className={NAME}>{session.classes.name}</h4>
                              {timeStatus === "ongoing" && (
                                <Badge variant="outline" className="shrink-0">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                            <p className="font-sans text-hec-small tabular-nums text-hec-ink-soft">
                              {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                            </p>
                          </div>

                          {/* Quick-Mark Attendance Button */}
                          {(timeStatus === "ongoing" || timeStatus === "upcoming") && session.status === "Scheduled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/teacher/attendance?session=${session.id}`);
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                              Attendance
                            </Button>
                          )}

                          {/* Status Badge */}
                          <Badge
                            variant={session.status === "Held" ? "success" : "secondary"}
                            className="shrink-0"
                          >
                            {session.status === "Held" ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : null}
                            {session.status}
                          </Badge>

                          <ChevronRight className="h-4 w-4 text-hec-ink-faint shrink-0" aria-hidden />
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-hec-sunken mb-4">
                      <Calendar className="h-8 w-8 text-hec-ink-faint" aria-hidden />
                    </div>
                    <p className="text-hec-h3 font-semibold text-hec-ink mb-1">No sessions today</p>
                    <p className={cn(STAT_LABEL, "mb-4")}>Enjoy your free day!</p>
                    <Button asChild variant="outline">
                      <Link to="/schedule">View Full Schedule</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className={SECTION_TITLE}>
              <Sparkles className="h-5 w-5 text-hec-ink-soft" aria-hidden />
              Quick Actions
            </h3>
            <div className="grid gap-3">
              {quickActions.map((action, index) => (
                <Link key={action.to} to={action.to} className={LINK_CARD}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 cursor-pointer">
                      <CardContent className="p-4 sm:p-4 flex items-center gap-3">
                        <div className={cn(STAT_TILE, "p-3 shrink-0")}>
                          <action.icon className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-hec-body font-medium text-hec-ink">{action.title}</h4>
                          <p className={cn(STAT_LABEL, "truncate")}>{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-hec-ink-faint shrink-0" aria-hidden />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Schedule & Leaderboards Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
              <TabsTrigger value="schedule">
                <Calendar className="h-4 w-4 mr-2" aria-hidden />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="leaderboards">
                <Trophy className="h-4 w-4 mr-2" aria-hidden />
                Leaderboards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                    Teaching Schedule
                  </CardTitle>
                  <CardDescription>Your upcoming and recent classes</CardDescription>
                </CardHeader>
                <CardContent>
                  <TeacherScheduleCalendar />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboards" className="mt-6 space-y-6">
              {activeClasses && activeClasses.length > 0 ? (
                activeClasses.map((classData: any) => (
                  <Card key={classData.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className={cn(STAT_TILE, "shrink-0")}>
                            <Trophy className="h-5 w-5 text-hec-brass" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="whitespace-normal break-words hyphens-none">{classData.name}</CardTitle>
                            <CardDescription>Class Rankings & Points</CardDescription>
                          </div>
                        </div>
                        <ManualPointsDialog classId={classData.id} isAdmin={false} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ClassLeaderboardShared classId={classData.id} canManagePoints />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="p-4 rounded-full bg-hec-sunken inline-block mb-4">
                      <Users className="h-8 w-8 text-hec-ink-faint" aria-hidden />
                    </div>
                    <p className="text-hec-h3 font-semibold text-hec-ink mb-1">No active classes</p>
                    <p className={STAT_LABEL}>Classes will appear here when you have scheduled sessions</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Edit Profile Dialog */}
      {teacherProfile && (
        <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Your Profile</DialogTitle>
            </DialogHeader>
            <TeacherProfileEdit teacherId={teacherProfile.id} />
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
