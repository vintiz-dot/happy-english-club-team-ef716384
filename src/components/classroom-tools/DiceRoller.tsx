import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dices } from "lucide-react";
import { playClick } from "./audio";

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

const DICE_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-sky-600",
  "from-emerald-500 to-teal-600",
];

function DiceFace({ value, color, rolling }: { value: number; color: string; rolling: boolean }) {
  const dots = DOT_POSITIONS[value] || DOT_POSITIONS[1];
  return (
    <div
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${color} shadow-lg ${
        rolling ? "animate-bounce" : "transition-transform hover:scale-105"
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="10"
            fill="white"
            className="drop-shadow-sm"
          />
        ))}
      </svg>
    </div>
  );
}

export function DiceRoller() {
  const [count, setCount] = useState(1);
  const [values, setValues] = useState<number[]>([1]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    playClick();

    // Animate through random values
    let ticks = 0;
    const maxTicks = 8;
    const interval = setInterval(() => {
      ticks++;
      setValues(Array.from({ length: count }, () => Math.ceil(Math.random() * 6)));
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setRolling(false);
        playClick();
      }
    }, 80);
  };

  const setDiceCount = (n: number) => {
    setCount(n);
    setValues(Array.from({ length: n }, () => 1));
  };

  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="type-h1">Dice Roller</h3>
        <p className="type-micro text-muted-foreground">
          Roll 1–3 dice for vocabulary games, sentence building, or math warm-ups.
        </p>
      </div>

      {/* Dice count selector */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <Button
            key={n}
            variant={count === n ? "default" : "outline"}
            size="sm"
            className="h-10 w-14 font-bold"
            onClick={() => setDiceCount(n)}
            disabled={rolling}
          >
            {n}🎲
          </Button>
        ))}
      </div>

      {/* Dice display */}
      <div className="flex items-center justify-center gap-3 py-4">
        {values.map((v, i) => (
          <DiceFace
            key={i}
            value={v}
            color={DICE_COLORS[i % DICE_COLORS.length]}
            rolling={rolling}
          />
        ))}
      </div>

      {/* Total */}
      {count > 1 && !rolling && (
        <div className="text-center">
          <Badge variant="secondary" className="text-lg px-4 py-1.5 font-bold">
            Total: {total}
          </Badge>
        </div>
      )}

      {/* Roll button */}
      <div className="flex justify-center">
        <Button
          onClick={roll}
          disabled={rolling}
          size="lg"
          className="gap-2 h-12 px-8 bg-gradient-to-br from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600"
        >
          <Dices className="h-5 w-5" />
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
