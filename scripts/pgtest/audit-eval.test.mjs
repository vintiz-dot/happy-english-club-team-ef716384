// TEMPORARY vendor evaluation proxy (audit-eval-proxy) - delete with the
// teardown (scripts/lesson-eval/teardown_audit_eval.md).
//
// Part 1 drives the REAL migration (20261112110000_audit_eval_bucket.sql)
// and the REAL teardown SQL in pglite: the bucket is private and admin-only,
// the runs table holds no transcript and is admin-read-only, the caps and
// the kill switch hold whoever inserts, and the teardown leaves nothing.
//
// Part 2 runs the edge function itself, bundled with esbuild, remote
// imports stubbed, Deno.serve captured and `fetch` scripted so that NO real
// vendor is called. It asserts who is refused before any fetch, that audio
// is read only from the bucket by a code-only path, what each vendor request
// carries, that caps answer 429, the timeout path, and that nothing passed
// to the console carries a secret or a word of transcript.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { build } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGS = process.argv.slice(2);
const TEARDOWN = resolve(repo, "scripts/lesson-eval/teardown_audit_eval.sql");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ════════════════════════════════════════════════════════════════ Part 1: SQL
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
  -- Supabase's default privileges, which 20260712023825 revoked on public:
  -- granted here so the migration's own REVOKEs are what is tested.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
`;
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(sql());
ok("the migration applies", true);
await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 7`);
{
  let again = null;
  try { await db.exec(sql()); } catch (e) { again = e.message; }
  ok("and applies a second time", again === null, again ?? "");
}
eq("a second paste keeps the settings the owner changed",
  (await db.query(`SELECT per_run_max_calls FROM public.audit_eval_settings`)).rows[0].per_run_max_calls, 7);
await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 400`);
eq("defaults: enabled, 400 calls, 600 run minutes, 2000 global minutes",
  (await db.query(`SELECT enabled, per_run_max_calls, per_run_max_minutes::int r, global_max_minutes::int g FROM public.audit_eval_settings`)).rows,
  [{ enabled: true, per_run_max_calls: 400, r: 600, g: 2000 }]);

const one = async (q, p) => (await db.query(q, p)).rows[0];
const ADMIN = "11111111-1111-1111-1111-111111111111";
const TEACHER = "22222222-2222-2222-2222-222222222222";
const FAMILY = "33333333-3333-3333-3333-333333333333";
const STUDENT = "44444444-4444-4444-4444-444444444444";

async function as(uid, role, fn, dbRole = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec(`SET LOCAL ROLE ${dbRole}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, role, fn, dbRole) => { try { await as(uid, role, fn, dbRole); return null; } catch (e) { return e; } };
const reserve = (run, seconds, path = "lessons/L1/p0001.flac", uid = ADMIN, role = "admin") =>
  as(uid, role, async () => (await db.query(
    `SELECT public.audit_eval_reserve($1, 'azure', 'fast-multilingual', $2, $3) AS id`, [run, path, seconds])).rows[0].id);
const tryReserve = async (...a) => { try { await reserve(...a); return null; } catch (e) { return e; } };

console.log("=== the bucket ===");
eq("the bucket is private, 25 MB per piece",
  await one(`SELECT public, file_size_limit FROM storage.buckets WHERE id='audit-eval'`), { public: false, file_size_limit: 26214400 });
eq("an admin uploads a code-only piece", await tryAs(ADMIN, "admin", () => db.query(
  `INSERT INTO storage.objects (bucket_id, name) VALUES ('audit-eval','lessons/L1/p0007.flac')`)), null);
