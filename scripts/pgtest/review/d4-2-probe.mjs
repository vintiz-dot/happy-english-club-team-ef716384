// D4-2 independent review probe (docs/evidence/D4-2-review.md). pglite only,
// real migration files, synthetic rows. Not registered in run.mjs: run by hand
//   node scripts/pgtest/review/d4-2-probe.mjs
// Prints one line per case: PASS = the code behaves as the review expects
// (a guard holds), NOTE = a behaviour the review reports as a finding.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, makeDb, sqlOf, repo, D4_CLASS_FEE } from '../d4-prelude.mjs';

const mig = (n) => resolve(repo, 'supabase', 'migrations', n);
const FEE_FILE = process.env.D4_FEE_FILE || mig('20261114092000_d4_class_fee_history.sql');
const BASE = ['20261009130000_audit_every_admin_action.sql', '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql', '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql', '20261106120000_invoice_tuition_freeze.sql',
  '20261114090000_d4_floors.sql', '20261114091000_d4_core_register.sql'].map(mig);

let db = await makeDb(PGlite, { people: true, rls: true, migrations: [] });
await db.exec(D4_CLASS_FEE);
for (const m of BASE) await db.exec(sqlOf(m));
await db.exec(sqlOf(FEE_FILE));
const H = harness(() => db);
const { ok, section, as, tryIt, script } = H;
let notes = 0;
const note = (name, extra) => { notes++; console.log(`  NOTE ${name}${extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`); };

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'teacher')`, [ADMIN, TEACHER]);
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const months = (await db.query(`SELECT
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month', 'YYYY-MM-DD') AS next,
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS cur,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days'), 'YYYY-MM-DD') AS past,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') - interval '1 month', 'YYYY-MM-DD') AS past2,
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month' + interval '9 days', 'YYYY-MM-DD') AS next_lesson,
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '2 days', 'YYYY-MM-DD') AS cur_lesson,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') + interval '9 days', 'YYYY-MM-DD') AS past_lesson,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') - interval '1 month' + interval '9 days', 'YYYY-MM-DD') AS past2_lesson`)).rows[0];
const M = (d) => d.slice(0, 7);
const mkClass = async (fee) => { const id = randomUUID(); await asSuper(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$2,$3,'c')`, [id, TEACHER, fee]); return id; };
const lesson = async (cid, date, status = 'Held') => (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,gen_random_uuid()) RETURNING id`, [cid, date, status])).rows[0].id;
const kid = async (cid) => { const id = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id; await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [cid, id]); return id; };
const att = (sid, k, status = 'Present', by = TEACHER) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, k, status, by]);
const inv = (k, month, { recorded = 0, conf = 'auto_approved', frozen = false } = {}) => asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen) VALUES ($1,$2,'issued',600000,600000,$3,$4,$5)`, [k, month, recorded, conf, frozen]);
const preview = async (op, args) => (await as(ADMIN, 'authenticated', 'authenticated', `SELECT public.money_change_preview('class_fee',$1,$2::jsonb) r`, [op, JSON.stringify(args)])).rows[0].r;
const checked = (op, args, { reason = null, token = null, confirm = false, corr = null } = {}) =>
  as(ADMIN, 'authenticated', 'authenticated', `SELECT public.money_change_checked('class_fee',$1,$2::jsonb,$3,$4,$5,$6,'{}'::jsonb) r`, [op, JSON.stringify(args), reason, token, confirm, corr]).then((r) => r.rows[0].r);
const R = 'Reviewer probe: a reason long enough';
const go = async (op, args) => { const p = await preview(op, args); return checked(op, args, { reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, corr: p.tier === 3 ? R + ' (corr)' : null }); };
const monthsOf = (pairs) => [...new Set((pairs ?? []).map((p) => p.month))].sort();

