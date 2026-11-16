/**
 * Wording for the money-input changes of D4 step 3B: enrolments, discounts,
 * pay rates, unfreezing a bill, family and sibling fields. Pure: nothing here
 * talks to the network, decides a tier or prices anything. The tier, what is
 * required and the stored bills all come from money_change_preview; this
 * file only says, in plain words, what is about to change and what a refusal
 * means - always with the next step.
 */
import type { MoneyPlan } from "@/lib/moneyGuard";
import { moneyErrorText } from "@/lib/moneyGuard";

export type MoneyInputEntity =
  | "enrollment" | "discount_assignment" | "referral_bonus" | "pay_rate" | "invoice_freeze" | "family_link";

interface OpCopy { title: string; submit: string }

/** Dialog title and button, per entity and op. */
export const INPUT_COPY: Record<string, Record<string, OpCopy>> = {
  enrollment: {
    enroll: { title: "Enrol from a past date", submit: "Enrol" },
    enroll_new: { title: "Enrol from a past date", submit: "Create with these enrolments" },
    set_start_date: { title: "Change an enrolment's start date", submit: "Change the start date" },
    end: { title: "End an enrolment in the past", submit: "End the enrolment" },
    end_all: { title: "End this child's enrolments", submit: "End the enrolments" },
    set_days: { title: "Change the weekdays from a past date", submit: "Change the weekdays" },
    transfer: { title: "Transfer from a past date", submit: "Transfer" },
    pause: { title: "Pause lessons already billed", submit: "Pause" },
    set_rate: { title: "Correct the rate for the whole enrolment", submit: "Correct the rate" },
    set_discount: { title: "Correct the discount for the whole enrolment", submit: "Correct the discount" },
    set_terms_from: { title: "Change the rate or discount from a past date", submit: "Change from that date" },
    delete: { title: "Delete an enrolment", submit: "Delete the enrolment" },
  },
  discount_assignment: {
    assign: { title: "Assign a discount from a past date", submit: "Assign the discount" },
    set_end: { title: "End a discount in the past", submit: "End the discount" },
    edit: { title: "Change a discount's dates", submit: "Change the discount" },
    remove: { title: "Remove a discount", submit: "Remove the discount" },
  },
  referral_bonus: {
    assign: { title: "Add a referral bonus from a past date", submit: "Add the bonus" },
    set_end: { title: "End a referral bonus in the past", submit: "End the bonus" },
    edit: { title: "Change a referral bonus", submit: "Change the bonus" },
    remove: { title: "Remove a referral bonus", submit: "Remove the bonus" },
  },
  pay_rate: {
    set: { title: "Record a pay rate for lessons already taught", submit: "Record the rate" },
    remove: { title: "Remove a pay rate", submit: "Remove the rate" },
  },
  invoice_freeze: {
    unfreeze: { title: "Unfreeze this bill", submit: "Unfreeze the bill" },
  },
  family_link: {
    set_family: { title: "Move a child to another family", submit: "Change the family" },
    set_sibling_from: { title: "Change the sibling-discount hold", submit: "Change the hold" },
    set_sibling_percent: { title: "Change the family's sibling discount", submit: "Change the percentage" },
  },
};

export function inputCopy(entity: string | null | undefined, op: string | null | undefined): OpCopy {
  return INPUT_COPY[entity ?? ""]?.[op ?? ""] ?? { title: "Check this change", submit: "Confirm" };
}

/** The paragraph under the title: why a reason is asked for. */
export function inputIntro(plan: MoneyPlan | null | undefined): string {
  if (plan?.entity === "pay_rate") {
    return "This rate applies to lessons that were already taught, or to a payroll month that is closed. It is kept with your reason; payroll for those months is worked out again only when you run it.";
  }
  if (plan?.entity === "invoice_freeze") {
    return "A frozen bill keeps the figures it was charged at. Unfreezing lets the next calculation change them. It is kept with your reason.";
  }
  return "This change reaches months that are already billed. It is kept with your reason, and those bills are worked out again afterwards.";
}

