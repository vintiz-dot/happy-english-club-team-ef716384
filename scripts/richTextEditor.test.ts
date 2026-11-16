/**
 * The shared rich-text editor (src/components/rich-text) against the HTML the
 * old Quill editor stored. For every fixture: load it into the real editor
 * schema (Tiptap, headless, in happy-dom), save, render - and the MEANING a
 * reader gets (text, bold/italic/..., links, colours, list kind and depth,
 * indents, alignment, headings) must equal what today's renderer showed.
 *
 *   node scripts/run-bun-tests.mjs   (or: npm run test:bun)
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
// jsdom + Tiptap import in beforeAll can take longer than bun's 5 s default on a loaded machine.
setDefaultTimeout(120_000);
import { installDom } from "./fixtures/rich-text/dom";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GOOGLE_DOCS_PASTE, QUILL_CHECKLIST, QUILL_FIXTURES, WORD_PASTE } from "./fixtures/rich-text/quillFixtures";

// Imported after the DOM exists: DOMPurify binds to the window it finds.
type Mod = typeof import("../src/components/rich-text/sanitize");
let sanitizeRichHtml: Mod["sanitizeRichHtml"];
let isRichTextEmpty: Mod["isRichTextEmpty"];
let unkeepablePictures: Mod["unkeepablePictures"];
let editorExtensions: typeof import("../src/components/rich-text/extensions").editorExtensions;
let prepareForEditor: (html: string) => string;
let preparePaste: (html: string) => string;
let schemaExtensions: typeof import("../src/components/rich-text/extensions").schemaExtensions;
let Editor: typeof import("@tiptap/core").Editor;
let legacyClean: (html: string) => string;
let legacySanitize: (html: string) => string;
let appClean: (html: string) => string;
let strings: typeof import("../src/components/rich-text/strings");
let uninstallDom: () => void;

beforeAll(async () => {
  uninstallDom = installDom();
  ({ sanitizeRichHtml, isRichTextEmpty, unkeepablePictures } = await import("../src/components/rich-text/sanitize"));
  ({ prepareForEditor, preparePaste } = await import("../src/components/rich-text/legacy"));
  ({ schemaExtensions, editorExtensions } = await import("../src/components/rich-text/extensions"));
  ({ Editor } = await import("@tiptap/core"));
  ({ cleanRichHtml: legacyClean } = await import("./fixtures/rich-text/legacyRichText"));
  ({ sanitizeHtml: legacySanitize } = await import("./fixtures/rich-text/legacySanitize"));
  ({ cleanRichHtml: appClean } = await import("../src/lib/richText"));
  strings = await import("../src/components/rich-text/strings");
});

afterAll(() => {
  uninstallDom?.();
});

// ------------------------------------------------------------------ helpers

/** Open stored HTML in the editor exactly as RichTextEditor does, return what it saves. */
function roundTrip(stored: string, images = false): string {
  const editor = new Editor({
    extensions: schemaExtensions({ images }),
    content: prepareForEditor(sanitizeRichHtml(stored, "store", { allowImages: images })),
  });
  const out = editor.isEmpty ? "" : sanitizeRichHtml(editor.getHTML(), "store", { allowImages: images });
  editor.destroy();
  return out;
}

/** What a paste turns into: the editor's paste transform, then the schema, then save. */
function pasteThrough(html: string): string {
  return roundTrip(sanitizeRichHtml(preparePaste(html), "paste"));
}

interface Run { text: string; marks: string[] }
interface Line { kind: string; depth: number; indent: number; align: string; quote: boolean; runs: Run[] }

function normColour(v: string): string {
  const s = v.trim().toLowerCase().replace(/\s+/g, "");
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return `rgb(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)})`;
  }
  return s;
}

