/**
 * What to call a recording when it is sent to OpenAI's transcription API,
 * and what to tell Gemini a video is.
 *
 * OpenAI decides the format from the file NAME, and accepts only
 * flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav and webm. An iPhone video
 * uploaded through "choose a file" is QuickTime (.mov, video/quicktime),
 * which used to be sent as "audio.webm" and was refused with
 * "Invalid file format" (14 Nov 2026). QuickTime and MP4 are the same
 * container family (ISO base media: the decoder that reads one reads the
 * other), so a .mov goes as .mp4, as do 3GP and M4V from Android phones.
 *
 * Imports nothing, so a test can load it directly.
 */

export interface SpeechFile {
  /** File name for the multipart upload: "audio.<ext>". */
  name: string;
  /** Content type to send with it, one OpenAI lists for that extension. */
  type: string;
}

const BY_EXT: Record<string, SpeechFile> = {
  mp4: { name: "audio.mp4", type: "video/mp4" },
  m4a: { name: "audio.m4a", type: "audio/mp4" },
  webm: { name: "audio.webm", type: "audio/webm" },
  ogg: { name: "audio.ogg", type: "audio/ogg" },
  mp3: { name: "audio.mp3", type: "audio/mpeg" },
  wav: { name: "audio.wav", type: "audio/wav" },
  flac: { name: "audio.flac", type: "audio/flac" },
};

function extFromMime(mime: string): string | null {
  const m = mime.toLowerCase().split(";")[0].trim();
  if (!m) return null;
  if (m.includes("quicktime") || m.includes("3gpp") || m.includes("x-m4v") || m === "video/mp4") return "mp4";
  if (m === "audio/mp4" || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3") || m.includes("mpga")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("flac")) return "flac";
  if (m.includes("mp4")) return "mp4";
  return null;
}

function extFromPath(path: string): string | null {
  const e = (path.split("?")[0].split(".").pop() ?? "").toLowerCase();
  if (["mov", "qt", "3gp", "3g2", "m4v", "mp4"].includes(e)) return "mp4";
  if (["m4a", "aac"].includes(e)) return "m4a";
  if (["webm", "mkv"].includes(e)) return "webm";
  if (["ogg", "oga", "opus"].includes(e)) return "ogg";
  if (["mp3", "mpga", "mpeg"].includes(e)) return "mp3";
  if (e === "wav") return "wav";
  if (e === "flac") return "flac";
  return null;
}

/**
 * The name and type to send, from the stored MIME type, then the blob's
 * own type, then the storage path's extension. Null when none of them is a
 * format OpenAI can read: the caller says so instead of sending it.
 */
export function speechFileFor(
  mime: string | null | undefined,
  blobType: string | null | undefined,
  path: string,
): SpeechFile | null {
  const ext = extFromMime(mime ?? "") ?? extFromMime(blobType ?? "") ?? extFromPath(path);
  return ext ? BY_EXT[ext] : null;
}

/**
 * Gemini's documented video types say "video/mov", not the browser's
 * "video/quicktime"; everything else passes through without parameters.
 */
export function geminiVideoMime(mime: string | null | undefined, fallback = "video/webm"): string {
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  if (!m) return fallback;
  if (m === "video/quicktime") return "video/mov";
  return m;
}
