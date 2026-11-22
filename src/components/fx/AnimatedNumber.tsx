/**
 * AnimatedNumber — springy count-up for KPI values.
 *
 * Eases from the previously shown value to the new one with an
 * ease-out-quart curve (fast start, gentle landing). Respects
 * prefers-reduced-motion by snapping instantly.
 */
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** milliseconds for the full sweep */
  duration?: number;
  /** custom formatter; defaults to locale-rounded integer */
  format?: (n: number) => string;
  className?: string;
  /** the figure shown on the first paint, before any count; default 0 (so the first value counts up from 0) */
  startAt?: number;
}

export function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
  startAt = 0,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(startAt);
  const shown = useRef(startAt);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      shown.current = value;
      setDisplay(value);
      return;
    }

    const from = shown.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const current = from + (to - from) * eased;
      shown.current = current;
      setDisplay(current);
      if (p < 1) raf = requestAnimationFrame(tick);
      else shown.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  return <span className={`tabular-nums ${className ?? ""}`}>{fmt(display)}</span>;
}
