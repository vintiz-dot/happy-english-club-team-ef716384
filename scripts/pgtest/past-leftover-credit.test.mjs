// scripts/CREDIT-past-unapplied-cash.sql, run for real (owner: "Yes, credit them").
//
// Everything here is PostgreSQL (pglite): invoices carry the REAL
// confirmation, carry, audit and freeze migrations (the carry trigger is
// what turns money on a bill into credit on the next one); ledger_accounts,
// ledger_entries, payments and payment_allocations have live's shape
// (20251012022746 + the later tx_key / family columns); invoice_paid_label
// is the function from 20261113090000. The REAL smart-family-payment and
// delete-payment handlers are bundled and run against a small PostgREST
// stand-in over the same database, so "a payment made with the new code"
// and "delete-payment after the credit" are the functions, not a copy.
//
// The fixture is shaped like live (conductor's read-only counts, 16 Nov
// 2026): 3 payments through smart-family-payment, 3 children, months
// 2026-02..2026-08, 708,000 VND of unapplied cash, none reversed, each a
// `smart-family-credit-<payment>-<ms>` DR AR / CR CREDIT pair with no cash
// leg. Amounts and ids are synthetic; no real data.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { z } from 'zod';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (f) => readFileSync(join(repo, 'supabase', 'migrations', f), 'utf8');
const SCRIPT = readFileSync(join(repo, 'scripts', 'CREDIT-past-unapplied-cash.sql'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAMILY = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const KA = '11111111-1111-4111-8111-111111111111';   // child A: current bill already paid
const KB = '22222222-2222-4222-8222-222222222222';   // child B: current bill FROZEN, partly owed
const KC = '33333333-3333-4333-8333-333333333333';   // child C: no current bill, latest earlier one used
const P = { A: 'a0000000-0000-4000-8000-00000000000a', B: 'b0000000-0000-4000-8000-00000000000b', C: 'c0000000-0000-4000-8000-00000000000c' };
const LEFT = { A: 200000, B: 258000, C: 250000 };     // 708,000
const SRC = { A: '2026-02', B: '2026-05', C: '2026-08' };
const METHOD = { A: 'Cash', B: 'Bank Transfer', C: 'cash' };
const KID = { A: KA, B: KB, C: KC };
const CUR = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
if (CUR <= '2026-09') { console.error(`the Hanoi month ${CUR} is not after the fixture months`); process.exit(2); }

// ------------------------------------------------------------- database
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
  CREATE TABLE public.families(id uuid PRIMARY KEY, name text);
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text, family_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid);
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
  CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL, number TEXT,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    base_amount INTEGER NOT NULL DEFAULT 0, discount_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0, paid_amount INTEGER NOT NULL DEFAULT 0,
    pdf_storage_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), updated_by UUID REFERENCES auth.users(id),
    recorded_payment integer DEFAULT 0,
    carry_in_credit integer DEFAULT 0, carry_in_debt integer DEFAULT 0,
    carry_out_credit integer DEFAULT 0, carry_out_debt integer DEFAULT 0,
    class_breakdown jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT invoices_student_id_month_key UNIQUE (student_id, month)
  );
  CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL, entity_id text,
    action text NOT NULL, diff jsonb, actor_user_id uuid REFERENCES auth.users(id),
    occurred_at timestamptz NOT NULL DEFAULT now());
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
    created_by UUID REFERENCES auth.users(id), tx_key TEXT UNIQUE,
    CONSTRAINT debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)));
  CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, method TEXT NOT NULL, memo TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), family_id uuid, parent_payment_id uuid);
  CREATE TABLE public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, allocated_amount INTEGER NOT NULL, allocation_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID);
  CREATE TABLE public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid, snapshot jsonb,
    deleted_by uuid, deletion_reason text, deleted_at timestamptz DEFAULT now());
  INSERT INTO auth.users VALUES ('${ADMIN}');
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
`);
for (const f of ['20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql', '20261009120000_keep_invoice_carry_balances_correct.sql',
  '20261009130000_audit_every_admin_action.sql', '20261106120000_invoice_tuition_freeze.sql']) await db.exec(mig(f));
{
  const t = mig('20261113090000_invoice_paid_label.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
  const b = t.indexOf('$function$;', a);
  await db.exec(t.slice(a, b + '$function$;'.length));
}

// ---------------------------------------------- PostgREST stand-in (pglite)
function query(table) {
  let mode = 'select', cols = '*', returning = null, payload = null, onConflict = '', ignoreDup = false, order = '', lim = '';
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
    select(c = '*') { if (mode === 'select') cols = parseCols(c); else returning = c; return q; },
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
// calculate-tuition, as the payment functions read it: the stored bill's own carry.
async function tuitionFor({ studentId, month }) {
  const b = (await db.query('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [studentId, month])).rows[0];
  if (!b) return { data: null, error: new Error('no bill') };
  return { data: { baseAmount: b.base_amount, totalDiscount: b.discount_amount, totalAmount: b.total_amount,
    carry: { carryOutDebt: b.carry_out_debt, carryOutCredit: b.carry_out_credit } }, error: null };
}
globalThis.__plcZod = z;
globalThis.__plcClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: ADMIN } }, error: null }) },
  from: (t) => query(t),
  functions: { invoke: async (name, { body }) => (name === 'calculate-tuition' ? tuitionFor(body) : { data: null, error: null }) },
});
const handlers = {};
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
const out = mkdtempSync(join(tmpdir(), 'past-leftover-credit-'));
for (const name of ['smart-family-payment', 'delete-payment']) {
  const bundle = await build({
    entryPoints: [join(repo, 'supabase', 'functions', name, 'index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/rate-limit\.ts$)/ }, (args) => ({ path: args.path, namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__plcClient;'
        : args.path.includes('zod') ? 'export const z = globalThis.__plcZod;'
        : 'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};' }));
    } }],
  });
  const file = join(out, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}
const call = async (name, body) => {
  const res = await handlers[name](new Request('http://localhost/fn', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

// ---------------------------------------------------------------- fixture
const acc = (k, code) => `${k.slice(0, 8)}-0000-4000-8000-${{ AR: '00000000000a', CASH: '00000000000c', BANK: '00000000000b', CREDIT: '00000000000e' }[code]}`;
async function reset() {
  await db.exec(`TRUNCATE public.payment_allocations, public.payments, public.ledger_entries, public.ledger_accounts,
    public.invoices, public.payment_deletions, public.audit_log, public.students, public.families CASCADE;`);
  await db.query('INSERT INTO public.families VALUES ($1, $2)', [FAMILY, 'Family']);
}
const bill = (sid, month, total, recorded, extra = {}) => db.query(
  `INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status)
   VALUES ($1, $2, $3, $4, $5, $6, $6, $7)`,
  [sid, month, extra.base ?? total, extra.discount ?? 0, total, recorded, recorded >= total ? 'paid' : recorded > 0 ? 'partial' : 'issued']);
/** What smart-family-payment wrote BEFORE the change, for child k: 400,000 applied to the source bill, the rest a leftover pair. */
async function oldPayment(k, opts = {}) {
  const sid = KID[k], pid = P[k], L = opts.amount ?? LEFT[k];
  const cash = METHOD[k].toLowerCase() === 'cash' ? 'CASH' : 'BANK';
  await db.query('INSERT INTO public.payments (id, student_id, amount, method, family_id, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
    [pid, sid, 400000 + L, METHOD[k], FAMILY, ADMIN]);
  await db.query('INSERT INTO public.payment_allocations (parent_payment_id, student_id, allocated_amount, allocation_order) VALUES ($1,$2,400000,1)', [pid, sid]);
  const ins = (tx, key, account, debit, credit, month) => db.query(
    'INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, month, memo) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [tx, key, account, debit, credit, month, 'synthetic']);
  const ta = `${pid.slice(0, 8)}-1111-4000-8000-000000000001`, tb = `${pid.slice(0, 8)}-1111-4000-8000-000000000002`;
  await ins(ta, `smart-family-${pid}-${sid}-1700000000000`, acc(sid, cash), 400000, 0, SRC[k]);
  await ins(ta, null, acc(sid, 'AR'), 0, 400000, SRC[k]);
  await ins(tb, `smart-family-credit-${pid}-1700000000001`, acc(sid, 'AR'), L, 0, SRC[k]);
  await ins(tb, null, acc(sid, 'CREDIT'), 0, L, SRC[k]);
}
/** Live's shape: three children, their source bills paid by the allocation, the leftover nowhere on a bill. */
async function liveShape(opts = {}) {
  await reset();
  for (const k of ['A', 'B', 'C']) {
    await db.query('INSERT INTO public.students VALUES ($1, $2, $3, true)', [KID[k], `Child ${k}`, FAMILY]);
    for (const code of ['AR', 'CASH', 'BANK', 'CREDIT']) await db.query('INSERT INTO public.ledger_accounts (id, student_id, code) VALUES ($1,$2,$3)', [acc(KID[k], code), KID[k], code]);
    await bill(KID[k], SRC[k], 400000, 400000);
  }
  await bill(KA, CUR, 400000, 400000);                                    // A: current month, already paid
  await bill(KB, CUR, 350000, 100000, { base: 400000, discount: 50000 });  // B: current month, frozen below
  await db.query("UPDATE public.invoices SET tuition_frozen = true, frozen_reason = 'history corrected' WHERE student_id = $1 AND month = $2", [KB, CUR]);
  if (!opts.noBillForC) await bill(KC, '2026-09', 400000, 400000);         // C: no current bill; September is its latest
  else await db.query('DELETE FROM public.invoices WHERE student_id = $1', [KC]);
  for (const k of ['A', 'B', 'C']) await oldPayment(k);
}
const getBill = async (sid, month) => (await db.query('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [sid, month])).rows[0] ?? null;
const nets = async (sid) => Object.fromEntries((await db.query(
  `SELECT a.code::text AS code, sum(e.debit - e.credit)::int AS net FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE a.student_id = $1 GROUP BY 1 ORDER BY 1`, [sid])).rows.map((r) => [r.code, r.net]));
const dump = async () => JSON.stringify({
  inv: (await db.query('SELECT student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status, carry_out_credit, carry_out_debt FROM public.invoices ORDER BY student_id, month')).rows,
  led: (await db.query('SELECT tx_id, tx_key, account_id, debit, credit, month FROM public.ledger_entries ORDER BY id')).rows,
  acc: (await db.query('SELECT student_id, code::text FROM public.ledger_accounts ORDER BY student_id, code')).rows,
});
async function runScript() {
  try {
    const res = await db.exec(SCRIPT);
    const row = res.filter((r) => r.rows?.length).at(-1)?.rows[0];
    return { ok: true, row: row && { credited: Number(row.leftovers_credited), total: Number(row.total_vnd), left: Number(row.still_to_credit) } };
  } catch (e) { return { ok: false, error: e.message }; }
}

// =================================================================== tests
console.log('\nThe script is SQL that reads, then writes only bills and new ledger rows');
{
  const code = SCRIPT.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').replace(/'[^']*'/g, "''");
  ok('it never deletes or rewrites a ledger row, a payment or an allocation (no DELETE / UPDATE ledger_entries / payments)',
     !/\bdelete\b/i.test(code) && !/update\s+public\.(ledger_entries|payments|payment_allocations)/i.test(code)
       && !/truncate|drop\s+table\s+public|alter\s+table\s+public/i.test(code));
  ok('  it writes invoices only through a compare-and-set on the value read, with invoice_paid_label',
     /AND coalesce\(recorded_payment, 0\) = v_bill\.recorded/.test(SCRIPT) && /public\.invoice_paid_label\(v_new/.test(SCRIPT));
}

console.log('\nBefore: live\'s shape - the leftovers are on no bill and no cash account');
await liveShape();
const before = { A: await nets(KA), B: await nets(KB), C: await nets(KC) };
ok('each child: AR net -400,000 + leftover, CREDIT -leftover, the cash/bank account only 400,000',
   before.A.AR === -200000 && before.A.CREDIT === -200000 && before.A.CASH === 400000
     && before.B.BANK === 400000 && before.B.CREDIT === -258000 && before.C.CASH === 400000 && before.C.CREDIT === -250000, before);
const oldRows = JSON.stringify((await db.query("SELECT * FROM public.ledger_entries ORDER BY id")).rows);

console.log('\nThe run');
let r = await runScript();
console.log(`    first run => ${JSON.stringify(r)}`);
ok('the result row: 3 leftovers credited, 708,000 VND, 0 still to credit', r.ok && same(r.row, { credited: 3, total: 708000, left: 0 }), r);
const after = { A: await nets(KA), B: await nets(KB), C: await nets(KC) };
ok('child A (Cash): CASH 600,000, AR -600,000, CREDIT 0 - the leftover now reached the cash account',
   same(after.A, { AR: -600000, CASH: 600000, CREDIT: 0 }), after.A);
ok('child B (Bank Transfer): BANK 658,000, AR -658,000, CREDIT 0', same(after.B, { AR: -658000, BANK: 658000, CREDIT: 0 }), after.B);
ok("child C ('cash', lower case): CASH 650,000, AR -650,000, CREDIT 0", same(after.C, { AR: -650000, CASH: 650000, CREDIT: 0 }), after.C);
const all = (await db.query('SELECT sum(debit)::int d, sum(credit)::int c FROM public.ledger_entries')).rows[0];
ok('  the whole ledger still balances (debits = credits)', all.d === all.c, all);
ok('  the old pairs and allocations are byte-for-byte as they were (new rows only)',
   oldRows === JSON.stringify((await db.query('SELECT * FROM public.ledger_entries WHERE id = ANY($1::uuid[]) ORDER BY id',
     [JSON.parse(oldRows).map((o) => o.id)])).rows));
ok('  4 new legs per payment: a reclass in the old month and the cash leg (the marker) on the bill\'s month',
   (await db.query(`SELECT count(*)::int n FROM public.ledger_entries WHERE memo LIKE 'Past unapplied cash%'`)).rows[0].n === 12
     && (await db.query(`SELECT count(*)::int n FROM public.ledger_entries WHERE tx_key = 'past-leftover-credit-${P.A}' AND month = '${CUR}'`)).rows[0].n === 1
     && (await db.query(`SELECT count(*)::int n FROM public.ledger_entries WHERE tx_key = 'past-leftover-credit-${P.C}-reclass' AND month = '2026-08'`)).rows[0].n === 1);
let a = await getBill(KA, CUR), b = await getBill(KB, CUR), c = await getBill(KC, '2026-09');
ok(`child A: the current month (${CUR}) bill records 600,000 on 400,000 - 200,000 carry-out credit, paid`,
   a.recorded_payment === 600000 && a.carry_out_credit === 200000 && a.status === 'paid', a);
ok('child B: the FROZEN current bill keeps base 400,000 / discount 50,000 / total 350,000, records 358,000, 8,000 credit, paid',
   b.tuition_frozen === true && b.base_amount === 400000 && b.discount_amount === 50000 && b.total_amount === 350000
     && b.recorded_payment === 358000 && b.carry_out_credit === 8000 && b.status === 'paid', b);
ok('child C: no current bill, so its latest bill (2026-09) records 650,000 - 250,000 credit, paid',
   c.recorded_payment === 650000 && c.carry_out_credit === 250000 && c.status === 'paid' && !(await getBill(KC, CUR)), c);
await bill(KC, '2026-10', 400000, 0);
const cOct = await getBill(KC, '2026-10');
ok('  and child C\'s next bill, when it is made, opens with the 250,000 as credit (payable 150,000)',
   cOct.carry_in_credit === 250000 && cOct.total_amount + cOct.carry_in_debt - cOct.carry_in_credit === 150000, cOct);
await db.query('DELETE FROM public.invoices WHERE student_id = $1 AND month = $2', [KC, '2026-10']);
ok('  the source months are untouched (each still 400,000 recorded)',
   (await getBill(KA, SRC.A)).recorded_payment === 400000 && (await getBill(KB, SRC.B)).recorded_payment === 400000
     && (await getBill(KC, SRC.C)).recorded_payment === 400000);

console.log('\nRun again: nothing changes');
{
  const snap = await dump();
  r = await runScript();
  ok('second run: the same result row (3 / 708,000 / 0) and not one row changed', r.ok && same(r.row, { credited: 3, total: 708000, left: 0 }) && (await dump()) === snap, r);
}

console.log('\nThe same money paid with the NEW smart-family-payment ends the same way');
{
  // Child A as it was in February: the bill owed 400,000, the family paid 600,000.
  const credited = { nets: await nets(KA), cur: await getBill(KA, CUR) };
  await reset();
  await db.query('INSERT INTO public.students VALUES ($1, $2, $3, true)', [KA, 'Child A', FAMILY]);
  for (const code of ['AR', 'CASH', 'BANK', 'CREDIT']) await db.query('INSERT INTO public.ledger_accounts (id, student_id, code) VALUES ($1,$2,$3)', [acc(KA, code), KA, code]);
  await bill(KA, SRC.A, 400000, 0);
  await bill(KA, CUR, 400000, 400000);
  const pr = await call('smart-family-payment', { familyId: FAMILY, amount: 600000, method: 'Cash', occurredAt: '2026-02-20T10:00:00.000Z',
    month: SRC.A, leftoverHandling: 'credit_next_bill' });
  const viaNew = { nets: await nets(KA), cur: await getBill(KA, CUR) };
  console.log(`    new code => ${pr.status} ; nets ${JSON.stringify(viaNew.nets)} ; credited nets ${JSON.stringify(credited.nets)}`);
  ok('child A\'s AR, CASH and CREDIT balances are exactly what the new code leaves (AR -600,000, CASH 600,000, CREDIT 0)',
     pr.status === 200 && same({ AR: viaNew.nets.AR, CASH: viaNew.nets.CASH, CREDIT: viaNew.nets.CREDIT ?? 0 }, credited.nets), { pr: pr.body, viaNew, credited: credited.nets });
  ok('  and the current month closes the same: 200,000 carry-out credit either way (the credit sits one bill later, the balance is the same)',
     viaNew.cur.carry_out_credit === credited.cur.carry_out_credit && credited.cur.carry_out_credit === 200000
       && viaNew.cur.carry_out_debt === credited.cur.carry_out_debt, { viaNew: viaNew.cur.carry_out_credit, credited: credited.cur.carry_out_credit });
}

console.log('\ndelete-payment on an old payment AFTER the credit takes all of it away');
{
  await liveShape();
  await runScript();
  const d = await call('delete-payment', { paymentId: P.A, deleteReason: 'entered twice' });
  console.log(`    delete-payment => ${d.status} ${JSON.stringify(d.body).slice(0, 400)}`);
  const n = await nets(KA);
  ok('200; child A\'s ledger nets to zero on every account (old legs, reclass and cash leg all reversed - no double reversal)',
     d.status === 200 && Object.values(n).every((v) => v === 0), { d: d.body, n });
  ok('  the bills: February back to 0 recorded, the current bill back to 400,000 (the 200,000 credit gone)',
     (await getBill(KA, SRC.A)).recorded_payment === 0 && (await getBill(KA, CUR)).recorded_payment === 400000
       && (await getBill(KA, CUR)).carry_out_credit === 0, [await getBill(KA, SRC.A), await getBill(KA, CUR)]);
  ok('  8 legs reversed in 4 transactions, balanced; the payment row is gone; the other children untouched',
     d.body.reversal_tx_count === 4
       && (await db.query(`SELECT count(*)::int n, sum(debit - credit)::int s FROM public.ledger_entries WHERE tx_key LIKE 'payment-reversal-${P.A}-%'`)).rows[0].n === 8
       && !(await db.query('SELECT 1 FROM public.payments WHERE id = $1', [P.A])).rows.length
       && same(await nets(KB), { AR: -658000, BANK: 658000, CREDIT: 0 }) && (await getBill(KB, CUR)).recorded_payment === 358000);
  const all2 = (await db.query('SELECT sum(debit)::int d, sum(credit)::int c FROM public.ledger_entries')).rows[0];
  ok('  the ledger still balances', all2.d === all2.c, all2);
  r = await runScript();
  ok('  the script run again afterwards: does nothing more (3 / 708,000 / 0; the deleted one is not credited again)',
     r.ok && same(r.row, { credited: 3, total: 708000, left: 0 }) && (await getBill(KA, CUR)).recorded_payment === 400000, r);
  ok('  delete-payment knows the two new keys, and only these two',
     /past-leftover-credit-\$\{id\}`\) return 'allocation'/.test(readFileSync(join(repo, 'supabase/functions/delete-payment/index.ts'), 'utf8'))
       && /past-leftover-credit-\$\{id\}-reclass`\) return 'leftover'/.test(readFileSync(join(repo, 'supabase/functions/delete-payment/index.ts'), 'utf8')));
}

console.log('\nA payment deleted BEFORE the script: its leftover is skipped');
{
  await liveShape();
  const d = await call('delete-payment', { paymentId: P.B, deleteReason: 'entered twice' });
  r = await runScript();
  ok('B deleted first (old legs reversed): the script credits A and C only - 2 / 450,000 / 0 - and B\'s bills stay as the delete left them',
     d.status === 200 && r.ok && same(r.row, { credited: 2, total: 450000, left: 0 })
       && (await getBill(KB, CUR)).recorded_payment === 100000 && (await getBill(KB, SRC.B)).recorded_payment === 0
       && Object.values(await nets(KB)).every((v) => v === 0), { d: d.body, r });
}

console.log('\nRefusals: nothing changes');
{
  for (const [what, prep, re] of [
    ['a child with no bill for this month or earlier', async () => { await liveShape({ noBillForC: true }); await db.query('DELETE FROM public.invoices WHERE student_id = $1', [KC]); }, /no bill/],
    ['a fourth leftover (not the 3 / 708,000 counted on live)', async () => {
      await liveShape();
      await db.query('INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, month) VALUES ($1,$2,$3,1000,0,$4)',
        ['dddddddd-1111-4000-8000-000000000001', `smart-family-credit-dddddddd-0000-4000-8000-00000000000d-1`, acc(KA, 'AR'), '2026-03']);
      await db.query('INSERT INTO public.ledger_entries (tx_id, account_id, debit, credit, month) VALUES ($1,$2,0,1000,$3)',
        ['dddddddd-1111-4000-8000-000000000001', acc(KA, 'CREDIT'), '2026-03']); }, /expected 3 leftovers totalling 708000/],
    ['a leftover pair with a third leg', async () => {
      await liveShape();
      await db.query('INSERT INTO public.ledger_entries (tx_id, account_id, debit, credit, month) VALUES ($1,$2,1,0,$3)',
        [`${P.B.slice(0, 8)}-1111-4000-8000-000000000002`, acc(KB, 'CASH'), SRC.B]); }, /exactly a DR AR \/ CR CREDIT pair/],
    ['a leftover whose payment row is gone', async () => {
      await liveShape();
      await db.query('DELETE FROM public.payment_allocations WHERE parent_payment_id = $1', [P.C]);
      await db.query('DELETE FROM public.payments WHERE id = $1', [P.C]); }, /payment no longer exists/],
  ]) {
    await prep();
    const snap = await dump();
    const rr = await runScript();
    ok(`${what}: refused with a reason, not one row changed`, !rr.ok && re.test(rr.error) && (await dump()) === snap, rr);
  }
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
