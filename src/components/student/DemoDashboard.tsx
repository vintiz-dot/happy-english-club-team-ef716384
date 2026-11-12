import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LevelProgressRing } from "./LevelProgressRing";
import { ClassCatalog } from "./ClassCatalog";
import { WelcomeTour } from "./WelcomeTour";
import {
  Sparkles, Trophy, BookOpen, Zap, Star, Target, Calendar,
  Clock, Rocket, Users, TrendingUp, Shield, ChevronRight, Lock,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const } },
};

// Mock data to show what the dashboard looks like
const MOCK_LEADERBOARD = [
  { rank: 1, name: "You ⭐", xp: 2450, highlight: true },
  { rank: 2, name: "Sarah L.", xp: 2120 },
  { rank: 3, name: "Tom K.", xp: 1890 },
  { rank: 4, name: "Mai N.", xp: 1650 },
  { rank: 5, name: "Alex P.", xp: 1420 },
];

const MOCK_SCHEDULE = [
  { day: "Mon", time: "4:00 PM", class: "English Basics", active: true },
  { day: "Wed", time: "4:00 PM", class: "English Basics", active: false },
  { day: "Fri", time: "5:30 PM", class: "Reading Club", active: false },
];

const MOCK_CHALLENGES = [
  { icon: "✅", title: "Daily Check-In", xp: 1, done: true },
  { icon: "📚", title: "Homework Hero", xp: 20, done: false },
  { icon: "🎓", title: "Class Champion", xp: 15, done: false },
];

interface DemoDashboardProps {
  student: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  studentId: string;
}

