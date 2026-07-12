import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RotateCw, Trash2, Crown } from "lucide-react";
import { playClick, playChime } from "./audio";

const STORAGE_KEY = "classroom-wheel-entries";
const SLICE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899",
];

function parseEntries(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function WheelSpinner() {
  const [raw, setRaw] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) || "Maya, Sam, Ari, Noor, Quinn, Jude";
  });
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const animRef = useRef<number | null>(null);

  const entries = useMemo(() => parseEntries(raw), [raw]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, raw);
  }, [raw]);

  const sliceAngle = entries.length > 0 ? 360 / entries.length : 0;

  const spin = () => {
    if (entries.length < 2 || spinning) return;
    setWinner(null);
    setSpinning(true);

    const fullRotations = 6 + Math.random() * 2; // 6–8 full turns
    const randomExtra = Math.random() * 360;      // random landing position
    const finalAngle = angle + fullRotations * 360 + randomExtra;

    const start = performance.now();
    const startAngle = angle;
    const totalDelta = finalAngle - startAngle;
    const duration = 4500;

    let lastClickAt = 0;
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuart(t);
      const current = startAngle + totalDelta * eased;
      setAngle(current);

      // Tick sound as the wheel passes each slice boundary.
      const wholeSlicesPassed = Math.floor((current - startAngle) / sliceAngle);
      if (wholeSlicesPassed > lastClickAt) {
        const passes = wholeSlicesPassed - lastClickAt;
        if (t > 0.55 && passes < 4) playClick();
        lastClickAt = wholeSlicesPassed;
      }

      if (t >= 1) {
        setSpinning(false);
        // Determine winner from where the pointer actually landed.
        // The pointer is at the top (12 o'clock). The wheel is rotated by
        // `current` degrees clockwise. Slice i occupies the arc from
        // i * sliceAngle to (i+1) * sliceAngle, starting at 0° (top).
        // The pointer points at angle (360 - (current mod 360)) mod 360
        // relative to the wheel's zero.
        const pointerOnWheel = ((360 - (current % 360)) % 360 + 360) % 360;
        const idx = Math.floor(pointerOnWheel / sliceAngle) % entries.length;
        setWinner(entries[idx]);
        playChime();
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  const removeWinner = () => {
    if (!winner) return;
    const next = entries.filter((e) => e !== winner);
    setRaw(next.join(", "));
    setWinner(null);
  };

  return (
    <div className="space-y-5">
      <div className="relative mx-auto w-[280px] h-[280px]">
        {/* Ambient halo — brightens while spinning */}
        <div
          className="absolute inset-[-14px] rounded-full blur-2xl transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(217,70,239,0.35), rgba(59,130,246,0.35), rgba(16,185,129,0.35), rgba(250,204,21,0.35), rgba(217,70,239,0.35))",
            opacity: spinning ? 0.9 : 0.45,
          }}
        />
        {/* Conic bezel ring */}
        <div className="absolute inset-[-6px] rounded-full p-[3px] bg-[conic-gradient(from_120deg,#d946ef,#3b82f6,#10b981,#facc15,#d946ef)] shadow-q3 pointer-events-none">
          <div className="h-full w-full rounded-full bg-card/90 backdrop-blur-sm" />
        </div>

        {/* Pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <div className="h-9 w-6 rounded-b-full bg-gradient-to-b from-fuchsia-500 to-purple-600 shadow-[0_4px_12px_-2px_rgba(217,70,239,0.7)] ring-2 ring-white/70 dark:ring-white/30 [clip-path:polygon(0%_0%,100%_0%,50%_100%)]" />
        </div>

        <svg
          viewBox="-110 -110 220 220"
          className="relative w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning ? "none" : "transform 0.4s ease-out",
          }}
        >
          {entries.length === 0 ? (
            <circle r="100" fill="hsl(var(--muted))" />
          ) : entries.length === 1 ? (
            <>
              <circle r="100" fill={SLICE_COLORS[0]} />
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="white"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              >
                {entries[0].slice(0, 14)}
              </text>
            </>
          ) : (
            entries.map((entry, i) => {
              const startA = i * sliceAngle - 90; // start at top
              const endA = startA + sliceAngle;
              const path = describeSlice(0, 0, 100, startA, endA);
              const labelA = (startA + endA) / 2;
              const labelRad = (labelA * Math.PI) / 180;
              const lx = Math.cos(labelRad) * 65;
              const ly = Math.sin(labelRad) * 65;
              return (
                <g key={i}>
                  <path
                    d={path}
                    fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                    stroke="white"
                    strokeWidth="1"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="white"
                    transform={`rotate(${labelA + 90}, ${lx}, ${ly})`}
                    style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
                  >
                    {entry.slice(0, 12)}
                  </text>
                </g>
              );
            })
          )}
          {/* Gradient hub */}
          <defs>
            <radialGradient id="wheel-hub" cx="35%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </radialGradient>
          </defs>
          <circle r="16" fill="url(#wheel-hub)" stroke="white" strokeWidth="2.5" />
          <circle r="5" fill="#d946ef" opacity="0.85" />
        </svg>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          onClick={spin}
          disabled={entries.length < 2 || spinning}
          size="lg"
          className="gap-2 h-12 px-10 rounded-2xl text-base font-bold text-white bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-600 hover:to-indigo-600 shadow-[0_8px_24px_-6px_rgba(217,70,239,0.6)] lift"
        >
          {spinning ? <RotateCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {spinning ? "Spinning…" : "SPIN"}
        </Button>
      </div>

      {winner && !spinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative overflow-hidden rounded-2xl bg-aurora hero-sheen p-5 text-center space-y-1.5 text-white shadow-q3"
        >
          <div className="nova-grid-light absolute inset-0 pointer-events-none" />
          <p className="relative type-micro font-bold uppercase tracking-[0.2em] text-white/80 flex items-center justify-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            Winner
          </p>
          <p className="relative type-display drop-shadow-md">{winner}</p>
          <Button
            onClick={removeWinner}
            variant="ghost"
            size="sm"
            className="relative text-white/85 hover:text-white hover:bg-white/15"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Remove from wheel
          </Button>
        </motion.div>
      )}

      <div className="space-y-1">
        <label className="type-micro font-semibold flex items-center justify-between">
          <span>Entries</span>
          <Badge variant="outline" className="font-normal">
            {entries.length} / 50
          </Badge>
        </label>
        <Textarea
          rows={4}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste comma-separated names or words…"
          className="resize-none"
        />
        <p className="type-micro text-muted-foreground">
          Comma-separated or one per line. Saved automatically.
        </p>
      </div>
    </div>
  );
}

function describeSlice(cx: number, cy: number, r: number, startA: number, endA: number) {
  const start = polar(cx, cy, r, endA);
  const end = polar(cx, cy, r, startA);
  const largeArc = endA - startA <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${largeArc} 0 ${start.x} ${start.y} Z`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
