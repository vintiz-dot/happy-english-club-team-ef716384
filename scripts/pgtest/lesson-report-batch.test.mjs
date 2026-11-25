// The staff's "download every child's report": one approved lesson report and
// its child parts become one family-view report per child. Drives the real
// src/lib/lessonReportBatch.ts. The children here are made up.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/lessonReportBatch.ts")],
  bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "lesson-report-batch-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { childReports, reportFileNames, zipName, fileSafe, classReportDocData } = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ID = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const report = {
  id: ID(1), session_id: ID(2), review_homework_id: ID(9), photo_ids: [ID(3)],
  class_part: {
    lesson: { title: "Animals", title_vi: "Động vật", summary: "We named animals." },
    photo_captions: { [ID(3)]: { caption: "Our board", caption_vi: "Bảng của lớp" } },
  },
  // Never read by the batch, and never passed on.
  staff_part: { gaps: ["secret"] },
};
const parts = [
  { student_id: ID(5), part: { highlight: "Great bingo", attendance: "Present", points: 3, teacher_comment: "Well done" } },
  { student_id: ID(4), part: { highlight: "Spelled cat", attendance: "Late", work_ids: [ID(7), "not-a-uuid"] } },
  { student_id: ID(5), part: { highlight: "duplicate row" } },
  { student_id: ID(6), part: { highlight: "No name on file" } },
];
const names = { [ID(4)]: "An Nguyễn", [ID(5)]: "Bình Trần" };
const lesson = { date: "2026-11-20", start_time: "17:30:00", class_name: "Venus/Mars" };

const r = childReports(report, parts, names, lesson);
eq("one report per child, duplicates dropped, by name", r.map((x) => x.name), ["An Nguyễn", "Bình Trần", "Child"]);
eq("each child carries only their own part", r.map((x) => x.view.child?.highlight?.en), ["Spelled cat", "Great bingo", "No name on file"]);
eq("work ids are the child's own, uuids only", r[0].view.child.workIds, [ID(7)]);
eq("class part shared", r.map((x) => x.view.title.en), ["Animals", "Animals", "Animals"]);
eq("photo with approved caption", r[0].view.photos, [{ id: ID(3), caption: { en: "Our board", vi: "Bảng của lớp" } }]);
eq("lesson meta", [r[0].view.date, r[0].view.startTime, r[0].view.className], ["2026-11-20", "17:30", "Venus/Mars"]);
ok("staff part never reaches a view", !JSON.stringify(r).includes("secret"));
eq("no parts, no files", childReports(report, [], names, lesson), []);

eq("file names safe and unique", reportFileNames(
  [{ name: "An Nguyễn" }, { name: "An Nguyễn" }, { name: "Bình" }], lesson),
  ["An Nguyễn - Venus-Mars 2026-11-20.pdf", "An Nguyễn - Venus-Mars 2026-11-20 (2).pdf", "Bình - Venus-Mars 2026-11-20.pdf"]);
eq("zip name", zipName(lesson), "Venus-Mars - Class reports 2026-11-20.zip");
eq("fileSafe strips Windows characters", fileSafe('a:b*c?"d<e>f|g\\h'), "a-b-c--d-e-f-g-h");

// The PDF goes through HEC Docs' class-report template first. Data its schema
// refuses would silently fall back to the old rasteriser, so the mapping goes
// through the real engine here.
const E = await import(pathToFileURL(resolve(repo, "src/lib/hecDocs/engine.generated.js")).href);
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const richReport = {
  ...report,
  photo_ids: [ID(3), ID(8)],
  class_part: {
    ...report.class_part,
    objectives: [{ text: "Name 5 animals", text_vi: "Gọi tên 5 con vật", met: "yes" }, { text: "Spell", met: "maybe" }],
    taught: [{ topic: "Animals", detail: "Farm animals", detail_vi: "Động vật nông trại" }],
    words: [{ en: "cat", vi: "con mèo" }], structures: [{ pattern: "It has ...", example: "It has four legs." }],
    activities: [{ name: "Bingo" }], class_focus: [{ en: "Plural -s", vi: "Số nhiều -s" }],
    parents: { tips: ["Read together"], ask_your_child: [{ en: "What has four legs?" }], next_lesson: { en: "Food", vi: "Đồ ăn" } },
    homework: [{ title: "Workbook p.12", due_date: "2026-11-27" }],
  },
};
const rich = childReports(richReport, parts, names, lesson);
const viaEngine = async (label, data) => {
  try { return await E.prepare("class-report", JSON.parse(JSON.stringify(data)), { sanitiseRich: (x) => x, generatedAt: "2026-11-25T00:00:00Z" }); }
  catch (e) { ok(`${label}: valid class-report data`, false, String(e.message || e).slice(0, 300)); return null; }
};
const pics = { [ID(3)]: PNG, [ID(7)]: PNG, [ID(8)]: null };
for (const r of [...rich, ...childReports(report, parts, names, lesson)]) {
  const out = await viaEngine(r.name, classReportDocData(r, pics));
  if (out) ok(`${r.name}: valid class-report data, named after child, class and date`, out.filename === `${fileSafe(r.name)} - Venus-Mars 2026-11-20.pdf`, out.filename);
}
const an = classReportDocData(rich[0], pics);
eq("a picture that could not be read is left out", an.photos.map((p) => p.caption?.en ?? null), ["Our board"]);
eq("the child's own work pictures", an.child.work.length, 1);
eq("met state worded as the family screen", an.objectives.map((o) => o.met.en), ["Achieved", "Practised"]);
eq("attendance worded in both languages", an.child.attendance, { en: "Came a little late", vi: "Đến muộn một chút" });
eq("review quiz flagged", an.reviewQuiz, true);
const html = (await viaEngine("html", an))?.html ?? "";
ok("the staff part never reaches the PDF", !html.includes("secret"));
ok("another child's part never reaches the PDF", !html.includes("Great bingo") && html.includes("Spelled cat"));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