await section('P1 admin-data-import: service-role upsert of classes', async () => {
  const c = await mkClass(200000);
  let r = await tryIt(() => asService(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$2,250000,'c')
    ON CONFLICT (id) DO UPDATE SET session_rate_vnd = EXCLUDED.session_rate_vnd, name = EXCLUDED.name`, [c, TEACHER]));
  ok('upsert of an existing class with another fee -> HC120 (import cannot re-price)', r.code === 'HC120', r);
  r = await tryIt(() => asService(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$2,200000,'renamed')
    ON CONFLICT (id) DO UPDATE SET session_rate_vnd = EXCLUDED.session_rate_vnd, name = EXCLUDED.name`, [c, TEACHER]));
  ok('upsert of an existing class with the same fee -> passes', r.ok !== undefined, r);
  const n = randomUUID();
  r = await tryIt(() => asService(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$2,175000,'new')
    ON CONFLICT (id) DO UPDATE SET session_rate_vnd = EXCLUDED.session_rate_vnd`, [n, TEACHER]));
  const h = (await asSuper(`SELECT effective_from::text f, session_rate_vnd v FROM class_fee_history WHERE class_id=$1`, [n])).rows;
  ok('upsert of a NEW class -> its 1900 row at the imported fee', r.ok !== undefined && h.length === 1 && h[0].v === 175000, { r, h });
  r = await tryIt(() => asService(`UPDATE classes SET session_rate_vnd = NULL WHERE id=$1`, [c]));
  ok('mirror set to NULL by the service role -> refused (NOT NULL or HC120)', r.code === 'HC120' || r.code === '23502', r);
});

await section('P2 a correction spanning two months takes the HIGHER month tier', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  await att(await lesson(c, months.past2_lesson), k);
  await att(await lesson(c, months.past_lesson), k);
  await inv(k, M(months.past2), { recorded: 600000 });          // paid      -> T2
  await inv(k, M(months.past), { conf: 'confirmed' });          // confirmed -> T3
  const p = await preview('set', { class_id: c, effective_from: months.past2, session_rate_vnd: 120000 });
  ok('row at past2 with no later row: reach covers past2 AND past; tier 3 (the confirmed later month)', p.tier === 3 &&
     JSON.stringify(monthsOf(p.refresh_pairs)) === JSON.stringify([M(months.past2), M(months.past)]), { tier: p.tier, m: monthsOf(p.refresh_pairs) });
});

await section('P3 a child whose only charged marks are Absent is reached', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  await att(await lesson(c, months.past_lesson), k, 'Absent');
  await inv(k, M(months.past), { recorded: 600000 });
  const p = await preview('set', { class_id: c, effective_from: months.past, session_rate_vnd: 120000 });
  ok('Absent-only child in a paid past month: T2, in student_ids', p.tier === 2 && (p.student_ids ?? []).includes(k), { tier: p.tier });
});

await section('P4 a fee from next month when next month is ALREADY billed (and paid)', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  await att(await lesson(c, months.next_lesson, 'Scheduled'), k, 'Present', null);   // seeded placeholder
  await inv(k, M(months.next), { recorded: 600000 });
  const p = await preview('set', { class_id: c, effective_from: months.next, session_rate_vnd: 130000 });
  const reachesBill = (p.invoices_before ?? []).length > 0 && monthsOf(p.refresh_pairs).includes(M(months.next));
  ok('server: T0 (not a past month), the pre-issued paid bill is in invoices_before and refresh_pairs', p.tier === 0 && reachesBill, { tier: p.tier, rp: p.refresh_pairs });
  if (p.tier === 0 && reachesBill) note('the screen confirms this at once with no dialog and says "Nothing already billed changes" - the paid next-month bill is re-priced (ClassFeeHistory.tsx:103-118, classFee.ts futureNote)');
});

await section('P5 a fee from THIS month reaches paid current bills at T0', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  await att(await lesson(c, months.cur_lesson), k);
  await inv(k, M(months.cur), { recorded: 600000 });
  const p = await preview('set', { class_id: c, effective_from: months.cur, session_rate_vnd: 130000 });
  ok('this month, paid, not signed: T0 by design (b.0), the bill is in refresh_pairs', p.tier === 0 && monthsOf(p.refresh_pairs).includes(M(months.cur)), { tier: p.tier });
  note('one click, no dialog, no reason: a paid current-month bill is re-priced (design b.0 rule; the screen does say "this month\'s bills are worked out again")');
});

await section('P6 the 1900 baseline row through the checked path', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  for (const d of [months.past2_lesson, months.past_lesson]) await att(await lesson(c, d), k);
  await inv(k, M(months.past2), { conf: 'confirmed' }); await inv(k, M(months.past), { recorded: 1 });
  const p = await preview('set', { class_id: c, effective_from: '1900-01-01', session_rate_vnd: 90000 });
  ok('set on the 1900 row: allowed only as a correction (T3 here), every month since the start reached', p.allowed && p.tier === 3 &&
     JSON.stringify(monthsOf(p.refresh_pairs)) === JSON.stringify([M(months.past2), M(months.past)]), { allowed: p.allowed, tier: p.tier, rc: p.refuse_code });
});

await section('P7 the acknowledgement of one month cannot write a LATER month (same transaction)', async () => {
  const c = await mkClass(100000);
  const ins = `INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
    VALUES ('${ADMIN}','class_fee','set','${c}','{}'::uuid[],'${months.past2}',NULL,'single',0,false,'test reason long enough',true,'x','{}',
    '${JSON.stringify({ class_id: c, effective_from: months.past2, session_rate_vnd: 130000 })}','{}','[]','[]','{}',false) RETURNING id`;
  const e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins} INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.jwt_role', 'service_role', true); END $x$;
    SET LOCAL ROLE service_role; INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${c}','${months.next}',130000)`);
  ok('ack for past2 used for a row at next month -> HC120 (only the trigger\'s own effective_from test refuses it: _money_ack alone accepts a later month)', e?.code === 'HC120', e);
});

