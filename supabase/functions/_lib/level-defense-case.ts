/**
 * Defend My Level: the facts and the combined case (pure, imports nothing).
 *
 * `buildPortfolio` turns the rows cefr-defense reads (lessons, homework,
 * skill scores, approved videos, words, cards, standardized tests, approved
 * CEFR points) into plain facts: counts, averages, dates. No model output
 * goes in, so the child may see it on Defend My Level.
 *
 * `combineCase` weighs every level the school holds for the child into one
 * defended / not defended answer for STAFF:
 *   standardized test, taken in the last 18 months   weight 3 (older 1; >36 months ignored)
 *   level a teacher approved, last 12 months         weight 2 (the two latest)
 *   the adaptive defence test's estimate (latest)    weight 2
 *   the evidence audit's recommendation (AI)         weight 1
 * The combined level is the weighted median; the claim is defended when it
 * reaches the claimed level. It is a summary for the teacher, never a level
 * on the chart: that still only comes from a teacher approving a draft.
 * scripts/pgtest/level-defense-case.test.mjs holds the worked examples.
 */

export const CASE_LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"] as const;

/** "A2+" counts as A2, "C2" as C1 (the claim's scale stops at C1). Unknown -> -1. */
export function baseLevelIndex(level: string | null | undefined): number {
  if (!level) return -1;
  const l = String(level).trim().replace(/\+$/, "");
  if (l === "C2") return CASE_LEVELS.length - 1;
  return (CASE_LEVELS as readonly string[]).indexOf(l);
}

const DAY = 86_400_000;
const monthsBetween = (from: string, to: Date) =>
  (to.getTime() - new Date(from).getTime()) / (30.44 * DAY);

export interface CaseSource {
  kind: "standardized" | "teacher_level" | "defense_test" | "evidence_audit";
  label: string;
  level: string;
  date: string | null;
  weight: number;
}

export interface CaseInput {
  claimed: string;
  standardized: Array<{ test_name: string; test_date: string; cefr_level: string; score_label?: string | null }>;
  approvedPoints: Array<{ level: string; assessed_at: string; source?: string | null }>;
  testEstimate?: { level: string; date: string | null } | null;
  auditLevel?: { level: string; date: string | null } | null;
  today?: Date;
}

export interface DefenseCase {
  claimed: string;
  sources: CaseSource[];
  combined_level: string | null;
  defended: boolean | null;
  /** The plain reason, for the teacher. */
  summary: string;
  /** A recent standardized result below the claim - worth a look whatever the median says. */
  standardized_below_claim: boolean;
}

export function combineCase(input: CaseInput): DefenseCase {
  const today = input.today ?? new Date();
  const sources: CaseSource[] = [];

  for (const t of input.standardized) {
    if (baseLevelIndex(t.cefr_level) < 0 || !t.test_date) continue;
    const age = monthsBetween(t.test_date, today);
    if (age > 36) continue;
    sources.push({
      kind: "standardized",
      label: t.score_label ? `${t.test_name} (${t.score_label})` : t.test_name,
      level: t.cefr_level,
      date: t.test_date,
      weight: age <= 18 ? 3 : 1,
    });
  }

  const recentPoints = input.approvedPoints
    .filter((p) => baseLevelIndex(p.level) >= 0 && p.assessed_at && monthsBetween(p.assessed_at, today) <= 12)
    .sort((a, b) => String(b.assessed_at).localeCompare(String(a.assessed_at)))
    .slice(0, 2);
  for (const p of recentPoints) {
    sources.push({ kind: "teacher_level", label: "Level approved by a teacher", level: p.level, date: p.assessed_at, weight: 2 });
  }

  if (input.testEstimate && baseLevelIndex(input.testEstimate.level) >= 0) {
    sources.push({ kind: "defense_test", label: "Adaptive defence test", level: input.testEstimate.level, date: input.testEstimate.date, weight: 2 });
  }
  if (input.auditLevel && baseLevelIndex(input.auditLevel.level) >= 0) {
    sources.push({ kind: "evidence_audit", label: "Evidence audit (AI)", level: input.auditLevel.level, date: input.auditLevel.date, weight: 1 });
  }

  const claimedIdx = baseLevelIndex(input.claimed);
  const belowClaim = input.standardized.some((t) =>
    t.test_date && monthsBetween(t.test_date, today) <= 18 &&
    baseLevelIndex(t.cefr_level) >= 0 && baseLevelIndex(t.cefr_level) < claimedIdx);

  if (!sources.length) {
    return {
      claimed: input.claimed, sources, combined_level: null, defended: null,
      standardized_below_claim: false,
      summary: "No levels to weigh yet: record a standardized test, run the evidence audit or let the child take the defence test.",
    };
  }

  // Weighted median by level index (lower median on an exact tie: the cautious side).
  const expanded = sources
    .map((s) => ({ i: baseLevelIndex(s.level), w: s.weight }))
    .sort((a, b) => a.i - b.i);
  const total = expanded.reduce((n, s) => n + s.w, 0);
  let run = 0, medianIdx = expanded[0].i;
  for (const s of expanded) {
    run += s.w;
    if (run >= total / 2) { medianIdx = s.i; break; }
  }
  const combined = CASE_LEVELS[medianIdx];
  const defended = claimedIdx >= 0 ? medianIdx >= claimedIdx : null;
  const kinds = new Set(sources.map((s) => s.kind));
  const parts = [
    `${sources.length} source${sources.length === 1 ? "" : "s"} weighed`,
    kinds.has("standardized") ? "including a standardized test" : "no standardized test yet",
  ];
  const summary = defended
    ? `Defended: the case puts the child at ${combined}, reaching the claimed ${input.claimed} (${parts.join(", ")}).`
    : `Not defended yet: the case puts the child at ${combined}, below the claimed ${input.claimed} (${parts.join(", ")}).`;
  return {
    claimed: input.claimed, sources, combined_level: combined, defended,
    standardized_below_claim: belowClaim,
    summary: belowClaim ? `${summary} A recent standardized result is below the claim.` : summary,
  };
}

