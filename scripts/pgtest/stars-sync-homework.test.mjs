// Stars sync: homework and grades, against the real migrations in order.
//
// The engine as production has it runs first and keeps a homework record as
// unsupported; 20261104090000 is then pasted over that, as it will be. What
// matters is what ends up on the homework, the child's grade and their
// points total, so that is what most of this asserts.
//
// The hazards it is written around: a re-grade paying twice, a person's
// grade being overwritten, a late record undoing a newer one, withdrawing a
// homework taking children's grades with it, a morning of notifications
// about homework that was due weeks ago.
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
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');

  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, PRIMARY KEY (user_id, role));
  CREATE TABLE public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true, user_id uuid);
  CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    default_teacher_id uuid REFERENCES public.teachers(id), schedule_template jsonb DEFAULT '{}'::jsonb);
  CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, linked_user_id uuid);
  CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL, end_date date, allowed_days int[]);
  CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id), teacher_id uuid REFERENCES public.teachers(id),
    date date NOT NULL, start_time time NOT NULL DEFAULT '09:00', end_time time NOT NULL DEFAULT '09:50',
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id), student_id uuid NOT NULL REFERENCES public.students(id),
    status text NOT NULL DEFAULT 'Present', notes text, marked_by uuid, marked_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id));
  CREATE TABLE public.homeworks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id),
    title text NOT NULL, body text, due_date date, created_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE public.homework_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id), status text NOT NULL DEFAULT 'submitted',
    grade text, teacher_feedback text, graded_at timestamptz, submission_text text,
    UNIQUE (homework_id, student_id));
  CREATE TABLE public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    homework_id uuid REFERENCES public.homeworks(id) ON DELETE SET NULL, homework_title text, session_id uuid, notes text,
    points integer NOT NULL, type text NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
    month text NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'),
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    CONSTRAINT point_transactions_type_check CHECK (type IN
      ('homework','participation','adjustment','correction','reading_theory','vocabulary_quiz')));
  CREATE TABLE public.student_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL, class_id uuid NOT NULL, month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0, participation_points integer NOT NULL DEFAULT 0,
    reading_theory_points integer NOT NULL DEFAULT 0, vocabulary_quiz_points integer NOT NULL DEFAULT 0,
    total_points integer GENERATED ALWAYS AS
      (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED,
    updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, class_id, month));
  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, type text, title text, message text, metadata jsonb);

  -- As production has them: 20251030171143 and 20260107053449.
  CREATE FUNCTION public.notify_homework_assigned() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $f$
  DECLARE v record;
  BEGIN
    FOR v IN SELECT DISTINCT s.linked_user_id FROM enrollments e JOIN students s ON s.id = e.student_id
              WHERE e.class_id = NEW.class_id AND s.linked_user_id IS NOT NULL LOOP
      INSERT INTO notifications (user_id, type, title, metadata)
      VALUES (v.linked_user_id, 'homework_assigned', NEW.title, jsonb_build_object('homework_id', NEW.id));
    END LOOP;
    RETURN NEW;
  END $f$;
  CREATE TRIGGER trigger_notify_homework_assigned AFTER INSERT ON public.homeworks
    FOR EACH ROW EXECUTE FUNCTION public.notify_homework_assigned();
  CREATE FUNCTION public.validate_homework_point_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $f$
  DECLARE v date;
  BEGIN
    IF NEW.type = 'homework' AND NEW.homework_id IS NOT NULL THEN
      SELECT due_date INTO v FROM homeworks WHERE id = NEW.homework_id;
      IF v IS NOT NULL THEN NEW.date := v; NEW.month := to_char(v, 'YYYY-MM'); END IF;
    END IF;
    RETURN NEW;
  END $f$;
  CREATE TRIGGER validate_homework_point_date BEFORE INSERT OR UPDATE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.validate_homework_point_transaction();

  -- The old delete trigger, which 20261027100000 drops.
  CREATE FUNCTION public.recalculate_student_points_on_delete() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN OLD; END $f$;
  CREATE TRIGGER trigger_recalculate_points_on_delete AFTER DELETE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_student_points_on_delete();

  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE AS $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $f$;
  CREATE FUNCTION public.class_slots_on(p_class uuid, p_date date) RETURNS jsonb
    LANGUAGE sql STABLE AS $f$ SELECT '[]'::jsonb $f$;
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS $f$
    SELECT EXISTS (SELECT 1 FROM public.classes c JOIN public.teachers t ON t.id=c.default_teacher_id
                    WHERE c.id=is_teacher_of_class.class_id AND t.user_id=is_teacher_of_class.user_id AND t.is_active) $f$;

  GRANT USAGE ON SCHEMA public TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const db = new PGlite();