await section('P8 a DELETE of a dated row made by another trigger (depth 2), class still there', async () => {
  const c = await mkClass(100000);
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,120000)`, [c, months.past]);
  await db.exec(`CREATE TABLE IF NOT EXISTS public.zz_del_relay(class_id uuid, effective_from date);
    CREATE OR REPLACE FUNCTION public.zz_del_relay_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    BEGIN DELETE FROM public.class_fee_history WHERE class_id = NEW.class_id AND effective_from = NEW.effective_from; RETURN NULL; END $f$;
    DROP TRIGGER IF EXISTS zz_del_relay ON public.zz_del_relay;
    CREATE TRIGGER zz_del_relay AFTER INSERT ON public.zz_del_relay FOR EACH ROW EXECUTE FUNCTION public.zz_del_relay_trg();
    GRANT ALL ON public.zz_del_relay TO service_role`);
  const r = await tryIt(() => asService(`INSERT INTO zz_del_relay VALUES ($1,$2)`, [c, months.past]));
  ok('service lane, another trigger deleting a dated row of a live class -> HC120', r.code === 'HC120', r);
  await db.exec(`DROP TABLE zz_del_relay; DROP FUNCTION zz_del_relay_trg()`);
});

await section('P9 the mirror after a month turn (stale "fee now")', async () => {
  const c = await mkClass(100000);
  await go('set', { class_id: c, effective_from: months.next, session_rate_vnd: 130000 });
  const before = (await asSuper(`SELECT session_rate_vnd v FROM classes WHERE id=$1`, [c])).rows[0].v;
  const onNext = (await asSuper(`SELECT public.class_fee_on($1,$2::date) v`, [c, months.next_lesson])).rows[0].v;
  ok('the mirror stays at today\'s fee (100000) while the history says 130000 from next month', before === 100000 && onNext === 130000, { before, onNext });
  note('nothing re-levels the mirror when next month starts: classes.session_rate_vnd reads 100000 all next month (display screens, browser finance estimates, v_projected_base)');
  const r = await tryIt(() => as(TEACHER, 'authenticated', 'authenticated', `UPDATE classes SET session_rate_vnd = 999 WHERE id=$1`, [c]));
  ok('a teacher writing the mirror -> refused (HC120 or no row)', r.code === 'HC120' || r.code === '42501' || (r.ok && r.ok.rowCount === 0) || r.ok?.affectedRows === 0, r);
});

// ---------------------------------------------- the calculators, fed from what the checked path wrote
const handlers = {};
let fixture = {};
const client = () => ({ from(table) {
  let rows = fixture[table] || [];
  rows.forEach((r, i) => { if (r.id == null) r.id = `${table}-${String(i).padStart(6, '0')}`; });
  let orderKey = null, lim = Infinity;
  const page = () => { const out = orderKey ? [...rows].sort((a, b) => (String(a[orderKey]) < String(b[orderKey]) ? -1 : String(a[orderKey]) > String(b[orderKey]) ? 1 : 0)) : rows; return out.slice(0, lim); };
  const q = {
    select() { return q; }, order(k) { orderKey = k; return q; }, limit(n) { lim = n; return q; },
    gt(k, v) { rows = rows.filter((r) => String(r[k]) > String(v)); return q; },
    eq(k, v) { rows = rows.filter((r) => r[k] === v); return q; },
    neq(k, v) { rows = rows.filter((r) => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter((r) => vs.includes(r[k])); return q; },
    gte(k, v) { rows = rows.filter((r) => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter((r) => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter((r) => r[k] <= v); return q; },
    or() { return q; }, not() { return q; },
    single() { return Promise.resolve({ data: rows[0], error: null }); },
    maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
    upsert() { return Promise.resolve({ error: null }); },
    update() { return q; }, insert() { return Promise.resolve({ error: null }); },
    then(done, bad) { return Promise.resolve({ data: page(), error: null }).then(done, bad); },
  };
  return q;
} });
globalThis.__d4ReviewClient = client;
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
const out = mkdtempSync(join(tmpdir(), 'd4-2-review-'));
const bundleOf = async (entry) => {
  const b = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(bb) {
      bb.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ }, (args) => ({ path: args.path, namespace: 'test' }));
      bb.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__d4ReviewClient;' :
        args.path.includes('zod') ? 'const chain = new Proxy({}, {get: (_, key) => key === "parse" ? v => ({siblingPreview: false, ...v}) : () => chain}); export const z = chain;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => ({isServiceRole: false, roles: new Set(["admin"])}); export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async () => { throw new Error("Unexpected family calculation"); };' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};' }));
    } }] });
  const file = join(out, `${createHash('md5').update(entry).digest('hex')}.mjs`);
  writeFileSync(file, b.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
  await bundleOf(resolve(repo, 'supabase', 'functions', name, 'index.ts'));
  handlers[name] = handlers.current;
}
const S = '22222222-2222-4222-8222-222222222222';
const call = async (name, month) => {
  const res = await handlers[name](new Request('http://localhost/fn', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
    body: JSON.stringify({ studentId: S, studentIds: [S], month }) }));
  const body = await res.json();
  return { status: res.status, r: name.endsWith('-bulk') ? body.results?.[0] : body };
};

await section('P10 end to end: the history the checked path writes, priced by both calculators', async () => {
  const c = await mkClass(100000);
  const k = await kid(c);
  const dates = [months.past2_lesson, months.past_lesson, months.cur_lesson, months.next_lesson];
  for (const d of dates) await att(await lesson(c, d, d === months.next_lesson ? 'Scheduled' : 'Held'), k);
  await inv(k, M(months.past2), { recorded: 600000 }); await inv(k, M(months.past), { recorded: 600000 });
  const world = async (frozenPast2 = false) => {
    const cls = { id: c, name: 'C', session_rate_vnd: (await asSuper(`SELECT session_rate_vnd v FROM classes WHERE id=$1`, [c])).rows[0].v };
    const hist = (await asSuper(`SELECT id::text, class_id::text, effective_from::text, session_rate_vnd FROM class_fee_history WHERE class_id=$1`, [c])).rows;
    fixture = {
      students: [{ id: S, family_id: null, families: null, is_active: true }], classes: [cls],
      invoices: frozenPast2 ? [{ id: 'inv-f', student_id: S, month: M(months.past2), tuition_frozen: true, base_amount: 100000, discount_amount: 0,
        total_amount: 100000, recorded_payment: 100000, status: 'paid', confirmation_status: 'confirmed', review_flags: [] }] : [],
      enrollments: [{ id: 'e1', created_at: '2020-01-01', student_id: S, class_id: c, discount_type: null, discount_value: null, discount_cadence: null,
        rate_override_vnd: null, start_date: '2020-01-01', end_date: null, allowed_days: null, classes: cls }],
      sessions: dates.map((date, i) => ({ id: `s${i}`, date, class_id: c, status: i === 3 ? 'Scheduled' : 'Held', classes: cls })),
      discount_assignments: [], referral_bonuses: [], settlements: [], class_fee_history: hist, v_projected_base: [],
    };
    fixture.attendance = fixture.sessions.map((s) => ({ session_id: s.id, student_id: S, status: 'Present' }));
  };
  const priced = async (frozen) => {
    await world(frozen);
    const o = {};
    for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) for (const m of [months.past2, months.past, months.cur, months.next]) {
      const r = await call(name, M(m)); o[`${name}:${M(m)}`] = r.status === 200 ? r.r.totalAmount : `HTTP ${r.status}`;
    }
    return o;
  };
  const p0 = await priced(false);
  ok('baseline only: every month 100000', Object.values(p0).every((v) => v === 100000), p0);
  await go('set', { class_id: c, effective_from: months.next, session_rate_vnd: 130000 });
  const p1 = await priced(false);
  ok('a row from next month: past2, past and THIS month unchanged; next month 130000 (both calculators)',
     ['calculate-tuition', 'calculate-tuition-bulk'].every((n) => p1[`${n}:${M(months.past2)}`] === 100000 && p1[`${n}:${M(months.past)}`] === 100000 &&
       p1[`${n}:${M(months.cur)}`] === 100000 && p1[`${n}:${M(months.next)}`] === 130000), p1);
  const raw = await tryIt(() => asService(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,110000)`, [c, months.past]));
  const pr = await preview('set', { class_id: c, effective_from: months.past, session_rate_vnd: 110000 });
  const noReason = await tryIt(() => checked('set', { class_id: c, effective_from: months.past, session_rate_vnd: 110000 }, { token: pr.token }));
  ok('a past-dated row: raw service write HC120, checked without a reason HC010, nothing written', raw.code === 'HC120' && noReason.code === 'HC010' &&
     (await asSuper(`SELECT count(*)::int n FROM class_fee_history WHERE class_id=$1 AND effective_from=$2`, [c, months.past])).rows[0].n === 0, { raw: raw.code, nr: noReason.code });
  await go('set', { class_id: c, effective_from: months.past, session_rate_vnd: 110000 });
  const p2 = await priced(false);
  ok('acknowledged: past2 still 100000; past and this month 110000; next month 130000 (only the reached months moved)',
     ['calculate-tuition', 'calculate-tuition-bulk'].every((n) => p2[`${n}:${M(months.past2)}`] === 100000 && p2[`${n}:${M(months.past)}`] === 110000 &&
       p2[`${n}:${M(months.cur)}`] === 110000 && p2[`${n}:${M(months.next)}`] === 130000), p2);
  await go('set', { class_id: c, effective_from: '1900-01-01', session_rate_vnd: 90000 });
  const p3 = await priced(true);
  ok('baseline corrected to 90000 with past2 frozen: past2 stays at its saved 100000 (calculate-tuition)', p3[`calculate-tuition:${M(months.past2)}`] === 100000, p3);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed, ${notes} notes`);
process.exit(fail ? 1 : 0);
