import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { playChime } from "./audio";

export function FocusChime() {
  const [pulses, setPulses] = useState(0);

  // Reset the visual pulse counter so it doesn't grow unbounded.
  useEffect(() => {
    if (pulses === 0) return;
    const t = setTimeout(() => setPulses(0), 1200);
    return () => clearTimeout(t);
  }, [pulses]);

  const ring = () => {
    playChime();
    setPulses((p) => p + 1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="type-h1">Focus Chime</h3>
        <p className="type-micro text-muted-foreground max-w-xs mx-auto">
          Play a calm bell to gather attention. Big tap target, no pop-ups.
        </p>
      </div>

      <div className="relative flex items-center justify-center py-6">
        {/* Concentric pulse rings; key flips on each tap so the animation re-fires. */}
        <span
          key={pulses}
          aria-hidden
          className={
            pulses > 0
              ? "absolute inline-block w-44 h-44 rounded-full border-4 border-amber-400/40 animate-ping"
              : "hidden"
          }
        />
        <span
          key={`b-${pulses}`}
          aria-hidden
          className={
            pulses > 0
              ? "absolute inline-block w-32 h-32 rounded-full border-4 border-amber-400/60 animate-ping"
              : "hidden"
          }
          style={{ animationDelay: "120ms" }}
        />

        <button
          type="button"
          onClick={ring}
          aria-label="Ring focus chime"
          className="relative h-36 w-36 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-q4 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        >
          <Bell className="h-14 w-14 mx-auto" strokeWidth={2.4} />
          <span className="absolute inset-x-0 bottom-6 type-h2 font-extrabold tracking-wide">
            RING
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-muted/40 p-3 type-micro text-center text-muted-foreground">
        Tip: chime fires when the timer hits zero too — same calm bell, no jump scare.
      </div>
    </div>
  );
}
