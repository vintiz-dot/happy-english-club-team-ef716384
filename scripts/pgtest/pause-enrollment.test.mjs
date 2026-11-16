// F-15: pause_enrollment - admins only.
//
// The "before" is the function exactly as the live catalog had it on
// 13 Nov 2026: the rollback block in docs/evidence/S1-security-fixes.md. It is
// installed first (so the defect is reproduced on the production body), then
// 20261113120000 is pasted twice, then the block is run again as the rollback.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const FIX_MIG = process.argv.slice(2).find((f) => f.includes("pause_enrollment_admin_only"));
if (!FIX_MIG) {
  console.log("usage: pause-enrollment.test.mjs <20261113120000_pause_enrollment_admin_only.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ev = readFileSync(new URL("../../docs/evidence/S1-security-fixes.md", import.meta.url), "utf8");
const LIVE = /<!-- rollback F-15 -->\s*```sql\s*([\s\S]*?)```/.exec(ev)?.[1];
ok("the evidence file carries the live function as the F-15 rollback block", !!LIVE);
if (!LIVE) { console.log(`${pass} passed, ${fail + 1} failed`); process.exit(1); }

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TYPE public.attendance_status AS ENUM ('Present','Absent','Excused');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id),
    date date NOT NULL, status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    student_id uuid NOT NULL REFERENCES public.students(id), status public.attendance_status NOT NULL, marked_by uuid, notes text,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE (session_id, student_id));
  -- 20251023112730:5-15
  CREATE TABLE public.pause_windows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    from_date date NOT NULL, to_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES auth.users(id), memo text,
    CONSTRAINT valid_pause_dates CHECK (to_date >= from_date));
  CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text, entity text, entity_id text, diff jsonb, created_at timestamptz DEFAULT now());
  ALTER TABLE public.pause_windows ENABLE ROW LEVEL SECURITY; ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY; ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.pause_windows, public.attendance, public.audit_log, public.sessions TO authenticated;
`;
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
let liveErr = null; try { await db.exec(LIVE); } catch (e) { liveErr = e.message; }
ok("the live function installs", liveErr === null, liveErr ?? "");
// Supabase's default privileges give the service role EXECUTE on public functions.
await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
  GRANT EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) TO service_role`);

const mk = async (role) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]); return id; };
const ADMIN = await mk("admin"), ADMIN2 = await mk("admin"), TEACHER = await mk("teacher"), PARENT = await mk("student"),
  FAMILY = await mk("family"), NEW = await mk("student"), NOROLE = await mk(null);
