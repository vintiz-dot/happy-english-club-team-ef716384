// Exponential backoff with full jitter, capped at 60 s (C1-architecture 5.5).

export interface BackoffOptions { baseMs?: number; maxMs?: number; random?: () => number }

/** Delay before attempt number `attempt` (1 = first retry). */
export function backoffDelay(attempt: number, opts: BackoffOptions = {}): number {
  const base = opts.baseMs ?? 1000;
  const max = opts.maxMs ?? 60000;
  const rnd = opts.random ?? Math.random;
  const ceiling = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
  // Half fixed, half jitter: never zero, never above the cap.
  return Math.min(max, Math.round(ceiling / 2 + rnd() * (ceiling / 2)));
}
