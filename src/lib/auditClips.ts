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

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The 11-character id of a public YouTube video from a pasted address, or
 * null. The host must be YouTube's own: "evil.com/?v=..." is not a video.
 */
export function parseYoutubeId(input: string | null | undefined): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !YT_HOSTS.has(u.hostname.toLowerCase())) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (u.hostname.toLowerCase().endsWith("youtu.be")) id = parts[0] ?? null;
  else if (parts[0] === "watch") id = u.searchParams.get("v");
  else if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  return id && YT_ID.test(id) ? id : null;
}

export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export type UploadStage = "queued" | "saving" | "uploading" | "done" | "failed";

export const STAGE_LABEL: Record<UploadStage, string> = {
  queued: "Waiting",
  saving: "Saving record",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
};

/**
 * One bar for the whole queue, weighted by file size so a 200 MB video counts
 * for more than a 2 MB one. A failed file is left out of the bar (it is
 * counted separately) so one failure cannot hold the bar below 100%.
 */
export function overallProgress(
  jobs: { size: number; stage: UploadStage; pct: number }[],
): { percent: number; total: number; done: number; active: number; failed: number } {
  const live = jobs.filter((j) => j.stage !== "failed");
  const weight = (j: { size: number }) => Math.max(1, j.size);
  const all = live.reduce((a, j) => a + weight(j), 0);
  const sent = live.reduce((a, j) => {
    const f = j.stage === "done" ? 1 : j.stage === "uploading" ? Math.min(100, Math.max(0, j.pct)) / 100 : 0;
    return a + weight(j) * f;
  }, 0);
  return {
    percent: all ? Math.round((sent / all) * 100) : 0,
    total: jobs.length,
    done: jobs.filter((j) => j.stage === "done").length,
    active: jobs.filter((j) => j.stage === "queued" || j.stage === "saving" || j.stage === "uploading").length,
    failed: jobs.filter((j) => j.stage === "failed").length,
  };
}

/** The classes a child is in today: a start on or before it, no end or an end on or after it. */
export function currentClassNames(
  enrollments: { start_date: string; end_date: string | null; class_name: string | null }[],
  today: string,
): string[] {
  const names = enrollments
    .filter((e) => e.start_date <= today && (!e.end_date || e.end_date >= today) && e.class_name)
    .map((e) => e.class_name as string);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
