// calculate-payroll as the teaching-assistant screens call it (TA-PAY).
//
//   node scripts/pgtest/ta-payroll.test.mjs
//
// Same harness as teacher-payroll.test.mjs (T5), copied so each suite reads
// on its own: the REAL function bundled with esbuild (remote imports
// stubbed, its own ../_lib real, zod real), Deno.serve captured, and an
// in-memory table store that records every read and write.
//
//   1. WHO GETS WHAT. A TA (holds 'teacher', has a teaching_assistants row
//      and no teachers row) gets their own row only, from the JWT; a
//      teacherId naming anybody else is ignored, and nothing of anybody else
//      is read or returned. No TA row, two TA rows for one login, or a
//      failed lookup: 403 before any lesson is read.
//   2. NOTHING ELSE MOVED since BASE (the branch point): every other caller
//      gets byte-identical answers and writes; the TA's own row is exactly
//      the row an admin got for them at BASE.
//   3. THE SCREENS' FIGURES ARE THE FUNCTION'S. teacherPayrollView over the
//      TA's answer, open and closed month, equals the function's row; the
//      old TAProfileDrawer pricing, reproduced line for line, is set beside it.
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
const BASE = "2e88891a"; // origin/conductor/work when TA-PAY branched: the function before it
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
  ta2: "aaaaaaaa-0000-4000-8000-000000000008",      // a second TA (per-session)
  taDup: "aaaaaaaa-0000-4000-8000-000000000009",    // one login linked to TWO TA rows
  taNoRole: "aaaaaaaa-0000-4000-8000-00000000000a", // a TA row but no 'teacher' role
};
const tokenOf = (u) => `jwt-${u}`;
const T_A = "10000000-0000-4000-8000-00000000000a";
const T_B = "10000000-0000-4000-8000-00000000000b";
const T_ARCH = "10000000-0000-4000-8000-0000000000ac"; // archived, no lessons in Oct
const TA_1 = "20000000-0000-4000-8000-000000000001";
const TA_2 = "20000000-0000-4000-8000-000000000002";
const TA_DUP1 = "20000000-0000-4000-8000-0000000000d1";
const TA_DUP2 = "20000000-0000-4000-8000-0000000000d2";
const TA_NOROLE = "20000000-0000-4000-8000-0000000000e1";
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
      { user_id: U.ta2, role: "teacher" },
      { user_id: U.taDup, role: "teacher" },
      { user_id: U.taNoRole, role: "family" },
    ],
    // The rate columns hold TODAY's rate. T_A was raised from 200,000 to
    // 300,000 an hour on 15 Oct.
    teachers: [
      { id: T_A, full_name: "An Nguyen", user_id: U.teacherA, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 300000, per_session_rate_vnd: 0 },
      { id: T_B, full_name: "Binh Tran", user_id: U.teacherB, is_active: true, pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 250000 },
      { id: T_ARCH, full_name: "Zed Archived", user_id: null, is_active: false, pay_rate_type: "hourly", hourly_rate_vnd: 150000, per_session_rate_vnd: 0 },
    ],
    // TA_1 was raised from 100,000 to 150,000 an hour on 15 Oct; the row
    // holds today's 150,000.
    teaching_assistants: [
      { id: TA_1, full_name: "Chi Le", user_id: U.ta, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 150000, per_session_rate_vnd: 0 },
      { id: TA_2, full_name: "Dung Pham", user_id: U.ta2, is_active: true, pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 80000 },
      { id: TA_DUP1, full_name: "Dup One", user_id: U.taDup, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 90000, per_session_rate_vnd: 0 },
      { id: TA_DUP2, full_name: "Dup Two", user_id: U.taDup, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 90000, per_session_rate_vnd: 0 },
      { id: TA_NOROLE, full_name: "No Role", user_id: U.taNoRole, is_active: true, pay_rate_type: "hourly", hourly_rate_vnd: 90000, per_session_rate_vnd: 0 },
    ],
    staff_pay_rates: [
      { teacher_id: T_A, assistant_id: null, effective_from: "2026-01-01", pay_rate_type: "hourly", hourly_rate_vnd: 200000, per_session_rate_vnd: 0 },
      { teacher_id: T_A, assistant_id: null, effective_from: "2026-10-15", pay_rate_type: "hourly", hourly_rate_vnd: 300000, per_session_rate_vnd: 0 },
      { teacher_id: T_B, assistant_id: null, effective_from: "2026-01-01", pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 250000 },
      { teacher_id: null, assistant_id: TA_1, effective_from: "2026-01-01", pay_rate_type: "hourly", hourly_rate_vnd: 100000, per_session_rate_vnd: 0 },
      { teacher_id: null, assistant_id: TA_1, effective_from: "2026-10-15", pay_rate_type: "hourly", hourly_rate_vnd: 150000, per_session_rate_vnd: 0 },
      { teacher_id: null, assistant_id: TA_2, effective_from: "2026-01-01", pay_rate_type: "per_session", hourly_rate_vnd: 0, per_session_rate_vnd: 80000 },
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
      // TA_1 was rostered on the 13 Oct lesson that was cancelled.
      { session_id: "a1000000-0000-4000-8000-000000000004", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: true },
      // September (closed): TA_1 on both lessons; only the first was booked.
      { session_id: "a0900000-0000-4000-8000-000000000001", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: true },
      { session_id: "a0900000-0000-4000-8000-000000000002", teaching_assistant_id: TA_1, participant_type: "teaching_assistant", attended: true },
      // TA_2 assists teacher B on 7 Oct, and is rostered on B's cancellation.
      { session_id: "b1000000-0000-4000-8000-000000000001", teaching_assistant_id: TA_2, participant_type: "teaching_assistant", attended: true },
      { session_id: "b1000000-0000-4000-8000-000000000002", teaching_assistant_id: TA_2, participant_type: "teaching_assistant", attended: true },
    ],
    class_schedule_versions: [],
    payroll_periods: [{ month: "2026-09", status: "locked", locked_at: "2026-10-02T03:00:00Z" }],
    payroll_lines: [
      { month: "2026-09", teacher_id: T_A, assistant_id: null, pay_rate_type: "hourly", hourly_rate_vnd: 200000, per_session_rate_vnd: 0, sessions_count: 1, total_minutes: 90, total_amount_vnd: 300000 },
      { month: "2026-09", teacher_id: null, assistant_id: TA_1, pay_rate_type: "hourly", hourly_rate_vnd: 100000, per_session_rate_vnd: 0, sessions_count: 1, total_minutes: 90, total_amount_vnd: 150000 },
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
let failTaLookup = null;
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
      // TA-PAY: the TA's own-row lookup (teaching_assistants by user_id) fails.
      if (failTaLookup && table === "teaching_assistants" && st.filters.some(([op, k]) => op === "eq" && k === "user_id")) {
        if (failTaLookup === "throw") throw new Error("connection reset while finding the TA");
        return { data: null, error: { code: "08006", message: "connection reset" } };
      }
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
const lessonIdsIn = (r) => r.log.filter((e) => e.table === "sessions").flatMap((e) => e.filters.filter(([op, k]) => op === "in" && k === "id").flatMap(([, , v]) => v));
const TA1_LESSONS = seed().session_participants.filter((p) => p.teaching_assistant_id === TA_1).map((p) => p.session_id);

// The browser half: teacherPayrollView (what the three TA screens render).
const sessionsTmp = resolve(tmpdir(), `payrollSessions.tapay.${process.pid}.mjs`);
writeFileSync(sessionsTmp, (await transform(readFileSync(resolve(repo, "src/lib/payrollSessions.ts"), "utf8"), { loader: "ts", format: "esm" })).code);
const viewTmp = resolve(tmpdir(), `teacherPayrollView.tapay.${process.pid}.mjs`);
writeFileSync(viewTmp, (await transform(readFileSync(resolve(repo, "src/lib/teacherPayrollView.ts"), "utf8")
  .replace('from "./payrollSessions"', `from ${JSON.stringify(pathToFileURL(sessionsTmp).href)}`), { loader: "ts", format: "esm" })).code);
const V = await import(pathToFileURL(viewTmp).href);

// ===================================================================== 1
await section("a TA gets their own row, decided by the JWT", async () => {
  const own = await call(fn, tokenOf(U.ta), { month: "2026-10" });
  ok("TA -> 200", own.status === 200, own.status);
  eq("exactly one row, their own", ids(own), [TA_1]);
  eq("  marked as an assistant", rowOf(own, TA_1)?.staffType, "teaching_assistant");
  ok("  nothing written (no payroll_summaries for anyone)", writes(own).length === 0, writes(own));
  ok("  no teacher's lessons read (no sessions read by teacher_id)", sessionReads(own).every((e) => !e.filters.some(([, k]) => k === "teacher_id")), sessionReads(own).map((e) => e.filters));
  ok("  the only teachers read is the own-teacher lookup by user_id", own.log.filter((e) => e.table === "teachers").every((e) => JSON.stringify(e.filters) === JSON.stringify([["eq", "user_id", U.ta]])), own.log.filter((e) => e.table === "teachers"));
  ok("  no teacher's name or id in the answer", !own.text.includes(T_A) && !own.text.includes("An Nguyen") && !own.text.includes(T_B) && !own.text.includes("Binh"));

  for (const [label, other] of [["another TA", TA_2], ["a teacher", T_A], ["the archived teacher", T_ARCH]]) {
    const r = await call(fn, tokenOf(U.ta), { month: "2026-10", teacherId: other });
    ok(`TA naming ${label} -> 200 with their OWN row only`, r.status === 200 && JSON.stringify(ids(r)) === JSON.stringify([TA_1]), { status: r.status, ids: ids(r) });
    ok(`  ${label}: same answer as asking for nobody`, r.text === own.text);
  }
  const spoof = await call(fn, tokenOf(U.ta), { month: "2026-10", teacherId: TA_2 });
  ok("  nothing of TA_2 in the answer (id, name, lesson ids)", !spoof.text.includes(TA_2) && !spoof.text.includes("Dung") && !spoof.text.includes("b1000000"));
  ok("  only the TA's own participations were read", spoof.log.filter((e) => e.table === "session_participants").every((e) => e.filters.some(([op, k, v]) => op === "eq" && k === "teaching_assistant_id" && v === TA_1)));
  ok("  only the TA's own row was read from teaching_assistants (by user_id, then by id)",
    JSON.stringify(spoof.log.filter((e) => e.table === "teaching_assistants").map((e) => e.filters)) === JSON.stringify([[["eq", "user_id", U.ta]], [["eq", "id", TA_1]]]),
    spoof.log.filter((e) => e.table === "teaching_assistants").map((e) => e.filters));
  ok("  every lesson read is one of the TA's own", lessonIdsIn(spoof).length > 0 && lessonIdsIn(spoof).every((id) => TA1_LESSONS.includes(id)), lessonIdsIn(spoof));

  const two = await call(fn, tokenOf(U.ta2), { month: "2026-10", teacherId: TA_1 });
  eq("the second TA naming TA_1 -> their own row only", ids(two), [TA_2]);
  ok("  nothing of TA_1 in it", !two.text.includes(TA_1) && !two.text.includes("Chi Le") && !two.text.includes("a1000000"));
  const twoSep = await call(fn, tokenOf(U.ta2), { month: "2026-09" });
  ok("a TA with no lessons that month -> 200 and an empty list (the screen says 'no paid lessons')", twoSep.status === 200 && Array.isArray(twoSep.json?.payrollData) && twoSep.json.payrollData.length === 0, twoSep.json);
  const vEmpty = V.teacherPayrollView(twoSep.json, TA_2);
  eq("  the view: answered, not found", [vEmpty.answered, vEmpty.found], [true, false]);
});

await section("a TA lookup that is not exactly one row fails closed", async () => {
  const dup = await call(fn, tokenOf(U.taDup), { month: "2026-10", teacherId: TA_DUP1 });
  ok("one login linked to two TA rows -> 403", dup.status === 403, dup.status);
  ok("  no lesson read, nothing written, no payrollData", sessionReads(dup).length === 0 && writes(dup).length === 0 && !dup.json?.payrollData);
  const none = await call(fn, tokenOf(U.noRow), { month: "2026-10", teacherId: TA_1 });
  ok("'teacher' role with no staff row naming TA_1 -> 403", none.status === 403, none.status);
  ok("  no lesson read, nothing of TA_1 in the answer", sessionReads(none).length === 0 && !none.text.includes("Chi Le"));
  const noRole = await call(fn, tokenOf(U.taNoRole), { month: "2026-10" });
  ok("a TA row without the 'teacher' role (holds 'family') -> 403 at the role gate", noRole.status === 403, noRole.status);
  ok("  no lesson read", sessionReads(noRole).length === 0);
  for (const mode of ["error", "throw"]) {
    failTaLookup = mode;
    const r = await call(fn, tokenOf(U.ta), { month: "2026-10" });
    failTaLookup = null;
    ok(`the TA lookup ${mode === "error" ? "answers an error" : "throws"} -> refused (${mode === "error" ? 403 : 500})`, r.status === (mode === "error" ? 403 : 500), r.status);
    ok(`  ${mode}: no lesson read, nothing written, no payrollData`, sessionReads(r).length === 0 && writes(r).length === 0 && !r.json?.payrollData);
  }
});

// ===================================================================== 2
await section(`nothing else moved since ${BASE}`, async () => {
  if (!baseFn) { ok(`base ${BASE} available from git`, false); return; }
  const cases = [
    ["admin, October (open)", tokenOf(U.admin), { month: "2026-10" }],
    ["admin, September (closed)", tokenOf(U.admin), { month: "2026-09" }],
    ["admin, November", tokenOf(U.admin), { month: "2026-11" }],
    ["admin naming TA_1", tokenOf(U.admin), { month: "2026-10", teacherId: TA_1 }],
    ["admin naming TA_1, September (closed)", tokenOf(U.admin), { month: "2026-09", teacherId: TA_1 }],
    ["admin naming teacher A", tokenOf(U.admin), { month: "2026-10", teacherId: T_A }],
    ["teacher A, October", tokenOf(U.teacherA), { month: "2026-10" }],
    ["teacher A, September (closed)", tokenOf(U.teacherA), { month: "2026-09" }],
    ["teacher B naming TA_1", tokenOf(U.teacherB), { month: "2026-10", teacherId: TA_1 }],
    ["service role", SERVICE_KEY, { month: "2026-10" }],
    ["service role, September (closed)", SERVICE_KEY, { month: "2026-09" }],
    ["staff login with no staff row", tokenOf(U.noRow), { month: "2026-10" }],
    ["one login, two TA rows", tokenOf(U.taDup), { month: "2026-10" }],
    ["parent", tokenOf(U.parent), { month: "2026-10" }],
    ["student", tokenOf(U.student), { month: "2026-10" }],
  ];
  for (const [label, token, body] of cases) {
    const now = await call(fn, token, body);
    const before = await call(baseFn, token, body);
    ok(`${label}: same status and byte-identical answer`, now.status === before.status && now.text === before.text, { now: now.text.slice(0, 300), before: before.text.slice(0, 300) });
    eq(`${label}: same writes`, writes(now).map((e) => [e.table, e.op, e.payload]), writes(before).map((e) => [e.table, e.op, e.payload]));
  }
  // The one intended difference: the TA's own call.
  for (const month of ["2026-10", "2026-09", "2026-11"]) {
    const before = await call(baseFn, tokenOf(U.ta), { month });
    const now = await call(fn, tokenOf(U.ta), { month });
    ok(`TA, ${month}: at ${BASE} 403`, before.status === 403, before.status);
    const adminBefore = await call(baseFn, tokenOf(U.admin), { month, teacherId: TA_1 });
    ok(`TA, ${month}: now 200, and their rows are byte-identical to what an admin got for them at ${BASE}`,
      now.status === 200 && JSON.stringify(now.json.payrollData) === JSON.stringify(adminBefore.json.payrollData),
      { now: now.json?.payrollData, adminBefore: adminBefore.json?.payrollData });
    eq(`TA, ${month}: locked flag as for the admin`, now.json?.locked, adminBefore.json?.locked);
  }
});

// ===================================================================== 3
const sum = (xs) => xs.reduce((n, x) => n + x, 0);
await section("the TA screens' figures are calculate-payroll's (open month)", async () => {
  const r = await call(fn, tokenOf(U.ta), { month: "2026-10" });
  const row = rowOf(r, TA_1);
  const v = V.teacherPayrollView(r.json, TA_1);
  eq("found, answered, not closed", [v.found, v.answered, v.closed], [true, true, false]);
  eq("Earned = totalAmountActual", v.earned, row.totalAmountActual);
  eq("Projected = totalAmountProjected", v.projectedTotal, row.totalAmountProjected);
  eq("held / projected counts", [v.heldSessions, v.heldSessions + v.scheduledSessions], [row.sessionsCountActual, row.sessionsCountProjected]);
  eq("hours", v.totalHours, row.totalHoursActual);
  eq("every per-lesson amount is the function's", v.sessions.map((s) => [s.id, s.amount, s.rateVnd]), row.sessionDetailsProjected.map((s) => [s.id, s.amount, s.rateVnd]));
  eq("the calendar's days add up to Earned", sum([...v.earnedByDate.values()]), v.earned);
  eq("Lost Income = the function's", v.lostIncome, { amount: row.lostIncome.totalAmount, sessions: row.lostIncome.sessionsCount, quantityLabel: row.lostIncome.quantityLabel });
  eq("rate / basis = the function's headline", [v.rateVnd, v.payBasis], [row.hourlyRate, row.payRateType]);
  // The figures themselves, so a change in pricing shows up here too.
  eq("  Earned 450,000: 6 Oct 90 min at 100,000 + 20 Oct 120 min at 150,000 (absent 6 Oct 19:45 not paid)", v.earned, 450000);
  eq("  per lesson: dated rate each", v.sessions.map((s) => [s.date, s.rateVnd, s.amount]), [["2026-10-06", 100000, 150000], ["2026-10-20", 150000, 300000]]);
  eq("  Lost Income: the 13 Oct cancellation at the 13 Oct rate", v.lostIncome, { amount: 150000, sessions: 1, quantityLabel: "1.5 h" });
  eq("  rate: 150,000 / hour (in force at month end)", [v.rateVnd, v.payBasis], [150000, "hourly"]);
  // The admin's drawer and the TA's own page show the same thing.
  const adm = await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: TA_1 });
  eq("the admin's answer for TA_1 is the TA's own row, field for field", rowOf(adm, TA_1), row);
  const two = V.teacherPayrollView((await call(fn, tokenOf(U.ta2), { month: "2026-10" })).json, TA_2);
  eq("a per-session TA: one 80,000 fee, rate 80,000 / session, cancellation one fee", [two.earned, two.rateVnd, two.payBasis, two.lostIncome], [80000, 80000, "per_session", { amount: 80000, sessions: 1, quantityLabel: "1 session" }]);
});

