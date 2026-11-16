import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(ROOT, "bin", "hec-docs.mjs");
const FIXTURE = path.join(ROOT, "templates", "homework", "fixtures", "standard.json");

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, HEC_DOCS_SILENT: "1" }, timeout: 120_000 });
}

test("render writes a PDF, a manifest, and prints a JSON summary", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hecdocs-"));
  try {
    const out = path.join(dir, "hw.pdf");
    const r = run(["render", "homework", FIXTURE, "--variant", "writing-space", "--out", out]);
    assert.equal(r.status, 0, r.stderr);
    const summary = JSON.parse(r.stdout.trim());
    assert.equal(summary.filename, "Unit_6__My_Weekend___B_i_t_p_v__nh__tu_n_2_homework.pdf");
    assert.ok(summary.pages >= 1);
    const pdf = await readFile(out);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
    assert.equal(manifest.documents[0].variant, "writing-space");
    assert.equal(manifest.documents[0].sha256, summary.sha256);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the same input renders to identical bytes in separate processes", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hecdocs-"));
  try {
    const a = run(["render", "homework", FIXTURE, "--out", path.join(dir, "a.pdf")]);
    const b = run(["render", "homework", FIXTURE, "--out", path.join(dir, "b.pdf")]);
    assert.equal(a.status, 0, a.stderr);
    assert.equal(JSON.parse(a.stdout).sha256, JSON.parse(b.stdout).sha256);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("invalid data exits 3 with field-level errors on stderr", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hecdocs-"));
  try {
    const bad = path.join(dir, "bad.json");
    await writeFile(bad, JSON.stringify({ homework: { id: "x" }, className: 1, teacherName: "" }));
    const r = run(["render", "homework", bad, "--out", path.join(dir, "x.pdf")]);
    assert.equal(r.status, 3);
    assert.match(r.stderr, /\/homework\/title: is required/);
    assert.match(r.stderr, /\/className: must be string/);
    assert.equal(existsSync(path.join(dir, "x.pdf")), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("batch renders several jobs under a concurrency cap and reports failures", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hecdocs-"));
  try {
    const env = JSON.parse(await readFile(FIXTURE, "utf8"));
    const jobs = [
      { type: "homework", data: env.data, generatedAt: env.generatedAt },
      { type: "homework", data: env.data, generatedAt: env.generatedAt }, // same filename: must not overwrite
      { type: "homework", data: { nope: 1 } },
    ];
    const jf = path.join(dir, "jobs.json");
    await writeFile(jf, JSON.stringify(jobs));
    const r = run(["batch", jf, "--out-dir", path.join(dir, "out"), "--concurrency", "2"]);
    assert.equal(r.status, 1, "a failed job makes the batch exit 1");
    const m = JSON.parse(await readFile(path.join(dir, "out", "manifest.json"), "utf8"));
    assert.equal(m.total, 3);
    assert.equal(m.failed, 1);
    const files = m.documents.filter((d: { ok: boolean }) => d.ok).map((d: { file: string }) => d.file);
    assert.equal(new Set(files).size, 2, `distinct output files: ${files}`);
    assert.ok(m.documents[2].error.fields.length > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("list prints every template with its version and variants", () => {
  const r = run(["list"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^homework@\d+\.\d+\.\d+ {2}pdf {2}variants: standard, writing-space, prompt-card/m);
});
