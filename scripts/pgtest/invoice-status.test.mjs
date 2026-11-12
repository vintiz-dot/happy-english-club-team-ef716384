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
let failNextFullUpsert = false;
const JSONB = new Set(['review_flags', 'class_breakdown']);

function invoiceQuery() {
  let mode = 'select', cols = '*', payload = null, conflict = '', order = '';
  const where = [], params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const value = (k, v) => (JSONB.has(k) ? `${p(v == null ? null : JSON.stringify(v))}::jsonb` : p(v));
  async function run() {
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    try {
      if (mode === 'select') {
        if (failInvoiceRead) return { data: null, error: { message: 'synthetic invoice read failure' } };
        return { data: (await db.query(`SELECT ${cols} FROM public.invoices${w}${order}`, params)).rows, error: null };
      }
      const keys = Object.keys(payload);
      if (mode === 'upsert') {
        if (failNextFullUpsert && keys.includes('carry_in_credit')) {
          failNextFullUpsert = false;
          return { data: null, error: { message: 'synthetic: column does not exist' } };
        }
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
    select(c = '*') { if (mode === 'select') cols = c; return q; },
    eq(k, v) { where.push(`${k} = ${p(v)}`); return q; },
    neq(k, v) { where.push(`${k} <> ${p(v)}`); return q; },
    in(k, vs) { where.push(vs.length ? `${k} IN (${vs.map((v) => p(v)).join(', ')})` : 'false'); return q; },
    order(k, o = {}) { order = ` ORDER BY ${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
    upsert(v, o = {}) { mode = 'upsert'; payload = Array.isArray(v) ? v[0] : v; conflict = o.onConflict; return q; },
    update(v) { mode = 'update'; payload = v; return q; },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    then(a, b) { return run().then(a, b); },
  };
  return q;
}

function memoryQuery(table) {
  let rows = fixture[table] || [];
  const q = {
    select() { return q; }, order() { return q; }, or() { return q; },
    eq(k, v) { rows = rows.filter((r) => r[k] === v); return q; },
    neq(k, v) { rows = rows.filter((r) => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter((r) => vs.includes(r[k])); return q; },
    gte(k, v) { rows = rows.filter((r) => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter((r) => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter((r) => r[k] <= v); return q; },
    insert() { return Promise.resolve({ error: null }); },
    single() { return Promise.resolve({ data: rows[0], error: null }); },
    maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
    then(done) { return Promise.resolve({ data: rows, error: null }).then(done); },
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
for (const name of ['calculate-tuition', 'calculate-tuition-bulk', 'confirm-tuition']) {
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
    students: [{ id: S1, family_id: null, families: null }],
    classes: [classes],
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
  invoiceWrites = []; failInvoiceRead = false; failNextFullUpsert = false;
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
  await db.query(`UPDATE public.invoices SET status = 'paid' WHERE student_id = $1`, [S1]);  // settle-bill: status without recorded_payment
  await calc();
  s = await settledBy();
  ok('settled by discount (status paid, no recorded payment), recalculated: still settled by status', s?.by_status === true, s);
}

// ============================================ the figures have not moved
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
  for (const [name, month, setup] of CASES) {
    await reset(); await setup();
    const first = await calc(S1, month);
    const stored1 = figures(await bill(S1, month));
    const second = await calc(S1, month);          // the row now exists: the path T1 changed
    const stored2 = figures(await bill(S1, month));
    const others = (await db.query(
      `SELECT month, ${FIGURES.join(', ')} FROM public.invoices WHERE student_id = $1 AND month <> $2 ORDER BY month`, [S1, month])).rows;
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
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
