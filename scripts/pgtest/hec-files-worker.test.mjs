// HEC Files Worker: links are signed and checked, every grant comes from the
// database as the caller, uploads are exact and never overwrite.
//
// Runs hec-files/worker/src/index.ts directly (Node strips the types) against
// a stand-in R2 bucket and a stand-in PostgREST that records every call.
import { handle, signLink, pathOk, tokenSubject, READ_SECONDS } from "../../hec-files/worker/src/index.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---- stand-in R2 ----
const store = new Map();
const R2 = {
  async head(k) { return store.has(k) ? { size: store.get(k).bytes.length } : null; },
  async delete(k) { store.delete(k); },
  async put(k, body, opts) {
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    store.set(k, { bytes, type: opts?.httpMetadata?.contentType });
    return { size: bytes.length };
  },
  async get(k, opts) {
    const o = store.get(k);
    if (!o) return null;
    let bytes = o.bytes, range;
    const r = opts?.range?.get?.("Range")?.match(/^bytes=(\d+)-(\d*)$/);
    if (r) {
      const offset = Number(r[1]);
      const end = r[2] ? Number(r[2]) : o.bytes.length - 1;
      range = { offset, length: end - offset + 1 };
      bytes = o.bytes.slice(offset, end + 1);
    }
    return {
      size: o.bytes.length, httpEtag: '"e"', range, body: new Blob([bytes]).stream(),
      writeHttpMetadata(h) { if (o.type) h.set("Content-Type", o.type); },
    };
  },
};

// ---- stand-in PostgREST ----
const calls = [];
let db = { allowedRead: ["classes/c1/a.jpg"], insert: 201, deleteRows: 1 };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  calls.push({ url: u, method: init.method, auth: init.headers.Authorization, body: init.body ? JSON.parse(init.body) : null });
  if (init.headers.Authorization === "Bearer expired") return new Response("{}", { status: 401 });
  if (u.endsWith("/rpc/file_store_copy_list")) {
    // Only the service role may run it: the legacy JWT, or the new secret key as apikey.
    const isService = init.headers.Authorization === "Bearer service-jwt" || init.headers.apikey === "sb_secret_abc";
    return isService ? Response.json([]) : new Response('{"message":"permission denied"}', { status: 403 });
  }
  if (u.endsWith("/rpc/file_access_can_many")) {
    const b = JSON.parse(init.body);
    return Response.json(b._paths.filter((p) => db.allowedRead.includes(p)));
  }
  if (u.includes("/file_objects") && init.method === "POST") return new Response("", { status: db.insert });
  if (u.includes("/file_objects") && init.method === "GET") return Response.json(db.rows ?? []);
  if (u.includes("/file_objects") && init.method === "DELETE") return Response.json(Array.from({ length: db.deleteRows }, () => ({})));
  return new Response("{}", { status: 500 });
};

const SECRET = "x".repeat(40);
const env = {
  FILES: R2, SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon",
  ALLOWED_ORIGINS: "https://user.hanoienglish.com", ALLOWED_ORIGIN_SUFFIX: ".pages.dev",
  R2_BUCKETS: "student-work,homework", LINK_SECRET: SECRET, SERVER_KEY: "s".repeat(40),
};
const jwt = (sub) => `h.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.sig`;
const TEACHER = jwt("22222222-2222-2222-2222-222222222222");
const W = "https://files.example";
const sign = (body, token = TEACHER, extra = {}) => handle(new Request(`${W}/v1/sign`, {
  method: "POST", body: JSON.stringify(body),
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
}), env);

console.log("=== paths ===");
for (const p of ["a.jpg", "classes/c1/a b.jpg", "incoming/ảnh.jpg"]) ok(`fine: ${p}`, pathOk(p));
for (const p of ["", "/a", "a/../b", "a//b", "a\\b", "x".repeat(1025), 5]) ok(`refused: ${String(p).slice(0, 20)}`, !pathOk(p));
eq("token subject is read", tokenSubject(TEACHER), "22222222-2222-2222-2222-222222222222");
eq("a broken token has none", tokenSubject("nonsense"), null);

console.log("=== reading ===");
calls.length = 0;
let r = await sign({ op: "read", bucket: "student-work", paths: ["classes/c1/a.jpg", "classes/c2/b.jpg", "../x"] });
let j = await r.json();
eq("only the paths the database allows get a link", Object.keys(j.urls), ["classes/c1/a.jpg"]);
eq("one database call, as the caller, with only valid paths", calls.map((c) => [c.url.split("/rest/v1/")[1], c.auth, c.body._paths]),
  [["rpc/file_access_can_many", `Bearer ${TEACHER}`, ["classes/c1/a.jpg", "classes/c2/b.jpg"]]]);
