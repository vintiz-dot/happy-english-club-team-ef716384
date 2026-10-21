import { describe, expect, test } from "bun:test";
import { indexPayRates, type PayRateRecord } from "../src/lib/payHistory";
import { canBookPayroll, datedPayrollTotal } from "../src/lib/payrollCalculation";

const rates = (type: "hourly" | "per_session", old: number, current: number) =>
  indexPayRates([
    { teacher_id: "staff", effective_from: "2026-01-01", pay_rate_type: type, hourly_rate_vnd: old, per_session_rate_vnd: old },
    { teacher_id: "staff", effective_from: "2026-10-21", pay_rate_type: type, hourly_rate_vnd: current, per_session_rate_vnd: current },
  ]).get("staff") as PayRateRecord[];

describe("closed payroll corrections", () => {
  test("a subsequent hourly pay rise cannot create a correction for September", () => {
    const total = datedPayrollTotal([{ date: "2026-09-10", minutes: 90 }], rates("hourly", 200000, 300000), { hourly_rate_vnd: 300000 });
    expect(total - 300000).toBe(0);
  });
  test("a subsequent per-session pay cut cannot create a negative correction", () => {
    const total = datedPayrollTotal([{ date: "2026-09-10", minutes: 90 }], rates("per_session", 300000, 200000), { pay_rate_type: "per_session", per_session_rate_vnd: 200000 });
    expect(total - 300000).toBe(0);
  });
  test("mid-month rate changes price only sessions on and after the effective date", () => {
    expect(datedPayrollTotal([{ date: "2026-10-20", minutes: 90 }, { date: "2026-10-21", minutes: 90 }], rates("hourly", 200000, 300000), { hourly_rate_vnd: 300000 })).toBe(750000);
  });
  test("a genuine late held session still produces the historical-rate correction", () => {
    expect(datedPayrollTotal([{ date: "2026-09-10", minutes: 90 }, { date: "2026-09-11", minutes: 90 }], rates("hourly", 200000, 300000), { hourly_rate_vnd: 300000 }) - 300000).toBe(300000);
  });
});

test("closed months cannot book payroll expenditures", () => {
  expect(canBookPayroll("locked", true)).toBe(false);
  expect(canBookPayroll("open", true)).toBe(true);
});
test("unverified period status cannot enable booking", () => {
  expect(canBookPayroll(undefined, false)).toBe(false);
  expect(canBookPayroll(undefined, true)).toBe(true);
});