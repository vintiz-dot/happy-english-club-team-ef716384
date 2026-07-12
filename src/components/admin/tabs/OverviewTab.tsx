import { OverviewStats } from "@/components/admin/OverviewStats";
import { TodayAgenda } from "@/components/admin/TodayAgenda";
import { AdminAlerts } from "@/components/admin/AdminAlerts";
import { LeaderboardResetControl } from "@/components/admin/LeaderboardResetControl";
import { PointsResetControl } from "@/components/admin/PointsResetControl";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { motion } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import { useMemo } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
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

        <div className="grid gap-5 md:grid-cols-2">
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
  const toneRing = tone === "amber" ? "ring-amber-500/15" : "ring-blue-500/15";
  const toneIcon =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
      : "bg-blue-500/15 text-blue-600 dark:text-blue-300";
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.3, delay }}>
      <SpotlightCard className={`surface-2 rounded-2xl p-5 ring-1 ${toneRing} shadow-q1 lift`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${toneIcon}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="type-h2">{title}</h3>
            <p className="type-micro text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </SpotlightCard>
    </motion.div>
  );
}

export default OverviewTab;
