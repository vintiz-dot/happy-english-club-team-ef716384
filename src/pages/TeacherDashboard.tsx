import { useQuery, useQueryClient } from "@tanstack/react-query";
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
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-500"
    },
    { 
      to: "/teacher/assignments", 
      icon: FileText, 
      title: "Assignments", 
      description: "Manage homework & grading",
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-500"
    },
    { 
      to: "/teacher/journal", 
      icon: BookOpen, 
      title: "Journal", 
      description: "Student progress notes",
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-500"
    },
    { 
      to: "/teacher/payroll", 
      icon: DollarSign, 
      title: "Payroll", 
      description: "View earnings & sessions",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-500"
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
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-card/80 shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-2xl" />
              
              <CardContent className="relative p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar with glow */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                    <Avatar className="relative h-24 w-24 ring-4 ring-background shadow-xl">
                      <AvatarImage src={getAvatarUrl(teacherProfile.avatar_url) || undefined} alt={teacherProfile.full_name} className="object-cover" />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-accent/20">
                        {teacherProfile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                        {teacherProfile.full_name}
                      </h1>
                      <Badge 
                        variant={teacherProfile.is_active ? "default" : "secondary"} 
                        className={`${teacherProfile.is_active ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0" : ""} px-3 py-1`}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {teacherProfile.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {teacherProfile.email && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                          {teacherProfile.email}
                        </span>
                      )}
                      {teacherProfile.phone && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                          {teacherProfile.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span>{(teacherProfile.hourly_rate_vnd || 0).toLocaleString()} ₫</span>
                      <span className="text-sm font-normal text-muted-foreground">/hour</span>
                    </div>
                  </div>
                  
                  {/* Edit Button */}
                  <Button 
                    onClick={() => setShowEditProfile(true)} 
                    variant="outline" 
                    size="lg"
                    className="shrink-0 gap-2 border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {/* Today's Sessions */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <Badge variant="secondary" className="text-xs">Today</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{todaySessions?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Sessions</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Classes */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{activeClasses?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Active Classes</p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Grading */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                {(pendingGrading || 0) > 0 && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{pendingGrading || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Grading</p>
              </div>
            </CardContent>
          </Card>

          {/* Earned Amount */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{((payrollData?.totalAmountActual || 0) / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Earned (VND)</p>
              </div>
            </CardContent>
          </Card>

          {/* Projected Total */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{progressPercent}%</span>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{((payrollData?.totalAmountProjected || 0) / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground mb-2">Projected (VND)</p>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Classes Grid */}
        {activeClasses && activeClasses.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                My Classes
              </h3>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeClasses.map((classData: any, index: number) => (
                <motion.div
                  key={classData.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/teacher/classes/${classData.id}`}>
                    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardContent className="p-5 relative flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 shrink-0">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{classData.name}</h4>
                          <p className="text-sm text-muted-foreground">Calendar · Roster · Leaderboard</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
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
            <Card className="h-full border-0 bg-gradient-to-br from-card to-card/90 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
                      <Clock className="h-5 w-5 text-primary" />
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
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => classId && navigate(`/teacher/classes/${classId}`)}
                          className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
                            timeStatus === "ongoing" 
                              ? "bg-gradient-to-r from-primary/10 via-card to-card border-primary/30 shadow-md" 
                              : timeStatus === "completed"
                              ? "bg-muted/30 opacity-60"
                              : "bg-card hover:bg-muted/30"
                          }`}
                        >
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${
                              timeStatus === "ongoing" ? "bg-primary animate-pulse" :
                              timeStatus === "completed" ? "bg-muted-foreground" : "bg-accent"
                            }`} />
                            {index < todaySessions.length - 1 && (
                              <div className="w-0.5 h-8 bg-border" />
                            )}
                          </div>
                          
                          {/* Session Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{session.classes.name}</h4>
                              {timeStatus === "ongoing" && (
                                <Badge className="bg-primary/20 text-primary border-0 text-xs">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                            </p>
                          </div>
                          
                          {/* Quick-Mark Attendance Button */}
                          {(timeStatus === "ongoing" || timeStatus === "upcoming") && session.status === "Scheduled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/teacher/attendance?session=${session.id}`);
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Attendance
                            </Button>
                          )}

                          {/* Status Badge */}
                          <Badge 
                            variant={session.status === "Held" ? "default" : "secondary"}
                            className={session.status === "Held" ? "bg-emerald-500/20 text-emerald-600 border-0" : ""}
                          >
                            {session.status === "Held" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                            {session.status}
                          </Badge>

                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mb-1">No sessions today</p>
                    <p className="text-sm text-muted-foreground mb-4">Enjoy your free day!</p>
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
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Actions
            </h3>
            <div className="grid gap-3">
              {quickActions.map((action, index) => (
                <Link key={action.to} to={action.to}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/90 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer">
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <CardContent className="p-4 relative flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient}`}>
                          <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{action.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
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
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="leaderboards" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-6">
              <Card className="border-0 bg-gradient-to-br from-card to-card/90 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
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
                  <Card key={classData.id} className="border-0 bg-gradient-to-br from-card to-card/90 shadow-lg overflow-hidden">
                    <CardHeader className="relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl" />
                      <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                            <Trophy className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <CardTitle>{classData.name}</CardTitle>
                            <CardDescription>Class Rankings & Points</CardDescription>
                          </div>
                        </div>
                        <ManualPointsDialog classId={classData.id} isAdmin={false} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ClassLeaderboardShared classId={classData.id} />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-0 bg-gradient-to-br from-card to-card/90 shadow-lg">
                  <CardContent className="py-16 text-center">
                    <div className="p-4 rounded-full bg-muted/50 inline-block mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mb-1">No active classes</p>
                    <p className="text-sm text-muted-foreground">Classes will appear here when you have scheduled sessions</p>
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