await db.exec(PRELUDE);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;

// ---------------------------------------------------------------- people
const U = { mai: "11111111-1111-4111-8111-111111111111", linh: "22222222-2222-4222-8222-222222222222",
            admin: "33333333-3333-4333-8333-333333333333", kid: "44444444-4444-4444-8444-444444444444" };
for (const u of Object.values(U)) await db.query(`INSERT INTO auth.users VALUES ($1)`, [u]);
await db.query(`INSERT INTO public.user_roles VALUES ($1,'teacher'),($2,'teacher'),($3,'admin')`, [U.mai, U.linh, U.admin]);
const teacher = async (name, uid) => (await one(`INSERT INTO public.teachers (full_name,user_id) VALUES ($1,$2) RETURNING id`, [name, uid])).id;
const mai = await teacher("Mai", U.mai);
const linh = await teacher("Linh", U.linh);
const klass = async (name, t) => (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ($1,$2) RETURNING id`, [name, t])).id;
const STARS = await klass("Stars", mai);
const COMETS = await klass("Comets", linh);
const child = async (name, cls, linked = null) => {
  const id = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ($1,$2) RETURNING id`, [name, linked])).id;
  if (cls) await db.query(`INSERT INTO public.enrollments (student_id,class_id,start_date) VALUES ($1,$2,'2026-09-01')`, [id, cls]);
  return id;
};
const APPLE = await child("Apple", STARS, U.kid);
const JOHNNY = await child("Johnny", STARS);
const KAKA = await child("Kaka", STARS);
const STRAY = await child("Not in Stars", null);
const LATER = await child("Late Linker", STARS);

const TODAY = "2026-11-04";
const NOW = "2026-11-04T03:00:00Z";

// ------------------------------------------------------------ the old engine
const paste = (file) => db.exec(readFileSync(file, "utf8"));
for (const file of MIGS.slice(0, -1)) await paste(file);
await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1, enabled=true, sync_from='2026-09-15'`, [mai]);
await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('19',$1),('44',$2)`, [STARS, COMETS]);
await db.query(`INSERT INTO public.stars_student_map (stars_student_id, student_id) VALUES
  ('88',$1),('89',$2),('90',$3),('77',$4)`, [APPLE, JOHNNY, KAKA, STRAY]);

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ev = (seq, kind, payload, over = {}) => ({
  seq, event_id: id(seq), occurred_at: NOW, kind,
  class_ref: "19", student_ref: "88", lesson_date: TODAY, payload, ...over,
});
const homework = (seq, ref, title = "Unit 4", over = {}, payload = {}) =>
  ev(seq, "homework", { homework_ref: ref, title, ...payload }, { student_ref: null, ...over });
const grade = (seq, ref, value, payload = {}, over = {}) => ev(seq, "grade", { homework_ref: ref, grade: value, ...payload }, over);
const withdraw = (seq, target, reason = "removed") => ev(seq, "retraction", { retracts_event_id: id(target), reason }, { lesson_date: null });

const page = async (events, now = NOW) => {
  await db.exec(`SET ROLE service_role`);
  try {
    return (await one(`SELECT public.stars_sync_apply_page($1::jsonb, $2::bigint, $3::timestamptz) AS r`,
      [JSON.stringify(events), Math.max(0, ...events.map((e) => e.seq ?? 0)), now])).r;
  } finally { await db.exec(`RESET ROLE`); }
};
const retry = async (now = NOW) => {
  await db.exec(`SET ROLE service_role`);
  try { return (await one(`SELECT public.stars_sync_retry_pending(200, $1::timestamptz) AS r`, [now])).r; }
  finally { await db.exec(`RESET ROLE`); }
};
const outcome = async (seq) => (await one(`SELECT outcome, outcome_note, attempts FROM public.stars_sync_events WHERE event_id=$1`, [id(seq)])) ?? {};
const hwByRef = async (ref) => await one(
  `SELECT h.* FROM public.stars_homework_map m JOIN public.homeworks h ON h.id=m.homework_id WHERE m.stars_homework_ref=$1`, [ref]);
const sub = async (ref, student) => await one(
  `SELECT s.* FROM public.stars_homework_map m JOIN public.homework_submissions s ON s.homework_id=m.homework_id
    WHERE m.stars_homework_ref=$1 AND s.student_id=$2`, [ref, student]);
const award = async (ref, student) => await one(
  `SELECT p.* FROM public.stars_homework_map m JOIN public.point_transactions p ON p.homework_id=m.homework_id
    WHERE m.stars_homework_ref=$1 AND p.student_id=$2 AND p.type='homework'`, [ref, student]);
