"""The four Lark mics in one lesson (owner, 28 Nov 2026): the glue nightly.py calls, in order.

    wait = should_wait(api, row)              # before anything is downloaded: the Lark import is still going on
    lk = prepare(api, row, by, window, folder, guard)   # download + align the mic tracks, find speech, build the composite
    ... transcribe lk.composite (the existing provider path, consent asked before every upload) ...
    vres = finish(api, row, body, lk, guard)  # who said what; body gets mics / talk_time / voice; returns finish_voice's input

A lesson with no complete mic track (or every mic rejected by align.py) goes the old way: prepare() returns None, or a
context whose `ok` is False, which only adds `settings.lark` saying why. Nothing here saves anything; the report is
still saved by nightly.py only after the guard's last "ok".

Audio: every file is written in the lesson's audio folder (the VM's tmpfs), one mic at a time (the raw download is
deleted as soon as its aligned copy is written), so nightly.delete_audio_copy and wipe_audio cover all of it. Logs
carry codes and numbers only.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

import align
import attribute
import pilot_common as pc
import segments

MICS = segments.MICS
SR = 16000
ENGINE = "lark/1"
SETTINGS = {
    "wait_after_end_h": 6.0,  # with a mic board for the lesson but no mic track yet: wait this long after its end
    "crossfade_s": 0.02,
    "line_teacher_share": 0.6,
}
HANOI = timezone(timedelta(hours=7))


class Stopped(Exception):
    pass


@dataclass
class Lark:
    ok: bool
    tracks: list = field(default_factory=list)        # mics kept (aligned)
    alignment: dict = field(default_factory=dict)
    composite: Path | None = None
    act: dict | None = None
    child_segs: list = field(default_factory=list)
    teacher_spans: list = field(default_factory=list)
    source: np.ndarray | None = None                  # per 32 ms frame: index into SOURCES
    aligned: dict = field(default_factory=dict)       # mic -> path of its aligned 16 kHz copy
    duration_s: float = 0.0
    timing: dict = field(default_factory=dict)

    def settings(self) -> dict:
        return {"engine": ENGINE, "tracks": self.tracks, "rejected": self.alignment.get("rejected", {}),
                "vad": (self.act or {}).get("vad_engine"), "timing_s": self.timing}


SOURCES = ("room", "teacher") + MICS


# ------------------------------------------------------------------ before downloading
def _rpc_or(api, fn, args, default):
    from supa import ApiError
    try:
        return api.rpc(fn, args)
    except ApiError:
        return default  # the Lark / mic-board migration is not pasted yet: no mics, no wait


def mic_map(api, row: dict) -> list[dict]:
    """The board's seats for the lesson: [{"student_id", "mic", "at"}] (a HINT). [] without the mic-map migration."""
    sid = row.get("session_id")
    if not sid:
        return []
    return _rpc_or(api, "lesson_monitor_mic_map", {"p_session": sid}, []) or []


def should_wait(api, row: dict, now: datetime | None = None, s: dict = SETTINGS) -> str | None:
    """A reason code while the lesson must wait for its Lark files, else None. Asked BEFORE begin/downloads, every poll;
    cheap (one or two RPCs). No run is recorded for a waiting lesson."""
    rid = row["recording_id"]
    if _rpc_or(api, "recorder_mic_import_in_progress", {"p_recording": rid}, False) is True:
        return "lark_import_in_progress"
    seats = mic_map(api, row)
    if not seats:
        return None
    if complete_mics(api, rid):
        return None
    import plan
    end = plan.parse_ts(row.get("scheduled_end"))
    now = now or datetime.now(timezone.utc)
    if end is not None and now < end + timedelta(hours=s["wait_after_end_h"]):
        return "lark_import_expected"  # the board was filled in, so the mics were used: give the import time to start
    return None


