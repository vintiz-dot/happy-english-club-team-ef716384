import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Assessment, BookRef, Deck, Slide, Unit, Worksheet } from "@/lib/lessonDecks/types";
import { castSlide } from "@/lib/lessonDecks/names";
import { flipTarget, flipbookUrl, type FlipbookLite } from "@/lib/lessonDecks/bookPages";
import { homeworkFor } from "@/lib/lessonDecks/views";
import { studentAssessment, studentDeck, studentUnit, studentWorksheet, type Audience } from "@/lib/lessonDecks/audience";
import { assessmentMaterial, deckMaterial, homeworkMaterial, worksheetMaterial, type LessonMaterial } from "@/lib/lessonDecks/docBlocks";
import { unitLabel } from "@/lib/lessonDecks/curricula";
import { downloadBlob, tryMakeDocument } from "@/lib/hecDocs";
import { LISTENING_BANDS, RUBRIC } from "@/lib/lessonDecks/ieltsRubric";
import { SlideView, SlideContext, WorksheetView, AssessmentView, type SlideCtx } from "./SlideView";
import { useSpeech } from "./speech";
import { FlipbookFrame, useFullscreen } from "./FlipbookFrame";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Shuffle, X, Timer, Pause, Play, Printer, Volume2, Turtle, ExternalLink, BookOpen, Drama, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

/** What a slide is called in the pager tooltip: its title, else its kind. */
const slideLabel = (s: Slide) => ("title" in s && s.title ? s.title : s.kind);
const isLab = (d: Deck, k: number) => !!d.lab?.slides.includes(k);

