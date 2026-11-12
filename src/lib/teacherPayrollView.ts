/**
 * calculate-payroll's answer for ONE person, in the shape the teacher's own
 * payroll page (/teacher/payroll, with its calendar) and the admin's view of
 * a teacher (/teachers/:id, Payroll tab) draw.
 *
 * WHY THIS FILE EXISTS. Both screens used to price lessons themselves:
 * `sessionPayVnd(teacher row, minutes)` per session for the calendar's day
 * totals and the profile's Amount column, `totalPayVnd(teacher row, ...)` for
 * Lost Income. The teacher row holds the rate of TODAY; calculate-payroll
 * prices each lesson at the rate in force on its own date. So any change of
 * rate - a raise, a backdated correction, a switch to per-session - made the
 * calendar disagree with the headline beside it, and the admin profile also
 * applied sessions.rate_override_vnd, which the function (and so the actual
 * pay) ignores. AGENTS.md: payroll is computed in ONE place.
 *
 * So nothing here prices anything. Every amount is one the function decided;
 * what is left is renaming, grouping by day and class, and adding up.
 *
 * Every field read is optional. Functions deploy by hand, so this file can
 * be ahead of the deployed function. Where a figure is missing the screen
 * says "figure unavailable" (null here) - it never falls back to pricing.
 *
 * A CLOSED MONTH. The function reports the frozen payroll_lines totals for a
 * closed month and keeps the recomputed ones in `live`; the per-session
 * detail it returns is always the recomputed one (payroll_lines has no
 * per-lesson rows). The teacher is shown what they were paid - the frozen
 * figures. If lessons were corrected after the close, the recomputed
 * per-lesson amounts no longer add up to what was paid, and showing them
 * would put two answers on one page; so in that case they are withheld
 * (null) rather than shown. The admin Payroll screen is unaffected: it reads
 * `live` through payrollRows.ts so PayrollMonthLock can still see drift.
 *
 * Imports only payrollSessions (which imports nothing), so
 * scripts/pgtest/teacher-payroll-view.test.mjs can drive it without a browser.
 */
import { isActualSession } from "./payrollSessions";

/** One lesson as calculate-payroll reports it in sessionDetails*. */
export interface PayrollSessionDetail {
  id?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  class_id?: string | null;
  classes?: { name?: string | null } | null;
  minutes?: number | null;
  /** Priced by the function at the rate in force on this lesson's date. */
  amount?: number | null;
  /** The rate `amount` was priced at. Absent before T5's redeploy. */
  payRateType?: "hourly" | "per_session" | null;
  rateVnd?: number | null;
}

/** One entry of calculate-payroll's `payrollData`, narrowed to what is read. */
export interface TeacherPayrollFunctionRow {
  teacherId?: string | null;
  staffType?: string | null;
  sessionsCountActual?: number | null;
  sessionsCountProjected?: number | null;
  totalHoursActual?: number | null;
  totalMinutesActual?: number | null;
  totalAmountActual?: number | null;
  totalAmountProjected?: number | null;
  discrepancyCount?: number | null;
  varianceAmountProjected?: number | null;
  liveTotalAmountActual?: number | null;
  live?: {
    totalAmountActual?: number | null;
    sessionsCountActual?: number | null;
  } | null;
  sessionDetailsActual?: PayrollSessionDetail[] | null;
  sessionDetailsProjected?: PayrollSessionDetail[] | null;
  /** Absent before T5's redeploy. */
  lostIncome?: {
    sessionsCount?: number | null;
    totalMinutes?: number | null;
    totalAmount?: number | null;
    quantityLabel?: string | null;
  } | null;
}

export interface TeacherPayrollResponse {
  locked?: boolean | null;
  payrollData?: TeacherPayrollFunctionRow[] | null;
}

export interface TeacherPayrollSession {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  classId: string | null;
  className: string;
  minutes: number | null;
  /** Paid for: in the function's actual set. */
  counted: boolean;
  /** The function's figure; null = figure unavailable. */
  amount: number | null;
  rateVnd: number | null;
  payRateType: "hourly" | "per_session" | null;
}

export interface TeacherPayrollClass {
  id: string;
  name: string;
  held: number;
  scheduled: number;
  total: number;
}

export interface TeacherPayrollView {
  /** The function returned a row for this person. */
  found: boolean;
  /** The month is closed and these totals are what it was closed at. */
  closed: boolean;
  /**
   * The month is closed (payroll_periods locked), whether or not this
   * person has a frozen line in it. True with `closed` false means they
   * had none when it closed, so the figures shown are calculated now.
   */
  monthLocked: boolean;
  heldSessions: number;
  scheduledSessions: number;
  totalHours: number;
  /** Held lessons: what is owed (open) or was paid (closed). */
  earned: number;
  /** Lessons still to come, as the function prices them now. */
  stillToCome: number;
  projectedTotal: number;
  discrepancyCount: number;
  varianceAmount: number;
  /**
   * False in a closed month whose lessons were corrected after the close:
   * the per-lesson figures are then recomputed ones that do not add up to
   * what was paid, and every `amount` below is null.
   */
  perSessionAvailable: boolean;
  /** Every lesson that counts towards the projection (Held + Scheduled). */
  sessions: TeacherPayrollSession[];
  /** YYYY-MM-DD -> sum of that day's paid lessons; null = unavailable. */
  earnedByDate: Map<string, number | null>;
  /** Cancelled lessons priced by the function; null = figure unavailable. */
  lostIncome: { amount: number; sessions: number; quantityLabel: string } | null;
  classes: TeacherPayrollClass[];
}

const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** A figure, or null when the response did not carry one. */
const figure = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * This person's row. Matched by id rather than taken as payrollData[0]: a
 * deploy older than T5 appends every assistant after the teacher an admin
 * asked about, and drops an archived teacher with no lessons - so [0] could
 * be somebody else.
 */
