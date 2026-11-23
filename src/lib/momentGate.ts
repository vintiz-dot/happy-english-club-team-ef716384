/**
 * One moment per visit (docs/EXPERIENCE_DESIGN_BRIEF.md B8, I3). A "moment" is a celebration the app chooses to
 * show: a grade, a level reached, a birthday, moving up a band. The first one that asks on this page load plays;
 * every later one this visit is skipped silently, and the page must NOT record a skipped moment as seen, so it
 * plays on a later visit. Confirmations of the child's own action (the hand-in card, a Seal after a save) are not
 * moments and do not come through here.
 *
 * Module state, so it lasts for the page load and is empty again after a reload. Asking again with the SAME id is
 * answered yes (a re-render or a second effect run must not cancel the moment that already holds the slot).
 */
import { useSyncExternalStore } from "react";

let taken: string | null = null;

export function claimMoment(id: string): boolean {
  if (taken === null) taken = id;
  return taken === id;
}

/** True when some moment already holds this visit's slot (for a page that wants a quiet line instead). */
export function momentTaken(): boolean {
  return taken !== null;
}

/**
 * One Pip per screen: a moment that draws its own Pip (a reward moment, the birthday) asks the page's Pip to step
 * out while it is up. hidePagePip() returns the function that gives the page's Pip back.
 */
let pipOut = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function hidePagePip(): () => void {
  pipOut += 1;
  notify();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    pipOut -= 1;
    notify();
  };
}

export function usePagePipHidden(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => pipOut > 0,
    () => false,
  );
}
