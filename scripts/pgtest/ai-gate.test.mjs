// F-02: the nine functions that spend AI / speech / image-search credit.
//
//   node scripts/pgtest/ai-gate.test.mjs
//
// Each REAL function is bundled with esbuild (remote imports stubbed, its own
// ../_lib imports real), its handler captured, and driven with requests. The
// Supabase client is an in-memory stand-in for Auth and user_roles; `fetch`
// is scripted and records every vendor call, so "refused" can be shown to
// have spent nothing and read nothing.
//
// Each function is also run AS IT WAS before the gate (git show BASE): an
// empty-handed caller reaches the vendor. That is the defect, reproduced.
import { build } from "esbuild";
import { writeFileSync, readFileSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FUNCTIONS = resolve(repo, "supabase", "functions");
const BASE = "6703938"; // the functions before the gate (the audit's commit)
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? "PASS" : "FAIL"}  ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 500)}` : ""}`);
  value ? pass++ : fail++;
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

// ------------------------------------------------------------- the nine
const MIN = 60_000;
const ANY = ["student", "family", "teacher", "admin"];
const STAFF = ["teacher", "admin"];
const NINE = {
  "word-enrichment":     { roles: ANY, limit: 40, windowMs: 5 * MIN, body: { word: "cat", context: "The cat sat.", target_cefr: "A1" } },
  "image-search":        { roles: ANY, limit: 90, windowMs: 5 * MIN, body: { query: "cat", count: 4 } },
  "pronounce-syllables": { roles: ANY, limit: 60, windowMs: 5 * MIN, body: { word: "elephant" } },
  "pronounce-viseme":    { roles: ANY, limit: 60, windowMs: 5 * MIN, body: { word: "cat" } },
  "smart-dictation":     { roles: ANY, limit: 40, windowMs: 5 * MIN, body: { rawText: "i goes to school", targetLanguage: "en" } },
  "smart-dictionary":    { roles: ANY, limit: 40, windowMs: 5 * MIN, body: { target_word: "cat", cefr_level: "A1" } },
  "sapling-grammar":     { roles: ANY, limit: 90, windowMs: 5 * MIN, body: { sentence: "he go to school" } },
  "get-speech-token":    { roles: ANY, limit: 30, windowMs: 10 * MIN, body: {} },
  "image-generate":      { roles: STAFF, limit: 10, windowMs: 10 * MIN, body: { word: "cat" } },
};

// ------------------------------------------------------------- the people
const SERVICE_KEY = "test-service-role-key";
const ANON_KEY = "test-anon-key";   // the browser's public key: a JWT the gateway accepts, and not a session
const U = {
  admin: "aaaaaaaa-0000-4000-8000-000000000001", teacher: "aaaaaaaa-0000-4000-8000-000000000002",
  student: "aaaaaaaa-0000-4000-8000-000000000003", family: "aaaaaaaa-0000-4000-8000-000000000004",
  norole: "aaaaaaaa-0000-4000-8000-000000000005",   // a sign-up that asked for a staff role (F-01): no role at all
  adminAndStudent: "aaaaaaaa-0000-4000-8000-000000000006",
  rolesBroken: "aaaaaaaa-0000-4000-8000-000000000007", // the role lookup errors
  other: "aaaaaaaa-0000-4000-8000-000000000008",
};
const ROLES = { [U.admin]: ["admin"], [U.teacher]: ["teacher"], [U.student]: ["student"], [U.family]: ["family"], [U.norole]: [],
  [U.adminAndStudent]: ["admin", "student"], [U.other]: ["student"] };
const tokenOf = (u) => `jwt-${u}`;

