// The bucket copier (scripts/copy-bucket-to-r2.mjs) against the REAL Worker
// code and a stand-in Supabase: copies exactly, skips what is done, finishes
// a half-done file, never overwrites a different one, and removes a Supabase
// copy only when the R2 copy is byte-for-byte the same.
import { copyBucket, MAX_BYTES } from "../copy-bucket-to-r2.mjs";
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
const SERVER_KEY = "s".repeat(48);
const env = { FILES: R2, SUPABASE_URL: "https://db", SUPABASE_ANON_KEY: "a", ALLOWED_ORIGINS: "", ALLOWED_ORIGIN_SUFFIX: "",
  R2_BUCKETS: "homework", LINK_SECRET: "k".repeat(48), SERVER_KEY };
const worker = (url, init = {}) => handle(new Request(String(url), { ...init, duplex: "half" }), env);

// Stand-in Supabase: Storage objects + file_objects rows.
const TEACHER = "22222222-2222-2222-2222-222222222222";
const objects = new Map([
  ["a/1.jpg", { bytes: Buffer.from("one"), owner: TEACHER, mime: "image/jpeg" }],
  ["a/2.pdf", { bytes: Buffer.from("two-two"), owner: null, owner_id: TEACHER, mime: "application/pdf" }],
  ["b/half.jpg", { bytes: Buffer.from("half"), owner: null, mime: "image/jpeg" }],
  ["b/clash.jpg", { bytes: Buffer.from("mine"), owner: null, mime: "image/jpeg" }],
  ["big.mp4", { bytes: Buffer.from("x"), size: MAX_BYTES + 1, owner: null, mime: "video/mp4" }],
  ["odd//name.jpg", { bytes: Buffer.from("o"), owner: null, mime: "image/jpeg" }],
]);
const rows = new Map();
const removed = [];
const supabase = {
  rpc: async (fn, { _bucket }) => ({
    data: _bucket !== "homework" ? [] : [...objects].map(([name, o]) => ({
      name, owner: o.owner, owner_id: o.owner_id ?? null, size_bytes: o.size ?? o.bytes.length, mime_type: o.mime })),
    error: null,
  }),
  from: (table) => ({
    select: () => ({ eq: () => ({ range: async () => ({ data: [...rows.keys()].map((path) => ({ path })), error: null }) }) }),
    insert: async (row) => {
      if (rows.has(row.path)) return { error: { message: "duplicate key value" } };
      rows.set(row.path, row); return { error: null };
    },
  }),
  storage: { from: () => ({
    download: async (p) => (objects.has(p) ? { data: new Blob([objects.get(p).bytes]), error: null } : { data: null, error: { message: "not found" } }),
    remove: async (ps) => { ps.forEach((p) => { objects.delete(p); removed.push(p); }); return { error: null }; },
  }) },
};
const run = (opts) => copyBucket({ supabase, workerUrl: "https://files.example", serverKey: SERVER_KEY, fetch: worker, bucket: "homework", log: () => {}, ...opts });

// A run that stopped after uploading b/half.jpg but before its row:
r2.set("homework/b/half.jpg", { b: Buffer.from("half"), t: "image/jpeg" });
// And something different already sits under b/clash.jpg:
r2.set("homework/b/clash.jpg", { b: Buffer.from("theirs"), t: "image/jpeg" });

console.log("=== dry run ===");
let t = await run({});
eq("counts what would move, changes nothing", [t.files, t.toCopy, t.copied, rows.size], [6, 4, 0, 0]);
eq("over 100 MB stays on Supabase", t.tooBig.length, 1);
eq("a name R2 will not take stays on Supabase", t.oddName, ["odd//name.jpg"]);

console.log("=== copying ===");
t = await run({ apply: true });
eq("copies the new files and finishes the half-done one", t.copied, 3);
eq("the bytes in R2 are the Supabase bytes", [r2.get("homework/a/1.jpg").b.toString(), r2.get("homework/a/2.pdf").b.toString()], ["one", "two-two"]);
eq("with their types", r2.get("homework/a/2.pdf").t, "application/pdf");
eq("rows carry the uploader (owner, or owner_id when owner is empty)", [rows.get("a/1.jpg").owner, rows.get("a/2.pdf").owner, rows.get("b/half.jpg").owner], [TEACHER, TEACHER, null]);
eq("a different file under the same name is not overwritten, and has no row",
  [t.failed.length, /different file/.test(t.failed[0]), r2.get("homework/b/clash.jpg").b.toString(), rows.has("b/clash.jpg")], [1, true, "theirs", false]);
eq("nothing was removed from Supabase", removed, []);

console.log("=== running again ===");
t = await run({ apply: true });
eq("copied files are skipped", [t.already, t.copied], [3, 0]);

console.log("=== removing Supabase copies ===");
const one = r2.get("homework/a/1.jpg");
r2.set("homework/a/1.jpg", { ...one, b: Buffer.from("ONE") }); // the R2 copy went bad
t = await run({ removeFromSupabase: true });
eq("only byte-identical copies are removed", removed.sort(), ["a/2.pdf", "b/half.jpg"]);
ok("a copy that does not match is kept, and said so", objects.has("a/1.jpg") && /does not match/.test(t.notRemoved.join()));
ok("files never copied are kept", objects.has("b/clash.jpg") && objects.has("big.mp4") && objects.has("odd//name.jpg"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
