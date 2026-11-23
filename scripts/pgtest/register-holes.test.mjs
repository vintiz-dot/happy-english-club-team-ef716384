// A hole in the register must never lower a bill that is already saved
// (supabase/functions/_lib/register-holes.ts, calculate-tuition,
//  calculate-tuition-bulk, refresh-month-bills, _lib/bill-refresh.ts).
//
// August 2026: a child's marks for March-August were deleted by an old
// class-transfer function. Her August bill (8 lessons, 1,680,000 VND, paid in
// cash, confirmed by an admin) was repriced to 0 by one click on Manual Tuition
// Recalculation, because tuition bills a lesson only when the child has a
// Present / Absent / Late row for it. A held lesson inside the enrolment with no
// row at all is not a decision anybody made: it is a hole.
//
// The REAL calculate-tuition, calculate-tuition-bulk and refresh-month-bills
// (bundled; auth, rate limit and the sibling resolver stubbed) run over an
// in-process Postgres through a stand-in for PostgREST. Fixtures sit in LAST
// month (Hanoi), so every lesson is in the past whatever day this runs; the
// "today or later" cases use the current month.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');
const MIG = read('supabase', 'migrations', '20261123090000_tuition_bill_check.sql');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

// ------------------------------------------------------------------ months
const hanoi = new Date(Date.now() + 7 * 3600 * 1000);
const pad = (n) => String(n).padStart(2, '0');
const CUR = `${hanoi.getUTCFullYear()}-${pad(hanoi.getUTCMonth() + 1)}`;
const PREV = hanoi.getUTCMonth() === 0 ? `${hanoi.getUTCFullYear() - 1}-12` : `${hanoi.getUTCFullYear()}-${pad(hanoi.getUTCMonth())}`;
const TODAY = hanoi.toISOString().slice(0, 10);
const prevDay = (n) => `${PREV}-${pad(n)}`;
const wd = (date) => new Date(`${date}T12:00:00+07:00`).getDay(); // the weekday rule of the calculators

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), FAMILY = U(2), STUDENT = U(3);
const classOf = {}; // every child has a class of their own, so lessons are not shared
let kidCounter = 100, classCounter = 5000;
const kids = {};

// ----------------------------------------------------------------- schema
const db = new PGlite();
const SCHEMA = `
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
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin'), ('${FAMILY}', 'family'), ('${STUDENT}', 'student');
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;
await db.exec(SCHEMA);
ok('the check migration installs', (await tryIt(() => db.exec(MIG))) === null);

// --------------------------------------------------------------- fixtures
const newKid = async (name) => {
  const id = U(kidCounter++);
  await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [id, name]);
  kids[name] = id;
  classOf[id] = U(classCounter++);
  await db.query(`INSERT INTO public.classes VALUES ($1, 'Class A', 210000)`, [classOf[id]]);
  return id;
};
const sess = async (cls, date, status) =>
  (await db.query(`INSERT INTO public.sessions(class_id, date, status) VALUES ($1, $2, $3) RETURNING id`, [cls, date, status])).rows[0].id;
const mark = (sessionId, kid, status) => db.query(`INSERT INTO public.attendance(session_id, student_id, status) VALUES ($1, $2, $3)`, [sessionId, kid, status]);
const enrol = (kid, from, extra = {}) => db.query(
  `INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, created_at, allowed_days) VALUES ($1, $2, $3, $4, '2026-01-01T00:00:00Z', $5)`,
  [kid, classOf[kid], from, extra.to ?? null, extra.allowed_days ?? null]);
const bill = (kid, month, base, extra = {}) => db.query(
  `INSERT INTO public.invoices(student_id, month, base_amount, total_amount, paid_amount, recorded_payment, status, confirmation_status, confirmed_at, confirmed_by, tuition_frozen, class_breakdown)
   VALUES ($1, $2, $3, $3, $4, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
  [kid, month, base, extra.paid ?? 0, extra.status ?? 'issued', extra.confirmation ?? 'auto_approved',
    extra.confirmation === 'confirmed' ? '2026-09-01T00:00:00Z' : null, extra.confirmation === 'confirmed' ? ADMIN : null,
    extra.frozen ?? false, JSON.stringify(extra.breakdown ?? [])]);
const breakdownOf = (kid, amount, lessons) => [{ class_id: classOf[kid], class_name: 'Class A', amount_vnd: amount, net_amount_vnd: amount, sessions_count: lessons, session_rate_vnd: 210000 }];

/** n Held lessons of PREV on days 2, 4, ..., first `marked` of them with the given mark statuses (the rest no row). */
const lessonsOf = async (kid, days, marks = {}) => {
  for (const d of days) {
    const id = await sess(classOf[kid], prevDay(d), 'Held');
    if (marks[d]) await mark(id, kid, marks[d]);
  }
};
const EIGHT = [2, 4, 6, 8, 10, 12, 14, 16];
const augustCase = async (name) => {
  const k = await newKid(name);
  await enrol(k, '2026-01-01');
  await lessonsOf(k, EIGHT);
  await bill(k, PREV, 1680000, { paid: 1680000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(k, 1680000, 8) });
  return k;
};

