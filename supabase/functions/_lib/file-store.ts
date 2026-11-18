// Files for edge functions, whether a file is in Supabase Storage or in R2
// (the hec-files Worker, hec-files/worker).
//
// Where a file is: a file_objects row means R2 (the copier and the Worker
// write the row only once the file is stored); no row means Supabase. So
// there is no second list of moved buckets to keep in step with the app's
// (src/lib/files.ts); a file is found wherever it actually is.
//
// The function calls the Worker with its own service key and
// `x-hec-as: service`; the Worker has the database confirm the key, then
// signs without the per-file question. The function's own checks (who
// asked, for which class) are unchanged and come first, as before.
//
// Imports nothing, so scripts/pgtest/edge-file-store.test.mjs runs it in Node
// against the real Worker code.

type Err = { message: string } | null;
export interface ServiceClient {
  storage: {
    from(bucket: string): {
      download(path: string): PromiseLike<{ data: Blob | null; error: Err }>;
      move(from: string, to: string): PromiseLike<{ data: unknown; error: Err }>;
    };
  };
  from(table: string): any;
}

export interface FileStoreEnv {
  serviceKey: string;
  workerUrl?: string;
  fetch?: typeof fetch;
}

export const DEFAULT_FILES_WORKER = "https://hec-files.vintizfjes.workers.dev";

export function fileStoreEnvFromDeno(): FileStoreEnv {
  // deno-lint-ignore no-explicit-any
  const env = (globalThis as any).Deno?.env;
  return {
    serviceKey: env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    workerUrl: env?.get("HEC_FILES_URL") ?? DEFAULT_FILES_WORKER,
  };
}

async function r2Row(sb: ServiceClient, bucket: string, path: string): Promise<{ owner: string | null; mime_type: string | null } | null> {
  const { data, error } = await sb.from("file_objects").select("owner, mime_type")
    .eq("bucket_id", bucket).eq("path", path).maybeSingle();
  if (error) throw new Error(`file_objects: ${error.message}`);
  return data ?? null;
}

function worker(env: FileStoreEnv) {
  const f = env.fetch ?? fetch;
  const base = env.workerUrl ?? DEFAULT_FILES_WORKER;
  return async (body: Record<string, unknown>) => {
    const r = await f(`${base}/v1/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.serviceKey}`, "x-hec-as": "service" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`file store: ${j?.error ?? r.status}`);
    return j;
  };
}

/** The file's bytes, from R2 or Supabase. */
export async function downloadFile(sb: ServiceClient, env: FileStoreEnv, bucket: string, path: string): Promise<Blob> {
  if (await r2Row(sb, bucket, path)) {
    const { urls } = await worker(env)({ op: "read", bucket, paths: [path] });
    const url = urls?.[path];
    if (!url) throw new Error("file store: no link");
    const r = await (env.fetch ?? fetch)(url);
    if (!r.ok) throw new Error(`file store: read ${r.status}`);
    return await r.blob();
  }
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`storage download failed: ${error?.message ?? "nothing"}`);
  return data;
}

/**
 * Move a file to a new path in the same bucket. In R2: copy, record the new
 * row (same uploader), then remove the old row and object. Throws on
 * failure, leaving the file at its old path.
 */
export async function moveFile(sb: ServiceClient, env: FileStoreEnv, bucket: string, from: string, to: string): Promise<void> {
  const row = await r2Row(sb, bucket, from);
  if (!row) {
    const { error } = await sb.storage.from(bucket).move(from, to);
    if (error) throw new Error(error.message);
    return;
  }
  const call = worker(env);
  const bytes = await downloadFile(sb, env, bucket, from);
  const type = row.mime_type || bytes.type || "application/octet-stream";
  const { url } = await call({ op: "write", bucket, path: to, size: bytes.size, type });
  const put = await (env.fetch ?? fetch)(url, {
    method: "PUT", body: bytes, headers: { "Content-Type": type, "Content-Length": String(bytes.size) },
  });
  if (!put.ok) {
    const j = await put.json().catch(() => ({}));
    throw new Error(`file store: write ${put.status} ${j?.error ?? ""}`.trim());
  }
  const { error: insErr } = await sb.from("file_objects").insert({
    bucket_id: bucket, path: to, owner: row.owner, size_bytes: bytes.size, mime_type: type,
  });
  if (insErr) {
    await call({ op: "delete", bucket, path: to }).catch(() => {});
    throw new Error(`file_objects: ${insErr.message}`);
  }
  // The new copy stands; clear the old one (a leftover costs space, not access).
  await sb.from("file_objects").delete().eq("bucket_id", bucket).eq("path", from);
  await call({ op: "delete", bucket, path: from }).catch(() => {});
}
