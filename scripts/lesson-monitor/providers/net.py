"""The one HTTP call the providers make: status, headers (lower-case names) and body. Never raises for a refusal;
a dropped line is status 0. Tests replace `request` with a stand-in."""
from __future__ import annotations

import http.client
import json
import uuid
import urllib.error
import urllib.request


def request(method: str, url: str, headers: dict, body: bytes | None, timeout: float = 300) -> tuple[int, dict, bytes]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in (e.headers or {}).items()}, e.read()
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, http.client.HTTPException):
        return 0, {}, json.dumps({"error": "network"}).encode()


def multipart(fields: list[tuple[str, str]], files: list[tuple[str, str, str, bytes]]) -> tuple[bytes, str]:
    """(body, content type) for form fields and (field, filename, type, bytes) files."""
    boundary = "hec" + uuid.uuid4().hex
    out = bytearray()
    for name, value in fields:
        out += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
    for name, filename, ctype, data in files:
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode()
        out += data + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def retry_after(headers: dict, default: float = 60.0) -> float:
    """Seconds from Retry-After, else Groq's x-ratelimit-reset-* ("1m30s", "2.5s", "750ms"), else default."""
    v = headers.get("retry-after")
    if v:
        try:
            return max(0.0, float(v))
        except ValueError:
            pass
    best = None
    for k in ("x-ratelimit-reset-audio-seconds", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"):
        s = headers.get(k)
        if s:
            d = duration(s)
            if d is not None:
                best = d if best is None else max(best, d)
    return best if best is not None else default


def duration(s: str) -> float | None:
    import re
    total, found = 0.0, False
    for num, unit in re.findall(r"([0-9]*\.?[0-9]+)\s*(ms|h|m|s)", s.strip()):
        found = True
        total += float(num) * {"ms": 0.001, "s": 1.0, "m": 60.0, "h": 3600.0}[unit]
    return total if found else None
