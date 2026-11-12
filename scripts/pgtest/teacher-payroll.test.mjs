// calculate-payroll as the teacher screens call it (T5).
//
//   node scripts/pgtest/teacher-payroll.test.mjs
//
// The REAL function is bundled with esbuild (remote imports stubbed, its own
// ../_lib imports real, zod real) and Deno.serve captured. The Supabase
// client is an in-memory table store that records every read and write, so
// a refused call can be shown to have read no lesson and written nothing.
//
//   1. WHO GETS WHAT. A teacher gets their own row only, derived from the
//      JWT; a teacherId naming somebody else is ignored. A TA, a parent, a
//      pupil and no sign-in get nothing. An admin may ask for anyone, and
//      asking for one person now returns that person only.
//   2. NOTHING ELSE MOVED. Every figure the function returned at BASE is
//      returned unchanged; the only differences are the new fields
//      (lostIncome, per-session payRateType / rateVnd) and the narrower
//      answer to an admin naming one person.
//   3. BEFORE / AFTER. The browser pricing the screens did at BASE is
//      reproduced here, line for line, over the same fixture, and set beside
//      what the function (and so the screens now) report. Printed as a
//      table; every row that should disagree is asserted to.
import { build } from "esbuild";
import { z } from "zod";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FN_DIR = resolve(repo, "supabase", "functions", "calculate-payroll");
const BASE = "6465f08"; // the function before T5
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? "PASS" : "FAIL"} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ""}`);
  value ? pass++ : fail++;
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });
async function section(name, fn) {
  console.log(`=== ${name} ===`);
  try { await fn(); }
  catch (e) { ok(`section "${name}" ran to the end without an unexpected error`, false, { message: e?.message, stack: e?.stack?.split("\n").slice(0, 4) }); }
}

// ------------------------------------------------------------- the people
const SERVICE_KEY = "test-service-role-key";
const U = {
  admin: "aaaaaaaa-0000-4000-8000-000000000001",
  teacherA: "aaaaaaaa-0000-4000-8000-000000000002",
  teacherB: "aaaaaaaa-0000-4000-8000-000000000003",
  ta: "aaaaaaaa-0000-4000-8000-000000000004",       // holds 'teacher', has only a TA row
  parent: "aaaaaaaa-0000-4000-8000-000000000005",
  student: "aaaaaaaa-0000-4000-8000-000000000006",
  noRow: "aaaaaaaa-0000-4000-8000-000000000007",    // 'teacher' role, no staff row at all
};
const tokenOf = (u) => `jwt-${u}`;
const T_A = "10000000-0000-4000-8000-00000000000a";
const T_B = "10000000-0000-4000-8000-00000000000b";
const T_ARCH = "10000000-0000-4000-8000-0000000000ac"; // archived, no lessons in Oct
const TA_1 = "20000000-0000-4000-8000-000000000001";
const cls = (name) => ({ name, default_session_length_minutes: null, schedule_template: null });
const C1 = "c0000000-0000-4000-8000-000000000001", C2 = "c0000000-0000-4000-8000-000000000002", C3 = "c0000000-0000-4000-8000-000000000003";
const sess = (id, teacher_id, date, start, end, status, class_id, extra = {}) => ({
  id, teacher_id, date, start_time: start, end_time: end, status, class_id,
  classes: cls({ [C1]: "Starters 1", [C2]: "Movers 2", [C3]: "Flyers" }[class_id]),
  rate_override_vnd: null, ...extra,
});

function seed() {
  return {
    user_roles: [
      { user_id: U.admin, role: "admin" },
      { user_id: U.teacherA, role: "teacher" },
      { user_id: U.teacherB, role: "teacher" },
      { user_id: U.ta, role: "teacher" },
      { user_id: U.parent, role: "family" },
      { user_id: U.student, role: "student" },
      { user_id: U.noRow, role: "teacher" },
    ],
    // The rate columns hold TODAY's rate. T_A was raised from 200,000 to
    // 300,000 an hour on 15 Oct.
    teachers: [
      { id: T_A, full_name: "An Nguyen", user_id: U.teacherA, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 300000, per_session_rate_vnd: 0 },
      { id: T_B, full_name: "Binh Tran", user_id: U.teacherB, is_active: true, pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 250000 },
      { id: T_ARCH, full_name: "Zed Archived", user_id: null, is_active: false, pay_rate_type: "hourly", hourly_rate_vnd: 150000, per_session_rate_vnd: 0 },
    ],
    teaching_assistants: [
      { id: TA_1, full_name: "Chi Le", user_id: U.ta, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 100000, per_session_rate_vnd: 0 },
    ],
    staff_pay_rates: [
      { teacher_id: T_A, assistant_id: null, effective_from: "2026-01-01", pay_rate_type: "hourly", hourly_rate_vnd: 200000, per_session_rate_vnd: 0 },
      { teacher_id: T_A, assistant_id: null, effective_from: "2026-10-15", pay_rate_type: "hourly", hourly_rate_vnd: 300000, per_session_rate_vnd: 0 },
      { teacher_id: T_B, assistant_id: null, effective_from: "2026-01-01", pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 250000 },
      { teacher_id: null, assistant_id: TA_1, effective_from: "2026-01-01", pay_rate_type: "hourly", hourly_rate_vnd: 100000, per_session_rate_vnd: 0 },
    ],
    sessions: [
      // October 2026, open.
      sess("a1000000-0000-4000-8000-000000000001", T_A, "2026-10-06", "18:00:00", "19:30:00", "Held", C1),
      sess("a1000000-0000-4000-8000-000000000002", T_A, "2026-10-06", "19:45:00", "21:15:00", "Held", C2),
      sess("a1000000-0000-4000-8000-000000000003", T_A, "2026-10-20", "18:00:00", "20:00:00", "Held", C1, { rate_override_vnd: 400000 }),
      sess("a1000000-0000-4000-8000-000000000004", T_A, "2026-10-13", "18:00:00", "19:30:00", "Canceled", C1),
      sess("a1000000-0000-4000-8000-000000000005", T_A, "2026-10-29", "18:00:00", "19:30:00", "Scheduled", C1),
      sess("b1000000-0000-4000-8000-000000000001", T_B, "2026-10-07", "09:00:00", "10:30:00", "Held", C3),
      sess("b1000000-0000-4000-8000-000000000002", T_B, "2026-10-14", "09:00:00", "10:30:00", "Canceled", C3),
      // September 2026, CLOSED with one lesson; a second was marked Held after.
      sess("a0900000-0000-4000-8000-000000000001", T_A, "2026-09-08", "18:00:00", "19:30:00", "Held", C1),
      sess("a0900000-0000-4000-8000-000000000002", T_A, "2026-09-15", "18:00:00", "19:30:00", "Held", C1),
      // November 2026, open: a lesson marked Held although dated after today.
      sess("a1100000-0000-4000-8000-000000000001", T_A, "2026-11-10", "18:00:00", "19:30:00", "Held", C1),
      sess("a1100000-0000-4000-8000-000000000002", T_A, "2026-11-30", "18:00:00", "19:30:00", "Held", C1),
    ],
    session_participants: [
      { session_id: "a1000000-0000-4000-8000-000000000001", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: true },
      { session_id: "a1000000-0000-4000-8000-000000000002", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: false },
      { session_id: "a1000000-0000-4000-8000-000000000003", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: true },
    ],
    class_schedule_versions: [],
    payroll_periods: [{ month: "2026-09", status: "locked", locked_at: "2026-10-02T03:00:00Z" }],
    payroll_lines: [
      { month: "2026-09", teacher_id: T_A, assistant_id: null, pay_rate_type: "hourly", hourly_rate_vnd: 200000, per_session_rate_vnd: 0, sessions_count: 1, total_minutes: 90, total_amount_vnd: 300000 },
    ],
    payroll_adjustments: [],
    payroll_summaries: [],
  };
}

// ------------------------------------------------ the Supabase stand-in
let db = seed();
let log = [];
// Make the read of cancelled lessons (Lost Income) fail: null, "error"
// (PostgREST answers with an error) or "throw" (the request itself throws).
let failCancelled = null;
const clone = (v) => JSON.parse(JSON.stringify(v));
function fakeClient(key) {
  const who = key === SERVICE_KEY ? "service" : "other";
  const from = (table) => {
    const st = { table, op: "select", filters: [], payload: null, single: null, order: null };
    const match = (r) => st.filters.every(([op, k, v]) => {
      const x = r[k];
      if (op === "eq") return x === v;
      if (op === "neq") return x !== v;
      if (op === "in") return v.includes(x);
      if (op === "gte") return x >= v;
      if (op === "lt") return x < v;
      if (op === "lte") return x <= v;
      return true;
    });
    const exec = () => {
      log.push(clone({ client: who, table, op: st.op, filters: st.filters, single: st.single, payload: st.op === "select" ? undefined : st.payload }));
      if (failCancelled && table === "sessions" && st.op === "select" && st.filters.some(([op, k, v]) => op === "eq" && k === "status" && v === "Canceled")) {
        if (failCancelled === "throw") throw new Error("connection reset while reading cancelled lessons");
        return { data: null, error: { code: "08006", message: "connection reset" } };
      }
      if (st.op === "upsert" || st.op === "insert" || st.op === "update" || st.op === "delete") {
        if (st.op === "upsert") (db[table] ??= []).push(clone(st.payload));
        return { data: null, error: null };
      }
      let rows = (db[table] ?? []).filter(match).map(clone);
      if (st.order) rows.sort((a, b) => String(a[st.order]).localeCompare(String(b[st.order])));
      if (st.single === "single") {
        return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
      }
      if (st.single === "maybe") {
        if (rows.length > 1) return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    };
    const b = {
      select() { return b; },
      upsert(p) { st.op = "upsert"; st.payload = p; return b; },
      insert(p) { st.op = "insert"; st.payload = p; return b; },
      update(p) { st.op = "update"; st.payload = p; return b; },
      delete() { st.op = "delete"; return b; },
      eq(k, v) { st.filters.push(["eq", k, v]); return b; },
      neq(k, v) { st.filters.push(["neq", k, v]); return b; },
      in(k, v) { st.filters.push(["in", k, v]); return b; },
      gte(k, v) { st.filters.push(["gte", k, v]); return b; },
      lt(k, v) { st.filters.push(["lt", k, v]); return b; },
      lte(k, v) { st.filters.push(["lte", k, v]); return b; },
      order(k) { st.order = k; return b; },
      single() { st.single = "single"; return b; },
      maybeSingle() { st.single = "maybe"; return b; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    return b;
  };
  return {
    from,
    rpc: async (name) => { log.push({ client: who, rpc: name }); return { data: null, error: { message: `unexpected rpc ${name}` } }; },
    // close-payroll-month asks calculate-payroll over the service role.
    functions: {
      invoke: async (name, opts = {}) => {
        log.push({ client: who, invoke: name });
        if (name !== "calculate-payroll" || !globalThis.__t5PayrollFn) return { data: null, error: { message: `unexpected invoke ${name}` } };
        const res = await globalThis.__t5PayrollFn(new Request("https://example.supabase.co/functions/v1/calculate-payroll", {
          method: "POST", headers: { "content-type": "application/json", ...(opts.headers ?? {}) }, body: JSON.stringify(opts.body ?? {}),
        }));
        const data = await res.json();
        return res.ok ? { data, error: null } : { data: null, error: { message: data?.error ?? `status ${res.status}` } };
      },
    },
    auth: {
      getUser: async (token) => {
        const uid = Object.values(U).find((u) => tokenOf(u) === token);
        if (!uid) return { data: { user: null }, error: { message: "invalid JWT" } };
        return { data: { user: { id: uid, email: `${uid}@example.test` } }, error: null };
      },
    },
  };
}

// ------------------------------------------------------------- bundling
globalThis.__fakeCreateClient = (_url, key) => fakeClient(key);
globalThis.__t5Zod = z;
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
const quiet = { log: console.log, warn: console.warn, error: console.error };

async function load(source, tag, resolveDir = FN_DIR) {
  const out = await build({
    stdin: { contents: source, resolveDir, sourcefile: "index.ts", loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{
      name: "remote-imports",
      setup(b) {
        b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: "remote" }));
        b.onLoad({ filter: /.*/, namespace: "remote" }, (args) => ({
          contents: args.path.includes("zod")
            ? "export const z = globalThis.__t5Zod;"
            : "export const createClient = (...args) => globalThis.__fakeCreateClient(...args);",
          loader: "js",
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `teacher-payroll.${tag}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}

