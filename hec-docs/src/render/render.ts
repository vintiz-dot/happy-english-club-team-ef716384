// The one entry point: (type, data, options) -> validated, rendered document.
// Used by the CLI, the HTTP API, the tests and the QA script alike.
import { performance } from "node:perf_hooks";
import path from "node:path";
import { createHash } from "node:crypto";
import { config, ROOT } from "../config.ts";
import { log } from "../log.ts";
import { loadTenant } from "../tenant.ts";
import { SchemaError } from "../schema.ts";
import { filenameFor } from "../filenames.ts";
import { createEnv, brandContext } from "../templates/engine.ts";
import { getTemplate, getRegistry, getPath } from "../templates/registry.ts";
import { renderPdf } from "./pdf.ts";
import { renderPng } from "./png.ts";
import type { AssetMount } from "./browser.ts";

export const ENGINE_VERSION = "1.0.0";

export interface RenderRequest {
  type: string;
  data: Record<string, unknown>;
  variant?: string;
  tenant?: string;
  /**
   * The "generated on" moment. Pinned so output is reproducible; defaults
   * to now. Also written as the PDF CreationDate/ModDate.
   */
  generatedAt?: string;
}

export interface RenderResult {
  type: string;
  templateVersion: string;
  variant: string;
  tenant: string;
  filename: string;
  contentType: "application/pdf" | "image/png";
  body: Buffer;
  pages: number;
  bytes: number;
  ms: number;
  sha256: string;
  warnings: string[];
  /** Reading-order text of the rendered HTML (QA parity). */
  text: string;
}

const env = createEnv();

export async function renderHtml(req: RenderRequest) {
  const entry = await getTemplate(req.type);
  if (!entry) {
    const known = [...(await getRegistry()).keys()].join(", ");
    throw new SchemaError("request", [{ path: "/type", message: `unknown document type "${req.type}" (known: ${known})` }]);
  }
  const { manifest } = entry;
  entry.validate(req.data, `${req.type}@${manifest.version}`);
  const variant = req.variant ?? (getPath(req.data, manifest.variantField) as string | undefined) ?? manifest.defaultVariant;
  if (!(variant in manifest.variants)) {
    throw new SchemaError("request", [{ path: "/variant", message: `must be one of: ${Object.keys(manifest.variants).join(", ")}` }]);
  }
  const tenant = await loadTenant(req.tenant ?? config.defaultTenant);
  const generatedAt = req.generatedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new SchemaError("request", [{ path: "/generatedAt", message: "must be an ISO 8601 date-time" }]);
  }
  const key = String(getPath(req.data, manifest.keyField) ?? JSON.stringify(req.data));
  const brand = await brandContext(tenant, `${req.type}:${key}`);
  const ctx = {
    data: req.data,
    variant,
    brand,
    tenant,
    doc: { type: req.type, version: manifest.version, title: manifest.title, generatedAt, lang: manifest.lang, engine: ENGINE_VERSION },
  };
  const html = env.render(`${req.type}/document.njk`, ctx);
  const title = env.renderString(manifest.documentTitle, ctx).trim();
  return { entry, manifest, variant, tenant, html, title, generatedAt };
}

export async function render(req: RenderRequest): Promise<RenderResult> {
  const t0 = performance.now();
  const { manifest, variant, tenant, html, title, generatedAt } = await renderHtml(req);
  const mounts: AssetMount[] = [
    { prefix: "/fonts/", dir: path.join(ROOT, "fonts") },
    { prefix: "/components/", dir: path.join(ROOT, "components") },
    { prefix: "/tenant/", dir: tenant.dir },
  ];
  let body: Buffer;
  let pages = 1;
  let text = "";
  const warnings: string[] = [];
  if (manifest.output === "png") {
    const r = await renderPng({ html, mounts, raster: manifest.raster ?? { width: 600, height: 800, scale: 2 }, timeoutMs: config.jobTimeoutMs });
    body = r.png;
    text = r.text;
    warnings.push(...r.overflow.map((o) => `overflow:${o}`));
  } else {
    const r = await renderPdf({
      html,
      mounts,
      timeoutMs: config.jobTimeoutMs,
      meta: {
        title,
        lang: manifest.lang,
        author: tenant.name,
        subject: manifest.title,
        keywords: [manifest.title, tenant.name],
        creator: `HEC Docs ${ENGINE_VERSION} / ${req.type}@${manifest.version} (${variant})`,
        date: new Date(generatedAt),
      },
    });
    body = r.pdf;
    text = r.text;
    pages = r.pages;
    warnings.push(...r.overflow.map((o) => `overflow:${o}`));
  }
  const ms = Math.round(performance.now() - t0);
  const result: RenderResult = {
    type: req.type,
    templateVersion: manifest.version,
    variant,
    tenant: tenant.id,
    filename: filenameFor(manifest.filename, req.data),
    contentType: manifest.output === "png" ? "image/png" : "application/pdf",
    body,
    pages,
    bytes: body.length,
    ms,
    sha256: createHash("sha256").update(body).digest("hex"),
    warnings,
    text,
  };
  if (result.bytes > 1.5 * 1024 * 1024) warnings.push("size>1.5MB");
  if (ms > 3000) warnings.push("time>3s");
  log.info("render.done", { type: req.type, variant, tenant: tenant.id, pages, bytes: result.bytes, ms, warnings });
  return result;
}
