"""Who is speaking WHEN, on the aligned tracks (owner, 28 Nov 2026): teacher speech, child speech, overlap.

Inputs are 16 kHz mono tracks on the room timeline (align.py): `teacher` (the GCK lapel the teacher now wears),
`room` (the S500) and `mic1`..`mic4` (Lark transmitters among the children). Everything is worked out on one grid of
32 ms frames (Silero's window), so 2 hours is about 225 000 frames per track.

  * Speech-band level (300-3400 Hz) per frame, and each track's OWN noise floor (a low percentile over the last
    minute). The margin over that floor is what tells mics apart: a child sitting at mic 2 is far above mic 2's
    floor and barely above mic 4's. Levels are never normalised before comparing (the owner's rule): a quiet mic
    stays quiet.
  * Speech probability per frame from Silero VAD v6 (the ONNX file faster-whisper already ships, so the VM needs
    nothing new). Without it (tests, or a missing file) a margin threshold stands in.
  * TEACHER speech = the lapel says speech, well over its floor, and at least one mic hears it at about the
    teacher's usual bleed (a child near one mic raises that mic, not the far ones). The bleed (lapel level minus each
    mic's level while the wearer talks) is measured on the lesson itself, from frames where the lapel is louder
    than every mic; with too few of those there is no teacher reference and nothing is called teacher speech.
  * CHILD speech = a mic says speech and is louder than the teacher's bleed explains by `excess_db`. So a child
    talking OVER the teacher is kept (overlap = True), never dropped as teacher speech.
  * Segments: runs of child frames, split where the loudest mic changes for longer than `switch_s`, each carrying
    every mic's mean excess and margin for attribute.py.

pyannote segmentation (owner's brief: try it) is NOT used: its weights are gated on Hugging Face (an account and a
token that accepts the licence), and it would be a new package on the VM, whose install belongs to the pipeline
session. `python segments.py bench` times what this module does on 6 synthetic 2-hour tracks (teacher, room, 4 mics) on the machine that
runs it, so the VM's budget is measured, not assumed.
"""
from __future__ import annotations

import os
import sys
import time

import numpy as np

SR = 16000
HOP = 512                 # 32 ms: Silero v6's window at 16 kHz
FRAME_S = HOP / SR
MICS = ("mic1", "mic2", "mic3", "mic4")

SETTINGS = {
    "band_hz": (300.0, 3400.0),
    "floor_pct": 10,          # each track's noise floor: this percentile of its frames ...
    "floor_window_s": 60,     # ... over the last minute (a room gets louder and quieter)
    "vad_threshold": 0.5,     # Silero speech probability
    "speech_margin_db": 6.0,  # a frame counts as speech on a track only this far over its own floor
    "teacher_margin_db": 10.0,
    "wearer_db": 6.0,         # the lapel this much louder than every mic = its wearer talking (measures the bleed)
    "bleed_slack_db": 8.0,    # teacher speech: some mic within this of the teacher's usual bleed
    "excess_db": 6.0,         # a mic this much louder than the teacher's bleed explains = a child at that mic
    "smooth_frames": 9,       # gaps of up to about 0.3 s inside speech are closed
    "merge_gap_s": 0.3,
    "min_seg_s": 0.4,
    "max_seg_s": 15.0,
    "switch_s": 0.3,
    "threads": 2,             # tracks measured at once (the VM has 4 cores and also transcribes)
}


