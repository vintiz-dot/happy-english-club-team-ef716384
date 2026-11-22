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

console.log("decks in src/content/lessonDecks");
const contentDir = resolve(repo, "src/content/lessonDecks");
const files = existsSync(contentDir) ? readdirSync(contentDir, { recursive: true }).filter((f) => /\.ts$/.test(f) && !/index\.ts$/.test(f)) : [];
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
    ok(`${d.id}: says which book lesson it covers`, !!d.covers && Number.isInteger(d.covers.unitFrom) &&
      ["Big Question", "Get Ready", "Read", "Understand", "Communicate", "Wrap Up"].includes(d.covers.lesson));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
