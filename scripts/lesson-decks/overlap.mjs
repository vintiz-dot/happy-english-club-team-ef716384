// Copy check: flags any string in a unit file that shares 8 or more consecutive words
// with a source text (the unit's Teacher's Guide pages, kept OUTSIDE the repo).
//
//   node scripts/lesson-decks/overlap.mjs src/content/lessonDecks/od2e-l1-u03.ts <guide-unit.txt> [n=8]
//
// Prints each flagged string with the shared run of words; ends "N flagged".
// The Big Question sentence and plain word lists are allowed to match.
import { readFileSync } from "node:fs";

const [file, srcPath, nArg] = process.argv.slice(2);
if (!file || !srcPath) { console.log("usage: overlap.mjs <unit.ts> <source.txt> [n]"); process.exit(1); }
const N = Number(nArg ?? 8);
const words = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const srcWords = words(readFileSync(srcPath, "utf8"));
const grams = new Set();
for (let i = 0; i + N <= srcWords.length; i++) grams.add(srcWords.slice(i, i + N).join(" "));

const ts = readFileSync(file, "utf8");
const bq = (ts.match(/bigQuestion:\s*"([^"]+)"/) ?? [])[1] ?? "";
const strings = [...ts.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2]);
let flagged = 0;
for (const s of new Set(strings)) {
  if (!s || s === bq || s.includes(bq) && bq) continue;
  const w = words(s);
  for (let i = 0; i + N <= w.length; i++) {
    const g = w.slice(i, i + N).join(" ");
    if (grams.has(g)) { flagged++; console.log(`FLAG: "${s.slice(0, 140)}"\n      shares: "${g}"`); break; }
  }
}
console.log(`${flagged} flagged`);
process.exit(flagged ? 1 : 0);
