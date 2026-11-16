// Who is paid for a lesson (D4 step 3A, docs/evidence/D4-design.md b.1):
// the wording and the requests of the lesson-pay dialog. Pure: no React,
// no Supabase. Every decision - the kind, the tier, what is required - is
// the server's (money_change_preview('session', ...) through manage-session);
// this file only says it in words and builds the request back.
//
// No pay figure is shown or worked out anywhere here: what a teacher or an
// assistant is owed comes only from calculate-payroll, on the Payroll screen.
import { checkReason, cleanReason, REASON_MIN, type GuardLevel, type GuardPreview } from "./sessionGuard";

export type PayOp = "unhold" | "hold" | "reteach" | "retime" | "restaff" | "create";

/** The kind in a 409 (`kind`, or HC020 DETAIL "kind=...") -> the op that does it. */
export const PAY_KIND_OP: Record<string, PayOp> = {
  unhold: "unhold", hold: "hold", reteach: "reteach", retime: "retime", restaff: "restaff", create_past: "create", create: "create",
};

/** The manage-session action that runs each op (with a token: the checked op). */
export const PAY_ACTION: Record<PayOp, string> = {
  unhold: "change-status", hold: "change-status", reteach: "set-teacher", retime: "set-time", restaff: "set-staff", create: "create",
};

export interface PayPlan {
  entity: "session";
  op: PayOp;
  kind: string | null;
  tier: number;
  allowed: boolean;
  refuse_code?: string | null;
  requires?: { reason_min?: number; reason?: boolean; confirm?: boolean; correction_reason?: boolean } | null;
  review_required?: boolean;
  token?: string;
  args?: Record<string, any>;
  target_id?: string;
  reach_from?: string;
  change?: Record<string, any> | null;
  evidence?: Record<string, any> | null;
  invoices_before?: any[];
  refresh_pairs?: Array<{ student_id: string; month: string }>;
  impact?: { tier?: number; closed_payroll?: boolean; families?: number; paid_vnd?: number } | null;
  student_ids?: string[];
}

export interface PayForm {
  reason: string;
  confirm: boolean;
  correctionReason: string;
}

export const PAY_COPY = {
  titles: {
    unhold: "Check before taking this lesson off Held",
    hold: "Check before marking this lesson Held",
    reteach: "Check before changing the teacher",
    retime: "Check before changing the time",
    restaff: "Check before changing the assistants",
    create: "Check before adding a lesson in the past",
  } as Record<PayOp, string>,
  action: {
    unhold: "Take off Held",
    hold: "Mark Held",
    reteach: "Change the teacher",
    retime: "Change the time",
    restaff: "Save the assistants",
    create: "Add the lesson",
  } as Record<PayOp, string>,
  keep: {
    unhold: "Keep it Held",
    hold: "Leave it Scheduled",
    reteach: "Keep the teacher",
    retime: "Keep the time",
    restaff: "Keep the assistants",
    create: "Do not add it",
  } as Record<PayOp, string>,
  done: {
    unhold: "Lesson taken off Held",
    hold: "Lesson marked Held",
    reteach: "Teacher changed",
    retime: "Time changed",
    restaff: "Assistants saved",
    create: "Lesson added",
  } as Record<PayOp, string>,
  /** What the change means for pay, in one sentence (b.1 "What the preview shows"). */
  meaning: {
    unhold: "The teacher is no longer paid for this lesson. If the lesson did not happen, cancel it instead.",
    hold: "Nobody has taken the register. Marking it Held pays the teacher for this lesson.",
    reteach: "The lesson's pay moves from one teacher to the other.",
    retime: "Teachers and assistants paid by the hour are paid for the new length.",
    restaff: "Assistants are paid for the lessons they are on and attended.",
    create: "Every child enrolled that day is marked Present and billed for this lesson. Take the register afterwards.",
  } as Record<PayOp, string>,
  confirm: {
    unhold: "I have looked at what was recorded and this lesson should not be paid as held.",
    hold: "I have checked that this lesson took place.",
    reteach: "I have checked who taught this lesson.",
    retime: "I have checked the real start and end of this lesson.",
    restaff: "I have checked who assisted in this lesson.",
    create: "I have checked that this lesson took place and that the children will be billed for it.",
  } as Record<PayOp, string>,
  closedMonth: "This lesson's payroll month is closed. The change is recorded for review and shows on the Payroll screen as a correction.",
  reviewNote: "This change is recorded for review.",
  payNote: "Pay is worked out by Payroll after the change; no figure is shown here.",
  free: "This change needs no reason: the lesson ended a week ago or less and its payroll month is open.",
};

