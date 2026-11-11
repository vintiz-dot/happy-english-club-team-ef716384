/**
 * Helpers for the audit clip store (admin only). Pure, so they are tested
 * without a browser. The files live in the private `audit-clips` bucket; the
 * names the audit folder expects (S01_clip1.mp4) are made here, never stored.
 * This file imports nothing.
 */

export const AUDIT_BUCKET = "audit-clips";

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "weba",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export const ACCEPTED_TYPES = Object.keys(EXT_BY_MIME);

/** File extension for an upload: from its type, else from its name. */
export function extFor(mime: string | null | undefined, name?: string | null): string {
  const byMime = EXT_BY_MIME[(mime || "").toLowerCase()];
  if (byMime) return byMime;
  const m = /\.([a-z0-9]{2,5})$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "mp4";
}

/** True when the file is a type the bucket accepts. */
export function isAcceptedClip(mime: string | null | undefined): boolean {
  return !!mime && mime.toLowerCase() in EXT_BY_MIME;
}

/** Where a clip lives. Only the code and a random id: no name, no student id. */
export function storagePathFor(code: string, clipId: string, ext: string): string {
  return `${code}/${clipId}.${ext}`;
}

/** The name the audit folder expects: S01_clip1.mp4. */
export function exportName(code: string, clipNo: number, ext: string): string {
  return `${code}_clip${clipNo}.${ext}`;
}

/** A clip is past its delete-after date once that day has ended (YYYY-MM-DD). */
export function isExpired(deleteAfter: string | null | undefined, today: string): boolean {
  return !!deleteAfter && deleteAfter < today;
}

/** key.txt: which code is which child. Made in the browser, saved by the admin. */
export function keyFileText(rows: { code: string; name: string }[]): string {
  return [...rows]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((r) => `${r.code}\t${r.name}`)
    .join("\n") + "\n";
}

export function formatBytes(n: number | null | undefined): string {
  if (!n || n < 0) return "-";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
