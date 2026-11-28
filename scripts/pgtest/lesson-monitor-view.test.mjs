// The lesson monitor screen's mapping (src/lib/lessonMonitor.ts), without the screen.
//
// The report is made by scripts/lesson-monitor/report.py; the screen only
// renames and formats. Checked: every uncertainty survives the mapping (grey,
// faded, "not written", the unwritten bands), talk-time appears only when
// the report has it (step 0 passed) and is a range, a broken or older body
// degrades instead of throwing, nothing in the mapping can carry a child's
// name, and a line's moment maps to the right recorder chunk. All lines here
// are made up.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/lessonMonitor.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "lesson-monitor-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const M = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const BODY = {
  schema: "hec-lesson-monitor/1",
  lesson: { duration_s: 5400, transcribed_track: "room", offset_s: 312.5, unwritten_seconds: 80 },
  notes: ["Vietnamese is not transcribed."],
  lines: [
    { t: 12.5, e: 15, text: "Good afternoon, everyone.", u: false, f: false, who: "T" },
    { t: 40, e: 42, text: "he go home", u: true, f: false, who: null },
    { t: 60, e: 61, text: "mm", u: false, f: true },
    { t: "bad", text: "dropped" },
  ],
  unwritten: [{ t: 20, e: 100, seconds: 80 }],
  targets: { source: "teacher", words: [{ word: "elephant", heard: true, times: [12.5], teacher_mic: 1, room: 0 }, { word: "zebra", heard: false, times: [] }],
             structures: [{ name: "can / can't", count: 2, times: [20, 30] }] },
  patterns: { questions: 3, can_cant: 2, past_ed: 1 },
  flags: [{ kind: "room_quiet", t: 1920, e: 2655, text: "No speech from the room for 12 minutes (32:00-44:15)." }, { kind: "x" }],
  talk_time: { teacher_pct: [65, 75], others_pct: [25, 35], timeline: "TTO-", step_s: 10, speech_seconds: 3000 },
  coverage: { room_until_s: 5400, teacher_until_s: 5400 },
  settings: { model: "large-v3-turbo" },
  mics: { teacher_worn: true },
};

console.log("=== the mapping keeps every uncertainty ===");
{
  const v = M.toReportView(BODY);
  eq("schema recognised", v.ok, true);
  eq("lines with a time and text only (a broken one is dropped, not shown as 0:00)", v.lines.map((l) => l.text), ["Good afternoon, everyone.", "he go home", "mm"]);
  eq("grey = the transcriber was unsure", v.lines.map((l) => l.uncertain), [false, true, false]);
  eq("faded = no matching sound, shown not hidden", v.lines.map((l) => l.faded), [false, false, true]);
  eq("'T' only from the report, never a child", v.lines.map((l) => l.teacher), [true, false, false]);
  eq("uncertain count", v.uncertainCount, 1);
  eq("the unwritten band", v.unwritten, [{ t: 20, e: 100, seconds: 80 }]);
  eq("target words: heard / not written", v.words.map((w) => [w.word, w.heard]), [["elephant", true], ["zebra", false]]);
  eq("a flag without text is dropped", v.flags.map((f) => f.kind), ["room_quiet"]);
  eq("talk-time is a range from the report", v.talk, { teacherPct: [65, 75], othersPct: [25, 35], timeline: "TTO-", stepS: 10 });
  eq("the design's range wording", M.WORDING.talkRange(v.talk.teacherPct, v.talk.othersPct), "You about 65-75 % / others about 25-35 % of speaking time");
  eq("transcript and bands interleave by time", M.transcriptItems(v).map((i) => i.kind === "line" ? i.line.t : `band ${i.band.t}`), [12.5, "band 20", 40, 60]);
}

console.log("=== talk-time only when step 0 passed (absent, not warned about) ===");
{
  const { talk_time, ...noTalk } = BODY;
  eq("no talk_time in the report: none on the screen", M.toReportView(noTalk).talk, null);
  eq("a single number is not a range: not shown", M.toReportView({ ...BODY, talk_time: { teacher_pct: 70, others_pct: 30 } }).talk, null);
}

