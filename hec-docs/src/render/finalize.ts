// Finishing a Chromium PDF: fixed metadata, language, tagged-PDF markers,
// renumbered structure ids and a content-hash document ID, so the same input
// gives byte-identical output. Pure (pdf-lib + Web Crypto): the Node service
// and the web app's engine bundle both use it.
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFBool, PDFDict, PDFRef } from "pdf-lib";

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

function findAll(hay: Uint8Array, needle: Uint8Array): number[] {
  const out: number[] = [];
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    if (hay[i] !== needle[0]) continue;
    for (let j = 1; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    out.push(i);
  }
  return out;
}

export async function finalize(raw: Uint8Array, meta: PdfMeta): Promise<{ pdf: Uint8Array; pages: number }> {
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
  // Save once with a placeholder, then write the hash over it in place: the
  // hex string has a fixed length, so no offsets move.
  const PLACEHOLDER = "F".repeat(32);
  setId(PLACEHOLDER);
  const bytes = await doc.save({ useObjectStreams: false, updateFieldAppearances: false });
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer));
  const id = Array.from(digest.subarray(0, 16), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const marker = new TextEncoder().encode(`<${PLACEHOLDER}>`);
  const hits = findAll(bytes, marker);
  if (hits.length < 2) throw new Error("PDF ID placeholder not found twice");
  const idBytes = new TextEncoder().encode(id);
  for (const p of hits) bytes.set(idBytes, p + 1);
  return { pdf: bytes, pages: doc.getPageCount() };
}

/**
 * Chromium names structure elements after DOM node ids ("node00000033").
 * Those come from a per-process counter, and table header cells are not even
 * numbered in a stable order, so the raw numbers differ between runs. Number
 * them by first appearance in a depth-first walk of the structure tree
 * (stable, because the tree follows the document), rewrite every reference
 * (/ID, table /Headers), and rebuild the ID tree as one sorted leaf.
 */
function normaliseStructIds(doc: PDFDocument): void {
  const RE = /^node(\d+)$/;
  const ctx = doc.context;
  const deref = (o: unknown) => (o instanceof PDFRef ? ctx.lookup(o) : o);
  const root = deref(doc.catalog.get(PDFName.of("StructTreeRoot")));
  if (!(root instanceof PDFDict)) return;

  // 1. Order of first appearance in the structure tree.
  const order = new Map<string, number>();
  const elementRef = new Map<string, PDFRef>();
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number) => {
    const n = deref(node);
    const ref = node instanceof PDFRef ? node : undefined;
    if (depth > 512 || seen.has(n)) return;
    seen.add(n);
    if (n instanceof PDFArray) {
      for (let i = 0; i < n.size(); i++) walk(n.get(i), depth + 1);
      return;
    }
    if (!(n instanceof PDFDict)) return;
    const id = n.lookup(PDFName.of("ID"));
    if (id instanceof PDFString || id instanceof PDFHexString) {
      const t = id.decodeText();
      if (RE.test(t) && !order.has(t)) {
        order.set(t, order.size + 1);
        if (ref) elementRef.set(t, ref);
      }
    }
    const k = n.get(PDFName.of("K"));
    if (k) walk(k, depth + 1);
  };
  walk(root.get(PDFName.of("K")), 0);

  // 2. Rewrite every string that names a node, anywhere in the file.
  const rewrite = (o: unknown, depth = 0): unknown => {
    if (depth > 64) return o;
    if (o instanceof PDFString || o instanceof PDFHexString) {
      const t = o.decodeText();
      if (RE.test(t)) {
        if (!order.has(t)) order.set(t, order.size + 1); // outside the tree: append
        return PDFString.of(`node${String(order.get(t)).padStart(8, "0")}`);
      }
      return o;
    }
    if (o instanceof PDFArray) for (let i = 0; i < o.size(); i++) o.set(i, rewrite(o.get(i), depth + 1) as never);
    else if (o instanceof PDFDict) for (const [k, v] of o.entries()) o.set(k, rewrite(v, depth + 1) as never);
    return o;
  };
  for (const [, obj] of ctx.enumerateIndirectObjects()) rewrite(obj);

  // 3. Rebuild the ID tree from the walk. Chromium's own ID tree keys are
  //    themselves run-dependent, so it is dropped rather than patched.
  const dropTree = (node: unknown, depth: number) => {
    const n = deref(node);
    if (n instanceof PDFDict && depth < 32) {
      const kids = n.lookup(PDFName.of("Kids"));
      if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) dropTree(kids.get(i), depth + 1);
    }
    if (node instanceof PDFRef) ctx.delete(node);
  };
  dropTree(root.get(PDFName.of("IDTree")), 0);
  root.delete(PDFName.of("IDTree"));
  const ids = [...order.keys()].filter((k) => elementRef.has(k));
  if (!ids.length) return;
  const newName = (t: string) => `node${String(order.get(t)).padStart(8, "0")}`;
  const names = PDFArray.withContext(ctx);
  for (const t of ids.sort((x, y) => order.get(x)! - order.get(y)!)) {
    names.push(PDFString.of(newName(t)));
    names.push(elementRef.get(t)!);
  }
  // A root leaf carries no /Limits (ISO 32000-1, 7.9.6). Zero-padded names
  // in numeric order are also in byte order, as a name tree requires.
  root.set(PDFName.of("IDTree"), ctx.register(ctx.obj({ Names: names })));
}