export interface PortfolioRows {
  attendance: Array<{ status: string }>;
  homework: Array<{ status: string; grade: string | null; graded_at: string | null }>;
  skills: Array<{ skill: string; score: number; date: string }>;
  videos: Array<{ final_score: number | null; approved_at: string | null }>;
  vocabulary: Array<{ mastery_level: number | null; cefr: string | null }>;
  srsCards: number;
  errors: number;
  lessonReports: number;
  examReports: Array<{ title: string; exam_date: string | null }>;
  standardized: Array<{ test_name: string; test_date: string; cefr_level: string; score_label: string | null }>;
  approvedPoints: Array<{ level: string; assessed_at: string }>;
}

export interface Portfolio {
  lessons_attended: number;
  homework_done: number;
  homework_graded: number;
  skill_averages: Record<string, { average: number; count: number; latest: string }>;
  videos_approved: number;
  video_average: number | null;
  words_learned: number;
  words_mastered: number;
  words_by_level: Record<string, number>;
  review_cards: number;
  mistakes_corrected: number;
  lesson_reports: number;
  exam_reports: Array<{ title: string; date: string | null }>;
  standardized: Array<{ test_name: string; date: string; level: string; score: string | null }>;
  approved_levels: Array<{ level: string; date: string }>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildPortfolio(r: PortfolioRows): Portfolio {
  const skill: Record<string, { sum: number; count: number; latest: string }> = {};
  for (const s of r.skills) {
    if (typeof s.score !== "number" || !s.skill) continue;
    const k = skill[s.skill] ?? (skill[s.skill] = { sum: 0, count: 0, latest: "" });
    k.sum += s.score; k.count++;
    if (String(s.date) > k.latest) k.latest = String(s.date);
  }
  const skill_averages: Portfolio["skill_averages"] = {};
  for (const [k, v] of Object.entries(skill)) skill_averages[k] = { average: round1(v.sum / v.count), count: v.count, latest: v.latest };

  const videos = r.videos.filter((v) => v.approved_at);
  const scored = videos.filter((v) => typeof v.final_score === "number") as Array<{ final_score: number }>;
  const words_by_level: Record<string, number> = {};
  for (const w of r.vocabulary) {
    const l = w.cefr ? String(w.cefr).toUpperCase().replace("PRE-A1", "Pre-A1") : "unlevelled";
    words_by_level[l] = (words_by_level[l] ?? 0) + 1;
  }
  return {
    lessons_attended: r.attendance.filter((a) => a.status === "Present" || a.status === "Late").length,
    homework_done: r.homework.filter((h) => h.status !== "assigned" && h.status !== "pending").length,
    homework_graded: r.homework.filter((h) => h.graded_at || h.grade).length,
    skill_averages,
    videos_approved: videos.length,
    video_average: scored.length ? Math.round(scored.reduce((n, v) => n + v.final_score, 0) / scored.length) : null,
    words_learned: r.vocabulary.length,
    words_mastered: r.vocabulary.filter((w) => (w.mastery_level ?? 0) >= 4).length,
    words_by_level,
    review_cards: r.srsCards,
    mistakes_corrected: r.errors,
    lesson_reports: r.lessonReports,
    exam_reports: r.examReports.map((e) => ({ title: e.title, date: e.exam_date })),
    standardized: r.standardized.map((t) => ({ test_name: t.test_name, date: t.test_date, level: t.cefr_level, score: t.score_label })),
    approved_levels: r.approvedPoints.map((p) => ({ level: p.level, date: String(p.assessed_at).slice(0, 10) })),
  };
}

/** The portfolio as lines for the audit prompt. */
export function portfolioLines(p: Portfolio): string[] {
  const skills = Object.entries(p.skill_averages)
    .map(([k, v]) => `${k} ${v.average} avg over ${v.count} scores (latest ${v.latest})`).join("; ");
  return [
    `Lessons attended: ${p.lessons_attended}. Homework handed in: ${p.homework_done} (${p.homework_graded} graded).`,
    skills ? `Teacher skill scores: ${skills}.` : "No teacher skill scores.",
    `Video homework approved by a teacher: ${p.videos_approved}${p.video_average !== null ? `, average ${p.video_average}/100` : ""}.`,
    `Words learned: ${p.words_learned} (${p.words_mastered} mastered); by level: ${Object.entries(p.words_by_level).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}. Review cards: ${p.review_cards}. Mistakes logged and corrected: ${p.mistakes_corrected}.`,
    `Teacher-approved lesson reports naming the child: ${p.lesson_reports}.`,
    p.exam_reports.length ? `School exam reports: ${p.exam_reports.map((e) => `${e.title}${e.date ? ` (${e.date})` : ""}`).join("; ")}.` : "No school exam reports.",
    p.standardized.length
      ? `STANDARDIZED TESTS (official score reports, recorded by staff): ${p.standardized.map((t) => `${t.test_name} ${t.date}: ${t.level}${t.score ? `, ${t.score}` : ""}`).join("; ")}.`
      : "No standardized test results recorded.",
    p.approved_levels.length ? `Levels approved by teachers: ${p.approved_levels.map((l) => `${l.level} (${l.date})`).join("; ")}.` : "No teacher-approved levels yet.",
  ];
}
