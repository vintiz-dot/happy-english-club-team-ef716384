#!/usr/bin/env node
// Upload the course books' class videos (and later audio) to the school's
// private R2 bucket `hec-files`, under `course-media/<key>`, where the lesson
// decks play them (src/components/lessonDecks/MediaBar.tsx). Google Drive keeps
// its copy as the backup.
//
//   node scripts/upload-course-media.mjs <folder> [<folder> ...]   dry run, files from local folders
//   node scripts/upload-course-media.mjs --from-drive               dry run, files from the Drive backup
//   ... add --apply to upload. With --from-drive, --keep=<folder> keeps the downloads.
//
// The list is the decks' own: every video in src/content/lessonDecks/rh-l3/media.ts
// with its `driveId`, `r2` key, publisher `file` name, `sha256` and `bytes`.
// A local copy is found by that exact file name under the folders given; a
// Drive copy is downloaded by its id. Either way it must match the recorded
// SHA-256 and size of the publisher's original, or the run stops: a copy that
// differs is never uploaded.
//
// Why not through the hec-files Worker: a free Worker takes at most 100 MB per
// request and these files are 137-179 MB. Cloudflare's own CLI (wrangler, the
// copy pinned in hec-files/worker; run `npm ci` there once, then
// `node node_modules/wrangler/bin/wrangler.js login`) writes to R2 directly.
// Who may READ a file is still the database's rule (migration 20261122190000,
// bucket course-media: staff only), asked by the Worker for every link.
//
// --apply, per file: skip it when R2 already holds the original (same SHA-256);
// otherwise upload, read it back and compare. Any difference stops the run.
// Nothing is ever deleted, in R2 or on Drive.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKER_DIR = join(ROOT, "hec-files", "worker");
const WRANGLER = join(WORKER_DIR, "node_modules", "wrangler", "bin", "wrangler.js");
const BUCKET = "hec-files";
const PREFIX = "course-media/";
const TYPES = { mp4: "video/mp4", mp3: "audio/mpeg", m4a: "audio/mp4" };
const driveUrl = (id) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

/** The decks' list from media.ts: [{ driveId, key, file, sha256, bytes }]. */
export function manifest(src = readFileSync(join(ROOT, "src/content/lessonDecks/rh-l3/media.ts"), "utf8")) {
  const re = /driveId:\s*"([A-Za-z0-9_-]{20,})",\s*r2:\s*"([^"]+)",\s*file:\s*"([^"]+)",\s*sha256:\s*"([0-9a-f]{64})",\s*bytes:\s*(\d+)/g;
  const out = [...src.matchAll(re)].map((m) => ({ driveId: m[1], key: m[2], file: m[3], sha256: m[4], bytes: Number(m[5]) }));
  for (const { key } of out) {
    if (!/^[a-z0-9][a-z0-9/_.-]{0,200}\.(mp4|mp3|m4a)$/.test(key) || key.includes("..")) throw new Error(`bad key: ${key}`);
  }
  if (new Set(out.map((x) => x.key)).size !== out.length) throw new Error("two files share one key");
  if (out.length === 0) throw new Error("no media with r2, file, sha256 and bytes found in media.ts");
  return out;
}

function findFile(name, folders) {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name === name) hits.push(p);
    }
  };
  for (const f of folders) walk(f);
  return hits;
}

export const sha256 = (path) => new Promise((ok, no) => {
  const h = createHash("sha256");
  createReadStream(path).on("data", (c) => h.update(c)).on("error", no).on("end", () => ok(h.digest("hex")));
});

/** Download a Drive file by id to `dest`. Drive answers a page instead of the file when sharing is off. */
export async function fromDrive(id, dest) {
  const r = await fetch(driveUrl(id), { redirect: "follow" });
  if (!r.ok || !r.body) throw new Error(`Drive answered ${r.status} for ${id} (is the file shared "Anyone with the link"?)`);
  if (/text\/html/i.test(r.headers.get("content-type") ?? "")) throw new Error(`Drive sent a page, not the file, for ${id} (sharing off, or Drive's download limit)`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(dest));
}

