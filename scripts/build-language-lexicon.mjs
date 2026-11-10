// Builds src/lib/languageSupport/lexicon.json from the language-support
// project's lexicon/concepts.json (ARASAAC picks per concept).
//
//   node scripts/build-language-lexicon.mjs "<path>/language support/lexicon/concepts.json"
//
// Trimmed to what the picture strip needs: the chosen pictogram and up to
// eight alternatives for the teacher's picker. Structural and no-picture
// concepts are dropped - the strip handles prepositions itself.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const src = process.argv[2];
if (!src) { console.error("usage: node scripts/build-language-lexicon.mjs <concepts.json>"); process.exit(1); }
const data = JSON.parse(readFileSync(src, "utf8"));
const out = {};
for (const [concept, e] of Object.entries(data.concepts)) {
  if (!e.pictogram || e.match === "structural" || e.match === "none") continue;
  if (concept.includes(".") || concept.includes("-")) continue; // internal names (be.located, in-front-of)
  const alt = (e.alternatives || []).map((a) => a.pictogram).filter((id) => id !== e.pictogram).slice(0, 8);
  out[concept] = alt.length ? { p: e.pictogram, m: e.match === "exact" ? 1 : 0, a: alt } : { p: e.pictogram, m: e.match === "exact" ? 1 : 0 };
}
const dest = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "languageSupport", "lexicon.json");
writeFileSync(dest, JSON.stringify({ attribution: data.attribution, concepts: out }));
console.log(`${Object.keys(out).length} concepts -> ${dest}`);
