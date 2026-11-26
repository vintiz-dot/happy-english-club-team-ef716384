/**
 * Queue, merge and timing of the voice-award board overlay. Pure: no React and
 * no imports but ./types, so scripts/pgtest/voice-award-overlay.test.mjs loads it.
 *
 * Every figure the overlay shows comes from the server board; nothing here adds
 * points to a rank. `points` below is only the signed amount of the award for
 * the badge ("+30").
 */
import { VOICE_AWARD_HOLD_MS, type VoiceAwardApplied } from "./types";

export interface OverlayItem {
  /** Local id for React keys. */
  key: string;
  award: VoiceAwardApplied;
  /** How many saved awards were merged into this item. */
  merged: number;
}

export interface OverlayQueue {
  /** Awards waiting, oldest first. The one playing is not in here. */
  pending: OverlayItem[];
}

export const emptyQueue = (): OverlayQueue => ({ pending: [] });

let counter = 0;
const nextKey = () => `va-${++counter}`;

/**
 * Add an award. A waiting award for the same class AND the same child is merged
 * (points summed, the skill kept only when both name the same one), so five
 * "+5" in a row do not play five times. A different child queues behind.
 * A merge that sums to 0 still plays: the teacher should see it happened.
 */
export function enqueue(q: OverlayQueue, a: VoiceAwardApplied): OverlayQueue {
  const i = q.pending.findIndex((p) => p.award.classId === a.classId && p.award.studentId === a.studentId);
  if (i >= 0) {
    const p = q.pending[i];
    const merged: OverlayItem = {
      key: p.key,
      merged: p.merged + 1,
      award: {
        ...p.award,
        points: p.award.points + a.points,
        skill: p.award.skill === a.skill ? p.award.skill : null,
        transactionId: p.award.transactionId ?? a.transactionId,
      },
    };
    return { pending: q.pending.map((x, j) => (j === i ? merged : x)) };
  }
  return { pending: [...q.pending, { key: nextKey(), award: a, merged: 1 }] };
}

/** Take the next item to play. */
export function dequeue(q: OverlayQueue): { item: OverlayItem | null; rest: OverlayQueue } {
  if (!q.pending.length) return { item: null, rest: q };
  return { item: q.pending[0], rest: { pending: q.pending.slice(1) } };
}

export interface Timeline {
  /** The board is up; the child's row is centred. */
  enterMs: number;
  /** The +N badge starts rising. */
  badgeAtMs: number;
  /** The board is read again from the server (about 1 s after the badge). */
  refetchAtMs: number;
  /** Rows start to move, once the new board is in. */
  resortMs: number;
  /** The overlay begins to fade out. */
  leaveAtMs: number;
  /** Fade finished, the page underneath is exactly as before. */
  endAtMs: number;
}

export const BADGE_DELAY_MS = 700;
export const BADGE_TO_REFETCH_MS = 1000;
export const FADE_MS = 450;
/** Hold when more awards are waiting: the next one is the news now. */
export const HOLD_WHEN_BUSY_MS = 1800;

/**
 * When each step happens, counted from the moment the overlay opens.
 * Reduced motion has no travel to wait for, so the steps come sooner.
 * The hold is VOICE_AWARD_HOLD_MS after the re-sort, or shorter while others wait.
 */
export function timeline(opts: { pending?: number; reducedMotion?: boolean } = {}): Timeline {
  const rm = !!opts.reducedMotion;
  const enterMs = rm ? 0 : 450;
  const badgeAtMs = rm ? 150 : BADGE_DELAY_MS;
  const refetchAtMs = badgeAtMs + BADGE_TO_REFETCH_MS;
  const resortMs = refetchAtMs + (rm ? 0 : 200);
  const hold = (opts.pending ?? 0) > 0 ? Math.min(HOLD_WHEN_BUSY_MS, VOICE_AWARD_HOLD_MS) : VOICE_AWARD_HOLD_MS;
  const leaveAtMs = resortMs + hold;
  return { enterMs, badgeAtMs, refetchAtMs, resortMs, leaveAtMs, endAtMs: leaveAtMs + (rm ? 150 : FADE_MS) };
}

/** "+30", "-10" (a real minus sign), "0". */
export function formatDelta(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${Math.abs(points)}`;
  return "0";
}

export interface RowMove {
  studentId: string;
  from: number;
  to: number;
  /** Positive: moved up the list. */
  places: number;
}

/**
 * How a child moved between two orderings of student ids (index 0 = top).
 * Null when the child is not in the new ordering. A child missing from the old
 * one reads as "did not move".
 */
export function moveOf(before: string[], after: string[], studentId: string): RowMove | null {
  const to = after.indexOf(studentId);
  if (to < 0) return null;
  const from = before.indexOf(studentId);
  const f = from < 0 ? to : from;
  return { studentId, from: f, to, places: f - to };
}

/** Rows to draw: a window around index when the class is long. */
export function windowAround<T>(rows: T[], index: number, max: number): { rows: T[]; offset: number } {
  if (rows.length <= max) return { rows, offset: 0 };
  const half = Math.floor(max / 2);
  const start = Math.max(0, Math.min(rows.length - max, index - half));
  return { rows: rows.slice(start, start + max), offset: start };
}
