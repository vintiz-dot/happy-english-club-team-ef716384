// The recorder screens, rendered (C2 review 3, C3-a and R3-M3): the .tsx
// recording bar and "not recorded" notice rendered to HTML with react-dom/server,
// and the session that keeps the engine alive above the router (navigating away
// while recording must neither stop the recording nor leave a microphone open).
// Node only; no browser, no audio.
//
//   node scripts/recorder/screens.test.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { repo } from "./load-recorder.mjs";

const entry = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordingBar, NotRecordedNotice } from "@/components/recorder/RecordingBar";
export * as S from "@/components/recorder/session";
export const bar = (p) => renderToStaticMarkup(createElement(RecordingBar, { elapsed: "01:00", className: "Starters 1", startingLong: false, onStop: () => {}, ...p }));
export const notice = (body) => renderToStaticMarkup(createElement(NotRecordedNotice, { body }));
`;
const out = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "jsx" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", jsx: "automatic",
  alias: { "@": resolve(repo, "src") }, packages: "external",
});
// Written at the repo root (never into node_modules, a shared install) so react resolves; removed at once.
const file = resolve(repo, `.screens-test.${process.pid}.mjs`);
writeFileSync(file, out.outputFiles[0].text);
let M;
try { M = await import(pathToFileURL(file).href); } finally { (await import("node:fs")).unlinkSync(file); }
const { S, bar, notice } = M;


let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

console.log("=== the recording bar, rendered ===");
const stop = (h) => />\s*Stop\s*</.test(h.replace(/<svg[\s\S]*?<\/svg>/g, ""));
const redDot = (h) => h.includes("data-red-dot");
for (const st of ["starting", "recording", "stalled"]) ok(`${st}: Stop is there`, stop(bar({ state: st })));
ok("recording: the red dot", redDot(bar({ state: "recording" })));
ok("starting: NO red dot", !redDot(bar({ state: "starting" })) && /Starting/.test(bar({ state: "starting" })));
ok("starting over 5 s: says it is saving on this laptop, as an alert", /Saving on this laptop/.test(bar({ state: "starting", startingLong: true })) && /role="alert"/.test(bar({ state: "starting", startingLong: true })));
const st = bar({ state: "stalled" });
ok("stalled: NOT RECORDING, no red dot, an alert", /NOT RECORDING/.test(st) && !redDot(st) && /role="alert"/.test(st));
ok("stalled with both microphones gone: says so", /both microphones are gone/.test(bar({ state: "stalled", bothMicsGone: true })));
console.log("=== the error screen ===");
const n = notice("NOT RECORDED: switched off. The 12 s captured have been DELETED");
ok("error: 'This lesson is not being recorded' with the engine's words", /This lesson is not being recorded/.test(n) && /DELETED/.test(n) && /role="alert"/.test(n));

console.log("=== the floating bar on other pages (pure model) ===");
const m = S.floatingBarModel;
ok("recording, no screen attached: shown, red dot, Stop", (() => { const x = m("recording", "Starters 1", false); return x.show && x.redDot && x.stop && /Starters 1/.test(x.text); })());
ok("stalled: NOT RECORDING, Stop, alert, no red dot", (() => { const x = m("stalled", "", false); return x.show && x.stop && x.alert && !x.redDot && /NOT RECORDING/.test(x.text); })());
ok("starting: Stop, no red dot", (() => { const x = m("starting", "", false); return x.show && x.stop && !x.redDot; })());
ok("uploading: shown (keep the tab open), no Stop needed", (() => { const x = m("uploading", "", false); return x.show && !x.stop; })());
ok("the recorder screen is showing it: not drawn twice", !m("recording", "", true).show);
ok("idle / complete: nothing", !m("complete", "", false).show && !m("idle", "", false).show);

console.log("=== navigating away while recording (C3-a) ===");
function fakeRec(state) {
  const l = new Map();
  const r = {
    state, disposed: 0, stopped: 0, signedOut: 0,
    on(k, fn) { (l.get(k) ?? l.set(k, new Set()).get(k)).add(fn); return () => l.get(k)?.delete(fn); },
    emit(s) { r.state = s; for (const fn of l.get("state") ?? []) fn({ state: s, recordingId: "r" }); },
    async dispose() { r.disposed++; }, async stop() { r.stopped++; r.emit("uploading"); },
    async heldAudio() { return []; }, async signOut() { r.signedOut++; return { unsentRecordings: 0, unsentBytes: 0 }; },
  };
  return r;
}
{
  const r = fakeRec("recording");
  S.adopt("teacher-a", r); S.attachScreen();
  S.detachScreen();                                     // the teacher clicks "Attendance": the recorder page unmounts
  ok("leaving the page while recording does NOT dispose the engine (the recording goes on)", r.disposed === 0 && S.sessionState()?.state === "recording");
  ok("the same teacher coming back gets the same engine", S.sessionFor("teacher-a") === r);
  S.attachScreen(); S.detachScreen();
  r.emit("stalled");
  ok("the session follows the engine's state while no screen is there", S.sessionState()?.state === "stalled");
  r.emit("uploading"); r.emit("complete");
  ok("once finished and with no screen attached, the engine is disposed (microphones released)", r.disposed === 1 && S.sessionState() === null);
}
{
  const r = fakeRec("ready");
  S.adopt("teacher-a", r); S.attachScreen(); S.detachScreen();
  ok("an idle engine with no screen is disposed at once", r.disposed === 1 && S.sessionState() === null);
}
{
  const a = fakeRec("ready"); S.adopt("teacher-a", a); S.attachScreen();
  const got = S.sessionFor("teacher-b");
  await new Promise((r) => setTimeout(r, 0));
  ok("another teacher signing in never gets the first one's engine (it is ended)", got === null && a.disposed === 1);
}

console.log("=== the screen uses the session, not its own engine lifetime ===");
{
  const src = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/DailyRecorder.tsx"), "utf8");
  ok("DailyRecorder never disposes the engine itself (the session decides)", !/\.dispose\(\)/.test(src));
  ok("it detaches on unmount and re-attaches to an existing engine", /detachScreen\(\)/.test(src) && /sessionFor\(userId\)/.test(src) && /adopt\(userId, r\)/.test(src));
  ok("its capturing states are the session's (stalled keeps the Stop bar)", /CAPTURING: RecorderState\[\] = CAPTURING_STATES/.test(src) && S.CAPTURING_STATES.includes("stalled"));
  ok("it renders the tested RecordingBar and NotRecordedNotice", /<RecordingBar /.test(src) && /<NotRecordedNotice /.test(src));
  ok("C3-b: it prepares and recovers by itself when the page opens", /void ready\(false\)/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
