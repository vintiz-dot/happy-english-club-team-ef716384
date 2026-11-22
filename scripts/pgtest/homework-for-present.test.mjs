// Homework for the children who were in the lesson (20261122150000).
//
// `homeworks.student_ids` NULL is the whole class, as before. With a list, only
// the named children (and their families) read the homework, its files and its
// place in get_student_homeworks / get_student_weekly_stats, get told about it,
// and can hand it in; a classmate who missed the lesson sees none of it. Staff of
// the class still see every homework. The list holds only children of the class.
// The migration applies twice.
//
// The stand-ins below are production's tables and policies as far as these
// rules read them (pg_policies, 22 Nov 2026).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const MIG = MIGS.find((f) => f.includes("20261122150000_homework_for_present"));
if (!MIG) { console.log("usage: homework-for-present.test.mjs <20261122150000_homework_for_present.sql>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const PRELUDE = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE TYPE public.app_role AS ENUM ('admin','teacher','student','family');
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
  $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_id uuid);
CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, teacher_id uuid, date date DEFAULT CURRENT_DATE, status text DEFAULT 'Scheduled');
CREATE FUNCTION public.is_teacher_of_class(_uid uuid, _class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
  $f$ SELECT EXISTS (SELECT 1 FROM public.classes c JOIN public.teachers t ON t.id = c.default_teacher_id WHERE c.id = _class AND t.user_id = _uid) $f$;
CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, linked_user_id uuid, family_id uuid);
CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, start_date date DEFAULT CURRENT_DATE, end_date date);
CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, student_id uuid, status text);
CREATE TABLE public.point_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, points int, date date);
CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, type text, title text, message text, metadata jsonb);
CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, title text NOT NULL, body text, due_date date,
  created_by uuid, created_at timestamptz DEFAULT now());
CREATE TABLE public.homework_files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid, file_name text, storage_key text, size_bytes int);
CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid, student_id uuid, status text DEFAULT 'submitted',
  grade text, teacher_feedback text, submission_text text, file_name text, storage_key text, submitted_at timestamptz DEFAULT now(), graded_at timestamptz,
  celebration_seen_at timestamptz);
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY hw_admin_all ON public.homeworks USING (has_role(auth.uid(), 'admin'));
CREATE POLICY hw_teacher_all ON public.homeworks USING (is_teacher_of_class(auth.uid(), class_id));
CREATE POLICY hw_student_read ON public.homeworks FOR SELECT USING (true); -- the old one, replaced
CREATE POLICY hwf_teacher_all ON public.homework_files USING (EXISTS (SELECT 1 FROM homeworks h WHERE h.id = homework_files.homework_id AND is_teacher_of_class(auth.uid(), h.class_id)));
CREATE POLICY hwf_student_read ON public.homework_files FOR SELECT USING (true);
CREATE POLICY "Students can view own submissions" ON public.homework_submissions FOR SELECT USING (
  student_id IN (SELECT s.id FROM students s WHERE s.linked_user_id = auth.uid())
  OR student_id IN (SELECT s.id FROM students s WHERE s.family_id IN (SELECT f.id FROM families f WHERE f.primary_user_id = auth.uid())));
