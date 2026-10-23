// The Stars sync foundation, and the readiness check that is the whole
// point of it. Drives supabase/migrations/20261023100000.
//
// Readiness exists because the two permission tiers fail differently and
// both failures are quiet. A cover teacher syncs points for six weeks
// and then stops, mid-term. A teacher who is not on the session rows
// never syncs a register at all and nothing says so. The admin screen
// has to say which, per class, BEFORE the connection is switched on - so
// these assertions are about the sentence shown to a person as much as
// about the booleans.
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
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');

  CREATE TABLE public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    user_id uuid REFERENCES auth.users(id));
  CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    default_teacher_id uuid REFERENCES public.teachers(id));
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id),
    date date NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL);

  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT current_setting('test.role', true) = _role::text $f$;

  GRANT USAGE ON SCHEMA public TO authenticated, service_role;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

const db = new PGlite();
await db.exec(PRELUDE);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;

// Two teachers with logins, one archived, one with no login at all.
const uids = {
  mai: "11111111-1111-1111-1111-111111111111",
  linh: "22222222-2222-2222-2222-222222222222",
  gone: "33333333-3333-3333-3333-333333333333",
  admin: "44444444-4444-4444-4444-444444444444",
};
await db.query(`INSERT INTO auth.users (id) VALUES ($1),($2),($3),($4)`,
  [uids.mai, uids.linh, uids.gone, uids.admin]);

const mkTeacher = async (name, user_id, active = true) => (await one(
  `INSERT INTO public.teachers (full_name, user_id, is_active) VALUES ($1,$2,$3) RETURNING id`,
  [name, user_id, active])).id;

const mai = await mkTeacher("Mai", uids.mai);
const linh = await mkTeacher("Linh", uids.linh);
const archived = await mkTeacher("Hoa", uids.gone, false);
const noLogin = await mkTeacher("Tuan", null);

const mkClass = async (name, teacher) => (await one(
  `INSERT INTO public.classes (name, default_teacher_id) VALUES ($1,$2) RETURNING id`,
  [name, teacher])).id;

const stars = await mkClass("Stars", mai);
const stars2 = await mkClass("Stars 2", mai);
const sanrio = await mkClass("Sanrio Grade 6", mai);
const other = await mkClass("Comets", linh);

// Lessons, so attendance readiness has something to judge.
for (const c of [stars, stars2, sanrio]) {
  for (const d of ["2026-09-02", "2026-09-09"]) {
    await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,$3)`,
      [c, mai, d]);
  }
}
// Comets' lessons belong to Linh.
await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,'2026-09-03')`,
  [other, linh]);

console.log("=== the migration ===");
await db.exec(sql());
ok("applies", true);
let again = null;
try { await db.exec(sql()); } catch (e) { again = e.message; }
ok("and applies a second time unchanged", again === null, again ?? "");
{
  const c = await one(`SELECT count(*)::int n, bool_or(enabled) e FROM public.stars_sync_connection`);
  eq("there is exactly one connection row", c.n, 1);
  ok("and it ships switched OFF", c.e === false);
  let two = null;
  try { await db.query(`INSERT INTO public.stars_sync_connection (id) VALUES (false)`); }
  catch (e) { two = e.message; }
  ok("a second connection row is impossible", two !== null, two ?? "it was allowed");
}

