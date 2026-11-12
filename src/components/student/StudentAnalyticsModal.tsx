import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, History, Sparkles, SpellCheck, Sword, TrendingUp, X, Zap } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getAvatarUrl, getRandomAvatarUrl } from "@/lib/avatars";
import { RadarChartTab } from "./analytics/RadarChartTab";
import { PerformanceHeatmapTab } from "./analytics/PerformanceHeatmapTab";
import { QuestLogTab } from "./analytics/QuestLogTab";
import { PointHistoryTab } from "./analytics/PointHistoryTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parse } from "date-fns";
import { useIvory } from "@/hooks/useIvory";

interface StudentAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    totalPoints: number;
    homeworkPoints?: number;
    participationPoints?: number;
    readingTheoryPoints?: number;
    vocabularyQuizPoints?: number;
    rank: number;
  } | null;
  classId: string;
  selectedMonth: string; // YYYY-MM format
}

import { calculateLevel, getLevelTitle } from "@/lib/levelUtils";

function getRankGlow(rank: number, ivory: boolean): string {
  // Ivory: a plain ring, brass for the podium. No glow.
  if (ivory) return rank <= 3 ? "ring-2 ring-hec-brass ring-offset-2 ring-offset-hec-surface" : "ring-1 ring-hec-line-strong";
  switch (rank) {
    case 1:
      return "ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.5)]";
    case 2:
      return "ring-4 ring-gray-300/50 shadow-[0_0_30px_rgba(156,163,175,0.5)]";
    case 3:
      return "ring-4 ring-amber-600/50 shadow-[0_0_30px_rgba(217,119,6,0.5)]";
    default:
      return "ring-2 ring-primary/30";
  }
}

