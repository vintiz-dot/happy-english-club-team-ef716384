// Course book lessons (20261121150000 + the Level 3 seed 20261121151000) and what
// the lesson report draft is told about them.
//
// What matters most: the book's lessons are staff reading (never a family or a
// child), only an admin changes them; which lesson a session covered is set and
// read only by that lesson's staff, with the person and time the server's; the
// seed applies twice; the planned lesson reaches the draft as short facts; and
// the screen's "next lesson" walks the book in order.
//
// The database stand-ins are the lesson speaker marks suite's own (its PRELUDE),
// read from that file so the two cannot drift.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261121130000_lesson_reports", "20261121150000_curriculum_lessons", "20261121151000_od2e_level3_lessons",
  "20261122100000_od2e_level1_lessons", "20261122101000_od2e_level2_lessons"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: curriculum-lessons.test.mjs <its 10 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const speaker = readFileSync(resolve(here, "lesson-speaker-marks.test.mjs"), "utf8");
const PRELUDE = speaker.slice(speaker.indexOf("const PRELUDE = `") + 17, speaker.indexOf("\n`;", speaker.indexOf("const PRELUDE = `")));
ok("borrowed the lesson suite's database stand-ins", PRELUDE.includes("CREATE TABLE public.sessions"));

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
for (const f of CHAIN.slice(0, 2)) await db.exec(readFileSync(f, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
for (const f of CHAIN.slice(2)) await db.exec(readFileSync(f, "utf8"));
ok("applies on top of the lesson reports contract", true);
{
  let again = null;
  try { for (const f of CHAIN.slice(6)) await db.exec(readFileSync(f, "utf8")); } catch (e) { again = e.message; }
  ok("both apply a second time", again === null, again ?? "");
}

console.log("the Level 3 seed");
eq("90 lessons: 18 units x 4, and a Big Question and Wrap Up per pair", Number((await one(`SELECT count(*) n FROM public.curriculum_lessons WHERE level = 3`)).n), 90);
eq("every lesson has an objective and a Student Book page",
  Number((await one(`SELECT count(*) n FROM public.curriculum_lessons WHERE cardinality(objectives) = 0 OR sb_page IS NULL`)).n), 0);
eq("every lesson knows its Big Question",
  Number((await one(`SELECT count(*) n FROM public.curriculum_lessons WHERE big_question IS NULL`)).n), 0);
const u12 = await one(`SELECT * FROM public.curriculum_lessons WHERE level = 3 AND unit_from = 12 AND lesson = 'Get Ready'`);
eq("Unit 12 Get Ready: page, words and strategy", [u12.sb_page, u12.vocabulary.slice(0, 3), u12.reading_strategy, u12.big_question],
  [116, ["zummara", "flute", "djembe"], "Compare and contrast", "How do people make music?"]);
eq("Unit 12 Understand: the grammar point",
  (await one(`SELECT grammar FROM public.curriculum_lessons WHERE level = 3 AND unit_from = 12 AND lesson = 'Understand'`)).grammar,
  "Comparative adjectives with as");
eq("pages run in book order through Units 11 and 12",
  (await q(`SELECT sb_page FROM public.curriculum_lessons WHERE level = 3 AND unit_from IN (11, 12) ORDER BY sb_page`)).map((r) => r.sb_page),
  [106, 108, 110, 112, 114, 116, 118, 120, 122, 124]);

console.log("the Level 1 and Level 2 seeds");
for (const lv of [1, 2]) {
  eq(`Level ${lv}: 90 lessons`, Number((await one(`SELECT count(*) n FROM public.curriculum_lessons WHERE level = $1`, [lv])).n), 90);
  eq(`Level ${lv}: nine Big Questions, one per unit pair`,
    Number((await one(`SELECT count(DISTINCT big_question) n FROM public.curriculum_lessons WHERE level = $1`, [lv])).n), 9);
}
eq("Level 1 Unit 16 Get Ready (its heading lost the unit number; the footer names it)",
  (await one(`SELECT sb_page FROM public.curriculum_lessons WHERE level = 1 AND unit_from = 16 AND lesson = 'Get Ready'`))?.sb_page, 156);
eq("Level 1 Unit 1 Get Ready: page and Big Question",
  [(await one(`SELECT sb_page, big_question FROM public.curriculum_lessons WHERE level = 1 AND unit_from = 1 AND lesson = 'Get Ready'`))].map((r) => [r.sb_page, r.big_question])[0],
  [8, "Who are your family and friends?"]);

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), TAU = U(4), PARENT = U(5), CHILD = U(6);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, TAU, PARENT, CHILD]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'family'),($5,'student')`, [ADMIN, VICTOR, OTHER, PARENT, CHILD]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const tOther = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [OTHER])).id;
const ta = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TAU])).id;
const SKY = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Sky', $1) RETURNING id`, [tVictor])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Pluto', $1) RETURNING id`, [tOther])).id;
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '16:15','17:45') RETURNING id`, [SKY, tVictor])).id;
const ELSEWHERE = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '16:15','17:45') RETURNING id`, [PLUTO, tOther])).id;
await q(`INSERT INTO public.session_participants (session_id, teaching_assistant_id) VALUES ($1,$2)`, [LESSON, ta]);

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows;
const count = async (uid, s, p) => Number((await rowsAs(uid, s, p))[0].n);

