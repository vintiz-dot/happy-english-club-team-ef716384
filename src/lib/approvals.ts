/**
 * Pure helpers for two-administrator approval (D4 step 4; built switched
 * OFF). Nothing here talks to the network or decides anything: whether a
 * change needs a second administrator is decided by the database
 * (change_approval_needed), which every preview and every refusal reports.
 * This file words those answers and builds the request the screens send to
 * request_change_approval - the checked function's own arguments, as typed.
 */
import { canSubmitMoney, type MoneyForm, type MoneyPlan } from "@/lib/moneyGuard";
import { checkReason, REASON_MIN } from "@/lib/sessionGuard";

export type ApprovalKind = "session" | "money" | "settings";
export type ApprovalRpc =
  | "money_change_checked" | "money_changes_checked_bulk" | "carry_payroll_adjustments"
  | "cancel_session_checked" | "move_session_checked" | "uncancel_session_checked" | "cancel_sessions_checked_bulk"
  | "set_change_approval_settings" | "grant_admin_role";
export type ApprovalStatus = "pending" | "applied" | "rejected" | "withdrawn" | "stale" | "expired";

export interface ApprovalQueueRow {
  request_id: string;
  created_at: string;
  requested_by: string;
  kind: ApprovalKind;
  rpc: ApprovalRpc;
  target_keys: string[];
  batch: boolean;
  impact: Record<string, unknown> | null;
  reasons: string[];
  preview: { items?: Array<{ target_key?: string; tier?: number; plan?: any }>; approval?: any } | null;
  expires_at: string;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_note: string | null;
  released_alone: boolean;
  acknowledged: boolean;
  override_ids: string[] | null;
}

export const REASON_TEXT: Record<string, string> = {
  tier3: "it corrects a month whose bill was already confirmed, adjusted or frozen",
  closed_payroll: "it reaches a payroll month that is closed",
  families: "it reaches the settled bills of several families",
  paid: "it reaches bills with 5,000,000 VND or more already paid",
  unfreeze: "it unfreezes a bill",
  pay_adjustment: "it carries a pay correction into a later month",
  settings: "it changes who may approve, or the approval rule itself",
  unknown: "the database could not tell how much it reaches",
};

/** The lines the owner set, as the database reports them (`approval.thresholds`). */
export interface ApprovalThresholds { families?: number | null; paid_vnd?: number | null }

/** One reason in words; the families / paid lines name the setting's own figure when it is known (review N-1). */
export function reasonText(reason: string, thresholds?: ApprovalThresholds | null): string {
  const paid = Number(thresholds?.paid_vnd);
  const fam = Number(thresholds?.families);
  if (reason === "paid" && thresholds && Number.isFinite(paid) && thresholds.paid_vnd !== null) {
    return `it reaches bills with ${paid.toLocaleString("en-US")} VND or more already paid`;
  }
  if (reason === "families" && thresholds && Number.isFinite(fam) && thresholds.families !== null) {
    return `it reaches the settled bills of ${fam} or more families`;
  }
  return REASON_TEXT[reason] ?? reason;
}

/** "This needs a second administrator because ..." from the database's reasons. */
export function reasonSentence(reasons: string[] | null | undefined, thresholds?: ApprovalThresholds | null): string {
  const list = (reasons ?? []).map((r) => reasonText(r, thresholds));
  if (list.length === 0) return "This needs a second administrator.";
  const body = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  return `This needs a second administrator because ${body}.`;
}

export const STATUS_WORDS: Record<ApprovalStatus, string> = {
  pending: "Waiting for a second administrator",
  applied: "Approved and done",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  stale: "Out of date - not done",
  expired: "Expired - not done",
};

export const RPC_WORDS: Record<string, string> = {
  money_change_checked: "A change to a billed month",
  money_changes_checked_bulk: "Several changes to billed months (one batch)",
  carry_payroll_adjustments: "A pay correction carried forward",
  cancel_session_checked: "Cancelling or deleting a taught lesson",
  move_session_checked: "Moving a taught lesson",
  uncancel_session_checked: "Restoring a cancelled lesson",
  cancel_sessions_checked_bulk: "Cancelling several taught lessons (one batch)",
  set_change_approval_settings: "Loosening the approval rule",
  grant_admin_role: "Giving someone the administrator role",
};

