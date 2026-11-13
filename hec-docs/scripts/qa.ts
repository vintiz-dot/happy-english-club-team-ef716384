// Quality gates, run over every fixture of every template:
//   1 text parity       DOM text vs the original generator's (qa/before/*/dom.txt),
//                       ordered; PDF-extracted text must contain every word.
//   2 visual QA         overflow markers, bundled fonts only (no tofu), pages > 0
//   3 regression        pixel diff against qa/baselines/** (committed PNGs)
//   4 accessibility     tagged, StructTreeRoot, Lang, Title, Figure alt
//   5 print             grayscale rasters written for review (qa/out/**-gray)
//   6 performance       render ms and bytes; flags > 3 s or > 1.5 MB
//   + determinism       the same input renders to identical bytes twice
//
//   node scripts/qa.ts [--update-baselines] [--only <type>] [--samples]
//
// Writes qa/report.json and qa/REPORT.md. Exit code 1 if any gate fails.
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { ROOT } from "../src/config.ts";
import { render } from "../src/render/render.ts";
import { closeBrowser } from "../src/render/browser.ts";
import { getRegistry } from "../src/templates/registry.ts";
import { loadTenant, type Tenant } from "../src/tenant.ts";
import { rasterise } from "../src/qa/raster.ts";
import { compareText, containsAll } from "../src/qa/parity.ts";
import { checkPdf } from "../src/qa/a11y.ts";

const { values } = parseArgs({
  options: {
    "update-baselines": { type: "boolean" },
    only: { type: "string" },
    samples: { type: "boolean" },
  },
});

const QA = path.join(ROOT, "qa");
const OUT = path.join(QA, "out");
const BASE = path.join(QA, "baselines");
const SAMPLES = path.join(QA, "samples");
const DPI = 60; // regression raster: small, stable, enough to catch layout drift
const MAX_DIFF_RATIO = 0.002; // 0.2% of pixels

interface Fixture {
  $comment?: string;
  before?: string; // qa/before/<name>
  beforeDom?: string; // file name inside it (default dom.txt)
  generatedAt: string;
  variant?: string;
  tenant?: string;
  data: Record<string, unknown>;
}

interface Row {
  type: string;
  fixture: string;
  variant: string;
  filename: string;
  pages: number;
  bytes: number;
  ms: number;
  gates: Record<string, { ok: boolean; detail?: unknown }>;
}

function brandStrings(t: Tenant, extra: string[]): string[] {
  return [
    t.name, t.subtitle ?? "", t.tagline, t.footer, t.qr.label,
    t.signOff.closing, t.signOff.closingVi ?? "", t.signOff.name, t.signOff.role,
    ...Object.values(t.reassurance), ...t.encouragement, ...extra,
  ].filter(Boolean);
}

async function pngDiff(a: Buffer, b: Buffer): Promise<{ ratio: number; diff?: Buffer }> {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { ratio: 1 };
  const out = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0.1 });
  return { ratio: n / (A.width * A.height), diff: PNG.sync.write(out) };
}

const rows: Row[] = [];
const registry = await getRegistry();
if (values.samples) await mkdir(SAMPLES, { recursive: true });
await rm(values.only ? path.join(OUT, values.only) : OUT, { recursive: true, force: true });

