// F-20 (S2): hardening - null uid is not staff for anon, helpers not for
// anon, recompute_student_points not for browsers, payroll months not for
// families.
//
// Real files: 20261111110000 (is_teacher_of_class), the rollback block
// "F-20" (production's bodies and grants: the "before" and the rollback
// under test), 20261116097000 (the fix, pasted twice). recompute_student_points
// and its trigger are stand-ins with production's signatures and security
// (the real ones are 20261023090000's).
import { readFileSync } from "node:fs";
import { harness, makeDb, cast, PEOPLE, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-20");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX = MIGS.find((f) => f.includes("20261116097000"));
if (!TA_MIG || !FIX) bail("usage: s2-f20-hardening.test.mjs <20261111110000> <20261116097000>");
const BEFORE = rollbackBlock("F-20");
if (!BEFORE) bail("no rollback F-20 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
await D.db.exec(`
  CREATE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id
      WHERE e.class_id = _class_id AND e.end_date IS NULL AND s.linked_user_id = _user_id) $f$;
  CREATE FUNCTION public.video_staff_for_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$ SELECT false $f$;
  CREATE FUNCTION public.language_support_staff_for_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $f$ SELECT false $f$;
  CREATE FUNCTION public.language_support_family_can_read(p_set uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $f$ SELECT false $f$;
  CREATE FUNCTION public.language_support_staff_can_read(p_set uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $f$ SELECT false $f$;
  CREATE TABLE public.student_points (student_id uuid, class_id uuid, month text, total integer, UNIQUE (student_id, class_id, month));
  CREATE TABLE public.point_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, points integer, month text);
  CREATE FUNCTION public.recompute_student_points(p_student uuid, p_class uuid, p_month text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  BEGIN
    INSERT INTO public.student_points VALUES (p_student, p_class, p_month,
      (SELECT coalesce(sum(points), 0) FROM public.point_transactions WHERE student_id = p_student AND class_id = p_class AND month = p_month))
    ON CONFLICT (student_id, class_id, month) DO UPDATE SET total = EXCLUDED.total;
  END $f$;
  CREATE FUNCTION public.update_student_points_from_transaction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  BEGIN PERFORM public.recompute_student_points(NEW.student_id, NEW.class_id, NEW.month); RETURN NEW; END $f$;
  CREATE TRIGGER trg_points AFTER INSERT ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public.update_student_points_from_transaction();
  ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY pt_staff ON public.point_transactions FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  GRANT SELECT, INSERT ON public.point_transactions, public.student_points TO authenticated;
  CREATE TABLE public.payroll_periods (month text PRIMARY KEY, status text, locked_by uuid, note text);
  ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
  CREATE POLICY "Admins manage payroll periods" ON public.payroll_periods FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  INSERT INTO public.payroll_periods VALUES ('2026-10','locked',NULL,'closed by the owner');
`);
ok("the rollback block (production's state) installs as the starting state", (await exec(BEFORE)) === null);
const W = await cast(D);
const { P } = W;
const can = async (role, fn) => (await one(`SELECT has_function_privilege($1, $2, 'EXECUTE') x`, [role, fn])).x;
const FNS = ["public.is_enrolled_in_class(uuid,uuid)", "public.is_linked_student(uuid,uuid)", "public.language_support_staff_for_class(uuid)",
  "public.language_support_family_can_read(uuid)", "public.language_support_staff_can_read(uuid)", "public.recompute_student_points(uuid,uuid,text)"];
const grants = async () => { const g = {}; for (const f of FNS) g[f.replace(/\(.*/, "")] = [await can("anon", f), await can("authenticated", f), await can("service_role", f)]; return g; };
// What video_staff_for_class answers with no uid, for a request of each kind.
const nullUid = async (jwtRole) => {
  await D.db.exec("BEGIN");
  await D.db.query(`SELECT set_config('test.uid', '', true), set_config('test.role', $1, true)`, [jwtRole ?? ""]);
  const r = (await D.db.query(`SELECT public.video_staff_for_class($1) s`, [W.CA])).rows[0].s;
  await D.db.exec("ROLLBACK");
  return r;
};
const payroll = async () => { const m = {}; for (const [l, u] of PEOPLE(P)) m[l] = (await as(u, `SELECT count(*)::int n FROM public.payroll_periods`)).rows[0]?.n ?? "error"; return m; };

console.log("=== before ===");
const G0 = await grants();
eq("BEFORE: anon may execute every one of the six", Object.values(G0).map((g) => g[0]), [true, true, true, true, true, true]);
eq("BEFORE: a signed-in account may run recompute_student_points", G0["public.recompute_student_points"][1], true);
eq("BEFORE: with no uid, an anon request is 'staff' of the class", await nullUid("anon"), true);
const PR0 = await payroll();
eq("BEFORE: a parent, a child and an unlinked sign-up read the payroll months", [PR0["family primary login"], PR0["child's own login"], PR0["unlinked sign-up"]], [1, 1, 1]);

console.log("=== apply ===");
const fixText = readFileSync(FIX, "utf8");
const state = async () => ({ g: await grants(), f: (await q(`SELECT md5(prosrc) m FROM pg_proc WHERE proname = 'video_staff_for_class'`))[0].m,
  p: await q(`SELECT policyname, qual FROM pg_policies WHERE tablename = 'payroll_periods' ORDER BY 1`) });
const e1 = await exec(fixText);
ok("the fix applies", e1 === null, e1);
const S1 = await state();
ok("and applies a second time", (await exec(fixText)) === null);
eq("the second paste changes nothing", await state(), S1);

console.log("=== after ===");
eq("anon / authenticated / service role on each", S1.g, {
  "public.is_enrolled_in_class": [false, true, true], "public.is_linked_student": [false, true, true],
  "public.language_support_staff_for_class": [false, true, true], "public.language_support_family_can_read": [false, true, true],
  "public.language_support_staff_can_read": [false, true, true], "public.recompute_student_points": [false, false, true],
});
eq("no uid: an anon request is not staff", await nullUid("anon"), false);
eq("no uid: an 'authenticated' request with no user is not staff", await nullUid("authenticated"), false);
eq("no uid: the service role still is", await nullUid("service_role"), true);
eq("no uid: SQL run by the owner (no request role) still is", await nullUid(null), true);
eq("the class teacher is staff of class A", (await as(P.TEA, `SELECT public.video_staff_for_class($1) s`, [W.CA])).rows[0].s, true);
eq("a teacher of another class is not", (await as(P.TEB, `SELECT public.video_staff_for_class($1) s`, [W.CA])).rows[0].s, false);
eq("an admin is", (await as(P.ADMIN, `SELECT public.video_staff_for_class($1) s`, [W.CA])).rows[0].s, true);
eq("a parent is not", (await as(P.PARENT, `SELECT public.video_staff_for_class($1) s`, [W.CA])).rows[0].s, false);
{
  const r = await as(P.KID, `SELECT public.recompute_student_points($1,$2,'2026-11')`, [W.A1, W.CA]);
  ok("a child calling recompute_student_points is refused", r.err !== null && /permission denied/.test(r.err), r);
  const t = await as(P.TEA, `INSERT INTO public.point_transactions (student_id, class_id, points, month) VALUES ($1,$2,10,'2026-11')`, [W.A1, W.CA], { keep: true });
  eq("a teacher's award still updates the board through the trigger", [t.err, (await one(`SELECT total FROM public.student_points WHERE student_id = $1`, [W.A1]))?.total], [null, 10]);
  eq("the service role still calls it", (await as(null, `SELECT public.recompute_student_points($1,$2,'2026-11')`, [W.A1, W.CA], { role: "service_role" })).err, null);
  eq("a signed-in policy still calls is_enrolled_in_class", (await as(P.KID, `SELECT public.is_enrolled_in_class(auth.uid(), $1) e`, [W.CA])).rows[0].e, true);
}
const PR1 = await payroll();
eq("payroll months: admins and teacher-role accounts only", PR1, {
  "admin": 1, "admin who also teaches": 1, "class teacher": 1, "standing TA": 1, "cover teacher": 1, "teacher of another class": 1,
  "family primary login": 0, "child's own login": 0, "child's second login": 0, "another family": 0, "unlinked sign-up": 0,
  "self-made teacher, no record": 1, "no role": 0,
});

console.log("=== refusals ===");
await q(`CREATE POLICY "open months" ON public.payroll_periods FOR SELECT TO authenticated USING (true)`);
ok("another USING (true) read policy on payroll_periods stops the install", /USING \(true\)/.test((await exec(fixText)) ?? ""));
await q(`DROP POLICY "open months" ON public.payroll_periods`);
await q(`ALTER FUNCTION public.update_student_points_from_transaction() SECURITY INVOKER`);
ok("an INVOKER points trigger stops the install (the revoke would break awards)", /not SECURITY DEFINER/.test((await exec(fixText)) ?? ""));
await q(`ALTER FUNCTION public.update_student_points_from_transaction() SECURITY DEFINER`);

console.log("=== rollback ===");
ok("the rollback block runs", (await exec(BEFORE)) === null);
eq("grants back to production's", await grants(), G0);
eq("no-uid anon is 'staff' again", await nullUid("anon"), true);
eq("payroll months open again", await payroll(), PR0);
ok("the fix pastes again", (await exec(fixText)) === null);
eq("and gives the same state as the first time", await state(), S1);
done();
