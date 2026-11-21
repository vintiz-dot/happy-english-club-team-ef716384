// Class Facebook group links: who may read and set them.
//
// Drives supabase/migrations/20261110090000_class_facebook_groups.sql. The
// link to a group of children's videos must reach only that class's
// families and teachers - never someone signed out, another class's
// family, or a child whose enrollment has ended - and only admins set it.
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
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, default_teacher_user uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, linked_user_id uuid);
  CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id),
    end_date date);
  -- As in production: a family cannot read enrollments directly. The
  -- policy must still work, which is why its check is SECURITY DEFINER.
  ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = is_teacher_of_class.class_id
                         AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = can_view_student.student_id
                         AND s.linked_user_id = can_view_student.user_id) $f$;

  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
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

const one = async (q, p) => (await db.query(q, p)).rows[0];
const U = {
  admin: "10000000-0000-0000-0000-000000000000",
  teacher: "11111111-1111-1111-1111-111111111111",
  otherTeacher: "22222222-2222-2222-2222-222222222222",
  minhLogin: "33333333-3333-3333-3333-333333333333",
  leftLogin: "44444444-4444-4444-4444-444444444444",
  otherFamily: "55555555-5555-5555-5555-555555555555",
};
const cls = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Stars', $1) RETURNING id`, [U.teacher])).id;
const otherCls = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Moons', $1) RETURNING id`, [U.otherTeacher])).id;
const minh = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Minh', $1) RETURNING id`, [U.minhLogin])).id;
const left = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Left', $1) RETURNING id`, [U.leftLogin])).id;
const other = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Other', $1) RETURNING id`, [U.otherFamily])).id;
await db.query(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1,$4,NULL), ($2,$4,'2026-01-31'), ($3,$5,NULL)`,
  [minh, left, other, cls, otherCls]);

async function as(uid, role, fn, dbRole = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec(`SET LOCAL ROLE ${dbRole}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (...a) => { try { await as(...a); return null; } catch (e) { return e.message; } };
const URL_ = "https://www.facebook.com/groups/hecstars";
const read = (uid, role, dbRole) => as(uid, role, async () =>
  (await db.query(`SELECT group_url FROM public.class_facebook_groups WHERE class_id=$1`, [cls])).rows.map((r) => r.group_url), dbRole);

console.log("=== setting the link ===");
eq("a teacher cannot set it", /row-level security/.test(await tryAs(U.teacher, "teacher", () =>
  db.query(`INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,$2)`, [cls, URL_])) ?? ""), true);
eq("a family cannot set it", /row-level security/.test(await tryAs(U.minhLogin, "student", () =>
  db.query(`INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,$2)`, [cls, URL_])) ?? ""), true);
eq("a link that is not a facebook.com group is refused", /class_facebook_groups_url_check/.test(await tryAs(U.admin, "admin", () =>
  db.query(`INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,'https://evil.example/groups/x')`, [cls])) ?? ""), true);
eq("  as is plain http", /class_facebook_groups_url_check/.test(await tryAs(U.admin, "admin", () =>
  db.query(`INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,'http://facebook.com/groups/x')`, [cls])) ?? ""), true);
await as(U.admin, "admin", () => db.query(
  `INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,$2)
   ON CONFLICT (class_id) DO UPDATE SET group_url = EXCLUDED.group_url`, [cls, URL_]));
eq("an admin sets it", (await one(`SELECT group_url, updated_by FROM public.class_facebook_groups WHERE class_id=$1`, [cls])),
  { group_url: URL_, updated_by: U.admin });
await as(U.admin, "admin", () => db.query(
  `INSERT INTO public.class_facebook_groups (class_id, group_url) VALUES ($1,'https://facebook.com/groups/123456789/')
   ON CONFLICT (class_id) DO UPDATE SET group_url = EXCLUDED.group_url`, [cls]));
eq("  and changes it with an upsert (numeric ids and a trailing / are fine)",
  (await one(`SELECT group_url FROM public.class_facebook_groups WHERE class_id=$1`, [cls])).group_url, "https://facebook.com/groups/123456789/");
await db.query(`UPDATE public.class_facebook_groups SET group_url=$2 WHERE class_id=$1`, [cls, URL_]);

console.log("=== reading the link ===");
eq("the class's family reads it", await read(U.minhLogin, "student"), [URL_]);
eq("the class's teacher reads it", await read(U.teacher, "teacher"), [URL_]);
eq("an admin reads it", await read(U.admin, "admin"), [URL_]);
eq("another class's family does not", await read(U.otherFamily, "student"), []);
eq("another class's teacher does not", await read(U.otherTeacher, "teacher"), []);
eq("a child whose enrollment ended does not", await read(U.leftLogin, "student"), []);
eq("someone signed out does not", /permission denied/.test(await tryAs(null, "", () =>
  db.query(`SELECT group_url FROM public.class_facebook_groups`), "anon") ?? ""), true);

console.log("=== removing it ===");
eq("a teacher cannot delete it", (await as(U.teacher, "teacher", () =>
  db.query(`DELETE FROM public.class_facebook_groups WHERE class_id=$1 RETURNING 1`, [cls]))).rows.length, 0);
await as(U.admin, "admin", () => db.query(`DELETE FROM public.class_facebook_groups WHERE class_id=$1`, [cls]));
eq("an admin deletes it", (await one(`SELECT count(*)::int c FROM public.class_facebook_groups`)).c, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
