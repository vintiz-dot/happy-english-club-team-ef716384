// D4 step 3B review: the reviewer's probes (not a suite; run by hand).
//   node scripts/pgtest/review3b-probes.mjs
// Real migration files in pglite, the builder's prelude, nothing live.
// Each probe prints PROBE <id> <what happened>; "HOLE" marks a write that
// should have needed the checked path and did not.
import { randomUUID } from 'node:crypto';
import { harness, sqlOf } from './d4-prelude.mjs';
import { makeInputsDb } from './d4-inputs-prelude.mjs';

const BASE = [
  '20261009130000_audit_every_admin_action.sql', '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql', '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql', '20261106120000_invoice_tuition_freeze.sql', '20261114090000_d4_floors.sql',
  '20261114091000_d4_core_register.sql', '20261106100000_attendance_guard_no_auto_changes.sql',
  '20261106100001_date_aware_enrollment_changes.sql', '20261113120000_pause_enrollment_admin_only.sql',
  '20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql'];
const INPUTS = process.env.INPUTS_FILE ?? '20261114094000_d4_money_inputs_guard.sql';
let db = await makeInputsDb([...BASE, INPUTS]);
const H = harness(() => db);
const { as, tryIt, clock } = H;
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'teacher')`, [ADMIN, TEACHER]);
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const asTeacher = (sql, p) => as(TEACHER, 'authenticated', 'authenticated', sql, p);
const q1 = async (sql, p) => (await as(null, '', null, sql, p)).rows[0];
const show = (id, label, r) => console.log(`PROBE ${id} ${label}: ${r.ok !== undefined ? 'ALLOWED' : `refused ${r.code} ${(r.message ?? '').slice(0, 60)} ${(r.detail ?? '').slice(0, 80)}`}`);

const OLD = await clock(-40), OLDER = await clock(-75), NOW = await clock(0);
const cid = randomUUID();
await q1(`INSERT INTO classes(id, default_teacher_user, name, session_rate_vnd) VALUES ($1, gen_random_uuid(), 'c', 100000)`, [cid]);
const tid = (await q1(`INSERT INTO teachers(full_name, pay_rate_type, hourly_rate_vnd) VALUES ('t','hourly',200000) RETURNING id`)).id;
for (const w of [OLDER, OLD]) {
  await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Held',$3)`, [cid, w.date, tid]);
}
const fam = (await q1(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).id;
const a = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('a', $1) RETURNING id`, [fam])).id;
const b = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('b', $1) RETURNING id`, [fam])).id;
const lone = (await q1(`INSERT INTO students(full_name) VALUES ('lone') RETURNING id`)).id;
const inv = async (k, m, extra = '') => (await q1(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
  VALUES ($1,$2,'paid',540000,540000,540000,'confirmed',false) RETURNING id`, [k, m])).id;
await inv(a, OLD.month); await inv(b, OLD.month); await inv(lone, OLD.month);

// ---- P1 enrollments.created_at decides which of two overlapping rows prices a lesson
// (supabase/functions/_lib/enrollment-discounts.ts:15, calculate-tuition/index.ts:127,171)
const e1 = (await q1(`INSERT INTO enrollments(class_id, student_id, start_date, created_at) VALUES ($1,$2,'2025-01-01', now() - interval '2 days') RETURNING id`, [cid, a])).id;
const e2 = (await q1(`INSERT INTO enrollments(class_id, student_id, start_date, rate_override_vnd, created_at) VALUES ($1,$2,'2025-01-01', 10000, now() - interval '1 day') RETURNING id`, [cid, a])).id;
show('P1a', 'admin swaps created_at of two overlapping enrolments (past confirmed + paid month)',
  await tryIt(() => asAdmin(`UPDATE enrollments SET created_at = now() - interval '3 days' WHERE id = $1`, [e2])));
show('P1b', 'admin changes rate_override_vnd on the same row (control)',
  await tryIt(() => asAdmin(`UPDATE enrollments SET rate_override_vnd = 20000 WHERE id = $1`, [e2])));
show('P1c', 'service role swaps created_at', await tryIt(() => asService(`UPDATE enrollments SET created_at = now() - interval '4 days' WHERE id = $1`, [e1])));

// ---- P2 a frozen bill can be deleted or re-keyed without the unfreeze path
const fz = (await q1(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
  VALUES ($1,$2,'issued',400000,400000,0,'auto_approved',true) RETURNING id`, [a, OLDER.month])).id;