for (const bad of ["lessons/Minh/p0001.flac", "lessons/L1/../p0001.flac", "../lessons/L1/p0001.flac",
  "lessons/L1/Nguyen_An.flac", "clips/S07/held 03.wav", "other/L1/p0001.flac", "lessons/L1/p0001.exe"]) {
  ok(`an admin cannot upload "${bad}"`, (await tryAs(ADMIN, "admin", () => db.query(
    `INSERT INTO storage.objects (bucket_id, name) VALUES ('audit-eval', $1)`, [bad]))) !== null);
}
for (const [who, uid, role, dbRole] of [
  ["a teacher", TEACHER, "teacher", "authenticated"], ["a parent", FAMILY, "family", "authenticated"],
  ["a student", STUDENT, "student", "authenticated"], ["anon", null, null, "anon"]]) {
  eq(`${who} reads no piece`, (await as(uid, role, () => db.query(
    `SELECT 1 FROM storage.objects WHERE bucket_id='audit-eval'`), dbRole)).rows.length, 0);
  ok(`${who} cannot upload a piece`, (await tryAs(uid, role, () => db.query(
    `INSERT INTO storage.objects (bucket_id, name) VALUES ('audit-eval','lessons/L1/p0009.flac')`), dbRole)) !== null);
  await as(uid, role, () => db.query(`DELETE FROM storage.objects WHERE bucket_id='audit-eval'`), dbRole);
  eq(`${who} cannot delete a piece`, (await one(`SELECT count(*)::int n FROM storage.objects WHERE bucket_id='audit-eval'`)).n, 1);
  eq(`${who} cannot read the runs table or settings`, await tryAs(uid, role, async () => {
    const a = (await db.query(`SELECT 1 FROM public.audit_eval_runs`)).rows.length;
    const b = (await db.query(`SELECT 1 FROM public.audit_eval_settings`)).rows.length;
    if (a + b) throw new Error("rows visible");
  }, dbRole) === null ? "nothing visible" : "refused", dbRole === "anon" ? "refused" : "nothing visible");
  ok(`${who} cannot reserve a call`, (await tryReserve("R1", 60, "lessons/L1/p0001.flac", uid ?? TEACHER, role ?? "")) !== null);
}
eq("an admin reads the piece", (await as(ADMIN, "admin", () => db.query(`SELECT 1 FROM storage.objects WHERE bucket_id='audit-eval'`))).rows.length, 1);

console.log("=== grants and the runs table ===");
const priv = async (role, table, p) => (await one(`SELECT has_table_privilege($1, $2, $3) AS v`, [role, table, p])).v;
for (const t of ["public.audit_eval_runs", "public.audit_eval_settings"]) {
  eq(`${t}: authenticated may SELECT (PostgREST sees the table)`, await priv("authenticated", t, "SELECT"), true);
  for (const p of ["INSERT", "UPDATE", "DELETE"]) eq(`${t}: authenticated may not ${p}`, await priv("authenticated", t, p), false);
  eq(`${t}: anon has nothing`, await priv("anon", t, "SELECT"), false);
  eq(`${t}: service_role has all`, await priv("service_role", t, "INSERT") && await priv("service_role", t, "DELETE"), true);
}
eq("the runs table has no column that could hold a transcript or audio",
  (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_eval_runs' ORDER BY ordinal_position`)).rows.map((r) => r.column_name),
  ["id", "run_id", "vendor", "mode", "object_path", "audio_seconds", "reserved_minutes", "status", "http_status",
    "cost_estimate_usd", "started_at", "finished_at", "created_by"]);
ok("an admin cannot insert a row directly", (await tryAs(ADMIN, "admin", () => db.query(
  `INSERT INTO public.audit_eval_runs (run_id, vendor, mode, object_path, audio_seconds) VALUES ('R9','azure','m','lessons/L1/p0001.flac', 1)`))) !== null);
ok("a reservation refuses a path with a name in it", (await tryReserve("R1", 60, "lessons/Minh/p0001.flac")) !== null);

console.log("=== caps ===");
const first = await reserve("R1", 60);
ok("an admin reserves a call", typeof first === "string");
eq("the row is reserved and counts its minutes", await one(`SELECT status, reserved_minutes::float m, created_by FROM public.audit_eval_runs WHERE id=$1`, [first]),
  { status: "reserved", m: 1, created_by: ADMIN });
eq("an admin reads the runs", (await as(ADMIN, "admin", () => db.query(`SELECT 1 FROM public.audit_eval_runs`))).rows.length, 1);

await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 3`);
await reserve("R1", 60); await reserve("R1", 60);
{
  const e = await tryReserve("R1", 60);
  eq("the call after the per-run cap is refused with PT429 (HTTP 429)", e?.code, "PT429");
  ok("another run is not held by R1's call cap", (await tryReserve("R2", 60)) === null);
}
await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 400, per_run_max_minutes = 10`);
ok("6 minutes in run R3 is accepted", (await tryReserve("R3", 360)) === null);
eq("5 more minutes would pass R3's 10: refused", (await tryReserve("R3", 300))?.code, "PT429");
ok("4 more minutes fits", (await tryReserve("R3", 240)) === null);
await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_minutes = 600, global_max_minutes = 20`);
// used so far: R1 3 + R2 1 + R3 10 = 14 minutes
eq("the global ceiling holds across runs", (await tryReserve("R4", 420))?.code, "PT429");
ok("and lets a call under it through", (await tryReserve("R4", 300)) === null);
{
  // service_role bypasses RLS and has INSERT: the trigger still holds.
  let e = null;
  try {
    await as(null, null, () => db.query(
      `INSERT INTO public.audit_eval_runs (run_id, vendor, mode, object_path, audio_seconds, status, reserved_minutes)
       VALUES ('R5','openai','whisper-1','clips/S07/held_03.wav', 120, 'ok', 0)`), "service_role");
  } catch (x) { e = x; }
  eq("a direct service-role insert is held by the same caps", e?.code, "PT429");
  await db.exec(`UPDATE public.audit_eval_settings SET global_max_minutes = 2000`);
  await as(null, null, () => db.query(
    `INSERT INTO public.audit_eval_runs (run_id, vendor, mode, object_path, audio_seconds, status, reserved_minutes)
     VALUES ('R5','openai','whisper-1','clips/S07/held_03.wav', 120, 'ok', 0)`), "service_role");
  eq("and whatever it sends, the row starts reserved with its true minutes",
    await one(`SELECT status, reserved_minutes::float m FROM public.audit_eval_runs WHERE run_id='R5'`), { status: "reserved", m: 2 });
}
{
  await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 5`);
  // Ten reservations at once for one run. pglite runs them one after another,
  // so the lock is ALSO asserted directly below.
  const attempts = await Promise.all(Array.from({ length: 10 }, () => db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', 'admin', true)`, [ADMIN]);
    await tx.exec("SET LOCAL ROLE authenticated");
    try { await tx.query(`SELECT public.audit_eval_reserve('R6','gemini','transcribe-speakers','synth/M02/p0001.wav', 30)`); return true; }
    catch { return false; }
  }).catch(() => false)));
  eq("ten reservations at once: exactly the cap of five succeed", attempts.filter(Boolean).length, 5);
  eq("and five rows stand", (await one(`SELECT count(*)::int n FROM public.audit_eval_runs WHERE run_id='R6'`)).n, 5);
  const locks = await db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', 'admin', true)`, [ADMIN]);
    await tx.query(`SELECT public.audit_eval_reserve('R7','azure','fast-en-vi','lessons/L2/p0001.flac', 30)`);
    const n = (await tx.query(`SELECT count(*)::int n FROM pg_locks WHERE locktype='advisory' AND pid = pg_backend_pid()`)).rows[0].n;
    return n;
  });
  ok("a reservation holds the advisory lock until it commits, so reservations serialise", locks >= 1, `advisory locks held: ${locks}`);
  await db.exec(`UPDATE public.audit_eval_settings SET per_run_max_calls = 400`);
}

