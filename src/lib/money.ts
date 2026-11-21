/**
 * The one way an amount of money is SHOWN on screen.
 *
 * The school's convention (Vietnamese): `3.780.000 ₫` - dot thousands
 * separators, no decimals, a normal space, then ₫. A negative amount is
 * `−3.780.000 ₫` (U+2212). Whole VND only: anything else is rounded to the
 * nearest dong (halves away from zero).
 *
 * The digits are grouped here by hand, not by Intl, so the result never
 * depends on the viewer's browser language or on the runtime's locale data.
 * Nothing is imported: this file is pure.
 *
 * Not for: printed documents (src/lib/hecDocs, src/lib/invoice keep their own
 * wording), CSV exports (machine-readable numbers), or counts and points.
 */

export interface FormatVNDOptions {
  /** Shown for null / undefined / NaN. Default "—". */
  fallback?: string;
  /** Put an explicit "+" on a positive amount ("−" on a negative one is always shown). */
  signed?: boolean;
}

const MINUS = "−";
const DONG = "₫";

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatVND(amount: number | string | null | undefined, opts: FormatVNDOptions = {}): string {
  const { fallback = "—", signed = false } = opts;
  if (amount === null || amount === undefined || amount === "") return fallback;
  const n = Number(amount);
  if (!Number.isFinite(n)) return fallback;
  const whole = Math.round(Math.abs(n));
  if (whole === 0) return `0 ${DONG}`;
  // toFixed(0) never uses exponent notation below 1e21.
  const digits = group(whole.toFixed(0));
  const sign = n < 0 ? MINUS : signed ? "+" : "";
  return `${sign}${digits} ${DONG}`;
}

/** "+700.000 ₫" / "−700.000 ₫" / "0 ₫": for figures that always carry a sign. */
export function formatSignedVND(
  amount: number | string | null | undefined,
  opts: Omit<FormatVNDOptions, "signed"> = {},
): string {
  return formatVND(amount, { ...opts, signed: true });
}
