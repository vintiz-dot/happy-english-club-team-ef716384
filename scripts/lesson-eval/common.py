"""Shared helpers for the lesson-eval harness.

Data rules enforced here (see README.md):
  * Audio and everything derived from it lives under HEC_EVAL_ROOT
    (default C:\\Users\\Dell\\hec-audio-eval), outputs under <root>\\work.
  * `safe_out()` refuses (exit 3) to write anywhere inside a git repository,
    so no derived voice data can land in this repo by accident.
  * Files named key.txt / consent.txt are never opened; `iter_media()` drops
    them by name before anything else touches them.
  * Children are identified only by codes S01..S30 parsed from file names.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("HEC_EVAL_ROOT", r"C:\Users\Dell\hec-audio-eval"))
WORK = ROOT / "work"
WAV_DIR = WORK / "wav16k"
MANIFEST = WAV_DIR / "manifest.csv"
SR = 16000

FORBIDDEN_NAMES = {"key.txt", "consent.txt"}
MEDIA_EXT = {".mp3", ".mp4", ".mov", ".m4a", ".wav", ".webm", ".mkv", ".aac", ".ogg", ".flac"}
CODE_RE = re.compile(r"^(S\d{2})_clip(\d+)$", re.IGNORECASE)


def inside_git_repo(path: Path) -> Path | None:
    """Return the repo root if `path` (or any parent) contains a .git entry."""
    p = Path(path).resolve()
    for cand in [p, *p.parents]:
        if (cand / ".git").exists():
            return cand
    return None


def safe_out(path: str | Path, mkdir: bool = True) -> Path:
    """Resolve an output path; exit non-zero if it lies inside a git repo."""
    p = Path(path).resolve()
    repo = inside_git_repo(p if p.suffix == "" else p.parent)
    if repo is not None:
        sys.stderr.write(
            f"REFUSED: output path {p} is inside the git repository {repo}.\n"
            "Derived voice data must stay under the evaluation root, outside any repo.\n"
        )
        sys.exit(3)
    if mkdir:
        (p if p.suffix == "" else p.parent).mkdir(parents=True, exist_ok=True)
    return p


def is_forbidden(path: Path) -> bool:
    return path.name.lower() in FORBIDDEN_NAMES


def iter_media(folder: Path):
    """Yield media files under `folder` (recursive), never key.txt/consent.txt.

    Order: byte order of the path relative to the root (LC_ALL=C sort, as in
    make_wav16k.sh); 'videos/S..' sorts before 'videos/videos/..', so the
    top-level copy is the one kept when a nested copy is byte-identical.
    """
    out = []
    for p in folder.rglob("*"):
        if is_forbidden(p) or not p.is_file():
            continue
        if p.suffix.lower() in MEDIA_EXT:
            out.append(p)
    rel = lambda p: p.relative_to(folder.parent).as_posix()
    return sorted(out, key=lambda p: rel(p).encode())


def code_of(stem: str) -> tuple[str, str]:
    """('S01', '1') from 'S01_clip1'; ('', '') if the name is not coded."""
    m = CODE_RE.match(stem)
    return (m.group(1).upper(), m.group(2)) if m else ("", "")


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def ffprobe(path: Path) -> dict:
    """Duration / sample rate / channels / bitrate / codec of the first audio stream."""
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format",
         "-show_streams", "-select_streams", "a:0", str(path)],
        capture_output=True, text=True, check=True,
    )
    j = json.loads(r.stdout)
    st = (j.get("streams") or [{}])[0]
    fm = j.get("format", {})
    return {
        "duration_s": float(fm.get("duration") or st.get("duration") or 0.0),
        "sample_rate": int(st.get("sample_rate") or 0),
        "channels": int(st.get("channels") or 0),
        "bit_rate": int(fm.get("bit_rate") or st.get("bit_rate") or 0),
        "codec": st.get("codec_name", ""),
    }


def read_wav(path: Path, start: float | None = None, dur: float | None = None):
    """Read a mono float32 signal (optionally a slice) with soundfile."""
    import numpy as np
    import soundfile as sf

    info = sf.info(str(path))
    sr = info.samplerate
    s = int((start or 0) * sr)
    n = -1 if dur is None else int(dur * sr)
    x, sr = sf.read(str(path), start=s, frames=n, dtype="float32", always_2d=True)
    return x.mean(axis=1).astype(np.float32), sr


def write_wav(path: Path, x, sr: int = SR):
    import soundfile as sf

    path = safe_out(path)
    sf.write(str(path), x, sr, subtype="PCM_16")
    return path


def load_manifest(path: Path = MANIFEST) -> list[dict]:
    import csv

    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def video_wavs() -> dict[str, list[Path]]:
    """{code: [wav paths]} for the unique (non-duplicate) coded video clips."""
    rows = load_manifest()
    by: dict[str, list[Path]] = {}
    for r in rows:
        if r.get("set") != "videos" or r.get("duplicate_of") or not r.get("wav_file"):
            continue
        stem = Path(r["wav_file"]).stem
        code, _ = code_of(stem)
        if code:
            by.setdefault(code, []).append(WAV_DIR / r["wav_file"])
    return {k: sorted(v) for k, v in sorted(by.items())}
