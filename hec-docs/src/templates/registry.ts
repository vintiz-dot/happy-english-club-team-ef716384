// Document families live in templates/<type>/ with:
//   template.json   manifest (version, variants, output, filename strategy)
//   schema.json     JSON Schema for the input data (versioned via $id)
//   document.njk    the template; variants are blocks chosen by `variant`
//   fixtures/*.json sample inputs used by tests, QA and the contact sheet
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../config.ts";
import { validatorFor, type Validator } from "../schema.ts";

export interface TemplateManifest {
  type: string;
  version: string; // semver
  title: string; // human name, e.g. "Homework"
  description: string;
  output: "pdf" | "png";
  /** Nunjucks expression for the PDF Title metadata, evaluated with the render context. */
  documentTitle: string;
  lang: string;
  /** Data field that selects the variant when no explicit variant is given. */
  variantField: string;
  defaultVariant: string;
  variants: Record<string, { description: string }>;
  filename: string; // strategy name in src/filenames.ts
  /** Field path used as a stable key (encouragement rotation, idempotency). */
  keyField: string;
  /** Labels the new design adds (eyebrows etc.), excluded from text parity. */
  brandStrings?: string[];
  /** PNG only: CSS pixel size of the card and device scale factor. */
  raster?: { width: number; height: number; scale: number };
}

export interface TemplateEntry {
  manifest: TemplateManifest;
  dir: string;
  validate: Validator;
}

const TYPE = /^[a-z][a-z0-9-]{0,39}$/;
let registry: Promise<Map<string, TemplateEntry>> | null = null;

async function load(): Promise<Map<string, TemplateEntry>> {
  const dir = path.join(ROOT, "templates");
  const out = new Map<string, TemplateEntry>();
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || !TYPE.test(e.name)) continue;
    const tdir = path.join(dir, e.name);
    const manifest = JSON.parse(await readFile(path.join(tdir, "template.json"), "utf8")) as TemplateManifest;
    if (manifest.type !== e.name) throw new Error(`templates/${e.name}/template.json declares type "${manifest.type}"`);
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error(`templates/${e.name}: version must be semver`);
    if (!(manifest.defaultVariant in manifest.variants)) throw new Error(`templates/${e.name}: defaultVariant not in variants`);
    const n = Object.keys(manifest.variants).length;
    if (n < 1 || n > 4) throw new Error(`templates/${e.name}: 1-4 variants allowed, found ${n}`);
    out.set(e.name, { manifest, dir: tdir, validate: await validatorFor(path.join(tdir, "schema.json")) });
  }
  return out;
}

export function getRegistry(): Promise<Map<string, TemplateEntry>> {
  registry ??= load().catch((err) => {
    registry = null;
    throw err;
  });
  return registry;
}

export async function getTemplate(type: string): Promise<TemplateEntry | undefined> {
  return (await getRegistry()).get(type);
}

export function getPath(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
