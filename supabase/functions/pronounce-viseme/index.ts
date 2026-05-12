/**
 * pronounce-viseme Edge Function
 * ================================
 * Uses the Azure Cognitive Services Speech SDK (over npm) to synthesize
 * speech AND collect viseme events (which include both the classic 2D
 * visemeId and the 55-channel "FacialExpression" blend-shape animation
 * frames). Visemes are NOT returned by the REST TTS endpoint — they are
 * only delivered over the SDK's websocket transport, which is why the
 * previous REST-only implementation always returned an empty array.
 *
 * Input:  { word: string, voice?: string, sentence?: boolean }
 * Output: {
 *   audioBase64: string,
 *   mime: "audio/mpeg",
 *   visemes: { audioOffset: number; visemeId: number; blendShapes: number[][] }[],
 *   duration: number,
 *   word: string,
 * }
 */

import * as sdk from "npm:microsoft-cognitiveservices-speech-sdk@1.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AZURE_KEY    = Deno.env.get("AZURE_SPEECH_KEY") ?? Deno.env.get("azure_key") ?? "";
const AZURE_REGION = Deno.env.get("AZURE_SPEECH_REGION") ?? "southeastasia";
const DEFAULT_VOICE = "en-US-AvaMultilingualNeural";

interface VisemeBatch {
  audioOffset: number;  // ms
  visemeId: number;
  blendShapes: number[][];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const word: string  = (body.word  || "").trim();
    const voice: string = body.voice  || DEFAULT_VOICE;

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

    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechSynthesisVoiceName = voice;
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

    // Pass `null` for the audio output so the SDK doesn't try to play audio
    // server-side; we read the bytes from the result instead.
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as any);

    const visemes: VisemeBatch[] = [];

    synthesizer.visemeReceived = (_s: unknown, e: any) => {
      const audioOffsetMs = Number(e.audioOffset) / 10000;
      const visemeId = Number(e.visemeId) || 0;

      let blendShapes: number[][] = [];
      if (e.animation) {
        try {
          const parsed = JSON.parse(e.animation);
          blendShapes = parsed.BlendShapes ?? parsed.blendShapes ?? [];
        } catch (err) {
          console.error("Failed to parse animation JSON:", err);
        }
      }

      visemes.push({ audioOffset: audioOffsetMs, visemeId, blendShapes });
    };

    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
  <voice name="${voice}">
    <mstts:viseme type="FacialExpression"/>
    ${word}
  </voice>
</speak>`.trim();

    const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (r) => { resolve(r); },
        (err) => { reject(err); },
      );
    });

    try { synthesizer.close(); } catch { /* noop */ }

    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      const details = (result as any).errorDetails || "synthesis failed";
      console.error("Azure SDK synth failed:", details);
      return new Response(
        JSON.stringify({ error: `Azure synthesis failed: ${details}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBytes = new Uint8Array(result.audioData);
    const audioBase64 = bytesToBase64(audioBytes);
    const durationMs =
      Number(result.audioDuration) > 0
        ? Number(result.audioDuration) / 10000
        : (audioBytes.byteLength / (192000 / 8)) * 1000;

    console.log(`Synth ok: ${audioBytes.byteLength} bytes, ${visemes.length} viseme events`);

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
      JSON.stringify({ error: String((error as any)?.message || error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
