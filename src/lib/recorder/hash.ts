// SHA-256 with crypto.subtle (browser and Node 20+ both have it).

export async function sha256Hex(bytes: Uint8Array | ArrayBuffer | string): Promise<string> {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  const b = new Uint8Array(digest);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

export function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") return (crypto as any).randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
