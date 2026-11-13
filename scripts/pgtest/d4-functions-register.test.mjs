// D4 step 1b: repair-attendance, mark-attendance and guarded-change-refresh,
// bundled from the working tree and driven with requests per role, their
// Supabase clients a stand-in for PostgREST over the REAL migrations (the
// same list as d4-register). Asserts that every person-initiated register
// write goes through the caller's own JWT, and never the service key.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { harness, makeDb } from './d4-prelude.mjs';
import { functionsHarness, SERVICE_KEY } from './d4-functions-harness.mjs';

const files = process.argv.slice(2);
if (files.length !== 8) {
  console.error('usage: d4-functions-register.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core>');
  process.exit(2);
}
let db = await makeDb(PGlite, { people: true, rls: true, migrations: files });
const H = harness(() => db);
const { ok, section, as, clock } = H;
const asSuper = (sql, p) => as(null, '', null, sql, p);
const F = functionsHarness({ as, asSuper });
const { log, call, person } = F;

const repair = await F.loadFunction('supabase/functions/repair-attendance/index.ts');
const markFn = await F.loadFunction('supabase/functions/mark-attendance/index.ts');
const refreshFn = await F.loadFunction('supabase/functions/guarded-change-refresh/index.ts');
ok('the three functions bundled and registered a handler', [repair, markFn, refreshFn].every((f) => typeof f === 'function'));

const TODAY = await clock(0, -2), OLD = await clock(-40);
async function mk({ when = OLD, start = '17:30', end = '19:00', status = 'Held', teacher } = {}) {
  const cid = randomUUID();
  teacher = teacher ?? randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]);
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,gen_random_uuid()) RETURNING id`,
    [cid, when.date, start, end, status])).rows[0];
  return { sid: id, cid, teacher, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s) => {
  const id = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  return id;
};
const att = (s, k, status, by) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [s.sid, k, status, by]);
const inv = (k, month, recorded = 0) => asSuper(`INSERT INTO invoices(student_id,month,total_amount,base_amount,recorded_payment) VALUES ($1,$2,540000,540000,$3)`, [k, month, recorded]);
const mark = async (s, k) => (await asSuper(`SELECT status, marked_by FROM attendance WHERE session_id=$1 AND student_id=$2`, [s.sid, k])).rows[0];
const serviceWrites = (table) => log.writes.filter((w) => w.table === table && w.who === 'service');
const R = 'Register was never entered for this child';

const admin = await person('admin');
const teacherP = await person('teacher');
const parent = await person('family');

// ---------------------------------------------------------------- repair-attendance
await section('repair-attendance: who may call it', async () => {
  const s = await mk(); const k = await kid(s);
  const body = { studentId: k, classId: s.cid, startDate: OLD.date, endDate: OLD.date, defaultStatus: 'Present' };
  for (const [who, tok, want] of [['no Authorization', null, 401], ['a teacher', teacherP.tok, 403], ['a parent', parent.tok, 403],
                                  ['the service key itself', SERVICE_KEY, 403]]) {
    const r = await call(repair, tok, body);
    ok(`repair-attendance: ${who} -> ${want}, nothing written`, r.status === want && !(await mark(s, k)), r);
  }
});

await section('repair-attendance: preview, refusal, acknowledgement', async () => {
  const s = await mk(); const k = await kid(s); await inv(k, s.month, 0);
  const body = { studentId: k, classId: s.cid, startDate: OLD.date, endDate: OLD.date, defaultStatus: 'Present' };
  log.writes = []; log.rpcs = [];
  let r = await call(repair, admin.tok, { ...body, preview: true });
  ok('preview: true -> 200, the lesson listed with its tier, nothing written (the old Preview button wrote)',
     r.status === 200 && r.body.preview === true && r.body.sessions.length === 1 && r.body.sessions[0].tier === 1 && !(await mark(s, k)), r.body);
  r = await call(repair, admin.tok, body);
  ok('an old billed lesson without an acknowledgement -> 409 attendance_requires_checked_path with the preview, NOTHING written',
     r.status === 409 && r.body.code === 'attendance_requires_checked_path' && r.body.preview?.tier === 1 && !(await mark(s, k)), r.body);
  const token = r.body.preview.token;
  r = await call(repair, admin.tok, { ...body, ack: { reason: 'too short', token, confirm: true } });
  ok('  a short reason -> 422 reason_too_short with a fresh preview, nothing written', r.status === 422 && r.body.code === 'reason_too_short' &&
     !!r.body.preview && !(await mark(s, k)), r.body);
  r = await call(repair, admin.tok, { ...body, ack: { reason: R, token: 'f'.repeat(64), confirm: true } });
  ok('  a stale token -> 409 token_stale with a fresh preview', r.status === 409 && r.body.code === 'token_stale' && !!r.body.preview?.token, r.body);
  r = await call(repair, admin.tok, { ...body, ack: { reason: R, token, confirm: true } });
  const o = (await asSuper(`SELECT * FROM money_change_overrides WHERE id=$1`, [r.body.override_id ?? randomUUID()])).rows[0];
  ok('  with the acknowledgement -> 200, one row as before (marked_by NULL, the note), one override row with the reason',
     r.status === 200 && r.body.inserted === 1 && (await mark(s, k))?.status === 'Present' && (await mark(s, k))?.marked_by === null &&
     o?.reason === R && o.op === 'repair' && o.actor_user_id === admin.id, r.body);
  ok('  the write was the checked RPC on the caller\'s own client; the service key wrote no attendance',
     log.rpcs.some((x) => x.name === 'money_change_checked' && x.who === 'user') && serviceWrites('attendance').length === 0 &&
     !log.rpcs.some((x) => x.who === 'service' && /money_change/.test(x.name)), log.rpcs.map((x) => `${x.name}:${x.who}`));
  r = await call(repair, admin.tok, body);
  ok('repairing again: nothing missing -> 200, inserted 0', r.status === 200 && r.body.inserted === 0, r.body);
  // this week: T0, written without a dialog, still one override row
  const w = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time }); const kw = await kid(w);
  r = await call(repair, admin.tok, { studentId: kw, classId: w.cid, startDate: TODAY.date, endDate: TODAY.date, defaultStatus: 'Present' });
  ok('lessons of this week -> 200 without a reason (T0), and one T0 override row', r.status === 200 && r.body.inserted === 1 && r.body.tier === 0 &&
     (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE id=$1 AND tier = 0`, [r.body.override_id])).rows[0].n === 1, r.body);
  r = await call(repair, admin.tok, { studentId: kw, classId: randomUUID(), startDate: TODAY.date, endDate: TODAY.date, defaultStatus: 'Present' });
  ok('a class the child is not in -> 400 no_enrollment', r.status === 400 && r.body.code === 'no_enrollment', r.body);
  r = await call(repair, admin.tok, { studentId: 'x' });
  ok('a malformed body -> 400 bad_request', r.status === 400 && r.body.code === 'bad_request', r.body);
});

