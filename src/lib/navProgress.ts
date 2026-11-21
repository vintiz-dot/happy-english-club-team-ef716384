// Navigation feedback state: "a click happened, the new page is not drawn yet".
// A tiny external store (no React import) so a link, a nav button and the
// Suspense fallback can all report to the one progress bar.
type Listener = () => void;

let active = false;
let suspended = 0;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const navProgress = {
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  getActive: () => active,
  getSuspended: () => suspended,
  /** A navigation was asked for. Idempotent. */
  start() { if (!active) { active = true; emit(); } },
  /** The new route is on screen (or nothing happened). */
  finish() { if (active) { active = false; emit(); } },
  /** A route-level Suspense fallback mounted / unmounted. */
  suspend() { suspended += 1; emit(); },
  resume() { suspended = Math.max(0, suspended - 1); emit(); },
};

/** Would clicking this anchor move to another in-app page? */
export function isInAppNavigation(a: HTMLAnchorElement, ev: MouseEvent, here: Location): boolean {
  if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.hasAttribute("download")) return false;
  let url: URL;
  try { url = new URL(a.href, here.href); } catch { return false; }
  if (url.origin !== here.origin) return false;
  if (url.pathname === here.pathname && url.search === here.search) return false; // same page or a #hash jump
  return true;
}
