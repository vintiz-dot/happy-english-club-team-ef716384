// HTML (already fully rendered by the template layer) -> tagged A4 PDF.
// Chromium does layout, Paged Media, fonts and the structure tree; pdf-lib then
// pins every value that would otherwise differ between runs (dates, producer,
// document ID) and adds the language / title metadata, so the same input
// gives byte-identical output.
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFBool, PDFDict } from "pdf-lib";
import { createHash } from "node:crypto";
import { openIsolatedPage, ASSET_ORIGIN, type AssetMount } from "./browser.ts";

export interface PdfMeta {
  title: string;
  lang: string; // BCP 47, e.g. "en" or "vi"
  author: string;
  subject?: string;
  keywords?: string[];
  creator: string; // e.g. "HEC Docs 1.0.0 / invoice@1.0.0"
  /** Fixed timestamp written as CreationDate and ModDate. */
  date: Date;
}

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
    const { pdf, pages } = await finalize(Buffer.from(raw), opts.meta);
    return { pdf, pages, overflow, text };
  } finally {
    clearTimeout(timer);
    await job.close().catch(() => {});
  }
}

async function finalize(raw: Buffer, meta: PdfMeta): Promise<{ pdf: Buffer; pages: number }> {
  const doc = await PDFDocument.load(raw, { updateMetadata: false });
  doc.setTitle(meta.title, { showInWindowTitleBar: true });
  doc.setAuthor(meta.author);
  if (meta.subject) doc.setSubject(meta.subject);
  if (meta.keywords?.length) doc.setKeywords(meta.keywords);
  doc.setCreator(meta.creator);
  doc.setProducer("HEC Docs (Chromium + pdf-lib)");
  doc.setCreationDate(meta.date);
  doc.setModificationDate(meta.date);
  doc.setLanguage(meta.lang);
  const catalog = doc.catalog;
  // Tagged PDF markers. Chromium writes the StructTreeRoot; make sure
  // readers are told the document is tagged and to show the title.
  const mark = catalog.lookup(PDFName.of("MarkInfo"));
  if (!(mark instanceof PDFDict)) {
    catalog.set(PDFName.of("MarkInfo"), doc.context.obj({ Marked: true }));
  } else {
    mark.set(PDFName.of("Marked"), PDFBool.True);
  }
  normaliseStructIds(doc);
  // Deterministic document ID: hash of the normalised document itself.
  const setId = (hex: string) => {
    const arr = PDFArray.withContext(doc.context);
    arr.push(PDFHexString.of(hex));
    arr.push(PDFHexString.of(hex));
    doc.context.trailerInfo.ID = arr;
  };
  setId("0".repeat(32));
  const draft = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
  setId(createHash("sha256").update(draft).digest("hex").slice(0, 32));
  const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
  return { pdf: Buffer.from(bytes), pages: doc.getPageCount() };
}

/**
 * Chromium names structure elements after DOM node ids ("node00000033"),
 * which come from a per-process counter and so differ between runs. Map
 * them to their rank: order is preserved, so the ID tree stays sorted.
 */
function normaliseStructIds(doc: PDFDocument): void {
  const RE = /^node(\d+)$/;
  const found = new Set<number>();
  const visit = (o: unknown, fn: (s: PDFString | PDFHexString) => PDFString | PDFHexString | void, depth = 0): unknown => {
    if (depth > 64) return o;
    if (o instanceof PDFString || o instanceof PDFHexString) return fn(o) ?? o;
    if (o instanceof PDFArray) {
      for (let i = 0; i < o.size(); i++) o.set(i, visit(o.get(i), fn, depth + 1) as never);
    } else if (o instanceof PDFDict) {
      for (const [k, v] of o.entries()) o.set(k, visit(v, fn, depth + 1) as never);
    }
    return o;
  };
  const objects = doc.context.enumerateIndirectObjects();
  for (const [, obj] of objects) {
    visit(obj, (s) => {
      const m = RE.exec(s.decodeText());
      if (m) found.add(Number(m[1]));
    });
  }
  if (!found.size) return;
  const rank = new Map([...found].sort((a, b) => a - b).map((n, i) => [n, i + 1]));
  for (const [, obj] of objects) {
    visit(obj, (s) => {
      const m = RE.exec(s.decodeText());
      if (m) return PDFString.of(`node${String(rank.get(Number(m[1]))).padStart(8, "0")}`);
    });
  }
}