// The optional argument points at another copy of index.ts (mutation runs).
const target = process.argv[2] ? resolve(process.argv[2]) : resolve(FN_DIR, "index.ts");
const fn = await load(readFileSync(target, "utf8"), "now");
ok("the function registered a handler", typeof fn === "function");

// The function at BASE, bundled against BASE's own _lib modules.
let baseFn = null;
try {
  const files = ["calculate-payroll/index.ts", "_lib/pay-rate.ts", "_lib/pay-history.ts", "_lib/auth.ts", "_lib/payroll-sessions.ts"];
  const dir = resolve(tmpdir(), `t5-base-${process.pid}`);
  const { mkdirSync, rmSync } = await import("node:fs");
  for (const f of files) {
    const text = execFileSync("git", ["show", `${BASE}:supabase/functions/${f}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    mkdirSync(dirname(resolve(dir, f)), { recursive: true });
    writeFileSync(resolve(dir, f), text);
  }
  baseFn = await load(readFileSync(resolve(dir, "calculate-payroll/index.ts"), "utf8"), "base", resolve(dir, "calculate-payroll"));
  rmSync(dir, { recursive: true, force: true }); // our own scratch copy in the OS temp dir
} catch (e) { console.log("  (base not loadable:", e?.message, ")"); }

async function call(handler, token, body) {
  db = seed(); log = [];
  const headers = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request("https://example.supabase.co/functions/v1/calculate-payroll", { method: "POST", headers, body: JSON.stringify(body) }));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, log: log.slice() };
  } finally { Object.assign(console, quiet); }
}
const ids = (r) => (r.json?.payrollData ?? []).map((x) => x.teacherId);
const sessionReads = (r) => r.log.filter((e) => e.table === "sessions");
const writes = (r) => r.log.filter((e) => e.op !== "select");
const rowOf = (r, id) => (r.json?.payrollData ?? []).find((x) => x.teacherId === id);

// ===================================================================== 1
await section("no sign-in, families, pupils, assistants: nothing", async () => {
  const none = await call(fn, null, { month: "2026-10" });
  ok("no Authorization -> 401", none.status === 401, none.status);
  ok("no Authorization: no lesson read, nothing written", sessionReads(none).length === 0 && writes(none).length === 0);
  const forged = await call(fn, "not-a-token", { month: "2026-10" });
  ok("a forged token -> 401", forged.status === 401);
  for (const who of ["parent", "student"]) {
    const r = await call(fn, tokenOf(U[who]), { month: "2026-10", teacherId: T_A });
    ok(`${who} -> 403`, r.status === 403, r.status);
    ok(`${who}: no lesson read, nothing written, no payrollData`, sessionReads(r).length === 0 && writes(r).length === 0 && !r.json?.payrollData);
    ok(`${who}: no teacher's id or name in the answer`, !r.text.includes(T_A) && !r.text.includes("An Nguyen"));
  }
  for (const who of ["ta", "noRow"]) {
    const r = await call(fn, tokenOf(U[who]), { month: "2026-10", teacherId: T_A });
    ok(`${who} (holds 'teacher', no teachers row) asking for T_A -> 403`, r.status === 403, r.status);
    ok(`${who}: no lesson read, nothing written`, sessionReads(r).length === 0 && writes(r).length === 0);
    ok(`${who}: nothing of T_A in the answer`, !r.text.includes(T_A) && !r.text.includes("An Nguyen"));
    const own = await call(fn, tokenOf(U[who]), { month: "2026-10", teacherId: TA_1 });
    ok(`${who} naming the TA id -> 403 too (TAs read no pay through this function)`, own.status === 403);
  }
});

await section("a teacher gets their own row, decided by the JWT", async () => {
  const a = await call(fn, tokenOf(U.teacherA), { month: "2026-10" });
  ok("teacher A -> 200", a.status === 200, a.status);
  eq("exactly one row, A's", ids(a), [T_A]);
  const spoof = await call(fn, tokenOf(U.teacherA), { month: "2026-10", teacherId: T_B });
  ok("teacher A naming teacher B -> still 200 with A's own row only", spoof.status === 200);
  eq("  rows", ids(spoof), [T_A]);
  ok("  nothing of B in the answer (id, name, lesson ids)", !spoof.text.includes(T_B) && !spoof.text.includes("Binh") && !spoof.text.includes("b1000000"));
  ok("  no lesson of B was even read", sessionReads(spoof).every((e) => e.filters.some(([op, k, v]) => op === "eq" && k === "teacher_id" && v === T_A)), sessionReads(spoof).map((e) => e.filters));
  ok("  no assistant was read", !spoof.log.some((e) => e.table === "teaching_assistants" || e.table === "session_participants"));
  eq("  totals only A's", spoof.json.grandTotalActual, rowOf(a, T_A).totalAmountActual);
  const spoofTa = await call(fn, tokenOf(U.teacherA), { month: "2026-10", teacherId: TA_1 });
  eq("teacher A naming a TA -> A's own row only", ids(spoofTa), [T_A]);
  const b = await call(fn, tokenOf(U.teacherB), { month: "2026-10", teacherId: T_A });
  eq("teacher B naming A -> B's own row only", ids(b), [T_B]);
  ok("  nothing of A in B's answer", !b.text.includes(T_A) && !b.text.includes("An Nguyen") && !b.text.includes("a1000000"));
  const bad = await call(fn, tokenOf(U.teacherA), { month: "2026-10", teacherId: "not-a-uuid" });
  ok("a malformed teacherId -> 400, before anything is read", bad.status === 400 && sessionReads(bad).length === 0);
});

await section("an admin may ask for anyone", async () => {
  const all = await call(fn, tokenOf(U.admin), { month: "2026-10" });
  eq("admin, no teacherId: every teacher with lessons, then the TA (archived with none dropped)", ids(all), [T_A, T_B, TA_1]);
  const one = await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: T_B });
  eq("admin naming B: B only (no assistants appended)", ids(one), [T_B]);
  const ta = await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: TA_1 });
  eq("admin naming the TA: the TA only", ids(ta), [TA_1]);
  const arch = await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: T_ARCH });
  eq("admin naming an archived teacher with no lessons: nobody (not the first TA)", ids(arch), []);
  const svc = await call(fn, SERVICE_KEY, { month: "2026-10" });
  eq("service role (close-payroll-month, schedule-sessions): everyone, as before", ids(svc), [T_A, T_B, TA_1]);
});

