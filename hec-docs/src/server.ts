// HTTP API (node:http, no framework).
//
//   GET  /healthz                      liveness + browser check
//   GET  /v1/templates                 document types, versions, variants
//   POST /v1/render                    one document -> PDF/PNG bytes
//   POST /v1/batch                     many documents -> JSON manifest (+ base64 bodies)
//
// Auth: when HEC_DOCS_API_TOKEN is set, every /v1 call needs
// `Authorization: Bearer <token>`. Idempotency: send `Idempotency-Key`; a
// repeat of the same key with the same body returns the stored result, a
// different body with the same key is a 409. Requests are capped in size,
// renders in concurrency (queue) and time (per job).
import http from "node:http";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { config } from "./config.ts";
import { log } from "./log.ts";
import { render, ENGINE_VERSION, type RenderRequest, type RenderResult } from "./render/render.ts";
import { getBrowser, closeBrowser } from "./render/browser.ts";
import { getRegistry } from "./templates/registry.ts";
import { SchemaError } from "./schema.ts";
import { manifestOf, type JobOutcome } from "./batch.ts";

// ---- concurrency: a small semaphore shared by every request ---------------
let active = 0;
const waiters: (() => void)[] = [];
const MAX_QUEUE = 500;
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= config.concurrency) {
    if (waiters.length >= MAX_QUEUE) throw new HttpError(503, "busy", "render queue is full; retry later");
    await new Promise<void>((r) => waiters.push(r));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new HttpError(504, "timeout", `render exceeded ${ms} ms`)), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

// ---- idempotency store (in memory, TTL) ----------------------------------
interface Stored {
  bodyHash: string;
  at: number;
  result: Promise<{ status: number; headers: Record<string, string>; body: Buffer }>;
}
const idem = new Map<string, Stored>();
function sweepIdem() {
  const now = Date.now();
  for (const [k, v] of idem) if (now - v.at > config.idempotencyTtlMs) idem.delete(k);
}
setInterval(sweepIdem, 60_000).unref();

class HttpError extends Error {
  status: number;
  code: string;
  fields?: unknown;
  constructor(status: number, code: string, message: string, fields?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > config.maxBodyBytes) throw new HttpError(413, "too_large", `body exceeds ${config.maxBodyBytes} bytes`);
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

function parseJson(buf: Buffer): unknown {
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw new HttpError(400, "bad_json", "request body is not valid JSON");
  }
}

