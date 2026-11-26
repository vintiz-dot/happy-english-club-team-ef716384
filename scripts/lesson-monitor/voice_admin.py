"""The owner's voiceprint commands (24 Nov 2026). Voiceprints live on this laptop only.

  PY scripts\\lesson-monitor\\voice_admin.py consent-all --class-id <id> --note "signed voiceprint lines, office folder M"
  PY scripts\\lesson-monitor\\voice_admin.py consent --student-id <id> --withdrawn --note "parent phoned 24 Nov"
  PY scripts\\lesson-monitor\\voice_admin.py list                       # who is known by voice, and how well
  PY scripts\\lesson-monitor\\voice_admin.py accuracy                   # every model scored against the teacher's answers
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


def build_snapshot(rows: list[dict], vps: dict, s: dict = voice.SETTINGS) -> dict:
    """What Admin > Voices shows from this laptop: each model's accuracy (counts and rates), each child's SECONDS of
    voice on file, and the settings. No voiceprint, no embedding, no audio, no name: the database refuses anything else."""
    return {
        "accuracy": accuracy(rows, s),
        "enrolment": [{"student_id": sid, "seconds": round(vp.seconds(), 1), "samples": len(vp.samples)}
                      for sid, vp in sorted(vps.items())],
        "settings": {"shown_model": s["shown_model"], "thresholds": dict(s["thresholds"]), "margin": s["margin"],
                     "group_min_s": s["group_min_s"], "enrol_min_s": s["enrol_min_s"],
                     "models": list(s["models"]) if s["models"] else None},
    }


def publish(api) -> dict:
    snap = build_snapshot(voiceprints.read_calibration(), voiceprints.load_all())
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
    sp.add_parser("accuracy")
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
        for ln in format_accuracy(accuracy(voiceprints.read_calibration())):
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
