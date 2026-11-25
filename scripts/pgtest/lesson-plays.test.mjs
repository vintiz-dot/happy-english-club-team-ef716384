// Class plays (src/lib/lessonDecks/plays.ts): the casting rule that fits one script
// to any class size, and every play in src/content/lessonDecks/plays against the
// rules a play keeps (docs/CLASS_PLAYS.md).
//
// What matters most: at every class size from 1 to 16 every child in the cast has
// a line, no line is lost except a cut cameo's, a role mention ({@id}) never shows
// raw, a play extends a lesson that exists, and the student copy has no teacher fixes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform, build } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
async function load(rel, name) {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
const atSrc = { name: "at-src", setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: resolve(repo, "src", a.path.slice(2)) + (a.path.endsWith(".ts") ? "" : ".ts") })); } };
async function bundle(rel, name) {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  await build({ entryPoints: [resolve(repo, rel)], bundle: true, format: "esm", outfile: out, logLevel: "silent", plugins: [atSrc] });
  return import(pathToFileURL(out).href);
}
const P = await load("src/lib/lessonDecks/plays.ts", "lp-plays");

// ------------------------------------------------------------ casting
console.log("casting one script to any class size");
const sample = {
  id: "t-p1", course: "look", level: 1, unit: 1, afterLesson: 1, title: "T", minutes: 15, band: "6-8", summary: "s",
  targets: { words: ["cat"], grammar: ["It's a ..."] },
  roles: [
    { id: "cat", name: "Cat" },
    { id: "narr", name: "Narrator" },
    { id: "dog", name: "Dog", optional: { give: "kids" } },
    { id: "owl", name: "Owl", optional: { give: "dog" } },
    { id: "bird", name: "Bird", optional: { cut: true } },
    { id: "kids", name: "Kid", group: { max: 4 } },
  ],
  scenes: [{ title: "One", lines: [
    { stage: "{@owl} sits in a tree." },
    { role: "cat", text: "Hello, {@dog}!" }, { role: "narr", text: "A cat." },
    { role: "dog", text: "Woof." }, { role: "owl", text: "Hoo." }, { role: "bird", text: "Tweet." },
    { role: "kids", text: "One." }, { role: "kids", text: "Two." }, { role: "kids", text: "Three." }, { role: "kids", text: "Four." },
    { role: "kids", text: "All of us!", all: true }, { everyone: "The end!" },
  ] }],
  rehearsal: [{ round: "Read", minutes: 5, how: "Read." }], focusOnForm: ["fix"], teacherNote: "note",
};
const lines = (c) => c.scenes.flatMap((s) => s.lines);
const said = (c, text) => lines(c).find((l) => l.text === text);
eq("min and max cast", [P.minCast(sample), P.maxCast(sample)], [3, 9]);
let c = P.castPlay(sample, 3);
eq("3 children: the always-cast roles", c.parts.map((p) => p.label), ["Cat", "Narrator", "Kid"]);
eq("an uncast role's lines go where it says, through a chain", [said(c, "Woof.").labels, said(c, "Hoo.").labels], [["Kid"], ["Kid"]]);
ok("a cut cameo is left out", !said(c, "Tweet.") && c.cut.includes("Bird"));
eq("a role mention reads as whoever says its lines now", [lines(c)[0].text, said(c, "Hello, Kid!")?.labels], ["Kid sits in a tree.", ["Cat"]]);
c = P.castPlay(sample, 4);
eq("4 children: the first optional role is cast", c.parts.map((p) => p.label), ["Cat", "Narrator", "Kid", "Dog"]);
eq("its lines are its own again, and the chain stops at it", [said(c, "Woof.").labels, said(c, "Hoo.").labels], [["Dog"], ["Dog"]]);
c = P.castPlay(sample, 9);
eq("9 children: every role, the group full", c.parts.map((p) => p.label), ["Cat", "Narrator", "Kid 1", "Kid 2", "Kid 3", "Kid 4", "Dog", "Owl", "Bird"]);
eq("group lines in turn", ["One.", "Two.", "Three.", "Four."].map((t) => said(c, t).labels[0]), ["Kid 1", "Kid 2", "Kid 3", "Kid 4"]);
eq("an `all` line is the whole group together", [said(c, "All of us!").labels, said(c, "All of us!").actors.length], [["All Kids"], 4]);
eq("an `everyone` line is the whole cast", said(c, "The end!").actors.length, 9);
c = P.castPlay(sample, 2);
ok("fewer children than the always-cast roles: they double up", c.doubled && c.actors === 2 && c.parts.length === 3);
c = P.castPlay(sample, 12);
eq("past the play's max, the extra children join the group", [c.actors, c.parts.filter((p) => p.role === "kids").length], [12, 7]);
eq("same play, same size, same cast", P.castPlay(sample, 6), P.castPlay(sample, 6));
ok("a bad size reads as one child", P.castPlay(sample, NaN).actors === 1 && P.castPlay(sample, -3).actors === 1);
const st = P.studentPlay(sample);
ok("the student copy has no fixes and no teacher note", st.focusOnForm.length === 0 && !("teacherNote" in st) && sample.focusOnForm.length === 1);

