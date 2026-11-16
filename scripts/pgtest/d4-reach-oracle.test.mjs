// D4 step 3B: the reach oracle (docs/evidence/D4-design.md f.4).
//
// It does not trust the reach rules. A family of two children with a
// sibling discount has bills over five months in every state (frozen,
// confirmed, paid, billed, this month). For each of about eighty edits to a
// money input - every enrolment, discount and family-link change, each aimed
// at each month - it:
//   1. asks the guard for the tier and the refresh pairs (money_change_preview);
//   2. makes the edit BEHIND THE GUARD'S BACK, on the owner lane, in raw SQL;
//   3. runs the REAL calculate-tuition (and the real compute-sibling-discounts
//      under it) for both children over every month;
//   4. compares every stored bill with what it was.
// THE PROPERTY: if a bill of a PAST month, or a SIGNED-OFF bill, of EITHER
// child moved, the guard had said tier 1 or more AND that (child, month) is
// in its refresh pairs. A tier-0 answer for an edit that moves such a bill is
// a hole in the reach, whatever the rule says.
// It also checks the trigger against the plan: the same raw statement made by
// an admin is refused exactly when the plan's tier is 1 or more.
//
// What runs: the real migrations in pglite (the same list as d4-money-inputs)
// and the real function sources bundled with esbuild. Their Supabase client
// is a stand-in that reads every table straight from that database, so the
// calculator sees exactly the rows the edit left. Only the auth gate, the
// rate limiter and the month lock are stubbed.
//
// Scope, said plainly: this file owns the step 3B edits (enrolment, discount,
// family link) and a pay-rate oracle over the SQL resolver. The class-fee
// edits belong to step 2's suite and the lesson edits (a backdated lesson, a
// teacher, a lesson's times, an assistant) to step 3A's; add them to EDITS
// below when those files merge. The bundled calculate-payroll is not driven
// here (docs/evidence/D4-build-3b.md, "Not built").
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, repo } from './d4-prelude.mjs';
import { makeInputsDb } from './d4-inputs-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 13) {
  console.error('usage: d4-reach-oracle.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> ' +
    '<no auto changes> <enrolment RPCs> <pause> <deactivation> <d4 money inputs>');
  process.exit(2);
}
const db = await makeInputsDb(files);
const H = harness(() => db);
const { ok, as } = H;
const q = async (sql, p) => (await db.query(sql, p)).rows;
const q1 = async (sql, p) => (await q(sql, p))[0];

// what calculate-tuition reads and writes on a bill beyond D2's prelude
await db.exec(`
  ALTER TABLE public.invoices ADD COLUMN paid_amount integer NOT NULL DEFAULT 0, ADD COLUMN review_flags jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN confirmed_by uuid, ADD COLUMN number text;
  ALTER TABLE public.invoices ALTER COLUMN recorded_payment SET DEFAULT 0;
`);

