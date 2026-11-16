// A recalculation must not un-confirm or un-pay a bill (T1, decision D-14).
//
// calculate-tuition saves the bill on every call. Until T1 it wrote
// confirmation_status = auto_approved | needs_review and status = 'issued'
// each time, so a bill an admin had confirmed, or a family had paid, lost
// that the next time anybody opened a tuition screen.
//
// What runs here: the REAL calculate-tuition, calculate-tuition-bulk and
// confirm-tuition handlers, bundled with esbuild (remote imports, the auth
// gate, the rate limiter and the sibling resolver stubbed). Their Supabase
// client is a stand-in whose `invoices` table is a real PostgreSQL table
// (pglite) carrying the REAL migrations that own these columns:
//
//   node scripts/pgtest/invoice-status.test.mjs \
//     supabase/migrations/20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql \  (confirmation_status + CHECK)
//     supabase/migrations/20261009120000_keep_invoice_carry_balances_correct.sql \   (carry trigger)
//     supabase/migrations/20261009130000_audit_every_admin_action.sql \              (audit trigger)
//     supabase/migrations/20261106120000_invoice_tuition_freeze.sql                  (frozen bills)
//
// so the enum, the CHECK constraint, the freeze trigger, the carry trigger
// and the audit trail decide what a write does, not this file. The other
// tables (students, enrollments, sessions, attendance...) are plain arrays,
// as in enrollment-discounts.test.mjs.
//
// THE FIGURES. fixtures/tuition-figures.golden.json holds, for every
// fixture below, the whole response and the saved figure columns as the
// function produced them BEFORE T1 (commit 736264c). The last section
// compares today's function with it, byte for byte. It was written by
//   T1_HANDLER_SOURCE=<a copy of the 736264c index.ts> T1_WRITE_GOLDEN=1 node ... (same arguments)
// Regenerate it only from a function whose figures are known to be right:
// a change in this file's golden is a change in what families are charged.
// T1_HANDLER_SOURCE alone runs the whole suite against that other copy,
// which is how the defect was reproduced (docs/evidence/T1-invoice-status.md).
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { z } from 'zod';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const goldenPath = join(here, 'fixtures', 'tuition-figures.golden.json');
const altSource = process.env.T1_HANDLER_SOURCE || '';
const writeGolden = process.env.T1_WRITE_GOLDEN === '1';

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const files = process.argv.slice(2);
if (files.length !== 4) {
  console.error('usage: invoice-status.test.mjs <20251117061416> <20261009120000> <20261009130000> <20261106120000>');
  process.exit(2);
}

// ------------------------------------------------------------- database
const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const FAMILY = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const CA = 'cccccccc-cccc-4ccc-8ccc-cccccccccc0a';
const CB = 'cccccccc-cccc-4ccc-8ccc-cccccccccc0b';

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
  CREATE TABLE public.students(id uuid PRIMARY KEY);
  -- 20251117061416 adds a column here before it reaches invoices.
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid);
  -- invoices as 20251012022746:36-50 made it, plus the columns later
  -- migrations added before the four under test (20251013171128 unique
  -- key, 20251015053836 recorded_payment, 20251202015608 carry,
  -- 20251203114723 class_breakdown).
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
  CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    number TEXT,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    base_amount INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    pdf_storage_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
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
  INSERT INTO auth.users VALUES ('${ADMIN}');
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  INSERT INTO public.students VALUES ('${S1}'), ('${S2}');
`);
for (const f of files) await db.exec(readFileSync(f, 'utf8'));

// ------------------------------------------------------ Supabase stand-in
let fixture = {};
let invoiceWrites = [];
let failInvoiceRead = false;
let failPriorRead = false;              // only the read of the OTHER months (.neq('month', ...))
let failNextFullUpsert = false;
let beforeNextUpsert = null;            // runs once, between a calculation's read and its save
let beforeNextInvoiceWrite = null;      // T4 r2: { mode: 'update' | 'insert', fn } - runs once before that write
let beforeNextMemoryInsert = null;      // T4 r2: { table, fn } - runs once before that insert
let memoryWrites = [];
const JSONB = new Set(['review_flags', 'class_breakdown']);

function invoiceQuery() {
  let mode = 'select', cols = '*', payload = null, conflict = '', order = '', limit = '';
  const where = [], params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const value = (k, v) => (JSONB.has(k) ? `${p(v == null ? null : JSON.stringify(v))}::jsonb` : p(v));
  async function run() {
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') {
        if (failInvoiceRead) return { data: null, error: { message: 'synthetic invoice read failure' } };
        if (failPriorRead && where.some((c) => c.includes('<>'))) return { data: null, error: { message: 'synthetic read failure (other months)' } };
        return { data: (await db.query(`SELECT ${cols} FROM public.invoices${w}${order}${limit}`, params)).rows, error: null };
      }
      // T4 r2: another writer lands between this writer's read and its write.
      if (beforeNextInvoiceWrite && beforeNextInvoiceWrite.mode === mode) {
        const f = beforeNextInvoiceWrite.fn; beforeNextInvoiceWrite = null; await f();
      }
      const keys = Object.keys(payload);
      if (mode === 'insert') {
        invoiceWrites.push({ mode, payload });
        await db.query(`INSERT INTO public.invoices (${keys.join(', ')}) VALUES (${keys.map((k) => value(k, payload[k])).join(', ')})`, params);
        return { data: null, error: null };
      }
      if (mode === 'upsert') {
        if (failNextFullUpsert && keys.includes('carry_in_credit')) {
          failNextFullUpsert = false;
          return { data: null, error: { message: 'synthetic: column does not exist' } };
        }
        if (beforeNextUpsert) { const f = beforeNextUpsert; beforeNextUpsert = null; await f(); }
        invoiceWrites.push({ mode, payload });
        const vals = keys.map((k) => value(k, payload[k]));
        await db.query(
          `INSERT INTO public.invoices (${keys.join(', ')}) VALUES (${vals.join(', ')})
           ON CONFLICT (${conflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`, params);
        return { data: null, error: null };
      }
      if (mode === 'update') {
        invoiceWrites.push({ mode, payload });
        // SET first: its parameters must be numbered before the filters'.
        const filters = [...where], filterParams = [...params];
        params.length = 0;
        const set = keys.map((k) => `${k} = ${value(k, payload[k])}`).join(', ');
        const shifted = filters.map((c) => c.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + params.length}`));
        const all = [...params, ...filterParams];
        const r = await db.query(
          `UPDATE public.invoices SET ${set}${shifted.length ? ` WHERE ${shifted.join(' AND ')}` : ''} RETURNING *`, all);
        return { data: r.rows, error: null };
      }
      throw new Error(`unsupported ${mode}`);
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
  const q = {
    // An embedded relation (`*, students(full_name)`) is PostgREST's; the table here has no names to give.
    select(c = '*') { if (mode === 'select') cols = c.replace(/,\s*\w+\([^)]*\)/g, ''); return q; },
    eq(k, v) { where.push(`${k} = ${p(v)}`); return q; },
    neq(k, v) { where.push(`${k} <> ${p(v)}`); return q; },
    lte(k, v) { where.push(`${k} <= ${p(v)}`); return q; },
    in(k, vs) { where.push(vs.length ? `${k} IN (${vs.map((v) => p(v)).join(', ')})` : 'false'); return q; },
    // Like PostgREST, a second order() is a further sort key, not a replacement.
    order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} ${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
    gt(k, v) { where.push(`${k} > ${p(v)}`); return q; },
    limit(n) { limit = ` LIMIT ${Number(n)}`; return q; },
    upsert(v, o = {}) { mode = 'upsert'; payload = Array.isArray(v) ? v[0] : v; conflict = o.onConflict; return q; },
    insert(v) { mode = 'insert'; payload = Array.isArray(v) ? v[0] : v; return q; },
    update(v) { mode = 'update'; payload = v; return q; },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    then(a, b) { return run().then(a, b); },
  };
  return q;
}

// T4: tables whose inserts land in the fixture, so a later read sees them
// (a settlement counts on the bill; a payment's ledger legs are reversed).
const KEEPS_INSERTS = new Set(['settlements', 'ledger_entries', 'payments', 'payment_allocations']);
let failTables = new Set();             // T4: a read of these tables answers with an error
let failCanceledRead = false;           // BROWSER-PRICING: only the read of the CANCELLED lessons fails
let insertSeq = 0;
function memoryQuery(table) {
  let rows = fixture[table] || [];
  // PostgREST rows always carry their id; calculate-tuition-bulk pages by it.
  rows.forEach((r, i) => { if (r.id == null) r.id = `${table}-${String(i).padStart(6, '0')}`; });
  // The two embeds the payment functions read: a ledger leg's account, a payment's allocations.
  if (table === 'ledger_entries') rows.forEach((r) => {
    if (!r.ledger_accounts) { const a = (fixture.ledger_accounts || []).find((x) => x.id === r.account_id); if (a) r.ledger_accounts = { student_id: a.student_id, code: a.code }; }
  });
  if (table === 'payments') rows.forEach((r) => {
    if (!r.payment_allocations) r.payment_allocations = (fixture.payment_allocations || []).filter((x) => x.parent_payment_id === r.id);
  });
  let orderKey = null, lim = Infinity;
  const page = () => { const out = orderKey ? [...rows].sort((a, b) => (String(a[orderKey]) < String(b[orderKey]) ? -1 : String(a[orderKey]) > String(b[orderKey]) ? 1 : 0)) : rows; return out.slice(0, lim); };
  let forced = false;
  const failed = () => failTables.has(table) || forced;
  const keep = (v) => {
    if (!KEEPS_INSERTS.has(table)) return;
    fixture[table] = fixture[table] || [];
    for (const r of Array.isArray(v) ? v : [v]) {
      fixture[table].push({ id: `${table}-ins-${String(++insertSeq).padStart(6, '0')}`, created_at: new Date().toISOString(), ...r });
    }
  };
  const like = (pattern) => new RegExp(`^${pattern.split('%').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  const q = {
    select() { return q; }, order(k) { orderKey = k; return q; }, or() { return q; }, limit(n) { lim = n; return q; },
    gt(k, v) { rows = rows.filter((r) => String(r[k]) > String(v)); return q; },
    // A filter on an embedded relation ('ledger_accounts.student_id') reads the embed.
    eq(k, v) {
      if (failCanceledRead && table === 'sessions' && k === 'status' && v === 'Canceled') forced = true;
      if (k.includes('.')) { const [rel, col] = k.split('.'); rows = rows.filter((r) => r[rel]?.[col] === v); } else rows = rows.filter((r) => r[k] === v);
      return q;
    },
    neq(k, v) { rows = rows.filter((r) => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter((r) => vs.includes(r[k])); return q; },
    gte(k, v) { rows = rows.filter((r) => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter((r) => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter((r) => r[k] <= v); return q; },
    is(k, v) { rows = rows.filter((r) => (r[k] ?? null) === v); return q; },
    like(k, pattern) { const re = like(pattern); rows = rows.filter((r) => re.test(String(r[k] ?? ''))); return q; },
    insert(v) {
      const go = () => {
        // ledger_entries.tx_key is UNIQUE on live: a second reversal of the same leg fails whole.
        if (table === 'ledger_entries') {
          const keys = new Set((fixture.ledger_entries || []).map((e) => e.tx_key).filter(Boolean));
          if ((Array.isArray(v) ? v : [v]).some((r) => r.tx_key && keys.has(r.tx_key))) {
            return { error: { message: 'duplicate key value violates unique constraint "ledger_entries_tx_key_key"', code: '23505' } };
          }
        }
        memoryWrites.push({ table, op: 'insert', value: v }); keep(v); return { error: null };
      };
      if (beforeNextMemoryInsert && beforeNextMemoryInsert.table === table) {
        const f = beforeNextMemoryInsert.fn; beforeNextMemoryInsert = null;
        return Promise.resolve(f()).then(go);
      }
      return Promise.resolve(go());
    },
    upsert(v) { memoryWrites.push({ table, op: 'upsert', value: v }); return Promise.resolve({ error: null }); },
    delete() { memoryWrites.push({ table, op: 'delete' }); return q; },
    single() { return Promise.resolve(failed() ? { data: null, error: { message: `synthetic ${table} read failure` } } : { data: rows[0], error: null }); },
    maybeSingle() { return Promise.resolve(failed() ? { data: null, error: { message: `synthetic ${table} read failure` } } : { data: rows[0] || null, error: null }); },
    then(done, bad) {
      return Promise.resolve(failed() ? { data: null, error: { message: `synthetic ${table} read failure` } } : { data: page(), error: null }).then(done, bad);
    },
  };
  return q;
}

const handlers = {};
const post = (body) => new Request('http://localhost/fn', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-admin' },
  body: JSON.stringify(body),
});
globalThis.__t1Zod = z;
globalThis.__t1Gate = { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN };
globalThis.__t1Sibling = async () => { throw new Error('Unexpected family calculation'); };
globalThis.__t1Client = () => ({
  auth: { getUser: async () => ({ data: { user: { id: ADMIN } }, error: null }) },
  from: (table) => (table === 'invoices' ? invoiceQuery() : memoryQuery(table)),
  functions: { invoke: async (name, { body }) => {
    const res = await handlers[name](post(body));
    const data = await res.json();
    return res.status === 200 ? { data, error: null } : { data: null, error: new Error(data?.error || 'non-2xx') };
  } },
});

// ------------------------------------------------------------ the bundles
const out = mkdtempSync(join(tmpdir(), 't1-invoice-status-'));
const libDir = resolve(repo, 'supabase', 'functions', '_lib');
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
for (const name of ['calculate-tuition', 'calculate-tuition-bulk', 'confirm-tuition',
  'family-payment', 'smart-family-payment', 'settle-bill', 'delete-payment', 'modify-payment']) {
  const entry = name === 'calculate-tuition' && altSource
    ? resolve(altSource) : resolve(repo, 'supabase', 'functions', name, 'index.ts');
  const bundle = await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ },
        (args) => ({ path: args.path, namespace: 'test' }));
      // A copy of the function kept somewhere else still uses the repo's _lib.
      b.onResolve({ filter: /\/_lib\/[^/]+\.ts$/ }, (args) => ({ path: join(libDir, args.path.split('/').pop()) }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__t1Client;' :
        args.path.includes('zod') ? 'export const z = globalThis.__t1Zod;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => globalThis.__t1Gate; export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = (...a) => globalThis.__t1Sibling(...a);' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};',
      }));
    } }],
  });
  const file = join(out, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}

// --------------------------------------------------------------- fixtures
const MONTH = '2026-10';
const OCT = ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'];
/** One child, one class at 100,000 a lesson, four Held lessons in October, all Present. */
function world(opts = {}) {
  const classes = { id: CA, name: 'Class A', session_rate_vnd: 100000 };
  fixture = {
    students: [{ id: S1, family_id: null, families: null, full_name: 'Child One', is_active: true }],
    classes: [classes],
    // What the payment functions look up besides invoices.
    user_roles: [{ user_id: ADMIN, role: 'admin' }],
    families: [{ id: FAMILY, name: 'Family' }],
    ledger_accounts: ['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT', 'DISCOUNT'].map((code) => ({ id: `acc-${code}`, student_id: S1, code })),
    payments: [], ledger_entries: [],
    enrollments: [{ student_id: S1, class_id: CA, discount_type: opts.discount ? 'percent' : null,
      discount_value: opts.discount ?? null, discount_cadence: opts.discount ? 'monthly' : null,
      rate_override_vnd: null, start_date: '2026-09-01', end_date: null, allowed_days: null }],
    sessions: OCT.map((date, i) => ({ id: `s${i}`, date, class_id: CA, status: 'Held', classes })),
    discount_assignments: [], referral_bonuses: [],
  };
  fixture.attendance = fixture.sessions.map((s) => ({ session_id: s.id, student_id: S1, status: 'Present' }));
}
async function reset() {
  await db.exec('DELETE FROM public.invoices; DELETE FROM public.audit_log;');
  invoiceWrites = []; memoryWrites = []; failInvoiceRead = false; failPriorRead = false;
  failNextFullUpsert = false; beforeNextUpsert = null; failTables = new Set(); failCanceledRead = false;
  beforeNextInvoiceWrite = null; beforeNextMemoryInsert = null;
  globalThis.__t1Gate = { isServiceRole: false, roles: new Set(['admin']), userId: ADMIN };
  globalThis.__t1Sibling = async () => { throw new Error('Unexpected family calculation'); };
}
const mark = (i, status) => { fixture.attendance.find((a) => a.session_id === `s${i}`).status = status; };
async function calc(studentId = S1, month = MONTH, extra = {}) {
  const res = await handlers['calculate-tuition'](post({ studentId, month, ...extra }));
  return { status: res.status, body: await res.json() };
}
async function bulk(studentIds = [S1], month = MONTH) {
  const res = await handlers['calculate-tuition-bulk'](post({ studentIds, month }));
  return { status: res.status, body: await res.json() };
}
async function confirm(ids, adjustedStatus) {
  const res = await handlers['confirm-tuition'](post({ invoiceIds: ids, ...(adjustedStatus ? { adjustedStatus } : {}) }));
  return { status: res.status, body: await res.json() };
}
const bill = async (studentId = S1, month = MONTH) =>
  (await db.query('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [studentId, month])).rows[0] ?? null;
const FIGURES = ['base_amount', 'discount_amount', 'total_amount', 'paid_amount', 'recorded_payment',
  'carry_in_credit', 'carry_in_debt', 'carry_out_credit', 'carry_out_debt', 'class_breakdown'];
const figures = (row) => (row ? Object.fromEntries(FIGURES.map((k) => [k, row[k]])) : null);
const brief = (row) => row && { status: row.status, confirmation_status: row.confirmation_status,
  total_amount: row.total_amount, recorded_payment: row.recorded_payment,
  confirmed_at: row.confirmed_at ? 'set' : null, flags: (row.review_flags || []).map((f) => f.type) };
const changedFlag = (row) => (row?.review_flags || []).find((f) => f.type === 'changed_after_confirmation');
/** What a payment function writes (family-payment/index.ts:259-264). */
const pay = (id, amount, status) =>
  db.query('UPDATE public.invoices SET recorded_payment = $2, status = $3 WHERE id = $1', [id, amount, status]);
const statusResets = async () => (await db.query(
  `SELECT count(*)::int n FROM public.audit_log
    WHERE entity = 'invoices' AND operation = 'UPDATE'
      AND changed_fields && ARRAY['confirmation_status','status']`)).rows[0].n;

// ============================================================ a new bill
console.log('\nA new bill is saved exactly as before');
{
  await reset(); world();
  const r = await calc();
  let b = await bill();
  ok('no discount: 200 and the bill is saved', r.status === 200 && r.body.invoiceSaved === true && !!b, r.body);
  ok('  status issued, auto_approved, no review flags',
     b?.status === 'issued' && b?.confirmation_status === 'auto_approved' && same(b?.review_flags, []), brief(b));
  ok('  400,000 charged, nothing confirmed', b?.total_amount === 400000 && b?.confirmed_at === null, brief(b));

  await reset(); world({ discount: 10 });
  await calc(); b = await bill();
  ok('10% discount: status issued, needs_review, one tuition_adjustment flag',
     b?.status === 'issued' && b?.confirmation_status === 'needs_review'
       && same(b?.review_flags.map((f) => f.type), ['tuition_adjustment']), brief(b));
  ok('  the flag carries expected 400,000 / payable 360,000',
     b?.review_flags[0]?.details?.expectedClassTuition === 400000 && b?.review_flags[0]?.details?.actualPayable === 360000,
     b?.review_flags);
  await calc(); const again = await bill();
  ok('  recalculated with nothing changed: still issued / needs_review / the same flag',
     again?.status === 'issued' && again?.confirmation_status === 'needs_review' && same(again?.review_flags, b?.review_flags), brief(again));
  mark(0, 'Excused'); await calc(); b = await bill();
  ok('  an unconfirmed bill that changes is simply recomputed (no "changed after confirmation")',
     b?.total_amount === 270000 && b?.confirmation_status === 'needs_review' && !changedFlag(b), brief(b));
}

// ============================================ confirmed, nothing changed
console.log('\nA confirmed bill stays confirmed when nothing changed');
for (const [label, discount] of [['auto_approved bill', undefined], ['needs_review bill (10% discount)', 10]]) {
  await reset(); world({ discount });
  await calc();
  const before = await bill();
  const c = await confirm([before.id]);
  const confirmed = await bill();
  ok(`${label}: confirm-tuition -> 200, the bill is confirmed by the admin`,
     c.status === 200 && confirmed?.confirmation_status === 'confirmed' && confirmed?.confirmed_by === ADMIN && !!confirmed?.confirmed_at,
     { c: c.body, bill: brief(confirmed) });
  const resetsBefore = await statusResets();
  const r = await calc();
  const after = await bill();
  console.log(`    after recalculation => ${JSON.stringify(brief(after))}`);
  ok('  recalculated with nothing changed: STILL confirmed', r.status === 200 && after?.confirmation_status === 'confirmed', brief(after));
  ok('  who confirmed and when are untouched',
     after?.confirmed_by === ADMIN && same(after?.confirmed_at, confirmed?.confirmed_at));
  ok('  the figures are the ones confirmed', same(figures(after), figures(confirmed)));
  ok('  no "changed after confirmation" flag appears', !changedFlag(after), after?.review_flags);
  for (let i = 0; i < 3; i++) await calc();
  ok('  and three more recalculations change neither column (audit trail: 0 changes to them)',
     (await bill())?.confirmation_status === 'confirmed' && (await statusResets()) === resetsBefore,
     { bill: brief(await bill()), resets: (await statusResets()) - resetsBefore });
}
{
  await reset(); world({ discount: 10 });
  await calc();
  const c = await confirm([(await bill()).id], 'adjusted');
  await calc();
  const after = await bill();
  console.log(`    adjusted, after recalculation => ${JSON.stringify(brief(after))}`);
  ok('adjusted stays adjusted', c.status === 200 && after?.confirmation_status === 'adjusted', brief(after));
}

// ===================================================== paid and partial
console.log('\nA paid bill stays paid, a part-paid bill stays partial');
{
  await reset(); world();
  await calc();
  let b = await bill();
  await pay(b.id, 400000, 'paid');
  const r = await calc();
  b = await bill();
  console.log(`    paid, after recalculation => ${JSON.stringify(brief(b))}`);
  ok('paid in full: recalculated -> STILL paid', r.status === 200 && b?.status === 'paid', brief(b));
  ok('  the payment is still on the bill and the month is settled',
     b?.recorded_payment === 400000 && b?.carry_out_debt === 0 && b?.carry_out_credit === 0, figures(b));

  await reset(); world();
  await calc(); b = await bill();
  await pay(b.id, 150000, 'partial');
  await calc(); b = await bill();
  console.log(`    partial, after recalculation => ${JSON.stringify(brief(b))}`);
  ok('part paid: recalculated -> STILL partial', b?.status === 'partial', brief(b));
  ok('  150,000 recorded, 250,000 still owed', b?.recorded_payment === 150000 && b?.carry_out_debt === 250000, figures(b));

  // A payment recorded before any calculation creates the row itself
  // (RecordPaymentDialog.tsx:102-114, ai_action_apply 20261107090000:559-562).
  await reset(); world();
  await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount,
      recorded_payment, paid_amount, status) VALUES ($1, $2, 0, 0, 0, 200000, 0, 'partial')`, [S1, MONTH]);
  await calc(); b = await bill();
  ok('a payment recorded before the first calculation: the bill gets its figures and stays partial',
     b?.status === 'partial' && b?.total_amount === 400000 && b?.recorded_payment === 200000, brief(b));
  ok('  and is graded as a first calculation would grade it (auto_approved)', b?.confirmation_status === 'auto_approved', brief(b));

  await reset(); world();
  await calc(); b = await bill();
  await db.query(`UPDATE public.invoices SET status = 'draft' WHERE id = $1`, [b.id]);
  await calc();
  ok('a draft bill is still issued by a calculation, as before', (await bill())?.status === 'issued', brief(await bill()));
  await db.query(`UPDATE public.invoices SET status = 'credit' WHERE id = $1`, [b.id]);
  await calc();
  ok('an admin-set "credit" is left alone', (await bill())?.status === 'credit', brief(await bill()));

  // The minimal fallback upsert (index.ts, "fallback minimal upsert").
  await reset(); world();
  await calc(); b = await bill();
  await pay(b.id, 400000, 'paid');
  failNextFullUpsert = true;
  const r2 = await calc();
  ok('the fallback save (first upsert refused) does not un-pay the bill either',
     r2.status === 200 && (await bill())?.status === 'paid' && invoiceWrites.at(-1).payload.carry_in_credit === undefined,
     { bill: brief(await bill()), last: invoiceWrites.at(-1) });
}

