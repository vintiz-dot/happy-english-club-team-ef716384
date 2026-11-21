// Lesson reports, stage A, without a database:
//   - src/lib/lessonReportApproval.ts: what the review screen sends to
//     approve_lesson_report. Families read class_part and their own child's
//     part, so nothing staff-only (gaps, name moments, evidence, sources) may
//     reach either, another child's work never reaches a child's part, and
//     only ticked photos of this lesson are shared.
//   - supabase/functions/_lib/lesson-report-draft.ts: the AI reply checked
//     against the records before it is saved (children, work, photos and
//     quoted lines must be real; attendance and points are the records').
// Made-up ids and words only.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); ok(n, a === b, a === b ? "" : `got ${a}, want ${b}`); };

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = mkdtempSync(join(tmpdir(), "lr-approval-"));
async function load(rel, name) {
  const src = readFileSync(resolve(repo, rel), "utf8");
  ok(`${rel} imports nothing`, !/^\s*import\s/m.test(src));
  const out = join(dir, name);
  writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
const A = await load("src/lib/lessonReportApproval.ts", "approval.mjs");
const D = await load("supabase/functions/_lib/lesson-report-draft.ts", "draft.mjs");

const hasKey = (v, keys) => {
  if (Array.isArray(v)) return v.some((x) => hasKey(x, keys));
  if (v && typeof v === "object") return Object.entries(v).some(([k, x]) => keys.includes(k) || hasKey(x, keys));
  return false;
};
const STAFF_ONLY = ["gaps", "name_moments", "name_moments_accepted", "evidence", "sources"];

// ---------------------------------------------------------------- the draft check (edge function)
const K1 = "k1", K2 = "k2", OUTSIDER = "k9";
const ctx = {
  enrolled: new Set([K1, K2]),
  workOwner: new Map([["w1", K1], ["w2", K2]]),
  photos: new Map([["p1", { kind: "whiteboard", caption: null }], ["p2", { kind: "class", caption: "staff note" }]]),
  attendance: new Map([[K1, "Present"], [K2, "Absent"]]),
  points: new Map([[K1, 5]]),
  homework: [{ homework_id: "h1", title: "Workbook p.4", due_date: "2026-11-25" }],
  transcript: [{ t: 61, text: "Two cat are sleeping", teacher: false }, { t: 90, text: "Well done, Bee, that is right", teacher: true }],
  transcriptNote: null,
  workCount: 2,
};
const workText = new Map([["w1", "I has a dog"], ["w2", ""]]);
const reply = {
  lesson: { title: "Animals", title_vi: "Động vật", summary: "We learned animals.", summary_vi: "Chúng tôi học về động vật." },
  objectives: [{ text: "Name animals", text_vi: "", met: "yes", evidence: "e" }, { text: "Plurals", text_vi: "", met: "maybe", evidence: "" }],
  gaps: [
    { issue: "Plural -s", kind: "grammar", who: "some", evidence: [{ t: 10, quote: "two cat are sleeping" }], suggestion: "" },
    { issue: "Invented", kind: "gap", who: "class", evidence: [{ t: 5, quote: "a line nobody said" }], suggestion: "" },
    { issue: "Has/have", kind: "grammar", who: "some", evidence: [{ t: 0, quote: "I has a dog" }], suggestion: "" },
  ],
  students: [
    { student_id: K1, highlight: "Good", highlight_vi: "", focus_next: "", focus_next_vi: "", work_ids: ["w1", "w2", "wX"],
      name_moments: [{ t: 88, quote: "Well done, Bee", why: "praise" }, { t: 3, quote: "Bee said something", why: "made up" }] },
    { student_id: OUTSIDER, highlight: "Not in this class", highlight_vi: "", focus_next: "", focus_next_vi: "", work_ids: [], name_moments: [] },
  ],
  photos: [{ photo_id: "p1", caption: "The board", caption_vi: "Bảng" }, { photo_id: "pX", caption: "Other lesson", caption_vi: "" }],
  quiz: { title: "Review", questions: [
    { id: "a", kind: "choice", prompt: "A cat is ...", prompt_vi: "", options: ["an animal", "a fruit"], answer: "an animal", accept: [], explain: "", explain_vi: "", objective: 0 },
    { id: "b", kind: "choice", prompt: "Bad", prompt_vi: "", options: ["x", "y"], answer: "z", accept: [], explain: "", explain_vi: "", objective: 0 },
    { id: "c", kind: "order", prompt: "Order it", prompt_vi: "", options: ["are", "two cats", "sleeping"], answer: "two cats are sleeping", accept: [], explain: "", explain_vi: "", objective: 9 },
  ] },
};
const body = D.cleanDraft(reply, ctx, workText);
eq("a child not enrolled gets no part; every enrolled child does", body.students.map((s) => s.student_id), [K1, K2]);
eq("attendance and points are the records', not the reply's", body.students.map((s) => [s.attendance, s.points]), [["Present", 5], ["Absent", 0]]);
eq("work ids: only that child's own", body.students.map((s) => s.work_ids), [["w1"], ["w2"]]);
eq("a name moment stays only if the transcript has it, at the line's time",
  body.students[0].name_moments.map((m) => [m.t, m.quote]), [[90, "Well done, Bee"]]);
eq("gaps: an invented quote is dropped; kept quotes carry the line's time (or -1 from work)",
  body.gaps.map((g) => [g.issue, g.evidence.map((e) => e.t)]), [["Plural -s", [61]], ["Has/have", [-1]]]);
eq("photos: only this lesson's, class photos not shared by default",
  body.photos.map((p) => [p.photo_id, p.share, p.caption]), [["p1", true, "The board"], ["p2", false, "staff note"]]);
eq("quiz: a broken question is dropped, the rest renumbered, objective bounded",
  body.quiz.questions.map((q) => [q.id, q.kind, q.objective]), [["q1", "choice", 0], ["q2", "order", 0]]);
eq("objective met outside the list reads unknown", body.objectives.map((o) => o.met), ["yes", "unknown"]);
eq("homework is the records'", body.homework, [{ homework_id: "h1", title: "Workbook p.4", due_date: "2026-11-25" }]);
{
  const none = D.cleanDraft(reply, { ...ctx, transcript: null, transcriptNote: "Not read" }, workText);
  eq("without a transcript there are no name moments", none.students.flatMap((s) => s.name_moments).length, 0);
  eq("...and sources says why", [none.sources.transcript, none.sources.transcript_note], [false, "Not read"]);
}
eq("a lesson at 17:30-19:00 in Hanoi reads work from 10:30Z to 12:30Z",
  D.lessonWindow("2026-11-21", "17:30:00", "19:00:00"), { from: "2026-11-21T10:30:00.000Z", to: "2026-11-21T12:30:00.000Z" });
ok("the reply schema closes every object (structured outputs)", !JSON.stringify(D.DRAFT_JSON_SCHEMA).includes('"additionalProperties":true'));

// ---------------------------------------------------------------- the approval mapping (review screen)
const draft = A.readDraft(body);
draft.students[0].name_moments[0].decision = null;
const review = { comments: { [K1]: "  Lovely work today.  " }, excluded: [], quiz: { include: true, due_date: "2026-11-28", points: 10, body: null } };
eq("a name suggestion still undecided blocks approval", A.approvalProblems(draft, review), ["Accept or delete 1 name suggestion."]);
draft.students[0].name_moments[0].decision = "accepted";
eq("decided, it may be approved", A.approvalProblems(draft, review), []);

const rec = { sessionId: "s1", enrolled: [K1, K2], workOwner: { w1: K1, w2: K2 }, lessonPhotoIds: ["p1", "p2"], model: "claude-opus-5-5" };
draft.students[0].work_ids.push("w2");             // another child's work slipped in
draft.photos.push({ photo_id: "pX", share: true, caption: "x", caption_vi: "" }); // not this lesson's
draft.students.push({ ...draft.students[1], student_id: OUTSIDER });
const args = A.buildApproval(draft, review, rec);
eq("class_part has exactly the documented fields", Object.keys(args.p_class_part).sort(),
  ["activities", "class_focus", "homework", "lesson", "objectives", "parents", "photo_captions", "schema", "structures", "taught", "words"]);
ok("class_part holds nothing staff-only", !hasKey(args.p_class_part, STAFF_ONLY));
ok("no child's part holds anything staff-only", !hasKey(args.p_students, STAFF_ONLY));
eq("objectives keep text, text_vi and met only", Object.keys(args.p_class_part.objectives[0]), ["text", "text_vi", "met"]);
eq("parts only for enrolled children", args.p_students.map((s) => s.student_id), [K1, K2]);
eq("a child's work_ids are only their own", args.p_students.map((s) => s.part.work_ids), [["w1"], ["w2"]]);
eq("a child's part has the documented fields", Object.keys(args.p_students[0].part).sort(),
  ["attendance", "focus_next", "focus_next_vi", "highlight", "highlight_vi", "points", "teacher_comment", "work_ids"]);
eq("the teacher's line is carried, trimmed", args.p_students[0].part.teacher_comment, "Lovely work today.");
eq("staff_part: gaps, accepted name moments, sources, model",
  [Object.keys(args.p_staff_part).sort(), args.p_staff_part.name_moments_accepted],
  [["gaps", "model", "name_moments_accepted", "sources"], [{ student_id: K1, t: 90, quote: "Well done, Bee" }]]);
eq("shared photos: ticked and this lesson's only", args.p_photo_ids, ["p1"]);
eq("captions only for shared photos", Object.keys(args.p_class_part.photo_captions), ["p1"]);
eq("the quiz carries title, due date, points and questions", Object.keys(args.p_quiz), ["title", "due_date", "points", "questions"]);
{
  const d2 = A.readDraft(body);
  d2.students[0].name_moments[0].decision = "deleted";
  const a2 = A.buildApproval(d2, { ...review, excluded: [K2], quiz: { ...review.quiz, include: false } }, rec);
  eq("a deleted name moment is not stored", a2.p_staff_part.name_moments_accepted, []);
  eq("an excluded child gets no part", a2.p_students.map((s) => s.student_id), [K1]);
  eq("no quiz when the teacher leaves it out", a2.p_quiz, null);
  d2.quiz.questions[0].answer = "a vegetable";
  eq("a choice whose answer is not a choice is refused",
    A.approvalProblems(d2, review), ["Question 1 its answer is not one of the choices."]);
  d2.objectives = d2.objectives.slice(0, 1);
  ok("one objective is not enough", A.approvalProblems(d2, review).includes("Keep 2 to 4 objectives."));
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
