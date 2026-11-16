/**
 * ###########################################################################
 * #  TEMPORARY - audit-eval-proxy, the vendor evaluation proxy.             #
 * #  DELETE WITH THE TEARDOWN: scripts/lesson-eval/teardown_audit_eval.md   #
 * #  (kill switch off, empty + delete the bucket, teardown SQL, delete this #
 * #  function, delete local vendor output).                                 #
 * ###########################################################################
 *
 * WHAT IT DOES. One request = one piece of lesson audio, already in the
 * private `audit-eval` bucket under a code-only name, sent to ONE vendor in
 * ONE mode. It answers the admin with the vendor's result in the common
 * schema (scripts/lesson-eval/result_schema.json) plus the raw vendor JSON.
 * It stores nothing except one row in audit_eval_runs (ids, durations,
 * status codes, cost estimate - no transcript, no audio).
 *
 * RULES (owner D-10 and the build brief, docs/evidence/B-proxy-build.md):
 *   - An authenticated ADMIN only; the service role is refused. Checked
 *     before any other work.
 *   - Audio comes ONLY from the bucket, by an object path of codes
 *     (lessons/L1/p0007.flac, clips/S07/held_03.wav, synth/M02/p0001.wav).
 *     A request carrying anything else - audio, a URL, a prompt - is refused.
 *     The bucket is read AS THE CALLER, so the admin-only storage policy is
 *     the boundary; the service role reads no data here.
 *   - The audio minutes are reserved in SQL BEFORE the vendor is called
 *     (audit_eval_reserve: per-run calls, per-run minutes, global minutes,
 *     kill switch). Refused -> 429 (caps) or 503 (switched off).
 *   - Never more than one piece in memory; Gemini's upload is streamed. A
 *     deadline below the free-plan wall clock (150 s) aborts the vendor call
 *     and answers 504 with retryable: true.
 *   - Logs carry ids, durations and status codes only. Never transcript
 *     text, audio, headers, or a vendor's error body (which could echo a
 *     key). Errors returned to the caller are our own words plus a status.
 *
 * Secrets (names only; values are never read into a log or a response):
 *   azure_key + AZURE_SPEECH_REGION (as get-speech-token), OPENAI_API_KEY,
 *   GEMINI_API_KEY (+ optional GEMINI_MODEL, as analyze-video-submission).
 *   GOOGLE_CREDENTIALS is NOT used: Google Chirp 3 is a stub (501).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";
import {
  ALLOWED_FIELDS,
  ALLOWED_OPTIONS,
  GEMINI_BASE,
  MAX_PIECE_SECONDS,
  MODES,
  OBJECT_PATH_RE,
  OPENAI_URL,
  RUN_ID_RE,
  azureDefinition,
  azureUrl,
  geminiGenerateBody,
  mimeFor,
  minSecondsForBytes,
  modeKey,
  normaliseAzure,
  normaliseGemini,
  normaliseOpenai,
  openaiFields,
  type FileResult,
  type ModeSpec,
} from "./vendors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUCKET = "audit-eval";
const MAX_BODY_BYTES = 2048;
/** Below the free plan's 150 s wall clock, with room to answer. */
const DEADLINE_MS = () => Number(Deno.env.get("AUDIT_EVAL_TIMEOUT_MS")) || 120_000;

class Timeout extends Error {}
class Refused extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** One line per event: ids, durations, statuses. Nothing else, ever. */
function logEvent(fields: Record<string, string | number | boolean | null>) {
  console.log(JSON.stringify({ fn: "audit-eval-proxy", ...fields }));
}

/** fetch under the request's deadline; an abort becomes a Timeout. */
async function timed(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal });
  } catch (e) {
    if (signal.aborted) throw new Timeout("deadline");
    throw new Refused(502, "The vendor could not be reached");
  }
}

// ------------------------------------------------------------- vendors

interface VendorOut { status: number; raw: unknown; result: FileResult | null }

