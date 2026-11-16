// Nunjucks environment shared by every template. Autoescape is ON: every
// value from input data is HTML-escaped unless a template passes it through
// the `rich` filter (allow-list sanitiser) or an internal helper marks
// generated markup safe (QR SVG). Undefined variables throw, so a renamed
// field fails a test instead of printing nothing.
import nunjucks from "nunjucks";
import path from "node:path";
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { ROOT } from "../config.ts";
import { sanitizeRich } from "../format.ts";
import { installCore } from "./env-core.ts";
import { pick, qrSvgMarkup } from "./brand.ts";
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
  installCore(env, {
    safe: (s) => new nunjucks.runtime.SafeString(s),
    sanitiseRich: sanitizeRich,
    pluginFilters,
    componentStyles: readdirSync(path.join(ROOT, "components", "css")).filter((f) => f.endsWith(".css")).sort(),
    // This service serves fonts, styles and logos at /fonts, /components, /tenant.
    assetBase: "",
  });
  return env;
}

export { pick };

export interface BrandContext {
  tenant: Tenant;
  encouragement: string;
  qr: nunjucks.runtime.SafeString;
}

export async function brandContext(tenant: Tenant, docKey: string): Promise<BrandContext> {
  return { tenant, encouragement: pick(tenant.encouragement, docKey), qr: new nunjucks.runtime.SafeString(await qrSvgMarkup(tenant.qr.target)) };
}
