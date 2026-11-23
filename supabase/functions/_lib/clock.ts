/**
 * _lib/clock.ts - the current instant, from one place.
 *
 * Whether a month is closed (_lib/past-month-hold.ts) depends on today's date.
 * The calculators ask here, so the suites can hold the clock still: their
 * bundles replace this module (scripts/pgtest/*.test.mjs, "clock.ts").
 * Imports nothing.
 */
export function clockNow(): Date {
  return new Date();
}