const hwPoints = async (student, month = "2026-11") => (await one(
  `SELECT homework_points h FROM public.student_points WHERE student_id=$1 AND class_id=$2 AND month=$3`, [student, STARS, month]))?.h ?? 0;
const as = async (uid, fn) => {
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid]);
  try { return await fn(); } finally { await db.query(`SELECT set_config('test.uid', '', false)`); }
};

// ---------------------------------------------------------------- upgrade
console.log("=== what the engine already running decided ===");
await page([homework(1, "h-parked", "Parked homework", {}, { due_date: "2026-11-11" })]);
eq("the old engine keeps a homework record as unsupported", (await outcome(1)).outcome, "skipped_unsupported");
await page([grade(2, "h-parked", "9/10", { points: 4 })]);
eq("  and a grade too", (await outcome(2)).outcome, "skipped_unsupported");

await paste(MIGS[MIGS.length - 1]);
ok("the migration applies over it", true);
await paste(MIGS[MIGS.length - 1]);
ok("  and a second paste is harmless", true);

await retry();
eq("the next run applies what was waiting: the homework", (await outcome(1)).outcome, "applied");
eq("  and its grade", (await outcome(2)).outcome, "applied");
eq("the homework is in HEC", (await hwByRef("h-parked")).title, "Parked homework");
eq("  as the teacher", (await hwByRef("h-parked")).created_by, U.mai);
eq("the grade is on the child", (await sub("h-parked", APPLE)).grade, "9/10");
eq("  the points reached the leaderboard", await hwPoints(APPLE), 4);

// --------------------------------------------------------------- homework
console.log("=== a homework ===");
{
  const r = await page([homework(10, "h1", "Unit 5 workbook", {}, { body: "Pages 12 and 13", due_date: "2026-11-11" })]);
  eq("counted as applied", r.counts.applied, 1);
  const h = await hwByRef("h1");
  eq("it has its title", h.title, "Unit 5 workbook");
  eq("  its instructions", h.body, "Pages 12 and 13");
  eq("  its due date", h.due_date.toISOString().slice(0, 10), "2026-11-11");
  eq("  in the class it was set for", h.class_id, STARS);

  await page([homework(11, "h1", "Unit 5 workbook (revised)", {}, { body: "Pages 12 to 14", due_date: "2026-11-12" })]);
  eq("the same homework_ref again replaces what it said", (await hwByRef("h1")).title, "Unit 5 workbook (revised)");
  eq("  without a second homework", (await one(`SELECT count(*)::int n FROM public.homeworks WHERE title LIKE 'Unit 5%'`)).n, 1);
  eq("  saying so", (await outcome(11)).outcome_note, "Updated the homework.");

  await page([homework(9, "h1", "An older version")]);
  eq("an older record arriving late changes nothing", (await hwByRef("h1")).title, "Unit 5 workbook (revised)");
  eq("  and is recorded as a duplicate", (await outcome(9)).outcome, "duplicate");

  await page([homework(11, "h1", "Replayed")]);
  eq("the same record twice applies once", (await hwByRef("h1")).title, "Unit 5 workbook (revised)");
}
{
  await page([homework(12, "h-edit", "As sent", {}, { due_date: "2026-11-20" })]);
  await db.query(`UPDATE public.homeworks SET title='As the teacher fixed it' WHERE id=$1`, [(await hwByRef("h-edit")).id]);
  await page([homework(13, "h-edit", "Sent again", {}, { due_date: "2026-11-20" })]);
  eq("a homework somebody edited in HEC stays as they left it", (await hwByRef("h-edit")).title, "As the teacher fixed it");
  eq("  and the record says so", (await outcome(13)).outcome, "rejected");
  ok("  in words", /changed this homework in HEC/.test((await outcome(13)).outcome_note));
}
{
  const typed = (await one(`INSERT INTO public.homeworks (class_id,title,due_date,created_by)
    VALUES ($1,'Reading log','2026-11-15',$2) RETURNING id`, [STARS, U.linh])).id;
  await page([homework(14, "h-typed", "reading log ", {}, { due_date: "2026-11-15" })]);
  eq("a homework HEC already has by hand is linked, not duplicated", (await hwByRef("h-typed")).id, typed);
  eq("  so there is still one", (await one(`SELECT count(*)::int n FROM public.homeworks WHERE lower(title)='reading log'`)).n, 1);
  ok("  and it says so", /already had this homework/.test((await outcome(14)).outcome_note));
  eq("  and HEC's title stands", (await hwByRef("h-typed")).title, "Reading log");
}
{
  await page([homework(15, "h-x", "", {})]);
  eq("no title is refused", (await outcome(15)).outcome, "rejected");
  await page([ev(16, "homework", { title: "No ref" }, { student_ref: null })]);
  eq("no homework_ref is refused", (await outcome(16)).outcome, "rejected");
  await page([homework(17, "h-baddate", "Bad due", {}, { due_date: "soon" })]);
  eq("a due date that is not a date is refused", (await outcome(17)).outcome, "rejected");
  await page([homework(18, "h-future", "Future", { lesson_date: "2026-12-25" })]);
  eq("a homework set in the future is refused", (await outcome(18)).outcome, "rejected");
  await page([homework(19, "h-unmapped", "Elsewhere", { class_ref: "99" })]);
  eq("an unmapped class waits", (await outcome(19)).outcome, "skipped_unmapped");
  await page([homework(20, "h-comets", "Not Mai's", { class_ref: "44" })]);
  eq("a class the teacher does not teach waits", (await outcome(20)).outcome, "skipped_not_permitted");
  eq("  and nothing was created", await hwByRef("h-comets"), undefined);
}
{
  await page([homework(21, "h-old", "Long gone", { lesson_date: "2026-09-01" }, { due_date: "2026-09-08" })]);
  eq("a homework all before the start date stays out", (await outcome(21)).outcome, "skipped_before_start");
  await page([homework(22, "h-span", "Set before, due after", { lesson_date: "2026-09-10" }, { due_date: "2026-09-20" })]);
  eq("one set before the start date but due after it comes across", (await outcome(22)).outcome, "applied");
}
{
  const notes = async (ref) => (await one(
    `SELECT count(*)::int n FROM public.notifications WHERE type='homework_assigned'
      AND metadata->>'homework_id' = (SELECT homework_id::text FROM public.stars_homework_map WHERE stars_homework_ref=$1)`, [ref])).n;
  await page([homework(23, "h-new", "Fresh", {}, { due_date: "2026-11-20" })]);
  ok("a new homework tells the children, as it does in HEC", (await notes("h-new")) > 0);
  await page([homework(24, "h-past", "Already due", { lesson_date: "2026-10-01" }, { due_date: "2026-10-08" })]);
  eq("homework long past due comes across without announcing itself", await notes("h-past"), 0);
}