console.log("=== mapping any class to any teacher ===");
{
  await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1`, [mai]);
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('sc-1',$1)`, [stars]);
  const t = await one(`SELECT public.stars_sync_effective_teacher('sc-1') AS t`);
  eq("a class with no teacher of its own uses the connection default", t.t, mai);

  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-4',$1,$2)`, [other, linh]);
  const o = await one(`SELECT public.stars_sync_effective_teacher('sc-4') AS t`);
  eq("a class may name its own teacher instead", o.t, linh);
  ok("  so any teacher can sync any class", o.t !== mai);
}
{
  let err = null;
  try { await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('sc-dup',$1)`, [stars]); }
  catch (e) { err = e.message; }
  ok("one HEC class cannot be mapped twice", err !== null, err ?? "it was allowed");

  err = null;
  try { await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('  ',$1)`, [stars2]); }
  catch (e) { err = e.message; }
  ok("a blank Stars id is refused", err !== null, err ?? "it was allowed");
}
{
  const s = (await one(`INSERT INTO public.students (full_name) VALUES ('Minh') RETURNING id`)).id;
  await db.query(`INSERT INTO public.stars_student_map (stars_student_id, student_id) VALUES ('ss-1',$1)`, [s]);
  let err = null;
  try { await db.query(`INSERT INTO public.stars_student_map (stars_student_id, student_id) VALUES ('ss-2',$1)`, [s]); }
  catch (e) { err = e.message; }
  ok("two Stars students cannot point at one child", err !== null, err ?? "it was allowed");

  err = null;
  try { await db.query(`DELETE FROM public.students WHERE id=$1`, [s]); }
  catch (e) { err = e.message; }
  ok("and a mapped child cannot be deleted out from under the mapping",
     err !== null, err ?? "it was allowed");
}

