// D4 step 3A: who is paid for a lesson (G-1 to G-7). Drives the REAL
// migrations in paste order (see run.mjs for the list) and the step's
// rollback script as the last argument.
//
// Spec: docs/evidence/D4-design.md revision 2 b.1, c.4, f.3 ("G-1 to G-7").
// D2's cases that this step changes on purpose, each re-stated here with its
// NEW expected result (the D2 suite itself is untouched and still proves
// them on a database without this file):
//   d15 "raw Held -> Scheduled by an admin is allowed"       D4: HC020 kind=unhold
//   d42 "include-held: time update on a past Held lesson
//        (still started) -> succeeds" (service role)        D4: HC020 kind=retime
//   d43 "stars Held -> Scheduled -> succeeds" (as a teacher) D4: HC020 on the person
//        lane; on the sync's real lane (service) allowed only while the sync's
//        own flip stands and no person's Present / Late remains
//   d44 "inserting a session as Canceled is not guarded"     D4: HC023
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { harness, makeDb, sqlOf } from './d4-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 10) {
  console.error('usage: d4-lesson-pay.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> <d4 lesson pay> <rollback 4>');
  process.exit(2);
}
const [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF, coreF, payF, rb4F] = files;
const base = [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF, coreF];
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, must, clock } = H;
const TRIGGERS = ['session_participants.zz_session_staff_guard', 'sessions.zz2_session_pay_guard', 'sessions.zz_session_insert_guard'];

// ------------------------------------------------------------ install
await section('preflight', async () => {
  const bare = await makeDb(PGlite, { people: true, migrations: [auditF, cancelF, enrolF, d1F, d2F, freezeF, floorsF] });
  let msg = null;
  try { await bare.exec(sqlOf(payF)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('preflight: without D4 file 2 the file refuses, naming what is missing', /d4_lesson_pay_guard cannot be installed/.test(msg ?? '') &&
     /_money_ack|money_change_overrides/.test(msg ?? ''), msg);
  const n = (await bare.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('zz2_session_pay_guard','zz_session_insert_guard','zz_session_staff_guard')`)).rows[0].n;
  ok('preflight:   and installs nothing', n === 0 && (await bare.query(`SELECT to_regprocedure('public._money_plan__session(text, jsonb, uuid)') f`)).rows[0].f === null);
  await bare.close();
});

await section('preflight: the 1b bodies it relies on', async () => {
  const x = await makeDb(PGlite, { people: true, migrations: base });
  await x.exec(`CREATE OR REPLACE FUNCTION public._money_ack(p_entities text[], p_target uuid, p_student uuid, p_from date, p_to date, p_tier int)
    RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $f$ SELECT true $f$;`);
  let msg = null;
  try { await x.exec(sqlOf(payF)); } catch (e) { msg = e.message; }
  await x.exec('ROLLBACK').catch(() => {});
  ok('a _money_ack that is not the reviewed 1b body (one that says yes to everything) -> refused, naming it, nothing installed',
     /_money_ack\(text\[\], uuid, uuid, date, date, integer\) is not the reviewed/.test(msg ?? '') &&
     (await x.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname = 'zz2_session_pay_guard'`)).rows[0].n === 0, msg);
  await x.close();
  const y = await makeDb(PGlite, { people: true, migrations: base });
  const def = (await y.query(`SELECT pg_get_functiondef('public._money_change_plan(text, text, jsonb, uuid)'::regprocedure) d`)).rows[0].d;
  await y.exec(def.replace(/\n/g, '\r\n'));
  msg = null;
  try { await y.exec(sqlOf(payF)); } catch (e) { msg = e.message; }
  ok('the same 1b dispatcher pasted with CRLF is accepted (md5 of the CR-stripped text)', msg === null, msg);
  await y.close();
});

db = await makeDb(PGlite, { people: true, rls: false, migrations: base });
const fnsBefore = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
   has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
