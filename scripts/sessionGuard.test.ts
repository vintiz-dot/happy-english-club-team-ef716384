import { expect, test } from "bun:test";
import {
  actionLabel,
  buildBulkConfirm,
  bulkAckReady,
  canSubmit,
  checkReason,
  COPY,
  OUTCOME_UNKNOWN_TEXT,
  UNKNOWN_OUTCOME_CODES,
  isSessionRelatedQuery,
  cleanReason,
  consequenceRows,
  describeEvidence,
  emptyAck,
  errorText,
  ERROR_TEXT,
  evidenceMode,
  filterOverrides,
  formatVnd,
  lessonDateForTyping,
  normaliseBulkPreview,
  normaliseBulkResult,
  parseInvokeError,
  payrollLine,
  refreshSummary,
  stalePreviewDiff,
  totalsRow,
  typedDateMatches,
  type GuardPreview,
  type OverrideRow,
} from "../src/lib/sessionGuard";

const base = (over: Partial<GuardPreview> = {}): GuardPreview => ({
  action: "cancel",
  kind: "cancel",
  session: { id: "s1", date: "2026-11-12", start_time: "09:00:00", end_time: "10:30:00", status: "Scheduled" },
  started: false,
  tier: 0,
  level: "NONE",
  evidence: { items: [] },
  requires: { reason_min: 15, confirm: false, correction_reason: false },
  allowed: true,
  token: "a".repeat(64),
  ...over,
});

/* reasons: mirror of session_change_reason_ok */
test("reason: collapses whitespace like the database", () => {
  expect(cleanReason("  teacher   was \n ill  ")).toBe("teacher was ill");
});
test("reason: 15 characters minimum, counted after cleaning", () => {
  expect(checkReason("too short").ok).toBe(false);
  expect(checkReason("too short").needed).toBe(6);
  expect(checkReason("exactly fifteen!").ok).toBe(true); // 16
  expect(checkReason("a".repeat(15)).ok).toBe(false); // < 5 distinct
  expect(checkReason("          x          ").ok).toBe(false);
});
test("reason: needs 5 different characters and refuses the retired canned phrases", () => {
  expect(checkReason("aaaaaaaaaaaaaaaaaaaa").ok).toBe(false);
  expect(checkReason("No reason provided").ok).toBe(false);
  expect(checkReason("Deleted via admin interface").ok).toBe(false);
  expect(checkReason("Admin force-canceled (correction)").ok).toBe(false);
  expect(checkReason("Teacher is ill, parents told").ok).toBe(true);
});
test("reason: 1000 characters at most", () => {
  expect(checkReason("ab cd ".repeat(200)).ok).toBe(false);
  expect(checkReason("abcde ".repeat(100)).ok).toBe(true);
});
test("reason: the contract minimum is honoured when the preview asks for more", () => {
  expect(checkReason("a perfectly ok reason", 40).ok).toBe(false);
});

/* typed date */
test("typed date: shows the lesson date as DD/MM/YYYY", () => {
  expect(lessonDateForTyping("2026-11-12")).toBe("12/11/2026");
  expect(lessonDateForTyping("garbage")).toBe("");
});
test("typed date: accepts the shown format, other separators, no zero padding and ISO", () => {
  for (const ok of ["12/11/2026", " 12/11/2026 ", "12-11-2026", "12.11.2026", "12 11 2026", "2026-11-12"]) {
    expect(typedDateMatches(ok, "2026-11-12")).toBe(true);
  }
  expect(typedDateMatches("2/3/2026", "2026-03-02")).toBe(true);
});
test("typed date: day and month are not interchangeable", () => {
  expect(typedDateMatches("11/12/2026", "2026-11-12")).toBe(false);
});
test("typed date: wrong, partial, short year and impossible dates never match", () => {
  for (const bad of ["", "12/11", "12/11/26", "13/11/2026", "31/02/2026", "12/11/2027", "nov 12", "2026/11/12x"]) {
    expect(typedDateMatches(bad, "2026-11-12")).toBe(false);
  }
  expect(typedDateMatches("31/02/2026", "2026-02-28")).toBe(false);
});
test("typed date: a leading zero or not, the same lesson", () => {
  expect(typedDateMatches("05/09/2026", "2026-09-05")).toBe(true);
  expect(typedDateMatches("5/9/2026", "2026-09-05")).toBe(true);
});

