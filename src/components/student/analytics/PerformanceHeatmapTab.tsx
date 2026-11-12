import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, Users, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Medal, Crown, Award } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_ICONS } from "@/lib/skillConfig";
import { useIvory } from "@/hooks/useIvory";

interface PerformanceHeatmapTabProps {
  studentId: string;
  classId: string;
  selectedMonth: string;
}

const SKILLS = ["speaking", "listening", "reading", "writing", "focus", "teamwork"];

const SKILL_LABELS: Record<string, string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  focus: "Focus",
  teamwork: "Teamwork",
};

const SKILL_COLORS: Record<string, string> = {
  speaking: "hsl(var(--chart-1))",
  listening: "hsl(var(--chart-2))",
  reading: "hsl(var(--chart-3))",
  writing: "hsl(var(--chart-4))",
  focus: "hsl(var(--chart-5))",
  teamwork: "hsl(var(--primary))",
};

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const RANK_COLORS_IVORY = ["text-hec-brass", "text-hec-ink-soft", "text-hec-ink-soft"];

export function PerformanceHeatmapTab({
  studentId,
  classId,
  selectedMonth,
}: PerformanceHeatmapTabProps) {
  // Opened from the teacher/admin class board too (not migrated yet): old classes there.
  // Skill colours are chart palette and stay in both.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [compareStudentId, setCompareStudentId] = useState<string | null>(null);

  const monthStart = startOfMonth(parse(selectedMonth, "yyyy-MM", new Date()));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  // Previous month for improvement calculation
  const prevMonthStart = startOfMonth(subMonths(monthStart, 1));
  const prevMonthEnd = endOfMonth(prevMonthStart);
  const prevMonthStartStr = format(prevMonthStart, "yyyy-MM-dd");
  const prevMonthEndStr = format(prevMonthEnd, "yyyy-MM-dd");

  // Fetch session dates
  const { data: sessionDates, isLoading: loadingSessions } = useQuery({
    queryKey: ["session-dates", classId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, date")
        .eq("class_id", classId)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr)
        .in("status", ["Held", "Scheduled"])
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch enrolled students for comparison dropdown
  const { data: classStudents } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(id, full_name)")
        .eq("class_id", classId)
        .or("end_date.is.null,end_date.gt." + format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data?.map((e: any) => ({
        id: e.students.id,
        name: e.students.full_name,
      })) || [];
    },
  });

  // Fetch ALL class skill totals
  const { data: classSkillTotals, isLoading: loadingClassTotals } = useQuery({
    queryKey: ["class-skill-totals", classId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("student_id, skill, score, students!inner(full_name)")
        .eq("class_id", classId)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);
      if (error) throw error;

      const totals: Record<string, Record<string, { total: number; studentName: string }>> = {};
      data?.forEach((entry: any) => {
        const skill = entry.skill;
        const sid = entry.student_id;
        const studentName = entry.students?.full_name || "Unknown";
        if (!totals[skill]) totals[skill] = {};
        if (!totals[skill][sid]) totals[skill][sid] = { total: 0, studentName };
        totals[skill][sid].total += entry.score;
      });
      return totals;
    },
  });

  // Fetch student's current month assessments
  const { data: studentAssessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ["student-skill-assessments", studentId, classId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch student's PREVIOUS month assessments for improvement badges
  const { data: prevMonthAssessments } = useQuery({
    queryKey: ["student-prev-month-assessments", studentId, classId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .gte("date", prevMonthStartStr)
        .lte("date", prevMonthEndStr);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch compare student's assessments
  const { data: compareAssessments } = useQuery({
    queryKey: ["compare-student-assessments", compareStudentId, classId, selectedMonth],
    queryFn: async () => {
      if (!compareStudentId) return null;
      const { data, error } = await supabase
        .from("skill_assessments")
        .select("skill, score")
        .eq("student_id", compareStudentId)
        .eq("class_id", classId)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);
      if (error) throw error;
      
      const totals: Record<string, number> = {};
      data?.forEach((a) => {
        totals[a.skill] = (totals[a.skill] || 0) + a.score;
      });
      return totals;
    },
    enabled: !!compareStudentId,
  });

  // Fetch attendance
  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery({
    queryKey: ["student-attendance-performance", studentId, classId, selectedMonth],
    queryFn: async () => {
      const sessionIds = sessionDates?.map((s) => s.id) || [];
      if (sessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("session_id, status")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionDates && sessionDates.length > 0,
  });

  // Calculate previous month totals per skill
  const prevMonthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    prevMonthAssessments?.forEach((a) => {
      totals[a.skill] = (totals[a.skill] || 0) + a.score;
    });
    return totals;
  }, [prevMonthAssessments]);

  // Calculate skill stats with rankings
  const skillStats = useMemo(() => {
    if (!classSkillTotals) return [];

    return SKILLS.map((skill) => {
      const skillData = classSkillTotals[skill] || {};
      const allTotals = Object.entries(skillData).map(([id, data]) => ({
        studentId: id,
        studentName: data.studentName,
        total: data.total,
      }));

      const sortedByTotal = [...allTotals].sort((a, b) => b.total - a.total);
      const classLeader = sortedByTotal[0] || null;
      const classBest = classLeader?.total || 1;
      const top3 = sortedByTotal.slice(0, 3);

      const classAverage = allTotals.length > 0
        ? Math.round(allTotals.reduce((sum, s) => sum + s.total, 0) / allTotals.length)
        : 0;

      const studentTotal = studentAssessments?.filter((a) => a.skill === skill).reduce((sum, a) => sum + a.score, 0) || 0;
      const percentOfBest = classBest > 0 ? Math.round((studentTotal / classBest) * 100) : 0;
      const isLeader = classLeader?.studentId === studentId;

      // Improvement calculation
      const prevTotal = prevMonthTotals[skill] || 0;
      const improvement = prevTotal > 0 ? Math.round(((studentTotal - prevTotal) / prevTotal) * 100) : 0;
      const hasImprovement = improvement >= 20;

      // Compare student total
      const compareTotal = compareAssessments?.[skill] || 0;

      const IconComponent = SKILL_ICONS[skill];

      return {
        skill,
        label: SKILL_LABELS[skill],
        color: SKILL_COLORS[skill],
        Icon: IconComponent,
        studentTotal,
        classBest,
        classLeader,
        classAverage,
        percentOfBest: Math.min(percentOfBest, 100),
        isLeader,
        top3,
        improvement,
        hasImprovement,
        compareTotal,
      };
    });
  }, [classSkillTotals, studentAssessments, studentId, prevMonthTotals, compareAssessments]);

  // Get session details for a skill
  const getSkillSessionDetails = (skill: string) => {
    const details: Array<{
      date: string;
      sessionId: string;
      points: number;
      comment: string | null;
      isAbsent: boolean;
    }> = [];

    const skillAssessments = studentAssessments?.filter((a) => a.skill === skill) || [];

    sessionDates?.forEach((session) => {
      const dateStr = format(new Date(session.date), "yyyy-MM-dd");
      const attendance = attendanceRecords?.find((a) => a.session_id === session.id);
      const assessment = skillAssessments.find((a) => format(new Date(a.date), "yyyy-MM-dd") === dateStr);

      if (attendance?.status === "Absent") {
        details.push({ date: dateStr, sessionId: session.id, points: 0, comment: null, isAbsent: true });
      } else if (assessment) {
        details.push({ date: dateStr, sessionId: session.id, points: assessment.score, comment: assessment.teacher_comment, isAbsent: false });
      }
    });

    return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const compareStudentName = classStudents?.find((s) => s.id === compareStudentId)?.name || "";
  const isLoading = loadingSessions || loadingClassTotals || loadingAssessments || loadingAttendance;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionDates || sessionDates.length === 0) {
    return (
      <div className={iv("text-center py-8 text-hec-small text-hec-ink-soft", "text-center py-8 text-muted-foreground")}>
        No classes scheduled for {format(monthStart, "MMMM yyyy")}.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <motion.h3 
          className={iv("font-display text-hec-h2 font-medium text-hec-ink flex items-center justify-center gap-2", "text-lg font-bold text-foreground flex items-center justify-center gap-2")}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Trophy className={iv("h-5 w-5 text-hec-brass", "h-5 w-5 text-yellow-500")} />
          Skills vs Class Best
          <Trophy className={iv("h-5 w-5 text-hec-brass", "h-5 w-5 text-yellow-500")} />
        </motion.h3>
        <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>Tap a skill to see details</p>
      </div>

      {/* Compare Dropdown */}
      <motion.div 
        className="flex items-center justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>Compare with:</span>
        <Select value={compareStudentId || "_none"} onValueChange={(v) => setCompareStudentId(v === "_none" ? null : v)}>
          <SelectTrigger className={iv("w-48 max-w-full min-h-hec-target", "w-48")}>
            <SelectValue placeholder="Select classmate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {classStudents?.filter((s) => s.id !== studentId).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Skill Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {skillStats.map((skill, index) => (
            <Collapsible
              key={skill.skill}
              open={expandedSkill === skill.skill}
              onOpenChange={(open) => setExpandedSkill(open ? skill.skill : null)}
            >
              <motion.div
                initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, x: -30, scale: 0.95 }}
                animate={ivory ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
                exit={ivory ? { opacity: 0 } : { opacity: 0, x: 30, scale: 0.95 }}
                transition={ivory ? { delay: index * 0.04, duration: 0.24 } : { delay: index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                whileHover={ivory ? undefined : { scale: 1.01, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                className={iv("rounded-hec-lg border border-hec-line bg-hec-surface overflow-hidden shadow-hec-1", "bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm")}
              >
                <CollapsibleTrigger className={iv("w-full p-4 min-h-hec-target hover:bg-hec-sunken transition-colors duration-hec-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "w-full p-4 hover:bg-muted/30 transition-colors cursor-pointer")}>
                  <div className="flex items-center gap-3">
                    {/* Skill Icon */}
                    <motion.div
                      className={iv("w-11 h-11 rounded-hec-md flex items-center justify-center shrink-0", "w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0")}
                      style={{ backgroundColor: `${skill.color}20`, border: `${ivory ? 1 : 2}px solid ${skill.color}` }}
                      whileHover={ivory ? undefined : { rotate: 5, scale: 1.1 }}
                      transition={ivory ? undefined : { type: "spring", stiffness: 400 }}
                    >
                      {skill.Icon && <skill.Icon className="h-5 w-5" style={{ color: skill.color }} />}
                    </motion.div>

                    {/* Skill Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={iv("font-semibold text-hec-ink", "font-bold text-foreground")}>{skill.label}</span>
                        {skill.isLeader && (
                          <Badge className={iv("border-hec-brass/40 bg-hec-sunken text-hec-brass text-hec-caption px-1.5 py-0", "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-xs px-1.5 py-0")}>
                            <Trophy className="h-3 w-3 mr-0.5" /> Leader
                          </Badge>
                        )}
                        {skill.hasImprovement && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: index * 0.08 + 0.3 }}
                          >
                            <Badge className={iv("border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf text-hec-caption px-1.5 py-0", "bg-green-500/20 text-green-500 border-green-500/50 text-xs px-1.5 py-0")}>
                              <TrendingUp className="h-3 w-3 mr-0.5" /> +{skill.improvement}%
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-1 mt-2">
                        {/* Student's bar */}
                        <div className={iv("h-2.5 bg-hec-sunken rounded-full overflow-hidden", "h-2.5 bg-muted/50 rounded-full overflow-hidden")}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: skill.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.percentOfBest}%` }}
                            transition={{ delay: index * 0.08 + 0.2, duration: 0.6 }}
                          />
                        </div>
                        {/* Compare student's bar */}
                        {compareStudentId && (
                          <div className={iv("h-2 bg-hec-sunken rounded-full overflow-hidden", "h-2 bg-muted/30 rounded-full overflow-hidden")}>
                            <motion.div
                              className="h-full rounded-full opacity-60"
                              style={{ backgroundColor: skill.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.classBest > 0 ? Math.min((skill.compareTotal / skill.classBest) * 100, 100) : 0}%` }}
                              transition={{ delay: index * 0.08 + 0.3, duration: 0.6 }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className={iv("flex items-center gap-3 mt-1.5 text-hec-caption text-hec-ink-soft flex-wrap", "flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap")}>
                        <span>You: <span className={iv("font-semibold tabular-nums text-hec-ink", "font-bold text-foreground")}>{skill.studentTotal}pts</span></span>
                        {compareStudentId && (
                          <span className="opacity-70">{compareStudentName.split(" ")[0]}: <span className="font-medium">{skill.compareTotal}pts</span></span>
                        )}
                        <span className="flex items-center gap-1">
                          <Trophy className={iv("h-3 w-3 text-hec-brass", "h-3 w-3 text-yellow-500")} />
                          Best: {skill.classBest}pts
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Avg: {skill.classAverage}pts
                        </span>
                      </div>
                    </div>

                    <div className={iv("text-hec-ink-soft shrink-0", "text-muted-foreground shrink-0")}>
                      {expandedSkill === skill.skill ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className={iv("px-4 pb-4 pt-2 border-t border-hec-line space-y-4", "px-4 pb-4 pt-2 border-t border-border/50 space-y-4")}>
                    {/* Top 3 Leaderboard */}
                    <div>
                      <h4 className={iv("text-hec-small font-medium text-hec-ink-soft mb-2 flex items-center gap-1", "text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1")}>
                        <Crown className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-yellow-500")} /> Top 3 in {skill.label}
                      </h4>
                      <div className="flex gap-2">
                        {skill.top3.map((s, i) => {
                          const RankIcon = RANK_ICONS[i];
                          const isMe = s.studentId === studentId;
                          return (
                            <motion.div
                              key={s.studentId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className={`flex-1 min-w-0 p-2 rounded-hec-md text-center ${isMe ? iv("bg-hec-sunken border border-hec-brass/40", "bg-primary/10 border border-primary/30") : iv("bg-hec-sunken", "bg-muted/30")}`}
                            >
                              <RankIcon className={`h-5 w-5 mx-auto ${ivory ? RANK_COLORS_IVORY[i] : RANK_COLORS[i]}`} />
                              <p className={ivory ? "text-hec-caption font-medium text-hec-ink whitespace-normal break-words hyphens-none mt-1" : "text-xs font-medium truncate mt-1"}>{s.studentName.split(" ")[0]}</p>
                              <p className={iv("text-hec-caption tabular-nums text-hec-ink-soft", "text-xs text-muted-foreground")}>{s.total}pts</p>
                            </motion.div>
                          );
                        })}
                        {skill.top3.length === 0 && (
                          <p className={iv("text-hec-small text-hec-ink-soft text-center w-full py-2", "text-sm text-muted-foreground text-center w-full py-2")}>No data yet</p>
                        )}
                      </div>
                    </div>

                    {/* Session History */}
                    <div>
                      <h4 className={iv("text-hec-small font-medium text-hec-ink-soft mb-2", "text-sm font-medium text-muted-foreground mb-2")}>Session History</h4>
                      <div className="space-y-2">
                        {getSkillSessionDetails(skill.skill).length === 0 ? (
                          <p className={iv("text-hec-small text-hec-ink-soft text-center py-4", "text-sm text-muted-foreground text-center py-4")}>No {skill.label.toLowerCase()} activity yet</p>
                        ) : (
                          getSkillSessionDetails(skill.skill).map((detail, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`flex items-center gap-3 p-2.5 rounded-hec-md ${detail.isAbsent ? iv("bg-hec-danger-tint border border-hec-danger/30", "bg-destructive/10 border border-destructive/30") : iv("bg-hec-sunken", "bg-muted/30")}`}
                            >
                              <span className={iv("text-hec-caption text-hec-ink-soft w-16 shrink-0", "text-xs text-muted-foreground w-16 shrink-0")}>{format(new Date(detail.date), "MMM d")}</span>
                              {detail.isAbsent ? (
                                <span className={iv("flex items-center gap-1.5 text-hec-danger text-hec-small font-medium", "flex items-center gap-1.5 text-destructive text-sm font-medium")}>
                                  <AlertCircle className="h-4 w-4" /> Absent
                                </span>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <span className={iv("font-semibold text-hec-small tabular-nums", "font-bold text-sm")} style={{ color: skill.color }}>+{detail.points}pts</span>
                                  {detail.comment && <span className={iv("text-hec-small text-hec-ink-soft ml-2 truncate", "text-sm text-muted-foreground ml-2 truncate")}>{detail.comment}</span>}
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </motion.div>
            </Collapsible>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div 
        className={iv("text-center text-hec-caption text-hec-ink-soft pt-2", "text-center text-xs text-muted-foreground pt-2")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {sessionDates.length} class session{sessionDates.length !== 1 ? "s" : ""} in {format(monthStart, "MMMM")}
      </motion.div>
    </div>
  );
}