for (const [type, entry] of registry) {
  if (values.only && values.only !== type) continue;
  const fxDir = path.join(entry.dir, "fixtures");
  const fixtures = (await readdir(fxDir)).filter((f) => f.endsWith(".json")).sort();
  for (const f of fixtures) {
    const name = f.replace(/\.json$/, "");
    const fx = JSON.parse(await readFile(path.join(fxDir, f), "utf8")) as Fixture;
    const req = { type, data: fx.data, variant: fx.variant, tenant: fx.tenant, generatedAt: fx.generatedAt };
    const gates: Row["gates"] = {};
    let r;
    try {
      r = await render(req);
    } catch (err) {
      rows.push({ type, fixture: name, variant: "?", filename: "?", pages: 0, bytes: 0, ms: 0, gates: { render: { ok: false, detail: String(err) } } });
      continue;
    }
    const tenant = await loadTenant(r.tenant);
    const brand = brandStrings(tenant, entry.manifest.brandStrings ?? []);

    // determinism
    const again = await render(req);
    gates.determinism = { ok: again.sha256 === r.sha256, detail: again.sha256 === r.sha256 ? undefined : "two renders differ" };

    // performance
    gates.performance = { ok: r.ms <= 3000 && r.bytes <= 1.5 * 1024 * 1024, detail: { ms: r.ms, bytes: r.bytes } };

    // visual QA: layout warnings from the renderer
    gates.layout = { ok: r.warnings.filter((w) => w.startsWith("overflow")).length === 0, detail: r.warnings };

    const outDir = path.join(OUT, type);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, `${name}${r.contentType === "image/png" ? ".png" : ".pdf"}`), r.body);
    if (values.samples) {
      await mkdir(path.join(SAMPLES, type), { recursive: true });
      await writeFile(path.join(SAMPLES, type, r.filename), r.body);
    }

    let pagePngs: Buffer[] = [];
    let pdfTextAll = "";
    if (r.contentType === "application/pdf") {
      const a11y = await checkPdf(r.body, { requireFigures: true });
      gates.accessibility = { ok: a11y.ok, detail: a11y.ok ? { structElements: a11y.structElements, figures: a11y.figures, lang: a11y.lang } : a11y.problems };
      gates.fonts = { ok: !a11y.problems.some((p) => p.startsWith("fallback fonts")), detail: a11y.fonts };
      const ras = await rasterise(r.body, { dpi: DPI });
      pagePngs = ras.pages.map((p) => p.png);
      pdfTextAll = ras.pages.map((p) => p.text).join("\n");
      const gray = await rasterise(r.body, { dpi: 72, grayscale: true });
      for (const [i, p] of gray.pages.entries()) await writeFile(path.join(outDir, `${name}-gray-p${i + 1}.png`), p.png);
      gates.print = { ok: ras.pages.every((p) => Math.abs(p.width / p.height - 210 / 297) < 0.01), detail: "A4 portrait, grayscale rasters in qa/out" };
    } else {
      pagePngs = [r.body];
    }

    // text parity
    if (fx.before) {
      const domFile = path.join(QA, "before", fx.before, fx.beforeDom ?? "dom.txt");
      const original = await readFile(domFile, "utf8");
      const ordered = compareText(original, r.text, brand);
      const present = r.contentType === "application/pdf" ? containsAll(original, pdfTextAll) : { ok: true, missing: [] as string[] };
      gates.parity = {
        ok: ordered.ok && present.ok,
        detail: ordered.ok && present.ok ? { words: ordered.originalWords } : { missing: ordered.missing, unexpected: ordered.unexpected, missingInPdf: present.missing },
      };
    }

    // regression
    const baseDir = path.join(BASE, type);
    const diffs: string[] = [];
    for (const [i, png] of pagePngs.entries()) {
      const file = path.join(baseDir, `${name}-p${i + 1}.png`);
      if (values["update-baselines"] || !existsSync(file)) {
        if (!values["update-baselines"]) {
          diffs.push(`p${i + 1}: no baseline`);
          continue;
        }
        await mkdir(baseDir, { recursive: true });
        // PNG baselines for PNG outputs are stored at render size.
        await writeFile(file, png);
        continue;
      }
      const d = await pngDiff(await readFile(file), png);
      if (d.ratio > MAX_DIFF_RATIO) {
        diffs.push(`p${i + 1}: ${(d.ratio * 100).toFixed(2)}% pixels differ`);
        if (d.diff) await writeFile(path.join(outDir, `${name}-p${i + 1}-diff.png`), d.diff);
      }
    }
    if (!values["update-baselines"]) {
      const extra = existsSync(baseDir) ? (await readdir(baseDir)).filter((b) => b.startsWith(`${name}-p`) && Number(b.match(/-p(\d+)\.png$/)?.[1]) > pagePngs.length) : [];
      if (extra.length) diffs.push(`page count changed (baseline has ${extra.join(", ")})`);
    }
    gates.regression = { ok: diffs.length === 0, detail: diffs.length ? diffs : undefined };

    rows.push({ type, fixture: name, variant: r.variant, filename: r.filename, pages: r.pages, bytes: r.bytes, ms: r.ms, gates });
    const failed = Object.entries(gates).filter(([, g]) => !g.ok).map(([k]) => k);
    console.log(`${failed.length ? "FAIL" : "ok  "} ${type}/${name} (${r.variant}) ${r.pages}p ${(r.bytes / 1024).toFixed(0)} KB ${r.ms} ms${failed.length ? "  -> " + failed.join(", ") : ""}`);
  }
}
await closeBrowser();

const failing = rows.filter((r) => Object.values(r.gates).some((g) => !g.ok));
const reportName = values.only ? `report-${values.only}` : "report";
await writeFile(path.join(QA, `${reportName}.json`), JSON.stringify({ generatedBy: "scripts/qa.ts", rows }, null, 2) + "\n");
const md = [
  "# QA report",
  "",
  "Generated by `npm run qa`. One row per fixture; every gate must pass.",
  "",
  "| Document | Fixture | Variant | Pages | Size | Render | Parity | Regression | A11y | Fonts | Layout | Determinism |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => {
    const g = (k: string) => (r.gates[k] ? (r.gates[k].ok ? "pass" : "**FAIL**") : "n/a");
    return `| ${r.type} | ${r.fixture} | ${r.variant} | ${r.pages} | ${(r.bytes / 1024).toFixed(0)} KB | ${r.ms} ms | ${g("parity")} | ${g("regression")} | ${g("accessibility")} | ${g("fonts")} | ${g("layout")} | ${g("determinism")} |`;
  }),
  "",
  failing.length ? `**${failing.length} fixture(s) failing.** Details in qa/report.json.` : "All gates pass.",
  "",
];
if (!values.only) await writeFile(path.join(QA, "REPORT.md"), md.join("\n"));
if (failing.length) {
  for (const r of failing) {
    for (const [k, g] of Object.entries(r.gates)) if (!g.ok) console.log(`  ${r.type}/${r.fixture} ${k}: ${JSON.stringify(g.detail)}`);
  }
  process.exitCode = 1;
}