/* gating of the destructive button */
test("canSubmit: needs token, allowed and a valid reason", () => {
  const p = base();
  expect(canSubmit(p, { reason: "", confirm: false, correctionReason: "", typedDate: "" })).toBe(false);
  expect(canSubmit(p, { reason: "Teacher is ill, parents told", confirm: false, correctionReason: "", typedDate: "" })).toBe(true);
  expect(canSubmit({ ...p, token: undefined }, { reason: "Teacher is ill, parents told", confirm: false, correctionReason: "", typedDate: "" })).toBe(false);
  expect(canSubmit({ ...p, allowed: false }, { reason: "Teacher is ill, parents told", confirm: false, correctionReason: "", typedDate: "" })).toBe(false);
  expect(canSubmit(null, { reason: "Teacher is ill, parents told", confirm: false, correctionReason: "", typedDate: "" })).toBe(false);
});
test("canSubmit: confirm tick, correction reason and typed date when required", () => {
  const p = base({ level: "STRONG", tier: 3, started: true, requires: { reason_min: 15, confirm: true, correction_reason: true } });
  const good = { reason: "Taught by mistake in the system", confirm: true, correctionReason: "Billing was already settled", typedDate: "12/11/2026" };
  expect(canSubmit(p, good)).toBe(true);
  expect(canSubmit(p, { ...good, confirm: false })).toBe(false);
  expect(canSubmit(p, { ...good, correctionReason: "short" })).toBe(false);
  expect(canSubmit(p, { ...good, typedDate: "13/11/2026" })).toBe(false);
});
test("canSubmit: SOFT needs no typed date", () => {
  const p = base({ level: "SOFT", tier: 2, started: true, requires: { reason_min: 15, confirm: true, correction_reason: false } });
  expect(canSubmit(p, { reason: "Taught by mistake in the system", confirm: true, correctionReason: "", typedDate: "" })).toBe(true);
});

/* labels */
test("action labels are exact, never OK/Confirm/Yes", () => {
  expect(actionLabel("cancel")).toBe("Cancel this lesson");
  expect(actionLabel("delete")).toBe("Delete this lesson");
  expect(actionLabel("uncancel")).toBe("Restore this lesson");
  const p = base({ action: "move", change: { date: "2026-11-14" } });
  expect(actionLabel("move", p)).toBe("Move to 14 Nov");
  expect(actionLabel("move", base({ change: { date: "2026-11-12" } }))).toBe("Change the time");
});

/* evidence */
test("evidence wording per label_key, with the time of the mark", () => {
  const present = describeEvidence({ type: "attendance_present", label_key: "evidence.attendance_present", count: 8, at: "2026-11-12T02:12:00Z", detail: { markers: 1 } });
  expect(present).toContain("09:12");
  expect(present).toContain("8 children");
  expect(describeEvidence({ type: "transcript_linked", label_key: "evidence.transcript_linked", count: 1 })).toBe("A transcript was uploaded for this lesson");
  expect(describeEvidence({ type: "payroll_month_locked", label_key: "evidence.payroll_month_locked", count: 1 })).toBe("The month's payroll is closed");
  expect(describeEvidence({ type: "invoice_settled", label_key: "evidence.invoice_settled", count: 1 })).toContain("already paid");
  expect(describeEvidence({ type: "x", label_key: "evidence.something_new", count: 2 })).toContain("something new");
});
test("NONE evidence: future lesson vs past lesson", () => {
  expect(evidenceMode(base({ started: false }))).toBe("none_future");
  expect(evidenceMode(base({ started: true }))).toBe("none_past");
  expect(evidenceMode(base({ started: true, level: "SOFT" }))).toBe("some");
});

