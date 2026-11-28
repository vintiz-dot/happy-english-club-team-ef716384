"""The owner's voiceprint commands (24 Nov 2026). Voiceprints live on this laptop only.

  PY scripts\\lesson-monitor\\voice_admin.py consent-all --class-id <id> --note "signed voiceprint lines, office folder M"
  PY scripts\\lesson-monitor\\voice_admin.py consent --student-id <id> --withdrawn --note "parent phoned 24 Nov"
  PY scripts\\lesson-monitor\\voice_admin.py list                       # who is known by voice, and how well
  PY scripts\\lesson-monitor\\voice_admin.py accuracy                   # every model scored against the teacher's answers
  PY scripts\\lesson-monitor\\voice_admin.py accuracy --engine lark       # the Lark-mic engine (28 Nov 2026) on its own
  PY scripts\\lesson-monitor\\voice_admin.py delete --student-id <id>   # one child's voiceprint and pending groups
  PY scripts\\lesson-monitor\\voice_admin.py delete --all --yes         # every voiceprint on this laptop

`consent-all` records the VOICEPRINT consent (separate from the monitor consent) as granted
for every child enrolled in the class today - only when you hold that signed line for every
one of them. It prints a count, never names, and asks YES. A withdrawal clears the child from
every suggestion at once; the child's voiceprint is deleted on the overnight job's next start,
or now with `delete --student-id`.

Enrolment: in a recorded lesson, tap one child on "Who's speaking" and let them talk for about
a minute (introduce themselves, read a page), then tap the next child. The overnight job learns
each tapped turn of a child with voiceprint consent. `list` shows who has enough voice (20 s
before the child is compared with at all; a minute or more is better).
"""
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402
import voice  # noqa: E402
import voiceprints  # noqa: E402


SWEEP = (0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85)


def _rows_by_model(rows: list[dict]) -> dict[str, list[dict]]:
    """Calibration rows, one per (recording, group, model): a changed answer replaces the earlier one. Rows written
    before several models ran (no "model") are the ECAPA suggestion the teacher was shown."""
    last: dict[tuple, dict] = {}
    for r in rows:
        r = dict(r)
        r.setdefault("model", "ecapa")
        if "best" not in r:
            r["best"], r["shown"], r["blind"], r["second"] = r.get("suggested"), True, False, None
        last[(r.get("rid"), r.get("g"), r["model"])] = r
    out: dict[str, list[dict]] = {}
    for r in last.values():
        out.setdefault(r["model"], []).append(r)
    return out


def _named(r: dict, thr: float, margin: float) -> bool:
    return r.get("score") is not None and voice.would_name(float(r["score"]), r.get("second"), thr, margin)


def _pct(n: int, total: int):
    return round(100 * n / total, 1) if total else None


def accuracy(rows: list[dict], s: dict = voice.SETTINGS) -> dict:
    """Pure. Per model, over the groups the teacher answered as ONE child (and that were long enough to name):
    at that model's threshold, how many it would have named correctly, named as the wrong child, or left unnamed,
    plus a sweep over thresholds, and for the shown model the teacher's answers to shown guesses against blind ones.
    {model: {"n", "named_correct", "named_wrong", "not_sure", the three as "_pct", "threshold", "sweep": [...]}}"""
    margin = s["margin"]
    out = {}
    for model, rs in _rows_by_model(rows).items():
        ones = [r for r in rs if r.get("answer") == "child" and r.get("student")
                and r.get("score") is not None and (r.get("sec") is None or r["sec"] >= s["group_min_s"])]
        thr = voice.threshold_for(model, s)
        right = sum(1 for r in ones if _named(r, thr, margin) and r["best"] == r["student"])
        wrong = sum(1 for r in ones if _named(r, thr, margin) and r["best"] != r["student"])
        n = len(ones)
        sweep = []
        for t in SWEEP:
            named = [r for r in ones if _named(r, t, margin)]
            bad = sum(1 for r in named if r["best"] != r["student"])
            sweep.append({"threshold": t, "named": len(named), "wrong": bad})
        d = {"n": n, "threshold": thr, "named_correct": right, "named_wrong": wrong, "not_sure": n - right - wrong,
             "named_correct_pct": _pct(right, n), "named_wrong_pct": _pct(wrong, n), "not_sure_pct": _pct(n - right - wrong, n),
             "sweep": sweep}
        if model == s["shown_model"]:
            split = {}
            for label, picked in (("shown", [r for r in ones if r.get("shown")]), ("blind", [r for r in ones if r.get("blind")])):
                ok = sum(1 for r in picked if r["best"] == r["student"])
                split[label] = {"n": len(picked), "agreed": ok, "agreed_pct": _pct(ok, len(picked))}
            d["shown_vs_blind"] = split
        out[model] = d
    return out


