#!/usr/bin/env node
// Copy one Supabase Storage bucket into R2 (the hec-files Worker), and later
// remove the Supabase copies to free the space.
//
// SAFE BY DEFAULT
//   - Without a flag it only reports: how many files, how many MB, how many
//     are already copied, which cannot move (over 100 MB, odd names).
//   - --apply copies. Each file goes to R2 first; only once it is stored is
//     its file_objects row written, so a row means "copied". Run it as often
//     as you like: copied files are skipped, a half-finished one is checked
//     byte for byte and finished.
//   - --remove-from-supabase deletes a Supabase copy ONLY after reading the
//     R2 copy back and finding it byte-for-byte identical. Nothing else is
//     ever deleted. Do this last, after the app has read the bucket from R2
//     for a while (src/lib/files.ts, R2_BUCKETS).
//
// THE ORDER FOR A BUCKET
//   1. node scripts/copy-bucket-to-r2.mjs homework --apply
//   2. switch the app: add the bucket to R2_BUCKETS in src/lib/files.ts, push
//   3. run step 1 again (catches files uploaded to Supabase in between)
//   4. some days later: node scripts/copy-bucket-to-r2.mjs homework --remove-from-supabase
//
// USE: set, in THIS terminal only (Supabase > Project Settings > API):
//     PowerShell: $env:SUPABASE_URL="https://....supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."
//   The Worker's server key is read from ~/.hec-files/server-key.txt
//   (or HEC_FILES_SERVER_KEY). Needs migration 20261118090000 applied.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_BYTES = 100 * 1024 * 1024; // the Worker's upload limit (free plan)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mb = (n) => (n / 1048576).toFixed(1) + " MB";
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

export function pathMovable(p) {
  return typeof p === "string" && p.length >= 1 && p.length <= 1024 && !p.startsWith("/")
    && !p.includes("..") && !p.includes("//") && !/[\u0000-\u001f\\]/.test(p);
}

/**
 * Copy (and optionally clear) one bucket. Everything it talks to is passed in,
 * so scripts/pgtest/copy-bucket.test.mjs runs it against the real Worker code.
 */