def complete_mics(api, rid: str) -> list[str]:
    from supa import ApiError
    try:
        rows = api.select("class_recording_tracks", {"recording_id": f"eq.{rid}", "track": f"in.({','.join(MICS)})",
                                                     "select": "*"}) or []
    except ApiError:
        return []
    return sorted(r["track"] for r in rows if r.get("track") in MICS and (r.get("import_state") in (None, "complete")))


def mic_chunk_lists(by: dict, ready: list[str]) -> tuple[dict, list[str]]:
    """{mic: chunks in seq order} for the complete mics whose chunks are all there and confirmed; and problem codes."""
    out, problems = {}, []
    for m in ready:
        cs = sorted(by.get(m) or [], key=lambda c: int(c["seq"]))
        if not cs:
            problems.append(f"missing_track_{m}")
        elif [int(c["seq"]) for c in cs] != list(range(len(cs))):
            problems.append(f"seq_gap_{m}")
        elif any(not c.get("confirmed_at") for c in cs):
            problems.append(f"unconfirmed_{m}")
        else:
            out[m] = cs
    return out, problems


def meta_offsets(api, rid: str, row: dict, window) -> dict:
    """align.py's first guess per mic from the transmitter's own start time (device clock, Hanoi time, may be off):
    mic_time - room_time at lesson second 0. {} when nothing usable."""
    from supa import ApiError
    import plan
    try:
        rows = api.select("class_recording_tracks", {"recording_id": f"eq.{rid}", "track": f"in.({','.join(MICS)})",
                                                     "select": "*"}) or []
    except ApiError:
        return {}
    t0 = plan.parse_ts(row.get("started_at"))
    if t0 is None:
        return {}
    room0 = t0 - timedelta(milliseconds=int(row.get("pre_start_ms") or 0)) + timedelta(seconds=window[0])
    out = {}
    for r in rows:
        st = ((r.get("source") or {}) if isinstance(r.get("source"), dict) else {}).get("recorded_start")
        if not st:
            continue
        try:
            if "T" in st:
                d = datetime.fromisoformat(st)
            else:
                d = datetime.fromisoformat(f"{row.get('session_date')}T{st}")
            d = d if d.tzinfo else d.replace(tzinfo=HANOI)
            out[r["track"]] = (room0 - d).total_seconds()
        except (ValueError, TypeError):
            continue
    return out


# ------------------------------------------------------------------ download + align
def _download_track(api, chunks: list[dict], path: Path, guard) -> int:
    import audio
    j = audio.TrackJoiner((0.0, 1e9), pc.out(path))  # the whole transmitter file, on its own clock
    n = 0
    try:
        for c in chunks:
            if guard is not None and guard.should_stop():
                raise Stopped()
            data = api.download(c["storage_path"])
            if len(data) != int(c["byte_size"]) or hashlib.sha256(data).hexdigest() != c["sha256"]:
                raise ValueError("chunk_hash_mismatch")
            n += len(data)
            j.add(data, int(c["t_start_ms"]))
    finally:
        j.close()
    return n


def _read(path: Path) -> np.ndarray:
    import transcribe
    return transcribe.read_wav16k(str(path))


def _write(path: Path, x: np.ndarray) -> None:
    import soundfile as sf
    sf.write(str(pc.out(path)), np.clip(x, -1.0, 1.0), SR, subtype="PCM_16")


