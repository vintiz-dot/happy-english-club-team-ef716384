// Admin > Voices (20261126090000 and src/lib/voiceAdmin.ts).
//
// Held here: (1) the page's read and the laptop's publish are admin only; (2) a snapshot may carry
// counts, rates and seconds only: an unknown key, or an extra field on a child, is refused, so a
// voiceprint cannot be sent by mistake; (3) the overview counts groups, answers and how often the
// shown guess matched the teacher; (4) only the last 60 snapshots stay; (5) the page's wording
// rules: a child is "compared with" after 20 s, a model is judged only after 30 answers, "wrong"
// above 1 in 50 is too many (precision first, 28 Nov 2026), and the table is ready to choose from at 150 answers;
// (6) the Lark engine's health part (20261128190000) is accepted, and refused when it would name a child.
// The dependencies (the voice step's tables) are stubbed with the columns this migration reads;
// lesson-monitor-voiceprints.test.mjs holds the real ones. Everything below is made up.
import { PGlite } from "@electric-sql/pglite";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIG = process.argv.slice(2).find((f) => f.includes("20261126090000_voice_admin_overview"))
  ?? resolve(repo, "supabase/migrations/20261126090000_voice_admin_overview.sql");
const HEALTH_MIG = process.argv.slice(2).find((f) => f.includes("20261128190000_voice_stats_health"))
  ?? resolve(repo, "supabase/migrations/20261128190000_voice_stats_health.sql");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---------------------------------------------------------------- the pure page logic
