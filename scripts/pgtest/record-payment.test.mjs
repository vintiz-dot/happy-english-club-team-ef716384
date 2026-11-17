// D5 G-1: supabase/functions/record-payment, the one admin payment path
// (docs/evidence/G1-record-payment.md), and delete-payment taking one back.
//
// What runs: the REAL record-payment and delete-payment handlers, bundled
// with esbuild (remote imports stubbed), against a PostgREST stand-in over
// ONE pglite database carrying the real triggers the money passes through:
//
//   the D4 release as built by guard-fingerprint.mjs (D4_BUILD): D2's
//   prelude, its baseline (audit 20261009130000, the cancelled-lesson guard,
//   D1, D2, the freeze 20261106120000, the enrolment RPCs ...) and EVERY D4
//   file (20261114090000 floors - zz_invoice_state_floor -, 091000 register,
//   092000 class fee, 093000 lesson pay, 094000 money inputs - the frozen-bill
//   guards on invoices);
//   then live's ledger / payment tables (20251012022746 + tx_key 20251024050029
//   + the family columns, as past-leftover-credit.test.mjs has them) with
//   live's admin policies (20251012023454) and grants (20260712023825);
//   the carry trigger 20261009120000, invoice_paid_label (20261113090000),
//   the relabelling carry refresh 20261117110000 (G-4) and the append-only
//   ledger 20261117111000 (G-11).
//
// The stand-in runs a client made with the caller's JWT as `authenticated`
// (auth.uid() = the caller, row security on), the service key as
// `service_role`. Every write is logged with who made it, so "the payment is
// written as the admin, not the service key" is asserted, not assumed.
//
// The figures checked at the end are scripts/CHECK-money-invariants.sql
// itself (M01 / M03 / M04), run over a copy of the rows the functions wrote,
// in the fixture schema money-invariants-check.test.mjs holds to the live
// columns.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { repo } from './d4-prelude.mjs';
import { D4_BUILD } from './guard-fingerprint.mjs';

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const migText = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8').replace(/\r\n/g, '\n');
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

