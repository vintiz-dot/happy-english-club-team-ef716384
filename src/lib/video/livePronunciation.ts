/**
 * Azure pronunciation assessment, live, while the child records.
 *
 * Runs on the same microphone stream as the recording, so it costs the
 * child no extra waiting: by the time they press stop, the scores exist.
 * Unscripted mode (no reference text), because vlogs have no script.
 * Prosody (stress and intonation) is US English only, which suits.
 *
 * Best-effort throughout. No Azure key, a dropped connection, an old
 * browser: it returns null and the homework goes in without it - the
 * analysis says "not available" and the teacher still sees everything else.
 * Nothing here is shown to the child; it is evidence for the teacher.
 */
import { supabase } from "@/integrations/supabase/client";
import { aggregatePronunciation, type PronunciationSummary } from "@/lib/videoHomework";

export interface LivePronunciation {
  /** Stop listening and return the summary (null if nothing usable came back). */
  finish: () => Promise<PronunciationSummary | null>;
  /** Stop and throw everything away (a retake). */
  cancel: () => void;
}

export async function startLivePronunciation(stream: MediaStream): Promise<LivePronunciation | null> {
  try {
    if (stream.getAudioTracks().length === 0) return null;
    const { data, error } = await supabase.functions.invoke("get-speech-token");
    if (error || !data?.token || !data?.region) return null;

    const sdk = await import("microsoft-cognitiveservices-speech-sdk");
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(data.token, data.region);
    speechConfig.speechRecognitionLanguage = "en-US";
    // Long pauses are normal for children thinking of the next word.
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "1500");

    const audioConfig = sdk.AudioConfig.fromStreamInput(new MediaStream(stream.getAudioTracks()));
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const pa = new sdk.PronunciationAssessmentConfig(
      "",
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      false,
    );
    pa.enableProsodyAssessment = true;
    pa.applyTo(recognizer);

    const results: unknown[] = [];
    let closed = false;
    recognizer.recognized = (_s, e) => {
      if (e.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
      const raw = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
      try {
        results.push(JSON.parse(raw));
      } catch {
        /* one unreadable phrase is not worth failing the rest */
      }
    };
    recognizer.canceled = () => {
      /* network trouble: keep whatever was recognized so far */
    };

    await new Promise<void>((resolve, reject) =>
      recognizer.startContinuousRecognitionAsync(() => resolve(), (err) => reject(new Error(String(err)))),
    );

    const close = () => {
      if (closed) return;
      closed = true;
      try {
        recognizer.close();
      } catch {
        /* already closed */
      }
    };

    return {
      finish: async () => {
        try {
          await Promise.race([
            new Promise<void>((resolve) =>
              recognizer.stopContinuousRecognitionAsync(() => resolve(), () => resolve()),
            ),
            // The last phrase can take a moment; never keep a child waiting long.
            new Promise<void>((resolve) => setTimeout(resolve, 4000)),
          ]);
        } finally {
          close();
        }
        return aggregatePronunciation(results);
      },
      cancel: () => {
        try {
          recognizer.stopContinuousRecognitionAsync(close, close);
        } catch {
          close();
        }
      },
    };
  } catch (e) {
    console.warn("Live pronunciation unavailable:", e);
    return null;
  }
}
