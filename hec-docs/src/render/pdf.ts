// HTML (already fully rendered by the template layer) -> tagged A4 PDF.
// Chromium does layout, Paged Media, fonts and the structure tree; pdf-lib then
// pins every value that would otherwise differ between runs (dates, producer,
// document ID) and adds the language / title metadata, so the same input
// gives byte-identical output.
import { finalize, type PdfMeta } from "./finalize.ts";
import { openIsolatedPage, ASSET_ORIGIN, type AssetMount } from "./browser.ts";

export type { PdfMeta };

export interface RenderPdfOptions {
  html: string;
  mounts: AssetMount[];
  meta: PdfMeta;
  timeoutMs: number;
}

export interface RenderPdfResult {
  pdf: Buffer;
  pages: number;
  /** Elements that overflowed their box during layout (visual QA signal). */
  overflow: string[];
  /** document.body.innerText: the reading-order text used for parity. */
  text: string;
}

export async function renderPdf(opts: RenderPdfOptions): Promise<RenderPdfResult> {
  const job = await openIsolatedPage({ html: opts.html, mounts: opts.mounts, javaScript: true });
  const timer = setTimeout(() => void job.close().catch(() => {}), opts.timeoutMs);
  try {
    const { page } = job;
    page.setDefaultTimeout(opts.timeoutMs);
    // Templates contain no scripts (CSP below forbids them); JavaScript is
    // enabled only so this harness can wait for fonts and measure overflow.
    await page.goto(`${ASSET_ORIGIN}/doc.html`, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const overflow = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>("[data-qa-fit]").forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          out.push(el.getAttribute("data-qa-fit") || el.className);
        }
      });
      const missing = [...document.fonts].filter((f) => f.status === "error").map((f) => `font:${f.family}`);
      return out.concat(missing);
    });
    const text = await page.evaluate(() => document.body.innerText);
    const raw = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: false,
    });
    const done = await finalize(new Uint8Array(raw), opts.meta);
    return { pdf: Buffer.from(done.pdf.buffer, done.pdf.byteOffset, done.pdf.byteLength), pages: done.pages, overflow, text };
  } finally {
    clearTimeout(timer);
    await job.close().catch(() => {});
  }
}
