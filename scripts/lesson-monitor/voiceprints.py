"""Children's voiceprints, on this laptop only (owner, 24 Nov 2026; design Option B).

A voiceprint is a list of ECAPA voice embeddings (192 numbers each) of one child, made
from moments the teacher marked as that child (a tap on the speaking board) and from
voice groups the teacher named in the app. Numbers only: no audio is kept here, and a
voice cannot be rebuilt from them. They are still a child's biometric data, so:

  * they never leave this laptop: nothing in this file talks to the network, and the
    database only ever hears a suggestion's child id and score;
  * each file is encrypted with Windows DPAPI for the signed-in Windows user, so a copy
    of the folder is unreadable on another computer or account;
  * only a child whose voiceprint consent stands (lesson_monitor_voiceprint_allowed) has
    one: sync_allowed() deletes every other on each start;
  * one command deletes one child's (`voice_admin.py delete --student ID`) or all
    (`voice_admin.py delete --all --yes`).

Every sample carries where it came from (recording, group, source), so a teacher's
corrected answer takes the wrong samples back out (remove_tag).

Files: pilot\\voiceprints\\<student id>.vp, pending\\<recording id>.vp (a lesson's group
embeddings, kept until the teacher answers or 30 days), calibration.jsonl (ids, scores and
whether the teacher agreed; no embeddings).
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

import numpy as np

import pilot_common as pc

MODEL = "ecapa-voxceleb"
MAGIC = b"HECVP1\n"
MAX_SAMPLES = 120        # the newest are kept; a child's voice changes over a school year
PENDING_DAYS = 30        # as long as a report is kept


# ------------------------------------------------------------------ encryption
from dpapi import Dpapi  # noqa: E402  (Windows DPAPI, current user)

CODEC = None  # tests put a stand-in here; production uses DPAPI and nothing else


def codec():
    global CODEC
    if CODEC is None:
        if sys.platform != "win32":
            raise RuntimeError("voiceprints are kept only on the school's Windows laptop (DPAPI)")
        CODEC = Dpapi("hec-voiceprint")
    return CODEC


def _write(path: Path, obj) -> None:
    pc.out(path).write_bytes(MAGIC + codec().protect(json.dumps(obj, separators=(",", ":")).encode()))


def _read(path: Path):
    raw = path.read_bytes()
    if not raw.startswith(MAGIC):
        raise ValueError("not a voiceprint file")
    return json.loads(codec().unprotect(raw[len(MAGIC):]).decode())


# ------------------------------------------------------------------ places
def vp_dir() -> Path:
    return pc.sub("voiceprints")


def pending_dir() -> Path:
    return vp_dir() / "pending"


def calibration_file() -> Path:
    return vp_dir() / "calibration.jsonl"


def _path(student_id: str) -> Path:
    if not student_id or any(ch not in "0123456789abcdef-" for ch in student_id.lower()):
        raise ValueError("a student id")
    return vp_dir() / f"{student_id.lower()}.vp"


# ------------------------------------------------------------------ one child
@dataclass
class Voiceprint:
    student_id: str
    samples: list = field(default_factory=list)  # {"e": [192 floats], "s": seconds, "src": "tap"|"answer", "rid", "g"}

    def seconds(self) -> float:
        return float(sum(x.get("s", 0) for x in self.samples))

    def centroid(self) -> np.ndarray | None:
        if not self.samples:
            return None
        m = np.array([x["e"] for x in self.samples], dtype=np.float64)
        w = np.array([max(0.5, float(x.get("s", 1))) for x in self.samples])
        c = (m * w[:, None]).sum(axis=0)
        n = np.linalg.norm(c)
        return c / n if n else None


def load(student_id: str) -> Voiceprint | None:
    p = _path(student_id)
    if not p.exists():
        return None
    d = _read(p)
    return Voiceprint(d["student_id"], d.get("samples", []))


def load_all() -> dict[str, Voiceprint]:
    out = {}
    for p in sorted(vp_dir().glob("*.vp")) if vp_dir().exists() else []:
        try:
            d = _read(p)
            out[d["student_id"]] = Voiceprint(d["student_id"], d.get("samples", []))
        except (ValueError, OSError, KeyError):
            pc.log(f"voiceprints: {p.name} could not be read; left as it is")
    return out


def save(vp: Voiceprint) -> None:
    _write(_path(vp.student_id), {"student_id": vp.student_id, "model": MODEL, "samples": vp.samples[-MAX_SAMPLES:]})


def add(student_id: str, items: list[tuple[np.ndarray, float]], src: str, rid: str, group: str | None = None) -> int:
    """Add samples to one child's voiceprint; the same lesson's earlier samples of the same kind are replaced."""
    if not items:
        return 0
    vp = load(student_id) or Voiceprint(student_id)
    vp.samples = [x for x in vp.samples if not (x.get("rid") == rid and x.get("g") == group and x.get("src") == src)]
    for vec, secs in items:
        v = np.asarray(vec, dtype=np.float64)
        n = np.linalg.norm(v)
        if n:
            vp.samples.append({"e": [round(float(a), 5) for a in v / n], "s": round(float(secs), 2),
                               "src": src, "rid": rid, "g": group})
    save(vp)
    return len(items)


def remove_tag(rid: str, group: str) -> int:
    """Take one voice group's samples back out of every voiceprint (a teacher changed the answer)."""
    n = 0
    for vp in load_all().values():
        keep = [x for x in vp.samples if not (x.get("rid") == rid and x.get("g") == group)]
        if len(keep) != len(vp.samples):
            n += len(vp.samples) - len(keep)
            vp.samples = keep
            save(vp)
    return n