const trgBefore = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
const rowsDigest = async () => (await db.query(`SELECT
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM attendance a) a,
   (SELECT md5(COALESCE(string_agg(to_jsonb(s)::text, ',' ORDER BY s.id), '')) FROM sessions s) s,
   (SELECT md5(COALESCE(string_agg(to_jsonb(p)::text, ',' ORDER BY p.id), '')) FROM session_participants p) p`)).rows[0];
{
  const cid = randomUUID();
  await db.query(`INSERT INTO classes VALUES ($1, gen_random_uuid())`, [cid]);
  const sid = (await db.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1, CURRENT_DATE - 40,'17:30','19:00','Held',gen_random_uuid()) RETURNING id`, [cid])).rows[0].id;
  await db.query(`INSERT INTO session_participants(session_id, teaching_assistant_id) VALUES ($1, gen_random_uuid())`, [sid]);
}
const digestBefore = await rowsDigest();
await db.exec(sqlOf(payF));

await section('install', async () => {
  ok('no row rewritten (attendance, sessions, participants identical)', JSON.stringify(await rowsDigest()) === JSON.stringify(digestBefore));
  const catalog = async () => (await db.query(`SELECT
     (SELECT md5(string_agg(p.oid::regprocedure::text || md5(p.prosrc) || p.prosecdef || COALESCE(p.proconfig::text,''), ',' ORDER BY p.oid::regprocedure::text))
        FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace) f,
     (SELECT md5(string_agg(c.relname || '.' || t.tgname || pg_get_triggerdef(t.oid) || t.tgenabled::text, ',' ORDER BY c.relname, t.tgname))
        FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal) t`)).rows[0];
  const c1 = await catalog();
  let e = null; try { await db.exec(sqlOf(payF)); } catch (x) { e = x.message; }
  ok('the file applies a second time', e === null, e);
  ok('  as a no-op on functions and triggers', JSON.stringify(await catalog()) === JSON.stringify(c1));
  const after = new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(p.prosrc) m, p.prosecdef, p.proconfig::text c,
     has_function_privilege('authenticated', p.oid, 'EXECUTE') au FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
  const changed = [...fnsBefore.keys()].filter((k) => JSON.stringify(fnsBefore.get(k)) !== JSON.stringify(after.get(k)));
  ok('no existing function is replaced or re-granted (D1, D2, files 1 and 2 untouched; the dispatcher is not re-created)', changed.length === 0, changed);
  const trgAfter = (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
  const added = trgAfter.filter((x) => !trgBefore.some((y) => y.k === x.k)).map((x) => x.k).sort();
  ok('every trigger that existed is unchanged; added exactly the three of rollback 4',
     trgBefore.every((x) => JSON.stringify(trgAfter.find((y) => y.k === x.k)) === JSON.stringify(x)) &&
     JSON.stringify(added) === JSON.stringify(TRIGGERS), added);
  const fns = (await db.query(`SELECT proname, proconfig, has_function_privilege('anon', oid, 'EXECUTE') an,
      has_function_privilege('authenticated', oid, 'EXECUTE') au, has_function_privilege('service_role', oid, 'EXECUTE') sr
      FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND oid::regprocedure::text NOT IN (SELECT unnest($1::text[]))`, [[...fnsBefore.keys()]])).rows;
  ok('nine new functions, each pins search_path=public', fns.length === 9 && fns.every((f) => (f.proconfig ?? []).includes('search_path=public')),
     fns.map((f) => f.proname));
  ok('none is callable by anon, authenticated or service_role (the checked path is 1b\'s money_change_*)',
     fns.every((f) => !f.an && !f.au && !f.sr), fns.map((f) => `${f.proname}:${f.an}${f.au}${f.sr}`));
  const order = (await db.query(`SELECT t.tgname FROM pg_trigger t WHERE t.tgrelid = 'public.sessions'::regclass AND NOT t.tgisinternal
      AND (t.tgtype & 2) = 2 AND (t.tgtype & 16) = 16 ORDER BY t.tgname`)).rows.map((r) => r.tgname);
  ok('BEFORE UPDATE order on sessions: updated_at, validate_session_status, zz0 keep (1a), zz2 pay guard, D2 last',
     JSON.stringify(order) === JSON.stringify(['update_sessions_updated_at', 'validate_session_status_trigger', 'zz0_session_evidence_keep',
       'zz2_session_pay_guard', 'zz_session_change_guard_upd']), order);
  const src = sqlOf(payF);
  ok('the paste fails fast: SET LOCAL lock_timeout = \'5s\' right after BEGIN', /BEGIN;\s*(--[^\n]*\n\s*)*SET LOCAL lock_timeout = '5s';/.test(src));
  ok('the file prices nothing: no calculate-payroll, no rate or fee read', !/rate_vnd\s*\*|session_rate_vnd|staff_pay_rates|calculate-payroll'/.test(src.replace(/--[^\n]*/g, '')));
  ok('a guard_installed event names this migration', (await db.query(`SELECT count(*)::int n FROM money_change_events
      WHERE kind='guard_installed' AND payload->>'migration' = '20261114093000_d4_lesson_pay_guard'`)).rows[0].n >= 1);
});

// ---------------------------------------------------------------- fixtures
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'family')`, [ADMIN, PARENT]);
const R = 'The register shows the teacher was off sick';
const CORR = 'Correction: the lesson was paid to the wrong person';
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asUidNoRole = (uid, sql, p) => as(uid, 'authenticated', null, sql, p);

const TODAY = await clock(0, -2);       // started two hours ago, ended one hour ago
const OLD = await clock(-40);           // more than a week ago
const LOCKED = await clock(-100);       // a month that will be locked (never OLD's month)
const TEN = await clock(-10);
const FUTURE = await clock(10);
await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked')`, [LOCKED.month]);

async function mk({ when = OLD, start = '17:30', end = '19:00', status = 'Held', cid, teacherId, invalidFutureHeld = false } = {}) {
  const teacherUid = randomUUID();
  if (!cid) {
    cid = randomUUID();
    await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
    await asSuper(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  }
  if (when === TODAY) { start = TODAY.time; end = TODAY.end_time; }
  const tid = teacherId ?? randomUUID();
  // A future lesson already Held is invalid state the validate trigger would fix on insert; made on purpose here.
  if (invalidFutureHeld) await asSuper(`ALTER TABLE sessions DISABLE TRIGGER validate_session_status_trigger`);
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [cid, when.date, start, end, status, tid])).rows[0];
  if (invalidFutureHeld) await asSuper(`ALTER TABLE sessions ENABLE TRIGGER validate_session_status_trigger`);
  const t = (await asSuper(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, teacherId: tid, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s, { family = null } = {}) => {
  const id = (await asSuper(`INSERT INTO students(full_name, family_id) VALUES ('k', $1) RETURNING id`, [family])).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  return id;
};
const att = (s, k, status, by) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)
  ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`, [s.sid, k, status, by]);
const inv = (k, month, { recorded = 0, conf = 'auto_approved' } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status)
           VALUES ($1,$2,'issued',540000,540000,$3,$4)`, [k, month, recorded, conf]);
