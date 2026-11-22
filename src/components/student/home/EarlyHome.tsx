/**
 * The home of the youngest band: pre-school and Grade 1 (docs/EXPERIENCE_DESIGN_BRIEF.md G2). A child who cannot yet
 * read English, on a parent's phone, often with the parent beside them. Pip greets by first name; at most three
 * doors, each big, with two or three English words, the Vietnamese beneath and a Listen button:
 *   the next homework ("My homework": one piece, never a list), "Make my video" and "My stars".
 * A door with nothing behind it today is not drawn. Below them: this week's stickers and one line about the class.
 * Not here: countdowns, streak numbers, ranks, percentages, red, the word "late". Money is behind Grown-ups.
 */
import { Link } from "react-router-dom";
import { Video, Volume2 } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { NextThing } from "@/components/student/home/NextThing";
import { StarJar } from "@/components/student/home/StarJar";
import { WeekStrip } from "@/components/student/home/WeekStrip";
import { ClassBlocks } from "@/components/student/home/ClassBlocks";
import { ClassWallets } from "@/components/student/home/ClassWallets";
import { CARD, FOCUS } from "@/components/student/nova/ivory";
import { useSpeech } from "@/components/lessonDecks/speech";
import { useCopy } from "@/lib/copy/useCopy";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import type { HomeData } from "./types";

function VideoDoor() {
  const { speak, supported } = useSpeech();
  const { en } = useCopy();
  return (
    <div className={cn(CARD, "flex items-center gap-3")}>
      <Link to="/student/record" className={cn("flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-4 text-hec-h3 font-bold text-hec-ink", FOCUS)}>
        <Video className="h-10 w-10 shrink-0 text-hec-ink" aria-hidden />
        <Bi k="door.video" />
      </Link>
      {supported && (
        <button
          type="button"
          onClick={() => speak(en("door.video"))}
          aria-label={`${en("listen")}: ${en("door.video")}`}
          className={cn("inline-flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center rounded-hec-md border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken", FOCUS)}
        >
          <Volume2 className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function EarlyHome({ data }: { data: HomeData }) {
  // Nothing left to do today: Pip waves goodbye instead of cheering on the next thing.
  const finished = data.homework.ready && !data.homework.next && !data.sessions.some((x) => x.status === "Scheduled" && dayjs(x.date).isSame(dayjs(), "day"));
  const hasVideoHomework = data.homework.all.some((h) => h.submission_type === "video");
  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <MascotCompanion pendingHomework={data.homework.ready ? data.homework.todo : null} wave={finished} />
        <h1 className="font-display text-hec-display font-bold text-hec-ink">
          <Bi k="hello.name" vars={{ name: data.firstName }} />
        </h1>
      </section>

      <NextThing data={data} band="early" />

      {hasVideoHomework && <VideoDoor />}

      <StarJar progress={data.progress} totalXp={data.totalXp} level={data.level} />
      <WeekStrip week={data.weekActivity} big />
      <ClassBlocks band="early" enrolledClasses={data.enrolledClasses} studentId={data.studentId} />
      <ClassWallets studentId={data.studentId} enrolledClasses={data.enrolledClasses} classPoints={data.classPoints} />
    </div>
  );
}
