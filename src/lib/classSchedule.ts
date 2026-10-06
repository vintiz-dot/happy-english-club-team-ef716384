/**
 * classSchedule — how long is THIS session supposed to run?
 *
 * WHY A SINGLE PER-CLASS LENGTH WAS NEVER ENOUGH
 *
 * `classes.default_session_length_minutes` is one integer. Real classes here
 * run different lengths on different days: two hours on Wednesday, ninety
 * minutes on Saturday, for the SAME class — and that is the norm across the
 * timetable, not an exception. No single number can describe it, so comparing
 * every session against one meant one of the two days was permanently "wrong"
 * by thirty minutes. A standing false alarm trains everyone to ignore the
 * flag, including on the day it is real and costing money.
 *
 * The weekly pattern already holds the answer. `classes.schedule_template` is
 * `{ weeklySlots: [{ dayOfWeek, startTime, endTime }] }`, and
 * supabase/functions/schedule-sessions generates the session rows from each
 * slot's OWN start and end time. So the slot a session came from already
 * states how long that session is meant to be. Expected length is read from
 * there; the per-class number is only the fallback for a session on a day the
 * class does not normally run.
 *
 * Mirrored in supabase/functions/calculate-payroll/index.ts — if the two ever
 * disagree, the flag points at different sessions than the pay does.
 */

import {
  durationMinutes,
  formatMinutes,
  parseTimeToMinutes,
  type DurationVariance,
} from "@/lib/sessionDuration";

export interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId?: string | null;
}

/**
 * Pull the slots out of the raw `schedule_template` JSON.
 *
 * Deliberately forgiving: the column is free-form JSON written by two
 * different admin screens, so a malformed slot is skipped rather than allowed
 * to throw or to poison the expected length with NaN.
 */
export function parseWeeklySlots(template: unknown): WeeklySlot[] {
  const raw = (template as { weeklySlots?: unknown } | null | undefined)?.weeklySlots;
  if (!Array.isArray(raw)) return [];

  const out: WeeklySlot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const slot = entry as Record<string, unknown>;

    const dayOfWeek = Number(slot.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;

    const startTime = typeof slot.startTime === "string" ? slot.startTime : "";
    const endTime = typeof slot.endTime === "string" ? slot.endTime : "";
    // Tolerates "17:30" and "17:30:00" alike, which is what the two writers
    // actually produce.
    if (parseTimeToMinutes(startTime) == null || parseTimeToMinutes(endTime) == null) continue;

    out.push({
      dayOfWeek,
      startTime,
      endTime,
      teacherId: typeof slot.teacherId === "string" ? slot.teacherId : null,
    });
  }
  return out;
}

/**
 * How long one weekly slot runs. Null when the slot is unusable.
 *
 * A slot whose start equals its end is half-typed, not a 24-hour class — but
 * the cross-midnight rule that correctly turns 23:30→01:00 into 90 minutes
 * turns 19:30→19:30 into 1440. Left alone that would enter the class's set of
 * legitimate lengths and wave through a session of any length at all.
 */
export function slotLengthMinutes(slot: WeeklySlot): number | null {
  const minutes = durationMinutes(slot.startTime, slot.endTime);
  if (minutes == null || minutes <= 0 || minutes >= 24 * 60) return null;
  return minutes;
}

/**
 * Every length this class actually schedules, ascending and de-duplicated.
 *
 * This is the set a session's length is allowed to be. A class running both
 * 90 and 120 minute sessions has two legitimate lengths, and a session of
 * either is not a data-entry error wherever it sits in the week.
 */
export function configuredLengths(
  slots?: WeeklySlot[] | null,
  classDefaultMinutes?: number | null,
): number[] {
  const lengths = new Set<number>();
  for (const slot of slots ?? []) {
    const minutes = slotLengthMinutes(slot);
    if (minutes != null) lengths.add(minutes);
  }
  // The per-class number counts as a legitimate length only when there is no
  // weekly pattern to contradict it. Once a class has slots, those ARE the
  // schedule and the column is just the fallback for off-pattern dates.
  if (lengths.size === 0 && classDefaultMinutes && classDefaultMinutes > 0) {
    lengths.add(Math.round(classDefaultMinutes));
  }
  return [...lengths].sort((a, b) => a - b);
}

