// A second brand is a config change: copy the tenant folder, edit theme.json,
// render. No template is touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, cp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("a second tenant renders every brand element from its own theme", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hecdocs-tenants-"));
  try {
    await cp(path.join(ROOT, "tenants", "hec"), path.join(dir, "hec"), { recursive: true });
    await cp(path.join(ROOT, "tenants", "hec"), path.join(dir, "acme"), { recursive: true });
    const theme = JSON.parse(await readFile(path.join(dir, "acme", "theme.json"), "utf8"));
    Object.assign(theme, {
      id: "acme",
      name: "Acme Language School",
      subtitle: "Trường Ngoại ngữ Acme",
      tagline: "Every word counts",
      logo: { file: "assets/acme.svg", alt: "Acme Language School logo" },
      encouragement: ["Onwards and upwards."],
      tokens: { color: { ink: { $value: "#1D2B20" }, "accent-deep": { $value: "#2E8B57" } } },
    });
    await writeFile(path.join(dir, "acme", "theme.json"), JSON.stringify(theme, null, 2));
    await writeFile(path.join(dir, "acme", "assets", "acme.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#2E8B57"/></svg>');

    const out = path.join(dir, "acme.pdf");
    const r = spawnSync(process.execPath, [path.join(ROOT, "src", "cli.ts"), "render", "homework", path.join(ROOT, "templates", "homework", "fixtures", "standard.json"), "--tenant", "acme", "--out", out], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, HEC_DOCS_SILENT: "1", HEC_DOCS_TENANTS_DIR: dir },
      timeout: 120_000,
    });
    assert.equal(r.status, 0, r.stderr);

    process.env.HEC_DOCS_SILENT = "1";
    const { pdfText } = await import("../../src/qa/raster.ts");
    const { closeBrowser } = await import("../../src/render/browser.ts");
    const text = await pdfText(await readFile(out));
    await closeBrowser();
    assert.match(text, /Acme Language School/);
    assert.match(text, /Every word counts/);
    assert.match(text, /Onwards and upwards\./);
    // The original content is untouched, including its own "Happy English Club" colophon line,
    // which the template prints from the tenant name.
    assert.match(text, /Unit 6: My Weekend/);
    assert.doesNotMatch(text, /Learning, an endless journey/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
