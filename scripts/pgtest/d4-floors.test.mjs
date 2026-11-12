// D4 step 1a: the two floors (G-8, G-9) and the register row's identity
// (G-10). Drives the REAL migrations in paste order:
//
//   node scripts/pgtest/d4-floors.test.mjs \
//     supabase/migrations/20261009130000_audit_every_admin_action.sql \
//     supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql \
//     supabase/migrations/20261112090000_session_held_evidence.sql \
//     supabase/migrations/20261112091000_session_cancel_guard.sql \
//     supabase/migrations/20261114090000_d4_floors.sql \
//     supabase/migrations/20261106120000_invoice_tuition_freeze.sql
//
// Spec: docs/evidence/D4-design.md revision 2 b.2, c.1, f.3 ("G-8 / R-6",
// "G-9 / R-1", "G-10"). Prelude: scripts/pgtest/d4-prelude.mjs (D2's
// prelude, copied, plus students / families and the evidence tables' row
// security). Every guard has a case that fails without it; the mutants are
// listed in scripts/pgtest/d4-mutants.mjs.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { harness, makeDb, preludeCopyIsCurrent, sqlOf, repo, D2_PRELUDE, D4_PEOPLE, D4_EVIDENCE_RLS } from './d4-prelude.mjs';
import { checkUnchanged } from './guard-fingerprint.mjs';
import { resolve } from 'node:path';

const files = process.argv.slice(2);
if (files.length !== 6) {
  console.error('usage: d4-floors.test.mjs <audit> <cancelled-lesson guard> <D1> <D2> <d4 floors> <invoice freeze>');
  process.exit(2);
}
const [auditFile, cancelFile, d1File, d2File, floorsFile, freezeFile] = files;
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, must, script, clock } = H;

const fresh = async ({ floors = true, rls = true } = {}) => {
  const d = await makeDb(PGlite, { people: true, rls, migrations: [auditFile, cancelFile, d1File, d2File, freezeFile] });
  if (floors) await d.exec(sqlOf(floorsFile));
  return d;
};

// ------------------------------------------------------------ install
await section('prelude copy', async () => {
  ok('d4-prelude: the D2 prelude copy still equals session-cancel-guard.test.mjs PRELUDE', preludeCopyIsCurrent());
});

await section('preflight', async () => {
  const bare = await makeDb(PGlite, { people: true, migrations: [auditFile, cancelFile, d1File] });
  let msg = null;
  try { await bare.exec(sqlOf(floorsFile)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('preflight: without D2 the file refuses, naming what is missing', /d4_floors cannot be installed/.test(msg ?? '') && /session_cancel_overrides|_session_change_assess/.test(msg ?? ''), msg);
  const t = (await bare.query(`SELECT to_regclass('public.session_evidence_floor') a, to_regclass('public.invoice_state_floor') b,
      (SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE 'zz%evidence%' OR tgname = 'zz_invoice_state_floor') n`)).rows[0];
  ok('preflight:   and installs nothing (no floor table, no trigger)', t.a === null && t.b === null && t.n === 0, t);
  await bare.close();

  // R-10: a live body that is neither D2's nor D4's -> refuse, nothing installed.
  const other = await makeDb(PGlite, { people: true, migrations: [auditFile, cancelFile, d1File, d2File] });
  const def = (await other.query(`SELECT pg_get_functiondef('public._session_erased_recently(uuid)'::regprocedure) d`)).rows[0].d;
  await other.exec(def.replace("interval '30 days'", "interval '31 days'"));
  msg = null;
  try { await other.exec(sqlOf(floorsFile)); } catch (e) { msg = e.message; }
  await other.exec('ROLLBACK').catch(() => {});
  ok('R-10 preflight: a replaced function whose md5 is not D2\'s (D release) or D4\'s -> refused with its md5',
     /_session_erased_recently is not the D2 or D4 body \(md5 [0-9a-f]{32}\)/.test(msg ?? ''), msg);
  const t2 = (await other.query(`SELECT to_regclass('public.session_evidence_floor') a,
      md5(replace(prosrc, E'\\r', '')) m FROM pg_proc WHERE proname = '_session_change_assess'`)).rows[0];
  ok('R-10   nothing changed: no floor table, _session_change_assess still the D2 body',
     t2.a === null && t2.m === 'e0acbcc9a958a789aa437a6c8c4a84ec', t2);
  await other.close();
});

// The main database for the rest of the suite.
db = await fresh({ floors: false });
const snapRows = async () => (await db.query(`SELECT
   (SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, ',' ORDER BY s.id), '')) FROM sessions s) s,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM attendance a) a,
   (SELECT md5(COALESCE(string_agg(to_jsonb(i)::text, ',' ORDER BY i.id), '')) FROM invoices i) i,
   (SELECT md5(COALESCE(string_agg(to_jsonb(p)::text, ',' ORDER BY p.id), '')) FROM point_transactions p) p,
   (SELECT md5(COALESCE(string_agg(to_jsonb(c)::text, ',' ORDER BY c.id), '')) FROM class_transcripts c) c,
   (SELECT count(*)::int FROM audit_log) l`)).rows[0];
// Data that exists before the paste: a taught lesson, a paid bill, points, a transcript.
{
  const cid = randomUUID(), t = randomUUID();
  await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, t]);
  const d = (await clock(-5)).date;
  const sid = (await db.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Held',gen_random_uuid()) RETURNING id`, [cid, d])).rows[0].id;
  const k = randomUUID();
  await db.query(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [sid, k, t]);
  await db.query(`INSERT INTO invoices(student_id,month,recorded_payment,confirmation_status) VALUES ($1,$2,540000,'confirmed')`, [k, d.slice(0, 7)]);
  await db.query(`INSERT INTO point_transactions(student_id,class_id,session_id,points,type,date,created_by) VALUES ($1,$2,$3,5,'participation',$4,$5)`, [k, cid, sid, d, t]);
  await db.query(`INSERT INTO class_transcripts(class_id,session_id,uploaded_by,status) VALUES ($1,$2,$3,'analyzed')`, [cid, sid, t]);
}
const rowsBefore = await snapRows();
const catalogOf = async () => (await db.query(`SELECT
   (SELECT md5(string_agg(p.proname || md5(p.prosrc) || p.prosecdef || COALESCE(p.proconfig::text,''), ',' ORDER BY p.oid::regprocedure::text))
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace) f,
   (SELECT md5(string_agg(c.relname || '.' || t.tgname || pg_get_triggerdef(t.oid) || t.tgenabled::text, ',' ORDER BY c.relname, t.tgname))
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal) t,
   (SELECT md5(string_agg(tablename || policyname || COALESCE(qual,'') || COALESCE(with_check,''), ',' ORDER BY tablename, policyname)) FROM pg_policies) p`)).rows[0];
const d2TriggersBefore = (await db.query(`SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid) d, t.tgenabled FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1, 2`)).rows;
const d1Before = (await db.query(`SELECT md5(prosrc) m FROM pg_proc WHERE proname = 'session_held_evidence'`)).rows[0].m;
await db.exec(sqlOf(floorsFile));

await section('install: idempotent, rewrites no row, replaces only two functions', async () => {
  const after1 = await snapRows();
  ok('no row rewritten: sessions, attendance, invoices, points, transcripts identical after the paste; audit_log unchanged',
     JSON.stringify(after1) === JSON.stringify(rowsBefore), [rowsBefore, after1]);
  const fl = (await db.query(`SELECT (SELECT count(*)::int FROM session_evidence_floor) e, (SELECT count(*)::int FROM invoice_state_floor) i`)).rows[0];
  ok('no backfill: both floor tables start empty', fl.e === 0 && fl.i === 0, fl);
  const cat1 = await catalogOf();
  let again = null;
  try { await db.exec(sqlOf(floorsFile)); } catch (e) { again = e.message; }
  ok('the migration applies a second time', again === null, again);
  const cat2 = await catalogOf();
  ok('  and the second paste is a no-op: functions, triggers and policies identical', JSON.stringify(cat1) === JSON.stringify(cat2), [cat1, cat2]);
  ok('  rows still identical after the second paste', JSON.stringify(await snapRows()) === JSON.stringify(rowsBefore));
  const others = d2TriggersBefore;
  const now = (await db.query(`SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid) d, t.tgenabled FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1, 2`)).rows;
  const kept = now.filter((r) => others.some((o) => o.relname === r.relname && o.tgname === r.tgname));
  ok('every trigger that existed before is unchanged (definition and enabled)', JSON.stringify(kept) === JSON.stringify(others), [kept.length, others.length]);
  const added = now.filter((r) => !others.some((o) => o.relname === r.relname && o.tgname === r.tgname)).map((r) => `${r.relname}.${r.tgname}=${r.tgenabled}`).sort();
  ok('exactly the D4 triggers are added, all enabled', JSON.stringify(added) === JSON.stringify([
    'attendance.zz_attendance_evidence_guard=O', 'class_transcripts.zz_transcript_evidence_keep=O',
    'homework_submissions.zz_homework_evidence_keep=O', 'homeworks.zz_homework_evidence_keep=O',
    'invoice_state_floor.invoice_state_floor_guard=O', 'invoice_state_floor.invoice_state_floor_no_truncate=O',
    'invoices.zz_invoice_state_floor=O', 'point_transactions.audit_point_transactions=O',
    'point_transactions.zz_point_evidence_keep=O', 'session_evidence_floor.session_evidence_floor_guard=O',
    'session_evidence_floor.session_evidence_floor_no_truncate=O', 'sessions.zz0_session_evidence_keep=O']), added);
  ok('D1 is not replaced', (await db.query(`SELECT md5(prosrc) m FROM pg_proc WHERE proname = 'session_held_evidence'`)).rows[0].m === d1Before);
  const { total, diff } = await checkUnchanged({ prelude: D2_PRELUDE + D4_PEOPLE });
  ok('R-10 D-release fingerprint after the file: of 66 objects exactly the two replaced functions differ', total === 66 && diff.length === 2 &&
     diff.every((x) => /_session_change_assess|_session_erased_recently/.test(x)), { total, diff });
  const mig = readFileSync(floorsFile, 'utf8');
  const lits = [...mig.matchAll(/'([0-9a-f]{32})'\)\s+THEN\s+-- this file/g)].map((m) => m[1]);
  const real = (await db.query(`SELECT proname, md5(replace(prosrc, E'\\r', '')) m FROM pg_proc
      WHERE proname IN ('_session_change_assess', '_session_erased_recently') ORDER BY proname`)).rows.map((r) => r.m);
  ok('preflight literals for "this file" equal the md5 of the installed D4 bodies (a second paste is accepted)',
     lits.length === 2 && lits[0] === real[0] && lits[1] === real[1], { lits, real });
});

