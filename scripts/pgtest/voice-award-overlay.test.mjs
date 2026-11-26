// The voice-award overlay's pure parts: the event emitter with its dedupe, the
// queue (merge of a repeated child, order otherwise), the timeline and helpers.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = async (rel) => {
  const out = await build({ entryPoints: [resolve(repo, rel)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
  const file = join(mkdtempSync(join(tmpdir(), "voice-award-")), "module.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const Q = await load("src/lib/voiceAward/overlayQueue.ts");
const E = await load("src/lib/voiceAward/events.ts");
const T = await load("src/lib/voiceAward/types.ts");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const A = (over = {}) => ({ classId: "c1", studentId: "s1", studentName: "Potato", points: 30, skill: "writing", transactionId: "t1", ...over });

// 1. events: announce reaches listeners once per transaction id
E.resetVoiceAwardEvents();
const got = [];
const off = E.onVoiceAward((a) => got.push(a.transactionId));
E.announceVoiceAward(A({ transactionId: "t1" }));
E.announceVoiceAward(A({ transactionId: "t1" }));
E.announceVoiceAward(A({ transactionId: "t2" }));
E.announceVoiceAward(A({ transactionId: null }));
E.announceVoiceAward(A({ transactionId: null }));
eq("duplicate transaction id announced once; null ids always pass", got, ["t1", "t2", null, null]);
ok("claim after announce says already seen", E.claimVoiceAward("t1") === false);
ok("realtime path can check without claiming", E.voiceAwardSeen("t2") === true && E.voiceAwardSeen("zz") === false);
off();
E.announceVoiceAward(A({ transactionId: "t3" }));
eq("unsubscribe stops delivery", got.length, 4);
const bad = [];
E.onVoiceAward(() => { throw new Error("boom"); });
E.onVoiceAward((a) => bad.push(a.transactionId));
E.announceVoiceAward(A({ transactionId: "t4" }));
eq("a throwing listener does not stop the others", bad, ["t4"]);
for (let i = 0; i < 400; i++) E.claimVoiceAward("x" + i);
ok("seen set is bounded (old ids forgotten)", E.claimVoiceAward("x0") === true);

// 2. queue
let q = Q.emptyQueue();
q = Q.enqueue(q, A({ studentId: "s1", points: 5 }));
q = Q.enqueue(q, A({ studentId: "s2", points: 10, skill: "speaking" }));
q = Q.enqueue(q, A({ studentId: "s1", points: 5 }));
eq("same child merges, other child keeps its place", q.pending.map((p) => [p.award.studentId, p.award.points, p.merged]), [["s1", 10, 2], ["s2", 10, 1]]);
q = Q.enqueue(q, A({ studentId: "s1", points: -3, skill: "focus" }));
eq("merge with another skill drops the skill; negative sums", [q.pending[0].award.points, q.pending[0].award.skill], [7, null]);
q = Q.enqueue(q, A({ classId: "c2", studentId: "s1", points: 1 }));
eq("same child id in another class does not merge", q.pending.length, 3);
const d = Q.dequeue(q);
eq("dequeue takes the oldest", [d.item.award.studentId, d.item.award.classId, d.rest.pending.length], ["s1", "c1", 2]);
eq("dequeue of empty is null", Q.dequeue(Q.emptyQueue()).item, null);

// 3. timeline
const t = Q.timeline();
ok("order of steps", t.enterMs < t.badgeAtMs && t.badgeAtMs < t.refetchAtMs && t.refetchAtMs <= t.resortMs && t.resortMs < t.leaveAtMs && t.leaveAtMs < t.endAtMs);
eq("refetch is 1 s after the badge", t.refetchAtMs - t.badgeAtMs, 1000);
eq("hold after the re-sort is the 5 s of the contract", t.leaveAtMs - t.resortMs, T.VOICE_AWARD_HOLD_MS);
const busy = Q.timeline({ pending: 2 });
ok("shorter hold when more are waiting", busy.leaveAtMs - busy.resortMs < T.VOICE_AWARD_HOLD_MS);
const rm = Q.timeline({ reducedMotion: true });
ok("reduced motion is faster and has the same shape", rm.endAtMs < t.endAtMs && rm.badgeAtMs < rm.refetchAtMs && rm.leaveAtMs - rm.resortMs === T.VOICE_AWARD_HOLD_MS);

// 4. helpers
eq("delta text", [Q.formatDelta(30), Q.formatDelta(-10), Q.formatDelta(0)], ["+30", "−10", "0"]);
eq("moved up two places", Q.moveOf(["a", "b", "c", "d"], ["c", "a", "b", "d"], "c"), { studentId: "c", from: 2, to: 0, places: 2 });
eq("moved down", Q.moveOf(["a", "b", "c"], ["b", "c", "a"], "a").places, -2);
eq("missing child: no move", Q.moveOf(["a"], ["a"], "z"), null);
const w = Q.windowAround([...Array(30).keys()], 29, 9);
eq("window clamps at the end", [w.offset, w.rows.length, w.rows[8]], [21, 9, 29]);
eq("short list is whole", Q.windowAround([1, 2, 3], 1, 9).rows.length, 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