// ===================================================================== 2
const NEW_FIELDS = new Set(["lostIncome", "payRateType", "rateVnd"]);
const stripNew = (v) => JSON.parse(JSON.stringify(v), function (k, x) {
  // payRateType is new only inside per-session detail; the row has had one.
  if (k === "lostIncome") return undefined;
  if ((k === "payRateType" || k === "rateVnd") && this && "amount" in this && "minutes" in this) return undefined;
  return x;
});
await section(`nothing else moved since ${BASE}`, async () => {
  if (!baseFn) { ok(`base ${BASE} available from git`, false); return; }
  const cases = [
    ["admin, October (open)", tokenOf(U.admin), { month: "2026-10" }],
    ["admin, September (closed)", tokenOf(U.admin), { month: "2026-09" }],
    ["admin, November", tokenOf(U.admin), { month: "2026-11" }],
    ["teacher A, October", tokenOf(U.teacherA), { month: "2026-10" }],
    ["teacher A, September (closed)", tokenOf(U.teacherA), { month: "2026-09" }],
    ["teacher B naming A", tokenOf(U.teacherB), { month: "2026-10", teacherId: T_A }],
    ["service role", SERVICE_KEY, { month: "2026-10" }],
    ["TA", tokenOf(U.ta), { month: "2026-10" }],
    ["parent", tokenOf(U.parent), { month: "2026-10" }],
  ];
  for (const [label, token, body] of cases) {
    const now = await call(fn, token, body);
    const before = await call(baseFn, token, body);
    ok(`${label}: same status and same figures as ${BASE}, apart from the new fields`,
      now.status === before.status && JSON.stringify(stripNew(now.json)) === JSON.stringify(before.json),
      { now: stripNew(now.json), before: before.json });
    const wNow = writes(now).map((e) => [e.table, e.op]);
    const wBefore = writes(before).map((e) => [e.table, e.op]);
    eq(`${label}: same writes`, wNow, wBefore);
  }
  // The one intended difference.
  const now = await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: T_A });
  const before = await call(baseFn, tokenOf(U.admin), { month: "2026-10", teacherId: T_A });
  eq(`admin naming A: at ${BASE} every TA came after A`, ids(before), [T_A, TA_1]);
  eq("  now A only", ids(now), [T_A]);
  ok("  A's own row unchanged apart from the new fields",
    JSON.stringify(stripNew(rowOf(now, T_A))) === JSON.stringify(rowOf(before, T_A)));
  const archBefore = await call(baseFn, tokenOf(U.admin), { month: "2026-10", teacherId: T_ARCH });
  eq(`admin naming the archived teacher: at ${BASE} payrollData[0] was the TA`, ids(archBefore), [TA_1]);
});

