// HEC Files: the school app's files kept in Cloudflare R2 (free plan).
//
// R2 does not know who a parent or a teacher is. This Worker never decides
// that either: before it hands out a link it asks the school database AS THE
// SIGNED-IN PERSON, through PostgREST with their own token, and the database
// answers with the storage policies as installed (public.file_access_can,
// migration 20261118090000). So a file in R2 obeys exactly the rules it had
// in Supabase Storage.
//
//   POST /v1/sign   Authorization: Bearer <user's Supabase token>
//     { op: "read",   bucket, paths: [..] }          -> { urls: { path: url } }   (allowed paths only)
//     { op: "write",  bucket, path, size, type }     -> { url }    then PUT the bytes to url
//     { op: "delete", bucket, path }                 -> { deleted: true }
//   GET  /f/<bucket>/<path>?...signed   the file (Range supported, for video)
//   PUT  /f/<bucket>/<path>?...signed   the upload; exact size and type, never overwrites
//   GET  /healthz
//
// A link is an HMAC over (op, bucket, path, expiry, size, type) with the
// LINK_SECRET; a read link lasts 5 minutes, an upload link 15. Like a
// Supabase signed URL, whoever holds a link may use it until it expires.
//
// Writing: the database row (file_objects) is added FIRST, as the person,
// and its insert policy is the permission check. Its primary key is what
// stops two uploads to one path. Deleting: the row goes first (its delete
// policy is the check), then the R2 object.
//
// Server callers sign without the per-file question and manage file_objects
// themselves: the copier sends `x-hec-server-key: <SERVER_KEY>`; edge
// functions send their own service key as the bearer token with
// `x-hec-as: service`, which the database confirms (isServiceToken).
//
// Free plan: 10 ms CPU and 50 outside calls per request, 100 MB per upload.
// One sign request makes ONE call to the database however many paths it has.

export interface Env {
  FILES: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS: string;
  ALLOWED_ORIGIN_SUFFIX: string;
  /** Comma list of the buckets this Worker serves. */
  R2_BUCKETS: string;
  /** Secret (wrangler secret put LINK_SECRET): signs the links. */
  LINK_SECRET: string;
  /** Secret (wrangler secret put SERVER_KEY): lets edge functions ask for links. */
  SERVER_KEY?: string;
}

export const READ_SECONDS = 300;
export const WRITE_SECONDS = 900;
export const MAX_PATHS = 200;
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // the free plan's request body limit

type Op = "r" | "w";
const enc = new TextEncoder();

// ---------- links ----------

export function pathOk(path: unknown): path is string {
  return typeof path === "string" && path.length >= 1 && path.length <= 1024
    && !path.startsWith("/") && !path.includes("..") && !path.includes("//")
    && !/[\u0000-\u001f\\]/.test(path);
}

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

function equalStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const linkMessage = (op: Op, bucket: string, path: string, exp: number, size: string, type: string) =>
  [op, bucket, path, exp, size, type].join("\n");

export async function signLink(
  origin: string, secret: string, op: Op, bucket: string, path: string, now: number,
  size = "", type = "",
): Promise<string> {
  const exp = Math.floor(now / 1000) + (op === "r" ? READ_SECONDS : WRITE_SECONDS);
  const s = await hmac(secret, linkMessage(op, bucket, path, exp, size, type));
  const q = new URLSearchParams({ o: op, e: String(exp), s });
  if (op === "w") { q.set("n", size); q.set("t", type); }
  const p = path.split("/").map(encodeURIComponent).join("/");
  return `${origin}/f/${encodeURIComponent(bucket)}/${p}?${q}`;
}

/** The bucket and path of a /f/ link, or null. */
export function parseFileUrl(url: URL): { bucket: string; path: string } | null {
  const m = url.pathname.match(/^\/f\/([^/]+)\/(.+)$/);
  if (!m) return null;
  try {
    return { bucket: decodeURIComponent(m[1]), path: m[2].split("/").map(decodeURIComponent).join("/") };
  } catch {
    return null;
  }
}

