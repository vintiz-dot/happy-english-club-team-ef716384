/**
 * DiceRoller — real 3D dice.
 *
 * Each die is a CSS cube (preserve-3d, six faces) that framer-motion
 * tumbles through multiple full rotations before landing with the rolled
 * face front. Opposite faces sum to 7, like physical dice.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { AnimatedNumber } from "@/components/fx/AnimatedNumber";
import { playClick } from "./audio";

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

// Cube layout: front=1, back=6, right=3, left=4, top=5, bottom=2.
const FACE_TRANSFORMS: Record<number, string> = {
  1: "rotateY(0deg)",
  6: "rotateY(180deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  5: "rotateX(90deg)",
  2: "rotateX(-90deg)",
};

// Rotation that brings each face to the front of the cube.
const TARGET_ROTATION: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  6: { rx: 0, ry: 180 },
  3: { rx: 0, ry: -90 },
  4: { rx: 0, ry: 90 },
  5: { rx: -90, ry: 0 },
  2: { rx: 90, ry: 0 },
};

const DICE_SKINS = [
  { face: "linear-gradient(135deg, #3b82f6, #4f46e5)", glow: "rgba(59,130,246,0.45)" },
  { face: "linear-gradient(135deg, #f43f5e, #db2777)", glow: "rgba(244,63,94,0.45)" },
  { face: "linear-gradient(135deg, #10b981, #0d9488)", glow: "rgba(16,185,129,0.45)" },
];

const SIZE = 84; // px
const HALF = SIZE / 2;

function Face({ value, gradient }: { value: number; gradient: string }) {
  const dots = DOT_POSITIONS[value];
  return (
    <div
      className="absolute inset-0 rounded-2xl ring-1 ring-white/25"
      style={{
        background: gradient,
        transform: `${FACE_TRANSFORMS[value]} translateZ(${HALF}px)`,
        backfaceVisibility: "hidden",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -6px 12px rgba(0,0,0,0.18)",
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9.5" fill="white" opacity="0.95" />
        ))}
      </svg>
    </div>
  );
}

interface DieState {
  value: number;
  rx: number;
  ry: number;
}

export function DiceRoller() {
  const [count, setCount] = useState(1);
  const [dice, setDice] = useState<DieState[]>([{ value: 1, rx: 0, ry: 0 }]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    playClick();

    setDice((prev) =>
      Array.from({ length: count }, (_, i) => {
        const value = Math.ceil(Math.random() * 6);
        const target = TARGET_ROTATION[value];
        const prevDie = prev[i] ?? { rx: 0, ry: 0 };
        // 2-4 extra full tumbles on each axis, always moving forward so the
        // cube visibly spins instead of taking the shortest path back.
        const spinsX = (2 + Math.floor(Math.random() * 3)) * 360;
        const spinsY = (2 + Math.floor(Math.random() * 3)) * 360;
        return {
          value,
          rx: Math.ceil((prevDie.rx + spinsX) / 360) * 360 + target.rx,
          ry: Math.ceil((prevDie.ry + spinsY) / 360) * 360 + target.ry,
        };
      }),
    );

    window.setTimeout(() => {
      setRolling(false);
      playClick();
    }, 1300);
  };

  const setDiceCount = (n: number) => {
    setCount(n);
    setDice(Array.from({ length: n }, (_, i) => dice[i] ?? { value: 1, rx: 0, ry: 0 }));
  };

  const total = dice.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h3 className="type-h1">Dice Roller</h3>
        <p className="type-micro text-muted-foreground">
          Roll 1–3 dice for vocabulary games, sentence building, or math warm-ups.
        </p>
      </div>

      {/* Dice count selector */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setDiceCount(n)}
            disabled={rolling}
            className={
              count === n
                ? "h-10 w-14 rounded-xl font-bold text-white bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_4px_14px_-4px_rgba(244,63,94,0.6)] scale-105 transition-all"
                : "h-10 w-14 rounded-xl font-bold bg-muted/60 text-muted-foreground hover:bg-muted transition-all"
            }
          >
            {n}🎲
          </button>
        ))}
      </div>

      {/* 3D dice stage */}
      <div
        className="flex items-center justify-center gap-6 py-6"
        style={{ perspective: "900px" }}
      >
        {dice.map((d, i) => {
          const skin = DICE_SKINS[i % DICE_SKINS.length];
          return (
            <div key={i} className="relative">
              {/* floor glow */}
              <div
                className="absolute left-1/2 -bottom-4 h-3 w-16 -translate-x-1/2 rounded-full blur-md transition-opacity"
                style={{ background: skin.glow, opacity: rolling ? 0.25 : 0.6 }}
              />
              <motion.div
                animate={{ rotateX: d.rx, rotateY: d.ry }}
                transition={{ duration: 1.25, delay: i * 0.08, ease: [0.2, 0.85, 0.3, 1] }}
                style={{
                  width: SIZE,
                  height: SIZE,
                  transformStyle: "preserve-3d",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((face) => (
                  <Face key={face} value={face} gradient={skin.face} />
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      {count > 1 && (
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-r from-rose-500/15 to-red-500/10 ring-1 ring-rose-500/25 px-5 py-1.5 text-lg font-black text-rose-600 dark:text-rose-300 tabular-nums">
            Total: {rolling ? "…" : <AnimatedNumber value={total} duration={500} />}
          </div>
        </div>
      )}

      {/* Roll button */}
      <div className="flex justify-center">
        <Button
          onClick={roll}
          disabled={rolling}
          size="lg"
          className="gap-2 h-12 px-10 rounded-2xl text-base font-bold text-white bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-[0_8px_24px_-6px_rgba(244,63,94,0.6)] lift"
        >
          <Dices className={rolling ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
          {rolling ? "Rolling…" : "ROLL"}
        </Button>
      </div>

      <div className="rounded-xl bg-muted/40 p-3 type-micro text-muted-foreground">
        <strong>Ideas:</strong> Roll to pick a question number, decide how many words to write,
        or use as a math warm-up. Combine with the Spinner for extra fun!
      </div>
    </div>
  );
}
