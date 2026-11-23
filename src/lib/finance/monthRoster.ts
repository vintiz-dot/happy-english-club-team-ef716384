/**
 * Who belongs to a month (owner, 24 Nov 2026).
 *
 * A child is in a month when one of their enrolments covers at least one day
 * of it. A child whose last enrolment ended in January stays in January and
 * every earlier month they were enrolled in, and is gone from February on.
 * The "active" switch and the day somebody clicked Deactivate decide nothing:
 * that click often comes weeks after the last lesson, and it used to keep a
 * child who had left in the next month's lists.
 *
 * It is also the rule the calculator bills by (calculate-tuition prices the
 * lessons inside an enrolment), so a month's list and a month's bills name
 * the same children.
 *
 * This file imports nothing, so the test suite can run it as it is
 * (scripts/pgtest/month-roster.test.mjs).
 */

export interface RosterEnrollment {
  student_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // null = still enrolled
}

/** First and last calendar day of `month` (YYYY-MM) as YYYY-MM-DD. */
export function monthBounds(month: string): { monthStart: string; monthEnd: string } {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  // Day 0 of the following month is the last day of this one.
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { monthStart: `${month}-01`, monthEnd };
}

/** True when the enrolment covers at least one day of `month`. */
export function enrollmentCoversMonth(e: Pick<RosterEnrollment, "start_date" | "end_date">, month: string): boolean {
  const { monthStart, monthEnd } = monthBounds(month);
  if (!e.start_date || e.start_date.slice(0, 10) > monthEnd) return false;
  return e.end_date === null || e.end_date === undefined || e.end_date.slice(0, 10) >= monthStart;
}

/** The ids of the children who belong to `month`. */
export function studentsEnrolledIn(enrollments: RosterEnrollment[], month: string): Set<string> {
  const ids = new Set<string>();
  for (const e of enrollments) if (enrollmentCoversMonth(e, month)) ids.add(e.student_id);
  return ids;
}

/**
 * The last day a child is enrolled: null while an enrolment is still open,
 * undefined for a child who was never enrolled.
 */
export function lastEnrollmentDay(enrollments: Pick<RosterEnrollment, "end_date">[]): string | null | undefined {
  if (enrollments.length === 0) return undefined;
  let last: string | null | undefined;
  for (const e of enrollments) {
    if (e.end_date === null || e.end_date === undefined) return null;
    const day = e.end_date.slice(0, 10);
    if (last === undefined || last === null || day > last) last = day;
  }
  return last;
}

export interface MonthBillRow {
  student_id: string;
  recorded_payment?: number | null;
  total_amount?: number | null;
  base_amount?: number | null;
}

/**
 * Whether a saved bill is shown in its month's lists: the child belongs to
 * the month, or the bill holds a charge or a payment. A bill with money on it
 * is never hidden, whoever it belongs to; an empty bill of a child who was
 * not enrolled that month is.
 */
export function billShownInMonth(bill: MonthBillRow, enrolled: Set<string>): boolean {
  if (enrolled.has(bill.student_id)) return true;
  return (Number(bill.recorded_payment) || 0) !== 0 || (Number(bill.total_amount) || 0) !== 0 || (Number(bill.base_amount) || 0) !== 0;
}
