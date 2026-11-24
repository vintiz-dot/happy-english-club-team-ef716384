// Pieces of the Speaking & Writing Lab slides (SlideView renders the rest):
// the round-by-round timer of a fluency routine, and a writing routine's text,
// read aloud by the browser and, for a dictogloss, kept folded until the teacher
// shows it. On paper (audience set) both print as plain text.
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Turtle, Volume2, Timer } from "lucide-react";
import type { ScriptLine } from "@/lib/lessonDecks/types";
import type { Audience } from "@/lib/lessonDecks/audience";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const said = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}` : `${s} s`);

/** A short bell at the end of a round; silent where audio is not allowed. */
function bell() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.9);
    setTimeout(() => void ctx.close(), 1200);
  } catch { /* no sound: the screen still shows Time! */ }
}

/** The rounds of a fluency routine, each with its own countdown (on screen) or as a list (on paper). */
export function FluencyRounds({ rounds, audience }: { rounds: { seconds: number; say: string }[]; audience?: Audience }) {
  const [cur, setCur] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const rang = useRef(false);

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);
  useEffect(() => {
    if (running && left === 0 && !rang.current) { rang.current = true; setRunning(false); bell(); }
  }, [running, left]);

  const start = (n: number) => { setCur(n); setLeft(rounds[n].seconds); setRunning(true); rang.current = false; };

  if (audience) {
    return (
      <ol className="list-decimal space-y-1 pl-8 text-xl text-hec-ink">
        {rounds.map((r, n) => <li key={n}><strong>Round {n + 1}, {said(r.seconds)}:</strong> {r.say}</li>)}
      </ol>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex flex-wrap gap-2">
        {rounds.map((r, n) => (
          <button key={n} type="button" onClick={() => start(n)} title={r.say}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold ${cur === n ? "bg-amber-500 text-white" : "bg-white text-amber-900 hover:bg-amber-100 dark:bg-amber-900/60 dark:text-amber-50"}`}>
            <Timer className="h-5 w-5" />Round {n + 1} · {said(r.seconds)}
          </button>
        ))}
      </div>
      {cur !== null ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className={`font-mono text-6xl font-bold tabular-nums ${left === 0 ? "text-rose-600" : "text-hec-ink"}`} aria-live="polite">{left === 0 ? "Time!" : mmss(left)}</span>
          <div className="flex gap-2">
            {left > 0 && (
              <button type="button" onClick={() => setRunning((x) => !x)} aria-label={running ? "Pause" : "Go on"}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white hover:bg-amber-600">
                {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
            )}
            <button type="button" onClick={() => start(cur)} aria-label="Start this round again"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-900 hover:bg-amber-100 dark:bg-amber-900/60 dark:text-amber-50">
              <RotateCcw className="h-6 w-6" />
            </button>
          </div>
          <p className="min-w-[14rem] flex-1 text-xl text-hec-ink">{rounds[cur].say}</p>
        </div>
      ) : (
        <p className="mt-3 text-lg text-hec-ink-soft">Tap a round to start its timer. A bell rings when time is up.</p>
      )}
    </div>
  );
}

/** A writing routine's text: a model (shown) or a dictogloss text (heard first, shown only when the teacher opens it). */
export function WritingText({ text, hidden, audience, speakScript }: {
  text: { title: string; text: string }; hidden: boolean; audience?: Audience;
  speakScript?: (lines: ScriptLine[], opts?: { slow?: boolean }) => void;
}) {
  if (audience === "student" && hidden) return null;
  const lines: ScriptLine[] = [{ speaker: "Teacher", text: text.text }];
  const buttons = speakScript ? (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => speakScript(lines, { slow: false })} className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-lg font-semibold text-white hover:bg-sky-700">
        {hidden ? <Play className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}{hidden ? "Read it aloud" : "Listen"}
      </button>
      <button type="button" onClick={() => speakScript(lines, { slow: true })} className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-lg font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-100">
        <Turtle className="h-5 w-5" />Slower
      </button>
    </div>
  ) : null;
  const body = <p className="text-xl leading-relaxed text-hec-ink">{text.text}</p>;
  if (!hidden || audience === "teacher") {
    return (
      <div className="space-y-3 rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/40">
        <p className="text-sm uppercase tracking-widest text-sky-800 dark:text-sky-200">{text.title}{hidden ? " (teacher: read it twice)" : ""}</p>
        {buttons}
        {body}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/40">
      <p className="text-sm uppercase tracking-widest text-sky-800 dark:text-sky-200">{text.title}</p>
      {buttons}
      <details className="text-hec-ink-soft print:hidden">
        <summary className="cursor-pointer">Show the text (teacher, after the children have rebuilt it)</summary>
        <div className="mt-2">{body}</div>
      </details>
    </div>
  );
}