console.log("=== readiness: the sentence an admin reads ===");
const readyFor = async (ref) => (await all(
  `SELECT * FROM public.stars_sync_readiness() WHERE stars_class_id=$1`, [ref]))[0];
{
  const r = await readyFor("sc-1");
  eq("the default teacher on her own lessons is ready", r.status, "ready");
  ok("  points will sync", r.can_sync_points === true);
  ok("  registers will sync", r.can_sync_attendance === true);
  ok("  and it says so in words", /^Ready\. Mai is the default teacher/.test(r.detail), r.detail);
}
{
  // Linh covers Stars 2: not the default teacher, and not on its lessons.
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-2',$1,$2)`, [stars2, linh]);
  const r = await readyFor("sc-2");
  eq("a teacher who is neither default nor on the lessons is partial", r.status, "partial");
  ok("  points will NOT sync", r.can_sync_points === false);
  ok("  registers will NOT sync", r.can_sync_attendance === false);
  ok("  and the warning names both failures",
     /45 days/.test(r.detail) && /registers will never sync/.test(r.detail), r.detail);
}
{
  // Now put Linh on one of Stars 2's lessons: registers work, points
  // still expire. This is the dangerous half-working state.
  await db.query(`INSERT INTO public.sessions (class_id, teacher_id, date)
                  VALUES ($1,$2,'2026-09-16')`, [stars2, linh]);
  const r = await readyFor("sc-2");
  eq("covering a lesson fixes registers but not points", r.status, "partial");
  ok("  registers now sync", r.can_sync_attendance === true);
  ok("  points still do not", r.can_sync_points === false);
  ok("  and the warning is about the 45 days, not the register",
     /only covering/.test(r.detail) && !/registers will never/.test(r.detail), r.detail);
}
{
  // The default teacher who is not on any of the lessons: the reverse.
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-3',$1,$2)`, [sanrio, mai]);
  await db.query(`UPDATE public.sessions SET teacher_id=$1 WHERE class_id=$2`, [linh, sanrio]);
  const r = await readyFor("sc-3");
  eq("the default teacher who is on none of the lessons is partial", r.status, "partial");
  ok("  points sync", r.can_sync_points === true);
  ok("  registers do not", r.can_sync_attendance === false);
  ok("  and it says which", /registers will not sync/.test(r.detail), r.detail);
}
{
  // A brand-new class with no lessons yet is not a fault.
  const fresh = await mkClass("Comets 2", mai);
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('sc-new',$1)`, [fresh]);
  const r = await readyFor("sc-new");
  eq("a class with no lessons yet is ready, not broken", r.status, "ready");
  eq("  with nothing to count", r.sessions_total, 0);
}

console.log("=== readiness: the ways it is blocked ===");
{
  const c = await mkClass("Archived-teacher class", archived);
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-arch',$1,$2)`, [c, archived]);
  const r = await readyFor("sc-arch");
  eq("an archived teacher blocks the class", r.status, "blocked");
  ok("  and nothing syncs", r.can_sync_points === false && r.can_sync_attendance === false);
  ok("  named in the sentence", /Hoa is archived/.test(r.detail), r.detail);
}
{
  const c = await mkClass("No-login class", noLogin);
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-nologin',$1,$2)`, [c, noLogin]);
  const r = await readyFor("sc-nologin");
  eq("a teacher with no login blocks the class", r.status, "blocked");
  ok("  because the sync cannot act as somebody who cannot sign in",
     /has no login/.test(r.detail), r.detail);
}
{
  await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=NULL`);
  const r = await readyFor("sc-1");   // sc-1 relies on the default
  eq("no teacher anywhere blocks the class", r.status, "blocked");
  ok("  and says what to do", /Set one on this class/.test(r.detail), r.detail);
  await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1`, [mai]);
  eq("  restoring the default makes it ready again", (await readyFor("sc-1")).status, "ready");
}
{
  await db.query(`UPDATE public.stars_class_map SET enabled=false WHERE stars_class_id='sc-1'`);
  const r = await readyFor("sc-1");
  eq("a class paused on its own is paused, not broken", r.status, "paused");
  await db.query(`UPDATE public.stars_class_map SET enabled=true WHERE stars_class_id='sc-1'`);
}
{
  // A teacher referenced ONLY by a class map - not a class default - so
  // the constraint that fires is the map's own. Deleting `mai` here
  // would be stopped by classes_default_teacher_id_fkey instead, and
  // the assertion would pass without testing anything added here.
  const spare = await mkTeacher("Spare", null);
  const c = await mkClass("Spare class", mai);
  await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id, teacher_id)
                  VALUES ('sc-spare',$1,$2)`, [c, spare]);
  let err = null;
  try { await db.query(`DELETE FROM public.teachers WHERE id=$1`, [spare]); }
  catch (e) { err = e.message; }
  ok("a teacher the sync depends on cannot be deleted",
     err !== null && /stars_class_map/.test(err ?? ""), err ?? "it was allowed");
}

console.log("=== who can see any of this ===");
{
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uids.admin]);
  await db.query(`SELECT set_config('test.role', 'admin', false)`);
  const n = await one(`SELECT count(*)::int c FROM public.stars_class_map`);
  ok("an admin sees the mappings", n.c > 0, String(n.c));

  await db.query(`SELECT set_config('test.role', 'teacher', false)`);
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uids.mai]);
  const t = await one(`SELECT count(*)::int c FROM public.stars_class_map`);
  eq("a teacher sees none of it", t.c, 0);
  const e = await one(`SELECT count(*)::int c FROM public.stars_sync_events`);
  eq("  nor the event log", e.c, 0);

  let err = null;
  try { await db.query(`UPDATE public.stars_sync_connection SET enabled=true`); }
  catch (ex) { err = ex.message; }
  const still = await one(`SELECT count(*)::int c FROM public.stars_sync_connection WHERE enabled`);
  eq("  and cannot switch the connection on", still.c, 0);
  await db.exec(`RESET ROLE`);
}

console.log("=== the event log is idempotent by construction ===");
{
  const id = "55555555-5555-5555-5555-555555555555";
  await db.query(`INSERT INTO public.stars_sync_events (event_id, seq, kind, raw, outcome)
                  VALUES ($1, 1, 'attendance', '{}'::jsonb, 'applied')`, [id]);
  let err = null;
  try {
    await db.query(`INSERT INTO public.stars_sync_events (event_id, seq, kind, raw, outcome)
                    VALUES ($1, 1, 'attendance', '{}'::jsonb, 'applied')`, [id]);
  } catch (e) { err = e.message; }
  ok("the same event cannot be recorded twice", err !== null, err ?? "it was allowed");

  err = null;
  try {
    await db.query(`INSERT INTO public.stars_sync_events (event_id, seq, kind, raw, outcome)
                    VALUES (gen_random_uuid(), 2, 'attendance', '{}'::jsonb, 'invented')`);
  } catch (e) { err = e.message; }
  ok("an outcome outside the vocabulary is refused", err !== null, err ?? "it was allowed");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