def prepare(api, row: dict, by: dict, window, folder: Path, guard, room_wav: Path, teacher_wav: Path | None,
            log=None) -> Lark | None:
    """None when the lesson has no complete mic track. Otherwise download, align, find speech, build the composite."""
    import time
    log = log or pc.log
    rid = row["recording_id"]
    ready = complete_mics(api, rid)
    if not ready:
        return None
    lists, problems = mic_chunk_lists(by, ready)
    if problems:
        log(f"{rid} lark: mic tracks left out: {','.join(problems)}")
    if not lists:
        return Lark(False, alignment={"rejected": {p.rsplit('_', 1)[-1]: p for p in problems}})
    stop = (lambda: guard.should_stop()) if guard is not None else None
    t_all = time.time()
    room = _read(room_wav)
    n = len(room)
    meta = meta_offsets(api, rid, row, window)
    fits, aligned, parts = {}, {}, {}
    nbytes = 0
    for m, cs in lists.items():
        raw = folder / f"{m}_raw16k.wav"
        nbytes += _download_track(api, cs, raw, guard)
        x = _read(raw)
        if stop and stop():
            raise Stopped()
        try:
            f = align.align_track(m, room, x, SR, meta.get(m), should_stop=stop)
        except InterruptedError:
            raise Stopped()
        fits[m] = f
        if f.ok:
            y, _ = align.apply(x, SR, f, n)
            _write(folder / f"{m}_aligned16k.wav", y)
            aligned[m] = folder / f"{m}_aligned16k.wav"
        del x
        raw.unlink(missing_ok=True)  # the raw copy goes as soon as it is aligned (tmpfs is 3 GB)
    alignment = {"reference": "room", "tracks": {k: f.summary() for k, f in fits.items()},
                 "rejected": dict({k: f.reason for k, f in fits.items() if not f.ok},
                                  **{p.rsplit('_', 1)[-1]: p for p in problems})}
    t_align = time.time() - t_all
    log(f"{rid} lark: {len(lists)} mic track(s), {nbytes // 1_000_000} MB, {len(aligned)} aligned "
        f"({', '.join(f'{k} {v.residual_ms:.1f} ms' for k, v in fits.items() if v.ok)}), rejected "
        f"{','.join(f'{k}:{v}' for k, v in alignment['rejected'].items()) or 'none'}; {int(t_align)} s")
    if not aligned:
        return Lark(False, alignment=alignment, timing={"align": round(t_align)})

    t1 = time.time()
    tracks = {"room": room}
    teacher = _read(teacher_wav) if teacher_wav is not None and Path(teacher_wav).exists() else None
    if teacher is not None:
        tracks["teacher"] = teacher[:n] if len(teacher) >= n else np.concatenate([teacher, np.zeros(n - len(teacher), np.float32)])
    for m, p in aligned.items():
        tracks[m] = _read(p)
    try:
        act = segments.activity(tracks, should_stop=stop)
    except InterruptedError:
        raise Stopped()
    segs = segments.child_segments(act)
    tsp = segments.teacher_segments(act)
    t_seg = time.time() - t1
    t2 = time.time()
    src = source_frames(act, segs, tsp, list(aligned))
    comp = folder / "composite16k.wav"
    _write(comp, composite(tracks, src))
    t_comp = time.time() - t2
    log(f"{rid} lark: {len(segs)} child segments, {len(tsp)} teacher stretches, vad {act['vad_engine']}; "
        f"segments {int(t_seg)} s, composite {int(t_comp)} s")
    return Lark(True, tracks=sorted(aligned), alignment=alignment, composite=comp, act=act, child_segs=segs,
                teacher_spans=tsp, source=src, aligned=aligned, duration_s=n / SR,
                timing={"align": round(t_align), "segments": round(t_seg), "composite": round(t_comp)})


# ------------------------------------------------------------------ composite
def source_frames(act: dict, segs: list[dict], teacher_spans, mics: list[str]) -> np.ndarray:
    """Which track the transcriber hears at each 32 ms frame: a child segment's best mic (even over the teacher: the
    child's words are the ones that would be lost), else the lapel while the teacher talks, else the room."""
    n = act["n"]
    src = np.zeros(n, dtype=np.int8)  # 0 = room
    F = segments.FRAME_S
    if "teacher" in act["db"]:
        for a, b in teacher_spans:
            src[int(a / F): int(np.ceil(b / F))] = SOURCES.index("teacher")
    for sg in segs:
        m = attribute.best_mics(sg)
        m = m[0] if m else sg.get("top")
        if m in mics:
            src[int(sg["a"] / F): int(np.ceil(sg["e"] / F))] = SOURCES.index(m)
    return src


