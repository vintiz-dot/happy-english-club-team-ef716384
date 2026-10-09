/**
 * Traffic light — the room's voice level, in one glance from the back.
 *
 * The lamps are the only fully saturated colour in the whole panel, which
 * is the point: here the colour *is* the message, so nothing else on
 * screen is allowed to compete with it.
 */
import { useState } from "react";
import { TrafficCone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Segmented,
  Stage,
  ToolCard,
} from "./studio/StudioKit";
import { ClassScreen, ClassScreenButton } from "./studio/ClassScreen";

type Light = "red" | "amber" | "green";

const LIGHTS: {
  id: Light;
  label: string;
  instruction: string;
  lit: string;
  glow: string;
}[] = [
  {
    id: "red",
    label: "Silent",
    instruction: "No talking — work on your own",
    lit: "hsl(2 72% 52%)",
    glow: "hsl(2 72% 52% / 0.55)",
  },
  {
    id: "amber",
    label: "Whisper",
    instruction: "Whisper voices only",
    lit: "hsl(38 92% 52%)",
    glow: "hsl(38 92% 52% / 0.55)",
  },
  {
    id: "green",
    label: "Talk",
    instruction: "Normal voices are fine",
    lit: "hsl(146 58% 42%)",
    glow: "hsl(146 58% 42% / 0.5)",
  },
];

function Housing({ active, size }: { active: Light; size: number }) {
  const lamp = size;
  return (
    // Fixed dark casing rather than --studio-ink: that token inverts in
    // dark mode, and a cream traffic light is not a traffic light.
    <div
      className="flex flex-col items-center gap-[12%] rounded-[2rem] p-[8%]"
      style={{ width: lamp * 1.52, background: "hsl(36 12% 13%)" }}
    >
      {LIGHTS.map((light) => {
        const on = light.id === active;
        return (
          <span
            key={light.id}
            aria-hidden
            className="rounded-full transition-all duration-300"
            style={{
              width: lamp,
              height: lamp,
              background: on ? light.lit : "hsl(0 0% 100% / 0.07)",
              boxShadow: on
                ? `0 0 ${lamp * 0.5}px ${light.glow}, inset 0 ${lamp * 0.06}px ${lamp * 0.1}px hsl(0 0% 100% / 0.45), inset 0 -${lamp * 0.08}px ${lamp * 0.14}px hsl(0 0% 0% / 0.3)`
                : `inset 0 ${lamp * 0.04}px ${lamp * 0.08}px hsl(0 0% 0% / 0.45)`,
            }}
          />
        );
      })}
    </div>
  );
}

export function TrafficLight() {
  const [active, setActive] = useState<Light>("green");
  const [projecting, setProjecting] = useState(false);
  const current = LIGHTS.find((l) => l.id === active)!;

  const picker = (
    <Segmented
      ariaLabel="Voice level"
      options={LIGHTS.map((l) => ({ value: l.id, label: l.label }))}
      value={active}
      onChange={(v) => setActive(v as Light)}
    />
  );

  return (
    <>
      <ToolCard
        icon={TrafficCone}
        tone="rose"
        title="Voice level"
        description="Set the expectation once; leave it on the board."
        action={<ClassScreenButton onClick={() => setProjecting(true)} />}
      >
        <Stage className="mb-4 min-h-[200px] py-5">
          <div className="flex items-center gap-5">
            <Housing active={active} size={40} />
            <div className="min-w-0">
              <p className="studio-title text-2xl">{current.label}</p>
              <p className="mt-1 max-w-[18ch] text-xs leading-snug text-ink-soft">
                {current.instruction}
              </p>
            </div>
          </div>
        </Stage>
        {picker}
      </ToolCard>

      <ClassScreen
        open={projecting}
        onClose={() => setProjecting(false)}
        title="Voice level"
      >
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-16">
          <Housing active={active} size={120} />
          <div className="text-center sm:text-left">
            <p className="studio-title text-[clamp(3rem,10vw,7rem)] leading-none">
              {current.label}
            </p>
            <p className="mt-4 text-xl text-ink-soft">{current.instruction}</p>
            <div className={cn("mt-8 max-w-sm")}>{picker}</div>
          </div>
        </div>
      </ClassScreen>
    </>
  );
}
