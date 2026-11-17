// The checked money path (D4), shared by repair-attendance, mark-attendance
// and guarded-change-refresh. Contract: docs/evidence/D4-design.md c.2, (d)
// "Step 1b", and docs/evidence/D4-build-1b.md.
//
// RULES THIS FILE EXISTS TO KEEP
// - A person-initiated change is made through money_change_preview /
//   money_change_checked on a client built from the CALLER'S OWN
//   Authorization header. The service-role client only reads and refreshes
//   tuition; it never writes a guarded table for a person.
// - Nothing here prices anything: refreshes run calculate-tuition, at most
//   REFRESH_PER_CALL pairs a call (it allows 30 calls a minute), and what is
//   left stays in the pending view until the same call is made again.
// - A missing RPC is 503 guard_not_installed, with no fallback write.
//
// Imports only the session guard's error mapping and refresh (both
// dependency-free), so it type-checks and bundles on its own.
import { guardError, mapDbError, refreshAndRecord, refreshPairs, type GuardError, type PairResult } from './session-guard.ts';

export const REFRESH_PER_CALL = 25;

export interface MoneyAck {
  reason?: string | null;
  token?: string | null;
  confirm?: boolean;
  correction_reason?: string | null;
}

export async function moneyPreview(asCaller: any, entity: string, op: string, args: Record<string, unknown>):
  Promise<{ data: any } | { error: GuardError }> {
  const { data, error } = await asCaller.rpc('money_change_preview', { p_entity: entity, p_op: op, p_args: args });
  if (error) return { error: mapDbError(error) };
  return { data };
}

export async function moneyConfirm(asCaller: any, entity: string, op: string, args: Record<string, unknown>,
  ack: MoneyAck = {}, context: Record<string, unknown> = {}): Promise<{ data: any } | { error: GuardError }> {
  const { data, error } = await asCaller.rpc('money_change_checked', {
    p_entity: entity, p_op: op, p_args: args,
    p_reason: typeof ack.reason === 'string' && ack.reason.trim() !== '' ? ack.reason : null,
    p_token: typeof ack.token === 'string' ? ack.token : null,
    p_confirm: ack.confirm === true,
    p_correction_reason: typeof ack.correction_reason === 'string' && ack.correction_reason.trim() !== '' ? ack.correction_reason : null,
    p_context: context,
  });
  if (error) return { error: mapDbError(error) };
  return { data };
}

/** Reads an `ack` object from a request body: only strings and a boolean pass. */
export function readAck(raw: unknown): MoneyAck | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  return {
    reason: typeof a.reason === 'string' ? a.reason : null,
    token: typeof a.token === 'string' ? a.token : null,
    confirm: a.confirm === true,
    correction_reason: typeof a.correction_reason === 'string' ? a.correction_reason : null,
  };
}

/** The pairs already refreshed for an override, from its tuition_refreshed / _failed events. */
export function pairsDone(events: any[]): Set<string> {
  const done = new Set<string>();
  for (const e of events ?? []) {
    const results = e?.payload?.attached?.results;
    if (!Array.isArray(results)) continue;
    for (const r of results) if (r?.ok && r.student_id && r.month) done.add(`${r.student_id}:${r.month}`);
  }
  return done;
}

/**
 * Refresh an override's (student, month) pairs through calculate-tuition, at
 * most REFRESH_PER_CALL of the ones not yet refreshed, and record the result
 * as the caller: tuition_refreshed when nothing is left and every pair of
 * this call was ok, tuition_refresh_failed otherwise. The override and its
 * events are read AS THE CALLER (admin RLS).
 */
export async function refreshMoneyChange(service: any, asCaller: any, overrideId: string) {
  const { data: o, error } = await asCaller.from('money_change_overrides')
    .select('id, refresh_pairs').eq('id', overrideId).maybeSingle();
  if (error) return { error: mapDbError(error) };
  if (!o) return { error: guardError(404, 'not_found', 'That change was not found.') };
  const { data: ev, error: evErr } = await asCaller.from('money_change_events')
    .select('kind, payload').eq('override_id', overrideId);
  if (evErr) return { error: mapDbError(evErr) };
  const done = pairsDone(ev ?? []);
  const all: Array<{ student_id: string; month: string }> = Array.isArray(o.refresh_pairs) ? o.refresh_pairs : [];
  const todo = all.filter((p) => p?.student_id && p?.month && !done.has(`${p.student_id}:${p.month}`));
  const batch = todo.slice(0, REFRESH_PER_CALL);
  const results: PairResult[] = batch.length ? await refreshPairs(service, batch) : [];
  const remaining = todo.length - results.filter((r) => r.ok).length;
  const allOk = results.every((r) => r.ok) && remaining === 0;
  let event_recorded = false;
  let event_error: string | undefined;
  if (batch.length > 0) {
    const { error: e } = await asCaller.rpc('record_money_change_event', {
      p_override_id: overrideId,
      p_kind: allOk ? 'tuition_refreshed' : 'tuition_refresh_failed',
      p_payload: { source: 'edge', results, remaining },
    });
    event_recorded = !e;
    if (e) event_error = mapDbError(e).code;
  }
  return {
    status: all.length === 0 ? 'none' : allOk ? 'refreshed' : remaining > 0 && results.every((r) => r.ok) ? 'partial' : 'failed',
    results,
    remaining,
    failed: results.filter((r) => !r.ok).map((r) => ({ student_id: r.student_id, month: r.month, error: r.error })),
    event_recorded,
    event_error,
  };
}

