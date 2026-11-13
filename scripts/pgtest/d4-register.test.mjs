// D4 step 1b: the money guard's core and the register (G-11, G-12, DQ-1).
// Drives the REAL migrations in paste order (see run.mjs for the list) and
// the step's rollback script as the last argument.
//
// Spec: docs/evidence/D4-design.md revision 2 b.0, b.3, c.2, f.3 ("G-11",
// "G-12"); the conductor's DQ-1 ruling. Prelude: d4-prelude.mjs with the
// evidence tables' row security.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { harness, makeDb, sqlOf, migPath, D4_ENROLMENT_RPCS } from './d4-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 9) {
  console.error('usage: d4-register.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> <rollback 2>');
  process.exit(2);
}
const [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF, coreF, rb2F] = files;
const base = [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF];
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, must, script, clock } = H;

// ------------------------------------------------------------ install
await section('preflight', async () => {
  const bare = await makeDb(PGlite, { people: true, migrations: [auditF, cancelF, enrolF, d1F, d2F] });
  let msg = null;
  try { await bare.exec(sqlOf(coreF)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('preflight: without D4 file 1 the file refuses, naming it', /d4_core_register cannot be installed/.test(msg ?? '') &&
     /invoice_state_floor|_floor_mark_level/.test(msg ?? ''), msg);
  const t = (await bare.query(`SELECT to_regclass('public.money_change_overrides') a,
      (SELECT count(*)::int FROM pg_trigger WHERE tgname = 'zz_attendance_money_guard') n`)).rows[0];
  ok('preflight:   and installs nothing', t.a === null && t.n === 0, t);
  await bare.close();
});

await section('preflight: the step 1a bodies it relies on', async () => {
  const x = await makeDb(PGlite, { people: true, migrations: base });
  await x.exec(`CREATE OR REPLACE FUNCTION public._caller_lane() RETURNS text LANGUAGE sql STABLE SET search_path = public AS $f$ SELECT 'owner' $f$;`);
  let msg = null;
  try { await x.exec(sqlOf(coreF)); } catch (e) { msg = e.message; }
  await x.exec('ROLLBACK').catch(() => {});
  ok('a _caller_lane that is not the reviewed 1a body -> refused, naming it, nothing installed',
     /_caller_lane\(\) is not the step 1a body/.test(msg ?? '') &&
     (await x.query(`SELECT to_regclass('public.money_change_overrides') a`)).rows[0].a === null, msg);
  await x.close();
  const y = await makeDb(PGlite, { people: true, migrations: base });
  const def = (await y.query(`SELECT pg_get_functiondef('public._floor_mark_level(text, uuid)'::regprocedure) d`)).rows[0].d;
  await y.exec(def.replace(/\n/g, '\r\n'));
  msg = null;
  try { await y.exec(sqlOf(coreF)); } catch (e) { msg = e.message; }
  ok('the same 1a body pasted with CRLF (as live) is accepted (md5 of the CR-stripped text)', msg === null, msg);
  await y.close();
});

db = await makeDb(PGlite, { people: true, rls: true, migrations: base });
const catalog = async () => (await db.query(`SELECT
   (SELECT md5(string_agg(p.oid::regprocedure::text || md5(p.prosrc) || p.prosecdef || COALESCE(p.proconfig::text,''), ',' ORDER BY p.oid::regprocedure::text))
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname NOT IN (SELECT proname FROM pg_proc WHERE false)) f,
   (SELECT md5(string_agg(c.relname || '.' || t.tgname || pg_get_triggerdef(t.oid) || t.tgenabled::text, ',' ORDER BY c.relname, t.tgname))
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal) t`)).rows[0];
const fnsBefore = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
   has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
const trgBefore = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
const rowsDigest = async () => (await db.query(`SELECT
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM attendance a) a,
   (SELECT md5(COALESCE(string_agg(to_jsonb(i)::text, ',' ORDER BY i.id), '')) FROM invoices i) i,
   (SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, ',' ORDER BY s.id), '')) FROM sessions s) s`)).rows[0];
{
  const cid = randomUUID();
  await db.query(`INSERT INTO classes VALUES ($1, gen_random_uuid())`, [cid]);
  const sid = (await db.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1, CURRENT_DATE - 40,'17:30','19:00','Held',gen_random_uuid()) RETURNING id`, [cid])).rows[0].id;
  await db.query(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1, gen_random_uuid(), 'Excused', gen_random_uuid())`, [sid]);
}
const digestBefore = await rowsDigest();
await db.exec(sqlOf(coreF));

await section('install', async () => {
  ok('no row rewritten (attendance, invoices, sessions identical)', JSON.stringify(await rowsDigest()) === JSON.stringify(digestBefore));
  const c1 = await catalog();
  let e = null; try { await db.exec(sqlOf(coreF)); } catch (x) { e = x.message; }
  ok('the file applies a second time', e === null, e);
  ok('  as a no-op on functions and triggers', JSON.stringify(await catalog()) === JSON.stringify(c1));
  const after = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
     has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
  const changed = [...fnsBefore.keys()].filter((k) => JSON.stringify(fnsBefore.get(k)) !== JSON.stringify(after.get(k)));
  ok('no existing function is replaced or re-granted (D1, D2, file 1 untouched)', changed.length === 0, changed);
  const trgAfter = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
  const added = trgAfter.filter((x) => !trgBefore.some((y) => y.k === x.k)).map((x) => x.k).sort();
  ok('every trigger that existed is unchanged; added: the register guard and the two tables\' guards',
     trgBefore.every((x) => JSON.stringify(trgAfter.find((y) => y.k === x.k)) === JSON.stringify(x)) &&
     JSON.stringify(added) === JSON.stringify(['attendance.zz_attendance_money_guard',
       'money_change_events.money_change_events_append_only', 'money_change_events.money_change_events_insert_guard',
       'money_change_events.money_change_events_no_truncate', 'money_change_overrides.money_change_overrides_append_only',
       'money_change_overrides.money_change_overrides_insert_guard', 'money_change_overrides.money_change_overrides_no_truncate']), added);
  const fns = (await db.query(`SELECT proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'EXECUTE') an,
      has_function_privilege('authenticated', oid, 'EXECUTE') au, has_function_privilege('service_role', oid, 'EXECUTE') sr
      FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND oid::regprocedure::text NOT IN (SELECT unnest($1::text[]))`, [[...fnsBefore.keys()]])).rows;
  ok('every new function pins search_path=public', fns.length >= 20 && fns.every((f) => (f.proconfig ?? []).includes('search_path=public')),
     fns.filter((f) => !(f.proconfig ?? []).includes('search_path=public')).map((f) => f.proname));
  const rpc = ['money_change_preview', 'money_change_checked', 'money_changes_checked_bulk', 'record_money_change_event', 'd4_guard_status'];
  ok('RPCs: authenticated only (not anon, not service_role); log_money_automation_refused: service_role only; the rest: nobody',
     fns.every((f) => rpc.includes(f.proname) ? (f.au && !f.an && !f.sr)
       : f.proname === 'log_money_automation_refused' ? (f.sr && !f.au && !f.an) : (!f.au && !f.an && !f.sr)),
     fns.map((f) => `${f.proname}:${f.an}${f.au}${f.sr}`));
  const t = (await db.query(`SELECT c.relname, c.relrowsecurity rls, has_table_privilege('authenticated', c.oid, 'SELECT') s,
      has_table_privilege('authenticated', c.oid, 'INSERT') i, has_table_privilege('anon', c.oid, 'SELECT') an,
      has_table_privilege('service_role', c.oid, 'INSERT') si
      FROM pg_class c WHERE c.relname IN ('money_change_overrides', 'money_change_events')`)).rows;
  ok('tables: RLS on, authenticated SELECT only, anon nothing, service_role the house-rule ALL', t.length === 2 &&
     t.every((r) => r.rls && r.s && !r.i && !r.an && r.si), t);
  const src = sqlOf(coreF);
  ok('the paste fails fast: SET LOCAL lock_timeout = \'5s\' right after BEGIN', /BEGIN;\s*(--[^\n]*\n\s*)*SET LOCAL lock_timeout = '5s';/.test(src));
  const g = (await db.query(`SELECT prosrc FROM pg_proc WHERE proname = '_attendance_money_guard'`)).rows[0].prosrc;
  ok('rule 1 LOCKS the existing row (FOR UPDATE) before passing an INSERT (a concurrent delete is waited for, R-2)',
     /PERFORM 1 FROM public\.attendance a\s+WHERE a\.session_id = NEW\.session_id AND a\.student_id = NEW\.student_id FOR UPDATE;\s+IF FOUND THEN\s+RETURN NEW;/.test(g));
  ok('no partial unique index on the new tables', (await db.query(`SELECT count(*)::int n FROM pg_index i WHERE i.indrelid IN
      ('public.money_change_overrides'::regclass, 'public.money_change_events'::regclass) AND i.indisunique AND i.indpred IS NOT NULL`)).rows[0].n === 0);
});

// ---------------------------------------------------------------- fixtures
const ADMIN = '00000000-0000-4000-8000-0000000000a1', ADMIN2 = '00000000-0000-4000-8000-0000000000a2';
const PARENT = '00000000-0000-4000-8000-0000000000f1', COVER = '00000000-0000-4000-8000-0000000000c9';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'admin'),($3,'family'),($4,'teacher')`, [ADMIN, ADMIN2, PARENT, COVER]);
const R = 'Register was entered for the wrong child';
const CORR = 'Correction: this mark was wrong on the bill';
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asTeacher = (s, sql, p) => as(s.teacher, 'authenticated', 'authenticated', sql, p);
const asCoverRaw = (sql, p) => as(COVER, 'authenticated', null, sql, p);   // the live attendance policy lets lesson staff through

const now = await clock(0, 0);
const NOW_MONTH = now.month;
const TODAY = await clock(0, -2);       // started two hours ago
const OLDPAST = await clock(-40);       // more than a week ago, in a past month
const FUTURE = await clock(10);
// More than a week ago, in the month that is still "current" (the first week of a month counts the one before).
const OLDCUR = await clock(-7, -4);
const OLDCUR_PAST = (await db.query(`SELECT public._money_month_is_past($1) p`, [OLDCUR.month])).rows[0].p;

async function mk({ when = OLDPAST, start, end, status = 'Held', cid } = {}) {
  const teacherUid = randomUUID();
  if (!cid) {
    cid = randomUUID();
    await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
    await db.query(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  }
  start = start ?? '17:30';
  end = end ?? '19:00';
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,gen_random_uuid()) RETURNING id`,
    [cid, when.date, start, end, status])).rows[0];
  const t = (await db.query(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s, { family = null, enrol = true } = {}) => {
  const id = (await asSuper(`INSERT INTO students(full_name, family_id) VALUES ('k', $1) RETURNING id`, [family])).rows[0].id;
  if (enrol) await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  return id;
};
const att = (s, k, status, by) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [s.sid, k, status, by]);
const inv = (k, month, { recorded = 0, conf = 'auto_approved', frozen = false, status = 'issued' } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
           VALUES ($1,$2,$3,540000,540000,$4,$5,$6)`, [k, month, status, recorded, conf, frozen]);
const mark = async (s, k) => (await asSuper(`SELECT status, marked_by FROM attendance WHERE session_id=$1 AND student_id=$2`, [s.sid, k])).rows[0];
const preview = async (entity, op, args, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_preview($1,$2,$3::jsonb) r`, [entity, op, JSON.stringify(args)])).rows[0].r;
const checked = (entity, op, args, { reason = null, token = null, confirm = false, corr = null, ctx = {} } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_checked($1,$2,$3::jsonb,$4,$5,$6,$7,$8::jsonb) r`,
    [entity, op, JSON.stringify(args), reason, token, confirm, corr, JSON.stringify(ctx)]).then((r) => r.rows[0].r);
const go = async (entity, op, args, uid = ADMIN) => {
  const p = await preview(entity, op, args, uid);
  return checked(entity, op, args, { reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, corr: p.tier === 3 ? CORR : null }, uid);
};
const events = async (kind) => (await asSuper(`SELECT * FROM money_change_events WHERE kind=$1 ORDER BY created_at, id`, [kind])).rows;
const ts = async (k, m) => (await asSuper(`SELECT public.tuition_month_state($1,$2) r`, [k, m])).rows[0].r;

// ---------------------------------------------------------------- tiers
await section('tuition_month_state: the table of b.0', async () => {
  const s = await mk({ when: OLDPAST });
  const cases = [
    ['current month, no bill', NOW_MONTH, null, 0], ['current month, issued', NOW_MONTH, {}, 0],
    ['current month, paid', NOW_MONTH, { recorded: 540000 }, 0], ['current month, confirmed', NOW_MONTH, { conf: 'confirmed' }, 2],
    ['current month, frozen', NOW_MONTH, { frozen: true }, 2],
    ['past month, issued', OLDPAST.month, {}, 1], ['past month, paid', OLDPAST.month, { recorded: 1 }, 2],
    ['past month, partial label', OLDPAST.month, { status: 'partial' }, 2], ['past month, adjusted', OLDPAST.month, { conf: 'adjusted' }, 3],
    ['past month, frozen', OLDPAST.month, { frozen: true }, 3],
  ];
  for (const [label, month, bill, tier] of cases) {
    const k = await kid(s);
    if (bill) await inv(k, month, bill);
    const r = await ts(k, month);
    ok(`tuition_month_state ${label} -> T${tier}`, r.tier === tier, r);
  }
  const k1 = await kid(s);
  ok('past month, no bill, the child\'s class taught that month -> T1', (await ts(k1, OLDPAST.month)).tier === 1);
  const lone = (await asSuper(`INSERT INTO students(full_name) VALUES ('x') RETURNING id`)).rows[0].id;
  ok('past month, no bill, no lesson of the child\'s classes -> T0', (await ts(lone, OLDPAST.month)).tier === 0);
  const k2 = await kid(s);
  await inv(k2, OLDPAST.month, { recorded: 540000, conf: 'confirmed' });
  await asAdmin(`UPDATE invoices SET recorded_payment = 0, confirmation_status = 'auto_approved', status = 'issued' WHERE student_id=$1`, [k2]);
  const f = await ts(k2, OLDPAST.month);
  ok('the bill floor: a payment reset and an un-confirm leave the past month at T3 (signed), state from the floor', f.tier === 3 && f.state === 'signed', f);
  ok('a malformed month fails closed: T3', (await ts(k2, 'nope')).tier === 3);
  const kc = await kid(s);
  await inv(kc, NOW_MONTH, { conf: 'confirmed' });
  await asAdmin(`UPDATE invoices SET confirmation_status = 'needs_review' WHERE student_id=$1`, [kc]);
  ok('the calculator\'s own confirmed -> needs_review in the current month keeps T2', (await ts(kc, NOW_MONTH)).tier === 2);
});

await section('tuition_reach and payroll_reach', async () => {
  const fam = (await asSuper(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).rows[0].id;
  const s = await mk({ when: OLDPAST });
  const a = await kid(s, { family: fam }), b = await kid(s, { family: fam });
  await inv(b, OLDPAST.month, { recorded: 540000 });
  const r = (await asSuper(`SELECT public.tuition_reach($1::uuid[], $2, $3, $4) r`, [[a], s.cid, OLDPAST.date, OLDPAST.date])).rows[0].r;
  ok('tuition_reach widens to every child of the family (R-8a): the sibling\'s paid past month makes it T2',
     r.tier === 2 && r.students.includes(b) && r.refresh_pairs.some((p) => p.student_id === b) && Number(r.impact.paid_vnd) === 540000, r);
  ok('tuition_reach: a bad range -> HC015', (await tryIt(() => asSuper(`SELECT public.tuition_reach($1::uuid[], NULL, '2026-02-01', '2026-01-01')`, [[a]]))).code === 'HC015');
  const t = randomUUID();
  await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',$3)`, [s.cid, OLDPAST.date, t]);
  let p = (await asSuper(`SELECT public.payroll_reach($1, NULL, $2, $3) r`, [t, OLDPAST.date, OLDPAST.date])).rows[0].r;
  ok('payroll_reach: a Held lesson before today in reach -> T1', p.tier === 1 && p.held_lessons === 1, p);
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1, 'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [OLDPAST.month]);
  p = (await asSuper(`SELECT public.payroll_reach($1, NULL, $2, $3) r`, [t, OLDPAST.date, OLDPAST.date])).rows[0].r;
  ok('payroll_reach: a locked month in reach -> T3', p.tier === 3 && p.closed_payroll === true, p);
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [OLDPAST.month]);
  p = (await asSuper(`SELECT public.payroll_reach(gen_random_uuid(), NULL, $1, $2) r`, [FUTURE.date, FUTURE.date])).rows[0].r;
  ok('payroll_reach: nothing taught in reach -> T0', p.tier === 0, p);
});

