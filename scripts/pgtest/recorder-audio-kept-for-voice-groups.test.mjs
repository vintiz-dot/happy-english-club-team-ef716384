// 20261127140000_recorder_audio_kept_for_voice_groups.sql: lesson audio stays while the report's voice
// groups wait for a teacher, at most 7 days; a report without voice groups still goes after 3 hours.
//
// Runs the REAL chain (the same migrations as recorder-audio-grace-3h.test.mjs, whose prelude it reads so the
// two never drift) and then this file. Held: unanswered groups keep the audio (also when the retention run asks
// as the service role and when the teacher's RLS would hide the groups); all answered, no groups, or 7 days
// old: due; every older condition (3 hours, a report_made run, complete) still applies; idempotent; refuses a
// database without the voice step. Every row is made up.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints", "recorder_delete_after_transcribed", "recorder_audio_grace_3h",
  "recorder_audio_kept_for_voice_groups"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: recorder-audio-kept-for-voice-groups.test.mjs <its 9 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const sibling = readFileSync(resolve(here, "recorder-audio-grace-3h.test.mjs"), "utf8");
const PRELUDE = sibling.slice(sibling.indexOf("const PRELUDE = `") + "const PRELUDE = `".length, sibling.indexOf("\n`;", sibling.indexOf("const PRELUDE = `")));
if (!PRELUDE.includes("CREATE ROLE")) { console.log("could not read the prelude of recorder-audio-grace-3h.test.mjs"); console.log("0 passed, 1 failed"); process.exit(1); }

async function build(upTo) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, upTo)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[8], "utf8");
{
  const d = await build(5);   // recorder and pilot, no voice step, no 24 h rule
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; }
  ok("refuses to install without 20261124140000", /Refusing to install/.test(msg ?? ""), msg ?? "it installed");
}
const db = await build(9);
await db.exec(MINE);
ok("installs on the real chain, and a second time", true);
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
eq("the retention function keeps its grants", await one(
  `SELECT has_function_privilege('anon', 'public.recorder_transcribed_audio_deletable(uuid,timestamptz)', 'EXECUTE') AS anon,
          has_function_privilege('service_role', 'public.recorder_transcribed_audio_deletable(uuid,timestamptz)', 'EXECUTE') AS svc`), { anon: false, svc: true });

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher')`, [ADMIN, VICTOR, OTHER]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;
async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; } catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const raw = async (s, p) => { await db.exec(`SET session_replication_role = replica`); try { return await q(s, p); } finally { await db.exec(`SET session_replication_role = DEFAULT`); } };
let day = 0;
const recording = async () => {
  day++;
  const sid = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
     VALUES ($1, $2, CURRENT_DATE - $3::int, '17:30', '19:00') RETURNING id`, [VENUS, tVictor, 10 + day])).id;
  return (await raw(
    `INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date, scheduled_start, scheduled_end,
       capture_opens_at, capture_closes_at, status, format, max_duration_ms, min_bytes_per_sec, clock_tolerance_ms,
       late_after_ms, evidence_min_fraction, started_by, started_at, ended_at, completed_at, delete_after, purpose)
     SELECT $1, s.id, s.id, s.date, (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
       (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '5 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '10 minutes',
       'complete', 'flac', 6300000, 4000, 15000, 600000, 0.5, $3,
       (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '4 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '5 minutes',
       now(), now() + interval '20 days', 'lesson'
     FROM public.sessions s WHERE s.id = $2 RETURNING id`, [VENUS, sid, VICTOR]))[0].id;
};
const report = async (rec, hoursAgo) => {
  const s = await one(`SELECT session_id, session_date FROM public.class_recordings WHERE id = $1`, [rec]);
  const id = (await raw(
    `INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, made_at, job_version, body)
     VALUES ($1, $2, $3, $4, $5, $5, now() - $6::numeric * interval '1 hour', 'pilot-0.1', '{"schema":"hec-lesson-monitor/1"}'::jsonb) RETURNING id`,
    [rec, VENUS, s.session_id, s.session_date, VICTOR, hoursAgo]))[0].id;
  await raw(`INSERT INTO public.lesson_monitor_runs (recording_id, class_id, outcome, by_user, at) VALUES ($1, $2, 'report_made', $3, now() - $4::numeric * interval '1 hour')`,
    [rec, VENUS, VICTOR, hoursAgo]);
  return id;
};
const groups = async (rep, rec, answered) => {
  const s = await one(`SELECT session_date FROM public.class_recordings WHERE id = $1`, [rec]);
  let i = 0;
  for (const a of answered) {
    i++;
    await raw(`INSERT INTO public.lesson_monitor_voice_groups (report_id, group_key, recording_id, class_id, session_date, seconds, line_count, answer, answered_by, answered_at)
      VALUES ($1, $2, $3, $4, $5, 10, 2, $6, CASE WHEN $6::text IS NULL THEN NULL ELSE $7::uuid END, CASE WHEN $6::text IS NULL THEN NULL ELSE now() END)`,
      [rep, `G${i}`, rec, VENUS, s.session_date, a ? "unknown" : null, VICTOR]);
  }
};
const deletable = async (rec, role = "service_role", uid = null) =>
  (await as(uid, () => db.query(`SELECT public.recorder_transcribed_audio_deletable($1) AS d`, [rec]), role)).rows[0].d;

const NONE = await recording();    await report(NONE, 4);
const WAIT = await recording();    await groups(await report(WAIT, 4), WAIT, [true, false]);
const DONE = await recording();    await groups(await report(DONE, 4), DONE, [true, true]);
const OLD = await recording();     await groups(await report(OLD, 7 * 24 + 1), OLD, [false]);
const YOUNG = await recording();   await groups(await report(YOUNG, 2), YOUNG, [true]);

eq("no voice groups: due 3 hours after the report, as before", await deletable(NONE), true);
eq("a voice group still unanswered: the audio stays", await deletable(WAIT), false);
eq("every group answered: due", await deletable(DONE), true);
eq("unanswered but the report is over 7 days old: due", await deletable(OLD), true);
eq("all answered but only 2 hours old: the 3 hours still apply", await deletable(YOUNG), false);
eq("asked as another teacher, who cannot see the groups: still kept (the check does not depend on RLS)", await deletable(WAIT, "authenticated", OTHER), false);
{
  const due = (await as(null, () => db.query(`SELECT recording_id FROM public.recorder_retention_due(now())`), "service_role")).rows.map((r) => r.recording_id);
  eq("the hourly retention run follows the same rule", [NONE, WAIT, DONE, OLD, YOUNG].map((r) => due.includes(r)), [true, false, true, true, false]);
}
await raw(`UPDATE public.lesson_monitor_voice_groups SET answer = 'teacher', answered_by = $2, answered_at = now() WHERE recording_id = $1 AND answered_at IS NULL`, [WAIT, VICTOR]);
eq("once the teacher answers the last group, it becomes due", await deletable(WAIT), true);
eq("the helper is closed to anon", (await one(`SELECT has_function_privilege('anon', 'public.recorder__voice_groups_waiting(uuid)', 'EXECUTE') AS a`)).a, false);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
