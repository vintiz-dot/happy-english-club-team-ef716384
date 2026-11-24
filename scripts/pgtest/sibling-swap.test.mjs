// The sibling discount, as the family paid (owner, 24 Nov 2026).
//
// A family sometimes puts the sibling discount on another child than the one
// the school's rule chose, and pays that way. When every child's payment for
// the month is, to the dong, their bill with the discount on that other child,
// compute-sibling-discounts (swapByPayments) moves it there and has
// calculate-tuition save the bills - also for a closed month, where the new
// bill is saved only because it then equals what was paid (settleToPayment).
//
// This runs the REAL compute-sibling-discounts and calculate-tuition against an
// in-process Postgres, with the nested calls between them wired to each other.
// Also here: src/lib/siblingSwaps.ts (the line an admin reads) and
// src/lib/freeTrialLessons.ts (the free trial panel's rows), both pure.
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
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};

// Today is 24 Nov 2026: September is closed, November is open.
globalThis.__hecNow = '2026-11-24T03:00:00Z';
const CLOSED = '2026-09', OPEN = '2026-11';
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1);
const CA = U(31), CB = U(32);

// ----------------------------------------------------------------- schema
const db = new PGlite();
await db.exec(`
  CREATE TABLE public.families(id uuid PRIMARY KEY, name text, is_active boolean DEFAULT true, sibling_percent_override integer);
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL, is_active boolean DEFAULT true, family_id uuid, sibling_discount_from date);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text, session_rate_vnd integer NOT NULL DEFAULT 0);
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, date date NOT NULL, status text NOT NULL);
  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, student_id uuid, status text NOT NULL);
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, start_date date NOT NULL, end_date date,
    created_at timestamptz DEFAULT now(), allowed_days integer[], rate_override_vnd integer, discount_type text, discount_value numeric, discount_cadence text);
  CREATE TABLE public.class_fee_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, effective_from date, session_rate_vnd integer);
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL, status text NOT NULL DEFAULT 'issued',
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    paid_amount integer NOT NULL DEFAULT 0, recorded_payment integer DEFAULT 0,
    carry_in_credit integer DEFAULT 0, carry_in_debt integer DEFAULT 0, carry_out_credit integer DEFAULT 0, carry_out_debt integer DEFAULT 0,
    class_breakdown jsonb DEFAULT '[]'::jsonb, review_flags jsonb DEFAULT '[]'::jsonb,
    confirmation_status text DEFAULT 'auto_approved', confirmed_at timestamptz, confirmed_by uuid,
    tuition_frozen boolean NOT NULL DEFAULT false, frozen_reason text,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE (student_id, month));
  CREATE TABLE public.sibling_discount_state(family_id uuid NOT NULL, month text NOT NULL, status text, winner_student_id uuid, winner_class_id uuid,
    sibling_percent integer, reason text, computed_at timestamptz, projected_base_snapshot integer, PRIMARY KEY (family_id, month));
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL, entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
`);
await db.query(`INSERT INTO public.classes VALUES ($1, 'Class A', 200000), ($2, 'Class B', 260000)`, [CA, CB]);
// Eight lessons a month in each class, all held in September, on the timetable in November.
const DAYS = [3, 5, 10, 12, 17, 19, 24, 26];
for (const month of [CLOSED, OPEN]) for (const cls of [CA, CB]) for (const d of DAYS) {
  await db.query(`INSERT INTO public.sessions(class_id, date, status) VALUES ($1, $2, $3)`, [cls, `${month}-${String(d).padStart(2, '0')}`, month === CLOSED ? 'Held' : 'Scheduled']);
}

