/**
 * The home of Grades 2 and 3 (docs/EXPERIENCE_DESIGN_BRIEF.md G3): "the next thing" with Pip beside it; the level
 * title as a ribbon with the level ring filling in leaf; the week as a path of stops; a shelf of badges (the earned
 * ones and at most three outlined empty places); the week's stickers with the best run as a quiet fact; and the
 * class as a podium of three and "You: N points". No flame that goes out, no rank outside the three.
 * Money is behind Grown-ups.
 */
import { useState } from "react";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { AchievementBadges } from "@/components/student/AchievementBadges";
import { NextThing } from "@/components/student/home/NextThing";
import { WeekPath } from "@/components/student/home/WeekPath";
import { WeekStrip } from "@/components/student/home/WeekStrip";
import { ClassBlocks } from "@/components/student/home/ClassBlocks";
import { InkRing } from "@/components/fx/InkRing";
import { CARD } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import type { HomeData } from "./types";

export function YoungHome({ data }: { data: HomeData }) {
  // Pip's line lands in a row under the two columns, so it can never squeeze the card beside him.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {/* Beside the card from a wider phone; stacked on the narrowest, where the card would be too narrow to read. */}
        <div className="flex flex-col items-center gap-3 min-[420px]:flex-row min-[420px]:items-start">
          <div className="shrink-0">
            <MascotCompanion pendingHomework={data.homework.ready ? data.homework.todo : null} messageSlot={slot} />
          </div>
          <div className="w-full min-w-0 flex-1">
            <NextThing data={data} band="young" />
          </div>
        </div>
        <div ref={setSlot} />
      </section>

      <section className={cn(CARD, "flex items-center gap-4")}>
        <InkRing value={data.progress} max={100} size={72} strokeWidth={6} label={`Level ${data.level}`}>
          {data.level}
        </InkRing>
        <div className="min-w-0 space-y-1">
          <h1 className="whitespace-normal break-words font-display text-hec-h1 font-bold text-hec-ink">
            <Bi k="hello.name" vars={{ name: data.firstName }} />
          </h1>
          <p className="inline-block rounded-hec-sm border border-hec-brass/40 px-3 py-1 text-hec-small font-medium text-hec-brass">
            {data.levelTitle} · <Bi k="level.label" vars={{ n: data.level }} className="align-baseline" viClassName="hidden" />
          </p>
        </div>
      </section>

      <WeekPath data={data} />

      <section className={CARD}>
        <AchievementBadges
          totalXp={data.totalXp}
          homeworkCompleted={data.achievement.homeworkCompleted}
          perfectAttendanceWeeks={data.achievement.perfectWeeks}
          currentStreak={data.streak}
          longestStreak={data.longestStreak}
          classesAttended={data.achievement.classesAttended}
          featuredBadgeId={data.featuredBadgeId ?? undefined}
          onFeatureBadge={data.onFeatureBadge}
          lockedLimit={3}
        />
      </section>

      <WeekStrip week={data.weekActivity} best={data.longestStreak} />
      <ClassBlocks band="young" enrolledClasses={data.enrolledClasses} studentId={data.studentId} />
    </div>
  );
}
