// D5 G-7: re-closing a payroll month removes whoever no longer earns in it.
//
//   node scripts/pgtest/payroll-reclose.test.mjs
//
// The REAL close-payroll-month (bundled with esbuild, remote imports stubbed,
// its ../_lib/auth.ts real) over a stand-in for PostgREST that runs every
// select, upsert, update and rpc as real SQL, as service_role, against an
// in-process Postgres carrying the REAL migration chain in paste order: the
// audit trigger (20261009130000), the payroll lock and its guards, the class
// overhead freeze, the closed-payroll expenditure guard, the G-11 audit on
// expenditures and 20261117153000 under test. calculate-payroll is scripted:
// what it answers is the month's payroll, which is the point.
//
// BASE is close-payroll-month as it is on main at 04ccc58f (five PostgREST
// requests, upserts only), run over a second database seeded identically.
//
// What this suite holds:
//   1. The migration installs (twice), only service_role may run it, and its
//      preflight refuses (nothing created) without the closed-payroll guards.
//   2. FIRST CLOSE, byte for byte: every row of payroll_periods,
//      payroll_lines, expenditures, class_overhead_allocations and audit_log
//      the new close leaves is the row BASE leaves (ids and clock times
//      aside); the response is BASE's plus removedLines/removedCosts = [].
//      Also with costs already booked from the Payroll tab, and for a
//      re-close where nobody dropped out.
//   3. A TEACHER dropped between two closes: BASE leaves their line and cost
//      (the gap, M33 = 1); the new close removes both, says so in the
//      response and in one audit entry naming the admin; the lines of people
//      still owed keep their row (id, created_at) and get only the values the
//      close always wrote. M31 / M32 / M33 from scripts/CHECK-money-
//      invariants.sql are 0.
//   4. A TA dropped: the same, keyed on assistant_id / 'assistant:'.
//   5. REFUSED, NOTHING CHANGED: a closed-payroll guard refusing a removal
//      (the stale cost is dated in a closed month), the month closed
//      meanwhile (HC147), a plan that disagrees with itself (HC148), a
//      non-admin actor, the migration not installed (503, and not even the
//      period row is written - BASE wrote it first). Every table identical
//      before and after. BASE, in the guard case, leaves half a month
//      written: the proof that today's order was not all-or-nothing.
//   6. What it never touches: another month (closed or open), a payroll
//      cost of another key shape, a hand-entered payroll cost.
//   7. PayrollMonthLock's drift (src/lib/payrollDrift.ts): a person with a
//      stored line and no live row shows as minus what they were paid, not
//      nothing; no drift until the live figures have loaded; carried netted.
import { PGlite } from "@electric-sql/pglite";
import { build, transform } from "esbuild";
import { z } from "zod";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const BASE = "04ccc58f";
const mig = (n) => readFileSync(join(repo, "supabase", "migrations", n), "utf8");
const NEW_MIG = "20261117153000_payroll_reclose_reconcile.sql";
const CHAIN = [
  "20261009130000_audit_every_admin_action.sql",
  "20261021092000_expenditure_source_key.sql",
  "20261021093000_payroll_month_locking.sql",
  "20261021095000_recurring_expenditures_in_production.sql",
  "20261021096000_fix_payroll_lines_upsert_target.sql",
  "20261021097000_class_overhead_allocation.sql",
  "20261021098000_targeted_expenditure_allocation.sql",
  "20261021099000_class_overhead_breakdown.sql",
  "20261022091000_protect_closed_payroll_expenditures.sql",
  "20261117111000_ledger_append_only_and_audit.sql",
];

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? "PASS" : "FAIL"}  ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ""}`);
  value ? pass++ : fail++;
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });
const section = (t) => console.log(`=== ${t} ===`);

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ADMIN = U(1), TEACHER_LOGIN = U(2);
const MAI = U(101), COL = U(102), LINH = U(201), HOA = U(202);
const CLASS_A = U(301);
const SERVICE_KEY = "service-key-for-tests";
const tokenOf = (uid) => `tok-${uid}`;

// ---------------------------------------------------------------- database
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, PRIMARY KEY (user_id, role));
  CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
  CREATE TYPE public.session_status AS ENUM ('Scheduled', 'Held', 'Canceled');
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.teachers (id uuid PRIMARY KEY, user_id uuid, full_name text NOT NULL);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY, user_id uuid, full_name text NOT NULL);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    session_rate_vnd integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE, teacher_id uuid REFERENCES public.teachers(id),
    date date NOT NULL, start_time time, end_time time, status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, teacher_id uuid REFERENCES public.teachers(id),
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id), participant_type text NOT NULL DEFAULT 'teaching_assistant',
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.payroll_summaries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id), month text NOT NULL, total_hours numeric DEFAULT 0,
    total_amount numeric DEFAULT 0, sessions_count integer DEFAULT 0, UNIQUE (teacher_id, month));
  CREATE TABLE public.expenditures (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount integer NOT NULL,
    category text NOT NULL, memo text, date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TRIGGER update_expenditures_updated_at BEFORE UPDATE ON public.expenditures
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  -- What 20261117111000's preflight asks for; nothing here writes them.
  CREATE TABLE public.ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.ledger_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.settlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.sibling_discount_state (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.discount_definitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.monthly_finance_snapshots (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
  INSERT INTO auth.users VALUES ('${ADMIN}'), ('${TEACHER_LOGIN}');
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin'), ('${TEACHER_LOGIN}', 'teacher');
  INSERT INTO public.teachers VALUES ('${MAI}', NULL, 'Mai'), ('${COL}', '${TEACHER_LOGIN}', 'Colleague');
  INSERT INTO public.teaching_assistants VALUES ('${LINH}', NULL, 'Linh'), ('${HOA}', NULL, 'Hoa');
  INSERT INTO public.classes (id, name) VALUES ('${CLASS_A}', 'Class A');
`;

