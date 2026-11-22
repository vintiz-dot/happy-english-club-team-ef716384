// Where a class left off in its book and decks, and its homework interest
// groups (20261122092000), on top of the flipbook table (20260521230000) and the
// real is_teacher_of_class (20261111110000).
//
// What matters most: only an admin or staff of THAT class read or write a class's
// place; a family, a child, another class's teacher and a signed-out visitor see
// nothing; an interest group holds only ids of children in the class (never a
// name, never another class's child); who changed it is the server's; and a
// class's flipbook is readable by whoever teaches the class but changed only by
// its owner. The migration applies twice.
//
// The database stand-ins are the lesson speaker marks suite's own (its PRELUDE).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "20260521230000_add_teacher_flipbooks", "20261122092000_class_deck_state"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: class-deck-state.test.mjs <its 4 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const speaker = readFileSync(resolve(here, "lesson-speaker-marks.test.mjs"), "utf8");
const PRELUDE = speaker.slice(speaker.indexOf("const PRELUDE = `") + 17, speaker.indexOf("\n`;", speaker.indexOf("const PRELUDE = `")));
ok("borrowed the lesson suite's database stand-ins", PRELUDE.includes("CREATE TABLE public.enrollments"));

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
for (const f of CHAIN.slice(0, 2)) await db.exec(readFileSync(f, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated;
  CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;`);
await db.exec(readFileSync(CHAIN[2], "utf8"));
await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_flipbooks TO authenticated`);
await db.exec(readFileSync(CHAIN[3], "utf8"));
ok("applies on top of the flipbook table", true);
{
  let again = null;
  try { await db.exec(readFileSync(CHAIN[3], "utf8")); } catch (e) { again = e.message; }
  ok("applies a second time", again === null, again ?? "");
}

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
await q(`INSERT INTO public.session_participants (session_id, teaching_assistant_id) VALUES ($1,$2)`, [LESSON, ta]);
const kid = async (name, cls) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
const A = await kid("Kid A", SKY), B = await kid("Kid B", SKY), Z = await kid("Kid Z", PLUTO);

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows;
const upsert = `INSERT INTO public.class_deck_state (class_id, deck_id, slide_index, flipbook_page, interests)
  VALUES ($1, $2, $3, $4, $5::jsonb)
  ON CONFLICT (class_id) DO UPDATE SET deck_id = EXCLUDED.deck_id, slide_index = EXCLUDED.slide_index,
    flipbook_page = EXCLUDED.flipbook_page, interests = EXCLUDED.interests RETURNING *`;

console.log("a class's place");
const saved = (await rowsAs(VICTOR, upsert, [SKY, "od2e-l3-u12-l3", 7, 121, JSON.stringify({ football: [A] })]))[0];
eq("the class's teacher saves it", [saved.deck_id, saved.slide_index, saved.flipbook_page, saved.interests], ["od2e-l3-u12-l3", 7, 121, { football: [A] }]);
eq("who saved it is the server's", saved.updated_by, VICTOR);
const moved = (await rowsAs(VICTOR, upsert, [SKY, "od2e-l3-u12-l3", 8, 121, JSON.stringify({ football: [A, B] })]))[0];
eq("saving again moves it on (one row per class)", [moved.slide_index, Number((await one(`SELECT count(*) n FROM public.class_deck_state`)).n)], [8, 1]);
eq("the lesson's TA reads it", (await rowsAs(TAU, `SELECT slide_index FROM public.class_deck_state WHERE class_id = $1`, [SKY])).map((r) => r.slide_index), [8]);
const taSave = (await rowsAs(TAU, upsert, [SKY, "od2e-l3-u12-l3", 9, 122, JSON.stringify({ football: [A, B] })]))[0];
eq("the TA moves it on too, and is recorded", [taSave.slide_index, taSave.updated_by], [9, TAU]);
eq("an admin reads it", (await rowsAs(ADMIN, `SELECT slide_index FROM public.class_deck_state WHERE class_id = $1`, [SKY])).length, 1);
for (const [who, uid] of [["another class's teacher", OTHER], ["a parent", PARENT], ["a child", CHILD], ["a signed-out visitor", null]]) {
  eq(`${who} reads nothing`, (await rowsAs(uid, `SELECT * FROM public.class_deck_state`)).length, 0);
}
refused("another class's teacher cannot write Sky's place", await tryAs(OTHER, () => db.query(upsert, [SKY, "x", 0, 1, "{}"])), /row-level security/);
eq("...and their update changes nothing", (await rowsAs(OTHER, `UPDATE public.class_deck_state SET slide_index = 0 RETURNING 1`)).length, 0);
refused("a parent cannot write one", await tryAs(PARENT, () => db.query(upsert, [SKY, "x", 0, 1, "{}"])), /row-level security/);
ok("the admin can start Pluto's", (await rowsAs(ADMIN, upsert, [PLUTO, "od2e-l3-u12-l1", 0, 116, JSON.stringify({ football: [Z] })])).length === 1);

console.log("what a place may hold");
refused("an interest group cannot hold another class's child", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 1, JSON.stringify({ football: [Z] })])), /not in this class/);
refused("nor a name instead of an id", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 1, JSON.stringify({ football: ["Kid A"] })])), /not in this class/);
refused("nor a list that is not a list", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 1, JSON.stringify({ football: A })])), /list of student ids/);
refused("an interest name is a short key", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 1, JSON.stringify({ "Arsenal fans!": [A] })])), /not allowed/);
refused("interests must be an object", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 1, JSON.stringify([A])])), /must be an object/);
refused("a page must be a real page", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", 0, 0, "{}"])), /class_deck_state_page/);
refused("a deck id is an id", await tryAs(VICTOR, () => db.query(upsert, [SKY, "<script>", 0, 1, "{}"])), /class_deck_state_deck/);
refused("a slide number is not negative", await tryAs(VICTOR, () => db.query(upsert, [SKY, "d", -1, 1, "{}"])), /class_deck_state_slide/);
eq("an empty group list is fine", (await rowsAs(VICTOR, upsert, [SKY, "od2e-l3-u12-l3", 9, 122, "{}"]))[0].interests, {});
ok("signed-out visitors have no grant at all", !(await one(`SELECT has_table_privilege('anon', 'public.class_deck_state', 'SELECT') p`)).p);

console.log("the class's flipbook");
const book = (await one(`INSERT INTO public.teacher_flipbooks (title, url, teacher_id, class_id, edition, page_offset)
  VALUES ('OD3 SB', 'https://example.org/book/#p=88', $1, $2, '1e', 0) RETURNING id`, [tOther, SKY])).id;
const loose = (await one(`INSERT INTO public.teacher_flipbooks (title, url, teacher_id) VALUES ('Mine', 'https://example.org/x', $1) RETURNING id`, [tOther])).id;
eq("Sky's teacher reads the book linked to Sky, though another teacher owns it",
  (await rowsAs(VICTOR, `SELECT id, edition FROM public.teacher_flipbooks`)).map((r) => [r.id, r.edition]), [[book, "1e"]]);
eq("...but cannot change it", (await rowsAs(VICTOR, `UPDATE public.teacher_flipbooks SET url = 'https://evil.example' RETURNING id`)).length, 0);
eq("the owner still sees both of theirs", (await rowsAs(OTHER, `SELECT id FROM public.teacher_flipbooks ORDER BY title`)).length, 2);
eq("a parent sees none", (await rowsAs(PARENT, `SELECT id FROM public.teacher_flipbooks`)).length, 0);
ok("a loose book stays its owner's", !(await rowsAs(VICTOR, `SELECT id FROM public.teacher_flipbooks WHERE id = $1`, [loose])).length);
refused("an edition is 1e or 2e", await tryAs(OTHER, () => db.query(`UPDATE public.teacher_flipbooks SET edition = '3e' WHERE id = $1`, [book])), /teacher_flipbooks_edition/);
await q(`UPDATE public.class_deck_state SET flipbook_id = $1 WHERE class_id = $2`, [book, SKY]);
await q(`DELETE FROM public.teacher_flipbooks WHERE id = $1`, [book]);
eq("deleting the book keeps the class's place, without the book", (await one(`SELECT flipbook_id, slide_index FROM public.class_deck_state WHERE class_id = $1`, [SKY])), { flipbook_id: null, slide_index: 9 });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
