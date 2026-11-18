// The stored-photo shrinker (scripts/shrink-stored-photos.mjs) against the
// REAL Worker code and a stand-in Supabase: both places are shrunk in place,
// formats are kept, originals are backed up first, R2 rows learn the new
// size, and a failed R2 write puts the original straight back.
import { shrinkStored, sharpShrinker, MIN_BYTES } from "../shrink-stored-photos.mjs";
import { handle } from "../../hec-files/worker/src/index.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const big = (ch) => Buffer.alloc(MIN_BYTES + 1000, ch);
let failPutFor = null;
const r2 = new Map();
const R2 = {
  async head(k) { return r2.has(k) ? {} : null; },
  async delete(k) { r2.delete(k); },
  async put(k, body, o) {
    const b = Buffer.from(await new Response(body).arrayBuffer());
    if (k === failPutFor) { failPutFor = null; return { size: -1 }; } // a cut-short upload, once
    r2.set(k, { b, t: o.httpMetadata.contentType }); return { size: b.length };
  },
  async get(k) { const o = r2.get(k); return o && { size: o.b.length, httpEtag: '"e"', body: new Blob([o.b]).stream(), writeHttpMetadata(h) { h.set("Content-Type", o.t); } }; },
};
const KEY = "s".repeat(48);
const env = { FILES: R2, SUPABASE_URL: "https://db", SUPABASE_ANON_KEY: "a", ALLOWED_ORIGINS: "", ALLOWED_ORIGIN_SUFFIX: "",
  R2_BUCKETS: "homework", LINK_SECRET: "k".repeat(48), SERVER_KEY: KEY };
const net = (url, init = {}) => handle(new Request(String(url), { ...init, duplex: "half" }), env);

// Supabase: homework/a.jpg in both places, b.png only in Supabase, c.jpg only
// in R2, a small photo, a PDF, and a photo that will not shrink enough.
const sb = new Map([
  ["a.jpg", { b: big(1), t: "image/jpeg" }], ["b.png", { b: big(2), t: "image/png" }],
  ["small.jpg", { b: Buffer.alloc(1000, 3), t: "image/jpeg" }], ["doc.pdf", { b: big(4), t: "application/pdf" }],
  ["stubborn.jpg", { b: big(5), t: "image/jpeg" }],
]);
r2.set("homework/a.jpg", { b: big(1), t: "image/jpeg" });
r2.set("homework/c.jpg", { b: big(6), t: "image/jpeg" });
r2.set("homework/r2fail.webp", { b: big(7), t: "image/webp" });
const rows = new Map([
  ["a.jpg", { path: "a.jpg", size_bytes: MIN_BYTES + 1000, mime_type: "image/jpeg" }],
  ["c.jpg", { path: "c.jpg", size_bytes: MIN_BYTES + 1000, mime_type: "image/jpeg" }],
  ["r2fail.webp", { path: "r2fail.webp", size_bytes: MIN_BYTES + 1000, mime_type: "image/webp" }],
]);
const supabase = {
  rpc: async (_fn, { _bucket }) => ({ data: [...sb].map(([name, o]) => ({ name, size_bytes: o.b.length, mime_type: o.t })), error: null }),
  from: () => {
    const f = {};
    const q = {
      select: () => q, eq: (k, v) => { f[k] = v; return q; },
      range: async () => ({ data: [...rows.values()], error: null }),
      update: (patch) => { const u = { eq: (k, v) => { f[k] = v; if (k === "path") Object.assign(rows.get(v), patch); return u; }, then: (r) => r({ error: null }) }; return u; },
    };
    return q;
  },
  storage: { from: () => ({
    download: async (p) => ({ data: new Blob([sb.get(p).b]), error: null }),
    upload: async (p, body, o) => { sb.set(p, { b: Buffer.from(body), t: o.contentType }); return { error: null }; },
  }) },
};
// Stand-in shrinker: a quarter of the size, except "stubborn" (5) which shrinks only 10%.
const shrink = async (b) => b[0] === 5 ? b.subarray(0, Math.floor(b.length * 0.9)) : b.subarray(0, Math.floor(b.length / 4));
const saved = new Map();
const run = (apply) => shrinkStored({ supabase, workerUrl: "https://w", serverKey: KEY, fetch: net, shrink, buckets: ["homework"],
  apply, backupDir: "/backup", save: async (p, b) => saved.set(p.replace(/\\/g, "/"), Buffer.from(b)), log: () => {} });

console.log("=== dry run ===");
let t = await run(false);
eq("finds the five big photos across both places, changes nothing",
  [t.chosen, sb.get("a.jpg").b.length, r2.get("homework/c.jpg").b.length, saved.size], [5, MIN_BYTES + 1000, MIN_BYTES + 1000, 0]);

console.log("=== applying ===");
failPutFor = "homework/r2fail.webp";
t = await run(true);
const q = Math.floor((MIN_BYTES + 1000) / 4);
eq("the Supabase copies are shrunk in place, type kept", [sb.get("a.jpg").b.length, sb.get("b.png").b.length, sb.get("b.png").t], [q, q, "image/png"]);
eq("the R2 copies are shrunk in place, type kept", [r2.get("homework/a.jpg").b.length, r2.get("homework/c.jpg").b.length, r2.get("homework/c.jpg").t], [q, q, "image/jpeg"]);
ok("both copies of a.jpg end up byte-identical (the copier's removal check still matches)", sb.get("a.jpg").b.equals(r2.get("homework/a.jpg").b));
eq("R2 rows learn the new size", [rows.get("a.jpg").size_bytes, rows.get("c.jpg").size_bytes], [q, q]);
eq("every original was backed up before it was replaced",
  [...saved.keys()].sort(), ["/backup/r2/homework/a.jpg", "/backup/r2/homework/c.jpg", "/backup/r2/homework/r2fail.webp", "/backup/supabase/homework/a.jpg", "/backup/supabase/homework/b.png"]);
ok("a cut-short R2 write puts the original straight back, and is reported",
  r2.get("homework/r2fail.webp")?.b.equals(big(7)) && rows.get("r2fail.webp").size_bytes === MIN_BYTES + 1000 && t.failed.length === 1);
eq("small photos, PDFs and photos that barely shrink are left alone",
  [sb.get("small.jpg").b.length, sb.get("doc.pdf").b.length, sb.get("stubborn.jpg").b.length], [1000, MIN_BYTES + 1000, MIN_BYTES + 1000]);

console.log("=== running again ===");
saved.clear();
t = await run(true);
eq("what was shrunk is skipped; only the one that failed is tried again", [t.chosen, t.failed.length, saved.size], [1, 0, 1]);

console.log("=== formats ===");
const calls = [];
const fakeSharp = () => { const c = { rotate: () => c, resize: () => c, png: (o) => (calls.push(["png", o]), c), webp: (o) => (calls.push(["webp", o]), c), jpeg: (o) => (calls.push(["jpeg", o]), c), toBuffer: async () => Buffer.alloc(1) }; return c; };
const s = sharpShrinker(fakeSharp);
await s(Buffer.alloc(1), "image/png"); await s(Buffer.alloc(1), "image/webp"); await s(Buffer.alloc(1), "image/jpeg");
eq("PNG stays PNG (lossless), WebP stays WebP, JPEG stays JPEG", calls.map((c) => c[0]), ["png", "webp", "jpeg"]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
