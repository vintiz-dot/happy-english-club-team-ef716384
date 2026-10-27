// The Stars sync engine, against the real migrations, in order.
//
// Drives 20261023090000 (points rollup) -> 20261023100000 (sync tables)
// -> 20261027090000 (cancelled lessons) -> 20261027100000 (the engine),
// on a schema shaped like production: seeded placeholder registers, a
// teacher who marked one child by hand, the old delete trigger on points.
//
// What matters is what a child's register and points total end up as,
// so that is what most of these assert - not the outcome strings alone.
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
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
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
    title text NOT NULL, due_date date);
  CREATE TABLE public.homework_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL REFERENCES public.homeworks(id),
    student_id uuid NOT NULL REFERENCES public.students(id), status text NOT NULL DEFAULT 'submitted',
    grade text, teacher_feedback text, graded_at timestamptz);
  CREATE TABLE public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    homework_id uuid REFERENCES public.homeworks(id), homework_title text, session_id uuid, notes text,
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

  -- The old delete trigger, exactly as 20251226104556 left it: it ignores
  -- reading_theory, vocabulary_quiz, correction and early_submission.
  CREATE FUNCTION public.recalculate_student_points_on_delete() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $f$
  DECLARE v_month text; v_hw int; v_part int;
  BEGIN
    v_month := to_char(OLD.date, 'YYYY-MM');
    SELECT COALESCE(SUM(CASE WHEN type='homework' THEN points ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type IN ('participation','adjustment') THEN points ELSE 0 END),0)
      INTO v_hw, v_part FROM point_transactions
     WHERE student_id=OLD.student_id AND class_id=OLD.class_id AND to_char(date,'YYYY-MM')=v_month;
    UPDATE student_points SET homework_points=v_hw, participation_points=v_part
     WHERE student_id=OLD.student_id AND class_id=OLD.class_id AND month=v_month;
    RETURN OLD;
  END $f$;
  CREATE TRIGGER trigger_recalculate_points_on_delete AFTER DELETE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_student_points_on_delete();

  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE AS $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $f$;
  CREATE FUNCTION public.class_slots_on(p_class uuid, p_date date) RETURNS jsonb
    LANGUAGE sql STABLE AS $f$ SELECT '[]'::jsonb $f$;
  -- The current rule (20261020091000): roster permanently, or cover
  -- within 7 days of a lesson, and active either way.
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS $f$
    SELECT EXISTS (SELECT 1 FROM public.classes c JOIN public.teachers t ON t.id=c.default_teacher_id
                    WHERE c.id=is_teacher_of_class.class_id AND t.user_id=is_teacher_of_class.user_id AND t.is_active)
        OR EXISTS (SELECT 1 FROM public.sessions s JOIN public.teachers t ON t.id=s.teacher_id
                    WHERE s.class_id=is_teacher_of_class.class_id AND t.user_id=is_teacher_of_class.user_id
                      AND t.is_active AND s.status <> 'Canceled'
                      AND s.date >= CURRENT_DATE - 7 AND s.date <= CURRENT_DATE + 60) $f$;

  GRANT USAGE ON SCHEMA public TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const db = new PGlite();
await db.exec(PRELUDE);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;

// ----------------------------------------------------------- people
const U = { mai: "11111111-1111-4111-8111-111111111111", linh: "22222222-2222-4222-8222-222222222222",
            admin: "33333333-3333-4333-8333-333333333333", hoa: "44444444-4444-4444-8444-444444444444" };
for (const u of Object.values(U)) await db.query(`INSERT INTO auth.users VALUES ($1)`, [u]);
await db.query(`INSERT INTO public.user_roles VALUES ($1,'teacher'),($2,'teacher'),($3,'admin'),($4,'teacher')`,
  [U.mai, U.linh, U.admin, U.hoa]);
