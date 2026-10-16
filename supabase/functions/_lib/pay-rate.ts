/**
 * payRate — how much is one session worth to the person who taught it?
 *
 * There are two answers now, and which one applies is a property of the
 * staff member, not of the session:
 *
 *   hourly       amount = hourly_rate_vnd / 60 * minutes
 *   per_session  amount = per_session_rate_vnd, whatever the clock says
 *
 * WHY THIS IS A MODULE AND NOT AN `if`. The hourly formula was written out
 * by hand in five places — calculate-payroll's computeTotals, PayrollTab,
 * TeacherPayroll's lost-income panel, OperationalReports (twice) and
 * TAProfileDrawer. They had already drifted once: PayrollTab used a raw
 * dayjs diff that went NEGATIVE on a cross-midnight session and quietly
 * subtracted it from the teacher's pay, while the edge function rolled it
 * over correctly. Adding a second pay basis to five hand-written copies
 * would guarantee the same drift again, except next time the disagreement
 * is between what a teacher is shown and what they are paid.
 *
 * THIS IS THE DENO COPY. The original is src/lib/payRate.ts; everything
 * below this header is byte-identical to it. Deno cannot import from src/,
 * so the duplication is the price of having calculate-payroll and the
 * payroll screens agree. Change one, copy it to the other.
 *
 * ONE CONSEQUENCE WORTH STATING. The whole duration-variance apparatus
 * (sessionDuration.ts, classSchedule.ts, the "runs longer than the class is
 * set to" warnings in payroll) exists because an over-long session
 * overpays. For per-session staff that is simply not true: a session that
 * runs 30 minutes long costs exactly the same. So `varianceCostVnd` returns
 * 0 for them and the payroll screens drop the money column rather than
 * showing a confident, wrong number. The length flag itself still has value
 * as a scheduling signal, so it is not suppressed — only its price.
 */

export type PayRateType = "hourly" | "per_session";

export const PAY_RATE_TYPES: readonly PayRateType[] = ["hourly", "per_session"] as const;

/** The columns every pay calculation needs off a teacher or TA row. */
export interface StaffPayRate {
  pay_rate_type?: PayRateType | string | null;
  hourly_rate_vnd?: number | null;
  per_session_rate_vnd?: number | null;
}

/**
 * Normalizes whatever came back from the database.
 *
 * Defaults to hourly on anything unrecognised, which is how every existing
 * row behaves and the only safe direction: falling back to per_session
 * would price a 90-minute lesson at a rate nobody set.
 */
export function payRateTypeOf(staff?: StaffPayRate | null): PayRateType {
  return staff?.pay_rate_type === "per_session" ? "per_session" : "hourly";
}

/** True when the length of a session changes what it costs. */
export function lengthAffectsPay(staff?: StaffPayRate | null): boolean {
  return payRateTypeOf(staff) === "hourly";
}

/**
 * What one session pays.
 *
 * `minutes` is ignored for per-session staff — passed anyway so callers do
 * not have to branch, which is the entire point of this function.
 */
export function sessionPayVnd(staff: StaffPayRate | null | undefined, minutes: number): number {
  if (payRateTypeOf(staff) === "per_session") {
    return Math.round(staff?.per_session_rate_vnd ?? 0);
  }
  return Math.round(((staff?.hourly_rate_vnd ?? 0) / 60) * Math.max(0, minutes));
}

/**
 * What a list of sessions pays, given each one's length in minutes.
 *
 * Takes the lengths rather than the session rows so it works against both
 * the client's `durationMinutes` and the edge function's `parseMinutes`
 * without this module having to know about either.
 */
export function totalPayVnd(staff: StaffPayRate | null | undefined, minutesPerSession: number[]): number {
  if (payRateTypeOf(staff) === "per_session") {
    return Math.round(staff?.per_session_rate_vnd ?? 0) * minutesPerSession.length;
  }
  const totalMinutes = minutesPerSession.reduce((n, m) => n + Math.max(0, m), 0);
  return Math.round(((staff?.hourly_rate_vnd ?? 0) / 60) * totalMinutes);
}

/**
 * What a duration discrepancy actually costs.
 *
 * Zero for per-session staff. This replaces sessionDuration.varianceCostVnd,
 * which took an hourly rate and so could only ever answer for half the
 * staff.
 */
export function varianceCostVnd(staff: StaffPayRate | null | undefined, deltaMinutes: number): number {
  if (payRateTypeOf(staff) === "per_session") return 0;
  return Math.round(((staff?.hourly_rate_vnd ?? 0) / 60) * deltaMinutes);
}

/** The rate actually in force, as a number. For display and for forms. */
export function effectiveRateVnd(staff?: StaffPayRate | null): number {
  return payRateTypeOf(staff) === "per_session"
    ? staff?.per_session_rate_vnd ?? 0
    : staff?.hourly_rate_vnd ?? 0;
}

/** "hour" or "session" — the unit the rate is quoted in. */
export function rateUnit(staff?: StaffPayRate | null): "hour" | "session" {
  return payRateTypeOf(staff) === "per_session" ? "session" : "hour";
}

/** "250,000 ₫ / session". The one place this string is composed. */
export function describeRate(staff?: StaffPayRate | null): string {
  return `${effectiveRateVnd(staff).toLocaleString()} ₫ / ${rateUnit(staff)}`;
}

/** "Per hour" / "Per session", for a select or a badge. */
export function payRateTypeLabel(type: PayRateType): string {
  return type === "per_session" ? "Per session" : "Per hour";
}

/**
 * The quantity a payroll row should show next to the money.
 *
 * Hours for hourly staff, a session count for per-session staff. Showing
 * hours to someone paid by the lesson invites the reader to divide one by
 * the other and get a rate that is not their rate.
 */
export function describeQuantity(
  staff: StaffPayRate | null | undefined,
  opts: { sessions: number; minutes: number },
): string {
  if (payRateTypeOf(staff) === "per_session") {
    return `${opts.sessions} session${opts.sessions === 1 ? "" : "s"}`;
  }
  const hours = opts.minutes / 60;
  return `${(Math.round(hours * 100) / 100).toLocaleString()} h`;
}

/**
 * Null when a rate form is fit to save; otherwise the sentence to show.
 *
 * Lives here rather than beside the form control because that file exports
 * a component and react-refresh wants it to export nothing else.
 */
export function payRateError(payRateType: PayRateType, rate: string): string | null {
  const n = Number(rate);
  if (rate.trim() === "" || !Number.isFinite(n)) return "Enter a rate.";
  if (n < 0) return "A rate cannot be negative.";
  // Mirrors teachers_per_session_rate_set_check. Caught here so the admin
  // gets a sentence instead of a constraint name.
  if (payRateType === "per_session" && n <= 0) {
    return "A per-session rate has to be more than 0, or this person is paid nothing.";
  }
  return null;
}
