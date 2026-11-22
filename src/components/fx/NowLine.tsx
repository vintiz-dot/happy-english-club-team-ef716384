/**
 * NowLine - a hairline that fills in real time between two clock times.
 *
 * `start` and `end` are "HH:mm" (or "HH:mm:ss") on today's Hanoi clock, as
 * the sessions table stores them. It reads the clock once every 30 seconds,
 * never per frame, and only `transform` moves (scaleX from the left). Place it
 * inside a `relative` card: it lies along the card's bottom edge. The same
 * information is always in the card's own text (the times); here it is also a
 * progressbar for assistive technology.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TICK_MS = 30_000;

/** Seconds since midnight on the Hanoi clock. */
function hanoiSeconds(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}

function clockSeconds(value: string): number {
  const [h = "0", m = "0", s = "0"] = value.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** 0 before the start, 1 at and after the end. Pure, for tests and previews. */
export function nowFraction(start: string, end: string, now: Date): number {
  const a = clockSeconds(start);
  const b = clockSeconds(end);
  if (!(b > a)) return 0;
  return Math.min(1, Math.max(0, (hanoiSeconds(now) - a) / (b - a)));
}

export function NowLine({ start, end, className }: { start: string; end: string; className?: string }) {
  const [fraction, setFraction] = useState(() => nowFraction(start, end, new Date()));
  useEffect(() => {
    const update = () => setFraction(nowFraction(start, end, new Date()));
    update();
    const id = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(id);
  }, [start, end]);

  return (
    <div
      role="progressbar"
      aria-label="How far through the lesson"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-px bg-hec-line", className)}
    >
      <div
        className="h-full origin-left bg-hec-brass transition-transform duration-hec-3 ease-hec [[data-hec-motion=off]_&]:transition-none"
        style={{ transform: `scaleX(${fraction})` }}
      />
    </div>
  );
}