async function fresh({ withNew = true, chain = CHAIN } = {}) {
  const db = new PGlite();
  await db.exec(PRELUDE);
  for (const f of chain) await db.exec(mig(f));
  if (withNew) await db.exec(mig(NEW_MIG));
  // A lesson in each month used, so the class overhead freeze has a class.
  for (const m of ["2026-07", "2026-08", "2026-09"]) {
    await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date, status) VALUES ($1, $2, $3, 'Held')`, [CLASS_A, MAI, `${m}-10`]);
  }
  // August's rent, so the freeze on the lock has something to freeze and the
  // byte-for-byte comparison covers class_overhead_allocations too.
  if (chain.includes("20261021097000_class_overhead_allocation.sql")) {
    const tpl = (await db.query(`INSERT INTO public.recurring_expenditures (id, amount, category, start_month, allocation_mode)
      VALUES ('${U(401)}', 9000000, 'Rent', '2026-08-01', 'all') RETURNING id`)).rows[0].id;
    await db.query(`INSERT INTO public.expenditures (amount, category, memo, date, source_template_id, source_kind, source_key, allocation_mode)
      VALUES (9000000, 'Rent', 'Rent', '2026-08-01', $1, 'recurring', $2, 'all')`, [tpl, `2026-08:${tpl}`]);
  }
  return db;
}

// --------------------------------------------- the PostgREST stand-in
const asService = async (db, fn) => {
  await db.exec("SET ROLE service_role");
  try { return await fn(); } finally { await db.exec("RESET ROLE"); }
};
const errOf = (e) => ({ code: e?.code ?? "XX000", message: e?.message ?? String(e), details: e?.detail ?? null });

function pgClient(db, scripted, log) {
  const from = (table) => {
    const st = { op: "select", cols: "*", filters: [], payload: null, onConflict: null, single: null };
    const where = (start) => st.filters.map(([k], i) => `${k} = $${start + i}`).join(" AND ");
    const exec = async () => {
      log.push({ table, op: st.op });
      try {
        return await asService(db, async () => {
          if (st.op === "select") {
            const sql = `SELECT ${st.cols} FROM public.${table}${st.filters.length ? ` WHERE ${where(1)}` : ""}`;
            const rows = (await db.query(sql, st.filters.map(([, v]) => v))).rows;
            if (st.single === "maybe") return rows.length > 1 ? { data: null, error: { code: "PGRST116", message: "multiple rows" } } : { data: rows[0] ?? null, error: null };
            return { data: rows, error: null };
          }
          if (st.op === "upsert") {
            const arr = Array.isArray(st.payload) ? st.payload : [st.payload];
            const cols = [...new Set(arr.flatMap((o) => Object.keys(o)))];
            const sql = `INSERT INTO public.${table} (${cols.join(", ")})
              SELECT ${cols.join(", ")} FROM json_populate_recordset(NULL::public.${table}, $1::json)
              ON CONFLICT (${st.onConflict}) DO UPDATE SET ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`;
            await db.query(sql, [JSON.stringify(arr)]);
            return { data: null, error: null };
          }
          if (st.op === "update") {
            const cols = Object.keys(st.payload);
            const sql = `UPDATE public.${table} t SET ${cols.map((c) => `${c} = r.${c}`).join(", ")}
              FROM json_populate_record(NULL::public.${table}, $1::json) r WHERE ${st.filters.map(([k], i) => `t.${k} = $${2 + i}`).join(" AND ")}`;
            await db.query(sql, [JSON.stringify(st.payload), ...st.filters.map(([, v]) => v)]);
            return { data: null, error: null };
          }
          throw new Error(`stand-in: ${st.op} not modelled`);
        });
      } catch (e) {
        return { data: null, error: errOf(e) };
      }
    };
    const b = {
      select(c) { st.cols = c && st.op === "select" ? c : st.cols; return b; },
      upsert(p, o = {}) { st.op = "upsert"; st.payload = p; st.onConflict = o.onConflict; return b; },
      update(p) { st.op = "update"; st.payload = p; return b; },
      eq(k, v) { st.filters.push([k, v]); return b; },
      maybeSingle() { st.single = "maybe"; return b; },
      then(res, rej) { return exec().then(res, rej); },
    };
    return b;
  };
  return {
    from,
    rpc: async (name, args = {}) => {
      log.push({ rpc: name, args: JSON.parse(JSON.stringify(args)) });
      const keys = Object.keys(args);
      try {
        const r = await asService(db, () => db.query(
          `SELECT public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) AS r`,
          keys.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]))));
        return { data: r.rows[0].r, error: null };
      } catch (e) {
        return { data: null, error: errOf(e) };
      }
    },
    functions: {
      invoke: async (name, opts = {}) => {
        log.push({ invoke: name });
        if (name !== "calculate-payroll") return { data: null, error: { message: `unexpected invoke ${name}` } };
        return { data: { payrollData: JSON.parse(JSON.stringify(scripted[opts.body?.month] ?? [])) }, error: null };
      },
    },
    auth: {
      getUser: async (token) => {
        const uid = [ADMIN, TEACHER_LOGIN].find((u) => tokenOf(u) === token);
        return uid ? { data: { user: { id: uid, email: `${uid}@example.test` } }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } };
      },
    },
  };
}

// ------------------------------------------------------- the two functions
const CLOSE_DIR = resolve(repo, "supabase", "functions", "close-payroll-month");
globalThis.__rcZod = z;
let current = null; // { db, scripted, log }
globalThis.__rcCreateClient = () => pgClient(current.db, current.scripted, current.log);
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };

async function load(source, tag) {
  const out = await build({
    stdin: { contents: source, resolveDir: CLOSE_DIR, sourcefile: "index.ts", loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{
      name: "remote-imports",
      setup(b) {
        b.onResolve({ filter: /^https?:\/\// }, (a) => ({ path: a.path, namespace: "remote" }));
        b.onLoad({ filter: /.*/, namespace: "remote" }, (a) => ({
          contents: a.path.includes("zod") ? "export const z = globalThis.__rcZod;" : "export const createClient = (...a) => globalThis.__rcCreateClient(...a);",
          loader: "js",
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `payroll-reclose.${tag}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}
const target = process.argv[2] ? resolve(process.argv[2]) : resolve(CLOSE_DIR, "index.ts");
const closeNow = await load(readFileSync(target, "utf8"), "now");
const closeBase = await load(execFileSync("git", ["show", `${BASE}:supabase/functions/close-payroll-month/index.ts`], { cwd: repo, encoding: "utf8" }), "base");
ok("both functions registered a handler", typeof closeNow === "function" && typeof closeBase === "function");