/** What the person reads for an approval code (HC060-HC065), always with the next step. */
export function approvalErrorText(code: string | null | undefined, detail?: string | null): string {
  const d = String(detail ?? "");
  switch (code) {
    case "approval_required":
    case "HC060":
      return `${reasonSentence(parseReasons(d))} Send it for approval; nothing was changed.`;
    case "self_approval":
    case "HC061":
      return d === "withdraw" ? "You asked for this. Withdraw it instead, or ask the other administrator to decide."
        : "You asked for this, so another administrator approves it.";
    case "request_not_pending":
    case "HC062":
      return "Already dealt with. Open the Approvals list to see what happened.";
    case "approval_already_pending":
    case "HC063":
      return "A request for this is already waiting. Open it to approve or reject it, or ask whoever sent it to withdraw it.";
    case "request_expired":
    case "HC064":
      return "This request has passed its expiry and can no longer be approved. Ask again.";
    case "function_outdated":
      return "The approval function on the server is not updated yet, so nothing was done. Try again once it is deployed.";
    case "not_applied":
      return "This request was not applied, so there are no bills to work out again.";
    case "approval_setting_locked":
    case "HC065":
      if (/two_admins/.test(d)) return "Approval needs two administrators before it can be switched on.";
      if (/loosen/.test(d)) return "Loosening the rule needs the other administrator. Send it for approval.";
      if (/solo_release_off/.test(d)) return "Releasing your own request is not switched on. Ask the other administrator.";
      if (/not_yet/.test(d)) return "Not yet: you can release your own request once it has waited the time the owner set.";
      if (/not_installed/.test(d)) return "The approval step is not installed (or was rolled back).";
      return "This approval setting needs the other administrator.";
    case "approval_not_needed":
      return "This change does not need a second administrator: make it directly.";
    case "token_stale":
    case "HC011":
      return "Something changed since this was opened. Open it again and look at the fresh figures.";
    case "guard_broken":
    case "HC050":
      return "The approval check in the database is not working. Nothing was changed; tell the conductor.";
    default:
      return "The request did not go through. Nothing was changed.";
  }
}

/**
 * What the screen says after "Approve and make the change" / "Do it alone" /
 * "Work out the bills again", from guarded-change-refresh's answer: the
 * decision first, then whether every bill it reached was worked out again.
 * Nothing is assumed: an unknown refresh is said to be unconfirmed.
 */
export function decidedText(decision: any, tuition: any, alone = false): { text: string; billsLeft: boolean } {
  if (decision && decision.status !== "applied") {
    return { text: "It had changed meanwhile, so nothing was done. It is marked out of date.", billsLeft: false };
  }
  const head = !decision ? "" : alone ? "Done alone. The other administrator sees it first when they return." : "Approved: the change is done.";
  const st = tuition?.status;
  const tail = st === "none" ? (decision ? "" : "There were no bills to work out again.")
    : st === "refreshed" ? "Its bills were worked out again."
    : "Some of its bills were not confirmed as worked out again: use \"Work out the bills again\" below.";
  return { text: [head, tail].filter(Boolean).join(" "), billsLeft: st !== "none" && st !== "refreshed" };
}

