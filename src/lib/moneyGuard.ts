/**
 * Pure helpers for the money guard's dialog (D4, step 1b). Nothing here
 * talks to the network, decides a tier or prices anything: the tier, what is
 * required and the stored bills all come from money_change_preview; this file
 * only words them. All the English for the money guard lives here.
 */
import { checkReason, REASON_MIN } from "@/lib/sessionGuard";

export type MoneyEntity = "attendance";
export type MoneyOp = "set_marks" | "repair";

export interface MoneyPlanItem {
  student_id: string;
  old_status?: string | null;
  new_status?: string | null;
  old_marked_by_person?: boolean;
  crossing?: boolean;
  unbill_person?: boolean;
  tier?: number;
}

export interface MoneyPlan {
  entity: string;
  op: string;
  target_id?: string;
  student_ids?: string[];
  tier: number;
  allowed: boolean;
  refuse_code?: string | null;
  requires?: { reason_min?: number; reason?: boolean; confirm?: boolean; correction_reason?: boolean } | null;
  change?: any;
  invoices_before?: any[];
  refresh_pairs?: Array<{ student_id: string; month: string }>;
  reach?: { pairs?: Array<{ student_id: string; month: string; state?: string; tier?: number }>; fp?: string } | null;
  impact?: { tier?: number; families?: number; paid_vnd?: number; closed_payroll?: boolean } | null;
  approval?: { required?: boolean; reasons?: string[] } | null;
  review_required?: boolean;
  token?: string;
}

export interface MoneyForm {
  reason: string;
  confirm: boolean;
  correctionReason: string;
}

export const MONEY_COPY = {
  title: {
    set_marks: "Change old register marks",
    repair: "Add missing register marks",
  } as Record<string, string>,
  intro: "These lessons are more than a week old and their month is already billed. The change is kept, with your reason, and the bills are worked out again afterwards.",
  yourMark: "This is recorded as your mark.",
  reasonLabel: "Why is this being changed?",
  correctionLabel: "Correction reason (this month's bill was already confirmed or frozen)",
  confirmText: "I have checked these marks and the bills listed below.",
  review: "This change is recorded for review by the other administrator.",
  approval: "This change needs a second administrator.",
  submit: { set_marks: "Change the marks", repair: "Add the marks" } as Record<string, string>,
  refreshed: "The bills were worked out again.",
  refreshPartial: "Some bills are still being worked out. Open this change again later to finish.",
};

/** What each bill state means, in words (tuition_month_state.state). */
export const STATE_WORDS: Record<string, string> = {
  none: "no bill yet",
  issued: "billed, nothing paid",
  paid: "paid or part-paid",
  signed: "confirmed",
  frozen: "frozen",
  unknown: "could not be read",
};

/** The register refusals (HC025 kinds) and every new money code, with the next step. */
export const MONEY_ERROR_TEXT: Record<string, string> = {
  attendance_requires_checked_path: "This lesson is more than a week old and its month is billed. Change the mark with a reason.",
  retro_mark: "This lesson is more than a week old and its month is billed. Change the mark with a reason.",
  retro_mark_staff: "This lesson is more than a week old. Please ask an administrator to change it.",
  cover_staff: "This lesson is more than a week old. Please ask an administrator to change it.",
  delete_mark: "A mark made by a person is changed, not removed.",
  unmark: "A mark made by a person is changed, not removed.",
  attendance_identity: "A register mark cannot be moved to another lesson or child. Change the mark instead.",
  money_requires_checked_path: "This reaches months already billed. Make the change from its screen, with a reason.",
  approval_required: "This needs a second administrator. Send it for approval from the change's screen.",
  not_installed: "The database update for this kind of change is not installed yet. Nothing was changed.",
  lesson_canceled: "This lesson is cancelled: its marks stay Excused. Restore the lesson first if it took place.",
  nothing_to_change: "Every lesson in that range already has a mark. Nothing was changed.",
  no_enrollment: "This child is not enrolled in that class. Nothing was changed.",
  too_many_marks: "At most 60 marks at a time. Save them in two goes.",
  token_stale: "Something changed while you were looking (a mark or a bill). Check the new figures and confirm again.",
  reason_too_short: "Write what actually happened, in at least 15 characters.",
  confirm_required: "Tick the confirmation first.",
  correction_reason_required: "This month's bill was already confirmed or frozen: a separate correction reason is required.",
  guard_broken: "The safety check in the database is switched off or damaged. Nothing was changed. Tell the owner before trying again.",
  guard_not_installed: "The database update for checked changes has not been applied yet. Nothing was changed.",
};

export function moneyErrorText(code: string | null | undefined, kind?: string | null, fallback?: string | null): string {
  if (kind && MONEY_ERROR_TEXT[kind]) return MONEY_ERROR_TEXT[kind];
  if (code && MONEY_ERROR_TEXT[code]) return MONEY_ERROR_TEXT[code];
  return fallback ? `${fallback} Nothing was assumed done.` : "Something went wrong. Nothing was assumed done.";
}

export interface MoneyRequirements {
  reasonMin: number;
  reason: boolean;
  confirm: boolean;
  correctionReason: boolean;
}

/** What the server asked for, read defensively (a missing field = not asked). */
export function moneyRequirements(p: MoneyPlan | null | undefined): MoneyRequirements {
  const r = p?.requires ?? {};
  return {
    reasonMin: Number(r.reason_min ?? REASON_MIN),
    reason: !!r.reason || Number(p?.tier ?? 0) >= 1,
    confirm: !!r.confirm,
    correctionReason: !!r.correction_reason,
  };
}

