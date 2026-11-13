// Lesson times and the server's clock. Pure.
//
// Lesson times are Hanoi wall-clock (UTC+7, no daylight saving). The SERVER
// decides the window at arming (capture_opens_at / capture_closes_at); these
// helpers only plan when the page should try, and the server refuses anything
// outside it whatever the page thinks.

import type { ScheduleEntry } from "./types";

export const HANOI_OFFSET_MS = 7 * 3600 * 1000;

/** Hanoi date + time -> UTC epoch ms. */
export function hanoiToEpoch(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm, ss || 0) - HANOI_OFFSET_MS;
}

export function lessonWindow(e: ScheduleEntry): { start: number; end: number } {
  const start = hanoiToEpoch(e.date, e.startTime);
  let end = hanoiToEpoch(e.date, e.endTime);
  if (end <= start) end += 24 * 3600 * 1000;
  return { start, end };
}

export interface WindowSettings { armWindowMinutes: number; preRollMinutes: number; graceMinutes: number }
export const DEFAULT_WINDOW: WindowSettings = { armWindowMinutes: 20, preRollMinutes: 5, graceMinutes: 10 };

/** When the page should try to arm, start and stop (server-corrected epoch ms). */
export function plan(e: ScheduleEntry, s: WindowSettings = DEFAULT_WINDOW) {
  const { start, end } = lessonWindow(e);
  return {
    armAt: start - s.armWindowMinutes * 60000,
    startAt: start - s.preRollMinutes * 60000,
    stopAt: end + s.graceMinutes * 60000,
    start, end,
  };
}

/**
 * Back-to-back lessons (section 3): A stops at min(A.end + grace, B.start);
 * B starts at max(B.start - pre_roll, A's stop). A recording holds ONE class.
 */
export function backToBack(aStopAt: number, next: { start: number; startAt: number } | null) {
  if (!next) return { aStop: aStopAt, bStart: null as number | null };
  const aStop = Math.min(aStopAt, next.start);
  return { aStop, bStart: Math.max(next.startAt, aStop) };
}

/** The next lesson today of the same teacher, after `e`. */
export function nextLesson(e: ScheduleEntry, all: ScheduleEntry[]): ScheduleEntry | null {
  const me = lessonWindow(e).start;
  const later = all
    .filter((x) => x.sessionId !== e.sessionId && x.date === e.date && x.status !== "Canceled" && lessonWindow(x).start >= me)
    .sort((a, b) => lessonWindow(a).start - lessonWindow(b).start);
  return later[0] ?? null;
}

/**
 * offset = server - local, from one round trip: the server's time is taken
 * to be at the midpoint of the request.
 */
export function clockOffset(serverIso: string, sentAt: number, receivedAt: number): { offsetMs: number; rttMs: number } {
  const server = Date.parse(serverIso);
  const mid = (sentAt + receivedAt) / 2;
  return { offsetMs: Math.round(server - mid), rttMs: receivedAt - sentAt };
}

export const CLOCK_WARN_MS = 5000;