// ------------------------------------------------------------ the stand-in
const mem = { sibling_discount_state: [], settlements: [], ledger_entries: [] };
const EMBED = {
  students: [['families', 'families', 'family_id']],
  enrollments: [['classes', 'classes', 'class_id']],
  sessions: [['classes', 'classes', 'class_id']],
  discount_assignments: [['discount_definitions', 'discount_definitions', 'discount_def_id']],
};
const JSONB = new Set(['review_flags', 'class_breakdown']);
const cmp = (a, b) => (a === b ? 0 : a === null || a === undefined ? -1 : b === null || b === undefined ? 1 : a < b ? -1 : a > b ? 1 : 0);
function test(row, [op, col, v]) {
  const x = row[col] ?? null;
  switch (op) {
    case 'eq': return x === v;
    case 'neq': return x !== v;
    case 'in': return v.includes(x);
    case 'gte': return x !== null && x >= v;
    case 'gt': return x !== null && x > v;
    case 'lte': return x !== null && x <= v;
    case 'lt': return x !== null && x < v;
    case 'is': return x === v;
    case 'notnull': return x !== null;
    case 'or': return v.some((c) => test(row, c));
    default: throw new Error(`stand-in: unsupported filter ${op}`);
  }
}
const parseOr = (expr) => expr.split(',').map((part) => {
  const [col, op, ...rest] = part.split('.');
  const value = rest.join('.');
  return op === 'is' ? ['is', col, value === 'null' ? null : value] : [op, col, value];
});
async function tableRows(table) {
  if (mem[table]) return mem[table].map((r) => ({ ...r }));
  const rows = (await q(`SELECT to_jsonb(t) j FROM public.${table} t`)).map((r) => r.j);
  for (const [key, other, fk] of EMBED[table] ?? []) {
    const byId = new Map((await q(`SELECT to_jsonb(t) j FROM public.${other} t`)).map((r) => [r.j.id, r.j]));
    for (const r of rows) r[key] = byId.get(r[fk]) ?? null;
  }
  return rows;
}
function from(table) {
  const s = { op: 'select', filters: [], order: [], limit: Infinity, payload: null, conflict: null };
  const run = async () => {
    try {
      if (s.op === 'select') {
        let rows = (await tableRows(table)).filter((r) => s.filters.every((f) => test(r, f)));
        for (const [k, asc] of [...s.order].reverse()) rows = [...rows].sort((a, b) => (asc ? cmp(a[k], b[k]) : cmp(b[k], a[k])));
        return { data: rows.slice(0, s.limit), error: null };
      }
      if (mem[table]) {
        if (s.op !== 'upsert') throw new Error(`stand-in: ${s.op} on ${table}`);
        const keys = String(s.conflict ?? '').split(',').map((k) => k.trim()).filter(Boolean);
        for (const row of Array.isArray(s.payload) ? s.payload : [s.payload]) {
          const i = mem[table].findIndex((r) => keys.length > 0 && keys.every((k) => r[k] === row[k]));
          if (i >= 0) mem[table][i] = { ...mem[table][i], ...row }; else mem[table].push({ ...row });
        }
        return { data: null, error: null };
      }
      if (table !== 'invoices') throw new Error(`stand-in: the calculators may write only bills, not ${table}`);
      // the calculator saves a bill with the service key: the service lane
      const keys = Object.keys(s.payload);
      const params = [];
      const val = (k) => { params.push(JSONB.has(k) && s.payload[k] != null ? JSON.stringify(s.payload[k]) : s.payload[k]); return `$${params.length}${JSONB.has(k) ? '::jsonb' : ''}`; };
      if (s.op === 'upsert') {
        const vals = keys.map(val);
        await as(null, 'service_role', 'service_role',
          `INSERT INTO public.invoices (${keys.join(', ')}) VALUES (${vals.join(', ')})
           ON CONFLICT (${s.conflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`, params);
        return { data: null, error: null };
      }
      throw new Error(`stand-in: ${s.op} on invoices`);
    } catch (e) {
      console.log(`  stand-in error on ${table}: ${e.message}`);
      return { data: null, error: { message: e.message, code: e.code } };
    }
  };
  const b = {
    select() { return b; },
    eq(c, v) { s.filters.push(['eq', c, v]); return b; },
    neq(c, v) { s.filters.push(['neq', c, v]); return b; },
    in(c, v) { s.filters.push(['in', c, v]); return b; },
    gte(c, v) { s.filters.push(['gte', c, v]); return b; },
    gt(c, v) { s.filters.push(['gt', c, v]); return b; },
    lte(c, v) { s.filters.push(['lte', c, v]); return b; },
    lt(c, v) { s.filters.push(['lt', c, v]); return b; },
    is(c, v) { s.filters.push(['is', c, v]); return b; },
    not(c, op, v) { if (op !== 'is' || v !== null) throw new Error('stand-in: only not(col, "is", null)'); s.filters.push(['notnull', c]); return b; },
    or(expr) { s.filters.push(['or', null, parseOr(expr)]); return b; },
    order(c, o = {}) { s.order.push([c, o.ascending !== false]); return b; },
    limit(n) { s.limit = n; return b; },
    upsert(v, o = {}) { s.op = 'upsert'; s.payload = v; s.conflict = o.onConflict ?? null; return b; },
    update(v) { s.op = 'update'; s.payload = v; return b; },
    insert(v) { s.op = 'insert'; s.payload = v; return b; },
    delete() { s.op = 'delete'; return b; },
    single() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error ?? (r.data?.length ? null : { message: 'no row', code: 'PGRST116' }) })); },
    maybeSingle() { return run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); },
    then(a, c) { return run().then(a, c); },
  };
  return b;
}
const handlers = {};
const post = (body) => new Request('http://localhost/fn', { method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer service' }, body: JSON.stringify(body) });
globalThis.__orClient = () => ({
  from,
  auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  functions: { invoke: async (name, { body }) => {
    const res = await handlers[name](post(body));
    const data = await res.json();
    return res.status === 200 ? { data, error: null } : { data: null, error: new Error(data?.error || `non-2xx from ${name}`) };
  } },
});
globalThis.Deno = { env: { get: () => 'oracle-test-only' }, serve: (h) => { handlers.current = h; } };
const quiet = console.log;
const out = mkdtempSync(join(tmpdir(), 'd4-oracle-'));
for (const name of ['calculate-tuition', 'compute-sibling-discounts']) {
  const bundle = await build({
    entryPoints: [resolve(repo, 'supabase', 'functions', name, 'index.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
    logLevel: 'silent',
    plugins: [{ name: 'oracle-boundaries', setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/rate-limit\.ts$|\/lock\.ts$)/ }, (args) => ({ path: args.path, namespace: 'oracle' }));
      b.onLoad({ filter: /.*/, namespace: 'oracle' }, (args) => (
        args.path.includes('supabase-js') ? { loader: 'js', contents: 'export const createClient = (...a) => globalThis.__orClient(...a);' } :
        args.path.includes('zod') ? { loader: 'js', contents: 'export { z } from "zod";', resolveDir: repo } :
        args.path.endsWith('/auth.ts') ? { loader: 'js', contents:
          'export const requireRole = async () => ({ isServiceRole: true, roles: new Set(["service_role"]), userId: "" }); export const callerOwnsStudent = async () => true;' } :
        args.path.endsWith('/lock.ts') ? { loader: 'js', contents:
          'export const acquireLock = async () => true; export const releaseLock = async () => {}; export const ymNowBangkok = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);' } :
        { loader: 'js', contents: 'export const checkRateLimit = () => ({ limited: false }); export const getClientIP = () => "oracle"; export const rateLimitResponse = () => {};' }
      ));
    } }],
  });
  const file = join(out, `${name}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  handlers[name] = handlers.current;
}
ok('the real calculate-tuition and compute-sibling-discounts bundled and registered a handler',
   typeof handlers['calculate-tuition'] === 'function' && typeof handlers['compute-sibling-discounts'] === 'function');

// ------------------------------------------------------------ the school
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin')`, [ADMIN]);
const clock = await q1(`SELECT to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') today`);
const TODAY = clock.today;
const MONTHS = (await q(`SELECT to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) - make_interval(months => n), 'YYYY-MM') m
                          FROM generate_series(4, 0, -1) n`)).map((r) => r.m);     // oldest first; MONTHS[4] is this month
const PAST = Object.fromEntries(await Promise.all(MONTHS.map(async (m) => [m, (await q1(`SELECT public._money_month_is_past($1) p`, [m])).p])));
const first = (i) => `${MONTHS[i]}-01`;
const mid = (i) => `${MONTHS[i]}-15`;
const lastDay = async (i) => (await q1(`SELECT to_char((($1 || '-01')::date + interval '1 month' - interval '1 day'), 'YYYY-MM-DD') d`, [MONTHS[i]])).d;
const dayBefore = async (d) => (await q1(`SELECT to_char($1::date - 1, 'YYYY-MM-DD') d`, [d])).d;

const C1 = randomUUID(), C2 = randomUUID(), FAM = randomUUID(), FAM2 = randomUUID(), A = randomUUID(), B = randomUUID(), X = randomUUID();
const T1 = randomUUID();
await db.exec(`
  INSERT INTO classes(id, default_teacher_user, name, session_rate_vnd) VALUES ('${C1}', gen_random_uuid(), 'Starters', 100000), ('${C2}', gen_random_uuid(), 'Movers', 80000);
  INSERT INTO families(id, name) VALUES ('${FAM}', 'Family'), ('${FAM2}', 'Other family');
  INSERT INTO students(id, full_name, family_id) VALUES ('${A}', 'A', '${FAM}'), ('${B}', 'B', '${FAM}'), ('${X}', 'X', NULL);
  INSERT INTO teachers(id, full_name, pay_rate_type, hourly_rate_vnd) VALUES ('${T1}', 'T', 'hourly', 200000);
`);
for (const m of MONTHS) {
  for (const d of ['05', '12', '19', '26']) {
    const date = `${m}-${d}`;
    const status = date < TODAY ? 'Held' : 'Scheduled';
    await db.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,$4), ($5,$2,'08:00','09:30',$3,$4)`,
      [C1, date, status, T1, C2]);
  }
}
const EA = (await q1(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3) RETURNING id`, [C1, A, first(0)])).id;
const EB = (await q1(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3) RETURNING id`, [C1, B, first(0)])).id;
await db.query(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [C1, X, first(0)]);
await db.query(`INSERT INTO attendance(session_id, student_id, status, marked_by)
                SELECT s.id, k.id, 'Present', NULL FROM sessions s, (VALUES ($2::uuid), ($3::uuid), ($4::uuid)) k(id) WHERE s.class_id = $1`, [C1, A, B, X]);
const DEF = (await q1(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('Staff child','percent','monthly',10,$1) RETURNING id`, [MONTHS[0]])).id;
const DEF2 = (await q1(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('Scholarship','amount','monthly',30000,$1) RETURNING id`, [MONTHS[0]])).id;
// B already holds a discount and a referral bonus, so "end" / "remove" / "edit" have something to act on
const ASG = (await q1(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3) RETURNING id`, [B, DEF2, first(0)])).id;
const BONUS = (await q1(`INSERT INTO referral_bonuses(student_id, type, cadence, value, effective_from) VALUES ($1,'amount','monthly',20000,$2) RETURNING id`, [B, first(0)])).id;

