/**
 * HeroCommandDeck — the opening card of the student dashboard.
 *
 * Purely presentational. Every value is passed in; this component runs no
 * queries and owns no business logic. In the "Ivory" design system
 * (docs/DESIGN_SYSTEM.md): one card, the child's name in the display serif as
 * the focal point, the level ring and one progress meter beside it, the four
 * vitals under a hairline. The mascot stays; its message is a line in the
 * normal flow under the name, so it can never cover the name.
 */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LevelProgressRing } from "@/components/student/LevelProgressRing";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { cn } from "@/lib/utils";
import { Edit, Zap, Flame, Star, Trophy } from "lucide-react";
import { BADGE_NEUTRAL, BADGE_BRASS, FOCUS, LABEL, WARM_CARD } from "./ivory";

interface Vital {
  icon: React.ElementType;
  label: string;
  value: number;
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
  fullName, avatarUrl, statusMessage, greeting,
  levelTitle, level, currentXp, nextLevelXp, progress, totalXp,
  streak, pendingHomework, classesThisWeek, isMonitor, onEditProfile,
}: Props) {
  const reduce = useReducedMotion();
  // Where the mascot's message is drawn: a row under the name, in the flow.
  const [messageSlot, setMessageSlot] = useState<HTMLDivElement | null>(null);

  const vitals: Vital[] = [
    { icon: Flame, label: "Day streak", value: streak },
    { icon: Star, label: "Total XP", value: totalXp },
    { icon: Trophy, label: "Classes this week", value: classesThisWeek },
    { icon: Zap, label: "Open quests", value: pendingHomework },
  ];

  return (
    <section
      className={cn(WARM_CARD, "lg:p-8", isMonitor && "border-hec-brass/40")}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Identity: the focal point */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className="shrink-0 pt-1">
              <MascotCompanion
                studentName={fullName}
                streak={streak}
                pendingHomework={pendingHomework}
                level={level}
                messageSlot={messageSlot}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
                <span aria-hidden>{greeting.emoji}</span>
                <span>{greeting.text},</span>
              </p>
              <h1 className="whitespace-normal break-words text-balance font-display text-hec-display font-medium text-hec-ink [hyphens:none] [[data-hec-scale=young]_&]:font-bold">
                {fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={BADGE_NEUTRAL}>
                  {levelTitle} · Lv {level}
                </span>
                {isMonitor && (
                  <span className={BADGE_BRASS}>
                    <span aria-hidden>⭐</span> Class Monitor
                  </span>
                )}
              </div>
              {statusMessage && (
                <p className="whitespace-normal break-words text-hec-small italic text-hec-ink-soft">"{statusMessage}"</p>
              )}
            </div>
          </div>
          {/* The mascot's message lands here (role=status), full width of the card. */}
          <div ref={setMessageSlot} className="mt-4" />
        </div>

        {/* Level: ring + one meter */}
        <div className="flex items-center gap-6 lg:w-96 lg:shrink-0">
          <div className="shrink-0">
            <LevelProgressRing
              ivory
              avatarUrl={avatarUrl}
              name={fullName}
              level={level}
              currentXp={currentXp}
              nextLevelXp={nextLevelXp}
              progress={progress}
              totalXp={totalXp}
              size="md"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className={LABEL}>Progress to Level {level + 1}</p>
            <p className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">
              {currentXp}<span className="font-normal text-hec-ink-soft"> / {nextLevelXp} XP</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-hec-sunken">
              <motion.div
                className="h-2 rounded-full bg-hec-brass"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.max(progress, 2)}%` }}
                transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <button
              type="button"
              onClick={onEditProfile}
              title="Edit profile"
              className={cn(
                "-ml-3 inline-flex min-h-hec-target items-center gap-2 rounded-hec-md px-3 text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken hover:text-hec-ink",
                FOCUS,
              )}
            >
              <Edit className="h-4 w-4" aria-hidden />
              Edit profile
            </button>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-hec-line pt-6 sm:grid-cols-4">
        {vitals.map((v) => (
          <div key={v.label} className="min-w-0 space-y-1">
            <dt className={cn(LABEL, "flex items-center gap-2")}>
              <v.icon className="h-4 w-4 shrink-0 text-hec-ink-faint" aria-hidden />
              <span className="min-w-0">{v.label}</span>
            </dt>
            <dd className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{v.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
