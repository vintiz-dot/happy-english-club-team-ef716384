// D4 step 2: dated class fees (G-16, review R-9).
// Drives the REAL migrations in paste order (see run.mjs for the list), the
// step's rollback script as the last argument, the real calculators bundled
// with esbuild, and the golden-figure gate of invoice-status.test.mjs run
// unchanged under four states of the fee history.
//
// Spec: docs/evidence/D4-design.md revision 2 b.4 G-16, c.3, (d) step 2,
// f.2 / f.3 / f.6 / f.7; docs/evidence/D4-build-2.md.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, makeDb, sqlOf, repo, D4_CLASS_FEE } from './d4-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 10) {
  console.error('usage: d4-class-fee.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> <d4 class fee> <rollback 3>');
  process.exit(2);
}
const [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF, coreF, feeF, rb3F] = files;
const base = [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF, coreF];
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, must, script, clock } = H;

// The live classes table carries the fee (D4_CLASS_FEE); D2's prelude has none.
async function freshDb(migs, { withClassFee = true } = {}) {
  const d = await makeDb(PGlite, { people: true, rls: true, migrations: [] });
  await d.exec(D4_CLASS_FEE);
  for (const m of migs) await d.exec(sqlOf(m));
  if (withClassFee) await d.exec(sqlOf(feeF));
  return d;
}

// ------------------------------------------------------------ preflight
await section('preflight', async () => {
  const bare = await freshDb(base.filter((f) => f !== coreF), { withClassFee: false });
  let msg = null;
  try { await bare.exec(sqlOf(feeF)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('without D4 file 2 the file refuses, naming what is missing', /d4_class_fee_history cannot be installed/.test(msg ?? '') &&
     /tuition_reach|_money_ack|money_change/.test(msg ?? ''), msg);
  ok('  and installs nothing', (await bare.query(`SELECT to_regclass('public.class_fee_history') t,
      (SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE '%class_fee%') n`)).rows.every((r) => r.t === null && r.n === 0));
  await bare.close();

  const x = await freshDb(base, { withClassFee: false });
  await x.exec(`CREATE OR REPLACE FUNCTION public._money_ack(p_entities text[], p_target uuid, p_student uuid, p_from date, p_to date, p_tier int)
    RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $f$ SELECT true $f$;`);
  msg = null;
  try { await x.exec(sqlOf(feeF)); } catch (e) { msg = e.message; }
  await x.exec('ROLLBACK').catch(() => {});
  ok('a _money_ack that is not the reviewed 1b body -> refused, naming it', /_money_ack\(.*\) is not the reviewed/.test(msg ?? ''), msg);
  await x.close();

  const y = await freshDb(base, { withClassFee: false });
  const def = (await y.query(`SELECT pg_get_functiondef('public.tuition_reach(uuid[], uuid, date, date)'::regprocedure) d`)).rows[0].d;
  await y.exec(def.replace(/\n/g, '\r\n'));
  msg = null;
  try { await y.exec(sqlOf(feeF)); } catch (e) { msg = e.message; }
  await y.exec('ROLLBACK').catch(() => {});
  ok('the same 1b body pasted with CRLF is accepted (md5 of the CR-stripped text)', msg === null, msg);
  await y.close();

  const z = await freshDb(base, { withClassFee: false });
  await z.query(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd) VALUES (gen_random_uuid(), gen_random_uuid(), -5)`);
  msg = null;
  try { await z.exec(sqlOf(feeF)); } catch (e) { msg = e.message; }
  await z.exec('ROLLBACK').catch(() => {});
  ok('a class with a negative fee -> refused (it would change what is billed), nothing installed',
     /a fee of 0 or more for the classes/.test(msg ?? '') && (await z.query(`SELECT to_regclass('public.class_fee_history') t`)).rows[0].t === null, msg);
  await z.close();
});

// ------------------------------------------------------------ install
db = await freshDb(base, { withClassFee: false });
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'family'),($3,'teacher')`, [ADMIN, PARENT, TEACHER]);
const PRE_A = randomUUID(), PRE_B = randomUUID();
await db.query(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$3,150000,'A'),($2,$3,0,'B')`, [PRE_A, PRE_B, TEACHER]);
const catalog = async () => (await db.query(`SELECT
   (SELECT md5(string_agg(p.oid::regprocedure::text || md5(p.prosrc) || p.prosecdef || COALESCE(p.proconfig::text,''), ',' ORDER BY p.oid::regprocedure::text))
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace) f,
   (SELECT md5(string_agg(c.relname || '.' || t.tgname || pg_get_triggerdef(t.oid) || t.tgenabled::text, ',' ORDER BY c.relname, t.tgname))
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal) t`)).rows[0];
const fnsBefore = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
   has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
const trgBefore = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
const rowsDigest = async () => (await db.query(`SELECT
   (SELECT md5(COALESCE(string_agg(to_jsonb(c)::text, ',' ORDER BY c.id), '')) FROM classes c) c,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM attendance a) a,
   (SELECT md5(COALESCE(string_agg(to_jsonb(i)::text, ',' ORDER BY i.id), '')) FROM invoices i) i,
   (SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, ',' ORDER BY s.id), '')) FROM sessions s) s`)).rows[0];
{
  const sid = (await db.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1, CURRENT_DATE - 40,'17:30','19:00','Held',gen_random_uuid()) RETURNING id`, [PRE_A])).rows[0].id;
  await db.query(`INSERT INTO attendance(session_id,student_id,status) VALUES ($1, gen_random_uuid(), 'Present')`, [sid]);
  await db.query(`INSERT INTO invoices(student_id, month, total_amount) VALUES (gen_random_uuid(), to_char(CURRENT_DATE - 40, 'YYYY-MM'), 150000)`);
}
const digestBefore = await rowsDigest();
const eventsBefore = (await db.query(`SELECT count(*)::int n FROM money_change_events`)).rows[0].n;
await db.exec(sqlOf(feeF));