console.log("=== finishing a call ===");
const fin = (id, status, http = 200, cost = 0.01, uid = ADMIN, role = "admin") =>
  as(uid, role, () => db.query(`SELECT public.audit_eval_finish($1, $2, $3, $4)`, [id, status, http, cost]));
await fin(first, "ok");
eq("an admin records the outcome", await one(`SELECT status, http_status, finished_at IS NOT NULL f FROM public.audit_eval_runs WHERE id=$1`, [first]),
  { status: "ok", http_status: 200, f: true });
await fin(first, "timeout", 504);
eq("a finished call is not finished again", (await one(`SELECT status FROM public.audit_eval_runs WHERE id=$1`, [first])).status, "ok");
ok("a teacher cannot record an outcome", (await tryAs(TEACHER, "teacher", () => db.query(
  `SELECT public.audit_eval_finish($1, 'ok', 200, 0)`, [first]))) !== null);
{
  const id = await reserve("R8", 60);
  let e = null;
  try { await db.query(`UPDATE public.audit_eval_runs SET reserved_minutes = 0 WHERE id=$1`, [id]); } catch (x) { e = x; }
  ok("a reservation's minutes cannot be rewritten, even by the owner", e !== null);
}
eq("minutes of a failed call stay counted", (await one(
  `SELECT sum(reserved_minutes)::float m FROM public.audit_eval_runs WHERE run_id='R1'`)).m, 3);

console.log("=== kill switch ===");
await db.exec(`UPDATE public.audit_eval_settings SET enabled = false`);
eq("switched off, a reservation is refused with PT503", (await tryReserve("R9", 60))?.code, "PT503");
await db.exec(`UPDATE public.audit_eval_settings SET enabled = true`);
ok("switched back on, it is accepted", (await tryReserve("R9", 60)) === null);

console.log("=== teardown ===");
await db.exec(readFileSync(TEARDOWN, "utf8"));
eq("tables are gone", await one(`SELECT to_regclass('public.audit_eval_runs') r, to_regclass('public.audit_eval_settings') s`), { r: null, s: null });
eq("a bucket that still holds a piece is left for the Storage API",
  (await one(`SELECT count(*)::int n FROM storage.buckets WHERE id='audit-eval'`)).n, 1);