/**
 * Day of week (0 = Sunday) for a "YYYY-MM-DD" session date.
 *
 * Parsed as UTC on purpose. Session dates are already Asia/Bangkok calendar
 * dates — schedule-sessions derives them in that zone before writing — so
 * re-interpreting the string in the viewer's local zone could shift the day
 * and match the session to the wrong slot. Reading the digits as UTC keeps it
 * the same weekday for an admin in Hanoi and a reviewer anywhere else.
 */
export function dayOfWeekFor(date?: string | null): number | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;

  // Rejects 2026-02-30 and friends, which Date.UTC silently rolls over.
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed.getUTCDay();
}

/** Where the expected length came from, so the UI can say so honestly. */
export type ExpectedLengthSource = "slot" | "class-default" | "none";

export interface ExpectedLength {
  minutes: number | null;
  source: ExpectedLengthSource;
  /** The slot the session was matched to, when it matched one. */
  slot: WeeklySlot | null;
}

/**
 * How long this session is supposed to run.
 *
 * Matching is by day of week. When a class runs twice on the same day — a
 * morning and an evening group — the slot with the nearest start time wins,
 * which is also what keeps a session matched to its own slot after someone
 * nudges its start time by a few minutes.
 */
export function expectedLengthFor(input: {
  date?: string | null;
  startTime?: string | null;
  slots?: WeeklySlot[] | null;
  classDefaultMinutes?: number | null;
}): ExpectedLength {
  const { date, startTime, slots, classDefaultMinutes } = input;

  const dayOfWeek = dayOfWeekFor(date);
  const sameDay =
    dayOfWeek == null ? [] : (slots ?? []).filter((s) => s.dayOfWeek === dayOfWeek);

  let matched: WeeklySlot | null = null;
  if (sameDay.length === 1) {
    matched = sameDay[0];
  } else if (sameDay.length > 1) {
    const sessionStart = parseTimeToMinutes(startTime);
    if (sessionStart == null) {
      matched = sameDay[0];
    } else {
      let best = sameDay[0];
      let bestGap = Number.POSITIVE_INFINITY;
      for (const slot of sameDay) {
        const slotStart = parseTimeToMinutes(slot.startTime);
        if (slotStart == null) continue;
        // Shortest way round the clock, so 23:50 and 00:10 read as 20 minutes
        // apart rather than most of a day.
        const raw = Math.abs(slotStart - sessionStart);
        const gap = Math.min(raw, 1440 - raw);
        if (gap < bestGap) {
          bestGap = gap;
          best = slot;
        }
      }
      matched = best;
    }
  }

  const slotMinutes = matched ? slotLengthMinutes(matched) : null;
  if (slotMinutes != null) {
    return { minutes: slotMinutes, source: "slot", slot: matched };
  }

  // No usable slot on this day: a make-up, a one-off, or a session dragged
  // onto a day the class does not normally run. The per-class number is the
  // only thing left to go on.
  if (classDefaultMinutes && classDefaultMinutes > 0) {
    return { minutes: Math.round(classDefaultMinutes), source: "class-default", slot: null };
  }
  return { minutes: null, source: "none", slot: null };
}

/**
 * - `ok`            runs exactly as long as its slot says
 * - `other-pattern` a different length, but one this class genuinely runs
 * - `mismatch`      a length this class never runs: the real alarm
 * - `unknown`       nothing to compare against
 */
export type SessionLengthStatus = "ok" | "other-pattern" | "mismatch" | "unknown";

export interface SessionLengthCheck {
  status: SessionLengthStatus;
  actualMinutes: number | null;
  expectedMinutes: number | null;
  /** Positive = runs longer than expected. */
  deltaMinutes: number | null;
  source: ExpectedLengthSource;
  slot: WeeklySlot | null;
  /** Every length this class schedules, for the explanation text. */
  configured: number[];
}

