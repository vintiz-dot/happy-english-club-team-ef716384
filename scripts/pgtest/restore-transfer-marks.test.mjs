// Putting back the attendance marks that a class transfer deleted
// (supabase/migrations/20261123110000_restore_transfer_deleted_marks.sql).
//
// Until 6 Nov 2026 modify_enrollment_transfer deleted ALL of a child's marks in
// the class they left, past lessons included, and nobody put them back. A
// lesson with no mark is not billed, so the next recalculation of that month
// lowers the bill. The function under test finds those lessons ("holes") and,
// per child and month, restores them as Present only when the register then
// prices the month at exactly the bill saved at the time.
//
// What this suite holds (R1-R9 of the brief):
//   R1  the damage is reproduced with the OLD function body (20251023141128):
//       marks before, a transfer, no marks after, an audit row written.
//   R2  a dry run writes nothing and reports what the real run then restores.
//   R3  a month whose bill equals every lesson restored -> restore, marks back
//       as Present with the note; tuition_bill_expected now equals the bill.
//   R4  one lesson that had been Excused; a bill already recalculated to 0; a
//       frozen bill at 0; no bill at all -> decide, nothing written.
//   R5  p_force restores a decide month in full; a force with no holes is
//       reported, not an error.
//   R6  a second run restores 0; an existing mark is untouched; cancelled
//       lessons, lessons after the transfer, lessons off the child's allowed
//       days, lessons not yet past, and a child never transferred: not restored.
//   R7  a transfer made after the fix (or one that deleted nothing) is ignored;
//       a child transferred twice out of one class is handled once per lesson.
//   R8  not executable by authenticated or anon; an audit row only from a real run.
//   R9  no streak, point or notification row appears; and every trigger any
//       migration puts on attendance is a BEFORE trigger (a streak or a point
//       would come from an AFTER one).
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const MIGS = join(repo, 'supabase', 'migrations');
const mig = (name) => readFileSync(join(MIGS, name), 'utf8');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1);
const CA = U(31), CB = U(32);
const S = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`S${i + 1}`, U(101 + i)]));
const FUNC = 'public.admin_restore_transfer_deleted_marks';

// ----------------------------------------------------------------- schema
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL, is_active boolean DEFAULT true);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text, session_rate_vnd integer NOT NULL DEFAULT 0);
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, date date NOT NULL, status public.session_status NOT NULL);
  CREATE TABLE public.attendance(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, student_id uuid,
    status text NOT NULL DEFAULT 'Present' CHECK (status IN ('Present','Absent','Excused','Late')),
    marked_by uuid, marked_at timestamptz NOT NULL DEFAULT now(), notes text,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    UNIQUE (session_id, student_id));
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, start_date date NOT NULL, end_date date,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), created_by uuid, updated_by uuid,
    allowed_days integer[], rate_override_vnd integer);
  CREATE TABLE public.class_fee_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, effective_from date, session_rate_vnd integer);
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    paid_amount integer NOT NULL DEFAULT 0, recorded_payment integer DEFAULT 0,
    confirmation_status text DEFAULT 'auto_approved', tuition_frozen boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    UNIQUE (student_id, month));
  CREATE TABLE public.audit_log(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL, entity text NOT NULL,
    entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  -- Stand-ins for what a streak, a point or a notification would write to (R9).
  CREATE TABLE public.student_attendance_streaks(student_id uuid, n integer);
  CREATE TABLE public.point_transactions(student_id uuid, points integer);
  CREATE TABLE public.notifications(user_id uuid, body text);
  CREATE TABLE public.schedule_runner(id integer PRIMARY KEY, token text NOT NULL);
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);

