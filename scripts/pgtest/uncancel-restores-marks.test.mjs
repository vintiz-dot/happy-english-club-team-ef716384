// Un-cancelling a lesson puts the register marks back
// (supabase/migrations/20261123120000_uncancel_restores_marks.sql).
//
// Cancelling a lesson sets every mark to Excused. Un-cancelling brought the lesson
// back and left the marks Excused, so a taught lesson was not billed. This suite holds:
//   C1  cancel then un-cancel: Present (teacher), Late, Absent, Excused (teacher) and a
//       Present placeholder come back exactly; marked_by, marked_at and notes untouched;
//       the snapshot rows are gone. The cancel and un-cancel are the status UPDATEs the
//       checked RPCs (cancel_session_checked / uncancel_session_checked) perform, in the
//       main database; C1r runs the real RPCs on the real session-cancel-guard stack.
//   C2  while cancelled every row is Excused and the guard still refuses another status.
//   C3  cancel, un-cancel, a teacher changes a mark, cancel, un-cancel: the changed one returns.
//   C4  a lesson cancelled BEFORE this migration (no snapshot), un-cancelled after it.
//   C5  a person cannot re-mark while cancelled (guard); a row re-marked after an old
//       un-cancel, and one a person had made Excused before the cancel, are not candidates.
//   C6  the admin function: dry run writes nothing; restore / decide; p_force; a second run
//       restores 0; a past Scheduled lesson is reported; who may run it; audit rows.
//   C7  an un-cancel never fails because of the restore (a failing mark, a failing clean-up).
//   C8  C1 and C3 again with 20261123100000_attendance_proof.sql loaded as well.
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
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
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: String(e.message) }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2);
const CA = U(31);
const TEACH_ID = U(41);
const K = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`K${i + 1}`, U(101 + i)]));
const FUNC = 'public.admin_restore_uncancelled_marks';
const todayHanoi = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
  CREATE TABLE public.teachers(id uuid PRIMARY KEY, full_name text, user_id uuid);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text NOT NULL, default_teacher_id uuid, session_rate_vnd integer NOT NULL DEFAULT 0);
  CREATE TABLE public.students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, linked_user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    start_date date NOT NULL, end_date date, allowed_days integer[], created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid, updated_by uuid, updated_at timestamptz DEFAULT now(), rate_override_vnd integer);
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '09:00', end_time time NOT NULL DEFAULT '10:00',
    status public.session_status NOT NULL DEFAULT 'Held',
    canceled_reason text, canceled_by uuid, canceled_at timestamptz);
  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'Present' CHECK (status IN ('Present','Absent','Excused','Late')), notes text, marked_by uuid,
    marked_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id));
  -- As in production: any update stamps updated_at (the admin function tells "the cancel did it" from "a person did it" by it).
  CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.classes c JOIN public.teachers t ON t.id = c.default_teacher_id
                       WHERE c.id = is_teacher_of_class.class_id AND t.user_id = is_teacher_of_class.user_id) $$;
  GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated, service_role;
  CREATE TABLE public.point_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    homework_id uuid, session_id uuid, notes text, points integer NOT NULL, type text NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
    month text NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'), created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.student_points(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL, month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0, participation_points integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, class_id, month));
  CREATE TABLE public.skill_assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    session_id uuid, skill text NOT NULL DEFAULT 'speaking', score integer NOT NULL DEFAULT 5, date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE public.student_work(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, status text NOT NULL DEFAULT 'approved',
    is_teamwork boolean NOT NULL DEFAULT false, uploaded_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.lesson_speaker_marks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    class_id uuid, kind text NOT NULL, student_ids uuid[] NOT NULL DEFAULT '{}', at timestamptz NOT NULL DEFAULT now(), made_by uuid);
  CREATE TABLE public.class_transcripts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, session_id uuid,
    transcript_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.transcript_speaker_metrics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid NOT NULL, class_id uuid,
    student_id uuid, is_teacher boolean NOT NULL DEFAULT false, utterance_count integer NOT NULL DEFAULT 0);
  CREATE TABLE public.transcript_speaker_suggestions(metric_id uuid PRIMARY KEY, suggested_student_id uuid);
  CREATE TABLE public.homeworks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, title text);
  CREATE TABLE public.homework_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL, student_id uuid NOT NULL, submitted_at timestamptz);
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text, entity text, entity_id text, diff jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now());
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
  CREATE TABLE public.schedule_runner(id integer PRIMARY KEY, token text NOT NULL);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const PROOF_FILE = '20261123100000_attendance_proof.sql';
const proofExists = existsSync(join(MIGS, PROOF_FILE));

async function build({ proof = false, install = true } = {}) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  await d.exec(`INSERT INTO public.user_roles VALUES ('${ADMIN}','admin'), ('${TEACHER}','teacher')`);
  await d.exec(`INSERT INTO public.teachers VALUES ('${TEACH_ID}','Teacher One','${TEACHER}')`);
  await d.exec(`INSERT INTO public.classes VALUES ('${CA}','Old Class','${TEACH_ID}', 210000)`);
  for (const f of ['20261027090000_cancelled_lesson_attendance_guard.sql', '20261106090000_attendance_enrollment_guard.sql', '20261106100000_attendance_guard_no_auto_changes.sql',
                   '20261123090000_tuition_bill_check.sql']) await d.exec(mig(f));
  if (proof) await d.exec(mig(PROOF_FILE));
  if (install) await d.exec(mig('20261123120000_uncancel_restores_marks.sql'));
  return d;
}

// ----------------------------------------------------------- helpers per database
function kit(db) {
  const one = async (q, p) => (await db.query(q, p)).rows[0];
  const all = async (q, p) => (await db.query(q, p)).rows;
  const count = async (q, p) => Number((await one(q, p)).n);
  let seq = 0;
  const student = async (name) => { const id = U(5000 + (++seq)); await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [id, name]); return id; };
  const enrol = (sid, from = '2026-01-01', to = null, allowed = null) => db.query(
    `INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, allowed_days, created_at) VALUES ($1, $2, $3, $4, $5, '2026-01-01T00:00:00Z')`, [sid, CA, from, to, allowed]);
  const lesson = async (date, status = 'Held') => (await one(
    `INSERT INTO public.sessions(class_id, teacher_id, date, status) VALUES ($1, $2, $3, $4) RETURNING id`, [CA, TEACH_ID, date, status])).id;
  const mark = (lid, sid, status, by = null, notes = null) => db.query(
    `INSERT INTO public.attendance(session_id, student_id, status, marked_by, notes) VALUES ($1, $2, $3, $4, $5)`, [lid, sid, status, by, notes]);
  // What the checked RPCs do to the lesson row (20261112091000 lines 886-906).
  const cancel = (lid) => db.query(`UPDATE public.sessions SET status = 'Canceled', canceled_reason = 'test', canceled_by = $2, canceled_at = now() WHERE id = $1`, [lid, ADMIN]);
  const uncancel = (lid, opts) => db.query(`UPDATE public.sessions SET status = 'Scheduled' WHERE id = $1`, [lid], opts);
  const held = (lid) => db.query(`UPDATE public.sessions SET status = 'Held' WHERE id = $1`, [lid]);
  const marksOf = async (lid) => Object.fromEntries((await all(`SELECT student_id, status FROM public.attendance WHERE session_id = $1`, [lid])).map((r) => [r.student_id, r.status]));
  const rowsOf = async (lid) => await all(`SELECT student_id, status, marked_by, marked_at::text AS marked_at, notes FROM public.attendance WHERE session_id = $1 ORDER BY student_id`, [lid]);
  const snapOf = async (lid, kid) => (await one(`SELECT sn.status FROM public.attendance_cancel_snapshots sn JOIN public.attendance a ON a.id = sn.attendance_id WHERE a.session_id = $1 AND a.student_id = $2`, [lid, kid]))?.status;
  const snaps = (lid) => count(`SELECT count(*) n FROM public.attendance_cancel_snapshots WHERE session_id = $1`, [lid]);
  return { db, one, all, count, snapOf, student, enrol, lesson, mark, cancel, uncancel, held, marksOf, rowsOf, snaps };
}

