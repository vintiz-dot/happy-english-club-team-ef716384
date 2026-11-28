"""Run the Lark speaker engine offline on one lesson and score it (owner, 28 Nov 2026). Saves and uploads NOTHING.

  PY scripts/lesson-monitor/replay.py <recording id>                 # the server's copy, as the signed-in job account
  PY scripts/lesson-monitor/replay.py --dir <folder> [--truth truth.json] [--board board.json]

<recording id>: lesson_monitor_begin is asked first (the same consent and class checks as the overnight job), the
room, teacher and mic tracks are downloaded into the pilot audio folder (the VM's tmpfs), run through align /
segments / attribute, and deleted at the end, whatever happens. No transcription, so nothing goes to Groq or
Cloudflare; no report, no voice group and no voiceprint is written.

--dir: local files room.*, teacher.*, mic1.* .. mic4.* (any format soundfile reads; room and teacher on one clock,
the mics on their own). For trials on the owner's own pilot recordings; never put such a folder in the repo.

TRUTH: who really spoke when, in lesson seconds. By default the teacher's one-child taps on the speaking board
(lesson_speaker_marks; with --dir, none unless --truth). --truth: [{"from": s, "to": s, "child": id}, ...].

It prints, per child (ids; a name is never printed): segments and SECONDS named-and-right, named-and-wrong, unsure,
and in all the share of wrong among named (target under 5 %), plus the alignment and the timings.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import align  # noqa: E402
import attribute  # noqa: E402
import pilot_common as pc  # noqa: E402
import segments  # noqa: E402

SR = 16000
MICS = segments.MICS


# ------------------------------------------------------------------ scoring (pure)
def truth_child(r: dict, truth: list[dict], min_share: float = 0.5) -> str | None:
    """The truth child covering at least min_share of the segment, else None (nobody labelled it)."""
    best, ov = None, 0.0
    for t in truth:
        o = min(r["e"], float(t["to"])) - max(r["a"], float(t["from"]))
        if o > ov:
            best, ov = t["child"], o
    return best if ov >= min_share * (r["e"] - r["a"]) else None


def score(results: list[dict], truth: list[dict]) -> dict:
    """{"children": {child: counts}, "total": counts, "unlabelled": counts}; counts = right/wrong/unsure in segments
    and seconds. A segment named as someone with no truth there is "named_unlabelled" (not counted as right or
    wrong: nobody knows)."""
    def blank():
        return {"right": 0, "wrong": 0, "unsure": 0, "right_s": 0.0, "wrong_s": 0.0, "unsure_s": 0.0}
    per: dict[str, dict] = {}
    tot, unl = blank(), {"named": 0, "named_s": 0.0, "unsure": 0, "unsure_s": 0.0}
    for r in results:
        d = r["e"] - r["a"]
        who = truth_child(r, truth)
        if who is None:
            k = "named" if r["named"] else "unsure"
            unl[k] += 1
            unl[k + "_s"] += d
            continue
        k = "unsure" if not r["named"] else ("right" if r["named"] == who else "wrong")
        for x in (per.setdefault(who, blank()), tot):
            x[k] += 1
            x[k + "_s"] += d
    named = tot["right"] + tot["wrong"]
    tot["wrong_among_named_pct"] = round(100 * tot["wrong"] / named, 1) if named else None
    ns = tot["right_s"] + tot["wrong_s"]
    tot["wrong_among_named_s_pct"] = round(100 * tot["wrong_s"] / ns, 1) if ns else None
    return {"children": per, "total": tot, "unlabelled": unl}


def format_score(sc: dict) -> list[str]:
    out = [f"{'child':38} {'right':>6} {'wrong':>6} {'unsure':>7} {'right s':>8} {'wrong s':>8} {'unsure s':>9}"]
    for sid, d in sorted(sc["children"].items()):
        out.append(f"{sid:38} {d['right']:6d} {d['wrong']:6d} {d['unsure']:7d} {d['right_s']:8.1f} {d['wrong_s']:8.1f} "
                   f"{d['unsure_s']:9.1f}")
    t = sc["total"]
    out.append(f"{'all':38} {t['right']:6d} {t['wrong']:6d} {t['unsure']:7d} {t['right_s']:8.1f} {t['wrong_s']:8.1f} "
               f"{t['unsure_s']:9.1f}")
    w, ws = t["wrong_among_named_pct"], t["wrong_among_named_s_pct"]
    out.append(f"wrong among named: {'-' if w is None else w} % of segments, {'-' if ws is None else ws} % of seconds "
               f"(target < 5 %){'  ** OVER TARGET **' if ws is not None and ws >= 5 else ''}")
    u = sc["unlabelled"]
    out.append(f"no truth there: {u['named']} named ({u['named_s']:.0f} s), {u['unsure']} unsure ({u['unsure_s']:.0f} s)")
    return out


def precision_rows(results: list[dict], truth: list[dict]) -> list[dict]:
    """replay's results as voice_admin.precision_report rows: one per (segment, model), truth from the labels."""
    out = []
    for i, r in enumerate(results):
        who = truth_child(r, truth)
        if who is None:
            continue
        for model, g in (r.get("guesses") or {}).items():
            out.append({"rid": "replay", "g": f"S{i}", "i": i, "model": model, "answer": "child", "student": who,
                        "best": g.get("best"), "score": g.get("score"), "second": g.get("second"),
                        "sec": round(r["e"] - r["a"], 2), "blind": False})
    return out


