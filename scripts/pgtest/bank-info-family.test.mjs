// bank_info: a family's own login can read the school's bank details.
// docs/evidence/FIX-streaks-bank-uploads.md, item 2.
//
// The "before" is the live SELECT policy, kept as the rollback block in the
// evidence file: installed first so the defect reproduces (a family's
// primary login holding only the `student` role is refused), then
// 20261116090000 pasted twice, then the rollback block run again.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const FIX = process.argv.slice(2).find((f) => f.includes("bank_info_family_logins"));
if (!FIX) {
  console.log("usage: bank-info-family.test.mjs <20261116090000_bank_info_family_logins.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ev = readFileSync(new URL("../../docs/evidence/FIX-streaks-bank-uploads.md", import.meta.url), "utf8");
const ROLLBACK = /<!-- rollback bank_info -->\s*```sql\s*([\s\S]*?)```/.exec(ev)?.[1];
ok("the evidence file carries the live policy as the rollback block", !!ROLLBACK);
if (!ROLLBACK) { console.log(`${pass} passed, ${fail} failed`); process.exit(1); }

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
  -- families: RLS on and NO policy for anyone but an admin, so the helper
  -- is proven not to lean on the caller's view of families.
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    primary_user_id uuid, is_active boolean NOT NULL DEFAULT true);
  ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
  CREATE POLICY fam_admin ON public.families FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, family_id uuid REFERENCES public.families(id),
    linked_user_id uuid);
  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
  CREATE POLICY stu_admin ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY stu_self ON public.students FOR SELECT TO authenticated USING (linked_user_id = auth.uid());
  -- 20251012022746 + 20251012100735
  CREATE TABLE public.bank_info (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), bank_name text NOT NULL DEFAULT 'Bank',
    account_name text NOT NULL DEFAULT 'School', account_number text NOT NULL DEFAULT '000', vietqr_storage_key text,
    org_name text DEFAULT 'Happy English Club', org_address text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  INSERT INTO public.bank_info (id) VALUES (1);
  ALTER TABLE public.bank_info ENABLE ROW LEVEL SECURITY;
  -- 20251012023454
  CREATE POLICY "Admins can manage bank info" ON public.bank_info FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  -- 20260712023825 (anon SELECT) and the authenticated grants
  GRANT SELECT ON public.bank_info TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_info, public.families, public.students, public.user_roles TO authenticated;
  GRANT ALL ON public.bank_info, public.families, public.students TO service_role;
  -- Supabase's default privileges: new functions are executable by the API roles.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