// ---------------------------------------------------------------- mark-attendance
await section('mark-attendance: admin writes as the admin', async () => {
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time, status: 'Scheduled' }); const kt = await kid(t);
  log.writes = [];
  let r = await call(markFn, admin.tok, { sessionId: t.sid, studentId: kt, status: 'Present' });
  ok('admin, today\'s lesson -> 200; the attendance upsert and the Held flip on the admin\'s own client',
     r.status === 200 && (await mark(t, kt))?.marked_by === admin.id &&
     log.writes.filter((w) => w.table === 'attendance').every((w) => w.who === 'user') &&
     log.writes.some((w) => w.table === 'sessions' && w.who === 'user') && serviceWrites('attendance').length === 0, log.writes);
  const s = await mk(); const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, 540000);
  log.writes = [];
  r = await call(markFn, admin.tok, { sessionId: s.sid, studentId: k, status: 'Excused' });
  ok('admin, a lesson 40 days old in a paid month, Present -> Excused -> 409 attendance_requires_checked_path with the set_marks preview (T2); nothing written',
     r.status === 409 && r.body.code === 'attendance_requires_checked_path' && r.body.kind === 'retro_mark' &&
     r.body.preview?.tier === 2 && r.body.preview?.op === 'set_marks' && (await mark(s, k)).status === 'Present', r.body);
  ok('  and it was never retried on the service key', serviceWrites('attendance').length === 0, log.writes);
  r = await call(markFn, admin.tok, { sessionId: s.sid, batch: [{ studentId: k, status: 'Absent' }] });
  ok('admin, the same old lesson, Present -> Absent (both charged) -> 200', r.status === 200 && (await mark(s, k)).status === 'Absent', r.body);
});