// ---------------------------------------------------------------- G-11
await section('G-11 rule 1 and R-4: honest saves are never refused', async () => {
  const s = await mk({ when: OLDPAST });
  const kids = [];
  for (let i = 0; i < 15; i++) { const k = await kid(s); await att(s, k, 'Present', s.teacher); await inv(k, s.month, { recorded: 540000 }); kids.push(k); }
  const values = kids.map((k) => `('${s.sid}','${k}','Present','${s.teacher}')`).join(',');
  const up = `INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ${values}
              ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`;
  let r = await tryIt(() => asTeacher(s, up));
  ok('R-4 a PostgREST-shaped bulk upsert re-saving an unchanged register of a past PAID month (T2): passes', r.ok !== undefined, r);
  r = await tryIt(() => asAdmin(up));
  ok('R-4   the same re-save by an admin: passes', r.ok !== undefined, r);
  r = await tryIt(() => asTeacher(s, `INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Absent',$3)
       ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status`, [s.sid, kids[0], s.teacher]));
  ok('R-4 an upsert Present -> Absent (both charged, no crossing): passes', r.ok !== undefined && (await mark(s, kids[0])).status === 'Absent', r);
  r = await tryIt(() => asTeacher(s, `INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Excused',$3)
       ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status`, [s.sid, kids[1], s.teacher]));
  ok('R-4 the same upsert crossing the line (Present -> Excused) is judged by its UPDATE: teacher, past month -> HC025', r.code === 'HC025', r);
});