# ------------------------------------------------------------------ levels
def band_db(x: np.ndarray, sr: int = SR, s: dict = SETTINGS, block: int = 20000) -> np.ndarray:
    """Speech-band level per 32 ms frame, dB (unnormalised): a Hann-windowed FFT of each frame, the band's bins summed.
    In blocks, so 2 hours never sits in memory as float64 spectra."""
    x = np.asarray(x, dtype=np.float32)
    k = len(x) // HOP
    f = np.fft.rfftfreq(HOP, 1.0 / sr)
    band = (f >= s["band_hz"][0]) & (f <= s["band_hz"][1])
    win = np.hanning(HOP).astype(np.float32)
    out = np.empty(k)
    for i in range(0, k, block):
        j = min(k, i + block)
        fr = x[i * HOP: j * HOP].reshape(j - i, HOP) * win
        spec = np.fft.rfft(fr, axis=1)
        out[i:j] = np.sum(np.abs(spec[:, band]) ** 2, axis=1) / (HOP * HOP)
    return 10 * np.log10(out + 1e-12)


def noise_floor(db: np.ndarray, s: dict = SETTINGS) -> np.ndarray:
    """A low percentile per second, then the lowest of those over the trailing window, back on the frame grid.
    Cheap at 2 hours (7 200 seconds, not 225 000 frames, go through the rolling step)."""
    per = int(round(1.0 / FRAME_S))
    n = len(db)
    if n == 0:
        return db
    k = int(np.ceil(n / per))
    pad = np.concatenate([db, np.full(k * per - n, db[-1])])
    sec = np.percentile(pad.reshape(k, per), s["floor_pct"], axis=1)
    w = max(1, int(s["floor_window_s"]))
    from scipy.ndimage import percentile_filter
    roll = percentile_filter(sec, 20, size=w, origin=(w - 1) // 2, mode="nearest")  # trailing window
    return np.repeat(roll, per)[:n]


def smooth(mask: np.ndarray, k: int) -> np.ndarray:
    """Speech has gaps between syllables: close gaps up to k frames (about 0.2 s), then drop blips under 3 frames."""
    if k <= 1 or len(mask) == 0:
        return mask.astype(bool)
    from scipy.ndimage import binary_closing, binary_opening
    m = binary_closing(mask.astype(bool), structure=np.ones(k, dtype=bool), border_value=0)
    m = binary_opening(m, structure=np.ones(3, dtype=bool))
    return m


# ------------------------------------------------------------------ Silero
_VAD = None


def silero_path() -> str | None:
    try:
        import faster_whisper
        p = os.path.join(os.path.dirname(faster_whisper.__file__), "assets", "silero_vad_v6.onnx")
        return p if os.path.exists(p) else None
    except ImportError:
        return None


def silero_probs(x: np.ndarray) -> np.ndarray | None:
    """Speech probability per 32 ms frame, or None when Silero is not here."""
    global _VAD
    p = silero_path()
    if p is None:
        return None
    if _VAD is None:
        from faster_whisper.vad import SileroVADModel
        _VAD = SileroVADModel(p)
    x = np.asarray(x, dtype=np.float32)
    k = len(x) // HOP
    if k == 0:
        return np.zeros(0)
    return np.asarray(_VAD(np.ascontiguousarray(x[: k * HOP]))).reshape(-1)[:k]


# ------------------------------------------------------------------ activity
def activity(tracks: dict[str, np.ndarray], use_silero: bool = True, s: dict = SETTINGS, should_stop=None) -> dict:
    """Per-frame figures for every track present. tracks: {"teacher", "room", "mic1".. "mic4"} -> 16 kHz audio on the
    room timeline (any may be missing except at least one mic). Returns
      {"n", "db": {t: dB}, "margin": {t: dB over floor}, "vad": {t: bool}, "teacher": bool, "excess": {mic: dB},
       "child": {mic: bool}, "bleed": {mic: dB}, "vad_engine": "silero"|"margin"}"""
    n = min(len(v) for v in tracks.values()) // HOP
    def one(name):
        x = tracks[name][: n * HOP]
        d = band_db(x, SR, s)[:n]
        m = d - noise_floor(d, s)
        p = silero_probs(x) if use_silero else None
        if p is not None and len(p) >= n:
            return name, d, m, (p[:n] >= s["vad_threshold"]) & (m >= s["speech_margin_db"] * 0.5), "silero"
        return name, d, m, m >= s["speech_margin_db"], "margin"

    db, margin, vad = {}, {}, {}
    engine = "margin"
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max(1, int(s.get("threads", 2)))) as pool:  # onnxruntime frees the GIL
        futs = [pool.submit(one, nm) for nm in tracks]
        for fu in futs:
            if should_stop and should_stop():
                for g in futs:
                    g.cancel()
                raise InterruptedError("stopped")
            name, d, m, sp, eng = fu.result()
            db[name], margin[name], vad[name] = d, m, smooth(sp, s["smooth_frames"])
            engine = eng if eng == "silero" else engine
    mics = [m for m in MICS if m in tracks]

    teacher = np.zeros(n, dtype=bool)
    bleed: dict[str, float] = {}
    if "teacher" in tracks and mics:
        lap = db["teacher"]
        # the wearer: the lapel clearly louder than EVERY mic (a child is never louder on the lapel than at their own mic)
        top_mic = np.max(np.vstack([db[m] for m in mics]), axis=0)
        own = vad["teacher"] & (lap - top_mic >= s["wearer_db"]) & (margin["teacher"] >= s["teacher_margin_db"])
        if own.sum() >= 30:
            loud = own & (lap >= np.percentile(lap[own], 50))  # the louder half of the wearer's frames
            for m in mics:
                bleed[m] = float(np.median(lap[loud] - db[m][loud]))
            # the teacher is talking when the lapel says speech and at least one mic hears it at about the teacher's
            # usual bleed: a child near one mic raises that mic, not the far ones, so overlap stays teacher speech
            near = np.max(np.vstack([lap - db[m] - bleed[m] for m in mics]), axis=0)
            teacher = smooth(vad["teacher"] & (margin["teacher"] >= s["teacher_margin_db"]) & (near >= -s["bleed_slack_db"]),
                             s["smooth_frames"])

    excess, child = {}, {}
    for m in mics:
        if bleed:
            # how far the mic is above what the teacher's voice (bleed) alone would put there; while the lapel hears
            # no speech the teacher explains nothing and the excess is the mic's margin
            expected = np.where(teacher, db["teacher"] - bleed[m], -200.0)
            ex = db[m] - np.maximum(db[m] - margin[m], expected)  # over the louder of: its floor, the teacher's bleed
        else:
            ex = margin[m]
        excess[m] = ex
        child[m] = smooth(vad[m] & (ex >= s["excess_db"]), s["smooth_frames"])
    return {"n": n, "db": db, "margin": margin, "vad": vad, "teacher": teacher, "excess": excess, "child": child,
            "bleed": {m: round(v, 1) for m, v in bleed.items()}, "vad_engine": engine}


