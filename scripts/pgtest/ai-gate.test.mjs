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

// ════════════════════════════════════════════════════════════════════════
// N-5 (privacy review, 17 Nov 2026): eight more functions that call a paid
// vendor for a browser. Several already checked a role; none had a
// per-account limit, and analyze-video-submission checked neither.
//
// The same harness, with a fake that holds a little data, so that an
// allowed caller really reaches the vendor (and a refused one is shown to
// have read and spent nothing). Each is also run AS IT WAS (BASE8): one
// account's limit + 1 calls all reached the vendor.
// ════════════════════════════════════════════════════════════════════════
const BASE8 = "9e591347"; // main before N-5
const { generateKeyPairSync } = await import("node:crypto");
const pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
env.GOOGLE_CREDENTIALS = JSON.stringify({ type: "service_account", client_email: "ocr@example.test", private_key: pem, token_uri: "https://oauth2.googleapis.com/token" });
env.ANTHROPIC_API_KEY = "k-anthropic";

const IDS = {
  cls: "c0000000-0000-4000-8000-000000000001", student: "50000000-0000-4000-8000-000000000001",
  work: "a0000000-0000-4000-8000-000000000001", vocabWork: "a0000000-0000-4000-8000-000000000002",
  hw: "b0000000-0000-4000-8000-000000000001", video: "d0000000-0000-4000-8000-000000000001",
};
const STAFF_IDS = [U.teacher, U.admin, U.adminAndStudent];
const OWNERS = [U.student, U.family];   // the child's own login and their parent
let W = null;          // the world the fake serves
let log8 = [], vendor8 = [], fetched8 = [], rpc8 = [], writes8 = [];
const world = (over = {}) => ({
  user_roles: [],
  students: [{ id: IDS.student, full_name: "Nguyen Van An", date_of_birth: null, family_id: null, linked_user_id: U.student, is_active: true }],
  student_work: [
    { id: IDS.work, student_id: IDS.student, class_id: IDS.cls, uploaded_by: U.teacher, storage_path: "incoming/p1.jpg", mime_type: "image/jpeg", ocr_text: "My cat", workflow: "general", status: "needs_review", member_student_ids: [] },
    { id: IDS.vocabWork, student_id: IDS.student, class_id: IDS.cls, uploaded_by: U.teacher, storage_path: "incoming/p2.jpg", mime_type: "image/jpeg", ocr_text: null, workflow: "vocab", status: "processing", member_student_ids: [] },
  ],
  enrollments: [{ id: "e1", student_id: IDS.student, class_id: IDS.cls, end_date: null }],
  homeworks: [{ id: IDS.hw, title: "My weekend", body: "Talk about your weekend", class_id: IDS.cls, submission_type: "video", video_max_seconds: 120, classes: { name: "Stars" } }],
  video_submissions: [{ id: IDS.video, homework_id: IDS.hw, student_id: IDS.student, class_id: IDS.cls, status: "uploaded",
    video_path: `${IDS.student}/${IDS.hw}/1/video.webm`, audio_path: `${IDS.student}/${IDS.hw}/1/audio.webm`, audio_mime: "audio/webm", video_mime: "video/webm",
    frame_paths: [], size_bytes: 1000, duration_seconds: 30, pronunciation: null }],
  claim: "claimed",
  ...over,
});
const matches = (row, filters) => filters.every(([op, c, v]) =>
  op === "eq" ? String(row[c]) === String(v) : op === "in" ? v.map(String).includes(String(row[c])) : op === "neq" ? String(row[c]) !== String(v) : true);