await section('mark-attendance: a teacher, rule 6 in the function', async () => {
  const tu = await person('teacher');
  const t = await mk({ when: TODAY, start: TODAY.time, end: TODAY.end_time, teacher: tu.id }); const kt = await kid(t);
  await att(t, kt, 'Present', null); await inv(kt, t.month, 540000);
  await asSuper(`UPDATE invoices SET confirmation_status='confirmed' WHERE student_id=$1`, [kt]);
  let r = await call(markFn, tu.tok, { sessionId: t.sid, studentId: kt, status: 'Excused' });
  ok('the class teacher, today, a confirmed month, Present -> Excused -> 200 (the week is free)', r.status === 200 &&
     (await mark(t, kt)).status === 'Excused', r.body);
  const s = await mk({ teacher: tu.id }); const k = await kid(s); await att(s, k, 'Excused', null);
  log.writes = [];
  r = await call(markFn, tu.tok, { sessionId: s.sid, studentId: k, status: 'Present' });
  ok('the class teacher, a lesson in a past month, Excused -> Present -> 409 "ask an administrator", nothing written, no bill read',
     r.status === 409 && r.body.kind === 'retro_mark_staff' && /ask an administrator/.test(r.body.error) &&
     (await mark(s, k)).status === 'Excused' && log.writes.length === 0 && !log.reads.some((x) => x.table === 'invoices'), r.body);
  const k2 = await kid(s); await att(s, k2, 'Present', null);
  r = await call(markFn, tu.tok, { sessionId: s.sid, studentId: k2, status: 'Absent' });
  ok('the class teacher, the same old lesson, Present -> Absent (no crossing) -> 200', r.status === 200, r.body);
  const other = await person('teacher');
  r = await call(markFn, other.tok, { sessionId: s.sid, studentId: k2, status: 'Present' });
  ok('a teacher who does not teach the class (one-off cover, old lesson) -> 403', r.status === 403, r.body);
  r = await call(markFn, parent.tok, { sessionId: s.sid, studentId: k2, status: 'Present' });
  ok('a parent -> 403', r.status === 403, r.body);
  r = await call(markFn, null, { sessionId: s.sid, studentId: k2, status: 'Present' });
  ok('no Authorization -> 401', r.status === 401, r.body);
});

// ---------------------------------------------------------------- guarded-change-refresh
await section('guarded-change-refresh', async () => {
  const s = await mk();
  const kids = [];
  for (let i = 0; i < 30; i++) { const k = await kid(s); await att(s, k, 'Present', null); await inv(k, s.month, 0); kids.push(k); }
  const args = { session_id: s.sid, marks: kids.map((k) => ({ student_id: k, status: 'Excused' })) };
  const p = (await as(admin.id, 'authenticated', 'authenticated', `SELECT public.money_change_preview('attendance','set_marks',$1::jsonb) r`, [JSON.stringify(args)])).rows[0].r;
  const res = (await as(admin.id, 'authenticated', 'authenticated', `SELECT public.money_change_checked('attendance','set_marks',$1::jsonb,$2,$3,true,NULL,'{}'::jsonb) r`,
    [JSON.stringify(args), R, p.token])).rows[0].r;
  ok('fixture: 30 children excused in one checked change -> 30 refresh pairs', res.refresh_pairs.length === 30, res.refresh_pairs.length);
  log.invokes = [];
  let r = await call(refreshFn, admin.tok, { action: 'refresh', override_id: res.override_id });
  ok('refresh: 25 pairs this call (calculate-tuition allows 30 a minute), 5 left, recorded as a failed / partial refresh',
     r.status === 200 && r.body.tuition.results.length === 25 && r.body.tuition.remaining === 5 && r.body.tuition.status === 'partial' &&
     log.invokes.filter((x) => x.name === 'calculate-tuition').length === 25 && r.body.tuition.event_recorded, r.body);
  r = await call(refreshFn, admin.tok, { action: 'refresh', override_id: res.override_id });
  const ev = (await asSuper(`SELECT kind FROM money_change_events WHERE override_id=$1 ORDER BY created_at, id`, [res.override_id])).rows.map((x) => x.kind);
  ok('the same call resumes: the last 5, then tuition_refreshed', r.status === 200 && r.body.tuition.results.length === 5 &&
     r.body.tuition.status === 'refreshed' && ev.join(',') === 'tuition_refresh_failed,tuition_refreshed', [r.body.tuition.status, ev]);
  F.tuitionFail.add(kids[0]);
  r = await call(refreshFn, teacherP.tok, { action: 'refresh', override_id: res.override_id });
  ok('a teacher -> 403', r.status === 403, r.body);
  r = await call(refreshFn, admin.tok, { action: 'refresh', override_id: randomUUID() });
  ok('an unknown change -> 404', r.status === 404, r.body);
  r = await call(refreshFn, admin.tok, { action: 'log-refused', entity: 'attendance', target_id: s.sid, source: 'x' });
  ok('log-refused by an admin -> 403 (automation only)', r.status === 403, r.body);
  r = await call(refreshFn, SERVICE_KEY, { action: 'log-refused', entity: 'attendance', target_id: s.sid, source: 'auto-mark-attendance' });
  ok('log-refused by the service role -> one automation_refused event', r.status === 200 &&
     (await asSuper(`SELECT kind FROM money_change_events WHERE id=$1`, [r.body.event_id])).rows[0]?.kind === 'automation_refused', r.body);
  r = await call(refreshFn, admin.tok, { action: 'nope' });
  ok('an unknown action -> 400', r.status === 400, r.body);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