await db.exec(`DELETE FROM storage.objects WHERE bucket_id='audit-eval'`);
{
  let e = null;
  try { await db.exec(readFileSync(TEARDOWN, "utf8")); await db.exec(readFileSync(TEARDOWN, "utf8")); } catch (x) { e = x.message; }
  ok("the teardown pastes again, twice, without error", e === null, e ?? "");
}
eq("then nothing is left: no bucket, no function, no policy, no table",
  await one(`SELECT
     (SELECT count(*)::int FROM storage.buckets WHERE id='audit-eval') b,
     (SELECT count(*)::int FROM pg_proc WHERE proname LIKE 'audit_eval%') f,
     (SELECT count(*)::int FROM pg_policies WHERE policyname LIKE 'audit_eval%') p,
     (SELECT count(*)::int FROM pg_class WHERE relname LIKE 'audit_eval%') t`),
  { b: 0, f: 0, p: 0, t: 0 });
{
  const fresh = new PGlite();
  await fresh.exec(PRELUDE);
  let e = null;
  try { await fresh.exec(readFileSync(TEARDOWN, "utf8")); } catch (x) { e = x.message; }
  ok("the teardown runs on a database that never had the migration", e === null, e ?? "");
}

// ═══════════════════════════════════════════════════ Part 2: the function
console.log("=== the function: setup ===");
const SECRETS = {
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-SECRET-1",
  azure_key: "azure-key-SECRET-2",
  OPENAI_API_KEY: "sk-openai-SECRET-3",
  GEMINI_API_KEY: "gemini-key-SECRET-4",
  GOOGLE_CREDENTIALS: '{"type":"service_account","private_key":"SECRET-5"}',
};
const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  AZURE_SPEECH_REGION: "southeastasia",
  ...SECRETS,
};
const TOKENS = { "admin-token": ["admin"], "teacher-token": ["teacher"], "parent-token": ["family"], "admin-teacher": ["admin", "teacher"] };
const TRANSCRIPT_WORD = "Zebrafinchly";

globalThis.__fakeCreateClient = () => ({
  auth: {
    getUser: async (token) => TOKENS[token]
      ? { data: { user: { id: `user-${token}`, email: null } }, error: null }
      : { data: { user: null }, error: { message: "bad jwt" } },
  },
  from: (table) => ({
    select: () => ({
      eq: async (_c, uid) => ({ data: table === "user_roles"
        ? (TOKENS[uid.replace(/^user-/, "")] ?? []).map((role) => ({ role })) : [] }),
    }),
  }),
});
let handler = null;
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => env[k] } };

const bundled = await build({
  entryPoints: [resolve(repo, "supabase/functions/audit-eval-proxy/index.ts")],
  bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
  plugins: [{
    name: "remote-imports",
    setup(b) {
      b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: "remote" }));
      b.onLoad({ filter: /.*/, namespace: "remote" }, () => ({
        contents: "export const createClient = (...args) => globalThis.__fakeCreateClient(...args);", loader: "js",
      }));
    },
  }],
});
const bundlePath = resolve(tmpdir(), `auditEvalProxy.${process.pid}.mjs`);
writeFileSync(bundlePath, bundled.outputFiles[0].text);

// Everything the function writes to the console, for the leak check.
const consoleSeen = [];
for (const k of ["log", "error", "warn", "info", "debug"]) {
  const orig = console[k].bind(console);
  console[k] = (...a) => {
    const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
    if (!/^\s+(PASS|FAIL)\s|^===|^\n?\d+ passed/.test(s)) consoleSeen.push(s);
    orig(...a);
  };
}

await import(pathToFileURL(bundlePath).href);
ok("the function registered its handler", typeof handler === "function");

// ---- the scripted network
const OBJECTS = {
  "lessons/L1/p0007.flac": new Uint8Array(320000),          // ~10 s
  "clips/S07/held_03.wav": new Uint8Array(44 + 32000 * 30),  // exactly 30 s
  "synth/M02/p0001.wav": new Uint8Array(44 + 32000 * 20),
};
let calls = [];
let reserveAnswer = () => new Response(JSON.stringify("call-0001"), { status: 200 });
let vendorDelay = null;
const azureAnswer = { durationMilliseconds: 10000, combinedPhrases: [{ text: TRANSCRIPT_WORD }], phrases: [
  { speaker: 1, offsetMilliseconds: 500, durationMilliseconds: 1500, text: `${TRANSCRIPT_WORD} cat`, locale: "en-US", confidence: 0.91,
    words: [{ text: TRANSCRIPT_WORD, offsetMilliseconds: 500, durationMilliseconds: 700 }, { text: "cat", offsetMilliseconds: 1200, durationMilliseconds: 800 }] },
  { speaker: 2, offsetMilliseconds: 3000, durationMilliseconds: 1000, text: "xin chao", locale: "vi-VN", confidence: 0.8,
    words: [{ text: "xin", offsetMilliseconds: 3000, durationMilliseconds: 400 }, { text: "chao", offsetMilliseconds: 3400, durationMilliseconds: 600 }] },
] };
const openaiAnswers = {
  "gpt-transcribe": { text: `${TRANSCRIPT_WORD} likes dogs`, languages: [{ code: "en" }] },
  "gpt-4o-transcribe": { text: `${TRANSCRIPT_WORD} likes dogs` },
  "gpt-4o-transcribe-diarize": { duration: 30, segments: [{ speaker: "A", start: 0.5, end: 2.5, text: `${TRANSCRIPT_WORD} likes` }, { speaker: "B", start: 3, end: 4, text: "yes" }] },
  "whisper-1": { duration: 30, language: "english", words: [{ word: TRANSCRIPT_WORD, start: 0.4, end: 0.9 }, { word: "likes", start: 1.0, end: 1.3 }] },
};