await q(`INSERT INTO public.user_roles VALUES ($1,'student')`, [ADMIN2]);   // an admin who also holds student, as production has
const CA = (await one(`INSERT INTO public.classes (name) VALUES ('A') RETURNING id`)).id;
const KID = (await one(`INSERT INTO public.students (full_name) VALUES ('kid') RETURNING id`)).id;
const OTHER = (await one(`INSERT INTO public.students (full_name) VALUES ('other') RETURNING id`)).id;
const sess = async (date, status = "Scheduled") => (await one(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,$3) RETURNING id`, [CA, date, status])).id;
const S1 = await sess("2026-11-03", "Held"), S2 = await sess("2026-11-10", "Held"), S3 = await sess("2026-11-17"), S4 = await sess("2026-11-24", "Canceled"), S5 = await sess("2026-12-01");
// Marks a teacher made.
await q(`INSERT INTO public.attendance (session_id, student_id, status, marked_by, notes) VALUES ($1,$3,'Present',$5,'on time'),($2,$3,'Absent',$5,'no show'),($1,$4,'Present',$5,null)`,
  [S1, S2, KID, OTHER, TEACHER]);

const snap = async () => ({
  att: await q(`SELECT session_id, student_id, status::text, marked_by, notes FROM public.attendance ORDER BY session_id, student_id`),
  pw: (await one(`SELECT count(*)::int n FROM public.pause_windows`)).n,
  log: (await one(`SELECT count(*)::int n FROM public.audit_log`)).n,
});
// keep = true commits what the call did.
async function call(uid, args, { role = "authenticated", keep = false } = {}) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(`SELECT public.pause_enrollment($1,$2,$3,$4,$5) r`, args);
    await db.exec(keep ? "COMMIT" : "ROLLBACK");
    return { r: r.rows[0].r, err: null, code: null };
  } catch (e) { await db.exec("ROLLBACK"); return { r: null, err: e.message, code: e.code ?? null }; }
}
const NOV = [KID, CA, "2026-11-01", "2026-11-30", "family holiday"];

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces on the live body ===");
const S0 = await snap();
for (const [label, who] of [["a parent", PARENT], ["a family-role account", FAMILY], ["an account registered a minute ago", NEW], ["a teacher", TEACHER], ["an account with no role", NOROLE]]) {
  const r = await call(who, NOV);
  ok(`${label} can pause any child and excuse the month (${r.r?.excused_attendance ?? "-"} lessons)`, r.err === null && r.r?.success === true && r.r.excused_attendance === 3, r.err ?? JSON.stringify(r.r));
}
{
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [PARENT]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  await db.query(`SELECT public.pause_enrollment($1,$2,$3,$4,$5)`, NOV);
  await db.exec(`RESET ROLE`);
  const a = (await db.query(`SELECT status::text s, marked_by m FROM public.attendance WHERE session_id = $1 AND student_id = $2`, [S2, KID])).rows[0];
  await db.exec("ROLLBACK");
  eq("  ...overwriting the teacher's 'Absent' with 'Excused', marked by the parent", a, { s: "Excused", m: PARENT });
}
eq("(those attempts were rolled back: the seed is as it was)", await snap(), S0);

// ---------------------------------------------------------------- APPLY
const fixText = readFileSync(FIX_MIG, "utf8");
const fn = async () => one(`SELECT p.prosrc, p.prosecdef d, p.proconfig::text c, pg_get_function_identity_arguments(p.oid) args, pg_get_function_result(p.oid) res,
  has_function_privilege('anon', p.oid, 'EXECUTE') a, has_function_privilege('authenticated', p.oid, 'EXECUTE') u,
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'pause_enrollment') overloads FROM pg_proc p WHERE p.proname = 'pause_enrollment'`);
const F0 = await fn();
// md5(replace(prosrc, E'\r', '')) of the function in production, read from
// the live catalog on 13 Nov 2026 (1879 characters): the "before" really is
// the production body, not a paraphrase of it.
eq("the body under test is byte-for-byte production's (md5 from the live catalog)",
  await one(`SELECT md5(replace(prosrc, E'\\r', '')) m, length(replace(prosrc, E'\\r', '')) l FROM pg_proc WHERE proname = 'pause_enrollment'`),
  { m: "37437aad7f6524d3d2ea9a57f7304660", l: 1879 });
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the fix applies", e1 === null, e1 ?? "");
const F1 = await fn();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("and applies a second time", e2 === null, e2 ?? "");
eq("the second paste changes nothing", await fn(), F1);
eq("same signature and result, still one function, SECURITY DEFINER, search_path pinned, authenticated yes, anon no",
  { args: F1.args, res: F1.res, overloads: F1.overloads, d: F1.d, c: F1.c, a: F1.a, u: F1.u },
  { args: F0.args, res: F0.res, overloads: 1, d: true, c: "{search_path=public}", a: false, u: true });
{
  // The body is the live one plus the check and nothing else.
  // Trailing spaces at line ends (production's body has some) are ignored.
  const strip = (s) => s.replace(/\r/g, "").replace(/[ \t]+$/gm, "");
  const added = /\n  -- Admins only[\s\S]*?END IF;\n\n/.exec(strip(F1.prosrc));
  ok("the only difference from the live body is the admin check", !!added && strip(F1.prosrc).replace(added[0], "\n") === strip(F0.prosrc));
}
eq("applying it wrote no row", await snap(), S0);

// ---------------------------------------------------------------- AFTER
console.log("=== after ===");
for (const [label, who, role] of [["a parent", PARENT], ["a family-role account", FAMILY], ["an account registered a minute ago", NEW], ["a teacher", TEACHER],
  ["an account with no role", NOROLE], ["the signed-in role with no uid", null], ["the service role (no uid)", null, "service_role"]]) {
  const r = await call(who, NOV, { role, keep: true });
  ok(`${label}: refused with 42501`, r.err !== null && r.code === "42501" && /Only administrators can pause enrollments/.test(r.err), r.err ?? JSON.stringify(r.r));
}
{
  const r = await call(null, NOV, { role: "anon", keep: true });
  ok("anon: no EXECUTE at all", r.err !== null && /permission denied/.test(r.err), r.err ?? "ran");
  const own = await call(PARENT, [KID, CA, "2026-11-10", "2026-11-10", null], { keep: true });
  ok("a parent cannot excuse even a single lesson of their own child", own.code === "42501", own.err ?? "ran");
  const bad = await call(PARENT, [KID, CA, "2026-11-30", "2026-11-01", null], { keep: true });
  ok("the role check comes before any other answer (a bad date range from a non-admin is still 42501)", bad.code === "42501", bad.err ?? "ran");
}
eq("nothing was written by any refused call: register, pause windows and audit log untouched", await snap(), S0);

console.log("=== the admin's Pause tab still works, exactly as before ===");
{
  const r = await call(ADMIN, NOV, { keep: true });
  eq("an admin pauses November: 3 lessons excused (the cancelled one skipped), same result shape as before",
    [r.r?.success, typeof r.r?.pause_window_id, r.r?.excused_attendance, r.r?.effective_month, Object.keys(r.r ?? {}).sort().join()],
    [true, "string", 3, "2026-11", "effective_month,excused_attendance,pause_window_id,success"]);
  eq("the child's November marks are Excused, by the admin, with the memo; the cancelled lesson and December have none",
    await q(`SELECT s.date::text d, a.status::text st, a.marked_by = $2 by_admin, a.notes n FROM public.sessions s
       LEFT JOIN public.attendance a ON a.session_id = s.id AND a.student_id = $1 ORDER BY s.date`, [KID, ADMIN]),
    [{ d: "2026-11-03", st: "Excused", by_admin: true, n: "Pause: family holiday" }, { d: "2026-11-10", st: "Excused", by_admin: true, n: "Pause: family holiday" },
     { d: "2026-11-17", st: "Excused", by_admin: true, n: "Pause: family holiday" }, { d: "2026-11-24", st: null, by_admin: null, n: null }, { d: "2026-12-01", st: null, by_admin: null, n: null }]);
  eq("another child's mark in the same lesson is untouched", await one(`SELECT status::text s, marked_by = $3 t FROM public.attendance WHERE session_id = $1 AND student_id = $2`, [S1, OTHER, TEACHER]), { s: "Present", t: true });
  eq("one pause window and one audit row, by the admin", await one(`SELECT (SELECT count(*)::int FROM public.pause_windows WHERE created_by = $1) pw,
     (SELECT count(*)::int FROM public.audit_log WHERE actor_user_id = $1 AND action = 'pause') log`, [ADMIN]), { pw: 1, log: 1 });
  const r2 = await call(ADMIN2, [OTHER, CA, "2026-12-01", "2026-12-01", null], { keep: true });
  ok("an admin who also holds the student role is still an admin", r2.err === null && r2.r.excused_attendance === 1, r2.err ?? "");
  const bad = await call(ADMIN, [KID, CA, "2026-11-30", "2026-11-01", null]);
  ok("an admin's reversed dates are still refused by the old message", bad.err !== null && /to_date must be >= from_date/.test(bad.err), bad.err ?? "ran");
}

console.log("=== the rollback block ===");
{
  let e = null; try { await db.exec(LIVE); } catch (x) { e = x.message; }
  ok("it runs over the fix", e === null, e ?? "");
  ok("and the body is the live one again", (await fn()).prosrc.replace(/\r/g, "") === F0.prosrc.replace(/\r/g, ""));
  const r = await call(PARENT, NOV);
  ok("with the old behaviour (a parent can pause again)", r.err === null, r.err ?? "");
  let e3 = null; try { await db.exec(fixText); } catch (x) { e3 = x.message; }
  const again = await call(PARENT, NOV);
  ok("the fix pastes again and closes it", e3 === null && again.code === "42501", e3 ?? again.err ?? "open");
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
