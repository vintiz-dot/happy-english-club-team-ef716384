/**
 * Closed months whose bill no longer matches today's pricing.
 *
 * calculate-tuition keeps a closed month's saved bill and answers `held` with
 * both sets of figures (supabase/functions/_lib/past-month-hold.ts). This file
 * only arranges those answers for Reports > Checks (ClosedMonthChanges.tsx):
 * which months to ask about, and one row per held bill. No pricing here: every
 * figure is the function's.
 */

/**
 * What changed on a held bill, as the calculators answer it in `held.changes`
 * (supabase/functions/_lib/held-bill-changes.ts): the saved bill beside
 * today's pricing, class by class. The shape only; nothing is worked out here.
 */
export interface HeldPriceGroup { price_vnd: number; class_fee_vnd: number; lessons: number; custom_rate: boolean }
export interface HeldLesson { date: string; mark: string | null; price_vnd: number; held: boolean }
export interface HeldClassChange {
  class_id: string | null;
  class_name: string;
  charged: { lessons: number; rate_vnd: number; amount_vnd: number; net_amount_vnd: number } | null;
  today: {
    lessons: number;
    amount_vnd: number;
    net_amount_vnd: number;
    prices: HeldPriceGroup[];
    billed: HeldLesson[];
    not_billed: Array<{ date: string; mark: string | null; state: "excused" | "cancelled" | "free" }>;
  } | null;
}
export interface HeldDiscountLine { name: string; type: "percent" | "amount"; value: number; amount_vnd: number; class_name: string | null }
export interface HeldBillChanges {
  has_saved_lines: boolean;
  charged: { base_vnd: number; discount_vnd: number; total_vnd: number };
  today: { base_vnd: number; discount_vnd: number; total_vnd: number };
  classes: HeldClassChange[];
  discounts: { charged_total_vnd: number; charged_names: string[]; today_total_vnd: number; today: HeldDiscountLine[] };
  reasons: string[];
}

/** The breakdown as sent, or null from a function that predates it (or a malformed one). */
export function readChanges(v: unknown): HeldBillChanges | null {
  const c = v as HeldBillChanges | null | undefined;
  if (!c || typeof c !== "object") return null;
  if (!Array.isArray(c.classes) || !Array.isArray(c.reasons) || !c.discounts || !Array.isArray(c.discounts.today)) return null;
  if (!c.charged || !c.today) return null;
  return c;
}

export interface HeldBillRow {
  studentId: string;
  name: string;
  month: string;
  savedBase: number;
  savedDiscount: number;
  savedTotal: number;
  newBase: number;
  newDiscount: number;
  newTotal: number;
  /** newTotal - savedTotal: positive when the family would be charged more. */
  difference: number;
  /** What the family has paid on this month's bill. */
  paid: number;
  message: string;
  /** What changed, class by class; null when the function did not send it. */
  changes: HeldBillChanges | null;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Every month from `first` up to the month before `current` (YYYY-MM), oldest first. */
export function monthsBefore(first: string, current: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(first) || !/^\d{4}-\d{2}$/.test(current)) return [];
  const out: string[] = [];
  let [y, m] = first.split("-").map(Number);
  // Never loop for ever on a bad first month.
  for (let i = 0; i < 240; i++) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    if (month >= current) break;
    out.push(month);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/**
 * The held bills among one month's calculate-tuition-bulk results. A result is
 * held when it carries `held` that did not save the bill (priced_as_charged is
 * the old function's "saved, with a note").
 */
export function heldRows(results: any[] | null | undefined, month: string, names: Map<string, string>): HeldBillRow[] {
  const rows: HeldBillRow[] = [];
  for (const r of results ?? []) {
    const h = r?.held;
    if (!r || r.error || !h || h.priced_as_charged === true) continue;
    const savedTotal = num(h.saved_total ?? r.totalAmount);
    const newTotal = num(h.register_total ?? h.register_base);
    rows.push({
      studentId: String(r.studentId),
      name: names.get(String(r.studentId)) ?? "Unknown student",
      month,
      savedBase: num(h.saved_base ?? r.baseAmount),
      savedDiscount: num(h.saved_discount ?? r.totalDiscount),
      savedTotal,
      newBase: num(h.register_base),
      newDiscount: num(h.register_discount),
      newTotal,
      difference: newTotal - savedTotal,
      paid: num(r.payments?.monthPayments),
      message: typeof h.message === "string" ? h.message : "",
      changes: readChanges(h.changes),
    });
  }
  return rows;
}

/** Newest month first, then the largest difference, then the name. */
export function sortHeldRows(rows: HeldBillRow[]): HeldBillRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.month < b.month ? 1 : a.month > b.month ? -1 : 0) ||
      Math.abs(b.difference) - Math.abs(a.difference) ||
      a.name.localeCompare(b.name),
  );
}

export function heldTotals(rows: HeldBillRow[]): { bills: number; up: number; down: number } {
  let up = 0, down = 0;
  for (const r of rows) {
    if (r.difference > 0) up += r.difference;
    else down += -r.difference;
  }
  return { bills: rows.length, up, down };
}