/* errors */
test("every code in the contract has a plain message", () => {
  const codes = "unauthorized forbidden bad_request bad_action bad_change bad_items preview_required reason_required reason_too_short correction_reason_required confirm_required own_reason_required token_stale use_cancel already_canceled not_canceled uncancel_to_scheduled_only requires_checked_path reclass_not_supported one_change_at_a_time slot_taken too_many not_found rejected_by_database guard_not_installed guard_broken evidence_unavailable retry misconfigured unexpected".split(" ");
  for (const c of codes) expect(ERROR_TEXT[c]?.length).toBeGreaterThan(10);
  expect(errorText("guard_not_installed")).toContain("has not been applied yet");
  expect(errorText("preview_required")).toContain("Nothing was changed");
});
test("an unknown error shows its code", () => {
  expect(errorText("weird_new_code")).toContain("weird_new_code");
  expect(errorText("weird_new_code", "boom")).toContain("boom");
});
/*
 * Error objects shaped like @supabase/functions-js 2.75 (dist/module/types.js,
 * FunctionsClient.js): FunctionsError(message, name, context). HttpError and
 * RelayError carry the fetch Response as `context`; FetchError carries the
 * thrown fetch exception. A real Response is used so json()/bodyUsed behave.
 */
class FunctionsError extends Error {
  context: any;
  constructor(message: string, name: string, context: any) {
    super(message);
    this.name = name;
    this.context = context;
  }
}
const httpErr = (status: number, body: string, type = "application/json") =>
  new FunctionsError("Edge Function returned a non-2xx status code", "FunctionsHttpError", new Response(body, { status, headers: { "Content-Type": type } }));
const relayErr = (status: number) =>
  new FunctionsError("Relay Error invoking the Edge Function", "FunctionsRelayError", new Response("relay says no", { status, headers: { "x-relay-error": "true" } }));
const fetchErr = (inner: Error) => new FunctionsError("Failed to send a request to the Edge Function", "FunctionsFetchError", inner);

test("parseInvokeError: FunctionsHttpError with the guard's own body reads context.json()", async () => {
  const fresh = base();
  const e = await parseInvokeError(httpErr(409, JSON.stringify({ ok: false, code: "token_stale", message_key: "sessionGuard.error.token_stale", preview: fresh })));
  expect(e.code).toBe("token_stale");
  expect(e.ok).toBe(false);
  expect(e.status).toBe(409);
  expect(e.preview?.token).toBe(fresh.token);
  expect((await parseInvokeError(httpErr(503, JSON.stringify({ ok: false, code: "guard_not_installed" })))).code).toBe("guard_not_installed");
});
test("parseInvokeError: a body already in data is preferred", async () => {
  expect((await parseInvokeError(null, { ok: false, code: "use_cancel" })).code).toBe("use_cancel");
});
test("parseInvokeError: gateway bodies are mapped by status and never overwrite our code", async () => {
  // Supabase gateway on an expired JWT: numeric code
  const jwt = await parseInvokeError(httpErr(401, JSON.stringify({ code: 401, message: "Invalid JWT" })));
  expect(jwt.code).toBe("unauthorized");
  expect(jwt.message).toBe("Invalid JWT");
  // Function not deployed: the platform's string code is not one of ours
  expect((await parseInvokeError(httpErr(404, JSON.stringify({ code: "NOT_FOUND", message: "Requested function was not found" })))).code).toBe("function_missing");
  // HTML from a proxy, and an empty 500
  expect((await parseInvokeError(httpErr(502, "<html>Bad gateway</html>", "text/html"))).code).toBe("http_error");
  expect((await parseInvokeError(httpErr(500, ""))).code).toBe("http_error");
  expect((await parseInvokeError(httpErr(546, JSON.stringify({ code: "WORKER_LIMIT", message: "limit" })))).code).toBe("http_error");
});
test("parseInvokeError: a body that was already read is not read again", async () => {
  const e = httpErr(409, JSON.stringify({ ok: false, code: "slot_taken" }));
  await e.context.text();
  const out = await parseInvokeError(e);
  expect(out.code).toBe("http_error");
  expect(out.status).toBe(409);
});
test("parseInvokeError: FunctionsRelayError has the relay's body, not the function's", async () => {
  const e = await parseInvokeError(relayErr(502));
  expect(e.code).toBe("relay");
  expect(e.status).toBe(502);
});
test("parseInvokeError: FunctionsFetchError has no body (network, abort)", async () => {
  expect((await parseInvokeError(fetchErr(new TypeError("Failed to fetch")))).code).toBe("network");
  const abort = new Error("The operation was aborted");
  abort.name = "AbortError";
  expect((await parseInvokeError(fetchErr(abort))).code).toBe("network");
});
test("parseInvokeError: anything thrown that is not a FunctionsError", async () => {
  expect((await parseInvokeError(new TypeError("Failed to fetch"))).code).toBe("network");
  expect((await parseInvokeError({ message: "weird" })).code).toBe("unexpected");
  expect((await parseInvokeError(undefined)).code).toBe("unexpected");
});
test("a confirm that ended without a clear answer is never told 'Nothing was changed'", () => {
  for (const c of ["network", "relay", "unexpected", "http_error"]) {
    expect(UNKNOWN_OUTCOME_CODES.has(c)).toBe(true);
    expect(ERROR_TEXT[c]).not.toContain("Nothing was changed");
  }
  expect(OUTCOME_UNKNOWN_TEXT).toContain("cannot tell whether");
  expect(UNKNOWN_OUTCOME_CODES.has("token_stale")).toBe(false);
  expect(UNKNOWN_OUTCOME_CODES.has("reason_too_short")).toBe(false);
});
test("review wording does not promise a second administrator", () => {
  expect(COPY.reviewNote).toBe("This change is recorded for review.");
});

