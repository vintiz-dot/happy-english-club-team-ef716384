import "https://deno.land/x/xhr@0.1.0/mod.ts";
import * as sdk from "npm:microsoft-cognitiveservices-speech-sdk@1.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VisemeFrame {
  audioOffset: number;       // milliseconds
  blendShapes: number[][];   // [frames][55] per Azure 3D blendshape spec
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { text, voice = "en-US-JennyNeural" } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("azure_key");
    if (!key) throw new Error("azure_key not configured");

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, "southeastasia");
    speechConfig.speechSynthesisVoiceName = voice;
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    const pullStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    const visemes: VisemeFrame[] = [];

    synthesizer.visemeReceived = (_s, e) => {
      let blendShapes: number[][] = [];
      try {
        if (e.animation) {
          const anim = JSON.parse(e.animation);
          blendShapes = anim.BlendShapes ?? anim.blendShapes ?? [];
        }
      } catch (err) {
        console.error("viseme parse error", err);
      }
      visemes.push({
        audioOffset: e.audioOffset / 10000,
        blendShapes,
      });
    };

    const ssml = `
      <speak version="1.0" xml:lang="en-US"
             xmlns:mstts="https://www.w3.org/2001/mstts">
        <voice name="${voice}">
          <mstts:viseme type="FacialExpression"/>
          ${text.replace(/[<>&]/g, (c: string) =>
            ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}
        </voice>
      </speak>`;

    const audioBytes: Uint8Array = await new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(new Uint8Array(result.audioData));
          } else {
            reject(new Error(result.errorDetails || "synthesis failed"));
          }
        },
        (err) => {
          synthesizer.close();
          reject(err);
        }
      );
    });

    let bin = "";
    for (let i = 0; i < audioBytes.length; i++) bin += String.fromCharCode(audioBytes[i]);
    const audioBase64 = btoa(bin);

    return new Response(
      JSON.stringify({
        audioBase64,
        mime: "audio/mpeg",
        visemes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("pronounce-viseme fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
