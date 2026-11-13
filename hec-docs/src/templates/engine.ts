// Nunjucks environment shared by every template. Autoescape is ON: every
// value from input data is HTML-escaped unless a template passes it through
// the `rich` filter (allow-list sanitiser) or an internal helper marks
// generated markup safe (QR SVG). Undefined variables throw, so a renamed
// field fails a test instead of printing nothing.
import nunjucks from "nunjucks";
import path from "node:path";
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import { ROOT } from "../config.ts";
import { formatDate, formatDateTime, formatNumber, sanitizeRich, printLinks, type DateInput } from "../format.ts";
import type { Tenant } from "../tenant.ts";

// Filter plugins: src/templates/filters/*.ts, each exporting `filters`.
const FILTER_DIR = path.join(ROOT, "src", "templates", "filters");
const pluginFilters: Record<string, (...args: never[]) => unknown> = {};
for (const f of readdirSync(FILTER_DIR).filter((f) => f.endsWith(".ts")).sort()) {
  const mod = (await import(pathToFileURL(path.join(FILTER_DIR, f)).href)) as { filters?: Record<string, (...args: never[]) => unknown> };
  for (const [name, fn] of Object.entries(mod.filters ?? {})) {
    if (name in pluginFilters) throw new Error(`filter "${name}" defined twice (${f})`);
    pluginFilters[name] = fn;
  }
}

export function createEnv(): nunjucks.Environment {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader([path.join(ROOT, "templates"), path.join(ROOT, "components")], { noCache: process.env.NODE_ENV !== "production" }),
    { autoescape: true, throwOnUndefined: true, trimBlocks: true, lstripBlocks: true },
  );
  env.addFilter("date", (v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions = {}, tz?: string) =>
    formatDate(v, locale, opts, tz ?? "Asia/Ho_Chi_Minh"));
  env.addFilter("datetime", (v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions = {}, tz?: string) =>
    formatDateTime(v, locale, opts, tz ?? "Asia/Ho_Chi_Minh"));
  env.addFilter("number", (v: unknown, locale: string, opts?: Intl.NumberFormatOptions) => formatNumber(v, locale, opts));
  env.addFilter("rich", (html: string) => new nunjucks.runtime.SafeString(printLinks(sanitizeRich(html ?? ""))));
  /** Escape a value for use inside a CSS string literal (running headers). */
  env.addFilter("cssstr", (v: unknown) =>
    new nunjucks.runtime.SafeString('"' + String(v ?? "").replace(/[\\"\n\r<>]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ") + '"'));
  env.addFilter("pad", (v: unknown, n: number) => String(v ?? "").padStart(n, "0"));
  for (const [name, fn] of Object.entries(pluginFilters)) env.addFilter(name, fn as (...args: unknown[]) => unknown);
  // Extra generic component stylesheets (components/css/*.css) are linked by
  // every page after hec.css, in name order. Add a component by adding a file.
  env.addGlobal("componentStyles", readdirSync(path.join(ROOT, "components", "css")).filter((f) => f.endsWith(".css")).sort());
  env.addGlobal("range", (a: number, b?: number) => {
    const [s, e] = b === undefined ? [0, a] : [a, b];
    return Array.from({ length: Math.max(0, e - s) }, (_, i) => s + i);
  });
  return env;
}

/** Deterministic pick from a list, keyed on a stable document key. */
export function pick<T>(items: T[], key: string): T {
  const h = createHash("sha256").update(key).digest();
  return items[h.readUInt32BE(0) % items.length];
}

export async function qrSvg(target: string): Promise<nunjucks.runtime.SafeString> {
  // Generated locally; the target comes from tenant config, not input data.
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#14213D", light: "#0000" } });
  return new nunjucks.runtime.SafeString(svg.replace("<svg ", '<svg aria-hidden="true" focusable="false" '));
}

export interface BrandContext {
  tenant: Tenant;
  encouragement: string;
  qr: nunjucks.runtime.SafeString;
}

export async function brandContext(tenant: Tenant, docKey: string): Promise<BrandContext> {
  return { tenant, encouragement: pick(tenant.encouragement, docKey), qr: await qrSvg(tenant.qr.target) };
}