await section('install: definer functions, search_path, grants', async () => {
  const names = ['_caller_lane', '_floor_table_guard', '_floor_families_or', '_floor_causes_push', '_session_evidence_keep',
    'session_effective_level', 'invoice_floor_state', '_attendance_evidence_guard', '_point_evidence_keep',
    '_transcript_evidence_keep', '_homework_evidence_keep', '_session_evidence_keep_trg', '_invoice_state_floor',
    '_session_change_assess', '_session_erased_recently'];
  const p = (await db.query(`SELECT proname, prosecdef, proconfig,
      has_function_privilege('anon', oid, 'EXECUTE') an, has_function_privilege('authenticated', oid, 'EXECUTE') au,
      has_function_privilege('service_role', oid, 'EXECUTE') sr
      FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1)`, [names])).rows;
  ok('all 15 functions of the file exist', p.length === 15, p.map((x) => x.proname));
  ok('every function of the file pins search_path=public (every SECURITY DEFINER one included)',
     p.every((x) => (x.proconfig ?? []).includes('search_path=public')), p.filter((x) => !(x.proconfig ?? []).includes('search_path=public')).map((x) => x.proname));
  ok('the keep, the floors and the trigger functions are SECURITY DEFINER; the table guard is not (current_user must be the writer)',
     p.filter((x) => x.prosecdef).length === 11 && !p.find((x) => x.proname === '_floor_table_guard').prosecdef &&
     !p.find((x) => x.proname === '_caller_lane').prosecdef, p.map((x) => `${x.proname}:${x.prosecdef}`));
  ok('no function of the file is executable by anon, authenticated or service_role (none is an RPC)',
     p.every((x) => !x.an && !x.au && !x.sr), p.filter((x) => x.an || x.au || x.sr).map((x) => x.proname));
  const t = (await db.query(`SELECT c.relname, c.relrowsecurity rls,
      has_table_privilege('authenticated', c.oid, 'SELECT') a_sel, has_table_privilege('authenticated', c.oid, 'INSERT') a_ins,
      has_table_privilege('authenticated', c.oid, 'UPDATE') a_upd, has_table_privilege('authenticated', c.oid, 'DELETE') a_del,
      has_table_privilege('anon', c.oid, 'SELECT') n_sel, has_table_privilege('service_role', c.oid, 'INSERT') s_ins
      FROM pg_class c WHERE c.relname IN ('session_evidence_floor', 'invoice_state_floor')`)).rows;
  ok('floor tables: RLS on; authenticated SELECT only; anon nothing; service_role the house-rule ALL',
     t.length === 2 && t.every((r) => r.rls && r.a_sel && !r.a_ins && !r.a_upd && !r.a_del && !r.n_sel && r.s_ins), t);
  const pk = (await db.query(`SELECT conrelid::regclass::text t, pg_get_constraintdef(oid) d FROM pg_constraint
      WHERE conrelid IN ('public.session_evidence_floor'::regclass, 'public.invoice_state_floor'::regclass) AND contype IN ('p','u')`)).rows;
  const partial = (await db.query(`SELECT count(*)::int n FROM pg_index i WHERE i.indrelid IN
      ('public.session_evidence_floor'::regclass, 'public.invoice_state_floor'::regclass) AND i.indpred IS NOT NULL`)).rows[0].n;
  ok('the upsert targets are PRIMARY KEYs, and no partial index exists on the floor tables', pk.length === 2 && partial === 0, { pk, partial });
});

// ---------------------------------------------------------------- fixtures
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const ADMIN2 = '00000000-0000-4000-8000-0000000000a2';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
const CHILD = '00000000-0000-4000-8000-0000000000c1';
const NOBODY = '00000000-0000-4000-8000-0000000000e1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'admin'),($3,'family'),($4,'student')`, [ADMIN, ADMIN2, PARENT, CHILD]);
const R = 'Teacher is sick today, class off';
const CORR = 'Correction: register belonged to another lesson';
const asAdmin = (sql, params) => as(ADMIN, 'authenticated', 'authenticated', sql, params);
const asService = (sql, params) => as(null, 'service_role', 'service_role', sql, params);
const asSuper = (sql, params) => as(null, '', null, sql, params);
// A signed-in person whose write bypasses RLS: exercises the trigger's own rule for callers RLS would stop.
const asUidRaw = (uid, sql, params) => as(uid, 'authenticated', null, sql, params);
const asTeacher = (s, sql, params) => as(s.teacher, 'authenticated', 'authenticated', sql, params);

const preview = async (sid, action = 'cancel', change = null, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', 'SELECT public.session_change_preview($1,$2,$3::jsonb) r',
    [sid, action, change ? JSON.stringify(change) : null])).rows[0].r;
