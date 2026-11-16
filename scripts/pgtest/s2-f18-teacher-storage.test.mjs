// F-18 (S2): student-work, lesson-resources and exam-reports files belong to
// the staff of their class, not to every teacher.
//
// Real files: 20261111110000 (is_teacher_of_class), the rollback block
// "F-18" (production's three any-teacher policies: the "before" and the
// rollback under test), 20261116094000 (the fix, pasted twice). The child's
// read policies beside them are the repository's (20260712090000,
// 20260809095818, 20260721090000, 20260417001017).
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { harness, makeDb, cast, PEOPLE, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-18");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX = MIGS.find((f) => f.includes("20261116094000"));
if (!TA_MIG || !FIX) bail("usage: s2-f18-teacher-storage.test.mjs <20261111110000> <20261116094000>");
const BEFORE = rollbackBlock("F-18");
if (!BEFORE) bail("no rollback F-18 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
await D.db.exec(`
  CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, uploaded_by uuid,
    storage_path text, status text NOT NULL DEFAULT 'needs_review', member_student_ids uuid[] NOT NULL DEFAULT '{}');
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_work TO authenticated, service_role;
  CREATE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id
      WHERE e.class_id = _class_id AND e.end_date IS NULL AND (s.linked_user_id = _user_id
        OR s.family_id IN (SELECT id FROM public.families WHERE primary_user_id = _user_id)));
  $f$;
  CREATE OR REPLACE FUNCTION public.can_read_student_work_file(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.student_work w JOIN public.students s ON s.linked_user_id = auth.uid()
      WHERE w.storage_path = _path AND w.status = 'approved' AND (w.student_id = s.id OR s.id = ANY (COALESCE(w.member_student_ids, '{}'::uuid[]))));
  $$;
  GRANT EXECUTE ON FUNCTION public.is_enrolled_in_class(uuid, uuid), public.can_read_student_work_file(text) TO authenticated;
  CREATE POLICY "students_read_own_work_files" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'student-work' AND (storage.foldername(name))[1] = 'students'
           AND public.is_linked_student(auth.uid(), ((storage.foldername(name))[2])::uuid));
  CREATE POLICY students_read_approved_work_files ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'student-work' AND public.can_read_student_work_file(name));
  CREATE POLICY "students_read_lesson_resource_files" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'lesson-resources' AND public.is_enrolled_in_class(auth.uid(), ((storage.foldername(name))[1])::uuid));
  CREATE POLICY "Admins manage exam-reports storage" ON storage.objects FOR ALL
    USING (bucket_id = 'exam-reports' AND has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (bucket_id = 'exam-reports' AND has_role(auth.uid(), 'admin'::app_role));
`);
ok("production's any-teacher policies (the rollback block) install as the starting state", (await exec(BEFORE)) === null);
const W = await cast(D);
const { P } = W;
// A teacher record for the self-made teacher? No - it has none, which is the point.
const obj = async (bucket, name, owner = null) => (await one(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,$3) RETURNING id`, [bucket, name, owner])).id;
const OB = {
  "work A1 (routed)": await obj("student-work", `students/${W.A1}/p1.jpg`, P.TEA),
  "work B1 (routed)": await obj("student-work", `students/${W.B1}/p2.jpg`, P.TEB),
  "work A incoming": await obj("student-work", `incoming/${randomUUID()}.jpg`, P.TEA),
  "teacher B's fresh upload": await obj("student-work", `incoming/${randomUUID()}.jpg`, P.TEB),
  "resource A": await obj("lesson-resources", `${W.CA}/r1.jpg`, P.TEA),
  "resource B": await obj("lesson-resources", `${W.CB}/r2.jpg`, P.TEB),
};
const nameOf = async (id) => (await one(`SELECT name FROM storage.objects WHERE id = $1`, [id])).name;
await q(`INSERT INTO public.student_work (student_id, class_id, uploaded_by, storage_path, status) VALUES ($1,$2,$3,$4,'approved'),($5,$6,$7,$8,'needs_review'),(NULL,$2,$3,$9,'needs_review')`,
  [W.A1, W.CA, P.TEA, await nameOf(OB["work A1 (routed)"]), W.B1, W.CB, P.TEB, await nameOf(OB["work B1 (routed)"]), await nameOf(OB["work A incoming"])]);
const LABELS = Object.keys(OB);
const reads = async (uid) => { const ids = (await as(uid, `SELECT id FROM storage.objects`)).rows.map((r) => r.id); return LABELS.filter((l) => ids.includes(OB[l])); };
const writes = async (uid, verb) => {
  const out = [];
  for (const l of LABELS) {
    const sql = verb === "update" ? `UPDATE storage.objects SET name = name WHERE id = $1` : `DELETE FROM storage.objects WHERE id = $1`;
    const r = await as(uid, sql, [OB[l]]);
    if (r.err === null && r.n === 1) out.push(l);
  }
  return out;
};
const UPLOADS = {
  "student-work incoming/": () => ["student-work", `incoming/${randomUUID()}.jpg`],
  "student-work teams/": () => ["student-work", `teams/${randomUUID()}.jpg`],
  "student-work into a child's folder": () => ["student-work", `students/${W.B1}/planted.jpg`],
  "lesson-resources class A": () => ["lesson-resources", `${W.CA}/${randomUUID()}.jpg`],
  "lesson-resources class B": () => ["lesson-resources", `${W.CB}/${randomUUID()}.jpg`],
  "exam-reports for A1": () => ["exam-reports", `${W.A1}/1-report.pdf`],
  "exam-reports for B1": () => ["exam-reports", `${W.B1}/1-report.pdf`],
};
const uploads = async (uid) => {
  const out = [];
  for (const [l, f] of Object.entries(UPLOADS)) {
    const [b, n] = f();
    // The INSERT policy alone (the read-back is checked in the Smart Upload
    // flow below), with the caller as owner as the Storage API sets it.
    const r = await as(uid, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,$3)`, [b, n, uid]);
    if (r.err === null && r.n === 1) out.push(l);
  }
  return out;
};
const reach = async (uid) => ({ read: await reads(uid), update: await writes(uid, "update"), delete: await writes(uid, "delete"), upload: await uploads(uid) });
const matrix = async () => { const m = {}; for (const [l, u] of PEOPLE(P)) m[l] = await reach(u); return m; };

