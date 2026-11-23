// In-memory stand-in for the file store (src/lib/files.ts) in the preview: nothing leaves the page.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// A made-up picture for any image path (a coloured card with a simple scene), so galleries have something to show.
export const stubPicture = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="hsl(${hue} 45% 86%)"/><circle cx="${120 + (h % 240)}" cy="120" r="54" fill="hsl(${(hue + 40) % 360} 60% 62%)"/><rect x="60" y="230" width="360" height="70" rx="14" fill="hsl(${(hue + 200) % 360} 40% 50%)"/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};
export const isPicturePath = (p: string) => /\.(jpe?g|png|webp|gif|svg|heic)$/i.test(p) || /poster|frame/i.test(p);

export const R2_BUCKETS: ReadonlySet<string> = new Set<string>();
export const files = {
  async upload(_bucket: string, _path: string, _file: Blob, _type?: string) { await wait(250); return { error: null }; },
  async signedUrls(_bucket: string, paths: string[]) { return Object.fromEntries(paths.map((p) => [p, isPicturePath(p) ? stubPicture(p) : "about:blank#" + p])); },
  async signedUrl(_bucket: string, path: string) { return isPicturePath(path) ? stubPicture(path) : "about:blank#" + path; },
  async download(_bucket: string, _path: string) { return new Blob(["x"]); },
  async remove(_bucket: string, _paths: string[]) { return { error: null }; },
} as any;
