#!/usr/bin/env node
// Shrink the photos already stored, in place - in Supabase Storage AND in R2.
//
// New uploads are shrunk in the browser (src/lib/shrinkPhoto.ts). This does
// the same for what is already stored, in every bucket: each JPEG, PNG or
// WebP of 400 KB or more is resized to 2000 px on the long edge and saved
// again IN THE SAME FORMAT under the SAME path (JPEG quality 82, WebP 80,
// PNG lossless), so nothing that points at it changes. A file is replaced
// only when the new one is at least 20% smaller.
//
// Where a file is in both places (copied to R2, Supabase copy not yet
// removed), each copy is shrunk on its own. The result is byte-identical for
// identical originals, so the copier's --remove-from-supabase check still
// matches.
//
// SAFE BY DEFAULT
//   - Without --apply it only reports what it would save.
//   - With --apply every original is first saved on this PC
//     (~/.hec-photo-backup/<date>/<supabase|r2>/<bucket>/<path>), and every
//     new file is read back and checked.
//   - An R2 file is replaced by deleting it and writing the new one; if the
//     write fails, the original is put back at once from the backup.
//   - Run it again and it skips what it already shrank.
//   - Do not run it while scripts/copy-bucket-to-r2.mjs is copying the same
//     bucket.
//
// USE (in a terminal, from the repo)
//   npm install --no-save sharp
//   set, in THIS terminal only (Supabase > Project Settings > API):
//     PowerShell: $env:SUPABASE_URL="https://....supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."
//   The R2 Worker's server key is read from ~/.hec-files/server-key.txt.
//   node scripts/shrink-stored-photos.mjs            (dry run, every bucket)
//   node scripts/shrink-stored-photos.mjs --apply
//   options: --bucket homework,student-work   --backup-dir D:\photo-backup
//
// To undo one file: put the copy from the backup folder back at the same path.
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_EDGE = 2000;
export const MIN_BYTES = 400 * 1024;
export const MIN_SAVING = 0.2;
const SHRINKABLE = /^image\/(jpeg|jpg|png|webp)$/i;
const mb = (n) => (n / 1048576).toFixed(1) + " MB";

/** sharp, keeping the format: JPEG stays JPEG, PNG stays PNG, WebP stays WebP. */
export function sharpShrinker(sharp) {
  return async (bytes, type) => {
    const img = sharp(bytes).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    if (/png/i.test(type)) return img.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    if (/webp/i.test(type)) return img.webp({ quality: 80 }).toBuffer();
    return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  };
}

/**
 * Everything it talks to is passed in, so scripts/pgtest/shrink-stored.test.mjs
 * runs it against the real Worker code with a stand-in Supabase.
 */