def taps_as_truth(marks: list[dict], duration_s: float) -> list[dict]:
    import voice
    return [{"from": a, "to": b, "child": sid} for sid, a, b in voice.tap_turns(marks, duration_s, None)]


# ------------------------------------------------------------------ the engine on arrays
def run_engine(room: np.ndarray, teacher: np.ndarray | None, mics: dict[str, np.ndarray], embedders: dict, prints: dict,
               seats: attribute.Seats, roster, meta: dict | None = None, log=print) -> dict:
    t0 = time.time()
    n = len(room)
    aligned, fits = {}, {}
    for m, x in sorted(mics.items()):
        f = align.align_track(m, room, x, SR, (meta or {}).get(m))
        fits[m] = f
        if f.ok:
            aligned[m] = align.apply(x, SR, f, n)[0]
    t_align = time.time() - t0
    for m, f in fits.items():
        log(f"  {m}: {'ok' if f.ok else 'REJECTED ' + str(f.reason)}  offset {f.offset_s}  drift {f.drift_ppm} ppm  "
            f"residual {f.residual_ms} ms  windows {f.inliers}/{f.windows}  {f.method}")
    if not aligned:
        return {"results": [], "fits": fits, "timing": {"align": round(t_align)}}
    tracks = {"room": room, **aligned}
    if teacher is not None:
        tracks["teacher"] = teacher[:n] if len(teacher) >= n else np.concatenate([teacher, np.zeros(n - len(teacher), np.float32)])
    t1 = time.time()
    act = segments.activity(tracks)
    segs = segments.child_segments(act)
    tsp = segments.teacher_segments(act)
    t_seg = time.time() - t1
    t2 = time.time()
    results = attribute.attribute(segs, aligned, embedders, prints, seats, roster)
    t_att = time.time() - t2
    return {"results": results, "fits": fits, "act": act, "teacher_spans": tsp,
            "timing": {"align": round(t_align), "segments": round(t_seg), "attribute": round(t_att)},
            "speaking": attribute.speaking_seconds(results, tsp),
            "map_suggestions": attribute.map_suggestions(results, seats)}


def load_embedders() -> dict:
    import embedders
    import voice
    shown = voice.SETTINGS["shown_model"]
    names = list(voice.SETTINGS["models"]) if voice.SETTINGS["models"] else list(embedders.available())
    out = {}
    for nm in [shown] + [x for x in names if x != shown]:
        try:
            out[nm] = embedders.load(nm)
        except Exception as e:  # noqa: BLE001
            if nm == shown:
                raise
            print(f"  model {nm} not loaded: {type(e).__name__}")
    return out


def _read_any(p: Path) -> np.ndarray:
    import audio
    x, sr = audio.decode(p.read_bytes())
    return audio.resample(x, sr)


def _find(folder: Path, stem: str) -> Path | None:
    for p in sorted(folder.glob(stem + ".*")):
        return p
    return None


