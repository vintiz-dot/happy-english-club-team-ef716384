"""Delete EVERYTHING derived from the recordings: the whole <root>\\work\\ folder.

That is the 16 kHz WAVs, manifests, splits, mixes, results, transcripts and
voiceprints. The source media in <root>\\videos and <root>\\lessons, the venv
and the model cache are NOT touched.

    python delete_all_derived.py            # asks for confirmation
    python delete_all_derived.py --yes
    python delete_all_derived.py --dry-run
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import WORK, inside_git_repo  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--work", type=Path, default=WORK)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    work = a.work.resolve()
    if work.name != "work" or inside_git_repo(work):
        sys.exit(f"refusing: {work} is not the evaluation work folder")
    if not work.exists():
        print("nothing to delete")
        return 0
    n = sum(1 for _ in work.rglob("*"))
    print(f"{'would delete' if a.dry_run else 'delete'} {work} ({n} entries)")
    if a.dry_run:
        return 0
    if not a.yes and input("Delete all derived data? type YES: ").strip() != "YES":
        print("aborted")
        return 1
    shutil.rmtree(work)
    print("deleted" if not work.exists() else "FAILED")
    return 0 if not work.exists() else 2


if __name__ == "__main__":
    sys.exit(main())