show('P2a', 'admin UPDATE tuition_frozen=false (control)', await tryIt(() => asAdmin(`UPDATE invoices SET tuition_frozen = false WHERE id=$1`, [fz])));
show('P2b', 'admin re-keys a frozen bill to another month', await tryIt(() => asAdmin(`UPDATE invoices SET month = '2001-01' WHERE id=$1`, [fz])));
console.log('       after P2b: bill for', OLDER.month, '=', JSON.stringify((await q1(`SELECT count(*)::int n FROM invoices WHERE student_id=$1 AND month=$2`, [a, OLDER.month]))));
show('P2c', 'service inserts a fresh unfrozen bill for that month (what calculate-tuition does next)',
  await tryIt(() => asService(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
     VALUES ($1,$2,'issued',999000,999000,0,'auto_approved',false)`, [a, OLDER.month])));
const fz2 = (await q1(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
  VALUES ($1,'2001-02','issued',400000,400000,0,'auto_approved',true) RETURNING id`, [b])).id;
show('P2d', 'admin DELETEs a frozen bill', await tryIt(() => asAdmin(`DELETE FROM invoices WHERE id=$1`, [fz2])));
show('P2e', 'admin sets tuition_frozen = NULL (column is NOT NULL: control)', await tryIt(() => asAdmin(`UPDATE invoices SET tuition_frozen = NULL WHERE id=$1`, [fz])));

// ---- P3 link-student-user: service role links a child with billed past months to a NEW, empty family
const nf = (await q1(`INSERT INTO families(name) VALUES ('new') RETURNING id`)).id;
await q1(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cid, lone]);
show('P3', 'service role: students.family_id NULL -> a new family with no other child (link-student-user:365)',
  await tryIt(() => asService(`UPDATE students SET family_id=$1 WHERE id=$2`, [nf, lone])));
show('P3b', 'admin: the same', await tryIt(() => asAdmin(`UPDATE students SET family_id=$1 WHERE id=$2`, [nf, lone])));

// ---- P4 sibling counting reads is_active (compute-sibling-discounts:42,179,196; projected-per-class:9)
show('P4a', 'admin deactivates a family (families.is_active) with confirmed past months',
  await tryIt(() => asAdmin(`UPDATE families SET is_active=false WHERE id=$1`, [fam])));
await q1(`UPDATE families SET is_active=true WHERE id=$1`, [fam]);

// ---- P5 change_enrollment_terms, direct
show('P5a', 'teacher calls change_enrollment_terms', await tryIt(() => asTeacher(`SELECT change_enrollment_terms($1, '{"rate_override_vnd":1}', $2)`, [e1, NOW.date])));
show('P5b', 'service calls change_enrollment_terms', await tryIt(() => asService(`SELECT change_enrollment_terms($1, '{"rate_override_vnd":1}', $2)`, [e1, NOW.date])));
show('P5c', 'admin calls change_enrollment_terms backdated into the paid month',
  await tryIt(() => asAdmin(`SELECT change_enrollment_terms($1, '{"rate_override_vnd":1}', $2)`, [e1, OLD.date])));
show('P5d', 'admin calls change_enrollment_terms from today (T0)',
  await tryIt(() => asAdmin(`SELECT change_enrollment_terms($1, '{"rate_override_vnd":1}', $2)`, [e1, NOW.date])));
console.log('       overrides written by P5d:', JSON.stringify(await q1(`SELECT count(*)::int n FROM money_change_overrides`)),
  'audit rows:', JSON.stringify(await q1(`SELECT count(*)::int n FROM audit_log WHERE action='change_terms'`)));

// ---- P6 the acknowledgement covers the whole family, any class named in it
{
  const id = randomUUID();
  const ins = `INSERT INTO money_change_overrides (id, actor_user_id, entity, op, target_id, student_ids, reach_from, reach_to, via,
      tier, correction_mode, reason, correction_reason, confirmed, token, row_before, change, reach, invoices_before, refresh_pairs, impact, review_required)
    VALUES ('${id}', '${ADMIN}', 'enrollment', 'enroll', '${a}', '{${a},${b}}', '1900-01-01', '9999-12-31', 'single', 3, true,
      'a reason long enough to pass', 'a correction reason too', true, 't', '[]', '{"class_ids":["${cid}"]}', '{}', '[]', '[]', '{}', false)`;
  let r;
  try {
    await db.exec(`BEGIN; ${ins}; SELECT set_config('hec.money_change_ack', '${id}', true), set_config('test.uid', '${ADMIN}', true),
      set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated;
      INSERT INTO enrollments(class_id, student_id, start_date) VALUES ('${cid}', '${b}', '2025-02-01'); ROLLBACK;`);
    r = { ok: true };
  } catch (e) { await db.exec('ROLLBACK').catch(() => {}); r = { code: e.code, message: e.message }; }
  await db.exec('RESET ROLE').catch(() => {});
  show('P6', "an 'enroll' acknowledgement for child A covers an insert for sibling B (defence in depth only)", r);
}

// ---- P7 a direct end_enrollment / pause by an admin, backdated into the paid month
show('P7a', 'admin end_enrollment backdated', await tryIt(() => asAdmin(`SELECT end_enrollment($1,$2,$3)`, [b, cid, OLDER.date])));
await q1(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cid, b]);
show('P7b', 'admin end_enrollment backdated (b enrolled)', await tryIt(() => asAdmin(`SELECT end_enrollment($1,$2,$3)`, [b, cid, OLDER.date])));

console.log('done');
await db.close();
