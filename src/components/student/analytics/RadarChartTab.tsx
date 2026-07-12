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
    queryKey: ["class-skill-highest", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score, student_id")
        .eq("class_id", classId);

      if (error) throw error;
      
      // Group by student_id and skill, then find the highest total per skill
      const studentSkillTotals: Record<string, Record<string, number>> = {};
      
      data?.forEach((entry) => {
        if (!studentSkillTotals[entry.student_id]) {
          studentSkillTotals[entry.student_id] = {};
          SKILLS.forEach(skill => {
            studentSkillTotals[entry.student_id][skill] = 0;
          });
        }
        if (studentSkillTotals[entry.student_id][entry.skill] !== undefined) {
          studentSkillTotals[entry.student_id][entry.skill] += entry.score;
        }
      });
      
      // Find max per skill across all students
      const maxPerSkill: Record<string, number> = {};
      SKILLS.forEach(skill => {
        maxPerSkill[skill] = 0;
        Object.values(studentSkillTotals).forEach(studentSkills => {
          if (studentSkills[skill] > maxPerSkill[skill]) {
            maxPerSkill[skill] = studentSkills[skill];
          }
        });
      });
      
      return { maxPerSkill, studentSkillTotals };
    },
  });

  // Calculate class average from the same data
  const classAverage = classHighest?.studentSkillTotals
    ? (() => {
        const studentCount = Object.keys(classHighest.studentSkillTotals).length || 1;
        const avgPerSkill: Record<string, number> = {};
        SKILLS.forEach(skill => {
          const total = Object.values(classHighest.studentSkillTotals).reduce(
            (sum, studentSkills) => sum + studentSkills[skill],
            0
          );
          avgPerSkill[skill] = Math.round(total / studentCount);
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
            className="bg-card/50 rounded-xl border border-border/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Skill Comparison</span>
            </div>
            
            <div className={`relative h-64 bg-gradient-to-br from-slate-900/80 to-blue-950/60 rounded-lg p-2 overflow-hidden ${hasLeaderSkills ? 'ring-2 ring-yellow-500/50' : ''}`}>
              {/* Animated glow overlay when student leads */}
              {hasLeaderSkills && (
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
              {strongestSkill && hasData && (
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
                    stroke="#8B5CF6" 
                    strokeOpacity={0.6} 
                    gridType="polygon"
                  />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: '#F8FAFC', fontSize: 12, fontWeight: 600 }}
                    tickLine={{ stroke: '#8B5CF6', strokeWidth: 2 }}
                    axisLine={{ stroke: '#8B5CF6', strokeWidth: 2 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 10, fill: '#A78BFA', fontWeight: 500 }}
                    tickCount={4}
                    axisLine={{ stroke: '#A78BFA', strokeWidth: 1.5 }}
                    stroke="#A78BFA"
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
                      backgroundColor: 'hsl(222, 47%, 11%)',
                      border: '1px solid #8B5CF6',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4, color: '#F8FAFC' }}
                  />
                  <Legend
                    wrapperStyle={{ 
                      fontSize: '12px', 
                      paddingTop: '16px'
                    }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => (
                      <span style={{ color: '#F8FAFC', fontWeight: 500 }}>{value}</span>
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
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/50 to-amber-500/40 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30"
                >
                  <Crown className="h-4 w-4 text-yellow-300" />
                  <span className="text-sm font-bold text-yellow-200">
                    Leading in {leaderSkills.length} skill{leaderSkills.length > 1 ? 's' : ''}!
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>

          {/* Skills vs Class Best Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-semibold text-foreground">Skills Breakdown</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total: <span className="font-bold text-foreground">{studentTotal}</span>
              <span className="mx-1">/</span>
              <span className="text-yellow-500">{classHighestTotal}</span>
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
                  className={`relative p-4 rounded-xl border transition-all ${
                    isLeader 
                      ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30" 
                      : "bg-card/50 border-border/50"
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
                          <span className="font-semibold text-foreground">{SKILL_LABELS[skill]}</span>
                          {isLeader && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          {/* Trend indicator */}
                          {(() => {
                            const trend = getSkillTrend(skill);
                            if (trend === 'up') return (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/20"
                              >
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                <span className="text-[10px] font-bold text-green-500">↑</span>
                              </motion.div>
                            );
                            if (trend === 'down') return (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20"
                              >
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="text-[10px] font-bold text-red-500">↓</span>
                              </motion.div>
                            );
                            return (
                              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/50">
                                <Minus className="h-3 w-3 text-muted-foreground" />
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-foreground">{score}</span>
                          <span className="text-xs text-muted-foreground">/ {highest}</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar with Average marker */}
                      <div className="relative h-2 rounded-full overflow-hidden bg-muted/50">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ delay: index * 0.05 + 0.2, duration: 0.5, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ 
                            background: isLeader 
                              ? `linear-gradient(90deg, ${SKILL_COLORS[skill]}, hsl(45, 100%, 60%))` 
                              : SKILL_COLORS[skill] 
                          }}
                        />
                        {/* Average marker */}
                        {highest > 0 && avg > 0 && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/60"
                            style={{ left: `${Math.min((avg / highest) * 100, 100)}%` }}
                            title={`Class avg: ${avg}`}
                          />
                        )}
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex justify-between mt-1">
                        <span className={`text-xs font-medium ${
                          percentage >= 80 ? 'text-green-500' : 
                          percentage >= 50 ? 'text-yellow-500' : 
                          'text-muted-foreground'
                        }`}>
                          {percentage}% of best
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Avg: {avg} {aboveAvg && score > 0 && <span className="text-green-500">↑</span>}
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
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="text-foreground font-medium">= Class Leader</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-blue-400" />
              <span className="text-foreground font-medium">= Class Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-foreground font-medium">= Improving</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-foreground font-medium">= Declining</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Shield className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No skill data yet</p>
          <p className="text-sm">Assessments will appear here as your teacher adds them</p>
        </div>
      )}
    </div>
  );
}
