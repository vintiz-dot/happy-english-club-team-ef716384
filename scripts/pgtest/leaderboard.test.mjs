// The leaderboard engine (supabase/migrations/20261117120000_leaderboard_engine.sql).
//
// One calculation for every board. Each assertion below is one of the
// mis-wirings in docs/evidence/LEADERBOARD-audit.md, checked against the
// real migration on a database shaped like production's: a ledger, the
// trigger-kept monthly totals, enrolments that start and end, lessons and
// a register.
//
// Dates are worked out from the database's own Hanoi "today", so the suite
// does not depend on when it runs.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
// Key order is not meaningful: jsonb stores keys its own way.
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const eq = (n, got, want) => {
  const g = JSON.stringify(canon(got)), w = JSON.stringify(canon(want));
  ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`);
};

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;

  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    teacher_user uuid, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text);
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, display_name text);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    avatar_url text, family_id uuid REFERENCES public.families(id), linked_user_id uuid, secondary_user_id uuid,
    is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL, end_date date);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id), date date NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id), student_id uuid NOT NULL REFERENCES public.students(id),
    status text NOT NULL);
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id), title text NOT NULL, due_date date,
    submission_type text NOT NULL DEFAULT 'standard');
  CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id), student_id uuid NOT NULL REFERENCES public.students(id),
    status text, grade text, graded_at timestamptz);
  CREATE TABLE public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    homework_id uuid REFERENCES public.homeworks(id), homework_title text, session_id uuid, notes text,
    points integer NOT NULL, type text NOT NULL, date date NOT NULL, month text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.student_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL, class_id uuid NOT NULL, month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0, participation_points integer NOT NULL DEFAULT 0,
    reading_theory_points integer NOT NULL DEFAULT 0, vocabulary_quiz_points integer NOT NULL DEFAULT 0,
    total_points integer GENERATED ALWAYS AS
      (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (student_id, class_id, month));
  -- recompute_student_points and its trigger, as live on 17 Nov 2026.
  CREATE FUNCTION public.recompute_student_points(p_student uuid, p_class uuid, p_month text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  DECLARE v_h int; v_p int; v_r int; v_v int;
  BEGIN
    SELECT COALESCE(SUM(CASE WHEN type='homework' THEN points ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type IN ('participation','adjustment','correction','early_submission') THEN points ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type='reading_theory' THEN points ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type='vocabulary_quiz' THEN points ELSE 0 END),0)
      INTO v_h, v_p, v_r, v_v FROM point_transactions
     WHERE student_id=p_student AND class_id=p_class AND to_char(date,'YYYY-MM')=p_month;
    INSERT INTO student_points (student_id,class_id,month,homework_points,participation_points,reading_theory_points,vocabulary_quiz_points)
    VALUES (p_student,p_class,p_month,v_h,v_p,v_r,v_v)
    ON CONFLICT (student_id,class_id,month) DO UPDATE SET homework_points=EXCLUDED.homework_points,
      participation_points=EXCLUDED.participation_points, reading_theory_points=EXCLUDED.reading_theory_points,
      vocabulary_quiz_points=EXCLUDED.vocabulary_quiz_points;
  END $f$;
  CREATE FUNCTION public.update_student_points_from_transaction() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  BEGIN
    IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM recompute_student_points(OLD.student_id, OLD.class_id, to_char(OLD.date,'YYYY-MM')); END IF;
    IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM recompute_student_points(NEW.student_id, NEW.class_id, to_char(NEW.date,'YYYY-MM')); END IF;
    RETURN NULL;
  END $f$;
  CREATE TRIGGER trigger_update_points_from_transaction AFTER INSERT OR DELETE OR UPDATE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_student_points_from_transaction();
  CREATE TABLE public.student_attendance_streaks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL, class_id uuid NOT NULL, consecutive_days int NOT NULL DEFAULT 0,
    bonuses_awarded int NOT NULL DEFAULT 0);
  CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid,
    entity text, operation text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.archived_leaderboards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid, class_id uuid, month text, homework_points int, participation_points int,
    total_points int, rank int, archived_at timestamptz DEFAULT now(), archived_by uuid);
  CREATE TABLE public.monthly_leaders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid, month text, student_id uuid, total_points int, UNIQUE (class_id, month));

  CREATE FUNCTION public.is_teacher_of_class(_user_id uuid, _class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = _class_id AND c.teacher_user = _user_id) $f$;
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS $f$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.linked_user_id = user_id
      OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = s.family_id AND f.primary_user_id = user_id))) $f$;
  CREATE FUNCTION public.is_family_student(_student_id uuid, _user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT public.can_view_student(_student_id, _user_id) $f$;

  GRANT USAGE ON SCHEMA public TO authenticated, service_role, anon;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const db = new PGlite();
await db.exec(PRELUDE);
for (const f of MIGS) {
  try { await db.exec(readFileSync(f, "utf8")); }
  catch (e) { console.log(`  FAIL  migration ${f} :: ${e.message}`); process.exit(1); }
}

const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
const as = async (uid, fn) => {
  await db.exec(`SET ROLE ${uid === "service" ? "service_role" : "authenticated"}`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid === "service" ? "" : uid]);
  try { return await fn(); } finally { await db.exec("RESET ROLE"); await db.query(`SELECT set_config('test.uid', '', false)`); }
};
const refuses = async (uid, s, p) => {
  try { await as(uid, () => db.query(s, p)); return false; } catch { return true; }
};

const today = (await one(`SELECT public.hanoi_today()::text AS d`)).d;
const day = (n) => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monthStart = today.slice(0, 8) + "01";
const prevMonthDay = (() => { const d = new Date(monthStart + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 10); return d.toISOString().slice(0, 10); })();
const monthOf = (d) => d.slice(0, 7);

// People
const U = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  teacher: "00000000-0000-0000-0000-0000000000b1",
  otherTeacher: "00000000-0000-0000-0000-0000000000b2",
  parent: "00000000-0000-0000-0000-0000000000c1",
  stranger: "00000000-0000-0000-0000-0000000000d1",
};
await q(`INSERT INTO auth.users SELECT unnest($1::uuid[])`, [Object.values(U)]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'), ($2,'teacher'), ($3,'teacher'), ($4,'family')`,
  [U.admin, U.teacher, U.otherTeacher, U.parent]);
