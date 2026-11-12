/**
 * ===========================================================================
 * TEMPORARY - part of audit-eval-proxy. DELETE WITH THE TEARDOWN
 * (scripts/lesson-eval/teardown_audit_eval.md).
 * ===========================================================================
 *
 * The vendors, their modes, the most private settings each one offers, and
 * how each answer is turned into the common result schema
 * (scripts/lesson-eval/result_schema.json, "hec-lesson-eval/1").
 *
 * Imports nothing, so the request builders and normalisers can be tested
 * without a network. Settings and their sources: docs/evidence/B0-vendors.md
 * and docs/evidence/B-proxy-build.md.
 */

export type Vendor = "azure" | "openai" | "gemini" | "google";

export interface ModeSpec {
  vendor: Vendor;
  mode: string;
  model: string;
  /** USD per audio minute, for the cost estimate only. */
  usdPerMinute: number;
  priceSource: string;
  implemented: boolean;
  /** What the vendor keeps, repeated in every result so a choice is informed. */
  retention: string;
  /** Secret names this mode needs (never their values). */
  secrets: string[];
}

const AZURE_RETENTION =
  "Fast transcription: 'Microsoft does not retain or store the data provided by customers' " +
  "(learn.microsoft.com data-privacy-security, ms.date 2026-03-31). Diarization voice signals are discarded after the call. " +
  "Contractual no-training clause not confirmed (Product Terms/DPA not read).";
const OPENAI_RETENTION =
  "OpenAI API: not used for training unless the organisation opts in. Default abuse-monitoring logs kept up to 30 days; " +
  "Zero Data Retention for /v1/audio/transcriptions only if approved for the organisation/project (not known to be on). " +
  "No Files or Batch API is used. (developers.openai.com guides/your-data, read 2026-11-11.)";
const GEMINI_RETENTION =
  "Gemini API: paid tier logs prompts and responses 'for a limited period of time' (days not stated), no zero-retention option; " +
  "unpaid tier may use content for training and human review. Terms bar API clients directed at under-18s. " +
  "The uploaded piece is deleted from the Files API by this function right after the call. " +
  "Fails the owner's original privacy rule; included only because the owner lifted it for this evaluation (D-10, 2026-11-12). " +
  "(aistudio.google.com/docs/terms effective 2026-03-23.)";

export const MODES: Record<string, ModeSpec> = {
  "azure/fast-multilingual": {
    vendor: "azure", mode: "fast-multilingual", model: "azure-fast-transcription (multilingual, locales omitted)",
    usdPerMinute: 1 / 60, priceSource: "UNCONFIRMED: about USD 1/audio hour (Azure pricing page showed placeholders; memory)",
    implemented: true, retention: AZURE_RETENTION, secrets: ["azure_key"],
  },
  "azure/fast-en-vi": {
    vendor: "azure", mode: "fast-en-vi", model: "azure-fast-transcription (locales en-US + vi-VN, language identification)",
    usdPerMinute: 1 / 60, priceSource: "UNCONFIRMED: about USD 1/audio hour (memory)",
    implemented: true, retention: AZURE_RETENTION, secrets: ["azure_key"],
  },
  "openai/gpt-transcribe": {
    vendor: "openai", mode: "gpt-transcribe", model: "gpt-transcribe",
    usdPerMinute: 0.0045, priceSource: "developers.openai.com models/gpt-transcribe, read 2026-11-11",
    implemented: true, retention: OPENAI_RETENTION, secrets: ["OPENAI_API_KEY"],
  },
  "openai/gpt-4o-transcribe": {
    vendor: "openai", mode: "gpt-4o-transcribe", model: "gpt-4o-transcribe",
    usdPerMinute: 0.006, priceSource: "UNCONFIRMED (memory); deprecated, shuts down 2027-02-26",
    implemented: true, retention: OPENAI_RETENTION, secrets: ["OPENAI_API_KEY"],
  },
  "openai/gpt-4o-transcribe-diarize": {
    vendor: "openai", mode: "gpt-4o-transcribe-diarize", model: "gpt-4o-transcribe-diarize",
    usdPerMinute: 0.006, priceSource: "UNCONFIRMED (memory); deprecated, shuts down 2027-02-26",
    implemented: true, retention: OPENAI_RETENTION, secrets: ["OPENAI_API_KEY"],
  },
  "openai/whisper-1": {
    vendor: "openai", mode: "whisper-1", model: "whisper-1",
    usdPerMinute: 0.006, priceSource: "UNCONFIRMED (memory); deprecated, shuts down 2027-02-26",
    implemented: true, retention: OPENAI_RETENTION, secrets: ["OPENAI_API_KEY"],
  },
  "gemini/transcribe-speakers": {
    vendor: "gemini", mode: "transcribe-speakers", model: "gemini-3.8-flash",
    usdPerMinute: 0.003,
    priceSource: "UNCONFIRMED: 1,920 audio tokens/min (aistudio docs/audio) at an assumed ~USD 1/M input plus output tokens",
    implemented: true, retention: GEMINI_RETENTION, secrets: ["GEMINI_API_KEY"],
  },
  "google/chirp3": {
    vendor: "google", mode: "chirp3", model: "chirp_3",
    usdPerMinute: 0, priceSource: "n/a",
    implemented: false,
    retention: "Not implemented: Chirp 3 BatchRecognize needs a copy of the audio in a Google Cloud Storage bucket (us/eu); " +
      "sync Recognize is limited to 1 minute.",
    secrets: ["GOOGLE_CREDENTIALS"],
  },
};