store.set("student-work/classes/c1/a.jpg", { bytes: new TextEncoder().encode("0123456789"), type: "image/jpeg" });
r = await handle(new Request(j.urls["classes/c1/a.jpg"]), env);
eq("the link serves the file", [r.status, r.headers.get("Content-Type"), await r.text()], [200, "image/jpeg", "0123456789"]);
r = await handle(new Request(j.urls["classes/c1/a.jpg"], { headers: { Range: "bytes=2-4" } }), env);
eq("a range request gets that part (video seeking)", [r.status, r.headers.get("Content-Range"), await r.text()], [206, "bytes 2-4/10", "234"]);
const url = new URL(j.urls["classes/c1/a.jpg"]);
const other = new URL(url); other.pathname = "/f/student-work/classes/c2/b.jpg";
eq("the same signature on another path is refused", (await handle(new Request(other), env)).status, 403);
const forged = new URL(url); forged.searchParams.set("e", String(Number(url.searchParams.get("e")) + 9999));
eq("a later expiry is refused", (await handle(new Request(forged), env)).status, 403);
r = await handle(new Request(url), env, Date.now() + (READ_SECONDS + 5) * 1000);
eq("an expired link is refused", [r.status, (await r.json()).error], [403, "link expired"]);
eq("a read link cannot upload", (await handle(new Request(url, { method: "PUT", body: "x", headers: { "Content-Length": "1" } }), env)).status, 403);
eq("no token, no link", (await sign({ op: "read", bucket: "student-work", paths: ["a"] }, null)).status, 401);
eq("an expired token is told to sign in again", (await sign({ op: "read", bucket: "student-work", paths: ["classes/c1/a.jpg"] }, "expired")).status, 401);
eq("a bucket not served here is refused", (await sign({ op: "read", bucket: "student-avatars", paths: ["a"] })).status, 400);
eq("more than 200 paths is refused", (await sign({ op: "read", bucket: "student-work", paths: Array.from({ length: 201 }, (_, i) => `p${i}`) })).status, 400);

console.log("=== writing ===");
calls.length = 0;
r = await sign({ op: "write", bucket: "homework", path: "submissions/h/s/1.jpg", size: 5, type: "image/jpeg" });
j = await r.json();
eq("the row is added first, as the caller, owned by them", calls.map((c) => [c.method, c.url.split("/rest/v1/")[1], c.auth, c.body]),
  [["POST", "file_objects", `Bearer ${TEACHER}`, { bucket_id: "homework", path: "submissions/h/s/1.jpg", owner: "22222222-2222-2222-2222-222222222222", size_bytes: 5, mime_type: "image/jpeg" }]]);
const put = (u, body, len = String(body.length)) => handle(new Request(u, { method: "PUT", body, headers: { "Content-Length": len }, duplex: "half" }), env);
eq("a wrong size is refused", (await put(j.url, "1234")).status, 400);
eq("the exact size goes in", (await put(j.url, "12345")).status, 200);
eq("stored with its type", store.get("homework/submissions/h/s/1.jpg").type, "image/jpeg");
eq("the same link cannot overwrite it", (await put(j.url, "abcde")).status, 409);
eq("and the file is unchanged", new TextDecoder().decode(store.get("homework/submissions/h/s/1.jpg").bytes), "12345");
const bigger = new URL(j.url); bigger.searchParams.set("n", "999");
eq("a link edited to a bigger size is refused", (await put(bigger, "x".repeat(999))).status, 403);
db.insert = 403;
eq("the database saying no means no link", (await sign({ op: "write", bucket: "homework", path: "x/y.jpg", size: 1, type: "image/jpeg" })).status, 403);
db.insert = 409;
eq("a path already taken is reported", (await sign({ op: "write", bucket: "homework", path: "x/y.jpg", size: 1, type: "image/jpeg" })).status, 409);
// The PUT that followed the row died (Wi-Fi): the row stands, R2 has nothing. The owner may try again;
// nobody else may, and an object that exists is never overwritten.
const ME = "22222222-2222-2222-2222-222222222222";
db.rows = [{ owner: ME, size_bytes: 1, mime_type: "image/jpeg" }];
r = await sign({ op: "write", bucket: "homework", path: "x/y.jpg", size: 1, type: "image/jpeg" });
j = await r.json();
eq("a row with no object behind it: its owner gets the link again", [r.status, typeof j.url], [200, "string"]);
eq("and the upload goes in", (await put(j.url, "z")).status, 200);
eq("once the object is there, a retry is 409 again", (await sign({ op: "write", bucket: "homework", path: "x/y.jpg", size: 1, type: "image/jpeg" })).status, 409);
db.rows = [{ owner: "33333333-3333-3333-3333-333333333333", size_bytes: 1, mime_type: "image/jpeg" }];
eq("another person's row with no object stays 409", (await sign({ op: "write", bucket: "homework", path: "x/q.jpg", size: 1, type: "image/jpeg" })).status, 409);
db.rows = [{ owner: ME, size_bytes: 2, mime_type: "image/jpeg" }];
eq("own row at another size stays 409", (await sign({ op: "write", bucket: "homework", path: "x/q.jpg", size: 1, type: "image/jpeg" })).status, 409);
db.rows = [];
eq("a row the caller cannot read stays 409", (await sign({ op: "write", bucket: "homework", path: "x/q.jpg", size: 1, type: "image/jpeg" })).status, 409);
db.insert = 201;
eq("over 100 MB is refused before anything is written", (await sign({ op: "write", bucket: "homework", path: "x/z.mp4", size: 101 * 1048576, type: "video/mp4" })).status, 413);

