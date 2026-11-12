// F-01: what role a new account gets, and from whom.
//
// Drives the REAL files against an in-process Postgres:
//   20260312152157  handle_new_user as production has it (the defect) and the
//                   custom_quests policy fix that missed its target,
//   20261113100000  the fix, pasted twice,
// then scripts/CHECK-unlinked-accounts.sql and the rollback block in
// docs/evidence/S1-security-fixes.md.
//
// GoTrue inserts into auth.users for BOTH a public sign-up and an admin's
// auth.admin.createUser, as the same database role, so the trigger cannot
// tell them apart; `signUp` below is that insert. Each legitimate flow is
// then replayed exactly as its edge function does it (the statements after
// createUser, on the service role).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const MIGS = process.argv.slice(2);
const OLD_MIG = MIGS.find((f) => f.includes("20260312152157"));
const FIX_MIG = MIGS.find((f) => f.includes("signup_role_from_server_only"));
if (!OLD_MIG || !FIX_MIG) {
  console.log("usage: signup-role.test.mjs <20260312152157_...sql> <20261113100000_signup_role_from_server_only.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb,
    created_at timestamptz DEFAULT now(), last_sign_in_at timestamptz, banned_until timestamptz, email_confirmed_at timestamptz);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  -- 20251011192324 / 20251012023454, the columns and keys production has.
  CREATE TABLE public.users (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE (user_id, role));
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
  CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.users, public.user_roles TO authenticated, service_role;

  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), linked_user_id uuid, secondary_user_id uuid, family_id uuid);
  GRANT ALL ON public.teachers, public.teaching_assistants, public.families, public.students TO service_role;

  -- 20260109111521:36-66, with the policies as they stand in production.
  CREATE TABLE public.xp_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), k text);
  CREATE TABLE public.custom_quests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text);
  ALTER TABLE public.xp_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.custom_quests ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_quests, public.xp_settings TO authenticated, service_role;
  CREATE POLICY "Only admins can manage custom_quests" ON public.custom_quests FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
  CREATE POLICY "Signed-in users can read custom_quests" ON public.custom_quests FOR SELECT TO authenticated USING (true);
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(OLD_MIG, "utf8"));
// 20251011192324:239-241
await db.exec(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`);
// 20261016090000 restated the has_role policy with both halves and TO authenticated.
await db.exec(`DROP POLICY IF EXISTS "Only admins can modify custom_quests" ON public.custom_quests;
  CREATE POLICY "Only admins can modify custom_quests" ON public.custom_quests FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));`);

// GoTrue's insert. `meta` is raw_user_meta_data; `app` raw_app_meta_data.
async function signUp(meta, app = { provider: "email", providers: ["email"] }) {
  const id = randomUUID();
  try {
    await q(`INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data) VALUES ($1,$2,$3,$4)`,
      [id, `${id}@example.test`, meta === undefined ? null : JSON.stringify(meta), JSON.stringify(app)]);
    return { id, err: null };
  } catch (e) { return { id, err: e.message }; }
}
const rolesOf = async (id) => (await q(`SELECT role::text r FROM public.user_roles WHERE user_id = $1 ORDER BY 1`, [id])).map((r) => r.r);
const legacyOf = async (id) => (await one(`SELECT role::text r FROM public.users WHERE id = $1`, [id]))?.r ?? null;
const state = async (id) => ({ roles: await rolesOf(id), legacy: await legacyOf(id) });
const has = async (id, role) => (await one(`SELECT public.has_role($1, $2::public.app_role) h`, [id, role])).h;
// The service role's statements, as supabase-js sends them.
const svc = async (sql, p) => { try { await db.query(sql, p); return null; } catch (e) { return e.message; } };
const insertRole = (id, role) => svc(`INSERT INTO public.user_roles (user_id, role) VALUES ($1,$2)`, [id, role]);
const upsertRole = (id, role) => svc(`INSERT INTO public.user_roles (user_id, role) VALUES ($1,$2) ON CONFLICT (user_id, role) DO UPDATE SET role = EXCLUDED.role`, [id, role]);
async function as(uid, sql, params = []) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE authenticated`);
    const r = await db.query(sql, params);
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { return { rows: [], n: 0, err: e.message }; }
  finally { await db.exec("ROLLBACK"); }
}

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces ===");
// md5(replace(prosrc, E'\r', '')) of handle_new_user in production, read from
// the live catalog on 13 Nov 2026 (562 characters): 20260312152157 is what is live.
eq("the function under test is byte-for-byte production's (md5 from the live catalog)",
  await one(`SELECT md5(replace(prosrc, E'\\r', '')) m, length(replace(prosrc, E'\\r', '')) l FROM pg_proc WHERE proname = 'handle_new_user'`),
  { m: "b2979d905a52445265d16091df7111b2", l: 562 });
