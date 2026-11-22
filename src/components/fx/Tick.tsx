/**
 * Tick - a count-up for a figure that is not money (design brief B5, C2).
 *
 * It is AnimatedNumber with three differences: it counts in 600 ms by default;
 * it counts only at motion level "full" (in "calm" and "off" the figure is
 * simply there); and it refuses money. Money never counts up, pulses or
 * highlights (design brief A3.5): asking Tick to animate a money value throws
 * in development, and in production it renders the figure plainly.
 *
 * `fromZero` says whether the first paint counts up from 0 (the day's first
 * arrival) or already shows the figure; either way a later change counts from
 * the figure shown to the new one.
 */
import { AnimatedNumber } from "./AnimatedNumber";
import { useMotionLevel } from "./motion";

export { AnimatedNumber };

export interface TickProps {
  value: number;
  /** count up from 0 on the first paint (the day's first arrival); otherwise show the figure at once */
  fromZero?: boolean;
  /** milliseconds for the full sweep */
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  /** Set it on a money figure and Tick will refuse to animate it. */
  money?: boolean;
}

// A formatter whose output carries a currency mark is a money value even if nobody said so.
const CURRENCY = /₫|\bVND\b|\bđ\b|[$€£]/i;

export function Tick({ value, fromZero = false, duration = 600, format, className, money = false }: TickProps) {
  const level = useMotionLevel();
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  const isMoney = money || CURRENCY.test(fmt(value));
  if (isMoney) {
    if (import.meta.env.DEV) {
      throw new Error("Tick was asked to animate a money value. Money never counts up: render the figure plainly.");
    }
    return <span className={`tabular-nums ${className ?? ""}`}>{fmt(value)}</span>;
  }
  if (level !== "full") return <span className={`tabular-nums ${className ?? ""}`}>{fmt(value)}</span>;
  return <AnimatedNumber value={value} duration={duration} format={format} className={className} startAt={fromZero ? 0 : value} />;
}