def delete(student_id: str) -> bool:
    p = _path(student_id)
    if p.exists():
        p.unlink()
        return True
    return False


def delete_all() -> int:
    """Every voiceprint, every pending group and the calibration log. Returns files deleted."""
    n = 0
    for p in pc.files_under(vp_dir()) if vp_dir().exists() else []:
        p.unlink(missing_ok=True)
        n += 1
    return n


def sync_allowed(allowed: set[str]) -> int:
    """Delete the voiceprint of every child whose voiceprint consent does not stand. Returns how many."""
    allowed = {a.lower() for a in allowed}
    n = 0
    for p in sorted(vp_dir().glob("*.vp")) if vp_dir().exists() else []:
        if p.stem.lower() not in allowed:
            p.unlink(missing_ok=True)
            n += 1
    return n


def centroids(allowed: set[str] | None = None, min_seconds: float = 0.0) -> dict[str, np.ndarray]:
    out = {}
    for sid, vp in load_all().items():
        if (allowed is None or sid in allowed) and vp.seconds() >= min_seconds:
            c = vp.centroid()
            if c is not None:
                out[sid] = c
    return out


# ------------------------------------------------------------------ a lesson's groups, until answered
def save_pending(rid: str, session_date: str, groups: dict[str, tuple[np.ndarray, float]]) -> None:
    _write(pending_dir() / f"{rid}.vp", {"rid": rid, "session_date": session_date,
                                          "groups": {k: {"e": [round(float(a), 5) for a in v], "s": round(float(s), 2)}
                                                     for k, (v, s) in groups.items()}})


def load_pending(rid: str) -> dict:
    p = pending_dir() / f"{rid}.vp"
    return _read(p) if p.exists() else {}


def expire_pending(today: date, keep_days: int = PENDING_DAYS) -> int:
    n = 0
    for p in sorted(pending_dir().glob("*.vp")) if pending_dir().exists() else []:
        try:
            d = date.fromisoformat(_read(p).get("session_date", "1970-01-01"))
        except (ValueError, OSError):
            d = date(1970, 1, 1)
        if d < today - timedelta(days=keep_days):
            p.unlink(missing_ok=True)
            n += 1
    return n


def note_calibration(row: dict) -> None:
    """One line per teacher answer to a suggestion: ids, the score, agreed or not. No embedding."""
    with pc.out(calibration_file()).open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, separators=(",", ":")) + "\n")


def read_calibration() -> list[dict]:
    p = calibration_file()
    if not p.exists():
        return []
    return [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines() if x.strip()]
