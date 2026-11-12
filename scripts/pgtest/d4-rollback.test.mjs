// R-13 (docs/evidence/D4-design.md f.7), first version (step 1a): install
// D1, D2 and D4 file 1, use the floors, run scripts/ROLLBACK-d4-1-floors.sql,
// paste 20261112091000 again, and require the D-release fingerprint to be 66
// of 66 again; then that a raw write D4 refused now passes and that D2's
// cancel still needs its checked path.
//
//   node scripts/pgtest/d4-rollback.test.mjs <audit> <cancel guard> <D1> <D2> <d4 floors> <ROLLBACK-d4-1-floors.sql>
import { PGlite } from '@electric-sql/pglite';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { harness, makeDb, sqlOf, repo } from './d4-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 6) {
  console.error('usage: d4-rollback.test.mjs <audit> <cancelled-lesson guard> <D1> <D2> <d4 floors> <rollback script>');
  process.exit(2);
}
const [auditFile, cancelFile, d1File, d2File, floorsFile, rollbackFile] = files;
let db = await makeDb(PGlite, { people: true, migrations: [auditFile, cancelFile, d1File, d2File, floorsFile] });
const H = harness(() => db);
const { ok, section, as, tryIt, clock } = H;
const asSuper = (sql, params) => as(null, '', null, sql, params);
const ADMIN = randomUUID();
await asSuper(`INSERT INTO user_roles VALUES ($1,'admin')`, [ADMIN]);
const asAdmin = (sql, params) => as(ADMIN, 'authenticated', 'authenticated', sql, params);
const PAST = await clock(-3), FAR = await clock(20);
const R = 'Teacher is sick today, class off';
const CORR = 'Correction: register belonged to another lesson';
async function mk(status = 'Held', when = PAST) {
  const cid = randomUUID(), t = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, t]);
  const sid = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,gen_random_uuid()) RETURNING id`,
    [cid, when.date, status])).rows[0].id;
  return { sid, cid, t };
}
const md5Of = async (name) => (await db.query(`SELECT md5(replace(prosrc, E'\\r', '')) m FROM pg_proc WHERE proname=$1`, [name])).rows[0].m;
const D4_TRIGGERS = ['zz_attendance_evidence_guard', 'zz_point_evidence_keep', 'zz_transcript_evidence_keep', 'zz_homework_evidence_keep',
  'zz0_session_evidence_keep', 'zz_invoice_state_floor'];
const nD4Triggers = async () => (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1)`, [D4_TRIGGERS])).rows[0].n;

// A lesson with a floor before the rollback.
const s = await mk();
const k = randomUUID();
await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [s.sid, k, s.t]);
await asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]);

await section('before the rollback', async () => {
  ok('fixture: seven D4 trigger objects, a floor row, the D4 bodies installed',
     (await nD4Triggers()) === 7 && (await asSuper(`SELECT count(*)::int n FROM session_evidence_floor`)).rows[0].n === 1 &&
     (await md5Of('_session_change_assess')) !== 'e0acbcc9a958a789aa437a6c8c4a84ec');
  const r = await tryIt(() => asAdmin(`UPDATE attendance SET student_id=gen_random_uuid() WHERE session_id=$1`, [s.sid]));
  ok('fixture: a re-point is refused (HC024) while file 1 is in', r.code === 'HC024', r);
});

