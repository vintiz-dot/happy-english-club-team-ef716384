"""Transcription providers for the lesson monitor (owner, 27 Nov 2026: families consented to the audio being
processed outside the school, so Groq and Cloudflare Workers AI may receive it).

ONE interface for every provider:

    provider.transcribe(audio_16k, offset_s=0.0) -> [segment, ...]
    provider.transcribe_piece(audio_16k, offset_s) -> [segment, ...]   (one piece, at most PIECE_S long)

audio_16k is 16 kHz mono float32 (what audio.TrackJoiner writes and transcribe.read_wav16k reads). A segment is
the shape report.build_report already takes from the local transcriber:

    {"start": s, "end": s, "text": str, "avg_logprob": float|None, "no_speech_prob": float|None,
     "compression_ratio": float|None, "words": [{"w", "start", "end", "p"|None}]}

with times in seconds of the LESSON (offset_s added). A number the provider did not send is None: unknown, never
invented (report.unsure only uses what is there).

Long audio is sent in pieces of PIECE_S seconds that overlap by OVERLAP_S (plan_pieces); join_pieces keeps, from
each overlap, the segments whose middle falls on that piece's side of the overlap's midpoint, so a sentence cut
by one piece is taken whole from the other and nothing is written twice.

Everything that goes out is checked first by the caller's `may_send()` (lesson_monitor_may_continue, asked fresh
before EVERY upload); a provider never sends while it answers anything but yes. Logs carry codes and numbers only.
"""
from __future__ import annotations

import io
import re
import time

import numpy as np

SR = 16000
PIECE_S = 600.0     # about 10 minutes: 19 MB as 16-bit WAV, about 7 MB as FLAC: inside Groq's 25 MB per file
OVERLAP_S = 4.0


class ProviderError(Exception):
    """A provider could not transcribe a piece. `code` is short and safe to log (never audio or text)."""

    def __init__(self, code: str, retry_after: float | None = None):
        super().__init__(code)
        self.code = code
        self.retry_after = retry_after


class QuotaExhausted(ProviderError):
    """The free allowance is used up for longer than the job will wait: fall back to the next provider."""


class NotAllowed(ProviderError):
    """lesson_monitor_may_continue did not answer "ok" just before an upload: nothing was sent."""


class AuthFailed(ProviderError):
    """The key was refused (401/403): the provider is off for the rest of the run."""


def plan_pieces(n: int, sr: int = SR, piece_s: float = PIECE_S, overlap_s: float = OVERLAP_S) -> list[tuple[int, int]]:
    """Sample ranges [a, b) covering n samples: pieces of at most piece_s, each starting overlap_s before the
    previous one ends. Pure."""
    size, ov = int(piece_s * sr), int(overlap_s * sr)
    if n <= size:
        return [(0, n)] if n > 0 else []
    out, a = [], 0
    while True:
        b = min(n, a + size)
        out.append((a, b))
        if b >= n:
            return out
        a = b - ov


def cuts(pieces: list[tuple[int, int]], sr: int = SR) -> list[float]:
    """The boundary in seconds between piece k and k+1: the middle of their overlap. len(pieces) - 1 values."""
    return [((pieces[k + 1][0] + pieces[k][1]) / 2) / sr for k in range(len(pieces) - 1)]


def core_span(k: int, pieces: list[tuple[int, int]], sr: int = SR) -> tuple[float, float]:
    """The part of the lesson piece k answers for, in seconds: from the previous cut to the next."""
    c = cuts(pieces, sr)
    return (c[k - 1] if k > 0 else pieces[0][0] / sr, c[k] if k < len(c) else pieces[-1][1] / sr)


def mid(seg: dict) -> float:
    return (float(seg["start"]) + float(seg["end"])) / 2


def join_pieces(per_piece: list[list[dict] | None], pieces: list[tuple[int, int]], sr: int = SR) -> list[dict]:
    """One transcript from each piece's segments (already in lesson time; None = that piece failed). A segment is
    kept by the piece whose core span holds its middle. Pure."""
    out = []
    for k, segs in enumerate(per_piece):
        if not segs:
            continue
        a, b = core_span(k, pieces, sr)
        last = k == len(pieces) - 1
        out.extend(s for s in segs if a <= mid(s) < b or (last and mid(s) >= a))
    return sorted(out, key=lambda s: (s["start"], s["end"]))


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if np.isfinite(f) else None


