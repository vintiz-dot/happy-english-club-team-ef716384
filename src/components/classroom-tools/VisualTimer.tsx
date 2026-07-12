import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, BellOff } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";

const PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "3m", seconds: 180 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
  { label: "15m", seconds: 900 },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Pure rendering component for the visual timer. All state & tick logic
 * lives in TimerContext so the timer persists even when this component
 * is unmounted (e.g. when the Classroom Tools sheet closes).
 */
export function VisualTimer() {
  const {
    totalSeconds,
    remaining,
    running,
    alarming,
    progress,
    isFinished,
    ringColor,
    draftMin,
    draftSec,
    start,
    pause,
    resume,
    reset,
    dismiss,
    applyDraft,
    setDraftMin,
    setDraftSec,
  } = useTimer();

  // SVG ring math.
  const RADIUS = 86;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * progress;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
            <circle
              cx="110"
              cy="110"
              r={RADIUS}
              className="stroke-muted"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="110"
              cy="110"
              r={RADIUS}
              className={`${ringColor} transition-[stroke,stroke-dashoffset] duration-500 ${alarming ? "animate-pulse" : ""}`}
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - dash}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={`type-display tabular-nums ${alarming ? "text-rose-600 animate-pulse" : isFinished ? "text-rose-600" : "text-foreground"}`}
            >
              {formatTime(remaining)}
            </span>
            <span className={`type-micro ${alarming ? "text-rose-500 font-bold animate-pulse" : "text-muted-foreground"}`}>
              {alarming ? "⏰ Time's up!" : isFinished ? "Time's up!" : running ? "running" : "paused"}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Alarm dismiss button (iPhone-style prominent stop) ---- */}
      {alarming ? (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={dismiss}
            size="lg"
            className="gap-3 h-14 px-10 rounded-2xl text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/30 animate-pulse"
          >
            <BellOff className="h-6 w-6" />
            Stop Alarm
          </Button>
          <p className="text-xs text-muted-foreground animate-pulse">
            Tap to silence
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2">
            {!running && remaining === totalSeconds && (
              <Button onClick={() => start()} size="lg" className="gap-2 h-12 px-6">
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
            {!running && remaining < totalSeconds && remaining > 0 && (
              <Button onClick={resume} size="lg" className="gap-2 h-12 px-6">
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
            {running && (
              <Button onClick={pause} size="lg" variant="secondary" className="gap-2 h-12 px-6">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            <Button
              onClick={reset}
              size="lg"
              variant="outline"
              className="gap-2 h-12 px-4"
              disabled={remaining === totalSeconds && !running}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="h-10 font-semibold"
                onClick={() => start(p.seconds)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="vt-min" className="type-micro">Minutes</Label>
              <Input
                id="vt-min"
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vt-sec" className="type-micro">Seconds</Label>
              <Input
                id="vt-sec"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={draftSec}
                onChange={(e) => setDraftSec(e.target.value)}
              />
            </div>
            <Button onClick={applyDraft} variant="secondary" className="h-10">
              Set
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