await section('G-11 rule 3: the week is free on every lane, whatever the bill', async () => {
  const s = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time });
  const k = await kid(s);
  await att(s, k, 'Present', null);
  await inv(k, s.month, { conf: 'confirmed', recorded: 540000 });
  ok('fixture: the current month is confirmed (T2)', (await ts(k, s.month)).tier === 2);
  let r = await tryIt(() => asTeacher(s, `UPDATE attendance SET status='Excused', marked_by=$2 WHERE session_id=$1 AND student_id=$3`, [s.sid, s.teacher, k]));
  ok('confirmed current month, lesson today, the teacher marks Excused: allowed', r.ok !== undefined && (await mark(s, k)).status === 'Excused', r);
  r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Present' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('  the admin puts it back: allowed', r.ok !== undefined, r);
  const k2 = await kid(s);
  r = await tryIt(() => asTeacher(s, `INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [s.sid, k2, s.teacher]));
  ok('  a new child added to today\'s register: allowed', r.ok !== undefined, r);
  const f = await mk({ when: FUTURE });
  const kf = await kid(f);
  r = await tryIt(() => asAdmin(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL)`, [f.sid, kf]));
  ok('  a lesson that has not happened yet: allowed', r.ok !== undefined, r);
  const c = await mk({ when: OLDCUR, start: OLDCUR.time, end: OLDCUR.end_time });
  const kc = await kid(c);
  await att(c, kc, 'Absent', null);
  r = await tryIt(() => asTeacher(c, `UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [c.sid, kc]));
  ok(`a lesson ended a little more than 7 days ago (month ${OLDCUR_PAST ? 'already past' : 'still current'}): the teacher turns a SEEDED Absent into Excused -> ${OLDCUR_PAST ? 'refused (past month)' : 'allowed'}`,
     OLDCUR_PAST ? r.code === 'HC025' : r.ok !== undefined, r);
});

await section('G-11 rules 5 and 6: admin and teacher after the week', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, { recorded: 540000 });
  let r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('admin, lesson 40 days old, paid past month, raw Present -> Excused: HC025 retro_mark (tier 2)',
     r.code === 'HC025' && /kind=retro_mark;/.test(r.detail ?? '') && /tier=2/.test(r.detail ?? ''), r);
  const p = await preview('attendance', 'set_marks', { session_id: s.sid, marks: [{ student_id: k, status: 'Excused' }] });
  ok('  set_marks preview: T2, confirm and a reason required, the stored bill shown, one refresh pair',
     p.tier === 2 && p.requires.confirm && p.requires.reason && p.invoices_before.length === 1 &&
     p.refresh_pairs.length === 1 && p.refresh_pairs[0].month === s.month && p.allowed, p);
  const res = await must('set_marks', () => checked('attendance', 'set_marks', { session_id: s.sid, marks: [{ student_id: k, status: 'Excused' }] },
    { reason: R, token: p.token, confirm: true }));
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [res.override_id ?? randomUUID()])).rows[0];
  ok('  through set_marks: changed, recorded as the admin\'s mark, one override row with the reason and tier 2',
     (await mark(s, k)).status === 'Excused' && (await mark(s, k)).marked_by === ADMIN && o?.tier === 2 && o.reason === R &&
     o.entity === 'attendance' && o.op === 'set_marks' && o.student_ids.includes(k), o);
  const t = await mk({ when: OLDPAST });
  const kt = await kid(t); await att(t, kt, 'Excused', t.teacher); await inv(kt, t.month, { recorded: 540000 });
  r = await tryIt(() => asTeacher(t, `UPDATE attendance SET status='Present' WHERE session_id=$1 AND student_id=$2`, [t.sid, kt]));
  ok('teacher, lesson in a past month: HC025 "ask an administrator", with nothing about the bill in the error',
     r.code === 'HC025' && /retro_mark_staff/.test(r.detail ?? '') && /ask an administrator/.test(r.detail ?? '') &&
     !/tier|paid|bill|confirm/i.test(r.detail ?? ''), r);
  // A person's Present -> Excused after the week, no bill at all (current month or nothing billed): admin T1, teacher refused.
  const u = await mk({ when: OLDCUR, start: OLDCUR.time, end: OLDCUR.end_time });
  const ku = await kid(u); await att(u, ku, 'Present', u.teacher);
  r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [u.sid, ku]));
  ok('A-6: a PERSON\'s Present un-billed after the week, nothing billed: the admin still needs a reason (T1)',
     r.code === 'HC025' && /tier=[123]/.test(r.detail ?? ''), r);
  r = await tryIt(() => asTeacher(u, `UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [u.sid, ku]));
  ok('A-6: ... and the teacher is told to ask an administrator', r.code === 'HC025' && /retro_mark_staff/.test(r.detail ?? ''), r);
  const pu = await preview('attendance', 'set_marks', { session_id: u.sid, marks: [{ student_id: ku, status: 'Excused' }] });
  ok('  its preview: at least T1', pu.tier >= 1, pu.tier);
});