/** What the dialog asks for, read from the server's plan (fail closed when a field is missing). */
export function payRequirements(p: PayPlan | null | undefined) {
  const tier = typeof p?.tier === "number" ? p.tier : 3;
  const r = p?.requires ?? {};
  return {
    reasonMin: typeof r.reason_min === "number" ? r.reason_min : REASON_MIN,
    reason: tier >= 1 ? true : r.reason === true,
    confirm: tier >= 1 ? true : r.confirm === true,
    correctionReason: tier === 3 ? true : r.correction_reason === true,
  };
}

export function canSubmitPay(p: PayPlan | null | undefined, form: PayForm): boolean {
  if (!p || !p.allowed) return false;
  const req = payRequirements(p);
  if (req.reason && !checkReason(form.reason, req.reasonMin).ok) return false;
  if (req.confirm && !form.confirm) return false;
  if (req.correctionReason && !checkReason(form.correctionReason, req.reasonMin).ok) return false;
  return true;
}

/** The manage-session `data` for the op, from the plan's own arguments (what was previewed is what is sent). */
export function payRequest(p: PayPlan, form?: PayForm): { action: string; data: Record<string, unknown> } {
  const a = p.args ?? {};
  const data: Record<string, unknown> = {};
  if (p.op === "unhold" || p.op === "hold") {
    data.id = a.session_id;
    data.status = p.op === "unhold" ? "Scheduled" : "Held";
  } else if (p.op === "reteach") {
    data.id = a.session_id;
    data.teacher_id = a.teacher_id;
  } else if (p.op === "retime") {
    data.id = a.session_id;
    data.start_time = a.start_time;
    data.end_time = a.end_time;
  } else if (p.op === "restaff") {
    data.id = a.session_id;
    data.participants = a.participants;
  } else {
    Object.assign(data, { class_id: a.class_id, date: a.date, start_time: a.start_time, end_time: a.end_time,
                          teacher_id: a.teacher_id, notes: a.notes ?? null, rate_override_vnd: a.rate_override_vnd ?? null });
  }
  data.token = p.token;
  if (form) {
    const req = payRequirements(p);
    if (req.reason || form.reason.trim() !== "") data.reason = cleanReason(form.reason);
    if (req.confirm && form.confirm) data.confirm = true;
    if (req.correctionReason) data.correction_reason = cleanReason(form.correctionReason);
  }
  return { action: PAY_ACTION[p.op], data };
}

/** The body of the pay-preview action for an op and its arguments (session ops by lesson id). */
export function payPreviewRequest(op: PayOp, args: Record<string, unknown>): Record<string, unknown> {
  if (op === "create") return { op, ...args };
  return { op, id: args.session_id, teacher_id: args.teacher_id, start_time: args.start_time, end_time: args.end_time,
           participants: args.participants };
}

/**
 * A manage-session 409 that the lesson-pay dialog answers: the database
 * refused a direct write for one of the pay kinds and the function sent the
 * money preview. Anything else -> null (shown as an error as before).
 */
export function payDialogFrom(body: any): { op: PayOp; plan: PayPlan } | null {
  if (!body || typeof body !== "object") return null;
  if (body.code !== "requires_checked_path") return null;
  const kind = typeof body.kind === "string" ? body.kind : null;
  const op = kind ? PAY_KIND_OP[kind] : undefined;
  const plan = body.preview;
  if (!op || !plan || typeof plan !== "object" || plan.entity !== "session") return null;
  return { op, plan: plan as PayPlan };
}

const hm = (t?: string | null) => (t ? String(t).slice(0, 5) : "?");

