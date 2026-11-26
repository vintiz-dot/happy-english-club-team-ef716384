/**
 * What the Reports > Checks page asks an admin to do, one problem at a time (pure, no React).
 *
 * The checks themselves are the database's and the functions' (tuition_bill_gaps, the
 * pending-change views, attendance_evidence_gaps, calculate-tuition-bulk); this file decides
 * which of their rows are a problem NOW and words each one: what is wrong, why it matters,
 * the figures that show it, and what fixes it. The red badge in the menu is the length of
 * the same list (`buildProblems`), so the badge and the page can never disagree.
 *
 * Owner, 26 Nov 2026: the badge said 6 and nothing on the page said what the 6 were (six
 * October bills, five of which already charged the right total). A problem that is not on
 * the page with its reason and its fix is not counted.
 *
 * Not counted:
 * - a bill held for lessons with no mark: the register is what to fix, and the bill card says so;
 * - a closed month's bill that today's pricing gives the same total for (only the base/discount
 *   split differs, the old "class fee less a Rate Adjustment" way): nobody is charged wrongly;
 * - a closed month's difference an admin chose to keep as charged (remembered per figures, so a
 *   new difference comes back);
 * - a check that could not run: it becomes a note, never a number.
 */
import { formatVND } from "./money";
import { GAP_NEEDS_PERSON, removalAdvice, type GapRow } from "./attendanceProof";
import type { HeldBillRow } from "./closedMonthChanges";

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

/* ------------------------------------------------------------------ months */

/** Hanoi's bill refresh reprices last month only in its first five days (`_lib/bill-refresh.ts`). */
export const PREVIOUS_MONTH_GRACE_DAYS = 5;

export function monthName(month: string): string {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [y, m] = month.split("-").map(Number);
  return names[m - 1] ? `${names[m - 1]} ${y}` : month;
}

/* ------------------------------------------------------------------ problems */

/** One thing a person can do about a problem. The screen carries it out; nothing here calls anything. */
export type ProblemAction =
  /** calculate-tuition for one child and an open month: saves the bill from the register. */
  | { kind: "save_bill"; studentId: string; month: string }
  /** calculate-tuition with force + reason: a closed month's bill takes today's figures. */
  | { kind: "approve_closed"; row: HeldBillRow }
  /** Remember (this browser) that the bill as charged is right; it comes back if the figures move. */
  | { kind: "keep_closed"; keepKey: string }
  /** guarded-change-refresh / manage-session refresh-tuition: finish a checked change. */
  | { kind: "finish_change"; changeKind: "money" | "lesson"; overrideId: string }
  /** mark-attendance Present (and refresh the bill if the mark was Excused). */
  | { kind: "mark_present"; sessionId: string; studentId: string; studentName: string; currentStatus: string | null; month: string }
  /** A page where the fix is made by hand. */
  | { kind: "open"; href: string; label: string };

export interface Problem {
  key: string;
  area: "bill" | "change" | "attendance";
  /** One line: who, when, what. */
  title: string;
  /** Why it matters, in a sentence or two. */
  why: string;
  /** The figures and facts that show it. */
  evidence: Array<{ label: string; value: string }>;
  /** Sentences from the calculator on what moved (closed months). */
  reasons: string[];
  /** What fixes it, in words; the actions are the buttons for it. */
  fix: string;
  actions: ProblemAction[];
}

export type PendingChange = {
  kind: "money" | "lesson";
  override_id: string;
  created_at: string;
  label: string;
  refresh_pairs: Array<{ student_id: string; month: string }>;
};

/** What calculate-tuition-bulk said about a closed month's listed bill. */
export type ClosedVerdict =
  | { state: "same" }
  | { state: "held"; row: HeldBillRow }
  | { state: "unknown"; error: string };

export interface ProblemInput {
  /** YYYY-MM, Hanoi. */
  current: string;
  previous: string;
  /** Is last month still repriced by the hourly refresh (first five days)? */
  previousOpen: boolean;
  bills: Array<{ month: string; rows: BillGap[]; run: BillRun | null }>;
  /** By `${studentId}|${month}`, for the listed bills of a closed month. */
  closed: Map<string, ClosedVerdict>;
  pending: PendingChange[];
  attendance: GapRow[];
  /** keepKey values an admin chose to keep as charged. */
  kept: Set<string>;
}

export interface ProblemReport {
  problems: Problem[];
  /** Checks that could not give an answer, in sentences. Never counted. */
  notes: string[];
}

