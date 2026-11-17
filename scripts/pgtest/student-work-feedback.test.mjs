// N-6: AI feedback on student work is a staff-only draft until a teacher
// approves it.
//
//   node scripts/pgtest/student-work-feedback.test.mjs supabase/migrations/20261117160000_student_work_ai_feedback_staff_only.sql
//
// The prelude is student_work as production has it (columns, the six row
// policies and the helpers they call, as read from the live database on
// 17 Nov 2026), seeded with what the live rows look like: approved work
// whose AI text the teacher approved as-is, approved work the teacher
// edited, rejected work with an AI text, and work still waiting. Then the
// REAL migration runs, and what a child, a teacher, the service role and an
// out-of-date generate-work-feedback can each do is asserted.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_user uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, linked_user_id uuid);
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = is_teacher_of_class.class_id
                         AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;
`;
const STAFF_CREATED_THIS = `
  -- As live (20261113140000).
  CREATE FUNCTION public.staff_created_this(_creator uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS
    $f$ SELECT auth.uid() IS NOT NULL AND _creator = auth.uid()
          AND coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false) $f$;
`;
const TABLE = `
  CREATE TABLE public.student_work (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    uploaded_by uuid NOT NULL,
    storage_path text, original_filename text, mime_type text,
    workflow text NOT NULL DEFAULT 'general',
    ocr_text text, ocr_confidence numeric, detected_student_name text, match_confidence numeric,
    status text NOT NULL DEFAULT 'processing'
      CHECK (status IN ('processing', 'needs_review', 'approved', 'rejected', 'failed')),
    teacher_notes text, approved_by uuid, approved_at timestamptz, error_message text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    ai_feedback text,
    is_teamwork boolean NOT NULL DEFAULT false, member_student_ids uuid[] NOT NULL DEFAULT '{}', external_url text);
  ALTER TABLE public.student_work ENABLE ROW LEVEL SECURITY;
  -- The live policies (pg_policies, 17 Nov 2026). The two write policies'
  -- helpers are reduced to "a teacher of the class" - enough to let a
  -- teacher write, which is what these cases need.
  CREATE POLICY admins_all_student_work ON public.student_work FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY student_work_staff_select ON public.student_work FOR SELECT TO authenticated
    USING (public.staff_created_this(uploaded_by) OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));
  CREATE POLICY student_work_staff_update ON public.student_work FOR UPDATE TO authenticated
    USING (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
    WITH CHECK (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY students_read_approved_work ON public.student_work FOR SELECT TO authenticated
    USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.students s
            WHERE s.linked_user_id = auth.uid() AND (s.id = student_work.student_id OR s.id = ANY (student_work.member_student_ids))));
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const U = {
  teacher: "11111111-1111-4111-8111-111111111111", otherTeacher: "22222222-2222-4222-8222-222222222222",
  child: "33333333-3333-4333-8333-333333333333", admin: "44444444-4444-4444-8444-444444444444",
  uploader: "55555555-5555-4555-8555-555555555555",
};
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

// ------------------------------------------------------------ preflight
console.log("=== it refuses to install on what it does not know ===");
{
  const bare = new PGlite();
  await bare.exec(BASE);
  let err = null;
  try { await bare.exec(sql()); } catch (e) { err = e.message; await bare.exec("ROLLBACK"); }
  ok("with no student_work: refused", /Refusing to install/.test(err ?? ""), err ?? "installed");
  await bare.exec(TABLE.replace(/CREATE POLICY student_work_staff_select[\s\S]*?;\n/, ""));
  err = null;
  try { await bare.exec(sql()); } catch (e) { err = e.message; await bare.exec("ROLLBACK"); }
  ok("without staff_created_this: refused", /staff_created_this missing/.test(err ?? ""), err ?? "installed");
  eq("  and nothing was left behind", (await bare.query(`SELECT to_regclass('public.student_work_ai_drafts') t`)).rows[0].t, null);
}

