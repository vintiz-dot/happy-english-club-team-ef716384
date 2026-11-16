import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCog, BookOpen, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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
      trend: stats?.studentDelta !== undefined ? `${stats.studentDelta >= 0 ? "+" : ""}${stats.studentDelta}%` : "—",
      trendUp: stats?.studentDelta !== undefined ? (stats.studentDelta > 0 ? true : stats.studentDelta < 0 ? false : null) : null,
      displayValue: null as string | null,
    },
    {
      title: "Active Teachers",
      value: stats?.teachers || 0,
      icon: UserCog,
      description: "Teaching staff members",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Active Classes",
      value: stats?.classes || 0,
      icon: BookOpen,
      description: "Running classes",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Upcoming Sessions",
      value: stats?.upcomingSessions || 0,
      icon: Calendar,
      description: "Scheduled ahead",
      trend: null,
      trendUp: null,
      displayValue: null as string | null,
    },
    {
      title: "Revenue This Month",
      value: financeSummary?.totalCollected || 0,
      icon: DollarSign,
      description: `${financeSummary?.collectionRate || 0}% collected of ${((financeSummary?.totalTuition || 0) / 1000000).toFixed(1)}M billed`,
      trend: financeSummary?.collectionRate !== undefined ? `${financeSummary.collectionRate}%` : null,
      trendUp: financeSummary?.collectionRate !== undefined ? (financeSummary.collectionRate >= 80 ? true : financeSummary.collectionRate < 50 ? false : null) : null,
      displayValue: `${((financeSummary?.totalCollected || 0) / 1000000).toFixed(1)}M`,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded-hec-sm bg-hec-sunken" />
                  <div className="h-10 w-10 rounded-hec-md bg-hec-sunken" />
                </div>
                <div className="h-8 w-16 rounded-hec-sm bg-hec-sunken" />
                <div className="h-3 w-32 rounded-hec-sm bg-hec-sunken" />
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.05 }}
            className="h-full"
          >
            <Card className="h-full">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-hec-small font-medium text-hec-ink-soft">{stat.title}</p>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">
                        {stat.displayValue || stat.value.toLocaleString()}
                      </span>
                      {stat.trend && stat.trendUp !== null && (
                        <span className={cn(
                          "flex items-center gap-1 whitespace-nowrap text-hec-caption font-medium tabular-nums",
                          stat.trendUp ? "text-hec-leaf" : "text-hec-danger"
                        )}>
                          {stat.trendUp ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
                          {stat.trend}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken text-hec-ink-soft">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className="text-hec-caption text-hec-ink-soft">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