console.log("who reads and writes the book's lessons");
for (const [who, uid] of [["a teacher", VICTOR], ["a TA (no teacher role)", TAU], ["an admin", ADMIN]]) {
  // three levels of 90 lessons
  eq(`${who} reads them`, await count(uid, `SELECT count(*) n FROM public.curriculum_lessons`), 270);
}
for (const [who, uid] of [["a parent", PARENT], ["a child", CHILD], ["a signed-out visitor", null]]) {
  eq(`${who} reads none`, await count(uid, `SELECT count(*) n FROM public.curriculum_lessons`), 0);
}
refused("a teacher cannot add one", await tryAs(VICTOR, () => db.query(
  `INSERT INTO public.curriculum_lessons (curriculum, level, unit_from, unit_to, lesson) VALUES ('x', 3, 1, 1, 'Read')`)), /row-level security/);
eq("a teacher's update changes nothing", (await rowsAs(VICTOR, `UPDATE public.curriculum_lessons SET grammar = 'x' WHERE id = $1 RETURNING id`, [u12.id])).length, 0);
eq("an admin can correct one", (await rowsAs(ADMIN, `UPDATE public.curriculum_lessons SET grammar = grammar WHERE id = $1 RETURNING id`, [u12.id])).length, 1);

await db.exec(`GRANT SELECT ON public.curriculum_lessons, public.session_lesson_plans TO anon`);
for (const f of CHAIN.slice(6, 7)) await db.exec(readFileSync(f, "utf8"));
eq("a signed-out visitor holds no grant on either table (re-applying removes one)",
  (await q(`SELECT count(*)::int n FROM information_schema.role_table_grants WHERE grantee = 'anon'
    AND table_name IN ('curriculum_lessons', 'session_lesson_plans')`))[0].n, 0);

console.log("what a lesson covered");
const plan = (uid, session, lesson, pos = 1) => tryAs(uid, () => db.query(
  `INSERT INTO public.session_lesson_plans (session_id, lesson_id, position, set_by, set_at) VALUES ($1,$2,$3,$4,'2000-01-01')`, [session, lesson, pos, ADMIN]));
