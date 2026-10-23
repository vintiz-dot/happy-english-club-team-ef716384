/**
 * calculate-payroll's answer, in the shape the admin Payroll screen draws.
 *
 * WHY THIS FILE EXISTS. Staff pay used to be worked out twice: once by
 * calculate-payroll, which is the authority and feeds close-payroll-month,
 * payroll_lines, the finance dashboard and the per-class figures; and once
 * again, client-side, by the admin Payroll screen, for its own table, its
 * CSV and the live totals it hands to PayrollMonthLock. The two drifted
 * three times - a cross-midnight duration, effective-dated rates, and an
 * assistant's absence - and each time the screen was the one that was
 * wrong, in the direction of paying somebody more than they had earned.
 *
 * The screen no longer computes anything. It reads the function and this
 * module reshapes the answer. All that is left here is renaming and
 * arithmetic over numbers the function has already decided, so there is
 * nothing in it that CAN disagree about pay.
 *
 * It is a plain function rather than part of the component so it can be
 * driven directly by scripts/pgtest/payroll-rows.test.mjs. Mapping a
 * payroll row is exactly the kind of thing that should be checked without
 * a browser.
 */
import {
  payBasisLabel,
  type PayBasisInMonth,
  type PayRateType,
} from "./payRate";

/** One session whose length disagrees with what its class schedules. */
export interface PayrollFunctionDiscrepancy {
  id?: string | null;
  date?: string | null;
  classes?: { name?: string | null } | null;
  minutes?: number | null;
  expectedMinutes?: number | null;
  varianceMinutes?: number | null;
  varianceAmount?: number | null;
}

/**
 * One entry of calculate-payroll's `payrollData`, narrowed to what this
 * screen reads.
 *
 * Every field is optional because the deployed function is not updated in
 * the same breath as this file - migrations and function deploys here are
 * manual. A screen that renders blank names or NaN because a deploy is an
 * hour behind would be a worse failure than the one being fixed, so each
 * reader below falls back to something true.
 */
export interface PayrollFunctionRow {
  teacherId?: string | null;
  /** Decorated: "(TA)", "(archived)". Stored on payroll_lines. */
  teacherName?: string | null;
  /** Undecorated. Absent on a deploy older than this change. */
  staffName?: string | null;
  staffType?: string | null;
  isActive?: boolean | null;
  payBasisInMonth?: PayBasisInMonth | null;
  lengthCostsMoney?: boolean | null;
  payRateType?: PayRateType | null;
  /** The rate in force, in the unit payRateType names. */
  hourlyRate?: number | null;
  perSessionRate?: number | null;
  sessionsCountActual?: number | null;
  sessionsCountProjected?: number | null;
  totalAmountActual?: number | null;
  totalAmountProjected?: number | null;
  totalAmountExpectedProjected?: number | null;
  varianceAmountProjected?: number | null;
  varianceMinutesProjected?: number | null;
  discrepancies?: PayrollFunctionDiscrepancy[] | null;
  /** Closed month: the recomputed amount, beside the frozen one. */
  liveTotalAmountActual?: number | null;
  /** Closed month: everything the freeze replaced, as it recomputes now. */
  live?: {
    totalAmountActual?: number | null;
    sessionsCountActual?: number | null;
    totalMinutesActual?: number | null;
    totalHoursActual?: number | null;
    payRateType?: PayRateType | null;
    hourlyRate?: number | null;
    perSessionRate?: number | null;
  } | null;
}

export interface PayrollMismatch {
  id: string;
  date: string;
  className: string;
  actualMinutes: number;
  expectedMinutes: number;
  deltaMinutes: number;
  deltaAmount: number;
}

export interface StaffPayroll {
  staff: {
    id: string;
    full_name: string;
    hourly_rate_vnd: number;
    pay_rate_type: PayRateType;
    per_session_rate_vnd: number;
    is_active: boolean;
  };
  staffType: "teacher" | "ta";
  heldSessions: number;
  scheduledSessions: number;
  /** Lessons already held. What is owed now. */
  totalEarned: number;
  /** Lessons still to come. What is not owed yet. */
  projectedEarnings: number;
  totalProjected: number;
  /** The same month costed at the lengths the classes are scheduled for. */
  expectedProjected: number;
  /** totalProjected - expectedProjected. Positive = paying over the setting. */
  varianceAmount: number;
  varianceMinutes: number;
  /** Whether an over-long lesson costs this person money IN THIS MONTH. */
  lengthCostsMoney: boolean;
  /** "Per hour", "Per session", or "Mixed" when the basis moved mid-month. */
  payBasisInMonth: string;
  mismatchedSessions: PayrollMismatch[];
}

