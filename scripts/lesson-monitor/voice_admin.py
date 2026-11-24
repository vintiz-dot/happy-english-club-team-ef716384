"""The owner's voiceprint commands (24 Nov 2026). Voiceprints live on this laptop only.

  PY scripts\\lesson-monitor\\voice_admin.py consent-all --class-id <id> --note "signed voiceprint lines, office folder M"
  PY scripts\\lesson-monitor\\voice_admin.py consent --student-id <id> --withdrawn --note "parent phoned 24 Nov"
  PY scripts\\lesson-monitor\\voice_admin.py list                       # who is known by voice, and how well
  PY scripts\\lesson-monitor\\voice_admin.py accuracy                   # the teacher's answers against the suggestions
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


def accuracy(rows: list[dict]) -> dict:
    """Pure: of the suggestions the teacher answered, how many named the child the teacher named."""
    answered = [r for r in rows if r.get("answer") is not None]
    agreed = sum(1 for r in answered if r.get("agreed"))
    wrong_child = sum(1 for r in answered if r.get("answer") == "child" and not r.get("agreed"))
    not_one = sum(1 for r in answered if r.get("answer") in ("several", "teacher", "unknown"))
    return {"suggestions_answered": len(answered), "agreed": agreed, "another_child": wrong_child,
            "not_one_child": not_one, "agreed_pct": round(100 * agreed / len(answered), 1) if answered else None}


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
    d = sp.add_parser("delete")
    who = d.add_mutually_exclusive_group(required=True)
    who.add_argument("--student-id")
    who.add_argument("--all", action="store_true")
    d.add_argument("--yes", action="store_true")
    for p in (ca, c1, ls):
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
        print(accuracy(voiceprints.read_calibration()))
        print(f"thresholds now: group {voice.SETTINGS['group_threshold']}, margin {voice.SETTINGS['margin']}, "
              f"at least {voice.SETTINGS['group_min_s']} s")
        return 0

    import supa
    api = supa.open_api(getattr(a, "token", False))
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
