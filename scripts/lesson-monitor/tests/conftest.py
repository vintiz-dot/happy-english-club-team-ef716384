"""Every test gets its own pilot folder outside the repo (pytest's tmp_path)."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(autouse=True)
def pilot_root(tmp_path, monkeypatch):
    root = tmp_path / "pilot"
    monkeypatch.setenv("HEC_PILOT_ROOT", str(root))
    return root
