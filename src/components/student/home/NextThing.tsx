/**
 * "The next thing": the first card of every band's home (docs/EXPERIENCE_DESIGN_BRIEF.md G, shared rules).
 * The most urgent open homework; else today's next class; else the finish line. Overdue work is simply the next
 * thing: it never says "late" and is never red (brief G2). The same figures the home used before: the homework
 * list's own order (late first, then soonest), nothing recomputed here.
 */
import { ChevronRight, Volume2 } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { FinishState } from "@/components/student/home/FinishState";
import { BUTTON, CARD, CARD_TITLE, FOCUS, LABEL } from "@/components/student/nova/ivory";
import { useSpeech } from "@/components/lessonDecks/speech";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { useCopy } from "@/lib/copy/useCopy";
import type { AgeBand } from "@/lib/ageBand";
import type { HomeData } from "./types";

function ListenButton({ text }: { text: string }) {
  const { speak, supported } = useSpeech();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className={cn("inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-4 text-hec-body font-medium text-hec-ink hover:bg-hec-sunken", FOCUS)}
    >
      <Volume2 className="h-5 w-5" aria-hidden />
      <Bi k="listen" />
    </button>
  );
}

export function NextThing({ data, band }: { data: HomeData; band: AgeBand }) {
  const { en } = useCopy();
  const hw = data.homework;
  const big = band === "early";

  if (hw.loading) {
    return (
      <section aria-busy className={cn(CARD, "min-h-[10rem]")}>
        <p className={LABEL}><Bi k="next.label" /></p>
        <p className="mt-3 text-hec-body text-hec-ink-soft"><Bi k="next.loading" /></p>
      </section>
    );
  }
  if (hw.error) {
    return (
      <section role="alert" className={cn(CARD, "min-h-[10rem] space-y-3")}>
        <p className="text-hec-body text-hec-ink"><Bi k="next.error" /></p>
        <button type="button" onClick={data.onRetryHomework} disabled={hw.fetching} className={cn(BUTTON, "bg-hec-action text-hec-on-action hover:bg-hec-action/90")}>
          <Bi k={hw.fetching ? "next.retrying" : "next.retry"} />
        </button>
      </section>
    );
  }

  const next = hw.next;
  if (next) {
    const due = next.due_date ? en("next.due", { date: dayjs(next.due_date).format("ddd D MMM") }) : en("next.noDue");
    const title = next.title || "Homework";
    return (
      <section aria-labelledby="next-thing-title" className={cn(CARD, "space-y-4")}>
        <p className={LABEL}><Bi k="next.label" /></p>
        <div className="min-w-0 space-y-1">
          <h2 id="next-thing-title" className={cn(CARD_TITLE, big && "text-hec-h1")}>{title}</h2>
          <p className="whitespace-normal break-words text-hec-small text-hec-ink-soft">{next.classes?.name || "Class"}</p>
          {!big && <p className="text-hec-small font-medium tabular-nums text-hec-ink">{due}</p>}
          {!big && hw.todo > 1 && (
            <p className="text-hec-small tabular-nums text-hec-ink-soft"><Bi k="next.todoMany" vars={{ n: hw.todo }} /></p>
          )}
        </div>
        <div className={cn("flex flex-wrap gap-3", big && "flex-col")}>
          <button
            type="button"
            onClick={() => data.onOpenHomework(next)}
            className={cn(BUTTON, "bg-hec-action text-hec-on-action hover:bg-hec-action/90", big && "min-h-[4.5rem] w-full text-hec-h3")}
          >
            <Bi k="next.open" />
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          {(band === "early" || band === "young") && <ListenButton text={title} />}
        </div>
      </section>
    );
  }

  const today = data.sessions.find((s) => dayjs(s.date).isSame(dayjs(), "day") && s.status === "Scheduled");
  if (today) {
    return (
      <section aria-labelledby="next-thing-title" className={cn(CARD, "space-y-1")}>
        <p className={LABEL}><Bi k="next.class" /></p>
        <h2 id="next-thing-title" className={cn(CARD_TITLE, big && "text-hec-h1")}>{today.classes?.name || "Class"}</h2>
        <p className="text-hec-body tabular-nums text-hec-ink-soft">{String(today.start_time).slice(0, 5)}</p>
      </section>
    );
  }
  return <FinishState band={band} nextSession={data.sessions[0]} />;
}