const oldTeacher = await signUp({ role: "teacher" });
eq("a public sign-up that sends role=teacher IS a teacher", await state(oldTeacher.id), { roles: ["teacher"], legacy: "teacher" });
ok("has_role(..., 'teacher') is true for it - every 'any teacher' policy opens", await has(oldTeacher.id, "teacher"));
const oldFamily = await signUp({ role: "family" });
eq("role=family is granted as asked", await state(oldFamily.id), { roles: ["family"], legacy: "family" });
const oldAdmin = await signUp({ role: "admin" });
eq("role=admin is downgraded to student (the one case it blocked)", await state(oldAdmin.id), { roles: ["student"], legacy: "student" });
const oldJunk = await signUp({ role: "headmaster" });
ok("a role that is not a role makes the sign-up fail with a database error", oldJunk.err !== null && /app_role/.test(oldJunk.err), oldJunk.err ?? "accepted");
// An account from before 20260312152157: users.role = 'admin' written from the
// form, user_roles = student. 17 such accounts exist in production.
const LEGACY = randomUUID();
await q(`ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created`);
await q(`INSERT INTO auth.users (id, raw_user_meta_data) VALUES ($1, '{"role":"admin"}')`, [LEGACY]);
await q(`ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created`);
await q(`INSERT INTO public.users (id, role) VALUES ($1,'admin')`, [LEGACY]);
await q(`INSERT INTO public.user_roles (user_id, role) VALUES ($1,'student')`, [LEGACY]);
const quest = (await one(`INSERT INTO public.custom_quests (title) VALUES ('Read 3 books') RETURNING id`)).id;
{
  const ins = await as(LEGACY, `INSERT INTO public.custom_quests (title) VALUES ('planted')`);
  const upd = await as(LEGACY, `UPDATE public.custom_quests SET title = 'changed' WHERE id = $1`, [quest]);
  const del = await as(LEGACY, `DELETE FROM public.custom_quests WHERE id = $1`, [quest]);
  eq("a non-admin whose legacy users.role says admin can insert, change and delete custom quests",
    [ins.err === null && ins.n === 1, upd.n === 1, del.n === 1], [true, true, true]);
}
const before = await q(`SELECT u.id, u.role::text legacy, (SELECT array_agg(role::text ORDER BY 1) FROM public.user_roles r WHERE r.user_id = u.id) roles FROM public.users u ORDER BY 1`);

// ---------------------------------------------------------------- APPLY
const fixText = readFileSync(FIX_MIG, "utf8");
const snapshot = async () => ({
  fn: (await one(`SELECT prosrc, prosecdef, proconfig::text c FROM pg_proc WHERE proname = 'handle_new_user'`)),
  pol: await q(`SELECT policyname, cmd, roles::text, qual, with_check FROM pg_policies WHERE tablename = 'custom_quests' ORDER BY 1`),
});
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the fix applies", e1 === null, e1 ?? "");
const S1 = await snapshot();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("and applies a second time", e2 === null, e2 ?? "");
eq("the second paste changes nothing", await snapshot(), S1);
eq("no existing account was touched: every users / user_roles row is as it was",
  await q(`SELECT u.id, u.role::text legacy, (SELECT array_agg(role::text ORDER BY 1) FROM public.user_roles r WHERE r.user_id = u.id) roles FROM public.users u ORDER BY 1`), before);
eq("handle_new_user: SECURITY DEFINER, search_path pinned, not executable by anon / authenticated",
  await one(`SELECT p.prosecdef d, p.proconfig::text c, has_function_privilege('anon', p.oid, 'EXECUTE') a,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') u FROM pg_proc p WHERE p.proname = 'handle_new_user'`),
  { d: true, c: "{search_path=public}", a: false, u: false });
