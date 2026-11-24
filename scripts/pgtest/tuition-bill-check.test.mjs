// Every child with lessons to pay for has a bill that matches the register
// (supabase/migrations/20261123090000_tuition_bill_check.sql,
//  supabase/functions/refresh-month-bills, _lib/bill-refresh.ts).
//
// November 2026: six children had no November bill and one had a bill of 0,
// because nothing saved bills on a schedule (the nightly job called
// calculate-tuition-bulk, which only reads) and nothing checked.
//
// What this suite holds:
//   1. The check prices lessons exactly as calculate-tuition does. The REAL
//      calculate-tuition handler (bundled; auth, rate limit and sibling resolver
//      stubbed) reads the SAME in-process Postgres as the SQL, through a
//      stand-in for PostgREST, and for every child its baseAmount equals
//      tuition_bill_expected: lesson status, Excused and nothing else forgiven
//      (a lesson with no mark is billed), the enrollment window, the
//      first-created enrollment of a class, allowed days, a custom rate above
//      and below the class fee, a zero rate, the fee history over the class's
//      mirror rate. The SQL is the one of 20261123150000 (the owner's rules of
//      23 Nov 2026), pasted over 20261123090000 as on production.
//   2. tuition_bill_gaps lists a missing bill, a bill of 0 (Lạc's case: saved
//      before the month's register existed), a bill the register has moved
//      away from; it does not list a correct bill, a frozen one, a child whose
//      lessons were all excused or not billable. A bill calculate-tuition has
//      just saved is never listed (the two agree after a save).
//   3. Who may run it: an admin and the service role; not another account,
//      not anon; tuition_bill_expected is the service role's alone. The run
//      log is readable by admins only and written by nobody signed in.
//   4. refresh-month-bills (REAL handler, its calls to calculate-tuition going
//      to the real handler above): refuses a caller with neither the runner
//      token nor an admin session; on the timer it saves every listed bill,
//      retries once after a 429, reports by name a child calculate-tuition did
//      not save (family discount unresolved) and a child whose bill was saved
//      yet still differs (the check and the calculator disagree), records the
//      run, and leaves only those listed. An admin may not reprice an earlier
//      month. The month helpers (Hanoi time, the 5-day grace) and readRecalc.
//   5. schedule-sessions no longer claims to refresh tuition through the
//      read-only calculate-tuition-bulk.
//   6. The migration installs twice.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { z } from 'zod';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');
const MIG = read('supabase', 'migrations', '20261123090000_tuition_bill_check.sql');
// tuition_bill_expected under the rules calculate-tuition prices by now.
const MIG_RULES = read('supabase', 'migrations', '20261123150000_tuition_bill_expected_new_rules.sql');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

// ------------------------------------------------------------------ month
// The fixtures sit in the CURRENT Hanoi month, so the refresh (which only
// reprices this month and, early on, the last) acts on them for real.
const hanoi = new Date(Date.now() + 7 * 3600 * 1000);
const MONTH = `${hanoi.getUTCFullYear()}-${String(hanoi.getUTCMonth() + 1).padStart(2, '0')}`;
const day = (n) => `${MONTH}-${String(n).padStart(2, '0')}`;
const dow = (n) => new Date(`${day(n)}T12:00:00Z`).getUTCDay();

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), PARENT = U(2);
const CA = U(31), CB = U(32);
const K = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`K${i + 1}`, U(101 + i)]));

// ----------------------------------------------------------------- schema
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL, is_active boolean DEFAULT true, family_id uuid, deactivated_at date);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text, session_rate_vnd integer NOT NULL DEFAULT 0);
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TYPE public.attendance_status AS ENUM ('Present','Absent','Excused','Late');
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, date date NOT NULL, status public.session_status NOT NULL);
  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, student_id uuid, status public.attendance_status NOT NULL);
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, start_date date NOT NULL, end_date date,
    created_at timestamptz DEFAULT now(), allowed_days integer[], rate_override_vnd integer,
    discount_type text, discount_value numeric, discount_cadence text);
  CREATE TABLE public.class_fee_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, effective_from date, session_rate_vnd integer);
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    paid_amount integer NOT NULL DEFAULT 0, recorded_payment integer DEFAULT 0,
    carry_in_credit integer DEFAULT 0, carry_in_debt integer DEFAULT 0, carry_out_credit integer DEFAULT 0, carry_out_debt integer DEFAULT 0,
    class_breakdown jsonb DEFAULT '[]'::jsonb, review_flags jsonb DEFAULT '[]'::jsonb,
    confirmation_status text DEFAULT 'auto_approved', confirmed_at timestamptz, confirmed_by uuid,
    tuition_frozen boolean NOT NULL DEFAULT false, frozen_reason text,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    UNIQUE (student_id, month));
  CREATE TABLE public.schedule_runner(id integer PRIMARY KEY, token text NOT NULL);
  INSERT INTO public.schedule_runner VALUES (1, 'runner-token-for-the-test-only');
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin'), ('${PARENT}', 'family');
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
ok('installs', (await tryIt(() => db.exec(MIG))) === null);
ok('installs twice', (await tryIt(() => db.exec(MIG))) === null);
ok('the new lesson rule installs over it', (await tryIt(() => db.exec(MIG_RULES))) === null);
ok('and installs twice', (await tryIt(() => db.exec(MIG_RULES))) === null);

