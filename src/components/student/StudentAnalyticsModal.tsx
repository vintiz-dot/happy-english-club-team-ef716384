import { motion, AnimatePresence } from "framer-motion";
import { X, Sword, BookOpen, TrendingUp, Sparkles, Zap, History, GraduationCap } from "lucide-react";
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
    rank: number;
  } | null;
  classId: string;
  selectedMonth: string; // YYYY-MM format
}

import { calculateLevel, getLevelTitle } from "@/lib/levelUtils";

function getRankGlow(rank: number): string {
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

function getRankBadge(rank: number): React.ReactNode {
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            >
              {/* Header Section - Character Profile */}
              <div className="relative p-6 pb-8 bg-gradient-to-br from-primary/20 via-background to-blue-500/10 border-b border-border/50">
                {/* Background sparkles */}
                <div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: 20 }).map((_, i) => (
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
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="relative flex flex-col items-center">
                  {/* Avatar with glow */}
                  <motion.div
                    className="relative mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
                  >
                    <Avatar className={`h-28 w-28 ${getRankGlow(student.rank)} transition-all`}>
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
                    {getRankBadge(student.rank)}
                  </motion.div>

                  {/* Name and Level */}
                  <motion.h2
                    className="text-2xl font-black text-foreground mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {student.name}
                  </motion.h2>
                  
                  <Badge variant="outline" className="mb-2 text-xs">
                    {monthLabel}
                  </Badge>

                  <motion.div
                    className="flex items-center gap-2 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">Level {levelInfo.level} — {getLevelTitle(levelInfo.level)}</span>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </motion.div>

                  {/* XP Progress Bar */}
                  <motion.div
                    className="w-full max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>XP: {student.totalPoints}</span>
                      <span>Next: {levelInfo.currentXp}/{levelInfo.nextLevelXp}</span>
                    </div>
                    <div className="relative overflow-hidden rounded-full">
                      <Progress value={levelInfo.progress} className="h-3 bg-muted/50" />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>

                  {/* Points Breakdown */}
                  <motion.div
                    className="flex justify-center gap-4 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{student.homeworkPoints || 0}</span>
                      <span className="text-muted-foreground text-xs">HW</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-full px-3 py-1.5">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-sm">{student.participationPoints || 0}</span>
                      <span className="text-muted-foreground text-xs">Part</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-teal-500/10 rounded-full px-3 py-1.5">
                      <GraduationCap className="h-4 w-4 text-teal-500" />
                      <span className="font-semibold text-sm">{student.readingTheoryPoints || 0}</span>
                      <span className="text-muted-foreground text-xs">RT</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Tabs Section */}
              <div className="p-6">
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
