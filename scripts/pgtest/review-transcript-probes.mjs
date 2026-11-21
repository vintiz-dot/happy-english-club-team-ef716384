// D-26: the transcript analysis writes staff-only DRAFTS; only a teacher's
// approval publishes, and only the teacher's own choices.
//
//   node scripts/pgtest/run.mjs   (or this file with the three migrations)
//
// Part 1 drives the REAL migration against an in-process Postgres:
//   20261111110000  the real is_teacher_of_class (TAs included),
//   20261113140000  the staff policies production has on cefr_assessments
//                   and student_error_log,
//   20261117100000  the fix, pasted twice.
// The other policies on these tables (admin, the child's own read, the
// family's read) are production's, copied from the migrations that made
// them (20260712090000, 20260718090000, 20260722090000, 20260730130000).
//
// Part 2 bundles the REAL analyze-transcript (remote imports stubbed, its
// ../_lib imports real), drives it with requests against an in-memory
// stand-in for Supabase and a scripted OpenAI, then loads the drafts it wrote
// into the Postgres of part 1 and approves them as a teacher would.
//
// Part 3 is the screen's reasoning (src/lib/transcriptReview.ts) and the
// suggestion rule (supabase/functions/_lib/speaker-suggestion.ts).
import { PGlite } from "@electric-sql/pglite";
import { build, transform } from "esbuild";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const STAFF_MIG = MIGS.find((f) => f.includes("20261113140000"));
const FIX_MIG = MIGS.find((f) => f.includes("20261117100000"));
if (!TA_MIG || !STAFF_MIG || !FIX_MIG) {
  console.log("usage: transcript-drafts.test.mjs <20261111110000_...sql> <20261113140000_...sql> <20261117100000_transcript_analysis_drafts.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
async function loadTs(rel) {
  const out = resolve(tmpdir(), `td.${rel.replace(/[^a-z]/gi, "_")}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
let reviewMod = null;
async function loadReview() { return (reviewMod ??= await loadTs("src/lib/transcriptReview.ts")); }

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 400) : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// =================================================================== part 1
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:00', status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    participant_type text NOT NULL DEFAULT 'teaching_assistant', teaching_assistant_id uuid REFERENCES public.teaching_assistants(id),
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, family_id uuid, linked_user_id uuid, secondary_user_id uuid, date_of_birth date);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id), start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  -- 20261113140000 also guards these three; production's shape.
  CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, uploaded_by uuid NOT NULL,
    status text NOT NULL DEFAULT 'processing', external_url text, member_student_ids uuid[] NOT NULL DEFAULT '{}');
  CREATE TABLE public.student_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid, generated_by uuid NOT NULL,
    published boolean NOT NULL DEFAULT false);
  CREATE TABLE public.resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, external_url text, thumbnail_url text, uploaded_by uuid NOT NULL);

  -- The transcript tables, as 20260712090000 / 20260717090000 / 20260718090000 /
  -- 20260721090000 / 20260722090000 made them.
  CREATE TABLE public.class_transcripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL, uploaded_by uuid NOT NULL, title text,
    transcript_date date NOT NULL DEFAULT CURRENT_DATE, source_format text NOT NULL DEFAULT 'txt', raw_text text NOT NULL,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'analyzed', 'failed')),
    summary text, analysis jsonb, error_message text, analyzed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
    title_covered boolean, title_evidence jsonb, title_note text, lesson_context text, processing_stage text, processing_started_at timestamptz,
    audio_storage_path text, audio_mime_type text);
  CREATE TABLE public.transcript_speaker_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    speaker_label text NOT NULL, is_teacher boolean NOT NULL DEFAULT false, utterance_count int NOT NULL DEFAULT 0, word_count int NOT NULL DEFAULT 0,
    avg_utterance_length numeric, questions_asked int NOT NULL DEFAULT 0, participation_share numeric, vocabulary_richness numeric,
    errors_count int NOT NULL DEFAULT 0, cefr_estimate text, highlights jsonb, created_at timestamptz NOT NULL DEFAULT now(),
    contribution text, teacher_feedback text, recommendation text, edited_by_teacher boolean NOT NULL DEFAULT false);
  CREATE TABLE public.student_error_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    source text NOT NULL DEFAULT 'live_flag' CHECK (source IN ('transcript', 'student_work', 'live_flag', 'homework', 'vocab')),
    source_id uuid, error_text text NOT NULL, corrected_text text,
    error_type text NOT NULL DEFAULT 'grammar' CHECK (error_type IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')),
    cefr_topic text, severity smallint NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3), notes text, resolved boolean NOT NULL DEFAULT false,
    created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.srs_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'error', error_log_id uuid REFERENCES public.student_error_log(id) ON DELETE CASCADE,
    front text NOT NULL, back text NOT NULL, hint text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, error_log_id));
  CREATE TABLE public.cefr_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL, source text NOT NULL DEFAULT 'manual',
    level text NOT NULL CHECK (level IN ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
    level_score numeric NOT NULL, sub_scores jsonb, confidence numeric, evidence text, assessed_at date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid, source_id uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.lesson_overviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid UNIQUE REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, lesson_date date NOT NULL, title text, summary text,
    materials jsonb NOT NULL DEFAULT '[]'::jsonb, homework text, created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(), edited_by_teacher boolean NOT NULL DEFAULT false);
  CREATE TABLE public.class_speaker_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    speaker_label text NOT NULL, student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (class_id, speaker_label));
`;
const LIVE = `
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.linked_user_id = user_id OR s.secondary_user_id = user_id
      OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = s.family_id AND f.primary_user_id = user_id)));
  $function$;
  CREATE FUNCTION public.is_linked_student(_user_id uuid, _student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id AND s.linked_user_id = _user_id);
  $function$;
  CREATE FUNCTION public.can_view_student_in_class(_student_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = _student_id AND e.end_date IS NULL AND public.is_teacher_of_class(_user_id, e.class_id));
  $function$;
  CREATE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id
                    WHERE s.linked_user_id = _user_id AND e.class_id = _class_id AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE));
  $function$;
  DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['students','enrollments','class_transcripts','transcript_speaker_metrics','student_error_log','srs_cards',
                             'cefr_assessments','lesson_overviews','class_speaker_aliases','student_work','student_reports','resources'] LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP; END $$;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
  CREATE POLICY students_own ON public.students FOR SELECT TO authenticated
    USING (can_view_student(id, auth.uid()) OR can_view_student_in_class(id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY enrollments_read ON public.enrollments FOR SELECT TO authenticated USING (true);

  -- 20260712090000
  CREATE POLICY "admins_all_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "admins_all_tsm" ON public.transcript_speaker_metrics FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_read_class_tsm" ON public.transcript_speaker_metrics FOR SELECT TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "students_read_own_tsm" ON public.transcript_speaker_metrics FOR SELECT TO authenticated
    USING (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_error_log" ON public.student_error_log FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_error_log" ON public.student_error_log FOR ALL TO authenticated
    USING (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)))
    WITH CHECK (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));
  CREATE POLICY "students_read_own_errors" ON public.student_error_log FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_srs" ON public.srs_cards FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "students_manage_own_srs" ON public.srs_cards FOR ALL TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id)) WITH CHECK (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_cefr" ON public.cefr_assessments FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_cefr" ON public.cefr_assessments FOR ALL TO authenticated
    USING (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)))
    WITH CHECK (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));
  CREATE POLICY "students_read_own_cefr" ON public.cefr_assessments FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  -- 20260718090000
  CREATE POLICY "admins_all_lesson_overviews" ON public.lesson_overviews FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_lesson_overviews" ON public.lesson_overviews FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "students_read_class_lesson_overviews" ON public.lesson_overviews FOR SELECT TO authenticated
    USING (public.is_enrolled_in_class(auth.uid(), class_id));
  -- 20260721090000
  CREATE POLICY "admins_all_speaker_aliases" ON public.class_speaker_aliases FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_speaker_aliases" ON public.class_speaker_aliases FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  -- 20260722090000
  CREATE POLICY "teachers_update_class_tsm" ON public.transcript_speaker_metrics FOR UPDATE TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  -- 20260730130000
  CREATE POLICY "family_read_children_cefr" ON public.cefr_assessments FOR SELECT TO authenticated
    USING (public.can_view_student(student_id, auth.uid()));
  CREATE POLICY "family_read_children_lesson_overviews" ON public.lesson_overviews FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id JOIN public.families f ON f.id = s.family_id
                    WHERE e.class_id = lesson_overviews.class_id AND f.primary_user_id = auth.uid()));
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(LIVE);
await db.exec(readFileSync(STAFF_MIG, "utf8"));
const FIX = readFileSync(FIX_MIG, "utf8");

console.log("=== installing ===");
{
  // A policy the file has never seen on a draft table: refuse, change nothing.
  await db.exec(`CREATE POLICY rogue_class_read ON public.transcript_speaker_metrics FOR SELECT TO authenticated USING (true)`);
  let err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on transcript_speaker_metrics: the paste refuses and names it", /Refusing to install.*rogue_class_read/.test(err ?? ""), err);
  eq("  ...and installs nothing", (await one(`SELECT to_regclass('public.transcript_approvals') IS NULL AS none`)).none, true);
  await db.exec(`DROP POLICY rogue_class_read ON public.transcript_speaker_metrics`);
  await db.exec(`CREATE POLICY rogue_family ON public.class_transcripts FOR SELECT TO authenticated USING (true)`);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on class_transcripts (it holds the draft overview): refused", /Refusing to install.*rogue_family/.test(err ?? ""), err);
  await db.exec(`DROP POLICY rogue_family ON public.class_transcripts`);

  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("the fix installs on production's state", err === null, err);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("and pastes a second time", err === null, err);
}
{
  const grants = await q(`SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS p
                            FROM information_schema.role_table_grants
                           WHERE table_schema = 'public' AND table_name IN ('transcript_speaker_suggestions', 'transcript_approvals')
                           GROUP BY 1, 2 ORDER BY 1, 2`);
  const g = (t, r) => grants.find((x) => x.table_name === t && x.grantee === r)?.p ?? "";
  for (const t of ["transcript_speaker_suggestions", "transcript_approvals"]) {
    ok(`${t}: authenticated holds SELECT, INSERT, UPDATE, DELETE (explicit; 20260712023825 revoked the defaults)`, ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g(t, "authenticated").includes(p)), g(t, "authenticated"));
    ok(`${t}: service_role holds all`, ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g(t, "service_role").includes(p)), g(t, "service_role"));
    eq(`${t}: anon holds nothing`, g(t, "anon"), "");
    const pol = await q(`SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`, [t]);
    eq(`${t}: one policy, a staff SELECT (no family policy, no write policy)`, pol.map((p) => p.cmd), ["SELECT"]);
  }
  const fns = await q(`SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth, p.prosecdef
                         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.proname IN ('approve_transcript_analysis', 'withdraw_transcript_approval') ORDER BY 1`);
  eq("approve / withdraw: SECURITY DEFINER, callable by authenticated, not by anon", fns.map((f) => [f.proname, f.prosecdef, f.auth, f.anon]),
    [["approve_transcript_analysis", true, true, false], ["withdraw_transcript_approval", true, true, false]]);
}

// ---------------------------------------------------------------- people
const mk = async (role) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]); return id; };
const ADMIN = await mk("admin");
const TEA = await mk("teacher"), TEB = await mk("teacher"), TA_ON = await mk("teacher");
const PARENT = await mk("family"), KID = await mk("student"), KIDB = await mk("student"), NOROLE = await mk(null);
const tA = (await one(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Ms Lan') RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Mr Minh') RETURNING id`, [TEB])).id;
const taOn = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_ON])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class B', $1) RETURNING id`, [tB])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [CA, taOn]);
await q(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,'2026-11-16')`, [CA, tA]);
const F1 = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [PARENT])).id;
const kid = async (name, cls, { family = null, linked = null } = {}) => {
  const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id) VALUES ($1,$2,$3) RETURNING id`, [name, family, linked])).id;
  if (cls) await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
