/**
 * Dice — real 3D dice, cut from bone rather than neon.
 *
 * Each die is a CSS cube (preserve-3d, six faces) that framer-motion
 * tumbles through several full rotations before landing with the rolled
 * face front. Opposite faces sum to 7, like physical dice.
 *
 * The pips are carved rather than printed: a recessed well, a shadow on
 * the inside of the top edge and a highlight on the bottom. At the size a
 * die renders on a projector that difference is the whole illusion, and it
 * costs two extra SVG circles per pip.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import {
  ActionButton,
  Segmented,
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { CLASS_SCREEN_ACTION } from "./studio/tokens";
import { useViewport } from "./studio/useViewport";
import { playClick } from "./audio";

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
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

const COUNT_OPTIONS = [
  { value: "1", label: "One die" },
  { value: "2", label: "Two dice" },
  { value: "3", label: "Three" },
] as const;

interface DieState {
  value: number;
  rx: number;
  ry: number;
}

function Face({ value, size }: { value: number; size: number }) {
  const half = size / 2;
  const pips = DOT_POSITIONS[value];
  const r = value === 1 ? 11 : 9;
  return (
    <div
      className="absolute inset-0 rounded-[18%]"
      style={{
        transform: `${FACE_TRANSFORMS[value]} translateZ(${half}px)`,
        backfaceVisibility: "hidden",
        background:
          "linear-gradient(160deg, hsl(44 48% 99%) 0%, hsl(42 34% 95%) 55%, hsl(38 24% 89%) 100%)",
        boxShadow:
          "inset 0 2px 1px hsl(0 0% 100% / 0.9), inset 0 -3px 6px hsl(34 30% 60% / 0.35), inset 0 0 0 1px hsl(36 24% 82% / 0.9)",
      }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {pips.map(([cx, cy], i) => (
          <g key={i}>
            {/* well */}
            <circle cx={cx} cy={cy} r={r} fill="hsl(10 42% 30%)" />
            {/* shadow cast by the lip, top-left */}
            <circle cx={cx - 0.7} cy={cy - 0.9} r={r} fill="hsl(10 48% 21%)" />
            {/* the pip itself, lifted off the shadow */}
            <circle cx={cx} cy={cy} r={r - 1.1} fill="hsl(8 46% 34%)" />
            {/* specular catch, bottom-right of the well */}
            <circle
              cx={cx + r * 0.3}
              cy={cy + r * 0.34}
              r={r * 0.3}
              fill="hsl(20 60% 62%)"
              opacity="0.5"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Die({ die, size, delay }: { die: DieState; size: number; delay: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        animate={{ rotateX: die.rx, rotateY: die.ry }}
        transition={{ duration: 1.2, delay, ease: [0.18, 0.86, 0.26, 1] }}
        style={{ width: size, height: size, transformStyle: "preserve-3d" }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <Face key={face} value={face} size={size} />
        ))}
      </motion.div>
    </div>
  );
}

function DiceStage({
  dice,
  size,
  rolling,
}: {
  dice: DieState[];
  size: number;
  rolling: boolean;
}) {
  return (
    <div
      className="flex items-end justify-center"
      style={{ perspective: `${size * 11}px`, gap: size * 0.32 }}
    >
      {dice.map((d, i) => (
        <div key={i} className="flex flex-col items-center">
          <Die die={d} size={size} delay={i * 0.07} />
          {/* contact shadow — the die's only tie to the surface it sits on */}
          <div
            className="rounded-[50%] transition-all duration-500"
            style={{
              width: size * (rolling ? 0.5 : 0.82),
              height: size * 0.12,
              marginTop: size * 0.1,
              background: "hsl(34 30% 30%)",
              opacity: rolling ? 0.1 : 0.22,
              filter: `blur(${size * 0.055}px)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function DiceRoller() {
  const [count, setCount] = useState(1);
  const [dice, setDice] = useState<DieState[]>([{ value: 1, rx: 0, ry: 0 }]);
  const [rolling, setRolling] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const viewport = useViewport();

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    playClick();

    setDice((prev) =>
      Array.from({ length: count }, (_, i) => {
        const value = Math.ceil(Math.random() * 6);
        const target = TARGET_ROTATION[value];
        const prevDie = prev[i] ?? { rx: 0, ry: 0 };
        // 2–4 extra full tumbles on each axis, always forward, so the cube
        // visibly spins instead of taking the shortest path back.
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
    }, 1250);
  };

  const setDiceCount = (n: number) => {
    setCount(n);
    setDice((prev) =>
      Array.from({ length: n }, (_, i) => prev[i] ?? { value: 1, rx: 0, ry: 0 }),
    );
  };

  const total = useMemo(() => dice.reduce((a, d) => a + d.value, 0), [dice]);

  return (
    <>
      <ToolCard
        icon={Dices}
        tone="clay"
        title="Dice"
        description="One die or two, big enough to read from the back row."
        action={<ClassScreenButton onClick={() => setProjecting(true)} />}
      >
        <Stage className="mb-4 min-h-[180px] px-4 py-6">
          <DiceStage dice={dice} size={92} rolling={rolling} />
          {count > 1 && !rolling && (
            <span
              key={total}
              className="studio-pop absolute right-3 top-3 rounded-full bg-[hsl(var(--studio-ink))] px-3 py-1 text-xs font-bold tabular-nums text-[hsl(var(--studio-card))]"
            >
              {total}
            </span>
          )}
        </Stage>

        <Segmented
          ariaLabel="How many dice"
          className="mb-3"
          size="sm"
          options={COUNT_OPTIONS}
          value={String(count) as "1" | "2" | "3"}
          onChange={(v) => setDiceCount(Number(v))}
          disabled={rolling}
        />

        <ActionButton onClick={roll} disabled={rolling}>
          {rolling ? "Rolling…" : "Roll!"}
        </ActionButton>
      </ToolCard>

      <ClassScreen open={projecting} onClose={() => setProjecting(false)} title="Dice">
        <div className="flex flex-col items-center gap-10">
          <DiceStage
            dice={dice}
            size={Math.max(120, Math.min(viewport.h * 0.38, viewport.w / (count + 1.2)))}
            rolling={rolling}
          />
          {count > 1 && (
            <p className="studio-title text-4xl tabular-nums">
              {rolling ? "…" : `Total ${total}`}
            </p>
          )}
          <ActionButton onClick={roll} disabled={rolling} className={CLASS_SCREEN_ACTION}>
            {rolling ? "Rolling…" : "Roll!"}
          </ActionButton>
        </div>
      </ClassScreen>
    </>
  );
}