await section('G-11 rule 7 and the owner lane: recorded, not refused', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, { recorded: 540000 });
  const n0 = (await events('service_retro_mark')).length;
  let r = await tryIt(() => asService(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  const ev = (await events('service_retro_mark')).slice(n0);
  ok('service lane, old lesson, billed month: the write goes through AND one service_retro_mark event names it',
     r.ok !== undefined && (await mark(s, k)).status === 'Excused' && ev.length === 1 && ev[0].payload.student_id === k &&
     ev[0].payload.old_status === 'Present' && ev[0].payload.new_status === 'Excused', ev);
  const k2 = await kid(s);
  r = await tryIt(() => asService(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL)`, [s.sid, k2]));
  ok('service lane, a billable row appearing on an old lesson: through, recorded', r.ok !== undefined &&
     (await events('service_retro_mark')).length === n0 + 2);
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', null);
  await asService(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [t.sid, kt]);
  ok('service lane inside the week: no event', (await events('service_retro_mark')).length === n0 + 2);
  const k3 = await kid(s); await att(s, k3, 'Present', null);
  const o0 = (await events('owner_lane')).length;
  r = await tryIt(() => asSuper(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [s.sid, k3]));
  ok('owner lane (SQL editor): passes, and one owner_lane event (A-1)', r.ok !== undefined && (await events('owner_lane')).length === o0 + 1);
  // D2's cancel of a lesson in a past paid month still works (excuse-all is trigger-made, depth 2).
  const c = await mk({ when: OLDPAST });
  const kc = await kid(c); await att(c, kc, 'Present', c.teacher); await inv(kc, c.month, { recorded: 540000 });
  const pc = (await asAdmin(`SELECT public.session_change_preview($1,'cancel',NULL) r`, [c.sid])).rows[0].r;
  r = await tryIt(() => asAdmin(`SELECT public.cancel_session_checked($1,'cancel',$2,$3,true,$4,'{}'::jsonb)`,
    [c.sid, 'Teacher was sick that day, class off', pc.token, pc.tier === 3 ? CORR : null]));
  ok('D2\'s cancel in a past paid month still excuses every mark (the excuse-all is not judged)', r.ok !== undefined &&
     (await mark(c, kc)).status === 'Excused', r);
});

await section('DQ-1: one-off cover staff, a mark more than a week old', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s); await att(s, k, 'Present', s.teacher);
  let r = await tryIt(() => asCoverRaw(`UPDATE attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('a cover teacher (not a teacher of the class) lowering a person\'s Present to Absent, lesson 40 days old: HC025 cover_staff, "ask an administrator"',
     r.code === 'HC025' && /cover_staff/.test(r.detail ?? '') && /ask an administrator/.test(r.detail ?? ''), r);
  r = await tryIt(() => asCoverRaw(`UPDATE attendance SET status='Present', marked_by=$3 WHERE session_id=$1 AND student_id=$2`, [s.sid, k, s.teacher]));
  ok('a cover teacher RE-SAVING the old mark unchanged (same status, same signature): passes', r.ok !== undefined, r);
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', t.teacher);
  r = await tryIt(() => asCoverRaw(`UPDATE attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [t.sid, kt]));
  ok('the same cover teacher inside the week: allowed (the ordinary register stays free)', r.ok !== undefined, r);
  r = await tryIt(() => asTeacher(s, `UPDATE attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('the class\'s regular teacher, same old lesson, Present -> Absent (both charged): allowed at any date', r.ok !== undefined, r);
  r = await tryIt(() => asCoverRaw(`UPDATE attendance SET status='Present' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('a cover teacher RAISING Absent -> Present on the old lesson is not a lowering (no cover_staff refusal)', r.code !== 'HC025' || !/cover_staff/.test(r.detail ?? ''), r);
});

await section('the acknowledgement covers exactly the checked change', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s), k2 = await kid(s);
  await att(s, k, 'Present', null); await att(s, k2, 'Present', null);
  await inv(k, s.month, { recorded: 540000 }); await inv(k2, s.month, { recorded: 540000 });
  let e = await script(ADMIN, 'authenticated', 'authenticated', `SELECT set_config('hec.money_change_ack', gen_random_uuid()::text, true);
    UPDATE attendance SET status='Excused' WHERE session_id='${s.sid}' AND student_id='${k}'`);
  ok('a forged flag (random id) -> HC025', e?.code === 'HC025', e);
  const ins = (tier, change) => `INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,
      correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
      VALUES ('${ADMIN}','attendance','set_marks','${s.sid}',ARRAY['${k}']::uuid[],'${s.date}','${s.date}','single',${tier},${tier === 3},
      'test reason long enough',true,'x','[]','${JSON.stringify(change)}','{}','[]','[]','{}',false) RETURNING id`;
  e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins(2, { marks: [{ student_id: k, status: 'Excused' }] })} INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.uid', '${ADMIN}', true);
      PERFORM set_config('test.jwt_role', 'authenticated', true); END $x$;
    SET LOCAL ROLE authenticated;
    UPDATE attendance SET status='Excused' WHERE session_id='${s.sid}' AND student_id='${k2}'`);
  ok('an acknowledgement for child A used for child B -> HC025', e?.code === 'HC025', e);
  e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins(2, { marks: [{ student_id: k, status: 'Excused' }] })} INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.uid', '${ADMIN}', true);
      PERFORM set_config('test.jwt_role', 'authenticated', true); END $x$;
    SET LOCAL ROLE authenticated;
    UPDATE attendance SET status='Absent', marked_by='${ADMIN}' WHERE session_id='${s.sid}' AND student_id='${k}';
    UPDATE attendance SET status='Excused', marked_by='${ADMIN}' WHERE session_id='${s.sid}' AND student_id='${k}'`);
  ok('control: the acknowledged status for that child passes', e === null && (await mark(s, k)).status === 'Excused', e);
  const k5 = await kid(s); await att(s, k5, 'Present', null); await inv(k5, s.month, { recorded: 540000 });
  e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN
      INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,
        correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
      VALUES ('${ADMIN}','attendance','set_marks','${s.sid}',ARRAY['${k5}']::uuid[],'${s.date}','${s.date}','single',2,false,
        'test reason long enough',true,'x','[]','{"marks":[{"student_id":"${k5}","status":"Absent"}]}','{}','[]','[]','{}',false) RETURNING id INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.uid', '${ADMIN}', true);
      PERFORM set_config('test.jwt_role', 'authenticated', true); END $x$;
    SET LOCAL ROLE authenticated;
    UPDATE attendance SET status='Excused', marked_by='${ADMIN}' WHERE session_id='${s.sid}' AND student_id='${k5}'`);
  ok('an acknowledgement for this child with another status (Absent acknowledged, Excused written) -> HC025', e?.code === 'HC025' && (await mark(s, k5)).status === 'Present', e);
  // A-8: the row says T1, the trigger finds T2 (a payment landed in between) -> HC011.
  const k3 = await kid(s); await att(s, k3, 'Present', null); await inv(k3, s.month, { recorded: 540000 });
  e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN
      INSERT INTO money_change_overrides(actor_user_id,entity,op,target_id,student_ids,reach_from,reach_to,via,tier,
        correction_mode,reason,confirmed,token,row_before,change,reach,invoices_before,refresh_pairs,impact,review_required)
      VALUES ('${ADMIN}','attendance','set_marks','${s.sid}',ARRAY['${k3}']::uuid[],'${s.date}','${s.date}','single',1,false,
        'test reason long enough',true,'x','[]','{"marks":[{"student_id":"${k3}","status":"Excused"}]}','{}','[]','[]','{}',false) RETURNING id INTO v;
      PERFORM set_config('hec.money_change_ack', v::text, true); PERFORM set_config('test.uid', '${ADMIN}', true);
      PERFORM set_config('test.jwt_role', 'authenticated', true); END $x$;
    SET LOCAL ROLE authenticated;
    UPDATE attendance SET status='Excused', marked_by='${ADMIN}' WHERE session_id='${s.sid}' AND student_id='${k3}'`);
  ok('A-8: an acknowledgement stored at T1 against a T2 write -> HC011 token_stale', e?.code === 'HC011', e);
  // A real override from an EARLIER transaction named in the flag: a replay.
  const k4 = await kid(s); await att(s, k4, 'Present', null); await inv(k4, s.month, { recorded: 540000 });
  const a4 = { session_id: s.sid, marks: [{ student_id: k4, status: 'Absent' }] };
  const p4 = await preview('attendance', 'set_marks', a4);
  const r4 = await must('replay fixture', () => checked('attendance', 'set_marks', a4, { reason: R, token: p4.token, confirm: true }));
  e = await script(ADMIN, 'authenticated', 'authenticated', `SELECT set_config('hec.money_change_ack', '${r4.override_id}', true);
    UPDATE attendance SET status='Excused', marked_by='${ADMIN}' WHERE session_id='${s.sid}' AND student_id='${k4}'`);
  ok('a replay: the flag names a real override of an earlier transaction -> HC025', e?.code === 'HC025' && (await mark(s, k4)).status === 'Absent', e);
});

await section('trigger-made writes are not judged (the seed of a new lesson)', async () => {
  // As live: an AFTER INSERT trigger on sessions seeds the register of the
  // enrolled children (20251012065759, trg_attendance_after_session_ins).
  await db.exec(`CREATE OR REPLACE FUNCTION public._test_seed_after_session_ins() RETURNS trigger LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = public AS $f$ BEGIN
        PERFORM public._attendance_seed_for_class_dates(NEW.class_id, NEW.date, NEW.date); RETURN NULL; END $f$;
    DROP TRIGGER IF EXISTS trg_attendance_after_session_ins ON public.sessions;
    CREATE TRIGGER trg_attendance_after_session_ins AFTER INSERT ON public.sessions FOR EACH ROW
      EXECUTE FUNCTION public._test_seed_after_session_ins();`);
  const s = await mk({ when: OLDPAST });
  const k = await kid(s); await inv(k, s.month, { recorded: 540000 });
  const r = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id)
      VALUES ($1,$2,'08:00','09:00','Scheduled',gen_random_uuid()) RETURNING id`, [s.cid, OLDPAST.date]));
  const seeded = r.ok ? (await asSuper(`SELECT status, marked_by FROM attendance WHERE session_id=$1 AND student_id=$2`, [r.ok.rows[0].id, k])).rows[0] : null;
  ok('an admin creates a lesson in a paid past month: the seed trigger\'s Present rows (depth 2) are not judged here (G-7, step 3A, guards the lesson)',
     r.ok !== undefined && seeded?.status === 'Present' && seeded.marked_by === null, [r, seeded]);
  await db.exec(`DROP TRIGGER trg_attendance_after_session_ins ON public.sessions; DROP FUNCTION public._test_seed_after_session_ins();`);
});

