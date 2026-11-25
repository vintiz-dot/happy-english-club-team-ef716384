/**
 * What the Reports > Checks page asks an admin to look at, as counts (pure, no React).
 *
 * The checks themselves are the database's and the functions' (tuition_bill_gaps, the
 * pending-change views, attendance_evidence_gaps); this file only decides which of their
 * rows are a problem NOW and words the total for the badge in the menu. A held bill (a
 * lesson with no mark) is not a bill the app got wrong: the register has to be fixed, and
 * the check says so on its own card, so it is not counted here.
 */

export type BillGap = {
  student_id: string;
  full_name: string;
  is_active: boolean;
  problem: "missing" | "zero" | "differs";
  billable_lessons: number;
  expected_base: number;
  saved_base: number | null;
  saved_total: number | null;
  confirmation_status: string | null;
  /** Set by refresh-month-bills when calculate-tuition kept or priced the bill as charged because lessons have no mark. */
  held?: { lessons: number; message: string };
  /** The bill was saved with the unmarked lessons priced as charged. */
  note?: { lessons: number; message: string };
};

export type BillRun = {
  ran_at: string;
  started_by: "timer" | "admin";
  found: number;
  recalculated: number;
  failed: Array<{ student_id: string; name: string; error: string }>;
  still_open: BillGap[];
};

/** The children the last run left open because their lessons have no mark, with the sentence it gave. */
export function heldBillMessages(run: BillRun | null | undefined): Map<string, string> {
  return new Map(
    (run?.still_open ?? []).filter((g) => g.held || g.note).map((g) => [g.student_id, (g.held ?? g.note)!.message] as const),
  );
}

/** The bills that are missing or wrong, not the ones held for a register that has to be fixed first. */
export function wrongBills(rows: BillGap[], run: BillRun | null | undefined): BillGap[] {
  const held = heldBillMessages(run);
  return rows.filter((g) => !held.has(g.student_id));
}

export interface CheckCounts {
  /** Bills missing or wrong for this month and last month (the months the hourly job saves). */
  wrongBills: number;
  /** Checked changes whose bills were never worked out again. */
  pendingChanges: number;
  /** Lessons where the evidence and the register disagree and only a person can say which is right. */
  needsPerson: number;
}

export const checkTotal = (c: CheckCounts): number => c.wrongBills + c.pendingChanges + c.needsPerson;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line per kind of problem, for the badge's tooltip and its screen-reader label. */
export function checkLines(c: CheckCounts): string[] {
  const lines: string[] = [];
  if (c.wrongBills > 0) lines.push(`${plural(c.wrongBills, "bill is", "bills are")} missing or wrong`);
  if (c.pendingChanges > 0) lines.push(`${plural(c.pendingChanges, "change has", "changes have")} bills not worked out again`);
  if (c.needsPerson > 0) lines.push(`${plural(c.needsPerson, "lesson needs", "lessons need")} a person to decide the attendance`);
  return lines;
}
