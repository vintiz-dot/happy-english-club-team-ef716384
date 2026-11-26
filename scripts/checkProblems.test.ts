import { describe, expect, test } from "bun:test";
import {
  buildProblems, heldBillMessages, keepKey, problemLines, wrongBills,
  type BillGap, type BillRun, type ClosedVerdict, type ProblemInput,
} from "../src/lib/checkProblems";
import type { HeldBillRow } from "../src/lib/closedMonthChanges";
import type { GapRow } from "../src/lib/attendanceProof";

const gap = (id: string, extra: Partial<BillGap> = {}): BillGap => ({
  student_id: id, full_name: `Child ${id}`, is_active: true, problem: "missing", billable_lessons: 4,
  expected_base: 840000, saved_base: null, saved_total: null, confirmation_status: null, ...extra,
});
const run = (stillOpen: BillGap[], failed: BillRun["failed"] = []): BillRun => ({
  ran_at: "2026-11-25T08:20:00Z", started_by: "timer", found: stillOpen.length, recalculated: 0, failed, still_open: stillOpen,
});
const held = (id: string, saved: number, today: number): HeldBillRow => ({
  studentId: id, name: `Child ${id}`, month: "2026-10", savedBase: saved, savedDiscount: 0, savedTotal: saved,
  newBase: today, newDiscount: 0, newTotal: today, difference: today - saved, paid: saved, message: "",
  changes: null,
});
const att = (kind: GapRow["kind"], extra: Partial<GapRow> = {}): GapRow => ({
  kind, session_id: "s1", student_id: "a", student_name: "Child a", class_id: "c1", class_name: "Venus",
  lesson_date: "2026-11-20", current_status: "Absent", marked_by_person: true, proof_kinds: ["individual_points"],
  summary: "", ...extra,
});
const input = (over: Partial<ProblemInput> = {}): ProblemInput => ({
  current: "2026-11", previous: "2026-10", previousOpen: false, bills: [], closed: new Map(),
  pending: [], attendance: [], kept: new Set(), ...over,
});

describe("which bills are a problem to look at now", () => {
  test("every listed bill counts when no run has held any", () => {
    expect(wrongBills([gap("a"), gap("b")], null).map((g) => g.student_id)).toEqual(["a", "b"]);
    expect(wrongBills([gap("a")], run([])).length).toBe(1);
  });

  test("a bill held for lessons with no mark is the register's to fix, not a wrong bill", () => {
    const h = gap("b", { held: { lessons: 2, message: "2 lessons have no mark" } });
    const noted = gap("c", { note: { lessons: 1, message: "1 lesson has no mark, charged as before" } });
    const r = run([h, noted, gap("a")]);
    expect(wrongBills([gap("a"), gap("b"), gap("c")], r).map((g) => g.student_id)).toEqual(["a"]);
    expect([...heldBillMessages(r).keys()].sort()).toEqual(["b", "c"]);
  });
});

describe("every counted problem says why, shows figures and has a fix", () => {
  test("an open month's missing bill: the reason, the figures, a save button and the last failure", () => {
    const r = buildProblems(input({
      bills: [{ month: "2026-11", rows: [gap("a")], run: run([gap("a")], [{ student_id: "a", name: "Child a", error: "timeout" }]) }],
    }));
    expect(r.problems.length).toBe(1);
    const p = r.problems[0];
    expect(p.title).toBe("Child a, November 2026: no bill");
    expect(p.why).toContain("no bill is saved");
    expect(p.evidence.map((e) => e.label)).toContain("Register, before discounts");
    expect(p.evidence.find((e) => e.label === "Last automatic save")?.value).toContain("timeout");
    expect(p.actions[0]).toEqual({ kind: "save_bill", studentId: "a", month: "2026-11" });
  });

  test("a confirmed bill that differs says it goes back to review", () => {
    const g = gap("a", { problem: "differs", saved_base: 1890000, saved_total: 1890000, expected_base: 1620000, confirmation_status: "confirmed" });
    const p = buildProblems(input({ bills: [{ month: "2026-11", rows: [g], run: null }] })).problems[0];
    expect(p.why).toContain("more");
    expect(p.fix).toContain("goes back to review");
  });

  test("last month is open in its first five days, and its bills are saved like this month's", () => {
    const r = buildProblems(input({ previousOpen: true, bills: [{ month: "2026-10", rows: [gap("a")], run: null }] }));
    expect(r.problems[0].actions[0]).toEqual({ kind: "save_bill", studentId: "a", month: "2026-10" });
  });
});

