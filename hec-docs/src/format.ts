// Formatting helpers exposed to templates as filters. They wrap Intl directly
// so a template can state exactly the locale and options the original app
// used (e.g. toLocaleDateString("en-US", {year, month: "long", day})) and the
// printed text stays byte-for-byte the same.
import sanitizeHtml from "sanitize-html";

export type DateInput = string | number | Date | null | undefined;

/** Parse like the browser's `new Date(x)`; date-only strings are UTC midnight. */
export function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions, timeZone: string): string {
  const d = toDate(v);
  if (!d) return "";
  return d.toLocaleDateString(locale, { timeZone, ...opts });
}

export function formatDateTime(v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions, timeZone: string): string {
  const d = toDate(v);
  if (!d) return "";
  return d.toLocaleString(locale, { timeZone, ...opts });
}

export function formatNumber(v: unknown, locale: string, opts: Intl.NumberFormatOptions = {}): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(locale, opts).format(n);
}

// ---- Rich text (teacher-authored HTML) -------------------------------------
// Port of src/lib/richText.ts cleanRichHtml (DOMPurify in the browser), so a
// homework prints exactly the content the app shows. Same tag allow-list:
// tables and images are NOT in it, so (as in the app) their text is kept and
// the structure dropped.

const RICH_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "blockquote", "code", "pre", "span", "div", "sub", "sup",
];
const SAFE_STYLE_VALUE = [/^(?!.*!important)(?!.*url\()[#\w\s(),.%-]+$/i];
const KEPT_LIST_TYPES = new Set(["bullet", "ordered", "checked", "unchecked"]);

function filterClass(cls: string): string {
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

export function sanitizeRich(html: string): string {
  if (!html) return "";
  return softenNbsp(sanitizeHtml(html, {
    allowedTags: RICH_TAGS,
    allowedAttributes: { "*": ["href", "class", "style", "data-list"] },
    allowedStyles: {
      "*": {
        color: SAFE_STYLE_VALUE,
        "background-color": SAFE_STYLE_VALUE,
        "font-weight": SAFE_STYLE_VALUE,
        "font-style": SAFE_STYLE_VALUE,
        "text-decoration": SAFE_STYLE_VALUE,
        "text-decoration-line": SAFE_STYLE_VALUE,
        "text-align": SAFE_STYLE_VALUE,
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    // DOMPurify's FORBID_CONTENTS: these disallowed tags lose their text too
    // (notably <thead>, so a pasted table prints without its header row, as
    // it does in the app).
    nonTextTags: [
      "script", "style", "thead", "colgroup", "audio", "video", "svg", "math", "iframe", "noembed",
      "noframes", "noscript", "template", "title", "head", "xmp", "plaintext", "desc", "annotation-xml", "foreignobject",
    ],
    transformTags: {
      "*": (tagName, attribs) => {
        const a = { ...attribs };
        if (a.class !== undefined) {
          const kept = filterClass(a.class);
          if (kept) a.class = kept;
          else delete a.class;
        }
        if (a["data-list"] !== undefined && (tagName !== "li" || !KEPT_LIST_TYPES.has(a["data-list"]))) delete a["data-list"];
        if (tagName !== "a") delete a.href;
        return { tagName, attribs: a };
      },
    },
  }));
}

/**
 * softenNbsp: a single no-break space between two words is a pasted space,
 * not a layout choice. Applied per text run (between tags), like the app's
 * per-text-node walk.
 */
const NBSP_BETWEEN_WORDS = /(\S)\u00a0(?=\S)/g;
function softenNbsp(html: string): string {
  return html.replace(/(^|>)([^<]+)/g, (_, lead: string, text: string) => lead + text.replace(NBSP_BETWEEN_WORDS, "$1 "));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Port of HomeworkPdfDownload.transformLinks: when a link's visible text is
 * not the URL, print " (href)" after it so the address survives on paper.
 * Runs on sanitizer output, where <a> never nests.
 */
export function printLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (whole, attrs: string, inner: string) => {
    const m = /href="([^"]*)"/.exec(attrs);
    const href = m ? decodeEntities(m[1]).trim() : "";
    if (!href) return whole;
    const visible = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();
    if (visible && visible !== href && !visible.includes(href)) {
      return `${whole}<span class="link-href"> (${escapeText(href)})</span>`;
    }
    return whole;
  });
}
