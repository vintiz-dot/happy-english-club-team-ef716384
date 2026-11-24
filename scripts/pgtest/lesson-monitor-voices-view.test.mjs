// Who said each line on the lesson report screen (src/lib/lessonMonitorVoices.ts, 24 Nov 2026).
// The teacher's answer wins, then the teacher's microphone, then a tap, then the computer's
// suggestion, shown as a question. The line order matches toReportView exactly. Made-up data.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = async (f) => {
  const out = await build({ entryPoints: [resolve(repo, f)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
  const file = join(mkdtempSync(join(tmpdir(), "lm-voices-")), "m.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const V = await load("src/lib/lessonMonitorVoices.ts");
const M = await load("src/lib/lessonMonitor.ts");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const BEE = "aaaaaaaa-0000-4000-8000-00000000000a", MAX = "bbbbbbbb-0000-4000-8000-00000000000b";
const BODY = {
  schema: "hec-lesson-monitor/1",
  lines: [
    { t: 1, e: 3, text: "Good morning.", who: "T" },
    { t: 4, e: 7, text: "I like football.", g: "G1", m: BEE },
    { t: 8, e: 8.5, text: "" },                       // dropped by both mappings
    { t: 9, e: 12, text: "Me too!", g: "G2" },
    { t: 13, e: 15, text: "My favourite is red.", g: "G3" },
    { t: 16, e: 18, text: "Yes.", g: "bad key", m: "not an id" },
  ],
  voice: { groups: [{ key: "G1" }, { key: "G2" }, { key: "G3" }] },
};
const view = M.toReportView(BODY);
const voices = V.lineVoices(BODY);
eq("one voice entry per screen line, in the same order", voices.length, view.lines.length);
eq("taps and groups read; junk ignored", voices.map((v) => [v.tapped, v.group]),
  [[null, null], [BEE, "G1"], [null, "G2"], [null, "G3"], [null, null]]);
ok("a report with voices says so; an older one does not", V.hasVoices(BODY) && !V.hasVoices({ lines: [] }));

const rows = new Map([
  ["G1", { group_key: "G1", seconds: 12, line_count: 4, suggested_student: BEE, suggested_score: 0.74, answer: null, student_id: null }],
  ["G2", { group_key: "G2", seconds: 9, line_count: 3, suggested_student: MAX, suggested_score: 0.7, answer: null, student_id: null }],
  ["G3", { group_key: "G3", seconds: 30, line_count: 9, suggested_student: null, suggested_score: null, answer: "child", student_id: MAX }],
]);
const name = (id) => ({ [BEE]: "Bee", [MAX]: "Max" })[id] ?? "a child";
const who = (i) => V.speakerOf(voices[i], view.lines[i].teacher, rows, name);
eq("the teacher's microphone", who(0), { kind: "teacher", label: "T" });
eq("a tapped line shows the tapped child", who(1), { kind: "tapped", label: "Bee" });
eq("a suggestion is a question until answered", who(2), { kind: "suggested", label: "Max?" });
eq("the teacher's answer names every line of the group", who(3), { kind: "named", label: "Max" });
rows.set("G1", { ...rows.get("G1"), answer: "child", student_id: MAX });
eq("the answer wins over the tap", who(1), { kind: "named", label: "Max" });
rows.set("G2", { ...rows.get("G2"), answer: "several" });
eq("several voices", who(2), { kind: "several", label: "several voices" });
rows.set("G2", { ...rows.get("G2"), answer: "unknown" });
eq("'don't know' hides the suggestion", who(2), { kind: null, label: "" });

eq("groups to name: unanswered first, then longest", V.groupsToName([
  { group_key: "G1", seconds: 5, answer: "child" }, { group_key: "G2", seconds: 9, answer: null }, { group_key: "G3", seconds: 20, answer: null },
]).map((g) => g.group_key), ["G3", "G2", "G1"]);
eq("a group's lines, at most three", V.linesOf([{ group: "G1" }, { group: "G2" }, { group: "G1" }, { group: "G1" }, { group: "G1" }], "G1"), [0, 2, 3]);
eq("the child most tapped in a group", V.tappedIn([{ group: "G1", tapped: BEE }, { group: "G1", tapped: MAX }, { group: "G1", tapped: MAX }], "G1"), MAX);

console.log("=== the screen and its hooks ===");
{
  const page = readFileSync(resolve(repo, "src/pages/TeacherLessonReports.tsx"), "utf8");
  const hook = readFileSync(resolve(repo, "src/hooks/useLessonMonitor.ts"), "utf8");
  const comp = readFileSync(resolve(repo, "src/components/lessonMonitor/VoiceGroups.tsx"), "utf8");
  ok("the report shows the voice groups to name", /<VoiceGroups /.test(page));
  ok("naming goes through the database function, never a table write", /lesson_monitor_name_voice_group/.test(hook) && !/\.(insert|update|upsert|delete)\(/.test(hook));
  ok("a suggestion is never saved without the teacher's button", !/useEffect/.test(comp));
  ok("the mapping imports nothing", !/^\s*import\s/m.test(readFileSync(resolve(repo, "src/lib/lessonMonitorVoices.ts"), "utf8")));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
