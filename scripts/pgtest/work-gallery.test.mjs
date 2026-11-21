// Student work gallery: who sees which work, and who may share it.
//
// Drives supabase/migrations/20261118100000_student_work_gallery.sql against an
// in-process Postgres. The rules that matter:
//   - admin: every item, every status, teamwork once;
//   - teacher: only a class they hold, only children enrolled there today and
//     active, only work dated inside their window (default: from the first
//     lesson on; cover: the day of a lesson they held);
//   - a child shares only their own work; it is pending until a teacher who may
//     see that work (or an admin) approves; classmates see it only then;
//   - class_work_gallery names no bucket or path, and a family sees only its
//     own children's classes.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, primary_user_id uuid);
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, default_teacher_id uuid, slot_teacher uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    linked_user_id uuid, secondary_user_id uuid, family_id uuid, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL,
    teacher_id uuid NOT NULL, date date NOT NULL, status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, title text NOT NULL);
  CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL,
    student_id uuid NOT NULL, storage_key text, status text NOT NULL DEFAULT 'submitted',
    submitted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.video_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL,
    student_id uuid NOT NULL, class_id uuid NOT NULL, video_path text NOT NULL, status text NOT NULL DEFAULT 'uploaded',
    submitted_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid,
    original_filename text, storage_path text, external_url text, workflow text NOT NULL DEFAULT 'general',
    status text NOT NULL DEFAULT 'needs_review', is_teamwork boolean NOT NULL DEFAULT false,
    member_student_ids uuid[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = can_view_student.student_id
          AND (s.linked_user_id = can_view_student.user_id OR s.secondary_user_id = can_view_student.user_id
               OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = s.family_id AND f.primary_user_id = can_view_student.user_id))) $f$;
  -- Stand-in for the dated weekly slots: a class names one slot teacher.
  CREATE FUNCTION public.class_slots_on(p_class_id uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE AS
    $f$ SELECT CASE WHEN c.slot_teacher IS NULL THEN '[]'::jsonb
                    ELSE jsonb_build_array(jsonb_build_object('teacherId', c.slot_teacher::text)) END
          FROM public.classes c WHERE c.id = p_class_id $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");
const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(sql());
ok("applies", true);
{
  let again = null;
  try { await db.exec(sql()); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}
await db.exec("GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated");

const one = async (q, p) => (await db.query(q, p)).rows[0];
const U = {
  admin: "99999999-9999-9999-9999-999999999999",
  ada: "11111111-1111-1111-1111-111111111111",   // default teacher of Stars, first lesson 1 Oct
  cora: "22222222-2222-2222-2222-222222222222",  // covered Stars on 10 Oct only
  ben: "33333333-3333-3333-3333-333333333333",   // teaches Moons
  minh: "44444444-4444-4444-4444-444444444444",  // in Stars
  lan: "55555555-5555-5555-5555-555555555555",   // in Stars
  an: "66666666-6666-6666-6666-666666666666",    // in Moons
  gone: "77777777-7777-7777-7777-777777777777",  // left Stars
  mum: "88888888-8888-8888-8888-888888888888",   // Minh's family login
  mum2: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",  // An's family login
};
await db.query(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [Object.values(U)]);
const tch = async (name, uid) => (await one(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1,$2) RETURNING id`, [uid, name])).id;
const ada = await tch("Ada", U.ada), cora = await tch("Cora", U.cora), ben = await tch("Ben", U.ben);
const stars = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Stars',$1) RETURNING id`, [ada])).id;
const moons = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Moons',$1) RETURNING id`, [ben])).id;
const fam1 = (await one(`INSERT INTO public.families (name, primary_user_id) VALUES ('Nguyen',$1) RETURNING id`, [U.mum])).id;
const fam2 = (await one(`INSERT INTO public.families (name, primary_user_id) VALUES ('Tran',$1) RETURNING id`, [U.mum2])).id;
const st = async (name, login, fam, active = true) =>
  (await one(`INSERT INTO public.students (full_name, linked_user_id, family_id, is_active) VALUES ($1,$2,$3,$4) RETURNING id`, [name, login, fam, active])).id;
const minh = await st("Minh Nguyen", U.minh, fam1), lan = await st("Lan Nguyen", U.lan, fam1);
const an = await st("An Tran", U.an, fam2), gone = await st("Gone Kid", U.gone, null);
await db.query(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$4),($2,$4),($3,$5),($6,$4)`, [minh, lan, an, stars, moons, gone]);
await db.query(`UPDATE public.enrollments SET end_date = '2026-10-01' WHERE student_id = $1`, [gone]);
// Ada's lessons start 1 Oct; Cora covers one lesson on 10 Oct; one of Ada's was cancelled on 5 Oct.
await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date, status) VALUES
  ($1,$2,'2026-10-01','Held'), ($1,$2,'2026-10-08','Held'), ($1,$3,'2026-10-10','Held'),
  ($4,$5,'2026-10-02','Held')`, [stars, ada, cora, moons, ben]);