async function call(fn, db, scripted, body, token = tokenOf(ADMIN)) {
  current = { db, scripted, log: [] };
  const quiet = console.error; console.error = () => {};
  try {
    const res = await fn(new Request("https://example.supabase.co/functions/v1/close-payroll-month", {
      method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: await res.json(), log: current.log };
  } finally { console.error = quiet; }
}

// What calculate-payroll answers, per month (scripted).
const row = (id, name, amount, { ta = false, perSession = false, sessions = 4 } = {}) => ({
  teacherId: id, teacherName: ta ? `${name} (TA)` : name, payRateType: perSession ? "per_session" : "hourly",
  hourlyRate: perSession ? 0 : 200000, perSessionRate: perSession ? 80000 : 0,
  sessionsCountActual: sessions, totalMinutesActual: sessions * 90, totalAmountActual: amount,
  staffType: ta ? "teaching_assistant" : "teacher",
});

// ---------------------------------------------------------------- snapshots
const STRIP = new Set(["id", "created_at", "updated_at", "locked_at", "reopened_at", "frozen_at", "occurred_at"]);
const strip = (o) => (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => !STRIP.has(k))) : o);
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s ?? ""));
const sorted = (rows) => rows.map((r) => JSON.stringify(r)).sort().map((s) => JSON.parse(s));
async function snap(db) {
  const q = async (s) => (await db.query(s)).rows;
  return {
    periods: sorted((await q(`SELECT * FROM public.payroll_periods`)).map((r) => ({ ...strip(r), locked: r.locked_at !== null }))),
    lines: sorted((await q(`SELECT * FROM public.payroll_lines`)).map(strip)),
    costs: sorted((await q(`SELECT * FROM public.expenditures`)).map(strip)),
    overhead: sorted((await q(`SELECT * FROM public.class_overhead_allocations`)).map(strip)),
    audit: sorted((await q(`SELECT entity, entity_id, action, operation, changed_fields, actor_user_id, diff FROM public.audit_log`)).map((r) => ({
      ...r,
      entity_id: isUuid(r.entity_id) ? "<row>" : r.entity_id,
      changed_fields: r.changed_fields ? r.changed_fields.filter((f) => !STRIP.has(f)) : r.changed_fields,
      diff: r.diff ? { old: strip(r.diff.old), new: strip(r.diff.new), ...Object.fromEntries(Object.entries(r.diff).filter(([k]) => k !== "old" && k !== "new")) } : r.diff,
    }))),
  };
}
// Rows exactly as stored (ids and created_at included), for "unchanged".
const rawLines = async (db) => (await db.query(`SELECT id, month, teacher_id, assistant_id, created_at, staff_name, total_amount_vnd FROM public.payroll_lines ORDER BY month, staff_name`)).rows;
const rawAll = async (db) => {
  const out = {};
  for (const t of ["payroll_periods", "payroll_lines", "expenditures", "class_overhead_allocations", "audit_log"]) {
    out[t] = sorted((await db.query(`SELECT * FROM public.${t}`)).rows);
  }
  return out;
};