const vnd = (n: number | null | undefined) => formatVND(n, { fallback: "none" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const day = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${monthName(`${m[1]}-${m[2]}`)}`;
};

/** The key a "keep as charged" answer is remembered under: the bill AND both figures. */
export function keepKey(row: Pick<HeldBillRow, "studentId" | "month" | "savedTotal" | "newTotal">): string {
  return `${row.studentId}|${row.month}|${row.savedTotal}|${row.newTotal}`;
}

const tuitionPage = (studentId: string, month: string): ProblemAction => ({
  kind: "open",
  href: `/students/${studentId}/tuition?month=${month}`,
  label: "Open the bill",
});

function billProblem(g: BillGap, month: string, run: BillRun | null): Problem {
  const failed = (run?.failed ?? []).find((f) => f.student_id === g.student_id);
  const evidence: Problem["evidence"] = [
    { label: "Lessons the register bills", value: String(g.billable_lessons) },
    { label: "Register, before discounts", value: vnd(g.expected_base) },
    { label: "Saved bill, before discounts", value: g.saved_base == null ? "no bill" : vnd(g.saved_base) },
  ];
  if (g.saved_total != null) evidence.push({ label: "Saved bill, to pay", value: vnd(g.saved_total) });
  if (run) {
    evidence.push({
      label: "Last automatic save",
      value: failed ? `${day(run.ran_at)}: failed (${failed.error})` : `${day(run.ran_at)}: did not fix it`,
    });
  }
  const confirmed = g.confirmation_status === "confirmed";
  const name = monthName(month);
  let why: string;
  if (g.problem === "missing") {
    why = `${g.full_name} has ${plural(g.billable_lessons, "lesson", "lessons")} in ${name} that the register bills, but no bill is saved. The family sees nothing to pay for ${name}, and any credit they paid ahead is not used.`;
  } else if (g.problem === "zero") {
    why = `The saved bill for ${name} is 0, but the register bills ${plural(g.billable_lessons, "lesson", "lessons")} worth ${vnd(g.expected_base)} before discounts. The family is told they owe nothing.`;
  } else {
    const more = (g.saved_base ?? 0) > g.expected_base;
    why = `The saved bill counts ${vnd(g.saved_base)} of lessons, the register ${vnd(g.expected_base)}: the family is being asked for ${more ? "more" : "less"} than the lessons they had. A mark, an enrolment or a price changed after the bill was saved.`;
  }
  return {
    key: `bill|${g.student_id}|${month}`,
    area: "bill",
    title: `${g.full_name}, ${name}: ${g.problem === "missing" ? "no bill" : g.problem === "zero" ? "bill is 0" : "bill does not match the register"}`,
    why,
    evidence,
    reasons: [],
    fix: `Save the bill again from the register. Every discount is applied and payments stay.${confirmed ? " This bill was confirmed, so it goes back to review if its figures change." : ""}${failed ? " The last automatic try failed with the error above; if saving fails again, open the bill to see why." : ""}`,
    actions: [{ kind: "save_bill", studentId: g.student_id, month }, tuitionPage(g.student_id, month)],
  };
}

function closedProblem(row: HeldBillRow): Problem {
  const name = monthName(row.month);
  const up = row.difference > 0;
  return {
    key: `closed|${row.studentId}|${row.month}`,
    area: "bill",
    title: `${row.name}, ${name}: charged ${vnd(row.savedTotal)}, today's pricing gives ${vnd(row.newTotal)}`,
    why: `${name} is closed, so its bill stays as it was charged. Today's register and discounts give a different total: the family was charged ${vnd(Math.abs(row.difference))} ${up ? "less" : "more"} than the lessons and discounts now on record.`,
    evidence: [
      { label: "Charged", value: `${vnd(row.savedBase)} of lessons, less ${vnd(row.savedDiscount)} = ${vnd(row.savedTotal)}` },
      { label: "Today's pricing", value: `${vnd(row.newBase)} of lessons, less ${vnd(row.newDiscount)} = ${vnd(row.newTotal)}` },
      { label: "Paid on this bill", value: vnd(row.paid) },
    ],
    reasons: row.changes?.reasons?.length ? row.changes.reasons : row.message ? [row.message] : [],
    fix: `Decide which is right. If today's figure is, approve it with a reason: the payment stays and the difference becomes ${up ? "a balance owed" : "credit"}. If the bill as charged is right (the register was changed afterwards by mistake, or the family agreed that price), keep it.`,
    actions: [{ kind: "approve_closed", row }, { kind: "keep_closed", keepKey: keepKey(row) }, tuitionPage(row.studentId, row.month)],
  };
}

function changeProblem(p: PendingChange): Problem {
  const months = [...new Set(p.refresh_pairs.map((r) => r.month))].sort();
  const children = new Set(p.refresh_pairs.map((r) => r.student_id)).size;
  return {
    key: `change|${p.kind}|${p.override_id}`,
    area: "change",
    title: `${p.label} on ${day(p.created_at)}: its bills were not worked out again`,
    why: `The change was saved, but repricing the ${plural(p.refresh_pairs.length, "bill", "bills")} it touches failed. Until it is finished those bills may still show the figures from before the change.`,
    evidence: [
      { label: "Bills it touches", value: `${p.refresh_pairs.length} (${plural(children, "child", "children")})` },
      { label: "Months", value: months.map(monthName).join(", ") || "none" },
      { label: "Saved", value: day(p.created_at) },
    ],
    reasons: [],
    fix: "Finish the change: every bill it touches is worked out again and the change records it.",
    actions: [{ kind: "finish_change", changeKind: p.kind, overrideId: p.override_id }],
  };
}

