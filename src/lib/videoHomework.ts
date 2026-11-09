/**
 * videoHomework.ts - the rules of video homework, in one place.
 *
 * MIRRORED at supabase/functions/_lib/video-homework.ts (Deno cannot import
 * from src/). Change one, copy it to the other; scripts/pgtest/mirrors.test.mjs
 * fails if they drift. It imports nothing, which is what makes copying safe.
 *
 * What lives here, and why it is not left to the model:
 *   - the score is a weighted sum of the rubric's criteria, worked out here.
 *     The model scores each criterion with evidence; it never picks the
 *     final number.
 *   - the grade names and their point bands match the teacher's grading
 *     screen, so an AI suggestion reads the same as a teacher's grade.
 *   - the pronunciation summary is arithmetic over Azure's word scores.
 */

export const VIDEO_GRADE_BANDS = [
  { value: "Superstar", label: "⭐ Superstar", min: 90 },
  { value: "Amazing", label: "🌟 Amazing", min: 80 },
  { value: "Great Job", label: "👍 Great Job", min: 70 },
  { value: "Good Try", label: "👌 Good Try", min: 60 },
  { value: "Keep Trying", label: "💪 Keep Trying", min: 50 },
  { value: "Needs Help", label: "🤝 Needs Help", min: 0 },
] as const;

export const CRITERION_MAX = 4;

export interface RubricCriterion {
  key: string;
  label: string;
  description: string;
  weight: number;
}

export interface CriterionScore {
  key: string;
  label?: string;
  score: number;
  max?: number;
  comment?: string;
  evidence?: { t: number | null; quote: string }[];
}

export const DEFAULT_CRITERIA: RubricCriterion[] = [
  { key: "task", label: "Did the task", description: "Talks about what the homework asked for, from start to finish.", weight: 3 },
  { key: "language", label: "Used this week's English", description: "Uses the target words and grammar from class.", weight: 3 },
  { key: "pronunciation", label: "Clear pronunciation", description: "Words are easy to understand.", weight: 2 },
  { key: "fluency", label: "Speaks smoothly", description: "Keeps going without long stops; natural pace.", weight: 1 },
  { key: "effort", label: "Effort and creativity", description: "Shows things, adds personal ideas, is lively.", weight: 1 },
];

/** Grade name for a 0-100 score. */
export function gradeForScore(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of VIDEO_GRADE_BANDS) {
    if (s >= band.min) return band.value;
  }
  return "Needs Help";
}

/** A lowercase slug, safe as a criterion key. */
export function criterionKey(label: string): string {
  return String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * A rubric as the screens and the model may use it: 2 to 6 criteria, each
 * with a unique key, a label and a positive weight. Anything unusable is
 * dropped; an empty result falls back to the defaults.
 */
export function normalizeRubric(raw: unknown): RubricCriterion[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: RubricCriterion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const label = String(r.label ?? "").trim().slice(0, 60);
    if (!label) continue;
    let key = criterionKey(String(r.key ?? "") || label) || `c${out.length + 1}`;
    while (seen.has(key)) key = `${key}_${out.length + 1}`;
    const weight = Number(r.weight);
    out.push({
      key,
      label,
      description: String(r.description ?? "").trim().slice(0, 240),
      weight: Number.isFinite(weight) && weight > 0 ? Math.min(weight, 10) : 1,
    });
    seen.add(key);
    if (out.length === 6) break;
  }
  return out.length >= 2 ? out : DEFAULT_CRITERIA.map((c) => ({ ...c }));
}

/**
 * The 0-100 score: each criterion's score over its max, weighted by the
 * rubric. A criterion the model did not score counts as zero, so a model
 * that skips the hard one cannot raise the grade by omission.
 */
export function weightedScore(criteria: RubricCriterion[], scores: CriterionScore[]): number {
  const byKey = new Map(scores.map((s) => [s.key, s]));
  let total = 0;
  let weights = 0;
  for (const c of criteria) {
    const w = c.weight > 0 ? c.weight : 0;
    weights += w;
    const s = byKey.get(c.key);
    if (!s) continue;
    const max = s.max && s.max > 0 ? s.max : CRITERION_MAX;
    const frac = Math.max(0, Math.min(1, Number(s.score) / max));
    total += Number.isFinite(frac) ? frac * w : 0;
  }
  if (weights === 0) return 0;
  return Math.round((total / weights) * 100);
}

/** "1:05" for 65 seconds. */
export function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ------------------------------------------------------------ pronunciation

export interface PronunciationSummary {
  accuracy: number | null;
  fluency: number | null;
  prosody: number | null;
  completeness: number | null;
  pronunciation: number | null;
  words_assessed: number;
  seconds_assessed: number;
  weak_words: { word: string; accuracy: number; error_type: string }[];
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fold Azure's per-utterance results (the parsed JSON of each recognized
 * phrase) into one summary for the whole video. Scores are weighted by the
 * number of words in each phrase, so a long sentence counts for more than
 * "um, yes". Weak words are the lowest-accuracy distinct words, at most 12.
 */
