/**
 * Small helpers for the "easy" video recorder that Grade 1-3 children use.
 * Pure, so they are tested without a browser. Nothing here touches the
 * camera: that stays in VideoRecorder.
 */

/**
 * Zalo, Facebook, Messenger and Instagram open links in their own embedded
 * browser, which usually blocks the camera. The family should be told to open
 * the link in Chrome or Safari before the child meets a "camera blocked" error.
 * (The same check the school website's recording page makes.)
 */
export function inAppBrowser(userAgent: string): boolean {
  return /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\//i.test(userAgent || "");
}

/** The three things a child does, in order. Pictures first, words second. */
export const KID_STEPS = [
  { id: "look", emoji: "👀", en: "Look", vi: "Xem" },
  { id: "record", emoji: "🎥", en: "Record", vi: "Quay" },
  { id: "send", emoji: "📤", en: "Send", vi: "Gửi" },
] as const;
export type KidStep = (typeof KID_STEPS)[number]["id"];

/** Which step a recorder phase is on. */
export function stepFor(phase: string): KidStep {
  if (phase === "review") return "send";
  if (phase === "idle") return "look";
  return "record";
}

/**
 * Run an upload again when the connection drops. Home wifi in a phone call
 * with a six-year-old is not reliable, and a 40 MB video that fails at 95%
 * should repeat that piece, not make the child record it again.
 */
export async function withRetry<T>(
  work: () => Promise<T>,
  { tries = 4, wait = (n: number) => 800 * 2 ** n }: { tries?: number; wait?: (attempt: number) => number } = {},
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  let last: unknown;
  for (let n = 0; n < tries; n++) {
    try {
      return await work();
    } catch (e) {
      last = e;
      if (n < tries - 1) await sleep(wait(n));
    }
  }
  throw last;
}

/** Read a sentence aloud in the browser's English voice, slowly enough for a child. */
export function speak(text: string, lang = "en-US"): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
  return true;
}