export async function checkLink(url: URL, secret: string, op: Op, now: number):
  Promise<{ bucket: string; path: string; size: string; type: string } | string> {
  const at = parseFileUrl(url);
  if (!at || !pathOk(at.path)) return "bad link";
  const q = url.searchParams;
  const exp = Number(q.get("e"));
  if (q.get("o") !== op) return "bad link";
  if (!Number.isFinite(exp) || exp * 1000 < now) return "link expired";
  const size = op === "w" ? q.get("n") ?? "" : "";
  const type = op === "w" ? q.get("t") ?? "" : "";
  const want = await hmac(secret, linkMessage(op, at.bucket, at.path, exp, size, type));
  if (!equalStrings(want, q.get("s") ?? "")) return "bad link";
  return { ...at, size, type };
}

// ---------- the database, as the caller ----------

/** The user id in a Supabase token. Not trusted on its own: PostgREST checks the token. */
export function tokenSubject(token: string): string | null {
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

function rest(env: Env, token: string, path: string, init: RequestInit = {}): Promise<Response> {
  // A new-style secret key (sb_secret_...) is not a JWT: it goes as the apikey.
  const auth: Record<string, string> = token.startsWith("sb_secret_")
    ? { apikey: token }
    : { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/**
 * Is this the project's service key? Asked of the database itself: only the
 * service role may run file_store_copy_list (migration 20261118090000), so
 * a 200 proves it. Used by edge functions, which hold that key already.
 */
async function isServiceToken(env: Env, token: string): Promise<boolean> {
  const r = await rest(env, token, "rpc/file_store_copy_list", { method: "POST", body: JSON.stringify({ _bucket: "" }) });
  return r.ok;
}

// ---------- HTTP ----------

function originAllowed(origin: string, env: Env): boolean {
  if (env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && !!env.ALLOWED_ORIGIN_SUFFIX && u.hostname.endsWith(env.ALLOWED_ORIGIN_SUFFIX);
  } catch {
    return false;
  }
}

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin || !originAllowed(origin, env)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, range",
    "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges, etag",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });

const keyOf = (bucket: string, path: string) => `${bucket}/${path}`;

async function handleSign(req: Request, env: Env, now: number, h: Record<string, string>): Promise<Response> {
  const origin = new URL(req.url).origin;
  const serverKey = req.headers.get("x-hec-server-key");
  let asServer = !!env.SERVER_KEY && !!serverKey && equalStrings(serverKey, env.SERVER_KEY);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!asServer && !token) return json({ error: "Sign in first" }, 401, h);
  if (!asServer && req.headers.get("x-hec-as") === "service") {
    if (!(await isServiceToken(env, token))) return json({ error: "Not the service key" }, 401, h);
    asServer = true;
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400, h); }
  const bucket = body?.bucket;
  const served = env.R2_BUCKETS.split(",").map((s) => s.trim()).filter(Boolean);
  if (typeof bucket !== "string" || !served.includes(bucket)) return json({ error: "Bucket not served here" }, 400, h);

  if (body.op === "read") {
    const paths: unknown[] = Array.isArray(body.paths) ? body.paths : body.path ? [body.path] : [];
    const wanted = [...new Set(paths.filter(pathOk))];
    if (wanted.length === 0) return json({ error: "No valid paths" }, 400, h);
    if (wanted.length > MAX_PATHS) return json({ error: `At most ${MAX_PATHS} paths` }, 400, h);
    let allowed: string[] = wanted;
    if (!asServer) {
      const r = await rest(env, token, "rpc/file_access_can_many", {
        method: "POST", body: JSON.stringify({ _bucket: bucket, _paths: wanted, _op: "read" }),
      });
      if (r.status === 401) return json({ error: "Sign in again" }, 401, h);
      if (!r.ok) return json({ error: "Could not check access" }, 502, h);
      allowed = (await r.json() as unknown[]).filter((p): p is string => typeof p === "string" && wanted.includes(p));
    }
    const urls: Record<string, string> = {};
    for (const p of allowed) urls[p] = await signLink(origin, env.LINK_SECRET, "r", bucket, p, now);
    return json({ urls }, 200, h);
  }

  if (body.op === "write") {
    const { path, size, type } = body;
    if (!pathOk(path)) return json({ error: "Bad path" }, 400, h);
    if (!Number.isInteger(size) || size < 0 || size > MAX_UPLOAD_BYTES) {
      return json({ error: `File must be at most ${MAX_UPLOAD_BYTES / 1048576} MB` }, 413, h);
    }
    const mime = typeof type === "string" && type.length <= 255 && /^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : "application/octet-stream";
    if (!asServer) {
      const owner = tokenSubject(token);
      if (!owner) return json({ error: "Sign in again" }, 401, h);
      const r = await rest(env, token, "file_objects", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ bucket_id: bucket, path, owner, size_bytes: size, mime_type: mime }),
      });
      if (r.status === 409) return json({ error: "A file with that name is already there" }, 409, h);
      if (r.status === 401) return json({ error: "Sign in again" }, 401, h);
      if (r.status === 403) return json({ error: "Not allowed to upload there" }, 403, h);
      if (!r.ok) {
        const msg = await r.json().then((j: any) => j?.message).catch(() => null);
        return json({ error: typeof msg === "string" ? msg : "Could not record the file" }, 400, h);
      }
    }
    return json({ url: await signLink(origin, env.LINK_SECRET, "w", bucket, path, now, String(size), mime) }, 200, h);
  }

  if (body.op === "delete") {
    const { path } = body;
    if (!pathOk(path)) return json({ error: "Bad path" }, 400, h);
    if (!asServer) {
      const r = await rest(env, token,
        `file_objects?bucket_id=eq.${encodeURIComponent(bucket)}&path=eq.${encodeURIComponent(path)}`,
        { method: "DELETE", headers: { Prefer: "return=representation" } });
      if (r.status === 401) return json({ error: "Sign in again" }, 401, h);
      if (!r.ok) return json({ error: "Could not delete" }, 502, h);
      const rows = await r.json() as unknown[];
      if (rows.length === 0) return json({ error: "Not allowed, or no such file" }, 403, h);
    }
    await env.FILES.delete(keyOf(bucket, path));
    return json({ deleted: true }, 200, h);
  }

  return json({ error: "op must be read, write or delete" }, 400, h);
}

