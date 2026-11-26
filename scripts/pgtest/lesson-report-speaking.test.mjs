// The end-of-lesson speaking grade in the class report (26 Nov 2026), without a database:
//   who may be graded (complete recording through the end, present, lines tapped as that child, enough
//   speech), and that a score is kept only with a quote from THAT child's own lines. Made-up ids and words.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); ok(n, a === b, a === b ? "" : `got ${a}, want ${b}`); };

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = mkdtempSync(join(tmpdir(), "lr-speaking-"));
const src = readFileSync(resolve(repo, "supabase/functions/_lib/lesson-report-draft.ts"), "utf8");
writeFileSync(join(dir, "draft.mjs"), (await transform(src, { loader: "ts", format: "esm" })).code);
const D = await import(pathToFileURL(join(dir, "draft.mjs")).href);

const A = "kA", B = "kB", C = "kC", E = "kE", ABS = "kX";
const enrolled = new Set([A, B, C, E, ABS]);
const attendance = new Map([[A, "Present"], [B, "Late"], [C, "Present"], [E, "Present"], [ABS, "Absent"]]);
const T = 3600; // a 60-minute lesson: the window is 2400..3600
const say = (t, text, m, extra = {}) => ({ t, text, teacher: false, m, ...extra });
const lines = [
  say(100, "I like football very much and I play every day", A),            // before the window: never counts
  say(2500, "My favourite animal is the elephant", A),
  say(2600, "Because it is very big and it lives in Africa", A),
  say(2700, "I think elephants are kind and they eat grass", A),
  say(2800, "Elephants drink a lot of water every single day", A),
  say(2500, "I like the dog", B), say(2600, "It is nice", B),             // B: too little
  say(2900, "The monkey can climb the tall tree really fast", C, { unsure: true }),
  say(3000, "The monkey can jump too and it eats banana", C, { unsure: true }),
  say(3100, "monkeys are funny and clever animals to watch", C, { unsure: true }),
  { t: 3200, text: "Very good everyone, well done", teacher: true },
  say(3300, "A line nobody tapped", undefined),
];
const body = (over = {}) => ({
  lesson: { duration_s: T }, coverage: { room_until_s: T - 10 }, flags: [], ...over,
});

// ---------------------------------------------------------------- who is graded
const ev = D.speakingEvidence(body(), lines, enrolled, attendance);
eq("window is the last 20 minutes", [ev.from_s, ev.to_s, ev.complete], [2400, 3600, true]);
eq("only the child with enough tapped, confident speech is gradable", ev.children.map((c) => c.student_id), [A]);
ok("a line before the window is not evidence", ev.children[0].lines.every((l) => l.t >= 2400));
const why = Object.fromEntries(ev.not_graded.map((n) => [n.student_id, n.reason]));
eq("why the others are not graded", why, { [B]: "too_little_speech", [C]: "too_little_speech", [E]: "not_identified", [ABS]: "absent" });

// incomplete recording: nobody present is graded, and the reason says so
const cut = D.speakingEvidence(body({ coverage: { room_until_s: T - 300 } }), lines, enrolled, attendance);
eq("recording stopping early grades nobody", cut.children.length, 0);
eq("and says why", cut.not_graded.find((n) => n.student_id === A).reason, "recording_incomplete");
ok("a stored reason is given", /stops before the end/.test(cut.incomplete_reason));
const gap = D.speakingEvidence(body({ flags: [{ kind: "recorder_gap", t: 3000 }] }), lines, enrolled, attendance);
eq("a recorder gap in the window grades nobody", gap.children.length, 0);
const earlyGap = D.speakingEvidence(body({ flags: [{ kind: "recorder_gap", t: 600 }] }), lines, enrolled, attendance);
eq("a gap long before the window does not matter", earlyGap.children.length, 1);
eq("no room track at all", D.speakingEvidence(body({ coverage: { room_until_s: null } }), lines, enrolled, attendance).complete, false);
eq("no monitor body (a pasted transcript) gives nothing", D.speakingEvidence(null, lines, enrolled, attendance), null);

// ---------------------------------------------------------------- the model's scores are checked
const reply = [
  { student_id: A, comment: "Joined in with full sentences.", criteria: [
    { criterion: "fluency", score: 3, quote: "it is very big and it lives in Africa" },
    { criterion: "vocabulary", score: 4, quote: "elephants are kind" },
    { criterion: "accuracy", score: 2, quote: "I like football very much" },      // said, but before the window / not in evidence
    { criterion: "interaction", score: 9, quote: "elephants drink a lot of water" }, // score out of range
    { criterion: "pronunciation", score: 3, quote: "elephants drink a lot of water" }, // not a criterion
  ] },
  { student_id: B, comment: "Invented grade for a child who was not gradable.", criteria: [
    { criterion: "fluency", score: 4, quote: "I like the dog" }, { criterion: "accuracy", score: 4, quote: "It is nice" } ] },
  { student_id: "kZ", criteria: [] },
];
const out = D.cleanSpeaking(reply, ev);
eq("only the gradable child is graded", out.graded.map((g) => g.student_id), [A]);
eq("only quotes from the child's own lines count", out.graded[0].criteria.map((c) => c.criterion), ["fluency", "vocabulary"]);
eq("the average is worked out here, not by the model", [out.graded[0].average, out.graded[0].score], [3.5, 88]);
ok("each quote carries the line's own time", out.graded[0].criteria[0].t === 2600 && out.graded[0].criteria[1].t === 2700);
ok("B stays ungraded whatever the model said", out.not_graded.some((n) => n.student_id === B && n.reason === "too_little_speech"));

// a child with one backed criterion is not graded
const thin = D.cleanSpeaking([{ student_id: A, criteria: [{ criterion: "fluency", score: 3, quote: "it lives in Africa" }] }], ev);
eq("one quoted criterion is not enough", [thin.graded.length, thin.not_graded.find((n) => n.student_id === A)?.reason], [0, "not_enough_evidence"]);
eq("a model that says nothing grades nobody", D.cleanSpeaking([], ev).graded.length, 0);
eq("no evidence, no section", D.cleanSpeaking(reply, null), null);

// readTranscript carries who was tapped and how sure the words were
const read = D.readTranscript({ lines: [{ t: 5, text: "hello there", who: null, m: A, u: true }, { t: 9, text: "good", who: "T" }, { t: 11, text: "dim", f: true }] });
eq("lines keep m and unsure", read.map((l) => [l.m ?? null, !!l.unsure, l.teacher]), [[A, true, false], [null, false, true], [null, true, false]]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
