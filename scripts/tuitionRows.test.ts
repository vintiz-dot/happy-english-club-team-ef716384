import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  BEING_CALCULATED,
  NOT_AVAILABLE,
  carriedIn,
  carriedOut,
  figureText,
  largestFirst,
  tuitionFigures,
  tuitionStatusInput,
  type TuitionFunctionResult,
} from "../src/lib/tuitionRows";

const fmt = (n: number) => `${n} d`;

/** calculate-tuition-bulk's shape for one student (index.ts, results.push). */
const answer = (over: Partial<TuitionFunctionResult> = {}, carry: Record<string, unknown> = {}): TuitionFunctionResult => ({
  studentId: "s1",
  baseAmount: 1440000,
  totalDiscount: 0,
  totalAmount: 1440000,
  payments: { monthPayments: 0 },
  carry: { carryInCredit: 0, carryInDebt: 0, carryOutCredit: 0, carryOutDebt: 1440000, settledInMonth: null, ...carry },
  invoiceId: "inv-1",
  invoiceStatus: "issued",
  confirmationStatus: "auto_approved",
  ...over,
});

describe("the function's figures are handed over, not worked out", () => {
  test("every figure is the number the function sent", () => {
    const f = tuitionFigures(answer({ baseAmount: 1600000, totalDiscount: 160000, totalAmount: 1440000, payments: { monthPayments: 500000 } },
      { carryInDebt: 1000000, carryOutDebt: 1940000 }));
    expect(f).toMatchObject({ state: "ready", base: 1600000, discount: 160000, charge: 1440000, paid: 500000,
      carryInCredit: 0, carryInDebt: 1000000, carryOutCredit: 0, carryOutDebt: 1940000 });
  });

  test("figures that do not add up are passed on untouched - the mapping never corrects the function", () => {
    // 1,440,000 charged, 1,000,000 carried in, nothing paid: a browser would
    // 'know' 2,440,000 is owed. The function said 7.
    const f = tuitionFigures(answer({}, { carryInDebt: 1000000, carryOutDebt: 7 }));
    expect(carriedOut(f)).toEqual({ kind: "owed", amount: 7 });
    expect(carriedIn(f)).toEqual({ kind: "owed", amount: 1000000 });
  });

  test("no payable is made up: it is the function's own or nothing", () => {
    expect(tuitionFigures(answer({}, { carryInDebt: 1000000 })).payable).toBeNull();
    expect(tuitionFigures(answer({}, { carryInDebt: 1000000, payable: 2440000 })).payable).toBe(2440000);
  });

  test("the module contains no arithmetic on money", () => {
    const code = readFileSync(new URL("../src/lib/tuitionRows.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Math\.|\.reduce\(|[\w)\]]\s[+*/-]\s[\w(]|\+=|-=|-[a-z(]/);
  });
});

describe("prior balance and balance are worded from the carry the function sent", () => {
  test("debt carried in reads as owed, credit as credit, neither as none", () => {
    expect(carriedIn(tuitionFigures(answer({}, { carryInDebt: 700000 })))).toEqual({ kind: "owed", amount: 700000 });
    expect(carriedIn(tuitionFigures(answer({}, { carryInCredit: 560000 })))).toEqual({ kind: "credit", amount: 560000 });
    expect(carriedIn(tuitionFigures(answer()))).toEqual({ kind: "none", amount: null });
  });

  test("the balance is the carry-out", () => {
    expect(carriedOut(tuitionFigures(answer()))).toEqual({ kind: "owed", amount: 1440000 });
    expect(carriedOut(tuitionFigures(answer({}, { carryOutDebt: 0, carryOutCredit: 60000 })))).toEqual({ kind: "credit", amount: 60000 });
    expect(carriedOut(tuitionFigures(answer({}, { carryOutDebt: 0 })))).toEqual({ kind: "none", amount: null });
  });

  test("the status is judged on the function's carry-out, with the month a debt was settled in", () => {
    expect(tuitionStatusInput(tuitionFigures(answer({ payments: { monthPayments: 440000 } }, { carryOutDebt: 1000000, settledInMonth: "2026-12" }))))
      .toEqual({ carryOutDebt: 1000000, carryOutCredit: 0, totalAmount: 1440000, monthPayments: 440000, settledInMonth: "2026-12" });
  });
});

describe("a frozen bill", () => {
  test("shows the saved figures the function reports, whatever the register says", () => {
    const f = tuitionFigures(answer({ baseAmount: 900000, totalDiscount: 90000, totalAmount: 810000, tuitionFrozen: true }, { carryOutDebt: 810000 }));
    expect(f).toMatchObject({ state: "ready", frozen: true, base: 900000, discount: 90000, charge: 810000 });
    expect(carriedOut(f)).toEqual({ kind: "owed", amount: 810000 });
  });

  test("the bulk function sends no frozen flag today: the figures still stand", () => {
    const f = tuitionFigures(answer({ totalAmount: 810000 }, { carryOutDebt: 810000 }));
    expect(f.frozen).toBe(false);
    expect(f.charge).toBe(810000);
  });
});

describe("an unresolved family discount", () => {
  for (const [label, over] of [
    ["siblingUnresolved", { siblingUnresolved: true }],
    ["siblingState.status", { siblingState: { status: "unresolved" } }],
  ] as const) {
    test(`${label}: no figure of the provisional bill is shown`, () => {
      const f = tuitionFigures(answer(over));
      expect(f.state).toBe("pending");
      expect([f.base, f.discount, f.charge, f.paid, f.carryInDebt, f.carryOutDebt, f.payable]).toEqual([null, null, null, null, null, null, null]);
      expect(carriedOut(f)).toEqual({ kind: "pending", amount: null });
      expect(carriedIn(f)).toEqual({ kind: "pending", amount: null });
      expect(tuitionStatusInput(f)).toBeNull();
      expect(figureText(f, f.charge, fmt)).toBe(BEING_CALCULATED);
    });
  }

  test("a settled family discount is an ordinary row", () => {
    expect(tuitionFigures(answer({ siblingState: { status: "assigned" }, siblingUnresolved: false })).state).toBe("ready");
  });
});

describe("a missing answer or a missing figure is said, never guessed", () => {
  const missing: Array<[string, TuitionFunctionResult | null | undefined]> = [
    ["no answer for the student", undefined],
    ["null", null],
    ["the function's error row", { studentId: "s1", error: true }],
    ["no carry block", answer({ carry: null })],
    ["carry-out debt missing", answer({}, { carryOutDebt: undefined })],
    ["carry-in credit null", answer({}, { carryInCredit: null })],
    ["charge missing", answer({ totalAmount: undefined })],
    ["payments missing", answer({ payments: null })],
    ["a figure that is text", answer({ totalAmount: "1440000" as unknown as number })],
    ["a figure that is NaN", answer({}, { carryOutDebt: Number.NaN })],
  ];
  for (const [label, result] of missing) {
    test(label, () => {
      const f = tuitionFigures(result);
      expect(f.state).toBe("unavailable");
      expect(carriedIn(f).kind).toBe("unavailable");
      expect(carriedOut(f).kind).toBe("unavailable");
      expect(tuitionStatusInput(f)).toBeNull();
      // Not 0, and not the half of the answer that did arrive.
      expect([f.base, f.charge, f.paid, f.carryInCredit, f.carryInDebt, f.carryOutCredit, f.carryOutDebt]).toEqual([null, null, null, null, null, null, null]);
      expect(figureText(f, f.charge, fmt)).toBe(NOT_AVAILABLE);
    });
  }

  test("a real zero is a figure, not a gap", () => {
    const f = tuitionFigures(answer({ baseAmount: 0, totalAmount: 0 }, { carryOutDebt: 0 }));
    expect(f.state).toBe("ready");
    expect(figureText(f, f.charge, fmt)).toBe("0 d");
    expect(carriedOut(f)).toEqual({ kind: "none", amount: null });
  });

  test("who the bill is and how it was confirmed survive a failed calculation", () => {
    expect(tuitionFigures({ studentId: "s1", error: true, invoiceId: "inv-9", confirmationStatus: "confirmed" }))
      .toMatchObject({ state: "unavailable", invoiceId: "inv-9", confirmationStatus: "confirmed" });
  });
});

describe("sorting compares, it does not subtract", () => {
  test("largest first, rows without a figure last", () => {
    expect([500, null, 2000, 0, null, 1500].sort(largestFirst)).toEqual([2000, 1500, 500, 0, null, null]);
    expect(largestFirst(7, 7)).toBe(0);
  });
});