await section('install', async () => {
  ok('no existing row rewritten (classes, attendance, invoices, sessions identical)', JSON.stringify(await rowsDigest()) === JSON.stringify(digestBefore));
  const b = (await db.query(`SELECT class_id, effective_from::text f, session_rate_vnd v FROM class_fee_history ORDER BY session_rate_vnd`)).rows;
  ok('the baseline: one 1900-01-01 row per class, at the fee it has today (0 included)', b.length === 2 &&
     b[0].class_id === PRE_B && b[0].v === 0 && b[1].class_id === PRE_A && b[1].v === 150000 && b.every((r) => r.f === '1900-01-01'), b);
  const c1 = await catalog();
  let e = null; try { await db.exec(sqlOf(feeF)); } catch (x) { e = x.message; }
  ok('the file applies a second time', e === null, e);
  ok('  as a no-op on functions and triggers, with no new history row and no event',
     JSON.stringify(await catalog()) === JSON.stringify(c1) &&
     (await db.query(`SELECT count(*)::int n FROM class_fee_history`)).rows[0].n === 2 &&
     (await db.query(`SELECT count(*)::int n FROM money_change_events`)).rows[0].n === eventsBefore);
  const after = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
     has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
  const changed = [...fnsBefore.keys()].filter((k) => JSON.stringify(fnsBefore.get(k)) !== JSON.stringify(after.get(k)));
  ok('no existing function is replaced or re-granted (D1, D2, files 1 and 2 untouched; the dispatcher not re-created)', changed.length === 0, changed);
  const trgAfter = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
  const added = trgAfter.filter((x) => !trgBefore.some((y) => y.k === x.k)).map((x) => x.k).sort();
  ok('every trigger that existed is unchanged; added: exactly the five of this file',
     trgBefore.every((x) => JSON.stringify(trgAfter.find((y) => y.k === x.k)) === JSON.stringify(x)) &&
     JSON.stringify(added) === JSON.stringify(['class_fee_history.audit_class_fee_history', 'class_fee_history.class_fee_history_no_truncate',
       'class_fee_history.zz_class_fee_money_guard', 'classes.class_fee_baseline', 'classes.zz_class_fee_mirror_guard']), added);
  const fns = (await db.query(`SELECT proname, proconfig, has_function_privilege('anon', oid, 'EXECUTE') an,
      has_function_privilege('authenticated', oid, 'EXECUTE') au, has_function_privilege('service_role', oid, 'EXECUTE') sr
      FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND oid::regprocedure::text NOT IN (SELECT unnest($1::text[]))`, [[...fnsBefore.keys()]])).rows;
  ok('eight new functions, each pins search_path=public', fns.length === 8 && fns.every((f) => (f.proconfig ?? []).includes('search_path=public')),
     fns.map((f) => f.proname));
  ok('nobody may call any of them directly (anon, authenticated, service_role): the fee is changed through money_change_checked',
     fns.every((f) => !f.an && !f.au && !f.sr), fns.map((f) => `${f.proname}:${f.an}${f.au}${f.sr}`));
  const t = (await db.query(`SELECT c.relrowsecurity rls, has_table_privilege('authenticated', c.oid, 'SELECT') s,
      has_table_privilege('authenticated', c.oid, 'INSERT') i, has_table_privilege('authenticated', c.oid, 'UPDATE') u,
      has_table_privilege('authenticated', c.oid, 'DELETE') d, has_table_privilege('anon', c.oid, 'SELECT') an,
      has_table_privilege('service_role', c.oid, 'INSERT') si FROM pg_class c WHERE c.relname = 'class_fee_history'`)).rows[0];
  ok('table: RLS on; authenticated SELECT only (no write grant, no write policy); anon nothing; service_role the house-rule ALL',
     t.rls && t.s && !t.i && !t.u && !t.d && !t.an && t.si, t);
  const pol = (await db.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'class_fee_history'`)).rows;
  ok('one policy, SELECT', pol.length === 1 && pol[0].cmd === 'SELECT', pol);
  ok('the conflict key is a plain UNIQUE (class_id, effective_from), no partial unique index',
     (await db.query(`SELECT count(*)::int n FROM pg_index i WHERE i.indrelid = 'public.class_fee_history'::regclass AND i.indisunique AND i.indpred IS NOT NULL`)).rows[0].n === 0 &&
     (await db.query(`SELECT count(*)::int n FROM pg_constraint WHERE conrelid = 'public.class_fee_history'::regclass AND contype = 'u'
        AND pg_get_constraintdef(oid) = 'UNIQUE (class_id, effective_from)'`)).rows[0].n === 1);
  ok('the paste fails fast: SET LOCAL lock_timeout = \'5s\' right after BEGIN', /BEGIN;\s*(--[^\n]*\n\s*)*SET LOCAL lock_timeout = '5s';/.test(sqlOf(feeF)));
  const n = async (uid) => (await as(uid, 'authenticated', 'authenticated', `SELECT count(*)::int n FROM class_fee_history`)).rows[0].n;
  ok('F-3: admins read the history; a teacher and a parent read none', (await n(ADMIN)) === 2 && (await n(TEACHER)) === 0 && (await n(PARENT)) === 0);
  ok('  the one policy names no role but admin (no has_role(.., \'teacher\'))', !/teacher/.test((await db.query(`SELECT qual FROM pg_policies WHERE tablename = 'class_fee_history'`)).rows[0].qual));
});

// ------------------------------------------------------------ fixtures
const R = 'The fee was agreed with the parents in September';
const CORR = 'Correction: the bill was confirmed at the old fee';
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const asSuper = (sql, p) => as(null, '', null, sql, p);

const months = (await db.query(`SELECT
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month', 'YYYY-MM-DD') AS next,
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS cur,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days'), 'YYYY-MM-DD') AS past,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') - interval '1 month', 'YYYY-MM-DD') AS past2,
   to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month' + interval '9 days', 'YYYY-MM-DD') AS next_lesson,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') + interval '9 days', 'YYYY-MM-DD') AS past_lesson,
   to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '40 days') - interval '1 month' + interval '9 days', 'YYYY-MM-DD') AS past2_lesson,
   to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS today`)).rows[0];
const M = (d) => d.slice(0, 7);
const NOW = await clock(0, 0);

async function mkClass(fee, name = 'class') {
  const id = randomUUID();
  await asSuper(`INSERT INTO classes(id, default_teacher_user, session_rate_vnd, name) VALUES ($1,$2,$3,$4)`, [id, TEACHER, fee, name]);
  return id;
}
async function lesson(cid, date, status = 'Held') {
  return (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,gen_random_uuid()) RETURNING id`,
    [cid, date, status])).rows[0].id;
}
async function kid(cid, family = null) {
  const id = (await asSuper(`INSERT INTO students(full_name, family_id) VALUES ('k', $1) RETURNING id`, [family])).rows[0].id;
  if (cid) await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [cid, id]);
  return id;
}
const att = (sid, k, status = 'Present', by = null) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, k, status, by]);
const inv = (k, month, { recorded = 0, conf = 'auto_approved', frozen = false } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
           VALUES ($1,$2,'issued',600000,600000,$3,$4,$5)`, [k, month, recorded, conf, frozen]);
const preview = async (op, args, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_preview('class_fee',$1,$2::jsonb) r`, [op, JSON.stringify(args)])).rows[0].r;
const checked = (op, args, { reason = null, token = null, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_checked('class_fee',$1,$2::jsonb,$3,$4,$5,$6,'{}'::jsonb) r`,
    [op, JSON.stringify(args), reason, token, confirm, corr]).then((r) => r.rows[0].r);
const go = async (op, args) => {
  const p = await preview(op, args);
  return checked(op, args, { reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, corr: p.tier === 3 ? CORR : null });
};
const hist = async (cid) => (await asSuper(`SELECT effective_from::text f, session_rate_vnd v, note, created_by FROM class_fee_history WHERE class_id=$1 ORDER BY effective_from`, [cid])).rows;
const mirror = async (cid) => (await asSuper(`SELECT session_rate_vnd v FROM classes WHERE id=$1`, [cid])).rows[0].v;
const feeOn = async (cid, d) => (await asSuper(`SELECT public.class_fee_on($1,$2::date) v`, [cid, d])).rows[0].v;
const events = async (kind) => (await asSuper(`SELECT * FROM money_change_events WHERE kind=$1 ORDER BY created_at, id`, [kind])).rows;
const invDigest = async () => (await asSuper(`SELECT md5(COALESCE(string_agg(to_jsonb(i)::text, ',' ORDER BY i.id), '')) d FROM invoices i`)).rows[0].d;
const monthsOf = (pairs) => [...new Set((pairs ?? []).map((p) => p.month))].sort();

// ------------------------------------------------------------ resolver and the two class triggers
await section('class_fee_on and the class triggers', async () => {
  const c = await mkClass(100000);
  ok('a new class gets its 1900 row at the fee it was created with (class_fee_baseline, past the guard)',
     JSON.stringify((await hist(c)).map((r) => [r.f, r.v])) === JSON.stringify([['1900-01-01', 100000]]));
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,120000),($1,$3,150000)`, [c, months.past, months.next]);
  ok('class_fee_on: before the first dated row -> the baseline', (await feeOn(c, months.past2_lesson)) === 100000);
  ok('class_fee_on: on the row\'s first day, and later that month -> that row', (await feeOn(c, months.past)) === 120000 && (await feeOn(c, months.past_lesson)) === 120000);
  ok('class_fee_on: the newest row on or before the date, never a later one', (await feeOn(c, months.today)) === 120000 && (await feeOn(c, months.next)) === 150000 &&
     (await feeOn(c, '2100-01-01')) === 150000);
  ok('class_fee_on: no row for the class -> NULL (the readers then use the mirror)', (await feeOn(randomUUID(), months.today)) === null);
  const r = await tryIt(() => asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,1)`, [c, months.past_lesson]));
  ok('a row not on the first of a month is refused by the table (CHECK)', r.code === '23514', r);
  const r2 = await tryIt(() => asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,'2031-01-01',-1)`, [c]));
  ok('a negative fee is refused by the table (CHECK)', r2.code === '23514', r2);
  const empty = await mkClass(90000);
  const r3 = await tryIt(() => asSuper(`DELETE FROM classes WHERE id=$1`, [empty]));
  ok('deleting a class with no lessons still works: its rows go with it (the cascade passes the guard)', r3.ok !== undefined &&
     (await hist(empty)).length === 0, r3);
  const r4 = await tryIt(() => asSuper(`TRUNCATE class_fee_history`));
  ok('TRUNCATE of the history is refused (HC121), even for the owner', r4.code === 'HC121', r4);
});

// One class, a family: the child of interest (k1) in class C, a sibling (k2)
// in class D; bills in a past month and the month before it.
const C = await mkClass(200000, 'C');
const D = await mkClass(180000, 'D');
const FAM = (await asSuper(`INSERT INTO families(name) VALUES ('f') RETURNING id`)).rows[0].id;
const k1 = await kid(C, FAM), k2 = await kid(D, FAM), k3 = await kid(C);
const cPast2 = await lesson(C, months.past2_lesson), cPast = await lesson(C, months.past_lesson);
const cNext = await lesson(C, months.next_lesson, 'Scheduled'), dPast = await lesson(D, months.past_lesson);
await att(cPast2, k1, 'Present', TEACHER); await att(cPast, k1, 'Present', TEACHER); await att(cNext, k1, 'Present');
await att(cPast, k3, 'Excused', TEACHER); await att(cNext, k3, 'Present');
await att(dPast, k2, 'Present', TEACHER);
await inv(k1, M(months.past2), { recorded: 600000 }); await inv(k1, M(months.past), { recorded: 600000 });
await inv(k2, M(months.past), { recorded: 600000 });