// The scenario of C1 (and C8): five different marks on one lesson.
async function scenarioC1(x, label, date) {
  const kids = { teacherPresent: await x.student(`${label} A`), late: await x.student(`${label} B`), absent: await x.student(`${label} C`), teacherExcused: await x.student(`${label} D`), placeholder: await x.student(`${label} E`) };
  for (const k of Object.values(kids)) await x.enrol(k);
  const lid = await x.lesson(date);
  await x.mark(lid, kids.teacherPresent, 'Present', TEACHER, 'note A');
  await x.mark(lid, kids.late, 'Late', TEACHER, 'note B');
  await x.mark(lid, kids.absent, 'Absent', TEACHER, 'note C');
  await x.mark(lid, kids.teacherExcused, 'Excused', TEACHER, 'note D');
  await x.mark(lid, kids.placeholder, 'Present', null, null);
  const before = await x.rowsOf(lid);
  await x.cancel(lid);
  const during = await x.marksOf(lid);
  const duringRows = await x.rowsOf(lid);
  const snapN = await x.snaps(lid);
  await x.uncancel(lid);
  const after = await x.rowsOf(lid);
  return { kids, lid, before, during, duringRows, snapN, after };
}

// =================================================================== main database
console.log('\nInstall');
const baseline = await build({ install: false });
ok('the migration installs', (await tryIt(() => baseline.exec(mig('20261123120000_uncancel_restores_marks.sql')))) === null);
ok('it installs twice', (await tryIt(() => baseline.exec(mig('20261123120000_uncancel_restores_marks.sql')))) === null);
ok('the preflight refuses without tuition_bill_expected', await (async () => {
  const d2 = new PGlite();
  await d2.exec(`CREATE TABLE public.audit_log(id int); CREATE TABLE public.attendance(id int);`);
  const e = await tryIt(() => d2.exec(mig('20261123120000_uncancel_restores_marks.sql')));
  return !!e && /tuition_bill_expected/.test(e.message);
})());
await baseline.close();

const db = await build({ install: false });
const x = kit(db);

// ----- C4 setup first: lessons cancelled with the OLD function, before the migration exists.
const OLD_DATE = '2026-08-10';       // a Monday
const c4 = { E1: await x.student('E1 enrolled placeholder'), E2: await x.student('E2 not yet enrolled'), E3: await x.student('E3 Wednesdays only'),
  E4: await x.student('E4 teacher made'), E5: await x.student('E5 empty days'), E6: await x.student('E6 placeholder Absent-looking') };
await x.enrol(c4.E1); await x.enrol(c4.E2, '2026-08-20'); await x.enrol(c4.E3, '2026-01-01', null, [3]); await x.enrol(c4.E4); await x.enrol(c4.E5, '2026-01-01', null, []);
await x.enrol(c4.E6);
const L4 = await x.lesson(OLD_DATE);
await x.mark(L4, c4.E1, 'Present'); await x.mark(L4, c4.E2, 'Present'); await x.mark(L4, c4.E3, 'Present');
await x.mark(L4, c4.E4, 'Present', TEACHER, 'teacher mark'); await x.mark(L4, c4.E5, 'Present'); await x.mark(L4, c4.E6, 'Present', TEACHER);
await db.query(`UPDATE public.attendance SET created_at = '2026-08-01T00:00:00Z' WHERE session_id = $1`, [L4]);
await x.cancel(L4);
const oldRows = await x.rowsOf(L4);

console.log('\nMigration installed after that cancellation');
await db.exec(mig('20261123120000_uncancel_restores_marks.sql'));
ok('the old cancel left no snapshot for the lesson', (await x.snaps(L4)) === 0);

console.log('\nC1. cancel then un-cancel restores every mark exactly');
const c1 = await scenarioC1(x, 'C1', '2026-09-07');
{
  const k = c1.kids;
  ok('C1 snapshot: 5 rows were written at the cancel', c1.snapN === 5, c1.snapN);
  ok('C1 while cancelled all five are Excused (C2)', Object.values(c1.during).every((s) => s === 'Excused') && Object.keys(c1.during).length === 5, c1.during);
  const after = Object.fromEntries(c1.after.map((r) => [r.student_id, r.status]));
  ok('C1 after the un-cancel the statuses are Present, Late, Absent, Excused, Present',
    after[k.teacherPresent] === 'Present' && after[k.late] === 'Late' && after[k.absent] === 'Absent' && after[k.teacherExcused] === 'Excused' && after[k.placeholder] === 'Present', after);
  ok('C1 marked_by, marked_at and notes are untouched on all five',
    JSON.stringify(c1.before.map((r) => [r.student_id, r.marked_by, r.marked_at, r.notes])) === JSON.stringify(c1.after.map((r) => [r.student_id, r.marked_by, r.marked_at, r.notes])));
  ok('C1 the snapshot rows are gone', (await x.snaps(c1.lid)) === 0);
  ok('C1 the lesson is Scheduled (the RPC puts it back as Scheduled)', (await x.one(`SELECT status::text s FROM public.sessions WHERE id = $1`, [c1.lid])).s === 'Scheduled');
}

console.log('\nC2. while cancelled the existing guard still holds');
{
  const lid = await x.lesson('2026-09-08');
  const kid = await x.student('C2 child'); await x.enrol(kid);
  await x.mark(lid, kid, 'Present', TEACHER);
  await x.cancel(lid);
  for (const st of ['Present', 'Absent', 'Late']) {
    const e = await tryIt(() => db.query(`UPDATE public.attendance SET status = $2 WHERE session_id = $1`, [lid, st]));
    ok(`C2 a person cannot set ${st} on a cancelled lesson (guard refuses)`, !!e && e.code === '23514', e);
  }
  ok('C2 the row is still Excused', (await x.marksOf(lid))[kid] === 'Excused');
  const seeded = await x.student('C2 late joiner'); await x.enrol(seeded);
  await db.query(`SELECT public._attendance_seed_for_class_dates($1, '2026-09-08', '2026-09-08')`, [CA]);
  ok('C2 the seeder still writes Excused for a cancelled lesson', (await x.marksOf(lid))[seeded] === 'Excused', await x.marksOf(lid));
  await x.uncancel(lid);
  ok('C2 un-cancel: the teacher-marked Present returns; the seeded Excused (no note, placeholder, enrolled) becomes Present',
    (await x.marksOf(lid))[kid] === 'Present' && (await x.marksOf(lid))[seeded] === 'Present', await x.marksOf(lid));
}

