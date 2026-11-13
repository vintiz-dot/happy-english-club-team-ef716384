import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.HEC_DOCS_SILENT = "1";
process.env.HEC_DOCS_API_TOKEN = "test-token-123";
const { createServer } = await import("../../src/server.ts");
const { closeBrowser } = await import("../../src/render/browser.ts");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fx = JSON.parse(await readFile(path.join(ROOT, "templates", "homework", "fixtures", "standard.json"), "utf8"));
const fixture = { data: fx.data, generatedAt: fx.generatedAt };
const server = createServer();
let base = "";
const auth = { authorization: "Bearer test-token-123", "content-type": "application/json" };

before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.close();
  await closeBrowser();
});

test("GET /healthz reports the browser", async () => {
  const r = await fetch(`${base}/healthz`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.match(j.browser, /^\d+\./);
});

test("/v1 requires the bearer token", async () => {
  assert.equal((await fetch(`${base}/v1/templates`)).status, 401);
  assert.equal((await fetch(`${base}/v1/templates`, { headers: { authorization: "Bearer wrong" } })).status, 401);
  const ok = await fetch(`${base}/v1/templates`, { headers: auth });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).templates.some((t: { type: string }) => t.type === "homework"));
});

test("POST /v1/render returns the PDF with its filename (UTF-8 safe)", async () => {
  const r = await fetch(`${base}/v1/render`, { method: "POST", headers: auth, body: JSON.stringify({ type: "homework", ...fixture }) });
  assert.equal(r.status, 200, await r.clone().text());
  assert.equal(r.headers.get("content-type"), "application/pdf");
  assert.match(r.headers.get("content-disposition")!, /filename\*=UTF-8''Unit_6__My_Weekend/);
  assert.equal(r.headers.get("x-hec-docs-template"), "homework@1.0.0");
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
});

test("invalid documents are 422 with field-level errors", async () => {
  const r = await fetch(`${base}/v1/render`, { method: "POST", headers: auth, body: JSON.stringify({ type: "homework", data: { homework: { id: "x" } } }) });
  assert.equal(r.status, 422);
  const j = await r.json();
  assert.equal(j.error.code, "invalid_document");
  assert.ok(j.error.fields.some((f: { path: string }) => f.path === "/homework/title"));
});

test("request contract: bad JSON 400, wrong media type 415, unknown field 422", async () => {
  assert.equal((await fetch(`${base}/v1/render`, { method: "POST", headers: auth, body: "{" })).status, 400);
  assert.equal((await fetch(`${base}/v1/render`, { method: "POST", headers: { ...auth, "content-type": "text/plain" }, body: "{}" })).status, 415);
  const r = await fetch(`${base}/v1/render`, { method: "POST", headers: auth, body: JSON.stringify({ type: "homework", data: {}, html: "<script>" }) });
  assert.equal(r.status, 422);
  assert.ok((await r.json()).error.fields.some((f: { path: string }) => f.path === "/html"));
});

test("Idempotency-Key replays the same result and refuses a different body", async () => {
  const key = `test-${Date.now()}`;
  const body = JSON.stringify({ type: "homework", ...fixture });
  const a = await fetch(`${base}/v1/render`, { method: "POST", headers: { ...auth, "idempotency-key": key }, body });
  const b = await fetch(`${base}/v1/render`, { method: "POST", headers: { ...auth, "idempotency-key": key }, body });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(b.headers.get("idempotent-replay"), "true");
  assert.equal(a.headers.get("x-hec-docs-sha256"), b.headers.get("x-hec-docs-sha256"));
  const c = await fetch(`${base}/v1/render`, { method: "POST", headers: { ...auth, "idempotency-key": key }, body: JSON.stringify({ type: "homework", ...fixture, variant: "prompt-card" }) });
  assert.equal(c.status, 409);
});

test("POST /v1/batch renders jobs and reports per-job errors", async () => {
  const r = await fetch(`${base}/v1/batch`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ jobs: [{ id: "ok", type: "homework", ...fixture }, { id: "bad", type: "homework", data: {} }] }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.total, 2);
  assert.equal(j.failed, 1);
  assert.equal(j.documents[0].id, "ok");
  assert.ok(Buffer.from(j.documents[0].base64, "base64").subarray(0, 5).toString() === "%PDF-");
  assert.equal(j.documents[1].ok, false);
});
