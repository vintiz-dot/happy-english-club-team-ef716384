import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  BULK_PREVIEW_CAP, bulkCancelChunks, bulkConfirmItems, bulkPreview, callerClient, corsHeaders, fail, guardError,
  isUuid, json, outsideCriteria, preview, readReason, refreshDone, storedConsequences, type BulkItem,
} from '../_lib/session-guard.ts';

// Bulk cancel, checked (docs/evidence/D2-guard-design.md 7.3 as amended;
// contract in docs/evidence/D2-edge-build.md). Two steps:
//   step 'preview' - every lesson in the range gets its own preview; tier-0
//     lessons come back in `plain`, everything else in `needs_ack`.
//   step 'confirm' - `items` (plain ids + tokens) are cancelled with the one
//     batch reason; lessons with evidence are EXCLUDED unless they come in
//     `held_items` with their own token, `confirm: true` and (T2/T3) their
//     own reason, AND `include_held: true`. The database decides: anything
//     not tier 0 sent without confirmation is refused (HC012).
// Writes go through cancel_sessions_checked_bulk on the ADMIN'S OWN JWT,
// at most 50 per call, one batch id. The service client reads and
// refreshes tuition only.

const BulkCancelRequestSchema = z.object({
  step: z.enum(['preview', 'confirm']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  class_id: z.string().uuid("Invalid class ID").optional(),
  teacher_id: z.string().uuid("Invalid teacher ID").optional(),
  reason: z.string().max(1000, "Reason too long").optional(),
  include_held: z.boolean().optional(),
  items: z.array(z.any()).optional(),
  held_items: z.array(z.any()).optional(),
  batch_id: z.string().uuid().optional(),
});

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
      return json({ success: false, ok: false, error: 'Unauthorized', code: 'unauthorized', message_key: 'sessionGuard.error.unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, ok: false, error: 'Invalid token', code: 'unauthorized', message_key: 'sessionGuard.error.unauthorized' }, 401);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some((r: any) => r.role === 'admin')) {
      return json({ success: false, ok: false, error: 'Admin access required', code: 'forbidden', message_key: 'sessionGuard.error.forbidden' }, 403);
    }

    // Input validation
    const requestBody = await req.json();
    const validationResult = BulkCancelRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return json({ success: false, ok: false, error: "Invalid input", code: 'bad_request',
                    message_key: 'sessionGuard.error.bad_request', details: validationResult.error.issues }, 400);
    }

    const { step, date_from, date_to, class_id, teacher_id, include_held } = validationResult.data;

    // The old one-step screen sent no step: it must not cancel anything.
    if (!step) {
      return fail(guardError(409, 'preview_required',
        'Bulk cancel is now previewed first: reload the page and use the new bulk cancel screen.'), { success: false });
    }
    if (!anonKey) {
      return fail(guardError(503, 'misconfigured', 'SUPABASE_ANON_KEY is not set for this function. Nothing was changed.'));
    }
    const asCaller = callerClient(createClient, supabaseUrl, anonKey, authHeader);

    // ----------------------------------------------------------- preview
    if (step === 'preview') {
      if (!date_from || !date_to) return fail(guardError(400, 'bad_request', 'date_from and date_to are required.'));
      const days = (Date.parse(date_to) - Date.parse(date_from)) / 86400000;
      if (!(days >= 0 && days <= 62)) return fail(guardError(400, 'bad_request', 'The range must be 0-62 days.'));
      let query = supabase
        .from('sessions')
        .select('id, date, status, class_id, teacher_id, start_time, end_time')
        .gte('date', date_from)
        .lte('date', date_to)
        .neq('status', 'Canceled');
      if (class_id) query = query.eq('class_id', class_id);
      if (teacher_id) query = query.eq('teacher_id', teacher_id);
      const { data: sessions, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if ((sessions?.length ?? 0) > BULK_PREVIEW_CAP) {
        return fail(guardError(413, 'too_many', `More than ${BULK_PREVIEW_CAP} lessons: narrow the range.`));
      }
      const out = await bulkPreview(asCaller, sessions ?? [], 'cancel');
      if ('error' in out) return fail(out.error as any);
      return json({ ok: true, success: true, batch_id: crypto.randomUUID(), ...out });
    }

    // ----------------------------------------------------------- confirm
    const rr = readReason(validationResult.data.reason);
    if ('error' in rr) return fail(rr.error, { success: false });

    // Plain items: id + token only - never a confirmation or own reason,
    // so the database refuses any of them that is not tier 0.
    const split = bulkConfirmItems(validationResult.data.items, validationResult.data.held_items, include_held);
    if ('error' in split) return fail(split.error, split.extra ?? {});
    const held_ignored = split.held_ignored;
    // Criteria the request states are enforced, not only recorded (F-5).
    const outside = await outsideCriteria(supabase, split.items.map((i) => i.id),
      { from: date_from, to: date_to, class_id, teacher_id });
    const items: BulkItem[] = split.items.filter((i) => !outside.has(i.id));
    const outsideRefused = [...outside].map((id) => ({ id, code: 'outside_criteria',
      message_key: 'sessionGuard.error.outside_criteria', sqlstate: null }));
    const batchId = validationResult.data.batch_id ?? crypto.randomUUID();

    const { done, refused: dbRefused, not_attempted, chunkError } = items.length === 0
      ? { done: [] as any[], refused: [] as any[], not_attempted: [] as any[], chunkError: null }
      : await bulkCancelChunks(asCaller, items, rr.reason, batchId, {
      set_manual: 'true',
      attached: { source: 'bulk-cancel-sessions', criteria: { date_from, date_to, class_id, teacher_id }, include_held: !!include_held },
    });
    const refused = [...outsideRefused, ...dbRefused];
    if (chunkError && done.length === 0 && refused.length === 0) {
      return fail(chunkError, { success: false, not_attempted });
    }

    // Lessons the database refused for want of an acknowledgement come back
    // with a fresh preview, to be acknowledged one by one.
    const needs_ack: any[] = [];
    for (const r of refused) {
      if (!['confirm_required', 'token_stale', 'own_reason_required', 'correction_reason_required'].includes(r.code)) continue;
      if (needs_ack.length >= 50 || !isUuid(r.id)) break;
      const p = await preview(asCaller, r.id, 'cancel');
      if ('data' in p) {
        needs_ack.push({ id: r.id, tier: p.data.tier, level: p.data.level, settled_any: p.data.settled_any,
                         requires: p.data.requires, review_required: p.data.review_required,
                         evidence: p.data.evidence, token: p.data.token, consequences: storedConsequences(p.data) });
      }
    }

    const tuition = await refreshDone(supabase, asCaller, done);

    await supabase.from('audit_log').insert({
      action: 'bulk_cancel_sessions',
      entity: 'sessions',
      actor_user_id: user.id,
      diff: {
        batch_id: batchId,
        count: done.length,
        refused: refused.length,
        not_attempted: not_attempted.length,
        criteria: { date_from, date_to, class_id, teacher_id },
        reason: rr.reason,
        affected_ids: done.map((d: any) => d.id),
        override_ids: done.map((d: any) => d.override_id),
      },
    });

    return json({
      ok: !chunkError,
      success: !chunkError,
      partial: !!chunkError || refused.length > 0,
      batch_id: batchId,
      canceled: done.map(({ refresh_pairs: _p, ...d }: any) => d),
      refused,
      not_attempted,
      needs_ack,
      held_ignored,
      stopped: chunkError ? { code: chunkError.code, message_key: chunkError.message_key, message: chunkError.message } : null,
      tuition,
    });
  } catch (error: any) {
    console.error('Bulk cancel error:', error);
    // Don't expose internal errors to client
    return json({ success: false, ok: false, error: 'Failed to cancel sessions', code: 'unexpected',
                  message_key: 'sessionGuard.error.unexpected' }, 500);
  }
});
