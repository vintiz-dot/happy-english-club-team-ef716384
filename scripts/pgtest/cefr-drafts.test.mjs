// Model-made CEFR points are staff-only drafts until a teacher approves
// (privacy follow-ups, docs/evidence/PRIVACY-followups.md).
//
//   node scripts/pgtest/run.mjs   (or: this file with the five migrations run.mjs lists for "cefr drafts")
//
// Round 2 adds: a teacher deleting an approved point puts its draft back in
// the queue (re-approvable); 20261117152000 makes the AI learning profile and
// the level-defense claim staff-only (FamilyDashboard shows the approved
// level instead); cefr-defense gives a child progress only.
//
// Round 3 (review REVIEW-privacy-followups.md): the guard refuses every model
// source from an API role whatever its source_id (N-1, probes R1/R2/R9 turned
// round); a child reads a published report only through
// get_my_published_reports, with the approved level and never the model's
// (N-2); both rollback files run, then both migrations paste again (M-1); the
// child's status moves on when a teacher discards or sets a level (N-3); the
// OpenAI limit counts only calls that reach the model (N-4).
//
// Part 1 drives the REAL migration against an in-process Postgres over
// production's state: the real is_teacher_of_class (20261111110000), the
// real staff policies on cefr_assessments (20261113140000), and the admin /
// child / family read policies as the migrations that made them
// (20260712090000, 20260730130000). Before the paste a child and a family
// read the AI report's level; after it they do not, a copy is held as a
// draft, and only a teacher's approval publishes - under the same id.
//
// Part 2 bundles the REAL generate-student-report and cefr-defense (remote
// imports stubbed, their ../_lib imports real; s2-fn-harness.mjs), drives
// them against an in-memory Supabase and a scripted OpenAI, and also runs
// each AS IT WAS (git BASE) to show the defect. The drafts they write are
// then loaded into the Postgres of part 1 as the service role (columns,
// CHECKs, guards) and approved.
//
// Part 3 is the source: every reader of cefr_assessments, and who may read
// the drafts.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const STAFF_MIG = MIGS.find((f) => f.includes("20261113140000"));
const FIX_MIG = MIGS.find((f) => f.includes("20261117151000"));
const DEFENSE_MIG = MIGS.find((f) => f.includes("20260730100000"));
const FAMILY_MIG = MIGS.find((f) => f.includes("20261117152000"));
const ROLLBACK_DRAFTS = readFileSync(resolve(repo, "scripts", "ROLLBACK-cefr-model-drafts.sql"), "utf8");
const ROLLBACK_FAMILY = readFileSync(resolve(repo, "scripts", "ROLLBACK-family-reads-without-ai.sql"), "utf8");
if (!TA_MIG || !STAFF_MIG || !FIX_MIG || !DEFENSE_MIG || !FAMILY_MIG) {
  console.log("usage: cefr-drafts.test.mjs <20261111110000_...sql> <20261113140000_...sql> <20260730100000_cefr_level_defense.sql> <20261117151000_cefr_model_drafts.sql> <20261117152000_family_reads_without_ai.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const BASE = "04ccc58f"; // main before this change: both functions wrote cefr_assessments
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x !== "" ? " :: " + String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 500) : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// =================================================================== part 1
// Production's shape (copied from transcript-drafts.setup.mjs, which copies
// the migrations that made it).
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
// The shared prelude leaves out the source CHECK; production has it (20260712090000, read live 17 Nov).
await db.exec(`ALTER TABLE public.cefr_assessments ADD CONSTRAINT cefr_assessments_source_check CHECK (source IN ('ai_report', 'transcript', 'manual', 'vocab_analysis', 'exam'))`);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(LIVE);
await db.exec(readFileSync(STAFF_MIG, "utf8"));
// The level defense tables and policies, as the migration that made them.
await db.exec(readFileSync(DEFENSE_MIG, "utf8"));
// student_learning_profiles with production's four policies (read live 17 Nov):
// 20260715090000 (admin, child), 20261116092000 (class teachers), 20260730130000 (family).
await db.exec(`
  CREATE TABLE public.student_learning_profiles (student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
    summary text, strengths jsonb NOT NULL DEFAULT '[]'::jsonb, struggles jsonb NOT NULL DEFAULT '[]'::jsonb, cefr_estimate text,
    updated_at timestamptz NOT NULL DEFAULT now());
  ALTER TABLE public.student_learning_profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "admins_all_learning_profiles" ON public.student_learning_profiles FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "students_read_own_learning_profile" ON public.student_learning_profiles FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "teachers_read_class_learning_profiles" ON public.student_learning_profiles FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'teacher'::public.app_role) AND public.can_view_student_in_class(student_id, auth.uid()));
  CREATE POLICY "family_read_children_learning_profiles" ON public.student_learning_profiles FOR SELECT TO authenticated
    USING (public.can_view_student(student_id, auth.uid()));
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_learning_profiles, public.cefr_level_claims, public.cefr_defense_tests TO authenticated, service_role;
  -- student_reports as 20260712090000 made it (the shared prelude keeps only
  -- the columns the staff policies need), and its admin and child policies.
  ALTER TABLE public.student_reports ADD COLUMN period_start date, ADD COLUMN period_end date, ADD COLUMN status text NOT NULL DEFAULT 'generating',
    ADD COLUMN report jsonb, ADD COLUMN narrative text, ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  CREATE POLICY "admins_all_reports" ON public.student_reports FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "students_read_published_reports" ON public.student_reports FOR SELECT TO authenticated
    USING (published AND public.is_linked_student(auth.uid(), student_id));
`);
const FIX = readFileSync(FIX_MIG, "utf8");
const FAMILY = readFileSync(FAMILY_MIG, "utf8");

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
// Every row, whoever may read it (as the owner, no RLS).
const countAll = async (table, where = "true", params = []) => (await one(`SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`, params)).n;
const count = async (uid, table, where = "true", params = []) => (await as(uid, `SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`, params)).rows[0]?.n ?? -1;

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
const KIKI = await kid("Kiki", CA, { family: F1, linked: KID });
const LILY = await kid("Lily", CB, { linked: KIDB });
// The model's profile and the AI evidence audit on a claim, as production holds them.
await q(`INSERT INTO public.student_learning_profiles (student_id, summary, cefr_estimate) VALUES ($1, 'MODEL SUMMARY: Kiki speaks confidently', 'B2'), ($2, 'MODEL SUMMARY: Lily', 'A2')`, [KIKI, LILY]);
const CLAIM_K = (await one(`INSERT INTO public.cefr_level_claims (student_id, class_id, claimed_level, set_by, status, evidence)
  VALUES ($1, $2, 'A2', $3, 'not_supported', '{"verdict":"not_supported","recommended_level":"A1","rationale":"MODEL RATIONALE"}'::jsonb) RETURNING id`, [KIKI, CA, TEA])).id;

// ---------------------------------------------------------------- production's rows before the paste
const report = async (sid, cls, by) => (await one(`INSERT INTO public.student_reports (student_id, class_id, generated_by) VALUES ($1,$2,$3) RETURNING id`, [sid, cls, by])).id;
const R1 = await report(KIKI, CA, TEA), R2 = await report(LILY, CB, TEB);
const MODEL_CEFR = { level: "B2", confidence: 0.55, rationale: "MODEL REPORT RATIONALE" };
// R3: a report a teacher published, whose CEFR level nobody approved.
const R3 = (await one(`INSERT INTO public.student_reports (student_id, class_id, generated_by, published, status, report, narrative)
  VALUES ($1,$2,$3,true,'ready',$4::jsonb,'Kiki has grown this term.') RETURNING id`,
  [KIKI, CA, TEA, JSON.stringify({ cefr: MODEL_CEFR, strengths: [{ area: "speaking" }] })])).id;
const point = async (sid, cls, source, level, score, by, sourceId, evidence = null) =>
  (await one(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, confidence, evidence, created_by, source_id, assessed_at)
              VALUES ($1,$2,$3,$4,$5,0.7,$6,$7,$8,'2026-11-01') RETURNING id`, [sid, cls, source, level, score, evidence, by, sourceId])).id;
// As the old generate-student-report wrote them: source ai_report, source_id the report, signed with the generator.
const P_R1 = await point(KIKI, CA, "ai_report", "A2", 2, TEA, R1, "Uses past forms with support");
const P_R2 = await point(LILY, CB, "ai_report", "B1", 3, TEB, R2, "Connected speech on familiar topics");
// Not model-made by the rule: a video homework the teacher approved (ai_report, source_id = the submission),
// a transcript the teacher approved, a teacher's own level.
const P_VIDEO = await point(KIKI, CA, "ai_report", "A2", 2, TEA, randomUUID(), "Video homework: My pet");
const P_TRANS = await point(KIKI, CA, "transcript", "A2", 2, TEA, randomUUID());
const P_MANUAL = await point(KIKI, CA, "manual", "A1+", 1.5, TEA, null);
const snapshot = async (ids) => (await q(`SELECT to_jsonb(c) AS j FROM public.cefr_assessments c WHERE id = ANY($1::uuid[]) ORDER BY id`, [ids])).map((r) => r.j);
const OTHERS = [P_VIDEO, P_TRANS, P_MANUAL];
const othersBefore = await snapshot(OTHERS);
const heldBefore = await snapshot([P_R1, P_R2]);

console.log("=== before the paste: the defect ===");
eq("the child reads the AI report's level (and every other point)", await count(KID, "cefr_assessments", "student_id = $1", [KIKI]), 4);
eq("the family reads it too", await count(PARENT, "cefr_assessments", "id = $1", [P_R1]), 1);
eq("...although the report itself is unpublished (a child reads no report)", await count(KID, "student_reports", "id = $1", [R1]), 0);
eq("a published report: the child reads the model's CEFR level and rationale in it (review N-2)",
  (await as(KID, `SELECT report->'cefr'->>'rationale' AS r FROM public.student_reports WHERE id = $1`, [R3])).rows, [{ r: "MODEL REPORT RATIONALE" }]);
eq("the family reads the model's profile summary and CEFR estimate", (await as(PARENT, `SELECT summary, cefr_estimate FROM public.student_learning_profiles WHERE student_id = $1`, [KIKI])).rows,
  [{ summary: "MODEL SUMMARY: Kiki speaks confidently", cefr_estimate: "B2" }]);
eq("the child too", await count(KID, "student_learning_profiles", "student_id = $1", [KIKI]), 1);
eq("the child reads the AI evidence audit on their claim (verdict, recommended level, rationale)", (await as(KID, `SELECT evidence->>'recommended_level' AS r FROM public.cefr_level_claims`)).rows, [{ r: "A1" }]);
{
  const r = await as(null, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'level_defense_test','A2',2,$3)`,
    [KIKI, CA, randomUUID()], { role: "service_role" });
  ok("a level-defense point is refused by the source CHECK (why cefr-defense never landed one: it ignored the error)", /cefr_assessments_source_check/.test(r.err ?? ""), r.err);
}

