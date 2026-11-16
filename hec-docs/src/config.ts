// All configuration comes from environment variables. No secrets live here;
// the only secret-like value (HEC_DOCS_API_TOKEN) is read from the env.
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive integer, got "${v}"`);
  return n;
}

export const config = {
  port: int("HEC_DOCS_PORT", 8787),
  host: process.env.HEC_DOCS_HOST ?? "127.0.0.1",
  /** Bearer token required by the HTTP API when set. */
  apiToken: process.env.HEC_DOCS_API_TOKEN ?? "",
  concurrency: int("HEC_DOCS_CONCURRENCY", 4),
  jobTimeoutMs: int("HEC_DOCS_JOB_TIMEOUT_MS", 30_000),
  maxBodyBytes: int("HEC_DOCS_MAX_BODY_BYTES", 5 * 1024 * 1024),
  maxBatch: int("HEC_DOCS_MAX_BATCH", 200),
  idempotencyTtlMs: int("HEC_DOCS_IDEMPOTENCY_TTL_MS", 24 * 3600 * 1000),
  outDir: path.resolve(process.env.HEC_DOCS_OUT_DIR ?? path.join(ROOT, "out")),
  tenantsDir: path.resolve(process.env.HEC_DOCS_TENANTS_DIR ?? path.join(ROOT, "tenants")),
  defaultTenant: process.env.HEC_DOCS_DEFAULT_TENANT ?? "hec",
  logLevel: (process.env.HEC_DOCS_LOG_LEVEL ?? "info") as "debug" | "info" | "warn" | "error",
  chromiumSandbox: (process.env.HEC_DOCS_CHROMIUM_SANDBOX ?? "true") !== "false",
};