const checked = (sid, { action = 'cancel', reason = R, token, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.cancel_session_checked($1,$2,$3,$4,$5,$6,$7::jsonb) r',
    [sid, action, reason, token, confirm, corr, '{}']).then((r) => r.rows[0].r);
const cancelNow = async (sid, opts = {}) => {
  const p = await preview(sid);
  return checked(sid, { token: p.token, confirm: true, corr: p.tier === 3 ? CORR : null, ...opts });
};
const move = (sid, { date, start, end, reason = R, token, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.move_session_checked($1,$2,$3,$4,$5,$6,$7,$8) r',
    [sid, date, start, end, reason, token, confirm, corr]).then((r) => r.rows[0].r);
const bulk = (items, reason = R, batch = randomUUID(), uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.cancel_sessions_checked_bulk($1::jsonb,$2,$3,$4::jsonb) r',
    [JSON.stringify(items), reason, batch, '{}']).then((r) => r.rows[0].r);

const sess = async (sid) => (await asSuper(`SELECT * FROM sessions WHERE id=$1`, [sid])).rows[0];
const floorOf = async (sid) => (await asSuper(`SELECT * FROM session_evidence_floor WHERE session_id=$1`, [sid])).rows[0] ?? null;
const invFloor = async (k, m) => (await asSuper(`SELECT * FROM invoice_state_floor WHERE student_id=$1 AND month=$2`, [k, m])).rows[0] ?? null;
const overrides = async (sid) => (await asSuper(`SELECT * FROM session_cancel_overrides WHERE session_id=$1 ORDER BY created_at, id`, [sid])).rows;
const d1 = async (sid) => (await asSuper(`SELECT public.session_held_evidence($1) r`, [sid])).rows[0].r;

const PAST = await clock(-3), FUTURE = await clock(10), FAR = await clock(20), OLD = await clock(-40);

async function mk({ when = PAST, start = '17:30', end = '19:00', status = 'Scheduled', cid } = {}) {
  const teacherUid = randomUUID();
  if (!cid) {
    cid = randomUUID();
    await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
    await db.query(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  }
  const { id } = (await asSuper(
    `INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,gen_random_uuid()) RETURNING id`,
    [cid, when.date, start, end, status])).rows[0];
  const t = (await db.query(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, date: when.date, month: when.date.slice(0, 7) };
}
const att = (sid, status, markedBy, student = randomUUID()) =>
  asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, student, status, markedBy]).then(() => student);
const inv = (student, month, { recorded = 0, conf = 'auto_approved', frozen = false, status = 'issued', total = 540000 } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
           VALUES ($1,$2,$3,$4,$4,$5,$6,$7) ON CONFLICT (student_id, month) DO UPDATE SET recorded_payment = EXCLUDED.recorded_payment,
           confirmation_status = EXCLUDED.confirmation_status, tuition_frozen = EXCLUDED.tuition_frozen, status = EXCLUDED.status`,
          [student, month, status, total, recorded, conf, frozen]);
const point = (s, { by = s.teacher, linked = true, date = s.date } = {}) =>
  asSuper(`INSERT INTO point_transactions(student_id,class_id,session_id,points,type,date,created_by)
           VALUES (gen_random_uuid(),$1,$2,5,'participation',$3,$4) RETURNING id`, [s.cid, linked ? s.sid : null, date, by]).then((r) => r.rows[0].id);
const transcript = (s, { linked = true, day = s.date } = {}) =>
  asSuper(`INSERT INTO class_transcripts(class_id,session_id,uploaded_by,transcript_date,status,created_at)
           VALUES ($1,$2,$3,$4,'analyzed',($4::date + time '12:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') RETURNING id`,
          [s.cid, linked ? s.sid : null, s.teacher, day]).then((r) => r.rows[0].id);
const homework = (s) =>
  asSuper(`INSERT INTO homeworks(class_id, created_by, created_at) VALUES ($1,$2,($3::date + time '12:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') RETURNING id`,
          [s.cid, s.teacher, s.date]).then((r) => r.rows[0].id);
const graded = async (s, student = randomUUID()) => {
  const hw = (await asSuper(`INSERT INTO homeworks(class_id, created_by, created_at) VALUES ($1,$2, now() - interval '60 days') RETURNING id`, [s.cid, s.teacher])).rows[0].id;
  const id = (await asSuper(`INSERT INTO homework_submissions(homework_id, student_id, grade, graded_at)
     VALUES ($1,$2,'A',($3::date + time '12:00') AT TIME ZONE 'Asia/Ho_Chi_Minh') RETURNING id`, [hw, student, s.date])).rows[0].id;
  return { hw, id, student };
};

// ------------------------------------------------------------- floor tables
await section('floor tables keep history', async () => {
  const s = await mk({ status: 'Held' });
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]);
  const f = await floorOf(s.sid);
  ok('fixture: an un-held lesson has a SOFT floor', f?.level === 'SOFT', f);
  let r = await tryIt(() => asAdmin(`INSERT INTO session_evidence_floor(session_id, level) VALUES (gen_random_uuid(), 'STRONG')`));
  ok('authenticated cannot INSERT a floor row (no grant)', r.code === '42501', r);
  r = await tryIt(() => asAdmin(`DELETE FROM session_evidence_floor WHERE session_id=$1`, [s.sid]));
  ok('authenticated cannot DELETE a floor row', r.code === '42501', r);
  r = await tryIt(() => asService(`INSERT INTO session_evidence_floor(session_id, level) VALUES (gen_random_uuid(), 'STRONG')`));
  ok('service_role (GRANT ALL) cannot INSERT directly -> HC041', r.code === 'HC041', r);
  r = await tryIt(() => asService(`UPDATE session_evidence_floor SET causes='[]' WHERE session_id=$1`, [s.sid]));
  ok('service_role cannot UPDATE directly -> HC041', r.code === 'HC041', r);
  for (const [who, run] of [['service role', asService], ['superuser (owner)', asSuper]]) {
    r = await tryIt(() => run(`DELETE FROM session_evidence_floor WHERE session_id=$1`, [s.sid]));
    ok(`${who}: DELETE of an evidence floor -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`TRUNCATE session_evidence_floor`));
    ok(`${who}: TRUNCATE of the evidence floor -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`TRUNCATE invoice_state_floor`));
    ok(`${who}: TRUNCATE of the bill floor -> HC040`, r.code === 'HC040', r);
  }
  r = await tryIt(() => asSuper(`UPDATE session_evidence_floor SET level='STRONG' WHERE session_id=$1`, [s.sid]));
  ok('owner: raising SOFT -> STRONG is allowed (an insert-only backfill may raise)', r.ok !== undefined && (await floorOf(s.sid)).level === 'STRONG', r);
  r = await tryIt(() => asSuper(`UPDATE session_evidence_floor SET level='SOFT' WHERE session_id=$1`, [s.sid]));
  ok('owner: lowering STRONG -> SOFT -> HC040', r.code === 'HC040', r);
  r = await tryIt(() => asSuper(`UPDATE session_evidence_floor SET families = '{}'::jsonb WHERE session_id=$1`, [s.sid]));
  ok('owner: clearing a family -> HC040', r.code === 'HC040', r);
  r = await tryIt(() => asSuper(`UPDATE session_evidence_floor SET session_id = gen_random_uuid() WHERE session_id=$1`, [s.sid]));
  ok('owner: re-keying a floor to another lesson -> HC040', r.code === 'HC040', r);
  const k = randomUUID();
  await inv(k, PAST.month, { recorded: 300000 });
  await asAdmin(`UPDATE invoices SET recorded_payment = 0 WHERE student_id=$1`, [k]);
  for (const [label, set] of [['ever_paid true -> false', 'ever_paid = false'], ['max_recorded_payment down', 'max_recorded_payment = 1'],
    ['re-keyed month', "month = '1999-01'"]]) {
    r = await tryIt(() => asSuper(`UPDATE invoice_state_floor SET ${set} WHERE student_id=$1`, [k]));
    ok(`owner: bill floor ${label} -> HC040`, r.code === 'HC040', r);
  }
  r = await tryIt(() => asSuper(`DELETE FROM invoice_state_floor WHERE student_id=$1`, [k]));
  ok('owner: DELETE of a bill floor -> HC040', r.code === 'HC040', r);
  const n = async (uid) => (await as(uid, 'authenticated', 'authenticated', `SELECT
      (SELECT count(*)::int FROM session_evidence_floor) + (SELECT count(*)::int FROM invoice_state_floor) n`)).rows[0].n;
  ok('admins read both floors; the class teacher and a parent read nothing', (await n(ADMIN)) >= 2 && (await n(s.teacher)) === 0 && (await n(PARENT)) === 0);
});

// ---------------------------------------------------------------- G-10
await section('G-10 a register row keeps its lesson, its child and its signature', async () => {
  const s = await mk({ status: 'Held' }), other = await mk({ when: FAR, cid: undefined });
  const k = await att(s.sid, 'Present', s.teacher);
  const lanes = [['admin (person)', (q, p) => asAdmin(q, p)], ['class teacher (person)', (q, p) => asTeacher(s, q, p)],
    ['service role', asService], ['owner / superuser', asSuper]];
  for (const [who, run] of lanes) {
    let r = await tryIt(() => run(`UPDATE attendance SET session_id=$2 WHERE session_id=$1`, [s.sid, other.sid]));
    ok(`HC024 ${who}: re-pointing a mark at another lesson`, r.code === 'HC024', r);
    r = await tryIt(() => run(`UPDATE attendance SET student_id=gen_random_uuid() WHERE session_id=$1`, [s.sid]));
    ok(`HC024 ${who}: re-pointing a mark at another child`, r.code === 'HC024', r);
  }
  const seeded = await mk(); const ks = await att(seeded.sid, 'Present', null);
  let r = await tryIt(() => asService(`UPDATE attendance SET session_id=$2 WHERE student_id=$1`, [ks, other.sid]));
  ok('HC024 even for a seeded row on the service lane', r.code === 'HC024', r);
  for (const [who, run] of lanes.slice(0, 2)) {
    r = await tryIt(() => run(`DELETE FROM attendance WHERE student_id=$1`, [k]));
    ok(`HC025 ${who}: deleting a person's mark on a started lesson (delete_mark)`, r.code === 'HC025' && /delete_mark/.test(r.detail ?? ''), r);
    r = await tryIt(() => run(`UPDATE attendance SET marked_by=NULL WHERE student_id=$1`, [k]));
    ok(`HC025 ${who}: un-signing a person's mark (unmark)`, r.code === 'HC025' && /unmark/.test(r.detail ?? ''), r);
  }
  r = await tryIt(() => as(null, 'authenticated', null, `DELETE FROM attendance WHERE student_id=$1`, [k]));
  ok('HC025 also for an API role with no user (lane unknown, RLS out of the way)', r.code === 'HC025', r);
  ok('  the mark is still there, signed', (await asSuper(`SELECT marked_by FROM attendance WHERE student_id=$1`, [k])).rows[0]?.marked_by === s.teacher);
  r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]));
  ok('changing the mark (the way the refusal points to) is allowed', r.ok !== undefined, r);
  r = await tryIt(() => asService(`UPDATE attendance SET status='Present', marked_by=NULL WHERE student_id=$1`, [k]));
  ok('the Stars sync\'s restore (service lane, marked_by back to NULL) passes', r.ok !== undefined, r);
  const k2 = await att(s.sid, 'Present', s.teacher);
  r = await tryIt(() => asService(`DELETE FROM attendance WHERE student_id=$1`, [k2]));
  ok('the Stars sync\'s delete of a row it wrote (service lane) passes', r.ok !== undefined, r);
  const k3 = await att(s.sid, 'Present', s.teacher);
  r = await tryIt(() => asSuper(`DELETE FROM attendance WHERE student_id=$1`, [k3]));
  ok('owner lane (SQL editor) delete passes', r.ok !== undefined, r);
  r = await tryIt(() => asAdmin(`DELETE FROM attendance WHERE student_id=$1`, [ks]));
  ok('a seeded row (marked_by NULL) is deleted by an admin as before (end_enrollment, ai_action_undo)', r.ok !== undefined, r);
  const fut = await mk({ when: FUTURE }); const kf = await att(fut.sid, 'Present', fut.teacher);
  r = await tryIt(() => asAdmin(`DELETE FROM attendance WHERE student_id=$1`, [kf]));
  ok('a person\'s mark on a lesson that has not started can be deleted', r.ok !== undefined, r);
  const up = await mk(); const ku = await att(up.sid, 'Present', up.teacher);
  r = await tryIt(() => asTeacher(up, `INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)
      ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`, [up.sid, ku, up.teacher]));
  ok('a PostgREST-shaped upsert re-saving an unchanged register passes and writes no floor', r.ok !== undefined && !(await floorOf(up.sid)), r);
});