// M31 / M32 / M33 as scripts/CHECK-money-invariants.sql has them, verbatim.
const CHECK = readFileSync(join(repo, "scripts", "CHECK-money-invariants.sql"), "utf8").replace(/\r/g, "");
const lockedCte = /locked AS \([\s\S]*?\n\)/.exec(CHECK)[0];
const payrollChecks = CHECK.slice(CHECK.indexOf("SELECT 'M31'"), CHECK.indexOf("UNION ALL\nSELECT 'M34'"));
ok("the M31-M33 block was found in the check script", lockedCte.includes("payroll_periods") && /'M31'[\s\S]*'M32'[\s\S]*'M33'/.test(payrollChecks) && !payrollChecks.includes("'M34'"));
async function m3x(db) {
  const r = (await db.query(`WITH ${lockedCte} SELECT check_id, violations::int AS n
    FROM (${payrollChecks}) q(check_id, check_name, kind, violations, total_vnd, meaning)`)).rows;
  return Object.fromEntries(r.map((x) => [x.check_id, x.n]));
}

const reopen = (fn, db, scripted, month) => call(fn, db, scripted, { month, action: "reopen", reason: "lessons corrected before paying" });

// ==================================================================== 1
section("1. installs; who may run it; preflight fails closed");
{
  const db = await fresh();
  let again = null;
  try { await db.exec(mig(NEW_MIG)); } catch (e) { again = e.message; }
  ok("the migration applies, and a second time unchanged", again === null, again);
  const priv = (await db.query(`SELECT r, has_function_privilege(r, 'public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text)', 'EXECUTE') AS can
                                 FROM unnest(ARRAY['service_role','authenticated','anon']) r`)).rows;
  eq("only service_role may execute it", priv.map((x) => [x.r, x.can]), [["service_role", true], ["authenticated", false], ["anon", false]]);
  await db.exec(`SET ROLE authenticated`);
  let e = null;
  try { await db.query(`SELECT public.close_payroll_month_apply('2026-08', '[]', '[]', '${ADMIN}', NULL)`); } catch (x) { e = x.message; }
  await db.exec(`RESET ROLE`);
  ok("  a signed-in account calling it is refused", !!e && /permission denied/i.test(e), e);
  const sec = (await db.query(`SELECT prosecdef FROM pg_proc WHERE proname = 'close_payroll_month_apply'`)).rows[0];
  ok("  SECURITY INVOKER: it can do nothing the service role could not already", sec.prosecdef === false);

  for (const [label, drop] of [
    ["the closed-payroll expenditure guard", "DROP TRIGGER refuse_payroll_expenditure_in_locked_month ON public.expenditures"],
    ["the payroll_lines lock trigger", "DROP TRIGGER refuse_locked_payroll_lines ON public.payroll_lines"],
    ["a plain (month, assistant_id) unique index", "DROP INDEX public.payroll_lines_month_assistant_key"],
  ]) {
    const d = await fresh({ withNew: false });
    await d.exec(drop);
    let err = null;
    // The file is one BEGIN..COMMIT: a refused preflight leaves the
    // transaction aborted, as the SQL editor would; roll it back to look.
    try { await d.exec(mig(NEW_MIG)); } catch (x) { err = x.message; await d.exec("ROLLBACK"); }
    const made = (await d.query(`SELECT count(*)::int c FROM pg_proc WHERE proname = 'close_payroll_month_apply'`)).rows[0].c;
    ok(`without ${label}: refuses to install, names it, creates nothing`, !!err && /cannot be installed/.test(err) && made === 0, { err, made });
    await d.close();
  }
  await db.close();
}

