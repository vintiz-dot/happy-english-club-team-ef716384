// Independent review probes for scripts/CREDIT-past-unapplied-cash.sql and the
// delete-payment keyKind change (docs/evidence/CREDIT-review.md).
//
//   node docs/evidence/CREDIT-review-probes.mjs
//
// pglite only. The database is the D4 prelude (scripts/pgtest/d4-prelude.mjs)
// with invoices brought to live's shape (invoice_status enum, paid_amount),
// then the REAL migrations in paste order: audit, cancelled-lesson guard,
// enrolment guard, D1, D2, freeze, carry, invoice_paid_label, D4 1a floors
// (20261114090000) and D4 1b register (20261114091000). The real
// smart-family-payment and delete-payment (this branch) and origin/main's
// delete-payment are bundled and run over a PostgREST stand-in (the
// builder's, copied). Synthetic ids and amounts only.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeDb, sqlOf, migPath } from '../../scripts/pgtest/d4-prelude.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SCRIPT = readFileSync(join(repo, 'scripts', 'CREDIT-past-unapplied-cash.sql'), 'utf8');

let pass = 0, fail = 0;
const results = [];
const ok = (name, value, extra) => {
  const line = `  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`;
  console.log(line); results.push(line);
  value ? pass++ : fail++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAMILY = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const KA = '11111111-1111-4111-8111-111111111111';
const KB = '22222222-2222-4222-8222-222222222222';
const KC = '33333333-3333-4333-8333-333333333333';
const KA2 = '44444444-4444-4444-8444-444444444444';   // A's sibling (two-child payment)
const P = { A: 'a0000000-0000-4000-8000-00000000000a', B: 'b0000000-0000-4000-8000-00000000000b', C: 'c0000000-0000-4000-8000-00000000000c' };
const LEFT = { A: 200000, B: 258000, C: 250000 };
const SRC = { A: '2026-02', B: '2026-05', C: '2026-08' };
const METHOD = { A: 'Cash', B: 'Bank Transfer', C: 'cash' };
const KID = { A: KA, B: KB, C: KC };
const CUR = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
if (CUR <= '2026-09') { console.error('Hanoi month not after fixture months'); process.exit(2); }

// ------------------------------------------------------------- database
const BASE = [
  '20261009130000_audit_every_admin_action.sql',
  '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql',
  '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql',
  '20261106120000_invoice_tuition_freeze.sql',
  '20261009120000_keep_invoice_carry_balances_correct.sql',
];
const D4 = ['20261114090000_d4_floors.sql', '20261114091000_d4_core_register.sql'];
let db;
async function fresh({ d4 = true } = {}) {
  if (db) await db.close();
  const d = await makeDb(PGlite, { people: true, migrations: [] });
  // invoices to live's shape BEFORE any view or function is created over them
  await d.exec(`
    CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
    ALTER TABLE public.invoices ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.invoices ALTER COLUMN status TYPE public.invoice_status USING status::public.invoice_status;
    ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
    ALTER TABLE public.invoices ALTER COLUMN recorded_payment SET DEFAULT 0,
      ALTER COLUMN carry_in_credit SET DEFAULT 0, ALTER COLUMN carry_in_debt SET DEFAULT 0,
      ALTER COLUMN carry_out_credit SET DEFAULT 0, ALTER COLUMN carry_out_debt SET DEFAULT 0,
      ADD COLUMN paid_amount integer NOT NULL DEFAULT 0, ADD COLUMN number text,
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN created_by uuid, ADD COLUMN updated_by uuid;
    CREATE TYPE public.account_code AS ENUM ('AR', 'REVENUE', 'DISCOUNT', 'CASH', 'BANK', 'CREDIT');
    CREATE TABLE public.ledger_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      code public.account_code NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(student_id, code));
    CREATE TABLE public.ledger_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tx_id UUID NOT NULL,
      account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
      debit INTEGER NOT NULL DEFAULT 0, credit INTEGER NOT NULL DEFAULT 0,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), memo TEXT, month TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID, tx_key TEXT UNIQUE,
      CONSTRAINT debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)));
    CREATE TABLE public.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL, method TEXT NOT NULL, memo TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID, family_id uuid, parent_payment_id uuid);
    CREATE TABLE public.payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
      student_id UUID NOT NULL, allocated_amount INTEGER NOT NULL, allocation_order INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID);
    CREATE TABLE public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid, snapshot jsonb,
      deleted_by uuid, deletion_reason text, deleted_at timestamptz DEFAULT now());
    INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  `);
  for (const m of BASE) await d.exec(sqlOf(migPath(m)));
  {
    const t = sqlOf(migPath('20261113090000_invoice_paid_label.sql'));
    const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
    const b = t.indexOf('$function$;', a);
    await d.exec(t.slice(a, b + '$function$;'.length));
  }
  if (d4) for (const m of D4) await d.exec(sqlOf(migPath(m)));
  db = d;
  await db.query('INSERT INTO public.families (id, name) VALUES ($1, $2)', [FAMILY, 'Family']);
  return d;
}

// ---------------------------------------------- PostgREST stand-in (builder's, copied)
function query(table) {
  let mode = 'select', cols = '*', payload = null, onConflict = '', ignoreDup = false, order = '', lim = '';
  const where = [], params = [];
  let embeds = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const val = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
  const parseCols = (c) => {
    embeds = [...c.matchAll(/(\w+)(!inner)?\(([^)]*)\)/g)].map((m) => ({ rel: m[1], cols: m[3] }));
    return c.replace(/,?\s*\w+(!inner)?\([^)]*\)/g, '').trim() || '*';
  };
  async function attach(rows) {
    for (const e of embeds) for (const r of rows) {
      if (e.rel === 'payment_allocations') r.payment_allocations = (await db.query(`SELECT ${e.cols} FROM public.payment_allocations WHERE parent_payment_id = $1`, [r.id])).rows;
      if (e.rel === 'ledger_accounts') r.ledger_accounts = (await db.query('SELECT student_id, code::text AS code FROM public.ledger_accounts WHERE id = $1', [r.account_id])).rows[0] ?? null;
    }
    return rows;
  }
  async function run() {
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') return { data: await attach((await db.query(`SELECT ${cols} FROM public.${table}${w}${order}${lim}`, params)).rows), error: null };
      if (mode === 'insert' || mode === 'upsert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const vals = rows.map((r) => `(${keys.map((k) => (k in r ? p(val(r[k])) : 'DEFAULT')).join(', ')})`).join(', ');
        const conflict = mode === 'upsert' ? (ignoreDup ? ` ON CONFLICT (${onConflict}) DO NOTHING`
          : ` ON CONFLICT (${onConflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`) : '';
        const r = await db.query(`INSERT INTO public.${table} (${keys.join(', ')}) VALUES ${vals}${conflict} RETURNING *`, params);
        return { data: r.rows, error: null };
      }
      if (mode === 'update') {
        const filters = [...where], filterParams = [...params];
        params.length = 0;
        const set = Object.keys(payload).map((k) => `${k} = ${p(val(payload[k]))}`).join(', ');
        const shifted = filters.map((c) => c.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + params.length}`));
        const r = await db.query(`UPDATE public.${table} SET ${set}${shifted.length ? ` WHERE ${shifted.join(' AND ')}` : ''} RETURNING *`, [...params, ...filterParams]);
        return { data: r.rows, error: null };
      }
      if (mode === 'delete') { await db.query(`DELETE FROM public.${table}${w}`, params); return { data: null, error: null }; }
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
  const q = {
    select(c = '*') { if (mode === 'select') cols = parseCols(c); return q; },
    eq(k, v) { where.push(`${k}::text = ${p(String(v))}`); return q; },
    neq(k, v) { where.push(`${k}::text <> ${p(String(v))}`); return q; },
    in(k, vs) { where.push(`${k}::text = ANY(${p(vs.map(String))}::text[])`); return q; },
    like(k, pat) { where.push(`${k} LIKE ${p(pat)}`); return q; },
    order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} ${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
    limit(n) { lim = ` LIMIT ${Number(n)}`; return q; },
    insert(v) { mode = 'insert'; payload = v; return q; },
    upsert(v, o = {}) { mode = 'upsert'; payload = v; onConflict = o.onConflict; ignoreDup = !!o.ignoreDuplicates; return q; },
    update(v) { mode = 'update'; payload = v; return q; },
    delete() { mode = 'delete'; return q; },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error ?? (r.data?.length ? null : { message: 'no rows' }) })); },
    then(a, b) { return run().then(a, b); },
  };
  return q;
}
async function tuitionFor({ studentId, month }) {
  const b = (await db.query('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [studentId, month])).rows[0];
  if (!b) return { data: null, error: new Error('no bill') };
  return { data: { baseAmount: b.base_amount, totalDiscount: b.discount_amount, totalAmount: b.total_amount,
    carry: { carryOutDebt: b.carry_out_debt, carryOutCredit: b.carry_out_credit } }, error: null };
}
globalThis.__crvZod = z;
globalThis.__crvClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: ADMIN } }, error: null }) },
  from: (t) => query(t),
  functions: { invoke: async (name, { body }) => (name === 'calculate-tuition' ? tuitionFor(body) : { data: null, error: null }) },
});
const handlers = {};
const realLog = console.log, realErr = console.error;
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
const out = mkdtempSync(join(tmpdir(), 'credit-review-'));
const plugin = { name: 'boundaries', setup(b) {
  b.onResolve({ filter: /(^https?:\/\/|\/rate-limit\.ts$)/ }, (args) => ({ path: args.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({ loader: 'js', contents:
    args.path.includes('supabase-js') ? 'export const createClient = globalThis.__crvClient;'
    : args.path.includes('zod') ? 'export const z = globalThis.__crvZod;'
    : 'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};' }));
} };
async function load(name, opts) {
  const bundle = await build({ ...opts, bundle: true, format: 'esm', platform: 'node', write: false, plugins: [plugin] });
  const file = join(out, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}
await load('smart-family-payment', { entryPoints: [join(repo, 'supabase/functions/smart-family-payment/index.ts')] });
await load('delete-payment', { entryPoints: [join(repo, 'supabase/functions/delete-payment/index.ts')] });
// origin/main's delete-payment index.ts, with THIS branch's _lib (so only index.ts differs)
const mainSrc = execSync('git show origin/main:supabase/functions/delete-payment/index.ts', { cwd: repo, encoding: 'utf8' });
await load('delete-payment-main', { stdin: { contents: mainSrc, resolveDir: join(repo, 'supabase/functions/delete-payment'), loader: 'ts', sourcefile: 'main-delete-payment.ts' } });
const quiet = async (fn) => { console.log = () => {}; console.error = () => {}; try { return await fn(); } finally { console.log = realLog; console.error = realErr; } };
const call = (name, body) => quiet(async () => {
  const res = await handlers[name](new Request('http://localhost/fn', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
});

// ---------------------------------------------------------------- fixture
const acc = (k, code) => `${k.slice(0, 8)}-0000-4000-8000-${{ AR: '00000000000a', CASH: '00000000000c', BANK: '00000000000b', CREDIT: '00000000000e' }[code]}`;
const bill = (sid, month, total, recorded, extra = {}) => db.query(
  `INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status, confirmation_status)
   VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)`,
  [sid, month, extra.base ?? total, extra.discount ?? 0, total, recorded, extra.status ?? (recorded >= total ? 'paid' : recorded > 0 ? 'partial' : 'issued'), extra.conf ?? 'auto_approved']);
const ins = (tx, key, account, debit, credit, month) => db.query(
  'INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, month, memo) VALUES ($1,$2,$3,$4,$5,$6,$7)',
  [tx, key, account, debit, credit, month, 'synthetic']);
async function student(sid, name) {
  await db.query('INSERT INTO public.students (id, full_name, family_id, is_active) VALUES ($1, $2, $3, true)', [sid, name, FAMILY]);
  for (const code of ['AR', 'CASH', 'BANK', 'CREDIT']) await db.query('INSERT INTO public.ledger_accounts (id, student_id, code) VALUES ($1,$2,$3)', [acc(sid, code), sid, code]);
}
/** pre-change smart-family-payment: 400,000 applied per listed child, the rest a DR AR / CR CREDIT pair on the first. */
async function oldPayment(k, opts = {}) {
  const sid = KID[k], pid = P[k], L = opts.amount ?? LEFT[k];
  const kids = opts.kids ?? [sid];
  const cash = METHOD[k].toLowerCase() === 'cash' ? 'CASH' : 'BANK';
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
    [pid, sid, 400000 * kids.length + L, METHOD[k], FAMILY, ADMIN]);
  let n = 1;
  for (const kid of kids) {
    await db.query('INSERT INTO public.payment_allocations (parent_payment_id, student_id, allocated_amount, allocation_order) VALUES ($1,$2,400000,$3)', [pid, kid, n]);
    const ta = `${pid.slice(0, 8)}-1111-4000-8000-00000000010${n}`;
    await ins(ta, `smart-family-${pid}-${kid}-170000000000${n}`, acc(kid, cash), 400000, 0, SRC[k]);
    await ins(ta, null, acc(kid, 'AR'), 0, 400000, SRC[k]);
    n++;
  }
  const tb = `${pid.slice(0, 8)}-1111-4000-8000-000000000002`;
  const onKid = opts.leftoverOn ?? sid;
  await ins(tb, `smart-family-credit-${pid}-1700000000009`, acc(onKid, 'AR'), L, 0, SRC[k]);
  await ins(tb, null, acc(opts.creditOn ?? onKid, opts.otherCode ?? 'CREDIT'), 0, opts.creditAmount ?? L, SRC[k]);
}
async function liveShape(opts = {}) {
  await fresh(opts);
  for (const k of ['A', 'B', 'C']) { await student(KID[k], `Child ${k}`); await bill(KID[k], SRC[k], 400000, 400000); }
  await bill(KA, CUR, 400000, 400000, opts.aCur ?? {});
  await bill(KB, CUR, 350000, 100000, { base: 400000, discount: 50000, conf: 'confirmed' });
  await db.query("UPDATE public.invoices SET tuition_frozen = true, frozen_reason = 'history corrected' WHERE student_id = $1 AND month = $2", [KB, CUR]);
  await bill(KC, '2026-09', 400000, 400000);
  if (!opts.skipPayments) for (const k of ['A', 'B', 'C']) await oldPayment(k);
}
const getBill = async (sid, month) => (await db.query('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [sid, month])).rows[0] ?? null;
const nets = async (sid) => Object.fromEntries((await db.query(
  `SELECT a.code::text AS code, sum(e.debit - e.credit)::int AS net FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE a.student_id = $1 GROUP BY 1 ORDER BY 1`, [sid])).rows.map((r) => [r.code, r.net]));
const dump = async () => JSON.stringify({
  inv: (await db.query('SELECT student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status, confirmation_status, tuition_frozen, carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt FROM public.invoices ORDER BY student_id, month')).rows,
  led: (await db.query('SELECT tx_id, tx_key, account_id, debit, credit, month FROM public.ledger_entries ORDER BY id')).rows,
  acc: (await db.query('SELECT student_id, code::text FROM public.ledger_accounts ORDER BY student_id, code')).rows,
  pay: (await db.query('SELECT id, amount FROM public.payments ORDER BY id')).rows,
  floor: (await db.query("SELECT to_regclass('public.invoice_state_floor') IS NOT NULL AS has")).rows[0].has
    ? (await db.query('SELECT student_id, month, ever_paid, ever_signed, ever_frozen, max_recorded_payment FROM public.invoice_state_floor ORDER BY 1, 2')).rows : null,
});
/** a dump with the per-run random values (ids, tx_ids, timestamps, reversal keys' entry ids) taken out, for comparing two runs */
const shape = async () => {
  const led = (await db.query(`SELECT regexp_replace(coalesce(tx_key, ''), '-[0-9a-f-]{36}$', '-<entry>') AS k, a.student_id, a.code::text AS code, debit, credit, month
     FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id ORDER BY 1, 2, 3, 4, 5, 6`)).rows;
  const inv = (await db.query('SELECT student_id, month, total_amount, recorded_payment, paid_amount, status, carry_out_credit, carry_out_debt FROM public.invoices ORDER BY 1, 2')).rows;
  const pay = (await db.query('SELECT count(*)::int n FROM public.payments')).rows[0].n;
  return JSON.stringify({ led, inv, pay });
};
const notices = [];
async function runScript() {
  try {
    const res = await db.exec(SCRIPT);
    const row = res.filter((r) => r.rows?.length).at(-1)?.rows[0];
    return { ok: true, row: row && { credited: Number(row.leftovers_credited), total: Number(row.total_vnd), left: Number(row.still_to_credit) } };
  } catch (e) { await db.exec('ROLLBACK').catch(() => {}); return { ok: false, error: e.message }; }
}
const UUIDISH = /[0-9a-f]{8}-[0-9a-f]{4}-/i;

// =================================================================== probes
console.log('\nR1 live shape with D4 1a floors + 1b register installed');
{
  await liveShape();
  const has = (await db.query(`SELECT to_regclass('public.invoice_state_floor') IS NOT NULL a, to_regclass('public.money_change_events') IS NOT NULL b,
    (SELECT count(*)::int FROM pg_trigger WHERE tgname = 'zz_invoice_state_floor') t`)).rows[0];
  ok('R1a the real 1a floors (invoice trigger) and 1b register are installed over live-shaped invoices', has.a && has.b && has.t === 1, has);
  const r1 = await runScript();
  ok('R1b first run: 3 / 708,000 / 0', r1.ok && same(r1.row, { credited: 3, total: 708000, left: 0 }), r1);
  const floorRows = (await db.query('SELECT count(*)::int n FROM public.invoice_state_floor')).rows[0].n;
  const events = (await db.query('SELECT count(*)::int n FROM public.money_change_events')).rows[0].n;
  ok('R1c the floor records nothing (raising recorded_payment lowers nothing) and the register logs no event', floorRows === 0 && events === 0, { floorRows, events });
  const a = await getBill(KA, CUR), b = await getBill(KB, CUR), c = await getBill(KC, '2026-09');
  ok('R1d bills: A 600,000 paid c/o 200,000; B frozen 400k/50k/350k kept, 358,000 paid c/o 8,000, still confirmed; C (Sep) 650,000 c/o 250,000',
    a.recorded_payment === 600000 && a.carry_out_credit === 200000 && a.status === 'paid'
    && b.tuition_frozen && b.base_amount === 400000 && b.discount_amount === 50000 && b.total_amount === 350000 && b.recorded_payment === 358000
    && b.carry_out_credit === 8000 && b.status === 'paid' && b.confirmation_status === 'confirmed'
    && c.recorded_payment === 650000 && c.carry_out_credit === 250000, { a, b, c });
  ok('R1e paid_amount moved with recorded_payment for smart payments (as the new smart-family-payment does)',
    a.paid_amount === 600000 && b.paid_amount === 358000 && c.paid_amount === 650000, [a.paid_amount, b.paid_amount, c.paid_amount]);
  const snap = await dump();
  const r2 = await runScript();
  ok('R1f second run: same row, not one row changed (floor tables included)', r2.ok && same(r2.row, r1.row) && (await dump()) === snap, r2);
  const all = (await db.query('SELECT sum(debit)::bigint d, sum(credit)::bigint c FROM public.ledger_entries')).rows[0];
  ok('R1g ledger balances', all.d === all.c, all);
  // per month view: what moved where
  const arByMonth = (await db.query(`SELECT e.month, sum(e.debit - e.credit)::int n FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE a.student_id = $1 AND a.code = 'AR' GROUP BY 1 ORDER BY 1`, [KA])).rows;
  ok(`R1h child A AR by month: ${SRC.A} -400,000 (old pair + reclass net 0), ${CUR} -200,000 (the cash leg)`,
    same(arByMonth, [{ month: SRC.A, n: -400000 }, { month: CUR, n: -200000 }]), arByMonth);
}

console.log('\nR2 delete-payment AFTER the credit, floors installed');
{
  await liveShape();
  await runScript();
  const d = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  const n = await nets(KA);
  ok('R2a 200; child A nets 0 on every account', d.status === 200 && Object.values(n).every((v) => v === 0), { d: d.body, n });
  const feb = await getBill(KA, SRC.A), cur = await getBill(KA, CUR);
  ok('R2b Feb recorded 0, current back to 400,000, carry-out credit 0, paid_amount back to 400,000 on current',
    feb.recorded_payment === 0 && cur.recorded_payment === 400000 && cur.carry_out_credit === 0 && cur.paid_amount === 400000, { feb, cur });
  const fl = (await db.query('SELECT month, ever_paid, max_recorded_payment::int m FROM public.invoice_state_floor WHERE student_id = $1 ORDER BY 1', [KA])).rows;
  ok('R2c the 1a floor RECORDS both lowerings (Feb 400,000, current 600,000) and refuses nothing', same(fl, [{ month: SRC.A, ever_paid: true, m: 400000 }, { month: CUR, ever_paid: true, m: 600000 }]), fl);
  const per = (await db.query(`SELECT a.code::text code, e.month, sum(e.debit - e.credit)::int n FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE a.student_id = $1 GROUP BY 1, 2 HAVING sum(e.debit - e.credit) <> 0`, [KA])).rows;
  ok('R2d and nets 0 per account PER MONTH too', per.length === 0, per);
  const rr = await runScript();
  ok('R2e script after that delete: no re-credit (3 / 708,000 / 0), current stays 400,000', rr.ok && same(rr.row, { credited: 3, total: 708000, left: 0 }) && (await getBill(KA, CUR)).recorded_payment === 400000, rr);
}

console.log('\nR3 delete-payment after the credit, refusals and concurrency');
{
  await liveShape();
  await runScript();
  await db.query('UPDATE public.invoices SET recorded_payment = 450000 WHERE student_id = $1 AND month = $2', [KA, CUR]);   // edited down in RPM
  const snap = await dump();
  const d = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  ok('R3a current bill edited down to 450,000 (still >= the 200,000 the credit put there): delete proceeds, 450,000 -> 250,000',
    d.status === 200 && (await getBill(KA, CUR)).recorded_payment === 250000, d);
  await liveShape();
  await runScript();
  await db.query('UPDATE public.invoices SET recorded_payment = 150000 WHERE student_id = $1 AND month = $2', [KA, CUR]);
  const snap2 = await dump();
  const d2 = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  ok('R3b current bill holds 150,000 < the 200,000 the credit put there: 409, nothing changed', d2.status === 409 && (await dump()) === snap2, d2);
  // C: latest bill (Sep) is not the source month; put C's latest bill ON the source month instead
  await liveShape();
  await db.query("DELETE FROM public.invoices WHERE student_id = $1 AND month = '2026-09'", [KC]);
  await runScript();
  const cAug = await getBill(KC, SRC.C);
  ok('R3c C with no bill after August: credit lands on the August bill itself (650,000)', cAug.recorded_payment === 650000, cAug);
  const d3 = await call('delete-payment', { paymentId: P.C, deleteReason: 'probe' });
  ok('R3d delete then takes 400,000 + 250,000 off that one bill (summed per month), all accounts 0',
    d3.status === 200 && (await getBill(KC, SRC.C)).recorded_payment === 0 && Object.values(await nets(KC)).every((v) => v === 0), { d3: d3.body, n: await nets(KC) });
  // a new payment lands on A's current bill after the credit; delete the old one
  await liveShape();
  await runScript();
  await db.query('UPDATE public.invoices SET recorded_payment = recorded_payment + 70000 WHERE student_id = $1 AND month = $2', [KA, CUR]);
  const d4 = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  ok('R3e another 70,000 recorded since: delete takes only the credit (670,000 -> 470,000)', d4.status === 200 && (await getBill(KA, CUR)).recorded_payment === 470000, d4.body.bill_changes);
}

console.log('\nR4 labels');
{
  await liveShape({ aCur: { status: 'credit' } });
  await runScript();
  ok("R4a an admin's 'credit' label on the target bill is kept", (await getBill(KA, CUR)).status === 'credit');
  await liveShape();
  await db.query("UPDATE public.invoices SET total_amount = 900000, base_amount = 900000, recorded_payment = 0, paid_amount = 0, status = 'issued' WHERE student_id = $1 AND month = $2", [KA, CUR]);
  await runScript();
  const a = await getBill(KA, CUR);
  ok('R4b an unpaid 900,000 bill credited 200,000: partial (invoice_paid_label), carry-out debt 700,000', a.status === 'partial' && a.recorded_payment === 200000 && a.carry_out_debt === 700000, a);
}

console.log('\nR5 a two-child payment (allocation to A and a sibling, leftover on A)');
{
  await fresh();
  await student(KA, 'Child A'); await student(KA2, 'Child A2'); await student(KB, 'Child B'); await student(KC, 'Child C');
  for (const sid of [KA, KA2]) await bill(sid, SRC.A, 400000, 400000);
  await bill(KB, SRC.B, 400000, 400000); await bill(KC, SRC.C, 400000, 400000);
  for (const sid of [KA, KA2, KB]) await bill(sid, CUR, 400000, 400000);
  await bill(KC, '2026-09', 400000, 400000);
  await oldPayment('A', { kids: [KA, KA2] }); await oldPayment('B'); await oldPayment('C');
  const r = await runScript();
  ok('R5a credited 3 / 708,000; A\'s current bill 600,000, A2\'s untouched', r.ok && same(r.row, { credited: 3, total: 708000, left: 0 })
    && (await getBill(KA, CUR)).recorded_payment === 600000 && (await getBill(KA2, CUR)).recorded_payment === 400000, r);
  const d = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  ok('R5b delete after: both children net 0 on every account; both Feb bills 0; A current 400,000',
    d.status === 200 && Object.values(await nets(KA)).every((v) => v === 0) && Object.values(await nets(KA2)).every((v) => v === 0)
    && (await getBill(KA, SRC.A)).recorded_payment === 0 && (await getBill(KA2, SRC.A)).recorded_payment === 0 && (await getBill(KA, CUR)).recorded_payment === 400000,
    { d: d.body, a: await nets(KA), a2: await nets(KA2) });
}

console.log('\nR6 refusals (each: an error, and not one row changed)');
const refusal = async (name, prep, re) => {
  await prep();
  const snap = await dump();
  const rr = await runScript();
  ok(`${name}`, !rr.ok && re.test(rr.error) && (await dump()) === snap, rr);
  if (!rr.ok) ok(`  its message names no id and no child`, !UUIDISH.test(rr.error) && !/Child/.test(rr.error), rr.error);
  return rr;
};
await refusal('R6a a 4th leftover (another payment, 1,000)', async () => {
  await liveShape();
  const pid = 'd0000000-0000-4000-8000-00000000000d';
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id) VALUES ($1,$2,1000,$3,$4)', [pid, KA, 'cash', FAMILY]);
  await ins('d0000000-1111-4000-8000-000000000001', `smart-family-credit-${pid}-1`, acc(KA, 'AR'), 1000, 0, '2026-03');
  await ins('d0000000-1111-4000-8000-000000000001', null, acc(KA, 'CREDIT'), 0, 1000, '2026-03');
}, /expected 3 leftovers/);
await refusal('R6b a 4th leftover that was already reversed (deleted) still counts: refused, the constant must be recounted', async () => {
  await liveShape();
  const pid = 'd0000000-0000-4000-8000-00000000000d';
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id) VALUES ($1,$2,1000,$3,$4)', [pid, KA, 'cash', FAMILY]);
  await ins('d0000000-1111-4000-8000-000000000001', `smart-family-credit-${pid}-1`, acc(KA, 'AR'), 1000, 0, '2026-03');
  await ins('d0000000-1111-4000-8000-000000000001', null, acc(KA, 'CREDIT'), 0, 1000, '2026-03');
  await call('delete-payment', { paymentId: pid, deleteReason: 'probe' });
}, /expected 3 leftovers/);
await refusal('R6c one payment with leftover pairs on TWO children (3 rows, 708,000 in all)', async () => {
  await liveShape({ skipPayments: true });
  await oldPayment('A'); await oldPayment('B');
  await ins('b0000000-1111-4000-8000-000000000003', `smart-family-credit-${P.B}-1700000000010`, acc(KC, 'AR'), 250000, 0, SRC.B);
  await ins('b0000000-1111-4000-8000-000000000003', null, acc(KC, 'CREDIT'), 0, 250000, SRC.B);
}, /more than one leftover/);
await refusal('R6d pair whose CREDIT leg is on ANOTHER child', async () => {
  await liveShape({ skipPayments: true });
  await oldPayment('A', { creditOn: KB }); await oldPayment('B'); await oldPayment('C');
}, /not exactly a DR AR \/ CR CREDIT pair/);
await refusal('R6e pair whose unkeyed leg is CASH, not CREDIT', async () => {
  await liveShape({ skipPayments: true });
  await oldPayment('A', { otherCode: 'CASH' }); await oldPayment('B'); await oldPayment('C');
}, /not exactly a DR AR \/ CR CREDIT pair/);
await refusal('R6f pair of two amounts (DR AR 200,000 / CR CREDIT 199,999 - unbalanced)', async () => {
  await liveShape({ skipPayments: true });
  await oldPayment('A', { creditAmount: 199999 }); await oldPayment('B'); await oldPayment('C');
}, /not exactly a DR AR \/ CR CREDIT pair/);
await refusal('R6g a third leg on the pair', async () => {
  await liveShape();
  await ins(`${P.B.slice(0, 8)}-1111-4000-8000-000000000002`, null, acc(KB, 'CASH'), 1, 0, SRC.B);
}, /exactly a DR AR \/ CR CREDIT pair/);
await refusal('R6h a child with no bill in or before the current month (only a later one)', async () => {
  await liveShape();
  await db.query("DELETE FROM public.invoices WHERE student_id = $1", [KC]);
  const nm = `${Number(CUR.slice(0, 4)) + 1}-01`;
  await bill(KC, nm, 400000, 0);
}, /no bill/);
await refusal('R6i a leftover\'s payment row gone (not reversed)', async () => {
  await liveShape();
  await db.query('DELETE FROM public.payment_allocations WHERE parent_payment_id = $1', [P.C]);
  await db.query('DELETE FROM public.payments WHERE id = $1', [P.C]);
}, /payment no longer exists/);
await refusal('R6j invoice_paid_label missing', async () => {
  await liveShape();
  await db.exec('DROP FUNCTION public.invoice_paid_label(bigint,bigint,bigint,bigint)');
}, /invoice_paid_label is not installed/);

console.log('\nR7 a payment modify-payment rewrote (reversal-<id>- legs + a child payment): does the script stop?');
{
  await liveShape();
  // what modify-payment posts: a reversal payment row and a corrected one, both parent_payment_id = the old payment;
  // the WHOLE original amount reversed DR AR / CR CASH under tx_key reversal-<id>-<ms>; the corrected amount DR CASH / CR AR under modified-<id>-<ms>
  await db.query('INSERT INTO public.payments (student_id, amount, method, parent_payment_id) VALUES ($1, -600000, $2, $3), ($1, 400000, $2, $3)', [KA, 'Cash', P.A]);
  await ins('e0000000-1111-4000-8000-000000000001', `reversal-${P.A}-1700000000100`, acc(KA, 'AR'), 600000, 0, SRC.A);
  await ins('e0000000-1111-4000-8000-000000000001', null, acc(KA, 'CASH'), 0, 600000, SRC.A);
  await ins('e0000000-1111-4000-8000-000000000002', `modified-${P.A}-1700000000101`, acc(KA, 'CASH'), 400000, 0, SRC.A);
  await ins('e0000000-1111-4000-8000-000000000002', null, acc(KA, 'AR'), 0, 400000, SRC.A);
  const before = await getBill(KA, CUR);
  const r = await runScript();
  const after = await getBill(KA, CUR);
  ok('R7a the script REFUSES a payment that modify-payment has rewritten (expected; FAILS = finding)', !r.ok, { r, before: before.recorded_payment, after: after.recorded_payment });
  const d = await call('delete-payment', { paymentId: P.A, deleteReason: 'probe' });
  ok('R7b   (context) delete-payment refuses that payment either way (409): the credit could then never be taken back by it', d.status === 409, d);
}

console.log('\nR8 delete-payment: every path other than the two new keys behaves as origin/main (same DB, both versions)');
const twin = async (label, prep, paymentId) => {
  await prep(); const s0 = await shape();
  const a = await call('delete-payment-main', { paymentId: paymentId(), deleteReason: 'probe' });
  const sMain = await shape();
  await prep(); const s1 = await shape();
  const b = await call('delete-payment', { paymentId: paymentId(), deleteReason: 'probe' });
  const sNew = await shape();
  const strip = (x) => JSON.stringify({ ...x.body, reversal_tx_ids: undefined });
  ok(`${label}: same status (${a.status}/${b.status}), same response, same bills and ledger after`,
    s0 === s1 && a.status === b.status && strip(a) === strip(b) && sMain === sNew, { a: a.body, b: b.body });
};
let newPid = null;
await twin('R8a a payment made with the NEW smart-family-payment (incl. leftover on the bill)', async () => {
  await fresh();
  await student(KA, 'Child A');
  await bill(KA, SRC.A, 400000, 0); await bill(KA, CUR, 400000, 400000);
  await call('smart-family-payment', { familyId: FAMILY, amount: 600000, method: 'Cash', occurredAt: '2026-02-20T10:00:00.000Z', month: SRC.A, leftoverHandling: 'credit_next_bill' });
  newPid = (await db.query('SELECT id FROM public.payments LIMIT 1')).rows[0].id;
}, () => newPid);
await twin('R8b an ordinary OLD payment with its leftover pair, before any credit', async () => { await liveShape(); }, () => P.B);
await twin('R8c an old payment with no leftover (allocation only)', async () => {
  await liveShape({ skipPayments: true });
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id) VALUES ($1,$2,400000,$3,$4)', [P.A, KA, 'Cash', FAMILY]);
  await ins('a0000000-1111-4000-8000-000000000101', `smart-family-${P.A}-${KA}-1`, acc(KA, 'CASH'), 400000, 0, SRC.A);
  await ins('a0000000-1111-4000-8000-000000000101', null, acc(KA, 'AR'), 0, 400000, SRC.A);
}, () => P.A);
await twin('R8d a single-child payment keyed payment-<id>', async () => {
  await liveShape({ skipPayments: true });
  await db.query('INSERT INTO public.payments (id, student_id, amount, method) VALUES ($1,$2,400000,$3)', [P.A, KA, 'Cash']);
  await ins('a0000000-1111-4000-8000-000000000102', `payment-${P.A}`, acc(KA, 'CASH'), 400000, 0, SRC.A);
  await ins('a0000000-1111-4000-8000-000000000102', null, acc(KA, 'AR'), 0, 400000, SRC.A);
}, () => P.A);
await twin('R8e a payment already reversed (409 both)', async () => {
  await liveShape();
  await call('delete-payment', { paymentId: P.B, deleteReason: 'first' });
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id) VALUES ($1,$2,1,$3,$4)', [P.B, KB, 'Cash', FAMILY]);
}, () => P.B);
await twin('R8f a modified payment (409 both)', async () => {
  await liveShape();
  await db.query('INSERT INTO public.payments (student_id, amount, method, parent_payment_id) VALUES ($1, 400000, $2, $3)', [KA, 'Cash', P.A]);
}, () => P.A);

console.log('\nR9 the order the header asks for matters: origin/main delete-payment AFTER the credit');
{
  await liveShape();
  await runScript();
  const d = await call('delete-payment-main', { paymentId: P.A, deleteReason: 'probe' });
  const n = await nets(KA);
  ok('R9a (context) the OLD delete-payment ignores both new transactions: it leaves CASH +200,000 / AR -200,000 and the current bill at 600,000',
    d.status === 200 && n.CASH === 200000 && n.AR === -200000 && (await getBill(KA, CUR)).recorded_payment === 600000, { n, cur: (await getBill(KA, CUR)).recorded_payment });
}

console.log('\nR10 the script never edits a historical ledger row and writes no payment row');
{
  await liveShape();
  const oldRows = JSON.stringify((await db.query('SELECT * FROM public.ledger_entries ORDER BY id')).rows);
  const pays = JSON.stringify((await db.query('SELECT * FROM public.payments ORDER BY id')).rows);
  const srcBills = JSON.stringify((await db.query("SELECT * FROM public.invoices WHERE month < '2026-09' ORDER BY id")).rows);
  await runScript();
  ok('R10a old ledger rows byte-identical, payments byte-identical, source-month bills byte-identical',
    oldRows === JSON.stringify((await db.query('SELECT * FROM public.ledger_entries WHERE id = ANY($1::uuid[]) ORDER BY id', [JSON.parse(oldRows).map((o) => o.id)])).rows)
    && pays === JSON.stringify((await db.query('SELECT * FROM public.payments ORDER BY id')).rows)
    && srcBills === JSON.stringify((await db.query("SELECT * FROM public.invoices WHERE month < '2026-09' ORDER BY id")).rows));
  const res = await db.exec(SCRIPT);
  const row = res.filter((r) => r.rows?.length).at(-1)?.rows[0];
  ok('R10b the result row holds three numbers only (no names, no ids)', same(Object.keys(row), ['leftovers_credited', 'total_vnd', 'still_to_credit']) && !UUIDISH.test(JSON.stringify(row)), row);
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
