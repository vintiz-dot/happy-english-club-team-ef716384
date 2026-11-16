/**
 * The accessible name of a calendar chip or block (WCAG 2.5.3, axe
 * `label-content-name-mismatch`): it starts with exactly the text the chip
 * shows, in the order it shows it, and only then adds what is not on screen
 * (the teacher, the status, a duration note). Nothing visible is hidden from
 * a screen reader to make the two agree.
 *
 * Imports nothing, so it can be tested on its own.
 */
type Part = string | null | undefined | false;

const clean = (parts: Part[]) => parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0);

export function eventAccessibleName(visible: Part[], notVisible: Part[]): string {
  const shown = clean(visible);
  const shownSet = new Set(shown);
  // A piece already on screen is not said twice.
  const extra = clean(notVisible).filter((p) => !shownSet.has(p));
  return [...shown, ...extra].join(", ");
}
