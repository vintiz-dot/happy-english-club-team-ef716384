/**
 * Focus chime — one calm bell to gather attention.
 *
 * Deliberately a single enormous target with no confirmation and no
 * settings: it gets pressed while the teacher is looking at the room,
 * not at the screen.
 */
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import { playChime } from "./audio";

export function FocusChime() {
  const [pulses, setPulses] = useState(0);

  // Reset so the counter cannot grow unbounded over a long lesson.
  useEffect(() => {
    if (pulses === 0) return;
    const t = window.setTimeout(() => setPulses(0), 1400);
    return () => window.clearTimeout(t);
  }, [pulses]);

  return (
    <ToolCard
      icon={Bell}
      tone="butter"
      title="Chime"
      description="A soft bell for attention — no shouting required."
    >
      <Stage className="min-h-[200px] py-6">
        <div className="relative grid place-items-center">
          {pulses > 0 && (
            <>
              <span
                key={`a-${pulses}`}
                aria-hidden
                className="absolute h-36 w-36 animate-ping rounded-full border-2 border-[hsl(var(--studio-butter-ink)/0.35)]"
              />
              <span
                key={`b-${pulses}`}
                aria-hidden
                className="absolute h-28 w-28 animate-ping rounded-full border-2 border-[hsl(var(--studio-butter-ink)/0.5)]"
                style={{ animationDelay: "140ms" }}
              />
            </>
          )}
          <button
            type="button"
            onClick={() => {
              playChime();
              setPulses((p) => p + 1);
            }}
            aria-label="Ring the chime"
            className="studio-focus relative grid h-32 w-32 place-items-center rounded-full transition-transform active:scale-95"
            style={{
              background:
                "radial-gradient(circle at 36% 28%, hsl(0 0% 100% / 0.6), transparent 52%), linear-gradient(155deg, hsl(var(--studio-butter)), hsl(var(--studio-clay)))",
              boxShadow:
                "inset 0 2px 2px hsl(0 0% 100% / 0.6), inset 0 -8px 16px hsl(34 40% 40% / 0.28), 0 14px 28px -14px hsl(34 40% 30% / 0.5)",
            }}
          >
            <Bell
              className="h-12 w-12 text-[hsl(var(--studio-butter-ink))]"
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        </div>
      </Stage>
      <p className="mt-3 text-center text-xs text-ink-faint">
        The timer rings this same bell when it runs out.
      </p>
    </ToolCard>
  );
}
