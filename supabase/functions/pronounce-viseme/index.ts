/**
 * pronounce-viseme Edge Function
 * ================================
 * Uses the Azure Speech SDK to synthesize speech and return BOTH:
 *   - audio (base64, MP3)
 *   - a blend-shape animation track (Azure's 55-blendshape "FacialExpression"
 *     output, ~60 fps), aligned to the audio via audioOffset (milliseconds).
 *
 * Reference: https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme?tabs=3dblendshapes
 *
 * Input:  { word: string, voice?: string, sentence?: boolean }
 * Output: {
 *           audioBase64: string,
 *           mime: "audio/mpeg",
 *           // Each viseme frame batch from Azure carries one or more rows of
 *           // 55 blend-shape values. We flatten across batches into a single
 *           // ordered sequence with the absolute time of each row.
 *           // visemeId (0-21) is Azure's classic 2D viseme — kept alongside
 *           // the blend-shape data so the client can drive a simple lip-shape
 *           // image overlay without re-deriving it from blendShapes.
 *           visemes: { audioOffset: number; visemeId: number; blendShapes: number[][] }[],
 *           duration: number,
 *           word: string,
 *         }
 *
 * Secrets required (Supabase Dashboard → Edge Functions → Secrets):
 *   azure_key — Azure Speech Services subscription key
 *
 * Region is fixed to "southeastasia" (matches the rest of the app).
 *
 * Package: npm:microsoft-cognitiveservices-speech-sdk@1.40.0
 */

import * as sdk from "npm:microsoft-cognitiveservices-speech-sdk@1.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AZURE_REGION = "southeastasia";
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

interface VisemeBatch {
  audioOffset: number;     // ms from audio start (absolute time of first row)
  visemeId: number;        // Azure's classic 2D viseme ID (0-21) for this phoneme
  blendShapes: number[][]; // each row = 55 floats (Azure's blend-shape order)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, voice, sentence } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const speechKey = Deno.env.get("azure_key");
    if (!speechKey) {
      console.error("azure_key not set in edge function secrets");
      return new Response(
        JSON.stringify({ error: "Azure Speech not configured", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedVoice = voice || DEFAULT_VOICE;
    const rate = sentence ? "-10%" : "-20%";

    // SSML with mstts:viseme type="FacialExpression" → blend-shape animation track
    const ssml =
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
      `xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">` +
      `<voice name="${selectedVoice}">` +
      `<mstts:viseme type="FacialExpression"/>` +
      `<prosody rate="${rate}" pitch="+0%">${escapeXml(word.trim())}</prosody>` +
      `</voice></speak>`;

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, AZURE_REGION);
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz64KBitRateMonoMp3;
    speechConfig.setProperty(
      sdk.PropertyId.SpeechServiceResponse_RequestSentenceBoundary,
      "true"
    );

    // Passing null for AudioConfig keeps the audio in result.audioData rather
    // than writing to a speaker/file (which is what we want server-side).
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const visemes: VisemeBatch[] = [];

    synthesizer.visemeReceived = (_s, e) => {
      // When SSML requests FacialExpression, e.animation is a JSON string with
      // a per-frame blend-shape track. Shape varies slightly across SDK
      // versions, so we defensively handle the common variants:
      //   { FrameIndex, BlendShapes: number[][] }
      //   { BlendShapes: number[][] }
      //   { blendShapes: number[][] }
      // The same event also carries e.visemeId — Azure's classic 2D viseme
      // (0-21) — which we forward to the client for lip-image overlay.
      const audioOffsetMs = Number(e.audioOffset) / 10000;
      const visemeId = Number(e.visemeId) || 0;
      if (!e.animation) return;
      try {
        const parsed = JSON.parse(e.animation);
        const rows: number[][] =
          parsed.BlendShapes ?? parsed.blendShapes ?? [];
        if (Array.isArray(rows) && rows.length > 0) {
          visemes.push({ audioOffset: audioOffsetMs, visemeId, blendShapes: rows });
        }
      } catch (err) {
        console.error("Failed to parse viseme animation payload:", err);
      }
    };

    const result = await new Promise<sdk.SpeechSynthesisResult>(
      (resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (res) => resolve(res),
          (err) => reject(err)
        );
      }
    );

    synthesizer.close();

    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      console.error("Synthesis failed:", result.errorDetails, result.reason);
      return new Response(
        JSON.stringify({
          error: "TTS synthesis failed",
          details: result.errorDetails,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = result.audioData;
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const durationMs = Math.round((audioBuffer.byteLength * 8) / 64000 * 1000);

    return new Response(
      JSON.stringify({
        audioBase64,
        mime: "audio/mpeg",
        contentType: "audio/mpeg", // back-compat with older callers
        visemes,
        duration: durationMs,
        word: word.trim(),
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
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
}
