/**
 * Admin > Reception: getting pictures and videos ready for the reception TV.
 *
 * The TV is a 2016 LG (webOS 3): a 12-megapixel phone photo is far more than
 * it needs and slows its slideshow, so every picture is shrunk in the browser
 * to fit 1920x1080 before upload. Videos go up as they are (the TV plays MP4,
 * iPhone MOV and WebM) with a progress bar, like Audit clips.
 */
import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "reception";
export const VIDEO_BUCKET = "reception-video";
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_VIDEO_BYTES = 262144000; // 250 MB, the bucket's limit

/** Shrink a picture to fit 1920x1080 (never enlarges) and re-encode as JPEG. */
export async function fitForTv(file: File, maxW = 1920, maxH = 1080): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error(`${file.name}: not a picture (use JPG, PNG or WebP).`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error(`${file.name}: this browser cannot open the picture (an iPhone HEIC? Set the iPhone camera to "Most Compatible").`));
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Could not prepare the picture."))), "image/jpeg", 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const rand = () => Math.random().toString(36).slice(2, 8);

/** Upload with progress (a plain POST so the browser reports bytes sent); returns the public URL. */
export async function uploadForTv(bucket: string, folder: string, body: Blob, type: string, ext: string, onPct?: (n: number) => void): Promise<string> {
  const { data } = await supabase.auth.getSession(); // refreshes an expired token before a long upload
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Sign in again and retry.");
  const path = `${folder}/${Date.now()}-${rand()}.${ext}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onPct) onPct(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = xhr.statusText || `Upload failed (${xhr.status})`;
      try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch { /* keep the status text */ }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check the connection and try again."));
    xhr.send(body);
  });
  onPct?.(100);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadPhotoForTv(file: File, folder = "items"): Promise<string> {
  return uploadForTv(PHOTO_BUCKET, folder, await fitForTv(file), "image/jpeg", "jpg");
}

export function videoExt(file: File): string | null {
  const t = file.type.toLowerCase();
  if (t === "video/mp4") return "mp4";
  if (t === "video/quicktime") return "mov";
  if (t === "video/webm") return "webm";
  const m = file.name.toLowerCase().match(/\.(mp4|m4v|mov|webm)$/);
  return m ? (m[1] === "m4v" ? "mp4" : m[1]) : null;
}

export function looksLikeDriveLink(s: string): boolean {
  return /^https:\/\/(drive|docs)\.google\.com\/.*(\/file\/d\/|[?&]id=)[A-Za-z0-9_-]{10,}/.test(s.trim());
}
