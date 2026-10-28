// The Stars sync, upgraded in place: 20261027100000 runs for a while in
// production, then 20261028090000 is pasted over it.
//
// The engine test applies every migration before it starts, so it only
// ever sees the fixed engine. Production will not: by the time the fix is
// applied, the old engine may already have refused records under the rules
// the fix corrects - every historical mark as "late" on a first run, and
// withdrawals on their own lesson date. The fix reopens those, and this
// asserts what a child's register ends up as once the next run has judged
// them again.
//
// Takes the same migration list as the engine suite; the last one is the
// upgrade.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// The production-shaped schema the engine suite builds, so the two cannot
// drift apart.
const here = dirname(fileURLToPath(import.meta.url));
const engineSuite = readFileSync(join(here, "stars-sync-engine.test.mjs"), "utf8");
const PRELUDE = /const PRELUDE = `([\s\S]*?)`;/.exec(engineSuite)?.[1];
if (!PRELUDE) throw new Error("could not find the engine suite's PRELUDE");

const db = new PGlite();
await db.exec(PRELUDE);
const one = async (q, p) => (await db.query(q, p)).rows[0];

const U = { mai: "11111111-1111-4111-8111-111111111111", linh: "22222222-2222-4222-8222-222222222222",
            admin: "33333333-3333-4333-8333-333333333333" };
for (const u of Object.values(U)) await db.query(`INSERT INTO auth.users VALUES ($1)`, [u]);
await db.query(`INSERT INTO public.user_roles VALUES ($1,'teacher'),($2,'teacher'),($3,'admin')`, [U.mai, U.linh, U.admin]);
const mai = (await one(`INSERT INTO public.teachers (full_name,user_id) VALUES ('Mai',$1) RETURNING id`, [U.mai])).id;
const STARS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Stars',$1) RETURNING id`, [mai])).id;
const child = async (name) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await db.query(`INSERT INTO public.enrollments (student_id,class_id,start_date) VALUES ($1,$2,'2026-09-01')`, [id, STARS]);
  return id;
};
const APPLE = await child("Apple"), BEE = await child("Bee"), MINH = await child("Minh"), KIWI = await child("Kiwi");
const lesson = async (date) => {
  const id = (await one(
    `INSERT INTO public.sessions (class_id,teacher_id,date,start_time,end_time,status)
     VALUES ($1,$2,$3,'09:00','09:50','Held') RETURNING id`, [STARS, mai, date])).id;
  // HEC's seeded register
  await db.query(`INSERT INTO public.attendance (session_id,student_id,status,marked_by)
                  VALUES ($1,$2,'Present',NULL), ($1,$3,'Present',NULL)`, [id, APPLE, BEE]);
  return id;
};
const PAST = await lesson("2026-10-24");
const TODAY_L = await lesson("2026-10-27");
const NOW = "2026-10-27T03:00:00Z";

for (const f of MIGS.slice(0, -1)) await db.exec(readFileSync(f, "utf8"));
await db.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1, sync_from='2026-10-01'`, [mai]);
await db.query(`INSERT INTO public.stars_class_map (stars_class_id, class_id) VALUES ('19',$1)`, [STARS]);
await db.query(`INSERT INTO public.stars_student_map VALUES ('88',$1),('89',$2),('90',$3)`, [APPLE, BEE, MINH]);

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ev = (seq, kind, payload, over = {}) => ({
  seq, event_id: id(seq), occurred_at: NOW, kind,
  class_ref: "19", student_ref: "88", lesson_date: "2026-10-27", payload, ...over,
});
const asService = async (q, p) => {
  await db.exec(`SET ROLE service_role`);
  try { return (await one(q, p)).r; } finally { await db.exec(`RESET ROLE`); }
};
const page = (events, now = NOW) => asService(
  `SELECT public.stars_sync_apply_page($1::jsonb, $2::bigint, $3::timestamptz) AS r`,
  [JSON.stringify(events), Math.max(...events.map((e) => e.seq)), now]);
const retry = (now = NOW) => asService(`SELECT public.stars_sync_retry_pending(200, $1::timestamptz) AS r`, [now]);
const outcome = async (seq) => (await one(`SELECT outcome FROM public.stars_sync_events WHERE event_id=$1`, [id(seq)]))?.outcome;
const mark = async (student, session) =>
  await one(`SELECT status, marked_by FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [session, student]);

