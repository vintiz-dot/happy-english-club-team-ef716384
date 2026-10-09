/**
 * Pick a number — and, next to it, a coin.
 *
 * "Up to / in steps of" rather than "min / max". Teachers were setting a
 * minimum of 1 every single time; the only number that ever changed was
 * the top one. The step exists because the real uses are page numbers and
 * exercise numbers, which come in fives and tens.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDollarSign, HelpCircle } from "lucide-react";
import {
  ActionButton,
  Stage,
  Stepper,
  ToolCard,
} from "./studio/StudioKit";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";
import { CLASS_SCREEN_ACTION } from "./studio/tokens";
import { playChime, playClick } from "./audio";

function Numeral({ value, size }: { value: number | null; size: "card" | "screen" }) {
  const cls =
    size === "card"
      ? "text-[4.5rem] leading-none"
      : "text-[clamp(8rem,34vw,22rem)] leading-none";
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value ?? "none"}
        initial={{ opacity: 0, y: 14, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.9 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className={`studio-title tabular-nums ${cls}`}
      >
        {value ?? "?"}
      </motion.span>
    </AnimatePresence>
  );
}

export function RandomPicker() {
  const [max, setMax] = useState(50);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const timerRef = useRef<number | null>(null);

  // A tab closed mid-spin used to leave the interval running against an
  // unmounted component.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  const draw = () => {
    const buckets = Math.max(1, Math.floor(max / step));
    return (1 + Math.floor(Math.random() * buckets)) * step;
  };

  const pick = () => {
    if (picking) return;
    setPicking(true);
    playClick();

    let ticks = 0;
    timerRef.current = window.setInterval(() => {
      ticks += 1;
      setResult(draw());
      if (ticks >= 11) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setPicking(false);
        playChime();
      }
    }, 70);
  };

  return (
    <>
      <ToolCard
        icon={HelpCircle}
        tone="sky"
        title="Pick a number"
        description="A random number — for turns, pages or questions."
        action={<ClassScreenButton onClick={() => setProjecting(true)} />}
      >
        <Stage className="mb-4 min-h-[180px]">
          <Numeral value={result} size="card" />
        </Stage>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Stepper label="Up to" value={max} onChange={setMax} min={2} max={999} />
          <Stepper
            label="In steps of"
            value={step}
            onChange={setStep}
            min={1}
            max={10}
          />
        </div>

        <ActionButton onClick={pick} disabled={picking}>
          {picking ? "Picking…" : "Pick a number"}
        </ActionButton>
      </ToolCard>

      <ClassScreen
        open={projecting}
        onClose={() => setProjecting(false)}
        title="Pick a number"
      >
        <div className="flex flex-col items-center gap-8">
          <Numeral value={result} size="screen" />
          <ActionButton onClick={pick} disabled={picking} className={CLASS_SCREEN_ACTION}>
            {picking ? "Picking…" : "Pick a number"}
          </ActionButton>
        </div>
      </ClassScreen>
    </>
  );
}

/* ------------------------------------------------------------------ coin */

const FACES = {
  heads: { label: "Heads", glyph: "★", tone: "hsl(42 72% 56%)", rim: "hsl(38 60% 42%)" },
  tails: { label: "Tails", glyph: "✿", tone: "hsl(32 18% 72%)", rim: "hsl(32 14% 54%)" },
} as const;

type CoinFace = keyof typeof FACES;

function CoinDisc({ face, spinning, size }: { face: CoinFace | null; spinning: boolean; size: number }) {
  const f = FACES[face ?? "heads"];
  return (
    <motion.div
      animate={spinning ? { rotateY: 1440 } : { rotateY: 0 }}
      transition={{ duration: spinning ? 1 : 0.4, ease: "easeOut" }}
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
      className="relative grid place-items-center rounded-full"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 34% 28%, hsl(0 0% 100% / 0.75), transparent 48%), linear-gradient(150deg, ${f.tone}, ${f.rim})`,
          boxShadow: `inset 0 0 0 ${size * 0.055}px hsl(0 0% 100% / 0.25), inset 0 -${size * 0.05}px ${size * 0.1}px hsl(0 0% 0% / 0.2), 0 ${size * 0.06}px ${size * 0.12}px -${size * 0.05}px hsl(34 30% 30% / 0.35)`,
        }}
      />
      <span
        className="relative select-none font-studio"
        style={{ fontSize: size * 0.42, color: "hsl(0 0% 100% / 0.92)" }}
        aria-hidden
      >
        {face ? f.glyph : "?"}
      </span>
    </motion.div>
  );
}

export function CoinFlip() {
  const [face, setFace] = useState<CoinFace | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flip = () => {
    if (spinning) return;
    setSpinning(true);
    playClick();
    timerRef.current = window.setTimeout(() => {
      setFace(Math.random() < 0.5 ? "heads" : "tails");
      setSpinning(false);
      playChime();
      timerRef.current = null;
    }, 1000);
  };

  return (
    <ToolCard
      icon={CircleDollarSign}
      tone="butter"
      title="Coin"
      description="Heads or tails — who goes first, which team starts."
    >
      <Stage className="mb-4 min-h-[180px]" style={{ perspective: "700px" }}>
        <div className="flex flex-col items-center gap-3">
          <CoinDisc face={face} spinning={spinning} size={96} />
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">
            {spinning ? "…" : face ? FACES[face].label : "Ready"}
          </span>
        </div>
      </Stage>
      <ActionButton onClick={flip} disabled={spinning}>
        {spinning ? "Flipping…" : "Flip the coin"}
      </ActionButton>
    </ToolCard>
  );
}
