import { ExternalLink } from "lucide-react";
import { GUIDE_INTRO, HOMEWORK_GUIDE } from "@/content/lessonDecks/hec-ielts/homeworkGuide";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { Audience } from "@/lib/lessonDecks/audience";

/**
 * Sun Class: how to do each homework task, step by step (hec-ielts/homeworkGuide.ts).
 * Folded on screen under the homework slide; printed open on paper.
 */
export function HomeworkGuide({ audience }: { audience?: Audience }) {
  const total = HOMEWORK_GUIDE.length;
  return (
    <details open={!!audience} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
      <summary className="cursor-pointer text-2xl font-semibold text-hec-ink">How to do your homework, step by step</summary>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-lg text-hec-ink">{GUIDE_INTRO.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <table className="mt-3 w-full border-collapse text-base text-hec-ink">
        <thead><tr><th className="border border-hec-line p-1 text-left">Task</th><th className="border border-hec-line p-1 text-left">Days</th><th className="border border-hec-line p-1 text-left">Points</th></tr></thead>
        <tbody>{HOMEWORK_GUIDE.map((g) => <tr key={g.task}><td className="border border-hec-line p-1 font-semibold">{g.task}</td><td className="border border-hec-line p-1">{g.days}</td><td className="border border-hec-line p-1">{g.points.split(":")[0]}</td></tr>)}</tbody>
      </table>
      <div className="mt-4 space-y-5">
        {HOMEWORK_GUIDE.map((g, n) => (
          <section key={g.task} className="rounded-xl bg-hec-surface p-4 break-inside-avoid">
            <p className="text-sm uppercase tracking-widest text-hec-ink-soft">Task {n + 1} of {total}</p>
            <h4 className="text-2xl font-semibold text-hec-ink">{g.task}</h4>
            <p className="text-lg text-hec-ink"><strong>When:</strong> {g.days}. <strong>How long:</strong> {g.time}.</p>
            <p className="text-lg text-hec-ink"><strong>Why:</strong> {g.why}</p>
            <p className="mt-2 text-lg font-semibold text-hec-ink">What to do</p>
            <ol className="list-decimal space-y-1 pl-7 text-lg text-hec-ink">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {g.links?.length ? (
              <>
                <p className="mt-2 text-lg font-semibold text-hec-ink">Where to listen</p>
                <ul className="space-y-1 text-base text-hec-ink">
                  {g.links.map((l) => {
                    const href = safeHttpUrl(l.url);
                    return (
                      <li key={l.url}>
                        <span className="mr-2 rounded-full border border-hec-line px-2 text-xs">{l.for}</span>
                        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">{l.label}<ExternalLink className="ml-1 inline h-3 w-3" /></a> : <span className="font-medium">{l.label}</span>}
                        <span className="ml-1 break-all text-hec-ink-soft">({l.url})</span> {l.note}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
            <p className="mt-2 text-lg text-hec-ink"><strong>How it is checked on Sunday:</strong> {g.checked}</p>
            <p className="text-lg text-hec-ink"><strong>Points:</strong> {g.points}</p>
            <p className="mt-1 text-base italic text-hec-ink-soft">{g.vi}</p>
          </section>
        ))}
      </div>
    </details>
  );
}