const waitOr = (signal) => new Promise((res, rej) => {
  if (!vendorDelay) return res();
  const t = setTimeout(res, vendorDelay);
  signal?.addEventListener("abort", () => { clearTimeout(t); const e = new Error("aborted"); e.name = "AbortError"; rej(e); });
});
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = Object.fromEntries(new Headers(init.headers ?? {}).entries());
  const entry = { url, method: init.method ?? "GET", headers, body: init.body };
  calls.push(entry);
  if (url.startsWith(`${env.SUPABASE_URL}/storage/v1/object/authenticated/audit-eval/`)) {
    const path = url.slice(`${env.SUPABASE_URL}/storage/v1/object/authenticated/audit-eval/`.length);
    const bytes = OBJECTS[path];
    if (headers.authorization !== "Bearer admin-token" && headers.authorization !== "Bearer admin-teacher") return new Response("{}", { status: 400 });
    if (!bytes) return new Response(JSON.stringify({ error: "not_found" }), { status: 400 });
    return new Response(bytes, { status: 200, headers: { "content-length": String(bytes.length), "content-type": "audio/flac" } });
  }
  if (url === `${env.SUPABASE_URL}/rest/v1/rpc/audit_eval_reserve`) { entry.json = JSON.parse(init.body); return reserveAnswer(); }
  if (url === `${env.SUPABASE_URL}/rest/v1/rpc/audit_eval_finish`) { entry.json = JSON.parse(init.body); return new Response(null, { status: 204 }); }
  if (url.startsWith("https://southeastasia.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe")) {
    await waitOr(init.signal);
    return new Response(JSON.stringify(azureAnswer), { status: 200 });
  }
  if (url === "https://api.openai.com/v1/audio/transcriptions") {
    await waitOr(init.signal);
    const model = init.body.get("model");
    return new Response(JSON.stringify(openaiAnswers[model]), { status: 200 });
  }
  if (url === "https://generativelanguage.googleapis.com/upload/v1beta/files") {
    return new Response("{}", { status: 200, headers: { "x-goog-upload-url": "https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=u1" } });
  }
  if (url === "https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=u1") {
    return new Response(JSON.stringify({ file: { name: "files/abc123", state: "ACTIVE", uri: "https://generativelanguage.googleapis.com/v1beta/files/abc123" } }), { status: 200 });
  }
  if (url.startsWith("https://generativelanguage.googleapis.com/v1beta/models/")) {
    await waitOr(init.signal);
    const segs = { segments: [{ speaker: "spk0", start: 0.5, end: 3, language: "en", text: `${TRANSCRIPT_WORD} reads` }, { speaker: "spk1", start: 4, end: 6, language: "vi", text: "da vang" }] };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(segs) }] } }] }), { status: 200 });
  }
  if (url === "https://generativelanguage.googleapis.com/v1beta/files/abc123" && init.method === "DELETE") return new Response(null, { status: 200 });
  throw new Error(`unexpected fetch: ${url}`);
};

async function post(token, body, { contentType = "application/json", raw } = {}) {
  calls = [];
  const res = await handler(new Request("http://localhost/functions/v1/audit-eval-proxy", {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": contentType },
    body: raw ?? JSON.stringify(body),
  }));
  let out = null;
  try { out = await res.json(); } catch { out = null; }
  return { status: res.status, out, calls: [...calls] };
}
const ask = (vendor, mode, extra = {}) => ({ run_id: "T1", vendor, mode, object_path: "clips/S07/held_03.wav", audio_seconds: 30, ...extra });
const vendorCalls = (cs) => cs.filter((c) => !c.url.startsWith(env.SUPABASE_URL));