// The triggers that really sit on attendance and that fit this small database:
// no Present or Late on a cancelled lesson, and the enrolment guard.
for (const f of ['20261027090000_cancelled_lesson_attendance_guard.sql', '20261106090000_attendance_enrollment_guard.sql', '20261106100000_attendance_guard_no_auto_changes.sql']) {
  await db.exec(mig(f));
}
await db.exec(mig('20261123090000_tuition_bill_check.sql'));
const MIG = mig('20261123110000_restore_transfer_deleted_marks.sql');
ok('the migration installs', (await tryIt(() => db.exec(MIG))) === null);
ok('it installs twice', (await tryIt(() => db.exec(MIG))) === null);
ok('the preflight refuses without tuition_bill_expected', await (async () => {
  const d2 = new PGlite();
  await d2.exec(`CREATE TABLE public.audit_log(id int); CREATE TABLE public.attendance(id int);`);
  const e = await tryIt(() => d2.exec(MIG));
  return !!e && /tuition_bill_expected/.test(e.message);
})());

// --------------------------------------------------------------- fixtures
const sessionId = {};
const sess = async (cls, date, status = 'Held') => {
  const r = await db.query(`INSERT INTO public.sessions(class_id, date, status) VALUES ($1, $2, $3) RETURNING id`, [cls, date, status]);
  sessionId[`${cls === CA ? 'A' : 'B'}|${date}`] = r.rows[0].id; return r.rows[0].id;
};
const A = (date) => sessionId[`A|${date}`];
const enrol = (k, cls, from, to = null, allowed = null) => db.query(
  `INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, allowed_days, created_at) VALUES ($1, $2, $3, $4, $5, '2026-01-01T00:00:00Z')`,
  [S[k], cls, from, to, allowed]);
const mark = (k, date, status, by = null) => db.query(
  `INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1, $2, $3, $4)`, [A(date), S[k], status, by]);
const bill = (k, month, base, paid = 0, frozen = false) => db.query(
  `INSERT INTO public.invoices(student_id, month, base_amount, total_amount, recorded_payment, tuition_frozen, status) VALUES ($1, $2, $3, $3, $4, $5, 'issued')`,
  [S[k], month, base, paid, frozen]);

await db.query(`INSERT INTO public.classes VALUES ($1, 'Old Class', 210000), ($2, 'New Class', 260000)`, [CA, CB]);
const names = { S1: 'Right Bill', S2: 'One Excused', S3: 'Bill Went To Zero', S4: 'Frozen At Zero', S5: 'No Bill', S6: 'Spare', S7: 'Teacher Absent',
  S8: 'Mondays Only', S9: 'Future Transfer', S10: 'Never Transferred', S11: 'Transferred After Fix', S12: 'Deleted Nothing', S13: 'Transferred Twice' };
for (const [k, n] of Object.entries(names)) await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [S[k], n]);

// Old Class lessons. 3 and 10 August 2026 are Mondays, 5 and 12 Wednesdays.
for (const d of ['2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12', '2026-09-07', '2026-09-16', '2098-12-30']) await sess(CA, d);
await sess(CA, '2026-08-17', 'Canceled');

// Children who are transferred with the real OLD function (R1).
for (const k of ['S1', 'S2', 'S3', 'S4', 'S5', 'S7', 'S8', 'S13']) await enrol(k, CA, '2026-01-01', null, k === 'S8' ? [1] : null);
for (const k of ['S1', 'S3', 'S4', 'S5', 'S7', 'S8']) for (const d of ['2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12']) await mark(k, d, 'Present', k === 'S7' ? ADMIN : null);
for (const d of ['2026-08-03', '2026-08-05', '2026-08-10']) await mark('S2', d, 'Present');
await mark('S2', '2026-08-12', 'Excused');
for (const d of ['2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12']) await mark('S13', d, 'Present');

const OLD_FN = mig('20251023141128_a50f5fd3-fcf8-4395-b2db-1d118133bee5.sql');
await db.exec(OLD_FN);
const count = async (sql, p = []) => Number((await db.query(sql, p)).rows[0].n);
const marksOf = (k) => count(`SELECT count(*) n FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id WHERE a.student_id = $1 AND s.class_id = '${CA}'`, [S[k]]);