CREATE POLICY "Students can insert own submissions" ON public.homework_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY hw_sub_teacher_all ON public.homework_submissions TO authenticated USING (EXISTS (SELECT 1 FROM homeworks h WHERE h.id = homework_submissions.homework_id AND is_teacher_of_class(auth.uid(), h.class_id)));
CREATE FUNCTION public.notify_homework_assigned() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER trigger_notify_homework_assigned AFTER INSERT ON public.homeworks FOR EACH ROW EXECUTE FUNCTION public.notify_homework_assigned();
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(MIG, "utf8"));
ok("applies", true);
{
  let again = null;
  try { await db.exec(readFileSync(MIG, "utf8")); } catch (e) { again = e.message; }
  ok("applies a second time", again === null, again ?? "");
}
await db.exec(`GRANT EXECUTE ON FUNCTION public.get_student_homeworks(uuid), public.get_student_weekly_stats(uuid, date, date) TO authenticated`);

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const TEACHER = U(1), KIDA = U(2), KIDB = U(3), PARENTB = U(4), PARENTAC = U(5), KIDZ = U(6);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[TEACHER, KIDA, KIDB, PARENTB, PARENTAC, KIDZ]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'teacher'),($2,'student'),($3,'student'),($4,'family'),($5,'family'),($6,'student')`,
  [TEACHER, KIDA, KIDB, PARENTB, PARENTAC, KIDZ]);
const t = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEACHER])).id;
const SKY = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Sky', $1) RETURNING id`, [t])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name) VALUES ('Pluto') RETURNING id`)).id;
const famB = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [PARENTB])).id;
const famAC = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [PARENTAC])).id;
const kid = async (name, cls, login, fam) => {
  const id = (await one(`INSERT INTO public.students (full_name, linked_user_id, family_id) VALUES ($1,$2,$3) RETURNING id`, [name, login, fam])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
// A was in the lesson; B missed it. C is A's sibling in the same class, also absent. Z is another class.
const A = await kid("Kid A", SKY, KIDA, famAC), B = await kid("Kid B", SKY, KIDB, famB), C = await kid("Kid C", SKY, null, famAC);
const Z = await kid("Kid Z", PLUTO, KIDZ, null);

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows;
const post = (title, ids) => as(TEACHER, () => db.query(`INSERT INTO public.homeworks (class_id, title, student_ids) VALUES ($1,$2,$3) RETURNING id`, [SKY, title, ids]))
  .then((r) => r.rows[0].id);

console.log("whole class (no list), as before");
const ALL = await post("Whole class", null);
for (const [who, uid] of [["child A", KIDA], ["child B", KIDB], ["B's family", PARENTB]])
  eq(`${who} reads it`, (await rowsAs(uid, `SELECT title FROM public.homeworks WHERE id = $1`, [ALL])).length, 1);
eq("another class's child does not", (await rowsAs(KIDZ, `SELECT 1 FROM public.homeworks WHERE id = $1`, [ALL])).length, 0);

console.log("for the children present");
const PRESENT = await post("Present only", [A]);
await q(`INSERT INTO public.homework_files (homework_id, file_name) VALUES ($1,'sheet.pdf')`, [PRESENT]);
eq("child A (present) reads it", (await rowsAs(KIDA, `SELECT 1 FROM public.homeworks WHERE id = $1`, [PRESENT])).length, 1);
eq("child B (absent) does not", (await rowsAs(KIDB, `SELECT 1 FROM public.homeworks WHERE id = $1`, [PRESENT])).length, 0);
eq("nor B's family", (await rowsAs(PARENTB, `SELECT 1 FROM public.homeworks WHERE id = $1`, [PRESENT])).length, 0);
eq("A's family reads it (A is theirs)", (await rowsAs(PARENTAC, `SELECT 1 FROM public.homeworks WHERE id = $1`, [PRESENT])).length, 1);
eq("the teacher of the class reads it", (await rowsAs(TEACHER, `SELECT 1 FROM public.homeworks WHERE id = $1`, [PRESENT])).length, 1);
eq("its files: A yes, B no", [(await rowsAs(KIDA, `SELECT 1 FROM public.homework_files WHERE homework_id = $1`, [PRESENT])).length,
  (await rowsAs(KIDB, `SELECT 1 FROM public.homework_files WHERE homework_id = $1`, [PRESENT])).length], [1, 0]);

const listed = async (uid, sid) => (await rowsAs(uid, `SELECT public.get_student_homeworks($1) AS r`, [sid]))[0].r.homeworks.map((h) => h.title).sort();
eq("get_student_homeworks for A lists both", await listed(KIDA, A), ["Present only", "Whole class"]);
eq("get_student_homeworks for B leaves it out", await listed(KIDB, B), ["Whole class"]);
eq("for C, A's absent sibling, the family's call leaves it out too", await listed(PARENTAC, C), ["Whole class"]);
const weekly = async (uid, sid) => Number((await rowsAs(uid, `SELECT public.get_student_weekly_stats($1, CURRENT_DATE - 7, CURRENT_DATE) AS r`, [sid]))[0].r.total_homeworks);
eq("weekly stats count it for A only", [await weekly(KIDA, A), await weekly(KIDB, B)], [2, 1]);

const handIn = (uid, sid, hw) => tryAs(uid, () => db.query(`INSERT INTO public.homework_submissions (homework_id, student_id) VALUES ($1,$2)`, [hw, sid]));
eq("A hands it in", await handIn(KIDA, A, PRESENT), null);
refused("B cannot hand in work not set for them", await handIn(KIDB, B, PRESENT), /row-level security/);
refused("nor can A's family for C", await handIn(PARENTAC, C, PRESENT), /row-level security/);
eq("B still hands in the whole-class one", await handIn(KIDB, B, ALL), null);
refused("a child cannot hand in for another child", await handIn(KIDB, A, ALL), /row-level security/);

console.log("who is told");
const told = async (hw) => (await q(`SELECT user_id FROM public.notifications WHERE metadata->>'homework_id' = $1 ORDER BY user_id`, [hw])).map((r) => r.user_id);
eq("the whole-class one tells every login in the class", await told(ALL), [KIDA, KIDB, PARENTAC].sort());
eq("the present-only one tells A only", await told(PRESENT), [KIDA]);

console.log("the list holds the class's children only");
refused("a child of another class", await tryAs(TEACHER, () => db.query(`INSERT INTO public.homeworks (class_id, title, student_ids) VALUES ($1,'x',$2)`, [SKY, [Z]])), /not enrolled in this class/);
refused("the same child twice", await tryAs(TEACHER, () => db.query(`INSERT INTO public.homeworks (class_id, title, student_ids) VALUES ($1,'x',$2)`, [SKY, [A, A]])), /repeats a child/);
refused("an empty list (use NULL for the whole class)", await tryAs(TEACHER, () => db.query(`INSERT INTO public.homeworks (class_id, title, student_ids) VALUES ($1,'x','{}')`, [SKY])), /homeworks_student_ids_nonempty/);
refused("moving it to another class keeps the check", await tryAs(TEACHER, () => db.query(`UPDATE public.homeworks SET class_id = $1 WHERE id = $2`, [PLUTO, PRESENT])), /not enrolled in this class|row-level security|0 rows/);
eq("homework_is_for: NULL is everyone", (await one(`SELECT public.homework_is_for(NULL, $1) AS v`, [B])).v, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
