// The app's file helper (src/lib/fileStore.ts) against the REAL Worker code
// (hec-files/worker/src/index.ts) and a stand-in Supabase: a bucket not in
// R2 goes to Supabase untouched; a bucket in R2 goes through the Worker; a
// file not copied yet falls back to Supabase.
import { makeFileStore } from "../../src/lib/fileStore.ts";
import { handle } from "../../hec-files/worker/src/index.ts";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// Stand-in R2 + PostgREST for the Worker.
const r2 = new Map();
const R2 = {
  async head(k) { return r2.has(k) ? {} : null; },
  async delete(k) { r2.delete(k); },
  async put(k, body, o) { const b = new Uint8Array(await new Response(body).arrayBuffer()); r2.set(k, { b, t: o.httpMetadata.contentType }); return { size: b.length }; },
  async get(k) { const o = r2.get(k); return o && { size: o.b.length, httpEtag: '"e"', body: new Blob([o.b]).stream(), writeHttpMetadata(h) { h.set("Content-Type", o.t); } }; },
};
const rows = new Set(); // file_objects
const env = {
  FILES: R2, SUPABASE_URL: "https://db", SUPABASE_ANON_KEY: "anon", ALLOWED_ORIGINS: "", ALLOWED_ORIGIN_SUFFIX: "",
  R2_BUCKETS: "homework", LINK_SECRET: "k".repeat(40),
};
const W = "https://files.example";
const worker = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://db/")) {
    const b = init.body ? JSON.parse(init.body) : null;
    if (u.endsWith("rpc/file_access_can_many")) return Response.json(b._paths.filter((p) => rows.has(p) && !p.startsWith("secret/")));
    if (init.method === "POST") { if (rows.has(b.path)) return new Response("", { status: 409 }); rows.add(b.path); return new Response("", { status: 201 }); }
    if (init.method === "DELETE") { const p = decodeURIComponent(u.split("path=eq.")[1]); const had = rows.delete(p); return Response.json(had ? [{}] : []); }
  }
  // A browser sends a Blob with its Content-Length; an in-process Request does not.
  const headers = new Headers(init.headers ?? {});
  if (init.body instanceof Blob) headers.set("Content-Length", String(init.body.size));
  return handle(new Request(u, { ...init, headers, duplex: "half" }), env);
};
globalThis.fetch = worker; // the Worker's own calls to the database

// Stand-in Supabase Storage.
const sb = new Map([["homework/old/kept.jpg", "old"], ["student-work/a.jpg", "sw"]]);
const log = [];
const supabase = {
  auth: { getSession: async () => ({ data: { session: { access_token: "h.eyJzdWIiOiJ1MSJ9.s" } } }) },
  storage: {
    from: (bucket) => ({
      upload: async (p, body, o) => { log.push(["sb.upload", bucket, p, o.upsert]); sb.set(`${bucket}/${p}`, await body.text()); return { data: {}, error: null }; },
      createSignedUrls: async (ps) => { log.push(["sb.sign", bucket, ps]); return { data: ps.filter((p) => sb.has(`${bucket}/${p}`)).map((p) => ({ path: p, signedUrl: `sb://${bucket}/${p}` })), error: null }; },
      download: async (p) => ({ data: new Blob([sb.get(`${bucket}/${p}`)]), error: null }),
      remove: async (ps) => { log.push(["sb.remove", bucket, ps]); ps.forEach((p) => sb.delete(`${bucket}/${p}`)); return { data: {}, error: null }; },
    }),
  },
};
const files = makeFileStore({ supabase, workerUrl: W, r2Buckets: new Set(["homework"]), fetch: worker });

console.log("=== a bucket still in Supabase ===");
eq("links come from Supabase", await files.signedUrls("student-work", ["a.jpg"]), { "a.jpg": "sb://student-work/a.jpg" });
await files.upload("student-work", "b.jpg", new Blob(["x"], { type: "image/jpeg" }));
eq("uploads go to Supabase, never overwriting", log.at(-1), ["sb.upload", "student-work", "b.jpg", false]);
eq("downloads come from Supabase", await (await files.download("student-work", "a.jpg")).text(), "sw");

console.log("=== a bucket in R2 ===");
await files.upload("homework", "new/1.jpg", new Blob(["hello"], { type: "image/jpeg" }));
eq("the upload lands in R2 with its type", [new TextDecoder().decode(r2.get("homework/new/1.jpg").b), r2.get("homework/new/1.jpg").t], ["hello", "image/jpeg"]);
ok("and not in Supabase", !sb.has("homework/new/1.jpg"));
let err = await files.upload("homework", "new/1.jpg", new Blob(["again"])).then(() => null, (e) => e.message);
eq("a second upload to the same path is refused", err, "A file with that name is already there");
const urls = await files.signedUrls("homework", ["new/1.jpg", "old/kept.jpg", "nowhere.jpg"]);
ok("an R2 file gets a Worker link", urls["new/1.jpg"]?.startsWith(`${W}/f/homework/new/1.jpg?`));
eq("a file not copied yet falls back to Supabase", urls["old/kept.jpg"], "sb://homework/old/kept.jpg");
ok("a file nowhere gets no link", !("nowhere.jpg" in urls));
eq("download reads the R2 copy", await (await files.download("homework", "new/1.jpg")).text(), "hello");
rows.add("secret/x.jpg"); r2.set("homework/secret/x.jpg", { b: new Uint8Array([1]), t: "image/jpeg" });
eq("a file the database refuses gets no link", await files.signedUrls("homework", ["secret/x.jpg"]), {});
await files.remove("homework", ["new/1.jpg"]);
ok("remove takes the R2 file and its row", !r2.has("homework/new/1.jpg") && !rows.has("new/1.jpg"));
await files.remove("homework", ["old/kept.jpg"]);
ok("remove of a file only in Supabase removes it there", !sb.has("homework/old/kept.jpg"));
const many = Array.from({ length: 450 }, (_, i) => `bulk/${i}.jpg`);
many.forEach((p) => { rows.add(p); r2.set(`homework/${p}`, { b: new Uint8Array([1]), t: "image/jpeg" }); });
eq("450 links are fetched in batches the Worker accepts", Object.keys(await files.signedUrls("homework", many)).length, 450);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
