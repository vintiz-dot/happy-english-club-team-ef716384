/**
 * Two kinds of "something is happening" feedback, one thin bar at the top:
 *  - a click on an in-app link or nav item: appears at once, stays until the
 *    new route has rendered (lazy chunk loaded, Suspense resolved);
 *  - any react-query mutation in flight (after a short delay so quick saves do
 *    not flicker): an indeterminate sweep, plus a polite "Saving..." for
 *    screen readers. No toasts; screens handle their own errors.
 * Reduced motion: no movement, the bar just shows as a steady line.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { isInAppNavigation, navProgress } from "@/lib/navProgress";

const MUTATION_DELAY_MS = 250;
const NAV_GIVE_UP_MS = 12000;

export function NavProgress() {
  const navActive = useSyncExternalStore(navProgress.subscribe, navProgress.getActive);
  const mutating = useIsMutating() > 0;
  const location = useLocation();
  const [showMutating, setShowMutating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startKey = useRef(location.key);

  // Any in-app anchor click (react-router <Link> renders a real <a href>).
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && isInAppNavigation(a, ev, window.location)) navProgress.start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Remember where we were when the bar started.
  const wasActive = useRef(false);
  if (navActive && !wasActive.current) startKey.current = location.key;
  wasActive.current = navActive;

  // Finish once the location changed AND no route fallback is showing, for two frames.
  useEffect(() => {
    if (!navActive) return;
    let raf = 0;
    let calm = 0;
    const began = Date.now();
    const tick = () => {
      const waited = Date.now() - began;
      calm = navProgress.getSuspended() > 0 ? 0 : calm + 1;
      const changed = location.key !== startKey.current;
      // moved and rendered; or the click led nowhere (a guard, a same-page link)
      if ((changed && calm >= 2) || (!changed && waited > 700 && calm >= 2) || waited > NAV_GIVE_UP_MS) {
        navProgress.finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navActive, location.key]);

  useEffect(() => {
    if (!mutating) { setShowMutating(false); return; }
    const t = setTimeout(() => setShowMutating(true), MUTATION_DELAY_MS);
    return () => clearTimeout(t);
  }, [mutating]);

  const visible = navActive || showMutating;
  useEffect(() => {
    if (visible) { setLeaving(false); return; }
    setLeaving(true);
    const t = setTimeout(() => setLeaving(false), 250);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <>
      {(visible || leaving) && (
        <div
          aria-hidden
          className={`hec-progress ${navActive ? "hec-progress-nav" : "hec-progress-saving"} ${visible ? "" : "hec-progress-leave"}`}
        />
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {showMutating ? "Saving..." : navActive ? "Loading page" : ""}
      </span>
    </>
  );
}
