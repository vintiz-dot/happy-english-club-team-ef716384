// Tuition audit phase 4: supabase/migrations/20261121120000_admin_merge_students.sql
// in an in-process Postgres.
//
// The prelude is a small copy of the tables a merge touches, carrying the
// behaviour of production's guards that the merge has to get past: a
// register row or an enrolment never changes child (HC024 / HC121), an
// enrolment insert seeds placeholder marks, marks need an enrolment unless
// hec.attendance_restore is on, cancelled lessons take Excused only, the
// ledger is append-only, the floor table refuses changes, and
// point_transactions rebuild student_points. _caller_lane is the real one,
// read out of 20261114090000.
//
// What this suite holds:
//   1. Install: the migration pastes clean; EXECUTE is the owner's only.
//   2. A dry run changes nothing (every table compared row for row) and
//      reports what the real run then does.
//   3. A merge with rows in many tables: bills, marks, enrolments, payments,
//      ledger, points, words, caches, an FK column with another name, the
//      rows that stay, the students row, the audit row.
//   4. Same-month bills with money on both sides: refused, nothing changed;
//      an empty bill on either side gives way.
//   5. Other refusals: different marks, a unique clash (two Pixel Pal
//      links, a partial unique index), a cancelled-lesson mark, the same
//      child twice, a non-admin, the service role.
//   6. A table created AFTER the migration is picked up by the next merge.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const MERGE = mig('20261121120000_admin_merge_students.sql');
const LANE = mig('20261114090000_d4_floors.sql').match(/CREATE OR REPLACE FUNCTION public\._caller_lane\(\)[\s\S]*?\$fn\$;/)[0];

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message, detail: e.detail }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2), LOGIN = U(3);
const KEEP = U(11), DROP = U(12), OTHER = U(13);
const FAM = U(21);
const CLASS_A = U(31), CLASS_B = U(32);
const S1 = U(41), S2 = U(42), S3 = U(43), S4 = U(44), S_CANCEL = U(45);

