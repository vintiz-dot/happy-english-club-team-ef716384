/**
 * Noise meter — a dial, not a bar chart.
 *
 * Children read a needle instantly and a number not at all. The arc is
 * banded so "where the needle is" carries the meaning on its own, and the
 * numeric level is kept small and secondary for the adult in the room.
 *
 * Audio never leaves the device: the mic feeds an AnalyserNode and the
 * only thing that escapes it is one integer. State lives in
 * NoiseMeterContext so the mic survives the panel closing.
 */
import { useState } from "react";
import { AlertTriangle, Mic, MicOff, Volume2 } from "lucide-react";
import { useNoiseMeter } from "@/contexts/NoiseMeterContext";
import {
  ActionButton,
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { useViewport } from "./studio/useViewport";

// Tuned for typical classroom mic input, not for calibrated dB.
const ZONES = [
  { to: 22, label: "Quiet", color: "hsl(146 48% 46%)" },
  { to: 45, label: "Working", color: "hsl(88 52% 44%)" },
  { to: 65, label: "Lively", color: "hsl(42 88% 50%)" },
  { to: 82, label: "Too loud", color: "hsl(24 88% 52%)" },
  { to: 101, label: "Stop", color: "hsl(2 72% 52%)" },
];

function zoneFor(level: number) {
  return ZONES.find((z) => level < z.to) ?? ZONES[ZONES.length - 1];
}

/** Point on the gauge arc for a 0–100 level. The arc spans 200°. */
function polar(cx: number, cy: number, r: number, level: number) {
  const angle = (-190 + (level / 100) * 200) * (Math.PI / 180);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = (to - from) / 100 > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

function Gauge({
  level,
  live,
  size,
}: {
  level: number;
  live: boolean;
  size: number;
}) {
  // Geometry: the 200° arc reaches ~0.066r below the hub at both ends, so
  // the box has to be taller than the semicircle or the caps get clipped.
  const w = size;
  const h = size * 0.72;
  const cx = w / 2;
  const cy = h * 0.85;
  const r = w * 0.38;
  const needle = polar(cx, cy, r * 0.82, live ? level : 0);
  const zone = zoneFor(level);

  return (
    <div style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        {/* banded track */}
        {ZONES.map((z, i) => {
          const from = i === 0 ? 0 : ZONES[i - 1].to;
          return (
            <path
              key={z.label}
              d={arcPath(cx, cy, r, from, Math.min(100, z.to))}
              fill="none"
              stroke={z.color}
              strokeWidth={w * 0.075}
              strokeLinecap="butt"
              opacity={live ? 0.9 : 0.28}
            />
          );
        })}
        {/* needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke="hsl(var(--studio-ink))"
          strokeWidth={Math.max(2, w * 0.016)}
          strokeLinecap="round"
          style={{ transition: "all 110ms linear" }}
        />
        <circle cx={cx} cy={cy} r={w * 0.035} fill="hsl(var(--studio-ink))" />
      </svg>
      <div className="-mt-1 text-center">
        <p className="studio-title" style={{ fontSize: size * 0.11 }}>
          {live ? zone.label : "Mic off"}
        </p>
        {live && (
          <p
            className="font-semibold tabular-nums text-ink-faint"
            style={{ fontSize: size * 0.05 }}
          >
            {level} / 100
          </p>
        )}
      </div>
    </div>
  );
}

export function NoiseMeter() {
  const { status, level, error, start, stop } = useNoiseMeter();
  const [projecting, setProjecting] = useState(false);
  const viewport = useViewport();
  const live = status === "running";

  return (
    <>
      <ToolCard
        icon={Volume2}
        tone="lilac"
        title="Noise meter"
        description="Live room volume from the microphone. Nothing is recorded."
        action={<ClassScreenButton onClick={() => setProjecting(true)} disabled={!live} />}
      >
        <Stage className="mb-4 min-h-[200px] py-5">
          <Gauge level={level} live={live} size={230} />
        </Stage>

        {live ? (
          <ActionButton onClick={stop}>
            <MicOff className="h-4 w-4" aria-hidden /> Stop listening
          </ActionButton>
        ) : (
          <ActionButton onClick={start} disabled={status === "requesting"}>
            <Mic className="h-4 w-4" aria-hidden />
            {status === "requesting" ? "Asking for the mic…" : "Start listening"}
          </ActionButton>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-snug text-[hsl(var(--studio-clay-ink))]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </ToolCard>

      <ClassScreen
        open={projecting}
        onClose={() => setProjecting(false)}
        title="Noise meter"
      >
        <Gauge
          level={level}
          live={live}
          size={Math.max(260, Math.min(viewport.w * 0.8, viewport.h * 1.15))}
        />
      </ClassScreen>
    </>
  );
}
