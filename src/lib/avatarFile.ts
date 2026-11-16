/**
 * The photo a child or parent picks for an avatar, made into something the
 * server accepts (S2 review R-3).
 *
 * update-student-avatar stores PNG, JPEG, WebP or GIF, judged by the bytes.
 * A HEIC / HEIF photo (iPhone Files app, a Mac, Samsung "high efficiency")
 * is refused there because most browsers cannot show it. Here, before the
 * upload, a HEIC the browser CAN decode (Safari can) is re-encoded as a JPEG
 * on a canvas; one it cannot is refused with the same plain message the
 * server gives. Every other file goes up untouched.
 */
export const HEIC_MESSAGE = "This photo is in HEIC format. Please choose a JPEG or PNG, or take a screenshot of it.";

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

/** True for ISO-BMFF bytes with an HEIF brand ('ftyp' at offset 4). */
export function looksHeic(head: Uint8Array): boolean {
  if (head.length < 12) return false;
  if (!(head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70)) return false;
  return HEIF_BRANDS.has(String.fromCharCode(head[8], head[9], head[10], head[11]));
}

/** The file as it should be uploaded: a JPEG in place of a decodable HEIC. */
export async function avatarUploadFile(file: File): Promise<File> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!looksHeic(head)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(HEIC_MESSAGE);
  }
  // An avatar never needs more than this; it also keeps the JPEG well under 5 MB.
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(HEIC_MESSAGE);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.9));
  if (!blob) throw new Error(HEIC_MESSAGE);
  const name = (file.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
