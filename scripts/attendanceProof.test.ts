import { describe, expect, test } from "bun:test";
import {
  GAP_KINDS, GAP_LABEL, groupGaps, isLocked, isNotInstalled, lockReason, monthsOf, nextStatus,
  parseApplyResult, parseGapRows, parseProofRefusal, parseProofRows, proofRefusalFromBody,
  refusedBatchText, refusedStudentIds, removalAdvice, changesToAbsentOrExcused, firstRows,
} from "../src/lib/attendanceProof";

const SENTENCE = "Robot was in this lesson: 10 Speaking points at 18:13. If that is a mistake, remove it first, then change the mark.";

describe("parseProofRefusal", () => {
  test("plain database error", () => {
    expect(parseProofRefusal({ message: `ATTENDANCE_PROOF: ${SENTENCE}` })).toBe(SENTENCE);
  });
  test("prefix in the middle of a message", () => {
    expect(parseProofRefusal(new Error(`Failed: ATTENDANCE_PROOF: ${SENTENCE}`))).toBe(SENTENCE);
  });
  test("nested edge-function error body", () => {
    const err = { message: "Edge Function returned a non-2xx status code", context: { error: { message: `ATTENDANCE_PROOF: ${SENTENCE}` } } };
    expect(parseProofRefusal(err)).toBe(SENTENCE);
  });
  test("JSON inside a string", () => {
    const s = JSON.stringify({ error: `ATTENDANCE_PROOF: ${SENTENCE}` });
    expect(parseProofRefusal(s)).toBe(SENTENCE);
  });
  test("unrelated or malformed input gives null", () => {
    expect(parseProofRefusal(null)).toBeNull();
    expect(parseProofRefusal(undefined)).toBeNull();
    expect(parseProofRefusal(42)).toBeNull();
    expect(parseProofRefusal({ message: "boom" })).toBeNull();
    expect(parseProofRefusal({ message: "ATTENDANCE_PROOF:   " })).toBeNull();
  });
  test("JSON string with keys after the message", () => {
    const s = JSON.stringify({ message: `ATTENDANCE_PROOF: ${SENTENCE}`, code: "P0001", details: null });
    expect(parseProofRefusal(s)).toBe(SENTENCE);
  });
  test("broken JSON text cut at the next key", () => {
    expect(parseProofRefusal(`{"message":"ATTENDANCE_PROOF: ${SENTENCE}","code":"P0001"}x`)).toBe(SENTENCE);
  });
  test("nested { error: { message } }", () => {
    expect(parseProofRefusal({ error: { message: `ATTENDANCE_PROOF: ${SENTENCE}`, code: "P0001" } })).toBe(SENTENCE);
  });
  test("raw Postgres error object", () => {
    expect(parseProofRefusal({ code: "P0001", details: null, hint: null, message: `ATTENDANCE_PROOF: ${SENTENCE}` })).toBe(SENTENCE);
  });
  test("409 body from mark-attendance", () => {
    expect(proofRefusalFromBody({ error: "attendance_proof", message: "Sentence.", students: [] })).toBe("Sentence.");
    expect(proofRefusalFromBody({ error: "other" })).toBeNull();
    expect(proofRefusalFromBody("x")).toBeNull();
  });
});

describe("lock map", () => {
  const map = parseProofRows([
    { student_id: "a", strength: "proof", kinds: ["individual_points"], summary: "10 Speaking points at 18:13" },
    { student_id: "b", strength: "indication", kinds: ["batch_points"], summary: "Class points" },
    { student_id: "a", strength: "indication", kinds: ["batch_points"], summary: "later row" },
    { student_id: 5, strength: "proof" },
    null,
  ]);
  test("proof locks, indication never does", () => {
    expect(isLocked(map, "a")).toBe(true);
    expect(isLocked(map, "b")).toBe(false);
    expect(isLocked(map, "zzz")).toBe(false);
    expect(lockReason(map, "b")).toBeNull();
  });
  test("an indication row does not downgrade proof", () => {
    expect(map.get("a")?.summary).toBe("10 Speaking points at 18:13");
  });
  test("reason sentence", () => {
    expect(lockReason(map, "a")).toBe("In class: 10 Speaking points at 18:13. If that was a mistake, delete it in the child's point history, then change the mark.");
  });
  test("empty and malformed input", () => {
    expect(parseProofRows(undefined).size).toBe(0);
    expect(parseProofRows("nope").size).toBe(0);
    expect(isLocked(undefined, "a")).toBe(false);
    expect(lockReason(null, "a")).toBeNull();
  });
  test("tap cycle skips Absent and Excused when locked", () => {
    expect(nextStatus("Present", true)).toBe("Present");
    expect(nextStatus("Present", false)).toBe("Absent");
    expect(nextStatus("Excused", false)).toBe("Present");
  });
});

