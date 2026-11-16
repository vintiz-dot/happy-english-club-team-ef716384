import { test } from "node:test";
import assert from "node:assert/strict";
import { compareText, containsAll } from "../../src/qa/parity.ts";

test("identical text in a different layout passes", () => {
  assert.ok(compareText("Class\tMovers B\nTeacher  Lan", "Class Movers B Teacher Lan").ok);
});

test("a changed amount fails and is named", () => {
  const r = compareText("Total 2.130.000 ₫", "Total 2.130.001 ₫");
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["2.130.000"]);
  assert.deepEqual(r.unexpected, ["2.130.001"]);
});

test("case and diacritics matter", () => {
  assert.equal(compareText("Class", "CLASS").ok, false);
  assert.equal(compareText("Hương", "Huong").ok, false);
});

test("reordered content fails", () => {
  assert.equal(compareText("Paid Balance", "Balance Paid").ok, false);
});

test("registered brand strings may be added; anything else may not", () => {
  assert.ok(compareText("Due Date", "Homework Due Date With warm regards,", ["Homework", "With warm regards,"]).ok);
  assert.equal(compareText("Due Date", "Due Date Pay now!").ok, false);
});

test("PDF containment ignores order and whitespace but counts repeats", () => {
  assert.ok(containsAll("a b a", "b\na a").ok);
  assert.deepEqual(containsAll("a a", "a").missing, ["a (x1)"]);
});