export function pickPayrollRow(
  payrollData: TeacherPayrollFunctionRow[] | null | undefined,
  staffId: string | null | undefined,
): TeacherPayrollFunctionRow | undefined {
  const rows = payrollData ?? [];
  if (staffId) {
    const own = rows.find((r) => r?.teacherId === staffId);
    if (own) return own;
  }
  // No id on the row at all can only be a very old deploy answering for
  // one person; anything else is not this person.
  if (rows.length === 1 && !rows[0]?.teacherId) return rows[0];
  return undefined;
}

const EMPTY: TeacherPayrollView = {
  found: false,
  closed: false,
  monthLocked: false,
  heldSessions: 0,
  scheduledSessions: 0,
  totalHours: 0,
  earned: 0,
  stillToCome: 0,
  projectedTotal: 0,
  discrepancyCount: 0,
  varianceAmount: 0,
  perSessionAvailable: false,
  sessions: [],
  earnedByDate: new Map(),
  lostIncome: null,
  classes: [],
};

export function teacherPayrollView(
  response: TeacherPayrollResponse | null | undefined,
  staffId: string | null | undefined,
): TeacherPayrollView {
  const row = pickPayrollRow(response?.payrollData, staffId);
  if (!row) return { ...EMPTY, monthLocked: response?.locked === true, earnedByDate: new Map() };

  const earned = num(row.totalAmountActual);
  const heldSessions = num(row.sessionsCountActual);
  const actualDetails = row.sessionDetailsActual ?? null;

  // Closed = the function swapped in frozen figures for this person. It
  // reports the recomputed amount beside them whenever it does (the
  // published name liveTotalAmountActual predates `live`), so their absence
  // in a locked month means there was no frozen line and the figures are
  // live ones.
  const liveAmount = figure(row.live?.totalAmountActual ?? row.liveTotalAmountActual);
  const closed = response?.locked === true && liveAmount !== null;
  const liveCount = figure(row.live?.sessionsCountActual) ?? (actualDetails ? actualDetails.length : null);

  const perSessionAvailable = !closed || (liveAmount === earned && liveCount === heldSessions);

  // What is still to come, from the function's own figures. In a closed
  // month the projected total is live, so it is set against the live
  // actuals - subtracting the frozen ones would mix two months' worth of
  // corrections into "still to come".
  const projected = num(row.totalAmountProjected);
  const actualForPending = closed ? (liveAmount as number) : earned;
  const countForPending = closed && liveCount !== null ? liveCount : heldSessions;
  const stillToCome = Math.max(0, projected - actualForPending);
  const scheduledSessions = Math.max(0, num(row.sessionsCountProjected) - countForPending);

  // Which lessons are paid: the function's actual set when it sent one,
  // otherwise the shared rule it uses (payrollSessions), never a new one.
  const actualIds = actualDetails ? new Set(actualDetails.map((d) => d?.id ?? "")) : null;
  const isCounted = (d: PayrollSessionDetail) =>
    actualIds ? actualIds.has(d.id ?? "") : isActualSession(d);

  const details = row.sessionDetailsProjected ?? actualDetails ?? [];
  const sessions: TeacherPayrollSession[] = details.map((d) => ({
    id: d?.id ?? "",
    date: (d?.date ?? "").slice(0, 10),
    startTime: d?.start_time ?? "",
    endTime: d?.end_time ?? "",
    status: d?.status ?? "",
    classId: d?.class_id ?? null,
    className: d?.classes?.name ?? "N/A",
    minutes: figure(d?.minutes),
    counted: isCounted(d ?? {}),
    amount: perSessionAvailable ? figure(d?.amount) : null,
    // The rate is withheld with the amount: in a closed month corrected
    // after the close it is the recomputed one too, and the CSV printing it
    // beside a blank amount would be half of the figure the screen hides.
    rateVnd: perSessionAvailable ? figure(d?.rateVnd) : null,
    payRateType: perSessionAvailable && (d?.payRateType === "hourly" || d?.payRateType === "per_session") ? d.payRateType : null,
  }));

  const earnedByDate = new Map<string, number | null>();
  for (const s of sessions) {
    if (!s.counted) continue;
    const before = earnedByDate.has(s.date) ? earnedByDate.get(s.date)! : 0;
    earnedByDate.set(s.date, before === null || s.amount === null ? null : before + s.amount);
  }

  const byClass = new Map<string, TeacherPayrollClass>();
  for (const s of sessions) {
    const key = s.classId ?? `name:${s.className}`;
    const entry = byClass.get(key) ?? { id: key, name: s.className, held: 0, scheduled: 0, total: 0 };
    if (s.counted) entry.held += 1;
    else entry.scheduled += 1;
    entry.total += 1;
    byClass.set(key, entry);
  }
  const classes = [...byClass.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );

  const lostAmount = figure(row.lostIncome?.totalAmount);
  const lostIncome = lostAmount === null
    ? null
    : {
        amount: lostAmount,
        sessions: num(row.lostIncome?.sessionsCount),
        quantityLabel: row.lostIncome?.quantityLabel ?? "",
      };

  const hours = figure(row.totalHoursActual);
  return {
    found: true,
    closed,
    monthLocked: response?.locked === true,
    heldSessions,
    scheduledSessions,
    totalHours: hours ?? num(row.totalMinutesActual) / 60,
    earned,
    stillToCome,
    projectedTotal: earned + stillToCome,
    discrepancyCount: num(row.discrepancyCount),
    varianceAmount: num(row.varianceAmountProjected),
    perSessionAvailable,
    sessions,
    earnedByDate,
    lostIncome,
    classes,
  };
}
