// F-17 (S2): staff pay is not for every signed-in account.
//
// Real files: 20261111110000 (is_teacher_of_class), 20261021090000 (the real
// teacher_rate_on / assistant_rate_on and their grants), the rollback block
// "F-17" (= can_view_teacher as 20261110140000 has it: the "before" and the
// rollback under test), 20261116093000 (the fix, pasted twice).
import { readFileSync } from "node:fs";
import { harness, makeDb, cast, PEOPLE, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-17");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const RATE_MIG = MIGS.find((f) => f.includes("20261021090000"));
const FIX = MIGS.find((f) => f.includes("20261116093000"));
if (!TA_MIG || !RATE_MIG || !FIX) bail("usage: s2-f17-staff-pay.test.mjs <20261111110000> <20261021090000> <20261116093000>");
const BEFORE = rollbackBlock("F-17");
if (!BEFORE) bail("no rollback F-17 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
const rateErr = await exec(readFileSync(RATE_MIG, "utf8"));
ok("the real pay-rate history migration installs", rateErr === null, rateErr);
await D.db.exec(`
  ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.teaching_assistants ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Teachers can view own record" ON public.teachers FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "TAs visible to staff" ON public.teaching_assistants FOR SELECT TO authenticated USING (public.is_staff_member(auth.uid()));
`);
ok("the rollback block (production's can_view_teacher) installs as the starting state", (await exec(BEFORE)) === null);
await D.db.exec(`CREATE POLICY "Teachers visible to staff and their classes" ON public.teachers FOR SELECT TO authenticated USING (public.can_view_teacher(id, auth.uid()))`);
const W = await cast(D);
const { P } = W;
// A family whose child is in a class taught by the cover teacher only through
// an old lesson; and a brand-new class B2 (no lessons yet) led by teacher B
// with family 2's second child in it.
const B2c = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('B2', $1) RETURNING id`, [W.tB])).id;
const B2kid = (await one(`INSERT INTO public.students (full_name, family_id) VALUES ('B2kid', $1) RETURNING id`, [W.F2])).id;
await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [B2kid, B2c]);
const T = { [W.tA]: "A", [W.tB]: "B", [W.tCover]: "Cover" };
const rows = async (uid) => (await as(uid, `SELECT id FROM public.teachers`)).rows.map((r) => T[r.id]).sort();
const pay = async (uid) => {
  const t = await as(uid, `SELECT public.teacher_rate_on($1, CURRENT_DATE) r`, [W.tA]);
  const a = await as(uid, `SELECT public.assistant_rate_on($1, CURRENT_DATE) r`, [W.taId]);
  return { teacher: t.err ? "refused" : (t.rows[0].r?.hourly_rate_vnd ?? null), ta: a.err ? "refused" : (a.rows[0].r?.hourly_rate_vnd ?? null) };
};
const catalog = async (uid) => {
  const r = await as(uid, `SELECT * FROM public.get_class_catalog_teachers($1::uuid[])`, [[W.tA, W.tB, W.tCover]]);
  return r.err ? "refused" : r.rows.map((x) => `${T[x.id]}:${Object.keys(x).sort().join(",")}`).sort();
};
const matrix = async () => { const m = {}; for (const [l, u] of PEOPLE(P)) m[l] = { rows: await rows(u), pay: await pay(u) }; return m; };

console.log("=== before ===");
const M0 = await matrix();
for (const who of ["unlinked sign-up", "no role", "another family", "child's own login"]) {
  eq(`BEFORE: ${who} reads teacher A's dated pay rate and the TA's`, M0[who].pay, { teacher: 200000, ta: 90000 });
}
eq("BEFORE: an unlinked sign-up reads both active-class teachers' rows (pay columns in them)", M0["unlinked sign-up"].rows, ["A", "B"]);
eq("BEFORE: so does an account with no role", M0["no role"].rows, ["A", "B"]);

console.log("=== apply ===");
const fixText = readFileSync(FIX, "utf8");
const fnState = async () => q(`SELECT proname, md5(prosrc) m, has_function_privilege('authenticated', oid, 'EXECUTE') au,
  has_function_privilege('anon', oid, 'EXECUTE') an, has_function_privilege('service_role', oid, 'EXECUTE') sr
  FROM pg_proc WHERE proname IN ('can_view_teacher','teacher_rate_on','assistant_rate_on','get_class_catalog_teachers') ORDER BY 1`);
ok("the fix applies", (await exec(fixText)) === null);
const F1 = await fnState();
ok("and applies a second time", (await exec(fixText)) === null);
eq("the second paste changes nothing", await fnState(), F1);
eq("rate functions: service role only; catalogue and can_view_teacher: authenticated, not anon",
  F1.map((f) => [f.proname, f.au, f.an, f.sr]),
  [["assistant_rate_on", false, false, true], ["can_view_teacher", true, false, true], ["get_class_catalog_teachers", true, false, true], ["teacher_rate_on", false, false, true]]);

console.log("=== after ===");
const M1 = await matrix();
for (const [l] of PEOPLE(P)) eq(`${l}: no account calls the rate functions`, M1[l].pay, { teacher: "refused", ta: "refused" });
const ROWS = {
  "admin": ["A", "B", "Cover"], "admin who also teaches": ["A", "B", "Cover"], "class teacher": ["A", "B", "Cover"], "standing TA": ["A", "B", "Cover"],
  "cover teacher": ["A", "B", "Cover"], "teacher of another class": ["A", "B", "Cover"],
  "family primary login": ["A", "Cover"], "child's own login": ["A", "Cover"], "child's second login": ["A", "Cover"],
  "another family": ["B"], "unlinked sign-up": [], "self-made teacher, no record": ["A", "B", "Cover"], "no role": [],
};
for (const [l] of PEOPLE(P)) eq(`${l}: teacher rows`, M1[l].rows, ROWS[l]);
let wider = [];
for (const [l] of PEOPLE(P)) for (const x of M1[l].rows) if (!M0[l].rows.includes(x)) wider.push(`${l}/${x}`);
eq("no login reads a teacher row it could not read before", wider, []);
for (const l of ["class teacher", "standing TA", "cover teacher", "teacher of another class", "admin"]) eq(`${l}: same teacher rows as before`, M1[l].rows, M0[l].rows);
for (const l of ["family primary login", "child's own login", "child's second login"]) {
  eq(`${l}: loses only the teacher of a class its child is not in`, M0[l].rows.filter((x) => !M1[l].rows.includes(x)), ["B"]);
}
eq("a family whose child is in a new class with no lessons yet still reads its teacher", M1["another family"].rows, ["B"]);
eq("the catalogue, for an unlinked sign-up: the two active classes' teachers, id / full_name / bio only", await catalog(P.NEW), ["A:bio,full_name,id", "B:bio,full_name,id"]);
eq("the catalogue, for a family: the same", await catalog(P.PARENT), ["A:bio,full_name,id", "B:bio,full_name,id"]);
eq("the catalogue does not list a teacher who only covers (leads no active class)", (await catalog(P.NEW)).some((s) => s.startsWith("Cover")), false);
eq("the catalogue answers nothing without a uid", await catalog(null), []);
{
  const a = await as(null, `SELECT * FROM public.get_class_catalog_teachers($1::uuid[])`, [[W.tA]], { role: "anon" });
  ok("anon cannot call the catalogue", a.err !== null, a);
}
eq("the service role still prices: teacher_rate_on", (await as(null, `SELECT (public.teacher_rate_on($1, CURRENT_DATE)->>'hourly_rate_vnd')::int r`, [W.tA], { role: "service_role" })).rows[0]?.r, 200000);
// The TA row: deferred (every staff member still reads it), asserted so a change is noticed.
eq("(deferred, unchanged) a teacher of another class still reads the TA's row", (await as(P.TEB, `SELECT count(*)::int n FROM public.teaching_assistants`)).rows[0].n, 1);

console.log("=== refusals ===");
await q(`CREATE POLICY "Authenticated users can view teachers" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)`);
const r1 = await exec(fixText);
ok("an any-signed-in teachers policy stops the install, named", /Authenticated users can view teachers/.test(r1 ?? ""), r1);
await q(`DROP POLICY "Authenticated users can view teachers" ON public.teachers`);

console.log("=== rollback ===");
ok("the rollback block runs", (await exec(BEFORE)) === null);
eq("every login's reach is back to production's", await matrix(), M0);
ok("the fix pastes again", (await exec(fixText)) === null);
eq("and gives the same reach as the first time", await matrix(), M1);
done();