const db = new PGlite();
await db.exec(BASE + STAFF_CREATED_THIS + TABLE);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const cls = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Stars', $1) RETURNING id`, [U.teacher])).id;
const kid = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Minh', $1) RETURNING id`, [U.child])).id;
const ins = async (status, ai, notes, extra = {}) => (await one(
  `INSERT INTO public.student_work (student_id, class_id, uploaded_by, storage_path, status, ai_feedback, teacher_notes, approved_by)
   VALUES ($1, $2, $3, 'p.jpg', $4, $5, $6, $7) RETURNING id`,
  [kid, extra.noClass ? null : cls, extra.uploader ?? U.teacher, status, ai, notes, ["approved", "rejected"].includes(status) ? U.teacher : null])).id;
const asIs = await ins("approved", "AI TEXT A: lovely work, Minh!", "AI TEXT A: lovely work, Minh!");   // the 56
const edited = await ins("approved", "AI TEXT B", "Teacher's own words B");                          // the 8
const rejected = await ins("rejected", "AI TEXT C", "AI TEXT C");                                    // the 1
const waiting = await ins("needs_review", null, null);
const unclassed = await ins("needs_review", "AI TEXT E", null, { noClass: true, uploader: U.uploader });

async function as(uid, role, fn, dbRole = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec(`SET LOCAL ROLE ${dbRole}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; } catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (...a) => { try { await as(...a); return null; } catch (e) { return e.message; } };
const service = (fn) => as(null, null, fn, "service_role");

// What a child could read through the API before.
{
  const r = await as(U.child, "student", () => db.query(`SELECT ai_feedback FROM public.student_work WHERE id = $1`, [edited]));
  eq("BEFORE: the child reads the raw AI text on approved work", r.rows[0].ai_feedback, "AI TEXT B");
}

console.log("=== the migration ===");
await db.exec(sql());
ok("applies", true);
{
  let again = null;
  try { await db.exec(sql()); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}

console.log("=== the AI texts were moved, not deleted ===");
{
  const d = (await db.query(`SELECT work_id, feedback, source FROM public.student_work_ai_drafts ORDER BY feedback`)).rows;
  eq("every AI text is in the draft table, verbatim", d.map((r) => [r.work_id, r.feedback, r.source]), [
    [asIs, "AI TEXT A: lovely work, Minh!", "moved_from_student_work"], [edited, "AI TEXT B", "moved_from_student_work"],
    [rejected, "AI TEXT C", "moved_from_student_work"], [unclassed, "AI TEXT E", "moved_from_student_work"]]);
  eq("  and none is left on student_work", (await one(`SELECT count(*)::int c FROM public.student_work WHERE ai_feedback IS NOT NULL`)).c, 0);
  eq("what the teacher approved is untouched", (await db.query(`SELECT teacher_notes FROM public.student_work WHERE id = ANY($1) ORDER BY teacher_notes`, [[asIs, edited]])).rows.map((r) => r.teacher_notes),
    ["AI TEXT A: lovely work, Minh!", "Teacher's own words B"]);
}

console.log("=== a child ===");
{
  const r = await as(U.child, "student", () => db.query(`SELECT id, ai_feedback, teacher_notes FROM public.student_work ORDER BY teacher_notes`));
  eq("still sees the two approved works (and only those)", r.rows.map((x) => x.id).sort(), [asIs, edited].sort());
  eq("  with what the teacher approved", r.rows.map((x) => x.teacher_notes), ["AI TEXT A: lovely work, Minh!", "Teacher's own words B"]);
  eq("  and no AI text", r.rows.map((x) => x.ai_feedback), [null, null]);
  eq("reads no drafts at all", (await as(U.child, "student", () => db.query(`SELECT * FROM public.student_work_ai_drafts`))).rows.length, 0);
  eq("a family account reads none either", (await as(U.child, "family", () => db.query(`SELECT * FROM public.student_work_ai_drafts`))).rows.length, 0);
  const err = await tryAs(U.child, "student", () => db.query(`INSERT INTO public.student_work_ai_drafts (work_id, feedback) VALUES ($1, 'x')`, [waiting]));
  ok("cannot write one", /permission denied/.test(err ?? ""), err ?? "written");
  eq("no policy on the draft table names a student or a family",
    (await db.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'student_work_ai_drafts'`)).rows, [{ policyname: "student_work_ai_drafts_staff_read", cmd: "SELECT" }]);
}