describe("removal advice", () => {
  test("by kind", () => {
    expect(removalAdvice(["individual_points"])).toBe("delete it in the child's point history");
    expect(removalAdvice(["speaker_mark"])).toBe("use Undo on the lesson's speakers page");
    expect(removalAdvice(["individual_points", "speaker_mark"])).toContain(" or ");
    expect(removalAdvice(["something_else"])).toBe("remove it first");
    expect(removalAdvice(undefined)).toBe("remove it first");
  });
  test("lock reason uses the kinds", () => {
    const m = parseProofRows([{ student_id: "a", strength: "proof", kinds: ["speaker_mark"], summary: "Spoke at 18:13" }]);
    expect(lockReason(m, "a")).toBe("In class: Spoke at 18:13. If that was a mistake, use Undo on the lesson's speakers page, then change the mark.");
  });
  test("only a change to Absent or Excused is refused", () => {
    expect(changesToAbsentOrExcused(null, "Absent")).toBe(true);
    expect(changesToAbsentOrExcused("Present", "Excused")).toBe(true);
    expect(changesToAbsentOrExcused("Absent", "Absent")).toBe(false);
    expect(changesToAbsentOrExcused("Absent", "Present")).toBe(false);
    expect(changesToAbsentOrExcused(null, "Late")).toBe(false);
  });
});

describe("long lists", () => {
  test("first rows", () => {
    expect(firstRows([1, 2, 3], 2)).toEqual([1, 2]);
    expect(firstRows([1], 50)).toEqual([1]);
    expect(firstRows([1, 2], -1)).toEqual([]);
  });
});

describe("batch refusals", () => {
  test("ids and sentence", () => {
    const data = { success: true, refused: [{ student_id: "a", summary: "10 points" }, "b"] };
    expect(refusedStudentIds(data)).toEqual(["a", "b"]);
    expect(refusedBatchText(data, (id) => (id === "a" ? "Robot" : undefined))).toContain("Robot (10 points)");
    expect(refusedBatchText({ success: true }, () => "x")).toBeNull();
    expect(refusedStudentIds(null)).toEqual([]);
  });
});

describe("admin gaps", () => {
  test("labels exist for all six kinds", () => {
    expect(GAP_KINDS.length).toBe(6);
    for (const k of GAP_KINDS) expect(GAP_LABEL[k].length).toBeGreaterThan(5);
  });
  test("parse and group, dropping malformed rows", () => {
    const rows = parseGapRows([
      { kind: "proof_no_mark", session_id: "s1", student_id: "a", student_name: "A", lesson_date: "2026-11-01" },
      { kind: "made_up", session_id: "s1", student_id: "b" },
      { kind: "no_mark_no_proof", session_id: "s2", student_id: "c" },
      "junk",
    ]);
    expect(rows.length).toBe(2);
    const g = groupGaps(rows);
    expect(g.proof_no_mark.length).toBe(1);
    expect(g.no_mark_no_proof.length).toBe(1);
    expect(g.proof_on_cancelled.length).toBe(0);
    expect(parseGapRows(null)).toEqual([]);
  });
  test("apply result and months", () => {
    const r = parseApplyResult({ dry_run: true, inserted: 3, corrected: 1, left_for_admin: 2,
      affected_months: [{ student_id: "a", month: "2026-11" }, { student_id: "b", month: "2026-10" }, { student_id: "c", month: "2026-11" }, { bad: 1 }] });
    expect(r?.inserted).toBe(3);
    expect(monthsOf(r)).toEqual(["2026-10", "2026-11"]);
    expect(parseApplyResult(null)).toBeNull();
    expect(monthsOf(null)).toEqual([]);
  });
  test("not-installed detection", () => {
    expect(isNotInstalled({ code: "PGRST202", message: "x" })).toBe(false);
    expect(isNotInstalled({ message: "function public.attendance_evidence_gaps(date, date) does not exist" })).toBe(true);
    expect(isNotInstalled({ message: "permission denied" })).toBe(false);
    expect(isNotInstalled({ code: "42883", message: "function other_helper(uuid) does not exist" })).toBe(false);
    expect(isNotInstalled({ code: "PGRST202", message: "Could not find the function public.attendance_evidence_gaps(p_from, p_to)" })).toBe(true);
    expect(isNotInstalled({ message: "relation foo does not exist" })).toBe(false);
    expect(isNotInstalled(null)).toBe(false);
  });
});