console.log("=== installing ===");
{
  let ferr = null; try { await db.exec(FAMILY); } catch (e) { ferr = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("20261117152000 refuses before 20261117151000 is in", /paste 20261117151000_cefr_model_drafts.sql first/.test(ferr ?? ""), ferr);
  eq("  ...and drops nothing", await count(PARENT, "student_learning_profiles", "student_id = $1", [KIKI]), 1);
  await db.exec(`ALTER TABLE public.cefr_assessments DROP CONSTRAINT cefr_assessments_source_check;
                 ALTER TABLE public.cefr_assessments ADD CONSTRAINT cefr_assessments_source_check CHECK (source IN ('ai_report','transcript','manual','vocab_analysis','exam','rogue'))`);
  let err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("a source CHECK the file does not know: the paste refuses and names what it found", /Refusing to install: cefr_assessments_source_check allows/.test(err ?? ""), err);
  eq("  ...and installs nothing", (await one(`SELECT to_regclass('public.cefr_assessment_drafts') IS NULL AS none`)).none, true);
  eq("  ...and takes nothing down", await count(KID, "cefr_assessments", "student_id = $1", [KIKI]), 4);
  await db.exec(`ALTER TABLE public.cefr_assessments DROP CONSTRAINT cefr_assessments_source_check;
                 ALTER TABLE public.cefr_assessments ADD CONSTRAINT cefr_assessments_source_check CHECK (source IN ('ai_report','transcript','manual','vocab_analysis','exam'))`);
  await db.exec(`ALTER TABLE public.student_reports DISABLE ROW LEVEL SECURITY`);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("student_reports with RLS off: refused", /student_reports has row level security off/.test(err ?? ""), err);
  await db.exec(`ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY`);

  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("the fix installs on production's state", err === null, err);
}

console.log("=== what the paste did ===");
{
  eq("the child no longer reads the AI report's level; the three other points stay", (await as(KID, `SELECT id FROM public.cefr_assessments WHERE student_id = $1 ORDER BY id`, [KIKI])).rows.map((r) => r.id), [...OTHERS].sort());
  eq("the family reads neither report level", await count(PARENT, "cefr_assessments", "id = ANY($1::uuid[])", [[P_R1, P_R2]]), 0);
  eq("Lily's child login no longer reads hers", await count(KIDB, "cefr_assessments", "student_id = $1", [LILY]), 0);
  eq("the other points are unchanged, byte for byte", await snapshot(OTHERS), othersBefore);
  const drafts = await q(`SELECT id, student_id, class_id, source, source_id, level, level_score, confidence, evidence, assessed_at::text, requested_by, status, held_row
                            FROM public.cefr_assessment_drafts ORDER BY id`);
  eq("each taken-down point is a draft under its own id", drafts.map((d) => d.id), [P_R1, P_R2].sort());
  eq("  ...holding the whole published row", drafts.map((d) => d.held_row), [...heldBefore]);
  ok("  ...with its level, evidence, date, class and report, undecided, requested by its old signer",
    drafts.every((d) => d.status === "draft") && drafts.find((d) => d.id === P_R1).level === "A2" && drafts.find((d) => d.id === P_R1).evidence === "Uses past forms with support"
    && drafts.find((d) => d.id === P_R1).assessed_at === "2026-11-01" && drafts.find((d) => d.id === P_R1).class_id === CA && drafts.find((d) => d.id === P_R1).source_id === R1
    && drafts.find((d) => d.id === P_R1).requested_by === TEA, drafts);
  let err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("a second paste installs again", err === null, err);
  eq("  ...and changes nothing", (await q(`SELECT id, status FROM public.cefr_assessment_drafts ORDER BY id`)).map((d) => [d.id, d.status]), [P_R1, P_R2].sort().map((i) => [i, "draft"]));
  eq("  ...nothing re-published", await count(PARENT, "cefr_assessments", "id = ANY($1::uuid[])", [[P_R1, P_R2]]), 0);
  const res = await db.exec(FIX);
  const last = res.filter((r) => r.rows?.length).pop()?.rows?.[0];
  eq("it reports its counts (a third paste: 0 held now, 2 waiting, 2 held in all)", last && [Number(last.held_this_paste), Number(last.drafts_waiting), Number(last.held_total)], [0, 2, 2]);
}

console.log("=== who reads the drafts ===");
{
  const grants = await q(`SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS p FROM information_schema.role_table_grants
                           WHERE table_schema = 'public' AND table_name = 'cefr_assessment_drafts' GROUP BY 1`);
  const g = (r) => grants.find((x) => x.grantee === r)?.p ?? "";
  ok("authenticated holds SELECT, INSERT, UPDATE, DELETE (explicit; 20260712023825 revoked the defaults)", ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g("authenticated").includes(p)), g("authenticated"));
  ok("service_role holds all", ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g("service_role").includes(p)), g("service_role"));
  eq("anon holds nothing", g("anon"), "");
  eq("one policy: a staff SELECT (no family, child or write policy)", (await q(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'cefr_assessment_drafts'`)).map((p) => [p.policyname, p.cmd]), [["cefr_assessment_drafts_staff_select", "SELECT"]]);
  const fns = await q(`SELECT p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth
                         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('approve_cefr_draft', 'discard_cefr_draft') ORDER BY 1`);
  eq("approve / discard: SECURITY DEFINER, authenticated may call, anon may not", fns.map((f) => [f.proname, f.prosecdef, f.auth, f.anon]), [["approve_cefr_draft", true, true, false], ["discard_cefr_draft", true, true, false]]);
  for (const [who, uid] of [["the child", KID], ["the family", PARENT], ["Lily's child login", KIDB], ["an account with no role", NOROLE]]) {
    eq(`${who}: reads no draft`, await count(uid, "cefr_assessment_drafts"), 0);
  }
  eq("anon: refused outright", (await as(null, `SELECT count(*) FROM public.cefr_assessment_drafts`, [], { role: "anon" })).err !== null, true);
  eq("Kiki's class teacher reads Kiki's draft only", (await as(TEA, `SELECT id FROM public.cefr_assessment_drafts`)).rows.map((r) => r.id), [P_R1]);
  eq("the TA on Kiki's class too", (await as(TA_ON, `SELECT id FROM public.cefr_assessment_drafts`)).rows.map((r) => r.id), [P_R1]);
  eq("another class's teacher reads only their own class's", (await as(TEB, `SELECT id FROM public.cefr_assessment_drafts`)).rows.map((r) => r.id), [P_R2]);
  eq("an admin reads both", await count(ADMIN, "cefr_assessment_drafts"), 2);
}

console.log("=== nothing but an approval puts a model-made point where families read ===");
{
  const ins = (uid, role, source, sourceId, cls = CA, sid = KIKI) =>
    as(uid, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id, created_by) VALUES ($1,$2,$3,'B1',3,$4,$5) RETURNING id`,
      [sid, cls, source, sourceId, uid], { role });
  for (const [label, uid, role] of [["the service role (the functions as deployed today)", null, "service_role"], ["the class teacher, through the staff policy", TEA, "authenticated"], ["an admin", ADMIN, "authenticated"]]) {
    const a = await ins(uid, role, "ai_report", R1);
    ok(`${label}: an ai_report point naming a report is refused`, /draft until a teacher approves/.test(a.err ?? ""), a.err);
    for (const src of ["level_defense_evidence", "level_defense_test"]) {
      const b = await ins(uid, role, src, randomUUID());
      ok(`${label}: a ${src} point is refused (the CHECK now allows the source; the guard does not)`, /draft until a teacher approves/.test(b.err ?? ""), b.err);
    }
    const c = await ins(uid, role, "manual", null);
    ok(`${label}: a person's own level still goes in`, c.err === null && c.rows.length === 1, c.err);
  }
  // Review N-1 (probes R1, R2): not keyed on source_id any more.
  for (const [label, sid] of [["no source_id", null], ["a dangling source_id", randomUUID()]]) {
    for (const [who, uid, role] of [["the service role", null, "service_role"], ["the class teacher", TEA, "authenticated"]]) {
      const r = await ins(uid, role, "ai_report", sid);
      ok(`${who}: an ai_report point with ${label} is refused too`, /draft until a teacher approves/.test(r.err ?? ""), r.err);
    }
  }
  {
    const rid = randomUUID();
    const r = await as(null, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'ai_report','B2',4,$3)`, [KIKI, CA, rid], { role: "service_role", keep: true });
    ok("a point naming a report that does not exist yet is refused (probe R2)", /draft until a teacher approves/.test(r.err ?? ""), r.err);
    eq("  ...nothing published under it", await countAll("cefr_assessments", "source_id = $1", [rid]), 0);
  }
  for (const who of [["the child", KID], ["a teacher", TEA]]) {
    const r = await as(who[1], `SELECT public.cefr_point_is_model_made('ai_report', $1) AS m`, [R2]);
    ok(`${who[0]} cannot call cefr_point_is_model_made (probe R9: the report-id oracle is gone)`, /permission denied/.test(r.err ?? ""), r.err);
  }
  ok("  ...nor the service role, nor anon", /permission denied/.test((await as(null, `SELECT public.cefr_point_is_model_made('ai_report', $1)`, [R2], { role: "service_role" })).err ?? "")
    && /permission denied/.test((await as(null, `SELECT public.cefr_point_is_model_made('ai_report', $1)`, [R2], { role: "anon" })).err ?? ""));
  const turn = await as(TEA, `UPDATE public.cefr_assessments SET source = 'ai_report', source_id = $2 WHERE id = $1`, [P_MANUAL, R1]);
  ok("the teacher cannot turn a person's point into a report's one", /draft until a teacher approves/.test(turn.err ?? ""), turn.err);
  const edit = await as(TEA, `UPDATE public.cefr_assessments SET evidence = 'Seen in class' WHERE id = $1`, [P_MANUAL]);
  ok("...but can still edit it", edit.err === null && edit.n === 1, edit);

  const dins = (role, extra = {}) => as(null, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, source_id, level, level_score, status, decided_by, decided_at, approved_level, held_row)
                                               VALUES ($1,$2,'ai_report',$3,'A2',2,$4,$5,$6,$7,$8)`,
    [KIKI, CA, R1, extra.status ?? "draft", extra.decided_by ?? null, extra.decided_at ?? null, extra.approved_level ?? null, extra.held_row ?? null], { role });
  ok("the service role inserts an undecided draft", (await dins("service_role")).err === null);
  ok("...not one already approved", /starts undecided/.test((await dins("service_role", { status: "approved", decided_by: TEA, decided_at: "2026-11-17", approved_level: "A2" })).err ?? ""));
  ok("...nor one holding a row", /starts undecided/.test((await dins("service_role", { held_row: "{}" })).err ?? ""));
  ok("...and cannot decide one by UPDATE", /decided only by/.test((await as(null, `UPDATE public.cefr_assessment_drafts SET level = 'C1' WHERE id = $1`, [P_R1], { role: "service_role" })).err ?? ""));
  const t = await as(TEA, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, level, level_score) VALUES ($1,$2,'ai_report','A2',2)`, [KIKI, CA]);
  ok("a teacher cannot write a draft from the browser (no write policy)", t.err !== null, t.err);
  const u = await as(TEA, `UPDATE public.cefr_assessment_drafts SET status = 'approved' WHERE id = $1`, [P_R1]);
  ok("...nor mark one approved", u.err !== null || u.n === 0, u);
  eq("  ...it is still a draft and still unpublished", [(await one(`SELECT status FROM public.cefr_assessment_drafts WHERE id = $1`, [P_R1])).status, await count(PARENT, "cefr_assessments", "id = $1", [P_R1])], ["draft", 0]);
}

console.log("=== approve and discard ===");
const approve = (uid, id, level = null) => as(uid, `SELECT public.approve_cefr_draft($1, $2) AS r`, [id, level], { keep: true });
const discard = (uid, id) => as(uid, `SELECT public.discard_cefr_draft($1) AS r`, [id], { keep: true });
{
  for (const [who, uid] of [["no session", null], ["the family", PARENT], ["the child", KID], ["no role", NOROLE], ["another class's teacher", TEB]]) {
    const r = await approve(uid, P_R1);
    ok(`${who}: may not approve`, r.err !== null, r);
    const d = await discard(uid, P_R1);
    ok(`${who}: may not discard`, d.err !== null, d);
  }
  eq("  ...still a draft, still unpublished", [(await one(`SELECT status FROM public.cefr_assessment_drafts WHERE id = $1`, [P_R1])).status, await countAll("cefr_assessments", "id = $1", [P_R1])], ["draft", 0]);
  const bad = await approve(TEA, P_R1, "Z9");
  ok("a level not on the scale is refused", /not a CEFR level/.test(bad.err ?? ""), bad.err);
  const a = await approve(TEA, P_R1);
  ok("Kiki's class teacher approves the AI's level", a.err === null && a.rows[0]?.r === P_R1, a);
  const pub = await one(`SELECT level, level_score::float AS s, source, source_id, created_by, class_id, assessed_at::text AS d, evidence, confidence::float AS c FROM public.cefr_assessments WHERE id = $1`, [P_R1]);
  eq("  ...published under the draft's id, signed by the teacher, as the draft said",
    pub, { level: "A2", s: 2, source: "ai_report", source_id: R1, created_by: TEA, class_id: CA, d: "2026-11-01", evidence: "Uses past forms with support", c: 0.7 });
  eq("  ...the child and the family read it now", [await count(KID, "cefr_assessments", "id = $1", [P_R1]), await count(PARENT, "cefr_assessments", "id = $1", [P_R1])], [1, 1]);
  const dr = await one(`SELECT status, decided_by, approved_level FROM public.cefr_assessment_drafts WHERE id = $1`, [P_R1]);
  eq("  ...the draft records who decided and what", dr, { status: "approved", decided_by: TEA, approved_level: "A2" });
  ok("approving twice is refused", /already approved/.test((await approve(TEA, P_R1)).err ?? ""));
  ok("discarding an approved draft is refused", /already approved/.test((await discard(TEA, P_R1)).err ?? ""));
  eq("  ...one published row, not two", await countAll("cefr_assessments", "source_id = $1", [R1]), 1);

  const b = await approve(ADMIN, P_R2, "A2+");
  ok("an admin approves Lily's with a level of their own", b.err === null, b);
  const pub2 = await one(`SELECT level, level_score::float AS s, confidence, evidence, created_by FROM public.cefr_assessments WHERE id = $1`, [P_R2]);
  eq("  ...the teacher's level, its score, no model confidence, the AI's suggestion named in the evidence",
    pub2, { level: "A2+", s: 2.5, confidence: null, evidence: "Set by the teacher (the AI suggested B1): Connected speech on familiar topics", created_by: ADMIN });

  // A new draft (as the function writes it) that the TA discards.
  const nd = (await as(null, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, source_id, level, level_score) VALUES ($1,$2,'ai_report',$3,'B2',4) RETURNING id`, [KIKI, CA, R1], { role: "service_role", keep: true })).rows[0].id;
  const dd = await discard(TA_ON, nd);
  ok("the TA on the class discards a draft", dd.err === null, dd);
  eq("  ...nothing published, the draft says discarded", [await countAll("cefr_assessments", "id = $1", [nd]), (await one(`SELECT status FROM public.cefr_assessment_drafts WHERE id = $1`, [nd])).status], [0, "discarded"]);
  ok("  ...and it cannot be approved afterwards", /already discarded/.test((await approve(TEA, nd)).err ?? ""));

  // A defence draft with no class (a claim set with no class): staff of a class the child is in now.
  const nc = (await as(null, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, source_id, level, level_score, requested_by) VALUES ($1,NULL,'level_defense_test',$2,'B1',3,$3) RETURNING id`, [KIKI, randomUUID(), KID], { role: "service_role", keep: true })).rows[0].id;
  eq("a classless draft: Kiki's teacher reads it, another class's teacher does not", [await count(TEA, "cefr_assessment_drafts", "id = $1", [nc]), await count(TEB, "cefr_assessment_drafts", "id = $1", [nc])], [1, 0]);
  ok("another class's teacher may not approve it", (await approve(TEB, nc)).err !== null);
  const ncA = await approve(TEA, nc);
  ok("Kiki's teacher approves it (the source CHECK now takes a level-defense point)", ncA.err === null, ncA);
  eq("  ...published with no class, source level_defense_test; the family reads it", [(await one(`SELECT source, class_id FROM public.cefr_assessments WHERE id = $1`, [nc])), await count(PARENT, "cefr_assessments", "id = $1", [nc])],
    [{ source: "level_defense_test", class_id: null }, 1]);
}

console.log("=== a teacher takes an approved point off the chart: the draft is back, re-approvable ===");
{
  const del = await as(TEA, `DELETE FROM public.cefr_assessments WHERE id = $1`, [P_R1], { keep: true });
  ok("the class teacher deletes the approved report level (the staff delete policy)", del.err === null && del.n === 1, del);
  eq("  ...the family no longer reads it", await count(PARENT, "cefr_assessments", "id = $1", [P_R1]), 0);
  const d = await one(`SELECT status, decided_by, decided_at, approved_level, (SELECT array_agg(h->>'event') FROM jsonb_array_elements(history) h) AS ev,
                              history->-1->>'by' AS by, history->-1->>'level' AS lvl FROM public.cefr_assessment_drafts WHERE id = $1`, [P_R1]);
  eq("  ...its draft is a draft again, history: approved, unpublished (by the teacher, A2)", d,
    { status: "draft", decided_by: null, decided_at: null, approved_level: null, ev: ["approved", "unpublished"], by: TEA, lvl: "A2" });
  eq("  ...and is in the class teacher's queue", await count(TEA, "cefr_assessment_drafts", "id = $1 AND status = 'draft'", [P_R1]), 1);
  const again = await approve(TEA, P_R1, "B1");
  ok("  ...the teacher approves it again, at B1", again.err === null, again.err);
  eq("  ...published again under its id, the family reads B1", [(await one(`SELECT level FROM public.cefr_assessments WHERE id = $1`, [P_R1]))?.level, await count(PARENT, "cefr_assessments", "id = $1", [P_R1])], ["B1", 1]);
  eq("  ...history keeps all three steps", (await one(`SELECT (SELECT array_agg(h->>'event') FROM jsonb_array_elements(history) h) AS ev FROM public.cefr_assessment_drafts WHERE id = $1`, [P_R1])).ev, ["approved", "unpublished", "approved"]);
  const own = (await as(TEA, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, created_by) VALUES ($1,$2,'manual','A1',1,$3) RETURNING id`, [KIKI, CA, TEA], { keep: true })).rows[0].id;
  const draftsBefore = await q(`SELECT id, status, history FROM public.cefr_assessment_drafts ORDER BY id`);
  ok("deleting a teacher's own point touches no draft", (await as(TEA, `DELETE FROM public.cefr_assessments WHERE id = $1`, [own], { keep: true })).err === null
    && JSON.stringify(await q(`SELECT id, status, history FROM public.cefr_assessment_drafts ORDER BY id`)) === JSON.stringify(draftsBefore));
  const h = await as(null, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, level, level_score, history) VALUES ($1,$2,'ai_report','A2',2,'[{"event":"approved"}]')`, [KIKI, CA], { role: "service_role" });
  ok("the service role cannot insert a draft with a made-up history", /starts undecided/.test(h.err ?? ""), h.err);
}

console.log("=== a paste after approvals, and a leak in between ===");
{
  const before = await q(`SELECT id, status FROM public.cefr_assessment_drafts ORDER BY id`);
  const pubBefore = await snapshot([P_R1, P_R2]);
  let err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("a paste after approvals installs", err === null, err);
  eq("  ...leaves every decision as it was", await q(`SELECT id, status FROM public.cefr_assessment_drafts ORDER BY id`), before);
  eq("  ...and the approved points published, unchanged", await snapshot([P_R1, P_R2]), pubBefore);
  // Something running as the owner (not an API role) wrote a report's level directly.
  const leak = (await one(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id, created_by) VALUES ($1,$2,'ai_report','C1',5,$3,$4) RETURNING id`, [KIKI, CA, R1, TEA])).id;
  eq("(a leaked report level is readable by the family)", await count(PARENT, "cefr_assessments", "id = $1", [leak]), 1);
  await db.exec(FIX);
  eq("a later paste takes it back into a draft", [await count(PARENT, "cefr_assessments", "id = $1", [leak]), (await one(`SELECT status, (held_row->>'level') AS l FROM public.cefr_assessment_drafts WHERE id = $1`, [leak]))],
    [0, { status: "draft", l: "C1" }]);
  // A published row sharing an id with an undecided draft: refuse rather than guess.
  await q(`INSERT INTO public.cefr_assessments (id, student_id, class_id, source, level, level_score) VALUES ($1,$2,$3,'manual','A1',1)`, [leak, KIKI, CA]);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("a published row sharing an id with an undecided draft: the paste refuses", /share an id with an undecided or discarded draft/.test(err ?? ""), err);
  await q(`DELETE FROM public.cefr_assessments WHERE id = $1`, [leak]);
  await db.exec(`CREATE POLICY rogue_family ON public.cefr_assessment_drafts FOR SELECT TO authenticated USING (true)`);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on the drafts table: refused, and named", /unknown policy rogue_family/.test(err ?? ""), err);
  await db.exec(`DROP POLICY rogue_family ON public.cefr_assessment_drafts`);
}

