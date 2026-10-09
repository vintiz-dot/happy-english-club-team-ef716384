/**
 * Background music — three moods, no files, no loop.
 *
 * The engine is a module singleton (see generativeMusic.ts), so music
 * keeps playing when this panel closes. That is the point: a teacher
 * starts "Calm" for a test and then goes back to teaching.
 */
import { useEffect, useRef, useState } from "react";
import { Moon, Music4, Orbit, Pause, Play, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOOD_LABELS,
  music,
  type Mood,
  type MusicState,
  type Width,
} from "./generativeMusic";
import {
  ActionButton,
  Segmented,
  StudioSlider,
  ToolCard,
} from "./studio/StudioKit";
import {
  readTone,
  type StudioTone,
} from "./studio/tokens";

const MOOD_TONE: Record<Mood, StudioTone> = {
  calm: "sage",
  energetic: "butter",
  space: "lilac",
};

const MOOD_ICON: Record<Mood, typeof Moon> = {
  calm: Moon,
  energetic: Zap,
  space: Orbit,
};

const WIDTH_OPTIONS = [
  { value: "stereo", label: "Stereo" },
  { value: "mono", label: "Mono" },
] as const;

/**
 * Live spectrum, drawn as one filled curve rather than bars. Bars read as
 * "audio software"; a single soft hill reads as something a child's class
 * is allowed to look at.
 */
function Ribbon({ playing, tone }: { playing: boolean; tone: StudioTone }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const POINTS = 64;
    // Bins above ~4 kHz are silent for this material; sampling them would
    // flatten the right half of the curve.
    const TOP_BIN = 44;
    const data = new Uint8Array(256);
    // Eased toward the live reading each frame, so a dropped frame or a
    // sudden transient does not make the curve snap.
    const smoothed = new Float32Array(POINTS);

    // Canvas cannot read CSS custom properties, so the palette is resolved
    // here and refreshed about once a second — often enough that toggling
    // dark mode recolours the ribbon, rarely enough to cost nothing.
    let palette = readTone(tone);
    let sinceResolve = 0;

    const draw = () => {
      sinceResolve += 1;
      if (sinceResolve > 60) {
        palette = readTone(tone);
        sinceResolve = 0;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      const analyser = music.analyser;
      if (analyser && playing) {
        analyser.getByteFrequencyData(data);
      } else {
        data.fill(0);
      }

      for (let i = 0; i < POINTS; i += 1) {
        const t = i / (POINTS - 1);
        // Squared so the first few bins occupy the left half of the card.
        const bin = Math.min(TOP_BIN, Math.round(t * t * TOP_BIN));
        const target = data[bin] / 255;
        smoothed[i] += (target - smoothed[i]) * 0.18;
      }

      const stepX = w / (POINTS - 1);
      const yAt = (i: number) => h - Math.max(1.5, smoothed[i] * h * 0.95);
      ctx2d.beginPath();
      ctx2d.moveTo(0, h);
      for (let i = 0; i < POINTS; i += 1) {
        const x = i * stepX;
        const y = yAt(i);
        if (i === 0) ctx2d.lineTo(x, y);
        else {
          const px = (i - 1) * stepX;
          ctx2d.bezierCurveTo((px + x) / 2, yAt(i - 1), (px + x) / 2, y, x, y);
        }
      }
      ctx2d.lineTo(w, h);
      ctx2d.closePath();

      const grad = ctx2d.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, palette.fill);
      grad.addColorStop(1, "transparent");
      ctx2d.fillStyle = grad;
      ctx2d.globalAlpha = playing ? 1 : 0.45;
      ctx2d.fill();

      ctx2d.globalAlpha = 1;
      ctx2d.strokeStyle = palette.ink;
      ctx2d.globalAlpha = playing ? 0.55 : 0.2;
      ctx2d.lineWidth = 1.5;
      ctx2d.stroke();
      ctx2d.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [playing, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="h-14 w-full rounded-xl bg-studio-stage"
    />
  );
}

export function BackgroundMusic() {
  const [state, setState] = useState<MusicState>(() => music.getState());

  useEffect(() => music.subscribe(setState), []);

  if (!state.supported) {
    return (
      <ToolCard
        icon={Music4}
        tone="sage"
        title="Background music"
        description="This browser has no Web Audio support, so there is nothing to play."
      >
        <div className="studio-stage grid min-h-[120px] place-items-center p-4 text-center text-sm text-ink-soft">
          Try Chrome, Edge, Safari or Firefox.
        </div>
      </ToolCard>
    );
  }

  const tone = MOOD_TONE[state.mood];

  return (
    <ToolCard
      icon={Music4}
      tone={tone}
      title="Background music"
      description="Music that composes itself and never repeats."
      action={
        state.playing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--studio-ink))] px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-[hsl(var(--studio-card))]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            Playing
          </span>
        ) : null
      }
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(Object.keys(MOOD_LABELS) as Mood[]).map((mood) => {
          const Icon = MOOD_ICON[mood];
          const active = state.mood === mood && state.playing;
          return (
            <button
              key={mood}
              type="button"
              onClick={() => music.toggle(mood)}
              aria-pressed={active}
              className={cn(
                "studio-focus group flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all",
                active
                  ? "border-transparent bg-[hsl(var(--studio-ink))] text-[hsl(var(--studio-card))] shadow-studio"
                  : "border-studio bg-studio-stage hover:-translate-y-0.5 hover:shadow-studio",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                  active
                    ? "bg-[hsl(var(--studio-card)/0.18)] text-[hsl(var(--studio-card))]"
                    : "bg-[hsl(var(--studio-ink)/0.06)] text-ink",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-sm font-bold",
                    active ? "text-[hsl(var(--studio-card))]" : "text-ink",
                  )}
                >
                  {MOOD_LABELS[mood].name}
                </span>
                <span
                  className={cn(
                    "block text-[0.6875rem] leading-tight",
                    active ? "text-[hsl(var(--studio-card)/0.7)]" : "text-ink-faint",
                  )}
                >
                  {MOOD_LABELS[mood].blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <Ribbon playing={state.playing} tone={tone} />
      </div>

      <div className="mb-3 space-y-2.5">
        <StudioSlider
          label="Volume"
          value={state.volume}
          min={0}
          max={100}
          onChange={(v) => music.set({ volume: v })}
        />
        <StudioSlider
          label="Bass"
          value={state.bass}
          min={-12}
          max={12}
          onChange={(v) => music.set({ bass: v })}
          format={(v) => (v > 0 ? `+${v}` : `${v}`)}
        />
        <StudioSlider
          label="Treble"
          value={state.treble}
          min={-12}
          max={12}
          onChange={(v) => music.set({ treble: v })}
          format={(v) => (v > 0 ? `+${v}` : `${v}`)}
        />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span className="w-14 shrink-0 text-xs font-semibold text-ink-soft">Speakers</span>
        <Segmented
          ariaLabel="Speaker layout"
          size="sm"
          options={WIDTH_OPTIONS}
          value={state.width}
          onChange={(w) => music.set({ width: w as Width })}
        />
      </div>

      <ActionButton onClick={() => music.toggle()} className="mt-auto">
        {state.playing ? (
          <>
            <Pause className="h-4 w-4" aria-hidden /> Stop the music
          </>
        ) : (
          <>
            <Play className="h-4 w-4" aria-hidden /> Play {MOOD_LABELS[state.mood].name.toLowerCase()}
          </>
        )}
      </ActionButton>
    </ToolCard>
  );
}
