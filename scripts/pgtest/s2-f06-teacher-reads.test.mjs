// F-06 (S2): learning profiles, bill snapshots and the leaders list are not
// for every teacher.
//
// Real files: 20261111110000 (is_teacher_of_class), the rollback block
// "F-06" of docs/evidence/S2-audit-medium-low.md (= the three production
// policies: the "before", and the rollback under test), 20261116092000 (the
// fix, pasted twice). The other policies on the tables are the repository's.
import { readFileSync } from "node:fs";
import { harness, makeDb, cast, PEOPLE, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-06");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX = MIGS.find((f) => f.includes("20261116092000"));
if (!TA_MIG || !FIX) bail("usage: s2-f06-teacher-reads.test.mjs <20261111110000_...> <20261116092000_...>");
const BEFORE = rollbackBlock("F-06");
if (!BEFORE) bail("no rollback F-06 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
await D.db.exec(`
  CREATE TABLE public.student_learning_profiles (student_id uuid PRIMARY KEY REFERENCES public.students(id), summary text, cefr_estimate text);
  CREATE TABLE public.monthly_finance_snapshots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL, total_amount integer);
  CREATE TABLE public.monthly_leaders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, student_id uuid NOT NULL, month text NOT NULL, total_points integer);
  ALTER TABLE public.student_learning_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.monthly_finance_snapshots ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.monthly_leaders ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_learning_profiles, public.monthly_finance_snapshots, public.monthly_leaders TO authenticated;
  -- the policies beside the three under test, as the repository has them
  CREATE POLICY "admins_all_learning_profiles" ON public.student_learning_profiles FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "students_read_own_learning_profile" ON public.student_learning_profiles FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "family_read_children_learning_profiles" ON public.student_learning_profiles FOR SELECT TO authenticated
    USING (public.can_view_student(student_id, auth.uid()));
  CREATE POLICY "Admins can read all monthly snapshots" ON public.monthly_finance_snapshots FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Students read their own monthly snapshots" ON public.monthly_finance_snapshots FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = monthly_finance_snapshots.student_id AND s.linked_user_id = auth.uid()));
  CREATE POLICY "Family primary user reads their student snapshots" ON public.monthly_finance_snapshots FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.students s JOIN public.families f ON f.id = s.family_id
                    WHERE s.id = monthly_finance_snapshots.student_id AND f.primary_user_id = auth.uid()));
`);
const W = await cast(D);
const { P } = W;
for (const s of [W.A1, W.A2, W.B1]) {
  await q(`INSERT INTO public.student_learning_profiles VALUES ($1,'profile','A2')`, [s]);
  await q(`INSERT INTO public.monthly_finance_snapshots (student_id, month, total_amount) VALUES ($1,'2026-10',1000000)`, [s]);
}
await q(`INSERT INTO public.monthly_leaders (class_id, student_id, month, total_points) VALUES ($1,$2,'2026-10',50),($3,$4,'2026-10',40)`, [W.CA, W.A1, W.CB, W.B1]);
const NAME = { [W.A1]: "A1", [W.A2]: "A2", [W.B1]: "B1" };
const reach = async (uid) => ({
  profiles: (await as(uid, `SELECT student_id FROM public.student_learning_profiles`)).rows.map((r) => NAME[r.student_id]).sort(),
  snapshots: (await as(uid, `SELECT student_id FROM public.monthly_finance_snapshots`)).rows.map((r) => NAME[r.student_id]).sort(),
  leaders: (await as(uid, `SELECT student_id FROM public.monthly_leaders`)).rows.map((r) => NAME[r.student_id]).sort(),
});
const matrix = async () => { const m = {}; for (const [l, u] of PEOPLE(P)) m[l] = await reach(u); return m; };

// ---------------------------------------------------------------- BEFORE
console.log("=== before: production's three policies ===");
ok("the rollback block installs as the starting state", (await exec(BEFORE)) === null);
const M0 = await matrix();
for (const who of ["teacher of another class", "self-made teacher, no record", "standing TA"]) {
  eq(`BEFORE: ${who} reads every child's learning profile`, M0[who].profiles, ["A1", "A2", "B1"]);
  eq(`BEFORE: ${who} reads every family's bill snapshot`, M0[who].snapshots, ["A1", "A2", "B1"]);
  eq(`BEFORE: ${who} reads every class's leaders`, M0[who].leaders, ["A1", "B1"]);
}

// ---------------------------------------------------------------- APPLY
const fixText = readFileSync(FIX, "utf8");
const pols = async () => q(`SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('student_learning_profiles','monthly_finance_snapshots','monthly_leaders') ORDER BY 1,2`);
ok("the fix applies", (await exec(fixText)) === null);
const P1 = await pols();
ok("and applies a second time", (await exec(fixText)) === null);
eq("the second paste changes nothing", await pols(), P1);
const M1 = await matrix();

console.log("=== after ===");
const EXPECT = {
  "admin": { profiles: ["A1", "A2", "B1"], snapshots: ["A1", "A2", "B1"], leaders: ["A1", "B1"] },
  "admin who also teaches": { profiles: ["A1", "A2", "B1"], snapshots: ["A1", "A2", "B1"], leaders: ["A1", "B1"] },
  "class teacher": { profiles: ["A1", "A2"], snapshots: [], leaders: ["A1"] },
  "standing TA": { profiles: ["A1", "A2"], snapshots: [], leaders: ["A1"] },
  "cover teacher": { profiles: ["A1", "A2"], snapshots: [], leaders: ["A1"] },
  "teacher of another class": { profiles: ["B1"], snapshots: [], leaders: ["B1"] },
  "family primary login": { profiles: ["A1"], snapshots: ["A1"], leaders: [] },
  "child's own login": { profiles: ["A1"], snapshots: ["A1"], leaders: [] },
  "child's second login": { profiles: ["A1"], snapshots: [], leaders: [] },
  "another family": { profiles: ["B1"], snapshots: ["B1"], leaders: [] },
  "unlinked sign-up": { profiles: [], snapshots: [], leaders: [] },
  "self-made teacher, no record": { profiles: [], snapshots: [], leaders: [] },
  "no role": { profiles: [], snapshots: [], leaders: [] },
};
for (const [l] of PEOPLE(P)) eq(`${l}: profiles / snapshots / leaders`, M1[l], EXPECT[l]);
// Families' and children's reads are exactly what they were.
for (const l of ["family primary login", "child's own login", "child's second login", "another family"]) eq(`${l}: unchanged from before`, M1[l], M0[l]);
// Nobody reads a row they could not read before.
let wider = [];
for (const [l] of PEOPLE(P)) for (const k of ["profiles", "snapshots", "leaders"]) for (const x of M1[l][k]) if (!M0[l][k].includes(x)) wider.push(`${l}/${k}/${x}`);
eq("no login reads a row it could not read before", wider, []);
{
  const a = await as(null, `SELECT count(*)::int n FROM public.student_learning_profiles`, [], { role: "anon" });
  ok("anon reads nothing", a.err !== null || a.rows[0].n === 0, a);
}
eq("the service role still reads every profile and snapshot (edge functions)", (await as(null, `SELECT (SELECT count(*) FROM public.student_learning_profiles)::int + (SELECT count(*) FROM public.monthly_finance_snapshots)::int n`, [], { role: "service_role" })).rows[0].n, 6);
// A teacher who stops teaching the class loses it at once (no migration).
await q(`UPDATE public.classes SET default_teacher_id = $1 WHERE id = $2`, [W.tB, W.CA]);
eq("reassign class A to teacher B: B reads A's profiles at once", (await reach(P.TEB)).profiles, ["A1", "A2", "B1"]);
eq("...and teacher A no longer does", (await reach(P.TEA)).profiles, []);
await q(`UPDATE public.classes SET default_teacher_id = $1 WHERE id = $2`, [W.tA, W.CA]);

// ---------------------------------------------------------------- refusal
console.log("=== the paste refuses when a policy it does not know still opens the door ===");
await q(`CREATE POLICY "stray teacher read" ON public.student_learning_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role))`);
const refused = await exec(fixText);
ok("a stray any-teacher policy stops the install, named", /stray teacher read/.test(refused ?? ""), refused);
eq("...and nothing changed (the transaction rolled back)", (await pols()).length, P1.length + 1);
await q(`DROP POLICY "stray teacher read" ON public.student_learning_profiles`);
await q(`ALTER TABLE public.monthly_leaders DISABLE ROW LEVEL SECURITY`);
ok("a table with RLS off stops the install", /row level security off/.test((await exec(fixText)) ?? ""));
await q(`ALTER TABLE public.monthly_leaders ENABLE ROW LEVEL SECURITY`);

// ---------------------------------------------------------------- ROLLBACK
console.log("=== rollback ===");
ok("the rollback block runs", (await exec(BEFORE)) === null);
eq("every login's reach is back to production's", await matrix(), M0);
ok("the fix pastes again", (await exec(fixText)) === null);
eq("and gives the same reach as the first time", await matrix(), M1);
done();