// ------------------------------------------------------------- database
const db = new PGlite();
// One statement sequence at a time: a request's role switch, its query and
// the reset must not interleave with another request's (the concurrency
// cases run two handlers at once).
let chain = Promise.resolve();
function locked(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}
async function asRole(who, uid, sql, params = []) {
  return locked(async () => {
    const role = who === 'service' ? 'service_role' : who === 'user' ? 'authenticated' : who === 'anon' ? 'anon' : null;
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('test.uid', $1, false), set_config('test.jwt_role', $2, false)`, [uid ?? '', role ?? '']);
    if (role) await db.exec(`SET ROLE ${role}`);
    try { return await db.query(sql, params); }
    finally {
      await db.exec('RESET ROLE');
      await db.query(`SELECT set_config('test.uid', '', false), set_config('test.jwt_role', '', false)`);
    }
  });
}
const sql = (text, params) => asRole(null, null, text, params);
const rows = async (text, params) => (await sql(text, params)).rows;
const one = async (text, params) => (await rows(text, params))[0];

const { prelude, baseline, files: D4_FILES, mig } = D4_BUILD;
await db.exec(prelude);
// Live's invoices: status is the invoice_status enum, and the columns the
// payment paths write (20251012022746 + later). Before the baseline, so every
// migration sees the live shape.
await db.exec(`
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
  ALTER TABLE public.invoices ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.invoices ALTER COLUMN status TYPE public.invoice_status USING status::public.invoice_status;
  ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
  ALTER TABLE public.invoices ALTER COLUMN recorded_payment SET DEFAULT 0;
  ALTER TABLE public.invoices ADD COLUMN number text, ADD COLUMN paid_amount integer NOT NULL DEFAULT 0,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN created_by uuid, ADD COLUMN updated_by uuid;
`);
for (const f of baseline) await db.exec(mig(f));
for (const f of D4_FILES) await db.exec(mig(f));
await db.exec(`
  -- live's ledger and payment tables (20251012022746, tx_key 20251024050029, family columns)
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
  ALTER TABLE public.payments ALTER COLUMN amount DROP DEFAULT, ALTER COLUMN method DROP DEFAULT,
    ADD COLUMN parent_payment_id uuid;
  CREATE TABLE public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, allocated_amount INTEGER NOT NULL, allocation_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID);
  CREATE TABLE public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid, snapshot jsonb,
    deleted_by uuid, deletion_reason text, deleted_at timestamptz DEFAULT now());
  -- what G-11 audits besides the ledger (sibling_discount_state and discount_definitions are D4_INPUTS')
  CREATE TABLE IF NOT EXISTS public.expenditures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric NOT NULL, category text NOT NULL, date date NOT NULL);
  CREATE TABLE IF NOT EXISTS public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    amount integer NOT NULL, settlement_type text NOT NULL);
  CREATE TABLE IF NOT EXISTS public.monthly_finance_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL,
    month text NOT NULL, final_payable integer NOT NULL DEFAULT 0);
  -- 20260712023825: the API roles get every table explicitly.
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  -- 20251012023454:128-139 (invoices and payments already carry D4_INPUTS' admin policy)
  ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage ledger accounts" ON public.ledger_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage ledger entries" ON public.ledger_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage payment allocations" ON public.payment_allocations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.payment_deletions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins manage payment deletions" ON public.payment_deletions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  -- 20251012023454:104 + 20260809101447: admins read and write the audit log
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Admins can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  -- a family login reads its own children's money (enough for "a parent cannot")
  CREATE POLICY family_reads_payments ON public.payments FOR SELECT TO authenticated
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));
`);
// The audit trigger on the payment tables made after the audit migration ran (live has them).
for (const t of ['payments', 'payment_allocations']) {
  await db.exec(`DROP TRIGGER IF EXISTS audit_${t} ON public.${t};
    CREATE TRIGGER audit_${t} AFTER INSERT OR UPDATE OR DELETE ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();`);
}
await db.exec(mig('20261009120000_keep_invoice_carry_balances_correct.sql'));
{
  const t = migText('20261113090000_invoice_paid_label.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
  const b = t.indexOf('$function$;', a);
  await db.exec(t.slice(a, b + '$function$;'.length));
}
await db.exec(mig('20261117110000_carry_refresh_relabels.sql'));
await db.exec(mig('20261117111000_ledger_append_only_and_audit.sql'));

console.log('\n0. the database carries the real money triggers');
{
  const trg = (await rows(`SELECT c.relname || '.' || t.tgname AS n FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                             WHERE NOT t.tgisinternal AND t.tgenabled <> 'D'`)).map((r) => r.n);
  const want = ['invoices.zz_invoice_state_floor', 'invoices.zz_invoice_unfreeze_guard', 'invoices.zz_invoice_frozen_keep_guard',
    'invoices.zz_invoice_frozen_delete_guard', 'invoices.keep_frozen_invoice_amounts', 'invoices.invoices_carry_sync', 'invoices.audit_invoices',
    'ledger_entries.ledger_entries_append_only', 'ledger_entries.ledger_entries_no_truncate', 'payments.audit_payments', 'ledger_accounts.audit_ledger_accounts'];
  const missing = want.filter((w) => !trg.includes(w));
  ok(`every D4 file loaded (${D4_FILES.length}) with G-4 and G-11; the invoice, ledger and audit triggers are on`, D4_FILES.length === 5 && missing.length === 0, { missing, trg });
}

// ------------------------------------------------------ PostgREST stand-in
const SERVICE_KEY = 'service-role-key';
const ANON_KEY = 'anon-key';
const jwts = new Map();                         // token -> user id
const log = [];                                 // { table, op, who }
const invokes = [];                             // { name, who, body }
let faults = [];                                // { table, op, match?(q), error, after?() }
const tuition = { fail: new Set(), price: new Map() };
const val = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);

function fakeClient(key, opts) {
  const header = opts?.global?.headers?.Authorization ?? null;
  const token = header ? header.replace(/^Bearer\s+/i, '') : null;
  const who = header ? 'user' : key === SERVICE_KEY ? 'service' : 'anon';
  const uid = token ? jwts.get(token) ?? null : null;
  const run = (text, params) => asRole(who, uid, text, params);

  const from = (table) => {
    let mode = 'select', cols = '*', ret = false, payload = null, onConflict = '', ignoreDup = false, order = '', lim = '', one = null;
    const where = [], params = [];
    let embeds = [];
    const p = (v) => { params.push(v); return `$${params.length}`; };
    const parseCols = (c) => {
      embeds = [...c.matchAll(/(\w+)(!inner)?\(([^)]*)\)/g)].map((m) => ({ rel: m[1], cols: m[3] }));
      return c.replace(/,?\s*\w+(!inner)?\([^)]*\)/g, '').trim() || '*';
    };
    async function attach(list) {
      for (const e of embeds) for (const r of list) {
        if (e.rel === 'payment_allocations') r.payment_allocations = (await run(`SELECT ${e.cols} FROM public.payment_allocations WHERE parent_payment_id = $1`, [r.id])).rows;
        if (e.rel === 'ledger_accounts') r.ledger_accounts = (await run('SELECT student_id, code::text AS code FROM public.ledger_accounts WHERE id = $1', [r.account_id])).rows[0] ?? null;
      }
      return list;
    }
    async function exec() {
      const f = faults.find((x) => x.table === table && x.op === mode && (!x.match || x.match({ payload, where, params })));
      if (f) {
        faults = faults.filter((x) => x !== f);
        if (f.before) await f.before();
        if (f.error) return { data: null, error: f.error };
      }
      if (mode !== 'select') log.push({ table, op: mode, who });
      const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      try {
        let data;
        if (mode === 'select') {
          data = await attach((await run(`SELECT ${cols} FROM public.${table}${w}${order}${lim}`, params)).rows);
        } else if (mode === 'insert' || mode === 'upsert') {
          const list = Array.isArray(payload) ? payload : [payload];
          const keys = [...new Set(list.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
          const vals = list.map((r) => `(${keys.map((k) => (r[k] === undefined ? 'DEFAULT' : p(val(r[k])))).join(', ')})`).join(', ');
          const conflict = mode === 'upsert' ? (ignoreDup ? ` ON CONFLICT (${onConflict}) DO NOTHING`
            : ` ON CONFLICT (${onConflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`) : '';
          data = (await run(`INSERT INTO public.${table} AS t (${keys.join(', ')}) VALUES ${vals}${conflict} RETURNING *`, params)).rows;
        } else if (mode === 'update') {
          const filterParams = [...params];
          const sets = [];
          const all = [];
          for (const k of Object.keys(payload)) { if (payload[k] === undefined) continue; all.push(val(payload[k])); sets.push(`${k} = $${all.length}`); }
          const shifted = where.map((c) => c.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + all.length}`));
          data = (await run(`UPDATE public.${table} SET ${sets.join(', ')}${shifted.length ? ` WHERE ${shifted.join(' AND ')}` : ''} RETURNING *`, [...all, ...filterParams])).rows;
        } else {
          data = (await run(`DELETE FROM public.${table}${w} RETURNING *`, params)).rows;
        }
        if (mode !== 'select' && !ret) data = null;
        if (one === 'maybe') return { data: data?.[0] ?? null, error: null };
        if (one === 'single') return data?.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'not one row' } };
        return { data, error: null };
      } catch (e) {
        return { data: null, error: { code: e.code, message: e.message } };
      }
    }
    const q = {
      select(c = '*') { if (mode === 'select') cols = parseCols(c); else ret = true; return q; },
      eq(k, v) { where.push(`${k}::text = ${p(String(v))}`); return q; },
      neq(k, v) { where.push(`${k}::text <> ${p(String(v))}`); return q; },
      gte(k, v) { where.push(`${k} >= ${p(v)}`); return q; },
      lte(k, v) { where.push(`${k} <= ${p(v)}`); return q; },
      in(k, vs) { where.push(`${k}::text = ANY(${p(vs.map(String))}::text[])`); return q; },
      like(k, pat) { where.push(`${k} LIKE ${p(pat)}`); return q; },
      order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} ${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
      limit(n) { lim = ` LIMIT ${Number(n)}`; return q; },
      insert(v) { mode = 'insert'; payload = v; return q; },
      upsert(v, o = {}) { mode = 'upsert'; payload = v; onConflict = o.onConflict; ignoreDup = !!o.ignoreDuplicates; return q; },
      update(v) { mode = 'update'; payload = v; return q; },
      delete() { mode = 'delete'; return q; },
      maybeSingle() { one = 'maybe'; return q; },
      single() { one = 'single'; return q; },
      then(a, b) { return exec().then(a, b); },
    };
    return q;
  };

  return {
    from,
    auth: {
      getUser: async (t) => {
        const tok = t ?? token;
        return jwts.has(tok) ? { data: { user: { id: jwts.get(tok), email: null } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } };
      },
    },
    functions: {
      invoke: async (name, { body }) => {
        invokes.push({ name, who, body });
        if (name !== 'calculate-tuition') return { data: null, error: { message: `unexpected invoke ${name}` } };
        // calculate-tuition, as far as these functions use it: it prices and
        // saves a missing bill (the price is the fixture's); otherwise it
        // leaves the figures alone. Its own behaviour is invoice-status's.
        if (tuition.fail.has(body.studentId)) return { data: null, error: { message: 'scripted failure' } };
        const price = tuition.price.get(body.studentId);
        if (price !== undefined) {
          await sql(`INSERT INTO public.invoices (student_id, month, base_amount, total_amount, status)
                     VALUES ($1, $2, $3, $3, 'issued') ON CONFLICT (student_id, month) DO NOTHING`, [body.studentId, body.month, price]);
        }
        return { data: { totalAmount: price ?? 0 }, error: null };
      },
    },
  };
}
globalThis.__rpCreateClient = (_url, key, opts) => fakeClient(key, opts);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
async function load(name) {
  const out = await build({
    entryPoints: [resolve(repo, 'supabase', 'functions', name, 'index.ts')],
    bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    plugins: [{ name: 'remote-imports', setup(b) {
      b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: 'remote' }));
      b.onLoad({ filter: /.*/, namespace: 'remote' }, (args) => args.path.includes('zod')
        ? { contents: 'export { z } from "zod";', loader: 'js', resolveDir: repo }
        : { contents: 'export const createClient = (...a) => globalThis.__rpCreateClient(...a);', loader: 'js' });
    } }],
  });
  const p = resolve(tmpdir(), `g1.${name}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  await import(pathToFileURL(p).href);
  return captured;
}
const recordFn = await load('record-payment');
const deleteFn = await load('delete-payment');
ok('record-payment and delete-payment bundled from the working tree', typeof recordFn === 'function' && typeof deleteFn === 'function');

async function call(fn, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fn(new Request('http://localhost/fn', { method: 'POST', headers, body: JSON.stringify(body) }));
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function person(role) {
  const id = randomUUID(), tok = `jwt-${id}`;
  jwts.set(tok, id);
  if (role) await sql('INSERT INTO public.user_roles VALUES ($1, $2)', [id, role]);
  return { id, tok };
}

// ---------------------------------------------------------------- fixture
const ADMIN = await person('admin');
const ADMIN2 = await person('admin');
const TEACHER = await person('teacher');
const PARENT = await person('family');
async function child(name, linked = null) {
  return (await one('INSERT INTO public.students (full_name, linked_user_id) VALUES ($1, $2) RETURNING id', [name, linked])).id;
}
async function bill(sid, month, total, recorded = 0, extra = {}) {
  const status = extra.status ?? (recorded >= total && recorded > 0 ? 'paid' : recorded > 0 ? 'partial' : 'issued');
  return (await one(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status)
                     VALUES ($1, $2, $3, 0, $3, $4, $4, $5) RETURNING id`, [sid, month, total, recorded, status])).id;
}
const billOf = (sid, month) => one('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [sid, month]);
const paymentsOf = (sid) => rows('SELECT * FROM public.payments WHERE student_id = $1 ORDER BY created_at, id', [sid]);
const legsOf = (sid) => rows(`SELECT e.*, a.code::text AS code FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
                               WHERE a.student_id = $1 ORDER BY e.created_at, e.id`, [sid]);
/** Net per account code for a child: debit - credit. */
async function net(sid) {
  const out = {};
  for (const l of await legsOf(sid)) out[l.code] = (out[l.code] ?? 0) + Number(l.debit) - Number(l.credit);
  return out;
}
const balanced = (legs) => {
  const by = new Map();
  for (const l of legs) by.set(l.tx_id, (by.get(l.tx_id) ?? 0) + Number(l.debit) - Number(l.credit));
  return [...by.values()].every((d) => d === 0);
};
const M = '2026-08', M2 = '2026-09';
const pay = (body, tok = ADMIN.tok) => call(recordFn, tok, { month: M, kind: 'payment', method: 'Cash', occurredAt: '2026-08-10', idempotencyKey: randomUUID(), ...body });
const writesSince = (n) => log.slice(n);

// =================================================================== 1
console.log('\n1. only an admin, with their own session; nothing written otherwise');
{
  const s = await child('Gate');
  await bill(s, M, 1000000);
  const body = { studentId: s, month: M, kind: 'payment', amount: 100000, method: 'Cash', occurredAt: '2026-08-10', idempotencyKey: randomUUID() };
  const before = log.length;
  const r0 = await call(recordFn, null, body);
  const r1 = await call(recordFn, TEACHER.tok, body);
  const r2 = await call(recordFn, PARENT.tok, body);
  const r3 = await call(recordFn, SERVICE_KEY, body);
  const r4 = await call(recordFn, 'jwt-not-a-session', body);
  ok('no Authorization: 401; a teacher: 403; a parent: 403; the service key: 403 (no admin behind it); a forged token: 401',
     r0.status === 401 && r1.status === 403 && r2.status === 403 && r3.status === 403 && r4.status === 401, [r0, r1, r2, r3, r4].map((r) => r.status));
  ok('  none of them wrote anything', log.length === before && (await paymentsOf(s)).length === 0 && Number((await billOf(s, M)).recorded_payment) === 0);
  const bad = [
    { ...body, amount: 0 }, { ...body, amount: -5 }, { ...body, amount: 1.5 }, { ...body, month: '2026-8' }, { ...body, studentId: 'x' },
    { ...body, idempotencyKey: 'not-a-uuid' }, { ...body, kind: 'refund' }, { ...body, method: '' }, { ...body, occurredAt: 'yesterday' },
    { ...body, amount: 500000001 }, { ...body, kind: 'correction', memo: '   ' },
  ];
  const statuses = [];
  for (const b of bad) statuses.push((await call(recordFn, ADMIN.tok, b)).status);
  ok(`11 malformed requests (amount 0 / negative / fractional / too big, bad month, student, key, kind, method, date, a correction with no note): all 400`,
     statuses.every((x) => x === 400), statuses);
  ok('  and nothing written by any of them', log.length === before && (await paymentsOf(s)).length === 0);
  const nobody = await call(recordFn, ADMIN.tok, { ...body, studentId: randomUUID() });
  ok('a student that does not exist: 404, nothing written', nobody.status === 404 && log.length === before, nobody);
}

// =================================================================== 2
console.log('\n2. a payment writes the payments row, two balanced legs and the bill - as the admin');
{
  const s = await child('Anh');
  const inv = await bill(s, M, 1000000);
  await bill(s, M2, 1000000);
  const key = randomUUID();
  const w0 = log.length, i0 = invokes.length;
  const r = await call(recordFn, ADMIN.tok, { studentId: s, month: M, kind: 'payment', amount: 400000, method: 'Cash',
    occurredAt: '2026-07-28', memo: 'paid at the desk', idempotencyKey: key });
  ok('200, and the answer says what the bill records before and after', r.status === 200 && r.body?.success && r.body.paymentId === key
     && r.body.recordedBefore === 0 && r.body.recordedAfter === 400000 && r.body.ledgerAccount === 'CASH', r);
  const ps = await paymentsOf(s);
  ok('one payments row: id = the screen\'s key, amount, method as labelled, the receipt date, the memo, created_by the admin',
     ps.length === 1 && ps[0].id === key && Number(ps[0].amount) === 400000 && ps[0].method === 'Cash' && ps[0].memo === 'paid at the desk'
     && ps[0].created_by === ADMIN.id && new Date(ps[0].occurred_at).toISOString() === '2026-07-28T05:00:00.000Z', ps);
  const legs = await legsOf(s);
  const cash = legs.find((l) => l.code === 'CASH'), ar = legs.find((l) => l.code === 'AR');
  ok('two legs in one transaction: DR CASH 400,000, CR AR 400,000, balanced',
     legs.length === 2 && cash && ar && cash.tx_id === ar.tx_id && Number(cash.debit) === 400000 && Number(cash.credit) === 0
     && Number(ar.credit) === 400000 && Number(ar.debit) === 0 && balanced(legs), legs);
  ok(`  the cash leg keyed record-payment-<payment>-<student>, the AR leg unkeyed (as every payment path)`,
     cash?.tx_key === `record-payment-${key}-${s}` && ar?.tx_key === null, legs.map((l) => l.tx_key));
  ok('  both legs on the CONFIRMED tuition month (2026-08), not the receipt month (July), and dated by the receipt',
     legs.every((l) => l.month === M && new Date(l.occurred_at).toISOString() === '2026-07-28T05:00:00.000Z'), legs.map((l) => [l.month, l.occurred_at]));
  const b = await billOf(s, M);
  ok('the bill: recorded_payment 400,000, partial (the one rule), the next month untouched',
     Number(b.recorded_payment) === 400000 && b.status === 'partial' && b.id === inv && Number((await billOf(s, M2)).recorded_payment) === 0, b);
  ok('  the carry follows: carry_out_debt 600,000, and the next month\'s carry_in_debt 600,000 (the carry trigger)',
     Number(b.carry_out_debt) === 600000 && Number((await billOf(s, M2)).carry_in_debt) === 600000);
  const audit = await rows(`SELECT * FROM public.audit_log WHERE action = 'record_payment' AND entity_id = $1`, [inv]);
  ok('an audit row record_payment by the admin, naming the payment and ledger transaction',
     audit.length === 1 && audit[0].actor_user_id === ADMIN.id && audit[0].diff.payment_id === key && audit[0].diff.ledger_tx_id === cash?.tx_id
     && audit[0].diff.new_recorded_payment === 400000, audit);
  const writes = writesSince(w0);
  ok('every write was made with the admin\'s own session (RLS on), none with the service key',
     writes.length > 0 && writes.every((x) => x.who === 'user'), writes);
  ok('  writes: ledger accounts, the payment, the legs, the bill, the audit row - nothing else',
     JSON.stringify([...new Set(writes.map((x) => `${x.table}.${x.op}`))].sort()) === JSON.stringify(['audit_log.insert', 'invoices.update', 'ledger_accounts.upsert', 'ledger_entries.insert', 'payments.insert']),
     writes);
  ok('  calculate-tuition asked once, afterwards, to refresh the bill (the internal call every payment path makes)',
     invokes.slice(i0).length === 1 && invokes[i0].name === 'calculate-tuition' && invokes[i0].body.month === M, invokes.slice(i0));

  const r2 = await pay({ studentId: s, amount: 600000, method: 'Bank Transfer' });
  const b2 = await billOf(s, M);
  ok('a second payment, by bank transfer, covers the bill: paid, 1,000,000 recorded, DR BANK 600,000',
     r2.status === 200 && Number(b2.recorded_payment) === 1000000 && b2.status === 'paid' && (await net(s)).BANK === 600000 && (await net(s)).AR === -1000000, { r2, b2 });
}

// =================================================================== 3
console.log('\n3. CASH or BANK, whatever the case of the label');
{
  const s = await child('Methods');
  await bill(s, M, 10000000);
  const cases = [['cash', 'CASH'], ['CASH', 'CASH'], [' Cash ', 'CASH'], ['Cash', 'CASH'], ['Bank Transfer', 'BANK'], ['bank transfer', 'BANK'], ['Card', 'BANK'], ['Other', 'BANK']];
  const got = [];
  for (const [method] of cases) got.push((await pay({ studentId: s, amount: 1000, method })).body?.ledgerAccount);
  ok(`${cases.map(([m, c]) => `'${m}' -> ${c}`).join(', ')}`, cases.every(([, c], i) => got[i] === c), got);
  const n = await net(s);
  ok('  and the ledger agrees: CASH 4,000, BANK 4,000, AR -8,000', n.CASH === 4000 && n.BANK === 4000 && n.AR === -8000, n);
}

// =================================================================== 4
console.log('\n4. a correction takes money off - never below 0, never without a note');
{
  const s = await child('Correct');
  const inv = await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 700000 });
  const key = randomUUID();
  const r = await pay({ studentId: s, kind: 'correction', amount: 200000, memo: 'entered 200,000 too much', idempotencyKey: key });
  const n = await net(s);
  const p = (await paymentsOf(s)).find((x) => x.id === key);
  ok('200: recorded 700,000 -> 500,000, and the ledger nets CASH 500,000 / AR -500,000',
     r.status === 200 && r.body.recordedBefore === 700000 && r.body.recordedAfter === 500000 && n.CASH === 500000 && n.AR === -500000
     && Number((await billOf(s, M)).recorded_payment) === 500000, { r, n });
  const ck = (await legsOf(s)).find((l) => l.tx_key === `record-payment-${key}-${s}`);
  const ca = (await legsOf(s)).find((l) => l.tx_id === ck?.tx_id && l.id !== ck?.id);
  ok('  its legs: DR AR 200,000, CR CASH 200,000 (one transaction, balanced); its payments row is -200,000 with the note',
     ck && ca && Number(ck.credit) === 200000 && ca.code === 'AR' && Number(ca.debit) === 200000 && balanced(await legsOf(s))
     && p && Number(p.amount) === -200000 && p.memo === 'entered 200,000 too much', { ck, ca, p });
  const w0 = log.length;
  const below = await pay({ studentId: s, kind: 'correction', amount: 500001, memo: 'too much' });
  ok('a correction of 500,001 on a bill recording 500,000: 409, nothing written', below.status === 409 && log.length === w0
     && Number((await billOf(s, M)).recorded_payment) === 500000, below);
  const toZero = await pay({ studentId: s, kind: 'correction', amount: 500000, memo: 'all of it was a mistake' });
  const bz = await billOf(s, M);
  ok('a correction of exactly what is recorded: 0 recorded, issued again (the one rule)', toZero.status === 200 && Number(bz.recorded_payment) === 0 && bz.status === 'issued', bz);
  const s2 = await child('NoBill');
  tuition.price.set(s2, 900000);
  const w1 = log.length, i1 = invokes.length;
  const nb = await pay({ studentId: s2, kind: 'correction', amount: 1000, memo: 'nothing to correct' });
  ok('a correction for a month with no bill: 409, no bill created, nothing written, calculate-tuition not asked',
     nb.status === 409 && log.length === w1 && invokes.length === i1 && !(await billOf(s2, M)), nb);
  void inv;
}