console.log('\nC3. cancel, un-cancel, change a mark, cancel, un-cancel: the changed mark is the one restored');
{
  const kid = await x.student('C3 child'); await x.enrol(kid);
  const other = await x.student('C3 other'); await x.enrol(other);
  const lid = await x.lesson('2026-09-09');
  await x.mark(lid, kid, 'Present', TEACHER); await x.mark(lid, other, 'Late', TEACHER);
  await x.cancel(lid); await x.uncancel(lid);
  ok('C3 first round: Present and Late', (await x.marksOf(lid))[kid] === 'Present' && (await x.marksOf(lid))[other] === 'Late');
  await db.query(`UPDATE public.attendance SET status = 'Absent', marked_by = $3 WHERE session_id = $1 AND student_id = $2`, [lid, kid, TEACHER]);
  await x.cancel(lid);
  ok('C3 the second cancel wrote the newer truth (Absent)', (await x.snapOf(lid, kid)) === 'Absent');
  await x.uncancel(lid);
  ok('C3 the changed mark (Absent) is restored, the other is still Late', (await x.marksOf(lid))[kid] === 'Absent' && (await x.marksOf(lid))[other] === 'Late', await x.marksOf(lid));
  // A leftover snapshot (kept by a failed restore) holds the truth: a cancel replaces it only for a mark that is not Excused now.
  const rowId = (await x.one(`SELECT id FROM public.attendance WHERE session_id = $1 AND student_id = $2`, [lid, kid])).id;
  await db.query(`INSERT INTO public.attendance_cancel_snapshots(attendance_id, session_id, status) VALUES ($1, $2, 'Present') ON CONFLICT DO NOTHING`, [rowId, lid]);
  await db.query(`UPDATE public.attendance SET status = 'Late' WHERE session_id = $1 AND student_id = $2`, [lid, kid]);
  await x.cancel(lid);
  ok('C3 a leftover snapshot is replaced by the next cancel when the mark is not Excused (Late)', (await x.snapOf(lid, kid)) === 'Late');
  await db.query(`UPDATE public.attendance_cancel_snapshots SET status = 'Present' WHERE attendance_id = $1`, [rowId]);
  await x.uncancel(lid);   // the mark is Present again now
  await db.query(`UPDATE public.attendance SET status = 'Excused' WHERE id = $1`, [rowId]);   // a kept note and an Excused mark (as after a failed restore)
  await db.query(`INSERT INTO public.attendance_cancel_snapshots(attendance_id, session_id, status) VALUES ($1, $2, 'Present') ON CONFLICT DO NOTHING`, [rowId, lid]);
  await x.cancel(lid);
  ok('C3 an older snapshot is NOT replaced when the mark is Excused now (the all-Excused overwrite would destroy it)', (await x.snapOf(lid, kid)) === 'Present');
  await x.uncancel(lid);
}

console.log('\nC4. a lesson cancelled BEFORE the migration (no snapshot), un-cancelled after it');
{
  ok('C4 before: all six rows are Excused from the old cancel', oldRows.every((r) => r.status === 'Excused'), oldRows.map((r) => r.status));
  const person = (await x.rowsOf(L4)).filter((r) => r.marked_by === TEACHER).map((r) => r.student_id).sort();
  await x.uncancel(L4);
  const m = await x.marksOf(L4);
  ok('C4 a placeholder of an enrolled child goes back to Present (E1)', m[c4.E1] === 'Present', m);
  ok('C4 a placeholder of a child not enrolled that day stays Excused (E2)', m[c4.E2] === 'Excused', m);
  ok('C4 a placeholder on a day outside allowed_days stays Excused (E3)', m[c4.E3] === 'Excused', m);
  ok('C4 an empty allowed_days means no day: stays Excused (E5)', m[c4.E5] === 'Excused', m);
  ok('C4 rows a person marked are untouched, even without a snapshot (E4, E6)', m[c4.E4] === 'Excused' && m[c4.E6] === 'Excused', m);
  const rows = await x.rowsOf(L4);
  ok('C4 marked_by and notes are unchanged on every row',
    JSON.stringify(rows.map((r) => [r.student_id, r.marked_by, r.notes])) === JSON.stringify(oldRows.map((r) => [r.student_id, r.marked_by, r.notes])));
  ok('C4 and two person-made rows existed', person.length === 2, person);
}

console.log('\nC5. a person cannot re-mark while cancelled; old un-cancels: who is a candidate');
// The history below is built by direct writes with chosen times, as production holds it.
await db.exec(`ALTER TABLE public.attendance DISABLE TRIGGER update_attendance_updated_at`);
const CANCELLED_AT = '2026-10-09T05:00:00Z';
const hl = async (date, status) => {
  const id = await x.lesson(date, status);
  await db.query(`UPDATE public.sessions SET canceled_at = $2, canceled_by = $3 WHERE id = $1`, [id, CANCELLED_AT, ADMIN]);
  return id;
};
const hm = async (lid, sid, { status = 'Excused', by = null, created = '2026-09-01T00:00:00Z', updated = CANCELLED_AT, notes = null } = {}) => {
  await db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [lid, sid, status, by, notes, created, updated]);
};
const bill = (sid, month, base, paid = 0, frozen = false) => db.query(
  `INSERT INTO public.invoices(student_id, month, base_amount, total_amount, recorded_payment, tuition_frozen, status) VALUES ($1, $2, $3, $3, $4, $5, 'issued')`, [sid, month, base, paid, frozen]);