// ==================================================================== 2
section("2. first close: byte for byte what BASE writes");
const AUG = { "2026-08": [row(MAI, "Mai", 3000000), row(COL, "Colleague", 0), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] };
{
  const a = await fresh(), b = await fresh();
  const ra = await call(closeBase, a, AUG, { month: "2026-08", action: "close", note: "August" });
  const rb = await call(closeNow, b, AUG, { month: "2026-08", action: "close", note: "August" });
  ok("BASE closes", ra.status === 200, ra.json);
  ok("the new close closes", rb.status === 200, rb.json);
  const sa = await snap(a), sb = await snap(b);
  for (const k of Object.keys(sa)) eq(`  ${k}: identical to BASE (${sa[k].length} row(s))`, sb[k], sa[k]);
  ok("  and there is something to compare (2 lines, 2 costs, audit rows)", sa.lines.length === 2 && sa.costs.length === 2 && sa.audit.length >= 5, { lines: sa.lines.length, costs: sa.costs.length, audit: sa.audit.length });
  const { lockedAt: _x, ...restA } = ra.json; const { lockedAt: _y, removedLines, removedCosts, ...restB } = rb.json;
  eq("  response: BASE's, plus removedLines / removedCosts empty", { restB, removedLines, removedCosts }, { restB: restA, removedLines: [], removedCosts: [] });
  ok("  lockedAt is the stored lock time", rb.json.lockedAt && new Date(rb.json.lockedAt).getTime() === new Date((await b.query(`SELECT locked_at FROM public.payroll_periods WHERE month='2026-08'`)).rows[0].locked_at).getTime(), rb.json.lockedAt);
  ok("  the new close makes ONE write request (the rpc), BASE five", rb.log.filter((e) => e.rpc || (e.op && e.op !== "select")).length === 1 && ra.log.filter((e) => e.op && e.op !== "select").length === 5,
    { now: rb.log, base: ra.log.filter((e) => e.op !== "select") });
  eq("  M31 / M32 / M33 after the first close", await m3x(b), { M31: 0, M32: 0, M33: 0 });

  // Re-close where nobody dropped: Mai's lessons corrected upwards.
  const AUG2 = { "2026-08": [row(MAI, "Mai", 3400000, { sessions: 5 }), row(COL, "Colleague", 0), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] };
  for (const [fn, d] of [[closeBase, a], [closeNow, b]]) {
    const r1 = await reopen(fn, d, AUG2, "2026-08");
    const r2 = await call(fn, d, AUG2, { month: "2026-08", action: "close" });
    ok(`${fn === closeBase ? "BASE" : "new"}: reopen and re-close`, r1.status === 200 && r2.status === 200, [r1.json, r2.json]);
  }
  const sa2 = await snap(a), sb2 = await snap(b);
  for (const k of Object.keys(sa2)) eq(`  re-close, nobody dropped: ${k} identical to BASE`, sb2[k], sa2[k]);
  await a.close(); await b.close();
}
{
  // Costs already booked from the Payroll tab while the month was open, for
  // the people who earn (what live has for October 2026 today).
  const a = await fresh(), b = await fresh();
  for (const d of [a, b]) {
    await d.query(`INSERT INTO public.expenditures (amount, category, memo, date, source_kind, source_key) VALUES
      (2900000, 'Teacher Payroll', 'Mai – 2026-08', '2026-08-31', 'payroll', '2026-08:teacher:${MAI}'),
      (800000, 'TA Payroll', 'Linh (TA) – 2026-08', '2026-08-31', 'payroll', '2026-08:assistant:${LINH}')`);
  }
  const ra = await call(closeBase, a, AUG, { month: "2026-08", action: "close" });
  const rb = await call(closeNow, b, AUG, { month: "2026-08", action: "close" });
  ok("with Payroll-tab bookings of the earners: both close", ra.status === 200 && rb.status === 200, [ra.json, rb.json]);
  const sa = await snap(a), sb = await snap(b);
  for (const k of Object.keys(sa)) eq(`  ${k}: identical to BASE`, sb[k], sa[k]);
  eq("  nothing removed", rb.json.removedCosts, []);
  await a.close(); await b.close();
}

// ==================================================================== 3
section("3. a teacher dropped between two closes");
const AUG_COL = { "2026-08": [row(MAI, "Mai", 3000000), row(COL, "Colleague", 500000, { sessions: 2 }), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] };
const AUG_NO_COL = { "2026-08": [row(MAI, "Mai", 3000000), row(COL, "Colleague", 0, { sessions: 0 }), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] };
{
  const a = await fresh(), b = await fresh();
  for (const [fn, d] of [[closeBase, a], [closeNow, b]]) {
    const c1 = await call(fn, d, AUG_COL, { month: "2026-08", action: "close" });
    const r = await reopen(fn, d, AUG_NO_COL, "2026-08");
    ok(`${fn === closeBase ? "BASE" : "new"}: closed with Colleague, reopened`, c1.status === 200 && r.status === 200, [c1.json, r.json]);
  }
  const before = await rawLines(b);
  const auditBefore = (await b.query(`SELECT count(*)::int c FROM public.audit_log`)).rows[0].c;
  const ra = await call(closeBase, a, AUG_NO_COL, { month: "2026-08", action: "close" });
  const rb = await call(closeNow, b, AUG_NO_COL, { month: "2026-08", action: "close" });
  ok("both re-close", ra.status === 200 && rb.status === 200, [ra.json, rb.json]);

  const colLine = async (d) => (await d.query(`SELECT count(*)::int c FROM public.payroll_lines WHERE teacher_id = $1`, [COL])).rows[0].c;
  const colCost = async (d) => (await d.query(`SELECT count(*)::int c FROM public.expenditures WHERE source_key = $1`, [`2026-08:teacher:${COL}`])).rows[0].c;
  ok("BASE (the gap): Colleague's line and cost are still there after the re-close", (await colLine(a)) === 1 && (await colCost(a)) === 1);
  eq("  (BASE: the stale line and its cost agree with each other, so M31-M33 cannot see that 500,000 is not owed)", await m3x(a), { M31: 0, M32: 0, M33: 0 });
  ok("new: Colleague's line is removed", (await colLine(b)) === 0);
  ok("new: Colleague's booked cost is removed", (await colCost(b)) === 0);
  const total = async (d) => (await d.query(`SELECT sum(amount)::int s FROM public.expenditures WHERE source_kind = 'payroll' AND source_key LIKE '2026-08:%'`)).rows[0].s;
  eq("  the month's booked payroll is what is owed now: 3,800,000 (BASE: 4,300,000)", [await total(b), await total(a)], [3800000, 4300000]);
  eq("  M31 / M32 / M33 after the new re-close", await m3x(b), { M31: 0, M32: 0, M33: 0 });

  const after = await rawLines(b);
  eq("  Mai and Linh (still owed) keep their row: same id, same created_at, same amount",
    after, before.filter((l) => l.teacher_id !== COL));
  eq("  the response names who was removed and the amount",
    rb.json.removedLines, [{ staffName: "Colleague", teacherId: COL, assistantId: null, totalAmountVnd: 500000 }]);
  eq("  and the cost removed", rb.json.removedCosts.map((c) => [c.sourceKey, c.amount]), [[`2026-08:teacher:${COL}`, 500000]]);
  const named = (await b.query(`SELECT actor_user_id, entity, entity_id, diff FROM public.audit_log WHERE action = 'payroll_close_removed_not_owed'`)).rows;
  ok("  one audit entry, naming the closing admin, the month, who and why",
    named.length === 1 && named[0].actor_user_id === ADMIN && named[0].entity_id === "2026-08"
      && named[0].diff.removed_lines[0].staffName === "Colleague" && named[0].diff.removed_costs[0].amount === 500000 && /earns nothing/.test(named[0].diff.why), named);
  const dels = (await b.query(`SELECT entity FROM public.audit_log WHERE operation = 'DELETE' ORDER BY entity`)).rows.map((r) => r.entity);
  eq("  and the row audit records each DELETE (line and cost)", dels, ["expenditures", "payroll_lines"]);
  ok("  audit rows added by the re-close are all at the lock time or before (M31's rule)",
    (await b.query(`SELECT count(*)::int c FROM public.audit_log a, public.payroll_periods p WHERE p.month='2026-08' AND a.occurred_at > p.locked_at`)).rows[0].c === 0
      && (await b.query(`SELECT count(*)::int c FROM public.audit_log`)).rows[0].c > auditBefore);

  // The line BASE left behind is M32/M33's business once its cost and line
  // disagree; make the gap visible the way live would see it: Colleague's
  // line corrected away by hand would leave the cost (M33).
  await a.exec(`UPDATE public.payroll_periods SET status = 'open' WHERE month = '2026-08';
                DELETE FROM public.payroll_lines WHERE teacher_id = '${COL}';
                UPDATE public.payroll_periods SET status = 'locked' WHERE month = '2026-08';`);
  eq("  (BASE world, line gone and cost left: M33 counts it - the check the fix keeps at 0)", (await m3x(a)).M33, 1);
  await a.close(); await b.close();
}