// =================================================================== 5
console.log('\n5. the label rule, frozen bills and the D4 floors do not get in the way');
{
  const s = await child('Credit');
  await bill(s, M, 500000, 0, { status: 'credit' });
  const r = await pay({ studentId: s, amount: 500000 });
  const b = await billOf(s, M);
  ok('an admin\'s \'credit\' label is kept when money comes in (labelAfterPayment)', r.status === 200 && b.status === 'credit' && Number(b.recorded_payment) === 500000, b);

  const f = await child('Frozen');
  const fid = await bill(f, M, 800000);
  await sql(`UPDATE public.invoices SET tuition_frozen = true WHERE id = $1`, [fid]);
  const before = await billOf(f, M);
  const rf = await pay({ studentId: f, amount: 300000 });
  const after = await billOf(f, M);
  ok('a FROZEN bill takes a payment (a freeze locks what is charged, not what is paid); its charged figures stay',
     rf.status === 200 && after.tuition_frozen && Number(after.recorded_payment) === 300000 && after.total_amount === before.total_amount
     && after.base_amount === before.base_amount && after.discount_amount === before.discount_amount, { rf, after });
  const rc = await pay({ studentId: f, kind: 'correction', amount: 100000, memo: 'part refunded in cash' });
  ok('  and a correction on it (the frozen-bill guards do not fire: it stays frozen, same child and month)', rc.status === 200 && Number((await billOf(f, M)).recorded_payment) === 200000, rc);

  const fl = await child('Floor');
  await bill(fl, M, 400000);
  await pay({ studentId: fl, amount: 400000 });
  const rr = await pay({ studentId: fl, kind: 'correction', amount: 400000, memo: 'payment was for another child' });
  const floor = await one('SELECT * FROM public.invoice_state_floor WHERE student_id = $1 AND month = $2', [fl, M]);
  ok('a correction that un-pays a paid bill is let through; the D4 bill floor keeps that it was paid (max 400,000, ever_paid)',
     rr.status === 200 && Number((await billOf(fl, M)).recorded_payment) === 0 && floor?.ever_paid === true && Number(floor?.max_recorded_payment) === 400000, { rr, floor });
}

