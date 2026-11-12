import { describe, expect, test } from "bun:test";
import {
  addMinutes, browserCheck, clock, consentGaps, describeInputs, durationWords, errorView, hanoiDate, hanoiMs,
  hhmm, isBluetoothLabel, lessonHeadline, lessonPhase, levelWord, meterFraction, minutesLeft, nextAfter, pairProblems, pickLesson,
  recordingStatusLabel, refusalView, retentionText, stopConfirmText, suggestRoles, swapWarning, uploadMbps, uploadSpeedLine,
  uploadStatus, validReason, batteryLine, type LessonLike,
} from "../src/lib/recorderUi";
import type { RecorderErrorCode, ServerRefusal } from "../src/lib/recorder/errors";

const L = (id: string, start: string, end: string, extra: Partial<LessonLike> = {}): LessonLike => ({
  sessionId: id, classId: "c1", className: "Starters 1", date: "2026-11-12", startTime: start, endTime: end, ...extra,
});
const at = (time: string) => hanoiMs("2026-11-12", time);

describe("time and headline", () => {
  test("headline names the class, the start and the pre-roll", () => {
    expect(lessonHeadline(L("a", "09:00:00", "10:30:00"))).toBe("Starters 1 starts at 09:00 - recording from 08:55");
    expect(lessonHeadline(L("a", "00:03:00", "01:00:00"))).toBe("Starters 1 starts at 00:03 - recording from 23:58");
  });
  test("hhmm and addMinutes", () => {
    expect(hhmm("7:5")).toBe("07:05");
    expect(addMinutes("23:58", 5)).toBe("00:03");
  });
  test("Hanoi is UTC+7", () => {
    expect(new Date(hanoiMs("2026-11-12", "09:00")).toISOString()).toBe("2026-11-12T02:00:00.000Z");
    expect(hanoiDate(Date.parse("2026-11-12T18:00:00Z"))).toBe("2026-11-13");
  });
  test("phases follow the arm window, pre-roll and grace", () => {
    const l = L("a", "09:00", "10:00");
    expect(lessonPhase(l, at("08:30"))).toBe("later");
    expect(lessonPhase(l, at("08:41"))).toBe("arming");
    expect(lessonPhase(l, at("08:55"))).toBe("capturing");
    expect(lessonPhase(l, at("10:09"))).toBe("capturing");
    expect(lessonPhase(l, at("10:10"))).toBe("over");
  });
  test("pickLesson takes the live one, else the next; skips cancelled and over", () => {
    const ls = [L("a", "08:00", "09:00"), L("b", "13:00", "14:00", { status: "Canceled" }), L("c", "15:00", "16:00")];
    expect(pickLesson(ls, at("08:30"))?.sessionId).toBe("a");
    expect(pickLesson(ls, at("09:20"))?.sessionId).toBe("c");
    expect(pickLesson(ls, at("16:30"))).toBeNull();
    expect(nextAfter(ls[0], ls)?.sessionId).toBe("c");
  });
  test("stop confirmation counts the minutes left", () => {
    const l = L("a", "09:00", "10:30");
    expect(stopConfirmText(l, at("10:18"))).toBe("Stop recording? The lesson has 12 minutes left.");
    expect(stopConfirmText(l, at("10:29:30"))).toBe("Stop recording? The lesson has 1 minute left.");
    expect(stopConfirmText(l, at("10:35"))).toBe("Stop recording? The lesson has ended.");
    expect(minutesLeft(l, at("11:00"))).toBe(0);
  });
  test("clock and durations", () => {
    expect(clock(65_000)).toBe("01:05");
    expect(clock(3_725_000)).toBe("1:02:05");
    expect(durationWords(92 * 60000)).toBe("1 h 32 min");
    expect(durationWords(45 * 60000)).toBe("45 min");
    expect(durationWords(20_000)).toBe("under a minute");
  });
});