await section('conductor ruling (1b review R-1): the live enrolment RPCs are recorded, not refused, until step 3B', async () => {
  // live state: 20261106100000 dropped the enrolment-side trigger that turned these rows Excused first
  await db.exec(sqlOf(migPath('20261106100000_attendance_guard_no_auto_changes.sql')));
  await db.exec(D4_ENROLMENT_RPCS);
  await db.exec(sqlOf(migPath('20261106100001_date_aware_enrollment_changes.sql')));
  await db.exec(sqlOf(migPath('20261113120000_pause_enrollment_admin_only.sql')));
  // The reviewer's probe3: an enrolment ended 35 days back; a seeded Present on a lesson 30 days ago; that month's bill issued.
  const cid = randomUUID(), tUid = randomUUID();
  await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, tUid]);
  const d30 = await clock(-30), d35 = await clock(-35), d60 = await clock(-60);
  const sid = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Held',gen_random_uuid()) RETURNING id`, [cid, d30.date])).rows[0].id;
  const k = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [cid, k, d60.date]);
  await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL)`, [sid, k]);
  await inv(k, d30.month, {});
  let r = await tryIt(() => asAdmin(`DELETE FROM attendance WHERE session_id=$1 AND student_id=$2`, [sid, k]));
  ok('control: the same delete made raw by an admin is still HC025', r.code === 'HC025', r);
  const n0 = (await events('enrollment_rpc_mark')).length;
  r = await tryIt(() => asAdmin(`SELECT public.end_enrollment($1, $2, $3)`, [k, cid, d35.date]));
  const ev = (await events('enrollment_rpc_mark')).slice(n0);
  ok('end_enrollment backdated into a billed month: passes, the placeholder mark is removed, and one enrollment_rpc_mark event is queued',
     r.ok !== undefined && !(await mark({ sid }, k)) && ev.length === 1 && ev[0].payload.rpc === 'end_enrollment' &&
     ev[0].payload.student_id === k && ev[0].actor_user_id === ADMIN, [r, ev]);
  // pause_enrollment over an old billed lesson where a teacher marked the child Present
  const sid2 = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',gen_random_uuid()) RETURNING id`, [cid, d30.date])).rows[0].id;
  const k2 = (await asSuper(`INSERT INTO students(full_name) VALUES ('k2') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [cid, k2, d60.date]);
  await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [sid2, k2, tUid]);
  await inv(k2, d30.month, { recorded: 540000 });
  r = await tryIt(() => asAdmin(`SELECT public.pause_enrollment($1, $2, $3, $4, 'Away for surgery')`, [k2, cid, d30.date, d30.date]));
  ok('pause_enrollment over an old paid month (a person\'s Present -> Excused): passes and is queued',
     r.ok !== undefined && (await mark({ sid: sid2 }, k2))?.status === 'Excused' &&
     (await events('enrollment_rpc_mark')).some((e) => e.payload.rpc === 'pause_enrollment' && e.payload.student_id === k2), r);
  r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Present', marked_by=$3 WHERE session_id=$1 AND student_id=$2`, [sid2, k2, ADMIN]));
  ok('only the RPC\'s own rows: a raw admin re-bill of that old mark is still HC025', r.code === 'HC025', r);
  const st = (await asAdmin(`SELECT public.d4_guard_status() r`)).rows[0].r;
  ok('the status card counts them (events_30d.enrollment_rpc_mark)', (st.events_30d?.enrollment_rpc_mark ?? 0) >= 2, st.events_30d);
});

