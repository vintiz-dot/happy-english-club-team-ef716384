import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Book, Pencil, Headphones, MessageSquare, Users, Shield, Trophy, Crown, Star, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { dayjs } from "@/lib/date";
import { useIvory } from "@/hooks/useIvory";
import { fetchClassSkillFigures } from "@/lib/classSkillPoints";
import { useAuth } from "@/hooks/useAuth";

const SKILL_COLORS: Record<string, string> = {
  reading: "hsl(210, 100%, 60%)",
  writing: "hsl(150, 70%, 50%)",
  listening: "hsl(45, 90%, 55%)",
  speaking: "hsl(0, 80%, 60%)",
  teamwork: "hsl(280, 70%, 60%)",
  focus: "hsl(180, 60%, 50%)",
};

interface RadarChartTabProps {
  studentId: string;
  classId: string;
  selectedMonth?: string;
}

const SKILLS = ["reading", "writing", "listening", "speaking", "teamwork", "focus"] as const;
const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  writing: "Writing",
  listening: "Listening",
  speaking: "Speaking",
  teamwork: "Teamwork",
  focus: "Focus",
};

const SKILL_ICONS: Record<string, React.ReactNode> = {
  reading: <Book className="h-5 w-5" />,
  writing: <Pencil className="h-5 w-5" />,
  listening: <Headphones className="h-5 w-5" />,
  speaking: <MessageSquare className="h-5 w-5" />,
  teamwork: <Users className="h-5 w-5" />,
  focus: <Shield className="h-5 w-5" />,
};

