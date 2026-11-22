import { useCallback, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Assessment, BookRef, Deck, Slide, Unit, Worksheet } from "@/lib/lessonDecks/types";
import { castSlide } from "@/lib/lessonDecks/names";
import { flipTarget, flipbookUrl, type FlipbookLite } from "@/lib/lessonDecks/bookPages";
import { homeworkFor } from "@/lib/lessonDecks/views";
import { SlideView, SlideContext, WorksheetView, AssessmentView, type SlideCtx } from "./SlideView";
import { useSpeech } from "./speech";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Shuffle, X, Timer, Pause, Play, Printer, Volume2, Turtle, ExternalLink, BookOpen } from "lucide-react";

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

/** Print / save as PDF: every slide on its own landscape page, names filled in as shown. */
export function printDeck(deck: Deck, roster: string[], unit?: Unit) {
  const slides = deck.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`).slide);
  const body = renderToStaticMarkup(
    <SlideContext.Provider value={{ unit, deck }}>
      {slides.map((s, i) => (
        <section key={i} className="deck-page bg-white p-10">
          <SlideView slide={s} />
          <p className="mt-6 text-right text-sm text-gray-500">{deck.title} · {i + 1}/{slides.length}</p>
        </section>
      ))}
    </SlideContext.Provider>,
  );
  return printPages(deck.title, body, true);
}

/** A worksheet: the pupil pages, then the answer key on its own page. */
export function printWorksheet(ws: Worksheet) {
  const body = renderToStaticMarkup(
    <div>
      <section className="deck-page bg-white p-8"><WorksheetView ws={ws} answers={false} /></section>
      <section className="deck-page bg-white p-8"><WorksheetView ws={ws} answers /></section>
    </div>,
  );
  return printPages(ws.title, body, false);
}

/** A check or test: the paper, then the answer key and rubric. */
export function printAssessment(a: Assessment) {
  const body = renderToStaticMarkup(
    <div>
      <section className="deck-page bg-white p-8"><AssessmentView a={a} answers={false} /></section>
      <section className="deck-page bg-white p-8"><AssessmentView a={a} answers /></section>
    </div>,
  );
  return printPages(a.title, body, false);
}

/**
 * One homework sheet per child, each with their own version (the football
 * edition for the children chosen for it). Names come from the live roster and
 * go only onto the paper; nothing is saved.
 */
export function printHomeworkSheets(deck: Deck, students: { id: string; name: string }[], interests: Record<string, string[]>) {
  const slide = deck.slides.find((s): s is Extract<Slide, { kind: "creative" }> => s.kind === "creative");
  if (!slide) return false;
  const rows = students.length ? students : [{ id: "", name: "" }];
  const body = renderToStaticMarkup(
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
  return printPages(`${deck.title} homework`, body, false);
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
  onWorksheet?: (ws: Worksheet) => void;
};

export function DeckPlayer({ deck, unit, roster, rosterNote, onClose, startAt = 0, onSlide, flipbook, onBookPage, onWorksheet }: PlayerProps) {
  const [i, setI] = useState(() => Math.min(Math.max(0, startAt), deck.slides.length - 1));
  const [shuffle, setShuffle] = useState<number[]>([]);
  const [book, setBook] = useState<{ url: string; label: string; note?: string } | null>(null);
  const slides = useCastDeck(deck, roster, shuffle);
  const timer = useCountdown();
  const speech = useSpeech();
  const raw = deck.slides[i];
  const minutes = "minutes" in raw ? raw.minutes : undefined;

  useEffect(() => { onSlide?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((d: number) => { setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))); timer.clear(); }, [slides.length, timer]);
  const reshuffle = () => setShuffle((s) => { const n = [...s]; n[i] = (n[i] ?? 0) + 1; return n; });

  const ctx: SlideCtx = useMemo(() => ({
    unit,
    deck,
    speak: speech.supported ? speech.speak : undefined,
    bookTarget: (ref: BookRef) => flipTarget(ref, flipbook ?? null, unit?.firstEdition),
    openBook: (ref: BookRef) => {
      const t = flipTarget(ref, flipbook ?? null, unit?.firstEdition);
      if (!t.ok || !flipbook) return;
      setBook({ url: flipbookUrl(flipbook.url, t.index), label: t.label, note: t.note });
      onBookPage?.(t.index);
    },
    openWorksheet: (id: string) => {
      const ws = unit?.worksheets?.find((w) => w.id === id);
      if (ws) (onWorksheet ?? printWorksheet)(ws);
    },
  }), [unit, deck, speech.supported, speech.speak, flipbook, onBookPage, onWorksheet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (book) { if (e.key === "Escape") setBook(null); return; }
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
    <div className="fixed inset-0 z-50 flex flex-col bg-hec-paper" role="dialog" aria-label={deck.title}>
      <div className="flex items-center justify-between gap-2 border-b border-hec-line bg-hec-surface px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-hec-ink">{deck.title}</p>
          <p className="truncate text-xs text-hec-ink-soft">{rosterNote}{flipbook ? ` · Book: ${flipbook.title}${flipbook.edition === "1e" ? " (1st edition)" : ""}` : ""}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {speech.supported && (
            <>
              <Button variant="outline" size="sm" title="Voice for the listen buttons"
                onClick={() => speech.update({ accent: speech.prefs.accent === "en-GB" ? "en-US" : "en-GB" })}>
                <Volume2 className="h-4 w-4" />{speech.prefs.accent === "en-GB" ? "UK" : "US"}
              </Button>
              <Button variant={speech.prefs.slow ? "default" : "outline"} size="sm" title="Slower speech" onClick={() => speech.update({ slow: !speech.prefs.slow })}>
                <Turtle className="h-4 w-4" />Slow
              </Button>
            </>
          )}
          {minutes !== undefined && (
            timer.left === null ? (
              <Button variant="outline" size="sm" onClick={() => timer.start(minutes)}><Timer className="h-4 w-4" />{minutes} min</Button>
            ) : (
              <Button variant={timer.left <= 0 ? "destructive" : "outline"} size="sm" onClick={timer.toggle}>
                {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{timer.left <= 0 ? "Time!" : mm}
              </Button>
            )
          )}
          <Button variant="outline" size="sm" onClick={reshuffle} title="New names (N)"><Shuffle className="h-4 w-4" />New names</Button>
          <Button variant="outline" size="sm" onClick={() => printDeck(deck, roster, unit)} title="Print or save as PDF"><Printer className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (Esc)"><X className="h-5 w-5" /></Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-12 min-h-full">
          <SlideContext.Provider value={ctx}>
            <SlideView slide={slides[i]} />
          </SlideContext.Provider>
        </div>
        {book && (
          <div className="absolute inset-0 z-10 flex flex-col bg-black">
            <div className="flex items-center justify-between gap-2 bg-hec-surface px-3 py-1.5">
              <p className="flex items-center gap-2 text-sm text-hec-ink"><BookOpen className="h-4 w-4" />{flipbook?.title} · {book.label}{book.note ? ` · ${book.note}` : ""}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => window.open(book.url, "_blank", "noopener")}><ExternalLink className="h-4 w-4" />New tab</Button>
                <Button size="sm" onClick={() => setBook(null)}>Back to the slide</Button>
              </div>
            </div>
            <iframe key={book.url} src={book.url} title={flipbook?.title ?? "Flipbook"} className="w-full flex-1 border-0 bg-white" allowFullScreen />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-hec-line bg-hec-surface px-4 py-2">
        <Button variant="outline" onClick={() => go(-1)} disabled={i === 0}><ChevronLeft className="h-5 w-5" />Back</Button>
        <div className="flex items-center gap-1" aria-label={`Slide ${i + 1} of ${slides.length}`}>
          {slides.map((_, k) => (
            <button key={k} onClick={() => { setI(k); timer.clear(); }} aria-label={`Slide ${k + 1}`}
              className={`h-2.5 rounded-full transition-all ${k === i ? "w-6 bg-amber-500" : "w-2.5 bg-hec-line"}`} />
          ))}
        </div>
        <Button onClick={() => go(1)} disabled={i === slides.length - 1}>Next<ChevronRight className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