await section('cancelled lessons stay deletable', async () => {
  const s = await mk({ status: 'Held' });
  for (let i = 0; i < 2; i++) await att(s.sid, 'Present', s.teacher);
  await must('cancel', () => cancelNow(s.sid));
  ok('a cancel writes no floor (the excuse-all is a trigger-made write)', !(await floorOf(s.sid)));
  const p = await preview(s.sid, 'delete');
  ok('cancel, then delete: the preview allows it (D2 5.3 step 9: level now NONE)', p.allowed === true && p.level_now === 'NONE', [p.allowed, p.level, p.level_now]);
  const r = await must('delete', () => checked(s.sid, { action: 'delete', token: p.token, confirm: true, corr: p.tier === 3 ? CORR : null }));
  ok('  and the delete works in the second call; the cascade removes the person\'s marks (not refused by G-10)',
     !!r.override_id && !(await sess(s.sid)) && (await asSuper(`SELECT count(*)::int n FROM attendance WHERE session_id=$1`, [s.sid])).rows[0].n === 0, r);

  // With a floor already there (points removed before the cancel): still deletable once cancelled.
  const t = await mk({ status: 'Scheduled' });
  const pid = await point(t);
  await asTeacher(t, `DELETE FROM point_transactions WHERE id=$1`, [pid]);
  ok('fixture: a removed point leaves a floor', (await floorOf(t.sid))?.level === 'SOFT', await floorOf(t.sid));
  await must('cancel t', () => cancelNow(t.sid));
  const pt = await preview(t.sid, 'delete');
  ok('a cancelled lesson WITH a floor: delete allowed (level now NONE), the floor still raises the tier (SOFT -> T2, review)',
     pt.allowed === true && pt.level === 'SOFT' && pt.level_now === 'NONE' && pt.tier === 2 && pt.review_required === true, [pt.allowed, pt.level, pt.level_now, pt.tier]);
  const rt = await must('delete t', () => checked(t.sid, { action: 'delete', token: pt.token, confirm: true }));
  ok('  deleted, reviewed; the floor row outlives the lesson (no FK)', !!rt.override_id && rt.review_required === true && !!(await floorOf(t.sid)));

  const u = await mk({ status: 'Held' });
  const pid2 = await point(u);
  await asTeacher(u, `DELETE FROM point_transactions WHERE id=$1`, [pid2]);
  const pu = await preview(u.sid, 'delete');
  ok('a lesson NOT cancelled whose evidence was removed: delete refused use_cancel (the floor counts)', pu.allowed === false && pu.refuse_code === 'use_cancel', [pu.allowed, pu.refuse_code, pu.level]);
});

// ---------------------------------------------------------------- G-8: F-11
await section('F-11 (review-3 V7): remove the evidence, then cancel a taught, paid lesson', async () => {
  const s = await mk({ when: PAST, status: 'Scheduled' });
  const k = await att(s.sid, 'Present', null);                 // seeded register
  await inv(k, s.month, { recorded: 540000 });                 // paid
  const pid = await point(s);
  const tid = (await asSuper(`INSERT INTO class_transcripts(class_id,session_id,uploaded_by,status) VALUES ($1,$2,$3,'analyzed') RETURNING id`,
    [s.cid, s.sid, s.teacher])).rows[0].id;                    // linked, uploaded today (not the lesson's day)
  const p0 = await preview(s.sid);
  ok('V7 before: tier 3, STRONG', p0.tier === 3 && p0.level === 'STRONG', [p0.tier, p0.level]);
  await asTeacher(s, `UPDATE point_transactions SET date = date - 1 WHERE id=$1`, [pid]);
  await asTeacher(s, `UPDATE class_transcripts SET session_id = NULL WHERE id=$1`, [tid]);
  ok('V7 D1 now reads NONE (the removal worked)', (await d1(s.sid)).level === 'NONE');
  const p1 = await preview(s.sid);
  ok('V7 after: the tier does NOT drop - still 3; level STRONG (effective), level_now NONE',
     p1.tier === 3 && p1.level === 'STRONG' && p1.level_now === 'NONE', [p1.tier, p1.level, p1.level_now]);
  ok('V7   the floor names both removals (points re-dated, transcript unlinked) by the teacher',
     p1.floor?.level === 'STRONG' && p1.floor.causes.length === 2 && p1.floor.causes.every((c) => c.actor_user_id === s.teacher) &&
     p1.floor.causes.some((c) => c.what === 'points') && p1.floor.causes.some((c) => c.what === 'transcript'), p1.floor);
  ok('V7   review_required, and erased_recently lists the floor\'s causes',
     p1.review_required === true && p1.erased_recently.filter((x) => x.source === 'floor').length === 2, p1.erased_recently);
  let r = await tryIt(() => checked(s.sid, { token: p1.token, confirm: true }));
  ok('V7   cancelling without a correction reason -> HC013', r.code === 'HC013', r);
  const res = await must('V7 cancel', () => checked(s.sid, { token: p1.token, confirm: true, corr: CORR }));
  const o = (await overrides(s.sid))[0] ?? {};
  ok('V7   with it: stored T3, level STRONG, correction mode, review_required, in the queue',
     res.tier === 3 && o.level === 'STRONG' && o.correction_mode === true && o.review_required === true &&
     (await asAdmin(`SELECT count(*)::int n FROM session_cancel_review_queue WHERE override_id=$1`, [o.id ?? randomUUID()])).rows[0].n === 1, o);
});

