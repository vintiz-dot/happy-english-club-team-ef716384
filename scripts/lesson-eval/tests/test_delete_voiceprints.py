"""delete_voiceprints.py removes every B2 biometric artefact and nothing else (synthetic files)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import delete_voiceprints  # noqa: E402


def test_deletes_all_b2_voiceprints_only(tmp_path, monkeypatch):
    work = tmp_path / "work"
    keep = [work / "b2" / "units.npz", work / "b2" / "ident" / "m__c.ident.csv", work / "teacher-check" / "L1" / "x.wav"]
    gone = [work / "voiceprints" / "S01.voiceprint.npy", work / "voiceprints" / "b2" / "ecapa.embeddings.npz",
            work / "voiceprints" / "b2" / "lessons" / "L1_c00.voiceprint.npy",
            work / "b2" / "stray.embeddings.npz", work / "elsewhere" / "S02.voiceprint.npy"]
    for p in keep + gone:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"x")
    monkeypatch.setattr(sys, "argv", ["delete_voiceprints.py", "--work", str(work), "--yes"])
    assert delete_voiceprints.main() == 0
    assert not any(p.exists() for p in gone)
    assert all(p.exists() for p in keep)
    assert delete_voiceprints.targets(work) == []
