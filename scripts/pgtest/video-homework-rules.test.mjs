// The rules of video homework that are deliberately NOT left to the model:
// the weighted score, the grade bands, the rubric clean-up, the
// pronunciation arithmetic and what counts as a knowledge gap.
//
// Drives the real src/lib/videoHomework.ts (its Deno copy is held identical
// by mirrors.test.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(resolve(repo, "src/lib/videoHomework.ts"), "utf8");
const out = resolve(tmpdir(), `videoHomework.${process.pid}.mjs`);
writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
const m = await import(pathToFileURL(out).href);

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const okay = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${okay ? "PASS" : "FAIL"}  ${n}${okay ? "" : ` :: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  okay ? pass++ : fail++;
};

console.log("=== the score is the rubric's arithmetic, not the model's ===");
const rubric = [
  { key: "task", label: "Did the task", description: "", weight: 3 },
  { key: "pron", label: "Clear", description: "", weight: 1 },
];
eq("all 4s is 100", m.weightedScore(rubric, [{ key: "task", score: 4 }, { key: "pron", score: 4 }]), 100);
eq("weights count: task 4, pron 0 -> 75", m.weightedScore(rubric, [{ key: "task", score: 4 }, { key: "pron", score: 0 }]), 75);
eq("a criterion the model skipped counts as zero", m.weightedScore(rubric, [{ key: "pron", score: 4 }]), 25);
eq("an invented criterion adds nothing", m.weightedScore(rubric, [{ key: "task", score: 4 }, { key: "bonus", score: 4 }]), 75);
eq("a score above the max is held at the max", m.weightedScore(rubric, [{ key: "task", score: 9 }, { key: "pron", score: 4 }]), 100);

console.log("=== grade bands match the teacher's grading screen ===");
eq("90 is Superstar", m.gradeForScore(90), "Superstar");
eq("89 is Amazing", m.gradeForScore(89), "Amazing");
eq("70 is Great Job", m.gradeForScore(70), "Great Job");
eq("49 is Needs Help", m.gradeForScore(49), "Needs Help");

console.log("=== rubric clean-up ===");
{
  const r = m.normalizeRubric([
    { label: "Did the task", weight: 3 },
    { label: "Did the task", weight: 2 },
    { label: "", weight: 1 },
    { label: "Phát âm rõ", weight: -4 },
  ]);
  eq("blank labels dropped, duplicates get their own key", r.map((c) => c.key), ["did_the_task", "did_the_task_2", "phat_am_ro"]);
  eq("a bad weight becomes 1", r[2].weight, 1);
  eq("fewer than two usable criteria falls back to the defaults", m.normalizeRubric([{ label: "Only one" }]).length, m.DEFAULT_CRITERIA.length);
  eq("never more than six", m.normalizeRubric(Array.from({ length: 9 }, (_, i) => ({ label: `C${i}` }))).length, 6);
}

console.log("=== pronunciation arithmetic ===");
{
  const phrase = (words, acc, flu, dur = 30_000_000) => ({
    Duration: dur,
    NBest: [{
      PronunciationAssessment: { AccuracyScore: acc, FluencyScore: flu, ProsodyScore: 70, PronScore: acc },
      Words: words.map(([w, a, t = "None"]) => ({ Word: w, PronunciationAssessment: { AccuracyScore: a, ErrorType: t } })),
    }],
  });
  const s = m.aggregatePronunciation([
    phrase([["i", 95], ["went", 90], ["to", 95], ["the", 40, "Mispronunciation"]], 80, 90),
    phrase([["um", 90]], 20, 10),
    { not: "a result" },
  ]);
  eq("weighted by words: (80*4 + 20*1) / 5 = 68", s.accuracy, 68);
  eq("fluency likewise", s.fluency, 74);
  eq("words assessed", s.words_assessed, 5);
  eq("seconds from Azure's 100ns ticks", s.seconds_assessed, 6);
  eq("the hard word is listed", s.weak_words.map((w) => w.word), ["the"]);
  eq("nothing usable is null, not zeros", m.aggregatePronunciation([{}, null]), null);
}

console.log("=== a knowledge gap is a pattern, not one slip ===");
{
  const v = (date, score, gaps) => ({ video_submission_id: date, homework_title: date, date, score, criteria: [], gaps });
  const past = { error_type: "grammar", error_text: "I go yesterday", corrected_text: "I went yesterday", cefr_topic: "past simple" };
  const th = { error_type: "pronunciation", error_text: "three", corrected_text: "th: tongue between teeth", cefr_topic: "th sound" };
  const p = m.summarizeProgress([
    v("2026-10-01", 60, [past]),
    v("2026-10-08", 64, [past, th]),
    v("2026-10-15", 78, [{ error_type: "vocabulary", error_text: "very big happy", corrected_text: "very happy", cefr_topic: "intensifiers" }]),
  ]);
  eq("past simple came up twice: recurring", p.recurring.map((r) => [r.topic, r.times]), [["past simple", 2]]);
  eq("the th sound came up once: not a gap yet", p.recurring.some((r) => r.topic === "th sound"), false);
  eq("the latest video's new point is listed as recent", p.recent.map((r) => r.topic), ["intensifiers"]);
  eq("78 after 60 and 64 is up", p.trend, "up");
  eq("one video has no trend", m.summarizeProgress([v("2026-10-01", 60, [])]).trend, null);
}

console.log("=== timestamps ===");
eq("65 seconds", m.formatTimestamp(65), "1:05");
eq("null is blank", m.formatTimestamp(null), "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
