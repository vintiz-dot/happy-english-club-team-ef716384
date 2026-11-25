// class-report: one child's copy of a lesson report. Every part of the child's
// own section and of the class part prints; empty sections leave no heading;
// the file is named after the child, class and date.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../../src/config.ts";
import { renderHtml } from "../../src/render/render.ts";
import { filenameFor } from "../../src/filenames.ts";

const fx = async (name: string) =>
  JSON.parse(await readFile(path.join(ROOT, "templates", "class-report", "fixtures", `${name}.json`), "utf8"));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");

test("a full report prints the child's part, the class part and both languages", async () => {
  const env = await fx("full");
  const { html, title } = await renderHtml({ type: "class-report", data: env.data, generatedAt: env.generatedAt });
  const d = env.data;
  assert.equal(title, `${d.studentName} - Class Report ${d.date}`);
  for (const s of [
    d.studentName, d.title.en, d.title.vi, d.child.highlight.en, d.child.highlight.vi, d.child.teacherComment.en,
    d.child.focusNext.vi, "+3 points", d.objectives[0].met.en, d.words[0].vi, d.structures[0].example,
    d.tips[0].vi, d.askYourChild[0].en, d.homework[0].title, "Review quiz in the app", d.nextLesson.vi,
  ]) assert.ok(html.includes(esc(s)), `missing: ${s}`);
  assert.equal((html.match(/class="pgrid__img"/g) ?? []).length, d.photos.length + d.child.work.length);
  assert.match(html, /lang="vi"/);
});

test("a sparse report leaves out empty sections, and zero points", async () => {
  const env = await fx("sparse");
  const { html } = await renderHtml({ type: "class-report", data: env.data, generatedAt: env.generatedAt });
  for (const gone of ["Today&#39;s goals", "What we learned", "Photos from class", "Tips for home", "Ask your child", "Homework", "Next lesson", "From the teacher", "points", "pgrid"]) {
    assert.ok(!html.includes(gone), `should not print: ${gone}`);
  }
  assert.ok(html.includes("Spelled hen on the board."));
  assert.ok(html.includes("Came a little late"));
});

test("the file is named after the child, the class and the date", async () => {
  const d = (await fx("full")).data;
  assert.equal(filenameFor("class-report", d), "Nguyễn Minh Anh - Venus 2026-11-24.pdf");
  assert.equal(filenameFor("class-report", { ...d, className: "Venus/Mars" }), "Nguyễn Minh Anh - Venus-Mars 2026-11-24.pdf");
});
