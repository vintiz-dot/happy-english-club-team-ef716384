/**
 * What happened to a recorded lesson, in words a teacher can act on (owner, 25 Nov 2026: "which
 * lessons are queued to be transcribed", "does the page tell me if a recording failed, and how much
 * was recorded"). Pure and imports nothing; scripts/pgtest/recorded-lesson-state.test.mjs.
 *
 * Inputs are only what the caller could read: `run` is the laptop's refusal or failure, which only
 * an admin can read, so for a teacher a refused lesson reads as queued rather than as failed - the
 * words never claim more than the inputs show.
 */
export interface RecordedLessonInput {
  status: string;
  abandonReason?: string | null;
  audioDeleted: boolean;
  hasReport: boolean;
  run: { outcome: string; reason: string | null } | null;
  /** Seconds of confirmed audio, or null when the chunks could not be read. */
  recordedS: number | null;
  /** The lesson's scheduled length in seconds, when known. */
  lessonS: number | null;
}
export interface RecordedLessonState {
  key: "recording" | "uploading" | "failed" | "queued" | "retry" | "refused" | "ready" | "gone";
  tone: "good" | "wait" | "bad";
  text: string;
  /** The teacher can paste a transcript for this lesson (it has none and the laptop may not make one). */
  canPaste: boolean;
  lessonMin: number | null;
}

const REFUSED: Record<string, string> = {
  audio_gone: "the audio was already deleted",
  consent_missing: "a child's recording consent is missing",
  not_enabled: "recording is switched off for the class",
  no_teacher: "the lesson has no teacher on record",
};

export function recordedLessonState(i: RecordedLessonInput): RecordedLessonState {
  const lessonMin = i.lessonS ? Math.round(i.lessonS / 60) : null;
  const mk = (key: RecordedLessonState["key"], tone: RecordedLessonState["tone"], text: string, canPaste = false): RecordedLessonState =>
    ({ key, tone, text, canPaste, lessonMin });
  const saved = i.recordedS != null && i.recordedS >= 60 ? ` ${Math.round(i.recordedS / 60)} min were saved before it stopped.` : "";

  if (i.status === "recording") return mk("recording", "wait", "Recording now.");
  if (i.status === "uploading") return mk("uploading", "wait", "Uploading. Keep the recorder page open until it finishes; a recording that never finishes is marked failed.");
  if (i.status === "abandoned") {
    return mk("failed", "bad", `The recording failed${i.abandonReason ? ` (${String(i.abandonReason).slice(0, 80)})` : ""}.${saved}`, true);
  }
  if (i.hasReport) {
    return mk("ready", "good", i.audioDeleted ? "Transcribed. The audio has been deleted from the server." : "Transcribed. The audio is deleted from the server a few hours after the transcript was saved.");
  }
  if (i.status === "deleted" || i.audioDeleted) {
    return mk("gone", "bad", "The audio is deleted and no transcript was made. Paste one if you have it.", true);
  }
  if (i.recordedS === 0) return mk("failed", "bad", "The recording finished but no audio was saved.", true);
  const thin = i.recordedS != null && i.lessonS ? i.recordedS < Math.min(i.lessonS * 0.5, i.lessonS - 600) : false;
  const amount = thin ? ` Only ${Math.round(i.recordedS! / 60)} of ${lessonMin} minutes were recorded.` : "";
  if (i.run?.outcome === "refused") {
    return mk("refused", "bad", `The school laptop will not transcribe it: ${REFUSED[i.run.reason ?? ""] ?? "it was refused"}.${amount}`, true);
  }
  if (i.run?.outcome === "failed") {
    return mk("retry", "wait", `The last try failed${i.run.reason ? ` (${i.run.reason})` : ""}; the school laptop tries again tonight.${amount}`, true);
  }
  return mk("queued", thin ? "bad" : "wait", `In the queue: the school laptop transcribes it tonight.${amount}`, true);
}