console.log("=== what the engine already in production decided ===");
// A first run on the 27th, with history from the 24th in it.
await page([
  // Made on time - three days before this run.
  ev(10, "attendance", { status: "Absent" }, { lesson_date: "2026-10-24", occurred_at: "2026-10-24T02:30:00Z" }),
  // Genuinely late: Pixel Pal says it was recorded two days after the lesson.
  ev(11, "attendance", { status: "Absent" },
     { student_ref: "89", lesson_date: "2026-10-24", occurred_at: "2026-10-26T09:00:00Z" }),
  // A child nobody has matched yet, then Pixel Pal withdraws that mark -
  // with no lesson date on the withdrawal.
  ev(20, "attendance", { status: "Absent" }, { student_ref: "91" }),
  ev(21, "retraction", { retracts_event_id: id(20), reason: "removed" }, { lesson_date: null }),
]);
// A teacher's mark, a Pixel Pal record that disagrees, then a newer
// Pixel Pal record that agrees with the teacher.
await db.query(`INSERT INTO public.attendance (session_id,student_id,status,marked_by) VALUES ($1,$2,'Absent',$3)`,
  [TODAY_L, MINH, U.linh]);
await page([ev(30, "attendance", { status: "Present" }, { student_ref: "90" })]);
await page([ev(31, "attendance", { status: "Absent" }, { student_ref: "90" })]);

eq("the old engine refused an on-time mark as late, judged when it ran", await outcome(10), "rejected");
eq("  and the late one", await outcome(11), "rejected");
eq("  and refused the withdrawal on its missing date", await outcome(21), "rejected");
eq("  leaving the withdrawn mark waiting", await outcome(20), "skipped_unmapped");
const conflict = await one(`SELECT id, resolved_at FROM public.stars_sync_conflicts WHERE event_id=$1`, [id(30)]);
eq("  and left a conflict open that its newer record had replaced", conflict.resolved_at, null);

console.log("=== the fix, pasted over it ===");
const results = await db.exec(readFileSync(MIGS.at(-1), "utf8"));
const check = results.at(-1).rows[0];
ok("it applies, and its check row says so",
   check.effects_queue && check.held_flips && check.window_fix && check.second_review, JSON.stringify(check));
eq("  reporting the records it reopened", Number(check.reopened), 3);
eq("the replaced conflict is dismissed",
   (await one(`SELECT resolution FROM public.stars_sync_conflicts WHERE id=$1`, [conflict.id])).resolution, "dismissed");

console.log("=== the next run ===");
await retry();
eq("the on-time mark applies", await outcome(10), "applied");
eq("  on Apple's register for that lesson", (await mark(APPLE, PAST)).status, "Absent");
eq("the late one is refused again - on when it was made", await outcome(11), "rejected");
eq("  and Bee keeps HEC's placeholder", (await mark(BEE, PAST)).marked_by, null);
eq("the withdrawal now withdraws its target", await outcome(20), "retracted");

await db.query(`INSERT INTO public.stars_student_map VALUES ('91',$1)`, [KIWI]);
await retry();
eq("so matching the child later does not bring the withdrawn mark back", await outcome(20), "retracted");
eq("  and Kiwi has no mark", await mark(KIWI, TODAY_L), undefined);

console.log("=== pasted twice ===");
let err = null;
try { await db.exec(readFileSync(MIGS.at(-1), "utf8")); } catch (e) { err = e.message; }
eq("a second paste is harmless", err, null);
eq("  and reopens nothing the run has since settled", await outcome(11), "rejected");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
