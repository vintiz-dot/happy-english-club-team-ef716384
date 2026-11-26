/**
 * Voice points assistant: what to do with a command (owner, 27 Nov 2026).
 *
 * Pure: imports only ./types, so scripts/pgtest/voice-award-flow.test.mjs loads
 * it. VoiceAwardContext holds the clock, the timers and the writes; this file
 * only DECIDES. The rules:
 *   - a sure ("high") award shows a card and saves after VOICE_AWARD_CANCEL_MS
 *     unless cancelled; an unsure ("low") one waits for "HEC yes" or a tap;
 *   - "HEC cancel / no" or a tap drops the card; "HEC yes" saves a waiting card
 *     (or saves a counting-down one at once);
 *   - a NEW award command while a card is open REPLACES it (the teacher has
 *     changed their mind; nothing was saved, so nothing is lost);
 *   - "HEC undo" removes the last voice award THIS teacher saved in THIS lesson;
 *   - never more than VOICE_AWARD_MAX_POINTS up or down, never zero, never a
 *     child the register did not name.
 */
import {
  VOICE_AWARD_MAX_POINTS,
  VOICE_AWARD_NOTE_PREFIX,
  VOICE_AWARD_SKILLS,
  type VoiceAwardResponse,
  type VoiceAwardParse,
  type VoiceAwardSkill,
} from "./types";

export const SKILL_WORDS: Record<VoiceAwardSkill, string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  focus: "Focus",
  teamwork: "Teamwork",
};

/** The word shown for an award with no skill named. */
export const NO_SKILL_LABEL = "Participation";

export const skillLabel = (skill: VoiceAwardSkill | null): string => (skill ? SKILL_WORDS[skill] : NO_SKILL_LABEL);

/** "+30", "-10" (a real minus sign). */
export function signed(points: number): string {
  return points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "0";
}

/** The card's pending award. */
export interface PendingAward {
  studentId: string;
  studentName: string;
  points: number; // signed, non-zero, |points| <= max
  skill: VoiceAwardSkill | null;
  heard: string;
  /** The server was sure: save after the cancel window without a "yes". */
  sure: boolean;
  /** Why it is not sure (for the card). */
  reason: string | null;
}

/** "Potato +30 Writing" */
export const cardTitle = (a: Pick<PendingAward, "studentName" | "points" | "skill">): string =>
  `${a.studentName} ${signed(a.points)} ${skillLabel(a.skill)}`;

/**
 * The note saved with the points. The board overlay reads the skill by finding
 * a skill word right after VOICE_AWARD_NOTE_PREFIX, so the label comes first.
 * The words heard follow in quotes, unless they contain a skill word of their
 * own (it would be read as the skill), a quote or a line break.
 */
export function formatNote(skill: VoiceAwardSkill | null, heard: string): string {
  const head = `${VOICE_AWARD_NOTE_PREFIX}${skillLabel(skill)}`;
  const h = (heard ?? "").replace(/\s+/g, " ").trim();
  if (!h || h.includes('"')) return head;
  const lower = h.toLowerCase();
  if (VOICE_AWARD_SKILLS.some((s) => lower.includes(s))) return head;
  return `${head} - "${h.slice(0, 120)}"`;
}

export const UNDO_NOTE_WORD = "undo";

/** The note of the compensating row written when a delete is not allowed. */
export function formatUndoNote(original: Pick<PendingAward, "studentName" | "points" | "skill">): string {
  return `${VOICE_AWARD_NOTE_PREFIX}${UNDO_NOTE_WORD} ${signed(original.points)} ${skillLabel(original.skill)}`;
}

/** What a saved voice award remembers, for "HEC undo". */
export interface SavedAward {
  transactionId: string | null;
  studentId: string;
  studentName: string;
  points: number;
  skill: VoiceAwardSkill | null;
  classId: string;
  sessionId: string;
  createdBy: string;
  savedAt: number;
  undone: boolean;
  /** created_at of the point_transactions row, to match the skill row made with it. */
  txCreatedAt?: string | null;
}

export interface UndoContext {
  userId: string | null;
  /** The lesson running now, or null. */
  sessionId: string | null;
}

/** The newest award this teacher saved in this lesson that is not undone. */
export function lastUndoable(saved: SavedAward[], ctx: UndoContext): SavedAward | null {
  if (!ctx.userId || !ctx.sessionId) return null;
  for (let i = saved.length - 1; i >= 0; i--) {
    const s = saved[i];
    if (s.undone) continue;
    if (s.createdBy === ctx.userId && s.sessionId === ctx.sessionId) return s;
  }
  return null;
}

