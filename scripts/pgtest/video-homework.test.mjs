// Video homework: who may see, submit, approve - and what approval writes.
//
// Drives supabase/migrations/20261109090000_video_homework.sql (after the
// homework grading migration it builds on) against an in-process Postgres.
//
// The assertions that matter most are the privacy ones: a child or parent
// never sees the AI's draft, a classmate never sees a score, and a family
// cannot approve its own homework. Then that approving twice replaces what
// the first approval wrote instead of paying or logging it twice.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');

  CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    default_teacher_user uuid);
  CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    linked_user_id uuid);
  CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id),
    end_date date);
  CREATE TABLE public.homeworks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text,
    due_date date,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.homework_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'submitted',
    grade text, teacher_feedback text, graded_at timestamptz, submitted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    homework_id uuid REFERENCES public.homeworks(id) ON DELETE CASCADE,
    homework_title text, session_id uuid, notes text,
    points integer NOT NULL, type text NOT NULL,
    date date NOT NULL, month text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    CONSTRAINT point_transactions_type_check CHECK (type IN
      ('homework','participation','adjustment','correction','reading_theory','vocabulary_quiz')));
  CREATE TABLE public.student_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0,
    participation_points integer NOT NULL DEFAULT 0,
    reading_theory_points integer NOT NULL DEFAULT 0,
    vocabulary_quiz_points integer NOT NULL DEFAULT 0,
    total_points integer GENERATED ALWAYS AS
      (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, class_id, month));
  CREATE FUNCTION public.update_student_points_from_transaction() RETURNS trigger
  LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;
  CREATE TRIGGER trigger_update_points_from_transaction
    AFTER INSERT OR UPDATE ON public.point_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_student_points_from_transaction();

  -- As in 20260712090000.
  CREATE TABLE public.student_error_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    source text NOT NULL DEFAULT 'live_flag'
      CHECK (source IN ('transcript', 'student_work', 'live_flag', 'homework', 'vocab')),
    source_id uuid, error_text text NOT NULL, corrected_text text,
    error_type text NOT NULL DEFAULT 'grammar'
      CHECK (error_type IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')),
    cefr_topic text, severity smallint NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
    notes text, resolved boolean NOT NULL DEFAULT false, created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.srs_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'error' CHECK (source IN ('error', 'vocab')),
    error_log_id uuid REFERENCES public.student_error_log(id) ON DELETE CASCADE,
    front text NOT NULL, back text NOT NULL, hint text);
  CREATE TABLE public.skill_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id uuid,
    skill text NOT NULL CHECK (skill = ANY (ARRAY['reading','writing','listening','speaking','teamwork','personal','focus'])),
    score integer NOT NULL CHECK (score >= 0 AND score <= 100),
    teacher_comment text, date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(), created_by uuid);
  CREATE TABLE public.cefr_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    source text NOT NULL DEFAULT 'manual'
      CHECK (source IN ('ai_report', 'transcript', 'manual', 'vocab_analysis', 'exam')),
    level text NOT NULL CHECK (level IN ('Pre-A1','A1','A1+','A2','A2+','B1','B1+','B2','B2+','C1','C2')),
    level_score numeric NOT NULL, sub_scores jsonb, confidence numeric, evidence text,
    assessed_at date NOT NULL DEFAULT CURRENT_DATE, created_by uuid, source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now());

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c
                       WHERE c.id = is_teacher_of_class.class_id
                         AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;
  -- The real one also covers the family's primary login and a second
  -- login; the linked login is enough to prove the policies consult it.
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.students s
                       WHERE s.id = can_view_student.student_id
                         AND s.linked_user_id = can_view_student.user_id) $f$;

  GRANT USAGE ON SCHEMA storage TO authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(sql());
