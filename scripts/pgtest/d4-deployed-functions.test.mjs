// R-10 (docs/evidence/D4-design.md f.2): manage-session and
// bulk-cancel-sessions AS DEPLOYED TODAY - read from the D-release commit
// c43a82f with git show (blob md5s equal the ones docs/evidence/D-live-
// apply.md recorded for the live v4), bundled - driven against the new SQL
// (D1, D2 and D4 file 1). Preview, cancel, delete, move, un-cancel, bulk
// preview and confirm behave as before; the floors show through.
// First version (step 1a): Held -> Scheduled still answers 200 and leaves
// a floor (it becomes 409 when D4 file 4 is installed).
//
//   node scripts/pgtest/d4-deployed-functions.test.mjs <audit> <cancel guard> <D1> <D2> <d4 floors>
import { PGlite } from '@electric-sql/pglite';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, makeDb, repo } from './d4-prelude.mjs';
import { functionsHarness } from './d4-functions-harness.mjs';

const files = process.argv.slice(2);
if (files.length !== 5) {
  console.error('usage: d4-deployed-functions.test.mjs <audit> <cancelled-lesson guard> <D1> <D2> <d4 floors>');
  process.exit(2);
}
const RELEASE = 'c43a82f';
const DEPLOYED_MD5 = {   // docs/evidence/D-live-apply.md step 4 (LF blob md5 of what was deployed as v4)
  'supabase/functions/manage-session/index.ts': '42044d90e6f6ec755f81dd3fa569ceb3',
  'supabase/functions/bulk-cancel-sessions/index.ts': '7c25bb2228b66f42eefd02e381431600',
  'supabase/functions/_lib/session-guard.ts': '941b53d461e0b3a3148f0a6b81e630db',
  'supabase/functions/_lib/rate-limit.ts': 'aad3d996bc38a83848e33bd1cb88415e',
};

let db = await makeDb(PGlite, { people: true, rls: false, migrations: files });
const H = harness(() => db);
const { ok, section, as, clock } = H;
const asSuper = (sql, params) => as(null, '', null, sql, params);
const F = functionsHarness({ as, asSuper });
const { log, call, person } = F;

await section('the deployed sources', async () => {
  for (const [f, want] of Object.entries(DEPLOYED_MD5)) {
    const text = execFileSync('git', ['show', `${RELEASE}:${f}`], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 26 });
    ok(`${f} at ${RELEASE} is the deployed v4 (md5 ${want})`, createHash('md5').update(text).digest('hex') === want);
  }
});
const manage = await F.loadFunction('supabase/functions/manage-session/index.ts', { commit: RELEASE });
const bulkFn = await F.loadFunction('supabase/functions/bulk-cancel-sessions/index.ts', { commit: RELEASE });
ok('both deployed functions bundled and registered a handler', typeof manage === 'function' && typeof bulkFn === 'function');
const ms = (token, action, data) => call(manage, token, { action, data });

const PAST = await clock(-3), FUTURE = await clock(10), FAR = await clock(20);
async function mk({ when = FUTURE, start = '17:30', end = '19:00', status = 'Scheduled', cid } = {}) {
  const teacher = randomUUID();
  if (!cid) { cid = randomUUID(); await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]); await asSuper(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacher]); }
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [cid, when.date, start, end, status, randomUUID()])).rows[0];
  const t = (await asSuper(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, date: when.date, month: when.date.slice(0, 7) };
}
const att = (sid, status, by, student = randomUUID()) =>
  asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, student, status, by]).then(() => student);
const inv = (student, month, recorded = 0) =>
  asSuper(`INSERT INTO invoices(student_id,month,total_amount,base_amount,recorded_payment) VALUES ($1,$2,540000,540000,$3)`, [student, month, recorded]);
const sess = async (sid) => (await asSuper(`SELECT id, status::text, to_char(date,'YYYY-MM-DD') date FROM sessions WHERE id=$1`, [sid])).rows[0];
const overrides = async (sid) => (await asSuper(`SELECT * FROM session_cancel_overrides WHERE session_id=$1 ORDER BY created_at, id`, [sid])).rows;
const floorOf = async (sid) => (await asSuper(`SELECT * FROM session_evidence_floor WHERE session_id=$1`, [sid])).rows[0] ?? null;
const REASON = 'Teacher is sick today, class off';
const CORR = 'Correction: register belonged to another lesson';
const sessionWritesByService = () => log.writes.filter((w) => w.table === 'sessions' && w.who === 'service');