function styleMarks(el: Element): string[] {
  const out: string[] = [];
  for (const decl of (el.getAttribute("style") || "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const p = decl.slice(0, i).trim().toLowerCase();
    const v = decl.slice(i + 1).trim();
    if (p === "color") out.push(`color:${normColour(v)}`);
    if (p === "background-color") out.push(`bg:${normColour(v)}`);
    if (p === "font-weight" && /^(bold|[6-9]00)$/.test(v)) out.push("b");
    if (p === "font-style" && v === "italic") out.push("i");
    if ((p === "text-decoration" || p === "text-decoration-line") && v.includes("underline")) out.push("u");
    if ((p === "text-decoration" || p === "text-decoration-line") && v.includes("line-through")) out.push("s");
  }
  return out;
}

const TAG_MARK: Record<string, string> = { STRONG: "b", B: "b", EM: "i", I: "i", U: "u", S: "s", STRIKE: "s", SUB: "sub", SUP: "sup", CODE: "code" };
const BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|PRE)$/;

function classNum(el: Element, re: RegExp): string {
  const m = re.exec(el.getAttribute("class") || "");
  return m ? m[1] : "";
}

function inlineRuns(nodes: Node[], marks: string[] = []): Run[] {
  const runs: Run[] = [];
  for (const n of nodes) {
    if (n.nodeType === 3) runs.push({ text: n.nodeValue || "", marks: [...new Set(marks)].sort() });
    else if (n.nodeType === 1) {
      const el = n as Element;
      if (el.tagName === "BR") { runs.push({ text: "\n", marks: [] }); continue; }
      if (BLOCK.test(el.tagName)) continue;
      const m = [...marks, ...styleMarks(el)];
      if (TAG_MARK[el.tagName]) m.push(TAG_MARK[el.tagName]);
      if (el.tagName === "A") m.push(`a:${el.getAttribute("href") || ""}`);
      runs.push(...inlineRuns(Array.from(el.childNodes), m));
    }
  }
  return runs;
}

function merge(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.marks.join() === r.marks.join()) prev.text += r.text;
    else out.push({ text: r.text, marks: r.marks });
  }
  // A trailing break ends the line; it is not content.
  const last = out[out.length - 1];
  if (last) { last.text = last.text.replace(/\n+$/, ""); if (!last.text) out.pop(); }
  return out;
}

