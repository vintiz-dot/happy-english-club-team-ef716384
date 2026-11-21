// What a payment screen takes as "the cash handed over".
//
// The tuition audit of 16 Nov 2026 (Oct 2025 - May 2026) found the app
// holding 21.1M of "payments" with no cash in the school's records, every one
// of them equal to the bill or its balance to the đồng - the figure QuickPay
// pre-filled for every pre-ticked child. Families hand over round sums; a
// percentage discount makes odd bills (1,596,000, 725,400). So the payment
// screens start every amount EMPTY, count a child only once a figure is
// typed, and say so when the figure is not a round thousand.
//
// Pure, imports nothing; tested by scripts/pgtest/cash-entry.test.mjs.

/** The amount an admin typed, in đồng. "1.600.000", "1,600,000", "1 600 000" and "1600000" all read 1600000; anything without a digit reads 0. */
export function parseCash(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  if (typeof raw !== "string") return 0;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : 0;
}

/** Cash is handed over in whole thousands. */
export const isRoundCash = (amount: number): boolean => amount > 0 && amount % 1000 === 0;

/**
 * A warning to show under an amount, or null. The point is the fingerprint
 * the audit found: an odd figure is almost always a balance copied in, not
 * money counted.
 */
export function cashWarning(amount: number, owed: number): string | null {
  if (amount <= 0 || isRoundCash(amount)) return null;
  if (amount === owed) return "This is the exact balance, not a round sum. Type the cash that was handed over.";
  return "Not a round thousand. Check this is the cash that was handed over.";
}