/* stale diff */
test("stale diff names what changed", () => {
  const a = base();
  const b = base({
    level: "STRONG",
    started: true,
    session: { ...a.session, status: "Held" },
    evidence: { items: [{ type: "attendance_present", label_key: "evidence.attendance_present", count: 3, detail: { markers: 1 } }] },
  });
  const diff = stalePreviewDiff(a, b);
  expect(diff.join(" ")).toContain("from Scheduled to Held");
  expect(diff.join(" ")).toContain("from none to strong");
  expect(diff.join(" ")).toContain("New: Attendance was marked");
  expect(stalePreviewDiff(a, base()).length).toBe(1); // generic sentence
});

/* consequences: stored bills, formatting, no arithmetic */
test("stored bills are shown exactly as returned; no after figure is invented", () => {
  const rows = consequenceRows({
    invoices_before: [
      { student_id: "a", month: "2026-11", total_amount: 1200000, status: "paid", confirmation_status: "confirmed" },
      { student_id: "b", month: "2026-11", total_amount: null },
      { student_id: "c", month: "2026-11", total_amount: 900000, tuition_frozen: true },
    ],
  } as any);
  expect(rows[0].nowText).toBe(`Current bill for 2026-11: ${formatVnd(1200000)} (paid, confirmed)`);
  expect(rows[1].nowText).toBe("Current bill: not available");
  expect(rows[1].nowText).not.toMatch(/d/);
  expect(rows[2].frozen).toBe(true);
  expect(rows[2].notes[0]).toContain("will not change");
  const t = totalsRow(rows);
  expect(t.bills).toBe(3);
  expect(t.frozen).toBe(1);
  expect(t.notFetched).toBe(1);
  expect(t.sentence).not.toContain("₫");
});
test("adapter: preview.invoices_before and the older tuition[] shape both read", () => {
  expect(consequenceRows(null, base({ invoices_before: [{ student_id: "a", month: "2026-11", total_amount: 5 }] }))[0].fetched).toBe(true);
  const old = consequenceRows({ tuition: [{ student_id: "a", month: "2026-11", fetched: true, before: { totalAmount: 7 } }, { student_id: "b", month: "2026-11", fetched: false }] });
  expect(old[0].fetched).toBe(true);
  expect(old[1].nowText).toBe("Current bill: not available");
  expect(consequenceRows({ fetched: false, reason: "not_requested" }, base())).toEqual([]);
});
test("figures not requested produce no rows", () => {
  expect(consequenceRows({ fetched: false, reason: "not_requested" })).toEqual([]);
});
test("payroll line is the calculate-payroll figure, or says it was not fetched", () => {
  const ok = payrollLine({
    tuition: [],
    payroll: { fetched: true, month: "2026-11", teacher_id: "t1", response: { payrollData: [{ teacherId: "t0", totalAmountActual: 1 }, { teacherId: "t1", totalAmountActual: 4500000, sessionsCountActual: 9 }] } },
  });
  expect(ok.fetched).toBe(true);
  expect(ok.text).toContain(formatVnd(4500000));
  expect(ok.text).toContain("9 lessons");
  expect(payrollLine({ payroll: { fetched: false, reason: "calculate_payroll_failed", error: "x" } }).fetched).toBe(false);
  expect(payrollLine({ payroll: { fetched: false, reason: "lesson_not_held" } }).text).toContain("not marked Held");
  expect(payrollLine({ payroll: { fetched: true, month: "2026-11", teacher_id: "zz", response: { payrollData: [{ teacherId: "a" }, { teacherId: "b" }] } } }).fetched).toBe(false);
  expect(payrollLine(null).fetched).toBe(false);
  // A single row for ANOTHER teacher is never shown as this lesson's teacher's pay.
  expect(payrollLine({ payroll: { fetched: true, month: "2026-11", teacher_id: "t1", response: { payrollData: [{ teacherId: "t9", totalAmountActual: 999 }] } } }).fetched).toBe(false);
  expect(payrollLine({ payroll: { fetched: true, month: "2026-11", teacher_id: "t1", response: { payrollData: [{ totalAmountActual: 5 }] } } }).fetched).toBe(true);
});