await section('a fee from next month reaches nobody (T0)', async () => {
  const before = await invDigest();
  const a = { class_id: C, effective_from: months.next, session_rate_vnd: 220000, note: 'New fee from next term' };
  const p = await preview('set', a);
  ok('preview: T0, allowed, no reason asked', p.tier === 0 && p.allowed && p.refuse_code === null && p.requires?.reason === false, p);
  ok('  no bill reached, nothing to refresh (the seeded marks of next month have no bill)',
     (p.reach?.pairs ?? []).length === 0 && (p.refresh_pairs ?? []).length === 0 && (p.invoices_before ?? []).length === 0, p.reach);
  ok('  what the admin is shown: before / after fee, the window, the fee now', p.change.fee_before === 200000 && p.change.fee_after === 220000 &&
     p.change.window_from === months.next && p.change.window_to === null && p.change.fee_now === 200000 && p.change.fee_now_after === 200000, p.change);
  const r = await checked('set', a, { token: p.token });
  ok('checked with no reason: done, one override row (T0 still leaves its row)', r?.override_id && r.tier === 0 && r.written === 1, r);
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [r.override_id])).rows[0];
  ok('  the override names who, the op, the before (history + mirror) and the after', o.actor_user_id === ADMIN && o.entity === 'class_fee' &&
     o.op === 'set' && o.target_id === C && o.reason === null && o.tier === 0 && Array.isArray(o.row_before.history) &&
     o.row_before.history.length === 1 && o.row_before.mirror === 200000 && o.change.session_rate_vnd === 220000 && o.reach_from.toISOString().slice(0, 10) === months.next, o);
  ok('  the row is written, signed by the admin, with its note', JSON.stringify((await hist(C)).map((x) => [x.f, x.v, x.note, x.created_by])) ===
     JSON.stringify([['1900-01-01', 200000, 'The fee the class was created with', null], [months.next, 220000, 'New fee from next term', ADMIN]]));
  ok('  the mirror ("the fee now") is unchanged: the new fee is not in force yet', (await mirror(C)) === 200000);
  ok('  every lesson before next month still costs the old fee', (await feeOn(C, months.past2_lesson)) === 200000 && (await feeOn(C, months.today)) === 200000);
  ok('  no stored bill changed, and nothing was queued for a refresh', (await invDigest()) === before && (r.refresh_pairs ?? []).length === 0);
  const al = (await asSuper(`SELECT actor_user_id, action FROM audit_log WHERE entity='class_fee_history' ORDER BY occurred_at DESC LIMIT 1`)).rows[0];
  ok('  and audit_log has the row change, as the admin', al?.actor_user_id === ADMIN && al?.action === 'insert', al);
});

await section('a fee dated in a past month is a correction (T2 / T3), reaching only its own months', async () => {
  const a = { class_id: C, effective_from: months.past, session_rate_vnd: 210000 };
  const p = await preview('set', a);
  ok('preview: T2 (a paid past month), a reason and a tick asked', p.tier === 2 && p.allowed && p.requires.reason && p.requires.confirm && !p.requires.correction_reason, p.tier);
  ok('  the window runs to the day before the next row', p.change.window_from === months.past && p.change.window_to !==null &&
     new Date(p.change.window_to).getTime() === new Date(months.next).getTime() - 86400000, p.change);
  ok('  refresh_pairs: never a month before the row\'s (the child\'s earlier paid month is left alone)',
     monthsOf(p.refresh_pairs).every((m) => m >= M(months.past)) && !monthsOf(p.refresh_pairs).includes(M(months.past2)), p.refresh_pairs);
  ok('  the reach is the family: the sibling in another class, same month, is in it (R-8a)',
     (p.reach.pairs ?? []).some((x) => x.student_id === k2 && x.month === M(months.past)) &&
     (p.reach.pairs ?? []).some((x) => x.student_id === k1 && x.month === M(months.past)), p.reach.pairs);
  ok('  a child whose only mark there is Excused is not reached', !(p.student_ids ?? []).includes(k3), p.student_ids);
  ok('  the stored bills are shown as they stand', (p.invoices_before ?? []).some((i) => i.student_id === k1 && i.month === M(months.past) && i.recorded_payment === 600000));
  let r = await tryIt(() => checked('set', a, { token: p.token, confirm: true }));
  ok('no reason -> HC010', r.code === 'HC010', r);
  r = await tryIt(() => checked('set', a, { reason: R, token: p.token }));
  ok('no tick -> HC012', r.code === 'HC012', r);
  r = await tryIt(() => checked('set', a, { reason: R, token: 'x', confirm: true }));
  ok('a wrong token -> HC011', r.code === 'HC011', r);
  // the history moved after the preview: the token covers it
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,'2030-01-01',1)`, [C]);
  r = await tryIt(() => checked('set', a, { reason: R, token: p.token, confirm: true }));
  ok('a row added to the class\'s history after the preview -> HC011 (the token covers the history)', r.code === 'HC011', r);
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from='2030-01-01'`, [C]);
  const p2 = await preview('set', a);
  r = await must('the correction', () => checked('set', a, { reason: R, token: p2.token, confirm: true }));
  ok('with a reason and the tick: done at T2, not reviewed (single), the reason kept',
     r.tier === 2 && r.review_required === false && (await asSuper(`SELECT reason FROM money_change_overrides WHERE id=$1`, [r.override_id])).rows[0].reason === R, r);
  ok('  the fee is in force from that month: the mirror follows the history for today', (await mirror(C)) === 210000 && (await feeOn(C, months.today)) === 210000);
  ok('  the months before it keep the old fee', (await feeOn(C, months.past2_lesson)) === 200000);
  ok('  refresh_pairs on the result are the preview\'s', JSON.stringify(r.refresh_pairs) === JSON.stringify(p2.refresh_pairs));
});

await section('the same month again updates its row; nothing to change is refused', async () => {
  const n0 = (await hist(C)).length;
  const r = await go('set', { class_id: C, effective_from: months.past, session_rate_vnd: 215000 });
  ok('a second fee for the same month updates that row (one row a month)', r.written === 1 && (await hist(C)).length === n0 &&
     (await hist(C)).find((x) => x.f === months.past).v === 215000, await hist(C));
  const p = await preview('set', { class_id: C, effective_from: months.past, session_rate_vnd: 215000 });
  ok('the same fee and note again -> not allowed, nothing_to_change', p.allowed === false && p.refuse_code === 'nothing_to_change', p.refuse_code);
  const x = await tryIt(() => checked('set', { class_id: C, effective_from: months.past, session_rate_vnd: 215000 }, { token: p.token }));
  ok('  and the checked path refuses it (HC015 nothing_to_change)', x.code === 'HC015' && /nothing_to_change/.test(x.message), x);
  const q = await preview('set', { class_id: C, effective_from: months.past, session_rate_vnd: 215000, note: 'Only the note' });
  ok('a note-only change moves no fee: T0, allowed', q.allowed && q.tier === 0 && (q.refresh_pairs ?? []).length === 0, q.tier);
});

await section('a confirmed past month: T3, correction mode, reviewed', async () => {
  const E = await mkClass(300000, 'E');
  const k = await kid(E);
  const s = await lesson(E, months.past_lesson);
  await att(s, k, 'Present', TEACHER);
  await inv(k, M(months.past), { conf: 'confirmed', recorded: 600000 });
  const a = { class_id: E, effective_from: months.past, session_rate_vnd: 320000 };
  const p = await preview('set', a);
  ok('preview: T3, a correction reason asked', p.tier === 3 && p.requires.correction_reason, p.tier);
  let r = await tryIt(() => checked('set', a, { reason: R, token: p.token, confirm: true }));
  ok('without the correction reason -> HC013', r.code === 'HC013', r);
  r = await must('T3', () => checked('set', a, { reason: R, token: p.token, confirm: true, corr: CORR }));
  ok('with it: done, and in the review queue', r.tier === 3 && r.review_required === true &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_review_queue WHERE override_id=$1`, [r.override_id])).rows[0].n === 1, r);
  const fz = await mkClass(300000, 'F');
  const kf = await kid(fz); const sf = await lesson(fz, months.past_lesson); await att(sf, kf, 'Present', TEACHER);
  await inv(kf, M(months.past), { frozen: true });
  ok('a frozen past bill in reach -> T3', (await preview('set', { class_id: fz, effective_from: months.past, session_rate_vnd: 1 })).tier === 3);
});

await section('a row between two rows reaches only its own window', async () => {
  const W = await mkClass(100000, 'W');
  const kw = await kid(W);
  const s2 = await lesson(W, months.past2_lesson), s1 = await lesson(W, months.past_lesson);
  await att(s2, kw, 'Present', TEACHER); await att(s1, kw, 'Present', TEACHER);
  await inv(kw, M(months.past2), { recorded: 1 }); await inv(kw, M(months.past), { conf: 'confirmed' });
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,130000)`, [W, months.past]);
  const p = await preview('set', { class_id: W, effective_from: months.past2, session_rate_vnd: 110000 });
  ok('a row dated the month before an existing row: its window ends where that row starts',
     p.change.window_to !== null && new Date(p.change.window_to).getTime() === new Date(months.past).getTime() - 86400000, p.change);
  ok('  only its own month is reached (T2, paid), not the confirmed month after it (which would be T3)',
     p.tier === 2 && JSON.stringify(monthsOf(p.reach.pairs)) === JSON.stringify([M(months.past2)]) &&
     JSON.stringify(monthsOf(p.refresh_pairs)) === JSON.stringify([M(months.past2)]), { tier: p.tier, pairs: p.reach.pairs });
});

