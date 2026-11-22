/**
 * The finish line (docs/EXPERIENCE_DESIGN_BRIEF.md I7): what a visit ends on when there is nothing left to do today.
 *   early   Pip waves. "All done! See you in class." with the Vietnamese beneath. No buttons.
 *   young   "You finished everything for today." (the weekly path under it carries today's stamp)
 *   junior  "Nothing left today."
 *   teen    "You're up to date." and the Seal, no mascot.
 * It is the last frame most visits end on, so it is designed, not an empty state. Only shown when it is true:
 * the homework has loaded and nothing is open (the caller decides).
 */
import { Seal } from "@/components/fx/Seal";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { CARD } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { fill, studentCopy } from "@/lib/copy/student";
import { useAgeBand } from "@/hooks/useAgeBand";
import type { AgeBand } from "@/lib/ageBand";

const LINE = { early: "finish.early", young: "finish.young", junior: "finish.junior", teen: "finish.teen" } as const;

export function FinishState({ band, nextSession }: { band: AgeBand; nextSession?: any | null }) {
  const { viBeneath } = useAgeBand();
  const when = nextSession ? `${dayjs(nextSession.date).format("ddd D MMM")} ${String(nextSession.start_time).slice(0, 5)}` : null;
  return (
    <section aria-labelledby="finish-line" className={cn(CARD, "flex flex-col items-center gap-4 text-center", band === "early" && "py-8")}>
      {band === "early" && <MascotCompanion pendingHomework={null} silent />}
      {band === "teen" && <Seal show label={studentCopy[LINE[band]].en} />}
      <h2 id="finish-line" className={cn("font-display font-medium text-hec-ink", band === "early" ? "text-hec-h1 font-bold" : "text-hec-h2")}>
        <Bi k={LINE[band]} />
      </h2>
      {when && band !== "early" && (
        <p className="text-hec-small tabular-nums text-hec-ink-soft">
          {fill(studentCopy["finish.nextClass"].en, { when })}
          {viBeneath && (
            <span lang="vi" className="block">{fill(studentCopy["finish.nextClass"].vi, { when })}</span>
          )}
        </p>
      )}
    </section>
  );
}