const ta = (s, taId = randomUUID(), attended = true) =>
  asSuper(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id, attended) VALUES ($1,'teaching_assistant',$2,$3) RETURNING teaching_assistant_id t`,
    [s.sid, taId, attended]).then((r) => r.rows[0].t);
const sess = async (sid) => (await asSuper(`SELECT * FROM sessions WHERE id=$1`, [sid])).rows[0];
const preview = async (op, args, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_preview('session',$1,$2::jsonb) r`, [op, JSON.stringify(args)])).rows[0].r;
const checked = (op, args, { reason = null, token = null, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_checked('session',$1,$2::jsonb,$3,$4,$5,$6,'{}'::jsonb) r`,
    [op, JSON.stringify(args), reason, token, confirm, corr]).then((r) => r.rows[0].r);
const go = async (op, args, uid = ADMIN) => {
  const p = await preview(op, args, uid);
  return checked(op, args, { reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, corr: p.tier === 3 ? CORR : null }, uid);
};
const events = async (kind, key, val) => (await asSuper(`SELECT * FROM money_change_events WHERE kind=$1 AND payload->>$2 = $3 ORDER BY created_at, id`, [kind, key, val])).rows;
const isKind = (r, code, kind) => r.code === code && (!kind || new RegExp(`kind=${kind}\\b`).test(r.detail ?? ''));

// ---------------------------------------------------------------- G-1 un-hold
await section('G-1 un-hold: the person lane', async () => {
  const s = await mk({ when: OLD });
  const k = await kid(s); await att(s, k, 'Present', s.teacher);
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]));
  ok('D2 d15 said "raw Held -> Scheduled by an admin is allowed"; D4: HC020 kind=unhold, still Held', isKind(r, 'HC020', 'unhold') &&
     (await sess(s.sid)).status === 'Held', r);
  ok('  the refusal says what to do next (the Actions menu, with a reason; cancel if it did not happen)',
     /Actions menu, with a reason/.test(r.detail ?? '') && /cancel it instead/.test(r.detail ?? ''), r.detail);
  const t = await mk({ when: TODAY });
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [t.sid]));
  ok('un-hold has no free week: today\'s lesson, open month -> HC020', isKind(r, 'HC020', 'unhold'), r);
  r = await tryIt(() => asUidNoRole(s.teacher, `UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [s.sid]));
  ok('D2 d43 (the stars shape, signed in as the teacher) said "succeeds"; D4: HC020 on the person lane', isKind(r, 'HC020', 'unhold'), r);
  r = await tryIt(() => as(null, 'anon', 'anon', `UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]));
  ok('an API role with no user (lane unknown) is treated as a person: refused, or sees no row', r.code === 'HC020' || (r.ok && r.ok.affectedRows === 0) || r.code === '42501', r);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled', date = date + 1 WHERE id=$1`, [s.sid]));
  ok('un-hold together with a move -> HC022 (one change at a time)', r.code === 'HC022', r);
  ok('  audit_log has no row for any refused write of this lesson', (await asSuper(`SELECT count(*)::int n FROM audit_log WHERE entity='sessions' AND entity_id=$1`, [s.sid])).rows[0].n === 0);
});

await section('G-1 un-hold: the checked op', async () => {
  const s = await mk({ when: OLD });
  const k = await kid(s); await att(s, k, 'Absent', null);
  let p = await preview('unhold', { session_id: s.sid });
  ok('preview: kind unhold, T2 (Held is SOFT), the evidence (D1 + floor) and the change', p.kind === 'unhold' && p.tier === 2 &&
     p.evidence?.d1?.level !== undefined && p.change.new_status === 'Scheduled' && p.requires.reason === true && p.requires.confirm === true, p);
  ok('  nothing to refresh (calculate-tuition counts Scheduled and Held alike)', Array.isArray(p.refresh_pairs) && p.refresh_pairs.length === 0);
  let r = await tryIt(() => checked('unhold', { session_id: s.sid }));
  ok('  without a reason -> HC010', r.code === 'HC010', r);
  r = await tryIt(() => checked('unhold', { session_id: s.sid }, { reason: R, token: p.token }));
  ok('  without the confirmation -> HC012', r.code === 'HC012', r);
  r = await tryIt(() => checked('unhold', { session_id: s.sid }, { reason: R, token: 'f'.repeat(64), confirm: true }));
  ok('  a wrong token -> HC011', r.code === 'HC011', r);
  const res = await must('unhold', () => checked('unhold', { session_id: s.sid }, { reason: R, token: p.token, confirm: true }));
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [res.override_id])).rows[0];
  ok('with them: Scheduled, one override row (who, why, before/after) with op unhold', (await sess(s.sid)).status === 'Scheduled' &&
     o?.entity === 'session' && o.op === 'unhold' && o.reason === R && o.actor_user_id === ADMIN &&
     o.row_before?.session?.status === 'Held' && o.change?.new_status === 'Scheduled', o);
  ok('  the floor (1a) remembers the lesson was Held', (await asSuper(`SELECT level FROM session_evidence_floor WHERE session_id=$1`, [s.sid])).rows[0]?.level !== undefined);
  // STRONG and settled: T3, correction mode, reviewed
  const t = await mk({ when: OLD });
  const kt = await kid(t); await att(t, kt, 'Present', t.teacher); await inv(kt, t.month, { recorded: 540000 });
  p = await preview('unhold', { session_id: t.sid });
  ok('a taught lesson (a person\'s Present) whose month is paid -> T3, correction reason, reviewed', p.tier === 3 &&
     p.requires.correction_reason === true && p.review_required === true, p.tier);
  r = await tryIt(() => checked('unhold', { session_id: t.sid }, { reason: R, token: p.token, confirm: true }));
  ok('  without the correction reason -> HC013', r.code === 'HC013', r);
  // a locked payroll month is always reviewed
  const l = await mk({ when: LOCKED });
  p = await preview('unhold', { session_id: l.sid });
  ok('a lesson in a locked payroll month: closed_payroll, reviewed', p.impact.closed_payroll === true && p.review_required === true, p.impact);
  // refuse codes
  r = await tryIt(() => checked('unhold', { session_id: s.sid }));
  ok('un-holding a lesson that is not Held -> HC015 bad_change', r.code === 'HC015' && r.message === 'bad_change', r);
  r = await tryIt(() => preview('unhold', { session_id: randomUUID() }));
  ok('an unknown lesson -> P0002', r.code === 'P0002', r);
  for (const [who, uid] of [['a teacher', s.teacher], ['a parent', PARENT]]) {
    r = await tryIt(() => checked('unhold', { session_id: t.sid }, { reason: R }, uid));
    ok(`money_change_checked('session') by ${who} -> 42501`, r.code === '42501', r);
  }
  r = await tryIt(() => asService(`SELECT public.money_change_checked('session','unhold',$1::jsonb,$2,NULL,true,NULL,'{}'::jsonb)`, [JSON.stringify({ session_id: t.sid }), R]));
  ok('  and by the service role -> refused (no grant / no user)', r.code === '42501', r);
});