/** A button with a tooltip (the app's own, not the slow native title). */
function Tip({ tip, children, side = "bottom" }: { tip: ReactNode; children: ReactElement; side?: "top" | "bottom" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

/** The first Student Book reference anywhere in a slide (its "Show p. X" button), or null. */
function firstBookRef(x: unknown, depth = 0): BookRef | null {
  if (!x || typeof x !== "object" || depth > 6) return null;
  const o = x as Record<string, unknown>;
  if (o.book === "SB" && typeof o.pages === "string") return o as unknown as BookRef;
  for (const v of Object.values(o)) {
    const hit = firstBookRef(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

export type ClassFlipbook = FlipbookLite & { id: string; title: string };

/** The deck's slides with this class's names in them. */
export function useCastDeck(deck: Deck, roster: string[], shuffle: number[]) {
  return useMemo(
    () => deck.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`, shuffle[i] ?? 0).slide),
    [deck, roster, shuffle],
  );
}

/**
 * Open a print window carrying the app's own stylesheets, so pages look the same
 * as on screen, and print it (or save as PDF).
 */
function printPages(title: string, markup: string, landscape: boolean) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("\n");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "")}</title>${styles}
    <style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:10mm}.deck-page{break-after:page;${landscape ? "min-height:180mm" : ""}}body{background:#fff}</style>
    </head><body>${markup}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
  return true;
}

// Every export comes as a teacher copy and a student copy (audience.ts). The
// *Markup functions build the pages (the suite renders them to check that a
// student copy holds no answer); the print* functions open them for printing.
export const COPY: Record<Audience, string> = { teacher: "Teacher copy", student: "Student copy" };

/**
 * Every slide on its own landscape page, names filled in as shown. The teacher's
 * copy prints answers, scripts and teacher notes open; the student's copy is made
 * from a deck and unit with all of them taken out.
 */
export function deckMarkup(deck: Deck, roster: string[], unit: Unit | undefined, audience: Audience) {
  const d = audience === "student" ? studentDeck(deck) : deck;
  const u = unit && audience === "student" ? studentUnit(unit) : unit;
  const slides = d.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`).slide);
  return renderToStaticMarkup(
    <SlideContext.Provider value={{ unit: u, deck: d, audience }}>
      {slides.map((s, i) => (
        <section key={i} className="deck-page bg-white p-10">
          <SlideView slide={s} lab={isLab(deck, i)} />
          <p className="mt-6 text-right text-sm text-gray-500">{deck.title} · {COPY[audience]} · {i + 1}/{slides.length}</p>
        </section>
      ))}
    </SlideContext.Provider>,
  );
}
// ------------------------------------------------------------ premium PDFs
// Every export first goes through HEC Docs (the `lesson-material` document, as the
// tuition reports and invoices do): a downloaded, typeset PDF. If that path is
// unavailable (offline, the printer's free allowance used up, unexpected data),
// the old print view below opens instead, so no button ever stops working.

/** "HEC IELTS Speaking & Listening Year 1 · Term 1" (the unit label without its title). */
const courseOf = (unit?: Unit) => (unit ? unitLabel(unit).replace(/:\s[\s\S]*$/, "") : undefined);

async function premium(material: LessonMaterial, audience: Audience, fallback: () => unknown, bulk = false): Promise<boolean> {
  const doc = await tryMakeDocument("lesson-material", material as unknown as Record<string, unknown>, { variant: audience, bulk });
  if (doc) { downloadBlob(doc.blob, doc.filename); return true; }
  fallback();
  return false;
}

export function printDeck(deck: Deck, roster: string[], unit: Unit | undefined, audience: Audience) {
  const d = audience === "student" ? studentDeck(deck) : deck;
  const cast = { ...d, slides: d.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`).slide) };
  return premium(deckMaterial(cast, audience, courseOf(unit), unit), audience,
    () => printPages(`${deck.title} · ${COPY[audience]}`, deckMarkup(deck, roster, unit, audience), true));
}

/** A worksheet. Teacher: the pupil pages, then the answer key. Student: the pupil pages only. */
export function worksheetMarkup(ws: Worksheet, audience: Audience) {
  return renderToStaticMarkup(
    <div>
      <section className="deck-page bg-white p-8"><WorksheetView ws={audience === "student" ? studentWorksheet(ws) : ws} answers={false} /></section>
      {audience === "teacher" && <section className="deck-page bg-white p-8"><WorksheetView ws={ws} answers /></section>}
    </div>,
  );
}
export const printWorksheet = (ws: Worksheet, audience: Audience, unit?: Unit) =>
  premium(worksheetMaterial(audience === "student" ? studentWorksheet(ws) : ws, audience, courseOf(unit)), audience,
    () => printPages(`${ws.title} · ${COPY[audience]}`, worksheetMarkup(ws, audience), false));

/** A check or test. Teacher: the paper, then the key, recording scripts and marking rubric. Student: the paper only. */
export function assessmentMarkup(a: Assessment, audience: Audience) {
  return renderToStaticMarkup(
    <div>
      <section className="deck-page bg-white p-8"><AssessmentView a={audience === "student" ? studentAssessment(a) : a} answers={false} /></section>
      {audience === "teacher" && <section className="deck-page bg-white p-8"><AssessmentView a={a} answers /></section>}
    </div>,
  );
}
export const printAssessment = (a: Assessment, audience: Audience, unit?: Unit) =>
  premium(assessmentMaterial(audience === "student" ? studentAssessment(a) : a, audience, courseOf(unit)), audience,
    () => printPages(`${a.title} · ${COPY[audience]}`, assessmentMarkup(a, audience), false));

/**
 * Sun Class progress tracker for one term: a row per child (names from the live
 * roster, only on paper; nothing is saved) and, for each of the term's mocks, the
 * four criterion bands, the Speaking band, the Listening raw score and band; then
 * the term's honest targets, and the HEC rubric and conversion table to score with.
 */
export function printIeltsTracker(unit: Unit, names: string[], term: { expected: string; stretch: string } | undefined) {
  const mocks = unit.assessments ?? [];
  const rows = names.length ? names : Array.from({ length: 8 }, () => "");
  const cell = "border border-gray-400 p-1 h-9";
  const body = renderToStaticMarkup(
    <div>
      <section className="deck-page bg-white p-6 text-gray-900">
        <h2 className="text-2xl font-semibold">Progress tracker · {unit.title}</h2>
        <p className="text-sm">
          Write each mock's criterion bands (FC, LR, GRA, P, whole numbers), the Speaking band (their mean: .25 and .75 round up) and the Listening score.
          Term target: most students {term?.expected ?? "-"}, stretch {term?.stretch ?? "-"}. Targets, not promises: these are class estimates, not official IELTS bands.
        </p>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={cell} rowSpan={2}>Student</th>
              {mocks.map((a) => <th key={a.id} className={cell} colSpan={7}>{a.title}</th>)}
              <th className={cell} rowSpan={2}>Next target (one criterion, one habit)</th>
            </tr>
            <tr>{mocks.flatMap((a) => ["FC", "LR", "GRA", "P", "Spk", "L raw", "L band"].map((h) => <th key={a.id + h} className={cell}>{h}</th>))}</tr>
          </thead>
          <tbody>
            {rows.map((n, i) => <tr key={i}><td className={`${cell} whitespace-nowrap font-medium`}>{n}</td>{mocks.flatMap((a) => Array.from({ length: 7 }, (_, j) => <td key={a.id + j} className={cell} />))}<td className={cell} /></tr>)}
          </tbody>
        </table>
      </section>
      <section className="deck-page bg-white p-6 text-gray-900">
        <h2 className="text-xl font-semibold">Scoring guide (HEC wording, based on the public IELTS band descriptors)</h2>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead><tr><th className={cell}>Criterion</th>{RUBRIC[0].bands.map((b) => <th key={b.band} className={cell}>Band {b.band}</th>)}</tr></thead>
          <tbody>{RUBRIC.map((r) => <tr key={r.criterion}><td className={`${cell} font-semibold`}>{r.criterion}</td>{r.bands.map((b) => <td key={b.band} className={`${cell} align-top`}>{b.sounds}</td>)}</tr>)}</tbody>
        </table>
        <h3 className="mt-4 text-lg font-semibold">Listening: raw score out of 40 → approximate band</h3>
        <p className="text-sm">{LISTENING_BANDS.filter((b) => b.band >= 4).map((b) => `${b.min}+ → ${b.band}`).join(" · ")}. A 20-question mock: double the score first.</p>
      </section>
    </div>,
  );
  return printPages(`Tracker · ${unit.title}`, body, true);
}

/**
 * Creative homework. Student copy: one sheet per child, each with their own
 * version (the football edition for the children chosen for it). Teacher copy: who
 * gets which version, then one copy of every version. Names come from the live
 * roster and go only onto the paper; nothing is saved.
 */
export function homeworkMarkup(deck: Deck, students: { id: string; name: string }[], interests: Record<string, string[]>, audience: Audience) {
  const slide = deck.slides.find((s): s is Extract<Slide, { kind: "creative" }> => s.kind === "creative");
  if (!slide) return null;
  if (audience === "teacher") {
    const versions = [{ label: "Class version", task: slide.base }, ...(slide.variants ?? []).map((v) => ({ label: v.label, task: v.task }))];
    return renderToStaticMarkup(
      <div>
        <section className="deck-page bg-white p-8 text-gray-900 space-y-3">
          <h2 className="text-2xl font-semibold">{deck.title} · Creative homework · {COPY.teacher}</h2>
          <p className="text-base">Thinking: {slide.thinking} · Words: {slide.uses.words.join(", ")} · Grammar: {slide.uses.grammar.join(", ")}</p>
          <table className="w-full border-collapse text-base">
            <thead><tr><th className="border p-1 text-left">Student</th><th className="border p-1 text-left">Version</th></tr></thead>
            <tbody>{students.map((st) => <tr key={st.id}><td className="border p-1">{st.name}</td><td className="border p-1">{homeworkFor(slide, st.id, interests).label ?? "Class version"}</td></tr>)}</tbody>
          </table>
        </section>
        {versions.map((v) => (
          <section key={v.label} className="deck-page bg-white p-8 text-gray-900 space-y-2">
            <p className="text-sm uppercase tracking-widest text-gray-500">{v.label}</p>
            <h3 className="text-2xl font-semibold">{v.task.title}</h3>
            <p className="text-lg">{v.task.task}</p>
            <ol className="list-decimal pl-6 text-lg">{v.task.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <ul className="list-disc pl-6 text-lg">{v.task.frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <p className="font-semibold">A good piece has</p>
            <ul className="text-base">{v.task.success.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
            <p className="rounded border p-2 text-base"><strong>Challenge:</strong> {v.task.challenge}</p>
          </section>
        ))}
      </div>,
    );
  }
  const rows = students.length ? students : [{ id: "", name: "" }];
  return renderToStaticMarkup(
    <div>
      {rows.map((st) => {
        const { task, label } = homeworkFor(slide, st.id, interests);
        return (
          <section key={st.id || "blank"} className="deck-page bg-white p-8 text-gray-900 space-y-3">
            <div className="flex justify-between border-b pb-2">
              <p className="text-lg font-semibold">{deck.title} · Creative writing</p>
              <p className="text-lg">Name: {st.name || "______________________"}</p>
            </div>
            <p className="text-sm uppercase tracking-widest text-gray-500">{label ?? "Class version"} · Thinking: {slide.thinking}</p>
            <h2 className="text-3xl font-semibold">{task.title}</h2>
            <p className="text-lg">{task.task}</p>
            <ol className="list-decimal pl-6 text-lg">{task.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p className="font-semibold">Use these words: <span className="font-normal">{slide.uses.words.join(", ")}</span></p>
            <p className="font-semibold">Sentence starters</p>
            <ul className="list-disc pl-6 text-lg">{task.frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <p className="font-semibold">Check your writing</p>
            <ul className="text-base">{task.success.map((f, i) => <li key={i}>☐ {f}</li>)}</ul>
            <p className="rounded border p-2 text-base"><strong>Challenge:</strong> {task.challenge}</p>
            {Array.from({ length: 10 }, (_, i) => <div key={i} className="h-8 border-b border-dotted border-gray-400" />)}
          </section>
        );
      })}
    </div>,
  );
}
export async function printHomeworkSheets(deck: Deck, students: { id: string; name: string }[], interests: Record<string, string[]>, audience: Audience, unit?: Unit) {
  const body = homeworkMarkup(deck, students, interests, audience);
  if (!body) return false;
  const fallback = () => printPages(`${deck.title} homework · ${COPY[audience]}`, body, false);
  const slide = deck.slides.find((s): s is Extract<Slide, { kind: "creative" }> => s.kind === "creative")!;
  if (audience === "teacher") {
    // Who gets which version, then every version once.
    const m = homeworkMaterial(deck, slide.base, "Teacher overview", undefined, courseOf(unit));
    const versions = [{ label: "Class version", task: slide.base }, ...(slide.variants ?? []).map((v) => ({ label: v.label, task: v.task }))];
    m.nameLine = false;
    m.blocks = [
      { heading: "Who gets which version", eyebrow: "Creative homework", table: { head: ["Student", "Version"], rows: students.map((st) => [st.name, homeworkFor(slide, st.id, interests).label ?? "Class version"]) } },
      ...versions.map((v) => ({ ...homeworkMaterial(deck, v.task, v.label, undefined).blocks[0], eyebrow: v.label, writingLines: undefined })),
    ];
    return premium(m, "teacher", fallback);
  }
  // One sheet per child: a run of documents, one after another (the printer keeps its browser open).
  const rows = students.length ? students : [{ id: "", name: "" }];
  for (const st of rows) {
    const { task, label } = homeworkFor(slide, st.id, interests);
    const ok = await premium(homeworkMaterial(deck, task, label ?? "Class version", st.name || undefined, courseOf(unit)), "student", () => {}, rows.length > 1);
    if (!ok) { fallback(); return false; }
  }
  return true;
}

function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || left === null) return;
    if (left <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setLeft((l) => (l ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);
  return {
    left, running,
    start: (min: number) => { setLeft(Math.round(min * 60)); setRunning(true); },
    toggle: () => setRunning((r) => !r),
    clear: () => { setLeft(null); setRunning(false); },
  };
}

type PlayerProps = {
  deck: Deck;
  unit?: Unit;
  roster: string[];
  rosterNote: string;
  onClose: () => void;
  startAt?: number;
  onSlide?: (index: number) => void; // remembered per class, so the class resumes here
  flipbook?: ClassFlipbook | null;
  onBookPage?: (index: number) => void;
  onWorksheet?: (ws: Worksheet, audience: Audience) => void;
  // Class plays that extend this lesson (the Plays tab): a button for each, on top of the lesson's minutes.
  plays?: { id: string; title: string; minutes: number }[];
  onPlay?: (id: string) => void;
};

export function DeckPlayer({ deck, unit, roster, rosterNote, onClose, startAt = 0, onSlide, flipbook, onBookPage, onWorksheet, plays, onPlay }: PlayerProps) {
  const [i, setI] = useState(() => Math.min(Math.max(0, startAt), deck.slides.length - 1));
  const [shuffle, setShuffle] = useState<number[]>([]);
  const [book, setBook] = useState<{ url: string; label: string; note?: string } | null>(null);
  const slides = useCastDeck(deck, roster, shuffle);
  const timer = useCountdown();
  const dotsRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech();
  const fs = useFullscreen();
  const fsByBook = useRef(false); // full screen was entered by opening the book, so leave it on closing the book
  const raw = deck.slides[i];
  const minutes = "minutes" in raw ? raw.minutes : undefined;

  useEffect(() => { onSlide?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  // A long deck scrolls its dots sideways: keep the current one in view.
  useEffect(() => {
    const box = dotsRef.current;
    const dot = box?.querySelector<HTMLElement>("[data-current='true']");
    if (box && dot) box.scrollTo({ left: dot.offsetLeft - box.clientWidth / 2 + dot.offsetWidth / 2, behavior: "smooth" });
  }, [i]);

  const go = useCallback((d: number) => { setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))); timer.clear(); }, [slides.length, timer]);
  const reshuffle = () => setShuffle((s) => { const n = [...s]; n[i] = (n[i] ?? 0) + 1; return n; });

  const ctx: SlideCtx = useMemo(() => ({
    unit,
    deck,
    speak: speech.supported ? speech.speak : undefined,
    speakScript: speech.supported ? speech.speakScript : undefined,
    bookTarget: (ref: BookRef) => flipTarget(ref, flipbook ?? null, unit?.firstEdition),
    openBook: (ref: BookRef) => {
      const t = flipTarget(ref, flipbook ?? null, unit?.firstEdition);
      if (!t.ok || !flipbook) return;
      setBook({ url: flipbookUrl(flipbook.url, t.index), label: t.label, note: t.note });
      onBookPage?.(t.index);
      // The book goes full screen with nothing else on it (called from the click, so the browser allows it).
      if (!document.fullscreenElement) void fs.enter(document.documentElement).then((ok) => { fsByBook.current = ok; });
    },
    openWorksheet: (id: string, audience: Audience) => {
      const ws = unit?.worksheets?.find((w) => w.id === id);
      if (!ws) return;
      if (onWorksheet) onWorksheet(ws, audience);
      else printWorksheet(ws, audience);
    },
  }), [unit, deck, speech.supported, speech.speak, speech.speakScript, flipbook, onBookPage, onWorksheet, fs]);

  // The book site takes 10-25 s to open a page and cannot turn to another page without reloading,
  // so the page this slide cites is loaded out of sight while the slide is up: "Show p. X" is then instant.
  const preUrl = useMemo(() => {
    if (!flipbook) return null;
    const ref = firstBookRef(raw);
    if (!ref) return null;
    const t = flipTarget(ref, flipbook, unit?.firstEdition);
    return t.ok ? flipbookUrl(flipbook.url, t.index) : null;
  }, [raw, flipbook, unit]);
  const frameUrl = book?.url ?? preUrl;

  const closeBook = useCallback(() => {
    setBook(null);
    if (fsByBook.current) { fsByBook.current = false; void fs.exit(); }
  }, [fs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (book) { if (e.key === "Escape") closeBook(); return; }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "n") reshuffle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const mm = timer.left !== null ? `${Math.floor(Math.max(0, timer.left) / 60)}:${String(Math.max(0, timer.left) % 60).padStart(2, "0")}` : "";

  return (
    <div data-deck-player className="fixed inset-0 z-50 flex flex-col bg-hec-paper" role="dialog" aria-label={deck.title}>
      <div className="flex items-center justify-between gap-2 border-b border-hec-line bg-hec-surface px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-hec-ink">{deck.title}</p>
          <p className="truncate text-xs text-hec-ink-soft">{rosterNote}{flipbook ? ` · Book: ${flipbook.title}${flipbook.edition === "1e" ? " (1st edition)" : ""}` : ""}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {speech.supported && (
            <>
              <Tip tip={`Voice for the listen buttons: ${speech.prefs.accent === "en-GB" ? "British" : "American"} English. Click to switch to ${speech.prefs.accent === "en-GB" ? "American" : "British"}.`}>
                <Button variant="outline" size="sm" aria-label="Switch the listening voice between UK and US"
                  onClick={() => speech.update({ accent: speech.prefs.accent === "en-GB" ? "en-US" : "en-GB" })}>
                  <Volume2 className="h-4 w-4" />{speech.prefs.accent === "en-GB" ? "UK" : "US"}
                </Button>
              </Tip>
              <Tip tip={speech.prefs.slow ? "Slow speech is ON for the listen buttons. Click for normal speed." : "Read listening texts more slowly, for younger or weaker listeners."}>
                <Button variant={speech.prefs.slow ? "default" : "outline"} size="sm" aria-pressed={speech.prefs.slow} onClick={() => speech.update({ slow: !speech.prefs.slow })}>
                  <Turtle className="h-4 w-4" />Slow
                </Button>
              </Tip>
            </>
          )}
          {minutes !== undefined && (
            timer.left === null ? (
              <Tip tip={`Start a ${minutes}-minute timer for this slide. It stops when you change slide.`}>
                <Button variant="outline" size="sm" onClick={() => timer.start(minutes)}><Timer className="h-4 w-4" />{minutes} min</Button>
              </Tip>
            ) : (
              <Tip tip={timer.left <= 0 ? "Time is up." : timer.running ? "Pause the timer" : "Carry on with the timer"}>
                <Button variant={timer.left <= 0 ? "destructive" : "outline"} size="sm" onClick={timer.toggle}>
                  {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{timer.left <= 0 ? "Time!" : mm}
                </Button>
              </Tip>
            )
          )}
          {onPlay && plays?.map((p) => (
            <Tip key={p.id} tip={`Class play "${p.title}": opens the Plays tab, cast for today's class. ${p.minutes} minutes on top of the lesson.`}>
              <Button variant="outline" size="sm" className="border-amber-400" onClick={() => onPlay(p.id)}>
                <Drama className="h-4 w-4" />Play +{p.minutes} min
              </Button>
            </Tip>
          ))}
          <Tip tip={<>Pick different children from today's attendance for the names on this slide. Key: <kbd className="font-semibold">N</kbd></>}>
            <Button variant="outline" size="sm" onClick={reshuffle}><Shuffle className="h-4 w-4" />New names</Button>
          </Tip>
          <Tip tip="Print the teacher copy of this lesson: answers, listening scripts and teacher notes printed open.">
            <Button variant="outline" size="sm" onClick={() => printDeck(deck, roster, unit, "teacher")}><Printer className="h-4 w-4" />Teacher</Button>
          </Tip>
          <Tip tip="Print the student copy: no answers, scripts or teacher notes.">
            <Button variant="outline" size="sm" onClick={() => printDeck(deck, roster, unit, "student")}><Printer className="h-4 w-4" />Student</Button>
          </Tip>
          <Tip tip={<>Close the lesson. The class carries on from this slide next time. Key: <kbd className="font-semibold">Esc</kbd></>}>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (Esc)"><X className="h-5 w-5" /></Button>
          </Tip>
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-12 min-h-full">
          <SlideContext.Provider value={ctx}>
            <SlideView slide={slides[i]} lab={isLab(deck, i)} />
          </SlideContext.Provider>
        </div>
        {frameUrl && (
          // Open: above everything, the classroom tools button included, so only the book shows.
          // Not open: the same box, full size (the site lays the book out once, for the size it loads at), out of sight.
          <div data-flipbook-focus={book ? "open" : "preloading"}
            className={book ? "fixed inset-0 z-[70] bg-black" : "pointer-events-none fixed inset-0 -z-10 opacity-0"}
            role={book ? "dialog" : undefined} aria-hidden={book ? undefined : true}
            aria-label={book ? `${flipbook?.title ?? "Flipbook"}, ${book.label}` : undefined}>
            <FlipbookFrame key={frameUrl} src={frameUrl} title={flipbook?.title ?? "Flipbook"} className="h-full w-full" />
          </div>
        )}
        {book && (
          <div className="fixed left-2 top-2 z-[71]">
            {/* Top left, over the site's logo: its page arrows sit top centre. */}
            <div className="flex items-center gap-1 rounded-full bg-black/60 p-1 pl-3 text-white opacity-40 shadow-lg backdrop-blur transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
              <span className="flex max-w-[28vw] items-center gap-1.5 truncate text-xs"><BookOpen className="h-3.5 w-3.5 shrink-0" />{book.label}{book.note ? ` · ${book.note}` : ""}</span>
              <Tip tip={fs.active ? "Leave full screen (the book stays open)" : "Full screen"}>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
                  aria-label={fs.active ? "Leave full screen" : "Full screen"}
                  onClick={() => { if (fs.active) { fsByBook.current = false; void fs.exit(); } else void fs.enter(document.documentElement).then((ok) => { fsByBook.current = ok; }); }}>
                  {fs.active ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </Tip>
              <Tip tip="Open the book in its own browser tab">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white" aria-label="Open in a new tab"
                  onClick={() => window.open(book.url, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /></Button>
              </Tip>
              <Tip tip={<>Back to the slide. Key: <kbd className="font-semibold">Esc</kbd> (click outside the book first)</>}>
                <Button size="sm" className="h-8 rounded-full" onClick={closeBook}><ArrowLeft className="h-4 w-4" />Slide</Button>
              </Tip>
            </div>
          </div>
        )}
      </div>
      {/* Room on the right for the classroom tools button, which floats above the deck. */}
      <div className="flex items-center justify-between gap-3 border-t border-hec-line bg-hec-surface py-2 pl-4 pr-20 md:pr-24">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide"><ChevronLeft className="h-5 w-5" />Back</Button>
          </TooltipTrigger>
          <TooltipContent side="top">Previous slide · ← or Page Up</TooltipContent>
        </Tooltip>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <span className="shrink-0 text-sm font-medium tabular-nums text-hec-ink" aria-live="polite">{i + 1} / {slides.length}</span>
          <div ref={dotsRef} className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-2" role="group" aria-label={`Slide ${i + 1} of ${slides.length}`}>
            {slides.map((_, k) => (
              <Tooltip key={k}>
                <TooltipTrigger asChild>
                  <button type="button" data-current={k === i} onClick={() => { setI(k); timer.clear(); }} aria-label={`Slide ${k + 1}: ${slideLabel(deck.slides[k])}${isLab(deck, k) ? " (Grammar Lab)" : ""}`} aria-current={k === i ? "step" : undefined}
                    className={`h-3 shrink-0 rounded-full transition-all ${k === i ? "w-7 bg-amber-500" : isLab(deck, k) ? "w-3 bg-violet-400 hover:bg-violet-500" : "w-3 bg-hec-line-strong/50 hover:bg-hec-line-strong"}`} />
                </TooltipTrigger>
                <TooltipContent side="top">{k + 1}. {slideLabel(deck.slides[k])}{isLab(deck, k) ? " · Grammar Lab" : ""}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => go(1)} disabled={i === slides.length - 1} aria-label="Next slide">Next<ChevronRight className="h-5 w-5" /></Button>
          </TooltipTrigger>
          <TooltipContent side="top">Next slide · → , Space or Page Down</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