const KIDS = [A, B];
async function calcAll() {
  mem.sibling_discount_state = [];             // worst case: nothing decided yet, the family calculator runs again
  console.log = () => {};                      // the functions log every step
  try {
    for (const m of MONTHS) for (const k of KIDS) {
      const res = await handlers['calculate-tuition'](post({ studentId: k, month: m }));
      if (res.status !== 200) throw new Error(`calculate-tuition ${k} ${m}: ${res.status} ${JSON.stringify(await res.json()).slice(0, 300)}`);
    }
  } finally { console.log = quiet; }
}
const bills = async () => new Map((await q(`SELECT student_id, month, base_amount, discount_amount, total_amount, confirmation_status, tuition_frozen
                                              FROM invoices WHERE student_id = ANY($1::uuid[])`, [KIDS]))
  .map((r) => [`${r.student_id}:${r.month}`, r]));

await calcAll();
// every state of b.0, for both children: frozen, confirmed, paid, billed, this month
for (const k of KIDS) {
  await db.query(`UPDATE invoices SET tuition_frozen = true, frozen_reason = 'history corrected' WHERE student_id=$1 AND month=$2`, [k, MONTHS[0]]);
  await db.query(`UPDATE invoices SET confirmation_status = 'confirmed', confirmed_at = now() WHERE student_id=$1 AND month=$2`, [k, MONTHS[1]]);
  await db.query(`UPDATE invoices SET recorded_payment = total_amount, status = 'paid' WHERE student_id=$1 AND month=$2`, [k, MONTHS[2]]);
}
await calcAll();
const BASE = await bills();
ok('fixture: ten bills (two children, five months), every state present, and a sibling discount somewhere in the family',
   BASE.size === 10 && [...BASE.values()].some((b) => b.tuition_frozen) && [...BASE.values()].some((b) => b.confirmation_status === 'confirmed')
   && mem.sibling_discount_state.some((s) => s.status === 'assigned'), { n: BASE.size, sib: mem.sibling_discount_state.map((s) => s.status) });