// ------------------------------------------------------------------ grades
console.log("=== a grade ===");
await page([homework(30, "g1", "Essay", {}, { due_date: "2026-11-01" })]);
{
  await page([grade(31, "g1", "8/10", { points: 5, feedback: "Nice work" })]);
  const s = await sub("g1", APPLE);
  eq("the grade lands", s.grade, "8/10");
  eq("  marked graded", s.status, "graded");
  eq("  with the feedback", s.teacher_feedback, "Nice work");
  ok("  saying where it came from", s.submission_text.includes("Pixel Pal"));
  const a = await award("g1", APPLE);
  eq("the award is on the homework", a.points, 5);
  eq("  in the name of the teacher", a.created_by, U.mai);
  ok("  labelled", a.notes.startsWith("[Pixel Pal]"));
  eq("  dated by the due date, like every homework award", a.date.toISOString().slice(0, 10), "2026-11-01");

  const before = await hwPoints(APPLE);
  await page([grade(32, "g1", "9/10", { points: 7 })]);
  eq("a corrected grade replaces the grade", (await sub("g1", APPLE)).grade, "9/10");
  eq("  and the award, rather than paying twice", await hwPoints(APPLE), before + 2);
  eq("  there is still one award", (await one(
    `SELECT count(*)::int n FROM public.point_transactions p JOIN public.stars_homework_map m ON m.homework_id=p.homework_id
      WHERE m.stars_homework_ref='g1' AND p.student_id=$1`, [APPLE])).n, 1);
  eq("  feedback it did not repeat stays", (await sub("g1", APPLE)).teacher_feedback, "Nice work");

  await page([grade(31, "g1", "replayed", { points: 50 })]);
  eq("the same record twice applies once", (await sub("g1", APPLE)).grade, "9/10");
  eq("  and pays once", (await award("g1", APPLE)).points, 7);

  await page([grade(29, "g1", "older", { points: 1 })]);
  eq("an older grade arriving late does not undo a newer one", (await sub("g1", APPLE)).grade, "9/10");
  eq("  recorded as a duplicate", (await outcome(29)).outcome, "duplicate");
}
{
  await page([homework(33, "g-nodue", "No due date")]);
  await page([grade(34, "g-nodue", "A", { points: 3 }, { student_ref: "89", lesson_date: "2026-10-30" })]);
  eq("with no due date the award is dated by the grade, not by when it ran",
     (await award("g-nodue", JOHNNY)).date.toISOString().slice(0, 10), "2026-10-30");
}
{
  await page([grade(35, "g-early", "B", {}, { student_ref: "90" })]);
  eq("a grade before its homework waits", (await outcome(35)).outcome, "skipped_no_homework");
  await page([homework(36, "g-early", "Arrives later")]);
  await retry();
  eq("  and applies once the homework arrives", (await outcome(35)).outcome, "applied");
  eq("  on the child", (await sub("g-early", KAKA)).grade, "B");
}
{
  await page([grade(37, "g1", "C", {}, { student_ref: "500" })]);
  eq("a child nobody has matched waits", (await outcome(37)).outcome, "skipped_unmapped");
  await db.query(`INSERT INTO public.stars_student_map (stars_student_id, student_id) VALUES ('500',$1)`, [LATER]);
  await retry();
  eq("  and applies once they are", (await outcome(37)).outcome, "applied");
  eq("  on that child", (await sub("g1", LATER)).grade, "C");

  await page([grade(38, "g1", "D", {}, { student_ref: "77" })]);
  eq("a child not enrolled waits", (await outcome(38)).outcome, "skipped_not_enrolled");
}
{
  await page([grade(40, "g1", "", {}, { student_ref: "89" })]);
  eq("an empty grade is refused", (await outcome(40)).outcome, "rejected");
  await page([grade(41, "g1", "A", { points: 2.5 }, { student_ref: "89" })]);
  eq("points that are not whole are refused", (await outcome(41)).outcome, "rejected");
  await page([grade(42, "g1", "A", { points: 5000 }, { student_ref: "89" })]);
  eq("points over the limit are refused", (await outcome(42)).outcome, "rejected");
  ok("  saying which limit", /over the limit/.test((await outcome(42)).outcome_note));
  eq("  and nothing landed", await sub("g1", JOHNNY), undefined);
  await db.query(`UPDATE public.stars_sync_connection SET max_points_per_day=10`);
  await page([homework(43, "g-cap", "Cap")]);
  await page([ev(44, "points", { points: 8, category: "participation" }, { student_ref: "89", lesson_date: "2026-11-02" })]);
  await page([grade(45, "g-cap", "A", { points: 5 }, { student_ref: "89", lesson_date: "2026-11-02" })]);
  eq("a grade counts points already given that day toward the daily limit", (await outcome(45)).outcome, "rejected");
  await db.query(`UPDATE public.stars_sync_connection SET max_points_per_day=300`);
}
{
  await page([homework(46, "g-other", "In Comets", { class_ref: "44" })]);
  const typed = (await one(`INSERT INTO public.homeworks (class_id,title) VALUES ($1,'Comets homework') RETURNING id`, [COMETS])).id;
  await db.query(`INSERT INTO public.stars_homework_map (stars_homework_ref, homework_id) VALUES ('comets-hw',$1)`, [typed]);
  await page([grade(47, "comets-hw", "A", {}, { student_ref: "89" })]);
  eq("a grade for a homework in another class is refused", (await outcome(47)).outcome, "rejected");
}

