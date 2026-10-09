/**
 * Visual timer.
 *
 * All state and tick logic live in TimerContext so the countdown survives
 * this component unmounting when the panel closes.
 *
 * The ring empties anticlockwise and changes colour only in the last
 * minute. A ring that shifts hue the whole way down trains children to
 * watch the colour instead of the time; one change, late, is a warning.
 */
import { useState } from "react";
import { BellOff, Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  QuietButton,
  Segmented,
  Stage,
  Stepper,
  ToolCard,
} from "./studio/StudioKit";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { useViewport } from "./studio/useViewport";

const PRESETS = [
  { value: "60", label: "1m" },
  { value: "180", label: "3m" },
  { value: "300", label: "5m" },
  { value: "600", label: "10m" },
  { value: "900", label: "15m" },
] as const;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function Dial({
  progress,
  remaining,
  caption,
  urgent,
  size,
}: {
  progress: number;
  remaining: number;
  caption: string;
  urgent: boolean;
  size: number;
}) {
  const stroke = size * 0.07;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="hsl(var(--studio-ink) / 0.09)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={urgent ? "hsl(var(--studio-clay-ink))" : "hsl(var(--studio-ink))"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-linear"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "studio-title tabular-nums",
            urgent && "text-[hsl(var(--studio-clay-ink))]",
          )}
          style={{ fontSize: size * 0.24, lineHeight: 1 }}
        >
          {formatTime(remaining)}
        </span>
        <span
          className="mt-1 font-semibold uppercase tracking-[0.18em] text-ink-faint"
          style={{ fontSize: Math.max(9, size * 0.055) }}
        >
          {caption}
        </span>
      </div>
    </div>
  );
}

export function VisualTimer() {
  const {
    totalSeconds,
    remaining,
    running,
    alarming,
    progress,
    isFinished,
    start,
    pause,
    resume,
    reset,
    dismiss,
    draftMin,
    draftSec,
    setDraftMin,
    setDraftSec,
    applyDraft,
  } = useTimer();
  const [projecting, setProjecting] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const viewport = useViewport();

  const caption = alarming
    ? "Time's up"
    : isFinished
      ? "Finished"
      : running
        ? "Running"
        : "Paused";
  const urgent = alarming || isFinished || (running && remaining <= 60);
  const atStart = remaining === totalSeconds;

  const controls = (
    <div className="flex items-center gap-2">
      {!running && atStart && (
        <ActionButton onClick={() => start()}>
          <Play className="h-4 w-4" aria-hidden /> Start
        </ActionButton>
      )}
      {!running && !atStart && remaining > 0 && (
        <ActionButton onClick={resume}>
          <Play className="h-4 w-4" aria-hidden /> Resume
        </ActionButton>
      )}
      {running && (
        <ActionButton onClick={pause}>
          <Pause className="h-4 w-4" aria-hidden /> Pause
        </ActionButton>
      )}
      <QuietButton
        size="lg"
        onClick={reset}
        disabled={atStart && !running}
        aria-label="Reset timer"
        className="aspect-square px-0"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </QuietButton>
    </div>
  );

  return (
    <>
      <ToolCard
        icon={TimerIcon}
        tone="sky"
        title="Timer"
        description="Counts down where the whole room can see it."
        action={<ClassScreenButton onClick={() => setProjecting(true)} />}
      >
        <Stage className="mb-4 min-h-[200px] py-4">
          <Dial
            progress={progress}
            remaining={remaining}
            caption={caption}
            urgent={urgent}
            size={172}
          />
        </Stage>

        {alarming ? (
          <ActionButton onClick={dismiss} className="animate-pulse">
            <BellOff className="h-4 w-4" aria-hidden /> Stop the alarm
          </ActionButton>
        ) : (
          <>
            <Segmented
              ariaLabel="Timer length"
              className="mb-3"
              size="sm"
              options={PRESETS}
              value={String(totalSeconds)}
              onChange={(v) => start(Number(v))}
            />
            {controls}

            {/* Any length that is not a preset. Folded away because it is
                the rare case — five taps on "5m" beats a number pad. */}
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              aria-expanded={customOpen}
              className="studio-focus mt-3 self-start rounded-full px-1 text-xs font-semibold text-ink-faint underline-offset-4 hover:text-ink hover:underline"
            >
              {customOpen ? "Hide custom length" : "Custom length…"}
            </button>
            {customOpen && (
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Stepper
                  label="Minutes"
                  value={Number(draftMin) || 0}
                  onChange={(v) => setDraftMin(String(v))}
                  min={0}
                  max={99}
                />
                <Stepper
                  label="Seconds"
                  value={Number(draftSec) || 0}
                  onChange={(v) => setDraftSec(String(v))}
                  min={0}
                  max={59}
                  step={5}
                />
                <QuietButton size="lg" onClick={applyDraft}>
                  Set
                </QuietButton>
              </div>
            )}
          </>
        )}
      </ToolCard>

      <ClassScreen open={projecting} onClose={() => setProjecting(false)} title="Timer">
        <div className="flex flex-col items-center gap-10">
          <Dial
            progress={progress}
            remaining={remaining}
            caption={caption}
            urgent={urgent}
            size={Math.max(200, Math.min(viewport.w * 0.8, viewport.h * 0.58))}
          />
          {alarming ? (
            <ActionButton onClick={dismiss} className="w-auto animate-pulse px-12 text-lg sm:px-20 sm:text-2xl">
              <BellOff className="h-5 w-5" aria-hidden /> Stop the alarm
            </ActionButton>
          ) : (
            controls
          )}
        </div>
      </ClassScreen>
    </>
  );
}
