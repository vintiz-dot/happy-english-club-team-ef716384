import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Hash, RefreshCw } from "lucide-react";
import { playChime, playClick } from "./audio";

export function RandomPicker() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(30);
  const [result, setResult] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  // Coin flip
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [flipping, setFlipping] = useState(false);

  const pick = () => {
    if (picking) return;
    setPicking(true);
    playClick();

    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    let ticks = 0;
    const maxTicks = 10;
    const interval = setInterval(() => {
      ticks++;
      setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setPicking(false);
        playChime();
      }
    }, 70);
  };

  const flipCoin = () => {
    if (flipping) return;
    setFlipping(true);
    playClick();

    let ticks = 0;
    const maxTicks = 8;
    const interval = setInterval(() => {
      ticks++;
      setCoinResult(Math.random() < 0.5 ? "heads" : "tails");
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setFlipping(false);
        playChime();
      }
    }, 90);
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="type-h1">Random Picker</h3>
        <p className="type-micro text-muted-foreground">
          Pick a random number or flip a coin. Use class numbers to choose students fairly.
        </p>
      </div>

      {/* Number Picker */}
      <div className="rounded-2xl border-2 p-4 space-y-4">
        <h4 className="font-bold text-sm flex items-center gap-1.5">
          <Hash className="h-4 w-4" /> Pick a Number
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(Number(e.target.value) || 1)}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(Number(e.target.value) || 1)}
              className="h-10"
            />
          </div>
        </div>

        {/* Result display */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shadow-lg ${
              picking ? "animate-pulse" : ""
            }`}
          >
            <span className="text-white font-black text-4xl tabular-nums">
              {result ?? "?"}
            </span>
          </div>
        </div>

        <Button
          onClick={pick}
          disabled={picking}
          className="w-full h-11 gap-2 bg-gradient-to-br from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600"
        >
          <RefreshCw className={`h-4 w-4 ${picking ? "animate-spin" : ""}`} />
          {picking ? "Picking…" : "Pick Number"}
        </Button>
      </div>

      {/* Coin Flip */}
      <div className="rounded-2xl border-2 p-4 space-y-4">
        <h4 className="font-bold text-sm">🪙 Coin Flip</h4>

        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg text-5xl select-none ${
              flipping ? "animate-spin" : ""
            } ${
              coinResult === "heads"
                ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                : coinResult === "tails"
                ? "bg-gradient-to-br from-slate-400 to-gray-500"
                : "bg-gradient-to-br from-amber-400 to-yellow-500"
            }`}
          >
            {coinResult === "heads" ? "👑" : coinResult === "tails" ? "🛡️" : "🪙"}
          </div>
          {coinResult && !flipping && (
            <Badge
              variant="secondary"
              className="text-base px-4 py-1 font-bold uppercase tracking-wider"
            >
              {coinResult}
            </Badge>
          )}
        </div>

        <Button
          onClick={flipCoin}
          disabled={flipping}
          variant="outline"
          className="w-full h-11 gap-2 font-bold"
        >
          🪙 {flipping ? "Flipping…" : "Flip Coin"}
        </Button>
      </div>

      <div className="rounded-xl bg-muted/40 p-3 type-micro text-muted-foreground">
        <strong>Ideas:</strong> Set min/max to your class size to pick student numbers.
        Flip a coin for yes/no decisions, team splits, or "who goes first?"
      </div>
    </div>
  );
}
