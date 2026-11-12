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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