await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date, status) VALUES ($1,$2,'2026-09-20','Canceled')`, [stars, cora]);

// Work: dated in Hanoi time.
const work = async (o) => (await one(
  `INSERT INTO public.student_work (student_id, class_id, original_filename, storage_path, status, is_teamwork, member_student_ids, created_at)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
  [o.student ?? null, o.cls, o.name, o.path ?? `students/${o.name}.jpg`, o.status ?? "approved", !!o.team, o.members ?? [], o.at])).id;
const before = await work({ student: minh, cls: stars, name: "before-lessons", at: "2026-09-25T05:00:00Z" });
const w1 = await work({ student: minh, cls: stars, name: "minh-poem", at: "2026-10-03T05:00:00Z" });
const cover = await work({ student: lan, cls: stars, name: "lan-on-cover-day", at: "2026-10-10T05:00:00Z" });
const offday = await work({ student: lan, cls: stars, name: "lan-off-day", at: "2026-10-12T05:00:00Z" });
const team = await work({ cls: stars, name: "team-poster", team: true, members: [minh, lan], at: "2026-10-09T05:00:00Z" });
const review = await work({ student: minh, cls: stars, name: "minh-unreviewed", status: "needs_review", at: "2026-10-11T05:00:00Z" });
const leftWork = await work({ student: gone, cls: stars, name: "gone-work", at: "2026-10-03T05:00:00Z" });
const moonsWork = await work({ student: an, cls: moons, name: "an-moon", at: "2026-10-03T05:00:00Z" });
// Hanoi midnight: 2026-10-09T17:30Z is already 10 Oct in Hanoi.
const lateCover = await work({ student: minh, cls: stars, name: "minh-late-night", at: "2026-10-09T17:30:00Z" });

