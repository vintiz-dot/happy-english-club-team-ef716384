// Filters and globals shared by the Node service (engine.ts) and the web
// app's engine bundle (app/entry.ts). Pure: the caller supplies the Nunjucks
// environment, its SafeString, and the rich-text sanitiser of its platform.
import { formatDate, formatDateTime, formatNumber, printLinks, type DateInput } from "../format-core.ts";

type Fn = (...args: never[]) => unknown;
interface EnvLike {
  addFilter(name: string, fn: (...args: never[]) => unknown): unknown;
  addGlobal(name: string, value: unknown): unknown;
}

export interface CoreOptions {
  safe: (s: string) => unknown; // nunjucks.runtime.SafeString
  sanitiseRich: (html: string) => string;
  pluginFilters: Record<string, Fn>;
  componentStyles: string[];
  /** Prefix for fonts, styles and the tenant logo: "" in the service, "/hec-docs" in the app. */
  assetBase: string;
}

export function installCore(env: EnvLike, o: CoreOptions): void {
  env.addFilter("date", ((v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions = {}, tz?: string) =>
    formatDate(v, locale, opts, tz ?? "Asia/Ho_Chi_Minh")) as Fn);
  env.addFilter("datetime", ((v: DateInput, locale: string, opts: Intl.DateTimeFormatOptions = {}, tz?: string) =>
    formatDateTime(v, locale, opts, tz ?? "Asia/Ho_Chi_Minh")) as Fn);
  env.addFilter("number", ((v: unknown, locale: string, opts?: Intl.NumberFormatOptions) => formatNumber(v, locale, opts)) as Fn);
  env.addFilter("rich", ((html: string) => o.safe(printLinks(o.sanitiseRich(html ?? "")))) as Fn);
  /** Escape a value for use inside a CSS string literal (running headers). */
  env.addFilter("cssstr", ((v: unknown) =>
    o.safe('"' + String(v ?? "").replace(/[\\"\n\r<>]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ") + '"')) as Fn);
  env.addFilter("pad", ((v: unknown, n: number) => String(v ?? "").padStart(n, "0")) as Fn);
  for (const [name, fn] of Object.entries(o.pluginFilters)) env.addFilter(name, fn);
  env.addGlobal("assetBase", o.assetBase);
  // Extra component stylesheets (components/css/*.css), linked after hec.css in name order.
  env.addGlobal("componentStyles", o.componentStyles);
  env.addGlobal("range", (a: number, b?: number) => {
    const [s, e] = b === undefined ? [0, a] : [a, b];
    return Array.from({ length: Math.max(0, e - s) }, (_, i) => s + i);
  });
}
