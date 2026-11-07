import { describe, expect, test } from "bun:test";
import { isPaymentMonthConfirmed } from "../src/lib/paymentMonth";

describe("explicit tuition payment month", () => {
  test("August payments cannot be saved without choosing August", () => {
    expect(isPaymentMonthConfirmed("2026-08", "")).toBe(false);
    expect(isPaymentMonthConfirmed("2026-08", "2026-07")).toBe(false);
    expect(isPaymentMonthConfirmed("2026-08", "2026-08")).toBe(true);
  });
  test("a changed tuition month requires a new confirmation", () => {
    expect(isPaymentMonthConfirmed("2026-09", "2026-08")).toBe(false);
  });
  test("invalid months cannot be confirmed", () => {
    for (const month of ["", "2026-00", "2026-13", "2026-8"]) {
      expect(isPaymentMonthConfirmed(month, month)).toBe(false);
    }
  });
});