export async function shrinkStored({
  supabase, workerUrl, serverKey, fetch: f = fetch, shrink, buckets, apply = false,
  backupDir, save = async (p, b) => { await mkdir(dirname(p), { recursive: true }); await writeFile(p, b); },
  log = console.log,
}) {
  const worker = async (body) => {
    const r = await f(`${workerUrl}/v1/sign`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-hec-server-key": serverKey }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Worker said ${r.status}`);
    return j;
  };
  const r2Read = async (bucket, path) => {
    const { urls } = await worker({ op: "read", bucket, paths: [path] });
    const r = await f(urls[path]);
    if (!r.ok) throw new Error(`R2 read ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  };
  const r2Write = async (bucket, path, bytes, type) => {
    const { url } = await worker({ op: "write", bucket, path, size: bytes.length, type });
    const r = await f(url, { method: "PUT", body: bytes, headers: { "Content-Type": type, "Content-Length": String(bytes.length) } });
    if (!r.ok) throw new Error(`R2 write ${r.status}: ${(await r.json().catch(() => ({}))).error ?? ""}`);
  };

  const t = { looked: 0, chosen: 0, before: 0, after: 0, failed: [] };
  for (const bucket of buckets) {
    // Supabase copies.
    const { data: sbList, error: e1 } = await supabase.rpc("file_store_copy_list", { _bucket: bucket });
    if (e1) throw new Error(`Listing ${bucket}: ${e1.message}`);
    // R2 copies.
    const r2List = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("file_objects").select("path, size_bytes, mime_type")
        .eq("bucket_id", bucket).range(from, from + 999);
      if (error) throw new Error(`file_objects ${bucket}: ${error.message}`);
      r2List.push(...data);
      if (data.length < 1000) break;
    }
    const jobs = [
      ...sbList.map((o) => ({ place: "supabase", path: o.name, size: Number(o.size_bytes), type: o.mime_type ?? "" })),
      ...r2List.map((o) => ({ place: "r2", path: o.path, size: Number(o.size_bytes), type: o.mime_type ?? "" })),
    ];
    for (const j of jobs) {
      t.looked++;
      if (!SHRINKABLE.test(j.type) || j.size < MIN_BYTES) continue;
      const where = `${j.place}:${bucket}/${j.path}`;
      try {
        let original;
        if (j.place === "supabase") {
          const { data, error } = await supabase.storage.from(bucket).download(j.path);
          if (error || !data) throw new Error(`download: ${error?.message ?? "nothing"}`);
          original = Buffer.from(await data.arrayBuffer());
        } else {
          original = await r2Read(bucket, j.path);
        }
        const smaller = Buffer.from(await shrink(original, j.type));
        if (smaller.length > original.length * (1 - MIN_SAVING)) continue;
        t.chosen++; t.before += original.length; t.after += smaller.length;
        if (!apply) { log(`  would shrink ${where}: ${mb(original.length)} -> ${mb(smaller.length)}`); continue; }

        const backup = join(backupDir, j.place, bucket, ...j.path.split("/"));
        await save(backup, original);

        if (j.place === "supabase") {
          const { error } = await supabase.storage.from(bucket).upload(j.path, smaller, { upsert: true, contentType: j.type, cacheControl: "3600" });
          if (error) throw new Error(`upload: ${error.message}`);
          const { data: check } = await supabase.storage.from(bucket).download(j.path);
          if (!check || check.size !== smaller.length) throw new Error(`read back ${check?.size} bytes, wrote ${smaller.length}`);
        } else {
          await worker({ op: "delete", bucket, path: j.path });
          try {
            await r2Write(bucket, j.path, smaller, j.type);
          } catch (e) {
            await r2Write(bucket, j.path, original, j.type); // put the original straight back
            throw e;
          }
          const back = await r2Read(bucket, j.path);
          if (!back.equals(smaller)) throw new Error("R2 read back differs");
          const { error } = await supabase.from("file_objects").update({ size_bytes: smaller.length })
            .eq("bucket_id", bucket).eq("path", j.path);
          if (error) throw new Error(`file_objects size: ${error.message}`);
        }
        log(`  shrank ${where}: ${mb(original.length)} -> ${mb(smaller.length)}`);
      } catch (e) {
        t.failed.push(`${where}: ${e.message}`);
        log(`  FAILED ${where}: ${e.message}`);
      }
    }
  }
  return t;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const apply = args.includes("--apply");
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this terminal first (see the top of this file)."); process.exit(2); }
  let sharp;
  try { sharp = (await import("sharp")).default; } catch { console.error("sharp is not installed. Run: npm install --no-save sharp"); process.exit(2); }
  let serverKey = process.env.HEC_FILES_SERVER_KEY;
  if (!serverKey) {
    try { serverKey = (await readFile(join(homedir(), ".hec-files", "server-key.txt"), "utf8")).trim(); }
    catch { console.error("No Worker server key: ~/.hec-files/server-key.txt is missing."); process.exit(2); }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let buckets = opt("bucket")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!buckets) {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) { console.error(`Could not list buckets: ${error.message}`); process.exit(2); }
    buckets = data.map((b) => b.id);
  }
  const backupDir = opt("backup-dir") ?? join(homedir(), ".hec-photo-backup", new Date().toISOString().slice(0, 10));
  console.log(`${apply ? "SHRINKING" : "DRY RUN (nothing is changed)"} - buckets: ${buckets.join(", ")}`);
  if (apply) console.log(`Originals are saved to ${backupDir}`);
  const t = await shrinkStored({
    supabase, workerUrl: process.env.HEC_FILES_URL ?? "https://hec-files.vintizfjes.workers.dev", serverKey,
    shrink: sharpShrinker(sharp), buckets, apply, backupDir,
  });
  console.log(`\n${t.looked} files looked at, ${t.chosen} ${apply ? "shrunk" : "would be shrunk"}: ${mb(t.before)} -> ${mb(t.after)} (saves ${mb(t.before - t.after)})${t.failed.length ? `, ${t.failed.length} failed` : ""}`);
  if (t.failed.length) console.log(`  ${t.failed.join("\n  ")}`);
  if (!apply && t.chosen) console.log("Run again with --apply to do it.");
  process.exit(t.failed.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