ok('fixture: recalculating with nothing changed moves no bill (the oracle\'s zero)', await (async () => {
  await calcAll();
  const again = await bills();
  return [...BASE.keys()].every((k) => ['base_amount', 'discount_amount', 'total_amount'].every((f) => again.get(k)[f] === BASE.get(k)[f]));
})());

// ------------------------------------------------------------ the edits
const sessionsAfter = (cls, op, date) => `(SELECT id FROM sessions WHERE class_id='${cls}' AND date ${op} '${date}')`;
const EDITS = [];
const add = (label, entity, op, args, raw, opts = {}) => EDITS.push({ label, entity, op, args, raw, ...opts });
for (let i = 0; i < MONTHS.length; i++) {
  const m = MONTHS[i];
  const dow = (await q1(`SELECT extract(dow FROM ($1 || '-05')::date)::int d`, [m])).d;
  const eve = await dayBefore(first(i));
  const split = (set) => (i === 0
    ? [`UPDATE enrollments SET ${set} WHERE id='${EA}'`]
    : [`UPDATE enrollments SET end_date='${eve}' WHERE id='${EA}'`,
       `INSERT INTO enrollments(class_id, student_id, start_date) VALUES ('${C1}','${A}','${first(i)}')`,
       `UPDATE enrollments SET ${set} WHERE student_id='${A}' AND class_id='${C1}' AND start_date='${first(i)}'`]);
  add(`enrolment start moved to ${mid(i)}`, 'enrollment', 'set_start_date', { enrollment_id: EA, start_date: mid(i) },
    [`UPDATE enrollments SET start_date='${mid(i)}' WHERE id='${EA}'`]);
  add(`enrolment ended on ${mid(i)}`, 'enrollment', 'end', { student_id: A, class_id: C1, end_date: mid(i) },
    [`UPDATE enrollments SET end_date='${mid(i)}' WHERE id='${EA}'`,
     `DELETE FROM attendance WHERE student_id='${A}' AND marked_by IS NULL AND session_id IN ${sessionsAfter(C1, '>', mid(i))}`]);
  add(`rate 60,000 from ${first(i)}`, 'enrollment', 'set_terms_from', { enrollment_id: EA, terms: { rate_override_vnd: 60000 }, effective_date: first(i) },
    split('rate_override_vnd=60000'));
  add(`20% monthly discount from ${first(i)}`, 'enrollment', 'set_terms_from',
    { enrollment_id: EA, terms: { discount_type: 'percent', discount_value: 20, discount_cadence: 'monthly' }, effective_date: first(i) },
    split(`discount_type='percent', discount_value=20, discount_cadence='monthly'`));
  add(`10,000 per-lesson discount from ${first(i)}`, 'enrollment', 'set_terms_from',
    { enrollment_id: EA, terms: { discount_type: 'amount', discount_value: 10000, discount_cadence: 'once' }, effective_date: first(i) },
    split(`discount_type='amount', discount_value=10000, discount_cadence='once'`));
  add(`weekdays changed from ${first(i)}`, 'enrollment', 'set_days', { enrollment_id: EA, allowed_days: [(dow + 1) % 7], effective_date: first(i) },
    split(`allowed_days='{${(dow + 1) % 7}}'`));
  add(`transfer to the other class from ${mid(i)}`, 'enrollment', 'transfer', { student_id: A, old_class_id: C1, new_class_id: C2, effective_date: mid(i) },
    [`UPDATE enrollments SET end_date='${m}-14' WHERE id='${EA}'`,
     `DELETE FROM attendance WHERE student_id='${A}' AND marked_by IS NULL AND session_id IN ${sessionsAfter(C1, '>=', mid(i))}`,
     `INSERT INTO enrollments(class_id, student_id, start_date) VALUES ('${C2}','${A}','${mid(i)}')`,
     `INSERT INTO attendance(session_id, student_id, status, marked_by) SELECT id, '${A}', 'Present', NULL FROM sessions WHERE class_id='${C2}' AND date >= '${mid(i)}'`]);
  add(`paused ${m}-10 to ${m}-20`, 'enrollment', 'pause', { student_id: A, class_id: C1, from: `${m}-10`, to: `${m}-20` },
    [`UPDATE attendance SET status='Excused', marked_by='${ADMIN}' WHERE student_id='${A}'
        AND session_id IN (SELECT id FROM sessions WHERE class_id='${C1}' AND date BETWEEN '${m}-10' AND '${m}-20')`], { registerOnly: true });
  add(`sibling enrolled in a second class from ${first(i)}`, 'enrollment', 'enroll', { student_id: B, class_id: C2, start_date: first(i) },
    [`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ('${C2}','${B}','${first(i)}')`,
     `INSERT INTO attendance(session_id, student_id, status, marked_by) SELECT id, '${B}', 'Present', NULL FROM sessions WHERE class_id='${C2}' AND date >= '${first(i)}'`]);
  add(`discount assigned from ${first(i)}`, 'discount_assignment', 'assign', { student_id: A, discount_def_id: DEF, effective_from: first(i) },
    [`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ('${A}','${DEF}','${first(i)}')`]);
  add(`discount assigned for ${m} only`, 'discount_assignment', 'assign', { student_id: A, discount_def_id: DEF, effective_from: mid(i), effective_to: await lastDay(i) },
    [`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from, effective_to) VALUES ('${A}','${DEF}','${mid(i)}','${await lastDay(i)}')`]);
  add(`the sibling's discount ended on ${eve}`, 'discount_assignment', 'set_end', { id: ASG, effective_to: eve },
    [`UPDATE discount_assignments SET effective_to='${eve}' WHERE id='${ASG}'`]);
  add(`referral bonus from ${mid(i)}`, 'referral_bonus', 'assign', { student_id: A, type: 'amount', cadence: 'monthly', value: 50000, effective_from: mid(i) },
    [`INSERT INTO referral_bonuses(student_id, type, cadence, value, effective_from) VALUES ('${A}','amount','monthly',50000,'${mid(i)}')`]);
  add(`the sibling's bonus ended on ${eve}`, 'referral_bonus', 'set_end', { id: BONUS, effective_to: eve },
    [`UPDATE referral_bonuses SET effective_to='${eve}' WHERE id='${BONUS}'`]);
  add(`sibling held out of the family discount until ${first(i)}`, 'family_link', 'set_sibling_from', { student_id: B, date: first(i) },
    [`UPDATE students SET sibling_discount_from='${first(i)}' WHERE id='${B}'`]);
}
add('rate corrected for the whole enrolment', 'enrollment', 'set_rate', { enrollment_id: EA, rate_override_vnd: 70000 },
  [`UPDATE enrollments SET rate_override_vnd=70000 WHERE id='${EA}'`]);
