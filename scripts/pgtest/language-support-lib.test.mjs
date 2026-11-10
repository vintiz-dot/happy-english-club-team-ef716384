// The browser-side logic of Language Support and of the easy video recorder.
// Drives the real src/lib/languageSupport/strip.ts and src/lib/video/kidVideo.ts
// (both import nothing, so each loads on its own) and the generated lexicon.
//
// What matters most: every token of the sentence appears exactly once in the
// strip (a picture, or a bare word), a teacher's own choice beats the lexicon,
// an imported set can never point a child's browser at another address, and a
// dropped upload is repeated instead of failing the child.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

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
const S = await load("src/lib/languageSupport/strip.ts", "ls-strip");
const K = await load("src/lib/video/kidVideo.ts", "ls-kid");
const lexicon = JSON.parse(readFileSync(resolve(repo, "src/lib/languageSupport/lexicon.json"), "utf8")).concepts;

const build = (text, extra = {}) => S.buildStrip(text, { lexicon, ...extra });
const drawn = (strip) => strip.cells.filter((c) => c.kind !== "word");

console.log("=== tokens ===");
eq("words and punctuation", S.tokenize("The cat's on the mat."), ["The", "cat's", "on", "the", "mat", "."]);
eq("numbers stay whole", S.tokenize("I have 12 apples"), ["I", "have", "12", "apples"]);

console.log("=== every token appears once ===");
for (const text of ["The dog runs in the park.", "She is not happy.", "Two birds sat on a tree!", "I don't like fish", ""]) {
  const strip = await build(text);
  const seen = strip.cells.flatMap((c) => c.tokens).sort((a, b) => a - b);
  eq(`"${text}"`, seen, strip.tokens.map((_, i) => i));
}

console.log("=== pictures from the lexicon ===");
{
  const strip = await build("The dog runs in the park.");
  const by = Object.fromEntries(drawn(strip).map((c) => [c.concept, c]));
  ok("dog is drawn from the lexicon", by.dog?.pictogram === lexicon.dog.p);
  ok("runs finds its dictionary form, run", by.run?.pictogram === lexicon.run.p && by.run.text === "runs");
  ok("the preposition in is drawn", !!by.in?.url);
  ok("the, a and . stay as words", strip.cells.filter((c) => c.kind === "word").map((c) => c.text).join(" ") === "The the .");
  ok("urls point at ARASAAC only", drawn(strip).every((c) => /^https:\/\/static\.arasaac\.org\/pictograms\/\d+\/\d+_500\.png$/.test(c.url)));
}

console.log("=== plurals, counts, tense, negation ===");
{
  const many = drawn(await build("The cats sleep."))[0];
  eq("a bare plural draws three, marked indefinite", [many.concept, many.repeat, many.indefinite], ["cat", 3, true]);
  // -s is a plural after "the", a number or a verb, and a verb after a noun or pronoun.
  const repeatOf = async (text, concept) => drawn(await build(text)).find((c) => c.concept === concept)?.repeat;
  eq("the dog runs: runs is a verb, drawn once", await repeatOf("The dog runs.", "run"), 1);
  eq("she sits: so is sits", await repeatOf("She sits", "sit"), 1);
  eq("I see dogs: dogs follows a verb, so it is a plural", await repeatOf("I see dogs", "dog"), 3);
  eq("Dogs run: a plural at the start of a sentence", await repeatOf("Dogs run", "dog"), 3);
  eq("the big cats: a plural after an adjective", await repeatOf("The big cats sit", "cat"), 3);
  const two = drawn(await build("Two birds fly"))[0];
  eq("a known count draws that many", [two.concept, two.repeat, two.indefinite], ["bird", 2, false]);
  const lots = drawn(await build("11 apples"))[0];
  eq("more than five draws one and states the number", [lots.repeat, lots.count], [1, 11]);
  const past = drawn(await build("She ate an apple")).find((c) => c.concept === "eat");
  ok("an irregular past finds eat and asks ARASAAC for the past", past?.action === "past" && /action=past/.test(past.url));
  const neg = drawn(await build("The boy is not happy")).find((c) => c.concept === "happy");
  ok("not crosses out the next picture", neg?.negated === true);
  const contraction = drawn(await build("I don't like fish")).find((c) => c.concept === "like");
  ok("so does n't", contraction?.negated === true);
  eq("look after is one picture over two words", drawn(await build("Look after the baby")).find((c) => c.concept === "look after")?.tokens, [0, 1]);
}

