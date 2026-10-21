/**
 * What a class's teaching actually costs.
 *
 * The per-class finance table used to price this itself: join the month's
 * sessions to teachers, read hourly_rate_vnd off the teacher row, multiply
 * by the minutes. That was wrong in two ways that both understate a class.
 *
 *   It never saw a teaching assistant. TAs are attached to sessions
 *   through session_participants, which that query does not touch, so a
 *   class with a TA in every lesson showed none of that cost - while the
 *   Payroll tab paid it and the expenditure booking charged the school for
 *   it.
 *
 *   It read today's rate. staff_pay_rates made pay effective-dated, so a
 *   rate that changed mid-month, was backdated, or is scheduled for a
 *   future date is resolved per session by calculate-payroll. Reading the
 *   mirrored column on the teachers row prices every session in the month
 *   at whatever the rate happens to be the moment the report is opened.
 *
 * So this does not price anything. calculate-payroll already owns pricing,
 * already resolves rates per session date, and already covers TAs; it also
 * returns the per-session detail behind each staff member's total, and
 * every one of those carries its class_id. Grouping those by class is the
 * whole job, and it cannot disagree with what the Payroll tab pays out
 * because it IS what the Payroll tab pays out.
 *
 * OPEN MONTHS USE PROJECTED, CLOSED MONTHS USE ACTUAL. calculate-payroll
 * reports two figures: actual, which is sessions marked Held, and
 * projected, which is Held plus Scheduled with cancellations removed. An
 * open month is still running, and its class report sits next to a
 * Sessions column counting every non-cancelled session - so projected is
 * the figure that matches what is on screen, and it does not depend on
 * whether a teacher has got round to the attendance screen yet. Once the
 * month is closed the question changes from "what will this cost" to
 * "what did we pay", and that is the locked figure.
 *
 * A CLOSED MONTH IS SCALED, NOT RECOMPUTED. When a period is locked,
 * calculate-payroll replaces each staff member's total with the stored
 * payroll_lines figure but leaves the per-session detail live. Summing the
 * detail would quietly restate a paid month. Instead the detail is used
 * only for its SHAPE - the proportion of a person's pay each class
 * accounts for - and the paid total is divided along it.
 */

export interface PayrollSessionDetail {
  class_id?: string | null;
  amount?: number | null;
}

/** One entry of calculate-payroll's `payrollData`, narrowed to what is used. */
export interface PayrollStaffRow {
  teacherId?: string;
  teacherName?: string;
  staffType?: string;
  totalAmountActual?: number | null;
  sessionDetailsActual?: PayrollSessionDetail[] | null;
  sessionDetailsProjected?: PayrollSessionDetail[] | null;
}

export interface ClassPayrollSplit {
  /** class_id -> whole dong. Sums, with `unattributed`, to `total`. */
  byClass: Map<string, number>;
  /** Pay that belongs to no class: a session with no class_id, or a locked
   *  total with no per-session detail to spread it along. */
  unattributed: number;
  total: number;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Rounds a map of fractional amounts to whole dong that still sum to
 * `target`, handing each leftover dong to the largest fractional part.
 *
 * Rounding each class on its own leaves the column not adding up to the
 * payroll total, and a total row that is out by a few dong is the first
 * thing anyone notices and the last thing they trust.
 */
export function apportion(weights: Map<string, number>, target: number): Map<string, number> {
  const out = new Map<string, number>();
  const sum = [...weights.values()].reduce((n, v) => n + v, 0);
  if (sum <= 0) return out;

  const rounded = Math.round(target);
  const scaled = [...weights.entries()].map(([k, w]) => {
    const exact = (w / sum) * rounded;
    const base = Math.floor(exact);
    return { k, base, frac: exact - base };
  });

  let left = rounded - scaled.reduce((n, s) => n + s.base, 0);
  // Ties broken by the larger share, then by key, so the same inputs
  // always produce the same table.
  scaled.sort((a, b) => b.frac - a.frac || (weights.get(b.k)! - weights.get(a.k)!) || a.k.localeCompare(b.k));
  for (const s of scaled) {
    out.set(s.k, s.base + (left > 0 ? 1 : 0));
    if (left > 0) left -= 1;
  }
  return out;
}

export function splitPayrollByClass(
  rows: PayrollStaffRow[] | null | undefined,
  opts: { locked: boolean },
): ClassPayrollSplit {
  const weights = new Map<string, number>();
  let unattributed = 0;
  let total = 0;

  for (const r of rows ?? []) {
    const details = (opts.locked ? r.sessionDetailsActual : r.sessionDetailsProjected) ?? [];
    const shape = details.reduce((n, d) => n + num(d.amount), 0);
    // Open: the person's cost IS the sum of their sessions. Closed: it is
    // what payroll_lines says they were paid.
    const target = opts.locked ? num(r.totalAmountActual) : shape;
    total += target;

    if (shape <= 0) {
      // Nothing to spread it along - a locked total with no held sessions
      // behind it, or an adjustment-only row. Surfacing it is the point;
      // silently dropping it would make the class columns sum to less than
      // the payroll and look like the overhead was wrong.
      unattributed += target;
      continue;
    }

    const factor = target / shape;
    for (const d of details) {
      const amount = num(d.amount) * factor;
      if (!d.class_id) {
        unattributed += amount;
        continue;
      }
      weights.set(d.class_id, (weights.get(d.class_id) ?? 0) + amount);
    }
  }

  const attributable = [...weights.values()].reduce((n, v) => n + v, 0);
  const byClass = apportion(weights, attributable);
  const wholeTotal = Math.round(total);
  const allocated = [...byClass.values()].reduce((n, v) => n + v, 0);
  return {
    byClass,
    // Derived rather than rounded on its own, so byClass + unattributed is
    // exactly total and the table's columns reconcile without a stray dong.
    unattributed: wholeTotal - allocated,
    total: wholeTotal,
  };
}