const out = await build({ entryPoints: [resolve(repo, "src/lib/voiceAdmin.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "voice-admin-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const M = await import(pathToFileURL(file).href);

const A = "a".repeat(8) + "-0000-4000-8000-000000000000", B = "b".repeat(8) + "-0000-4000-8000-000000000000", C = "c".repeat(8) + "-0000-4000-8000-000000000000";
const acc = (n, right, wrong, thr = 0.66, sweep = []) => ({ n, threshold: thr, named_correct: right, named_wrong: wrong, not_sure: n - right - wrong,
  named_correct_pct: n ? Math.round(1000 * right / n) / 10 : null, named_wrong_pct: n ? Math.round(1000 * wrong / n) / 10 : null,
  not_sure_pct: n ? Math.round(1000 * (n - right - wrong) / n) / 10 : null, sweep });
const base = () => ({
  children: [
    { student_id: A, name: "Bee", status: "granted", recorded_at: "2026-11-24" },
    { student_id: B, name: "Max", status: "granted", recorded_at: "2026-11-24" },
    { student_id: C, name: "Gone", status: "withdrawn", recorded_at: "2026-11-25" }],
  reports: { total: 6, with_voice_groups: 0 },
  groups: { total: 0, answered: 0, child: 0, several: 0, teacher: 0, unknown: 0, suggested: 0, suggested_answered_child: 0, suggested_right: 0, learned: 0, waiting_to_learn: 0 },
  by_class: [], by_week: [], snapshot: null,
});

{
  const o = base();
  const h = M.headline(o);
  eq("no snapshot: nobody is known by voice", [h.consented, h.withdrawn, h.known], [2, 1, 0]);
  eq("no snapshot: seconds are unknown, not zero", M.childRows(o).map((r) => r.seconds), [null, null, null]);
  ok("no snapshot counts as stale", M.snapshotAge(o, new Date()).stale === true);
  eq("the first unfinished step is the laptop's numbers", M.nextSteps(o).map((s) => s.done), [true, false, false, false, false, false]);
}
{
  const o = base();
  o.snapshot = { published_at: "2026-11-26T01:00:00Z", stats: {
    enrolment: [{ student_id: A, seconds: 75, samples: 4 }, { student_id: B, seconds: 12, samples: 1 }],
    settings: { shown_model: "ecapa", enrol_min_s: 20 },
    accuracy: {
      ecapa: acc(200, 150, 6, 0.66, [{ threshold: 0.6, named: 170, wrong: 14 }, { threshold: 0.7, named: 120, wrong: 4 }]),
      titanet: acc(200, 160, 4),
      campp: acc(20, 15, 0),
      eres: acc(0, 0, 0),
    } } };
  const rows = M.childRows(o);
  eq("children: learning first, then compared, withdrawn last", rows.map((r) => [r.name, r.state]), [["Max", "learning"], ["Bee", "compared"], ["Gone", "withdrawn"]]);
  eq("a minute of voice fills the bar", rows.find((r) => r.name === "Bee").fraction, 1);
  eq("headline counts the child with 75 s as known, the one with 12 s not", M.headline(o).known, 1);
  const m = Object.fromEntries(M.modelRows(o).map((r) => [r.model, r]));
  eq("2% wrong with 200 answers is usable", m.titanet.verdict, "usable");
  eq("3% wrong is too many now that the limit is 2% (6 of 200)", m.ecapa.verdict, "too-many-wrong");
  eq("20 answers are too few to judge", m.campp.verdict, "too-few");
  eq("no answers", m.eres.verdict, "no-answers");
  ok("the shown model is marked", m.ecapa.shown && !m.titanet.shown);
  eq("usable models come first, best first", M.modelRows(o).map((r) => r.model), ["titanet", "ecapa", "campp", "eres"]);
  eq("ready to choose at 200 answers, best usable model named", [M.readyToChoose(o).ready, M.readyToChoose(o).best], [true, "titanet"]);
  eq("the first four steps are done", M.nextSteps(o).slice(0, 2).every((s) => s.done), true);
}
{
  const o = base();
  o.snapshot = { published_at: "2026-11-26T01:00:00Z", stats: { accuracy: { ecapa: acc(100, 70, 12, 0.66, [
    { threshold: 0.6, named: 90, wrong: 15 }, { threshold: 0.7, named: 60, wrong: 3 }, { threshold: 0.8, named: 20, wrong: 0 }]) } } };
  const r = M.modelRows(o)[0];
  eq("12% wrong is too many", r.verdict, "too-many-wrong");
  eq("the page names the lowest threshold with 1 in 50 or fewer wrong (precision first: 98 %)", r.saferThreshold, 0.8);
  ok("the limit is 2 % wrong", M.VOICE_RULES.wrongPctLimit === 2);
  ok("100 answers are not enough to choose", M.readyToChoose(o).ready === false && M.readyToChoose(o).answers === 100);
}
{
  const o = base();
  eq("no health part, no health card", M.healthView(o), null);
  const T = (s, n, r, w) => ({ seconds: s, named_s: n, right_s: r, wrong_s: w, precision: n ? r / n : null, coverage: s ? n / s : null, wrong_share: s ? w / s : null });
  o.snapshot = { published_at: "2026-11-28T01:00:00Z", stats: { health: {
    engine: "lark/1", last_run: "2026-11-28T09:00:00+00:00",
    lessons: [{ date: "2026-11-28", at: "2026-11-28T09:00:00+00:00", tracks: ["mic1", "mic2"], residual_ms: { mic1: 1.4, mic2: 15.2 }, rejected: { mic3: "claps_off_the_line" }, processing_s: 1500 }],
    precision: { basis: "blind", model: "ecapa", chosen: { ...T(1000, 600, 590, 10), threshold: 0.7 }, buckets: { "<1.2 s": T(100, 0, 0, 0), "3-8 s": T(500, 400, 396, 4) }, best: "ecapa", min_precision: 0.98 } } } };
  const h = M.healthView(o);
  eq("health: engine and last run", [h.engine, h.lastRun], ["lark/1", "2026-11-28T09:00:00+00:00"]);
  eq("health: each mic with its residual; over 12 ms or rejected is flagged", h.lessons[0].residuals.map((r) => [r.mic, r.bad]), [["mic1", false], ["mic2", true], ["mic3", true]]);
  eq("health: processing in minutes", h.lessons[0].minutes, 25);
  eq("health: 590 of 600 named is 98.3 %, meets the 98 % target", [h.precision.precisionPct, h.precision.meetsTarget, h.precision.coveragePct], [98.3, true, 60]);
  eq("health: buckets by length", h.precision.buckets.map((b) => [b.label, b.precisionPct]), [["<1.2 s", null], ["3-8 s", 99]]);
}
{
  const o = base();
  o.snapshot = { published_at: "2026-11-26T01:00:00Z", stats: {} };
  ok("a snapshot 10 hours old is fresh", M.snapshotAge(o, new Date("2026-11-26T11:00:00Z")).stale === false);
  ok("a snapshot 40 hours old is stale", M.snapshotAge(o, new Date("2026-11-27T17:00:00Z")).stale === true);
  eq("percent with no denominator is nothing, not 0", [M.pct(0, 0), M.pct(1, 3), M.showPct(null)], [null, 33.3, "–"]);
}

// ---------------------------------------------------------------- the migration
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE FUNCTION public.lesson_monitor__is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT auth.uid() IS NOT NULL AND COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) $f$;
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
  CREATE TABLE public.lesson_monitor_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.lesson_monitor_voiceprint_consents (student_id uuid PRIMARY KEY, status text NOT NULL, note text NOT NULL,
    recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.lesson_monitor_voice_groups (report_id uuid NOT NULL, group_key text NOT NULL, class_id uuid NOT NULL,
    session_date date NOT NULL, suggested_student uuid, answer text, student_id uuid, answered_at timestamptz, learned_at timestamptz,
    PRIMARY KEY (report_id, group_key));
`);
await db.exec(readFileSync(MIG, "utf8"));
ok("applies on top of the voice step", true);
{ let again = null; try { await db.exec(readFileSync(MIG, "utf8")); } catch (e) { again = e.message; } ok("and applies a second time", again === null, again ?? ""); }
{
  let refusedMsg = null;
  const fresh = new PGlite();
  try { await fresh.exec(readFileSync(MIG, "utf8")); } catch (e) { refusedMsg = e.message; }
  ok("refuses to install without the voice step", /Refusing to install/.test(refusedMsg ?? ""), refusedMsg ?? "it installed");
}

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), TEACHER = U(2);
await q(`INSERT INTO auth.users VALUES ($1),($2)`, [ADMIN, TEACHER]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher')`, [ADMIN, TEACHER]);
async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const r = await fn(); await db.exec("COMMIT"); return r; } catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rpc = (uid, s, p) => tryAs(uid, () => db.query(s, p));
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);
const call = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows[0];

refused("a teacher cannot read the overview", await rpc(TEACHER, `SELECT public.lesson_monitor_voice_overview()`), /Admins only/);
refused("a teacher cannot publish numbers", await rpc(TEACHER, `SELECT public.lesson_monitor_publish_voice_stats('{}'::jsonb)`), /Admins only/);
refused("nobody signed in cannot either", await rpc(null, `SELECT public.lesson_monitor_voice_overview()`), /Admins only|permission/);

// ---- the overview counts
const bee = (await one(`INSERT INTO public.students (full_name) VALUES ('Bee') RETURNING id`)).id;
const max = (await one(`INSERT INTO public.students (full_name) VALUES ('Max') RETURNING id`)).id;
const cls = (await one(`INSERT INTO public.classes (name) VALUES ('Venus') RETURNING id`)).id;
await q(`INSERT INTO public.lesson_monitor_voiceprint_consents VALUES ($1,'granted','form',$3,now()),($2,'withdrawn','phoned',$3,now())`, [bee, max, ADMIN]);
const r1 = (await one(`INSERT INTO public.lesson_monitor_reports DEFAULT VALUES RETURNING id`)).id;
await q(`INSERT INTO public.lesson_monitor_reports DEFAULT VALUES`);
const G = (key, sug, ans, stu, learned) => q(
  `INSERT INTO public.lesson_monitor_voice_groups (report_id, group_key, class_id, session_date, suggested_student, answer, student_id, answered_at, learned_at)
   VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,CASE WHEN $5::text IS NULL THEN NULL ELSE now() END,$7)`, [r1, key, cls, sug, ans, stu, learned ? new Date() : null]);
await G("G1", bee, "child", bee, true);   // shown guess right
await G("G2", bee, "child", max, false);  // shown guess wrong
await G("G3", null, "several", null, false);
await G("G4", max, null, null, false);    // not answered yet
{
  const o = (await call(ADMIN, `SELECT public.lesson_monitor_voice_overview() AS o`)).o;
  eq("two children with consent records, in name order", o.children.map((c) => [c.name, c.status]), [["Bee", "granted"], ["Max", "withdrawn"]]);
  eq("reports: 2, one has voice groups", o.reports, { total: 2, with_voice_groups: 1 });
  eq("groups counted", [o.groups.total, o.groups.answered, o.groups.child, o.groups.several, o.groups.suggested], [4, 3, 2, 1, 3]);
  eq("shown guess: 1 right of 2 answered as a child", [o.groups.suggested_right, o.groups.suggested_answered_child], [1, 2]);
  eq("one learned, two answered and waiting", [o.groups.learned, o.groups.waiting_to_learn], [1, 2]);
  eq("by class", [o.by_class[0].class_name, o.by_class[0].groups, o.by_class[0].answered], ["Venus", 4, 3]);
  eq("by week has this week", [o.by_week.length, o.by_week[0].groups], [1, 4]);
  eq("no snapshot yet", o.snapshot, null);
}

// ---- publishing
const snap = { accuracy: { ecapa: { n: 3, threshold: 0.66 } }, enrolment: [{ student_id: bee, seconds: 61.5, samples: 3 }], settings: { shown_model: "ecapa" } };
eq("the admin publishes a snapshot", (await call(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb) AS r`, [JSON.stringify(snap)])).r.id > 0, true);
{
  const o = (await call(ADMIN, `SELECT public.lesson_monitor_voice_overview() AS o`)).o;
  eq("the overview returns the latest snapshot", o.snapshot.stats.enrolment[0].seconds, 61.5);
}
refused("an unknown key is refused (nothing but counts, rates and seconds)",
  await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`, [JSON.stringify({ voiceprints: [[0.1, 0.2]] })]), /accuracy, enrolment and settings only/);
refused("a child's embedding cannot ride along in the enrolment list",
  await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`, [JSON.stringify({ enrolment: [{ student_id: bee, seconds: 5, samples: 1, embedding: [0.1] }] })]), /student_id, seconds and samples only/);
refused("a snapshot must be an object", await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats('[]'::jsonb)`), /an object/);
{
  const health = { engine: "lark/1", last_run: "2026-11-28T09:00:00Z",
    lessons: [{ date: "2026-11-28", at: "2026-11-28T09:00:00Z", tracks: ["mic1"], residual_ms: { mic1: 1.2 }, rejected: {}, processing_s: 900 }],
    precision: { basis: "all", model: "ecapa", chosen: null, buckets: {}, best: null, min_precision: 0.98 } };
  refused("before 20261128190000 a health part is refused", await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`,
    [JSON.stringify({ settings: {}, health })]), /accuracy, enrolment and settings only/);
  await db.exec(readFileSync(HEALTH_MIG, "utf8"));
  await db.exec(readFileSync(HEALTH_MIG, "utf8"));
  ok("the health migration applies twice", true);
  eq("the admin publishes a snapshot with its health part", (await call(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb) AS r`,
    [JSON.stringify({ settings: {}, health })])).r.id > 0, true);
  refused("health may not name a child", await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`,
    [JSON.stringify({ health: { ...health, lessons: [{ ...health.lessons[0], children: [{ student_id: bee }] }] } })]), /may not name a child/);
  refused("health holds only its four parts", await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`,
    [JSON.stringify({ health: { ...health, audio: "x" } })]), /engine, last_run, lessons and precision only/);
  refused("the rest is refused as before", await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`,
    [JSON.stringify({ voiceprints: [] })]), /accuracy, enrolment, settings and health only/);
}
refused("a huge snapshot is refused",
  await rpc(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats($1::jsonb)`, [JSON.stringify({ accuracy: { x: "y".repeat(310000) } })]), /too large/);
for (let i = 0; i < 65; i++) await call(ADMIN, `SELECT public.lesson_monitor_publish_voice_stats('{"settings":{}}'::jsonb) AS r`);
eq("only the last 60 snapshots stay", Number((await one(`SELECT count(*) AS n FROM public.lesson_monitor_voice_stats`)).n), 60);
{
  const rows = await as(ADMIN, async () => (await db.query(`SELECT count(*) AS n FROM public.lesson_monitor_voice_stats`)).rows);
  const t = await as(TEACHER, async () => (await db.query(`SELECT count(*) AS n FROM public.lesson_monitor_voice_stats`)).rows);
  eq("an admin reads the snapshots table, a teacher sees none", [Number(rows[0].n), Number(t[0].n)], [60, 0]);
  refused("nobody can write the table directly", await rpc(ADMIN, `INSERT INTO public.lesson_monitor_voice_stats (published_by, stats) VALUES ($1,'{}')`, [ADMIN]), /permission denied/);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
