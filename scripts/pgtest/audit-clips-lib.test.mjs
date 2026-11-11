// The browser-side helpers of the audit clip store (src/lib/auditClips.ts,
// which imports nothing): the names the audit folder expects, and that a
// storage path never carries a name.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const src = readFileSync(resolve(repo, "src/lib/auditClips.ts"), "utf8");
ok("imports nothing", !/^\s*import\s/m.test(src));
const out = resolve(tmpdir(), `auditClips.${process.pid}.mjs`);
writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
const L = await import(pathToFileURL(out).href);

eq("export name matches the audit folder", L.exportName("S01", 1, "mp4"), "S01_clip1.mp4");
eq("extension from type", L.extFor("video/quicktime", "x.bin"), "mov");
eq("extension from name when the type is blank", L.extFor("", "Clip.MP4"), "mp4");
ok("accepts video/mp4", L.isAcceptedClip("video/mp4"));
ok("rejects an executable", !L.isAcceptedClip("application/x-msdownload"));
ok("rejects a blank type", !L.isAcceptedClip(""));
eq("path is code + id, no name", L.storagePathFor("S07", "0a1b", "mp4"), "S07/0a1b.mp4");
ok("expired only after the day has passed",
  L.isExpired("2026-11-10", "2026-11-11") && !L.isExpired("2026-11-11", "2026-11-11") && !L.isExpired(null, "2026-11-11"));
eq("key file is sorted and tab separated",
  L.keyFileText([{ code: "S02", name: "An" }, { code: "S01", name: "Minh" }]), "S01\tMinh\nS02\tAn\n");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
