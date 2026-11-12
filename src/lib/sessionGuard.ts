/**
 * Pure helpers for the "Check before cancelling" dialogs (task D3).
 *
 * The contract is docs/evidence/D2-edge-build.md, "Contract for the dialogs".
 * Nothing in here talks to the network and nothing prices anything: every
 * money figure on screen is a figure calculate-tuition / calculate-payroll
 * returned, formatted for reading. Where a figure was not fetched the row
 * says so; it is never estimated, summed or subtracted in the browser.
 *
 * All the English wording lives in this file (EVIDENCE_LABELS, ERROR_TEXT,
 * COPY) so it can be reviewed in one place.
 */

export type GuardOp = "cancel" | "delete" | "move" | "uncancel";
export type GuardLevel = "NONE" | "SOFT" | "STRONG";

/* ------------------------------------------------------------------ types */

export interface EvidenceItem {
  type: string;
  family?: string;
  strength?: string;
  label_key: string;
  count: number;
  detail?: Record<string, any> | null;
  at?: string | null;
  actor_id?: string | null;
}

export interface GuardPreview {
  action: string;
  kind: string | null;
  session: {
    id: string;
    class_id?: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    teacher_id?: string;
    updated_at?: string;
  };
  started: boolean;
  tier: number;
  level: GuardLevel;
  settled?: any;
  settled_any?: boolean;
  destination?: any;
  change?: { date?: string; start_time?: string; end_time?: string } | null;
  evidence?: { items?: EvidenceItem[]; level?: GuardLevel } | null;
  requires?: { reason_min?: number; confirm?: boolean; correction_reason?: boolean } | null;
  allowed: boolean;
  refuse_code?: string | null;
  affected?: Array<{ student_id: string; month: string; status?: string; marked_by_person?: boolean }>;
  invoices_before?: any[];
  refresh_pairs?: Array<{ student_id: string; month: string }>;
  after_cancel?: { marks_excused?: number; marks_excused_now?: number } | null;
  review_required?: boolean;
  erased_recently?: any[];
  token?: string;
}

export interface TuitionFigure {
  student_id: string;
  month: string;
  fetched: boolean;
  before?: {
    totalAmount?: number | null;
    baseAmount?: number | null;
    totalDiscount?: number | null;
    sessionCount?: number | null;
    tuitionFrozen?: boolean | null;
    siblingUnresolved?: boolean | null;
    invoiceSaved?: boolean | null;
    carry?: Record<string, any> | null;
  };
  after?: { fetched: boolean; reason?: string };
  error?: string;
}

export interface Consequences {
  fetched?: boolean;
  reason?: string;
  tuition?: TuitionFigure[];
  payroll?: {
    fetched: boolean;
    month?: string;
    teacher_id?: string;
    response?: any;
    reason?: string;
    error?: string;
  };
}

export interface GuardErrorBody {
  ok: false;
  code: string;
  message_key?: string;
  message?: string;
  sqlstate?: string;
  detail?: string;
  preview?: GuardPreview;
  use_action?: string;
  [k: string]: any;
}

/* ----------------------------------------------------------------- wording */

const fmtCount = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function formatClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Hanoi and Bangkok share UTC+7; the school works in this zone.
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

type LabelFn = (item: EvidenceItem) => string;
const d = (item: EvidenceItem, k: string): number => Number(item.detail?.[k] ?? 0);