def engine_rows(rows: list[dict], marks: dict, engine: str) -> list[dict]:
    """The calibration rows of one engine: "lark" = recordings multimic.py made (its enrolment groups left out: a tap
    suggested them, not a voice), "old" = every other recording, "all" = everything."""
    if engine == "all":
        return rows
    lark = {rid for rid, m in marks.items() if str(m.get("engine", "")).startswith("lark")}
    enrol = {(rid, k) for rid, m in marks.items() for k in m.get("enrol") or []}
    if engine == "lark":
        return [r for r in rows if r.get("rid") in lark and (r.get("rid"), r.get("g")) not in enrol]
    return [r for r in rows if r.get("rid") not in lark]


def accuracy_shown(rows: list[dict], s: dict = voice.SETTINGS) -> dict:
    """Pure. What the teacher was SHOWN against what they answered, for the shown model, in groups and seconds:
    named-and-right, named-and-wrong, unsure (a child the teacher named that got no suggestion), per child and in all.
    Blind groups count as unsure (nothing was shown). The Lark engine names per segment, so its groups are judged by
    what they suggested, not by re-applying the old group threshold. Target: under 5 % wrong among named."""
    shown_model = s["shown_model"]
    last: dict[tuple, dict] = {}
    for r in rows:
        if r.get("model", "ecapa") == shown_model:
            last[(r.get("rid"), r.get("g"))] = r
    per: dict[str, dict] = {}
    tot = {"right": 0, "wrong": 0, "unsure": 0, "right_s": 0.0, "wrong_s": 0.0, "unsure_s": 0.0}
    for r in last.values():
        if r.get("answer") != "child" or not r.get("student"):
            continue
        kid = per.setdefault(r["student"], {"right": 0, "wrong": 0, "unsure": 0, "right_s": 0.0, "wrong_s": 0.0,
                                            "unsure_s": 0.0})
        sec = float(r.get("sec") or 0.0)
        k = "unsure" if not r.get("shown") else ("right" if r.get("best") == r["student"] else "wrong")
        for d in (kid, tot):
            d[k] += 1
            d[k + "_s"] += sec
    named = tot["right"] + tot["wrong"]
    tot["wrong_among_named_pct"] = _pct(tot["wrong"], named)
    named_s = tot["right_s"] + tot["wrong_s"]
    tot["wrong_among_named_s_pct"] = round(100 * tot["wrong_s"] / named_s, 1) if named_s else None
    return {"children": per, "total": tot}


def format_shown(res: dict) -> list[str]:
    t = res["total"]
    lines = [f"{'child':38} {'right':>6} {'wrong':>6} {'unsure':>7} {'right s':>8} {'wrong s':>8} {'unsure s':>9}"]
    for sid, d in sorted(res["children"].items()):
        lines.append(f"{sid:38} {d['right']:6d} {d['wrong']:6d} {d['unsure']:7d} {d['right_s']:8.0f} {d['wrong_s']:8.0f} "
                     f"{d['unsure_s']:9.0f}")
    lines.append(f"{'all':38} {t['right']:6d} {t['wrong']:6d} {t['unsure']:7d} {t['right_s']:8.0f} {t['wrong_s']:8.0f} "
                 f"{t['unsure_s']:9.0f}")
    w = t["wrong_among_named_pct"]
    lines.append(f"wrong among named: {'-' if w is None else w} % of groups, "
                 f"{'-' if t['wrong_among_named_s_pct'] is None else t['wrong_among_named_s_pct']} % of seconds (target < 5 %)")
    return lines


