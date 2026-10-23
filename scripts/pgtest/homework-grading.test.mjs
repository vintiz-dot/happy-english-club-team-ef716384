// Homework grading, and the four ways it was wrong.
//
// Drives supabase/migrations/20261023090000 against a database that
// already holds the damage: a child graded twice for one homework, and a
// rollup that was never told about a deletion.
//
// The assertions that matter are the TOTALS, not the row counts. Every
// one of these faults showed up as a number on a leaderboard that no
// adult could explain, so the leaderboard figure is the thing to check.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');

  CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    default_teacher_user uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.homeworks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    due_date date,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.homework_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'submitted',
    grade text, teacher_feedback text, graded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    homework_id uuid REFERENCES public.homeworks(id) ON DELETE CASCADE,
    homework_title text, session_id uuid, notes text,
    points integer NOT NULL, type text NOT NULL,
    date date NOT NULL, month text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    CONSTRAINT point_transactions_type_check CHECK (type IN
      ('homework','participation','adjustment','correction','reading_theory','vocabulary_quiz')));
  CREATE TABLE public.student_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0,
    participation_points integer NOT NULL DEFAULT 0,
    reading_theory_points integer NOT NULL DEFAULT 0,
    vocabulary_quiz_points integer NOT NULL DEFAULT 0,
    total_points integer GENERATED ALWAYS AS
      (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, class_id, month));

  -- The trigger exactly as it stood: INSERT OR UPDATE, no DELETE.
  CREATE FUNCTION public.update_student_points_from_transaction() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  DECLARE v_month text; v_hw int; v_part int;
  BEGIN
    v_month := to_char(NEW.date, 'YYYY-MM');
    SELECT COALESCE(SUM(CASE WHEN type='homework' THEN points ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type IN ('participation','adjustment','correction') THEN points ELSE 0 END),0)
      INTO v_hw, v_part
    FROM point_transactions
    WHERE student_id=NEW.student_id AND class_id=NEW.class_id AND to_char(date,'YYYY-MM')=v_month;
    INSERT INTO student_points (student_id, class_id, month, homework_points, participation_points)
    VALUES (NEW.student_id, NEW.class_id, v_month, v_hw, v_part)
    ON CONFLICT (student_id, class_id, month) DO UPDATE
      SET homework_points=v_hw, participation_points=v_part, updated_at=now();
    RETURN NEW;
  END $f$;
  CREATE TRIGGER trigger_update_points_from_transaction
    AFTER INSERT OR UPDATE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_student_points_from_transaction();

  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT current_setting('test.role', true) = _role::text $f$;
  -- The real one is roster-or-cover (20261007120000). Here: the teacher
  -- named on the class. Enough to prove the policy consults it.
  CREATE FUNCTION public.is_teacher_of_class(_user_id uuid, _class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c
                       WHERE c.id = _class_id AND c.default_teacher_user = _user_id) $f$;

  -- The real policies (20251107052426). Without these the permission
  -- assertions below pass against a table with no security on it, which
  -- is how a test says "allowed" about something it never checked.
  ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY pt_admin ON public.point_transactions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY pt_teacher ON public.point_transactions FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id))
    WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

const db = new PGlite();
await db.exec(PRELUDE);

const one = async (q, p) => (await db.query(q, p)).rows[0];
const teacherUser = "11111111-1111-1111-1111-111111111111";
const otherUser = "22222222-2222-2222-2222-222222222222";
await db.query(`INSERT INTO auth.users (id) VALUES ($1), ($2)`, [teacherUser, otherUser]);

const cls = (await one(`INSERT INTO public.classes (name, default_teacher_user)
                        VALUES ('Stars', $1) RETURNING id`, [teacherUser])).id;
const minh = (await one(`INSERT INTO public.students (full_name) VALUES ('Minh') RETURNING id`)).id;
const an = (await one(`INSERT INTO public.students (full_name) VALUES ('An') RETURNING id`)).id;
const hw = (await one(`INSERT INTO public.homeworks (class_id, title, due_date)
                       VALUES ($1,'Unit 4','2026-09-20') RETURNING id`, [cls])).id;