await section('G-8 one evidence family removed alone', async () => {
  const cases = [
    ['a person\'s Present changed to Excused (admin)', 'STRONG', 'attendance', async (s) => {
      const k = await att(s.sid, 'Present', s.teacher); return () => asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]); }],
    ['a person\'s Absent changed to Excused (teacher)', 'SOFT', 'attendance', async (s) => {
      const k = await att(s.sid, 'Absent', s.teacher); return () => asTeacher(s, `UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]); }],
    ['a participation point deleted (teacher)', 'SOFT', 'points', async (s) => {
      const id = await point(s); return () => asTeacher(s, `DELETE FROM point_transactions WHERE id=$1`, [id]); }],
    ['a participation point re-dated (teacher)', 'SOFT', 'points', async (s) => {
      const id = await point(s); return () => asTeacher(s, `UPDATE point_transactions SET date = date + 2 WHERE id=$1`, [id]); }],
    ['an unlinked point by a person moved to another class (admin)', 'SOFT', 'points', async (s) => {
      const id = await point(s, { linked: false }); const c2 = randomUUID(); await db.query(`INSERT INTO classes VALUES ($1, gen_random_uuid())`, [c2]);
      return () => asAdmin(`UPDATE point_transactions SET class_id=$2 WHERE id=$1`, [id, c2]); }],
    ['a linked transcript deleted (teacher)', 'STRONG', 'transcript', async (s) => {
      const id = await transcript(s); return () => asTeacher(s, `DELETE FROM class_transcripts WHERE id=$1`, [id]); }],
    ['a same-day transcript re-dated (teacher)', 'SOFT', 'transcript', async (s) => {
      const id = await transcript(s, { linked: false }); return () => asTeacher(s, `UPDATE class_transcripts SET transcript_date = transcript_date + 5, created_at = created_at + interval '5 days' WHERE id=$1`, [id]); }],
    ['a same-day transcript marked failed with no audio (service)', 'SOFT', 'transcript', async (s) => {
      const id = await transcript(s, { linked: false }); return () => asService(`UPDATE class_transcripts SET status='failed' WHERE id=$1`, [id]); }],
    ['homework set that day deleted (teacher)', 'SOFT', 'homework', async (s) => {
      const id = await homework(s); return () => asTeacher(s, `DELETE FROM homeworks WHERE id=$1`, [id]); }],
    ['a graded submission: graded_at cleared (teacher)', 'SOFT', 'homework', async (s) => {
      const g = await graded(s); return () => asTeacher(s, `UPDATE homework_submissions SET graded_at = NULL WHERE id=$1`, [g.id]); }],
    ['a graded submission deleted (admin)', 'SOFT', 'homework', async (s) => {
      const g = await graded(s); return () => asAdmin(`DELETE FROM homework_submissions WHERE id=$1`, [g.id]); }],
    ['the Held status undone (admin, raw: D2 allows it)', 'SOFT', 'session_status', async (s) => {
      await asSuper(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]); return () => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]); }],
  ];
  for (const [label, level, what, setup] of cases) {
    const s = await mk({ when: PAST });
    const act = await setup(s);
    const before = (await d1(s.sid)).level;
    const r = await tryIt(act);
    const f = await floorOf(s.sid);
    const p = await preview(s.sid);
    ok(`G-8 ${label}: allowed (nothing refused)`, r.ok !== undefined, r);
    ok(`G-8 ${label}: D1 drops ${before} -> ${p.level_now}; floor ${level}; the preview keeps ${level}`,
       before === level && p.level_now === 'NONE' && f?.level === level && p.level === level, { before, now: p.level_now, floor: f?.level, level: p.level });
    ok(`G-8 ${label}: cause recorded (what=${what}), source d1, the change is reviewed`,
       f?.causes?.length === 1 && f.causes[0].what === what && f.causes[0].source === 'd1' && p.review_required === true, f?.causes);
  }
  // Held undone: T2 instead of T1 (D2 case 15's second half).
  const h = await mk({ when: PAST, status: 'Held' });
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [h.sid]);
  const ph = await preview(h.sid);
  ok('an R-only lesson un-held raw keeps SOFT: T2 (D2 alone said T1)', ph.tier === 2 && ph.level === 'SOFT', [ph.tier, ph.level]);
  // A checked move of a started Held lesson keeps the old day's level.
  const m = await mk({ when: PAST, status: 'Held' });
  await att(m.sid, 'Present', m.teacher);
  const pm = await preview(m.sid, 'move', { date: FAR.date, start_time: '17:30', end_time: '19:00' });
  await must('move', () => move(m.sid, { date: FAR.date, start: '17:30', end: '19:00', token: pm.token, confirm: true, corr: pm.tier === 3 ? CORR : null }));
  ok('a checked move of a taught lesson keeps a floor of what it had (STRONG)', (await floorOf(m.sid))?.level === 'STRONG', await floorOf(m.sid));
  // A raw move that D2 refuses leaves no floor (rolled back with it).
  const rm = await mk({ when: PAST, status: 'Held' });
  const rr = await tryIt(() => asAdmin(`UPDATE sessions SET date=$2 WHERE id=$1`, [rm.sid, FAR.date]));
  ok('a raw move D2 refuses (HC020) writes no floor', rr.code === 'HC020' && !(await floorOf(rm.sid)), rr);
  // A lesson not started keeps nothing.
  const f = await mk({ when: FUTURE }); const fk = await att(f.sid, 'Present', f.teacher);
  await asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [fk]);
  ok('a lesson that has not started gets no floor', !(await floorOf(f.sid)));
  // Already STRONG: the cause is appended, the level stays.
  const st = await mk({ when: PAST });
  const ka = await att(st.sid, 'Present', st.teacher), kb = await att(st.sid, 'Present', st.teacher);
  await asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id = ANY($1::uuid[])`, [[ka, kb]]);
  const fs = await floorOf(st.sid);
  ok('two marks excused in one statement: STRONG once, both causes kept (the second from the STRONG floor)',
     fs?.level === 'STRONG' && fs.causes.length === 2 && fs.causes[1].source === 'floor', fs?.causes);
  ok('the attendance cause names the child (used by the settled test)', fs.causes.every((c) => [ka, kb].includes(c.student_id)));
  // Causes keep the newest 20.
  const many = await mk({ when: PAST });
  const ks = [];
  for (let i = 0; i < 23; i++) ks.push(await att(many.sid, 'Present', many.teacher));
  for (const k of ks) await asAdmin(`UPDATE attendance SET status='Absent' WHERE student_id=$1`, [k]);
  const fm = await floorOf(many.sid);
  ok('causes are capped at the newest 20 (oldest dropped)', fm.causes.length === 20 && fm.causes[19].student_id === ks[22] && fm.causes[0].student_id === ks[3], fm.causes.length);
});

// ---------------------------------------------------------------- R-6
await section('R-6 a caller D1 refuses writes no floor', async () => {
  // Realistic: the child, under RLS, clears graded_at on their own submission.
  const s = await mk({ when: PAST });
  const kid = (await asSuper(`INSERT INTO students(full_name, linked_user_id) VALUES ('kid', $1) RETURNING id`, [CHILD])).rows[0].id;
  const g = await graded(s, kid);
  ok('fixture: the graded submission is evidence (SOFT H)', (await d1(s.sid)).level === 'SOFT');
  const r = await tryIt(() => as(CHILD, 'authenticated', 'authenticated', `UPDATE homework_submissions SET graded_at = NULL WHERE id=$1 RETURNING id`, [g.id]));
  ok('a child clears graded_at on their own submission (RLS allows it)', r.ok?.rows?.length === 1, r);
  ok('  and NO floor row is written', !(await floorOf(s.sid)));
  // Each table, each refused caller, with RLS out of the way: the trigger's own rule.
  const callers = [['a child', CHILD], ['a parent', PARENT], ['a signed-in user with no role', NOBODY], ['a teacher of ANOTHER class', (await mk()).teacher]];
  for (const [who, uid] of callers) {
    const t = await mk({ when: PAST });
    const k = await att(t.sid, 'Present', t.teacher);
    const pid = await point(t);
    const tid = await transcript(t);
    const hid = await homework(t);
    const gg = await graded(t);
    const writes = [
      ['attendance', `UPDATE attendance SET status='Excused' WHERE student_id='${k}'`],
      ['point_transactions', `DELETE FROM point_transactions WHERE id='${pid}'`],
      ['class_transcripts', `DELETE FROM class_transcripts WHERE id='${tid}'`],
      ['homeworks', `DELETE FROM homeworks WHERE id='${hid}'`],
      ['homework_submissions', `UPDATE homework_submissions SET graded_at = NULL WHERE id='${gg.id}'`],
      ['sessions', `UPDATE sessions SET status='Scheduled' WHERE id='${t.sid}'`],
    ];
    await asSuper(`UPDATE sessions SET status='Held' WHERE id=$1`, [t.sid]);
    for (const [tbl, q] of writes) {
      const w = await tryIt(() => asUidRaw(uid, q));
      ok(`R-6 ${who} on ${tbl}: the write goes through, no floor`, w.ok !== undefined && !(await floorOf(t.sid)), [w, await floorOf(t.sid)]);
    }
  }
});

await section('R-6 D1 raises: the floor is what the row proves on its own', async () => {
  await db.exec(`CREATE OR REPLACE FUNCTION public.session_recording_evidence(p_session_id uuid)
    RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $b$ SELECT '[]'::jsonb $b$;`);
  const rows = [
    ['a linked transcript deleted', 'STRONG', 'D', async (s) => { const id = await transcript(s); return () => asTeacher(s, `DELETE FROM class_transcripts WHERE id=$1`, [id]); }],
    ['an unlinked same-day transcript deleted', 'SOFT', 'T', async (s) => { const id = await transcript(s, { linked: false }); return () => asTeacher(s, `DELETE FROM class_transcripts WHERE id=$1`, [id]); }],
    ['a person\'s Present excused', 'STRONG', 'D', async (s) => { const k = await att(s.sid, 'Present', s.teacher); return () => asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]); }],
    ['a person\'s Absent excused', 'SOFT', 'R', async (s) => { const k = await att(s.sid, 'Absent', s.teacher); return () => asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]); }],
    ['a point deleted', 'SOFT', 'P', async (s) => { const id = await point(s); return () => asTeacher(s, `DELETE FROM point_transactions WHERE id=$1`, [id]); }],
    ['homework deleted (never more than SOFT)', 'SOFT', 'H', async (s) => { const id = await homework(s); return () => asTeacher(s, `DELETE FROM homeworks WHERE id=$1`, [id]); }],
  ];
  for (const [label, level, fam, setup] of rows) {
    const s = await mk({ when: PAST });
    const act = await setup(s);
    const r = await tryIt(act);
    const f = await floorOf(s.sid);
    ok(`R-6 D1 raising (recorder helper VOLATILE, 55000): ${label} -> floor ${level} ${fam}, source row`,
       r.ok !== undefined && f?.level === level && f.families?.[fam] === true && Object.keys(f.families).length === 1 && f.causes[0].source === 'row', [r, f]);
  }
  // A point linked to ANOTHER lesson of the class that day proves nothing for this one.
  const a = await mk({ when: PAST }); const b = await mk({ when: PAST, cid: a.cid, start: '08:00', end: '09:00' });
  const id = await point(b);
  await asTeacher(a, `DELETE FROM point_transactions WHERE id=$1`, [id]);
  ok('R-6 own proof is per lesson: the other lesson of that day gets no floor, the linked one SOFT',
     !(await floorOf(a.sid)) && (await floorOf(b.sid))?.level === 'SOFT', [await floorOf(a.sid), await floorOf(b.sid)]);
  await db.exec(`CREATE OR REPLACE FUNCTION public.session_recording_evidence(p_session_id uuid)
    RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $b$ SELECT '[]'::jsonb $b$;`);
});

