import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCog, BookOpen, Calendar, TrendingUp, TrendingDown, Sparkles, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { dayjs } from "@/lib/date";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";

export function OverviewStats() {
  const queryClient = useQueryClient();
  const currentMonth = dayjs().format("YYYY-MM");
  const { data: financeSummary } = useFinanceSummary(currentMonth);
  useEffect(() => {
    const channels = ["students", "enrollments", "sessions", "teachers"].map((table) =>
      supabase
        .channel(`overview-${table}-changes`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          queryClient.invalidateQueries({ queryKey: ["overview-stats-real"] });
        })
        .subscribe()
    );
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [queryClient]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["overview-stats-real"],
    queryFn: async () => {
      const now = dayjs();
      const thisMonthStart = now.startOf("month").format("YYYY-MM-DD");
      const lastMonthStart = now.subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      const lastMonthEnd = now.subtract(1, "month").endOf("month").format("YYYY-MM-DD");
      const currentMonth = now.format("YYYY-MM");

      const [
        activeStudentsRes,
        lastMonthStudentsRes,
        teachersRes,
        classesRes,
        upcomingRes,
      ] = await Promise.all([
        supabase
          .from("enrollments")
          .select("student_id")
          .or(`end_date.is.null,end_date.gte.${now.format("YYYY-MM-DD")}`),
        supabase
          .from("enrollments")
          .select("student_id")
          .lte("start_date", lastMonthEnd)
          .or(`end_date.is.null,end_date.gte.${lastMonthStart}`),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "Scheduled")
          .gte("date", now.format("YYYY-MM-DD")),
      ]);

      const activeStudents = new Set(activeStudentsRes.data?.map((e) => e.student_id) || []).size;
      const lastMonthStudents = new Set(lastMonthStudentsRes.data?.map((e) => e.student_id) || []).size;

      const studentDelta = lastMonthStudents > 0
        ? Math.round(((activeStudents - lastMonthStudents) / lastMonthStudents) * 100)
        : 0;

      return {
        students: activeStudents,
        studentDelta,
        teachers: teachersRes.count || 0,
        classes: classesRes.count || 0,
        upcomingSessions: upcomingRes.count || 0,
      };
    },
  });

  const statCards = [
    {
      title: "Active Students",
      value: stats?.students || 0,
      icon: Users,
      description: "Currently enrolled students",
      gradient: "from-blue-500 to-cyan-500",
      bgGlow: "bg-blue-500/20",
      trend: stats?.studentDelta !== undefined ? `${stats.studentDelta >= 0 ? "+" : ""}${stats.studentDelta}%` : "—",
      trendUp: stats?.studentDelta !== undefined ? (stats.studentDelta > 0 ? true : stats.studentDelta < 0 ? false : null) : null,
      displayValue: null as string | null,
    },
    {
      title: "Active Teachers",
      value: stats?.teachers || 0,
      icon: UserCog,
      description: "Teaching staff members",
      gradient: "from-amber-500 to-orange-500",
      bgGlow: "bg-amber-500/20",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Active Classes",
      value: stats?.classes || 0,
      icon: BookOpen,
      description: "Running classes",
      gradient: "from-emerald-500 to-teal-500",
      bgGlow: "bg-emerald-500/20",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Upcoming Sessions",
      value: stats?.upcomingSessions || 0,
      icon: Calendar,
      description: "Scheduled ahead",
      gradient: "from-slate-600 to-slate-800",
      bgGlow: "bg-slate-500/20",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Revenue This Month",
      value: financeSummary?.totalCollected || 0,
      icon: DollarSign,
      description: `${financeSummary?.collectionRate || 0}% collected of ${((financeSummary?.totalTuition || 0) / 1000000).toFixed(1)}M billed`,
      gradient: "from-rose-500 to-sky-500",
      bgGlow: "bg-rose-500/20",
      trend: financeSummary?.collectionRate !== undefined ? `${financeSummary.collectionRate}%` : null,
      trendUp: financeSummary?.collectionRate !== undefined ? (financeSummary.collectionRate >= 80 ? true : financeSummary.collectionRate < 50 ? false : null) : null,
      displayValue: `${((financeSummary?.totalCollected || 0) / 1000000).toFixed(1)}M`,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-10 w-10 bg-muted rounded-xl" />
                </div>
                <div className="h-8 w-16 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-border/50 bg-card/80 backdrop-blur-sm">
              <div className={cn(
                "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                stat.bgGlow
              )} />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Sparkles className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight">
                        {stat.displayValue || stat.value.toLocaleString()}
                      </span>
                      {stat.trend && stat.trendUp !== null && (
                        <span className={cn(
                          "flex items-center text-xs font-medium",
                          stat.trendUp ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {stat.trendUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                          {stat.trend}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br",
                    stat.gradient
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  stat.gradient
                )} />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