def segment(raw: dict, offset_s: float, words: list[dict] | None = None) -> dict | None:
    """A provider's segment in the job's shape, in lesson time. None for one without text or times."""
    text = " ".join(str(raw.get("text") or "").split())
    s, e = _num(raw.get("start")), _num(raw.get("end"))
    if not text or s is None or e is None:
        return None
    ws = raw.get("words") if words is None else words
    return {
        "start": round(s + offset_s, 3), "end": round(max(e, s) + offset_s, 3), "text": text,
        "avg_logprob": _num(raw.get("avg_logprob")), "no_speech_prob": _num(raw.get("no_speech_prob")),
        "compression_ratio": _num(raw.get("compression_ratio")),
        "words": [w for w in (word(x, offset_s) for x in (ws or [])) if w],
    }


def word(raw: dict, offset_s: float) -> dict | None:
    w = str(raw.get("word") if raw.get("word") is not None else raw.get("w") or "").strip()
    s, e = _num(raw.get("start")), _num(raw.get("end"))
    if not w or s is None or e is None:
        return None
    return {"w": w, "start": round(s + offset_s, 3), "end": round(max(e, s) + offset_s, 3),
            "p": _num(raw.get("probability", raw.get("p")))}


def encode_flac(x: np.ndarray, sr: int = SR) -> bytes:
    """16-bit FLAC of a float32 piece, in memory only (no copy of the audio is written to disk for an upload)."""
    import soundfile as sf
    buf = io.BytesIO()
    sf.write(buf, np.clip(np.asarray(x, dtype=np.float32), -1.0, 1.0), sr, format="FLAC", subtype="PCM_16")
    return buf.getvalue()


def safe_code(s: str, n: int = 40) -> str:
    return (re.sub(r"[^a-z0-9_]", "", str(s).lower().replace(" ", "_")) or "error")[:n]


class Base:
    """Shared piece loop, waiting, retries and quota bookkeeping. A subclass sets name / model and _call(x, offset)."""

    name = "base"
    model = ""
    max_wait_s = 300.0      # wait at most this long for the allowance to come back, else QuotaExhausted
    retries_5xx = 2

    def __init__(self, quota, may_send=lambda: True, sleep=time.sleep, log=lambda line: None):
        self.quota, self.may_send, self.sleep, self.log = quota, may_send, sleep, log
        self.disabled: str | None = None

    def transcribe(self, audio_16k: np.ndarray, offset_s: float = 0.0) -> list[dict]:
        p = plan_pieces(len(audio_16k))
        return join_pieces([self.transcribe_piece(audio_16k[a:b], offset_s + a / SR) for a, b in p], p)

    def transcribe_piece(self, x: np.ndarray, offset_s: float) -> list[dict]:
        audio_s = len(x) / SR
        if self.disabled == "quota_exhausted":
            # A provider object lives for the whole --watch process: allow it again once the allowance is back.
            w = self.quota.wait_for(audio_s)
            if w > self.max_wait_s:
                raise QuotaExhausted("quota_exhausted", retry_after=w)
            self.disabled = None
        if self.disabled:
            raise ProviderError(self.disabled)
        tries_429 = 0
        tries_5xx = 0
        while True:
            wait = self.quota.wait_for(audio_s)
            if wait > self.max_wait_s:
                self.disabled = "quota_exhausted"
                raise QuotaExhausted("quota_exhausted", retry_after=wait)
            if wait > 0:
                self.log(f"{self.name}: waiting {int(wait)} s for the free allowance")
                self.sleep(wait)
            if not self.may_send():
                raise NotAllowed("not_allowed")
            self.quota.record(audio_s)
            try:
                return self._call(x, offset_s)
            except AuthFailed as e:
                self.disabled = e.code
                raise
            except QuotaExhausted as e:
                ra = e.retry_after if e.retry_after is not None else 60.0
                self.quota.block(ra)
                tries_429 += 1
                if ra > self.max_wait_s or tries_429 > 3:
                    self.disabled = "quota_exhausted"
                    raise
                self.log(f"{self.name}: rate limited (429); waiting {int(ra)} s")
                continue
            except ProviderError as e:
                if e.code not in ("unavailable", "network") or tries_5xx >= self.retries_5xx:
                    raise
                tries_5xx += 1
                self.sleep(10.0 * tries_5xx * tries_5xx)

    def _call(self, x: np.ndarray, offset_s: float) -> list[dict]:  # pragma: no cover - subclasses
        raise NotImplementedError
