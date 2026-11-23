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

/**
 * The children of `month` whose bills a checked change (a discount, a fee, an
 * enrolment, a lesson cancelled or moved - D2/D4) was meant to work out again
 * and has not: rows of money_change_tuition_pending / session_cancel_tuition_pending,
 * each with refresh_pairs [{student_id, month}]. A discount changes the total, not
 * the lessons, so tuition_bill_gaps cannot see these; they are saved too. Unique,
 * in first-seen order, leaving out `skip` (children the gaps list already holds).
 */
export function pendingChangeStudents(rows: any[], month: string, skip: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set(skip);
  for (const r of rows ?? []) {
    const pairs = Array.isArray(r?.refresh_pairs) ? r.refresh_pairs : [];
    for (const p of pairs) {
      const id = typeof p?.student_id === "string" ? p.student_id : null;
      if (!id || p?.month !== month || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** ok, or why not (error) and, for a refusal by the rate limiter, how long to wait. */
export interface RecalcOutcome {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
  /**
   * calculate-tuition kept the saved bill because lessons have no mark in the
   * register (a hole must never lower a bill). Not a failure and not a bill to
   * retry quietly: nothing the refresh does can fix it - the register must be.
   */
  held?: { lessons: number; message: string };
  /**
   * The bill WAS saved, priced with the unmarked lessons counted as charged
   * (calculate-tuition's priced_as_charged): a save, with a note, not a hold.
   */
  note?: { lessons: number; message: string };
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
  if (body?.held?.reason === "register_missing_marks") {
    const lessons = Array.isArray(body.held.lessons) ? body.held.lessons.length : 0;
    const message = String(body.held.message || "Held: lessons have no mark. The bill stays as charged until the register is fixed.");
    if (body.held.priced_as_charged === true) return { ok: true, note: { lessons, message } };
    return { ok: false, held: { lessons, message } };
  }
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