// =================================================================== 6
console.log('\n6. a month with no bill yet: calculate-tuition makes it first, or nothing is written');
{
  const s = await child('Fresh');
  tuition.price.set(s, 1200000);
  const i0 = invokes.length;
  const r = await pay({ studentId: s, amount: 1200000 });
  const b = await billOf(s, M);
  ok('the bill is created by calculate-tuition (never from the screen\'s figures), then paid: paid, 1,200,000',
     r.status === 200 && b && b.total_amount === 1200000 && Number(b.recorded_payment) === 1200000 && b.status === 'paid'
     && invokes.slice(i0).filter((x) => x.name === 'calculate-tuition' && x.who === 'service').length === 2, { r, b });
  const s2 = await child('Unpriced');
  tuition.fail.add(s2);
  const w0 = log.length;
  const r2 = await pay({ studentId: s2, amount: 100000 });
  ok('calculate-tuition cannot make it: 409 "try again", nothing written', r2.status === 409 && log.length === w0 && (await paymentsOf(s2)).length === 0, r2);
}

// =================================================================== 7
console.log('\n7. the screen\'s figure: an edit against a stale screen writes nothing');
{
  const s = await child('Stale');
  await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 300000 });
  const w0 = log.length;
  const r = await pay({ studentId: s, amount: 100000, expectedRecorded: 0 });
  ok('expectedRecorded 0 while the bill records 300,000: 409 conflict, nothing written', r.status === 409 && r.body?.conflict === true && log.length === w0, r);
  const r2 = await pay({ studentId: s, kind: 'correction', amount: 100000, memo: 'fix', expectedRecorded: 300000 });
  ok('  with the right figure it goes through', r2.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000, r2);
}

