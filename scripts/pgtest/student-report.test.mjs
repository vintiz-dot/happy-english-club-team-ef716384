// The AI progress report (27 Nov 2026), without a database: the figures a
// family sees are counted by the school (by the lesson's date, cancelled and
// future lessons left out), and the model's reply is kept to the shapes the
// screens and the Family PDF read, with nothing on the family page that
// promises a result or labels the child. Made-up ids and words.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); ok(n, a === b, a === b ? "" : `got ${a}, want ${b}`); };

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = mkdtempSync(join(tmpdir(), "student-report-"));
const src = readFileSync(resolve(repo, "supabase/functions/_lib/student-report.ts"), "utf8");
ok("the module imports nothing", !/^\s*import\s/m.test(src));
writeFileSync(join(dir, "sr.mjs"), (await transform(src, { loader: "ts", format: "esm" })).code);
const R = await import(pathToFileURL(join(dir, "sr.mjs")).href);

console.log("\n1. The period's figures");
const att = (session_id, date, status, sstatus = "Held") => ({ session_id, status, sessions: { date, status: sstatus } });
const facts = R.periodFacts({
  from: "2026-09-01", to: "2026-11-27", today: "2026-11-27",
  attendance: [
    att("s1", "2026-09-05", "Present"),
    att("s2", "2026-09-12", "Late"),
    att("s3", "2026-09-19", "Absent"),
    att("s4", "2026-09-26", "Excused"),
    att("s5", "2026-10-03", "Present", "Canceled"),   // cancelled: counts nowhere
    att("s6", "2026-08-29", "Present"),               // before the period
    att("s7", "2026-11-29", "Present", "Scheduled"),  // future (a seeded placeholder)
    att("s1", "2026-09-05", "Present"),               // the same lesson twice
    { session_id: "s8", status: "Present", sessions: null },
  ],
  vocab: [
    { created_at: "2026-09-10T03:00:00Z", mastery_level: 5 },
    { created_at: "2026-10-10T03:00:00Z", mastery_level: 1 },
    { created_at: "2026-06-10T03:00:00Z", mastery_level: 4 },
  ],
  vocabTotal: 120,
  workReviewed: 3,
  homework: [{ submitted_at: "2026-10-01T00:00:00Z" }, { submitted_at: null }, { submitted_at: "2026-12-01T00:00:00Z" }],
  points: [{ points: 10 }, { points: -5 }, { points: 25 }],
  lessonReports: 4,
  corrections: 7,
});
eq("lessons held / attended / excused / absent", [facts.lessons_held, facts.lessons_attended, facts.lessons_excused, facts.lessons_absent], [4, 2, 1, 1]);
eq("attendance rate leaves excused out", facts.attendance_rate, 0.67);
eq("words added in the period, total from the count", [facts.words_added, facts.words_total, facts.words_mastered], [2, 120, 2]);
eq("homework handed in during the period", facts.homework_submitted, 1);
eq("points earned ignore deductions", facts.points_earned, 35);
eq("no lessons: no rate", R.periodFacts({ from: "2026-09-01", to: "2026-09-30", today: "2026-11-27", attendance: [], vocab: [], vocabTotal: 0, workReviewed: 0, homework: [], points: [], lessonReports: 0, corrections: 0 }).attendance_rate, null);

console.log("\n2. Approved lesson notes");
const notes = R.approvedLessonNotes([
  { part: { highlight: "Gave a talk", teacher_comment: "Brave!", focus_next: "because" }, lesson_reports: { class_part: { summary: "Hometowns", words: [{ en: "lake" }, { en: "bridge" }], taught: [{ topic: "Past simple" }] }, sessions: { date: "2026-10-01" } } },
  { part: {}, lesson_reports: { class_part: {}, sessions: { date: "2026-10-08" } } },
  { part: { highlight: "Read aloud" }, lesson_reports: { class_part: {}, sessions: { date: "2026-11-01" } } },
]);
eq("empty notes dropped, newest first", notes.map((n) => n.date), ["2026-11-01", "2026-10-01"]);
eq("words and topics carried", [notes[1].words, notes[1].taught], [["lake", "bridge"], ["Past simple"]]);

