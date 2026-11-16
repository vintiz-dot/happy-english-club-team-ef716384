/**
 * Independent review probes for the rich-text rebuild (docs/evidence/EDITOR-review.md).
 * Made-up HTML only. Runs with the other bun suites: node scripts/run-bun-tests.mjs
 *
 * 1. XSS: payloads through save / paste / render, and through a full editor
 *    round trip (sanitise -> legacy prepare -> ProseMirror -> getHTML -> sanitise),
 *    then the output is re-parsed and re-sanitised (mXSS: must be a fixed point
 *    with nothing executable).
 * 2. Images: what happens to a homework body holding a base64 / URL <img>.
 * 3. maxLength: does the editor with a limit trim longer existing content on load?
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
setDefaultTimeout(120_000);
import { installDom } from "./fixtures/rich-text/dom";

type Mod = typeof import("../src/components/rich-text/sanitize");
let sanitizeRichHtml: Mod["sanitizeRichHtml"];
let prepareForEditor: (html: string) => string;
let preparePaste: (html: string) => string;
let schemaExtensions: typeof import("../src/components/rich-text/extensions").schemaExtensions;
let editorExtensions: typeof import("../src/components/rich-text/extensions").editorExtensions;
let Editor: typeof import("@tiptap/core").Editor;
let uninstallDom: () => void;

beforeAll(async () => {
  uninstallDom = installDom();
  ({ sanitizeRichHtml } = await import("../src/components/rich-text/sanitize"));
  ({ prepareForEditor, preparePaste } = await import("../src/components/rich-text/legacy"));
  ({ schemaExtensions, editorExtensions } = await import("../src/components/rich-text/extensions"));
  ({ Editor } = await import("@tiptap/core"));
});
afterAll(() => uninstallDom?.());

const PAYLOADS: string[] = [
  `<script>alert(1)</script>x`,
  `<img src=x onerror=alert(1)>`,
  `<p onclick="alert(1)" onmouseover=alert(1)>t</p>`,
  `<a href="javascript:alert(1)">j</a>`,
  `<a href="JaVaScRiPt:alert(1)">j</a>`,
  `<a href="java&#x09;script:alert(1)">j</a>`,
  `<a href="java\nscript:alert(1)">j</a>`,
  `<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">j</a>`,
  `<a href="  javascript:alert(1)">j</a>`,
  `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">d</a>`,
  `<a href="vbscript:msgbox(1)">v</a>`,
  `<a href="VBScript:msgbox(1)">v</a>`,
  `<a href="//evil.example/">p</a>`,
  `<a href="https://ok.example/" target="_top">t</a>`,
  `<a href="https://ok.example/" target="_blank">no rel</a>`,
  `<svg><script>alert(1)</script></svg>`,
  `<svg onload=alert(1)><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>`,
  `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`,
  `<math><mi xlink:href="javascript:alert(1)">m</mi></math>`,
  `<iframe src="https://evil.example/"></iframe>`,
  `<iframe srcdoc="<script>alert(1)</script>"></iframe>`,
  `<object data="javascript:alert(1)"></object><embed src="javascript:alert(1)">`,
  `<style>body{background:url(javascript:alert(1))}</style>x`,
  `<p style="background-image:url(javascript:alert(1))">bg</p>`,
  `<p style="color: expression(alert(1))">ex</p>`,
  `<p style="color: red; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999">overlay</p>`,
  `<p style="color:\\72\\65\\64">esc</p>`,
  `<p style="color: var(--x)">var</p>`,
  `<p style="color: url(https://evil.example/x)">u</p>`,
  `<p style="color: red !important">imp</p>`,
  `<p style="background-color: rgb(1,2,3) ; behavior: url(x.htc)">beh</p>`,
  `<form action="https://evil.example/"><input name=x><button>go</button></form>`,
  `<base href="https://evil.example/">`,
  `<meta http-equiv="refresh" content="0;url=https://evil.example/">`,
  `<link rel=stylesheet href="https://evil.example/x.css">`,
  `<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>`,
  `<template><img src=x onerror=alert(1)></template>`,
  `<textarea><img src=x onerror=alert(1)></textarea>`,
  `<title><img src=x onerror=alert(1)></title>`,
  `<div id="x" name="cookie">clobber</div><form id=document></form>`,
  `<p class="ql-indent-1 hidden fixed inset-0 z-50 bg-black">cls</p>`,
  `<li data-list="bullet" data-foo="x" data-list2="y">li</li>`,
  `<ol start="99999999999"><li>s</li></ol>`,
  `<a href="https://ok.example/" style="color:red" onfocus=alert(1) autofocus>a</a>`,
  `<img src="data:image/svg+xml,<svg onload=alert(1)>">`,
  `<p>a<!--<img src=x onerror=alert(1)>-->b</p>`,
  `<p>]]><img src=x onerror=alert(1)></p>`,
  `<xmp><img src=x onerror=alert(1)></xmp>`,
  `<div><a href="https://ok.example/"><a href="javascript:alert(1)">nested</a></a></div>`,
  `<p dir="rtl" lang="x" aria-hidden="true" role="button" tabindex="0">attrs</p>`,
];

/** Nothing executable, loading or escaping the sandbox may remain. Returns the problems found. */
function problems(html: string): string[] {
  const out: string[] = [];
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "A", "BLOCKQUOTE", "CODE", "PRE", "SPAN", "DIV", "SUB", "SUP"]);
  const allowedAttrs = new Set(["href", "class", "style", "data-list", "start", "target", "rel"]);
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (!allowed.has(el.tagName)) out.push(`tag ${el.tagName}`);
    for (const a of Array.from(el.attributes)) {
      // aria-* is kept by DOMPurify's default (ALLOW_ARIA_ATTR); not script, reported by its own test below.
      if (!allowedAttrs.has(a.name) && !a.name.startsWith("aria-")) out.push(`attr ${el.tagName}[${a.name}=${a.value}]`);
      if (a.name === "href" && !/^https?:\/\//i.test(a.value)) out.push(`href ${a.value}`);
      if (a.name === "style" && /url\(|expression|\\|var\(|!important|position|z-index|width|height|behavior/i.test(a.value)) out.push(`style ${a.value}`);
      if (a.name === "class") for (const c of a.value.split(/\s+/)) if (!/^ql-(indent-\d|align-(center|right|justify))$/.test(c)) out.push(`class ${c}`);
      if (a.name === "target" && a.value !== "_blank") out.push(`target ${a.value}`);
      if (a.name === "rel" && a.value !== "noopener noreferrer") out.push(`rel ${a.value}`);
    }
    if (el.tagName === "A" && el.hasAttribute("target") && el.getAttribute("rel") !== "noopener noreferrer") out.push("a target without rel");
  }
  return out;
}
function assertInert(html: string, label = "") {
  const p = problems(html);
  if (p.length) console.log("NOT INERT", label, JSON.stringify(p), html.slice(0, 200));
  expect(p).toEqual([]);
}

function roundTrip(stored: string, extensions = schemaExtensions({})): string {
  const editor = new Editor({ extensions, content: prepareForEditor(sanitizeRichHtml(stored, "store")) });
  const out = editor.isEmpty ? "" : sanitizeRichHtml(editor.getHTML(), "store");
  editor.destroy();
  return out;
}

describe("review: XSS payloads", () => {
  for (const mode of ["store", "paste", "render"] as const) {
    test(`${mode}: every payload comes out inert and is a fixed point`, () => {
      for (const p of PAYLOADS) {
        const once = sanitizeRichHtml(mode === "paste" ? preparePaste(p) : p, mode);
        assertInert(once, mode + " " + p);
        // mXSS: serialise, re-parse, re-sanitise -> nothing new, nothing executable.
        const twice = sanitizeRichHtml(once, mode);
        assertInert(twice, mode + " twice " + p);
        expect(sanitizeRichHtml(twice, mode)).toBe(twice);
      }
    });
  }

  test("full editor round trip (open, save) keeps every payload inert", () => {
    for (const p of PAYLOADS) {
      const saved = roundTrip(p);
      assertInert(saved);
      assertInert(sanitizeRichHtml(saved, "render"));
    }
  });

  test("the editor's raw getHTML (before the save sanitiser) is already inert", () => {
    for (const p of PAYLOADS) {
      const editor = new Editor({ extensions: schemaExtensions({}), content: prepareForEditor(sanitizeRichHtml(p, "store")) });
      assertInert(editor.getHTML());
      editor.destroy();
    }
  });

  test("ProseMirror parsing a RAW payload (no sanitiser) still yields only schema output", () => {
    // Belt and braces: if a caller ever skipped the sanitiser, the schema alone is the boundary.
    for (const p of PAYLOADS) {
      const editor = new Editor({ extensions: schemaExtensions({}), content: p });
      const html = editor.getHTML();
      editor.destroy();
      const pr = problems(html).filter((x) => !/^attr (P|H\d|LI|OL|UL)\[|^class /.test(x));
      if (pr.length) console.log("RAW PM", p, JSON.stringify(pr), html.slice(0, 200));
      expect(pr).toEqual([]);
    }
  });
});

describe("review: stored pictures", () => {
  const BASE64_BODY = `<p>Look at the picture:</p><p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="></p><p>Write three sentences.</p>`;
  const URL_BODY = `<p>Before</p><p><img src="https://img.example/cat.png"></p><p>After</p>`;

  test("render (what children and teachers see) never showed the picture, before or after", () => {
    expect(sanitizeRichHtml(BASE64_BODY, "render")).not.toContain("<img");
    expect(sanitizeRichHtml(URL_BODY, "render")).not.toContain("<img");
  });

  test("open + save in the editor without an upload adapter DROPS both pictures", () => {
    const a = roundTrip(BASE64_BODY);
    const b = roundTrip(URL_BODY);
    expect(a).not.toContain("<img");
    expect(b).not.toContain("<img");
    // the text survives
    expect(a).toContain("Write three sentences.");
    expect(b).toContain("After");
  });

  test("even with allowImages, a base64 picture is dropped (http(s) only)", () => {
    expect(sanitizeRichHtml(BASE64_BODY, "store", { allowImages: true })).not.toContain("<img");
    expect(sanitizeRichHtml(URL_BODY, "store", { allowImages: true })).toContain('src="https://img.example/cat.png"');
  });
});

describe("review: aria attributes", () => {
  test("FINDING: aria-* from stored or pasted HTML survives every mode (DOMPurify default ALLOW_ARIA_ATTR)", () => {
    const html = `<p aria-hidden="true">hidden from screen readers</p><p aria-label="other words">shown</p>`;
    for (const mode of ["store", "paste", "render"] as const) {
      expect(sanitizeRichHtml(html, mode)).toContain("aria-hidden");
    }
  });
});

// No caller passes maxLength today; the README advertises it. These assert the defect AS FOUND:
// flip them when editorExtensions configures CharacterCount with autoTrim: false and lets setContent through.
describe("review: maxLength on existing content (CharacterCount limit)", () => {
  const LONG = `<p>START-OF-ROW ${"abcdefghij".repeat(30)}</p><p>END-OF-ROW</p>`; // > 300 characters

  test("untouched (no transaction yet) the row is intact", () => {
    const editor = new Editor({ extensions: editorExtensions({ maxLength: 100 }), content: prepareForEditor(sanitizeRichHtml(LONG, "store")) });
    expect(editor.getText()).toContain("START-OF-ROW");
    editor.destroy();
  });

  test("FINDING: the first transaction (a click / selection) cuts the row FROM THE START", () => {
    const editor = new Editor({ extensions: editorExtensions({ maxLength: 100 }), content: prepareForEditor(sanitizeRichHtml(LONG, "store")) });
    editor.commands.setTextSelection(1);
    const text = editor.getText();
    editor.destroy();
    expect(text.includes("START-OF-ROW")).toBe(false);
  });

  test("FINDING: a row loaded after mount (setContent, as EditHomeworkDialog does) longer than the limit is refused", () => {
    const editor = new Editor({ extensions: editorExtensions({ maxLength: 100 }), content: "" });
    editor.commands.setTextSelection(0);
    editor.commands.setContent(prepareForEditor(sanitizeRichHtml(LONG, "store")), { emitUpdate: false });
    const text = editor.getText();
    editor.destroy();
    expect(text.includes("END-OF-ROW")).toBe(false);
  });
});