export function RadarChartTab({ studentId, classId, selectedMonth }: RadarChartTabProps) {
  // Opened from the teacher/admin class board too (not migrated yet): old classes there.
  // Series colours (skills, class best/avg/you) are chart palette and stay in both.
  const ivory = useIvory();
  const { role: viewerRole } = useAuth();
  const viewerIsStaff = viewerRole === "teacher" || viewerRole === "admin";
  const iv = (n: string, o: string) => (ivory ? n : o);
  const INK = "hsl(var(--hec-ink))";
  const INK_SOFT = "hsl(var(--hec-ink-soft))";
  const LINE = "hsl(var(--hec-line-strong))";
  // Determine current and previous month boundaries
  const currentMonthStart = selectedMonth 
    ? dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD')
    : dayjs().startOf('month').format('YYYY-MM-DD');
  const currentMonthEnd = selectedMonth
    ? dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD')
    : dayjs().endOf('month').format('YYYY-MM-DD');
  const lastMonthStart = dayjs(currentMonthStart).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  const lastMonthEnd = dayjs(currentMonthStart).subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

  // Fetch student's total skill points (no averaging, just sum)
  const { data: studentSkills } = useQuery({
    queryKey: ["student-skills-total", studentId, classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score")
        .eq("student_id", studentId)
        .eq("class_id", classId);

      if (error) throw error;
      
      // Calculate total per skill (no cap)
      const skillTotals: Record<string, number> = {};
      SKILLS.forEach(skill => {
        skillTotals[skill] = 0;
      });
      
      data?.forEach((entry) => {
        if (skillTotals[entry.skill] !== undefined) {
          skillTotals[entry.skill] += entry.score;
        }
      });
      
      return skillTotals;
    },
  });

  // Fetch current month's skill scores for trend comparison
  const { data: currentMonthSkills } = useQuery({
    queryKey: ["student-skills-current-month", studentId, classId, currentMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .gte("date", currentMonthStart)
        .lte("date", currentMonthEnd);

      if (error) throw error;
      
      const skillTotals: Record<string, number> = {};
      SKILLS.forEach(skill => { skillTotals[skill] = 0; });
      data?.forEach((entry) => {
        if (skillTotals[entry.skill] !== undefined) {
          skillTotals[entry.skill] += entry.score;
        }
      });
      return skillTotals;
    },
  });

  // Fetch last month's skill scores for trend comparison
  const { data: lastMonthSkills } = useQuery({
    queryKey: ["student-skills-last-month", studentId, classId, lastMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .gte("date", lastMonthStart)
        .lte("date", lastMonthEnd);

      if (error) throw error;
      
      const skillTotals: Record<string, number> = {};
      SKILLS.forEach(skill => { skillTotals[skill] = 0; });
      data?.forEach((entry) => {
        if (skillTotals[entry.skill] !== undefined) {
          skillTotals[entry.skill] += entry.score;
        }
      });
      return skillTotals;
    },
  });

  // Calculate trend for each skill
  const getSkillTrend = (skill: string): 'up' | 'down' | 'stable' => {
    const current = currentMonthSkills?.[skill] ?? 0;
    const last = lastMonthSkills?.[skill] ?? 0;
    
    // If no data last month and have data this month = improving
    if (last === 0 && current > 0) return 'up';
    // If no data either month = stable
    if (last === 0 && current === 0) return 'stable';
    
    const diff = current - last;
    const percentChange = (diff / last) * 100;
    
    // Consider >10% change as significant
    if (percentChange > 10) return 'up';
    if (percentChange < -10) return 'down';
    return 'stable';
  };

  // Fetch class highest for each skill (compare vs the best, not average)
  const { data: classHighest } = useQuery({
    queryKey: ["class-skill-highest", classId, viewerIsStaff],
    queryFn: async () => {
      // A summary per skill, not rows and not classmates' totals: those are
      // private to each child's family (src/lib/classSkillPoints.ts).
      const figures = await fetchClassSkillFigures(classId, { staff: viewerIsStaff });

      const maxPerSkill: Record<string, number> = {};
      const sumPerSkill: Record<string, number> = {};
      SKILLS.forEach(skill => {
        maxPerSkill[skill] = figures.bySkill[skill]?.best ?? 0;
        sumPerSkill[skill] = figures.bySkill[skill]?.total ?? 0;
      });

      return { maxPerSkill, sumPerSkill, studentCount: figures.classStudents };
    },
  });

  // Class average: each skill's sum over every child with any assessment.
  const classAverage = classHighest
    ? (() => {
        const studentCount = classHighest.studentCount || 1;
        const avgPerSkill: Record<string, number> = {};
        SKILLS.forEach(skill => {
          avgPerSkill[skill] = Math.round(classHighest.sumPerSkill[skill] / studentCount);
        });
        return avgPerSkill;
      })()
    : null;

  const hasData = studentSkills && Object.values(studentSkills).some(v => v > 0);

  // Calculate total points
  const studentTotal = studentSkills ? Object.values(studentSkills).reduce((a, b) => a + b, 0) : 0;
  const classHighestTotal = classHighest?.maxPerSkill ? Object.values(classHighest.maxPerSkill).reduce((a, b) => a + b, 0) : 0;

  // Find skills where student is the leader
  const leaderSkills = SKILLS.filter(skill => {
    const score = studentSkills?.[skill] ?? 0;
    const highest = classHighest?.maxPerSkill?.[skill] ?? 0;
    return score >= highest && score > 0;
  });

  // Find strongest skill (highest score)
  const strongestSkill = studentSkills 
    ? SKILLS.reduce((best, skill) => 
        (studentSkills[skill] ?? 0) > (studentSkills[best] ?? 0) ? skill : best
      , SKILLS[0])
    : null;

  const hasLeaderSkills = leaderSkills.length > 0;

  // Animation state for student score growing from 0
  const [animationProgress, setAnimationProgress] = useState(0);
  
  useEffect(() => {
    if (hasData) {
      setAnimationProgress(0);
      const timeout = setTimeout(() => {
        setAnimationProgress(1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [hasData, studentId, classId]);

  // Prepare chart data for radar with animated student values
  const chartData = SKILLS.map(skill => ({
    skill: SKILL_LABELS[skill],
    student: Math.round((studentSkills?.[skill] ?? 0) * animationProgress),
    classAvg: classAverage?.[skill] ?? 0,
    classBest: classHighest?.maxPerSkill?.[skill] ?? 0,
  }));

  return (
    <div className="space-y-4">
      {hasData ? (
        <>
          {/* Radar Chart Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={iv("rounded-hec-lg border border-hec-line bg-hec-surface p-4", "bg-card/50 rounded-xl border border-border/50 p-4")}
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className={iv("h-5 w-5 text-hec-brass", "h-5 w-5 text-primary")} />
              <span className={iv("text-hec-small font-semibold text-hec-ink", "text-sm font-semibold text-foreground")}>Skill Comparison</span>
            </div>
            
            <div className={ivory
              ? `relative h-64 rounded-hec-md bg-hec-sunken p-2 overflow-hidden ${hasLeaderSkills ? 'ring-1 ring-hec-brass/40' : ''}`
              : `relative h-64 bg-gradient-to-br from-slate-900/80 to-blue-950/60 rounded-lg p-2 overflow-hidden ${hasLeaderSkills ? 'ring-2 ring-yellow-500/50' : ''}`}>
              {/* Animated glow overlay when student leads */}
              {!ivory && hasLeaderSkills && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(250, 204, 21, 0.15) 0%, transparent 70%)`,
                  }}
                />
              )}
              
              {/* Pulsing highlight on strongest skill direction */}
              {!ivory && strongestSkill && hasData && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  style={{
                    background: `conic-gradient(from ${SKILLS.indexOf(strongestSkill) * 60}deg at 50% 50%, rgba(16, 185, 129, 0.2) 0deg, transparent 60deg, transparent 360deg)`,
                  }}
                />
              )}
              
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid 
                    stroke={ivory ? LINE : "#8B5CF6"}
                    strokeOpacity={ivory ? 1 : 0.6} 
                    gridType="polygon"
                  />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: ivory ? INK : '#F8FAFC', fontSize: ivory ? 13 : 12, fontWeight: 600 }}
                    tickLine={{ stroke: ivory ? LINE : '#8B5CF6', strokeWidth: ivory ? 1 : 2 }}
                    axisLine={{ stroke: ivory ? LINE : '#8B5CF6', strokeWidth: ivory ? 1 : 2 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 'auto']}
                    tick={{ fontSize: ivory ? 13 : 10, fill: ivory ? INK_SOFT : '#A78BFA', fontWeight: 500 }}
                    tickCount={4}
                    axisLine={{ stroke: ivory ? LINE : '#A78BFA', strokeWidth: ivory ? 1 : 1.5 }}
                    stroke={ivory ? LINE : "#A78BFA"}
                  />
                  
                  {/* Class Best - bright orange */}
                  <Radar
                    name="Class Best"
                    dataKey="classBest"
                    stroke="#FF9500"
                    fill="#FF9500"
                    fillOpacity={0.15}
                    strokeWidth={2.5}
                  />
                  
                  {/* Class Average - vibrant blue dashed */}
                  <Radar
                    name="Class Avg"
                    dataKey="classAvg"
                    stroke="#A855F7"
                    fill="#A855F7"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                  
                  {/* Student Score - emerald green filled with CSS transition */}
                  <Radar
                    name="Your Score"
                    dataKey="student"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.45}
                    strokeWidth={2.5}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  
                  <Tooltip
                    contentStyle={{
                      backgroundColor: ivory ? 'hsl(var(--hec-raised))' : 'hsl(222, 47%, 11%)',
                      border: ivory ? '1px solid hsl(var(--hec-line))' : '1px solid #8B5CF6',
                      borderRadius: ivory ? '10px' : '8px',
                      fontSize: ivory ? '13px' : '12px',
                      color: ivory ? INK : '#F8FAFC',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4, color: ivory ? INK : '#F8FAFC' }}
                  />
                  <Legend
                    wrapperStyle={{ 
                      fontSize: ivory ? '13px' : '12px',
                      paddingTop: '16px'
                    }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => (
                      <span style={{ color: ivory ? INK : '#F8FAFC', fontWeight: 500 }}>{value}</span>
                    )}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Leader badge overlay */}
            {hasLeaderSkills && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-2"
              >
                <motion.div
                  animate={ivory ? undefined : { scale: [1, 1.1, 1] }}
                  transition={ivory ? undefined : { duration: 1.5, repeat: Infinity }}
                  className={iv("flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-hec-brass/40 bg-hec-sunken", "flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/50 to-amber-500/40 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30")}
                >
                  <Crown className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-yellow-300")} />
                  <span className={iv("text-hec-small font-semibold text-hec-ink", "text-sm font-bold text-yellow-200")}>
                    Leading in {leaderSkills.length} skill{leaderSkills.length > 1 ? 's' : ''}!
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>

          {/* Skills vs Class Best Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className={iv("h-5 w-5 text-hec-brass", "h-5 w-5 text-yellow-500")} />
              <span className={iv("text-hec-small font-semibold text-hec-ink", "text-sm font-semibold text-foreground")}>Skills Breakdown</span>
            </div>
            <div className={iv("text-hec-caption text-hec-ink-soft tabular-nums", "text-xs text-muted-foreground")}>
              Total: <span className={iv("font-semibold text-hec-ink", "font-bold text-foreground")}>{studentTotal}</span>
              <span className="mx-1">/</span>
              <span className={iv("text-hec-ink", "text-yellow-500")}>{classHighestTotal}</span>
            </div>
          </div>

          {/* Skill Cards */}
          <div className="space-y-3">
            {SKILLS.map((skill, index) => {
              const score = studentSkills?.[skill] ?? 0;
              const highest = classHighest?.maxPerSkill?.[skill] ?? 1;
              const avg = classAverage?.[skill] ?? 0;
              const percentage = highest > 0 ? Math.round((score / highest) * 100) : 0;
              const isLeader = score >= highest && score > 0;
              const aboveAvg = score > avg;
              
              return (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-4 border transition-all ${ivory ? "rounded-hec-lg" : "rounded-xl"} ${
                    isLeader
                      ? iv("bg-hec-sunken border-hec-brass/40", "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30")
                      : iv("bg-hec-surface border-hec-line", "bg-card/50 border-border/50")
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Skill Icon */}
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${SKILL_COLORS[skill]}20` }}
                    >
                      <span style={{ color: SKILL_COLORS[skill] }}>{SKILL_ICONS[skill]}</span>
                    </div>

                    {/* Skill Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={iv("font-semibold text-hec-ink", "font-semibold text-foreground")}>{SKILL_LABELS[skill]}</span>
                          {isLeader && (
                            <Crown className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-yellow-500")} />
                          )}
                          {/* Trend indicator */}
                          {(() => {
                            const trend = getSkillTrend(skill);
                            if (trend === 'up') return (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={iv("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-hec-leaf-tint", "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/20")}
                              >
                                <TrendingUp className={iv("h-3 w-3 text-hec-leaf", "h-3 w-3 text-green-500")} />
                                <span className={iv("text-hec-caption font-medium text-hec-leaf", "text-[10px] font-bold text-green-500")}>↑</span>
                              </motion.div>
                            );
                            if (trend === 'down') return (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={iv("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-hec-danger-tint", "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20")}
                              >
                                <TrendingDown className={iv("h-3 w-3 text-hec-danger", "h-3 w-3 text-red-500")} />
                                <span className={iv("text-hec-caption font-medium text-hec-danger", "text-[10px] font-bold text-red-500")}>↓</span>
                              </motion.div>
                            );
                            return (
                              <div className={iv("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-hec-sunken", "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/50")}>
                                <Minus className={iv("h-3 w-3 text-hec-ink-soft", "h-3 w-3 text-muted-foreground")} />
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={iv("text-hec-h3 font-semibold tabular-nums text-hec-ink", "text-lg font-black text-foreground")}>{score}</span>
                          <span className={iv("text-hec-caption tabular-nums text-hec-ink-soft", "text-xs text-muted-foreground")}>/ {highest}</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar with Average marker */}
                      <div className={iv("relative h-2 rounded-full overflow-hidden bg-hec-sunken", "relative h-2 rounded-full overflow-hidden bg-muted/50")}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ delay: index * 0.05 + 0.2, duration: 0.5, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ 
                            background: isLeader && !ivory
                              ? `linear-gradient(90deg, ${SKILL_COLORS[skill]}, hsl(45, 100%, 60%))` 
                              : SKILL_COLORS[skill] 
                          }}
                        />
                        {/* Average marker */}
                        {highest > 0 && avg > 0 && (
                          <div 
                            className={iv("absolute top-0 bottom-0 w-0.5 bg-hec-ink-soft", "absolute top-0 bottom-0 w-0.5 bg-muted-foreground/60")}
                            style={{ left: `${Math.min((avg / highest) * 100, 100)}%` }}
                            title={`Class avg: ${avg}`}
                          />
                        )}
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex justify-between mt-1">
                        <span className={`font-medium ${ivory ? "text-hec-caption" : "text-xs"} ${
                          percentage >= 80 ? iv('text-hec-leaf', 'text-green-500') :
                          percentage >= 50 ? iv('text-hec-warn', 'text-yellow-500') :
                          iv('text-hec-ink-soft', 'text-muted-foreground')
                        }`}>
                          {percentage}% of best
                        </span>
                        <span className={iv("text-hec-caption text-hec-ink-soft", "text-xs text-muted-foreground")}>
                          Avg: {avg} {aboveAvg && score > 0 && <span className={iv("text-hec-leaf", "text-green-500")}>↑</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-sm">
            <div className="flex items-center gap-1.5">
              <Crown className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-yellow-400")} />
              <span className={iv("text-hec-ink font-medium", "text-foreground font-medium")}>= Class Leader</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={iv("w-4 h-0.5 bg-hec-ink-soft", "w-4 h-0.5 bg-blue-400")} />
              <span className={iv("text-hec-ink font-medium", "text-foreground font-medium")}>= Class Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className={iv("h-4 w-4 text-hec-leaf", "h-4 w-4 text-green-500")} />
              <span className={iv("text-hec-ink font-medium", "text-foreground font-medium")}>= Improving</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className={iv("h-4 w-4 text-hec-danger", "h-4 w-4 text-red-500")} />
              <span className={iv("text-hec-ink font-medium", "text-foreground font-medium")}>= Declining</span>
            </div>
          </div>
        </>
      ) : (
        <div className={iv("flex flex-col items-center justify-center py-12 text-hec-ink-soft", "flex flex-col items-center justify-center py-12 text-muted-foreground")}>
          <Shield className="h-16 w-16 mb-4 opacity-30" />
          <p className={iv("text-hec-h3 font-medium", "text-lg font-medium")}>No skill data yet</p>
          <p className={iv("text-hec-small", "text-sm")}>Assessments will appear here as your teacher adds them</p>
        </div>
      )}
    </div>
  );
}