async function handleGet(req: Request, env: Env, url: URL, now: number, h: Record<string, string>): Promise<Response> {
  const link = await checkLink(url, env.LINK_SECRET, "r", now);
  if (typeof link === "string") return json({ error: link }, 403, h);
  const obj = await env.FILES.get(keyOf(link.bucket, link.path), { range: req.headers });
  if (!obj) return json({ error: "No such file" }, 404, h);
  const headers = new Headers(h);
  obj.writeHttpMetadata(headers);
  headers.set("ETag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  const range = (obj as R2ObjectBody & { range?: { offset?: number; length?: number; suffix?: number } }).range;
  if (req.headers.has("Range") && range) {
    const start = range.suffix !== undefined ? obj.size - range.suffix : range.offset ?? 0;
    const length = range.suffix !== undefined ? range.suffix : range.length ?? obj.size - start;
    headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

async function handlePut(req: Request, env: Env, url: URL, now: number, h: Record<string, string>): Promise<Response> {
  const link = await checkLink(url, env.LINK_SECRET, "w", now);
  if (typeof link === "string") return json({ error: link }, 403, h);
  const size = Number(link.size);
  if (req.headers.get("Content-Length") !== link.size) {
    return json({ error: `Send exactly ${size} bytes with a Content-Length` }, 400, h);
  }
  if (!req.body) return json({ error: "No file" }, 400, h);
  const key = keyOf(link.bucket, link.path);
  if (await env.FILES.head(key)) return json({ error: "A file with that name is already there" }, 409, h);
  const put = await env.FILES.put(key, req.body, { httpMetadata: { contentType: link.type } });
  if (!put || put.size !== size) {
    await env.FILES.delete(key);
    return json({ error: "The upload was cut short; try again" }, 400, h);
  }
  return json({ stored: true, size: put.size }, 200, h);
}

export async function handle(req: Request, env: Env, now = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  const h = cors(req, env);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (!env.LINK_SECRET || env.LINK_SECRET.length < 32) return json({ error: "Worker not set up (LINK_SECRET)" }, 500, h);
  if (url.pathname === "/healthz") return json({ ok: true }, 200, h);
  if (url.pathname === "/v1/sign" && req.method === "POST") return handleSign(req, env, now, h);
  if (url.pathname.startsWith("/f/")) {
    if (req.method === "GET" || req.method === "HEAD") return handleGet(req, env, url, now, h);
    if (req.method === "PUT") return handlePut(req, env, url, now, h);
  }
  return json({ error: "Not found" }, 404, h);
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