add('discount corrected for the whole enrolment', 'enrollment', 'set_discount',
  { enrollment_id: EA, discount_type: 'percent', discount_value: 15, discount_cadence: 'monthly' },
  [`UPDATE enrollments SET discount_type='percent', discount_value=15, discount_cadence='monthly' WHERE id='${EA}'`]);
add('enrolment deleted', 'enrollment', 'delete', { enrollment_id: EA }, [`DELETE FROM enrollments WHERE id='${EA}'`]);
add('the sibling\'s discount removed', 'discount_assignment', 'remove', { id: ASG }, [`DELETE FROM discount_assignments WHERE id='${ASG}'`]);
add('the sibling\'s bonus value changed', 'referral_bonus', 'edit', { id: BONUS, value: 90000 }, [`UPDATE referral_bonuses SET value=90000 WHERE id='${BONUS}'`]);
add('the sibling\'s bonus removed', 'referral_bonus', 'remove', { id: BONUS }, [`DELETE FROM referral_bonuses WHERE id='${BONUS}'`]);
add('a child leaves the family', 'family_link', 'set_family', { student_id: A, family_id: null }, [`UPDATE students SET family_id=NULL WHERE id='${A}'`]);
add('a child moves to another family', 'family_link', 'set_family', { student_id: B, family_id: FAM2 }, [`UPDATE students SET family_id='${FAM2}' WHERE id='${B}'`]);
add('a third enrolled child joins the family', 'family_link', 'set_family', { student_id: X, family_id: FAM }, [`UPDATE students SET family_id='${FAM}' WHERE id='${X}'`]);
add('the family\'s sibling percentage set to 20', 'family_link', 'set_sibling_percent', { family_id: FAM, percent: 20 },
  [`UPDATE families SET sibling_percent_override=20 WHERE id='${FAM}'`]);
add('the family\'s sibling discount switched off', 'family_link', 'set_sibling_percent', { family_id: FAM, percent: 0 },
  [`UPDATE families SET sibling_percent_override=0 WHERE id='${FAM}'`]);