// ------------------------------------------------- PostgREST stand-in (SQL)
const IN_DB = new Set(['students', 'classes', 'sessions', 'attendance', 'enrollments', 'class_fee_history', 'invoices', 'schedule_runner', 'tuition_bill_check_runs']);
const invoiceWrites = []; // every upsert calculate-tuition made on an invoice: { student_id, month, keys }
function sqlQuery(table, role = 'service_role') {
  const where = [], params = [];
  let mode = 'select', payload = null, conflict = '', order = '', lim = '';
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const col = (k) => `t.${k}`;
  async function run() {
    if (!IN_DB.has(table)) return { data: [], error: null };
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') {
        const rows = (await db.query(`SELECT to_jsonb(t) AS j FROM public.${table} t${w}${order}${lim}`, params)).rows.map((r) => r.j);
        if (table === 'students') rows.forEach((r) => { r.families = r.family_id ? { id: r.family_id, sibling_percent_override: null } : null; });
        if (table === 'sessions') {
          const cls = (await db.query(`SELECT to_jsonb(c) AS j FROM public.classes c`)).rows.map((r) => r.j);
          rows.forEach((r) => { const c = cls.find((x) => x.id === r.class_id); r.classes = c ? { session_rate_vnd: c.session_rate_vnd } : null; });
        }
        return { data: rows, error: null };
      }
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        const keys = Object.keys(row);
        if (table === 'invoices') invoiceWrites.push({ student_id: row.student_id, month: row.month, keys });
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
const rpc = async (name, args) => {
  try {
    await db.exec('SET ROLE service_role');
    try {
      const r = await db.query(`SELECT to_jsonb(x) AS j FROM public.${name}($1) x`, [args.p_month]);
      return { data: r.rows.map((x) => x.j), error: null };
    } finally { await db.exec('RESET ROLE'); }
  } catch (e) { return { data: null, error: { message: e.message, code: e.code } }; }
};

// ------------------------------------------------------------- the bundles
const out = mkdtempSync(join(tmpdir(), 'register-holes-'));
const libDir = resolve(repo, 'supabase', 'functions', '_lib');
const handlers = {};
let gate = null;
globalThis.__tbZod = z;
globalThis.__tbClient = () => ({ from: (table) => sqlQuery(table), rpc });
globalThis.__tbGate = () => gate ?? new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
globalThis.Deno = { env: { get: (k) => (k === 'SUPABASE_URL' ? 'http://functions.test' : 'service-key-test-only') }, serve: (h) => { handlers.current = h; } };
const bundleFile = async (entry, label) => {
  const b = await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(bd) {
      bd.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$|\/runner-secret\.ts$)/ }, (a) => ({ path: a.path, namespace: 'test' }));
      bd.onResolve({ filter: /\/_lib\/[^/]+\.ts$/ }, (a) => ({ path: join(libDir, a.path.split('/').pop()) }));
      bd.onLoad({ filter: /.*/, namespace: 'test' }, (a) => ({ loader: 'js', contents:
        a.path.includes('supabase-js') ? 'export const createClient = (...x) => globalThis.__tbClient(...x);' :
        a.path.includes('zod') ? 'export const z = globalThis.__tbZod;' :
        a.path.endsWith('/auth.ts') ? 'export const requireRole = async () => globalThis.__tbGate(); export const callerOwnsStudent = async () => true;' :
        a.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async (sb, ids) => { if (!globalThis.__tbSibling) throw new Error("no families here"); return globalThis.__tbSibling(ids); };' :
        a.path.endsWith('/runner-secret.ts') ? 'export const runnerSecretMatches = async (req) => req.headers.get("x-schedule-runner-secret") === "runner-token-for-the-test-only";' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};',
      }));
    } }],
  });
  const f = join(out, `${label}.mjs`);
  writeFileSync(f, b.outputFiles[0].text);
  await import(`${pathToFileURL(f).href}?v=${label}`);
  handlers[label] = handlers.current;
};
const fnEntry = (name) => resolve(repo, 'supabase', 'functions', name, 'index.ts');
await bundleFile(fnEntry('calculate-tuition'), 'calculate-tuition');
await bundleFile(fnEntry('calculate-tuition-bulk'), 'calculate-tuition-bulk');
await bundleFile(fnEntry('refresh-month-bills'), 'refresh-month-bills');

// The function as it was before this change: the newest commit of the file that
// does not yet know about holes. Not finding it is a FAILURE (the parity cases
// below would otherwise silently not run).
let haveOriginal = false;
try {
  const revs = execFileSync('git', ['log', '--format=%H', '-n', '60', '--', 'supabase/functions/calculate-tuition/index.ts'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\s+/).filter(Boolean);
  for (const rev of revs) {
    const src = execFileSync('git', ['show', `${rev}:supabase/functions/calculate-tuition/index.ts`], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
    if (src.includes('register-holes')) continue;
    const dir = mkdtempSync(join(out, 'orig-'));
    writeFileSync(join(dir, 'index.ts'), src);
    await bundleFile(join(dir, 'index.ts'), 'calculate-tuition-orig');
    haveOriginal = true;
    break;
  }
} catch (e) { console.log('  git:', e.message); }
ok('the pre-change calculate-tuition is found in git (the parity cases need it)', haveOriginal);

const post = (body, headers = {}) => new Request('http://functions.test/fn', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const CALLERS = {
  admin: { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN, email: 'admin@test.example' },
  family: { isServiceRole: false, roles: new Set(['family']), userId: FAMILY },
  student: { isServiceRole: false, roles: new Set(['student']), userId: STUDENT },
  service: { isServiceRole: true, roles: new Set(['service_role']), userId: '' },
};
const calc = async (studentId, month, who = 'admin', extra = {}, fn = 'calculate-tuition') => {
  gate = CALLERS[who];
  const res = await handlers[fn](post({ studentId, month, ...extra }));
  return { status: res.status, body: await res.json() };
};
const bulk = async (ids, month) => {
  gate = CALLERS.admin;
  const res = await handlers['calculate-tuition-bulk'](post({ studentIds: ids, month }));
  const body = await res.json();
  return new Map((body.results ?? []).map((r) => [r.studentId, r]));
};
const invoice = async (kid, month = PREV) =>
  (await db.query(`SELECT to_jsonb(i) AS j FROM public.invoices i WHERE student_id = $1 AND month = $2`, [kid, month])).rows[0]?.j ?? null;
const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row?.[k]]));
const flagOf = (row, type) => (row?.review_flags ?? []).find((f) => f.type === type);
const FIG = ['base_amount', 'discount_amount', 'total_amount'];
const KEPT = ['base_amount', 'discount_amount', 'total_amount', 'class_breakdown', 'status', 'confirmation_status', 'confirmed_at', 'confirmed_by', 'recorded_payment', 'paid_amount', 'tuition_frozen'];
// Every list a screen or the PDF can sum must agree with the figures answered.
const consistent = (b) => {
  const lines = (b.breakdown?.classes ?? []).reduce((n, c) => n + Number(c.amount_vnd ?? 0), 0);
  const discounts = (b.discounts ?? []).reduce((n, d) => n + Number(d.amount ?? 0), 0);
  return lines === b.baseAmount && Math.max(0, b.baseAmount - discounts) === b.totalAmount;
};
const withClock = async (iso, fn) => {
  const RealDate = Date, fixed = new RealDate(iso).getTime();
  globalThis.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
    static now() { return fixed; }
  };
  try { return await fn(); } finally { globalThis.Date = RealDate; }
};
const netSum = (r) => (r?.classNet ?? []).reduce((n, c) => n + c.net_vnd, 0);
const writesFor = (kid) => invoiceWrites.filter((w) => w.student_id === kid).length;