const teacher = async (name, uid, active = true) => (await one(
  `INSERT INTO public.teachers (full_name,user_id,is_active) VALUES ($1,$2,$3) RETURNING id`, [name, uid, active])).id;
const mai = await teacher("Mai", U.mai);
const linh = await teacher("Linh", U.linh);
const hoa = await teacher("Hoa", U.hoa, false);

const klass = async (name, t) => (await one(
  `INSERT INTO public.classes (name, default_teacher_id) VALUES ($1,$2) RETURNING id`, [name, t])).id;
const STARS = await klass("Stars", mai);
const SANRIO = await klass("Sanrio Grade 6", mai);
const OTHER = await klass("Comets", linh);
const ARCHIVED = await klass("Old class", hoa);

const child = async (name, cls) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  if (cls) await db.query(`INSERT INTO public.enrollments (student_id,class_id,start_date) VALUES ($1,$2,'2026-09-01')`, [id, cls]);
  return id;
};
const APPLE = await child("Apple", STARS);
const JOHNNY = await child("Johnny", STARS);
const MINH = await child("Minh Duc", STARS);
const KAKA = await child("Kaka", SANRIO);
const STRAY = await child("Not in Stars", null);

// Lessons. "Now" in these tests is 10:00 in Hanoi on 27 October.
const TODAY = "2026-10-27";
const NOW = "2026-10-27T03:00:00Z";
const lesson = async (cls, date, status = "Scheduled", start = "09:00", end = "09:50", t = mai) => (await one(
  `INSERT INTO public.sessions (class_id,teacher_id,date,start_time,end_time,status)
   VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [cls, t, date, start, end, status])).id;
const STARS_TODAY = await lesson(STARS, TODAY);
const SANRIO_TODAY = await lesson(SANRIO, TODAY, "Canceled");

// HEC's seeded register: placeholders for Apple and Johnny, and Minh
// marked Present by a person.
await db.query(`INSERT INTO public.attendance (session_id,student_id,status,marked_by) VALUES
  ($1,$2,'Present',NULL), ($1,$3,'Present',NULL), ($1,$4,'Present',$5)`,
  [STARS_TODAY, APPLE, JOHNNY, MINH, U.linh]);

// ------------------------------------------------------- migrations
console.log("=== the migrations ===");
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");
await db.exec(sql());
ok("all four apply in order", true);
// Re-pasting THIS migration must be harmless. Re-pasting an older one
// after it is not: 20261023100000 declares stars_sync_readiness with
// the columns this one replaced, and Postgres will not change a
// function's return type in place. That fails inside BEGIN/COMMIT and
// rolls back cleanly, which is the right outcome for running history
// backwards - so it is asserted, not hidden.
let again = null;
try { await db.exec(readFileSync(MIGS[MIGS.length - 1], "utf8")); }
catch (e) { again = e.message; await db.exec("ROLLBACK").catch(() => {}); }
ok("the engine migration applies a second time unchanged", again === null, again ?? "");
let backwards = null;
try { await db.exec(readFileSync(MIGS[1], "utf8")); }
catch (e) { backwards = e.message; await db.exec("ROLLBACK").catch(() => {}); }
ok("re-pasting the older Stars migration afterwards is refused, not half-applied",
   /return type/.test(backwards ?? ""), backwards ?? "it applied");
eq("  and the engine is still intact after the refusal",
   (await one(`SELECT count(*)::int n FROM pg_proc WHERE proname='stars_sync_apply_page'`)).n, 1);
eq("the old delete trigger is gone",
   (await one(`SELECT count(*)::int n FROM pg_trigger WHERE tgname='trigger_recalculate_points_on_delete'`)).n, 0);

// ------------------------------------------------------------ helpers
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ev = (seq, kind, payload, over = {}) => ({
  seq, event_id: id(seq), occurred_at: NOW, kind,
  class_ref: "19", student_ref: "88", lesson_date: TODAY, payload, ...over,
});
const page = async (events, next, now = NOW) => {
  await db.exec(`SET ROLE service_role`);
  try {
    return (await one(`SELECT public.stars_sync_apply_page($1::jsonb, $2::bigint, $3::timestamptz) AS r`,
      [JSON.stringify(events), next ?? Math.max(0, ...events.map((e) => e.seq ?? 0)), now])).r;
  } finally { await db.exec(`RESET ROLE`); }
};
const retry = async (now = NOW) => {
  await db.exec(`SET ROLE service_role`);
  try { return (await one(`SELECT public.stars_sync_retry_pending(200, $1::timestamptz) AS r`, [now])).r; }
  finally { await db.exec(`RESET ROLE`); }
};
const outcome = async (seq) => (await one(`SELECT outcome, outcome_note FROM public.stars_sync_events WHERE event_id=$1`, [id(seq)])) ?? {};
const mark = async (student, session = STARS_TODAY) =>
  await one(`SELECT status, marked_by, notes FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [session, student]);
const pts = async (student, cls = STARS) => await one(
  `SELECT participation_points p, homework_points h, total_points t FROM public.student_points
    WHERE student_id=$1 AND class_id=$2 AND month='2026-10'`, [student, cls]);

// -------------------------------------------------------- set up as admin
await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1, enabled=true`, [mai]);
await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('19',$1),('12',$2)`, [STARS, SANRIO]);
await db.query(`INSERT INTO public.stars_student_map (stars_student_id, student_id) VALUES
  ('88',$1),('89',$2),('90',$3),('11',$4),('77',$5)`, [APPLE, JOHNNY, MINH, KAKA, STRAY]);