// ============================================ confirmed, then it changes
console.log('\nA confirmed bill whose figures change goes back to review, saying what it was');
{
  await reset(); world();
  await calc();
  await confirm([(await bill()).id]);
  const confirmed = await bill();
  mark(3, 'Excused');                     // one lesson forgiven: 400,000 -> 300,000
  const r = await calc();
  let b = await bill();
  let flag = changedFlag(b);
  console.log(`    after the change => ${JSON.stringify(brief(b))}`);
  console.log(`    flag => ${JSON.stringify(flag)}`);
  ok('the new figure is saved (300,000)', r.status === 200 && b?.total_amount === 300000 && r.body.totalAmount === 300000, brief(b));
  ok('it is NOT left "confirmed" for a figure nobody confirmed: needs_review', b?.confirmation_status === 'needs_review', brief(b));
  ok('a "changed after confirmation" flag is on the bill', !!flag && typeof flag.label === 'string' && flag.label.length > 0, b?.review_flags);
  ok('  with the confirmed figures (400,000) and the current ones (300,000)',
     flag?.details?.confirmed?.total_amount === 400000 && flag?.details?.confirmed?.base_amount === 400000
       && flag?.details?.confirmed?.discount_amount === 0 && flag?.details?.current?.total_amount === 300000
       && flag?.details?.difference === -100000, flag);
  ok('  and that it had been "confirmed", by whom and when',
     flag?.details?.previousStatus === 'confirmed' && flag?.details?.confirmedBy === ADMIN
       && new Date(flag?.details?.confirmedAt).getTime() === new Date(confirmed.confirmed_at).getTime(), flag);
  ok('  confirmed_at / confirmed_by stay on the row as the record of the earlier confirmation',
     b?.confirmed_by === ADMIN && same(b?.confirmed_at, confirmed.confirmed_at));
  ok('  the ordinary flag is still computed alongside it (none here: total equals the class rate)',
     same(b?.review_flags.map((f) => f.type), ['changed_after_confirmation']), b?.review_flags);

  await calc(); b = await bill();
  ok('recalculated again, nothing new: still needs_review, the flag still says 400,000 was confirmed',
     b?.confirmation_status === 'needs_review' && changedFlag(b)?.details?.confirmed?.total_amount === 400000
       && changedFlag(b)?.details?.current?.total_amount === 300000, b?.review_flags);
  mark(2, 'Excused'); await calc(); b = await bill();
  ok('a second change: "confirmed" stays 400,000, "current" follows to 200,000',
     b?.total_amount === 200000 && changedFlag(b)?.details?.confirmed?.total_amount === 400000
       && changedFlag(b)?.details?.current?.total_amount === 200000 && changedFlag(b)?.details?.difference === -200000,
     b?.review_flags);
  mark(2, 'Present'); mark(3, 'Present'); await calc(); b = await bill();
  ok('the figures going back to 400,000 does not confirm it by itself: an admin still has to look',
     b?.total_amount === 400000 && b?.confirmation_status === 'needs_review' && !!changedFlag(b), brief(b));

  const c2 = await confirm([b.id]);
  b = await bill();
  ok('the admin confirms again -> confirmed', c2.status === 200 && b?.confirmation_status === 'confirmed', brief(b));
  ok('  and confirm-tuition itself takes the flag off (no "changed" badge on a confirmed bill)', !changedFlag(b), b?.review_flags);
  await calc(); b = await bill();
  ok('  and the next recalculation keeps it confirmed, with the old flag gone',
     b?.confirmation_status === 'confirmed' && !changedFlag(b), brief(b));
  mark(0, 'Excused'); await calc(); b = await bill();
  ok('  a later change is measured against the SECOND confirmation',
     b?.confirmation_status === 'needs_review' && changedFlag(b)?.details?.confirmed?.total_amount === 400000
       && changedFlag(b)?.details?.current?.total_amount === 300000
       && new Date(changedFlag(b)?.details?.confirmedAt).getTime() === new Date(b.confirmed_at).getTime(), b?.review_flags);
}
{
  // adjusted + a discount flag + paid: every part at once.
  await reset(); world({ discount: 10 });
  await calc();
  let b = await bill();
  await confirm([b.id], 'adjusted');
  await pay(b.id, 360000, 'paid');
  mark(1, 'Excused');                     // 360,000 -> 270,000
  await calc(); b = await bill();
  console.log(`    adjusted + paid, after a change => ${JSON.stringify(brief(b))}`);
  ok('adjusted + paid bill that changes: needs_review, both flags, previousStatus "adjusted"',
     b?.confirmation_status === 'needs_review'
       && same(b?.review_flags.map((f) => f.type), ['tuition_adjustment', 'changed_after_confirmation'])
       && changedFlag(b)?.details?.previousStatus === 'adjusted'
       && changedFlag(b)?.details?.confirmed?.total_amount === 360000 && changedFlag(b)?.details?.current?.total_amount === 270000,
     b?.review_flags);
  ok('  status stays paid; the 360,000 payment and the 90,000 credit are on the row',
     b?.status === 'paid' && b?.recorded_payment === 360000 && b?.carry_out_credit === 90000, figures(b));
}

