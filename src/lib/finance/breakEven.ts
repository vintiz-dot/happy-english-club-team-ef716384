/**
 * How many students does this class need before it pays for itself?
 *
 * Now that a class carries its real costs - its teacher, its assistant,
 * and its share of the rent - "is this class worth running" has an
 * answer, and it is more useful than the profit figure beside it. A class
 * 3.4M in the red is a problem; "three students short" is a decision.
 *
 * WHAT A STUDENT IS WORTH. The class's own net tuition divided by the
 * students it has. Not the list price: a class full of siblings and
 * discounts does not earn its list price, and pricing the next student at
 * a rate nobody in the room is paying would flatter every struggling
 * class. The figure is the average of what these students actually pay,
 * which is the best evidence available about what the next one will.
 *
 * It follows that this is an estimate about a class as it is priced
 * today, not a forecast. It assumes the next student costs nothing extra
 * to teach, which is true of a class that is already running and false
 * once the room is full.
 */

export interface ClassEconomics {
  /** Net tuition the class billed this month, after discounts. */
  tuition: number;
  /** Students enrolled in it this month. */
  studentCount: number;
  /** Teacher and assistant pay attributed to the class. */
  payroll: number;
  /** Its share of the month's standing costs. */
  overhead: number;
}

export interface BreakEven {
  /** What one student is worth here, on this class's own figures. */
  revenuePerStudent: number;
  /** Everything the class has to cover. */
  cost: number;
  /**
   * Students needed to cover it, rounded up - you cannot enrol four
   * fifths of a child. Null when there is no basis for an answer.
   */
  students: number | null;
  /** How many short it is. Negative means it is that many clear. */
  gap: number | null;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function breakEven(c: ClassEconomics): BreakEven {
  const tuition = num(c?.tuition);
  const studentCount = Math.max(0, Math.trunc(num(c?.studentCount)));
  const cost = num(c?.payroll) + num(c?.overhead);
  const revenuePerStudent = studentCount > 0 ? tuition / studentCount : 0;

  // No students, or students who between them bring in nothing, means
  // there is no evidence about what a student is worth here. Saying
  // "infinity students" would be arithmetic dressed up as an answer.
  if (revenuePerStudent <= 0) {
    return { revenuePerStudent: 0, cost, students: null, gap: null };
  }

  const students = Math.max(0, Math.ceil(cost / revenuePerStudent));
  return { revenuePerStudent, cost, students, gap: students - studentCount };
}

/** "3 students short" / "2 clear" / "exactly at break-even". */
export function describeGap(b: BreakEven): string | null {
  if (b.students === null || b.gap === null) return null;
  if (b.gap > 0) return `${b.gap} student${b.gap === 1 ? "" : "s"} short`;
  if (b.gap < 0) return `${-b.gap} clear`;
  return "exactly at break-even";
}