await section('R-6 honest corrections and bulk', async () => {
  const s = await mk({ when: PAST });
  const k = await att(s.sid, 'Present', s.teacher);
  await asTeacher(s, `UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]);
  const f = await floorOf(s.sid);
  ok('a register saved on the wrong lesson and corrected inside the week: floor STRONG, the cause names the teacher',
     f?.level === 'STRONG' && f.causes[0].actor_user_id === s.teacher && f.causes[0].lane === 'person', f);
  const p = await preview(s.sid);
  ok('  cancelling it costs what it cost before the correction (STRONG, not settled: T2)', p.tier === 2 && p.level === 'STRONG', [p.tier, p.level]);
  // Two taught lessons: points deleted in ONE transaction, then bulk-cancelled.
  const x = await mk({ when: PAST }), y = await mk({ when: PAST });
  const px = await point(x), py = await point(y);
  const e = await script(ADMIN, 'authenticated', 'authenticated', `DELETE FROM point_transactions WHERE id IN ('${px}','${py}')`);
  ok('two lessons\' points deleted in one transaction', e === null, e);
  ok('  both lessons have a floor (kept per lesson)', (await floorOf(x.sid))?.level === 'SOFT' && (await floorOf(y.sid))?.level === 'SOFT');
  const items = [];
  for (const z of [x, y]) { const pz = await preview(z.sid); items.push({ id: z.sid, token: pz.token, confirm: true, reason: 'Class abandoned, fire drill all evening' }); }
  const out = await bulk(items);
  const rows = [...(await overrides(x.sid)), ...(await overrides(y.sid))];
  ok('  bulk-cancelled together: both stored SOFT T2 and reviewed', out.done.length === 2 && rows.length === 2 &&
     rows.every((o) => o.level === 'SOFT' && o.tier === 2 && o.review_required), out);
});

// ---------------------------------------------------------------- G-9
await section('G-9 the bill-state floor', async () => {
  const taught = async (bill) => {
    const s = await mk({ when: PAST, status: 'Held' });
    const k = await att(s.sid, 'Present', s.teacher);
    await inv(k, s.month, bill);
    return { s, k };
  };
  const lowerings = [
    ['recorded_payment reset to 0 (RecordedPaymentManager "reset to 0")', { recorded: 540000 }, `UPDATE invoices SET recorded_payment = 0 WHERE student_id=$1`, 'ever_paid'],
    ['confirmation_status confirmed -> auto_approved', { conf: 'confirmed' }, `UPDATE invoices SET confirmation_status='auto_approved' WHERE student_id=$1`, 'ever_signed'],
    ['the calculator\'s own confirmed -> needs_review', { conf: 'confirmed' }, `UPDATE invoices SET confirmation_status='needs_review' WHERE student_id=$1`, 'ever_signed'],
    ['adjusted -> NULL', { conf: 'adjusted' }, `UPDATE invoices SET confirmation_status=NULL WHERE student_id=$1`, 'ever_signed'],
    ['status paid -> issued (InvoiceStatusManager)', { status: 'paid' }, `UPDATE invoices SET status='issued' WHERE student_id=$1`, 'ever_paid'],
    ['status partial -> issued', { status: 'partial' }, `UPDATE invoices SET status='issued' WHERE student_id=$1`, 'ever_paid'],
    ['unfrozen by an admin', { frozen: true }, `UPDATE invoices SET tuition_frozen=false WHERE student_id=$1`, 'ever_frozen'],
  ];
  for (const [label, bill, q, flag] of lowerings) {
    const { s, k } = await taught(bill);
    const p0 = await preview(s.sid);
    await asAdmin(q, [k]);
    const f = await invFloor(k, s.month);
    const p1 = await preview(s.sid);
    ok(`G-9 ${label}: floor ${flag}, the lesson's cancel stays T3`, f?.[flag] === true && p0.tier === 3 && p1.tier === 3 && p1.settled_any === true,
       { f, t0: p0.tier, t1: p1.tier });
  }
  // every lane
  for (const [who, run] of [['service role', asService], ['owner / superuser', asSuper], ['admin', asAdmin]]) {
    const k = randomUUID(); await inv(k, OLD.month, { recorded: 200000 });
    await run(`UPDATE invoices SET recorded_payment = 50000 WHERE student_id=$1`, [k]);
    const f = await invFloor(k, OLD.month);
    ok(`G-9 every lane - ${who}: a lowered payment keeps ever_paid and the highest payment (200000)`,
       f?.ever_paid === true && Number(f.max_recorded_payment) === 200000 && f.causes[0].lane === (who === 'admin' ? 'person' : who === 'service role' ? 'service' : 'owner'), f);
  }
  // deleted and re-keyed bills
  const { s: sd, k: kd } = await taught({ recorded: 540000, conf: 'confirmed' });
  await asSuper(`DELETE FROM invoices WHERE student_id=$1`, [kd]);
  const fd = await invFloor(kd, sd.month);
  ok('G-9 a deleted bill: the floor row survives with every flag the bill had', fd?.ever_paid && fd.ever_signed && Number(fd.max_recorded_payment) === 540000 && fd.causes[0].what[0] === 'deleted', fd);
  ok('  and the lesson\'s cancel is still T3', (await preview(sd.sid)).tier === 3);
  const { s: sm, k: km } = await taught({ recorded: 540000 });
  await asSuper(`UPDATE invoices SET month = '1999-01' WHERE student_id=$1`, [km]);
  ok('G-9 a bill moved to another month counts as removed from the old one', (await invFloor(km, sm.month))?.ever_paid === true && (await preview(sm.sid)).tier === 3);
  // not lowered: no row
  const kn = randomUUID(); await inv(kn, OLD.month, { recorded: 100000 });
  await asAdmin(`UPDATE invoices SET recorded_payment = 300000, total_amount = 999, status='paid' WHERE student_id=$1`, [kn]);
  await asAdmin(`UPDATE invoices SET confirmation_status='confirmed' WHERE student_id=$1`, [kn]);
  ok('G-9 raising a payment, a total, a label: no floor row', !(await invFloor(kn, OLD.month)));
  const kz = randomUUID(); await inv(kz, OLD.month, {});
  await asSuper(`DELETE FROM invoices WHERE student_id=$1`, [kz]);
  ok('G-9 deleting a bill that was never paid, signed or frozen: no floor row', !(await invFloor(kz, OLD.month)));
  // the floor sees the FINAL NEW: a non-admin unfreeze is undone by keep_frozen_invoice_amounts first
  const kf = randomUUID(); await inv(kf, OLD.month, { frozen: true });
  await asService(`UPDATE invoices SET tuition_frozen=false WHERE student_id=$1`, [kf]);
  ok('G-9 a service-lane unfreeze is kept frozen by the freeze trigger, so nothing is lowered and no floor is written',
     (await asSuper(`SELECT tuition_frozen f FROM invoices WHERE student_id=$1`, [kf])).rows[0].f === true && !(await invFloor(kf, OLD.month)));
  // never changes NEW
  const a1 = randomUUID(), a2 = randomUUID();
  for (const k of [a1, a2]) await inv(k, OLD.month, { recorded: 540000, conf: 'confirmed', frozen: true });
  const upd = `UPDATE invoices SET recorded_payment = 0, confirmation_status = 'needs_review', status = 'issued', tuition_frozen = false, total_amount = 1 WHERE student_id=$1
               RETURNING to_jsonb(invoices) - 'id' - 'student_id' j`;
  const with1 = (await asAdmin(upd, [a1])).rows[0].j;
  await db.exec(`ALTER TABLE public.invoices DISABLE TRIGGER zz_invoice_state_floor`);
  const without = (await asAdmin(upd, [a2])).rows[0].j;
  await db.exec(`ALTER TABLE public.invoices ENABLE TRIGGER zz_invoice_state_floor`);
  ok('G-9 the floor trigger never changes NEW: the same update with and without it leaves identical rows',
     JSON.stringify(with1) === JSON.stringify(without), { with1, without });
  ok('  (with it, the floor was written; without it, not)', !!(await invFloor(a1, OLD.month)) && !(await invFloor(a2, OLD.month)));
  const st = (await asSuper(`SELECT public.invoice_floor_state($1,$2) a, public.invoice_floor_state(gen_random_uuid(), $2) b`, [a1, OLD.month])).rows[0];
  ok('invoice_floor_state: the floor row, or all-false', st.a.floor === true && st.a.ever_paid && st.a.ever_signed && st.a.ever_frozen &&
     st.b.floor === false && st.b.ever_paid === false && Number(st.b.max_recorded_payment) === 0, st);
});

