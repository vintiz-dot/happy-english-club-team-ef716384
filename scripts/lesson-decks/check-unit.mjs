// Checks ONE lesson-deck unit file against the deck rules and renders every slide.
//
//   node scripts/lesson-decks/check-unit.mjs src/content/lessonDecks/od2e-l1-u03.ts
//
// The level and unit come from the file name (od2e-l<level>-u<NN>.ts). Prints each
// failure and ends with "N passed, M failed" (exit 1 on any failure). The suite's
// own rules live in scripts/pgtest/lesson-decks-lib.test.mjs; this adds the ones a
// builder needs while writing a unit: ids, export name, the book lesson pattern
// (odd unit: 4 decks, even unit: 5 with a Wrap Up), pages inside the unit, a
// homework with Workbook pages, a grammar slide, a vlog, and that each slide renders.
import { build } from "esbuild";
import { resolve, dirname, basename } from "node:path";
import { statSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
// The fields each slide kind may carry, read from src/lib/lessonDecks/types.ts (so new kinds and fields
// added there are known here); anything else would fail the app typecheck.
const typesSrc = readFileSync(resolve(repo, "src/lib/lessonDecks/types.ts"), "utf8");
const typesLf = typesSrc.replace(/\r\n/g, "\n");
const slideUnion = typesLf.slice(typesLf.indexOf("export type Slide ="), typesLf.indexOf(";\n\n", typesLf.indexOf("export type Slide =")) + 1);
const KEYS = {};
for (const block of slideUnion.split(/\n\s*\| \{/)) {
  const k = /kind: "([a-z]+)"/.exec(block); if (!k) continue;
  KEYS[k[1]] = [...block.matchAll(/(\w+)\??:/g)].map((m) => m[1]);
}
const file = process.argv[2];
const m = file && basename(file).match(/^od2e-l(\d+)-u(\d\d)\.ts$/);
if (!m) { console.log("usage: check-unit.mjs src/content/lessonDecks/od2e-l<level>-u<NN>.ts"); process.exit(1); }
const level = Number(m[1]), unitNo = Number(m[2]);
// Student Book page range of a unit: Levels 1-3 start Unit 1 at page 6, ten pages a unit.
const sbFrom = 6 + (unitNo - 1) * 10, sbTo = sbFrom + 9;

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
async function load(entry, name) {
  const out = resolve(repo, "node_modules", ".cache", "lesson-decks", `${name}.${process.pid}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    plugins: [resolveExt], jsx: "automatic", packages: "external" });
  return import(pathToFileURL(out).href);
}

const mod = await load(resolve(repo, file), `cu-${level}-${unitNo}`);
const expName = `odL${level}U${unitNo}`;
const unit = mod[expName];
ok(`exports ${expName}`, !!unit, `exports: ${Object.keys(mod).join(", ")}`);
if (!unit) { console.log(`${pass} passed, ${fail} failed`); process.exit(1); }

ok("curriculum, level and unit", unit.curriculum === "oxford-discover-2e" && unit.level === level && unit.unit === unitNo);
ok("title and Big Question", !!unit.title && /\?$/.test(unit.bigQuestion ?? ""));
ok("3+ planned generalizations", Array.isArray(unit.generalizations) && unit.generalizations.length >= 3);
const even = unitNo % 2 === 0;
const pattern = even ? ["Get Ready", "Read", "Understand", "Communicate", "Wrap Up"] : ["Get Ready", "Read", "Understand", "Communicate"];
// An optional extension lesson may follow the book's lessons: "Grammar Champions", covering the unit's Understand lesson.
const champ = unit.decks.length === pattern.length + 1 && /^Grammar Champions/.test(unit.decks[pattern.length].title);
if (champ) pattern.push("Understand");
ok(`${pattern.length} decks (${even ? "even unit: ends with Wrap Up" : "odd unit: Big Question + Get Ready first"})`, unit.decks.length === pattern.length, `${unit.decks.length}`);
if (champ) { const g = unit.decks[unit.decks.length - 1]; ok("Grammar Champions: a grammar slide, two speaking slides and a writing step", g.slides.some((s) => s.kind === "grammar") && g.slides.filter((s) => s.kind === "speaking").length >= 2 && g.slides.some((s) => (s.kind === "activity" && s.tag === "Writing") || s.kind === "project")); }

const json = JSON.stringify(unit);
ok("no stray slot beyond {s9} or malformed token", !/\{s(?:0|[1-9]\d)\}|\{s\}/.test(json));
ok("no Twinkl link other than a resource page", (json.match(/twinkl[^"]*/g) ?? []).every((u) => /^twinkl\.com\/resource\/[a-z0-9-]+$/.test(u.replace(/^https:\/\/www\./, "")) || !u.includes("/")));

let grammar = 0, vlog = 0, wbHomework = 0;
const { SlideView } = await load(resolve(repo, "src/components/lessonDecks/SlideView.tsx"), "cu-slideview");
const { castSlide } = await load(resolve(repo, "src/lib/lessonDecks/names.ts"), "cu-names");
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const roster = ["Linh Tran", "Minh Le", "An Pham", "Bao Vu", "Chi Do", "Duc Ho", "Ha Ngo", "Khoa Bui", "Mai Dang"];

unit.decks.forEach((d, i) => {
  const tag = d.id;
  ok(`${tag}: id od2e-l${level}-u${String(unitNo).padStart(2, "0")}-l${i + 1}`, d.id === `od2e-l${level}-u${String(unitNo).padStart(2, "0")}-l${i + 1}`);
  ok(`${tag}: lesson ${i + 1}, level/unit match`, d.lesson === i + 1 && d.level === level && d.unit === unitNo && d.curriculum === "oxford-discover-2e");
  ok(`${tag}: 90 minutes`, d.minutes === 90);
  const timed = d.slides.filter((s) => typeof s.minutes === "number").reduce((a, s) => a + s.minutes, 0);
  ok(`${tag}: timed slides 75-90 min`, timed >= 75 && timed <= 90, `${timed}`);
  ok(`${tag}: covers ${pattern[i]}`, d.covers?.lesson === pattern[i] && d.covers?.unitFrom === (pattern[i] === "Wrap Up" ? unitNo - 1 : unitNo),
    JSON.stringify(d.covers));
  const sb = d.book.filter((b) => b.book === "SB"), wb = d.book.filter((b) => b.book === "WB");
  ok(`${tag}: SB and WB pages listed`, sb.length > 0 && wb.length > 0);
  const nums = (p) => String(p).split(/[-–,]/).map((x) => Number(x.trim())).filter(Number.isFinite);
  const wrapFrom = even ? sbTo + 1 - 20 : sbFrom; // a Wrap Up sits at the end of the pair
  ok(`${tag}: SB pages inside the unit (${sbFrom - (even ? 10 : 0)}-${sbTo})`, sb.every((b) => nums(b.pages).every((n) => n >= Math.min(wrapFrom, sbFrom) && n <= sbTo)),
    sb.map((b) => b.pages).join(" "));
  ok(`${tag}: a speaking activity`, d.slides.some((s) => s.kind === "speaking" || (s.kind === "activity" && s.tag === "Speaking")));
  ok(`${tag}: starts with a title slide and objectives`, d.slides[0]?.kind === "title" && d.slides[1]?.kind === "objectives");
  const hw = d.slides.find((s) => s.kind === "homework");
  ok(`${tag}: homework slide`, !!hw);
  if (hw?.items.some((it) => it.book?.book === "WB")) wbHomework++;
  ok(`${tag}: ends with reflect or homework near the end`, d.slides.slice(-3).some((s) => s.kind === "reflect" || s.kind === "homework"));
  ok(`${tag}: inquiry phases set`, Array.isArray(d.inquiryPhases) && d.inquiryPhases.length > 0);
  for (const r of d.resources ?? []) ok(`${tag}: resource link ${r.url}`, /^https:\/\/www\.twinkl\.com\/resource\/[a-z0-9-]+$/.test(r.url) && !!r.title && !!r.use);
  const titles = d.slides.map((s) => s.title).filter(Boolean);
  ok(`${tag}: slide titles are unique within the deck`, new Set(titles).size === titles.length, titles.filter((t, k) => titles.indexOf(t) !== k).join(" | "));
  const deckKeys = ["id", "curriculum", "level", "unit", "lesson", "title", "minutes", "inquiryPhases", "book", "covers", "resources", "slides"];
  ok(`${tag}: only known deck fields`, Object.keys(d).every((k) => deckKeys.includes(k)), Object.keys(d).filter((k) => !deckKeys.includes(k)).join(", "));
  d.slides.forEach((s, j) => {
    // The fields each slide kind may carry (src/lib/lessonDecks/types.ts); anything else fails the app typecheck.
    const allowed = KEYS[s.kind];
    const extra = allowed ? Object.keys(s).filter((k) => k !== "kind" && !allowed.includes(k)) : ["unknown kind " + s.kind];
    ok(`${tag} slide ${j + 1} (${s.kind}): only fields its kind has`, extra.length === 0, extra.join(", "));
    const TAGS = ["Warm-up", "Vocabulary", "Reading", "Listening", "Grammar", "Speaking", "Writing", "Game", "Phonics", "Review", "Cool-down"];
    if (s.kind === "activity" && s.tag) ok(`${tag} slide ${j + 1}: activity tag is one of ${TAGS.join("/")}`, TAGS.includes(s.tag), s.tag);
    if (s.kind === "vocab") ok(`${tag} slide ${j + 1}: vocab words have word, meaning, example`, s.words.every((w) => w.word && w.meaning && w.example && Object.keys(w).length === 3));
    if (s.kind === "homework") ok(`${tag} slide ${j + 1}: homework items have a label and detail`, s.items.every((it) => it.label && it.detail));
    if (s.kind === "vlog") ok(`${tag} slide ${j + 1}: vlog tiers have level, who, frames, tips`, s.tiers.every((t) => Object.keys(t).every((k) => ["level", "who", "frames", "tips"].includes(k)) && t.who && Array.isArray(t.frames) && Array.isArray(t.tips)));
    if (s.kind === "grammar") ok(`${tag} slide ${j + 1}: grammar form/examples/pitfalls shapes`, s.form.every((f) => f.label && f.pattern) && s.examples.every((e) => e.text) && (s.pitfalls ?? []).every((p) => p.wrong && p.right && p.why));
    const books = [s.book, s.ref].filter(Boolean);
    ok(`${tag} slide ${j + 1}: book refs are {book: SB|WB, pages, activities?, note?, track?}`, books.every((b) => ["SB", "WB"].includes(b.book) && typeof b.pages === "string" && Object.keys(b).every((k) => ["book", "pages", "activities", "note", "track"].includes(k))));
    if (s.kind === "grammar") { grammar++; ok(`${tag} slide ${j + 1}: grammar has hook, form, examples, pitfalls`, !!s.hook && s.form.length > 0 && s.examples.length >= 3 && (s.pitfalls ?? []).length > 0); }
    if (s.kind === "vlog") { vlog++; ok(`${tag} slide ${j + 1}: vlog has Support, Core and Stretch`, ["Support", "Core", "Stretch"].every((l) => s.tiers.some((t) => t.level === l))); }
    if (typeof s.minutes === "number") ok(`${tag} slide ${j + 1}: 3-20 minutes`, s.minutes >= 3 && s.minutes <= 20, `${s.minutes}`);
    try {
      const shown = castSlide(s, roster, `${d.id}:${j}`);
      const html = renderToStaticMarkup(React.createElement(SlideView, { slide: shown.slide, deck: d }));
      ok(`${tag} slide ${j + 1}: renders with names filled`, html.length > 50 && !/\{s\d\}/.test(html));
    } catch (e) { ok(`${tag} slide ${j + 1}: renders`, false, e.message); }
  });
});
ok("a grammar slide somewhere in the unit", grammar > 0);
ok("a vlog slide somewhere in the unit", vlog > 0);
ok("Workbook pages set as homework in every deck", wbHomework === unit.decks.length, `${wbHomework} of ${unit.decks.length}`);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