console.log("=== learning profiles and level claims are staff-only (20261117152000) ===");
{
  await db.exec(`CREATE POLICY rogue_parents ON public.student_learning_profiles FOR SELECT TO authenticated USING (true)`);
  let err = null; try { await db.exec(FAMILY); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on student_learning_profiles: refused, and named", /unknown policy rogue_parents/.test(err ?? ""), err);
  eq("  ...nothing dropped", await count(KID, "student_learning_profiles", "student_id = $1", [KIKI]), 1);
  await db.exec(`DROP POLICY rogue_parents ON public.student_learning_profiles`);
  await db.exec(`CREATE POLICY rogue_claims ON public.cefr_level_claims FOR SELECT TO authenticated USING (true)`);
  err = null; try { await db.exec(FAMILY); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on cefr_level_claims: refused", /unknown policy rogue_claims/.test(err ?? ""), err);
  await db.exec(`DROP POLICY rogue_claims ON public.cefr_level_claims`);
  err = null; try { await db.exec(FAMILY); } catch (e) { err = e.message; }
  ok("it installs on production's state", err === null, err);
  err = null; try { await db.exec(FAMILY); } catch (e) { err = e.message; }
  ok("and pastes a second time", err === null, err);
  for (const [who, uid] of [["the family", PARENT], ["the child", KID], ["Lily's child login", KIDB], ["an account with no role", NOROLE]]) {
    eq(`${who}: reads no learning profile and no level claim`, [await count(uid, "student_learning_profiles"), await count(uid, "cefr_level_claims")], [0, 0]);
  }
  eq("the class teacher still reads Kiki's profile and claim, not Lily's", [await count(TEA, "student_learning_profiles"), await count(TEA, "cefr_level_claims")], [1, 1]);
  eq("the TA on the class reads Kiki's profile", await count(TA_ON, "student_learning_profiles", "student_id = $1", [KIKI]), 1);
  eq("another class's teacher reads neither of Kiki's", [await count(TEB, "student_learning_profiles", "student_id = $1", [KIKI]), await count(TEB, "cefr_level_claims", "student_id = $1", [KIKI])], [0, 0]);
  eq("an admin reads both profiles and the claim", [await count(ADMIN, "student_learning_profiles"), await count(ADMIN, "cefr_level_claims")], [2, 1]);
  eq("the family still reads the approved levels", await count(PARENT, "cefr_assessments", "id = $1", [P_R1]), 1);
  eq("the policies left are the staff ones", (await q(`SELECT tablename || '.' || policyname AS p FROM pg_policies WHERE tablename IN ('student_learning_profiles', 'cefr_level_claims', 'cefr_defense_tests', 'student_reports') ORDER BY 1`)).map((r) => r.p),
    ["cefr_defense_tests.admins_all_cefr_tests", "cefr_defense_tests.teachers_manage_class_cefr_tests", "cefr_level_claims.admins_all_cefr_claims",
     "cefr_level_claims.teachers_manage_class_cefr_claims", "student_learning_profiles.admins_all_learning_profiles", "student_learning_profiles.teachers_read_class_learning_profiles",
     "student_reports.admins_all_reports", "student_reports.student_reports_staff_delete", "student_reports.student_reports_staff_insert",
     "student_reports.student_reports_staff_select", "student_reports.student_reports_staff_update"]);
  // Review N-2: the child's published reports, column-safe.
  eq("the child reads no report row directly any more", await count(KID, "student_reports"), 0);
  const mine = (uid, sid = KIKI) => as(uid, `SELECT id, report, approved_level, narrative FROM public.get_my_published_reports($1)`, [sid]);
  const r3 = await mine(KID);
  eq("get_my_published_reports: the child's one published report, its narrative, no CEFR at all (nobody approved one)",
    r3.rows.map((r) => [r.id, r.narrative, r.report?.cefr ?? null, r.approved_level, r.report?.strengths?.length]), [[R3, "Kiki has grown this term.", null, null, 1]]);
  ok("  ...the model's level and rationale appear nowhere in it", !JSON.stringify(r3.rows).includes("MODEL REPORT RATIONALE") && !JSON.stringify(r3.rows).includes("\"B2\""), r3.rows);
  await q(`UPDATE public.student_reports SET published = true, status = 'ready', report = $2::jsonb, narrative = 'Second report' WHERE id = $1`, [R1, JSON.stringify({ cefr: MODEL_CEFR })]);
  const approvedR1 = (await one(`SELECT level FROM public.cefr_assessments WHERE id = $1`, [P_R1])).level;
  const both = await mine(KID);
  eq("a published report whose level a teacher approved: the approved level, marked approved, no confidence or rationale",
    both.rows.find((r) => r.id === R1) && [both.rows.find((r) => r.id === R1).report.cefr, both.rows.find((r) => r.id === R1).approved_level], [{ level: approvedR1, approved: true }, approvedR1]);
  ok("  ...and still not the model's B2 or its rationale", !JSON.stringify(both.rows).includes("MODEL REPORT RATIONALE"), both.rows);
  for (const [who, uid] of [["the family (it had no report policy before either)", PARENT], ["Lily's child login", KIDB], ["an account with no role", NOROLE], ["another class's teacher", TEB]]) {
    eq(`${who}: get_my_published_reports for Kiki returns nothing`, (await mine(uid)).rows.length, 0);
  }
  ok("anon cannot call it", /permission denied/.test((await as(null, `SELECT * FROM public.get_my_published_reports($1)`, [KIKI], { role: "anon" })).err ?? ""));
  await q(`UPDATE public.student_reports SET published = false WHERE id = $1`, [R1]);
  eq("an unpublished report is not returned", (await mine(KID)).rows.map((r) => r.id), [R3]);
  eq("the class teacher still reads the whole report, the model's estimate included", (await as(TEA, `SELECT report->'cefr'->>'rationale' AS r FROM public.student_reports WHERE id = $1`, [R3])).rows, [{ r: "MODEL REPORT RATIONALE" }]);
  eq("the rows themselves are untouched", (await q(`SELECT summary FROM public.student_learning_profiles ORDER BY summary`)).map((r) => r.summary), ["MODEL SUMMARY: Kiki speaks confidently", "MODEL SUMMARY: Lily"]);
}

// =================================================================== part 2
console.log("=== the functions (bundled, against a stand-in) ===");
const H = await import("./s2-fn-harness.mjs");
const { world, reset, load, call, SERVICE_KEY, tokenOf, FUNCTIONS } = H;
const fsrc = (name) => readFileSync(resolve(FUNCTIONS, name, "index.ts"), "utf8");
const old = (name) => execFileSync("git", ["show", `${BASE}:supabase/functions/${name}/index.ts`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const U2 = { TEA, TEB, ADMIN, KID, PARENT };
for (const id of Object.values(U2)) world.users[id] = { id, email: `${id}@example.test` };
const ROLES2 = { [TEA]: ["teacher"], [TEB]: ["teacher"], [ADMIN]: ["admin"], [KID]: ["student"], [PARENT]: ["family"] };
const STAFF2 = { [CA]: [TEA], [CB]: [TEB] };
const ENROL2 = { [KIKI]: [CA], [LILY]: [CB] };
world.rpc.is_teacher_of_class = ({ user_id, class_id }) => (STAFF2[class_id] ?? []).includes(user_id);
world.rpc.can_view_student_in_class = ({ _student_id, _user_id }) => (ENROL2[_student_id] ?? []).some((c) => (STAFF2[c] ?? []).includes(_user_id));
let answer = {};
world.fetchAnswer = (url) => {
  if (typeof answer === "function") return answer(url);
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const writesTo = (table) => world.log.filter((e) => e.table === table && e.op !== "select");
const inserted = (table) => (world.tables[table] ?? []);
const R_NEW = randomUUID();
const base2 = (extra = {}) => ({
  user_roles: Object.entries(ROLES2).flatMap(([user_id, rs]) => rs.map((role) => ({ user_id, role }))),
  students: [{ id: KIKI, full_name: "Kiki", linked_user_id: KID, date_of_birth: "2016-01-01" }, { id: LILY, full_name: "Lily", date_of_birth: "2016-01-01" }],
  enrollments: [{ id: "e1", student_id: KIKI, class_id: CA }, { id: "e2", student_id: LILY, class_id: CB }],
  student_reports: [{ id: R_NEW, student_id: KIKI, class_id: CA, generated_by: TEA, published: false, status: "generating" },
    { id: R1, student_id: KIKI, class_id: CA, generated_by: TEA, published: true, status: "ready", narrative: "What the teacher published" }],
  ...extra,
});
const REPORT = { cefr: { level: "A2+", confidence: 0.64, rationale: "Past forms with support; asks questions" }, narrative: "Kiki has grown this term.", strengths: [], weaknesses: [] };
const toPg = async ({ id: _harnessId, ...row }) => as(null, `INSERT INTO public.cefr_assessment_drafts (student_id, class_id, source, source_id, level, level_score, confidence, evidence, requested_by)
                                       SELECT student_id, class_id, source, source_id, level, level_score, confidence, evidence, requested_by
                                         FROM jsonb_populate_record(NULL::public.cefr_assessment_drafts, $1::jsonb) RETURNING id`, [JSON.stringify(row)], { role: "service_role", keep: true });
const loaded = [];

console.log("--- generate-student-report");
{
  const name = "generate-student-report";
  const fn = await load(name, fsrc(name));
  let before = null; try { before = await load(name, old(name)); } catch { /* no history */ }
  ok(`the function as it was at ${BASE} could be loaded from git`, typeof before === "function");
  if (before) {
    reset(base2()); answer = REPORT;
    const b = await call(before, name, { token: tokenOf(TEA), body: { report_id: R_NEW } });
    ok("BEFORE: the model's level went straight into cefr_assessments (which families read)", b.status === 200 && writesTo("cefr_assessments").length === 1 && inserted("cefr_assessments")[0]?.level === "A2+", { status: b.status, w: writesTo("cefr_assessments") });
    reset(base2()); answer = REPORT;
    const p = await call(before, name, { token: tokenOf(TEA), body: { report_id: R1 } });
    ok("BEFORE: a published report was rewritten in place by the model", p.status === 200 && world.tables.student_reports.find((r) => r.id === R1).narrative === REPORT.narrative, p.status);
  }
  reset(base2()); answer = REPORT;
  const r = await call(fn, name, { token: tokenOf(TEA), body: { report_id: R_NEW } });
  ok("the class teacher: 200, the report saved", r.status === 200 && r.json?.success === true && world.tables.student_reports.find((x) => x.id === R_NEW).status === "ready", r);
  eq("  ...nothing written to cefr_assessments", writesTo("cefr_assessments").length, 0);
  const d = inserted("cefr_assessment_drafts");
  eq("  ...one draft: the model's level for this report, requested by the teacher",
    d.map((x) => [x.student_id, x.class_id, x.source, x.source_id, x.level, x.level_score, x.confidence, x.requested_by]), [[KIKI, CA, "ai_report", R_NEW, "A2+", 2.5, 0.64, TEA]]);
  ok("  ...its id is returned to the screen", !!r.json?.cefr_draft_id && r.json.cefr_draft_id === d[0]?.id, r.json);
  ok("  ...and the report row stays unpublished", world.tables.student_reports.find((x) => x.id === R_NEW).published === false);
  loaded.push(["report", d[0]]);

  reset(base2()); answer = REPORT;
  const p = await call(fn, name, { token: tokenOf(TEA), body: { report_id: R1 } });
  ok("a published report: 409, no model call, nothing written", p.status === 409 && world.vendor.length === 0 && world.log.every((e) => e.op === "select" || !e.table), { status: p.status, vendor: world.vendor.length });
  eq("  ...the published text is the teacher's still", world.tables.student_reports.find((x) => x.id === R1).narrative, "What the teacher published");

  reset(base2());
  answer = () => { world.tables.student_reports.find((x) => x.id === R_NEW).published = true;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(REPORT) } }] }), { status: 200 }); };
  const race = await call(fn, name, { token: tokenOf(TEA), body: { report_id: R_NEW } });
  ok("published while the model was writing: 409, the report not overwritten, no draft", race.status === 409
    && world.tables.student_reports.find((x) => x.id === R_NEW).status === "generating" && inserted("cefr_assessment_drafts").length === 0, { status: race.status });

  reset(base2()); answer = { ...REPORT, cefr: { level: "Z9" } };
  const odd = await call(fn, name, { token: tokenOf(TEA), body: { report_id: R_NEW } });
  ok("a level off the scale: the report is saved, no draft", odd.status === 200 && inserted("cefr_assessment_drafts").length === 0 && odd.json?.cefr_draft_id === null, odd.json);

  reset(base2()); answer = REPORT;
  const wrong = await call(fn, name, { token: tokenOf(TEB), body: { report_id: R_NEW } });
  ok("another class's teacher: 403, nothing spent or written (unchanged)", wrong.status === 403 && world.vendor.length === 0 && inserted("cefr_assessment_drafts").length === 0, wrong.status);
}

