// D5: scripts/CHECK-past-cancellations-with-evidence.sql on the REAL audit
// trigger, cancelled-lesson guard, evidence function (D1) and cancellation
// guard (D2), loaded in paste order over the D2 suites' prelude.
//
// What this suite holds:
//   - the script is one read-only statement and runs in a READ ONLY
//     transaction (session_held_evidence included);
//   - a lesson a teacher marked Present / Late and that was then cancelled is
//     counted, although the register now says Excused everywhere (the mark is
//     read from audit_log, the trigger's rewrite is not logged);
//   - a placeholder mark, a mark corrected to Absent before the cancel, and a
//     lesson that was never cancelled are not counted as taught;
//   - a lesson cancelled before the audit trigger is counted as unknowable;
//   - a cancel through the guard is in 'checked' with its stored level, and a
//     cancel that got past the guard (triggers off, as the SQL editor can) is
//     in 'unchecked_after_guard';
//   - the D1 columns equal what session_held_evidence says lesson by lesson;
//   - the output holds no uuid.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeDb, harness, repo, AUDIT, CANCEL, D1, D2, migPath, sqlOf } from './d4-prelude.mjs';

const SCRIPT = readFileSync(join(repo, 'scripts', 'CHECK-past-cancellations-with-evidence.sql'), 'utf8');
let db;
const { ok, counts, section, as, clock } = harness(() => db);

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2), C = U(10), S1 = U(21), S2 = U(22);
const L = Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [`L${i}`, U(100 + i)]));

