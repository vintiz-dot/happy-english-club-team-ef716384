/**
 * One way for the app to keep files, whether a bucket lives in Supabase
 * Storage or in Cloudflare R2 (the hec-files Worker, hec-files/worker).
 *
 * Which buckets are in R2 is ONE list, `R2_BUCKETS` in `src/lib/files.ts`.
 * A bucket moves by adding it there once its files are copied; it moves
 * back by taking it out. Who may do what is decided by the database either
 * way (the storage policies; for R2 through public.file_access_can).
 *
 * While a bucket's files are being copied, a read of a file that has no R2
 * copy yet falls back to Supabase, so nothing goes missing mid-move.
 *
 * Pure: the Supabase client, the Worker URL and fetch are passed in, so
 * `scripts/pgtest/file-store-client.test.mjs` runs it without a browser.
 */

export interface StorageLike {
  storage: {
    from(bucket: string): {
      upload(path: string, body: Blob, opts?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
      createSignedUrls(paths: string[], seconds: number): PromiseLike<{ data: { path: string | null; signedUrl: string; error?: string | null }[] | null; error: { message: string } | null }>;
      download(path: string): PromiseLike<{ data: Blob | null; error: { message: string } | null }>;
      remove(paths: string[]): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
  };
  auth: { getSession(): PromiseLike<{ data: { session: { access_token: string } | null } }> };
}

export interface FileStoreOptions {
  supabase: StorageLike;
  workerUrl: string;
  r2Buckets: ReadonlySet<string>;
  fetch?: typeof fetch;
}

const READ_BATCH = 200; // the Worker's limit per request

export function makeFileStore({ supabase, workerUrl, r2Buckets, fetch: f = fetch }: FileStoreOptions) {
  const inR2 = (bucket: string) => r2Buckets.has(bucket);

  async function sign(body: Record<string, unknown>): Promise<any> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    const r = await f(`${workerUrl}/v1/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `File service error (${r.status})`);
    return j;
  }

  async function supabaseUrls(bucket: string, paths: string[], seconds: number): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, seconds);
    if (error) throw new Error(error.message);
    const out: Record<string, string> = {};
    for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) out[d.path] = d.signedUrl;
    return out;
  }

  /** Links for the paths the caller may read; paths they may not are left out. */
  async function signedUrls(bucket: string, paths: string[], seconds = 3600): Promise<Record<string, string>> {
    const wanted = [...new Set(paths.filter(Boolean))];
    if (!inR2(bucket)) return supabaseUrls(bucket, wanted, seconds);
    const out: Record<string, string> = {};
    for (let i = 0; i < wanted.length; i += READ_BATCH) {
      const { urls } = await sign({ op: "read", bucket, paths: wanted.slice(i, i + READ_BATCH) });
      Object.assign(out, urls);
    }
    // Not in R2 yet (still being copied): Supabase may still have it.
    const missing = wanted.filter((p) => !out[p]);
    if (missing.length) Object.assign(out, await supabaseUrls(bucket, missing, seconds).catch(() => ({})));
    return out;
  }

  async function signedUrl(bucket: string, path: string, seconds = 3600): Promise<string | null> {
    return (await signedUrls(bucket, [path], seconds))[path] ?? null;
  }

  /** Store a new file. Never overwrites; the path must be new. */
  async function upload(bucket: string, path: string, file: Blob, contentType?: string): Promise<void> {
    const type = contentType || file.type || "application/octet-stream";
    if (!inR2(bucket)) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: type, upsert: false });
      if (error) throw new Error(error.message);
      return;
    }
    const { url } = await sign({ op: "write", bucket, path, size: file.size, type });
    const r = await f(url, { method: "PUT", body: file, headers: { "Content-Type": type } });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || `Upload failed (${r.status})`);
    }
  }

  async function download(bucket: string, path: string): Promise<Blob> {
    if (inR2(bucket)) {
      const url = await signedUrl(bucket, path, 300);
      if (!url) throw new Error("File not found, or not yours to open.");
      const r = await f(url);
      if (!r.ok) throw new Error(`Could not open the file (${r.status})`);
      return r.blob();
    }
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) throw new Error(error?.message ?? "File not found.");
    return data;
  }

  async function remove(bucket: string, paths: string[]): Promise<void> {
    if (!inR2(bucket)) {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw new Error(error.message);
      return;
    }
    for (const path of paths) {
      try {
        await sign({ op: "delete", bucket, path });
      } catch (e) {
        // Still being copied: the file may only be in Supabase.
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw e;
      }
    }
  }

  return { inR2, signedUrls, signedUrl, upload, download, remove };
}

export type FileStore = ReturnType<typeof makeFileStore>;
