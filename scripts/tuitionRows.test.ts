import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  BEING_CALCULATED,
  NOT_AVAILABLE,
  carriedIn,
  carriedOut,
  figureText,
  largestFirst,
  payableFromFunction,
  tuitionFigures,
  tuitionRowCells,
  tuitionStatusInput,
  type TuitionFunctionResult,
} from "../src/lib/tuitionRows";
import { liveTuitionItem } from "../src/lib/liveTuitionItem";

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

const student = { id: "s1", full_name: "Made Up", family_id: null, avatar_url: null, is_active: true };
const badges = { classes: [], hasDiscount: false, hasSiblings: false };

describe("Payable: the function's carry.payable, or the older function's three figures", () => {
  test("a function that sends carry.payable: that number, even if a sum would say otherwise", () => {
    const data = answer({}, { carryInDebt: 1000000, carryOutDebt: 2440000, payable: 7 });
    expect(payableFromFunction(data)).toBe(7);
    expect(liveTuitionItem(student, data, "2026-11", badges).finalPayable).toBe(7);
    expect(tuitionRowCells(tuitionFigures(data), fmt, 999).payable.text).toBe("7 d");
  });

  test("a payable of 0 is a figure and is used", () => {
    const data = answer({}, { carryInCredit: 1440000, carryOutDebt: 0, payable: 0 });
    expect(liveTuitionItem(student, data, "2026-11", badges).finalPayable).toBe(0);
    expect(tuitionRowCells(tuitionFigures(data), fmt, 999).payable.text).toBe("0 d");
  });

  test("a function that predates carry.payable, debt carried in: charge plus the debt", () => {
    const data = answer({}, { carryInDebt: 1000000, carryOutDebt: 2440000 });
    expect(payableFromFunction(data)).toBeNull();
    const item = liveTuitionItem(student, data, "2026-11", badges);
    expect(item.finalPayable).toBe(2440000);
    expect(tuitionRowCells(tuitionFigures(data), fmt, item.finalPayable).payable.text).toBe("2440000 d");
  });

  test("a function that predates carry.payable, credit carried in: charge less the credit", () => {
    const data = answer({}, { carryInCredit: 560000, carryOutDebt: 880000 });
    expect(liveTuitionItem(student, data, "2026-11", badges).finalPayable).toBe(880000);
  });

  test("the older function's payable less what was paid is the function's carry-out", () => {
    const data = answer({ payments: { monthPayments: 500000 } }, { carryInDebt: 1000000, carryOutDebt: 1940000 });
    const item = liveTuitionItem(student, data, "2026-11", badges);
    expect(item.finalPayable - item.recorded_payment).toBe(item.carry_out_debt - item.carry_out_credit);
  });

  test("neither the function's payable nor an older one: the cell says so", () => {
    expect(tuitionRowCells(tuitionFigures(answer()), fmt).payable.text).toBe(NOT_AVAILABLE);
    expect(tuitionRowCells(tuitionFigures(answer()), fmt, null).payable.text).toBe(NOT_AVAILABLE);
  });

  test("an unresolved or failed row shows no payable, whatever is passed beside it", () => {
    expect(tuitionRowCells(tuitionFigures(answer({ siblingUnresolved: true }, { payable: 1440000 })), fmt, 1440000).payable.text).toBe(BEING_CALCULATED);
    expect(tuitionRowCells(tuitionFigures({ studentId: "s1", error: true }), fmt, 1440000).payable.text).toBe(NOT_AVAILABLE);
  });

  test("the rest of the row is the function's answer under the names the dialogs read", () => {
    const item = liveTuitionItem(student, answer({ payments: { monthPayments: 440000 } }, { carryInDebt: 1000000, carryOutDebt: 2000000, payable: 2440000, settledInMonth: "2026-12" }), "2026-11", badges);
    expect(item).toMatchObject({ id: "inv-1", student_id: "s1", month: "2026-11", base_amount: 1440000, discount_amount: 0, total_amount: 1440000,
      recorded_payment: 440000, carry_in_debt: 1000000, carry_in_credit: 0, carry_out_debt: 2000000, carry_out_credit: 0, settled_in_month: "2026-12" });
  });
});

describe("the two shapes of an unresolved family discount", () => {
  test("the bulk function's flag (since 12 Nov 2026) and the single function's siblingState both hold the row back", () => {
    expect(tuitionFigures(answer({ siblingUnresolved: true })).state).toBe("pending");
    expect(tuitionFigures(answer({ siblingState: { status: "unresolved" } })).state).toBe("pending");
  });
  test("a function that predates the flag sends neither: the row shows its figures, as it always did", () => {
    const old = answer();
    expect("siblingUnresolved" in old).toBe(false);
    expect(tuitionFigures(old).state).toBe("ready");
  });
  test("siblingUnresolved: false is an ordinary row", () => {
    expect(tuitionFigures(answer({ siblingUnresolved: false })).state).toBe("ready");
  });
});