const LA = await hl('2026-09-14', 'Held'), LB = await x.lesson('2026-09-21'), LC = await hl('2026-09-28', 'Scheduled'), LD = await hl('2026-09-07', 'Held');
// LB is the ordinary lesson that was never cancelled.
const names = { K1: 'Right Bill', K2: 'Bill Missed Them', K3: 'No Bill', K4: 'Forced', K5: 'Remarked After', K6: 'Excused Before Cancel', K7: 'Scheduled Lesson', K8: 'Person Made', K9: 'Not Enrolled' };
for (const [k, n] of Object.entries(names)) await db.query(`INSERT INTO public.students(id, full_name) VALUES ($1, $2)`, [K[k], n]);
for (const k of ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8']) await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at) VALUES ($1, $2, '2026-01-01', '2026-01-01T00:00:00Z')`, [K[k], CA]);
await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, created_at) VALUES ($1, $2, '2026-09-20', '2026-09-20T00:00:00Z')`, [K.K9, CA]);
// the ordinary Present of 21 Sept for everybody enrolled then
for (const k of ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9']) await hm(LB, K[k], { status: 'Present', by: TEACHER });
// K1..K4: Excused on the lesson of 14 Sept, the cancel touched them (updated_at = canceled_at)
await hm(LA, K.K1, { by: TEACHER }); await hm(LA, K.K2, { by: TEACHER }); await hm(LA, K.K3, { by: TEACHER }); await hm(LA, K.K4, { by: TEACHER });
await hm(LA, K.K5, { by: TEACHER, updated: '2026-10-20T08:00:00Z' });                       // re-marked by a person after the cancel
await hm(LA, K.K6, { by: TEACHER, created: '2026-09-01T00:00:00Z', updated: '2026-09-05T00:00:00Z' }); // Excused by a person before the cancel
await hm(LC, K.K7, { by: null, created: '2026-09-01T00:00:00Z', updated: '2026-09-01T00:00:00Z' });   // untouched placeholder, lesson still Scheduled
await hm(LD, K.K8, { by: TEACHER, notes: 'teacher note' });                                // person made, touched by the cancel
await hm(LA, K.K9, { by: null });                                                          // not enrolled on 14 Sept
await bill(K.K1, '2026-09', 420000, 420000);
await bill(K.K2, '2026-09', 210000, 210000);
await bill(K.K4, '2026-09', 210000, 0, true);
await bill(K.K5, '2026-09', 210000);
await bill(K.K7, '2026-09', 210000);
await bill(K.K8, '2026-09', 420000, 0);
// (K3 has no bill)

{
  const cancelledNow = await x.lesson('2026-09-30'); const kid = await x.student('C5 child'); await x.enrol(kid);
  await x.mark(cancelledNow, kid, 'Present', TEACHER); await x.cancel(cancelledNow);
  const e = await tryIt(() => db.query(`UPDATE public.attendance SET status = 'Absent', marked_by = $3 WHERE session_id = $1 AND student_id = $2`, [cancelledNow, kid, TEACHER]));
  ok('C5 while the lesson is cancelled a person cannot re-mark it (the guard refuses)', !!e && e.code === '23514', e);
  await x.uncancel(cancelledNow);
  ok('C5 and after the un-cancel it is Present again', (await x.marksOf(cancelledNow))[kid] === 'Present');
}

const snapshot = async () => ({
  attendance: (await db.query(`SELECT md5(string_agg(a.id::text || a.status || coalesce(a.marked_by::text, '') || coalesce(a.notes, '') || a.updated_at::text, ',' ORDER BY a.id)) h, count(*)::int n FROM public.attendance a`)).rows[0],
  audit: await x.count(`SELECT count(*) n FROM public.audit_log`),
  invoices: (await db.query(`SELECT md5(string_agg(i.id::text || i.base_amount::text || i.total_amount::text || i.recorded_payment::text || i.updated_at::text, ',' ORDER BY i.id)) h FROM public.invoices i`)).rows[0].h,
  sessions: (await db.query(`SELECT md5(string_agg(s.id::text || s.status::text, ',' ORDER BY s.id)) h FROM public.sessions s`)).rows[0].h,
});
const run = async (dry, force = []) => (await db.query(`SELECT ${FUNC}($1, $2::jsonb) AS r`, [dry, JSON.stringify(force)])).rows[0].r;
const cm = (res, k, month = '2026-09') => res.child_months.find((r) => r.student_id === K[k] && r.month === month);

console.log('\nC6. the admin function');
const snap0 = await snapshot();
{
  const q = readFileSync(join(repo, 'scripts', 'CHECK-uncancelled-lessons-marks.sql'), 'utf8');
  const rows = (await db.query(q)).rows;
  const total = rows[rows.length - 1];
  const by = (n) => rows.find((r) => r.student === n);
  ok('CHECK script: writes nothing', JSON.stringify(await snapshot()) === JSON.stringify(snap0));
  ok('CHECK script: 5 child-months (lessons not Held left out) plus a TOTAL row', rows.length === 6 && /^TOTAL \(5 children, 5 child-months\)/.test(total.student), rows.map((r) => r.student));
  ok('CHECK script: TOTAL counts 5 candidate marks, 5 made by a person', Number(total.candidates) === 5 && Number(total.by_a_person) === 5, total);
  ok('CHECK script: TOTAL text counts the re-marked, the excused-before and the 3 marks on 2 lessons not Held', /1 changed by a person after the cancel/.test(total.first_guess) && /2 already Excused before the cancel/.test(total.first_guess) && /3 more candidate marks on 2 lessons_not_held/.test(total.first_guess), total.first_guess);
  ok('CHECK script: first guesses (K1 and K8 likely restore, K2 decide, K3 no bill)', by('Right Bill').first_guess === 'likely restore' && by('Person Made').first_guess === 'likely restore'
    && by('Bill Missed Them').first_guess === 'decide' && by('No Bill').first_guess === 'no bill' && !by('Scheduled Lesson'), rows.map((r) => [r.student, r.first_guess]));
  ok('CHECK script: saved bill, payment and frozen are shown', Number(by('Right Bill').saved_base) === 420000 && Number(by('Right Bill').recorded_payment) === 420000 && by('Forced').frozen === true);
  ok('CHECK script: calls no function of ours', !/public\.|_uncancelled|tuition_bill_expected|admin_restore/.test(q.split('\n').map((l) => l.replace(/--.*$/, '')).join(' ')));
}
const dry = await run(true);
const snap1 = await snapshot();
ok('C6 the default is a dry run', (await db.query(`SELECT ${FUNC}() AS r`)).rows[0].r.dry_run === true);
ok('C6 dry run writes nothing (attendance hash and count, audit_log, invoices, sessions)', JSON.stringify(snap0) === JSON.stringify(snap1), [snap0, snap1]);
// The fixtures above also hold rows from C4 (E-children, Monday 10 Aug, now Scheduled after the un-cancel, in the past).
const c4Cands = dry.child_months.filter((r) => [c4.E1, c4.E2, c4.E3, c4.E4, c4.E5, c4.E6].includes(r.student_id));
ok('C6 the C4 lesson (past, un-cancelled, Scheduled) is not restored: it is reported as not held', c4Cands.length === 0 && dry.lessons_not_held.some((l) => l.session_id === L4), dry.lessons_not_held);
const mine = dry.child_months.filter((r) => Object.values(K).includes(r.student_id));
ok('C6 5 child-months are judged (K1 K2 K3 K4 K8); K7 (Scheduled lesson) is not among them', mine.length === 5 && !cm(dry, 'K7'), mine.map((r) => r.student_name));
ok('C6 K1: restore, saved 420,000 = register 420,000', cm(dry, 'K1').verdict === 'restore' && cm(dry, 'K1').saved_base === 420000 && cm(dry, 'K1').register_base_if_restored === 420000 && cm(dry, 'K1').marks === 1, cm(dry, 'K1'));
ok('C6 K8 (a mark a person made): restore', cm(dry, 'K8').verdict === 'restore' && cm(dry, 'K8').marks === 1, cm(dry, 'K8'));
ok('C6 K2: decide (saved 210,000, register 420,000), reason in words, payment shown',
  cm(dry, 'K2').verdict === 'decide' && cm(dry, 'K2').saved_base === 210000 && cm(dry, 'K2').register_base_if_restored === 420000 && cm(dry, 'K2').recorded_payment === 210000
  && /210,000/.test(cm(dry, 'K2').reason) && /420,000/.test(cm(dry, 'K2').reason) && /Excused/.test(cm(dry, 'K2').reason), cm(dry, 'K2'));
ok('C6 K3 (no bill): decide, saved null', cm(dry, 'K3').verdict === 'decide' && cm(dry, 'K3').saved_base === null && /no bill/i.test(cm(dry, 'K3').reason), cm(dry, 'K3'));
ok('C6 K4 (frozen): decide, frozen reported', cm(dry, 'K4').verdict === 'decide' && cm(dry, 'K4').frozen === true && /frozen/.test(cm(dry, 'K4').reason), cm(dry, 'K4'));
ok('C6 K5 (re-marked after the cancel) and K6 (Excused before the cancel) and K9 (not enrolled) are not judged',
  !cm(dry, 'K5') && !cm(dry, 'K6') && !cm(dry, 'K9'));
ok('C6 counts: remarked_since 1 (K5); excused_before_cancel 2 (K6 and the teacher Excused of C1)', dry.remarked_since === 1 && dry.excused_before_cancel === 2, [dry.remarked_since, dry.excused_before_cancel]);
ok('C6 counts: 8 candidates (K1-K4, K7, K8 and the two person-made marks of the C4 lesson) on 4 lessons', dry.candidates === 8 && dry.lessons === 4, [dry.candidates, dry.lessons]);
ok('C6 dry run: restored 2 marks in 2 child-months, 3 to decide', dry.restored === 2 && dry.child_months_restored === 2 && dry.child_months_to_decide === 3, dry);
const nh = dry.lessons_not_held.find((l) => l.session_id === LC);
ok('C6 the past Scheduled lesson (K7) is listed with its date, class and status', !!nh && nh.status === 'Scheduled' && nh.lesson_date === '2026-09-28' && nh.class_name === 'Old Class' && nh.marks === 1, nh);
ok('C6 next steps tell the owner what to do', dry.next_steps.some((s) => /dry run/i.test(s)) && dry.next_steps.some((s) => /Finance > Tuition/.test(s)) && dry.next_steps.some((s) => /3 child-months need your decision/.test(s)) && dry.next_steps.some((s) => /not Held/.test(s)), dry.next_steps);
ok('C6 a dry run adds no audit row', await x.count(`SELECT count(*) n FROM public.audit_log WHERE action = 'restore_uncancelled_marks'`) === 0);

const real = await run(false);
const snap2 = await snapshot();
ok('C6 the real run reports the same child-months and verdicts as the dry run',
  JSON.stringify(real.child_months.map((r) => [r.student_id, r.month, r.verdict, r.marks]).sort()) === JSON.stringify(dry.child_months.map((r) => [r.student_id, r.month, r.verdict, r.marks]).sort()));
ok('C6 real run: dry_run false, restored 2', real.dry_run === false && real.restored === 2, real);
ok('C6 K1 is Present with the note, signed as before', (await x.one(`SELECT status, marked_by, notes FROM public.attendance WHERE session_id = $1 AND student_id = $2`, [LA, K.K1])).notes
  === 'Restored ' + todayHanoi + ': set to Excused by a cancellation on 2026-10-09; the lesson was un-cancelled.');
const k8 = await x.one(`SELECT status, marked_by, notes FROM public.attendance WHERE session_id = $1 AND student_id = $2`, [LD, K.K8]);
ok('C6 K8: Present, still signed by the teacher, the old note is kept and the new one appended', k8.status === 'Present' && k8.marked_by === TEACHER
  && k8.notes === 'teacher note\nRestored ' + todayHanoi + ': set to Excused by a cancellation on 2026-10-09; the lesson was un-cancelled.', k8);
ok('C6 the register now prices K1 at exactly the saved bill', Number((await x.one(`SELECT expected_base FROM public.tuition_bill_expected('2026-09') WHERE student_id = $1`, [K.K1])).expected_base) === 420000);
ok('C6 K2, K3, K4, K5, K6, K7, K9 are still Excused (nothing written for them)',
  (await x.count(`SELECT count(*) n FROM public.attendance WHERE status = 'Excused' AND student_id = ANY($1::uuid[])`, [[K.K2, K.K3, K.K4, K.K5, K.K6, K.K7, K.K9]])) === 7);
ok('C6 no bill and no session was touched', snap2.invoices === snap0.invoices && snap2.sessions === snap0.sessions);
ok('C6 exactly one audit row from the real run (entity attendance)', await x.count(`SELECT count(*) n FROM public.audit_log WHERE action = 'restore_uncancelled_marks' AND entity = 'attendance'`) === 1);
const second = await run(false);
const snap3 = await snapshot();
ok('C6 a second real run restores 0', second.restored === 0 && second.child_months_restored === 0, second);
ok('C6 and it only adds its own audit row', snap3.attendance.h === snap2.attendance.h && snap3.audit === snap2.audit + 1);
{
  const forced = await run(false, [{ student_id: K.K4, month: '2026-09' }, { student_id: K.K7, month: '2026-09' }, { student_id: K.K1, month: '2025-01' }]);
  ok('C6 p_force restores K4 (frozen, no match) in full', cm(forced, 'K4').verdict === 'restore' && cm(forced, 'K4').forced === true
    && (await x.marksOf(LA))[K.K4] === 'Present', cm(forced, 'K4'));
  ok('C6 p_force restores K7 even though its lesson is only Scheduled', cm(forced, 'K7')?.verdict === 'restore' && (await x.marksOf(LC))[K.K7] === 'Present', cm(forced, 'K7'));
  ok('C6 K2 and K3, not named, are still Excused', (await x.marksOf(LA))[K.K2] === 'Excused' && (await x.marksOf(LA))[K.K3] === 'Excused');
  ok('C6 a force with nothing to restore is reported, not an error', forced.force_ignored.length === 1 && forced.force_ignored[0].month === '2025-01', forced.force_ignored);
  const bad = await tryIt(() => db.query(`SELECT ${FUNC}(true, '{"a":1}'::jsonb)`));
  ok('C6 a force that is not a list is refused in words', !!bad && /list/.test(bad.message), bad);
  ok('C6 the bills were never touched by any run', (await snapshot()).invoices === snap0.invoices);
  ok('C6 the Scheduled lesson left the "not held" list once forced', !forced.lessons_not_held.some((l) => l.session_id === LC));
}
{
  for (const role of ['authenticated', 'anon', 'service_role']) {
    await db.exec(`SET ROLE ${role}`);
    const e = await tryIt(() => db.query(`SELECT ${FUNC}(true)`));
    await db.exec('RESET ROLE');
    ok(`C6 ${role} cannot run it`, !!e && /permission denied/i.test(e.message), e);
  }
  const h = await tryIt(async () => { await db.exec('SET ROLE authenticated'); try { await db.query(`SELECT * FROM public._uncancelled_marks_candidates()`); } finally { await db.exec('RESET ROLE'); } });
  ok('C6 the helper is closed to the app too', !!h && /permission denied/i.test(h.message), h);
  await db.exec(`GRANT EXECUTE ON FUNCTION ${FUNC}(boolean, jsonb) TO authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [U(9)]);
  await db.exec('SET ROLE authenticated');
  const nonAdmin = await tryIt(() => db.query(`SELECT ${FUNC}(true)`));
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('test.uid', '', false)`);
  await db.exec(`REVOKE EXECUTE ON FUNCTION ${FUNC}(boolean, jsonb) FROM authenticated`);
  ok('C6 a signed-in non-admin is refused by the function itself', !!nonAdmin && nonAdmin.code === '42501', nonAdmin);
  const snapTbl = await tryIt(async () => { await db.exec('SET ROLE anon'); try { await db.query(`SELECT * FROM public.attendance_cancel_snapshots`); } finally { await db.exec('RESET ROLE'); } });
  ok('C6 the snapshot table is closed to anon; authenticated may only read (and RLS limits it to admins)', !!snapTbl && /permission denied/i.test(snapTbl.message), snapTbl);
  const w = await tryIt(async () => { await db.exec('SET ROLE authenticated'); try { await db.query(`DELETE FROM public.attendance_cancel_snapshots`); } finally { await db.exec('RESET ROLE'); } });
  ok('C6 authenticated cannot write the snapshot table', !!w && /permission denied/i.test(w.message), w);
}

console.log('\nC5 (continued). a row re-marked AFTER an old un-cancel is not a candidate');
{
  const lid = await hl('2026-09-02', 'Held');
  const kid = await x.student('C5 remarked'); await x.enrol(kid, '2026-01-01');
  await hm(lid, kid, { by: TEACHER, updated: '2026-10-25T00:00:00Z' });
  const r = await run(true);
  ok('C5 it is counted as remarked_since and not judged', !r.child_months.some((c) => c.student_id === kid) && r.remarked_since >= 2, r.remarked_since);
}
{
  // M3: a row signed by nobody is not always an untouched placeholder (repair-attendance writes them too).
  const lm = await x.lesson('2026-09-01', 'Held');
  const m1 = await x.student('M3 changed before the cancel'), m2 = await x.student('M3 changed by the cancel'), m3 = await x.student('M3 person');
  for (const k of [m1, m2, m3]) await x.enrol(k);
  await hm(lm, m1, { by: null, created: '2026-09-01T00:00:00Z', updated: '2026-09-05T00:00:00Z' });   // an admin set it Excused before the cancel
  await hm(lm, m2, { by: null, created: '2026-09-01T00:00:00Z', updated: CANCELLED_AT });
  await hm(lm, m3, { by: TEACHER, created: '2026-09-01T00:00:00Z', updated: CANCELLED_AT });
  await db.query(`UPDATE public.sessions SET status = 'Canceled', canceled_at = $2, canceled_by = $3 WHERE id = $1`, [lm, CANCELLED_AT, ADMIN]);
  await db.query(`DELETE FROM public.attendance_cancel_snapshots WHERE session_id = $1`, [lm]);   // as if cancelled before the notes existed
  await x.uncancel(lm);
  const mm = await x.marksOf(lm);
  ok('M3 no note: a row nobody signed that the cancel changed goes to Present', mm[m2] === 'Present', mm);
  ok('M3 no note: a row nobody signed that was changed BEFORE the cancel stays Excused', mm[m1] === 'Excused', mm);
  ok('M3 no note: a person-made row stays Excused (the admin function is for those)', mm[m3] === 'Excused', mm);
}
await db.exec(`ALTER TABLE public.attendance ENABLE TRIGGER update_attendance_updated_at`);

console.log('\nC7. an un-cancel never fails because of the restore');
{
  const notices = [];
  const opts = { onNotice: (n) => notices.push(n.message) };
  const good = await x.student('C7 good'), bad = await x.student('C7 bad');
  await x.enrol(good); await x.enrol(bad);
  const lid = await x.lesson('2026-09-03');
  await x.mark(lid, good, 'Present', TEACHER); await x.mark(lid, bad, 'Late', TEACHER);
  await x.cancel(lid);
  await db.exec(`CREATE FUNCTION public.test_failing_mark() RETURNS trigger LANGUAGE plpgsql AS $t$
    BEGIN IF NEW.student_id = '${bad}' AND NEW.status = 'Late' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END $t$;
    CREATE TRIGGER aa_test_failing_mark BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.test_failing_mark();`);
  const e = await tryIt(() => x.uncancel(lid, opts));
  ok('C7 the un-cancel commits although one mark cannot be put back', e === null, e);
  ok('C7 the lesson is Scheduled', (await x.one(`SELECT status::text s FROM public.sessions WHERE id = $1`, [lid])).s === 'Scheduled');
  ok('C7 the other child was restored (Present); the failing one stays Excused', (await x.marksOf(lid))[good] === 'Present' && (await x.marksOf(lid))[bad] === 'Excused', await x.marksOf(lid));
  ok('C7 a WARNING was raised naming the child', notices.some((m) => /Could not put back the mark of child/.test(m) && m.includes(bad)), notices);
  ok('C7 only the failing mark keeps its snapshot (the restored one is cleared)', (await x.snaps(lid)) === 1 && (await x.snapOf(lid, bad)) === 'Late', await x.snaps(lid));
  // Cancel again while the note is kept: it holds the truth (Late) and the next un-cancel puts it back.
  await x.cancel(lid);
  ok('C7 a second cancel keeps the older note (Late), it does not turn it into Excused', (await x.snapOf(lid, bad)) === 'Late' && (await x.snapOf(lid, good)) === 'Present');
  await db.exec(`DROP TRIGGER aa_test_failing_mark ON public.attendance; DROP FUNCTION public.test_failing_mark();`);
  await x.uncancel(lid);
  ok('C7 once the fault is gone the un-cancel brings back Late and Present, and the notes go', (await x.marksOf(lid))[bad] === 'Late' && (await x.marksOf(lid))[good] === 'Present' && (await x.snaps(lid)) === 0, await x.marksOf(lid));

  // A rule keeps a row without an error (0 rows changed): warned, its note kept, the others cleared.
  const lidZ = await x.lesson('2026-09-12');
  const zGood = await x.student('C7 z good'), zBad = await x.student('C7 z bad');
  await x.enrol(zGood); await x.enrol(zBad);
  await x.mark(lidZ, zGood, 'Present', TEACHER); await x.mark(lidZ, zBad, 'Absent', TEACHER);
  await x.cancel(lidZ);
  await db.exec(`CREATE FUNCTION public.test_skip_mark() RETURNS trigger LANGUAGE plpgsql AS $t$ BEGIN IF NEW.student_id = '${zBad}' AND NEW.status <> 'Excused' THEN RETURN NULL; END IF; RETURN NEW; END $t$;
    CREATE TRIGGER aa_test_skip_mark BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.test_skip_mark();`);
  notices.length = 0;
  const eZ = await tryIt(() => x.uncancel(lidZ, opts));
  ok('C7 a row a rule silently kept: the un-cancel commits, a WARNING names the child, its note is kept, the others are cleared',
    eZ === null && notices.some((m) => /kept the mark of child/.test(m) && m.includes(zBad)) && (await x.marksOf(lidZ))[zBad] === 'Excused' && (await x.marksOf(lidZ))[zGood] === 'Present'
    && (await x.snaps(lidZ)) === 1 && (await x.snapOf(lidZ, zBad)) === 'Absent', [eZ, notices]);
  await db.exec(`DROP TRIGGER aa_test_skip_mark ON public.attendance; DROP FUNCTION public.test_skip_mark();`);

  // The clean-up of the notes fails: the marks stay restored, a warning is raised.
  const lid2 = await x.lesson('2026-09-04');
  const kid = await x.student('C7 cleanup'); await x.enrol(kid);
  await x.mark(lid2, kid, 'Absent', TEACHER);
  await x.cancel(lid2);
  await db.exec(`CREATE FUNCTION public.test_failing_cleanup() RETURNS trigger LANGUAGE plpgsql AS $t$ BEGIN RAISE EXCEPTION 'simulated clean-up failure'; END $t$;
    CREATE TRIGGER aa_test_failing_cleanup BEFORE DELETE ON public.attendance_cancel_snapshots FOR EACH ROW EXECUTE FUNCTION public.test_failing_cleanup();`);
  notices.length = 0;
  const e2 = await tryIt(() => x.uncancel(lid2, opts));
  ok('C7 the un-cancel commits although the clean-up of the notes raised', e2 === null && (await x.one(`SELECT status::text s FROM public.sessions WHERE id = $1`, [lid2])).s === 'Scheduled', e2);
  ok('C7 the mark was put back and a WARNING was raised', (await x.marksOf(lid2))[kid] === 'Absent' && notices.some((m) => /Could not clear the notes/.test(m)), [await x.marksOf(lid2), notices]);
  await db.exec(`DROP TRIGGER aa_test_failing_cleanup ON public.attendance_cancel_snapshots; DROP FUNCTION public.test_failing_cleanup();`);

  // The whole restore raises (here: a column it reads is missing): the un-cancel still commits, the marks are left as they are.
  const lidW = await x.lesson('2026-09-11');
  const kidW = await x.student('C7 whole'); await x.enrol(kidW);
  await x.mark(lidW, kidW, 'Late', TEACHER);
  await x.cancel(lidW);
  await db.exec(`ALTER TABLE public.enrollments RENAME COLUMN allowed_days TO allowed_days_gone`);
  notices.length = 0;
  const eW = await tryIt(() => x.uncancel(lidW, opts));
  await db.exec(`ALTER TABLE public.enrollments RENAME COLUMN allowed_days_gone TO allowed_days`);
  ok('C7 the un-cancel commits although the whole restore raised', eW === null && (await x.one(`SELECT status::text s FROM public.sessions WHERE id = $1`, [lidW])).s === 'Scheduled', eW);
  ok('C7 a WARNING says the marks were left as they are, and they are', notices.some((m) => /Could not put back the marks of lesson/.test(m)) && (await x.marksOf(lidW))[kidW] === 'Excused', [notices, await x.marksOf(lidW)]);

  // A failure to write the note never stops a cancel.
  const lid3 = await x.lesson('2026-09-05');
  const kid3 = await x.student('C7 note'); await x.enrol(kid3);
  await x.mark(lid3, kid3, 'Present', TEACHER);
  await db.exec(`CREATE FUNCTION public.test_failing_note() RETURNS trigger LANGUAGE plpgsql AS $t$ BEGIN RAISE EXCEPTION 'simulated note failure'; END $t$;
    CREATE TRIGGER aa_test_failing_note BEFORE INSERT ON public.attendance_cancel_snapshots FOR EACH ROW EXECUTE FUNCTION public.test_failing_note();`);
  const e3 = await tryIt(() => db.query(`UPDATE public.sessions SET status = 'Canceled', canceled_at = now() WHERE id = $1`, [lid3], opts));
  ok('C7 a cancel still goes through if the note cannot be written (and the marks are Excused)', e3 === null && (await x.marksOf(lid3))[kid3] === 'Excused', e3);
  await db.exec(`DROP TRIGGER aa_test_failing_note ON public.attendance_cancel_snapshots; DROP FUNCTION public.test_failing_note();`);
}

console.log('\nNo loop and the same firing conditions');
{
  const defs = (await db.query(`SELECT tgname, pg_get_triggerdef(oid) d FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND NOT tgisinternal AND tgname IN ('trg_cancel_session_excused', 'trg_uncancel_session_restore_marks')`)).rows;
  const byName = Object.fromEntries(defs.map((r) => [r.tgname, r.d]));
  ok('the cancel trigger is the same one, still firing only on the way into Canceled', /AFTER UPDATE/.test(byName.trg_cancel_session_excused) && /new\.status = 'Canceled'/i.test(byName.trg_cancel_session_excused) && /old\.status IS DISTINCT FROM 'Canceled'/i.test(byName.trg_cancel_session_excused), byName.trg_cancel_session_excused);
  ok('the un-cancel trigger fires only on the way out of Canceled', /AFTER UPDATE/.test(byName.trg_uncancel_session_restore_marks) && /old\.status = 'Canceled'/i.test(byName.trg_uncancel_session_restore_marks), byName.trg_uncancel_session_restore_marks);
  const lid = await x.lesson('2026-09-06'); const kid = await x.student('loop'); await x.enrol(kid); await x.mark(lid, kid, 'Present', TEACHER);
  await x.cancel(lid); await x.uncancel(lid); await x.held(lid);
  ok('Held after Scheduled changes nothing (no restore twice, no error)', (await x.marksOf(lid))[kid] === 'Present' && (await x.snaps(lid)) === 0);
  await db.query(`UPDATE public.sessions SET status = 'Held' WHERE id = $1`, [lid]);
  ok('an update of a Held lesson to Held does not fire either trigger', (await x.marksOf(lid))[kid] === 'Present');
}
await db.close();

// ===================================================== merge with a cancelled lesson
console.log('\nMerge. two records of one child on a currently cancelled lesson (20261121120000)');
{
  const mt = readFileSync(join(here, 'merge-students.test.mjs'), 'utf8');
  const raw = mt.match(/const BASE = `([\s\S]*?)`;\s*const SEED/)?.[1];
  const lane = mig('20261114090000_d4_floors.sql').match(/CREATE OR REPLACE FUNCTION public\._caller_lane\(\)[\s\S]*?\$fn\$;/)?.[0];
  if (!raw || !lane) ok('Merge: the merge-students prelude could be read', false);
  else {
    const md = new PGlite();
    await md.exec(new Function('ADMIN', 'TEACHER', 'LANE', 'return `' + raw + '`')(ADMIN, TEACHER, lane));
    await md.exec(`
      ALTER TABLE public.sessions ADD COLUMN canceled_at timestamptz;
      ALTER TABLE public.enrollments ADD COLUMN allowed_days integer[];
      ALTER TABLE public.attendance ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
      CREATE FUNCTION public.tuition_bill_expected(p_month text) RETURNS TABLE (student_id uuid, billable_lessons integer, expected_base bigint)
        LANGUAGE sql STABLE AS $f$ SELECT NULL::uuid, NULL::integer, NULL::bigint WHERE false $f$;
      CREATE FUNCTION public.set_attendance_excused_on_cancel() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NULL; END $f$;
      CREATE TRIGGER trg_cancel_session_excused AFTER UPDATE ON public.sessions FOR EACH ROW
        WHEN (NEW.status = 'Canceled' AND OLD.status IS DISTINCT FROM 'Canceled') EXECUTE FUNCTION public.set_attendance_excused_on_cancel();`);
    const inst = await tryIt(() => md.exec(mig('20261123120000_uncancel_restores_marks.sql')));
    ok('Merge: our migration installs beside the merge prelude', inst === null, inst);
    await md.exec(mig('20261121120000_admin_merge_students.sql'));
    const KEEP = U(811), DROP = U(812), CL = U(813), S1 = U(821), S2 = U(822);
    await md.exec(`INSERT INTO public.students(id, full_name) VALUES ('${KEEP}', 'Child'), ('${DROP}', 'Child');
      INSERT INTO public.classes VALUES ('${CL}', 'A');
      INSERT INTO public.sessions(id, class_id, date, status) VALUES ('${S1}', '${CL}', '2026-03-02', 'Held'), ('${S2}', '${CL}', '2026-03-09', 'Held');
      INSERT INTO public.enrollments(student_id, class_id, start_date, end_date, created_at) VALUES ('${KEEP}', '${CL}', '2026-03-01', NULL, '2026-03-01'), ('${DROP}', '${CL}', '2026-03-01', '2026-03-31', '2026-03-01');`);
    await md.exec(`UPDATE public.sessions SET status = 'Canceled', canceled_at = now() WHERE id IN ('${S1}', '${S2}')`);
    const n = async (q) => Number((await md.query(q)).rows[0].n);
    ok('Merge: 4 snapshots exist (both records on both cancelled lessons)', (await n(`SELECT count(*) n FROM public.attendance_cancel_snapshots`)) === 4);
    ok('Merge: the snapshot table has no student_id column (the merge never sees it)', (await n(`SELECT count(*) n FROM information_schema.columns WHERE table_name = 'attendance_cancel_snapshots' AND column_name = 'student_id'`)) === 0);
    const dryM = await tryIt(() => md.query(`SELECT public.admin_merge_students($1, $2, true)`, [KEEP, DROP]));
    ok('Merge: the dry run succeeds', dryM === null, dryM);
    const real = await tryIt(() => md.query(`SELECT public.admin_merge_students($1, $2, false)`, [KEEP, DROP]));
    ok('Merge: the real merge succeeds', real === null, real);
    ok('Merge: the dropped record is gone; its snapshots went with its marks; the kept record keeps 2', (await n(`SELECT count(*) n FROM public.attendance WHERE student_id = '${DROP}'`)) === 0
      && (await n(`SELECT count(*) n FROM public.attendance_cancel_snapshots`)) === 2
      && (await n(`SELECT count(*) n FROM public.attendance_cancel_snapshots sn JOIN public.attendance a ON a.id = sn.attendance_id WHERE a.student_id = '${KEEP}'`)) === 2);
    await md.exec(`UPDATE public.sessions SET status = 'Scheduled' WHERE id IN ('${S1}', '${S2}')`);
    ok('Merge: un-cancelling afterwards still puts the kept child marks back', (await n(`SELECT count(*) n FROM public.attendance WHERE student_id = '${KEEP}' AND status = 'Present'`)) === 2
      && (await n(`SELECT count(*) n FROM public.attendance_cancel_snapshots`)) === 0);
    await md.close();
  }
}

// ===================================================== real RPCs on the real guard stack
console.log('\nC1r. the real cancel_session_checked / uncancel_session_checked');
{
  const src = readFileSync(join(here, 'session-cancel-guard.test.mjs'), 'utf8');
  const m = src.match(/const PRELUDE = `([\s\S]*?)`;\s*async function makeDb/);
  if (!m) ok('C1r the session-cancel-guard prelude could be read', false);
  else {
    const rd = new PGlite();
    await rd.exec(m[1]);
    for (const f of ['20261009130000_audit_every_admin_action.sql', '20261027090000_cancelled_lesson_attendance_guard.sql', '20261112090000_session_held_evidence.sql', '20261112091000_session_cancel_guard.sql']) {
      const e = await tryIt(() => rd.exec(mig(f)));
      if (e) { ok(`C1r ${f} loads on that prelude`, false, e); }
    }
    // This prelude has no students table and no pricing: the snapshot table needs the first, the preflight the second (a stand-in).
    await rd.exec(`CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text);
      CREATE FUNCTION public.tuition_bill_expected(p_month text) RETURNS TABLE (student_id uuid, billable_lessons integer, expected_base bigint)
        LANGUAGE sql STABLE AS $f$ SELECT NULL::uuid, NULL::integer, NULL::bigint WHERE false $f$;`);
    for (const id of [U(7101), U(7102), U(7103), U(7104)]) await rd.query(`INSERT INTO public.students VALUES ($1, 'kid')`, [id]);
    const inst = await tryIt(() => rd.exec(mig('20261123120000_uncancel_restores_marks.sql')));
    ok('C1r the migration installs on the real stack', inst === null, inst);
    if (!inst) {
      const ADM = U(7001), PARENT_TEACHER = U(7002), CLS = U(7003), TCH = U(7004);
      await rd.query(`INSERT INTO user_roles VALUES ($1,'admin')`, [ADM]);
      await rd.query(`INSERT INTO classes VALUES ($1,$2)`, [CLS, PARENT_TEACHER]);
      const kids = [U(7101), U(7102), U(7103), U(7104)];
      const stat = ['Present', 'Late', 'Absent', 'Excused'];
      const date = new Date(Date.now() + 10 * 86400e3 + 7 * 3600e3).toISOString().slice(0, 10);
      const sid = (await rd.query(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Scheduled',$3) RETURNING id`, [CLS, date, TCH])).rows[0].id;
      for (let i = 0; i < 4; i++) await rd.query(`INSERT INTO attendance(session_id,student_id,status,marked_by,notes) VALUES ($1,$2,$3,$4,$5)`, [sid, kids[i], stat[i], PARENT_TEACHER, `n${i}`]);
      const before = (await rd.query(`SELECT student_id, status, marked_by, marked_at::text m, notes FROM attendance WHERE session_id=$1 ORDER BY student_id`, [sid])).rows;
      const as = async (sql, params) => {
        await rd.query(`SELECT set_config('test.uid', $1, false), set_config('test.jwt_role', 'authenticated', false)`, [ADM]);
        await rd.exec('SET ROLE authenticated');
        try { return await rd.query(sql, params); }
        finally { await rd.exec('RESET ROLE'); await rd.query(`SELECT set_config('test.uid', '', false), set_config('test.jwt_role', '', false)`); }
      };
      const REASON = 'Teacher is sick today, class off';
      const p = (await as('SELECT public.session_change_preview($1,$2,$3::jsonb) r', [sid, 'cancel', null])).rows[0].r;
      const c = await tryIt(() => as('SELECT public.cancel_session_checked($1,$2,$3,$4,$5,$6,$7::jsonb) r', [sid, 'cancel', REASON, p.token, true, p.tier === 3 ? 'Correction: register belonged to another lesson' : null, '{}']));
      ok('C1r cancel_session_checked ran', c === null, c);
      const mid = (await rd.query(`SELECT status FROM attendance WHERE session_id=$1`, [sid])).rows.map((r) => r.status);
      ok('C1r while cancelled all four are Excused', mid.every((s) => s === 'Excused') && mid.length === 4, mid);
      const pu = (await as('SELECT public.session_change_preview($1,$2,$3::jsonb) r', [sid, 'uncancel', null])).rows[0].r;
      const u = await tryIt(() => as('SELECT public.uncancel_session_checked($1,$2,$3,$4::jsonb,$5) r', [sid, REASON, pu.token, '{}', null]));
      ok('C1r uncancel_session_checked ran', u === null, u);
      const after = (await rd.query(`SELECT student_id, status, marked_by, marked_at::text m, notes FROM attendance WHERE session_id=$1 ORDER BY student_id`, [sid])).rows;
      ok('C1r the four marks are back exactly (Present, Late, Absent, Excused), signed, with notes',
        JSON.stringify(after) === JSON.stringify(before), { before, after });
      ok('C1r the snapshot rows are gone', Number((await rd.query(`SELECT count(*) n FROM attendance_cancel_snapshots WHERE session_id=$1`, [sid])).rows[0].n) === 0);
      ok('C1r the lesson is Scheduled', (await rd.query(`SELECT status::text s FROM sessions WHERE id=$1`, [sid])).rows[0].s === 'Scheduled');
    }
    await rd.close();
  }
}