test("query refresh covers the lesson screens the old dialogs' parents refetched", () => {
  for (const k of ["calendar-sessions", "class-sessions", "student-lessons-all", "lesson-overview", "today-agenda", "teacher-lost-income", "lost-revenue", "excused-absences", "student-tuition", "payroll"]) {
    expect(isSessionRelatedQuery([k])).toBe(true);
  }
  expect(isSessionRelatedQuery(["announcements"])).toBe(false);
});

/* refresh */
test("refresh summary: a failed pair needs the retry; unknown is not trusted", () => {
  const s = refreshSummary({ status: "failed", results: [{ student_id: "a", month: "2026-11", ok: true }, { student_id: "b", month: "2026-11", ok: false, error: "x" }], failed: [{ student_id: "b", month: "2026-11", error: "x" }] });
  expect(s.needsRetry).toBe(true);
  expect(s.failed.length).toBe(1);
  expect(s.okCount).toBe(1);
  expect(refreshSummary({ status: "refreshed", results: [] }).needsRetry).toBe(false);
  expect(refreshSummary({ status: "none" }).needsRetry).toBe(false);
  expect(refreshSummary(undefined).needsRetry).toBe(true);
});

/* bulk */
const row = (id: string, over: any = {}) => ({ id, date: "2026-11-10", token: `tok-${id}`, ...over });
test("bulk preview is normalised into four groups", () => {
  const b = normaliseBulkPreview({ batch_id: "b1", plain: [row("1")], needs_ack: [row("2", { level: "STRONG" })], refused: [], preview_failed: [{ id: "9", code: "x" }] });
  expect(b.plain.length).toBe(1);
  expect(b.needs_ack.length).toBe(1);
  expect(normaliseBulkPreview(null).plain).toEqual([]);
});
test("bulk: evidence lessons are unchecked by default and never ride along with the plain ones", () => {
  const b = normaliseBulkPreview({
    batch_id: "b1",
    plain: [row("1"), row("2")],
    needs_ack: [row("3", { level: "SOFT", requires: { reason_min: 15, confirm: true } }), row("4", { level: "STRONG", requires: { reason_min: 15, confirm: true } })],
  });
  const body = buildBulkConfirm(b, {});
  expect(body.items.map((i) => i.id)).toEqual(["1", "2"]);
  expect(body.held_items).toEqual([]);
  expect(body.include_held).toBe(false);
});
test("bulk: each evidence lesson needs its own tick, reason, and (STRONG) typed date", () => {
  const b = normaliseBulkPreview({
    batch_id: "b1",
    plain: [],
    needs_ack: [
      row("3", { level: "SOFT", requires: { reason_min: 15, confirm: true } }),
      row("4", { level: "STRONG", date: "2026-11-11", requires: { reason_min: 15, confirm: true } }),
      row("5", { level: "STRONG", tier: 3, requires: { reason_min: 15, confirm: true, correction_reason: true } }),
    ],
  });
  const ok = { included: true, confirm: true, reason: "Class was held but data entry was wrong", correctionReason: "", typedDate: "" };
  expect(bulkAckReady(b.needs_ack[0], ok)).toBe(true);
  expect(bulkAckReady(b.needs_ack[0], { ...ok, included: false })).toBe(false);
  expect(bulkAckReady(b.needs_ack[0], { ...ok, confirm: false })).toBe(false);
  expect(bulkAckReady(b.needs_ack[0], { ...ok, reason: "short" })).toBe(false);
  expect(bulkAckReady(b.needs_ack[1], ok)).toBe(false);
  expect(bulkAckReady(b.needs_ack[1], { ...ok, typedDate: "11/11/2026" })).toBe(true);
  expect(bulkAckReady(b.needs_ack[2], { ...ok, typedDate: "10/11/2026" })).toBe(false);
  expect(bulkAckReady(b.needs_ack[2], { ...ok, typedDate: "10/11/2026", correctionReason: "Billing settled already, fixing" })).toBe(true);
  const body = buildBulkConfirm(b, { "3": ok, "4": { ...ok, typedDate: "11/11/2026" }, "5": { ...ok, typedDate: "x" } });
  expect(body.held_items.map((h) => h.id)).toEqual(["3", "4"]);
  expect(body.held_items.every((h) => h.confirm === true && h.reason.length >= 15)).toBe(true);
  expect(body.include_held).toBe(true);
  // an evidence lesson's reason is its own: changing one never changes another
  expect(body.held_items[0].reason).toBe(body.held_items[1].reason); // same text typed, but sent per item
  expect(body.held_items[0]).not.toBe(body.held_items[1]);
  expect(emptyAck().included).toBe(false);
});
test("bulk result: both response shapes normalise", () => {
  const a = normaliseBulkResult({ canceled: [{ id: "1" }], refused: [{ id: "2", code: "token_stale" }], not_attempted: [{ id: "3" }], stopped: { code: "retry" }, partial: true });
  expect(a.done.length).toBe(1);
  expect(a.refused[0].code).toBe("token_stale");
  expect(a.stopped?.code).toBe("retry");
  expect(normaliseBulkResult({ done: [{ id: "1" }] }).done.length).toBe(1);
});

