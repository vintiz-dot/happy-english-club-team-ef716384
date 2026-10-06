/**
 * sessionDuration — one definition of "how long is this session, and is that
 * what the class is supposed to be?"
 *
 * WHY THIS MATTERS FINANCIALLY
 * Teacher pay is hourly: calculate-payroll computes
 *   amount = hourly_rate_vnd / 60 * (end_time - start_time)
 * per session. So the end time on a session row is not cosmetic, it is the
 * multiplicand in a wage calculation. A class configured for 90 minutes that
 * is mistakenly entered as 2 hours silently overpays by half an hour of that
 * teacher's rate, every single time that session runs.
 *
 * Until now `classes.default_session_length_minutes` was display-only — shown
 * on a card, never compared against anything. This module makes it the
 * expected value, so a mismatch can be caught where it is entered and flagged
 * everywhere the number feeds a calculation.
 */

export const DEFAULT_SESSION_MINUTES = 90;

/** "17:30" or "17:30:00" -> minutes past midnight. Null when unparseable. */
export function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes past midnight -> "HH:MM:SS", wrapping past midnight. */
export function minutesToTime(total: number, withSeconds = true): string {
  const wrapped = ((Math.round(total) % 1440) + 1440) % 1440;
  const base = `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
  return withSeconds ? `${base}:00` : base;
}

/** Start time plus a duration, as a time string. */
export function addMinutesToTime(start: string, minutes: number, withSeconds = true): string | null {
  const startMin = parseTimeToMinutes(start);
  if (startMin == null) return null;
  return minutesToTime(startMin + minutes, withSeconds);
}

/**
 * How long a session actually runs.
 *
 * Mirrors calculate-payroll exactly, including its cross-midnight handling —
 * if this disagreed with the payroll function the flag would point at the
 * wrong sessions.
 */
export function durationMinutes(start?: string | null, end?: string | null): number | null {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s == null || e == null) return null;
  let minutes = e - s;
  if (minutes <= 0) minutes += 24 * 60;
  return Math.max(0, Math.round(minutes));
}

export interface DurationVariance {
  actualMinutes: number;
  expectedMinutes: number;
  /** Positive = session runs longer than the class is configured for. */
  deltaMinutes: number;
}

/**
 * Null when the times agree with the class setting, or when there is nothing
 * to compare against. A non-null result is always a real discrepancy.
 */
export function getDurationVariance(
  start?: string | null,
  end?: string | null,
  expectedMinutes?: number | null,
): DurationVariance | null {
  if (!expectedMinutes || expectedMinutes <= 0) return null;
  const actualMinutes = durationMinutes(start, end);
  if (actualMinutes == null) return null;
  const deltaMinutes = actualMinutes - expectedMinutes;
  if (deltaMinutes === 0) return null;
  return { actualMinutes, expectedMinutes, deltaMinutes };
}

/** 90 -> "1h 30m"; 120 -> "2h"; 45 -> "45m". */
export function formatMinutes(total: number): string {
  const abs = Math.abs(Math.round(total));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Always carries its sign, because the direction is the point. */
export function formatSignedMinutes(total: number): string {
  const rounded = Math.round(total);
  if (rounded === 0) return "0m";
  return `${rounded > 0 ? "+" : "−"}${formatMinutes(rounded)}`;
}

/** What a duration difference is worth at a given hourly rate, in VND. */
export function varianceCostVnd(deltaMinutes: number, hourlyRateVnd: number): number {
  return Math.round((hourlyRateVnd / 60) * deltaMinutes);
}

/** One-line explanation, used in tooltips, badges and payroll rows. */
export function describeVariance(v: DurationVariance): string {
  const direction = v.deltaMinutes > 0 ? "longer" : "shorter";
  return `Runs ${formatMinutes(v.actualMinutes)} but the class is set to ${formatMinutes(
    v.expectedMinutes,
  )} — ${formatMinutes(v.deltaMinutes)} ${direction}`;
}