const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.role', true), '') $f$;
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'family', 'student');
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid', 'credit');
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id = u AND x.role = r) $f$;
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin'), ('${TEACHER}', 'teacher');

  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.families(id uuid PRIMARY KEY, name text);
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text, family_id uuid REFERENCES public.families(id),
    linked_user_id uuid UNIQUE, secondary_user_id uuid, phone text, email text, date_of_birth date, avatar_url text,
    notes text, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text);
  CREATE TABLE public.sessions(id uuid PRIMARY KEY, class_id uuid, date date, status text NOT NULL DEFAULT 'Held');

  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id uuid NOT NULL,
    start_date date NOT NULL, end_date date, created_at timestamptz NOT NULL DEFAULT now());
  CREATE UNIQUE INDEX unique_active_enrollment ON public.enrollments (student_id, class_id, end_date) NULLS NOT DISTINCT;

  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'Present',
    marked_by uuid, notes text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (session_id, student_id));

  -- production: _attendance_evidence_guard (HC024) and _enrollment_money_guard (HC121)
  CREATE FUNCTION public.t_attendance_identity() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    IF OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.session_id IS DISTINCT FROM NEW.session_id THEN
      RAISE EXCEPTION 'attendance_identity' USING ERRCODE = 'HC024'; END IF; RETURN NEW; END $f$;
  CREATE TRIGGER zz_attendance_evidence_guard BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.t_attendance_identity();
  CREATE FUNCTION public.t_enrollment_identity() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    IF OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'money_change_refused' USING ERRCODE = 'HC121'; END IF; RETURN NEW; END $f$;
  CREATE TRIGGER zz_enrollment_money_guard BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.t_enrollment_identity();
  -- production: _attendance_after_enrollment_ins seeds placeholders for the class
  CREATE FUNCTION public.t_seed() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    INSERT INTO public.attendance(session_id, student_id) SELECT ss.id, NEW.student_id FROM public.sessions ss
     WHERE ss.class_id = NEW.class_id AND ss.date >= NEW.start_date AND (NEW.end_date IS NULL OR ss.date <= NEW.end_date)
       AND ss.status <> 'Canceled'
    ON CONFLICT DO NOTHING; RETURN NEW; END $f$;
  CREATE TRIGGER trg_attendance_after_enrollment_ins AFTER INSERT ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.t_seed();
  -- production: guard_attendance_enrollment, guard_cancelled_session_attendance
  CREATE FUNCTION public.t_att_enrolled() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    IF NEW.status = 'Excused' OR current_setting('hec.attendance_restore', true) = 'on' THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.enrollments e JOIN public.sessions ss ON ss.class_id = e.class_id
                WHERE ss.id = NEW.session_id AND e.student_id = NEW.student_id AND ss.date >= e.start_date
                  AND (e.end_date IS NULL OR ss.date <= e.end_date)) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'This student is not enrolled for this lesson' USING ERRCODE = '23514'; END $f$;
  CREATE TRIGGER guard_attendance_enrollment BEFORE INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.t_att_enrolled();
  CREATE FUNCTION public.t_att_cancel() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    IF (SELECT status FROM public.sessions WHERE id = NEW.session_id) = 'Canceled' AND NEW.status IS DISTINCT FROM 'Excused' THEN
      RAISE EXCEPTION 'Cancelled lessons cannot be marked' USING ERRCODE = '23514'; END IF; RETURN NEW; END $f$;
  CREATE TRIGGER guard_cancelled_session_attendance BEFORE INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.t_att_cancel();

  CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, month text NOT NULL,
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    status public.invoice_status NOT NULL DEFAULT 'issued', confirmation_status text DEFAULT 'auto_approved',
    tuition_frozen boolean NOT NULL DEFAULT false, carry_in_debt integer DEFAULT 0, carry_in_credit integer DEFAULT 0,
    UNIQUE (student_id, month));

  CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, amount integer NOT NULL, memo text);
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, code text NOT NULL, UNIQUE (student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE, debit integer DEFAULT 0, credit integer DEFAULT 0);
  CREATE FUNCTION public.t_append_only() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only' USING ERRCODE = 'HC130'; END $f$;
  CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.t_append_only();

  CREATE TABLE public.point_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id uuid, month text, points integer NOT NULL);
  CREATE TABLE public.student_points(student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid, month text, total_points integer NOT NULL DEFAULT 0, UNIQUE (student_id, class_id, month));
  CREATE FUNCTION public.t_points() RETURNS trigger LANGUAGE plpgsql AS $f$
  DECLARE s uuid; c uuid; m text; BEGIN
    FOR s, c, m IN SELECT * FROM (VALUES (CASE WHEN TG_OP <> 'INSERT' THEN OLD.student_id END, CASE WHEN TG_OP <> 'INSERT' THEN OLD.class_id END, CASE WHEN TG_OP <> 'INSERT' THEN OLD.month END),
                                         (CASE WHEN TG_OP <> 'DELETE' THEN NEW.student_id END, CASE WHEN TG_OP <> 'DELETE' THEN NEW.class_id END, CASE WHEN TG_OP <> 'DELETE' THEN NEW.month END)) v WHERE v.column1 IS NOT NULL LOOP
      INSERT INTO public.student_points(student_id, class_id, month, total_points)
      VALUES (s, c, m, (SELECT COALESCE(sum(points), 0) FROM public.point_transactions WHERE student_id = s AND class_id = c AND month = m))
      ON CONFLICT (student_id, class_id, month) DO UPDATE SET total_points = EXCLUDED.total_points;
    END LOOP; RETURN NULL; END $f$;
  CREATE TRIGGER trigger_update_points_from_transaction AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public.t_points();

  CREATE TABLE public.invoice_state_floor(student_id uuid NOT NULL, month text NOT NULL, ever_paid boolean, PRIMARY KEY (student_id, month));
  CREATE FUNCTION public.t_floor() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
    IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'invoice_state_floor only rises' USING ERRCODE = 'HC040'; END IF; RETURN NEW; END $f$;
  CREATE TRIGGER invoice_state_floor_guard BEFORE UPDATE OR DELETE ON public.invoice_state_floor FOR EACH ROW EXECUTE FUNCTION public.t_floor();
  CREATE TABLE public.ai_actions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, status text);
  CREATE TABLE public.student_login_streaks(student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE, days integer);
  CREATE TABLE public.stars_student_map(pixel_id text PRIMARY KEY, student_id uuid NOT NULL UNIQUE REFERENCES public.students(id));
  CREATE TABLE public.student_vocabulary_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, user_id uuid, word text);
  CREATE UNIQUE INDEX idx_sve_unique_student_word_unowned ON public.student_vocabulary_entries (student_id, word)
    WHERE ((user_id IS NULL) AND (student_id IS NOT NULL));
  CREATE TABLE public.video_reactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reactor_student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, emoji text);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  ${LANE}
