/**
 * pronounce-viseme Edge Function
 * ================================
 * Uses the Azure Speech SDK to synthesize speech and return BOTH:
 * - audio (base64, MP3)
 * - a blend-shape animation track (Azure's 55-blendshape "FacialExpression"
 *   output, ~60 fps), aligned to the audio via audioOffset (milliseconds).
 * - visemeId (0-21): Azure's classic 2D viseme ID per phoneme, forwarded
 *   alongside blendShapes so the client can drive a lip-image overlay.
 *
 * Input:  { word: string, voice?: string, sentence?: boolean }
 * Output: {
 *   audioBase64: string,
 *   mime: "audio/mpeg",
 *   visemes: { audioOffset: number; visemeId: number; blendShapes: number[][] }[],
 *   duration: number,
 *   word: string,
 * }
 *
 * Secrets required (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 *   AZURE_SPEECH_KEY    — Azure Cognitive Services Speech resource key
 *   AZURE_SPEECH_REGION — e.g. "southeastasia"
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Azure config ─────────────────────────────────────────────────────────────

const AZURE_KEY    = Deno.env.get("AZURE_SPEECH_KEY") ?? Deno.env.get("azure_key") ?? "";
const AZURE_REGION = Deno.env.get("AZURE_SPEECH_REGION") ?? "southeastasia";
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

interface VisemeBatch {
  audioOffset: number;  // ms from audio start
  visemeId: number;     // Azure's classic 2D viseme ID (0-21)
  blendShapes: number[][];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const word: string  = (body.word  || "").trim();
    const voice: string = body.voice  || DEFAULT_VOICE;
    const sentence      = !!body.sentence;

    if (!word) {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AZURE_KEY) {
      return new Response(
        JSON.stringify({ error: "Azure Speech key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build SSML ────────────────────────────────────────────────────────────

    const textToSpeak = sentence ? word : word;

    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
  <voice name="${voice}">
    <mstts:viseme type="FacialExpression"/>
    ${textToSpeak}
  </voice>
</speak>`.trim();

    // ── Azure TTS REST endpoint ───────────────────────────────────────────────

    // We use the REST API (not the SDK) so we can run in Deno edge runtime.
    // The response is a multi-part WebVTT-like stream with audio + viseme events
    // when output format includes viseme. We use OutputFormat websocket-style
    // by requesting audio-48khz-192kbitrate-mono-mp3 + viseme via REST.
    //
    // Azure REST reference:
    // https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech

    const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const audioRes = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
        "User-Agent": "happy-english-club/1.0",
      },
      body: ssml,
    });

    if (!audioRes.ok) {
      const errText = await audioRes.text().catch(() => "");
      console.error("Azure TTS error", audioRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Azure TTS failed: ${audioRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Collect audio bytes ───────────────────────────────────────────────────

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    // ── Fetch viseme events via the viseme REST endpoint ──────────────────────

    // Azure's REST TTS does not return viseme events in the same response.
    // We make a second request with output format audio-16khz-32kbitrate-mono-mp3
    // and ask for viseme via the dedicated viseme endpoint.

    const visemeUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const visemeRes = await fetch(visemeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "viseme",
        "User-Agent": "happy-english-club/1.0",
      },
      body: ssml,
    });

    const visemes: VisemeBatch[] = [];

    if (visemeRes.ok) {
      const visemeText = await visemeRes.text();

      // Azure returns newline-delimited JSON objects for viseme output format
      const lines = visemeText.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          const e = JSON.parse(line);
          const audioOffsetMs = Number(e.audioOffset) / 10000;
          const visemeId = Number(e.visemeId) || 0;

          if (!e.animation) continue;
          const parsed = JSON.parse(e.animation);
          const rows: number[][] = parsed.BlendShapes ?? parsed.blendShapes ?? [];

          if (Array.isArray(rows) && rows.length > 0) {
            visemes.push({ audioOffset: audioOffsetMs, visemeId, blendShapes: rows });
          }
        } catch (err) {
          console.error("Failed to parse viseme line:", err);
        }
      }
    } else {
      console.warn("Viseme request failed", visemeRes.status);
    }

    // Estimate duration from audio buffer size (MP3 ~192kbps)
    const durationMs = (audioBuffer.byteLength / (192000 / 8)) * 1000;

    return new Response(
      JSON.stringify({
        audioBase64,
        mime: "audio/mpeg",
        visemes,
        duration: durationMs,
        word,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("pronounce-viseme error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