async function callAzure(spec: ModeSpec, piece: Blob, path: string, opts: Opts, signal: AbortSignal): Promise<VendorOut> {
  const key = Deno.env.get("azure_key")!;
  const region = Deno.env.get("AZURE_SPEECH_REGION") || "southeastasia";
  const form = new FormData();
  form.append("audio", new File([piece], `piece.${path.split(".").pop()}`, { type: mimeFor(path) }));
  form.append("definition", JSON.stringify(azureDefinition(spec.mode, opts.max_speakers ?? 6)));
  const res = await timed(azureUrl(region), {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key, Accept: "application/json" },
    body: form,
  }, signal);
  if (!res.ok) { await res.body?.cancel(); return { status: res.status, raw: null, result: null }; }
  const raw = await res.json();
  return { status: res.status, raw, result: normaliseAzure(raw) };
}

async function callOpenai(spec: ModeSpec, piece: Blob, path: string, opts: Opts, seconds: number, signal: AbortSignal): Promise<VendorOut> {
  const key = Deno.env.get("OPENAI_API_KEY")!;
  const form = new FormData();
  form.append("file", new File([piece], `piece.${path.split(".").pop()}`, { type: mimeFor(path) }));
  for (const [k, v] of openaiFields(spec.mode, opts.language ?? null)) form.append(k, v);
  const res = await timed(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  }, signal);
  if (!res.ok) { await res.body?.cancel(); return { status: res.status, raw: null, result: null }; }
  const raw = await res.json();
  return { status: res.status, raw, result: normaliseOpenai(spec.mode, raw, seconds) };
}

async function callGemini(piece: Response, path: string, bytes: number, seconds: number, signal: AbortSignal): Promise<VendorOut> {
  const key = Deno.env.get("GEMINI_API_KEY")!;
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
  const mime = mimeFor(path);
  // The key goes in a header, not the URL, so no URL in an error can carry it.
  const auth = { "x-goog-api-key": key };

  const start = await timed(`${GEMINI_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...auth,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "audit-eval-piece" } }),
  }, signal);
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) { await start.body?.cancel(); await piece.body?.cancel(); return { status: start.status || 502, raw: null, result: null }; }
  await start.body?.cancel();

  // Streamed from storage to Google: the piece is never held whole here.
  const up = await timed(uploadUrl, {
    method: "POST",
    headers: { ...auth, "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Length": String(bytes) },
    body: piece.body,
    // @ts-ignore - required by fetch for a streamed request body
    duplex: "half",
  }, signal);
  if (!up.ok) { await up.body?.cancel(); return { status: up.status, raw: null, result: null }; }
  let file = (await up.json())?.file;

  try {
    for (let i = 0; i < 30 && file?.state === "PROCESSING"; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (signal.aborted) throw new Timeout("deadline");
      const poll = await timed(`${GEMINI_BASE}/v1beta/${file.name}`, { headers: auth }, signal);
      file = poll.ok ? await poll.json() : file;
    }
    if (file?.state !== "ACTIVE") return { status: 502, raw: null, result: null };

    const gen = await timed(`${GEMINI_BASE}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(geminiGenerateBody(file.uri, mime)),
    }, signal);
    if (!gen.ok) { await gen.body?.cancel(); return { status: gen.status, raw: null, result: null }; }
    const raw = await gen.json();
    return { status: gen.status, raw, result: normaliseGemini(raw, seconds) };
  } finally {
    // The piece does not stay with Google longer than the call.
    if (file?.name) {
      await fetch(`${GEMINI_BASE}/v1beta/${file.name}`, { method: "DELETE", headers: auth })
        .then((r) => r.body?.cancel())
        .catch(() => null);
    }
  }
}

// ------------------------------------------------------------- request

interface Opts { max_speakers?: number; language?: "en" | "vi" }
interface Ask { run_id: string; spec: ModeSpec; object_path: string; audio_seconds: number; options: Opts }