export const modeKey = (vendor: string, mode: string) => `${vendor}/${mode}`;

// ------------------------------------------------------------- validation

/** Code-only object names: no names, no traversal, no other folder. */
export const OBJECT_PATH_RE =
  /^(lessons\/L[0-9]{1,3}|clips\/S[0-9]{2,3}|synth\/M[0-9]{2,3})\/[a-z0-9_]{1,32}\.(flac|wav|mp3|ogg)$/;
export const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/;
/** A piece is at most 20 minutes (driver default 10 min + overlap). */
export const MAX_PIECE_SECONDS = 1200;

/** The only fields a request may carry. Anything else - audio bytes, a URL,
 *  base64, a prompt - is refused rather than ignored. */
export const ALLOWED_FIELDS = new Set(["run_id", "vendor", "mode", "object_path", "audio_seconds", "options"]);
export const ALLOWED_OPTIONS = new Set(["max_speakers", "language"]);

export const mimeFor = (path: string) =>
  path.endsWith(".flac") ? "audio/flac" : path.endsWith(".wav") ? "audio/wav"
    : path.endsWith(".mp3") ? "audio/mpeg" : "audio/ogg";

/**
 * The fewest seconds a piece of this many bytes can hold. Used to refuse a
 * claimed duration that is too small (which would let audio slip past the
 * minute caps). WAV 16 kHz mono 16-bit is exact; FLAC of the same is never
 * meaningfully bigger than the WAV; MP3/OGG assume at most 128 kbit/s.
 */
export function minSecondsForBytes(path: string, bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  if (path.endsWith(".wav")) return Math.max(0, (bytes - 44) / 32000);
  if (path.endsWith(".flac")) return bytes / (32000 * 1.05);
  return bytes / 16000;
}

// ------------------------------------------------------------- result schema

