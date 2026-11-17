// The recorder screens' pure logic (src/lib/recorderUi.ts) for the C2 round-3
// changes: a view for every new engine code, no Reload offered while
// capturing, the error board (priority, de-duplication, clearing), and the
// upload lines for the new progress fields. Node only (bun is not on these
// machines; scripts/recorderUi.test.ts covers the rest under bun).
//
//   node scripts/recorder/ui.test.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { repo } from "./load-recorder.mjs";

const out = await build({ entryPoints: [resolve(repo, "src/lib/recorderUi.ts")], bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent" });
const file = resolve(tmpdir(), `recorderUi.${process.pid}.mjs`);
writeFileSync(file, out.outputFiles[0].text);
const U = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => ok(n, JSON.stringify(g) === JSON.stringify(w), JSON.stringify(g) === JSON.stringify(w) ? "" : `got ${JSON.stringify(g)}, want ${JSON.stringify(w)}`);

console.log("=== a view for every new code ===");
for (const c of ["capture_stalled", "server_unavailable", "mic_silent", "start_delayed", "start_failed", "stop_pending", "not_durable", "local_store_failed", "clipping"]) {
  const v = U.errorView(c);
  ok(`${c}: its own words, not "Something went wrong"`, v.title !== "Something went wrong" && v.body.length > 10, v.title);
}
ok("capture_stalled says NOT RECORDING", U.errorView("capture_stalled").title === "NOT RECORDING");
ok("both microphones gone has its own body", /Both microphones/.test(U.errorView("capture_stalled", null, null, { message: "NOT RECORDING: both microphones are gone" }).body));
ok("device_lost now says it is still looked for", /still/.test(U.errorView("device_lost", null, "room").title + U.errorView("device_lost", null, "room").body));
ok("start_failed carries the engine's message (what is kept)", U.errorView("start_failed", null, null, { message: "The 12 s captured before that are kept" }).body.includes("12 s"));

console.log("=== no Reload while capturing ===");
const idle = U.errorView("internal"), cap = U.errorView("internal", null, null, { capturing: true });
ok("idle: the default still offers Reload", idle.action === "reload");
ok("capturing: no Reload button, and says not to reload", cap.action === "none" && cap.actionLabel === null && /Do not reload/.test(cap.body), cap.body);
ok("capturing: an unknown server refusal neither", U.errorView("server_refused", "unknown", null, { capturing: true }).action === "none");

console.log("=== the error board ===");
let b = [];
b = U.boardAdd(b, { code: "device_unplugged", track: "room", message: "room STOPPED" }, 1000, true);
b = U.boardAdd(b, { code: "clipping", track: "teacher" }, 2000, true);
b = U.boardAdd(b, { code: "clipping", track: "teacher" }, 32000, true);
eq("a clipping warning does not replace an unplugged microphone: both kept, unplugged first", b.map((e) => e.code), ["device_unplugged", "clipping"]);
eq("repeats are counted, not stacked", b.find((e) => e.code === "clipping").count, 2);
b = U.boardAdd(b, { code: "capture_stalled" }, 33000, true);
eq("NOT RECORDING goes to the top", b[0].code, "capture_stalled");
for (let i = 0; i < 200; i++) b = U.boardAdd(b, { code: "server_unavailable" }, 40000 + i, true);
eq("200 server_unavailable are one entry", b.filter((e) => e.code === "server_unavailable").map((e) => e.count), [200]);
eq("offline is never on the board (the upload line says it)", U.boardAdd([], { code: "offline" }, 1).length, 0);
b = U.boardClear(b, ["device_unplugged", "device_lost"], "room");
ok("device_restored clears that microphone's entry", !b.some((e) => e.code === "device_unplugged"));
let m = U.boardAdd([], { code: "mic_silent", track: "room" }, 1);
m = U.boardAdd(m, { code: "mic_silent", track: "teacher" }, 2);
eq("health 'recovered' clears only that track's silent warning", U.boardClear(m, ["mic_silent"], "room").map((e) => e.track), ["teacher"]);
eq("a clipping warning clears itself after a minute", U.boardShow(U.boardAdd([], { code: "clipping", track: "teacher" }, 0), 61000).length, 0);
eq("at most three are shown", U.boardShow(b.concat(b).map((e, i) => ({ ...e, key: e.key + i })), 50000).length, 3);

console.log("=== upload lines for the new fields ===");
const p = { total: 4, confirmed: 2, pending: 2, refused: 0, offline: false, late: 0, lateMs: 0 };
ok("stopPending is said", U.uploadStatus({ ...p, stopPending: true }).some((l) => /Not stopped on the server yet/.test(l.text)));
ok("stopRefused is said", U.uploadStatus({ ...p, stopRefused: "You no longer teach this lesson" }).some((l) => /did not accept the Stop/.test(l.text)));
ok("held in memory is said", U.uploadStatus({ ...p, heldInMemory: 2 }).some((l) => /only in memory/.test(l.text)));
ok("below-floor (silent) pieces are said", U.uploadStatus({ ...p, belowFloor: 3 }).some((l) => /silent/.test(l.text)));
ok("an older engine without the fields still works", U.uploadStatus(p).length === 1);

console.log("=== no microphone setup on this laptop (17 Nov 2026) ===");
{
  // 17 Nov 2026: lesson 17:30-19:00, the recorder opened at 18:13 with no setup: it said "Set up the microphones first", calmly.
  const W = { preRoll: 5, grace: 10, armWindow: 20 };
  const l = { sessionId: "s1", classId: "c1", className: "Movers 2", date: "2026-11-17", startTime: "17:30:00", endTime: "19:00:00" };
  const at = (hm) => U.hanoiMs("2026-11-17", hm);
  const N = (hm, sw = true, miss = 0) => U.noSetupNotice(l, at(hm), W, sw, miss);
  const during = N("18:13:00");
  ok("during a switched-on lesson: an alert that it is NOT being recorded", during.tone === "error" && during.alert && /NOT being recorded/.test(during.title), during.title);
  ok("...and it sends the teacher to the backup recorder, naming the class", /backup recorder for Movers 2/.test(during.body), during.body);
  const arming = N("17:15:00");
  ok("in the 20 minutes before: an alert that the class will NOT be recorded", arming.tone === "error" && arming.alert && /Movers 2 will NOT be recorded/.test(arming.title), arming.title);
  ok("...with the time capture would start", /before 17:25/.test(arming.body), arming.body);
  const later = N("14:00:00");
  ok("earlier in the day: a warning with the deadline", later.tone === "warn" && !later.alert && /before 17:10/.test(later.title), later.title);
  // The exact edges: arm window opens 17:10, capture 17:25, the lesson ends 19:00, capture closes 19:10.
  eq("edges: 17:09:59 warn, 17:10 arming alert, 17:25 capturing alert",
    [N("17:09:59").title, N("17:10:00").title, N("17:25:00").title], ["Set up the microphones before 17:10", "Movers 2 will NOT be recorded", "This lesson is NOT being recorded"]);
  const after = N("19:00:00");
  ok("after the bell (inside the grace minutes): 'was not recorded', no alert, no backup recorder", after.tone === "warn" && !after.alert && /was not recorded/.test(after.title) && !/backup/.test(after.body), after.title);
  ok("18:59:59 is still the lesson", N("18:59:59").alert === true);
  for (const [name, n] of [
    ["the class switched off", N("18:13:00", false)],
    ["the switch not known yet", N("18:13:00", null)],
    ["a child without permission today (the switch is on but arming would be refused)", N("18:13:00", true, 1)],
    ["the permission count not known yet", N("18:13:00", true, null)],
    ["no lesson today", U.noSetupNotice(null, at("18:13:00"), W, true, 0)],
    ["the lesson over", N("19:10:00")],
  ]) ok(`${name}: the calm setup notice, never the backup recorder`, n.tone === "info" && !n.alert && n.title === "Set up the microphones first" && !/backup/.test(n.body), n.title);
}

console.log("=== admin: which teachers of a switched-on class have set up the microphones ===");
{
  const L = (class_id, teacher_user_id, date, start_time, status = "Scheduled") => ({ class_id, teacher_user_id, date, start_time, end_time: start_time.replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, "0")), status });
  const lessons = [
    L("c1", "u2", "2026-11-19", "17:30:00"),
    L("c1", "u1", "2026-11-18", "17:30:00"),
    L("c1", "u1", "2026-11-17", "19:30:00", "Canceled"),
    L("c1", "u1", "2026-11-20", "17:30:00"),
    L("c1", "u4", "2026-11-17", "08:00:00"),              // earlier today, over at 15:00: not "next"
    L("c1", null, "2026-11-18", "08:00:00"),
    L("c2", "u3", "2026-11-18", "09:00:00"),
    L("c5", null, "2026-11-18", "09:00:00"), L("c5", null, "2026-11-19", "09:00:00"),
  ];
  const profiles = [
    { user_id: "u2", verified_at: "2026-11-10T03:00:00Z" }, { user_id: "u2", verified_at: "2026-11-16T03:00:00Z" },
    { user_id: "u3", verified_at: null },
  ];
  const now = U.hanoiMs("2026-11-17", "15:00:00");
  const s = U.teacherSetupFor("c1", lessons, profiles, now);
  eq("one row per teacher, earliest coming lesson first; cancelled and finished lessons left out", s.teachers.map((t) => [t.userId, t.next.date, t.laptops]), [["u1", "2026-11-18", 0], ["u2", "2026-11-19", 2]]);
  eq("a lesson with no teacher login is counted, not dropped", s.noTeacher, 1);
  eq("the latest check is the one shown", s.teachers[1].lastVerified, "2026-11-16T03:00:00Z");
  const none = U.teacherSetupLine(s.teachers[0], "Teacher A", (x) => x.slice(0, 10));
  ok("no check on the server: a warning that the lessons are probably NOT recorded, with the next one", none.tone === "warn" && /reached the school server/.test(none.text) && /NOT recorded/.test(none.text) && /next: 18 Nov at 17:30/.test(none.text), none.text);
  ok("...and how to fix it", /Class recorder, then Microphones/.test(none.text), none.text);
  const two = U.teacherSetupLine(s.teachers[1], "Teacher B", (x) => x.slice(0, 10));
  ok("checks saved: ok, how many laptops, when, and that one should be the classroom laptop", two.tone === "ok" && /2 laptops, last on 2026-11-16/.test(two.text) && /classroom laptop/.test(two.text), two.text);
  ok("a check without a date still counts", U.teacherSetupLine(U.teacherSetupFor("c2", lessons, profiles, now).teachers[0], "C", String).tone === "ok");
  const only = U.teacherSetupFor("c5", lessons, profiles, now);
  ok("a class whose lessons have no teacher login is not 'no lessons'", only.teachers.length === 0 && only.noTeacher === 2);
  ok("...and says they are NOT recorded", /2 lessons .* have no teacher with a login, so they are NOT recorded/.test(U.noTeacherLine(2).text), U.noTeacherLine(2).text);
  eq("nothing said when every lesson has a teacher", U.noTeacherLine(0), null);
  eq("no lessons: nothing to say", U.teacherSetupFor("c9", lessons, profiles, now), { teachers: [], noTeacher: 0 });
  eq("dates read as day and month", [U.shortDate("2026-11-17"), U.shortDate("2027-01-05"), U.shortDate("odd")], ["17 Nov", "5 Jan", "odd"]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
