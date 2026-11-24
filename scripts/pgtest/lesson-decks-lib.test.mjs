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
// Reach Higher class audio: publisher file name -> the school's Drive file id.
const RH_AUDIO_IDS = new Set(Object.values((await load("src/content/lessonDecks/rh-l3/audio.ts", "ld-rh-audio")).RH3_AUDIO));

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
eq("the IELTS course is a class book by year", V.bookLabel({ curriculum: "hec-ielts-sl", level: 1 }), "HEC IELTS Speaking & Listening, Year 1");
eq("and reads back", [V.classBook("HEC IELTS Speaking & Listening, Year 2"), V.classBook("HEC IELTS Speaking & Listening, Year 3"), V.classBook("HEC IELTS Speaking & Listening, Level 1")],
  [{ curriculum: "hec-ielts-sl", level: 2 }, null, null]);

console.log("courses, the Sun Class pacing guide and the IELTS arithmetic");
const CU = await load("src/lib/lessonDecks/curricula.ts", "ld-curricula");
const IR = await import(pathToFileURL(resolve(repo, "scripts/lesson-decks/ielts-rules.mjs")).href);
eq("per-course lesson length", [CU.ruleFor("oxford-discover-2e").maxMinutes, CU.ruleFor("hec-ielts-sl").maxMinutes, CU.ruleFor("nope")], [90, 120, null]);
eq("every book in the class picker is a course with rules", V.BOOKS.map((b) => !!CU.ruleFor(b.curriculum) && CU.ruleFor(b.curriculum).name === b.name && CU.ruleFor(b.curriculum).levelWord === b.levelWord), V.BOOKS.map(() => true));
eq("unit menu labels", [CU.unitLabel({ curriculum: "oxford-discover-2e", level: 3, unit: 12, title: "T" }), CU.unitLabel({ curriculum: "hec-ielts-sl", level: 1, unit: 1, title: "T" })],
  ["Oxford Discover 3 · Unit 12: T", "HEC IELTS Speaking & Listening Year 1 · Term 1: T"]);
