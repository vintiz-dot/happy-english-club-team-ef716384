// The review quiz's pure helpers (src/lib/lessonQuiz.ts). The database marks; this
// checks the client-side rule mirrors it and the player's small decisions.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/lessonQuiz.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "lesson-quiz-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const L = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const eq = (n, got, want) => { const c = JSON.stringify(got) === JSON.stringify(want); console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${c ? "" : ` :: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); c ? pass++ : fail++; };

eq("trim, case, inner spaces, trailing dot", L.normaliseAnswer("  I   LIKE  milk. "), "i like milk");
eq("trailing !? dropped, inner ones kept", L.normaliseAnswer("Wow?! Really?"), "wow?! really");
eq("null is empty", L.normaliseAnswer(null), "");
eq("pieces join with one space", L.answerText(["I", "like", "milk."]), "I like milk.");

const choice = { id: "q1", kind: "choice", prompt: "p", options: ["a", "b"] };
const order = { id: "q3", kind: "order", prompt: "p", options: ["I", "like", "milk."] };
eq("a blank gap is unanswered", L.isAnswered({ id: "g", kind: "gap", prompt: "p" }, "  "), false);
eq("a choice is answered once picked", L.isAnswered(choice, "a"), true);
eq("an order is answered only when every piece is placed", [L.isAnswered(order, ["I", "like"]), L.isAnswered(order, ["I", "like", "milk."])], [false, true]);
eq("tapping a piece twice takes it back", L.toggleOrderPiece(L.toggleOrderPiece([], 2), 2), []);
eq("pieces follow the taps, not the shuffle", L.piecesFor(order, [2, 0, 1]), ["milk.", "I", "like"]);
eq("what is sent leaves out blanks", L.answersPayload([choice, order], { q1: "a", q3: ["I"] }), { q1: "a" });
eq("unanswered count", L.unansweredCount([choice, order], { q1: "a" }), 1);
eq("a perfect score gets three stars", L.resultHeadline(4, 4).stars, 3);
eq("a middling score is encouraging", L.resultHeadline(3, 4).tone, "good");
eq("a low score invites another go", L.resultHeadline(1, 4).tone, "keep-going");
eq("a quiz grade parses", L.parseQuizGrade("7/8"), { score: 7, total: 8 });
eq("a word grade is not a quiz grade", L.parseQuizGrade("Superstar"), null);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
