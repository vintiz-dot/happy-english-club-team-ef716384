// The Speaking & Writing Lab (src/lib/lessonDecks/lab.ts): how a unit's Lab file is
// put into its decks, and what it may not touch; and the weekly recorded talk as
// in-app video homework (src/lib/lessonDecks/talk.ts). Both import only types.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
async function load(rel, name) {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
const L = await load("src/lib/lessonDecks/lab.ts", "ld-lab");
const T = await load("src/lib/lessonDecks/talk.ts", "ld-talk");

const deck = (slides) => ({ id: "x-l1", curriculum: "oxford-discover-2e", level: 1, unit: 3, lesson: 1, title: "T", minutes: 90, inquiryPhases: ["Engage"], book: [], slides });
const base = [
  { kind: "title", title: "Unit 3" },
  { kind: "objectives", items: ["I can say colours."] },
  { kind: "activity", title: "Song", tag: "Warm-up", mode: "whole", minutes: 10, steps: ["Sing."] },
  { kind: "grammar", title: "It is red", form: [], explanation: [], examples: [] },
  { kind: "activity", title: "Run and touch", tag: "Game", mode: "whole", minutes: 12, steps: ["Run."] },
  { kind: "activity", title: "Book page", tag: "Reading", mode: "whole", minutes: 20, steps: ["Read."], book: { book: "SB", pages: "26" } },
  { kind: "speaking", title: "Talk", mode: "pairs", minutes: 20, frames: ["It is ___."], prompts: ["What colour?"] },
  { kind: "homework", items: [{ label: "WB", detail: "p. 20" }] },
  { kind: "reflect", prompts: ["What did you learn?"] },
];
const unit = { curriculum: "oxford-discover-2e", level: 1, unit: 3, title: "U", bigQuestion: "?", generalizations: [], decks: [deck(base)] };
const flu = { kind: "fluency", title: "Colour sprint", routine: "chunk sprint", mode: "whole", minutes: 8, goal: "Fast!", chunks: ["It is red.", "It is blue.", "It is green."], rounds: [{ seconds: 60, say: "Chorus" }, { seconds: 45, say: "Pairs" }], steps: ["Go."], feedback: "Prompt first." };
const wri = { kind: "writing", title: "Fix it", routine: "fix it", mode: "solo", minutes: 6, steps: ["Fix."], items: [{ q: "It red.", answer: "It is red." }], checklist: ["Capital letter", "Full stop"] };
const talk = { kind: "vlog", title: "My colours talk", prompt: "Show three things and say their colours.", length: "30-60 seconds", tiers: [{ level: "Core", who: "Everyone", frames: ["It is ___."], tips: ["Smile."] }],
  steps: ["Say it three times.", "Record once."], maxSeconds: 90, kidSummary: "Say the colour of each thing.", words: ["red"], grammar: ["It is + colour"],
  rubric: [{ label: "Colour words", description: "Names each colour.", weight: 3 }, { label: "Speaks smoothly", description: "Keeps going.", weight: 2 }] };

console.log("a Lab put into a deck");
const good = L.withLab({ decks: { "x-l1": { objectives: ["I can say it fast."], add: [{ after: "It is red", slide: flu }, { after: "Colour sprint", slide: wri }], trim: { "Run and touch": 6, "Song": 6 }, talk } } }, unit);
const s = good.decks[0].slides;
eq("no issues", good.lab.issues, []);
eq("slides in order: the routine after the grammar, the writing after the routine, the talk after the homework",
  s.map((x) => x.title ?? x.kind), ["Unit 3", "objectives", "Song", "It is red", "Colour sprint", "Fix it", "Run and touch", "Book page", "Talk", "homework", "My colours talk", "reflect"]);
eq("trimmed slides are shorter", [s[2].minutes, s[6].minutes], [6, 6]);
eq("objective added", s[1].items, ["I can say colours.", "I can say it fast."]);
eq("counted", good.lab.added, 3);
ok("the unit as written is untouched", unit.decks[0].slides.length === base.length && base[2].minutes === 10);
ok("no Lab, same unit", L.withLab(undefined, unit) === unit);
eq("an anchor by kind", L.withLab({ decks: { "x-l1": { add: [{ after: "@speaking", slide: wri }] } } }, unit).decks[0].slides[7].title, "Fix it");

console.log("what a Lab may not do");
const bad = L.withLab({ decks: {
  "x-l1": { add: [{ after: "Nope", slide: flu }], trim: { "Book page": 30, "It is red": 3, "Song": 2, "Gone": 4 }, drop: ["Book page", "It is red", "Missing"] },
  "x-l9": {},
} }, unit);
const issues = bad.lab.issues.join(" | ");
ok("an unknown deck is reported", /x-l9: no such deck/.test(issues));
ok("an unknown anchor is reported", /add "Colour sprint": no slide "Nope"/.test(issues));
ok("a book page is never dropped", /drop "Book page": a activity slide with book pages is kept/.test(issues) && bad.decks[0].slides.some((x) => x.title === "Book page"));
ok("the grammar is never dropped or trimmed", /drop "It is red"/.test(issues) && /trim "It is red"/.test(issues));
ok("a trim that lengthens or goes under 3 minutes is refused", /trim "Book page": 20 -> 30/.test(issues) && /trim "Song": 10 -> 2/.test(issues));
ok("unknown titles are reported", /trim "Gone"/.test(issues) && /drop "Missing"/.test(issues));
const over = L.withLab({ decks: { "x-l1": { add: [{ after: "@grammar", slide: { ...flu, minutes: 15 } }] } } }, { ...unit, decks: [deck(base.map((x) => (x.minutes ? { ...x, minutes: x.minutes + 6 } : x)))] });
ok("a lesson over its minutes is reported", /add up to 101 of 90/.test(over.lab.issues.join(" ")), over.lab.issues.join(" "));
ok("a talk with no homework slide is reported", /no homework slide/.test(L.withLab({ decks: { "x-l1": { talk } } }, { ...unit, decks: [deck(base.filter((x) => x.kind !== "homework"))] }).lab.issues.join(" ")));

console.log("the weekly talk as video homework");
const h = T.talkHomework(good.decks[0]);
ok("found on the deck", !!h && T.talkSlide(good.decks[0]).title === "My colours talk");
eq("title names the unit and lesson", h.title, "Unit 3 Lesson 1: My colours talk");
eq("recorder cap", h.maxSeconds, 90);
eq("rubric criteria with keys", h.rubric.criteria, [{ key: "colour_words", label: "Colour words", description: "Names each colour.", weight: 3 }, { key: "speaks_smoothly", label: "Speaks smoothly", description: "Keeps going.", weight: 2 }]);
eq("targets and the child's summary", [h.rubric.target_vocabulary, h.rubric.target_grammar, h.rubric.kid_summary], [["red"], ["It is + colour"], "Say the colour of each thing."]);
ok("the body has the prompt, the practice steps and the frames", h.body.includes("Show three things") && h.body.includes("1. Say it three times.") && h.body.includes("- It is ___."));
eq("caps clamp to the recorder's limits", [T.talkHomework(deck([{ ...talk, maxSeconds: 5 }])).maxSeconds, T.talkHomework(deck([{ ...talk, maxSeconds: 9999 }])).maxSeconds], [30, 600]);
ok("a vlog without a rubric is not a talk", T.talkHomework(deck([{ ...talk, rubric: undefined }])) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