/** Wording for each evidence `label_key` (D1 section 4.2). One place to review. */
export const EVIDENCE_LABELS: Record<string, LabelFn> = {
  "evidence.attendance_present": (i) => {
    const at = formatClock(i.at);
    return `Attendance was marked by ${d(i, "markers") === 1 ? "a teacher" : "staff"}${at ? ` at ${at}` : ""} - ${i.count} ${i.count === 1 ? "child" : "children"} marked present or late`;
  },
  "evidence.recording_completed": (i) => `The lesson was recorded in class (${fmtCount(i.count, "recording", "recordings")})`,
  "evidence.transcript_linked": (i) =>
    i.count === 1 ? "A transcript was uploaded for this lesson" : `${i.count} transcripts were uploaded for this lesson`,
  "evidence.attendance_register_only": (i) => {
    const at = formatClock(i.at);
    return `The register was filled in by a person${at ? ` at ${at}` : ""} - ${i.count} marked absent, nobody present`;
  },
  "evidence.status_held": () => "The lesson was marked as Held",
  "evidence.payroll_paid_as_held": () => "The teacher's pay for this month already counts this lesson as taught",
  "evidence.points_awarded": (i) =>
    `Points were awarded that day (${fmtCount(i.count, "award", "awards")}${d(i, "students") ? `, ${fmtCount(d(i, "students"), "child", "children")}` : ""})`,
  "evidence.transcript_same_day": (i) =>
    i.count === 1 ? "A class transcript was uploaded the same day" : `${i.count} class transcripts were uploaded the same day`,
  "evidence.homework_assigned": (i) =>
    i.count === 1 ? "Homework was assigned that day" : `${i.count} homeworks were assigned that day`,
  "evidence.homework_graded": (i) =>
    i.count === 1 ? "A homework submission was graded that day" : `${i.count} homework submissions were graded that day`,
  "evidence.payroll_month_locked": () => "The month's payroll is closed",
  "evidence.invoice_settled": (i) =>
    i.count === 1 ? "A family has already paid or confirmed this month's bill" : `${i.count} families have already paid or confirmed this month's bill`,
};

export function describeEvidence(item: EvidenceItem): string {
  const fn = EVIDENCE_LABELS[item.label_key];
  if (fn) return fn(item);
  // Unknown key (a newer server): say what it is rather than hide it.
  return `${String(item.label_key).replace(/^evidence\./, "").replace(/_/g, " ")} (${item.count})`;
}

export function evidenceStrengthWord(item: EvidenceItem): "Strong" | "Some" | "Light" | "Money" {
  switch (item.strength) {
    case "strong":
      return "Strong";
    case "soft":
      return "Some";
    case "money":
      return "Money";
    default:
      return "Light";
  }
}

/** Plain English for each error code of the contract. Keyed by `code`. */
export const ERROR_TEXT: Record<string, string> = {
  unauthorized: "You are signed out. Sign in again, then reopen this lesson. Nothing was changed.",
  forbidden: "Only an administrator can change a lesson this way. Nothing was changed.",
  bad_request: "The request was not understood (a date, time or id was missing or malformed). Nothing was changed.",
  bad_action: "This kind of change is not recognised. Nothing was changed.",
  bad_change: "The new date or time is not valid. Nothing was changed.",
  bad_items: "The list of lessons was missing or incomplete. Nothing was changed.",
  preview_required: "This screen is out of date: the check was skipped. Close it, reload the page and try again. Nothing was changed.",
  reason_required: "A reason is required.",
  reason_too_short: "That reason is too short or too generic. Write what actually happened, in at least 15 characters.",
  correction_reason_required: "This lesson is already billed or paid. A separate correction reason is required.",
  confirm_required: "Tick the confirmation that you have checked this lesson did not take place.",
  own_reason_required: "This lesson needs its own reason; the batch reason is not enough.",
  token_stale: "This lesson changed while you were looking at it. Check it again.",
  use_cancel: "A lesson with evidence that it took place cannot be deleted. Cancel it instead.",
  already_canceled: "This lesson is already cancelled.",
  not_canceled: "This lesson is not cancelled, so there is nothing to restore.",
  uncancel_to_scheduled_only: "A cancelled lesson can only be restored to Scheduled, not straight to Held.",
  requires_checked_path: "This change must go through the check screen. Use Cancel, Restore or Move on the lesson.",
  reclass_not_supported: "A lesson cannot be moved to another class. Cancel it and create a new one in the other class.",
  one_change_at_a_time: "Another change to lessons is running right now. Wait a moment and try again. Nothing was changed.",
  slot_taken: "That class already has a lesson at the new time. Nothing was changed.",
  too_many: "That is more than 500 lessons. Narrow the date range and try again.",
  not_found: "That lesson no longer exists. Reload the page.",
  rejected_by_database: "The database refused this change. Nothing was changed.",
  guard_not_installed:
    "The database update for checked cancellation has not been applied yet. Nothing was changed, and lessons cannot be cancelled, deleted or moved from here until it is.",
  guard_broken: "The safety check in the database is switched off or damaged. Nothing was changed. Tell the owner before trying again.",
  evidence_unavailable: "The evidence check could not run. Nothing was changed. Try again in a minute.",
  retry: "The database was busy. Nothing was changed. Try again.",
  misconfigured: "The server is missing a setting and cannot make this change safely. Nothing was changed.",
  unexpected: "Something unexpected went wrong on the server. Nothing was changed.",
  network: "Could not reach the server. Nothing was changed. Check your connection and try again.",
};

