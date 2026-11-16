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
import { teacherPayrollView } from "@/lib/teacherPayrollView";
import { VideoReviewQueue } from "@/components/video-homework/VideoReviewQueue";

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

  // This month's figures are calculate-payroll's, for the signed-in person
  // only (the function scopes a teacher or a TA by the JWT and ignores the
  // teacherId sent). Picked by id through teacherPayrollView, never [0]. When
  // the function did not answer - or a deploy older than TA-PAY answers a TA
  // with 403 - the cards say "figure unavailable" rather than 0.
  const { data: payrollView } = useQuery({
    queryKey: ["teacher-payroll", currentMonth, teacherId],
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: currentMonth, teacherId: teacherId! },
      });

      if (error) throw error;
      return teacherPayrollView(data, teacherId);
    },
  });
  // A TA the function answered for with no row had no paid lessons yet.
  const payrollKnown = !!payrollView && (payrollView.found || payrollView.answered);
  const unavailable = <span title="Figure unavailable"><span aria-hidden="true">—</span><span className="sr-only">Figure unavailable</span></span>;

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

  const projectedCount = (payrollView?.heldSessions ?? 0) + (payrollView?.scheduledSessions ?? 0);
  const progressPercent = projectedCount
    ? Math.round((payrollView?.heldSessions ?? 0) / projectedCount * 100)
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  // DS s.9: one slow fade with at most an 8 px rise
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const } }
  };

  // Ivory class strings for this page (DS s.15)
  const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
  const LINK_CARD = `block rounded-hec-lg ${FOCUS}`;
  const CARD_HOVER = "group relative overflow-hidden transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2";
  const ICON_TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken";
  const STAT_VALUE = "font-sans text-hec-h1 font-semibold tabular-nums whitespace-nowrap text-hec-ink";
  const SECTION_TITLE = "font-display text-hec-h2 font-medium text-hec-ink flex items-center gap-2";

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
      {/* Ambient depth is provided globally by Layout's AmbientBackground */}
      <motion.div
        className="space-y-8 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Profile Section */}
        {teacherProfile && (
          <motion.div variants={itemVariants}>
            <Card className="relative overflow-hidden">
              <CardContent className="relative p-4 sm:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <Avatar className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                    <AvatarImage src={getAvatarUrl(teacherProfile.avatar_url) || undefined} alt={teacherProfile.full_name} className="object-cover" />
                    <AvatarFallback className="bg-hec-sunken text-hec-h2 font-semibold text-hec-ink-soft">
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
                        <Sparkles className="h-3.5 w-3.5" />
                        {teacherProfile.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-hec-small text-hec-ink-soft">
                      {teacherProfile.email && (
                        <span className="flex min-w-0 items-center gap-2 break-all">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hec-line-strong" />
                          {teacherProfile.email}
                        </span>
                      )}
                      {teacherProfile.phone && (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hec-line-strong" />
                          {teacherProfile.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2 text-hec-h3 font-semibold text-hec-ink">
                      <DollarSign className="h-5 w-5 shrink-0 self-center text-hec-ink-soft" />
                      {/* This month's rate as calculate-payroll reports it,
                          not the staff row's: the row is only today's and a
                          dated change makes the two differ. */}
                      {payrollView?.rateVnd != null && payrollView.payBasis ? (
                        <>
                          <span className="whitespace-nowrap tabular-nums">{payrollView.rateVnd.toLocaleString()} ₫</span>
                          <span className="text-hec-small font-normal text-hec-ink-soft">
                            /{payrollView.payBasis === "per_session" ? "session" : "hour"}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap tabular-nums">{unavailable}</span>
                      )}
                    </div>
                  </div>

                  {/* Edit Button */}
                  <Button
                    onClick={() => setShowEditProfile(true)}
                    variant="outline"
                    size="lg"
                    className="w-full shrink-0 gap-2 sm:w-auto"
                  >
                    <Edit className="h-4 w-4" />
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
          <Card className="relative overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ICON_TILE}>
                  <Calendar className="h-5 w-5 text-hec-ink-soft" />
                </div>
                <Badge variant="secondary">Today</Badge>
              </div>
              <div className="space-y-1">
                <p className={STAT_VALUE}>{todaySessions?.length || 0}</p>
                <p className="text-hec-small text-hec-ink-soft">Sessions</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Classes */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ICON_TILE}>
                  <GraduationCap className="h-5 w-5 text-hec-ink-soft" />
                </div>
              </div>
              <div className="space-y-1">
                <p className={STAT_VALUE}>{activeClasses?.length || 0}</p>
                <p className="text-hec-small text-hec-ink-soft">Active Classes</p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Grading */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ICON_TILE}>
                  <AlertCircle className={(pendingGrading || 0) > 0 ? "h-5 w-5 text-hec-warn" : "h-5 w-5 text-hec-ink-soft"} />
                </div>
                {(pendingGrading || 0) > 0 && (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-hec-warn" aria-hidden />
                )}
              </div>
              <div className="space-y-1">
                <p className={STAT_VALUE}>{pendingGrading || 0}</p>
                <p className="text-hec-small text-hec-ink-soft">Pending Grading</p>
              </div>
            </CardContent>
          </Card>

          {/* Earned Amount */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ICON_TILE}>
                  <TrendingUp className="h-5 w-5 text-hec-ink-soft" />
                </div>
              </div>
              <div className="space-y-1">
                <p className={STAT_VALUE}>{payrollKnown ? `${((payrollView?.earned ?? 0) / 1000).toFixed(0)}K` : unavailable}</p>
                <p className="text-hec-small text-hec-ink-soft">Earned (VND)</p>
              </div>
            </CardContent>
          </Card>

          {/* Projected Total */}
          <Card className="relative overflow-hidden col-span-2 lg:col-span-1">
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={ICON_TILE}>
                  <Zap className="h-5 w-5 text-hec-ink-soft" />
                </div>
                <span className="text-hec-caption tabular-nums text-hec-ink-soft">{progressPercent}%</span>
              </div>
              <div className="space-y-2">
                <p className={STAT_VALUE}>{payrollKnown ? `${((payrollView?.projectedTotal ?? 0) / 1000).toFixed(0)}K` : unavailable}</p>
                <DurationVarianceNotice
                  className="mt-1"
                  count={payrollView?.discrepancyCount ?? 0}
                  varianceAmount={payrollView?.varianceAmount}
                />
                <p className="text-hec-small text-hec-ink-soft mb-2">Projected (VND)</p>
                <Progress value={progressPercent} className="h-2" aria-label="Sessions held of those projected this month" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Classes Grid */}
        {activeClasses && activeClasses.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={SECTION_TITLE}>
                <GraduationCap className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                My Classes
              </h3>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeClasses.map((classData: any, index: number) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/teacher/classes/${classData.id}`} className={LINK_CARD}>
                    <Card className={`${CARD_HOVER} cursor-pointer`}>
                      <CardContent className="p-4 relative flex items-center gap-4">
                        <div className={ICON_TILE}>
                          <BookOpen className="h-5 w-5 text-hec-ink-soft" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="whitespace-normal break-words text-hec-body font-semibold text-hec-ink">{classData.name}</h4>
                          <p className="text-hec-small text-hec-ink-soft">Calendar · Roster · Leaderboard</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-hec-ink-faint group-hover:text-hec-ink transition-colors duration-hec-1 shrink-0" />
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
                    <div className={ICON_TILE}>
                      <Clock className="h-5 w-5 text-hec-ink-soft" />
                    </div>
                    <div>
                      <CardTitle>Today's Agenda</CardTitle>
                      <CardDescription>{dayjs().format("dddd, MMMM D, YYYY")}</CardDescription>
                    </div>
                  </div>
                  <Link to="/teacher/attendance">
                    <Button size="sm" className="gap-1">
                      Mark All <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
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
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => classId && navigate(`/teacher/classes/${classId}`)}
                          className={`group relative flex flex-wrap items-center gap-3 p-4 rounded-hec-md border transition-colors duration-hec-1 ease-hec cursor-pointer ${
                            timeStatus === "ongoing"
                              ? "border-hec-brass bg-hec-sunken"
                              : timeStatus === "completed"
                              ? "border-hec-line bg-hec-sunken/60 text-hec-ink-soft"
                              : "border-hec-line bg-hec-surface hover:bg-hec-sunken/60"
                          }`}
                        >
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center gap-1 self-stretch">
                            <div className={`w-3 h-3 rounded-full ${
                              timeStatus === "ongoing" ? "bg-hec-brass" :
                              timeStatus === "completed" ? "bg-hec-ink-faint" : "bg-hec-line-strong"
                            }`} />
                            {index < todaySessions.length - 1 && (
                              <div className="w-0.5 flex-1 min-h-8 bg-hec-line" />
                            )}
                          </div>

                          {/* Session Details */}
                          <div className="flex-1 min-w-[10rem]">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="min-w-0 whitespace-normal break-words text-hec-body font-semibold text-hec-ink">{session.classes.name}</h4>
                              {timeStatus === "ongoing" && (
                                <Badge variant="brass">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                            <p className="text-hec-small tabular-nums text-hec-ink-soft">
                              {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                            </p>
                          </div>

                          {/* Quick-Mark Attendance Button */}
                          {(timeStatus === "ongoing" || timeStatus === "upcoming") && session.status === "Scheduled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/teacher/attendance?session=${session.id}`);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Attendance
                            </Button>
                          )}

                          {/* Status Badge */}
                          <Badge
                            variant={session.status === "Held" ? "success" : "secondary"}
                            className="shrink-0"
                          >
                            {session.status === "Held" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {session.status}
                          </Badge>

                          <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint group-hover:text-hec-ink transition-colors duration-hec-1" />
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-hec-sunken mb-4">
                      <Calendar className="h-8 w-8 text-hec-ink-faint" />
                    </div>
                    <p className="text-hec-h3 font-semibold text-hec-ink mb-1">No sessions today</p>
                    <p className="text-hec-small text-hec-ink-soft mb-4">Enjoy your free day!</p>
                    <Link to="/schedule">
                      <Button variant="outline">View Full Schedule</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className={SECTION_TITLE}>
              <Sparkles className="h-5 w-5 shrink-0 text-hec-ink-soft" />
              Quick Actions
            </h3>
            <div className="grid gap-3">
              {quickActions.map((action, index) => (
                <Link key={action.to} to={action.to} className={LINK_CARD}>
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`${CARD_HOVER} cursor-pointer`}>
                      <CardContent className="p-4 relative flex items-center gap-4">
                        <div className={ICON_TILE}>
                          <action.icon className="h-5 w-5 text-hec-ink-soft" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-hec-body font-semibold text-hec-ink">{action.title}</h4>
                          <p className="text-hec-small text-hec-ink-soft">{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint group-hover:text-hec-ink transition-colors duration-hec-1" />
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
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="leaderboards" className="gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 shrink-0 text-hec-ink-soft" />
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
                    <CardHeader className="relative">
                      <div className="flex flex-wrap items-center justify-between gap-3 relative">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={ICON_TILE}>
                            <Trophy className="h-5 w-5 text-hec-brass" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="break-words">{classData.name}</CardTitle>
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
                      <Users className="h-8 w-8 text-hec-ink-faint" />
                    </div>
                    <p className="text-hec-h3 font-semibold text-hec-ink mb-1">No active classes</p>
                    <p className="text-hec-small text-hec-ink-soft">Classes will appear here when you have scheduled sessions</p>
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