console.log("=== staff ===");
{
  const t = await as(U.teacher, "teacher", () => db.query(`SELECT work_id FROM public.student_work_ai_drafts`));
  eq("the class's teacher reads the drafts of the class's work", t.rows.map((x) => x.work_id).sort(), [asIs, edited, rejected].sort());
  eq("another teacher reads none", (await as(U.otherTeacher, "teacher", () => db.query(`SELECT * FROM public.student_work_ai_drafts`))).rows.length, 0);
  eq("the teacher who uploaded unassigned work reads its draft", (await as(U.uploader, "teacher", () => db.query(`SELECT work_id FROM public.student_work_ai_drafts`))).rows.map((x) => x.work_id), [unclassed]);
  eq("an admin reads all", (await as(U.admin, "admin", () => db.query(`SELECT * FROM public.student_work_ai_drafts`))).rows.length, 4);
  const err = await tryAs(U.teacher, "teacher", () => db.query(`UPDATE public.student_work_ai_drafts SET feedback = 'x'`));
  ok("a teacher cannot write a draft from the browser (only the service role does)", /permission denied/.test(err ?? ""), err ?? "written");
}

console.log("=== generate-work-feedback (service role) ===");
{
  await service(() => db.query(`INSERT INTO public.student_work_ai_drafts (work_id, feedback, generated_by) VALUES ($1, 'Draft for D', $2)`, [waiting, U.teacher]));
  eq("a draft for work waiting on the teacher is saved", (await one(`SELECT feedback FROM public.student_work_ai_drafts WHERE work_id = $1`, [waiting])).feedback, "Draft for D");
  for (const [label, id] of [["approved", asIs], ["rejected", rejected]]) {
    const err = await tryAs(null, null, () => db.query(
      `INSERT INTO public.student_work_ai_drafts (work_id, feedback) VALUES ($1, 'OVERWRITE') ON CONFLICT (work_id) DO UPDATE SET feedback = EXCLUDED.feedback`, [id]), "service_role");
    ok(`a draft over ${label} work is refused`, /has been reviewed/.test(err ?? ""), err ?? "written");
  }
  eq("  and the approved work's draft is as it was", (await one(`SELECT feedback FROM public.student_work_ai_drafts WHERE work_id = $1`, [asIs])).feedback, "AI TEXT A: lovely work, Minh!");
}

console.log("=== the function as deployed before (writes student_work.ai_feedback) ===");
{
  await service(() => db.query(`UPDATE public.student_work SET ai_feedback = 'OLD FN DRAFT', updated_at = now() WHERE id = $1`, [waiting]));
  eq("its write to work waiting on the teacher becomes a draft", (await one(`SELECT feedback FROM public.student_work_ai_drafts WHERE work_id = $1`, [waiting])).feedback, "OLD FN DRAFT");
  eq("  and the column stays empty", (await one(`SELECT ai_feedback FROM public.student_work WHERE id = $1`, [waiting])).ai_feedback, null);
  const err = await tryAs(null, null, () => db.query(`UPDATE public.student_work SET ai_feedback = 'OVERWRITE' WHERE id = $1`, [asIs]), "service_role");
  ok("its write over approved work is refused (it used to overwrite it)", /has been reviewed|being reviewed/.test(err ?? ""), err ?? "written");
  const err2 = await tryAs(null, null, () => db.query(
    `INSERT INTO public.student_work (student_id, class_id, uploaded_by, storage_path, status, ai_feedback) VALUES ($1, $2, $3, 'q.jpg', 'needs_review', 'x')`, [kid, cls, U.teacher]), "service_role");
  ok("a new row carrying an AI text is refused", /retired/.test(err2 ?? ""), err2 ?? "inserted");
  await db.exec(`ALTER TABLE public.student_work DISABLE TRIGGER student_work_ai_feedback_divert`);
  let err3 = null;
  try { await db.query(`UPDATE public.student_work SET ai_feedback = 'x' WHERE id = $1`, [waiting]); } catch (e) { err3 = e.message; }
  await db.exec(`ALTER TABLE public.student_work ENABLE TRIGGER student_work_ai_feedback_divert`);
  ok("with the trigger gone the column still cannot hold text (CHECK)", /student_work_ai_feedback_is_retired/.test(err3 ?? ""), err3 ?? "written");
}

