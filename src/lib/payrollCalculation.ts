import { rateOnDate, type PayRateRecord } from "./payHistory";
import { sessionPayVnd, type StaffPayRate } from "./payRate";

/** Sum rounded session amounts at the rate effective on each work date. */
export function datedPayrollTotal(
  sessions: { date: string; minutes: number }[],
  ratesDesc: PayRateRecord[],
  fallback: StaffPayRate,
): number {
  return sessions.reduce(
    (sum, session) => sum + sessionPayVnd(rateOnDate(ratesDesc, session.date, fallback), session.minutes),
    0,
  );
}

/** Missing status is not proof that the month is open. */
export function canBookPayroll(status: string | null | undefined, statusLoaded: boolean): boolean {
  return statusLoaded && status !== "locked";
}