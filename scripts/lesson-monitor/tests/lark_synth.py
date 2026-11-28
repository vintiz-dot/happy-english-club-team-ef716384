"""Synthetic classroom audio for the Lark engine's tests: speech-like noise, claps, mics on their own clocks.

Never real audio. A "voice" is band-limited noise shaped by a syllable-rate envelope (about 4 Hz) with a pitch-like
tint, so it is broadband enough for GCC-PHAT and has gaps like speech. A clap is a 5 ms broadband burst that decays
in 30 ms. A mic hears every source at its own gain plus its own hiss, on a clock that starts at offset_s and runs
(1 + drift_ppm * 1e-6) fast.
"""
from __future__ import annotations

import numpy as np


def voice(seconds: float, sr: int, seed: int, f0: float = 220.0, rate_hz: float = 4.0, band=(250.0, 3500.0)) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(seconds * sr)
    x = rng.standard_normal(n)
    t = np.arange(n) / sr
    tint = 1.0 + 0.8 * np.sin(2 * np.pi * f0 * t)  # a voiced buzz riding on the noise
    from scipy.signal import butter, sosfilt
    x = sosfilt(butter(4, band, "bandpass", fs=sr, output="sos"), x * tint)  # a test may give each "child" a band
    env = np.clip(np.sin(2 * np.pi * rate_hz * t + rng.uniform(0, 6.28)), 0, None) ** 2
    phrase = np.clip((np.sin(2 * np.pi * 0.15 * t + rng.uniform(0, 6.28)) + 0.3) * 4, 0, 1)  # pauses between phrases
    y = x * env * phrase
    return (0.1 * y / (np.std(y) + 1e-9)).astype(np.float32)


def clap(sr: int, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(0.05 * sr)
    env = np.exp(-np.arange(n) / (0.006 * sr))
    return (2.5 * rng.standard_normal(n) * env).astype(np.float32)  # a real clap is 20-30 dB over speech at 1-2 m


def place(dst: np.ndarray, src: np.ndarray, at_s: float, sr: int, gain: float = 1.0) -> None:
    a = int(at_s * sr)
    if a >= len(dst) or a + len(src) <= 0:
        return
    lo = max(0, -a)
    hi = min(len(src), len(dst) - a)
    dst[a + lo: a + hi] += gain * src[lo:hi]


def three_claps(dst: np.ndarray, at_s: float, sr: int, gain: float = 1.0, gaps=(0.5, 0.55)) -> list[float]:
    ts = [at_s, at_s + gaps[0], at_s + gaps[0] + gaps[1]]
    for i, t in enumerate(ts):
        place(dst, clap(sr, i), t, sr, gain)
    return ts


def on_mic_clock(room_time_signal: np.ndarray, sr: int, offset_s: float, drift_ppm: float, length_s: float) -> np.ndarray:
    """What a mic file holds when the room-time signal is heard on a clock with mic_time = offset + (1+d) room_time:
    mic sample m is room time (m/sr - offset) / (1+d)."""
    n = int(length_s * sr)
    rate = 1.0 + drift_ppm * 1e-6
    room_t = (np.arange(n) / sr - offset_s) / rate
    pos = room_t * sr
    inside = (pos >= 0) & (pos <= len(room_time_signal) - 1)
    out = np.zeros(n, dtype=np.float32)
    out[inside] = np.interp(pos[inside], np.arange(len(room_time_signal)), room_time_signal)
    return out


def hiss(n: int, level: float, seed: int) -> np.ndarray:
    return (level * np.random.default_rng(seed).standard_normal(n)).astype(np.float32)
