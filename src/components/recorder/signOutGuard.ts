/**
 * The app's sign-out passes through here first (C2 review 2, item 11), so a
 * recorder on the page can (1) refuse while a lesson is being captured, and
 * (2) call the engine's own `signOut()` - which frees the audio the server
 * already has from this laptop and keeps (and reports) what it does not -
 * before the session goes. Layout wraps its signOut with `guardedSignOut`.
 *
 * No recorder on the page: a no-op, the app signs out as before.
 */

export type SignOutHook = () => Promise<boolean>;

const hooks = new Set<SignOutHook>();

/** A recorder screen registers itself while mounted. Returns the unregister. */
export function registerSignOutHook(h: SignOutHook): () => void {
  hooks.add(h);
  return () => { hooks.delete(h); };
}

/** Run every hook; sign out only if none says no. */
export async function guardedSignOut(signOut: () => unknown): Promise<void> {
  for (const h of [...hooks]) {
    let go = true;
    try { go = await h(); } catch { go = true; }
    if (!go) return;
  }
  await signOut();
}
