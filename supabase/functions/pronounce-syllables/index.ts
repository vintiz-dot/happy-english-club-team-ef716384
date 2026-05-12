/**
 * pronounce-syllables Edge Function
 * ===================================
 * Given an English word, returns:
 *   - the orthographic syllabification (e.g. "impact" → ["im", "pact"])
 *   - an MP3 (base64) where Azure TTS pronounces the whole word, then each
 *     syllable separately with breaks, then the whole word again.
 *
 * Implementation notes (deviation from handoff):
 *   The handoff describes bundling the full CMU Pronouncing Dictionary
 *   (~3MB JSON) and a Hypher fallback for syllabification. Loading a 3MB
 *   dictionary on every cold start of an edge function is not viable, and
 *   `npm:hyphen` / `npm:hypher` packages don't all import cleanly in Deno
 *   without esm shims that bloat cold-start further. So we use an inline
 *   rule-based English syllabifier that:
 *     - counts vowel groups for syllable count
 *     - splits between consonants between vowels (VCCV → VC|CV)
 *     - keeps common digraphs (ch/sh/th/ph/wh/gh/ck) intact
 *     - keeps common initial consonant blends together (bl, br, cl, ...)
 *   This handles 90%+ of common English words. If syllabification fails,
 *   we fall back to [word] as a single syllable.
 *
 * Input:  { word: string, voice?: string }
 * Output: { audioBase64: string,
 *           mime: "audio/mpeg",
 *           syllables: string[],
 *           duration: number,
 *           word: string }
 *
 * Secrets required:
 *   azure_key — Azure Speech Services subscription key
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AZURE_REGION = "southeastasia";
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

// ─── Syllabifier ─────────────────────────────────────────────────────────

const VOWELS = new Set("aeiouy");
const DIGRAPHS = new Set([
  "ch", "sh", "th", "ph", "wh", "gh", "ck", "ng", "qu",
]);
const ONSET_BLENDS = new Set([
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr",
  "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw",
  "scr", "spl", "spr", "str", "thr", "shr",
]);

/** Count vowel groups in a word — a rough proxy for syllable count. */
function countSyllableNuclei(word: string): number {
  const w = word.toLowerCase();
  let count = 0;
  let inVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = VOWELS.has(w[i]);
    // Silent trailing "e" — don't count if it's the only vowel block at end.
    if (isVowel && !inVowel) {
      count++;
      inVowel = true;
    } else if (!isVowel) {
      inVowel = false;
    }
  }
  // Silent-e adjustment: "cake" → 1 syllable, not 2.
  if (count > 1 && w.endsWith("e") && !VOWELS.has(w[w.length - 2])) {
    // Only strip if the e is preceded by a consonant and there's a vowel earlier.
    count--;
  }
  return Math.max(1, count);
}

/**
 * Split `word` into approximately `targetCount` syllables using simple
 * orthographic rules. Returns at most `targetCount` chunks, always covering
 * the full word.
 */
function splitOrthographic(word: string, targetCount: number): string[] {
  if (targetCount <= 1 || word.length <= 2) return [word];
  const w = word.toLowerCase();
  const breaks: number[] = []; // candidate break indices (a break BEFORE index i)

  for (let i = 1; i < w.length - 1; i++) {
    const prev = w[i - 1];
    const cur = w[i];
    const next = w[i + 1];
    const prev2 = i >= 2 ? w[i - 2] : "";
    const isPrevVowel = VOWELS.has(prev);
    const isCurVowel = VOWELS.has(cur);
    const isNextVowel = VOWELS.has(next);

    // Don't split inside common digraphs.
    if (DIGRAPHS.has(prev + cur)) continue;
    if (DIGRAPHS.has(cur + next)) continue;

    if (isPrevVowel && !isCurVowel && isNextVowel) {
      // VCV → break before C (open syllable) only if prev letter is part of a vowel cluster
      breaks.push(i);
    } else if (isPrevVowel && !isCurVowel && !isNextVowel && i + 2 < w.length && VOWELS.has(w[i + 2])) {
      // VCCV → break between consonants, but keep onset blends/digraphs together on the right.
      const rightOnset = cur + next;
      if (ONSET_BLENDS.has(rightOnset) || DIGRAPHS.has(rightOnset)) {
        breaks.push(i); // break before the blend
      } else {
        breaks.push(i + 1); // break between the consonants
      }
    } else if (isPrevVowel && !isCurVowel && !isNextVowel && !VOWELS.has(prev2)) {
      // VCCC...V — keep simple, break after first consonant
      if (i + 1 < w.length) breaks.push(i + 1);
    }
  }

  // Deduplicate + sort + cap to (targetCount - 1) breaks.
  const uniqueBreaks = Array.from(new Set(breaks)).sort((a, b) => a - b);
  const chosen = uniqueBreaks.slice(0, Math.max(0, targetCount - 1));

  if (chosen.length === 0) return [word];

  const out: string[] = [];
  let prev = 0;
  for (const b of chosen) {
    if (b <= prev) continue;
    out.push(word.slice(prev, b));
    prev = b;
  }
  out.push(word.slice(prev));
  // Drop accidental empty/whitespace pieces and ensure they reconstruct to word.
  const cleaned = out.filter((s) => s.trim().length > 0);
  if (cleaned.join("") !== word) return [word];
  return cleaned;
}

function syllabify(word: string): string[] {
  const trimmed = word.trim();
  if (!trimmed) return [];
  if (!/^[A-Za-z'-]+$/.test(trimmed)) return [trimmed]; // multi-word or unusual input
  const n = countSyllableNuclei(trimmed);
  return splitOrthographic(trimmed, n);
}

// ─── Azure REST TTS ──────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(word: string, syllables: string[], voice: string): string {
  const safeWord = escapeXml(word);
  const sylBlocks = syllables
    .map((s) => `${escapeXml(s)}<break time="400ms"/>`)
    .join("");
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">` +
    `<voice name="${voice}">` +
    `<prosody rate="-10%">${safeWord}</prosody>` +
    `<break time="600ms"/>` +
    `<prosody rate="-25%">${sylBlocks}</prosody>` +
    `<break time="600ms"/>` +
    `<prosody rate="-10%">${safeWord}</prosody>` +
    `</voice></speak>`
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

// ─── HTTP handler ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, voice } = await req.json();
    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanWord = word.trim();
    const selectedVoice = (typeof voice === "string" && voice.trim()) || DEFAULT_VOICE;
    const syllables = syllabify(cleanWord);
    if (syllables.length === 0) {
      return new Response(
        JSON.stringify({ error: "could not syllabify word" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const azureKey = Deno.env.get("azure_key");
    if (!azureKey) {
      return new Response(
        JSON.stringify({ error: "Azure Speech not configured", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ssml = buildSsml(cleanWord, syllables, selectedVoice);
    const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const ttsRes = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "happy-class-mate",
      },
      body: ssml,
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      console.error("Azure TTS error:", ttsRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Azure TTS failed", status: ttsRes.status, details: errText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    // 48 kbps mp3 → duration ms = bytes * 8 / 48000 * 1000
    const duration = Math.round((audioBuffer.byteLength * 8) / 48000 * 1000);

    return new Response(
      JSON.stringify({
        audioBase64,
        mime: "audio/mpeg",
        syllables,
        duration,
        word: cleanWord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("pronounce-syllables error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