/** The reader's meaning of rendered HTML, independent of how lists are spelled. */
function meaning(html: string): Line[] {
  const box = document.createElement("div");
  box.innerHTML = html;
  const lines: Line[] = [];
  const MAX = 3; // the reader draws at most three levels
  const line = (kind: string, el: Element | null, nodes: Node[], ctx: { depth: number; quote: boolean }, extraIndent = 0) => {
    const indent = el ? Number(classNum(el, /ql-indent-(\d+)/) || 0) : 0;
    lines.push({
      kind,
      depth: Math.min(ctx.depth, MAX),
      indent: Math.min(indent + extraIndent, MAX),
      align: el ? classNum(el, /ql-align-(center|right|justify)/) || (el as HTMLElement).style?.textAlign || "" : "",
      quote: ctx.quote,
      runs: merge(inlineRuns(nodes)),
    });
  };
  const walk = (parent: Element, ctx: { depth: number; quote: boolean }) => {
    let pending: Node[] = [];
    const flush = () => { if (pending.some((n) => (n.textContent || "").trim() || n.nodeName === "BR")) line("p", null, pending, ctx); pending = []; };
    for (const n of Array.from(parent.childNodes)) {
      if (n.nodeType !== 1 || !BLOCK.test((n as Element).tagName)) { pending.push(n); continue; }
      flush();
      const el = n as Element;
      const tag = el.tagName;
      if (tag === "P" || tag === "DIV" || /^H[1-6]$/.test(tag)) {
        if (tag === "DIV" && Array.from(el.children).some((c) => BLOCK.test(c.tagName))) walk(el, ctx);
        else line(tag === "DIV" ? "p" : tag.toLowerCase(), el, Array.from(el.childNodes), ctx);
      } else if (tag === "BLOCKQUOTE") {
        walk(el, { ...ctx, quote: true });
      } else if (tag === "PRE") {
        lines.push({ kind: "pre", depth: ctx.depth, indent: 0, align: "", quote: ctx.quote, runs: [{ text: (el.textContent || "").replace(/\n+$/, ""), marks: [] }] });
      } else if (tag === "UL" || tag === "OL") {
        for (const li of Array.from(el.children)) {
          if (li.tagName !== "LI") continue;
          const t = li.getAttribute("data-list");
          const kind = t === "bullet" || t === "checked" || t === "unchecked" ? "bullet" : t === "ordered" ? "ordered" : tag === "UL" ? "bullet" : "ordered";
          const flatDepth = Number(classNum(li, /ql-indent-(\d+)/) || 0);
          const depth = ctx.depth + flatDepth;
          // The item's own text: inline children, or its first paragraph.
          const kids = Array.from(li.childNodes);
          const firstBlock = kids.find((k) => k.nodeType === 1 && BLOCK.test((k as Element).tagName)) as Element | undefined;
          const inline = kids.filter((k) => !(k.nodeType === 1 && BLOCK.test((k as Element).tagName)));
          let alignEl: Element = li;
          let textNodes = inline;
          if (!inline.some((k) => (k.textContent || "").trim()) && firstBlock && firstBlock.tagName === "P") {
            textNodes = Array.from(firstBlock.childNodes);
            alignEl = firstBlock;
          }
          lines.push({
            kind: `li-${kind}`,
            depth: Math.min(depth, MAX),
            indent: 0,
            align: classNum(alignEl, /ql-align-(center|right|justify)/) || classNum(li, /ql-align-(center|right|justify)/),
            quote: ctx.quote,
            runs: merge(inlineRuns(textNodes)),
          });
          for (const k of kids) {
            if (k.nodeType === 1 && /^(UL|OL)$/.test((k as Element).tagName)) {
              const nested = document.createElement("div");
              nested.appendChild(k.cloneNode(true));
              walk(nested, { ...ctx, depth: depth + 1 });
            }
          }
        }
      }
    }
    flush();
  };
  walk(box, { depth: 0, quote: false });
  return lines;
}

// ------------------------------------------------------------------ tests

describe("old Quill rows load, save and render with the same meaning", () => {
  for (const fx of QUILL_FIXTURES) {
    test(fx.name, () => {
      const today = meaning(legacyClean(fx.html));
      const saved = roundTrip(fx.html);
      const rendered = sanitizeRichHtml(saved, "render");
      expect(meaning(rendered)).toEqual(today);
      // And the renderers that used sanitizeHtml (teacher screens) read the same.
      expect(meaning(sanitizeRichHtml(fx.html, "render"))).toEqual(today);
    });
  }

  test("saving is stable: opening a saved row and saving again changes nothing", () => {
    for (const fx of QUILL_FIXTURES) {
      const once = roundTrip(fx.html);
      expect(roundTrip(once)).toBe(once);
    }
  });

  test("the app's cleanRichHtml is the shared render sanitiser", () => {
    for (const fx of QUILL_FIXTURES) expect(appClean(fx.html)).toBe(sanitizeRichHtml(fx.html, "render"));
  });

  test("today's renderer gives the same meaning for the new editor's rows (homework PDF, old screens)", () => {
    for (const fx of QUILL_FIXTURES) {
      const saved = roundTrip(fx.html);
      expect(meaning(legacyClean(saved))).toEqual(meaning(legacyClean(fx.html)));
    }
  });

  test("an untouched row is not rewritten by opening it", () => {
    // The editor emits nothing until a person types, so a caller saving an
    // untouched form sends the original string - checked in EditorImpl by the
    // value/lastHtml guard; here: the editor's reading is lossless for it.
    const fx = QUILL_FIXTURES[2];
    expect(meaning(sanitizeRichHtml(roundTrip(fx.html), "render"))).toEqual(meaning(legacyClean(fx.html)));
  });
});

