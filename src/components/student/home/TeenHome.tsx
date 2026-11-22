/**
 * The home from Grade 7 up (docs/EXPERIENCE_DESIGN_BRIEF.md G5): a briefing, the adult product with their data in
 * it. Next lesson and what is due; the recent lessons (published content only); then "My progress" by default, with
 * the class table one tap away. No mascot unless the child chose Pip in Look, no emoji, no confetti: the reward is
 * the Seal on the finish line and a line of text. Sun Class targets are targets: nothing here promises a band.
 *
 * Not built (the page has no data for them without a new query): the teacher's latest approved feedback in full,
 * the approved CEFR skills panel, the points-by-week trend. The wallet stays where it was, in the class section,
 * and Tuition stays in the menu.
 */
import { useState } from "react";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { LessonOverviewsCard } from "@/components/student/LessonOverviewsCard";
import { StudentWallet } from "@/components/student/StudentWallet";
import { NextThing } from "@/components/student/home/NextThing";
import { WeekStrip } from "@/components/student/home/WeekStrip";
import { StudentClassLeaderboard } from "@/components/student/StudentClassLeaderboard";
import { CARD, CARD_TITLE, FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { useCopy } from "@/lib/copy/useCopy";
import type { HomeData } from "./types";

function greetingKey(hour: number) {
  return hour < 12 ? "greet.morning" : hour < 17 ? "greet.afternoon" : "greet.evening";
}

export function TeenHome({ data }: { data: HomeData }) {
  const { en } = useCopy();
  const [view, setView] = useState<"mine" | "class">("mine");
  const upcoming = data.sessions.slice(0, 3);
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <MascotCompanion pendingHomework={data.homework.ready ? data.homework.todo : null} silent />
        <div className="min-w-0 space-y-1">
          <p className="text-hec-small text-hec-ink-soft">
            <Bi k={greetingKey(dayjs().tz().hour())} />
          </p>
          <h1 className="whitespace-normal break-words text-balance font-display text-hec-display font-medium text-hec-ink [hyphens:none]">{data.fullName}</h1>
          <p className="text-hec-small tabular-nums text-hec-ink-soft">
            {data.levelTitle} · <Bi k="level.label" vars={{ n: data.level }} viClassName="hidden" />
          </p>
        </div>
      </header>

      <NextThing data={data} band="teen" />

      {upcoming.length > 0 && (
        <section aria-labelledby="up-next" className={cn(CARD, "space-y-2")}>
          <h2 id="up-next" className={CARD_TITLE}>
            <Bi k="teen.upNext" />
          </h2>
          <ul className="divide-y divide-hec-line">
            {upcoming.map((s: any) => (
              <li key={s.id} className="flex min-h-hec-target items-center justify-between gap-3 py-2">
                <span className="min-w-0 whitespace-normal break-words font-medium text-hec-ink">{s.classes?.name || "Class"}</span>
                <span className="shrink-0 text-hec-small tabular-nums text-hec-ink-soft">
                  {dayjs(s.date).format("ddd D MMM")} · {String(s.start_time).slice(0, 5)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LessonOverviewsCard studentId={data.studentId} />

      <div role="tablist" aria-label={en("class.mine")} className="inline-flex rounded-hec-md bg-hec-sunken p-1">
        {(["mine", "class"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "inline-flex min-h-hec-target items-center rounded-hec-sm px-4 text-hec-small font-medium transition-colors duration-hec-1 ease-hec",
              view === v ? "bg-hec-raised text-hec-ink shadow-hec-1" : "text-hec-ink-soft hover:text-hec-ink",
              FOCUS,
            )}
          >
            <Bi k={v === "mine" ? "class.mine" : "class.table"} viClassName="hidden" />
          </button>
        ))}
      </div>

      {view === "mine" ? (
        <div className="space-y-6">
          <section className={cn(CARD, "space-y-3")}>
            <p className="font-sans text-hec-h3 font-semibold tabular-nums text-hec-ink">
              {Math.max(0, Math.round(data.currentXp))}
              <span className="font-normal text-hec-ink-soft"> / {Math.round(data.nextLevelXp)} XP</span>
            </p>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.progress)} aria-label={en("level.label", { n: data.level + 1 })} className="h-2 overflow-hidden rounded-full bg-hec-sunken">
              <div className="h-2 rounded-full bg-hec-brass" style={{ width: `${Math.max(data.progress, 2)}%` }} />
            </div>
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              <Bi k="streak.days" vars={{ n: data.streak }} />
              {data.longestStreak > 0 && (
                <>
                  {" · "}
                  <Bi k="streak.best" vars={{ n: data.longestStreak }} viClassName="hidden" />
                </>
              )}
            </p>
          </section>
          <WeekStrip week={data.weekActivity} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* The class boards exactly as before: one per enrolled class, this month by default, with their own
              period picker and category tabs; the wallet of an economy class stays above its board. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.enrolledClasses
              .filter((e: any) => e.classes?.id)
              .map((e: any) => (
                <div key={e.id} className="space-y-4">
                  {e.classes.economy_mode && (
                    <StudentWallet
                      studentId={data.studentId}
                      classId={e.classes.id}
                      className={e.classes.name}
                      totalPoints={data.classPoints(e.classes.id)}
                      economyMode={e.classes.economy_mode}
                      pointsToCashRate={e.classes.points_to_cash_rate || 50}
                    />
                  )}
                  <StudentClassLeaderboard classId={e.classes.id} className={e.classes.name} currentStudentId={data.studentId} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
