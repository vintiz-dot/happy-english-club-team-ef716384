// lesson-material: the student copy never prints answers or teacher panels,
// even when the data still carries them, and the variant names the file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../../src/config.ts";
import { renderHtml } from "../../src/render/render.ts";
import { filenameFor } from "../../src/filenames.ts";

const fx = async (name: string) =>
  JSON.parse(await readFile(path.join(ROOT, "templates", "lesson-material", "fixtures", `${name}.json`), "utf8"));

test("student copy of teacher data prints no answers, scripts or teacher panels", async () => {
  const env = await fx("teacher-lesson");
  const teacher = await renderHtml({ type: "lesson-material", data: env.data, generatedAt: env.generatedAt });
  const student = await renderHtml({ type: "lesson-material", data: env.data, variant: "student", generatedAt: env.generatedAt });
  assert.equal(teacher.variant, "teacher");
  assert.match(teacher.html, /For the teacher/);
  assert.match(teacher.html, /class="q__ans"/);
  assert.doesNotMatch(student.html, /For the teacher|q__ans|tpanel|is-key/);
  for (const b of env.data.blocks) {
    for (const n of b.teacher ?? []) for (const line of n.lines) assert.ok(!student.html.includes(line.replace(/"/g, "&quot;").replace(/'/g, "&#39;")), `teacher line leaked: ${line}`);
  }
  assert.match(student.html, /Student copy/);
  assert.equal(student.title, `${env.data.title} · Student copy`);
});

test("filenames follow the variant, and a child's sheet leads with the name", async () => {
  const lesson = (await fx("teacher-lesson")).data;
  assert.equal(filenameFor("lesson-material", lesson, "teacher"), "Getting to know you; how IELTS works - Teacher copy.pdf");
  assert.equal(filenameFor("lesson-material", lesson, "student"), "Getting to know you; how IELTS works - Student copy.pdf");
  const hw = (await fx("student-homework")).data;
  assert.equal(filenameFor("lesson-material", hw, "student"), "Student A - Week 1 homework- introductions - Student copy.pdf");
});