console.log("--- cefr-defense");
const CLAIM = randomUUID(), TEST = randomUUID();
const stage = (n, level) => ({ stage: n, level, items: [0, 1, 2, 3].map((i) => ({ id: `s${n}q${i}`, type: "mcq", skill: "grammar", prompt: `Q${i}`, options: ["a", "b", "c", "d"], correct_index: 0 })), writing_tasks: n === 3 ? [{ id: "s3w0", type: "writing", prompt: "Write about your day" }] : [] });
const defenseWorld = () => base2({
  cefr_level_claims: [{ id: CLAIM, student_id: KIKI, class_id: CA, claimed_level: "A2", set_by: TEA, status: "unverified" }],
  cefr_defense_tests: [{ id: TEST, claim_id: CLAIM, student_id: KIKI, class_id: CA, target_level: "A2", status: "in_progress", current_stage: 3,
    stages: [stage(1, "A2"), stage(2, "A2"), stage(3, "A2")], responses: [] }],
});
{
  const name = "cefr-defense";
  const fn = await load(name, fsrc(name));
  let before = null; try { before = await load(name, old(name)); } catch { /* no history */ }
  ok(`the function as it was at ${BASE} could be loaded from git`, typeof before === "function");
  const VERDICT = { verdict: "supported", confidence: 0.8, recommended_level: "A2", evidence_for: [], evidence_against: [], rationale: "Consistent past-tense use" };
  if (before) {
    reset(defenseWorld()); answer = VERDICT;
    await call(before, name, { token: tokenOf(TEA), body: { action: "mine_evidence", student_id: KIKI } });
    ok("BEFORE: the audit's level was written to cefr_assessments (the CHECK refused it in production; widening the CHECK alone would have published it)",
      writesTo("cefr_assessments").length === 1 && inserted("cefr_assessments")[0]?.source === "level_defense_evidence", writesTo("cefr_assessments"));
  }
  reset(defenseWorld()); answer = VERDICT;
  const m = await call(fn, name, { token: tokenOf(TEA), body: { action: "mine_evidence", student_id: KIKI } });
  ok("mine_evidence by the class teacher: 200, the verdict on the claim", m.status === 200 && m.json?.status === "supported", m);
  eq("  ...nothing written to cefr_assessments", writesTo("cefr_assessments").length, 0);
  const md = inserted("cefr_assessment_drafts");
  eq("  ...one draft: the recommended level, for the claim, requested by the teacher",
    md.map((x) => [x.student_id, x.class_id, x.source, x.source_id, x.level, x.level_score, x.confidence, x.requested_by]), [[KIKI, CA, "level_defense_evidence", CLAIM, "A2", 2, 0.8, TEA]]);
  ok("  ...its id is returned", m.json?.cefr_draft_id === md[0]?.id, m.json);
  loaded.push(["evidence", md[0]]);
  reset(defenseWorld()); answer = { ...VERDICT, verdict: "insufficient_evidence" };
  await call(fn, name, { token: tokenOf(TEA), body: { action: "mine_evidence", student_id: KIKI } });
  eq("an inconclusive audit drafts nothing", inserted("cefr_assessment_drafts").length, 0);

  const RESULT = { level_estimate: "B1", defended: true, confidence: 0.7, writing_assessment: [], skill_notes: {}, rationale: "Solid at A2, writing at B1", next_steps: [] };
  if (before) {
    reset(defenseWorld()); answer = RESULT;
    await call(before, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [{ item_id: "s3q0", answer: 0 }, { item_id: "s3w0", answer: "I went to school." }] } });
    ok("BEFORE: the test's estimate was written to cefr_assessments", writesTo("cefr_assessments").length === 1, writesTo("cefr_assessments"));
  }
  reset(defenseWorld()); answer = RESULT;
  const s = await call(fn, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [{ item_id: "s3q0", answer: 0 }, { item_id: "s3w0", answer: "I went to school." }] } });
  ok("the child submits the last stage: 200, graded", s.status === 200 && world.tables.cefr_defense_tests[0].status === "graded", s);
  eq("  ...nothing written to cefr_assessments", writesTo("cefr_assessments").length, 0);
  const sd = inserted("cefr_assessment_drafts");
  eq("  ...one draft: the estimate, for the test, requested by the child",
    sd.map((x) => [x.student_id, x.class_id, x.source, x.source_id, x.level, x.level_score, x.requested_by]), [[KIKI, CA, "level_defense_test", TEST, "B1", 3, KID]]);
  loaded.push(["test", sd[0]]);
  reset(defenseWorld()); answer = VERDICT;
  const kidMine = await call(fn, name, { token: tokenOf(KID), body: { action: "mine_evidence", student_id: KIKI } });
  ok("the child cannot run the evidence audit (unchanged): 403, no draft", kidMine.status === 403 && inserted("cefr_assessment_drafts").length === 0, kidMine.status);
}

