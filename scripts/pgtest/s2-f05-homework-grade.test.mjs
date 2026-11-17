// F-05 (S2): a child or a parent cannot write their own homework grade.
//
// Real files: 20261111110000 (is_teacher_of_class), 20261116095000 (the fix,
// pasted twice), the rollback block "F-05". The homework_submissions
// policies are the repository's: the three student ones from
// 20260508153000, hw_sub_teacher_all / hw_sub_admin_all from 20261023090000.
import { readFileSync } from "node:fs";
import { harness, makeDb, cast, PEOPLE, rollbackBlock } from "./s2-prelude.mjs";

const { ok, eq, done, bail } = harness("F-05");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX = MIGS.find((f) => f.includes("20261116095000"));
if (!TA_MIG || !FIX) bail("usage: s2-f05-homework-grade.test.mjs <20261111110000> <20261116095000>");
const ROLLBACK = rollbackBlock("F-05");
if (!ROLLBACK) bail("no rollback F-05 block in the evidence file");

const D = await makeDb(TA_MIG);
const { q, one, exec, as } = D;
const OWN = `student_id IN (SELECT s.id FROM public.students s WHERE s.linked_user_id = auth.uid())
    OR student_id IN (SELECT s.id FROM public.students s WHERE s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = auth.uid()))`;
await D.db.exec(`
  CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL REFERENCES public.homeworks(id),
    student_id uuid NOT NULL REFERENCES public.students(id), status text NOT NULL DEFAULT 'submitted', submission_text text, storage_key text,
    file_name text, file_size integer, grade text, teacher_feedback text, graded_at timestamptz, submitted_at timestamptz,
    assignment_instructions text, celebration_seen_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (homework_id, student_id));
  ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
  GRANT ALL ON public.homework_submissions TO service_role;
  CREATE POLICY "Students can view own submissions" ON public.homework_submissions FOR SELECT USING (${OWN} OR public.has_role(auth.uid(), 'admin'::public.app_role));
  CREATE POLICY "Students can insert own submissions" ON public.homework_submissions FOR INSERT WITH CHECK (${OWN});
  CREATE POLICY "Students can update own submissions" ON public.homework_submissions FOR UPDATE USING (${OWN});
  CREATE POLICY hw_sub_teacher_all ON public.homework_submissions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.homeworks h WHERE h.id = homework_submissions.homework_id AND public.is_teacher_of_class(auth.uid(), h.class_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.homeworks h WHERE h.id = homework_submissions.homework_id AND public.is_teacher_of_class(auth.uid(), h.class_id)));
  CREATE POLICY hw_sub_admin_all ON public.homework_submissions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
`);
const W = await cast(D);
const { P } = W;
const HA = (await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'hw A') RETURNING id`, [W.CA])).id;
const HA2 = (await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'hw A2') RETURNING id`, [W.CA])).id;
const HB = (await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'hw B') RETURNING id`, [W.CB])).id;
const SUB = (await one(`INSERT INTO public.homework_submissions (homework_id, student_id, submission_text, submitted_at) VALUES ($1,$2,'my essay',now()) RETURNING id`, [HA, W.A1])).id;
const GRADED = (await one(`INSERT INTO public.homework_submissions (homework_id, student_id, status, grade, teacher_feedback, graded_at) VALUES ($1,$2,'graded','6','ok',now()) RETURNING id`, [HA2, W.A1])).id;

const FAMILY = [["family primary login", P.PARENT], ["child's own login", P.KID]];
const FORGES = {
  "sets a grade": [`UPDATE public.homework_submissions SET grade = '10' WHERE id = $1`, [SUB]],
  "writes teacher feedback": [`UPDATE public.homework_submissions SET teacher_feedback = 'Perfect! - teacher' WHERE id = $1`, [SUB]],
  "marks it graded": [`UPDATE public.homework_submissions SET status = 'graded', graded_at = now() WHERE id = $1`, [SUB]],
  "raises a grade the teacher gave": [`UPDATE public.homework_submissions SET grade = '10' WHERE id = $1`, [GRADED]],
  "un-grades it": [`UPDATE public.homework_submissions SET status = 'submitted' WHERE id = $1`, [GRADED]],
  "inserts a submission already graded": [`INSERT INTO public.homework_submissions (homework_id, student_id, status, grade, teacher_feedback, graded_at) VALUES ($1,$2,'graded','10','great',now())`, [HB, W.B1]],
  "moves a submission to another homework": [`UPDATE public.homework_submissions SET homework_id = $2 WHERE id = $1`, [SUB, HB]],
};
const forgeries = async (uid) => {
  const out = [];
  for (const [label, [sql, p]] of Object.entries(FORGES)) {
    // The insert is about the caller's own child (A1), on a homework of A1's
    // class that has no submission yet.
    const params = label.startsWith("inserts")
      ? [(await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'fresh') RETURNING id`, [W.CA])).id, W.A1]
      : p;
    const r = await as(uid, sql, params);
    if (r.err === null && r.n === 1) out.push(label);
  }
  return out;
};

