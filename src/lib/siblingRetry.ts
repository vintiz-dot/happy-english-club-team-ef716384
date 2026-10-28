// When calculate-tuition reports the family discount as "unresolved" (another
// request is still working it out), the screen asks again on its own instead
// of asking an admin to refresh. Imports nothing so tests can load it.

export const SIBLING_RETRY_MAX_ATTEMPTS = 8;
const FIRST_DELAY_MS = 3000;
const MAX_DELAY_MS = 30000;

/** Delay before the next automatic retry, or false to stop retrying. */
export function siblingRetryDelayMs(status: string | undefined | null, attemptsSoFar: number): number | false {
  if (status !== "unresolved") return false;
  if (attemptsSoFar >= SIBLING_RETRY_MAX_ATTEMPTS) return false;
  return Math.min(FIRST_DELAY_MS * 2 ** Math.max(0, attemptsSoFar), MAX_DELAY_MS);
}