await q(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Ms Teacher')`, [U.teacher]);
const fam = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [U.parent])).id;
const cls = (await one(`INSERT INTO public.classes (name, teacher_user) VALUES ('Stars', $1) RETURNING id`, [U.teacher])).id;
const other = (await one(`INSERT INTO public.classes (name, teacher_user) VALUES ('Moons', $1) RETURNING id`, [U.otherTeacher])).id;

const kid = async (name, opts = {}) =>
  (await one(`INSERT INTO public.students (full_name, family_id) VALUES ($1, $2) RETURNING id`, [name, opts.family ?? null])).id;
const An = await kid("An", { family: fam });       // the parent's child
const Binh = await kid("Binh");
const Chi = await kid("Chi");
const Dung = await kid("Dung");                    // left the class last month
const Em = await kid("Em");                        // joined this month
const enrol = (s, c, from, to = null) =>
  q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,$3,$4)`, [s, c, from, to]);
await enrol(An, cls, "2026-01-01");
await enrol(Binh, cls, "2026-01-01");
await enrol(Chi, cls, "2026-01-01");
await enrol(Dung, cls, "2026-01-01", prevMonthDay);
await enrol(Em, cls, today);
await enrol(An, other, "2026-01-01");

const award = (s, c, points, type, date, notes = null, extra = {}) => q(
  `INSERT INTO public.point_transactions (student_id, class_id, points, type, date, month, notes, homework_id, created_by)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  [s, c, points, type, date, monthOf(date), notes, extra.homework ?? null, extra.by ?? null]);

const hwVideo = (await one(`INSERT INTO public.homeworks (class_id, title, due_date, submission_type)
  VALUES ($1,'Speak about pets',$2,'video') RETURNING id`, [cls, today])).id;
const hwPaper = (await one(`INSERT INTO public.homeworks (class_id, title, due_date) VALUES ($1,'Unit 4',$2) RETURNING id`, [cls, today])).id;