describe("a closed month: only a real difference counts (owner, 26 Nov 2026: 6 on the badge, nothing on the page)", () => {
  const rows = [gap("same", { problem: "differs" }), gap("held", { problem: "differs" }), gap("unknown", { problem: "differs" }), gap("pending", { problem: "differs" })];
  const closed = new Map<string, ClosedVerdict>([
    ["same|2026-10", { state: "same" }],
    ["held|2026-10", { state: "held", row: held("held", 1890000, 1530000) }],
    ["unknown|2026-10", { state: "unknown", error: "503" }],
  ]);

  test("same total today is not a problem; held is; unknown and not-yet-checked are notes, not numbers", () => {
    const r = buildProblems(input({ bills: [{ month: "2026-10", rows, run: null }], closed }));
    expect(r.problems.map((p) => p.key)).toEqual(["closed|held|2026-10"]);
    expect(r.notes.length).toBe(2);
    expect(r.notes.join(" ")).toContain("503");
  });

  test("the held bill shows both figures, the payment, and approve / keep", () => {
    const p = buildProblems(input({ bills: [{ month: "2026-10", rows, run: null }], closed })).problems[0];
    expect(p.evidence.map((e) => e.label)).toEqual(["Charged", "Today's pricing", "Paid on this bill"]);
    expect(p.why).toContain("more");
    expect(p.actions.map((a) => a.kind)).toEqual(["approve_closed", "keep_closed", "open"]);
  });

  test("kept as charged drops it, until the figures move", () => {
    const kept = new Set([keepKey(held("held", 1890000, 1530000))]);
    expect(buildProblems(input({ bills: [{ month: "2026-10", rows, run: null }], closed, kept })).problems.length).toBe(0);
    const moved = new Map(closed);
    moved.set("held|2026-10", { state: "held", row: held("held", 1890000, 1500000) });
    expect(buildProblems(input({ bills: [{ month: "2026-10", rows, run: null }], closed: moved, kept })).problems.length).toBe(1);
  });
});

describe("changes and attendance", () => {
  test("a pending change names its bills and months and has a finish button", () => {
    const p = buildProblems(input({
      pending: [{ kind: "money", override_id: "o1", created_at: "2026-11-20T03:00:00Z", label: "A discount changed (update)",
        refresh_pairs: [{ student_id: "a", month: "2026-11" }, { student_id: "b", month: "2026-10" }] }],
    })).problems[0];
    expect(p.evidence.find((e) => e.label === "Months")?.value).toBe("October 2026, November 2026");
    expect(p.actions[0]).toEqual({ kind: "finish_change", changeKind: "money", overrideId: "o1" });
  });

  test("only the attendance kinds that need a person count, each with its own reason", () => {
    const r = buildProblems(input({
      attendance: [att("proof_no_mark"), att("proof_contradicts_person", { current_status: "Excused" }), att("proof_not_enrolled"), att("proof_on_cancelled")],
    }));
    expect(r.problems.length).toBe(3);
    const [person, enrol, cancelled] = r.problems;
    expect(person.why).toContain("Excused lessons are not billed");
    expect(person.actions[0].kind).toBe("mark_present");
    expect(person.fix).toContain("point history");
    expect(enrol.why).toContain("no enrolment");
    expect(cancelled.fix).toContain("un-cancel");
  });

  test("the badge's words are the problems' titles", () => {
    const r = buildProblems(input({ bills: [{ month: "2026-11", rows: [gap("a"), gap("b")], run: null }] }));
    expect(problemLines(r.problems)).toEqual(["Child a, November 2026: no bill", "Child b, November 2026: no bill"]);
    expect(problemLines(r.problems, 1)).toEqual(["Child a, November 2026: no bill", "and 1 more"]);
  });
});