const award = (student, points, when) => db.query(
  `INSERT INTO public.point_transactions
     (student_id, class_id, homework_id, homework_title, points, type, date, month, created_at)
   VALUES ($1,$2,$3,'Unit 4',$4,'homework','2026-09-20','2026-09',$5)`,
  [student, cls, hw, points, when]);

const totals = async (student) => await one(
  `SELECT homework_points, participation_points, total_points FROM public.student_points
    WHERE student_id=$1 AND class_id=$2 AND month='2026-09'`, [student, cls]);

// ------------------------------------------------ the damage, as it is
console.log("=== before the migration: the bugs are real ===");
await award(minh, 6, "2026-09-21T10:00:00Z");   // graded
await award(minh, 8, "2026-09-22T10:00:00Z");   // re-graded after a correction
{
  const t = await totals(minh);
  eq("re-grading pays twice - 6 and 8 both stand", t.homework_points, 14);
}
await db.query(`INSERT INTO public.point_transactions
  (student_id, class_id, points, type, date, month) VALUES ($1,$2,10,'participation','2026-09-05','2026-09')`,
  [an, cls]);
await db.query(`DELETE FROM public.point_transactions WHERE student_id=$1 AND type='participation'`, [an]);
{
  const t = await totals(an);
  eq("deleting an entry leaves the rollup overstated", t.participation_points, 10);
}

// ------------------------------------------------------ apply it twice
console.log("=== the migration ===");
await db.exec(sql());
ok("applies", true);
let again = null;
try { await db.exec(sql()); } catch (e) { again = e.message; }
ok("and applies a second time unchanged", again === null, again ?? "");

console.log("=== what it repaired ===");
{
  const t = await totals(minh);
  eq("the duplicate award is collapsed to the grade the teacher meant", t.homework_points, 8);
  const n = await one(`SELECT count(*)::int c FROM public.point_transactions
                        WHERE student_id=$1 AND homework_id=$2 AND type='homework'`, [minh, hw]);
  eq("  one row, not two", n.c, 1);
  const kept = await one(`SELECT points FROM public.point_transactions
                           WHERE student_id=$1 AND homework_id=$2`, [minh, hw]);
  eq("  and it is the newer one", kept.points, 8);
}
{
  const t = await totals(an);
  eq("the deleted entry is given back", t.participation_points, 0);
}

console.log("=== deleting now works ===");
{
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, points, type, date, month) VALUES ($1,$2,7,'participation','2026-09-06','2026-09')`,
    [an, cls]);
  eq("awarded", (await totals(an)).participation_points, 7);
  await db.query(`DELETE FROM public.point_transactions WHERE student_id=$1 AND type='participation'`, [an]);
  eq("  and taken back when the entry is deleted", (await totals(an)).participation_points, 0);
}
{
  // Moving a row between months left the old month overstated too.
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, points, type, date, month) VALUES ($1,$2,4,'participation','2026-09-07','2026-09')`,
    [an, cls]);
  await db.query(`UPDATE public.point_transactions SET date='2026-10-07', month='2026-10'
                   WHERE student_id=$1 AND type='participation'`, [an]);
  eq("moving an entry to another month empties the old one", (await totals(an)).participation_points, 0);
  const oct = await one(`SELECT participation_points FROM public.student_points
                          WHERE student_id=$1 AND month='2026-10'`, [an]);
  eq("  and fills the new one", oct.participation_points, 4);
}

