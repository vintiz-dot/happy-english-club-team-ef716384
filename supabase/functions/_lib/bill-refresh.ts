/**
 * _lib/bill-refresh.ts - which months the bill refresh looks at, and how one
 * calculate-tuition answer is read. Pure; imports nothing (tested as it is by
 * scripts/pgtest/tuition-bill-check.test.mjs).
 *
 * Why the refresh exists: see supabase/migrations/20261123090000_tuition_bill_check.sql.
 */

/** YYYY-MM and day of month in Hanoi for an instant. */
export function hanoiMonthDay(now: Date): { month: string; day: number } {
  // Hanoi is UTC+7 all year (no daylight saving).
  const t = new Date(now.getTime() + 7 * 3600 * 1000);
  const month = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, day: t.getUTCDate() };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Days into a month during which the month before is still refreshed. */
export const PREVIOUS_MONTH_GRACE_DAYS = 5;

/**
 * The months the refresh may reprice: this month, and last month while it is
 * still within the first PREVIOUS_MONTH_GRACE_DAYS days (registers finished late).
 * Nothing older - earlier months are listed by the check and left to an admin -
 * and nothing in the future (a month that has not started is not billed yet).
 */
export function refreshableMonths(now: Date): string[] {
  const { month, day } = hanoiMonthDay(now);
  return day <= PREVIOUS_MONTH_GRACE_DAYS ? [previousMonth(month), month] : [month];
}

/** May an admin ask the refresh to reprice `month` now? This month or last month only. */
export function adminMayRefresh(month: string, now: Date): boolean {
  const { month: current } = hanoiMonthDay(now);
  return month === current || month === previousMonth(current);
}

/** ok, or why not (error) and, for a refusal by the rate limiter, how long to wait. */
export interface RecalcOutcome {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * What one calculate-tuition call achieved. Only a 200 that SAVED the bill counts:
 * calculate-tuition answers 200 without saving while the family discount is still
 * being worked out (invoiceSaved false), and that bill is still wrong.
 */
export function readRecalc(status: number, body: any): RecalcOutcome {
  if (status === 429) {
    const after = Number(body?.retryAfter);
    return { ok: false, error: "rate limited", retryAfterSeconds: Number.isFinite(after) && after > 0 ? after : 60 };
  }
  if (status !== 200) return { ok: false, error: String(body?.error || `calculate-tuition answered ${status}`) };
  if (body?.error) return { ok: false, error: String(body.error) };
  if (body?.invoiceSaved === false) {
    return {
      ok: false,
      error: body?.siblingUnresolved
        ? "not saved: the family's sibling discount is still being worked out"
        : "not saved",
    };
  }
  return { ok: true };
}
