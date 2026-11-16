// Formatting helpers exposed to templates as filters. They wrap Intl directly
// so a template can state exactly the locale and options the original app
// used (e.g. toLocaleDateString("en-US", {year, month: "long", day})) and the
// printed text stays byte-for-byte the same.
// Pure: no Node or browser APIs, so the web app's engine bundle shares it.
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