// ========================================================== frozen bills
console.log('\nFrozen bills');
{
  await reset(); world();
  await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount,
      recorded_payment, status, confirmation_status, confirmed_at, confirmed_by, tuition_frozen, frozen_reason, class_breakdown)
    VALUES ($1, $2, 900000, 90000, 810000, 810000, 'paid', 'confirmed', now(), $3, true, 'history corrected',
      '[{"class_id":"x","amount_vnd":900000}]'::jsonb)`, [S1, MONTH, ADMIN]);
  const before = await bill();
  const r = await calc();
  const after = await bill();
  console.log(`    frozen, after recalculation => ${JSON.stringify(brief(after))}`);
  ok('the function reports the saved figures (900,000 / 90,000 / 810,000), not the live 400,000',
     r.body.tuitionFrozen === true && r.body.baseAmount === 900000 && r.body.totalDiscount === 90000 && r.body.totalAmount === 810000, r.body);
  const charged = (row) => [row?.base_amount, row?.discount_amount, row?.total_amount, row?.class_breakdown];
  ok('the row keeps base, discount, total and class breakdown (the trigger)',
     same(charged(after), charged(before)) && after?.tuition_frozen === true && after?.frozen_reason === 'history corrected', figures(after));
  ok('  and the 810,000 payment recorded on it', after?.recorded_payment === 810000, figures(after));
  ok('and it stays confirmed and paid', after?.confirmation_status === 'confirmed' && after?.status === 'paid' && !changedFlag(after), brief(after));
}

// ================================================================== bulk
console.log('\ncalculate-tuition-bulk reports the same and writes nothing');
{
  await reset(); world({ discount: 10 });
  await calc();
  let b = await bill();
  await confirm([b.id]);
  await pay(b.id, 100000, 'partial');
  const single = await calc();
  b = await bill();
  invoiceWrites = [];
  const many = await bulk();
  const row = many.body.results?.[0];
  ok('bulk: same base / discount / total as the single function',
     many.status === 200 && row?.baseAmount === single.body.baseAmount && row?.totalDiscount === single.body.totalDiscount
       && row?.totalAmount === single.body.totalAmount, row);
  ok('bulk: reports the stored statuses (confirmed, partial)',
     row?.confirmationStatus === 'confirmed' && row?.invoiceStatus === 'partial', row);
  ok('bulk: makes no write to invoices, and the row is byte-identical afterwards',
     invoiceWrites.length === 0 && same(await bill(), b), invoiceWrites);
  mark(0, 'Excused');
  const single2 = await calc();
  const many2 = await bulk();
  ok('bulk after a change: the single function\'s new total, and needs_review / partial as stored',
     many2.body.results?.[0]?.totalAmount === single2.body.totalAmount && many2.body.results?.[0]?.totalAmount === 270000
       && many2.body.results?.[0]?.confirmationStatus === 'needs_review' && many2.body.results?.[0]?.invoiceStatus === 'partial',
     many2.body.results?.[0]);
}

// ============================================== paths that do not write
console.log('\nThe paths that must not save still do not, and a failed read saves nothing');
{
  const family = () => {
    fixture.students = [{ id: S1, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null } }];
  };
  await reset(); world(); await calc();
  let b = await bill();
  await confirm([b.id]); await pay(b.id, 400000, 'paid');
  b = await bill(); invoiceWrites = [];

  family(); mark(0, 'Excused');
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'unresolved', winner_student_id: null,
    winner_class_id: null, sibling_percent: 0, reason: 'busy' }];
  let r = await calc();
  ok('family discount unresolved: figures returned, nothing saved, the row byte-identical',
     r.status === 200 && r.body.siblingUnresolved === true && r.body.invoiceSaved === false
       && invoiceWrites.length === 0 && same(await bill(), b), { body: r.body.invoiceSaved, invoiceWrites });

  globalThis.__t1Gate = { isServiceRole: true, roles: new Set(), userId: null };
  globalThis.__t1Sibling = async () => [];
  r = await calc(S1, MONTH, { siblingPreview: true });
  ok('sibling preview: nothing saved, the row byte-identical',
     r.status === 200 && r.body.invoiceSaved === false && invoiceWrites.length === 0 && same(await bill(), b), invoiceWrites);

  await reset(); world(); await calc();
  b = await bill();
  await confirm([b.id]); await pay(b.id, 400000, 'paid');
  b = await bill(); invoiceWrites = [];
  failInvoiceRead = true;
  r = await calc();
  failInvoiceRead = false;
  console.log(`    invoice read fails => ${r.status} ${JSON.stringify(r.body)}, writes ${invoiceWrites.length}`);
  ok('the bill cannot be read: the call fails (400) rather than guessing', r.status === 400, r.body);
  ok('  and nothing is written - the payment, "paid" and "confirmed" all stand',
     invoiceWrites.length === 0 && same(await bill(), b), { invoiceWrites, bill: brief(await bill()) });
}

// ===================================== what the cancellation guard reads
console.log('\nWhat the cancellation guard\'s "settled" test sees after a recalculation');
{
  // The predicate of session_month_tuition_settled, 20261112091000:316-319.
  const settledBy = async () => (await db.query(`
    SELECT COALESCE(i.recorded_payment, 0) > 0 AS paid_in,
           i.status::text IN ('paid', 'partial') AS by_status,
           COALESCE(i.confirmation_status IN ('confirmed', 'adjusted'), false) AS by_confirmation,
           COALESCE(i.tuition_frozen, false) AS frozen
      FROM public.invoices i WHERE i.student_id = $1 AND i.month = $2`, [S1, MONTH])).rows[0];
  await reset(); world(); await calc();
  await confirm([(await bill()).id]);
  await calc(); await calc();
  let s = await settledBy();
  ok('confirmed, unpaid, recalculated twice: still settled by confirmation', s?.by_confirmation === true && s?.paid_in === false, s);
  await reset(); world(); await calc();
  await pay((await bill()).id, 150000, 'partial');
  await calc(); await calc();
  s = await settledBy();
  ok('part paid, recalculated twice: settled by payment AND by status (partial)', s?.by_status === true && s?.paid_in === true, s);
  // Round 2: the label follows the month's money. A 'paid' with nothing
  // recorded (what the cumulative rule used to write) is not kept alive.
  await reset(); world(); await calc();
  await db.query(`UPDATE public.invoices SET status = 'paid' WHERE student_id = $1`, [S1]);
  await calc();
  s = await settledBy();
  ok('a "paid" label with no payment recorded is corrected to issued at the next calculation (not settled by status)',
     s?.by_status === false && (await bill())?.status === 'issued', { s, bill: brief(await bill()) });
}

// =====================================================================
// ROUND 2 (T1-review M-1, M-2, m-3, m-4; T3 "Stopped on")
// =====================================================================
const NOV = '2026-11';
const SEP = '2026-09';
const PAY_ID = '99999999-9999-4999-8999-999999999999';
const call = async (name, body) => {
  const res = await handlers[name](post(body));
  return { status: res.status, body: await res.json() };
};
/** A stored bill for a month the fixture has no lessons in (base = total). */
const seedBill = (month, total, recorded, status = 'issued') => db.query(
  `INSERT INTO public.invoices (student_id, month, base_amount, total_amount, recorded_payment, status)
   VALUES ($1, $2, $3, $3, $4, $5)`, [S1, month, total, recorded, status]);
/** RecordedPaymentManager.tsx:107-113 / :163-169 - the browser edits recorded_payment and nothing else. */
const editRecorded = (month, amount) => db.query(
  'UPDATE public.invoices SET recorded_payment = $3 WHERE student_id = $1 AND month = $2', [S1, month, amount]);
const inFamilyOf = () => {
  fixture.students = [{ id: S1, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null }, full_name: 'Child One', is_active: true }];
  globalThis.__t1Sibling = async () => [];
};
/** A family with history: September charged 400,000 and paid in full, then October calculated. */
async function withHistory(opts) {
  await reset(); world(opts); inFamilyOf();
  await seedBill(SEP, 400000, 400000, 'paid');
  await calc();
}
const smartPay = (amount) => call('smart-family-payment',
  { familyId: FAMILY, amount, method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z', month: MONTH });
const familyPay = (amount, month = MONTH) => call('family-payment',
  { month, familyId: FAMILY, selectedStudentIds: [S1], amount, method: 'Cash',
    occurredAt: '2026-10-20T10:00:00.000Z', allocationMode: 'oldest-first' });
const settle = (amount) => call('settle-bill',
  { studentId: S1, month: MONTH, settlementType: 'discount', amount, reason: 'hardship' });
/**
 * Settle Bill is removed (D-23): settle-bill is a 410 stub, and the
 * calculators' write-off reader went after it (FOLLOWUPS-writeoff-payroll):
 * live held no 'settlement-writeoff-' row (scripts/CHECK-writeoff-reader-removal.sql).
 * The cases that follow put one in the fixture exactly as the T4 settle-bill
 * wrote it - the 'discount' settlements row and its ledger pair, keyed
 * 'settlement-writeoff-' - and assert that neither calculator counts it.
 */
let writeOffSeq = 0;
const historicWriteOff = (amount, month = MONTH) => {
  const n = ++writeOffSeq, tx = `tx-wo-${n}`;
  fixture.settlements = [...(fixture.settlements || []),
    { id: `wo-${n}`, student_id: S1, month, settlement_type: 'discount', amount, tx_id: tx }];
  fixture.ledger_entries = [...(fixture.ledger_entries || []),
    { id: `wol-${n}a`, tx_id: tx, tx_key: `settlement-writeoff-${S1}-${month}-${n}`, account_id: 'acc-DISCOUNT', debit: amount, credit: 0, month },
    { id: `wol-${n}b`, tx_id: tx, tx_key: null, account_id: 'acc-AR', debit: 0, credit: amount, month }];
};
const money = (row) => row && { status: row.status, total: row.total_amount, recorded: row.recorded_payment,
  in_debt: row.carry_in_debt, in_credit: row.carry_in_credit, out_debt: row.carry_out_debt, out_credit: row.carry_out_credit };

console.log('\nRound 2 - ONE rule for the paid label, and every writer agrees with it');
{
  const lib = join(out, 'invoice-status.lib.mjs');
  writeFileSync(lib, (await build({ entryPoints: [join(libDir, 'invoice-status.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const { paidLabel, monthPayable, invoicePaidLabel } = await import(pathToFileURL(lib).href);
  const table = [
    // recorded, total, carry-in debt, carry-in credit, expected
    [400000, 400000, 0, 0, 'paid'], [500000, 400000, 0, 0, 'paid'], [399999, 400000, 0, 0, 'partial'],
    [1, 400000, 0, 0, 'partial'], [0, 400000, 0, 0, 'issued'],
    [400000, 400000, 300000, 0, 'partial'], [700000, 400000, 300000, 0, 'paid'],      // debt carried in
    [300000, 400000, 0, 100000, 'paid'], [200000, 400000, 0, 100000, 'partial'],       // part of the month covered by credit
    // T4 (fault 5): nothing left to pay reads paid. These three were issued / issued / partial.
    [0, 400000, 0, 400000, 'paid'], [0, 400000, 0, 650000, 'paid'],                    // credit covers the month, nothing recorded
    [50000, 400000, 0, 650000, 'paid'],
    // zero-charge month: nothing at all stays issued; money on it is "nothing left to pay" (was partial)
    [0, 0, 0, 0, 'issued'], [100000, 0, 0, 0, 'paid'], [300000, 0, 300000, 0, 'paid'],
  ];
  ok('the rule, case by case (debt carried in, credit carried in, a zero-charge month)',
     table.every(([r, t, d, c, want]) => invoicePaidLabel({ total_amount: t, carry_in_debt: d, carry_in_credit: c, recorded_payment: r }) === want),
     table.filter(([r, t, d, c, want]) => invoicePaidLabel({ total_amount: t, carry_in_debt: d, carry_in_credit: c, recorded_payment: r }) !== want));
  ok('  payable = charge + debt carried in - credit carried in (may be negative)',
     monthPayable({ total_amount: 400000, carry_in_debt: 300000, carry_in_credit: 0 }) === 700000
       && monthPayable({ total_amount: 400000, carry_in_debt: 0, carry_in_credit: 650000 }) === -250000
       && monthPayable({ total_amount: 400000 }) === 400000);
  ok('  missing or unreadable numbers count as 0, never as paid',
     paidLabel(null, 400000, 400000) === 'issued' && paidLabel(undefined, undefined, undefined) === 'issued'
       && paidLabel('x', 'y', 'z') === 'issued' && paidLabel(100, 400000, null) === 'partial');

  // The dialogs no longer state the rule; they import its mirror (T4, faults 3-4, below).
  const src = (rel) => readFileSync(join(repo, rel), 'utf8');
  // The row the dialogs read moved to src/lib/liveTuitionItem.ts (T3 round 2):
  // the function's own carry.payable (monthPayable, above), and for a
  // function too old to send it, the same sum over the function's figures.
  // scripts/tuitionRows.test.ts checks both by value.
  const liveItem = src('src/lib/liveTuitionItem.ts');
  ok('  the dialogs\' payable is the function\'s carry.payable (liveTuitionItem)',
     /finalPayable:\s*payableFromFunction\(/.test(liveItem));
  ok('  and for an older function, charge + carry-in debt - carry-in credit',
     /\?\?[\s\S]{0,120}data\.totalAmount \+ \(data\.carry\?\.carryInDebt \?\? 0\) - \(data\.carry\?\.carryInCredit \?\? 0\)/.test(liveItem));
  const aiSql = src('supabase/migrations/20261107090000_ai_assisted_admin_actions.sql');
  // ai_action_apply / undo: 20261107090000 still holds its own CASE (history);
  // migration 20261113090000 (T4) replaces it in the installed functions with
  // public.invoice_paid_label - checked against the live definitions by
  // ai-actions.test.mjs, and against this helper in the T4 section below.
  ok('  ai_action_apply / undo: the CASE that 20261113090000 replaces is the one 20261107090000 installs',
     /v_payable := coalesce\(inv\.total_amount, 0\) \+ coalesce\(inv\.carry_in_debt, 0\) - coalesce\(inv\.carry_in_credit, 0\)/.test(aiSql)
       && /WHEN v_total >= v_payable AND v_payable > 0 THEN 'paid'\s+WHEN v_total > 0 THEN 'partial' ELSE 'issued'/.test(aiSql)
       && /WHEN v_left >= v_payable AND v_payable > 0 THEN 'paid'\s+WHEN v_left > 0 THEN 'partial' ELSE 'issued'/.test(aiSql));
  // The old CASE and the T4 rule agree wherever something is still owed (payable > 0); they part only where nothing is.
  const grid = [];
  for (const r of [0, 1, 100000, 399999, 400000, 700000]) for (const pv of [1, 400000, 700000]) grid.push([r, pv]);
  const sqlSays = await Promise.all(grid.map(async ([r, pv]) => (await db.query(
    `SELECT (CASE WHEN $1::bigint >= $2::bigint AND $2::bigint > 0 THEN 'paid' WHEN $1::bigint > 0 THEN 'partial' ELSE 'issued' END) AS l`, [r, pv])).rows[0].l));
  ok(`  and the old CASE agrees with the helper on all ${grid.length} (recorded, payable > 0) pairs - T4 changed only "nothing left to pay"`,
     grid.every(([r, pv], i) => paidLabel(r, pv, 400000) === sqlSays[i]));
  const fns = ['calculate-tuition', 'smart-family-payment', 'family-payment', 'delete-payment'];
  ok('  every edge function that writes invoices.status imports the helper and has no rule of its own',
     fns.every((f) => /from ['"]\.\.\/_lib\/invoice-status\.ts['"]/.test(src(`supabase/functions/${f}/index.ts`))
       && !/status:[^\n]*\?\s*['"]paid['"]/.test(src(`supabase/functions/${f}/index.ts`))
       && !/newStatus = ['"](paid|partial|draft)['"]/.test(src(`supabase/functions/${f}/index.ts`))));
  ok('  settle-bill writes no label at all any more: it is a 410 stub that reads and writes nothing (D-23)',
     !/createClient|\.from\(|invoices/.test(src('supabase/functions/settle-bill/index.ts')) && /status: 410/.test(src('supabase/functions/settle-bill/index.ts')));
  ok('  and none of them judges a bill by cumulative paid_amount',
     fns.every((f) => !/paid_amount[^\n]*>=|>=[^\n]*paid_amount|<=[^\n]*paid_amount \+/.test(src(`supabase/functions/${f}/index.ts`))));
}

console.log('\nRound 2 - the label after each payment path and the standard recalculation');
{
  // ---- Smart Family Payment (the mounted family payment screen)
  await withHistory();
  let b = await bill();
  ok('the M-1 setup: a family with a paid September - October\'s cumulative paid_amount already covers a month',
     b?.paid_amount >= b?.total_amount && b?.recorded_payment === 0 && b?.status === 'issued', figures(b));
  let r = await smartPay(100000);
  b = await bill();
  console.log(`    smart-family-payment, 100,000 of 400,000, family with history => ${JSON.stringify(money(b))}`);
  ok('smart-family-payment, PART payment by a family with earlier paid months: partial (was: "paid")',
     r.status === 200 && b?.status === 'partial' && b?.recorded_payment === 100000 && b?.carry_out_debt === 300000, { r: r.body, b: money(b) });
  await calc(); await calc();
  ok('  still partial after two more recalculations', (await bill())?.status === 'partial', money(await bill()));
  r = await smartPay(300000);
  b = await bill();
  ok('  the rest paid: paid, nothing owed', r.status === 200 && b?.status === 'paid' && b?.recorded_payment === 400000 && b?.carry_out_debt === 0, money(b));
  await calc();
  ok('  and paid after the recalculation', (await bill())?.status === 'paid');

  await withHistory();
  r = await smartPay(400000);
  await calc(); b = await bill();
  ok('smart-family-payment, FULL payment: paid', r.status === 200 && b?.status === 'paid' && b?.recorded_payment === 400000, money(b));

  // The branch that creates the bill: the family discount is unresolved, so
  // the calculator returned figures without saving a row.
  await reset(); world(); inFamilyOf();
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'unresolved', winner_student_id: null,
    winner_class_id: null, sibling_percent: 0, reason: 'busy' }];
  r = await smartPay(100000);
  b = await bill();
  ok('smart-family-payment creating the bill (no row yet), part payment: partial',
     r.status === 200 && b?.status === 'partial' && b?.recorded_payment === 100000, { r: r.body, b: money(b) });
  await reset(); world(); inFamilyOf();
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'unresolved', winner_student_id: null,
    winner_class_id: null, sibling_percent: 0, reason: 'busy' }];
  r = await smartPay(400000);
  ok('  and in full: paid', (await bill())?.status === 'paid' && (await bill())?.recorded_payment === 400000, money(await bill()));

  // ---- Family Payment
  await withHistory();
  r = await familyPay(150000);
  await calc(); b = await bill();
  ok('family-payment, part payment: partial', r.status === 200 && b?.status === 'partial' && b?.recorded_payment === 150000, { r: r.body, b: money(b) });
  r = await familyPay(250000);
  await calc(); b = await bill();
  ok('family-payment, the rest: paid', r.status === 200 && b?.status === 'paid' && b?.recorded_payment === 400000, money(b));
  invoiceWrites = []; memoryWrites = [];
  r = await familyPay(100000);
  // T4: with nothing owed and no instruction for the money, it is refused
  // before anything is written (it used to answer 200 and drop the 100,000).
  ok('family-payment on a bill that IS paid: the bill is not selected - no invoice write, no allocation (T4: and the call is refused)',
     r.status === 400 && invoiceWrites.filter((w) => w.mode === 'update').length === 0
       && !memoryWrites.some((w) => w.table === 'payment_allocations') && (await bill())?.recorded_payment === 400000,
     { invoiceWrites, allocations: memoryWrites.filter((w) => w.table === 'payment_allocations') });

  // "Open" is read from the money, not from the stored label.
  await withHistory();
  await db.query(`UPDATE public.invoices SET status = 'paid' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  r = await familyPay(400000);
  b = await bill();
  ok('family-payment: a bill WRONGLY labelled paid (nothing recorded) is still paid into (was: left out, ledger posted anyway)',
     r.status === 200 && b?.recorded_payment === 400000 && b?.status === 'paid', money(b));
  // Why the selection was not simply dropped: total - recorded is NOT 0 for
  // every bill that is really paid.
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 500000, 'paid');            // 100,000 credit carried into October
  await calc();
  await familyPay(300000); await calc();
  b = await bill();
  ok('a bill paid with 100,000 of carried-in credit: 300,000 recorded on a 400,000 charge is paid',
     b?.status === 'paid' && b?.carry_in_credit === 100000 && b?.carry_out_debt === 0 && b?.carry_out_credit === 0, money(b));
  ok('  total - recorded still reads 100,000 there, so "the owed arithmetic applies 0 to a paid bill" is false',
     b?.total_amount - b?.recorded_payment === 100000);
  invoiceWrites = [];
  r = await familyPay(100000);
  ok('  with the selection kept (judged by the money) nothing more is taken for it; without it 100,000 would be (T4: refused, nothing owed)',
     r.status === 400 && invoiceWrites.filter((w) => w.mode === 'update').length === 0 && (await bill())?.recorded_payment === 300000,
     { invoiceWrites, b: money(await bill()) });

  // ---- debt carried in
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 100000, 'partial');          // 300,000 still owed from September
  await calc();
  await smartPay(400000);
  await calc(); b = await bill();
  console.log(`    300,000 carried in, 400,000 paid => ${JSON.stringify(money(b))}`);
  ok('debt carried in: paying the month\'s 400,000 while 300,000 is carried in is partial',
     b?.status === 'partial' && b?.carry_in_debt === 300000 && b?.carry_out_debt === 300000, money(b));
  await smartPay(300000);
  await calc(); b = await bill();
  ok('  paying the carried debt as well: paid', b?.status === 'paid' && b?.recorded_payment === 700000 && b?.carry_out_debt === 0, money(b));

  // ---- credit carried in covers the month
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 800000, 'paid');
  r = await calc(); b = await bill();
  console.log(`    credit covers the month => ${JSON.stringify(money(b))}, payable ${r.body.carry?.payable}`);
  ok('credit carried in covers the whole month, nothing recorded in it: paid (T4; was issued), nothing owed, payable 0',
     b?.status === 'paid' && b?.carry_in_credit === 400000 && b?.carry_out_debt === 0 && r.body.carry?.payable === 0, money(b));
  ok('  September, which holds the overpayment, is not rewritten by October\'s calculation',
     (await bill(S1, SEP))?.status === 'paid' && (await bill(S1, SEP))?.recorded_payment === 800000);

  // ---- a zero-charge month, a frozen bill
  await reset(); world();
  r = await calc(S1, '2026-12');
  ok('a month with no charge: issued', (await bill(S1, '2026-12'))?.status === 'issued' && (await bill(S1, '2026-12'))?.total_amount === 0);
  await editRecorded('2026-12', 50000); await calc(S1, '2026-12');
  ok('  money recorded on it: paid - nothing is left to pay (T4; was partial)', (await bill(S1, '2026-12'))?.status === 'paid');
  await reset(); world();
  await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, status, tuition_frozen)
    VALUES ($1, $2, 900000, 90000, 810000, 400000, 'issued', true)`, [S1, MONTH]);
  await calc(); b = await bill();
  ok('a frozen bill is judged on its SAVED total: 400,000 of 810,000 is partial (the live 400,000 would say paid)',
     b?.status === 'partial' && b?.total_amount === 810000, money(b));
  await editRecorded(MONTH, 810000); await calc();
  ok('  and 810,000 is paid', (await bill())?.status === 'paid' && (await bill())?.total_amount === 810000);

  // ---- settle-bill (removed, D-23: a 410 stub). A write-off recorded before
  // the removal no longer counts: the reader is gone (see "T4 fault 2").
  await reset(); world(); await calc();
  memoryWrites = []; invoiceWrites = [];
  const unsettled = await bill();
  r = await settle(400000);
  console.log(`    settle-bill, write-off in full => ${r.status} ${JSON.stringify(r.body)}`);
  ok('settle-bill is removed: 410 "Settle bill has been removed", nothing read or written, the bill as it was',
     r.status === 410 && r.body.error === 'Settle bill has been removed' && memoryWrites.length === 0 && invoiceWrites.length === 0
       && same(await bill(), unsettled), r);
  historicWriteOff(400000); await calc(); b = await bill();
  ok('a write-off IN FULL recorded before the removal is ignored: the bill as it was - 400,000 charged, 400,000 owed',
     b?.total_amount === 400000 && b?.carry_out_debt === 400000 && same(money(b), money(unsettled)), money(b));
  ok('  so the label stays issued: nothing was paid', b?.status === 'issued', money(b));
  await reset(); world(); await calc();
  await pay((await bill()).id, 100000, 'partial'); await calc();
  const partPaid = money(await bill());
  historicWriteOff(100000); await calc(); b = await bill();
  ok('a write-off IN PART on a part-paid bill is ignored: stays partial, 300,000 left',
     b?.status === 'partial' && b?.recorded_payment === 100000 && b?.carry_out_debt === 300000 && same(money(b), partPaid), money(b));
  await withHistory();
  const withDebt = money(await bill());
  historicWriteOff(400000); await calc();
  ok('a family with paid history: the write-off is ignored, the real 400,000 debt stands',
     (await bill())?.carry_out_debt === 400000 && same(money(await bill()), withDebt), money(await bill()));

  // ---- delete-payment (T4 changed it: see "T4 fault 1" for the full set)
  const ledgerPayment = () => {
    fixture.payments = [{ id: PAY_ID, student_id: S1, parent_payment_id: null, family_id: null, amount: 400000, payment_allocations: [] }];
    fixture.ledger_entries = [{ id: 'le-1', tx_id: 'tx-old', tx_key: `payment-${PAY_ID}-ar`, month: MONTH, debit: 0, credit: 400000,
      account_id: 'acc-AR', ledger_accounts: { student_id: S1, code: 'AR' } }];
  };
  await withHistory(); ledgerPayment();
  // The ledger says this payment put 400,000 on October, but nothing is recorded there.
  await db.query(`UPDATE public.invoices SET status = 'paid' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  memoryWrites = [];
  r = await call('delete-payment', { paymentId: PAY_ID, deleteReason: 'entered twice' });
  b = await bill();
  console.log(`    delete-payment, nothing recorded on the bill => ${r.status} ; bill ${JSON.stringify(money(b))}`);
  ok('delete-payment, the bill records less than the payment put there: refused, nothing reversed or deleted (T4; round 2 relabelled and deleted)',
     r.status === 409 && !memoryWrites.some((w) => w.table === 'payments' || w.table === 'ledger_entries'), { r: r.body, b: money(b) });
  await calc();
  ok('  the next recalculation still corrects the stale label: issued', (await bill())?.status === 'issued');
  await withHistory(); ledgerPayment();
  await smartPay(150000);
  r = await call('delete-payment', { paymentId: PAY_ID, deleteReason: 'entered twice' });
  await calc(); b = await bill();
  ok('delete-payment when the bill holds only another payment\'s 150,000: refused, and that 150,000 stays (partial)',
     r.status === 409 && b?.status === 'partial' && b?.recorded_payment === 150000, money(b));
  // The bill's own figure is taken off by an admin in Recorded Payment Manager.
  await editRecorded(MONTH, 0); await calc(); b = await bill();
  ok('payment reversed on the bill (recorded_payment 0, status untouched by the screen), recalculated: issued',
     b?.status === 'issued' && b?.recorded_payment === 0 && b?.carry_out_debt === 400000, money(b));

  // ---- edited down, moved to another month
  await withHistory(); await smartPay(400000);
  ok('(paid in full first)', (await bill())?.status === 'paid');
  await editRecorded(MONTH, 100000); await calc(); b = await bill();
  ok('payment EDITED DOWN to 100,000: partial after the recalculation (was: "paid" left behind)',
     b?.status === 'partial' && b?.carry_out_debt === 300000, money(b));
  await editRecorded(MONTH, 0); await calc(); b = await bill();
  ok('payment EDITED DOWN to 0: issued', b?.status === 'issued' && b?.carry_out_debt === 400000, money(b));

  await withHistory(); await smartPay(400000);
  await calc(S1, NOV);                                     // November: no lessons in this fixture, charge 0
  await editRecorded(MONTH, 0); await editRecorded(NOV, 400000);
  fixture.payments = [{ id: PAY_ID, student_id: S1, amount: 400000, method: 'cash', occurred_at: '2026-10-20T10:00:00.000Z' }];
  r = await call('modify-payment', { paymentId: PAY_ID, studentId: S1, amount: 400000, method: 'cash',
    occurredAt: '2026-11-05T10:00:00.000Z', reason: 'belongs to November' });
  b = await bill(); const nov = await bill(S1, NOV);
  console.log(`    moved to November => Oct ${JSON.stringify(money(b))} ; Nov ${JSON.stringify(money(nov))}`);
  ok('payment MOVED to another month, then modify-payment\'s own recalculation of both months: 200', r.status === 200, r.body);
  ok('  October, where it no longer is: issued, 400,000 owed (was: "paid" left behind)',
     b?.status === 'issued' && b?.recorded_payment === 0 && b?.carry_out_debt === 400000, money(b));
  ok('  November, which now carries October\'s debt and the 400,000: paid',
     nov?.status === 'paid' && nov?.carry_in_debt === 400000 && nov?.recorded_payment === 400000 && nov?.carry_out_debt === 0, money(nov));

  // ---- the admin dialogs and the assistant (already this rule), then recalculated
  await withHistory();
  await db.query(`UPDATE public.invoices SET recorded_payment = 400000, status = 'paid' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  await calc();
  ok('RecordPaymentDialog / QuickPay / Batch / ai_action_apply writing "paid" for a full payment: unchanged by the recalculation',
     (await bill())?.status === 'paid');
  await db.query(`UPDATE public.invoices SET recorded_payment = 100000, status = 'partial' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  const resets0 = await statusResets();
  await calc(); await calc();
  ok('  and "partial" for a correction down: unchanged, and the recalculations did not touch the column at all',
     (await bill())?.status === 'partial' && (await statusResets()) === resets0);

  // ---- admin overrides
  await withHistory();
  await db.query(`UPDATE public.invoices SET status = 'credit' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  await calc();
  ok('an admin-set "credit" is not one of the three derived labels and is left alone', (await bill())?.status === 'credit');
  await db.query(`UPDATE public.invoices SET status = 'draft' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  await calc();
  ok('a draft is issued by a calculation', (await bill())?.status === 'issued');

  // ---- bills paid before any of this (labelled "issued" by the old reset)
  await withHistory();
  await editRecorded(MONTH, 400000);
  ok('(a bill paid before the fix: 400,000 recorded, still labelled issued)', (await bill())?.status === 'issued');
  await calc();
  ok('the next ordinary recalculation of that bill labels it paid - no back-fill, no figure moved',
     (await bill())?.status === 'paid' && (await bill())?.recorded_payment === 400000);
}

console.log('\nRound 2 - M-2: calculate-tuition no longer writes recorded_payment');
{
  await reset(); world();
  await calc();
  ok('no save by calculate-tuition mentions recorded_payment (first save and repeat)',
     (await calc()).status === 200 && invoiceWrites.length === 2 && invoiceWrites.every((w) => !('recorded_payment' in w.payload)), invoiceWrites.map((w) => Object.keys(w.payload)));
  ok('  a new bill still starts at 0 (the column default)', (await bill())?.recorded_payment === 0);
  failNextFullUpsert = true; await calc();
  ok('  nor does the fallback save', !('recorded_payment' in invoiceWrites.at(-1).payload), invoiceWrites.at(-1));

  // A payment lands between the calculation's read and its save.
  await reset(); world(); await calc();
  let b = await bill();
  beforeNextUpsert = () => pay(b.id, 400000, 'paid');
  let r = await calc();
  b = await bill();
  console.log(`    payment recorded mid-calculation => ${JSON.stringify(money(b))} (the calculation itself had read ${r.body.payments.monthPayments})`);
  ok('a payment recorded BETWEEN the read and the save survives (was: overwritten with the 0 read at the start)',
     r.status === 200 && r.body.payments.monthPayments === 0 && b?.recorded_payment === 400000, money(b));
  ok('  the carry trigger settles the month from the real payment: nothing owed', b?.carry_out_debt === 0 && b?.carry_out_credit === 0, money(b));
  ok('  and the payment\'s own label stands: the calculation agreed with what it had read, so it wrote no status', b?.status === 'paid', money(b));
  r = await calc();
  ok('  the next calculation reads 400,000 and reports the month settled',
     r.body.payments.monthPayments === 400000 && r.body.carry.carryOutDebt === 0 && (await bill())?.status === 'paid', r.body.carry);

  // The same, on a bill that did not exist at the read.
  await reset(); world();
  beforeNextUpsert = () => db.query(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount,
      recorded_payment, paid_amount, status) VALUES ($1, $2, 0, 0, 0, 200000, 0, 'partial')`, [S1, MONTH]);   // RecordPaymentDialog.tsx:102-114
  r = await calc();
  b = await bill();
  console.log(`    payment creates the bill mid-calculation => ${JSON.stringify(money(b))}`);
  ok('a payment that CREATES the bill between the read and the save survives too (was: overwritten with 0)',
     r.status === 200 && b?.recorded_payment === 200000 && b?.total_amount === 400000 && b?.carry_out_debt === 200000, money(b));
  await calc();
  ok('  its label, written "issued" by the calculation that never saw the payment, is right after the next one: partial',
     (await bill())?.status === 'partial' && (await bill())?.recorded_payment === 200000, money(await bill()));
}

console.log('\nRound 2 - review m-3, m-4');
{
  await reset(); world();
  await calc(); await confirm([(await bill()).id]);
  // Base and discount both move by 100,000; the total does not.
  fixture.classes[0].session_rate_vnd = 125000;
  Object.assign(fixture.enrollments[0], { discount_type: 'amount', discount_value: 100000, discount_cadence: 'monthly' });
  const r = await calc();
  const b = await bill();
  console.log(`    base and discount changed, total the same => ${JSON.stringify(brief(b))} ${JSON.stringify(changedFlag(b)?.details?.current)}`);
  ok('a confirmed bill whose base and discount change while the TOTAL stays 400,000 still goes back to review',
     r.body.baseAmount === 500000 && r.body.totalDiscount === 100000 && r.body.totalAmount === 400000
       && b?.confirmation_status === 'needs_review', brief(b));
  ok('  the flag shows base 400,000 -> 500,000, discount 0 -> 100,000, difference 0',
     changedFlag(b)?.details?.confirmed?.base_amount === 400000 && changedFlag(b)?.details?.current?.base_amount === 500000
       && changedFlag(b)?.details?.confirmed?.discount_amount === 0 && changedFlag(b)?.details?.current?.discount_amount === 100000
       && changedFlag(b)?.details?.difference === 0, changedFlag(b));

  await reset(); world();
  await seedBill(SEP, 400000, 400000, 'paid');
  await calc();
  await pay((await bill()).id, 400000, 'paid');
  const before = await bill();
  invoiceWrites = [];
  failPriorRead = true;
  const r2 = await calc();
  failPriorRead = false;
  console.log(`    the other months cannot be read => ${r2.status} ${JSON.stringify(r2.body)}, writes ${invoiceWrites.length}`);
  ok('the earlier months cannot be read: the call fails (400), nothing is written',
     r2.status === 400 && invoiceWrites.length === 0 && same(await bill(), before), { r2: r2.body, invoiceWrites });
}

console.log('\nRound 2 - carry.payable and siblingUnresolved (T3)');
{
  const unresolved = async () => [{ family_id: FAMILY, status: 'unresolved', winner_student_id: null,
    winner_class_id: null, sibling_percent: 0, reason: 'busy' }];
  // T3 case 4: no bill for the month yet, an earlier month short.
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 100000, 'partial');
  let many = await bulk();
  let row = many.body.results?.[0];
  ok('bulk, no bill row for the month, 300,000 owed from before: payable 700,000 (the browser sum from saved rows said 300,000)',
     row?.totalAmount === 400000 && row?.carry?.carryInDebt === 300000 && row?.carry?.payable === 700000 && row?.invoiceId === null, row);
  let one = await calc();
  ok('  the single function gives the same payable', one.body.carry?.payable === 700000 && one.body.carry?.carryInDebt === 300000, one.body.carry);
  // T3 case 6: the saved total is out of date.
  await reset(); world(); mark(3, 'Excused'); await calc(); mark(3, 'Present');
  many = await bulk(); row = many.body.results?.[0];
  ok('bulk, saved bill out of date (saved 300,000, the register now says 400,000): payable follows the register, 400,000',
     (await bill())?.total_amount === 300000 && row?.totalAmount === 400000 && row?.carry?.payable === 400000, row);
  // Credit larger than the month.
  await reset(); world(); await seedBill(SEP, 400000, 1050000, 'paid');
  many = await bulk(); one = await calc();
  ok('credit of 650,000 carried in: payable is -250,000 in both (not clamped; carry-out credit says the same)',
     many.body.results?.[0]?.carry?.payable === -250000 && one.body.carry?.payable === -250000
       && one.body.carry?.carryOutCredit === 250000, { bulk: many.body.results?.[0]?.carry, single: one.body.carry });
  ok('  payable - month payment = carry-out debt - carry-out credit, in both',
     [one.body, many.body.results[0]].every((x) => x.carry.payable - x.payments.monthPayments === x.carry.carryOutDebt - x.carry.carryOutCredit));
  // Every existing field of the bulk answer is where it was. BROWSER-PRICING
  // added two more at the end (excusedLessons, cancelledLessons), display
  // figures beside the totals; tested in the BROWSER-PRICING section.
  ok('bulk: the existing fields are unchanged; added: carry.payable, siblingUnresolved, then excusedLessons, cancelledLessons at the end',
     same(Object.keys(many.body.results[0]), ['studentId', 'baseAmount', 'totalDiscount', 'totalAmount', 'payments', 'carry',
       'siblingUnresolved', 'breakdown', 'invoiceId', 'invoiceStatus', 'confirmationStatus', 'excusedLessons', 'cancelledLessons'])
       && same(Object.keys(many.body.results[0].carry), ['carryInCredit', 'carryInDebt', 'carryOutCredit', 'carryOutDebt', 'settledInMonth', 'payable']),
     Object.keys(many.body.results[0]));

  // T3 case 14: the family discount is being decided.
  await reset(); world(); inFamilyOf();
  globalThis.__t1Sibling = unresolved;
  many = await bulk(); one = await calc();
  ok('family discount unresolved: bulk now says so per student (siblingUnresolved: true), as the single function does',
     many.body.results?.[0]?.siblingUnresolved === true && one.body.siblingUnresolved === true && one.body.invoiceSaved === false,
     { bulk: many.body.results?.[0], single: one.body.siblingUnresolved });
  ok('  its figures are the provisional ones, unchanged (400,000, no discount)', many.body.results?.[0]?.totalAmount === 400000);
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'assigned', winner_student_id: S1, winner_class_id: CA, sibling_percent: 10, reason: null }];
  many = await bulk();
  ok('resolved (10% on class A): siblingUnresolved false, 360,000, payable 360,000',
     many.body.results?.[0]?.siblingUnresolved === false && many.body.results?.[0]?.totalAmount === 360000 && many.body.results?.[0]?.carry?.payable === 360000,
     many.body.results?.[0]);
  await reset(); world();
  many = await bulk();
  ok('a child in no family: siblingUnresolved false', many.body.results?.[0]?.siblingUnresolved === false);
}

// =====================================================================
// T4 - the payment paths (docs/evidence/T4-payment-paths.md). Every case
// below failed against the functions at 6465f08 (see the evidence file).
// =====================================================================
const t4Lib = join(out, 'invoice-status.t4.mjs');
writeFileSync(t4Lib, (await build({ entryPoints: [join(libDir, 'invoice-status.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
const T4 = await import(pathToFileURL(t4Lib).href);
const settleAs = (type, amount, month = MONTH, extra = {}) =>
  call('settle-bill', { studentId: S1, month, settlementType: type, amount, reason: 'hardship', ...extra });
const reversalOf = (id) => (fixture.ledger_entries || []).filter((e) => String(e.tx_key || '').startsWith(`payment-reversal-${id}-`));
const balances = (legs) => legs.reduce((s, e) => s + Number(e.debit || 0) - Number(e.credit || 0), 0) === 0;
const familyPayments = () => (fixture.payments || []).filter((p) => p.family_id === FAMILY && !p.parent_payment_id);
const delPay = (paymentId) => call('delete-payment', { paymentId, deleteReason: 'entered twice' });

console.log('\nT4 fault 1 - deleting a payment takes it off the bill');
{
  await withHistory();
  let r = await smartPay(400000); await calc();
  const [parent] = familyPayments();
  ok('(setup: a Smart Family Payment of 400,000 paid October)', r.status === 200 && (await bill())?.recorded_payment === 400000 && !!parent, money(await bill()));
  r = await delPay(parent?.id);
  let b = await bill();
  console.log(`    smart-family-payment deleted => ${r.status} ${JSON.stringify(r.body)} ; bill ${JSON.stringify(money(b))}`);
  ok('deleting it takes the 400,000 off October: recorded 0, 400,000 owed, issued (was: the money stayed on the bill)',
     r.status === 200 && b?.recorded_payment === 0 && b?.carry_out_debt === 400000 && b?.status === 'issued', { r: r.body, b: money(b) });
  const rev = reversalOf(parent?.id);
  ok('  both legs of its ledger transaction are reversed and the reversal balances (was: nothing found under "payment-<id>")',
     rev.length === 2 && balances(rev) && rev.some((e) => e.account_id === 'acc-AR' && e.debit === 400000), rev);
  ok('  the payment row is deleted and the deletion recorded',
     memoryWrites.some((w) => w.table === 'payments' && w.op === 'delete') && memoryWrites.some((w) => w.table === 'payment_deletions'));
  await calc();
  ok('  the recalculation agrees', (await bill())?.status === 'issued' && (await bill())?.recorded_payment === 0);
  r = await delPay(parent?.id);
  ok('  asked again (the row was still there): refused, the bill is not lowered twice',
     r.status === 409 && (await bill())?.recorded_payment === 0 && reversalOf(parent?.id).length === 2, { r: r.body, rev: reversalOf(parent?.id).length });

  await withHistory();
  await smartPay(150000); await smartPay(250000); await calc();
  const [first, second] = familyPayments();
  r = await delPay(first?.id); b = await bill();
  ok('two payments on one bill, the first deleted: 250,000 stays, partial',
     r.status === 200 && b?.recorded_payment === 250000 && b?.status === 'partial' && b?.carry_out_debt === 150000, { r: r.body, b: money(b) });
  ok('  the other payment\'s ledger is untouched', reversalOf(second?.id).length === 0);

  // Family Payment (family-payment-<id>-... keys)
  await withHistory();
  r = await familyPay(400000); await calc();
  const [fp] = familyPayments();
  r = await delPay(fp?.id); b = await bill();
  ok('a Family Payment deleted: off the bill too (was: nothing found)', r.status === 200 && b?.recorded_payment === 0 && b?.status === 'issued', { r: r.body, b: money(b) });

  // A legacy single payment, key payment-<id> on one leg, both legs under one tx_id.
  await withHistory();
  await editRecorded(MONTH, 400000); await calc();
  fixture.payments = [{ id: PAY_ID, student_id: S1, parent_payment_id: null, family_id: null, amount: 400000 }];
  fixture.ledger_entries = [
    { id: 'le-1', tx_id: 'tx-legacy', tx_key: `payment-${PAY_ID}`, account_id: 'acc-CASH', debit: 400000, credit: 0, month: MONTH },
    { id: 'le-2', tx_id: 'tx-legacy', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 400000, month: MONTH },
  ];
  r = await delPay(PAY_ID); b = await bill();
  ok('a single payment (key on the cash leg only): its AR leg is found by the transaction, and the bill is lowered (was: unchanged)',
     r.status === 200 && b?.recorded_payment === 0 && reversalOf(PAY_ID).length === 2 && balances(reversalOf(PAY_ID)), { r: r.body, b: money(b), rev: reversalOf(PAY_ID) });

  // Never below what the bill still records.
  await withHistory();
  await smartPay(400000); await editRecorded(MONTH, 100000); await calc();
  const [cut] = familyPayments();
  memoryWrites = [];
  r = await delPay(cut?.id); b = await bill();
  ok('a bill edited down to 100,000 since the 400,000 payment: refused before anything is written (taking 400,000 off could take other money)',
     r.status === 409 && b?.recorded_payment === 100000 && reversalOf(cut?.id).length === 0 && !memoryWrites.some((w) => w.table === 'payments'), { r: r.body, b: money(b) });

  // An admin's credit label stays.
  await withHistory();
  await smartPay(400000);
  await db.query(`UPDATE public.invoices SET status = 'credit' WHERE student_id = $1 AND month = $2`, [S1, MONTH]);
  const [cr] = familyPayments();
  r = await delPay(cr?.id);
  ok('  an admin-set credit label is kept', r.status === 200 && (await bill())?.status === 'credit' && (await bill())?.recorded_payment === 0, money(await bill()));

  // Refusals: a modified payment, a payment with no ledger.
  await withHistory();
  await editRecorded(MONTH, 400000);
  fixture.payments = [
    { id: PAY_ID, student_id: S1, parent_payment_id: null, family_id: null, amount: 400000 },
    { id: 'child-of-modify', student_id: S1, parent_payment_id: PAY_ID, family_id: null, amount: -400000 },
  ];
  fixture.ledger_entries = [
    { id: 'le-1', tx_id: 'tx-a', tx_key: `payment-${PAY_ID}`, account_id: 'acc-CASH', debit: 400000, credit: 0, month: MONTH },
    { id: 'le-2', tx_id: 'tx-a', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 400000, month: MONTH },
  ];
  memoryWrites = [];
  r = await delPay(PAY_ID);
  ok('a payment that modify-payment has changed: refused, nothing reversed or deleted',
     r.status === 409 && (await bill())?.recorded_payment === 400000 && !memoryWrites.some((w) => w.table === 'ledger_entries' || w.table === 'payments'), { r: r.body, memoryWrites });
  fixture.payments = [{ id: PAY_ID, student_id: S1, parent_payment_id: null, family_id: null, amount: 400000 }];
  fixture.ledger_entries = [];
  memoryWrites = [];
  r = await delPay(PAY_ID);
  ok('a payment with no ledger entries: refused (nothing says which bill holds it), nothing deleted',
     r.status === 409 && (await bill())?.recorded_payment === 400000 && !memoryWrites.some((w) => w.table === 'payments'), { r: r.body });
}

console.log('\nT4 fault 2 - Settle Bill (removed, D-23): a write-off recorded before the removal no longer counts (reader removed)');
{
  await withHistory();
  memoryWrites = []; invoiceWrites = [];
  const held = await bill();
  let r = await settleAs('discount', 400000);
  console.log(`    write-off asked of the removed settle-bill => ${r.status} ${JSON.stringify(r.body)}`);
  ok('settle-bill asked for a write-off: 410, nothing written, the bill as it was (was: posted)',
     r.status === 410 && r.body.error === 'Settle bill has been removed' && memoryWrites.length === 0 && invoiceWrites.length === 0
       && same(await bill(), held), r);
  historicWriteOff(400000); await calc();
  let b = await bill();
  ok('a family with a paid September, October unpaid, a 400,000 write-off recorded before the removal: ignored - 400,000 charged and owed',
     b?.total_amount === 400000 && b?.carry_out_debt === 400000 && same(money(b), money(held)), money(b));
  ok('  and it reads issued, as before the write-off', b?.status === 'issued', money(b));
  const one = await calc(); const many = await bulk();
  ok('  neither calculator shows a write-off line, and they agree on 400,000',
     one.body.totalAmount === 400000 && !one.body.discounts?.some((d) => /write-off/i.test(String(d.name)) || d.isSettlement)
       && many.body.results?.[0]?.totalAmount === 400000 && many.body.results?.[0]?.totalDiscount === one.body.totalDiscount,
     { one: one.body.discounts, many: many.body.results?.[0] });

  await reset(); world(); await calc();
  historicWriteOff(100000); await calc(); b = await bill();
  ok('a write-off IN PART is ignored: 400,000 still owed, issued', b?.total_amount === 400000 && b?.carry_out_debt === 400000 && b?.status === 'issued', money(b));
  await editRecorded(MONTH, 300000); await calc(); b = await bill();
  ok('  300,000 paid on it: partial, 100,000 left (the write-off does not make up the rest)', b?.status === 'partial' && b?.carry_out_debt === 100000, money(b));

  await reset(); world();
  await seedBill(SEP, 400000, 100000, 'partial');            // 300,000 owed from September
  await calc();
  historicWriteOff(700000); await calc(); b = await bill();
  ok('a recorded write-off larger than October\'s 400,000 charge is ignored: 400,000 charged, 700,000 owed with September\'s 300,000',
     b?.total_amount === 400000 && b?.carry_out_debt === 700000 && b?.status === 'issued', money(b));

  await reset(); world();
  await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, status, tuition_frozen)
    VALUES ($1, $2, 900000, 90000, 810000, 0, 'issued', true)`, [S1, MONTH]);
  historicWriteOff(100000); await calc();
  ok('a frozen bill keeps its saved charge whatever write-off is recorded for the month', (await bill())?.total_amount === 810000, money(await bill()));

  // Neither kind counts now: the old settle-bill's 'settlement-discount-'
  // (never counted, T4 review M2) and the T4 'settlement-writeoff-' (reader removed).
  const oldStyle = (when) => {
    fixture.settlements = [{ id: 'old-1', student_id: S1, month: MONTH, settlement_type: 'discount', amount: 100000, tx_id: 'tx-old-wo', created_at: when }];
    fixture.ledger_entries = [
      { id: 'lo-1', tx_id: 'tx-old-wo', tx_key: `settlement-discount-${S1}-${MONTH}-1`, account_id: 'acc-DISCOUNT', debit: 100000, credit: 0, month: MONTH },
      { id: 'lo-2', tx_id: 'tx-old-wo', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 100000, month: MONTH },
    ];
  };
  for (const [label, when] of [['made on 7 Oct', '2026-10-07T03:00:00.000Z'], ['made TODAY by the old function, before the deploy', new Date().toISOString()]]) {
    await reset(); world(); oldStyle(when);
    const one = await calc(); const many = await bulk();
    ok(`a write-off posted by the OLD settle-bill (${label}) does not reprice the bill, in either calculator`,
       one.body.totalAmount === 400000 && many.body.results?.[0]?.totalAmount === 400000, { one: one.body.discounts, many: many.body.results?.[0] });
  }
  await reset(); world(); oldStyle('2026-10-07T03:00:00.000Z');
  fixture.ledger_entries[0].tx_key = `settlement-writeoff-${S1}-${MONTH}-1`;
  const counted = await calc(); const countedBulk = await bulk();
  ok('  the same row with the T4 key is ignored too, in both (was: counted, 300,000)',
     counted.body.totalAmount === 400000 && countedBulk.body.results?.[0]?.totalAmount === 400000, { one: counted.body.totalAmount, many: countedBulk.body.results?.[0]?.totalAmount });
  await reset(); world(); oldStyle('2026-10-07T03:00:00.000Z');
  fixture.ledger_entries[0].tx_key = `settlement-writeoff-${S1}-${MONTH}-1`;
  failTables.add('ledger_entries');
  const s2 = await calc(); const m2 = await bulk();
  failTables.delete('ledger_entries');
  ok('  their ledger legs cannot be read: neither calculator reads them any more, both price the month (was: both failed)',
     s2.status === 200 && m2.status === 200 && s2.body.totalAmount === 400000 && m2.body.results?.[0]?.totalAmount === 400000, { s2: s2.body, m2: m2.body });

  await reset(); world(); await calc();
  await confirm([(await bill()).id]);
  const confirmedBill = money(await bill());
  historicWriteOff(100000); await calc(); b = await bill();
  ok('a confirmed bill with a write-off recorded stays confirmed: its figures do not move, no before/after flag (was: back to review)',
     b?.confirmation_status === 'confirmed' && !changedFlag(b) && same(money(b), confirmedBill), brief(b));

  // Voluntary contribution through Settle Bill: removed with it (D-23).
  await reset(); world();
  await seedBill(SEP, 400000, 650000, 'paid'); await calc();
  await editRecorded(MONTH, 400000); await calc();           // a real 250,000 credit
  memoryWrites = []; invoiceWrites = [];
  const credited = await bill();
  r = await settleAs('voluntary_contribution', 250000, MONTH, { consentGiven: true });
  ok('a 250,000 credit offered as a voluntary contribution: 410, nothing written (was: converted to revenue)',
     r.status === 410 && memoryWrites.length === 0 && invoiceWrites.length === 0 && same(await bill(), credited), r);
  r = await settleAs('unapplied_cash', 250000, MONTH);
  ok('  and as unapplied cash: 410, nothing written', r.status === 410 && memoryWrites.length === 0 && invoiceWrites.length === 0, r);

  // The settlements read is gone with the reader: a table that cannot be
  // read no longer matters to either calculator.
  await reset(); world(); await calc();
  const before = money(await bill());
  failTables.add('settlements');
  const s = await calc(); const m = await bulk();
  failTables.delete('settlements');
  ok('the month\'s settlements cannot be read: neither calculator reads them any more, both price the month as before (was: both failed)',
     s.status === 200 && m.status === 200 && s.body.totalAmount === 400000 && m.body.results?.[0]?.totalAmount === 400000
       && same(money(await bill()), before), { s: s.body, m: m.body });
}