console.log('\nR1. the damage, with the old function body');
{
  const before = await marksOf('S1');
  await db.query(`SELECT set_config('test.uid', $1, false)`, [ADMIN]);
  for (const k of ['S1', 'S2', 'S3', 'S4', 'S5', 'S7', 'S8']) await db.query(`SELECT public.modify_enrollment_transfer($1, $2, $3, '2026-09-01')`, [S[k], CA, CB]);
  const after = await marksOf('S1');
  ok('marks before the transfer', before === 4, before);
  ok('no marks after the transfer', after === 0, after);
  ok('S2 and S3 lost theirs too', (await marksOf('S2')) === 0 && (await marksOf('S3')) === 0);
  const a = await db.query(`SELECT diff FROM public.audit_log WHERE entity = 'enrollment' AND action = 'transfer' AND entity_id = (SELECT id::text FROM public.enrollments WHERE student_id = $1 AND class_id = $2)`, [S.S1, CA]);
  ok('an audit row was written with deleted_attendance = 4', a.rows.length === 1 && a.rows[0].diff.deleted_attendance === 4 && a.rows[0].diff.old_class_id === CA, a.rows);

  // S13 goes A -> B -> A -> B: the same class is left twice.
  await db.query(`SELECT public.modify_enrollment_transfer($1, $2, $3, '2026-09-01')`, [S.S13, CA, CB]);
  await db.query(`SELECT public.modify_enrollment_transfer($1, $2, $3, '2026-09-15')`, [S.S13, CB, CA]);
  ok('S13 was seeded into the Old Class lesson of 16 Sept', (await count(`SELECT count(*) n FROM public.attendance WHERE student_id = $1 AND session_id = $2`, [S.S13, A('2026-09-16')])) === 1);
  await db.query(`SELECT public.modify_enrollment_transfer($1, $2, $3, '2026-10-01')`, [S.S13, CA, CB]);
  ok('and lost it again', (await marksOf('S13')) === 0);
  await db.query(`SELECT set_config('test.uid', '', false)`);
  // The old function logged them just now; put them before the fix.
  await db.query(`UPDATE public.audit_log SET occurred_at = '2026-10-15T05:00:00Z' WHERE action = 'transfer'`);
}

// Manual cases: transfers the old function would have logged.
const logTransfer = (k, cls, eff, deleted, at) => db.query(
  `INSERT INTO public.audit_log(action, entity, entity_id, diff, occurred_at)
   VALUES ('transfer', 'enrollment', (SELECT id::text FROM public.enrollments WHERE student_id = $1 AND class_id = $2 ORDER BY start_date LIMIT 1), $3::jsonb, $4)`,
  [S[k], cls, JSON.stringify({ old_class_id: cls, new_class_id: CB, effective_date: eff, deleted_attendance: deleted, seeded_attendance: 0 }), at]);
// S9: the transfer is dated far ahead; its lesson is Held but not yet past.
await enrol('S9', CA, '2098-01-01', '2098-12-31'); await logTransfer('S9', CA, '2099-01-01', 3, '2026-10-01T00:00:00Z');
// S10: never transferred; no marks either.
await enrol('S10', CA, '2026-01-01');
// S11: transferred after the fix (7 Nov). S12: a transfer that deleted nothing.
await enrol('S11', CA, '2026-01-01', '2026-08-31'); await logTransfer('S11', CA, '2026-09-01', 5, '2026-11-07T01:00:00Z');
await enrol('S12', CA, '2026-01-01', '2026-08-31'); await logTransfer('S12', CA, '2026-09-01', 0, '2026-10-01T00:00:00Z');
// S7's teacher marked 10 August Absent after the transfer.
await mark('S7', '2026-08-10', 'Absent', ADMIN);

// The bills saved at the time.
await bill('S1', '2026-08', 840000);
await bill('S2', '2026-08', 630000);       // the 12th was Excused
await bill('S3', '2026-08', 0, 840000);    // recalculated to 0 although 840,000 was paid
await bill('S4', '2026-08', 0, 0, true);   // frozen at 0
await bill('S7', '2026-08', 840000);       // 3 Present + the teacher's Absent
await bill('S8', '2026-08', 420000);       // Mondays only: the 3rd and the 10th
await bill('S13', '2026-08', 840000);
await bill('S13', '2026-09', 210000);
// S5 has no bill at all.