def composite(tracks: dict[str, np.ndarray], src: np.ndarray, s: dict = SETTINGS) -> np.ndarray:
    """One track switching source per frame, with short crossfades so a switch is not a click."""
    hop = segments.HOP
    n = min(len(v) for v in tracks.values())
    out = np.zeros(n, dtype=np.float32)
    lab = np.repeat(src.astype(np.int16), hop)[:n]
    if len(lab) < n:
        lab = np.concatenate([lab, np.zeros(n - len(lab), np.int16)])
    k = max(1, int(s["crossfade_s"] * SR))
    ker = np.ones(k, dtype=np.float32) / k
    for i, name in enumerate(SOURCES):
        if name not in tracks:
            continue
        w = (lab == i).astype(np.float32)
        if not w.any():
            continue
        w = np.convolve(w, ker, mode="same")
        out += w * tracks[name][:n]
    return out


# ------------------------------------------------------------------ after transcription
def line_sources(lines: list[dict], src: np.ndarray, act: dict, s: dict = SETTINGS) -> None:
    """Each line gets "src" (the track it was heard on) and "who": "T" when, of the line's speech frames, the teacher
    alone talks in at least line_teacher_share (a child over the teacher makes it not the teacher's)."""
    F = segments.FRAME_S
    for ln in lines:
        a, b = int(ln["t"] / F), max(int(ln["t"] / F) + 1, int(np.ceil(ln["e"] / F)))
        w = src[a:b]
        if len(w):
            ln["src"] = SOURCES[int(np.bincount(w.astype(np.int64), minlength=len(SOURCES)).argmax())]
        t = act["teacher"][a:b]
        kid = np.zeros(len(t), dtype=bool)
        for m in act["child"].values():
            kid |= m[a:b]
        speech = int((t | kid).sum())
        share = float((t & ~kid).sum()) / speech if speech else 0.0
        ln["who"] = "T" if share >= s["line_teacher_share"] and ln.get("src") == "teacher" else None


def lines_to_groups(lines: list[dict], results: list[dict], groups: list[dict]) -> None:
    """A line spoken by a child gets "g": the group of the segment that overlaps it most. groups[*]["lines"] filled."""
    key_to = {g["key"]: g for g in groups}
    idx = sorted(range(len(results)), key=lambda i: results[i]["a"])
    starts = [results[i]["a"] for i in idx]
    import bisect
    for li, ln in enumerate(lines):
        if ln.get("who") == "T":
            continue
        a, b = float(ln["t"]), float(ln["e"])
        j = bisect.bisect_left(starts, a - 20.0)
        best, ov = None, 0.0
        while j < len(idx) and starts[j] < b:
            r = results[idx[j]]
            o = min(b, r["e"]) - max(a, r["a"])
            if o > ov and r.get("group"):
                best, ov = r["group"], o
            j += 1
        if best and ov >= 0.3 * max(0.1, b - a):
            ln["g"] = best
            key_to[best]["lines"].append(li)


def recount_targets(body: dict) -> None:
    import report
    toks = [report.tokens(ln["text"]) for ln in body["lines"]]
    for w in body.get("targets", {}).get("words", []):
        idx = report.find_phrase(toks, w["word"])
        if idx:
            w["teacher_mic"] = sum(1 for i in idx if body["lines"][i].get("who") == "T")
            w["room"] = len(idx) - w["teacher_mic"]


def voice_part(groups: list[dict]) -> dict:
    import voice
    shown = voice.SETTINGS["shown_model"]
    return {"model": voice.SETTINGS["model"] if shown == "ecapa" else shown,
            "settings": {k: v for k, v in attribute.SETTINGS.items()} | {"group_threshold": voice.threshold_for(shown),
                                                                          "engine": ENGINE},
            "groups": [{"key": g["key"], "seconds": g["seconds"], "lines": len(g["lines"]), "suggested": g["suggested"],
                        "score": g["score"]} for g in groups],
            "samples_seconds": {}}