describe("the cells of a row", () => {
  test("each cell shows its own figure", () => {
    // Seven different numbers, so a cell wired to the wrong figure cannot pass.
    const f = tuitionFigures(answer({ baseAmount: 11, totalDiscount: 22, totalAmount: 33, payments: { monthPayments: 44 } },
      { carryInDebt: 55, carryInCredit: 0, carryOutDebt: 66, carryOutCredit: 0, payable: 77 }));
    const c = tuitionRowCells(f, fmt);
    expect(c.base).toEqual({ text: "11 d" });
    expect(c.discount).toEqual({ text: "−22 d", accent: "green" });
    expect(c.prior).toEqual({ text: "55 d", accent: "red" });
    expect(c.payable).toEqual({ text: "77 d" });
    expect(c.paid).toEqual({ text: "44 d", accent: "blue" });
    expect(c.balance).toEqual({ text: "66 d", accent: "red" });
    expect(c.headerBalance).toEqual({ text: "66 d", tone: "owed" });
    expect(c.canRecordPay).toBe(true);
  });

  test("credit is worded with a plus, on both sides of the month", () => {
    const c = tuitionRowCells(tuitionFigures(answer({}, { carryInCredit: 560000, carryOutDebt: 0, carryOutCredit: 60000 })), fmt);
    expect(c.prior).toEqual({ text: "+560000 d", accent: "green" });
    expect(c.balance).toEqual({ text: "+60000 d", accent: "green" });
    expect(c.headerBalance).toEqual({ text: "+60000 d", tone: "credit" });
  });

  test("nothing carried either way: a dash before, zero and Settled after", () => {
    const c = tuitionRowCells(tuitionFigures(answer({}, { carryOutDebt: 0 })), fmt);
    expect(c.prior).toEqual({ text: "—" });
    expect(c.discount).toEqual({ text: "—" });
    expect(c.balance).toEqual({ text: "0 d" });
    expect(c.headerBalance).toEqual({ text: "Settled", tone: "quiet" });
  });

  for (const [label, result, words] of [
    ["no answer", undefined, NOT_AVAILABLE],
    ["an error row", { studentId: "s1", error: true }, NOT_AVAILABLE],
    ["an unresolved family discount", answer({ siblingUnresolved: true }), BEING_CALCULATED],
  ] as const) {
    test(`${label}: every cell says "${words}" and no payment can be recorded`, () => {
      const c = tuitionRowCells(tuitionFigures(result), fmt, 1440000);
      expect([c.base.text, c.discount.text, c.prior.text, c.payable.text, c.paid.text, c.balance.text, c.headerBalance.text]).toEqual(Array(7).fill(words));
      expect(c.headerBalance.tone).toBe("quiet");
      expect(c.canRecordPay).toBe(false);
    });
  }
});

describe("the page itself (src/components/admin/AdminTuitionList.tsx)", () => {
  const page = readFileSync(new URL("../src/components/admin/AdminTuitionList.tsx", import.meta.url), "utf8");
  const code = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  test("each labelled cell is wired to the cell of the same name", () => {
    for (const [label, cell] of [["Base", "base"], ["Discount", "discount"], ["Prior Bal.", "prior"], ["Payable", "payable"], ["Paid", "paid"], ["Balance", "balance"]]) {
      const tag = code.match(new RegExp(`<FinanceCell[^>]*label="${label.replace(".", "\\.")}"[^>]*/>`));
      expect(tag?.[0] ?? `no ${label} cell`).toContain(`value={cells.${cell}.text}`);
    }
    expect(code).toContain("{cells.headerBalance.text}");
    // Exactly the six cells: no seventh figure drawn from somewhere else.
    expect(code.match(/<FinanceCell\s/g)?.length).toBe(6);
  });

  test("Record Pay is off without the function's figures, and while the list is refreshing", () => {
    const button = code.match(/<Button[^>]*onClick=\{onRecordPay\}[^>]*>/);
    expect(button?.[0] ?? "no Record Pay button").toContain("disabled={!cells.canRecordPay || refreshing}");
  });

  test("it reads no invoice row and hands the dialog the row built by liveTuitionItem", () => {
    expect(code).not.toMatch(/from\(\s*["']invoices["']\s*\)/);
    expect(code).toContain("liveTuitionItem(student, answer, month, badges)");
    expect(code).toContain("fetchBulkTuition(allStudentIds, month)");
  });

  test("it contains no arithmetic on money", () => {
    // The three known hits count retries and rows, not money.
    const allowed = ["Math.max(0, query.state.dataUpdateCount - 1)", "settled + overpaid", "tuitionData.length - withDiscount"];
    let rest = code;
    for (const a of allowed) {
      expect(rest.split(a).length).toBe(2); // each is there exactly once
      rest = rest.split(a).join("");
    }
    expect(rest.match(/Math\.\w+|\.reduce\(/g) ?? []).toEqual([]);
    // No + - * / between two operands on a line that names a money figure.
    const money = /(amount|payable|balance|credit|debt|payment|paid|charge|carry|total_|finalPayable|recorded)/i;
    const offenders = rest.split("\n").filter((line) => money.test(line) && /[\w)\]]\s[+*/-]\s[\w(]/.test(line.replace(/"[^"]*"|`[^`]*`|'[^']*'/g, '""')));
    expect(offenders).toEqual([]);
  });
});

describe("sorting compares, it does not subtract", () => {
  test("largest first, rows without a figure last", () => {
    expect([500, null, 2000, 0, null, 1500].sort(largestFirst)).toEqual([2000, 1500, 500, 0, null, null]);
    expect(largestFirst(7, 7)).toBe(0);
  });
});