console.log("=== before: no guard ===");
for (const [l, u] of FAMILY) eq(`BEFORE: ${l} grades, writes feedback, marks graded, raises / un-grades, inserts graded, moves`, await forgeries(u), Object.keys(FORGES));

console.log("=== apply ===");
const fixText = readFileSync(FIX, "utf8");
const trg = async () => q(`SELECT tgname, tgenabled, md5(p.prosrc) m, p.prosecdef d FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.homework_submissions'::regclass AND NOT t.tgisinternal`);
ok("the fix applies", (await exec(fixText)) === null);
const T1 = await trg();
ok("and applies a second time", (await exec(fixText)) === null);
eq("one guard trigger, enabled, SECURITY DEFINER; the second paste changes nothing", [T1.length, T1[0]?.tgenabled, T1[0]?.d, JSON.stringify(await trg()) === JSON.stringify(T1)], [1, "O", true, true]);

console.log("=== after: the family cannot grade ===");
for (const [l, u] of FAMILY) eq(`${l}: no forgery gets through`, await forgeries(u), []);
{
  const r = await as(P.KID, FORGES["sets a grade"][0], FORGES["sets a grade"][1]);
  eq("the refusal is 42501 with a plain message", [r.code, /teacher can grade/.test(r.err ?? "")], ["42501", true]);
}
eq("the seeded rows are untouched", await q(`SELECT status, grade, teacher_feedback FROM public.homework_submissions ORDER BY status`),
  [{ status: "graded", grade: "6", teacher_feedback: "ok" }, { status: "submitted", grade: null, teacher_feedback: null }]);

console.log("=== after: what families really do still works ===");
const fresh = async () => (await one(`INSERT INTO public.homeworks (class_id, title) VALUES ($1,'new') RETURNING id`, [W.CA])).id;
for (const [l, u] of [...FAMILY, ["child's second login (no student policy: unchanged)", P.SECOND]]) {
  const h = await fresh();
  // HomeworkSubmission.tsx: upsert with these columns
  const up = await as(u, `INSERT INTO public.homework_submissions (homework_id, student_id, submission_text, storage_key, file_name, file_size, status, submitted_at, assignment_instructions)
    VALUES ($1,$2,'text','submissions/x/y/z.pdf','z.pdf',10,'submitted',now(),'do it')
    ON CONFLICT (homework_id, student_id) DO UPDATE SET submission_text = EXCLUDED.submission_text, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at`, [h, W.A1], { keep: true });
  const again = await as(u, `INSERT INTO public.homework_submissions (homework_id, student_id, submission_text, status, submitted_at)
    VALUES ($1,$2,'second try','submitted',now())
    ON CONFLICT (homework_id, student_id) DO UPDATE SET submission_text = EXCLUDED.submission_text, status = EXCLUDED.status, submitted_at = EXCLUDED.submitted_at`, [h, W.A1]);
  if (u === P.SECOND) eq(`${l}: refused before and after by the policies (no guard involved)`, [up.err !== null, again.err !== null], [true, true]);
  else eq(`${l}: hands in, then hands in again before grading`, [up.err, up.n, again.err, again.n], [null, 1, null, 1]);
}
eq("a child marks the celebration of a graded homework seen", (await as(P.KID, `UPDATE public.homework_submissions SET celebration_seen_at = now() WHERE id = $1`, [GRADED])).n, 1);
{
  // VideoHomeworkSubmission: re-record upsert of a not-yet-graded row
  const r = await as(P.PARENT, `UPDATE public.homework_submissions SET status = 'submitted', submitted_at = now(), submission_text = NULL WHERE id = $1`, [SUB]);
  eq("the video recorder's upsert of an ungraded row", [r.err, r.n], [null, 1]);
}