const PG = await load("src/content/lessonDecks/hec-ielts/programme.ts", "ld-programme");
eq("100 lessons numbered 1..100", [PG.LESSONS.length, PG.LESSONS.every((l, i) => l.n === i + 1)], [100, true]);
ok("8 terms that tile the lessons with no gap", PG.TERMS.length === 8 && PG.TERMS.every((t, i) => t.from === (i ? PG.TERMS[i - 1].to + 1 : 1) && PG.LESSONS.filter((l) => l.term === t.term).length === t.to - t.from + 1) && PG.TERMS[7].to === 100);
ok("every lesson has its focus filled in", PG.LESSONS.every((l) => l.theme && l.speaking && l.language && l.pron && l.listening.types.length && l.listening.strategy));
const ltypes = new Set(PG.LESSONS.flatMap((l) => l.listening.types));
ok("all twelve listening question types are taught", ltypes.size === 12, [...ltypes].join(", "));
ok("all four listening parts are taught every year", [1, 2].every((y) => [1, 2, 3, 4].every((s) => PG.LESSONS.some((l) => l.year === y && l.listening.section === s))));
const mocks = PG.LESSONS.filter((l) => l.mock).map((l) => l.n);
ok("a mock at least every 7 lessons after the diagnostic", mocks[0] === 1 && mocks.every((n, i) => i === 0 || n - mocks[i - 1] <= 7) && 100 - mocks[mocks.length - 1] <= 3, mocks.join(","));
ok("the debate strand only moves forward", PG.LESSONS.every((l, i) => i === 0 || l.debate >= PG.LESSONS[i - 1].debate));
ok("each motion bank has 12 motions; formal motions start 'This House'", Object.entries(PG.MOTIONS).every(([st, ms]) => ms.length === 12 && (st < "3" || ms.every((m) => /^This House /.test(m)))));
ok("targets are targets: the honest note says no band is guaranteed", PG.HONEST_NOTE.some((t) => /guarantee/i.test(t)) && PG.TERMS.every((t) => t.expected && t.stretch));
const R = await load("src/lib/lessonDecks/ieltsRubric.ts", "ld-rubric");
eq("speaking band: mean of four, .25 and .75 round up", [R.speakingBand(6, 6, 6, 7), R.speakingBand(6, 6, 7, 7), R.speakingBand(6, 7, 7, 7), R.speakingBand(5, 5, 5, 5), R.speakingBand(5.5, 6, 6, 6)], [6.5, 6.5, 7, 5, null]);
eq("listening band from a raw score", [R.listeningBand(40), R.listeningBand(30), R.listeningBand(29), R.listeningBand(16), R.listeningBand(10, 20), R.listeningBand(41)], [9, 7, 6.5, 5, 5.5, null]);
ok("the rubric covers four criteria at four bands", R.RUBRIC.length === 4 && R.RUBRIC.every((r) => r.bands.length === 4));

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
  const rule = CU.ruleFor(u.curriculum);
  ok(`${f}: a known course (curricula.ts)`, !!rule && u.decks.every((d) => d.curriculum === u.curriculum), u.curriculum);
  if (!rule) continue;
  for (const d of u.decks) {
    ok(`${d.id}: unique id`, !allIds.has(d.id)); allIds.add(d.id);
    ok(`${d.id}: fits a ${rule.maxMinutes}-minute class`, d.minutes > 0 && d.minutes <= rule.maxMinutes);
    const timed = d.slides.filter((s) => typeof s.minutes === "number").reduce((a, s) => a + s.minutes, 0);
    ok(`${d.id}: timed activities add up to the lesson (${timed} of ${d.minutes})`, timed <= d.minutes && timed >= d.minutes - 15);
    if (rule.citesBook) ok(`${d.id}: names the Student Book or Workbook pages it covers`, d.book.length > 0 && d.book.every((b) => b.pages));
    // Class audio / video are links to the school's Drive, played in Drive's player:
    // every link has a track, every track is a Drive id, audio ids come from the manifest.
    for (const s of d.slides.filter((x) => x.media)) {
      ok(`${d.id} / ${s.title ?? s.kind}: media links each have a track and a Drive id`, s.media.length > 0 && s.media.every((m) =>
        m.label && m.tracks.length > 0 && m.tracks.every((t) => /^[A-Za-z0-9_-]{20,}$/.test(t.driveId) && (m.kind === "video" || RH_AUDIO_IDS.has(t.driveId)))));
      // A copy in the school's R2 store (course-media) is a lower-case key of the right kind.
      ok(`${d.id} / ${s.title ?? s.kind}: R2 copies are course-media keys`, s.media.every((m) => m.tracks.every((t) => t.r2 === undefined
        || (/^[a-z0-9][a-z0-9/_.-]{0,200}\.(mp4|mp3|m4a)$/.test(t.r2) && !t.r2.includes("..") && (m.kind === "video" ? /\.mp4$/.test(t.r2) : /\.(mp3|m4a)$/.test(t.r2))))));
    }
    ok(`${d.id}: has a speaking activity`, d.slides.some((s) => s.kind === "speaking" || (s.kind === "activity" && s.tag === "Speaking")));
    ok(`${d.id}: supplementary links point only at the publisher's own resource pages`,
      (d.resources ?? []).every((r) => /^https:\/\/www\.twinkl\.com\/resource\/[a-z0-9-]+$/.test(r.url) && r.title && r.use));
    const LESSONS = d.curriculum === "reach-higher" ? C2.REACH_HIGHER_BLOCKS : ["Big Question", "Get Ready", "Read", "Understand", "Communicate", "Wrap Up"];
    if (rule.coversBookLesson) ok(`${d.id}: says which book lesson it covers`, !!d.covers && Number.isInteger(d.covers.unitFrom) && LESSONS.includes(d.covers.lesson));
    if (u.curriculum === "hec-ielts-sl") {
      const term = PG.TERMS.find((t) => t.year === d.level && t.term === d.unit);
      const row = term && PG.LESSONS.find((l) => l.n === term.from + d.lesson - 1);
      ok(`${d.id}: has its row in the Sun Class pacing guide`, !!row);
      const probs = IR.deckProblems(d, row);
      ok(`${d.id}: keeps the Sun Class lesson rules (scripts/lesson-decks/ielts-rules.mjs)`, probs.length === 0, probs.join("; "));
    }
    ok(`${d.id}: same course book as its unit`, d.curriculum === u.curriculum && d.level === u.level && d.unit === u.unit);
    // Speaking & Writing Lab slides (src/lib/lessonDecks/lab.ts): well-formed wherever they appear.
    for (const s of d.slides.filter((x) => x.kind === "fluency")) {
      ok(`${d.id} / ${s.title}: a fluency routine has a goal, 3+ whole phrases, steps and 2-4 timed rounds of 15-240 s`,
        !!s.goal && s.chunks.length >= 3 && s.steps.length > 0 && s.rounds.length >= 2 && s.rounds.length <= 4
        && s.rounds.every((r) => Number.isInteger(r.seconds) && r.seconds >= 15 && r.seconds <= 240 && r.say));
      if (s.routine === "4-3-2" || s.routine === "retell") ok(`${d.id} / ${s.title}: ${s.routine} rounds get shorter`, s.rounds.every((r, i) => i === 0 || r.seconds < s.rounds[i - 1].seconds));
      ok(`${d.id} / ${s.title}: 4-15 minutes`, s.minutes >= 4 && s.minutes <= 15, String(s.minutes));
    }
    for (const s of d.slides.filter((x) => x.kind === "writing")) {
      ok(`${d.id} / ${s.title}: a writing routine has steps and a checklist`, s.steps.length > 0 && s.checklist.length >= 2);
      if (s.routine === "dictogloss" || s.routine === "model, then write") ok(`${d.id} / ${s.title}: ${s.routine} has its original text (15-90 words)`, !!s.text && (s.text.text.split(/\s+/).length >= 15) && s.text.text.split(/\s+/).length <= 90, String(s.text?.text.split(/\s+/).length));
      if (["sentence combining", "expand it", "fix it"].includes(s.routine)) ok(`${d.id} / ${s.title}: ${s.routine} has 3+ items, each with a model answer`, (s.items ?? []).length >= 3 && s.items.every((i) => i.q && i.answer));
      ok(`${d.id} / ${s.title}: 4-15 minutes`, s.minutes >= 4 && s.minutes <= 15, String(s.minutes));
    }
    for (const s of d.slides.filter((x) => x.kind === "vlog" && x.rubric)) {
      ok(`${d.id} / ${s.title}: a recorded talk has 2-6 scored criteria, a 30-600 s cap and a child's summary`,
        s.rubric.length >= 2 && s.rubric.length <= 6 && s.rubric.every((r) => r.label && r.description && r.weight > 0)
        && Number.isInteger(s.maxSeconds) && s.maxSeconds >= 30 && s.maxSeconds <= 600 && !!s.kidSummary && (s.steps ?? []).length > 0);
    }
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
  // A unit with a Lab: everything it names is in the decks, every lesson gets a fluency
  // routine and a writing routine, and about one recorded talk a week (every other lesson).
  if (u.lab) {
    ok(`${f}: the Lab names only slides and decks the unit has`, u.lab.issues.length === 0, u.lab.issues.slice(0, 4).join(" | "));
    ok(`${f}: every lesson has a fluency routine and a writing routine`, u.decks.every((d) => d.slides.some((s) => s.kind === "fluency") && d.slides.some((s) => s.kind === "writing")),
      u.decks.filter((d) => !(d.slides.some((s) => s.kind === "fluency") && d.slides.some((s) => s.kind === "writing"))).map((d) => d.id).join(", "));
    const talks = u.decks.filter((d) => d.slides.some((s) => s.kind === "vlog" && s.rubric)).length;
    ok(`${f}: a recorded talk about every other lesson (${talks} for ${u.decks.length} lessons)`, talks >= Math.max(1, Math.floor(u.decks.length / 2)));
  }
  if (u.curriculum === "reach-higher") {
    if (u.decks.length === 1) {
      // Unit 1 is a review unit: Jupiter had finished it before the decks, so it has
      // one review lesson (the Wrap-Up block) and its end-of-unit test.
      ok(`${f}: a one-lesson unit is Unit 1's review, on the Wrap-Up block`, u.unit === 1 && u.decks[0].covers?.lesson === "Unit Wrap-Up");
    } else {
      eq(`${f}: a checkpoint quiz mid-unit and a mock test in the last lesson`, u.decks.map((d) => d.slides.filter((s) => s.kind === "check").length), [0, 0, 0, 1, 0, 0, 0, 1]);
      eq(`${f}: one deck per Reach Higher block, in book order`, u.decks.map((d) => d.covers?.lesson), C2.REACH_HIGHER_BLOCKS);
    }
    const tests = (u.assessments ?? []).filter((a) => a.kind === "summative");
    ok(`${f}: one full end-of-unit test, after the unit's last lesson`, tests.length === 1 && tests[0].id === `rh-l3-u${u.unit}-test` && tests[0].afterLesson === u.decks.length);
    ok(`${f}: 5-9 teacher generalizations`, u.generalizations.length >= 5 && u.generalizations.length <= 9);
    ok(`${f}: the grammar strand points at real lessons`, (u.grammarStrand ?? []).length > 0 && u.grammarStrand.every((g) => g.lesson >= 1 && g.lesson <= u.decks.length));
    // A printed test lists options in file order, so the right answers must not sit in
    // one place: a unit test once had every answer on A. No letter holds more than half
    // of a set, and no more than four in a row.
    const where = (it) => /^[A-D]\.\s/.test(it.answer) ? "ABCD".indexOf(it.answer[0]) : it.options.findIndex((o) => o === it.answer);
    const sets = [
      u.decks.flatMap((d) => d.slides.filter((s) => s.kind === "exam").flatMap((s) => s.items)),
      ...(u.assessments ?? []).map((a) => a.sections.flatMap((s) => s.items)),
    ].map((items) => items.filter((it) => it.options?.length >= 3).map(where).filter((i) => i >= 0));
    if (u.decks.length > 1) {
      // The worksheets and football editions are wired in, not just sitting beside the unit.
      ok(`${f}: printable grammar worksheets attached`, (u.worksheets ?? []).length >= 3);
      // Every unit of 3A and 3B has its publisher video in the school's Drive; one slide plays it.
      eq(`${f}: one slide plays the unit video`, u.decks.flatMap((d) => d.slides).filter((s) => (s.media ?? []).some((m) => m.kind === "video")).length, 1);
      eq(`${f}: the unit video plays from R2, with the Drive copy as backup`,
        u.decks.flatMap((d) => d.slides).flatMap((s) => s.media ?? []).filter((m) => m.kind === "video").flatMap((m) => m.tracks).map((t) => t.r2),
        [`reach-higher/${u.unit <= 4 ? "3a" : "3b"}/unit-${u.unit}-video.mp4`]);
      ok(`${f}: every creative homework has its football edition`, u.decks.flatMap((d) => d.slides.filter((s) => s.kind === "creative"))
        .every((s) => (s.variants ?? []).some((v) => v.interest === "football" && v.task?.title)));
    }
    ok(`${f}: right answers are spread over A-D`, sets.every((pos) => {
      const most = Math.max(0, ...[0, 1, 2, 3].map((p) => pos.filter((x) => x === p).length));
      let run = 0, longest = 0;
      pos.forEach((p, i) => { run = i && p === pos[i - 1] ? run + 1 : 1; longest = Math.max(longest, run); });
      return longest <= 4 && (pos.length < 8 || most <= pos.length / 2);
    }));
  }
  if (u.curriculum === "hec-ielts-sl") {
    const term = PG.TERMS.find((t) => t.year === u.level && t.term === u.unit);
    ok(`${f}: holds the whole term (${term ? term.to - term.from + 1 : "?"} lessons)`, !!term && u.decks.length === term.to - term.from + 1);
    for (const a of u.assessments ?? []) {
      const probs = IR.assessmentProblems(a);
      ok(`${a.id}: a Sun Class mock with listening scripts and the four criteria`, probs.length === 0, probs.join("; "));
    }
    ok(`${f}: every check slide names one of the term's assessments`, u.decks.every((d) => d.slides.filter((s) => s.kind === "check").every((s) => (u.assessments ?? []).some((a) => a.id === s.assessment))));
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
  // A Grammar Champions extension lesson may follow Wrap Up; it is grammar too, and the test then comes after it.
  const champ12 = u12.decks.filter((d) => /^Grammar Champions/.test(d.title)).map((d) => d.lesson);
  eq("Unit 12: grammar on its own for Lessons 3 and 4 (and any Grammar Champions lesson)", u12.decks.filter((d) => V.grammarDeck(d)).map((d) => d.lesson), [3, 4, ...champ12]);
  eq("Unit 12: a quick check mid-unit (in Lesson 4) and the test after the last lesson",
    [V.checksIn(u12.decks[3]), V.unitPlan(u12).map((p) => (p.kind === "test" ? "test" : p.deck.lesson))], [["od2e-l3-u12-check"], [...u12.decks.map((d) => d.lesson), "test"]]);
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

// Parts written beside a unit but not wired in yet (Reach Higher worksheets.ts
// and football.ts, wired by the session that owns those units): they must still
// fit the unit they belong to, so wiring them in cannot break it.
console.log("unwired worksheet and football parts");
for (const { f, u } of units) {
  const dir = join(contentDir, f.replace(/\.ts$/, ""));
  for (const part of ["worksheets.ts", "football.ts"]) {
    const src = join(dir, part);
    if (!existsSync(src)) continue;
    const out = resolve(tmpdir(), `ld-part-${f}-${part}.${process.pid}.mjs`);
    await build({ entryPoints: [src], bundle: true, format: "esm", outfile: out, logLevel: "silent" });
    const val = Object.values(await import(pathToFileURL(out).href))[0];
    const titles = (id) => u.decks.find((d) => d.id === id)?.slides.map((s) => s.title).filter(Boolean) ?? null;
    if (part === "worksheets.ts") {
      for (const w of val) {
        ok(`${f} ${w.id}: follows a real slide`, !!titles(w.deckId)?.includes(w.slide), `${w.deckId} / ${w.slide}`);
        eq(`${f} ${w.id}: Support, Core, Challenge in order`, w.tiers.map((t) => t.level), ["Support", "Core", "Challenge"]);
        ok(`${f} ${w.id}: every item answered, every choice's answer an option`,
          w.tiers.every((t) => t.items.length >= 5 && t.items.every((i) => i.q && i.answer && (!i.options || i.options.includes(i.answer)))));
      }
    } else {
      const creativeDecks = u.decks.filter((d) => d.slides.some((s) => s.kind === "creative")).map((d) => d.id).sort();
      eq(`${f} football: one edition for each deck with creative homework`, Object.keys(val).sort(), creativeDecks);
      ok(`${f} football: complete tasks with a challenge, no names`, Object.values(val).every((v) => v.interest === "football" && v.label && v.task.title
        && v.task.steps.length >= 3 && v.task.frames.length >= 3 && v.task.success.length >= 2 && v.task.challenge)
        && !/\bWilliam\b|\bMr\.?\s*Potato\b/i.test(JSON.stringify(val)));
    }
  }
}

// Oxford Discover companion books (pages from the 2nd-edition answer keys).
{
  const OC = await load("src/lib/lessonDecks/odCompanions.ts", "ld-od-companions");
  eq("Grammar Book pages: Unit 1, Unit 2, Unit 10, Unit 16, Unit 18", [1, 2, 10, 16, 18].map((u) => OC.grammarBookPages(u)),
    [{ pages: "13-16", review: 21 }, { pages: "17-20", review: 21 }, { pages: "53-56", review: 57 }, { pages: "80-83", review: 84 }, { pages: "89-92", review: 93 }]);
  eq("Writing & Spelling: Level 1 Unit 9 is Module 5, pp. 20-23, spelling p. 44", OC.writingBookPages(1, 9), { module: 5, pages: "20-23", spelling: 44 });
  eq("Writing & Spelling: Level 3 Unit 3 is Module 2, pp. 10-15, spelling p. 61", OC.writingBookPages(3, 3), { module: 2, pages: "10-15", spelling: 61 });
  for (const l of [1, 2, 3]) for (let u = 1; u <= 18; u++) {
    const c = OC.odCompanions("oxford-discover-2e", l, u);
    ok(`companions L${l} U${u}: Grammar Book and Writing & Spelling, with pages`, c.length >= 2 && c.every((x) => /^\d+-\d+$/.test(x.pages) && x.note));
  }
  eq("companions: nothing for another course or Level 4", [OC.odCompanions("reach-higher", 3, 1), OC.odCompanions("oxford-discover-2e", 4, 1)], [[], []]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
