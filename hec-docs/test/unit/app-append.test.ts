// The app appends a homework's attached PDFs after the generated document
// (appendPdfs in app/entry.ts). Made-up PDFs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { ROOT } from "../../src/config.ts";

const ENGINE = path.resolve(ROOT, "..", "src", "lib", "hecDocs", "engine.generated.js");
const present = existsSync(ENGINE);
const engine = (present ? await import(pathToFileURL(ENGINE).href) : {}) as {
  appendPdfs: (base: Uint8Array, extras: { name: string; bytes: Uint8Array }[]) => Promise<{ pdf: Uint8Array; pages: number; appended: string[]; skipped: string[] }>;
};

async function pdfWith(labels: string[]): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (const l of labels) d.addPage([300, 300]).drawText(l, { x: 20, y: 150, size: 12, font });
  d.setTitle(labels.join(","));
  return d.save();
}

const skip = !present && "app engine not in this checkout";

test("1-page homework + 4-page attachment = 5 pages, homework first", { skip }, async () => {
  const r = await engine.appendPdfs(await pdfWith(["hw"]), [{ name: "sheet.pdf", bytes: await pdfWith(["a1", "a2", "a3", "a4"]) }]);
  assert.equal(r.pages, 5);
  assert.deepEqual(r.appended, ["sheet.pdf"]);
  const out = await PDFDocument.load(r.pdf);
  assert.equal(out.getPageCount(), 5);
  assert.equal(out.getTitle(), "hw", "the generated document keeps its own metadata");
});

test("several attachments keep their order; a broken one is skipped", { skip }, async () => {
  const r = await engine.appendPdfs(await pdfWith(["hw", "hw2"]), [
    { name: "one.pdf", bytes: await pdfWith(["x"]) },
    { name: "broken.pdf", bytes: new TextEncoder().encode("not a pdf") },
    { name: "two.pdf", bytes: await pdfWith(["y", "z"]) },
  ]);
  assert.equal(r.pages, 5);
  assert.deepEqual(r.appended, ["one.pdf", "two.pdf"]);
  assert.deepEqual(r.skipped, ["broken.pdf"]);
});

test("nothing readable to append returns the document unchanged", { skip }, async () => {
  const base = await pdfWith(["hw"]);
  const r = await engine.appendPdfs(base, [{ name: "bad.pdf", bytes: new Uint8Array([1, 2, 3]) }]);
  assert.equal(r.pdf, base);
  assert.equal(r.pages, 1);
});