export function errorText(code: string | null | undefined, fallback?: string | null): string {
  if (code && ERROR_TEXT[code]) return ERROR_TEXT[code];
  if (code) return `Something went wrong (code: ${code}). Nothing was assumed done.${fallback ? ` Server said: ${fallback}` : ""}`;
  return fallback ? `${fallback} Nothing was assumed done.` : "Something went wrong. Nothing was assumed done.";
}

/** Codes where the action cannot work at all until something outside the dialog changes. */
export const BLOCKING_CODES = new Set(["guard_not_installed", "guard_broken", "misconfigured", "forbidden", "unauthorized", "preview_required"]);

export const COPY = {
  titles: {
    cancel: "Check before cancelling",
    delete: "Check before deleting",
    move: "Check before moving",
    uncancel: "Check before restoring",
  } as Record<GuardOp, string>,
  keep: { cancel: "Keep lesson", delete: "Keep lesson", move: "Keep lesson where it is", uncancel: "Leave cancelled" } as Record<GuardOp, string>,
  noneFuture: "Nothing suggests this lesson has taken place. It has not started yet.",
  nonePast:
    "Nobody marked this lesson: no attendance, transcript, homework or points were recorded. Check that it really did not take place before you cancel it.",
  soft: "Something was recorded for this lesson. Look at what was recorded and explain why it is being changed.",
  strong: "This lesson looks like it was taught. Look at the evidence, then explain exactly why it is being changed.",
  settled: "This lesson is already billed or paid, or its payroll month is closed. This is a correction and will be reviewed.",
  stale: "This lesson changed while you were looking at it",
  stalePrompt: "Read what is different below, then confirm again. Nothing was changed.",
  reviewNote: "This change goes to review: another administrator will look at it.",
  erasedNote: "Marks were removed before this change",
  consequenceNotFetched: "not available",
  payrollNotFetched: "could not be worked out - check Payroll after the change",
  afterNotAvailable: "worked out after the change",
};

/* --------------------------------------------------------------- reasons */

const CANNED = [
  "no reason provided",
  "bulk cancellation",
  "admin status change",
  "admin force-canceled (correction)",
  "deleted via admin interface",
];

export const REASON_MIN = 15;
export const REASON_MAX = 1000;

/** The same clean-up the database does: trim and collapse whitespace. */
export function cleanReason(text: string | null | undefined): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export interface ReasonCheck {
  ok: boolean;
  length: number;
  min: number;
  /** Characters still needed to reach the minimum (0 when reached). */
  needed: number;
  message: string;
}

/**
 * Mirror of session_change_reason_ok (20261112091000): 15-1000 characters,
 * at least 5 different characters, and none of the retired canned strings.
 * The database is the authority; this only tells the admin sooner.
 */
export function checkReason(text: string | null | undefined, min: number = REASON_MIN): ReasonCheck {
  const v = cleanReason(text);
  const length = [...v].length;
  const distinct = new Set([...v.replace(/ /g, "")]).size;
  const needed = Math.max(0, min - length);
  if (length === 0) return { ok: false, length, min, needed, message: `Write at least ${min} characters.` };
  if (length < min) return { ok: false, length, min, needed, message: `${needed} more ${needed === 1 ? "character" : "characters"} needed (minimum ${min}).` };
  if (length > REASON_MAX) return { ok: false, length, min, needed: 0, message: `Too long: ${REASON_MAX} characters at most.` };
  if (distinct < 5) return { ok: false, length, min, needed: 0, message: "Use real words: at least 5 different characters." };
  if (CANNED.includes(v.toLowerCase())) return { ok: false, length, min, needed: 0, message: "That is a generic phrase the system no longer accepts. Say what actually happened." };
  return { ok: true, length, min, needed: 0, message: `${length} characters - good.` };
}

/* ------------------------------------------------------------ typed date */