// ------------------------------------------------------------ the run
const signedOff = (b) => b.tuition_frozen || ['confirmed', 'adjusted'].includes(b.confirmation_status ?? '');
const stats = { edits: 0, movedGuarded: 0, t0: 0, t0MovedThisMonthOnly: 0, tiered: 0, holes: [] };
for (const e of EDITS) {
  stats.edits += 1;
  let plan = null, rawRefused = null, moved = [], failure = null;
  await db.exec('BEGIN');
  try {
    plan = (await as(ADMIN, 'authenticated', 'authenticated', `SELECT public.money_change_preview($1,$2,$3::jsonb) r`,
      [e.entity, e.op, JSON.stringify(e.args)])).rows[0].r;
    // the same statements made raw by an admin: what does the trigger say?
    await db.exec('SAVEPOINT raw_attempt');
    try {
      await db.exec(`SELECT set_config('test.uid', '${ADMIN}', true), set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated; ${e.raw.join('; ')};`);
      rawRefused = null;
    } catch (x) { rawRefused = x.code; }
    await db.exec(`ROLLBACK TO SAVEPOINT raw_attempt; RESET ROLE; SELECT set_config('test.uid', '', true), set_config('test.jwt_role', '', true);`);
    // behind the guard's back: the owner lane
    for (const stmt of e.raw) await db.exec(stmt);
    await calcAll();
    const now = await bills();
    for (const [key, was] of BASE) {
      const is = now.get(key);
      if (!is || ['base_amount', 'discount_amount', 'total_amount'].some((f) => is[f] !== was[f])) {
        const [student_id, month] = key.split(':');
        moved.push({ student_id, month, past: PAST[month], signed: signedOff(was), was: was.total_amount, is: is?.total_amount ?? null });
      }
    }
  } catch (x) { failure = `${x.code ?? ''} ${x.message}`; }
  await db.exec('ROLLBACK').catch(() => {});
  await db.exec('RESET ROLE').catch(() => {});

  if (failure || !plan) { ok(`${e.label}: the oracle ran`, false, failure); continue; }
  if (plan.allowed !== true) {
    // the checked path will not make this change at all (a discount ended before it began, say):
    // then the raw statement must not be a way round it
    const hit = moved.filter((x) => x.past || x.signed);
    stats.refusedOutright = (stats.refusedOutright ?? 0) + 1;
    ok(`${e.label} [${e.entity}.${e.op}]: refused outright by the checked path (${plan.refuse_code}); the raw statement by an admin is refused too`,
       hit.length === 0 || ['HC120', 'HC121', 'HC025'].includes(rawRefused), { refuse: plan.refuse_code, rawRefused, hit: hit.length });
    continue;
  }
  const tier = Number(plan.tier ?? 3);
  const pairs = new Set((plan.refresh_pairs ?? []).map((p) => `${p.student_id}:${p.month}`));
  const guarded = moved.filter((x) => x.past || x.signed);
  const uncovered = guarded.filter((x) => tier < 1 || !pairs.has(`${x.student_id}:${x.month}`));
  if (guarded.length > 0) stats.movedGuarded += 1;
  if (tier === 0) { stats.t0 += 1; if (moved.length > 0) stats.t0MovedThisMonthOnly += 1; } else stats.tiered += 1;
  if (uncovered.length > 0) stats.holes.push(e.label);
  ok(`${e.label} [${e.entity}.${e.op}] T${tier}: ${guarded.length === 0 ? 'no past or signed-off bill moved' : `${guarded.length} past / signed-off bill(s) moved, each in the reach`}`,
     plan.allowed === true && uncovered.length === 0, { tier, allowed: plan.allowed, refuse: plan.refuse_code, uncovered, pairs: [...pairs].length });
  if (!e.registerOnly) {
    ok(`  the trigger agrees with the plan: the raw statement by an admin is ${tier >= 1 ? 'refused' : 'allowed'}`,
       tier >= 1 ? ['HC120', 'HC025'].includes(rawRefused) : rawRefused === null, { tier, rawRefused });
  }
}

ok(`the oracle is not vacuous: ${stats.movedGuarded} of ${stats.edits} edits moved a past or signed-off bill behind the guard's back (and every one of them was tiered)`,
   stats.movedGuarded >= 25 && stats.holes.length === 0 && (stats.refusedOutright ?? 0) <= 2, stats);
ok(`and it is not "everything is tier 1": ${stats.t0} edits were tier 0, ${stats.t0MovedThisMonthOnly} of which moved only this month's unsigned bill`,
   stats.t0 >= 8 && stats.tiered >= 25, stats);

// ------------------------------------------------------------ refused outright (review B-1, B-2)
// Edits no reach rule prices, because there is no checked path for them:
// which of two overlapping enrolments of a class was created first (B-1:
// that row prices the lesson), and a frozen bill deleted or moved to another
// month (B-2: calculate-tuition then writes a new, unfrozen bill). For each:
// the raw statement by an admin is refused with the named code; with the
// guard on, recalculating moves no past or signed-off bill; and the same
// statement made with the guard switched off DOES move one (the refusal is
// not vacuous). Ported from the reviewer's review3b-oracle.mjs (O1-O5).
const movedBills = (before, now) => {
  const out = [];
  for (const [key, was] of before) {
    const is = now.get(key);
    if (!is || ['base_amount', 'discount_amount', 'total_amount'].some((f) => is[f] !== was[f]) || is.tuition_frozen !== was.tuition_frozen) {
      const [sid, month] = key.split(':');
      if (PAST[month] || signedOff(was)) out.push({ kid: sid === A ? 'A' : 'B', month, was: was.total_amount, is: is?.total_amount ?? null, frozen_was: was.tuition_frozen, frozen_is: is?.tuition_frozen ?? null });
    }
  }
  return out;
};
async function refusedOutright(label, setup, raw, code, guard) {
  let refusedCode = null, movedOn = null, movedOff = null, failure = null;
  await db.exec('BEGIN');
  try {
    for (const s of setup) await db.exec(s);
    await calcAll();
    const before = await bills();
    await db.exec('SAVEPOINT raw_attempt');
    try {
      await db.exec(`SELECT set_config('test.uid', '${ADMIN}', true), set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated; ${raw};`);
    } catch (x) { refusedCode = x.code; }
    await db.exec(`ROLLBACK TO SAVEPOINT raw_attempt; RESET ROLE; SELECT set_config('test.uid', '', true), set_config('test.jwt_role', '', true);`);
    await calcAll();
    movedOn = movedBills(before, await bills());
    // the same statement by the same admin, with only the named guard switched off
    // (as the admin: the live freeze trigger keeps a bill frozen for anyone else)
    for (const [table, trigger] of guard) await db.exec(`ALTER TABLE public.${table} DISABLE TRIGGER ${trigger}`);
    await db.exec(`SELECT set_config('test.uid', '${ADMIN}', true), set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated; ${raw};`);
    await db.exec(`RESET ROLE; SELECT set_config('test.uid', '', true), set_config('test.jwt_role', '', true);`);
    await calcAll();
    movedOff = movedBills(before, await bills());
  } catch (x) { failure = `${x.code ?? ''} ${x.message}`; }
  await db.exec('ROLLBACK').catch(() => {});
  await db.exec('RESET ROLE').catch(() => {});
  ok(`${label}: an admin's raw statement is refused, ${code}`, !failure && refusedCode === code, { refusedCode, failure });
  ok(`  with the guard on, recalculating moves no past or signed-off bill`, Array.isArray(movedOn) && movedOn.length === 0, movedOn);
  ok(`  not vacuous: with the guard switched off the same statement moves ${movedOff?.length ?? 0} past / signed-off bill(s)`,
     Array.isArray(movedOff) && movedOff.length >= 1, movedOff);
}
const overlapping = [`INSERT INTO enrollments(class_id, student_id, start_date, rate_override_vnd, created_at)
  VALUES ('${C1}', '${B}', '${first(0)}', 50000, now() + interval '1 hour')`];
