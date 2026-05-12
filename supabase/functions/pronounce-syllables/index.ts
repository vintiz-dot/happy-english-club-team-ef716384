/**
 * pronounce-word Edge Function (legacy path: pronounce-syllables)
 * ================================================================
 * Returns a single, natural Azure TTS rendering of a word — the previous
 * syllable-chunked output produced unnatural, robotic pronunciation and is
 * removed in favour of one clean utterance.
 *
 * The function still ships an orthographic syllabification for visual
 * display (the chip row in WordExplorer) but the audio is one continuous
 * "say the word, brief pause, repeat slowly for emphasis" track using
 * Azure Speech Services' neural voice via the REST endpoint.
 *
 * Endpoint name remains `pronounce-syllables` so existing Lovable
 * deployments continue to work without re-routing.
 *
 * Input:  { word: string, voice?: string, slow?: boolean }
 * Output: { audioBase64: string,
 *           mime: "audio/mpeg",
 *           syllables: string[],     // for display only
 *           duration: number,
 *           word: string }
 *
 * Secrets required: azure_key
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AZURE_REGION = "southeastasia";
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

// ─── Lightweight orthographic syllabifier — used only for the visual chip row. ──
const VOWELS = new Set("aeiouy");
const DIGRAPHS = new Set(["ch", "sh", "th", "ph", "wh", "gh", "ck", "ng", "qu"]);
const ONSET_BLENDS = new Set([
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr",
  "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw",
  "scr", "spl", "spr", "str", "thr", "shr",
]);

function countSyllableNuclei(word: string): number {
  const w = word.toLowerCase();
  let count = 0;
  let inVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = VOWELS.has(w[i]);
    if (isVowel && !inVowel) { count++; inVowel = true; }
    else if (!isVowel) inVowel = false;
  }
  if (count > 1 && w.endsWith("e") && !VOWELS.has(w[w.length - 2])) count--;
  return Math.max(1, count);
}

function splitOrthographic(word: string, targetCount: number): string[] {
  if (targetCount <= 1 || word.length <= 2) return [word];
  const w = word.toLowerCase();
  const breaks: number[] = [];
  for (let i = 1; i < w.length - 1; i++) {
    const prev = w[i - 1];
    const cur = w[i];
    const next = w[i + 1];
    if (DIGRAPHS.has(prev + cur) || DIGRAPHS.has(cur + next)) continue;
    const isPrevVowel = VOWELS.has(prev);
    const isCurVowel = VOWELS.has(cur);
    const isNextVowel = VOWELS.has(next);
    if (isPrevVowel && !isCurVowel && isNextVowel) {
      breaks.push(i);
    } else if (isPrevVowel && !isCurVowel && !isNextVowel && i + 2 < w.length && VOWELS.has(w[i + 2])) {
      const rightOnset = cur + next;
      if (ONSET_BLENDS.has(rightOnset) || DIGRAPHS.has(rightOnset)) breaks.push(i);
      else breaks.push(i + 1);
    }
  }
  const uniqueBreaks = Array.from(new Set(breaks)).sort((a, b) => a - b)
    .slice(0, Math.max(0, targetCount - 1));
  if (uniqueBreaks.length === 0) return [word];
  const out: string[] = [];
  let prev = 0;
  for (const b of uniqueBreaks) {
    if (b <= prev) continue;
    out.push(word.slice(prev, b));
    prev = b;
  }
  out.push(word.slice(prev));
  const cleaned = out.filter((s) => s.trim().length > 0);
  return cleaned.join("") === word ? cleaned : [word];
}

function syllabify(word: string): string[] {
  const trimmed = word.trim();
  if (!trimmed) return [];
  if (!/^[A-Za-z'-]+$/.test(trimmed)) return [trimmed];
  return splitOrthographic(trimmed, countSyllableNuclei(trimmed));
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

/**
 * Build SSML for a clear, kid-friendly single utterance.
 * - says the word at a slightly slowed rate for clarity
 * - 500ms pause
 * - says it again at slightly slower rate for emphasis (helps learners)
 * No syllable chunking — the neural voice handles natural prosody.
 */
function buildSsml(word: string, voice: string, slow: boolean): string {
  const safe = escapeXml(word);
  const firstRate = slow ? "-25%" : "-10%";
  const secondRate = slow ? "-35%" : "-20%";
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
      `<voice name="${voice}">` +
        `<prosody rate="${firstRate}">${safe}</prosody>` +
        `<break time="500ms"/>` +
        `<prosody rate="${secondRate}">${safe}</prosody>` +
      `</voice>` +
    `</speak>`
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { word, voice, slow } = await req.json();
    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanWord = word.trim();
    const selectedVoice = (typeof voice === "string" && voice.trim()) || DEFAULT_VOICE;
    const syllables = syllabify(cleanWord);

    const azureKey = Deno.env.get("azure_key");
    if (!azureKey) {
      return new Response(
        JSON.stringify({ error: "Azure Speech not configured", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ssml = buildSsml(cleanWord, selectedVoice, !!slow);
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