function fake8(key, opts) {
  const service = key === SERVICE_KEY;
  const header = opts?.global?.headers?.Authorization ?? "";
  const callerUid = service ? null : (Object.values(U).find((u) => header === `Bearer ${tokenOf(u)}`) ?? null);
  const who = service ? "service" : "caller";
  // A sketch of RLS, for the reads made as the caller.
  const visible = (table, row) => service || table !== "video_submissions" || STAFF_IDS.includes(callerUid) || OWNERS.includes(callerUid);
  const from = (table) => {
    const st = { op: "select", filters: [], single: null, payload: null, head: false, conflict: null, returning: false };
    const exec = () => {
      log8.push({ client: who, table, op: st.op });
      if (table === "user_roles") {
        const uid = st.filters.find((f) => f[1] === "user_id")?.[2];
        if (uid === U.rolesBroken) return { data: null, error: { message: "connection reset" } };
        return { data: (ROLES[uid] || []).map((role) => ({ role })), error: null };
      }
      W[table] ??= [];
      if (st.op !== "select") writes8.push({ client: who, table, op: st.op, payload: st.payload });
      let rows;
      if (st.op === "insert" || st.op === "upsert") {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ ...p }));
        for (const p of list) {
          const k = st.conflict?.split(",")[0];
          const at = k ? W[table].findIndex((r) => r[k] === p[k]) : -1;
          if (at >= 0) W[table][at] = { ...W[table][at], ...p }; else W[table].push(p);
        }
        rows = list;
      } else if (st.op === "update") {
        rows = W[table].filter((r) => matches(r, st.filters));
        for (const r of rows) Object.assign(r, st.payload);
      } else if (st.op === "delete") {
        rows = []; W[table] = W[table].filter((r) => !matches(r, st.filters));
      } else {
        rows = W[table].filter((r) => matches(r, st.filters) && visible(table, r));
      }
      if (st.head) return { data: null, count: rows.length, error: null };
      if (st.single === "single") return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
      if (st.single === "maybe") return { data: rows[0] ?? null, error: null };
      return { data: st.op === "select" || st.returning ? rows : null, error: null };
    };
    const b = new Proxy({}, {
      get(_t, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve().then(exec).then(res, rej);
        return (...args) => {
          if (["eq", "in", "neq"].includes(prop)) st.filters.push([prop, args[0], args[1]]);
          if (prop === "select") { if (st.op !== "select") st.returning = true; if (args[1]?.head) st.head = true; }
          if (["insert", "upsert", "update"].includes(prop)) { st.op = prop; st.payload = args[0]; st.conflict = args[1]?.onConflict ?? null; }
          if (prop === "delete") st.op = "delete";
          if (prop === "single") st.single = "single";
          if (prop === "maybeSingle") st.single = "maybe";
          return b;
        };
      },
    });
    return b;
  };
  return {
    from,
    rpc: async (name, params) => {
      rpc8.push({ client: who, name, params, callerUid });
      log8.push({ client: who, table: `rpc:${name}` });
      if (name === "is_teacher_of_class") return { data: params.user_id === U.teacher, error: null };
      if (name === "can_view_student_in_class") return { data: params._user_id === U.teacher && params._student_id === IDS.student, error: null };
      if (name === "video_staff_for_class") return { data: STAFF_IDS.includes(callerUid), error: null };
      if (name === "can_view_student") return { data: OWNERS.includes(params.user_id) && params.student_id === IDS.student, error: null };
      if (name === "video_analysis_claim") return W.claim === "error" ? { data: null, error: { message: "boom" } } : { data: W.claim, error: null };
      return { data: null, error: null };
    },
    storage: { from: () => ({
      download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: "https://example.supabase.co/storage/v1/object/sign/x" }, error: null }),
      list: async () => ({ data: [], error: null }), remove: async () => ({ data: [], error: null }),
    }) },
    functions: { invoke: async () => ({ data: { sessionCount: 4, totalAmount: 800000, baseAmount: 800000, sessionDetails: [], breakdown: { classes: [] }, discounts: [], payments: { monthPayments: 0 }, carry: null, siblingState: { status: "resolved" } }, error: null }) },
    auth: { getUser: async (token) => {
      const uid = Object.values(U).find((u) => tokenOf(u) === token);
      return uid ? { data: { user: { id: uid, email: `${uid}@example.test` } }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } };
    } },
  };
}
const MODEL_JSON = JSON.stringify({
  summary: "s", strengths: [], struggles: [], cefr_estimate: null, feedback: "Well done!", focus_points: [], celebrated: null, entries: [], words: [],
  criteria: [{ key: "task", label: "Did the task", description: "d", weight: 2 }], target_vocabulary: [], target_grammar: [], kid_summary: "Your teacher is looking for a story.",
  criteria_scores: [], feedback_student: "Good", feedback_parent_vi: "Tốt", gaps: [], confidence: 0.5, teacher_attention: "",
});
globalThis.__claude = () => { vendor8.push("api.anthropic.com"); return { content: [{ type: "text", text: MODEL_JSON }], stop_reason: "end_turn", model: "claude-test", usage: {} }; };
let vendorDown = false;
async function fetch8(url, init = {}) {
  const u = new URL(String(url));
  if (u.host === "example.supabase.co") {
    fetched8.push(u.pathname);
    if (u.pathname.startsWith("/storage/v1/object/")) return new Response(new Uint8Array(1000), { status: 200, headers: { "content-length": "1000", "content-type": "audio/wav" } });
    if (u.pathname.endsWith("/rpc/audit_eval_reserve")) return new Response(JSON.stringify("call-1"), { status: 200, headers: { "content-type": "application/json" } });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }
  vendor8.push(u.host);
  if (vendorDown) return new Response("down", { status: 500 });
  if (u.host === "oauth2.googleapis.com") return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
  if (u.host === "vision.googleapis.com") return new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text: "cat - a small animal - The cat sat." } }] }), { status: 200 });
  if (u.host === "api.anthropic.com") {
    const sse = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Dear family" } })}\n\n`;
    return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
  }
  if (u.pathname.includes("/audio/transcriptions")) return new Response(JSON.stringify({ text: "I go to the park", segments: [] }), { status: 200 });
  return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: MODEL_JSON } }] }), { status: 200, headers: { "content-type": "application/json" } });
}