const admin = await person('admin');

await section('gate', async () => {
  const s = await mk();
  let r = await ms(null, 'cancel', { id: s.sid, reason: REASON, token: 'x' });
  ok('no Authorization -> 401 unauthorized', r.status === 401 && r.body.code === 'unauthorized', r);
  const teacher = await person('teacher');
  r = await ms(teacher.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('a teacher -> 403 (manage-session)', r.status === 403 && r.body.code === 'forbidden', r);
  r = await call(bulkFn, teacher.tok, { step: 'preview', date_from: FUTURE.date, date_to: FUTURE.date });
  ok('a teacher -> 403 (bulk-cancel-sessions)', r.status === 403 && r.body.code === 'forbidden', r);
});

await section('preview and cancel, T0 to T3', async () => {
  const t0 = await mk();
  let p = await ms(admin.tok, 'preview', { id: t0.sid, op: 'cancel' });
  ok('preview T0 -> 200, the new fields pass through (level_now, floor, fingerprint, impact)',
     p.status === 200 && p.body.preview.tier === 0 && p.body.preview.level_now === 'NONE' && 'floor' in p.body.preview &&
     /^[0-9a-f]{64}$/.test(p.body.preview.fingerprint ?? '') && p.body.preview.impact?.tier === 0, p.body.preview);
  let r = await ms(admin.tok, 'cancel', { id: t0.sid, token: p.body.preview.token, reason: REASON });
  ok('cancel T0 -> 200, Canceled, override row with the admin', r.status === 200 && (await sess(t0.sid)).status === 'Canceled' &&
     (await overrides(t0.sid))[0]?.actor_user_id === admin.id, r.body);
  const t2 = await mk({ when: PAST, status: 'Held' }); await att(t2.sid, 'Present', t2.teacher);
  p = await ms(admin.tok, 'preview', { id: t2.sid, op: 'cancel' });
  r = await ms(admin.tok, 'cancel', { id: t2.sid, token: p.body.preview.token, reason: REASON });
  ok('cancel T2 without confirm -> 422/409 confirm_required, nothing cancelled', r.body?.code === 'confirm_required' && (await sess(t2.sid)).status === 'Held', r);
  r = await ms(admin.tok, 'cancel', { id: t2.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('cancel T2 with confirm -> 200', r.status === 200 && (await sess(t2.sid)).status === 'Canceled', r.body);
  const t3 = await mk({ when: PAST, status: 'Held' }); const k = await att(t3.sid, 'Present', t3.teacher); await inv(k, t3.month, 540000);
  p = await ms(admin.tok, 'preview', { id: t3.sid, op: 'cancel' });
  r = await ms(admin.tok, 'cancel', { id: t3.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('cancel T3 without a correction reason -> correction_reason_required', p.body.preview.tier === 3 && r.body?.code === 'correction_reason_required', r);
  r = await ms(admin.tok, 'cancel', { id: t3.sid, token: p.body.preview.token, reason: REASON, confirm: true, correction_reason: CORR });
  ok('cancel T3 with it -> 200, review_required', r.status === 200 && (await overrides(t3.sid))[0]?.review_required === true, r.body);
  ok('no sessions write on the service key so far', sessionWritesByService().length === 0, sessionWritesByService());
});

await section('F-11 through the deployed function: the floor holds the tier', async () => {
  const s = await mk({ when: PAST });
  const k = await att(s.sid, 'Present', null);
  await inv(k, s.month, 540000);
  const pid = (await asSuper(`INSERT INTO point_transactions(student_id,class_id,session_id,points,type,date,created_by)
     VALUES (gen_random_uuid(),$1,$2,5,'participation',$3,$4) RETURNING id`, [s.cid, s.sid, s.date, s.teacher])).rows[0].id;
  const tid = (await asSuper(`INSERT INTO class_transcripts(class_id,session_id,uploaded_by,status) VALUES ($1,$2,$3,'analyzed') RETURNING id`, [s.cid, s.sid, s.teacher])).rows[0].id;
  await as(s.teacher, 'authenticated', 'authenticated', `UPDATE point_transactions SET date = date - 1 WHERE id=$1`, [pid]);
  await as(s.teacher, 'authenticated', 'authenticated', `UPDATE class_transcripts SET session_id = NULL WHERE id=$1`, [tid]);
  const p = await ms(admin.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('preview after the removals: tier 3, level STRONG, level_now NONE, review_required',
     p.body.preview.tier === 3 && p.body.preview.level === 'STRONG' && p.body.preview.level_now === 'NONE' && p.body.preview.review_required === true, p.body.preview);
  // The dialog's wording (src/lib/sessionGuard.ts, bundled) over THIS preview.
  const out = await build({ entryPoints: [resolve(repo, 'src/lib/sessionGuard.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' });
  const libPath = resolve(tmpdir(), `d4-sessionGuard.${process.pid}.mjs`);
  writeFileSync(libPath, out.outputFiles[0].text);
  const lib = await import(pathToFileURL(libPath).href);
  const list = lib.evidenceList(p.body.preview);
  const removed = list.filter((e) => e.removed);
  ok('src/lib/sessionGuard: evidenceList lists the two removals under "Recorded, and later removed", after the current items',
     removed.length === 2 && lib.COPY.floorRemoved === 'Recorded, and later removed' &&
     list.findIndex((e) => e.removed) === list.length - 2 && removed.some((e) => /Points awarded/.test(e.text)) &&
     removed.some((e) => /transcript/.test(e.text)) && removed.every((e) => /by a staff member/.test(e.text)), list.map((e) => e.text));
  ok('src/lib/sessionGuard: floorNote says the lesson once had strong evidence and shows none now',
     /once had strong evidence/.test(lib.floorNote(p.body.preview) ?? '') && /shows no evidence now/.test(lib.floorNote(p.body.preview) ?? ''),
     lib.floorNote(p.body.preview));
  ok('src/lib/sessionGuard: a preview without a floor (a pre-D4 server) adds nothing', lib.floorNote({ ...p.body.preview, floor: undefined }) === null &&
     lib.evidenceList({ ...p.body.preview, floor: undefined }).every((e) => !e.removed));
  let r = await ms(admin.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('cancel without a correction reason -> refused', r.body?.code === 'correction_reason_required', r);
  r = await ms(admin.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON, confirm: true, correction_reason: CORR });
  ok('with it -> 200; stored T3 STRONG, reviewed', r.status === 200 && (await overrides(s.sid))[0]?.tier === 3 &&
     (await overrides(s.sid))[0]?.level === 'STRONG' && (await overrides(s.sid))[0]?.review_required === true, r.body);
});

await section('delete', async () => {
  const ev = await mk({ when: PAST, status: 'Held' }); await att(ev.sid, 'Present', ev.teacher);
  let p = await ms(admin.tok, 'preview', { id: ev.sid, op: 'delete', figures: false });
  ok('preview of a delete with evidence: allowed false, use_cancel', p.body.preview.allowed === false && p.body.preview.refuse_code === 'use_cancel');
  let r = await ms(admin.tok, 'delete', { id: ev.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('delete with evidence -> 409 use_cancel, kept', r.status === 409 && r.body.code === 'use_cancel' && !!(await sess(ev.sid)), r.body);
  p = await ms(admin.tok, 'preview', { id: ev.sid, op: 'cancel' });
  r = await ms(admin.tok, 'cancel', { id: ev.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  p = await ms(admin.tok, 'preview', { id: ev.sid, op: 'delete', figures: false });
  ok('cancel, then preview delete: allowed (cancelled lessons stay deletable)', r.status === 200 && p.body.preview.allowed === true, p.body.preview);
  r = await ms(admin.tok, 'delete', { id: ev.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('  delete -> 200, gone, two override rows', r.status === 200 && !(await sess(ev.sid)) && (await overrides(ev.sid)).length === 2, r.body);
  const t0 = await mk();
  p = await ms(admin.tok, 'preview', { id: t0.sid, op: 'delete', figures: false });
  r = await ms(admin.tok, 'delete', { id: t0.sid, token: p.body.preview.token, reason: 'Duplicate lesson created by mistake' });
  ok('T0 delete -> 200, gone', r.status === 200 && !(await sess(t0.sid)), r.body);
});

await section('move and un-cancel', async () => {
  const s = await mk();
  const change = { date: FAR.date, start_time: '17:30', end_time: '19:00' };
  let p = await ms(admin.tok, 'preview', { id: s.sid, op: 'move', change, figures: false });
  ok('move preview: kind move, tier 0', p.body.preview.kind === 'move' && p.body.preview.tier === 0, p.body.preview);
  let r = await ms(admin.tok, 'move', { id: s.sid, ...change, reason: 'Teacher swapped days with another class', token: p.body.preview.token });
  ok('move -> 200, new date, move override', r.status === 200 && (await sess(s.sid)).date === FAR.date && (await overrides(s.sid))[0]?.action === 'move', r.body);
  const h = await mk({ when: PAST, status: 'Held' }); await att(h.sid, 'Present', h.teacher);
  const ch = { date: FAR.date, start_time: '08:00', end_time: '09:30' };
  p = await ms(admin.tok, 'preview', { id: h.sid, op: 'move', change: ch, figures: false });
  r = await ms(admin.tok, 'move', { id: h.sid, ...ch, reason: 'Lesson was entered on the wrong day', token: p.body.preview.token, confirm: true,
    correction_reason: p.body.preview.tier === 3 ? CORR : undefined });
  ok('a checked move of a taught lesson -> 200, and it keeps a STRONG floor of the old day', r.status === 200 && (await floorOf(h.sid))?.level === 'STRONG', r.body);
  const u = await mk({ when: PAST }); await att(u.sid, 'Present', null);
  p = await ms(admin.tok, 'preview', { id: u.sid, op: 'cancel', figures: false });
  await ms(admin.tok, 'cancel', { id: u.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  p = await ms(admin.tok, 'preview', { id: u.sid, op: 'uncancel', figures: false });
  r = await ms(admin.tok, 'uncancel', { id: u.sid, token: p.body.preview.token, reason: 'Cancelled by mistake, lesson ran' });
  ok('un-cancel -> 200, Scheduled, uncancel override', r.status === 200 && (await sess(u.sid)).status === 'Scheduled' &&
     (await overrides(u.sid)).some((o) => o.action === 'uncancel'), r.body);
});

await section('Held -> Scheduled (first version: still plain; the floor records it)', async () => {
  const s = await mk({ when: PAST, status: 'Held' });
  const r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled' });
  ok('change-status Held -> Scheduled -> 200 (unguarded until D4 file 4)', r.status === 200 && (await sess(s.sid)).status === 'Scheduled', r);
  const f = await floorOf(s.sid);
  ok('  the floor records SOFT, written as the admin', f?.level === 'SOFT' && f.causes[0].actor_user_id === admin.id, f);
  const p = await ms(admin.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('  so a later cancel previews T2, not T1', p.body.preview.tier === 2, p.body.preview.tier);
});

await section('bulk preview and confirm', async () => {
  const cid = randomUUID(); await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, randomUUID()]);
  const base = await clock(30);
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await mk({ when: base, cid, start: `0${7 + i}:00`, end: `0${7 + i}:45` })).sid);
  let r = await call(bulkFn, admin.tok, { step: 'preview', date_from: base.date, date_to: base.date, class_id: cid });
  ok('bulk preview -> 200, three plain lessons', r.status === 200 && r.body.plain?.length === 3, [r.status, r.body.code, r.body.plain?.length]);
  log.rpcs = [];
  r = await call(bulkFn, admin.tok, { step: 'confirm', batch_id: r.body.batch_id, reason: 'Public holiday, school closed',
    items: r.body.plain.map((x) => ({ id: x.id, token: x.token })) });
  ok('bulk confirm -> 200, three cancelled through cancel_sessions_checked_bulk on the caller\'s client',
     r.status === 200 && r.body.canceled?.length === 3 &&
     log.rpcs.filter((x) => x.name === 'cancel_sessions_checked_bulk').every((c) => c.who === 'user'), r.body);
  ok('  every lesson Canceled', (await Promise.all(ids.map(sess))).every((x) => x.status === 'Canceled'));
  ok('no person-initiated sessions write used the service key, in the whole suite', sessionWritesByService().length === 0, sessionWritesByService());
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
