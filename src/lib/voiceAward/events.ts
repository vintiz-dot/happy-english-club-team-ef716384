/**
 * Tiny in-memory emitter between whoever SAVES a voice award (the listener, in
 * this browser) and the board overlay that PLAYS it. Pure: only ./types.
 *
 * The same award can also reach the overlay from Supabase realtime (so a
 * projector on another device plays it); `claimVoiceAward` is the one place
 * that says "this transaction was already seen", whichever path got there first.
 */
import type { VoiceAwardApplied } from "./types";

type Listener = (a: VoiceAwardApplied) => void;

const listeners = new Set<Listener>();
const seen: string[] = [];
const seenSet = new Set<string>();
const SEEN_MAX = 300;

/** True the first time an id is claimed, false after (null ids are never duplicates). */
export function claimVoiceAward(transactionId: string | null | undefined): boolean {
  if (!transactionId) return true;
  if (seenSet.has(transactionId)) return false;
  seenSet.add(transactionId);
  seen.push(transactionId);
  if (seen.length > SEEN_MAX) {
    const old = seen.shift();
    if (old) seenSet.delete(old);
  }
  return true;
}

/** Whether an id was claimed already, without claiming it. */
export function voiceAwardSeen(transactionId: string | null | undefined): boolean {
  return !!transactionId && seenSet.has(transactionId);
}

/** Local awards announced without a transaction id: kept briefly so a realtime echo of the same save is not played twice. */
const ECHO_WINDOW_MS = 10_000;
let localNoId: Array<{ studentId: string; points: number; at: number }> = [];

/**
 * True (and consumed) when a realtime row matches a local award that had no
 * transaction id: same child, same points, announced within 10 s.
 */
export function consumeLocalEcho(studentId: string, points: number, now: number = Date.now()): boolean {
  localNoId = localNoId.filter((x) => now - x.at <= ECHO_WINDOW_MS);
  const i = localNoId.findIndex((x) => x.studentId === studentId && x.points === points);
  if (i < 0) return false;
  localNoId.splice(i, 1);
  return true;
}

export function announceVoiceAward(a: VoiceAwardApplied, now: number = Date.now()): void {
  if (!claimVoiceAward(a.transactionId)) return;
  if (!a.transactionId) localNoId.push({ studentId: a.studentId, points: a.points, at: now });
  for (const l of [...listeners]) {
    try { l(a); } catch { /* one bad listener must not stop the others */ }
  }
}

export function onVoiceAward(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Test helper. */
export function resetVoiceAwardEvents(): void {
  listeners.clear();
  seen.length = 0;
  seenSet.clear();
  localNoId = [];
}
