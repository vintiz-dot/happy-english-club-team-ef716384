// recorder-retention - deletes class-recorder audio that is past its
// retention date or was asked to be deleted, then lets the rows go to
// `deleted` (C1-architecture 6.5).
//
// WHO MAY RUN IT. The nightly job (pg_cron + pg_net, presenting the shared
// runner token from `schedule_runner`, which only the service role can read)
// or an admin's "delete now" (their own JWT; optionally one recording_id).
// Nobody else - not a teacher, not the service-role key on its own: the
// function is deployed with verify_jwt = true, and verify_jwt alone is not a
// check (the public anon key is a valid JWT), so the token or the admin role
// is required here as well. Every failure to establish either is a 401/403.
//
// WHY THE SERVICE ROLE. No signed-in person is present at 03:00, and no
// teacher may delete these files under RLS (the bucket has no DELETE policy at
// all). The service client is used only to read the due list, list and
// remove objects under each recording's own prefix, and call the migration's
// functions. It never downloads audio.
//
// FAILS CLOSED. A recording is marked deleted only after a SECOND listing of
// its prefix comes back empty - and the database refuses the mark anyway
// while it can still see an object. A prefix that is not exactly
// `{class_id}/{recording_id}/` for that row is skipped, never removed.
//
// LOGS IDS AND COUNTS ONLY: no names, no paths beyond ids, no audio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";

/** The recorder's own bucket. Must equal BUCKET in src/lib/recorder/backend.ts (asserted by the test). */
export const BUCKET = "class-recorder-audio";
const BATCH = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-schedule-runner-secret",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Constant-time comparison, so the token cannot be guessed a character at a time. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function runnerTokenMatches(req: Request, sb: any): Promise<boolean> {
  const presented = req.headers.get("x-schedule-runner-secret");
  if (!presented) return false;
  const { data, error } = await sb.from("schedule_runner").select("token").eq("id", 1).maybeSingle();
  if (error || !data?.token) return false;
  return sameSecret(presented, String(data.token));
}

/** Every object name under a prefix (Storage lists one level at a time; folders have id null). */
async function listAll(sb: any, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (p: string, depth: number) => {
    if (depth > 3) throw new Error("unexpected nesting under a recording prefix");
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.storage.from(BUCKET).list(p.replace(/\/$/, ""), { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`list failed: ${error.message ?? error}`);
      const rows = (data ?? []) as { name: string; id: string | null }[];
      for (const r of rows) {
        const full = `${p}${r.name}`;
        if (r.id === null) await walk(`${full}/`, depth + 1);
        else out.push(full);
      }
      if (rows.length < 1000) break;
    }
  };
  await walk(prefix, 0);
  return out;
}

export interface RetentionResult {
  expired_stale: number;
  due: number;
  deleted: number;
  deleted_ids: string[];
  objects_removed: number;
  skipped: { recording_id: string; reason: string }[];
  /** C2 review m8: due recordings left for the next run (the run is capped in count and time). */
  remaining: number;
}

/** At most this many recordings, and this long, per run; the next night continues (it is idempotent). */
export const MAX_RECORDINGS_PER_RUN = 25;
export const RUN_BUDGET_MS = 100_000;

export async function runRetention(sb: any, opts: { recordingId?: string | null; maxRecordings?: number; budgetMs?: number; now?: () => number } = {}): Promise<RetentionResult> {
  const result: RetentionResult = { expired_stale: 0, due: 0, deleted: 0, deleted_ids: [], objects_removed: 0, skipped: [], remaining: 0 };
  const now = opts.now ?? (() => Date.now());
  const startedAt = now();
  const max = opts.maxRecordings ?? MAX_RECORDINGS_PER_RUN;
  const budget = opts.budgetMs ?? RUN_BUDGET_MS;

  // 1. Recordings never finished 14 days after their lesson become abandoned (and so due).
  const stale = await sb.rpc("recorder_expire_stale");
  if (stale.error) throw new Error(`recorder_expire_stale: ${stale.error.message}`);
  result.expired_stale = Number(stale.data ?? 0);

  // 2. What is due now.
  const due = await sb.rpc("recorder_retention_due");
  if (due.error) throw new Error(`recorder_retention_due: ${due.error.message}`);
  let rows = (due.data ?? []) as { recording_id: string; class_id: string; storage_prefix: string }[];
  if (opts.recordingId) rows = rows.filter((r) => r.recording_id === opts.recordingId);
  result.due = rows.length;

  let done = 0;
  for (const r of rows) {
    // m8: a backlog (the first run weeks after go-live) must not outlast the
    // function's limit; what is left is reported and taken next time.
    if (done >= max || now() - startedAt > budget) { result.remaining = rows.length - done; break; }
    done += 1;
    const expected = `${r.class_id}/${r.recording_id}/`;
    if (!UUID.test(r.class_id) || !UUID.test(r.recording_id) || r.storage_prefix !== expected) {
      result.skipped.push({ recording_id: r.recording_id, reason: "prefix is not {class}/{recording}/" });
      continue;
    }
    try {
      // 3. List, remove in batches, list again.
      const names = await listAll(sb, expected);
      if (names.some((n) => !n.startsWith(expected))) throw new Error("listing returned a path outside the prefix");
      for (let i = 0; i < names.length; i += BATCH) {
        const { error } = await sb.storage.from(BUCKET).remove(names.slice(i, i + BATCH));
        if (error) throw new Error(`remove failed: ${error.message ?? error}`);
      }
      result.objects_removed += names.length;
      const left = await listAll(sb, expected);
      if (left.length) {
        result.skipped.push({ recording_id: r.recording_id, reason: `${left.length} object(s) still listed after removal` });
        continue;
      }
      // 4. Only now, and the database checks again.
      const mark = await sb.rpc("recorder_mark_audio_deleted", { p_recording: r.recording_id });
      if (mark.error || mark.data !== true) {
        result.skipped.push({ recording_id: r.recording_id, reason: mark.error ? "the database refused the mark" : "not in a deletable state" });
        continue;
      }
      result.deleted += 1;
      result.deleted_ids.push(r.recording_id);
    } catch (e) {
      result.skipped.push({ recording_id: r.recording_id, reason: String((e as Error)?.message ?? e).slice(0, 120) });
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json(500, { error: "not configured" });
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const isCron = await runnerTokenMatches(req, sb);
    let who = "cron";
    if (!isCron) {
      // An admin, by their own JWT. The service-role key alone is not accepted.
      const gate = await requireRole(req, sb, ["admin"], corsHeaders, { allowServiceRole: false });
      if (gate instanceof Response) return gate;
      who = `admin:${gate.userId}`;
    }

    const body = await req.json().catch(() => ({}));
    const recordingId = typeof body?.recording_id === "string" ? body.recording_id : null;
    if (recordingId !== null && !UUID.test(recordingId)) return json(400, { error: "recording_id must be a uuid" });

    const result = await runRetention(sb, { recordingId });
    console.log(JSON.stringify({ fn: "recorder-retention", by: who, expired_stale: result.expired_stale, due: result.due, deleted: result.deleted, deleted_ids: result.deleted_ids, objects_removed: result.objects_removed, remaining: result.remaining, skipped: result.skipped.map((s) => s.recording_id) }));
    return json(200, result);
  } catch (e) {
    console.error(JSON.stringify({ fn: "recorder-retention", error: String((e as Error)?.message ?? e).slice(0, 200) }));
    return json(500, { error: "retention failed; nothing was marked deleted that still had files" });
  }
});
