/**
 * Browser helpers for recording video homework.
 *
 * The phone records TWO things at once from the same camera stream: the
 * video (small, 480p) and a separate audio-only track. The audio track is
 * a few MB, so it goes to transcription as it is; nothing has to be
 * converted on a server. A handful of still frames are grabbed while
 * recording, for the teacher's list and in case the video model is off.
 */
import { supabase } from "@/integrations/supabase/client";

/** The tables and RPCs added in 20261109090000 are not in the generated types yet. */
export const videoDb = supabase as any;

export const VIDEO_BUCKET = "homework-videos";
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MIN_SECONDS = 10;

const supported = (t: string) =>
  typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t);

export function canRecordHere(): boolean {
  return typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Safari and every iPhone browser (all WebKit). Since iOS 18.4 they also
 * offer WebM, but the VP9 WebM an iPhone writes fails to decode in desktop
 * Chrome after about a second ("video decode error") - seen on the first
 * real homework, 9 Nov 2026. Their own MP4 (H.264) plays everywhere.
 */
export function isAppleWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.vendor === "Apple Computer, Inc." || /iPhone|iPad|iPod/.test(navigator.userAgent);
}

const WEBM_VIDEO = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const MP4_VIDEO = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"];

export function pickVideoMime(): string | undefined {
  return (isAppleWebKit() ? [...MP4_VIDEO, ...WEBM_VIDEO] : [...WEBM_VIDEO, ...MP4_VIDEO]).find(supported);
}

export function pickAudioMime(): string | undefined {
  const webm = ["audio/webm;codecs=opus", "audio/webm"];
  const mp4 = ["audio/mp4"];
  return [...(isAppleWebKit() ? [...mp4, ...webm] : [...webm, ...mp4]), "audio/ogg;codecs=opus"].find(supported);
}

/** "video/webm;codecs=vp9" -> "video/webm" (what the bucket allows). */
export function baseMime(mime: string | undefined | null, fallback: string): string {
  return (mime || fallback).split(";")[0].trim() || fallback;
}

export function extFor(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("jpeg")) return "jpg";
  return "webm";
}

/** A JPEG of what the camera shows right now, at most 640 wide. */
export function captureFrame(video: HTMLVideoElement, maxWidth = 640): Promise<Blob | null> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.resolve(null);
  const scale = Math.min(1, maxWidth / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72));
}

/** Seconds into the recording at which to grab a still. */
export function frameSchedule(maxSeconds: number): number[] {
  const out = [3];
  const step = Math.max(20, Math.round(maxSeconds / 6));
  for (let t = step; t < maxSeconds && out.length < 6; t += step) out.push(t);
  return out;
}

export async function signedVideoUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export interface RecordedTake {
  video: Blob;
  videoMime: string;
  audio: Blob | null;
  audioMime: string | null;
  frames: Blob[];
  durationSeconds: number;
  pronunciation: unknown | null;
}