// ==================================================================== 4
section("4. a TA dropped between two closes");
{
  const SEP_TWO = { "2026-09": [row(MAI, "Mai", 2000000), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 }), row(HOA, "Hoa", 450000, { ta: true, sessions: 2 })] };
  const SEP_ONE = { "2026-09": [row(MAI, "Mai", 2000000), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] };
  const b = await fresh();
  await call(closeNow, b, SEP_TWO, { month: "2026-09", action: "close" });
  await reopen(closeNow, b, SEP_ONE, "2026-09");
  const before = await rawLines(b);
  const r = await call(closeNow, b, SEP_ONE, { month: "2026-09", action: "close" });
  ok("re-closes", r.status === 200, r.json);
  eq("Hoa's line (assistant_id) is removed; Mai and Linh unchanged", await rawLines(b), before.filter((l) => l.assistant_id !== HOA));
  ok("Hoa's cost ('assistant:' key) is removed", (await b.query(`SELECT count(*)::int c FROM public.expenditures WHERE source_key = $1`, [`2026-09:assistant:${HOA}`])).rows[0].c === 0);
  eq("  the response", r.json.removedLines, [{ staffName: "Hoa (TA)", teacherId: null, assistantId: HOA, totalAmountVnd: 450000 }]);
  eq("  M31 / M32 / M33", await m3x(b), { M31: 0, M32: 0, M33: 0 });
  await b.close();
}

