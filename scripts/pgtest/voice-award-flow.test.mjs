// The voice-award command flow's pure decisions (src/lib/voiceAward/flow.ts):
// what to do with a parse given the card that is open, undo eligibility, the
// note the board overlay reads its skill from, the key a save uses.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = async (rel) => {
  const out = await build({ entryPoints: [resolve(repo, rel)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
  const file = join(mkdtempSync(join(tmpdir(), "voice-award-flow-")), "module.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const F = await load("src/lib/voiceAward/flow.ts");
const T = await load("src/lib/voiceAward/types.ts");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const P = (over = {}) => ({
  intent: "award", studentId: "s1", studentName: "Potato", points: 30, skill: "writing",
  heard: "HEC add 30 stars to Potato for writing", confidence: "high", reason: null, ...over,
});

// 1. a sure award shows a counting card; an unsure one waits
let a = F.decide(P(), null);
ok("sure award shows a card", a.type === "show" && a.award.sure === true && a.award.reason === null);
eq("card title", F.cardTitle(a.award), "Potato +30 Writing");
a = F.decide(P({ confidence: "low", reason: "I heard two names" }), null);
ok("unsure award shows a waiting card with the reason", a.type === "show" && a.award.sure === false && a.award.reason === "I heard two names");
a = F.decide(P({ confidence: "low", reason: null }), null);
ok("unsure with no reason still says why", a.type === "show" && typeof a.award.reason === "string" && a.award.reason.length > 0);

// 2. limits
eq("100 is allowed", F.decide(P({ points: 100 }), null).type, "show");
eq("-100 is allowed", F.decide(P({ points: -100 }), null).type, "show");
eq("101 is refused", F.decide(P({ points: 101 }), null).type, "say");
eq("-101 is refused", F.decide(P({ points: -101 }), null).type, "say");
eq("zero is refused", F.decide(P({ points: 0 }), null).type, "say");
eq("no points is refused", F.decide(P({ points: null }), null).type, "say");
eq("fractions are refused", F.decide(P({ points: 2.5 }), null).type, "say");
eq("no child is refused", F.decide(P({ studentId: null, studentName: null }), null).type, "say");
a = F.decide(P({ points: -10 }), null);
eq("a deduction shows with a real minus", F.cardTitle(a.award), "Potato −10 Writing");
a = F.decide(P({ skill: null }), null);
eq("no skill reads as Participation", F.cardTitle(a.award), "Potato +30 Participation");

// 3. the card that is open
const counting = { kind: "counting", award: F.decide(P(), null).award };
const waiting = { kind: "waiting", award: F.decide(P({ confidence: "low" }), null).award };
eq("yes saves a waiting card", F.decide(P({ intent: "confirm" }), waiting).type, "save");
eq("yes saves a counting card at once", F.decide(P({ intent: "confirm" }), counting).type, "save");
eq("yes with no card says so", F.decide(P({ intent: "confirm" }), null).type, "say");
eq("cancel drops the card", F.decide(P({ intent: "cancel" }), waiting).type, "drop");
eq("cancel with no card says so", F.decide(P({ intent: "cancel" }), null).type, "say");
eq("a new award replaces an open card", F.decide(P({ studentId: "s2", studentName: "Lan" }), counting).type, "show");
eq("undo with a card open drops the card, not an older award", F.decide(P({ intent: "undo" }), counting).type, "drop");
eq("undo with a waiting card drops it too", F.decide(P({ intent: "undo" }), waiting).type, "drop");
eq("undo with no card is an undo request", F.decide(P({ intent: "undo" }), null).type, "undo");
eq("an unsure yes does nothing but ask again", F.decide(P({ intent: "confirm", confidence: "low" }), waiting).type, "say");
eq("an unsure undo does nothing but ask again", F.decide(P({ intent: "undo", confidence: "low" }), null).type, "say");
eq("an unsure undo with a card does not drop it", F.decide(P({ intent: "undo", confidence: "low" }), counting).type, "say");
eq("an unsure cancel still drops the card", F.decide(P({ intent: "cancel", confidence: "low" }), counting).type, "drop");
eq("none says something", F.decide(P({ intent: "none", reason: "no command" }), null).type, "say");

// 4. undo eligibility: only this teacher's, only this lesson, not twice
const S = (over = {}) => ({
  transactionId: "t1", studentId: "s1", studentName: "Potato", points: 30, skill: "writing",
  classId: "c1", sessionId: "L1", createdBy: "me", savedAt: 1, undone: false, ...over,
});
const ctx = { userId: "me", sessionId: "L1" };
eq("nothing saved: nothing to undo", F.lastUndoable([], ctx), null);
eq("the newest of mine in this lesson", F.lastUndoable([S({ transactionId: "a" }), S({ transactionId: "b" })], ctx)?.transactionId, "b");
eq("skips an undone one", F.lastUndoable([S({ transactionId: "a" }), S({ transactionId: "b", undone: true })], ctx)?.transactionId, "a");
eq("another lesson is not undoable", F.lastUndoable([S({ sessionId: "L0" })], ctx), null);
eq("another teacher's is not undoable", F.lastUndoable([S({ createdBy: "other" })], ctx), null);
eq("no lesson running: nothing", F.lastUndoable([S()], { userId: "me", sessionId: null }), null);
eq("not signed in: nothing", F.lastUndoable([S()], { userId: null, sessionId: "L1" }), null);
ok("undo sentence names the award", F.undoSentence(S()) === "Removed Potato +30 Writing.");
ok("undo sentence when nothing", /Nothing to undo/.test(F.undoSentence(null)));

// 5. the note: the overlay finds the skill right after the prefix
const overlaySkill = (notes) => {
  const n = notes.slice(T.VOICE_AWARD_NOTE_PREFIX.length).toLowerCase();
  return T.VOICE_AWARD_SKILLS.find((s) => n.includes(s)) ?? null;
};
for (const s of T.VOICE_AWARD_SKILLS) {
  eq(`note keeps skill ${s}`, overlaySkill(F.formatNote(s, `HEC add 5 to Minh for ${s}`)), s);
}
eq("a heard skill word is not mistaken for the skill", overlaySkill(F.formatNote("writing", "add 5 to Minh for speaking and writing")), "writing");
eq("no skill: no skill read", overlaySkill(F.formatNote(null, "add 5 to Minh")), null);
eq("no skill but heard names one: still none", overlaySkill(F.formatNote(null, "add 5 for focus")), null);
ok("note starts with the prefix", F.formatNote("writing", "hi").startsWith(T.VOICE_AWARD_NOTE_PREFIX));
ok("quotes in speech are dropped", !F.formatNote("writing", 'he said "hi"').includes('"'));
ok("long speech is cut", F.formatNote("writing", "x".repeat(500)).length < 160);
ok("undo note starts with the prefix and the word undo", F.formatUndoNote(S()).startsWith(`${T.VOICE_AWARD_NOTE_PREFIX}undo`));
eq("undo note names no skill to the overlay", overlaySkill(F.formatUndoNote(S({ skill: null }))), null);

// 6. what a save writes
eq("a skill award saves as the skill", F.saveKey({ points: 5, skill: "speaking" }), "speaking");
eq("a plain award saves as participation", F.saveKey({ points: 5, skill: null }), "participation");
eq("a deduction saves as a correction (a skill score cannot be negative)", F.saveKey({ points: -5, skill: "speaking" }), "correction");
eq("skill award writes a skill row", F.writesSkillRow({ points: 5, skill: "speaking" }), true);
eq("plain award writes none", F.writesSkillRow({ points: 5, skill: null }), false);
eq("deduction writes none", F.writesSkillRow({ points: -5, skill: "speaking" }), false);

// 7. every failure has a sentence
for (const code of ["no_lesson", "no_attendance", "not_teacher", "bad_audio", "model_failed", "rate_limited"]) {
  const s = F.failureSentence({ ok: false, code, error: "x" });
  ok(`failure ${code} has a sentence`, typeof s === "string" && s.length > 10 && s !== "x");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
