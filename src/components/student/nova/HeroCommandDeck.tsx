/**
 * HeroCommandDeck — the student dashboard's cinematic opening.
 *
 * Purely presentational. Every value is passed in; this component runs no
 * queries and owns no business logic. It replaces the old hero card with a
 * layered "command deck": drifting aurora orbs, the level ring as a power
 * core, an animated XP energy meter, and a live vitals strip.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LevelProgressRing } from "@/components/student/LevelProgressRing";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { AnimatedNumber } from "@/components/fx/AnimatedNumber";
import { cn } from "@/lib/utils";
import { Edit, Zap, Flame, Star, Trophy, Sparkles } from "lucide-react";

interface Vital {
  icon: React.ElementType;
  label: string;
  value: number;
  tint: string;
}

interface Props {
  firstName: string;
  fullName: string;
  avatarUrl?: string | null;
  statusMessage?: string | null;
  greeting: { text: string; emoji: string; subtext: string };
  levelTitle: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  totalXp: number;
  streak: number;
  pendingHomework: number;
  classesThisWeek: number;
  isMonitor?: boolean;
  onEditProfile: () => void;
}

export function HeroCommandDeck({
  firstName, fullName, avatarUrl, statusMessage, greeting,
  levelTitle, level, currentXp, nextLevelXp, progress, totalXp,
  streak, pendingHomework, classesThisWeek, isMonitor, onEditProfile,
}: Props) {
  const vitals: Vital[] = [
    { icon: Flame, label: "Day streak", value: streak, tint: "text-orange-500" },
    { icon: Star, label: "Total XP", value: totalXp, tint: "text-amber-500" },
    { icon: Trophy, label: "Classes this week", value: classesThisWeek, tint: "text-emerald-500" },
    { icon: Zap, label: "Open quests", value: pendingHomework, tint: "text-violet-500" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "holo-card relative overflow-hidden p-6 md:p-8",
        isMonitor && "ring-2 ring-amber-400/40",
      )}
    >
      {/* Ambient depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <motion.div
          className="nova-orb h-72 w-72 -top-24 -left-16"
          style={{ background: "radial-gradient(circle, hsl(224 90% 62% / .5), transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, 18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="nova-orb h-80 w-80 -bottom-28 right-0"
          style={{ background: "radial-gradient(circle, hsl(280 85% 66% / .42), transparent 70%)" }}
          animate={{ x: [0, -26, 0], y: [0, -20, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div
          className="nova-orb h-56 w-56 top-1/3 left-1/2"
          style={{ background: "radial-gradient(circle, hsl(188 92% 55% / .35), transparent 70%)" }}
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 nova-grid opacity-[0.35] dark:opacity-25" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          {/* Identity */}
          <div className="flex items-center gap-4 md:gap-5 min-w-0 flex-1">
            <div className="shrink-0">
              <MascotCompanion
                studentName={fullName}
                streak={streak}
                pendingHomework={pendingHomework}
                level={level}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <motion.div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <span className="text-xl leading-none">{greeting.emoji}</span>
                <span>{greeting.text},</span>
              </motion.div>

              <h1 className="text-[2rem] sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.05] truncate">
                <span className="aurora-text">{firstName}</span>
              </h1>

              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md shadow-violet-600/25">
                  <Sparkles className="h-3 w-3" />
                  {levelTitle} · Lv {level}
                </span>
                {isMonitor && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-300 ring-1 ring-amber-400/40">
                    ⭐ Class Monitor
                  </span>
                )}
              </div>

              {statusMessage && (
                <p className="text-xs italic text-muted-foreground/80 pt-1 truncate">"{statusMessage}"</p>
              )}
              <p className="text-xs text-muted-foreground">{greeting.subtext}</p>
            </div>
          </div>

          {/* Power core */}
          <div className="flex items-center justify-center lg:justify-end gap-4 shrink-0">
            <motion.div
              initial={{ scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
              className="relative"
            >
              <div
                className="absolute -inset-4 rounded-full blur-2xl opacity-60 pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(224 90% 62% / .45), transparent 70%)" }}
                aria-hidden
              />
              <div className="relative">
                <LevelProgressRing
                  avatarUrl={avatarUrl}
                  name={fullName}
                  level={level}
                  currentXp={currentXp}
                  nextLevelXp={nextLevelXp}
                  progress={progress}
                  totalXp={totalXp}
                  size="lg"
                />
              </div>
            </motion.div>

            <Button
              onClick={onEditProfile}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full glass-sm shrink-0 self-start"
              title="Edit profile"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* XP energy meter */}
        <motion.div
          className="mt-7 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-end justify-between gap-3 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">
              Progress to Level {level + 1}
            </span>
            <span className="font-mono font-bold tabular-nums">
              {currentXp}<span className="text-muted-foreground"> / {nextLevelXp} XP</span>
            </span>
          </div>
          <div className="relative h-3.5 rounded-full bg-muted/60 ring-1 ring-inset ring-border/50 overflow-hidden">
            <motion.div
              className="energy-meter absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(progress, 2)}%` }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>

        {/* Vitals strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {vitals.map((v, i) => (
            <motion.div
              key={v.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.07 }}
              className="rounded-2xl bg-background/45 ring-1 ring-border/50 backdrop-blur-sm px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5">
                <v.icon className={cn("h-3.5 w-3.5", v.tint)} />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                  {v.label}
                </span>
              </div>
              <p className="text-2xl font-black tabular-nums leading-tight mt-0.5">
                <AnimatedNumber value={v.value} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
