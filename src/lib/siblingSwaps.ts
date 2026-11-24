/**
 * Sibling discounts moved to fit the payments (owner, 24 Nov 2026).
 *
 * compute-sibling-discounts (swapByPayments) decides and does it; each move is
 * one audit_log row (action sibling_swap_by_payments) whose `diff` is the
 * function's own result. This turns a result into the line an admin reads.
 * No figure is worked out here.
 *
 * Pure; imports nothing (sibling-swap.test.mjs).
 */

export const SIBLING_SWAP_ACTION = "sibling_swap_by_payments";

export interface SwapBill { student_id?: string; student_name?: string | null; was: number; now: number; paid: number }
export interface SwapResult {
  family_id?: string;
  family_name?: string | null;
  month?: string;
  status?: string;
  reason?: string;
  percent?: number;
  from?: { student_name?: string | null; class_name?: string | null };
  to?: { student_name?: string | null; class_name?: string | null; discount?: number };
  bills?: SwapBill[];
  saved?: Array<{ student_name?: string | null; ok?: boolean; error?: string }>;
}

export type SwapTone = "done" | "would" | "problem" | "none";

export interface SwapLine {
  tone: SwapTone;
  /** "Moved from A to B (Class)", or why nothing moved. */
  headline: string;
  /** The bills that change: who, from, to, paid. */
  bills: SwapBill[];
  /** What still needs a person, when something did not save. */
  problems: string[];
}

const who = (name?: string | null) => (name && name.trim() ? name : "a child");

export function swapLine(r: SwapResult | null | undefined): SwapLine {
  const bills = (r?.bills ?? []).filter((b) => Number(b.was) !== Number(b.now));
  const move = `from ${who(r?.from?.student_name)} to ${who(r?.to?.student_name)}${r?.to?.class_name ? ` (${r.to.class_name})` : ""}`;
  switch (r?.status) {
    case "swapped":
      return { tone: "done", headline: `Moved ${move}`, bills, problems: [] };
    case "swapped_bills_not_saved":
      return {
        tone: "problem",
        headline: `Moved ${move}, but a bill was not saved`,
        bills,
        problems: (r.saved ?? []).filter((s) => !s.ok).map((s) => `${who(s.student_name)}: ${s.error ?? "not saved"}`),
      };
    case "would_swap":
      return { tone: "would", headline: `Would move ${move}`, bills, problems: [] };
    case "skipped":
      return { tone: "problem", headline: `Not moved ${move}`, bills, problems: [r.reason ?? "skipped"] };
    case "error":
      return { tone: "problem", headline: "Could not be checked", bills: [], problems: [r.reason ?? "error"] };
    default:
      return { tone: "none", headline: r?.reason ?? "The payments fit the discount where it is", bills: [], problems: [] };
  }
}

/** The results worth showing after a check: moves, would-be moves and problems. */
export function swapsToShow(results: SwapResult[] | null | undefined): SwapResult[] {
  return (results ?? []).filter((r) => swapLine(r).tone !== "none");
}
