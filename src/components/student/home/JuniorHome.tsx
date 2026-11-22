/**
 * The home of Grades 4 to 6 (docs/EXPERIENCE_DESIGN_BRIEF.md G4): a quest board for children who want mastery and
 * fair competition. "The next thing" first; then the open quests (homework cards and the daily challenges, each
 * with what it is worth where the page knows it); the XP ring with the distance to the next level; the streak as a
 * number, never as something lost; the class as the podium and the child's neighbours.
 *
 * Not built here (no data on the page for them): the "one homework would do it" line (the XP value of a homework
 * is not on the page, so only the distance is stated), the streak freeze, custom quests. Money is behind Grown-ups.
 */
import { useState } from "react";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { DailyChallengesCard } from "@/components/student/DailyChallengesCard";
import { LevelProgressRing } from "@/components/student/LevelProgressRing";
import { HomeworkCard } from "@/components/student/homework/HomeworkCard";
import { NextThing } from "@/components/student/home/NextThing";
import { Classmates } from "@/components/student/home/Classmates";
import { useClassmates } from "@/components/student/home/useClassmates";
import { CARD, CARD_TITLE } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import type { HomeData } from "./types";

export function JuniorHome({ data }: { data: HomeData }) {
  const classId = data.enrolledClasses[0]?.classes?.id as string | undefined;
  const classmates = useClassmates(classId, data.studentId);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const toNext = Math.max(0, Math.round(data.nextLevelXp - data.currentXp));
  // The goal is in sight when the next level is within a fifth: the card's edge goes faintly brass.
  const inSight = data.progress >= 80 && data.progress < 100;
  // After a break the card welcomes the child back and starts counting again; it never says a streak was lost.
  const welcomeBack = data.streak === 0 && data.longestStreak > 0;
  const quests = data.homework.pending.filter((h) => h.id !== data.homework.next?.id);
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center gap-4">
          <MascotCompanion pendingHomework={data.homework.ready ? data.homework.todo : null} streak={data.streak} messageSlot={slot} />
          <h1 className="min-w-0 whitespace-normal break-words font-display text-hec-h1 font-medium text-hec-ink">
            <Bi k="hello.name" vars={{ name: data.firstName }} />
          </h1>
        </div>
        <div ref={setSlot} />
      </section>

      <NextThing data={data} band="junior" />

      {(quests.length > 0 || data.challenges.length > 0) && (
        <section aria-labelledby="quests-title" className="space-y-3">
          <h2 id="quests-title" className={CARD_TITLE}>
            <Bi k="quests.title" />
          </h2>
          {quests.slice(0, 4).map((hw, i) => (
            <HomeworkCard key={hw.id} homework={hw} index={i} compact onOpen={() => data.onOpenHomework(hw)} />
          ))}
          <DailyChallengesCard challenges={data.challenges} />
        </section>
      )}

      <section className={cn(CARD, "flex items-center gap-5", inSight && "border-hec-brass/50")}>
        <LevelProgressRing
          ivory
          avatarUrl={data.avatarUrl}
          name={data.fullName}
          level={data.level}
          currentXp={data.currentXp}
          nextLevelXp={data.nextLevelXp}
          progress={data.progress}
          totalXp={data.totalXp}
          size="md"
        />
        <div className="min-w-0 space-y-1">
          <p className="font-display text-hec-h2 font-medium text-hec-ink">{data.levelTitle}</p>
          <p className="text-hec-body font-semibold tabular-nums text-hec-ink">
            <Bi k="level.toNext" vars={{ n: toNext, level: data.level + 1 }} />
          </p>
        </div>
      </section>

      <section className={cn(CARD, "space-y-1")}>
        {welcomeBack ? (
          <p className="text-hec-body text-hec-ink">
            <Bi k="streak.welcome" vars={{ n: data.longestStreak }} />
          </p>
        ) : (
          <>
            <p className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">
              <Bi k="streak.days" vars={{ n: data.streak }} />
            </p>
            {data.longestStreak > 0 && (
              <p className="text-hec-small tabular-nums text-hec-ink-soft">
                <Bi k="streak.best" vars={{ n: data.longestStreak }} />
              </p>
            )}
          </>
        )}
      </section>

      <Classmates band="junior" data={classmates} />
    </div>
  );
}
