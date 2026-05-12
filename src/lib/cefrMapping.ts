/**
 * Grade → CEFR Mapping Utility
 * =============================
 * Aligns Vietnamese MOET public school grades (1–8) with CEFR benchmarks.
 *
 * References:
 * - MOET Circular 32/2018/TT-BGDDT: English curriculum framework
 * - CEFR for Languages (Council of Europe)
 *
 * Grade 1-3 ➜ Pre-A1 to A1  (basic vocabulary, concrete nouns/verbs, ~300-500 headwords)
 * Grade 4-5 ➜ A1 to A2      (everyday topics, simple sentences, ~800-1200 headwords)
 * Grade 6-8 ➜ A2 to B1      (abstract concepts, compound sentences, ~1500-2500 headwords)
 */

export type CEFRLevel = "Pre-A1" | "A1" | "A2" | "B1";

export interface CEFRProfile {
  /** The primary CEFR level for this grade */
  level: CEFRLevel;
  /** The range expressed as "From – To" */
  range: string;
  /** Maximum approximate headword count the student should know */
  vocabCeiling: number;
  /** Readable description of the expected competence */
  description: string;
  /** The instruction sent to the LLM to constrain output */
  promptConstraint: string;
}

const PROFILES: Record<number, CEFRProfile> = {
  1: {
    level: "Pre-A1",
    range: "Pre-A1 → A1",
    vocabCeiling: 300,
    description: "Can understand and use very basic words and phrases about themselves and their immediate surroundings.",
    promptConstraint:
      "Use only the 300 most common English words. " +
      "Definitions must be 1 short sentence (max 8 words). " +
      "Example sentences must be 3-6 words using simple present tense. " +
      "Avoid abstract concepts; use concrete, visible things a 6-year-old understands.",
  },
  2: {
    level: "Pre-A1",
    range: "Pre-A1 → A1",
    vocabCeiling: 400,
    description: "Can recognize familiar words and very basic phrases about family, school, and animals.",
    promptConstraint:
      "Use only the 400 most common English words. " +
      "Definitions must be 1 short sentence (max 10 words). " +
      "Example sentences must be 4-7 words using simple present tense. " +
      "Avoid abstract concepts; use concrete, visible things a 7-year-old understands.",
  },
  3: {
    level: "A1",
    range: "Pre-A1 → A1",
    vocabCeiling: 500,
    description: "Can understand and produce simple phrases about everyday routines, family, and school.",
    promptConstraint:
      "Use only the 500 most common English words. " +
      "Definitions must be 1-2 simple sentences (max 12 words each). " +
      "Example sentences must be 5-8 words. " +
      "Use only simple present and present continuous tenses. " +
      "Avoid idioms or figurative language.",
  },
  4: {
    level: "A1",
    range: "A1 → A2",
    vocabCeiling: 800,
    description: "Can understand sentences about familiar topics like hobbies, weather, directions.",
    promptConstraint:
      "Use vocabulary within the A1 CEFR word list (~800 headwords). " +
      "Definitions should be 1-2 clear sentences (max 15 words each). " +
      "Example sentences should be 6-10 words. " +
      "Simple present, present continuous, simple past are acceptable. " +
      "No idioms or phrasal verbs with non-literal meanings.",
  },
  5: {
    level: "A2",
    range: "A1 → A2",
    vocabCeiling: 1200,
    description: "Can understand frequently used expressions related to areas of most immediate relevance.",
    promptConstraint:
      "Use vocabulary within the A2 CEFR word list (~1200 headwords). " +
      "Definitions should be 1-2 sentences (max 18 words each). " +
      "Example sentences should be 7-12 words. " +
      "All basic tenses are acceptable. " +
      "May include common phrasal verbs (get up, look for) but no idioms.",
  },
  6: {
    level: "A2",
    range: "A2 → B1",
    vocabCeiling: 1500,
    description: "Can describe events and experiences in simple connected text on familiar topics.",
    promptConstraint:
      "Use vocabulary within the A2-B1 CEFR word list (~1500 headwords). " +
      "Definitions should be concise (1-2 sentences, max 20 words each). " +
      "Example sentences 8-14 words. " +
      "All tenses including present perfect are acceptable. " +
      "Common phrasal verbs and collocations are fine.",
  },
  7: {
    level: "A2",
    range: "A2 → B1",
    vocabCeiling: 2000,
    description: "Can understand the main points of clear standard input on familiar matters in school, leisure, etc.",
    promptConstraint:
      "Use vocabulary within the B1 CEFR word list (~2000 headwords). " +
      "Definitions can be 1-2 sentences of natural academic English. " +
      "Example sentences 8-16 words. " +
      "All tenses, passive voice, and reported speech are acceptable. " +
      "Moderate use of linking words (however, although).",
  },
  8: {
    level: "B1",
    range: "A2 → B1",
    vocabCeiling: 2500,
    description: "Can produce simple connected text on topics that are familiar or of personal interest.",
    promptConstraint:
      "Use vocabulary within the B1 CEFR word list (~2500 headwords). " +
      "Definitions should be precise and natural. " +
      "Example sentences can be full complex sentences (up to 18 words). " +
      "All grammar structures are acceptable. " +
      "Common idioms and phrasal verbs are fine.",
  },
};

/**
 * Get the CEFR profile for a given Vietnamese MOET grade (1-8).
 * Returns grade 3 profile as fallback for out-of-range input.
 */
export function getCEFRProfile(grade: number): CEFRProfile {
  if (grade >= 1 && grade <= 8) return PROFILES[grade];
  return PROFILES[3]; // Safe fallback
}

/**
 * Get just the CEFR level string for a given grade.
 */
export function gradeToCEFR(grade: number): CEFRLevel {
  return getCEFRProfile(grade).level;
}

/**
 * Get the LLM prompt constraint string for a given grade.
 * This is designed to be injected into the system prompt of the dictionary LLM.
 */
export function getPromptConstraint(grade: number): string {
  return getCEFRProfile(grade).promptConstraint;
}

/**
 * Get a human-readable label for UI display.
 */
export function getCEFRBadgeLabel(grade: number): string {
  const p = getCEFRProfile(grade);
  return `Grade ${grade} · ${p.range}`;
}
