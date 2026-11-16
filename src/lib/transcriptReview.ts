/**
 * transcriptReview.ts - the Teacher Transcripts approval panel's reasoning,
 * without the screen (D-26).
 *
 * analyze-transcript leaves DRAFTS: metric rows with no child, and a
 * suggestion per speaker (transcript_speaker_suggestions) with low / medium /
 * high confidence. Nothing reaches a child or a family until the teacher
 * approves, and then only what the teacher chose here is sent to
 * approve_transcript_analysis.
 *
 * The one rule this file holds: a LOW suggestion is never pre-selected. It
 * names no child in the database either (a CHECK on the table), so "unknown"
 * is the only starting point a low speaker can have. Medium and high are
 * pre-selected for the teacher to confirm or change.
 *
 * Pure; imports nothing.
 */

export type Confidence = "low" | "medium" | "high";

export interface DraftError {
  error_text: string;
  corrected_text: string | null;
  error_type?: string | null;
  cefr_topic?: string | null;
}

export interface SuggestionRow {
  metric_id: string;
  suggested_student_id: string | null;
  confidence: Confidence;
  basis?: string | null;
  labels_from_model?: boolean | null;
  draft_errors?: DraftError[] | null;
  cefr_estimate?: string | null;
}

export interface MetricRow {
  id: string;
  speaker_label: string;
  is_teacher: boolean;
  student_id: string | null;
  cefr_estimate?: string | null;
}

export interface SpeakerChoice {
  studentId: string | null;
  cefrLevel: string | null;
  /** One flag per drafted error, in draft order. */
  keepErrors: boolean[];
}

export interface Assignment {
  metric_id: string;
  student_id: string | null;
  cefr_level?: string | null;
  errors?: DraftError[];
}

export type ReviewState = "processing" | "failed" | "legacy" | "draft" | "approved" | "withdrawn";

export const CEFR_LEVELS = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"] as const;

export const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: "high confidence",
  medium: "medium confidence - please check",
  low: "not sure - left as unknown",
};

/** A speaker a child can be chosen for: not the teacher, not the mixed "Unknown" bucket. */
export function isAssignable(m: Pick<MetricRow, "is_teacher" | "speaker_label">): boolean {
  return !m.is_teacher && String(m.speaker_label ?? "").trim().toLowerCase() !== "unknown";
}

/** May this suggestion start pre-selected? Only medium or high, and only when it names a child. */
export function preselects(s: SuggestionRow | undefined | null): boolean {
  return !!s && (s.confidence === "medium" || s.confidence === "high") && !!s.suggested_student_id;
}

/**
 * Where each speaker's choice starts. An approved lesson starts from what the
 * teacher approved (the linked metric row); a draft from the suggestion when
 * it may pre-select, else unknown.
 */
export function initialChoices(
  metrics: MetricRow[],
  suggestions: SuggestionRow[],
): Record<string, SpeakerChoice> {
  const byMetric = new Map(suggestions.map((s) => [s.metric_id, s]));
  const out: Record<string, SpeakerChoice> = {};
  for (const m of metrics) {
    if (!isAssignable(m)) continue;
    const s = byMetric.get(m.id);
    const errors = Array.isArray(s?.draft_errors) ? s!.draft_errors! : [];
    const studentId = m.student_id ?? (preselects(s) ? s!.suggested_student_id : null);
    out[m.id] = {
      studentId,
      cefrLevel: m.student_id ? m.cefr_estimate ?? null : s?.cefr_estimate ?? null,
      keepErrors: errors.map(() => true),
    };
  }
  return out;
}

/** What approve_transcript_analysis is sent: the teacher's choices, and nothing else. */
export function buildAssignments(
  metrics: MetricRow[],
  suggestions: SuggestionRow[],
  choices: Record<string, SpeakerChoice>,
): Assignment[] {
  const byMetric = new Map(suggestions.map((s) => [s.metric_id, s]));
  const out: Assignment[] = [];
  for (const m of metrics) {
    if (!isAssignable(m)) continue;
    const c = choices[m.id];
    if (!c || !c.studentId) {
      out.push({ metric_id: m.id, student_id: null });
      continue;
    }
    const drafted = Array.isArray(byMetric.get(m.id)?.draft_errors) ? byMetric.get(m.id)!.draft_errors! : [];
    out.push({
      metric_id: m.id,
      student_id: c.studentId,
      cefr_level: c.cefrLevel && (CEFR_LEVELS as readonly string[]).includes(c.cefrLevel) ? c.cefrLevel : null,
      errors: drafted.filter((_, i) => c.keepErrors[i] !== false),
    });
  }
  return out;
}

export function reviewState(
  transcript: { status?: string | null; analysis?: { drafted_for_review?: boolean } | null } | null | undefined,
  approval: { withdrawn_at?: string | null } | null | undefined,
): ReviewState {
  if (!transcript) return "processing";
  if (approval && !approval.withdrawn_at) return "approved";
  if (transcript.status === "processing") return "processing";
  if (transcript.status === "failed") return "failed";
  if (transcript.analysis?.drafted_for_review) return approval ? "withdrawn" : "draft";
  return "legacy";
}

/** The database's code for "the earlier automatic analysis already shared this lesson". */
export function isLegacyRefusal(error: { hint?: string | null; message?: string | null } | null | undefined): boolean {
  return !!error && (error.hint === "TRANSCRIPT_LEGACY_ROWS" || /TRANSCRIPT_LEGACY_ROWS/.test(String(error.message ?? "")));
}