ok("applies", true);
{
  let again = null;
  try { await db.exec(sql()); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}

const one = async (q, p) => (await db.query(q, p)).rows[0];
const U = {
  teacher: "11111111-1111-1111-1111-111111111111",
  otherTeacher: "22222222-2222-2222-2222-222222222222",
  minhLogin: "33333333-3333-3333-3333-333333333333",
  anLogin: "44444444-4444-4444-4444-444444444444",
  outsider: "55555555-5555-5555-5555-555555555555",
};
await db.query(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [Object.values(U)]);

const cls = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Stars', $1) RETURNING id`, [U.teacher])).id;
const otherCls = (await one(`INSERT INTO public.classes (name, default_teacher_user) VALUES ('Moons', $1) RETURNING id`, [U.otherTeacher])).id;
const minh = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Nguyễn Văn Minh', $1) RETURNING id`, [U.minhLogin])).id;
const an = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Trần Thị An', $1) RETURNING id`, [U.anLogin])).id;
const stranger = (await one(`INSERT INTO public.students (full_name, linked_user_id) VALUES ('Lê Bảo', $1) RETURNING id`, [U.outsider])).id;
await db.query(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$3), ($2,$3)`, [minh, an, cls]);
await db.query(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [stranger, otherCls]);

const vlog = (await one(`INSERT INTO public.homeworks (class_id, title, body, due_date, submission_type)
                         VALUES ($1, 'My weekend vlog', 'Show us your weekend', '2026-11-14', 'video') RETURNING id`, [cls])).id;
const essay = (await one(`INSERT INTO public.homeworks (class_id, title, due_date)
                          VALUES ($1, 'Essay', '2026-11-14') RETURNING id`, [cls])).id;

/** Run fn as a signed-in user, inside a transaction that is always rolled back
 *  unless keep is set. */
async function as(uid, role, fn, keep = true) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try {
    const out = await fn();
    await db.exec(keep ? "COMMIT" : "ROLLBACK");
    return out;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
const tryAs = async (uid, role, fn) => { try { await as(uid, role, fn); return null; } catch (e) { return e.message; } };

const path = (s, h, f = "video.webm") => `${s}/${h}/1731000000/${f}`;

// ------------------------------------------------------------- submitting
console.log("=== a child submits ===");
await as(U.minhLogin, "student", () => db.query(
  `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path, audio_path, frame_paths, status, pronunciation)
   VALUES ($1, $2, $3, $4, $5, ARRAY[$6], 'approved', '{"accuracy":80}')`,
  [vlog, minh, otherCls, path(minh, vlog), path(minh, vlog, "audio.webm"), path(minh, vlog, "frame-1.jpg")]));
{
  const v = await one(`SELECT status, class_id, attempt FROM public.video_submissions WHERE student_id=$1`, [minh]);
  eq("a child who sends status 'approved' gets 'uploaded'", v.status, "uploaded");
  eq("  and the class comes from the homework, not the request", v.class_id, cls);
}
{
  const err = await tryAs(U.minhLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,'x')`,
    [essay, minh, cls]));
  ok("a non-video homework takes no video", /not a video homework/.test(err ?? ""), err ?? "accepted");
}
{
  const err = await tryAs(U.anLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,'x')`,
    [vlog, minh, cls]));
  ok("a classmate cannot submit for another child", err !== null, err ?? "accepted");
}
await as(U.minhLogin, "student", () => db.query(
  `UPDATE public.video_submissions SET status='approved', pronunciation='{"accuracy":82}' WHERE student_id=$1`, [minh]));
{
  const v = await one(`SELECT status, pronunciation FROM public.video_submissions WHERE student_id=$1`, [minh]);
  eq("a child cannot move the status", v.status, "uploaded");
  eq("  but can add pronunciation results before the analysis", v.pronunciation, { accuracy: 82 });
}

// ------------------------------------------------- the pipeline's draft
const vs = (await one(`SELECT id FROM public.video_submissions WHERE student_id=$1`, [minh])).id;
// The edge function runs as the service role: no auth.uid().
await db.query(`UPDATE public.video_submissions SET status='ready_for_review' WHERE id=$1`, [vs]);
await db.query(`INSERT INTO public.video_analyses
  (video_submission_id, transcript, criteria_scores, overall_score, suggested_grade,
   feedback_student, feedback_parent, cefr_estimate, confidence, gaps)
  VALUES ($1, 'On Saturday I go to the park.',
          '[{"key":"task","label":"Did the task","score":3,"max":4,"comment":"Clear","evidence":[{"t":4,"quote":"I go to the park"}]}]',
          78, 'Amazing', 'AI DRAFT for the child', 'AI DRAFT for the parent', 'A2', 0.7,
          '[{"error_type":"grammar","error_text":"I go to the park","corrected_text":"I went to the park"}]')`, [vs]);

console.log("=== nobody outside staff sees the draft ===");
eq("the child reads no analysis rows",
  (await as(U.minhLogin, "student", () => db.query(`SELECT * FROM public.video_analyses`))).rows.length, 0);
eq("the teacher reads the draft",
  (await as(U.teacher, "teacher", () => db.query(`SELECT * FROM public.video_analyses`))).rows.length, 1);
eq("another class's teacher reads nothing",
  (await as(U.otherTeacher, "teacher", () => db.query(`SELECT * FROM public.video_analyses`))).rows.length, 0);
eq("a classmate cannot read the submission row",
  (await as(U.anLogin, "student", () => db.query(`SELECT * FROM public.video_submissions WHERE student_id=$1`, [minh]))).rows.length, 0);
{
  const r = (await as(U.minhLogin, "student", () => db.query(
    `SELECT public.get_video_homework_for_student($1,$2) j`, [vlog, minh]))).rows[0].j;
  eq("the child's view says it is with the teacher", r.submission.status, "with_teacher");
  eq("  and has no report yet", r.report, null);
}
{
  const err = await tryAs(U.anLogin, "student", () => db.query(
    `SELECT public.get_video_homework_for_student($1,$2)`, [vlog, minh]));
  ok("a classmate cannot read another child's report", /Access denied/.test(err ?? ""), err ?? "allowed");
}

// --------------------------------------------------------------- approval
console.log("=== approval ===");
const approve = (uid, score, gaps) => as(uid, "teacher", () => db.query(
  `SELECT public.approve_video_feedback($1, $2, 'Amazing', 'Great vlog, Minh!', 'Con làm rất tốt', $3::jsonb) j`,
  [vs, score, JSON.stringify(gaps)]));
{
  const err = await tryAs(U.minhLogin, "student", () => db.query(
    `SELECT public.approve_video_feedback($1, 100, 'Superstar', 'me', NULL, '[]')`, [vs]));
  ok("a child cannot approve their own video", /Only a teacher/.test(err ?? ""), err ?? "approved");
  const err2 = await tryAs(U.otherTeacher, "teacher", () => db.query(
    `SELECT public.approve_video_feedback($1, 50, 'Good Try', 'x', NULL, '[]')`, [vs]));
  ok("nor can another class's teacher", /Only a teacher/.test(err2 ?? ""), err2 ?? "approved");
}
await approve(U.teacher, 82, [
  { error_type: "grammar", error_text: "I go to the park", corrected_text: "I went to the park", cefr_topic: "past simple", severity: 2 },
  { error_type: "pronunciation", error_text: "weekend", corrected_text: "WEEK-end" },
]);
{
  const sub = await one(`SELECT status, grade, teacher_feedback FROM public.homework_submissions WHERE student_id=$1 AND homework_id=$2`, [minh, vlog]);
  eq("the homework is graded", sub.status, "graded");
  eq("  with the teacher's words, not the AI draft", sub.teacher_feedback, "Great vlog, Minh!");
  const pts = await one(`SELECT points FROM public.point_transactions WHERE student_id=$1 AND homework_id=$2`, [minh, vlog]);
  eq("points equal the approved score", pts.points, 82);
  eq("two gaps logged", (await one(`SELECT count(*)::int c FROM public.student_error_log WHERE source_id=$1`, [vs])).c, 2);
  eq("  each with a practice card", (await one(`SELECT count(*)::int c FROM public.srs_cards WHERE student_id=$1`, [minh])).c, 2);
  eq("a speaking score", (await one(`SELECT score FROM public.skill_assessments WHERE student_id=$1 AND skill='speaking'`, [minh])).score, 82);
  eq("a CEFR point", (await one(`SELECT level FROM public.cefr_assessments WHERE student_id=$1`, [minh])).level, "A2");
  eq("the submission is approved", (await one(`SELECT status FROM public.video_submissions WHERE id=$1`, [vs])).status, "approved");
}

console.log("=== approving again replaces, never adds ===");
await approve(U.teacher, 90, [{ error_type: "grammar", error_text: "I go to the park", corrected_text: "I went to the park" }]);
{
  eq("one point award, at the new score",
    (await db.query(`SELECT points FROM public.point_transactions WHERE student_id=$1 AND homework_id=$2`, [minh, vlog])).rows.map((r) => r.points), [90]);
  eq("one gap now", (await one(`SELECT count(*)::int c FROM public.student_error_log WHERE source_id=$1`, [vs])).c, 1);
  eq("  and one card", (await one(`SELECT count(*)::int c FROM public.srs_cards WHERE student_id=$1`, [minh])).c, 1);
  eq("one speaking score", (await one(`SELECT count(*)::int c FROM public.skill_assessments WHERE student_id=$1`, [minh])).c, 1);
  eq("one CEFR point", (await one(`SELECT count(*)::int c FROM public.cefr_assessments WHERE student_id=$1`, [minh])).c, 1);
}
{
  const r = (await as(U.minhLogin, "student", () => db.query(
    `SELECT public.get_video_homework_for_student($1,$2) j`, [vlog, minh]))).rows[0].j;
  eq("the child now sees the teacher's feedback", r.report.feedback, "Great vlog, Minh!");
  eq("  and the parent note", r.report.parent_note, "Con làm rất tốt");
  ok("  and never the AI draft", !JSON.stringify(r).includes("AI DRAFT"));
  const p = (await as(U.minhLogin, "student", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
  eq("progress lists the approved video", p.videos.map((x) => x.score), [90]);
}

// ----------------------------------------------------------------- wall
console.log("=== the class wall ===");
{
  const wall = (await as(U.anLogin, "student", () => db.query(`SELECT public.get_class_video_wall($1, $2) j`, [cls, an]))).rows[0].j;
  eq("a classmate sees Minh's video", wall.length, 1);
  eq("  under the given name only", wall[0].student_name, "Minh");
  ok("  with no score anywhere in it", !/score|grade|feedback/.test(JSON.stringify(wall)), JSON.stringify(wall));
  const err = await tryAs(U.outsider, "student", () => db.query(`SELECT public.get_class_video_wall($1, $2)`, [cls, stranger]));
  ok("a child from another class cannot open it", /Access denied/.test(err ?? ""), err ?? "allowed");
  const hearted = (await as(U.anLogin, "student", () => db.query(`SELECT public.toggle_video_heart($1,$2) j`, [vs, an]))).rows[0].j;
  eq("a classmate can heart it", hearted, true);
  const again = (await as(U.anLogin, "student", () => db.query(`SELECT public.toggle_video_heart($1,$2) j`, [vs, an]))).rows[0].j;
  eq("  and un-heart it", again, false);
}

console.log("=== storage ===");
const canView = (uid, role, p) => as(uid, role, async () => (await db.query(`SELECT public.can_view_homework_video($1) j`, [p])).rows[0].j);
const canUpload = (uid, role, p) => as(uid, role, async () => (await db.query(`SELECT public.can_upload_homework_video($1) j`, [p])).rows[0].j);
eq("the child reads their own audio", await canView(U.minhLogin, "student", path(minh, vlog, "audio.webm")), true);
eq("a classmate reads the approved, shared video", await canView(U.anLogin, "student", path(minh, vlog)), true);
eq("  and its poster frame", await canView(U.anLogin, "student", path(minh, vlog, "frame-1.jpg")), true);
eq("  but not the separate audio track", await canView(U.anLogin, "student", path(minh, vlog, "audio.webm")), false);
eq("another class's child reads nothing", await canView(U.outsider, "student", path(minh, vlog)), false);
eq("a malformed path is a no, not an error", await canView(U.anLogin, "student", "../../etc/passwd"), false);
eq("a child may upload to their own folder", await canUpload(U.anLogin, "student", path(an, vlog)), true);
eq("  not to a classmate's", await canUpload(U.anLogin, "student", path(minh, vlog)), false);
eq("  and not for a written homework", await canUpload(U.anLogin, "student", path(an, essay)), false);
await db.query(`UPDATE public.video_submissions SET share_with_class=false WHERE id=$1`, [vs]);
eq("once Minh stops sharing, a classmate cannot read it", await canView(U.anLogin, "student", path(minh, vlog)), false);
await db.query(`UPDATE public.video_submissions SET share_with_class=true WHERE id=$1`, [vs]);

// --------------------------------------------------------------- re-record
console.log("=== re-recording ===");
{
  const err = await tryAs(U.minhLogin, "student", () => db.query(
    `UPDATE public.video_submissions SET video_path=$2 WHERE id=$1`, [vs, path(minh, vlog, "v2.webm")]));
  ok("an approved video cannot be replaced by the family", /already been approved/.test(err ?? ""), err ?? "replaced");
}
{
  // An's take, sent back by the teacher, then recorded again.
  await as(U.anLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,$4)`,
    [vlog, an, cls, path(an, vlog)]));
  const anVs = (await one(`SELECT id FROM public.video_submissions WHERE student_id=$1`, [an])).id;
  await db.query(`INSERT INTO public.video_analyses (video_submission_id, overall_score) VALUES ($1, 40)`, [anVs]);
  await as(U.teacher, "teacher", () => db.query(`SELECT public.return_video_for_rerecord($1, 'The sound was too quiet - try again near the phone!')`, [anVs]));
  const r = (await as(U.anLogin, "student", () => db.query(`SELECT public.get_video_homework_for_student($1,$2) j`, [vlog, an]))).rows[0].j;
  eq("the child sees the teacher's note", r.submission.teacher_note, "The sound was too quiet - try again near the phone!");
  await as(U.anLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,$4)
     ON CONFLICT (homework_id, student_id) DO UPDATE SET video_path = EXCLUDED.video_path`,
    [vlog, an, cls, path(an, vlog, "v2.webm")]));
  const v = await one(`SELECT status, attempt, teacher_note FROM public.video_submissions WHERE id=$1`, [anVs]);
  eq("the upsert re-record starts again", v.status, "uploaded");
  eq("  as attempt 2", v.attempt, 2);
  eq("  and the old analysis is gone", (await one(`SELECT count(*)::int c FROM public.video_analyses WHERE video_submission_id=$1`, [anVs])).c, 0);
}

// ------------------------------------------- N-7: families read final only
// Runs only when 20261117160100 is in the list (run.mjs passes it).
const hasN7 = MIGS.some((f) => f.includes("20261117160100"));
const hasClaim = MIGS.some((f) => f.includes("20261117160200"));
if (hasN7) {
  console.log("=== N-7: a family reads only what the teacher approved ===");
  // Minh's approved video: the teacher's scores were saved (score 3 on
  // "task") and approved above. Now the model's words sit beside them.
  await db.query(`UPDATE public.video_analyses
     SET strengths = '["AI STRENGTH"]', focus_points = '["AI FOCUS"]' WHERE video_submission_id = $1`, [vs]);
  const famProgress = async () => (await as(U.minhLogin, "student", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
  const famReport = async () => (await as(U.minhLogin, "student", () => db.query(`SELECT public.get_video_homework_for_student($1,$2) j`, [vlog, minh]))).rows[0].j;
  {
    const p = await famProgress();
    eq("the family's progress shows the teacher's per-criterion score as approved", p.videos[0].criteria.map((c) => [Object.keys(c).sort(), c.key, c.label, c.score, c.max]), [[["key", "label", "max", "score"], "task", "Did the task", 3, 4]]);
    eq("  and the teacher's final score", p.videos[0].score, 90);
    const r = await famReport();
    eq("the family's report: the teacher's scores, no comment, no evidence", r.report.criteria.map((c) => [Object.keys(c).sort(), c.label, c.score, c.max]), [[["label", "max", "score"], "Did the task", 3, 4]]);
    eq("  no model strengths or focus points (no teacher approved them)", [r.report.strengths, r.report.focus_points], [[], []]);
    ok("  nothing the model wrote anywhere in either", !/AI STRENGTH|AI FOCUS|"Clear"|evidence|quote/.test(JSON.stringify([p, r])), JSON.stringify([p, r]));
  }
  // The model writes criteria_scores again after the approval (a re-run,
  // or the column edited): the family's view must not move.
  await db.query(`UPDATE public.video_analyses
     SET criteria_scores = '[{"key":"task","label":"Did the task","score":4,"max":4,"comment":"AI LATE","evidence":[{"t":1,"quote":"x"}]}]'
   WHERE video_submission_id = $1`, [vs]);
  {
    const p = await famProgress();
    eq("after the model overwrites its draft, the family still sees the approved 3", p.videos[0].criteria.map((c) => c.score), [3]);
    ok("  and none of the late text", !JSON.stringify(p).includes("AI LATE"));
    const r = await famReport();
    eq("  in the report too", r.report.criteria.map((c) => c.score), [3]);
  }
  {
    const p = (await as(U.teacher, "teacher", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
    eq("staff are unchanged: the teacher's progress view reads criteria_scores as before", p.videos[0].criteria.map((c) => [Object.keys(c).sort(), c.score]), [[["key", "label", "max", "score"], 4]]);
    const r = (await as(U.teacher, "teacher", () => db.query(`SELECT public.get_video_homework_for_student($1,$2) j`, [vlog, minh]))).rows[0].j;
    eq("  and the teacher's report view still has the strengths, focus points and comments", [r.report.strengths, r.report.focus_points, r.report.criteria[0].comment], [["AI STRENGTH"], ["AI FOCUS"], "AI LATE"]);
    const admin = (await as(U.otherTeacher, "admin", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
    eq("  an admin too", admin.videos[0].criteria.map((c) => c.score), [4]);
  }
  // The teacher re-approves: the family's view follows the teacher.
  await db.query(`UPDATE public.video_analyses
     SET criteria_scores = '[{"key":"task","label":"Did the task","score":2,"max":4,"comment":"x","evidence":[]}]' WHERE video_submission_id = $1`, [vs]);
  await approve(U.teacher, 70, []);
  {
    const p = await famProgress();
    eq("a re-approval takes the teacher's new scores", [p.videos[0].score, p.videos[0].criteria.map((c) => c.score)], [70, [2]]);
  }
  {
    // An approved analysis with no snapshot (approved before the change and
    // touched since): the family sees no criteria rather than the model's.
    await db.query(`UPDATE public.video_analyses SET final_criteria = NULL WHERE video_submission_id = $1`, [vs]);
    const p = await famProgress();
    eq("an approval with no recorded teacher scores shows no criteria to the family", p.videos[0].criteria, []);
    const r = await famReport();
    eq("  nor in the report", r.report.criteria, []);
    eq("  but the teacher's final score and words still show", [p.videos[0].score, r.report.feedback], [70, "Great vlog, Minh!"]);
  }
  {
    const err = await tryAs(U.anLogin, "student", () => db.query(`SELECT public.get_video_progress($1)`, [minh]));
    ok("a classmate still cannot read another child's progress", /Access denied/.test(err ?? ""), err ?? "allowed");
  }
}

// --------------------------------------------- N-5: the analysis claim
if (hasClaim) {
  console.log("=== N-5: who may start an analysis, and how often ===");
  const vlog2 = (await one(`INSERT INTO public.homeworks (class_id, title, body, due_date, submission_type)
                            VALUES ($1, 'My pet', 'Show us your pet', '2026-11-20', 'video') RETURNING id`, [cls])).id;
  const claim = async (id, staff) => (await one(`SELECT public.video_analysis_claim($1, $2) c`, [id, staff])).c;
  const state = (id) => one(`SELECT status, analysis_runs r, analysis_take_runs t FROM public.video_submissions WHERE id=$1`, [id]);
  // The child's upload, exactly as VideoHomeworkSubmission sends it (an
  // upsert), with counters it has no business setting.
  await as(U.anLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path, analysis_runs, analysis_take_runs)
     VALUES ($1,$2,$3,$4, -50, -50)
     ON CONFLICT (homework_id, student_id) DO UPDATE SET video_path = EXCLUDED.video_path`,
    [vlog2, an, cls, path(an, vlog2)]));
  const pet = (await one(`SELECT id FROM public.video_submissions WHERE homework_id=$1 AND student_id=$2`, [vlog2, an])).id;
  eq("a family's upload starts with no runs counted, whatever it sends", await state(pet), { status: "uploaded", r: 0, t: 0 });
  {
    const err = await tryAs(U.anLogin, "student", () => db.query(`SELECT public.video_analysis_claim($1, true)`, [pet]));
    ok("a family cannot call the claim (service role only)", /permission denied/.test(err ?? ""), err ?? "allowed");
    const err2 = await tryAs(U.teacher, "teacher", () => db.query(`SELECT public.video_analysis_claim($1, true)`, [pet]));
    ok("  nor can a teacher", /permission denied/.test(err2 ?? ""), err2 ?? "allowed");
  }
  eq("the upload's own request: claimed", await claim(pet, false), "claimed");
  eq("  processing, one run counted", await state(pet), { status: "processing", r: 1, t: 1 });
  eq("the family asking again while it runs: with the teacher", await claim(pet, false), "with_teacher");
  eq("a teacher asking while it runs: busy", await claim(pet, true), "busy");
  for (const n of [2, 3]) {
    await db.query(`UPDATE public.video_submissions SET status='failed' WHERE id=$1`, [pet]);
    eq(`after a failure the family may retry (run ${n} of this take)`, await claim(pet, false), "claimed");
  }
  await db.query(`UPDATE public.video_submissions SET status='failed' WHERE id=$1`, [pet]);
  eq("a 4th family run of one take: refused (a failing video is no longer a loop)", await claim(pet, false), "take_limit");
  eq("  the teacher may still retry it", await claim(pet, true), "claimed");
  eq("  counted", await state(pet), { status: "processing", r: 4, t: 4 });
  await db.query(`UPDATE public.video_submissions SET status='ready_for_review' WHERE id=$1`, [pet]);
  eq("a family cannot re-run a draft that is with the teacher", await claim(pet, false), "with_teacher");
  eq("the teacher can ('New draft')", await claim(pet, true), "claimed");
  await db.query(`UPDATE public.video_submissions SET status='ready_for_review' WHERE id=$1`, [pet]);
  await as(U.anLogin, "student", () => db.query(`UPDATE public.video_submissions SET analysis_runs=0, analysis_take_runs=0 WHERE id=$1`, [pet]));
  eq("a family cannot reset the counters", await state(pet), { status: "ready_for_review", r: 5, t: 5 });
  await as(U.teacher, "teacher", () => db.query(`UPDATE public.video_submissions SET analysis_runs=0, analysis_take_runs=0 WHERE id=$1`, [pet]));
  eq("  nor can a teacher through the staff policy", await state(pet), { status: "ready_for_review", r: 5, t: 5 });
  // A re-record: a new take may be analysed, the submission's total stands.
  await as(U.anLogin, "student", () => db.query(
    `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,$4)
     ON CONFLICT (homework_id, student_id) DO UPDATE SET video_path = EXCLUDED.video_path`,
    [vlog2, an, cls, path(an, vlog2, "v2.webm")]));
  eq("a re-record resets this take's count, not the submission's", await state(pet), { status: "uploaded", r: 5, t: 0 });
  eq("  and its upload is analysed", await claim(pet, false), "claimed");
  await db.query(`UPDATE public.video_submissions SET status='failed', analysis_runs=10 WHERE id=$1`, [pet]);
  eq("a submission's 10 runs: no more for the family, across re-records", await claim(pet, false), "total_limit");
  eq("  the teacher still may (up to 20)", await claim(pet, true), "claimed");
  await db.query(`UPDATE public.video_submissions SET status='failed', analysis_runs=20, analysis_take_runs=0 WHERE id=$1`, [pet]);
  eq("  and then not", await claim(pet, true), "total_limit");
  eq("an approved video: nobody", [await claim(vs, false), await claim(vs, true)], ["approved", "approved"]);
  eq("an unknown id: not found", await claim("99999999-9999-4999-8999-999999999999", true), "not_found");
  {
    // A processing run nobody finished (an instance killed): after 15
    // minutes the teacher may start again.
    await db.query(`ALTER TABLE public.video_submissions DISABLE TRIGGER video_submissions_guard`);
    await db.query(`UPDATE public.video_submissions SET status='processing', analysis_runs=6, analysis_take_runs=1, updated_at = now() - interval '20 minutes' WHERE id=$1`, [pet]);
    await db.query(`ALTER TABLE public.video_submissions ENABLE TRIGGER video_submissions_guard`);
    eq("a run stuck in processing for 20 minutes: the teacher may restart it", await claim(pet, true), "claimed");
  }

  console.log("=== review M-1: an approval is never undone by a run in flight ===");
  {
    // The reviewer's probe, as assertions: a draft is on screen, the teacher
    // clicks "New draft", then tries to approve the old draft.
    const hw3 = (await one(`INSERT INTO public.homeworks (class_id, title, body, due_date, submission_type) VALUES ($1, 'Probe', 'x', '2026-11-21', 'video') RETURNING id`, [cls])).id;
    await as(U.minhLogin, "student", () => db.query(
      `INSERT INTO public.video_submissions (homework_id, student_id, class_id, video_path) VALUES ($1,$2,$3,$4)`, [hw3, minh, cls, path(minh, hw3)]));
    const id = (await one(`SELECT id FROM public.video_submissions WHERE homework_id=$1`, [hw3])).id;
    eq("the family's first claim", await claim(id, false), "claimed");
    await db.query(`INSERT INTO public.video_analyses (video_submission_id, criteria_scores, strengths) VALUES ($1, '[{"key":"a","label":"A","score":1,"max":4,"comment":"MODEL 1"}]', '["MODEL STRENGTH"]')`, [id]);
    await db.query(`UPDATE public.video_submissions SET status='ready_for_review' WHERE id=$1 AND status='processing'`, [id]);
    eq("the teacher's New draft", await claim(id, true), "claimed");
    const pointsBefore = (await one(`SELECT count(*)::int c FROM public.point_transactions WHERE homework_id=$1`, [hw3])).c;
    const err = await tryAs(U.teacher, "teacher", () => db.query(`SELECT public.approve_video_feedback($1, 75, 'B', 'Teacher words', null, '[]'::jsonb, true)`, [id]));
    ok("approving while the new draft is being made is refused, with a reason", /new AI draft is being made/.test(err ?? ""), err ?? "approved");
    eq("  nothing of the approval stays: still processing, no points, no grade", [
      (await state(id)).status,
      (await one(`SELECT count(*)::int c FROM public.point_transactions WHERE homework_id=$1`, [hw3])).c - pointsBefore,
      (await one(`SELECT approved_at FROM public.video_analyses WHERE video_submission_id=$1`, [id])).approved_at,
    ], ["processing", 0, null]);
    // The run finishes; the teacher approves the new draft.
    await db.query(`UPDATE public.video_submissions SET status='ready_for_review' WHERE id=$1 AND status='processing'`, [id]);
    await as(U.teacher, "teacher", () => db.query(`SELECT public.approve_video_feedback($1, 75, 'B', 'Teacher words', null, '[]'::jsonb, false)`, [id]));
    eq("once it is ready the approval goes through", (await state(id)).status, "approved");
    // The function's outcome writes are conditional on its run (ai-gate
    // drives them); the same condition, here, against an approved row:
    const late = await db.query(`UPDATE public.video_submissions SET status='failed' WHERE id=$1 AND status='processing'`, [id]);
    eq("a late failure of an earlier run changes nothing", [late.affectedRows ?? 0, (await state(id)).status], [0, "approved"]);
    eq("the family cannot claim a run on the approved video", await claim(id, false), "approved");
    eq("  nor the teacher", await claim(id, true), "approved");
    const fam = (await as(U.minhLogin, "student", () => db.query(`SELECT public.get_video_homework_for_student($1,$2) j`, [hw3, minh]))).rows[0].j;
    eq("and the family keeps its report", fam.report?.feedback, "Teacher words");
    // A run stuck 20 minutes no longer holds an approval up.
    await db.query(`ALTER TABLE public.video_submissions DISABLE TRIGGER video_submissions_guard`);
    await db.query(`UPDATE public.video_submissions SET status='processing', updated_at = now() - interval '20 minutes' WHERE id=$1`, [pet]);
    await db.query(`ALTER TABLE public.video_submissions ENABLE TRIGGER video_submissions_guard`);
    const stuckErr = await tryAs(U.teacher, "teacher", () => db.query(`SELECT public.approve_video_feedback($1, 60, 'C', 'Graded by hand', null, '[]'::jsonb, false)`, [pet]));
    eq("a teacher may grade a video whose draft has been stuck for 20 minutes", [stuckErr, (await state(pet)).status], [null, "approved"]);
  }

  if (hasN7) {
    console.log("=== review N-10: staff of the video's class only ===");
    // Minh once sat in otherTeacher's class: that teacher reaches the
    // function, but not this class's videos.
    await db.query(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1, $2, '2026-09-30')`, [minh, otherCls]);
    const p = (await as(U.otherTeacher, "teacher", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
    eq("a teacher of another class the child was in sees none of this class's videos", p.videos, []);
    const mine = (await as(U.teacher, "teacher", () => db.query(`SELECT public.get_video_progress($1) j`, [minh]))).rows[0].j;
    ok("the class's own teacher still sees them, as before", mine.videos.length >= 1 && mine.videos.every((x) => Array.isArray(x.criteria)), JSON.stringify(mine).slice(0, 300));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