/** reasons=[...] from an HC060 detail. */
export function parseReasons(detail: string | null | undefined): string[] {
  const m = /reasons=(\[[^\]]*\])/.exec(String(detail ?? ""));
  if (!m) return [];
  try {
    const v = JSON.parse(m[1]);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** request_id=... from an HC063 detail. */
export function pendingRequestId(detail: string | null | undefined): string | null {
  return /request_id=([0-9a-f-]{36})/i.exec(String(detail ?? ""))?.[1] ?? null;
}

/** Is this refusal one the screen answers with "Send for approval"? */
export function isApprovalRequired(code: string | null | undefined, detail?: string | null): boolean {
  return code === "approval_required" || code === "HC060" || ((code === "approval_setting_locked" || code === "HC065") && /loosen/.test(String(detail ?? "")));
}

/** The form is complete for the change itself (approval aside): the request is checked as the change would be. */
export function canRequestMoneyApproval(p: MoneyPlan | null | undefined, form: MoneyForm): boolean {
  if (!p || !p.approval?.required) return false;
  return canSubmitMoney({ ...p, approval: null }, form);
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** request_change_approval's params for money_change_checked, from the dialog's plan and form. */
export function moneyApprovalParams(entity: string, op: string, args: Record<string, unknown>, p: MoneyPlan, form: MoneyForm) {
  const tier = Number(p.tier ?? 3);
  return {
    entity, op, args,
    reason: form.reason.trim() ? clean(form.reason) : null,
    confirm: tier >= 1 ? !!form.confirm : false,
    correction_reason: tier === 3 && form.correctionReason.trim() ? clean(form.correctionReason) : null,
    context: { source: "screen" },
  };
}

export interface SessionApprovalForm { reason: string; confirm: boolean; correctionReason: string }

/** request_change_approval's (rpc, params) for one of D2's checked lesson changes. */
export function sessionApprovalRequest(op: string, sessionId: string, form: SessionApprovalForm,
  change?: { date: string; start_time: string; end_time: string } | null): { rpc: ApprovalRpc; params: Record<string, unknown> } | null {
  const base = {
    session_id: sessionId,
    reason: clean(form.reason),
    confirm: !!form.confirm,
    correction_reason: form.correctionReason.trim() ? clean(form.correctionReason) : null,
    context: { source: "screen" },
  };
  if (op === "cancel" || op === "delete") return { rpc: "cancel_session_checked", params: { ...base, action: op } };
  if (op === "move" && change) return { rpc: "move_session_checked", params: { ...base, new_date: change.date, new_start: change.start_time, new_end: change.end_time } };
  if (op === "uncancel") return { rpc: "uncancel_session_checked", params: { ...base, confirm: false } };
  return null;
}

/** A session request needs at least the cancellation's own reason. */
export function canRequestSessionApproval(form: SessionApprovalForm): boolean {
  return checkReason(form.reason, REASON_MIN).ok;
}

export interface PayAdjustmentRow {
  month: string;
  origin_month: string;
  teacher_id: string | null;
  assistant_id: string | null;
  amount_vnd: number;
  reason: string;
}

/** request_change_approval's params for carrying pay forward (the rows PayrollMonthLock would insert). */
export function payApprovalParams(rows: PayAdjustmentRow[]) {
  return { rows: rows.map((r) => ({ ...r, amount_vnd: Math.round(r.amount_vnd), reason: clean(r.reason) })) };
}

/** request_change_approval's params for giving someone the administrator role (grant_admin_role). */
export function grantAdminParams(userId: string, reason: string) {
  return { user_id: userId, reason: clean(reason) };
}

/** Pending first; among them, the ones released alone and not yet read, then the oldest. */
export function sortQueue(rows: ApprovalQueueRow[]): ApprovalQueueRow[] {
  const rank = (r: ApprovalQueueRow) => (r.released_alone && !r.acknowledged ? 0 : r.status === "pending" ? 1 : 2);
  return [...rows].sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)));
}

/** "Expires in 3 days" / "Expired". */
export function expiryWords(expiresAt: string, now: Date = new Date()): string {
  const ms = Date.parse(expiresAt) - now.getTime();
  if (!(ms > 0)) return "Expired";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "Expires within the hour";
  if (h < 48) return `Expires in ${h} hour${h === 1 ? "" : "s"}`;
  return `Expires in ${Math.floor(h / 24)} days`;
}

/** The request's own target keys, for a badge on a target ("attendance:<lesson id>", "session:<id>"). */
export function waitsFor(rows: ApprovalQueueRow[], key: string): ApprovalQueueRow | null {
  return rows.find((r) => r.status === "pending" && (r.target_keys ?? []).includes(key)) ?? null;
}

export interface ApprovalSettings {
  enabled: boolean;
  on_tier3: boolean;
  on_closed_payroll: boolean;
  on_unfreeze: boolean;
  on_pay_adjustment: boolean;
  min_families: number;
  min_paid_vnd: number;
  expiry_hours: number;
  solo_release_after_hours: number | null;
}

/**
 * Mirrors the database's _approval_settings_loosens, only to word the button
 * ("asks the other administrator" vs "applies now"); the database decides.
 */
export function settingsLoosen(cur: ApprovalSettings, next: ApprovalSettings): boolean {
  return (cur.enabled && !next.enabled)
    || (cur.on_tier3 && !next.on_tier3) || (cur.on_closed_payroll && !next.on_closed_payroll)
    || (cur.on_unfreeze && !next.on_unfreeze) || (cur.on_pay_adjustment && !next.on_pay_adjustment)
    || next.min_families > cur.min_families || next.min_paid_vnd > cur.min_paid_vnd || next.expiry_hours > cur.expiry_hours
    || (next.solo_release_after_hours !== null && (cur.solo_release_after_hours === null || next.solo_release_after_hours < cur.solo_release_after_hours));
}