console.log("=== work the child handed in ===");
{
  await page([homework(50, "g-sub", "Handed in", {}, { due_date: "2026-11-02" })]);
  const hw = await hwByRef("g-sub");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,submission_text) VALUES ($1,$2,'submitted','My essay')`, [hw.id, KAKA]);
  await page([grade(51, "g-sub", "A", { points: 4 }, { student_ref: "90" })]);
  const s = await sub("g-sub", KAKA);
  eq("a grade lands on what they handed in", s.grade, "A");
  eq("  which is kept", s.submission_text, "My essay");
  await page([withdraw(52, 51)]);
  const back = await sub("g-sub", KAKA);
  eq("withdrawing it leaves the work there", back.submission_text, "My essay");
  eq("  back to submitted", back.status, "submitted");
  eq("  with no grade", back.grade, null);
  eq("  and takes the award back", await award("g-sub", KAKA), undefined);
}

console.log("=== a person's grade stands ===");
{
  await page([homework(60, "g-person", "Marked by hand", {}, { due_date: "2026-11-03" })]);
  const hw = await hwByRef("g-person");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,grade,graded_at) VALUES ($1,$2,'graded','7/10',now())`, [hw.id, APPLE]);
  await db.query(`SELECT public.award_homework_points($1,$2,3,'7/10')`, [APPLE, hw.id]);

  await page([grade(61, "g-person", "7/10", {}, {})]);
  eq("the same grade is adopted", (await outcome(61)).outcome, "applied");
  ok("  saying so", /already had/.test((await outcome(61)).outcome_note));

  await db.query(`UPDATE public.homework_submissions SET grade='6/10' WHERE homework_id=$1 AND student_id=$2`, [hw.id, APPLE]);
  await page([grade(62, "g-person", "9/10", { points: 9, feedback: "Great" })]);
  eq("a different grade is a conflict", (await outcome(62)).outcome, "conflict");
  eq("  and HEC keeps its own", (await sub("g-person", APPLE)).grade, "6/10");
  eq("  and its award", (await award("g-person", APPLE)).points, 3);
  const conflict = await one(`SELECT * FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(62)]);
  eq("  raised for an admin", conflict.resolved_at, null);
  eq("  naming both", `${conflict.ours.status}|${conflict.theirs.status}`, "6/10|9/10");
  eq("  and the homework", conflict.theirs.homework_title, "Marked by hand");

  // Keeping ours closes it.
  await db.query(`SET ROLE authenticated`);
  await as(U.admin, () => db.query(`SELECT public.stars_sync_resolve_conflict($1,'kept_ours')`, [conflict.id]));
  await db.exec(`RESET ROLE`);
  eq("keeping HEC's closes it", (await one(`SELECT resolution FROM public.stars_sync_conflicts WHERE id=$1`, [conflict.id])).resolution, "kept_ours");
  eq("  and changes nothing", (await sub("g-person", APPLE)).grade, "6/10");
}
{
  await page([homework(63, "g-take", "To be taken", {}, { due_date: "2026-11-03" })]);
  const hw = await hwByRef("g-take");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,grade,graded_at) VALUES ($1,$2,'graded','5/10',now())`, [hw.id, APPLE]);
  await page([grade(64, "g-take", "10/10", { points: 8, feedback: "Perfect" })]);
  const conflict = await one(`SELECT * FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(64)]);

  await db.query(`UPDATE public.homework_submissions SET grade='6/10' WHERE homework_id=$1 AND student_id=$2`, [hw.id, APPLE]);
  let moved = null;
  await db.query(`SET ROLE authenticated`);
  try { await as(U.admin, () => db.query(`SELECT public.stars_sync_resolve_conflict($1,'took_theirs')`, [conflict.id])); }
  catch (e) { moved = e.message; }
  await db.exec(`RESET ROLE`);
  ok("taking Pixel Pal's refuses if the grade moved since", /changed since/.test(moved ?? ""), moved ?? "it applied");
  eq("  and changes nothing", (await sub("g-take", APPLE)).grade, "6/10");

  await db.query(`UPDATE public.homework_submissions SET grade='5/10' WHERE homework_id=$1 AND student_id=$2`, [hw.id, APPLE]);
  await db.query(`SET ROLE authenticated`);
  await as(U.admin, () => db.query(`SELECT public.stars_sync_resolve_conflict($1,'took_theirs')`, [conflict.id]));
  await db.exec(`RESET ROLE`);
  const s = await sub("g-take", APPLE);
  eq("taking Pixel Pal's writes its grade", s.grade, "10/10");
  eq("  and its feedback", s.teacher_feedback, "Perfect");
  eq("  and its award", (await award("g-take", APPLE)).points, 8);
  eq("  as the admin who chose", (await award("g-take", APPLE)).created_by, U.admin);
  eq("  and the record is applied", (await outcome(64)).outcome, "applied");

  await page([withdraw(65, 64)]);
  eq("withdrawing it then puts HEC's back", (await sub("g-take", APPLE)).grade, "5/10");
  eq("  and takes the award", await award("g-take", APPLE), undefined);
}
{
  await page([homework(66, "g-newer", "Two grades", {}, { due_date: "2026-11-03" })]);
  const hw = await hwByRef("g-newer");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,grade,graded_at) VALUES ($1,$2,'graded','1/10',now())`, [hw.id, APPLE]);
  await page([grade(67, "g-newer", "2/10"), grade(68, "g-newer", "3/10")]);
  const older = await one(`SELECT id FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(67)]);
  let stale = null;
  await db.query(`SET ROLE authenticated`);
  try { await as(U.admin, () => db.query(`SELECT public.stars_sync_resolve_conflict($1,'took_theirs')`, [older.id])); }
  catch (e) { stale = e.message; }
  await db.exec(`RESET ROLE`);
  ok("taking a grade Pixel Pal has since replaced refuses", /already been settled/.test(stale ?? ""), stale ?? "it applied");
  eq("  because the newer one closed it", (await one(`SELECT resolution FROM public.stars_sync_conflicts WHERE id=$1`, [older.id])).resolution, "dismissed");
  eq("  and only the newer is left open", (await all(
    `SELECT 1 FROM public.stars_sync_conflicts WHERE resolved_at IS NULL AND theirs->>'homework_id'=$1`, [hw.id])).length, 1);
}
{
  await page([homework(69, "g-adopt", "Adopted, then changed", {}, { due_date: "2026-11-03" })]);
  const hw = await hwByRef("g-adopt");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,grade,teacher_feedback,graded_at)
    VALUES ($1,$2,'graded','B','By hand',now())`, [hw.id, JOHNNY]);
  await db.query(`SELECT public.award_homework_points($1,$2,2,'B')`, [JOHNNY, hw.id]);
  await page([grade(95, "g-adopt", "B", {}, { student_ref: "89" })]);
  eq("agreeing with a person's grade adopts it", (await outcome(95)).outcome, "applied");
  await page([grade(96, "g-adopt", "A", { points: 6 }, { student_ref: "89" })]);
  eq("  so Pixel Pal's next change flows through", (await sub("g-adopt", JOHNNY)).grade, "A");
  eq("  and its award replaces the old one", (await award("g-adopt", JOHNNY)).points, 6);
  await page([withdraw(97, 96)]);
  const back = await sub("g-adopt", JOHNNY);
  eq("withdrawing that puts the person's grade back", back.grade, "B");
  eq("  with their feedback", back.teacher_feedback, "By hand");
  eq("  and still graded", back.status, "graded");
  eq("  and their award", (await award("g-adopt", JOHNNY)).points, 2);
}
{
  await page([homework(98, "g-adopt2", "Adopted, then withdrawn", {}, { due_date: "2026-11-03" })]);
  const hw = await hwByRef("g-adopt2");
  await db.query(`INSERT INTO public.homework_submissions (homework_id,student_id,status,grade,graded_at) VALUES ($1,$2,'graded','C',now())`, [hw.id, JOHNNY]);
  await page([grade(105, "g-adopt2", "C", {}, { student_ref: "89" })]);
  await page([withdraw(106, 105)]);
  eq("withdrawing an adopted grade leaves the person's", (await sub("g-adopt2", JOHNNY)).grade, "C");
  await page([grade(107, "g-adopt2", "D", {}, { student_ref: "89" })]);
  eq("  and the next different grade is a conflict again, not an overwrite", (await outcome(107)).outcome, "conflict");
  eq("  HEC's stands", (await sub("g-adopt2", JOHNNY)).grade, "C");
}

