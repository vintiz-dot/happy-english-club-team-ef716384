/**
 * A tab left open across a deploy (Cloudflare builds main) still asks for the
 * old lazy chunk files, which are gone: opening another page then fails with
 * "Failed to fetch dynamically imported module". Until 23 Nov 2026 the error
 * boundary answered that by sending the browser to /dashboard (a full page
 * load, landing on Schedule) - and a full page load ended a lesson being
 * recorded (Mars, 23 Nov 2026: stopped as crash_recovered at 19:56).
 *
 * Now: a chunk that fails to load reloads THE SAME URL once (the new build has
 * the page), unless a lesson is being recorded - then the page says so and the
 * teacher decides (a reload resumes the recording, but costs a few seconds).
 * Pure helpers, tested by scripts/pgtest/chunk-reload.test.mjs.
 */

/** The texts browsers use for a lazy chunk that could not be fetched (Chrome, Safari, Firefox, Vite). */
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk/i;

export function isChunkLoadError(e: unknown): boolean {
  if (!e) return false;
  const err = e as { name?: string; message?: string };
  return CHUNK_ERROR.test(`${err?.name ?? ""} ${err?.message ?? String(e)}`);
}

export const RELOAD_KEY = "hec-chunk-reload";
/** One automatic reload per URL in this window: a second failure soon after is shown, never looped. */
export const RELOAD_WINDOW_MS = 60_000;

type StoreLike = Pick<Storage, "getItem" | "setItem">;

/** Pure: may this URL be reloaded automatically now? */
export function mayReload(last: string | null, url: string, nowMs: number): boolean {
  if (!last) return true;
  try {
    const r = JSON.parse(last) as { url?: string; at?: number };
    return !(r.url === url && typeof r.at === "number" && nowMs - r.at < RELOAD_WINDOW_MS);
  } catch { return true; }
}

/** Is a lesson being recorded (or armed, or still saving) in this tab? Set by the recorder session. */
export function recorderBusy(): boolean {
  try { return !!(globalThis as { __hecRecorderBusy?: boolean }).__hecRecorderBusy; } catch { return false; }
}
export function setRecorderBusy(on: boolean) {
  try { (globalThis as { __hecRecorderBusy?: boolean }).__hecRecorderBusy = on; } catch { /* */ }
}

/**
 * Reload the current URL once for a stale chunk. False when it must not
 * (already tried for this URL a moment ago, or a lesson is being recorded).
 */
export function reloadForNewVersion(store: StoreLike | null = safeSession(), nowMs = Date.now()): boolean {
  if (typeof window === "undefined" || recorderBusy()) return false;
  const url = window.location.pathname + window.location.search + window.location.hash;
  if (!mayReload(store?.getItem(RELOAD_KEY) ?? null, url, nowMs)) return false;
  try { store?.setItem(RELOAD_KEY, JSON.stringify({ url, at: nowMs })); } catch { /* private window: reload anyway */ }
  window.location.reload();
  return true;
}

function safeSession(): StoreLike | null {
  try { return typeof sessionStorage === "undefined" ? null : sessionStorage; } catch { return null; }
}

let hooked = false;
/** Vite's own signal for a preload (JS or CSS) that failed: reload once in place, as above. */
export function hookPreloadErrors() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  window.addEventListener("vite:preloadError", (ev) => {
    if (reloadForNewVersion()) ev.preventDefault();
  });
}
