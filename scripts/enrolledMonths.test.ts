import { expect, test } from "bun:test";
import { buildEnrolledMonths, defaultMonth } from "../src/lib/enrolledMonths";

test("every enrolled month is listed, newest first, with no truncation", () => {
  const o = buildEnrolledMonths(
    [{ start_date: "2025-11-15", end_date: "2026-03-10", className: "Mars" }], [], "2026-10");
  expect(o.map((x) => x.value)).toEqual(["2026-03", "2026-02", "2026-01", "2025-12", "2025-11"]);
});

test("an open enrollment runs to the current month", () => {
  const o = buildEnrolledMonths([{ start_date: "2026-08-01", end_date: null, className: "Stars" }], [], "2026-10");
  expect(o.map((x) => x.value)).toEqual(["2026-10", "2026-09", "2026-08"]);
});

test("months with invoices or attendance outside enrollment are kept, class names merged", () => {
  const o = buildEnrolledMonths(
    [{ start_date: "2026-06-01", end_date: "2026-07-31", className: "Mars" },
     { start_date: "2026-07-01", end_date: null, className: "Stars" }],
    [{ month: "2026-04" }], "2026-08");
  expect(o.find((x) => x.value === "2026-07")!.classes).toEqual(["Mars", "Stars"]);
  expect(o.at(-1)!.value).toBe("2026-04");
});

test("default is the current month if enrolled, else the latest enrolled month", () => {
  const inactive = buildEnrolledMonths([{ start_date: "2026-01-01", end_date: "2026-05-20", className: "A" }], [], "2026-10");
  expect(defaultMonth(inactive, "2026-10")).toBe("2026-05");
  const active = buildEnrolledMonths([{ start_date: "2026-01-01", end_date: null, className: "A" }], [], "2026-10");
  expect(defaultMonth(active, "2026-10")).toBe("2026-10");
});
