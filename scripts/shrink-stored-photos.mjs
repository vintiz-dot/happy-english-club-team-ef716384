#!/usr/bin/env node
// Shrink the photos already in Supabase Storage, in place.
//
// New uploads are shrunk in the browser (src/lib/shrinkPhoto.ts). This does
// the same for what is already stored: every JPEG of 400 KB or more is
// resized to 2000 px on the long edge at quality 82, under the SAME path, so
// nothing that points at it changes. A photo is replaced only when the new
// one is at least 20% smaller.
//
// SAFE BY DEFAULT
//   - Without --apply it only reports what it would save.
//   - With --apply every original is first saved to a backup folder on this
//     PC (default ~/.hec-photo-backup/<date>/<bucket>/<path>), and the new
//     file is read back and checked before the script moves on.
//   - Run it again and it skips what it already shrank (those are small now).
//
// USE (in a terminal, from the repo)
//   npm install --no-save sharp
//   set the two values from Supabase > Project Settings > API, in THIS
//   terminal only, never in a file:
//     PowerShell: $env:SUPABASE_URL="https://....supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."
//   node scripts/shrink-stored-photos.mjs            (dry run)
//   node scripts/shrink-stored-photos.mjs --apply    (do it)
//   options: --bucket student-work,homework   --backup-dir D:\photo-backup
//
// To undo one file: upload the copy from the backup folder to the same path.
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const MAX_EDGE = 2000;
const QUALITY = 82;
const MIN_BYTES = 400 * 1024;
const MIN_SAVING = 0.2;
const DEFAULT_BUCKETS = ["student-work", "homework", "lesson-resources"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const APPLY = flag("apply");
const BUCKETS = (opt("bucket") ?? DEFAULT_BUCKETS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const BACKUP = opt("backup-dir") ?? join(homedir(), ".hec-photo-backup", new Date().toISOString().slice(0, 10));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this terminal first (see the top of this file).");
  process.exit(2);
}
let sharp;
try { sharp = (await import("sharp")).default; }
catch { console.error("sharp is not installed. Run: npm install --no-save sharp"); process.exit(2); }

const supabase = createClient(url, key, { auth: { persistSession: false } });
const mb = (n) => (n / 1048576).toFixed(1) + " MB";

/** Every object under a bucket, walking folders. */
async function* walk(bucket, prefix = "") {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) yield* walk(bucket, path);
      else yield { path, size: e.metadata?.size ?? 0, type: e.metadata?.mimetype ?? "" };
    }
    if (data.length < 1000) return;
  }
}

let seen = 0, chosen = 0, before = 0, after = 0, failed = 0;
console.log(`${APPLY ? "SHRINKING" : "DRY RUN (nothing is changed)"} - buckets: ${BUCKETS.join(", ")}`);
if (APPLY) console.log(`Originals are saved to ${BACKUP}`);

for (const bucket of BUCKETS) {
  for await (const obj of walk(bucket)) {
    seen++;
    if (!/^image\/jpe?g$/i.test(obj.type) || obj.size < MIN_BYTES) continue;
    try {
      const { data: blob, error } = await supabase.storage.from(bucket).download(obj.path);
      if (error) throw error;
      const original = Buffer.from(await blob.arrayBuffer());
      const smaller = await sharp(original)
        .rotate() // apply the phone's orientation before EXIF is dropped
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
      if (smaller.length > original.length * (1 - MIN_SAVING)) continue;
      chosen++; before += original.length; after += smaller.length;
      if (!APPLY) { console.log(`  would shrink ${bucket}/${obj.path}: ${mb(original.length)} -> ${mb(smaller.length)}`); continue; }

      const backupPath = join(BACKUP, bucket, ...obj.path.split("/"));
      await mkdir(dirname(backupPath), { recursive: true });
      await writeFile(backupPath, original);

      const { error: upErr } = await supabase.storage.from(bucket)
        .upload(obj.path, smaller, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: check, error: checkErr } = await supabase.storage.from(bucket).download(obj.path);
      if (checkErr) throw checkErr;
      if (check.size !== smaller.length) throw new Error(`read back ${check.size} bytes, wrote ${smaller.length}`);
      console.log(`  shrank ${bucket}/${obj.path}: ${mb(original.length)} -> ${mb(smaller.length)}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${bucket}/${obj.path}: ${e.message ?? e}`);
    }
  }
}

console.log(`\n${seen} files looked at, ${chosen} ${APPLY ? "shrunk" : "would be shrunk"}: ${mb(before)} -> ${mb(after)} (saves ${mb(before - after)})${failed ? `, ${failed} failed` : ""}`);
if (!APPLY && chosen) console.log("Run again with --apply to do it.");
process.exit(failed ? 1 : 0);
