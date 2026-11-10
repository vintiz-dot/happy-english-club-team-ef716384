// Language Support: who may write a picture set, who may switch it on for a
// class, and who may read it.
//
// Drives supabase/migrations/20261110090000_language_support.sql against an
// in-process Postgres. The rules that matter: a teacher can switch a set on
// only for a class they teach; a child sees a set only while it is ACTIVE for
// a class they are enrolled in NOW; and nobody but the owner edits it.
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
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, default_teacher_user uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, linked_user_id uuid);
  CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id),
    end_date date);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = is_teacher_of_class.class_id
                       AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = can_view_student.student_id
                       AND s.linked_user_id = can_view_student.user_id) $f$;
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

const one = async (q, p) => (await db.query(q, p)).rows[0];
const U = {
  ada: "11111111-1111-1111-1111-111111111111",   // teaches Stars and Suns
  ben: "22222222-2222-2222-2222-222222222222",   // teaches Moons
  admin: "99999999-9999-9999-9999-999999999999",
  minh: "33333333-3333-3333-3333-333333333333",  // in Stars
  an: "44444444-4444-4444-4444-444444444444",    // in Moons
  gone: "55555555-5555-5555-5555-555555555555",  // left Stars
};
await db.query(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [Object.values(U)]);
const stars = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Stars',$1) RETURNING id`, [U.ada])).id;
const suns = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Suns',$1) RETURNING id`, [U.ada])).id;
const moons = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Moons',$1) RETURNING id`, [U.ben])).id;
const st = async (name, login) => (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ($1,$2) RETURNING id`, [name, login])).id;
const minh = await st("Minh", U.minh), an = await st("An", U.an), gone = await st("Gone", U.gone);
await db.query(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$4), ($2,$5), ($3,$4)`, [minh, an, gone, stars, moons]);
await db.query(`UPDATE public.enrollments SET end_date = '2026-10-01' WHERE student_id = $1`, [gone]);

async function as(uid, role, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, role, fn) => { try { await as(uid, role, fn); return null; } catch (e) { return e.message; } };
const rows = async (uid, role, q, p) => as(uid, role, async () => (await db.query(q, p)).rows);

console.log("=== a teacher builds a set ===");
const sentence = [{ text: "The cat sits.", tokens: ["The", "cat", "sits", "."], cells: [] }];
const setId = (await as(U.ada, "teacher", () => db.query(
  `INSERT INTO public.language_support_sets (owner_user_id, title, sentences) VALUES ($1,'Animals',$2) RETURNING id`,
  [U.ada, JSON.stringify(sentence)]))).rows[0].id;
ok("a teacher saves a set", !!setId);
ok("a teacher cannot save a set in another teacher's name",
  /row-level security/.test((await tryAs(U.ada, "teacher", () => db.query(
    `INSERT INTO public.language_support_sets (owner_user_id, title) VALUES ($1,'Forged')`, [U.ben]))) ?? ""));
ok("a child cannot create a set",
  /row-level security/.test((await tryAs(U.minh, "student", () => db.query(
    `INSERT INTO public.language_support_sets (owner_user_id, title) VALUES ($1,'Mine')`, [U.minh]))) ?? ""));
ok("an empty title is refused",
  /check/.test((await tryAs(U.ada, "teacher", () => db.query(
    `INSERT INTO public.language_support_sets (owner_user_id, title) VALUES ($1,'   ')`, [U.ada]))) ?? ""));

console.log("=== switching a set on for classes ===");
await as(U.ada, "teacher", () => db.query(
  `INSERT INTO public.language_support_set_classes (set_id, class_id, created_by) VALUES ($1,$2,$3), ($1,$4,$3)`,
  [setId, stars, U.ada, suns]));
eq("a teacher activates a set for several of their classes",
  (await rows(U.ada, "teacher", `SELECT count(*)::int c FROM public.language_support_set_classes WHERE set_id=$1`, [setId]))[0].c, 2);
ok("but not for a class they do not teach",
  /row-level security/.test((await tryAs(U.ada, "teacher", () => db.query(
    `INSERT INTO public.language_support_set_classes (set_id, class_id) VALUES ($1,$2)`, [setId, moons]))) ?? ""));
ok("another teacher cannot activate this set, even for their own class",
  /row-level security/.test((await tryAs(U.ben, "teacher", () => db.query(
    `INSERT INTO public.language_support_set_classes (set_id, class_id) VALUES ($1,$2)`, [setId, moons]))) ?? ""));