console.log("=== a teacher's choice, and words the lexicon does not know ===");
{
  const mine = drawn(await build("The dog runs", { overrides: { dog: 4242 } })).find((c) => c.concept === "dog");
  eq("an override beats the lexicon", [mine.pictogram, mine.match, mine.overridden], [4242, "chosen", true]);
  const asked = [];
  const lookup = async (term) => { asked.push(term); return term === "giraffe" ? { pictogram: 777, exact: true } : null; };
  const strip = await build("The giraffe zorbs", { lookup });
  ok("an unknown word is looked up", asked.includes("giraffe"));
  const g = drawn(strip).find((c) => c.concept === "giraffe");
  eq("  and drawn when found", [g?.pictogram, g?.match], [777, "exact"]);
  const z = drawn(strip).find((c) => c.concept === "zorb");
  eq("  and left without a picture, flagged, when not", [z?.match, z?.url], ["unknown", undefined]);
  ok("function words are never looked up", !asked.some((t) => ["the", "a", "is"].includes(t)));
  ok("a lookup that throws is a missing picture, not a crash",
    (await build("The giraffe", { lookup: async () => { throw new Error("offline"); } })).cells.length > 0);
}

console.log("=== what the teacher is asked to check ===");
{
  const strip = await build("The giraffe about zorbs", { lookup: async (t) => (t === "giraffe" ? { pictogram: 1, exact: false } : null) });
  const flags = S.flagsIn(strip);
  ok("a fuzzy match is flagged", flags.includes("giraffe: no exact symbol"));
  ok("a word with no picture is flagged", flags.includes("zorb: no symbol at all"));
  ok("the lexicon's own fuzzy match is flagged too", flags.includes("about: no exact symbol"));
  const dog = await build("The dog");
  eq("an exact picture is clean", S.flagsIn(dog), []);
}

console.log("=== editing a cell ===");
{
  const strip = await build("The dog sits");
  const dog = strip.cells.find((c) => c.concept === "dog");
  const changed = S.withPictogram(dog, 31);
  eq("choosing another picture", [changed.pictogram, changed.match, changed.url], [31, "chosen", S.pictureUrl(31, null)]);
  const bare = S.withoutPicture(changed, strip.tokens);
  eq("taking it off leaves the word", [bare.kind, bare.text, bare.pictogram], ["word", "dog", undefined]);
  const word = strip.cells.find((c) => c.text === "The");
  const added = S.withPictogram(word, 99);
  eq("a bare word can be given one", [added.kind, added.concept, added.pictogram], ["entity", "the", 99]);
}

console.log("=== importing a set from the language-support project ===");
{
  const imported = S.readImportedSet({
    title: "Week 1",
    sentences: [
      { text: "The dog runs.", tokens: ["The", "dog", "runs", "."], approved: "2026-09-20",
        provenance: { graph: { big: true } },
        cells: [
          { tokens: [0], start: 0, text: "The", kind: "word", carried: true },
          { tokens: [1], start: 1, text: "dog", kind: "entity", concept: "dog", pictogram: 2517, url: "https://evil.example/x.png", repeat: 1 },
          { tokens: [2], start: 2, text: "runs", kind: "event", concept: "run", pictogram: 7, url: "https://api.arasaac.org/v1/pictograms/7?action=past" },
        ] },
      { text: "   ", cells: [] },
      { text: "No cells", cells: [] },
      null,
    ],
  });
  eq("good sentences come through, the rest are counted", [imported.title, imported.sentences.length, imported.skipped], ["Week 1", 1, 3]);
  const cells = imported.sentences[0].cells;
  eq("a foreign url is rebuilt from the pictogram id", cells[1].url, "https://static.arasaac.org/pictograms/2517/2517_500.png");
  eq("tense saved in a url is kept", [cells[2].action, cells[2].url], ["past", "https://api.arasaac.org/v1/pictograms/7?action=past&download=false"]);
  ok("the parser's graph is not carried across", !("provenance" in imported.sentences[0]));
  eq("garbage in is an empty set", S.readImportedSet("nope").sentences, []);
}

console.log("=== the easy video recorder ===");
{
  ok("Zalo's browser is caught", K.inAppBrowser("Mozilla/5.0 (Linux; Android 13) Zalo/22.1"));
  ok("so is Facebook's", K.inAppBrowser("Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/430.0]"));
  ok("Chrome is not", !K.inAppBrowser("Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36"));
  eq("recorder phases map onto three steps", ["idle", "preview", "countdown", "recording", "review"].map(K.stepFor), ["look", "record", "record", "record", "send"]);

  let calls = 0;
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  eq("a dropped upload is repeated", await K.withRetry(async () => { if (++calls < 3) throw new Error("drop"); return "sent"; }, {}, sleep), "sent");
  eq("  after a growing wait", [calls, waits], [3, [800, 1600]]);
  let n = 0;
  const err = await K.withRetry(async () => { n++; throw new Error("down"); }, { tries: 3 }, sleep).catch((e) => e.message);
  eq("it gives up after the last try, with the real error", [n, err], [3, "down"]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
