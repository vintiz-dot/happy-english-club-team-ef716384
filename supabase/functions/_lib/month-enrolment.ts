/**
 * Is the child in this month, and does the month get a bill? (owner, 24 Nov 2026)
 *
 * A child belongs to a month when one of their enrolments covers a day of it:
 * the same test as src/lib/finance/monthRoster.ts, which the month lists use,
 * and as public.tuition_bill_expected. A child who left in January is in
 * January and in no month after it.
 *
 * calculate-tuition saves the bill on every call, so opening a departed
 * child's tuition page used to leave an empty bill (0 charged, 0 paid) in
 * every month anybody looked at: 24 of November 2026's 81 bills were those.
 * `withoutBill` is the one rule for when no bill is made.
 *
 * Pure; imports nothing (month-roster.test.mjs runs it beside monthRoster.ts).
 */

export interface EnrolmentDates {
  start_date?: string | null;
  end_date?: string | null;
}

/** First day of the month and of the month after it, as YYYY-MM-DD. */
function bounds(month: string): { first: string; next: string } {
  const [y, m] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { first: `${y}-${pad(m)}-01`, next: m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01` };
}

/** True when one of the enrolments covers at least one day of `month` (YYYY-MM). */
export function enrolledInMonth(enrollments: EnrolmentDates[] | null | undefined, month: string): boolean {
  const { first, next } = bounds(month);
  for (const e of enrollments ?? []) {
    if (!e?.start_date || e.start_date.slice(0, 10) >= next) continue;
    if (e.end_date === null || e.end_date === undefined || e.end_date.slice(0, 10) >= first) return true;
  }
  return false;
}

/**
 * True when this call must NOT make a bill: there is none saved for the month,
 * the child has no enrolment in it, nothing is charged, and no payment path
 * asked for one. A bill that already exists is never touched by this rule
 * (it is refreshed as before), and a month with a charge always gets its bill.
 *
 * `asked`: a payment path (record-payment) needs a bill to put money on, for
 * a child who left owing or paying late. Only the service role or an admin
 * may ask.
 */
export function withoutBill(a: {
  hasSavedBill: boolean;
  enrolled: boolean;
  base: number;
  total: number;
  asked: boolean;
}): boolean {
  if (a.hasSavedBill || a.enrolled || a.asked) return false;
  return (Number(a.base) || 0) === 0 && (Number(a.total) || 0) === 0;
}

/** What calculate-tuition answers when it made no bill. */
export function noBillAnswer(month: string) {
  return {
    reason: "not_enrolled" as const,
    message: `Not enrolled in ${month}: there is nothing to bill, so no bill was made for this month.`,
  };
}