console.log("=== deleting ===");
store.set("homework/a/b.jpg", { bytes: new Uint8Array([1]) });
db.deleteRows = 0;
eq("not allowed: refused and the file stays", [(await sign({ op: "delete", bucket: "homework", path: "a/b.jpg" })).status, store.has("homework/a/b.jpg")], [403, true]);
db.deleteRows = 1;
eq("allowed: the row then the file go", [(await sign({ op: "delete", bucket: "homework", path: "a/b.jpg" })).status, store.has("homework/a/b.jpg")], [200, false]);

console.log("=== edge functions ===");
calls.length = 0;
r = await sign({ op: "read", bucket: "homework", paths: ["any/where.jpg"] }, null, { "x-hec-server-key": env.SERVER_KEY });
eq("the server key gets a link without asking the database", [Object.keys((await r.json()).urls), calls.length], [["any/where.jpg"], 0]);
eq("a wrong server key does not", (await sign({ op: "read", bucket: "homework", paths: ["a.jpg"] }, null, { "x-hec-server-key": "s".repeat(39) + "t" })).status, 401);

console.log("=== the service key (edge functions) ===");
const asService = (token, body) => sign(body, token, { "x-hec-as": "service" });
calls.length = 0;
r = await asService("service-jwt", { op: "read", bucket: "homework", paths: ["any/where.jpg"] });
eq("the service JWT, confirmed by the database, gets a link without the per-file question",
  [Object.keys((await r.json()).urls), calls.map((c) => c.url.split("/rest/v1/")[1])], [["any/where.jpg"], ["rpc/file_store_copy_list"]]);
r = await asService("sb_secret_abc", { op: "read", bucket: "homework", paths: ["x.jpg"] });
eq("so does a new-style secret key, sent as the apikey", Object.keys((await r.json()).urls), ["x.jpg"]);
eq("a teacher's token claiming to be the service is refused", (await asService(TEACHER, { op: "read", bucket: "homework", paths: ["x.jpg"] })).status, 401);
calls.length = 0;
await asService("service-jwt", { op: "write", bucket: "homework", path: "moved/x.jpg", size: 3, type: "image/jpeg" });
eq("a service write records no row itself (the function does)", calls.filter((c) => c.url.includes("file_objects")).length, 0);

console.log("=== set-up and CORS ===");
eq("no LINK_SECRET, nothing served", (await handle(new Request(`${W}/healthz`), { ...env, LINK_SECRET: "" })).status, 500);
r = await handle(new Request(`${W}/v1/sign`, { method: "OPTIONS", headers: { Origin: "https://user.hanoienglish.com" } }), env);
eq("the app's origin may call", r.headers.get("Access-Control-Allow-Origin"), "https://user.hanoienglish.com");
r = await handle(new Request(`${W}/v1/sign`, { method: "OPTIONS", headers: { Origin: "https://evil.example" } }), env);
eq("another origin may not", r.headers.get("Access-Control-Allow-Origin"), null);
const own = await signLink(W, SECRET, "r", "homework", "a b/c.jpg", Date.now());
ok("links encode spaces and still verify", own.includes("/f/homework/a%20b/c.jpg?"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
