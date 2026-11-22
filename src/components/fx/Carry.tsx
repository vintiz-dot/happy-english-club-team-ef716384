/**
 * Carry - continuity between pages (design brief B6, DESIGN_SYSTEM s.9b).
 *
 * The View Transitions API, through one helper. The element that carries gets
 * `style={{ viewTransitionName: carry(id) }}` on BOTH pages (a class card's
 * title becomes the class page's title); only ONE element carries per
 * navigation, and everything else cross-fades in 240 ms. Where the API is
 * missing (older Safari, some in-app browsers) or the motion level is "off",
 * navigation is instant. Never polyfilled. Back navigation carries in reverse
 * because the same names exist on the page being returned to.
 *
 * The app uses <BrowserRouter>, not a data router, so React Router's
 * `viewTransition` prop is not used. The form here is
 * document.startViewTransition(() => flushSync(() => navigate(to))).
 */
import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { dur, easeDraw, useMotionLevel } from "./motion";

/** A valid CSS identifier for view-transition-name, from any id (ids may start with a digit). */
export function carry(name: string): string {
  return `carry-${String(name).replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

interface ViewTransitionLike {
  ready: Promise<void>;
}
type StartViewTransition = (update: () => void | Promise<void>) => ViewTransitionLike;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** navigate(), carried when the browser can. Same arguments as useNavigate()'s function. */
export function useCarryNavigate() {
  const navigate = useNavigate();
  const level = useMotionLevel();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      const go = () => (typeof to === "number" ? navigate(to) : navigate(to, options));
      const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
      if (level === "off" || typeof start !== "function") {
        go();
        return;
      }
      const vt = start.call(document, async () => {
        flushSync(go);
        // a route may render a frame later (lazy page); let it land before the new snapshot
        await nextFrame();
        await nextFrame();
      });
      // Everything that is not carried cross-fades in 240 ms (the browser default is 250 ms).
      vt.ready
        .then(() => {
          const root = document.documentElement;
          const timing = { duration: dur.reveal * 1000, easing: `cubic-bezier(${easeDraw.join(",")})` };
          root.animate({ opacity: [1, 0] }, { ...timing, pseudoElement: "::view-transition-old(root)" } as KeyframeAnimationOptions);
          root.animate({ opacity: [0, 1] }, { ...timing, pseudoElement: "::view-transition-new(root)" } as KeyframeAnimationOptions);
        })
        .catch(() => {
          /* skipped or interrupted: navigation has already happened */
        });
    },
    [navigate, level],
  );
}
