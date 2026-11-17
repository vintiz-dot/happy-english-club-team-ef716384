/**
 * What the school forgoes on lessons nobody is charged for, as the functions
 * price it. Read by the Reports tab (Lost Profit, Excused Absences) and the
 * Finance tab's Excused Loss card.
 *
 * Those screens used to price this themselves: classes.session_rate_vnd (the
 * class's list fee of TODAY) times a head count for a cancelled lesson, the
 * same fee per excused mark, and the cancelled lesson's teacher at the
 * teacher row's rate of today. Nothing here prices anything:
 *
 *   tuition - calculate-tuition-bulk's `excusedLessons` / `cancelledLessons`
 *     (added for BROWSER-PRICING): per student, each lesson not charged and
 *     what it would have added to that student's month, on the student's own
 *     enrolled dates, weekdays and rate override.
 *   pay - calculate-payroll's `lostIncomeTotal`: what the month's
 *     cancelled lessons would have paid, at the rate in force on each date,
 *     teachers and assistants both, staff with no payroll row included.
 *
 * Only sums and look-ups over figures the functions decided. A figure the
 * function did not send - not redeployed yet, a read it could not make, a
 * student it did not answer for - is null, which the screens show as
 * "figure unavailable". Never a browser price, never a confident 0.
 */

/** One lesson as calculate-tuition-bulk reports it. */
export interface BulkLesson {
  session_id?: string | null;
  date?: string | null;
  class_id?: string | null;
  rate_vnd?: number | null;
}

/** One entry of calculate-tuition-bulk's `results`, narrowed to what is read. */
export interface BulkTuitionResult {
  studentId?: string;
  error?: boolean;
  excusedLessons?: BulkLesson[] | null;
  cancelledLessons?: BulkLesson[] | null;
}

export type ForgoneKind = "excusedLessons" | "cancelledLessons";

export interface ForgoneLesson {
  studentId: string;
  sessionId: string;
  date: string;
  classId: string;
  amount: number;
}

export interface ForgoneTuition {
  /** Sum of every lesson listed; null unless every student asked about was answered. */
  total: number | null;
  lessons: ForgoneLesson[];
  /** Students whose answer carries the field (an empty list counts). */
  answered: Set<string>;
}

/** A whole-dong figure, or null for anything that is not one. */
const figure = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * The lessons of one kind across a calculate-tuition-bulk answer.
 *
 * `asked` is the roster the screen sent. A student on it with no answer, an
 * errored answer, or one without the field (the function predates it,
 * could not read the cancelled lessons, or the student's bill is frozen, so
 * what it charged is not today's register) makes the total unknown - leaving
 * them out would understate it while looking complete.
 */
export function forgoneTuition(
  results: BulkTuitionResult[] | null | undefined,
  kind: ForgoneKind,
  asked?: readonly string[],
): ForgoneTuition {
  const lessons: ForgoneLesson[] = [];
  const answered = new Set<string>();
  if (!Array.isArray(results)) return { total: null, lessons, answered };

  let complete = true;
  let total = 0;
  for (const r of results) {
    const list = r?.[kind];
    if (!r?.studentId || r.error || !Array.isArray(list)) {
      complete = false;
      continue;
    }
    answered.add(r.studentId);
    for (const l of list) {
      const amount = figure(l?.rate_vnd);
      if (amount === null || !l?.session_id) {
        complete = false;
        continue;
      }
      total += amount;
      lessons.push({
        studentId: r.studentId,
        sessionId: l.session_id,
        date: l.date ?? "",
        classId: l.class_id ?? "",
        amount,
      });
    }
  }
  for (const id of asked ?? []) if (!answered.has(id)) complete = false;
  return { total: complete ? total : null, lessons, answered };
}

/** `${sessionId}:${studentId}` -> the function's figure for that lesson. */
export function forgoneByLesson(f: ForgoneTuition): Map<string, number> {
  return new Map(f.lessons.map((l) => [`${l.sessionId}:${l.studentId}`, l.amount]));
}

/** calculate-payroll's answer, narrowed to its month-wide Lost Income. */
export interface PayrollLostIncomeResponse {
  lostIncomeTotal?: number | null;
}

/**
 * The pay the month's cancelled lessons would have cost: calculate-payroll's
 * `lostIncomeTotal`, worked out over EVERY staff member - each payroll row's
 * `lostIncome` plus `lostIncomeOnly`, the staff with no row that month (an
 * archived teacher with no lesson held or scheduled, an assistant with no
 * paid minutes) whose lessons were cancelled.
 *
 * Not summed here over `payrollData`: those rows leave out exactly the staff
 * whose month was all cancelled, so the sum read as complete while it was
 * not. Null when the function did not answer, predates the field (not yet
 * redeployed), or could not read someone's cancelled lessons - the screen
 * shows "figure unavailable".
 */
export function cancelledPayTotal(
  response: PayrollLostIncomeResponse | null | undefined,
): number | null {
  return figure(response?.lostIncomeTotal);
}

/** a - b, or null when either is unknown. */
export function difference(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b;
}