describe("upload status in plain words", () => {
  const p = (o: Partial<Parameters<typeof uploadStatus>[0] & object>) => ({ total: 10, confirmed: 10, pending: 0, refused: 0, offline: false, late: 0, lateMs: 0, ...o });
  test("all saved / saving N / offline", () => {
    expect(uploadStatus(p({}))[0].text).toBe("All saved");
    expect(uploadStatus(p({ pending: 3 }))[0].text).toBe("Saving 3 pieces");
    expect(uploadStatus(p({ pending: 1 }))[0].text).toBe("Saving 1 piece");
    expect(uploadStatus(p({ pending: 2, offline: true }))[0].text).toBe("Offline - recording continues and will upload when the internet is back");
    expect(uploadStatus(p({ pending: 2 }), false)[0].tone).toBe("warn");
    expect(uploadStatus(null)[0].text).toBe("Nothing to save yet");
  });
  test("late audio says how many minutes will not count", () => {
    const lines = uploadStatus(p({ late: 4, lateMs: 7 * 60000 + 1 }));
    expect(lines[1].text).toBe("Recorded offline too long - the last 8 minutes will not count");
    expect(uploadStatus(p({ late: 1, lateMs: 30000 }))[1].text).toContain("the last 1 minute will");
  });
  test("refused pieces are named, and kept", () => {
    expect(uploadStatus(p({ refused: 2 })).some((l) => l.tone === "error" && /kept on this laptop/.test(l.text))).toBe(true);
  });
  test("speed", () => {
    expect(uploadMbps([{ bytes: 1_000_000, ms: 4000 }])).toBe(2);
    expect(uploadMbps([])).toBeNull();
    expect(uploadSpeedLine(null).tone).toBe("info");
    expect(uploadSpeedLine(0.4).tone).toBe("warn");
    expect(uploadSpeedLine(3).tone).toBe("ok");
  });
});

describe("every engine error has a message and one action", () => {
  const codes: RecorderErrorCode[] = ["permission_denied", "device_missing", "device_ambiguous", "same_device_twice", "device_unplugged", "device_lost",
    "constraint_not_honoured", "audio_context_suspended", "unsupported", "offline", "server_refused", "not_signed_in", "quota", "storage_low",
    "another_tab", "clock_unknown", "internal"];
  const refusals: ServerRefusal[] = ["too_early", "window_closed", "switch_off", "consent_missing", "not_teacher", "no_longer_teaching", "stopped_after_window",
    "session_canceled", "session_invalid", "already_live", "not_your_recording", "recording_closed", "not_started", "track_missing", "stop_requested",
    "span_too_long", "below_byte_floor", "ahead_of_server_clock", "after_stop", "after_window", "conflicting_chunk", "readback_mismatch", "not_in_storage",
    "size_mismatch", "complete_refused", "marker_refused", "device_profile", "unknown"];
  test("codes", () => {
    for (const c of codes) {
      const v = errorView(c);
      expect(v.title.length).toBeGreaterThan(3);
      expect(v.body.length).toBeGreaterThan(10);
      expect(v.action === "none" || v.action === "ask_admin" ? v.actionLabel === null : !!v.actionLabel).toBe(true);
    }
  });
  test("refusals", () => {
    for (const r of refusals) expect(refusalView(r).title.length).toBeGreaterThan(3);
    expect(errorView("server_refused", "switch_off").title).toBe("Recording is switched off for this class");
    expect(errorView("server_refused", "consent_missing").action).toBe("ask_admin");
    expect(errorView("device_unplugged", null, "room").title).toBe("Room microphone was unplugged");
    expect(errorView("permission_denied").action).toBe("allow_mic");
  });
  test("no message uses jargon", () => {
    const all = [...codes.map((c) => errorView(c)), ...refusals.map((r) => refusalView(r))];
    for (const v of all) expect(`${v.title} ${v.body}`).not.toMatch(/AudioContext|constraint|RLS|chunk|JWT|deviceId|PostgREST|SQL/i);
  });
});

describe("meters", () => {
  test("fraction and words", () => {
    expect(meterFraction(-60)).toBe(0);
    expect(meterFraction(0)).toBe(1);
    expect(meterFraction(-120)).toBe(0);
    expect(meterFraction(Number.NaN)).toBe(0);
    expect(levelWord(-80).word).toBe("Silent");
    expect(levelWord(-50).word).toBe("Quiet");
    expect(levelWord(-20).word).toBe("Good");
    expect(levelWord(-20, 3).word).toBe("Too loud");
  });
});