await section('G-1 un-hold: the service lane (Stars sync, the rebuild)', async () => {
  const f = await mk({ when: FUTURE, invalidFutureHeld: true });
  ok('fixture: a future lesson that is Held', (await sess(f.sid)).status === 'Held');
  let r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [f.sid]));
  ok('a lesson that has not started (open month) -> allowed', r.ok !== undefined && (await sess(f.sid)).status === 'Scheduled', r);
  const s = await mk({ when: OLD });
  const before = (await asSuper(`SELECT count(*)::int n FROM audit_log WHERE entity='sessions' AND entity_id=$1`, [s.sid])).rows[0].n;
  r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [s.sid]));
  const ev = await events('automation_refused', 'target_id', s.sid);
  ok('started, no sync flip: NOT raised, the lesson is KEPT Held, one automation_refused event', r.ok !== undefined &&
     (await sess(s.sid)).status === 'Held' && ev.length === 1 && ev[0].payload.kind === 'unhold' && ev[0].payload.sync_flipped === false, [r, ev]);
  ok('  audit_log writes no row for the kept lesson (nothing changed)',
     (await asSuper(`SELECT count(*)::int n FROM audit_log WHERE entity='sessions' AND entity_id=$1`, [s.sid])).rows[0].n === before);
  const g = await mk({ when: OLD }); const kg = await kid(g); await att(g, kg, 'Present', null);
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [g.sid]);
  r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [g.sid]));
  ok('started, the sync\'s own flip, only placeholder marks -> allowed (the withdrawal restores)', r.ok !== undefined && (await sess(g.sid)).status === 'Scheduled', r);
  const h = await mk({ when: OLD }); const kh = await kid(h); await att(h, kh, 'Present', h.teacher);
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [h.sid]);
  r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [h.sid]));
  ok('A-9: the sync\'s flip but a PERSON\'s Present remains -> kept Held, recorded', r.ok !== undefined &&
     (await sess(h.sid)).status === 'Held' && (await events('automation_refused', 'target_id', h.sid)).length === 1, r);
  const hl = await mk({ when: OLD }); const khl = await kid(hl); await att(hl, khl, 'Late', hl.teacher);
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [hl.sid]);
  await asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [hl.sid]);
  ok('  the same with a person\'s Late -> kept Held', (await sess(hl.sid)).status === 'Held');
  const lf = await mk({ when: { date: (await clock(40)).date }, invalidFutureHeld: true });
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [lf.month]);
  await asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [lf.sid]);
  ok('a locked payroll month, even a lesson not started -> kept Held, recorded', (await sess(lf.sid)).status === 'Held' &&
     (await events('automation_refused', 'target_id', lf.sid)).length === 1);
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [lf.month]);
  const lk = await mk({ when: LOCKED });
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [lk.sid]);
  await asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [lk.sid]);
  ok('a locked payroll month with the sync\'s flip and no marks -> kept Held', (await sess(lk.sid)).status === 'Held');
  const kept = await mk({ when: OLD });
  r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled', notes='rebuild note' WHERE id=$1`, [kept.sid]));
  ok('a kept un-hold keeps the rest of the write (only the status is held back)', r.ok !== undefined &&
     (await sess(kept.sid)).status === 'Held' && (await sess(kept.sid)).notes === 'rebuild note', r);
});

await section('G-1 un-hold: the owner lane', async () => {
  const s = await mk({ when: OLD });
  const r = await tryIt(() => asSuper(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]));
  ok('the SQL editor: passes, and one owner_lane event names the lesson and the kind (A-1)', r.ok !== undefined &&
     (await sess(s.sid)).status === 'Scheduled' && (await events('owner_lane', 'session_id', s.sid)).some((e) => e.payload.kind === 'unhold'), r);
});

// ---------------------------------------------------------------- G-2 hold
await section('G-2 hold without a register', async () => {
  const s = await mk({ when: OLD, status: 'Scheduled' });
  const k = await kid(s); await att(s, k, 'Present', null);
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]));
  ok('nobody took the register (placeholders only): an admin\'s raw hold -> HC020 kind=hold', isKind(r, 'HC020', 'hold') &&
     (await sess(s.sid)).status === 'Scheduled', r);
  await att(s, k, 'Present', s.teacher);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]));
  ok('with a person\'s mark, open month -> allowed, no override row', r.ok !== undefined && (await sess(s.sid)).status === 'Held' &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE target_id=$1`, [s.sid])).rows[0].n === 0, r);
  const l = await mk({ when: LOCKED, status: 'Scheduled' }); const kl = await kid(l); await att(l, kl, 'Present', l.teacher);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Held' WHERE id=$1`, [l.sid]));
  ok('A-5: a person\'s hold WITH marks in a LOCKED month -> HC020', isKind(r, 'HC020', 'hold'), r);
  r = await tryIt(() => asService(`UPDATE sessions SET status='Held' WHERE id=$1`, [l.sid]));
  ok('the service lane may hold (both automatic flippers write the register first), even in a locked month', r.ok !== undefined &&
     (await sess(l.sid)).status === 'Held', r);
  const n = await mk({ when: OLD, status: 'Scheduled' });
  r = await tryIt(() => asService(`UPDATE sessions SET status='Held' WHERE id=$1`, [n.sid]));
  ok('the service lane may hold a lesson with no register', r.ok !== undefined, r);
  // after an un-hold through the checked op, a raw hold needs the checked op again
  const u = await mk({ when: OLD }); const ku = await kid(u); await att(u, ku, 'Present', u.teacher);
  await must('unhold', () => go('unhold', { session_id: u.sid }));
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Held' WHERE id=$1`, [u.sid]));
  ok('after a checked un-hold, a raw hold (marks present) -> HC020 kind=hold', isKind(r, 'HC020', 'hold'), r);
  let p = await preview('hold', { session_id: u.sid });
  ok('  the checked hold: T1 in an open month, "nobody has taken the register" evidence fields', p.kind === 'hold' && p.tier === 1 &&
     p.evidence.unheld_before === true && typeof p.evidence.person_marks === 'number', p);
  const res = await must('hold', () => checked('hold', { session_id: u.sid }, { reason: R, token: p.token, confirm: true }));
  ok('  with a reason: Held, override op hold', (await sess(u.sid)).status === 'Held' && res.tier === 1);
  const l2 = await mk({ when: LOCKED, status: 'Scheduled' });
  p = await preview('hold', { session_id: l2.sid });
  ok('the checked hold in a locked month -> T3 (correction mode), reviewed', p.tier === 3 && p.review_required === true, p.tier);
  const f = await mk({ when: FUTURE, status: 'Scheduled' });
  r = await tryIt(() => checked('hold', { session_id: f.sid }));
  ok('holding a lesson that has not started -> HC015 bad_change', r.code === 'HC015' && r.message === 'bad_change', r);
  const free = await mk({ when: OLD, status: 'Scheduled' }); const kf = await kid(free); await att(free, kf, 'Present', free.teacher);
  p = await preview('hold', { session_id: free.sid });
  ok('a hold the guard does not ask about (marks, open month): kind null, T0 - still one row when done this way', p.kind === null && p.tier === 0, p);
  const r0 = await must('hold T0', () => checked('hold', { session_id: free.sid }, { token: p.token }));
  ok('  done with no reason, one T0 override row', r0.tier === 0 && (await sess(free.sid)).status === 'Held');
});