// ===================================================================== new fields
await section("the new fields", async () => {
  const a = rowOf(await call(fn, tokenOf(U.teacherA), { month: "2026-10" }), T_A);
  eq("each lesson carries the rate it was priced at (200,000 before 15 Oct, 300,000 after)",
    a.sessionDetailsProjected.map((s) => [s.date, s.payRateType, s.rateVnd, s.amount]),
    [["2026-10-06", "hourly", 200000, 300000], ["2026-10-06", "hourly", 200000, 300000], ["2026-10-20", "hourly", 300000, 600000], ["2026-10-29", "hourly", 300000, 450000]]);
  eq("lost income: the 13 Oct cancellation at the 13 Oct rate", a.lostIncome, { sessionsCount: 1, totalMinutes: 90, totalAmount: 300000, quantityLabel: "1.5 h" });
  ok("lost income is in no total", a.totalAmountActual === 1200000 && a.totalAmountProjected === 1650000, [a.totalAmountActual, a.totalAmountProjected]);
  const b = rowOf(await call(fn, tokenOf(U.teacherB), { month: "2026-10" }), T_B);
  eq("a per-session teacher's cancellation costs one fee", b.lostIncome, { sessionsCount: 1, totalMinutes: 90, totalAmount: 250000, quantityLabel: "1 session" });
  const ta = rowOf(await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: TA_1 }), TA_1);
  eq("the TA is paid only for the lessons attended (absent 6 Oct 19:45 not paid)", ta.sessionDetailsActual.map((s) => s.id), ["a1000000-0000-4000-8000-000000000001", "a1000000-0000-4000-8000-000000000003"]);
  eq("  and their lost income is reported (none cancelled)", ta.lostIncome.totalAmount, 0);
});

