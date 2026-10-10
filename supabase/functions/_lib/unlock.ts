/**
 * The admin unlock session: issuing it, and checking it.
 *
 * Imported both by admin-unlock, which issues tokens, and by the
 * destructive functions, which refuse to act without one. That second use
 * is what makes the gate more than a drawn one: a React gate can be walked
 * around by calling the API directly, but reset-points cannot.
 */

const PBKDF2_ITERATIONS = 210_000; // OWASP's 2023 floor for PBKDF2-SHA256
const UNLOCK_TTL_HOURS = 12;

/* ---------------------------------------------------------------- base64 */

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  return bytesToB64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------- passcodes */

/** Format: pbkdf2$sha256$<iterations>$<salt>$<hash>, salt and hash base64url. */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(passcode, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${bytesToB64url(salt)}$${bytesToB64url(bits)}`;
}

export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iterations = Number(parts[2]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;

  const bits = await deriveBits(passcode, b64urlToBytes(parts[3]), iterations);
  const expected = b64urlToBytes(parts[4]);
  if (bits.length !== expected.length) return false;

  // Constant time: a timing side channel on a 6-digit passcode is not
  // theoretical.
  let diff = 0;
  for (let i = 0; i < bits.length; i += 1) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

async function deriveBits(
  passcode: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode) as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/* ------------------------------------------------------------ the session */

export interface IssuedUnlock {
  token: string;
  expiresAt: string;
}

/**
 * The slice of a backend client these two helpers need: one call,
 * `from(table)`, returning a builder they await.
 *
 * Deliberately loose, and not for want of trying to be precise. The real
 * client's query builder is thenable rather than a Promise, so a
 * hand-written structural type naming the chain exactly is never
 * satisfiable by that client; and asking the checker to resolve the
 * client's full generic instead recurses through the whole schema and
 * gives up as "excessively deep". Both helpers below read nothing but
 * `data` and `error` off an awaited result, which is what this allows.
 */
// deno-lint-ignore no-explicit-any
export type UnlockClient = { from: (table: string) => any };

/**
 * Mint a session and store only its hash. The caller hands the raw token
 * to the browser once and never sees it again.
 */
export async function issueUnlock(
  supabase: UnlockClient,
  userId: string,
  method: "passkey" | "passcode",
  meta: { userAgent?: string | null; clientIp?: string | null },
): Promise<IssuedUnlock> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + UNLOCK_TTL_HOURS * 3600_000).toISOString();

  const { error } = await supabase.from("admin_unlock_sessions").insert({
    user_id: userId,
    token_hash: await sha256Hex(token),
    method,
    expires_at: expiresAt,
    user_agent: meta.userAgent ?? null,
    client_ip: meta.clientIp ?? null,
  });
  if (error) throw new Error(`could not start the unlock session: ${JSON.stringify(error)}`);

  return { token, expiresAt };
}

export interface UnlockCheck {
  valid: boolean;
  userId?: string;
  method?: string;
  reason?: string;
}

/**
 * The guard the destructive functions call. Fails closed on anything it
 * cannot positively confirm.
 */
export async function requireUnlock(
  supabase: UnlockClient,
  userId: string,
  token: string | null,
): Promise<UnlockCheck> {
  if (!token) return { valid: false, reason: "no unlock token" };

  const { data, error } = await supabase
    .from("admin_unlock_sessions")
    .select("user_id, method, expires_at, revoked_at")
    .eq("token_hash", await sha256Hex(token))
    .is("revoked_at", null)
    .maybeSingle();

  if (error) return { valid: false, reason: "could not check the unlock session" };
  if (!data) return { valid: false, reason: "unlock session not found" };
  if (data.user_id !== userId) return { valid: false, reason: "unlock belongs to another account" };
  if (new Date(String(data.expires_at)).getTime() <= Date.now()) {
    return { valid: false, reason: "unlock session expired" };
  }

  return { valid: true, userId: String(data.user_id), method: String(data.method) };
}

/** The header the browser sends it in. */
export const UNLOCK_HEADER = "x-admin-unlock";
