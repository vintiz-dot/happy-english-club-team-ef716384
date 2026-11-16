"""The pilot's kill switch.

  PY scripts\\lesson-monitor\\stop.py on                       # this laptop: nothing downloads or runs
  PY scripts\\lesson-monitor\\stop.py on --class-id <uuid>     # also switch the class off in the app (signs in)
  PY scripts\\lesson-monitor\\stop.py off                      # remove the laptop switch only
  PY scripts\\lesson-monitor\\stop.py status

`on` creates pilot\\STOP. A job that is running notices it after the current
transcript segment (seconds) or chunk download, deletes its audio copy and
stops; no new job starts while the file is there. With --class-id it also
calls lesson_monitor_set_class(off) as the signed-in person (an admin or a
teacher of the class may: stopping never needs permission), so no report is
made for that class from any laptop until an admin switches it on again.
Victor can do the same from his Lesson reports screen ("Stop the pilot").

`off` only removes the laptop switch; it never switches a class back on
(that is the admin's pilot_admin.py switch-on, with the consent checks).
Stopping deletes nothing: delete_pilot.py does that.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402


def switch_on_local(reason: str = "") -> Path:
    f = pc.out(pc.stop_file())
    f.write_text(f"stopped {datetime.now().isoformat(timespec='seconds')} {reason[:100]}\n", encoding="utf-8")
    return f


def switch_off_local() -> bool:
    f = pc.stop_file()
    if f.exists():
        f.unlink()
        return True
    return False


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["on", "off", "status"])
    ap.add_argument("--class-id")
    ap.add_argument("--reason", default="")
    ap.add_argument("--token", action="store_true")
    a = ap.parse_args(argv)
    pc.check_root()
    if a.action == "status":
        print("kill switch ON (nothing runs on this laptop)" if pc.stopped() else "kill switch off")
        return 0
    if a.action == "off":
        print("kill switch removed" if switch_off_local() else "kill switch was not on")
        print("This does not switch any class back on; an admin does that with pilot_admin.py switch-on.")
        return 0
    switch_on_local(a.reason)
    print(f"kill switch ON: {pc.stop_file()}")
    if a.class_id:
        import supa
        api = supa.open_api(a.token)
        api.rpc("lesson_monitor_set_class", {"p_class": a.class_id, "p_enabled": False,
                                             "p_consent_note": a.reason or "stopped from the laptop"})
        print("the class is switched off in the app")
    return 0


if __name__ == "__main__":
    sys.exit(main())