console.log("=== the function: who may call ===");
for (const [who, token, want] of [["no token", null, 401], ["a bad token", "nope", 401], ["a teacher", "teacher-token", 403],
  ["a parent", "parent-token", 403], ["the service role", SECRETS.SUPABASE_SERVICE_ROLE_KEY, 403]]) {
  const r = await post(token, ask("azure", "fast-multilingual"));
  eq(`${who} is refused (${want})`, r.status, want);
  eq(`${who}: nothing was fetched`, r.calls.length, 0);
}
{
  const r = await post("admin-teacher", ask("azure", "fast-multilingual"));
  eq("an admin who is also a teacher is let through", r.status, 200);
}

console.log("=== the function: audio only from the bucket ===");
for (const [what, body] of [
  ["audio bytes in the body", { ...ask("azure", "fast-multilingual"), audio: "UklGRiQAAABXQVZF" }],
  ["an audio URL", { ...ask("openai", "whisper-1"), audio_url: "https://evil.example/a.wav" }],
  ["a prompt", { ...ask("openai", "whisper-1"), prompt: "The child is called Minh" }],
  ["an unknown option", { ...ask("openai", "whisper-1"), options: { prompt: "Minh" } }],
]) {
  const r = await post("admin-token", body);
  eq(`${what} is refused`, r.status, 400);
  eq(`${what}: nothing was fetched`, r.calls.length, 0);
}
for (const p of ["lessons/Minh/p0001.flac", "lessons/L1/../../secrets.flac", "https://evil.example/a.flac", "/lessons/L1/p0001.flac",
  "lessons/L1/p0001.flac?x=1", "clips/S07/Held_03.wav"]) {
  const r = await post("admin-token", ask("azure", "fast-multilingual", { object_path: p }));
  eq(`object_path "${p}" is refused before any fetch`, [r.status, r.calls.length], [400, 0]);
}
{
  const r = await post("admin-token", null, { contentType: "audio/wav", raw: "RIFF....WAVE" });
  eq("a non-JSON body (raw audio) is refused", [r.status, r.calls.length], [415, 0]);
  const big = await post("admin-token", null, { raw: JSON.stringify({ ...ask("azure", "fast-multilingual"), pad: "x".repeat(5000) }) });
  eq("an oversized body is refused", [big.status, big.calls.length], [413, 0]);
  const missing = await post("admin-token", ask("azure", "fast-multilingual", { object_path: "lessons/L9/p0001.flac" }));
  eq("a piece not in the bucket is 404, nothing reserved, no vendor", [missing.status, missing.calls.map((c) => c.url.split("/").pop())],
    [404, ["p0001.flac"]]);
  const g = await post("admin-token", ask("google", "chirp3"));
  eq("google chirp3 is a clearly marked stub (501), nothing fetched", [g.status, g.calls.length, /not implemented/.test(g.out?.error)], [501, 0, true]);
  const unknown = await post("admin-token", ask("azure", "batch"));
  eq("an unknown mode is refused", unknown.status, 400);
}
{
  const r = await post("admin-token", ask("azure", "fast-multilingual", { audio_seconds: 5 }));
  const rv = r.calls.find((c) => c.url.endsWith("audit_eval_reserve"));
  eq("a claimed duration shorter than the bytes is raised to what the bytes hold (30 s)", rv?.json?.p_audio_seconds, 30);
  ok("the bucket is read as the caller, not the service role",
    r.calls[0].headers.authorization === "Bearer admin-token" && r.calls[0].headers.apikey === "anon-key");
  ok("the reservation is made as the caller", rv?.headers.authorization === "Bearer admin-token");
  const order = r.calls.map((c) => c.url.includes("audit_eval_reserve") ? "reserve" : c.url.includes("cognitive") ? "vendor" : c.url.includes("finish") ? "finish" : "storage");
  eq("order: read piece, reserve, vendor, finish", order, ["storage", "reserve", "vendor", "finish"]);
}

console.log("=== the function: caps ===");
{
  reserveAnswer = () => new Response(JSON.stringify({ code: "PT429", message: "Run T1 has used its 400 calls" }), { status: 429 });
  const r = await post("admin-token", ask("openai", "whisper-1"));
  eq("a cap refusal answers 429", r.status, 429);
  eq("and no vendor was called", vendorCalls(r.calls).length, 0);
  reserveAnswer = () => new Response(JSON.stringify({ code: "PT503", message: "off" }), { status: 400 });
  const off = await post("admin-token", ask("openai", "whisper-1"));
  eq("the kill switch answers 503, no vendor", [off.status, vendorCalls(off.calls).length], [503, 0]);
  reserveAnswer = () => new Response(JSON.stringify("call-0001"), { status: 200 });
}

