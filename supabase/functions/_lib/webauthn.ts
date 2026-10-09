/**
 * WebAuthn verification, by hand, with no dependencies.
 *
 * Three things make this much smaller than a general WebAuthn library:
 *
 * 1. No attestation. We never ask "is this genuinely a Yubikey". The gate
 *    exists so that an admin session left open at the front desk cannot be
 *    used by whoever walks past, not to prove provenance of hardware. That
 *    removes the whole CBOR attestation-object parse.
 * 2. The public key arrives as SPKI, from the browser's own
 *    getPublicKey(). That removes COSE key decoding, the other half of the
 *    CBOR problem. A caller could register a key they control - but they
 *    could only do that for their own account, which they are already
 *    signed in to, so it buys an attacker nothing.
 * 3. Only ES256 and RS256. Between them they cover every platform
 *    authenticator in use: Touch ID, Face ID, Windows Hello, Android.
 *
 * What is NOT relaxed, because these are the parts that actually hold:
 * the challenge is server-issued, single-use and checked; the origin and
 * the RP ID hash are checked; user verification is required, which is what
 * makes it a face or a fingerprint rather than merely a present device;
 * and the signature is checked over the exact bytes the spec names.
 */

/* ------------------------------------------------------------- base64url */

export function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time-ish comparison. Both operands here are public, but habit. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

/* ------------------------------------------------------- authenticatorData
 *
 * Layout: rpIdHash (32) | flags (1) | signCount (4, big endian) | …
 * Flags: bit 0 user present, bit 2 user verified.
 */

export interface AuthData {
  rpIdHash: Uint8Array;
  userPresent: boolean;
  userVerified: boolean;
  signCount: number;
}

export function parseAuthenticatorData(bytes: Uint8Array): AuthData {
  if (bytes.length < 37) throw new Error("authenticatorData too short");
  const flags = bytes[32];
  const view = new DataView(bytes.buffer, bytes.byteOffset + 33, 4);
  return {
    rpIdHash: bytes.slice(0, 32),
    userPresent: (flags & 0x01) !== 0,
    userVerified: (flags & 0x04) !== 0,
    signCount: view.getUint32(0, false),
  };
}

/* -------------------------------------------------------------- signatures
 *
 * ES256 signatures arrive DER-encoded; WebCrypto wants the raw r||s pair.
 */

function derToRawEcdsa(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) throw new Error("malformed ECDSA signature");
  let offset = 2;
  // A long-form length byte means the header is one byte wider.
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f);

  const readInt = (): Uint8Array => {
    if (der[offset] !== 0x02) throw new Error("malformed ECDSA integer");
    const length = der[offset + 1];
    let value = der.slice(offset + 2, offset + 2 + length);
    offset += 2 + length;
    // DER keeps a leading zero to mark the value positive; raw form does not.
    while (value.length > 32 && value[0] === 0x00) value = value.slice(1);
    const padded = new Uint8Array(32);
    padded.set(value, 32 - value.length);
    return padded;
  };

  const r = readInt();
  const s = readInt();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

/** COSE algorithm identifiers, the only two worth supporting here. */
export const ES256 = -7;
export const RS256 = -257;

async function importKey(spki: Uint8Array, alg: number): Promise<CryptoKey> {
  if (alg === ES256) {
    return crypto.subtle.importKey(
      "spki",
      spki as unknown as BufferSource,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  }
  if (alg === RS256) {
    return crypto.subtle.importKey(
      "spki",
      spki as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }
  throw new Error(`unsupported algorithm ${alg}`);
}

/* ------------------------------------------------------------- the check */

export interface AssertionInput {
  /** base64url, from the browser. */
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  /** Stored at registration. */
  publicKeySpki: string;
  publicKeyAlg: number;
  storedSignCount: number;
  /** What the server issued and has not yet seen used. */
  expectedChallenge: string;
  /** Exact origin, e.g. https://app.example.com */
  expectedOrigin: string;
  /** Registrable domain, e.g. app.example.com */
  expectedRpId: string;
}

export interface AssertionResult {
  ok: boolean;
  reason?: string;
  newSignCount?: number;
  /** The authenticator says its counter went backwards: a possible clone. */
  counterRegression?: boolean;
}

export async function verifyAssertion(input: AssertionInput): Promise<AssertionResult> {
  let clientData: { type?: string; challenge?: string; origin?: string };
  const clientDataBytes = b64urlToBytes(input.clientDataJSON);
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return { ok: false, reason: "clientDataJSON is not JSON" };
  }

  if (clientData.type !== "webauthn.get") {
    return { ok: false, reason: "wrong ceremony type" };
  }
  // Compare the decoded bytes, not the strings: the same challenge can be
  // spelled with or without base64 padding.
  if (
    !clientData.challenge ||
    !equalBytes(b64urlToBytes(clientData.challenge), b64urlToBytes(input.expectedChallenge))
  ) {
    return { ok: false, reason: "challenge does not match" };
  }
  if (clientData.origin !== input.expectedOrigin) {
    return { ok: false, reason: "origin does not match" };
  }

  const authBytes = b64urlToBytes(input.authenticatorData);
  let auth: AuthData;
  try {
    auth = parseAuthenticatorData(authBytes);
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  if (!equalBytes(auth.rpIdHash, await sha256(new TextEncoder().encode(input.expectedRpId)))) {
    return { ok: false, reason: "relying party does not match" };
  }
  if (!auth.userPresent) {
    return { ok: false, reason: "no user present" };
  }
  // The whole point of the gate. Without this a passkey that merely exists
  // on the machine would pass, and an unattended laptop would still be open.
  if (!auth.userVerified) {
    return { ok: false, reason: "device did not verify the user" };
  }

  const signedData = new Uint8Array(authBytes.length + 32);
  signedData.set(authBytes, 0);
  signedData.set(await sha256(clientDataBytes), authBytes.length);

  let verified = false;
  try {
    const key = await importKey(b64urlToBytes(input.publicKeySpki), input.publicKeyAlg);
    const rawSig = b64urlToBytes(input.signature);
    verified = await crypto.subtle.verify(
      input.publicKeyAlg === ES256
        ? { name: "ECDSA", hash: "SHA-256" }
        : { name: "RSASSA-PKCS1-v1_5" },
      key,
      (input.publicKeyAlg === ES256
        ? derToRawEcdsa(rawSig)
        : rawSig) as unknown as BufferSource,
      signedData as unknown as BufferSource,
    );
  } catch (e) {
    return { ok: false, reason: `signature check failed: ${(e as Error).message}` };
  }

  if (!verified) return { ok: false, reason: "signature does not verify" };

  // Many platform authenticators report 0 forever, so a non-increasing
  // counter is only meaningful once we have seen a non-zero one.
  const counterRegression =
    input.storedSignCount > 0 && auth.signCount > 0 && auth.signCount <= input.storedSignCount;

  return { ok: true, newSignCount: auth.signCount, counterRegression };
}