// The review's P2 / P3 / P7 / P8 (docs/evidence/D4-2-review.md T-1), copied
// from scripts/pgtest/review/d4-2-probe.mjs: they kill V01-V04.
await section('review P2 / P3: the reach covers every month in the window and every charged mark', async () => {
  const c = await mkClass(100000, 'P2');
  const k = await kid(c);
  await att(await lesson(c, months.past2_lesson), k, 'Present', TEACHER);
  await att(await lesson(c, months.past_lesson), k, 'Present', TEACHER);
  await inv(k, M(months.past2), { recorded: 600000 });          // paid      -> T2
  await inv(k, M(months.past), { conf: 'confirmed' });          // confirmed -> T3
  const p = await preview('set', { class_id: c, effective_from: months.past2, session_rate_vnd: 120000 });
  ok('P2: a row at past2 with no later row reaches past2 AND the confirmed month after it: T3, both months refreshed (V01)', p.tier === 3 &&
     JSON.stringify(monthsOf(p.refresh_pairs)) === JSON.stringify([M(months.past2), M(months.past)]), { tier: p.tier, m: monthsOf(p.refresh_pairs) });
  const c3 = await mkClass(100000, 'P3');
  const k3 = await kid(c3);
  await att(await lesson(c3, months.past_lesson), k3, 'Absent', TEACHER);
  await inv(k3, M(months.past), { recorded: 600000 });
  const p3 = await preview('set', { class_id: c3, effective_from: months.past, session_rate_vnd: 120000 });
  ok('P3: a child whose only charged mark is Absent is reached: T2, in student_ids (V02)', p3.tier === 2 && (p3.student_ids ?? []).includes(k3), { tier: p3.tier });
});

await section('review P7 / P8: an acknowledgement of one month, and another trigger\'s delete', async () => {
  const c = await mkClass(100000, 'P7');
  const ins = `INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
    VALUES ('${ADMIN}','class_fee','set','${c}','{}'::uuid[],'${months.past2}',NULL,'single',0,false,'test reason long enough',true,'x','{}',
    '${JSON.stringify({ class_id: c, effective_from: months.past2, session_rate_vnd: 130000 })}','{}','[]','[]','{}',false) RETURNING id`;
  const e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins} INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.jwt_role', 'service_role', true); END $x$;
    SET LOCAL ROLE service_role; INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${c}','${months.next}',130000)`);
  ok('P7: the acknowledgement of past2 used for a row at next month (same transaction) -> HC120 (V03)', e?.code === 'HC120', e);
  const c8 = await mkClass(100000, 'P8');
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,120000)`, [c8, months.past]);
  await db.exec(`CREATE TABLE IF NOT EXISTS public.zz_del_relay(class_id uuid, effective_from date);
    CREATE OR REPLACE FUNCTION public.zz_del_relay_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    BEGIN DELETE FROM public.class_fee_history WHERE class_id = NEW.class_id AND effective_from = NEW.effective_from; RETURN NULL; END $f$;
    DROP TRIGGER IF EXISTS zz_del_relay ON public.zz_del_relay;
    CREATE TRIGGER zz_del_relay AFTER INSERT ON public.zz_del_relay FOR EACH ROW EXECUTE FUNCTION public.zz_del_relay_trg();
    GRANT ALL ON public.zz_del_relay TO service_role`);
  const r = await tryIt(() => asService(`INSERT INTO zz_del_relay VALUES ($1,$2)`, [c8, months.past]));
  ok('P8: another trigger (depth 2) deleting a dated row of a live class, service lane -> HC120, the row stays (V04)', r.code === 'HC120' &&
     (await hist(c8)).some((x) => x.f === months.past), r);
  await db.exec(`DROP TABLE zz_del_relay; DROP FUNCTION zz_del_relay_trg()`);
});

// OQ-1 (owner's ruling): a fee change that reaches a bill with money on it
// asks for a reason in any month - the review's P4 and P5 now ask.
await section('OQ-1: a bill with money on it asks for a reason, this month and next month too', async () => {
  const c4 = await mkClass(100000, 'P4');
  const k4 = await kid(c4);
  await att(await lesson(c4, months.next_lesson, 'Scheduled'), k4, 'Present', null);   // seeded placeholder
  await inv(k4, M(months.next), { recorded: 600000 });                                   // paid in advance
  const p4 = await preview('set', { class_id: c4, effective_from: months.next, session_rate_vnd: 130000 });
  ok('P4: a fee from next month when next month is already billed AND paid -> T1, a reason asked, the bill shown and refreshed',
     p4.tier === 1 && p4.requires.reason && (p4.invoices_before ?? []).length === 1 && monthsOf(p4.refresh_pairs).includes(M(months.next)), { tier: p4.tier });
  let r = await tryIt(() => checked('set', { class_id: c4, effective_from: months.next, session_rate_vnd: 130000 }, { token: p4.token }));
  ok('  without a reason -> HC010; nothing written', r.code === 'HC010' && !(await hist(c4)).some((x) => x.f === months.next), r);
  r = await must('P4 with a reason', () => checked('set', { class_id: c4, effective_from: months.next, session_rate_vnd: 130000 }, { reason: R, token: p4.token, confirm: true }));
  ok('  with a reason and the tick -> done at T1, the reason kept', r.tier === 1 &&
     (await asSuper(`SELECT reason FROM money_change_overrides WHERE id=$1`, [r.override_id])).rows[0].reason === R, r);
  const c5 = await mkClass(100000, 'P5');
  const k5 = await kid(c5);
  const curLesson = (await db.query(`SELECT to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '2 days', 'YYYY-MM-DD') d`)).rows[0].d;
  await att(await lesson(c5, curLesson), k5, 'Present', TEACHER);
  await inv(k5, M(months.cur), { recorded: 600000 });
  const p5 = await preview('set', { class_id: c5, effective_from: months.cur, session_rate_vnd: 130000 });
  ok('P5: a fee from THIS month reaching a paid (not confirmed) bill of this month -> T1, a reason asked', p5.tier === 1 && p5.requires.reason &&
     monthsOf(p5.refresh_pairs).includes(M(months.cur)), { tier: p5.tier });
  const c6 = await mkClass(100000, 'P5b');
  const k6 = await kid(c6);
  await att(await lesson(c6, curLesson), k6, 'Present', TEACHER);
  await inv(k6, M(months.cur), {});                                                       // issued, nothing paid
  const p6 = await preview('set', { class_id: c6, effective_from: months.cur, session_rate_vnd: 130000 });
  ok('control: this month\'s bill issued with nothing paid -> T0 (no reason), but the bill is in the plan, so the screen shows it (S-2)',
     p6.tier === 0 && (p6.invoices_before ?? []).length === 1 && monthsOf(p6.refresh_pairs).includes(M(months.cur)), { tier: p6.tier });
  const ev0 = (await events('owner_lane')).length;
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,140000)`, [c5, months.next]);
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from=$2`, [c5, months.next]);
  ok('  the trigger agrees: the owner\'s T0 writes of a month with no bill leave no event', (await events('owner_lane')).length === ev0);
  const e = await tryIt(() => asService(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,140000)`, [c5, months.cur]));
  ok('  and the raw write that reaches the paid bill is judged at T1', e.code === 'HC120' && /tier=1/.test(e.detail ?? ''), e);
});

await section('remove', async () => {
  let p = await preview('remove', { class_id: C, effective_from: '1900-01-01' });
  ok('the 1900 row: not allowed (baseline_row)', p.allowed === false && p.refuse_code === 'baseline_row', p.refuse_code);
  p = await preview('remove', { class_id: C, effective_from: '2031-05-01' });
  ok('a month with no row: not allowed (not_found)', p.allowed === false && p.refuse_code === 'not_found', p.refuse_code);
  p = await preview('remove', { class_id: C, effective_from: months.next });
  ok('a row from next month: T0', p.allowed && p.tier === 0, p.tier);
  let r = await checked('remove', { class_id: C, effective_from: months.next }, { token: p.token });
  ok('  removed, the mirror unchanged', r.written === 1 && !(await hist(C)).some((x) => x.f === months.next) && (await mirror(C)) === 215000, r);
  p = await preview('remove', { class_id: C, effective_from: months.past });
  ok('the past row: T2 (its lessons go back to the fee before)', p.tier === 2 && p.change.fee_before === 215000 && p.change.fee_after === 200000, p.change);
  r = await must('remove past', () => checked('remove', { class_id: C, effective_from: months.past }, { reason: R, token: p.token, confirm: true }));
  ok('  removed with a reason; the mirror is back to the baseline fee', r.tier === 2 && (await mirror(C)) === 200000 && (await feeOn(C, months.today)) === 200000);
});