function parseAsk(body: any): Ask | Response {
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Body must be a JSON object" }, 400);
  for (const k of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(k)) {
      return json({ error: `Field "${k.slice(0, 40)}" is not accepted. Audio is read only from the audit-eval bucket, by object_path.` }, 400);
    }
  }
  const { run_id, vendor, mode, object_path, audio_seconds } = body;
  if (typeof run_id !== "string" || !RUN_ID_RE.test(run_id)) return json({ error: "run_id must be a short code (letters, digits, - and _)" }, 400);
  if (typeof object_path !== "string" || !OBJECT_PATH_RE.test(object_path)) {
    return json({ error: "object_path must be a code-only name such as lessons/L1/p0007.flac, clips/S07/held_03.wav or synth/M02/p0001.wav" }, 400);
  }
  const spec = typeof vendor === "string" && typeof mode === "string" ? MODES[modeKey(vendor, mode)] : undefined;
  if (!spec) return json({ error: "Unknown vendor/mode", modes: Object.keys(MODES) }, 400);
  if (typeof audio_seconds !== "number" || !Number.isFinite(audio_seconds) || audio_seconds <= 0 || audio_seconds > MAX_PIECE_SECONDS) {
    return json({ error: `audio_seconds must be a number of seconds, at most ${MAX_PIECE_SECONDS}` }, 400);
  }
  const options: Opts = {};
  const o = body.options ?? {};
  if (typeof o !== "object" || Array.isArray(o)) return json({ error: "options must be an object" }, 400);
  for (const k of Object.keys(o)) if (!ALLOWED_OPTIONS.has(k)) return json({ error: `Option "${k.slice(0, 40)}" is not accepted` }, 400);
  if (o.max_speakers !== undefined) {
    if (!Number.isInteger(o.max_speakers) || o.max_speakers < 2 || o.max_speakers > 35) return json({ error: "max_speakers must be 2-35" }, 400);
    options.max_speakers = o.max_speakers;
  }
  if (o.language !== undefined) {
    if (o.language !== "en" && o.language !== "vi") return json({ error: "language must be en or vi" }, 400);
    options.language = o.language;
  }
  return { run_id, spec, object_path, audio_seconds, options };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Identity only: the service client verifies the token and reads roles.
  // It reads no data; the bucket and the runs table are read as the caller.
  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const gate = await requireRole(req, sb, ["admin"], corsHeaders, { allowServiceRole: false });
  if (gate instanceof Response) return gate;

  if (!(req.headers.get("Content-Type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Send a JSON body; audio is never accepted in the request" }, 415);
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "Body too large; audio is never accepted in the request" }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ error: "Body must be JSON" }, 400); }
  const ask = parseAsk(body);
  if (ask instanceof Response) return ask;
  const { spec, object_path, run_id } = ask;

  if (!spec.implemented) {
    return json({ error: `${spec.vendor}/${spec.mode} is not implemented`, note: spec.retention }, 501);
  }
  if (spec.secrets.some((s) => !Deno.env.get(s))) return json({ error: `${spec.vendor} is not configured on this project` }, 503);

  const asCaller = {
    apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    Authorization: req.headers.get("Authorization")!,
  };
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), DEADLINE_MS());
  let rowId: string | null = null;
  let outcome = "failed";
  let httpStatus: number | null = null;

  const finish = async (status: string, http: number | null, cost: number | null) => {
    if (!rowId) return;
    await fetch(`${url}/rest/v1/rpc/audit_eval_finish`, {
      method: "POST",
      headers: { ...asCaller, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: rowId, p_status: status, p_http_status: http, p_cost_estimate_usd: cost }),
    }).then((r) => r.body?.cancel()).catch(() => null);
  };

  try {
    // 1. The piece, as the caller: the admin-only storage policy decides.
    const obj = await timed(`${url}/storage/v1/object/authenticated/${BUCKET}/${object_path}`, { headers: asCaller }, ctl.signal);
    if (!obj.ok) {
      await obj.body?.cancel();
      throw new Refused(obj.status === 400 || obj.status === 404 ? 404 : 502, "The piece is not in the audit-eval bucket");
    }
    const bytes = Number(obj.headers.get("content-length") ?? 0);
    if (!bytes || bytes > 26_214_400) { await obj.body?.cancel(); throw new Refused(413, "The piece must be between 1 byte and 25 MB"); }
    // A claimed duration shorter than the bytes can hold would slip audio
    // past the minute caps.
    const seconds = Math.max(ask.audio_seconds, minSecondsForBytes(object_path, bytes));
    if (seconds > MAX_PIECE_SECONDS + 1) { await obj.body?.cancel(); throw new Refused(400, `The piece is longer than ${MAX_PIECE_SECONDS} s; cut it smaller`); }

    // 2. Reserve the minutes BEFORE the vendor hears anything.
    const rv = await fetch(`${url}/rest/v1/rpc/audit_eval_reserve`, {
      method: "POST",
      headers: { ...asCaller, "Content-Type": "application/json" },
      body: JSON.stringify({ p_run_id: run_id, p_vendor: spec.vendor, p_mode: spec.mode, p_object_path: object_path, p_audio_seconds: seconds }),
    });
    if (!rv.ok) {
      const err = await rv.json().catch(() => ({}));
      await obj.body?.cancel();
      if (rv.status === 429 || err?.code === "PT429") throw new Refused(429, "Cap reached: " + String(err?.message ?? "").slice(0, 120));
      if (rv.status === 503 || err?.code === "PT503") throw new Refused(503, "The vendor evaluation is switched off");
      if (rv.status === 401 || rv.status === 403 || err?.code === "42501") throw new Refused(403, "Not permitted");
      throw new Refused(502, "Could not reserve the call");
    }
    rowId = String(await rv.json());

    // 3. The vendor.
    let out: VendorOut;
    if (spec.vendor === "gemini") {
      out = await callGemini(obj, object_path, bytes, seconds, ctl.signal);
    } else {
      const piece = await obj.blob(); // one piece, never more
      out = spec.vendor === "azure"
        ? await callAzure(spec, piece, object_path, ask.options, ctl.signal)
        : await callOpenai(spec, piece, object_path, ask.options, seconds, ctl.signal);
    }
    httpStatus = out.status;
    const cost = Math.round((seconds / 60) * spec.usdPerMinute * 1e6) / 1e6;

    if (!out.result) {
      outcome = "vendor_error";
      await finish(outcome, httpStatus, cost);
      return json({
        error: `${spec.vendor} answered ${httpStatus}`,
        vendor_status: httpStatus,
        retryable: httpStatus === 429 || httpStatus >= 500,
        call_id: rowId,
      }, 502);
    }

    outcome = "ok";
    await finish(outcome, httpStatus, cost);
    return json({
      schema: "hec-lesson-eval/1",
      call_id: rowId,
      run_id,
      object_path,
      system: {
        name: `${spec.vendor}-${spec.mode}`,
        kind: "vendor",
        model: spec.vendor === "gemini" ? (Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash") : spec.model,
        settings: {
          vendor: spec.vendor,
          mode: spec.mode,
          options: ask.options,
          word_timing: out.result.word_timing,
          retention: spec.retention,
          price_usd_per_min: spec.usdPerMinute,
          price_source: spec.priceSource,
        },
      },
      audio_seconds: seconds,
      cost_estimate_usd: cost,
      file: out.result,
      raw: out.raw,
    });
  } catch (e) {
    if (e instanceof Timeout || ctl.signal.aborted) {
      outcome = "timeout";
      await finish(outcome, null, null);
      return json({ error: "The vendor did not answer in time", retryable: true, call_id: rowId }, 504);
    }
    if (e instanceof Refused) {
      outcome = rowId ? "failed" : "refused";
      await finish("failed", e.status, null);
      return json({ error: e.message, retryable: e.status === 502, call_id: rowId }, e.status);
    }
    outcome = "failed";
    await finish("failed", null, null);
    // Only the error's class: a message could quote a vendor's answer.
    logEvent({ event: "error", call: rowId, kind: (e as Error)?.name ?? "unknown" });
    return json({ error: "The call failed", retryable: true, call_id: rowId }, 500);
  } finally {
    clearTimeout(timer);
    logEvent({ event: "done", call: rowId, vendor: spec.vendor, mode: spec.mode, outcome, http: httpStatus, ms: Date.now() - t0 });
  }
});
