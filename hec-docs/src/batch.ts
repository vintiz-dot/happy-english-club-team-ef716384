// Batch rendering with a concurrency cap, and the per-run output manifest.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { render, ENGINE_VERSION, type RenderRequest, type RenderResult } from "./render/render.ts";
import { SchemaError, type FieldError } from "./schema.ts";
import { log } from "./log.ts";

export interface BatchJob extends RenderRequest {
  /** Optional caller id, echoed in the manifest. */
  id?: string;
  /** Output file name inside outDir; defaults to the document's own filename. */
  out?: string;
}

export interface JobOutcome {
  ok: boolean;
  id: string;
  result?: RenderResult;
  path?: string;
  error?: { message: string; fields?: FieldError[] };
}

/** Run fn over items with at most `limit` in flight. Order of results = order of items. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Keep a file name inside its directory and legal on Windows and Linux. */
export function safeOutName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/"));
  const cleaned = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/^\.+/, "").trim();
  return cleaned || "document";
}

export async function runOne(job: BatchJob, i: number): Promise<JobOutcome> {
  const id = job.id ?? String(i);
  try {
    const result = await render(job);
    return { ok: true, id, result };
  } catch (err) {
    const e = err as Error;
    log.warn("batch.job_failed", { id, type: job.type, error: e.message });
    return { ok: false, id, error: { message: e.message, fields: err instanceof SchemaError ? err.errors : undefined } };
  }
}

export async function runBatch(jobs: BatchJob[], opts: { concurrency: number; outDir?: string }): Promise<JobOutcome[]> {
  if (opts.outDir) await mkdir(opts.outDir, { recursive: true });
  const used = new Set<string>();
  return mapLimit(jobs, opts.concurrency, async (job, i) => {
    const outcome = await runOne(job, i);
    if (outcome.ok && outcome.result && opts.outDir) {
      let name = safeOutName(job.out ?? outcome.result.filename);
      // Two students can share a name: never overwrite within one run.
      if (used.has(name.toLowerCase())) {
        const ext = path.extname(name);
        let n = 2;
        while (used.has(`${name.slice(0, -ext.length || undefined)} (${n})${ext}`.toLowerCase())) n++;
        name = `${name.slice(0, -ext.length || undefined)} (${n})${ext}`;
      }
      used.add(name.toLowerCase());
      outcome.path = path.join(opts.outDir, name);
      await writeFile(outcome.path, outcome.result.body);
    }
    return outcome;
  });
}

export function manifestOf(outcomes: JobOutcome[]) {
  return {
    engine: `hec-docs@${ENGINE_VERSION}`,
    createdAt: new Date().toISOString(),
    total: outcomes.length,
    failed: outcomes.filter((o) => !o.ok).length,
    documents: outcomes.map((o) =>
      o.ok && o.result
        ? {
            id: o.id,
            ok: true,
            type: o.result.type,
            templateVersion: o.result.templateVersion,
            variant: o.result.variant,
            tenant: o.result.tenant,
            filename: o.result.filename,
            file: o.path ? path.basename(o.path) : undefined,
            contentType: o.result.contentType,
            pages: o.result.pages,
            bytes: o.result.bytes,
            ms: o.result.ms,
            sha256: o.result.sha256,
            warnings: o.result.warnings,
          }
        : { id: o.id, ok: false, error: o.error },
    ),
  };
}

export async function writeManifest(dir: string, outcomes: JobOutcome[]): Promise<string> {
  const file = path.join(dir, "manifest.json");
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(manifestOf(outcomes), null, 2) + "\n");
  return file;
}
