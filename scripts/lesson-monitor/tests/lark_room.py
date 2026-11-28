"""A synthetic classroom on the room timeline, shared by the segments / attribute / multimic tests.

Sources (speech-like noise, lark_synth.voice) are switched on in stretches; every track hears every source at a gain
set by distance: the teacher wears the lapel (0 dB) and is heard about 18 dB down at the mics; a child sitting at a
mic is heard there at 0 dB, about 12 dB down at the next mic, about 20 dB down at the far ones. Each track has its
own hiss (noise floor) at its own level: levels are never the same across mics, as in a real room.
"""
from __future__ import annotations

import numpy as np

from lark_synth import hiss, voice

SR = 16000
DB = lambda d: 10 ** (d / 20)  # noqa: E731
MICS = ("mic1", "mic2", "mic3", "mic4")


def gated(x: np.ndarray, spans, sr: int = SR) -> np.ndarray:
    g = np.zeros(len(x), dtype=np.float32)
    for a, b in spans:
        g[int(a * sr): int(b * sr)] = 1.0
    k = int(0.05 * sr)
    g = np.convolve(g, np.ones(k, dtype=np.float32) / k, mode="same")
    return (x * g).astype(np.float32)


def classroom(seconds: float, teacher_spans, children: dict, seed: int = 0, floors=None, bands=None):
    """children: {child id: (mic it sits at, [(from, to)], voice seed)}. Returns ({track: audio}, truth) where truth
    holds each source's spans. bands: {child id: (lo, hi) Hz} gives that child's voice its own band (a stand-in
    for a voice a fake embedder can tell apart)."""
    n = int(seconds * SR)
    floors = floors or {"teacher": 0.002, "room": 0.003, "mic1": 0.002, "mic2": 0.004, "mic3": 0.0015, "mic4": 0.003}
    tracks = {k: hiss(n, v, seed + i) for i, (k, v) in enumerate(floors.items())}
    t = gated(voice(seconds, SR, seed + 100, f0=170), teacher_spans)
    tracks["teacher"] += t
    tracks["room"] += DB(-10) * t
    for m in MICS:
        tracks[m] += DB(-18) * t
    for cid, (mic, spans, vs) in children.items():
        kw = {"band": bands[cid]} if bands and cid in bands else {}
        v = gated(voice(seconds, SR, vs, f0=280 + 7 * vs, rate_hz=4 + (vs % 3) * 0.4, **kw), spans)
        tracks["teacher"] += DB(-26) * v
        tracks["room"] += DB(-14) * v
        i = MICS.index(mic)
        for j, m in enumerate(MICS):
            d = abs(i - j)
            tracks[m] += DB(0 if d == 0 else -12 if d == 1 else -20) * v
    return tracks, {"teacher": teacher_spans, "children": children}