ok("a child cannot switch a set on",
  /row-level security|permission/.test((await tryAs(U.minh, "student", () => db.query(
    `INSERT INTO public.language_support_set_classes (set_id, class_id) VALUES ($1,$2)`, [setId, stars]))) ?? ""));

console.log("=== who can read it ===");
eq("a child in an active class reads the set", (await rows(U.minh, "student", `SELECT title FROM public.language_support_sets`)).map((r) => r.title), ["Animals"]);
eq("  and sees which of their classes has it",
  (await rows(U.minh, "student", `SELECT class_id FROM public.language_support_set_classes`)).map((r) => r.class_id), [stars]);
eq("a child in another class sees nothing", (await rows(U.an, "student", `SELECT id FROM public.language_support_sets`)).length, 0);
eq("a child who has left the class sees nothing", (await rows(U.gone, "student", `SELECT id FROM public.language_support_sets`)).length, 0);
eq("another teacher, not of an activated class, sees nothing", (await rows(U.ben, "teacher", `SELECT id FROM public.language_support_sets`)).length, 0);
eq("an admin sees it", (await rows(U.admin, "admin", `SELECT id FROM public.language_support_sets`)).length, 1);

await as(U.ada, "teacher", () => db.query(
  `UPDATE public.language_support_set_classes SET active = false WHERE set_id=$1 AND class_id=$2`, [setId, stars]));
eq("pausing a class hides the set from its children at once", (await rows(U.minh, "student", `SELECT id FROM public.language_support_sets`)).length, 0);
eq("  and the teacher still sees the class row", (await rows(U.ada, "teacher", `SELECT active FROM public.language_support_set_classes WHERE class_id=$1`, [stars]))[0].active, false);
await as(U.ada, "teacher", () => db.query(
  `UPDATE public.language_support_set_classes SET active = true WHERE set_id=$1 AND class_id=$2`, [setId, stars]));
eq("switching it back on shows it again", (await rows(U.minh, "student", `SELECT id FROM public.language_support_sets`)).length, 1);

console.log("=== who can change it ===");
await as(U.minh, "student", () => db.query(`UPDATE public.language_support_sets SET title='Hacked' WHERE id=$1`, [setId]));
eq("a child's edit changes nothing", (await one(`SELECT title FROM public.language_support_sets WHERE id=$1`, [setId])).title, "Animals");
await as(U.minh, "student", () => db.query(`DELETE FROM public.language_support_sets WHERE id=$1`, [setId]));
eq("a child's delete removes nothing", (await one(`SELECT count(*)::int c FROM public.language_support_sets`)).c, 1);
await as(U.ada, "teacher", () => db.query(`UPDATE public.language_support_sets SET title='Farm animals' WHERE id=$1`, [setId]));
eq("the owner renames it", (await one(`SELECT title FROM public.language_support_sets WHERE id=$1`, [setId])).title, "Farm animals");
ok("  and updated_at moved", (await one(`SELECT updated_at >= created_at AS moved FROM public.language_support_sets WHERE id=$1`, [setId])).moved);

console.log("=== a teacher's own picture choices ===");
await as(U.ada, "teacher", () => db.query(`INSERT INTO public.language_support_overrides (owner_user_id, concept, pictogram) VALUES ($1,'light',8619)`, [U.ada]));
eq("an override is saved", (await rows(U.ada, "teacher", `SELECT pictogram FROM public.language_support_overrides`))[0].pictogram, 8619);
eq("and is private to its teacher", (await rows(U.ben, "teacher", `SELECT pictogram FROM public.language_support_overrides`)).length, 0);
await as(U.ada, "teacher", () => db.query(
  `INSERT INTO public.language_support_overrides (owner_user_id, concept, pictogram) VALUES ($1,'light',9000)
   ON CONFLICT (owner_user_id, concept) DO UPDATE SET pictogram = EXCLUDED.pictogram`, [U.ada]));
eq("changing it again is an upsert on the plain key", (await rows(U.ada, "teacher", `SELECT pictogram FROM public.language_support_overrides`))[0].pictogram, 9000);

console.log("=== deleting a set cleans up ===");
await db.query(`DELETE FROM public.language_support_sets WHERE id=$1`, [setId]);
eq("deleting a set removes its activations", (await one(`SELECT count(*)::int c FROM public.language_support_set_classes`)).c, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