await section('raw writes to the history', async () => {
  const before = (await hist(C)).length;
  let r = await tryIt(() => asAdmin(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,1)`, [C, months.next]));
  ok('an admin cannot write the table (no grant): 42501', r.code === '42501', r);
  r = await tryIt(() => as(TEACHER, 'authenticated', 'authenticated', `UPDATE class_fee_history SET session_rate_vnd = 1 WHERE class_id=$1`, [C]));
  ok('nor a teacher', r.code === '42501', r);
  r = await tryIt(() => asService(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,1)`, [C, months.next]));
  ok('the service role, a fee from next month (T0): HC120 - only the checked op writes fee rows', r.code === 'HC120' && /entity=class_fee; tier=0/.test(r.detail ?? ''), r);
  r = await tryIt(() => asService(`UPDATE class_fee_history SET session_rate_vnd = 1 WHERE class_id=$1 AND effective_from='1900-01-01'`, [C]));
  ok('the service role re-pricing the baseline (reaches paid months): HC120', r.code === 'HC120' && /tier=2/.test(r.detail ?? ''), r);
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,'2031-01-01',5)`, [C]);
  r = await tryIt(() => asService(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from='2031-01-01'`, [C]));
  ok('the service role deleting a row: HC120', r.code === 'HC120', r);
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from='2031-01-01'`, [C]);
  ok('  none of those changed the history', (await hist(C)).length === before);
  const ev0 = (await events('owner_lane')).length;
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,'2032-01-01',5)`, [C]);
  ok('the owner (SQL editor), a fee from a future month: passes, no event (T0)', (await events('owner_lane')).length === ev0);
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from='2032-01-01'`, [C]);
  await asSuper(`INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ($1,$2,250000)`, [C, months.past]);
  const ev = (await events('owner_lane')).filter((e) => e.payload.table === 'class_fee_history');
  ok('the owner, a fee dated in a paid past month: passes AND leaves an owner_lane event with the tier and the months to refresh (A-1)',
     ev.length >= 1 && ev.at(-1).payload.tier === 2 && ev.at(-1).payload.class_id === C &&
     monthsOf(ev.at(-1).payload.refresh_pairs).every((m) => m >= M(months.past)), ev.at(-1));
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from=$2`, [C, months.past]);
  r = await tryIt(() => asSuper(`UPDATE class_fee_history SET effective_from = '2033-01-01' WHERE class_id=$1 AND effective_from='1900-01-01'`, [C]));
  ok('a row cannot change month - HC121 fee_row_identity, even for the owner', r.code === 'HC121' && /fee_row_identity/.test(r.detail ?? ''), r);
  r = await tryIt(() => asSuper(`UPDATE class_fee_history SET class_id = $2 WHERE class_id=$1 AND effective_from='1900-01-01'`, [C, D]));
  ok('nor change class - HC121', r.code === 'HC121', r);
  r = await tryIt(() => asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from='1900-01-01'`, [C]));
  ok('the 1900 row is never deleted - HC121 baseline_row, even for the owner', r.code === 'HC121' && /baseline_row/.test(r.detail ?? ''), r);
  // A write made by some OTHER trigger (depth 2) is judged like any other:
  // only the baseline of a new class and the cascade of a deleted one pass.
  await db.exec(`CREATE TABLE IF NOT EXISTS public.zz_fee_relay(class_id uuid, effective_from date, fee int);
    CREATE OR REPLACE FUNCTION public.zz_fee_relay_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    BEGIN INSERT INTO public.class_fee_history(class_id, effective_from, session_rate_vnd) VALUES (NEW.class_id, NEW.effective_from, NEW.fee); RETURN NULL; END $f$;
    DROP TRIGGER IF EXISTS zz_fee_relay ON public.zz_fee_relay;
    CREATE TRIGGER zz_fee_relay AFTER INSERT ON public.zz_fee_relay FOR EACH ROW EXECUTE FUNCTION public.zz_fee_relay_trg();
    GRANT ALL ON public.zz_fee_relay TO service_role`);
  r = await tryIt(() => asService(`INSERT INTO zz_fee_relay VALUES ($1,$2,1)`, [C, months.next]));
  ok('a fee row written by some other trigger (depth 2) on the service lane -> HC120', r.code === 'HC120', r);
  r = await tryIt(() => asService(`INSERT INTO zz_fee_relay VALUES ($1,'1900-01-01',1)`, [C]));
  ok('  a second "baseline" for a class that has rows, by some other trigger -> refused too (the 1900 row exists)', r.code === '23505' || r.code === 'HC120', r);
  await db.exec(`DROP TABLE zz_fee_relay; DROP FUNCTION zz_fee_relay_trg()`);
});

await section('the acknowledgement covers exactly the checked change', async () => {
  const ins = (cid, op, tier, change) => `INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,
      correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
      VALUES ('${ADMIN}','class_fee','${op}','${cid}','{}'::uuid[],'${change.effective_from}',NULL,'single',${tier},${tier === 3},
      'test reason long enough',true,'x','{}','${JSON.stringify(change)}','{}','[]','[]','{}',false) RETURNING id`;
  const viaService = (overrideSql, write) => script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${overrideSql} INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.jwt_role', 'service_role', true); END $x$;
    SET LOCAL ROLE service_role; ${write}`);
  let e = await script(null, 'service_role', 'service_role', `SELECT set_config('hec.money_change_ack', gen_random_uuid()::text, true);
    INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',1)`);
  ok('a forged flag (random id) -> HC120', e?.code === 'HC120', e);
  const nextRow = { class_id: C, effective_from: months.next, session_rate_vnd: 230000 };
  e = await viaService(ins(D, 'set', 0, { ...nextRow, class_id: D }), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',230000)`);
  ok('an acknowledgement for another class -> HC120', e?.code === 'HC120', e);
  e = await viaService(ins(C, 'set', 0, nextRow), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',240000)`);
  ok('an acknowledgement of this class and month at another fee -> HC120', e?.code === 'HC120', e);
  e = await viaService(ins(C, 'set', 0, { ...nextRow, effective_from: '2031-02-01' }), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',230000)`);
  ok('an acknowledgement of another month -> HC120', e?.code === 'HC120', e);
  e = await viaService(ins(C, 'remove', 0, nextRow), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',230000)`);
  ok('a "remove" acknowledgement used to insert -> HC120', e?.code === 'HC120', e);
  e = await viaService(ins(C, 'set', 0, nextRow), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',230000)`);
  ok('control: the acknowledged row itself passes', e === null && (await hist(C)).some((x) => x.f === months.next && x.v === 230000), e);
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from=$2`, [C, months.next]);
  const pastRow = { class_id: C, effective_from: months.past, session_rate_vnd: 260000 };
  e = await viaService(ins(C, 'set', 1, pastRow), `INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.past}',260000)`);
  ok('A-8: an acknowledgement stored at T1 against a write that reaches T2 -> HC011 token_stale', e?.code === 'HC011', e);
  const p = await preview('set', nextRow);
  const real = await checked('set', nextRow, { token: p.token });
  await asSuper(`DELETE FROM class_fee_history WHERE class_id=$1 AND effective_from=$2`, [C, months.next]);
  e = await script(null, 'service_role', 'service_role', `SELECT set_config('hec.money_change_ack', '${real.override_id}', true);
    INSERT INTO class_fee_history(class_id, effective_from, session_rate_vnd) VALUES ('${C}','${months.next}',230000)`);
  ok('a replay: the flag names a real override of an earlier transaction -> HC120', e?.code === 'HC120', e);
});

await section('the mirror: classes.session_rate_vnd is "the fee now"', async () => {
  let r = await tryIt(() => asAdmin(`UPDATE classes SET session_rate_vnd = 999 WHERE id=$1`, [C]));
  ok('an admin typing a new fee into the class (the old settings screen) -> HC120 "change the fee from the fee history"',
     r.code === 'HC120' && /fee history/.test(r.detail ?? ''), r);
  r = await tryIt(() => asAdmin(`UPDATE classes SET name = 'C renamed', session_rate_vnd = session_rate_vnd WHERE id=$1`, [C]));
  ok('saving the other settings, the fee sent unchanged -> passes (the guard does not fire)', r.ok !== undefined, r);
  r = await tryIt(() => asService(`UPDATE classes SET session_rate_vnd = 1 WHERE id=$1`, [C]));
  ok('the service role changing it -> HC120', r.code === 'HC120', r);
  const ev0 = (await events('owner_lane')).length;
  await asSuper(`UPDATE classes SET session_rate_vnd = 1 WHERE id=$1`, [C]);
  ok('the owner may (recorded: one owner_lane event naming the column)', (await mirror(C)) === 1 &&
     (await events('owner_lane')).length === ev0 + 1 && (await events('owner_lane')).at(-1).payload.column === 'session_rate_vnd');
  r = await tryIt(() => asAdmin(`UPDATE classes SET name = 'C again', session_rate_vnd = session_rate_vnd WHERE id=$1`, [C]));
  ok('with the mirror out of level, saving the other settings (fee sent unchanged) still passes: the guard fires only on a change',
     r.ok !== undefined && (await mirror(C)) === 1, r);
  r = await tryIt(() => asAdmin(`UPDATE classes SET session_rate_vnd = public_fee FROM (SELECT 200000 AS public_fee) q WHERE id=$1`, [C]));
  ok('an admin bringing it back level with the history for today -> passes (prices nothing new)', r.ok !== undefined && (await mirror(C)) === 200000, r);
  // F-4 (review P11): another BEFORE trigger rewriting the fee during an update
  // that never names the column is judged too.
  await db.exec(`CREATE OR REPLACE FUNCTION public.aa_probe_fee() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN IF NEW.name = 'probe-reprice' THEN NEW.session_rate_vnd := 1; END IF; RETURN NEW; END $f$;
    DROP TRIGGER IF EXISTS aa_probe_fee ON public.classes;
    CREATE TRIGGER aa_probe_fee BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.aa_probe_fee();`);
  r = await tryIt(() => asService(`UPDATE classes SET name = 'probe-reprice' WHERE id=$1`, [C]));
  ok('F-4: a fee rewritten by an earlier BEFORE trigger (the column not in the SET list) -> HC120, the mirror unchanged',
     r.code === 'HC120' && (await mirror(C)) === 200000, r);
  await db.exec(`DROP TRIGGER aa_probe_fee ON public.classes; DROP FUNCTION public.aa_probe_fee();`);
  const neu = await mkClass(175000);
  ok('creating a class is not guarded: its fee is its first history row', (await feeOn(neu, months.today)) === 175000 && (await mirror(neu)) === 175000);
});

await section('who may use the checked path', async () => {
  const a = { class_id: C, effective_from: months.next, session_rate_vnd: 230000 };
  for (const [who, uid, jwt, role] of [['a teacher', TEACHER, 'authenticated', 'authenticated'], ['a parent', PARENT, 'authenticated', 'authenticated'],
                                       ['the service role', null, 'service_role', 'service_role']]) {
    const r = await tryIt(() => as(uid, jwt, role, `SELECT public.money_change_preview('class_fee','set',$1::jsonb)`, [JSON.stringify(a)]));
    const c = await tryIt(() => as(uid, jwt, role, `SELECT public.money_change_checked('class_fee','set',$1::jsonb)`, [JSON.stringify(a)]));
    ok(`${who}: preview and checked refused (42501)`, r.code === '42501' && c.code === '42501', { r, c });
  }
});

await section('bad arguments', async () => {
  const bad = [
    ['an unknown op', 'move', { class_id: C, effective_from: months.next, session_rate_vnd: 1 }, 'bad_op'],
    ['a date that is not the 1st', 'set', { class_id: C, effective_from: months.past_lesson, session_rate_vnd: 1 }, 'bad_args'],
    ['no fee', 'set', { class_id: C, effective_from: months.next }, 'bad_args'],
    ['a negative fee', 'set', { class_id: C, effective_from: months.next, session_rate_vnd: -1 }, 'bad_args'],
    ['a fractional fee', 'set', { class_id: C, effective_from: months.next, session_rate_vnd: 1.5 }, 'bad_args'],
    ['no class', 'set', { effective_from: months.next, session_rate_vnd: 1 }, 'bad_args'],
    ['a month 13', 'set', { class_id: C, effective_from: '2026-13-01', session_rate_vnd: 1 }, 'bad_args'],
  ];
  for (const [label, op, args, code] of bad) {
    const p = await preview(op, args);
    ok(`${label} -> ${code}`, p.allowed === false && p.refuse_code === code, p);
  }
  const p = await preview('set', { class_id: randomUUID(), effective_from: months.next, session_rate_vnd: 1 });
  ok('a class that does not exist -> not_found', p.allowed === false && p.refuse_code === 'not_found', p.refuse_code);
});

await section('a guard switched off: nothing is written (HC050)', async () => {
  const a = { class_id: C, effective_from: months.next, session_rate_vnd: 240000 };
  const n0 = (await hist(C)).length;
  const o0 = (await asSuper(`SELECT count(*)::int n FROM money_change_overrides`)).rows[0].n;
  await asSuper(`ALTER TABLE classes DISABLE TRIGGER zz_class_fee_mirror_guard`);
  let p = await preview('set', a);
  let r = await tryIt(() => checked('set', a, { token: p.token }));
  ok('the mirror guard disabled -> HC050, no row, no override', r.code === 'HC050' && (await hist(C)).length === n0 &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides`)).rows[0].n === o0, r);
  await asSuper(`ALTER TABLE classes ENABLE TRIGGER zz_class_fee_mirror_guard`);
  await asSuper(`ALTER TABLE class_fee_history DISABLE TRIGGER zz_class_fee_money_guard`);
  p = await preview('set', a);
  r = await tryIt(() => checked('set', a, { token: p.token }));
  ok('the history guard disabled -> HC050, no row, no override', r.code === 'HC050' && (await hist(C)).length === n0 &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides`)).rows[0].n === o0, r);
  await asSuper(`ALTER TABLE class_fee_history ENABLE TRIGGER zz_class_fee_money_guard`);
});

