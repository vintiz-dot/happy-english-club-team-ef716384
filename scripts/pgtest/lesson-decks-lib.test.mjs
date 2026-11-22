// Lesson decks: the name slots and the pacing guide. Drives the real
// src/lib/lessonDecks/names.ts and pacing.ts (both import nothing), and checks
// every deck in src/content/lessonDecks against the rules a deck must keep.
//
// What matters most: a slide never shows a raw {s1}, the same child is not used
// twice on a slide while others are unused, a deck never carries a child's name,
// and every lesson lands on a real class day, holidays skipped.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform, build } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

async function load(rel, name) {
  const src = readFileSync(resolve(repo, rel), "utf8");
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
const N = await load("src/lib/lessonDecks/names.ts", "ld-names");
const P = await load("src/lib/lessonDecks/pacing.ts", "ld-pacing");
const C2 = await load("src/lib/curriculumLessons.ts", "ld-curriculum");

console.log("name slots");
eq("slots found across texts", N.slotsIn(["{s1} likes {s3}", null, "no slot", "{s2}"]), 3);
eq("no slots", N.slotsIn(["plain"]), 0);
const roster = ["Linh Tran", "Minh Le", "An Pham", "Bao Vu"];
const cast = N.castFor(3, roster, 42);
ok("three different children for three slots", new Set(cast).size === 3 && cast.every((c) => roster.includes(c)));
eq("same seed, same names", N.castFor(3, roster, 42), cast);
ok("another seed can change the order", [1, 2, 3, 4, 5, 6].some((s) => JSON.stringify(N.castFor(3, roster, s)) !== JSON.stringify(cast)));
const big = N.castFor(6, ["A", "B"], 7);
ok("with fewer children than slots, every child is used before any repeats", new Set(big.slice(0, 2)).size === 2 && big.length === 6);
eq("no roster: neutral stand-ins", N.castFor(2, [], 1), ["Student A", "Student B"]);
eq("blank and duplicate names are dropped", N.castFor(2, [" ", "Kim", "Kim "], 3), ["Kim", "Kim"]);
eq("slots filled", N.fillNames("{s1} gave {s2} a book. {s1} smiled.", ["Linh", "Minh"]), "Linh gave Minh a book. Linh smiled.");
eq("a slot past the cast keeps a stand-in, never a raw token", N.fillNames("{s3} sings", ["Linh"]), "Student C sings");
ok("different slides get different seeds", N.hashSeed("deck:1") !== N.hashSeed("deck:2"));
const slide = { kind: "grammar", title: "x", examples: [{ text: "{s1} has eaten." }, { text: "{s2} hasn't." }], form: [], explanation: ["{s1}"] };
const shown = N.castSlide(slide, roster, "d:3");
eq("a whole slide is filled with one cast", [shown.slide.examples[0].text, shown.slide.examples[1].text, shown.slide.explanation[0]],
  [`${shown.cast[0]} has eaten.`, `${shown.cast[1]} hasn't.`, shown.cast[0]]);
ok("the deck itself is untouched", slide.examples[0].text === "{s1} has eaten.");
eq("same key and shuffle, same names", N.castSlide(slide, roster, "d:3").cast, shown.cast);
ok("'new names' changes them", [1, 2, 3, 4, 5].some((k) => JSON.stringify(N.castSlide(slide, roster, "d:3", k).cast) !== JSON.stringify(shown.cast)));

console.log("pacing");
// SKY 1's pattern: Tuesday 17:30 and Saturday 16:15 (JS weekdays 2 and 6).
const slots = [{ dayOfWeek: 2, startTime: "17:30" }, { dayOfWeek: 6, startTime: "16:15" }];
eq("next four class dates from a Monday", P.classDates(slots, "2026-11-23", 4).map((d) => `${d.weekday} ${d.date}`),
  ["Tue 2026-11-24", "Sat 2026-11-28", "Tue 2026-12-01", "Sat 2026-12-05"]);
eq("a holiday is skipped, the lesson moves on", P.classDates(slots, "2026-11-23", 3, ["2026-11-28"]).map((d) => d.date),
  ["2026-11-24", "2026-12-01", "2026-12-05"]);
eq("start on a class day counts that day", P.classDates(slots, "2026-11-24", 1)[0].date, "2026-11-24");
eq("no slots, no dates", P.classDates([], "2026-11-23", 3), []);
eq("a slot day out of range is ignored", P.classDates([{ dayOfWeek: 9 }], "2026-11-23", 2), []);
const paced = P.paceLessons(["L1", "L2", "L3", "L4", "L5"], slots, "2026-11-23");
eq("lessons in order with week numbers", paced.map((p) => [p.item, p.week, p.startTime]),
  [["L1", 1, "17:30"], ["L2", 1, "16:15"], ["L3", 2, "17:30"], ["L4", 2, "16:15"], ["L5", 3, "17:30"]]);

console.log("which of today's lessons a deck is presented in");
const C = await load("src/lib/lessonDecks/covered.ts", "ld-covered");
const day = [
  { id: "am", start_time: "09:00:00", end_time: "10:30:00", status: "Scheduled" },
  { id: "pm", start_time: "17:30:00", end_time: "19:00:00", status: "Scheduled" },
  { id: "x", start_time: "14:00:00", end_time: "15:30:00", status: "Canceled" },
];
eq("during a lesson, that lesson", C.pickSession(day, "18:10")?.id, "pm");
eq("half an hour before it starts counts as that lesson", C.pickSession(day, "17:05")?.id, "pm");
eq("between lessons, the nearest start", C.pickSession(day, "12:00")?.id, "am");
eq("a cancelled lesson is never picked, even while 'on'", C.pickSession(day, "14:30")?.id, "pm");
eq("no lessons today, nothing", C.pickSession([day[2]], "14:30"), null);

console.log("flipbook pages");
const B = await load("src/lib/lessonDecks/bookPages.ts", "ld-book");
const map1e = { unit: 12, pages: { "SB 116": { page: 116 }, "SB 121 F": { page: 99, activity: "C", note: "moved" }, "SB 122": { page: null, note: "Not in 1e." } } };
const fb2 = { url: "https://online.example/b/#p=88", edition: "2e", page_offset: 2 };
const fb1 = { url: "https://online.example/b/", edition: "1e", page_offset: 0 };
eq("2nd edition: printed page plus the offset", B.flipTarget({ book: "SB", pages: "116-117", activities: ["A"] }, fb2, null), { ok: true, index: 118, printed: 116, label: "p. 116" });
eq("1st edition: an activity's own entry wins over the page", B.flipTarget({ book: "SB", pages: "121", activities: ["F", "G"] }, fb1, map1e), { ok: true, index: 99, printed: 99, label: "1st ed. p. 99 C", note: "moved" });
eq("1st edition: the page entry when the activity has none", B.flipTarget({ book: "SB", pages: "116", activities: ["B"] }, fb1, map1e).index, 116);
eq("1st edition with no equivalent says so", B.flipTarget({ book: "SB", pages: "122" }, fb1, map1e), { ok: false, label: "SB 122", reason: "Not in 1e." });
ok("a page the map does not know is not guessed", !B.flipTarget({ book: "SB", pages: "130" }, fb1, map1e).ok);
ok("a 1st-edition book without a map is not guessed", !B.flipTarget({ book: "SB", pages: "116" }, fb1, null).ok);
ok("the Workbook is never opened in the Student Book flipbook", !B.flipTarget({ book: "WB", pages: "105" }, fb2, null).ok);
ok("no flipbook, no page", !B.flipTarget({ book: "SB", pages: "116" }, null, null).ok);
eq("url: replaces the page", B.flipbookUrl("https://online.example/b/#p=88", 116), "https://online.example/b/#p=116");
eq("url: adds a page", B.flipbookUrl("https://online.example/b/", 5), "https://online.example/b/#p=5");
eq("url: no page keeps the book's own start", B.flipbookUrl("https://online.example/b/#p=88", null), "https://online.example/b/");
eq("page read from a url", [B.pageInUrl("https://x/#p=88"), B.pageInUrl("https://x/")], [88, null]);

console.log("views: grammar only, unit plan, homework versions, class book");
const V = await load("src/lib/lessonDecks/views.ts", "ld-views");
const creative = { kind: "creative", thinking: "Create", uses: { words: [], grammar: [] }, base: { title: "base" }, variants: [{ interest: "football", label: "Football edition", task: { title: "fb" } }] };
const KID = "11111111-1111-4111-8111-111111111111", OTHERKID = "22222222-2222-4222-8222-222222222222";
eq("a chosen child gets the interest edition", V.homeworkFor(creative, KID, { football: [KID] }).task.title, "fb");
eq("everyone else gets the class version", V.homeworkFor(creative, OTHERKID, { football: [KID] }), { task: { title: "base" }, label: null, interest: null });
eq("no groups yet: the class version", V.homeworkFor(creative, KID, null).task.title, "base");
eq("interest groups are cleaned: bad keys, names and repeats dropped",
  V.cleanInterests({ football: [KID, KID, "William"], "Bad Key": [KID], art: "x", empty: [] }), { football: [KID] });
eq("a non-object reads as no groups", [V.cleanInterests(null), V.cleanInterests([KID])], [{}, {}]);
eq("class book label", V.bookLabel({ curriculum: "oxford-discover-2e", level: 3 }), "Oxford Discover 2nd edition, Level 3");
eq("class book read back", V.classBook("Oxford Discover 2nd edition, Level 3"), { curriculum: "oxford-discover-2e", level: 3 });
eq("Reach Higher is a book choice too", [V.bookLabel({ curriculum: "reach-higher", level: 3 }), V.classBook("Reach Higher, Level 3")],
  ["Reach Higher, Level 3", { curriculum: "reach-higher", level: 3 }]);
eq("older free text is not a book choice", [V.classBook("Oxford Discover 2"), V.classBook(null), V.classBook("Oxford Discover 2nd edition, Level 9")], [null, null, null]);

console.log("decks in src/content/lessonDecks");
const contentDir = resolve(repo, "src/content/lessonDecks");
const files = existsSync(contentDir) ? readdirSync(contentDir).filter((f) => /\.ts$/.test(f) && !/index\.ts$/.test(f)) : [];
const units = [];
for (const f of files) {
  const out = resolve(tmpdir(), `ld-unit-${files.indexOf(f)}.${process.pid}.mjs`);
  await build({ entryPoints: [join(contentDir, f)], bundle: true, format: "esm", outfile: out, logLevel: "silent" });
  const mod = await import(pathToFileURL(out).href);
  for (const v of Object.values(mod)) if (v && typeof v === "object" && Array.isArray(v.decks)) units.push({ f, u: v });
}
ok("content files load", units.length === files.length, `${units.length} units from ${files.length} files`);
const allIds = new Set();
for (const { f, u } of units) {
  const texts = JSON.stringify(u);
  ok(`${f}: no stray slot beyond {s9} or malformed token`, !/\{s(?:0|[1-9]\d)\}|\{s\}/.test(texts));
  ok(`${f}: lessons numbered 1..n in order`, u.decks.every((d, i) => d.lesson === i + 1));
  for (const d of u.decks) {
    ok(`${d.id}: unique id`, !allIds.has(d.id)); allIds.add(d.id);
    ok(`${d.id}: fits a 90-minute class`, d.minutes > 0 && d.minutes <= 90);
    const timed = d.slides.filter((s) => typeof s.minutes === "number").reduce((a, s) => a + s.minutes, 0);
    ok(`${d.id}: timed activities add up to the lesson (${timed} of ${d.minutes})`, timed <= d.minutes && timed >= d.minutes - 15);
    ok(`${d.id}: names the Student Book or Workbook pages it covers`, d.book.length > 0 && d.book.every((b) => b.pages));
    ok(`${d.id}: has a speaking activity`, d.slides.some((s) => s.kind === "speaking" || (s.kind === "activity" && s.tag === "Speaking")));
    ok(`${d.id}: supplementary links point only at the publisher's own resource pages`,
      (d.resources ?? []).every((r) => /^https:\/\/www\.twinkl\.com\/resource\/[a-z0-9-]+$/.test(r.url) && r.title && r.use));
    const LESSONS = d.curriculum === "reach-higher" ? C2.REACH_HIGHER_BLOCKS : ["Big Question", "Get Ready", "Read", "Understand", "Communicate", "Wrap Up"];
    ok(`${d.id}: says which book lesson it covers`, !!d.covers && Number.isInteger(d.covers.unitFrom) && LESSONS.includes(d.covers.lesson));
    ok(`${d.id}: same course book as its unit`, d.curriculum === u.curriculum && d.level === u.level && d.unit === u.unit);
    // Exam practice: every item has an answer, multiple choice has 2-4 options and the
    // answer names one of them, and the minutes count like any timed slide.
    for (const s of d.slides.filter((x) => x.kind === "exam")) {
      ok(`${d.id} / ${s.title}: every exam item has a question and an answer`, s.items.length > 0 && s.items.every((it) => it.q && it.answer));
      ok(`${d.id} / ${s.title}: options are 2-4 and the answer points at one`,
        s.items.every((it) => !it.options || (it.options.length >= 2 && it.options.length <= 4 &&
          (/^[A-D]\b/.test(it.answer) ? "ABCD".indexOf(it.answer[0]) < it.options.length : it.options.some((o) => it.answer.includes(o))))));
    }
    // Jupiter's lessons (Reach Higher) carry the whole plan: a grammar point taught,
    // exam practice, speaking and a higher-order writing task with a challenge.
    if (d.curriculum === "reach-higher") {
      ok(`${d.id}: teaches a grammar point`, d.slides.some((s) => s.kind === "grammar"));
      ok(`${d.id}: has exam-format practice`, d.slides.some((s) => s.kind === "exam" || s.kind === "check"));
      ok(`${d.id}: has a creative writing task with a challenge, in class or as homework`, d.slides.some((s) => (s.kind === "project" && s.project === "writing" && !!s.challenge) || s.kind === "creative"));
      ok(`${d.id}: ends with a reflection`, d.slides.some((s) => s.kind === "reflect"));
    }
  }
  if (u.curriculum === "reach-higher") {
    eq(`${f}: a checkpoint quiz mid-unit and a mock test in the last lesson`, u.decks.map((d) => d.slides.filter((s) => s.kind === "check").length), [0, 0, 0, 1, 0, 0, 0, 1]);
    eq(`${f}: one deck per Reach Higher block, in book order`, u.decks.map((d) => d.covers?.lesson), C2.REACH_HIGHER_BLOCKS);
    ok(`${f}: 5-9 teacher generalizations`, u.generalizations.length >= 5 && u.generalizations.length <= 9);
    ok(`${f}: the grammar strand points at real lessons`, (u.grammarStrand ?? []).length > 0 && u.grammarStrand.every((g) => g.lesson >= 1 && g.lesson <= u.decks.length));
  }
}

console.log("the school's flipbooks open each Level 1-2 deck's pages");
for (const level of [1, 2]) {
  const fb = B.SCHOOL_FLIPBOOKS.find((b) => b.level === level);
  ok(`Level ${level}: a 2nd-edition flipbook with offset 0`, !!fb && fb.edition === "2e" && fb.page_offset === 0 && /^https:\/\/online\.flipbuilder\.com\/sdtta\/[a-z]+\/$/.test(fb.url));
  const refs = units.filter(({ u }) => u.level === level).flatMap(({ u }) => u.decks.flatMap((d) => d.book.filter((b) => b.book === "SB").map((b) => ({ u, b }))));
  const wrong = refs.filter(({ u, b }) => {
    const t = B.flipTarget(b, fb, null);
    const first = 6 + (u.unit - 1) * 10 - (u.unit % 2 === 0 ? 10 : 0);
    return !t.ok || t.index !== t.printed || t.index < first || t.index > 15 + (u.unit - 1) * 10;
  });
  ok(`Level ${level}: all ${refs.length} Student Book references open at their printed page, inside their unit`, refs.length > 0 && wrong.length === 0,
    wrong.slice(0, 3).map(({ u, b }) => `U${u.unit} SB ${b.pages}`).join(", "));
}
eq("Level 3's school flipbook is the 1st edition (opened through the unit maps)", B.SCHOOL_FLIPBOOKS.find((b) => b.level === 3)?.edition, "1e");

console.log("homework, materials, checks and the 1st edition");
for (const { f, u } of units) {
  const texts = JSON.stringify(u);
  ok(`${f}: never carries a child's name (personalised homework is keyed by interest)`, !/\bWilliam\b|\bMr\.?\s*Potato\b/i.test(texts)); // "sweet potato" is a Unit 16 word, not a child
  const titlesOf = (d) => d.slides.map((s) => s.title).filter(Boolean);
  for (const d of u.decks) {
    const titles = titlesOf(d);
    ok(`${d.id}: slide titles are unique (materials point at them)`, new Set(titles).size === titles.length);
    const lost = (d.resources ?? []).filter((r) => r.slide !== undefined && !titles.includes(r.slide));
    ok(`${d.id}: a supplementary link that names a slide names one of this deck`, lost.length === 0, lost.map((r) => r.slide).join(", "));
    const cr = d.slides.filter((s) => s.kind === "creative");
    // Creative homework is opt-in per unit: once a unit has any, every deck has one.
    if (u.decks.some((x) => x.slides.some((s) => s.kind === "creative"))) ok(`${d.id}: one creative homework, just before the homework slide`, cr.length === 1 && d.slides.indexOf(cr[0]) === d.slides.findIndex((s) => s.kind === "homework") - 1);
    for (const c of cr) {
      const tasks = [c.base, ...(c.variants ?? []).map((v) => v.task)];
      ok(`${d.id}: homework tasks are complete, each with a challenge`, tasks.every((t) => t.title && t.task && t.steps.length >= 3 && t.frames.length >= 3 && t.success.length >= 2 && t.challenge));
      ok(`${d.id}: homework names its words and grammar`, c.uses.words.length >= 3 && c.uses.grammar.length >= 1);
      ok(`${d.id}: variants are keyed by a short interest`, (c.variants ?? []).every((v) => /^[a-z][a-z0-9-]{0,30}$/.test(v.interest) && v.label));
    }
    for (const s of d.slides.filter((s) => s.kind === "check")) {
      ok(`${d.id}: its check "${s.assessment}" exists and is formative`, (u.assessments ?? []).some((a) => a.id === s.assessment && a.kind === "formative"));
    }
    if (u.firstEdition) {
      const refs = [...d.slides.flatMap((s) => [s.book, s.ref]).filter(Boolean), ...d.book].filter((b) => b.book === "SB");
      const miss = refs.filter((b) => {
        const p = Number(String(b.pages).split(/[-,\s]/)[0]);
        return !(b.activities?.[0] && u.firstEdition.pages[`SB ${p} ${b.activities[0]}`]) && !u.firstEdition.pages[`SB ${p}`];
      });
      ok(`${d.id}: every Student Book page it shows has a 1st-edition entry`, miss.length === 0, miss.map((b) => b.pages).join(", "));
    }
  }
  for (const w of u.worksheets ?? []) {
    const d = u.decks.find((x) => x.id === w.deckId);
    ok(`${w.id}: follows a real slide`, !!d && titlesOf(d).includes(w.slide));
    eq(`${w.id}: Support, Core, Challenge in order`, w.tiers.map((t) => t.level), ["Support", "Core", "Challenge"]);
    ok(`${w.id}: every item has an answer`, w.tiers.every((t) => t.items.length >= 5 && t.items.every((i) => i.q && i.answer)));
    ok(`${w.id}: a choice's answer is one of its options`, w.tiers.every((t) => t.items.every((i) => !i.options || i.options.includes(i.answer))));
  }
  for (const a of u.assessments ?? []) {
    ok(`${a.id}: given after a real lesson`, u.decks.some((d) => d.lesson === a.afterLesson));
    ok(`${a.id}: every item has an answer, every choice's answer is an option`,
      a.sections.every((s) => s.items.length && s.items.every((i) => i.q && i.answer && (!i.options || i.options.includes(i.answer)))));
    if (a.kind === "formative") ok(`${a.id}: a formative check is run from a deck's check slide`, u.decks.some((d) => d.slides.some((s) => s.kind === "check" && s.assessment === a.id)));
    if (a.kind === "summative") {
      ok(`${a.id}: the end-of-unit test covers words, both grammar points, reading and writing`,
        ["Vocabulary", "Grammar", "Reading", "Writing"].every((k) => a.sections.some((s) => s.skill === k)) && a.sections.filter((s) => s.skill === "Grammar").length >= 2);
      ok(`${a.id}: has a speaking rubric with 4 bands per criterion`, !!a.speaking && a.speaking.rubric.length >= 3 && a.speaking.rubric.every((r) => r.bands.length === 4));
      ok(`${a.id}: fits a class`, a.minutes > 0 && a.minutes <= 90);
    }
  }
  const plan = V.unitPlan(u);
  ok(`${f}: the plan puts each test right after its lesson`, (u.assessments ?? []).filter((a) => a.kind === "summative").every((a) => {
    const i = plan.findIndex((p) => p.kind === "test" && p.assessment.id === a.id);
    return i > 0 && plan[i - 1].kind === "deck" && plan[i - 1].deck.lesson === a.afterLesson;
  }));
  for (const d of u.decks) {
    const g = V.grammarDeck(d);
    if (!g) continue;
    ok(`${d.id}: its grammar-only view opens with a title and keeps the grammar slide`, g.slides[0].kind === "title" && g.slides.some((s) => s.kind === "grammar") && g.id === `${d.id}-grammar`);
    ok(`${d.id}: the grammar-only view leaves out homework and reading`, !g.slides.some((s) => s.kind === "homework" || s.kind === "creative" || (s.kind === "activity" && s.tag === "Reading")));
  }
}
const u12 = units.find((x) => x.u.unit === 12 && x.u.level === 3)?.u;
if (u12) {
  eq("Unit 12: grammar on its own for Lessons 3 and 4", u12.decks.filter((d) => V.grammarDeck(d)).map((d) => d.lesson), [3, 4]);
  eq("Unit 12: a quick check mid-unit (in Lesson 4) and the test after Wrap Up",
    [V.checksIn(u12.decks[3]), V.unitPlan(u12).map((p) => (p.kind === "test" ? "test" : p.deck.lesson))], [["od2e-l3-u12-check"], [1, 2, 3, 4, 5, "test"]]);
  ok("Unit 12: every homework has a football edition", u12.decks.every((d) => d.slides.some((s) => s.kind === "creative" && s.variants?.some((v) => v.interest === "football"))));
  eq("Unit 12: the book's audio is a track number, never a file", [...new Set(JSON.stringify(u12).match(/"track":"[^"]+"/g))].sort(),
    ['"track":"2.23"', '"track":"2.24"', '"track":"2.25"', '"track":"2.26"', '"track":"2.27"', '"track":"2.28"', '"track":"2.29"']);
  ok("Unit 12: no audio, image or book files referenced", !/\.(mp3|wav|m4a|pdf|jpg|png)"/i.test(JSON.stringify(u12)));
}
console.log("Reach Higher lessons in book order; a class's course book from its curriculum text");
eq("blocks rank in order within a unit and after the unit before",
  C2.sortLessons([{ level: 3, unit_from: 3, unit_to: 3, lesson: "Unit Launch" }, { level: 3, unit_from: 2, unit_to: 2, lesson: "Unit Wrap-Up" },
    { level: 3, unit_from: 2, unit_to: 2, lesson: "Part 1 Reading" }, { level: 3, unit_from: 2, unit_to: 2, lesson: "Unit Launch" }]).map((l) => `${l.unit_from} ${l.lesson}`),
  ["2 Unit Launch", "2 Part 1 Reading", "2 Unit Wrap-Up", "3 Unit Launch"]);
eq("curriculum text names the book", ["Reach Higher 3A", "RH3B", "Oxford Discover 3", null].map(C2.curriculumFromText),
  ["reach-higher", "reach-higher", "oxford-discover-2e", "oxford-discover-2e"]);
eq("level from a Reach Higher label", ["Reach Higher 3A", "Reach Higher Level 3", "RH 4B"].map(C2.levelFromCurriculum), [3, 3, 4]);
// Units 13-18 carry the same round-2 features as Unit 12.
for (const n of [13, 14, 15, 16, 17, 18]) {
  const u = units.find((x) => x.u.unit === n && x.u.level === 3)?.u;
  ok(`Level 3 Unit ${n} is loaded`, !!u);
  if (!u) continue;
  const last = Math.max(...u.decks.map((d) => d.lesson));
  ok(`Unit ${n}: every homework has a football edition`, u.decks.every((d) => d.slides.some((s) => s.kind === "creative" && s.variants?.some((v) => v.interest === "football"))));
  eq(`Unit ${n}: a quick check in Lesson 4 and the test after the last lesson`,
    [V.checksIn(u.decks.find((d) => d.lesson === 4)), V.unitPlan(u).at(-1).kind, V.unitPlan(u).at(-2).deck?.lesson], [[`od2e-l3-u${n}-check`], "test", last]);
  ok(`Unit ${n}: a worksheet per grammar slide, a 1st-edition map and audio tracks`,
    (u.worksheets ?? []).length >= u.decks.flatMap((d) => d.slides).filter((s) => s.kind === "grammar").length && !!u.firstEdition && /"track":"\d\.\d\d"/.test(JSON.stringify(u)));
  ok(`Unit ${n}: no audio, image or book files referenced`, !/\.(mp3|wav|m4a|pdf|jpg|png)"/i.test(JSON.stringify(u)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