// Pseudonyms, as the children use in class (owner's ruling). Two children share "Bao".
const KIKI = await kid("Kiki", CA, { family: F1, linked: KID });
const BAO_T = await kid("Bao Tran", CA, { family: F1 });
const BAO_N = await kid("Bao Ngoc", CA);
const ANH = await kid("Anh", CA);
const B1 = await kid("Lily", CB, { linked: KIDB });

async function as(uid, sql, params = [], { role = "authenticated", keep = false } = {}) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    await db.exec(keep ? "COMMIT" : "ROLLBACK");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { await db.exec("ROLLBACK"); return { rows: [], n: 0, err: e.message }; }
}
const approve = (uid, tr, assignments, { overview = null, replace = false, keep = true } = {}) =>
  as(uid, `SELECT public.approve_transcript_analysis($1, $2::jsonb, $3::jsonb, $4) AS r`, [tr, JSON.stringify(assignments), overview ? JSON.stringify(overview) : null, replace], { keep });
const withdraw = (uid, tr) => as(uid, `SELECT public.withdraw_transcript_approval($1) AS r`, [tr], { keep: true });

// A drafted lesson, written as the analysis writes it: service role, no child linked.
async function draftLesson(cls, { title = "Past simple", date = "2026-11-16" } = {}) {
  const T = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, overview_draft, analyzed_at)
       VALUES ($1,$2,$3,$4,'Teacher: hello','analyzed','We practised the past simple.', $5::jsonb, $6::jsonb, now()) RETURNING id`,
    [cls, TEA, title, date, JSON.stringify({ drafted_for_review: true, materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15" }),
     JSON.stringify({ summary: "We practised the past simple.", materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15", edited_by_teacher: false })])).id;
  const metric = async (label, isTeacher = false) => {
    const r = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, is_teacher, word_count, cefr_estimate, teacher_feedback)
                              VALUES ($1,$2,$3,$4,20,'A2','Well done') RETURNING id`, [T, cls, label, isTeacher], { role: "service_role", keep: true });
    if (r.err) throw new Error(r.err);
    return r.rows[0].id;
  };
  const sug = async (m, key, sid, conf, basis, errors = []) => {
    const r = await as(null, `INSERT INTO public.transcript_speaker_suggestions (metric_id, transcript_id, class_id, speaker_key, suggested_student_id, confidence, basis, draft_errors, cefr_estimate, cefr_confidence, cefr_evidence)
                              VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'A2',0.6,'Used past forms with help')`, [m, T, cls, key, sid, conf, basis, JSON.stringify(errors)], { role: "service_role", keep: true });
    if (r.err) throw new Error(r.err);
  };
  return { T, metric, sug };
}
const ERR1 = { error_text: "I go to the park yesterday", corrected_text: "I went to the park yesterday", error_type: "grammar", cefr_topic: "past simple" };
const ERR2 = { error_text: "I goed", corrected_text: "I went", error_type: "grammar", cefr_topic: "irregular verbs" };