export function aggregatePronunciation(results: unknown[]): PronunciationSummary | null {
  let words = 0;
  let seconds = 0;
  const sums = { accuracy: 0, fluency: 0, prosody: 0, completeness: 0, pronunciation: 0 };
  const weights = { accuracy: 0, fluency: 0, prosody: 0, completeness: 0, pronunciation: 0 };
  const weak = new Map<string, { word: string; accuracy: number; error_type: string }>();

  for (const raw of results) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, any>;
    const best = Array.isArray(r.NBest) ? r.NBest[0] : null;
    if (!best) continue;
    const pa = best.PronunciationAssessment ?? {};
    const list = Array.isArray(best.Words) ? best.Words : [];
    const n = list.length;
    if (n === 0) continue;
    words += n;
    const dur = num(r.Duration);
    if (dur !== null) seconds += dur / 10_000_000;

    const fields: [keyof typeof sums, unknown][] = [
      ["accuracy", pa.AccuracyScore],
      ["fluency", pa.FluencyScore],
      ["prosody", pa.ProsodyScore],
      ["completeness", pa.CompletenessScore],
      ["pronunciation", pa.PronScore],
    ];
    for (const [k, v] of fields) {
      const x = num(v);
      if (x === null) continue;
      sums[k] += x * n;
      weights[k] += n;
    }

    for (const w of list) {
      const word = String(w?.Word ?? "").toLowerCase().trim();
      const acc = num(w?.PronunciationAssessment?.AccuracyScore);
      const type = String(w?.PronunciationAssessment?.ErrorType ?? "None");
      if (!word || acc === null) continue;
      if (acc >= 60 && type === "None") continue;
      const prev = weak.get(word);
      if (!prev || acc < prev.accuracy) weak.set(word, { word, accuracy: Math.round(acc), error_type: type });
    }
  }

  if (words === 0) return null;
  const avg = (k: keyof typeof sums) => (weights[k] ? Math.round(sums[k] / weights[k]) : null);
  return {
    accuracy: avg("accuracy"),
    fluency: avg("fluency"),
    prosody: avg("prosody"),
    completeness: avg("completeness"),
    pronunciation: avg("pronunciation"),
    words_assessed: words,
    seconds_assessed: Math.round(seconds),
    weak_words: [...weak.values()].sort((a, b) => a.accuracy - b.accuracy).slice(0, 12),
  };
}

// ---------------------------------------------------------------- progress

export interface ProgressVideo {
  video_submission_id: string;
  homework_title: string;
  date: string;
  score: number | null;
  criteria: { key: string; label: string; score: number; max: number }[];
  pronunciation?: { accuracy: number | null; fluency: number | null; prosody: number | null } | null;
  gaps: { error_type?: string; error_text?: string; corrected_text?: string; cefr_topic?: string }[];
}

export interface ProgressSummary {
  count: number;
  latestScore: number | null;
  trend: "up" | "down" | "steady" | null;
  scores: { date: string; score: number; title: string }[];
  /** Topics that came up in two or more of the last five videos. */
  recurring: { topic: string; type: string; times: number; example?: string; fix?: string }[];
  /** The latest video's focus areas that are not recurring. */
  recent: { topic: string; type: string; example?: string; fix?: string }[];
}

const gapTopic = (g: ProgressVideo["gaps"][number]) =>
  String(g.cefr_topic || g.corrected_text || g.error_text || "").trim().toLowerCase();

/** What the progress card shows: the score line and the knowledge gaps. */
export function summarizeProgress(videos: ProgressVideo[]): ProgressSummary {
  const sorted = [...videos].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const scores = sorted
    .filter((v) => typeof v.score === "number")
    .map((v) => ({ date: v.date, score: v.score as number, title: v.homework_title }));
  const latest = scores.length ? scores[scores.length - 1].score : null;

  let trend: ProgressSummary["trend"] = null;
  if (scores.length >= 2) {
    const last = scores.slice(-2);
    const prior = scores.slice(-5, -1);
    const priorAvg = prior.reduce((s, x) => s + x.score, 0) / prior.length;
    const diff = last[1].score - priorAvg;
    trend = diff >= 5 ? "up" : diff <= -5 ? "down" : "steady";
  }

  const window = sorted.slice(-5);
  const counts = new Map<string, { topic: string; type: string; times: number; example?: string; fix?: string }>();
  for (const v of window) {
    const seen = new Set<string>();
    for (const g of v.gaps ?? []) {
      const t = gapTopic(g);
      if (!t || seen.has(t)) continue;
      seen.add(t);
      const prev = counts.get(t);
      counts.set(t, {
        topic: g.cefr_topic || g.corrected_text || g.error_text || t,
        type: g.error_type || "other",
        times: (prev?.times ?? 0) + 1,
        example: g.error_text ?? prev?.example,
        fix: g.corrected_text ?? prev?.fix,
      });
    }
  }
  const recurring = [...counts.entries()]
    .filter(([, c]) => c.times >= 2)
    .map(([, c]) => c)
    .sort((a, b) => b.times - a.times)
    .slice(0, 6);
  const recurringKeys = new Set(recurring.map((r) => r.topic.toLowerCase()));
  const last = sorted[sorted.length - 1];
  const recent = (last?.gaps ?? [])
    .filter((g) => gapTopic(g) && !recurringKeys.has(String(g.cefr_topic || g.corrected_text || g.error_text || "").toLowerCase()))
    .slice(0, 4)
    .map((g) => ({
      topic: g.cefr_topic || g.corrected_text || g.error_text || "",
      type: g.error_type || "other",
      example: g.error_text,
      fix: g.corrected_text,
    }));

  return { count: sorted.length, latestScore: latest, trend, scores, recurring, recent };
}
