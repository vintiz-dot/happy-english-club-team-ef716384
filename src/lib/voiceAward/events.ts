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

export function announceVoiceAward(a: VoiceAwardApplied): void {
  if (!claimVoiceAward(a.transactionId)) return;
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
}