# ------------------------------------------------------------------ the server's copy
def download_recording(api, rid: str, folder: Path) -> tuple[dict, np.ndarray, np.ndarray | None, dict, list]:
    import hashlib

    import audio
    import plan
    rows = [r for r in (api.rpc("lesson_monitor_pending", {"p_limit": 200}) or []) if r["recording_id"] == rid]
    rec = rows[0] if rows else (api.select("class_recordings", {"id": f"eq.{rid}", "select": "*"}) or [None])[0]
    if not rec:
        raise SystemExit("recording not found (or not one you may listen to)")
    b = api.rpc("lesson_monitor_begin", {"p_recording": rid})
    if not b or not b.get("ok"):
        raise SystemExit(f"refused: {(b or {}).get('reason', 'refused')}")
    chunks = api.select("class_recording_chunks", {"recording_id": f"eq.{rid}", "select": "track,seq,storage_path,byte_size,"
                                                   "sha256,t_start_ms,t_end_ms,confirmed_at", "order": "track.asc,seq.asc"})
    by: dict[str, list] = {}
    for c in chunks:
        by.setdefault(c["track"], []).append(c)
    window = plan.lesson_window(rec)
    out = {}
    for track, cs in sorted(by.items()):
        w = window if track in ("room", "teacher") else (0.0, 1e9)
        j = audio.TrackJoiner(w, pc.out(folder / f"{track}.wav"))
        for c in sorted(cs, key=lambda c: int(c["seq"])):
            data = api.download(c["storage_path"])
            if len(data) != int(c["byte_size"]) or hashlib.sha256(data).hexdigest() != c["sha256"]:
                raise SystemExit("chunk_hash_mismatch")
            j.add(data, int(c["t_start_ms"]))
        j.close()
        out[track] = _read_any(folder / f"{track}.wav")
    marks = api.select("lesson_speaker_marks", {"session_id": f"eq.{rec.get('session_id')}", "recording_id": f"eq.{rid}",
                                                "select": "kind,student_ids,offset_ms", "order": "at.asc"}) or []
    marks = [{"kind": m["kind"], "student_ids": m.get("student_ids") or [], "t_s": m["offset_ms"] / 1000.0 - window[0]}
             for m in marks if m.get("offset_ms") is not None]
    return rec, out.get("room"), out.get("teacher"), {m: out[m] for m in MICS if m in out}, marks


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("recording", nargs="?")
    ap.add_argument("--dir")
    ap.add_argument("--truth")
    ap.add_argument("--board")
    ap.add_argument("--token", action="store_true")
    a = ap.parse_args(argv)
    if bool(a.recording) == bool(a.dir):
        ap.error("give a recording id or --dir")
    import multimic
    import voice
    embs = load_embedders()
    truth = json.loads(Path(a.truth).read_text(encoding="utf-8")) if a.truth else None
    board = json.loads(Path(a.board).read_text(encoding="utf-8")) if a.board else []
    folder = None
    try:
        if a.dir:
            d = Path(a.dir)
            room = _read_any(_find(d, "room"))
            tp = _find(d, "teacher")
            teacher = _read_any(tp) if tp else None
            mics = {m: _read_any(p) for m in MICS if (p := _find(d, m))}
            allowed, roster, marks = None, None, []
            seats = attribute.Seats(board)
        else:
            pc.check_root()
            import supa
            api = supa.open_api(a.token)
            folder = pc.out(pc.audio_dir() / f"replay-{a.recording}")
            rec, room, teacher, mics, marks = download_recording(api, a.recording, folder)
            allowed = {r["student_id"] for r in (api.rpc("lesson_monitor_voiceprint_allowed") or [])}
            roster = multimic.roster(api, rec)
            import plan
            seats = multimic.seats_in_lesson(multimic.mic_map(api, rec), rec, plan.lesson_window(rec)) if not board \
                else attribute.Seats(board)
        # held out: the samples this lesson's own answers taught are left out of the voiceprints that score it
        prints = multimic.prints_for(list(embs), allowed if allowed is not None else _all_children(),
                                     voice.SETTINGS["enrol_min_s"], exclude_rid=a.recording)
        print(f"lesson {len(room) / SR / 60:.1f} min, {len(mics)} mic track(s), {sum(len(v) for v in prints.get(voice.SETTINGS['shown_model'], {}).values())} "
              f"voiceprint samples, models: {', '.join(embs)}")
        res = run_engine(room, teacher, mics, embs, prints, seats, roster)
        if truth is None:
            truth = taps_as_truth(marks, len(room) / SR)
            print(f"truth: {len(truth)} tapped turns from the speaking board")
        for ln in format_score(score(res["results"], truth)):
            print(ln)
        import voice_admin
        print("")
        for ln in voice_admin.format_precision(voice_admin.precision_report(precision_rows(res["results"], truth))):
            print(ln)
        if res.get("speaking"):
            print(f"speaking seconds: {json.dumps(res['speaking'])}")
        for sug in res.get("map_suggestions") or []:
            print(f"board correction: {sug['suggested']} sounds like mic {sug['mic']} ({sug['seconds']} s), board says {sug['board_mic']}")
        print(f"timing (s): {res['timing']}")
        return 0
    finally:
        if folder is not None:
            shutil.rmtree(folder, ignore_errors=True)
            left = pc.files_under(pc.audio_dir()) if pc.audio_dir().exists() else []
            print(f"audio copy deleted ({len([p for p in left if 'replay-' in str(p)])} replay files left)")


def _all_children() -> set[str]:
    import voiceprints
    return {vp.student_id for vp in voiceprints.load_every()}


if __name__ == "__main__":
    sys.exit(main())