// ==================================================================== 5
section("5. refused by a guard, or otherwise: nothing changed");
{
  // Colleague's stale cost for August was dated 31 July (a hand correction),
  // and July is closed: removing it is a write to a closed month's
  // expenditure, which 20261022091000 refuses.
  const setup = async (fn) => {
    const d = await fresh();
    const JUL = { "2026-07": [row(MAI, "Mai", 1000000)] };
    await call(fn, d, JUL, { month: "2026-07", action: "close" });
    await call(fn, d, AUG_COL, { month: "2026-08", action: "close" });
    await reopen(fn, d, AUG_NO_COL, "2026-08");
    await d.exec(`SET session_replication_role = replica;
                  UPDATE public.expenditures SET date = '2026-07-31' WHERE source_key = '2026-08:teacher:${COL}';
                  SET session_replication_role = origin;`);
    return d;
  };
  const b = await setup(closeNow);
  const before = await rawAll(b);
  const r = await call(closeNow, b, AUG_NO_COL, { month: "2026-08", action: "close" });
  ok("the re-close is refused (409) with the guard's own words", r.status === 409 && /2026-07 is closed/.test(r.json.error) && /Nothing was changed/.test(r.json.error), r);
  eq("  every table exactly as before: Colleague's line NOT removed, nothing written, August still open", await rawAll(b), before);

  // BASE never removes anything, so it cannot meet that refusal. To show
  // its order was not all-or-nothing, give it a write the same guard
  // refuses: Mai's August cost dated in July. The cost upsert is its fourth
  // request; the lines are the second and third.
  const a = await setup(closeBase);
  await a.exec(`SET session_replication_role = replica;
                UPDATE public.expenditures SET date = '2026-07-31' WHERE source_key = '2026-08:teacher:${MAI}';
                SET session_replication_role = origin;`);
  const mid = await snap(a);
  const ra2 = await call(closeBase, a, { "2026-08": [row(MAI, "Mai", 3300000), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] }, { month: "2026-08", action: "close" });
  const after = await snap(a);
  ok("BASE (for contrast): a cost write refused part-way fails the close (500)...", ra2.status === 500, ra2);
  ok("  ...after the lines were already rewritten (Mai 3,000,000 -> 3,300,000), in a month left open: not all-or-nothing",
    mid.lines.find((l) => l.teacher_id === MAI && l.month === "2026-08")?.total_amount_vnd === 3000000
      && after.lines.find((l) => l.teacher_id === MAI && l.month === "2026-08")?.total_amount_vnd === 3300000
      && after.periods.find((p) => p.month === "2026-08")?.status === "open", { mid: mid.lines, after: after.lines, periods: after.periods });
  await a.close();

  // The same through the new close: refused, nothing written.
  const b2 = await setup(closeNow);
  await b2.exec(`SET session_replication_role = replica;
                 UPDATE public.expenditures SET date = '2026-07-31' WHERE source_key = '2026-08:teacher:${MAI}';
                 SET session_replication_role = origin;`);
  const b2Before = await rawAll(b2);
  const rb2 = await call(closeNow, b2, { "2026-08": [row(MAI, "Mai", 3300000), row(LINH, "Linh", 800000, { ta: true, perSession: true, sessions: 10 })] }, { month: "2026-08", action: "close" });
  ok("new: the same refused cost write fails the close (409)", rb2.status === 409, rb2);
  eq("  and nothing at all was written: Mai's line as it was, Colleague's still there, August open", await rawAll(b2), b2Before);
  await b.close(); await b2.close();
}
{
  const b = await fresh();
  await call(closeNow, b, AUG, { month: "2026-08", action: "close" });
  const before = await rawAll(b);
  const lines = [{ month: "2026-08", teacher_id: MAI, assistant_id: null, staff_name: "Mai", pay_rate_type: "hourly", hourly_rate_vnd: 200000, per_session_rate_vnd: 0, sessions_count: 4, total_minutes: 360, total_amount_vnd: 1, created_by: ADMIN }];
  const costs = [{ amount: 1, category: "Teacher Payroll", memo: "Mai – 2026-08", date: "2026-08-31", source_kind: "payroll", source_key: `2026-08:teacher:${MAI}` }];
  const rpc = async (args) => { current = { db: b, scripted: {}, log: [] }; return pgClient(b, {}, []).rpc("close_payroll_month_apply", args); };
  const r1 = await rpc({ p_month: "2026-08", p_lines: lines, p_costs: costs, p_actor: ADMIN, p_note: null });
  ok("a month closed meanwhile (the function's own pre-check passed, then another close won): HC147", r1.error?.code === "HC147", r1);
  eq("  nothing changed", await rawAll(b), before);
  // Through the function too: the edge function's pre-check answers first.
  const rf = await call(closeNow, b, AUG, { month: "2026-08", action: "close" });
  ok("  (through the function: 409 already closed, before calculate-payroll is asked)", rf.status === 409 && !rf.log.some((e) => e.invoke), rf);

  await reopen(closeNow, b, AUG, "2026-08");
  const open = await rawAll(b);
  for (const [label, args, code] of [
    ["a cost with a different amount from its line", { p_lines: lines, p_costs: [{ ...costs[0], amount: 2 }] }, "HC148"],
    ["a line with no cost", { p_lines: lines, p_costs: [] }, "HC148"],
    ["a cost with no line", { p_lines: lines, p_costs: [...costs, { ...costs[0], source_key: `2026-08:teacher:${COL}` }] }, "HC148"],
    ["a line of another month", { p_lines: [{ ...lines[0], month: "2026-07" }], p_costs: costs }, "HC148"],
    ["a line naming nobody", { p_lines: [{ ...lines[0], teacher_id: null }], p_costs: costs }, "HC148"],
    ["no lines at all", { p_lines: [], p_costs: [] }, "HC148"],
    ["an actor who is not an admin", { p_lines: lines, p_costs: costs, p_actor: TEACHER_LOGIN }, "42501"],
    ["no actor", { p_lines: lines, p_costs: costs, p_actor: null }, "42501"],
  ]) {
    const r = await rpc({ p_month: "2026-08", p_actor: ADMIN, p_note: null, ...args });
    ok(`${label}: refused (${code})`, r.error?.code === code, r);
  }
  eq("  after all of them: nothing changed (August still open, every line and cost as before)", await rawAll(b), open);
  await b.close();
}
{
  // The function deployed before the migration is pasted.
  const b = await fresh({ withNew: false });
  const before = await rawAll(b);
  const r = await call(closeNow, b, AUG, { month: "2026-08", action: "close" });
  ok("migration not installed: 503 naming it", r.status === 503 && /20261117153000/.test(r.json.error), r);
  eq("  and nothing written - not even the period row BASE wrote first", await rawAll(b), before);
  await b.close();
}