/* review screen */
const ov = (over: Partial<OverrideRow>): OverrideRow => ({
  override_id: "o", created_at: "2026-11-10T03:00:00Z", actor_user_id: "u", session_id: "s", class_id: "c1", teacher_id: "t",
  session_date: "2026-11-09", action: "cancel", via: "single", tier: 2, level: "SOFT", settled: false, correction_mode: false,
  reason: "r", confirmed: true, review_required: true, ...over,
});
test("review filters: needs review, date range, class, and the weekly digest", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  const rows = [
    ov({ override_id: "a" }),
    ov({ override_id: "b", review_required: false, level: "NONE", tier: 0 }),
    ov({ override_id: "c", created_at: "2026-10-01T03:00:00Z" }),
    ov({ override_id: "d", class_id: "c2", reviewed: true }),
    ov({ override_id: "e", action: "move" }),
  ];
  expect(filterOverrides(rows, { state: "all" }, now).length).toBe(5);
  expect(filterOverrides(rows, { state: "needs_review" }, now).map((r) => r.override_id)).toEqual(["a", "c", "e"]);
  expect(filterOverrides(rows, { state: "all", classId: "c2" }, now).map((r) => r.override_id)).toEqual(["d"]);
  expect(filterOverrides(rows, { state: "all", from: "2026-11-01", to: "2026-11-30" }, now).length).toBe(4);
  expect(filterOverrides(rows, { state: "digest" }, now).map((r) => r.override_id)).toEqual(["a", "d"]);
});