console.log('\nT4 fault 5 - nothing left to pay reads paid');
{
  const rows = [
    // recorded, total, base, carry-in debt, carry-in credit, expected
    [400000, 400000, 400000, 0, 0, 'paid'], [399999, 400000, 400000, 0, 0, 'partial'], [0, 400000, 400000, 0, 0, 'issued'],
    [500000, 400000, 400000, 0, 0, 'paid'],
    [400000, 400000, 400000, 300000, 0, 'partial'], [700000, 400000, 400000, 300000, 0, 'paid'],
    [0, 400000, 400000, 0, 400000, 'paid'], [0, 400000, 400000, 0, 650000, 'paid'],      // credit covers the month (was issued)
    [50000, 400000, 400000, 0, 650000, 'paid'],                                          // covered and paid again (was partial)
    [0, 0, 400000, 0, 0, 'paid'],                                                         // a charge written off in full (was issued)
    [0, 0, 0, 0, 0, 'issued'], [0, 0, 0, 0, 100000, 'issued'],                            // no lessons, nothing paid
    [100000, 0, 0, 0, 0, 'paid'], [300000, 0, 0, 300000, 0, 'paid'], [100000, 0, 0, 300000, 0, 'partial'], [0, 0, 0, 300000, 0, 'issued'],
  ];
  const got = rows.map(([r, t, base, d, c]) => T4.invoicePaidLabel({ total_amount: t, base_amount: base, carry_in_debt: d, carry_in_credit: c, recorded_payment: r }));
  ok('the rule, case by case', rows.every((x, i) => got[i] === x[5]), rows.map((x, i) => [x, got[i]]).filter(([x, g]) => g !== x[5]));

  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 800000, 'paid');
  await calc();
  ok('through calculate-tuition: credit carried in covers October, nothing recorded: paid (was issued)', (await bill())?.status === 'paid', money(await bill()));
  await editRecorded(MONTH, 50000); await calc();
  ok('  and paid again on top: paid (was partial)', (await bill())?.status === 'paid' && (await bill())?.carry_out_credit === 50000, money(await bill()));
  await reset(); world();
  await calc(S1, '2026-12');
  ok('  a month with no lessons and nothing paid: still issued', (await bill(S1, '2026-12'))?.status === 'issued');

  // The SQL twin used by ai_action_apply / ai_action_undo.
  const mig = join(repo, 'supabase', 'migrations', '20261113090000_invoice_paid_label.sql');
  let sqlOk = false, sqlErr = null;
  if (existsSync(mig)) {
    try {
      await db.exec(readFileSync(mig, 'utf8'));
      const grid = [];
      for (const r of [0, 1, 100000, 400000, 700000]) for (const pv of [-250000, 0, 1, 400000, 700000]) for (const ch of [0, 400000]) grid.push([r, pv, ch]);
      const says = await Promise.all(grid.map(async ([r, pv, ch]) => (await db.query(
        'SELECT public.invoice_paid_label($1::bigint, $2::bigint, $3::bigint, $3::bigint)::text AS l', [r, pv, ch])).rows[0].l));
      sqlOk = grid.every(([r, pv, ch], i) => T4.paidLabel(r, pv, ch) === says[i]);
      if (!sqlOk) sqlErr = grid.map((g, i) => [g, says[i], T4.paidLabel(...g)]).filter((x) => x[1] !== x[2]);
    } catch (e) { sqlErr = e.message; }
  }
  ok('  public.invoice_paid_label (SQL, for ai_action_apply / undo) agrees with the helper on a grid', sqlOk, sqlErr);
  // A live function that holds neither the old expression nor the new call: stop, change nothing.
  let refused = null, body = null;
  if (existsSync(mig)) {
    await db.exec(`CREATE FUNCTION public.ai_action_undo(p uuid) RETURNS jsonb LANGUAGE sql AS $f$ SELECT '{"someone":"rewrote me"}'::jsonb $f$`);
    try { await db.exec(readFileSync(mig, 'utf8')); } catch (e) { refused = e.message; }
    body = (await db.query(`SELECT prosrc FROM pg_proc WHERE proname = 'ai_action_undo'`)).rows[0]?.prosrc;
    await db.exec('DROP FUNCTION public.ai_action_undo(uuid)');
  }
  ok('  the migration STOPS on a function it does not recognise, and leaves it as it was',
     /expected exactly one label expression/.test(refused ?? '') && /rewrote me/.test(body ?? ''), { refused, body });
}