await refusedOutright('O1 (B-1) a later, overlapping enrolment of the sibling re-dated to be created first', overlapping,
  `UPDATE enrollments SET created_at = '2000-01-01' WHERE student_id = '${B}' AND rate_override_vnd = 50000`, 'HC121',
  [['enrollments', 'zz_enrollment_money_guard']]);
const historyCorrected = [`UPDATE enrollments SET rate_override_vnd = 60000 WHERE id = '${EA}'`];   // the frozen month keeps its figure
await refusedOutright(`O3 (B-2) the frozen bill of ${MONTHS[0]} deleted after a history correction`, historyCorrected,
  `DELETE FROM invoices WHERE student_id = '${A}' AND month = '${MONTHS[0]}'`, 'HC120',
  [['invoices', 'zz_invoice_frozen_delete_guard']]);
await refusedOutright(`O4 (B-2) the frozen bill of ${MONTHS[0]} moved to another month`, historyCorrected,
  `UPDATE invoices SET month = '2001-01' WHERE student_id = '${A}' AND month = '${MONTHS[0]}'`, 'HC120',
  [['invoices', 'zz_invoice_frozen_keep_guard']]);
await refusedOutright(`O5 (control) the frozen bill of ${MONTHS[0]} unfrozen raw`, historyCorrected,
  `UPDATE invoices SET tuition_frozen = false WHERE student_id = '${A}' AND month = '${MONTHS[0]}'`, 'HC120',
  [['invoices', 'zz_invoice_unfreeze_guard']]);
{
  // B-2's triggers compare month / student_id BY VALUE: the real calculator's
  // upsert re-sets both to the same values on every frozen bill, and must pass.
  let failure = null, touched = false, kept = false, installed = 0;
  await db.exec('BEGIN');
  try {
    installed = (await q1(`SELECT count(*)::int n FROM pg_trigger WHERE tgrelid = 'public.invoices'::regclass AND tgenabled = 'O'
                             AND tgname IN ('zz_invoice_frozen_keep_guard', 'zz_invoice_frozen_delete_guard')`)).n;
    await db.exec(historyCorrected[0]);
    await db.exec(`UPDATE invoices SET updated_at = '2000-01-01' WHERE month = '${MONTHS[0]}' AND student_id = ANY ('{${KIDS.join(',')}}')`);
    const before = await bills();
    await calcAll();
    const now = await bills();
    touched = (await q1(`SELECT bool_and(updated_at > '2000-01-02') t FROM invoices WHERE month = '${MONTHS[0]}' AND student_id = ANY ('{${KIDS.join(',')}}')`)).t === true;
    kept = KIDS.every((k) => { const key = `${k}:${MONTHS[0]}`; const b = before.get(key), n = now.get(key);
      return b.tuition_frozen && n.tuition_frozen && ['base_amount', 'discount_amount', 'total_amount'].every((f) => b[f] === n[f]); });
  } catch (x) { failure = `${x.code ?? ''} ${x.message}`; }
  await db.exec('ROLLBACK').catch(() => {});
  ok('B-2: the real calculate-tuition still saves both frozen bills through the new triggers (its upsert reached the rows), and they keep their figures',
     !failure && installed === 2 && touched && kept, { failure, installed, touched, kept });
}