# ------------------------------------------------------------------ precision first (owner, 28 Nov 2026)
BUCKETS = ((0.0, 1.2, "<1.2 s"), (1.2, 3.0, "1.2-3 s"), (3.0, 8.0, "3-8 s"), (8.0, float("inf"), ">8 s"))
MIN_PRECISION = 0.98          # a model and threshold are chosen for coverage only while wrong <= 2 % of those named
PRECISION_SWEEP = tuple(round(0.40 + 0.02 * i, 2) for i in range(26))
BLIND_ENOUGH = 30             # blind groups needed before the figures use only the blind answers


def _named_at(r: dict, thr: float, margin: float, short_s: float) -> bool:
    if r.get("score") is None or float(r.get("sec") or 0) < short_s:
        return False
    sc, sec = float(r["score"]), r.get("second")
    return sc >= thr and (sc - float(sec) >= margin if sec is not None else sc >= thr + margin)


def _tally(rows: list[dict], thr: float, margin: float, short_s: float) -> dict:
    tot = sum(float(r.get("sec") or 0) for r in rows)
    right = sum(float(r["sec"]) for r in rows if _named_at(r, thr, margin, short_s) and r["best"] == r["student"])
    wrong = sum(float(r["sec"]) for r in rows if _named_at(r, thr, margin, short_s) and r["best"] != r["student"])
    named = right + wrong
    return {"seconds": round(tot, 1), "named_s": round(named, 1), "right_s": round(right, 1), "wrong_s": round(wrong, 1),
            "precision": round(right / named, 4) if named else None, "coverage": round(named / tot, 4) if tot else None,
            "wrong_share": round(wrong / tot, 4) if tot else None}


def precision_report(rows: list[dict], min_precision: float = MIN_PRECISION, margin: float | None = None,
                     short_s: float | None = None) -> dict:
    """Pure. rows: one per (segment, model) with the teacher's answer as truth (multimic.read_segment_calibration, or
    replay.py's). Only segments answered as ONE child count. For each model: precision of what it would name, wrong
    seconds as a share of ALL child speech, coverage by seconds, over a threshold sweep; the threshold with the most
    coverage while precision >= min_precision; and at that threshold the figures by duration bucket and per child.
    Uses only the blind groups' answers when there are BLIND_ENOUGH of them (the suggestion cannot lead the teacher
    there), else all, and says which ("basis")."""
    import attribute
    margin = attribute.SETTINGS["class_margin"] if margin is None else margin
    short_s = attribute.SETTINGS["short_s"] if short_s is None else short_s
    ones = [r for r in rows if r.get("answer") == "child" and r.get("student") and r.get("sec") is not None]
    blind_groups = {(r.get("rid"), r.get("g")) for r in ones if r.get("blind")}
    basis = "blind" if len(blind_groups) >= BLIND_ENOUGH else "all"
    if basis == "blind":
        ones = [r for r in ones if r.get("blind")]
    out = {"basis": basis, "blind_groups": len(blind_groups), "min_precision": min_precision, "models": {}}
    by_model: dict[str, list] = {}
    for r in ones:
        by_model.setdefault(r.get("model", "ecapa"), []).append(r)
    for model, rs in sorted(by_model.items()):
        sweep = [dict(_tally(rs, t, margin, short_s), threshold=t) for t in PRECISION_SWEEP]
        ok = [p for p in sweep if p["precision"] is not None and p["precision"] >= min_precision and p["named_s"] >= 60]
        pick = max(ok, key=lambda p: (p["coverage"] or 0, -p["threshold"])) if ok else None
        thr = pick["threshold"] if pick else None
        d = {"segments": len(rs), "chosen": pick, "sweep": sweep}
        if thr is not None:
            d["buckets"] = {lab: _tally([r for r in rs if lo <= float(r["sec"]) < hi], thr, margin, short_s)
                            for lo, hi, lab in BUCKETS}
            kids: dict[str, list] = {}
            for r in rs:
                kids.setdefault(r["student"], []).append(r)
            d["children"] = {k: _tally(v, thr, margin, short_s) for k, v in sorted(kids.items())}
        out["models"][model] = d
    ranked = [(m, d["chosen"]) for m, d in out["models"].items() if d["chosen"]]
    out["best"] = max(ranked, key=lambda x: x[1]["coverage"] or 0)[0] if ranked else None
    return out