describe("devices", () => {
  const S500 = { deviceId: "s5", groupId: "g1", label: "Echo Cancelling Speakerphone (Anker PowerConf S500)", kind: "audioinput" };
  const LAPEL = { deviceId: "lp", groupId: "g2", label: "Microphone (2- USB Audio Device)", kind: "audioinput" };
  const BUILTIN = { deviceId: "bi", groupId: "g3", label: "Microphone Array (Realtek(R) Audio)", kind: "audioinput" };
  const BT = { deviceId: "bt", groupId: "g4", label: "Headset (Anker PowerConf S500 Hands-Free AG Audio)", kind: "audioinput" };
  const DEF = { deviceId: "default", groupId: "g1", label: "Default - Echo Cancelling Speakerphone (Anker PowerConf S500)", kind: "audioinput" };
  test("aliases are dropped and roles guessed from labels", () => {
    const rows = describeInputs([DEF, S500, LAPEL, BUILTIN]);
    expect(rows.map((r) => r.device.deviceId)).toEqual(["s5", "lp", "bi"]);
    expect(suggestRoles([DEF, S500, LAPEL, BUILTIN])).toEqual({ teacher: "lp", room: "s5" });
  });
  test("Bluetooth is recognised and never guessed", () => {
    expect(isBluetoothLabel(BT.label)).toBe(true);
    expect(suggestRoles([BT, LAPEL]).room).toBeNull();
    expect(pairProblems([BT, LAPEL], "lp", "bt").join(" ")).toMatch(/Bluetooth.*USB/);
  });
  test("pair problems", () => {
    expect(pairProblems([S500, LAPEL], "lp", "s5")).toEqual([]);
    expect(pairProblems([S500, LAPEL], "lp", "lp")).toContain("Choose two different microphones.");
    expect(pairProblems([S500, LAPEL, BUILTIN], "bi", "s5").join(" ")).toMatch(/laptop's own/);
    expect(pairProblems([S500, LAPEL], "s5", "lp").join(" ")).toMatch(/should be the room/);
    expect(pairProblems([S500], null, "s5")).toContain("Choose which microphone is yours.");
  });
  test("swap warning uses the engine's verdict", () => {
    expect(swapWarning({ activeWindows: 40, roomLouderFraction: 0.9, medianTeacherMinusRoomDb: -8, verdict: "maybe_swapped" }))
      .toBe("It looks like these are the other way round - speak normally and check");
    expect(swapWarning({ activeWindows: 40, roomLouderFraction: 0.1, medianTeacherMinusRoomDb: 8, verdict: "looks_right" })).toBeNull();
    expect(swapWarning(null)).toBeNull();
  });
});

describe("environment", () => {
  test("browsers", () => {
    expect(browserCheck("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36").ok).toBe(true);
    expect(browserCheck("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0").name).toBe("Microsoft Edge");
    expect(browserCheck("Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0").ok).toBe(false);
    expect(browserCheck("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/128 coc_coc_browser/128 Safari/537.36").ok).toBe(false);
    expect(browserCheck("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17 Safari/605.1.15").ok).toBe(false);
    expect(browserCheck("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36").ok).toBe(false);
  });
  test("battery", () => {
    expect(batteryLine(null)).toBeNull();
    expect(batteryLine({ charging: true, level: 0.5 })!.tone).toBe("ok");
    expect(batteryLine({ charging: false, level: 0.42 })!.text).toContain("42%");
  });
});

describe("admin", () => {
  test("consent gaps follow the current wording", () => {
    const kids = [{ student_id: "1", name: "Lan" }, { student_id: "2", name: "An" }, { student_id: "3", name: "Binh" }, { student_id: "4", name: "Chi" }, { student_id: "4", name: "Chi" }];
    const rows = [
      { student_id: "1", status: "granted", wording_version: "v2" },
      { student_id: "2", status: "granted", wording_version: "v1" },
      { student_id: "3", status: "withdrawn", wording_version: "v2" },
    ];
    expect(consentGaps(kids, rows, "v2")).toEqual([
      { student_id: "2", name: "An", reason: "old_wording", wording: "v1" },
      { student_id: "3", name: "Binh", reason: "withdrawn", wording: "v2" },
      { student_id: "4", name: "Chi", reason: "none" },
    ]);
    // An unreadable wording is a gap for every child (the server treats NULL as a refusal).
    expect(consentGaps(kids, rows, null)).toHaveLength(4);
  });
  test("labels", () => {
    expect(recordingStatusLabel("complete")).toBe("Saved");
    expect(recordingStatusLabel("complete", true)).toBe("Deletion requested");
    expect(retentionText({ delete_after: "2026-12-12" }, (s) => s)).toBe("Kept until 2026-12-12");
    expect(retentionText({ delete_after: "x", deletion_requested_at: "y" }, (s) => s)).toBe("Deleted at the next nightly run");
    expect(validReason("  ")).toBe(false);
    expect(validReason("Parent asked")).toBe(true);
  });
});