// ---------------------------------------------------------------- G-3 born Scheduled
await section('G-3 a lesson is born Scheduled', async () => {
  const cid = randomUUID(); await asSuper(`INSERT INTO classes VALUES ($1, gen_random_uuid())`, [cid]);
  let r = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',gen_random_uuid())`, [cid, OLD.date]));
  ok('an admin inserting a past lesson already Held -> HC023 born_status, with the next step', r.code === 'HC023' &&
     /Create it, then take the register/.test(r.detail ?? ''), r);
  r = await tryIt(() => asService(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'06:00','07:00','Canceled',gen_random_uuid())`, [cid, FUTURE.date]));
  ok('D2 d44 said "inserting a session as Canceled is not guarded (D4)"; D4: HC023 on the service lane too', r.code === 'HC023', r);
  r = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'06:00','07:00','Held',gen_random_uuid()) RETURNING status`, [cid, FUTURE.date]));
  ok('a FUTURE lesson sent as Held is made Scheduled by the existing validate trigger first, then passes (as today)',
     r.ok?.rows?.[0]?.status === 'Scheduled', r);
  r = await tryIt(() => asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',gen_random_uuid()) RETURNING id`, [cid, OLD.date]));
  ok('the owner lane may (fixtures, the SQL editor), and leaves an owner_lane event', r.ok !== undefined &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_events WHERE kind='owner_lane' AND payload->>'kind'='born_status' AND payload->>'class_id'=$1`, [cid])).rows[0].n === 1, r);
  // an import-shaped upsert of an EXISTING lesson is judged as the update it is (R-4 for lessons)
  const c = await mk({ when: OLD });
  r = await tryIt(() => asService(`INSERT INTO sessions(id,class_id,date,start_time,end_time,teacher_id,status,notes) VALUES ($1,$2,$3,'17:30','19:00',$4,'Held','imported note')
      ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes`, [c.sid, c.cid, c.date, c.teacherId]));
  ok('an upsert of an existing past lesson changing only notes -> updated (BEFORE INSERT passes an existing row)',
     r.ok !== undefined && (await sess(c.sid)).notes === 'imported note', r);
  r = await tryIt(() => asService(`INSERT INTO sessions(id,class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,$3,'17:30','19:00',$4)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`, [c.sid, c.cid, c.date, c.teacherId]));
  ok('  the same upsert setting it Scheduled (an un-hold) is judged by its UPDATE: kept Held on the service lane',
     r.ok !== undefined && (await sess(c.sid)).status === 'Held', r);
});

// ---------------------------------------------------------------- G-4 teacher
await section('G-4 the teacher', async () => {
  const s = await mk({ when: OLD });
  const nt = randomUUID();
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [s.sid, nt]));
  ok('a Held lesson 40 days old, raw teacher change by an admin -> HC020 kind=reteach', isKind(r, 'HC020', 'reteach') &&
     (await sess(s.sid)).teacher_id === s.teacherId, r);
  const t = await mk({ when: TODAY });
  r = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [t.sid, nt]));
  ok('today\'s Held lesson, open month (the free week) -> allowed, no override row', r.ok !== undefined &&
     (await sess(t.sid)).teacher_id === nt &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE target_id=$1`, [t.sid])).rows[0].n === 0, r);
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [TODAY.month]);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [t.sid, randomUUID()]));
  ok('A-19: the free week needs an OPEN payroll month: today, locked month -> HC020', isKind(r, 'HC020', 'reteach'), r);
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [TODAY.month]);
  const sch = await mk({ when: TEN, status: 'Scheduled' });
  r = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [sch.sid, nt]));
  ok('A-5: a lesson started 10 days ago, never Held -> HC020 kind=reteach', isKind(r, 'HC020', 'reteach'), r);
  const fut = await mk({ when: FUTURE, status: 'Scheduled' });
  r = await tryIt(() => asService(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [fut.sid, nt]));
  ok('the rebuild re-assigning a future Scheduled lesson (service) -> allowed', r.ok !== undefined, r);
  r = await tryIt(() => asService(`UPDATE sessions SET teacher_id=$2 WHERE id=$1`, [s.sid, nt]));
  ok('the service lane on an old Held lesson -> HC020 (refused, not recorded)', isKind(r, 'HC020', 'reteach'), r);
  let p = await preview('reteach', { session_id: s.sid, teacher_id: nt });
  ok('preview: from whom to whom, minutes, open month: T1, and no pay figure anywhere',
     p.kind === 'reteach' && p.tier === 1 && p.change.old_teacher_id === s.teacherId && p.change.new_teacher_id === nt &&
     p.change.minutes === 90 && p.impact.closed_payroll === false && !/amount|vnd_owed|pay_vnd|salary/.test(JSON.stringify(p.change)), p);
  const res = await must('reteach', () => checked('reteach', { session_id: s.sid, teacher_id: nt }, { reason: R, token: p.token, confirm: true }));
  const after = await sess(s.sid);
  ok('with a reason: the teacher changed, is_manual true, manual_reason = the reason, one override row', after.teacher_id === nt &&
     after.is_manual === true && after.manual_reason === R && res.tier === 1, after);
  const l = await mk({ when: LOCKED });
  p = await preview('reteach', { session_id: l.sid, teacher_id: nt });
  ok('a locked payroll month -> T3, closed_payroll, reviewed', p.tier === 3 && p.impact.closed_payroll === true && p.review_required === true, p.tier);
  r = await tryIt(() => checked('reteach', { session_id: l.sid, teacher_id: l.teacherId }));
  ok('the same teacher -> HC015 nothing_to_change', r.code === 'HC015' && r.message === 'nothing_to_change', r);
  r = await tryIt(() => checked('reteach', { session_id: l.sid, teacher_id: 'x' }));
  ok('a malformed teacher id -> HC015 bad_args', r.code === 'HC015' && r.message === 'bad_args', r);
  p = await preview('reteach', { session_id: t.sid, teacher_id: randomUUID() });
  ok('a teacher change inside the free week: kind null, T0 (done with no reason, still a row)', p.kind === null && p.tier === 0, p);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=$2, status='Scheduled' WHERE id=$1`, [s.sid, randomUUID()]));
  ok('a teacher change together with an un-hold -> HC022', r.code === 'HC022', r);
});

// ---------------------------------------------------------------- G-5 time
await section('G-5 the time of a Held lesson', async () => {
  const s = await mk({ when: OLD });
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET end_time='20:30' WHERE id=$1`, [s.sid]));
  ok('a Held lesson 40 days old lengthened from 90 to 180 minutes, raw -> HC020 kind=retime', isKind(r, 'HC020', 'retime'), r);
  r = await tryIt(() => asService(`UPDATE sessions SET start_time='17:00', end_time='18:30' WHERE id=$1`, [s.sid]));
  ok('D2 d42 said "include-held: time update on a past Held lesson -> succeeds" (service); D4: HC020', isKind(r, 'HC020', 'retime'), r);
  const t = await mk({ when: TODAY });
  r = await tryIt(() => asAdmin(`UPDATE sessions SET end_time = end_time + interval '5 minutes' WHERE id=$1`, [t.sid]));
  ok('today\'s Held lesson, open month -> allowed (the free week)', r.ok !== undefined, r);
  const sch = await mk({ when: OLD, status: 'Scheduled' });
  r = await tryIt(() => asAdmin(`UPDATE sessions SET end_time='20:30' WHERE id=$1`, [sch.sid]));
  ok('a Scheduled (unpaid) old lesson: not this guard\'s (D2 judges it as before)', r.ok !== undefined, r);
  let p = await preview('retime', { session_id: s.sid, start_time: '17:30', end_time: '20:30' });
  ok('preview: old and new minutes (90 -> 180), T1', p.kind === 'retime' && p.tier === 1 && p.change.old_minutes === 90 &&
     p.change.new_minutes === 180, p);
  await must('retime', () => checked('retime', { session_id: s.sid, start_time: '17:30', end_time: '20:30' }, { reason: R, token: p.token, confirm: true }));
  ok('  with a reason: the times changed', String((await sess(s.sid)).end_time).startsWith('20:30'));
  r = await tryIt(() => checked('retime', { session_id: s.sid, start_time: '21:00', end_time: '20:00' }));
  ok('an end before the start -> HC015 bad_change', r.code === 'HC015' && r.message === 'bad_change', r);
  const later = await clock(0, 1), later2 = await clock(0, 2);
  p = await preview('retime', { session_id: t.sid, start_time: later.time, end_time: later2.time });
  ok('a time change that makes a started lesson "not started" is D2\'s move, not ours -> bad_change (use Move)',
     p.allowed === false && p.refuse_code === 'bad_change', p.refuse_code);
});