// ------------------------------------------------------- the pure module
console.log('\n0. the pure module');
{
  const f = join(out, 'register-holes.mjs');
  writeFileSync(f, (await build({ entryPoints: [join(libDir, 'register-holes.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const m = await import(pathToFileURL(f).href);
  ok('it imports nothing', !/^\s*import\s/m.test(read('supabase', 'functions', '_lib', 'register-holes.ts')));
  ok('Hanoi today: 30 Nov 18:00 UTC is already 1 Dec', m.hanoiToday(new Date('2026-11-30T18:00:00Z')) === '2026-12-01');
  const rules = {
    enrollmentFor: (s) => (s.date >= '2026-08-10' ? { allowed: s.allowed } : undefined),
    onAllowedDay: (s) => s.allowed !== false,
    rateOf: (s) => (s.rate === undefined ? 210000 : s.rate),
  };
  const S = (id, date, status, extra = {}) => ({ id, date, status, class_id: 'c', ...extra });
  const sessions = [
    S('held-hole', '2026-08-12', 'Held'),
    S('held-marked', '2026-08-13', 'Held'),
    S('scheduled', '2026-08-14', 'Scheduled'),
    S('canceled', '2026-08-15', 'Canceled'),
    S('today', '2026-08-20', 'Held'),
    S('later', '2026-08-21', 'Held'),
    S('before-enrolment', '2026-08-05', 'Held'),
    S('wrong-weekday', '2026-08-16', 'Held', { allowed: false }),
    S('zero-rate', '2026-08-17', 'Held', { rate: 0 }),
  ];
  const holes = m.findRegisterHoles(sessions, new Set(['held-marked']), '2026-08-20', rules);
  ok('only a past Held lesson inside the enrolment, weekday and rate, with no row, is a hole', holes.length === 1 && holes[0].session_id === 'held-hole', holes);
  ok('a hole sorts by date', m.findRegisterHoles([S('b', '2026-08-13', 'Held'), S('a', '2026-08-12', 'Held')], new Set(), '2026-09-01', rules).map((h) => h.session_id).join() === 'a,b');
  const D = (o) => m.decideHoles({ holeCount: 1, savedBase: 840, frozen: false, nBase: 420, wBase: 630, forced: false, ...o });
  ok('decide: N below the saved base and W not above it is priced as charged', D({}) === 'priced_as_charged');
  ok('decide: N below, W above the saved base is held', D({ wBase: 900 }) === 'held');
  ok('decide: W equal to the saved base is priced as charged', D({ wBase: 840 }) === 'priced_as_charged');
  ok('decide: N at or above the saved base, no holes, no saved bill or frozen are normal',
    D({ nBase: 840 }) === 'normal' && D({ nBase: 900 }) === 'normal' && D({ holeCount: 0 }) === 'normal' && D({ savedBase: null }) === 'normal' && D({ frozen: true }) === 'normal');
  ok('decide: a force is honoured only when the answer would be held', D({ wBase: 900, forced: true }) === 'forced' && D({ forced: true }) === 'priced_as_charged' && D({ forced: true, nBase: 900 }) === 'normal');
  ok('the held sentence is the plain one', m.heldSentence(3, '2026-08') === 'Held: 3 lessons in August have no mark. The bill stays as charged until the register is fixed.', m.heldSentence(3, '2026-08'));
  ok('one lesson reads in the singular', m.heldSentence(1, '2026-08') === 'Held: 1 lesson in August has no mark. The bill stays as charged until the register is fixed.');
  ok('flags that differ only in key order are the same', m.sameFlags([{ type: 'a', details: { x: 1, y: [1, 2] } }], [{ details: { y: [1, 2], x: 1 }, type: 'a' }]));
  ok('flags that differ are not the same', !m.sameFlags([{ type: 'a' }], [{ type: 'b' }]) && !m.sameFlags([], [{ type: 'a' }]));
}

// ------------------------------------------------------------- H1 the August case
console.log('\nH1. the August case');
const A1 = await augustCase('August Case');
const A1before = await invoice(A1);
{
  const r = await calc(A1, PREV, 'admin');
  ok('the call answers', r.status === 200, r.body);
  ok('the figures are the saved ones', r.body.baseAmount === 1680000 && r.body.totalDiscount === 0 && r.body.totalAmount === 1680000
    && r.body.invoice?.base_amount === 1680000 && r.body.invoice?.total_amount === 1680000, r.body);
  ok('held.reason is register_missing_marks, priced as charged (W = the saved base)', r.body.held?.reason === 'register_missing_marks' && r.body.held?.priced_as_charged === true, r.body.held);
  ok('the 8 lessons are listed on the response as unmarked lines, and the breakdown adds up to the bill',
    r.body.sessionDetails.filter((d) => d.unmarked === true).length === 8 && r.body.breakdown.classes.reduce((n, c) => n + c.amount_vnd, 0) === 1680000, r.body.breakdown);
  ok('held lists the 8 lessons with date and class', r.body.held?.lessons?.length === 8
    && r.body.held.lessons[0].date === prevDay(2) && r.body.held.lessons[0].class_name === 'Class A' && r.body.held.lessons[7].date === prevDay(16), r.body.held?.lessons);
  ok('held carries register_base 0 and saved_base 1,680,000', r.body.held?.register_base === 0 && r.body.held?.saved_base === 1680000, r.body.held);
  ok('held carries the plain sentence', /^Held: 8 lessons in [A-Z][a-z]+ have no mark\. The bill stays as charged until the register is fixed\.$/.test(r.body.held?.message ?? ''), r.body.held?.message);
  ok('the carry says the month is settled', r.body.carry?.status === 'settled' && r.body.carry?.carryOutCredit === 0 && r.body.carry?.payable === 1680000, r.body.carry);
  const after = await invoice(A1);
  ok('base / discount / total / class_breakdown / confirmation / payment fields are unchanged',
    JSON.stringify(pick(after, KEPT)) === JSON.stringify(pick(A1before, KEPT)), { before: pick(A1before, KEPT), after: pick(after, KEPT) });
  ok('the confirmed bill is still confirmed, paid', after.confirmation_status === 'confirmed' && after.status === 'paid' && after.confirmed_by === ADMIN);
  const flag = flagOf(after, 'register_missing_marks');
  ok('the review flag records count, dates, saved base and register base', flag?.details?.count === 8 && flag.details.savedBase === 1680000
    && flag.details.registerBase === 0 && flag.details.dates?.length === 8 && flag.details.dates[0] === prevDay(2), flag);
  ok('nothing but the flag was added to the review flags', after.review_flags.length === 1 && after.review_flags[0].type === 'register_missing_marks', after.review_flags);
  const writes = invoiceWrites.length, stamp = after.updated_at;
  const again = await calc(A1, PREV, 'admin');
  const after2 = await invoice(A1);
  ok('a second identical call writes nothing to the invoice row', invoiceWrites.length === writes && after2.updated_at === stamp, { writes, now: invoiceWrites.length });
  ok('and still answers with the same figures', again.body.held?.saved_base === 1680000 && again.body.totalAmount === 1680000 && again.body.held?.priced_as_charged === true);
  const family = await calc(A1, PREV, 'family');
  ok('a family caller gets the same bill', family.status === 200 && family.body.held?.reason === 'register_missing_marks' && family.body.totalAmount === 1680000, family.body);
  const timer = await calc(A1, PREV, 'service');
  ok('the service role (the hourly refresh, payments, the invoice PDF) keeps the bill too', timer.body.held?.reason === 'register_missing_marks' && (await invoice(A1)).base_amount === 1680000, timer.body);
}

// ------------------------------------------------------------- H2 force
console.log('\nH2. forcing the lower figure');
const caseC = async (name, breakdown) => {
  // 2 marked lessons and 2 holes, billed for 3: N 420,000 < saved 630,000 < W 840,000.
  const k = await newKid(name);
  await enrol(k, '2026-01-01');
  await lessonsOf(k, [3, 5, 7, 9], { 3: 'Present', 5: 'Present' });
  await bill(k, PREV, 630000, { paid: 630000, status: 'paid', confirmation: 'confirmed', breakdown: breakdown ?? breakdownOf(k, 630000, 3) });
  return k;
};
{
  const A2 = await caseC('Forced By Admin');
  const noReason = await calc(A2, PREV, 'admin', { force: true });
  ok('an admin forcing with no reason is refused, and nothing changes', noReason.status === 400 && /reason/i.test(noReason.body.error ?? '') && (await invoice(A2)).base_amount === 630000, noReason.body);
  const before = invoiceWrites.length;
  const forced = await calc(A2, PREV, 'admin', { force: true, reason: 'Child never had these lessons, moved class' });
  ok('an admin forcing with a reason saves the lower figure', forced.status === 200 && forced.body.baseAmount === 420000 && forced.body.held === undefined && forced.body.missingMarks?.forcedLower === true, forced.body);
  const row = await invoice(A2);
  ok('the invoice row holds the lower figure', row.base_amount === 420000 && row.total_amount === 420000 && invoiceWrites.length > before, pick(row, FIG));
  const flag = flagOf(row, 'lowered_despite_missing_marks');
  ok('the lowered_despite_missing_marks flag holds old base, new base, actor, reason and time', flag?.details?.savedBase === 630000 && flag.details.newBase === 420000
    && flag.details.actor === ADMIN && flag.details.reason === 'Child never had these lessons, moved class' && !!flag.details.at && flag.details.count === 2, flag);
  ok('the missing-marks flag is there too', flagOf(row, 'register_missing_marks')?.details?.count === 2);
  ok('a confirmed bill that was lowered goes back to needs_review', row.confirmation_status === 'needs_review', row.confirmation_status);
  await calc(A2, PREV, 'admin');
  const row2 = await invoice(A2);
  ok('the next ordinary call keeps the record of who lowered it', flagOf(row2, 'lowered_despite_missing_marks')?.details?.actor === ADMIN && row2.base_amount === 420000, row2.review_flags);

  for (const who of ['family', 'student', 'service']) {
    const k = await caseC(`Forced By ${who}`);
    const r = await calc(k, PREV, who, { force: true, reason: 'I say so' });
    const rw = await invoice(k);
    ok(`force:true as ${who} is ignored: held, the bill is unchanged`, r.status === 200 && r.body.held?.priced_as_charged === false && rw.base_amount === 630000
      && !flagOf(rw, 'lowered_despite_missing_marks'), { body: r.body.held, base: rw.base_amount });
  }

  // A force on a month that would be priced as charged is ignored, and the answer says so.
  const august = await augustCase('Force On Priced');
  const fp = await calc(august, PREV, 'admin', { force: true, reason: 'try' });
  const fpRow = await invoice(august);
  ok('force on a priced-as-charged month is ignored: bill unchanged, no lowering flag, and the response says so',
    fp.body.baseAmount === 1680000 && fpRow.base_amount === 1680000 && !flagOf(fpRow, 'lowered_despite_missing_marks') && typeof fp.body.forceIgnored === 'string' && fp.body.held?.priced_as_charged === true, fp.body.forceIgnored);
}

// ------------------------------------------------------------- H3 a real correction
console.log('\nH3. a legitimate correction is not held');
const SAME = ['base_amount', 'discount_amount', 'total_amount', 'paid_amount', 'recorded_payment', 'carry_in_credit', 'carry_in_debt', 'carry_out_credit', 'carry_out_debt',
  'class_breakdown', 'review_flags', 'status', 'confirmation_status', 'confirmed_at', 'confirmed_by', 'tuition_frozen'];
// Two children with identical fixtures differ only in their ids and the clock.
const norm = (v, kid) => JSON.stringify(v).split(kid).join('KID').split(classOf[kid]).join('CLS').replace(/"(changedAt|at|savedAt)":"[^"]*"/g, '"$1":"T"');
{
  // Three lessons, all with rows: Present, Present, Excused. The bill was priced
  // for three; the third has since been excused. No hole: the lower figure is saved.
  const mk = async (name) => {
    const k = await newKid(name);
    await enrol(k, '2026-01-01');
    await lessonsOf(k, [3, 5, 7], { 3: 'Present', 5: 'Present', 7: 'Excused' });
    await bill(k, PREV, 630000, { paid: 630000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(k, 630000, 3) });
    return k;
  };
  const K3 = await mk('Excused Correction');
  const r = await calc(K3, PREV, 'admin');
  const row = await invoice(K3);
  ok('the correction is saved: 2 lessons x 210,000', r.status === 200 && r.body.baseAmount === 420000 && row.base_amount === 420000 && row.total_amount === 420000, { body: r.body.baseAmount, row: pick(row, FIG) });
  ok('no held marker, no flag', r.body.held === undefined && r.body.missingMarks === undefined && row.review_flags.every((f) => !/missing_marks/.test(f.type)), row.review_flags);
  ok('a confirmed bill whose figures changed goes to needs_review with the usual flag', row.confirmation_status === 'needs_review' && !!flagOf(row, 'changed_after_confirmation'), row.confirmation_status);

  if (haveOriginal) {
    const K3b = await mk('Excused Correction Original');
    const o = await calc(K3b, PREV, 'admin', {}, 'calculate-tuition-orig');
    const orow = await invoice(K3b);
    ok('the response is identical to the function before this change', norm(r.body, K3) === norm(o.body, K3b), { new: r.body.baseAmount, orig: o.body.baseAmount });
    ok('the saved row is identical to the function before this change', norm(pick(row, SAME), K3) === norm(pick(orow, SAME), K3b), { new: pick(row, SAME), orig: pick(orow, SAME) });
    // And a plain, unremarkable month.
    const plain = async (name) => {
      const k = await newKid(name);
      await enrol(k, '2026-01-01');
      await lessonsOf(k, [3, 5, 7, 9], { 3: 'Present', 5: 'Absent', 7: 'Late', 9: 'Present' });
      return k;
    };
    const P1 = await plain('Plain New'), P2 = await plain('Plain Original');
    const pn = await calc(P1, PREV, 'admin'), po = await calc(P2, PREV, 'admin', {}, 'calculate-tuition-orig');
    ok('a month with no holes and no saved bill: same response and row as before', norm(pn.body, P1) === norm(po.body, P2)
      && norm(pick(await invoice(P1), SAME), P1) === norm(pick(await invoice(P2), SAME), P2) && pn.body.baseAmount === 840000, { n: pn.body.baseAmount, o: po.body.baseAmount });
  } else {
    console.log('  (git history for the pre-change function is not available here: exact figures asserted only)');
  }
}

// ------------------------------------------------------------- H4 holes, not lower
console.log('\nH4. holes but the register is not lower');
{
  const mk = async (name, saved) => {
    const k = await newKid(name);
    await enrol(k, '2026-01-01');
    await lessonsOf(k, [3, 5, 7, 9], { 3: 'Present', 5: 'Present' }); // 7 and 9 have no row
    if (saved !== null) await bill(k, PREV, saved);
    return k;
  };
  const eq = await mk('Holes Equal', 420000);
  const re = await calc(eq, PREV, 'admin');
  const rowE = await invoice(eq);
  ok('equal to the saved bill: saved as today, no held marker', re.status === 200 && re.body.held === undefined && rowE.base_amount === 420000, re.body.held);
  ok('the flag is there with 2 lessons', flagOf(rowE, 'register_missing_marks')?.details?.count === 2 && flagOf(rowE, 'register_missing_marks').details.savedBase === 420000
    && flagOf(rowE, 'register_missing_marks').details.registerBase === 420000, rowE.review_flags);
  ok('the response lists the two lessons without holding', re.body.missingMarks?.lessons?.length === 2, re.body.missingMarks);
  const lo = await mk('Holes Register Higher', 100000);
  const rl = await calc(lo, PREV, 'admin');
  const rowL = await invoice(lo);
  ok('the register higher than the saved bill: the higher figure is saved, flagged', rl.body.held === undefined && rowL.base_amount === 420000 && !!flagOf(rowL, 'register_missing_marks'), pick(rowL, FIG));
}

// ------------------------------------------------------------- H5 no saved bill
console.log('\nH5. holes and no saved bill');
{
  const k = await newKid('Holes No Bill');
  await enrol(k, '2026-01-01');
  await lessonsOf(k, [3, 5, 7], { 3: 'Present' });
  const r = await calc(k, PREV, 'admin');
  const row = await invoice(k);
  ok('the computed bill is saved', r.status === 200 && r.body.held === undefined && row?.base_amount === 210000 && r.body.invoiceSaved === true, { row: row && pick(row, FIG), body: r.body.held });
  const f = flagOf(row, 'register_missing_marks');
  ok('the flag is present with a null saved base', f?.details?.count === 2 && f.details.savedBase === null && f.details.registerBase === 210000, f);
}

// ------------------------------------------------------------- H6 what is not a hole
console.log('\nH6. a frozen bill, and what is not a hole');
{
  const fz = await newKid('Frozen With Holes');
  await enrol(fz, '2026-01-01');
  await lessonsOf(fz, [3, 5, 7]);
  await bill(fz, PREV, 999, { frozen: true });
  const before = await invoice(fz);
  const r = await calc(fz, PREV, 'admin');
  const after = await invoice(fz);
  ok('a frozen bill keeps its figures, with no hold and no flag', r.body.tuitionFrozen === true && r.body.baseAmount === 999 && r.body.held === undefined
    && after.base_amount === 999 && !flagOf(after, 'register_missing_marks') && after.tuition_frozen === true && before.base_amount === 999, r.body.held);
  const forcedFrozen = await calc(fz, PREV, 'admin', { force: true, reason: 'try' });
  ok('force does not unfreeze it', forcedFrozen.body.baseAmount === 999 && (await invoice(fz)).base_amount === 999 && !flagOf(await invoice(fz), 'lowered_despite_missing_marks'));

  // Not holes: before the enrolment, Scheduled, Canceled, a weekday the child
  // does not attend. One billable lesson. The saved bill is higher, so any of
  // them counted as a hole would hold it.
  const k = await newKid('Not Holes');
  await enrol(k, prevDay(10), { allowed_days: [wd(prevDay(18))] });
  await lessonsOf(k, [5]);                                  // before the enrolment
  await sess(classOf[k], prevDay(12), 'Scheduled');                  // not held yet
  await sess(classOf[k], prevDay(14), 'Canceled');                   // cancelled
  const offDay = [11, 13, 15, 16, 17].find((d) => wd(prevDay(d)) !== wd(prevDay(18)));
  await lessonsOf(k, [offDay]);                              // a weekday the child does not attend
  await lessonsOf(k, [18], { 18: 'Present' });               // the one billable lesson
  await bill(k, PREV, 1000000);
  const n = await calc(k, PREV, 'admin');
  const row = await invoice(k);
  ok('none of them is a hole: the lower figure is saved, no flag', n.body.held === undefined && n.body.missingMarks === undefined && row.base_amount === 210000
    && !flagOf(row, 'register_missing_marks'), { held: n.body.held, base: row.base_amount, flags: row.review_flags });

  // Today and later are not holes yet (the register may still be taken).
  const t = await newKid('Today And Later');
  await enrol(t, '2026-01-01');
  const lastDay = new Date(Date.UTC(hanoi.getUTCFullYear(), hanoi.getUTCMonth() + 1, 0)).getUTCDate();
  const todayN = hanoi.getUTCDate();
  await sess(classOf[t], `${CUR}-${pad(todayN)}`, 'Held');
  if (todayN < lastDay) await sess(classOf[t], `${CUR}-${pad(todayN + 1)}`, 'Held');
  await bill(t, CUR, 500000);
  const tr = await calc(t, CUR, 'admin');
  const trow = await invoice(t, CUR);
  ok('a lesson dated today (and one dated later) is not a hole: the bill is repriced as before', tr.body.held === undefined && tr.body.missingMarks === undefined
    && trow.base_amount === 0 && !flagOf(trow, 'register_missing_marks'), { held: tr.body.held, base: trow.base_amount });
}

// ------------------------------------------------------------- H7 bulk = single
console.log('\nH7. bulk and single report the same');
{
  const held = await augustCase('Bulk Held');
  const legit = await newKid('Bulk Legit');
  await enrol(legit, '2026-01-01');
  await lessonsOf(legit, [3, 5, 7], { 3: 'Present', 5: 'Present', 7: 'Excused' });
  await bill(legit, PREV, 630000);
  const plain = await newKid('Bulk Plain');
  await enrol(plain, '2026-01-01');
  await lessonsOf(plain, [3, 5], { 3: 'Present', 5: 'Absent' });
  const ids = [held, legit, plain, A1];
  const b = await bulk(ids, PREV); // bulk first: it saves nothing
  ok('bulk wrote no bill', (await invoice(plain)) === null && (await invoice(legit)).base_amount === 630000 && (await invoice(held)).base_amount === 1680000);
  const bh = b.get(held);
  ok('a held bill: bulk reports the saved figures and the held marker', bh?.baseAmount === 1680000 && bh.totalAmount === 1680000 && bh.totalDiscount === 0
    && bh.held?.reason === 'register_missing_marks' && bh.held.lessons.length === 8 && bh.held.register_base === 0 && bh.held.saved_base === 1680000, bh);
  ok('the held bill is split by class and the split sums to the bill exactly', bh?.classNet?.length >= 1 && netSum(bh) === 1680000 && bh.held.priced_as_charged === true, bh?.classNet);
  ok('an unhold bill (legit correction): bulk shows the register figure and no marker', b.get(legit).baseAmount === 420000 && b.get(legit).held === undefined, b.get(legit));
  ok('a plain bill: no marker', b.get(plain).baseAmount === 420000 && b.get(plain).held === undefined);
  for (const [name, kid] of [['held', held], ['legit', legit], ['plain', plain], ['the August case', A1]]) {
    const s = await calc(kid, PREV, 'admin');
    const bk = b.get(kid);
    ok(`${name}: single and bulk agree on base / discount / total`, s.body.baseAmount === bk.baseAmount && s.body.totalDiscount === bk.totalDiscount && s.body.totalAmount === bk.totalAmount,
      { single: [s.body.baseAmount, s.body.totalDiscount, s.body.totalAmount], bulk: [bk.baseAmount, bk.totalDiscount, bk.totalAmount] });
    ok(`${name}: single and bulk agree on the carry and on being held`, s.body.carry.payable === bk.carry.payable && s.body.carry.carryOutDebt === bk.carry.carryOutDebt && (s.body.held === undefined) === (bk.held === undefined),
      { s: s.body.carry, b: bk.carry });
  }
}

// ------------------------------------------------------------- H11 priced as charged
console.log('\nH11. a lesson with no mark is priced as it was charged, never beyond the saved bill');
const mkMonth = async (name, spec, saved, opts = {}) => {
  // spec: day -> 'hole' | 'Present' | 'Excused' | 'Canceled' | ...
  const k = await newKid(name);
  await enrol(k, '2026-01-01');
  for (const [d, what] of Object.entries(spec)) {
    const day = Number(d);
    if (what === 'Canceled') { await sess(classOf[k], prevDay(day), 'Canceled'); continue; }
    await lessonsOf(k, [day], what === 'hole' ? {} : { [day]: what });
  }
  if (saved !== null) await bill(k, PREV, saved, { paid: saved, status: 'paid', confirmation: opts.confirmation ?? 'confirmed', breakdown: opts.breakdown ?? breakdownOf(k, saved, saved / 210000) });
  return k;
};
{
  // F1: one old hole; another lesson of the month is later cancelled or excused.
  // The bill must drop by exactly that lesson, no more, no less.
  const cancel = await mkMonth('Hole Then Cancel', { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'Canceled' }, 840000);
  const rc = await calc(cancel, PREV, 'admin');
  const rowC = await invoice(cancel);
  ok('hole + a lesson since cancelled: the bill drops by exactly one lesson (840,000 -> 630,000)', rc.body.baseAmount === 630000 && rowC.base_amount === 630000 && rowC.total_amount === 630000, { body: rc.body.baseAmount, row: pick(rowC, FIG) });
  ok('it says so: priced as charged, the hole listed, its line marked unmarked', rc.body.held?.priced_as_charged === true && rc.body.held.lessons.length === 1
    && rc.body.held.register_base === 420000 && rc.body.held.saved_base === 840000
    && rc.body.sessionDetails.filter((d) => d.unmarked === true).length === 1 && rc.body.sessionCount === 3, rc.body);
  ok('the lines add up to the bill', rc.body.breakdown.classes.reduce((n, c) => n + c.amount_vnd, 0) === 630000 && rowC.class_breakdown[0].amount_vnd === 630000, rowC.class_breakdown);
  ok('priced answer is consistent: lines = base, base - discounts = total, and bulk classNet = total', consistent(rc.body) && netSum((await bulk([cancel], PREV)).get(cancel)) === 630000, rc.body);
  const cw = writesFor(cancel);
  await calc(cancel, PREV, 'admin');
  const cw2 = writesFor(cancel);
  await calc(cancel, PREV, 'admin');
  ok('the second and the third identical call write nothing (the flag keeps the first-seen saved base)', cw2 === cw && writesFor(cancel) === cw && flagOf(await invoice(cancel), 'register_missing_marks')?.details?.savedBase === 840000, { cw, cw2, now: writesFor(cancel) });
  ok('a confirmed bill that really changed goes to review with the usual flag, and the holes are flagged',
    rowC.confirmation_status === 'needs_review' && !!flagOf(rowC, 'changed_after_confirmation') && flagOf(rowC, 'register_missing_marks')?.details?.mode === 'priced_as_charged', rowC.review_flags);

  const excuse = await mkMonth('Hole Then Excuse', { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'Excused' }, 840000);
  const re = await calc(excuse, PREV, 'admin');
  ok('hole + a lesson since excused: the bill drops by exactly one lesson', re.body.baseAmount === 630000 && (await invoice(excuse)).base_amount === 630000, re.body.baseAmount);

  // Nothing else changed: W equals the saved bill, the figures do not move and nothing is rewritten.
  const same = await mkMonth('Holes Unchanged', { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'hole' }, 840000);
  const before = await invoice(same);
  const first = await calc(same, PREV, 'admin');
  const mid = await invoice(same);
  ok('two holes, nothing else changed: the figures do not move', first.body.baseAmount === 840000 && mid.base_amount === 840000 && mid.total_amount === 840000
    && JSON.stringify(pick(mid, KEPT)) === JSON.stringify(pick(before, KEPT)), { before: pick(before, KEPT), after: pick(mid, KEPT) });
  const w = writesFor(same), stamp = mid.updated_at;
  await calc(same, PREV, 'admin');
  ok('and a second call writes nothing', writesFor(same) === w && (await invoice(same)).updated_at === stamp, { w, now: writesFor(same) });

  // Case c: N < saved < W - some deleted marks must have been Excused and nobody can tell which.
  const held = await mkMonth('Case C Held', { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'hole' }, 630000);
  // A saved discount, so the discount list can be checked against it.
  await db.query(`UPDATE public.invoices SET discount_amount = 63000, total_amount = 567000 WHERE student_id = $1`, [held]);
  const bh0 = (await bulk([held], PREV)).get(held);
  const rh = await calc(held, PREV, 'admin');
  const rowH = await invoice(held);
  ok('N < saved < W: the saved figures stand, answered as held (not priced as charged)', rh.body.held?.priced_as_charged === false && rh.body.baseAmount === 630000 && rowH.base_amount === 630000
    && rh.body.held.register_base === 420000 && rh.body.held.saved_base === 630000, rh.body.held);
  ok('a held answer is consistent everywhere: lines = base, discounts = saved discount, classNet = total', consistent(rh.body) && netSum(bh0) === 567000, { classes: rh.body.breakdown.classes, discounts: rh.body.discounts });
  ok('the held answer\'s lines are the saved breakdown and add up to its total', rh.body.breakdown.classes.reduce((n, c) => n + c.amount_vnd, 0) === 630000 && rh.body.sessionCount === 3, { classes: rh.body.breakdown.classes, count: rh.body.sessionCount });
  ok('the saved row is unchanged but for the flag', JSON.stringify(pick(rowH, KEPT)) === JSON.stringify(pick(await invoice(held), KEPT)) && rowH.confirmation_status === 'confirmed' && flagOf(rowH, 'register_missing_marks')?.details?.mode === 'held');
  const bh = (await bulk([held], PREV)).get(held);
  ok('bulk reports the held bill the same: saved figures, held, and no priced-as-charged', bh.baseAmount === 630000 && bh.held?.priced_as_charged === false && netSum(bh) === 567000 && bh.totalDiscount === 63000, bh);

  // The sibling preview answers what the bill answers, and writes nothing.
  {
    const w = invoiceWrites.length;
    const pv = await calc(cancel, PREV, 'service', { siblingPreview: true });
    ok('the sibling preview of a priced-as-charged month prices on the same figures as the bill, and writes nothing', pv.body.baseAmount === 630000 && invoiceWrites.length === w && pv.body.breakdown.classes[0].amount_vnd === 630000, pv.body);
    const pc = await calc(held, PREV, 'service', { siblingPreview: true });
    ok('the sibling preview of a held month answers the saved lines', pc.body.baseAmount === 630000 && pc.body.breakdown.classes.reduce((n, c) => n + c.net_amount_vnd, 0) === 630000 && invoiceWrites.length === w, pc.body.breakdown);
  }

  // A bill saved with no breakdown (older bills): the split still carries the whole charge.
  for (const [label, saved] of [['an empty breakdown', []], ['a NULL breakdown', null]]) {
    const k = await mkMonth(`Case C ${label}`, { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'hole' }, 630000, { breakdown: [] });
    if (saved === null) await db.query(`UPDATE public.invoices SET class_breakdown = NULL WHERE student_id = $1`, [k]);
    const r = (await bulk([k], PREV)).get(k);
    ok(`held, ${label}: classNet still sums to the charge exactly (never [] against a charge)`, r.totalAmount === 630000 && r.classNet.length >= 1 && netSum(r) === 630000, r);
    const single = await calc(k, PREV, 'admin');
    ok(`held, ${label}: single answers the saved figures, with ONE "As charged" line for the saved base (not the register's lines)`, single.body.totalAmount === 630000 && single.body.held?.priced_as_charged === false
      && single.body.breakdown.classes.length === 1 && single.body.breakdown.classes[0].class_name === 'As charged' && consistent(single.body), single.body.breakdown);
  }
  // A frozen bill with no breakdown is carried the same way.
  {
    const k = await newKid('Frozen No Breakdown');
    await enrol(k, '2026-01-01');
    await lessonsOf(k, [3, 5], { 3: 'Present', 5: 'Present' });
    await bill(k, PREV, 420000, { frozen: true, breakdown: [] });
    const r = (await bulk([k], PREV)).get(k);
    ok('frozen, no breakdown: classNet is [] exactly as before (no hole, no change)', Array.isArray(r.classNet) && r.classNet.length === 0, r.classNet);
  }

  // A hole in the CURRENT month, on a clock fixed in the middle of it.
  {
    const k = await newKid('Hole This Month');
    await enrol(k, '2026-01-01');
    await sess(classOf[k], `${CUR}-10`, 'Held');            // past on the fixed clock, no row
    await sess(classOf[k], `${CUR}-15`, 'Held');            // today on the fixed clock: not a hole yet
    await bill(k, CUR, 210000, { paid: 210000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(k, 210000, 1) });
    const r = await withClock(`${CUR}-15T05:00:00Z`, () => calc(k, CUR, 'admin'));
    const row = await invoice(k, CUR);
    ok('a hole in the current month: the bill stands (priced as charged), only the past lesson is listed', r.body.baseAmount === 210000 && row.base_amount === 210000
      && r.body.held?.priced_as_charged === true && r.body.held.lessons.length === 1 && r.body.held.lessons[0].date === `${CUR}-10` && !!flagOf(row, 'register_missing_marks'), r.body.held);
  }

  // Two classes, one of them with a hole.
  {
    const k = await newKid('Two Classes');
    const second = U(classCounter++);
    await db.query(`INSERT INTO public.classes VALUES ($1, 'Class B', 210000)`, [second]);
    await enrol(k, '2026-01-01');
    await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at) VALUES ($1, $2, '2026-01-01', '2026-01-02T00:00:00Z')`, [k, second]);
    await lessonsOf(k, [3, 5], { 3: 'Present', 5: 'Present' });             // class one: 2 marked
    const s1 = await sess(second, prevDay(4), 'Held'); await mark(s1, k, 'Present');
    await sess(second, prevDay(6), 'Held');                                // class two: a hole
    await bill(k, PREV, 840000, { paid: 840000, status: 'paid', confirmation: 'confirmed',
      breakdown: [{ class_id: classOf[k], class_name: 'Class A', amount_vnd: 420000, net_amount_vnd: 420000, sessions_count: 2, session_rate_vnd: 210000 },
        { class_id: second, class_name: 'Class B', amount_vnd: 420000, net_amount_vnd: 420000, sessions_count: 2, session_rate_vnd: 210000 }] });
    const r = await calc(k, PREV, 'admin');
    const row = await invoice(k);
    ok('two classes, a hole in one: the bill is priced as charged, class by class', r.body.baseAmount === 840000 && r.body.held?.priced_as_charged === true
      && row.class_breakdown.length === 2 && row.class_breakdown.every((c) => c.amount_vnd === 420000), row.class_breakdown);
    ok('the hole is listed with its own class', r.body.held.lessons.length === 1 && r.body.held.lessons[0].class_name === 'Class B', r.body.held.lessons);
    const b = (await bulk([k], PREV)).get(k);
    ok('bulk: same figures, split over both classes summing to the charge', b.baseAmount === 840000 && b.classNet.length === 2 && netSum(b) === 840000, b);
  }

  // A sibling-discounted child: the family discount is recomputed from the priced month.
  {
    const FAM = U(9000);
    const k = await newKid('Sibling Child');
    await db.query(`UPDATE public.students SET family_id = $1 WHERE id = $2`, [FAM, k]);
    await enrol(k, '2026-01-01');
    await lessonsOf(k, [3, 5], { 3: 'Present', 5: 'Present' });
    await lessonsOf(k, [7]);                       // a hole
    await sess(classOf[k], prevDay(9), 'Canceled'); // a lesson since cancelled
    await bill(k, PREV, 840000, { paid: 756000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(k, 840000, 4) });
    await db.query(`UPDATE public.invoices SET discount_amount = 84000, total_amount = 756000 WHERE student_id = $1`, [k]);
    globalThis.__tbSibling = (ids) => ids.map((id) => ({ family_id: id, status: 'assigned', sibling_percent: 10, winner_student_id: k, winner_class_id: classOf[k], reason: null }));
    try {
      const b = (await bulk([k], PREV)).get(k);
      const r = await calc(k, PREV, 'admin');
      const row = await invoice(k);
      ok('sibling discount: base 630,000 (3 lessons, the hole counted), discount 63,000 (10%), total 567,000', r.body.baseAmount === 630000 && r.body.totalDiscount === 63000 && r.body.totalAmount === 567000
        && row.base_amount === 630000 && row.discount_amount === 63000 && row.total_amount === 567000, { body: [r.body.baseAmount, r.body.totalDiscount, r.body.totalAmount], row: pick(row, FIG) });
      ok('sibling discount: bulk reports the same', b.baseAmount === 630000 && b.totalDiscount === 63000 && b.totalAmount === 567000 && netSum(b) === 567000, b);
    } finally { delete globalThis.__tbSibling; }
  }

  // A bill with a waiting changed_after_confirmation flag, under a hold.
  {
    const k = await mkMonth('Waiting Flag', { 3: 'Present', 5: 'Present', 7: 'hole', 9: 'hole' }, 630000, { confirmation: 'needs_review' });
    const waiting = { type: 'changed_after_confirmation', label: 'Changed after confirmation',
      details: { previousStatus: 'confirmed', confirmedAt: null, confirmedBy: null, confirmed: { base_amount: 700000, discount_amount: 0, total_amount: 700000 },
        current: { base_amount: 630000, discount_amount: 0, total_amount: 630000 }, difference: -70000, changedAt: '2026-09-01T00:00:00Z' } };
    await db.query(`UPDATE public.invoices SET review_flags = $2::jsonb WHERE student_id = $1`, [k, JSON.stringify([waiting])]);
    await calc(k, PREV, 'admin');
    const row = await invoice(k);
    const waits = row.review_flags.filter((f) => f.type === 'changed_after_confirmation');
    ok('a held bill keeps its waiting flag, once, beside the missing-marks flag', waits.length === 1 && waits[0].details.confirmed.total_amount === 700000 && !!flagOf(row, 'register_missing_marks') && row.confirmation_status === 'needs_review', row.review_flags);
    const w = writesFor(k), stamp = row.updated_at;
    await calc(k, PREV, 'admin');
    ok('and a second call writes nothing', writesFor(k) === w && (await invoice(k)).updated_at === stamp);
  }

  // Overlapping enrolments: the first-created one decides, for holes as for pricing.
  {
    const mk = async (name, firstOverride, secondOverride) => {
      const k = await newKid(name);
      await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at, rate_override_vnd) VALUES ($1, $2, '2026-01-01', '2026-01-01T00:00:00Z', $3)`, [k, classOf[k], firstOverride]);
      await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at, rate_override_vnd) VALUES ($1, $2, '2026-01-01', '2026-02-01T00:00:00Z', $3)`, [k, classOf[k], secondOverride]);
      await lessonsOf(k, [3, 5, 7, 9]);
      await bill(k, PREV, 840000, { paid: 840000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(k, 840000, 4) });
      return k;
    };
    const zeroFirst = await mk('Overlap Zero First', 0, null);
    const rz = await calc(zeroFirst, PREV, 'admin');
    ok('the first-created enrolment has a zero rate: the lessons are not holes, so today\'s rule applies (as before)', rz.body.held === undefined && rz.body.missingMarks === undefined && rz.body.baseAmount === 0, rz.body.held);
    const normalFirst = await mk('Overlap Normal First', null, 0);
    const rn = await calc(normalFirst, PREV, 'admin');
    ok('the first-created enrolment has a normal rate: four holes, the bill stands', rn.body.held?.priced_as_charged === true && rn.body.baseAmount === 840000 && rn.body.held.lessons.length === 4, rn.body.held);
  }
}

// ------------------------------------------------------------- readRecalc
console.log('\nreadRecalc');
{
  const f = join(out, 'bill-refresh.mjs');
  writeFileSync(f, (await build({ entryPoints: [join(libDir, 'bill-refresh.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const m = await import(pathToFileURL(f).href);
  const h = m.readRecalc(200, { invoiceSaved: true, held: { reason: 'register_missing_marks', message: 'Held: 3 lessons in August have no mark.', lessons: [1, 2, 3] } });
  ok('a held answer is its own outcome, not ok and not an error', h.ok === false && h.error === undefined && h.held?.lessons === 3 && /^Held: 3 lessons/.test(h.held?.message), h);
  ok('an ordinary save is still ok', m.readRecalc(200, { invoiceSaved: true }).ok === true && m.readRecalc(200, { invoiceSaved: true }).held === undefined);
  ok('an unsaved bill is still an error', m.readRecalc(200, { invoiceSaved: false }).error === 'not saved');
}

// ------------------------------------------------------------- H8 refresh-month-bills
console.log('\nH8. refresh-month-bills');
{
  // A fresh month of data: only what this section needs.
  await db.exec(`TRUNCATE public.invoices, public.attendance, public.sessions, public.enrollments, public.students, public.tuition_bill_check_runs`);
  invoiceWrites.length = 0;
  const pricedKid = await newKid('A Priced Child');          // 3 unmarked lessons, billed for 3: priced as charged
  await enrol(pricedKid, '2026-01-01');
  await lessonsOf(pricedKid, [2, 4, 6]);
  await bill(pricedKid, PREV, 630000, { paid: 630000, status: 'paid', confirmation: 'confirmed', breakdown: breakdownOf(pricedKid, 630000, 3) });
  const heldKid = await caseC('B Held Child');               // N < saved < W: held
  const missing = await newKid('C Missing Bill');
  await enrol(missing, '2026-01-01');
  await lessonsOf(missing, [3, 5], { 3: 'Present', 5: 'Present' });

  const realFetch = globalThis.fetch, realTimeout = globalThis.setTimeout;
  const calls = [];
  globalThis.setTimeout = (fn) => realTimeout(fn, 0);
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body.studentId);
    gate = CALLERS.service;
    return handlers['calculate-tuition'](new Request(url, { method: 'POST', headers: init.headers, body: init.body }));
  };
  try {
    gate = CALLERS.admin;
    const res = await handlers['refresh-month-bills'](post({ month: PREV }));
    const body = await res.json();
    const run = body.months?.[0];
    ok('the refresh exits successfully', res.status === 200 && body.ok === true, body);
    ok('it looked at the three children', run?.found === 3, run);
    ok('the missing bill and the priced-as-charged bill are SAVED (recalculated 2)', run?.recalculated === 2 && (await invoice(missing))?.base_amount === 420000, run?.recalculated);
    ok('the priced-as-charged child is reported as saved with its note, not as held', run?.priced?.length === 1 && run.priced[0].student_id === pricedKid && run.priced[0].lessons === 3
      && /^Held: 3 lessons in [A-Z][a-z]+ have no mark\./.test(run.priced[0].message) && !run.held.some((h) => h.student_id === pricedKid), run?.priced);
    ok('the held child is its own outcome, with the plain sentence', run?.held?.length === 1 && run.held[0].student_id === heldKid && run.held[0].name === 'B Held Child'
      && /^Held: 2 lessons in [A-Z][a-z]+ have no mark\. The bill stays as charged until the register is fixed\.$/.test(run.held[0].message), run?.held);
    ok('and neither is a failure', run?.failed?.length === 0, run?.failed);
    const open = new Map((run?.still_open ?? []).map((r) => [r.student_id, r]));
    ok('the run row keeps its shape: the held child says held, the priced child says note', open.get(heldKid)?.held?.lessons === 2 && open.get(pricedKid)?.note?.lessons === 3 && open.size === 2, run?.still_open);
    const logged = (await db.query(`SELECT started_by, found, recalculated, failed, still_open FROM public.tuition_bill_check_runs WHERE month = $1`, [PREV])).rows;
    ok('the run is recorded with the same columns', logged.length === 1 && logged[0].found === 3 && logged[0].recalculated === 2 && logged[0].failed.length === 0 && logged[0].still_open.length === 2, logged);
    const hb = await invoice(heldKid);
    ok('the held bill is exactly as charged, still confirmed and paid', hb.base_amount === 630000 && hb.confirmation_status === 'confirmed' && hb.status === 'paid' && !!flagOf(hb, 'register_missing_marks'), pick(hb, KEPT));
    ok('each flagged child was asked about once, not retried in a loop', calls.filter((c) => c === heldKid).length === 1 && calls.filter((c) => c === pricedKid).length === 1, calls);

    const writesBefore = writesFor(heldKid) + writesFor(pricedKid), stamp = hb.updated_at;
    calls.length = 0;
    const late = await newKid('D Late Bill');
    await enrol(late, '2026-01-01');
    await lessonsOf(late, [3], { 3: 'Present' });
    gate = CALLERS.admin;
    const again = await (await handlers['refresh-month-bills'](post({ month: PREV }))).json();
    ok('a second run still exits successfully and reports both again', again.ok === true && again.months[0].held.length === 1 && again.months[0].priced.length === 1 && again.months[0].found === 3, again);
    ok('known-flagged children go after the bills that can be fixed', calls[0] === late && new Set(calls.slice(1)).has(heldKid) && new Set(calls.slice(1)).has(pricedKid), calls);
    ok('their bill rows were not written again', writesFor(heldKid) + writesFor(pricedKid) === writesBefore && (await invoice(heldKid)).updated_at === stamp, { writesBefore });
  } finally {
    globalThis.fetch = realFetch;
    globalThis.setTimeout = realTimeout;
  }
}

// ------------------------------------------------------------- source facts
console.log('\nsource facts');
{
  const src = read('supabase', 'functions', 'calculate-tuition', 'index.ts');
  ok('force is honoured only for the admin role, never the service key', /force === true && gate\.roles\.has\("admin"\) && !gate\.isServiceRole/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
