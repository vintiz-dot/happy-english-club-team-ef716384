"""embedders.py: every installed speaker model loads and gives unit, repeatable vectors."""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import embedders as em  # noqa: E402


def test_available_lists_existing_files_ecapa_first():
    names = em.available()
    assert all(em._file(n).exists() for n in names)
    assert all(n in em.MODELS for n in names)
    if em._file("ecapa").exists():
        assert names[0] == "ecapa"


def test_unknown_and_missing():
    with pytest.raises(KeyError):
        em.load("nope")


@pytest.mark.parametrize("name", list(em.MODELS))
def test_model_dims_norm_repeatable(name):
    if name not in em.available():
        pytest.skip("model file not on this machine")
    e = em.load(name)
    assert e.name == name
    t = np.arange(3 * em.SR) / em.SR
    x = (0.3 * np.sin(2 * np.pi * 180 * t) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t))
         + 0.02 * np.random.default_rng(1).standard_normal(t.size)).astype(np.float32)
    a, b = e.embed(x), e.embed(x)
    assert a.dtype == np.float64 and a.shape == (e.dims,)
    assert abs(np.linalg.norm(a) - 1) < 1e-6
    assert float(a @ b) > 0.999
