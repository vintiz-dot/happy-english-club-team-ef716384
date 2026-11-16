/**
 * _lib/speaker-suggestion.ts - who a transcript speaker PROBABLY is.
 *
 * The answer is a suggestion for the teacher, never a decision (D-26,
 * MASTER_PLAN section 1: "The AI never decides who a child is ... low
 * confidence stays unknown"). analyze-transcript stores it in
 * transcript_speaker_suggestions; only a teacher's choice, sent to
 * approve_transcript_analysis, links a speaker to a child.
 *
 * Confidence:
 *   high    a teacher's own earlier choice for this label in this class
 *           (class_speaker_aliases), or an exact roster-name match on a label
 *           that came from the source text (a Zoom / Teams / "Name:" label);
 *   medium  an exact match on a label the MODEL produced (room-recording
 *           diarization), a unique "contains" match ("Anna" / "Anna Tran"),
 *           or a unique token match on a label from the source text;
 *   low     anything else: a tie between two children, a weak match, a
 *           token match on a model-made label. Low names NO child.
 *
 * Imports nothing, so a test can load it on its own.
 */

export type Confidence = "low" | "medium" | "high";
export type Basis = "teacher_alias" | "exact_name" | "name_contains" | "name_tokens" | "none";

export interface SpeakerSuggestion {
  /** Null unless confidence is medium or high. */
  studentId: string | null;
  confidence: Confidence;
  basis: Basis;
}

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Lowercase, diacritics stripped, letters and single spaces only. */
export function speakerKey(s: string): string {
  return stripDiacritics(String(s ?? "")).toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function score(label: string, rosterName: string): { score: number; basis: Basis } {
  if (!label || !rosterName) return { score: 0, basis: "none" };
  if (rosterName === label) return { score: 1, basis: "exact_name" };
  // A whole word inside the other name ("anna" in "anna tran"), not a scrap of one ("an").
  const words = (s: string) => ` ${s} `;
  if (Math.min(label.length, rosterName.length) >= 3
      && (words(rosterName).includes(words(label)) || words(label).includes(words(rosterName)))) {
    return { score: 0.9, basis: "name_contains" };
  }
  const lTok = new Set(label.split(" "));
  const rTok = rosterName.split(" ");
  const hits = rTok.filter((t) => lTok.has(t)).length;
  return { score: hits / Math.max(rTok.length, 1), basis: "name_tokens" };
}

/**
 * @param label        the speaker label as written in the transcript
 * @param roster       the class's children (id, full_name)
 * @param aliases      speakerKey -> student id, from class_speaker_aliases
 * @param labelsFromModel  true when the label was produced by a model
 *                     (diarization of a room recording, a name the model
 *                     extracted), false when it came from the source text
 */
export function suggestSpeaker(
  label: string,
  roster: Array<{ id: string; full_name: string }>,
  aliases: Map<string, string>,
  labelsFromModel: boolean,
): SpeakerSuggestion {
  const key = speakerKey(label);
  const none: SpeakerSuggestion = { studentId: null, confidence: "low", basis: "none" };
  if (!key || key === "unknown" || key === "teacher") return none;

  const aliased = aliases.get(key);
  if (aliased && roster.some((r) => r.id === aliased)) {
    return { studentId: aliased, confidence: "high", basis: "teacher_alias" };
  }

  const scored = roster
    .map((r) => ({ id: r.id, ...score(key, speakerKey(r.full_name)) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 0.5) return { ...none, basis: best && best.score > 0 ? best.basis : "none" };
  // Two children equally likely is not a suggestion: it is a guess.
  const unique = !scored[1] || scored[1].score < best.score;
  if (!unique) return { studentId: null, confidence: "low", basis: best.basis };

  let confidence: Confidence;
  if (best.basis === "exact_name") confidence = labelsFromModel ? "medium" : "high";
  else if (best.basis === "name_contains") confidence = "medium";
  else confidence = labelsFromModel ? "low" : "medium";

  return confidence === "low"
    ? { studentId: null, confidence, basis: best.basis }
    : { studentId: best.id, confidence, basis: best.basis };
}
