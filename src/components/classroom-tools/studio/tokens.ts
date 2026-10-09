/**
 * Studio tokens — the palette, in the two forms components need it.
 *
 * Split out of StudioKit so that file exports components only: mixing
 * constants and components in one module breaks React Fast Refresh for
 * everything in it, which is exactly the file you edit most while
 * designing.
 */
import { cn } from "@/lib/utils";

/** Shared sizing for the big primary button on a projected tool. */
export const CLASS_SCREEN_ACTION =
  "w-auto h-14 px-12 text-lg sm:h-16 sm:px-20 sm:text-2xl";

/* ------------------------------------------------------------------ tones */

export type StudioTone = "sage" | "clay" | "sky" | "butter" | "lilac" | "rose";

const TONE_FILL: Record<StudioTone, string> = {
  sage: "bg-[hsl(var(--studio-sage))] text-[hsl(var(--studio-sage-ink))]",
  clay: "bg-[hsl(var(--studio-clay))] text-[hsl(var(--studio-clay-ink))]",
  sky: "bg-[hsl(var(--studio-sky))] text-[hsl(var(--studio-sky-ink))]",
  butter: "bg-[hsl(var(--studio-butter))] text-[hsl(var(--studio-butter-ink))]",
  lilac: "bg-[hsl(var(--studio-lilac))] text-[hsl(var(--studio-lilac-ink))]",
  rose: "bg-[hsl(var(--studio-rose))] text-[hsl(var(--studio-rose-ink))]",
};

/** Raw `hsl(var(--…))` strings, for SVG fills and inline gradients. */
export const TONE_VAR: Record<StudioTone, { fill: string; ink: string }> = {
  sage: { fill: "hsl(var(--studio-sage))", ink: "hsl(var(--studio-sage-ink))" },
  clay: { fill: "hsl(var(--studio-clay))", ink: "hsl(var(--studio-clay-ink))" },
  sky: { fill: "hsl(var(--studio-sky))", ink: "hsl(var(--studio-sky-ink))" },
  butter: { fill: "hsl(var(--studio-butter))", ink: "hsl(var(--studio-butter-ink))" },
  lilac: { fill: "hsl(var(--studio-lilac))", ink: "hsl(var(--studio-lilac-ink))" },
  rose: { fill: "hsl(var(--studio-rose))", ink: "hsl(var(--studio-rose-ink))" },
};

export function toneClass(tone: StudioTone) {
  return TONE_FILL[tone];
}

/**
 * Resolve a tone to literal `hsl(…)` strings.
 *
 * SVG honours `hsl(var(--x))`, but a <canvas> 2D context does not — it
 * resolves nothing and silently paints transparent black. Anything drawn
 * imperatively has to read the custom property itself. Call this outside
 * the animation loop: `getComputedStyle` forces a style recalc.
 */
export function readTone(tone: StudioTone): { fill: string; ink: string } {
  if (typeof window === "undefined") return { fill: "#cbd5d1", ink: "#223" };
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const raw = style.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return {
    fill: read(`--studio-${tone}`, "#cbd5d1"),
    ink: read(`--studio-${tone}-ink`, "#223"),
  };
}

/** Same, for the neutral ink/paper pair. */
export function readInk(): { ink: string; paper: string; line: string } {
  if (typeof window === "undefined")
    return { ink: "#1d1b17", paper: "#faf8f1", line: "#e4ded0" };
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const raw = style.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return {
    ink: read("--studio-ink", "#1d1b17"),
    paper: read("--studio-card", "#faf8f1"),
    line: read("--studio-line", "#e4ded0"),
  };
}