const L1 = await draftLesson(CA);
const mTeacher = await L1.metric("Teacher", true);
const mKiki = await L1.metric("Kiki");
const mBao = await L1.metric("Bao");
const mUnknown = await L1.metric("Unknown");
await L1.sug(mKiki, "kiki", KIKI, "high", "exact_name", [ERR1]);
await L1.sug(mBao, "bao", null, "low", "name_contains", [ERR2]);
await L1.sug(mUnknown, "unknown", null, "low", "none");

const count = async (uid, table, where = "true", params = []) => (await as(uid, `SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`, params)).rows[0]?.n ?? -1;

// =================================================================== REVIEW PROBES (independent reviewer, REVIEW-transcript.md)
// Each "PROBE" line PASSES when the weakness it describes is PRESENT.
console.log("=== REVIEW PROBES ===");
const L2 = await draftLesson(CA, { title: "Second lesson", date: "2026-11-17" });
const m2Kiki = await L2.metric("Kiki");
await L2.sug(m2Kiki, "kiki", KIKI, "high", "exact_name", [ERR1, ERR2]);

// R1: transcript_approval_active is a definer callable by anyone signed in.
{
  const r = await as(PARENT, `SELECT public.transcript_approval_active($1) AS a`, [L1.T]);
  const r2 = await as(NOROLE, `SELECT public.transcript_approval_active($1) AS a`, [L1.T]);
  ok("R1 PROBE: a family / role-less login can call transcript_approval_active (boolean oracle on any transcript id)", r.err === null && r2.err === null, [r, r2]);
}

