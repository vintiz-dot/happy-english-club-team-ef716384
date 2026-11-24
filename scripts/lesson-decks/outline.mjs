// Prints a unit's lessons slide by slide (kind, title, minutes, tag) with each
// lesson's timed total, and the Lab's issues when the unit has a Lab. For writing
// or checking a unit's Speaking & Writing Lab (src/content/lessonDecks/<unit>/lab.ts).
//
//   node scripts/lesson-decks/outline.mjs src/content/lessonDecks/od2e-l1-u10.ts [--grammar]
//
// --grammar also prints each grammar slide's patterns and examples, and every
// speaking slide's frames (the language a Lab turns into fluency chunks).
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const file = process.argv[2];
const withGrammar = process.argv.includes("--grammar");
if (!file) { console.log("usage: outline.mjs src/content/lessonDecks/<unit>.ts [--grammar]"); process.exit(1); }
const alias = { name: "alias", setup(b) {
  b.onResolve({ filter: /^@\// }, (a) => {
    const base = resolve(repo, "src", a.path.slice(2));
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) { try { if (statSync(base + ext).isFile()) return { path: base + ext }; } catch {} }
    return { path: base };
  });
} };
const out = resolve(tmpdir(), `ld-outline-${process.pid}.mjs`);
await build({ entryPoints: [resolve(repo, file)], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", plugins: [alias] });
const mod = await import(pathToFileURL(out).href);
const unit = Object.values(mod).find((v) => v && typeof v === "object" && Array.isArray(v.decks));
if (!unit) { console.log("no unit exported"); process.exit(1); }
console.log(`${unit.curriculum} ${unit.level}.${unit.unit} ${unit.title}${unit.lab ? ` · Lab: ${unit.lab.added} slides added` : ""}`);
for (const d of unit.decks) {
  const timed = d.slides.reduce((n, s) => n + (typeof s.minutes === "number" ? s.minutes : 0), 0);
  console.log(`\n${d.id} · ${d.title} · ${timed} of ${d.minutes} min timed`);
  for (const s of d.slides) {
    const t = s.title ?? "";
    const extra = [s.tag, s.routine, s.mode, s.book ? `${s.book.book} ${s.book.pages}` : null, s.rubric ? "talk" : null].filter(Boolean).join(", ");
    console.log(`  ${String(typeof s.minutes === "number" ? s.minutes : "-").padStart(3)}  ${s.kind.padEnd(10)} ${t}${extra ? `  (${extra})` : ""}`);
    if (withGrammar && s.kind === "grammar") {
      for (const f of s.form) console.log(`        form: ${f.label}: ${f.pattern}`);
      for (const e of s.examples) console.log(`        e.g.: ${e.text}`);
      for (const p of s.pitfalls ?? []) console.log(`        not: ${p.wrong} -> ${p.right}`);
    }
    if (withGrammar && (s.kind === "speaking" || (s.kind === "activity" && s.frames))) for (const f of s.frames ?? []) console.log(`        frame: ${f}`);
  }
}
for (const i of unit.lab?.issues ?? []) console.log(`LAB ISSUE  ${i}`);
