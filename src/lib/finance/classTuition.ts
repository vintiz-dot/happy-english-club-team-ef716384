/**
 * The Class Finance report's tuition columns, from calculate-tuition-bulk.
 *
 * The report used to read `invoices.class_breakdown` itself. That was wrong
 * three ways, all of which made classes look better than they were:
 *
 *   - `net_amount_vnd` takes off a class's own discounts only, never the
 *     sibling or student discounts, so Net Tuition ran above what families
 *     were charged (by 9.5M in October 2026).
 *   - a stored bill is only as fresh as its last recalculation; a register
 *     marked since then was not in it, while the Tuition tab is live.
 *   - Students counted every overlapping enrollment, billed or not, and
 *     the enrollment window ran to the 1st of the next month.
 *
 * Now the function splits each student's charge by class after every
 * discount (`classNet`, see supabase/functions/_lib/class-net.ts) and this
 * only adds those figures up. Nothing here prices anything.
 *
 * A student the screen asked about with no usable answer (no answer, an
 * error, or a function too old to send `classNet`) makes the classes they
 * are enrolled in unknown - null, shown as "figure unavailable" - rather
 * than quietly short.
 */

export interface ClassNetLine {
  class_id?: string | null;
  gross_vnd?: number | null;
  net_vnd?: number | null;
}

/** One calculate-tuition-bulk result, narrowed to what is read here. */
export interface ClassTuitionResult {
  studentId?: string;
  error?: boolean;
  totalAmount?: number | null;
  siblingUnresolved?: boolean;
  classNet?: ClassNetLine[] | null;
}

export interface ClassTuition {
  gross: number;
  net: number;
  /** Students billed something for this class this month. */
  students: number;
}

export interface ClassTuitionSplit {
  /** class_id -> figures; a class with an unanswered student is absent and listed in `unknownClasses`. */
  byClass: Map<string, ClassTuition>;
  /** Classes whose figures cannot be stated because a student in them was not answered. */
  unknownClasses: Set<string>;
  /** Students asked about who got no usable answer. */
  unanswered: string[];
  /** Charges no class carries: a frozen bill saved without a class breakdown. */
  unattributed: number;
  /** Students whose family discount is still being decided: their figures are provisional. */
  provisional: number;
  /** An unanswered student with no known class: no class's figure can be trusted. */
  allUnknown: boolean;
}

const figure = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * `asked` is the roster sent to the function; `enrolledClasses` maps each
 * student to the classes they were enrolled in that month, used only to
 * know which classes an unanswered student would have touched.
 */
export function tuitionByClass(
  results: ClassTuitionResult[] | null | undefined,
  asked: readonly string[],
  enrolledClasses: ReadonlyMap<string, readonly string[]>,
): ClassTuitionSplit | null {
  if (!Array.isArray(results)) return null;

  const byClass = new Map<string, ClassTuition>();
  const answered = new Set<string>();
  let unattributed = 0;
  let provisional = 0;

  for (const r of results) {
    if (!r?.studentId || r.error || !Array.isArray(r.classNet)) continue;
    const lines = r.classNet;
    if (lines.some((l) => !l?.class_id || figure(l.gross_vnd) === null || figure(l.net_vnd) === null)) continue;
    answered.add(r.studentId);
    if (r.siblingUnresolved) provisional += 1;

    let carried = 0;
    for (const l of lines) {
      const gross = l.gross_vnd as number;
      const net = l.net_vnd as number;
      carried += net;
      if (gross <= 0 && net <= 0) continue;
      const row = byClass.get(l.class_id as string) ?? { gross: 0, net: 0, students: 0 };
      row.gross += gross;
      row.net += net;
      row.students += 1;
      byClass.set(l.class_id as string, row);
    }
    const charged = figure(r.totalAmount);
    if (charged !== null && charged > carried) unattributed += charged - carried;
  }

  const unanswered = asked.filter((id) => !answered.has(id));
  const unknownClasses = new Set<string>();
  let allUnknown = false;
  for (const id of unanswered) {
    const classes = enrolledClasses.get(id) ?? [];
    // Nowhere to place them: leaving them out would understate some class
    // while every row looked complete.
    if (classes.length === 0) allUnknown = true;
    for (const classId of classes) {
      unknownClasses.add(classId);
      byClass.delete(classId);
    }
  }

  return { byClass, unknownClasses, unanswered, unattributed, provisional, allUnknown };
}