// R2: the AI-written per-speaker text on the metric row reaches the child on approval.
{
  const a = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: "A2", errors: [ERR1] }]);
  ok("R2 setup: approve L1", a.err === null, a);
  const r = await as(KID, `SELECT teacher_feedback FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L1.T]);
  ok("R2 PROBE: the child reads the metric row's teacher_feedback text after approval (the panel never shows / lists it)", r.rows.length === 1 && r.rows[0].teacher_feedback != null, r.rows);
}

// R3: a linked (published) metric row can be moved to another transcript by UPDATE; the guard only checks student_id.
{
  const t = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L2.T, mKiki]);
  ok("R3 PROBE: the class teacher can UPDATE a LINKED row of an approved lesson into another (draft) lesson", t.err === null && t.n === 1, t);
  const svc = await as(null, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L2.T, mKiki], { role: "service_role" });
  ok("R3 PROBE: so can the service role", svc.err === null && svc.n === 1, svc);
  const mvIn = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L1.T, m2Kiki]);
  ok("R3 PROBE: a draft row can be UPDATEd INTO an approved lesson (an INSERT there is refused)", mvIn.err === null && mvIn.n === 1, mvIn);
}

// R4: class_id on a metric row is not checked against the transcript's class in approve.
{
  const L3 = await draftLesson(CB, { title: "B lesson" });
  const mB = await L3.metric("Lily");
  const tA_mv = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1, teacher_feedback = 'planted by class A' WHERE id = $2 RETURNING id`, [L3.T, m2Kiki], { keep: true });
  ok("R4 PROBE: teacher of class A moves a class-A metric row into class B's transcript", tA_mv.err === null && tA_mv.n === 1, tA_mv);
  const appr = await approve(TEB, L3.T, [{ metric_id: m2Kiki, student_id: B1 }, { metric_id: mB, student_id: null }]);
  ok("R4 PROBE: B's teacher approves; the planted row (class_id A) is linked to B's child", appr.err === null, appr);
  const leak = await as(TEA, `SELECT student_id, teacher_feedback FROM public.transcript_speaker_metrics WHERE student_id = $1`, [B1]);
  ok("R4 PROBE: class A's teacher now reads class B child's published metric row (cross-class)", leak.rows.length === 1, leak.rows);
  const kidb = await as(KIDB, `SELECT teacher_feedback FROM public.transcript_speaker_metrics`, []);
  ok("R4 PROBE: and B's child reads the text class A's teacher planted", kidb.rows.some((r) => r.teacher_feedback === "planted by class A"), kidb.rows);
}