const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Which figures the screen shows for a CLOSED month: the recomputed ones.
 *
 * calculate-payroll replaces a closed month's actuals with what it was
 * closed at, which is right for the dashboard and for anything reporting
 * what was paid. It is wrong here, because PayrollMonthLock compares what
 * this screen shows against those same stored lines and reads the gap as
 * a correction to carry forward. Handed the frozen figures it would be
 * comparing them with themselves, find no difference ever, and silently
 * stop reporting corrections - the one job it has.
 */
function liveActuals(row: PayrollFunctionRow) {
  return {
    amount: num(row.live?.totalAmountActual ?? row.liveTotalAmountActual ?? row.totalAmountActual),
    // Only the amount had a published name before `live` existed, so
    // against an older deploy a closed month's counts are the frozen ones.
    // Stale rather than wrong, and only until the function is redeployed.
    sessions: num(row.live?.sessionsCountActual ?? row.sessionsCountActual),
  };
}

function toStaffPayroll(row: PayrollFunctionRow): StaffPayroll {
  const actual = liveActuals(row);
  const totalProjected = num(row.totalAmountProjected);
  const sessionsProjected = num(row.sessionsCountProjected);

  // The frozen/live mix above is the only way these subtractions can go
  // negative - in a live computation the projected set contains the held
  // one, and no session pays a negative amount. Floored rather than shown,
  // because "+-50,000 ₫ still to come" is not a sentence about anything.
  const projectedEarnings = Math.max(0, totalProjected - actual.amount);
  const scheduledSessions = Math.max(0, sessionsProjected - actual.sessions);

  const rateType: PayRateType =
    row.live?.payRateType ?? row.payRateType ?? "hourly";
  const effectiveRate = num(row.live?.hourlyRate ?? row.hourlyRate);

  // The basis the month was paid on. Falling back to the headline rate's
  // type loses only the "Mixed" case, which is the right thing to lose:
  // naming one of the two bases is closer to true than naming neither.
  const basis: PayBasisInMonth = row.payBasisInMonth ?? rateType;

  return {
    staff: {
      id: row.teacherId ?? "",
      // teacherName carries "(TA)" and "(archived)" for payroll_lines; this
      // screen shows those as badges. Used verbatim as the fallback rather
      // than stripped: a suffix regex that meets somebody genuinely called
      // "Nguyen (TA)" eats part of their name, and a duplicated badge is
      // only untidy.
      full_name: row.staffName ?? row.teacherName ?? "",
      pay_rate_type: rateType,
      // hourlyRate is the rate in the unit payRateType names, so for
      // per-session staff it is the per-session figure and the hourly one
      // is not reported at all. Both readers of this object go through
      // effectiveRateVnd, which picks by type and never sees the 0.
      hourly_rate_vnd: rateType === "hourly" ? effectiveRate : 0,
      per_session_rate_vnd: num(row.live?.perSessionRate ?? row.perSessionRate),
      // Absent on an older deploy, which reads as active: an unexplained
      // "Archived" badge on somebody still working is the worse error.
      is_active: row.isActive !== false,
    },
    staffType: row.staffType === "teaching_assistant" ? "ta" : "teacher",
    heldSessions: actual.sessions,
    scheduledSessions,
    totalEarned: actual.amount,
    projectedEarnings,
    totalProjected,
    expectedProjected: num(row.totalAmountExpectedProjected),
    varianceAmount: num(row.varianceAmountProjected),
    varianceMinutes: num(row.varianceMinutesProjected),
    lengthCostsMoney:
      typeof row.lengthCostsMoney === "boolean"
        ? row.lengthCostsMoney
        : basis !== "per_session",
    payBasisInMonth: payBasisLabel(basis),
    mismatchedSessions: (row.discrepancies ?? []).map((d) => ({
      id: d?.id ?? "",
      date: d?.date ?? "",
      className: d?.classes?.name ?? "Class",
      actualMinutes: num(d?.minutes),
      expectedMinutes: num(d?.expectedMinutes),
      deltaMinutes: num(d?.varianceMinutes),
      deltaAmount: num(d?.varianceAmount),
    })),
  };
}

/**
 * The function's payrollData as the screen's rows, teachers first and each
 * group by name.
 *
 * Sorted here rather than relied upon from the query, because the order of
 * a payroll table should not depend on which version of the function
 * happens to be deployed.
 */
export function payrollRows(
  payrollData: PayrollFunctionRow[] | null | undefined,
): StaffPayroll[] {
  return (payrollData ?? [])
    .map(toStaffPayroll)
    .sort((a, b) => {
      if (a.staffType !== b.staffType) return a.staffType === "teacher" ? -1 : 1;
      return a.staff.full_name.localeCompare(b.staff.full_name);
    });
}
