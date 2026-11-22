/**
 * This week as seven circles, Monday to Sunday (docs/EXPERIENCE_DESIGN_BRIEF.md G2, G3). A day the child opened
 * their homework (the week's rewarded check-ins the home already reads) gets a sticker. A day without one stays an
 * empty circle: no mark, no colour, no words. Monday starts a new strip. Read aloud as a list of the days that have
 * a sticker, so the strip is never only a picture.
 */
import { Star } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { CARD, CARD_TITLE } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/copy/useCopy";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function WeekStrip({ week, best, big = false }: { week: boolean[]; best?: number; big?: boolean }) {
  const { en } = useCopy();
  const withSticker = DAYS.filter((_, i) => week[i]);
  return (
    <section aria-labelledby="week-strip" className={cn(CARD, "space-y-4")}>
      <h2 id="week-strip" className={CARD_TITLE}>
        <Bi k="week.title" />
      </h2>
      <ol className="flex justify-between gap-1.5" aria-label={`${en("week.title")}: ${withSticker.join(", ") || "-"}`}>
        {DAYS.map((day, i) => (
          <li key={day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span
              aria-hidden
              className={cn("flex aspect-square w-full items-center justify-center rounded-full border border-hec-line bg-hec-surface", big ? "max-w-[2.75rem]" : "max-w-[2.25rem]")}
            >
              {week[i] && <Star className={cn("fill-hec-leaf text-hec-leaf", big ? "h-6 w-6" : "h-5 w-5")} />}
            </span>
            <span aria-hidden className="text-hec-caption text-hec-ink-soft">
              {LETTERS[i]}
            </span>
            <span className="sr-only">
              {day}
              {week[i] ? ": sticker" : ""}
            </span>
          </li>
        ))}
      </ol>
      {best !== undefined && best > 0 && (
        <p className="text-hec-small tabular-nums text-hec-ink-soft">
          <Bi k="week.best" vars={{ n: best }} />
        </p>
      )}
    </section>
  );
}
