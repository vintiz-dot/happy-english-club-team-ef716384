/**
 * Shrink a photo in the browser before it is uploaded.
 *
 * A phone photo of a worksheet is 2-4 MB; at 2000 px on the long edge and
 * JPEG quality 0.82 it is about 300-500 KB and still sharp enough for a
 * teacher to read handwriting and for OCR. Storage was over the free 1 GB
 * mostly because of these photos (Nov 2026).
 *
 * Never fails an upload: anything that is not a JPEG/PNG/WebP, cannot be
 * decoded (an iPhone HEIC in some browsers), or does not come out smaller is
 * returned untouched. PDFs, documents and audio pass straight through.
 */

export const PHOTO_MAX_EDGE = 2000;
export const PHOTO_QUALITY = 0.82;
const SHRINKABLE = /^image\/(jpeg|jpg|png|webp)$/i;
/** Below this a photo is left alone: re-encoding gains little and costs sharpness. */
export const PHOTO_SKIP_BELOW_BYTES = 400 * 1024;

/** The size to draw at: the long edge capped at `max`, never enlarged. */
export function shrinkTarget(width: number, height: number, max = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Whether a file is worth trying to shrink at all. */
export function isShrinkablePhoto(type: string, size: number): boolean {
  return SHRINKABLE.test(type) && size >= PHOTO_SKIP_BELOW_BYTES;
}

/** The same name ending in .jpg, as the shrunk file is a JPEG. */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]*$/, "");
  return `${base || "photo"}.jpg`;
}

export async function shrinkPhoto(file: File): Promise<File> {
  if (!isShrinkablePhoto(file.type, file.size)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    try {
      const { width, height } = shrinkTarget(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      // A transparent PNG would turn black as a JPEG; paper is white.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", PHOTO_QUALITY));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
