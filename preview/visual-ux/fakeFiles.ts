// In-memory stand-in for the file store (src/lib/files.ts) in the preview: nothing leaves the page.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const R2_BUCKETS: ReadonlySet<string> = new Set<string>();
export const files = {
  async upload(_bucket: string, _path: string, _file: Blob, _type?: string) { await wait(250); return { error: null }; },
  async signedUrls(_bucket: string, paths: string[]) { return Object.fromEntries(paths.map((p) => [p, "about:blank#" + p])); },
  async signedUrl(_bucket: string, path: string) { return "about:blank#" + path; },
  async download(_bucket: string, _path: string) { return new Blob(["x"]); },
  async remove(_bucket: string, _paths: string[]) { return { error: null }; },
} as any;
