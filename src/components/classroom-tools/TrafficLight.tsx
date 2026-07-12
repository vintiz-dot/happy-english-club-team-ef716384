import { useState } from "react";
import { Button } from "@/components/ui/button";

type Light = "red" | "yellow" | "green";

const LIGHTS: { id: Light; emoji: string; label: string; instruction: string; ring: string; bg: string; glow: string }[] = [
  {
    id: "red",
    emoji: "🔴",
    label: "Stop",
    instruction: "Silent work — no talking",
    ring: "ring-red-500",
    bg: "bg-red-500",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.6)]",
  },
  {
    id: "yellow",
    emoji: "🟡",
    label: "Whisper",
    instruction: "Whisper voices only",
    ring: "ring-amber-400",
    bg: "bg-amber-400",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.6)]",
  },
  {
    id: "green",
    emoji: "🟢",
    label: "Talk",
    instruction: "Normal voices OK",
    ring: "ring-emerald-500",
    bg: "bg-emerald-500",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.6)]",
  },
];

export function TrafficLight() {
  const [active, setActive] = useState<Light>("green");

  const activeLight = LIGHTS.find((l) => l.id === active)!;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="type-h1">Traffic Light</h3>
        <p className="type-micro text-muted-foreground">
          Visual voice-level signal. Tap a light to set the class expectation.
        </p>
      </div>

      {/* Traffic light body */}
      <div className="flex justify-center">
        <div className="bg-gray-900 dark:bg-gray-800 rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl">
          {LIGHTS.map((light) => {
            const isActive = light.id === active;
            return (
              <button
                key={light.id}
                type="button"
                onClick={() => setActive(light.id)}
                className={`
                  block w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto transition-all duration-300
                  ${isActive ? `${light.bg} ${light.glow} scale-110` : "bg-gray-700 opacity-40 hover:opacity-60"}
                  focus-visible:outline-none focus-visible:ring-4 ${light.ring}
                  active:scale-95
                `}
                aria-label={`Set ${light.label}`}
                aria-pressed={isActive}
              />
            );
          })}
        </div>
      </div>

      {/* Active state label */}
      <div className="text-center space-y-1">
        <p className="text-4xl">{activeLight.emoji}</p>
        <p className="type-h2 font-bold">{activeLight.label}</p>
        <p className="type-micro text-muted-foreground">{activeLight.instruction}</p>
      </div>

      {/* Quick switch buttons */}
      <div className="flex items-center justify-center gap-2">
        {LIGHTS.map((light) => (
          <Button
            key={light.id}
            variant={light.id === active ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-10"
            onClick={() => setActive(light.id)}
          >
            {light.emoji} {light.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl bg-muted/40 p-3 type-micro text-muted-foreground">
        <strong>Tip:</strong> Project on the board during group work. Students self-regulate
        voice levels based on the colour. Pair with the Noise Meter for data-backed feedback.
      </div>
    </div>
  );
}