def runs(mask: np.ndarray, merge_gap: int = 0, min_len: int = 1) -> list[tuple[int, int]]:
    """[(start frame, end frame)) of True runs, gaps of at most merge_gap frames joined."""
    if len(mask) == 0:
        return []
    d = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    st, en = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
    out = []
    for a, b in zip(st, en):
        if out and a - out[-1][1] <= merge_gap:
            out[-1] = (out[-1][0], b)
        else:
            out.append((a, b))
    return [(a, b) for a, b in out if b - a >= min_len]


def child_segments(act: dict, s: dict = SETTINGS) -> list[dict]:
    """Stretches of child speech: [{"a", "e" (s), "top": loudest mic, "overlap": teacher talking for >= 30 % of it,
    "excess": {mic: dB}, "margin": {mic: dB}} (90th percentile over the stretch's speech frames)]. A stretch is split where the loudest mic changes for longer
    than switch_s (two children at different mics answering each other) and at max_seg_s."""
    mics = sorted(act["child"])
    if not mics:
        return []
    n = act["n"]
    anym = np.zeros(n, dtype=bool)
    for m in mics:
        anym |= act["child"][m]
    ex = np.vstack([np.where(act["child"][m], act["excess"][m], -200.0) for m in mics])
    top = np.argmax(ex, axis=0)
    from scipy.ndimage import median_filter
    sw = max(1, int(round(s["switch_s"] / FRAME_S)))
    top = median_filter(top, size=2 * sw + 1, mode="nearest")
    out = []
    gap = int(round(s["merge_gap_s"] / FRAME_S))
    for a, b in runs(anym, gap, 1):
        cuts = [a] + [i for i in range(a + 1, b) if top[i] != top[i - 1]] + [b]
        mx = int(round(s["max_seg_s"] / FRAME_S))
        pieces = []
        for x, y in zip(cuts, cuts[1:]):
            for z in range(x, y, mx):
                pieces.append((z, min(y, z + mx)))
        for x, y in pieces:
            if (y - x) * FRAME_S < s["min_seg_s"]:
                continue
            on = np.zeros(y - x, dtype=bool)
            for m in mics:
                on |= act["child"][m][x:y]
            seg = {"a": round(x * FRAME_S, 3), "e": round(y * FRAME_S, 3), "top": mics[int(np.bincount(top[x:y]).argmax())],
                   "overlap": bool(act["teacher"][x:y].mean() >= 0.3),
                   # the voice's peaks (90th percentile), not the gaps between syllables at each mic's floor
                   "excess": {m: round(float(np.percentile(act["excess"][m][x:y][on], 90)) if on.any() else -99.0, 1)
                              for m in mics},
                   "margin": {m: round(float(np.percentile(act["margin"][m][x:y][on], 90)) if on.any() else -99.0, 1)
                              for m in mics}}
            out.append(seg)
    return out


