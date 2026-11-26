/**
 * Voice points assistant: the on-device listener's interface (owner, 27 Nov 2026).
 *
 * The engine (src/lib/voiceAward/listener/) implements it; the UI
 * (VoiceAwardProvider, the enrolment dialog, the classroom tool card) uses it.
 *
 *   - Wake word: the teacher says "HEC" 5 times when enrolling; the engine keeps
 *     those sounds as templates (MFCC frames) and matches the start of every
 *     speech segment against them (subsequence DTW). Nothing leaves the device
 *     until it matches.
 *   - Teacher check: a WeSpeaker ResNet34 embedding (onnxruntime-web, model
 *     fetched once from Hugging Face and kept in Cache Storage) of a ~30 s
 *     reading; every command clip must score above the profile's threshold.
 *   - The profile (templates + embedding + threshold) stays on this device
 *     (IndexedDB), keyed by the teacher's user id. It is never uploaded.
 *
 * Pure types: no imports.
 */

export const VOICEPRINT_MODEL_URL =
  "https://huggingface.co/Wespeaker/wespeaker-voxceleb-resnet34-LM/resolve/main/voxceleb_resnet34_LM.onnx";
/** CC-BY-4.0: this line must stay visible wherever the voiceprint is set up. */
export const VOICEPRINT_MODEL_CREDIT =
  "Teacher voice check uses the WeSpeaker ResNet34 model (CC BY 4.0, wenet-e2e/wespeaker).";

export interface VoiceprintProfile {
  version: 1;
  userId: string;
  createdAt: string;
  /** L2-normalised speaker embedding (256 numbers). */
  embedding: number[];
  /** Cosine score a command clip must reach. Set at enrolment, never below 0.35. */
  threshold: number;
  /** One MFCC frame sequence per "HEC" sample: [sample][frame][coef]. */
  wakeTemplates: number[][][];
  /** DTW distance a segment must be under to count as "HEC". Set at enrolment. */
  wakeThreshold: number;
  /** The microphone it was recorded with (MediaDeviceInfo.label), if known. */
  micLabel: string | null;
}

export interface EnrolmentQuality {
  ok: boolean;
  /** A plain sentence for the teacher: what was wrong and what to do. */
  message: string;
}

export type ListenerState =
  | "loading" // model / mic starting
  | "listening" // waiting for "HEC"
  | "recording" // heard "HEC", capturing the command
  | "checking" // speaker check running
  | "paused"
  | "error";

export interface CommandClip {
  /** 16 kHz mono 16-bit PCM WAV, base64 (includes the wake word). */
  wavBase64: string;
  durationMs: number;
  /** Cosine score against the teacher's embedding. */
  speakerScore: number;
}

export interface ListenerEvents {
  onState(state: ListenerState, detail?: string): void;
  /** A clip that passed the wake word AND the teacher check. */
  onCommand(clip: CommandClip): void;
  /** A wake word was heard but the clip was not sent. */
  onRejected(reason: "not_teacher" | "too_short" | "too_long", score?: number): void;
  /** Mic level 0..1, about 15 times a second, for a meter. */
  onLevel?(rms: number): void;
}

export interface ListenerHandle {
  stop(): void;
  pause(): void;
  resume(): void;
}

/** What src/lib/voiceAward/listener/index.ts exports. */
export interface ListenerModule {
  loadProfile(userId: string): Promise<VoiceprintProfile | null>;
  saveProfile(profile: VoiceprintProfile): Promise<void>;
  deleteProfile(userId: string): Promise<void>;
  /** Records 16 kHz mono from the mic until stop(). */
  startRecording(opts?: { deviceId?: string }): Promise<{ stop(): Promise<Float32Array>; level(): number }>;
  /** Builds a profile from a ~30 s reading and 5 "HEC" samples (16 kHz Float32). */
  buildProfile(
    userId: string,
    reading: Float32Array,
    wakeSamples: Float32Array[],
    micLabel: string | null,
    onProgress?: (fraction: number) => void,
  ): Promise<{ profile: VoiceprintProfile | null; quality: EnrolmentQuality }>;
  startListener(
    profile: VoiceprintProfile,
    events: ListenerEvents,
    /** `signal` aborts a start still loading the model (mic released at once). */
    opts?: { deviceId?: string; signal?: AbortSignal },
  ): Promise<ListenerHandle>;
}