let log = [];      // what the function asked of Supabase
let vendor = [];   // every outgoing call that costs money or quota
function fakeClient(key) {
  const who = key === SERVICE_KEY ? "service" : "other";
  const from = (table) => {
    const st = { table, op: "select", filters: [] };
    const exec = () => {
      log.push({ client: who, table, op: st.op });
      if (table === "user_roles") {
        const uid = st.filters.find((f) => f[0] === "user_id")?.[1];
        if (uid === U.rolesBroken) return { data: null, error: { message: "connection reset" } };
        return { data: (ROLES[uid] || []).map((role) => ({ role })), error: null };
      }
      return { data: st.single ? null : [], error: null };   // caches: always a miss
    };
    const b = new Proxy({}, {
      get(_t, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve().then(exec).then(res, rej);
        return (...args) => {
          if (prop === "eq") st.filters.push([args[0], args[1]]);
          if (["insert", "upsert", "update", "delete"].includes(prop)) st.op = prop;
          if (prop === "single" || prop === "maybeSingle") st.single = true;
          return b;
        };
      },
    });
    return b;
  };
  return {
    from,
    rpc: async (name) => { log.push({ client: who, rpc: name }); return { data: null, error: null }; },
    auth: {
      getUser: async (token) => {
        log.push({ client: who, auth: "getUser" });
        const uid = Object.values(U).find((u) => tokenOf(u) === token);
        if (!uid) return { data: { user: null }, error: { message: "invalid JWT" } };
        return { data: { user: { id: uid, email: `${uid}@example.test` } }, error: null };
      },
    },
  };
}
globalThis.__fakeCreateClient = (_url, key) => fakeClient(key);
globalThis.__vendor = (what) => { vendor.push(what); };

// One answer that satisfies every vendor's happy path well enough to return.
const ANSWER = {
  choices: [{ message: { content: JSON.stringify({ word: "cat", definition: "a small animal", examples: [], correctedText: "I go to school." }) } }],
  edits: [], data: [{ url: "https://img.example/cat.png" }], hits: [], photos: [], items: [], results: [], total: 0,
};
globalThis.fetch = async (url, init = {}) => {
  const host = new URL(String(url)).host;
  vendor.push(host);
  if (/issueToken/.test(String(url))) return new Response("azure-token-abc", { status: 200 });
  if (/tts\.speech\.microsoft\.com/.test(host)) return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  return new Response(JSON.stringify(ANSWER), { status: 200, headers: { "content-type": "application/json" } });
};
const env = {
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY,
  OPENAI_API_KEY: "k-openai", azure_key: "k-azure", AZURE_SPEECH_REGION: "southeastasia", sapling_api: "k-sapling",
  Pixabay_API: "k-pixabay", Pexels_API: "k-pexels", unsplash_api: "k-unsplash", GOOGLE_CSE_API_KEY: "k-google", GOOGLE_CSE_ID: "cx",
};
let captured = null;
globalThis.__capture = (h) => { captured = h; };
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
const quiet = { log: console.log, warn: console.warn, error: console.error };

