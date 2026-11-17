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
 * The rules this file holds:
 *   - a LOW suggestion is never pre-selected. It names no child in the
 *     database either (a CHECK on the table), so "unknown" is the only
 *     starting point a low speaker can have. Medium and high are
 *     pre-selected for the teacher to confirm or change, EXCEPT
 *       - a saved label (teacher_alias) on a label a model made: the model
 *         can give that label to another voice (review M-3);
 *       - the old pipeline's own match (legacy_auto), kept when its
 *         published rows were taken back (20261117100100, review M-1);
 *   - "Approve again" starts from what the teacher approved: the child, the
 *     level, the errors she KEPT (not every drafted one - review M-2) and
 *     the published text;
 *   - everything the child's page will show from the speaker's row
 *     (contribution, teacher feedback, recommendation, highlights) is in
 *     the choice, for the teacher to keep, edit or drop, and is sent with
 *     the approval (review M-4).
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
  contribution?: string | null;
  teacher_feedback?: string | null;
  recommendation?: string | null;
  highlights?: unknown;
  edited_by_teacher?: boolean | null;
}

/** What the child's lesson page shows from the speaker's metric row. */
export interface SpeakerText {
  contribution: string;
  teacher_feedback: string;
  recommendation: string;
  /** One flag per highlight on the row, in row order. */
  keepHighlights: boolean[];
}

export interface SpeakerChoice {
  studentId: string | null;
  cefrLevel: string | null;
  /** One flag per drafted error, in draft order. */
  keepErrors: boolean[];
  text: SpeakerText;
}

/** The approval record's per-speaker entry (transcript_approvals.assignments), as far as this file reads it. */
export interface ApprovedAssignment {
  metric_id: string;
  student_id?: string | null;
  kept_errors?: DraftError[] | null;
}

export interface ApprovalRow {
  withdrawn_at?: string | null;
  assignments?: ApprovedAssignment[] | null;
}

export interface Assignment {
  metric_id: string;
  student_id: string | null;
  cefr_level?: string | null;
  errors?: DraftError[];
  text?: { contribution: string | null; teacher_feedback: string | null; recommendation: string | null; highlights: string[] };
}

export type ReviewState = "processing" | "failed" | "legacy" | "draft" | "approved" | "withdrawn";

export const CEFR_LEVELS = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"] as const;

export const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: "high confidence",
  medium: "medium confidence - please check",
  low: "not sure - left as unknown",
};

/** Why a suggestion was made, in the teacher's words. */
export function basisText(s: Pick<SuggestionRow, "basis" | "labels_from_model"> | null | undefined): string | null {
  switch (s?.basis) {
    case "teacher_alias": return s.labels_from_model ? "a label you saved earlier - the recording's labels can be wrong, choose yourself" : "a label you saved earlier";
    case "legacy_auto": return "the earlier automatic match - choose yourself";
    case "exact_name": return "same name";
    case "name_contains": return "similar name";
    case "name_tokens": return "part of the name";
    default: return null;
  }
}

/** A speaker a child can be chosen for: not the teacher, not the mixed "Unknown" bucket. */
export function isAssignable(m: Pick<MetricRow, "is_teacher" | "speaker_label">): boolean {
  return !m.is_teacher && String(m.speaker_label ?? "").trim().toLowerCase() !== "unknown";
}

/**
 * May this suggestion start pre-selected? Only medium or high, only when it
 * names a child, never the old pipeline's match, never a saved label on a
 * model-made label.
 */
export function preselects(s: SuggestionRow | undefined | null): boolean {
  if (!s || !s.suggested_student_id) return false;
  if (s.confidence !== "medium" && s.confidence !== "high") return false;
  if (s.basis === "legacy_auto") return false;
  if (s.basis === "teacher_alias" && s.labels_from_model !== false) return false;
  return true;
}

/** The highlights on a metric row, as text. */
export function highlightsOf(m: Pick<MetricRow, "highlights"> | null | undefined): string[] {
  const h = m?.highlights;
  if (!Array.isArray(h)) return [];
  return h
    .map((x) => (typeof x === "string" ? x : x && typeof x === "object" && "text" in (x as any) ? String((x as any).text ?? "") : ""))
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function sameError(a: DraftError, b: DraftError): boolean {
  const n = (s: unknown) => String(s ?? "").trim();
  return n(a.error_text) === n(b.error_text) && n(a.corrected_text) === n(b.corrected_text);
}

/**
 * Where each speaker's choice starts. An approved lesson starts from what the
 * teacher approved (the linked metric row and, for the errors, what the
 * approval kept); a draft from the suggestion when it may pre-select, else
 * unknown. When an approval (standing or withdrawn) recorded which errors
 * the teacher kept for this speaker, the boxes start from that.
 */
export function initialChoices(
  metrics: MetricRow[],
  suggestions: SuggestionRow[],
  approval?: ApprovalRow | null,
): Record<string, SpeakerChoice> {
  const byMetric = new Map(suggestions.map((s) => [s.metric_id, s]));
  const approved = new Map(
    (Array.isArray(approval?.assignments) ? approval!.assignments! : []).map((a) => [a.metric_id, a]),
  );
  const out: Record<string, SpeakerChoice> = {};
  for (const m of metrics) {
    if (!isAssignable(m)) continue;
    const s = byMetric.get(m.id);
    const errors = Array.isArray(s?.draft_errors) ? s!.draft_errors! : [];
    const studentId = m.student_id ?? (preselects(s) ? s!.suggested_student_id : null);
    const prior = approved.get(m.id);
    const kept = prior && prior.student_id && Array.isArray(prior.kept_errors) ? prior.kept_errors : null;
    out[m.id] = {
      studentId,
      cefrLevel: m.student_id ? m.cefr_estimate ?? null : s?.cefr_estimate ?? null,
      keepErrors: errors.map((e) => (kept ? kept.some((k) => sameError(k, e)) : true)),
      text: {
        contribution: m.contribution ?? "",
        teacher_feedback: m.teacher_feedback ?? "",
        recommendation: m.recommendation ?? "",
        keepHighlights: highlightsOf(m).map(() => true),
      },
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
    const t = c.text ?? { contribution: "", teacher_feedback: "", recommendation: "", keepHighlights: [] };
    const clean = (x: string | null | undefined) => (String(x ?? "").trim() || null);
    out.push({
      metric_id: m.id,
      student_id: c.studentId,
      cefr_level: c.cefrLevel && (CEFR_LEVELS as readonly string[]).includes(c.cefrLevel) ? c.cefrLevel : null,
      errors: drafted.filter((_, i) => c.keepErrors[i] !== false),
      text: {
        contribution: clean(t.contribution),
        teacher_feedback: clean(t.teacher_feedback),
        recommendation: clean(t.recommendation),
        highlights: highlightsOf(m).filter((_, i) => t.keepHighlights?.[i] === true),
      },
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