def format_precision(rep: dict) -> list[str]:
    f = lambda x: "-" if x is None else f"{100 * x:.1f}"  # noqa: E731
    lines = [f"precision first: wrong <= {100 * (1 - rep['min_precision']):.0f} % of what is named; answers used: "
             f"{rep['basis']} ({rep['blind_groups']} blind groups)"]
    lines.append(f"{'model':22} {'thr':>5} {'precision %':>11} {'coverage %':>10} {'wrong/all %':>11} {'named s':>8}")
    for m, d in rep["models"].items():
        c = d["chosen"]
        if c is None:
            lines.append(f"{m:22} {'-':>5} {'(no threshold reaches the target with 60 s named)':>40}")
            continue
        lines.append(f"{m:22} {c['threshold']:5.2f} {f(c['precision']):>11} {f(c['coverage']):>10} {f(c['wrong_share']):>11} "
                     f"{c['named_s']:8.0f}")
    for m, d in rep["models"].items():
        if not d.get("buckets"):
            continue
        lines.append("")
        lines.append(f"{m} at {d['chosen']['threshold']:.2f}, by length: " + "; ".join(
            f"{lab}: prec {f(b['precision'])} cov {f(b['coverage'])} of {b['seconds']:.0f} s" for lab, b in d["buckets"].items()))
        for k, b in d["children"].items():
            lines.append(f"  {k}: prec {f(b['precision'])} %, coverage {f(b['coverage'])} % of {b['seconds']:.0f} s")
    lines.append(f"best: {rep['best'] or 'none yet'}")
    return lines


def format_accuracy(res: dict) -> list[str]:
    if not res:
        return ["no answered groups with scores yet"]
    lines = [f"{'model':22} {'groups':>6} {'thr':>6} {'right %':>8} {'wrong %':>8} {'not sure %':>10}"]
    for m, d in sorted(res.items()):
        f = lambda x: "-" if x is None else f"{x:.1f}"  # noqa: E731
        lines.append(f"{m:22} {d['n']:6d} {d['threshold']:6.3f} {f(d['named_correct_pct']):>8} {f(d['named_wrong_pct']):>8} "
                     f"{f(d['not_sure_pct']):>10}")
    for m, d in sorted(res.items()):
        lines.append("")
        lines.append(f"{m}: threshold sweep (named / of those the wrong child)" + ("  [shown model]" if "shown_vs_blind" in d else ""))
        lines.append("  " + "   ".join(f"{x['threshold']:.2f}: {x['named']}/{x['wrong']}" for x in d["sweep"]))
        if "shown_vs_blind" in d:
            for label, v in d["shown_vs_blind"].items():
                lines.append(f"  answers to {label} guesses: {v['n']} groups, teacher agreed {v['agreed']} ({f(v['agreed_pct'])} %)")
    return lines