await section("the TA screens' figures are calculate-payroll's (CLOSED month)", async () => {
  const r = await call(fn, tokenOf(U.ta), { month: "2026-09" });
  const row = rowOf(r, TA_1);
  const v = V.teacherPayrollView(r.json, TA_1);
  const line = seed().payroll_lines.find((l) => l.assistant_id === TA_1);
  eq("closed", v.closed, true);
  eq("Earned = the frozen payroll_lines total (what was paid)", [v.earned, row.totalAmountActual], [line.total_amount_vnd, line.total_amount_vnd]);
  eq("held count and hours frozen", [v.heldSessions, v.totalHours], [line.sessions_count, line.total_minutes / 60]);
  eq("the recomputed figure is kept in live (300,000: two 90-min lessons at 100,000/h)", [row.live.totalAmountActual, row.live.sessionsCountActual], [300000, 2]);
  eq("a lesson marked Held after the close: per-lesson amounts withheld", [v.perSessionAvailable, v.sessions.map((s) => s.amount)], [false, [null, null]]);
  eq("  and the days are 'figure unavailable', never a recomputed sum", [...v.earnedByDate.values()], [null, null]);
  eq("  rate shown is the frozen line's", [v.rateVnd, v.payBasis], [line.hourly_rate_vnd, line.pay_rate_type]);
  const svc = await call(fn, SERVICE_KEY, { month: "2026-09" });
  eq("the TA's row equals what close-payroll-month's service-role read reports for them", rowOf(svc, TA_1), row);
});

