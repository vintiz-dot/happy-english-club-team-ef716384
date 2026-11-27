"""Groq Whisper: whisper-large-v3 (the full model, NOT turbo), verbose_json with segment and word timestamps.

POST https://api.groq.com/openai/v1/audio/transcriptions (multipart). Each ~10-minute piece goes as 16-bit FLAC
(about 7 MB; Groq's limit is 25 MB a file), language en, temperature 0. The segments carry avg_logprob,
no_speech_prob and compression_ratio; the words carry times but no probability (p stays None).

The key is read from the service's credential folder ($CREDENTIALS_DIRECTORY/groq-key, systemd
LoadCredentialEncrypted=) or HEC_GROQ_KEY_FILE; it is never in the repo, never logged.
Retention: turn on Zero Data Retention for the organisation in the Groq console (Settings > Data Controls);
Groq does not train on API data (server/README.md, "Who receives audio").
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from . import AuthFailed, Base, ProviderError, QuotaExhausted, encode_flac, safe_code, segment
from . import net

URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODEL = "whisper-large-v3"
MAX_FILE = 25 * 1024 * 1024


def read_key(name: str = "groq-key", env: str = "HEC_GROQ_KEY_FILE") -> str:
    p = os.environ.get(env) or (os.path.join(os.environ["CREDENTIALS_DIRECTORY"], name) if os.environ.get("CREDENTIALS_DIRECTORY") else "")
    if not p:
        return ""
    try:
        return Path(p).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


class Groq(Base):
    name = "groq"
    model = MODEL

    def __init__(self, key: str, quota, transport=None, **kw):
        super().__init__(quota, **kw)
        self.key = key
        self.transport = transport or net.request

    def _call(self, x, offset_s):
        audio = encode_flac(x)
        if len(audio) > MAX_FILE:
            raise ProviderError("too_large")
        body, ctype = net.multipart(
            [("model", MODEL), ("response_format", "verbose_json"), ("language", "en"), ("temperature", "0"),
             ("timestamp_granularities[]", "segment"), ("timestamp_granularities[]", "word")],
            [("file", "piece.flac", "audio/flac", audio)])
        st, hdr, raw = self.transport("POST", URL, {"Authorization": f"Bearer {self.key}", "Content-Type": ctype}, body)
        if st == 200:
            return parse(raw, offset_s)
        if st == 429:
            raise QuotaExhausted("rate_limited", retry_after=net.retry_after(hdr))
        if st in (401, 403):
            raise AuthFailed(f"auth_{st}")
        if st == 413:
            raise ProviderError("too_large")
        if st == 0:
            raise ProviderError("network")
        if st >= 500:
            raise ProviderError("unavailable")
        raise ProviderError(safe_code(f"http_{st}"))


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse(raw: bytes, offset_s: float) -> list[dict]:
    """verbose_json -> segments. Each top-level word goes to exactly ONE segment: the first (in order) whose span,
    widened by 0.05 s, holds the word's middle; a word that fits none goes to the nearest segment by time."""
    try:
        d = json.loads(raw)
    except ValueError as e:
        raise ProviderError("bad_answer") from e
    if not isinstance(d, dict):
        raise ProviderError("bad_answer")
    segs = d.get("segments") or []
    words = d.get("words") or []
    if not isinstance(segs, list) or not isinstance(words, list):
        raise ProviderError("bad_answer")
    if any(not isinstance(s, dict) for s in segs) or any(not isinstance(w, dict) for w in words):
        raise ProviderError("bad_answer")
    spans = [(_f(s.get("start")), _f(s.get("end"))) for s in segs]
    mine: list[list[dict]] = [[] for _ in segs]
    for w in words:
        ws = _f(w.get("start"))
        if ws is None:
            continue
        we = _f(w.get("end"))
        m = (ws + (we if we is not None else ws)) / 2
        pick, best = None, None
        for i, (a, b) in enumerate(spans):
            if a is None or b is None:
                continue
            if a - 0.05 <= m <= b + 0.05:
                pick = i
                break
            dist = a - m if m < a else m - b
            if best is None or dist < best:
                best, pick_near = dist, i
        if pick is None and best is not None:
            pick = pick_near
        if pick is not None:
            mine[pick].append(w)
    out = []
    for s, ws in zip(segs, mine):
        seg = segment(s, offset_s, ws)
        if seg:
            out.append(seg)
    return out
