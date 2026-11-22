// Checks Sun Class (hec-ielts-sl) deck files against ielts-rules.mjs and renders
// every slide with names filled in.
//
//   node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t1/l02.ts   (one or more lesson files)
//   node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t1.ts       (a whole term)
//
// A lesson file is checked against its row of the pacing guide (hec-ielts/programme.ts).
// A term file also has to hold exactly the term's lessons, in order, and every
// assessment a check slide names. Ends with "N passed, M failed" (exit 1 on a failure).
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deckProblems, assessmentProblems, homeworkMinutes } from "./ielts-rules.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = process.argv.slice(2);
if (!files.length) { console.log("usage: check-ielts.mjs <deck or term file.ts> ..."); process.exit(1); }

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { if (!c) console.log(`  FAIL  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const resolveExt = { name: "ext", setup(b) {
  b.onResolve({ filter: /^@\// }, async (a) => {
    const base = resolve(repo, "src", a.path.slice(2));
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      try { if (statSync(base + ext).isFile()) return { path: base + ext }; } catch {}
    }
    return { path: base };
  });
} };
let n = 0;
async function load(entry) {
  const out = resolve(repo, "node_modules", ".cache", "lesson-decks", `ci-${n++}.${process.pid}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    plugins: [resolveExt], jsx: "automatic", packages: "external" });
  return import(pathToFileURL(out).href);
}

const { LESSONS, TERMS } = await load(resolve(repo, "src/content/lessonDecks/hec-ielts/programme.ts"));
const { SlideView, SlideContext } = await load(resolve(repo, "src/components/lessonDecks/SlideView.tsx"));
const { castSlide } = await load(resolve(repo, "src/lib/lessonDecks/names.ts"));
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const roster = ["Linh Tran", "Minh Le", "An Pham", "Bao Vu", "Chi Do", "Duc Ho", "Ha Ngo"];

const programmeRow = (d) => {
  const term = TERMS.find((t) => t.year === d.level && t.term === d.unit);
  return term ? LESSONS.find((l) => l.n === term.from + d.lesson - 1) : undefined;
};

function checkDeck(d, unit) {
  const row = programmeRow(d);
  ok(`${d.id}: has a row in the pacing guide`, !!row);
  for (const p of deckProblems(d, row)) ok(`${d.id}: ${p}`, false);
  pass++;
  const hw = d.slides.find((s) => s.kind === "homework");
  if (hw) console.log(`  ${d.id}: homework Support/Core/Stretch = ${Object.values(homeworkMinutes(hw)).join("/")} min a week`);
  d.slides.forEach((s, j) => {
    try {
      const shown = castSlide(s, roster, `${d.id}:${j}`);
      const html = renderToStaticMarkup(React.createElement(SlideContext.Provider, { value: { unit, deck: d } }, React.createElement(SlideView, { slide: shown.slide })));
      ok(`${d.id} slide ${j + 1}: renders with names filled`, html.length > 50 && !/\{s\d\}/.test(html));
    } catch (e) { ok(`${d.id} slide ${j + 1}: renders`, false, e.message); }
  });
}

for (const f of files) {
  const mod = await load(resolve(repo, f));
  const values = Object.values(mod).filter((v) => v && typeof v === "object");
  const units = values.filter((v) => Array.isArray(v.decks));
  const decks = values.filter((v) => Array.isArray(v.slides));
  const assessments = values.filter((v) => Array.isArray(v.sections)).concat(values.filter(Array.isArray).flat().filter((v) => v && Array.isArray(v.sections)));
  ok(`${f}: exports a unit, a deck or an assessment`, units.length + decks.length + assessments.length > 0);
  for (const a of assessments) for (const p of assessmentProblems(a)) ok(p, false);
  for (const d of decks) checkDeck(d, undefined);
  for (const u of units) {
    const term = TERMS.find((t) => t.year === u.level && t.term === u.unit);
    ok(`${f}: hec-ielts-sl unit for a real term`, u.curriculum === "hec-ielts-sl" && !!term);
    if (term) ok(`${f}: holds the term's ${term.to - term.from + 1} lessons in order`, u.decks.length === term.to - term.from + 1 && u.decks.every((d, i) => d.lesson === i + 1), `${u.decks.length}`);
    ok(`${f}: title and Big Question`, !!u.title && /\?$/.test(u.bigQuestion ?? ""));
    for (const a of u.assessments ?? []) for (const p of assessmentProblems(a)) ok(p, false);
    for (const d of u.decks) {
      checkDeck(d, u);
      for (const s of d.slides.filter((x) => x.kind === "check")) ok(`${d.id}: check "${s.assessment}" is one of the unit's assessments`, (u.assessments ?? []).some((a) => a.id === s.assessment));
    }
  }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