// =================================================================== 8
console.log('\n8. a double click (or a retry) pays once');
{
  const s = await child('Double');
  await bill(s, M, 1000000);
  const key = randomUUID();
  const body = { studentId: s, amount: 250000, idempotencyKey: key };
  const [a, b] = await Promise.all([pay(body), pay(body)]);
  const statuses = [a.status, b.status].sort();
  const dup = a.status === 409 ? a : b;
  ok('two requests with one key at the same moment: one 200, one 409 duplicate', statuses[0] === 200 && statuses[1] === 409 && dup.body?.duplicate === true, [a, b]);
  ok('  recorded once: one payments row, two legs, 250,000 on the bill', (await paymentsOf(s)).length === 1 && (await legsOf(s)).length === 2
     && Number((await billOf(s, M)).recorded_payment) === 250000);
  const w0 = log.length;
  const again = await pay(body);
  ok('the same key later (a retry after a lost reply): 409 duplicate, nothing written', again.status === 409 && again.body?.duplicate && log.length === w0, again);
  const three = await Promise.all([1, 2, 3].map(() => pay({ studentId: s, amount: 10000, idempotencyKey: key })));
  ok('  three more at once with that key: all refused, still once', three.every((x) => x.status === 409) && (await paymentsOf(s)).length === 1
     && Number((await billOf(s, M)).recorded_payment) === 250000, three.map((x) => x.status));
}

