"""Join the recorder's chunks of one track, measure it, and cut the lesson out.

Chunk k of a track starts at its t_start_ms on the recording's timeline (one
clock for both tracks, C1 s.5.3). Every chunk is a complete FLAC/WAV file
(chunks_self_contained). Per track this:
  * measures per-second RMS and peak at the track's own rate (levels.LevelMeter),
  * and, for the transcribed track, writes the lesson window resampled to
    16 kHz mono PCM into the pilot folder (streamed: never the whole lesson in RAM).
Gaps between chunks stay silent; a chunk that cannot be decoded is a failure,
never skipped quietly.
"""
from __future__ import annotations

import io
from math import gcd
from pathlib import Path

import numpy as np

import levels

SR_OUT = 16000


def decode(data: bytes) -> tuple[np.ndarray, int]:
    """FLAC/WAV/Ogg through libsndfile; any other container the recorder may store in future (WebM/MP4
    Opus or AAC, for a smaller upload) through PyAV, which faster-whisper already installs."""
    import soundfile as sf
    try:
        x, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
        return x.mean(axis=1).astype(np.float32), int(sr)
    except Exception as first:  # noqa: BLE001 - libsndfile does not know the format
        try:
            return _decode_av(data)
        except Exception:  # noqa: BLE001
            raise first


def _decode_av(data: bytes) -> tuple[np.ndarray, int]:
    import av
    parts: list[np.ndarray] = []
    with av.open(io.BytesIO(data)) as c:
        stream = c.streams.audio[0]
        sr = int(stream.rate)
        for frame in c.decode(stream):
            a = frame.to_ndarray()
            if a.dtype.kind in "iu":
                a = a.astype(np.float32) / float(np.iinfo(a.dtype).max + 1)
            else:
                a = a.astype(np.float32)
            if frame.format.is_planar:
                a = a.mean(axis=0)                      # (channels, samples)
            else:
                a = a.reshape(-1, len(frame.layout.channels)).mean(axis=1)  # interleaved
            parts.append(a)
    if not parts:
        raise ValueError("no audio in the chunk")
    return np.concatenate(parts).astype(np.float32), sr


def resample(x: np.ndarray, sr: int, sr_out: int = SR_OUT) -> np.ndarray:
    if sr == sr_out or len(x) == 0:
        return x.astype(np.float32)
    from scipy.signal import resample_poly
    g = gcd(sr, sr_out)
    return resample_poly(x, sr_out // g, sr // g).astype(np.float32)


class TrackJoiner:
    """Feed chunks in seq order; read levels (and the 16 kHz lesson cut) at the end."""

    def __init__(self, window: tuple[float, float] | None = None, wav_out: Path | None = None):
        self.window = window
        self.wav_out = wav_out
        self.meter: levels.LevelMeter | None = None
        self.sr: int | None = None
        self.end_s = 0.0
        self._writer = None
        self._written = 0  # samples at 16 kHz written for the window

    def _open(self):
        import soundfile as sf
        if self.wav_out is not None and self._writer is None:
            self._writer = sf.SoundFile(str(self.wav_out), "w", samplerate=SR_OUT, channels=1, subtype="PCM_16")

    def add(self, data: bytes, t_start_ms: int) -> None:
        x, sr = decode(data)
        if self.sr is None:
            self.sr = sr
            self.meter = levels.LevelMeter(sr)
        elif sr != self.sr:
            raise ValueError("sample rate changed between chunks")
        start_s = t_start_ms / 1000.0
        self.meter.add(x, start_s)
        self.end_s = max(self.end_s, start_s + len(x) / sr)
        if self.wav_out is None or self.window is None:
            return
        a, b = self.window
        lo, hi = max(start_s, a), min(start_s + len(x) / sr, b)
        if hi <= lo:
            return
        self._open()
        # silence for any gap before this chunk inside the window
        want_at = int(round((lo - a) * SR_OUT))
        if want_at > self._written:
            self._writer.write(np.zeros(want_at - self._written, dtype=np.float32))
            self._written = want_at
        part = x[int((lo - start_s) * sr): int((hi - start_s) * sr)]
        y = resample(part, sr)
        self._writer.write(y)
        self._written += len(y)

    def close(self) -> None:
        if self._writer is not None:
            self._writer.close()
            self._writer = None

    def levels_in_window(self) -> dict:
        """rms_db / peak_db / covered for the lesson's seconds only (index 0 = lesson start)."""
        if self.meter is None:
            return {"db": None, "peak": None, "cov": None, "until_s": None}
        db, peak, cov = self.meter.result()
        a, b = self.window if self.window else (0.0, len(db))
        i, j = int(a), int(np.ceil(b))
        pad = max(0, j - len(db))
        if pad:
            db = np.concatenate([db, np.full(pad, levels.SILENT_DB)])
            peak = np.concatenate([peak, np.full(pad, levels.SILENT_DB)])
            cov = np.concatenate([cov, np.zeros(pad, dtype=bool)])
        until = min(self.end_s, b) - a
        return {"db": db[i:j], "peak": peak[i:j], "cov": cov[i:j], "until_s": max(0.0, until)}
