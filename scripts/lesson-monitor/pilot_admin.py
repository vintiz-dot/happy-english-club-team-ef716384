"""The owner's pilot commands (signs in as an admin; the SQL editor cannot: it has no signed-in user).

  PY scripts\\lesson-monitor\\pilot_admin.py find --class Venus --teacher Victor
  PY scripts\\lesson-monitor\\pilot_admin.py consent-all --class-id <id> --note "signed monitor lines, office folder M"
  PY scripts\\lesson-monitor\\pilot_admin.py consent --student-id <id> --withdrawn --note "parent phoned 21 Nov"
  PY scripts\\lesson-monitor\\pilot_admin.py switch-on --class-id <id> --teacher-id <id> --note "office folder M"
  PY scripts\\lesson-monitor\\pilot_admin.py switch-off --class-id <id> [--reason ...]
  PY scripts\\lesson-monitor\\pilot_admin.py status

`consent-all` records the monitor consent as GRANTED for every child enrolled
in the class today - only when you hold the signed monitor lines for every one
of them. It prints the number of children, never their names, and asks YES.
A child's withdrawal (`consent --withdrawn`) switches the class off and deletes
its reports at once. The student id is the last part of the child's page
address in the app (/students/<id>).

`status` is for the stop rules (design s.12): reports made, opened, the
teacher's median reading minutes, and per pilot week whether she said she used
anything. No report content is shown: the admin cannot read it.
"""
from __future__ import annotations

import argparse
import statistics
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402

MEDIAN_MINUTES_STOP = 15
WEEKS_USED_NOTHING_STOP = 2


def stop_rules(rows: list[dict], starts_on: date) -> dict:
    """Pure: the design's two stop rules over the admin status rows."""
    mins = [int(r["reading_minutes"]) for r in rows if r.get("reading_minutes") is not None]
    median = statistics.median(mins) if mins else None
    weeks: dict[int, list[str]] = {}
    for r in rows:
        if r.get("used_something") is None:
            continue
        wk = (date.fromisoformat(r["session_date"]) - starts_on).days // 7 + 1
        weeks.setdefault(wk, []).append(r["used_something"])
    nothing = sorted(w for w, u in weeks.items() if "yes" not in u)
    reasons = []
    if median is not None and median > MEDIAN_MINUTES_STOP:
        reasons.append(f"median reading time {median} min is over {MEDIAN_MINUTES_STOP}")
    if len(nothing) >= WEEKS_USED_NOTHING_STOP:
        reasons.append(f"she used nothing in weeks {nothing}")
    return {"reports": len(rows), "opened": sum(1 for r in rows if r.get("first_opened_at")),
            "with_minutes": len(mins), "median_minutes": median, "weeks_used_nothing": nothing,
            "stop": bool(reasons), "reasons": reasons}


def _confirm(text: str, yes: bool) -> bool:
    return yes or input(f"{text} Type YES: ").strip() == "YES"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    f = sp.add_parser("find")
    f.add_argument("--class", dest="cls", required=True)
    f.add_argument("--teacher", required=True)
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
    on = sp.add_parser("switch-on")
    on.add_argument("--class-id", required=True)
    on.add_argument("--teacher-id", required=True)
    on.add_argument("--note", required=True, help="where the signed monitor lines are kept")
    on.add_argument("--days", type=int, default=28)
    off = sp.add_parser("switch-off")
    off.add_argument("--class-id", required=True)
    off.add_argument("--reason", default="stopped by the owner")
    sp.add_parser("status")
    for p in (f, ca, c1, on, off):
        p.add_argument("--token", action="store_true")
    a = ap.parse_args(argv)

    import supa
    api = supa.open_api(getattr(a, "token", False))
    if a.cmd == "find":
        for r in api.select("classes", {"name": f"ilike.*{a.cls}*", "select": "id,name,is_active"}):
            print(f"class   {r['id']}  {r['name']}{'' if r.get('is_active', True) else ' (inactive)'}")
        for r in api.select("teachers", {"full_name": f"ilike.*{a.teacher}*", "select": "id,full_name,is_active"}):
            print(f"teacher {r['id']}  {r['full_name']}{'' if r.get('is_active', True) else ' (archived)'}")
        return 0
    if a.cmd == "consent-all":
        today = date.today().isoformat()
        rows = api.select("enrollments", {"class_id": f"eq.{a.class_id}", "start_date": f"lte.{today}",
                                          "or": f"(end_date.is.null,end_date.gte.{today})", "select": "student_id"})
        ids = sorted({r["student_id"] for r in rows})
        if not ids or not _confirm(f"{len(ids)} children are enrolled today. You hold signed monitor lines for ALL of them?", a.yes):
            print("nothing recorded")
            return 1
        for sid in ids:
            api.rpc("lesson_monitor_record_child_consent", {"p_student": sid, "p_status": "granted", "p_note": a.note})
        print(f"monitor consent recorded as granted for {len(ids)} children")
        print(f"children still without it: {api.rpc('lesson_monitor_class_missing_consent', {'p_class': a.class_id})}")
        return 0
    if a.cmd == "consent":
        res = api.rpc("lesson_monitor_record_child_consent", {"p_student": a.student_id,
                                                              "p_status": "granted" if a.granted else "withdrawn", "p_note": a.note})
        print(f"recorded; {res}")
        return 0
    if a.cmd == "switch-on":
        version = api.select("lesson_monitor_settings", {"select": "consent_wording_version"})[0]["consent_wording_version"]
        api.rpc("lesson_monitor_set_class", {"p_class": a.class_id, "p_enabled": True, "p_wording_version": version,
                                             "p_consent_note": a.note, "p_days": a.days, "p_teacher": a.teacher_id})
        print(f"the lesson monitor is ON for that class for {a.days} days (wording {version})")
        return 0
    if a.cmd == "switch-off":
        api.rpc("lesson_monitor_set_class", {"p_class": a.class_id, "p_enabled": False, "p_consent_note": a.reason})
        print("switched off")
        return 0
    rows = api.rpc("lesson_monitor_admin_status") or []
    classes = api.select("lesson_monitor_classes", {"select": "class_id,enabled,starts_on,ends_on,stop_reason"})
    for c in classes:
        mine = [r for r in rows if r["class_id"] == c["class_id"]]
        start = date.fromisoformat(c["starts_on"]) if c.get("starts_on") else date.today()
        print(f"class {c['class_id']}: {'ON' if c['enabled'] else 'off'} {c.get('starts_on')}..{c.get('ends_on')} "
              f"{'(' + c['stop_reason'] + ')' if c.get('stop_reason') else ''}")
        print(f"  {stop_rules(mine, start)}")
    runs = api.select("lesson_monitor_runs", {"select": "outcome,reason"})
    tally: dict[str, int] = {}
    for r in runs:
        k = r["outcome"] + (f":{r['reason']}" if r.get("reason") else "")
        tally[k] = tally.get(k, 0) + 1
    print(f"runs: {tally}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