// ------------------------------------------------------------ the calculators
const handlers = {};
let fixture = {};
let feeError = null;
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
    then(done, bad) {
      if (table === 'class_fee_history' && feeError) return Promise.resolve({ data: null, error: feeError }).then(done, bad);
      return Promise.resolve({ data: page(), error: null }).then(done, bad);
    },
  };
  return q;
} });
globalThis.__d4FeeClient = client;
globalThis.Deno = { env: { get: () => 'synthetic-test-only' }, serve: (h) => { handlers.current = h; } };
const out = mkdtempSync(join(tmpdir(), 'd4-class-fee-'));
const bundleOf = async (entry) => {
  const b = await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'test-boundaries', setup(bb) {
      bb.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ }, (args) => ({ path: args.path, namespace: 'test' }));
      bb.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({ loader: 'js', contents:
        args.path.includes('supabase-js') ? 'export const createClient = globalThis.__d4FeeClient;' :
        args.path.includes('zod') ? 'const chain = new Proxy({}, {get: (_, key) => key === "parse" ? v => ({siblingPreview: false, ...v}) : () => chain}); export const z = chain;' :
        args.path.endsWith('/auth.ts') ? 'export const requireRole = async () => ({isServiceRole: false, roles: new Set(["admin"])}); export const callerOwnsStudent = async () => true;' :
        args.path.endsWith('/sibling-state.ts') ? 'export const resolveSiblingStates = async () => { throw new Error("Unexpected family calculation"); };' :
        'export const checkRateLimit = () => ({limited: false}); export const getClientIP = () => "test"; export const rateLimitResponse = () => {};',
      }));
    } }],
  });
  const file = join(out, `${createHash('md5').update(entry).digest('hex')}.mjs`);
  writeFileSync(file, b.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
  await bundleOf(resolve(repo, 'supabase', 'functions', name, 'index.ts'));
  handlers[name] = handlers.current;
}
const feeLib = await bundleOf(resolve(repo, 'supabase', 'functions', '_lib', 'class-fee.ts'));
const projected = await bundleOf(resolve(repo, 'supabase', 'functions', '_lib', 'projected-per-class.ts'));

const S = '11111111-1111-4111-8111-111111111111';
const CL = 'cccccccc-cccc-4ccc-8ccc-cccccccccc0a';
function world({ history = [] } = {}) {
  const classes = { id: CL, name: 'Class A', session_rate_vnd: 120000 };   // the mirror: the fee NOW
  fixture = {
    students: [{ id: S, family_id: null, families: null, is_active: true }], classes: [classes], invoices: [],
    enrollments: [{ id: 'e1', created_at: '2026-01-01', student_id: S, class_id: CL, discount_type: null, discount_value: null,
      discount_cadence: null, rate_override_vnd: null, start_date: '2026-09-01', end_date: null, allowed_days: null, classes }],
    sessions: ['2026-10-07', '2026-10-14', '2026-11-04', '2026-11-11'].map((date, i) => ({ id: `s${i}`, date, class_id: CL, status: 'Held', classes })),
    discount_assignments: [], referral_bonuses: [], settlements: [],
    class_fee_history: history.map(([from, fee], i) => ({ id: `h${i}`, class_id: CL, effective_from: from, session_rate_vnd: fee })),
    v_projected_base: [{ student_id: S, ym: '2026-10', projected_sessions: 2, projected_base: 0 }, { student_id: S, ym: '2026-11', projected_sessions: 2, projected_base: 0 }],
  };
  fixture.attendance = fixture.sessions.map((s) => ({ session_id: s.id, student_id: S, status: 'Present' }));
}
const call = async (name, month) => {
  const res = await handlers[name](new Request('http://localhost/fn', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
    body: JSON.stringify({ studentId: S, studentIds: [S], month }) }));
  const body = await res.json();
  return { status: res.status, r: name.endsWith('-bulk') ? body.results?.[0] : body, body };
};

await section('the calculators price each lesson at the fee on its date', async () => {
  world({ history: [['1900-01-01', 100000], ['2026-11-01', 120000]] });
  for (const name of ['calculate-tuition', 'calculate-tuition-bulk']) {
    const oct = await call(name, '2026-10'), nov = await call(name, '2026-11');
    ok(`${name}: October at the October fee (2 x 100,000), November at the new fee (2 x 120,000)`,
       oct.status === 200 && nov.status === 200 && oct.r.baseAmount === 200000 && nov.r.baseAmount === 240000 &&
       oct.r.totalAmount === 200000 && nov.r.totalAmount === 240000, { oct: oct.r?.baseAmount, nov: nov.r?.baseAmount });
    ok(`${name}: class_breakdown[].session_rate_vnd is the month's fee`,
       oct.r.breakdown.classes[0].session_rate_vnd === 100000 && nov.r.breakdown.classes[0].session_rate_vnd === 120000, oct.r.breakdown);
  }
  world({ history: [] });
  const [a, b] = [await call('calculate-tuition', '2026-10'), await call('calculate-tuition-bulk', '2026-10')];
  ok('a class with no row in the history: the mirror, as before (both calculators)', a.r.baseAmount === 240000 && b.r.baseAmount === 240000);
  world({ history: [['1900-01-01', 100000], ['2026-11-01', 120000]] });
  feeError = { code: 'PGRST205', message: "Could not find the table 'public.class_fee_history' in the schema cache" };
  const [c, d] = [await call('calculate-tuition', '2026-10'), await call('calculate-tuition-bulk', '2026-10')];
  ok('no history table yet (PGRST205): every lesson at the mirror, as before step 2 - the function ships first safely',
     c.status === 200 && d.status === 200 && c.r.baseAmount === 240000 && d.r.baseAmount === 240000);
  feeError = { code: '42P01', message: 'relation "public.class_fee_history" does not exist' };
  ok('  the same for 42P01', (await call('calculate-tuition', '2026-10')).r.baseAmount === 240000);
  feeError = { code: '42501', message: 'permission denied for table class_fee_history' };
  const [e1, e2] = [await call('calculate-tuition', '2026-10'), await call('calculate-tuition-bulk', '2026-10')];
  ok('any other read error fails the call instead of pricing the past at today\'s fee', e1.status !== 200 &&
     (e2.status !== 200 || e2.r?.error === true || e2.body?.error !== undefined), { e1: e1.status, e2: e2.status, b: e2.body });
  feeError = null;
  world({ history: [['1900-01-01', 100000], ['2026-11-01', 120000]] });
  fixture.invoices = [{ id: 'inv1', student_id: S, month: '2026-11', tuition_frozen: true, base_amount: 200000, discount_amount: 0,
    total_amount: 200000, recorded_payment: 200000, status: 'paid', confirmation_status: 'confirmed', review_flags: [] }];
  const fz = await call('calculate-tuition', '2026-11');
  ok('a frozen bill stays frozen: its saved figures are reported, whatever the fee history says now',
     fz.status === 200 && fz.r.baseAmount === 200000 && fz.r.totalAmount === 200000, fz.r?.totalAmount);
});