// =================================================================== 9
console.log('\n9. two payments on one bill at the same moment both land');
{
  const s = await child('Busy');
  await bill(s, M, 1000000);
  const casBefore = log.filter((x) => x.table === 'invoices' && x.op === 'update').length;
  const [a, b] = await Promise.all([pay({ studentId: s, amount: 300000 }), pay({ studentId: s, amount: 200000, method: 'Bank Transfer' })]);
  const casAfter = log.filter((x) => x.table === 'invoices' && x.op === 'update').length;
  const n = await net(s);
  ok('both 200; the bill records 500,000 (neither overwrote the other)', a.status === 200 && b.status === 200
     && Number((await billOf(s, M)).recorded_payment) === 500000, [a, b]);
  ok('  the compare-and-set missed once and re-read (3 bill writes for 2 payments)', casAfter - casBefore === 3, casAfter - casBefore);
  ok('  two payments rows, four legs, CASH 300,000 + BANK 200,000 = AR -500,000', (await paymentsOf(s)).length === 2 && (await legsOf(s)).length === 4
     && n.CASH === 300000 && n.BANK === 200000 && n.AR === -500000, n);

  const s2 = await child('BusyScreens');
  await bill(s2, M, 1000000);
  const [c, d] = await Promise.all([pay({ studentId: s2, amount: 300000, expectedRecorded: 0 }), pay({ studentId: s2, amount: 200000, expectedRecorded: 0 })]);
  const won = c.status === 200 ? c : d, lost = c.status === 200 ? d : c;
  const n2 = await net(s2);
  ok('two screens both showing 0 (expectedRecorded 0): one lands, the other is refused as changed (409) - as the screens did before',
     won.status === 200 && lost.status === 409 && Number((await billOf(s2, M)).recorded_payment) === won.body.amount, [c, d]);
  ok('  the refused one is undone completely: its payments row deleted, its legs reversed by new legs (net = the winner only)',
     (await paymentsOf(s2)).length === 1 && (n2.CASH ?? 0) === won.body.amount && n2.AR === -won.body.amount && balanced(await legsOf(s2))
     && (await legsOf(s2)).filter((l) => (l.tx_key ?? '').startsWith(`payment-reversal-${lost.body.paymentId}-`)).length === 2, { n2, lost });

  // Two corrections at once, each fine alone, together below 0: the retry re-checks the floor.
  const s3 = await child('BusyCorrections');
  await bill(s3, M, 1000000);
  await pay({ studentId: s3, amount: 300000 });
  const [e, g] = await Promise.all([pay({ studentId: s3, kind: 'correction', amount: 200000, memo: 'one' }),
                                    pay({ studentId: s3, kind: 'correction', amount: 200000, memo: 'two' })]);
  const n3 = await net(s3);
  ok('two corrections of 200,000 at once on 300,000 recorded: one lands, the other is refused at the re-read (never below 0) and undone',
     [e.status, g.status].sort().join() === '200,409' && Number((await billOf(s3, M)).recorded_payment) === 100000
     && n3.CASH === 100000 && n3.AR === -100000 && (await paymentsOf(s3)).length === 2 && balanced(await legsOf(s3)), { e, g, n3 });
}

