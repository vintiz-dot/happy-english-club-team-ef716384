/**
 * The one allow-list for rich text, used when it is SAVED (the editor's
 * output), when it is PASTED (before the editor parses it) and when it is
 * RENDERED (RichTextView). Three modes of one rule, so what the editor can
 * write is exactly what a reader can see.
 *
 * Stored format: plain semantic HTML plus the class vocabulary Quill used
 * (`ql-indent-N`, `ql-align-*`, `li[data-list]`). Every row written by the old
 * editor is therefore already in the format, and every renderer that read
 * Quill HTML reads the new editor's HTML unchanged.
 *
 * Needs a DOM (browser, or happy-dom in tests). DOMPurify does the parsing
 * and the tag/attribute allow-list; the walk below then narrows class, style
 * and href to values that carry meaning and cannot carry script or layout.
 */
import DOMPurify, { type DOMPurify as DOMPurifyInstance } from "dompurify";
import { safeHttpUrl } from "@/lib/safeUrl";

export type SanitizeMode = "store" | "render" | "paste";

export interface SanitizeOptions {
  /** Keep <img> with an http(s) src. Off unless the editor has an image adapter. */
  allowImages?: boolean;
}

const BASE_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "blockquote", "code", "pre", "span", "div", "sub", "sup",
];
const BASE_ATTRS = ["href", "class", "style", "data-list", "start"];

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

// Quill 2 writes bullet lists as <ol><li data-list="bullet">; without the
// marker every bullet list reads 1. 2. 3.
const KEPT_LIST_TYPES = new Set(["bullet", "ordered", "checked", "unchecked"]);

/** Indents deeper than this are kept in storage but drawn at this depth. */
export const RENDER_MAX_INDENT = 3;
/** The deepest indent the editor writes (Quill's own limit). */
export const STORE_MAX_INDENT = 8;

// A style value may be a colour, a keyword or a weight - never a function
// other than rgb()/rgba()/hsl()/hsla(), never an escape, never `!important`.
const SAFE_STYLE_VALUE = /^[#a-z0-9\s.,%()-]+$/i;
const STYLE_FUNCTION = /([a-z-]+)\s*\(/gi;
const ALLOWED_FUNCTIONS = new Set(["rgb", "rgba", "hsl", "hsla"]);

// Colours that a paste carries only because the source document draws on
// white: black text and white highlight. Kept, they are unreadable in dark.
const DEFAULT_PASTE_COLOURS = /^(#000(000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|windowtext|#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|transparent|inherit|initial|auto)$/i;

let instance: DOMPurifyInstance | null = null;
function purifier(): DOMPurifyInstance {
  // Our own instance: hooks another module adds to the default one do not
  // reach it, and it binds to whatever window exists when first used.
  if (!instance) instance = DOMPurify(window as unknown as Window & typeof globalThis);
  return instance;
}

function safeStyleValue(value: string): boolean {
  if (!value || !SAFE_STYLE_VALUE.test(value)) return false;
  STYLE_FUNCTION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STYLE_FUNCTION.exec(value))) {
    if (!ALLOWED_FUNCTIONS.has(m[1].toLowerCase())) return false;
  }
  return true;
}

function filterStyle(style: string, mode: SanitizeMode): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const colon = decl.indexOf(":");
      if (colon < 1) return false;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const value = decl.slice(colon + 1).trim();
      if (!KEPT_STYLES.has(prop)) return false;
      // A pasted `!important` would beat the reading stylesheet.
      if (/!important/i.test(value)) return false;
      if (!safeStyleValue(value)) return false;
      if (mode === "paste" && (prop === "color" || prop === "background-color") && DEFAULT_PASTE_COLOURS.test(value)) return false;
      if (prop === "text-align" && !/^(left|center|right|justify|start|end)$/i.test(value)) return false;
      return true;
    })
    .map((decl) => {
      const colon = decl.indexOf(":");
      return `${decl.slice(0, colon).trim().toLowerCase()}: ${decl.slice(colon + 1).trim()}`;
    })
    .join("; ");
}

function filterClass(cls: string, mode: SanitizeMode): string {
  const cap = mode === "render" ? RENDER_MAX_INDENT : STORE_MAX_INDENT;
  return cls
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => {
      const indent = /^ql-indent-(\d+)$/.exec(c);
      if (indent) {
        const n = Math.min(Number(indent[1]), cap);
        return n > 0 ? `ql-indent-${n}` : "";
      }
      return /^ql-align-(center|right|justify)$/.test(c) ? c : "";
    })
    .filter(Boolean)
    .join(" ");
}

/** A single `&nbsp;` between two words is a pasted space, not a layout choice. */
function softenNbsp(text: string): string {
  return text.replace(/(\S) (?=\S)/g, "$1 ");
}

