import { useCallback, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Deck } from "@/lib/lessonDecks/types";
import { castSlide } from "@/lib/lessonDecks/names";
import { SlideView } from "./SlideView";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Shuffle, X, Timer, Pause, Play, Printer } from "lucide-react";

/** The deck's slides with this class's names in them. */
export function useCastDeck(deck: Deck, roster: string[], shuffle: number[]) {
  return useMemo(
    () => deck.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`, shuffle[i] ?? 0).slide),
    [deck, roster, shuffle],
  );
}

/**
 * Print / save as PDF: every slide on its own landscape page, names filled in as
 * shown. Opens a window carrying the app's own stylesheets so slides look the same.
 */
export function printDeck(deck: Deck, roster: string[]) {
  const slides = deck.slides.map((s, i) => castSlide(s, roster, `${deck.id}:${i}`).slide);
  const body = renderToStaticMarkup(
    <div>
      {slides.map((s, i) => (
        <section key={i} className="deck-page bg-white p-10">
          <SlideView slide={s} />
          <p className="mt-6 text-right text-sm text-gray-500">{deck.title} · {i + 1}/{slides.length}</p>
        </section>
      ))}
    </div>,
  );
  const w = window.open("", "_blank");
  if (!w) return false;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("\n");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${deck.title.replace(/</g, "")}</title>${styles}
    <style>@page{size:A4 landscape;margin:10mm}.deck-page{break-after:page;min-height:180mm}body{background:#fff}</style>
    </head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
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

export function DeckPlayer({ deck, roster, rosterNote, onClose }: { deck: Deck; roster: string[]; rosterNote: string; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [shuffle, setShuffle] = useState<number[]>([]);
  const slides = useCastDeck(deck, roster, shuffle);
  const timer = useCountdown();
  const raw = deck.slides[i];
  const minutes = "minutes" in raw ? raw.minutes : undefined;

  const go = useCallback((d: number) => { setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))); timer.clear(); }, [slides.length, timer]);
  const reshuffle = () => setShuffle((s) => { const n = [...s]; n[i] = (n[i] ?? 0) + 1; return n; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
          <p className="truncate text-xs text-hec-ink-soft">{rosterNote}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
          <Button variant="outline" size="sm" onClick={() => printDeck(deck, roster)} title="Print or save as PDF"><Printer className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (Esc)"><X className="h-5 w-5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-12 min-h-full">
          <SlideView slide={slides[i]} />
        </div>
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