console.log("\n3. The model's reply");
const raw = {
  cefr: { level: "A2", confidence: 1.4, rationale: "Short exchanges." },
  skill_matrix: { speaking: { score: 3.7, note: "ok" }, listening: { score: "4" }, magic: { score: 5 } },
  strengths: [{ area: "Past simple", evidence: "x" }, { evidence: "no area" }],
  weaknesses: [{ area: "Linking", evidence: "y", recommendation: "drill" }],
  learning_styles: ["visual"],
  recommendations: ["a", "b", "c", "d", "e", "f"],
  narrative: "  Minh Anh had a great term.  ",
  extra: "dropped",
  parent: {
    headline: { en: "Gave a one-minute talk.", vi: "Con đã nói một phút." },
    can_do: [
      { text: { en: "Talk about the weekend.", vi: "Kể về cuối tuần." }, evidence: { en: "\"I visited my grandma.\"", vi: "\"I visited my grandma.\"" } },
      { text: { en: "She will pass the entrance exam.", vi: "Con sẽ đỗ." } },
      { text: { en: "Read a short story.", vi: "Con cam kết đọc hết." } },
      { text: { en: "Ask questions." } },
      { text: { en: "Count to 100." } },
      { text: { en: "Spell her name." } },
    ],
    next_goals: [
      { goal: { en: "Join ideas with because.", vi: "Nối ý bằng because." }, why: { en: "Clearer answers." }, in_class: { en: "A drill." } },
      { goal: { en: "She struggles with reading.", vi: "Con đọc yếu." } },
      { goal: { en: "Third goal." } },
    ],
    at_home: ["Ask her to teach you three words.", { en: "" }, { en: "Retell a story.", vi: "Kể lại truyện." }],
    ask_your_child: [{ en: "What was funny?", vi: "Điều gì buồn cười?" }],
    next_period: { en: "A two-minute talk." },
    teacher_note: { en: "I am proud of her.", vi: "Cô rất tự hào." },
  },
};
const out = R.cleanReport(raw, facts);
eq("only known top-level fields", Object.keys(out).sort(), ["cefr", "facts", "learning_styles", "narrative", "parent", "recommendations", "skill_matrix", "strengths", "weaknesses"]);
eq("confidence clamped to 1", out.cefr.confidence, 1);
eq("skills: unknown and non-numeric dropped, half steps", out.skill_matrix, { speaking: { score: 3.5, note: "ok" } });
eq("a strength without an area is dropped", out.strengths.length, 1);
eq("at most five teacher next steps", out.recommendations.length, 5);
eq("narrative trimmed", out.narrative, "Minh Anh had a great term.");
eq("facts are the school's, not the model's", out.facts, facts);
const p = out.parent;
eq("a quote is printed once", p.can_do[0].evidence, { en: "\"I visited my grandma.\"", vi: null });
ok("a promised result never reaches the family page", !JSON.stringify(p).includes("entrance exam") && !JSON.stringify(p).includes("cam kết"));
ok("a label on the child never reaches the family page", !JSON.stringify(p).toLowerCase().includes("struggles"));
eq("at most four can-do statements", p.can_do.map((c) => c.text.en), ["Talk about the weekend.", "Ask questions.", "Count to 100.", "Spell her name."]);
eq("at most two next goals", p.next_goals.map((g) => g.goal.en), ["Join ideas with because.", "Third goal."]);
eq("a plain string becomes English only; empty dropped", p.at_home, [{ en: "Ask her to teach you three words.", vi: null }, { en: "Retell a story.", vi: "Kể lại truyện." }]);
eq("an unknown level is not kept", R.cleanReport({ cefr: { level: "Z9" } }, facts).cefr, undefined);
eq("no family page from nothing", R.cleanReport({ parent: { can_do: [] } }, facts).parent, undefined);
eq("garbage in, a safe shape out", Object.keys(R.cleanReport("nonsense", facts)).sort(), ["facts", "learning_styles", "narrative", "recommendations", "strengths", "weaknesses"]);

console.log("\n4. The Family PDF's data never carries the model's level");
const hd = readFileSync(resolve(repo, "src/lib/hecDocs/index.ts"), "utf8");
ok("progressReportData drops report.cefr for the family copy", /const \{ cefr: _model, \.\.\.rest \} = report;/.test(hd) && /variant: "family"/.test(hd));
const njk = readFileSync(resolve(repo, "hec-docs/templates/progress-report/document.njk"), "utf8").replace(/\r\n/g, "\n");
const famBranch = njk.slice(njk.indexOf('{% if variant == "family" %}'), njk.indexOf("{% else %}\n{# BrandHeader"));
ok("the family branch exists", famBranch.length > 500);
ok("the family branch prints no model level, confidence, growth areas or teacher steps",
  !/report\.(cefr|weaknesses|recommendations|learning_styles|skill_matrix)|\.confidence|source_counts/.test(famBranch));
ok("the family branch prints the approved level", famBranch.includes("data.approvedLevel"));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