// This month: An 100 (homework 40, video 30, class 20, streak 50 - 40 correction), Binh 100, Chi 60, Em 30.
await award(An, cls, 40, "homework", today, "Homework graded", { homework: hwPaper });
await award(An, cls, 30, "homework", today, "Homework graded: A", { homework: hwVideo });
await award(An, cls, 20, "participation", today, "Great answer", { by: U.teacher });
await award(An, cls, 50, "participation", today, "Attendance streak bonus: 5 consecutive classes attended!");
await award(An, cls, -40, "correction", today, "Noisy", { by: U.teacher });
await award(Binh, cls, 100, "reading_theory", today, "Score updated from 0 to 100", { by: U.teacher });
await award(Chi, cls, 60, "vocabulary_quiz", today);
await award(Em, cls, 30, "participation", today, "Welcome", { by: U.teacher });
// Last month: Dung won it.
await award(Dung, cls, 500, "participation", prevMonthDay, "Big project", { by: U.teacher });
await award(An, cls, 200, "participation", prevMonthDay, "Project", { by: U.teacher });
// An's points in her other class must not reach this board.
await award(An, other, 999, "participation", today, "Other class");

// Lessons: two held this month, one cancelled. An attended both, Binh one.
const s1 = (await one(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,'Held') RETURNING id`, [cls, monthStart])).id;
const s2 = (await one(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,'Held') RETURNING id`, [cls, today])).id;
await q(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,'Canceled')`, [cls, today]);
// Two more held lessons last month (before Em joined).
const prevDay2 = (() => { const d = new Date(prevMonthDay + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })();
await q(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,'Held'), ($1,$3,'Held')`, [cls, prevMonthDay, prevDay2]);
await q(`INSERT INTO public.attendance (session_id, student_id, status) VALUES ($1,$3,'Present'), ($2,$3,'Present'), ($1,$4,'Present'), ($2,$4,'Absent')`,
  [s1, s2, An, Binh]);
await q(`INSERT INTO public.student_attendance_streaks (student_id, class_id, consecutive_days) VALUES ($1,$2,7), ($3,$2,3)`, [An, cls, Binh]);

const board = (uid, period = "month", anchor = null) =>
  as(uid, async () => (await one(`SELECT public.leaderboard_board($1, $2, $3::date) AS b`, [cls, period, anchor])).b);
const row = (b, id) => b.rows.find((r) => r.student_id === id);

console.log("rules");
for (const [p, want] of [[0, 1], [99, 1], [100, 2], [299, 2], [300, 3], [5499, 10], [5500, 11], [6499, 11], [6500, 12], [28996, 34]]) {
  eq(`level of ${p} points`, (await one(`SELECT (public.points_level($1)->>'level')::int AS l`, [p])).l, want);
}
// The dashboard showed calculateLevel; up to level 11 the server must agree with it exactly.
{
  const here = dirname(fileURLToPath(import.meta.url));
  const esbuild = await import("esbuild");
  const src = readFileSync(resolve(here, "..", "..", "src", "lib", "levelUtils.ts"), "utf8");
  const js = (await esbuild.transform(src, { loader: "ts", format: "esm" })).code;
  const tmp = join(mkdtempSync(join(tmpdir(), "lvl-")), "levelUtils.mjs");
  writeFileSync(tmp, js);
  const { calculateLevel } = await import(pathToFileURL(tmp).href);
  let agree = true, first = null;
  // Up to 6,499: above that the old code stopped at level 11 for ever.
  for (let p = 0; p <= 6499; p += 7) {
    const s = await one(`SELECT public.points_level($1) AS l`, [p]);
    const c = calculateLevel(p);
    // calculateLevel's progress carries float noise (456/800*100 = 56.99..), so allow under 1.
    if (s.l.level !== c.level || Math.abs(s.l.progress - c.progress) >= 1) { agree = false; first ??= { p, s: s.l, c }; }
  }
  ok("server level = the dashboard's old calculateLevel wherever that one did not cap", agree, first ? JSON.stringify(first) : "");
}
eq("streak bonus counts as streak, not class points",
  (await one(`SELECT public.points_category('participation','Attendance streak bonus (paid late): 10', false) AS c`)).c, "streak");