// ======================================================= Lost Income fails
// Lost Income is a display figure. Its read failing must never fail the
// calculation: close-payroll-month, the finance dashboard and every pay
// screen run through this function.
globalThis.__t5PayrollFn = fn;
const CLOSE_DIR = resolve(repo, "supabase", "functions", "close-payroll-month");
const closeFn = await load(readFileSync(resolve(CLOSE_DIR, "index.ts"), "utf8"), "close", CLOSE_DIR);
const dropLost = (v) => JSON.parse(JSON.stringify(v), (k, x) => (k === "lostIncome" ? undefined : x));
const closeWrites = (r) => r.log.filter((e) => e.op === "upsert" && (e.table === "payroll_lines" || e.table === "expenditures")).map((e) => [e.table, e.payload]);

await section("the cancelled-lessons read fails", async () => {
  failCancelled = null;
  const cases = [
    ["admin, October", tokenOf(U.admin), { month: "2026-10" }],
    ["admin, September (closed)", tokenOf(U.admin), { month: "2026-09" }],
    ["teacher A, October", tokenOf(U.teacherA), { month: "2026-10" }],
    ["service role, October", SERVICE_KEY, { month: "2026-10" }],
  ];
  const normal = {};
  for (const [label, token, body] of cases) normal[label] = await call(fn, token, body);
  failCancelled = null;
  const normalClose = await call(closeFn, tokenOf(U.admin), { month: "2026-10", action: "close" });
  ok("close-payroll-month (normal run) closes October", normalClose.status === 200 && normalClose.json?.status === "locked", normalClose.json);
  for (const mode of ["error", "throw"]) {
    for (const [label, token, body] of cases) {
      failCancelled = mode;
      const r = await call(fn, token, body);
      failCancelled = null;
      ok(`${mode}: ${label} -> 200`, r.status === 200, { status: r.status, json: r.json });
      ok(`${mode}: ${label}: every pay figure identical to the run where it was read`,
        JSON.stringify(r.json) === JSON.stringify(dropLost(normal[label].json)), { got: r.json, want: dropLost(normal[label].json) });
      ok(`${mode}: ${label}: lostIncome absent on every row (the screen shows "Figure unavailable")`,
        (r.json?.payrollData ?? []).length > 0 && r.json.payrollData.every((x) => !("lostIncome" in x)));
      eq(`${mode}: ${label}: same writes`, writes(r).map((e) => [e.table, e.op, e.payload]), writes(normal[label]).map((e) => [e.table, e.op, e.payload]));
    }
    failCancelled = mode;
    const close = await call(closeFn, tokenOf(U.admin), { month: "2026-10", action: "close" });
    failCancelled = null;
    ok(`${mode}: close-payroll-month still closes October`, close.status === 200 && close.json?.status === "locked", close.json);
    eq(`${mode}: close-payroll-month books the same lines and costs`, closeWrites(close), closeWrites(normalClose));
    eq(`${mode}: close-payroll-month same total`, close.json?.totalAmountVnd, normalClose.json?.totalAmountVnd);
  }
  ok("the normal close booked lines at all (the comparison is not empty)", closeWrites(normalClose).length >= 2, closeWrites(normalClose));
});

