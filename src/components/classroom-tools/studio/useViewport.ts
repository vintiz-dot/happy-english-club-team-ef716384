/**
 * Viewport size, kept current.
 *
 * Projected tools are sized off the window rather than in fixed pixels —
 * a 200px die is right on a laptop and lost on a 4K projector. Reading
 * window.inner* at render alone is not enough, because the usual way this
 * gets used is: open the overlay, *then* the screen switches to the
 * projector, which changes the size after the first paint.
 */
import { useEffect, useState } from "react";

export function useViewport() {
  const [size, setSize] = useState(() => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}