export const INPUT_TEXT = {
  reasonLabel: "Why is this being changed?",
  correctionLabel: "Correction reason (a bill in reach was already confirmed or frozen, or the payroll month is closed)",
  confirmText: "I have checked this change and the bills listed below.",
  confirmPay: "I have checked this rate and the months it reaches.",
  review: "This change is recorded for review by the other administrator.",
  approval: "This change needs a second administrator.",
  keep: "Keep as it was",
  fromDateFirst: "From a date (the past keeps what it was charged)",
  wholeEnrollment: "Correct a mistake for the whole enrolment",
};

const vnd = (v: unknown) => (v === null || v === undefined || v === "" ? "none" : `${Number(v).toLocaleString("en-US")} VND`);
const day = (v: unknown) => (v === null || v === undefined || v === "" ? "no date" : String(v));
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const days = (v: unknown) => (Array.isArray(v) && v.length > 0 ? v.map((d) => DAY_NAMES[Number(d)] ?? String(d)).join(", ") : "every lesson day");
const discount = (t: any) =>
  !t || t.discount_type === null || t.discount_type === undefined
    ? "no discount"
    : `${t.discount_type === "percent" ? `${t.discount_value}%` : vnd(t.discount_value)} (${t.discount_cadence === "once" ? "per lesson" : t.discount_cadence})`;

/** What the change does, in the plan's own values: one sentence per line. Display only. */
export function inputChangeLines(plan: MoneyPlan | null | undefined): string[] {
  const c: any = plan?.change ?? {};
  const key = `${plan?.entity}.${plan?.op}`;
  switch (key) {
    case "enrollment.enroll":
    case "enrollment.enroll_new":
      return [`Enrolled from ${day(c.row?.start_date)}${c.row?.end_date ? ` to ${day(c.row.end_date)}` : ""}.`];
    case "enrollment.set_start_date":
      return [`Start date: ${day(c.old_start_date)} -> ${day(c.start_date)}.`];
    case "enrollment.end":
      return [`Last day: ${day(c.end_date)}${c.old_end_date ? ` (was ${day(c.old_end_date)})` : ""}. Placeholder marks after it are removed; marks a person made stay.`];
    case "enrollment.end_all":
      return [`Every open enrolment of this child ends on ${day(c.end_date)}.`];
    case "enrollment.set_days":
      return [`Weekdays: ${days(c.old_allowed_days)} -> ${days(c.allowed_days)}, from ${day(c.effective_date)}.`];
    case "enrollment.transfer":
      return [`Moves to the other class from ${day(c.effective_date)}. The old enrolment ends the day before.`];
    case "enrollment.pause":
      return [`Paused from ${day(c.from)} to ${day(c.to)}: ${Number(c.lessons ?? 0)} lesson(s) become Excused and are not charged.`];
    case "enrollment.set_rate":
      return [`Rate per lesson: ${vnd(c.old?.rate_override_vnd)} -> ${vnd(c.terms?.rate_override_vnd)}, for every month of this enrolment.`];
    case "enrollment.set_discount":
      return [`Discount: ${discount(c.old)} -> ${discount(c.terms)}, for every month of this enrolment.`];
    case "enrollment.set_terms_from": {
      const out: string[] = [];
      if (c.terms && "rate_override_vnd" in c.terms) out.push(`Rate per lesson: ${vnd(c.old?.rate_override_vnd)} -> ${vnd(c.terms.rate_override_vnd)}.`);
      if (c.terms && "discount_type" in c.terms) out.push(`Discount: ${discount(c.old)} -> ${discount(c.terms)}.`);
      out.push(c.split ? `From ${day(c.effective_date)}. Before that date nothing changes.` : "From the first day of this enrolment.");
      return out;
    }
    case "enrollment.delete":
      return ["The enrolment is deleted. Every month it covered is worked out again without it."];
    case "discount_assignment.assign":
    case "referral_bonus.assign":
      return [`From ${day(c.row?.effective_from)}${c.row?.effective_to ? ` to ${day(c.row.effective_to)}` : ""}.`];
    case "discount_assignment.set_end":
    case "referral_bonus.set_end":
      return [`Ends on ${day(c.patch?.effective_to)} (was ${day(c.old?.effective_to)}).`];
    case "discount_assignment.edit":
    case "referral_bonus.edit":
      return Object.keys(c.patch ?? {}).map((k) => `${k.replace(/_/g, " ")}: ${String(c.old?.[k] ?? "none")} -> ${String(c.patch[k] ?? "none")}.`);
    case "discount_assignment.remove":
    case "referral_bonus.remove":
      return ["It is removed. Every month it covered is worked out again without it."];
    case "pay_rate.set": {
      const r = c.row ?? {};
      const amount = r.pay_rate_type === "per_session" ? `${vnd(r.per_session_rate_vnd)} per lesson` : `${vnd(r.hourly_rate_vnd)} per hour`;
      return [`${amount}, from ${day(r.effective_from)}.`];
    }
    case "pay_rate.remove":
      return ["This rate is removed. Its dates are paid at the rate before it."];
    case "invoice_freeze.unfreeze":
      return [`The bill for ${String(c.month ?? "")} is unfrozen.`];
    case "family_link.set_family":
      return [c.family_id ? "The child moves to this family." : "The child is removed from the family."];
    case "family_link.set_sibling_from":
      return [c.sibling_discount_from ? `Left out of the sibling discount until ${day(c.sibling_discount_from)}.` : "Counted for the sibling discount again."];
    case "family_link.set_sibling_percent":
      return [`Sibling discount: ${c.old_percent ?? "the default"}${c.old_percent !== null && c.old_percent !== undefined ? "%" : ""} -> ${c.percent ?? "the default"}${c.percent !== null && c.percent !== undefined ? "%" : ""}.`];
    default:
      return [];
  }
}