// A family: first child in Class A (1,600,000 a month), second in Class B (2,080,000).
// The rule gives the 5% to the Class A child: 80,000 costs the school least.
let seq = 100;
const families = {};
async function family(name, { month = CLOSED, paidA, paidB, winner = 'a', frozenB = false, percent = null } = {}) {
  const f = U(++seq), a = U(++seq), b = U(++seq);
  await db.query(`INSERT INTO public.families(id, name, sibling_percent_override) VALUES ($1, $2, $3)`, [f, name, percent]);
  await db.query(`INSERT INTO public.students(id, full_name, family_id) VALUES ($1, $2, $4), ($3, $5, $4)`, [a, `${name} An`, b, f, `${name} Binh`]);
  await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at) VALUES ($1, $2, '2026-01-01', '2026-01-01T00:00:00Z'), ($3, $4, '2026-01-01', '2026-01-01T00:00:00Z')`, [a, CA, b, CB]);
  await db.query(`INSERT INTO public.attendance(session_id, student_id, status)
    SELECT s.id, $1::uuid, 'Present' FROM public.sessions s WHERE s.class_id = $2::uuid AND s.status = 'Held'
    UNION ALL SELECT s.id, $3::uuid, 'Present' FROM public.sessions s WHERE s.class_id = $4::uuid AND s.status = 'Held'`, [a, CA, b, CB]);
  const pct = percent ?? 5;
  await db.query(`INSERT INTO public.sibling_discount_state(family_id, month, status, winner_student_id, winner_class_id, sibling_percent, reason, projected_base_snapshot)
    VALUES ($1, $2, 'assigned', $3, $4, $5, 'as the rule chose', $6)`, [f, month, winner === 'a' ? a : b, winner === 'a' ? CA : CB, pct, winner === 'a' ? 1600000 : 2080000]);
  // The bills as the app saved them with the discount on the rule's winner.
  const discA = winner === 'a' ? Math.round(1600000 * pct / 100) : 0, discB = winner === 'b' ? Math.round(2080000 * pct / 100) : 0;
  await db.query(`INSERT INTO public.invoices(student_id, month, base_amount, discount_amount, total_amount, recorded_payment, status, tuition_frozen) VALUES
    ($1, $3, 1600000, $4, $5, $6, 'paid', false), ($2, $3, 2080000, $7, $8, $9, 'paid', $10)`,
    [a, b, month, discA, 1600000 - discA, paidA, discB, 2080000 - discB, paidB, frozenB]);
  families[name] = { f, a, b, month };
  return families[name];
}
const bill = async (student, month) => (await db.query(`SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2`, [student, month])).rows[0];
const state = async (f, month) => (await db.query(`SELECT * FROM public.sibling_discount_state WHERE family_id = $1 AND month = $2`, [f, month])).rows[0];
const log = async () => (await db.query(`SELECT * FROM public.audit_log ORDER BY occurred_at`)).rows;

// ------------------------------------------------- PostgREST stand-in (SQL)
function sqlQuery(table) {
  const where = [], params = [];
  let mode = 'select', payload = null, conflict = '', order = '', lim = '';
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const KNOWN = new Set(['families', 'students', 'classes', 'sessions', 'attendance', 'enrollments', 'class_fee_history', 'invoices', 'sibling_discount_state', 'audit_log']);
  async function run() {
    if (!KNOWN.has(table)) return { data: [], error: null }; // discounts, bonuses, free trials: none here
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') {
        const rows = (await db.query(`SELECT to_jsonb(t) AS j FROM public.${table} t${w}${order}${lim}`, params)).rows.map((r) => r.j);
        if (table === 'students') {
          const fams = (await db.query(`SELECT to_jsonb(f) AS j FROM public.families f`)).rows.map((r) => r.j);
          rows.forEach((r) => { const f = fams.find((x) => x.id === r.family_id); r.families = f ? { id: f.id, sibling_percent_override: f.sibling_percent_override } : null; });
        }
        if (table === 'sessions') {
          const cls = (await db.query(`SELECT to_jsonb(c) AS j FROM public.classes c`)).rows.map((r) => r.j);
          rows.forEach((r) => { const c = cls.find((x) => x.id === r.class_id); r.classes = c ? { session_rate_vnd: c.session_rate_vnd, name: c.name } : null; });
        }
        return { data: rows, error: null };
      }
      if (mode === 'update') {
        const keys = Object.keys(payload);
        const j = p(JSON.stringify(payload));
        await db.query(`UPDATE public.${table} t SET ${keys.map((k) => `${k} = (jsonb_populate_record(null::public.${table}, ${j}::jsonb)).${k}`).join(', ')}${w}`, params);
        return { data: null, error: null };
      }
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        const keys = Object.keys(row);
        const ins = `INSERT INTO public.${table} (${keys.join(', ')}) SELECT ${keys.join(', ')} FROM jsonb_populate_record(null::public.${table}, $1::jsonb)`;
        const target = conflict || (table === 'sibling_discount_state' ? 'family_id, month' : '');
        await db.query(mode === 'upsert' ? `${ins} ON CONFLICT (${target}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}` : ins, [JSON.stringify(row)]);
      }
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
  const q = {
    select() { return q; },
    eq(k, v) { where.push(`t.${k}::text = ${p(String(v))}`); return q; },
    neq(k, v) { where.push(`t.${k}::text <> ${p(String(v))}`); return q; },
    in(k, vs) { where.push(vs.length ? `t.${k}::text IN (${vs.map((v) => p(String(v))).join(', ')})` : 'false'); return q; },
    not(k, op, v) { if (op === 'is' && v === null) where.push(`t.${k} IS NOT NULL`); return q; },
    gte(k, v) { where.push(`t.${k} >= ${p(v)}`); return q; },
    gt(k, v) { where.push(`t.${k}::text > ${p(String(v))}`); return q; },
    lt(k, v) { where.push(`t.${k} < ${p(v)}`); return q; },
    lte(k, v) { where.push(`t.${k} <= ${p(v)}`); return q; },
    or() { return q; },
    order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} t.${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
    limit(n) { lim = ` LIMIT ${Number(n)}`; return q; },
    upsert(v, o = {}) { mode = 'upsert'; payload = v; conflict = o.onConflict ?? ''; return q; },
    insert(v) { mode = 'insert'; payload = v; return q; },
    update(v) { mode = 'update'; payload = v; return q; },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    then(a, b) { return run().then(a, b); },
  };
  return q;
}

// ------------------------------------------------------------- the bundles
const out = mkdtempSync(join(tmpdir(), 'sibling-swap-'));
const libDir = resolve(repo, 'supabase', 'functions', '_lib');
const handlers = {};
const SERVICE = { isServiceRole: true, roles: new Set(['service_role']), userId: '', email: null };
const AS_ADMIN = { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN, email: 'admin@test' };
let gate = SERVICE;
const calls = []; // nested calculate-tuition calls, as compute-sibling-discounts made them
const post = (body) => new Request('http://functions.test/fn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const call = async (name, body, who = SERVICE) => {
  const before = gate; gate = who;
  try {
    const res = await handlers[name](post(body));
    return { status: res.status, body: await res.json() };
  } finally { gate = before; }
};
globalThis.__ssZod = z;
globalThis.__ssGate = () => gate;
globalThis.__ssClient = () => ({
  from: (table) => sqlQuery(table),
  // One function asking another does so with the service key.
  functions: { invoke: async (name, { body }) => {
    if (name === 'calculate-tuition') calls.push(body);
    const r = await call(name, body, SERVICE);
    return r.status >= 400 ? { data: null, error: new Error(r.body?.error ?? `status ${r.status}`) } : { data: r.body, error: null };
  } },
});
// No pause between the nested calls here (production spaces them: calculate-tuition allows 30 a minute).
globalThis.Deno = { env: { get: (k) => (k === 'SUPABASE_URL' ? 'http://functions.test' : k === 'SIBLING_SWAP_PACE_MS' ? '0' : 'service-key-test-only') }, serve: (h) => { handlers.current = h; } };
const bundle = async (name) => {
  const b = await build({
    entryPoints: [resolve(repo, 'supabase', 'functions', name, 'index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(bd) {
      bd.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/clock\.ts$|\/rate-limit\.ts$|\/lock\.ts$)/ }, (a) => ({ path: a.path, namespace: 'test' }));
      bd.onResolve({ filter: /\/_lib\/[^/]+\.ts$/ }, (a) => ({ path: join(libDir, a.path.split('/').pop()) }));
      bd.onLoad({ filter: /.*/, namespace: 'test' }, (a) => ({ loader: 'js', contents:
        a.path.includes('supabase-js') ? 'export const createClient = (...x) => globalThis.__ssClient(...x);' :
        a.path.includes('zod') ? 'export const z = globalThis.__ssZod;' :
        a.path.endsWith('/auth.ts') ? 'export const requireRole = async () => globalThis.__ssGate(); export const callerOwnsStudent = async () => true;' :
        a.path.endsWith('/clock.ts') ? 'export const clockNow = () => new Date(globalThis.__hecNow);' :
        a.path.endsWith('/lock.ts') ? 'export const acquireLock = async () => true; export const releaseLock = async () => {}; export const ymNowBangkok = () => "2026-11";' :
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
await bundle('compute-sibling-discounts');
const swap = (month, extra = {}, who = SERVICE) => call('compute-sibling-discounts', { month, swapByPayments: true, ...extra }, who);

// ----------------------------------------------------------------- fixtures
// Moved: paid An in full and Binh with the 5% (104,000) - the other child.
const moved = await family('Moved', { paidA: 1600000, paidB: 1976000 });
// Fits: paid exactly as billed.
const fits = await family('Fits', { paidA: 1520000, paidB: 2080000 });
// Unpaid: one child has paid nothing yet.
const unpaid = await family('Unpaid', { paidA: 1600000, paidB: 0 });
// Odd: the payments fit no placing of the discount.
const odd = await family('Odd', { paidA: 1600000, paidB: 2000000 });
// Locked: paid for the other child, but that child's bill is locked.
const locked = await family('Locked', { paidA: 1600000, paidB: 1976000, frozenB: true });
// Open: the same, in the month that is still open.
const open = await family('Open', { month: OPEN, paidA: 1600000, paidB: 1976000 });
// Left: paid for the other child in the closed month; the family has left since.
const left = await family('Left', { paidA: 1600000, paidB: 1976000 });
await db.query(`UPDATE public.families SET is_active = false WHERE id = $1`, [left.f]);
await db.query(`UPDATE public.students SET is_active = false WHERE family_id = $1`, [left.f]);

// ------------------------------------------------------- 1. look, change nothing
console.log('\n1. a dry run says what would move and changes nothing');
{
  const r = await swap(CLOSED, { dryRun: true }, AS_ADMIN);
  const by = new Map((r.body.results ?? []).map((x) => [x.family_name, x]));
  ok('the check runs', r.status === 200 && r.body.success === true && r.body.swapByPayments === true && r.body.dryRun === true, r.body);
  const m = by.get('Moved');
  ok('Moved: would go from An to Binh (Class B), 104,000', m?.status === 'would_swap' && m.from.student_id === moved.a && m.to.student_id === moved.b
    && m.to.class_id === CB && m.to.discount === 104000 && m.percent === 5, m);
  ok('  with both bills, as they are, as they would be, and what was paid',
    JSON.stringify(m?.bills.map((b) => [b.was, b.now, b.paid])) === JSON.stringify([[1520000, 1600000, 1600000], [2080000, 1976000, 1976000]]), m?.bills);
  ok('Fits (paid as billed) and Unpaid (a child paid nothing) are not even priced', !by.has('Fits') && !by.has('Unpaid'), [...by.keys()]);
  ok('Odd: kept, the payments fit no placing', by.get('Odd')?.status === 'kept', by.get('Odd'));
  ok('Locked: reported as skipped, with the reason', by.get('Locked')?.status === 'skipped' && /locked/i.test(by.get('Locked')?.reason ?? ''), by.get('Locked'));
  ok('a family that has left since is looked at too', by.get('Left')?.status === 'would_swap', by.get('Left'));
  ok('nothing moved', (await state(moved.f, CLOSED)).winner_student_id === moved.a && (await bill(moved.a, CLOSED)).total_amount === 1520000
    && (await bill(moved.b, CLOSED)).total_amount === 2080000 && (await log()).length === 0);
}

// --------------------------------------------------------------- 2. the swap
console.log('\n2. the swap: the discount moves and both bills are saved at what was paid');
{
  calls.length = 0;
  const r = await swap(CLOSED);
  const by = new Map((r.body.results ?? []).map((x) => [x.family_name, x]));
  const m = by.get('Moved');
  ok('Moved: swapped, both bills saved', m?.status === 'swapped' && m.saved.length === 2 && m.saved.every((s) => s.ok), m);
  const st = await state(moved.f, CLOSED);
  ok('the month\'s decision now names Binh and Class B, and says why', st.status === 'assigned' && st.winner_student_id === moved.b && st.winner_class_id === CB
    && st.sibling_percent === 5 && st.projected_base_snapshot === 2080000 && /payments recorded for 2026-09 fit/.test(st.reason), st);
  const a = await bill(moved.a, CLOSED), b = await bill(moved.b, CLOSED);
  ok('An\'s closed-month bill: 1,600,000, no discount - what was paid', a.base_amount === 1600000 && a.discount_amount === 0 && a.total_amount === 1600000 && a.recorded_payment === 1600000, a);
  ok('Binh\'s: 2,080,000 less 104,000 = 1,976,000 - what was paid', b.base_amount === 2080000 && b.discount_amount === 104000 && b.total_amount === 1976000 && b.recorded_payment === 1976000, b);
  ok('no payment was touched and nothing is owed or in credit', a.carry_out_debt === 0 && a.carry_out_credit === 0 && b.carry_out_debt === 0 && b.carry_out_credit === 0, [a, b].map((x) => [x.carry_out_debt, x.carry_out_credit]));
  const flag = (x) => (x.review_flags ?? []).find((f) => f.type === 'past_month_repriced');
  ok('each bill records the change: old and new figures, the reason, and that nobody clicked',
    flag(a)?.details.savedTotal === 1520000 && flag(a)?.details.newTotal === 1600000 && /Sibling discount moved to Moved Binh/.test(flag(a)?.details.reason ?? '')
      && /automatic/.test(flag(a)?.details.actorEmail ?? '') && flag(a)?.details.actor === null && flag(b)?.details.savedTotal === 2080000, flag(a));
  ok('the bills were saved through calculate-tuition asking to settle to the payment',
    calls.filter((c) => c.settleToPayment === true).map((c) => c.studentId).sort().join() === [moved.a, moved.b, left.a, left.b].sort().join(), calls);
  const rows = await log();
  const movedRow = rows.find((x) => x.entity_id === `${moved.f}:${CLOSED}`);
  ok('one line per move in the audit log: who, where from, where to, the bills', rows.length === 2 && movedRow?.action === 'sibling_swap_by_payments'
    && movedRow.entity === 'sibling_discount_state' && movedRow.diff.status === 'swapped'
    && movedRow.diff.to.student_name === 'Moved Binh' && movedRow.diff.bills.length === 2, rows);

  ok('a family that has left since is judged by its payments like any other', by.get('Left')?.status === 'swapped'
    && (await state(left.f, CLOSED)).winner_student_id === left.b && (await bill(left.b, CLOSED)).total_amount === 1976000 && (await bill(left.a, CLOSED)).total_amount === 1600000, by.get('Left'));
  ok('Fits, Unpaid, Odd: left exactly as they were',
    (await state(fits.f, CLOSED)).winner_student_id === fits.a && (await bill(fits.a, CLOSED)).total_amount === 1520000
      && (await state(unpaid.f, CLOSED)).winner_student_id === unpaid.a && (await state(odd.f, CLOSED)).winner_student_id === odd.a
      && (await bill(odd.b, CLOSED)).total_amount === 2080000);
  ok('Locked: nothing moved, the locked bill and the decision stand', by.get('Locked')?.status === 'skipped'
    && (await state(locked.f, CLOSED)).winner_student_id === locked.a && (await bill(locked.b, CLOSED)).total_amount === 2080000 && (await bill(locked.a, CLOSED)).total_amount === 1520000);

  const again = await swap(CLOSED);
  ok('run again: Moved now fits and is not touched', !(again.body.results ?? []).some((x) => x.family_name === 'Moved') && (await log()).length === 2, again.body.results);
}

// ------------------------------------------------------------ 3. an open month
console.log('\n3. the month that is still open');
{
  const r = await swap(OPEN);
  const m = (r.body.results ?? []).find((x) => x.family_name === 'Open');
  const a = await bill(open.a, OPEN), b = await bill(open.b, OPEN);
  ok('swapped, and both bills equal the payments', m?.status === 'swapped' && a.total_amount === 1600000 && b.total_amount === 1976000 && b.discount_amount === 104000, { m, a: a.total_amount, b: b.total_amount });
  ok('an open month needs no approval, so none is recorded', !(a.review_flags ?? []).some((f) => f.type === 'past_month_repriced'));
  ok('only the family of that month was looked at', (r.body.results ?? []).every((x) => x.month === OPEN));
}

// ------------------------------------ 4. settleToPayment is not a way round the hold
console.log('\n4. a closed month is saved only when it then equals what was paid');
{
  // Odd: today's pricing gives Binh 2,080,000; the bill says so too. Make the bill differ.
  await db.query(`UPDATE public.invoices SET total_amount = 2000000, discount_amount = 80000 WHERE student_id = $1 AND month = $2`, [odd.b, CLOSED]);
  const before = await bill(odd.b, CLOSED);
  let r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED, settleToPayment: true, reason: 'test' });
  let after = await bill(odd.b, CLOSED);
  ok('new figures 2,080,000, paid 2,000,000: held, the bill stays as charged', r.status === 200 && r.body.held?.reason === 'past_month_changed'
    && after.total_amount === 2000000 && r.body.totalAmount === 2000000 && before.total_amount === after.total_amount, r.body.held);
  // Now the payment is what the new figures come to: it may be saved - by the service role only.
  await db.query(`UPDATE public.invoices SET recorded_payment = 2080000 WHERE student_id = $1 AND month = $2`, [odd.b, CLOSED]);
  r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED, settleToPayment: true, reason: 'test' }, AS_ADMIN);
  ok('an admin sending settleToPayment (without approving) changes nothing', r.body.held?.reason === 'past_month_changed' && (await bill(odd.b, CLOSED)).total_amount === 2000000, r.body.held);
  r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED, settleToPayment: true });
  ok('without a reason it is refused', r.status === 400 && /reason/i.test(r.body.error ?? '') && (await bill(odd.b, CLOSED)).total_amount === 2000000, r.body);
  r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED, settleToPayment: true, reason: 'test' });
  after = await bill(odd.b, CLOSED);
  ok('the service role, new figures = paid: saved', r.status === 200 && r.body.held === undefined && after.total_amount === 2080000 && after.discount_amount === 0, r.body.held);
  // And a plain service call never does: the ordinary hold.
  await db.query(`UPDATE public.invoices SET total_amount = 2000000, discount_amount = 80000 WHERE student_id = $1 AND month = $2`, [odd.b, CLOSED]);
  r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED });
  ok('a plain call from the service role is held as before', r.body.held?.reason === 'past_month_changed' && (await bill(odd.b, CLOSED)).total_amount === 2000000, r.body.held);
  r = await call('calculate-tuition', { studentId: odd.b, month: CLOSED, force: true, reason: 'x' });
  ok('and the service role\'s force is still ignored', r.body.held?.reason === 'past_month_changed' && (await bill(odd.b, CLOSED)).total_amount === 2000000, r.body.held);
}

// ------------------------------------------------ 5. the ordinary run is untouched
console.log('\n5. the ordinary sibling run still keeps a decided month');
{
  const r = await call('compute-sibling-discounts', { month: CLOSED, familyIds: [fits.f] });
  const row = (r.body.results ?? [])[0];
  ok('a decided month is kept, not chosen again', r.status === 200 && row?.kept === true && row.winner_student_id === fits.a && (await state(fits.f, CLOSED)).winner_student_id === fits.a, row);
  const src = read('supabase', 'functions', 'compute-sibling-discounts', 'index.ts').replace(/\/\/[^\n]*/g, '');
  ok('the swap decides with the pricing module\'s rule, and only moves a decision it judged',
    /siblingFitByPayments\(/.test(src) && /\.eq\('winner_student_id', state\.winner_student_id\)/.test(src) && !/reassign/.test(src.slice(src.indexOf('async function swapFamilyByPayments'), src.indexOf('const corsHeaders'))));
  const hourly = read('supabase', 'functions', 'refresh-month-bills', 'index.ts').replace(/\/\/[^\n]*/g, '');
  ok('the hourly job asks for it, for the months it may touch, and never fails over it', /swapByPayments: true/.test(hourly) && /await swapSiblings\(url, serviceKey, month\)/.test(hourly));
}

// ----------------------------------------------------- 6. what the admin reads
console.log('\n6. the lines on the screens');
{
  const lib = async (file) => {
    const f = join(out, `${file}.mjs`);
    writeFileSync(f, (await build({ entryPoints: [join(repo, 'src', 'lib', `${file}.ts`)], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
    return import(pathToFileURL(f).href);
  };
  const s = await lib('siblingSwaps');
  const done = (await log()).find((x) => x.diff?.family_name === 'Moved').diff;
  const line = s.swapLine(done);
  ok('a move: "Moved from An to Binh (Class B)" with the two bills', line.tone === 'done' && line.headline === 'Moved from Moved An to Moved Binh (Class B)' && line.bills.length === 2 && line.problems.length === 0, line);
  ok('a would-be move reads as one', s.swapLine({ status: 'would_swap', from: { student_name: 'An' }, to: { student_name: 'Binh' }, bills: [{ was: 1, now: 2, paid: 2 }] }).headline === 'Would move from An to Binh');
  const bad = s.swapLine({ status: 'swapped_bills_not_saved', from: { student_name: 'An' }, to: { student_name: 'Binh' }, saved: [{ student_name: 'An', ok: true }, { student_name: 'Binh', ok: false, error: 'held' }] });
  ok('a bill that did not save is named', bad.tone === 'problem' && bad.problems.join() === 'Binh: held', bad);
  ok('a locked bill says so', s.swapLine({ status: 'skipped', reason: 'A bill is locked' }).problems[0] === 'A bill is locked');
  ok('kept results are not shown', s.swapsToShow([{ status: 'kept' }, { status: 'would_swap' }, { status: 'error', reason: 'x' }]).length === 2);
  ok('the action name is the function\'s', s.SIBLING_SWAP_ACTION === 'sibling_swap_by_payments'
    && /SWAP_ACTION = 'sibling_swap_by_payments'/.test(read('supabase', 'functions', 'compute-sibling-discounts', 'index.ts')));

  const t = await lib('freeTrialLessons');
  const L = (state, extra = {}) => ({ session_id: `s-${state}`, date: '2026-11-03', price_vnd: 210000, state, ...extra });
  const rows = t.trialRows([L('trial', { date: '2026-11-10' }), L('billed'), L('excused', { date: '2026-11-05' }), L('cancelled', { date: '2026-11-12' }), L('free', { date: '2026-11-17' })]);
  ok('lessons oldest first', rows.map((r) => r.lesson.state).join() === 'billed,excused,trial,cancelled,free', rows.map((r) => r.lesson.state));
  ok('a charged or excused lesson can be made a free trial; a trial can be charged again; cancelled and free places have no button',
    rows.map((r) => r.action).join() === 'give,give,take_back,,', rows.map((r) => r.action));
  ok('what the month\'s free trials are worth', JSON.stringify(t.trialValue([L('trial'), L('trial'), L('billed')])) === JSON.stringify({ lessons: 2, amount: 420000 }));
  ok('the table missing is recognised, another error is not', t.isMissingTrialTable({ code: 'PGRST205' }) && t.isMissingTrialTable({ code: '42P01' }) && !t.isMissingTrialTable({ code: '42501', message: 'permission denied' }));

  // The edge reader: missing table = none; any other error fails the calculation.
  const f = join(out, 'free-trial.mjs');
  writeFileSync(f, (await build({ entryPoints: [join(libDir, 'free-trial.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const ft = await import(pathToFileURL(f).href);
  const client = (answer) => { const q = { select: () => q, in: () => q, gt: () => q, order: () => q, limit: () => Promise.resolve(answer) }; return { from: () => q }; };
  const found = await ft.readFreeTrials(client({ data: [{ id: '1', session_id: 's1', student_id: 'k1' }], error: null }), ['k1'], ['s1', 's2']);
  ok('the calculators\' reader returns the ticked lessons', found.has(ft.freeTrialKey('s1', 'k1')) && found.size === 1);
  ok('no students or no lessons: no read, none', (await ft.readFreeTrials({ from: () => { throw new Error('read'); } }, [], ['s1'])).size === 0);
  ok('the table not installed yet: none, not a failure', (await ft.readFreeTrials(client({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.free_trial_lessons' in the schema cache" } }), ['k1'], ['s1'])).size === 0);
  let threw = null;
  try { await ft.readFreeTrials(client({ data: null, error: { code: '57014', message: 'timeout' } }), ['k1'], ['s1']); } catch (e) { threw = e; }
  ok('any other read error fails the calculation (a free trial left out is a wrong charge)', /free trial/.test(threw?.message ?? ''), threw?.message);
  for (const fn of ['calculate-tuition', 'calculate-tuition-bulk']) {
    const src = read('supabase', 'functions', fn, 'index.ts');
    ok(`${fn} reads the free trials and hands them to the pricing module`, /readFreeTrials\(supabase,/.test(src) && /isFreeTrial: \(sessionId: string\) => freeTrials\.has\(freeTrialKey\(sessionId,/.test(src));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