console.log("--- cefr-defense: what a child sees (round 2)");
{
  const name = "cefr-defense";
  const fn = await load(name, fsrc(name));
  const EVID = { verdict: "not_supported", confidence: 0.6, recommended_level: "A1", rationale: "MODEL EVIDENCE RATIONALE", evidence_for: [], evidence_against: [] };
  const world2 = (stageNo = 3) => {
    const w = defenseWorld();
    w.cefr_level_claims[0].status = "not_supported"; w.cefr_level_claims[0].evidence = EVID;
    if (stageNo === 1) Object.assign(w.cefr_defense_tests[0], { current_stage: 1, stages: [stage(1, "A2")], status: "assigned" });
    return w;
  };
  const leaks = (r, words) => words.filter((x) => JSON.stringify(r.json).includes(x));
  const AI_WORDS = ["MODEL EVIDENCE RATIONALE", "MODEL TEST RATIONALE", "not_supported", "recommended_level", "level_estimate", "defended", "stage_score", "correct_index"];
  reset(world2()); answer = {};
  const g = await call(fn, name, { token: tokenOf(KID), body: { action: "get_state" } });
  ok("the child's get_state: 200", g.status === 200 && g.json?.success === true, g);
  eq("  ...the teacher's level and progress only: no evidence, status 'test_assigned'", [g.json?.claim?.claimed_level, g.json?.claim?.status, g.json?.claim?.evidence], ["A2", "test_assigned", null]);
  eq("  ...no AI verdict, rationale, recommended level, routed stage level or answer key anywhere in the reply", leaks(g, AI_WORDS), []);
  ok("  ...the active stage has its questions but no level", !!g.json?.tests?.[0]?.active_stage?.items?.length && !("level" in g.json.tests[0].active_stage), g.json?.tests?.[0]?.active_stage);
  eq("  ...no approved level yet", g.json?.approved_level, null);
  const gs = await call(fn, name, { token: tokenOf(TEA), body: { action: "get_state", student_id: KIKI } });
  ok("the class teacher's get_state: the full audit and the AI status", gs.json?.claim?.evidence?.rationale === "MODEL EVIDENCE RATIONALE" && gs.json?.claim?.status === "not_supported", gs.json?.claim);

  const TRESULT = { level_estimate: "A1", defended: false, confidence: 0.6, writing_assessment: [], skill_notes: {}, rationale: "MODEL TEST RATIONALE", next_steps: [] };
  answer = TRESULT;
  const sub = await call(fn, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [{ item_id: "s3q0", answer: 0 }, { item_id: "s3w0", answer: "I went." }] } });
  ok("the child submits the last stage: 200, 'submitted - your teacher will review'", sub.status === 200 && /teacher will review/.test(sub.json?.message ?? "") && sub.json?.test?.submitted === true, sub.json);
  eq("  ...no level, defended, rationale or score in the reply", leaks(sub, AI_WORDS), []);
  ok("  ...while the graded result is stored for staff", world.tables.cefr_defense_tests[0].result?.level_estimate === "A1");
  const after = await call(fn, name, { token: tokenOf(KID), body: { action: "get_state" } });
  eq("the child's get_state after the test: 'submitted', no result, no approved level", [after.json?.claim?.status, after.json?.tests?.[0]?.result, after.json?.approved_level, leaks(after, AI_WORDS)], ["submitted", null, null, []]);
  const staffAfter = await call(fn, name, { token: tokenOf(TEA), body: { action: "get_state", student_id: KIKI } });
  ok("the teacher sees the AI's estimate and rationale", staffAfter.json?.tests?.[0]?.result?.level_estimate === "A1" && staffAfter.json?.tests?.[0]?.result?.rationale === "MODEL TEST RATIONALE", staffAfter.json?.tests?.[0]);
  // A teacher approves the draft (at A2): the published point is what the child now sees.
  (world.tables.cefr_assessments ??= []).push({ id: "pub-1", student_id: KIKI, source: "level_defense_test", source_id: TEST, level: "A2", assessed_at: "2026-11-17" });
  (world.tables.cefr_assessments).push({ id: "pub-2", student_id: KIKI, source: "level_defense_test", source_id: "another-childs-test", level: "C1", assessed_at: "2026-11-18" });
  const reviewed = await call(fn, name, { token: tokenOf(KID), body: { action: "get_state" } });
  eq("once a teacher approved a level, the child sees it: 'reviewed', A2 (their own test's, not another)", [reviewed.json?.claim?.status, reviewed.json?.approved_level?.level, leaks(reviewed, AI_WORDS)], ["reviewed", "A2", []]);

  reset(world2(1));
  answer = { items: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `n${i}`, skill: "grammar", prompt: `P${i}`, options: ["a", "b", "c", "d"], correct_index: 1 })) };
  const s1 = await call(fn, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [0, 1, 2, 3].map((i) => ({ item_id: `s1q${i}`, answer: 0 })) } });
  ok("the child submits stage 1: the next stage, without its level, a score or an answer key", s1.status === 200 && s1.json?.test?.current_stage === 2
    && !!s1.json?.test?.active_stage && !("level" in s1.json.test.active_stage) && leaks(s1, AI_WORDS).length === 0, s1.json);
  reset(world2(1));
  const t1 = await call(fn, name, { token: tokenOf(TEA), body: { action: "submit_stage", test_id: TEST, answers: [0, 1, 2, 3].map((i) => ({ item_id: `s1q${i}`, answer: 0 })) } });
  ok("staff submitting the same stage still get the score and the routed level", t1.json?.stage_score === 1 && t1.json?.test?.active_stage?.level === "B1", t1.json);

  // Review N-3: the child's status moves on when a teacher acts on a graded test.
  const gradedWorld = (extra = {}) => {
    const w = world2();
    Object.assign(w.cefr_defense_tests[0], { status: "graded", updated_at: "2026-11-17T10:00:00.000+00:00", result: { level_estimate: "A1", rationale: "MODEL TEST RATIONALE" } });
    w.cefr_level_claims[0].updated_at = "2026-11-17T10:00:00.000+00:00";
    return { ...w, ...extra };
  };
  const stateOf = async (w) => { reset(w); return call(fn, name, { token: tokenOf(KID), body: { action: "get_state" } }); };
  let st = await stateOf(gradedWorld());
  eq("graded, nothing decided yet: 'submitted'", [st.json?.claim?.status, st.json?.approved_level, st.json?.teacher_level], ["submitted", null, null]);
  st = await stateOf(gradedWorld({ cefr_assessment_drafts: [{ id: "d1", student_id: KIKI, source: "level_defense_test", source_id: TEST, status: "discarded" }] }));
  eq("the teacher discarded the test's draft: 'reviewed', no level", [st.json?.claim?.status, st.json?.approved_level, st.json?.teacher_level, leaks(st, AI_WORDS)], ["reviewed", null, null, []]);
  st = await stateOf(gradedWorld({ cefr_assessments: [{ id: "m1", student_id: KIKI, source: "manual", level: "A2+", assessed_at: "2026-11-17", created_at: "2026-11-17T11:00:00.000+00:00" }] }));
  eq("the teacher set a manual level after the test: 'set_by_teacher', that level", [st.json?.claim?.status, st.json?.teacher_level?.level, leaks(st, AI_WORDS)], ["set_by_teacher", "A2+", []]);
  st = await stateOf(gradedWorld({ cefr_assessments: [{ id: "m0", student_id: KIKI, source: "manual", level: "A1", assessed_at: "2026-11-01", created_at: "2026-11-01T09:00:00.000+00:00" }] }));
  eq("a manual level from before the test does not count: 'submitted'", [st.json?.claim?.status, st.json?.teacher_level], ["submitted", null]);
  {
    const w = gradedWorld();
    Object.assign(w.cefr_level_claims[0], { status: "unverified", claimed_level: "B1", updated_at: "2026-11-17T12:00:00.000+00:00" });
    st = await stateOf(w);
    eq("the teacher set a new level on the claim after the test: 'set_by_teacher', the claim shows it", [st.json?.claim?.status, st.json?.claim?.claimed_level], ["set_by_teacher", "B1"]);
  }
  st = await stateOf(gradedWorld({ cefr_assessment_drafts: [{ id: "d1", student_id: KIKI, source: "level_defense_test", source_id: TEST, status: "discarded" }],
    cefr_assessments: [{ id: "p1", student_id: KIKI, source: "level_defense_test", source_id: TEST, level: "A2", assessed_at: "2026-11-17", created_at: "2026-11-17T13:00:00.000+00:00" }] }));
  eq("an approved level wins: 'reviewed', A2", [st.json?.claim?.status, st.json?.approved_level?.level], ["reviewed", "A2"]);

  // Review N-4: the OpenAI actions' limit counts only calls that reach the model.
  {
    const f2 = await load(name, fsrc(name));
    reset(gradedWorld()); answer = {};
    let refused = 0, limited = 0;
    for (let i = 0; i < 25; i++) {
      const r = await call(f2, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [] } });
      if (r.status === 400 && /Already graded/.test(r.json?.error ?? "")) refused++; else if (r.status === 429) limited++;
    }
    eq("25 'Already graded' submits by the child: all refused by the function, none counted (no 429)", [refused, limited], [25, 0]);
    reset(world2(1)); answer = { items: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `n${i}`, skill: "grammar", prompt: `P${i}`, options: ["a", "b", "c", "d"], correct_index: 1 })) };
    const real = await call(f2, name, { token: tokenOf(KID), body: { action: "submit_stage", test_id: TEST, answers: [0, 1, 2, 3].map((i) => ({ item_id: `s1q${i}`, answer: 0 })) } });
    ok("  ...so the child's real submit after them still goes through", real.status === 200 && world.vendor.length === 1, { status: real.status, vendor: world.vendor.length });
    const f3 = await load(name, fsrc(name));
    const VER = { verdict: "supported", confidence: 0.8, recommended_level: "A2", evidence_for: [], evidence_against: [], rationale: "r" };
    let reached = 0, first429 = null;
    for (let i = 0; i < 22; i++) {
      reset(defenseWorld()); answer = VER;
      const r = await call(f3, name, { token: tokenOf(TEA), body: { action: "mine_evidence", student_id: KIKI } });
      if (r.status === 429) { first429 ??= { at: i + 1, vendor: world.vendor.length }; } else if (r.status === 200 && world.vendor.length === 1) reached++;
    }
    eq("the teacher's evidence audits: exactly 20 reach OpenAI, the 21st is a 429 that calls nothing", [reached, first429?.at, first429?.vendor], [20, 21, 0]);
  }
}