console.log('\nT4 faults 3 and 4 - the browser writes the label by the same rule (a registered mirror), and nowhere restates it');
{
  const src = (rel) => readFileSync(join(repo, rel), 'utf8');
  const mirror = join(repo, 'src', 'lib', 'invoiceStatus.ts');
  ok('src/lib/invoiceStatus.ts exists and is registered with the lib in mirrors.test.mjs',
     existsSync(mirror) && /\["src\/lib\/invoiceStatus\.ts",\s*"supabase\/functions\/_lib\/invoice-status\.ts"\]/.test(src('scripts/pgtest/mirrors.test.mjs')));
  let same3 = false;
  if (existsSync(mirror)) {
    const f = join(out, 'invoice-status.src.mjs');
    writeFileSync(f, (await build({ entryPoints: [mirror], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
    const S = await import(pathToFileURL(f).href);
    const grid = [];
    for (const r of [0, 1, 400000, 700000]) for (const pv of [-1, 0, 400000]) for (const ch of [0, 1]) grid.push([r, pv, ch]);
    same3 = grid.every((g) => S.paidLabel(...g) === T4.paidLabel(...g));
  }
  ok('  and the browser copy answers as the functions\' copy on a grid', same3);
  const writers = ['RecordPaymentDialog.tsx', 'QuickPayPanel.tsx', 'BatchPaymentDialog.tsx', 'RecordedPaymentManager.tsx', 'PaymentIntegrityRepair.tsx'];
  for (const f of writers) {
    const t = src(`src/components/admin/${f}`);
    ok(`  ${f}: takes the label from @/lib/invoiceStatus and states no rule of its own`,
       /from "@\/lib\/invoiceStatus"/.test(t)
         && !/>=\s*(payable|fp)\s*&&\s*(payable|fp)\s*>\s*0/.test(t)
         && !/(newStatus|status|expectedStatus|correctStatus)\s*=\s*['"](paid|partial|draft|issued)['"]/.test(t)
         && !/paid_amount\s*===\s*0|total_amount\s*-\s*invoice\.paid_amount/.test(t));
  }
  const ism = src('src/components/admin/InvoiceStatusManager.tsx');
  ok('  InvoiceStatusManager offers only what sticks: credit, and "follow the payments" (the rule)',
     /value="credit"/.test(ism) && !/SelectItem value="(draft|issued|partial|paid)"/.test(ism) && /from "@\/lib\/invoiceStatus"/.test(ism));
}

console.log('\nT4 fault 6 - family-payment owes what the month asks for, carry included');
{
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 500000, 'paid');                // 100,000 credit into October
  await calc();
  let r = await familyPay(300000); await calc();
  let b = await bill();
  ok('100,000 credit carried in, 300,000 paid: 300,000 recorded, paid, nothing over (as before)', r.status === 200 && b?.recorded_payment === 300000 && b?.status === 'paid', money(b));
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 500000, 'paid'); await calc();
  memoryWrites = [];
  r = await familyPay(400000);
  ok('100,000 credit carried in, 400,000 offered: refused before anything is written - 100,000 more than is owed and no leftover choice (was: all 400,000 put on the bill)',
     r.status === 400 && (await bill())?.recorded_payment === 0 && !memoryWrites.some((w) => w.table === 'ledger_entries' || w.table === 'payments'), { r: r.body, b: money(await bill()) });

  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 100000, 'partial');             // 300,000 debt into October
  await calc(); await editRecorded(MONTH, 400000); await calc();
  memoryWrites = [];
  r = await familyPay(300000); await calc();
  b = await bill();
  ok('300,000 carried in, October\'s 400,000 already paid: the family\'s 300,000 goes on the bill and settles it (was: 0 applied, a zero allocation row)',
     r.status === 200 && b?.recorded_payment === 700000 && b?.status === 'paid' && b?.carry_out_debt === 0
       && !memoryWrites.some((w) => w.table === 'payment_allocations' && Number(w.value?.allocated_amount) === 0), { r: r.body, b: money(b) });

  await withHistory();
  r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 500000, method: 'Cash',
    occurredAt: '2026-10-20T10:00:00.000Z', allocationMode: 'manual', manualAllocations: [{ studentId: S1, amount: 500000 }] });
  await calc(); b = await bill();
  ok('manual split of 500,000 on a 400,000 bill: the bill records what the ledger records, 500,000, 100,000 credit (was: 400,000 on the bill, 500,000 in the ledger)',
     r.status === 200 && b?.recorded_payment === 500000 && b?.carry_out_credit === 100000, { r: r.body, b: money(b) });
}

console.log('\nT4 fault 7 - a pricing read that fails, fails the calculation');
{
  for (const table of ['referral_bonuses', 'discount_assignments']) {
    await reset(); world(); await calc();
    const before = await bill();
    failTables.add(table); invoiceWrites = [];
    const s = await calc(); const m = await bulk();
    failTables.delete(table);
    ok(`${table} cannot be read: calculate-tuition 400, nothing written (was: priced without them and saved)`,
       s.status === 400 && invoiceWrites.length === 0 && same(await bill(), before), s.body);
    ok(`  calculate-tuition-bulk 400, no results${table === "referral_bonuses" ? " (was: 200, priced without them)" : ""}`, m.status === 400 && !m.body.results, m.body);
  }
}