export interface Word { w: string; start: number; end: number; conf: number | null; speaker: string | null; lang: "en" | "vi" | null }
export interface Turn { start: number; end: number; speaker: string }
export interface FileResult {
  duration_s: number | null;
  language?: string;
  words: Word[];
  turns?: Turn[];
  /** How word times were obtained: "vendor", or "interpolated" (spread
   *  evenly over a segment, or over the piece - not usable for DER). */
  word_timing: "vendor" | "interpolated-from-segments" | "interpolated-over-piece";
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const langOf = (s: unknown): "en" | "vi" | null => {
  const v = String(s ?? "").toLowerCase();
  if (v.startsWith("en") || v === "english") return "en";
  if (v.startsWith("vi") || v === "vietnamese") return "vi";
  return null;
};

/** Spread a segment's words evenly over its time span. */
function spread(text: string, start: number, end: number, speaker: string | null, lang: "en" | "vi" | null, conf: number | null = null): Word[] {
  const toks = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const s = Number.isFinite(start) ? start : 0;
  const e = Number.isFinite(end) && end > s ? end : s + 0.3 * toks.length;
  const step = (e - s) / toks.length;
  return toks.map((w, i) => ({ w, start: r3(s + i * step), end: r3(s + (i + 1) * step), conf, speaker, lang }));
}

// ------------------------------------------------------------- Azure

export const AZURE_API_VERSION = "2025-10-15";

export function azureUrl(region: string): string {
  return `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=${AZURE_API_VERSION}`;
}

export function azureDefinition(mode: string, maxSpeakers: number) {
  const def: Record<string, unknown> = {
    diarization: { enabled: true, maxSpeakers },
    // Verbatim: a child's words are the measurement, so nothing is masked.
    profanityFilterMode: "None",
  };
  if (mode === "fast-en-vi") def.locales = ["en-US", "vi-VN"];
  return def;
}

export function normaliseAzure(raw: any): FileResult {
  const words: Word[] = [];
  const turns: Turn[] = [];
  for (const p of raw?.phrases ?? []) {
    const speaker = p.speaker === undefined || p.speaker === null ? null : `spk${p.speaker}`;
    const lang = langOf(p.locale);
    const conf = typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : null;
    const ps = Number(p.offsetMilliseconds) / 1000;
    const pe = ps + Number(p.durationMilliseconds) / 1000;
    if (speaker && Number.isFinite(ps) && Number.isFinite(pe)) turns.push({ start: r3(ps), end: r3(pe), speaker });
    if (Array.isArray(p.words) && p.words.length) {
      for (const w of p.words) {
        const s = Number(w.offsetMilliseconds) / 1000;
        const e = s + Number(w.durationMilliseconds) / 1000;
        if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
        words.push({ w: String(w.text ?? ""), start: r3(s), end: r3(e), conf, speaker, lang });
      }
    } else {
      words.push(...spread(p.text, ps, pe, speaker, lang, conf));
    }
  }
  const dur = Number(raw?.durationMilliseconds);
  return { duration_s: Number.isFinite(dur) ? r3(dur / 1000) : null, words, turns, word_timing: "vendor" };
}

// ------------------------------------------------------------- OpenAI

export const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";

/** A fixed, generic context. Never a name, never caller text. */
export const OPENAI_PROMPT =
  "A recorded English lesson for Vietnamese children: a teacher and pupils speak English and some Vietnamese. " +
  "Transcribe exactly what is said, keeping the children's mistakes.";

/** Multipart fields for one OpenAI transcription mode (the file is added by the caller). */
export function openaiFields(mode: string, language: string | null): [string, string][] {
  switch (mode) {
    case "gpt-transcribe":
      // `languages` (several hints, for code-switching) replaces `language`;
      // the two must not be sent together.
      return [["model", "gpt-transcribe"], ["response_format", "json"], ["languages[]", "en"], ["languages[]", "vi"],
        ["prompt", OPENAI_PROMPT]];
    case "gpt-4o-transcribe":
      return [["model", "gpt-4o-transcribe"], ["response_format", "json"], ["prompt", OPENAI_PROMPT],
        ...(language ? [["language", language] as [string, string]] : [])];
    case "gpt-4o-transcribe-diarize":
      // No prompt support on this model; chunking_strategy is required over 30 s.
      return [["model", "gpt-4o-transcribe-diarize"], ["response_format", "diarized_json"], ["chunking_strategy", "auto"],
        ...(language ? [["language", language] as [string, string]] : [])];
    case "whisper-1":
      return [["model", "whisper-1"], ["response_format", "verbose_json"],
        ["timestamp_granularities[]", "word"], ["timestamp_granularities[]", "segment"], ["prompt", OPENAI_PROMPT],
        ...(language ? [["language", language] as [string, string]] : [])];
  }
  throw new Error("unknown openai mode");
}

export function normaliseOpenai(mode: string, raw: any, pieceSeconds: number): FileResult {
  if (mode === "whisper-1") {
    const lang = langOf(raw?.language);
    const words = (raw?.words ?? []).map((w: any) => ({
      w: String(w.word ?? "").trim(), start: r3(Number(w.start)), end: r3(Number(w.end)), conf: null, speaker: null, lang,
    })).filter((w: Word) => w.w && Number.isFinite(w.start) && Number.isFinite(w.end));
    const dur = Number(raw?.duration);
    return { duration_s: Number.isFinite(dur) ? r3(dur) : pieceSeconds, language: raw?.language, words, word_timing: "vendor" };
  }
  if (mode === "gpt-4o-transcribe-diarize") {
    const words: Word[] = [];
    const turns: Turn[] = [];
    for (const s of raw?.segments ?? []) {
      const speaker = s.speaker === undefined || s.speaker === null ? null : `spk_${String(s.speaker).replace(/[^A-Za-z0-9]/g, "")}`;
      const st = Number(s.start), en = Number(s.end);
      if (speaker && Number.isFinite(st) && Number.isFinite(en)) turns.push({ start: r3(st), end: r3(en), speaker });
      words.push(...spread(s.text, st, en, speaker, null));
    }
    const dur = Number(raw?.duration);
    return { duration_s: Number.isFinite(dur) ? r3(dur) : pieceSeconds, words, turns, word_timing: "interpolated-from-segments" };
  }
  // gpt-transcribe / gpt-4o-transcribe: text only, no timestamps.
  const lang = Array.isArray(raw?.languages) && raw.languages.length === 1 ? langOf(raw.languages[0]?.code) : null;
  return {
    duration_s: pieceSeconds,
    words: spread(String(raw?.text ?? ""), 0, pieceSeconds, null, lang),
    word_timing: "interpolated-over-piece",
  };
}

// ------------------------------------------------------------- Gemini

export const GEMINI_BASE = "https://generativelanguage.googleapis.com";

export const GEMINI_PROMPT =
  "Transcribe this classroom audio verbatim, keeping speakers' mistakes. It is an English lesson for Vietnamese children; " +
  "speech is English and sometimes Vietnamese. Split it into segments at every change of speaker. Label speakers by voice " +
  "as spk0, spk1, spk2... in order of first appearance; never guess a person's name. For each segment give start and end " +
  "in seconds from the start of the audio (decimals allowed), the language ('en' or 'vi'), and the exact words.";

export const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          speaker: { type: "STRING" },
          start: { type: "NUMBER" },
          end: { type: "NUMBER" },
          language: { type: "STRING", enum: ["en", "vi"] },
          text: { type: "STRING" },
        },
        required: ["speaker", "start", "end", "text"],
      },
    },
  },
  required: ["segments"],
};

export function geminiGenerateBody(fileUri: string, mime: string) {
  return {
    contents: [{ parts: [{ file_data: { mime_type: mime, file_uri: fileUri } }, { text: GEMINI_PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0 },
  };
}

export function normaliseGemini(raw: any, pieceSeconds: number): FileResult {
  const text = raw?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const words: Word[] = [];
  const turns: Turn[] = [];
  for (const s of parsed?.segments ?? []) {
    const speaker = `spk_${String(s.speaker ?? "x").replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "x"}`;
    const st = Math.max(0, Number(s.start)), en = Math.min(pieceSeconds + 5, Number(s.end));
    if (Number.isFinite(st) && Number.isFinite(en) && en > st) turns.push({ start: r3(st), end: r3(en), speaker });
    words.push(...spread(s.text, st, en, speaker, langOf(s.language)));
  }
  return { duration_s: pieceSeconds, words, turns, word_timing: "interpolated-from-segments" };
}
