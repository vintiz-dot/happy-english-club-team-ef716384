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
let taken: string | null = null;

export function claimMoment(id: string): boolean {
  if (taken === null) taken = id;
  return taken === id;
}

/** True when some moment already holds this visit's slot (for a page that wants a quiet line instead). */
export function momentTaken(): boolean {
  return taken !== null;
}