/** The date as the admin is asked to type it: DD/MM/YYYY (12/11/2026). */
export function lessonDateForTyping(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export const TYPED_DATE_HINT = "Type the lesson date as day/month/year, for example 12/11/2026.";

/**
 * Does what was typed name the lesson's date? Accepted: day/month/year with
 * "/", "-", "." or spaces, leading zeros optional (12/11/2026, 12-11-2026,
 * 2/3/2026), and the ISO form 2026-11-12. A two-digit year, a missing part
 * or an impossible date (31/02/2026) never matches. No time zone is involved:
 * both sides are plain calendar dates.
 */
export function typedDateMatches(typed: string | null | undefined, lessonIso: string): boolean {
  const want = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(lessonIso ?? ""));
  if (!want) return false;
  const s = String(typed ?? "").trim();
  let y: number, mo: number, da: number;
  let m = /^(\d{1,2})[\/\-.\s]+(\d{1,2})[\/\-.\s]+(\d{4})$/.exec(s);
  if (m) {
    da = Number(m[1]);
    mo = Number(m[2]);
    y = Number(m[3]);
  } else {
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return false;
    y = Number(m[1]);
    mo = Number(m[2]);
    da = Number(m[3]);
  }
  const probe = new Date(Date.UTC(y, mo - 1, da));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== da) return false;
  return y === Number(want[1]) && mo === Number(want[2]) && da === Number(want[3]);
}

/* ---------------------------------------------------------- requirements */

export interface Requirements {
  reasonMin: number;
  confirm: boolean;
  correctionReason: boolean;
  typedDate: boolean;
  reviewRequired: boolean;
}

export function requirementsFor(p: GuardPreview | null | undefined): Requirements {
  const r = p?.requires ?? {};
  return {
    reasonMin: Number(r.reason_min ?? REASON_MIN),
    confirm: !!r.confirm,
    correctionReason: !!r.correction_reason,
    typedDate: p?.level === "STRONG",
    reviewRequired: !!p?.review_required,
  };
}

export interface GuardForm {
  reason: string;
  confirm: boolean;
  correctionReason: string;
  typedDate: string;
}

/** True when the destructive button may be enabled. Pure; the server checks again. */
export function canSubmit(p: GuardPreview | null | undefined, form: GuardForm): boolean {
  if (!p || !p.allowed || !p.token) return false;
  // An unguarded time edit (kind null) needs no token or reason; handled by the caller.
  const req = requirementsFor(p);
  if (!checkReason(form.reason, req.reasonMin).ok) return false;
  if (req.confirm && !form.confirm) return false;
  if (req.correctionReason && !checkReason(form.correctionReason, req.reasonMin).ok) return false;
  if (req.typedDate && !typedDateMatches(form.typedDate, p.session.date)) return false;
  return true;
}