`;

const SEED = `
  INSERT INTO public.families VALUES ('${FAM}', 'Fam');
  INSERT INTO public.classes VALUES ('${CLASS_A}', 'A'), ('${CLASS_B}', 'B');
  INSERT INTO public.sessions VALUES ('${S1}', '${CLASS_A}', '2026-03-02', 'Held'), ('${S2}', '${CLASS_A}', '2026-03-09', 'Held'),
    ('${S3}', '${CLASS_B}', '2026-10-05', 'Held'), ('${S4}', '${CLASS_B}', '2026-10-12', 'Held'),
    ('${S_CANCEL}', '${CLASS_A}', '2026-03-16', 'Canceled');
  -- KEEP: the current record (class B since October), no family, no login.
  -- DROP: the older record (class A in March), with family, login, phone.
  INSERT INTO public.students(id, full_name, family_id, linked_user_id, phone, is_active) VALUES
    ('${KEEP}', 'Child', NULL, NULL, NULL, true),
    ('${DROP}', 'Child', '${FAM}', '${LOGIN}', '0900', false),
    ('${OTHER}', 'Someone else', NULL, NULL, NULL, true);
  INSERT INTO public.enrollments(id, student_id, class_id, start_date, end_date, created_at) VALUES
    ('${U(51)}', '${DROP}', '${CLASS_A}', '2026-03-01', '2026-03-31', '2026-03-01 08:00+07'),
    ('${U(52)}', '${KEEP}', '${CLASS_B}', '2026-10-01', NULL, '2026-10-01 08:00+07');
  -- marks: DROP marked Present on S1 by a teacher, placeholder on S2; the seed
  -- trigger gave both their placeholders already.
  UPDATE public.attendance SET status = 'Present', marked_by = '${TEACHER}' WHERE student_id = '${DROP}' AND session_id = '${S1}';
  UPDATE public.attendance SET status = 'Absent', marked_by = '${TEACHER}' WHERE student_id = '${KEEP}' AND session_id = '${S3}';
  -- bills: March (DROP), October (both: DROP's is an empty 0 bill), November (KEEP)
  INSERT INTO public.invoices(id, student_id, month, base_amount, total_amount, recorded_payment, status, confirmation_status) VALUES
    ('${U(61)}', '${DROP}', '2026-03', 882000, 882000, 756000, 'partial', 'auto_approved'),
    ('${U(62)}', '${DROP}', '2026-10', 0, 0, 0, 'issued', 'auto_approved'),
    ('${U(63)}', '${KEEP}', '2026-10', 1890000, 1890000, 1890000, 'paid', 'auto_approved'),
    ('${U(64)}', '${KEEP}', '2026-11', 1680000, 1680000, 0, 'issued', 'auto_approved');
  INSERT INTO public.payments(id, student_id, amount, memo) VALUES ('${U(71)}', '${DROP}', 756000, 'March');
  INSERT INTO public.ledger_accounts(id, student_id, code) VALUES
    ('${U(81)}', '${DROP}', 'AR'), ('${U(82)}', '${DROP}', 'CASH'), ('${U(83)}', '${DROP}', 'BANK'),
    ('${U(84)}', '${KEEP}', 'AR'), ('${U(85)}', '${KEEP}', 'CASH');
  INSERT INTO public.ledger_entries(account_id, debit) VALUES ('${U(81)}', 882000);   -- DROP's AR has history; its CASH has none
  INSERT INTO public.point_transactions(student_id, class_id, month, points) VALUES
    ('${DROP}', '${CLASS_A}', '2026-03', 5), ('${DROP}', '${CLASS_A}', '2026-03', 3), ('${KEEP}', '${CLASS_B}', '2026-10', 7);
  INSERT INTO public.invoice_state_floor VALUES ('${DROP}', '2026-03', true);
  INSERT INTO public.ai_actions(student_id, status) VALUES ('${DROP}', 'applied');
  INSERT INTO public.student_login_streaks VALUES ('${DROP}', 4), ('${KEEP}', 9);
  INSERT INTO public.stars_student_map VALUES ('px-1', '${KEEP}');
  INSERT INTO public.student_vocabulary_entries(student_id, user_id, word) VALUES
    ('${DROP}', NULL, 'cat'), ('${DROP}', '${LOGIN}', 'dog'), ('${KEEP}', NULL, 'dog'), ('${KEEP}', NULL, 'sun');
  INSERT INTO public.video_reactions(reactor_student_id, emoji) VALUES ('${DROP}', 'star');
`;

const fresh = async () => {
  const d = new PGlite();
  await d.exec(BASE);
  await d.exec(MERGE);
  await d.exec(SEED);
  return d;
};
const merge = async (d, keep, drop, dry = true) =>
  (await d.query(`SELECT public.admin_merge_students($1, $2, $3) AS r`, [keep, drop, dry])).rows[0].r;
const all = (d, sql, p = []) => d.query(sql, p).then((x) => x.rows);
const one = async (d, sql, p = []) => (await all(d, sql, p))[0];

// Every row of every public table, for "nothing changed".
const snapshot = async (d) => {
  const tables = (await all(d, `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`)).map((r) => r.tablename);
  const out = {};
  for (const t of tables) {
    out[t] = (await all(d, `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h, count(*)::int AS n FROM public."${t}" x`))[0];
  }
  return out;
};

// =================================================================== 1
console.log('\n1. install');
{
  const d = await fresh();
  ok('the function is installed with the expected signature',
    (await one(d, `SELECT pg_get_function_identity_arguments('public.admin_merge_students(uuid,uuid,boolean)'::regprocedure) AS a`)).a
      === 'p_keep uuid, p_drop uuid, p_dry_run boolean');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    ok(`${role} cannot execute it`,
      !(await one(d, `SELECT has_function_privilege('${role}', 'public.admin_merge_students(uuid,uuid,boolean)', 'EXECUTE') AS x`)).x);
  }
  const tables = await all(d, `SELECT table_name, column_name, mode FROM public._merge_student_tables() ORDER BY 1, 2`);
  const mode = Object.fromEntries(tables.map((r) => [`${r.table_name}.${r.column_name}`, r.mode]));
  ok('every student column is discovered, with its handling', JSON.stringify(mode) === JSON.stringify({
    'ai_actions.student_id': 'stay', 'attendance.student_id': 'marks', 'enrollments.student_id': 'copy',
    'invoice_state_floor.student_id': 'stay', 'invoices.student_id': 'bills', 'ledger_accounts.student_id': 'ledger',
    'payments.student_id': 'move', 'point_transactions.student_id': 'move', 'stars_student_map.student_id': 'move',
    'student_login_streaks.student_id': 'keep_wins', 'student_points.student_id': 'derived',
    'student_vocabulary_entries.student_id': 'move', 'video_reactions.reactor_student_id': 'move',
  }), mode);
  const e = await tryIt(() => d.exec(MERGE));
  ok('pasting it twice is harmless', e === null, e);
  await d.close();
}

// =================================================================== 2
console.log('\n2. a dry run changes nothing');
{
  const d = await fresh();
  const before = await snapshot(d);
  const r = await merge(d, KEEP, DROP, true);
  const after = await snapshot(d);
  const changed = Object.keys(before).filter((t) => JSON.stringify(before[t]) !== JSON.stringify(after[t]));
  ok('dry run: ok, flagged as a dry run', r.ok === true && r.dry_run === true, r);
  ok('dry run: every table identical afterwards (rows, audit, seeded marks)', changed.length === 0, changed);
  ok('dry run: reports per-table counts', r.tables.invoices.moved === 1 && r.tables.payments.moved === 1
     && r.tables.enrollments.moved === 1 && r.tables.attendance.copied >= 1, r.tables);
  ok('dry run: names the empty October bill it would delete',
     r.bills_deleted.length === 1 && r.bills_deleted[0].month === '2026-10' && r.bills_deleted[0].of === 'drop', r.bills_deleted);
  const real = await merge(d, KEEP, DROP, false);
  const strip = (x) => JSON.stringify({ ...x, dry_run: null });
  ok('the real run does exactly what the dry run reported', strip(real) === strip(r), { dry: r, real });
  await d.close();
}

// =================================================================== 3
console.log('\n3. a merge with rows in many tables');
{
  const d = await fresh();
  const r = await merge(d, KEEP, DROP, false);
  ok('merge: ok', r.ok === true && r.dry_run === false, r);
  const cnt = async (t, c = 'student_id', id = DROP) => Number((await one(d, `SELECT count(*) n FROM public.${t} WHERE ${c} = $1`, [id])).n);

  // bills
  const bills = await all(d, `SELECT id, month, total_amount, recorded_payment FROM public.invoices WHERE student_id = $1 ORDER BY month`, [KEEP]);
  ok('bills: March moved to the kept child, the empty October bill deleted, KEEP\'s October and November stand',
     bills.map((b) => `${b.month}:${b.total_amount}/${b.recorded_payment}`).join(' ') === '2026-03:882000/756000 2026-10:1890000/1890000 2026-11:1680000/0'
     && bills[0].id === U(61) && (await cnt('invoices')) === 0, bills);
  ok('bills: no money moved or vanished', Number((await one(d, `SELECT sum(recorded_payment) s FROM public.invoices`)).s) === 756000 + 1890000);

  // enrolments, copied
  const enr = await one(d, `SELECT student_id, created_at FROM public.enrollments WHERE id = $1`, [U(51)]);
  ok('enrolment: same id and created_at, now the kept child\'s', enr?.student_id === KEEP
     && new Date(enr.created_at).toISOString() === new Date('2026-03-01T01:00:00Z').toISOString(), enr);

  // marks
  const marks = await all(d, `SELECT session_id, status, marked_by FROM public.attendance WHERE student_id = $1 ORDER BY session_id`, [KEEP]);
  const m = Object.fromEntries(marks.map((x) => [x.session_id, `${x.status}/${x.marked_by ? 'person' : 'auto'}`]));
  ok('marks: the teacher\'s Present on S1 is the kept child\'s (over the placeholder the enrolment seeded)', m[S1] === 'Present/person', m);
  ok('marks: S2 placeholder, S3 KEEP\'s own Absent, S4 placeholder', m[S2] === 'Present/auto' && m[S3] === 'Absent/person' && m[S4] === 'Present/auto', m);
  ok('marks: none left on the dropped child', (await cnt('attendance')) === 0);
  ok('marks: hec.attendance_restore is not left on', ((await one(d, `SELECT current_setting('hec.attendance_restore', true) v`)).v ?? '') !== 'on');

  // ledger
  const acc = await all(d, `SELECT id, student_id, code FROM public.ledger_accounts ORDER BY code, student_id`);
  ok('ledger: BANK moved; DROP\'s empty CASH deleted; DROP\'s AR (with an entry) left on the dropped child',
     acc.find((a) => a.id === U(83))?.student_id === KEEP && !acc.find((a) => a.id === U(82))
     && acc.find((a) => a.id === U(81))?.student_id === DROP
     && r.ledger_left_on_dropped.length === 1 && r.ledger_left_on_dropped[0].code === 'AR', { acc, left: r.ledger_left_on_dropped });

  // other tables
  ok('payments moved', (await cnt('payments')) === 0 && (await cnt('payments', 'student_id', KEEP)) === 1);
  ok('points moved, and the totals rebuilt by the trigger (not copied)',
     Number((await one(d, `SELECT total_points t FROM public.student_points WHERE student_id = $1 AND class_id = $2 AND month = '2026-03'`, [KEEP, CLASS_A])).t) === 8
     && Number((await one(d, `SELECT total_points t FROM public.student_points WHERE student_id = $1 AND month = '2026-03'`, [DROP])).t) === 0);
  ok('caches: KEEP\'s login streak stands, DROP\'s is gone',
     (await one(d, `SELECT days FROM public.student_login_streaks WHERE student_id = $1`, [KEEP])).days === 9 && (await cnt('student_login_streaks')) === 0);
  ok('words: the partial unique index lets an owned word through (dog by a login) and the unowned cat moves',
     (await cnt('student_vocabulary_entries')) === 0 && (await cnt('student_vocabulary_entries', 'student_id', KEEP)) === 4);
  ok('a foreign key with another name (video_reactions.reactor_student_id) moved',
     (await cnt('video_reactions', 'reactor_student_id')) === 0 && r.tables['video_reactions.reactor_student_id']?.moved === 1, r.tables);
  ok('stay: ai_actions and invoice_state_floor still name the dropped child',
     (await cnt('ai_actions')) === 1 && (await cnt('invoice_state_floor')) === 1
     && r.stayed_with_dropped.ai_actions?.rows === 1 && r.stayed_with_dropped.invoice_state_floor?.rows === 1, r.stayed_with_dropped);

  // the students rows
  const k = await one(d, `SELECT * FROM public.students WHERE id = $1`, [KEEP]);
  const x = await one(d, `SELECT * FROM public.students WHERE id = $1`, [DROP]);
  ok('kept child took the family, the login and the phone', k.family_id === FAM && k.linked_user_id === LOGIN && k.phone === '0900', k);
  ok('dropped child: still there, inactive, no login, a note naming the kept one',
     x && x.is_active === false && x.linked_user_id === null && x.notes.startsWith(`Merged into ${KEEP}`), x);
  const a = await all(d, `SELECT entity, entity_id, action, diff FROM public.audit_log WHERE action = 'merge_students'`);
  ok('one audit row, with the report', a.length === 1 && a[0].entity_id === KEEP && a[0].diff.drop === DROP, a);
  ok('someone else\'s rows untouched', Number((await one(d, `SELECT count(*) n FROM public.students WHERE id = $1 AND is_active`, [OTHER])).n) === 1);

  // merging again: nothing left to move
  const again = await merge(d, KEEP, DROP, true);
  ok('a second dry run finds nothing left but what stays', again.ok && (again.tables.invoices.moved === 0) && !again.tables.payments, again.tables);
  await d.close();
}

// =================================================================== 4
console.log('\n4. same-month bills');
{
  const d = await fresh();
  await d.exec(`UPDATE public.invoices SET base_amount = 945000, total_amount = 945000, recorded_payment = 5252000 WHERE id = '${U(62)}'`);
  const before = await snapshot(d);
  const r = await merge(d, KEEP, DROP, true);
  ok('dry run: refused, with the month and both sides', r.ok === false && r.refusals.length === 1
     && r.refusals[0].reason === 'same_month_money' && r.refusals[0].month === '2026-10'
     && r.refusals[0].drop.recorded_payment === 5252000 && r.refusals[0].keep.total === 1890000, r);
  const e = await tryIt(() => merge(d, KEEP, DROP, false));
  ok('real run: raises HCM01 with the same list', e?.code === 'HCM01' && /same_month_money/.test(e.detail ?? ''), e);
  const after = await snapshot(d);
  ok('nothing changed', Object.keys(before).every((t) => JSON.stringify(before[t]) === JSON.stringify(after[t])));
  await d.close();
}
{
  const d = await fresh();
  // money only on the dropped side: KEEP's October bill is the empty one now
  await d.exec(`UPDATE public.invoices SET base_amount = 0, total_amount = 0, recorded_payment = 0, status = 'issued' WHERE id = '${U(63)}';
                UPDATE public.invoices SET base_amount = 1470000, total_amount = 1470000, recorded_payment = 1470000, status = 'paid' WHERE id = '${U(62)}'`);
  const r = await merge(d, KEEP, DROP, false);
  const oct = await one(d, `SELECT id, recorded_payment FROM public.invoices WHERE student_id = $1 AND month = '2026-10'`, [KEEP]);
  ok('an empty bill on the KEPT side gives way to the dropped child\'s paid one', r.ok && oct.id === U(62) && oct.recorded_payment === 1470000
     && r.bills_deleted[0].of === 'keep', { r: r.bills_deleted, oct });
  await d.close();
}
for (const [what, sql] of [
  ['frozen', `UPDATE public.invoices SET tuition_frozen = true WHERE id = '${U(62)}'`],
  ['confirmed by a person', `UPDATE public.invoices SET confirmation_status = 'confirmed' WHERE id = '${U(62)}'`],
  ['a 1-dong payment', `UPDATE public.invoices SET recorded_payment = 1 WHERE id = '${U(62)}'`],
]) {
  const d = await fresh();
  await d.exec(sql);
  const r = await merge(d, KEEP, DROP, true);
  ok(`a zero bill that is ${what} counts as money: refused`, r.ok === false && r.refusals[0]?.reason === 'same_month_money', r);
  await d.close();
}

// =================================================================== 5
console.log('\n5. other refusals');
{
  const d = await fresh();
  await d.exec(`INSERT INTO public.enrollments(student_id, class_id, start_date, end_date) VALUES ('${KEEP}', '${CLASS_A}', '2026-03-01', '2026-03-20');
                UPDATE public.attendance SET status = 'Absent', marked_by = '${TEACHER}' WHERE student_id = '${KEEP}' AND session_id = '${S1}'`);
  const r = await merge(d, KEEP, DROP, true);
  ok('different marks by people on one lesson: refused', r.ok === false && r.refusals.some((x) => x.reason === 'different_marks' && x.session_id === S1), r);
  await d.exec(`UPDATE public.attendance SET status = 'Present' WHERE student_id = '${KEEP}' AND session_id = '${S1}'`);
  const r2 = await merge(d, KEEP, DROP, false);
  ok('the same mark on both: fine, one row kept', r2.ok && r2.tables.attendance.same_mark === 1
     && Number((await one(d, `SELECT count(*) n FROM public.attendance WHERE session_id = $1 AND student_id IN ($2, $3)`, [S1, KEEP, DROP])).n) === 1, r2.tables.attendance);
  await d.close();
}
{
  const d = await fresh();
  await d.exec(`INSERT INTO public.stars_student_map VALUES ('px-2', '${DROP}')`);
  const r = await merge(d, KEEP, DROP, true);
  ok('both children linked to Pixel Pal: refused as a unique clash', r.ok === false
     && r.refusals.some((x) => x.table === 'stars_student_map' && x.reason === 'unique_clash' && x.rows === 1), r);
  await d.close();
}
{
  const d = await fresh();
  await d.exec(`INSERT INTO public.student_vocabulary_entries(student_id, user_id, word) VALUES ('${DROP}', NULL, 'sun')`);
  const r = await merge(d, KEEP, DROP, true);
  ok('the same unowned word on both (partial unique index): refused', r.ok === false
     && r.refusals.some((x) => x.table === 'student_vocabulary_entries' && x.rows === 1), r);
  await d.close();
}
{
  const d = await fresh();
  // a row from before the guard existed
  await d.exec(`ALTER TABLE public.attendance DISABLE TRIGGER USER;
                INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ('${S_CANCEL}', '${DROP}', 'Present', '${TEACHER}');
                ALTER TABLE public.attendance ENABLE TRIGGER USER;`);
  const r = await merge(d, KEEP, DROP, true);
  ok('a legacy Present on a cancelled lesson: refused before anything is written',
     r.ok === false && r.refusals.some((x) => x.reason === 'cancelled_lesson_not_excused'), r);
  await d.close();
}
{
  const d = await fresh();
  let e = await tryIt(() => merge(d, KEEP, KEEP, true));
  ok('the same child twice: refused (22023)', e?.code === '22023', e);
  e = await tryIt(() => merge(d, KEEP, U(99), true));
  ok('a child that does not exist: refused (P0002)', e?.code === 'P0002', e);
  await d.exec(`SET test.uid = '${TEACHER}'`);
  e = await tryIt(() => merge(d, KEEP, DROP, true));
  ok('a signed-in non-admin: refused (HCM03)', e?.code === 'HCM03', e);
  await d.exec(`SET test.uid = '${ADMIN}'`);
  const r = await merge(d, KEEP, DROP, true);
  ok('a signed-in admin: allowed (dry run)', r.ok === true, r);
  await d.exec(`RESET test.uid; SET test.role = 'service_role'`);
  e = await tryIt(() => merge(d, KEEP, DROP, true));
  ok('the service role: refused (HCM03)', e?.code === 'HCM03', e);
  await d.close();
}

// =================================================================== 6
console.log('\n6. a table added after the migration');
{
  const d = await fresh();
  await d.exec(`CREATE TABLE public.reading_logs(id serial PRIMARY KEY, student_id uuid NOT NULL REFERENCES public.students(id), pages int);
                INSERT INTO public.reading_logs(student_id, pages) VALUES ('${DROP}', 10), ('${DROP}', 12), ('${KEEP}', 3);
                CREATE TABLE public.badges(student_id uuid NOT NULL, badge text NOT NULL, UNIQUE (student_id, badge));
                INSERT INTO public.badges VALUES ('${DROP}', 'gold'), ('${DROP}', 'silver'), ('${KEEP}', 'silver');`);
  const dry = await merge(d, KEEP, DROP, true);
  ok('a new table with a clash is refused by name', dry.ok === false && dry.refusals.some((x) => x.table === 'badges' && x.rows === 1), dry);
  await d.exec(`DELETE FROM public.badges WHERE student_id = '${DROP}' AND badge = 'silver'`);
  const r = await merge(d, KEEP, DROP, false);
  ok('a new table is moved without anyone listing it', r.ok && r.tables.reading_logs?.moved === 2 && r.tables.badges?.moved === 1
     && Number((await one(d, `SELECT count(*) n FROM public.reading_logs WHERE student_id = $1`, [KEEP])).n) === 3, r.tables);
  await d.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
