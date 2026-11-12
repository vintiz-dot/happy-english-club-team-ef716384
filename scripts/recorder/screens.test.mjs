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
const { S, G, U, bar, notice } = M;


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
  // Refusals at arming: a stated one ends that lesson for today; anything else is tried again in 30 s.
  store.m.clear(); T = H("09:45");
  const r = armRec(); S.adopt("t-a", r); S.pressReady("t-a", DATE); S.setPrepared({ contextRunning: true, devicesOk: true });
  r.armFail = { code: "server_unavailable", retryable: true, message: "503" };
  S.startDay(day([L("s1", "10:00", "11:00")])); await flush();
  T = H("09:45") + 10_000; await S.armTick(); await flush();
  const n1 = r.arms.length;
  T = H("09:45") + 31_000; await S.armTick(); await flush();
  ok("R4-2: a failed arm (503) is tried again after 30 s, not at once and not never", n1 === 1 && r.arms.length === 2, `${n1} ${r.arms.length}`);
  r.armFail = { code: "server_refused", retryable: false, refusal: "consent_missing", message: "consent" };
  T = H("09:46") + 30_000; await S.armTick(); await flush(); const n2 = r.arms.length;
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
  const lay = (await import("node:fs")).readFileSync(resolve(repo, "src/components/Layout.tsx"), "utf8");
  const nav = lay.slice(lay.indexOf("const getNavigationItems"), lay.indexOf("const navItems"));
  const entry = /\{ icon: Mic, label: "Class recorder", path: "\/teacher\/recorder" \}/g;
  const adminPart = nav.slice(nav.indexOf('case "admin"'), nav.indexOf('case "teacher"')), teacherPart = nav.slice(nav.indexOf('case "teacher"'), nav.indexOf("default:"));
  ok("sidebar: 'Class recorder' for teachers and admins, and nobody else", (adminPart.match(entry) ?? []).length === 1 && (teacherPart.match(entry) ?? []).length === 1 && (nav.match(entry) ?? []).length === 2 && /default:\s*return \[\];/.test(nav));
  const app = (await import("node:fs")).readFileSync(resolve(repo, "src/App.tsx"), "utf8");
  ok("R4-2: RecorderBoot is mounted once in App", (app.match(/<RecorderBoot \/>/g) ?? []).length === 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
