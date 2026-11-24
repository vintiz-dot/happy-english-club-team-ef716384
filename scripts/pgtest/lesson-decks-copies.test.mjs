// Every export of a lesson deck, worksheet, check or test comes as a teacher copy
// and a student copy (src/lib/lessonDecks/audience.ts). This renders BOTH copies of
// everything in src/content/lessonDecks, every course, the way the print buttons do
// (deckMarkup / worksheetMarkup / assessmentMarkup / homeworkMarkup in DeckPlayer.tsx),
// and holds the student copy to: no answer, no listening script, no decoding lifted
// from a script, no teacher note, no marking rubric, no teacher-only link. The
// teacher copy must still carry them, open.
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const bad = [];
const ok = (n, c, x = "") => { if (c) pass++; else { fail++; bad.push(`  FAIL  ${n}${x ? " :: " + x : ""}`); } };

// DeckPlayer imports the HEC Docs client (and through it Supabase) for its print
// buttons; the markup builders this test renders need neither, so they are stubbed.
const STUBS = {
  "@/lib/hecDocs": "export const tryMakeDocument = async () => null; export const downloadBlob = () => {};",
  "@/integrations/supabase/client": "export const supabase = {};",
};
const alias = { name: "alias", setup(b) {
  b.onResolve({ filter: /^@\/(lib\/hecDocs|integrations\/supabase\/client)$/ }, (a) => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({ contents: STUBS[a.path], loader: "js" }));
  b.onResolve({ filter: /^@\// }, (a) => {
    const base = resolve(repo, "src", a.path.slice(2));
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      try { if (statSync(base + ext).isFile()) return { path: base + ext }; } catch {}
    }
    return { path: base };
  });
} };
let n = 0;
async function load(entry) {
  const out = resolve(repo, "node_modules", ".cache", "lesson-decks", `copies-${n++}.${process.pid}.mjs`);
  await build({ entryPoints: [resolve(repo, entry)], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", plugins: [alias], jsx: "automatic", packages: "external" });
  return import(pathToFileURL(out).href);
}

const A = await load("src/lib/lessonDecks/audience.ts");
const P = await load("src/components/lessonDecks/DeckPlayer.tsx");
const { UNITS } = await load("src/content/lessonDecks/index.ts");
const roster = ["Linh Tran", "Minh Le", "An Pham", "Bao Vu", "Chi Do", "Duc Ho", "Ha Ngo"];
const students = roster.map((name, i) => ({ id: `0000000${i}-0000-4000-8000-000000000000`, name }));
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
// A phrase long enough to be the answer itself rather than a word that happens to be in a question.
const distinctive = (s) => typeof s === "string" && s.trim().length >= 12;
// Text a student copy is MEANT to show (questions, options, worked examples): an
// answer that also appears there is not a leak.
const shown = (...xs) => JSON.stringify(xs);
const leaked = (it, visible, st) => distinctive(it.answer) && !visible.includes(it.answer) && st.includes(it.answer);

console.log("the copies are made from stripped data");
const allItems = (o) => JSON.stringify(o).match(/"answer":"[^"]*"/g) ?? [];
for (const u of UNITS) {
  const su = A.studentUnit(u);
  const left = [
    ...allItems(su).filter((m) => m !== '"answer":""').slice(0, 2),
    ...(JSON.stringify(su).match(/"(teacherNote|decoding|resources|feedback)":/g) ?? []).slice(0, 2),
    ...(su.decks.some((d) => d.slides.some((s) => s.kind === "listening" && s.script.length)) ? ["a listening script"] : []),
    ...((su.assessments ?? []).some((a) => a.sections.some((x) => x.script) || (a.speaking && a.speaking.rubric.length)) ? ["a test script or rubric"] : []),
    ...(su.generalizations.length ? ["the teacher's generalizations"] : []),
  ];
  ok(`${u.curriculum} ${u.level}.${u.unit}: the student unit has no answer, script, decoding, note, rubric or link`, left.length === 0, left.join(", "));
  ok(`${u.curriculum} ${u.level}.${u.unit}: the teacher's own unit is untouched by making a student copy`, JSON.stringify(A.studentUnit(u)) !== JSON.stringify(u) || allItems(u).length === 0);
}

console.log("both copies of every deck, check, test, worksheet and homework sheet");
let decks = 0, tests = 0, sheets = 0;
for (const u of UNITS) {
  for (const d of u.decks) {
    decks++;
    const st = text(P.deckMarkup(d, roster, u, "student"));
    const te = text(P.deckMarkup(d, roster, u, "teacher"));
    ok(`${d.id}: copies are labelled`, st.includes("Student copy") && te.includes("Teacher copy"));
    for (const label of ["Answers (teacher)", "Script (teacher)", "Materials for this activity", "Decoding: how it sounds"]) ok(`${d.id}: the student copy has no "${label}"`, !st.includes(label));
    const tLines = JSON.stringify(d).match(/"s*(Teacher|T)s*[:(][^"]{8,}"/gi) ?? [];
    ok(`${d.id}: the student copy drops every "Teacher: ..." line`, tLines.every((l) => !st.includes(l.slice(1, 40))), tLines.find((l) => st.includes(l.slice(1, 40))) ?? "");
    const leaks = [];
    for (const s of d.slides) {
      if ("teacherNote" in s && distinctive(s.teacherNote) && st.includes(s.teacherNote.slice(0, 40))) leaks.push(`note: ${s.teacherNote.slice(0, 40)}`);
      if (s.kind === "listening") {
        for (const l of s.script) if (distinctive(l.text) && st.includes(l.text.slice(0, 40))) leaks.push(`script: ${l.text.slice(0, 40)}`);
        { const v = shown(s.questions, s.context, s.strategy, s.tiers); for (const it of s.questions.items) if (leaked(it, v.replace(/"answer":"[^"]*"/g, ""), st)) leaks.push(`answer: ${it.answer}`); }
        ok(`${d.id}: the teacher copy prints "${s.title}"'s script and answers open`, te.includes("Script (teacher)") && te.includes("Answers (teacher)"));
      }
      if (s.kind === "exam") {
        // On its own, so a worked example elsewhere in the lesson is not taken for a leak.
        const one = text(P.deckMarkup({ ...d, slides: [s] }, roster, u, "student"));
        for (const it of s.items) {
          const bare = it.answer.replace(/^[A-D][.)]\s*/, ""); // "B. Yes, please." is also option B as printed
          // Any question or option on the slide may show the phrase ("Yes, please." is option B of one item and the answer of another).
          const visible = shown(s.instructions, s.items.map((x) => [x.q, x.options]));
          if (distinctive(bare) && !visible.includes(bare) && one.includes(bare)) leaks.push(`exam answer: ${it.answer}`);
        }
      }
      // Lab slides: how the teacher corrects, a dictogloss text (the children rebuild it) and the model answers stay off the student copy.
      if (s.kind === "fluency" && distinctive(s.feedback) && st.includes(s.feedback.slice(0, 40))) leaks.push(`correction move: ${s.feedback.slice(0, 40)}`);
      if (s.kind === "writing" && s.routine === "dictogloss" && s.text && st.includes(s.text.text.slice(0, 40))) leaks.push(`dictogloss text: ${s.text.text.slice(0, 40)}`);
      if (s.kind === "writing") { const v = shown(s.steps, s.frames, s.checklist, s.sayIt, s.tiers, s.routine === "dictogloss" ? null : s.text, (s.items ?? []).map((i) => i.q)); for (const it of s.items ?? []) if (leaked(it, v, st)) leaks.push(`model answer: ${it.answer}`); }
      if ((s.kind === "fluency" || s.kind === "writing") && distinctive(s.teacherNote)) ok(`${d.id}: the teacher copy keeps the note on "${s.title}"`, te.includes(s.teacherNote.slice(0, 40)));
      if ((s.kind === "activity" || s.kind === "speaking") && distinctive(s.teacherNote)) ok(`${d.id}: the teacher copy keeps the note on "${s.title}"`, te.includes(s.teacherNote.slice(0, 40)));
    }
    ok(`${d.id}: nothing for the teacher only reaches the student copy`, leaks.length === 0, leaks.slice(0, 3).join(" | "));
    const hwS = P.homeworkMarkup(d, students, {}, "student"), hwT = P.homeworkMarkup(d, students, {}, "teacher");
    if (hwS) ok(`${d.id}: homework sheets come as a sheet per child and a teacher overview`, text(hwS).includes(roster[0]) && text(hwT).includes("Teacher copy") && text(hwT).includes("Class version"));
  }
  for (const a of u.assessments ?? []) {
    tests++;
    const st = text(P.assessmentMarkup(a, "student"));
    const te = text(P.assessmentMarkup(a, "teacher"));
    const leaks = [];
    for (const sec of a.sections) {
      for (const l of sec.script ?? []) if (distinctive(l.text) && st.includes(l.text.slice(0, 40))) leaks.push(`script: ${l.text.slice(0, 40)}`);
      { const v = shown(a.sections.map((x) => [x.title, x.instructions, x.passage, x.items.map((i) => [i.q, i.options])]), a.speaking?.task, a.speaking?.prompts); for (const it of sec.items) if (leaked(it, v, st)) leaks.push(`answer: ${it.answer}`); }
    }
    for (const r of a.speaking?.rubric ?? []) for (const b of r.bands) if (distinctive(b) && st.includes(b.slice(0, 40))) leaks.push(`rubric: ${b.slice(0, 40)}`);
    ok(`${a.id}: the student paper has no answer key, script or marking rubric`, !st.includes("Answer key") && !st.includes("Recording script") && leaks.length === 0, leaks.slice(0, 3).join(" | "));
    ok(`${a.id}: the teacher copy has the paper, then the key`, te.includes("Answer key") && te.includes("Name:"));
    if ((a.sections ?? []).some((x) => x.script?.length)) ok(`${a.id}: the teacher copy prints the recording script`, te.includes("Recording script"));
  }
  for (const w of u.worksheets ?? []) {
    sheets++;
    const st = text(P.worksheetMarkup(w, "student")), te = text(P.worksheetMarkup(w, "teacher"));
    const v = shown(w.intro, w.tiers.map((t) => [t.instructions, t.example, t.items.map((i) => [i.q, i.options])]));
    const leaks = w.tiers.flatMap((t) => t.items).filter((it) => leaked(it, v, st)).map((it) => it.answer);
    ok(`${w.id}: the student sheet has no answer key`, !st.includes("Answer key") && leaks.length === 0, leaks.slice(0, 3).join(" | "));
    ok(`${w.id}: the teacher copy ends with the key`, te.includes("Answer key"));
  }
}
console.log("premium copies: every export is valid lesson-material data for HEC Docs");
// The print buttons send these to the HEC Docs engine first (DeckPlayer.tsx premium()).
// Data the template's schema refuses would silently fall back to the old print view,
// so every deck, test, worksheet and homework sheet goes through the real engine here.
const D = await load("src/lib/lessonDecks/docBlocks.ts");
const E = await import(pathToFileURL(resolve(repo, "src/lib/hecDocs/engine.generated.js")).href);
const docBad = [];
let docs = 0;
const viaEngine = async (label, data, variant) => {
  try {
    const out = await E.prepare("lesson-material", JSON.parse(JSON.stringify(data)), { variant, sanitiseRich: (x) => x });
    docs++;
    if (variant === "student" && /For the teacher|Recording script|Answer key/.test(out.html)) docBad.push(`${label}: student HTML carries a teacher panel`);
  } catch (e) { docBad.push(`${label} [${variant}]: ${String(e.message || e).slice(0, 240)}`); }
};
for (const u of UNITS) {
  for (const d of u.decks) {
    await viaEngine(d.id, D.deckMaterial(d, "teacher", "Course", u), "teacher");
    await viaEngine(d.id, D.deckMaterial(A.studentDeck(d), "student", "Course", u), "student");
    const cr = d.slides.find((s) => s.kind === "creative");
    if (cr) await viaEngine(`${d.id} homework`, D.homeworkMaterial(d, cr.base, "Class version", "Student A", "Course"), "student");
  }
  for (const a of u.assessments ?? []) {
    await viaEngine(a.id, D.assessmentMaterial(a, "teacher", "Course"), "teacher");
    await viaEngine(a.id, D.assessmentMaterial(A.studentAssessment(a), "student", "Course"), "student");
  }
  for (const w of u.worksheets ?? []) {
    await viaEngine(w.id, D.worksheetMaterial(w, "teacher", "Course"), "teacher");
    await viaEngine(w.id, D.worksheetMaterial(A.studentWorksheet(w), "student", "Course"), "student");
  }
}
ok(`all ${docs + docBad.length} premium documents are accepted by the lesson-material schema, and no student copy has a teacher panel`, docBad.length === 0, docBad.slice(0, 4).join(" | ") + (docBad.length > 4 ? ` ... and ${docBad.length - 4} more` : ""));
ok("every course was covered", ["oxford-discover-2e", "reach-higher", "hec-ielts-sl"].every((c) => UNITS.some((u) => u.curriculum === c)), `${decks} decks, ${tests} checks/tests, ${sheets} worksheets`);
console.log(`  ${decks} decks, ${tests} checks and tests, ${sheets} worksheets rendered in both copies`);
for (const b of bad.slice(0, 40)) console.log(b);
if (bad.length > 40) console.log(`  ... and ${bad.length - 40} more`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