eq("the class's teacher sets the lesson's book lesson", await plan(VICTOR, LESSON, u12.id), null);
const p1 = await one(`SELECT * FROM public.session_lesson_plans WHERE session_id = $1`, [LESSON]);
eq("who set it is the server's, not the client's", p1.set_by, VICTOR);
ok("and so is when", new Date(p1.set_at).getFullYear() >= 2026);
const read = await one(`SELECT id FROM public.curriculum_lessons WHERE level = 3 AND unit_from = 12 AND lesson = 'Read'`);
eq("the TA on the lesson adds a second", await plan(TAU, LESSON, read.id, 2), null);
refused("the same book lesson twice is refused", await plan(VICTOR, LESSON, u12.id), /session_lesson_plans_one/);
refused("another class's teacher cannot plan this lesson", await plan(OTHER, LESSON, u12.id), /row-level security/);
refused("a parent cannot", await plan(PARENT, LESSON, u12.id), /row-level security/);
eq("the lesson's staff read its plan", await count(TAU, `SELECT count(*) n FROM public.session_lesson_plans WHERE session_id = $1`, [LESSON]), 2);
eq("another teacher sees none of it", await count(OTHER, `SELECT count(*) n FROM public.session_lesson_plans WHERE session_id = $1`, [LESSON]), 0);
eq("a parent sees none of it", await count(PARENT, `SELECT count(*) n FROM public.session_lesson_plans`, []), 0);
eq("the other teacher plans their own lesson", await plan(OTHER, ELSEWHERE, u12.id), null);
eq("the draft's read, as the teacher: the plan's book lessons in order",
  (await rowsAs(VICTOR, `SELECT cl.lesson FROM public.session_lesson_plans p JOIN public.curriculum_lessons cl ON cl.id = p.lesson_id
    WHERE p.session_id = $1 ORDER BY p.position`, [LESSON])).map((r) => r.lesson), ["Get Ready", "Read"]);
eq("the teacher removes one", (await rowsAs(VICTOR,
  `DELETE FROM public.session_lesson_plans WHERE session_id = $1 AND lesson_id = $2 RETURNING id`, [LESSON, read.id])).length, 1);

console.log("what the draft is told, and the screen's order");
const repo = resolve(here, "..", "..");
async function load(rel, name) {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
const D = await load("supabase/functions/_lib/lesson-report-draft.ts", "cl-draft");
const C = await load("src/lib/curriculumLessons.ts", "cl-lib");
const planned = D.plannedLessons([u12, null, { lesson: "" }]);
eq("the draft gets the book, unit, page and objectives",
  planned && [planned.length, planned[0].book, planned[0].unit, planned[0].lesson, planned[0].student_book_page, planned[0].objectives.length],
  [1, "Oxford Discover (2nd edition) Level 3", "Unit 12", "Get Ready", 116, 2]);
eq("with the words and reading strategy", [planned[0].vocabulary.length, planned[0].reading_strategy], [10, "Compare and contrast"]);
eq("no plan, no planned_lessons", D.plannedLessons([]), null);
ok("the instructions say a plan is intent, not proof", /planned_lessons/.test(D.DRAFT_SYSTEM) && /never what happened/.test(D.DRAFT_SYSTEM));
const all = await q(`SELECT id, level, unit_from, unit_to, lesson, sb_page FROM public.curriculum_lessons WHERE level = 3`);
const sorted = C.sortLessons(all);
eq("book order is page order", sorted.map((r) => r.sb_page), [...all].map((r) => r.sb_page).sort((a, b) => a - b));
const wrap1112 = all.find((r) => r.unit_from === 11 && r.lesson === "Wrap Up");
const u12comm = all.find((r) => r.unit_from === 12 && r.lesson === "Communicate");
eq("after Unit 12 Communicate comes the Units 11-12 Wrap Up", C.nextLesson(all, u12comm.id)?.id, wrap1112.id);
const after = C.nextLesson(all, wrap1112.id);
eq("after that, the next pair's Big Question", after && `${after.lesson} ${after.unit_from}`, "Big Question 13");
eq("nothing planned yet: the level's first lesson", C.nextLesson(all, null)?.sb_page, sorted[0].sb_page);
eq("the last lesson of a level has no next", C.nextLesson(all, sorted.at(-1).id), null);
eq("a label for the picker", C.lessonLabel(wrap1112), "Units 11-12 · Wrap Up (SB p. 124)");
eq("levels read from a class's curriculum", ["Oxford Discover 3", "OD3", "level 5", "Phonics", null].map(C.levelFromCurriculum), [3, 3, 5, null, null]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