// ==================================================================== 6
section("6. what it never touches");
{
  const b = await fresh();
  const JUL = { "2026-07": [row(MAI, "Mai", 1000000), row(COL, "Colleague", 700000)] };
  await call(closeNow, b, JUL, { month: "2026-07", action: "close" });
  const julBefore = (await rawAll(b));
  await call(closeNow, b, AUG_COL, { month: "2026-08", action: "close" });
  await reopen(closeNow, b, AUG_NO_COL, "2026-08");
  // September open, with a Payroll-tab booking for Colleague; an odd-key
  // payroll cost and a hand-entered payroll cost in August for Colleague.
  await b.query(`INSERT INTO public.expenditures (amount, category, memo, date, source_kind, source_key) VALUES
    (600000, 'Teacher Payroll', 'Colleague – 2026-09', '2026-09-30', 'payroll', '2026-09:teacher:${COL}'),
    (100000, 'Teacher Payroll', 'Colleague bonus', '2026-08-31', 'payroll', '2026-08:bonus:${COL}'),
    (50000, 'Teacher Payroll', 'Colleague taxi (by hand)', '2026-08-31', NULL, NULL)`);
  const r = await call(closeNow, b, AUG_NO_COL, { month: "2026-08", action: "close" });
  ok("re-closes August", r.status === 200, r.json);
  const left = (await b.query(`SELECT memo FROM public.expenditures WHERE memo LIKE 'Colleague%'`)).rows.map((x) => x.memo).sort();
  eq("Colleague's July (closed), September (open), odd-key and hand-entered costs all stay; only August's keyed cost went",
    left, ["Colleague bonus", "Colleague taxi (by hand)", "Colleague – 2026-07", "Colleague – 2026-09"]);
  const jul = (await b.query(`SELECT * FROM public.payroll_lines WHERE month = '2026-07'`)).rows;
  eq("  July's lines exactly as closed", sorted(jul), julBefore.payroll_lines);
  eq("  the response lists only the August keyed cost", r.json.removedCosts.map((c) => c.sourceKey), [`2026-08:teacher:${COL}`]);
  await b.close();
}

// ==================================================================== 7
section("7. PayrollMonthLock drift: a dropped person is a correction, not nothing");
{
  const p = resolve(tmpdir(), `payrollDrift.${process.pid}.mjs`);
  writeFileSync(p, (await transform(readFileSync(resolve(repo, "src/lib/payrollDrift.ts"), "utf8"), { loader: "ts", format: "esm" })).code);
  const { payrollDrift, removedLinesText } = await import(pathToFileURL(p).href);
  try { unlinkSync(p); } catch { /* ignore */ }
  const lines = [
    { teacher_id: MAI, assistant_id: null, staff_name: "Mai", total_amount_vnd: 3000000 },
    { teacher_id: null, assistant_id: HOA, staff_name: "Hoa (TA)", total_amount_vnd: 450000 },
  ];
  const live = [{ id: MAI, staffType: "teacher", name: "Mai", totalEarned: 3200000 }];
  const d = payrollDrift(true, true, live, lines, []);
  eq("Mai +200,000 as before; Hoa (line, no live row: calculate-payroll leaves out a TA with no paid minutes) -450,000",
    d.map((x) => [x.id, x.staffType, x.paid, x.totalEarned, x.delta, x.noLongerEarns]),
    [[MAI, "teacher", 3000000, 3200000, 200000, false], [HOA, "ta", 450000, 0, -450000, true]]);
  // PayrollMonthLock.tsx at BASE, lines 110-125: it walked the live rows only.
  const baseDrift = (lk, lv, ln, cr) => {
    if (!lk) return [];
    const paid = new Map(ln.map((l) => [l.teacher_id ?? l.assistant_id ?? "", l.total_amount_vnd]));
    const done = new Map();
    for (const a of cr) { const id = a.teacher_id ?? a.assistant_id ?? ""; done.set(id, (done.get(id) ?? 0) + a.amount_vnd); }
    return lv.map((s) => ({ ...s, paid: paid.get(s.id) ?? 0, delta: Math.round(s.totalEarned - (paid.get(s.id) ?? 0) - (done.get(s.id) ?? 0)) }))
      .filter((s) => s.delta !== 0);
  };
  eq("  the panel at BASE showed Mai alone - Hoa's -450,000 silently lost",
    baseDrift(true, live, lines, []).map((x) => [x.id, x.delta]), [[MAI, 200000]]);
  eq("  and for everyone the live figures do cover, the same rows as BASE",
    payrollDrift(true, true, live, [lines[0]], []).map((x) => [x.id, x.paid, x.delta]), baseDrift(true, live, [lines[0]], []).map((x) => [x.id, x.paid, x.delta]));
  eq("while the live figures load (or failed): no drift at all", payrollDrift(true, false, [], lines, []), []);
  eq("an open month: no drift", payrollDrift(false, true, live, lines, []), []);
  eq("carried already: netted off, not offered again",
    payrollDrift(true, true, live, lines, [{ teacher_id: null, assistant_id: HOA, amount_vnd: -450000 }, { teacher_id: MAI, assistant_id: null, amount_vnd: 200000 }]), []);
  eq("a live row of 0 for someone with a line: as before (not doubled)",
    payrollDrift(true, true, [{ id: HOA, staffType: "ta", name: "Hoa (TA)", totalEarned: 0 }], [lines[1]], []).map((x) => [x.delta, x.noLongerEarns]), [[-450000, false]]);
  ok("the close's removedLines become one sentence on the toast",
    /Removed 1 line\(s\).*Colleague \(500,000\)/.test(removedLinesText([{ staffName: "Colleague", totalAmountVnd: 500000 }], (n) => n.toLocaleString("en-US"))));
  eq("  nothing removed: no sentence", removedLinesText([], String), "");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
