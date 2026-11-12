// The checked cancellation path, shared by manage-session and
// bulk-cancel-sessions. Contract: docs/evidence/D2-build.md ("Contract for
// the edge functions and UI") and docs/evidence/D2-edge-build.md.
//
// RULES THIS FILE EXISTS TO KEEP
// - Every person-initiated change to `sessions` goes through the checked
//   RPCs (or, for an unguarded edit, a plain update) on a client built
//   from the CALLER'S OWN Authorization header. The service-role client
//   reads and refreshes tuition; it never writes `sessions` here
//   (D-review-2 F-2: with the service key auth.uid() is NULL and the write
//   lands in the automation lane).
// - Nothing here prices anything. Tuition figures come from
//   calculate-tuition, payroll figures from calculate-payroll, both copied
//   through as snapshots; a figure that cannot be fetched is reported as
//   not fetched, never guessed.
// - If the guard migration is not installed the RPC is missing: refuse
//   (503 guard_not_installed). There is NO fallback to a direct write.
//
// Imports nothing (clients are passed in), so it type-checks and bundles
// on its own.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const GUARD_NOT_INSTALLED_MESSAGE =
  'The database update for checked cancellation has not been applied yet. Nothing was changed.';

export const BULK_CHUNK = 50;          // cancel_sessions_checked_bulk refuses more (HC016)
export const BULK_PREVIEW_CAP = 500;   // design 7.3
export const REASON_MIN = 15;          // SQL is the authority (session_change_reason_ok)

export interface GuardError {
  status: number;
  code: string;
  message_key: string;
  message: string;
  sqlstate?: string;
  detail?: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function fail(e: GuardError, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, code: e.code, message_key: e.message_key, message: e.message,
                sqlstate: e.sqlstate, detail: e.detail, ...extra }, e.status);
}

export function guardError(status: number, code: string, message: string, sqlstate?: string, detail?: string): GuardError {
  return { status, code, message_key: `sessionGuard.error.${code}`, message, sqlstate, detail };
}

const SQLSTATE: Record<string, [number, string, string]> = {
  HC010: [422, 'reason_too_short', 'A reason of at least 15 characters is required (canned reasons are refused).'],
  HC011: [409, 'token_stale', 'The lesson, its evidence or its bills changed since the preview. Review the fresh preview.'],
  HC012: [422, 'confirm_required', 'This lesson needs an explicit confirmation.'],
  HC013: [422, 'correction_reason_required', 'This is a correction of a settled, taught lesson: a correction reason is required.'],
  HC014: [409, 'use_cancel', 'A lesson with evidence cannot be deleted. Cancel it instead.'],
  HC016: [413, 'too_many', 'Too many lessons in one request.'],
  HC017: [422, 'own_reason_required', 'This lesson has evidence: it needs its own reason, not the batch reason.'],
  HC020: [409, 'requires_checked_path', 'The database refused a direct change to this lesson.'],
  HC021: [409, 'reclass_not_supported', 'A lesson cannot be moved to another class.'],
  HC022: [409, 'one_change_at_a_time', 'Make one change at a time (cancel, move or class change).'],
  HC050: [503, 'guard_broken', 'The cancellation guard in the database is not working. Nothing was changed.'],
  '23505': [409, 'slot_taken', 'Another lesson of this class already sits in that slot.'],
  '23514': [400, 'rejected_by_database', 'The database refused the request (a value is too large or not allowed).'],
  '40P01': [503, 'retry', 'The database was busy. Nothing was changed; try again.'],
  '40001': [503, 'retry', 'The database was busy. Nothing was changed; try again.'],
  P0002: [404, 'not_found', 'Lesson not found.'],
  '42501': [403, 'forbidden', 'Admin access required.'],
  '22004': [400, 'bad_request', 'A required id is missing.'],
  '22P02': [400, 'bad_request', 'A value in the request is malformed.'],
  '55000': [503, 'evidence_unavailable', 'The lesson evidence could not be read. Nothing was changed.'],
};