let seq = 0;
async function load(name, source) {
  const out = await build({
    stdin: { contents: source, resolveDir: resolve(FUNCTIONS, name), sourcefile: "index.ts", loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{
      name: "remote-imports",
      setup(b) {
        b.onResolve({ filter: /^(https?:\/\/|npm:|jsr:)/ }, (args) => ({ path: args.path, namespace: "remote" }));
        b.onLoad({ filter: /.*/, namespace: "remote" }, (args) => ({
          loader: "js",
          contents: args.path.startsWith("npm:microsoft-cognitiveservices-speech-sdk")
            // Touching the speech SDK is a vendor call.
            ? `const spend = () => { globalThis.__vendor("azure-speech-sdk"); throw new Error("sdk stub"); };
               export const SpeechConfig = { fromSubscription: spend }; export function SpeechSynthesizer() { spend(); }
               export const PropertyId = {}; export const ResultReason = {}; export const SpeechSynthesisOutputFormat = {}; export const SpeechSynthesisResult = {};`
            : `export const createClient = (...args) => globalThis.__fakeCreateClient(...args);
               export const serve = (h) => globalThis.__capture(h);
               export const GoogleAuth = function () {}; export default {};`,
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `ai-gate.${name}.${process.pid}.${seq++}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}
async function call(handler, name, { token, body, method = "POST", headers: extra = {} } = {}) {
  log = []; vendor = [];
  const headers = { "content-type": "application/json", ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request(`https://example.supabase.co/functions/v1/${name}`, {
      method, headers, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    }));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, retryAfter: res.headers.get("Retry-After"), cors: res.headers.get("Access-Control-Allow-Origin"),
      vendor: vendor.slice(), tables: log.filter((e) => e.table && e.table !== "user_roles").map((e) => e.table) };
  } finally { Object.assign(console, quiet); }
}
const spentNothing = (r) => r.vendor.length === 0 && r.tables.length === 0;

for (const [name, cfg] of Object.entries(NINE)) {
  console.log(`=== ${name} ===`);
  const file = resolve(FUNCTIONS, name, "index.ts");
  const src = readFileSync(file, "utf8");

  // ---- before: the defect
  let before = null;
  try { before = await load(name, execFileSync("git", ["show", `${BASE}:supabase/functions/${name}/index.ts`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { /* no history */ }
  ok("the function as it was before the gate could be loaded from git", typeof before === "function");
  if (before) {
    const r = await call(before, name, { body: cfg.body });
    ok(`BEFORE: a caller with no Authorization header at all reaches the vendor (${r.vendor[0] ?? "-"})`, r.vendor.length > 0, r);
    const a = await call(before, name, { token: ANON_KEY, body: cfg.body });
    ok("BEFORE: so does one holding only the public key from the web page", a.vendor.length > 0, a);
  }

  // ---- after
  const fn = await load(name, src);
  ok("the function registers a handler", typeof fn === "function");
  const pre = await call(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing(pre), pre);

  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an empty bearer", " ", 401], ["the service-role key", SERVICE_KEY, 403], ["an account with no role", tokenOf(U.norole), 403],
    ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
  ]) {
    const r = await call(fn, name, { token, body: cfg.body });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing(r) && r.cors === "*", r);
  }
  {
    // Identity is the token's, never the body's or a header's.
    const r = await call(fn, name, { token: tokenOf(U.norole), body: { ...cfg.body, user_id: U.admin, role: "admin", roles: ["admin"] }, headers: { "x-user-id": U.admin, "x-role": "admin" } });
    ok("a role-less account naming an admin in the body and headers is still refused", r.status === 403 && spentNothing(r), r);
  }
  for (const role of ["student", "family", "teacher", "admin"]) {
    const r = await call(fn, name, { token: tokenOf(U[role]), body: cfg.body });
    if (cfg.roles.includes(role)) ok(`${role}: let through, and the vendor is called (${r.vendor[0] ?? "-"}) - status ${r.status}`, ![401, 403, 429].includes(r.status) && r.vendor.length > 0, r);
    else ok(`${role}: 403, nothing spent (staff only)`, r.status === 403 && spentNothing(r), r);
  }
  {
    const r = await call(fn, name, { token: tokenOf(U.adminAndStudent), body: cfg.body });
    ok("an admin who also holds student is let through", ![401, 403, 429].includes(r.status) && r.vendor.length > 0, r);
  }

  // ---- the limit, on a fresh instance so the counts are this section's own
  const fresh = await load(name, src);
  let passed = 0, firstRefusal = null;
  for (let i = 0; i < cfg.limit + 3; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body: cfg.body });
    if (r.status === 429) { firstRefusal ??= { at: i + 1, r }; } else if (r.vendor.length > 0) passed++;
  }
  eq(`exactly ${cfg.limit} calls per account get through, then 429`, [passed, firstRefusal?.at], [cfg.limit, cfg.limit + 1]);
  ok("the 429 says when to retry and spends nothing", !!firstRefusal && Number(firstRefusal.r.retryAfter) > 0 && Number(firstRefusal.r.retryAfter) <= cfg.windowMs / 1000 && spentNothing(firstRefusal.r), firstRefusal?.r);
  {
    const otherAccount = await call(fresh, name, { token: tokenOf(U.admin), body: cfg.body });
    ok("another account is not held back by it", ![401, 403, 429].includes(otherAccount.status) && otherAccount.vendor.length > 0, otherAccount);
    const spoofed = await call(fresh, name, { token: tokenOf(U.teacher), body: cfg.body, headers: { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" } });
    ok("the limited account cannot escape by changing its IP headers (the key is the user id)", spoofed.status === 429, spoofed);
    const anon = await call(fresh, name, { body: cfg.body });
    ok("and an unauthenticated caller is still a 401, not a 429", anon.status === 401, anon);
  }

  // ---- the source
  {
    const iOpt = src.indexOf('req.method === "OPTIONS"'), iGate = src.indexOf("await requireSpender(req, corsHeaders, GATE)"), iJson = src.indexOf("req.json()", iOpt);
    const between = iOpt >= 0 && iGate > iOpt ? src.slice(iOpt, iGate) : "await";
    ok("the gate is the first thing after the preflight: nothing is awaited, and the body is not read, before it",
      iGate > iOpt && !/\bawait\b/.test(between) && (iJson === -1 || iGate < iJson)
      && /const spender = await requireSpender\(req, corsHeaders, GATE\);\s*if \(spender instanceof Response\) return spender;/.test(src));
  }
  const gateLine = /const GATE: SpendGate = \{([^}]*)\}/.exec(src)?.[1] ?? "";
  ok(`its settings are the ones tested here (${cfg.limit} per ${cfg.windowMs / MIN} min${cfg.roles === STAFF ? ", staff only" : ""})`,
    gateLine.includes(`name: "${name}"`) && gateLine.includes(`limit: ${cfg.limit}`) && gateLine.includes(`windowMs: ${cfg.windowMs / MIN} * 60_000`)
    && (cfg.roles === STAFF) === gateLine.includes("roles: STAFF_ROLES"), gateLine);
}

// D-26: analyze-transcript spends on OpenAI for a browser (Teacher Transcripts:
// paste and Re-analyze). It differs from the nine in one way: the service-role
// key is still let through, because transcribe-lesson-audio hands off to it
// with that key after its own staff + class check (transcribe-gate.test.mjs).
// The stand-in has no transcripts, so a caller the gate lets through gets 404
// "transcript not found": past the gate, and still nothing spent.
console.log("=== analyze-transcript (D-26) ===");
{
  const name = "analyze-transcript";
  const src = readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
  const body = { transcript_id: "00000000-0000-4000-8000-0000000000aa" };
  const fn = await load(name, src);
  ok("the function registers a handler", typeof fn === "function");
  const pre = await call(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing(pre), pre);
  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an account with no role", tokenOf(U.norole), 403], ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
    ["a student", tokenOf(U.student), 403], ["a family", tokenOf(U.family), 403],
  ]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing(r) && r.cors === "*", r);
  }
  for (const [label, token] of [["a teacher", tokenOf(U.teacher)], ["an admin", tokenOf(U.admin)],
    ["the service-role key (transcribe-lesson-audio's hand-off)", SERVICE_KEY]]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: past the gate (404 for a transcript that does not exist), nothing spent`, r.status === 404 && r.vendor.length === 0, r);
  }
  const fresh = await load(name, src);
  let passed = 0, firstRefusal = null;
  for (let i = 0; i < 13; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body });
    if (r.status === 429) firstRefusal ??= { at: i + 1, r }; else if (r.status === 404) passed++;
  }
  eq("exactly 10 calls per account get through, then 429", [passed, firstRefusal?.at], [10, 11]);
  ok("the 429 says when to retry and spends nothing", !!firstRefusal && Number(firstRefusal.r.retryAfter) > 0 && spentNothing(firstRefusal.r), firstRefusal?.r);
  const other = await call(fresh, name, { token: tokenOf(U.admin), body });
  ok("another account is not held back by it", other.status === 404, other);
  const iOpt = src.indexOf('req.method === "OPTIONS"'), iGate = src.indexOf("await requireSpender(req, corsHeaders, GATE)"), iJson = src.indexOf("req.json()", iOpt);
  const between = iOpt >= 0 && iGate > iOpt ? src.slice(iOpt, iGate) : "await";
  ok("the gate comes first after the preflight: nothing awaited and the body not read before it",
    iGate > iOpt && !/\bawait\b/.test(between) && iJson > iGate
    && /const spender = internal \? null : await requireSpender\(req, corsHeaders, GATE\);\s*if \(spender instanceof Response\) return spender;/.test(src));
  const gateLine = /const GATE: SpendGate = \{([^}]*)\}/.exec(src)?.[1] ?? "";
  ok("its settings are the ones tested here (10 per 10 min, staff only)",
    gateLine.includes(`name: "${name}"`) && gateLine.includes("limit: 10") && gateLine.includes("windowMs: 10 * 60_000") && gateLine.includes("roles: STAFF_ROLES"), gateLine);
  const walk = (dir) => readdirSync(dir).flatMap((e) => { const f = join(dir, e); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(e) ? [f] : []; });
  const users = walk(resolve(repo, "src")).map((f) => readFileSync(f, "utf8")).filter((t) => t.includes(`"${name}"`));
  ok(`${users.length} caller file(s) in src/, every one through supabase.functions.invoke`, users.length > 0
    && users.every((t) => /supabase\.functions\.invoke\(\s*"analyze-transcript"/.test(t) && !t.includes("/functions/v1/analyze-transcript")));
  ok("verify_jwt = true in supabase/config.toml", /\[functions\.analyze-transcript\]\r?\nverify_jwt = true/.test(readFileSync(resolve(repo, "supabase", "config.toml"), "utf8")));
}

// PRIVACY follow-ups (docs/evidence/PRIVACY-followups.md): transcribe-lesson-audio
// sends a whole lesson's recording to Whisper for a browser (Teacher
// Transcripts: upload and Retry). Staff only, 10 per 10 minutes, and - unlike
// analyze-transcript - no service-role hand-off: nothing calls it with that
// key, so the key is refused. The stand-in has no transcripts, so a caller the
// gate lets through gets 404 "transcript not found": past the gate, nothing spent.
console.log("=== transcribe-lesson-audio (privacy follow-ups) ===");
{
  const name = "transcribe-lesson-audio";
  const src = readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
  const body = { transcript_id: "00000000-0000-4000-8000-0000000000bb" };
  const fn = await load(name, src);
  ok("the function registers a handler", typeof fn === "function");
  const pre = await call(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing(pre), pre);
  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an empty bearer", " ", 401], ["the service-role key (nothing hands off to this function)", SERVICE_KEY, 403],
    ["an account with no role", tokenOf(U.norole), 403], ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
    ["a student", tokenOf(U.student), 403], ["a family", tokenOf(U.family), 403],
  ]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing(r) && r.cors === "*", r);
  }
  {
    const r = await call(fn, name, { token: tokenOf(U.norole), body: { ...body, user_id: U.admin, role: "admin" }, headers: { "x-user-id": U.admin, "x-role": "admin" } });
    ok("a role-less account naming an admin in the body and headers is still refused", r.status === 403 && spentNothing(r), r);
  }
  for (const [label, token] of [["a teacher", tokenOf(U.teacher)], ["an admin", tokenOf(U.admin)], ["an admin who also holds student", tokenOf(U.adminAndStudent)]]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: past the gate (404 for a transcript that does not exist), nothing spent`, r.status === 404 && r.vendor.length === 0, r);
  }
  const fresh = await load(name, src);
  let passed = 0, firstRefusal = null;
  for (let i = 0; i < 13; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body });
    if (r.status === 429) firstRefusal ??= { at: i + 1, r }; else if (r.status === 404) passed++;
  }
  eq("exactly 10 calls per account get through, then 429", [passed, firstRefusal?.at], [10, 11]);
  ok("the 429 says when to retry and spends nothing", !!firstRefusal && Number(firstRefusal.r.retryAfter) > 0 && Number(firstRefusal.r.retryAfter) <= 600 && spentNothing(firstRefusal.r), firstRefusal?.r);
  const other = await call(fresh, name, { token: tokenOf(U.admin), body });
  ok("another account is not held back by it", other.status === 404, other);
  const spoofed = await call(fresh, name, { token: tokenOf(U.teacher), body, headers: { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" } });
  ok("the limited account cannot escape by changing its IP headers (the key is the user id)", spoofed.status === 429, spoofed);
  const iOpt = src.indexOf('req.method === "OPTIONS"'), iGate = src.indexOf("await requireSpender(req, corsHeaders, GATE)"), iJson = src.indexOf("req.json()", iOpt);
  const between = iOpt >= 0 && iGate > iOpt ? src.slice(iOpt, iGate) : "await";
  ok("the gate comes first after the preflight: nothing awaited and the body not read before it",
    iGate > iOpt && !/\bawait\b/.test(between) && iJson > iGate
    && /const spender = await requireSpender\(req, corsHeaders, GATE\);\s*if \(spender instanceof Response\) return spender;/.test(src));
  const gateLine = /const GATE: SpendGate = \{([^}]*)\}/.exec(src)?.[1] ?? "";
  ok("its settings are the ones tested here (10 per 10 min, staff only)",
    gateLine.includes(`name: "${name}"`) && gateLine.includes("limit: 10") && gateLine.includes("windowMs: 10 * 60_000") && gateLine.includes("roles: STAFF_ROLES"), gateLine);
  const walk = (dir) => readdirSync(dir).flatMap((e) => { const f = join(dir, e); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(e) ? [f] : []; });
  const users = walk(resolve(repo, "src")).map((f) => readFileSync(f, "utf8")).filter((t) => t.includes(`"${name}"`));
  ok(`${users.length} caller file(s) in src/, every one through supabase.functions.invoke (a staff session)`, users.length > 0
    && users.every((t) => /supabase\.functions\.invoke\(\s*"transcribe-lesson-audio"/.test(t) && !t.includes("/functions/v1/transcribe-lesson-audio")));
  const fnUsers = walk(FUNCTIONS).filter((f) => !f.includes(`${name}`)).filter((f) => readFileSync(f, "utf8").includes(`functions/v1/${name}`));
  eq("no edge function calls it (so no service-role hand-off is needed)", fnUsers, []);
  ok("verify_jwt = true in supabase/config.toml", /\[functions\.transcribe-lesson-audio\]\r?\nverify_jwt = true/.test(readFileSync(resolve(repo, "supabase", "config.toml"), "utf8")));
}

// PRIVACY follow-ups round 2: generate-student-report (staff; 60 per 10 min -
// BulkReportExport generates a class one report at a time, the biggest class
// had 10 children on 17 Nov) and cefr-defense (the child takes the test, staff
// run the rest: any role; 60 calls per 10 min overall, get_state included,
// and 20 per 10 min for the three actions that call OpenAI). The stand-in has
// no rows, so a caller let through gets a 404 / 400 / 403 from the function
// itself, past the gate, with nothing spent.
const gateSource = (src, name, limit, staffOnly, rolesName) => {
  const iOpt = src.indexOf('req.method === "OPTIONS"'), iGate = src.indexOf("await requireSpender(req, corsHeaders, GATE)"), iJson = src.indexOf("req.json()", iOpt);
  const between = iOpt >= 0 && iGate > iOpt ? src.slice(iOpt, iGate) : "await";
  ok("the gate comes first after the preflight: nothing awaited and the body not read before it",
    iGate > iOpt && !/\bawait\b/.test(between) && iJson > iGate
    && /const spender = await requireSpender\(req, corsHeaders, GATE\);\s*if \(spender instanceof Response\) return spender;/.test(src));
  const gateLine = /const GATE: SpendGate = \{([^}]*)\}/.exec(src)?.[1] ?? "";
  ok(`its settings are the ones tested here (${limit} per 10 min, ${staffOnly ? "staff only" : "any role"})`,
    gateLine.includes(`name: "${name}"`) && gateLine.includes(`limit: ${limit}`) && gateLine.includes("windowMs: 10 * 60_000") && gateLine.includes(`roles: ${rolesName}`), gateLine);
  ok("no gate of its own is left (authenticateUser / getUser / user_roles before the gate)", !/authenticateUser\(|sb\.auth\.getUser\(|from\("user_roles"\)/.test(src));
  ok(`verify_jwt = true in supabase/config.toml`, new RegExp(`\\[functions\\.${name}\\]\\r?\\nverify_jwt = true`).test(readFileSync(resolve(repo, "supabase", "config.toml"), "utf8")));
};

console.log("=== generate-student-report (privacy follow-ups round 2) ===");
{
  const name = "generate-student-report";
  const src = readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
  const body = { report_id: "00000000-0000-4000-8000-0000000000cc" };
  const fn = await load(name, src);
  ok("the function registers a handler", typeof fn === "function");
  const pre = await call(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing(pre), pre);
  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an empty bearer", " ", 401], ["the service-role key (nothing calls it with one)", SERVICE_KEY, 403],
    ["an account with no role", tokenOf(U.norole), 403], ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
    ["a student", tokenOf(U.student), 403], ["a family", tokenOf(U.family), 403],
  ]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing(r) && r.cors === "*", r);
  }
  for (const [label, token] of [["a teacher", tokenOf(U.teacher)], ["an admin", tokenOf(U.admin)], ["an admin who also holds student", tokenOf(U.adminAndStudent)]]) {
    const r = await call(fn, name, { token, body });
    ok(`${label}: past the gate (404 for a report that does not exist), nothing spent`, r.status === 404 && r.vendor.length === 0, r);
  }
  const fresh = await load(name, src);
  let passed = 0, firstRefusal = null;
  for (let i = 0; i < 63; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body });
    if (r.status === 429) firstRefusal ??= { at: i + 1, r }; else if (r.status === 404) passed++;
  }
  eq("exactly 60 calls per account get through, then 429 (a class of 10 six times over)", [passed, firstRefusal?.at], [60, 61]);
  ok("the 429 says when to retry and spends nothing", !!firstRefusal && Number(firstRefusal.r.retryAfter) > 0 && Number(firstRefusal.r.retryAfter) <= 600 && spentNothing(firstRefusal.r), firstRefusal?.r);
  const other = await call(fresh, name, { token: tokenOf(U.admin), body });
  ok("another account is not held back by it", other.status === 404, other);
  gateSource(src, name, 60, true, "STAFF_ROLES");
}

