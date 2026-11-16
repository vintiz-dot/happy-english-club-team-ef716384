// Structural PDF checks (PDF/UA-style, a subset of what veraPDF checks):
// tagged, has a structure tree, document title shown in the title bar, a
// language, every Figure has alt text, and only the bundled fonts embedded
// (a system fallback font means a glyph was missing: broken diacritics).
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFRef, PDFBool } from "pdf-lib";

export interface A11yReport {
  ok: boolean;
  problems: string[];
  tagged: boolean;
  lang: string | null;
  title: string | null;
  figures: number;
  figuresWithAlt: number;
  structElements: number;
  fonts: string[];
}

const ALLOWED_FONTS = [/Cormorant ?Garamond/i, /Be ?Vietnam ?Pro/i, /Noto ?Sans ?Symbols ?2/i, /Noto ?Sans ?Math/i, /Noto ?Emoji/i];

function str(v: unknown): string | null {
  if (v instanceof PDFString || v instanceof PDFHexString) return v.decodeText();
  return null;
}

export async function checkPdf(bytes: Buffer, opts: { requireFigures?: boolean } = {}): Promise<A11yReport> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = doc.context;
  const cat = doc.catalog;
  const problems: string[] = [];

  const mark = cat.lookup(PDFName.of("MarkInfo"));
  const tagged = mark instanceof PDFDict && mark.lookup(PDFName.of("Marked")) === PDFBool.True;
  if (!tagged) problems.push("MarkInfo/Marked is not true");

  const lang = str(cat.lookup(PDFName.of("Lang")));
  if (!lang) problems.push("no /Lang on the catalog");

  const title = doc.getTitle() ?? null;
  if (!title) problems.push("no document Title");
  const vp = cat.lookup(PDFName.of("ViewerPreferences"));
  if (!(vp instanceof PDFDict) || vp.lookup(PDFName.of("DisplayDocTitle")) !== PDFBool.True) problems.push("DisplayDocTitle not set");

  const root = cat.lookup(PDFName.of("StructTreeRoot"));
  let structElements = 0;
  let figures = 0;
  let figuresWithAlt = 0;
  if (!(root instanceof PDFDict)) {
    problems.push("no StructTreeRoot (untagged content)");
  } else {
    const seen = new Set<PDFDict>();
    const walk = (node: unknown) => {
      const n = node instanceof PDFRef ? ctx.lookup(node) : node;
      if (n instanceof PDFArray) {
        for (let i = 0; i < n.size(); i++) walk(n.get(i));
        return;
      }
      if (!(n instanceof PDFDict) || seen.has(n)) return;
      seen.add(n);
      const s = n.lookup(PDFName.of("S"));
      if (s instanceof PDFName) {
        structElements++;
        if (s.asString() === "/Figure") {
          figures++;
          if (str(n.lookup(PDFName.of("Alt")))) figuresWithAlt++;
        }
      }
      const k = n.get(PDFName.of("K"));
      if (k) walk(k);
    };
    walk(root.get(PDFName.of("K")));
    if (structElements < 3) problems.push(`structure tree nearly empty (${structElements} elements)`);
    if (figures !== figuresWithAlt) problems.push(`${figures - figuresWithAlt} of ${figures} figures lack alt text`);
    if (opts.requireFigures && figures === 0) problems.push("logo is not tagged as a Figure");
  }

  const fonts = new Set<string>();
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.lookup(PDFName.of("Type")) === PDFName.of("Font")) {
      const base = obj.lookup(PDFName.of("BaseFont"));
      if (base instanceof PDFName) fonts.add(base.asString().replace(/^\/([A-Z]{6}\+)?/, ""));
    }
  }
  const foreign = [...fonts].filter((f) => !ALLOWED_FONTS.some((re) => re.test(f)));
  if (foreign.length) problems.push(`fallback fonts embedded (missing glyphs?): ${foreign.join(", ")}`);

  return { ok: problems.length === 0, problems, tagged, lang, title, figures, figuresWithAlt, structElements, fonts: [...fonts].sort() };
}
