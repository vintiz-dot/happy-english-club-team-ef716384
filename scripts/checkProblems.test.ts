import { describe, expect, test } from "bun:test";
import { checkLines, checkTotal, heldBillMessages, wrongBills, type BillGap, type BillRun } from "../src/lib/checkProblems";

const gap = (id: string, extra: Partial<BillGap> = {}): BillGap => ({
  student_id: id, full_name: `Child ${id}`, is_active: true, problem: "missing", billable_lessons: 4,
  expected_base: 840000, saved_base: null, saved_total: null, confirmation_status: null, ...extra,
});
const run = (stillOpen: BillGap[]): BillRun => ({ ran_at: "2026-11-25T08:20:00Z", started_by: "timer", found: stillOpen.length, recalculated: 0, failed: [], still_open: stillOpen });

describe("which bills are a problem to look at now", () => {
  test("every listed bill counts when no run has held any", () => {
    expect(wrongBills([gap("a"), gap("b")], null).map((g) => g.student_id)).toEqual(["a", "b"]);
    expect(wrongBills([gap("a")], run([])).length).toBe(1);
  });

  test("a bill held for lessons with no mark is the register's to fix, not a wrong bill", () => {
    const held = gap("b", { held: { lessons: 2, message: "2 lessons have no mark" } });
    const noted = gap("c", { note: { lessons: 1, message: "1 lesson has no mark, charged as before" } });
    const r = run([held, noted, gap("a")]);
    expect(wrongBills([gap("a"), gap("b"), gap("c")], r).map((g) => g.student_id)).toEqual(["a"]);
    expect([...heldBillMessages(r).keys()].sort()).toEqual(["b", "c"]);
  });
});

describe("the badge's count and words", () => {
  test("it adds the three kinds and shows nothing at zero", () => {
    expect(checkTotal({ wrongBills: 0, pendingChanges: 0, needsPerson: 0 })).toBe(0);
    expect(checkLines({ wrongBills: 0, pendingChanges: 0, needsPerson: 0 })).toEqual([]);
    expect(checkTotal({ wrongBills: 2, pendingChanges: 1, needsPerson: 3 })).toBe(6);
  });

  test("each kind has its own sentence, singular and plural", () => {
    expect(checkLines({ wrongBills: 1, pendingChanges: 1, needsPerson: 1 })).toEqual([
      "1 bill is missing or wrong",
      "1 change has bills not worked out again",
      "1 lesson needs a person to decide the attendance",
    ]);
    expect(checkLines({ wrongBills: 3, pendingChanges: 2, needsPerson: 0 })).toEqual([
      "3 bills are missing or wrong",
      "2 changes have bills not worked out again",
    ]);
  });
});
