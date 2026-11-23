/**
 * The homework page of the youngest band (docs/EXPERIENCE_DESIGN_BRIEF.md G2, Phase 7 round 1): a child who cannot
 * yet read English, often with a grown-up beside them. Pip greets, then ONE homework card, drawn large, with the
 * Vietnamese beneath and a Listen button. No stats, no counts, never the word "late", no clock, no danger tint.
 * Nothing open: the finish line. Under it a closed disclosure for grown-ups holds today's tabs, unchanged
 * (age decides form, never access).
 */
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Volume2 } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { FinishState } from "@/components/student/home/FinishState";
import { BUTTON, CARD, FOCUS } from "@/components/student/nova/ivory";
import { pressable } from "@/components/fx/PaperPress";
import { useSpeech } from "@/components/lessonDecks/speech";
import { useCopy } from "@/lib/copy/useCopy";
import { cn } from "@/lib/utils";
import type { HomeworkItem } from "@/lib/studentHomework";

function Listen({ text }: { text: string }) {
  const { speak, supported } = useSpeech();
  const { en } = useCopy();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={`${en("listen")}: ${text}`}
      className={cn("inline-flex min-h-hec-target w-full items-center justify-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-4 text-hec-body font-medium text-hec-ink hover:bg-hec-sunken", FOCUS)}
    >
      <Volume2 className="h-5 w-5" aria-hidden />
      <Bi k="listen" />
    </button>
  );
}

export function EarlyHomework({
  ready,
  todoCount,
  card,
  onOpen,
  dialogOpen,
  loading,
  errorBlock,
  grownUps,
}: {
  /** the list has loaded without an error */
  ready: boolean;
  todoCount: number;
  /** groups.late[0] ?? groups.next[0] */
  card: HomeworkItem | null;
  onOpen: (hw: HomeworkItem) => void;
  /** a homework is open in the dialog: Pip steps out (one Pip per screen) */
  dialogOpen: boolean;
  loading: ReactNode | null;
  errorBlock: ReactNode | null;
  /** today's tabs and the streak card, unchanged */
  grownUps: ReactNode;
}) {
  const finished = ready && !card;
  return (
    <div className="mx-auto max-w-xl min-w-0 space-y-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <div className={dialogOpen ? "invisible" : undefined} aria-hidden={dialogOpen || undefined}>
          <MascotCompanion pendingHomework={ready ? todoCount : null} wave={finished} />
        </div>
        <h1 className="font-display text-hec-display font-bold text-hec-ink">
          <Bi k="hw.title" />
        </h1>
      </section>

      {loading}
      {errorBlock}

      {card && (
        <section aria-labelledby="early-hw-title" className={cn(CARD, "space-y-4")}>
          <div className="min-w-0 space-y-1">
            <h2 id="early-hw-title" className="break-words font-display text-hec-h1 font-bold text-hec-ink">{card.title || "Homework"}</h2>
            <p className="whitespace-normal break-words text-hec-small text-hec-ink-soft">{card.classes?.name || "Class"}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onOpen(card)}
              className={cn(BUTTON, pressable, "min-h-[4.5rem] w-full bg-hec-action text-hec-h3 text-hec-on-action shadow-hec-1 hover:bg-hec-action/90")}
            >
              <Bi k="next.open" viClassName="text-hec-on-action/80" />
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <Listen text={card.title || "Homework"} />
          </div>
        </section>
      )}

      {finished && <FinishState band="early" />}

      <details className="group rounded-hec-md border border-hec-line bg-hec-paper">
        <summary className={cn("flex min-h-hec-target cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-hec-body font-medium text-hec-ink", FOCUS)}>
          <span className="min-w-0"><Bi k="hw.grownups" /></span>
          <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-5 border-t border-hec-line p-4">{grownUps}</div>
      </details>
    </div>
  );
}