console.log("=== before ===");
const M0 = await matrix();
for (const who of ["teacher of another class", "self-made teacher, no record"]) {
  eq(`BEFORE: ${who} reads, overwrites and deletes every work photo and lesson resource`, [M0[who].read, M0[who].update, M0[who].delete], [LABELS, LABELS, LABELS]);
  ok(`BEFORE: ${who} uploads an exam report into any child's folder`, M0[who].upload.includes("exam-reports for A1") && M0[who].upload.includes("exam-reports for B1"), M0[who].upload);
}

console.log("=== apply ===");
const fixText = readFileSync(FIX, "utf8");
const pols = async () => q(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' ORDER BY 1`);
const e1 = await exec(fixText);
ok("the fix applies", e1 === null, e1);
const P1 = await pols();
ok("and applies a second time", (await exec(fixText)) === null);
eq("the second paste changes nothing", await pols(), P1);
const M1 = await matrix();

console.log("=== after ===");
const ALL = LABELS;
const A_WORK = ["work A1 (routed)", "work A incoming", "resource A"];
const EXPECT = {
  "admin": { read: ALL, update: ALL, delete: ALL, upload: Object.keys(UPLOADS) },
  "admin who also teaches": { read: ALL, update: ALL, delete: ALL, upload: Object.keys(UPLOADS) },
  "class teacher": { read: A_WORK, update: A_WORK, delete: A_WORK, upload: ["student-work incoming/", "student-work teams/", "lesson-resources class A", "exam-reports for A1"] },
  "standing TA": { read: A_WORK, update: A_WORK, delete: A_WORK, upload: ["student-work incoming/", "student-work teams/", "lesson-resources class A", "exam-reports for A1"] },
  "cover teacher": { read: A_WORK, update: A_WORK, delete: A_WORK, upload: ["student-work incoming/", "student-work teams/", "lesson-resources class A", "exam-reports for A1"] },
  "teacher of another class": { read: ["work B1 (routed)", "teacher B's fresh upload", "resource B"], update: ["work B1 (routed)", "teacher B's fresh upload", "resource B"],
    delete: ["work B1 (routed)", "teacher B's fresh upload", "resource B"], upload: ["student-work incoming/", "student-work teams/", "lesson-resources class B", "exam-reports for B1"] },
  "family primary login": { read: ["resource A"], update: [], delete: [], upload: [] },
  "child's own login": { read: ["work A1 (routed)", "resource A"], update: [], delete: [], upload: [] },
  "child's second login": { read: [], update: [], delete: [], upload: [] },
  "another family": { read: ["resource B"], update: [], delete: [], upload: [] },
  "unlinked sign-up": { read: [], update: [], delete: [], upload: [] },
  "self-made teacher, no record": { read: [], update: [], delete: [], upload: [] },
  "no role": { read: [], update: [], delete: [], upload: [] },
};
for (const [l] of PEOPLE(P)) eq(`${l}: read / update / delete / upload`, M1[l], EXPECT[l]);
for (const l of ["family primary login", "child's own login", "child's second login", "another family"]) eq(`${l}: reads exactly what it read before`, M1[l].read, M0[l].read);
let wider = [];
for (const [l] of PEOPLE(P)) for (const k of ["read", "update", "delete", "upload"]) for (const x of M1[l][k]) if (!M0[l][k].includes(x)) wider.push(`${l}/${k}/${x}`);
eq("no login gains anything it did not have before", wider, []);

// The real flow, statement by statement, as the class teacher (TeacherSmartUpload).
{
  const path = `incoming/${randomUUID()}.jpg`;
  await D.db.exec("BEGIN");
  await D.db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', 'authenticated', true)`, [P.TEA]);
  await D.db.exec("SET LOCAL ROLE authenticated");
  let stepErr = null;
  try {
    await D.db.query(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('student-work', $1, $2)`, [path, P.TEA]);
    const seen = (await D.db.query(`SELECT count(*)::int n FROM storage.objects WHERE name = $1`, [path])).rows[0].n;
    await D.db.query(`INSERT INTO public.student_work (class_id, uploaded_by, storage_path) VALUES ($1,$2,$3)`, [W.CA, P.TEA, path]);
    const viaRow = (await D.db.query(`SELECT public.student_work_file_staff_can($1) c`, [path])).rows[0].c;
    if (seen !== 1 || viaRow !== true) stepErr = `seen ${seen}, viaRow ${viaRow}`;
  } catch (e) { stepErr = e.message; }
  await D.db.exec("ROLLBACK");
  ok("Smart Upload: the teacher uploads to incoming/, reads it back, files the row, and the class's staff then reach it", stepErr === null, stepErr);
}
eq("the service role (ocr-student-work routing a file) still reaches everything",
  (await as(null, `SELECT count(*)::int n FROM storage.objects`, [], { role: "service_role" })).rows[0].n, LABELS.length);
{
  const r = await as(P.TEB, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [OB["teacher B's fresh upload"], `students/${W.A1}/moved.jpg`]);
  ok("teacher B cannot move their own upload into a class-A child's folder", r.err !== null || r.n === 0, r);
}

console.log("=== refusals ===");
await q(`CREATE POLICY "Teachers view all student work" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-work' AND has_role(auth.uid(), 'teacher'::app_role))`);
const r1 = await exec(fixText);
ok("an unknown policy on student-work stops the install, named", /Teachers view all student work/.test(r1 ?? ""), r1);
await q(`DROP POLICY "Teachers view all student work" ON storage.objects`);
await q(`CREATE POLICY "Teachers upload exam-reports files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exam-reports' AND auth.uid() IS NOT NULL)`);
ok("the older any-account exam-reports upload policy is dropped by name, not left behind", (await exec(fixText)) === null);
eq("...and is gone", (await q(`SELECT count(*)::int n FROM pg_policies WHERE policyname = 'Teachers upload exam-reports files'`))[0].n, 0);
await q(`CREATE POLICY "exam uploads open" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exam-reports')`);
ok("an unknown exam-reports upload policy stops the install", /exam uploads open/.test((await exec(fixText)) ?? ""));
await q(`DROP POLICY "exam uploads open" ON storage.objects`);
eq("homework-videos and other buckets are not mistaken for these", (await exec(`CREATE POLICY hv ON storage.objects FOR SELECT USING (bucket_id = 'homework-videos'); ${fixText}`)), null);
await q(`DROP POLICY hv ON storage.objects`);

console.log("=== rollback ===");
ok("the rollback block runs", (await exec(BEFORE)) === null);
eq("every login's reach is back to production's", await matrix(), M0);
ok("the fix pastes again", (await exec(fixText)) === null);
eq("and gives the same reach as the first time", await matrix(), M1);
done();