function wrangler(args) {
  const r = spawnSync(process.execPath, [WRANGLER, ...args], { cwd: WORKER_DIR, encoding: "utf8", maxBuffer: 1 << 24 });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** SHA-256 of what R2 holds at the key, or null when there is nothing there. */
async function remoteSha(key, scratch) {
  const local = join(scratch, "readback");
  rmSync(local, { force: true });
  const r = wrangler(["r2", "object", "get", `${BUCKET}/${PREFIX}${key}`, "--remote", `--file=${local}`]);
  if (!r.ok) {
    if (/not found|does not exist|NoSuchKey|10007/i.test(r.out)) return null;
    throw new Error(`reading ${key} back failed:\n${r.out}`);
  }
  const sum = await sha256(local);
  rmSync(local, { force: true });
  return sum;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const drive = argv.includes("--from-drive");
  const keepArg = argv.find((a) => a.startsWith("--keep="));
  const folders = argv.filter((a) => !a.startsWith("--"));
  if (drive ? folders.length > 0 : (!folders.length || !folders.every((f) => existsSync(f) && statSync(f).isDirectory()))) {
    console.error("usage: node scripts/upload-course-media.mjs (<folder> ... | --from-drive [--keep=<folder>]) [--apply]");
    process.exit(2);
  }
  const list = manifest();
  const total = list.reduce((n, x) => n + x.bytes, 0);
  for (const x of list) console.log(`${(x.bytes / 1048576).toFixed(1).padStart(7)} MB  ${x.file}  ->  ${PREFIX}${x.key}`);
  console.log(`${list.length} files, ${(total / 1048576).toFixed(0)} MB, from ${drive ? "the Google Drive backup" : folders.join(", ")}`);

  // Where each original comes from; a local copy is checked now, a Drive one when it arrives.
  const work = keepArg ? resolve(keepArg.slice(7)) : mkdtempSync(join(tmpdir(), "course-media-"));
  if (keepArg) mkdirSync(work, { recursive: true });
  const source = {};
  if (!drive) {
    for (const x of list) {
      const hits = findFile(x.file, folders);
      if (hits.length !== 1) throw new Error(`${x.file}: found ${hits.length} copies under the folders given (need exactly one)`);
      source[x.key] = hits[0];
    }
  }
  if (!apply) {
    console.log("\nDry run. Add --apply to upload (each copy is checked against the original first).");
    if (!keepArg) rmSync(work, { recursive: true, force: true });
    return;
  }
  if (!existsSync(WRANGLER)) throw new Error("wrangler is not installed: run `npm ci` in hec-files/worker first");
  const who = wrangler(["whoami"]);
  if (!who.ok || /not authenticated/i.test(who.out)) throw new Error("wrangler is not signed in: run `node node_modules/wrangler/bin/wrangler.js login` in hec-files/worker");

  const scratch = mkdtempSync(join(tmpdir(), "course-media-readback-"));
  try {
    for (const x of list) {
      if ((await remoteSha(x.key, scratch)) === x.sha256) { console.log(`same      ${x.key}`); continue; }
      let path = source[x.key];
      if (drive) {
        path = join(work, x.file);
        if (!existsSync(path) || statSync(path).size !== x.bytes) {
          process.stdout.write(`download  ${x.file} ... `);
          await fromDrive(x.driveId, path);
          console.log("done");
        }
      }
      const size = statSync(path).size;
      const sum = await sha256(path);
      if (size !== x.bytes || sum !== x.sha256) {
        throw new Error(`${x.file}: this copy is not the original (${size} bytes, ${sum.slice(0, 12)}; want ${x.bytes}, ${x.sha256.slice(0, 12)})`);
      }
      const put = wrangler(["r2", "object", "put", `${BUCKET}/${PREFIX}${x.key}`, "--remote", `--file=${path}`, `--content-type=${TYPES[x.key.split(".").pop()]}`]);
      if (!put.ok) throw new Error(`upload of ${x.key} failed:\n${put.out}`);
      const back = await remoteSha(x.key, scratch);
      if (back !== x.sha256) throw new Error(`${x.key}: R2 holds something else after the upload (${back} vs ${x.sha256})`);
      console.log(`uploaded  ${x.key}  (read back identical to the original)`);
      if (drive && !keepArg) rmSync(path, { force: true });
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    if (!keepArg) rmSync(work, { recursive: true, force: true });
  }
  console.log(`\nDone: ${list.length} files in R2, each identical to the publisher's original.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
