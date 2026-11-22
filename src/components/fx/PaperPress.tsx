/**
 * PaperPress - the press state of paper: it settles to 0.98 and its shadow
 * drops from hec-2 to hec-1, then springs back (DESIGN_SYSTEM s.9b).
 *
 * `pressable` is a class string, added to any card or button that can be
 * pressed. The shadow is not animated directly (budget, B4): a pseudo-element
 * that carries hec-2 fades out on press, so only opacity and transform move.
 * Put it on an element WITHOUT overflow-hidden (the shadow lies outside the
 * box). It keeps working at motion level "calm"; at "off" nothing scales or
 * fades. Pair it with the element's own `shadow-hec-1` at rest.
 */
export const pressable = [
  "relative",
  "transition-transform duration-hec-1 ease-hec",
  "motion-safe:active:scale-[0.98] [[data-hec-motion=off]_&]:active:scale-100",
  // the hover shadow lives on a pseudo-element that fades, and fades back out on press
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:opacity-0 before:shadow-hec-2",
  "before:transition-opacity before:duration-hec-1 before:ease-hec",
  "hover:before:opacity-100 active:before:opacity-0",
  "[[data-hec-motion=off]_&]:before:transition-none",
].join(" ");