/**
 * The one check every screen should use.
 *
 * `other-pattern` is why this exists rather than a bare comparison. A
 * ninety-minute make-up moved onto the two-hour Wednesday is not an error:
 * the school runs ninety-minute sessions, pay is hourly, and the money is
 * right either way. Flagging it would be crying wolf. What IS an error is a
 * length this class never runs at all — the two-hours-typed-for-a-ninety-
 * minute-class case that costs real money every week it goes unnoticed.
 */
export function checkSessionLength(input: {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  slots?: WeeklySlot[] | null;
  classDefaultMinutes?: number | null;
}): SessionLengthCheck {
  const { date, startTime, endTime, slots, classDefaultMinutes } = input;

  const expected = expectedLengthFor({ date, startTime, slots, classDefaultMinutes });
  const configured = configuredLengths(slots, classDefaultMinutes);
  const actualMinutes = durationMinutes(startTime, endTime);

  const base = {
    actualMinutes,
    expectedMinutes: expected.minutes,
    source: expected.source,
    slot: expected.slot,
    configured,
  };

  if (actualMinutes == null || expected.minutes == null) {
    return { ...base, status: "unknown", deltaMinutes: null };
  }

  const deltaMinutes = actualMinutes - expected.minutes;
  if (deltaMinutes === 0) return { ...base, status: "ok", deltaMinutes: 0 };
  if (configured.includes(actualMinutes)) {
    return { ...base, status: "other-pattern", deltaMinutes };
  }
  return { ...base, status: "mismatch", deltaMinutes };
}

/**
 * The variance to act on, or null. Only a `mismatch` is one: everything else
 * is either correct or a length this class legitimately runs.
 */
export function varianceFromCheck(check: SessionLengthCheck): DurationVariance | null {
  if (check.status !== "mismatch") return null;
  if (check.actualMinutes == null || check.expectedMinutes == null || check.deltaMinutes == null) {
    return null;
  }
  return {
    actualMinutes: check.actualMinutes,
    expectedMinutes: check.expectedMinutes,
    deltaMinutes: check.deltaMinutes,
  };
}

/** Shorthand for "is this session's length wrong?". */
export function getSessionVariance(input: {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  slots?: WeeklySlot[] | null;
  classDefaultMinutes?: number | null;
}): DurationVariance | null {
  return varianceFromCheck(checkSessionLength(input));
}

/**
 * What the length SHOULD cost, for the projected-payroll column.
 *
 * An `other-pattern` session is costed at what it actually ran, because it
 * ran a length the school schedules — the projection should not claim an
 * overpayment that isn't one.
 */
export function payableExpectedMinutes(check: SessionLengthCheck): number | null {
  if (check.status === "mismatch") return check.expectedMinutes;
  return check.actualMinutes ?? check.expectedMinutes;
}

/** "1h 30m and 2h" — the lengths a class runs, for explanation text. */
export function describePattern(slots?: WeeklySlot[] | null): string | null {
  const lengths = configuredLengths(slots);
  if (lengths.length === 0) return null;
  return lengths.map(formatMinutes).join(" and ");
}

/**
 * The fallback to store in `classes.default_session_length_minutes`.
 *
 * Nothing in the flagging path depends on this any more, but it is still the
 * expected length for an off-pattern one-off, and it is shown in Class
 * Settings. Derived from the slots so a new class is never silently stuck at
 * the column default of 90 while actually running two hours — which is how
 * classes created through the new-class form used to behave.
 */
export function fallbackLengthFromSlots(slots?: WeeklySlot[] | null): number | null {
  const counts = new Map<number, number>();
  for (const slot of slots ?? []) {
    const minutes = slotLengthMinutes(slot);
    if (minutes == null) continue;
    counts.set(minutes, (counts.get(minutes) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  // Most common length wins; ties go to the longer one, since under-stating
  // the fallback is the direction that under-pays.
  let best: number | null = null;
  let bestCount = -1;
  for (const [minutes, count] of counts) {
    if (count > bestCount || (count === bestCount && best != null && minutes > best)) {
      best = minutes;
      bestCount = count;
    }
  }
  return best;
}
