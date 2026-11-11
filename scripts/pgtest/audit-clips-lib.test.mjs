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

eq("youtube: watch link", L.parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=4s"), "dQw4w9WgXcQ");
eq("youtube: short link", L.parseYoutubeId("https://youtu.be/dQw4w9WgXcQ?si=abc"), "dQw4w9WgXcQ");
eq("youtube: shorts and embed",
  [L.parseYoutubeId("youtube.com/shorts/dQw4w9WgXcQ"), L.parseYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")],
  ["dQw4w9WgXcQ", "dQw4w9WgXcQ"]);
eq("youtube: not YouTube's host", L.parseYoutubeId("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
eq("youtube: lookalike host", L.parseYoutubeId("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"), null);
eq("youtube: bad id and junk",
  [L.parseYoutubeId("https://youtu.be/short"), L.parseYoutubeId("not a url"), L.parseYoutubeId("")], [null, null, null]);
eq("embed uses the no-cookie host", L.youtubeEmbedUrl("dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
eq("current classes: ended, future, duplicate and unnamed enrolments are left out", L.currentClassNames([
  { start_date: "2026-01-01", end_date: null, class_name: "Stars" },
  { start_date: "2026-01-01", end_date: "2026-06-30", class_name: "Moons" },
  { start_date: "2027-01-01", end_date: null, class_name: "Suns" },
  { start_date: "2026-09-01", end_date: "2026-11-11", class_name: "Stars" },
  { start_date: "2026-01-01", end_date: null, class_name: null },
], "2026-11-11"), ["Stars"]);

eq("progress: empty queue is 0%", L.overallProgress([]), { percent: 0, total: 0, done: 0, active: 0, failed: 0 });
eq("progress: weighted by size, not by count", L.overallProgress([
  { size: 900, stage: "done", pct: 100 },
  { size: 100, stage: "queued", pct: 0 },
]), { percent: 90, total: 2, done: 1, active: 1, failed: 0 });
eq("progress: a file part-way counts its bytes", L.overallProgress([
  { size: 100, stage: "uploading", pct: 50 },
  { size: 100, stage: "saving", pct: 0 },
]).percent, 25);
eq("progress: a failure leaves the bar but is counted", L.overallProgress([
  { size: 100, stage: "done", pct: 100 },
  { size: 5000, stage: "failed", pct: 0 },
]), { percent: 100, total: 2, done: 1, active: 0, failed: 1 });
eq("progress: a bad percentage is clamped", L.overallProgress([{ size: 10, stage: "uploading", pct: 250 }]).percent, 100);
eq("stage labels read as plain words", [L.STAGE_LABEL.queued, L.STAGE_LABEL.saving, L.STAGE_LABEL.uploading],
  ["Waiting", "Saving record", "Uploading"]);

{
  const plan = L.exportPlan(
    [{ student_id: "b", code: "S02" }, { student_id: "a", code: "S01" }],
    [
      { student_id: "b", clip_no: 1, source_kind: "file", storage_path: "S02/x.mov", mime_type: "video/quicktime", original_name: "q.mov", size_bytes: 5, youtube_url: null },
      { student_id: "a", clip_no: 2, source_kind: "youtube", storage_path: null, mime_type: null, original_name: null, size_bytes: null, youtube_url: "https://youtu.be/dQw4w9WgXcQ" },
      { student_id: "a", clip_no: 1, source_kind: "file", storage_path: "S01/y.mp4", mime_type: "video/mp4", original_name: "w.mp4", size_bytes: 9, youtube_url: null },
      { student_id: "zz", clip_no: 1, source_kind: "file", storage_path: "S99/z.mp4", mime_type: "video/mp4", original_name: "z.mp4", size_bytes: 1, youtube_url: null },
    ],
  );
  eq("export plan: files use the audit names, in code order", plan.files.map((f) => f.name), ["S01_clip1.mp4", "S02_clip1.mov"]);
  eq("export plan: a YouTube link becomes a line, not a file", plan.links, ["S01\tclip2\thttps://youtu.be/dQw4w9WgXcQ"]);
  ok("export plan: a clip with no child on record is not exported", !plan.files.some((f) => f.storagePath === "S99/z.mp4"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