def teacher_segments(act: dict, s: dict = SETTINGS) -> list[tuple[float, float]]:
    gap = int(round(s["merge_gap_s"] / FRAME_S))
    return [(round(a * FRAME_S, 3), round(b * FRAME_S, 3)) for a, b in runs(act["teacher"], gap, int(s["min_seg_s"] / FRAME_S))]


def seconds(mask: np.ndarray) -> float:
    return round(float(mask.sum()) * FRAME_S, 1)


# ------------------------------------------------------------------ bench
def bench(minutes: float = 120.0, n_tracks: int = 6, use_silero: bool = True) -> dict:
    """Time activity() + child_segments() on n_tracks (teacher, room, mic1..mic4) synthetic tracks of `minutes` (noise with speech-like bursts).
    Prints the numbers; never touches real audio."""
    rng = np.random.default_rng(0)
    n = int(minutes * 60 * SR)
    t0 = time.time()
    names = (["teacher", "room"] + list(MICS))[:n_tracks]
    tracks = {}
    env = (np.sin(np.arange(n) / SR * 2 * np.pi * 0.2) > 0).astype(np.float32)
    for i, nm in enumerate(names):
        tracks[nm] = (0.003 * rng.standard_normal(n) + 0.05 * env * rng.standard_normal(n) * (0.3 + 0.1 * i)).astype(np.float32)
    t_gen = time.time() - t0
    t1 = time.time()
    act = activity(tracks, use_silero)
    t_act = time.time() - t1
    t2 = time.time()
    segs = child_segments(act)
    t_seg = time.time() - t2
    r = {"minutes": minutes, "tracks": len(tracks), "vad_engine": act["vad_engine"], "activity_s": round(t_act, 1),
         "segments_s": round(t_seg, 1), "segments": len(segs), "synth_s": round(t_gen, 1), "cpus": os.cpu_count(),
         "realtime_factor": round((t_act + t_seg) / (minutes * 60), 4)}
    return r


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "bench":
        mins = float(sys.argv[2]) if len(sys.argv) > 2 else 120.0
        for k, v in bench(mins, 6, "--no-silero" not in sys.argv).items():
            print(f"{k}: {v}")
    else:
        print(__doc__)