async function load8(name, source) {
  const out = await build({
    stdin: { contents: source, resolveDir: resolve(FUNCTIONS, name), sourcefile: "index.ts", loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{
      name: "remote-imports",
      setup(b) {
        b.onResolve({ filter: /^(https?:\/\/|npm:|jsr:)/ }, (args) => ({ path: args.path, namespace: "remote" }));
        b.onLoad({ filter: /.*/, namespace: "remote" }, (args) => ({
          loader: "js",
          contents: args.path.startsWith("npm:@anthropic-ai/sdk")
            ? `export default class Anthropic { constructor() { this.beta = { messages: { create: async () => globalThis.__claude() } }; } }`
            : `export const createClient = (...args) => globalThis.__fakeCreateClient(...args); export default {};`,
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `ai-gate8.${name}.${process.pid}.${seq++}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}
async function call8(handler, name, { token, body, method = "POST", headers: extra = {} } = {}) {
  log8 = []; vendor8 = []; fetched8 = []; rpc8 = []; writes8 = [];
  const headers = { "content-type": "application/json", ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request(`https://example.supabase.co/functions/v1/${name}`, {
      method, headers, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    }));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, retryAfter: res.headers.get("Retry-After"), cors: res.headers.get("Access-Control-Allow-Origin"),
      vendor: vendor8.slice(), fetched: fetched8.slice(), rpcs: rpc8.slice(), writes: writes8.slice(),
      tables: log8.filter((e) => e.table && e.table !== "user_roles").map((e) => e.table) };
  } finally { Object.assign(console, quiet); }
}
const spentNothing8 = (r) => r.vendor.length === 0 && r.tables.length === 0 && r.fetched.length === 0;
const reached = (r) => ![401, 403, 429].includes(r.status) && r.vendor.length > 0;

const EIGHT = {
  "refresh-student-profile":  { roles: STAFF, limit: 60, windowMs: 10 * MIN, serviceLimit: 200, body: { student_id: IDS.student } },
  "generate-work-feedback":   { roles: STAFF, limit: 40, windowMs: 10 * MIN, body: { work_id: IDS.work } },
  "video-rubric":             { roles: STAFF, limit: 20, windowMs: 10 * MIN, body: { homework_id: IDS.hw } },
  "explain-family-tuition":   { roles: ["admin"], limit: 20, windowMs: 10 * MIN, body: { studentId: IDS.student, month: "2026-11" } },
  "audit-eval-proxy":         { roles: ["admin"], limit: 60, windowMs: 10 * MIN, body: { run_id: "R1", vendor: "openai", mode: "gpt-transcribe", object_path: "lessons/L1/p0001.wav", audio_seconds: 10 } },
  "ocr-vocab-scan":           { roles: STAFF, limit: 20, windowMs: 10 * MIN, body: { work_id: IDS.vocabWork, student_id: IDS.student } },
  "chat":                     { roles: ANY, limit: 30, windowMs: 5 * MIN, body: { messages: [{ role: "user", content: "Hello" }] } },
  "analyze-video-submission": { roles: ANY, limit: 30, windowMs: 60 * MIN, body: { video_submission_id: IDS.video } },
};
const rolesSource = (roles) => roles === STAFF ? "roles: STAFF_ROLES" : roles === ANY ? "roles: SIGNED_IN_ROLES" : `roles: ${JSON.stringify(roles)}`;

globalThis.__fakeCreateClient = (_url, key, opts) => fake8(key, opts);
globalThis.fetch = fetch8;

for (const [name, cfg] of Object.entries(EIGHT)) {
  console.log(`=== ${name} (N-5) ===`);
  const src = readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
  // A staff caller, to show the limit on the function as it was.
  const limitToken = tokenOf(cfg.roles.includes("teacher") ? U.teacher : U.admin);

  // ---- before: no per-account limit
  let before = null;
  try { before = await load8(name, execFileSync("git", ["show", `${BASE8}:supabase/functions/${name}/index.ts`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { /* no history */ }
  ok("the function as it was before N-5 could be loaded from git", typeof before === "function");
  if (before) {
    let through = 0;
    for (let i = 0; i < cfg.limit + 1; i++) { W = world(); const r = await call8(before, name, { token: limitToken, body: cfg.body }); if (r.vendor.length > 0) through++; }
    eq(`BEFORE: ${cfg.limit + 1} calls from one account all reached the vendor (no per-account limit)`, through, cfg.limit + 1);
  }

  // ---- after
  const fn = await load8(name, src);
  ok("the function registers a handler", typeof fn === "function");
  W = world();
  const pre = await call8(fn, name, { method: "OPTIONS" });
  ok("the CORS preflight still answers without a token", pre.status === 200 && pre.cors === "*" && spentNothing8(pre), pre);
  for (const [label, token, status] of [
    ["no Authorization header", null, 401], ["the public (anon) key as the bearer", ANON_KEY, 401], ["a token that is not a session", "not-a-jwt", 401],
    ["an empty bearer", " ", 401], ["an account with no role", tokenOf(U.norole), 403], ["an account whose role lookup fails", tokenOf(U.rolesBroken), 403],
    ...(cfg.serviceLimit ? [] : [["the service-role key", SERVICE_KEY, 403]]),
  ]) {
    W = world();
    const r = await call8(fn, name, { token, body: cfg.body });
    ok(`${label}: ${status}, nothing spent, nothing read`, r.status === status && spentNothing8(r) && r.cors === "*", r);
  }
  {
    W = world();
    const r = await call8(fn, name, { token: tokenOf(U.norole), body: { ...cfg.body, user_id: U.admin, role: "admin" }, headers: { "x-user-id": U.admin, "x-role": "admin" } });
    ok("a role-less account naming an admin in the body and headers is still refused", r.status === 403 && spentNothing8(r), r);
  }
  for (const role of ["student", "family", "teacher", "admin"]) {
    W = world();
    const r = await call8(fn, name, { token: tokenOf(U[role]), body: cfg.body });
    if (cfg.roles.includes(role)) ok(`${role}: let through, and the vendor is called (${r.vendor[0] ?? "-"}) - status ${r.status}`, reached(r), r);
    else ok(`${role}: 403, nothing spent, nothing read`, r.status === 403 && spentNothing8(r), r);
  }

  // ---- the limit, on a fresh instance
  const fresh = await load8(name, src);
  let passed = 0, firstRefusal = null;
  for (let i = 0; i < cfg.limit + 3; i++) {
    W = world();
    const r = await call8(fresh, name, { token: limitToken, body: cfg.body });
    if (r.status === 429) { firstRefusal ??= { at: i + 1, r }; } else if (r.vendor.length > 0) passed++;
  }
  eq(`exactly ${cfg.limit} calls per account get through, then 429`, [passed, firstRefusal?.at], [cfg.limit, cfg.limit + 1]);
  ok("the 429 says when to retry and spends and reads nothing", !!firstRefusal && Number(firstRefusal.r.retryAfter) > 0 && Number(firstRefusal.r.retryAfter) <= cfg.windowMs / 1000 && spentNothing8(firstRefusal.r), firstRefusal?.r);
  {
    W = world();
    const otherToken = tokenOf(cfg.roles.includes("teacher") ? U.admin : U.adminAndStudent);
    const r = await call8(fresh, name, { token: otherToken, body: cfg.body });
    ok("another account is not held back by it", reached(r), r);
    const spoofed = await call8(fresh, name, { token: limitToken, body: cfg.body, headers: { "x-forwarded-for": "203.0.113.9" } });
    ok("the limited account cannot escape by changing its IP headers", spoofed.status === 429 && spentNothing8(spoofed), spoofed);
  }

  // ---- the source
  {
    const iOpt = src.indexOf('req.method === "OPTIONS"'), iGate = src.indexOf("await requireSpender(req, corsHeaders, GATE)");
    const iBody = Math.min(...["req.json()", "req.text()"].map((s) => src.indexOf(s, iOpt)).filter((i) => i >= 0), Infinity);
    const between = iOpt >= 0 && iGate > iOpt ? src.slice(iOpt, iGate) : "await";
    ok("the gate is the first thing after the preflight: nothing is awaited, and the body is not read, before it",
      iGate > iOpt && !/\bawait\b/.test(between) && iGate < iBody
      && /const spender = await requireSpender\(req, corsHeaders, GATE\);\s*if \(spender instanceof Response\) return spender;/.test(src));
    const gateLine = /const GATE: SpendGate = \{([^}]*)\}/.exec(src)?.[1] ?? "";
    ok(`its settings are the ones tested here (${cfg.limit} per ${cfg.windowMs / MIN} min, ${rolesSource(cfg.roles)}${cfg.serviceLimit ? `, service key ${cfg.serviceLimit}` : ""})`,
      gateLine.includes(`name: "${name}"`) && gateLine.includes(`limit: ${cfg.limit},`) && gateLine.includes(`windowMs: ${cfg.windowMs / MIN} * 60_000`)
      && gateLine.includes(rolesSource(cfg.roles)) && (cfg.serviceLimit ? gateLine.includes(`serviceLimit: ${cfg.serviceLimit}`) : !gateLine.includes("serviceLimit")), gateLine);
    ok("it no longer runs a role check of its own in place of the gate", !/await requireRole\(|await authenticateUser\(/.test(src));
  }
}

console.log("=== refresh-student-profile: the internal refresh on the service key ===");
{
  const fn = await load8("refresh-student-profile", readFileSync(resolve(FUNCTIONS, "refresh-student-profile", "index.ts"), "utf8"));
  let passed = 0, refusedAt = null;
  for (let i = 0; i < 203; i++) {
    W = world();
    const r = await call8(fn, "refresh-student-profile", { token: SERVICE_KEY, body: { student_id: IDS.student } });
    if (r.status === 429) refusedAt ??= i + 1; else if (r.vendor.length > 0) passed++;
  }
  eq("ocr-vocab-scan's refresh (service key) is let through, 200 per window, then 429", [passed, refusedAt], [200, 201]);
  W = world();
  const t = await call8(fn, "refresh-student-profile", { token: tokenOf(U.teacher), body: { student_id: IDS.student } });
  ok("and a teacher is not held back by the service key's count", reached(t), t);
  const other = readdirSync(FUNCTIONS).filter((d) => d !== "refresh-student-profile" && !d.startsWith("_")).filter((d) => {
    try { return /serviceLimit\s*:/.test(readFileSync(resolve(FUNCTIONS, d, "index.ts"), "utf8")); } catch { return false; }
  });
  eq("no other function lets the service key spend", other, []);
}

console.log("=== generate-work-feedback: a teacher's decision stands (N-6) ===");
{
  const fn = await load8("generate-work-feedback", readFileSync(resolve(FUNCTIONS, "generate-work-feedback", "index.ts"), "utf8"));
  for (const status of ["approved", "rejected", "processing", "failed"]) {
    W = world(); W.student_work[0].status = status;
    const r = await call8(fn, "generate-work-feedback", { token: tokenOf(U.teacher), body: { work_id: IDS.work } });
    ok(`work that is ${status}: 409, no vendor call, nothing written`, r.status === 409 && r.vendor.length === 0 && r.writes.length === 0, r);
  }
  W = world();
  const r = await call8(fn, "generate-work-feedback", { token: tokenOf(U.teacher), body: { work_id: IDS.work } });
  eq("work waiting on the teacher: the draft is written to the staff-only table, nothing to student_work",
    r.writes.map((w) => `${w.table}:${w.op}`), ["student_work_ai_drafts:upsert"]);
  eq("  keyed by the work, with the model's text", [W.student_work_ai_drafts?.[0]?.work_id, W.student_work_ai_drafts?.[0]?.feedback], [IDS.work, "Well done!"]);
  W = world();
  const o = await call8(fn, "generate-work-feedback", { token: tokenOf(U.teacher), body: { work_id: IDS.work, student_id: "50000000-0000-4000-8000-0000000000ff" } });
  ok("naming a child the teacher does not teach (whose profile would go into the prompt): 403, no vendor call", o.status === 403 && o.vendor.length === 0, o);
}

console.log("=== analyze-video-submission: whose video, and how often ===");
{
  const src = readFileSync(resolve(FUNCTIONS, "analyze-video-submission", "index.ts"), "utf8");
  const fn = await load8("analyze-video-submission", src);
  W = world();
  const fam = await call8(fn, "analyze-video-submission", { token: tokenOf(U.family), body: { video_submission_id: IDS.video } });
  eq("the child's family: the claim is asked as a family", fam.rpcs.filter((x) => x.name === "video_analysis_claim").map((x) => [x.client, x.params.p_by_staff]), [["service", false]]);
  ok("  and the draft is made", fam.status === 200 && fam.json?.queued === true && fam.vendor.length > 0, fam);
  W = world();
  const tea = await call8(fn, "analyze-video-submission", { token: tokenOf(U.teacher), body: { video_submission_id: IDS.video } });
  eq("the class's teacher: asked as staff", tea.rpcs.filter((x) => x.name === "video_analysis_claim").map((x) => x.params.p_by_staff), [true]);
  W = world();
  const stranger = await call8(fn, "analyze-video-submission", { token: tokenOf(U.other), body: { video_submission_id: IDS.video } });
  ok("another child's account (the row is not theirs): 404, no claim, no vendor", stranger.status === 404 && stranger.vendor.length === 0 && !stranger.rpcs.some((x) => x.name === "video_analysis_claim"), stranger);
  W = world();
  const bad = await call8(fn, "analyze-video-submission", { token: tokenOf(U.family), body: { video_submission_id: "x' or 1=1" } });
  ok("an id that is not a uuid: 400, nothing read", bad.status === 400 && bad.vendor.length === 0 && bad.tables.length === 0, bad);
  for (const [claim, status] of [["with_teacher", 409], ["approved", 409], ["busy", 409], ["take_limit", 429], ["total_limit", 429], ["not_found", 404], ["error", 503]]) {
    W = world({ claim });
    // A fresh instance each: a refused claim still counts toward the
    // family's hourly six, which is tested below.
    const each = await load8("analyze-video-submission", src);
    const r = await call8(each, "analyze-video-submission", { token: tokenOf(U.family), body: { video_submission_id: IDS.video } });
    ok(`the claim answers ${claim}: ${status}, no vendor call, the submission untouched`, r.status === status && r.vendor.length === 0 && r.writes.length === 0, r);
  }
  ok("only the claim moves the status to processing (no direct status write before it)",
    !/update\(\{\s*status:\s*"processing"/.test(src) && src.indexOf('rpc("video_analysis_claim"') < src.indexOf("const job = run(sb, id)"));

  const fresh = await load8("analyze-video-submission", src);
  let passed = 0, refusedAt = null;
  for (let i = 0; i < 8; i++) {
    W = world();
    const r = await call8(fresh, "analyze-video-submission", { token: tokenOf(U.family), body: { video_submission_id: IDS.video } });
    if (r.status === 429) refusedAt ??= i + 1; else if (r.vendor.length > 0) passed++;
  }
  eq("a family account: 6 an hour, then 429 (a teacher gets 30)", [passed, refusedAt], [6, 7]);
  W = world();
  const t = await call8(fresh, "analyze-video-submission", { token: tokenOf(U.teacher), body: { video_submission_id: IDS.video } });
  ok("  the teacher is not held back by the family's count", reached(t), t);
}

console.log("=== the eight: callers and the gateway setting ===");
{
  const walk = (dir) => readdirSync(dir).flatMap((e) => { const f = join(dir, e); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(e) ? [f] : []; });
  const files = walk(resolve(repo, "src")).map((f) => [f, readFileSync(f, "utf8")]);
  const toml = readFileSync(resolve(repo, "supabase", "config.toml"), "utf8").replace(/\r/g, "");
  for (const name of Object.keys(EIGHT)) {
    const entry = new RegExp(`\\[functions\\.${name}\\]\\nverify_jwt = (true|false)`).exec(toml);
    ok(`${name}: verify_jwt is on (${entry ? "set" : "the default"})`, !entry || entry[1] === "true");
    const users = files.filter(([, t]) => t.includes(`"${name}"`) || t.includes(`/functions/v1/${name}`));
    const viaInvokeOrSession = users.every(([, t]) => new RegExp(`supabase\\s*\\.functions\\s*\\.invoke\\(\\s*["']${name}["']`).test(t)
      || (t.includes(`/functions/v1/${name}`) && /Authorization: `Bearer \$\{s\.session\?\.access_token/.test(t)));
    ok(`${name}: ${users.length} caller file(s) in src/, each sending the signed-in session's token`, viaInvokeOrSession);
  }
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