await section('step 1: the rollback script', async () => {
  let err = null;
  try { await db.exec(sqlOf(rollbackFile)); } catch (e) { err = e.message; }
  ok('the rollback script runs', err === null, err);
  ok('  all seven floor / keep trigger objects are gone', (await nD4Triggers()) === 0);
  ok('  the floor tables, their rows and their guards stay', (await asSuper(`SELECT count(*)::int n FROM session_evidence_floor`)).rows[0].n === 1 &&
     (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('session_evidence_floor_guard','invoice_state_floor_guard')`)).rows[0].n === 2);
  const p = (await asAdmin(`SELECT public.session_change_preview($1,'cancel',NULL) r`, [s.sid])).rows[0].r;
  ok('  between the two pastes the guard still works (the D4 bodies read the frozen floor): STRONG, T2', p.tier === 2 && p.level === 'STRONG', [p.tier, p.level]);
  try { await db.exec(sqlOf(rollbackFile)); err = null; } catch (e) { err = e.message; }
  ok('  the rollback script is safe to paste twice', err === null, err);
});

await section('step 2: 20261112091000 pasted again', async () => {
  let err = null;
  try { await db.exec(sqlOf(d2File)); } catch (e) { err = e.message; }
  ok('the D2 file pastes again over D4', err === null, err);
  ok('  _session_change_assess is the D2 body again (md5 of prosrc = D release e0acbcc9...)', (await md5Of('_session_change_assess')) === 'e0acbcc9a958a789aa437a6c8c4a84ec');
  ok('  _session_erased_recently is the D2 body again (md5 of prosrc = D release 32c7fac7...)', (await md5Of('_session_erased_recently')) === '32c7fac7d6336c6ac48ba15bfe891630');
  // In a child process (a second pglite in this one runs out of wasm memory).
  let out = '', code = 0;
  try { out = execFileSync(process.execPath, [resolve(repo, 'scripts/pgtest/guard-fingerprint.mjs'), '--check-unchanged', '--after-rollback'], { cwd: repo, encoding: 'utf8' }); }
  catch (e) { code = e.status ?? 1; out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  ok('the D-release fingerprint is 66 of 66 again after rollback + D2 re-paste', code === 0 && /compared: 66; differing: 0/.test(out), out);
  // ... and on THIS database, the same statement over the two replaced functions.
  const fp = (await db.query(`SELECT md5(replace(prosrc, E'\\r', '')) m, proname FROM pg_proc WHERE proname IN ('_session_change_assess','_session_erased_recently') ORDER BY proname`)).rows;
  ok('  on this database too: both bodies are the D release ones', fp[0].m === 'e0acbcc9a958a789aa437a6c8c4a84ec' && fp[1].m === '32c7fac7d6336c6ac48ba15bfe891630', fp);
});

await section('what the rollback leaves, exactly (the list in the script header)', async () => {
  const LEFT_FNS = ['_caller_lane', '_floor_table_guard', '_floor_families_or', '_floor_causes_push', '_floor_mark_level',
    '_floor_point_level', '_floor_transcript_level', '_session_evidence_keep', 'session_effective_level', 'invoice_floor_state',
    '_attendance_evidence_guard', '_point_evidence_keep', '_transcript_evidence_keep', '_homework_evidence_keep',
    '_session_evidence_keep_trg', '_invoice_state_floor'];
  const fns = (await db.query(`SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') an,
      has_function_privilege('authenticated', oid, 'EXECUTE') au, has_function_privilege('service_role', oid, 'EXECUTE') sr
      FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1)`, [LEFT_FNS])).rows;
  ok('the 16 functions of the file stay, none executable by anon / authenticated / service_role',
     fns.length === 16 && fns.every((f) => !f.an && !f.au && !f.sr), fns.map((f) => f.proname));
  const t = (await db.query(`SELECT c.relname || '.' || t.tgname k FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND (c.relname IN ('session_evidence_floor', 'invoice_state_floor') OR t.tgname = 'audit_point_transactions')
      ORDER BY 1`)).rows.map((r) => r.k);
  ok('the two tables keep their guard and no-truncate triggers; audit_point_transactions stays',
     JSON.stringify(t) === JSON.stringify(['invoice_state_floor.invoice_state_floor_guard', 'invoice_state_floor.invoice_state_floor_no_truncate',
       'point_transactions.audit_point_transactions', 'session_evidence_floor.session_evidence_floor_guard',
       'session_evidence_floor.session_evidence_floor_no_truncate']), t);
  const users = (await db.query(`SELECT count(*)::int n FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      AND proname NOT IN (SELECT unnest($1::text[])) AND (prosrc LIKE '%session_effective_level%' OR prosrc LIKE '%_session_evidence_keep%'
      OR prosrc LIKE '%invoice_floor_state%' OR prosrc LIKE '%session_evidence_floor%' OR prosrc LIKE '%invoice_state_floor%')`, [LEFT_FNS])).rows[0].n;
  ok('after the D2 re-paste no other function calls them or reads the floor tables', users === 0, users);
  const r = await tryIt(() => asSuper(`DELETE FROM session_evidence_floor`));
  ok('the floor rows are still protected (DELETE -> HC040)', r.code === 'HC040', r);
});

await section('after the rollback', async () => {
  let r = await tryIt(() => asAdmin(`UPDATE attendance SET student_id=gen_random_uuid() WHERE session_id=$1`, [s.sid]));
  ok('a raw write D4 refused (re-point, HC024) now passes again', r.ok !== undefined, r);
  const s2 = await mk(); const k2 = randomUUID();
  await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [s2.sid, k2, s2.t]);
  r = await tryIt(() => asAdmin(`DELETE FROM attendance WHERE student_id=$1`, [k2]));
  ok('a person\'s mark can be deleted raw again (HC025 gone)', r.ok !== undefined, r);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [s2.sid]));
  ok('D2\'s cancel still needs its checked path (raw cancel -> HC020)', r.code === 'HC020', r);
  const p = (await asAdmin(`SELECT public.session_change_preview($1,'cancel',NULL) r`, [s2.sid])).rows[0].r;
  r = await tryIt(() => asAdmin(`SELECT public.cancel_session_checked($1,'cancel',$2,$3,true,$4,'{}'::jsonb)`, [s2.sid, R, p.token, p.tier === 3 ? CORR : null]));
  ok('  and the checked cancel works (D2 token, no D4 fields)', r.ok !== undefined && p.level_now === undefined, r);
  const s3 = await mk();
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s3.sid]);
  ok('no floor is written any more (an un-hold leaves none)', (await asSuper(`SELECT count(*)::int n FROM session_evidence_floor WHERE session_id=$1`, [s3.sid])).rows[0].n === 0);
});

await section('re-install after a rollback', async () => {
  let err = null;
  try { await db.exec(sqlOf(floorsFile)); } catch (e) { err = e.message; }
  ok('file 1 pastes again over the restored D2 bodies (its preflight accepts them)', err === null, err);
  ok('  the seven trigger objects are back and the old floor row is still read', (await nD4Triggers()) === 7 &&
     (await asAdmin(`SELECT public.session_change_preview($1,'cancel',NULL) r`, [s.sid])).rows[0].r.floor?.level === 'STRONG');
});

await section('fingerprint files are current', async () => {
  const run = (args) => { try { execFileSync(process.execPath, [resolve(repo, 'scripts/pgtest/guard-fingerprint.mjs'), ...args], { cwd: repo, stdio: 'pipe' }); return 0; } catch (e) { return e.status ?? 1; } };
  ok('docs/evidence/D-release-fingerprint.* still regenerate byte for byte (--check)', run(['--check']) === 0);
  ok('docs/evidence/D4-release-fingerprint.* match the migration (--release d4 --check)', run(['--release', 'd4', '--check']) === 0);
  ok('--check-unchanged: only the two replaced functions differ', run(['--check-unchanged']) === 0);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