def health(marks: dict, seg_rows: list[dict], last_n: int = 10) -> dict:
    """Admin > Voices' health part (owner, 28 Nov 2026): the engine, its last run, per recent lesson the mic tracks
    seen, each track's alignment residual and the processing time, and the shown model's precision by duration
    bucket. Dates, track names and numbers only: no child, no name, no audio."""
    import multimic
    lessons = sorted((m for m in marks.values() if m.get("at")), key=lambda m: m["at"], reverse=True)[:last_n]
    rep = precision_report(seg_rows)
    shown = voice.SETTINGS["shown_model"]
    m = rep["models"].get(shown) or {}
    return {"engine": multimic.ENGINE, "last_run": lessons[0]["at"] if lessons else None,
            "lessons": [{"date": x.get("date"), "at": x.get("at"), "tracks": x.get("tracks") or [],
                         "residual_ms": x.get("residual_ms") or {}, "rejected": x.get("rejected") or {},
                         "processing_s": sum(v for v in (x.get("timing_s") or {}).values() if isinstance(v, (int, float)))}
                        for x in lessons],
            "precision": {"basis": rep["basis"], "model": shown, "chosen": m.get("chosen"), "buckets": m.get("buckets") or {},
                          "best": rep["best"], "min_precision": rep["min_precision"]}}


def build_snapshot(rows: list[dict], vps: dict, s: dict = voice.SETTINGS, marks: dict | None = None,
                   seg_rows: list[dict] | None = None) -> dict:
    """What Admin > Voices shows from this laptop: each model's accuracy (counts and rates), each child's SECONDS of
    voice on file, the settings, and (with marks) the Lark engine's health. No voiceprint, no embedding, no audio, no
    name: the database refuses anything else."""
    out = {
        "accuracy": accuracy(rows, s),
        "enrolment": [{"student_id": sid, "seconds": round(vp.seconds(), 1), "samples": len(vp.samples)}
                      for sid, vp in sorted(vps.items())],
        "settings": {"shown_model": s["shown_model"], "thresholds": dict(s["thresholds"]), "margin": s["margin"],
                     "group_min_s": s["group_min_s"], "enrol_min_s": s["enrol_min_s"],
                     "models": list(s["models"]) if s["models"] else None},
    }
    if marks:
        out["health"] = health(marks, seg_rows or [])
    return out


def publish(api) -> dict:
    """The snapshot, with the health part when the Lark engine has run here; a database without 20261128190000 refuses
    the health part, and then the snapshot goes without it, as before."""
    import multimic
    from supa import ApiError
    snap = build_snapshot(voiceprints.read_calibration(), voiceprints.load_all(), marks=multimic.engine_marks(),
                          seg_rows=multimic.read_segment_calibration())
    try:
        return api.rpc("lesson_monitor_publish_voice_stats", {"p_stats": snap})
    except ApiError as e:
        if "health" not in snap or "health" not in (e.message or ""):
            raise
        snap.pop("health")
        return api.rpc("lesson_monitor_publish_voice_stats", {"p_stats": snap})


