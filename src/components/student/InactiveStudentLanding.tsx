import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassCatalog } from "./ClassCatalog";
import { LevelProgressRing } from "./LevelProgressRing";
import { calculateLevel, getLevelTitle } from "@/lib/levelUtils";
import { Link } from "react-router-dom";
import { BookOpen, Trophy, Star, Zap, Clock, FileText, DollarSign, Rocket, Users, TrendingUp } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const } },
};

interface InactiveStudentLandingProps {
  student: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    status_message?: string | null;
  };
  isReturning: boolean;
  studentId: string;
}

export function InactiveStudentLanding({ student, isReturning, studentId }: InactiveStudentLandingProps) {
  // Fetch total XP for returning students
  const { data: totalPoints } = useQuery({
    queryKey: ["student-total-points", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_points" as any)
        .select("total_points")
        .eq("student_id", studentId);
      return (data as any[])?.reduce((sum: number, p: any) => sum + (p.total_points || 0), 0) || 0;
    },
    enabled: !!studentId && isReturning,
  });

  // Count of active students for social proof
  const { data: activeStudentCount } = useQuery({
    queryKey: ["active-student-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
  });

  const levelInfo = calculateLevel(totalPoints || 0);

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1"
      >
        <div className="relative p-6 md:p-12">
          {isReturning ? (
            /* --- RETURNING STUDENT --- */
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <LevelProgressRing
                avatarUrl={student.avatar_url}
                name={student.full_name}
                level={levelInfo.level}
                currentXp={levelInfo.currentXp}
                nextLevelXp={levelInfo.nextLevelXp}
                progress={levelInfo.progress}
                totalXp={totalPoints || 0}
                size="lg"
              />
              <div className="min-w-0 flex-1 space-y-3 text-center lg:text-left">
                <h1 className="font-display text-hec-display font-medium text-hec-ink">
                  Welcome Back, {student.full_name.split(" ")[0]}! 👋
                </h1>
                <p className="text-hec-body text-hec-ink-soft">
                  We've missed you! Your <span className="font-semibold text-hec-ink">{getLevelTitle(levelInfo.level)}</span> title
                  and <span className="font-semibold tabular-nums text-hec-ink">{totalPoints || 0} XP</span> are waiting for you.
                </p>
                <div className="inline-block rounded-hec-md border border-hec-line bg-hec-sunken p-4">
                  <p className="flex items-center gap-2 text-hec-small font-medium text-hec-ink">
                    <TrendingUp className="h-4 w-4 text-hec-ink-soft" />
                    Your classmates are earning XP without you! 🔥
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* --- NEW STUDENT --- */
            <div className="text-center space-y-4">
              <div className="mb-4 text-6xl">
                🚀
              </div>
              <h1 className="font-display text-hec-display font-medium text-hec-ink">
                Start Your Learning Journey!
              </h1>
              <p className="mx-auto max-w-lg text-hec-body text-hec-ink-soft">
                Hey {student.full_name.split(" ")[0]}! Join a class and start earning XP,
                unlocking achievements, and climbing leaderboards!
              </p>
            </div>
          )}

          {/* Social Proof */}
          {activeStudentCount && activeStudentCount > 0 && (
            <motion.div
              variants={itemVariants}
              className="mt-6 flex justify-center"
            >
              <Badge variant="secondary" className="gap-2 px-4 py-2 text-hec-small">
                <Users className="h-4 w-4" />
                {activeStudentCount} students are learning right now
              </Badge>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Benefits Showcase (New students) */}
      {!isReturning && (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Earn XP", desc: "Complete homework & attend classes to level up", iconColor: "text-hec-ink-soft" },
            { icon: Trophy, title: "Achievements", desc: "Unlock badges and show them off", iconColor: "text-hec-ink-soft" },
            { icon: Star, title: "Leaderboards", desc: "Compete with classmates for the top spot", iconColor: "text-hec-ink-soft" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: i * 0.04 }}
            >
              <Card className="h-full">
                <CardContent className="space-y-3 p-4 text-center sm:p-6">
                  <item.icon className={`mx-auto h-10 w-10 ${item.iconColor}`} />
                  <h3 className="text-hec-h3 font-semibold text-hec-ink">{item.title}</h3>
                  <p className="text-hec-small text-hec-ink-soft">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Historical Data Quick Access (Returning students) */}
      {isReturning && (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/student/assignments", icon: BookOpen, title: "Past Homework", desc: "View your completed work" },
            { to: "/tuition", icon: DollarSign, title: "Financial History", desc: "Payments & invoices" },
            { to: "/student/journal", icon: FileText, title: "My Journal", desc: "Your past entries" },
          ].map((item, i) => (
            <Link key={item.to} to={item.to} className="block min-h-hec-target rounded-hec-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: i * 0.04 }}
              >
                <Card className="group h-full cursor-pointer transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2">
                  <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                    <div className="shrink-0 rounded-hec-md bg-hec-sunken p-3">
                      <item.icon className="h-6 w-6 text-hec-ink" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-hec-h3 font-semibold text-hec-ink">{item.title}</h3>
                      <p className="text-hec-small text-hec-ink-soft">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Class Catalog */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-hec-md bg-hec-sunken p-3">
            <Rocket className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-hec-h1 font-medium text-hec-ink">
              {isReturning ? "Ready to Come Back?" : "Available Classes"}
            </h2>
            <p className="text-hec-small text-hec-ink-soft">
              Browse classes and send a request to join
            </p>
          </div>
        </div>
        <ClassCatalog studentId={studentId} />
      </motion.div>
    </motion.div>
  );
}