/** What changes, line by line (ids are resolved to names by the caller's `names`). */
export function payChangeLines(p: PayPlan | null | undefined, names: Record<string, string> = {}): string[] {
  if (!p?.change) return [];
  const c = p.change;
  const who = (id: unknown) => (typeof id === "string" && names[id]) || "another teacher";
  if (p.op === "unhold") return ["Held -> Scheduled"];
  if (p.op === "hold") return ["Scheduled -> Held"];
  if (p.op === "reteach") {
    return [`From ${who(c.old_teacher_id)} to ${who(c.new_teacher_id)}`, `${c.minutes ?? "?"} minutes`];
  }
  if (p.op === "retime") {
    return [`${hm(c.old_start_time)}-${hm(c.old_end_time)} (${c.old_minutes ?? "?"} minutes) -> ${hm(c.new_start_time)}-${hm(c.new_end_time)} (${c.new_minutes ?? "?"} minutes)`];
  }
  if (p.op === "restaff") {
    const line = (list: any[]) => (Array.isArray(list) && list.length
      ? list.map((x) => `${names[x.teaching_assistant_id] ?? "an assistant"}${x.attended === false ? " (absent)" : ""}`).join(", ")
      : "nobody");
    return [`Before: ${line(c.before)}`, `After: ${line(c.after)}`];
  }
  const kids = Array.isArray(c.children_marked_present) ? c.children_marked_present.length : 0;
  return [`${c.date ?? ""}, ${hm(c.start_time)}-${hm(c.end_time)}`,
          kids === 1 ? "1 child will be marked Present and billed" : `${kids} children will be marked Present and billed`];
}

/** Sentences about the month, review and pay, from the plan. */
export function payNotes(p: PayPlan | null | undefined): string[] {
  if (!p) return [];
  const out: string[] = [];
  if (p.tier === 0) out.push(PAY_COPY.free);
  if (p.impact?.closed_payroll) out.push(PAY_COPY.closedMonth);
  else if (p.review_required) out.push(PAY_COPY.reviewNote);
  if (p.op !== "create") out.push(PAY_COPY.payNote);
  return out;
}

/**
 * For an un-hold, the lesson's evidence in the shape the session guard's
 * evidence cards read (D1's items, the effective level, the floor). Display
 * only: the tier is the plan's. Null for the other ops.
 */
export function payEvidencePreview(p: PayPlan | null | undefined): GuardPreview | null {
  if (!p || p.op !== "unhold" || !p.evidence) return null;
  const e = p.evidence;
  const level = (e.level ?? "SOFT") as GuardLevel;
  return {
    action: "unhold", kind: "unhold",
    session: { id: String(p.target_id ?? ""), date: String(p.reach_from ?? ""), start_time: "", end_time: "", status: "Held" },
    started: e.started !== false, tier: p.tier, level, settled_any: e.settled_any === true,
    evidence: e.d1 ?? null, allowed: p.allowed, refuse_code: p.refuse_code ?? null,
    level_now: (e.level_now ?? undefined) as GuardLevel | undefined, floor: e.floor ?? null, erased_recently: [],
  };
}

export const PAY_ERROR_TEXT: Record<string, string> = {
  requires_checked_path: "This change affects what staff are paid. Give a reason in the window that opens.",
  nothing_to_change: "Nothing would change. Nothing was saved.",
  lesson_canceled: "This lesson is cancelled. Restore it first, then make the change.",
  bad_change: "That change is not valid for this lesson (a moved lesson goes through Move). Nothing was changed.",
  bad_args: "The request was missing a value (teacher, time or assistant). Nothing was changed.",
  not_installed: "The database update for checked lesson-pay changes has not been applied yet. Nothing was changed.",
  born_status: "A lesson is created as Scheduled. Create it, then take the register.",
  one_change_at_a_time: "Make one change at a time (status, teacher, time or a move). Nothing was changed.",
};

/** A refusal in words, always with the next step. */
export function payErrorText(code: string | null | undefined, message?: string | null): string {
  if (code && PAY_ERROR_TEXT[code]) return PAY_ERROR_TEXT[code];
  return message ? `${message} Nothing was changed.` : "The change was not made. Nothing was changed.";
}
