/**
 * Voice points assistant: the contract between its three parts (owner, 27 Nov 2026).
 *
 *   1. The listener in the browser (wake word "HEC" + the teacher's voiceprint,
 *      both on the device) records ~4 s after the wake word and posts it to
 *   2. the `voice-award` edge function, which asks Gemini what was said, checks
 *      the answer against today's register and returns a VoiceAwardParse. It
 *      WRITES NOTHING: the browser saves through `awardPoints` as the teacher
 *      (RLS is the boundary), after a 3-second cancel window.
 *   3. The board overlay plays every saved award: the class board slides over
 *      the current page, shows +/-N on the child's row, re-sorts, holds 5 s and
 *      leaves the page exactly as it was.
 *
 * Owner's rules: only children marked Present or Late in the lesson running now;
 * at most 100 points up or down per command; a sure command saves after a
 * 3-second cancel, an unsure one waits for "HEC yes" or a tap.
 *
 * Pure: no imports.
 */

export const VOICE_AWARD_MAX_POINTS = 100;
export const VOICE_AWARD_CANCEL_MS = 3000;
export const VOICE_AWARD_HOLD_MS = 5000;
/** Prefix of point_transactions.notes for an award made by voice. */
export const VOICE_AWARD_NOTE_PREFIX = "Voice: ";

/** The skills a voice command may name: SKILL_CONFIG keys in src/lib/skillConfig.ts. */
export const VOICE_AWARD_SKILLS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "focus",
  "teamwork",
] as const;
export type VoiceAwardSkill = (typeof VOICE_AWARD_SKILLS)[number];

export type VoiceIntent =
  | "award" // add or take away points
  | "confirm" // "HEC yes": save the pending unsure award
  | "cancel" // "HEC cancel" / "HEC no": drop the pending award
  | "undo" // "HEC undo": remove the last saved voice award
  | "none"; // nothing usable was said

/** What the browser posts to `voice-award`. */
export interface VoiceAwardRequest {
  classId: string;
  /** The lesson running now (sessions.id). The function refuses without one. */
  sessionId: string;
  /** 16 kHz mono 16-bit PCM WAV, base64, at most ~8 s. */
  audioBase64: string;
  mime: "audio/wav";
}

export interface VoiceAwardParse {
  intent: VoiceIntent;
  /** A child marked Present/Late in that lesson, or null. Never anyone else. */
  studentId: string | null;
  studentName: string | null;
  /** Signed: negative takes points away. |points| <= VOICE_AWARD_MAX_POINTS. */
  points: number | null;
  /** One of VOICE_AWARD_SKILLS, or null when none was named. */
  skill: VoiceAwardSkill | null;
  /** The words as Gemini heard them, for the card and the note. */
  heard: string;
  /** "high" saves after the cancel window; "low" waits for "HEC yes" or a tap. */
  confidence: "high" | "low";
  /** Why the answer is low or refused, in a short plain sentence for the card. */
  reason: string | null;
}

export type VoiceAwardResponse =
  | { ok: true; parse: VoiceAwardParse; ms: number }
  | {
      ok: false;
      code:
        | "no_lesson" // the session is not running now / not this class
        | "no_attendance" // no child is marked Present or Late yet
        | "not_teacher" // the caller does not teach this class (and is not admin)
        | "bad_audio"
        | "model_failed"
        | "rate_limited";
      error: string;
    };

/** A saved voice award, announced to the board overlay. */
export interface VoiceAwardApplied {
  classId: string;
  studentId: string;
  studentName: string;
  points: number;
  skill: VoiceAwardSkill | null;
  /** point_transactions.id of the saved row, for dedupe and undo. */
  transactionId: string | null;
}