console.log("=== cefr-defense (privacy follow-ups round 2) ===");
{
  const name = "cefr-defense";
  const src = readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
  const fn = await load(name, src);
  ok("the function registers a handler", typeof fn === "function");
  const pre = await call(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing(pre), pre);
  const state = { action: "get_state" };
  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an empty bearer", " ", 401], ["the service-role key", SERVICE_KEY, 403],
    ["an account with no role", tokenOf(U.norole), 403], ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
  ]) {
    const r = await call(fn, name, { token, body: state });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing(r) && r.cors === "*", r);
  }
  for (const role of ["student", "family", "teacher", "admin"]) {
    const r = await call(fn, name, { token: tokenOf(U[role]), body: state });
    ok(`${role}: past the gate (400 "No student in scope": the stand-in has no linked child), nothing spent`, r.status === 400 && r.vendor.length === 0, r);
  }
  // The OpenAI actions' own 20 per 10 min is counted just before the model
  // call (review N-4), so calls the function refuses first cost nothing of it;
  // cefr-drafts.test.mjs drives the 20 real calls. Here: refused calls never
  // reach that limit, and every call counts towards the overall 60.
  const fresh = await load(name, src);
  const mine = { action: "mine_evidence", student_id: "00000000-0000-4000-8000-0000000000dd" };
  let refused = 0, limited = 0;
  for (let i = 0; i < 25; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body: mine });
    if (r.status === 403 && r.vendor.length === 0) refused++; else if (r.status === 429) limited++;
  }
  eq("25 evidence audits the function refuses (not the teacher's child): all 403, none counted as an OpenAI call", [refused, limited], [25, 0]);
  // 25 calls so far; 35 more reach 60, the 61st is refused.
  let left = 0, overall = null;
  for (let i = 0; i < 37; i++) {
    const r = await call(fresh, name, { token: tokenOf(U.teacher), body: state });
    if (r.status === 429) overall ??= i + 1; else left++;
  }
  eq("the overall gate: 60 calls per account in all, then 429", [left, overall], [35, 36]);
  const other = await call(fresh, name, { token: tokenOf(U.student), body: state });
  ok("another account is not held back by it", other.status === 400, other);
  const st = await call(fresh, name, { token: tokenOf(U.student), body: mine });
  ok("a student asking for the evidence audit is still refused by the function (403), after the gate", st.status === 403 && st.vendor.length === 0, st);
  gateSource(src, name, 60, false, "SIGNED_IN_ROLES");
  ok("the OpenAI actions' own limit is 20 per 10 min, on mine_evidence, generate_test and submit_stage",
    /const SPEND = \{ limit: 20, windowMs: 10 \* 60_000 \}/.test(src) && /SPENDING_ACTIONS = new Set\(\["mine_evidence", "generate_test", "submit_stage"\]\)/.test(src));
  {
    const after = (block, check) => { const i = src.indexOf(block); const c = src.indexOf(check, i); const o = src.indexOf("overSpend()", i); const m = src.indexOf("openaiJson(key", i) === -1 ? Infinity : src.indexOf("openaiJson(key", i); const g = src.indexOf("generateStage(key", i);
      return i >= 0 && c > i && o > c && o < Math.min(m, g === -1 ? Infinity : g); };
    ok("  ...counted inside each action after its own checks, before the model call (N-4)",
      after('if (action === "mine_evidence")', '"Set a level first"') && after('if (action === "generate_test")', '"Set a level first"') && after('if (action === "submit_stage")', '"Already graded"'));
  }
}