// R5: an enrolment that ENDED long ago still counts as "in this class".
{
  const GONE = await kid("Old Pupil", null);
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,'2025-01-01','2025-06-01')`, [GONE, CA]);
  const L4 = await draftLesson(CA, { title: "L4", date: "2026-11-16" });
  const m4 = await L4.metric("Someone");
  const r = await approve(TEA, L4.T, [{ metric_id: m4, student_id: GONE, cefr_level: "A1" }], { keep: false });
  ok("R5 PROBE: approve accepts a child whose enrolment ended 2025-06-01 for a 2026-11-16 lesson", r.err === null, r);
}

// R6: the RPC accepts a child for the mixed 'Unknown' bucket (the screen hides it; the RPC does not refuse).
{
  const L5 = await draftLesson(CA, { title: "L5" });
  const mU = await L5.metric("Unknown");
  const r = await approve(TEA, L5.T, [{ metric_id: mU, student_id: ANH, cefr_level: "A1" }], { keep: false });
  ok("R6 PROBE: approve accepts a child for the 'Unknown' speaker bucket", r.err === null, r);
}

// R7: the screen's starting choices after an approval: dropped errors come back ticked.
{
  const rv = await loadReview();
  const metrics = [{ id: "m1", speaker_label: "Kiki", is_teacher: false, student_id: "kid-1", cefr_estimate: "A2" }];
  const sugg = [{ metric_id: "m1", suggested_student_id: "kid-1", confidence: "high", draft_errors: [ERR1, ERR2] }];
  const c = rv.initialChoices(metrics, sugg);
  eq("R7 PROBE: an APPROVED speaker (teacher had dropped ERR2) starts with every drafted error ticked again", c.m1.keepErrors, [true, true]);
  const out = rv.buildAssignments(metrics, sugg, c);
  eq("R7 PROBE: so 'Approve again' unchanged republishes both errors", out[0].errors.length, 2);
  const lowApproved = rv.initialChoices([{ id: "m2", speaker_label: "Bao", is_teacher: false, student_id: null, cefr_estimate: null }],
    [{ metric_id: "m2", suggested_student_id: null, confidence: "low", draft_errors: [] }]);
  eq("R7c (control): a low suggestion starts unknown", lowApproved.m2.studentId, null);
}

// R8: re-analysing a legacy lesson removes its published metric rows without the replace confirm.
{
  const L6 = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, raw_text, status, analysis) VALUES ($1,$2,'legacy','x','analyzed','{}'::jsonb) RETURNING id`, [CA, TEA])).id;
  await db.exec(`ALTER TABLE public.transcript_speaker_metrics DISABLE TRIGGER transcript_metrics_link_guard`);
  await q(`INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [L6, CA, KIKI]);
  await db.exec(`ALTER TABLE public.transcript_speaker_metrics ENABLE TRIGGER transcript_metrics_link_guard`);
  const del = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L6], { role: "service_role" });
  ok("R8 PROBE: the analysis (service role) deletes a legacy lesson's LINKED metric rows; no approval or confirm involved", del.err === null && del.n === 1, del);
}

// R9 (control): withdraw by another class's teacher / family refused; definer search_path set.
{
  const w = await as(TEB, `SELECT public.withdraw_transcript_approval($1)`, [L1.T]);
  const w2 = await as(PARENT, `SELECT public.withdraw_transcript_approval($1)`, [L1.T]);
  ok("R9 control: another class's teacher and a family cannot withdraw", w.err !== null && w2.err !== null, [w, w2]);
  const sp = await q(`SELECT p.proname, p.proconfig FROM pg_proc p WHERE p.proname IN ('approve_transcript_analysis','withdraw_transcript_approval','transcript_approval_active','transcript_metrics_link_guard') ORDER BY 1`);
  ok("R9 control: every new function pins search_path", sp.every((r) => (r.proconfig || []).some((c) => c.startsWith("search_path="))), sp);
}

console.log(`\n${pass} passed, ${fail} failed`);