// =================================================================== 10
console.log('\n10. a failure after the legs leaves nothing half-done');
{
  const s = await child('Fails');
  const inv = await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 100000 });
  const key = randomUUID();
  faults.push({ table: 'invoices', op: 'update', error: { code: '57014', message: 'canceling statement due to statement timeout' } });
  const r = await pay({ studentId: s, amount: 300000, idempotencyKey: key });
  const legs = await legsOf(s);
  const rev = legs.filter((l) => (l.tx_key ?? '').startsWith(`payment-reversal-${key}-`));
  const n = await net(s);
  ok('the bill write fails: 409 "nothing was recorded (undone)"', r.status === 409 && r.body?.undone === true && /Nothing was recorded/.test(r.body?.error ?? ''), r);
  ok('  the bill is as it was (100,000), the payments row is gone', Number((await billOf(s, M)).recorded_payment) === 100000
     && !(await paymentsOf(s)).some((p) => p.id === key));
  ok('  its two legs are still there (append-only) and reversed by two NEW legs keyed payment-reversal-<payment>-<leg>, net 0',
     rev.length === 2 && legs.filter((l) => l.tx_key === `record-payment-${key}-${s}`).length === 1 && n.CASH === 100000 && n.AR === -100000 && balanced(legs), { rev, n });
  const w0 = log.length;
  const again = await pay({ studentId: s, amount: 300000, idempotencyKey: key });
  ok('the same key again: 409 (tried before and undone), nothing written - the screen makes a new key', again.status === 409 && log.length === w0, again);

  const key2 = randomUUID();
  faults.push({ table: 'ledger_entries', op: 'insert', error: { code: '08006', message: 'connection failure' } });
  const r2 = await pay({ studentId: s, amount: 50000, idempotencyKey: key2 });
  ok('the ledger insert fails: 500, the payments row removed, no legs, the bill untouched', r2.status === 500 && r2.body?.undone === true
     && !(await paymentsOf(s)).some((p) => p.id === key2) && !(await legsOf(s)).some((l) => (l.tx_key ?? '').includes(key2))
     && Number((await billOf(s, M)).recorded_payment) === 100000, r2);
  const r3 = await pay({ studentId: s, amount: 50000, idempotencyKey: key2 });
  ok('  that key had written nothing, so a retry with it records the payment once', r3.status === 200 && Number((await billOf(s, M)).recorded_payment) === 150000
     && (await paymentsOf(s)).filter((p) => p.id === key2).length === 1, r3);

  const appendOnly = await tryIt(() => sql(`UPDATE public.ledger_entries SET memo = 'x' WHERE tx_key = $1`, [`record-payment-${key}-${s}`]));
  const del = await tryIt(() => sql(`DELETE FROM public.ledger_entries WHERE tx_key = $1`, [`record-payment-${key}-${s}`]));
  ok('the undone legs cannot be tidied away: UPDATE and DELETE of the ledger are refused (HC130, G-11)', appendOnly?.code === 'HC130' && del?.code === 'HC130', { appendOnly, del });
  void inv;
}

// =================================================================== 11
console.log('\n11. delete-payment takes a record-payment payment back from all three');
{
  const s = await child('Delete');
  await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 200000 });
  const key = randomUUID();
  await pay({ studentId: s, amount: 300000, idempotencyKey: key, method: 'Bank Transfer' });
  const r = await call(deleteFn, ADMIN.tok, { paymentId: key, deleteReason: 'entered on the wrong child' });
  const legs = await legsOf(s);
  const n = await net(s);
  ok('200: the bill back to 200,000, the payments row gone, a deletion record kept', r.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000
     && !(await paymentsOf(s)).some((p) => p.id === key) && (await rows('SELECT 1 FROM public.payment_deletions WHERE payment_id = $1', [key])).length === 1, r);
  ok('  both legs reversed by two new legs (BANK nets 0, AR nets -200,000), balanced', legs.filter((l) => (l.tx_key ?? '').startsWith(`payment-reversal-${key}-`)).length === 2
     && (n.BANK ?? 0) === 0 && n.CASH === 200000 && n.AR === -200000 && balanced(legs), n);
  const twice = await call(deleteFn, ADMIN.tok, { paymentId: key, deleteReason: 'again' });
  ok('  deleting it again: refused (no payment), nothing changed', twice.status >= 400 && Number((await billOf(s, M)).recorded_payment) === 200000, twice);

  const ckey = randomUUID();
  await pay({ studentId: s, kind: 'correction', amount: 50000, memo: 'thought it was too much', idempotencyKey: ckey });
  const rc = await call(deleteFn, ADMIN.tok, { paymentId: ckey, deleteReason: 'the correction was the mistake' });
  const nc = await net(s);
  ok('deleting a CORRECTION puts its money back on the bill: 150,000 -> 200,000, ledger CASH 200,000 / AR -200,000',
     rc.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000 && nc.CASH === 200000 && nc.AR === -200000 && balanced(await legsOf(s)), { rc, nc });

  const s2 = await child('DeleteGuard');
  await bill(s2, M, 1000000);
  const k2 = randomUUID();
  await pay({ studentId: s2, amount: 400000, idempotencyKey: k2 });
  await pay({ studentId: s2, kind: 'correction', amount: 300000, memo: 'part of it was for the sibling' });
  const w0 = log.length;
  const guarded = await call(deleteFn, ADMIN.tok, { paymentId: k2, deleteReason: 'test' });
  ok('a payment whose bill now records less than it put there: refused (409), nothing written', guarded.status === 409 && log.length === w0
     && Number((await billOf(s2, M)).recorded_payment) === 100000, guarded);
}