export function DemoDashboard({ student, studentId }: DemoDashboardProps) {
  const firstName = student?.full_name?.split(" ")[0] || "Student";

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <WelcomeTour />
      {/* Hero Welcome */}
      <motion.div
        id="demo-hero"
        variants={itemVariants}
        className="relative overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1"
      >
        <div className="relative flex flex-col items-center gap-8 p-6 md:flex-row md:p-10">
          {/* Level ring with demo data */}
          <LevelProgressRing
            avatarUrl={student?.avatar_url ?? null}
            name={student?.full_name || "Student"}
            level={1}
            currentXp={0}
            nextLevelXp={100}
            progress={0}
            totalXp={0}
            size="lg"
          />

          <div className="min-w-0 flex-1 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-hec-brass/40 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-hec-brass" />
              <span className="text-hec-caption font-medium text-hec-brass">Your Adventure Begins</span>
            </div>

            <h1 className="font-display text-hec-display font-medium text-hec-ink">
              Welcome, {firstName}! 🚀
            </h1>
            <p className="max-w-lg text-hec-body text-hec-ink-soft">
              Here's a sneak peek of your dashboard. Enroll in a class to unlock everything!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Demo Preview Banner */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start gap-3 rounded-hec-md border border-hec-line bg-hec-sunken p-4">
          <div className="shrink-0 p-2">
            <Rocket className="h-5 w-5 text-hec-ink-soft" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-hec-small font-semibold text-hec-ink">This is a preview of your dashboard</p>
            <p className="text-hec-caption text-hec-ink-soft">Enroll in a class below to unlock XP, leaderboards, homework tracking, and more!</p>
          </div>
          <Badge variant="secondary" className="hidden shrink-0 gap-1 text-hec-caption sm:flex">
            <Lock className="h-3 w-3" /> Demo Mode
          </Badge>
        </div>
      </motion.div>

      {/* Stats Preview Row */}
      <motion.div id="demo-stats" variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: "Total XP", value: "0" },
          { icon: Trophy, label: "Rank", value: "—" },
          { icon: BookOpen, label: "Homework", value: "0" },
          { icon: Star, label: "Streak", value: "0 days" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-1 p-4 text-center">
              <stat.icon className="mx-auto h-6 w-6 text-hec-ink-soft" />
              <p className="text-hec-h1 font-semibold tabular-nums text-hec-ink">{stat.value}</p>
              <p className="text-hec-caption text-hec-ink-soft">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Two-column layout: Leaderboard + Challenges */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Mock Leaderboard */}
        <motion.div id="demo-leaderboard" variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="relative space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-hec-brass" />
                  <h3 className="font-display text-hec-h2 font-medium text-hec-ink">Class Leaderboard</h3>
                </div>
                <Badge variant="outline" className="text-hec-caption">Preview</Badge>
              </div>
              <div className="space-y-2">
                {MOCK_LEADERBOARD.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 rounded-hec-md p-3 ${
                      entry.highlight
                        ? "border border-hec-brass/40 bg-hec-surface"
                        : "bg-hec-sunken"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hec-sunken text-hec-small font-medium tabular-nums text-hec-ink-soft">
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-hec-small font-semibold text-hec-ink">
                      {entry.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-hec-caption font-medium tabular-nums text-hec-ink-soft">
                      <Zap className="h-3 w-3" /> {entry.xp.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mock Daily Challenges */}
        <motion.div id="demo-challenges" variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="relative space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-hec-ink-soft" />
                  <h3 className="font-display text-hec-h2 font-medium text-hec-ink">Daily Challenges</h3>
                </div>
                <Badge variant="outline" className="text-hec-caption">Preview</Badge>
              </div>
              <div className="space-y-3">
                {MOCK_CHALLENGES.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-hec-md p-3 ${
                      c.done ? "border border-hec-leaf/30 bg-hec-leaf-tint" : "bg-hec-sunken"
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-hec-small font-semibold text-hec-ink">{c.title}</p>
                      <p className="text-hec-caption text-hec-ink-soft">+{c.xp} XP</p>
                    </div>
                    {c.done && (
                      <Badge className="shrink-0 border-hec-leaf/30 bg-hec-leaf-tint text-hec-caption text-hec-leaf">Done</Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Mock Schedule Preview */}
              <div className="space-y-3 border-t border-hec-line pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-hec-ink-soft" />
                  <h4 className="text-hec-small font-semibold text-hec-ink">Upcoming Schedule</h4>
                </div>
                {MOCK_SCHEDULE.map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-hec-sm bg-hec-sunken px-3 py-2">
                    <Badge variant="outline" className="w-12 justify-center text-hec-caption tabular-nums">{s.day}</Badge>
                    <Clock className="h-3.5 w-3.5 text-hec-ink-soft" />
                    <span className="text-hec-caption text-hec-ink-soft">{s.time}</span>
                    <span className="min-w-0 break-words text-hec-caption font-medium text-hec-ink">{s.class}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* What You'll Unlock Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-hec-h1 font-medium text-hec-ink">
          <Sparkles className="h-6 w-6 text-hec-brass" />
          What You'll Unlock
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Earn XP", desc: "Every class attended & homework completed earns you experience points", iconColor: "text-hec-ink-soft" },
            { icon: Trophy, title: "Climb Leaderboards", desc: "Compete with classmates and become #1 in your class", iconColor: "text-hec-ink-soft" },
            { icon: Shield, title: "Unlock Achievements", desc: "Earn badges for streaks, perfect scores, and milestones", iconColor: "text-hec-ink-soft" },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="space-y-3 p-4 text-center sm:p-6">
                <div>
                  <item.icon className={`mx-auto h-10 w-10 ${item.iconColor}`} />
                </div>
                <h3 className="text-hec-h3 font-semibold text-hec-ink">{item.title}</h3>
                <p className="text-hec-small text-hec-ink-soft">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Class Catalog — Real enrollment action */}
      <motion.div id="demo-enroll" variants={itemVariants} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-hec-md bg-hec-sunken p-3">
            <Rocket className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-hec-h1 font-medium text-hec-ink">Join a Class</h2>
            <p className="text-hec-small text-hec-ink-soft">Browse available classes and send a request to enroll</p>
          </div>
        </div>
        <ClassCatalog studentId={studentId} />
      </motion.div>
    </motion.div>
  );
}
