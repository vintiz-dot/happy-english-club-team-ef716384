// Whether a click handler's result is still running (a promise), so Button can
// show a busy state for it and ignore repeat clicks. Pure; no imports.
export function isThenable(x: unknown): x is PromiseLike<unknown> {
  return x != null && (typeof x === "object" || typeof x === "function") && typeof (x as { then?: unknown }).then === "function";
}

/**
 * Decide what a Button does with its onClick's result.
 * Sync result: nothing changes. Thenable: busy until it settles (either way),
 * and `done` is called exactly once. Rejections are NOT swallowed: the
 * original promise is untouched, we only observe it.
 */
export function trackClickResult(result: unknown, start: () => void, done: () => void): boolean {
  if (!isThenable(result)) return false;
  start();
  let finished = false;
  const finish = () => { if (!finished) { finished = true; done(); } };
  result.then(finish, finish);
  return true;
}

/** Busy and the dev-chosen `loading` both block clicks. */
export function isClickBlocked(opts: { busy: boolean; loading?: boolean; disabled?: boolean }): boolean {
  return !!(opts.busy || opts.loading || opts.disabled);
}