await section('projected-per-class (the sibling winner\'s projection)', async () => {
  const famWorld = (opts) => { world(opts); fixture.students[0].family_id = 'fam'; };
  famWorld({ history: [['1900-01-01', 100000], ['2026-11-01', 120000]] });
  let rows = await projected.projectedByFamilyPerClass(client(), 'fam', '2026-10');
  ok('dated: October projected at the October fee (2 x 100,000)', rows[0]?.projected_base === 200000 && rows[0]?.session_rate === 100000, rows);
  rows = await projected.projectedByFamilyPerClass(client(), 'fam', '2026-11');
  ok('  November at the new fee (2 x 120,000)', rows[0]?.projected_base === 240000 && rows[0]?.session_rate === 120000, rows);
  famWorld({ history: [['1900-01-01', 120000]] });
  rows = await projected.projectedByFamilyPerClass(client(), 'fam', '2026-10');
  ok('with only the baseline row: count x mirror, exactly as before', rows[0]?.projected_base === 240000 && rows[0]?.session_rate === 120000, rows);
  feeError = { code: 'PGRST205', message: 'x' };
  rows = await projected.projectedByFamilyPerClass(client(), 'fam', '2026-10');
  ok('no history table: count x mirror', rows[0]?.projected_base === 240000, rows);
  feeError = { code: '42501', message: 'permission denied' };
  const r = await tryIt(() => projected.projectedByFamilyPerClass(client(), 'fam', '2026-10'));
  ok('any other read error throws (no silent mirror)', r.ok === undefined, r);
  feeError = null;
});

