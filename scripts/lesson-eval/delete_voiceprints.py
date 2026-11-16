"""Delete ALL voice-enrolment artefacts (children's biometric data) in one command.

Removes everything under <root>\\work\\voiceprints\\ (embeddings, enrolment
lists, score caches; B2 adds voiceprints\\b2\\<model>.embeddings.npz for every
model and voiceprints\\b2\\lessons\\<L>_<cluster>.voiceprint.npy for lesson
clusters) and any *.voiceprint.* / *_embeddings.* / *.embeddings.* file
elsewhere under <root>\\work\\. Source media and other derived files (B2's
work\\b2\\units.npz audio cuts, work\\teacher-check\\ samples) are untouched;
use delete_all_derived.py for those.

    python delete_voiceprints.py            # asks for confirmation
    python delete_voiceprints.py --yes      # no prompt
    python delete_voiceprints.py --dry-run  # list only
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import WORK  # noqa: E402

PATTERNS = ["*.voiceprint.*", "*_embeddings.*", "*.embedding.*", "*.embeddings.*"]


def targets(work: Path) -> list[Path]:
    out = []
    vp = work / "voiceprints"
    if vp.exists():
        out.append(vp)
    for pat in PATTERNS:
        out += [p for p in work.rglob(pat) if vp not in p.parents]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--work", type=Path, default=WORK)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    work = a.work.resolve()
    if work.name != "work":
        sys.exit(f"refusing: {work} is not a 'work' folder")
    t = targets(work)
    if not t:
        print("nothing to delete")
        return 0
    for p in t:
        print(("would delete " if a.dry_run else "delete ") + str(p))
    if a.dry_run:
        return 0
    if not a.yes and input(f"Delete {len(t)} item(s)? type YES: ").strip() != "YES":
        print("aborted")
        return 1
    for p in t:
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    left = targets(work)
    print("deleted" if not left else f"FAILED, still present: {left}")
    return 0 if not left else 2


if __name__ == "__main__":
    sys.exit(main())