// ---------------------------------------------------------------- G-6 assistants
await section('G-6 the assistants of a Held lesson', async () => {
  const s = await mk({ when: OLD });
  const a1 = await ta(s);
  let r = await tryIt(() => asAdmin(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',gen_random_uuid())`, [s.sid]));
  ok('an assistant ADDED to a Held lesson 40 days old -> HC020 kind=restaff', isKind(r, 'HC020', 'restaff'), r);
  r = await tryIt(() => asAdmin(`UPDATE session_participants SET attended=false WHERE session_id=$1`, [s.sid]));
  ok('  marked absent -> HC020', isKind(r, 'HC020', 'restaff'), r);
  r = await tryIt(() => asAdmin(`DELETE FROM session_participants WHERE session_id=$1`, [s.sid]));
  ok('  removed -> HC020', isKind(r, 'HC020', 'restaff'), r);
  r = await tryIt(() => asAdmin(`UPDATE session_participants SET absence_note='was late' WHERE session_id=$1`, [s.sid]));
  ok('  the absence note alone (not pay) -> allowed', r.ok !== undefined, r);
  r = await tryIt(() => asService(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',gen_random_uuid())`, [s.sid]));
  ok('the service lane -> HC020 (refused)', isKind(r, 'HC020', 'restaff'), r);
  const other = await mk({ when: OLD, status: 'Scheduled' });
  const a2 = await ta(other);
  r = await tryIt(() => asAdmin(`UPDATE session_participants SET session_id=$2 WHERE session_id=$1 AND teaching_assistant_id=$3`, [other.sid, s.sid, a2]));
  ok('re-pointing an assistant row onto a Held lesson -> HC020 (the Held lesson is judged)', isKind(r, 'HC020', 'restaff'), r);
  r = await tryIt(() => asAdmin(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',gen_random_uuid())`, [other.sid]));
  ok('a Scheduled (unpaid) lesson -> allowed', r.ok !== undefined, r);
  const t = await mk({ when: TODAY });
  r = await tryIt(() => asAdmin(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',gen_random_uuid())`, [t.sid]));
  ok('today\'s Held lesson, open month -> allowed (the free week)', r.ok !== undefined, r);
  const a3 = randomUUID();
  let p = await preview('restaff', { session_id: s.sid, participants: [{ teaching_assistant_id: a1, attended: false }, { teaching_assistant_id: a3 }] });
  ok('preview: the whole list before / after, T1', p.kind === 'restaff' && p.tier === 1 && p.change.before.length === 1 &&
     p.change.after.length === 2, p);
  await must('restaff', () => checked('restaff', { session_id: s.sid, participants: [{ teaching_assistant_id: a1, attended: false }, { teaching_assistant_id: a3 }] },
    { reason: R, token: p.token, confirm: true }));
  const rows = (await asSuper(`SELECT teaching_assistant_id::text t, attended FROM session_participants WHERE session_id=$1 ORDER BY 1`, [s.sid])).rows;
  ok('  with a reason: the list is what was confirmed (one absent, one added)', rows.length === 2 &&
     rows.find((x) => x.t === a1)?.attended === false && rows.find((x) => x.t === a3)?.attended === true, rows);
  p = await preview('restaff', { session_id: s.sid, participants: [{ teaching_assistant_id: a3 }] });
  await must('restaff remove', () => checked('restaff', { session_id: s.sid, participants: [{ teaching_assistant_id: a3 }] }, { reason: R, token: p.token, confirm: true }));
  ok('  removing one through the checked op', (await asSuper(`SELECT count(*)::int n FROM session_participants WHERE session_id=$1`, [s.sid])).rows[0].n === 1);
  const l = await mk({ when: LOCKED });
  p = await preview('restaff', { session_id: l.sid, participants: [{ teaching_assistant_id: randomUUID() }] });
  ok('a locked payroll month -> T3, reviewed', p.tier === 3 && p.review_required === true, p.tier);
  r = await tryIt(() => checked('restaff', { session_id: l.sid, participants: [{ teaching_assistant_id: 'nope' }] }));
  ok('a malformed list -> HC015 bad_args', r.code === 'HC015' && r.message === 'bad_args', r);
});

// ---------------------------------------------------------------- G-7 backdated lesson
await section('G-7 a lesson that has already started', async () => {
  const cls = await mk({ when: FUTURE, status: 'Scheduled' });
  const fam = (await asSuper(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).rows[0].id;
  const k1 = await kid(cls, { family: fam }), k2 = await kid(cls);
  await inv(k1, OLD.month, { recorded: 540000 });
  const tid = randomUUID();
  let r = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'08:00','09:30',$3)`, [cls.cid, OLD.date, tid]));
  ok('an admin creating a lesson three weeks back, raw -> HC020 kind=create_past (nothing created)', isKind(r, 'HC020', 'create_past') &&
     (await asSuper(`SELECT count(*)::int n FROM sessions WHERE class_id=$1 AND date=$2`, [cls.cid, OLD.date])).rows[0].n === 0, r);
  r = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'08:00','09:30',$3)`, [cls.cid, FUTURE.date, tid]));
  ok('a future lesson -> allowed', r.ok !== undefined, r);
  r = await tryIt(() => asService(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'06:00','07:00',$3)`, [cls.cid, OLD.date, tid]));
  ok('the service lane, dated in the past -> HC020', isKind(r, 'HC020', 'create_past'), r);
  const realToday = (await clock(0, 0)).date;
  r = await tryIt(() => asService(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'00:00','00:01',$3)`, [cls.cid, realToday, tid]));
  ok('the service lane, dated today (already started) -> allowed', r.ok !== undefined, r);
  const args = { class_id: cls.cid, date: OLD.date, start_time: '08:00', end_time: '09:30', teacher_id: tid };
  let p = await preview('create', args);
  ok('preview: the children who will be marked Present and billed, their stored bills, family-wide tier (a paid past month: T2)',
     p.kind === 'create' && p.tier === 2 && p.change.children_marked_present.length === 2 &&
     p.change.children_marked_present.includes(k1) && p.invoices_before.some((i) => i.student_id === k1) &&
     p.refresh_pairs.length === 2, p);
  const res = await must('create', () => checked('create', args, { reason: R, token: p.token, confirm: true }));
  const made = (await asSuper(`SELECT * FROM sessions WHERE class_id=$1 AND date=$2`, [cls.cid, OLD.date])).rows;
  ok('with a reason: one lesson, Scheduled, manual with the reason as its manual_reason, created_by the admin',
     made.length === 1 && made[0].status === 'Scheduled' && made[0].is_manual === true && made[0].manual_reason === R &&
     made[0].created_by === ADMIN, made);
  ok('  the override names the class, the date window and the children; refresh pairs for both', res.tier === 2 && res.refresh_pairs.length === 2, res);
  p = await preview('create', { ...args, date: FUTURE.date, start_time: '15:00', end_time: '16:00' });
  ok('a future lesson through the checked op: kind null, T0', p.kind === null && p.tier === 0, p);
  r = await tryIt(() => checked('create', { ...args, end_time: '07:00' }));
  ok('an end before the start -> HC015 bad_args', r.code === 'HC015' && r.message === 'bad_args', r);
  const lone = await mk({ when: FUTURE, status: 'Scheduled' });
  p = await preview('create', { class_id: lone.cid, date: OLD.date, start_time: '10:00', end_time: '11:00', teacher_id: tid });
  ok('a backdated lesson in a class with no children: still at least T1', p.tier === 1, p.tier);
});

// ---------------------------------------------------------------- the acknowledgement
await section('the acknowledgement cannot be forged or replayed', async () => {
  const s = await mk({ when: OLD });
  const u = await mk({ when: OLD });
  const res = await must('unhold u', () => go('unhold', { session_id: u.sid }));
  let r = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('hec.money_change_ack', '${res.override_id}', true); UPDATE sessions SET status='Scheduled' WHERE id='${s.sid}'`);
  ok('a replay: the flag names a real unhold override of ANOTHER lesson and an earlier transaction -> HC020', r?.code === 'HC020', r);
  const t = await mk({ when: OLD });
  const tr = await must('reteach t', () => go('reteach', { session_id: t.sid, teacher_id: randomUUID() }));
  r = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('hec.money_change_ack', '${tr.override_id}', true); UPDATE sessions SET status='Scheduled' WHERE id='${t.sid}'`);
  ok('the flag names this lesson\'s reteach override (earlier transaction), the write is an un-hold -> HC020', r?.code === 'HC020', r);
  r = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('hec.money_change_ack', 'not-a-uuid', true); UPDATE sessions SET teacher_id=gen_random_uuid() WHERE id='${s.sid}'`);
  ok('a malformed flag matches nothing -> HC020', r?.code === 'HC020', r);
  // stale between preview and confirm: the lesson changed
  const v = await mk({ when: OLD });
  const p = await preview('reteach', { session_id: v.sid, teacher_id: randomUUID() });
  await asSuper(`UPDATE sessions SET notes='changed meanwhile' WHERE id=$1`, [v.sid]);
  r = await tryIt(() => checked('reteach', p.args, { reason: R, token: p.token, confirm: true }));
  ok('the lesson changed after the preview -> HC011 token_stale, nothing written', r.code === 'HC011' && (await sess(v.sid)).teacher_id === p.change.old_teacher_id, r);
  // the tier rose after the preview (the payroll month was locked)
  const w = await mk({ when: { date: (await clock(-160)).date } });
  const pw = await preview('reteach', { session_id: w.sid, teacher_id: randomUUID() });
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [w.month]);
  r = await tryIt(() => checked('reteach', pw.args, { reason: R, token: pw.token, confirm: true, corr: CORR }));
  ok('the payroll month was locked after the preview (T1 -> T3) -> HC011', r.code === 'HC011', r);
});

await section('HC050: the checked path refuses to work without its trigger', async () => {
  const s = await mk({ when: OLD });
  await asSuper(`ALTER TABLE sessions DISABLE TRIGGER zz2_session_pay_guard`);
  const p = await preview('reteach', { session_id: s.sid, teacher_id: randomUUID() });
  const r = await tryIt(() => checked('reteach', p.args, { reason: R, token: p.token, confirm: true }));
  await asSuper(`ALTER TABLE sessions ENABLE TRIGGER zz2_session_pay_guard`);
  ok('zz2_session_pay_guard disabled: money_change_checked(session, reteach) -> HC050, nothing written', r.code === 'HC050' &&
     (await sess(s.sid)).teacher_id === s.teacherId, r);
  await asSuper(`ALTER TABLE session_participants DISABLE TRIGGER zz_session_staff_guard`);
  const p2 = await preview('restaff', { session_id: s.sid, participants: [{ teaching_assistant_id: randomUUID() }] });
  const r2 = await tryIt(() => checked('restaff', p2.args, { reason: R, token: p2.token, confirm: true }));
  await asSuper(`ALTER TABLE session_participants ENABLE TRIGGER zz_session_staff_guard`);
  ok('zz_session_staff_guard disabled: restaff -> HC050', r2.code === 'HC050', r2);
});

// ---------------------------------------------------------------- D2 still works
await section('D2 and the floors keep working beside it', async () => {
  const s = await mk({ when: OLD }); const k = await kid(s); await att(s, k, 'Present', s.teacher);
  const p = (await asAdmin(`SELECT public.session_change_preview($1,'cancel',NULL) r`, [s.sid])).rows[0].r;
  const r = await tryIt(() => asAdmin(`SELECT public.cancel_session_checked($1,'cancel',$2,$3,true,$4,'{}'::jsonb)`, [s.sid, R, p.token, CORR]));
  ok('D2\'s checked cancel of a Held lesson (Held -> Canceled is not an un-hold) -> cancelled', r.ok !== undefined && (await sess(s.sid)).status === 'Canceled', r);
  const m = await mk({ when: FUTURE, status: 'Scheduled' });
  const d12 = (await clock(12)).date;
  const pm = (await asAdmin(`SELECT public.session_change_preview($1,'move',$2::jsonb) r`, [m.sid, JSON.stringify({ date: d12, start_time: '17:30:00', end_time: '19:00:00' })])).rows[0].r;
  const rm = await tryIt(() => asAdmin(`SELECT public.move_session_checked($1,$2,'17:30','19:00',$3,$4,true,NULL,'{}'::jsonb)`, [m.sid, d12, R, pm.token]));
  ok('D2\'s checked move -> moved', rm.ok !== undefined, rm);
  const raw = await tryIt(() => asAdmin(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [m.sid]));
  ok('D2\'s raw cancel is still HC020 (D2\'s own guard)', raw.code === 'HC020' && /never without the checked path/.test(raw.detail ?? ''), raw);
});

// ---------------------------------------------------------------- rollback 4
await section('rollback 4', async () => {
  let e = null; try { await db.exec(sqlOf(rb4F)); } catch (x) { e = x.message; }
  ok('the rollback script runs', e === null, e);
  ok('  the three triggers are gone; the overrides and events stay',
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('zz2_session_pay_guard','zz_session_insert_guard','zz_session_staff_guard')`)).rows[0].n === 0 &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE entity='session'`)).rows[0].n > 0);
  const s = await mk({ when: OLD });
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]));
  ok('  a raw un-hold passes again (the state before 3A)', r.ok !== undefined, r);
  const t = await mk({ when: OLD });
  const p = await preview('reteach', { session_id: t.sid, teacher_id: randomUUID() });
  r = await tryIt(() => checked('reteach', p.args, { reason: R, token: p.token, confirm: true }));
  ok('  the checked path refuses to work without the trigger (HC050): closed', r.code === 'HC050', r);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [t.sid]));
  ok('  D2\'s guard is untouched (raw cancel HC020)', r.code === 'HC020', r);
  try { await db.exec(sqlOf(rb4F)); e = null; } catch (x) { e = x.message; }
  ok('  the rollback script is safe to paste twice', e === null, e);
  try { await db.exec(sqlOf(payF)); e = null; } catch (x) { e = x.message; }
  ok('the migration pastes again after the rollback and the three triggers are back', e === null &&
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('zz2_session_pay_guard','zz_session_insert_guard','zz_session_staff_guard') AND tgenabled='O'`)).rows[0].n === 3, e);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