const snapshot = async () => ({
  attendance: (await db.query(`SELECT md5(string_agg(a.id::text || a.status::text || coalesce(a.marked_by::text, '') || coalesce(a.notes, ''), ',' ORDER BY a.id)) h, count(*)::int n FROM public.attendance a`)).rows[0],
  audit: await count(`SELECT count(*) n FROM public.audit_log`),
  invoices: (await db.query(`SELECT md5(string_agg(i.id::text || i.base_amount::text || i.total_amount::text || i.recorded_payment::text || i.updated_at::text, ',' ORDER BY i.id)) h FROM public.invoices i`)).rows[0].h,
  side: [await count(`SELECT count(*) n FROM public.student_attendance_streaks`), await count(`SELECT count(*) n FROM public.point_transactions`), await count(`SELECT count(*) n FROM public.notifications`)],
});
const run = async (dry, force = []) => (await db.query(`SELECT ${FUNC}($1, $2::jsonb) AS r`, [dry, JSON.stringify(force)])).rows[0].r;
const cm = (res, k, month) => res.child_months.find((x) => x.student_id === S[k] && x.month === month);
const verdicts = (res) => res.child_months.map((x) => `${x.student_id}|${x.month}|${x.verdict}|${x.holes}`).sort();

console.log('\nThe read-only check (scripts/CHECK-transfer-deleted-attendance.sql), run before the migration is used');
{
  const q = readFileSync(join(repo, 'scripts', 'CHECK-transfer-deleted-attendance.sql'), 'utf8');
  const before = await snapshot();
  const rows = (await db.query(q)).rows;
  const after = await snapshot();
  const total = rows[rows.length - 1];
  const by = (k, month) => rows.find((r) => r.student === names[k] && r.month === month);
  ok('it writes nothing', JSON.stringify(before) === JSON.stringify(after));
  ok('one row per child-month plus a TOTAL row: 9 + 1', rows.length === 10 && /^TOTAL \(8 children, 9 child-months\)/.test(total.student), rows.map((r) => r.student));
  ok('TOTAL counts 30 holes', Number(total.holes) === 30, total);
  ok('first guesses: S1, S7, S8, S13 likely restore; S2, S3, S4 decide; S5 no bill',
    ['S1', 'S7', 'S8'].every((k) => by(k, '2026-08').first_guess === 'likely restore') && by('S13', '2026-08').first_guess === 'likely restore' && by('S13', '2026-09').first_guess === 'likely restore'
    && ['S2', 'S3', 'S4'].every((k) => by(k, '2026-08').first_guess === 'decide') && by('S5', '2026-08').first_guess === 'no bill', rows.map((r) => [r.student, r.first_guess]));
  ok('a row shows holes, their worth, the saved bill and the payment', by('S3', '2026-08').holes == 4 && Number(by('S3', '2026-08').holes_worth) === 840000 && Number(by('S3', '2026-08').saved_base) === 0 && Number(by('S3', '2026-08').recorded_payment) === 840000 && by('S4', '2026-08').frozen === true);
  ok('the file calls no function of ours', !/public\.|_restore_marks_holes|tuition_bill_expected|admin_restore/.test(q.replace(/--[^\n]*/g, '')));
}

console.log('\nR2. the dry run writes nothing and tells what a real run will do');
const snap0 = await snapshot();
const dry = await run(true);
const snap1 = await snapshot();
ok('the default is a dry run', (await db.query(`SELECT ${FUNC}() AS r`)).rows[0].r.dry_run === true);
ok('dry run: attendance identical (hash and count)', snap0.attendance.h === snap1.attendance.h && snap0.attendance.n === snap1.attendance.n, [snap0.attendance, snap1.attendance]);
ok('dry run: audit_log, invoices and the side tables identical', snap0.audit === snap1.audit && snap0.invoices === snap1.invoices && JSON.stringify(snap0.side) === JSON.stringify(snap1.side));
ok('dry run says dry_run = true and counts 10 qualifying transfers', dry.dry_run === true && dry.transfers === 10, [dry.dry_run, dry.transfers]);
ok('30 holes in 9 child-months', dry.holes === 30 && dry.child_months.length === 9, [dry.holes, dry.child_months.length]);
ok('14 marks in 5 child-months to restore, 4 to decide', dry.restored === 14 && dry.child_months_restored === 5 && dry.child_months_to_decide === 4, dry);
ok('the dry run says what the owner does next', dry.next_steps.length >= 3 && dry.next_steps.some((s) => /dry run/i.test(s)) && dry.next_steps.some((s) => /Finance > Tuition/.test(s)) && dry.next_steps.some((s) => /decision/.test(s)), dry.next_steps);

