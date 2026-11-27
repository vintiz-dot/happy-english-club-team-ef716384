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

Several speaker models run side by side (24 Nov 2026), so a child has one voiceprint file PER
MODEL: ECAPA keeps the original name <student id>.vp (nothing migrated, nothing lost), every
other model is <student id>.<model>.vp. A sample's vector only means something to its model,
so the files never mix.

Files: pilot\\voiceprints\\<student id>[.<model>].vp, pending\\<recording id>.vp (a lesson's group
embeddings for every model, plus each model's hidden guess, kept until the teacher answers or
30 days), calibration.jsonl (ids, scores and whether the teacher agreed, one row per model;
no embeddings).
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
DEFAULT_MODEL = "ecapa"  # the file name without a model suffix
MAGIC = b"HECVP1\n"
MAX_SAMPLES = 120        # the newest are kept; a child's voice changes over a school year
PENDING_DAYS = 30        # as long as a report is kept


# ------------------------------------------------------------------ encryption
import seal  # noqa: E402  (Windows DPAPI on the laptop; the systemd credential key on the Linux server)

CODEC = None  # tests put a stand-in here; production uses seal.codec and nothing else


def codec():
    global CODEC
    if CODEC is None:
        CODEC = seal.codec("hec-voiceprint")
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


def _check_model(model: str) -> str:
    if not model or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789_" for ch in model):
        raise ValueError("a model name")
    return model


def _path(student_id: str, model: str = DEFAULT_MODEL) -> Path:
    if not student_id or any(ch not in "0123456789abcdef-" for ch in student_id.lower()):
        raise ValueError("a student id")
    _check_model(model)
    return vp_dir() / (f"{student_id.lower()}.vp" if model == DEFAULT_MODEL else f"{student_id.lower()}.{model}.vp")


def _parse(p: Path) -> tuple[str, str]:
    """(student id, model) of a voiceprint file name."""
    stem = p.name[:-3] if p.name.endswith(".vp") else p.name
    sid, _, model = stem.partition(".")
    return sid.lower(), (model or DEFAULT_MODEL)


def _files() -> list[Path]:
    return sorted(vp_dir().glob("*.vp")) if vp_dir().exists() else []


# ------------------------------------------------------------------ one child
@dataclass
class Voiceprint:
    student_id: str
    samples: list = field(default_factory=list)  # {"e": [floats], "s": seconds, "src": "tap"|"answer", "rid", "g"}
    model: str = DEFAULT_MODEL

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


def load(student_id: str, model: str = DEFAULT_MODEL) -> Voiceprint | None:
    p = _path(student_id, model)
    if not p.exists():
        return None
    d = _read(p)
    return Voiceprint(d["student_id"], d.get("samples", []), model)


def load_every() -> list[Voiceprint]:
    """Every child's voiceprint of every model."""
    out = []
    for p in _files():
        try:
            d = _read(p)
            out.append(Voiceprint(d["student_id"], d.get("samples", []), _parse(p)[1]))
        except (ValueError, OSError, KeyError):
            pc.log(f"voiceprints: {p.name} could not be read; left as it is")
    return out


def load_all(model: str = DEFAULT_MODEL) -> dict[str, Voiceprint]:
    return {vp.student_id: vp for vp in load_every() if vp.model == model}


def save(vp: Voiceprint) -> None:
    _write(_path(vp.student_id, vp.model),
           {"student_id": vp.student_id, "model": MODEL if vp.model == DEFAULT_MODEL else vp.model,
            "samples": vp.samples[-MAX_SAMPLES:]})


def add(student_id: str, items: list[tuple[np.ndarray, float]], src: str, rid: str, group: str | None = None,
        model: str = DEFAULT_MODEL) -> int:
    """Add samples to one child's voiceprint of one model; the same lesson's earlier samples of the same kind are replaced."""
    if not items:
        return 0
    vp = load(student_id, model) or Voiceprint(student_id, model=model)
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
    """Take one voice group's samples back out of every voiceprint of every model (a teacher changed the answer)."""
    n = 0
    for vp in load_every():
        keep = [x for x in vp.samples if not (x.get("rid") == rid and x.get("g") == group)]
        if len(keep) != len(vp.samples):
            n += len(vp.samples) - len(keep)
            vp.samples = keep
            save(vp)
    return n


def delete(student_id: str) -> bool:
    """One child's voiceprints, every model."""
    _path(student_id)  # validates the id
    gone = False
    for p in _files():
        if _parse(p)[0] == student_id.lower():
            p.unlink(missing_ok=True)
            gone = True
    return gone


def delete_all() -> int:
    """Every voiceprint, every pending group and the calibration log. Returns files deleted."""
    n = 0
    for p in pc.files_under(vp_dir()) if vp_dir().exists() else []:
        p.unlink(missing_ok=True)
        n += 1
    return n


def sync_allowed(allowed: set[str]) -> int:
    """Delete the voiceprints (every model) of every child whose voiceprint consent does not stand. Returns how many files."""
    allowed = {a.lower() for a in allowed}
    n = 0
    for p in _files():
        if _parse(p)[0] not in allowed:
            p.unlink(missing_ok=True)
            n += 1
    return n


def centroids(allowed: set[str] | None = None, min_seconds: float = 0.0, model: str = DEFAULT_MODEL) -> dict[str, np.ndarray]:
    out = {}
    for sid, vp in load_all(model).items():
        if (allowed is None or sid in allowed) and vp.seconds() >= min_seconds:
            c = vp.centroid()
            if c is not None:
                out[sid] = c
    return out


# ------------------------------------------------------------------ a lesson's groups, until answered
def save_pending(rid: str, session_date: str, groups: dict, shown_model: str = DEFAULT_MODEL) -> None:
    """groups: {key: (vector, seconds)} or {key: (vector, seconds, extra)}. extra holds
    "vecs" {model: vector}, "guess" {model: {best, score, second}}, "blind" (a suggestion was held back on
    purpose) and "shown" (a suggestion was sent to the database). A plain (vector, seconds) is one ECAPA vector."""
    out = {}
    for k, v in groups.items():
        vec, secs = v[0], v[1]
        x = v[2] if len(v) > 2 else {}
        vecs = dict(x.get("vecs") or {DEFAULT_MODEL: vec})
        d = {"s": round(float(secs), 2),
             "es": {m: [round(float(a), 5) for a in e] for m, e in vecs.items()},
             "guess": x.get("guess") or {}, "blind": bool(x.get("blind")), "shown": bool(x.get("shown"))}
        if DEFAULT_MODEL in vecs:
            d["e"] = d["es"][DEFAULT_MODEL]   # the pre-multi-model layout, still read by older code
        out[k] = d
    _write(pending_dir() / f"{rid}.vp", {"rid": rid, "session_date": session_date, "shown_model": shown_model, "groups": out})


def group_vectors(g: dict) -> dict[str, list]:
    """{model: vector} of one pending group, old files (one ECAPA vector "e") included."""
    es = dict(g.get("es") or {})
    if "e" in g and DEFAULT_MODEL not in es:
        es[DEFAULT_MODEL] = g["e"]
    return es


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
