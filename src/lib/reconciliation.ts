// The tuition audit's reconciliation register (phase 2,
// supabase/migrations/20261121100000_tuition_reconciliation_register.sql).
//
// What the admin screen needs beyond rendering: the totals that tie the
// register to the audit's -14,174,001, the filters, which decisions an item
// can take, and the money legs a decision sends to
// decide_tuition_reconciliation_item. The database checks all of it again;
// this only keeps the dialog from offering what it would refuse.
//
// Pure, imports nothing; tested by scripts/pgtest/reconciliation-lib.test.mjs.

export type Pattern = "A" | "B" | "C" | "D" | "E" | "F";
export type Decision = "sheet_missed" | "not_received" | "wrong_month" | "rounding_accepted" | "refer_phase4";

export interface ReconciliationItem {
  id: string;
  item_key: string;
  family_id: string | null;
  student_ids: string[];
  month: string;
  sheet_amount: number;
  app_recorded: number;
  app_billed: number | null;
  difference: number;
  pattern: Pattern;
  evidence: string | null;
  status: "open" | "decided";
  decision: Decision | null;
  decision_note: string | null;
  payment_ids: string[];
  decided_by: string | null;
  decided_at: string | null;
}

export interface Leg { student_id: string; month: string; kind: "payment" | "correction"; amount: number }

/** Sheet minus app recorded over Oct 2025 - May 2026, as the audit of 16 Nov 2026 found it. */
export const AUDIT_DIFFERENCE = -14174001;
/** At most this much is accepted as rounding (the RPC's limit). */
export const ROUNDING_LIMIT = 10000;

export const PATTERNS: Record<Pattern, string> = {
  A: "Paid, no bill in the app",
  B: "Recorded, no cash on the sheet",
  C: "Rounding",
  D: "Booked in another month",
  E: "Bill recorded, not the cash",
  F: "Other / unexplained",
};

export const DECISIONS: Record<Decision, { label: string; help: string; money: boolean }> = {
  sheet_missed: { label: "Sheet missed it", help: "The app is right; the cash came and the sheet left it out. No money moves.", money: false },
  not_received: { label: "Not received", help: "The money never came. A correction takes it off the bill (memo \"audit: not received\") and the debt reopens.", money: true },
  wrong_month: { label: "Wrong month", help: "The cash came but was booked on another month. A correction on one month and a payment on the other, same receipt date.", money: true },
  rounding_accepted: { label: "Rounding accepted", help: `A difference of at most ${ROUNDING_LIMIT.toLocaleString("vi-VN")} ₫ is accepted. No money moves.`, money: false },
  refer_phase4: { label: "Refer to phase 4", help: "A child who paid and has no bill in the app: referred to data hygiene (a student and a bill, or outside the app).", money: false },
};

/** The decisions the database would accept for this item. */
export function allowedDecisions(item: Pick<ReconciliationItem, "status" | "pattern" | "difference" | "sheet_amount" | "app_recorded" | "student_ids">): Decision[] {
  if (item.status !== "open") return [];
  const out: Decision[] = ["sheet_missed"];
  if (item.student_ids.length > 0) {
    if (item.app_recorded > item.sheet_amount) out.push("not_received");
    out.push("wrong_month");
  }
  if (Math.abs(item.difference) <= ROUNDING_LIMIT) out.push("rounding_accepted");
  if (item.pattern === "A") out.push("refer_phase4");
  return out;
}

export interface Filters { month?: string | null; pattern?: Pattern | null; status?: "open" | "decided" | null }

export function filterItems<T extends Pick<ReconciliationItem, "month" | "pattern" | "status">>(items: T[], f: Filters): T[] {
  return items.filter((i) => (!f.month || i.month === f.month) && (!f.pattern || i.pattern === f.pattern) && (!f.status || i.status === f.status));
}

export interface Totals {
  items: number;
  open: number;
  decided: number;
  sheet: number;
  recorded: number;
  difference: number;
  /** The whole register's difference equals the audit's figure. */
  ties: boolean;
  byPattern: Record<Pattern, { items: number; net: number; gross: number }>;
}