eq("video homework is its own tab", (await one(`SELECT public.points_category('homework', null, true) AS c`)).c, "video");
eq("a correction is class points", (await one(`SELECT public.points_category('correction','x', false) AS c`)).c, "class");

console.log("who may see what");
ok("a family cannot call the staff board", await refuses(U.parent, `SELECT public.leaderboard_board($1,'month',null)`, [cls]));
ok("a teacher of another class cannot", await refuses(U.otherTeacher, `SELECT public.leaderboard_board($1,'month',null)`, [cls]));
ok("nobody signed in cannot", await refuses("", `SELECT public.leaderboard_board($1,'month',null)`, [cls]));
ok("a signed-in user cannot call the inner engine", await refuses(U.teacher, `SELECT * FROM public.leaderboard_compute($1, $2::date, $2::date)`, [cls, today]));
ok("nor the family-shaped json (only class-leaderboard may)", await refuses(U.parent, `SELECT public.leaderboard_json($1,'month',null,'{}',false)`, [cls]));
ok("the whole centre is admin only (teacher refused)", await refuses(U.teacher, `SELECT public.leaderboard_centre('month', null)`));
ok("the TV feed is service-role only", await refuses(U.admin, `SELECT public.leaderboard_tv_feed(10)`));
const tb = await board(U.teacher);
ok("the class teacher sees the board", Array.isArray(tb.rows));
ok("an admin sees the board", Array.isArray((await board(U.admin)).rows));

console.log("this month's board");
eq("members: current children only (Dung left last month)", tb.rows.map((r) => r.name), ["An", "Binh", "Chi", "Em"]);
eq("An's total is this class only (her other class's 999 stays there)", row(tb, An).total, 100);
eq("An's categories", row(tb, An).categories, { homework: 40, video: 30, class: -20, streak: 50, vocabulary: 0, reading: 0 });
const sp = await one(`SELECT total_points, homework_points, participation_points FROM public.student_points WHERE student_id=$1 AND class_id=$2 AND month=$3`, [An, cls, monthOf(today)]);
eq("categories add up to the stored monthly total", row(tb, An).total, sp.total_points);
eq("homework + video = stored homework bucket", row(tb, An).categories.homework + row(tb, An).categories.video, sp.homework_points);
eq("ties share a rank: An and Binh both 1st, nobody 2nd", tb.rows.map((r) => r.rank), [1, 1, 3, 4]);
ok("tied flag set on both", row(tb, An).tied && row(tb, Binh).tied && !row(tb, Chi).tied);
eq("category rank: reading", row(tb, Binh).category_ranks.reading, 1);
eq("level counts every point ever, every class (100+200+999 = 1299 -> level 5)", row(tb, An).level.level, 5);
eq("lessons counted: held, inside the enrolment, cancelled left out", [row(tb, An).lessons, row(tb, An).attended, row(tb, Binh).attended], [2, 2, 1]);
eq("Em joined today: only lessons from her start count", row(tb, Em).lessons, today === monthStart ? 2 : 1);
eq("Em is marked new on this month's board (unless it is the 1st)", row(tb, Em).is_new, today > monthStart);
eq("An is not new", row(tb, An).is_new, false);
eq("the streak panel is the streak that pays (lessons in a row), An on 7", tb.streak, { student_id: An, name: "An", lessons: 7 });
eq("champions by tab", tb.champions.map((c) => [c.category, c.name]),
  [["homework", "An"], ["video", "An"], ["class", "Em"], ["streak", "An"], ["vocabulary", "Chi"], ["reading", "Binh"]]);
eq("climber: biggest gain in the last seven days", tb.climber?.name, "An");

// An enrolment that has not started yet does not put a child on today's board.
const Gia = await kid("Gia");
await enrol(Gia, cls, day(10));
ok("a child starting in ten days is not on the all-time board yet", !(await board(U.teacher, "all")).rows.some((r) => r.name === "Gia"));