console.log("which plays a class gets");
eq("Oxford Discover", P.playCourseOf("Oxford Discover 2nd edition, Level 1"), { course: "oxford-discover-2e", level: 1 });
eq("Reach Higher", P.playCourseOf("Reach Higher, Level 3"), { course: "reach-higher", level: 3 });
eq("IELTS", P.playCourseOf("HEC IELTS Speaking & Listening, Year 1"), { course: "hec-ielts-sl", level: 1 });
eq("Look, as Mars's label reads", P.playCourseOf("Look 1"), { course: "look", level: 1 });
eq("Look, the long label", P.playCourseOf("National Geographic Look, Level 1"), { course: "look", level: 1 });
eq("unknown", [P.playCourseOf("OD3"), P.playCourseOf(null)], [null, null]);

// ------------------------------------------------------------ every play
console.log("every play in the library");
const { PLAYS: listed } = await bundle("src/content/lessonDecks/plays/index.ts", "lp-library");
// LESSON_PLAYS_FILES="src/content/lessonDecks/plays/od1/u01.ts,..." checks files not listed yet
// (a writer's own new units); with LESSON_PLAYS_ONLY=1 only those files.
const extra = [];
for (const [k, f] of (process.env.LESSON_PLAYS_FILES ?? "").split(",").map((s) => s.trim()).filter(Boolean).entries()) {
  for (const v of Object.values(await bundle(f, `lp-extra-${k}`))) if (Array.isArray(v)) extra.push(...v);
}
const PLAYS = process.env.LESSON_PLAYS_ONLY ? extra : [...listed, ...extra.filter((p) => !listed.some((q) => q.id === p.id))];
const { UNITS } = await bundle("src/content/lessonDecks/index.ts", "lp-units");
ok("plays load", Array.isArray(PLAYS) && PLAYS.length > 0, `${PLAYS?.length} plays`);
const ids = new Set();
// Longest line a child of the band says, in words; and the play's minutes.
const BAND = { "6-8": { words: 10, min: 10, max: 20 }, "7-9": { words: 14, min: 12, max: 25 }, "8-12": { words: 24, min: 15, max: 30 }, "13-16": { words: 40, min: 20, max: 35 } };
const COURSE_BAND = { look: ["6-8"], "oxford-discover-2e": ["7-9", "8-12"], "reach-higher": ["8-12"], "hec-ielts-sl": ["13-16"] };
const NAMEISH = /\b(Linh|Minh|Bảo|Bao|Anh|Huy|Nam|Mai|Lan|Khoa|Ngọc|Ngoc|Trang|Vy|Long)\b/; // a play never carries a child's name
for (const p of PLAYS) {
  const tag = p.id;
  ok(`${tag}: unique id`, !ids.has(p.id)); ids.add(p.id);
  ok(`${tag}: id names its course, level and unit`, new RegExp(`^(od2e-l${p.level}-u${p.unit}|rh-l${p.level}-u${p.unit}|hec-ielts-y${p.level}-t${p.unit}|look${p.level}-u${p.unit})-p\\d+$`).test(p.id));
  const band = BAND[p.band];
  ok(`${tag}: a band for its course`, !!band && COURSE_BAND[p.course]?.includes(p.band), p.band);
  if (!band) continue;
  ok(`${tag}: minutes fit the band (${band.min}-${band.max})`, p.minutes >= band.min && p.minutes <= band.max, String(p.minutes));
  const roleIds = new Set(p.roles.map((r) => r.id));
  ok(`${tag}: role ids are unique and well formed`, roleIds.size === p.roles.length && p.roles.every((r) => /^[a-z][a-z0-9-]*$/.test(r.id)));
  const all = p.scenes.flatMap((s) => s.lines);
  const spoken = all.filter((l) => "role" in l);
  ok(`${tag}: every line's role exists`, spoken.every((l) => roleIds.has(l.role)), spoken.filter((l) => !roleIds.has(l.role)).map((l) => l.role).join(","));
  ok(`${tag}: every role has a line`, p.roles.every((r) => spoken.some((l) => l.role === r.id)), p.roles.filter((r) => !spoken.some((l) => l.role === r.id)).map((r) => r.id).join(","));
  ok(`${tag}: every give goes to a role of this play`, p.roles.every((r) => !r.optional || "cut" in r.optional || roleIds.has(r.optional.give)));
  ok(`${tag}: at least one group role, and room for 12 children`, p.roles.some((r) => r.group && r.group.max >= 3) && P.maxCast(p) >= 12, `max ${P.maxCast(p)}`);
  ok(`${tag}: at most 4 always-cast roles (a class of 4 never doubles up)`, P.minCast(p) <= 4, String(P.minCast(p)));
  for (const r of p.roles.filter((x) => x.group)) {
    const solo = spoken.filter((l) => l.role === r.id && !l.all).length;
    ok(`${tag}: group ${r.id} has a line for each of its ${r.group.max}`, solo >= r.group.max, `${solo} solo lines`);
  }
  const text = JSON.stringify(p);
  const mentions = [...text.matchAll(/\{@([a-z][a-z0-9-]*)\}/g)].map((m) => m[1]);
  ok(`${tag}: every {@role} names a role`, mentions.every((m) => roleIds.has(m)), mentions.filter((m) => !roleIds.has(m)).join(","));
  ok(`${tag}: no name slot or raw token`, !/\{s\d\}|\{@\}/.test(text));
  ok(`${tag}: no child's name`, !NAMEISH.test(text), (NAMEISH.exec(text) ?? [""])[0]);
  const long = [...spoken.map((l) => l.text), ...all.filter((l) => "everyone" in l).map((l) => l.everyone)].filter((t) => t.split(/\s+/).length > band.words);
  ok(`${tag}: lines short enough for ${p.band} (<= ${band.words} words)`, long.length === 0, long[0]);
  const script = all.map((l) => l.text ?? l.everyone ?? l.stage ?? "").join(" ").toLowerCase();
  const missing = p.targets.words.filter((w) => !script.includes(w.toLowerCase().replace(/[.!?]$/, "").slice(0, Math.max(3, w.length - 2))));
  ok(`${tag}: every target word is in the script`, missing.length === 0, missing.join(", "));
  ok(`${tag}: targets, rehearsal rounds and fixes are there`, p.targets.words.length >= 4 && p.targets.grammar.length >= 1 && p.rehearsal.length >= 3 && p.focusOnForm.length >= 1);
  ok(`${tag}: rehearsal fits the minutes`, p.rehearsal.reduce((a, r) => a + r.minutes, 0) <= p.minutes, `${p.rehearsal.reduce((a, r) => a + r.minutes, 0)} > ${p.minutes}`);
  // Every class size a class may have: everyone cast has a line, and no spoken line is lost but a cut cameo's.
  const cutRoles = new Set(p.roles.filter((r) => r.optional && "cut" in r.optional).map((r) => r.id));
  const keep = spoken.filter((l) => !cutRoles.has(l.role)).length + all.filter((l) => "everyone" in l).length;
  const bad = [];
  for (let n = 1; n <= 16; n++) {
    const cst = P.castPlay(p, n);
    const ls = cst.scenes.flatMap((s) => s.lines).filter((l) => l.kind === "line");
    if (cst.actors !== n) bad.push(`n=${n}: ${cst.actors} cast`);
    else if (cst.byActor.some((a) => a.lines === 0)) bad.push(`n=${n}: a child with no line`);
    else if (ls.length < keep) bad.push(`n=${n}: lines lost`);
    else if (JSON.stringify(cst).includes("{@")) bad.push(`n=${n}: raw role mention`);
  }
  ok(`${tag}: casts 1-16 children, everyone with a line`, bad.length === 0, bad.slice(0, 2).join("; "));
  // The lesson it extends exists (Look has no decks: Unit and lesson only need to be positive).
  if (p.course !== "look") {
    const u = UNITS.find((x) => x.curriculum === p.course && x.level === p.level && x.unit === p.unit);
    ok(`${tag}: extends a lesson of a unit with decks`, !!u && u.decks.some((d) => d.lesson === p.afterLesson), `${p.course} ${p.level}.${p.unit} lesson ${p.afterLesson}`);
  } else ok(`${tag}: unit and lesson are positive`, p.unit >= 0 && p.afterLesson >= 1);
}

console.log("how many a class gets");
const per = new Map();
for (const p of PLAYS) per.set(`${p.course} ${p.level} ${p.unit}`, (per.get(`${p.course} ${p.level} ${p.unit}`) ?? 0) + 1);
for (const [k, v] of [...per].sort()) ok(`${k}: at most 9 plays (two or three a month)`, v <= 9, String(v));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