function getRankBadge(rank: number, ivory: boolean): React.ReactNode {
  if (ivory) {
    const label = rank === 1 ? "#1 CHAMPION" : rank === 2 ? "#2 ELITE" : rank === 3 ? "#3 WARRIOR" : `#${rank}`;
    return (
      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-hec-caption font-semibold tabular-nums bg-hec-surface text-hec-ink ${rank <= 3 ? "border-hec-brass/40" : "border-hec-line"}`}>
        {label}
      </div>
    );
  }
  const baseClasses = "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-black text-sm";
  
  switch (rank) {
    case 1:
      return <div className={`${baseClasses} bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900`}>#1 CHAMPION</div>;
    case 2:
      return <div className={`${baseClasses} bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800`}>#2 ELITE</div>;
    case 3:
      return <div className={`${baseClasses} bg-gradient-to-r from-amber-500 to-amber-700 text-amber-100`}>#3 WARRIOR</div>;
    default:
      return <div className={`${baseClasses} bg-primary/20 text-primary border border-primary/30`}>#{rank}</div>;
  }
}

export function StudentAnalyticsModal({ open, onOpenChange, student, classId, selectedMonth }: StudentAnalyticsModalProps) {
  // Opened from the teacher/admin class board too (not migrated yet): old classes there.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const monthLabel = format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy");
  const { user } = useAuth();
  // Fetch the current viewer's student ID to determine if viewing own profile or classmate's
  const { data: viewerStudentId } = useQuery({
    queryKey: ["viewer-student-id", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("linked_user_id", user.id)
        .maybeSingle();

      return data?.id || null;
    },
    enabled: open && !!user,
  });

  if (!student) return null;

  const levelInfo = calculateLevel(student.totalPoints);
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={iv("max-w-3xl max-h-[85dvh] overflow-y-auto p-0 gap-0", "max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50")}>
            <motion.div
              initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.9, y: 20 }}
              animate={ivory ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={ivory ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
              transition={ivory ? { duration: 0.24 } : { type: "spring", duration: 0.5, bounce: 0.3 }}
            >
              {/* Header Section - Character Profile */}
              <div className={iv("relative p-4 pb-8 sm:p-6 sm:pb-8 bg-hec-surface border-b border-hec-line", "relative p-6 pb-8 bg-gradient-to-br from-primary/20 via-background to-blue-500/10 border-b border-border/50")}>
                {/* Background sparkles */}
                <div className="absolute inset-0 overflow-hidden">
                  {!ivory && Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-primary/40 rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => onOpenChange(false)}
                  className={iv("absolute top-2 right-2 flex min-h-hec-target min-w-hec-target items-center justify-center rounded-full text-hec-ink hover:bg-hec-sunken transition-colors duration-hec-1 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10")}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="relative flex flex-col items-center">
                  {/* Avatar with glow */}
                  <motion.div
                    className="relative mb-6"
                    initial={ivory ? { opacity: 0 } : { scale: 0 }}
                    animate={ivory ? { opacity: 1 } : { scale: 1 }}
                    transition={ivory ? { duration: 0.24 } : { type: "spring", delay: 0.1, bounce: 0.5 }}
                  >
                    <Avatar className={`h-28 w-28 ${getRankGlow(student.rank, ivory)} transition-all`}>
                      <AvatarImage
                        src={getAvatarUrl(student.avatarUrl) || getRandomAvatarUrl(student.id)}
                        alt={student.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-3xl font-black">
                        <img
                          src={getRandomAvatarUrl(student.id)}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      </AvatarFallback>
                    </Avatar>
                    {getRankBadge(student.rank, ivory)}
                  </motion.div>

                  {/* Name and Level */}
                  <motion.h2
                    className={iv("font-display text-hec-h1 font-medium text-hec-ink mb-1 text-center whitespace-normal break-words hyphens-none text-balance", "text-2xl font-black text-foreground mb-1")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {student.name}
                  </motion.h2>
                  
                  <Badge variant="outline" className={iv("mb-2 text-hec-caption", "mb-2 text-xs")}>
                    {monthLabel}
                  </Badge>

                  <motion.div
                    className="flex items-center gap-2 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Sparkles className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-primary")} />
                    <span className={iv("text-hec-small font-semibold text-hec-ink", "text-sm font-bold text-primary")}>Level {levelInfo.level} — {getLevelTitle(levelInfo.level)}</span>
                    <Sparkles className={iv("h-4 w-4 text-hec-brass", "h-4 w-4 text-primary")} />
                  </motion.div>

                  {/* XP Progress Bar */}
                  <motion.div
                    className="w-full max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className={iv("flex justify-between text-hec-caption text-hec-ink-soft tabular-nums mb-1", "flex justify-between text-xs text-muted-foreground mb-1")}>
                      <span>XP: {student.totalPoints}</span>
                      <span>Next: {levelInfo.currentXp}/{levelInfo.nextLevelXp}</span>
                    </div>
                    <div className="relative overflow-hidden rounded-full">
                      <Progress value={levelInfo.progress} className={iv("h-3 bg-hec-sunken", "h-3 bg-muted/50")} />
                      {!ivory && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      )}
                    </div>
                  </motion.div>

                  {/* Points Breakdown */}
                  <motion.div
                    className={iv("flex flex-wrap justify-center gap-2 mt-4", "flex justify-center gap-4 mt-4")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className={iv("flex items-center gap-1.5 bg-hec-sunken rounded-full px-3 py-1.5", "flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5")}>
                      <BookOpen className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-primary")} />
                      <span className={iv("font-semibold text-hec-small tabular-nums text-hec-ink", "font-semibold text-sm")}>{student.homeworkPoints || 0}</span>
                      <span className={iv("text-hec-ink-soft text-hec-caption", "text-muted-foreground text-xs")}>HW</span>
                    </div>
                    <div className={iv("flex items-center gap-1.5 bg-hec-sunken rounded-full px-3 py-1.5", "flex items-center gap-1.5 bg-amber-500/10 rounded-full px-3 py-1.5")}>
                      <Zap className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-amber-500")} />
                      <span className={iv("font-semibold text-hec-small tabular-nums text-hec-ink", "font-semibold text-sm")}>{student.participationPoints || 0}</span>
                      <span className={iv("text-hec-ink-soft text-hec-caption", "text-muted-foreground text-xs")}>Part</span>
                    </div>
                    <div className={iv("flex items-center gap-1.5 bg-hec-sunken rounded-full px-3 py-1.5", "flex items-center gap-1.5 bg-teal-500/10 rounded-full px-3 py-1.5")}>
                      <GraduationCap className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-teal-500")} />
                      <span className={iv("font-semibold text-hec-small tabular-nums text-hec-ink", "font-semibold text-sm")}>{student.readingTheoryPoints || 0}</span>
                      <span className={iv("text-hec-ink-soft text-hec-caption", "text-muted-foreground text-xs")}>RT</span>
                    </div>
                    <div className={iv("flex items-center gap-1.5 bg-hec-sunken rounded-full px-3 py-1.5", "flex items-center gap-1.5 bg-violet-500/10 rounded-full px-3 py-1.5")}>
                      <SpellCheck className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-violet-500")} />
                      <span className={iv("font-semibold text-hec-small tabular-nums text-hec-ink", "font-semibold text-sm")}>{student.vocabularyQuizPoints || 0}</span>
                      <span className={iv("text-hec-ink-soft text-hec-caption", "text-muted-foreground text-xs")}>Vocab</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Tabs Section */}
              <div className={iv("p-4 sm:p-6", "p-6")}>
                <Tabs defaultValue="attributes" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="attributes" className="flex items-center gap-2">
                      <Sword className="h-4 w-4" />
                      <span className="hidden sm:inline">Attributes</span>
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Performance</span>
                    </TabsTrigger>
                    <TabsTrigger value="quests" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Quest Log</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">History</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="attributes">
                    <RadarChartTab studentId={student.id} classId={classId} />
                  </TabsContent>

                  <TabsContent value="heatmap">
                    <PerformanceHeatmapTab studentId={student.id} classId={classId} selectedMonth={selectedMonth} />
                  </TabsContent>

                  <TabsContent value="quests">
                    <QuestLogTab 
                      studentId={student.id} 
                      classId={classId} 
                      selectedMonth={selectedMonth}
                      viewerStudentId={viewerStudentId || undefined}
                    />
                  </TabsContent>

                  <TabsContent value="history">
                    <PointHistoryTab 
                      studentId={student.id} 
                      classId={classId} 
                      selectedMonth={selectedMonth}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
