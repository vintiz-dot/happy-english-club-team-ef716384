/**
 * Standardized English tests a child may bring to Defend My Level, and the
 * CEFR level their published score scales point to (pure; imports nothing).
 *
 * The admin screen SUGGESTS a level from the score; the person recording the
 * result confirms it against the score report, which always wins (a report
 * that states a CEFR level is the level). Tested by
 * scripts/pgtest/level-defense.test.mjs.
 *
 * Sources: the Cambridge English Scale (A2 Key, B1 Preliminary, B2 First,
 * C1 Advanced, Linguaskill: the bands each exam reports) and the IELTS
 * band-to-CEFR table. Young Learners (Starters / Movers / Flyers) report
 * shields, not a scale score: the certificate is at the test's own level.
 */

export const STANDARDIZED_LEVELS = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"] as const;
export type StdLevel = (typeof STANDARDIZED_LEVELS)[number];

export interface StandardizedTestKind {
  id: string;
  name: string;
  /** What the score box asks for. */
  scoreHint: string;
  /** min/max of the reported score, when there is one. */
  range?: [number, number];
  /** Score bands -> CEFR, lowest first: a score at or above `from` is `level`. */
  bands?: Array<{ from: number; level: StdLevel }>;
  /** A test whose certificate is at one level whatever the score. */
  fixedLevel?: StdLevel;
  /** Skills the score report lists. */
  skills: string[];
}

const CAMBRIDGE_SKILLS = ["Reading", "Writing", "Listening", "Speaking"];
const YLE_SKILLS = ["Listening", "Reading & Writing", "Speaking"];

export const STANDARDIZED_TESTS: StandardizedTestKind[] = [
  { id: "yle-starters", name: "Cambridge Pre A1 Starters", scoreHint: "Shields (out of 15)", range: [3, 15], fixedLevel: "Pre-A1", skills: YLE_SKILLS },
  { id: "yle-movers", name: "Cambridge A1 Movers", scoreHint: "Shields (out of 15)", range: [3, 15], fixedLevel: "A1", skills: YLE_SKILLS },
  { id: "yle-flyers", name: "Cambridge A2 Flyers", scoreHint: "Shields (out of 15)", range: [3, 15], fixedLevel: "A2", skills: YLE_SKILLS },
  {
    id: "a2-key", name: "Cambridge A2 Key (KET)", scoreHint: "Cambridge English Scale (100-150)", range: [100, 150],
    bands: [{ from: 100, level: "A1" }, { from: 120, level: "A2" }, { from: 140, level: "B1" }], skills: CAMBRIDGE_SKILLS,
  },
  {
    id: "b1-preliminary", name: "Cambridge B1 Preliminary (PET)", scoreHint: "Cambridge English Scale (120-170)", range: [120, 170],
    bands: [{ from: 120, level: "A2" }, { from: 140, level: "B1" }, { from: 160, level: "B2" }], skills: CAMBRIDGE_SKILLS,
  },
  {
    id: "b2-first", name: "Cambridge B2 First (FCE)", scoreHint: "Cambridge English Scale (140-190)", range: [140, 190],
    bands: [{ from: 140, level: "B1" }, { from: 160, level: "B2" }, { from: 180, level: "C1" }], skills: CAMBRIDGE_SKILLS,
  },
  {
    id: "c1-advanced", name: "Cambridge C1 Advanced (CAE)", scoreHint: "Cambridge English Scale (160-210)", range: [160, 210],
    bands: [{ from: 160, level: "B2" }, { from: 180, level: "C1" }, { from: 200, level: "C2" }], skills: CAMBRIDGE_SKILLS,
  },
  {
    id: "linguaskill", name: "Linguaskill", scoreHint: "Cambridge English Scale (82-180+)", range: [82, 200],
    bands: [{ from: 82, level: "Pre-A1" }, { from: 100, level: "A1" }, { from: 120, level: "A2" }, { from: 140, level: "B1" }, { from: 160, level: "B2" }, { from: 180, level: "C1" }],
    skills: CAMBRIDGE_SKILLS,
  },
  {
    id: "ielts", name: "IELTS", scoreHint: "Overall band (1-9)", range: [1, 9],
    bands: [{ from: 1, level: "A1" }, { from: 3, level: "A2" }, { from: 4, level: "B1" }, { from: 5.5, level: "B2" }, { from: 7, level: "C1" }, { from: 8.5, level: "C2" }],
    skills: CAMBRIDGE_SKILLS,
  },
  { id: "toefl-primary", name: "TOEFL Primary", scoreHint: "Score as on the report (the report states the CEFR level)", skills: ["Reading", "Listening", "Speaking"] },
  { id: "toefl-junior", name: "TOEFL Junior", scoreHint: "Total score (the report states the CEFR level)", skills: ["Listening", "Language Form & Meaning", "Reading"] },
  { id: "oxford-placement", name: "Oxford Placement Test", scoreHint: "Score (the report states the CEFR level)", skills: ["Use of English", "Listening"] },
  { id: "other", name: "Other standardized test", scoreHint: "Score as on the report", skills: [] },
];

export const testKind = (idOrName: string): StandardizedTestKind | undefined =>
  STANDARDIZED_TESTS.find((t) => t.id === idOrName || t.name === idOrName);

/** The level a score points to, or null when the test needs the report's own level. */
export function suggestCefr(kind: StandardizedTestKind | undefined, score: number | null | undefined): StdLevel | null {
  if (!kind) return null;
  if (kind.fixedLevel) return kind.fixedLevel;
  if (!kind.bands || score == null || !Number.isFinite(score)) return null;
  if (kind.range && (score < kind.range[0] || score > kind.range[1])) return null;
  let level: StdLevel | null = null;
  for (const b of kind.bands) if (score >= b.from) level = b.level;
  return level;
}

/** The label stored beside the score ("13 shields", "Band 5.5", "Scale 142"). */
export function scoreLabel(kind: StandardizedTestKind | undefined, score: number | null | undefined): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (!kind) return String(score);
  if (kind.id.startsWith("yle-")) return `${score} shields`;
  if (kind.id === "ielts") return `Band ${score}`;
  if (kind.bands) return `Scale ${score}`;
  return `Score ${score}`;
}