def prints_for(models, allowed: set[str], min_s: float) -> dict:
    """{model: {child: [unit vectors]}}: every sample of every consenting child known well enough (several per child)."""
    import voiceprints
    out = {}
    for m in models:
        d = {}
        for sid, vp in voiceprints.load_all(m).items():
            if sid in allowed and vp.seconds() >= min_s and vp.samples:
                d[sid] = [np.asarray(x["e"], dtype=np.float64) for x in vp.samples]
        out[m] = d
    return out


def seats_in_lesson(entries: list[dict], row: dict, window) -> attribute.Seats:
    """The board's `at` timestamps as lesson seconds."""
    import plan
    t0 = plan.parse_ts(row.get("started_at"))
    out = []
    for e in entries or []:
        t = 0.0
        at = plan.parse_ts(e.get("at")) if isinstance(e.get("at"), str) else None
        if at is not None and t0 is not None:
            t = (at - (t0 - timedelta(milliseconds=int(row.get("pre_start_ms") or 0)))).total_seconds() - window[0]
        elif isinstance(e.get("at"), (int, float)):
            t = float(e["at"])
        out.append({"student_id": e.get("student_id"), "mic": e.get("mic"), "t": t})
    return attribute.Seats(out)


def roster(api, row: dict) -> set[str] | None:
    from supa import ApiError
    try:
        day = row.get("session_date")
        rows = api.select("enrollments", {"class_id": f"eq.{row['class_id']}", "start_date": f"lte.{day}",
                                          "or": f"(end_date.is.null,end_date.gte.{day})", "select": "student_id"})
        return {r["student_id"] for r in rows} or None
    except (ApiError, KeyError):
        return None


def finish(api, row: dict, body: dict, lk: Lark, embedders: dict, allowed: set[str], window, guard=None,
           log=None) -> dict:
    """Who said what, into the report body; returns finish_voice's input (groups with vectors, no tap samples:
    only the teacher's answers teach voiceprints)."""
    import time

    import voice
    log = log or pc.log
    rid = row["recording_id"]
    t = time.time()
    # NB: groups from make_groups key G1.. on their own; merge_groups renumbers them with the enrolment groups
    tracks = {m: _read(p) for m, p in lk.aligned.items()}
    stop = (lambda: guard.should_stop()) if guard is not None else None
    prints = prints_for(list(embedders), allowed, voice.SETTINGS["enrol_min_s"])
    seats = seats_in_lesson(mic_map(api, row), row, window)
    try:
        results = attribute.attribute(lk.child_segs, tracks, embedders, prints, seats, roster(api, row), should_stop=stop)
    except InterruptedError:
        raise Stopped()
    results = [dict(r, vecs={k: v for k, v in r["vecs"].items()}) for r in results]
    # enrolment (enrol.py): the board's one-child taps become one pre-labelled voice group per child, which teaches
    # voiceprints only once the teacher answers it; segments inside a tapped turn belong to that group
    import enrol
    turns = enrol.tap_turns_from_marks(read_marks(api, row, window), body["lesson"]["duration_s"], lk.act)
    egroups, erefused = enrol.enrol_groups(lk.act, tracks, turns, embedders) if turns and embedders else ([], [])
    offered = {g["suggested"] for g in egroups}
    inside = [any(sid in offered and a <= (r["a"] + r["e"]) / 2 < b for sid, a, b in turns) for r in results]
    rest = [r for r, i in zip(results, inside) if not i]
    groups = merge_groups(attribute.make_groups(rest, rid), rest, egroups)
    line_sources(body["lines"], lk.source, lk.act)
    spans = [{"a": r["a"], "e": r["e"], "group": r.get("group")} for r in rest]
    spans += [{"a": t, "e": e, "group": g["key"]} for g in egroups for t, e in g["spans"]]
    lines_to_groups(body["lines"], spans, groups)
    recount_targets(body)
    speaking = attribute.speaking_seconds(results, lk.teacher_spans)
    sugg = attribute.map_suggestions(results, seats)
    tt = attribute.talk_time(results, lk.teacher_spans, body["lesson"]["duration_s"])
    if tt is not None:
        body["talk_time"] = tt
    body["voice"] = voice_part(groups)
    body["lesson"]["transcribed_track"] = "composite"
    lk.timing["attribute"] = round(time.time() - t)
    body["mics"] = {"teacher_worn": True, "engine": ENGINE, "tracks": lk.tracks, "alignment": lk.alignment,
                    "speaking": speaking, "map_suggestions": sugg,
                    "enrol": {"turns": len(turns), "groups": [g["key"] for g in egroups], "refused": erefused},
                    "settings": {"segments": dict(segments.SETTINGS, band_hz=list(segments.SETTINGS["band_hz"])),
                                 "vad": lk.act["vad_engine"], "bleed_db": lk.act["bleed"], "timing_s": lk.timing}}
    note_engine(rid, [g["key"] for g in egroups])
    named = sum(1 for r in results if r["named"])
    log(f"{rid} lark: {len(results)} segments, {named} named, {len(groups)} voice groups, "
        f"{len(sugg)} board correction(s); {lk.timing['attribute']} s")
    return {"groups": groups, "samples": {}, "samples_by_model": {}, "shown_model": voice.SETTINGS["shown_model"],
            "results": results}


