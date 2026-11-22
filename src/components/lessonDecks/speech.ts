import { useCallback, useEffect, useState } from "react";

// Listen buttons in the decks use the browser's own speech synthesis: nothing is
// recorded, uploaded or re-hosted (the book's class audio stays on the teacher's
// copy; slides only show its track number). Voice and speed are a per-device
// preference in localStorage.

export type Accent = "en-GB" | "en-US";
export type SpeechPrefs = { accent: Accent; slow: boolean };
const KEY = "hec.lessonDecks.speech";

function readPrefs(): SpeechPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && (v.accent === "en-GB" || v.accent === "en-US")) return { accent: v.accent, slow: !!v.slow };
  } catch { /* private window: use the default */ }
  return { accent: "en-GB", slow: false };
}

/** Blanks read as a pause, and the ⟶ / ___ marks the slides use are not spoken. */
export function speakable(text: string): string {
  return text.replace(/_{2,}/g, " ... ").replace(/[→⟶]/g, ", ").replace(/\s+/g, " ").trim();
}

export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [prefs, setPrefs] = useState<SpeechPrefs>(readPrefs);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const update = useCallback((p: Partial<SpeechPrefs>) => {
    setPrefs((old) => {
      const next = { ...old, ...p };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* not saved; fine */ }
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = prefs.accent;
    const voice = voices.find((v) => v.lang === prefs.accent) ?? voices.find((v) => v.lang.startsWith(prefs.accent.slice(0, 2)) && v.lang.endsWith(prefs.accent.slice(3)));
    if (voice) u.voice = voice;
    u.rate = prefs.slow ? 0.7 : 0.95;
    synth.speak(u);
  }, [supported, prefs, voices]);

  const hasAccent = (a: Accent) => voices.some((v) => v.lang === a || v.lang.replace("_", "-") === a);
  return { supported, prefs, update, speak, hasAccent, stop: () => supported && window.speechSynthesis.cancel() };
}