function asRequest(v: unknown, where = ""): RenderRequest {
  const fields: { path: string; message: string }[] = [];
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new HttpError(400, "invalid_request", "body must be a JSON object", [{ path: where || "/", message: "must be an object" }]);
  const o = v as Record<string, unknown>;
  const allowed = new Set(["type", "data", "variant", "tenant", "generatedAt", "id", "out"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) fields.push({ path: `${where}/${k}`, message: "is not an allowed field" });
  if (typeof o.type !== "string") fields.push({ path: `${where}/type`, message: "is required (string)" });
  if (!o.data || typeof o.data !== "object" || Array.isArray(o.data)) fields.push({ path: `${where}/data`, message: "is required (object)" });
  for (const k of ["variant", "tenant", "generatedAt", "id"] as const) {
    if (o[k] !== undefined && typeof o[k] !== "string") fields.push({ path: `${where}/${k}`, message: "must be a string" });
  }
  if (fields.length) throw new HttpError(422, "invalid_request", "request does not match the API contract", fields);
  return { type: o.type as string, data: o.data as Record<string, unknown>, variant: o.variant as string | undefined, tenant: o.tenant as string | undefined, generatedAt: o.generatedAt as string | undefined };
}

function authorised(req: http.IncomingMessage): boolean {
  if (!config.apiToken) return true;
  const h = req.headers.authorization ?? "";
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(config.apiToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** RFC 5987 filename* plus an ASCII fallback, so Vietnamese names survive. */
function contentDisposition(filename: string): string {
  const ascii = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function json(status: number, body: unknown) {
  return { status, headers: { "content-type": "application/json; charset=utf-8" }, body: Buffer.from(JSON.stringify(body)) };
}

function documentResponse(r: RenderResult) {
  return {
    status: 200,
    headers: {
      "content-type": r.contentType,
      "content-disposition": contentDisposition(r.filename),
      "x-hec-docs-template": `${r.type}@${r.templateVersion}`,
      "x-hec-docs-variant": r.variant,
      "x-hec-docs-pages": String(r.pages),
      "x-hec-docs-render-ms": String(r.ms),
      "x-hec-docs-sha256": r.sha256,
      ...(r.warnings.length ? { "x-hec-docs-warnings": r.warnings.join(",") } : {}),
    },
    body: r.body,
  };
}

async function handle(req: http.IncomingMessage, _requestId: string) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/healthz") {
    try {
      const b = await withTimeout(getBrowser(), 15_000);
      return json(200, { ok: true, engine: ENGINE_VERSION, browser: b.version(), active, queued: waiters.length });
    } catch (e) {
      return json(503, { ok: false, error: String((e as Error).message) });
    }
  }
  if (!url.pathname.startsWith("/v1/")) throw new HttpError(404, "not_found", "no such route");
  if (!authorised(req)) throw new HttpError(401, "unauthorised", "missing or wrong bearer token");

  if (req.method === "GET" && url.pathname === "/v1/templates") {
    const out = [...(await getRegistry()).values()].map((e) => ({
      type: e.manifest.type,
      version: e.manifest.version,
      title: e.manifest.title,
      output: e.manifest.output,
      defaultVariant: e.manifest.defaultVariant,
      variants: e.manifest.variants,
    }));
    return json(200, { engine: ENGINE_VERSION, templates: out });
  }

  if (req.method !== "POST" || (url.pathname !== "/v1/render" && url.pathname !== "/v1/batch")) {
    throw new HttpError(404, "not_found", "no such route");
  }
  const ct = req.headers["content-type"] ?? "";
  if (!/^application\/json\b/.test(ct)) throw new HttpError(415, "unsupported_media_type", "send application/json");
  const raw = await readBody(req);
  const key = req.headers["idempotency-key"];
  if (key !== undefined && (typeof key !== "string" || !/^[\w.:-]{8,128}$/.test(key))) {
    throw new HttpError(400, "bad_idempotency_key", "Idempotency-Key must be 8-128 chars of [A-Za-z0-9_.:-]");
  }
  const run = async () => {
    const body = parseJson(raw);
    if (url.pathname === "/v1/render") {
      const r = await withSlot(() => withTimeout(render(asRequest(body)), config.jobTimeoutMs));
      return documentResponse(r);
    }
    const jobs = (body as { jobs?: unknown }).jobs;
    if (!Array.isArray(jobs) || jobs.length === 0) throw new HttpError(422, "invalid_request", "jobs must be a non-empty array", [{ path: "/jobs", message: "is required" }]);
    if (jobs.length > config.maxBatch) throw new HttpError(413, "too_many_jobs", `at most ${config.maxBatch} jobs per batch`);
    const reqs = jobs.map((j, i) => ({ ...asRequest(j, `/jobs/${i}`), id: (j as { id?: string }).id ?? String(i) }));
    const outcomes: JobOutcome[] = await Promise.all(
      reqs.map(async (j) => {
        try {
          const result = await withSlot(() => withTimeout(render(j), config.jobTimeoutMs));
          return { ok: true, id: j.id, result };
        } catch (e) {
          return { ok: false, id: j.id, error: { message: (e as Error).message, fields: e instanceof SchemaError ? e.errors : undefined } };
        }
      }),
    );
    const manifest = manifestOf(outcomes);
    const include = url.searchParams.get("include") !== "manifest";
    return json(200, {
      ...manifest,
      documents: manifest.documents.map((d, i) => (include && outcomes[i].ok ? { ...d, base64: outcomes[i].result!.body.toString("base64") } : d)),
    });
  };
  if (typeof key === "string") {
    const bodyHash = createHash("sha256").update(url.pathname).update(raw).digest("hex");
    const scoped = `${req.headers.authorization ?? ""}:${key}`;
    const prior = idem.get(scoped);
    if (prior) {
      if (prior.bodyHash !== bodyHash) throw new HttpError(409, "idempotency_conflict", "this Idempotency-Key was used with a different request");
      const r = await prior.result;
      return { ...r, headers: { ...r.headers, "idempotent-replay": "true" } };
    }
    const result = run();
    idem.set(scoped, { bodyHash, at: Date.now(), result });
    result.catch(() => idem.delete(scoped)); // failures are not cached
    return result;
  }
  return run();
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const requestId = (typeof req.headers["x-request-id"] === "string" && /^[\w-]{1,64}$/.test(req.headers["x-request-id"]) ? req.headers["x-request-id"] : randomUUID());
    const t0 = Date.now();
    let status = 500;
    try {
      const r = await handle(req, requestId);
      status = r.status;
      res.writeHead(r.status, { ...r.headers, "x-request-id": requestId, "cache-control": "no-store", "x-content-type-options": "nosniff" });
      res.end(r.body);
    } catch (e) {
      const err = e instanceof HttpError ? e : e instanceof SchemaError ? new HttpError(422, "invalid_document", e.message, e.errors) : null;
      status = err?.status ?? 500;
      if (!err) log.error("http.error", { requestId, error: (e as Error).stack ?? String(e) });
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store" });
      res.end(JSON.stringify({ error: { code: err?.code ?? "internal", message: err?.message ?? "internal error", fields: err?.fields, requestId } }));
    } finally {
      log.info("http.request", { requestId, method: req.method, path: (req.url ?? "").split("?")[0], status, ms: Date.now() - t0 });
    }
  });
}

const isMain = process.argv[1] && /server\.ts$/.test(process.argv[1]);
if (isMain) {
  const server = createServer();
  server.requestTimeout = config.jobTimeoutMs + 30_000;
  server.listen(config.port, config.host, () => {
    log.info("http.listen", { host: config.host, port: config.port, auth: !!config.apiToken, concurrency: config.concurrency });
    if (!config.apiToken && config.host !== "127.0.0.1" && config.host !== "localhost") {
      log.warn("http.no_auth", { message: "HEC_DOCS_API_TOKEN is not set and the server listens beyond localhost" });
    }
  });
  const stop = async (sig: string) => {
    log.info("http.shutdown", { signal: sig });
    server.close();
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}
