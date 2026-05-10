/**
 * pronounce-viseme Edge Function
 * ================================
 * Uses Azure Cognitive Services TTS to synthesize speech for a vocabulary word
 * and returns both the audio (base64) and viseme timeline data so the frontend
 * can animate a mouth in sync with the pronunciation.
 *
 * Input:  { word: string, voice?: string, sentence?: boolean }
 * Output: { audioBase64: string, visemes: { id: number, offset: number }[], duration: number }
 *
 * Secrets required (Supabase Dashboard → Edge Functions → Secrets):
 *   azure_key             — Azure Speech Services subscription key (Lovable secret)
 *   AZURE_SPEECH_REGION   — Azure region (e.g. "southeastasia", "eastus")
 *
 * Azure Viseme IDs (0-21):
 *   0=silence, 1=æ/ə/ʌ, 2=ɑ, 3=ɔ, 4=ɛ/ʊ, 5=ɝ, 6=j/i/ɪ, 7=w/u,
 *   8=o, 9=aʊ, 10=ɔɪ, 11=aɪ, 12=h, 13=ɹ, 14=l, 15=s/z,
 *   16=ʃ/tʃ/dʒ/ʒ, 17=ð, 18=f/v, 19=d/t/n/θ, 20=k/g/ŋ, 21=p/b/m
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Default voice — US English, friendly, clear pronunciation for ESL learners
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, voice, sentence } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const speechKey = Deno.env.get("azure_key");
    const speechRegion = Deno.env.get("AZURE_SPEECH_REGION") || "southeastasia";

    if (!speechKey) {
      console.error(
        "azure_key not set in Lovable secrets."
      );
      return new Response(
        JSON.stringify({
          error: "Azure Speech not configured",
          fallback: true,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const selectedVoice = voice || DEFAULT_VOICE;

    // ── Build SSML with slow rate for ESL learners ──
    // For sentences, use slightly faster rate; for single words, use slow rate
    const rate = sentence ? "-10%" : "-20%";
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
  xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${selectedVoice}">
    <prosody rate="${rate}" pitch="+0%">
      ${escapeXml(word.trim())}
    </prosody>
  </voice>
</speak>`;

    // ── Call Azure TTS REST API requesting viseme data ──
    const endpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ttsResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
        // Request viseme data in the response
        "X-Microsoft-Viseme": "true",
      },
      body: ssml,
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("Azure TTS error:", ttsResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "TTS synthesis failed", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Audio comes in the response body
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);

    // Viseme data comes in the X-Microsoft-Viseme-Data header (JSON array)
    const visemeHeader = ttsResponse.headers.get("X-Microsoft-Viseme-Data");

    let visemes: { id: number; offset: number }[] = [];
    if (visemeHeader) {
      try {
        const parsed = JSON.parse(visemeHeader);
        if (Array.isArray(parsed)) {
          visemes = parsed.map(
            (v: { VisemeId: number; AudioOffset: number }) => ({
              id: v.VisemeId,
              offset: v.AudioOffset / 10000, // Convert 100-nanosecond ticks → milliseconds
            })
          );
        }
      } catch (e) {
        console.error("Failed to parse viseme header:", e);
      }
    }

    // If no viseme header (some regions/voices may not return it in REST),
    // fall back to the WebSocket approach estimation
    if (visemes.length === 0) {
      visemes = estimateVisemes(word.trim());
    }

    // Estimate audio duration from buffer size
    // MP3 at 64kbps: duration_seconds = (bytes * 8) / 64000
    const durationMs = Math.round((audioBuffer.byteLength * 8) / 64000 * 1000);

    return new Response(
      JSON.stringify({
        audioBase64,
        contentType: "audio/mpeg",
        visemes,
        duration: durationMs,
        word: word.trim(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("pronounce-viseme error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─── Utilities ──────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Fallback viseme estimation when the TTS API doesn't return viseme headers.
 * Maps common English phoneme patterns to approximate viseme IDs.
 * This is a rough heuristic — the real Azure SDK WebSocket approach is more accurate.
 */
function estimateVisemes(
  word: string
): { id: number; offset: number }[] {
  const PHONEME_TO_VISEME: Record<string, number> = {
    a: 1, e: 4, i: 6, o: 8, u: 7,
    b: 21, p: 21, m: 21,
    f: 18, v: 18,
    th: 17,
    s: 15, z: 15, c: 15,
    sh: 16, ch: 16, j: 16,
    t: 19, d: 19, n: 19, l: 14,
    r: 13, k: 20, g: 20,
    w: 7, y: 6, h: 12, q: 20, x: 15,
  };

  const result: { id: number; offset: number }[] = [];
  // Rough timing: ~120ms per phoneme for slow speech
  const msPerPhone = 120;
  let offset = 50; // small initial delay

  // Start with silence
  result.push({ id: 0, offset: 0 });

  const lower = word.toLowerCase();
  let idx = 0;
  while (idx < lower.length) {
    // Try digraphs first
    if (idx + 1 < lower.length) {
      const digraph = lower.substring(idx, idx + 2);
      if (PHONEME_TO_VISEME[digraph] !== undefined) {
        result.push({ id: PHONEME_TO_VISEME[digraph], offset });
        offset += msPerPhone;
        idx += 2;
        continue;
      }
    }
    // Single character
    const ch = lower[idx];
    if (PHONEME_TO_VISEME[ch] !== undefined) {
      result.push({ id: PHONEME_TO_VISEME[ch], offset });
      offset += msPerPhone;
    }
    idx++;
  }

  // End with silence
  result.push({ id: 0, offset: offset + 50 });

  return result;
}