// ------------------------------------------------------------ pay rates
// The rate a lesson is paid at is resolved in SQL by teacher_rate_on (the same
// rule calculate-payroll's resolver mirrors). The oracle: change a rate
// behind the guard's back and price every Held lesson of the teacher before
// and after; whenever a lesson dated before today, or in a locked month,
// changes price, the tier was at least 1.
await db.exec(`
  CREATE OR REPLACE FUNCTION public.zz_rate_on(p_teacher uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE AS $f$
    SELECT COALESCE((SELECT jsonb_build_object('t', r.pay_rate_type, 'h', r.hourly_rate_vnd, 'p', r.per_session_rate_vnd)
                       FROM public.staff_pay_rates r WHERE r.teacher_id = p_teacher AND r.effective_from <= p_date
                      ORDER BY r.effective_from DESC LIMIT 1),
                    (SELECT jsonb_build_object('t', t.pay_rate_type, 'h', t.hourly_rate_vnd, 'p', t.per_session_rate_vnd)
                       FROM public.teachers t WHERE t.id = p_teacher)) $f$;
  INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ('${T1}', '${first(2)}', 'hourly', 200000);
  INSERT INTO payroll_periods(month, status) VALUES ('${MONTHS[1]}', 'locked');
`);
const priced = async () => new Map((await q(`SELECT s.id, s.date::text d, public.zz_rate_on(s.teacher_id, s.date)::text r FROM sessions s
                                              WHERE s.teacher_id = $1 AND s.status = 'Held'`, [T1])).map((r) => [r.id, r]));
const PAY = [];
for (let i = 0; i < MONTHS.length; i++) {
  PAY.push([`a rate from ${mid(i)}`, { teacher_id: T1, effective_from: mid(i), pay_rate_type: 'hourly', hourly_rate_vnd: 250000, per_session_rate_vnd: 0 },
    `INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ('${T1}','${mid(i)}','hourly',250000)`]);
}
PAY.push(['a rate from tomorrow', { teacher_id: T1, effective_from: (await q1(`SELECT to_char($1::date + 1, 'YYYY-MM-DD') d`, [TODAY])).d,
  pay_rate_type: 'per_session', hourly_rate_vnd: 0, per_session_rate_vnd: 300000 },
  `INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, per_session_rate_vnd, hourly_rate_vnd)
   VALUES ('${T1}', ('${TODAY}'::date + 1), 'per_session', 300000, 0)`]);
PAY.push(['the existing dated rate corrected in place', { teacher_id: T1, effective_from: first(2), pay_rate_type: 'hourly', hourly_rate_vnd: 210000, per_session_rate_vnd: 0 },
  `UPDATE staff_pay_rates SET hourly_rate_vnd = 210000 WHERE teacher_id='${T1}' AND effective_from='${first(2)}'`]);
PAY.push(['the mirror column on the teacher (no dated rate covers the first two months)', null,
  `UPDATE teachers SET hourly_rate_vnd = 150000 WHERE id='${T1}'`]);
let payMoved = 0;
for (const [label, args, raw] of PAY) {
  const before = await priced();
  let plan = null, rawRefused = null, moved = [], failure = null;
  await db.exec('BEGIN');
  try {
    if (args) plan = (await as(ADMIN, 'authenticated', 'authenticated', `SELECT public.money_change_preview('pay_rate','set',$1::jsonb) r`, [JSON.stringify(args)])).rows[0].r;
    await db.exec('SAVEPOINT raw_attempt');
    try {
      await db.exec(`SELECT set_config('test.uid', '${ADMIN}', true), set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated; ${raw};`);
    } catch (x) { rawRefused = x.code; }
    await db.exec(`ROLLBACK TO SAVEPOINT raw_attempt; RESET ROLE; SELECT set_config('test.uid', '', true), set_config('test.jwt_role', '', true);`);
    await db.exec(raw);
    const after = await priced();
    for (const [id, was] of before) if (after.get(id).r !== was.r) moved.push({ date: was.d, locked: was.d.slice(0, 7) === MONTHS[1] });
  } catch (x) { failure = `${x.code ?? ''} ${x.message}`; }
  await db.exec('ROLLBACK').catch(() => {});
  await db.exec('RESET ROLE').catch(() => {});
  if (failure) { ok(`pay: ${label}: the oracle ran`, false, failure); continue; }
  const taught = moved.filter((x) => x.date < TODAY);
  if (taught.length > 0) payMoved += 1;
  const tier = plan ? Number(plan.tier ?? 3) : (rawRefused === 'HC120' ? 1 : 0);
  ok(`pay: ${label} T${plan ? tier : (rawRefused ? '1+' : 0)}: ${taught.length === 0 ? 'no taught lesson changed price' : `${taught.length} taught lesson(s) changed price, and the guard asked`}`,
     taught.length === 0 || (tier >= 1 && (!taught.some((x) => x.locked) || !plan || tier === 3)), { tier, rawRefused, taught: taught.length });
  if (plan?.change?.mirror) {
    // The checked 'set' also moves the staff row's "rate now", which pays the dates no dated rate covers; the
    // raw INSERT does not. The plan's tier is of both writes, the trigger's of the one row: they need not agree.
    ok(`  the plan counts the mirror too: at least the trigger's tier (raw ${rawRefused ?? 'allowed'})`, tier >= (rawRefused === 'HC120' ? 1 : 0), { tier, rawRefused });
  } else {
    ok(`  the trigger agrees: the raw statement by an admin is ${tier >= 1 ? 'refused' : 'allowed'}`,
       tier >= 1 ? rawRefused === 'HC120' : rawRefused === null, { tier, rawRefused });
  }
}
ok(`the pay oracle is not vacuous: ${payMoved} of ${PAY.length} rate edits re-priced a lesson already taught`, payMoved >= 4, { payMoved });

const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