console.log("=== review N-3: who wrote a draft, and no draft on reviewed work ===");
{
  eq("the old function's diverted write is labelled as the service role's", (await one(`SELECT source, generated_by FROM public.student_work_ai_drafts WHERE work_id = $1`, [waiting])), { source: "service_role_write", generated_by: null });
  const w2 = await ins("needs_review", null, null);
  await as(U.teacher, "teacher", () => db.query(`UPDATE public.student_work SET ai_feedback = 'TEACHER VIA COLUMN' WHERE id = $1`, [w2]));
  eq("a teacher writing the old column through the staff policy: a draft labelled as theirs", await one(`SELECT feedback, source, generated_by FROM public.student_work_ai_drafts WHERE work_id = $1`, [w2]),
    { feedback: "TEACHER VIA COLUMN", source: "staff_write", generated_by: U.teacher });
  const w3 = await ins("needs_review", null, null);
  const err = await tryAs(U.teacher, "teacher", () => db.query(
    `UPDATE public.student_work SET status = 'approved', approved_by = $2, approved_at = now(), ai_feedback = 'SAME STATEMENT' WHERE id = $1`, [w3, U.teacher]));
  ok("approving and setting an AI text in one statement is refused", /being reviewed/.test(err ?? ""), err ?? "accepted");
  eq("  and leaves no draft, and the work as it was", [
    (await one(`SELECT count(*)::int c FROM public.student_work_ai_drafts WHERE work_id = $1`, [w3])).c,
    (await one(`SELECT status FROM public.student_work WHERE id = $1`, [w3])).status], [0, "needs_review"]);
  const kid2 = await tryAs(U.child, "student", () => db.query(`UPDATE public.student_work SET ai_feedback = 'KID' WHERE id = $1`, [w3]));
  eq("a child's update writes nothing (no update policy reaches the row)", [kid2, (await one(`SELECT count(*)::int c FROM public.student_work_ai_drafts WHERE work_id = $1`, [w3])).c], [null, 0]);
  eq("  and the helper says no to a child", (await as(U.child, "student", () => db.query(`SELECT public.student_work_draft_staff_can($1) b`, [w3]))).rows[0].b, false);
  for (const q of [`INSERT INTO public.student_work_ai_drafts (work_id, feedback) VALUES ('${w3}', 'x')`, `DELETE FROM public.student_work_ai_drafts`, `UPDATE public.student_work_ai_drafts SET feedback = 'y'`]) {
    const e = await tryAs(U.admin, "admin", () => db.query(q));
    ok(`even an admin cannot write drafts directly: ${q.split(" ")[0]}`, /permission denied/.test(e ?? ""), e ?? "allowed");
  }
  eq("the moved rows keep their origin", (await one(`SELECT count(*)::int c FROM public.student_work_ai_drafts WHERE source = 'moved_from_student_work'`)).c, 4);
}

console.log("=== the teacher approves: one click, the draft becomes what the child reads ===");
{
  // TeacherSmartUpload's "Approve & publish" with the box untouched.
  const draft = (await one(`SELECT feedback FROM public.student_work_ai_drafts WHERE work_id = $1`, [waiting])).feedback;
  await as(U.teacher, "teacher", () => db.query(
    `UPDATE public.student_work SET status = 'approved', teacher_notes = $2, approved_by = $3, approved_at = now() WHERE id = $1`, [waiting, draft, U.teacher]));
  const r = await as(U.child, "student", () => db.query(`SELECT teacher_notes, ai_feedback FROM public.student_work WHERE id = $1`, [waiting]));
  eq("the child now reads the approved note", [r.rows[0].teacher_notes, r.rows[0].ai_feedback], ["OLD FN DRAFT", null]);
  const err = await tryAs(null, null, () => db.query(`UPDATE public.student_work_ai_drafts SET feedback = 'regenerated' WHERE work_id = $1`, [waiting]), "service_role");
  ok("and the draft can no longer be regenerated", /has been reviewed/.test(err ?? ""), err ?? "written");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