const HC015: Record<string, number> = {
  already_canceled: 409, not_canceled: 409, bad_change: 400, bad_action: 400,
  bad_kind: 400, bad_items: 400, bad_payload: 400,
};

/** A PostgREST error from an RPC or query -> what the UI renders. */
export function mapDbError(err: any): GuardError {
  const code = String(err?.code ?? '');
  const message = String(err?.message ?? '');
  const detail = err?.details ?? err?.detail ?? undefined;
  // Function or table of the guard migration missing: not pasted yet.
  if (code === 'PGRST202' || code === '42883' || code === 'PGRST205' || code === '42P01') {
    return guardError(503, 'guard_not_installed', GUARD_NOT_INSTALLED_MESSAGE, code);
  }
  if (code === 'HC015') {
    const refuse = Object.prototype.hasOwnProperty.call(HC015, message) ? message : 'bad_request';
    return guardError(HC015[refuse] ?? 400, refuse, `Refused: ${refuse}.`, code, detail);
  }
  const m = SQLSTATE[code];
  if (m) return guardError(m[0], m[1], m[2], code, detail);
  return guardError(500, 'unexpected', 'Session operation failed. Nothing may have changed; reload and check.', code || undefined);
}

/** Courtesy check before the RPC; session_change_reason_ok is the authority. */
export function readReason(raw: unknown, field = 'reason'): { reason: string } | { error: GuardError } {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { error: guardError(422, `${field}_required`, `A ${field.replace('_', ' ')} is required.`) };
  }
  const reason = raw.replace(/\s+/g, ' ').trim();
  if (reason.length < REASON_MIN) {
    return { error: guardError(422, field === 'reason' ? 'reason_too_short' : 'correction_reason_required',
      `The ${field.replace('_', ' ')} must be at least ${REASON_MIN} characters.`) };
  }
  return { reason };
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** A client acting as the caller (anon key + the caller's JWT): RLS and auth.uid() apply. */
export function callerClient(createClient: any, url: string, anonKey: string, authHeader: string): any {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function rpc(client: any, name: string, params: Record<string, unknown>):
  Promise<{ data: any } | { error: GuardError }> {
  const { data, error } = await client.rpc(name, params);
  if (error) return { error: mapDbError(error) };
  return { data };
}

export async function preview(asCaller: any, id: string, op: string, change: unknown = null) {
  return rpc(asCaller, 'session_change_preview', { p_session_id: id, p_action: op, p_change: change ?? null });
}

// ------------------------------------------------------------- figures

/** Fields of a calculate-tuition response copied verbatim (no arithmetic;
 *  never the cumulative paid_amount). */
export function tuitionSnapshot(r: any) {
  if (!r || typeof r !== 'object') return null;
  return {
    totalAmount: r.totalAmount ?? null,
    baseAmount: r.baseAmount ?? null,
    totalDiscount: r.totalDiscount ?? null,
    sessionCount: r.sessionCount ?? null,
    tuitionFrozen: r.tuitionFrozen ?? null,
    siblingUnresolved: r.siblingUnresolved ?? null,
    invoiceSaved: r.invoiceSaved ?? null,
    carry: r.carry ? {
      carryInCredit: r.carry.carryInCredit ?? null, carryInDebt: r.carry.carryInDebt ?? null,
      carryOutCredit: r.carry.carryOutCredit ?? null, carryOutDebt: r.carry.carryOutDebt ?? null,
      status: r.carry.status ?? null,
    } : null,
  };
}

export interface PairResult {
  student_id: string;
  month: string;
  ok: boolean;
  error?: string;
  response?: ReturnType<typeof tuitionSnapshot>;
}

/** The canonical refresh: calculate-tuition per (student, month), CONTINUING
 *  past failures (review-1 B-7). Same call and same failure test as
 *  refreshCancelledTuition, one result per pair instead of a throw. */
export async function refreshPairs(service: any, pairs: Array<{ student_id: string; month: string }>): Promise<PairResult[]> {
  const seen = new Set<string>();
  const out: PairResult[] = [];
  for (const p of pairs ?? []) {
    if (!p?.student_id || !p?.month) continue;
    const key = `${p.student_id}:${p.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const { data, error } = await service.functions.invoke('calculate-tuition', {
        body: { studentId: p.student_id, month: p.month },
      });
      if (error || data?.error || data?.siblingUnresolved) {
        out.push({ student_id: p.student_id, month: p.month, ok: false,
          error: data?.siblingUnresolved ? 'sibling_unresolved' : String(data?.error ?? error?.message ?? 'refresh_failed'),
          response: tuitionSnapshot(data) });
      } else {
        out.push({ student_id: p.student_id, month: p.month, ok: true, response: tuitionSnapshot(data) });
      }
    } catch (e) {
      out.push({ student_id: p.student_id, month: p.month, ok: false, error: String((e as Error)?.message ?? e) });
    }
  }
  return out;
}

/** Refresh one override's pairs and record the outcome on the override
 *  (tuition_refreshed only when EVERY pair is ok - contract gap 3). */
export async function refreshAndRecord(service: any, asCaller: any, overrideId: string,
  pairs: Array<{ student_id: string; month: string }>) {
  const results = await refreshPairs(service, pairs ?? []);
  const allOk = results.every((r) => r.ok);
  let event_recorded = false;
  let event_error: string | undefined;
  if (results.length > 0 && overrideId) {
    const { error } = await asCaller.rpc('record_session_override_event', {
      p_override_id: overrideId,
      p_kind: allOk ? 'tuition_refreshed' : 'tuition_refresh_failed',
      p_payload: { source: 'edge', results },
    });
    event_recorded = !error;
    if (error) event_error = mapDbError(error).code;
  }
  return {
    status: results.length === 0 ? 'none' : allOk ? 'refreshed' : 'failed',
    results,
    failed: results.filter((r) => !r.ok).map((r) => ({ student_id: r.student_id, month: r.month, error: r.error })),
    event_recorded,
    event_error,
  };
}

export const AFTER_NOT_AVAILABLE = { available: false, reason: 'worked out after the change' } as const;

/** Consequences shown in a preview: READ-ONLY (D-review-3 F-1).
 *
 *  A preview never invokes calculate-tuition: every call of it upserts the
 *  bill with confirmation_status auto_approved|needs_review and status
 *  'issued', so a preview would un-confirm the bills it is about to judge
 *  (lowering the guard's own tier), create bills for months that had none,
 *  and spend the 30-a-minute budget the confirm's refresh needs. Nor does
 *  it invoke calculate-payroll, which upserts payroll_summaries for an open
 *  month. What it shows are the bills AS STORED, taken verbatim from the
 *  preview RPC's own `invoices_before` (the rows the token fingerprints),
 *  one entry per (student, month) the change touches, `bill: null` when no
 *  bill is saved. Nothing is computed here; the after-figures come from the
 *  confirm step's refresh through calculate-tuition. */
export function storedConsequences(p: any) {
  const pairs: Array<{ student_id: string; month: string }> = Array.isArray(p?.refresh_pairs) ? p.refresh_pairs : [];
  const stored: any[] = Array.isArray(p?.invoices_before) ? p.invoices_before : [];
  const marks = new Map<string, any>();
  for (const a of Array.isArray(p?.affected) ? p.affected : []) if (a?.student_id) marks.set(String(a.student_id), a);
  const seen = new Set<string>();
  const affected_students: any[] = [];
  const invoices_before: any[] = [];
  for (const pr of pairs) {
    if (!pr?.student_id || !pr?.month) continue;
    const key = `${pr.student_id}:${pr.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const m = marks.get(String(pr.student_id));
    affected_students.push({ student_id: pr.student_id, month: pr.month,
                             mark: m ? { status: m.status ?? null, marked_by_person: m.marked_by_person ?? null } : null });
    const i = stored.find((x) => x && String(x.student_id) === String(pr.student_id) && x.month === pr.month);
    invoices_before.push({ student_id: pr.student_id, month: pr.month, bill: i ? {
      total_amount: i.total_amount ?? null,
      discount_amount: i.discount_amount ?? null,
      recorded_payment: i.recorded_payment ?? null,
      confirmation_status: i.confirmation_status ?? null,
      status: i.status ?? null,
      tuition_frozen: i.tuition_frozen ?? null,
    } : null });
  }
  return {
    source: 'stored',
    affected_students,
    invoices_before,
    after: AFTER_NOT_AVAILABLE,
    pay_line: { available: false, reason: 'not fetched in a preview: calculate-payroll saves the month summary when it runs' },
  };
}


// ------------------------------------------------------------------ bulk

export interface BulkItem { id: string; token: string; confirm?: boolean; reason?: string; correction_reason?: string }

/** cancel_sessions_checked_bulk in chunks of <= 50 with ONE batch id.
 *  Each chunk is its own transaction. A chunk-level error (HC022, HC050,
 *  55000, deadlock, guard missing...) STOPS the loop: earlier chunks stay
 *  committed (and are refreshed), the failed chunk and every later one are
 *  returned as not_attempted with the code (contract gap 11). */
export async function bulkCancelChunks(asCaller: any, items: BulkItem[], reason: string, batchId: string,
  context: Record<string, unknown>) {
  const done: any[] = [];
  const refused: any[] = [];
  const not_attempted: any[] = [];
  let chunkError: GuardError | null = null;
  for (let i = 0; i < items.length; i += BULK_CHUNK) {
    const chunk = items.slice(i, i + BULK_CHUNK);
    if (chunkError) { for (const it of chunk) not_attempted.push({ id: it.id, code: chunkError.code }); continue; }
    const { data, error } = await asCaller.rpc('cancel_sessions_checked_bulk', {
      p_items: chunk, p_reason: reason, p_batch_id: batchId, p_context: context,
    });
    if (error) {
      chunkError = mapDbError(error);
      for (const it of chunk) not_attempted.push({ id: it.id, code: chunkError.code });
      continue;
    }
    for (const d of data?.done ?? []) done.push(d);
    for (const r of data?.refused ?? []) {
      const m = mapDbError({ code: r.code, message: r.message });
      refused.push({ id: r.id, code: m.code, message_key: m.message_key, sqlstate: r.code });
    }
  }
  return { done, refused, not_attempted, chunkError };
}

/** One preview per lesson, split into plain (tier 0, allowed) and the rest. */
export async function bulkPreview(asCaller: any, sessions: any[], op: string) {
  const plain: any[] = [], needs_ack: any[] = [], refused: any[] = [], preview_failed: any[] = [];
  for (const s of sessions) {
    const p = await preview(asCaller, s.id, op);
    if ('error' in p) {
      if (p.error.code === 'guard_not_installed' || p.error.code === 'forbidden') return { error: p.error };
      preview_failed.push({ id: s.id, code: p.error.code, message_key: p.error.message_key });
      continue;
    }
    const v = p.data;
    const row = { id: s.id, date: s.date, start_time: s.start_time, end_time: s.end_time, status: s.status,
                  class_id: s.class_id, teacher_id: s.teacher_id, tier: v.tier, token: v.token };
    if (!v.allowed) refused.push({ ...row, refuse_code: v.refuse_code });
    else if (v.tier === 0) plain.push(row);
    else needs_ack.push({ ...row, level: v.level, settled_any: v.settled_any, requires: v.requires,
                          review_required: v.review_required, evidence: v.evidence, affected: v.affected,
                          invoices_before: v.invoices_before, consequences: storedConsequences(v) });
  }
  return { plain, needs_ack, refused, preview_failed };
}

/** Items from the client: id + token, booleans only (22P02 aborts a chunk), de-duplicated. */
export function cleanItems(raw: unknown): { items: BulkItem[] } | { error: GuardError } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: guardError(400, 'bad_items', 'items is required.') };
  if (raw.length > BULK_PREVIEW_CAP) return { error: guardError(413, 'too_many', `At most ${BULK_PREVIEW_CAP} lessons.`) };
  const byId = new Map<string, BulkItem>();
  for (const it of raw as any[]) {
    if (!isUuid(it?.id) || typeof it?.token !== 'string') return { error: guardError(400, 'bad_items', 'Every item needs an id and a token.') };
    const item: BulkItem = { id: it.id, token: it.token };
    if (it.confirm === true) item.confirm = true;
    if (typeof it.reason === 'string' && it.reason.trim() !== '') item.reason = it.reason.replace(/\s+/g, ' ').trim();
    if (typeof it.correction_reason === 'string' && it.correction_reason.trim() !== '') {
      item.correction_reason = it.correction_reason.replace(/\s+/g, ' ').trim();
    }
    byId.set(it.id, item);
  }
  return { items: [...byId.values()] };
}

/** The one bulk confirm shape, used by bulk-cancel-sessions AND manage-session
 *  bulk-delete (D-review-3 F-4). Plain items are stripped to {id, token}, so
 *  no confirmation or own reason can ride along: the database refuses any of
 *  them that is not tier 0. A lesson that needs acknowledging comes only in
 *  `held_items` with `include_held: true`, each with `confirm: true`. */
export function bulkConfirmItems(plainIn: unknown, heldIn: unknown, includeHeld: unknown):
  { items: BulkItem[]; held_ignored: number } | { error: GuardError; extra?: Record<string, unknown> } {
  const plain = Array.isArray(plainIn) ? plainIn : [];
  const held = Array.isArray(heldIn) ? heldIn : [];
  const all: any[] = [];
  for (const it of plain) all.push({ id: (it as any)?.id, token: (it as any)?.token });
  let held_ignored = 0;
  if (includeHeld === true) {
    for (const it of held as any[]) {
      if (it?.confirm !== true) {
        return { error: guardError(422, 'confirm_required', 'Every lesson with evidence needs its own confirmation.'),
                 extra: { id: it?.id ?? null } };
      }
      all.push(it);
    }
  } else {
    held_ignored = held.length;
  }
  if (all.length === 0) return { error: guardError(400, 'bad_items', 'Nothing to change: send the previewed items.') };
  const cleaned = cleanItems(all);           // held items listed after plain ones win a duplicate id
  if ('error' in cleaned) return { error: cleaned.error };
  return { items: cleaned.items, held_ignored };
}

/** Ids among `ids` that the stated criteria did NOT select (D-review-3 F-5):
 *  the audit row records the criteria, so a lesson outside them is refused,
 *  not sent. Read on the given client; a lesson not found is left to the RPC. */
export async function outsideCriteria(client: any, ids: string[],
  c: { from?: string | null; to?: string | null; class_id?: string | null; teacher_id?: string | null }) {
  const out = new Set<string>();
  if (ids.length === 0) return out;
  const { data, error } = await client.from('sessions').select('id, date, class_id, teacher_id').in('id', ids);
  if (error) throw error;
  for (const s of data ?? []) {
    if ((c.from && s.date < c.from) || (c.to && s.date > c.to) ||
        (c.class_id && s.class_id !== c.class_id) || (c.teacher_id && s.teacher_id !== c.teacher_id)) out.add(s.id);
  }
  return out;
}

/** Refresh every done lesson's pairs, one event per override, continuing past failures. */
export async function refreshDone(service: any, asCaller: any, done: any[]) {
  const per: any[] = [];
  for (const d of done) {
    const t = await refreshAndRecord(service, asCaller, d.override_id, d.refresh_pairs ?? []);
    per.push({ id: d.id, override_id: d.override_id, status: t.status, failed: t.failed, event_recorded: t.event_recorded });
  }
  const failed = per.filter((p) => p.status === 'failed');
  return { status: per.length === 0 || per.every((p) => p.status === 'none') ? 'none' : failed.length ? 'failed' : 'refreshed',
           per_session: per, failed };
}