/** The exact words on the destructive button. */
export function actionLabel(op: GuardOp, preview?: GuardPreview | null, change?: { date?: string } | null): string {
  switch (op) {
    case "cancel":
      return "Cancel this lesson";
    case "delete":
      return "Delete this lesson";
    case "uncancel":
      return "Restore this lesson";
    case "move": {
      const date = change?.date ?? preview?.change?.date;
      const sameDay = date && preview?.session?.date === date;
      const label = date ? shortDate(date) : "";
      return sameDay || !label ? "Change the time" : `Move to ${label}`;
    }
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return String(iso ?? "");
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]}`;
}

export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return String(iso ?? "");
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/* ------------------------------------------------------- evidence summary */

export type EvidenceMode = "none_future" | "none_past" | "some";

export function evidenceMode(p: GuardPreview): EvidenceMode {
  // Money items (closed payroll, a paid bill) never raise the level, so a
  // NONE lesson can still list them; they are shown beside this message.
  if (p.level === "NONE") return p.started ? "none_past" : "none_future";
  return "some";
}

export function guidanceFor(p: GuardPreview): string {
  const mode = evidenceMode(p);
  if (mode === "none_future") return COPY.noneFuture;
  if (mode === "none_past") return COPY.nonePast;
  return p.level === "STRONG" ? COPY.strong : COPY.soft;
}

/** Evidence items in the order the server sent them, minus nothing. */
export function evidenceList(p: GuardPreview): Array<{ key: string; text: string; strength: string; item: EvidenceItem }> {
  return (p.evidence?.items ?? []).map((item, idx) => ({
    key: `${item.type}-${idx}`,
    text: describeEvidence(item),
    strength: evidenceStrengthWord(item),
    item,
  }));
}

/* -------------------------------------------------------------- figures */

/** Display only: no arithmetic. */
export function formatVnd(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return `${new Intl.NumberFormat("vi-VN").format(Number(n))} ₫`;
}

export interface ConsequenceRow {
  key: string;
  studentId: string;
  month: string;
  fetched: boolean;
  /** "Bill now: 1.200.000 ₫" or the not-fetched sentence. */
  nowText: string;
  afterText: string;
  notes: string[];
  frozen: boolean;
}

/**
 * THE ONE ADAPTER for the stored bills in a preview (D-review-3 F-1: the
 * preview no longer calls calculate-tuition; it carries the saved bills as
 * they stand, and no "after" figure). If the server renames a field, change
 * it here and nowhere else.
 *
 * Assumed field names (docs/evidence/D3-dialogs.md): the list is read from
 * consequences.invoices_before, else consequences.bills, else
 * preview.invoices_before, else the older consequences.tuition[].before.
 * Each bill: student_id, month, total_amount, discount_amount,
 * recorded_payment, status, confirmation_status, tuition_frozen.
 * Anything missing is rendered as "not available", never as a number.
 */
export interface StoredBill {
  studentId: string;
  month: string;
  total: number | null;
  discount: number | null;
  recordedPayment: number | null;
  status: string | null;
  confirmation: string | null;
  frozen: boolean;
}

const numOrNull = (v: any): number | null => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function readStoredBills(c: Consequences | null | undefined, preview?: GuardPreview | null): StoredBill[] {
  const anyC: any = c ?? {};
  const list: any[] | null = Array.isArray(anyC.invoices_before) ? anyC.invoices_before : Array.isArray(anyC.bills) ? anyC.bills : Array.isArray(preview?.invoices_before) ? preview!.invoices_before! : null;
  if (list) {
    return list.map((b) => ({
      studentId: String(b?.student_id ?? ""),
      month: String(b?.month ?? ""),
      total: numOrNull(b?.total_amount ?? b?.totalAmount),
      discount: numOrNull(b?.discount_amount ?? b?.totalDiscount),
      recordedPayment: numOrNull(b?.recorded_payment),
      status: b?.status ?? null,
      confirmation: b?.confirmation_status ?? null,
      frozen: !!(b?.tuition_frozen ?? b?.tuitionFrozen),
    }));
  }
  // Older shape: calculate-tuition snapshots.
  return (anyC.tuition ?? []).map((t: TuitionFigure) => ({
    studentId: t.student_id,
    month: t.month,
    total: t.fetched ? numOrNull(t.before?.totalAmount) : null,
    discount: t.fetched ? numOrNull(t.before?.totalDiscount) : null,
    recordedPayment: null,
    status: null,
    confirmation: null,
    frozen: !!t.before?.tuitionFrozen,
  }));
}

export function consequenceRows(c: Consequences | null | undefined, preview?: GuardPreview | null): ConsequenceRow[] {
  return readStoredBills(c, preview).map((b, i) => {
    const notes: string[] = [];
    if (b.frozen) notes.push("This bill is frozen and will not change");
    const state = [b.status, b.confirmation].filter(Boolean).join(", ");
    const fetched = b.total !== null;
    return {
      key: `${b.studentId}-${b.month}-${i}`,
      studentId: b.studentId,
      month: b.month,
      fetched,
      nowText: fetched ? `Current bill for ${b.month}: ${formatVnd(b.total)}${state ? ` (${state})` : ""}` : "Current bill: not available",
      afterText: b.frozen ? "unchanged (frozen)" : COPY.afterNotAvailable,
      notes,
      frozen: b.frozen,
    };
  });
}

export const NEW_BILL_LINE = "The new bill is worked out after the lesson is cancelled and shown here.";

export interface TotalsRow {
  bills: number;
  frozen: number;
  notFetched: number;
  sentence: string;
}

/** Counts only. Money is never added up in the browser. */
export function totalsRow(rows: ConsequenceRow[]): TotalsRow {
  const frozen = rows.filter((r) => r.frozen).length;
  const notFetched = rows.filter((r) => !r.fetched).length;
  const parts = [fmtCount(rows.length, "bill", "bills") + " may change"];
  if (frozen) parts.push(`${frozen} frozen (will not change)`);
  if (notFetched) parts.push(`${notFetched} could not be worked out`);
  return { bills: rows.length, frozen, notFetched, sentence: parts.join("; ") };
}

export interface PayrollLine {
  fetched: boolean;
  month?: string;
  text: string;
}

/** The teacher's line as calculate-payroll reported it; nothing derived. */
export function payrollLine(c: Consequences | null | undefined): PayrollLine {
  const p = c?.payroll;
  if (!p) return { fetched: false, text: COPY.payrollNotFetched };
  if (!p.fetched) {
    if (p.reason === "lesson_not_held") return { fetched: false, text: "The lesson is not marked Held, so no teacher pay is attached to it." };
    return { fetched: false, month: p.month, text: COPY.payrollNotFetched };
  }
  const rows: any[] = p.response?.payrollData ?? [];
  const mine = rows.find((r) => r?.teacherId === p.teacher_id) ?? (rows.length === 1 ? rows[0] : null);
  if (!mine) return { fetched: false, month: p.month, text: COPY.payrollNotFetched };
  const amount = mine.totalAmountActual ?? mine.totalAmountProjected;
  const sessions = mine.sessionsCountActual ?? mine.sessionsCountProjected;
  if (amount === undefined || amount === null) return { fetched: false, month: p.month, text: COPY.payrollNotFetched };
  return {
    fetched: true,
    month: p.month,
    text: `Pay line for ${p.month} as it stands now: ${formatVnd(amount)}${sessions !== undefined && sessions !== null ? ` for ${fmtCount(Number(sessions), "lesson", "lessons")}` : ""}. It is recalculated by Payroll after the change.`,
  };
}

/* ----------------------------------------------------------------- stale */

/** What differs between the preview the admin saw and the fresh one. Words only. */
export function stalePreviewDiff(before: GuardPreview | null | undefined, after: GuardPreview | null | undefined): string[] {
  if (!before || !after) return [];
  const out: string[] = [];
  if (before.session.status !== after.session.status) out.push(`The lesson status changed from ${before.session.status} to ${after.session.status}.`);
  if (before.session.date !== after.session.date) out.push(`The lesson date changed from ${longDate(before.session.date)} to ${longDate(after.session.date)}.`);
  if (before.session.start_time !== after.session.start_time || before.session.end_time !== after.session.end_time) out.push("The lesson time changed.");
  if (before.level !== after.level) out.push(`The evidence level changed from ${before.level.toLowerCase()} to ${after.level.toLowerCase()}.`);
  const bi = new Map((before.evidence?.items ?? []).map((i) => [i.type, i.count]));
  const ai = new Map((after.evidence?.items ?? []).map((i) => [i.type, i.count]));
  for (const [type, count] of ai) {
    if (!bi.has(type)) out.push(`New: ${describeEvidence((after.evidence?.items ?? []).find((i) => i.type === type)!)}.`);
    else if (bi.get(type) !== count) out.push(`Changed: ${describeEvidence((after.evidence?.items ?? []).find((i) => i.type === type)!)}.`);
  }
  for (const [type] of bi) {
    if (!ai.has(type)) out.push(`No longer recorded: ${describeEvidence((before.evidence?.items ?? []).find((i) => i.type === type)!)}.`);
  }
  if ((before.affected?.length ?? 0) !== (after.affected?.length ?? 0)) out.push("The number of children on the lesson changed.");
  if (before.tier !== after.tier) out.push("The level of care this change needs has changed.");
  if (!out.length) out.push("Something recorded against this lesson changed.");
  return out;
}

/* ---------------------------------------------------------------- errors */

/** Shape supabase-js hands back on a non-2xx: FunctionsHttpError with `.context` a Response. */
export async function parseInvokeError(error: any, data?: any): Promise<GuardErrorBody> {
  if (data && typeof data === "object" && data.ok === false && typeof data.code === "string") return data as GuardErrorBody;
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (body && typeof body === "object" && typeof body.code === "string") return { ok: false, ...body } as GuardErrorBody;
      if (body && typeof body === "object") return { ok: false, code: "unexpected", message: body.error ?? body.message, ...body } as GuardErrorBody;
    }
  } catch {
    /* fall through */
  }
  const name = String(error?.name ?? "");
  if (name === "FunctionsFetchError" || /failed to fetch|network/i.test(String(error?.message ?? ""))) {
    return { ok: false, code: "network", message: String(error?.message ?? "") };
  }
  return { ok: false, code: "unexpected", message: String(error?.message ?? "") };
}

/* ------------------------------------------------------- tuition refresh */

export interface RefreshSummary {
  status: "refreshed" | "failed" | "none" | "unknown";
  failed: Array<{ student_id: string; month: string; error?: string }>;
  okCount: number;
  needsRetry: boolean;
}

export function refreshSummary(tuition: any): RefreshSummary {
  const status = tuition?.status === "refreshed" || tuition?.status === "failed" || tuition?.status === "none" ? tuition.status : "unknown";
  const results: any[] = Array.isArray(tuition?.results) ? tuition.results : [];
  const failed = Array.isArray(tuition?.failed) && tuition.failed.length ? tuition.failed : results.filter((r) => !r.ok);
  return {
    status,
    failed,
    okCount: results.filter((r) => r.ok).length,
    // An unknown status is treated as "not confirmed": offer the retry.
    needsRetry: status === "failed" || status === "unknown",
  };
}

/* ------------------------------------------------------------------ bulk */

export interface BulkRow {
  id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  class_id?: string;
  teacher_id?: string;
  tier?: number;
  token: string;
  level?: GuardLevel;
  settled_any?: boolean;
  requires?: Requirements | { reason_min?: number; confirm?: boolean; correction_reason?: boolean } | null;
  review_required?: boolean;
  evidence?: { items?: EvidenceItem[] } | null;
  refuse_code?: string;
  affected?: any[];
}

export interface BulkPreview {
  batch_id: string;
  op?: string;
  plain: BulkRow[];
  needs_ack: BulkRow[];
  refused: BulkRow[];
  preview_failed: Array<{ id: string; code: string; message_key?: string }>;
}

export function normaliseBulkPreview(raw: any): BulkPreview {
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  return {
    batch_id: String(raw?.batch_id ?? ""),
    op: raw?.op,
    plain: arr(raw?.plain),
    needs_ack: arr(raw?.needs_ack),
    refused: arr(raw?.refused),
    preview_failed: arr(raw?.preview_failed),
  };
}

/** Group counts shown above the lists. */
export function bulkCounts(b: BulkPreview) {
  return { plain: b.plain.length, needsAck: b.needs_ack.length, refused: b.refused.length, failed: b.preview_failed.length };
}

export interface BulkAck {
  /** The admin ticked this lesson in. Unchecked by default. */
  included: boolean;
  confirm: boolean;
  reason: string;
  correctionReason: string;
  typedDate: string;
}

export const emptyAck = (): BulkAck => ({ included: false, confirm: false, reason: "", correctionReason: "", typedDate: "" });

function requiresOf(row: BulkRow): Requirements {
  const r: any = row.requires ?? {};
  return {
    reasonMin: Number(r.reason_min ?? r.reasonMin ?? REASON_MIN),
    confirm: r.confirm !== false,
    correctionReason: !!(r.correction_reason ?? r.correctionReason),
    typedDate: row.level === "STRONG",
    reviewRequired: !!row.review_required,
  };
}

/** Is this evidence lesson ready to go in the batch? Each needs its own acknowledgement and reason. */
export function bulkAckReady(row: BulkRow, ack: BulkAck): boolean {
  if (!ack.included) return false;
  const req = requiresOf(row);
  if (!ack.confirm) return false;
  if (!checkReason(ack.reason, req.reasonMin).ok) return false;
  if (req.correctionReason && !checkReason(ack.correctionReason, req.reasonMin).ok) return false;
  if (req.typedDate && !typedDateMatches(ack.typedDate, row.date)) return false;
  return true;
}

/** Why an included lesson is not ready (for the list), or null. */
export function bulkAckProblem(row: BulkRow, ack: BulkAck): string | null {
  if (!ack.included) return null;
  const req = requiresOf(row);
  if (!checkReason(ack.reason, req.reasonMin).ok) return "Needs its own reason.";
  if (req.correctionReason && !checkReason(ack.correctionReason, req.reasonMin).ok) return "Needs a correction reason.";
  if (req.typedDate && !typedDateMatches(ack.typedDate, row.date)) return "Type this lesson's date to continue.";
  if (!ack.confirm) return "Tick the confirmation.";
  return null;
}

export interface BulkConfirmBody {
  items: Array<{ id: string; token: string }>;
  held_items: Array<{ id: string; token: string; confirm: true; reason: string; correction_reason?: string }>;
  include_held: boolean;
}

/**
 * Build the confirm body. Plain lessons go as {id, token}. Evidence lessons
 * go ONLY when the admin ticked them in and each carries its own
 * acknowledgement and reason: there is no "apply to all" path.
 */
export function buildBulkConfirm(b: BulkPreview, acks: Record<string, BulkAck>): BulkConfirmBody {
  const held = b.needs_ack
    .filter((r) => bulkAckReady(r, acks[r.id] ?? emptyAck()))
    .map((r) => {
      const a = acks[r.id];
      const out: BulkConfirmBody["held_items"][number] = { id: r.id, token: r.token, confirm: true, reason: cleanReason(a.reason) };
      if (requiresOf(r).correctionReason) out.correction_reason = cleanReason(a.correctionReason);
      return out;
    });
  return { items: b.plain.map((r) => ({ id: r.id, token: r.token })), held_items: held, include_held: held.length > 0 };
}

export type BulkResult = {
  done: Array<{ id: string; tier?: number; review_required?: boolean }>;
  refused: Array<{ id: string; code?: string; message_key?: string }>;
  notAttempted: Array<{ id: string; code?: string }>;
  stopped: { code?: string; message?: string } | null;
  tuitionFailed: any[];
  partial: boolean;
};

/** Normalise bulk-cancel (`canceled`) and bulk-delete (`done`) responses. */
export function normaliseBulkResult(r: any): BulkResult {
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  return {
    done: arr(r?.canceled ?? r?.done),
    refused: arr(r?.refused),
    notAttempted: arr(r?.not_attempted),
    stopped: r?.stopped ?? null,
    tuitionFailed: arr(r?.tuition?.failed),
    partial: !!r?.partial || !!r?.stopped,
  };
}

/* --------------------------------------------------------- query refresh */

/** React Query keys touched by a lesson change: calendars, class sessions, tuition, payroll, invoices. */
export function isSessionRelatedQuery(key: readonly unknown[]): boolean {
  const first = String(key?.[0] ?? "");
  return /session|calendar|tuition|payroll|invoice|attendance|schedule|finance|family/i.test(first);
}

/* --------------------------------------------------------- review screen */

export interface OverrideRow {
  override_id: string;
  created_at: string;
  actor_user_id: string;
  session_id: string;
  class_id: string;
  teacher_id: string;
  session_date: string;
  action: string;
  via: string;
  tier: number;
  level: GuardLevel;
  settled: boolean;
  correction_mode: boolean;
  reason: string;
  correction_reason?: string | null;
  confirmed: boolean;
  evidence?: { items?: EvidenceItem[] } | null;
  affected?: any[];
  invoices_before?: any[];
  change?: any;
  review_required: boolean;
  reviewed?: boolean;
  tuition_state?: string;
}

export const TIER_WORDS: Record<number, string> = {
  0: "Not started, no evidence",
  1: "Started, nothing recorded",
  2: "Evidence recorded",
  3: "Correction (billed, paid or closed)",
};

/** "Went through despite evidence": level SOFT or STRONG, any tier. */
export function wentThroughDespiteEvidence(r: OverrideRow): boolean {
  return (r.level === "SOFT" || r.level === "STRONG") && r.action !== "uncancel";
}

export function withinLastDays(iso: string, days: number, nowMs: number = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= days * 24 * 3600 * 1000 && t <= nowMs + 60_000;
}

export interface ReviewFilters {
  state: "needs_review" | "all" | "digest";
  from?: string;
  to?: string;
  classId?: string;
}

export function filterOverrides(rows: OverrideRow[], f: ReviewFilters, nowMs: number = Date.now()): OverrideRow[] {
  return rows.filter((r) => {
    if (f.state === "needs_review" && !(r.review_required && !r.reviewed)) return false;
    if (f.state === "digest" && !(r.action === "cancel" && wentThroughDespiteEvidence(r) && withinLastDays(r.created_at, 7, nowMs))) return false;
    const day = String(r.created_at).slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (f.classId && r.class_id !== f.classId) return false;
    return true;
  });
}
