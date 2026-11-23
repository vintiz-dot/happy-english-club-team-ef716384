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
export * as G from "@/components/recorder/signOutGuard";
export * as U from "@/lib/recorderUi";
export * as ER from "@/lib/recorder/errors";
import { RecorderHeader } from "@/components/recorder/RecorderHeader";
export const header = (p) => renderToStaticMarkup(createElement(RecorderHeader, { onMicrophones: () => {}, onToggleAdmin: () => {}, ...p }));
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
const { S, G, U, ER, header, bar, notice } = M;


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

console.log("=== R4-2: Ready for today is the session's, not the page's ===");
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, m }; };
const store = mem();
S.setStorageForTests(store);
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };
const H = (hm) => Date.parse(`2026-11-13T${hm}:00+07:00`);     // Hanoi wall clock
const DATE = "2026-11-13";
const L = (id, start, end, classId = "c-" + id) => ({ sessionId: id, classId, className: "Class " + id, date: DATE, startTime: start + ":00", endTime: end + ":00", status: "scheduled" });
function armRec(state = "ready") {
  const r = fakeRec(state);
  r.arms = []; r.prepares = 0; r.recovers = 0; r.armFail = null; r.durable = true; r.contextRunning = true; r.devStatus = "ok";
  r.arm = async (entry, opts) => { r.arms.push({ entry, opts }); if (r.armFail) throw r.armFail; r.emit("armed"); return {}; };
  r.prepare = async () => { r.prepares++; if (r.state === "idle") r.emit("ready"); return { contextRunning: r.contextRunning, devices: { status: r.devStatus }, offsetMs: 0 }; };
  r.recover = async () => { r.recovers++; return []; };
  const up = new Set();
  const on = r.on;
  r.on = (k, fn) => { if (k === "upload") { up.add(fn); return () => up.delete(fn); } return on(k, fn); };
  r.emitUpload = (pending) => { for (const fn of up) fn({ pending }); };
  return r;
}
let T = H("09:00");
const day = (lessons, sw = {}) => ({ lessons: async () => lessons, window: async () => ({ preRoll: 5, grace: 10, armWindow: 20 }), switchOn: async (c) => sw[c] ?? true, now: () => T, timer: false });
const model = () => { const st = S.sessionState(); return st ? S.floatingBarModel(st.state, "", st.attached > 0, S.barExtra()) : null; };
await S.endSession();
{
  // Leave before arming: Ready at 09:00 on the recorder page, then Attendance; the lesson is at 10:00.
  T = H("09:00");
  const r = armRec(); S.adopt("t-a", r); S.attachScreen();
  S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  S.detachScreen(); await flush();
  ok("R4-2 leave before arming: the session is KEPT (not disposed) while a lesson waits", r.disposed === 0 && S.sessionState()?.userId === "t-a");
  const m1 = model();
  ok("R4-2 leave before arming: the bar says Ready for today and when it starts", !!m1?.show && /Ready for today/.test(m1.text) && /09:55/.test(m1.text), m1?.text);
  T = H("09:39"); await S.armTick(); await flush();
  ok("R4-2: not armed before the arm window (09:40)", r.arms.length === 0);
  T = H("09:40"); await S.armTick(); await flush();
  ok("R4-2: armed at 09:40 with no recorder page open", r.arms.length === 1 && r.arms[0].entry.sessionId === "s1" && r.state === "armed");
  const m2 = model();
  ok("R4-2: the bar says armed, starts at 09:55", !!m2?.show && /Armed/.test(m2.text) && /starts at 09:55/.test(m2.text), m2?.text);
  r.emit("starting"); r.emit("recording");
  ok("R4-2: then the recording state, with Stop and the red dot", (() => { const x = model(); return !!x?.show && x.redDot && x.stop && /Recording/.test(x.text); })());
  T = H("09:41"); await S.armTick(); await flush();
  ok("R4-2: armed once (a later pass does not arm the same lesson again)", r.arms.length === 1);
  ok("R4-2: Ready and what was armed are kept for the day on this device", (() => { const x = S.readyFor("t-a", DATE); return !!x && x.armed.includes("s1") && x.capturing === "s1"; })(), JSON.stringify(S.readyFor("t-a", DATE)));
  r.emit("uploading"); r.emit("complete"); await flush();
  ok("R4-2: after the last lesson of the day, finished and idle: the session ends", r.disposed === 1 && S.sessionState() === null);
}
{
  // Back-to-back: 10:00-11:00 then 11:00-12:00, the teacher on another page throughout.
  store.m.clear(); T = H("09:00");
  const r = armRec(); S.adopt("t-a", r);
  S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  S.startDay(day([L("s1", "10:00", "11:00"), L("s2", "11:00", "12:00")])); await flush();
  T = H("09:45"); await S.armTick(); await flush();
  ok("R4-2 back-to-back: the first lesson stops at the second's start", r.arms.length === 1 && r.arms[0].opts.stopAt === U.lessonTimes(L("s2", "11:00", "12:00")).start, JSON.stringify(r.arms.map((a) => a.opts)));
  r.emit("starting"); r.emit("recording");
  T = H("10:56"); await S.armTick(); await flush();
  ok("R4-2 back-to-back: the second is not armed while the first is capturing", r.arms.length === 1);
  T = H("11:00"); r.emit("stopping"); r.emit("uploading"); await flush(); await S.armTick(); await flush();
  ok("R4-2 back-to-back: the second is armed as soon as the first stops (while it uploads)", r.arms.length === 2 && r.arms[1].entry.sessionId === "s2" && r.arms[1].opts.stopAt === undefined, JSON.stringify(r.arms.map((a) => a.entry.sessionId)));
  await S.endSession();
}
{
  // Reload between them: the module state is gone, localStorage is not.
  store.m.clear(); T = H("09:00");
  const r1 = armRec(); S.adopt("t-a", r1);
  S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  const lessons = [L("s1", "10:00", "11:00"), L("s2", "11:30", "12:30")];
  S.startDay(day(lessons)); await flush(); T = H("09:45"); await S.armTick(); await flush();
  ok("R4-2 (setup): the first lesson armed", r1.arms.length === 1);
  r1.emit("starting"); r1.emit("recording"); T = H("11:05"); r1.emit("stopping"); r1.emit("uploading"); r1.emit("complete"); await flush();
  await S.endSession();                                     // the tab reloads (the engine and the module state go)
  const r2 = armRec("idle"); let made = 0;
  await S.boot({ userId: "t-a", createRecorder: async () => { made++; return r2; }, day: day(lessons) }); await flush();
  ok("R4-2 reload: on any page the engine is brought back (Ready was pressed today)", made === 1 && r2.prepares >= 1 && r2.recovers === 1 && S.sessionState()?.userId === "t-a");
  ok("R4-2 reload: the lesson already recorded is NOT armed again", !r2.arms.some((a) => a.entry.sessionId === "s1"));
  ok("R4-2 reload: the bar says the next lesson", /Class s2/.test(model()?.text ?? "") && /11:25/.test(model()?.text ?? ""), model()?.text);
  T = H("11:10"); await S.armTick(); await flush();
  ok("R4-2 reload: the next lesson arms by itself", r2.arms.length === 1 && r2.arms[0].entry.sessionId === "s2");
  await S.endSession();
}
{
  // Reload DURING a lesson: the rest of that lesson is armed again; a lesson the teacher Stopped is not.
  store.m.clear(); T = H("09:00");
  const r1 = armRec(); S.adopt("t-a", r1);
  S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  const lessons = [L("s1", "10:00", "11:00")];
  S.startDay(day(lessons)); await flush(); T = H("09:45"); await S.armTick(); await flush();
  ok("R4-2 (setup): the first lesson armed", r1.arms.length === 1);
  r1.emit("starting"); r1.emit("recording");
  await S.endSession();                                     // the tab dies mid-lesson
  T = H("10:20");
  const r2 = armRec("idle");
  await S.boot({ userId: "t-a", createRecorder: async () => r2, day: day(lessons) }); await flush();
  ok("R4-2 reload while capturing: the rest of the lesson is armed again", r2.arms.length === 1 && r2.arms[0].entry.sessionId === "s1");
  ok("R4-2 reload while capturing: the bar says the page was reloaded while saving", S.floatingBarModel("uploading", "", false, S.barExtra()).text.includes("reloaded"), JSON.stringify([S.barExtra(), S.sessionState()]));
  r2.emit("starting"); r2.emit("recording"); r2.emit("stopping"); r2.emit("uploading"); r2.emit("complete"); await flush(); await S.endSession();
  const r3 = armRec("idle");
  T = H("10:40");
  await S.boot({ userId: "t-a", createRecorder: async () => r3, day: day(lessons) }); await flush();
  ok("R4-2: a lesson stopped (not interrupted) stays done after a reload", r3.arms.length === 0);
  await S.endSession();
}
{
  // A second teacher on the same browser profile.
  store.m.clear(); T = H("09:00");
  S.followUser("t-a");
  const r = armRec(); S.adopt("t-a", r);
  S.pressReady("t-a", DATE); S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  S.followUser("t-b"); await flush();
  ok("R4-2 second teacher: the first one's Ready is cleared and their session ended", S.readyFor("t-a", DATE) === null && r.disposed === 1 && S.sessionState() === null);
  let made = 0;
  await S.boot({ userId: "t-b", createRecorder: async () => { made++; return armRec("idle"); }, day: day([L("s1", "10:00", "11:00")]) });
  ok("R4-2 second teacher: nothing is armed for them (they never pressed Ready)", made === 0 && S.readyFor("t-b", DATE) === null);
  S.pressReady("t-b", DATE);
  ok("R4-2: Ready is per user (the key carries the user id)", !!S.readyFor("t-b", DATE) && S.readyFor("t-a", DATE) === null && [...store.m.keys()].every((k) => k === S.READY_PREFIX + "t-b"));
  ok("R4-2: and per day (tomorrow it is not set)", S.readyFor("t-b", "2026-11-14") === null);
  S.followUser(null);
  ok("R4-2: a sign-out that bypassed the guard clears it too", S.readyFor("t-b", DATE) === null);
}
{
  // A second tab: the engine there cannot take the recorder (prepare refuses): nothing is armed from it.
  store.m.clear(); T = H("09:45");
  S.pressReady("t-a", DATE);
  const r = armRec("idle"); r.prepare = async () => { throw { code: "another_tab", message: "The recorder is open in another tab" }; };
  await S.boot({ userId: "t-a", createRecorder: async () => r, day: day([L("s1", "10:00", "11:00")]) }); await flush();
  ok("R4-2 second tab: boot gives up (the other tab arms), nothing armed here", r.arms.length === 0 && r.disposed === 1 && S.sessionState() === null);
}
{
  // Sign-out through the guard clears Ready, with or without an engine.
  store.m.clear();
  S.followUser("t-a");
  const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE);
  let out = 0; await G.guardedSignOut(() => { out++; });
  ok("R4-2: signing out clears Ready (with an engine)", out === 1 && S.readyFor("t-a", DATE) === null && r.signedOut === 1);
  S.pressReady("t-a", DATE); await G.guardedSignOut(() => { out++; });
  ok("R4-2: signing out clears Ready (no engine on the page)", out === 2 && S.readyFor("t-a", DATE) === null);
  S.followUser(null);
}
{
  // Leaving when Ready was NOT pressed: nothing is kept (the old idle rule).
  store.m.clear(); T = H("09:00");
  const r = armRec(); S.adopt("t-a", r); S.attachScreen(); S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  S.detachScreen(); await flush();
  ok("R4-2: without Ready, an idle engine is still disposed when the page goes", r.disposed === 1 && S.sessionState() === null);
}
{
  // A switched-off class is skipped; the next lesson is the one shown and armed.
  store.m.clear(); T = H("09:45");
  const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  S.startDay(day([L("s1", "10:00", "11:00", "off"), L("s2", "10:00", "11:00", "on")], { off: false })); await flush(); await S.armTick(); await flush();
  ok("R4-2: a switched-off class is skipped, the other lesson armed", r.arms.length === 1 && r.arms[0].entry.sessionId === "s2");
  await S.endSession();
}
{
  // Refusals at arming: a stated one ends that lesson for today; anything else is retried with backoff (round 6, R5-1).
  store.m.clear(); T = H("09:45");
  const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  r.armFail = { code: "server_unavailable", retryable: true, message: "503" };
  S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  const n0 = r.arms.length;
  T = H("09:45") + 10_000; await S.armTick(); await flush();
  ok("R4-2: a failed arm (503) is tried again, not never", n0 === 1 && r.arms.length === 2, `${n0} ${r.arms.length}`);
  r.armFail = { code: "server_refused", retryable: false, refusal: "consent_missing", message: "consent" };
  T = H("09:47"); await S.armTick(); await flush(); const n2 = r.arms.length;
  T = H("09:50"); await S.armTick(); await flush();
  ok("R4-2: a stated refusal ends that lesson for today (not retried)", n2 === 3 && r.arms.length === n2 && S.readyFor("t-a", DATE)?.armed.includes("s1"), `${n2} ${r.arms.length}`);
  await S.endSession();
}
{
  // No sound after a reload: never armed silently; the bar asks for the click; the click arms it.
  store.m.clear(); T = H("09:45");
  const r = armRec(); r.contextRunning = false; S.adopt("t-a", r); S.pressReady("t-a", DATE);
  S.setPrepared({ contextRunning: false, devicesOk: true });
  S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  const m = model();
  ok("R4-2: sound not allowed: not armed, the bar asks for 'Allow sound' as an alert", r.arms.length === 0 && !!m?.allowSound && m.alert, JSON.stringify(m));
  r.contextRunning = true; await S.allowSound(); await flush();
  ok("R4-2: 'Allow sound' (a click) arms it", r.arms.length === 1);
  await S.endSession();
}
{
  // A microphone missing: not armed, said loudly on every page.
  store.m.clear(); T = H("09:45");
  const r = armRec(); r.devStatus = "missing"; S.adopt("t-a", r); S.pressReady("t-a", DATE);
  S.setPrepared({ contextRunning: true, devicesOk: false });
  S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  const m = model();
  ok("R4-2: a missing microphone: NOT armed, said as an alert", r.arms.length === 0 && !!m?.alert && /NOT armed/.test(m.text) && /microphone/.test(m.text), m?.text);
  await S.endSession();
}
{
  // Uploads of earlier recordings keep the session (review 4, C3-b limit).
  store.m.clear();
  const r = armRec(); S.adopt("t-a", r); S.attachScreen();
  r.emitUpload(3); S.detachScreen(); await flush();
  ok("minor: pending uploads of an earlier recording keep the session when the page goes", r.disposed === 0 && S.sessionState()?.pending === 3);
  r.emitUpload(0); await flush();
  ok("minor: ...and it ends once they are sent", r.disposed === 1);
}
console.log("=== full screen hides everything outside it ===");
ok("full screen: drawn even while the recorder screen is attached", S.floatingBarModel("recording", "", true, { fullscreen: true }).show);
ok("full screen: Stop is there while capturing", S.floatingBarModel("stalled", "", true, { fullscreen: true }).stop);
{
  const src = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/session.ts"), "utf8");
  ok("full screen: the bar is moved into document.fullscreenElement and listens for fullscreenchange", /fullscreenEl\(\) \?\? document\.body/.test(src) && /addEventListener\("fullscreenchange"/.test(src));
  ok("the bar's Stop asks again in the bar, not with a browser dialog (which would leave full screen)", !/window\.confirm\("Stop recording/.test(src) && /Yes, stop recording/.test(src));
  ok("the bar sits above dialogs and stays clickable under a modal", /zIndex = "2147483647"/.test(src) && /pointerEvents = "auto"/.test(src));
}

console.log("=== R5-1: a failed or refused arm is never silent ===");
{
  S.setStorageForTests(store);
  const answers = [
    ["429 Too Many Requests", { message: "Too Many Requests", code: "429" }],
    ["PostgREST no rows", { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116", details: "The result contains 0 rows" }],
    ["a 503", { message: "Service Unavailable", status: 503 }],
  ];
  for (const [label, raw] of answers) {
    store.m.clear(); T = H("09:45");
    const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
    let fails = 6; const orig = r.arm;
    r.arm = async (entry, opts) => { if (fails-- > 0) { r.arms.push({ entry, opts }); throw ER.toRecorderError(raw); } return orig(entry, opts); };
    S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
    const seen = [];
    for (let i = 0; i < 80 && r.state !== "armed"; i++) {
      T += 5000; await S.armTick(); await flush();
      seen.push(model());
    }
    ok(`R5-1 ${label} x6: not dropped for the day - retried until armed`, r.state === "armed" && r.arms.length >= 6 && !S.readyFor("t-a", DATE).refused, `${r.state} ${r.arms.length}`);
    const pre = seen.slice(0, -1);
    ok(`R5-1 ${label}: the bar is shown on every pass while not armed`, pre.length > 0 && pre.every((m) => m?.show), JSON.stringify(pre.find((m) => !m?.show)));
    ok(`R5-1 ${label}: ...and says plainly "Not armed yet - retrying", as an alert`, pre.every((m) => m.alert && /Not armed yet - retrying/.test(m.text)), pre[0]?.text);
    const m = model();
    ok(`R5-1 ${label}: once armed, the bar says Armed (no retry message)`, /Armed/.test(m.text) && !/retrying/.test(m.text), m.text);
    await S.endSession();
  }
  {
    // Backoff: with every answer a 429 for 10 minutes, far fewer attempts than 5-second passes.
    store.m.clear(); T = H("09:41");
    const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
    r.arm = async (entry, opts) => { r.arms.push({ entry, opts, at: T }); throw ER.toRecorderError({ message: "Too Many Requests", code: "429" }); };
    S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
    for (let i = 0; i < 120; i++) { T += 5000; await S.armTick(); await flush(); }
    const gaps = r.arms.slice(1).map((a, i) => a.at - r.arms[i].at);
    ok("R5-1: arm retried with backoff (gaps grow to the 60 s cap, never stop)", r.arms.length >= 10 && r.arms.length < 40 && Math.max(...gaps) <= 65000 && gaps[gaps.length - 1] > gaps[0], JSON.stringify(gaps.map((g) => g / 1000)));
    ok("R5-1: still trying in the capture window, bar still saying so", /Not armed yet - retrying/.test(model()?.text ?? ""), model()?.text);
    await S.endSession();
  }
  for (const [label, raw, reason] of [
    ["consent missing", { message: "Recording needs consent from every child in this class", code: "P0001" }, /permission/i],
    ["switched off", { message: "Recording is switched off for this class", code: "P0001" }, /switched off/i],
    ["not your class", { message: "Only a teacher of this class can record it", code: "P0001" }, /not yours/i],
  ]) {
    store.m.clear(); T = H("09:45");
    const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
    r.arm = async (entry, opts) => { r.arms.push({ entry, opts }); throw ER.toRecorderError(raw); };
    S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
    T += 5000; await S.armTick(); await flush();
    const m = model();
    ok(`R5-1 stated (${label}): final - not asked again`, r.arms.length === 1 && S.readyFor("t-a", DATE).armed.includes("s1"));
    ok(`R5-1 stated (${label}): the bar says "This lesson will NOT be recorded: <reason>. Use the backup recorder." as an alert`, !!m?.show && m.alert && /This lesson will NOT be recorded: /.test(m.text) && reason.test(m.text) && /Use the backup recorder/.test(m.text), m?.text);
    T = H("10:30"); await S.armTick(); await flush();
    ok(`R5-1 stated (${label}): still said during the lesson, on any page`, /NOT be recorded/.test(model()?.text ?? "") && S.sessionState()?.refusal?.className === "Class s1");
    await S.endSession();
    const r2 = armRec("idle");
    await S.boot({ userId: "t-a", createRecorder: async () => r2, day: day([L("s1", "10:00", "11:00")]) }); await flush();
    ok(`R5-1 stated (${label}): after a reload it is still said (not a silent miss)`, /NOT be recorded/.test(model()?.text ?? "") && r2.arms.length === 0, model()?.text);
    T = H("11:11"); await S.armTick(); await flush();
    ok(`R5-1 stated (${label}): once the lesson is over the message goes`, !model()?.show || !/NOT be recorded/.test(model()?.text ?? ""));
    await S.endSession();
  }
}

console.log("=== R5-2: the Armed bar shows the ARMED lesson's time ===");
{
  store.m.clear(); T = H("09:00");
  const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  S.startDay(day([L("a", "10:00", "11:00"), L("b", "14:00", "15:00")])); await flush();
  T = H("09:45"); await S.armTick(); await flush();
  ok("R5-2: at the arming pass: starts at 09:55", /starts at 09:55/.test(model()?.text ?? ""), model()?.text);
  for (const dt of [5000, 10000, 60000, 5 * 60000]) {
    T = H("09:45") + dt; await S.armTick(); await flush();
    ok(`R5-2: ${dt / 1000} s later still 09:55 (not the next lesson's 13:55)`, /starts at 09:55/.test(model()?.text ?? "") && !/13:55/.test(model()?.text ?? ""), model()?.text);
  }
  await S.endSession();
  store.m.clear(); T = H("09:45");
  const r2 = armRec(); S.adopt("t-a", r2); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  S.startDay(day([L("a", "10:00", "11:00")])); await flush(); T += 5000; await S.armTick(); await flush();
  ok("R5-2: the only lesson of the day: still its own time five seconds later", /starts at 09:55/.test(model()?.text ?? ""), model()?.text);
  await S.endSession();
}

console.log("=== review 5 render faults ===");
{
  const b = [{ key: "a", code: "start_failed", count: 1, lastAt: 0, view: {} }, { key: "b", code: "offline", count: 1, lastAt: 0, view: {} }];
  ok("the error screen does not draw the start failure twice (the notice carries it)", U.boardForScreen(b, 0, "error").every((e) => e.code !== "start_failed") && U.boardForScreen(b, 0, "error").length === 1);
  ok("...other screens keep it on the list", U.boardForScreen(b, 0, "ready").some((e) => e.code === "start_failed"));
  const dsrc = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/DailyRecorder.tsx"), "utf8");
  ok("DailyRecorder draws its list through boardForScreen", /boardForScreen\(board, tick, state\)/.test(dsrc) && !/boardShow\(/.test(dsrc));
  ok("starting (calm): no warning sign; stalled and the long start: the sign", !bar({ state: "starting" }).includes("data-warning-sign") && bar({ state: "stalled" }).includes("data-warning-sign") && bar({ state: "starting", startingLong: true }).includes("data-warning-sign"));
  const ssrc = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/session.ts"), "utf8");
  ok("the floating bar: the warning sign only on alerts", /m\.redDot \? "● " : m\.alert \? "⚠ " : ""/.test(ssrc));
  ok("calm floating states are not alerts (Ready, Armed, Saving)", [["ready", { next: { className: "X", at: "09:55" } }], ["armed", { armedAt: "09:55" }], ["uploading", {}]].every(([st, ex]) => { const x = S.floatingBarModel(st, "", false, ex); return x.show && !x.alert; }));
  const h = header({ showMicrophones: true, isAdmin: true, adminView: false });
  ok("phone header: the title block is its own row (flex-col), side by side only from sm", /data-recorder-header="" class="[^"]*flex-col[^"]*sm:flex-row/.test(h) || /class="[^"]*flex-col[^"]*sm:flex-row[^"]*" data-recorder-header/.test(h), h.slice(0, 200));
  ok("phone header: the buttons are in their own wrapping group, both 44 px", /data-header-actions/.test(h) && (h.match(/min-h-11/g) ?? []).length === 2 && /Microphones/.test(h) && /Admin panel/.test(h));
  const asrc = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/RecorderAdminPanel.tsx"), "utf8");
  ok("admin class card: the switch button goes below the name on a phone", /flex flex-col gap-3 sm:flex-row sm:items-start" data-class-card-head/.test(asrc));
}
S.setStorageForTests(undefined);

console.log("=== the screen uses the session, not its own engine lifetime ===");
{
  const src = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/DailyRecorder.tsx"), "utf8");
  ok("DailyRecorder never disposes the engine itself (the session decides)", !/\.dispose\(\)/.test(src));
  ok("it detaches on unmount and re-attaches to an existing engine", /detachScreen\(\)/.test(src) && /sessionFor\(userId\)/.test(src) && /adopt\(userId, r\)/.test(src));
  ok("its capturing states are the session's (stalled keeps the Stop bar)", /CAPTURING: RecorderState\[\] = CAPTURING_STATES/.test(src) && S.CAPTURING_STATES.includes("stalled"));
  ok("it renders the tested RecordingBar and NotRecordedNotice", /<RecordingBar /.test(src) && /<NotRecordedNotice /.test(src));
  ok("C3-b: it prepares and recovers by itself when the page opens", /void ready\(false\)/.test(src));
  ok("R4-2: the page no longer arms (the session does)", !/\.arm\(/.test(src) && /pressReady\(userId, today\)/.test(src) && /startDay\(dayDeps\(/.test(src));
  ok("R4-2: Ready is read back from the session (survives leaving and a reload)", /useState\(\(\) => !!readyFor\(userId/.test(src));
  const eng = (await import("node:fs")).readFileSync(resolve(repo, "src/components/recorder/engine.ts"), "utf8");
  const pick = eng.slice(eng.indexOf("export type RecorderLike"), eng.indexOf(">;", eng.indexOf("export type RecorderLike")));
  ok("minor: the screens' engine type leaves out kill() (the crash simulation)", pick.includes('"dispose"') && !pick.includes('"kill"'));
  const navSrc = (await import("node:fs")).readFileSync(resolve(repo, "src/lib/navSections.ts"), "utf8");
  const entry = /one\("Record & transcripts", "\/teacher\/recorder"/g;
  const adminPart = navSrc.slice(navSrc.indexOf("ADMIN_GROUPS")), teacherPart = navSrc.slice(navSrc.indexOf("TEACHER_GROUPS"), navSrc.indexOf("ADMIN_GROUPS"));
  ok("sidebar: Record & transcripts (the merged recorder page) for teachers and admins, and nobody else", (adminPart.match(entry) ?? []).length === 1 && (teacherPart.match(entry) ?? []).length === 1 && (navSrc.match(entry) ?? []).length === 2 && /role === "admin" \? ADMIN_GROUPS : role === "teacher" \? TEACHER_GROUPS : \[\]/.test(navSrc));
  const app = (await import("node:fs")).readFileSync(resolve(repo, "src/App.tsx"), "utf8");
  ok("R4-2: RecorderBoot is mounted once in App", (app.match(/<RecorderBoot \/>/g) ?? []).length === 1);
}

console.log("=== 19 Nov 2026: a start held back is said loudly ===");
{
  const at = (hm) => U.hanoiMs("2026-11-19", hm);
  ok("armed 30 s after the capture should have begun: overdue", S.isStartOverdue("armed", "2026-11-19", "19:25", at("19:10:12"), at("19:25:30")));
  ok("...not before", !S.isStartOverdue("armed", "2026-11-19", "19:25", at("19:10:12"), at("19:25:29")));
  ok("Ready pressed after the lesson began: counted from the arming, not the lesson", !S.isStartOverdue("armed", "2026-11-19", "17:25", at("17:41:34"), at("17:41:40")) && S.isStartOverdue("armed", "2026-11-19", "17:25", at("17:41:34"), at("17:42:05")));
  ok("only while armed (recording, saving, idle are not)", ["recording", "starting", "uploading", "ready", "idle"].every((st) => !S.isStartOverdue(st, "2026-11-19", "19:25", null, at("20:00"))));
  ok("nothing known about the lesson: never overdue", !S.isStartOverdue("armed", null, null, null, at("20:00")));
  const b = S.floatingBarModel("armed", "Jupiter", false, { armedAt: "19:25", startOverdue: true });
  ok("the bar: an alert that it is NOT recording, and what to do", b.show && b.alert && /NOT RECORDING YET/.test(b.text) && /click anywhere on this page/.test(b.text), b.text);
  ok("an ordinary armed bar stays calm", !S.floatingBarModel("armed", "Jupiter", false, { armedAt: "19:25" }).alert);
  ok("'Allow sound' still comes first", /Allow sound/.test(S.floatingBarModel("armed", "", false, { needsClick: true, startOverdue: true }).text));
  const pre = S.floatingBarModel("armed", "Jupiter", false, { armedAt: "19:25", micsOpen: false });
  ok("armed, microphones not open yet: asks for one click before the start, calmly", pre.show && !pre.alert && /click anywhere on this page once before 19:25/.test(pre.text), pre.text);
  ok("microphones open: the usual 'by itself'", /by itself/.test(S.floatingBarModel("armed", "Jupiter", false, { armedAt: "19:25", micsOpen: true }).text));
  ok("overdue wording does not claim one cause", /if it still does not start, open the recorder/.test(b.text));
  ok("the notification ask is safe where there is no browser", (() => { try { S.askNotifications(); return true; } catch { return false; } })());
}

const eq = (n, g, w) => ok(n, JSON.stringify(g) === JSON.stringify(w), JSON.stringify(g) === JSON.stringify(w) ? "" : `got ${JSON.stringify(g)}, want ${JSON.stringify(w)}`);
console.log("=== 20 Nov 2026: earlier recordings still on this laptop are said, and sent ===");
const U0 = (id, phase, total, confirmed, refused = 0) => ({ recordingId: id, sessionDate: "2026-11-19", phase, total, confirmed, refused });
function sendRec(list) {
  const r = fakeRec("ready");
  r.list = list;
  r.unfinished = async () => r.list;
  r.heldAudio = async () => { throw new Error("heldAudio must not be used for this (it reads the audio)"); };
  r.resends = 0; r.resend = async () => { r.resends++; };
  const up = new Set(); const on0 = r.on;
  r.on = (k, fn) => { if (k === "upload") { up.add(fn); return () => up.delete(fn); } return on0(k, fn); };
  r.upload = (p) => { for (const fn of up) fn({ offline: false, refused: 0, halted: null, ...p }); };
  return r;
}
const settle = async () => { await flush(); await new Promise((res) => setTimeout(res, 20)); await flush(); };
{
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  const r = sendRec([U0("rec-j", "stopped", 310, 116)]);
  S.adopt("t-h", r);
  r.upload({ recordingId: "rec-j", total: 310, confirmed: 116, pending: 194 });
  await settle();
  const ss = S.sessionState();
  ok("the held recording is listed, with its progress (from the pieces' records, not the audio)", ss?.held.length === 1 && ss.held[0].onServer === 116 && ss.held[0].total === 310, JSON.stringify(ss?.held));
  ok("this laptop has been checked (so 'not here' can be said)", Array.isArray(ss?.localIds) && ss.localIds.includes("rec-j"));
  ok("a hint is left for the next sign-in (a count, no names)", S.unsentHint("t-h") && st.getItem(S.UNSENT_PREFIX + "t-h") === "1");
  const b = S.floatingBarModel("ready", "", false, S.barExtra());
  ok("any page: the bar says it is being sent, and how far", b.show && /Sending the recording of 19 Nov to the school server/.test(b.text) && /116 of 310 pieces/.test(b.text) && !b.allowSound, b.text);
  ok("the engine is kept while it is being sent", r.disposed === 0);
  S.attachScreen();
  await S.resendHeld(); await flush();
  eq("'Send now' asks the engine to send at once", r.resends, 1);
  r.list = [U0("rec-j", "finalized", 310, 310)];
  r.upload({ recordingId: "rec-j", total: 310, confirmed: 310, pending: 0 });
  await S.resendHeld(); await settle();
  ok("all pieces there, still being finished: said, and kept", S.sessionState()?.held[0]?.finishing === true && r.disposed === 0);
  r.list = [];
  await S.resendHeld(); await settle();
  const after = S.sessionState();
  ok("finished and gone from the laptop: 'Saved' with the date", /Saved: all of the recording of 19 Nov is on the school server/.test(after?.saved ?? ""), after?.saved);
  ok("...the list is empty and the hint gone", after?.held.length === 0 && !S.unsentHint("t-h"));
  ok("...and, sent from here, it is never called 'on another laptop'", after?.localIds?.includes("rec-j"));
  S.detachScreen(); await flush();
  ok("nothing left to send and no screen: the engine is ended", r.disposed === 1);
  ok("the bar still says Saved, to that teacher, once the engine is gone", /Saved/.test(S.floatingBarModel("idle", "", false, { saved: "Saved: x" }).text));
}
{
  // Review: a lesson whose tab died mid-capture leaves the hint (the original incident).
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  const r = sendRec([U0("rec-live", "capturing", 40, 10)]);
  r.recordingId = "rec-live";
  S.adopt("t-l", r);
  r.emit("recording");
  r.upload({ recordingId: "rec-live", total: 40, confirmed: 10, pending: 30 });
  await settle();
  ok("the lesson being captured is not listed as 'earlier'", S.sessionState()?.held.length === 0);
  ok("...but it leaves the hint, so the next sign-in sends it if this tab dies", S.unsentHint("t-l"));
}
{
  // Review: pieces the server refused for good - said, but no engine kept for them, no hint.
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  const r = sendRec([U0("rec-r", "stopped", 10, 7, 3)]);
  S.adopt("t-r", r); S.attachScreen();
  r.upload({ recordingId: "rec-r", total: 10, confirmed: 7, pending: 0, refused: 3 });
  await settle();
  const ss = S.sessionState();
  ok("refused pieces: said as a problem", /would not take 3 pieces/.test(ss?.held[0]?.problem ?? ""), JSON.stringify(ss?.held));
  ok("...no hint (no engine at every sign-in for it)", !S.unsentHint("t-r"));
  S.detachScreen(); await flush();
  ok("...and the engine is not kept for it once the screen goes", r.disposed === 1);
}
{
  // Review: given up by the server - never 'Saved'.
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  const r = sendRec([U0("rec-g", "stopped", 10, 4)]);
  S.adopt("t-g", r); S.attachScreen();
  r.upload({ recordingId: "rec-g", total: 10, confirmed: 4, pending: 6 });
  await settle();
  r.list = [U0("rec-g", "abandoned", 10, 4)];
  await S.resendHeld(); await settle();
  const t = S.sessionState()?.saved ?? "";
  ok("given up: said so, never 'Saved'", /gave up the recording of 19 Nov/.test(t) && !/^Saved/.test(t), t);
  S.detachScreen();
}
{
  // Review: gone from the laptop while pieces were still pending (a deleted server row purged it) - not 'Saved'.
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  const r = sendRec([U0("rec-p", "stopped", 10, 4)]);
  S.adopt("t-p", r); S.attachScreen();
  r.upload({ recordingId: "rec-p", total: 10, confirmed: 4, pending: 6 });
  await settle();
  r.list = [];
  await S.resendHeld(); await settle();
  eq("purged with pieces pending: no 'Saved'", S.sessionState()?.saved ?? null, null);
  S.detachScreen();
}
{
  const offline = S.sendingText({ count: 1, dates: ["19 Nov"], onServer: 10, total: 310, offline: true, problem: null });
  ok("offline: said loudly, waiting for the internet", offline.alert && /waiting for the internet/.test(offline.text));
  const refused = S.sendingText({ count: 1, dates: ["19 Nov"], onServer: 10, total: 310, offline: false, problem: "the server would not take 3 pieces" });
  ok("a refusal: said loudly, open the recorder", refused.alert && /would not take 3 pieces/.test(refused.text));
  eq("still to send: stopped, finalized, or left mid-capture by a dead tab; never the lesson being captured, never given up",
    S.stillToSend([U0("a", "stopped", 1, 0), U0("b", "finalized", 1, 1), U0("c", "capturing", 1, 0), U0("d", "abandoned", 1, 0), U0("f", "stopped", 1, 0)], "f").map((h) => h.recordingId), ["a", "b", "c"]);
}
{
  // Sign-in on any page: no Ready today, but the hint says this teacher's audio waits here - the engine comes up to send it.
  await S.endSession();
  const st = mem(); S.setStorageForTests(st);
  st.setItem(S.UNSENT_PREFIX + "t-b", "1");
  const r = armRec("idle");
  r.unfinished = async () => [U0("rec-x", "stopped", 20, 3)];
  let made = 0;
  await S.boot({ userId: "t-b", createRecorder: async () => { made++; return r; }, day: day([]) });
  await flush();
  ok("hint, no Ready: the engine is made, prepared and recovers (sends)", made === 1 && r.prepares === 1 && r.recovers === 1 && S.sessionState()?.userId === "t-b");
  ok("...nothing is armed (no day started)", r.arms.length === 0 && !S.sessionState()?.next);
  ok("...and the bar says it is sending", /Sending the recording of 19 Nov/.test(S.floatingBarModel(S.sessionState().state, "", false, S.barExtra()).text));
  // Review: the recorder page already made this teacher's engine: boot's own is dropped, the page's stays.
  let made3 = 0; const other = armRec("idle"); other.unfinished = async () => [];
  await S.boot({ userId: "t-b", createRecorder: async () => { made3++; return other; }, day: day([]) });
  ok("an engine for this teacher already there: it stays", S.sessionState() && r.disposed === 0 && made3 === 0);
  await S.endSession();
  let made2 = 0;
  await S.boot({ userId: "t-c", createRecorder: async () => { made2++; return armRec("idle"); }, day: day([]) });
  eq("no hint and no Ready: nothing is loaded", made2, 0);
  S.setStorageForTests(store);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