console.log("=== it will not run until somebody chooses where to start ===");
{
  let err = null;
  try { await page([ev(1, "attendance", { status: "Absent" })]); } catch (e) { err = e.message; }
  ok("no start date: the page is refused", /choose the date to sync from/.test(err ?? ""), err ?? "it ran");
  eq("  and nothing was recorded", (await one(`SELECT count(*)::int n FROM public.stars_sync_events`)).n, 0);
  await db.query(`UPDATE public.stars_sync_connection SET sync_from='2026-10-01'`);
}

console.log("=== a register mark ===");
{
  const r = await page([ev(1, "attendance", { status: "Absent" })]);
  eq("Apple, a seeded placeholder, is marked Absent", (await mark(APPLE)).status, "Absent");
  eq("  recorded as the teacher", (await mark(APPLE)).marked_by, U.mai);
  eq("  and labelled", (await mark(APPLE)).notes, "Pixel Pal");
  eq("the lesson is now Held, which is what pays the teacher",
     (await one(`SELECT status::text s FROM public.sessions WHERE id=$1`, [STARS_TODAY])).s, "Held");
  eq("the outcome", (await outcome(1)).outcome, "applied");
  ok("the edge function is handed the after-effects", r.effects.length === 1 && r.effects[0].status === "Absent"
     && r.effects[0].type === "attendance", JSON.stringify(r.effects));
  eq("the cursor moved", (await one(`SELECT last_seq::int n FROM public.stars_sync_cursor`)).n, 1);
}
{
  const r = await page([ev(1, "attendance", { status: "Absent" })]);
  eq("replaying the same record does nothing", r.counts.already_done, 1);
  eq("  and has no after-effects", r.effects.length, 0);
}

