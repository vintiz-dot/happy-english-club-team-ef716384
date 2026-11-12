import { OverviewStats } from "@/components/admin/OverviewStats";
import { TodayAgenda } from "@/components/admin/TodayAgenda";
import { AdminAlerts } from "@/components/admin/AdminAlerts";
import { LeaderboardResetControl } from "@/components/admin/LeaderboardResetControl";
import { PointsResetControl } from "@/components/admin/PointsResetControl";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { motion } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import { useMemo } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function useGreeting() {
  return useMemo(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return { word, date };
  }, []);
}

const OverviewTab = () => {
  const { word, date } = useGreeting();
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={date}
        title={`${word} — Command Center`}
        subtitle="Real-time view of the club — stats, schedule, alerts. Press Ctrl+K to jump anywhere."
        variant="aurora"
      />

      <section>
        <SectionHeader
          title="Quick Stats"
          subtitle="Live numbers, refreshed in the background."
        />
        <OverviewStats />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
          <TodayAgenda />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
          <AdminAlerts />
        </motion.div>
      </section>

      <section>
        <SectionHeader
          title="Quick Actions"
          subtitle="Manage leaderboards and points."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <ControlPanel
            icon={Trophy}
            title="Leaderboard Control"
            description="Archive and reset monthly rankings."
            tone="amber"
            delay={0.05}
          >
            <LeaderboardResetControl />
          </ControlPanel>

          <ControlPanel
            icon={Star}
            title="Points Control"
            description="Reset student points system."
            tone="violet"
            delay={0.1}
          >
            <PointsResetControl />
          </ControlPanel>
        </div>
      </section>
    </div>
  );
};

interface ControlPanelProps {
  icon: typeof Trophy;
  title: string;
  description: string;
  tone: "amber" | "violet";
  delay?: number;
  children: React.ReactNode;
}

function ControlPanel({ icon: Icon, title, description, tone, delay = 0, children }: ControlPanelProps) {
  // Trophy is a reward (brass); the points star is plain information.
  const toneIcon = tone === "amber" ? "text-hec-brass" : "text-hec-ink-soft";
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3, delay }}>
      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken ${toneIcon}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-hec-h2 font-medium text-hec-ink">{title}</h3>
            <p className="text-hec-small text-hec-ink-soft">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

export default OverviewTab;
