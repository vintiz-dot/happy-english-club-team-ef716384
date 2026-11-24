"""Windows DPAPI for the signed-in Windows user: what one account seals, another account or another
computer cannot open. No key file exists; Windows holds the key with the account. Imports nothing
but the standard library, so the sign-in (supa.py) and the voiceprints can both use it."""
from __future__ import annotations

import ctypes
import sys


class Dpapi:
    class _Blob(ctypes.Structure):
        _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_char))]

    def __init__(self, description: str = "hec-pilot"):
        if sys.platform != "win32":
            raise RuntimeError("DPAPI exists only on Windows")
        self.description = description

    def _run(self, protect: bool, data: bytes) -> bytes:
        crypt32, kernel32 = ctypes.windll.crypt32, ctypes.windll.kernel32
        buf = ctypes.create_string_buffer(data, len(data))
        src = self._Blob(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
        dst = self._Blob()
        ui_forbidden = 0x1
        if protect:
            ok = crypt32.CryptProtectData(ctypes.byref(src), self.description, None, None, None, ui_forbidden, ctypes.byref(dst))
        else:
            ok = crypt32.CryptUnprotectData(ctypes.byref(src), None, None, None, None, ui_forbidden, ctypes.byref(dst))
        if not ok:
            raise OSError("DPAPI refused")
        try:
            return ctypes.string_at(dst.pbData, dst.cbData)
        finally:
            kernel32.LocalFree(dst.pbData)

    def protect(self, data: bytes) -> bytes:
        return self._run(True, data)

    def unprotect(self, data: bytes) -> bytes:
        return self._run(False, data)
