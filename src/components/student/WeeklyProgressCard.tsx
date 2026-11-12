import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { Calendar, BookOpen, Zap, Flame } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CARD, CARD_TITLE } from "@/components/student/nova/ivory";

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

  // Ivory: completion is leaf on a hairline track; counts are ink.
  const stats = [
    {
      label: "Classes",
      value: data.classesAttended,
      total: data.totalClasses,
      icon: Calendar,
      color: "hsl(var(--hec-leaf))",
    },
    {
      label: "Homework",
      value: data.homeworkSubmitted,
      total: data.totalHomework,
      icon: BookOpen,
      color: "hsl(var(--hec-leaf))",
    },
    {
      label: "XP Earned",
      value: data.xpEarned,
      total: null,
      icon: Zap,
      color: "hsl(var(--hec-ink))",
    },
    {
      label: "Streak",
      value: currentStreak,
      total: null,
      icon: Flame,
      color: "hsl(var(--hec-ink))",
    },
  ];

  return (
    <section className={CARD}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={CARD_TITLE}>This Week</h2>
        <p className="text-hec-small tabular-nums text-hec-ink-soft">
          {dayjs(weekStart).format("MMM D")} – {dayjs(weekEnd).format("MMM D")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const pct = stat.total ? Math.round((stat.value / Math.max(stat.total, 1)) * 100) : null;
          const chartData = pct !== null
            ? [{ value: pct }, { value: 100 - pct }]
            : null;

          return (
            <div
              key={stat.label}
              className="rounded-hec-md bg-hec-sunken/60 p-4 text-center"
            >
              {chartData ? (
                <div className="mx-auto mb-1 h-14 w-14" aria-hidden>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={26}
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                        isAnimationActive={false}
                      >
                        <Cell fill={stat.color} />
                        <Cell fill="hsl(var(--hec-line))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center">
                  <span className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">
                    {stat.value}
                  </span>
                </div>
              )}
              <p className="text-hec-small font-medium tabular-nums text-hec-ink">
                {stat.total !== null ? `${stat.value}/${stat.total}` : stat.value}
              </p>
              <p className="text-hec-caption text-hec-ink-soft">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