console.log("=== withdrawals ===");
{
  await page([homework(70, "w1", "Withdrawn grade", {}, { due_date: "2026-11-03" })]);
  await page([grade(71, "w1", "A", { points: 6 })]);
  const before = await hwPoints(APPLE);
  await page([withdraw(72, 71)]);
  eq("the record is marked withdrawn", (await outcome(71)).outcome, "retracted");
  eq("  the grade, which was the only thing there, is gone", await sub("w1", APPLE), undefined);
  eq("  and so are its points", await hwPoints(APPLE), before - 6);
  await page([withdraw(73, 71)]);
  eq("withdrawing twice is harmless", (await outcome(73)).outcome_note, "Already withdrawn.");
  eq("  and takes nothing more", await hwPoints(APPLE), before - 6);
}
{
  await page([homework(74, "w2", "Changed in HEC", {}, { due_date: "2026-11-03" })]);
  await page([grade(75, "w2", "A", { points: 6 })]);
  await db.query(`UPDATE public.homework_submissions SET grade='A+' WHERE homework_id=$1 AND student_id=$2`, [(await hwByRef("w2")).id, APPLE]);
  await page([withdraw(76, 75)]);
  eq("a grade changed in HEC since is left alone", (await sub("w2", APPLE)).grade, "A+");
  ok("  and the record says so", /changed in HEC/.test((await outcome(75)).outcome_note));
}
{
  await page([homework(77, "w3", "Replaced", {}, { due_date: "2026-11-03" })]);
  await page([grade(78, "w3", "B", { points: 2 }), grade(79, "w3", "A", { points: 4 })]);
  await page([withdraw(80, 78, "changed")]);
  eq("withdrawing a grade a newer one replaced changes nothing", (await sub("w3", APPLE)).grade, "A");
  eq("  including its points", (await award("w3", APPLE)).points, 4);
  await page([withdraw(81, 79)]);
  eq("withdrawing the newer one clears it, back to what HEC had", await sub("w3", APPLE), undefined);
  eq("  points too", await award("w3", APPLE), undefined);
}
{
  await page([grade(82, "w-nohw", "A", {}, {})]);
  eq("a grade with no homework yet waits", (await outcome(82)).outcome, "skipped_no_homework");
  await page([withdraw(83, 82)]);
  eq("withdrawn before it applied", (await outcome(82)).outcome, "retracted");
  await page([homework(84, "w-nohw", "Arrives after")]);
  await retry();
  eq("  so it never applies", await sub("w-nohw", APPLE), undefined);
}
{
  await page([homework(85, "w-hw", "Nobody started")]);
  const gone = (await hwByRef("w-hw")).id;
  await page([withdraw(86, 85)]);
  eq("withdrawing a homework nobody has done removes it",
     (await one(`SELECT count(*)::int n FROM public.homeworks WHERE id=$1`, [gone])).n, 0);

  await page([homework(87, "w-hw2", "Somebody started")]);
  await page([grade(88, "w-hw2", "A", { points: 1 })]);
  await page([withdraw(89, 87)]);
  ok("withdrawing one with grades keeps it, or the grades would go too", Boolean(await hwByRef("w-hw2")));
  eq("  and the grade", (await sub("w-hw2", APPLE)).grade, "A");
  ok("  saying why", /kept/.test((await outcome(87)).outcome_note));

  await page([homework(90, "w-hw3", "Edited")]);
  await db.query(`UPDATE public.homeworks SET title='Edited by a teacher' WHERE id=$1`, [(await hwByRef("w-hw3")).id]);
  await page([withdraw(91, 90)]);
  ok("withdrawing one somebody edited keeps it", Boolean(await hwByRef("w-hw3")));

  await page([homework(92, "w-hw4", "Reading log 2", {}, {})]);
  const typed = (await one(`INSERT INTO public.homeworks (class_id,title) VALUES ($1,'Hand typed') RETURNING id`, [STARS])).id;
  await page([homework(93, "w-hw5", "Hand typed")]);
  await page([withdraw(94, 93)]);
  eq("withdrawing one HEC already had leaves HEC's",
     (await one(`SELECT count(*)::int n FROM public.homeworks WHERE id=$1`, [typed])).n, 1);
}

