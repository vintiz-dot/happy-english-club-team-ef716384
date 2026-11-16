/**
 * _lib/temp-password.ts - the first password of a staff account an admin
 * creates (create-teacher, create-teaching-assistant).
 *
 * Audit F-10: these came from Math.random(), which is not a cryptographic
 * source - eight base-36 characters whose sequence can be predicted from
 * other outputs of the same generator. This draws from crypto.getRandomValues
 * with rejection sampling (no modulo bias): 14 characters from a 56-symbol
 * alphabet without look-alikes (no 0/O, 1/l/I), about 81 bits, plus a fixed
 * "!Aa1" so any password-strength rule that wants each character class is
 * met. Imports nothing.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LENGTH = 14;

export function tempPassword(): string {
  // Largest multiple of the alphabet size that fits in a byte: bytes at or
  // above it are thrown away so every symbol is equally likely.
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < LENGTH) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limit && out.length < LENGTH) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out + "!Aa1";
}