console.log('\nR3. a month the bill counts in full is restored');
const real = await run(false);
const snap2 = await snapshot();
ok('the real run reports the same child-months and verdicts as the dry run', JSON.stringify(verdicts(real)) === JSON.stringify(verdicts(dry)));
ok('real run: dry_run false, restored 14', real.dry_run === false && real.restored === 14, real);
const s1 = cm(real, 'S1', '2026-08');
ok('S1 August: restore, 4 holes, saved 840,000 = register 840,000', s1.verdict === 'restore' && s1.holes === 4 && s1.saved_base === 840000 && s1.register_base_if_restored === 840000, s1);
ok('S1 now has 4 marks, all Present, signed by nobody, with the note', (await db.query(`SELECT status::text st, marked_by, notes FROM public.attendance WHERE student_id = $1`, [S.S1])).rows
  .every((r) => r.st === 'Present' && r.marked_by === null && r.notes === `Restored ${new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)}: deleted by the class transfer of 2026-09-01; the bill charged at the time counts these lessons.`));
ok('the register now prices S1 at exactly the saved bill', Number((await db.query(`SELECT expected_base FROM public.tuition_bill_expected('2026-08') WHERE student_id = $1`, [S.S1])).rows[0].expected_base) === 840000);
ok('the class name and student name are in the row', s1.class_name === 'Old Class' && s1.student_name === 'Right Bill' && s1.frozen === false && s1.recorded_payment === 0);
ok('the bill itself was not touched', snap2.invoices === snap0.invoices);
ok('exactly one audit row for the real run, none from the dry run', (await count(`SELECT count(*) n FROM public.audit_log WHERE action = 'restore_transfer_deleted_marks'`)) === 1);
const au = (await db.query(`SELECT entity, diff FROM public.audit_log WHERE action = 'restore_transfer_deleted_marks'`)).rows[0];
ok('the audit row is on entity attendance with the counts and the list', au.entity === 'attendance' && au.diff.restored === 14 && au.diff.holes === 30 && au.diff.child_months.length === 9, au);

console.log('\nR4. months that do not match are left to the owner');
{
  const s2 = cm(real, 'S2', '2026-08');
  ok('S2 (one lesson was Excused): decide, register 840,000 against a bill of 630,000', s2.verdict === 'decide' && s2.saved_base === 630000 && s2.register_base_if_restored === 840000, s2);
  ok('its reason is in plain words and names Excused', /630,000/.test(s2.reason) && /840,000/.test(s2.reason) && /Excused/.test(s2.reason), s2.reason);
  ok('nothing was written for S2', (await marksOf('S2')) === 0);
  const s3 = cm(real, 'S3', '2026-08');
  ok('S3 (bill recalculated to 0): decide, with the payment and the sentence', s3.verdict === 'decide' && s3.saved_base === 0 && s3.recorded_payment === 840000
    && s3.reason === 'The bill was already recalculated to 0; 840,000 was paid for this month.', s3);
  const s4 = cm(real, 'S4', '2026-08');
  ok('S4 (frozen at 0): decide, frozen reported', s4.verdict === 'decide' && s4.frozen === true && /frozen/.test(s4.reason), s4);
  const s5 = cm(real, 'S5', '2026-08');
  ok('S5 (no bill): decide, nothing to compare', s5.verdict === 'decide' && s5.saved_base === null && /no bill/i.test(s5.reason) && s5.register_base_if_restored === 840000, s5);
  ok('nothing was written for S3, S4, S5', (await marksOf('S3')) + (await marksOf('S4')) + (await marksOf('S5')) === 0);
  ok('the real run points to the months that need a decision', real.next_steps.some((st) => /4 child-months need your decision/.test(st) && /2026-08/.test(st)), real.next_steps);
}

