/**
 * Plumbing for the point tokens of the teacher's live grid (docs/EXPERIENCE_DESIGN_BRIEF.md C4). Presentation only:
 * it remembers WHERE on the screen the teacher last tapped a skill, so the token can fly from there, and it counts
 * how many tokens are in the air so a burst of awards never piles up. It reads and writes no data.
 */

interface Point {
  x: number;
  y: number;
}

let origin: (Point & { at: number }) | null = null;

/** A tapped origin older than this is not "the tap that caused this award" any more. */
const ORIGIN_FRESH_MS = 15_000;

/** Remember the middle of the element the teacher just pressed (a skill tile). */
export function noteTapOrigin(el: Element | null) {
  if (!el || typeof window === "undefined") return;
  const r = el.getBoundingClientRect();
  origin = { x: r.left + r.width / 2, y: r.top + r.height / 2, at: Date.now() };
}

/** The point to fly from, if the last tap was recent. Read by the award that tap led to. */
export function peekTapOrigin(): Point | null {
  if (!origin || Date.now() - origin.at > ORIGIN_FRESH_MS) return null;
  return { x: origin.x, y: origin.y };
}

/** At most this many tokens in the air; beyond it the numbers still update and the flight is skipped. */
export const MAX_LIVE_TOKENS = 6;
let live = 0;

export function claimToken(): boolean {
  if (live >= MAX_LIVE_TOKENS) return false;
  live++;
  return true;
}

export function releaseToken() {
  live = Math.max(0, live - 1);
}
