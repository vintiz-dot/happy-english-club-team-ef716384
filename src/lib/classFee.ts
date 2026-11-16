/**
 * Pure helpers for a class's Fee history screen (D4 step 2,
 * src/components/admin/class/ClassFeeHistory.tsx). Nothing here prices a
 * bill or decides a tier: the tier, the bills a change reaches and what is
 * asked of the admin come from money_change_preview('class_fee', ...); the
 * bills themselves from calculate-tuition. This file only words things and
 * lays out the list. Imports nothing.
 */

/** The baseline row's date: "the fee the class had when dated fees began". */
export const FEE_BASELINE = "1900-01-01";

export interface FeeRow {
  effective_from: string;
  session_rate_vnd: number;
  note?: string | null;
  created_at?: string | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "November 2026" for "2026-11-01" / "2026-11"; "the start" for the baseline. */
export function feeMonthLabel(d: string | null | undefined): string {
  const s = String(d ?? "");
  if (!s || s.slice(0, 10) <= FEE_BASELINE) return "the start";
  const [y, m] = s.split("-");
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} ${y}` : s;
}

/** The month a new fee is offered from by default: next month (YYYY-MM), so nothing billed moves. */
export function nextMonth(todayIso: string): string {
  const [y, m] = todayIso.slice(0, 7).split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Is YYYY-MM before the month of today (a correction, not a new fee)? Wording only; the server decides the tier. */
export function isPastMonth(month: string, todayIso: string): boolean {
  return month < todayIso.slice(0, 7);
}

/** The value sent as effective_from: the first of the chosen month. */
export function firstOfMonth(month: string): string {
  return `${month.slice(0, 7)}-01`;
}

/**
 * The rows newest first, each with the month it runs to (the day before the
 * next row) and whether it is the one shown as "now" - a label for the list;
 * the bills are priced by calculate-tuition from the same rows.
 */
export function feeRowsForList(rows: FeeRow[], todayIso: string) {
  const asc = [...(rows ?? [])].sort((a, b) => (a.effective_from < b.effective_from ? -1 : a.effective_from > b.effective_from ? 1 : 0));
  const today = todayIso.slice(0, 10);
  let nowIndex = -1;
  asc.forEach((r, i) => { if (r.effective_from.slice(0, 10) <= today) nowIndex = i; });
  return asc
    .map((r, i) => ({
      ...r,
      from: feeMonthLabel(r.effective_from),
      untilNext: i + 1 < asc.length ? feeMonthLabel(asc[i + 1].effective_from) : null,
      now: i === nowIndex,
      upcoming: r.effective_from.slice(0, 10) > today,
      baseline: r.effective_from.slice(0, 10) <= FEE_BASELINE,
    }))
    .reverse();
}

/** A fee typed in the box: a whole number of VND, 0 or more, or null. */
export function parseFee(text: string): number | null {
  const t = String(text ?? "").replace(/[\s.,]/g, "");
  if (!/^\d{1,9}$/.test(t)) return null;
  return Number(t);
}

export const CLASS_FEE_COPY = {
  heading: "Fee history",
  explain: "A lesson is charged the fee in force on its date. A new fee applies from the first of a month; months before it keep their fee.",
  newFee: (month: string) => `New fee from ${feeMonthLabel(month)}`,
  pastWarning: (month: string) =>
    `${feeMonthLabel(month)} is in the past: this corrects bills already worked out for that month and after. You will be asked why.`,
  futureNote: (month: string) => `Nothing already billed changes. It applies from ${feeMonthLabel(month)}.`,
  thisMonthNote: (month: string) =>
    `It applies to every lesson of ${feeMonthLabel(month)}: this month's bills are worked out again. Earlier months keep their fee.`,
  removeTitle: "Remove a class fee",
  setTitle: "Change the class fee",
  intro: (summary: string) =>
    `${summary} Bills already worked out for these months are listed below as they stand; they are worked out again after you confirm, and the change is kept with your reason.`,
  submitSet: "Save the fee",
  submitRemove: "Remove the fee",
  saved: (month: string) => `Saved. The fee applies from ${feeMonthLabel(month)}.`,
  removed: (month: string) => `Removed. Lessons from ${feeMonthLabel(month)} go back to the fee before it.`,
  refreshed: "The bills it reaches were worked out again.",
  refreshPartial: "Some bills are still being worked out. Open Money changes later to finish.",
  notInstalled: "Dated fees are not installed in the database yet, so the fee cannot be changed here. Nothing was changed.",
  loadFailed: "The fee history could not be read. Nothing was changed.",
};

/** The class-fee refusal codes (HC015 / the plan's refuse_code), with the next step. */
export const CLASS_FEE_REFUSALS: Record<string, string> = {
  nothing_to_change: "The fee from that month is already that amount. Nothing was changed.",
  baseline_row: "The first fee of a class is never removed. Add a new fee from a month instead.",
  not_found: "There is no fee from that month (it may have been removed already). Reload the list.",
  no_baseline: "This class has no starting fee in the history yet. Ask the owner to paste the dated-fees update again.",
  bad_args: "Choose a month and type the fee as a whole number of VND.",
  fee_row_identity: "A fee row keeps its class and its month. Remove it and add a new fee from the right month.",
  money_requires_checked_path: "Change the fee from the class's fee history, from a month, with a reason.",
};

/** One line for the dialog: what the change does to the fee, from the plan's own figures. */
export function feeChangeSummary(plan: any, fmt: (n: number | null | undefined) => string): string {
  const c = plan?.change ?? {};
  const from = feeMonthLabel(c.effective_from);
  const before = fmt(c.fee_before);
  const after = fmt(c.fee_after);
  const until = c.window_to ? ` until ${feeMonthLabel(String(c.window_to).slice(0, 7))}` : "";
  const lessons = Number(c.lessons ?? 0);
  return `From ${from}${until}: ${before} becomes ${after} a lesson${lessons > 0 ? ` (${lessons} lesson${lessons === 1 ? "" : "s"} with a charged mark)` : ""}.`;
}
