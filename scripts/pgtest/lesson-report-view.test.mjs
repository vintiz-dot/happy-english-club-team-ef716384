// The family / child lesson report screen, without the screen: how one row of
// get_lesson_reports_for_student becomes what is rendered. Drives the real
// src/lib/lessonReportView.ts. The children here are made up.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/lessonReportView.ts")],
  bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "lesson-report-view-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { toLessonReportView, toLessonReportViews, metChip, attendanceLabel, hasLearned, bilingual } =
  await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ID = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const full = {
  report_id: ID(1), session_id: ID(2), session_date: "2026-11-20", start_time: "17:30:00", class_name: "Venus",
  class_part: {
    schema: "hec-lesson-report/1",
    lesson: { title: "Animals", title_vi: "Động vật", summary: "We named animals.", summary_vi: "Chúng con gọi tên con vật." },
    objectives: [{ text: "Name 5 animals", text_vi: "Gọi tên 5 con vật", met: "yes" }, { text: "Use 'It has'", met: "PARTLY" }, { text: "Spell", met: "maybe" }],
    taught: [{ topic: "Animals", detail: "Farm animals", detail_vi: "Động vật nông trại" }],
    words: [{ en: "cat", vi: "con mèo", example: "The cat is small." }, { en: "" }],
    structures: [{ pattern: "It has ...", example: "It has four legs." }],
    activities: [{ name: "Animal bingo", description: "A game", description_vi: "Trò chơi" }],
    class_focus: [{ en: "Plural -s", vi: "Số nhiều -s" }],
    parents: { tips: [{ en: "Name animals at home", vi: "Gọi tên con vật ở nhà" }], ask_your_child: ["What has four legs?"],
      next_lesson: { en: "Food", vi: "Đồ ăn" } },
    homework: [{ homework_id: ID(5), title: "Workbook p.12", due_date: "2026-11-27" }],
    photo_captions: { [ID(3)]: { caption: "Our board", caption_vi: "Bảng của lớp" } },
  },
  part: { highlight: "Named every animal", highlight_vi: "Gọi tên mọi con vật", focus_next: "Plural -s", attendance: "Late",
    points: 3, work_ids: [ID(4), ID(4), "not-an-id"], teacher_comment: "Great effort" },
  photos: [{ id: ID(3), caption: "Our board", caption_vi: "Bảng của lớp" }, { id: "bad" }],
  review_homework_id: ID(6),
};
const v = toLessonReportView(full);
eq("title in both languages", v.title, { en: "Animals", vi: "Động vật" });
eq("date and time trimmed", [v.date, v.startTime], ["2026-11-20", "17:30"]);
eq("objectives keep their met state, case-folded, unknown otherwise", v.objectives.map((o) => o.met), ["yes", "partly", "unknown"]);
eq("an objective without Vietnamese shows English alone", v.objectives[1].text, { en: "Use 'It has'", vi: null });
eq("empty words are dropped", v.words.map((w) => w.en), ["cat"]);
eq("plain-string questions are read too", v.askYourChild, [{ en: "What has four legs?", vi: null }]);
eq("next lesson", v.nextLesson, { en: "Food", vi: "Đồ ăn" });
eq("homework with its link", v.homework, [{ homeworkId: ID(5), title: "Workbook p.12", dueDate: "2026-11-27" }]);
eq("only well-formed photo ids", v.photos.map((p) => p.id), [ID(3)]);
eq("the child's part", [v.child.highlight.en, v.child.attendance, v.child.points, v.child.teacherComment.en],
  ["Named every animal", "Late", 3, "Great effort"]);
eq("work ids deduplicated and checked", v.child.workIds, [ID(4)]);
eq("review homework id", v.reviewHomeworkId, ID(6));
ok("has a learned section", hasLearned(v));

const bare = toLessonReportView({ report_id: ID(1), session_id: ID(2), session_date: "2026-11-20", class_name: "Venus", class_part: {}, part: null, photos: null });
eq("an empty report still has a title", bare.title, { en: "Venus lesson", vi: null });
eq("...and nothing else, without crashing",
  [bare.summary, bare.objectives.length, bare.photos.length, bare.child, bare.nextLesson, hasLearned(bare)],
  [null, 0, 0, null, null, false]);
const odd = toLessonReportView({ report_id: ID(1), session_id: ID(2), class_part: { objectives: "x", words: { a: 1 }, parents: [] , lesson: "x" },
  part: { attendance: "Sleeping", points: "abc", work_ids: "x" } });
eq("wrong shapes degrade", [odd.objectives.length, odd.words.length, odd.tips.length, odd.child.attendance, odd.child.points, odd.child.workIds],
  [0, 0, 0, null, null, []]);
eq("rows without ids are skipped", toLessonReportViews([null, {}, full, "x"]).length, 1);
eq("a non-array is no rows", toLessonReportViews(null), []);
eq("Vietnamese repeating the English is not shown twice", bilingual("OK", "ok"), { en: "OK", vi: null });
eq("Vietnamese alone still shows", bilingual("", "Xin chào"), { en: "Xin chào", vi: null });
eq("met chips", ["yes", "partly", "no", "unknown"].map((m) => metChip(m).tone), ["good", "partly", "next", "plain"]);
eq("attendance label", attendanceLabel("Present"), { en: "In class", vi: "Có mặt" });

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