console.log("other periods");
const last = await board(U.teacher, "month", prevMonthDay);
ok("last month's board has Dung, who was there then", !!row(last, Dung));
eq("and he won it", last.rows[0].name, "Dung");
ok("Em was not in the class last month", !row(last, Em));
eq("last month's climber looks at last month's final week, not this week", last.climber, null);
const week = await board(U.teacher, "week");
eq("week covers Monday to Sunday", [new Date(week.period.from + "T00:00:00Z").getUTCDay(), (new Date(week.period.to) - new Date(week.period.from)) / 864e5], [1, 6]);
const all = await board(U.teacher, "all");
eq("all time ranks on points per lesson (fair to Em, who joined late)", all.period.basis, "per_lesson");
eq("An's all-time in this class: 300 over 4 lessons = 75 a lesson", [row(all, An).total, Number(row(all, An).per_lesson)], [300, 75]);
eq("Em has the best average after one lesson but under 3 lessons ranks after the regulars",
  all.rows.map((r) => [r.name, r.rank]), [["An", 1], ["Binh", 2], ["Chi", 3], ["Em", 4]]);
ok("nobody is 'new' on the all-time board", all.rows.every((r) => r.is_new === false));
ok("no term set: the term board says so", await refuses(U.teacher, `SELECT public.leaderboard_board($1,'term',null)`, [cls]));
ok("a teacher cannot add a term", await refuses(U.teacher, `INSERT INTO public.school_terms (name, starts_on, ends_on) VALUES ('T', $1, $2)`, [monthStart, day(30)]));
await as(U.admin, () => q(`INSERT INTO public.school_terms (name, starts_on, ends_on) VALUES ('Autumn term', $1, $2)`, [monthStart, day(40)]));
ok("terms may not overlap", await refuses(U.admin, `INSERT INTO public.school_terms (name, starts_on, ends_on) VALUES ('Clash', $1, $2)`, [day(1), day(50)]));
const term = await board(U.teacher, "term");
eq("term board is named after the term", term.period.label, "Autumn term");
ok("everyone signed in can read the terms list", (await as(U.parent, () => q(`SELECT name FROM public.school_terms`))).length === 1);

console.log("what a family sees (through class-leaderboard)");
const fb = await as("service", async () => (await one(`SELECT public.leaderboard_json($1,'month',null,$2::uuid[],false) AS b`, [cls, [An]])).b);
ok("own child marked as self", row(fb, An).is_self === true && row(fb, Binh).is_self === false);
ok("own child's lessons and streak shown", row(fb, An).lessons === 2 && row(fb, An).streak_now === 7);
ok("a classmate's lessons, attendance and streak are not sent", !("lessons" in row(fb, Binh)) && !("attended" in row(fb, Binh)) && !("streak_now" in row(fb, Binh)) && !("joined_on" in row(fb, Binh)));
ok("a classmate is still a name, an avatar and points", row(fb, Binh).name === "Binh" && row(fb, Binh).total === 100);
ok("a classmate's points from other classes are not sent, only the level", !("all_time" in row(fb, Binh)) && !!row(fb, Binh).level && row(fb, An).all_time === 1299);
eq("the streak panel shows the family's own child only", fb.streak?.student_id, An);
ok("own child's place in the whole centre", row(fb, An).centre && row(fb, An).centre.rank >= 1 && row(fb, An).centre.of >= 4);
ok("no centre place on a classmate", !("centre" in row(fb, Binh)));
eq("same ranks as the staff board", fb.rows.map((r) => r.rank), tb.rows.map((r) => r.rank));

const wall = await as(U.teacher, async () => (await one(`SELECT public.leaderboard_board($1,'month',null,true) AS b`, [cls])).b);
ok("the projector (whole class reads it) gets no one's lessons or streak", wall.rows.every((r) => !("lessons" in r) && !("streak_now" in r)) && wall.streak === null);
eq("the projector has the same ranks", wall.rows.map((r) => r.rank), tb.rows.map((r) => r.rank));