def engine_file() -> Path:
    return pc.sub("state") / "lark_engine.json"


def note_engine(rid: str, enrol_keys: list[str]) -> None:
    """Which recordings this engine made (ids and group keys only), so voice_admin.py accuracy --engine lark scores
    them apart from the old engine and leaves enrolment groups (suggested by a tap, not by a voice) out."""
    import json
    p = engine_file()
    d = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    d[rid] = {"engine": ENGINE, "enrol": enrol_keys}
    pc.out(p).write_text(json.dumps(d, separators=(",", ":")), encoding="utf-8")


def engine_marks() -> dict:
    import json
    p = engine_file()
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def read_marks(api, row: dict, window) -> list[dict]:
    """The speaking board's taps in lesson seconds (as nightly.run_voice reads them); [] when none or unreadable."""
    from supa import ApiError
    try:
        marks = api.select("lesson_speaker_marks", {"session_id": f"eq.{row.get('session_id')}",
                                                    "recording_id": f"eq.{row['recording_id']}",
                                                    "select": "kind,student_ids,offset_ms", "order": "at.asc"}) or []
    except ApiError:
        return []
    return [{"kind": m["kind"], "student_ids": m.get("student_ids") or [], "t_s": m["offset_ms"] / 1000.0 - window[0]}
            for m in marks if m.get("offset_ms") is not None]


def merge_groups(groups: list[dict], rest: list[dict], egroups: list[dict]) -> list[dict]:
    """Enrolment groups and voice groups in one list, numbered G1, G2, ... in the order first heard; each segment's
    "group" follows its group's new key."""
    def first(g):
        return g["spans"][0][0] if g.get("enrol") else min(rest[i]["a"] for i in g["segments"])
    allg = sorted(groups + egroups, key=first)[:attribute.SETTINGS["max_groups"]]
    for n, g in enumerate(allg, start=1):
        old, g["key"] = g["key"], f"G{n}"
        for i in g["segments"]:
            if rest[i].get("group") == old:
                rest[i]["group"] = g["key"]
    return allg


def strip_mics(body: dict) -> None:
    """The database has no mics part yet (20261128180000 not pasted): save without it, as before 1491c3d5."""
    body.pop("mics", None)
    for ln in body.get("lines", []):
        ln.pop("src", None)