export async function copyBucket({ supabase, workerUrl, serverKey, fetch: f = fetch, bucket, apply = false, removeFromSupabase = false, log = console.log }) {
  const worker = async (body) => {
    const r = await f(`${workerUrl}/v1/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hec-server-key": serverKey },
      body: JSON.stringify({ bucket, ...body }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Worker said ${r.status}`);
    return j;
  };
  const fromSupabase = async (path) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) throw new Error(`Supabase download: ${error?.message ?? "nothing"}`);
    return Buffer.from(await data.arrayBuffer());
  };
  const fromR2 = async (path) => {
    const { urls } = await worker({ op: "read", paths: [path] });
    if (!urls[path]) return null;
    const r = await f(urls[path]);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`R2 read ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  };

  const { data: listed, error: listErr } = await supabase.rpc("file_store_copy_list", { _bucket: bucket });
  if (listErr) throw new Error(`Listing ${bucket}: ${listErr.message} (is migration 20261118090000 applied?)`);

  const copied = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("file_objects").select("path").eq("bucket_id", bucket).range(from, from + 999);
    if (error) throw new Error(`Reading file_objects: ${error.message}`);
    data.forEach((r) => copied.add(r.path));
    if (data.length < 1000) break;
  }

  const t = { files: listed.length, bytes: 0, already: 0, toCopy: 0, toCopyBytes: 0, copied: 0, tooBig: [], oddName: [], failed: [], removed: 0, removedBytes: 0, notRemoved: [] };
  for (const o of listed) {
    t.bytes += Number(o.size_bytes);
    if (copied.has(o.name)) { t.already++; continue; }
    if (!pathMovable(o.name)) { t.oddName.push(o.name); continue; }
    if (Number(o.size_bytes) > MAX_BYTES) { t.tooBig.push(`${o.name} (${mb(o.size_bytes)})`); continue; }
    t.toCopy++; t.toCopyBytes += Number(o.size_bytes);
    if (!apply) continue;
    try {
      const bytes = await fromSupabase(o.name);
      const type = o.mime_type || "application/octet-stream";
      let stored = false;
      try {
        const { url } = await worker({ op: "write", path: o.name, size: bytes.length, type });
        const r = await f(url, { method: "PUT", body: bytes, headers: { "Content-Type": type, "Content-Length": String(bytes.length) } });
        if (r.status === 409) stored = false;
        else if (!r.ok) throw new Error(`R2 upload ${r.status}: ${(await r.json().catch(() => ({}))).error ?? ""}`);
        else stored = true;
      } catch (e) {
        if (!/already there/.test(e.message)) throw e;
      }
      if (!stored) {
        // A run stopped between the upload and the row: check what is there.
        const there = await fromR2(o.name);
        if (!there || sha(there) !== sha(bytes)) throw new Error("a different file is already in R2 under this name");
      }
      const owner = o.owner ?? (UUID.test(o.owner_id ?? "") ? o.owner_id : null);
      const { error } = await supabase.from("file_objects").insert({ bucket_id: bucket, path: o.name, owner, size_bytes: bytes.length, mime_type: type });
      if (error && !/duplicate key/.test(error.message)) throw new Error(`file_objects: ${error.message}`);
      copied.add(o.name);
      t.copied++;
      log(`  copied ${bucket}/${o.name} (${mb(bytes.length)})`);
    } catch (e) {
      t.failed.push(`${o.name}: ${e.message}`);
      log(`  FAILED ${bucket}/${o.name}: ${e.message}`);
    }
  }

  if (removeFromSupabase) {
    for (const o of listed) {
      if (!copied.has(o.name)) continue;
      try {
        const [here, there] = [await fromSupabase(o.name), await fromR2(o.name)];
        if (!there || sha(there) !== sha(here)) { t.notRemoved.push(`${o.name}: the R2 copy does not match`); continue; }
        const { error } = await supabase.storage.from(bucket).remove([o.name]);
        if (error) throw new Error(error.message);
        t.removed++; t.removedBytes += here.length;
        log(`  removed from Supabase ${bucket}/${o.name}`);
      } catch (e) {
        t.notRemoved.push(`${o.name}: ${e.message}`);
      }
    }
  }
  return t;
}

async function main() {
  const args = process.argv.slice(2);
  const bucket = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const removeFromSupabase = args.includes("--remove-from-supabase");
  if (!bucket) { console.error("Which bucket? e.g. node scripts/copy-bucket-to-r2.mjs homework --apply"); process.exit(2); }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this terminal first (see the top of this file)."); process.exit(2); }
  let serverKey = process.env.HEC_FILES_SERVER_KEY;
  if (!serverKey) {
    try { serverKey = readFileSync(join(homedir(), ".hec-files", "server-key.txt"), "utf8").trim(); }
    catch { console.error("No Worker server key: ~/.hec-files/server-key.txt is missing and HEC_FILES_SERVER_KEY is not set."); process.exit(2); }
  }
  const workerUrl = process.env.HEC_FILES_URL ?? "https://hec-files.vintizfjes.workers.dev";
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`${bucket}: ${apply ? "COPYING" : removeFromSupabase ? "REMOVING VERIFIED SUPABASE COPIES" : "DRY RUN (nothing is changed)"}`);
  const t = await copyBucket({ supabase, workerUrl, serverKey, bucket, apply, removeFromSupabase });
  console.log(`\n${t.files} files, ${mb(t.bytes)} in Supabase. Already in R2: ${t.already}.`);
  console.log(`${apply ? "Copied" : "To copy"}: ${apply ? t.copied : t.toCopy} (${mb(t.toCopyBytes)}).`);
  if (t.tooBig.length) console.log(`Over 100 MB, staying on Supabase: ${t.tooBig.join(", ")}`);
  if (t.oddName.length) console.log(`Names R2 will not take, staying on Supabase: ${t.oddName.join(", ")}`);
  if (removeFromSupabase) console.log(`Removed from Supabase: ${t.removed} (${mb(t.removedBytes)})${t.notRemoved.length ? `; kept ${t.notRemoved.length}: ${t.notRemoved.join("; ")}` : ""}`);
  if (t.failed.length) console.log(`FAILED ${t.failed.length}; run again to retry:\n  ${t.failed.join("\n  ")}`);
  process.exit(t.failed.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