// ---------------------------------------------------------------- the checked path
await section('money_change_checked: the order of checks', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, { recorded: 540000, conf: 'confirmed' });
  const args = { session_id: s.sid, marks: [{ student_id: k, status: 'Excused' }] };
  const p = await preview('attendance', 'set_marks', args);
  ok('a confirmed past month: T3, correction reason required, review_required', p.tier === 3 && p.requires.correction_reason && p.review_required, p.tier);
  for (const [who, uid, jwt, role] of [['the class teacher', s.teacher, 'authenticated', 'authenticated'], ['a parent', PARENT, 'authenticated', 'authenticated']]) {
    const r = await tryIt(() => as(uid, jwt, role, `SELECT public.money_change_preview('attendance','set_marks',$1::jsonb)`, [JSON.stringify(args)]));
    ok(`preview by ${who} -> 42501`, r.code === '42501', r);
  }
  let r = await tryIt(() => asService(`SELECT public.money_change_checked('attendance','set_marks',$1::jsonb,$2,$3,true,$4,'{}'::jsonb)`, [JSON.stringify(args), R, p.token, CORR]));
  ok('the service role has no EXECUTE on the checked path (42501)', r.code === '42501', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { token: p.token, confirm: true, corr: CORR }));
  ok('no reason at T3 -> HC010', r.code === 'HC010', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: 'too short', token: p.token, confirm: true, corr: CORR }));
  ok('a short reason -> HC010', r.code === 'HC010', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: R, token: 'f'.repeat(64), confirm: true, corr: CORR }));
  ok('a wrong token -> HC011', r.code === 'HC011', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: R, token: p.token, confirm: true, corr: CORR }, ADMIN2));
  ok('admin A\'s token used by admin B -> HC011', r.code === 'HC011', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: R, token: p.token, confirm: false, corr: CORR }));
  ok('no confirmation -> HC012', r.code === 'HC012', r);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: R, token: p.token, confirm: true }));
  ok('T3 without a correction reason -> HC013', r.code === 'HC013', r);
  await asSuper(`UPDATE invoices SET total_amount = total_amount + 1 WHERE student_id=$1`, [k]);
  r = await tryIt(() => checked('attendance', 'set_marks', args, { reason: R, token: p.token, confirm: true, corr: CORR }));
  ok('a bill recalculated between preview and confirm stales the token -> HC011', r.code === 'HC011', r);
  ok('  nothing changed so far, no override row', (await mark(s, k)).status === 'Present' &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE target_id=$1`, [s.sid])).rows[0].n === 0);
  const p2 = await preview('attendance', 'set_marks', args);
  const res = await must('T3', () => checked('attendance', 'set_marks', args, { reason: R, token: p2.token, confirm: true, corr: CORR }));
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [res.override_id ?? randomUUID()])).rows[0];
  ok('T3 with everything: correction mode, both reasons, review_required, in the review queue',
     o?.correction_mode && o.correction_reason === CORR && o.review_required &&
     (await asAdmin(`SELECT count(*)::int n FROM money_change_review_queue WHERE override_id=$1`, [o.id])).rows[0].n === 1, o);
  // T0: no reason, no token, still one row (money rule)
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', null);
  const r0 = await must('T0', () => checked('attendance', 'set_marks', { session_id: t.sid, marks: [{ student_id: kt, status: 'Excused' }] }));
  ok('T0 needs no reason and no token, and still writes one override row (every money write leaves a row)',
     r0.tier === 0 && !!r0.override_id && (await mark(t, kt)).status === 'Excused', r0);
  const tc = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kc2 = await kid(tc); await att(tc, kc2, 'Present', null);
  await inv(kc2, tc.month, { conf: 'confirmed', recorded: 540000 });
  const pc2 = await preview('attendance', 'set_marks', { session_id: tc.sid, marks: [{ student_id: kc2, status: 'Excused' }] });
  ok('set_marks preview for TODAY\'s lesson with a confirmed bill: T0 (the week is free in the plan too)', pc2.tier === 0 && pc2.allowed, pc2.tier);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: t.sid, marks: [{ student_id: kt, status: 'Present' }] }, { token: 'stale' }));
  ok('T0 with a token that does not match -> HC011 (a token is checked whenever one is sent)', r.code === 'HC011', r);
  // refuse codes
  const c = await mk({ when: OLDPAST, status: 'Canceled' }); const kc = await kid(c);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: c.sid, marks: [{ student_id: kc, status: 'Present' }] }));
  ok('a cancelled lesson -> HC015 lesson_canceled', r.code === 'HC015' && r.message === 'lesson_canceled', r);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: s.sid, marks: [{ student_id: 'x', status: 'Present' }] }));
  ok('a malformed mark -> HC015 bad_args', r.code === 'HC015' && r.message === 'bad_args', r);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: s.sid, marks: Array.from({ length: 61 }, () => ({ student_id: randomUUID(), status: 'Present' })) }));
  ok('61 marks -> HC015 too_many_marks', r.code === 'HC015' && r.message === 'too_many_marks', r);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: randomUUID(), marks: [{ student_id: k, status: 'Present' }] }));
  ok('an unknown lesson -> P0002', r.code === 'P0002', r);
  r = await tryIt(() => checked('session', 'unhold', { session_id: s.sid }));
  ok('an entity whose step is not installed (session, step 3A) -> HC015 not_installed (the dispatcher binds lazily)', r.code === 'HC015' && r.message === 'not_installed', r);
  r = await tryIt(() => checked('nonsense', 'x', {}));
  ok('an unknown entity -> HC015 bad_entity', r.code === 'HC015' && r.message === 'bad_entity', r);
});

await section('HC050: the trigger disabled -> the checked path refuses to work', async () => {
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', null);
  await db.exec(`ALTER TABLE public.attendance DISABLE TRIGGER zz_attendance_money_guard`);
  const r = await tryIt(() => checked('attendance', 'set_marks', { session_id: t.sid, marks: [{ student_id: kt, status: 'Excused' }] }));
  const st = (await asAdmin(`SELECT public.d4_guard_status() r`)).rows[0].r;
  await db.exec(`ALTER TABLE public.attendance ENABLE TRIGGER zz_attendance_money_guard`);
  ok('trigger disabled: money_change_checked -> HC050, nothing written', r.code === 'HC050' && (await mark(t, kt)).status === 'Present' &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE target_id=$1`, [t.sid])).rows[0].n === 0, r);
  ok('  d4_guard_status reports it (ok false, the trigger D)', st.ok === false && st.triggers['attendance.zz_attendance_money_guard'] === 'D', st);
  const st2 = (await asAdmin(`SELECT public.d4_guard_status() r`)).rows[0].r;
  ok('  re-enabled: ok, installed_at set', st2.ok === true && !!st2.installed_at, st2);
  const e = await tryIt(() => as(PARENT, 'authenticated', 'authenticated', `SELECT public.d4_guard_status()`));
  ok('  status is admin-only', e.code === '42501', e);
});