console.log("=== a teacher's own mark is never overwritten ===");
{
  await page([ev(2, "attendance", { status: "Absent" }, { student_ref: "90" })]);
  eq("Minh, marked Present by a person, stays Present", (await mark(MINH)).status, "Present");
  eq("  it is a conflict", (await outcome(2)).outcome, "conflict");
  const c = await one(`SELECT ours->>'status' o, theirs->>'status' t FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(2)]);
  ok("  with both answers kept for an admin", c?.o === "Present" && c?.t === "Absent", JSON.stringify(c));
}
{
  await page([ev(3, "attendance", { status: "Present" }, { student_ref: "90" })]);
  eq("when Pixel Pal agrees with the person, it is adopted", (await outcome(3)).outcome, "applied");
  eq("  and the person's mark is untouched", (await mark(MINH)).marked_by, U.linh);
  await page([ev(4, "attendance", { status: "Late" }, { student_ref: "90" })]);
  eq("so the next change from Pixel Pal flows through", (await mark(MINH)).status, "Late");
}

console.log("=== a changed register: retraction, then the new mark ===");
{
  await page([
    ev(5, "retraction", { retracts_event_id: id(1), reason: "changed" }),
    ev(6, "attendance", { status: "Present" }),
  ]);
  eq("Apple ends up Present", (await mark(APPLE)).status, "Present");
  eq("  marked by the teacher, not a placeholder", (await mark(APPLE)).marked_by, U.mai);
  eq("the withdrawn mark is recorded as withdrawn", (await outcome(1)).outcome, "retracted");
  eq("the retraction applied", (await outcome(5)).outcome, "applied");
}
{
  await page([ev(7, "attendance", { status: "Absent" }, { student_ref: "89" })]);
  eq("Johnny marked Absent", (await mark(JOHNNY)).status, "Absent");
  const r = await page([ev(8, "retraction", { retracts_event_id: id(7), reason: "removed" })]);
  eq("removed in Pixel Pal: the register goes back to HEC's placeholder", (await mark(JOHNNY)).status, "Present");
  eq("  which is a placeholder again, not a mark", (await mark(JOHNNY)).marked_by, null);
  ok("  and tuition is recalculated for him", r.effects.some((e) => e.type === "restore" && e.student_id === JOHNNY),
     JSON.stringify(r.effects));
  eq("the sync no longer claims the row",
     (await one(`SELECT count(*)::int n FROM public.stars_sync_attendance_state WHERE student_id=$1`, [JOHNNY])).n, 0);
}
{
  // A person changes Apple in HEC after the sync wrote her.
  await db.query(`UPDATE public.attendance SET status='Late', marked_by=$1 WHERE session_id=$2 AND student_id=$3`,
    [U.admin, STARS_TODAY, APPLE]);
  await page([ev(9, "attendance", { status: "Absent" })]);
  eq("after a person changes the sync's mark, the sync stops overwriting it", (await mark(APPLE)).status, "Late");
  eq("  it is a conflict", (await outcome(9)).outcome, "conflict");
  await page([ev(10, "retraction", { retracts_event_id: id(6), reason: "removed" })]);
  eq("and withdrawing the sync's older mark does not undo the person's", (await mark(APPLE)).status, "Late");
}

console.log("=== points ===");
{
  await page([ev(20, "points", { points: 5, category: "participation", reason: "great answer" })]);
  eq("+5 lands on the leaderboard", (await pts(APPLE)).p, 5);
  const tx = await one(`SELECT created_by, notes, session_id FROM public.point_transactions WHERE student_id=$1`, [APPLE]);
  eq("  recorded as the teacher", tx.created_by, U.mai);
  ok("  and labelled", tx.notes.startsWith("[Pixel Pal]"), tx.notes);
  eq("  on the lesson, since there is exactly one", tx.session_id, STARS_TODAY);

  await page([ev(21, "retraction", { retracts_event_id: id(20), reason: "removed" })]);
  eq("withdrawing it brings the total back to 0", (await pts(APPLE)).p, 0);
  eq("  by a compensating entry, so the history stays",
     (await one(`SELECT count(*)::int n FROM public.point_transactions WHERE student_id=$1`, [APPLE])).n, 2);
}
{
  await page([ev(22, "points", { points: 150, category: "participation", reason: "x" })]);
  eq("an award over the per-award limit is refused", (await outcome(22)).outcome, "rejected");
  eq("  and changes nothing", (await pts(APPLE)).p, 0);

  await page([100, 100, 100].map((p, i) => ev(23 + i, "points", { points: p, category: "participation", reason: "x" })));
  eq("three awards up to the daily limit all land", (await pts(APPLE)).p, 300);
  await page([ev(26, "points", { points: 5, category: "participation", reason: "x" })]);
  eq("the next one is over the daily limit and refused", (await outcome(26)).outcome, "rejected");
  eq("  so the total stops at the limit", (await pts(APPLE)).p, 300);
  await page([ev(27, "points", { points: -10, category: "adjustment", reason: "talking" })]);
  eq("a deduction is not counted against the daily limit", (await pts(APPLE)).p, 290);
}
{
  // Johnny, not Apple: Apple is at the daily limit, and an award refused
  // for that would pass this test for the wrong reason.
  await page([ev(28, "points", { points: 5, category: "homework", reason: "workbook" }, { student_ref: "89" }),
              ev(29, "points", { points: 5, category: "homework", reason: "workbook 2" }, { student_ref: "89" })]);
  eq("two homework-category awards both land - they name no homework, so neither replaces the other",
     (await pts(JOHNNY)).h, 10);
  for (const [n, bad] of [[30, { points: 2.5, category: "participation" }],
                          [31, { points: 5, category: "bribery" }],
                          [32, { points: 0, category: "participation" }],
                          [33, { category: "participation" }]]) {
    await page([ev(n, "points", bad)]);
    eq(`a malformed award (${JSON.stringify(bad)}) is refused`, (await outcome(n)).outcome, "rejected");
  }
}

console.log("=== nothing is lost: records wait until they can apply ===");
{
  await page([ev(40, "points", { points: 3, category: "participation", reason: "x" }, { student_ref: "999" })]);
  eq("a child nobody has matched waits", (await outcome(40)).outcome, "skipped_unmapped");
  const kid = await child("Strawberry", STARS);
  await db.query(`INSERT INTO public.stars_student_map VALUES ('999',$1)`, [kid]);
  await retry();
  eq("once matched, the next run applies it", (await outcome(40)).outcome, "applied");
  eq("  to the right child", (await pts(kid)).p, 3);
}
{
  await page([ev(41, "points", { points: 4, category: "participation", reason: "x" }, { student_ref: "998" }),
              ev(42, "retraction", { retracts_event_id: id(41), reason: "removed" })]);
  eq("a record withdrawn before it could apply is withdrawn", (await outcome(41)).outcome, "retracted");
  const kid = await child("Sushi", STARS);
  await db.query(`INSERT INTO public.stars_student_map VALUES ('998',$1)`, [kid]);
  await retry();
  ok("  and matching the child later never applies it", (await pts(kid)) == null || (await pts(kid)).p === 0);
}
{
  await page([ev(43, "attendance", { status: "Absent" }, { class_ref: "22", student_ref: "89" })]);
  eq("a class nobody has mapped waits", (await outcome(43)).outcome, "skipped_unmapped");
  await page([ev(44, "attendance", { status: "Absent" }, { student_ref: "77" })]);
  eq("a child not enrolled in that class waits", (await outcome(44)).outcome, "skipped_not_enrolled");
  await page([ev(45, "homework", { title: "Unit 4" })]);
  eq("a kind HEC does not take yet waits rather than vanishing", (await outcome(45)).outcome, "skipped_unsupported");
}
{
  await page([ev(46, "attendance", { status: "Absent" }, { lesson_date: "2026-10-26", student_ref: "89" })]);
  eq("a day HEC has no lesson for waits", (await outcome(46)).outcome, "skipped_no_session");
  await lesson(STARS, "2026-10-26");
  await retry();
  eq("  and once the lesson exists, a teacher's 24-hour window decides - it has closed",
     (await outcome(46)).outcome, "rejected");
  ok("  and says so", /24 hours/.test((await outcome(46)).outcome_note ?? ""), (await outcome(46)).outcome_note);
}
{
  const tomorrow = await lesson(STARS, "2026-10-28", "Scheduled");
  await page([ev(47, "attendance", { status: "Present" }, { lesson_date: "2026-10-28", student_ref: "89" })],
    undefined, "2026-10-28T01:00:00Z");
  eq("a mark before the lesson starts in HEC waits", (await outcome(47)).outcome, "skipped_not_permitted");
  await retry("2026-10-28T02:10:00Z");
  eq("  and applies once the lesson is five minutes in", (await outcome(47)).outcome, "applied");
  eq("  on that lesson", (await mark(JOHNNY, tomorrow)).status, "Present");
}

console.log("=== what is refused outright ===");
{
  await page([ev(50, "attendance", { status: "Absent" }, { class_ref: "12", student_ref: "11" })]);
  eq("a lesson cancelled in HEC", (await outcome(50)).outcome, "rejected");
  await page([ev(51, "attendance", { status: "Absent" }, { lesson_date: "2026-10-30" })]);
  eq("a lesson in the future", (await outcome(51)).outcome, "rejected");
  await page([ev(52, "attendance", { status: "Absent" }, { lesson_date: "2026-09-20" })]);
  eq("a lesson before the start date is skipped for good", (await outcome(52)).outcome, "skipped_before_start");
  await page([ev(53, "attendance", { status: "Sleeping" })]);
  eq("a status HEC does not know", (await outcome(53)).outcome, "rejected");
  await page([ev(54, "attendance", { status: "Absent" }, { lesson_date: "2026-02-30" })]);
  eq("a date that does not exist", (await outcome(54)).outcome, "rejected");

  await lesson(STARS, "2026-10-25", "Held", "09:00", "09:50");
  await lesson(STARS, "2026-10-25", "Held", "14:00", "14:50");
  await page([ev(55, "attendance", { status: "Absent" }, { lesson_date: "2026-10-25" })]);
  eq("two lessons on one day, with no way to tell which", (await outcome(55)).outcome, "rejected");
}
{
  const pendingBefore = (await one(`SELECT count(*)::int n FROM public.stars_sync_events WHERE outcome='skipped_before_start'`)).n;
  await retry();
  eq("records before the start date are not retried",
     (await one(`SELECT count(*)::int n FROM public.stars_sync_events WHERE outcome='skipped_before_start'`)).n, pendingBefore);
}

console.log("=== only what the teacher can do in HEC ===");
{
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id) VALUES ('30',$1,$2)`, [OTHER, mai]);
  const kid = await child("Comet kid", OTHER);
  await db.query(`INSERT INTO public.stars_student_map VALUES ('300',$1)`, [kid]);
  await page([ev(60, "points", { points: 5, category: "participation", reason: "x" }, { class_ref: "30", student_ref: "300" })]);
  eq("a teacher who does not teach the class cannot award in it", (await outcome(60)).outcome, "skipped_not_permitted");
  ok("  and HEC's own rule said why", /does not teach Comets/.test((await outcome(60)).outcome_note ?? ""), (await outcome(60)).outcome_note);
  eq("  nothing was written", (await one(`SELECT count(*)::int n FROM public.point_transactions WHERE student_id=$1`, [kid])).n, 0);

  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('40',$1)`, [ARCHIVED]);
  await db.query(`UPDATE public.stars_class_map SET teacher_id=$1 WHERE stars_class_id='40'`, [hoa]);
  const old = await child("Old kid", ARCHIVED);
  await db.query(`INSERT INTO public.stars_student_map VALUES ('400',$1)`, [old]);
  await page([ev(61, "points", { points: 5, category: "participation", reason: "x" }, { class_ref: "40", student_ref: "400" })]);
  eq("an archived teacher can do nothing", (await outcome(61)).outcome, "skipped_not_permitted");

  await db.query(`UPDATE public.stars_class_map SET enabled=false WHERE stars_class_id='19'`);
  await page([ev(62, "points", { points: 5, category: "participation", reason: "x" })]);
  eq("a class paused on its own waits", (await outcome(62)).outcome, "skipped_disabled");
  await db.query(`UPDATE public.stars_class_map SET enabled=true WHERE stars_class_id='19'`);
}
{
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [U.admin]);
  let err = null;
  try { await db.query(`SELECT public.stars_sync_apply_page('[]'::jsonb, 0)`); } catch (e) { err = e.message; }
  ok("no signed-in user can call the engine - not even an admin", /permission denied/.test(err ?? ""), err ?? "it ran");
  err = null;
  try { await db.query(`SELECT cron_token FROM public.stars_sync_secrets`); } catch (e) { err = e.message; }
  const seen = err ? 0 : (await all(`SELECT 1 FROM public.stars_sync_secrets`).catch(() => [])).length;
  ok("and nobody in a browser can read the schedule's token", err !== null || seen === 0, err ?? `${seen} rows`);
  await db.exec(`RESET ROLE`);
}

console.log("=== a page is all or nothing ===");
{
  const before = (await one(`SELECT count(*)::int n FROM public.stars_sync_events`)).n;
  let err = null;
  try {
    await page([ev(70, "points", { points: 1, category: "participation", reason: "x" }),
                { kind: "points", class_ref: "19", student_ref: "88", lesson_date: TODAY, payload: {} }], 71);
  } catch (e) { err = e.message; }
  ok("an event with no id and no order stops the page", /neither an event_id nor a seq/.test(err ?? ""), err ?? "it ran");
  eq("  and the good record before it was not kept either", (await one(`SELECT count(*)::int n FROM public.stars_sync_events`)).n, before);
  eq("  nor the cursor moved", (await one(`SELECT last_seq::int n FROM public.stars_sync_cursor`)).n < 70, true);
}
{
  await page([{ seq: 72, kind: "points", class_ref: "19", student_ref: "88", lesson_date: TODAY,
                payload: { points: 1, category: "participation" } }]);
  const row = await one(`SELECT outcome FROM public.stars_sync_events WHERE seq=72`);
  eq("an event with an order but no id is refused, but recorded once", row?.outcome, "rejected");
  const r = await page([{ seq: 72, kind: "points", class_ref: "19", student_ref: "88", lesson_date: TODAY,
                          payload: { points: 1, category: "participation" } }]);
  eq("  and replaying it is recognised", r.counts.already_done, 1);
}
{
  await page([], 50);
  eq("the cursor never goes backwards", (await one(`SELECT last_seq::int n FROM public.stars_sync_cursor`)).n >= 72, true);
}

console.log("=== conflicts, settled by an admin ===");
{
  const c = await one(`SELECT id FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(2)]);
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [U.mai]);
  let err = null;
  try { await db.query(`SELECT public.stars_sync_resolve_conflict($1,'kept_ours')`, [c.id]); } catch (e) { err = e.message; }
  ok("a teacher cannot settle one", err !== null, err ?? "it was allowed");

  await db.query(`SELECT set_config('test.uid', $1, false)`, [U.admin]);
  err = null;
  try { await db.query(`SELECT public.stars_sync_resolve_conflict($1,'took_theirs')`, [c.id]); } catch (e) { err = e.message; }
  ok("'take theirs' is refused until the register really shows theirs", /does not show/.test(err ?? ""), err ?? "it was recorded");
  await db.exec(`RESET ROLE`);

  // What the admin screen does first: mark it through the normal path.
  await db.query(`UPDATE public.attendance SET status='Absent', marked_by=$1 WHERE session_id=$2 AND student_id=$3`,
    [U.admin, STARS_TODAY, MINH]);
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT public.stars_sync_resolve_conflict($1,'took_theirs')`, [c.id]);
  await db.exec(`RESET ROLE`);
  eq("then it is recorded", (await one(`SELECT resolution FROM public.stars_sync_conflicts WHERE id=$1`, [c.id])).resolution, "took_theirs");
  eq("  and the record counts as applied", (await outcome(2)).outcome, "applied");
  await page([ev(73, "retraction", { retracts_event_id: id(2), reason: "removed" })]);
  eq("  so a later withdrawal leaves the admin's mark alone", (await mark(MINH)).status, "Absent");
}

console.log("=== the admin's view ===");
{
  await db.query(`SELECT set_config('test.uid', $1, false)`, [U.admin]);
  const rows = await all(`SELECT stars_class_id, status, detail FROM public.stars_sync_readiness()`);
  const by = Object.fromEntries(rows.map((r) => [r.stars_class_id, r]));
  eq("Stars, whose default teacher is Mai, is ready", by["19"]?.status, "ready");
  eq("Comets, which Mai does not teach, is blocked", by["30"]?.status, "blocked");
  eq("the archived teacher's class is blocked", by["40"]?.status, "blocked");

  await lesson(OTHER, (await one(`SELECT CURRENT_DATE::text d`)).d, "Scheduled", "09:00", "09:50", mai);
  const cover = (await all(`SELECT status, detail FROM public.stars_sync_readiness() WHERE stars_class_id='30'`))[0];
  eq("covering a lesson there makes it work, but only for now", cover.status, "partial");
  ok("  and says the access runs out in 7 days", /7 days/.test(cover.detail), cover.detail);

  await db.query(`SELECT set_config('test.uid', $1, false)`, [U.mai]);
  let err = null;
  try { await db.query(`SELECT * FROM public.stars_sync_readiness()`); } catch (e) { err = e.message; }
  ok("a teacher cannot read it", err !== null, err ?? "it was allowed");
  await db.query(`SELECT set_config('test.uid', '', false)`);
}

console.log("=== the schedule and the lock ===");
{
  eq("the tick does nothing before an admin has run it by hand",
     (await one(`SELECT public.stars_sync_tick() AS r`)).r, null);
  await db.query(`UPDATE public.stars_sync_secrets SET function_url='https://example.supabase.co/functions/v1/stars-sync'`);
  eq("  nor with an address but no key to get past the gateway", (await one(`SELECT public.stars_sync_tick() AS r`)).r, null);
  await db.query(`UPDATE public.stars_sync_secrets SET function_key='public-anon-key'`);
  eq("  and nothing without the HTTP extension installed", (await one(`SELECT public.stars_sync_tick() AS r`)).r, null);
  await db.query(`UPDATE public.stars_sync_secrets SET function_url='https://evil.example/steal'`);
  eq("  nor to an address that is not this function", (await one(`SELECT public.stars_sync_tick() AS r`)).r, null);
  ok("the schedule's token is long and random",
     (await one(`SELECT length(cron_token) n FROM public.stars_sync_secrets`)).n >= 60);

  await db.exec(`SET ROLE service_role`);
  eq("one run takes the lock", (await one(`SELECT public.stars_sync_try_lock(600) AS r`)).r, true);
  eq("  a second is turned away", (await one(`SELECT public.stars_sync_try_lock(600) AS r`)).r, false);
  await db.query(`SELECT public.stars_sync_finish_run('{"ok":1}'::jsonb, NULL, 'admin')`);
  eq("  finishing releases it", (await one(`SELECT public.stars_sync_try_lock(600) AS r`)).r, true);
  await db.query(`SELECT public.stars_sync_finish_run('{}'::jsonb, NULL, 'admin')`);
  await db.exec(`RESET ROLE`);
  await db.query(`UPDATE public.stars_sync_cursor SET locked_until = now() - interval '1 second'`);
  await db.exec(`SET ROLE service_role`);
  eq("a lock left by a run that died expires on its own", (await one(`SELECT public.stars_sync_try_lock(600) AS r`)).r, true);
  await db.exec(`RESET ROLE`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