export function undoSentence(found: SavedAward | null): string {
  return found
    ? `Removed ${cardTitle(found)}.`
    : "Nothing to undo: I can only undo a voice award you saved in this lesson.";
}

/** A plain sentence for every failure the function can answer. */
export function failureSentence(res: Extract<VoiceAwardResponse, { ok: false }>): string {
  switch (res.code) {
    case "no_lesson":
      return "There is no lesson of this class running now.";
    case "no_attendance":
      return "No child is marked Present or Late yet. Take the register first.";
    case "not_teacher":
      return "You do not teach this class.";
    case "bad_audio":
      return "I could not use that recording. Please say it again.";
    case "model_failed":
      return "I could not understand that just now. Please say it again.";
    case "rate_limited":
      return "Too many commands in a short time. Wait a moment, or use the buttons.";
    default:
      return res.error || "Something went wrong.";
  }
}

export type PendingState = { kind: "counting" | "waiting"; award: PendingAward } | null;

export type FlowAction =
  | { type: "show"; award: PendingAward }
  | { type: "save" } // save the pending card now
  | { type: "drop" }
  | { type: "undo" }
  | { type: "say"; message: string };

/** What to do with a parse, given the card that is open (if any). */
export function decide(parse: VoiceAwardParse, pending: PendingState): FlowAction {
  switch (parse.intent) {
    case "confirm":
      if (parse.confidence !== "high") return { type: "say", message: "I am not sure I heard yes. Say HEC yes again, or tap Confirm." };
      return pending ? { type: "save" } : { type: "say", message: "There is nothing waiting to confirm." };
    case "cancel":
      return pending ? { type: "drop" } : { type: "say", message: "There is nothing to cancel." };
    case "undo":
      if (parse.confidence !== "high") return { type: "say", message: "I am not sure I heard undo. Say HEC undo again, or tap Undo last." };
      // With a card open, undo means drop that card; it never reaches back to an older award.
      return pending ? { type: "drop" } : { type: "undo" };
    case "none":
      return { type: "say", message: parse.reason || (parse.heard ? `I did not find a command in "${parse.heard}".` : "I did not hear a command.") };
    case "award": {
      const pts = parse.points;
      if (!parse.studentId || !parse.studentName) {
        return { type: "say", message: parse.reason || "Which child? I could not match a name to a child in this lesson." };
      }
      if (pts === null || !Number.isFinite(pts) || !Number.isInteger(pts) || pts === 0) {
        return { type: "say", message: parse.reason || `I did not catch how many points for ${parse.studentName}.` };
      }
      if (Math.abs(pts) > VOICE_AWARD_MAX_POINTS) {
        return { type: "say", message: `${signed(pts)} is more than ${VOICE_AWARD_MAX_POINTS} points in one command. Nothing was changed.` };
      }
      return {
        type: "show",
        award: {
          studentId: parse.studentId,
          studentName: parse.studentName,
          points: pts,
          skill: parse.skill,
          heard: parse.heard,
          sure: parse.confidence === "high",
          reason: parse.confidence === "high" ? null : parse.reason || "I am not sure I heard that right.",
        },
      };
    }
    default:
      return { type: "say", message: "I did not understand that." };
  }
}

/**
 * Which awardPoints key and points to save with. A deduction cannot be a skill
 * score (skill_assessments.score is 0..100), so it is saved as a "correction";
 * a plain award with no skill is a "participation" transaction (no
 * skill_assessments row); a skill award is the skill.
 */
export function saveKey(a: Pick<PendingAward, "points" | "skill">): string {
  if (a.points < 0) return "correction";
  return a.skill ?? "participation";
}

/** Whether a skill award also writes a skill_assessments row (so undo must remove it). */
export function writesSkillRow(a: Pick<PendingAward, "points" | "skill">): boolean {
  return a.points > 0 && !!a.skill;
}

/** A short line for the "last commands" list. */
export function commandLine(kind: "saved" | "undone" | "cancelled" | "ignored" | "error", text: string): string {
  const tag = kind === "saved" ? "Saved" : kind === "undone" ? "Undone" : kind === "cancelled" ? "Cancelled" : kind === "ignored" ? "Ignored" : "Problem";
  return `${tag}: ${text}`;
}