/** For a pay-rate change: what it reaches, from payroll_reach. Display only. */
export function payReachLines(plan: MoneyPlan | null | undefined): string[] {
  const p: any = (plan?.reach as any)?.payroll;
  if (!p) return [];
  const out: string[] = [];
  if (Number(p.held_lessons ?? 0) > 0) out.push(`${p.held_lessons} lesson(s) already taught are paid at this rate.`);
  if (Array.isArray(p.locked_months) && p.locked_months.length > 0) out.push(`Closed payroll month(s) in reach: ${p.locked_months.join(", ")}.`);
  return out;
}

/** Does this plan need the dialog, or can it be confirmed straight away? */
export function needsInputDialog(plan: MoneyPlan | null | undefined): boolean {
  if (!plan) return true;
  return Number(plan.tier ?? 3) >= 1 || !!plan.requires?.reason || !!plan.requires?.confirm || !!plan.approval?.required;
}

/** HC121's codes and the money-input refuse codes, each with the next step. */
export const INPUT_ERROR_TEXT: Record<string, string> = {
  money_requires_checked_path: "This reaches months already billed. Make the change from its screen, with a reason.",
  enrollment_identity: "An enrolment keeps its child and its class. End it and start a new one.",
  discount_identity: "A discount keeps its child. Remove it and assign it to the other child.",
  definition_in_use: "This discount is used on months already billed. Create a new discount and assign it from a date.",
  student_has_history: "This child has payments, a paid bill or marks made by a person. Deactivate instead.",
  class_has_history: "This class has enrolments. Archive it instead.",
  money_change_refused: "This change is not allowed this way. Nothing was changed.",
  no_enrollment: "No enrolment covers that date. Nothing was changed.",
  nothing_to_change: "Nothing would change.",
  not_frozen: "This bill is not frozen.",
  first_rate: "This is the person's first rate: every lesson before the next one is paid by it. Record a corrected rate from the same date instead.",
  student_required: "The child has to exist before the enrolment. Nothing was changed.",
  bad_args: "Something in this change is not valid (a date, an amount or a missing choice). Nothing was changed.",
  preview_required: "A start date is in a month that was already taught. Give a reason to go on.",
  demo_reset_needs_owner: "The demo student is enrolled in a real class with billed months. Remove that enrolment from the enrolment screen, with a reason, then try again.",
  approval_required: "This needs a second administrator. Nothing was changed.",
  guard_not_installed: "The database update for this kind of change has not been applied yet. Nothing was changed.",
  not_installed: "The database update for this kind of change has not been applied yet. Nothing was changed.",
};