console.log("--- what they wrote, in the real schema");
for (const [label, row] of loaded) {
  const r = await toPg(row);
  ok(`the ${label} draft is accepted as the service role writes it (columns, CHECKs, guard)`, r.err === null && r.rows.length === 1, r.err);
  if (r.err) continue;
  const id = r.rows[0].id;
  eq(`  ...the family and the child read nothing of it`, [await count(PARENT, "cefr_assessment_drafts", "id = $1", [id]), await count(KID, "cefr_assessment_drafts", "id = $1", [id]), await count(PARENT, "cefr_assessments", "id = $1", [id])], [0, 0, 0]);
  const a = await approve(TEA, id);
  ok(`  ...the class teacher approves it`, a.err === null, a.err);
  eq(`  ...and only then does the family read it, with the teacher's signature`, [await count(PARENT, "cefr_assessments", "id = $1", [id]), (await one(`SELECT created_by FROM public.cefr_assessments WHERE id = $1`, [id]))?.created_by], [1, TEA]);
}
{
  const direct = await as(null, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'ai_report','A2',2,$3)`, [KIKI, CA, R1], { role: "service_role" });
  ok("and the old functions' direct write is refused in the database (deploy order does not matter)", /draft until a teacher approves/.test(direct.err ?? ""), direct.err);
}

console.log("=== FamilyDashboard: the approved level, no model text (against Postgres, as the family) ===");
{
  const { transform } = await import("esbuild");
  const page = readFileSync(resolve(repo, "src", "pages", "FamilyDashboard.tsx"), "utf8").replace(/\r\n/g, "\n");
  const a = page.indexOf("export async function withApprovedLevels");
  const b = page.indexOf("\n}\n", a) + 3;
  const code = (await transform(`const POSTGREST_ROW_CAP = 1000;\n${page.slice(a, b).replace("export async function", "async function")}\nexport { withApprovedLevels };`, { loader: "ts", format: "esm" })).code;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  // A PostgREST stand-in that runs the page's exact request in Postgres as the caller.
  const pgClient = (uid) => ({
    from: (table) => {
      const st = { cols: "*", where: [], params: [], order: [], limit: null };
      const b2 = {
        select(c) { st.cols = c; return b2; },
        in(c, v) { st.params.push(v); st.where.push(`${c}::text = ANY($${st.params.length}::text[])`); return b2; },
        order(c, o) { st.order.push(`${c} ${o?.ascending === false ? "DESC" : "ASC"}`); return b2; },
        limit(n) { st.limit = n; return b2; },
        then(res, rej) {
          const sql = `SELECT ${st.cols} FROM public.${table}${st.where.length ? " WHERE " + st.where.join(" AND ") : ""}${st.order.length ? " ORDER BY " + st.order.join(", ") : ""}${st.limit ? " LIMIT " + st.limit : ""}`;
          return as(uid, sql, st.params).then((r) => (r.err ? { data: null, error: { message: r.err } } : { data: r.rows, error: null })).then(res, rej);
        },
      };
      return b2;
    },
  });
  const latestK = (await one(`SELECT level FROM public.cefr_assessments WHERE student_id = $1 ORDER BY assessed_at DESC, created_at DESC LIMIT 1`, [KIKI])).level;
  const input = [
    { id: KIKI, full_name: "Kiki", cefr: "B2", journey: "MODEL SUMMARY: Kiki speaks confidently", total_points: 0, attendance: { present: 0, total: 0 }, lessons: [] },
    { id: LILY, full_name: "Lily", cefr: "A2", journey: "MODEL SUMMARY: Lily", total_points: 0, attendance: { present: 0, total: 0 }, lessons: [] },
  ];
  const out = await mod.withApprovedLevels(pgClient(PARENT), input);
  eq("Kiki's card: the latest approved level, no journey text (even when the profile request still returned one)", [out[0].cefr, out[0].journey], [latestK, null]);
  eq("a child the family cannot read: no level, no text", [out[1].cefr, out[1].journey], [null, null]);
  ok("nothing of the model's profile survives on any card", !JSON.stringify(out).includes("MODEL SUMMARY") && !out.some((c) => c.cefr === "B2" && latestK !== "B2"));
  const broken = await mod.withApprovedLevels({ from: () => ({ select() { return this; }, in() { return this; }, order() { return this; }, limit() { return this; }, then: (r) => r({ data: null, error: { message: "down" } }) }) }, input);
  eq("the level cannot be read: no level, still no model text (fails closed)", broken.map((c) => [c.cefr, c.journey]), [[null, null], [null, null]]);
  ok("the page loads the cards through withApprovedLevels", /withPoints\(await withApprovedLevels\(supabase, await fetchChildren\(supabase\)\)\)/.test(page));
}

console.log("=== rollbacks (review M-1): both files run, then both migrations paste again ===");
{
  const exec = async (sql) => { try { await db.exec(sql); return null; } catch (e) { await db.exec("ROLLBACK").catch(() => {}); return e.message; } };
  const heldNotPublished = await q(`SELECT d.id, d.held_row FROM public.cefr_assessment_drafts d
                                     WHERE d.held_row IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cefr_assessments c WHERE c.id = d.id) ORDER BY d.id`);
  const approvedPublished = await snapshot((await q(`SELECT id FROM public.cefr_assessment_drafts WHERE status = 'approved' ORDER BY id`)).map((r) => r.id));
  const draftCount = Number((await one(`SELECT count(*) AS n FROM public.cefr_assessment_drafts`)).n);
  ok("(there are held points not published, to put back)", heldNotPublished.length > 0, heldNotPublished.length);

  ok("ROLLBACK-family-reads-without-ai.sql runs", (await exec(ROLLBACK_FAMILY)) === null);
  ok("  ...and runs a second time", (await exec(ROLLBACK_FAMILY)) === null);
  eq("  ...the family and the child read the profile again, the child the claim and the published report (production's 'before')",
    [await count(PARENT, "student_learning_profiles", "student_id = $1", [KIKI]), await count(KID, "student_learning_profiles", "student_id = $1", [KIKI]),
     await count(KID, "cefr_level_claims"), await count(KID, "student_reports", "id = $1", [R3])], [1, 1, 1, 1]);
  eq("  ...the four policies are back exactly as production had them", (await q(`SELECT tablename, policyname, cmd, roles::text AS roles, qual FROM pg_policies
       WHERE policyname IN ('family_read_children_learning_profiles', 'students_read_own_learning_profile', 'students_read_own_cefr_claim', 'students_read_published_reports') ORDER BY policyname`)).map((p) => [p.policyname, p.cmd, p.roles, p.qual.replace(/\s+/g, " ")]),
    [["family_read_children_learning_profiles", "SELECT", "{authenticated}", "can_view_student(student_id, auth.uid())"],
     ["students_read_own_cefr_claim", "SELECT", "{authenticated}", "(EXISTS ( SELECT 1 FROM students s WHERE ((s.id = cefr_level_claims.student_id) AND (s.linked_user_id = auth.uid()))))"],
     ["students_read_own_learning_profile", "SELECT", "{authenticated}", "is_linked_student(auth.uid(), student_id)"],
     ["students_read_published_reports", "SELECT", "{authenticated}", "(published AND is_linked_student(auth.uid(), student_id))"]]);
  eq("  ...and the report RPC is gone", (await one(`SELECT to_regprocedure('public.get_my_published_reports(uuid)') IS NULL AS gone`)).gone, true);

  ok("ROLLBACK-cefr-model-drafts.sql runs", (await exec(ROLLBACK_DRAFTS)) === null);
  eq("  ...every held point that was not published is back, byte for byte from held_row", await snapshot(heldNotPublished.map((h) => h.id)), heldNotPublished.map((h) => h.held_row));
  eq("  ...the points teachers approved stay as the teachers published them", await snapshot(approvedPublished.map((j) => j.id)), approvedPublished);
  eq("  ...the drafts table is gone, every draft kept in the copy", [(await one(`SELECT to_regclass('public.cefr_assessment_drafts') IS NULL AS gone`)).gone,
    Number((await one(`SELECT count(*) AS n FROM public.cefr_assessment_drafts_rolled_back`)).n)], [true, draftCount]);
  eq("  ...which no API role can read", [(await as(ADMIN, `SELECT count(*) FROM public.cefr_assessment_drafts_rolled_back`)).err !== null,
    (await as(null, `SELECT count(*) FROM public.cefr_assessment_drafts_rolled_back`, [], { role: "service_role" })).err !== null], [true, true]);
  eq("  ...triggers and functions gone", [Number((await one(`SELECT count(*) AS n FROM pg_trigger WHERE tgname IN ('cefr_model_point_guard', 'cefr_published_point_removed')`)).n),
    Number((await one(`SELECT count(*) AS n FROM pg_proc WHERE proname IN ('approve_cefr_draft', 'discard_cefr_draft', 'cefr_point_is_model_made', 'cefr_draft_staff_can', 'cefr_model_point_guard', 'cefr_published_point_removed', 'cefr_draft_write_guard')`)).n)], [0, 0]);
  ok("  ...approved level-defense points exist, so the wider source CHECK stays (the narrow one would refuse them)",
    /level_defense_test/.test((await one(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = 'cefr_assessments_source_check'`)).d));
  ok("  ...and it runs a second time", (await exec(ROLLBACK_DRAFTS)) === null);

  ok("the migration pastes again after the rollback", (await exec(FIX)) === null);
  eq("  ...every model-made point is held again (approvals included: they go back to the teachers' queue)",
    [Number((await one(`SELECT count(*) AS n FROM public.cefr_assessments c WHERE c.source IN ('level_defense_test', 'level_defense_evidence') OR (c.source = 'ai_report' AND EXISTS (SELECT 1 FROM public.student_reports r WHERE r.id = c.source_id))`)).n),
     await count(PARENT, "cefr_assessments", "id = $1", [P_R1])], [0, 0]);
  ok("20261117152000 pastes again", (await exec(FAMILY)) === null);
  eq("  ...staff-only again", [await count(PARENT, "student_learning_profiles"), await count(KID, "cefr_level_claims"), await count(KID, "student_reports")], [0, 0, 0]);

  // The narrow-CHECK path: no level-defense point published when the rollback runs.
  await q(`DELETE FROM public.cefr_assessment_drafts WHERE source IN ('level_defense_test', 'level_defense_evidence')`);
  ok("rolled back once more with no level-defense point: both files run", (await exec(ROLLBACK_FAMILY)) === null && (await exec(ROLLBACK_DRAFTS)) === null);
  eq("  ...the source CHECK is production's five values again",
    (await one(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = 'cefr_assessments_source_check'`)).d.match(/'([^']+)'/g).map((x) => x.slice(1, -1)).sort(),
    ["ai_report", "exam", "manual", "transcript", "vocab_analysis"]);
  ok("and both migrations paste once more on top", (await exec(FIX)) === null && (await exec(FAMILY)) === null);
}

// =================================================================== part 3
console.log("=== the source: every writer and reader ===");
const walk = (dir) => readdirSync(dir).flatMap((e) => { const f = join(dir, e); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(e) ? [f] : []; });
const fnFiles = walk(FUNCTIONS).map((f) => [f.slice(repo.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]);
const srcFiles = walk(resolve(repo, "src")).map((f) => [f.slice(repo.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]);
const uses = (files, table) => files.flatMap(([f, t]) => {
  const out = []; const re = new RegExp(`from\\(\\s*["']${table}["']\\s*\\)([\\s\\S]{0,80})`, "g"); let m;
  while ((m = re.exec(t))) out.push([f, /^\s*\.(insert|upsert|update|delete)\b/.test(m[1]) ? "write" : "read"]);
  return out;
});
{
  const fnCefr = uses(fnFiles, "cefr_assessments");
  eq("no edge function writes cefr_assessments (the approval RPCs are the only path for a model's level)", fnCefr.filter(([, k]) => k === "write"), []);
  eq("the edge functions that read it (published points only, now)", [...new Set(fnCefr.map(([f]) => f))].sort(),
    ["supabase/functions/analyze-transcript/index.ts", "supabase/functions/cefr-defense/index.ts", "supabase/functions/chat/index.ts",
     "supabase/functions/generate-student-report/index.ts", "supabase/functions/refresh-student-profile/index.ts"].sort());
  const fnDrafts = uses(fnFiles, "cefr_assessment_drafts");
  eq("only the two model writers touch the drafts: they insert, and cefr-defense reads a draft's status for the child's progress (round 3, N-3; never its level)", fnDrafts.map(([f, k]) => `${f}:${k}`).sort(),
    ["supabase/functions/cefr-defense/index.ts:read", "supabase/functions/cefr-defense/index.ts:write", "supabase/functions/generate-student-report/index.ts:write"]);
  ok("  ...that read selects only status and source_id", /from\("cefr_assessment_drafts"\)\.select\("status, source_id"\)/.test(fnFiles.find(([f]) => f === "supabase/functions/cefr-defense/index.ts")[1]));
  ok("the chat assistant never reads the drafts (its CEFR tool reads cefr_assessments through the caller)", !fnFiles.find(([f]) => f === "supabase/functions/chat/index.ts")[1].includes("cefr_assessment_drafts"));
  ok("nor does the reception feed or refresh-student-profile", ["reception-feed", "refresh-student-profile"].every((n) => !(fnFiles.find(([f]) => f === `supabase/functions/${n}/index.ts`)?.[1] ?? "").includes("cefr_assessment_drafts")));
  const srcCefr = uses(srcFiles, "cefr_assessments");
  eq("the browser never writes cefr_assessments", srcCefr.filter(([, k]) => k === "write"), []);
  const srcDrafts = uses(srcFiles, "cefr_assessment_drafts");
  eq("the browser reads the drafts in one place, CefrDraftsCard", srcDrafts.map(([f, k]) => `${f}:${k}`), ["src/components/cefr/CefrDraftsCard.tsx:read"]);
  const shownIn = srcFiles.filter(([f, t]) => f !== "src/components/cefr/CefrDraftsCard.tsx" && /<CefrDraftsCard\b/.test(t)).map(([f]) => f).sort();
  eq("CefrDraftsCard is shown on two staff pages only", shownIn, ["src/pages/StudentDetail.tsx", "src/pages/TeacherClassDetail.tsx"]);
  const app = readFileSync(resolve(repo, "src", "App.tsx"), "utf8");
  ok("  ...StudentDetail is an admin route, TeacherClassDetail a teacher/admin route",
    /path="\/students\/:id" element={<ProtectedRoute allowedRole="admin"><StudentDetail/.test(app)
    && /path="\/teacher\/classes\/:id" element={<ProtectedRoute allowedRole={\["teacher", "admin"\]}><TeacherClassDetail/.test(app));
  const prof = uses(srcFiles, "student_learning_profiles").map(([f]) => f);
  eq("the browser reads the learning profile in two places: the admin's LearningJourneyCard, and FamilyDashboard's fetchChildren (RLS now returns a family nothing, and withApprovedLevels drops it)",
    [...new Set(prof)].sort(), ["src/components/student/LearningJourneyCard.tsx", "src/pages/FamilyDashboard.tsx"]);
  ok("  ...LearningJourneyCard is shown only on the admin StudentDetail", srcFiles.filter(([f, t]) => /<LearningJourneyCard\b/.test(t)).map(([f]) => f).join() === "src/pages/StudentDetail.tsx");
  eq("the browser never reads cefr_level_claims or cefr_defense_tests directly", [...uses(srcFiles, "cefr_level_claims"), ...uses(srcFiles, "cefr_defense_tests")], []);
  // Review M-2: the new child page is safe against the OLD cefr-defense too
  // (so the app can go out first): it renders no field the old function
  // filled with AI output, and treats any status it does not know as "waiting".
  {
    const page = srcFiles.find(([f]) => f === "src/pages/StudentDefendLevel.tsx")[1]
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    eq("StudentDefendLevel reads none of result, stage_score, evidence, level_estimate, rationale, defended, skill_notes, next_steps",
      ["result", "stage_score", "evidence", "level_estimate", "rationale", "defended", "skill_notes", "next_steps"].filter((w) => new RegExp(`\\b${w}\\b`).test(page)), []);
    ok("  ...'reviewed' only for the two statuses the new function sends; anything else reads 'submitted, waiting'",
      /const reviewedByTeacher = claim\?\.status === "reviewed" \|\| claim\?\.status === "set_by_teacher";/.test(page));
  }
  const card = srcFiles.find(([f]) => f === "src/components/cefr/CefrDraftsCard.tsx")[1];
  ok("the card decides only through approve_cefr_draft / discard_cefr_draft", /rpc\("approve_cefr_draft"/.test(card) && /rpc\("discard_cefr_draft"/.test(card) && !/\.(insert|update|upsert|delete)\(/.test(card));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
