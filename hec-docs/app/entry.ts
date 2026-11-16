// The HEC Docs engine for the web app (bundled by scripts/build-app-engine.ts
// into the app at src/lib/hecDocs/engine.generated.js).
//
// It does in the user's browser what the Node service does on a server:
// validate the data against the template's JSON Schema, render the template
// (precompiled; same templates, same filters), and finish the PDF that the
// printer Worker sends back. Only printing happens in the cloud.
import nunjucks from "nunjucks/browser/nunjucks-slim.js";
import TEMPLATES from "./generated/templates.js";
import * as VALIDATORS from "./generated/validators.js";
import { MANIFESTS, TENANT, COMPONENT_STYLES, ENGINE_VERSION } from "./generated/data.js";
import { PLUGIN_FILTERS } from "./generated/filters.js";
import { installCore } from "../src/templates/env-core.ts";
import { pick, qrSvgMarkup } from "../src/templates/brand.ts";
import { FILENAME_STRATEGIES } from "../src/filenames.ts";
import { finalize, type PdfMeta } from "../src/render/finalize.ts";

export { ENGINE_VERSION };

export interface FieldError {
  path: string;
  message: string;
}

export class DocumentDataError extends Error {
  readonly errors: FieldError[];
  constructor(subject: string, errors: FieldError[]) {
    super(`${subject}: ${errors.map((e) => `${e.path || "/"} ${e.message}`).join("; ")}`);
    this.name = "DocumentDataError";
    this.errors = errors;
  }
}

interface AjvError {
  instancePath: string;
  keyword: string;
  message?: string;
  params: Record<string, unknown>;
}
type ValidateFn = ((d: unknown) => boolean) & { errors?: AjvError[] | null };

function toFieldErrors(errs: AjvError[] | null | undefined): FieldError[] {
  return (errs ?? []).map((e) => {
    let p = e.instancePath;
    let message = e.message ?? "is invalid";
    if (e.keyword === "required") {
      p += `/${e.params.missingProperty}`;
      message = "is required";
    }
    if (e.keyword === "additionalProperties") {
      p += `/${e.params.additionalProperty}`;
      message = "is not an allowed field";
    }
    return { path: p, message };
  });
}

function getPath(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

let env: nunjucks.Environment | null = null;
let sanitiser: ((html: string) => string) | null = null;

export interface PrepareOptions {
  /** The app's own rich-text cleaner (cleanRichHtml), so printed homework matches the screen. */
  sanitiseRich: (html: string) => string;
  variant?: string;
  /** The "generated on" moment and the PDF dates. Defaults to now. */
  generatedAt?: string;
}

export interface Prepared {
  type: string;
  version: string;
  variant: string;
  html: string;
  filename: string;
  output: "pdf" | "png";
  raster?: { width: number; height: number; scale: number };
  meta: PdfMeta;
}

export const TYPES = Object.keys(MANIFESTS);

/** Validate and render one document to HTML. Throws DocumentDataError on bad data. */
export async function prepare(type: string, data: Record<string, unknown>, opts: PrepareOptions): Promise<Prepared> {
  const manifest = (MANIFESTS as Record<string, (typeof MANIFESTS)[keyof typeof MANIFESTS]>)[type];
  if (!manifest) throw new DocumentDataError("request", [{ path: "/type", message: `unknown document type "${type}"` }]);
  const validate = (VALIDATORS as unknown as Record<string, ValidateFn>)[manifest.validator];
  if (!validate(data)) throw new DocumentDataError(`${type}@${manifest.version}`, toFieldErrors(validate.errors));
  const variant = opts.variant ?? (getPath(data, manifest.variantField) as string | undefined) ?? manifest.defaultVariant;
  if (!(variant in manifest.variants)) throw new DocumentDataError("request", [{ path: "/variant", message: `must be one of: ${Object.keys(manifest.variants).join(", ")}` }]);
  const generatedAt = opts.generatedAt ?? new Date().toISOString();

  if (!env || sanitiser !== opts.sanitiseRich) {
    env = new nunjucks.Environment(new nunjucks.PrecompiledLoader(TEMPLATES), { autoescape: true, throwOnUndefined: true });
    installCore(env, {
      safe: (s) => new nunjucks.runtime.SafeString(s),
      sanitiseRich: opts.sanitiseRich,
      pluginFilters: PLUGIN_FILTERS,
      componentStyles: COMPONENT_STYLES,
      assetBase: "/hec-docs",
    });
    sanitiser = opts.sanitiseRich;
  }
  const key = String(getPath(data, manifest.keyField) ?? JSON.stringify(data));
  const brand = {
    tenant: TENANT,
    encouragement: pick(TENANT.encouragement, `${type}:${key}`),
    qr: new nunjucks.runtime.SafeString(await qrSvgMarkup(TENANT.qr.target)),
  };
  const ctx = {
    data,
    variant,
    brand,
    tenant: TENANT,
    doc: { type, version: manifest.version, title: manifest.title, generatedAt, lang: manifest.lang, engine: ENGINE_VERSION },
  };
  const html = env.render(`${type}/document.njk`, ctx);
  const title = env.render(`__title__/${type}`, ctx).trim();
  return {
    type,
    version: manifest.version,
    variant,
    html,
    filename: FILENAME_STRATEGIES[manifest.filename](data),
    output: manifest.output as "pdf" | "png",
    raster: manifest.raster,
    meta: {
      title,
      lang: manifest.lang,
      author: TENANT.name,
      subject: manifest.title,
      keywords: [manifest.title, TENANT.name],
      creator: `HEC Docs ${ENGINE_VERSION} / ${type}@${manifest.version} (${variant})`,
      date: new Date(generatedAt),
    },
  };
}

/** Pin metadata, language, tags and a content-hash ID on the printed PDF. */
export async function finishPdf(raw: Uint8Array, meta: PdfMeta): Promise<{ pdf: Uint8Array; pages: number }> {
  return finalize(raw, meta);
}