`;
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
await db.exec(PRELUDE);
let liveErr = null; try { await db.exec(ROLLBACK); } catch (e) { liveErr = e.message; }
ok("the live policy installs", liveErr === null, liveErr ?? "");

const mk = async (...roles) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); for (const r of roles) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, r]); return id; };
const ADMIN = await mk("admin"), PARENT = await mk("student"), FAMROLE = await mk("family"), CHILD = await mk("student"),
  TEACHER = await mk("teacher"), STRANGER = await mk("student"), NOROLE = await mk(), TEACHPARENT = await mk("teacher");
const FAM = (await q(`INSERT INTO public.families (name, primary_user_id) VALUES ('f', $1) RETURNING id`, [PARENT]))[0].id;
await q(`INSERT INTO public.families (name, primary_user_id, is_active) VALUES ('g', $1, true), ('h', NULL, true)`, [TEACHPARENT]);
await q(`INSERT INTO public.students (full_name, family_id, linked_user_id) VALUES ('kid', $1, $2), ('kid2', $1, NULL)`, [FAM, CHILD]);

// Runs `sql` as `uid` (null = no session) under `role`; rolled back.
async function as(uid, sql, { role = "authenticated", params = [] } = {}) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    await db.exec("ROLLBACK");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { await db.exec("ROLLBACK"); return { rows: null, n: 0, err: e.message }; }
}
const reads = async (uid, role = "authenticated") => {
  const r = await as(uid, `SELECT account_number FROM public.bank_info`, { role });
  return r.err ? `error: ${r.err}` : r.rows.length;
};
const who = [["an admin", ADMIN], ["a family's primary login holding only `student`", PARENT], ["a `family`-role account", FAMROLE],
  ["a child's linked login", CHILD], ["a teacher with no family", TEACHER], ["a `student` account with no family and no child", STRANGER],
  ["an account with no role", NOROLE], ["a teacher who is a family's primary login", TEACHPARENT]];

console.log("=== before: the live policy ===");
const BEFORE = {};
for (const [label, id] of who) BEFORE[label] = await reads(id);
eq("admin, family role and linked login read; a family's student-role primary login is refused (the defect)",
   BEFORE, { "an admin": 1, "a family's primary login holding only `student`": 0, "a `family`-role account": 1, "a child's linked login": 1,
             "a teacher with no family": 0, "a `student` account with no family and no child": 0, "an account with no role": 0,
             "a teacher who is a family's primary login": 0 });
{
  // Before, anon is turned away by the students subquery (no grant) or gets
  // no row; either way nothing.
  const r = await reads(null, "anon");
  ok("anon reads nothing", r === 0 || String(r).startsWith("error: permission denied"), String(r));
}

console.log("=== the fix ===");
const fixText = readFileSync(FIX, "utf8");
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the migration applies", e1 === null, e1 ?? "");
const policies = async () => q(`SELECT policyname, cmd, roles::text, qual FROM pg_policies WHERE tablename = 'bank_info' ORDER BY policyname`);
const P1 = await policies();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("  and applies a second time", e2 === null, e2 ?? "");
eq("  the second paste changes nothing", await policies(), P1);
eq("still two policies; the admin-only one unchanged", P1.map((p) => [p.policyname, p.cmd, p.roles]),
   [["Admins and families can view bank info", "SELECT", "{authenticated}"], ["Admins can manage bank info", "ALL", "{public}"]]);
ok("  the read policy keeps the three old conditions and adds the family-login one",
   ["has_role(auth.uid(), 'admin'", "has_role(auth.uid(), 'family'", "linked_user_id = auth.uid()", "caller_is_family_login()"]
     .every((s) => P1[0].qual.includes(s)), P1[0].qual);

const after = {};
for (const [label, id] of who) after[label] = await reads(id);
eq("after: a family's primary login reads, whatever its role; nobody new besides",
   after, { "an admin": 1, "a family's primary login holding only `student`": 1, "a `family`-role account": 1, "a child's linked login": 1,
            "a teacher with no family": 0, "a `student` account with no family and no child": 0, "an account with no role": 0,
            "a teacher who is a family's primary login": 1 });
eq("anon still reads nothing", await reads(null, "anon"), 0);
eq("  and cannot call the helper", (await as(null, `SELECT public.caller_is_family_login() r`, { role: "anon" })).err?.includes("permission denied"), true);
eq("the family's login cannot see the families table itself - the helper does not lean on it",
   (await as(PARENT, `SELECT count(*)::int n FROM public.families`)).rows?.[0]?.n, 0);
eq("the helper answers for the caller only, and takes no argument",
   [(await as(PARENT, `SELECT public.caller_is_family_login() r`)).rows?.[0]?.r, (await as(TEACHER, `SELECT public.caller_is_family_login() r`)).rows?.[0]?.r,
    (await q(`SELECT pronargs FROM pg_proc WHERE proname = 'caller_is_family_login'`))[0]?.pronargs], [true, false, 0]);
{
  const f = (await q(`SELECT p.prosecdef d, p.provolatile v, p.proconfig::text c,
     has_function_privilege('anon', p.oid, 'EXECUTE') a, has_function_privilege('authenticated', p.oid, 'EXECUTE') u
     FROM pg_proc p WHERE p.proname = 'caller_is_family_login'`))[0];
  eq("the helper is SECURITY DEFINER, STABLE, search_path pinned; authenticated may call it, anon may not",
     [f.d, f.v, f.c, f.a, f.u], [true, "s", "{search_path=public}", false, true]);
}

console.log("=== nobody but an admin writes ===");
for (const [label, id] of who.filter(([l]) => l !== "an admin")) {
  const u = await as(id, `UPDATE public.bank_info SET account_number = '999' RETURNING id`);
  const d = await as(id, `DELETE FROM public.bank_info RETURNING id`);
  const i = await as(id, `INSERT INTO public.bank_info (id) VALUES (1) ON CONFLICT DO NOTHING RETURNING id`);
  ok(`${label}: update, delete and insert change nothing`, (u.err || u.rows.length === 0) && (d.err || d.rows.length === 0) && (i.err || i.rows.length === 0),
     JSON.stringify([u.err ?? u.rows.length, d.err ?? d.rows.length, i.err ?? i.rows.length]));
}
{
  const u = await as(null, `UPDATE public.bank_info SET account_number = '999' RETURNING id`, { role: "anon" });
  ok("anon cannot write", !!u.err || u.rows.length === 0, u.err ?? "");
  const a = await as(ADMIN, `UPDATE public.bank_info SET account_number = '123' RETURNING id`);
  eq("an admin still can", a.rows?.length, 1);
}

console.log("=== rollback ===");
let e3 = null; try { await db.exec(ROLLBACK); } catch (e) { e3 = e.message; }
ok("the rollback block runs", e3 === null, e3 ?? "");
const back = {};
for (const [label, id] of who) back[label] = await reads(id);
eq("and puts back exactly the live behaviour", back, BEFORE);
eq("  with the helper removed", (await q(`SELECT count(*)::int n FROM pg_proc WHERE proname = 'caller_is_family_login'`))[0].n, 0);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