console.log("=== image-search: the cache-bypassing switches ===");
{
  const src = readFileSync(resolve(FUNCTIONS, "image-search", "index.ts"), "utf8");
  const fn = await load("image-search", src);
  for (const body of [{ query: "cat", provider: "pixabay" }, { query: "cat", skip_cache: true }]) {
    const s = await call(fn, "image-search", { token: tokenOf(U.student), body });
    ok(`a student sending ${JSON.stringify(body)}: 403, no vendor call`, s.status === 403 && s.vendor.length === 0, s);
    const t = await call(fn, "image-search", { token: tokenOf(U.teacher), body });
    ok(`a teacher sending the same: allowed`, t.status === 200 && t.vendor.length > 0, t);
  }
  const plain = await call(fn, "image-search", { token: tokenOf(U.student), body: { query: "cat", count: 4 } });
  ok("a student's ordinary search (what the app sends) is unaffected", plain.status === 200 && plain.vendor.length > 0, plain);
}

console.log("=== the callers in src/, and the gateway setting ===");
{
  const walk = (dir) => readdirSync(dir).flatMap((e) => { const f = join(dir, e); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(e) ? [f] : []; });
  const files = walk(resolve(repo, "src")).map((f) => [f, readFileSync(f, "utf8")]);
  const toml = readFileSync(resolve(repo, "supabase", "config.toml"), "utf8").replace(/\r/g, "");
  for (const name of Object.keys(NINE)) {
    const users = files.filter(([, t]) => t.includes(`"${name}"`) || t.includes(`'${name}'`));
    const viaInvoke = users.every(([, t]) => new RegExp(`supabase\\.functions\\.invoke\\(\\s*["']${name}["']`).test(t));
    const rawFetch = files.some(([, t]) => t.includes(`/functions/v1/${name}`));
    ok(`${name}: ${users.length} caller file(s) in src/, every one through supabase.functions.invoke (which sends the session's token), none by raw fetch`, viaInvoke && !rawFetch);
    ok(`${name}: verify_jwt = true in supabase/config.toml`, new RegExp(`\\[functions\\.${name}\\]\\nverify_jwt = true`).test(toml));
  }
  // reception-feed (16 Nov 2026): the reception TV has no user session; the function checks a
  // 48-hex display token from reception_settings (constant-time compare) and returns only screen
  // data. It calls no AI vendor.
  eq("only the functions that must be public still opt out of the gateway check",
    [...toml.matchAll(/\[functions\.([a-z-]+)\]\nverify_jwt = false/g)].map((m) => m[1]).sort(), ["parent-video-page", "reception-feed", "redeem-access-code"]);
  // No page reachable before sign-in calls any of the nine.
  const publicPages = ["src/pages/Auth.tsx", "src/pages/ResetPassword.tsx", "src/pages/ClaimAccess.tsx", "src/pages/ParentVideos.tsx", "src/pages/OAuthConsent.tsx", "src/pages/NotFound.tsx", "src/pages/ReceptionFeedback.tsx"];
  const offenders = publicPages.filter((p) => { try { const t = readFileSync(resolve(repo, p), "utf8"); return Object.keys(NINE).some((n) => t.includes(`"${n}"`)); } catch { return false; } });
  eq("no sign-in, reset, claim, consent or shared-video page calls any of the nine", offenders, []);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
