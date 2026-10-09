/**
 * The browser half of the admin sign-in gate.
 *
 * Raw WebAuthn rather than a library: the ceremony is about forty lines
 * once you have base64url helpers, and this app's build has been broken
 * before by a dependency drifting out of step with the lockfile. Nothing
 * here needs installing.
 *
 * The unlock token lives in sessionStorage, so closing the tab ends the
 * session — which is what "once per browser session" ought to mean. The
 * server keeps only its hash and re-checks it on every call that matters.
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "hec.admin.unlock";
export const UNLOCK_HEADER = "x-admin-unlock";

/* ---------------------------------------------------------- base64url */

function bufferToB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/* ------------------------------------------------------- token storage */

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // Private mode, blocked storage: the gate simply asks every time.
    return null;
  }
}

function writeToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* nothing to do; the session just will not persist across reloads */
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Headers for any call that must prove the gate was passed. */
export function unlockHeaders(): Record<string, string> {
  const token = readToken();
  return token ? { [UNLOCK_HEADER]: token } : {};
}

/* ------------------------------------------------------------- the API */

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-unlock", {
    body,
    headers: unlockHeaders(),
  });
  if (error) {
    // The function's own message is more useful than "non-2xx status code",
    // and supabase-js buries it in the response.
    const detail = await readFunctionError(error);
    throw new Error(detail ?? error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const response = (error as { context?: Response })?.context;
  if (!response || typeof response.json !== "function") return null;
  try {
    const parsed = await response.clone().json();
    return typeof parsed?.error === "string" ? parsed.error : null;
  } catch {
    return null;
  }
}

export interface PasskeySummary {
  id: string;
  device_label: string;
  created_at: string;
  last_used_at: string | null;
}

export interface UnlockStatus {
  unlocked: boolean;
  passkeys: PasskeySummary[];
  hasPasscode: boolean;
  passcodeLockedUntil: string | null;
  /** False when nothing is enrolled yet, so the gate must stand aside. */
  enrolled: boolean;
  rpId: string;
}

export function getStatus(): Promise<UnlockStatus> {
  return call<UnlockStatus>({ action: "status" });
}

/** True when this browser can do Face ID / Touch ID / Windows Hello. */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------- passkeys */

interface OptionsResponse {
  challenge: string;
  rpId: string;
  userId: string;
  userName: string;
  credentialIds: string[];
}

function describeThisDevice(): string {
  const ua = navigator.userAgent;
  const platform =
    /iPhone|iPad/.test(ua) ? "iPhone or iPad"
    : /Macintosh/.test(ua) ? "Mac"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows PC"
    : "This device";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : "browser";
  return `${platform} · ${browser}`;
}

export async function enrolPasskey(label?: string): Promise<void> {
  const options = await call<OptionsResponse>({ action: "passkey/options", purpose: "register" });

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: b64urlToBuffer(options.challenge),
      rp: { id: options.rpId, name: "Happy English Club" },
      user: {
        id: new TextEncoder().encode(options.userId),
        name: options.userName,
        displayName: options.userName,
      },
      // ES256 first, RS256 for the Windows Hello TPMs that prefer RSA.
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        // The built-in authenticator, not a roaming key: this is about the
        // person sitting at this machine.
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      // Nothing is checked, so asking for it only adds a prompt on some
      // platforms.
      attestation: "none",
      timeout: 60_000,
      excludeCredentials: options.credentialIds.map((id) => ({
        type: "public-key" as const,
        id: b64urlToBuffer(id),
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Enrolment was cancelled.");

  const response = credential.response as AuthenticatorAttestationResponse;
  const spki = response.getPublicKey?.();
  const alg = response.getPublicKeyAlgorithm?.();
  if (!spki || alg == null) {
    throw new Error("This browser is too old to enrol a passkey. Use a passcode instead.");
  }

  // Enrolling is itself a proof of presence, so the server opens the
  // session in the same round trip rather than asking again immediately.
  const { token } = await call<{ token: string }>({
    action: "passkey/register",
    challenge: options.challenge,
    credentialId: credential.id,
    publicKeySpki: bufferToB64url(spki),
    publicKeyAlg: alg,
    deviceLabel: label || describeThisDevice(),
  });
  writeToken(token);
}

export async function unlockWithPasskey(): Promise<void> {
  const options = await call<OptionsResponse>({
    action: "passkey/options",
    purpose: "authenticate",
  });

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: b64urlToBuffer(options.challenge),
      rpId: options.rpId,
      userVerification: "required",
      timeout: 60_000,
      allowCredentials: options.credentialIds.map((id) => ({
        type: "public-key" as const,
        id: b64urlToBuffer(id),
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Sign-in was cancelled.");
  const response = credential.response as AuthenticatorAssertionResponse;

  const { token } = await call<{ token: string }>({
    action: "passkey/verify",
    challenge: options.challenge,
    credentialId: credential.id,
    clientDataJSON: bufferToB64url(response.clientDataJSON),
    authenticatorData: bufferToB64url(response.authenticatorData),
    signature: bufferToB64url(response.signature),
  });
  writeToken(token);
}

export async function forgetPasskey(id: string): Promise<void> {
  await call({ action: "passkey/forget", id });
}

/* ------------------------------------------------------------ passcodes */

export async function setPasscode(passcode: string, currentPasscode?: string): Promise<void> {
  const { token } = await call<{ token: string }>({
    action: "passcode/set",
    passcode,
    currentPasscode,
  });
  writeToken(token);
}

export async function unlockWithPasscode(passcode: string): Promise<void> {
  const { token } = await call<{ token: string }>({ action: "passcode/verify", passcode });
  writeToken(token);
}

export async function lock(): Promise<void> {
  try {
    await call({ action: "lock" });
  } finally {
    clearToken();
  }
}