// ===================================================================== 3
// The BASE browser code, reproduced over the same fixture. Line numbers are
// at BASE. Real payRate.ts / sessionDuration.ts, as those screens imported.
async function loadLib(rel) {
  const p = resolve(tmpdir(), `t5lib.${rel.replace(/\W/g, "_")}.${process.pid}.mjs`);
  writeFileSync(p, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  const mod = await import(pathToFileURL(p).href);
  try { unlinkSync(p); } catch { /* ignore */ }
  return mod;
}
const rate = await loadLib("src/lib/payRate.ts");
const dur = await loadLib("src/lib/sessionDuration.ts");
const NOW = "2026-11-13T10:00:00"; // the browser's clock for the old calendar's Held/Scheduled switch

// TeacherPayrollCalendar.tsx:46-47, :55-64, :100-101
function oldCalendarDays(sessions, teacherRow) {
  const out = new Map();
  for (const s of sessions) {
    const display = `${s.date}T${s.start_time}` > NOW ? "Scheduled" : s.status;
    if (display !== "Held") continue;
    out.set(s.date, (out.get(s.date) ?? 0) + rate.sessionPayVnd(teacherRow, dur.durationMinutes(s.start_time, s.end_time) ?? 0));
  }
  return out;
}
// TeacherPayroll.tsx:92-100
const oldLostIncome = (cancelled, teacherRow) =>
  rate.totalPayVnd(teacherRow, cancelled.map((s) => dur.durationMinutes(s.start_time, s.end_time) ?? 0));
// TeacherProfilePayroll.tsx:88-107
function oldProfileAmount(s, teacherRow) {
  const minutes = dur.durationMinutes(s.start_time, s.end_time) ?? 0;
  const override = s.rate_override_vnd;
  if (!override) return rate.sessionPayVnd(teacherRow, minutes);
  return rate.sessionPayVnd({ pay_rate_type: rate.payRateTypeOf(teacherRow), hourly_rate_vnd: override, per_session_rate_vnd: override }, minutes);
}

// The page now: teacherPayrollView over the function's answer.
const sessionsTmp = resolve(tmpdir(), `payrollSessions.t5.${process.pid}.mjs`);
writeFileSync(sessionsTmp, (await transform(readFileSync(resolve(repo, "src/lib/payrollSessions.ts"), "utf8"), { loader: "ts", format: "esm" })).code);
const viewTmp = resolve(tmpdir(), `teacherPayrollView.t5.${process.pid}.mjs`);
writeFileSync(viewTmp, (await transform(readFileSync(resolve(repo, "src/lib/teacherPayrollView.ts"), "utf8")
  .replace('from "./payrollSessions"', `from ${JSON.stringify(pathToFileURL(sessionsTmp).href)}`), { loader: "ts", format: "esm" })).code);
const V = await import(pathToFileURL(viewTmp).href);
const rowsTmp = resolve(tmpdir(), `payrollRows.t5.${process.pid}.mjs`);
const payRateTmp = resolve(tmpdir(), `payRate.t5.${process.pid}.mjs`);
writeFileSync(payRateTmp, (await transform(readFileSync(resolve(repo, "src/lib/payRate.ts"), "utf8"), { loader: "ts", format: "esm" })).code);
writeFileSync(rowsTmp, (await transform(readFileSync(resolve(repo, "src/lib/payrollRows.ts"), "utf8")
  .replace('from "./payRate"', `from ${JSON.stringify(pathToFileURL(payRateTmp).href)}`), { loader: "ts", format: "esm" })).code);
const R = await import(pathToFileURL(rowsTmp).href);

const table = [];
const fmt = (n) => (n === null || n === undefined ? "unavailable" : typeof n === "number" ? n.toLocaleString("en-US") : String(n));
const addRow = (screen, what, before, after, shouldDiffer, why) => {
  table.push({ screen, what, before: fmt(before), after: fmt(after), why });
  const differ = JSON.stringify(before) !== JSON.stringify(after);
  ok(`${screen} / ${what}: ${shouldDiffer ? "old browser figure disagrees with the function" : "agrees"}`, differ === shouldDiffer, { before, after });
};

await section("teacher page when the cancelled-lessons read failed", async () => {
  failCancelled = "error";
  const r = await call(fn, tokenOf(U.teacherA), { month: "2026-10" });
  failCancelled = null;
  const v = V.teacherPayrollView(r.json, T_A);
  eq("Lost Income: figure unavailable", v.lostIncome, null);
  eq("Amount Earned unaffected", v.earned, 1200000);
});

await section("before / after on the fixture", async () => {
  const seedRows = seed();
  const rowA = seedRows.teachers.find((t) => t.id === T_A);
  const rowB = seedRows.teachers.find((t) => t.id === T_B);

  // October, teacher A (raised 200,000 -> 300,000 an hour on 15 Oct).
  const octA = (await call(fn, tokenOf(U.teacherA), { month: "2026-10" })).json;
  const vA = V.teacherPayrollView(octA, T_A);
  const rA = rowOf({ json: octA }, T_A);
  const oldDays = oldCalendarDays(rA.sessionDetailsProjected, rowA);
  addRow("calendar (A, Oct)", "6 Oct, two 90-min lessons before the raise", oldDays.get("2026-10-06"), vA.earnedByDate.get("2026-10-06"), true, "browser used today's 300,000/h; function the 6 Oct rate 200,000/h");
  addRow("calendar (A, Oct)", "20 Oct, 120 min after the raise", oldDays.get("2026-10-20"), vA.earnedByDate.get("2026-10-20"), false, "same rate either way");
  const oldDaySum = [...oldDays.values()].reduce((n, x) => n + x, 0);
  addRow("calendar (A, Oct)", "sum of the days vs Amount Earned 1,200,000", oldDaySum, [...vA.earnedByDate.values()].reduce((n, x) => n + x, 0), true, "old days added up to 1,500,000 beside a headline of 1,200,000");
  ok("  the days now add up to Amount Earned", [...vA.earnedByDate.values()].reduce((n, x) => n + x, 0) === vA.earned);
  const cancelledA = seedRows.sessions.filter((s) => s.teacher_id === T_A && s.status === "Canceled" && s.date.startsWith("2026-10"));
  addRow("Lost Income (A, Oct)", "13 Oct cancellation, 90 min", oldLostIncome(cancelledA, rowA), vA.lostIncome.amount, true, "today's rate vs the 13 Oct rate");
  const cancelledB = seedRows.sessions.filter((s) => s.teacher_id === T_B && s.status === "Canceled");
  const vB = V.teacherPayrollView((await call(fn, tokenOf(U.teacherB), { month: "2026-10" })).json, T_B);
  addRow("Lost Income (B, Oct)", "per-session teacher, one cancellation", oldLostIncome(cancelledB, rowB), vB.lostIncome.amount, false, "no rate change: agrees");
  addRow("CSV (A, Oct)", "Rate column on the 6 Oct lines", rate.effectiveRateVnd(rowA), vA.sessions[0].rateVnd, true, "printed today's rate beside the function's amount");

  // Admin profile, October.
  const prof = (await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: T_A })).json;
  const pv = V.teacherPayrollView(prof, T_A);
  const s20 = seedRows.sessions.find((s) => s.date === "2026-10-20");
  addRow("admin profile (A, Oct)", "20 Oct lesson with rate_override_vnd 400,000", oldProfileAmount(s20, rowA), pv.sessions.find((s) => s.date === "2026-10-20").amount, true, "override applied as the hourly rate; the function ignores it, so nobody is paid that");
  const s6 = seedRows.sessions.find((s) => s.id === "a1000000-0000-4000-8000-000000000001");
  addRow("admin profile (A, Oct)", "6 Oct lesson, Amount column", oldProfileAmount(s6, rowA), pv.sessions.find((s) => s.id === s6.id).amount, true, "today's rate vs the dated one");
  const baseProf = baseFn ? (await call(baseFn, tokenOf(U.admin), { month: "2026-10", teacherId: T_A })).json : null;
  addRow("admin profile (A, Oct)", "rows in the Session Details table", (baseProf?.payrollData?.[0]?.sessions ?? []).length, pv.sessions.length, true, "old table read payrollData[0].sessions, which the function never returns: always empty");
  if (baseFn) {
    const arch = (await call(baseFn, tokenOf(U.admin), { month: "2026-10", teacherId: T_ARCH })).json;
    const archNow = (await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: T_ARCH })).json;
    addRow("admin profile (archived, Oct)", "Current (Actual) shown for an archived teacher with no lessons", arch.payrollData?.[0]?.totalAmountActual ?? 0, V.teacherPayrollView(archNow, T_ARCH).found ? V.teacherPayrollView(archNow, T_ARCH).earned : 0, true, "old [0] was the TA's row (Chi Le's pay under Zed's name)");
  }

  // September, CLOSED at 300,000 for one lesson; 15 Sep marked Held after.
  const sep = (await call(fn, tokenOf(U.teacherA), { month: "2026-09" })).json;
  const vS = V.teacherPayrollView(sep, T_A);
  const rS = rowOf({ json: sep }, T_A);
  const oldSep = oldCalendarDays(rS.sessionDetailsProjected, rowA);
  addRow("calendar (A, Sep CLOSED)", "15 Sep, marked Held after the close", oldSep.get("2026-09-15"), vS.earnedByDate.get("2026-09-15"), true, "old: a recomputed figure at today's rate; now withheld - the month was paid at 300,000");
  const newSepDays = [...vS.earnedByDate.values()];
  addRow("calendar (A, Sep CLOSED)", "what the days add up to, beside Amount Earned (frozen 300,000)", [...oldSep.values()].reduce((n, x) => n + x, 0), newSepDays.includes(null) ? null : newSepDays.reduce((n, x) => n + x, 0), true, "old days 900,000 beside a paid figure of 300,000; now every day is 'figure unavailable' and only the paid total is shown");
  eq("  closed month with a correction since: no recomputed day figure shown", newSepDays, [null, null]);
  addRow("headline (A, Sep CLOSED)", "Amount Earned", rS.totalAmountActual, vS.earned, false, "both the frozen figure");
  addRow("headline (A, Sep CLOSED)", "\"+X from N scheduled\": X", rS.totalAmountProjected - rS.totalAmountActual, vS.stillToCome, true, "old subtracted the frozen actual from the live projection");
  // The admin Payroll screen still sees the live figures (PayrollMonthLock).
  const sepAdmin = (await call(fn, tokenOf(U.admin), { month: "2026-09" })).json;
  const adminRow = R.payrollRows(sepAdmin.payrollData).find((r) => r.staff.id === T_A);
  eq("admin Payroll screen, closed month: still the LIVE 600,000 (PayrollMonthLock sees the 300,000 drift)", adminRow.totalEarned, 600000);

  // November: a Held lesson dated after the browser's clock.
  const nov = (await call(fn, tokenOf(U.teacherA), { month: "2026-11" })).json;
  const vN = V.teacherPayrollView(nov, T_A);
  const oldNov = oldCalendarDays(rowOf({ json: nov }, T_A).sessionDetailsProjected, rowA);
  addRow("calendar (A, Nov)", "30 Nov, status Held but dated after today", oldNov.get("2026-11-30") ?? 0, vN.earnedByDate.get("2026-11-30"), true, "function pays it (Held); old calendar showed it Scheduled and left it out of the day");

  console.log("\n| Screen | Figure | Old browser | Function (now shown) | Why |\n|---|---|---|---|---|");
  for (const t of table) console.log(`| ${t.screen} | ${t.what} | ${t.before} | ${t.after} | ${t.why} |`);
  console.log("");
});

for (const p of [sessionsTmp, viewTmp, rowsTmp, payRateTmp]) { try { unlinkSync(p); } catch { /* ignore */ } }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