const PROOF_WORD: Record<string, string> = {
  individual_points: "points given to this child alone in the lesson",
  speaker_mark: "a teacher's speaker mark naming this child",
};

function attendanceProblem(g: GapRow): Problem {
  const lesson = `${g.class_name ?? "a class"} on ${day(g.lesson_date)}`;
  const proof = g.summary || g.proof_kinds.map((k) => PROOF_WORD[k] ?? k).join(", ") || "proof the child was there";
  const month = g.lesson_date.slice(0, 7);
  const evidence: Problem["evidence"] = [
    { label: "Lesson", value: lesson },
    { label: "Mark in the register", value: g.current_status ?? "none" },
    { label: "Proof", value: proof },
  ];
  const removeAward = `If that proof belongs to another child, ${removalAdvice(g.proof_kinds)}; the register then stands.`;
  if (g.kind === "proof_contradicts_person") {
    const excused = g.current_status === "Excused";
    return {
      key: `att|${g.kind}|${g.session_id}|${g.student_id}`,
      area: "attendance",
      title: `${g.student_name}, ${lesson}: marked ${g.current_status ?? "absent"} but was in the room`,
      why: `A person marked ${g.student_name} ${g.current_status ?? "absent"}, but the record shows ${proof}. Both cannot be true.${excused ? " Excused lessons are not billed, so if the child was there the family is not charged for a lesson they had." : " The mark is what the child's record and reports show."}`,
      evidence,
      reasons: [],
      fix: `If ${g.student_name} was there, mark them present${excused ? " (the bill is worked out again)" : ""}. ${removeAward}`,
      actions: [
        { kind: "mark_present", sessionId: g.session_id, studentId: g.student_id, studentName: g.student_name, currentStatus: g.current_status, month },
        { kind: "open", href: `/students/${g.student_id}`, label: "Open the child" },
      ],
    };
  }
  if (g.kind === "proof_not_enrolled") {
    return {
      key: `att|${g.kind}|${g.session_id}|${g.student_id}`,
      area: "attendance",
      title: `${g.student_name}, ${lesson}: in the room but not enrolled that day`,
      why: `The record shows ${proof}, but ${g.student_name} has no enrolment in ${g.class_name ?? "this class"} on that day. A lesson outside an enrolment is never billed, so either the enrolment dates are wrong (the family is not charged for lessons the child had) or the points went to the wrong child.`,
      evidence,
      reasons: [],
      fix: `If ${g.student_name} really joined, correct the enrolment's start or end date on the child's page. ${removeAward}`,
      actions: [{ kind: "open", href: `/students/${g.student_id}`, label: "Open the child" }],
    };
  }
  return {
    key: `att|${g.kind}|${g.session_id}|${g.student_id}`,
    area: "attendance",
    title: `${g.student_name}, ${lesson}: the lesson is cancelled, but the child was in the room`,
    why: `${lesson} is marked cancelled, so nobody is billed for it and the teacher is not paid for it, but the record shows ${proof}. The lesson may have been held after all.`,
    evidence,
    reasons: [],
    fix: `If the lesson was held, un-cancel it on the Schedule (the marks it had come back). ${removeAward}`,
    actions: [
      g.class_id
        ? { kind: "open", href: `/admin/classes/${g.class_id}`, label: "Open the class" }
        : { kind: "open", href: "/schedule", label: "Open the Schedule" },
      { kind: "open", href: `/students/${g.student_id}`, label: "Open the child" },
    ],
  };
}

/** Every problem to show now, in the order to work them: money first, oldest month first. */
export function buildProblems(input: ProblemInput): ProblemReport {
  const problems: Problem[] = [];
  const notes: string[] = [];

  for (const b of [...input.bills].sort((a, c) => a.month.localeCompare(c.month))) {
    const open = b.month === input.current || (b.month === input.previous && input.previousOpen);
    for (const g of wrongBills(b.rows, b.run)) {
      if (open) {
        problems.push(billProblem(g, b.month, b.run));
        continue;
      }
      const v = input.closed.get(`${g.student_id}|${b.month}`);
      if (!v) {
        notes.push(`${g.full_name}, ${monthName(b.month)}: still being checked against today's pricing.`);
      } else if (v.state === "unknown") {
        notes.push(`${g.full_name}, ${monthName(b.month)}: could not be checked against today's pricing (${v.error}).`);
      } else if (v.state === "held" && !input.kept.has(keepKey(v.row))) {
        problems.push(closedProblem(v.row));
      }
      // "same": charged the right total; only the base/discount split is the old one. Not a problem.
    }
  }

  for (const p of input.pending) problems.push(changeProblem(p));
  for (const g of input.attendance) if (GAP_NEEDS_PERSON.includes(g.kind)) problems.push(attendanceProblem(g));

  return { problems, notes };
}

/** A few words per problem for the badge's hover title and screen-reader label. */
export function problemLines(problems: Problem[], max = 5): string[] {
  const lines = problems.slice(0, max).map((p) => p.title);
  if (problems.length > max) lines.push(`and ${problems.length - max} more`);
  return lines;
}