console.log('\nR6. what is not restored, and a second run');
{
  const s7 = cm(real, 'S7', '2026-08');
  ok('S7: 3 holes (the teacher\'s Absent is not one), restored', s7.verdict === 'restore' && s7.holes === 3, s7);
  const rows7 = (await db.query(`SELECT s.date::text d, a.status::text st, a.marked_by FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id WHERE a.student_id = $1 ORDER BY s.date`, [S.S7])).rows;
  ok('the teacher-made Absent is still Absent and still signed', rows7.find((r) => r.d === '2026-08-10')?.st === 'Absent' && rows7.find((r) => r.d === '2026-08-10')?.marked_by === ADMIN, rows7);
  const s8 = cm(real, 'S8', '2026-08');
  const rows8 = (await db.query(`SELECT s.date::text d FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id WHERE a.student_id = $1 AND s.class_id = '${CA}' ORDER BY s.date`, [S.S8])).rows.map((r) => r.d);
  ok('S8 (Mondays only): only the two Mondays came back, not the Wednesdays', s8.verdict === 'restore' && s8.holes === 2 && JSON.stringify(rows8) === JSON.stringify(['2026-08-03', '2026-08-10']), [s8, rows8]);
  const allRestored = (await db.query(`SELECT s.date::text d, s.status::text st, a.student_id FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id WHERE a.notes LIKE 'Restored %'`)).rows;
  ok('no lesson of the cancelled day, after the transfer, or not yet past was restored', allRestored.every((r) => !['2026-08-17', '2026-09-07', '2098-12-30'].includes(r.d) && r.st === 'Held'), allRestored.map((r) => r.d));
  ok('S9 (lesson Held but dated after today), S10 (never transferred), S11 (after the fix), S12 (deleted nothing): no marks, not in the list',
    [S.S9, S.S10, S.S11, S.S12].every((id) => !real.child_months.some((x) => x.student_id === id)
      ) && (await count(`SELECT count(*) n FROM public.attendance WHERE student_id = ANY($1::uuid[])`, [[S.S9, S.S10, S.S11, S.S12]])) === 0);
  const snap3 = await snapshot();
  const second = await run(false);
  const snap4 = await snapshot();
  ok('a second real run restores 0', second.restored === 0 && second.child_months_restored === 0, second);
  ok('and the only thing it adds is its own audit row', snap4.attendance.h === snap3.attendance.h && snap4.audit === snap3.audit + 1);
  ok('the four undecided child-months are still listed with no new marks', second.child_months.length === 4 && second.child_months.every((x) => x.verdict === 'decide') && second.holes === 16, second);
}

console.log('\nR7. a child transferred twice out of one class');
{
  const a = cm(real, 'S13', '2026-08'), b = cm(real, 'S13', '2026-09');
  ok('S13: August 4 holes and September 1, each restored once', a?.holes === 4 && a.verdict === 'restore' && b?.holes === 1 && b.verdict === 'restore', [a, b]);
  ok('S13 has exactly 5 marks in the Old Class (the 7 Sept lesson is outside any enrolment)', (await marksOf('S13')) === 5);
  ok('the transfer after the fix (S11) and the one that deleted nothing (S12) were not counted', real.transfers === 10);
}