// =================================================================== 12
console.log('\n12. CHECK-money-invariants.sql over what the functions wrote: M01 / M03 / M04 stay 0');
const checkSrc = readFileSync(join(repo, 'scripts', 'pgtest', 'money-invariants-check.test.mjs'), 'utf8').replace(/\r\n/g, '\n');
const CHECK_SCHEMA = checkSrc.match(/const SCHEMA = `([\s\S]*?)`;\n/)[1];
const CHECK_SQL = readFileSync(join(repo, 'scripts', 'CHECK-money-invariants.sql'), 'utf8');
async function invariants() {
  const c = new PGlite();
  await c.exec(CHECK_SCHEMA);
  const t = migText('20261113090000_invoice_paid_label.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
  await c.exec(t.slice(a, t.indexOf('$function$;', a) + '$function$;'.length));
  for (const table of ['invoices', 'payments', 'payment_allocations', 'ledger_accounts', 'ledger_entries']) {
    const cols = (await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table])).rows.map((r) => r.column_name);
    const src = await rows(`SELECT ${cols.map((x) => `t.${x}`).join(', ')} FROM public.${table} t`);
    if (src.length) await c.query(`INSERT INTO public.${table} SELECT * FROM json_populate_recordset(NULL::public.${table}, $1::json)`, [JSON.stringify(src)]);
  }
  const out = Object.fromEntries((await c.query(CHECK_SQL)).rows.map((r) => [r.check_id, Number(r.violations)]));
  await c.close();
  return out;
}
{
  const inv = await invariants();
  const counts = await one(`SELECT (SELECT count(*) FROM public.payments)::int AS p, (SELECT count(*) FROM public.ledger_entries)::int AS l,
                                   (SELECT count(*) FROM public.invoices WHERE recorded_payment > 0)::int AS b`);
  ok(`after every case above (${counts.p} payments, ${counts.l} legs, ${counts.b} bills with money): M01 0 (no unbalanced transaction), M03 0 (no bill shows more than the ledger), M04 0 (no ledger cash off a bill), M08 0`,
     inv.M01 === 0 && inv.M03 === 0 && inv.M04 === 0 && inv.M08 === 0 && counts.p >= 25, { inv, counts });
  // Control: the write the screens used to make (recorded_payment only) is what M03 counts.
  const s = await child('Legacy');
  await bill(s, M, 500000);
  await sql(`UPDATE public.invoices SET recorded_payment = 200000 WHERE student_id = $1 AND month = $2`, [s, M]);
  const legacy = await invariants();
  ok('  control: one bill paid the old way (recorded_payment only, no payment, no legs) is caught: M03 1, M01 / M04 still 0',
     legacy.M03 === 1 && legacy.M01 === 0 && legacy.M04 === 0, legacy);
  await sql(`UPDATE public.invoices SET recorded_payment = 0 WHERE student_id = $1 AND month = $2`, [s, M]);
}

// =================================================================== 13
console.log('\n13. if the undo itself fails, the answer says exactly what is left');
{
  const s = await child('HalfDone');
  await bill(s, M, 1000000);
  const key = randomUUID();
  faults.push({ table: 'invoices', op: 'update', error: { code: '57014', message: 'statement timeout' } });
  faults.push({ table: 'ledger_entries', op: 'insert', match: ({ payload }) => Array.isArray(payload) && String(payload[0]?.tx_key ?? '').startsWith('payment-reversal-'),
                error: { code: '08006', message: 'connection failure' } });
  const r = await pay({ studentId: s, amount: 100000, idempotencyKey: key });
  ok('500 halfDone, naming the payment, saying it is NOT on the bill and must not go through Delete payment',
     r.status === 500 && r.body?.halfDone === true && r.body?.paymentId === key && /NOT on the bill/.test(r.body?.error ?? '') && /Do not delete it with Delete payment/.test(r.body?.error ?? ''), r);
  const inv = await invariants();
  ok('  and that state is the one M04 reports (ledger cash 100,000 with no bill money): M04 1, M01 0', inv.M04 === 1 && inv.M01 === 0 && Number((await billOf(s, M)).recorded_payment) === 0, inv);
}

// =================================================================== 14
console.log('\n14. the screens, statically: they call record-payment and write no recorded_payment');
{
  const read = (f) => readFileSync(join(repo, f), 'utf8');
  const screens = ['RecordPaymentDialog', 'QuickPayPanel', 'BatchPaymentDialog', 'RecordedPaymentManager'].map((n) => `src/components/admin/${n}.tsx`);
  const bad = screens.filter((f) => { const t = read(f); return !/recordPayment\(supabase,/.test(t) || /setRecordedPayment|addToRecordedPayment|from\(\s*["']invoices["']\s*\)\s*\.(update|insert|upsert)|from\(\s*["']audit_log["']\s*\)\s*\.insert/.test(t); });
  // (recorded_payment still appears in their react-query cache patches: the figure the function returned.)
  ok('the four payment screens call recordPayment and neither write the bill nor its audit row themselves', bad.length === 0, bad);
  ok('  every one keeps the tuition-month confirmation (useTuitionMonthConfirmation) and checks it before sending',
     screens.every((f) => /useTuitionMonthConfirmation\(/.test(read(f)) && /\.confirmed\)/.test(read(f))));
  ok('  src/lib/recordPayment.ts reaches the function only through supabase.functions.invoke("record-payment")',
     /client\.functions\.invoke\("record-payment"/.test(read('src/lib/recordPayment.ts')) && !/fetch\(/.test(read('src/lib/recordPayment.ts')));
  const toml = read('supabase/config.toml').replace(/\r/g, '');
  ok('  [functions.record-payment] verify_jwt = true in supabase/config.toml', /\[functions\.record-payment\]\nverify_jwt = true/.test(toml));
  const fn = read('supabase/functions/record-payment/index.ts');
  ok('  record-payment: requireRole(["admin"]) with allowServiceRole false, and its data through callerClient',
     /requireRole\(req, service, \["admin"\], corsHeaders, \{ allowServiceRole: false \}\)/.test(fn) && /callerClient\(createClient/.test(fn)
     && !/service\s*\.from\(/.test(fn));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