// =====================================================================
// T4 round 2 (docs/evidence/T4-review.md): two writers on one bill at the
// same moment never lose a payment (R2-m6), and the three mutations the
// review left alive.
// =====================================================================
console.log('\nT4 r2 - two payments on one bill at the same moment: neither is lost');
{
  const writeLib = join(repo, 'src', 'lib', 'recordedPaymentWrite.ts');
  let W = null;
  if (existsSync(writeLib)) {
    const f = join(out, 'recorded-payment-write.src.mjs');
    writeFileSync(f, (await build({ entryPoints: [writeLib], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
    W = await import(pathToFileURL(f).href);
  }
  ok('src/lib/recordedPaymentWrite.ts exists and is registered as a mirror of _lib/recorded-payment-write.ts',
     !!W && /\["src\/lib\/recordedPaymentWrite\.ts",\s*"supabase\/functions\/_lib\/recorded-payment-write\.ts"\]/.test(readFileSync(join(repo, 'scripts/pgtest/mirrors.test.mjs'), 'utf8')));
  const client = globalThis.__t1Client();
  // What a dialog saves: what the screen showed + what was typed, with the rule's label.
  const dialogSave = (row, screenShowed, typed) => W.setRecordedPayment(client, {
    invoiceId: row?.id ?? null, studentId: S1, month: MONTH, expected: screenShowed, next: screenShowed + typed,
    fields: { status: T4.invoicePaidLabel(row ?? { total_amount: 400000, base_amount: 400000 }, screenShowed + typed) },
    newRow: { base_amount: 400000, discount_amount: 0, total_amount: 400000, paid_amount: 0 } });

  if (W) {
    // Two admins, two screens loaded at 0. B saves 200,000 while A is saving 400,000.
    await reset(); world(); await calc();
    let b = await bill();
    beforeNextInvoiceWrite = { mode: 'update', fn: async () => { const rb = await dialogSave(b, 0, 200000); if (!rb.ok) throw new Error('B should have saved'); } };
    let ra = await dialogSave(b, 0, 400000);
    b = await bill();
    ok('dialogs (Record / QuickPay / Batch) and Recorded Payment Manager: A\'s save with the stale 0 writes NOTHING and says so; B\'s 200,000 stands (was: A\'s 400,000 replaced it)',
       ra.ok === false && ra.conflict === true && b?.recorded_payment === 200000, { ra, b: money(b) });
    ra = await dialogSave(b, 200000, 400000); b = await bill();
    ok('  A reloads (200,000) and saves again: 600,000, both payments, label paid', ra.ok && b?.recorded_payment === 600000 && b?.status === 'paid', money(b));
    // No bill yet on either screen: B's payment creates it while A is saving.
    await reset(); world();
    beforeNextInvoiceWrite = { mode: 'insert', fn: async () => { await dialogSave(null, 0, 200000); } };
    ra = await dialogSave(null, 0, 400000); b = await bill();
    ok('  no bill yet: B\'s payment creates it first - A writes nothing, B\'s 200,000 stands (was: A\'s upsert overwrote it)',
       ra.ok === false && b?.recorded_payment === 200000, { ra, b: money(b) });
    const src = (rel) => readFileSync(join(repo, rel), 'utf8');
    for (const f of ['RecordPaymentDialog.tsx', 'QuickPayPanel.tsx', 'BatchPaymentDialog.tsx', 'RecordedPaymentManager.tsx']) {
      const t = src(`src/components/admin/${f}`);
      ok(`  ${f} writes recorded_payment only through setRecordedPayment and handles a conflict`,
         /from "@\/lib\/recordedPaymentWrite"/.test(t) && /setRecordedPayment\(/.test(t) && /conflict/.test(t)
           && !/\.(update|upsert)\(\s*\[?\s*\{[^}]*recorded_payment/.test(t));
    }
  }

  // smart-family-payment: a second Smart Family Payment lands between this one's read and its write.
  await withHistory();
  beforeNextInvoiceWrite = { mode: 'update', fn: async () => { await smartPay(100000); } };
  let r = await smartPay(400000);
  let b = await bill();
  console.log(`    two smart family payments at once => ${r.status} ; bill ${JSON.stringify(money(b))}`);
  ok('smart-family-payment, two at once (100,000 and 400,000): the bill holds 500,000 - neither lost (was: one replaced the other)',
     r.status === 200 && b?.recorded_payment === 500000 && b?.status === 'paid' && b?.carry_out_credit === 100000, { r: r.body, b: money(b) });

  // family-payment: the same, two Family Payments.
  await withHistory();
  const manual = (amount) => call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount, method: 'Cash',
    occurredAt: '2026-10-20T10:00:00.000Z', allocationMode: 'manual', manualAllocations: [{ studentId: S1, amount }] });
  beforeNextInvoiceWrite = { mode: 'update', fn: async () => { await manual(100000); } };
  r = await manual(250000);
  b = await bill();
  ok('family-payment, two at once (100,000 and 250,000): 350,000 recorded, partial (was: one lost)',
     r.status === 200 && b?.recorded_payment === 350000 && b?.status === 'partial', { r: r.body, b: money(b) });

  // delete-payment: a payment lands on the bill while another one is being deleted.
  await withHistory();
  await smartPay(400000);
  const [doomed] = familyPayments();
  beforeNextInvoiceWrite = { mode: 'update', fn: async () => { await db.query(
    'UPDATE public.invoices SET recorded_payment = recorded_payment + 100000 WHERE student_id = $1 AND month = $2', [S1, MONTH]); } };
  r = await delPay(doomed?.id);
  b = await bill();
  ok('delete-payment while a 100,000 payment lands: 400,000 comes off, the 100,000 stays, partial (was: the 100,000 was overwritten)',
     r.status === 200 && b?.recorded_payment === 100000 && b?.status === 'partial', { r: r.body, b: money(b) });

  // settle-bill writes nothing at all now (a 410 stub, D-23): a payment on the bill is untouched.
  await reset(); world(); await calc();
  await editRecorded(MONTH, 100000);
  memoryWrites = []; invoiceWrites = [];
  r = await settleAs('discount', 400000);
  b = await bill();
  ok('settle-bill while a 100,000 payment is on the bill: 410, the payment stays, nothing written',
     r.status === 410 && b?.recorded_payment === 100000 && memoryWrites.length === 0 && invoiceWrites.length === 0, { r: r.body, b: money(b) });

  const fnSrc = (f) => readFileSync(join(repo, 'supabase', 'functions', f, 'index.ts'), 'utf8');
  ok('  smart-family-payment, family-payment, delete-payment write recorded_payment only through addToRecordedPayment / setRecordedPayment',
     ['smart-family-payment', 'family-payment', 'delete-payment'].every((f) => /recorded-payment-write\.ts/.test(fnSrc(f))
       && !/\.update\(\{[^}]*recorded_payment:/.test(fnSrc(f))));
}

console.log('\nT4 r2 - the mutations the review left alive');
{
  // d2: a payment with a leftover deleted. OVERPAYMENT: the leftover now goes
  // on the bill with the allocation (one smart-family- transaction), so the
  // whole payment comes off the bill and its credit with it.
  await withHistory();
  await call('smart-family-payment', { familyId: FAMILY, amount: 500000, method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z',
    month: MONTH, leftoverHandling: 'credit_next_bill' });   // 400,000 owed on October, 100,000 beyond it
  const [p] = familyPayments();
  const legs = (fixture.ledger_entries || []).filter((e) => String(e.tx_key || '').includes(p?.id));
  ok('(setup: a 500,000 Smart Family Payment - all 500,000 on the bill, 100,000 of it carry credit, one smart-family- transaction, no smart-family-credit-)',
     (await bill())?.recorded_payment === 500000 && (await bill())?.carry_out_credit === 100000
       && legs.length === 1 && legs[0].tx_key.startsWith(`smart-family-${p?.id}-`), legs.map((e) => e.tx_key));
  let r = await delPay(p?.id); let b = await bill();
  const rev = reversalOf(p?.id);
  ok('deleting a payment WITH a leftover: all 500,000 off the bill, the credit gone, both legs reversed, balanced',
     r.status === 200 && b?.recorded_payment === 0 && b?.carry_out_credit === 0 && rev.length === 2 && balances(rev), { r: r.body, b: money(b), rev: rev.length });

  // d4: a retry when the bill still holds enough - only "already reversed" can stop it.
  await withHistory();
  await smartPay(400000);
  const [q] = familyPayments();
  r = await delPay(q?.id);
  await editRecorded(MONTH, 400000);                   // another 400,000 recorded since
  memoryWrites = [];
  r = await delPay(q?.id);
  ok('asked again after a success while the bill holds 400,000 of OTHER money: refused as already reversed, nothing written',
     r.status === 409 && /already been reversed/.test(r.body.error) && (await bill())?.recorded_payment === 400000
       && !memoryWrites.some((w) => w.table === 'ledger_entries' || w.table === 'payments'), { r: r.body, b: money(await bill()) });

  // m2: allocation transactions that give no bill amount - refused, not reversed and deleted silently.
  await withHistory();
  await editRecorded(MONTH, 400000);
  fixture.payments = [{ id: PAY_ID, student_id: S1, parent_payment_id: null, family_id: null, amount: 400000 }];
  fixture.ledger_entries = [
    { id: 'le-1', tx_id: 'tx-nm', tx_key: `payment-${PAY_ID}`, account_id: 'acc-CASH', debit: 400000, credit: 0, month: null },
    { id: 'le-2', tx_id: 'tx-nm', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 400000, month: null },
  ];
  memoryWrites = [];
  r = await delPay(PAY_ID);
  ok('a payment whose allocation legs name no month (no bill to take it off): refused, nothing reversed or deleted',
     r.status === 409 && !memoryWrites.some((w) => w.table === 'ledger_entries' || w.table === 'payments'), r.body);

  // h4 is gone by construction, and since the reader's removal there is no
  // write-off filter at all: neither calculator reads settlements or their legs.
  ok('no write-off reader is left: neither calculator reads settlements or ledger legs, nor filters by key or date; neither invoice-status copy exports the filter',
     ['calculate-tuition', 'calculate-tuition-bulk'].every((f) => {
       const t = readFileSync(join(repo, 'supabase', 'functions', f, 'index.ts'), 'utf8');
       return !/settlement-writeoff|settledWriteOff|WRITE_OFF_|["']settlements["']|["']ledger_entries["']/.test(t) && !/gte\(["']created_at/.test(t);
     }) && [join(libDir, 'invoice-status.ts'), join(repo, 'src', 'lib', 'invoiceStatus.ts')].every((p) =>
       !/settledWriteOff|WRITE_OFF_KEY_PREFIX|WRITE_OFF_NAME/.test(readFileSync(p, 'utf8'))));
}

console.log('\nD-23 - voluntary contributions are removed (what happens to money beyond what is owed: OVERPAYMENT, below)');
{
  const noWrites = () => memoryWrites.length === 0 && invoiceWrites.length === 0;
  const legsOf = (prefix) => {
    const ids = new Set((fixture.ledger_entries || []).filter((e) => String(e.tx_key || '').startsWith(prefix)).map((e) => e.tx_id));
    return (fixture.ledger_entries || []).filter((e) => ids.has(e.tx_id));
  };
  const toRevenue = () => (fixture.ledger_entries || []).some((e) => e.account_id === 'acc-REVENUE');
  const PAY = { method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z' };
  const smart = (amount, extra = {}) => call('smart-family-payment', { familyId: FAMILY, amount, month: MONTH, ...PAY, ...extra });
  const family = (amount, extra = {}) => call('family-payment',
    { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount, allocationMode: 'oldest-first', ...PAY, ...extra });

  await withHistory();                                       // October: 400,000 owed
  memoryWrites = []; invoiceWrites = [];
  const held = await bill();
  let r = await smart(500000, { leftoverHandling: 'voluntary_contribution', consentGiven: true });
  console.log(`    smart-family-payment, voluntary_contribution => ${r.status} ${JSON.stringify(r.body)}`);
  ok('Smart Family Payment asked for a voluntary contribution (a tab opened before the removal): 400, says it was removed, nothing written - not even the audit row',
     r.status === 400 && /Voluntary contributions have been removed/.test(r.body.error) && noWrites() && same(await bill(), held), r);
  r = await smart(500000, { leftoverHandling: 'voluntary_contribution', consentGiven: false });
  ok('  without consent too (it used to become unapplied cash without a word): 400, nothing written',
     r.status === 400 && /Voluntary contributions have been removed/.test(r.body.error) && noWrites(), r);
  r = await family(500000, { leftoverHandling: 'voluntary_contribution', consentGiven: true });
  ok('Family Payment asked for a voluntary contribution: 400, says it was removed, nothing written',
     r.status === 400 && /Voluntary contributions have been removed/.test(r.body.error) && noWrites() && same(await bill(), held), r);
  r = await smart(400000, { leftoverHandling: 'something_else' });
  ok('  an option that never existed: refused, nothing written', r.status === 400 && noWrites(), r);

}

// =====================================================================
// OVERPAYMENT (owner's decision, docs/evidence/OVERPAYMENT-credit.md):
// money a family pays beyond what the bills owe goes on a bill of the
// payment month as recorded payment, on the child unapplied cash used to go
// to, so the carry shows it as credit on that child's next bill. It is
// folded into that child's allocation exactly as a Manual split amount
// above what is owed is.
// =====================================================================
console.log('\nOVERPAYMENT - the extra goes on the bill and shows as credit on the next bill');
{
  const PAY = { method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z' };
  const smart = (amount, extra = {}) => call('smart-family-payment', { familyId: FAMILY, amount, month: MONTH, ...PAY, ...extra });
  const family = (amount, extra = {}) => call('family-payment',
    { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount, allocationMode: 'oldest-first', ...PAY, ...extra });
  const CREDIT = { leftoverHandling: 'credit_next_bill' };
  const MONEY_TABLES = ['payments', 'ledger_entries', 'payment_allocations', 'audit_log'];
  const moneyWrites = () => memoryWrites.filter((w) => MONEY_TABLES.includes(w.table));
  const txOf = (prefix) => {
    const ids = new Set((fixture.ledger_entries || []).filter((e) => String(e.tx_key || '').startsWith(prefix)).map((e) => e.tx_id));
    return [...ids].map((id) => (fixture.ledger_entries || []).filter((e) => e.tx_id === id));
  };
  const shape = (legs) => legs.map((e) => ({ account: e.account_id, debit: e.debit, credit: e.credit, month: e.month }))
    .sort((a, b) => (a.account < b.account ? -1 : 1));
  const allocationsOf = (paymentId) => (fixture.payment_allocations || []).filter((a) => a.parent_payment_id === paymentId)
    .map((a) => ({ student: a.student_id, amount: a.allocated_amount }));
  const noCreditLegs = () => !(fixture.ledger_entries || []).some((e) => e.account_id === 'acc-CREDIT' || e.account_id === 'acc-REVENUE'
    || /^(smart-)?family-credit-/.test(String(e.tx_key || '')));
  const nextMonth = async () => {               // November opens with October's carry
    await seedBill(NOV, 400000, 0);
    return bill(S1, NOV);
  };

  // ---- Family Payment, 500,000 against 400,000 owed
  await withHistory();
  let r = await family(500000, CREDIT); await calc();
  let b = await bill();
  const [fp] = familyPayments();
  const ftx = txOf(`family-payment-${fp?.id}-`);
  console.log(`    family-payment, 500,000 against 400,000 owed => ${r.status} ${JSON.stringify(r.body)} ; bill ${JSON.stringify(money(b))}`);
  ok('Family Payment of 500,000 against 400,000 owed: all 500,000 recorded on the October bill (was: 400,000, the rest ledger-only)',
     r.status === 200 && b?.recorded_payment === 500000, { r: r.body, b: money(b) });
  ok('  carry-out credit equals the extra, 100,000; nothing owed',
     b?.carry_out_credit === 100000 && b?.carry_out_debt === 0, money(b));
  ok('  the label is the one rule\'s (paidLabel): paid',
     b?.status === 'paid' && T4.invoicePaidLabel(b) === b?.status, money(b));
  ok('  the response says where the extra went: 100,000 on Child One\'s 2026-10 bill',
     r.body.leftoverAmount === 100000 && r.body.leftoverHandling === 'credit_next_bill'
       && same(r.body.creditOnBill, { studentId: S1, month: MONTH, amount: 100000 }), r.body);
  ok('  ledger: ONE family-payment- transaction, DR cash/bank 500,000 / CR AR 500,000; no unapplied-cash pair, nothing to CREDIT or REVENUE',
     ftx.length === 1 && ftx[0].length === 2 && ftx[0].some((e) => e.account_id === 'acc-AR' && e.credit === 500000 && e.debit === 0)
       && ftx[0].some((e) => ['acc-CASH', 'acc-BANK'].includes(e.account_id) && e.debit === 500000 && e.credit === 0) && noCreditLegs(),
     fixture.ledger_entries);
  ok('  one allocation row of 500,000 for Child One', same(allocationsOf(fp?.id), [{ student: S1, amount: 500000 }]), allocationsOf(fp?.id));
  let nov = await nextMonth();
  ok('  November opens with 100,000 carry-in credit: its payable is 300,000 on a 400,000 charge (reduced by the extra)',
     nov?.carry_in_credit === 100000 && T4.monthPayable(nov) === 300000 && nov?.carry_out_debt === 300000, money(nov));
  const viaLeftover = { bill: money(b), legs: shape(ftx[0] || []), allocations: allocationsOf(fp?.id).map((a) => a.amount) };

  // ---- the same money as a Manual split: the leftover path writes exactly what it writes
  await withHistory();
  r = await family(500000, { allocationMode: 'manual', manualAllocations: [{ studentId: S1, amount: 500000 }] }); await calc();
  const [mp] = familyPayments();
  const viaManual = { bill: money(await bill()), legs: shape(txOf(`family-payment-${mp?.id}-`)[0] || []), allocations: allocationsOf(mp?.id).map((a) => a.amount) };
  ok('  the bill, the ledger pair and the allocation are exactly what a Manual split of 500,000 writes',
     r.status === 200 && same(viaLeftover, viaManual), { viaLeftover, viaManual });

  // ---- Smart Family Payment, 500,000 against 400,000 owed
  await withHistory();
  r = await smart(500000, CREDIT); await calc();
  b = await bill();
  const [sp] = familyPayments();
  const stx = txOf(`smart-family-${sp?.id}-`);
  console.log(`    smart-family-payment, 500,000 against 400,000 owed => ${r.status} ; bill ${JSON.stringify(money(b))}`);
  ok('Smart Family Payment of 500,000 against 400,000 owed: 500,000 recorded, carry-out credit 100,000, label paid by the rule',
     r.status === 200 && b?.recorded_payment === 500000 && b?.carry_out_credit === 100000 && b?.status === 'paid' && T4.invoicePaidLabel(b) === 'paid',
     { r: r.body, b: money(b) });
  ok('  the response: leftover credit_next_bill, 100,000, on Child One',
     r.body.leftover?.type === 'credit_next_bill' && r.body.leftover?.amount === 100000 && r.body.leftover?.studentId === S1
       && r.body.allocations?.[0]?.creditOnBill === 100000, r.body);
  ok('  ledger: ONE smart-family- transaction of 500,000 (DR cash / CR AR), one allocation of 500,000, no unapplied-cash pair',
     stx.length === 1 && stx[0].length === 2 && stx[0].some((e) => e.account_id === 'acc-AR' && e.credit === 500000)
       && stx[0].some((e) => e.account_id === 'acc-CASH' && e.debit === 500000) && noCreditLegs()
       && same(allocationsOf(sp?.id), [{ student: S1, amount: 500000 }]), { legs: fixture.ledger_entries, alloc: allocationsOf(sp?.id) });
  nov = await nextMonth();
  ok('  November\'s payable is reduced by the extra: 300,000', nov?.carry_in_credit === 100000 && T4.monthPayable(nov) === 300000, money(nov));

  // ---- nothing owed at all: the whole payment is credit
  await withHistory();
  await editRecorded(MONTH, 400000); await calc();
  r = await family(150000, CREDIT);
  b = await bill();
  ok('nothing owed, 150,000 paid: all of it on the bill, 150,000 carry-out credit, still paid',
     r.status === 200 && b?.recorded_payment === 550000 && b?.carry_out_credit === 150000 && b?.status === 'paid', { r: r.body, b: money(b) });

  // ---- a concurrent payment on the same bill (compare-and-set) loses nothing
  await withHistory();
  beforeNextInvoiceWrite = { mode: 'update', fn: async () => {
    await family(100000, { allocationMode: 'manual', manualAllocations: [{ studentId: S1, amount: 100000 }] }); } };
  r = await family(500000, CREDIT);
  b = await bill();
  ok('Family Payment with an extra while a 100,000 payment lands on the same bill: 600,000 recorded, 200,000 credit - neither lost',
     r.status === 200 && b?.recorded_payment === 600000 && b?.carry_out_credit === 200000 && b?.status === 'paid', { r: r.body, b: money(b) });
  await withHistory();
  beforeNextInvoiceWrite = { mode: 'update', fn: async () => { await smartPay(100000); } };
  r = await smart(500000, CREDIT);
  b = await bill();
  ok('Smart Family Payment with an extra while another lands: 600,000 recorded, 200,000 credit - neither lost',
     r.status === 200 && b?.recorded_payment === 600000 && b?.carry_out_credit === 200000, { r: r.body, b: money(b) });

  // ---- refusals: before anything is written
  await withHistory();
  memoryWrites = []; invoiceWrites = [];
  let held = await bill();
  r = await family(500000, { leftoverHandling: 'unapplied_cash' });
  ok('a screen opened before this change (sends unapplied_cash) with an extra: Family Payment 400, says it is credit now, nothing written',
     r.status === 400 && /no longer kept as unapplied cash/.test(r.body.error) && memoryWrites.length === 0 && invoiceWrites.length === 0 && same(await bill(), held), r);
  r = await smart(500000, { leftoverHandling: 'unapplied_cash' });
  ok('  Smart Family Payment the same: 400, no payment, ledger, allocation or audit row, the bill\'s money unchanged',
     r.status === 400 && /no longer kept as unapplied cash/.test(r.body.error) && moneyWrites().length === 0
       && (await bill())?.recorded_payment === held.recorded_payment, { r, w: moneyWrites() });
  r = await smart(500000);
  ok('  an extra the screen did not show (no leftoverHandling): Smart Family Payment 400, nothing written (was: unapplied cash without a word)',
     r.status === 400 && /did not say where it goes/.test(r.body.error) && moneyWrites().length === 0, { r, w: moneyWrites() });
  r = await family(500000);
  ok('  and Family Payment: 400, nothing written', r.status === 400 && /Nothing was recorded/.test(r.body.error) && moneyWrites().length === 0, r);
  r = await family(400000, { leftoverHandling: 'unapplied_cash' });
  ok('  the old value with NO extra (an old Batch tab paying the debt exactly) still pays: 400,000, paid',
     r.status === 200 && (await bill())?.recorded_payment === 400000 && (await bill())?.status === 'paid', r.body);

  // No bill for the child the extra goes to (Family Payment's first selected student).
  await withHistory();
  memoryWrites = []; invoiceWrites = [];
  r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S2, S1], amount: 500000,
    allocationMode: 'oldest-first', ...PAY, ...CREDIT });
  ok('the first selected student has no 2026-10 bill: refused, says so, nothing written - no bill is made up to hold the money',
     r.status === 400 && /no bill for 2026-10/.test(r.body.error) && memoryWrites.length === 0 && invoiceWrites.length === 0
       && !(await bill(S2)), r.body);

  // A sibling whose balance cannot be worked out may owe part of the extra.
  await withHistory();
  fixture.students.push({ id: S2, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null }, full_name: 'Child Two', is_active: true });
  const realCalc = handlers['calculate-tuition'];
  handlers['calculate-tuition'] = async (req) => {
    const body = await req.clone().json();
    return body.studentId === S2 ? new Response(JSON.stringify({ error: 'synthetic failure' }), { status: 400 }) : realCalc(req);
  };
  memoryWrites = [];
  try { r = await smart(500000, CREDIT); } finally { handlers['calculate-tuition'] = realCalc; }
  ok('Smart Family Payment with an extra while one child\'s balance cannot be worked out: refused, nothing written (was: the extra parked as unapplied cash)',
     r.status === 400 && /could not be worked out/.test(r.body.error) && moneyWrites().length === 0 && (await bill())?.recorded_payment === 0, { r, w: moneyWrites() });

  // Ledger accounts missing: the bill is never written ahead of its ledger pair.
  await withHistory();
  fixture.ledger_accounts = [];
  r = await smart(500000, CREDIT);
  ok('a child with no ledger accounts: fails loudly and the bill is not changed (an insert with no account used to go unnoticed)',
     r.status === 400 && /ledger accounts are missing/.test(r.body.error) && (await bill())?.recorded_payment === 0, r.body);

  // Past unapplied-cash rows stay exactly as they are.
  await withHistory();
  const OLD = '88888888-8888-4888-8888-888888888888';
  fixture.ledger_entries = [
    { id: 'old-1', tx_id: 'tx-old', tx_key: `smart-family-credit-${OLD}-1`, account_id: 'acc-AR', debit: 100000, credit: 0, month: SEP },
    { id: 'old-2', tx_id: 'tx-old', tx_key: null, account_id: 'acc-CREDIT', debit: 0, credit: 100000, month: SEP }];
  const before = JSON.stringify(fixture.ledger_entries.map(({ ledger_accounts, ...e }) => e));
  memoryWrites = [];
  r = await smart(500000, CREDIT);
  const after = JSON.stringify(fixture.ledger_entries.filter((e) => e.tx_id === 'tx-old').map(({ ledger_accounts, ...e }) => e));
  ok('an unapplied-cash pair from before stays exactly as it was: not read onto a bill, not changed, not deleted',
     r.status === 200 && after === before && !memoryWrites.some((w) => w.table === 'ledger_entries' && w.op !== 'insert')
       && (await bill())?.recorded_payment === 500000 && (await bill(S1, SEP))?.recorded_payment === 400000, { r: r.body, after });
}

// =====================================================================
// OVERPAYMENT review (docs/evidence/OVERPAYMENT-review.md): N1 pro-rata
// rounding, N2 Manual-split wording, N3 an old-style payment deleted, N5
// the cash account. Families of two and three priced children.
// =====================================================================
console.log('\nOVERPAYMENT review fixes - rounding, Manual split wording, old payments, the cash account');
{
  const S3 = '33333333-3333-4333-8333-333333333333';
  await db.query('INSERT INTO public.students VALUES ($1) ON CONFLICT DO NOTHING', [S3]);
  const PAY = { method: 'Cash', occurredAt: '2026-10-20T10:00:00.000Z' };
  const allocSum = (pid) => (fixture.payment_allocations || []).filter((a) => a.parent_payment_id === pid).reduce((s, a) => s + a.allocated_amount, 0);
  const legsOfPayment = (pid) => (fixture.ledger_entries || []).filter((e) => {
    const tx = (fixture.ledger_entries || []).find((k) => k.tx_id === e.tx_id && String(k.tx_key || '').includes(pid) && !String(k.tx_key).startsWith('payment-reversal-'));
    return !!tx;
  });
  /** Child One plus Child Two (and Three), each in Class A with four Present October lessons: 400,000 owed each. */
  async function siblings(n) {
    await withHistory();
    const kids = [[S2, 'Child Two', 'b'], [S3, 'Child Three', 'c']].slice(0, n - 1);
    for (const [id, name, tag] of kids) {
      fixture.students.push({ id, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null }, full_name: name, is_active: true });
      fixture.enrollments.push({ ...fixture.enrollments[0], student_id: id });
      for (const s of fixture.sessions) fixture.attendance.push({ session_id: s.id, student_id: id, status: 'Present' });
      for (const code of ['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT', 'DISCOUNT']) fixture.ledger_accounts.push({ id: `acc${tag}-${code}`, student_id: id, code });
      await calc(id);
    }
  }
  const proRata = (amount, extra = {}) => call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2, S3], amount,
    allocationMode: 'pro-rata', ...PAY, ...extra });
  const bills3 = async () => [await bill(S1), await bill(S2), await bill(S3)];
  const sumRec = (bs) => bs.reduce((s, b) => s + Number(b?.recorded_payment || 0), 0);
  const sumCredit = (bs) => bs.reduce((s, b) => s + Number(b?.carry_out_credit || 0), 0);

  // ---- N1: pro-rata rounding is never "beyond what the bills owe"
  await siblings(3);
  let r = await proRata(1000000);
  let bs = await bills3();
  console.log(`    pro-rata 1,000,000 over three owing 400,000 => ${r.status} ${JSON.stringify(r.body)} ; recorded ${bs.map((b) => b?.recorded_payment)}`);
  ok('N1 pro-rata 1,000,000 over three children owing 400,000 each, no leftover instruction: accepted (was: refused, "1 is more than the selected bills owe")',
     r.status === 200, r.body);
  ok('  all 1,000,000 on the three bills, no credit anywhere, 200,000 still owed in total',
     sumRec(bs) === 1000000 && sumCredit(bs) === 0 && bs.reduce((s, b) => s + b.carry_out_debt, 0) === 200000, bs.map(money));
  ok('  nothing reported as left over or as credit (was: 1 VND "kept on the bill as credit")',
     r.body.leftoverAmount === 0 && r.body.creditOnBill === null && !(fixture.ledger_entries || []).some((e) => /beyond what/.test(String(e.memo || ''))), r.body);
  const [p1] = familyPayments();
  ok('  payment = allocations = 1,000,000', p1?.amount === 1000000 && allocSum(p1?.id) === 1000000, allocSum(p1?.id));

  await siblings(3);
  memoryWrites = [];
  r = await proRata(1000000, { leftoverHandling: 'unapplied_cash' });
  bs = await bills3();
  ok('  the same from a screen opened before the change (sends unapplied_cash): pays, all 1,000,000 on bills (was: refused as if it overpaid)',
     r.status === 200 && sumRec(bs) === 1000000 && sumCredit(bs) === 0, { r: r.body, bs: bs.map(money) });

  await siblings(3);
  r = await proRata(1200000);
  bs = await bills3();
  ok('N1 pro-rata 1,200,000 over three owing 400,000 each (exact): accepted with no instruction, each bill 400,000 and paid, no credit, nothing left over',
     r.status === 200 && bs.every((b) => b?.recorded_payment === 400000 && b?.status === 'paid' && b?.carry_out_credit === 0)
       && r.body.leftoverAmount === 0 && r.body.creditOnBill === null, { r: r.body, bs: bs.map(money) });

  await siblings(3);
  r = await proRata(1300000, { leftoverHandling: 'credit_next_bill' });
  bs = await bills3();
  ok('  pro-rata 1,300,000 (100,000 more than all three owe): each owed bill paid, exactly 100,000 credit on Child One\'s bill',
     r.status === 200 && sumRec(bs) === 1300000 && bs[0]?.carry_out_credit === 100000 && bs[1]?.carry_out_credit === 0 && bs[2]?.carry_out_credit === 0
       && r.body.leftoverAmount === 100000 && r.body.creditOnBill?.amount === 100000, { r: r.body, bs: bs.map(money) });

  // ---- N2: Manual split - money not split out is credit only beyond what that child owes
  await siblings(2);
  r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2], amount: 900000, allocationMode: 'manual',
    manualAllocations: [{ studentId: S1, amount: 0 }, { studentId: S2, amount: 450000 }], ...PAY, leftoverHandling: 'credit_next_bill' });
  const b1 = await bill(S1), b2 = await bill(S2);
  ok('N2 Manual 0 / 450,000 of 900,000: the 450,000 not split out goes on Child One\'s bill - 400,000 pays what they owe, 50,000 is credit',
     r.status === 200 && b1?.recorded_payment === 450000 && b1?.carry_out_credit === 50000 && b2?.recorded_payment === 450000 && b2?.carry_out_credit === 50000,
     { b1: money(b1), b2: money(b2) });
  ok('  the response says 450,000 was not split out and only 50,000 of it is credit (was: all 450,000 "credit on the bill")',
     r.body.leftoverAmount === 450000 && r.body.creditOnBill?.amount === 50000 && r.body.creditOnBill?.studentId === S1, r.body);
  const memo = (fixture.ledger_entries || []).find((e) => e.debit === 450000 && /not split out/.test(String(e.memo || '')))?.memo || '';
  ok('  and so does the ledger memo', /450000 not split out/.test(memo) && /50000 of it beyond what the bill owes/.test(memo), memo);
  await siblings(2);
  r = await call('family-payment', { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1, S2], amount: 600000, allocationMode: 'manual',
    manualAllocations: [{ studentId: S1, amount: 0 }, { studentId: S2, amount: 400000 }], ...PAY, leftoverHandling: 'credit_next_bill' });
  ok('  Manual with 200,000 not split out against 400,000 owed: on Child One\'s bill, no credit, and none reported',
     r.status === 200 && (await bill(S1))?.recorded_payment === 200000 && (await bill(S1))?.carry_out_credit === 0
       && r.body.leftoverAmount === 200000 && r.body.creditOnBill === null, r.body);

  // ---- N3 (the reviewer's P6): a payment made BEFORE this change - allocation + unapplied-cash pair - is deleted whole
  for (const [alloc, credit] of [['smart-family', 'smart-family-credit'], ['family-payment', 'family-credit']]) {
    await withHistory();
    const OLDP = '77777777-7777-4777-8777-777777777777';
    fixture.payments.push({ id: OLDP, student_id: S1, amount: 500000, method: 'Cash', family_id: FAMILY, parent_payment_id: null });
    fixture.payment_allocations = [{ parent_payment_id: OLDP, student_id: S1, allocated_amount: 400000, allocation_order: 1 }];
    fixture.ledger_entries.push(
      { id: 'o1', tx_id: 'tx-oa', tx_key: `${alloc}-${OLDP}-${S1}-1`, account_id: 'acc-CASH', debit: 400000, credit: 0, month: MONTH },
      { id: 'o2', tx_id: 'tx-oa', tx_key: null, account_id: 'acc-AR', debit: 0, credit: 400000, month: MONTH },
      { id: 'o3', tx_id: 'tx-ol', tx_key: `${credit}-${OLDP}-1`, account_id: 'acc-AR', debit: 100000, credit: 0, month: MONTH },
      { id: 'o4', tx_id: 'tx-ol', tx_key: null, account_id: 'acc-CREDIT', debit: 0, credit: 100000, month: MONTH });
    await editRecorded(MONTH, 400000); await calc();
    const d = await delPay(OLDP);
    const b = await bill();
    const rev = reversalOf(OLDP);
    ok(`N3 an OLD payment (400,000 allocation + 100,000 ${credit}- pair) deleted: 400,000 off the bill, all 4 legs reversed incl. the CREDIT leg, balanced`,
       d.status === 200 && b?.recorded_payment === 0 && rev.length === 4 && balances(rev)
         && rev.some((e) => e.account_id === 'acc-CREDIT' && e.debit === 100000) && rev.some((e) => e.account_id === 'acc-CASH' && e.credit === 400000),
       { d: d.body, b: money(b), rev });
  }

  // ---- N5: a cash payment debits CASH, however the method is spelled
  for (const fn of ['family-payment', 'smart-family-payment']) {
    for (const [method, account] of [['Cash', 'acc-CASH'], ['cash', 'acc-CASH'], ['CASH', 'acc-CASH'], ['Bank Transfer', 'acc-BANK'], ['Card', 'acc-BANK']]) {
      await withHistory();
      const body = fn === 'family-payment'
        ? { month: MONTH, familyId: FAMILY, selectedStudentIds: [S1], amount: 400000, allocationMode: 'oldest-first', method, occurredAt: PAY.occurredAt }
        : { familyId: FAMILY, amount: 400000, month: MONTH, method, occurredAt: PAY.occurredAt };
      r = await call(fn, body);
      const [p] = familyPayments();
      const legs = legsOfPayment(p?.id);
      ok(`N5 ${fn}, method '${method}': the 400,000 debit is on ${account.slice(4)}${fn === 'family-payment' && method === 'Cash' ? " (was: BANK - 'Cash' did not equal 'cash')" : ''}`,
         r.status === 200 && legs.some((e) => e.account_id === account && e.debit === 400000)
           && !legs.some((e) => e.debit > 0 && e.account_id !== account), legs.map((e) => [e.account_id, e.debit, e.credit]));
    }
  }
}