// ===================================================== C8 with the attendance-proof migration
console.log('\nC8. the same, with 20261123100000_attendance_proof.sql loaded');
if (!proofExists) {
  ok('C8 the attendance-proof migration is not in the tree: not run', true);
} else {
  const pdb = await build({ proof: true });
  const px = kit(pdb);
  ok('C8 the proof guard is installed', Number((await pdb.query(`SELECT count(*) n FROM pg_trigger WHERE tgname = 'zz_attendance_proof_guard' AND NOT tgisinternal`)).rows[0].n) === 1);
  const r1 = await scenarioC1(px, 'C8', '2026-09-07');
  const k = r1.kids;
  const after = Object.fromEntries(r1.after.map((r) => [r.student_id, r.status]));
  ok('C8 C1 still passes: all Excused while cancelled, then Present, Late, Absent, Excused, Present',
    Object.values(r1.during).every((s) => s === 'Excused') && after[k.teacherPresent] === 'Present' && after[k.late] === 'Late' && after[k.absent] === 'Absent' && after[k.teacherExcused] === 'Excused' && after[k.placeholder] === 'Present', { during: r1.during, after });
  ok('C8 marked_by, marked_at and notes untouched and the snapshots are gone',
    JSON.stringify(r1.before.map((r) => [r.student_id, r.marked_by, r.marked_at, r.notes])) === JSON.stringify(r1.after.map((r) => [r.student_id, r.marked_by, r.marked_at, r.notes])) && (await px.snaps(r1.lid)) === 0);
  // C3 with the proof guard
  const kid = await px.student('C8 c3'); await px.enrol(kid);
  const lid = await px.lesson('2026-09-09');
  await px.mark(lid, kid, 'Present', TEACHER);
  await px.cancel(lid); await px.uncancel(lid);
  await pdb.query(`UPDATE public.attendance SET status = 'Absent', marked_by = $3 WHERE session_id = $1 AND student_id = $2`, [lid, kid, TEACHER]);
  await px.cancel(lid); await px.uncancel(lid);
  ok('C8 C3 still passes: the changed mark (Absent) is the one restored', (await px.marksOf(lid))[kid] === 'Absent', await px.marksOf(lid));
  // A teacher's Absent with the proof guard installed (no proof exists for the child): it comes back, and the un-cancel never fails.
  const kid2 = await px.student('C8 proof'); await px.enrol(kid2);
  const lid2 = await px.lesson('2026-09-10');
  await px.mark(lid2, kid2, 'Absent', TEACHER);
  await px.cancel(lid2);
  const e = await tryIt(() => px.uncancel(lid2));
  ok('C8 the un-cancel goes through and the Absent is back', e === null && (await pdb.query(`SELECT status::text s FROM public.sessions WHERE id = $1`, [lid2])).rows[0].s === 'Scheduled' && (await px.marksOf(lid2))[kid2] === 'Absent', e);
  await pdb.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
