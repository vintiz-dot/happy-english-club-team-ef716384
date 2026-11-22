#!/usr/bin/env node
// Upload the course books' class videos (and later audio) to the school's
// private R2 bucket `hec-files`, under `course-media/<key>`, where the lesson
// decks play them (src/components/lessonDecks/MediaBar.tsx). Google Drive keeps
// its copy as the backup.
//
//   node scripts/upload-course-media.mjs <folder> [<folder> ...]           dry run
//   node scripts/upload-course-media.mjs <folder> [<folder> ...] --apply   upload
//
// The list is the decks' own: every `r2` key with its publisher `file` name in
// src/content/lessonDecks/rh-l3/media.ts. Each file is found by that exact name
// under the folders given (the unpacked publisher downloads on the owner's PC).
//
// Why not through the hec-files Worker: a free Worker takes at most 100 MB per
// request and these files are 140-190 MB. Cloudflare's own CLI (wrangler, the
// copy pinned in hec-files/worker; run `npm ci` there once, then
// `node node_modules/wrangler/bin/wrangler.js login`) writes to R2 directly.
// Who may READ a file is still the database's rule (migration 20261122190000,
// bucket course-media: staff only), asked by the Worker for every link.
//
// --apply, per file: skip it when R2 already holds a byte-identical copy;
// otherwise upload, read it back and compare SHA-256. Any difference stops the
// run. Nothing is ever deleted, in R2 or on Drive.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKER_DIR = join(ROOT, "hec-files", "worker");
const WRANGLER = join(WORKER_DIR, "node_modules", "wrangler", "bin", "wrangler.js");
const BUCKET = "hec-files";
const PREFIX = "course-media/";
const TYPES = { mp4: "video/mp4", mp3: "audio/mpeg", m4a: "audio/mp4" };

/** The decks' list: [{ key, file }] from every `r2: "...", file: "..."` pair in media.ts. */
export function manifest(src = readFileSync(join(ROOT, "src/content/lessonDecks/rh-l3/media.ts"), "utf8")) {
  const out = [...src.matchAll(/r2:\s*"([^"]+)",\s*file:\s*"([^"]+)"/g)].map((m) => ({ key: m[1], file: m[2] }));
  for (const { key } of out) {
    if (!/^[a-z0-9][a-z0-9/_.-]{0,200}\.(mp4|mp3|m4a)$/.test(key) || key.includes("..")) throw new Error(`bad key: ${key}`);
  }
  if (new Set(out.map((x) => x.key)).size !== out.length) throw new Error("two files share one key");
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

const sha256 = (path) => new Promise((ok, no) => {
  const h = createHash("sha256");
  createReadStream(path).on("data", (c) => h.update(c)).on("error", no).on("end", () => ok(h.digest("hex")));
});

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
  const folders = argv.filter((a) => !a.startsWith("--"));
  if (!folders.length || !folders.every((f) => existsSync(f) && statSync(f).isDirectory())) {
    console.error("usage: node scripts/upload-course-media.mjs <folder> [<folder> ...] [--apply]");
    process.exit(2);
  }
  const list = manifest();
  const plan = [];
  for (const { key, file } of list) {
    const hits = findFile(file, folders);
    if (hits.length !== 1) throw new Error(`${file}: found ${hits.length} copies under the folders given (need exactly one)`);
    const size = statSync(hits[0]).size;
    if (size > 300 * 1024 * 1024) throw new Error(`${file}: ${size} bytes is over the bucket's 300 MB`);
    plan.push({ key, file, path: hits[0], size, type: TYPES[key.split(".").pop()] });
  }
  for (const p of plan) console.log(`${(p.size / 1048576).toFixed(1).padStart(7)} MB  ${p.file}  ->  ${PREFIX}${p.key}`);
  if (!apply) {
    console.log(`\nDry run: ${plan.length} files. Add --apply to upload.`);
    return;
  }
  if (!existsSync(WRANGLER)) throw new Error("wrangler is not installed: run `npm ci` in hec-files/worker first");
  const who = wrangler(["whoami"]);
  if (!who.ok || /not authenticated/i.test(who.out)) throw new Error("wrangler is not signed in: run `node node_modules/wrangler/bin/wrangler.js login` in hec-files/worker");

  const scratch = mkdtempSync(join(tmpdir(), "course-media-"));
  try {
    for (const p of plan) {
      const want = await sha256(p.path);
      const have = await remoteSha(p.key, scratch);
      if (have === want) { console.log(`same      ${p.key}`); continue; }
      const put = wrangler(["r2", "object", "put", `${BUCKET}/${PREFIX}${p.key}`, "--remote", `--file=${p.path}`, `--content-type=${p.type}`]);
      if (!put.ok) throw new Error(`upload of ${p.key} failed:\n${put.out}`);
      const back = await remoteSha(p.key, scratch);
      if (back !== want) throw new Error(`${p.key}: R2 holds something else after the upload (${back} vs ${want})`);
      console.log(`uploaded  ${p.key}  (${want.slice(0, 12)}, read back identical)`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  console.log(`\nDone: ${plan.length} files in R2, each read back byte-identical.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