await section("a field missing: 'figure unavailable', never a browser price", async () => {
  const r = await call(fn, tokenOf(U.ta), { month: "2026-10" });
  const strip = JSON.parse(JSON.stringify(r.json), (k, x) => (["lostIncome", "rateVnd", "hourlyRate"].includes(k) ? undefined : x));
  const v = V.teacherPayrollView(strip, TA_1);
  eq("Lost Income unavailable", v.lostIncome, null);
  eq("rate unavailable", v.rateVnd, null);
  eq("per-lesson rate unavailable", v.sessions.map((s) => s.rateVnd), [null, null]);
  eq("per-lesson amounts still the function's", v.sessions.map((s) => s.amount), [150000, 300000]);
  const noAmount = JSON.parse(JSON.stringify(r.json), (k, x) => (k === "amount" ? undefined : x));
  const v2 = V.teacherPayrollView(noAmount, TA_1);
  eq("no per-lesson amount: each lesson and its day unavailable", [v2.sessions.map((s) => s.amount), [...v2.earnedByDate.values()]], [[null, null], [null, null]]);
  if (baseFn) {
    // A browser ahead of the redeploy: the old function answers the TA 403.
    const old = await call(baseFn, tokenOf(U.ta), { month: "2026-10" });
    const vOld = V.teacherPayrollView(old.json, TA_1);
    eq(`a ${BASE} deploy refuses the TA: not found, not answered (screens show 'figure unavailable', not 0)`, [old.status, vOld.found, vOld.answered], [403, false, false]);
  }
});