/**
 * D4 step 4 (review B-2): after a second administrator's approval applied a
 * change, work out its bills again exactly as the direct path does - the
 * money override through refreshMoneyChange, a D2 lesson override through
 * refreshAndRecord - and record each outcome on the override, as the caller.
 * Which overrides, and of which kind, is read AS THE CALLER from the approval
 * record (change_approval_queue, admin RLS), never taken from the request
 * body. Idempotent: a money override refreshes only the pairs not yet done,
 * a D2 override that already has tuition_refreshed is left alone, so the
 * inbox's "work out the bills again" can simply call it again.
 */
export async function refreshApprovedChange(service: any, asCaller: any, requestId: string) {
  const { data: q, error } = await asCaller.from('change_approval_queue')
    .select('request_id, kind, rpc, status, override_ids').eq('request_id', requestId).maybeSingle();
  if (error) return { error: mapDbError(error) };
  if (!q) return { error: guardError(404, 'not_found', 'That approval request was not found.') };
  if (q.status !== 'applied') return { error: guardError(409, 'not_applied', 'That request has not been applied, so there are no bills to work out.') };
  const ids: string[] = (Array.isArray(q.override_ids) ? q.override_ids : []).filter((x: unknown) => typeof x === 'string');
  const table = q.kind === 'session' ? 'session' : q.kind === 'money' && q.rpc !== 'carry_payroll_adjustments' ? 'money' : null;
  const per: Array<{ override_id: string; status: string; remaining?: number; failed?: any[]; event_recorded?: boolean; error?: string }> = [];
  if (table) {
    for (const id of ids) {
      try {
        if (table === 'money') {
          const t = await refreshMoneyChange(service, asCaller, id);
          per.push('error' in t ? { override_id: id, status: 'failed', error: t.error.code }
            : { override_id: id, status: t.status, remaining: t.remaining, failed: t.failed,
                // nothing left to do this call: no event was due
                event_recorded: t.results.length > 0 ? t.event_recorded : undefined });
          continue;
        }
        const { data: o, error: oErr } = await asCaller.from('session_cancel_overrides')
          .select('id, refresh_pairs').eq('id', id).maybeSingle();
        if (oErr || !o) { per.push({ override_id: id, status: 'failed', error: oErr ? mapDbError(oErr).code : 'not_found' }); continue; }
        const { data: ev, error: evErr } = await asCaller.from('session_cancel_override_events')
          .select('kind').eq('override_id', id);
        if (evErr) { per.push({ override_id: id, status: 'failed', error: mapDbError(evErr).code }); continue; }
        if ((ev ?? []).some((e: any) => e?.kind === 'tuition_refreshed')) { per.push({ override_id: id, status: 'refreshed' }); continue; }
        const t = await refreshAndRecord(service, asCaller, id, Array.isArray(o.refresh_pairs) ? o.refresh_pairs : []);
        per.push({ override_id: id, status: t.status, failed: t.failed, event_recorded: t.event_recorded });
      } catch (e) {
        per.push({ override_id: id, status: 'failed', error: String((e as Error)?.message ?? e) });
      }
    }
  }
  const failed = per.filter((p) => p.status === 'failed' || p.status === 'partial' || (p.status === 'refreshed' && p.event_recorded === false));
  return {
    request_id: q.request_id,
    kind: q.kind,
    status: per.length === 0 || per.every((p) => p.status === 'none') ? 'none' : failed.length ? 'failed' : 'refreshed',
    per_override: per,
    failed: failed.length,
  };
}

/** The register's free week, in the function (G-11 rule 6 for teachers): did
 *  the lesson end more than 7 days ago? Hanoi = UTC+7, no DST. */
export function lessonEndedMoreThanAWeekAgo(date: string, start: string, end: string, now: Date = new Date()): boolean {
  const endIso = `${date}T${String(end).slice(0, 8).padEnd(8, ':00')}+07:00`;
  let endMs = Date.parse(endIso);
  if (String(end).slice(0, 5) <= String(start).slice(0, 5)) endMs += 24 * 3600 * 1000;
  if (!Number.isFinite(endMs)) return true;                       // unknown: treat as old (closed)
  return endMs < now.getTime() - 7 * 24 * 3600 * 1000;
}

/** "Past" month as the database decides it: before the month of (now in Hanoi - 7 days). */
export function monthIsPast(month: string, now: Date = new Date()): boolean {
  const t = new Date(now.getTime() + 7 * 3600 * 1000 - 7 * 24 * 3600 * 1000);   // Hanoi clock, minus 7 days
  const cur = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
  return String(month) < cur;
}

export const BILLABLE = new Set(['Present', 'Absent', 'Late']);
