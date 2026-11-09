/**
 * Homework instructions written in the teachers' rich-text editor, made safe
 * to READ on a phone.
 *
 * Why this exists: the old renderer let every element break "anywhere" and
 * kept whatever inline styles a teacher pasted in (from Word, Google Docs,
 * web pages). On a 360px screen that combination collapsed words into one
 * letter per line:
 *   - `overflow-wrap: anywhere` lets a box shrink to the width of ONE
 *     character, so anything squeezed (an indented list, a pasted fixed-width
 *     block) wraps letter by letter;
 *   - pasted `width`, `white-space: nowrap`, `margin-left`, letter-spacing...
 *     fight the phone's width;
 *   - Quill indents (`ql-indent-5` = 15em of padding) eat the whole column;
 *   - Word puts `&nbsp;` between words, so a sentence has no place to wrap.
 *
 * `cleanRichHtml` sanitizes exactly like `sanitizeHtml` (same tags) and then
 * keeps only the styling that carries meaning (colour, highlight, bold,
 * italic, underline, alignment). Layout comes from the `.hw-rich` stylesheet.
 */
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "blockquote", "code", "pre", "span", "div", "sub", "sup",
];

// Inline style properties that are about MEANING, never about layout.
const KEPT_STYLES = new Set([
  "color",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
]);

// Quill list markers worth keeping: Quill 2 writes bullet lists as
// <ol><li data-list="bullet">, so without this every bullet list showed as
// 1. 2. 3.
const KEPT_LIST_TYPES = new Set(["bullet", "ordered", "checked", "unchecked"]);

function filterStyle(style: string): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.slice(0, decl.indexOf(":")).trim().toLowerCase();
      if (!KEPT_STYLES.has(prop)) return false;
      // A pasted `!important` would beat the reading stylesheet.
      return !/!important/i.test(decl);
    })
    .join("; ");
}

function filterClass(cls: string): string {
  // Keep Quill's alignment and (capped) indent classes only.
  return cls
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => {
      const indent = /^ql-indent-(\d+)$/.exec(c);
      if (indent) return `ql-indent-${Math.min(Number(indent[1]), 3)}`;
      return /^ql-align-(center|right|justify)$/.test(c) ? c : "";
    })
    .filter(Boolean)
    .join(" ");
}

/** A single `&nbsp;` between two words is a pasted space, not a layout choice. */
function softenNbsp(text: string): string {
  return text.replace(/(\S) (?=\S)/g, "$1 ");
}

export function cleanRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "class", "style", "data-list"],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment;

  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.nodeValue || "";
      if (t.includes(" ")) node.nodeValue = softenNbsp(t);
    } else {
      const el = node as HTMLElement;
      const style = el.getAttribute("style");
      if (style !== null) {
        const kept = filterStyle(style);
        if (kept) el.setAttribute("style", kept);
        else el.removeAttribute("style");
      }
      const cls = el.getAttribute("class");
      if (cls !== null) {
        const kept = filterClass(cls);
        if (kept) el.setAttribute("class", kept);
        else el.removeAttribute("class");
      }
      const list = el.getAttribute("data-list");
      if (list !== null && (el.tagName !== "LI" || !KEPT_LIST_TYPES.has(list))) {
        el.removeAttribute("data-list");
      }
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
    node = walker.nextNode();
  }

  const box = document.createElement("div");
  box.appendChild(fragment);
  return box.innerHTML;
}

/** The instructions as one line of plain text, for a card preview. */
export function richTextPreview(html: string | null | undefined, max = 160): string {
  if (!html) return "";
  const box = document.createElement("div");
  // Block ends become spaces so "Read p.12</p><p>Answer" doesn't glue together.
  box.innerHTML = DOMPurify.sanitize(html.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, " "), {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
  const text = (box.textContent || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