console.log("a child's own figures");
const sum = await as(U.parent, async () => (await one(`SELECT public.student_points_summary($1::uuid[]) AS s`, [[An, Binh]])).s);
eq("family home: all-time across every month and class (was 0 for a child with more than one month)", sum[An]?.all_time, 1299);
ok("a child who is not the family's is left out", !(Binh in sum));
eq("level comes with it", sum[An].level.level, 5);
const hist = await as(U.parent, async () => (await one(`SELECT public.student_points_history($1, $2::date, $3::date) AS h`, [An, "2026-01-01", day(1)])).h);
eq("family sees every award of their child, both classes", hist.rows.length, 7);
eq("the server gives the total (no sum in the screen) and says nothing was cut", [Number(hist.total), Number(hist.count), hist.truncated], [1299, 7, false]);
const th = await as(U.teacher, async () => (await one(`SELECT public.student_points_history($1, $2::date, $3::date) AS h`, [An, "2026-01-01", day(1)])).h);
ok("a teacher sees only the rows of their own class", th.rows.length === 6 && th.rows.every((r) => r.class_name === "Stars") && Number(th.total) === 300);
const tsum = await as(U.teacher, async () => (await one(`SELECT public.student_points_summary($1::uuid[]) AS s`, [[An]])).s);
ok("a teacher's summary lists only the classes they teach", tsum[An].classes.length === 1 && tsum[An].classes[0].class_id === cls);
eq("but the level is the child's own, every class", tsum[An].level.level, 5);
ok("a stranger is refused", await refuses(U.stranger, `SELECT * FROM public.student_points_history($1, $2::date, $3::date)`, [An, "2026-01-01", day(1)]));

console.log("admin audit");
await q(`INSERT INTO public.homework_submissions (homework_id, student_id, status, grade, graded_at) VALUES ($1,$2,'graded','B',now())`, [hwPaper, Chi]);
await q(`INSERT INTO public.audit_log (actor_user_id, entity, operation, diff) VALUES ($1,'point_transactions','DELETE', $2)`,
  [U.teacher, JSON.stringify({ old: { student_id: Binh, class_id: cls, points: 15, notes: "oops" } })]);
ok("only an admin can open the audit", await refuses(U.teacher, `SELECT public.points_manual_changes($1::date,$2::date)`, [monthStart, today]));
const audit = await as(U.admin, async () => (await one(`SELECT public.points_manual_changes($1::date,$2::date) AS a`, [day(-60), day(1)])).a);
ok("awards made by a person are listed, with who", audit.made.length >= 5 && audit.made.some((m) => m.by === "Ms Teacher"));
ok("system awards (streak bonus, no author) are not listed as manual", !audit.made.some((m) => m.category === "streak"));
eq("a removed award is listed with its points", audit.removed.map((r) => [r.what, r.points, r.by]), [["DELETE", 15, "Ms Teacher"]]);
eq("graded homework that paid no points is listed", audit.graded_without_points.map((g) => [g.student, g.homework]), [["Chi", "Unit 4"]]);

console.log("the monthly 'reset' and the TV");
const before = await one(`SELECT SUM(total_points)::int AS t FROM public.student_points`);
await as("service", () => q(`SELECT * FROM public.archive_and_reset_monthly_leaderboard($1)`, [monthOf(prevMonthDay)]));
const after = await one(`SELECT SUM(total_points)::int AS t FROM public.student_points`);
eq("the reset zeroes nothing any more", after.t, before.t);
eq("it saves last month's standings, rank from the same engine",
  (await q(`SELECT s.full_name, a.rank FROM public.archived_leaderboards a JOIN public.students s ON s.id=a.student_id WHERE a.class_id=$1 ORDER BY a.rank, s.full_name`, [cls])).map((r) => [r.full_name, r.rank]),
  [["Dung", 1], ["An", 2], ["Binh", 3], ["Chi", 3]]);
eq("and the class's champion", (await one(`SELECT s.full_name FROM public.monthly_leaders m JOIN public.students s ON s.id=m.student_id WHERE m.class_id=$1`, [cls])).full_name, "Dung");
const tv = await as("service", async () => (await one(`SELECT public.leaderboard_tv_feed(10) AS f`)).f);
eq("TV champions: last month's winner, from the ledger", tv.champions.filter((c) => c.class_id === cls).map((c) => c.student_id), [Dung]);
const tvClass = tv.classes.find((c) => c.class_id === cls);
eq("TV class board ranks like the class board", tvClass.rows.map((r) => r.rank), [1, 1, 3, 4]);
ok("TV centre board has An with both classes' points", tv.centre.find((r) => r.student_id === An)?.points === 1099);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