await section('_lib/class-fee.ts', async () => {
  const { classFeeOn, indexClassFees, isMissingFeeHistory } = feeLib;
  const h = indexClassFees([{ class_id: 'a', effective_from: '2026-11-01', session_rate_vnd: '120000' },
    { class_id: 'a', effective_from: '1900-01-01', session_rate_vnd: 100000 }, { class_id: 'b', effective_from: '2026-01-01', session_rate_vnd: 5 }]);
  ok('classFeeOn: the newest row on or before the date, rows in any order, text fees read as numbers',
     classFeeOn(h, 'a', '2026-10-31', 0) === 100000 && classFeeOn(h, 'a', '2026-11-01', 0) === 120000 && classFeeOn(h, 'a', '2027-03-04T10:00:00', 0) === 120000);
  ok('classFeeOn: no history (null), no row for the class, or no row that early -> the fallback',
     classFeeOn(null, 'a', '2026-11-01', 7) === 7 && classFeeOn(h, 'z', '2026-11-01', 7) === 7 && classFeeOn(h, 'b', '2025-12-31', 7) === 7);
  ok('isMissingFeeHistory: by code only - PGRST205 and 42P01; not a permission or network error',
     isMissingFeeHistory({ code: 'PGRST205' }) && isMissingFeeHistory({ code: '42P01' }) &&
     !isMissingFeeHistory({ code: '42501', message: 'permission denied for table class_fee_history' }) && !isMissingFeeHistory(null) &&
     !isMissingFeeHistory({ message: 'fetch failed' }));
  ok('F-1: a message alone is never "no table" (a column error, a missing relationship, a code-less message all fail the call)',
     !isMissingFeeHistory({ code: '42703', message: 'column class_fee_history.session_rate_vnd does not exist' }) &&
     !isMissingFeeHistory({ code: 'PGRST200', message: "Could not find a relationship between 'class_fee_history' and 'classes' in the schema cache" }) &&
     !isMissingFeeHistory({ message: 'relation "public.class_fee_history" does not exist' }));
  const src = readFileSync(resolve(repo, 'supabase/functions/_lib/class-fee.ts'), 'utf8');
  ok('_lib/class-fee.ts imports nothing', !/^\s*import\s/m.test(src) && !/\brequire\(/.test(src));
  const calls = ['calculate-tuition/index.ts', 'calculate-tuition-bulk/index.ts', '_lib/projected-per-class.ts']
    .map((f) => readFileSync(resolve(repo, 'supabase/functions', f), 'utf8'));
  ok('each of the three readers prices lessons through classFeeOn and reads the history once (no per-lesson query)',
     calls.every((s) => /classFeeOn\(feeHistory, [a-z.]+class_id, s\.date,/.test(s)) &&
     calls.every((s) => (s.match(/class_fee_history|readClassFeeHistory\(/g) ?? []).length === 1), calls.map((s) => (s.match(/class_fee_history|readClassFeeHistory\(/g) ?? []).length));
});

await section('the Fee history screen (src/lib/classFee.ts and the two screens)', async () => {
  const lib = await bundleOf(resolve(repo, 'src', 'lib', 'classFee.ts'));
  ok('feeMonthLabel: the baseline reads "the start", a month its name', lib.feeMonthLabel('1900-01-01') === 'the start' &&
     lib.feeMonthLabel('2026-11-01') === 'November 2026' && lib.feeMonthLabel('2027-01') === 'January 2027');
  ok('a new fee is offered from next month by default (nothing billed moves); December rolls the year',
     lib.nextMonth('2026-11-16') === '2026-12' && lib.nextMonth('2026-12-31') === '2027-01' && lib.firstOfMonth('2026-12') === '2026-12-01');
  const list = lib.feeRowsForList([{ effective_from: '2026-12-01', session_rate_vnd: 220000 }, { effective_from: '1900-01-01', session_rate_vnd: 200000 },
    { effective_from: '2026-09-01', session_rate_vnd: 210000 }], '2026-11-16');
  ok('the list: newest first, each row with the month it runs to; "now" on the row in force, "not in force yet" on a later one',
     list.map((r) => r.effective_from).join() === '2026-12-01,2026-09-01,1900-01-01' && list[1].now && !list[0].now && list[0].upcoming &&
     list[2].baseline && list[1].untilNext === 'December 2026' && list[0].untilNext === null, list);
  ok('parseFee: whole VND only (spaces, dots and commas as thousands separators allowed)', lib.parseFee('220 000') === 220000 &&
     lib.parseFee('220.000') === 220000 && lib.parseFee('-5') === null && lib.parseFee('1.5e3x') === null && lib.parseFee('') === null);
  ok('every class-fee refusal is worded with what to do next', ['nothing_to_change', 'baseline_row', 'not_found', 'no_baseline', 'bad_args']
     .every((k) => typeof lib.CLASS_FEE_REFUSALS[k] === 'string' && lib.CLASS_FEE_REFUSALS[k].length > 30));
  ok('the dialog\'s summary comes from the plan\'s own figures', lib.feeChangeSummary({ change: { effective_from: '2026-09-01', window_to: '2026-11-30',
     fee_before: 200000, fee_after: 210000, lessons: 3 } }, (n) => String(n)) === 'From September 2026 until November 2026: 200000 becomes 210000 a lesson (3 lessons with a charged mark).');
  // S-2 (review): the dialog is decided from the plan alone.
  const t0 = { tier: 0, approval: { required: false }, invoices_before: [], refresh_pairs: [] };
  ok('feeNeedsDialog: only a new fee that reaches NO bill goes straight through',
     lib.feeNeedsDialog('set', t0) === false &&
     lib.feeNeedsDialog('set', { ...t0, invoices_before: [{ id: 'i' }] }) === true &&
     lib.feeNeedsDialog('set', { ...t0, refresh_pairs: [{ student_id: 's', month: '2026-12' }] }) === true &&
     lib.feeNeedsDialog('remove', t0) === true && lib.feeNeedsDialog('set', { ...t0, tier: 1 }) === true &&
     lib.feeNeedsDialog('set', { ...t0, approval: { required: true } }) === true && lib.feeNeedsDialog('set', null) === true);
  const intro0 = lib.feeDialogIntro({ ...t0, refresh_pairs: [{}, {}], change: { effective_from: '2026-12-01', fee_before: 1, fee_after: 2, lessons: 2 } }, (n) => String(n));
  const intro1 = lib.feeDialogIntro({ ...t0, tier: 2, refresh_pairs: [], change: { effective_from: '2026-09-01', fee_before: 1, fee_after: 2 } }, (n) => String(n));
  ok('the dialog\'s wording comes from the plan (bills reached, tier), not from the calendar',
     /reaches 2 bills already worked out/.test(intro0) && /recorded with your name/.test(intro0) &&
     /No bill already worked out changes/.test(intro1) && /kept with your reason/.test(intro1), { intro0, intro1 });
  ok('decision 7: the month box starts at the class\'s first lesson or creation, never 1900 (a typed 1900 is refused)',
     lib.feeMonthMin('2025-03-04T10:00:00Z', '2025-01-08') === '2025-01' && lib.feeMonthMin(null, null) === '2000-01' &&
     lib.feeMonthMin('1900-01-01', null) === '2000-01' && lib.feeMonthAllowed('1900-01', '2025-01') === false &&
     lib.feeMonthAllowed('2024-12', '2025-01') === false && lib.feeMonthAllowed('2025-01', '2025-01') && !lib.feeMonthAllowed('2025-13', '2000-01'));
  const settings = readFileSync(resolve(repo, 'src/components/admin/class/ClassSettings.tsx'), 'utf8');
  const screen = readFileSync(resolve(repo, 'src/components/admin/class/ClassFeeHistory.tsx'), 'utf8');
  const MOJIBAKE = [Buffer.from([0xc3, 0xa2, 0xe2, 0x82, 0xac]), Buffer.from([0xc3, 0xb0, 0xc5, 0xb8]), Buffer.from([0xef, 0xbb, 0xbf])];
  const touched = ['src/components/admin/class/ClassSettings.tsx', 'src/components/admin/class/ClassFeeHistory.tsx', 'src/lib/classFee.ts',
    'src/components/admin/money-guard/MoneyGuardDialog.tsx'];
  ok('S-1: no re-encoded bytes (mojibake of an em dash or an emoji, or a BOM) in the screens this step touched; the em dashes and the bank emoji of ClassSettings are intact',
     touched.every((f) => { const b = readFileSync(resolve(repo, f)); return MOJIBAKE.every((m) => !b.includes(m)); }) &&
     settings.includes('e.g. Class A1 — Morning') && settings.includes('\u{1F3E6} Classroom Economy'));
  ok('S-2: the screen decides the dialog with feeNeedsDialog and words it with feeDialogIntro; no calendar-based note',
     /feeNeedsDialog\(req\.op, plan\)/.test(screen) && /feeDialogIntro\(plan, formatVnd\)/.test(screen) &&
     !/isPastMonth|pastWarning|futureNote|thisMonthNote|today\.slice\(0, 7\)/.test(screen) && /min=\{minMonth\}/.test(screen));
  ok('ClassSettings no longer writes the fee (no session_rate_vnd in its update) and shows the Fee history instead',
     !/session_rate_vnd\s*:/.test(settings) && /<ClassFeeHistory classId=\{classId\} \/>/.test(settings));
  ok('ClassFeeHistory writes only through the money guard: no insert / update / delete / upsert of a table, no calculate-tuition call',
     !/\.(insert|update|delete|upsert)\(/.test(screen) && !/calculate-tuition/.test(screen) &&
     /previewMoneyChange\(/.test(screen) && /confirmMoneyChange\(/.test(screen) && /entity: "class_fee", op: "set"/.test(screen) && /entity: "class_fee", op: "remove"/.test(screen));
  ok('  and prices nothing: no arithmetic on a fee anywhere in the screen or its helpers',
     !/session_rate_vnd\s*[*+\-/]|[*+/]\s*\w*\.?session_rate_vnd|fee\s*\*/.test(screen + readFileSync(resolve(repo, 'src/lib/classFee.ts'), 'utf8')));
});

// ------------------------------------------------------------ the golden gate
await section('golden figures: byte-identical with no table, baseline rows, and a future row', async () => {
  const goldenPath = resolve(repo, 'scripts/pgtest/fixtures/tuition-figures.golden.json');
  const md5 = () => createHash('md5').update(readFileSync(goldenPath)).digest('hex');
  const golden0 = md5();
  const mig = (n) => resolve(repo, 'supabase', 'migrations', n);
  const args = [resolve(repo, 'scripts/pgtest/invoice-status.test.mjs'),
    mig('20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql'), mig('20261009120000_keep_invoice_carry_balances_correct.sql'),
    mig('20261009130000_audit_every_admin_action.sql'), mig('20261106120000_invoice_tuition_freeze.sql')];
  const runMode = (mode) => {
    const res = spawnSync(process.execPath, ['--import', pathToFileURL(resolve(repo, 'scripts/pgtest/d4-class-fee-golden-hook.mjs')).href, ...args],
      { cwd: repo, encoding: 'utf8', env: { ...process.env, D4_FEE_MODE: mode }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    const code = res.status ?? 1;
    const text = String(res.stdout ?? '') + String(res.stderr ?? '');
    const sum = /(\d+) passed, (\d+) failed/.exec(text);
    const lines = text.split('\n');
    const goldenLines = lines.filter((l) => /: the (response|saved figures) (is|are) identical/.test(l));
    return { code, passed: Number(sum?.[1] ?? 0), failed: Number(sum?.[2] ?? -1), goldenLines, text };
  };
  const reads = (r) => Number(/reads=(\d+)/.exec(r.text)?.[1] ?? -1);
  for (const [mode, label] of [['missing', 'no history table (the functions deployed before the paste)'],
                               ['baseline', 'the baseline rows the migration writes'],
                               ['future', 'baseline rows plus a row from 2027-01-01 at another fee (after every billed month)']]) {
    const r = runMode(mode);
    ok(`${label}: the whole invoice-status suite passes (${r.passed} assertions)`, r.code === 0 && r.failed === 0 && r.passed >= 268, { code: r.code, passed: r.passed, failed: r.failed });
    ok(`  all 36 golden-figure assertions (18 fixtures: response and saved figures) PASS, byte for byte`,
       r.goldenLines.length === 36 && r.goldenLines.every((l) => l.trim().startsWith('PASS')), r.goldenLines.filter((l) => !l.trim().startsWith('PASS')));
    ok(`  and the calculators did read class_fee_history (${reads(r)} reads)`, reads(r) > 100, reads(r));
  }
  const neg = runMode('inmonth');
  const line = (re) => neg.goldenLines.find((l) => re.test(l)) ?? '';
  ok('negative control - a row from 2026-10-01 at another fee: the gate SEES it (the plain month\'s response and saved figures differ)',
     neg.code !== 0 && /^\s*FAIL/.test(line(/^\s*\S+ plain month: the response/)) && /^\s*FAIL/.test(line(/^\s*\S+ plain month: the saved/)),
     { a: line(/plain month: the response/), b: line(/plain month: the saved/) });
  ok('  while the frozen bill\'s saved figures stay byte-identical (frozen bills stay frozen) and a month with no lessons is untouched',
     /^\s*PASS/.test(line(/frozen bill: the saved figures/)) && /^\s*PASS/.test(line(/no lessons in the month: the response/)),
     { f: line(/frozen bill: the saved figures/), n: line(/no lessons in the month: the response/) });
  ok('fixtures/tuition-figures.golden.json is byte-identical after all four runs (nothing regenerated it)', md5() === golden0);
});

// ------------------------------------------------------------ rollback 3
await section('rollback 3', async () => {
  await asSuper(`UPDATE classes SET session_rate_vnd = 1 WHERE id=$1`, [C]);    // a mirror out of level (owner lane)
  const rows0 = (await asSuper(`SELECT count(*)::int n FROM class_fee_history`)).rows[0].n;
  let e = null; try { await db.exec(sqlOf(rb3F)); } catch (x) { e = x.message; }
  ok('the rollback script runs', e === null, e);
  ok('  it brought the mirror level first (class_fee_on today), for every class', (await mirror(C)) === 200000 &&
     (await asSuper(`SELECT count(*)::int n FROM classes c WHERE c.session_rate_vnd IS DISTINCT FROM COALESCE(public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), c.session_rate_vnd)`)).rows[0].n === 0);
  const t = (await db.query(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE '%class_fee%' ORDER BY 1`)).rows.map((x) => x.tgname);
  ok('  the two guard triggers are gone; the table, its rows, the baseline, no-truncate and audit triggers stay',
     JSON.stringify(t) === JSON.stringify(['audit_class_fee_history', 'class_fee_baseline', 'class_fee_history_no_truncate']) &&
     (await asSuper(`SELECT count(*)::int n FROM class_fee_history`)).rows[0].n === rows0, t);
  const a = { class_id: C, effective_from: months.next, session_rate_vnd: 250000 };
  const p = await preview('set', a);
  const r = await tryIt(() => checked('set', a, { token: p.token }));
  ok('  the checked path refuses to work without its triggers (HC050): closed', r.code === 'HC050', r);
  const m = await tryIt(() => asAdmin(`UPDATE classes SET session_rate_vnd = 205000 WHERE id=$1`, [C]));
  ok('  the class fee field writes again (as before step 2)', m.ok !== undefined && (await mirror(C)) === 205000, m);
  try { await db.exec(sqlOf(rb3F)); e = null; } catch (x) { e = x.message; }
  ok('  the rollback script is safe to paste twice', e === null, e);
  await asSuper(`UPDATE classes SET session_rate_vnd = 200000 WHERE id=$1`, [C]);
  try { await db.exec(sqlOf(feeF)); e = null; } catch (x) { e = x.message; }
  ok('the migration pastes again after the rollback; both guards are back', e === null &&
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('zz_class_fee_money_guard','zz_class_fee_mirror_guard') AND tgenabled='O'`)).rows[0].n === 2, e);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
