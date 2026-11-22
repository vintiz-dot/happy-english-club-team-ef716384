import { useEffect, useState } from "react";
import type { Audience } from "@/lib/lessonDecks/audience";
import type { ExamFormat, Slide } from "@/lib/lessonDecks/types";
import { Clock, Eye, EyeOff, GraduationCap } from "lucide-react";

type ExamSlideT = Extract<Slide, { kind: "exam" }>;

const FORMAT: Record<ExamFormat, string> = {
  "multiple choice": "Choose A, B, C or D",
  rewrite: "Rewrite the sentence",
  error: "Find the mistake",
  cloze: "Fill the gaps",
  "word form": "Word formation",
  dialogue: "Reply to the speaker",
  sounds: "Sounds and stress",
  cues: "Build the sentence",
  question: "Ask about the underlined part",
  reading: "Reading",
  paragraph: "Write a paragraph",
};

/**
 * An entrance-exam practice set. Answers stay hidden until the teacher shows
 * them, so the children answer first and give their reason aloud. On paper the
 * teacher's copy prints them and the student's copy has none (audience.ts).
 */
export function ExamSlide({ slide, audience }: { slide: ExamSlideT; audience?: Audience }) {
  const [toggled, setShown] = useState(false);
  const shown = audience === "teacher" || (audience !== "student" && toggled);
  // A new slide (or new names) starts hidden again.
  useEffect(() => setShown(false), [slide]);
  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl md:text-5xl font-semibold text-hec-ink leading-tight flex items-start gap-3">
        <GraduationCap className="h-9 w-9 md:h-12 md:w-12 shrink-0 text-amber-600 mt-1" />
        <span>{slide.title}</span>
      </h2>
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-full border border-hec-line bg-hec-paper px-3 py-1 text-hec-ink">{FORMAT[slide.format]}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hec-line bg-hec-paper px-3 py-1 text-hec-ink"><Clock className="h-4 w-4" />{slide.minutes} min</span>
        {slide.school && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">{slide.school} format</span>}
        {!audience && <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-hec-line px-3 py-1 text-hec-ink hover:bg-hec-paper focus-visible:outline focus-visible:outline-2"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {shown ? "Hide answers" : "Show answers"}
        </button>}
      </div>
      <p className="text-xl md:text-2xl text-hec-ink">{slide.instructions}</p>
      <ol className="space-y-4 list-decimal pl-8 text-xl md:text-2xl text-hec-ink">
        {slide.items.map((it, i) => (
          <li key={i} className="leading-snug">
            <p>{it.q}</p>
            {it.options?.length ? (
              <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-lg md:text-xl text-hec-ink-soft">
                {it.options.map((o, j) => <span key={j}><strong>{String.fromCharCode(65 + j)}.</strong> {o}</span>)}
              </p>
            ) : null}
            {shown && it.answer && (
              <p className="mt-1 text-lg md:text-xl text-emerald-700 dark:text-emerald-300">
                → {it.answer}{it.why ? <span className="text-hec-ink-soft"> ({it.why})</span> : null}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
