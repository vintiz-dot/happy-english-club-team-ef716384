/**
 * Spinner — pick one name, visibly at random.
 *
 * The visible randomness is the feature. A teacher choosing "fairly" in
 * their head is not seen to be fair; a wheel is. So the landing position
 * is genuinely random and the winner is read off where the pointer
 * actually stopped, never decided first and animated to.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Disc3, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionButton,
  QuietButton,
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import {
  TONE_VAR,
  type StudioTone,
} from "./studio/tokens";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { CLASS_SCREEN_ACTION } from "./studio/tokens";
import { useViewport } from "./studio/useViewport";
import { playChime, playClick } from "./audio";

const STORAGE_KEY = "classroom-wheel-entries";
const SLICE_TONES: StudioTone[] = ["sage", "clay", "sky", "butter", "lilac", "rose"];

function parseEntries(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

/** Wedge path for slice `i` of `n`, on a unit circle of radius `r`. */
function wedge(cx: number, cy: number, r: number, from: number, to: number) {
  const a0 = (from - 90) * (Math.PI / 180);
  const a1 = (to - 90) * (Math.PI / 180);
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = to - from > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function Wheel({
  entries,
  angle,
  size,
}: {
  entries: string[];
  angle: number;
  size: number;
}) {
  const r = size / 2;
  const slice = entries.length > 0 ? 360 / entries.length : 360;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* pointer — sits above the wheel at 12 o'clock */}
      <svg
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        width={size * 0.1}
        height={size * 0.1}
        viewBox="0 0 20 20"
        aria-hidden
      >
        <path
          d="M10 18 L2 2 Q10 6 18 2 Z"
          style={{ fill: "hsl(var(--studio-ink))" }}
        />
      </svg>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ transform: `rotate(${angle}deg)` }}
        aria-hidden
      >
        <circle
          cx={r}
          cy={r}
          r={r - 1}
          style={{ fill: "hsl(var(--studio-stage))", stroke: "hsl(var(--studio-line))" }}
          strokeWidth="2"
        />
        {entries.map((entry, i) => {
          const tone = SLICE_TONES[i % SLICE_TONES.length];
          const from = i * slice;
          const mid = from + slice / 2;
          const textR = r * 0.62;
          const a = (mid - 90) * (Math.PI / 180);
          return (
            <g key={`${entry}-${i}`}>
              <path
                d={wedge(r, r, r - 3, from, from + slice)}
                style={{ fill: TONE_VAR[tone].fill, stroke: "hsl(var(--studio-card))" }}
                strokeWidth="1.5"
              />
              <text
                x={r + textR * Math.cos(a)}
                y={r + textR * Math.sin(a)}
                transform={`rotate(${mid} ${r + textR * Math.cos(a)} ${r + textR * Math.sin(a)})`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fill: TONE_VAR[tone].ink,
                  fontSize: Math.max(9, Math.min(size * 0.055, (size * 1.6) / entries.length)),
                  fontWeight: 700,
                }}
              >
                {entry.length > 12 ? `${entry.slice(0, 11)}…` : entry}
              </text>
            </g>
          );
        })}
        <circle
          cx={r}
          cy={r}
          r={size * 0.08}
          style={{ fill: "hsl(var(--studio-card))", stroke: "hsl(var(--studio-line))" }}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function WheelSpinner() {
  const [raw, setRaw] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "Maya, Sam, Ari, Noor, Quinn, Jude";
  });
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const viewport = useViewport();
  const frameRef = useRef<number | null>(null);

  const entries = useMemo(() => parseEntries(raw), [raw]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, raw);
  }, [raw]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const spin = () => {
    if (entries.length < 2 || spinning) return;
    setWinner(null);
    setSpinning(true);

    const sliceAngle = 360 / entries.length;
    const finalAngle = angle + (6 + Math.random() * 2) * 360 + Math.random() * 360;
    const startAngle = angle;
    const delta = finalAngle - startAngle;
    const started = performance.now();
    const duration = 4200;
    let slicesPassed = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const current = startAngle + delta * eased;
      setAngle(current);

      const passed = Math.floor((current - startAngle) / sliceAngle);
      if (passed > slicesPassed) {
        if (t > 0.55 && passed - slicesPassed < 4) playClick();
        slicesPassed = passed;
      }

      if (t >= 1) {
        setSpinning(false);
        // The pointer is fixed at 12 o'clock; the wheel rotated `current`
        // degrees clockwise, so the pointer now sits over this angle on
        // the wheel's own scale.
        const pointerOnWheel = (((360 - (current % 360)) % 360) + 360) % 360;
        setWinner(entries[Math.floor(pointerOnWheel / sliceAngle) % entries.length]);
        playChime();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  };

  const removeWinner = () => {
    if (!winner) return;
    setRaw(entries.filter((e) => e !== winner).join(", "));
    setWinner(null);
  };

  return (
    <>
      <ToolCard
        icon={Disc3}
        tone="lilac"
        title="Spinner"
        description="One name, chosen where everyone can see it happen."
        action={<ClassScreenButton onClick={() => setProjecting(true)} />}
      >
        <Stage className="mb-4 min-h-[240px] py-4">
          {entries.length < 2 ? (
            <p className="px-6 text-center text-sm text-ink-faint">
              Add at least two names below.
            </p>
          ) : (
            <Wheel entries={entries} angle={angle} size={210} />
          )}
        </Stage>

        {winner && !spinning && (
          <div className="studio-pop mb-3 flex items-center justify-between gap-2 rounded-2xl bg-[hsl(var(--studio-ink))] px-4 py-2.5 text-[hsl(var(--studio-card))]">
            <span className="truncate">
              <span className="text-[0.6875rem] font-bold uppercase tracking-widest opacity-60">
                Picked
              </span>
              <span className="studio-title block truncate text-xl text-[hsl(var(--studio-card))]">
                {winner}
              </span>
            </span>
            <button
              type="button"
              onClick={removeWinner}
              aria-label={`Remove ${winner} from the wheel`}
              className="studio-focus shrink-0 rounded-full p-2 opacity-70 transition-opacity hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <ActionButton onClick={spin} disabled={spinning || entries.length < 2}>
          {spinning ? "Spinning…" : "Spin"}
        </ActionButton>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="studio-focus mt-3 self-start rounded-full px-1 text-xs font-semibold text-ink-faint underline-offset-4 hover:text-ink hover:underline"
        >
          {editing ? "Hide the list" : `Edit names (${entries.length})`}
        </button>
        {editing && (
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            placeholder="One name per line, or separated by commas"
            className="mt-2 resize-none rounded-2xl border-studio bg-studio-stage text-sm text-ink focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
      </ToolCard>

      <ClassScreen open={projecting} onClose={() => setProjecting(false)} title="Spinner">
        <div className="flex flex-col items-center gap-8">
          <Wheel
            entries={entries}
            angle={angle}
            size={Math.max(240, Math.min(viewport.w * 0.6, viewport.h * 0.62))}
          />
          {winner && !spinning && (
            <p className="studio-pop studio-title text-[clamp(2rem,7vw,4.5rem)] leading-none">
              {winner}
            </p>
          )}
          <div className="flex gap-3">
            <ActionButton
              onClick={spin}
              disabled={spinning || entries.length < 2}
              className={CLASS_SCREEN_ACTION}
            >
              {spinning ? "Spinning…" : "Spin"}
            </ActionButton>
            {winner && !spinning && (
              <QuietButton size="lg" onClick={removeWinner}>
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </QuietButton>
            )}
          </div>
        </div>
      </ClassScreen>
    </>
  );
}