const hw = (await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'Unit 3') RETURNING id`, [stars])).id;
const sub = (await one(`INSERT INTO public.homework_submissions (homework_id, student_id, storage_key, submitted_at)
  VALUES ($1,$2,'submissions/x/y/page.jpg','2026-10-04T05:00:00Z') RETURNING id`, [hw, minh])).id;
await db.query(`INSERT INTO public.homework_submissions (homework_id, student_id, storage_key) VALUES ($1,$2,NULL)`, [hw, lan]);
await db.query(`INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path, submitted_at)
  VALUES ($1,$2,$3,'v/1.mp4','2026-10-05T05:00:00Z')`, [hw, lan, stars]);

async function as(uid, role, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, role, fn) => { try { await as(uid, role, fn); return null; } catch (e) { return e.message; } };
const rpc = async (uid, role, q, p) => as(uid, role, async () => (await db.query(q, p)).rows[0]?.r);
const names = (arr) => arr.map((x) => x.title).sort();

console.log("\nadmin");
{
  const all = await rpc(U.admin, "admin", `SELECT public.admin_work_gallery() r`);
  ok("sees the unreviewed work too (every status)", names(all).includes("minh-unreviewed"));
  ok("sees a child who has left a class", names(all).includes("gone-work"));
  ok("sees the homework file and the video", names(all).includes("Unit 3") && all.filter((x) => x.source === "video").length === 1);
  ok("a homework row with no file is not listed", all.filter((x) => x.source === "homework").length === 1);
  eq("teamwork appears ONCE", all.filter((x) => x.title === "team-poster").length, 1);
  const t = all.find((x) => x.title === "team-poster");
  eq("...with every member's name", t.students.map((s) => s.name).sort(), ["Lan Nguyen", "Minh Nguyen"]);
  ok("...and each member's family", t.students.every((s) => s.family_name === "Nguyen"));
  ok("a teacher is refused", /Admins only/.test(await tryAs(U.ada, "teacher", () => db.query(`SELECT public.admin_work_gallery()`)) ?? ""));
  ok("a child is refused", /Admins only/.test(await tryAs(U.minh, "student", () => db.query(`SELECT public.admin_work_gallery()`)) ?? ""));
}

console.log("\nteacher: default (Ada, first lesson 1 Oct)");
{
  const mine = await rpc(U.ada, "teacher", `SELECT public.teacher_work_gallery() r`);
  const n = names(mine);
  ok("sees work from her first lesson on", n.includes("minh-poem") && n.includes("lan-off-day") && n.includes("Unit 3"));
  ok("NO work from before her first lesson", !n.includes("before-lessons"));
  ok("not a child who has left the class", !n.includes("gone-work"));
  ok("not another teacher's class", !n.includes("an-moon"));
  ok("teamwork once, when a member is in the class now", mine.filter((x) => x.title === "team-poster").length === 1);
  ok("sees the video and unreviewed work of her class", n.includes("minh-unreviewed") && mine.some((x) => x.source === "video"));
  ok("Hanoi date: 17:30Z on 9 Oct is 10 Oct, inside her window", n.includes("minh-late-night"));
}
console.log("\nteacher: cover (Cora, 10 Oct only; a cancelled 20 Sep lesson grants nothing)");
{
  const mine = await rpc(U.cora, "teacher", `SELECT public.teacher_work_gallery() r`);
  const n = names(mine);
  ok("sees work dated on the day she covered", n.includes("lan-on-cover-day") && n.includes("minh-late-night"));
  ok("NOT the work of other days", !n.includes("minh-poem") && !n.includes("lan-off-day") && !n.includes("team-poster") && !n.includes("before-lessons"));
  ok("NOT a cancelled lesson's day", !names(mine).includes("before-lessons"));
}
console.log("\nteacher: elsewhere");
{
  const ben_ = names(await rpc(U.ben, "teacher", `SELECT public.teacher_work_gallery() r`));
  eq("Ben sees only Moons", ben_, ["an-moon"]);
  // Ada stops being the default: only her lesson days remain.
  await db.query(`UPDATE public.classes SET default_teacher_id = $1 WHERE id = $2`, [cora, stars]);
  const ada_ = names(await rpc(U.ada, "teacher", `SELECT public.teacher_work_gallery() r`));
  ok("once no longer default, only the days she taught (1 and 8 Oct) remain", !ada_.includes("lan-off-day") && !ada_.includes("minh-unreviewed"));
  await db.query(`UPDATE public.classes SET default_teacher_id = $1 WHERE id = $2`, [ada, stars]);
  // A weekly slot counts as default too.
  await db.query(`UPDATE public.classes SET default_teacher_id = NULL, slot_teacher = $1 WHERE id = $2`, [ada, stars]);
  ok("a weekly slot teacher is default", names(await rpc(U.ada, "teacher", `SELECT public.teacher_work_gallery() r`)).includes("lan-off-day"));
  await db.query(`UPDATE public.classes SET default_teacher_id = $1, slot_teacher = NULL WHERE id = $2`, [ada, stars]);
  ok("a child is refused", /Teachers only/.test(await tryAs(U.minh, "student", () => db.query(`SELECT public.teacher_work_gallery()`)) ?? ""));
}

console.log("\nsharing");
let shareId;
{
  const r = await rpc(U.minh, "student", `SELECT public.request_work_share('student_work', $1) r`, [w1]);
  eq("the owner's request is pending", r.status, "pending");
  shareId = r.id;
  eq("asking again changes nothing", (await rpc(U.minh, "student", `SELECT public.request_work_share('student_work', $1) r`, [w1])).id, shareId);
  ok("another child cannot share it", /Only the child/.test(await tryAs(U.lan, "student", () => db.query(`SELECT public.request_work_share('student_work', $1)`, [w1])) ?? ""));
  ok("a family login cannot share it", /Only the child/.test(await tryAs(U.mum, "family", () => db.query(`SELECT public.request_work_share('student_work', $1)`, [w1])) ?? ""));
  ok("work the teacher has not approved cannot be shared", /not approved/.test(await tryAs(U.minh, "student", () => db.query(`SELECT public.request_work_share('student_work', $1)`, [review])) ?? ""));
  ok("a video cannot go through this flow", /cannot be shared/.test(await tryAs(U.lan, "student", () => db.query(`SELECT public.request_work_share('video', gen_random_uuid())`)) ?? ""));
  ok("a child who left the class cannot share", /not in this class/.test(await tryAs(U.gone, "student", () => db.query(`SELECT public.request_work_share('student_work', $1)`, [leftWork])) ?? ""));
  const t = await rpc(U.lan, "student", `SELECT public.request_work_share('student_work', $1) r`, [team]);
  eq("a team member can share the team's work", t.status, "pending");

  const lanSees = await rpc(U.lan, "student", `SELECT public.class_work_gallery($1) r`, [lan]);
  eq("nothing reaches classmates while pending", lanSees, []);

  ok("a teacher of another class cannot decide", /not one you may decide/.test(await tryAs(U.ben, "teacher", () => db.query(`SELECT public.decide_work_share($1, true)`, [shareId])) ?? ""));
  ok("a cover teacher outside the day cannot decide", /not one you may decide/.test(await tryAs(U.cora, "teacher", () => db.query(`SELECT public.decide_work_share($1, true)`, [shareId])) ?? ""));
  ok("a child cannot approve their own", /Staff only/.test(await tryAs(U.minh, "student", () => db.query(`SELECT public.decide_work_share($1, true)`, [shareId])) ?? ""));
  eq("the class's teacher approves", (await rpc(U.ada, "teacher", `SELECT public.decide_work_share($1, true) r`, [shareId])).status, "approved");

  const seen = await rpc(U.lan, "student", `SELECT public.class_work_gallery($1) r`, [lan]);
  eq("now a classmate sees it", seen.map((x) => x.title), ["minh-poem"]);
  ok("with the owner's full name", seen[0].students[0].name === "Minh Nguyen");
  ok("and no bucket, path, status or note", !("bucket" in seen[0]) && !("path" in seen[0]) && !("status" in seen[0]) && !("teacher_notes" in seen[0]));
  const fam = await rpc(U.mum, "family", `SELECT public.class_work_gallery($1) r`, [minh]);
  eq("a family sees its own child's class gallery", fam.length, 1);
  ok("another family is refused", /Not your child/.test(await tryAs(U.mum2, "family", () => db.query(`SELECT public.class_work_gallery($1)`, [minh])) ?? ""));
  eq("a child in another class sees nothing of Stars", await rpc(U.an, "student", `SELECT public.class_work_gallery($1) r`, [an]), []);
  eq("a child who has left Stars sees nothing of it", await rpc(U.gone, "student", `SELECT public.class_work_gallery($1) r`, [gone]), []);

  ok("work_share_file: a classmate gets the file", (await rpc(U.lan, "student", `SELECT public.work_share_file($1) r`, [shareId])).path === "students/minh-poem.jpg");
  eq("work_share_file: a child of another class does not", await rpc(U.an, "student", `SELECT public.work_share_file($1) r`, [shareId]), null);
  eq("work_share_file: a pending share is not served", await rpc(U.lan, "student", `SELECT public.work_share_file($1) r`, [t.id]), null);

  eq("the owner sees its status", (await as(U.minh, "student", async () => (await db.query(`SELECT status FROM public.work_shares`)).rows.map((x) => x.status))), ["approved"]);
  eq("a classmate reads no request rows", await as(U.an, "student", async () => (await db.query(`SELECT 1 FROM public.work_shares`)).rows.length), 0);
  ok("a child's direct UPDATE of the table is refused (SELECT is the only grant; writes go through the functions)",
    /permission denied/.test(await tryAs(U.minh, "student", () => db.query(`UPDATE public.work_shares SET status = 'approved'`)) ?? ""));

  eq("a teacher takes it down", (await rpc(U.ada, "teacher", `SELECT public.decide_work_share($1, false) r`, [shareId])).status, "declined");
  eq("...and it leaves the class gallery", await rpc(U.lan, "student", `SELECT public.class_work_gallery($1) r`, [lan]), []);
  ok("a declined request cannot be approved later", /already declined/.test(await tryAs(U.ada, "teacher", () => db.query(`SELECT public.decide_work_share($1, true)`, [shareId])) ?? ""));
  eq("the child can ask again", (await rpc(U.minh, "student", `SELECT public.request_work_share('student_work', $1) r`, [w1])).status, "pending");
  eq("an admin may decide too", (await rpc(U.admin, "admin", `SELECT public.decide_work_share($1, true) r`, [shareId])).status, "approved");

  const h = await rpc(U.minh, "student", `SELECT public.request_work_share('homework', $1) r`, [sub]);
  eq("a homework file can be shared", h.status, "pending");
  await rpc(U.ada, "teacher", `SELECT public.decide_work_share($1, true) r`, [h.id]);
  eq("and appears after approval", (await rpc(U.lan, "student", `SELECT public.class_work_gallery($1) r`, [lan])).map((x) => x.title).sort(), ["Unit 3", "minh-poem"]);
  await as(U.minh, "student", () => db.query(`SELECT public.withdraw_work_share($1)`, [h.id]));
  eq("the owner takes it back", (await rpc(U.lan, "student", `SELECT public.class_work_gallery($1) r`, [lan])).length, 1);
  ok("a classmate cannot take it back", /Only the child/.test(await tryAs(U.an, "student", () => db.query(`SELECT public.withdraw_work_share($1)`, [shareId])) ?? ""));
}

console.log("\ninternals are not callable");
ok("_work_items is not callable by a signed-in user", /permission denied/.test(await tryAs(U.admin, "admin", () => db.query(`SELECT * FROM public._work_items()`)) ?? ""));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