/** Words for a code (a refuse code, an HC121 code or one of the money guard's own). */
export function inputErrorText(code: string | null | undefined, fallback?: string | null): string {
  if (code && INPUT_ERROR_TEXT[code]) return INPUT_ERROR_TEXT[code];
  return moneyErrorText(code, null, fallback);
}

const SQLSTATE: Record<string, string> = { HC120: "money_requires_checked_path", HC121: "money_change_refused" };

/** `entity=..` / `tier=..` / `code=..` from a Postgres DETAIL, when it is one of this step's refusals. */
export function refusalDetail(error: any): { entity: string | null; tier: number | null; code: string | null } {
  const d = String(error?.details ?? error?.detail ?? "");
  const tier = /tier=(\d)/.exec(d)?.[1];
  return {
    entity: /entity=([a-z_]+)/.exec(d)?.[1] ?? null,
    tier: tier === undefined ? null : Number(tier),
    code: /code=([a-z_]+)/.exec(d)?.[1] ?? null,
  };
}

/** True when a raw write or a dated RPC was refused because it needs the checked path (HC120). */
export function isCheckedPathRefusal(error: any): boolean {
  return String(error?.code ?? "") === "HC120";
}

/**
 * The sentence for a database refusal reached through supabase (a raw write
 * or an RPC): this step's codes worded with their next step; anything else
 * keeps the server's own message, or the fallback. Never a raw code.
 */
export function inputDbErrorText(error: any, fallback: string): string {
  const sql = String(error?.code ?? "");
  if (SQLSTATE[sql]) {
    const { code } = refusalDetail(error);
    return inputErrorText(code ?? SQLSTATE[sql]);
  }
  if (sql === "HC015") return inputErrorText(String(error?.message ?? ""), fallback);
  if (sql === "HC025" || sql === "HC024" || sql === "HC050" || sql === "HC060") {
    const kind = /kind=([a-z_]+)/.exec(String(error?.details ?? error?.detail ?? ""))?.[1] ?? null;
    return moneyErrorText(({ HC025: "attendance_requires_checked_path", HC024: "attendance_identity", HC050: "guard_broken", HC060: "approval_required" } as Record<string, string>)[sql], kind);
  }
  const msg = String(error?.message ?? "");
  return msg && !/^[a-z_]+$/.test(msg) ? msg : fallback;
}

/** The JSON body of an edge function's non-2xx answer (supabase-js keeps it on error.context). */
export async function functionErrorBody(error: any): Promise<any> {
  try {
    const ctx = error?.context;
    const src = typeof ctx?.clone === "function" ? ctx.clone() : ctx;
    return (await src?.json?.()) ?? null;
  } catch {
    return null;
  }
}

/** A 409 body from update-enrollment-rate / create-family that the dialog can take over. */
export function needsInputDialogBody(body: any): boolean {
  return !!body && (body.code === "money_requires_checked_path" || body.code === "preview_required")
    && !!body.preview && body.preview.allowed !== false;
}

/** The sentence for an edge function's refusal body. */
export function functionErrorText(body: any, fallback: string): string {
  if (body?.code && (INPUT_ERROR_TEXT[body.code] || body.code === "token_stale" || body.code === "reason_too_short"
      || body.code === "confirm_required" || body.code === "correction_reason_required" || body.code === "guard_broken")) {
    return inputErrorText(body.code);
  }
  if (body && typeof body.error === "string" && body.error.trim()) return body.error;
  if (body && typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}