ok("the function no longer casts or writes the requested value", !/::\s*public\.app_role\s*,\s*\n?\s*'student'/.test(S1.fn.prosrc) && !/VALUES \(NEW\.id, v_/.test(S1.fn.prosrc));
eq("custom_quests keeps exactly the has_role policy and the signed-in read", S1.pol.map((p) => `${p.policyname}:${p.cmd}`),
  ["Only admins can modify custom_quests:ALL", "Signed-in users can read custom_quests:SELECT"]);

// ---------------------------------------------------------------- AFTER
console.log("=== after: a self-service sign-up ===");
for (const asked of ["teacher", "admin", "Teacher", "ADMIN", "  teacher ", "tEaChEr\n"]) {
  const u = await signUp({ role: asked });
  eq(`asks for ${JSON.stringify(asked)}: account is created with NO role`, { err: u.err, ...(await state(u.id)) }, { err: null, roles: [], legacy: "student" });
  eq(`  ...and holds none of the four roles`, [await has(u.id, "teacher"), await has(u.id, "admin"), await has(u.id, "family"), await has(u.id, "student")], [false, false, false, false]);
}
for (const [label, meta] of [["student", { role: "student" }], ["family", { role: "family" }], ["nothing (no role key)", { full_name: "x" }],
  ["no metadata at all", undefined], ["an empty string", { role: "" }], ["a value that is not a role", { role: "headmaster" }],
  ["a number", { role: 1 }], ["an object", { role: { a: "teacher" } }], ["an array", { role: ["teacher"] }], ["null", { role: null }],
  ["teacher with a homoglyph", { role: "tеacher" }], ["two roles in one string", { role: "student,teacher" }]]) {
  const u = await signUp(meta);
  eq(`asks for ${label}: exactly one role, student`, { err: u.err, ...(await state(u.id)) }, { err: null, roles: ["student"], legacy: "student" });
}
{
  const u = await signUp({ role: "student" }, { provider: "email", role: "teacher", roles: ["teacher"] });
  eq("a role planted in app_metadata is not read either", await state(u.id), { roles: ["student"], legacy: "student" });
  const v = await signUp({ role: "teacher", Role: "student", ROLE: "student" });
  eq("other spellings of the key do not rescue a staff request", await state(v.id), { roles: [], legacy: "student" });
}
{
  // What the role-less account can do to the two tables it could try.
  const u = await signUp({ role: "teacher" });
  const self = await as(u.id, `INSERT INTO public.user_roles (user_id, role) VALUES ($1,'teacher')`, [u.id]);
  ok("it cannot grant itself the role (user_roles is admin-write)", self.err !== null && /row-level security/.test(self.err), self.err ?? "allowed");
  const see = await as(u.id, `SELECT count(*)::int n FROM public.user_roles`);
  eq("it sees no role rows", see.rows[0].n, 0);
}

console.log("=== after: the flows that create real accounts, as their functions do it ===");
let createdTeacherId = null;
{
  // create-teacher/index.ts:72-110
  const u = await signUp({ role: "teacher" });
  const e = await insertRole(u.id, "teacher");
  createdTeacherId = u.id;
  await q(`INSERT INTO public.teachers (user_id) VALUES ($1)`, [u.id]);
  eq("create-teacher: createUser(role teacher) + its own insert -> teacher, and only teacher", { e, ...(await state(u.id)) }, { e: null, roles: ["teacher"], legacy: "student" });
}
{
  // create-teaching-assistant/index.ts:68-82
  const u = await signUp({ role: "teacher" });
  const e = await insertRole(u.id, "teacher");
  await q(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1)`, [u.id]);
  eq("create-teaching-assistant: the same", { e, roles: await rolesOf(u.id) }, { e: null, roles: ["teacher"] });
}
{
  // manage-admin-users 'create' :318-336
  const u = await signUp({ role: "admin" });
  const e = await insertRole(u.id, "admin");
  eq("manage-admin-users create: createUser(role admin) + insert admin -> admin", { e, roles: await rolesOf(u.id) }, { e: null, roles: ["admin"] });
  ok("  ...and that admin can manage custom quests", (await as(u.id, `INSERT INTO public.custom_quests (title) VALUES ('ok')`)).err === null);
  // 'bootstrap' :97-120 sends no metadata.
  const b = await signUp(undefined);
  const eb = await insertRole(b.id, "admin");
  eq("manage-admin-users bootstrap: no metadata + insert admin -> admin (+ the default student)", { eb, roles: await rolesOf(b.id) }, { eb: null, roles: ["admin", "student"] });
}
{
  // manage-student-access :155-163 and :405
  const u = await signUp({ created_by_front_desk: true, student_name: "x" });
  const e = await upsertRole(u.id, "student");
  eq("manage-student-access (front-desk card): student, upsert does not fail", { e, roles: await rolesOf(u.id) }, { e: null, roles: ["student"] });
}
{
  // manage-demo-student :138-161
  const u = await signUp({ full_name: "Demo Student", role: "student", demo: true });
  await q(`DELETE FROM public.user_roles WHERE user_id = $1`, [u.id]);
  const e = await insertRole(u.id, "student");
  const e2 = await svc(`INSERT INTO public.users (id, role) VALUES ($1,'student') ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`, [u.id]);
  eq("manage-demo-student: student and only student", { e, e2, ...(await state(u.id)) }, { e: null, e2: null, roles: ["student"], legacy: "student" });
}
{
  // The "Join the club" form, then an admin links the account.
  const fam = await signUp({ role: "family" });
  await q(`INSERT INTO public.families (primary_user_id) VALUES ($1)`, [fam.id]);          // manage-admin-users linkToFamily
  eq("form (family) + linkToFamily: student, as every family login in production", await rolesOf(fam.id), ["student"]);
  const st = await signUp({ role: "student" });
  // link-student-user :304-314 inserts student only when the account has no role.
  if (!(await rolesOf(st.id)).length) await insertRole(st.id, "student");
  eq("form (student) + link-student-user: student", await rolesOf(st.id), ["student"]);
  const tea = await signUp({ role: "teacher" });
  if (!(await rolesOf(tea.id)).length) await insertRole(tea.id, "student");
  eq("an account that asked for teacher, then linked to a CHILD by an admin: gets student there", await rolesOf(tea.id), ["student"]);
  const tea2 = await signUp({ role: "teacher" });
  const e = await upsertRole(tea2.id, "teacher");                                           // manage-admin-users linkToTeacher :574-576
  eq("an account that asked for teacher, then linked to a TEACHER record by an admin: teacher", { e, roles: await rolesOf(tea2.id) }, { e: null, roles: ["teacher"] });
  const tea3 = await signUp({ role: "teacher" });
  await q(`DELETE FROM public.user_roles WHERE user_id = $1`, [tea3.id]);                   // manage-admin-users updateRole :640-652
  const e3 = await insertRole(tea3.id, "teacher");
  eq("Admin > Users > change role on a role-less account works", { e3, roles: await rolesOf(tea3.id) }, { e3: null, roles: ["teacher"] });
}
{
  // student-create-migration-account :137-186: createUser(role student) then a
  // PLAIN insert of student. The trigger has already inserted it, so the
  // insert hits the unique key and the function deletes the account. That is
  // so before this migration too (0 migrated accounts exist in production);
  // recorded here so nobody takes it for a regression.
  const u = await signUp({ role: "student", migrated_from_user_id: randomUUID() });
  const e = await insertRole(u.id, "student");
  ok("student-create-migration-account as deployed: its plain insert conflicts - unchanged, broken before and after", e !== null && /duplicate key|unique/.test(e), e ?? "no conflict");
  const e2 = await upsertRole(u.id, "student");
  eq("  ...and as fixed in this branch (an upsert): student, no error", { e2, roles: await rolesOf(u.id) }, { e2: null, roles: ["student"] });
  ok("the function in this branch does upsert", /\.upsert\(\{ user_id: newUserId, role: "student" \}, \{ onConflict: "user_id,role" \}\)/.test(
    readFileSync(new URL("../../supabase/functions/student-create-migration-account/index.ts", import.meta.url), "utf8")));
}
{
  const id = randomUUID();
  await q(`ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created`);
  await q(`INSERT INTO auth.users (id) VALUES ($1)`, [id]);
  await q(`ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created`);
  await q(`INSERT INTO public.users (id, role) VALUES ($1,'teacher')`, [id]);
  await q(`INSERT INTO public.user_roles (user_id, role) VALUES ($1,'teacher')`, [id]);
  await q(`DELETE FROM auth.users WHERE id = $1`, [id]);
  eq("deleting an account still cascades its role rows", await state(id), { roles: [], legacy: null });
}

console.log("=== after: the legacy users.role column opens nothing ===");
{
  const ins = await as(LEGACY, `INSERT INTO public.custom_quests (title) VALUES ('planted')`);
  const upd = await as(LEGACY, `UPDATE public.custom_quests SET title = 'changed' WHERE id = $1`, [quest]);
  const del = await as(LEGACY, `DELETE FROM public.custom_quests WHERE id = $1`, [quest]);
  eq("the legacy-admin account can no longer insert, change or delete custom quests",
    [ins.err !== null, upd.n, del.n], [true, 0, 0]);
  eq("it can still read them (signed-in read policy untouched)", (await as(LEGACY, `SELECT count(*)::int n FROM public.custom_quests`)).rows[0].n >= 1, true);
  eq("its rows were not rewritten", await state(LEGACY), { roles: ["student"], legacy: "admin" });
  const anon = await (async () => { await db.exec("BEGIN"); try { await db.exec("SET LOCAL ROLE anon"); await db.query(`INSERT INTO public.custom_quests (title) VALUES ('x')`); return null; } catch (e) { return e.message; } finally { await db.exec("ROLLBACK"); } })();
  ok("anon cannot write custom quests", anon !== null, anon ?? "allowed");
}

console.log("=== scripts/CHECK-unlinked-accounts.sql ===");
{
  const sql = readFileSync(new URL("../CHECK-unlinked-accounts.sql", import.meta.url), "utf8");
  const n0 = (await one(`SELECT (SELECT count(*) FROM public.users)::int + (SELECT count(*) FROM public.user_roles)::int n`)).n;
  let rows = [], err = null;
  try { rows = await q(sql); } catch (e) { err = e.message; }
  ok("it runs", err === null, err ?? "");
  const counts = Object.fromEntries(rows.filter((r) => r.kind === "COUNT").map((r) => [r.what, Number(r.n)]));
  const total = (await one(`SELECT count(*)::int n FROM auth.users`)).n;
  eq("it counts every account", counts["0 all accounts"], total);
  ok("the pre-fix self-made teacher is counted and listed by id", counts["1 teacher role, no teacher or assistant record"] >= 1
    && rows.some((r) => r.kind === "ACCOUNT" && r.account_id === oldTeacher.id && r.what.startsWith("1 ")));
  ok("the teacher created by create-teacher is NOT listed", !!createdTeacherId && !rows.some((r) => r.account_id === createdTeacherId));
  eq("the list has one row per counted account", rows.filter((r) => r.kind === "ACCOUNT" && r.what.startsWith("1 ")).length, counts["1 teacher role, no teacher or assistant record"]);
  ok("the pre-fix family account with no family is listed", rows.some((r) => r.kind === "ACCOUNT" && r.account_id === oldFamily.id && r.what.startsWith("2 ")));
  ok("the legacy users.role = admin account is listed", rows.some((r) => r.kind === "ACCOUNT" && r.account_id === LEGACY && r.what.startsWith("4 ")));
  ok("role-less accounts that asked for staff are listed", (counts["5 no role and linked to nothing"] ?? 0) >= 1);
  ok("COUNT rows come first", rows.findIndex((r) => r.kind === "ACCOUNT") > rows.map((r) => r.kind).lastIndexOf("COUNT"));
  const cols = Object.keys(rows[0] ?? {});
  eq("it returns ids and dates only - no email, name or phone column", cols, ["kind", "what", "n", "account_id", "created", "last_sign_in", "detail"]);
  ok("no row's text carries an email address", !rows.some((r) => /@/.test(`${r.what} ${r.detail ?? ""}`)));
  eq("it wrote nothing", (await one(`SELECT (SELECT count(*) FROM public.users)::int + (SELECT count(*) FROM public.user_roles)::int n`)).n, n0);
  ok("the file contains no write statement", !/\b(insert|update|delete|alter|drop|truncate|grant|revoke)\b/i.test(sql.replace(/--.*$/gm, "")));
}

console.log("=== the rollback in docs/evidence/S1-security-fixes.md ===");
{
  const ev = readFileSync(new URL("../../docs/evidence/S1-security-fixes.md", import.meta.url), "utf8");
  const m = /<!-- rollback F-01 -->\s*```sql\s*([\s\S]*?)```/.exec(ev);
  ok("the evidence file carries a rollback block for F-01", !!m);
  if (m) {
    let e = null; try { await db.exec(m[1]); } catch (x) { e = x.message; }
    ok("it runs", e === null, e ?? "");
    const u = await signUp({ role: "teacher" });
    eq("and restores the old behaviour (a sign-up asking for teacher is a teacher again)", await rolesOf(u.id), ["teacher"]);
    ok("and the old custom_quests policy", (await q(`SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage custom_quests'`)).length === 1);
    let e3 = null; try { await db.exec(fixText); } catch (x) { e3 = x.message; }
    const w = await signUp({ role: "teacher" });
    ok("the fix pastes again over the rolled-back state", e3 === null && (await rolesOf(w.id)).length === 0, e3 ?? "");
  }
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