describe("what the editor stores", () => {
  test("Quill's flat lists become nested lists of the right kind", () => {
    const saved = roundTrip(QUILL_FIXTURES[2].html);
    expect(saved).toBe(
      "<ol><li>Unit 3 vocabulary<ul><li>cat, dog, rabbit</li><li>parrot</li></ul></li>" +
        "<li>Workbook page 20<ol><li>Exercise A<ol><li>only the odd numbers</li></ol></li></ol></li><li>Sing the song</li></ol>",
    );
  });

  test("indent and alignment are stored as Quill's classes", () => {
    expect(roundTrip('<p class="ql-indent-2 ql-align-center">x</p>')).toBe('<p class="ql-indent-2 ql-align-center">x</p>');
    expect(roundTrip('<p style="text-align: right">x</p>')).toBe('<p class="ql-align-right">x</p>');
    expect(roundTrip('<p class="ql-indent-12">x</p>')).toBe('<p class="ql-indent-8">x</p>');
  });

  test("empty lines are stored as Quill stored them", () => {
    expect(roundTrip("<p>a</p><p><br></p><p>b</p>")).toBe("<p>a</p><p><br></p><p>b</p>");
  });

  test("links: http(s) kept and opened safely, anything else unlinked", () => {
    expect(roundTrip('<p><a href="https://example.com/a">a</a></p>')).toBe('<p><a href="https://example.com/a" target="_blank" rel="noopener noreferrer">a</a></p>');
    for (const bad of ["javascript:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "java\nscript:alert(1)", "mailto:a@b.c"]) {
      const out = roundTrip(`<p><a href="${bad}">x</a></p>`);
      expect(out).not.toContain("href");
      expect(out).toContain("x");
    }
  });

  test("colour on <strong> survives (Quill wrote it there)", () => {
    expect(roundTrip('<p><strong style="color: rgb(0, 102, 204);">Blue</strong></p>')).toBe('<p><span style="color: rgb(0, 102, 204)"><strong>Blue</strong></span></p>');
  });

  test("Quill check lists open as bullet lists (the tick is not kept)", () => {
    expect(roundTrip(QUILL_CHECKLIST)).toBe("<ul><li>Read the story</li><li>Draw the fox</li></ul>");
  });

  test("an empty editor saves an empty string", () => {
    expect(roundTrip("")).toBe("");
    expect(roundTrip("<p><br></p>")).toBe("");
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
    expect(isRichTextEmpty("<p>&nbsp;</p>")).toBe(true);
    expect(isRichTextEmpty("<p>a</p>")).toBe(false);
  });

  test("pictures a row holds are kept (http(s), base64 png/jpeg/gif/webp); other kinds are not", () => {
    const html = '<p>a<img src="https://cdn.example.com/x.png"><img src="data:image/png;base64,AAAA" alt="cat"><img src="data:image/svg+xml;base64,AAAA"><img src="x"></p>';
    expect(roundTrip(html)).toBe('<p>a<img src="https://cdn.example.com/x.png"><img src="data:image/png;base64,AAAA" alt="cat"></p>');
    expect(roundTrip(html, true)).toBe(roundTrip(html));
  });
});

describe("review fixes: pictures (B2), maxLength (B3), aria (N1)", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const ROW = `<p>Look at the picture:</p><p><img src="${PNG}"></p><p>Write three sentences.</p>`;

  function openTypeSave(stored: string, typed: string, maxLength?: number): string {
    const editor = new Editor({ extensions: editorExtensions({ maxLength }), content: prepareForEditor(sanitizeRichHtml(stored, "store")) });
    editor.chain().focus("end").insertContent(typed).run();
    const out = sanitizeRichHtml(editor.getHTML(), "store");
    editor.destroy();
    return out;
  }

  test("an old row with a base64 picture: open, type, save keeps the picture byte for byte", () => {
    const saved = openTypeSave(ROW, " Thanks.");
    expect(saved).toContain(`<img src="${PNG}">`);
    expect(saved).toContain("Write three sentences. Thanks.");
    expect(saved).toBe(`<p>Look at the picture:</p><p><img src="${PNG}"></p><p>Write three sentences. Thanks.</p>`);
  });

  test("render mode (children, families, teachers reading) still shows no picture", () => {
    expect(sanitizeRichHtml(ROW, "render")).not.toContain("<img");
    expect(appClean(ROW)).not.toContain("<img");
  });

  test("a picture over the 2 MB cap is not kept, and is reported so the editor locks the row", () => {
    const big = "data:image/png;base64," + "A".repeat(2 * 1024 * 1024 + 4);
    const row = `<p>Big:</p><p><img src="${big}"></p>`;
    expect(unkeepablePictures(row)).toBe(1);
    expect(unkeepablePictures(ROW)).toBe(0);
    expect(unkeepablePictures('<p><img src="https://cdn.example.com/x.png"></p>')).toBe(0);
    expect(unkeepablePictures('<p><img src="data:image/svg+xml;base64,AAAA"></p>')).toBe(1);
    expect(sanitizeRichHtml(row, "store")).not.toContain("<img");
  });

  test("maxLength: a longer row loads whole, typing past the limit is refused, deleting is allowed", () => {
    const long = `<p>START ${"abcdefghij".repeat(20)} END</p>`;
    const editor = new Editor({ extensions: editorExtensions({ maxLength: 50 }), content: prepareForEditor(long) });
    editor.commands.setTextSelection(3);
    expect(editor.getText()).toContain("START");
    expect(editor.getText()).toContain("END");
    const before = editor.getText().length;
    editor.chain().focus("end").insertContent("more").run();
    expect(editor.getText().length).toBe(before);
    editor.commands.deleteRange({ from: 1, to: 6 });
    expect(editor.getText().length).toBe(before - 5);
    editor.destroy();
  });

  test("maxLength: a short text grows up to the limit and no further", () => {
    const editor = new Editor({ extensions: editorExtensions({ maxLength: 10 }), content: "<p>abc</p>" });
    editor.chain().focus("end").insertContent("defg").run();
    expect(editor.getText()).toBe("abcdefg");
    editor.chain().focus("end").insertContent("hijklmn").run();
    expect(editor.getText()).toBe("abcdefg");
    editor.destroy();
  });

  test("aria-* never survives", () => {
    for (const mode of ["store", "paste", "render"] as const) expect(sanitizeRichHtml('<p aria-hidden="true" aria-label="x">t</p>', mode)).toBe("<p>t</p>");
  });
});