console.log("=== everything else goes where it went ===");
{
  await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,$3)`, [STARS, mai, TODAY]);
  const r = await page([
    ev(100, "attendance", { status: "Absent" }, { student_ref: "89" }),
    ev(101, "points", { points: 5, category: "homework", reason: "workbook" }, { student_ref: "89" }),
  ]);
  eq("register marks still apply", (await outcome(100)).outcome, "applied");
  eq("  and points", (await outcome(101)).outcome, "applied");
  eq("  counted", r.counts.applied, 2);
  await page([withdraw(102, 101)]);
  eq("withdrawing points still works", (await outcome(101)).outcome, "retracted");
  await page([ev(103, "stickers", { n: 1 })]);
  eq("a kind still unknown still waits", (await outcome(103)).outcome, "skipped_unsupported");
  await page([ev(104, "retraction", { retracts_event_id: id(99999) }, { lesson_date: null })]);
  eq("withdrawing something never received is still refused", (await outcome(104)).outcome, "rejected");
}

console.log("=== who may call what ===");
{
  const refused = async (sql) => {
    await db.exec(`SET ROLE authenticated`);
    let err = null;
    try { await db.query(sql); } catch (e) { err = e.message; }
    await db.exec(`RESET ROLE`);
    return /permission denied/.test(err ?? "");
  };
  ok("a browser cannot apply a homework record",
     await refused(`SELECT public.stars_sync__apply_homework_event('{}'::jsonb, now())`));
  ok("  or award a grade",
     await refused(`SELECT public.stars_sync__award_grade('${APPLE}','${APPLE}',1,'A','${APPLE}','2026-11-01')`));
  const status = await (async () => {
    await db.exec(`SET ROLE authenticated`);
    const r = await as(U.admin, () => one(`SELECT public.stars_sync_status() AS s`));
    await db.exec(`RESET ROLE`);
    return r.s;
  })();
  eq("the status tells the page this is applied", status.homework_engine, true);
  let denied = null;
  await db.exec(`SET ROLE authenticated`);
  try { await as(U.mai, () => db.query(`SELECT public.stars_sync_resolve_conflict(gen_random_uuid(),'kept_ours')`)); }
  catch (e) { denied = e.message; }
  await db.exec(`RESET ROLE`);
  ok("a teacher cannot settle a conflict", /Only an admin/.test(denied ?? ""), denied ?? "it ran");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
