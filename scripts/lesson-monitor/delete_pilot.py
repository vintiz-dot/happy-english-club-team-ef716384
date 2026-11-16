"""Delete EVERYTHING the lesson monitor pilot created, in one command.

  PY scripts\\lesson-monitor\\delete_pilot.py            # asks you to type YES, signs in as an admin
  PY scripts\\lesson-monitor\\delete_pilot.py --yes
  PY scripts\\lesson-monitor\\delete_pilot.py --local-only   # only this laptop's files (no sign-in)
  PY scripts\\lesson-monitor\\delete_pilot.py --consents     # also the monitor consent records
  PY scripts\\lesson-monitor\\delete_pilot.py --dry-run

1. In the app (admin): lesson_monitor_delete_everything - every report (the
   transcripts), target words, run records and class switches; with
   --consents, the monitor consent records too. The audit log keeps ids and
   counts only and is not deleted.
2. On this laptop: everything under pilot\\ (audio copies, drafts, step 0
   samples and sheets, logs). Then the folder is LISTED again and the count of
   files left is printed; it must be 0.
3. The kill switch (pilot\\STOP) is left ON afterwards, so nothing starts again
   by accident.

It never touches the recorder's own recordings (they follow the recorder's
30-day retention), the evaluation data under hec-audio-eval\\work, the
lessons\\ or videos\\ folders, or anything in the repo. Prints counts, never content.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402

CONFIRM = "DELETE ALL PILOT DATA"


def local_targets(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(p for p in root.iterdir() if p.name != "STOP")


def delete_local(root: Path) -> tuple[int, int]:
    """Remove everything under the pilot folder except the kill switch; return (files removed, files left)."""
    if root.name.lower() != "pilot":
        raise SystemExit(f"REFUSED: {root} is not the pilot folder")
    before = len([p for p in pc.files_under(root) if p.name != "STOP"])
    for p in local_targets(root):
        shutil.rmtree(p, ignore_errors=True) if p.is_dir() else p.unlink(missing_ok=True)
    left = len([p for p in pc.files_under(root) if p.name != "STOP"])
    return before - left, left


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--local-only", action="store_true")
    ap.add_argument("--consents", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--token", action="store_true")
    a = ap.parse_args(argv)
    root = pc.check_root()
    files = [p for p in pc.files_under(root) if p.name != "STOP"]
    print(f"This laptop: {len(files)} files under {root}")
    print("In the app: " + ("not touched (--local-only)" if a.local_only else
                            "every pilot report, target word list, run record and class switch"
                            + (" and the monitor consent records" if a.consents else "")))
    if a.dry_run:
        return 0
    if not a.yes and input("Type YES to delete all of it: ").strip() != "YES":
        print("Cancelled; nothing deleted.")
        return 1
    rc = 0
    if not a.local_only:
        import supa
        api = supa.open_api(a.token)
        counts = api.rpc("lesson_monitor_delete_everything", {"p_confirm": CONFIRM, "p_consents": a.consents})
        print(f"app: deleted {counts}")
        if counts.get("left"):
            print("app: something is still there - check before going on")
            rc = 2
    removed, left = delete_local(root)
    from stop import switch_on_local
    switch_on_local("after delete_pilot.py")
    print(f"laptop: {removed} files deleted, {left} left (listing after deletion); kill switch left ON")
    return rc or (0 if left == 0 else 2)


if __name__ == "__main__":
    sys.exit(main())