await section('settled reads the bill floor (D2 settled test)', async () => {
  // A lesson whose only billable child had a paid bill reset: STRONG + settled = T3.
  const s = await mk({ when: OLD, status: 'Held' });
  const k = await att(s.sid, 'Present', s.teacher);
  await inv(k, s.month, { recorded: 540000 });
  await asAdmin(`UPDATE invoices SET recorded_payment = 0 WHERE student_id=$1`, [k]);
  ok('D1 alone no longer sees it settled', (await d1(s.sid)).settled.tuition === false);
  const p = await preview(s.sid);
  ok('the preview does: settled_any true, T3, correction reason required', p.settled_any === true && p.tier === 3 && p.requires.correction_reason === true, [p.settled_any, p.tier]);
  // With an evidence floor, a child excused off the register still counts.
  const e = await mk({ when: PAST });
  const ke = await att(e.sid, 'Present', e.teacher);
  await inv(ke, e.month, { recorded: 540000 });
  await asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [ke]);
  ok('fixture: D1 reads NONE and not settled (no billable row left)', (await d1(e.sid)).level === 'NONE' && (await d1(e.sid)).settled.tuition === false);
  const pe = await preview(e.sid);
  ok('with an evidence floor, settled is judged over every child on the register: T3', pe.tier === 3 && pe.settled_any === true, [pe.tier, pe.settled_any]);
  // A child on the register who is NOT named by any cause (a seeded row the
  // service lane excused) still counts once the lesson has a floor.
  const x = await mk({ when: PAST });
  const kx = await att(x.sid, 'Present', null);
  await inv(kx, x.month, { recorded: 540000 });
  await asService(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [kx]);
  const tx = await transcript(x);
  await asTeacher(x, `DELETE FROM class_transcripts WHERE id=$1`, [tx]);
  const px = await preview(x.sid);
  ok('with a floor, an excused child never named by a cause still makes the lesson settled: T3 (not T2)',
     px.tier === 3 && px.settled_any === true && !(px.floor?.causes ?? []).some((c) => c.student_id === kx), [px.tier, px.settled_any]);
  // A child whose mark the service lane deleted is still named by the floor's cause.
  const g = await mk({ when: PAST });
  const kg = await att(g.sid, 'Present', g.teacher);
  await inv(kg, g.month, { recorded: 540000 });
  await asService(`DELETE FROM attendance WHERE student_id=$1`, [kg]);
  const pg = await preview(g.sid);
  ok('a person\'s mark deleted on the service lane: floor STRONG names the child, whose paid bill keeps the cancel at T3',
     pg.tier === 3 && pg.level === 'STRONG' && pg.level_now === 'NONE', [pg.tier, pg.level, pg.level_now]);
  // Destination month of a move reads the bill floor too.
  const m = await mk({ when: FUTURE });
  const km = await att(m.sid, 'Present', null);
  const dest = await clock(100);
  await inv(km, dest.month, { recorded: 540000 });
  await asAdmin(`UPDATE invoices SET recorded_payment = 0 WHERE student_id=$1 AND month=$2`, [km, dest.month]);
  const pm = await preview(m.sid, 'move', { date: dest.date, start_time: '17:30', end_time: '19:00' });
  ok('a move into a month whose bill was paid and reset: destination tuition true, reviewed', pm.destination?.tuition === true && pm.review_required === true, pm.destination);
});