console.log("=== awarding through the one function ===");
{
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [teacherUser]);
  await db.query(`SELECT set_config('test.role', 'teacher', false)`);

  await db.query(`SELECT public.award_homework_points($1,$2,9,'A')`, [an, hw]);
  eq("a teacher can award for their own class", (await totals(an)).homework_points, 9);

  await db.query(`SELECT public.award_homework_points($1,$2,5,'C')`, [an, hw]);
  eq("re-grading REPLACES rather than adds", (await totals(an)).homework_points, 5);
  const n = await one(`SELECT count(*)::int c FROM public.point_transactions
                        WHERE student_id=$1 AND homework_id=$2 AND type='homework'`, [an, hw]);
  eq("  still one row", n.c, 1);

  const row = await one(`SELECT date::text, month FROM public.point_transactions
                          WHERE student_id=$1 AND homework_id=$2`, [an, hw]);
  eq("attributed to the due date, not the marking date", row.date, "2026-09-20");
  eq("  and the month follows it", row.month, "2026-09");
  await db.exec(`RESET ROLE`);
}
{
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [otherUser]);
  let err = null;
  try { await db.query(`SELECT public.award_homework_points($1,$2,99,'A')`, [minh, hw]); }
  catch (e) { err = e.message; }
  ok("a teacher of another class cannot award into this one", err !== null, err ?? "it was allowed");
  await db.exec(`RESET ROLE`);
}

console.log("=== one award per child per homework, enforced ===");
{
  let err = null;
  try { await award(minh, 3, "2026-09-25T10:00:00Z"); } catch (e) { err = e.message; }
  ok("a second blind insert is refused by the index", err !== null && /unique|duplicate/i.test(err ?? ""),
     err ?? "it was allowed");
  eq("  and the total is untouched", (await totals(minh)).homework_points, 8);
}
{
  // Participation rows carry no homework_id, so the partial index must
  // not catch them - a child can be awarded participation many times.
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, points, type, date, month) VALUES ($1,$2,1,'participation','2026-09-08','2026-09')`,
    [minh, cls]);
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, points, type, date, month) VALUES ($1,$2,2,'participation','2026-09-09','2026-09')`,
    [minh, cls]);
  eq("participation is still awarded as often as earned", (await totals(minh)).participation_points, 3);
}

console.log("=== the early bird bonus ===");
{
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, homework_id, points, type, date, month, notes)
    VALUES ($1,$2,$3,5,'early_submission','2026-09-20','2026-09','Early submission bonus')`,
    [minh, cls, hw]);
  ok("early_submission is an allowed type at last", true);
  eq("  and counts toward participation", (await totals(minh)).participation_points, 8);

  // Reversing it is a second row of the same type - the partial index
  // covers homework awards only, so this must still be possible.
  await db.query(`INSERT INTO public.point_transactions
    (student_id, class_id, homework_id, points, type, date, month, notes)
    VALUES ($1,$2,$3,-5,'early_submission','2026-09-20','2026-09','Reversed')`,
    [minh, cls, hw]);
  eq("and reversing it nets back to nothing", (await totals(minh)).participation_points, 3);
}

console.log("=== teachers may grade, and it is written down ===");
{
  const pol = await db.query(`SELECT polname FROM pg_policy
    WHERE polrelid='public.homework_submissions'::regclass AND polname='hw_sub_teacher_all'`);
  ok("the teacher policy exists in the tree now", pol.rows.length === 1);

  await db.query(`INSERT INTO public.homework_submissions (homework_id, student_id) VALUES ($1,$2)`, [hw, minh]);
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [teacherUser]);
  await db.query(`UPDATE public.homework_submissions SET grade='A', status='graded' WHERE homework_id=$1`, [hw]);
  const g = await one(`SELECT grade FROM public.homework_submissions WHERE homework_id=$1`, [hw]);
  eq("the class's teacher can write a grade", g.grade, "A");

  await db.query(`SELECT set_config('test.uid', $1, false)`, [otherUser]);
  await db.query(`UPDATE public.homework_submissions SET grade='F' WHERE homework_id=$1`, [hw]);
  await db.exec(`RESET ROLE`);
  const after = await one(`SELECT grade FROM public.homework_submissions WHERE homework_id=$1`, [hw]);
  eq("  and a teacher of another class cannot", after.grade, "A");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