console.log('\nT4 - scripts/CHECK-payment-paths.sql counts what each fault touches, aggregates only, and writes nothing');
{
  const sql = readFileSync(join(repo, 'scripts', 'CHECK-payment-paths.sql'), 'utf8');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').replace(/'[^']*'/g, "''");
  ok('the file is SELECT / WITH statements only',
     !/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|call|do)\b/i.test(code)
       && code.split(';').filter((s) => s.trim()).every((s) => /^\s*(select|with)\b/i.test(s)));
  // The tables it reads besides invoices, as the payment functions shape them.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid, snapshot jsonb, deleted_at timestamptz DEFAULT now());
    CREATE TABLE IF NOT EXISTS public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, family_id uuid, parent_payment_id uuid, amount integer);
    CREATE TABLE IF NOT EXISTS public.ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid, tx_key text, debit integer DEFAULT 0, credit integer DEFAULT 0, month text);
    CREATE TABLE IF NOT EXISTS public.settlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, month text, settlement_type text, amount integer, tx_id uuid, created_at timestamptz DEFAULT now());
    CREATE TABLE IF NOT EXISTS public.referral_bonuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, effective_from date, effective_to date);
  `);
  await reset(); world(); inFamilyOf();
  await seedBill(SEP, 400000, 400000, 'paid'); await calc();                 // October: a real debt the old formula calls 0
  await db.exec(`
    INSERT INTO public.payment_deletions (payment_id, snapshot) VALUES (gen_random_uuid(), '{"payment_data":{"family_id":"${FAMILY}","amount":150000}}');
    INSERT INTO public.ledger_entries (tx_id, tx_key, debit, credit) VALUES ('00000000-0000-4000-8000-00000000aaaa', 'payment-reversal-x-1', 150000, 0);
    INSERT INTO public.settlements (student_id, month, settlement_type, amount, created_at) VALUES ('${S1}', '${MONTH}', 'discount', 100000, '2026-10-07');
    INSERT INTO public.referral_bonuses (student_id, effective_from) VALUES ('${S1}', '2026-01-01');
  `);
  const counts = async () => (await db.query(
    `SELECT (SELECT md5(string_agg(t::text, '|' ORDER BY id)) FROM public.invoices t) h, (SELECT count(*) FROM public.audit_log)::int a`)).rows[0];
  const before = await counts();
  let res = null, err = null;
  try { res = await db.exec(sql); } catch (e) { err = e.message; }
  ok('all eight statements run', err === null && res?.length === 8, err ?? res?.length);
  const row = (i) => res?.[i]?.rows?.[0] ?? {};
  ok('1: the deleted family payment and the one-legged reversal are counted',
     Number(row(0).family_payments_deleted) === 1 && Number(row(0).family_payments_deleted_vnd) === 150000 && Number(row(0).unbalanced_reversals) === 1, row(0));
  ok('2: the October debt the old settle-bill formula called 0 is counted', Number(row(1).real_debt_refused) >= 1, row(1));
  ok('2b: the old write-off is listed, and does not count on a bill after T4',
     res?.[2]?.rows?.[0]?.settlement_type === 'discount' && Number(res?.[2]?.rows?.[0]?.counts_on_bill_after_t4) === 0, res?.[2]?.rows);
  ok('3: stored label -> T4 label pairs are listed', (res?.[3]?.rows ?? []).length >= 1, res?.[3]?.rows);
  ok('7: the referral bonus is counted', Number(row(7).referral_bonuses) === 1, row(7));
  ok('no column carries a name or an id', res.every((x) => x.fields.every((f) => !/name|(^|_)id$/i.test(f.name))), res.map((x) => x.fields.map((f) => f.name)));
  ok('running it changed nothing', same(await counts(), before));
}

// ================================================== the owner's check SQL
console.log('\nscripts/CHECK-invoice-status-resets.sql finds bills the old behaviour reset, and writes nothing');
{
  const sql = readFileSync(join(repo, 'scripts', 'CHECK-invoice-status-resets.sql'), 'utf8');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').replace(/'[^']*'/g, "''");
  ok('the file is SELECT statements only',
     !/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|call|do)\b/i.test(code)
       && code.split(';').filter((s) => s.trim()).every((s) => /^\s*select\b/i.test(s)));
  await reset(); world();
  await calc();
  const b = await bill();
  await confirm([b.id]);
  await pay(b.id, 400000, 'paid');
  // What calculate-tuition did before T1, written the way it wrote it
  // (service role, so no actor): labels reset, figures untouched...
  await db.query(`UPDATE public.invoices SET confirmation_status = 'auto_approved', status = 'issued' WHERE id = $1`, [b.id]);
  // ...and what it saved when the read of the bill failed.
  await db.query(`UPDATE public.invoices SET recorded_payment = 0 WHERE id = $1`, [b.id]);
  await db.query(`UPDATE public.invoices SET recorded_payment = 400000 WHERE id = $1`, [b.id]);
  const counts = async () => (await db.query(
    `SELECT (SELECT count(*) FROM public.invoices)::int i, (SELECT count(*) FROM public.audit_log)::int a,
            (SELECT md5(string_agg(t::text, '|' ORDER BY id)) FROM public.invoices t) h`)).rows[0];
  const before = await counts();
  let res = null, err = null;
  try { res = await db.exec(sql); } catch (e) { err = e.message; }
  ok('all eleven statements run', err === null && res?.length === 11, err ?? res?.length);
  const r = (i) => res?.[i]?.rows ?? [];
  ok('0: the audit columns and the invoices audit trigger are reported present',
     Number(r(0)[0]?.audit_columns_present_of_2) === 2 && Number(r(0)[0]?.invoices_audit_trigger) === 1, r(0));
  ok('1: one bill confirmed then reset, one with a payment but "issued"',
     Number(r(1)[0]?.confirmed_then_reset) === 1 && Number(r(1)[0]?.payment_but_issued) === 1 && Number(r(1)[0]?.both) === 1, r(1));
  ok('1b: the same per month', r(2)[0]?.month === MONTH && Number(r(2)[0]?.confirmed_then_reset) === 1, r(2));
  ok('2 and 3: that bill, by id and month', r(3)[0]?.invoice_id === b.id && r(3)[0]?.month === MONTH && r(4)[0]?.invoice_id === b.id
     && r(4)[0]?.would_be_by_month_rule === 'paid', { two: r(3), three: r(4) });
  ok('4: the audit trail shows the reset, with no figure change',
     Number(r(5)[0]?.resets) === 1 && Number(r(5)[0]?.resets_with_no_figure_change) === 1
       && r(6)[0]?.invoice_id === b.id && r(6)[0]?.was === 'confirmed' && r(6)[0]?.figures_changed_in_that_save === false, { c: r(5), rows: r(6) });
  ok('5: and paid -> issued by the service role', Number(r(7)[0]?.resets) === 1 && r(8)[0]?.was === 'paid', { c: r(7), rows: r(8) });
  ok('6: and the payment that was lowered to 0 (400,000)',
     Number(r(9)[0]?.times) === 1 && Number(r(9)[0]?.total_lowered_vnd) === 400000 && Number(r(10)[0]?.recorded_before) === 400000, { c: r(9), rows: r(10) });
  ok('no row selected carries a name', res.every((x) => x.fields.every((f) => !/name/i.test(f.name))));
  ok('running it changed nothing (invoices and audit_log identical)', same(await counts(), before));

  // A healthy database: after the fix, the same file reports nothing.
  await reset(); world();
  await calc(); const h = await bill();
  await confirm([h.id]); await pay(h.id, 400000, 'paid');
  await calc(); mark(0, 'Excused'); await calc(); await confirm([h.id]); await calc();
  res = await db.exec(sql);
  ok('after the fix a confirmed, paid, recalculated and re-confirmed bill appears in none of them',
     Number(res[1].rows[0].confirmed_then_reset) === 0 && Number(res[1].rows[0].payment_but_issued) === 0
       && res[3].rows.length === 0 && res[4].rows.length === 0 && Number(res[7].rows[0].resets) === 0 && Number(res[9].rows[0].times) === 0,
     { one: res[1].rows, four: res[5].rows, six: res[9].rows });
  ok('  its honest move to needs_review (figures changed) is the only thing query 4 lists',
     Number(res[5].rows[0].resets) === 1 && res[6].rows[0]?.figures_changed_in_that_save === true
       && res[6].rows[0]?.confirmation_today === 'confirmed', res[6].rows);
}

// ============================================ the figures have not moved
// ======================================================= BROWSER-PRICING
// calculate-tuition-bulk reports, beside the totals, the lessons a student is
// not charged for (excusedLessons, cancelledLessons), each with what it would
// have added to the month. The Reports tab (Lost Tuition, Excused Absences)
// and the Finance tab (Excused Loss) read them through src/lib/lostLessonsView.ts;
// the student Tuition tab reads calculate-tuition's sibling line and
// carry.payable through src/lib/tuitionFigures.ts. Those screens used to
// price these themselves (classes.session_rate_vnd x marks; amount x percent;
// a sum of the carry fields). No total moves: checked against calculate-tuition
// here, and by the golden section below, which runs after this one.
console.log('\nBROWSER-PRICING: the lessons not charged, as calculate-tuition-bulk reports them, and the screens that read them');
{
  const lib = async (rel) => {
    const b = await build({ entryPoints: [resolve(repo, rel)], bundle: true, format: 'esm', platform: 'node', write: false });
    const f = join(out, `${rel.replace(/[\\/.]/g, '_')}.mjs`);
    writeFileSync(f, b.outputFiles[0].text);
    return import(pathToFileURL(f).href);
  };
  const LL = await lib('src/lib/lostLessonsView.ts');
  const TF = await lib('src/lib/tuitionFigures.ts');
  const list = (r, k) => (Array.isArray(r?.[k]) ? r[k].map((l) => `${l.session_id}|${l.date}|${l.class_id === CA ? 'A' : l.class_id}|${l.rate_vnd}`).join(',') : r?.[k]);
  const sameTotals = (a, b) => a.baseAmount === b.baseAmount && a.totalDiscount === b.totalDiscount && a.totalAmount === b.totalAmount;
  const rows = [];   // before / after, printed at the end
  /** The register as the old screens priced it: every Excused mark / every enrolled head at the class's fee of today. */
  const oldExcused = () => fixture.attendance.filter((a) => a.status === 'Excused').length * fixture.classes[0].session_rate_vnd;
  const oldCancelled = () => fixture.sessions.filter((s) => s.status === 'Canceled').length * fixture.enrollments.length * fixture.classes[0].session_rate_vnd;

  // 1. The golden fixture "Excused, Late, Absent and a Canceled lesson".
  const register = () => { world(); mark(0, 'Excused'); mark(1, 'Late'); mark(2, 'Absent'); fixture.sessions[3].status = 'Canceled'; };
  await reset(); register();
  let single = await calc(), b = await bulk(), r = b.body.results?.[0];
  ok('register fixture: bulk 200; base, discount and total equal calculate-tuition (the new fields move no amount)',
     b.status === 200 && single.status === 200 && sameTotals(r, single.body), { bulk: r, single: single.body.totalAmount });
  ok('  excusedLessons = the one Excused lesson, at what it would have charged (100,000)',
     list(r, 'excusedLessons') === 's0|2026-10-07|A|100000', r?.excusedLessons);
  ok('  cancelledLessons = the one Canceled lesson, the student enrolled on its date (100,000)',
     list(r, 'cancelledLessons') === 's3|2026-10-28|A|100000', r?.cancelledLessons);
  ok('  Late and Absent are charged, so neither is listed', !JSON.stringify(r?.excusedLessons).includes('"s1"') && !JSON.stringify(r?.excusedLessons).includes('"s2"'));
  let ex = LL.forgoneTuition(b.body.results, 'excusedLessons', [S1]);
  let ca = LL.forgoneTuition(b.body.results, 'cancelledLessons', [S1]);
  ok('  Finance Excused Loss / Reports Excused Absences total = the function\'s excusedLessons summed (100,000)', ex.total === 100000, ex);
  ok('  Reports Excused Absences row: the function\'s figure for that lesson and student', LL.forgoneByLesson(ex).get(`s0:${S1}`) === 100000);
  ok('  Reports Lost Tuition = the function\'s cancelledLessons summed (100,000)', ca.total === 100000, ca);
  rows.push(['register (list fee, no override)', 'Excused Loss', oldExcused(), ex.total], ['register (list fee, no override)', 'Lost Tuition', oldCancelled(), ca.total]);

  // 2. What a listed lesson "would have added" is exactly what marking it
  // Present adds to the month (no month-level discount in these fixtures).
  for (const [label, override] of [['list fee', null], ['override below the fee (80,000)', 80000], ['override above the fee (120,000: charged at the fee)', 120000]]) {
    await reset(); world(); fixture.enrollments[0].rate_override_vnd = override;
    const present = (await bulk()).body.results?.[0];
    mark(0, 'Excused');
    const excused = (await bulk()).body.results?.[0];
    const added = present.totalAmount - excused.totalAmount;
    ok(`${label}: the excused lesson's rate_vnd = what marking it Present adds to the month (${added})`,
       excused.excusedLessons?.length === 1 && excused.excusedLessons[0].rate_vnd === added && added > 0, { excused: excused.excusedLessons, added });
    if (override === 80000) {
      ok('  the student\'s own rate, not the class list fee (80,000, was priced at 100,000)', excused.excusedLessons[0].rate_vnd === 80000);
      rows.push(['rate override 80,000', 'Excused Loss', oldExcused(), LL.forgoneTuition([excused], 'excusedLessons', [S1]).total]);
    }
  }

  // 3. A cancelled lesson counts only on the student's enrolled dates and weekdays.
  await reset(); world();
  const wed = new Date('2026-10-07T12:00:00+07:00').getDay();
  fixture.enrollments[0].allowed_days = [wed];
  fixture.sessions.push({ id: 'sx', date: '2026-10-09', class_id: CA, status: 'Canceled', classes: fixture.classes[0] });   // a Friday
  fixture.sessions[3].status = 'Canceled';                                                                                // a Wednesday
  r = (await bulk()).body.results?.[0];
  ok('a cancelled lesson on a weekday the student does not come is not theirs to lose; the one on their weekday is',
     list(r, 'cancelledLessons') === 's3|2026-10-28|A|100000', r?.cancelledLessons);
  rows.push(['weekday-limited enrolment', 'Lost Tuition', oldCancelled(), LL.forgoneTuition([r], 'cancelledLessons', [S1]).total]);
  await reset(); world();
  fixture.enrollments[0].start_date = '2026-10-10';
  fixture.sessions[0].status = 'Canceled';                                                                                // 7 Oct, before the start
  fixture.sessions[3].status = 'Canceled';
  r = (await bulk()).body.results?.[0];
  ok('a cancelled lesson before the student\'s start date is not listed; one after it is',
     list(r, 'cancelledLessons') === 's3|2026-10-28|A|100000', r?.cancelledLessons);
  await reset(); world();
  r = (await bulk()).body.results?.[0];
  ok('nothing excused or cancelled: both lists present and empty (an answer, total 0)',
     Array.isArray(r?.excusedLessons) && r.excusedLessons.length === 0 && Array.isArray(r?.cancelledLessons) && r.cancelledLessons.length === 0 &&
     LL.forgoneTuition([r], 'excusedLessons', [S1]).total === 0 && LL.forgoneTuition([r], 'cancelledLessons', [S1]).total === 0, r);

  // 4. The cancelled lessons cannot be read: the call still answers, the
  // totals are the same, and only that field is missing (figure unavailable).
  await reset(); register();
  const good = (await bulk()).body.results?.[0];
  failCanceledRead = true;
  b = await bulk(); r = b.body.results?.[0];
  failCanceledRead = false;
  ok('cancelled lessons not read: 200, the same totals, excusedLessons kept, cancelledLessons left out',
     b.status === 200 && sameTotals(r, good) && list(r, 'excusedLessons') === list(good, 'excusedLessons') && !('cancelledLessons' in r), r);
  ok('  Lost Tuition is then null = figure unavailable, never 0', LL.forgoneTuition(b.body.results, 'cancelledLessons', [S1]).total === null);
  ok('  Excused Loss is still known', LL.forgoneTuition(b.body.results, 'excusedLessons', [S1]).total === 100000);

  // 5. The mapper never fills a gap with a browser price or a confident 0.
  const old = [{ studentId: S1, totalAmount: 1 }];   // a function deployed before the fields
  ok('a function too old to send the fields: null, not 0', LL.forgoneTuition(old, 'excusedLessons', [S1]).total === null &&
     LL.forgoneTuition(null, 'excusedLessons', [S1]).total === null);
  ok('a student asked about but not answered, or answered with an error: null (a part would read as the whole)',
     LL.forgoneTuition([good], 'excusedLessons', [S1, S2]).total === null &&
     LL.forgoneTuition([good, { studentId: S2, error: true }], 'excusedLessons', [S1, S2]).total === null);
  ok('a lesson without a figure: null', LL.forgoneTuition([{ studentId: S1, excusedLessons: [{ session_id: 's0', rate_vnd: null }] }], 'excusedLessons', [S1]).total === null);
  ok('lost profit = lost tuition - saved pay, unknown if either is', LL.difference(100000, 30000) === 70000 && LL.difference(null, 1) === null);

  // 6. The student Tuition tab: the sibling line and Final Payable.
  await reset(); world(); twoClassesForPricing();
  fixture.students = [{ id: S1, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null } }];
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'assigned', winner_student_id: S1, winner_class_id: CA, sibling_percent: 10, reason: null }];
  single = await calc();
  const line = (single.body.discounts ?? []).find((d) => d.isSiblingWinner);
  const classA = single.body.breakdown?.classes?.find((c) => c.class_id === CA);
  ok('sibling winner: the line under class A = calculate-tuition\'s Sibling Discount amount (40,000)',
     !!line && TF.siblingDiscountFor(single.body.discounts, CA) === line.amount && line.amount === 40000, single.body.discounts);
  ok('  nothing under class B (the discount applies to the winner class only)', TF.siblingDiscountFor(single.body.discounts, CB) === 0);
  rows.push(['sibling winner 10%, two classes', 'sibling line (class A)', Math.round(classA.amount_vnd * (10 / 100)), TF.siblingDiscountFor(single.body.discounts, CA)]);
  globalThis.__t1Sibling = async () => [{ family_id: FAMILY, status: 'assigned', winner_student_id: S2, winner_class_id: CA, sibling_percent: 10, reason: null }];
  single = await calc();
  ok('another child wins: no line (0), whatever the family percent', TF.siblingDiscountFor(single.body.discounts, CA) === 0);
  ok('discount lists the function did not send: 0, never a percent of the class', TF.siblingDiscountFor(undefined, CA) === 0 && TF.siblingDiscountFor([{ isSiblingWinner: true, appliedToClass: CA, amount: 'x' }], CA) === 0);

  for (const [label, setup] of [
    ['debt carried in', async () => { world(); await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, total_amount, recorded_payment, status) VALUES ($1, '2026-09', 400000, 400000, 100000, 'issued')`, [S1]); }],
    ['credit carried in', async () => { world(); await db.query(`INSERT INTO public.invoices (student_id, month, base_amount, total_amount, recorded_payment, status) VALUES ($1, '2026-09', 400000, 400000, 650000, 'issued')`, [S1]); }],
  ]) {
    await reset(); await setup();
    single = await calc();
    const c = single.body.carry;
    ok(`${label}: Final Payable = calculate-tuition's carry.payable (${c?.payable})`,
       TF.payableFrom(c) === c?.payable && typeof c?.payable === 'number', c);
    rows.push([label, 'Final Payable', single.body.totalAmount + (c.carryInDebt - c.carryInCredit), TF.payableFrom(c)]);
  }
  ok('a function too old to send carry.payable: null = figure unavailable, not a sum', TF.payableFrom({ carryInDebt: 5 }) === null && TF.payableFrom(null) === null);

  // 7. The screens price nothing themselves any more.
  const src = (f) => readFileSync(resolve(repo, f), 'utf8');
  const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  const reports = code('src/components/admin/reports/OperationalReports.tsx');
  ok('Reports: no list fee, no pay rate, no rate x minutes (session_rate_vnd / sessionPayVnd / hourly_rate_vnd / rate_override_vnd gone)',
     !/session_rate_vnd|sessionPayVnd|hourly_rate_vnd|per_session_rate_vnd|rate_override_vnd/.test(reports));
  ok('  and it reads calculate-tuition-bulk and calculate-payroll through the mappers',
     /forgoneTuition\(tuition\.results, "cancelledLessons"/.test(reports) && /forgoneTuition\(tuition\.results, "excusedLessons"/.test(reports) &&
     /cancelledPayTotal\(/.test(reports) && /"calculate-tuition-bulk"/.test(reports) && /"calculate-payroll"/.test(reports));
  for (const f of ['src/hooks/useFinanceOverview.ts', 'src/hooks/useFinanceSummary.ts']) {
    ok(`${f}: no class list fee priced (session_rate_vnd gone)`, !/session_rate_vnd/.test(code(f)));
  }
  ok('Finance Excused Loss = forgoneTuition over the same bulk answer as the revenue', /forgoneTuition\(liveRows, "excusedLessons", enrolledIds\)/.test(code('src/hooks/useFinanceOverview.ts')));
  const cal = code('src/components/admin/class/ClassCalendarEnhanced.tsx');
  ok('class calendar: the cost card is classPayFrom(calculate-payroll), not a sum of sessions.rate_override_vnd',
     /classPayFrom\(data, classId\)/.test(cal) && !/rate_override_vnd \|\| 0/.test(cal) && !/cost:\s*sessions/.test(cal));
  const tab = code('src/components/student/StudentTuitionTab.tsx');
  ok('student Tuition tab: no percent / 100 and no carry sum; the sibling line and Final Payable come from the function',
     !/percent \|\| 0\) \/ 100/.test(tab) && !/carryInDebt - tuitionData\.carryInCredit/.test(tab) &&
     /siblingDiscountFor\(tuitionData\.discounts, classItem\.class_id\)/.test(tab) && /formatVND\(tuitionData\.payable\)/.test(tab));

  console.log('\n  | Fixture | Figure | Old browser | Function (now shown) |\n  |---|---|---|---|');
  for (const [a, w, before, after] of rows) console.log(`  | ${a} | ${w} | ${before} | ${after} |`);
}

function twoClassesForPricing() {
  const classB = { id: CB, name: 'Class B', session_rate_vnd: 150000 };
  fixture.classes.push(classB);
  fixture.enrollments.push({ ...fixture.enrollments[0], class_id: CB, discount_type: null, discount_value: null, discount_cadence: null });
  for (const [i, date] of ['2026-10-08', '2026-10-15'].entries()) {
    fixture.sessions.push({ id: `b${i}`, date, class_id: CB, status: 'Held', classes: classB });
    fixture.attendance.push({ session_id: `b${i}`, student_id: S1, status: 'Present' });
  }
}

console.log('\nFigures: byte-identical to the function before T1');
{
  const twoClasses = () => {
    const classB = { id: CB, name: 'Class B', session_rate_vnd: 150000 };
    fixture.classes.push(classB);
    fixture.enrollments.push({ ...fixture.enrollments[0], class_id: CB, discount_type: null, discount_value: null, discount_cadence: null });
    for (const [i, date] of ['2026-10-08', '2026-10-15'].entries()) {
      fixture.sessions.push({ id: `b${i}`, date, class_id: CB, status: 'Held', classes: classB });
      fixture.attendance.push({ session_id: `b${i}`, student_id: S1, status: 'Present' });
    }
  };
  const inFamily = (state) => {
    fixture.students = [{ id: S1, family_id: FAMILY, families: { id: FAMILY, sibling_percent_override: null } }];
    globalThis.__t1Sibling = async () => [{ family_id: FAMILY, ...state }];
  };
  const seed = (month, total, recorded, extra = '') => db.query(
    `INSERT INTO public.invoices (student_id, month, base_amount, total_amount, recorded_payment, status${extra ? ', tuition_frozen, discount_amount' : ''})
     VALUES ($1, $2, $3, $3, $4, 'issued'${extra})`, [S1, month, total, recorded]);
  // The register of enrollment-discounts.test.mjs: a weekday split on 16 Oct.
  const split = (type = 'percent', cadence = 'monthly', value = 10) => {
    const classes = { id: CA, name: 'Test class', session_rate_vnd: 100000 };
    const terms = { student_id: S1, class_id: CA, discount_type: type, discount_value: value,
      discount_cadence: cadence, rate_override_vnd: null };
    fixture = { students: [{ id: S1, family_id: null, families: null }], classes: [classes],
      discount_assignments: [], referral_bonuses: [],
      enrollments: [
        { ...terms, start_date: '2026-09-01', end_date: '2026-10-15', allowed_days: [3, 5] },
        { ...terms, start_date: '2026-10-16', end_date: null, allowed_days: [3] },
      ],
      sessions: ['2026-09-02', '2026-10-07', '2026-10-09', '2026-10-21', '2026-10-23', '2026-11-04', '2026-11-06']
        .map((date, i) => ({ id: `s${i}`, date, class_id: CA, status: 'Held', classes })) };
    fixture.attendance = fixture.sessions.map((s) => ({ session_id: s.id, student_id: S1, status: 'Present' }));
  };
  const CASES = [
    ['plain month', MONTH, async () => world()],
    ['10% enrollment discount', MONTH, async () => world({ discount: 10 })],
    ['Excused, Late, Absent and a Canceled lesson', MONTH, async () => {
      world(); mark(0, 'Excused'); mark(1, 'Late'); mark(2, 'Absent'); fixture.sessions[3].status = 'Canceled'; }],
    ['rate override below the class rate', MONTH, async () => { world(); fixture.enrollments[0].rate_override_vnd = 80000; }],
    ['special discount 15% + referral 50,000', MONTH, async () => {
      world();
      fixture.discount_assignments = [{ student_id: S1, effective_from: '2026-01-01', effective_to: null,
        discount_definitions: { name: 'Staff child', type: 'percent', value: 15, is_active: true } }];
      fixture.referral_bonuses = [{ student_id: S1, type: 'amount', value: 50000, effective_from: '2026-01-01', effective_to: null }];
    }],
    ['sibling winner 10% on class A, two classes', MONTH, async () => {
      world(); twoClasses();
      inFamily({ status: 'assigned', winner_student_id: S1, winner_class_id: CA, sibling_percent: 10, reason: null }); }],
    ['in a family, another child wins', MONTH, async () => {
      world(); inFamily({ status: 'assigned', winner_student_id: S2, winner_class_id: CA, sibling_percent: 10, reason: null }); }],
    ['debt carried in, part payment this month, settled later', MONTH, async () => {
      world(); await seed('2026-08', 400000, 400000); await seed('2026-09', 400000, 100000);
      await seed(MONTH, 0, 150000); await seed('2026-11', 0, 900000); }],
    ['credit carried in', MONTH, async () => { world(); await seed('2026-09', 400000, 650000); }],
    ['frozen bill', MONTH, async () => { world({ discount: 10 }); await seed(MONTH, 900000, 0, ', true, 90000'); }],
    ['no lessons in the month', '2026-12', async () => world()],
    ['split register, Sep', '2026-09', async () => split()],
    ['split register, Oct', '2026-10', async () => split()],
    ['split register, Nov', '2026-11', async () => split()],
    ['split, fixed 20,000 monthly, Oct', '2026-10', async () => split('amount', 'monthly', 20000)],
    ['split, fixed 20,000 once, Nov', '2026-11', async () => split('amount', 'once', 20000)],
    ['split, second term 20%', '2026-10', async () => { split(); fixture.enrollments[1].discount_value = 20; }],
    ['split, second term has no discount', '2026-11', async () => { split(); fixture.enrollments[1].discount_type = null; }],
  ];
  const produced = {};
  const payableChecks = [];
  for (const [name, month, setup] of CASES) {
    await reset(); await setup();
    const first = await calc(S1, month);
    const stored1 = figures(await bill(S1, month));
    const second = await calc(S1, month);          // the row now exists: the path T1 changed
    const stored2 = figures(await bill(S1, month));
    const others = (await db.query(
      `SELECT month, ${FIGURES.join(', ')} FROM public.invoices WHERE student_id = $1 AND month <> $2 ORDER BY month`, [S1, month])).rows;
    // Round 2 added ONE field to the response, carry.payable. It is taken
    // out before the comparison (the golden predates it) and checked on its
    // own: it must be what every screen added up from the same response.
    const b1 = await bulk([S1], month);
    const row = b1.body.results?.[0];
    for (const r of [first, second]) {
      const c = r.body.carry;
      payableChecks.push([name, c?.payable === r.body.totalAmount + c?.carryInDebt - c?.carryInCredit
        && row?.carry?.payable === c?.payable && row?.siblingUnresolved === false && r.body.siblingUnresolved === false,
        { single: c, bulk: row?.carry }]);
      if (c) delete c.payable;
    }
    produced[name] = JSON.parse(JSON.stringify({ month, first, stored1, second, stored2, others }));
  }
  if (writeGolden) {
    writeFileSync(goldenPath, JSON.stringify(produced, null, 1) + '\n');
    console.log(`  wrote ${goldenPath} from ${altSource || 'the current function'}`);
  }
  const golden = existsSync(goldenPath) ? JSON.parse(readFileSync(goldenPath, 'utf8')) : {};
  ok(`the golden file covers exactly these ${CASES.length} fixtures`,
     same(Object.keys(golden), CASES.map((c) => c[0])), Object.keys(golden));
  for (const [name] of CASES) {
    const g = golden[name] || {}, n = produced[name];
    ok(`${name}: the response is identical, first call and repeat`,
       n.first.status === 200 && same(n.first, g.first) && same(n.second, g.second),
       { now: n.first.body?.totalAmount, then: g.first?.body?.totalAmount });
    ok(`${name}: the saved figures are identical (base, discount, total, payments, carry, class breakdown)`,
       n.stored1 !== null && same(n.stored1, g.stored1) && same(n.stored2, g.stored2) && same(n.others, g.others),
       { now: n.stored2, then: g.stored2 });
  }
  if (!altSource) {
    ok(`carry.payable = charge + carry-in debt - carry-in credit on all ${CASES.length} fixtures, single = bulk, nothing flagged unresolved`,
       payableChecks.length === CASES.length * 2 && payableChecks.every((c) => c[1]), payableChecks.filter((c) => !c[1]));
  }
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