console.log('\nR5. p_force restores a decided month in full; a pointless force is reported');
{
  const forced = await run(false, [{ student_id: S.S2, month: '2026-08' }, { student_id: S.S1, month: '2026-07' }, { student_id: S.S5, month: '2026-08' }]);
  const s2 = cm(forced, 'S2', '2026-08');
  ok('S2 is restored although it does not match', s2.verdict === 'restore' && s2.forced === true && s2.holes === 4 && (await marksOf('S2')) === 4, s2);
  ok('its marks are Present with the note', (await db.query(`SELECT notes FROM public.attendance WHERE student_id = $1`, [S.S2])).rows.every((r) => /^Restored \d{4}-\d{2}-\d{2}: deleted by the class transfer of 2026-09-01;/.test(r.notes)));
  ok('S5 (no bill) is restored too, by choice', cm(forced, 'S5', '2026-08').verdict === 'restore' && (await marksOf('S5')) === 4);
  ok('S3 and S4, not named, are still left alone', cm(forced, 'S3', '2026-08').verdict === 'decide' && (await marksOf('S3')) === 0 && (await marksOf('S4')) === 0);
  ok('a force with no holes is reported, not an error', forced.force_ignored.length === 1 && forced.force_ignored[0].student_id === S.S1 && forced.force_ignored[0].month === '2026-07'
    && forced.next_steps.some((s) => /have no missing marks/.test(s)), forced.force_ignored);
  const bad = await tryIt(() => db.query(`SELECT ${FUNC}(true, '{"a":1}'::jsonb)`));
  ok('a force that is not a list is refused in words', !!bad && /list/.test(bad.message), bad);
  ok('the bills were never touched by any run', (await snapshot()).invoices === snap0.invoices);
}

console.log('\nR8. who may run it, and what is logged');
{
  for (const role of ['authenticated', 'anon', 'service_role']) {
    await db.exec(`SET ROLE ${role}`);
    const e = await tryIt(() => db.query(`SELECT ${FUNC}(true)`));
    await db.exec('RESET ROLE');
    ok(`${role} cannot run it`, !!e && /permission denied/i.test(e.message), e);
  }
  const dry = await (async () => { const before = await count(`SELECT count(*) n FROM public.audit_log WHERE action = 'restore_transfer_deleted_marks'`); await run(true); return (await count(`SELECT count(*) n FROM public.audit_log WHERE action = 'restore_transfer_deleted_marks'`)) - before; })();
  ok('a dry run adds no audit row', dry === 0);
  const helper = await tryIt(async () => { await db.exec('SET ROLE authenticated'); try { await db.query(`SELECT * FROM public._restore_marks_holes()`); } finally { await db.exec('RESET ROLE'); } });
  ok('the helper is closed to the app too', !!helper && /permission denied/i.test(helper.message), helper);
  // An app account that somehow held EXECUTE is still refused unless an admin.
  await db.exec(`GRANT EXECUTE ON FUNCTION ${FUNC}(boolean, jsonb) TO authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [U(9)]);
  await db.exec('SET ROLE authenticated');
  const nonAdmin = await tryIt(() => db.query(`SELECT ${FUNC}(true)`));
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('test.uid', '', false)`);
  await db.exec(`REVOKE EXECUTE ON FUNCTION ${FUNC}(boolean, jsonb) FROM authenticated`);
  ok('a signed-in non-admin is refused by the function itself', !!nonAdmin && nonAdmin.code === '42501', nonAdmin);
}

console.log('\nR9. nothing is awarded, counted or sent');
{
  const side = [await count(`SELECT count(*) n FROM public.student_attendance_streaks`), await count(`SELECT count(*) n FROM public.point_transactions`), await count(`SELECT count(*) n FROM public.notifications`)];
  ok('no streak, point or notification row exists after the restores', side.every((n) => n === 0), side);
  const found = [];
  for (const f of readdirSync(MIGS).filter((n) => n.endsWith('.sql'))) {
    const s = readFileSync(join(MIGS, f), 'utf8');
    for (const m of s.matchAll(/create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+(\w+)([^;]*?)\bon\s+(?:public\.)?attendance\b/gis)) found.push({ f, name: m[1], timing: /\bbefore\b/i.test(m[2]) ? 'BEFORE' : /\bafter\b/i.test(m[2]) ? 'AFTER' : /\binstead\b/i.test(m[2]) ? 'INSTEAD' : '?' });
  }
  ok('every trigger any migration puts on attendance is a BEFORE trigger (none can award or notify afterwards)', found.length >= 5 && found.every((t) => t.timing === 'BEFORE'), found.filter((t) => t.timing !== 'BEFORE'));
  const live = (await db.query(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.attendance'::regclass AND NOT tgisinternal ORDER BY 1`)).rows.map((r) => r.tgname);
  ok('the triggers loaded into this test database all let the restored rows in', live.length >= 1, live);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
