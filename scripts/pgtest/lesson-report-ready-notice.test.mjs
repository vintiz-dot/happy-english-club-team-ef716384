// "Lesson report ready to review" in the teacher's bell: 20261127100000_lesson_report_ready_notice.sql.
//
// Runs the lesson monitor's and the lesson reports' REAL migrations (with lesson-reports.test.mjs's own prelude,
// read from that file so the two suites build the same database), a notifications table as production has it,
// then this migration. What it holds: a ready draft notifies the lesson's teacher once; a rebuilt draft replaces
// the unread notice instead of adding one; a building or failed draft, and an approved report, notify nobody; no
// other teacher, parent or admin gets it; the notice names no child; the draft is saved even when the notice fails.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261121130000_lesson_reports", "lesson_report_ready_notice"].map(find);
if (CHAIN.some((f) => !f)) {
  console.log("usage: lesson-report-ready-notice.test.mjs <its 7 migrations>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, "lesson-reports.test.mjs"), "utf8");
const PRELUDE = src.match(/const PRELUDE = `([\s\S]*?)`;/)[1];
const NOTIFICATIONS = `
  CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, journal_id uuid, type text NOT NULL,
    title text NOT NULL, message text, is_read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb);
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  CREATE POLICY own ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  GRANT SELECT ON public.notifications TO authenticated;
`;

async function build(withNotifications = true) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  if (withNotifications) await d.exec(NOTIFICATIONS);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, 6)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[6], "utf8");
{
  const d = await build(false);
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  ok("refuses to install without a notifications table", /no notifications table/.test(msg ?? ""), msg ?? "installed");
}
const db = await build();
await db.exec(MINE);
{
  let again = null;
  try { await db.exec(MINE); } catch (e) { again = e.message; }
  ok("applies, and applies a second time", again === null, again ?? "");
}
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), PARENT = U(5);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, PARENT]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'family')`, [ADMIN, VICTOR, OTHER, PARENT]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const tOther = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [OTHER])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tOther])).id;
const kid = (await one(`INSERT INTO public.students (full_name) VALUES ('Child One') RETURNING id`)).id;
await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [kid, VENUS]);
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2,'2026-11-27','17:30','19:00') RETURNING id`, [VENUS, tVictor])).id;

async function as(uid, sql, p) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const r = await db.query(sql, p); await db.exec("COMMIT"); return r.rows; } catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const notices = () => q(`SELECT user_id, type, title, message, is_read, metadata->>'session_id' AS sid, (metadata->>'run')::int AS run
  FROM public.notifications ORDER BY created_at, run`);

const run1 = (await as(ADMIN, `SELECT public.lesson_report_claim($1) r`, [LESSON]))[0].r;
eq("a draft being built notifies nobody", (await notices()).length, 0);
await as(ADMIN, `SELECT public.lesson_report_finish($1, $2, '{"summary":"x"}'::jsonb)`, [LESSON, run1]);
let n = await notices();
eq("a ready draft notifies the lesson's teacher (not the class's default one, not the admin who built it)",
  n.map((x) => [x.user_id, x.type, x.sid, x.run]), [[VICTOR, "lesson_report_ready", LESSON, 1]]);
eq("it names the class and the date, no child", [n[0].message.includes("Venus, 27 Nov"), n[0].message.includes("Child")], [true, false]);
eq("the teacher reads it; another teacher and a parent read nothing", [
  (await as(VICTOR, `SELECT id FROM public.notifications`)).length, (await as(OTHER, `SELECT id FROM public.notifications`)).length,
  (await as(PARENT, `SELECT id FROM public.notifications`)).length], [1, 0, 0]);

await q(`UPDATE public.lesson_report_drafts SET started_at = now() - interval '20 minutes' WHERE session_id = $1`, [LESSON]);
const run2 = (await as(ADMIN, `SELECT public.lesson_report_claim($1) r`, [LESSON]))[0].r;
await as(ADMIN, `SELECT public.lesson_report_finish($1, $2, '{"summary":"y"}'::jsonb)`, [LESSON, run2]);
eq("a rebuilt draft replaces the unread notice", (await notices()).map((x) => x.run), [2]);
await q(`UPDATE public.notifications SET is_read = true`);
await q(`UPDATE public.lesson_report_drafts SET started_at = now() - interval '20 minutes' WHERE session_id = $1`, [LESSON]);
const run3 = (await as(ADMIN, `SELECT public.lesson_report_claim($1) r`, [LESSON]))[0].r;
await as(ADMIN, `SELECT public.lesson_report_finish($1, $2, NULL, NULL, NULL, 'The AI service is not set up')`, [LESSON, run3]);
eq("a failed build notifies nobody (the read notice stays)", (await notices()).map((x) => [x.run, x.is_read]), [[2, true]]);

const L2 = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2,'2026-11-26','17:30','19:00') RETURNING id`, [VENUS, tVictor])).id;
await q(`INSERT INTO public.lesson_reports (session_id, class_id, class_part, approved_by) VALUES ($1, $2, '{}'::jsonb, $3)`, [L2, VENUS, VICTOR]);
const approved = (await q(`SELECT 1 FROM public.lesson_reports WHERE session_id = $1`, [L2])).length === 1;
if (approved) {
  const r = (await as(ADMIN, `SELECT public.lesson_report_claim($1, true) r`, [L2]))[0].r;
  await as(ADMIN, `SELECT public.lesson_report_finish($1, $2, '{"summary":"z"}'::jsonb)`, [L2, r]);
  eq("a draft of an approved report notifies nobody", (await notices()).filter((x) => x.sid === L2).length, 0);
} else {
  ok("a draft of an approved report notifies nobody (lesson_reports row could not be made here)", true);
}

await db.exec(`ALTER TABLE public.notifications ADD CONSTRAINT no_more CHECK (false) NOT VALID`);
const L3 = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2,'2026-11-25','17:30','19:00') RETURNING id`, [VENUS, tVictor])).id;
const r3 = (await as(ADMIN, `SELECT public.lesson_report_claim($1) r`, [L3]))[0].r;
eq("the draft is saved even when the notice cannot be", (await as(ADMIN, `SELECT public.lesson_report_finish($1, $2, '{"summary":"w"}'::jsonb) r`, [L3, r3]))[0].r, true);
eq("and it is ready", (await one(`SELECT status FROM public.lesson_report_drafts WHERE session_id = $1`, [L3])).status, "ready");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