console.log("=== after: staff grade as before ===");
for (const [l, u] of [["class teacher", P.TEA], ["standing TA", P.TA], ["cover teacher", P.COVER], ["admin", P.ADMIN], ["admin who also teaches", P.ADMIN_TEACHER]]) {
  const r = await as(u, `UPDATE public.homework_submissions SET status = 'graded', grade = '8', teacher_feedback = 'well done', graded_at = now() WHERE id = $1`, [SUB]);
  eq(`${l}: grades the submission`, [r.err, r.n], [null, 1]);
  const r2 = await as(u, `UPDATE public.homework_submissions SET grade = '7', teacher_feedback = 'corrected' WHERE id = $1`, [GRADED]);
  eq(`${l}: corrects a grade`, [r2.err, r2.n], [null, 1]);
}
{
  const r = await as(P.TEB, `UPDATE public.homework_submissions SET grade = '1' WHERE id = $1`, [SUB]);
  ok("a teacher of another class cannot (row policies, as before)", r.err !== null || r.n === 0, r);
  const r2 = await as(P.FAKE_T, `UPDATE public.homework_submissions SET grade = '1' WHERE id = $1`, [SUB]);
  ok("nor can a self-made teacher", r2.err !== null || r2.n === 0, r2);
  const r3 = await as(P.TEA, `UPDATE public.homework_submissions SET homework_id = $2 WHERE id = $1`, [SUB, HB]);
  ok("class A's teacher cannot move a submission into class B's homework", r3.err !== null || r3.n === 0, r3);
}
eq("the service role (stars-sync, edge functions) grades with no uid",
  (await as(null, `UPDATE public.homework_submissions SET status = 'graded', grade = '9', graded_at = now() WHERE id = $1`, [SUB], { role: "service_role" })).n, 1);
{
  // A SECURITY DEFINER function acting for staff (approve_video_feedback's shape).
  await D.db.exec(`CREATE FUNCTION public.t_approve(p uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN IF NOT public.is_teacher_of_class(auth.uid(), (SELECT h.class_id FROM homeworks h JOIN homework_submissions s ON s.homework_id = h.id WHERE s.id = p)) THEN RAISE EXCEPTION 'no'; END IF;
    UPDATE public.homework_submissions SET status = 'graded', grade = '9' WHERE id = p; END $$;
    GRANT EXECUTE ON FUNCTION public.t_approve(uuid) TO authenticated;`);
  eq("a definer function called by the class teacher still writes the grade", (await as(P.TEA, `SELECT public.t_approve($1)`, [SUB])).err, null);
  ok("...and called by the child it is refused (by the guard, inside the definer)", (await as(P.KID, `SELECT public.t_approve($1)`, [SUB])).err !== null);
}

console.log("=== rollback ===");
ok("the rollback block runs", (await exec(ROLLBACK)) === null);
eq("no trigger left", (await trg()).length, 0);
eq("the defect is back (a child sets a grade)", (await as(P.KID, FORGES["sets a grade"][0], FORGES["sets a grade"][1])).n, 1);
ok("the fix pastes again", (await exec(fixText)) === null);
eq("and the child is refused again", (await as(P.KID, FORGES["sets a grade"][0], FORGES["sets a grade"][1])).n, 0);
void PEOPLE;
done();