await section('bulk', async () => {
  const s = await mk({ when: OLDPAST });
  const k1 = await kid(s), k2 = await kid(s);
  await att(s, k1, 'Present', null); await att(s, k2, 'Present', null);
  await inv(k1, s.month, { recorded: 540000 }); await inv(k2, s.month, {});
  const a1 = { session_id: s.sid, marks: [{ student_id: k1, status: 'Excused' }] }, a2 = { session_id: s.sid, marks: [{ student_id: k2, status: 'Excused' }] };
  const p1 = await preview('attendance', 'set_marks', a1), p2 = await preview('attendance', 'set_marks', a2);
  const run = (items) => asAdmin(`SELECT public.money_changes_checked_bulk($1::jsonb,$2,$3,'{}'::jsonb) r`, [JSON.stringify(items), 'Holiday week entered as taught by mistake', randomUUID()]).then((r) => r.rows[0].r);
  let out = await run([{ entity: 'attendance', op: 'set_marks', args: a1, token: p1.token, confirm: true },
                       { entity: 'attendance', op: 'set_marks', args: a2, token: p2.token, confirm: true }]);
  ok('bulk: a T2 item with only the batch reason -> refused HC017; the T1 item done (via bulk)', out.done.length === 1 && out.refused.length === 1 &&
     out.refused[0].code === 'HC017' && (await mark(s, k2)).status === 'Excused', out);
  out = await run([{ entity: 'attendance', op: 'set_marks', args: a1, token: p1.token, confirm: true, reason: 'This child was ill all week, not here' }]);
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [out.done[0]?.override_id ?? randomUUID()])).rows[0];
  ok('bulk: with its own reason, done; a T2 change made in bulk goes to review', o?.via === 'bulk' && o.tier === 2 && o.review_required, o);
  const r = await tryIt(() => run(Array.from({ length: 51 }, () => ({ entity: 'attendance', op: 'set_marks', args: a1 }))));
  ok('51 items -> HC016', r.code === 'HC016', r);
});