def _confirm(text: str, yes: bool) -> bool:
    return yes or input(f"{text} Type YES: ").strip() == "YES"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    ca = sp.add_parser("consent-all")
    ca.add_argument("--class-id", required=True)
    ca.add_argument("--note", required=True)
    ca.add_argument("--yes", action="store_true")
    c1 = sp.add_parser("consent")
    c1.add_argument("--student-id", required=True)
    g = c1.add_mutually_exclusive_group(required=True)
    g.add_argument("--granted", action="store_true")
    g.add_argument("--withdrawn", action="store_true")
    c1.add_argument("--note", required=True)
    ls = sp.add_parser("list")
    acc = sp.add_parser("accuracy")
    acc.add_argument("--engine", choices=("all", "old", "lark"), default="all")
    pb = sp.add_parser("publish")
    d = sp.add_parser("delete")
    who = d.add_mutually_exclusive_group(required=True)
    who.add_argument("--student-id")
    who.add_argument("--all", action="store_true")
    d.add_argument("--yes", action="store_true")
    for p in (ca, c1, ls, pb):
        p.add_argument("--token", action="store_true")
    a = ap.parse_args(argv)
    pc.check_root()

    if a.cmd == "delete":
        if a.all:
            if not _confirm("Delete EVERY voiceprint and pending voice group on this laptop?", a.yes):
                print("nothing deleted")
                return 1
            n = voiceprints.delete_all()
            pc.log(f"voices: delete --all removed {n} files")
            print(f"deleted {n} files; {len(pc.files_under(voiceprints.vp_dir())) if voiceprints.vp_dir().exists() else 0} left")
            return 0
        gone = voiceprints.delete(a.student_id)
        print("deleted that child's voiceprint" if gone else "that child has no voiceprint here")
        pc.log(f"voices: one child's voiceprint deleted by hand ({'1' if gone else '0'} file)")
        return 0
    if a.cmd == "accuracy":
        import multimic
        rows = engine_rows(voiceprints.read_calibration(), multimic.engine_marks(), a.engine)
        print(f"engine: {a.engine}; {len(rows)} calibration rows")
        for ln in format_accuracy(accuracy(rows)):
            print(ln)
        print("")
        for ln in format_shown(accuracy_shown(rows)):
            print(ln)
        import multimic
        seg = multimic.read_segment_calibration()
        if a.engine == "old":
            seg = []
        print("")
        for ln in format_precision(precision_report(seg)):
            print(ln)
        print(f"\nshown model: {voice.SETTINGS['shown_model']}; thresholds now: {voice.SETTINGS['thresholds']}, "
              f"margin {voice.SETTINGS['margin']}, at least {voice.SETTINGS['group_min_s']} s")
        return 0

    import supa
    api = supa.open_api(getattr(a, "token", False))
    if a.cmd == "publish":
        res = publish(api)
        print(f"published to Admin > Voices (snapshot {res.get('id')})")
        return 0
    if a.cmd == "consent-all":
        today = date.today().isoformat()
        rows = api.select("enrollments", {"class_id": f"eq.{a.class_id}", "start_date": f"lte.{today}",
                                          "or": f"(end_date.is.null,end_date.gte.{today})", "select": "student_id"})
        ids = sorted({r["student_id"] for r in rows})
        if not ids or not _confirm(f"{len(ids)} children are enrolled today. You hold the signed VOICEPRINT line for ALL of them?", a.yes):
            print("nothing recorded")
            return 1
        for sid in ids:
            api.rpc("lesson_monitor_record_voiceprint_consent", {"p_student": sid, "p_status": "granted", "p_note": a.note})
        print(f"voiceprint consent recorded as granted for {len(ids)} children")
        return 0
    if a.cmd == "consent":
        res = api.rpc("lesson_monitor_record_voiceprint_consent", {"p_student": a.student_id,
                                                                   "p_status": "granted" if a.granted else "withdrawn", "p_note": a.note})
        if a.withdrawn and voiceprints.delete(a.student_id):
            print("that child's voiceprint on this laptop is deleted")
        print(f"recorded; {res}")
        return 0
    # list
    allowed = {r["student_id"] for r in (api.rpc("lesson_monitor_voiceprint_allowed") or [])}
    vps = voiceprints.load_all()
    names = {}
    ids = sorted(allowed | set(vps))
    for i in range(0, len(ids), 50):
        part = ids[i:i + 50]
        for r in api.select("students", {"id": f"in.({','.join(part)})", "select": "id,full_name"}):
            names[r["id"]] = r["full_name"]
    print(f"{'child':30} {'consent':8} {'voice s':>8} {'samples':>8}  compared?")
    for sid in sorted(ids, key=lambda x: names.get(x, x)):
        vp = vps.get(sid)
        secs = vp.seconds() if vp else 0.0
        print(f"{names.get(sid, sid)[:30]:30} {'yes' if sid in allowed else 'NO':8} {secs:8.0f} {len(vp.samples) if vp else 0:8}  "
              f"{'yes' if sid in allowed and secs >= voice.SETTINGS['enrol_min_s'] else 'not yet'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
