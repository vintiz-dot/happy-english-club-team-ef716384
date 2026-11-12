import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import {
  BULK_PREVIEW_CAP, bulkCancelChunks, callerClient, corsHeaders, fail, fetchConsequences, guardError,
  GUARD_NOT_INSTALLED_MESSAGE, isUuid, json, mapDbError, preview, readReason, refreshAndRecord, rpc,
  studentsAndMonths, type BulkItem, type GuardError,
} from '../_lib/session-guard.ts';

// Cancel, un-cancel, delete and move go through the checked RPCs of
// 20261112091000_session_cancel_guard.sql, called WITH THE ADMIN'S OWN JWT
// (asCaller). Two steps: `preview` returns the evidence, the tier and an
// acknowledgement token; the action sends the token back with a reason.
// The service-role client only reads, writes the named audit_log entry and
// invokes calculate-tuition / calculate-payroll. Contract for the screens:
// docs/evidence/D2-edge-build.md "Contract for the dialogs (D3)".

const SessionActionSchema = z.object({
  action: z.enum(['preview', 'update', 'move', 'cancel', 'force-cancel', 'change-status', 'uncancel',
                  'bulk-delete', 'delete', 'refresh-tuition', 'create']),
  data: z.record(z.any()),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(:\d{2})?$/;
const hhmmss = (t: string) => (t.length === 5 ? `${t}:00` : t);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized', ok: false, code: 'unauthorized', message_key: 'sessionGuard.error.unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Invalid token', ok: false, code: 'unauthorized', message_key: 'sessionGuard.error.unauthorized' }, 401);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some((r: any) => r.role === 'admin')) {
      return json({ error: 'Admin access required', ok: false, code: 'forbidden', message_key: 'sessionGuard.error.forbidden' }, 403);
    }

    // Rate limiting: 50 session management actions per minute per user
    const clientIP = getClientIP(req);
    const userRateCheck = checkRateLimit(user.id, 50, 60 * 1000, 'user');
    if (userRateCheck.limited) {
      console.warn(`Rate limit exceeded for user ${user.id} on manage-session`);
      await supabase.from('audit_log').insert({
        action: 'rate_limit_exceeded',
        entity: 'session',
        actor_user_id: user.id,
        diff: { reason: 'session_management_rate_limit', ip: clientIP }
      });
      return rateLimitResponse(userRateCheck.resetAt, corsHeaders);
    }

    // Input validation
    const requestBody = await req.json();
    const validationResult = SessionActionSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return json({ error: "Invalid input", ok: false, code: 'bad_request', message_key: 'sessionGuard.error.bad_request',
                    details: validationResult.error.issues }, 400);
    }

    const { action, data } = validationResult.data;

    // Every guarded write goes through this client: auth.uid() is the admin.
    if (!anonKey && action !== 'create') {
      return fail(guardError(503, 'misconfigured', 'SUPABASE_ANON_KEY is not set for this function. Nothing was changed.'));
    }
    const asCaller = anonKey ? callerClient(createClient, supabaseUrl, anonKey, authHeader) : null;

    const loadSession = async (id: string) => {
      const { data: s, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return s;
    };
    const audit = (auditAction: string, id: string | null, diff: unknown) =>
      supabase.from('audit_log').insert({ action: auditAction, entity: 'sessions', entity_id: id, actor_user_id: user.id, diff });
    const needId = (): GuardError | null =>
      isUuid(data.id) ? null : guardError(400, 'bad_request', 'A lesson id is required.');

    /** The confirm step shared by cancel / delete / uncancel / move. */
    const confirmed = async (op: string, id: string, rpcName: string, params: Record<string, unknown>,
                             auditAction: string, change: unknown = null) => {
      const r = await rpc(asCaller, rpcName, params);
      if ('error' in r) {
        if (r.error.code === 'token_stale') {
          const fresh = await preview(asCaller, id, op, change);
          return fail(r.error, { preview: 'data' in fresh ? fresh.data : null });
        }
        return fail(r.error);
      }
      const result = r.data;
      const tuition = await refreshAndRecord(supabase, asCaller, result?.override_id, result?.refresh_pairs ?? []);
      await audit(auditAction, id, { override_id: result?.override_id, tier: result?.tier, reason: params.p_reason,
                                     review_required: result?.review_required, tuition_status: tuition.status });
      return json({ ok: true, result, tuition });
    };

    /** Shared front half: token + reason present, else a code the UI renders. */
    const readAck = (): { reason: string; token: string } | Response => {
      if (typeof data.token !== 'string' || data.token === '') {
        return fail(guardError(409, 'preview_required',
          'This screen is out of date: open the lesson again to see what this change affects, then confirm.'));
      }
      const rr = readReason(data.reason);
      if ('error' in rr) return fail(rr.error);
      return { reason: rr.reason, token: data.token };
    };
    const correction = (): string | null =>
      typeof data.correction_reason === 'string' && data.correction_reason.trim() !== ''
        ? data.correction_reason.replace(/\s+/g, ' ').trim() : null;

    // ----------------------------------------------------------- preview
    if (action === 'preview') {
      const bad = needId(); if (bad) return fail(bad);
      const op = data.op;
      if (!['cancel', 'delete', 'move', 'uncancel'].includes(op)) {
        return fail(guardError(400, 'bad_action', 'op must be cancel, delete, move or uncancel.'));
      }
      let change: unknown = null;
      if (op === 'move') {
        const c = data.change ?? {};
        if (!DATE.test(c.date ?? '') || !TIME.test(c.start_time ?? '') || !TIME.test(c.end_time ?? '')) {
          return fail(guardError(400, 'bad_change', 'A move needs date YYYY-MM-DD, start_time and end_time HH:MM.'));
        }
        change = { date: c.date, start_time: hhmmss(c.start_time), end_time: hhmmss(c.end_time) };
      }
      // First read: who is on the register and which months (and is the guard there at all).
      const first = await preview(asCaller, data.id, op, change);
      if ('error' in first) return fail(first.error);
      let consequences: any = { fetched: false, reason: 'not_requested' };
      if (data.figures !== false) {
        const session = await loadSession(data.id);
        const { students, months } = studentsAndMonths(first.data);
        // calculate-tuition saves the canonical bill as it always does, so it
        // runs BEFORE the preview that issues the token.
        consequences = await fetchConsequences(supabase, session, students, months);
      }
      const final = data.figures === false ? first : await preview(asCaller, data.id, op, change);
      if ('error' in final) return fail(final.error);
      return json({ ok: true, preview: final.data, consequences });
    }

    // ----------------------------------------------- cancel / force-cancel
    if (action === 'cancel' || action === 'force-cancel') {
      const bad = needId(); if (bad) return fail(bad);
      const ack = readAck(); if (ack instanceof Response) return ack;
      return confirmed('cancel', data.id, 'cancel_session_checked', {
        p_session_id: data.id, p_action: 'cancel', p_reason: ack.reason, p_token: ack.token,
        p_confirm: data.confirm === true, p_correction_reason: correction(),
        p_context: { attached: { source: 'manage-session', via_action: action } },
      }, action === 'force-cancel' ? 'session_force_cancel' : 'session_cancel');
    }

    // ---------------------------------------------------------- uncancel
    if (action === 'uncancel') {
      const bad = needId(); if (bad) return fail(bad);
      const ack = readAck(); if (ack instanceof Response) return ack;
      return confirmed('uncancel', data.id, 'uncancel_session_checked', {
        p_session_id: data.id, p_reason: ack.reason, p_token: ack.token,
        p_context: { attached: { source: 'manage-session', via_action: 'uncancel' } },
        p_correction_reason: correction(),
      }, 'session_uncancel');
    }

    // ------------------------------------------------------------ delete
    if (action === 'delete') {
      const bad = needId(); if (bad) return fail(bad);
      const ack = readAck(); if (ack instanceof Response) return ack;
      return confirmed('delete', data.id, 'cancel_session_checked', {
        p_session_id: data.id, p_action: 'delete', p_reason: ack.reason, p_token: ack.token,
        p_confirm: data.confirm === true, p_correction_reason: correction(),
        p_context: { attached: { source: 'manage-session', via_action: 'delete' } },
      }, 'session_delete');
    }

    // ----------------------------------------------------- change-status
    if (action === 'change-status') {
      const bad = needId(); if (bad) return fail(bad);
      const { id, status } = data;
      if (!['Scheduled', 'Held', 'Canceled'].includes(status)) {
        return json({ error: 'Invalid status', ok: false, code: 'bad_request', message_key: 'sessionGuard.error.bad_request' }, 400);
      }
      const oldSession = await loadSession(id);
      if (!oldSession) return fail(guardError(404, 'not_found', 'Lesson not found.'));

      if (status === 'Canceled' && oldSession.status !== 'Canceled') {
        const ack = readAck(); if (ack instanceof Response) return ack;
        return confirmed('cancel', id, 'cancel_session_checked', {
          p_session_id: id, p_action: 'cancel', p_reason: ack.reason, p_token: ack.token,
          p_confirm: data.confirm === true, p_correction_reason: correction(),
          p_context: { attached: { source: 'manage-session', via_action: 'change-status' } },
        }, 'session_status_change');
      }
      if (oldSession.status === 'Canceled' && status !== 'Canceled') {
        if (status !== 'Scheduled') {
          return fail(guardError(409, 'uncancel_to_scheduled_only',
            'A cancelled lesson comes back as Scheduled only; mark the register afterwards.'));
        }
        const ack = readAck(); if (ack instanceof Response) return ack;
        return confirmed('uncancel', id, 'uncancel_session_checked', {
          p_session_id: id, p_reason: ack.reason, p_token: ack.token,
          p_context: { attached: { source: 'manage-session', via_action: 'change-status' } },
          p_correction_reason: correction(),
        }, 'session_status_change');
      }
      if (oldSession.status === status) return json({ ok: true, unchanged: true });

      // Scheduled <-> Held: not a guarded kind. Unchanged behaviour, but the
      // write is the admin's own (no service key on sessions).
      const { error } = await asCaller.from('sessions').update({ status, updated_by: user.id }).eq('id', id);
      if (error) return fail(mapDbError(error));
      await audit('session_status_change', id, {
        old_status: oldSession.status, new_status: status, reason: data.reason ?? null,
        note: 'Admin override for mistake correction',
      });
      return json({ ok: true });
    }

    // -------------------------------------------------------------- move
    if (action === 'move') {
      const bad = needId(); if (bad) return fail(bad);
      if (!DATE.test(data.date ?? '') || !TIME.test(data.start_time ?? '') || !TIME.test(data.end_time ?? '')) {
        return fail(guardError(400, 'bad_change', 'A move needs date YYYY-MM-DD, start_time and end_time HH:MM.'));
      }
      const change = { date: data.date, start_time: hhmmss(data.start_time), end_time: hhmmss(data.end_time) };
      const p = await preview(asCaller, data.id, 'move', change);
      if ('error' in p) return fail(p.error);
      if (p.data?.kind === null || p.data?.kind === undefined) {
        // Not a move in the guard's sense (B-1): a same-day time edit that
        // leaves a started lesson started. Plain update, as the admin.
        const s = p.data?.session ?? {};
        if (change.date !== s.date || change.end_time <= change.start_time || s.status === 'Canceled') {
          return fail(guardError(400, 'bad_change', 'That change is not valid for this lesson.'));
        }
        const { error } = await asCaller.from('sessions')
          .update({ start_time: change.start_time, end_time: change.end_time, updated_by: user.id }).eq('id', data.id);
        if (error) return fail(mapDbError(error));
        await audit('session_update', data.id, { before: s, after: change, kind: null });
        return json({ ok: true, kind: null, applied: 'plain_update' });
      }
      if (!p.data.allowed) {
        const e = mapDbError({ code: 'HC015', message: p.data.refuse_code });
        return fail(e, { preview: p.data });
      }
      const ack = readAck();
      if (ack instanceof Response) return ack;
      return confirmed('move', data.id, 'move_session_checked', {
        p_session_id: data.id, p_new_date: change.date, p_new_start: change.start_time, p_new_end: change.end_time,
        p_reason: ack.reason, p_token: ack.token, p_confirm: data.confirm === true,
        p_correction_reason: correction(), p_context: { attached: { source: 'manage-session', via_action: 'move' } },
      }, 'session_move', change);
    }

    // ------------------------------------------------------------ update
    if (action === 'update') {
      const bad = needId(); if (bad) return fail(bad);
      const { id, teacher_id, rate_override_vnd, status, notes, is_manual, manual_reason } = data;
      const oldSession = await loadSession(id);
      if (!oldSession) return fail(guardError(404, 'not_found', 'Lesson not found.'));

      // What the guard checks never goes through a plain update.
      if (data.class_id !== undefined && data.class_id !== oldSession.class_id) {
        return fail(guardError(409, 'reclass_not_supported', 'A lesson cannot be moved to another class.'));
      }
      if (status !== undefined && status !== null && (status === 'Canceled') !== (oldSession.status === 'Canceled')) {
        return fail(guardError(409, 'requires_checked_path',
          'Cancelling or bringing back a lesson is done with Cancel / Un-cancel, with a reason.'), {
          use_action: status === 'Canceled' ? 'cancel' : 'uncancel' });
      }
      const timeChanged = ['date', 'start_time', 'end_time'].some((k) =>
        data[k] !== undefined && data[k] !== null && hhmmss(String(data[k])) !== String(oldSession[k]));
      if (timeChanged) {
        return fail(guardError(409, 'requires_checked_path', 'Date and time changes go through Move.'), { use_action: 'move' });
      }

      // Detect if manual edit (teacher or time change)
      const isManualEdit = teacher_id !== undefined && teacher_id !== oldSession?.teacher_id;

      const { error } = await asCaller.from('sessions').update({
        teacher_id: teacher_id !== undefined ? teacher_id : oldSession?.teacher_id,
        rate_override_vnd: rate_override_vnd !== undefined ? rate_override_vnd : oldSession?.rate_override_vnd,
        status: status || oldSession?.status,
        notes: notes !== undefined ? notes : oldSession?.notes,
        is_manual: is_manual !== undefined ? is_manual : (isManualEdit || oldSession?.is_manual),
        manual_reason: manual_reason || (isManualEdit ? 'Manual teacher reassignment' : oldSession?.manual_reason),
        updated_by: user.id,
      }).eq('id', id);

      if (error) return fail(mapDbError(error));

      await audit('session_update', id, { before: oldSession, after: data });
      return json({ ok: true });
    }

    // ---------------------------------------------------- refresh-tuition
    if (action === 'refresh-tuition') {
      if (!isUuid(data.override_id)) return fail(guardError(400, 'bad_request', 'override_id is required.'));
      const { data: o, error } = await asCaller.from('session_cancel_overrides')
        .select('id, session_id, refresh_pairs').eq('id', data.override_id).maybeSingle();
      if (error) return fail(mapDbError(error));
      if (!o) return fail(guardError(404, 'not_found', 'No such checked change.'));
      const tuition = await refreshAndRecord(supabase, asCaller, o.id, o.refresh_pairs ?? []);
      return json({ ok: true, override_id: o.id, tuition });
    }

    // -------------------------------------------------------- bulk-delete
    if (action === 'bulk-delete') {
      const { class_id, teacher_id, from_date, to_date, hard_delete = false } = data;
      const op = hard_delete ? 'delete' : 'cancel';
      if (data.step !== 'preview' && data.step !== 'confirm') {
        return fail(guardError(409, 'preview_required', 'Bulk changes are previewed first (step: preview), then confirmed.'));
      }
      if (!DATE.test(from_date ?? '') || !DATE.test(to_date ?? '') || (!isUuid(class_id) && !isUuid(teacher_id))) {
        return fail(guardError(400, 'bad_request', 'from_date, to_date and a class_id or teacher_id are required.'));
      }
      const days = (Date.parse(to_date) - Date.parse(from_date)) / 86400000;
      if (!(days >= 0 && days <= 62)) return fail(guardError(400, 'bad_request', 'The range must be 0-62 days.'));

      if (data.step === 'preview') {
        let query = supabase.from('sessions').select('id, date, start_time, end_time, status, class_id, teacher_id')
          .gte('date', from_date).lte('date', to_date);
        if (isUuid(class_id)) query = query.eq('class_id', class_id);
        if (isUuid(teacher_id)) query = query.eq('teacher_id', teacher_id);
        const { data: rows, error } = await query;
        if (error) throw error;
        const candidates = (rows ?? []).filter((s: any) => op === 'delete' || s.status !== 'Canceled');
        if (candidates.length > BULK_PREVIEW_CAP) {
          return fail(guardError(413, 'too_many', `More than ${BULK_PREVIEW_CAP} lessons: narrow the range.`));
        }
        const out = await bulkPreview(asCaller, candidates, op);
        if ('error' in out) return fail(out.error as GuardError);
        return json({ ok: true, op, batch_id: crypto.randomUUID(), ...out });
      }

      const rr = readReason(data.reason); if ('error' in rr) return fail(rr.error);
      const items = cleanItems(data.items);
      if ('error' in items) return fail(items.error);
      const batchId = isUuid(data.batch_id) ? data.batch_id : crypto.randomUUID();
      let done: any[] = [], refused: any[] = [], not_attempted: any[] = [], chunkError: GuardError | null = null;
      if (op === 'cancel') {
        ({ done, refused, not_attempted, chunkError } = await bulkCancelChunks(asCaller, items.items, rr.reason, batchId,
          { attached: { source: 'manage-session', via_action: 'bulk-delete' } }));
      } else {
        // No bulk delete RPC: one checked delete per lesson, each its own
        // transaction - NOT atomic (contract gap 6).
        for (const it of items.items) {
          if (chunkError) { not_attempted.push({ id: it.id, code: chunkError.code }); continue; }
          const { data: r, error } = await asCaller.rpc('cancel_session_checked', {
            p_session_id: it.id, p_action: 'delete', p_reason: it.reason ?? rr.reason, p_token: it.token,
            p_confirm: it.confirm === true, p_correction_reason: it.correction_reason ?? null,
            p_context: { batch_id: batchId, attached: { source: 'manage-session', via_action: 'bulk-delete' } },
          });
          if (error) {
            const m = mapDbError(error);
            if (['guard_not_installed', 'guard_broken', 'evidence_unavailable', 'retry', 'unexpected', 'forbidden'].includes(m.code)) {
              chunkError = m; not_attempted.push({ id: it.id, code: m.code });
            } else refused.push({ id: it.id, code: m.code, message_key: m.message_key, sqlstate: m.sqlstate });
            continue;
          }
          done.push({ id: it.id, override_id: r?.override_id, tier: r?.tier, review_required: r?.review_required,
                      refresh_pairs: r?.refresh_pairs ?? [] });
        }
      }
      if (chunkError?.code === 'guard_not_installed' && done.length === 0) return fail(chunkError);
      const tuition = await refreshDone(supabase, asCaller, done);
      await audit(op === 'delete' ? 'session_bulk_hard_delete' : 'session_bulk_cancel', null, {
        batch_id: batchId, count: done.length, ids: done.map((d) => d.id), refused: refused.length,
        not_attempted: not_attempted.length, criteria: { class_id, teacher_id, from_date, to_date }, reason: rr.reason,
      });
      return json({
        ok: !chunkError, partial: !!chunkError || refused.length > 0, op, batch_id: batchId,
        done: done.map(({ refresh_pairs: _p, ...d }) => d), refused, not_attempted,
        stopped: chunkError ? { code: chunkError.code, message_key: chunkError.message_key, message: chunkError.message } : null,
        tuition,
      }, chunkError ? (chunkError.status >= 500 ? 207 : 200) : 200);
    }

    // ------------------------------------------------------------ create
    if (action === 'create') {
      const { class_id, date, start_time, end_time, teacher_id, rate_override_vnd, notes, status, is_manual, manual_reason } = data;

      const { data: newSession, error } = await supabase.from('sessions').insert({
        class_id, date, start_time, end_time, teacher_id,
        rate_override_vnd: rate_override_vnd || null,
        notes: notes || null,
        status: status || 'Scheduled',
        is_manual: is_manual || true, // Ad-hoc sessions are manual by default
        manual_reason: manual_reason || 'Admin ad-hoc creation',
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'session_create',
        entity: 'sessions',
        entity_id: newSession.id,
        actor_user_id: user.id,
        diff: { created: newSession }
      });

      return json({ ok: true, session: newSession });
    }

    return json({ error: 'Invalid action', ok: false, code: 'bad_action', message_key: 'sessionGuard.error.bad_action' }, 400);
  } catch (error: any) {
    console.error('Session management error:', error);
    const m = mapDbError(error);
    if (m.code === 'guard_not_installed') return fail(m);
    // Don't expose internal errors to client
    return json({ error: 'Session operation failed', ok: false, code: 'unexpected',
                  message_key: 'sessionGuard.error.unexpected' }, 500);
  }
});

/** One preview per lesson, split into plain (tier 0, allowed) and the rest. */
async function bulkPreview(asCaller: any, sessions: any[], op: string) {
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
                          invoices_before: v.invoices_before });
  }
  return { plain, needs_ack, refused, preview_failed };
}

/** Items from the client: id + token, booleans only (22P02 aborts a chunk), de-duplicated. */
function cleanItems(raw: unknown): { items: BulkItem[] } | { error: GuardError } {
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

/** Refresh every done lesson's pairs, one event per override, continuing past failures. */
async function refreshDone(service: any, asCaller: any, done: any[]) {
  const per: any[] = [];
  for (const d of done) {
    const t = await refreshAndRecord(service, asCaller, d.override_id, d.refresh_pairs ?? []);
    per.push({ id: d.id, override_id: d.override_id, status: t.status, failed: t.failed, event_recorded: t.event_recorded });
  }
  const failed = per.filter((p) => p.status === 'failed');
  return { status: per.length === 0 || per.every((p) => p.status === 'none') ? 'none' : failed.length ? 'failed' : 'refreshed',
           per_session: per, failed };
}

export { GUARD_NOT_INSTALLED_MESSAGE };
