// PDF -> PNG pages and text, using pdf.js inside the same offline Chromium.
// Used by visual QA, the regression baselines and the contact sheet. No
// native tools (poppler, ghostscript) needed on Windows or Linux.
import path from "node:path";
import { createRequire } from "node:module";
import { openIsolatedPage, ASSET_ORIGIN } from "../render/browser.ts";

const require = createRequire(import.meta.url);
const PDFJS_DIR = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "build");

export interface RasterPage {
  png: Buffer;
  width: number;
  height: number;
  text: string;
}

export interface RasterOptions {
  dpi?: number;
  grayscale?: boolean;
  /** Only rasterise the first N pages (contact sheets). */
  maxPages?: number;
}

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff">
<script type="module">
import * as pdfjs from "/pdfjs/pdf.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
window.__rasterise = async (opts) => {
  const buf = await (await fetch("/doc.pdf")).arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf, isEvalSupported: false, disableFontFace: false, useSystemFonts: false }).promise;
  const out = [];
  const n = Math.min(pdf.numPages, opts.maxPages || pdf.numPages);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: opts.dpi / 72 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    if (opts.grayscale) ctx.filter = "grayscale(1)";
    await page.render({ canvasContext: ctx, viewport: vp, background: "#ffffff" }).promise;
    let png = canvas.toDataURL("image/png");
    if (opts.grayscale) {
      const g = document.createElement("canvas"); g.width = canvas.width; g.height = canvas.height;
      const gc = g.getContext("2d"); gc.filter = "grayscale(1)"; gc.drawImage(canvas, 0, 0); png = g.toDataURL("image/png");
    }
    const tc = await page.getTextContent();
    let text = "";
    for (const it of tc.items) { text += it.str; text += it.hasEOL ? "\\n" : ""; }
    out.push({ png: png.slice(png.indexOf(",") + 1), width: canvas.width, height: canvas.height, text });
  }
  return { pages: out, total: pdf.numPages };
};
window.__ready = true;
</script></body></html>`;

export async function rasterise(pdf: Buffer, opts: RasterOptions = {}): Promise<{ pages: RasterPage[]; total: number }> {
  const job = await openIsolatedPage({
    html: HARNESS,
    javaScript: true,
    mounts: [{ prefix: "/pdfjs/", dir: PDFJS_DIR }],
    extraFiles: { "/doc.pdf": pdf },
  });
  try {
    const { page } = job;
    page.setDefaultTimeout(60_000);
    await page.goto(`${ASSET_ORIGIN}/doc.html`);
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
    const r = await page.evaluate(
      (o) => (window as unknown as { __rasterise: (o: unknown) => Promise<{ pages: { png: string; width: number; height: number; text: string }[]; total: number }> }).__rasterise(o),
      { dpi: opts.dpi ?? 96, grayscale: !!opts.grayscale, maxPages: opts.maxPages ?? 0 },
    );
    return { total: r.total, pages: r.pages.map((p) => ({ ...p, png: Buffer.from(p.png, "base64") })) };
  } finally {
    await job.close();
  }
}

/** Plain text of every page (pdf.js extraction), pages joined by form feeds. */
export async function pdfText(pdf: Buffer): Promise<string> {
  const { pages } = await rasterise(pdf, { dpi: 18 });
  return pages.map((p) => p.text).join("\f");
}