// --------------------------------------------------------------- fixtures
// CA: mirror 210,000 but the fee history says 250,000 from the 1st (baseline 200,000).
// CB: 260,000, no history.
await db.query(`INSERT INTO public.classes VALUES ($1, 'Class A', 210000), ($2, 'Class B', 260000)`, [CA, CB]);
await db.query(`INSERT INTO public.class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1, '1900-01-01', 200000), ($1, $2, 250000)`, [CA, day(1)]);
const names = { K1: 'Peter', K2: 'Thien Kim (Lac)', K3: 'Right Bill', K4: 'Frozen Bill', K5: 'Wednesdays Only', K6: 'First Enrollment Free',
  K7: 'All Excused', K8: 'Register Moved', K9: 'Left Mid-Month', K10: 'Sibling Unresolved', K11: 'Saved But Still Differs', K12: 'Cancelled Only' };
for (const [k, n] of Object.entries(names)) await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [K[k], n]);

const sessions = {};
const sess = async (cls, d, status) => {
  const r = await db.query(`INSERT INTO public.sessions(class_id, date, status) VALUES ($1, $2, $3) RETURNING id`, [cls, day(d), status]);
  sessions[`${cls}|${d}`] = r.rows[0].id; return r.rows[0].id;
};
for (const d of [3, 5, 10, 12, 17, 19, 24]) await sess(CA, d, d < 20 ? 'Held' : 'Scheduled');
for (const d of [4, 6, 11, 13, 18, 20]) await sess(CB, d, d < 19 ? 'Held' : 'Scheduled');
await sess(CA, 26, 'Canceled');
const mark = (k, cls, d, status) => db.query(`INSERT INTO public.attendance(session_id, student_id, status) VALUES ($1, $2, $3)`, [sessions[`${cls}|${d}`], K[k], status]);
const enrol = (k, cls, from, to = null, extra = {}) => db.query(
  `INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, created_at, allowed_days, rate_override_vnd) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [K[k], cls, from, to, extra.created_at ?? '2026-01-01T00:00:00Z', extra.allowed_days ?? null, extra.rate_override_vnd ?? null]);

// K1 Peter: CA all month; Present, Absent, Late billable, and so are the two held lessons nobody
// marked (17th, 19th); Excused not; a Present mark on a cancelled lesson not. No bill.
await enrol('K1', CA, '2026-01-01');
await mark('K1', CA, 3, 'Present'); await mark('K1', CA, 5, 'Absent'); await mark('K1', CA, 10, 'Late');
await mark('K1', CA, 12, 'Excused'); await mark('K1', CA, 24, 'Present'); await mark('K1', CA, 26, 'Present');
// K2 Lạc: CB; a bill saved as 0 with no breakdown, from before the register existed.
await enrol('K2', CB, '2026-01-01');
for (const d of [4, 6, 11, 13]) await mark('K2', CB, d, 'Present');
await db.query(`INSERT INTO public.invoices(student_id, month, base_amount, total_amount, class_breakdown) VALUES ($1, $2, 0, 0, '[]')`, [K.K2, MONTH]);
// K3: CB at a custom rate ABOVE the class fee (300,000 against 260,000): the custom rate is
// the price. Bill saved by calculate-tuition below - must not be listed.
await enrol('K3', CB, '2026-01-01', null, { rate_override_vnd: 300000 });
for (const d of [4, 6]) await mark('K3', CB, d, 'Present');
// K4: frozen bill with other figures - kept on purpose, not listed.
await enrol('K4', CB, '2026-01-01');
await mark('K4', CB, 4, 'Present');
await db.query(`INSERT INTO public.invoices(student_id, month, base_amount, total_amount, tuition_frozen) VALUES ($1, $2, 999, 999, true)`, [K.K4, MONTH]);
// K5: CA on one weekday only (that of the 3rd): that weekday's four lessons, marked or not;
// the marks on the other weekday do not count.
await enrol('K5', CA, '2026-01-01', null, { allowed_days: [dow(3)] });
for (const d of [3, 5, 10, 12]) await mark('K5', CA, d, 'Present');
// K6: two overlapping enrollments of CA; the FIRST created has a zero rate, so nothing is billable.
await enrol('K6', CA, '2026-01-01', null, { created_at: '2026-01-01T00:00:00Z', rate_override_vnd: 0 });
await enrol('K6', CA, '2026-01-01', null, { created_at: '2026-02-01T00:00:00Z' });
for (const d of [3, 5]) await mark('K6', CA, d, 'Present');
// K7: every lesson excused, no bill: nothing owed, not listed.
await enrol('K7', CB, '2026-01-01');
for (const d of [4, 6, 11, 13, 18, 20]) await mark('K7', CB, d, 'Excused');
// K8: bill priced for three lessons; one has since been excused.
await enrol('K8', CB, '2026-01-01');
await mark('K8', CB, 4, 'Present'); await mark('K8', CB, 6, 'Present'); await mark('K8', CB, 11, 'Excused');
// The later lessons are excused too (a lesson with NO mark would be billed):
// this child's bill moved by a decision.
await mark('K8', CB, 13, 'Excused'); await mark('K8', CB, 18, 'Excused'); await mark('K8', CB, 20, 'Excused');
await db.query(`INSERT INTO public.invoices(student_id, month, base_amount, total_amount) VALUES ($1, $2, 780000, 780000)`, [K.K8, MONTH]);
// K9: left CA on the 10th, at a custom rate BELOW the class fee (200,000 against 250,000);
// later marks do not count. No bill.
await enrol('K9', CA, '2026-01-01', day(10), { rate_override_vnd: 200000 });
for (const d of [3, 5, 10, 12, 17]) await mark('K9', CA, d, 'Present');
// K10, K11: lessons, no bill (the refresh's stand-in answers for them are rigged below).
await enrol('K10', CB, '2026-01-01'); await mark('K10', CB, 4, 'Present');
await enrol('K11', CB, '2026-01-01'); await mark('K11', CB, 6, 'Present');
// K12: enrolled for the day of the cancelled lesson only, with a Present mark on it: nothing owed.
await enrol('K12', CA, day(26), day(26)); await mark('K12', CA, 26, 'Present');

// ------------------------------------------------- PostgREST stand-in (SQL)
// Reads and writes the same database as the SQL check. Rows come back as JSON
// (dates as 'YYYY-MM-DD' text, as PostgREST sends them).
const IN_DB = new Set(['students', 'classes', 'sessions', 'attendance', 'enrollments', 'class_fee_history', 'invoices', 'schedule_runner', 'tuition_bill_check_runs']);
let invoiceWritesFor = new Set(); // children calculate-tuition saved a bill for
function sqlQuery(table, role = 'service_role') {
  const where = [], params = [];
  let mode = 'select', payload = null, conflict = '', order = '', lim = '';
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const col = (k) => `t.${k}`;
  async function run() {
    // The D2/D4 "bills not worked out again" views: rows a case sets, else none.
    if (globalThis.__tbPending?.[table]) return { data: globalThis.__tbPending[table], error: null };
    if (!IN_DB.has(table)) return { data: [], error: null }; // discounts, bonuses, families: none here
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') {
        const rows = (await db.query(`SELECT to_jsonb(t) AS j FROM public.${table} t${w}${order}${lim}`, params)).rows.map((r) => r.j);
        if (table === 'students') rows.forEach((r) => { r.families = null; });
        if (table === 'sessions') {
          const cls = (await db.query(`SELECT to_jsonb(c) AS j FROM public.classes c`)).rows.map((r) => r.j);
          rows.forEach((r) => { const c = cls.find((x) => x.id === r.class_id); r.classes = c ? { session_rate_vnd: c.session_rate_vnd } : null; });
        }
        return { data: rows, error: null };
      }
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        const keys = Object.keys(row);
        if (table === 'invoices') invoiceWritesFor.add(row.student_id);
        const ins = `INSERT INTO public.${table} (${keys.join(', ')}) SELECT ${keys.join(', ')} FROM jsonb_populate_record(null::public.${table}, $1::jsonb)`;
        const sql = mode === 'upsert'
          ? `${ins} ON CONFLICT (${conflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`
          : ins;
        await db.exec(`SET ROLE ${role}`);
        try { await db.query(sql, [JSON.stringify(row)]); } finally { await db.exec('RESET ROLE'); }
      }
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
  const q = {
    select() { return q; },
    eq(k, v) { where.push(`${col(k)}::text = ${p(String(v))}`); return q; },
    neq(k, v) { where.push(`${col(k)}::text <> ${p(String(v))}`); return q; },
    in(k, vs) { where.push(vs.length ? `${col(k)}::text IN (${vs.map((v) => p(String(v))).join(', ')})` : 'false'); return q; },
    gte(k, v) { where.push(`${col(k)} >= ${p(v)}`); return q; },
    gt(k, v) { where.push(`${col(k)}::text > ${p(String(v))}`); return q; },
    lt(k, v) { where.push(`${col(k)} < ${p(v)}`); return q; },
    lte(k, v) { where.push(`${col(k)} <= ${p(v)}`); return q; },
    or() { return q; },
    order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} ${col(k)} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
    limit(n) { lim = ` LIMIT ${Number(n)}`; return q; },
    upsert(v, o = {}) { mode = 'upsert'; payload = v; conflict = o.onConflict; return q; },
    insert(v) { mode = 'insert'; payload = v; return q; },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    then(a, b) { return run().then(a, b); },
  };
  return q;
}
const asRole = async (role, uid, fn) => {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid ?? '']);
  try { return await fn(); } finally { await db.exec('RESET ROLE'); await db.query(`SELECT set_config('test.uid', '', false)`); }
};
const rpc = async (name, args) => {
  try {
    const r = await asRole('service_role', null, () => db.query(`SELECT to_jsonb(x) AS j FROM public.${name}($1) x`, [args.p_month]));
    return { data: r.rows.map((x) => x.j), error: null };
  } catch (e) { return { data: null, error: { message: e.message, code: e.code } }; }
};

// ------------------------------------------------------------- the bundles
const out = mkdtempSync(join(tmpdir(), 'tuition-bill-check-'));
const libDir = resolve(repo, 'supabase', 'functions', '_lib');
const handlers = {};
let gate = null; // what requireRole answers; null = 401
globalThis.__tbZod = z;
globalThis.__tbClient = () => ({
  from: (table) => sqlQuery(table),
  rpc,
  functions: { invoke: async () => ({ data: null, error: new Error('no nested functions here') }) },
});
globalThis.__tbGate = () => gate ?? new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
globalThis.Deno = { env: { get: (k) => (k === 'SUPABASE_URL' ? 'http://functions.test' : 'service-key-test-only') }, serve: (h) => { handlers.current = h; } };
const bundle = async (name) => {
  const b = await build({
    entryPoints: [resolve(repo, 'supabase', 'functions', name, 'index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(bd) {
      bd.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/clock\.ts$|\/rate-limit\.ts$)/ }, (a) => ({ path: a.path, namespace: 'test' }));
      bd.onResolve({ filter: /\/_lib\/[^/]+\.ts$/ }, (a) => ({ path: join(libDir, a.path.split('/').pop()) }));
      bd.onLoad({ filter: /.*/, namespace: 'test' }, (a) => ({ loader: 'js', contents:
        a.path.includes('supabase-js') ? 'export const createClient = (...x) => globalThis.__tbClient(...x);' :
        a.path.includes('zod') ? 'export const z = globalThis.__tbZod;' :
        a.path.endsWith('/auth.ts') ? 'export const requireRole = async () => globalThis.__tbGate(); export const callerOwnsStudent = async () => true;' :
        a.path.endsWith('/clock.ts') ? 'export const clockNow = () => new Date(globalThis.__hecNow ?? "2000-01-01T00:00:00Z");' :
        a.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async () => { throw new Error("no families here"); };' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};',
      }));
    } }],
  });
  const f = join(out, `${name}.mjs`);
  writeFileSync(f, b.outputFiles[0].text);
  await import(pathToFileURL(f).href);
  handlers[name] = handlers.current;
};
await bundle('calculate-tuition');
await bundle('refresh-month-bills');
const post = (body, headers = {}) => new Request('http://functions.test/fn', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const calc = async (studentId, preview) => {
  gate = { isServiceRole: true, roles: new Set(['service_role']), userId: '' };
  const res = await handlers['calculate-tuition'](post({ studentId, month: MONTH, siblingPreview: preview }));
  return { status: res.status, body: await res.json() };
};

// ------------------------------------------- 1. the same price as calculate-tuition
console.log('\n1. the check prices lessons as calculate-tuition does');
{
  const expected = new Map((await asRole('service_role', null, () => db.query(`SELECT * FROM public.tuition_bill_expected($1)`, [MONTH]))).rows
    .map((r) => [r.student_id, Number(r.expected_base)]));
  for (const k of Object.keys(names)) {
    const r = await calc(K[k], true);
    // A frozen bill answers with its frozen figures; its lessons are still priced in the breakdown.
    const lessons = (r.body.breakdown?.classes ?? []).reduce((t, c) => t + c.amount_vnd, 0);
    const priced = r.body.tuitionFrozen ? lessons : r.body.baseAmount;
    ok(`${names[k]}: calculate-tuition ${priced} = check ${expected.get(K[k]) ?? 0}${r.body.tuitionFrozen ? ' (frozen: its lessons)' : ''}`,
      r.status === 200 && priced === (expected.get(K[k]) ?? 0) && lessons === priced, r.body);
  }
  ok('Peter: Present + Absent + Late + a coming lesson + two held lessons with no mark, at the history fee (6 x 250,000); not Excused, not the cancelled lesson', expected.get(K.K1) === 1500000, expected.get(K.K1));
  ok('Lạc: four marked lessons and two unmarked, all billed (6 x 260,000)', expected.get(K.K2) === 1560000, expected.get(K.K2));
  ok('a custom rate above the class fee is the price (6 x 300,000)', expected.get(K.K3) === 1800000, expected.get(K.K3));
  ok('one weekday only: its 4 lessons', expected.get(K.K5) === 1000000, expected.get(K.K5));
  ok('the first-created enrollment decides (zero rate): nothing', !expected.has(K.K6));
  ok('left on the 10th: 3 lessons at the custom rate below the fee (3 x 200,000)', expected.get(K.K9) === 600000, expected.get(K.K9));
  ok('all excused / cancelled only: nothing', !expected.has(K.K7) && !expected.has(K.K12));
  ok('preview saved no bill', invoiceWritesFor.size === 0, [...invoiceWritesFor]);
  // K3's bill, saved the real way.
  const saved = await calc(K.K3, false);
  ok('calculate-tuition saves K3', saved.status === 200 && saved.body.invoiceSaved === true, saved.body);
}

// ------------------------------------------------------------- 2. the gaps
console.log('\n2. what the check lists');
const gapsNow = async () => (await rpc('tuition_bill_gaps', { p_month: MONTH })).data;
{
  const g = await gapsNow();
  const by = new Map(g.map((r) => [r.student_id, r]));
  ok('Peter: no bill', by.get(K.K1)?.problem === 'missing' && by.get(K.K1)?.expected_base === 1500000, by.get(K.K1));
  ok('Lạc: a bill of 0', by.get(K.K2)?.problem === 'zero' && by.get(K.K2)?.saved_base === 0 && by.get(K.K2)?.expected_base === 1560000, by.get(K.K2));
  ok('the register moved away from the bill', by.get(K.K8)?.problem === 'differs' && by.get(K.K8)?.expected_base === 520000, by.get(K.K8));
  ok('weekday-only and mid-month leaver: no bill', by.get(K.K5)?.problem === 'missing' && by.get(K.K9)?.problem === 'missing');
  ok('a bill calculate-tuition just saved is not listed', !by.has(K.K3));
  ok('a frozen bill is not listed', !by.has(K.K4));
  ok('nothing owed, no bill: not listed', !by.has(K.K6) && !by.has(K.K7) && !by.has(K.K12));
  ok('exactly the seven', g.length === 7, g.map((r) => r.full_name));
  const bad = await tryIt(() => asRole('service_role', null, () => db.query(`SELECT * FROM public.tuition_bill_gaps('2026-13')`)));
  ok('a malformed month is refused', bad?.code === '22023', bad);
}

// --------------------------------------------------------- 3. who may run it
console.log('\n3. who may run it');
{
  const asAdmin = await tryIt(() => asRole('authenticated', ADMIN, () => db.query(`SELECT * FROM public.tuition_bill_gaps($1)`, [MONTH])));
  ok('an admin may', asAdmin === null, asAdmin);
  const asParent = await tryIt(() => asRole('authenticated', PARENT, () => db.query(`SELECT * FROM public.tuition_bill_gaps($1)`, [MONTH])));
  ok('a parent may not', asParent?.code === '42501', asParent);
  const asAnon = await tryIt(() => asRole('anon', null, () => db.query(`SELECT * FROM public.tuition_bill_gaps($1)`, [MONTH])));
  ok('anon may not', asAnon?.code === '42501', asAnon);
  const expectedByAdmin = await tryIt(() => asRole('authenticated', ADMIN, () => db.query(`SELECT * FROM public.tuition_bill_expected($1)`, [MONTH])));
  ok('tuition_bill_expected is the service role\'s alone', expectedByAdmin?.code === '42501', expectedByAdmin);
}

// ------------------------------------------------------ 4. refresh-month-bills
console.log('\n4. refresh-month-bills');
const realFetch = globalThis.fetch;
const realTimeout = globalThis.setTimeout;
const calls = [];
let rateLimitedOnce = false;
globalThis.setTimeout = (fn) => realTimeout(fn, 0); // no real pacing in the test
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  calls.push({ url: String(url), studentId: body.studentId, month: body.month, auth: init.headers.Authorization });
  const reply = (status, b) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
  if (!String(url).endsWith('/functions/v1/calculate-tuition')) return reply(404, { error: 'unexpected url' });
  if (body.studentId === K.K9 && !rateLimitedOnce) { rateLimitedOnce = true; return reply(429, { error: 'Rate limit exceeded.', retryAfter: 1 }); }
  if (body.studentId === K.K10) return reply(200, { invoiceSaved: false, siblingUnresolved: true, baseAmount: 260000 });
  if (body.studentId === K.K11) return reply(200, { invoiceSaved: true, baseAmount: 260000 }); // says saved, wrote nothing
  // Everyone else: the real calculate-tuition, as the service role.
  gate = { isServiceRole: true, roles: new Set(['service_role']), userId: '' };
  return handlers['calculate-tuition'](new Request(url, { method: 'POST', headers: init.headers, body: init.body }));
};
try {
  gate = null;
  const denied = await handlers['refresh-month-bills'](post({}));
  ok('no runner token, no admin session: refused', denied.status === 401, denied.status);
  const wrongToken = await handlers['refresh-month-bills'](post({}, { 'x-schedule-runner-secret': 'runner-token-for-the-test-onlx' }));
  ok('a wrong runner token is not a timer run', wrongToken.status === 401, wrongToken.status);
  ok('nothing was recalculated by a refused caller', calls.length === 0, calls);

  const res = await handlers['refresh-month-bills'](post({}, { 'x-schedule-runner-secret': 'runner-token-for-the-test-only' }));
  const body = await res.json();
  const run = body.months?.find((m) => m.month === MONTH);
  ok('the timer run answers', res.status === 200 && !!run, body);
  ok('it looked at the seven listed', run?.found === 7, run);
  ok('every call went to calculate-tuition with the service key', calls.length > 0 && calls.every((c) => c.auth === 'Bearer service-key-test-only'), calls);
  ok('a 429 was retried once', calls.filter((c) => c.studentId === K.K9).length === 2, calls.filter((c) => c.studentId === K.K9));
  ok('five bills saved (Peter, Lạc, register moved, weekday-only, leaver)', run?.recalculated === 5, run?.recalculated);
  const failedBy = new Map((run?.failed ?? []).map((f) => [f.student_id, f]));
  ok('the unresolved family discount is reported by name', /sibling discount/.test(failedBy.get(K.K10)?.error ?? '') && failedBy.get(K.K10)?.name === 'Sibling Unresolved', run?.failed);
  ok('saved-but-still-differs is reported as a disagreement', /disagree/.test(failedBy.get(K.K11)?.error ?? ''), run?.failed);
  ok('still open: exactly those two', (run?.still_open ?? []).map((r) => r.student_id).sort().join() === [K.K10, K.K11].sort().join(), run?.still_open);
  ok('the answer says not everything is right', body.ok === false);
  const g = await gapsNow();
  ok('the check now lists only those two', g.length === 2, g.map((r) => r.full_name));
  const lac = (await db.query(`SELECT base_amount, total_amount, jsonb_array_length(class_breakdown) AS n FROM public.invoices WHERE student_id = $1 AND month = $2`, [K.K2, MONTH])).rows[0];
  ok('Lạc\'s bill now prices her six lessons', lac.base_amount === 1560000 && lac.n === 1, lac);
  const peter = (await db.query(`SELECT base_amount FROM public.invoices WHERE student_id = $1 AND month = $2`, [K.K1, MONTH])).rows[0];
  ok('Peter has a bill', peter?.base_amount === 1500000, peter);
  const frozen = (await db.query(`SELECT base_amount FROM public.invoices WHERE student_id = $1 AND month = $2`, [K.K4, MONTH])).rows[0];
  ok('the frozen bill was not touched', frozen.base_amount === 999 && !calls.some((c) => c.studentId === K.K4));
  const logged = (await db.query(`SELECT started_by, found, recalculated, jsonb_array_length(failed) AS f, jsonb_array_length(still_open) AS o FROM public.tuition_bill_check_runs WHERE month = $1`, [MONTH])).rows;
  ok('the run is recorded', logged.length === 1 && logged[0].started_by === 'timer' && logged[0].found === 7 && logged[0].f === 2 && logged[0].o === 2, logged);

  // The log: admins read it; nobody signed in writes it.
  const adminReads = await asRole('authenticated', ADMIN, () => db.query(`SELECT count(*)::int AS n FROM public.tuition_bill_check_runs`));
  const parentReads = await asRole('authenticated', PARENT, () => db.query(`SELECT count(*)::int AS n FROM public.tuition_bill_check_runs`));
  ok('an admin reads the run log; a parent sees none', adminReads.rows[0].n === 1 && parentReads.rows[0].n === 0);
  const adminWrites = await tryIt(() => asRole('authenticated', ADMIN, () => db.query(`INSERT INTO public.tuition_bill_check_runs(month, started_by) VALUES ($1, 'admin')`, [MONTH])));
  ok('nobody signed in writes the run log', adminWrites?.code === '42501', adminWrites);

  // A checked change (a discount, a lesson cancel) whose bills were never worked out
  // again: the gaps check cannot see a discount, so the refresh saves those children
  // too - this month only, each once, and not twice when the gaps list holds them.
  globalThis.__tbPending = {
    money_change_tuition_pending: [{ override_id: U(901), refresh_pairs: [
      { student_id: K.K3, month: MONTH }, { student_id: K.K10, month: MONTH }, { student_id: K.K5, month: '2025-01' }] }],
    session_cancel_tuition_pending: [{ override_id: U(902), refresh_pairs: [{ student_id: K.K3, month: MONTH }] }],
  };
  const before = calls.length;
  const pend = await handlers['refresh-month-bills'](post({}, { 'x-schedule-runner-secret': 'runner-token-for-the-test-only' }));
  const pendRun = (await pend.json()).months?.find((m) => m.month === MONTH);
  const pendCalls = calls.slice(before);
  ok('a pending change\'s child is saved although the gaps list does not hold them', pendCalls.filter((c) => c.studentId === K.K3).length === 1, pendCalls);
  ok('  once, though two changes name them', pendCalls.filter((c) => c.studentId === K.K3).length === 1);
  ok('  a child the gaps list already holds is not called twice', pendCalls.filter((c) => c.studentId === K.K10).length === 1, pendCalls);
  ok('  an earlier month of a pending change is not repriced by the timer', !pendCalls.some((c) => c.month === '2025-01' || c.studentId === K.K5), pendCalls);
  ok('  counted in the run: found = the two still listed + the pending one', pendRun?.found === 3 && pendRun?.recalculated === 1, pendRun);
  globalThis.__tbPending = null;

  // An admin: this month yes, an old month no.
  gate = { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN };
  const old = await handlers['refresh-month-bills'](post({ month: '2025-01' }));
  ok('an admin may not reprice an earlier month', old.status === 400 && /earlier month/.test((await old.json()).error));
  gate = { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN };
  const mine = await handlers['refresh-month-bills'](post({ month: MONTH }));
  const mineBody = await mine.json();
  ok('an admin may refresh this month, recorded as an admin run', mine.status === 200 && mineBody.months?.[0]?.started_by === 'admin' && mineBody.months?.[0]?.actor_user_id === ADMIN, mineBody);
} finally {
  globalThis.fetch = realFetch;
  globalThis.setTimeout = realTimeout;
}

// ------------------------------------------------ month helpers, readRecalc
{
  const f = join(out, 'bill-refresh.mjs');
  writeFileSync(f, (await build({ entryPoints: [join(libDir, 'bill-refresh.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const m = await import(pathToFileURL(f).href);
  ok('Hanoi month: 31 Dec 18:00 UTC is already January', m.hanoiMonthDay(new Date('2026-12-31T18:00:00Z')).month === '2027-01');
  ok('the first five days also refresh last month', m.refreshableMonths(new Date('2026-12-03T03:00:00Z')).join() === '2026-11,2026-12');
  ok('after that, this month only', m.refreshableMonths(new Date('2026-12-06T03:00:00Z')).join() === '2026-12');
  ok('January\'s last month is December', m.previousMonth('2027-01') === '2026-12');
  ok('an admin: this month and last only', m.adminMayRefresh('2026-11', new Date('2026-12-20T03:00:00Z')) && !m.adminMayRefresh('2026-10', new Date('2026-12-20T03:00:00Z')) && !m.adminMayRefresh('2027-01', new Date('2026-12-20T03:00:00Z')));
  ok('readRecalc: 200 saved is ok', m.readRecalc(200, { invoiceSaved: true }).ok === true);
  ok('readRecalc: 200 not saved is a failure', m.readRecalc(200, { invoiceSaved: false }).ok === false);
  ok('readRecalc: 429 carries the wait', m.readRecalc(429, { retryAfter: 7 }).retryAfterSeconds === 7);
  ok('pendingChangeStudents: this month, unique, skipping the listed', m.pendingChangeStudents([
    { refresh_pairs: [{ student_id: 'a', month: '2026-11' }, { student_id: 'b', month: '2026-10' }, { student_id: 'c', month: '2026-11' }] },
    { refresh_pairs: [{ student_id: 'a', month: '2026-11' }, { student_id: 'd', month: '2026-11' }] },
    { refresh_pairs: null }, {}], '2026-11', new Set(['c'])).join() === 'a,d');
  ok('readRecalc: 400 carries the error', m.readRecalc(400, { error: 'Unable to read' }).error === 'Unable to read');
}

// ------------------------------------------- 5. schedule-sessions is honest
console.log('\n5. the nightly rebuild no longer claims to refresh bills');
{
  const s = read('supabase', 'functions', 'schedule-sessions', 'index.ts').replace(/\/\/[^\n]*/g, '');
  ok('schedule-sessions does not call calculate-tuition-bulk', !/calculate-tuition-bulk/.test(s));
  ok('and says where bills are saved', /refresh-month-bills/.test(s));
  ok('refresh-month-bills is in config.toml with verify_jwt', /\[functions\.refresh-month-bills\]\s*\r?\nverify_jwt = true/.test(read('supabase', 'config.toml')));
  ok('the hourly job is scheduled by the migration', /cron\.schedule\(\s*'refresh-month-bills'/.test(MIG) && /x-schedule-runner-secret/.test(MIG));
}

// ------------------------------ 6. no bill for a child who is not in the month
// Owner, 24 Nov 2026: a child who left stays in their last month and is dropped
// from the next. calculate-tuition saved a bill on every call, so opening a
// departed child's page left an empty bill in every month anybody looked at.
console.log('\n6. a child with no enrolment in the month gets no new bill');
{
  const G = Object.fromEntries(['Left Last Month', 'Left, Bill Exists', 'Never Enrolled', 'Left On The First', 'Starts Next Month', 'Left, Paying Late', 'Left, Family Asks']
    .map((n, i) => [n, U(201 + i)]));
  for (const [n, id] of Object.entries(G)) await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [id, n]);
  const prevEnd = new Date(Date.parse(`${day(1)}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const [yy, mm] = MONTH.split('-').map(Number);
  const nextStart = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
  const enrolG = (n, from, to) => db.query(
    `INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, created_at) VALUES ($1, $2, $3, $4, '2026-01-01T00:00:00Z')`, [G[n], CA, from, to]);
  for (const n of ['Left Last Month', 'Left, Bill Exists', 'Left, Paying Late', 'Left, Family Asks']) await enrolG(n, '2025-01-01', prevEnd);
  await enrolG('Left On The First', '2025-01-01', day(1));
  await enrolG('Starts Next Month', nextStart, null);
  await db.query(`INSERT INTO public.invoices(student_id, month, base_amount, total_amount) VALUES ($1, $2, 0, 0)`, [G['Left, Bill Exists'], MONTH]);
  const billOf = async (n) => (await db.query(`SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2`, [G[n], MONTH])).rows[0] ?? null;
  const service = { isServiceRole: true, roles: new Set(['service_role']), userId: '' };
  const callAs = async (who, body) => {
    gate = who;
    const res = await handlers['calculate-tuition'](post({ month: MONTH, ...body }));
    return { status: res.status, body: await res.json() };
  };

  invoiceWritesFor = new Set();
  let r = await callAs(service, { studentId: G['Left Last Month'] });
  ok('left last month, no bill: answered, nothing charged, and NO bill is made',
    r.status === 200 && r.body.baseAmount === 0 && r.body.totalAmount === 0 && r.body.invoiceSaved === false
      && r.body.noBill?.reason === 'not_enrolled' && (await billOf('Left Last Month')) === null && invoiceWritesFor.size === 0, r.body);
  r = await callAs({ isServiceRole: false, roles: new Set(['admin']), userId: ADMIN }, { studentId: G['Left Last Month'] });
  ok('an admin opening that child\'s page makes no bill either', r.status === 200 && r.body.noBill?.reason === 'not_enrolled' && (await billOf('Left Last Month')) === null, r.body);
  r = await callAs(service, { studentId: G['Never Enrolled'] });
  ok('never enrolled: no bill', r.status === 200 && r.body.invoiceSaved === false && !!r.body.noBill && (await billOf('Never Enrolled')) === null, r.body);
  r = await callAs(service, { studentId: G['Starts Next Month'] });
  ok('starts on the 1st of next month: no bill this month', r.status === 200 && !!r.body.noBill && (await billOf('Starts Next Month')) === null, r.body);

  r = await callAs(service, { studentId: G['Left On The First'] });
  ok('last day is the 1st: still in the month, so the bill is saved as before',
    r.status === 200 && r.body.invoiceSaved === true && r.body.noBill === undefined && (await billOf('Left On The First')) !== null, r.body);
  r = await callAs(service, { studentId: G['Left, Bill Exists'] });
  ok('a bill that already exists is refreshed as before, never dropped by this rule',
    r.status === 200 && r.body.invoiceSaved === true && r.body.noBill === undefined && (await billOf('Left, Bill Exists')) !== null, r.body);

  // A payment path asks for the bill it needs (record-payment sends createBill).
  r = await callAs(service, { studentId: G['Left, Paying Late'], createBill: true });
  const made = await billOf('Left, Paying Late');
  ok('a payment path asks for one: the bill is made, at nothing charged',
    r.status === 200 && r.body.invoiceSaved === true && r.body.noBill === undefined && made !== null && Number(made.base_amount) === 0 && Number(made.total_amount) === 0, { body: r.body, made });
  r = await callAs({ isServiceRole: false, roles: new Set(['family']), userId: PARENT }, { studentId: G['Left, Family Asks'], createBill: true });
  ok('a family cannot ask for one', r.status === 200 && !!r.body.noBill && (await billOf('Left, Family Asks')) === null, r.body);
  r = await callAs({ isServiceRole: false, roles: new Set(['admin']), userId: ADMIN }, { studentId: G['Left, Family Asks'], createBill: true });
  ok('an admin can', r.status === 200 && r.body.invoiceSaved === true && (await billOf('Left, Family Asks')) !== null, r.body);

  ok('the check lists none of these children', (await gapsNow()).every((g) => !Object.values(G).includes(g.student_id)));
  const m = await import(pathToFileURL(join(out, 'bill-refresh.mjs')).href);
  ok('readRecalc: no bill and none due is not a failure', m.readRecalc(200, { invoiceSaved: false, noBill: { reason: 'not_enrolled' } }).ok === true);
  ok('readRecalc: not saved for any other reason still is', m.readRecalc(200, { invoiceSaved: false, siblingUnresolved: true }).ok === false);
  const rp = read('supabase', 'functions', 'record-payment', 'index.ts').replace(/\/\/[^\n]*/g, '');
  ok('record-payment asks for the missing bill', /recalc\("price the missing bill", true\)/.test(rp) && /createBill: true/.test(rp));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