// The old TAProfileDrawer (at BASE, :59-95), reproduced line for line over
// the same fixture with the real payRate.ts / sessionDuration.ts it imported.
async function loadLib(rel) {
  const p = resolve(tmpdir(), `tapay.${rel.replace(/\W/g, "_")}.${process.pid}.mjs`);
  writeFileSync(p, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  const mod = await import(pathToFileURL(p).href);
  try { unlinkSync(p); } catch { /* ignore */ }
  return mod;
}
const rate = await loadLib("src/lib/payRate.ts");
const dur = await loadLib("src/lib/sessionDuration.ts");
function oldDrawer(taRow, month) {
  const s = seed();
  const [y, m] = month.split("-");
  const start = `${y}-${m}-01`;
  const end = `${y}-${m}-${String(new Date(+y, +m, 0).getDate()).padStart(2, "0")}`;
  const parts = s.session_participants
    .filter((p) => p.teaching_assistant_id === taRow.id && p.participant_type === "teaching_assistant")
    .map((p) => ({ ...p, sessions: s.sessions.find((x) => x.id === p.session_id) }))
    .filter((p) => p.sessions && p.sessions.date >= start && p.sessions.date <= end);
  const held = parts.filter((p) => p.sessions.status === "Held");
  const minutes = held.map((p) => dur.durationMinutes(p.sessions.start_time, p.sessions.end_time) ?? 0);
  return { totalSessions: parts.length, heldSessions: held.length, totalEarnings: rate.totalPayVnd(taRow, minutes) };
}

const table = [];
const fmt = (n) => (n === null || n === undefined ? "unavailable" : typeof n === "number" ? n.toLocaleString("en-US") : String(n));
const addRow = (screen, what, before, after, shouldDiffer, why) => {
  table.push({ screen, what, before: fmt(before), after: fmt(after), why });
  ok(`${screen} / ${what}: ${shouldDiffer ? "old figure disagrees with the function" : "agrees"}`, (JSON.stringify(before) !== JSON.stringify(after)) === shouldDiffer, { before, after });
};

await section("before / after on the fixture", async () => {
  const s = seed();
  const ta1 = s.teaching_assistants.find((t) => t.id === TA_1);
  const ta2 = s.teaching_assistants.find((t) => t.id === TA_2);
  const oct = V.teacherPayrollView((await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: TA_1 })).json, TA_1);
  const o = oldDrawer(ta1, "2026-10");
  addRow("admin TA drawer (TA_1, Oct)", "Earnings", o.totalEarnings, oct.earned, true, "old: today's 150,000/h over every Held lesson, the one the TA was absent from included; function: dated rate, attended lessons only");
  addRow("admin TA drawer (TA_1, Oct)", "Held Sessions", o.heldSessions, oct.heldSessions, true, "old counted the 6 Oct lesson the TA was marked absent from");
  addRow("admin TA drawer (TA_1, Oct)", "Total Sessions", o.totalSessions, oct.heldSessions + oct.scheduledSessions, true, "old counted every rostered row, the cancellation and the absence included");
  const sep = V.teacherPayrollView((await call(fn, tokenOf(U.admin), { month: "2026-09", teacherId: TA_1 })).json, TA_1);
  const os = oldDrawer(ta1, "2026-09");
  addRow("admin TA drawer (TA_1, Sep CLOSED)", "Earnings", os.totalEarnings, sep.earned, true, "old: both lessons at today's 150,000/h; now the frozen 150,000 the month was paid at");
  const oct2 = V.teacherPayrollView((await call(fn, tokenOf(U.admin), { month: "2026-10", teacherId: TA_2 })).json, TA_2);
  addRow("admin TA drawer (TA_2, Oct)", "Earnings (per-session, no rate change)", oldDrawer(ta2, "2026-10").totalEarnings, oct2.earned, false, "agrees");
  if (baseFn) {
    const old = await call(baseFn, tokenOf(U.ta), { month: "2026-10" });
    // TeacherDashboard at BASE: the invoke errors on 403, the query has no
    // data, and the card prints `(undefined || 0) / 1000` = 0K.
    const oldEarned = old.status === 200 ? (old.json?.payrollData?.[0]?.totalAmountActual || 0) : 0;
    const now = V.teacherPayrollView((await call(fn, tokenOf(U.ta), { month: "2026-10" })).json, TA_1);
    addRow("TA dashboard (TA_1, Oct)", "Earned", oldEarned, now.earned, true, "old: the function refused a TA and the card printed 0K");
    addRow("TA dashboard (TA_1, Oct)", "Rate", rate.effectiveRateVnd(ta1), now.rateVnd, false, "today's row and the month-end rate agree here (raise on 15 Oct)");
    addRow("TA /teacher/payroll (TA_1, Oct)", "page", "Not a teacher", now.found ? "the TA's own month" : "missing", true, "old page looked up a teachers row only");
  }
  console.log("\n| Screen | Figure | Old | Function (now shown) | Why |\n|---|---|---|---|---|");
  for (const t of table) console.log(`| ${t.screen} | ${t.what} | ${t.before} | ${t.after} | ${t.why} |`);
  console.log("");
});

for (const p of [sessionsTmp, viewTmp]) { try { unlinkSync(p); } catch { /* ignore */ } }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
