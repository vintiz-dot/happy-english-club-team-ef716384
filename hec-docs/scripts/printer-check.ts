// End-to-end check of the cloud path the web app uses: the app's engine
// bundle renders each fixture, the printer Worker prints it on Cloudflare,
// the engine finishes the PDF, and the result goes through the same checks
// as the service (fonts, tags, text parity).
//
//   node scripts/printer-check.ts <printer-url> [type ...]
//   HEC_DOCS_PRINTER_TOKEN=<a signed-in user's access token> for the deployed Worker
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../src/config.ts";
import { getRegistry } from "../src/templates/registry.ts";
import { sanitizeRich } from "../src/format.ts";
import { checkPdf } from "../src/qa/a11y.ts";
import { rasterise } from "../src/qa/raster.ts";
import { closeBrowser } from "../src/render/browser.ts";
import { compareText, containsAll } from "../src/qa/parity.ts";

const [printer, ...only] = process.argv.slice(2);
if (!printer) throw new Error("usage: node scripts/printer-check.ts <printer-url> [type ...]");
const engine = await import(pathToFileURL(path.resolve(ROOT, "..", "src", "lib", "hecDocs", "engine.generated.js")).href);
const out = path.join(ROOT, ".out", "printer-check");
await mkdir(out, { recursive: true });
let failures = 0;

for (const [type, e] of await getRegistry()) {
  if (only.length && !only.includes(type)) continue;
  const fixtures = (await readdir(path.join(e.dir, "fixtures"))).filter((f) => f.endsWith(".json")).sort();
  const withBefore = [];
  for (const f of fixtures) if (JSON.parse(await readFile(path.join(e.dir, "fixtures", f), "utf8")).before) withBefore.push(f);
  for (const f of (withBefore.length ? withBefore : fixtures).slice(0, 1)) {
    const fx = JSON.parse(await readFile(path.join(e.dir, "fixtures", f), "utf8"));
    const p = await engine.prepare(type, fx.data, { sanitiseRich: sanitizeRich, variant: fx.variant, generatedAt: fx.generatedAt });
    const t0 = Date.now();
    const res = await fetch(`${printer}/v1/print`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hec-keep": "1", ...(process.env.HEC_DOCS_PRINTER_TOKEN ? { authorization: `Bearer ${process.env.HEC_DOCS_PRINTER_TOKEN}` } : {}) },
      body: JSON.stringify({ html: p.html, kind: p.output, png: p.raster }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      failures++;
      console.log(`FAIL ${type}/${f}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      continue;
    }
    const raw = new Uint8Array(await res.arrayBuffer());
    if (p.output === "png") {
      await writeFile(path.join(out, `${type}-${p.filename}`), raw);
      console.log(`ok   ${type}/${f}: PNG ${(raw.length / 1024).toFixed(0)} KB, ${ms} ms round trip`);
      continue;
    }
    const { pdf, pages } = await engine.finishPdf(raw, p.meta);
    await writeFile(path.join(out, p.filename), pdf);
    const a11y = await checkPdf(Buffer.from(pdf), { requireFigures: true });
    const ras = await rasterise(Buffer.from(pdf), { dpi: 60 });
    for (const [i, pg] of ras.pages.entries()) await writeFile(path.join(out, `${type}-p${i + 1}.png`), pg.png);
    let parity = "n/a";
    if (fx.before) {
      const original = await readFile(path.join(ROOT, "qa", "before", fx.before, fx.beforeDom ?? "dom.txt"), "utf8");
      const ok = containsAll(original, ras.pages.map((x) => x.text).join("\n")).ok;
      parity = ok ? "pass" : "FAIL";
      if (!ok) failures++;
    }
    if (!a11y.ok) failures++;
    void compareText;
    console.log(`${a11y.ok && parity !== "FAIL" ? "ok  " : "FAIL"} ${type}/${f}: ${pages} p, ${(pdf.length / 1024).toFixed(0)} KB, ${ms} ms round trip, a11y ${a11y.ok ? "pass" : a11y.problems.join("; ")}, text ${parity}, fonts ${a11y.fonts.join(" ")}`);
  }
}
await closeBrowser();
process.exitCode = failures ? 1 : 0;
