"""Sealing at rest for the remembered sign-in and the voiceprints, on Windows and on the Linux server.

  Windows (the school laptop): DPAPI for the signed-in Windows account (dpapi.py), exactly as before.
  Linux (the Oracle VM, 27 Nov 2026): AES-256-GCM with a 32-byte key that systemd hands the service as an
    ENCRYPTED credential (LoadCredentialEncrypted=seal-key in hec-lesson-monitor.service). On disk the key is
    only in /etc/credstore.encrypted/seal-key, sealed by `systemd-creds` with the machine's own secret (and
    the TPM when there is one); systemd decrypts it into a private, memory-only folder ($CREDENTIALS_DIRECTORY)
    for the life of the service. So a copy of /var/lib/hec-monitor (voiceprints, the session) without that
    machine is unreadable, as a copy of the laptop's folder is without that Windows account.
    HEC_SEAL_KEY_FILE names another key file (tests; a hand-run on the VM as root). The file must be 32 bytes
    and readable by its owner only: anything else is refused, never used.

Each use has its own subkey (description: "hec-pilot-session", "hec-voiceprint"), and the description is bound
into the ciphertext, so a voiceprint file cannot be passed off as the session or the other way round.
Imports nothing outside the standard library except `cryptography` on Linux.
"""
from __future__ import annotations

import hashlib
import os
import stat
import sys
from pathlib import Path

MAGIC = b"HECSEAL1"
KEY_NAME = "seal-key"


def key_file() -> Path:
    explicit = os.environ.get("HEC_SEAL_KEY_FILE")
    if explicit:
        return Path(explicit)
    creds = os.environ.get("CREDENTIALS_DIRECTORY")
    if creds:
        return Path(creds) / KEY_NAME
    return Path("/etc/hec-monitor") / KEY_NAME


def read_key(path: Path | None = None) -> bytes:
    p = path or key_file()
    try:
        st = p.stat()
    except OSError as e:
        raise RuntimeError(f"no sealing key at {p} (install step 'seal key' in scripts/lesson-monitor/server/README.md)") from e
    if os.name == "posix" and st.st_mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise RuntimeError(f"the sealing key {p} is readable by others: refused (chmod 600)")
    raw = p.read_bytes()
    if len(raw) != 32:
        raise RuntimeError(f"the sealing key {p} must be exactly 32 bytes")
    return raw


class KeySeal:
    """AES-256-GCM under a subkey of one 32-byte key. protect()/unprotect() like Dpapi."""

    def __init__(self, description: str, key: bytes | None = None):
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        master = key if key is not None else read_key()
        if len(master) != 32:
            raise RuntimeError("the sealing key must be 32 bytes")
        self.description = description.encode()
        self._aes = AESGCM(hashlib.sha256(b"hec-seal/1\0" + self.description + b"\0" + master).digest())

    def protect(self, data: bytes) -> bytes:
        nonce = os.urandom(12)
        return MAGIC + nonce + self._aes.encrypt(nonce, data, self.description)

    def unprotect(self, data: bytes) -> bytes:
        if not data.startswith(MAGIC) or len(data) < len(MAGIC) + 12 + 16:
            raise OSError("not a sealed file")
        nonce = data[len(MAGIC):len(MAGIC) + 12]
        try:
            return self._aes.decrypt(nonce, data[len(MAGIC) + 12:], self.description)
        except Exception as e:  # cryptography's InvalidTag: another key, another use, or a changed file
            raise OSError("the sealed file cannot be opened with this machine's key") from e


def codec(description: str):
    """The sealing for this machine: DPAPI on Windows, the systemd credential key on Linux."""
    if sys.platform == "win32":
        from dpapi import Dpapi
        return Dpapi(description)
    return KeySeal(description)