console.log("=== the function: what each vendor is sent ===");
{
  const r = await post("admin-token", ask("azure", "fast-multilingual"));
  const v = vendorCalls(r.calls)[0];
  ok("azure: fast transcription endpoint, region from AZURE_SPEECH_REGION, api-version 2025-10-15",
    v.url === "https://southeastasia.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15", v.url);
  eq("azure: key in Ocp-Apim-Subscription-Key from azure_key", v.headers["ocp-apim-subscription-key"], SECRETS.azure_key);
  const def = JSON.parse(v.body.get("definition"));
  eq("azure multilingual: diarization on, locales omitted, profanity unmasked", def, { diarization: { enabled: true, maxSpeakers: 6 }, profanityFilterMode: "None" });
  ok("azure: the audio part is the piece from the bucket", v.body.get("audio")?.size === OBJECTS["clips/S07/held_03.wav"].length);
  eq("azure: words with timings, speakers and phrase confidence", r.out.file.words.slice(0, 2),
    [{ w: TRANSCRIPT_WORD, start: 0.5, end: 1.2, conf: 0.91, speaker: "spk1", lang: "en" }, { w: "cat", start: 1.2, end: 2, conf: 0.91, speaker: "spk1", lang: "en" }]);
  eq("azure: turns per phrase", r.out.file.turns, [{ start: 0.5, end: 2, speaker: "spk1" }, { start: 3, end: 4, speaker: "spk2" }]);
  ok("azure: the raw vendor JSON comes back to the admin", r.out.raw?.phrases?.length === 2);
  ok("azure: retention note in the result metadata", /does not retain or store/.test(r.out.system.settings.retention));
  const fin = r.calls.find((c) => c.url.endsWith("audit_eval_finish"));
  eq("azure: the call is finished as ok with its cost", [fin.json.p_status, fin.json.p_http_status, fin.json.p_cost_estimate_usd > 0], ["ok", 200, true]);
  ok("nothing that is sent to the database carries a transcript",
    !r.calls.filter((c) => c.url.startsWith(env.SUPABASE_URL)).some((c) => String(c.body ?? "").includes(TRANSCRIPT_WORD)));

  const ev = await post("admin-token", ask("azure", "fast-en-vi", { options: { max_speakers: 8 } }));
  eq("azure en-vi: locales en-US + vi-VN, maxSpeakers from options",
    JSON.parse(vendorCalls(ev.calls)[0].body.get("definition")), { diarization: { enabled: true, maxSpeakers: 8 }, profanityFilterMode: "None", locales: ["en-US", "vi-VN"] });
  eq("azure en-vi: Vietnamese words tagged vi", ev.out.file.words.at(-1).lang, "vi");
}
for (const mode of ["gpt-transcribe", "gpt-4o-transcribe", "gpt-4o-transcribe-diarize", "whisper-1"]) {
  const r = await post("admin-token", ask("openai", mode));
  const v = vendorCalls(r.calls)[0];
  const f = v?.body;
  ok(`openai ${mode}: /v1/audio/transcriptions only`, v?.url === "https://api.openai.com/v1/audio/transcriptions" && vendorCalls(r.calls).length === 1);
  eq(`openai ${mode}: Bearer from OPENAI_API_KEY`, v.headers.authorization, `Bearer ${SECRETS.OPENAI_API_KEY}`);
  eq(`openai ${mode}: model id`, f.get("model"), mode);
  ok(`openai ${mode}: no store / metadata persistence field`, !f.has("store") && !f.has("metadata") && !f.has("purpose"));
  const prompt = f.get("prompt");
  ok(`openai ${mode}: prompt is the fixed generic one or absent (no names)`,
    prompt === null || (/English lesson/.test(prompt) && !/Minh|Nguyen|S07|held/.test(prompt)));
  if (mode === "gpt-transcribe") eq("gpt-transcribe: languages[] en + vi, no singular language", [f.getAll("languages[]"), f.has("language")], [["en", "vi"], false]);
  if (mode === "gpt-4o-transcribe-diarize") {
    eq("diarize: diarized_json, chunking auto, no prompt", [f.get("response_format"), f.get("chunking_strategy"), prompt], ["diarized_json", "auto", null]);
    eq("diarize: turns from segments", r.out.file.turns, [{ start: 0.5, end: 2.5, speaker: "spk_A" }, { start: 3, end: 4, speaker: "spk_B" }]);
    eq("diarize: word timing marked interpolated", r.out.system.settings.word_timing, "interpolated-from-segments");
  }
  if (mode === "whisper-1") {
    eq("whisper-1: verbose_json, word + segment timestamps", [f.get("response_format"), f.getAll("timestamp_granularities[]")], ["verbose_json", ["word", "segment"]]);
    eq("whisper-1: vendor word timings", r.out.file.words[0], { w: TRANSCRIPT_WORD, start: 0.4, end: 0.9, conf: null, speaker: null, lang: "en" });
  }
  if (mode === "gpt-transcribe" || mode === "gpt-4o-transcribe") {
    eq(`${mode}: text only, words spread over the piece and marked so`, [r.out.file.words.length, r.out.system.settings.word_timing], [3, "interpolated-over-piece"]);
  }
  ok(`openai ${mode}: retention note says 30 days unless ZDR`, /30 days/.test(r.out.system.settings.retention));
}
{
  const r = await post("admin-token", ask("gemini", "transcribe-speakers", { object_path: "synth/M02/p0001.wav", audio_seconds: 20 }));
  const vs = vendorCalls(r.calls);
  eq("gemini: start upload, streamed upload, generate, delete", vs.map((c) => `${c.method} ${c.url.replace("https://generativelanguage.googleapis.com", "")}`),
    ["POST /upload/v1beta/files", "POST /upload/v1beta/files?upload_id=u1", "POST /v1beta/models/gemini-3.8-flash:generateContent", "DELETE /v1beta/files/abc123"]);
  ok("gemini: the key travels in x-goog-api-key, never in a URL",
    vs.every((c) => c.headers["x-goog-api-key"] === SECRETS.GEMINI_API_KEY && !c.url.includes(SECRETS.GEMINI_API_KEY)));
  ok("gemini: the piece is streamed, not buffered", vs[1].body instanceof ReadableStream);
  const gen = JSON.parse(vs[2].body);
  ok("gemini: JSON response schema with speaker labels, temperature 0",
    gen.generationConfig.responseMimeType === "application/json" && gen.generationConfig.responseSchema.properties.segments && gen.generationConfig.temperature === 0);
  ok("gemini: the prompt forbids guessing names", /never guess a person's name/.test(gen.contents[0].parts[1].text));
  ok("gemini: the upload is named generically", JSON.parse(vs[0].body).file.display_name === "audit-eval-piece");
  eq("gemini: turns with speaker labels", r.out.file.turns, [{ start: 0.5, end: 3, speaker: "spk_spk0" }, { start: 4, end: 6, speaker: "spk_spk1" }]);
  ok("gemini: retention note repeated in the result metadata", /limited period/.test(r.out.system.settings.retention) && /D-10/.test(r.out.system.settings.retention));
}

console.log("=== the function: failures ===");
{
  const before = globalThis.fetch;
  globalThis.fetch = async (u, i) => String(u).startsWith("https://api.openai.com/")
    ? new Response(JSON.stringify({ error: { message: `Incorrect API key provided: ${SECRETS.OPENAI_API_KEY}` } }), { status: 401 })
    : before(u, i);
  const r = await post("admin-token", ask("openai", "whisper-1"));
  globalThis.fetch = before;
  eq("a vendor error answers 502 with the vendor's status", [r.status, r.out.vendor_status], [502, 401]);
  ok("and does not echo the vendor's error body (which quoted the key)", !JSON.stringify(r.out).includes("SECRET") && !JSON.stringify(r.out).includes("Incorrect"));
}
{
  env.AUDIT_EVAL_TIMEOUT_MS = "50";
  vendorDelay = 2000;
  calls = [];
  const r = await post("admin-token", ask("azure", "fast-multilingual"));
  const fin = r.calls.find((c) => c.url.endsWith("audit_eval_finish"));
  eq("a vendor slower than the deadline: 504, retryable", [r.status, r.out?.retryable], [504, true]);
  eq("and the call is recorded as a timeout", fin?.json?.p_status, "timeout");
  vendorDelay = null;
  delete env.AUDIT_EVAL_TIMEOUT_MS;
}
{
  const missing = env.GEMINI_API_KEY;
  delete env.GEMINI_API_KEY;
  const r = await post("admin-token", ask("gemini", "transcribe-speakers"));
  env.GEMINI_API_KEY = missing;
  eq("a vendor with no secret set answers 503 before reserving", [r.status, r.calls.length], [503, 0]);
}

console.log("=== the function: nothing leaks to the logs ===");
{
  const all = consoleSeen.join("\n");
  ok("the function did log (ids and statuses)", /"fn":"audit-eval-proxy"/.test(all));
  for (const [name, v] of Object.entries(SECRETS)) ok(`no ${name} value in any console output`, !all.includes(v) && !all.includes("SECRET-"));
  ok("no transcript text in any console output", !all.includes(TRANSCRIPT_WORD) && !all.includes("xin chao") && !all.includes("da vang"));
  ok("no header in any console output", !/authorization|ocp-apim|x-goog-api-key|Bearer/i.test(all));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