console.log("=== the teacher did not wear the lapel (owner, 28 Nov 2026): no figure from the microphones ===");
{
  const { mics, ...unknown } = BODY;
  for (const [name, body] of [["no mics field (every report so far)", unknown], ["teacher_worn false", { ...BODY, mics: { teacher_worn: false } }], ["teacher_worn 'yes' is not true", { ...BODY, mics: { teacher_worn: "yes" } }]]) {
    const v = M.toReportView(body);
    eq(`${name}: no talk-time split`, v.talk, null);
    eq(`${name}: no line marked T`, v.lines.map((l) => l.teacher), [false, false, false]);
    eq(`${name}: no "your microphone / room" counts`, v.words.map((w) => [w.teacherMic, w.room]), [[null, null], [null, null]]);
    eq(`${name}: the transcript itself is kept`, v.lines.length, 3);
  }
  eq("micRolesKnown reads only true", [M.micRolesKnown(BODY), M.micRolesKnown(unknown), M.micRolesKnown(null)], [true, false, false]);
}

console.log("=== degrades, never throws ===");
{
  for (const bad of [null, undefined, 42, "x", [], { schema: "other" }, { lines: "x", targets: 5, flags: null }]) {
    let v = null, err = null;
    try { v = M.toReportView(bad); } catch (e) { err = e.message; }
    ok(`body ${JSON.stringify(bad)}: no throw, empty lines`, err === null && v.lines.length === 0 && v.talk === null, err ?? "");
  }
  eq("an unknown shape says so", M.toReportView({ schema: "other" }).ok, false);
}

console.log("=== playback: the room chunk of a moment ===");
{
  const chunks = [0, 1, 2, 3].map((k) => ({ storage_path: `c/r/room/${String(k).padStart(6, "0")}.flac`, t_start_ms: k * 30000, t_end_ms: (k + 1) * 30000 }));
  eq("lesson 0:00 with a 20 s offset is chunk 0 at 20 s", M.chunkAt(chunks, 20, 0), { path: "c/r/room/000000.flac", at: 20 });
  eq("lesson 0:45 is chunk 2 at 5 s", M.chunkAt(chunks, 20, 45), { path: "c/r/room/000002.flac", at: 5 });
  eq("past the recording: nothing (not a wrong chunk)", M.chunkAt(chunks, 20, 500), null);
}

console.log("=== formatting and typed words ===");
eq("mm:ss", [M.mmss(0), M.mmss(65.4), M.mmss(3725)], ["0:00", "1:05", "1:02:05"]);
eq("durations", [M.duration(45), M.duration(80), M.duration(120)], ["45 s", "1 min 20 s", "2 min"]);
eq("typed words: cleaned, deduplicated, junk dropped", M.parseWords("Elephant, giraffe;  ice cream\n<b>x</b>, elephant, 123"), ["elephant", "giraffe", "ice cream"]);

console.log("=== nothing in the screen's code names a child or reaches families ===");
{
  const lib = readFileSync(resolve(repo, "src/lib/lessonMonitor.ts"), "utf8");
  const page = readFileSync(resolve(repo, "src/pages/TeacherLessonReports.tsx"), "utf8");
  const hook = readFileSync(resolve(repo, "src/hooks/useLessonMonitor.ts"), "utf8");
  ok("the mapping reads no student field", !/student|child_id|full_name/i.test(lib.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/"[^"]*"/g, "")));
  ok("the hooks never create a signed URL (authenticated download only)", !/createSignedUrl/.test(hook) && /\.download\(/.test(hook));
  ok("the hooks write only through the pilot's functions", !/\.(insert|update|upsert|delete)\(/.test(hook));
  const app = readFileSync(resolve(repo, "src/App.tsx"), "utf8");
  ok("the route is for teachers only", /path="\/teacher\/lesson-reports" element=\{<ProtectedRoute allowedRole=\{\["teacher"\]\}>/.test(app));
  ok("the screen is on the new design (listed in IVORY_ROUTES)", readFileSync(resolve(repo, "src/lib/ivoryScope.ts"), "utf8").includes('{ path: "/teacher/lesson-reports" }'));
  ok("no family or student page links to it", !/\/teacher\/lesson-reports/.test(readFileSync(resolve(repo, "src/pages/FamilyDashboard.tsx"), "utf8")));
  ok("the page shows the design's 'not written' meaning", page.includes("WORDING.notWrittenMeaning") && page.includes("WORDING.unwritten("));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