// ---------------------------------------------------------------- assess output
await section('assess output: level_now, floor, fingerprint, impact, token v3', async () => {
  const fam = (await asSuper(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).rows[0].id;
  const s = await mk({ when: PAST, status: 'Held' });
  const kids = [];
  for (let i = 0; i < 3; i++) {
    const k = (await asSuper(`INSERT INTO students(full_name, family_id) VALUES ('k', $1) RETURNING id`, [i < 2 ? fam : null])).rows[0].id;
    await att(s.sid, 'Present', s.teacher, k); kids.push(k);
  }
  await inv(kids[0], s.month, { recorded: 300000 });
  await inv(kids[1], s.month, { recorded: 200000 });
  await inv(kids[2], s.month, { conf: 'confirmed' });
  const p = await preview(s.sid), p2 = await preview(s.sid, 'cancel', null, ADMIN2);
  ok('impact: tier, closed_payroll false, 2 families (two siblings + one alone), 500000 recorded',
     p.impact?.tier === p.tier && p.impact.closed_payroll === false && p.impact.families === 2 && Number(p.impact.paid_vnd) === 500000, p.impact);
  ok('fingerprint: the same for two admins, the token is not', p.fingerprint === p2.fingerprint && p.token !== p2.token && /^[0-9a-f]{64}$/.test(p.fingerprint));
  ok('level_now and floor are in the output (no floor yet: null)', p.level_now === 'STRONG' && p.floor === null);
  await asAdmin(`UPDATE invoices SET recorded_payment = 100000 WHERE student_id=$1`, [kids[0]]);
  const p3 = await preview(s.sid);
  ok('impact.paid_vnd counts the highest payment seen (the floor), not the lowered one', Number(p3.impact.paid_vnd) === 500000, p3.impact);
  // token v3: a floor cause added between preview and confirm stales the
  // token even when nothing D1 reads (its hash) and the floor's level move:
  // lesson A already has a STRONG floor; a point linked to lesson B of the
  // same class and day is deleted, which the keep also records against A.
  const A = await mk({ when: PAST, status: 'Held' });
  const ka = await att(A.sid, 'Present', A.teacher);
  await att(A.sid, 'Present', A.teacher);
  await asAdmin(`UPDATE attendance SET status='Absent' WHERE student_id=$1`, [ka]);
  const B = await mk({ when: PAST, cid: A.cid, start: '08:00', end: '09:00' });
  const idB = await point(B);
  const pt = await preview(A.sid);
  const h0 = (await d1(A.sid)).snapshot_hash;
  await asTeacher(A, `DELETE FROM point_transactions WHERE id=$1`, [idB]);
  const fa = await floorOf(A.sid);
  ok('fixture: the D1 hash of A and its floor level unchanged; the floor of A gained a cause', (await d1(A.sid)).snapshot_hash === h0 &&
     fa.level === 'STRONG' && fa.causes.length === 2, fa.causes);
  const r = await tryIt(() => checked(A.sid, { token: pt.token, confirm: true }));
  ok('token v3: a floor cause added between preview and confirm -> HC011', r.code === 'HC011', r);
  const pt2 = await preview(A.sid);
  ok('  a new preview works', !!(await must('token', () => checked(A.sid, { token: pt2.token, confirm: true, corr: pt2.tier === 3 ? CORR : null }))).override_id);
});

await section('G-10 residue: marks re-pointed away before D4', async () => {
  const s = await mk({ when: PAST, status: 'Held' });
  const other = await mk({ when: FAR, cid: s.cid });
  const gone = randomUUID();
  await inv(gone, s.month, { recorded: 540000 });
  // what audit_row_change wrote when the re-point was still possible
  await asSuper(`INSERT INTO audit_log(entity, entity_id, action, operation, changed_fields, diff, occurred_at)
     VALUES ('attendance', gen_random_uuid()::text, 'update', 'UPDATE', ARRAY['session_id'],
             jsonb_build_object('old', jsonb_build_object('session_id', $1::text, 'student_id', $2::text, 'status', 'Present', 'marked_by', gen_random_uuid()),
                                'new', jsonb_build_object('session_id', $3::text, 'student_id', $2::text, 'status', 'Present')),
             now() - interval '90 days')`, [s.sid, gone, other.sid]);
  const p = await preview(s.sid);
  ok('the re-pointed child (90 days ago) is in refresh_pairs and invoices_before',
     p.refresh_pairs.some((x) => x.student_id === gone && x.month === s.month) && p.invoices_before.some((x) => x.student_id === gone), p.refresh_pairs);
  ok('  and their paid bill makes the lesson settled: T2 -> (Held, SOFT, settled) T2, settled_any true', p.settled_any === true, p.settled_any);
});

// ---------------------------------------------------------------- column sweep
await section('column sweep (information_schema): no column change lowers D1 without a floor', async () => {
  const tables = ['attendance', 'point_transactions', 'class_transcripts', 'homeworks', 'homework_submissions'];
  const cols = (await db.query(`SELECT table_name t, column_name c, data_type ty FROM information_schema.columns
     WHERE table_schema='public' AND table_name = ANY($1) ORDER BY table_name, ordinal_position`, [tables])).rows;
  const change = (c, ty) => ty === 'uuid' ? `${c} = gen_random_uuid()` : ty === 'date' ? `${c} = ${c} + 3`
    : ty.startsWith('timestamp') ? `${c} = COALESCE(${c}, now()) - interval '3 days'` : ty === 'integer' || ty === 'numeric' ? `${c} = COALESCE(${c}, 0) + 7`
    : ty === 'boolean' ? `${c} = NOT ${c}` : c === 'status' ? `${c} = CASE WHEN ${c} = 'failed' THEN 'analyzed' ELSE 'failed' END`
    : c === 'type' ? `${c} = 'vocabulary'` : `${c} = 'x' || COALESCE(${c}, '')`;
  let holes = 0, checkedN = 0;
  for (const { t, c, ty } of cols) {
    const s = await mk({ when: PAST });
    let where;
    if (t === 'attendance') where = `student_id = '${await att(s.sid, 'Present', s.teacher)}'`;
    else if (t === 'point_transactions') where = `id = '${await point(s)}'`;
    else if (t === 'class_transcripts') where = `id = '${await transcript(s)}'`;
    else if (t === 'homeworks') where = `id = '${await homework(s)}'`;
    else where = `id = '${(await graded(s)).id}'`;
    const before = (await d1(s.sid)).level;
    const r = await tryIt(() => asAdmin(`UPDATE ${t} SET ${change(c, ty)} WHERE ${where}`));
    const after = (await d1(s.sid)).level;
    const f = await floorOf(s.sid);
    const rank = { NONE: 0, SOFT: 1, STRONG: 2 };
    const refused = r.code === 'HC024';
    const hole = !refused && r.ok !== undefined && rank[after] < rank[before] && !(f && rank[f.level] >= rank[before]);
    checkedN++;
    if (hole) { holes++; ok(`sweep ${t}.${c}: lowered D1 ${before} -> ${after} with no floor`, false, { r, f }); }
  }
  ok(`sweep: ${checkedN} column changes over the five evidence tables, none lowers the level without a floor`, holes === 0 && checkedN >= 35, { checkedN, holes });
});

// ---------------------------------------------------------------- policy pin
await section('policy pin: who may UPDATE / DELETE the five evidence tables (real migrations)', async () => {
  // Every CREATE / DROP POLICY on the five tables, in file order, across supabase/migrations.
  const dir = resolve(repo, 'supabase', 'migrations');
  const tables = ['attendance', 'point_transactions', 'class_transcripts', 'homeworks', 'homework_submissions'];
  const live = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    const text = readFileSync(resolve(dir, f), 'utf8').replace(/--[^\n]*/g, '');
    const re = /(CREATE|DROP)\s+POLICY\s+(IF\s+EXISTS\s+)?("([^"]+)"|(\w+))\s+ON\s+(public\.)?"?(\w+)"?([\s\S]*?);/gi;
    for (const m of text.matchAll(re)) {
      const name = m[4] ?? m[5], tbl = m[7];
      if (!tables.includes(tbl)) continue;
      const key = `${tbl}.${name}`;
      if (m[1].toUpperCase() === 'DROP') live.delete(key);
      else live.set(key, { file: f, body: m[8].replace(/\s+/g, ' ').trim() });
    }
  }
  const writers = [...live.entries()].filter(([, v]) => !/\bFOR\s+(SELECT|INSERT)\b/i.test(v.body));
  const allowed = (k, v) => /has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'/i.test(v.body) && !/\bOR\b/i.test(v.body.replace(/WITH CHECK[\s\S]*/i, ''))
    || /^\s*FOR\s+(ALL|UPDATE|DELETE)(\s+TO\s+authenticated)?\s+USING\s*\(\s*(public\.)?is_teacher_of_class\(auth\.uid\(\),\s*class_id\)\s*\)/i.test(v.body)
    || /is_teacher_of_class\(auth\.uid\(\),\s*h\.class_id\)/i.test(v.body) && k.startsWith('homework_submissions.')
    || (k === 'homework_submissions.Students can update own submissions');
  // KNOWN, design question DQ-1: the lesson's own teacher and its assistants may
  // update / delete marks at any date (20260403050441), while D1 accepts them
  // only within 7 days (is_teacher_of_class). Pinned so that any other
  // loosening turns this red.
  const known = ['attendance.teacher_attendance_update', 'attendance.teacher_attendance_delete'];
  const notAllowed = writers.filter(([k, v]) => !allowed(k, v) && !known.includes(k)).map(([k, v]) => `${k} (${v.file})`);
  ok(`policy pin: ${writers.length} write policies found on the five tables`, writers.length >= 8, writers.map(([k]) => k));
  ok('policy pin: every UPDATE / DELETE policy is admin-only, class-teacher (is_teacher_of_class), a child\'s own submission, or one of the two known lesson-staff attendance policies',
     notAllowed.length === 0, notAllowed);
  ok('policy pin: the two known lesson-staff attendance policies are still there exactly (DQ-1 open)', known.every((k) => live.has(k)), [...live.keys()].filter((k) => k.startsWith('attendance.')));
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
