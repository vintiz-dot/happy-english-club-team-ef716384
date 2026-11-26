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


def test_pieces_even_and_complete():
    assert em.pieces(100, None) == [(0, 100)]
    assert em.pieces(100, 100) == [(0, 100)]
    got = em.pieces(250, 100)
    assert got == [(0, 84), (84, 168), (168, 250)]
    assert all(b - a <= 100 for a, b in got) and got[0][0] == 0 and got[-1][1] == 250


def test_long_clip_is_embedded_in_pieces():
    """A model that refuses long input (as TitaNet does past ~2 minutes) gets pieces, weighted by length."""
    seen = []

    def fn(x):
        if len(x) > 10 * em.SR:
            raise RuntimeError("broadcast 12288 by 46067")
        seen.append(len(x))
        return np.array([1.0, 0.0]) if x[0] > 0 else np.array([0.0, 1.0])

    e = em.Embedder("fake", fn, 2, max_s=10)
    x = np.concatenate([np.ones(10 * em.SR), -np.ones(15 * em.SR)]).astype(np.float32)
    v = e.embed(x)  # 25 s in three pieces of ~8.3 s, starting at 0 s (+), 8.3 s (+) and 16.7 s (-)
    assert len(seen) == 3 and all(n <= 10 * em.SR for n in seen)
    assert abs(np.linalg.norm(v) - 1) < 1e-9
    assert v[0] > v[1] > 0  # two pieces point one way, one the other, weighted by length
    with pytest.raises(RuntimeError):
        em.Embedder("fake", fn, 2).embed(x)  # without max_s the whole clip goes in and fails


def test_titanet_takes_a_long_clip():
    if "titanet" not in em.available():
        pytest.skip("model file not on this machine")
    e = em.load("titanet")
    assert e.max_s == 60
    t = np.arange(180 * em.SR) / em.SR
    x = (0.3 * np.sin(2 * np.pi * 180 * t) + 0.02 * np.random.default_rng(2).standard_normal(t.size)).astype(np.float32)
    v = e.embed(x)
    assert v.shape == (e.dims,) and abs(np.linalg.norm(v) - 1) < 1e-6
