import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Zap, Flame } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface WeeklyProgressCardProps {
  studentId: string;
  currentStreak: number;
}

export function WeeklyProgressCard({ studentId, currentStreak }: WeeklyProgressCardProps) {
  const weekStart = dayjs().startOf("week").add(1, "day").format("YYYY-MM-DD"); // Monday
  const weekEnd = dayjs().endOf("week").add(1, "day").format("YYYY-MM-DD"); // Sunday

  const { data } = useQuery({
    queryKey: ["weekly-progress", studentId, weekStart],
    queryFn: async () => {
      // Use RPC to bypass RLS
      const { data: result, error } = await supabase.rpc("get_student_weekly_stats", {
        p_student_id: studentId,
        p_week_start: weekStart,
        p_week_end: weekEnd,
      });

      if (error) {
        console.error("get_student_weekly_stats RPC error:", error);
        return null;
      }

      const r = result as any;
      return {
        classesAttended: r?.attended_sessions || 0,
        totalClasses: r?.total_sessions || 0,
        homeworkSubmitted: r?.submitted_homeworks || 0,
        totalHomework: r?.total_homeworks || 0,
        xpEarned: r?.xp_earned || 0,
      };
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const stats = [
    {
      label: "Classes",
      value: data.classesAttended,
      total: data.totalClasses,
      icon: Calendar,
      color: "hsl(var(--primary))",
      bgColor: "from-primary/20 to-primary/5",
    },
    {
      label: "Homework",
      value: data.homeworkSubmitted,
      total: data.totalHomework,
      icon: BookOpen,
      color: "hsl(var(--accent))",
      bgColor: "from-accent/20 to-accent/5",
    },
    {
      label: "XP Earned",
      value: data.xpEarned,
      total: null,
      icon: Zap,
      color: "hsl(var(--warning))",
      bgColor: "from-warning/20 to-warning/5",
    },
    {
      label: "Streak",
      value: currentStreak,
      total: null,
      icon: Flame,
      color: "hsl(var(--destructive))",
      bgColor: "from-destructive/20 to-destructive/5",
    },
  ];

  return (
    <motion.div
      className="glass-lg border-0 shadow-xl rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">This Week</h3>
          <p className="text-xs text-muted-foreground">
            {dayjs(weekStart).format("MMM D")} – {dayjs(weekEnd).format("MMM D")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const pct = stat.total ? Math.round((stat.value / Math.max(stat.total, 1)) * 100) : null;
          const chartData = pct !== null
            ? [{ value: pct }, { value: 100 - pct }]
            : null;

          return (
            <motion.div
              key={stat.label}
              className={`rounded-xl p-3 bg-gradient-to-br ${stat.bgColor} text-center`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
            >
              {chartData ? (
                <div className="w-14 h-14 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={18}
                        outerRadius={26}
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        <Cell fill={stat.color} />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-14 h-14 mx-auto mb-1 flex items-center justify-center">
                  <span className="text-2xl font-black" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              )}
              <p className="text-xs font-medium text-foreground">
                {stat.total !== null ? `${stat.value}/${stat.total}` : stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
