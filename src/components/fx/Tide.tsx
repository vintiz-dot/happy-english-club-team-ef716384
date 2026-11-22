/**
 * Tide - the interface knows what time it is (design brief B7, DESIGN_SYSTEM s.9b).
 *
 * `--hec-tide` runs from 0 at 07:00 to 1 at 19:00 on the Hanoi clock. It may
 * do exactly two things: warm `hec-paper` by at most 2 % lightness and 4
 * degrees of hue (an inert rule in src/index.css, active only while <html>
 * carries `data-hec-tide`, light theme only), and choose the greeting line.
 *
 * BUILT, NOT SWITCHED ON: nothing in the app calls `useTide` yet, and a call
 * does not touch <html> unless it passes `{ apply: true }`. The parent's
 * screens and the dark theme never use it (the rule does not match `.dark`).
 */
import { useEffect, useState } from "react";

const REFRESH_MS = 5 * 60_000;

/** Hour of the day (0-24, fractional) on the Hanoi clock. */
function hanoiHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

/** 0 at 07:00 and before, 1 at 19:00 and after, linear between. Pure. */
export function tideAt(now: Date): number {
  return Math.min(1, Math.max(0, (hanoiHour(now) - 7) / 12));
}

/** The greeting line for the Hanoi hour. Pure. */
export function greetingAt(now: Date): string {
  const h = hanoiHour(now);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export interface Tide {
  /** 0 (07:00) to 1 (19:00) */
  tide: number;
  greeting: string;
}

export function useTide({ apply = false }: { apply?: boolean } = {}): Tide {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const tide = tideAt(now);
  useEffect(() => {
    if (!apply) return;
    const root = document.documentElement;
    root.setAttribute("data-hec-tide", "");
    root.style.setProperty("--hec-tide", tide.toFixed(3));
    return () => {
      root.removeAttribute("data-hec-tide");
      root.style.removeProperty("--hec-tide");
    };
  }, [apply, tide]);

  return { tide, greeting: greetingAt(now) };
}