/**
 * Sanitise rich-text HTML.
 * - `store`: what the editor saves. Indents kept up to 8, links forced to open
 *   safely, empty paragraphs written as `<p><br></p>` and single-paragraph list
 *   items unwrapped, so a row looks like the ones Quill wrote.
 * - `render`: what a reader sees. As `store`, plus indents drawn at most 3 deep
 *   and pasted `&nbsp;` between words softened so phones can wrap.
 * - `paste`: what a paste may bring in. Office/Docs default colours dropped.
 */
export function sanitizeRichHtml(html: string | null | undefined, mode: SanitizeMode = "render", options: SanitizeOptions = {}): string {
  if (!html) return "";
  const tags = options.allowImages ? [...BASE_TAGS, "img"] : BASE_TAGS;
  const attrs = options.allowImages ? [...BASE_ATTRS, "src", "alt"] : BASE_ATTRS;
  // Parse into an inert document (no scripts run, nothing loads), gather the
  // body into one allowed root, and let DOMPurify clean that root in place.
  const doc = new DOMParser().parseFromString(`<!doctype html><html><head></head><body>${html}</body></html>`, "text/html");
  const fragment = doc.createElement("div");
  while (doc.body.firstChild) fragment.appendChild(doc.body.firstChild);
  doc.body.appendChild(fragment);
  purifier().sanitize(fragment, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: attrs,
    ALLOW_DATA_ATTR: false,
    IN_PLACE: true,
  });

  const walker = doc.createTreeWalker(fragment, 0x1 | 0x4 /* SHOW_ELEMENT | SHOW_TEXT */);
  const emptyParagraphs: Element[] = [];
  const listItems: Element[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === 3) {
      if (mode === "render") {
        const t = node.nodeValue || "";
        if (t.includes(" ")) node.nodeValue = softenNbsp(t);
      }
    } else {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      const style = el.getAttribute("style");
      if (style !== null) {
        const kept = filterStyle(style, mode);
        if (kept) el.setAttribute("style", kept);
        else el.removeAttribute("style");
      }
      const cls = el.getAttribute("class");
      if (cls !== null) {
        const kept = filterClass(cls, mode);
        if (kept) el.setAttribute("class", kept);
        else el.removeAttribute("class");
      }
      const list = el.getAttribute("data-list");
      if (list !== null && (tag !== "li" || !KEPT_LIST_TYPES.has(list))) el.removeAttribute("data-list");
      const start = el.getAttribute("start");
      if (start !== null && (tag !== "ol" || !/^\d{1,6}$/.test(start))) el.removeAttribute("start");
      if (tag === "a") {
        const href = safeHttpUrl(el.getAttribute("href"));
        if (href) {
          el.setAttribute("href", href);
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        } else {
          el.removeAttribute("href");
          el.removeAttribute("target");
          el.removeAttribute("rel");
        }
      }
      if (tag === "img") {
        const src = safeHttpUrl(el.getAttribute("src"));
        if (src) el.setAttribute("src", src);
        else {
          // Unlink now, remove after the walk (removing mid-walk skips nodes).
          emptyParagraphs.push(el);
        }
      }
      if (mode === "store" && tag === "p" && !el.firstChild) emptyParagraphs.push(el);
      if (mode === "store" && tag === "li") listItems.push(el);
    }
    node = walker.nextNode();
  }

  if (mode === "paste") {
    // A link's colour on the clipboard is the source's link style, not a choice.
    fragment.querySelectorAll("a [style], a[style]").forEach((el) => {
      const kept = filterStyle((el.getAttribute("style") || "").replace(/(^|;)\s*color\s*:[^;]*/gi, "$1"), mode);
      if (kept) el.setAttribute("style", kept);
      else el.removeAttribute("style");
    });
  }
  if (mode !== "render") {
    // A <span> left with no attribute carries nothing; unwrap it.
    fragment.querySelectorAll("span:not([style]):not([class])").forEach((span) => {
      while (span.firstChild) span.parentNode!.insertBefore(span.firstChild, span);
      span.remove();
    });
  }

  for (const el of emptyParagraphs) {
    if (el.tagName.toLowerCase() === "img") el.remove();
    else el.appendChild(doc.createElement("br"));
  }
  // <li><p>text</p></li> -> <li>text</li>: the shape Quill wrote and every
  // renderer spaces correctly. Only a bare first paragraph is unwrapped.
  for (const li of listItems) {
    const first = li.firstElementChild;
    if (!first || first !== li.firstChild || first.tagName.toLowerCase() !== "p" || first.attributes.length) continue;
    const rest = Array.from(li.children).slice(1);
    if (rest.some((c) => c.tagName.toLowerCase() === "p")) continue;
    const onlyBr = first.childNodes.length === 1 && first.firstChild?.nodeName.toLowerCase() === "br";
    if (onlyBr) {
      first.remove();
      li.insertBefore(doc.createElement("br"), li.firstChild);
      continue;
    }
    while (first.firstChild) li.insertBefore(first.firstChild, first);
    first.remove();
  }

  return fragment.innerHTML;
}

/** True when the HTML has no text a reader would see (and no image). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  if (/<img\b/i.test(html)) return false;
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();
  return text.length === 0;
}