// ---------------------------------------------------------------- G-12
await section('G-12 repair', async () => {
  const s = await mk({ when: OLDPAST });
  const k = await kid(s);
  await mk({ when: { date: OLDPAST.date }, cid: s.cid, start: '08:00', end: '09:00', status: 'Scheduled' });
  await inv(k, s.month, {});
  const args = { student_id: k, class_id: s.cid, from: OLDPAST.date, to: OLDPAST.date, status: 'Present' };
  let r = await tryIt(() => asAdmin(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL)`, [s.sid, k]));
  ok('repair-shaped insert of a Present into an old billed month by an admin, raw -> HC025', r.code === 'HC025', r);
  const p = await preview('attendance', 'repair', args);
  ok('repair preview: two lessons, both Present, T1 (issued past month), one refresh pair',
     p.tier === 1 && p.change.lessons.length === 2 && p.change.lessons.every((l) => l.status === 'Present') &&
     p.refresh_pairs.length === 1, p);
  r = await tryIt(() => checked('attendance', 'repair', args));
  ok('  without the acknowledgement -> HC010 (a reason is needed)', r.code === 'HC010', r);
  const res = await must('repair', () => checked('attendance', 'repair', args, { reason: R, token: p.token, confirm: true }));
  const rows = (await asSuper(`SELECT status, marked_by, notes FROM attendance WHERE student_id=$1`, [k])).rows;
  ok('  with it: the two rows, as repair-attendance writes them (marked_by NULL, the note), and one override row',
     res.written === 2 && rows.length === 2 && rows.every((x) => x.marked_by === null && /Auto-repaired/.test(x.notes)), rows);
  const p2 = await preview('attendance', 'repair', args);
  ok('  a second repair finds nothing to do -> nothing_to_change', p2.allowed === false && p2.refuse_code === 'nothing_to_change', p2.refuse_code);
  // outside the enrollment -> Excused (no money, T0)
  const t = await mk({ when: OLDPAST });
  const ko = (await asSuper(`INSERT INTO students(full_name) VALUES ('o') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2099-01-01')`, [t.cid, ko]);
  const po = await preview('attendance', 'repair', { student_id: ko, class_id: t.cid, from: OLDPAST.date, to: OLDPAST.date, status: 'Present' });
  ok('a lesson outside the enrollment is repaired as Excused, and that is T0', po.tier === 0 && po.change.lessons[0]?.status === 'Excused', po);
  // this week only -> T0, written directly through the checked path
  const w = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time });
  const kw = await kid(w); await inv(kw, w.month, { conf: 'confirmed' });
  const pw = await preview('attendance', 'repair', { student_id: kw, class_id: w.cid, from: TODAY.date, to: TODAY.date, status: 'Present' });
  ok('lessons of this week -> T0 even with a confirmed bill', pw.tier === 0 && pw.change.lessons.length === 1, pw);
  r = await tryIt(() => checked('attendance', 'repair', { student_id: k, class_id: randomUUID(), from: OLDPAST.date, to: OLDPAST.date, status: 'Present' }));
  ok('a class the child is not enrolled in -> HC015 no_enrollment', r.code === 'HC015' && r.message === 'no_enrollment', r);
  r = await tryIt(() => checked('attendance', 'repair', { ...args, status: 'Late' }));
  ok('a status repair never writes (Late) -> HC015 bad_args', r.code === 'HC015' && r.message === 'bad_args', r);
});

await section('events, review, automation log', async () => {
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', null);
  await inv(kt, t.month, {});
  const res = await must('T0', () => checked('attendance', 'set_marks', { session_id: t.sid, marks: [{ student_id: kt, status: 'Excused' }] }));
  const ev = (await asAdmin(`SELECT public.record_money_change_event($1,'tuition_refreshed',$2::jsonb) r`, [res.override_id, JSON.stringify({ results: [] })])).rows[0].r;
  const e = (await asSuper(`SELECT * FROM money_change_events WHERE id=$1`, [ev])).rows[0];
  ok('tuition_refreshed: the bills now re-read by SQL beside what was attached', e.payload.invoices_after.length === 1 && e.actor_user_id === ADMIN, e.payload);
  let r = await tryIt(() => asAdmin(`SELECT public.record_money_change_event($1,'reviewed','{"note":"ok"}')`, [res.override_id]));
  ok('a review note under 15 characters -> HC010', r.code === 'HC010', r);
  r = await tryIt(() => as(t.teacher, 'authenticated', 'authenticated', `SELECT public.record_money_change_event($1,'tuition_refreshed','{}')`, [res.override_id]));
  ok('record_money_change_event by a teacher -> 42501 (admins only)', r.code === '42501', r);
  r = await tryIt(() => asAdmin(`SELECT public.record_money_change_event($1,'owner_lane','{}')`, [res.override_id]));
  ok('an event kind only the triggers write -> HC015', r.code === 'HC015', r);
  r = await tryIt(() => asAdmin(`SELECT public.log_money_automation_refused('attendance', gen_random_uuid(), 'x')`));
  ok('log_money_automation_refused: not for an admin', r.code === '42501', r);
  const id = (await asService(`SELECT public.log_money_automation_refused('attendance', $1, 'mark-attendance') r`, [t.sid])).rows[0].r;
  ok('  the service role writes one automation_refused event', (await asSuper(`SELECT kind FROM money_change_events WHERE id=$1`, [id])).rows[0].kind === 'automation_refused');
  r = await tryIt(() => asService(`INSERT INTO money_change_events(kind) VALUES ('reviewed')`));
  ok('the service role cannot insert an event directly (HC041)', r.code === 'HC041', r);
  r = await tryIt(() => asSuper(`UPDATE money_change_overrides SET reason='changed later' WHERE id=$1`, [res.override_id]));
  ok('override rows are append-only, even for the owner (HC040)', r.code === 'HC040', r);
  r = await tryIt(() => asSuper(`TRUNCATE money_change_events CASCADE`));
  ok('no TRUNCATE (HC040)', r.code === 'HC040', r);
  const n = async (uid) => (await as(uid, 'authenticated', 'authenticated', `SELECT count(*)::int n FROM money_change_overrides`)).rows[0].n;
  ok('admins read the overrides; a teacher and a parent read none', (await n(ADMIN)) > 0 && (await n(t.teacher)) === 0 && (await n(PARENT)) === 0);
});

// ---------------------------------------------------------------- rollback 2
await section('rollback 2', async () => {
  let e = null; try { await db.exec(sqlOf(rb2F)); } catch (x) { e = x.message; }
  ok('the rollback script runs', e === null, e);
  ok('  the trigger is gone; the tables, their rows and their guards stay',
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname='zz_attendance_money_guard'`)).rows[0].n === 0 &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides`)).rows[0].n > 0 &&
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname LIKE 'money_change_%'`)).rows[0].n === 6);
  const s = await mk({ when: OLDPAST }); const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, { recorded: 540000 });
  let r = await tryIt(() => asAdmin(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [s.sid, k]));
  ok('  an old billed mark changes raw again', r.ok !== undefined, r);
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kt = await kid(t); await att(t, kt, 'Present', null);
  r = await tryIt(() => checked('attendance', 'set_marks', { session_id: t.sid, marks: [{ student_id: kt, status: 'Excused' }] }));
  ok('  the checked path refuses to work without its trigger (HC050): closed', r.code === 'HC050', r);
  r = await tryIt(() => asAdmin(`DELETE FROM attendance WHERE session_id=$1 AND student_id=$2`, [t.sid, kt]));
  ok('  step 1a is untouched (HC025 for deleting a person\'s mark still... the row is seeded: allowed)', r.ok !== undefined, r);
  try { await db.exec(sqlOf(rb2F)); e = null; } catch (x) { e = x.message; }
  ok('  the rollback script is safe to paste twice', e === null, e);
  try { await db.exec(sqlOf(coreF)); e = null; } catch (x) { e = x.message; }
  ok('the migration pastes again after the rollback and the guard is back', e === null &&
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname='zz_attendance_money_guard' AND tgenabled='O'`)).rows[0].n === 1, e);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