describe("the sanitiser (save, paste and render)", () => {
  const attacks = [
    '<img src=x onerror="alert(1)">',
    "<script>alert(1)</script>",
    '<p onclick="alert(1)">hi</p>',
    '<p style="background-image: url(javascript:alert(1))">hi</p>',
    '<p style="color: expression(alert(1))">hi</p>',
    '<span style="color: red; position: fixed; top: 0">hi</span>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="  JaVaScRiPt:alert(1)">x</a>',
    '<iframe src="https://evil.invalid"></iframe>',
    '<svg><script>alert(1)</script></svg>',
    '<form action="https://evil.invalid"><input name="password"></form>',
    '<p class="ql-indent-1 evil-class" id="x" data-x="1">hi</p>',
  ];
  for (const mode of ["store", "render", "paste"] as const) {
    test(`${mode}: no script, handler, foreign tag or layout style gets through`, () => {
      for (const a of attacks) {
        const out = sanitizeRichHtml(a, mode);
        expect(out).not.toMatch(/<script|onerror|onclick|javascript:|expression\(|url\(|<iframe|<svg|<form|<input|position|evil-class|id=|data-x|<img/i);
      }
    });
  }

  test("render caps indents at three and softens pasted no-break spaces", () => {
    expect(sanitizeRichHtml('<p class="ql-indent-6">a b</p>', "render")).toBe('<p class="ql-indent-3">a b</p>');
    expect(sanitizeRichHtml('<p class="ql-indent-6">a b</p>', "store")).toBe('<p class="ql-indent-6">a&nbsp;b</p>');
  });

  test("render agrees with today's cleanRichHtml for every fixture (apart from link attributes)", () => {
    const norm = (h: string) => h.replace(/ (target|rel)="[^"]*"/g, "");
    for (const fx of QUILL_FIXTURES) expect(norm(sanitizeRichHtml(fx.html, "render"))).toBe(norm(legacyClean(fx.html)));
  });

  test("the old sanitizeHtml renderers lost Quill 2 bullets; RichTextView keeps them", () => {
    const html = QUILL_FIXTURES[1].html;
    expect(legacySanitize(html)).not.toContain("data-list");
    expect(sanitizeRichHtml(html, "render")).toContain('data-list="bullet"');
  });
});

describe("paste from Word and Google Docs", () => {
  test("Word: lists become real nested lists, Office styles and black text go", () => {
    const out = pasteThrough(WORD_PASTE);
    expect(out).toBe(
      "<p><strong>Homework for Monday</strong></p>" +
        "<ul><li>Read page 4<ul><li>only the <em>first</em> part</li></ul></li><li>Answer the questions</li></ul>" +
        '<p><span style="color: rgb(192, 0, 0)">Bring the book!</span></p>',
    );
  });

  test("Google Docs: the bold wrapper is not bold, real formatting stays, default colours go", () => {
    const out = pasteThrough(GOOGLE_DOCS_PASTE);
    if (process.env.SHOW_PASTE) console.log("GDOCS", out);
    expect(out).toContain("<strong>Spelling test</strong><em> on Friday</em>");
    expect(out).toContain("<u>elephant</u>");
    expect(out).toContain('href="https://example.org/words"');
    expect(out).toContain('<span style="color: rgb(255, 0, 0)">Practise at home</span>');
    expect(out).not.toMatch(/font-family|font-size|line-height|#000000|rgb\(0, 0, 0\)|docs-internal|dir=/);
    expect(out.startsWith("<p><strong>Spelling test</strong>")).toBe(true); // GDOCS_OUT
  });
});

describe("SaaS-ready folder", () => {
  const dir = join(import.meta.dir, "..", "src", "components", "rich-text");
  const files = readdirSync(dir).filter((f) => /\.(ts|tsx|css)$/.test(f));

  test("imports nothing from the app but the pure URL check", () => {
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      const imports = [...src.matchAll(/from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g)].map((m) => m[1] || m[2]);
      for (const spec of imports) {
        const ok = spec.startsWith("./") || spec === "@/lib/safeUrl" || !spec.startsWith("@/") && !spec.startsWith("../");
        expect({ file: f, spec, ok }).toEqual({ file: f, spec, ok: true });
      }
      expect(src).not.toMatch(/supabase|Happy English|hec-team/i);
      expect(src).not.toMatch(/\bHEC\b/); // the school's name; the token prefix `--hec-` is lower case
    }
  });

  test("English and Vietnamese carry every string", () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(strings.RICH_TEXT_STRINGS_VI)).toEqual(keys(strings.RICH_TEXT_STRINGS_EN));
    expect(keys(strings.RICH_TEXT_STRINGS_VI.colourNames)).toEqual(keys(strings.RICH_TEXT_STRINGS_EN.colourNames));
    for (const v of Object.values(strings.RICH_TEXT_STRINGS_VI)) expect(v).toBeTruthy();
    expect(strings.resolveStrings("vi", { bold: "Đậm" }).bold).toBe("Đậm");
  });

  test("styles use hec tokens only (no raw colours in the editor's css)", () => {
    for (const f of files.filter((x) => x.endsWith(".css"))) {
      const css = readFileSync(join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\((?!var\(--hec-)/i);
    }
  });
});
