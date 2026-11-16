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
    // True in every case the check asks about a hold (no register, an earlier
    // un-hold, a closed payroll month); payMeaning() says which one it is.
    hold: "Marking it Held pays the teacher for this lesson.",
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

/**
 * What the change means for pay, for this plan (review N-6). For a hold the
 * reason the check asks is read from the plan's evidence: the payroll month
 * is closed, the lesson was taken off Held before, or nobody took the
 * register. A field missing -> the general sentence, which is always true.
 */
export function payMeaning(op: PayOp, p: PayPlan | null | undefined): string {
  if (op !== "hold") return PAY_COPY.meaning[op];
  const e = p?.evidence ?? {};
  const why: string[] = [];
  if (e.payroll_month_locked === true || p?.impact?.closed_payroll === true) why.push("This lesson's payroll month is closed.");
  if (e.unheld_before === true) why.push("This lesson was taken off Held before, through this check.");
  if (e.person_marks === 0) why.push("Nobody has taken the register.");
  return [...why, PAY_COPY.meaning.hold].join(" ");
}

/**
 * HC022 "kinds=unhold,move" (review N-4): moving a Held lesson to a time that
 * has not started would also take it off Held (the database's status rule
 * runs first), which changes what the teacher is paid. Said in words, with
 * the order that works. Any other error -> null.
 */
export function oneChangeText(err: any): string | null {
  if (!err || String(err.sqlstate ?? err.code ?? "") !== "HC022") return null;
  const m = /kinds=([a-z_,]+)/.exec(String(err.detail ?? err.details ?? ""));
  const kinds = m ? m[1].split(",") : [];
  if (kinds.includes("unhold") && kinds.includes("move")) {
    return "This lesson is Held. Moving it to a time that has not started also takes it off Held, which changes what the teacher is paid. "
      + "Take it off Held first (the lesson's Actions menu, Change status, with a reason), then move it. Nothing was changed.";
  }
  if (kinds.some((k) => k in PAY_KIND_OP)) {
    return "This would change two things at once, one of them what staff are paid. Make one change at a time. Nothing was changed.";
  }
  return null;
}

/**
 * A Stars conflict settled with Pixel Pal's mark, refused for lesson pay
 * (review N-1): in a closed payroll month the resolve's hold is HC020
 * kind=hold and the whole resolve rolls back. Said in words. Else null.
 */
export function starsResolveRefusalText(err: any): string | null {
  const op = payOpFromDbError(err);
  if (op === "hold") {
    return "Pixel Pal's mark would mark this lesson Held, which pays the teacher, and the lesson's payroll month is closed "
      + "(or it was taken off Held before). Mark the lesson Held first from its Actions menu, with a reason, then settle this conflict. "
      + "Nothing was changed.";
  }
  if (op) return "Settling this conflict would change what staff are paid, which needs a reason. Change the lesson from its Actions menu first. Nothing was changed.";
  return null;
}

/**
 * mark-attendance saved the register but the database refused the Held flip
 * (review N-2: an admin, a closed payroll month or after a checked un-hold).
 * The sentence the screen shows, or null when the lesson was marked Held.
 */
export function heldRefusedText(body: any): string | null {
  const r = body && typeof body === "object" ? body.held_refused : null;
  if (!r) return null;
  return typeof r.message === "string" && r.message !== ""
    ? r.message
    : "The register was saved, but the lesson was not marked Held. Mark it Held from the lesson's Actions menu, with a reason.";
}

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

/**
 * A direct (PostgREST) write the database refused for a pay kind: SQLSTATE
 * HC020 with DETAIL "kind=reteach; ..." -> the op the dialog opens, or null.
 * Screens that write a lesson directly try the write first and open the
 * dialog only on this answer (design (d) step 3A).
 */
export function payOpFromDbError(err: any): PayOp | null {
  if (!err || String(err.code ?? "") !== "HC020") return null;
  const m = /kind=([a-z_]+)/.exec(String(err.details ?? err.detail ?? err.message ?? ""));
  return m ? PAY_KIND_OP[m[1]] ?? null : null;
}

/** The assistant list a restaff sends, from the rows on screen with one change applied. */
export function participantsAfter(rows: Array<{ id?: string; teaching_assistant_id: string; attended?: boolean | null }>,
                                  change: { id?: string; teaching_assistant_id?: string; attended?: boolean; remove?: boolean; add?: string }) {
  const out = rows
    .filter((r) => !(change.remove && (r.id === change.id || r.teaching_assistant_id === change.teaching_assistant_id)))
    .map((r) => ({
      teaching_assistant_id: r.teaching_assistant_id,
      attended: (change.id && r.id === change.id) || (change.teaching_assistant_id && r.teaching_assistant_id === change.teaching_assistant_id)
        ? change.attended ?? (r.attended !== false)
        : r.attended !== false,
    }));
  if (change.add && !out.some((r) => r.teaching_assistant_id === change.add)) out.push({ teaching_assistant_id: change.add, attended: true });
  return out;
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