/** Totals over the items given (the facts as loaded, not as decided since). */
export function totals(items: Pick<ReconciliationItem, "sheet_amount" | "app_recorded" | "difference" | "pattern" | "status">[], target = AUDIT_DIFFERENCE): Totals {
  const byPattern = Object.fromEntries((Object.keys(PATTERNS) as Pattern[]).map((p) => [p, { items: 0, net: 0, gross: 0 }])) as Totals["byPattern"];
  let sheet = 0, recorded = 0, difference = 0, open = 0;
  for (const i of items) {
    sheet += Number(i.sheet_amount); recorded += Number(i.app_recorded); difference += Number(i.difference);
    if (i.status === "open") open += 1;
    const p = byPattern[i.pattern];
    if (p) { p.items += 1; p.net += Number(i.difference); p.gross += Math.abs(Number(i.difference)); }
  }
  return { items: items.length, open, decided: items.length - open, sheet, recorded, difference, ties: difference === target, byPattern };
}

/**
 * The legs a decision sends. `amounts` is per child, as typed (0 or missing
 * = nothing for that child). For wrong_month, `otherMonth` is the second
 * month and `itemMonthIs` says which side the item's month is: "booked"
 * (the money sits on the item's month and belongs to the other one) or
 * "belongs" (the money sits on the other month and belongs to the item's).
 */
export function buildLegs(
  item: Pick<ReconciliationItem, "month" | "student_ids">,
  decision: Decision,
  amounts: Record<string, number>,
  wrongMonth?: { otherMonth: string; itemMonthIs: "booked" | "belongs" },
): Leg[] {
  if (!DECISIONS[decision].money) return [];
  const kids = item.student_ids.filter((id) => (amounts[id] ?? 0) > 0);
  if (decision === "not_received") return kids.map((id) => ({ student_id: id, month: item.month, kind: "correction", amount: amounts[id] }));
  if (!wrongMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(wrongMonth.otherMonth) || wrongMonth.otherMonth === item.month) return [];
  const from = wrongMonth.itemMonthIs === "booked" ? item.month : wrongMonth.otherMonth;
  const to = wrongMonth.itemMonthIs === "booked" ? wrongMonth.otherMonth : item.month;
  return kids.flatMap((id) => [
    { student_id: id, month: from, kind: "correction" as const, amount: amounts[id] },
    { student_id: id, month: to, kind: "payment" as const, amount: amounts[id] },
  ]);
}

/** Why the dialog cannot send yet, or null. `holds` is what each bill holds now, by `${student}|${month}`. */
export function legsProblem(item: Pick<ReconciliationItem, "app_recorded" | "sheet_amount">, decision: Decision, legs: Leg[], holds: Record<string, number>): string | null {
  if (!DECISIONS[decision].money) return null;
  if (!legs.length) return decision === "wrong_month" ? "Choose the other month and type the amount moved." : "Type the amount that was not received.";
  for (const l of legs) {
    if (l.kind !== "correction") continue;
    const held = holds[`${l.student_id}|${l.month}`];
    if (held === undefined) return `There is no ${l.month} bill for one of the children.`;
    if (l.amount > held) return `A correction of ${l.amount.toLocaleString("vi-VN")} ₫ is more than the ${held.toLocaleString("vi-VN")} ₫ that bill holds.`;
  }
  for (const l of legs) {
    if (l.kind === "payment" && holds[`${l.student_id}|${l.month}`] === undefined) return `There is no ${l.month} bill for one of the children.`;
  }
  if (decision === "not_received") {
    const total = legs.reduce((s, l) => s + l.amount, 0);
    const gap = item.app_recorded - item.sheet_amount;
    if (total > gap) return `That is more than the ${Math.max(gap, 0).toLocaleString("vi-VN")} ₫ the app holds over the sheet.`;
  }
  return null;
}
