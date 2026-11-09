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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
