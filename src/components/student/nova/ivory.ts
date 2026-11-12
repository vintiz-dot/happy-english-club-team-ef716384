/**
 * Shared class strings and the one entrance motion for the student dashboard
 * in the "Ivory" design system (docs/DESIGN_SYSTEM.md). Presentation only:
 * these names resolve only inside an element carrying data-hec-theme="ivory".
 */

/** The focus ring of the system (section 10). */
export const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

/** Card recipe (section 15). Young scale (Grades 1-3) gets the warm honey surface. */
export const CARD =
  "rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6";

/** Same card with the honey surface for the young scale; used for the warmest surfaces only. */
export const WARM_CARD = `${CARD} [[data-hec-scale=young]_&]:bg-hec-honey`;

/** Card title: the refined serif. Bold in the young scale (section 4). */
export const CARD_TITLE =
  "font-display text-hec-h2 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold";

/** Small uppercase English label (section 4: only on short English labels). */
export const LABEL = "text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft";

/** Badges (section 15). */
export const BADGE = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-hec-caption font-medium";
export const BADGE_NEUTRAL = `${BADGE} border-hec-line bg-hec-sunken text-hec-ink-soft`;
export const BADGE_SUCCESS = `${BADGE} border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf`;
export const BADGE_WARN = `${BADGE} border-hec-warn/30 bg-hec-warn-tint text-hec-warn`;
export const BADGE_DANGER = `${BADGE} border-hec-danger/30 bg-hec-danger-tint text-hec-danger`;
export const BADGE_BRASS = `${BADGE} border-hec-brass/40 bg-transparent text-hec-brass`;

/** Button base + variants (section 15). */
export const BUTTON =
  `inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 rounded-hec-md px-6 text-hec-body font-medium transition-colors duration-hec-1 ease-hec disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
export const BUTTON_SECONDARY = `${BUTTON} border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken`;
export const BUTTON_QUIET = `${BUTTON} text-hec-ink hover:bg-hec-sunken`;
export const BUTTON_BRASS = `${BUTTON} bg-hec-brass-fill text-hec-on-brass hover:bg-hec-brass-fill/90`;

/**
 * One quiet entrance: opacity and an 8 px rise, 240 ms, the system's easing
 * (section 9). Under reduced motion there is no entrance at all.
 * Pass the result of framer-motion's useReducedMotion().
 */
export function entrance(reduce: boolean | null, delay = 0) {
  if (reduce) return { initial: false as const };
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const, delay },
  };
}