await section('static: one read-only statement', async () => {
  const stripped = SCRIPT.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
  const bad = stripped.match(/\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|DO|CALL|SET|LOCK|NOTIFY|EXECUTE|PERFORM|COMMIT|ROLLBACK|BEGIN)\b/gi) ?? [];
  ok('no write, DDL or transaction keyword outside comments and strings', bad.length === 0, bad);
  ok('one statement, a WITH ... SELECT', stripped.split(';').filter((s) => s.trim()).length === 1 && /^\s*WITH\b/i.test(stripped));
  const fns = [...new Set((stripped.match(/\bpublic\.([a-z_]+)\s*\(/g) ?? []).map((m) => m.replace(/\s*\($/, '')))];
  ok('the only function it calls is session_held_evidence, declared STABLE', fns.join() === 'public.session_held_evidence'
     && /FUNCTION public\.session_held_evidence\(p_session_id uuid\)[\s\S]{0,200}STABLE/.test(sqlOf(migPath(D1))), fns);
});

db = await makeDb(PGlite, { migrations: [AUDIT, CANCEL, D1] });
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asUid = (uid, sql, p) => as(uid, 'authenticated', null, sql, p);   // a person; superuser so RLS is not the subject here

const OLD = await clock(-40), OLD2 = await clock(-39), PAST = await clock(-3);
await section('history before the guard', async () => {
  await asSuper(`INSERT INTO user_roles VALUES ($1, 'admin'), ($2, 'teacher')`, [ADMIN, TEACHER]);
  await asSuper(`INSERT INTO classes(id, default_teacher_user) VALUES ($1, $2)`, [C, TEACHER]);
  await asSuper(`INSERT INTO enrollments VALUES ($1, $2, '2025-01-01', NULL, NULL), ($1, $3, '2025-01-01', NULL, NULL)`, [C, S1, S2]);
  const lesson = (id, date, status = 'Scheduled') => asSuper(
    `INSERT INTO sessions(id, class_id, date, start_time, end_time, status, teacher_id) VALUES ($1, $2, $3, '09:00', '10:00', $4, $5)`,
    [id, C, date, status, TEACHER]);
  const mark = (uid, sid, kid, status, by) => asUid(uid,
    `INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`, [sid, kid, status, by]);
  const cancelRaw = (sid) => asUid(ADMIN, `UPDATE sessions SET status = 'Canceled' WHERE id = $1`, [sid]);

  // L0: cancelled long before the audit trigger existed.
  await asSuper(`INSERT INTO sessions(id, class_id, date, start_time, end_time, status, teacher_id, canceled_at)
                 VALUES ($1, $2, '2025-01-06', '09:00', '10:00', 'Canceled', $3, '2025-01-05T00:00:00Z')`, [L.L0, C, TEACHER]);
  // L1: both children marked Present by the teacher, then cancelled.
  await lesson(L.L1, OLD.date); await mark(TEACHER, L.L1, S1, 'Present', TEACHER); await mark(TEACHER, L.L1, S2, 'Present', TEACHER); await cancelRaw(L.L1);
  // L2: only the automatic placeholder (marked_by NULL), then cancelled.
  await lesson(L.L2, OLD.date); await asSuper(`INSERT INTO attendance(session_id, student_id, status) VALUES ($1, $2, 'Present')`, [L.L2, S1]); await cancelRaw(L.L2);
  // L3: Present, corrected to Absent by the teacher, then cancelled.
  await lesson(L.L3, OLD2.date); await mark(TEACHER, L.L3, S1, 'Present', TEACHER); await mark(TEACHER, L.L3, S1, 'Absent', TEACHER); await cancelRaw(L.L3);
  // L4: Late, then cancelled; afterwards an admin sets the row Excused by hand (logged AFTER the cancel).
  await lesson(L.L4, OLD2.date); await mark(TEACHER, L.L4, S2, 'Late', TEACHER); await cancelRaw(L.L4);
  await asUid(ADMIN, `UPDATE attendance SET status = 'Excused', notes = 'tidy' WHERE session_id = $1`, [L.L4]);
  // L5: no register at all, but a participation point on the lesson; cancelled.
  await lesson(L.L5, OLD2.date);
  await asSuper(`INSERT INTO point_transactions(student_id, class_id, session_id, points, type, date, created_by) VALUES ($1, $2, $3, 5, 'participation', $4, $5)`,
    [S1, C, L.L5, OLD2.date, TEACHER]);
  await cancelRaw(L.L5);
  // L7: marked Present and NOT cancelled - not this script's business.
  await lesson(L.L7, OLD.date); await mark(TEACHER, L.L7, S1, 'Present', TEACHER);
  const ex = (await asSuper(`SELECT count(*)::int n FROM attendance WHERE session_id = ANY($1::uuid[]) AND status <> 'Excused'`, [[L.L1, L.L2, L.L3, L.L4]])).rows[0].n;
  ok('(fixture) every mark on the cancelled lessons now reads Excused', ex === 0, ex);
});

await section('the guard goes on; one cancel through it, one past it', async () => {
  await db.exec(sqlOf(migPath(D2)));
  await asSuper(`INSERT INTO sessions(id, class_id, date, start_time, end_time, status, teacher_id) VALUES ($1, $2, $3, '09:00', '10:00', 'Scheduled', $4)`, [L.L6, C, PAST.date, TEACHER]);
  await asUid(TEACHER, `INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1, $2, 'Present', $3)`, [L.L6, S1, TEACHER]);
  const p = (await as(ADMIN, 'authenticated', 'authenticated', 'SELECT public.session_change_preview($1, $2, NULL) r', [L.L6, 'cancel'])).rows[0].r;
  const r = (await as(ADMIN, 'authenticated', 'authenticated', 'SELECT public.cancel_session_checked($1,$2,$3,$4,$5,$6,$7::jsonb) r',
    [L.L6, 'cancel', 'Teacher is sick today, class off', p.token, true, p.tier === 3 ? 'Correction: the register was for another lesson' : null, '{}'])).rows[0].r;
  ok('(fixture) the checked cancel went through', (await asSuper(`SELECT status::text s FROM sessions WHERE id = $1`, [L.L6])).rows[0].s === 'Canceled', { p: p?.tier, r });
  let refused = null;
  await asSuper(`INSERT INTO sessions(id, class_id, date, start_time, end_time, status, teacher_id) VALUES ($1, $2, $3, '11:00', '12:00', 'Scheduled', $4)`, [L.L8, C, PAST.date, TEACHER]);
  await asUid(TEACHER, `INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1, $2, 'Present', $3)`, [L.L8, S2, TEACHER]);
  try { await asUid(ADMIN, `UPDATE sessions SET status = 'Canceled' WHERE id = $1`, [L.L8]); } catch (e) { refused = e.code; }
  ok('(fixture) a raw cancel is refused by the guard', !!refused, refused);
  // Past the guard: triggers off, as only the SQL editor can do; the audit row written by hand as the trigger would.
  await db.exec(`SET session_replication_role = replica`);
  await db.query(`UPDATE sessions SET status = 'Canceled' WHERE id = $1`, [L.L8]);
  await db.exec(`SET session_replication_role = origin`);
  await db.query(`INSERT INTO audit_log(entity, entity_id, operation, action, diff) VALUES ('sessions', $1, 'UPDATE', 'update',
    '{"old":{"status":"Scheduled"},"new":{"status":"Canceled"}}')`, [L.L8]);
});

let rows = [];
await section('the script, read-only', async () => {
  await db.exec('BEGIN READ ONLY');
  try { rows = (await db.query(SCRIPT)).rows; } finally { await db.exec('ROLLBACK'); }
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  ok('it runs inside a READ ONLY transaction and returns rows', rows.length > 0, rows.length);
  ok('no uuid in the output', !rows.some((r) => Object.values(r).some((v) => uuid.test(String(v)))));
});

const all = (period) => rows.find((r) => r.period === period && r.lesson_month === 'all months');
const n = (v) => Number(v ?? -1);
await section('what it counts', async () => {
  const b = all('before_guard'), c = all('checked'), u = all('unchecked_after_guard');
  console.log('    ', JSON.stringify(rows));
  ok('before the guard: 6 cancelled lessons (L0-L5)', n(b?.lessons) === 6, b);
  ok('  2 with a person\'s Present / Late before the cancel (L1 both children, L4 Late) - not L2 (placeholder), not L3 (corrected to Absent)',
     n(b?.person_marked_present) === 2 && n(b?.children_present) === 3, b);
  ok('  the admin\'s Excused AFTER the cancel does not hide L4\'s Late', n(b?.person_marked_present) === 2);
  ok('  4 with any logged mark (L1-L4); L0 cancelled before the audit trigger is counted as unknowable', n(b?.any_logged_mark) === 4 && n(b?.before_audit) === 1, b);
  ok('checked: the cancel through the guard, its stored evidence STRONG, the teacher\'s Present counted',
     n(c?.lessons) === 1 && n(c?.strong_at_cancel) === 1 && n(c?.person_marked_present) === 1, c);
  ok('unchecked_after_guard: the cancel that got past the guard is caught', n(u?.lessons) === 1 && n(u?.person_marked_present) === 1, u);
  ok('the never-cancelled lesson L7 is in no row', rows.reduce((s, r) => s + (r.lesson_month === 'all months' ? n(r.lessons) : 0), 0) === 8);
  // The D1 columns are exactly session_held_evidence lesson by lesson.
  const ev = (await asSuper(`SELECT s.id, public.session_held_evidence(s.id) e FROM sessions s WHERE s.status = 'Canceled'`)).rows;
  const want = { SOFT: ev.filter((x) => x.e.level === 'SOFT').length, STRONG: ev.filter((x) => x.e.level === 'STRONG').length };
  const got = { SOFT: rows.filter((r) => r.lesson_month === 'all months').reduce((s, r) => s + n(r.d1_soft_now), 0),
                STRONG: rows.filter((r) => r.lesson_month === 'all months').reduce((s, r) => s + n(r.d1_strong_now), 0) };
  ok(`d1_soft_now / d1_strong_now equal session_held_evidence lesson by lesson (${JSON.stringify(want)})`, got.SOFT === want.SOFT && got.STRONG === want.STRONG, { got, want });
  ok('  and the participation point on L5 still shows: at least one cancelled lesson is SOFT or STRONG now', want.SOFT + want.STRONG >= 1, want);
  // CHECK-money-invariants.sql M20-M22 pair an audited session change with its
  // checked row by time (both are now() of the same transaction). Proven here
  // on the real cancel_session_checked: the pair is found for L6, and for no other lesson.
  const paired = (await asSuper(`
    SELECT a.entity_id, EXISTS (SELECT 1 FROM session_cancel_overrides o
                                 WHERE o.session_id::text = a.entity_id AND o.action = 'cancel'
                                   AND o.created_at BETWEEN a.occurred_at - interval '2 seconds' AND a.occurred_at + interval '2 seconds') AS has_row,
           (SELECT o.created_at = a.occurred_at FROM session_cancel_overrides o WHERE o.session_id::text = a.entity_id LIMIT 1) AS same_instant
      FROM audit_log a
     WHERE a.entity = 'sessions' AND a.operation = 'UPDATE' AND a.diff -> 'new' ->> 'status' = 'Canceled'`)).rows;
  const l6 = paired.find((p) => p.entity_id === L.L6);
  ok('M20 pairing on the real guard: the checked cancel\'s audit row and its override share the same instant', l6?.has_row === true && l6?.same_instant === true, l6);
  ok('  and no raw cancel (L1-L5, L8) has a checked row', paired.filter((p) => p.entity_id !== L.L6).every((p) => !p.has_row), paired);
  const months = rows.filter((r) => r.period === 'before_guard' && r.lesson_month !== 'all months');
  ok('the per-month rows of a period add up to its total', months.reduce((s, r) => s + n(r.lessons), 0) === n(b?.lessons), months);
});

const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
