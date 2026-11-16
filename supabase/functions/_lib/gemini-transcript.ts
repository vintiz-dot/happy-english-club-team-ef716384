/**
 * The fallback transcript for a video OpenAI cannot take.
 *
 * OpenAI's transcription endpoint refuses files over 25 MB. A video chosen
 * from a phone's library ("choose a file") has no separate audio track, and
 * a few minutes of phone video is well over 25 MB, so until 16 Nov 2026
 * such a video was scored with no transcript at all - the child's words
 * never reached the marking model. Gemini already watches the whole video
 * (analyze-video-submission `watch()`, through its Files API, which takes
 * large files), so it is asked for a verbatim, timestamped transcript too.
 *
 * It is marked as Gemini's wherever it shows: `models.transcript_source`
 * is "gemini", the teacher's attention line says so, the review panel
 * labels the transcript, and the marking model is told it may be less
 * exact. It is never passed off as the OpenAI transcript. The score is
 * still `weightedScore`, and nothing reaches a family before a teacher
 * approves.
 *
 * Imports nothing, so a test can load it directly.
 */

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}
export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
}

/** Where a transcript came from, as `models.transcript_source` records it. */
export type TranscriptSource = "openai" | "gemini";

export const MAX_SEGMENTS = 600;
const MAX_SEGMENT_TEXT = 500;

export const GEMINI_TRANSCRIPT_PROMPT = `Transcribe the speech in this video WORD FOR WORD. It is a child learning English recording homework.
- Write exactly what is said, including grammar mistakes, repeated words, false starts and unfinished sentences. Do NOT correct, tidy, summarise or translate anything.
- If a word cannot be made out, write [unclear]. If someone other than the child speaks, start that segment with "[other speaker]".
- Speech in Vietnamese: write it as spoken, in Vietnamese.
- Split into short segments of one sentence or phrase, with start and end times in seconds from the start of the video.
- If nobody speaks, return an empty list.
Return only JSON: {"segments": [{"start": 0.0, "end": 2.5, "text": "..."}]}`;

/** Seconds from a number, a numeric string, or "m:ss" / "h:mm:ss(.s)". NaN if none of those. */
export function toSeconds(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(/s$/i, "");
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s);
  if (!m) return NaN;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Reads Gemini's answer into the shape the OpenAI transcript has. Accepts
 * the JSON object asked for, a bare list, or either inside a ```json fence.
 * Drops segments with no text or no usable start time, and (when the
 * video's length is known) any that start after it ends; sorts by start;
 * caps the count and each segment's length. Null when the answer is not
 * readable at all - the caller then treats the video as untranscribed.
 */
export function readGeminiTranscript(raw: unknown, durationSeconds?: number | null): Transcript | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const body = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { parsed = JSON.parse(body); } catch { return null; }
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { segments?: unknown }).segments)
      ? (parsed as { segments: unknown[] }).segments
      : null;
  if (!list) return null;
  const limit = typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds + 5
    : Infinity;
  const segments: TranscriptSegment[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const text = String(o.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SEGMENT_TEXT);
    const start = toSeconds(o.start);
    if (!text || !Number.isFinite(start) || start < 0 || start > limit) continue;
    let end = toSeconds(o.end);
    if (!Number.isFinite(end) || end < start) end = start;
    segments.push({ start: round1(start), end: round1(Math.min(end, limit)), text });
  }
  segments.sort((a, b) => a.start - b.start);
  const kept = segments.slice(0, MAX_SEGMENTS);
  return { text: kept.map((s) => s.text).join(" "), segments: kept };
}

/**
 * The line for the teacher when the transcript is not OpenAI's, or when
 * there is none. Empty when OpenAI wrote it.
 */
export function transcriptAttention(source: TranscriptSource | null, opts: { geminiModel?: string; tooBig?: boolean; geminiError?: string | null } = {}): string {
  if (source === "openai") return "";
  if (source === "gemini") {
    return `The transcript was written by the video model (${opts.geminiModel ?? "Gemini"}), not by OpenAI's speech recogniser, because the video is over 25 MB with no separate audio track. Check the quoted evidence against the video before approving.`;
  }
  if (opts.tooBig) {
    return `No transcript: the video is over 25 MB with no separate audio track, and the video model could not transcribe it${opts.geminiError ? ` (${opts.geminiError})` : ""}. Scores rest on the video notes or still frames only.`;
  }
  return "No transcript: the audio could not be transcribed.";
}
