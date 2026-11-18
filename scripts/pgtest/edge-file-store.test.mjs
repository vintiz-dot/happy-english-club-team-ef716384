// Edge functions' file helper (supabase/functions/_lib/file-store.ts) against
// the REAL Worker code: a file with a file_objects row is read and moved in
// R2 (row follows, uploader kept, old copy gone); a file without one is read
// and moved in Supabase as before; a non-service key gets nothing.
import { downloadFile, moveFile } from "../../supabase/functions/_lib/file-store.ts";
import { handle } from "../../hec-files/worker/src/index.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const r2 = new Map();
const R2 = {
  async head(k) { return r2.has(k) ? {} : null; },
  async delete(k) { r2.delete(k); },
  async put(k, body, o) { const b = Buffer.from(await new Response(body).arrayBuffer()); r2.set(k, { b, t: o.httpMetadata.contentType }); return { size: b.length }; },
  async get(k) { const o = r2.get(k); return o && { size: o.b.length, httpEtag: '"e"', body: new Blob([o.b]).stream(), writeHttpMetadata(h) { h.set("Content-Type", o.t); } }; },
};
const env = { FILES: R2, SUPABASE_URL: "https://db", SUPABASE_ANON_KEY: "anon", ALLOWED_ORIGINS: "", ALLOWED_ORIGIN_SUFFIX: "",
  R2_BUCKETS: "student-work", LINK_SECRET: "k".repeat(48) };
// The Worker's call to the database: only the service JWT may run the copier listing.
globalThis.fetch = async (url, init) => String(url).endsWith("/rpc/file_store_copy_list")
  ? (init.headers.Authorization === "Bearer service-jwt" ? Response.json([]) : new Response("{}", { status: 403 }))
  : new Response("{}", { status: 500 });
const net = (url, init = {}) => handle(new Request(String(url), { ...init, duplex: "half" }), env);

// Stand-in service client: file_objects rows + Supabase Storage.
const TEACHER = "22222222-2222-2222-2222-222222222222";
const rows = new Map([["incoming/r2.jpg", { owner: TEACHER, mime_type: "image/jpeg" }]]);
r2.set("student-work/incoming/r2.jpg", { b: Buffer.from("in r2"), t: "image/jpeg" });
const sbFiles = new Map([["incoming/old.jpg", "in supabase"]]);
const moves = [];
const query = (table) => {
  const f = {};
  const q = {
    select: () => q,
    eq: (k, v) => { f[k] = v; return q; },
    maybeSingle: async () => ({ data: rows.get(f.path) ?? null, error: null }),
    insert: async (row) => { if (rows.has(row.path)) return { error: { message: "duplicate key" } }; rows.set(row.path, row); return { error: null }; },
    delete: () => { const d = { eq: (k, v) => { f[k] = v; if (k === "path") rows.delete(v); return d; } }; return d; },
  };
  return q;
};
const sb = {
  from: query,
  storage: { from: () => ({
    download: async (p) => (sbFiles.has(p) ? { data: new Blob([sbFiles.get(p)]), error: null } : { data: null, error: { message: "Object not found" } }),
    move: async (a, b) => { moves.push([a, b]); sbFiles.set(b, sbFiles.get(a)); sbFiles.delete(a); return { data: {}, error: null }; },
  }) },
};
const fs = { serviceKey: "service-jwt", workerUrl: "https://files.example", fetch: net };

console.log("=== reading ===");
eq("a file in R2 is read from R2", await (await downloadFile(sb, fs, "student-work", "incoming/r2.jpg")).text(), "in r2");
eq("a file not copied yet is read from Supabase", await (await downloadFile(sb, fs, "student-work", "incoming/old.jpg")).text(), "in supabase");
ok("a missing file is an error", /storage download failed/.test(await downloadFile(sb, fs, "student-work", "nope.jpg").then(() => "", (e) => e.message)));
ok("a key that is not the service key gets nothing",
  /Not the service key/.test(await downloadFile(sb, { ...fs, serviceKey: "teacher-jwt" }, "student-work", "incoming/r2.jpg").then(() => "", (e) => e.message)));

console.log("=== moving (OCR routes a photo into the child's folder) ===");
await moveFile(sb, fs, "student-work", "incoming/r2.jpg", "students/s1/general/r2.jpg");
eq("the R2 file is at its new path, same bytes and type",
  [r2.get("student-work/students/s1/general/r2.jpg")?.b.toString(), r2.get("student-work/students/s1/general/r2.jpg")?.t], ["in r2", "image/jpeg"]);
ok("and gone from the old one", !r2.has("student-work/incoming/r2.jpg"));
eq("its row moved with it, keeping the uploader", [rows.has("incoming/r2.jpg"), rows.get("students/s1/general/r2.jpg")?.owner], [false, TEACHER]);
await moveFile(sb, fs, "student-work", "incoming/old.jpg", "students/s1/general/old.jpg");
eq("a file still in Supabase is moved by Supabase", moves, [["incoming/old.jpg", "students/s1/general/old.jpg"]]);
rows.set("incoming/clash.jpg", { owner: TEACHER, mime_type: "image/jpeg" });
r2.set("student-work/incoming/clash.jpg", { b: Buffer.from("a"), t: "image/jpeg" });
r2.set("student-work/students/s1/general/clash.jpg", { b: Buffer.from("someone else's"), t: "image/jpeg" });
ok("a move onto an existing file fails and leaves both alone",
  /already there/.test(await moveFile(sb, fs, "student-work", "incoming/clash.jpg", "students/s1/general/clash.jpg").then(() => "", (e) => e.message))
  && r2.get("student-work/students/s1/general/clash.jpg").b.toString() === "someone else's" && rows.has("incoming/clash.jpg"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