/** True when the button may be enabled. The server checks everything again. */
export function canSubmitMoney(p: MoneyPlan | null | undefined, form: MoneyForm): boolean {
  if (!p || !p.allowed || !p.token) return false;
  if (p.approval?.required) return false;
  const req = moneyRequirements(p);
  if (req.reason && !checkReason(form.reason, req.reasonMin).ok) return false;
  if (req.confirm && !form.confirm) return false;
  if (req.correctionReason && !checkReason(form.correctionReason, req.reasonMin).ok) return false;
  return true;
}

/** The body of money_change_checked, built from the form (blank -> null). */
export function moneyAck(p: MoneyPlan, form: MoneyForm) {
  const req = moneyRequirements(p);
  return {
    reason: form.reason.trim() ? form.reason.replace(/\s+/g, " ").trim() : null,
    token: p.token ?? null,
    confirm: req.confirm ? form.confirm : false,
    correction_reason: req.correctionReason && form.correctionReason.trim() ? form.correctionReason.replace(/\s+/g, " ").trim() : null,
  };
}

export interface ReachRow {
  key: string;
  studentId: string;
  month: string;
  state: string;
  stateText: string;
  recorded: number | null;
  total: number | null;
}

/** The (child, month) rows the change reaches, with the STORED bill as it stands. Display only. */
export function reachRows(p: MoneyPlan | null | undefined): ReachRow[] {
  const bills = Array.isArray(p?.invoices_before) ? p!.invoices_before! : [];
  return (p?.reach?.pairs ?? []).map((x) => {
    const b = bills.find((i: any) => String(i?.student_id) === String(x.student_id) && i?.month === x.month);
    const num = (v: any) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
    return {
      key: `${x.student_id}:${x.month}`,
      studentId: String(x.student_id),
      month: x.month,
      state: x.state ?? "unknown",
      stateText: STATE_WORDS[x.state ?? "unknown"] ?? String(x.state),
      recorded: b ? num(b.recorded_payment) : null,
      total: b ? num(b.total_amount) : null,
    };
  });
}

/** One line per mark the change makes ("Present -> Excused"), from the plan's own items. */
export function markLines(p: MoneyPlan | null | undefined): Array<{ studentId: string; text: string }> {
  if (p?.op === "repair") {
    return (p.change?.lessons ?? []).map((l: any) => ({ studentId: String(p.change?.student_id ?? ""), text: `${l.date}: ${l.status}` }));
  }
  return (p?.change?.items ?? []).map((i: MoneyPlanItem) => ({
    studentId: i.student_id,
    text: `${i.old_status ?? "no mark"} -> ${i.new_status ?? "?"}`,
  }));
}

const SQLSTATE_TO_CODE: Record<string, string> = {
  HC024: "attendance_identity",
  HC025: "attendance_requires_checked_path",
  HC050: "guard_broken",
  HC060: "approval_required",
  HC120: "money_requires_checked_path",
};

/**
 * The sentence for a database refusal reached through supabase.rpc (an
 * enrolment RPC, say): the server's own wording for every D4 code, with the
 * next step - never the raw code. Anything else keeps its message.
 */
export function rpcErrorText(error: any, fallback: string): string {
  const code = SQLSTATE_TO_CODE[String(error?.code ?? "")];
  if (code) {
    const kind = /kind=([a-z_]+)/.exec(String(error?.details ?? error?.detail ?? ""))?.[1] ?? null;
    return moneyErrorText(code, kind);
  }
  const msg = String(error?.message ?? "");
  return msg && !/^[a-z_]+$/.test(msg) ? msg : fallback;
}

/**
 * The sentence for an edge function's non-2xx answer (supabase-js keeps the
 * JSON body on error.context): the register refusals worded with their next
 * step; otherwise the function's own sentence; never "non-2xx status code".
 */
export async function functionRefusalText(error: any, fallback: string): Promise<string> {
  let body: any = null;
  try {
    const ctx = error?.context;
    const src = typeof ctx?.clone === "function" ? ctx.clone() : ctx;
    body = (await src?.json?.()) ?? null;
  } catch {
    body = null;
  }
  if (body?.code === "attendance_requires_checked_path" || body?.code === "attendance_identity") {
    const text = moneyErrorText(body.code, body.kind ?? null);
    return body.kind === "retro_mark" || (!body.kind && body.preview)
      ? `${text} Open the class's Past Attendance to give the reason.`
      : text;
  }
  if (body && typeof body.error === "string" && body.error.trim()) return body.error;
  if (body && typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

/**
 * Pending edits after a "save all" over several lessons: a lesson that saved
 * leaves the list; a lesson whose save opened the reason dialog KEEPS its
 * edits (they are still on screen if the dialog is cancelled), and so does
 * every lesson not reached.
 */
export function editsAfterSave<T>(edits: Record<string, T>, savedLessonIds: string[]): Record<string, T> {
  return Object.fromEntries(Object.entries(edits).filter(([id]) => !savedLessonIds.includes(id)));
}

/** A 409 body from mark-attendance / repair-attendance that the dialog can take over. */
export function needsMoneyDialog(body: any): boolean {
  return !!body && body.code === "attendance_requires_checked_path" && !!body.preview && body.preview.allowed !== false
    && body.kind !== "retro_mark_staff" && body.kind !== "cover_staff";
}
